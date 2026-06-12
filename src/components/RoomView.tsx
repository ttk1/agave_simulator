import { DEVICE_SPEC, ROOM_COLS, ROOM_ROWS, SHELF_SPEC } from "../game/constants";
import { useGame } from "../game/store";
import type { Shelf } from "../game/types";

function ShelfCard({ shelf }: { shelf: Shelf }) {
  const openShelf = useGame((s) => s.openShelf);
  const plants = useGame((s) => s.plants);
  const count = shelf.levels.reduce((a, lv) => a + lv.slots.filter(Boolean).length, 0);
  const leds = shelf.levels.filter((lv) => lv.led).length;
  const alerts = shelf.levels
    .flatMap((lv) => lv.slots)
    .filter((pid): pid is string => !!pid)
    .map((pid) => plants[pid])
    .filter((p) => p && (p.pest || p.rot > 0.5 || p.health < 40)).length;

  return (
    <div className="shelf-card" onClick={() => openShelf(shelf.id)} title={SHELF_SPEC[shelf.kind].name}>
      <div className="icon">{shelf.kind === "large" ? "🗄️" : "🪜"}</div>
      <div className="name">{shelf.name}</div>
      <div className="count">
        🪴 {count} ／ 💡 {leds}
        {alerts > 0 && <span style={{ color: "var(--danger)" }}> ⚠️{alerts}</span>}
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

  const shelfAt = (x: number, y: number) => shelves.find((sh) => sh.x === x && sh.y === y);

  return (
    <div>
      <div className="view-head">
        <h2>🏠 育成部屋のレイアウト</h2>
        <span className="muted">棚をクリックで中を見る。棚の配置はあなた次第</span>
      </div>
      {placingShelf && (
        <div className="picking-banner">
          <span>
            📦 {SHELF_SPEC[placingShelf].name} を置く場所をクリック
          </span>
          <button onClick={() => setPlacingShelf(null)}>キャンセル</button>
        </div>
      )}

      <div className="room-grid" style={{ gridTemplateColumns: `repeat(${ROOM_COLS}, 1fr)` }}>
        {Array.from({ length: ROOM_ROWS }).map((_, y) =>
          Array.from({ length: ROOM_COLS }).map((_, x) => {
            const shelf = shelfAt(x, y);
            const placeable = !!placingShelf && !shelf;
            return (
              <div
                key={`${x}-${y}`}
                className={`room-cell${placeable ? " placeable" : ""}`}
                onClick={() => {
                  if (placeable && placingShelf) placeShelf(placingShelf, x, y);
                }}
              >
                {shelf ? <ShelfCard shelf={shelf} /> : placeable ? <span className="muted">＋</span> : null}
              </div>
            );
          }),
        )}
      </div>

      <div className="cards-row">
        <div className="card">
          <h3>📦 未設置の棚</h3>
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
          {inventory.shelves.small + inventory.shelves.large === 0 && (
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
              <span style={{ flex: 1 }}>🌀 {DEVICE_SPEC.circulator.name}</span>
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
