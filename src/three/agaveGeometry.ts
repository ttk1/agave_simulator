import * as THREE from "three";
import type { Genetics, Leaf } from "../game/types";

/**
 * アガベの葉 1 枚のジオメトリを生成する。
 * 断面は上面が浅い樋 (とい)、下面がキールのダイヤ型。品種によって縁が
 * 上向きに折れるカップ状になる。葉本体は UV を持ち、色・模様は
 * leafTexture.ts のプロシージャルテクスチャで描く。鋸歯と先端棘は
 * 別ジオメトリ (spines) に分け、棘色のマテリアルで描画する。
 *
 * ローカル座標系: 基部が原点、+Y 方向に伸び、+X 方向へ反る。
 * UV: u = 基部(0)→先端(1)、v = 左縁(0)→右縁(1)。
 */

/** 品種固有の見た目プロファイル。遺伝子値に乗算・加算で効く */
export interface SpeciesVisual {
  /** 葉の寸法補正 */
  lengthMul: number;
  widthMul: number;
  thickMul: number;
  /** 幅プロファイル: 基部幅 (最大幅比)、最大幅位置 t、先端の絞り指数 (小=幅を保ち急に尖る) */
  widthBase: number;
  widthPeak: number;
  tipPow: number;
  /** 追加の反り (rad)。負で内巻き */
  curve: number;
  /** 葉の硬さ 0..1。徒長による垂れを減衰 */
  stiffness: number;
  /** 断面のカップ (縁の上向き折れ) 0..1 */
  cup: number;
  /** 鋸歯: 間隔 (セグメント数)、大きさ倍率、先端向きの倒れ、基部の扁平さ、大きさの不揃い */
  toothStep: number;
  toothScale: number;
  toothHook: number;
  toothFlat: number;
  toothJitter: number;
  /** 縁の波打ち 0..1 */
  undulation: number;
  /** 連続した角質縁: 幅 0..1 (0=なし) と色 */
  marginBand: number;
  marginColor: string | null;
  /** 白ペンキ模様 (笹の雪) */
  budImprint: boolean;
  imprintColor: string;
  /** 先端棘の長さ・太さ倍率 */
  tipSpineLen: number;
  tipSpineThick: number;
  /** 葉色補正 (HSL) と白粉の強さ */
  hueShift: number;
  satShift: number;
  lightShift: number;
  powdery: number;
  /** 葉表面の光沢 0..1 (ホリダ等のツヤ) */
  gloss: number;
  /** テクスチャの縦筋・まだらの強さ 0..1 */
  striation: number;
  mottle: number;
  /** 先端付近の色付き (雷神の赤い爪元など)。null = なし */
  tipTint: string | null;
}

const DEFAULT_VISUAL: SpeciesVisual = {
  lengthMul: 1,
  widthMul: 1,
  thickMul: 1,
  widthBase: 0.42,
  widthPeak: 0.5,
  tipPow: 1,
  curve: 0,
  stiffness: 0,
  cup: 0.12,
  toothStep: 2,
  toothScale: 1,
  toothHook: 0.2,
  toothFlat: 1,
  toothJitter: 0.2,
  undulation: 0,
  marginBand: 0,
  marginColor: null,
  budImprint: false,
  imprintColor: "#ece7d8",
  tipSpineLen: 1,
  tipSpineThick: 1,
  hueShift: 0,
  satShift: 0,
  lightShift: 0,
  powdery: 0.15,
  gloss: 0.1,
  striation: 0.5,
  mottle: 0.25,
  tipTint: null,
};

