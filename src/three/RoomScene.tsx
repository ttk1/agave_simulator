import { OrbitControls, useCursor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { ROOM_COLS, ROOM_ROWS, WINDOW_X } from "../game/constants";
import { sunStrength } from "../game/environment";
import type { Plant, Shelf } from "../game/types";
import { ShelfModel } from "./ShelfModel";

const CELL = 5.2;
const WALL_H = 5.4;

function cellPos(x: number, y: number): [number, number] {
  return [(x - (ROOM_COLS - 1) / 2) * CELL, (y - (ROOM_ROWS - 1) / 2) * CELL];
}

function ClickableShelf({
  shelf,
  plants,
  day,
  onClick,
}: {
  shelf: Shelf;
  plants: Record<string, Plant>;
  day: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const [px, pz] = cellPos(shelf.x, shelf.y);
  const w = (shelf.levels[0]?.slots.length ?? 3) * 1.18 + 0.5;
  const h = shelf.levels.length * 1.5 + 0.3;
  return (
    <group
      position={[px, 0, pz]}
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
      {/* クリック判定用の透明ボックス (フレームが細いので) */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <ShelfModel shelf={shelf} plants={plants} day={day} />
      {/* ホバー時のハイライトリング */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[2.2, 2.4, 32]} />
          <meshBasicMaterial color="#3da9fc" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

interface Props {
  shelves: Shelf[];
  plants: Record<string, Plant>;
  day: number;
  onShelfClick: (shelfId: string) => void;
}

/** 部屋全体の 3D ビュー (鑑賞モード)。棚クリックで棚画面へ */
export function RoomScene({ shelves, plants, day, onShelfClick }: Props) {
  const roomW = ROOM_COLS * CELL;
  const roomD = ROOM_ROWS * CELL;
  const wallZ = -roomD / 2; // 北壁 (窓側)
  const wallX = -roomW / 2;
  const sun = sunStrength(day);
  const [winL] = cellPos(WINDOW_X[0], 0);
  const [winR] = cellPos(WINDOW_X[1], 0);
  const winCenter = (winL + winR) / 2;
  const winWidth = winR - winL + CELL * 0.7;

  return (
    <Canvas shadows camera={{ position: [roomW * 0.42, WALL_H * 2.1, roomD * 1.05], fov: 45 }}>
      <Suspense fallback={null}>
        <color attach="background" args={["#0a0e14"]} />
        <ambientLight intensity={0.5} />
        {/* 窓からの太陽光 */}
        <directionalLight
          position={[winCenter, WALL_H * 0.8, wallZ - 4]}
          target-position={[winCenter, 0, wallZ + roomD * 0.4]}
          intensity={sun * 2.2}
          color="#dce8ff"
        />
        <directionalLight position={[8, 12, 6]} intensity={0.4} />

        {/* 床 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[roomW + 0.4, roomD + 0.4]} />
          <meshStandardMaterial color="#2b2620" roughness={0.92} />
        </mesh>
        <gridHelper args={[Math.max(roomW, roomD) + 0.4, Math.max(ROOM_COLS, ROOM_ROWS), "#3a352d", "#3a352d"]} position={[0, 0.0, 0]} />

        {/* 北壁 (窓付き) */}
        <mesh position={[0, WALL_H / 2, wallZ - 0.1]}>
          <boxGeometry args={[roomW + 0.4, WALL_H, 0.2]} />
          <meshStandardMaterial color="#262e3a" roughness={0.9} />
        </mesh>
        {/* 窓 (発光) */}
        <mesh position={[winCenter, WALL_H * 0.55, wallZ + 0.02]}>
          <planeGeometry args={[winWidth, WALL_H * 0.6]} />
          <meshStandardMaterial
            color="#9db8d8"
            emissive="#bcd4f5"
            emissiveIntensity={0.4 + sun * 2}
            roughness={0.2}
          />
        </mesh>
        {/* 窓枠 */}
        <mesh position={[winCenter, WALL_H * 0.55, wallZ + 0.03]}>
          <boxGeometry args={[0.08, WALL_H * 0.6, 0.04]} />
          <meshStandardMaterial color="#1a212b" />
        </mesh>

        {/* 西壁 */}
        <mesh position={[wallX - 0.1, WALL_H / 2, 0]}>
          <boxGeometry args={[0.2, WALL_H, roomD + 0.4]} />
          <meshStandardMaterial color="#222a35" roughness={0.9} />
        </mesh>

        {shelves.map((sh) => (
          <ClickableShelf key={sh.id} shelf={sh} plants={plants} day={day} onClick={() => onShelfClick(sh.id)} />
        ))}

        <OrbitControls
          target={[0, 1.6, 0]}
          minDistance={4}
          maxDistance={roomW * 1.6}
          maxPolarAngle={Math.PI * 0.49}
        />
      </Suspense>
    </Canvas>
  );
}
