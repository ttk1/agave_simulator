import { useEffect } from "react";
import { Collection } from "./components/Collection";
import { DaySummary } from "./components/DaySummary";
import { HelpModal } from "./components/HelpModal";
import { Hud } from "./components/Hud";
import { PlantPanel } from "./components/PlantPanel";
import { RoomView } from "./components/RoomView";
import { SettingsModal } from "./components/SettingsModal";
import { ShelfView } from "./components/ShelfView";
import { Shop } from "./components/Shop";
import { SowDialog } from "./components/SowDialog";
import { Toast } from "./components/Toast";
import { useGame } from "./game/store";

export function App() {
  const view = useGame((s) => s.view);
  const selectedPlantId = useGame((s) => s.selectedPlantId);

  // 2 回目以降の起動ではヘルプを自動表示しない
  useEffect(() => {
    if (useGame.getState().helpSeen) {
      useGame.setState({ showHelp: false });
    }
  }, []);

  // 現実の日付と同期: 起動時 + 1分ごとにチェック (日をまたいでも反映される)
  useEffect(() => {
    useGame.getState().syncRealDay();
    const t = setInterval(() => useGame.getState().syncRealDay(), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app">
      <Hud />
      <div className="main">
        <div className="content">
          {view === "room" && <RoomView />}
          {view === "shelf" && <ShelfView />}
          {view === "shop" && <Shop />}
          {view === "collection" && <Collection />}
        </div>
        {selectedPlantId && <PlantPanel />}
      </div>
      <SowDialog />
      <DaySummary />
      <SettingsModal />
      <HelpModal />
      <Toast />
    </div>
  );
}