/** 品種 ID → 見た目プロファイル (実物の特徴を反映) */
const SPECIES_VISUAL: Record<string, Partial<SpeciesVisual>> = {
  // 淡い青白のへら型葉。白粉が強く、鋸歯は小さく赤褐色、先端に赤み
  raijin: {
    widthBase: 0.3, widthPeak: 0.62, tipPow: 1.15, widthMul: 1.12,
    powdery: 0.55, hueShift: 0.015, satShift: -0.06, lightShift: 0.05,
    toothScale: 0.6, tipSpineLen: 1.1,
    cup: 0.15, striation: 0.35, mottle: 0.35, tipTint: "#b0533a",
  },
  // 整ったロゼットに赤い爪。縁が赤褐色に染まる
  kisshokan: {
    widthBase: 0.32, widthPeak: 0.58, tipPow: 1.1, widthMul: 1.08,
    powdery: 0.4, satShift: -0.03, lightShift: 0.03,
    toothScale: 0.85, marginBand: 0.1, marginColor: "#a04a30", tipSpineLen: 1.15,
    striation: 0.35, mottle: 0.3, tipTint: "#a04a30",
  },
  // 濃緑で光沢のある細い剣状葉。長い鋸歯がまばらに並び先端棘も長い
  horrida: {
    widthBase: 0.55, widthPeak: 0.22, tipPow: 1.5, lengthMul: 1.12, widthMul: 0.78,
    powdery: 0, gloss: 0.6, satShift: 0.1, lightShift: -0.05, stiffness: 0.55,
    toothStep: 3, toothScale: 1.8, toothHook: 0.5, toothFlat: 1.2, toothJitter: 0.4,
    marginBand: 0.06, marginColor: "#6f5a40", tipSpineLen: 1.9, tipSpineThick: 1.1,
    cup: 0.3, striation: 0.6, mottle: 0.15,
  },
  // 白ペンキ模様の女王。鋸歯はなく白い角質縁、硬く内に締まる濃緑の細葉
  sasanoyuki: {
    widthBase: 0.72, widthPeak: 0.3, tipPow: 1.3, lengthMul: 0.95, widthMul: 0.6, thickMul: 1.35,
    curve: -0.3, stiffness: 0.75,
    toothScale: 0, budImprint: true, marginBand: 0.16, marginColor: "#e6e1d0",
    powdery: 0.1, gloss: 0.35, satShift: 0.06, lightShift: -0.06, tipSpineLen: 1.7, tipSpineThick: 0.9,
    cup: 0.2, striation: 0.25, mottle: 0.1,
  },
  // 幅広短葉に大きく不揃いな鋸歯。縁が波打ちフック状の棘
  oteroi: {
    widthBase: 0.45, widthPeak: 0.52, tipPow: 0.85, lengthMul: 0.9, widthMul: 1.28,
    powdery: 0.25,
    toothStep: 3, toothScale: 1.4, toothHook: 0.4, toothFlat: 1.5, toothJitter: 0.55,
    undulation: 0.55, tipSpineLen: 1.4, tipSpineThick: 1.2,
    cup: 0.55, striation: 0.7, mottle: 0.5,
  },
  // 白く太い棘と白い角質縁。肉厚で幅広の短葉、青白い葉色
  hakugei: {
    widthBase: 0.5, widthPeak: 0.58, tipPow: 0.7, lengthMul: 0.78, widthMul: 1.5, thickMul: 1.3,
    powdery: 0.45, satShift: -0.05, lightShift: 0.04,
    toothStep: 3, toothScale: 1.7, toothHook: 0.3, toothFlat: 1.8, toothJitter: 0.3,
    undulation: 0.7, marginBand: 0.09, marginColor: "#ded8c4", tipSpineLen: 1.5, tipSpineThick: 1.5,
    cup: 0.7, striation: 0.7, mottle: 0.45,
  },
  // 黒い鋸歯と黒く染まる縁。やや黄緑の肉厚短葉
  kokugei: {
    widthBase: 0.5, widthPeak: 0.58, tipPow: 0.7, lengthMul: 0.78, widthMul: 1.5, thickMul: 1.3,
    powdery: 0.2, hueShift: -0.012, satShift: 0.04,
    toothStep: 3, toothScale: 1.7, toothHook: 0.35, toothFlat: 1.8, toothJitter: 0.3,
    undulation: 0.7, marginBand: 0.12, marginColor: "#241a14", tipSpineLen: 1.5, tipSpineThick: 1.5,
    cup: 0.7, striation: 0.7, mottle: 0.5,
  },
  // 極小ボール状に締まるドワーフ。内巻きの短葉に密な鋸歯
  himeganryu: {
    widthBase: 0.55, widthPeak: 0.5, tipPow: 0.8, lengthMul: 0.62, widthMul: 1.35, thickMul: 1.4,
    curve: -0.22, powdery: 0.3,
    toothStep: 2, toothScale: 1.1, toothHook: 0.25, toothFlat: 1.5, toothJitter: 0.35,
    undulation: 0.5, tipSpineLen: 1.2, tipSpineThick: 1.2,
    cup: 0.7, striation: 0.6, mottle: 0.4,
  },
};

