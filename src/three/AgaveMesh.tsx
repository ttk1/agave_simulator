import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Leaf, Plant } from "../game/types";
import {
  buildLeafGeometry,
  leafColorOf,
  plantRadius,
  spineColorOf,
  visualOf,
} from "./agaveGeometry";
import { leafTexturesFor } from "./leafTexture";

const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;

const POT_COLOR: Record<number, string> = { 1: "#3a3f3a", 2: "#2e4434", 3: "#9c6248" };
const POT_RADIUS: Record<number, number> = { 1: 0.42, 2: 0.58, 3: 0.8 };
const POT_HEIGHT: Record<number, number> = { 1: 0.42, 2: 0.55, 3: 0.7 };

const NEUTRAL_LEAF: Leaf = { len: 1, width: 1, thick: 1, etiole: 0, hueShift: 0, born: 0 };

interface Props {
  plant: Plant;
  /** 表示上の最大半径。超える場合は縮小される (棚表示用)。0 = 無制限 */
  maxRadius?: number;
  showPot?: boolean;
}

interface LeafInstance {
  blade: THREE.BufferGeometry;
  spines: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  azimuth: number;
  y: number;
}

/** 株 ID からテクスチャ模様のバリエーション番号を決める */
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 8;
}

export function AgaveMesh({ plant, maxRadius = 0, showPot = true }: Props) {
  const { leafInstances, spineMaterial, scale, potR, potH, soilColor } = useMemo(() => {
    const g = plant.genetics;
    const dead = plant.stage === "dead";
    const vis = visualOf(plant.speciesId);
    const n = plant.leaves.length;

    // 葉色・模様はテクスチャに焼き、葉ごとの違い (徒長の白茶け等) は
    // マテリアルの color 乗算で近似する
    const textures = dead ? null : leafTexturesFor(plant.speciesId, g, vis, phaseOf(plant.id));
    const baseColor = leafColorOf(g, NEUTRAL_LEAF, vis);
    const roughness = THREE.MathUtils.clamp(0.78 - vis.gloss * 0.38 + vis.powdery * 0.15, 0.35, 0.95);

    const spineMaterial = new THREE.MeshStandardMaterial({
      color: dead ? new THREE.Color("#6b5b4a") : spineColorOf(plant.speciesId, g),
      roughness: 0.45,
      metalness: 0.05,
    });

    const leafInstances: LeafInstance[] = plant.leaves.map((leaf, i) => {
      const rank = n <= 1 ? 1 : (i + 1) / n; // 1 = 最新 (中心)
      const length = leaf.len * plant.leafScale * 0.85 * vis.lengthMul;
      const width = leaf.width * plant.leafScale * 0.34 * vis.widthMul;
      const thick = leaf.thick * plant.leafScale * 0.085 * vis.thickMul;
      // 古い葉ほど開き、徒長葉は垂れる。硬い品種は垂れにくく、内巻き品種は反り込む
      // 胴切り後は上部の葉が無いので、残った下葉は全体に開いた姿勢になる
      const baseAngle = plant.dogiri
        ? THREE.MathUtils.degToRad(THREE.MathUtils.lerp(64, 42, Math.pow(rank, 0.8)))
        : THREE.MathUtils.degToRad(THREE.MathUtils.lerp(64, 14, Math.pow(rank, 0.8)));
      const droop =
        THREE.MathUtils.degToRad(18 + leaf.etiole * 95 * (1 - vis.stiffness) + (1 - g.compact) * 18) +
        vis.curve;
      const { blade, spines } = buildLeafGeometry({
        length,
        width,
        thick,
        droop,
        baseAngle,
        toothSize: g.spine * 0.038 * plant.leafScale * (0.6 + leaf.thick * 0.5),
        visual: vis,
        phase: leaf.hueShift * 40 + i * 1.73,
        mirror: i % 2 === 1,
      });
      let material: THREE.MeshStandardMaterial;
      if (dead || !textures) {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#b09a6a"),
          roughness: 0.95,
          side: THREE.DoubleSide,
        });
      } else {
        // 葉ごとの色ずれ = この葉の色 / 基準色 (チャンネル比で乗算)
        const lc = leafColorOf(g, leaf, vis);
        const tint = new THREE.Color(
          THREE.MathUtils.clamp(lc.r / Math.max(0.02, baseColor.r), 0.55, 1.8),
          THREE.MathUtils.clamp(lc.g / Math.max(0.02, baseColor.g), 0.55, 1.8),
          THREE.MathUtils.clamp(lc.b / Math.max(0.02, baseColor.b), 0.55, 1.8),
        );
        material = new THREE.MeshStandardMaterial({
          map: textures.map,
          bumpMap: textures.bump,
          bumpScale: 0.012,
          color: tint,
          roughness,
          metalness: 0.02,
          side: THREE.DoubleSide,
        });
      }
      return {
        blade,
        spines,
        material,
        azimuth: i * GOLDEN_ANGLE,
        y: (0.05 + rank * 0.1) * plant.leafScale,
      };
    });

    const r = plantRadius(plant.leafScale, plant.leaves, vis.lengthMul);
    const scale = maxRadius > 0 && r > maxRadius ? maxRadius / r : 1;

    const potR = POT_RADIUS[plant.potSize];
    const potH = POT_HEIGHT[plant.potSize];
    // 土の色は水分で変わる (乾くと白っぽく)
    const soilColor = new THREE.Color().setHSL(0.07, 0.35, 0.16 + (1 - plant.moisture) * 0.14);

    return { leafInstances, spineMaterial, scale, potR, potH, soilColor };
  }, [plant, maxRadius]);

  // GPU リソースの後始末 (テクスチャは品種キャッシュ共有なので破棄しない)
  useEffect(() => {
    return () => {
      leafInstances.forEach((lf) => {
        lf.blade.dispose();
        lf.spines.dispose();
        lf.material.dispose();
      });
      spineMaterial.dispose();
    };
  }, [leafInstances, spineMaterial]);

  const seed = plant.stage === "seed";

  return (
    <group>
      {showPot && (
        <group>
          <mesh position={[0, potH / 2, 0]}>
            <cylinderGeometry args={[potR, potR * 0.72, potH, 18]} />
            <meshStandardMaterial color={POT_COLOR[plant.potSize]} roughness={0.85} />
          </mesh>
          <mesh position={[0, potH - 0.012, 0]}>
            <cylinderGeometry args={[potR * 0.93, potR * 0.93, 0.03, 18]} />
            <meshStandardMaterial color={soilColor} roughness={1} />
          </mesh>
        </group>
      )}
      <group position={[0, showPot ? potH : 0, 0]} scale={scale}>
        {seed ? (
          // 種 (まだ発芽していない)
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#1d1812" roughness={1} />
          </mesh>
        ) : (
          <>
            {leafInstances.map((lf, i) => (
              <group key={i} rotation={[0, lf.azimuth, 0]} position={[0, lf.y, 0]}>
                <mesh geometry={lf.blade} material={lf.material} castShadow receiveShadow />
                <mesh geometry={lf.spines} material={spineMaterial} castShadow />
              </group>
            ))}
            {/* 中心の未展開葉 (芯)。胴切り中は切り口の円盤になる */}
            {plant.stage !== "dead" && plant.leaves.length > 0 && (
              plant.dogiri ? (
                <group>
                  <mesh position={[0, 0.15 * plant.leafScale, 0]}>
                    <cylinderGeometry args={[0.1 * plant.leafScale, 0.12 * plant.leafScale, 0.06 * plant.leafScale, 10]} />
                    <meshStandardMaterial color="#d9cfa6" roughness={0.9} />
                  </mesh>
                  {/* 吹いた芽 */}
                  {Array.from({ length: plant.dogiri.buds }, (_, k) => {
                    const a = k * GOLDEN_ANGLE + 0.7;
                    const r = 0.1 * plant.leafScale;
                    return (
                      <mesh
                        key={k}
                        position={[Math.cos(a) * r, 0.2 * plant.leafScale, Math.sin(a) * r]}
                        rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}
                      >
                        <coneGeometry args={[0.035 * plant.leafScale, 0.12 * plant.leafScale, 6]} />
                        <meshStandardMaterial
                          color={leafColorOf(plant.genetics, NEUTRAL_LEAF,
                            visualOf(plant.speciesId)).offsetHSL(0, 0.06, 0.12)}
                          roughness={0.6}
                        />
                      </mesh>
                    );
                  })}
                </group>
              ) : (
                <mesh position={[0, 0.24 * plant.leafScale, 0]}>
                  <coneGeometry args={[0.055 * plant.leafScale, 0.42 * plant.leafScale, 7]} />
                  <meshStandardMaterial color={leafColorOf(plant.genetics, NEUTRAL_LEAF,
                    visualOf(plant.speciesId)).offsetHSL(0, 0.02, 0.06)} roughness={0.6} />
                </mesh>
              )
            )}
          </>
        )}
      </group>
    </group>
  );
}
