import { useState } from "react";
import { DEVICE_SPEC, FURNITURE_SPEC, ROOM_COLS, ROOM_ROWS, SHELF_SPEC, WINDOW_X } from "../game/constants";
import { airflowAt, circulatorPos } from "../game/environment";
import { useGame } from "../game/store";
import type { Furniture, FurnitureKind, Shelf } from "../game/types";
import { RoomScene } from "../three/RoomScene";

/** 棚の正面が向いている方角 (rot 0 = 南/手前) */
const ROT_ARROW = ["↓", "←", "↑", "→"];

function ShelfCard({ shelf }: { shelf: Shelf }) {
  const openShelf = useGame((s) => s.openShelf);
  const plants = useGame((s) => s.plants);
  const rotateShelf = useGame((s) => s.rotateShelf);
  const startMoveShelf = useGame((s) => s.startMoveShelf);
  const devices = useGame((s) => s.devices);
  const movingCirculator = useGame((s) => s.movingCirculator);
  const placingFurniture = useGame((s) => s.placingFurniture);
  const movingFurnitureId = useGame((s) => s.movingFurnitureId);
  const count = shelf.levels.reduce((a, lv) => a + lv.slots.filter(Boolean).length, 0);
  const leds = shelf.levels.filter((lv) => lv.led).length;
  const windy = airflowAt(devices, shelf.x, shelf.y);
  const alerts = shelf.levels
    .flatMap((lv) => lv.slots)
    .filter((pid): pid is string => !!pid)
    .map((pid) => plants[pid])
    .filter((p) => p && (p.pest || p.rot > 0.5 || p.health < 40)).length;

  return (
    <div
      className="shelf-card"
      onClick={() => {
        // 設備・家具の設置マス選択中はマス側のクリックに任せる (誤って棚画面へ飛ばない)
        if (!movingCirculator && !placingFurniture && !movingFurnitureId) openShelf(shelf.id);
      }}
      title={SHELF_SPEC[shelf.kind].name}
    >
      <div className="icon">{shelf.kind === "large" ? "🗄️" : "🪜"}</div>
      <div className="name">{shelf.name}</div>
      <div className="count">
        🪴 {count} ／ 💡 {leds}
        {windy && <span title="サーキュレーターの風が届いている"> 🌀</span>}
        {alerts > 0 && <span style={{ color: "var(--danger)" }}> ⚠️{alerts}</span>}
      </div>
      <div className="row" style={{ gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
        <button className="mini" title="移動" onClick={() => startMoveShelf(shelf.id)}>
          ✥ 移動
        </button>
        <button
          className="mini"
          title={`90°回転。正面の向き ${ROT_ARROW[shelf.rot ?? 0]}`}
          onClick={() => rotateShelf(shelf.id)}
        >
          ↻ {ROT_ARROW[shelf.rot ?? 0]}
        </button>
      </div>
    </div>
  );
}

function FurnitureCard({ furn }: { furn: Furniture }) {
  const startMoveFurniture = useGame((s) => s.startMoveFurniture);
  const rotateFurniture = useGame((s) => s.rotateFurniture);
  const removeFurniture = useGame((s) => s.removeFurniture);
  const spec = FURNITURE_SPEC[furn.kind];
  return (
    <div className="shelf-card furn" title={spec.desc}>
      <div className="icon">{spec.icon}</div>
      <div className="name">{spec.name}</div>
      <div className="row" style={{ gap: "0.25rem" }} onClick={(e) => e.stopPropagation()}>
        <button className="mini" title="移動" onClick={() => startMoveFurniture(furn.id)}>
          ✥
        </button>
        <button
          className="mini"
          title={`90°回転。正面の向き ${ROT_ARROW[furn.rot ?? 0]}`}
          onClick={() => rotateFurniture(furn.id)}
        >
          ↻ {ROT_ARROW[furn.rot ?? 0]}
        </button>
        <button className="mini" title="片付ける (在庫に戻す)" onClick={() => removeFurniture(furn.id)}>
          🧺
        </button>
      </div>
    </div>
  );
}

export function RoomView() {
  const shelves = useGame((s) => s.shelves);
  const inventory = useGame((s) => s.inventory);
  const devices = useGame((s) => s.devices);
  const placingShelf = useGame((s) => s.placingShelf);
  const setPlacingShelf = useGame((s) => s.setPlacingShelf);
  const placeShelf = useGame((s) => s.placeShelf);
  const toggleDevice = useGame((s) => s.toggleDevice);
  const bench = useGame((s) => s.bench);
  const plants = useGame((s) => s.plants);
  const selectPlant = useGame((s) => s.selectPlant);
  const setView = useGame((s) => s.setView);
  const openShelf = useGame((s) => s.openShelf);
  const day = useGame((s) => s.day);
  const movingShelfId = useGame((s) => s.movingShelfId);
  const startMoveShelf = useGame((s) => s.startMoveShelf);
  const moveShelf = useGame((s) => s.moveShelf);
  const movingCirculator = useGame((s) => s.movingCirculator);
  const startMoveCirculator = useGame((s) => s.startMoveCirculator);
  const placeCirculator = useGame((s) => s.placeCirculator);
  const furniture = useGame((s) => s.furniture);
  const placingFurniture = useGame((s) => s.placingFurniture);
  const setPlacingFurniture = useGame((s) => s.setPlacingFurniture);
  const placeFurniture = useGame((s) => s.placeFurniture);
  const movingFurnitureId = useGame((s) => s.movingFurnitureId);
  const startMoveFurniture = useGame((s) => s.startMoveFurniture);
  const moveFurniture = useGame((s) => s.moveFurniture);
  const [mode3d, setMode3d] = useState(false);
  const movingShelf = movingShelfId ? shelves.find((sh) => sh.id === movingShelfId) : null;
  const movingFurn = movingFurnitureId ? furniture.find((f) => f.id === movingFurnitureId) : null;
  const circPos = devices.circulator ? circulatorPos(devices) : null;
  const furnInv = inventory.furniture ?? {};
  const ownedFurnKinds = (Object.keys(FURNITURE_SPEC) as FurnitureKind[]).filter((k) => (furnInv[k] ?? 0) > 0);

  const shelfAt = (x: number, y: number) => shelves.find((sh) => sh.x === x && sh.y === y);
  const furnAt = (x: number, y: number) => furniture.find((f) => f.x === x && f.y === y);

  return (
    <div>
      <div className="view-head">
        <h2>🏠 育成部屋</h2>
        <button className={!mode3d ? "tab active" : "tab"} onClick={() => setMode3d(false)}>
          🗺️ レイアウト
        </button>
        <button className={mode3d ? "tab active" : "tab"} onClick={() => setMode3d(true)}>
          📷 3Dビュー
        </button>
        <span className="muted">
          {mode3d ? "ドラッグで回転 / ホイールでズーム。棚をクリックで中を見る" : "窓際の棚は自然光ボーナスで電気代を節約できる"}
        </span>
      </div>
      {placingShelf && (
        <div className="picking-banner">
          <span>
            📦 {SHELF_SPEC[placingShelf].name} を置く場所をクリック
          </span>
          <button onClick={() => setPlacingShelf(null)}>キャンセル</button>
        </div>
      )}
      {movingShelf && (
        <div className="picking-banner">
          <span>✥ {movingShelf.name} の移動先のマスをクリック</span>
          <button onClick={() => startMoveShelf(null)}>キャンセル</button>
        </div>
      )}
      {movingCirculator && (
        <div className="picking-banner">
          <span>🌀 サーキュレーターを置くマスをクリック (棚と同じマスにも置ける。風は周囲8マスまで)</span>
          <button onClick={() => startMoveCirculator(false)}>キャンセル</button>
        </div>
      )}
      {placingFurniture && (
        <div className="picking-banner">
          <span>
            {FURNITURE_SPEC[placingFurniture].icon} {FURNITURE_SPEC[placingFurniture].name} を置く空きマスをクリック
          </span>
          <button onClick={() => setPlacingFurniture(null)}>キャンセル</button>
        </div>
      )}
      {movingFurn && (
        <div className="picking-banner">
          <span>✥ {FURNITURE_SPEC[movingFurn.kind].name} の移動先の空きマスをクリック</span>
          <button onClick={() => startMoveFurniture(null)}>キャンセル</button>
        </div>
      )}

      {mode3d ? (
        <div className="shelf-canvas">
          <RoomScene
            shelves={shelves}
            plants={plants}
            day={day}
            devices={devices}
            furniture={furniture}
            onShelfClick={(id) => openShelf(id)}
          />
        </div>
      ) : (
        <>
          {/* 北壁の窓の位置 */}
          <div className="window-row" style={{ gridTemplateColumns: `repeat(${ROOM_COLS}, 1fr)` }}>
            {Array.from({ length: ROOM_COLS }).map((_, x) => (
              <div key={x} className={x >= WINDOW_X[0] && x <= WINDOW_X[1] ? "window-mark" : "wall-mark"}>
                {x === WINDOW_X[0] && "🪟 窓 (自然光)"}
              </div>
            ))}
          </div>
          <div className="room-grid" style={{ gridTemplateColumns: `repeat(${ROOM_COLS}, 1fr)` }}>
            {Array.from({ length: ROOM_ROWS }).map((_, y) =>
              Array.from({ length: ROOM_COLS }).map((_, x) => {
                const shelf = shelfAt(x, y);
                const furn = furnAt(x, y);
                const cellFree = !shelf && !furn;
                const placeable =
                  movingCirculator ||
                  ((!!placingShelf || !!movingShelfId || !!placingFurniture || !!movingFurnitureId) && cellFree);
                const windy = airflowAt(devices, x, y);
                const isCirc = !!circPos && circPos.x === x && circPos.y === y;
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`room-cell${placeable ? " placeable" : ""}${windy ? " windy" : ""}`}
                    onClick={() => {
                      if (movingCirculator) placeCirculator(x, y);
                      else if (cellFree && placingShelf) placeShelf(placingShelf, x, y);
                      else if (cellFree && movingShelfId) moveShelf(movingShelfId, x, y);
                      else if (cellFree && placingFurniture) placeFurniture(placingFurniture, x, y);
                      else if (cellFree && movingFurnitureId) moveFurniture(movingFurnitureId, x, y);
                    }}
                  >
                    {isCirc && (
                      <span
                        className={`circ-badge${devices.circulatorOn ? "" : " off"}`}
                        title={`サーキュレーター (${devices.circulatorOn ? "稼働中" : "停止中"})`}
                      >
                        🌀
                      </span>
                    )}
                    {shelf ? (
                      <ShelfCard shelf={shelf} />
                    ) : furn ? (
                      <FurnitureCard furn={furn} />
                    ) : placeable ? (
                      <span className="muted">＋</span>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>
        </>
      )}

      <div className="cards-row">
        <div className="card">
          <h3>📦 未設置の棚・家具</h3>
          {(Object.keys(SHELF_SPEC) as Array<keyof typeof SHELF_SPEC>).map((kind) => (
            <div className="row" key={kind} style={{ marginBottom: "0.45rem" }}>
              <span style={{ flex: 1 }}>
                {SHELF_SPEC[kind].name} × {inventory.shelves[kind]}
              </span>
              <button
                disabled={inventory.shelves[kind] <= 0 || placingShelf === kind}
                onClick={() => setPlacingShelf(kind)}
              >
                設置する
              </button>
            </div>
          ))}
          {ownedFurnKinds.map((kind) => (
            <div className="row" key={kind} style={{ marginBottom: "0.45rem" }}>
              <span style={{ flex: 1 }}>
                {FURNITURE_SPEC[kind].icon} {FURNITURE_SPEC[kind].name} × {furnInv[kind]}
              </span>
              <button disabled={placingFurniture === kind} onClick={() => setPlacingFurniture(kind)}>
                設置する
              </button>
            </div>
          ))}
          {inventory.shelves.small + inventory.shelves.large === 0 && ownedFurnKinds.length === 0 && (
            <div className="muted">在庫なし。ショップで購入しよう</div>
          )}
        </div>

        <div className="card">
          <h3>⚙️ 環境設備</h3>
          {devices.heater ? (
            <div className="row" style={{ marginBottom: "0.45rem" }}>
              <span style={{ flex: 1 }}>🔥 {DEVICE_SPEC.heater.name}</span>
              <button onClick={() => toggleDevice("heaterOn")}>{devices.heaterOn ? "ON" : "OFF"}</button>
            </div>
          ) : (
            <div className="muted">🔥 ヒーター未所持 (冬の保温に)</div>
          )}
          {devices.circulator ? (
            <div className="row" style={{ marginBottom: "0.45rem" }}>
              <span style={{ flex: 1 }}>
                🌀 {DEVICE_SPEC.circulator.name}
                <span className="muted" style={{ fontSize: "0.78rem" }}> — 風は周囲8マスまで</span>
              </span>
              <button className="mini" onClick={() => startMoveCirculator(true)}>
                ✥ 移動
              </button>
              <button onClick={() => toggleDevice("circulatorOn")}>{devices.circulatorOn ? "ON" : "OFF"}</button>
            </div>
          ) : (
            <div className="muted">🌀 サーキュレーター未所持 (蒸れ・害虫対策)</div>
          )}
          {devices.aircon ? (
            <div className="row">
              <span style={{ flex: 1 }}>❄️ {DEVICE_SPEC.aircon.name}</span>
              <button onClick={() => toggleDevice("airconOn")}>{devices.airconOn ? "ON" : "OFF"}</button>
            </div>
          ) : (
            <div className="muted">❄️ エアコン未所持 (夏の高温・LED発熱対策)</div>
          )}
        </div>

        <div className="card">
          <h3>🛠️ 作業台 ({bench.length}/8)</h3>
          {bench.length === 0 && <div className="muted">棚に置いていない株はここに並ぶ (光がほぼ当たらない)</div>}
          <div className="row">
            {bench.map((pid) => {
              const p = plants[pid];
              if (!p) return null;
              return (
                <button key={pid} onClick={() => selectPlant(pid)}>
                  🪴 {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {shelves.length === 0 && (
        <div className="card" style={{ marginTop: "0.85rem" }}>
          棚がありません。<button onClick={() => setView("shop")}>ショップで棚を買う</button>
        </div>
      )}
    </div>
  );
}
