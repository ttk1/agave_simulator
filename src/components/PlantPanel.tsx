import { useMemo, useState } from "react";
import { POT_SPEC, SOIL_SPEC, SPECIES_MAP, TIER_LABEL } from "../game/constants";
import { fmtMoney, salePrice } from "../game/economy";
import { lightLabel, roomTemp, slotLight } from "../game/environment";
import { formQuality, qualityStars } from "../game/genetics";
import { useGame } from "../game/store";
import { buildPlacement } from "../game/simulation";
import type { PotSize, SoilType } from "../game/types";
import { PlantViewer } from "../three/PlantViewer";

function Bar({ name, value, color, label }: { name: string; value: number; color: string; label?: string }) {
  return (
    <div className="stat-row">
      <span className="name">{name}</span>
      <div className="statbar">
        <div style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
      <span className="num">{label ?? `${Math.round(value * 100)}%`}</span>
    </div>
  );
}

export function PlantPanel() {
  const plants = useGame((s) => s.plants);
  const selectedPlantId = useGame((s) => s.selectedPlantId);
  const shelves = useGame((s) => s.shelves);
  const market = useGame((s) => s.market);
  const inventory = useGame((s) => s.inventory);
  const day = useGame((s) => s.day);
  const devices = useGame((s) => s.devices);
  const growthSpeed = useGame((s) => s.settings.growthSpeed);
  /** 成長日数 → 現実の残り日数 */
  const realDays = (growthDays: number) => Math.max(0, Math.ceil(growthDays / growthSpeed));
  const selectPlant = useGame((s) => s.selectPlant);
  const waterPlant = useGame((s) => s.waterPlant);
  const feedLiquid = useGame((s) => s.feedLiquid);
  const repot = useGame((s) => s.repot);
  const sellPlant = useGame((s) => s.sellPlant);
  const discardPlant = useGame((s) => s.discardPlant);
  const curePest = useGame((s) => s.curePest);
  const startMove = useGame((s) => s.startMove);
  const setView = useGame((s) => s.setView);
  const openShelf = useGame((s) => s.openShelf);

  const [repotOpen, setRepotOpen] = useState(false);
  const [repotPot, setRepotPot] = useState<PotSize>(2);
  const [repotSoil, setRepotSoil] = useState<SoilType>("akadama");
  const [repotFert, setRepotFert] = useState(true);

  const plant = selectedPlantId ? plants[selectedPlantId] : null;

  const place = useMemo(() => {
    if (!plant) return null;
    return buildPlacement(shelves).get(plant.id) ?? null;
  }, [plant, shelves]);

  if (!plant) return null;

  const sp = SPECIES_MAP[plant.speciesId];
  const light = place ? slotLight(place.shelf, place.level, place.col) : 0.05;
  const price = salePrice(plant, market);
  const g = plant.genetics;
  const dead = plant.stage === "dead";

  return (
    <div className="side">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>
          🪴 {plant.name}{" "}
          {g.variegation > 0 && plant.geneticsKnown && <span className="badge varie">斑入り!</span>}
        </h2>
        <button onClick={() => selectPlant(null)}>✕</button>
      </div>
      <div className="muted">
        {sp.latin} <span className={`badge ${sp.tier}`}>{TIER_LABEL[sp.tier]}</span>
      </div>

      <div style={{ margin: "0.7rem 0" }}>
        <PlantViewer plant={plant} />
      </div>

      <div className="card">
        <div className="stat-row">
          <span className="name">状態</span>
          <span>
            {dead
              ? "💀 枯死"
              : plant.stage === "seed"
                ? `🌰 種 (あと${realDays(sp.germDays - (day - plant.sownDay) * growthSpeed)}日前後で発芽${
                    roomTemp(day, devices, shelves) < 17 ? "・室温17°C以上が必要!" : plant.moisture < 0.3 ? "・水分不足!" : ""
                  })`
                : plant.stage === "seedling"
                  ? "🌱 育苗中"
                  : "🪴 育成株"}
            {plant.pest && " 🐛害虫!"}
            {plant.stressDays > 0 && " 😮‍💨植替ストレス"}
          </span>
        </div>
        <Bar name="健康" value={plant.health / 100} color={plant.health > 60 ? "#37c978" : plant.health > 30 ? "#f0b429" : "#ef5350"} label={`${Math.round(plant.health)}`} />
        <Bar name="土の水分" value={plant.moisture} color="#3da9fc" />
        <Bar name="光 (現在地)" value={Math.min(1, light)} color="#e8c252" label={lightLabel(light)} />
        {plant.rot > 0.05 && <Bar name="根腐れ" value={plant.rot} color="#ef5350" />}
        {plant.rootBound > 0.4 && <Bar name="根詰まり" value={plant.rootBound} color="#f0b429" />}
        <div className="stat-row">
          <span className="name">鉢 / 土</span>
          <span>
            {POT_SPEC[plant.potSize].name} / {SOIL_SPEC[plant.soil].name}
          </span>
        </div>
        <div className="stat-row">
          <span className="name">肥料</span>
          <span>
            元肥 {plant.baseFertDays > 0 ? `残${realDays(plant.baseFertDays)}日` : "なし"} ／ 液肥{" "}
            {plant.liquidFertDays > 0 ? `残${realDays(plant.liquidFertDays)}日` : "なし"}
          </span>
        </div>
        <div className="stat-row">
          <span className="name">葉数</span>
          <span>
            {plant.leaves.length} 枚 (株サイズ ×{plant.leafScale.toFixed(2)}) ／ 仕上がり{" "}
            {Math.round(formQuality(plant) * 100)}%
          </span>
        </div>
      </div>

      <div className="card">
        <h3>🧬 個体値 {plant.geneticsKnown ? qualityStars((g.compact + g.thick + g.spine) / 3) : ""}</h3>
        {plant.geneticsKnown ? (
          <>
            <Bar name="短葉" value={g.compact} color="#37c978" />
            <Bar name="葉の厚み" value={g.thick} color="#37c978" />
            <Bar name="鋸歯の強さ" value={g.spine} color="#37c978" />
            <Bar name="成長速度" value={g.growth} color="#3da9fc" />
            {g.variegation > 0 && <Bar name="斑の強さ" value={g.variegation} color="#e8c252" />}
          </>
        ) : (
          <div className="muted">実生株は育成株サイズになるまで個体値不明 (ガチャ要素)</div>
        )}
      </div>

      {!dead && (
        <div className="card">
          <h3>🛠️ 作業</h3>
          <div className="row">
            <button onClick={() => waterPlant(plant.id)}>💧 水やり</button>
            <button onClick={() => feedLiquid(plant.id)} disabled={inventory.liquidFert <= 0}>
              🧪 液肥 (在庫{inventory.liquidFert})
            </button>
            {plant.pest && (
              <button className="danger" onClick={() => curePest(plant.id)}>
                🧴 害虫駆除 (¥200)
              </button>
            )}
            <button
              onClick={() => {
                // setView/openShelf は movingPlantId をリセットするため、
                // 必ず view を切り替えてから移動モードに入れる
                if (place) {
                  openShelf(place.shelf.id);
                } else {
                  setView("shelf");
                }
                startMove(plant.id);
              }}
            >
              ↔️ 移動
            </button>
            <button onClick={() => setRepotOpen(!repotOpen)}>🪴 植え替え</button>
          </div>

          {repotOpen && (
            <div className="subpanel">
              <div className="row" style={{ marginBottom: "0.45rem" }}>
                <select value={repotPot} onChange={(e) => setRepotPot(Number(e.target.value) as PotSize)}>
                  {([1, 2, 3] as PotSize[]).map((s) => (
                    <option key={s} value={s}>
                      {POT_SPEC[s].name} (在庫{inventory.pots[s]})
                    </option>
                  ))}
                </select>
                <select value={repotSoil} onChange={(e) => setRepotSoil(e.target.value as SoilType)}>
                  {(Object.keys(SOIL_SPEC) as SoilType[]).map((s) => (
                    <option key={s} value={s}>
                      {SOIL_SPEC[s].name} (在庫{inventory.soil[s]})
                    </option>
                  ))}
                </select>
              </div>
              <label className="opt">
                <input type="checkbox" checked={repotFert} onChange={(e) => setRepotFert(e.target.checked)} />
                元肥を入れる (在庫{inventory.baseFert})
              </label>
              <div style={{ marginTop: "0.45rem" }}>
                <button
                  className="primary"
                  onClick={() => {
                    repot(plant.id, repotPot, repotSoil, repotFert);
                    setRepotOpen(false);
                  }}
                >
                  実行
                </button>
              </div>
              <div className="muted" style={{ marginTop: "0.3rem" }}>
                根腐れ・根詰まりが回復。数日成長が止まる
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>💰 販売</h3>
        {price > 0 ? (
          <div className="row">
            <span style={{ flex: 1 }}>
              査定額: <strong style={{ color: "var(--gold)" }}>{fmtMoney(price)}</strong>
              <span className="muted"> (相場×{market.toFixed(2)})</span>
            </span>
            <button className="primary" onClick={() => sellPlant(plant.id)}>
              販売する
            </button>
          </div>
        ) : (
          <div className="muted">葉が 4 枚以上の育成株になると販売できる</div>
        )}
        <div style={{ marginTop: "0.6rem" }}>
          <button className="danger" onClick={() => discardPlant(plant.id)}>
            🗑️ 廃棄する
          </button>
        </div>
      </div>
    </div>
  );
}
