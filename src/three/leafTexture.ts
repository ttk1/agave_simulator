import * as THREE from "three";
import type { Genetics, Leaf } from "../game/types";
import { hash01, leafColorOf, VARIE_COLOR, type SpeciesVisual } from "./agaveGeometry";

/**
 * 葉のプロシージャルテクスチャ生成。
 * Canvas に品種の特徴 (縦筋・まだら・角質縁・ペンキ模様・斑・白粉) を描き、
 * カラーマップとバンプマップを返す。株単位でキャッシュする。
 *
 * レイアウト: x = 基部(左)→先端(右)、y = 左縁(上)→右縁(下)。
 * ジオメトリの UV (u=長さ方向, v=幅方向) に対応する。
 */

export interface LeafTextures {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

const W = 512;
const H = 128;

const cache = new Map<string, LeafTextures>();

const NEUTRAL_LEAF: Leaf = { len: 1, width: 1, thick: 1, etiole: 0, hueShift: 0, born: 0 };

/** THREE.Color (リニア内部値) を sRGB の CSS 文字列に変換する */
function css(c: THREE.Color): string {
  return c.getStyle();
}

/** sRGB の hex 文字列 + アルファ → CSS rgba (色空間変換なし) */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 模様のプリミティブ (カラー・バンプ両方に同じ位置で描くため先に生成する) */
interface Paint {
  striations: { y: number; drift: number; alpha: number; light: boolean; width: number }[];
  mottles: { x: number; y: number; r: number; light: boolean }[];
  imprints: { x: number; bend: number; width: number }[];
  marginJitter: number[];
}

export function leafTexturesFor(
  speciesId: string,
  g: Genetics,
  vis: SpeciesVisual,
  phase: number,
): LeafTextures {
  const key = [
    speciesId,
    Math.round(g.hue * 10),
    Math.round(g.thick * 5),
    g.variegation > 0 ? Math.round(g.variegation * 5) : 0,
    g.vtype,
    phase % 8,
  ].join("|");
  const hit = cache.get(key);
  if (hit) return hit;

  // 決定的な乱数列
  let seed = (phase % 8) * 13.7 + g.hue * 5.1;
  const rnd = () => hash01((seed += 1.618));

  const paint: Paint = {
    striations: Array.from({ length: Math.round(14 + 30 * vis.striation) }, () => ({
      y: 3 + rnd() * (H - 6),
      drift: (rnd() - 0.5) * 10,
      alpha: 0.03 + rnd() * 0.08 * (0.4 + vis.striation),
      light: rnd() < 0.45,
      width: 1 + rnd() * 1.6,
    })),
    mottles: Array.from({ length: Math.round(50 * vis.mottle) }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      r: 8 + rnd() * 26,
      light: rnd() < 0.5,
    })),
    imprints: Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => ({
      x: (0.14 + rnd() * 0.74) * W,
      bend: (rnd() - 0.5) * 40,
      width: 3.5 + rnd() * 3,
    })),
    marginJitter: Array.from({ length: Math.ceil(W / 16) + 1 }, () => 0.75 + rnd() * 0.5),
  };

  const base = leafColorOf(g, NEUTRAL_LEAF, vis);
  const map = paintColorMap(base, g, vis, paint);
  const bump = paintBumpMap(vis, paint);
  const tex: LeafTextures = { map, bump };
  cache.set(key, tex);
  return tex;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return [cv, cv.getContext("2d")!];
}

