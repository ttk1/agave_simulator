import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { Plant, Shelf } from "../game/types";
import { ShelfModel, shelfHeight, shelfWidth } from "./ShelfModel";

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

        <ShelfModel
          shelf={shelf}
          plants={plants}
          day={day}
          selectedPlantId={selectedPlantId}
          picking={picking}
          onSlotClick={onSlotClick}
        />

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
