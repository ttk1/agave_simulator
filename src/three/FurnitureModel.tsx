import * as THREE from "three";
import type { FurnitureKind } from "../game/types";

/**
 * 飾り家具の 3D モデル (プリミティブ組み立て)。見た目だけで育成には影響しない。
 * 原点 = 設置マスの中心の床、rot 0 で正面が +Z (部屋の手前) を向く。
 * 1 マス (CELL=5.2) に収まるサイズで作る。
 */

const WOOD = "#8a6f4d";
const WOOD_DARK = "#63503a";
const FABRIC = "#5a6579";
const METAL = "#7c848e";

function Wood({ color = WOOD }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.75} />;
}

function Bed() {
  return (
    <group>
      {/* フレームとヘッドボード (奥 -Z 側が頭) */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[2.7, 0.44, 4.3]} />
        <Wood color={WOOD_DARK} />
      </mesh>
      <mesh position={[0, 0.85, -2.08]} castShadow>
        <boxGeometry args={[2.7, 1.0, 0.16]} />
        <Wood />
      </mesh>
      {/* マットレス・掛け布団・枕 */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[2.5, 0.26, 4.0]} />
        <meshStandardMaterial color="#d9d6cc" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.77, 0.65]} castShadow>
        <boxGeometry args={[2.56, 0.16, 2.6]} />
        <meshStandardMaterial color="#55708e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.82, -1.5]}>
        <boxGeometry args={[1.1, 0.18, 0.62]} />
        <meshStandardMaterial color="#eceade" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Chair({ z, flip }: { z: number; flip: boolean }) {
  // 背もたれは座面の -Z 側。flip=true で 180° 回して、座る側がテーブルを向くようにする
  return (
    <group position={[0, 0, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.72, 0.08, 0.72]} />
        <Wood />
      </mesh>
      <mesh position={[0, 1.05, -0.33]} castShadow>
        <boxGeometry args={[0.72, 0.85, 0.07]} />
        <Wood />
      </mesh>
      {[-0.3, 0.3].map((sx) =>
        [-0.3, 0.3].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx, 0.3, sz]}>
            <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
            <Wood color={WOOD_DARK} />
          </mesh>
        )),
      )}
    </group>
  );
}

function TableSet() {
  return (
    <group>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[2.8, 0.1, 1.7]} />
        <Wood />
      </mesh>
      {[-1.25, 1.25].map((sx) =>
        [-0.68, 0.68].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx, 0.51, sz]}>
            <cylinderGeometry args={[0.06, 0.06, 1.02, 10]} />
            <Wood color={WOOD_DARK} />
          </mesh>
        )),
      )}
      <Chair z={1.35} flip={true} />
      <Chair z={-1.35} flip={false} />
      {/* 卓上: 皿 2 枚・マグ・水差し */}
      {[-0.7, 0.7].map((sx) => (
        <mesh key={sx} position={[sx, 1.09, 0.3]}>
          <cylinderGeometry args={[0.24, 0.24, 0.035, 18]} />
          <meshStandardMaterial color="#e5e2d8" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.45, 1.15, -0.35]}>
        <cylinderGeometry args={[0.085, 0.075, 0.16, 12]} />
        <meshStandardMaterial color="#a7c0d8" roughness={0.5} />
      </mesh>
      <mesh position={[-0.15, 1.24, -0.35]}>
        <cylinderGeometry args={[0.1, 0.13, 0.34, 12]} />
        <meshStandardMaterial color="#c8cdd4" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

function Closet() {
  return (
    <group>
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[2.4, 3.4, 1.1]} />
        <Wood />
      </mesh>
      {/* 扉の合わせ目と取っ手 */}
      <mesh position={[0, 1.75, 0.556]}>
        <boxGeometry args={[0.03, 3.2, 0.01]} />
        <meshStandardMaterial color="#3a2f22" />
      </mesh>
      {[-0.14, 0.14].map((sx) => (
        <mesh key={sx} position={[sx, 1.7, 0.57]}>
          <cylinderGeometry args={[0.025, 0.025, 0.34, 8]} />
          <meshStandardMaterial color={METAL} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* 天板の縁 */}
      <mesh position={[0, 3.44, 0]}>
        <boxGeometry args={[2.5, 0.08, 1.2]} />
        <Wood color={WOOD_DARK} />
      </mesh>
    </group>
  );
}

function Desk() {
  return (
    <group>
      <mesh position={[0, 1.06, 0]} castShadow>
        <boxGeometry args={[3.0, 0.09, 1.5]} />
        <Wood />
      </mesh>
      {[-1.42, 1.42].map((sx) => (
        <mesh key={sx} position={[sx, 0.53, 0]} castShadow>
          <boxGeometry args={[0.08, 1.02, 1.4]} />
          <Wood color={WOOD_DARK} />
        </mesh>
      ))}
      {/* モニター (点いている) */}
      <group position={[0, 0, -0.35]}>
        <mesh position={[0, 1.13, 0]}>
          <boxGeometry args={[0.5, 0.05, 0.3]} />
          <meshStandardMaterial color="#2a2f36" />
        </mesh>
        <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.4, 8]} />
          <meshStandardMaterial color="#2a2f36" />
        </mesh>
        <mesh position={[0, 1.85, 0]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[1.55, 0.9, 0.06]} />
          <meshStandardMaterial color="#1b1f26" />
        </mesh>
        <mesh position={[0, 1.85, 0.035]} rotation={[-0.08, 0, 0]}>
          <planeGeometry args={[1.42, 0.78]} />
          <meshStandardMaterial color="#31465e" emissive="#4a7096" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>
      {/* キーボード・マウス */}
      <mesh position={[0, 1.13, 0.32]}>
        <boxGeometry args={[0.95, 0.04, 0.3]} />
        <meshStandardMaterial color="#3a4048" />
      </mesh>
      <mesh position={[0.68, 1.13, 0.35]}>
        <boxGeometry args={[0.14, 0.04, 0.2]} />
        <meshStandardMaterial color="#3a4048" />
      </mesh>
      {/* オフィスチェア */}
      <group position={[0, 0, 1.15]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.06, 5]} />
          <meshStandardMaterial color="#2f343b" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
          <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[0.78, 0.12, 0.72]} />
          <meshStandardMaterial color="#3d4552" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.3, 0.34]} castShadow>
          <boxGeometry args={[0.74, 1.0, 0.12]} />
          <meshStandardMaterial color="#3d4552" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

