import { OrbitControls, useCursor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { ROOM_COLS, ROOM_ROWS, WINDOW_X } from "../game/constants";
import { sunStrength } from "../game/environment";
import type { Plant, Shelf } from "../game/types";
import { ShelfModel } from "./ShelfModel";
import { CELL, WALL_H } from "./roomDims";
import { SunPool, WindowUnit } from "./WindowUnit";

function cellPos(x: number, y: number): [number, number] {
  return [(x - (ROOM_COLS - 1) / 2) * CELL, (y - (ROOM_ROWS - 1) / 2) * CELL];
}

/** 部屋のマス目どおりの長方形グリッド (gridHelper は正方形しか作れない) */
function RoomGrid() {
  const geometry = useMemo(() => {
    const w = ROOM_COLS * CELL;
    const d = ROOM_ROWS * CELL;
    const pts: number[] = [];
    for (let i = 0; i <= ROOM_COLS; i++) {
      const x = -w / 2 + i * CELL;
      pts.push(x, 0, -d / 2, x, 0, d / 2);
    }
    for (let j = 0; j <= ROOM_ROWS; j++) {
      const z = -d / 2 + j * CELL;
      pts.push(-w / 2, 0, z, w / 2, 0, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geometry} position={[0, 0.005, 0]}>
      <lineBasicMaterial color="#3a352d" />
    </lineSegments>
  );
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
      {/* 向き (90°単位)。クリック判定用の透明ボックスごと回す */}
      <group rotation={[0, (-(shelf.rot ?? 0) * Math.PI) / 2, 0]}>
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, 1.6]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <ShelfModel shelf={shelf} plants={plants} day={day} />
      </group>
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
        {/* 空からの回り込み + 床からの照り返しで、壁が真っ黒に沈まないように */}
        <hemisphereLight args={["#8fa0b8", "#332f28", 1.15]} />
        <ambientLight intensity={0.45} />
        {/* 窓からの太陽光 (棚の影を床に落とす) */}
        <directionalLight
          position={[winCenter, WALL_H * 0.9, wallZ - 5]}
          intensity={sun * 2.2}
          color="#dce8ff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-roomW * 0.6}
          shadow-camera-right={roomW * 0.6}
          shadow-camera-top={roomD * 0.8}
          shadow-camera-bottom={-roomD * 0.5}
          shadow-camera-near={0.5}
          shadow-camera-far={45}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[8, 12, 6]} intensity={0.5} />

        {/* 床 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[roomW + 0.4, roomD + 0.4]} />
          <meshStandardMaterial color="#413a2f" roughness={0.92} />
        </mesh>
        <RoomGrid />

        {/* 北壁 (窓付き) */}
        <mesh position={[0, WALL_H / 2, wallZ - 0.12]} receiveShadow>
          <boxGeometry args={[roomW + 0.4, WALL_H, 0.24]} />
          <meshStandardMaterial color="#4a5564" roughness={0.9} />
        </mesh>
        {/* 幅木 (北壁) */}
        <mesh position={[0, 0.13, wallZ + 0.03]}>
          <boxGeometry args={[roomW + 0.4, 0.26, 0.06]} />
          <meshStandardMaterial color="#1e242c" roughness={0.7} />
        </mesh>
        {/* 窓 (枠・空・にじみ光) */}
        <group position={[winCenter, WALL_H * 0.55, wallZ + 0.04]}>
          <WindowUnit width={winWidth} height={WALL_H * 0.6} day={day} />
        </group>
        {/* 床の光だまり */}
        <group position={[winCenter, 0, wallZ]}>
          <SunPool width={winWidth * 1.9} length={CELL * 2.4} day={day} />
        </group>

        {/* 西壁 */}
        <mesh position={[wallX - 0.12, WALL_H / 2, 0]} receiveShadow>
          <boxGeometry args={[0.24, WALL_H, roomD + 0.4]} />
          <meshStandardMaterial color="#434e5c" roughness={0.9} />
        </mesh>
        {/* 幅木 (西壁) */}
        <mesh position={[wallX + 0.03, 0.13, 0]}>
          <boxGeometry args={[0.06, 0.26, roomD + 0.4]} />
          <meshStandardMaterial color="#1e242c" roughness={0.7} />
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
