import {
  AIRCON_COST_PER_DEG,
  AIRCON_MAX_TEMP,
  AMBIENT_LIGHT,
  DEVICE_SPEC,
  LED_FALLOFF,
  LED_HEAT,
  LED_HEAT_CAP,
  LED_SPEC,
  WINDOW_X,
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
 * 部屋の窓 (北壁 y=0 側、WINDOW_X の列) からの自然光ボーナス。
 * 窓に近い棚ほど強く、棚板の影にならない最上段がよく当たる。
 */
export function windowBonus(shelf: Shelf, level: number, day: number): number {
  const dx = shelf.x < WINDOW_X[0] ? WINDOW_X[0] - shelf.x : shelf.x > WINDOW_X[1] ? shelf.x - WINDOW_X[1] : 0;
  const dist = shelf.y + dx * 0.7;
  const falloff = 1 / (1 + dist * 1.1);
  const levelF = level === shelf.levels.length - 1 ? 1 : 0.4;
  return sunStrength(day) * falloff * levelF;
}

/** 棚のあるスロットの光量を計算 (0..~1.25) */
export function slotLight(shelf: Shelf, level: number, col: number, day: number): number {
  let light = AMBIENT_LIGHT + windowBonus(shelf, level, day);
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
