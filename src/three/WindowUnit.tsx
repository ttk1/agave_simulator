import { useMemo } from "react";
import * as THREE from "three";
import { sunStrength } from "../game/environment";

/**
 * 窓 1 つぶんの 3D モデル (空グラデのガラス・白枠・桟・窓台・にじみ光)。
 * 原点 = 窓ガラスの中心、+Z が部屋側。壁の開口部に重ねて置く。
 * 部屋ビュー (RoomScene) とラックビュー (ShelfScene) で共用し、見た目を統一する。
 */

function lerpHex(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

/** 外の空 (グラデーション + 雲)。t: 0 = どんより曇り .. 1 = 快晴 */
function makeSkyTexture(t: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, lerpHex("#7a8794", "#4b8ed4", t));
  grad.addColorStop(0.62, lerpHex("#a6b0ba", "#96c6ef", t));
  grad.addColorStop(1, lerpHex("#c6cdd5", "#ddeeff", t));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);

  // 雲。曇りの日ほど厚く広く出す
  const clouds: Array<[number, number, number, number]> = [
    [42, 58, 66, 20],
    [158, 38, 84, 24],
    [216, 118, 60, 18],
    [86, 142, 76, 22],
    [190, 196, 96, 26],
    [10, 210, 70, 20],
  ];
  const alpha = 0.28 + (1 - t) * 0.45;
  for (const [x, y, rx, ry] of clouds) {
    const rad = g.createRadialGradient(x, y, rx * 0.15, x, y, rx);
    rad.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
    rad.addColorStop(1, "rgba(255,255,255,0)");
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    g.translate(-x, -y);
    g.fillStyle = rad;
    g.beginPath();
    g.arc(x, y, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 窓のまわりにふわっと広がる光 (簡易ブルーム) 用の放射グラデ */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  const rad = g.createRadialGradient(64, 64, 18, 64, 64, 64);
  rad.addColorStop(0, "rgba(214,228,252,0.5)");
  rad.addColorStop(0.55, "rgba(214,228,252,0.16)");
  rad.addColorStop(1, "rgba(214,228,252,0)");
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** 床にできる光だまり用の放射グラデ (上端 = 窓側が明るい) */
function makePoolTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  const rad = g.createRadialGradient(64, 6, 4, 64, 6, 122);
  rad.addColorStop(0, "rgba(230,238,255,0.55)");
  rad.addColorStop(0.5, "rgba(230,238,255,0.18)");
  rad.addColorStop(1, "rgba(230,238,255,0)");
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const FRAME_T = 0.1; // 外枠の太さ
const MULLION_T = 0.05; // 桟の太さ
const FRAME_D = 0.12; // 枠の奥行き
const FRAME_COL = "#dde1e6";
const FRAME_DARK = "#9aa2ac";

interface WindowUnitProps {
  /** ガラス面の幅 */
  width: number;
  /** ガラス面の高さ */
  height: number;
  day: number;
}

export function WindowUnit({ width, height, day }: WindowUnitProps) {
  const sun = sunStrength(day);
  // 晴れ具合 (空の色・雲量)。sunStrength ~0.08-0.5 を 0-1 に正規化
  const clear = Math.max(0, Math.min(1, (sun - 0.12) / 0.3));
  const clearKey = Math.round(clear * 20); // useMemo 用に量子化
  const skyTex = useMemo(() => makeSkyTexture(clearKey / 20), [clearKey]);
  const glowTex = useMemo(() => makeGlowTexture(), []);
  // ガラスの明るさ (>1 にすると白飛びするので 1 で頭打ち)
  const bright = Math.min(1, 0.62 + sun * 1.0);

  // 縦桟の本数は窓幅に応じて増やす (1 ペイン幅 ~1.2)
  const panes = Math.max(2, Math.min(4, Math.round(width / 1.2)));

  return (
    <group>
      {/* ガラス (外の空) */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={skyTex} color={new THREE.Color(bright, bright, bright)} toneMapped={false} />
      </mesh>
      {/* にじみ光 (簡易ブルーム) */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[width * 1.5, height * 1.5]} />
        <meshBasicMaterial
          map={glowTex}
          transparent
          opacity={0.25 + sun * 0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 外枠 (上下左右) */}
      <mesh position={[0, height / 2 + FRAME_T / 2, 0]}>
        <boxGeometry args={[width + FRAME_T * 2, FRAME_T, FRAME_D]} />
        <meshStandardMaterial color={FRAME_COL} roughness={0.6} />
      </mesh>
      <mesh position={[0, -height / 2 - FRAME_T / 2, 0]}>
        <boxGeometry args={[width + FRAME_T * 2, FRAME_T, FRAME_D]} />
        <meshStandardMaterial color={FRAME_COL} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 + FRAME_T / 2), 0, 0]}>
          <boxGeometry args={[FRAME_T, height + FRAME_T * 2, FRAME_D]} />
          <meshStandardMaterial color={FRAME_COL} roughness={0.6} />
        </mesh>
      ))}

      {/* 縦桟 */}
      {Array.from({ length: panes - 1 }, (_, i) => {
        const x = -width / 2 + ((i + 1) * width) / panes;
        return (
          <mesh key={i} position={[x, 0, -0.005]}>
            <boxGeometry args={[MULLION_T, height, FRAME_D * 0.55]} />
            <meshStandardMaterial color={FRAME_COL} roughness={0.6} />
          </mesh>
        );
      })}
      {/* 横桟 */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[width, MULLION_T, FRAME_D * 0.55]} />
        <meshStandardMaterial color={FRAME_COL} roughness={0.6} />
      </mesh>

      {/* 窓台 (下枠の張り出し) */}
      <mesh position={[0, -height / 2 - FRAME_T - 0.02, 0.08]}>
        <boxGeometry args={[width + FRAME_T * 2 + 0.18, 0.06, FRAME_D + 0.16]} />
        <meshStandardMaterial color={FRAME_DARK} roughness={0.5} />
      </mesh>
    </group>
  );
}

interface SunPoolProps {
  /** 光だまりの幅 (窓と平行方向) */
  width: number;
  /** 部屋側への伸び */
  length: number;
  day: number;
  /** 全体の強さ倍率 */
  strength?: number;
}

/**
 * 窓から差し込む光が床に作る明るい帯。
 * 原点 = 窓直下の床、-Z 側に窓がある向きで置く (テクスチャ上端 = 窓側)。
 */
export function SunPool({ width, length, day, strength = 1 }: SunPoolProps) {
  const tex = useMemo(() => makePoolTexture(), []);
  const sun = sunStrength(day);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, length / 2]}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={Math.min(0.7, (0.08 + sun * 0.9) * strength)}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        color="#cfdcf5"
      />
    </mesh>
  );
}
