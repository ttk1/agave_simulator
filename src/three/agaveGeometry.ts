import * as THREE from "three";
import type { Genetics, Leaf } from "../game/types";

/**
 * アガベの葉 1 枚のジオメトリを生成する。
 * 断面はダイヤ型 (上面は浅い樋、下面はキール) で、縁の鋸歯と先端棘も
 * 同じジオメトリに焼き込み、頂点カラーで塗り分ける。
 *
 * ローカル座標系: 基部が原点、+Y 方向に伸び、+X 方向へ反る。
 */

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
  leafColor: THREE.Color;
  edgeColor: THREE.Color;
  spineColor: THREE.Color;
  /** 鋸歯サイズ (0 で無し) */
  toothSize: number;
  /** 斑 0..1 */
  variegation: number;
  vtype: "margin" | "center";
  varieColor: THREE.Color;
}

const SEGMENTS = 14;

class GeoBuilder {
  positions: number[] = [];
  colors: number[] = [];
  indices: number[] = [];

  addVertex(p: THREE.Vector3, c: THREE.Color): number {
    this.positions.push(p.x, p.y, p.z);
    this.colors.push(c.r, c.g, c.b);
    return this.positions.length / 3 - 1;
  }

  addTri(a: number, b: number, c: number) {
    this.indices.push(a, b, c);
  }

  /** 6 角錐 (棘・鋸歯用) */
  addCone(base: THREE.Vector3, dir: THREE.Vector3, radius: number, height: number, color: THREE.Color) {
    const n = 5;
    const d = dir.clone().normalize();
    // dir に直交する基底
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize();
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const tip = this.addVertex(base.clone().addScaledVector(d, height), color);
    const ring: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = base
        .clone()
        .addScaledVector(u, Math.cos(a) * radius)
        .addScaledVector(v, Math.sin(a) * radius);
      ring.push(this.addVertex(p, color));
    }
    for (let i = 0; i < n; i++) {
      this.addTri(ring[i], ring[(i + 1) % n], tip);
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    return g;
  }
}

/** 幅プロファイル: 基部やや細 → 中腹が最大 → 先端は尖る */
function widthProfile(t: number): number {
  return Math.pow(Math.sin(Math.PI * (0.12 + 0.82 * t)), 0.7);
}

export function buildLeafGeometry(p: LeafBuildParams): THREE.BufferGeometry {
  const b = new GeoBuilder();
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

  // 葉色の決定 (頂点カラー)
  const colorAt = (t: number, lateral: number): THREE.Color => {
    // lateral: -1(左縁)..0(中央)..1(右縁)
    const c = p.leafColor.clone();
    // 先端へ少し濃く
    c.offsetHSL(0, 0.02 * t, -0.05 * t);
    // 縁を少し明るく
    const edge = Math.abs(lateral);
    if (p.variegation > 0) {
      const inZone = p.vtype === "margin" ? edge > 0.55 : edge < 0.5;
      if (inZone) {
        const k = Math.min(1, p.variegation * 1.4);
        c.lerp(p.varieColor, k);
      }
    } else if (edge > 0.8) {
      c.lerp(p.edgeColor, 0.45);
    }
    return c;
  };

  // 断面リングを積む: [左縁, 上面中央(樋), 右縁, 下面中央(キール)]
  const rings: number[][] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const w = (p.width * widthProfile(t)) / 2;
    const th = p.thick * (1 - 0.82 * t) * (0.55 + 0.45 * widthProfile(t));
    const center = centers[i];
    const dir = dirs[i];
    // 断面平面の基底: lateral = Z 軸、perp = 曲げ平面内で dir に直交 (キール側 = +perp)
    const lat = new THREE.Vector3(0, 0, 1);
    const perp = new THREE.Vector3().crossVectors(dir, lat).normalize(); // (cosA, -sinA, 0)

    if (i === SEGMENTS) {
      // 先端は 1 点に収束
      const tipIdx = b.addVertex(center, colorAt(1, 0));
      rings.push([tipIdx, tipIdx, tipIdx, tipIdx]);
      break;
    }

    const left = center.clone().addScaledVector(lat, -w);
    const right = center.clone().addScaledVector(lat, w);
    const topMid = center.clone().addScaledVector(perp, th * 0.3); // 樋 (浅い凹み)
    const botMid = center.clone().addScaledVector(perp, th);

    rings.push([
      b.addVertex(left, colorAt(t, -1)),
      b.addVertex(topMid, colorAt(t, 0)),
      b.addVertex(right, colorAt(t, 1)),
      b.addVertex(botMid, colorAt(t, 0.2)),
    ]);
  }

  // リング間を面で繋ぐ (4 面/区間)
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i];
    const c = rings[i + 1];
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      b.addTri(a[k], c[k], a[k2]);
      b.addTri(a[k2], c[k], c[k2]);
    }
  }

  // 鋸歯: 両縁に沿って配置
  if (p.toothSize > 0.003) {
    for (let i = 2; i < SEGMENTS - 1; i += 2) {
      const t = i / SEGMENTS;
      if (t < 0.15 || t > 0.9) continue;
      const w = (p.width * widthProfile(t)) / 2;
      const center = centers[i];
      const dir = dirs[i];
      const size = p.toothSize * (0.7 + 0.5 * widthProfile(t));
      for (const side of [-1, 1]) {
        const base = center.clone().add(new THREE.Vector3(0, 0, side * w));
        // 外向き + やや先端向きの棘
        const out = new THREE.Vector3(dir.x * 0.5, dir.y * 0.5, side).normalize();
        b.addCone(base, out, size * 0.45, size * 1.7, p.spineColor);
      }
    }
  }

  // 先端棘
  const tipLen = Math.max(p.toothSize * 2.6, p.length * 0.045);
  b.addCone(centers[SEGMENTS - 1], dirs[SEGMENTS - 1], tipLen * 0.22, tipLen * 2.2, p.spineColor);

  return b.build();
}

/** 品種 ID → 棘の色 */
export function spineColorOf(speciesId: string, g: Genetics): THREE.Color {
  switch (speciesId) {
    case "hakugei":
      return new THREE.Color("#ded8c4"); // 白棘
    case "kokugei":
      return new THREE.Color("#241a14"); // 黒棘
    case "sasanoyuki":
      return new THREE.Color("#4a3328");
    default: {
      const c = new THREE.Color("#8a4526");
      c.offsetHSL(0, 0, -g.spine * 0.12);
      return c;
    }
  }
}

/** 葉の基本色: 遺伝子 hue と徒長で変化 */
export function leafColorOf(g: Genetics, leaf: Leaf): THREE.Color {
  const h = 0.295 - g.hue * 0.05 - leaf.etiole * 0.03 + leaf.hueShift * 0.05;
  const s = 0.34 + g.thick * 0.08 - Math.max(0, -g.hue) * 0.1 - leaf.etiole * 0.08;
  const l = 0.4 + leaf.etiole * 0.16 + Math.max(0, -g.hue) * 0.1;
  return new THREE.Color().setHSL(h, Math.max(0.1, s), Math.min(0.72, l));
}

export const VARIE_COLOR = new THREE.Color("#e8d98a");
export const EDGE_COLOR = new THREE.Color("#cfe3b0");

/** 株の見かけ半径 (表示スケール調整用) */
export function plantRadius(leafScale: number, leaves: Leaf[]): number {
  let r = 0.1;
  for (const lf of leaves) {
    r = Math.max(r, lf.len * leafScale * 0.85);
  }
  return r;
}
