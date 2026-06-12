import { AMBIENT_LIGHT, LED_FALLOFF, LED_SPEC } from "./constants";
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

/** 室温 (°C)。断熱でマイルドに。ヒーターで下限を保証 */
export function roomTemp(day: number, devices: Devices): number {
  let t = outsideTemp(day) * 0.65 + 7.5;
  if (devices.heater && devices.heaterOn) t = Math.max(t, 20);
  return Math.round(t * 10) / 10;
}

/** 室内湿度 0..1。夏に高い */
export function roomHumidity(day: number): number {
  const doy = dayOfYear(day);
  // 7月ごろがピーク (梅雨〜夏)、1月が底
  const h = 0.55 + 0.18 * Math.sin(((doy + 15) / 360) * Math.PI * 2) + Math.sin(day * 2.3) * 0.06;
  return Math.max(0.25, Math.min(0.92, h));
}

/** 棚のあるスロットの光量を計算 (0..~1.2) */
export function slotLight(shelf: Shelf, level: number, col: number): number {
  let light = AMBIENT_LIGHT;
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