const BOOK_COLORS = ["#7a4a3a", "#3f5d52", "#54627e", "#8a7a44", "#6e4a62", "#4a6a78", "#94684a"];

function Bookshelf() {
  const rows = [0.55, 1.3, 2.05, 2.8];
  return (
    <group>
      {/* 背板・側板・天板・底板 */}
      <mesh position={[0, 1.6, -0.4]} castShadow>
        <boxGeometry args={[2.4, 3.2, 0.06]} />
        <Wood color={WOOD_DARK} />
      </mesh>
      {[-1.16, 1.16].map((sx) => (
        <mesh key={sx} position={[sx, 1.6, 0]} castShadow>
          <boxGeometry args={[0.08, 3.2, 0.86]} />
          <Wood />
        </mesh>
      ))}
      {[0.06, 3.16].map((sy) => (
        <mesh key={sy} position={[0, sy, 0]}>
          <boxGeometry args={[2.4, 0.08, 0.86]} />
          <Wood />
        </mesh>
      ))}
      {rows.map((y, ri) => (
        <group key={ri}>
          <mesh position={[0, y - 0.32, 0]}>
            <boxGeometry args={[2.24, 0.06, 0.8]} />
            <Wood />
          </mesh>
          {/* 本 (決め打ちの疑似ランダムで高さと色を変える) */}
          {Array.from({ length: 9 }, (_, i) => {
            const h = 0.46 + ((ri * 3 + i * 7) % 5) * 0.045;
            const w = 0.15 + ((ri + i * 3) % 3) * 0.035;
            const x = -0.95 + i * 0.226;
            // 一部を抜いて生活感を出す
            if ((ri * 5 + i) % 11 === 3) return null;
            return (
              <mesh key={i} position={[x, y - 0.29 + h / 2, -0.05]}>
                <boxGeometry args={[w, h, 0.56]} />
                <meshStandardMaterial color={BOOK_COLORS[(ri * 4 + i) % BOOK_COLORS.length]} roughness={0.85} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Sofa() {
  return (
    <group>
      <mesh position={[0, 0.3, 0.1]} castShadow>
        <boxGeometry args={[3.1, 0.55, 1.5]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.85, -0.62]} castShadow>
        <boxGeometry args={[3.1, 1.0, 0.4]} />
        <meshStandardMaterial color={FABRIC} roughness={0.95} />
      </mesh>
      {[-1.4, 1.4].map((sx) => (
        <mesh key={sx} position={[sx, 0.62, 0.05]} castShadow>
          <boxGeometry args={[0.32, 0.72, 1.45]} />
          <meshStandardMaterial color={FABRIC} roughness={0.95} />
        </mesh>
      ))}
      {[-0.64, 0.64].map((sx, i) => (
        <mesh key={sx} position={[sx, 0.66, 0.12]} castShadow>
          <boxGeometry args={[1.22, 0.2, 1.2]} />
          <meshStandardMaterial color={i === 0 ? "#67738a" : "#616d83"} roughness={0.95} />
        </mesh>
      ))}
      {/* クッション */}
      <mesh position={[-0.95, 0.95, -0.35]} rotation={[0.25, 0, 0.35]}>
        <boxGeometry args={[0.55, 0.55, 0.18]} />
        <meshStandardMaterial color="#a8865f" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.06, 16]} />
        <meshStandardMaterial color="#2f343b" />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.34, 8]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.28, 0.4, 0.5, 16, 1, true]} />
        <meshStandardMaterial
          color="#e2cfa4"
          emissive="#ffca7a"
          emissiveIntensity={0.55}
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </mesh>
      <pointLight position={[0, 2.3, 0]} intensity={1.1} distance={6} decay={1.8} color="#ffd9a0" />
    </group>
  );
}

export function FurnitureModel({ kind }: { kind: FurnitureKind }) {
  switch (kind) {
    case "bed":
      return <Bed />;
    case "tableSet":
      return <TableSet />;
    case "closet":
      return <Closet />;
    case "desk":
      return <Desk />;
    case "bookshelf":
      return <Bookshelf />;
    case "sofa":
      return <Sofa />;
    case "lamp":
      return <Lamp />;
  }
}
