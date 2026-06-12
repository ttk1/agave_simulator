import { useCursor } from "@react-three/drei";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { LED_SPEC } from "../game/constants";
import { slotLight } from "../game/environment";
import type { Plant, Shelf } from "../game/types";
import { AgaveMesh } from "./AgaveMesh";

export const SX = 1.18; // スロット間隔
export const HY = 1.5; // 段の高さ
export const BOARD_T = 0.06;

export function shelfWidth(shelf: Shelf): number {
  return (shelf.levels[0]?.slots.length ?? 3) * SX;
}

export function shelfHeight(shelf: Shelf): number {
  return shelf.levels.length * HY;
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
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !!onClick);
  const color = useMemo(() => {
    if (selected) return new THREE.Color("#3da9fc");
    if (hovered && onClick) return new THREE.Color(picking && !occupied ? "#37c978" : "#5a6e85");
    // 光量ヒート (暗い青 → 明るい黄)
    return new THREE.Color().lerpColors(new THREE.Color("#232c38"), new THREE.Color("#8a7a2e"), Math.min(1, light));
  }, [hovered, selected, picking, occupied, light, onClick]);

  return (
    <mesh
      position={[x, y + 0.012, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onPointerOver={
        onClick
          ? (e) => {
              e.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={onClick ? () => setHovered(false) : undefined}
    >
      <circleGeometry args={[0.5, 24]} />
      <meshStandardMaterial color={color} roughness={0.9} transparent opacity={selected || hovered ? 0.9 : 0.55} />
    </mesh>
  );
}

interface ShelfModelProps {
  shelf: Shelf;
  plants: Record<string, Plant>;
  day: number;
  selectedPlantId?: string | null;
  picking?: boolean;
  /** スロット単位の操作 (棚ビュー用)。未指定ならスロットは表示のみ */
  onSlotClick?: (level: number, col: number, plantId: string | null) => void;
}

/** 棚 1 台ぶんの 3D モデル (フレーム・棚板・LED・株・スロットパッド) */
export function ShelfModel({ shelf, plants, day, selectedPlantId = null, picking = false, onSlotClick }: ShelfModelProps) {
  const cols = shelf.levels[0]?.slots.length ?? 3;
  const levels = shelf.levels.length;
  const width = cols * SX;
  const height = levels * HY;
  const xOf = (col: number) => (col - (cols - 1) / 2) * SX;

  return (
    <group>
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
              const light = slotLight(shelf, li, ci, day);
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
                    onClick={onSlotClick ? () => onSlotClick(li, ci, pid) : undefined}
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
    </group>
  );
}
