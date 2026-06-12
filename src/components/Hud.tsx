import { DAY_MINUTES } from "../game/constants";
import { fmtMoney } from "../game/economy";
import { dateLabel, ledHeat, roomHumidity, roomTemp, SEASON_LABEL, seasonOf } from "../game/environment";
import { useGame } from "../game/store";

export function Hud() {
  const day = useGame((s) => s.day);
  const money = useGame((s) => s.money);
  const timeLeft = useGame((s) => s.timeLeft);
  const market = useGame((s) => s.market);
  const devices = useGame((s) => s.devices);
  const shelves = useGame((s) => s.shelves);
  const view = useGame((s) => s.view);
  const setView = useGame((s) => s.setView);
  const nextDay = useGame((s) => s.nextDay);
  const setShowHelp = useGame((s) => s.setShowHelp);

  const temp = roomTemp(day, devices, shelves);
  const heat = ledHeat(shelves);
  const hum = Math.round(roomHumidity(day) * 100);

  return (
    <div className="hud">
      <span className="logo">🪴 AGAVE LIFE</span>
      <div className="stat">
        <span className="label">日付</span>
        <span className="value">
          {dateLabel(day)} ({SEASON_LABEL[seasonOf(day)]})
        </span>
      </div>
      <div className="stat">
        <span className="label">所持金</span>
        <span className="value money">{fmtMoney(money)}</span>
      </div>
      <div className="stat">
        <span className="label">
          室温 / 湿度{heat > 0 ? ` (LED発熱 +${heat.toFixed(1)}°C)` : ""}
        </span>
        <span className="value">
          {temp}°C{devices.aircon && devices.airconOn ? " ❄️" : ""} / {hum}%
        </span>
      </div>
      <div className="stat">
        <span className="label">相場</span>
        <span className="value" style={{ color: market >= 1.1 ? "#37c978" : market <= 0.9 ? "#ef5350" : undefined }}>
          ×{market.toFixed(2)}
        </span>
      </div>
      <div className="stat" style={{ minWidth: 140 }}>
        <span className="label">
          残り時間 {Math.floor(timeLeft / 60)}h{String(timeLeft % 60).padStart(2, "0")}m
        </span>
        <div className="timebar">
          <div style={{ width: `${(timeLeft / DAY_MINUTES) * 100}%` }} />
        </div>
      </div>
      <div className="spacer" />
      <button className={view === "room" ? "tab active" : "tab"} onClick={() => setView("room")}>
        🏠 部屋
      </button>
      <button className={view === "shop" ? "tab active" : "tab"} onClick={() => setView("shop")}>
        🛒 ショップ
      </button>
      <button className={view === "collection" ? "tab active" : "tab"} onClick={() => setView("collection")}>
        📖 図鑑
      </button>
      <button onClick={() => setShowHelp(true)}>❓</button>
      <button className="primary" onClick={nextDay}>
        🌙 次の日へ
      </button>
    </div>
  );
}
