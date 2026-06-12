import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import type { Plant } from "../game/types";
import { plantRadius } from "./agaveGeometry";
import { AgaveMesh } from "./AgaveMesh";

/** 株 1 鉢をぐるぐる眺められるフォトビューア */
export function PlantViewer({ plant, height = 260 }: { plant: Plant; height?: number }) {
  const dist = useMemo(() => {
    const r = Math.max(0.6, plantRadius(plant.leafScale, plant.leaves));
    return r * 2.6 + 0.8;
  }, [plant]);

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", background: "linear-gradient(180deg,#1c2530,#10151c)" }}>
      <Canvas shadows camera={{ position: [dist * 0.8, dist * 0.55, dist * 0.8], fov: 40 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 6, 2]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#9db8ff" />
          <AgaveMesh plant={plant} />
          {/* 台座 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
            <circleGeometry args={[3.2, 32]} />
            <meshStandardMaterial color="#222a33" roughness={0.95} />
          </mesh>
          <OrbitControls
            enablePan={false}
            minDistance={0.8}
            maxDistance={dist * 2.2}
            target={[0, 0.5, 0]}
            autoRotate
            autoRotateSpeed={1.2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
