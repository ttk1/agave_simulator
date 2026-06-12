import { useMemo, useState } from "react";
import { POT_SPEC, SOIL_SPEC, SPECIES_MAP } from "../game/constants";
import { useGame } from "../game/store";
import type { PotSize, SoilType } from "../game/types";

export function SowDialog() {
  const sowTarget = useGame((s) => s.sowTarget);
  const setSowTarget = useGame((s) => s.setSowTarget);
  const inventory = useGame((s) => s.inventory);
  const sow = useGame((s) => s.sow);
  const setView = useGame((s) => s.setView);

  const seedIds = useMemo(
    () => Object.keys(inventory.seeds).filter((id) => (inventory.seeds[id] ?? 0) > 0),
    [inventory.seeds],
  );
  const [species, setSpecies] = useState<string>("");
  const [pot, setPot] = useState<PotSize>(1);
  const [soil, setSoil] = useState<SoilType>("akadama");
  const [fert, setFert] = useState(false);

  if (!sowTarget) return null;
  const chosen = species && seedIds.includes(species) ? species : seedIds[0] ?? "";

  return (
    <div className="modal-bg" onClick={() => setSowTarget(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🌰 種をまく</h2>
        {seedIds.length === 0 ? (
          <>
            <p className="muted">種を持っていない。</p>
            <button
              className="primary"
              onClick={() => {
                setSowTarget(null);
                setView("shop");
              }}
            >
              ショップで種を買う
            </button>
          </>
        ) : (
          <>
            <h3>品種 (種)</h3>
            <div className="row">
              {seedIds.map((id) => (
                <button key={id} className={chosen === id ? "tab active" : ""} onClick={() => setSpecies(id)}>
                  {SPECIES_MAP[id].name} ×{inventory.seeds[id]}
                </button>
              ))}
            </div>
            <h3>鉢</h3>
            <div className="row">
              {([1, 2, 3] as PotSize[]).map((s) => (
                <button
                  key={s}
                  className={pot === s ? "tab active" : ""}
                  disabled={inventory.pots[s] <= 0}
                  onClick={() => setPot(s)}
                >
                  {POT_SPEC[s].name} ×{inventory.pots[s]}
                </button>
              ))}
            </div>
            <h3>土</h3>
            <div className="row">
              {(Object.keys(SOIL_SPEC) as SoilType[]).map((s) => (
                <button
                  key={s}
                  className={soil === s ? "tab active" : ""}
                  disabled={inventory.soil[s] <= 0}
                  onClick={() => setSoil(s)}
                  title={SOIL_SPEC[s].desc}
                >
                  {SOIL_SPEC[s].name} ×{inventory.soil[s]}
                </button>
              ))}
            </div>
            <div style={{ marginTop: "0.7rem" }}>
              <label className="opt">
                <input type="checkbox" checked={fert} onChange={(e) => setFert(e.target.checked)} />
                元肥を入れる (在庫{inventory.baseFert}) — 60日間成長アップ
              </label>
            </div>
            <p className="muted">発芽には保湿 (水分 30%以上) と 17°C 以上が必要。発芽までは毎日様子を見よう。</p>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button onClick={() => setSowTarget(null)}>キャンセル</button>
              <button className="primary" disabled={!chosen} onClick={() => sow(chosen, sowTarget, pot, soil, fert)}>
                まく
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
