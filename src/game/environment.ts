import {
  AIRCON_COST_PER_DEG,
  AIRCON_MAX_TEMP,
  AMBIENT_LIGHT,
  CIRCULATOR_DEFAULT_POS,
  CIRCULATOR_RANGE,
  DEVICE_SPEC,
  LED_FALLOFF,
  LED_HEAT,
  LED_HEAT_CAP,
  LED_SPEC,
  SHELF_LEVEL_H,
  WINDOW_X,
  WINDOW_Y_RANGE,
} from "./constants";
import type { Devices, Shelf } from "./types";

/** 1年 = 360日。day 1 = 5月1日相当 (発芽適温の春スタート) */
export function dayOfYear(day: number): number {
  return (day - 1) % 360;
}

export function monthOf(day: number): number {
  return ((Math.floor(dayOfYear(day) / 30) + 4) % 12) + 1; // 5月始まり
}

export function dateLabel(day: number): string {
  const y = Math.floor((day - 1) / 360) + 1;
  const m = monthOf(day);
  const d = (dayOfYear(day) % 30) + 1;
  return `${y}年目 ${m}月${d}日`;
}

export type Season = "spring" | "summer" | "autumn" | "winter";

export function seasonOf(day: number): Season {
  const m = monthOf(day);
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

/** 外気温 (°C)。夏 ~27, 冬 ~5 */
export function outsideTemp(day: number): number {
  const doy = dayOfYear(day);
  // day 0 = 5/1。7月下旬〜8月がピーク、1月中旬が底
  const t = 16 + 11 * Math.sin(((doy + 10) / 360) * Math.PI * 2);
  return t + Math.sin(day * 1.7) * 1.5; // 日々のゆらぎ
}

/** 点灯中の LED による室温上昇 (°C) */
export function ledHeat(shelves: Shelf[]): number {
  let h = 0;
  for (const sh of shelves) {
    for (const lv of sh.levels) {
      if (lv.led && lv.led.on) h += LED_HEAT[lv.led.power];
    }
  }
  return Math.min(LED_HEAT_CAP, h);
}

/** エアコンで冷やす前の室温 (LED 発熱・ヒーター込み) */
function roomTempRaw(day: number, devices: Devices, shelves: Shelf[]): number {
  let t = outsideTemp(day) * 0.65 + 7.5 + ledHeat(shelves);
  if (devices.heater && devices.heaterOn) t = Math.max(t, 20);
  return t;
}

/** 室温 (°C)。断熱でマイルドに。ヒーターで下限、エアコンで上限を保証 */
export function roomTemp(day: number, devices: Devices, shelves: Shelf[]): number {
  let t = roomTempRaw(day, devices, shelves);
  if (devices.aircon && devices.airconOn) t = Math.min(t, AIRCON_MAX_TEMP);
  return Math.round(t * 10) / 10;
}

/** エアコンの 1 日の電気代。冷やした度数に比例して増える */
export function airconCost(day: number, devices: Devices, shelves: Shelf[]): number {
  if (!devices.aircon || !devices.airconOn) return 0;
  const over = Math.max(0, roomTempRaw(day, devices, shelves) - AIRCON_MAX_TEMP);
  return Math.round(DEVICE_SPEC.aircon.elecPerDay + AIRCON_COST_PER_DEG * over);
}

/** サーキュレーターの設置マス (旧セーブは未設定なのでデフォルト位置) */
export function circulatorPos(devices: Devices): { x: number; y: number } {
  return devices.circulatorPos ?? CIRCULATOR_DEFAULT_POS;
}

/**
 * そのマスにサーキュレーターの風が届いているか。
 * 稼働中で、設置マスから CIRCULATOR_RANGE マス以内 (周囲 8 マス) のみ有効。
 */
export function airflowAt(devices: Devices, x: number, y: number): boolean {
  if (!devices.circulator || !devices.circulatorOn) return false;
  const pos = circulatorPos(devices);
  return Math.max(Math.abs(x - pos.x), Math.abs(y - pos.y)) <= CIRCULATOR_RANGE;
}

/** 室内湿度 0..1。夏に高い */
export function roomHumidity(day: number): number {
  const doy = dayOfYear(day);
  // 7月ごろがピーク (梅雨〜夏)、1月が底
  const h = 0.55 + 0.18 * Math.sin(((doy + 15) / 360) * Math.PI * 2) + Math.sin(day * 2.3) * 0.06;
  return Math.max(0.25, Math.min(0.92, h));
}

/** 窓からの自然光の強さ (季節と天気で変わる) */
export function sunStrength(day: number): number {
  const doy = dayOfYear(day);
  const seasonal = 0.3 + 0.09 * Math.sin(((doy + 20) / 360) * Math.PI * 2); // 夏に強い
  const weather = 0.75 + 0.25 * Math.sin(day * 2.9); // 晴れ・曇りのゆらぎ
  return Math.max(0.08, seasonal * weather);
}

/**
 * 段と窓ガラスの高さの重なり (0..1)。
 * 窓は縦の壁面にあるので、その高さに正対する段 (中段・上段) に光が入り、
 * 窓ガラスより下にある最下段には直接光がほとんど届かない。
 * 3D ビューの窓の描画位置 (WINDOW_Y_RANGE) と同じ根拠を使う。
 */
function levelOverlap(level: number): number {
  const lo = level * SHELF_LEVEL_H;
  const hi = lo + SHELF_LEVEL_H;
  const o = Math.max(0, Math.min(hi, WINDOW_Y_RANGE[1]) - Math.max(lo, WINDOW_Y_RANGE[0]));
  return o / SHELF_LEVEL_H;
}

/**
 * 棚の向き (rot) と列位置による窓光の入りやすさ。窓は北 (y=0 側) にある。
 * メタルラックは背面も開放なので、正面・背面が窓を向くケース (0/2) は
 * 全列が同等によく光が入る。横向き (1/3) は光が棚の横から入るため全体に
 * 少し落ち、さらに窓から遠い列ほど手前の株や支柱に遮られて減衰する。
 */
function sideFactor(shelf: Shelf, col: number): number {
  const r = (((shelf.rot ?? 0) % 4) + 4) % 4;
  if (r === 0 || r === 2) return 1;
  const cols = shelf.levels[0]?.slots.length ?? 3;
  const d = r === 1 ? col : cols - 1 - col; // 窓に近い列からの距離
  return 0.85 / (1 + 0.25 * d);
}

/**
 * 部屋の窓 (北壁 y=0 側、WINDOW_X の列) からの自然光ボーナス。
 * 窓に近い棚ほど強く、窓の高さに重なる段 (中段・上段) がよく当たる。
 * 横向きの棚は窓に近い列ほど有利。3D ビューの光の当たり方と対応する。
 */
export function windowBonus(shelf: Shelf, level: number, col: number, day: number): number {
  // 横方向のずれは強めに減衰させる (窓は WINDOW_X の列にしか無いため、
  // 真下から外れるほど光は届きにくい)。windowSide の表示判定とも整合する。
  const dx = shelf.x < WINDOW_X[0] ? WINDOW_X[0] - shelf.x : shelf.x > WINDOW_X[1] ? shelf.x - WINDOW_X[1] : 0;
  const dist = shelf.y + dx * 1.6;
  const falloff = 1 / (1 + dist * 1.1);
  // 窓より下の段もゼロにはしない (床や壁からの照り返しぶん)
  const levelF = 0.25 + 0.75 * levelOverlap(level);
  return sunStrength(day) * falloff * levelF * sideFactor(shelf, col);
}

/**
 * その棚が窓 (北壁) に面しているか。面している場合のみ near (とても近いか) を返す。
 * 窓は北壁 (y=0 側) の WINDOW_X の列にあるので、その列の真下に並ぶ棚だけが対象。
 * 横方向にずれた棚や、奥まった棚 (y が大きい) は窓に面さない = null。
 * ラック画面 (棚は北を奥にして固定描画) で窓を出すかの判定に使う。
 */
export function windowSide(shelf: Shelf): { near: boolean } | null {
  const inWindowCols = shelf.x >= WINDOW_X[0] && shelf.x <= WINDOW_X[1];
  if (!inWindowCols) return null; // 窓の列から横にずれている棚には窓は見えない
  if (shelf.y > 1) return null; // 窓から遠い (奥まった) 棚も対象外
  return { near: shelf.y === 0 };
}

/** 棚のあるスロットの光量を計算 (0..~1.25) */
export function slotLight(shelf: Shelf, level: number, col: number, day: number): number {
  let light = AMBIENT_LIGHT + windowBonus(shelf, level, col, day);
  const lv = shelf.levels[level];
  if (lv && lv.led && lv.led.on) {
    const dist = Math.abs(col - lv.led.col);
    const falloff = LED_FALLOFF[Math.min(dist, LED_FALLOFF.length - 1)];
    light += LED_SPEC[lv.led.power].intensity * falloff;
  }
  return Math.min(1.25, light);
}

/** 光量のラベル */
export function lightLabel(light: number): string {
  if (light >= 0.9) return "強光";
  if (light >= 0.65) return "十分";
  if (light >= 0.4) return "やや不足";
  if (light >= 0.2) return "不足";
  return "暗い";
}