export function visualOf(speciesId: string): SpeciesVisual {
  return { ...DEFAULT_VISUAL, ...SPECIES_VISUAL[speciesId] };
}

export interface LeafBuildParams {
  /** 実寸の葉長 (ワールド単位) */
  length: number;
  /** 実寸の最大幅 */
  width: number;
  /** 実寸の最大厚 */
  thick: number;
  /** 反り (rad)。大きいほど先端が垂れる */
  droop: number;
  /** 基部の開き角 (rad)、垂直=0 */
  baseAngle: number;
  /** 鋸歯サイズ (0 で無し) */
  toothSize: number;
  /** 品種の見た目プロファイル */
  visual: SpeciesVisual;
  /** 葉ごとの波打ち・鋸歯の位相 (乱数シード) */
  phase: number;
  /** テクスチャの v を反転して模様に変化をつける */
  mirror: boolean;
}

export interface LeafGeometry {
  /** 葉本体 (UV 付き、テクスチャで着色) */
  blade: THREE.BufferGeometry;
  /** 鋸歯 + 先端棘 (棘色マテリアルで着色) */
  spines: THREE.BufferGeometry;
}

const SEGMENTS = 20;

class GeoBuilder {
  positions: number[] = [];
  uvs: number[] | null;
  indices: number[] = [];

  constructor(withUv: boolean) {
    this.uvs = withUv ? [] : null;
  }

  addVertex(p: THREE.Vector3, u = 0, v = 0): number {
    this.positions.push(p.x, p.y, p.z);
    if (this.uvs) this.uvs.push(u, v);
    return this.positions.length / 3 - 1;
  }

  addTri(a: number, b: number, c: number) {
    this.indices.push(a, b, c);
  }

  /** 楕円錐 (棘・鋸歯用)。uHint 方向に radiusU、直交方向に radiusV */
  addCone(
    base: THREE.Vector3,
    dir: THREE.Vector3,
    radiusU: number,
    radiusV: number,
    height: number,
    uHint?: THREE.Vector3,
  ) {
    const n = 5;
    const d = dir.clone().normalize();
    let u: THREE.Vector3;
    if (uHint) {
      u = uHint.clone().addScaledVector(d, -d.dot(uHint));
      if (u.lengthSq() < 1e-8) u = new THREE.Vector3(1, 0, 0);
      u.normalize();
    } else {
      const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      u = new THREE.Vector3().crossVectors(d, up).normalize();
    }
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const tip = this.addVertex(base.clone().addScaledVector(d, height));
    const ring: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = base
        .clone()
        .addScaledVector(u, Math.cos(a) * radiusU)
        .addScaledVector(v, Math.sin(a) * radiusV);
      ring.push(this.addVertex(p));
    }
    for (let i = 0; i < n; i++) {
      this.addTri(ring[i], ring[(i + 1) % n], tip);
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    if (this.uvs) g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    return g;
  }
}

/** 幅プロファイル: 品種の葉形 (へら型・剣状・短幅広) を表現する */
function widthProfile(t: number, v: SpeciesVisual): number {
  if (t < v.widthPeak) {
    const u = t / v.widthPeak;
    return v.widthBase + (1 - v.widthBase) * Math.sin((u * Math.PI) / 2);
  }
  const u = (t - v.widthPeak) / (1 - v.widthPeak);
  return Math.pow(Math.cos((u * Math.PI) / 2), v.tipPow);
}

