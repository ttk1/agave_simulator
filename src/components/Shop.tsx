import { DEVICE_SPEC, FERT_SPEC, LED_SPEC, POT_SPEC, SHELF_SPEC, SOIL_SPEC, SPECIES, TIER_LABEL } from "../game/constants";
import { fmtMoney } from "../game/economy";
import { useGame } from "../game/store";
import type { LedPower, PotSize, ShelfKind, SoilType } from "../game/types";

export function Shop() {
  const money = useGame((s) => s.money);
  const inventory = useGame((s) => s.inventory);
  const devices = useGame((s) => s.devices);
  const buySeed = useGame((s) => s.buySeed);
  const buyPup = useGame((s) => s.buyPup);
  const buyPot = useGame((s) => s.buyPot);
  const buySoil = useGame((s) => s.buySoil);
  const buyFert = useGame((s) => s.buyFert);
  const buyLed = useGame((s) => s.buyLed);
  const buyShelf = useGame((s) => s.buyShelf);
  const buyDevice = useGame((s) => s.buyDevice);

  return (
    <div>
      <h2>🛒 ショップ — 所持金 <span style={{ color: "var(--gold)" }}>{fmtMoney(money)}</span></h2>
      <p className="muted">買い物はネット注文なので時間を消費しない。種・子株は即日到着。</p>

      <h3>🌰 種子・子株</h3>
      <div className="shop-grid">
        {SPECIES.map((sp) => (
          <div className="shop-item" key={sp.id}>
            <div className="title">
              {sp.name} <span className={`badge ${sp.tier}`}>{TIER_LABEL[sp.tier]}</span>
            </div>
            <div className="muted">{sp.latin}</div>
            <div className="muted">{sp.desc}</div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="price">種 {fmtMoney(sp.seedPrice)}</span>
              <span className="muted">所持 ×{inventory.seeds[sp.id] ?? 0}</span>
              <button disabled={money < sp.seedPrice} onClick={() => buySeed(sp.id)}>
                種を買う
              </button>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="price">子株 {fmtMoney(sp.pupPrice)}</span>
              <span className="muted">個体値確定</span>
              <button disabled={money < sp.pupPrice} onClick={() => buyPup(sp.id)}>
                子株を買う
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3>🪴 鉢・土・肥料</h3>
      <div className="shop-grid">
        {([1, 2, 3] as PotSize[]).map((s) => (
          <div className="shop-item" key={s}>
            <div className="title">{POT_SPEC[s].name}</div>
            <div className="muted">所持 ×{inventory.pots[s]}。大きい鉢は乾きにくい</div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="price">{fmtMoney(POT_SPEC[s].price)}</span>
              <button disabled={money < POT_SPEC[s].price} onClick={() => buyPot(s)}>
                買う
              </button>
            </div>
          </div>
        ))}
        {(Object.keys(SOIL_SPEC) as SoilType[]).map((s) => (
          <div className="shop-item" key={s}>
            <div className="title">{SOIL_SPEC[s].name}</div>
            <div className="muted">
              {SOIL_SPEC[s].desc} (所持 ×{inventory.soil[s]})
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="price">{fmtMoney(SOIL_SPEC[s].price)}</span>
              <button disabled={money < SOIL_SPEC[s].price} onClick={() => buySoil(s)}>
                買う
              </button>
            </div>
          </div>
        ))}
        <div className="shop-item">
          <div className="title">{FERT_SPEC.base.name}</div>
          <div className="muted">植え替え・種まき時に混ぜる。{FERT_SPEC.base.days}日効果 (所持 ×{inventory.baseFert})</div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="price">{fmtMoney(FERT_SPEC.base.price)}</span>
            <button disabled={money < FERT_SPEC.base.price} onClick={() => buyFert("base")}>
              買う
            </button>
          </div>
        </div>
        <div className="shop-item">
          <div className="title">{FERT_SPEC.liquid.name}</div>
          <div className="muted">いつでも与えられる。{FERT_SPEC.liquid.days}日効果。元肥と併用しすぎると徒長 (所持 ×{inventory.liquidFert})</div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="price">{fmtMoney(FERT_SPEC.liquid.price)}</span>
            <button disabled={money < FERT_SPEC.liquid.price} onClick={() => buyFert("liquid")}>
              買う
            </button>
          </div>
        </div>
      </div>

      <h3>💡 設備</h3>
      <div className="shop-grid">
        {([1, 2, 3] as LedPower[]).map((p) => (
          <div className="shop-item" key={p}>
            <div className="title">{LED_SPEC[p].name}</div>
            <div className="muted">
              電気代 ¥{LED_SPEC[p].elecPerDay}/日。棚画面で取付・位置調整 (所持 ×{inventory.leds[p]})
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="price">{fmtMoney(LED_SPEC[p].price)}</span>
              <button disabled={money < LED_SPEC[p].price} onClick={() => buyLed(p)}>
                買う
              </button>
            </div>
          </div>
        ))}
        {(Object.keys(SHELF_SPEC) as ShelfKind[]).map((k) => (
          <div className="shop-item" key={k}>
            <div className="title">{SHELF_SPEC[k].name}</div>
            <div className="muted">
              {SHELF_SPEC[k].levels}段 × {SHELF_SPEC[k].cols}列 (所持 ×{inventory.shelves[k]})
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="price">{fmtMoney(SHELF_SPEC[k].price)}</span>
              <button disabled={money < SHELF_SPEC[k].price} onClick={() => buyShelf(k)}>
                買う
              </button>
            </div>
          </div>
        ))}
        <div className="shop-item">
          <div className="title">{DEVICE_SPEC.heater.name}</div>
          <div className="muted">冬でも室温 20°C を保つ。電気代 ¥{DEVICE_SPEC.heater.elecPerDay}/日</div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="price">{fmtMoney(DEVICE_SPEC.heater.price)}</span>
            <button disabled={devices.heater || money < DEVICE_SPEC.heater.price} onClick={() => buyDevice("heater")}>
              {devices.heater ? "所持済" : "買う"}
            </button>
          </div>
        </div>
        <div className="shop-item">
          <div className="title">{DEVICE_SPEC.aircon.name}</div>
          <div className="muted">
            室温を 27°C 以下に保つ。LED の発熱対策に。電気代 ¥{DEVICE_SPEC.aircon.elecPerDay}/日 + 冷却量に応じて加算
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="price">{fmtMoney(DEVICE_SPEC.aircon.price)}</span>
            <button disabled={devices.aircon || money < DEVICE_SPEC.aircon.price} onClick={() => buyDevice("aircon")}>
              {devices.aircon ? "所持済" : "買う"}
            </button>
          </div>
        </div>
        <div className="shop-item">
          <div className="title">{DEVICE_SPEC.circulator.name}</div>
          <div className="muted">蒸れ・根腐れ・害虫を抑える。電気代 ¥{DEVICE_SPEC.circulator.elecPerDay}/日</div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="price">{fmtMoney(DEVICE_SPEC.circulator.price)}</span>
            <button
              disabled={devices.circulator || money < DEVICE_SPEC.circulator.price}
              onClick={() => buyDevice("circulator")}
            >
              {devices.circulator ? "所持済" : "買う"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
