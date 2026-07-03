// ===== ドメイン型定義 =====

export type SoilType = "akadama" | "pumice" | "rich";
export type PotSize = 1 | 2 | 3;
export type LedPower = 1 | 2 | 3;
export type ShelfKind = "small" | "large";
export type VarieType = "margin" | "center";

/** 遺伝子 (個体値)。すべて 0..1 */
export interface Genetics {
  /** 葉の短さ (高いほど短葉でコンパクト) */
  compact: number;
  /** 葉の厚み・幅 */
  thick: number;
  /** 鋸歯 (棘) の強さ・大きさ */
  spine: number;
  /** 成長速度 */
  growth: number;
  /** 色味 -1(青白) .. +1(黄緑) */
  hue: number;
  /** 斑の強さ 0=ノーマル */
  variegation: number;
  /** 斑のタイプ */
  vtype: VarieType;
}

/** 展開済みの葉 1 枚。出葉時の環境を焼き込む */
export interface Leaf {
  /** 相対長 */
  len: number;
  /** 相対幅 */
  width: number;
  /** 厚み */
  thick: number;
  /** 徒長度 0..1 (高いとひょろ長く垂れる) */
  etiole: number;
  /** 色ゆらぎ */
  hueShift: number;
  /** 出葉日 */
  born: number;
}

export type PlantStage = "seed" | "seedling" | "plant" | "dead";

export interface Plant {
  id: string;
  speciesId: string;
  /** 個体名 例: 白鯨 #3 */
  name: string;
  genetics: Genetics;
  /** 遺伝子が判明しているか (実生は育つまで不明) */
  geneticsKnown: boolean;
  stage: PlantStage;
  sownDay: number;
  leaves: Leaf[];
  /** 次の葉までの成長ポイント */
  growthProgress: number;
  /** 株全体のサイズ係数 */
  leafScale: number;
  /** 土の水分 0..1 */
  moisture: number;
  /** 健康 0..100 */
  health: number;
  /** 根詰まり 0..1 */
  rootBound: number;
  /** 元肥の残り日数 */
  baseFertDays: number;
  /** 液肥の残り日数 */
  liquidFertDays: number;
  potSize: PotSize;
  soil: SoilType;
  /** 植え替えストレス残日数 */
  stressDays: number;
  /** 出葉用に追跡する光量の移動平均 */
  lightAvg: number;
  daysSinceWater: number;
  /** 根腐れ進行 0..1 */
  rot: number;
  /** 害虫発生中か */
  pest: boolean;
  /** 胴切りチャレンジ中の状態 (undefined = 通常株) */
  dogiri?: DogiriState;
}

/**
 * 胴切り: 成長点を切って台から子株を吹かせる。
 * sproutLeft > 0 = 芽吹き待ち (温度・水分があると進む)。
 * sproutLeft <= 0 && buds > 0 = 芽吹き済みで収穫待ち。
 * 全部収穫すると undefined に戻り、台は通常成長に復帰する。
 */
export interface DogiriState {
  /** 芽吹きまでの残り成長日数 */
  sproutLeft: number;
  /** 吹いた芽 (未収穫の子株) の数 */
  buds: number;
}

export interface Led {
  power: LedPower;
  /** 取り付け位置 (列) */
  col: number;
  on: boolean;
}

export interface ShelfLevel {
  /** スロットに置かれた plant id (null=空) */
  slots: (string | null)[];
  led: Led | null;
}

export interface Shelf {
  id: string;
  kind: ShelfKind;
  /** 部屋グリッド上の位置 */
  x: number;
  y: number;
  /** 向き (90° 単位の回転回数 0..3)。0 = 正面が南 (部屋の手前) 向き */
  rot?: number;
  levels: ShelfLevel[];
  name: string;
}

export interface Inventory {
  /** speciesId -> 種の数 */
  seeds: Record<string, number>;
  pots: Record<PotSize, number>;
  soil: Record<SoilType, number>;
  baseFert: number;
  liquidFert: number;
  leds: Record<LedPower, number>;
  shelves: Record<ShelfKind, number>;
  /** 未設置の家具 (旧セーブには無いので optional) */
  furniture?: Partial<Record<FurnitureKind, number>>;
}

export interface Devices {
  heater: boolean;
  heaterOn: boolean;
  circulator: boolean;
  circulatorOn: boolean;
  /** サーキュレーターの設置マス。風が届くのは周囲 CIRCULATOR_RANGE マスまで (旧セーブは未設定) */
  circulatorPos?: { x: number; y: number };
  aircon: boolean;
  airconOn: boolean;
}

/** 飾り家具の種類 (見た目だけで育成には影響しない) */
export type FurnitureKind = "bed" | "tableSet" | "closet" | "desk" | "bookshelf" | "sofa" | "lamp";

/** 部屋に置かれた家具 1 つ */
export interface Furniture {
  id: string;
  kind: FurnitureKind;
  /** 部屋グリッド上の位置 */
  x: number;
  y: number;
  /** 向き (90° 単位の回転回数 0..3)。0 = 正面が南 (部屋の手前) 向き */
  rot?: number;
}

export interface CollectionEntry {
  grown: number;
  sold: number;
  bestPrice: number;
  bestQuality: number;
}

export interface DayReport {
  /** 期間の開始日 */
  day: number;
  /** 経過日数 (省略時 1) */
  days?: number;
  lines: string[];
  electricity: number;
  income: number;
}

export interface Settings {
  /** 成長速度の倍率 */
  growthSpeed: number;
  /** デバッグモード (動作確認用。ローカル起動時のみ設定に出る) */
  debug?: boolean;
}

export interface SpeciesDef {
  id: string;
  name: string;
  /** 学名・通称表示 */
  latin: string;
  desc: string;
  seedPrice: number;
  pupPrice: number;
  basePrice: number;
  /** 遺伝子レンジ [min,max] */
  range: {
    compact: [number, number];
    thick: [number, number];
    spine: [number, number];
    growth: [number, number];
    hue: [number, number];
  };
  /** 斑入り出現率 */
  varieChance: number;
  /** 発芽日数 */
  germDays: number;
  tier: "beginner" | "mid" | "premium" | "rare";
}
