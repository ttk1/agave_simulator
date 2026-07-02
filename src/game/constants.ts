import type { LedPower, PotSize, ShelfKind, SoilType, SpeciesDef } from "./types";

// ===== 時間の進み方 =====

/**
 * 成長速度の選択肢。日々のシミュレーション自体は 1日 = 現実の1日 (または
 * 「次の日へ」) で進み、この倍率は成長量にだけ掛かる。
 */
export const GROWTH_SPEED_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 0.25, label: "リアル", desc: "現実の園芸に近いペース。1枚の葉に数週間" },
  { value: 0.5, label: "のんびり", desc: "じっくり長く楽しみたい人向け" },
  { value: 1, label: "標準", desc: "数ヶ月で販売サイズに育つ" },
  { value: 2, label: "はやめ", desc: "テンポよく育てたい人向け" },
  { value: 4, label: "せっかち", desc: "サクサク育つ。経営ゲーム感覚で" },
];

// ===== 部屋 =====

export const ROOM_COLS = 6;
export const ROOM_ROWS = 4;

/** 北壁 (y=0 側) の窓が面する列の範囲 [開始, 終了] */
export const WINDOW_X: [number, number] = [2, 3];

// ----- 部屋の 3D 寸法 (描画と光量計算で共有。単位は 3D 空間の長さ) -----

/** 部屋の 1 マスの一辺 */
export const CELL = 5.2;
/** 壁の高さ */
export const WALL_H = 5.4;
/** 棚 1 段の高さ (ShelfModel の段ピッチと同一) */
export const SHELF_LEVEL_H = 1.5;
/**
 * 窓ガラスの高さ範囲 [下端, 上端]。
 * この高さに重なる棚の段ほど窓光が正面から入る (windowBonus の段係数の根拠)。
 */
export const WINDOW_Y_RANGE: [number, number] = [WALL_H * 0.25, WALL_H * 0.85];

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
  /** elecPerDay は待機 (送風) コスト。冷却 1°C ごとに加算される */
  aircon: { name: "エアコン (冷房)", price: 38000, elecPerDay: 60 },
} as const;

/**
 * サーキュレーターの風が届く範囲 (チェビシェフ距離)。
 * 1 = 置いたマスとその周囲 8 マス。範囲外の棚には蒸れ・害虫の抑制が効かない。
 */
export const CIRCULATOR_RANGE = 1;

/** サーキュレーター購入時・旧セーブのデフォルト設置マス (部屋の中央付近) */
export const CIRCULATOR_DEFAULT_POS = { x: 2, y: 1 };

/**
 * 害虫の伝播率 (感染株 1 株につき 1 日あたり)。発生率と同じく成長速度でスケール。
 * airflowMult は伝播先の棚に風が届いているときの倍率。
 */
export const PEST_SPREAD = { sameShelf: 0.06, adjacentShelf: 0.02, airflowMult: 0.3 } as const;

/** 冷房時の電気代: 1°C 冷やすごとの加算額 */
export const AIRCON_COST_PER_DEG = 35;

/** エアコン稼働時の室温上限 */
export const AIRCON_MAX_TEMP = 27;

/** 点灯中の LED 1 台が室温を上げる量 (°C) */
export const LED_HEAT: Record<LedPower, number> = { 1: 0.4, 2: 0.7, 3: 1.0 };

/** LED 発熱による室温上昇の上限 (°C) */
export const LED_HEAT_CAP = 8;

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
