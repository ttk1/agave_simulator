import { GROWTH_SPEED_OPTIONS } from "../game/constants";
import { isLocalEnv } from "../game/debug";
import { useGame } from "../game/store";

export function SettingsModal() {
  const showSettings = useGame((s) => s.showSettings);
  const setShowSettings = useGame((s) => s.setShowSettings);
  const settings = useGame((s) => s.settings);
  const setGrowthSpeed = useGame((s) => s.setGrowthSpeed);
  const setDebugMode = useGame((s) => s.setDebugMode);
  const debugAddMoney = useGame((s) => s.debugAddMoney);
  const debugAddItems = useGame((s) => s.debugAddItems);

  if (!showSettings) return null;

  return (
    <div className="modal-bg" onClick={() => setShowSettings(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 設定</h2>

        <h3>🌱 成長速度</h3>
        <p className="muted">
          1日あたりの成長量の倍率。いつでも変更でき、変更後の日送りから反映される。
          電気代・肥料の消費・発芽日数も同じ倍率で進むため、
          <strong>1株あたりの育成コストは速度によらず一定</strong> — 純粋にペースの好みで選んで OK。
        </p>
        {GROWTH_SPEED_OPTIONS.map((opt) => (
          <label
            className="opt"
            key={opt.value}
            style={{
              padding: "0.4rem 0.5rem",
              borderRadius: "0.55rem",
              background: settings.growthSpeed === opt.value ? "#102a40" : "transparent",
            }}
          >
            <input
              type="radio"
              name="growthSpeed"
              checked={settings.growthSpeed === opt.value}
              onChange={() => setGrowthSpeed(opt.value)}
            />
            <strong style={{ width: "5.5rem" }}>
              {opt.label} ×{opt.value}
            </strong>
            <span className="muted">{opt.desc}</span>
          </label>
        ))}

        <h3>⏰ 時間の進み方</h3>
        <div className="report-line">
          🗓️ 現実の日付が変わると、ゲーム内も自動で同じ日数だけ進む (起動していなかった期間もまとめて経過)。
        </div>
        <div className="report-line">🌙 待ちきれないときは「次の日へ」ボタンでいつでも先に進められる。</div>

        {isLocalEnv() && (
          <>
            <h3>🛠 デバッグモード</h3>
            <p className="muted">
              動作確認用。ローカルで立てているときだけこの設定が表示される (公開ページには出ない)。
            </p>
            <label className="opt" style={{ padding: "0.4rem 0.5rem" }}>
              <input
                type="checkbox"
                checked={!!settings.debug}
                onChange={(e) => setDebugMode(e.target.checked)}
              />
              <strong>デバッグモードを有効にする</strong>
              <span className="muted">資金・アイテムを好きなだけ追加できる</span>
            </label>
            {settings.debug && (
              <div className="row" style={{ marginTop: "0.45rem", gap: "0.45rem" }}>
                <button onClick={debugAddMoney}>💰 +¥1,000,000</button>
                <button onClick={debugAddItems}>📦 全アイテム追加 (種・鉢・土・肥料・LED・棚・家具)</button>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: "right", marginTop: "0.85rem" }}>
          <button className="primary" onClick={() => setShowSettings(false)}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
