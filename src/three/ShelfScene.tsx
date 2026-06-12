import { OrbitControls, useCursor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { LED_SPEC } from "../game/constants";
import { slotLight } from "../game/environment";
import type { Plant, Shelf } from "../game/types";
import { AgaveMesh } from "./AgaveMesh";

const SX = 1.18; // スロット間隔
const HY = 1.5; // 段の高さ
const BOARD_T = 0.06;

interface Props {
  shelf: Shelf;
  plants: Record<string, Plant>;
  selectedPlantId: string | null;
  /** 移動・種まきなどでスロット選択待ちか */
  picking: boolean;
  onSlotClick: (level: number, col: number, plantId: string | null) => void;
}

function SlotPad({
  x,
  y,
  light,
  occupied,
  selected,
  picking,
  onClick,
}: {
  x: number;
  y: number;
  light: number;
  occupied: boolean;
  selected: boolean;
  picking: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const color = useMemo(() => {
    if (selected) return new THREE.Color("#3da9fc");
    if (hovered) return new THREE.Color(picking && !occupied ? "#37c978" : "#5a6e85");
    // 光量ヒート (暗い青 → 明るい黄)
    return new THREE.Color().lerpColors(new THREE.Color("#232c38"), new THREE.Color("#8a7a2e"), Math.min(1, light));
  }, [hovered, selected, picking, occupied, light]);

  return (
    <mesh
      position={[x, y + 0.012, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <circleGeometry args={[0.5, 24]} />
      <meshStandardMaterial color={color} roughness={0.9} transparent opacity={selected || hovered ? 0.9 : 0.55} />
    </mesh>
  );
}

export function ShelfScene({ shelf, plants, selectedPlantId, picking, onSlotClick }: Props) {
  const cols = shelf.levels[0]?.slots.length ?? 3;
  const levels = shelf.levels.length;
  const width = cols * SX;
  const height = levels * HY;
  const xOf = (col: number) => (col - (cols - 1) / 2) * SX;

  const camDist = Math.max(width, height) * 1.05 + 2.2;

  return (
    <Canvas shadows camera={{ position: [camDist * 0.25, height * 0.62 + 0.6, camDist], fov: 42 }}>
      <Suspense fallback={null}>
        <color attach="background" args={["#10151c"]} />
        <fog attach="fog" args={["#10151c", camDist + 4, camDist + 14]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 8, 5]} intensity={0.5} />

        {/* 床 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[width + 8, 14]} />
          <meshStandardMaterial color="#1a2129" roughness={0.95} />
        </mesh>

        {/* 支柱 */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[(sx * (width + 0.15)) / 2, height / 2, sz * 0.62]}>
              <cylinderGeometry args={[0.035, 0.035, height, 8]} />
              <meshStandardMaterial color="#777f88" metalness={0.7} roughness={0.4} />
            </mesh>
          )),
        )}

        {shelf.levels.map((lv, li) => {
          const boardY = li * HY;
          const ledY = boardY + HY - 0.22;
          return (
            <group key={li}>
              {/* 棚板 */}
              <mesh position={[0, boardY, 0]} receiveShadow castShadow>
                <boxGeometry args={[width + 0.2, BOARD_T, 1.35]} />
                <meshStandardMaterial color="#5d666f" metalness={0.55} roughness={0.5} />
              </mesh>
              {/* 天板 (最上段の上) */}
              {li === levels - 1 && (
                <mesh position={[0, boardY + HY, 0]} receiveShadow castShadow>
                  <boxGeometry args={[width + 0.2, BOARD_T, 1.35]} />
                  <meshStandardMaterial color="#5d666f" metalness={0.55} roughness={0.5} />
                </mesh>
              )}

              {/* LED バー */}
              {lv.led && (
                <group position={[xOf(lv.led.col), ledY, 0]}>
                  <mesh>
                    <boxGeometry args={[SX * 1.6, 0.05, 0.16]} />
                    <meshStandardMaterial
                      color="#dde4ee"
                      emissive={lv.led.on ? "#fff6e8" : "#222"}
                      emissiveIntensity={lv.led.on ? 1.6 : 0}
                    />
                  </mesh>
                  {lv.led.on && (
                    <pointLight
                      position={[0, -0.1, 0]}
                      intensity={LED_SPEC[lv.led.power].intensity * 6}
                      distance={HY * 2.4}
                      decay={1.6}
                      color="#fff2dc"
                      castShadow={false}
                    />
                  )}
                </group>
              )}

              {/* スロット + 植物 */}
              {lv.slots.map((pid, ci) => {
                const light = slotLight(shelf, li, ci);
                const plant = pid ? plants[pid] : null;
                return (
                  <group key={ci}>
                    <SlotPad
                      x={xOf(ci)}
                      y={boardY + BOARD_T / 2}
                      light={light}
                      occupied={!!plant}
                      selected={!!pid && pid === selectedPlantId}
                      picking={picking}
                      onClick={() => onSlotClick(li, ci, pid)}
                    />
                    {plant && (
                      <group position={[xOf(ci), boardY + BOARD_T / 2, 0]}>
                        <AgaveMesh plant={plant} maxRadius={0.55} />
                      </group>
                    )}
                  </group>
                );
              })}
            </group>
          );
        })}

        <OrbitControls
          target={[0, height / 2, 0]}
          enablePan={false}
          minDistance={2}
          maxDistance={camDist * 1.8}
          maxPolarAngle={Math.PI * 0.55}
        />
      </Suspense>
    </Canvas>
  );
}
