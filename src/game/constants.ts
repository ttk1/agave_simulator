import type { LedPower, PotSize, ShelfKind, SoilType, SpeciesDef } from "./types";

// ===== 時間・行動 =====

/** 1日に使える時間 (分) */
export const DAY_MINUTES = 480;

export const ACTION_TIME = {
  water: 3,
  sow: 10,
  repot: 20,
  liquidFert: 5,
  sell: 15,
  placeShelf: 30,
  removeShelf: 30,
  installLed: 10,
  movePlant: 2,
  discard: 5,
  pestControl: 10,
} as const;

export const ACTION_LABEL: Record<keyof typeof ACTION_TIME, string> = {
  water: "水やり",
  sow: "種まき",
  repot: "植え替え",
  liquidFert: "液肥",
  sell: "販売",
  placeShelf: "棚の設置",
  removeShelf: "棚の撤去",
  installLed: "LED取付",
  movePlant: "株の移動",
  discard: "廃棄",
  pestControl: "害虫駆除",
};

// ===== 部屋 =====

export const ROOM_COLS = 6;
export const ROOM_ROWS = 4;

export const SHELF_SPEC: Record<ShelfKind, { name: string; levels: number; cols: number; price: number }> = {
  small: { name: "スチールラック (小)", levels: 2, cols: 3, price: 6000 },
  large: { name: "メタルラック (大)", levels: 3, cols: 4, price: 15000 },
};

// ===== 設備 =====

export const LED_SPEC: Record<LedPower, { name: string; price: number; intensity: number; elecPerDay: number }> = {
  1: { name: "LEDライト (弱) 20W", price: 3500, intensity: 0.55, elecPerDay: 40 },
  2: { name: "LEDライト (中) 40W", price: 8000, intensity: 0.85, elecPerDay: 75 },
  3: { name: "LEDライト (強) 65W", price: 16000, intensity: 1.15, elecPerDay: 120 },
};

/** 列の距離ごとの光の減衰 */
export const LED_FALLOFF = [1.0, 0.62, 0.32, 0.14, 0.05];

/** 部屋のベース光量 (窓からのわずかな光) */
export const AMBIENT_LIGHT = 0.08;

export const DEVICE_SPEC = {
  heater: { name: "パネルヒーター", price: 9000, elecPerDay: 90 },
  circulator: { name: "サーキュレーター", price: 4500, elecPerDay: 15 },
} as const;

// ===== 資材 =====

export const POT_SPEC: Record<PotSize, { name: string; price: number; cap: number }> = {
  1: { name: "プレステラ (小)", price: 100, cap: 9 },
  2: { name: "スリット鉢 (中)", price: 250, cap: 20 },
  3: { name: "陶器鉢 (大)", price: 900, cap: 45 },
};

export const SOIL_SPEC: Record<SoilType, { name: string; price: number; drainage: number; nutrition: number; desc: string }> = {
  akadama: { name: "赤玉土ブレンド", price: 300, drainage: 1.0, nutrition: 1.0, desc: "バランス型。迷ったらこれ" },
  pumice: { name: "軽石多め硬質ブレンド", price: 450, drainage: 1.35, nutrition: 0.8, desc: "乾きが速く根腐れしにくい。締めて育つ" },
  rich: { name: "栄養培養土", price: 200, drainage: 0.65, nutrition: 1.35, desc: "よく育つが過湿・徒長に注意" },
};

export const FERT_SPEC = {
  base: { name: "元肥 (緩効性)", price: 500, days: 60 },
  liquid: { name: "液肥", price: 60, days: 12 },
} as const;

// ===== 品種 =====