function paintColorMap(
  base: THREE.Color,
  g: Genetics,
  vis: SpeciesVisual,
  paint: Paint,
): THREE.CanvasTexture {
  const [cv, ctx] = makeCanvas(W, H);

  // 1. ベース: 基部は明るく若い色、先端へ濃く
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, css(base.clone().offsetHSL(0.01, -0.04, 0.07)));
  grad.addColorStop(0.3, css(base));
  grad.addColorStop(1, css(base.clone().offsetHSL(0, 0.03, -0.055)));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. 縦筋 (繊維質のスジ)
  for (const s of paint.striations) {
    ctx.strokeStyle = s.light ? `rgba(255,255,255,${s.alpha})` : `rgba(8,20,10,${s.alpha})`;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(0, s.y);
    ctx.quadraticCurveTo(W / 2, s.y + s.drift, W, s.y + s.drift * 0.4);
    ctx.stroke();
  }

  // 3. まだら (組織のムラ)
  for (const m of paint.mottles) {
    const rg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    const col = m.light ? "255,255,255" : "6,18,8";
    rg.addColorStop(0, `rgba(${col},0.055)`);
    rg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = rg;
    ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
  }

  // 4. 樋の陰影 (中央がわずかに沈む)
  const troughG = ctx.createLinearGradient(0, 0, 0, H);
  troughG.addColorStop(0, "rgba(0,0,0,0)");
  troughG.addColorStop(0.42, "rgba(0,0,0,0.07)");
  troughG.addColorStop(0.5, "rgba(0,0,0,0.1)");
  troughG.addColorStop(0.58, "rgba(0,0,0,0.07)");
  troughG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = troughG;
  ctx.fillRect(0, 0, W, H);

  // 5. 斑: 縁斑は両縁、中斑は中央にギザギザ境界の帯
  if (g.variegation > 0) {
    const vc = css(VARIE_COLOR);
    ctx.globalAlpha = Math.min(1, g.variegation * 1.1);
    ctx.fillStyle = vc;
    const jag = (yBase: number, dir: 1 | -1, amp: number) => {
      ctx.beginPath();
      ctx.moveTo(0, dir === 1 ? 0 : H);
      for (let i = 0; i < paint.marginJitter.length; i++) {
        ctx.lineTo(i * 16, yBase + dir * amp * paint.marginJitter[i]);
      }
      ctx.lineTo(W, dir === 1 ? 0 : H);
      ctx.closePath();
      ctx.fill();
    };
    if (g.vtype === "margin") {
      jag(0, 1, H * 0.26);
      jag(H, -1, H * 0.26);
    } else {
      // 中斑: 中央帯 (上下境界をギザギザに)
      ctx.beginPath();
      ctx.moveTo(0, H * 0.32);
      paint.marginJitter.forEach((j, i) => ctx.lineTo(i * 16, H * 0.32 + (j - 1) * 14));
      ctx.lineTo(W, H * 0.68);
      for (let i = paint.marginJitter.length - 1; i >= 0; i--) {
        ctx.lineTo(i * 16, H * 0.68 + (paint.marginJitter[i] - 1) * 14);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 6. 白ペンキ模様 (笹の雪): 中央線 + 横断する筆致
  if (vis.budImprint) {
    const white = vis.imprintColor;
    ctx.strokeStyle = white;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H / 2);
    ctx.lineTo(W * 0.99, H / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const im of paint.imprints) {
      // うっすら影を落としてから白線を引くと "乗っている" 感が出る
      ctx.lineWidth = im.width + 2;
      ctx.strokeStyle = "rgba(10,20,12,0.25)";
      ctx.beginPath();
      ctx.moveTo(im.x + 2, 2);
      ctx.quadraticCurveTo(im.x + im.bend + 2, H / 2, im.x + 2, H - 2);
      ctx.stroke();
      ctx.lineWidth = im.width;
      ctx.strokeStyle = white;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(im.x, 2);
      ctx.quadraticCurveTo(im.x + im.bend, H / 2, im.x, H - 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // 7. 角質縁 (チタノタの白/黒縁など): ギザギザの内側境界を持つ帯
  if (vis.marginColor && vis.marginBand > 0) {
    const bw = H * vis.marginBand * 1.1;
    ctx.fillStyle = vis.marginColor;
    ctx.globalAlpha = 0.95;
    for (const dir of [1, -1] as const) {
      ctx.beginPath();
      ctx.moveTo(0, dir === 1 ? 0 : H);
      paint.marginJitter.forEach((j, i) => {
        ctx.lineTo(i * 16, dir === 1 ? bw * j : H - bw * j);
      });
      ctx.lineTo(W, dir === 1 ? 0 : H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // 角質縁がない品種もごく薄い明るい縁取り
    ctx.strokeStyle = "rgba(235,245,215,0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.5, 0.75, W - 1, H - 1.5);
  }

  // 8. 先端の色付き (雷神・吉祥冠の赤み)
  if (vis.tipTint) {
    const tg = ctx.createLinearGradient(W * 0.78, 0, W, 0);
    tg.addColorStop(0, rgba(vis.tipTint, 0));
    tg.addColorStop(1, rgba(vis.tipTint, 0.45));
    ctx.fillStyle = tg;
    ctx.fillRect(W * 0.78, 0, W * 0.22, H);
  }

  // 9. 白粉のかすれ (基部側に多い)
  if (vis.powdery > 0.2) {
    const pg = ctx.createLinearGradient(0, 0, W, 0);
    pg.addColorStop(0, `rgba(225,232,226,${0.16 * vis.powdery})`);
    pg.addColorStop(0.55, `rgba(225,232,226,${0.05 * vis.powdery})`);
    pg.addColorStop(1, "rgba(225,232,226,0)");
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, W, H);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function paintBumpMap(vis: SpeciesVisual, paint: Paint): THREE.CanvasTexture {
  const [cv, ctx] = makeCanvas(W / 2, H / 2);
  const w = W / 2;
  const h = H / 2;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, w, h);

  // 縦筋の凹凸
  for (const s of paint.striations) {
    ctx.strokeStyle = s.light ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.16)";
    ctx.lineWidth = Math.max(1, s.width * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, s.y / 2);
    ctx.quadraticCurveTo(w / 2, (s.y + s.drift) / 2, w, (s.y + s.drift * 0.4) / 2);
    ctx.stroke();
  }

  // ペンキ模様は盛り上がる
  if (vis.budImprint) {
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    for (const im of paint.imprints) {
      ctx.lineWidth = im.width / 2;
      ctx.beginPath();
      ctx.moveTo(im.x / 2, 1);
      ctx.quadraticCurveTo((im.x + im.bend) / 2, h / 2, im.x / 2, h - 1);
      ctx.stroke();
    }
  }

  // 角質縁の盛り上がり
  if (vis.marginColor && vis.marginBand > 0) {
    const bw = (h * vis.marginBand * 1.1) | 0;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(0, 0, w, Math.max(1, bw));
    ctx.fillRect(0, h - Math.max(1, bw), w, Math.max(1, bw));
  }

  return new THREE.CanvasTexture(cv);
}
