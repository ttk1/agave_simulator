import { fmtMoney } from "../game/economy";
import { dateLabel } from "../game/environment";
import { useGame } from "../game/store";

export function DaySummary() {
  const report = useGame((s) => s.report);
  const showReport = useGame((s) => s.showReport);
  const closeReport = useGame((s) => s.closeReport);

  if (!showReport || !report) return null;

  return (
    <div className="modal-bg" onClick={closeReport}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🌙 {dateLabel(report.day)} の夜</h2>
        {report.lines.length === 0 ? (
          <div className="report-line">穏やかな一日だった。植物たちは静かに育っている…</div>
        ) : (
          report.lines.map((l, i) => (
            <div className="report-line" key={i}>
              {l}
            </div>
          ))
        )}
        <div className="report-line" style={{ marginTop: 10 }}>
          ⚡ 電気代: <strong>{fmtMoney(report.electricity)}</strong>
        </div>
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <button className="primary" onClick={closeReport}>
            朝になった ☀️
          </button>
        </div>
      </div>
    </div>
  );
}
