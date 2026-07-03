import type { Genetics, Leaf, Plant, SpeciesDef } from "./types";

let seq = 0;
export function uid(prefix: string): string {
  seq = (seq + 1) % 10000;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** レンジ内で中央寄りの乱数 (2 回振って平均) */
function randMid(min: number, max: number): number {
  return (rand(min, max) + rand(min, max)) / 2;
}

export function rollGenetics(sp: SpeciesDef): Genetics {
  const varie = Math.random() < sp.varieChance;
  return {
    compact: randMid(sp.range.compact[0], sp.range.compact[1]),
    thick: randMid(sp.range.thick[0], sp.range.thick[1]),
    spine: randMid(sp.range.spine[0], sp.range.spine[1]),
    growth: randMid(sp.range.growth[0], sp.range.growth[1]),
    hue: randMid(sp.range.hue[0], sp.range.hue[1]),
    variegation: varie ? rand(0.4, 1.0) : 0,
    vtype: Math.random() < 0.5 ? "margin" : "center",
  };
}

/** 遺伝子の総合評価 0..1 (販売価格・図鑑用) */
export function geneticsQuality(g: Genetics): number {
  const base = g.compact * 0.35 + g.thick * 0.3 + g.spine * 0.25 + g.growth * 0.1;
  return Math.min(1, base + g.variegation * 0.25);
}

export function qualityStars(q: number): string {
  const n = Math.max(1, Math.min(5, Math.round(q * 5 + 0.25)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** 現在の環境条件から新しい葉を生成する */
export function growLeaf(g: Genetics, lightAvg: number, overFert: boolean, day: number): Leaf {
  let etiole = Math.max(0, Math.min(1, (0.55 - lightAvg) / 0.45));
  if (overFert) etiole = Math.min(1, etiole + 0.18);
  const len = (1.55 - 0.75 * g.compact) * (1 + 0.95 * etiole) * rand(0.93, 1.07);
  const width = (0.72 + 0.55 * g.thick) * (1 - 0.4 * etiole) * rand(0.95, 1.05);
  const thick = (0.5 + 0.85 * g.thick) * (1 - 0.5 * etiole);
  return {
    len,
    width,
    thick,
    etiole,
    hueShift: rand(-0.08, 0.08),
    born: day,
  };
}

/** 株の現在の "仕上がり" 0..1。徒長していない締まった葉ほど高い */
export function formQuality(p: Plant): number {
  if (p.leaves.length === 0) return 0;
  // 最近の葉を重めに評価
  let sum = 0;
  let wsum = 0;
  p.leaves.forEach((leaf, i) => {
    const w = 1 + i / p.leaves.length;
    sum += (1 - leaf.etiole) * w;
    wsum += w;
  });
  return sum / wsum;
}

export function makePlant(opts: {
  sp: SpeciesDef;
  day: number;
  serial: number;
  asPup: boolean;
  potSize: 1 | 2 | 3;
  soil: Plant["soil"];
  baseFert: boolean;
  /** 指定すると遺伝子を引き継ぐ (胴切り子株 = 親のクローン) */
  genetics?: Genetics;
}): Plant {
  const g = opts.genetics ?? rollGenetics(opts.sp);
  const p: Plant = {
    id: uid("p"),
    speciesId: opts.sp.id,
    name: `${opts.sp.name} #${opts.serial}`,
    genetics: g,
    geneticsKnown: opts.asPup,
    stage: opts.asPup ? "plant" : "seed",
    sownDay: opts.day,
    leaves: [],
    growthProgress: 0,
    leafScale: opts.asPup ? 0.55 : 0.2,
    moisture: 0.7,
    health: 100,
    rootBound: 0,
    baseFertDays: opts.baseFert ? 60 : 0,
    liquidFertDays: 0,
    potSize: opts.potSize,
    soil: opts.soil,
    stressDays: opts.asPup ? 3 : 0,
    lightAvg: 0.6,
    daysSinceWater: 0,
    rot: 0,
    pest: false,
  };
  if (opts.asPup) {
    for (let i = 0; i < 5; i++) {
      p.leaves.push(growLeaf(g, 0.7, false, opts.day - (5 - i) * 6));
    }
  }
  return p;
}