export const SPECIES: SpeciesDef[] = [
  {
    id: "raijin",
    name: "雷神",
    latin: "Agave potatorum",
    desc: "丈夫で育てやすい入門種。淡い青緑の葉。",
    seedPrice: 250, pupPrice: 1400, basePrice: 800,
    range: { compact: [0.25, 0.6], thick: [0.3, 0.6], spine: [0.2, 0.5], growth: [0.55, 0.85], hue: [-0.5, 0.1] },
    varieChance: 0.04, germDays: 6, tier: "beginner",
  },
  {
    id: "kisshokan",
    name: "吉祥冠",
    latin: "Agave potatorum 'Kisshoukan'",
    desc: "整ったロゼットと赤い爪が魅力の普及種。",
    seedPrice: 300, pupPrice: 1800, basePrice: 950,
    range: { compact: [0.3, 0.65], thick: [0.35, 0.65], spine: [0.3, 0.6], growth: [0.5, 0.8], hue: [-0.4, 0.2] },
    varieChance: 0.05, germDays: 6, tier: "beginner",
  },
  {
    id: "horrida",
    name: "ホリダ",
    latin: "Agave horrida",
    desc: "鋭く長い棘が並ぶワイルドな中級種。",
    seedPrice: 450, pupPrice: 2600, basePrice: 1600,
    range: { compact: [0.35, 0.7], thick: [0.4, 0.7], spine: [0.6, 0.95], growth: [0.4, 0.7], hue: [-0.2, 0.4] },
    varieChance: 0.02, germDays: 8, tier: "mid",
  },
  {
    id: "sasanoyuki",
    name: "笹の雪",
    latin: "Agave victoriae-reginae",
    desc: "白いペンキ模様の女王。成長は遅いが端正。",
    seedPrice: 550, pupPrice: 3200, basePrice: 2000,
    range: { compact: [0.5, 0.85], thick: [0.5, 0.8], spine: [0.15, 0.4], growth: [0.25, 0.5], hue: [-0.7, -0.2] },
    varieChance: 0.03, germDays: 10, tier: "mid",
  },
  {
    id: "oteroi",
    name: "オテロイ FO-076",
    latin: "Agave oteroi",
    desc: "チタノタの原種系。個体差が大きく選抜が熱い。",
    seedPrice: 900, pupPrice: 5500, basePrice: 2800,
    range: { compact: [0.3, 0.9], thick: [0.35, 0.9], spine: [0.4, 0.95], growth: [0.45, 0.75], hue: [-0.3, 0.5] },
    varieChance: 0.03, germDays: 8, tier: "premium",
  },
  {
    id: "hakugei",
    name: "チタノタ 白鯨",
    latin: "Agave titanota 'Hakugei'",
    desc: "白く太い棘と肉厚短葉。人気のプレミア品種。",
    seedPrice: 1300, pupPrice: 8000, basePrice: 5200,
    range: { compact: [0.55, 0.95], thick: [0.55, 0.95], spine: [0.65, 1.0], growth: [0.35, 0.65], hue: [-0.4, 0.2] },
    varieChance: 0.025, germDays: 9, tier: "premium",
  },
  {
    id: "kokugei",
    name: "チタノタ 黒鯨",
    latin: "Agave titanota 'Kokugei'",
    desc: "黒く染まる鋸歯が渋い。流通の少ないレア品種。",
    seedPrice: 2600, pupPrice: 16000, basePrice: 8000,
    range: { compact: [0.6, 0.95], thick: [0.6, 0.95], spine: [0.7, 1.0], growth: [0.3, 0.6], hue: [0.0, 0.6] },
    varieChance: 0.02, germDays: 10, tier: "rare",
  },
  {
    id: "himeganryu",
    name: "チタノタ 姫巌竜",
    latin: "Agave titanota 'Hime-Ganryu'",
    desc: "極小ボール状に締まる最高級ドワーフ選抜。",
    seedPrice: 3200, pupPrice: 22000, basePrice: 9800,
    range: { compact: [0.75, 1.0], thick: [0.7, 1.0], spine: [0.6, 0.95], growth: [0.25, 0.5], hue: [-0.3, 0.3] },
    varieChance: 0.02, germDays: 11, tier: "rare",
  },
];

export const SPECIES_MAP: Record<string, SpeciesDef> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export const TIER_LABEL = {
  beginner: "入門",
  mid: "中級",
  premium: "プレミア",
  rare: "レア",
} as const;

// ===== 初期状態 =====

export const START_MONEY = 30000;
export const SAVE_KEY = "agave-sim-save-v1";