/** 0..1 の決定的な疑似乱数 */
export function hash01(x: number): number {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 断面の形: [lateral, perp 係数, 波打ちの効き, カップの効き] */
const SECTION: [number, number, number, number][] = [
  [-1, 0, 1, 1],
  [-0.82, 0.05, 0.7, 0.6],
  [-0.45, 0.17, 0, 0.18],
  [0, 0.3, 0, 0], // 樋 (浅い凹み)
  [0.45, 0.17, 0, 0.18],
  [0.82, 0.05, 0.7, 0.6],
  [1, 0, 1, 1],
  [0.55, 0.55, 0, 0.35], // ここから下面
  [0, 1, 0, 0], // キール
  [-0.55, 0.55, 0, 0.35],
];
const RING = SECTION.length;

export function buildLeafGeometry(p: LeafBuildParams): LeafGeometry {
  const blade = new GeoBuilder(true);
  const spines = new GeoBuilder(false);
  const vis = p.visual;
  const segLen = p.length / SEGMENTS;

  // 中心線をオイラー積分で求める
  const centers: THREE.Vector3[] = [];
  const dirs: THREE.Vector3[] = [];
  const pos = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const angle = p.baseAngle + p.droop * Math.pow(t, 1.5);
    const dir = new THREE.Vector3(Math.sin(angle), Math.cos(angle), 0);
    centers.push(pos.clone());
    dirs.push(dir);
    pos.addScaledVector(dir, segLen);
  }

  // 縁の波打ちオフセット (キール方向)。鋸歯が波の山に乗るよう周期を同期させる
  const undOffset = (t: number): number => {
    if (vis.undulation <= 0) return 0;
    const amp = vis.undulation * p.width * 0.09 * widthProfile(t, vis);
    // t = toothStep/SEGMENTS の倍数 (鋸歯位置) で山になる
    return -amp * Math.cos((t * SEGMENTS * Math.PI * 2) / vis.toothStep);
  };

  const vOf = (lateral: number) => (p.mirror ? 1 - (lateral + 1) / 2 : (lateral + 1) / 2);

  // 断面リングを積む
  const rings: number[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const w = (p.width * widthProfile(t, vis)) / 2;
    const th = p.thick * (1 - 0.82 * t) * (0.55 + 0.45 * widthProfile(t, vis));
    const center = centers[i];
    const dir = dirs[i];
    // 断面平面の基底: lateral = Z 軸、perp = 曲げ平面内で dir に直交 (キール側 = +perp)
    const lat = new THREE.Vector3(0, 0, 1);
    const perp = new THREE.Vector3().crossVectors(dir, lat).normalize(); // (cosA, -sinA, 0)

    if (i === SEGMENTS) {
      // 先端は 1 点に収束
      const tipIdx = blade.addVertex(center, 1, 0.5);
      rings.push(new Array(RING).fill(tipIdx));
      break;
    }

    const und = undOffset(t);
    rings.push(
      SECTION.map(([lateral, perpK, undK, cupK]) => {
        const vert = center
          .clone()
          .addScaledVector(lat, lateral * w)
          .addScaledVector(perp, th * perpK + und * undK - th * vis.cup * cupK);
        return blade.addVertex(vert, t, vOf(lateral));
      }),
    );
  }

  // リング間を面で繋ぐ
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i];
    const c = rings[i + 1];
    for (let k = 0; k < RING; k++) {
      const k2 = (k + 1) % RING;
      blade.addTri(a[k], c[k], a[k2]);
      blade.addTri(a[k2], c[k], c[k2]);
    }
  }

  // 鋸歯: 波の山に乗せて両縁に配置 (品種で間隔・大きさ・向き・不揃いが変わる)
  const toothBase = p.toothSize * vis.toothScale;
  if (toothBase > 0.003) {
    for (let i = vis.toothStep; i < SEGMENTS - 1; i += vis.toothStep) {
      const t = i / SEGMENTS;
      if (t < 0.12 || t > 0.92) continue;
      const w = (p.width * widthProfile(t, vis)) / 2;
      const th = p.thick * (1 - 0.82 * t) * (0.55 + 0.45 * widthProfile(t, vis));
      const center = centers[i];
      const dir = dirs[i];
      const lat = new THREE.Vector3(0, 0, 1);
      const perp = new THREE.Vector3().crossVectors(dir, lat).normalize();
      for (const side of [-1, 1]) {
        const jitter = 1 - vis.toothJitter + vis.toothJitter * 2 * hash01(p.phase + i * 3.7 + side);
        const size = toothBase * (0.7 + 0.5 * widthProfile(t, vis)) * jitter;
        // 基部を縁に少し食い込ませ、縁と一体に見せる (カップで持ち上がった縁の高さに合わせる)
        const base = center
          .clone()
          .addScaledVector(lat, side * (w - size * 0.25))
          .addScaledVector(perp, undOffset(t) - th * vis.cup);
        // 葉面に沿って外向き + 品種によって先端側へフック
        const out = new THREE.Vector3()
          .addScaledVector(dir, 0.3 + vis.toothHook)
          .addScaledVector(lat, side * 1.15)
          .addScaledVector(perp, -0.1)
          .normalize();
        spines.addCone(base, out, size * 0.45 * vis.toothFlat, size * 0.45, size * 1.7, dir);
      }
    }
  }

  // 先端棘 (品種で長さ・太さが変わる)。鋸歯が大きくても葉長比で頭打ちにする
  const tipLen = Math.min(Math.max(toothBase * 1.2, p.length * 0.04), p.length * 0.05) * vis.tipSpineLen;
  spines.addCone(
    centers[SEGMENTS - 1],
    dirs[SEGMENTS - 1],
    tipLen * 0.22 * vis.tipSpineThick,
    tipLen * 0.22 * vis.tipSpineThick,
    tipLen * 2.2,
  );

  return { blade: blade.build(), spines: spines.build() };
}

