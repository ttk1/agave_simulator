import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { sunStrength, windowSide } from "../game/environment";
import type { Plant, Shelf } from "../game/types";
import { ShelfModel, shelfHeight, shelfWidth } from "./ShelfModel";
import { CELL, WALL_H } from "./roomDims";
import { SunPool, WindowUnit } from "./WindowUnit";

// 部屋ビュー (RoomScene) と同じ壁・窓の寸法に揃える
const WALL_LEN = 22;

/**
 * 窓のある壁を、棚から距離をあけて配置する。寸法・見え方は部屋ビューと同一。
 * 棚は正面固定で描くので、棚の向き (rot) は壁を置く方角に反映する
 * (rot 0 = 奥 / 1 = 右 / 2 = 手前 / 3 = 左)。
 */
function WindowWall({ side, width, near, day }: { side: number; width: number; near: boolean; day: number }) {
  // 窓に近い棚 (near) は壁が近く、1 マス離れた棚は部屋のマス目 1 つぶん (CELL) 窓が遠のく
  const gap = 0.78 + 3.0 + (near ? 0 : CELL);
  const sun = sunStrength(day);
  const winW = Math.max(width, 2.4); // 窓幅は棚の横幅に合わせる (最低幅あり)
  const winH = WALL_H * 0.6;
  const winY = WALL_H * 0.55;

  const rotY = (side * Math.PI) / 2; // 0:奥 1:右 2:手前 3:左 (Y軸まわり)

  return (
    <group rotation={[0, rotY, 0]}>
      {/* 壁 (棚の奥方向 -Z に置く。group ごと回して方角を変える) */}
      <mesh position={[0, WALL_H / 2, -gap - 0.12]} receiveShadow>
        <boxGeometry args={[WALL_LEN, WALL_H, 0.24]} />
        <meshStandardMaterial color="#3e4855" roughness={0.9} />
      </mesh>
      {/* 幅木 */}
      <mesh position={[0, 0.13, -gap + 0.03]}>
        <boxGeometry args={[WALL_LEN, 0.26, 0.06]} />
        <meshStandardMaterial color="#1e242c" roughness={0.7} />
      </mesh>
      {/* 窓 (枠・空・にじみ光) */}
      <group position={[0, winY, -gap + 0.04]}>
        <WindowUnit width={winW} height={winH} day={day} />
      </group>
      {/* 床の光だまり */}
      <group position={[0, 0, -gap]}>
        <SunPool width={winW * 1.9} length={gap + 2.5} day={day} strength={near ? 1 : 0.55} />
      </group>
      {/* 窓からの光 (棚と株の影を床に落とす) */}
      <directionalLight
        position={[0.6, winY + 1.2, -gap - 3]}
        intensity={(near ? 1 : 0.55) * (0.5 + sun * 2.2)}
        color="#dce8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={8}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
      />
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
        {/* 空からの回り込み + 床からの照り返しで、無光源部でも真っ黒に沈まないように */}
        <hemisphereLight args={["#8fa0b8", "#2f2c26", 0.75]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 8, 5]} intensity={0.55} />

        {/* 床 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[44, 44]} />
          <meshStandardMaterial color="#222a33" roughness={0.95} />
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
