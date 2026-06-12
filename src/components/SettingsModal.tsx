import { GROWTH_SPEED_OPTIONS } from "../game/constants";
import { useGame } from "../game/store";

export function SettingsModal() {
  const showSettings = useGame((s) => s.showSettings);
  const setShowSettings = useGame((s) => s.setShowSettings);
  const settings = useGame((s) => s.settings);
  const setGrowthSpeed = useGame((s) => s.setGrowthSpeed);

  if (!showSettings) return null;

  return (
    <div className="modal-bg" onClick={() => setShowSettings(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 設定</h2>

        <h3>🌱 成長速度</h3>
        <p className="muted">1日あたりの成長量の倍率。いつでも変更でき、変更後の日送りから反映される。</p>
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

        <div style={{ textAlign: "right", marginTop: "0.85rem" }}>
          <button className="primary" onClick={() => setShowSettings(false)}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