/** 品種 ID → 棘の色 */
export function spineColorOf(speciesId: string, g: Genetics): THREE.Color {
  switch (speciesId) {
    case "hakugei":
      return new THREE.Color("#ded8c4"); // 白棘
    case "kokugei":
      return new THREE.Color("#241a14"); // 黒棘
    case "sasanoyuki":
      return new THREE.Color("#33251c"); // 黒褐色の先端棘
    case "raijin":
    case "kisshokan":
      return new THREE.Color("#a04a30"); // 赤い爪
    default: {
      const c = new THREE.Color("#8a4526");
      c.offsetHSL(0, 0, -g.spine * 0.12);
      return c;
    }
  }
}

/** 白粉 (ブルーム) の色 */
export const POWDER_COLOR = new THREE.Color("#c9d4cf");

/** 葉の基本色: 遺伝子 hue・徒長・品種プロファイルで変化 */
export function leafColorOf(g: Genetics, leaf: Leaf, vis: SpeciesVisual): THREE.Color {
  const h = 0.295 - g.hue * 0.05 - leaf.etiole * 0.03 + leaf.hueShift * 0.05 + vis.hueShift;
  const s = 0.34 + g.thick * 0.08 - Math.max(0, -g.hue) * 0.1 - leaf.etiole * 0.08 + vis.satShift;
  const l = 0.4 + leaf.etiole * 0.16 + Math.max(0, -g.hue) * 0.1 + vis.lightShift;
  const c = new THREE.Color().setHSL(h, Math.max(0.1, s), Math.min(0.72, l));
  // 白粉: 徒長すると乗りが悪くなる
  c.lerp(POWDER_COLOR, vis.powdery * 0.38 * (1 - leaf.etiole * 0.5));
  return c;
}

export const VARIE_COLOR = new THREE.Color("#e8d98a");

/** 株の見かけ半径 (表示スケール調整用) */
export function plantRadius(leafScale: number, leaves: Leaf[], lengthMul = 1): number {
  let r = 0.1;
  for (const lf of leaves) {
    r = Math.max(r, lf.len * leafScale * 0.85 * lengthMul);
  }
  return r;
}
