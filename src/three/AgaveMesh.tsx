import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Plant } from "../game/types";
import {
  buildLeafGeometry,
  EDGE_COLOR,
  leafColorOf,
  plantRadius,
  spineColorOf,
  VARIE_COLOR,
  visualOf,
} from "./agaveGeometry";

const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;

const POT_COLOR: Record<number, string> = { 1: "#3a3f3a", 2: "#2e4434", 3: "#9c6248" };
const POT_RADIUS: Record<number, number> = { 1: 0.42, 2: 0.58, 3: 0.8 };
const POT_HEIGHT: Record<number, number> = { 1: 0.42, 2: 0.55, 3: 0.7 };

interface Props {
  plant: Plant;
  /** 表示上の最大半径。超える場合は縮小される (棚表示用)。0 = 無制限 */
  maxRadius?: number;
  showPot?: boolean;
}

interface LeafInstance {
  geometry: THREE.BufferGeometry;
  azimuth: number;
  tilt: number;
  y: number;
}

export function AgaveMesh({ plant, maxRadius = 0, showPot = true }: Props) {
  const { leafInstances, material, scale, potR, potH, soilColor, deadMaterial } = useMemo(() => {
    const g = plant.genetics;
    const dead = plant.stage === "dead";
    const spineColor = spineColorOf(plant.speciesId, g);
    const vis = visualOf(plant.speciesId);
    const n = plant.leaves.length;

    const leafInstances: LeafInstance[] = plant.leaves.map((leaf, i) => {
      const rank = n <= 1 ? 1 : (i + 1) / n; // 1 = 最新 (中心)
      const length = leaf.len * plant.leafScale * 0.85 * vis.lengthMul;
      const width = leaf.width * plant.leafScale * 0.34 * vis.widthMul;
      const thick = leaf.thick * plant.leafScale * 0.085 * vis.thickMul;
      // 古い葉ほど開き、徒長葉は垂れる。硬い品種は垂れにくく、内巻き品種は反り込む
      const baseAngle = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(72, 14, Math.pow(rank, 0.8)));
      const droop =
        THREE.MathUtils.degToRad(18 + leaf.etiole * 95 * (1 - vis.stiffness) + (1 - g.compact) * 18) +
        vis.curve;
      const geometry = buildLeafGeometry({
        length,
        width,
        thick,
        droop,
        baseAngle,
        leafColor: dead ? new THREE.Color("#8a7a55") : leafColorOf(g, leaf, vis),
        edgeColor: EDGE_COLOR,
        spineColor,
        toothSize: g.spine * 0.038 * plant.leafScale * (0.6 + leaf.thick * 0.5),
        variegation: dead ? 0 : g.variegation,
        vtype: g.vtype,
        varieColor: VARIE_COLOR,
        visual: vis,
        phase: leaf.hueShift * 40 + i * 1.73,
      });
      return {
        geometry,
        azimuth: i * GOLDEN_ANGLE,
        tilt: 0,
        y: 0.02 + rank * 0.05 * plant.leafScale,
      };
    });

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const deadMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      color: new THREE.Color("#b09a6a"),
    });

    const r = plantRadius(plant.leafScale, plant.leaves, vis.lengthMul);
    const scale = maxRadius > 0 && r > maxRadius ? maxRadius / r : 1;

    const potR = POT_RADIUS[plant.potSize];
    const potH = POT_HEIGHT[plant.potSize];
    // 土の色は水分で変わる (乾くと白っぽく)
    const soilColor = new THREE.Color().setHSL(0.07, 0.35, 0.16 + (1 - plant.moisture) * 0.14);

    return { leafInstances, material, scale, potR, potH, soilColor, deadMaterial };
  }, [plant, maxRadius]);

  // GPU リソースの後始末
  useEffect(() => {
    return () => {
      leafInstances.forEach((lf) => lf.geometry.dispose());
      material.dispose();
      deadMaterial.dispose();
    };
  }, [leafInstances, material, deadMaterial]);

  const dead = plant.stage === "dead";
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
                <mesh geometry={lf.geometry} material={dead ? deadMaterial : material} castShadow receiveShadow />
              </group>
            ))}
            {/* 中心の未展開葉 (芯) */}
            {!dead && plant.leaves.length > 0 && (
              <mesh position={[0, 0.2 * plant.leafScale, 0]}>
                <coneGeometry args={[0.07 * plant.leafScale, 0.34 * plant.leafScale, 7]} />
                <meshStandardMaterial color={leafColorOf(plant.genetics, {
                  len: 1, width: 1, thick: 1, etiole: 0, hueShift: 0, born: 0,
                }, visualOf(plant.speciesId)).offsetHSL(0, 0.02, 0.06)} roughness={0.6} />
              </mesh>
            )}
          </>
        )}
      </group>
    </group>
  );
}
