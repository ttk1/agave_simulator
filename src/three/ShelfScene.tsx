import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { sunStrength, windowSide } from "../game/environment";
import type { Plant, Shelf } from "../game/types";
import { ShelfModel, shelfHeight, shelfWidth } from "./ShelfModel";

// 部屋ビュー (RoomScene) と同じ壁・窓の寸法に揃える
const WALL_H = 5.4;
const WALL_LEN = 14;

/**
 * 窓のある壁を、棚から距離をあけて配置する。寸法・見え方は部屋ビューと同一。
 * 棚は正面固定で描くので、棚の向き (rot) は壁を置く方角に反映する
 * (rot 0 = 奥 / 1 = 右 / 2 = 手前 / 3 = 左)。
 */
function WindowWall({ side, width, near, day }: { side: number; width: number; near: boolean; day: number }) {
  const gap = 0.78 + 3.0; // 棚の奥行き縁 + 距離
  const sun = sunStrength(day);
  const winW = width; // 窓幅は棚の横幅に合わせる
  const winH = WALL_H * 0.6;
  const winY = WALL_H * 0.55;

  const rotY = (side * Math.PI) / 2; // 0:奥 1:右 2:手前 3:左 (Y軸まわり)

  return (
    <group rotation={[0, rotY, 0]}>
      {/* 壁 (棚の奥方向 -Z に置く。group ごと回して方角を変える) */}
      <mesh position={[0, WALL_H / 2, -gap - 0.1]}>
        <boxGeometry args={[WALL_LEN, WALL_H, 0.2]} />
        <meshStandardMaterial color="#262e3a" roughness={0.9} />
      </mesh>
      {/* 窓ガラス (発光) */}
      <mesh position={[0, winY, -gap + 0.02]}>
        <planeGeometry args={[winW, winH]} />
        <meshStandardMaterial color="#9db8d8" emissive="#bcd4f5" emissiveIntensity={(near ? 0.6 : 0.3) + sun * 2} roughness={0.2} />
      </mesh>
      {/* 窓からの光 */}
      <directionalLight position={[0, winY, -gap - 2]} target-position={[0, 0, 0]} intensity={sun * 1.4} color="#dce8ff" />
    </group>
  );
}

interface Props {
  shelf: Shelf;
  plants: Record<string, Plant>;
  day: number;
  selectedPlantId: string | null;
  /** 移動・種まきなどでスロット選択待ちか */
  picking: boolean;
  onSlotClick: (level: number, col: number, plantId: string | null) => void;
}

export function ShelfScene({ shelf, plants, day, selectedPlantId, picking, onSlotClick }: Props) {
  const width = shelfWidth(shelf);
  const height = shelfHeight(shelf);
  const camDist = Math.max(width, height) * 1.05 + 3.4;
  const win = windowSide(shelf);

  return (
    <Canvas shadows camera={{ position: [camDist * 0.3, height * 0.62 + 0.8, camDist], fov: 42 }}>
      <Suspense fallback={null}>
        <color attach="background" args={["#10151c"]} />
        <fog attach="fog" args={["#10151c", camDist + 9, camDist + 22]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 8, 5]} intensity={0.5} />

        {/* 床 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial color="#1a2129" roughness={0.95} />
        </mesh>

        <ShelfModel
          shelf={shelf}
          plants={plants}
          day={day}
          selectedPlantId={selectedPlantId}
          picking={picking}
          onSlotClick={onSlotClick}
        />

        {win && <WindowWall side={(shelf.rot ?? 0) % 4} width={width} near={win.near} day={day} />}

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
