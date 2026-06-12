import { SPECIES, TIER_LABEL } from "../game/constants";
import { fmtMoney } from "../game/economy";
import { qualityStars } from "../game/genetics";
import { useGame } from "../game/store";

export function Collection() {
  const collection = useGame((s) => s.collection);
  const totalEarned = useGame((s) => s.totalEarned);
  const totalDaysPlayed = useGame((s) => s.totalDaysPlayed);
  const resetGame = useGame((s) => s.resetGame);

  return (
    <div>
      <div className="view-head">
        <h2>📖 図鑑・実績</h2>
        <span className="muted">育成株サイズまで育てた品種が登録される</span>
      </div>
      <div className="card">
        <div className="row" style={{ gap: "1.7rem" }}>
          <span>
            ⏳ プレイ日数: <strong>{totalDaysPlayed} 日</strong>
          </span>
          <span>
            💰 累計売上: <strong style={{ color: "var(--gold)" }}>{fmtMoney(totalEarned)}</strong>
          </span>
        </div>
      </div>

      <div className="collection-grid">
        {SPECIES.map((sp) => {
          const e = collection[sp.id];
          return (
            <div className="card" key={sp.id} style={{ opacity: e ? 1 : 0.55 }}>
              <div style={{ fontWeight: 700 }}>
                {e ? sp.name : "？？？"} <span className={`badge ${sp.tier}`}>{TIER_LABEL[sp.tier]}</span>
              </div>
              <div className="muted">{e ? sp.latin : "育成株まで育てると登録される"}</div>
              {e && (
                <div style={{ marginTop: "0.45rem", fontSize: "0.86rem" }}>
                  <div>育成: {e.grown} 株 ／ 販売: {e.sold} 株</div>
                  <div>最高査定: {e.bestPrice > 0 ? fmtMoney(e.bestPrice) : "—"}</div>
                  <div>最高個体: {qualityStars(e.bestQuality)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: "1.1rem" }}>
        <h3>⚠️ データ</h3>
        <p className="muted">セーブデータはこのブラウザの localStorage に自動保存される。</p>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm("本当に最初からやり直す？ セーブデータは消える")) resetGame();
          }}
        >
          ゲームをリセット
        </button>
      </div>
    </div>
  );
}
