import { LED_SPEC, SHELF_SPEC } from "../game/constants";
import { airflowAt } from "../game/environment";
import { useGame } from "../game/store";
import type { LedPower } from "../game/types";
import { ShelfScene } from "../three/ShelfScene";

export function ShelfView() {
  const shelves = useGame((s) => s.shelves);
  const activeShelfId = useGame((s) => s.activeShelfId);
  const plants = useGame((s) => s.plants);
  const selectedPlantId = useGame((s) => s.selectedPlantId);
  const movingPlantId = useGame((s) => s.movingPlantId);
  const inventory = useGame((s) => s.inventory);
  const openShelf = useGame((s) => s.openShelf);
  const setView = useGame((s) => s.setView);
  const selectPlant = useGame((s) => s.selectPlant);
  const startMove = useGame((s) => s.startMove);
  const movePlant = useGame((s) => s.movePlant);
  const setSowTarget = useGame((s) => s.setSowTarget);
  const installLed = useGame((s) => s.installLed);
  const uninstallLed = useGame((s) => s.uninstallLed);
  const setLedCol = useGame((s) => s.setLedCol);
  const toggleLed = useGame((s) => s.toggleLed);
  const removeShelf = useGame((s) => s.removeShelf);
  const benchFull = useGame((s) => s.bench.length >= 8);
  const growthSpeed = useGame((s) => s.settings.growthSpeed);
  const day = useGame((s) => s.day);
  const devices = useGame((s) => s.devices);

  const shelf = shelves.find((sh) => sh.id === activeShelfId) ?? shelves[0];
  if (!shelf) {
    return (
      <div>
        <h2>棚がありません</h2>
        <button onClick={() => setView("room")}>部屋に戻る</button>
      </div>
    );
  }

  const cols = SHELF_SPEC[shelf.kind].cols;
  const moving = movingPlantId ? plants[movingPlantId] : null;

  return (
    <div>
      <div className="row" style={{ marginBottom: "0.6rem" }}>
        <button onClick={() => setView("room")}>← 部屋</button>
        {shelves.map((sh) => (
          <button key={sh.id} className={sh.id === shelf.id ? "tab active" : "tab"} onClick={() => openShelf(sh.id)}>
            {sh.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="danger" onClick={() => removeShelf(shelf.id)}>
          棚を撤去
        </button>
      </div>

      {moving && (
        <div className="picking-banner">
          <span style={{ flex: 1 }}>↔️ {moving.name} の移動先スロットをクリック (他の棚タブへ切替も可)</span>
          <button disabled={benchFull} onClick={() => movePlant(moving.id, "bench")}>
            🛠️ 作業台へ置く
          </button>
          <button onClick={() => startMove(null)}>キャンセル</button>
        </div>
      )}

      <div className="shelf-canvas">
        <ShelfScene
          shelf={shelf}
          plants={plants}
          day={day}
          selectedPlantId={selectedPlantId}
          picking={!!movingPlantId}
          onSlotClick={(level, col, pid) => {
            if (movingPlantId) {
              if (!pid) movePlant(movingPlantId, { shelfId: shelf.id, level, col });
              return;
            }
            if (pid) {
              selectPlant(pid);
            } else {
              setSowTarget({ shelfId: shelf.id, level, col });
            }
          }}
        />
      </div>
      <div className="muted" style={{ marginTop: "0.45rem" }}>
        ドラッグで回転 / ホイールでズーム。空きスロットをクリックで種まき、株をクリックで詳細。床の色はその場所の光量。
        {devices.circulator && (
          <span>
            {" "}
            {airflowAt(devices, shelf.x, shelf.y)
              ? "🌀 サーキュレーターの風が届いている (蒸れ・害虫を抑制)"
              : "💨 この棚にはサーキュレーターの風が届いていない"}
          </span>
        )}
      </div>

      <h3>💡 各段の LED ライト</h3>
      {/* 3D の見た目に合わせて上の段から並べる (li=0 が最下段) */}
      {shelf.levels
        .map((lv, li) => ({ lv, li }))
        .reverse()
        .map(({ lv, li }) => (
        <div className="led-row" key={li}>
          <strong className="led-label">
            {li + 1}段目{li === shelf.levels.length - 1 ? " (上)" : li === 0 ? " (下)" : ""}
          </strong>
          {lv.led ? (
            <>
              <span>{LED_SPEC[lv.led.power].name}</span>
              <button onClick={() => toggleLed(shelf.id, li)}>{lv.led.on ? "💡 ON" : "⚫ OFF"}</button>
              <label className="opt">
                位置
                <input
                  type="range"
                  min={0}
                  max={cols - 1}
                  step={1}
                  value={lv.led.col}
                  onChange={(e) => setLedCol(shelf.id, li, Number(e.target.value))}
                />
                列{lv.led.col + 1}
              </label>
              <span className="muted">電気代 ¥{Math.round(LED_SPEC[lv.led.power].elecPerDay * growthSpeed)}/日</span>
              <button onClick={() => uninstallLed(shelf.id, li)}>取り外す</button>
            </>
          ) : (
            <>
              <span className="muted">LED なし — 取り付け:</span>
              {([1, 2, 3] as LedPower[]).map((pw) => (
                <button key={pw} disabled={inventory.leds[pw] <= 0} onClick={() => installLed(shelf.id, li, pw)}>
                  {LED_SPEC[pw].name.replace("LEDライト ", "")} (在庫{inventory.leds[pw]})
                </button>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
