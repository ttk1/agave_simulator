import { DEVICE_SPEC, DOGIRI, LED_SPEC, PEST_SPREAD, POT_SPEC, SOIL_SPEC, SPECIES_MAP } from "./constants";
import { airconCost, airflowAt, roomHumidity, roomTemp, slotLight } from "./environment";
import { growLeaf } from "./genetics";
import type { Devices, Plant, Shelf } from "./types";

export interface TickResult {
  lines: string[];
  electricity: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** 全植物の位置 (shelfId, level, col) を引けるマップを作る */
export function buildPlacement(shelves: Shelf[]): Map<string, { shelf: Shelf; level: number; col: number }> {
  const map = new Map<string, { shelf: Shelf; level: number; col: number }>();
  for (const shelf of shelves) {
    shelf.levels.forEach((lv, li) => {
      lv.slots.forEach((pid, ci) => {
        if (pid) map.set(pid, { shelf, level: li, col: ci });
      });
    });
  }
  return map;
}

/** 1日経過のシミュレーション。plants は破壊的に更新される */
export function tickDay(
  day: number,
  plants: Record<string, Plant>,
  shelves: Shelf[],
  devices: Devices,
  growthSpeed = 1,
): TickResult {
  const lines: string[] = [];
  const temp = roomTemp(day, devices, shelves);
  const humidity = roomHumidity(day);
  const placement = buildPlacement(shelves);

  for (const p of Object.values(plants)) {
    if (p.stage === "dead") continue;
    const pos = placement.get(p.id);
    const light = pos ? slotLight(pos.shelf, pos.level, pos.col, day) : 0.05;
    // 風はサーキュレーターの届く範囲の棚だけ (作業台には届かない)
    const airflow = pos ? airflowAt(devices, pos.shelf.x, pos.shelf.y) : false;
    const soil = SOIL_SPEC[p.soil];
    const sp = SPECIES_MAP[p.speciesId];

    // --- 水分の蒸散 ---
    const tempF = clamp(0.4 + temp / 32, 0.3, 1.5);
    const potF = [0, 1.0, 0.72, 0.5][p.potSize];
    const evap = 0.16 * tempF * (1.55 - humidity) * soil.drainage * potF * (airflow ? 1.1 : 1.0);
    p.moisture = clamp(p.moisture - evap, 0, 1);
    p.daysSinceWater += 1;

    // --- 発芽 ---
    if (p.stage === "seed") {
      if (p.moisture < 0.15) {
        p.health = clamp(p.health - 12, 0, 100);
        if (p.health <= 0) {
          p.stage = "dead";
          lines.push(`💀 ${p.name} の種は乾燥して発芽に失敗した`);
          continue;
        }
      }
      const tempOk = temp >= 17 && temp <= 34;
      // 発芽日数も成長速度でスケール (経過日 × 倍率 が必要日数に達したら)
      if (tempOk && p.moisture > 0.3 && (day - p.sownDay) * growthSpeed >= sp.germDays) {
        if (Math.random() < 0.45) {
          p.stage = "seedling";
          p.leaves.push(growLeaf(p.genetics, 0.65, false, day));
          p.leaves.push(growLeaf(p.genetics, 0.65, false, day));
          lines.push(`🌱 ${p.name} が発芽した！`);
        }
      }
      continue;
    }

    // --- 環境ストレス ---
    if (temp < 3) {
      p.health = clamp(p.health - 18, 0, 100);
      lines.push(`🥶 ${p.name} が低温で傷んでいる (${temp}°C)`);
    } else if (temp < 8) {
      p.health = clamp(p.health - 4, 0, 100);
    } else if (temp > 34) {
      p.health = clamp(p.health - 4, 0, 100);
      lines.push(`🥵 ${p.name} が高温でぐったりしている (${temp}°C)`);
    }

    // 極端な乾燥 (苗は弱い)
    if (p.moisture <= 0.02) {
      const dmg = p.stage === "seedling" ? 10 : p.daysSinceWater > 25 ? 3 : 0;
      if (dmg > 0) {
        p.health = clamp(p.health - dmg, 0, 100);
        if (p.stage === "seedling" && p.health < 50) lines.push(`🏜️ ${p.name} (苗) が乾燥でしおれている`);
      }
    }

    // --- 根腐れ ---
    const coldWet = p.moisture > 0.8 && temp < 14;
    const muggy = p.moisture > 0.85 && humidity > 0.72 && !airflow;
    if (coldWet || muggy) {
      p.rot = clamp(p.rot + 0.12, 0, 1);
    } else if (p.moisture < 0.4) {
      p.rot = clamp(p.rot - 0.08, 0, 1);
    }
    if (p.rot > 0.5) {
      p.health = clamp(p.health - p.rot * 14, 0, 100);
      lines.push(`⚠️ ${p.name} の根が腐り始めている！ 乾かして様子を見よう`);
    }

    // --- 害虫 (発生率は成長速度に比例 = 1株の育成期間あたりの発生数を一定に) ---
    if (!p.pest && humidity > 0.65 && !airflow && Math.random() < Math.min(0.12, 0.025 * growthSpeed)) {
      p.pest = true;
      lines.push(`🐛 ${p.name} にカイガラムシが発生！ 駆除しよう`);
    }
    if (p.pest) p.health = clamp(p.health - 3, 0, 100);

    // --- 回復 ---
    if (p.rot < 0.3 && !p.pest && temp >= 15 && temp <= 33) {
      p.health = clamp(p.health + 2, 0, 100);
    }

    if (p.health <= 0) {
      p.stage = "dead";
      lines.push(`💀 ${p.name} は枯れてしまった…`);
      continue;
    }

    // --- 胴切り: 芽吹きの進行 (温度と水分があるときだけ進む) ---
    if (p.dogiri && p.dogiri.sproutLeft > 0) {
      if (temp >= DOGIRI.minTemp && p.moisture > 0.05) {
        p.dogiri.sproutLeft = Math.max(0, p.dogiri.sproutLeft - growthSpeed);
        if (p.dogiri.sproutLeft === 0) {
          // 何個吹くかは運しだい。株の充実度 (健康・サイズ・成長遺伝子) で期待値が上がる
          const expected =
            0.8 +
            p.genetics.growth * 1.8 +
            Math.max(0, p.leafScale - 0.7) * 1.2 +
            (p.health / 100) * 1.2;
          const buds = Math.max(0, Math.round(expected * (0.3 + Math.random() * 1.35) - 0.4));
          if (buds > 0) {
            p.dogiri.buds = buds;
            lines.push(`🌱 ${p.name} の胴切り台から芽が ${buds} 個吹いた！ 子株を外そう`);
          } else {
            p.dogiri = undefined;
            lines.push(`🥀 ${p.name} の胴切りは失敗… 芽は出なかった (台は回復に向かう)`);
          }
        }
      }
    }

    // --- 成長 ---
    p.lightAvg = p.lightAvg + (light - p.lightAvg) * 0.28;
    const tempGrowF = temp < 10 ? 0 : temp < 18 ? (temp - 10) / 8 * 0.6 : temp <= 32 ? 1 : 0.6;
    const lightF = clamp(light / 0.7, 0.15, 1.25);
    const moistF = p.moisture < 0.05 ? 0.15 : p.moisture < 0.25 ? 0.65 : 1.0;
    let fertF = 1.0;
    if (p.baseFertDays > 0) fertF += 0.25;
    if (p.liquidFertDays > 0) fertF += 0.3;
    fertF *= SOIL_SPEC[p.soil].nutrition * 0.4 + 0.6;
    const overFert = p.baseFertDays > 0 && p.liquidFertDays > 0;
    const stressF = p.stressDays > 0 ? 0.35 : 1.0;
    const rootF = 1 - p.rootBound * 0.55;
    const healthF = 0.3 + (p.health / 100) * 0.7;
    const stageF = p.stage === "seedling" ? 0.75 : 1.0;

    const pts =
      10 * (0.5 + p.genetics.growth * 0.9) * tempGrowF * lightF * moistF * fertF * stressF * rootF * healthF * stageF;
    // 胴切り中は成長点がないので新しい葉は出ない
    if (!p.dogiri) p.growthProgress += pts * growthSpeed;

    const threshold = 26 + p.leaves.length * 1.3;
    if (p.growthProgress >= threshold) {
      p.growthProgress -= threshold;
      p.leaves.push(growLeaf(p.genetics, p.lightAvg, overFert, day));
      p.leafScale = Math.min(2.2, p.leafScale + 0.035 * (0.6 + p.genetics.growth * 0.6));
      if (p.stage === "seedling" && p.leaves.length >= 6) {
        p.stage = "plant";
        p.geneticsKnown = true;
        lines.push(`🪴 ${p.name} が育成株サイズに！ 個体値が判明した`);
      }
    }

    // --- 根詰まり ---
    const cap = POT_SPEC[p.potSize].cap;
    const sizeScore = p.leaves.length * p.leafScale;
    p.rootBound = clamp((sizeScore - cap * 0.7) / (cap * 0.8), 0, 1);
    if (p.rootBound >= 0.95 && Math.random() < 0.3) {
      lines.push(`🪨 ${p.name} が根詰まり気味。大きい鉢に植え替えよう`);
    }

    // --- 肥料・ストレスの消化 (植物の体感時間 = 成長速度でスケール) ---
    if (p.baseFertDays > 0) p.baseFertDays = Math.max(0, p.baseFertDays - growthSpeed);
    if (p.liquidFertDays > 0) p.liquidFertDays = Math.max(0, p.liquidFertDays - growthSpeed);
    if (p.stressDays > 0) p.stressDays = Math.max(0, p.stressDays - growthSpeed);
  }

  // --- 害虫の伝播 (同じ棚の株 → さらに隣のマスの棚の株へ) ---
  // 感染源はこの日の開始時点で感染していた株のみ (同日連鎖はしない)
  const infested = Object.values(plants).filter((p) => p.pest && p.stage !== "dead" && placement.has(p.id));
  if (infested.length > 0) {
    const newly: Plant[] = [];
    for (const q of Object.values(plants)) {
      if (q.pest || (q.stage !== "seedling" && q.stage !== "plant")) continue;
      const qpos = placement.get(q.id);
      if (!qpos) continue; // 作業台の株は棚から隔離されている
      const windy = airflowAt(devices, qpos.shelf.x, qpos.shelf.y);
      // 複数の感染源からのリスクを合算 (独立試行)
      let risk = 0;
      for (const src of infested) {
        const spos = placement.get(src.id)!;
        const sameShelf = spos.shelf.id === qpos.shelf.id;
        const adjacent =
          Math.abs(spos.shelf.x - qpos.shelf.x) + Math.abs(spos.shelf.y - qpos.shelf.y) === 1;
        if (!sameShelf && !adjacent) continue;
        let rate = (sameShelf ? PEST_SPREAD.sameShelf : PEST_SPREAD.adjacentShelf) * growthSpeed;
        if (windy) rate *= PEST_SPREAD.airflowMult;
        risk = 1 - (1 - risk) * (1 - Math.min(0.5, rate));
      }
      if (risk > 0 && Math.random() < risk) newly.push(q);
    }
    for (const q of newly) {
      q.pest = true;
      lines.push(`🐛 ${q.name} に害虫がうつった！ 感染源ごと早めに駆除しよう`);
    }
  }

  // --- 電気代 ---
  let electricity = 0;
  for (const shelf of shelves) {
    for (const lv of shelf.levels) {
      if (lv.led && lv.led.on) electricity += LED_SPEC[lv.led.power].elecPerDay;
    }
  }
  if (devices.heater && devices.heaterOn) electricity += DEVICE_SPEC.heater.elecPerDay;
  if (devices.circulator && devices.circulatorOn) electricity += DEVICE_SPEC.circulator.elecPerDay;
  electricity += airconCost(day, devices, shelves);

  // 電気代も成長速度に比例させる。「1株を売れるサイズにするまでの総コスト」が
  // 倍率によらず一定になり、成長速度が実質的な難易度設定にならないようにする
  electricity = Math.round(electricity * growthSpeed);

  return { lines, electricity };
}
