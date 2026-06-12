import { fmtMoney } from "../game/economy";
import { dateLabel } from "../game/environment";
import { useGame } from "../game/store";

export function DaySummary() {
  const report = useGame((s) => s.report);
  const showReport = useGame((s) => s.showReport);
  const closeReport = useGame((s) => s.closeReport);

  if (!showReport || !report) return null;
  const days = report.days ?? 1;

  return (
    <div className="modal-bg" onClick={closeReport}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          {days > 1
            ? `🗓️ おかえりなさい！ ${days}日が経過 (${dateLabel(report.day)} 〜)`
            : `🌙 ${dateLabel(report.day)} の夜`}
        </h2>
        {report.lines.length === 0 ? (
          <div className="report-line">
            {days > 1 ? "留守の間、植物たちは静かに育っていた…" : "穏やかな一日だった。植物たちは静かに育っている…"}
          </div>
        ) : (
          report.lines.map((l, i) => (
            <div className="report-line" key={i}>
              {l}
            </div>
          ))
        )}
        <div className="report-line" style={{ marginTop: "0.7rem" }}>
          ⚡ 電気代: <strong>{fmtMoney(report.electricity)}</strong>
        </div>
        <div style={{ textAlign: "right", marginTop: "0.85rem" }}>
          <button className="primary" onClick={closeReport}>
            朝になった ☀️
          </button>
        </div>
      </div>
    </div>
  );
}
