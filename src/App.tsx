import { useEffect } from "react";
import { Collection } from "./components/Collection";
import { DaySummary } from "./components/DaySummary";
import { HelpModal } from "./components/HelpModal";
import { Hud } from "./components/Hud";
import { PlantPanel } from "./components/PlantPanel";
import { RoomView } from "./components/RoomView";
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
      <HelpModal />
      <Toast />
    </div>
  );
}
