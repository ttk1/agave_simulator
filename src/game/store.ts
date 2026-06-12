import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEVICE_SPEC,
  FERT_SPEC,
  LED_SPEC,
  POT_SPEC,
  ROOM_COLS,
  ROOM_ROWS,
  SAVE_KEY,
  SHELF_SPEC,
  SOIL_SPEC,
  SPECIES_MAP,
  START_MONEY,
} from "./constants";
import { salePrice } from "./economy";
import { nextMarket } from "./economy";
import { dateLabel } from "./environment";
import { geneticsQuality, makePlant, uid } from "./genetics";
import { tickDay } from "./simulation";
import type {
  CollectionEntry,
  DayReport,
  Devices,
  Inventory,
  LedPower,
  Plant,
  PotSize,
  Settings,
  Shelf,
  ShelfKind,
  SoilType,
} from "./types";

/** 現実のローカル日付 (YYYY-MM-DD) */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export type View = "room" | "shelf" | "shop" | "collection";

export interface SlotRef {
  shelfId: string;
  level: number;
  col: number;
}

interface GameStore {
  // ===== 永続化される状態 =====
  day: number;
  money: number;
  /** 最後にリアル日付同期した日 (YYYY-MM-DD) */
  lastRealDate: string;
  settings: Settings;
  plants: Record<string, Plant>;
  /** 棚に置かれていない株 (作業台) */
  bench: string[];
  shelves: Shelf[];
  inventory: Inventory;
  devices: Devices;
  market: number;
  report: DayReport | null;
  collection: Record<string, CollectionEntry>;
  serials: Record<string, number>;
  totalEarned: number;
  totalDaysPlayed: number;
  helpSeen: boolean;

  // ===== UI 状態 (非永続) =====
  view: View;
  activeShelfId: string | null;
  selectedPlantId: string | null;
  movingPlantId: string | null;
  sowTarget: SlotRef | "bench" | null;
  placingShelf: ShelfKind | null;
  showReport: boolean;
  showHelp: boolean;
  showSettings: boolean;
  toast: string | null;

  // ===== UI 操作 =====
  setView: (v: View) => void;
  openShelf: (id: string) => void;
  selectPlant: (id: string | null) => void;
  startMove: (plantId: string | null) => void;
  setSowTarget: (t: SlotRef | "bench" | null) => void;
  setPlacingShelf: (k: ShelfKind | null) => void;
  closeReport: () => void;
  setShowHelp: (b: boolean) => void;
  setShowSettings: (b: boolean) => void;
  setToast: (s: string | null) => void;

  // ===== ゲームアクション =====
  /** n 日進める (シミュレーション実行) */
  advanceDays: (n: number) => void;
  nextDay: () => void;
  /** 現実の日付が進んでいたら、その分ゲーム内の日も進める */
  syncRealDay: () => void;
  setGrowthSpeed: (v: number) => void;
  waterPlant: (id: string) => void;
  feedLiquid: (id: string) => void;
  repot: (id: string, pot: PotSize, soil: SoilType, baseFert: boolean) => void;
  sellPlant: (id: string) => void;
  discardPlant: (id: string) => void;
  curePest: (id: string) => void;
  sow: (speciesId: string, target: SlotRef | "bench", pot: PotSize, soil: SoilType, baseFert: boolean) => void;
  movePlant: (id: string, target: SlotRef | "bench") => void;
  placeShelf: (kind: ShelfKind, x: number, y: number) => void;
  removeShelf: (shelfId: string) => void;
  installLed: (shelfId: string, level: number, power: LedPower) => void;
  uninstallLed: (shelfId: string, level: number) => void;
  setLedCol: (shelfId: string, level: number, col: number) => void;
  toggleLed: (shelfId: string, level: number) => void;
  toggleDevice: (d: "heaterOn" | "circulatorOn" | "airconOn") => void;
  buySeed: (speciesId: string) => void;
  buyPup: (speciesId: string) => void;
  buyPot: (size: PotSize) => void;
  buySoil: (soil: SoilType) => void;
  buyFert: (kind: "base" | "liquid") => void;
  buyLed: (power: LedPower) => void;
  buyShelf: (kind: ShelfKind) => void;
  buyDevice: (d: "heater" | "circulator" | "aircon") => void;
  resetGame: () => void;
}

function initialShelves(): Shelf[] {
  const spec = SHELF_SPEC.small;
  return [
    {
      id: uid("shelf"),
      kind: "small",
      x: 2,
      y: 1,
      name: "ラック 1",
      levels: Array.from({ length: spec.levels }, (_, i) => ({
        slots: Array.from({ length: spec.cols }, () => null),
        led: i === 0 ? { power: 1 as LedPower, col: 1, on: true } : null,
      })),
    },
  ];
}

function initialInventory(): Inventory {
  return {
    seeds: { raijin: 3 },
    pots: { 1: 4, 2: 1, 3: 0 },
    soil: { akadama: 4, pumice: 0, rich: 0 },
    baseFert: 1,
    liquidFert: 3,
    leds: { 1: 0, 2: 0, 3: 0 },
    shelves: { small: 0, large: 0 },
  };
}

function initialGame() {
  return {
    day: 1,
    money: START_MONEY,
    lastRealDate: todayStr(),
    settings: { growthSpeed: 1 } as Settings,
    plants: {} as Record<string, Plant>,
    bench: [] as string[],
    shelves: initialShelves(),
    inventory: initialInventory(),
    devices: { heater: false, heaterOn: false, circulator: false, circulatorOn: false, aircon: false, airconOn: false },
    market: 1.0,
    report: null,
    collection: {} as Record<string, CollectionEntry>,
    serials: {} as Record<string, number>,
    totalEarned: 0,
    totalDaysPlayed: 0,
    helpSeen: false,
  };
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => {
      /** お金を消費。足りなければ false */
      const pay = (yen: number, label: string): boolean => {
        const s = get();
        if (s.money < yen) {
          set({ toast: `💸 所持金が足りない (${label})` });
          return false;
        }
        set({ money: s.money - yen });
        return true;
      };

      const removeFromSlots = (state: { shelves: Shelf[]; bench: string[] }, plantId: string) => {
        const shelves = state.shelves.map((sh) => ({
          ...sh,
          levels: sh.levels.map((lv) => ({
            ...lv,
            slots: lv.slots.map((pid) => (pid === plantId ? null : pid)),
          })),
        }));
        const bench = state.bench.filter((id) => id !== plantId);
        return { shelves, bench };
      };

      const putToTarget = (
        state: { shelves: Shelf[]; bench: string[] },
        plantId: string,
        target: SlotRef | "bench",
      ): { shelves: Shelf[]; bench: string[] } | null => {
        if (target === "bench") {
          if (state.bench.length >= 8) return null;
          return { shelves: state.shelves, bench: [...state.bench, plantId] };
        }
        let ok = false;
        const shelves = state.shelves.map((sh) => {
          if (sh.id !== target.shelfId) return sh;
          return {
            ...sh,
            levels: sh.levels.map((lv, li) => {
              if (li !== target.level) return lv;
              if (lv.slots[target.col] !== null) return lv;
              ok = true;
              const slots = [...lv.slots];
              slots[target.col] = plantId;
              return { ...lv, slots };
            }),
          };
        });
        if (!ok) return null;
        return { shelves, bench: state.bench };
      };

      return {
        ...initialGame(),

        view: "room" as View,
        activeShelfId: null,
        selectedPlantId: null,
        movingPlantId: null,
        sowTarget: null,
        placingShelf: null,
        showReport: false,
        showHelp: true,
        showSettings: false,
        toast: null,

        setView: (v) => set({ view: v, movingPlantId: null, placingShelf: null }),
        openShelf: (id) => set({ view: "shelf", activeShelfId: id, selectedPlantId: null }),
        selectPlant: (id) => set({ selectedPlantId: id }),
        startMove: (plantId) => set({ movingPlantId: plantId }),
        setSowTarget: (t) => set({ sowTarget: t }),
        setPlacingShelf: (k) => set({ placingShelf: k }),
        closeReport: () => set({ showReport: false }),
        setShowHelp: (b) => set({ showHelp: b, helpSeen: true }),
        setShowSettings: (b) => set({ showSettings: b }),
        setToast: (s) => set({ toast: s }),

        advanceDays: (n) => {
          const s = get();
          const plants = JSON.parse(JSON.stringify(s.plants)) as Record<string, Plant>;
          const lines: string[] = [];
          let electricity = 0;
          let market = s.market;
          for (let i = 0; i < n; i++) {
            const day = s.day + i;
            const r = tickDay(day, plants, s.shelves, s.devices, s.settings.growthSpeed);
            electricity += r.electricity;
            const nm = nextMarket(market);
            market = nm.value;
            if (nm.news) r.lines.push(nm.news);
            if (n > 1 && r.lines.length > 0) lines.push(`📅 ${dateLabel(day)}`);
            lines.push(...r.lines);
          }
          if (lines.length > 60) {
            const omitted = lines.length - 60;
            lines.length = 60;
            lines.push(`…ほか ${omitted} 件`);
          }

          // 育成株到達を図鑑に記録
          const collection = { ...s.collection };
          for (const p of Object.values(plants)) {
            if (p.stage === "plant" && !(p as Plant & { recordedGrown?: boolean }).recordedGrown) {
              (p as Plant & { recordedGrown?: boolean }).recordedGrown = true;
              const e = collection[p.speciesId] ?? { grown: 0, sold: 0, bestPrice: 0, bestQuality: 0 };
              collection[p.speciesId] = {
                ...e,
                grown: e.grown + 1,
                bestQuality: Math.max(e.bestQuality, geneticsQuality(p.genetics)),
              };
            }
          }

          const report: DayReport = { day: s.day, days: n, lines, electricity, income: 0 };
          set({
            day: s.day + n,
            money: s.money - electricity,
            plants,
            market,
            report,
            collection,
            showReport: true,
            totalDaysPlayed: s.totalDaysPlayed + n,
            movingPlantId: null,
          });
        },

        nextDay: () => get().advanceDays(1),

        syncRealDay: () => {
          const s = get();
          const today = todayStr();
          if (!s.lastRealDate) {
            set({ lastRealDate: today });
            return;
          }
          const diff = daysBetween(s.lastRealDate, today);
          if (diff > 0) {
            // 長期離脱でも 1 年分まで
            get().advanceDays(Math.min(diff, 360));
            set({ lastRealDate: today });
          } else if (diff < 0) {
            // 時計が巻き戻った場合はスタンプだけ合わせる
            set({ lastRealDate: today });
          }
        },

        setGrowthSpeed: (v) => {
          set((st) => ({ settings: { ...st.settings, growthSpeed: v } }));
        },

        waterPlant: (id) => {
          const p = get().plants[id];
          if (!p || p.stage === "dead") return;
          set((s) => ({
            plants: {
              ...s.plants,
              [id]: { ...p, moisture: 1, daysSinceWater: 0 },
            },
            toast: `💧 ${p.name} に水やりした`,
          }));
        },

        feedLiquid: (id) => {
          const s = get();
          const p = s.plants[id];
          if (!p || p.stage === "dead") return;
          if (s.inventory.liquidFert <= 0) {
            set({ toast: "液肥が無い。ショップで買おう" });
            return;
          }
          set((st) => ({
            inventory: { ...st.inventory, liquidFert: st.inventory.liquidFert - 1 },
            plants: { ...st.plants, [id]: { ...p, liquidFertDays: FERT_SPEC.liquid.days } },
            toast: `🧪 ${p.name} に液肥を与えた (${FERT_SPEC.liquid.days}日効果)`,
          }));
        },

        repot: (id, pot, soil, baseFert) => {
          const s = get();
          const p = s.plants[id];
          if (!p || p.stage === "dead") return;
          if (s.inventory.pots[pot] <= 0) return set({ toast: "その鉢の在庫が無い" });
          if (s.inventory.soil[soil] <= 0) return set({ toast: "その土の在庫が無い" });
          if (baseFert && s.inventory.baseFert <= 0) return set({ toast: "元肥が無い" });
          set((st) => ({
            inventory: {
              ...st.inventory,
              pots: { ...st.inventory.pots, [pot]: st.inventory.pots[pot] - 1, [p.potSize]: st.inventory.pots[p.potSize] + 1 },
              soil: { ...st.inventory.soil, [soil]: st.inventory.soil[soil] - 1 },
              baseFert: st.inventory.baseFert - (baseFert ? 1 : 0),
            },
            plants: {
              ...st.plants,
              [id]: {
                ...p,
                potSize: pot,
                soil,
                baseFertDays: baseFert ? FERT_SPEC.base.days : 0,
                stressDays: 4,
                rootBound: 0,
                rot: Math.max(0, p.rot - 0.5),
                moisture: 0.45,
              },
            },
            toast: `🪴 ${p.name} を ${POT_SPEC[pot].name} + ${SOIL_SPEC[soil].name} に植え替えた`,
          }));
        },

        sellPlant: (id) => {
          const s = get();
          const p = s.plants[id];
          if (!p || p.stage !== "plant") return;
          const price = salePrice(p, s.market);
          if (price <= 0) return set({ toast: "まだ売り物にならないサイズだ" });
          const cleaned = removeFromSlots(s, id);
          const plants = { ...s.plants };
          delete plants[id];
          const e = s.collection[p.speciesId] ?? { grown: 0, sold: 0, bestPrice: 0, bestQuality: 0 };
          set({
            ...cleaned,
            plants,
            money: get().money + price,
            totalEarned: s.totalEarned + price,
            selectedPlantId: null,
            collection: {
              ...s.collection,
              [p.speciesId]: {
                ...e,
                sold: e.sold + 1,
                bestPrice: Math.max(e.bestPrice, price),
                bestQuality: Math.max(e.bestQuality, geneticsQuality(p.genetics)),
              },
            },
            toast: `💰 ${p.name} を ¥${price.toLocaleString()} で販売した！`,
          });
        },

        discardPlant: (id) => {
          const s = get();
          const p = s.plants[id];
          if (!p) return;
          const cleaned = removeFromSlots(s, id);
          const plants = { ...s.plants };
          delete plants[id];
          set({
            ...cleaned,
            plants,
            selectedPlantId: null,
            inventory: { ...s.inventory, pots: { ...s.inventory.pots, [p.potSize]: s.inventory.pots[p.potSize] + 1 } },
            toast: `🗑️ ${p.name} を処分した (鉢は回収)`,
          });
        },

        curePest: (id) => {
          const s = get();
          const p = s.plants[id];
          if (!p || !p.pest) return;
          if (!pay(200, "薬剤代 ¥200")) return;
          set((st) => ({
            plants: { ...st.plants, [id]: { ...p, pest: false } },
            toast: `🧴 ${p.name} の害虫を駆除した`,
          }));
        },

        sow: (speciesId, target, pot, soil, baseFert) => {
          const s = get();
          const sp = SPECIES_MAP[speciesId];
          if (!sp) return;
          if ((s.inventory.seeds[speciesId] ?? 0) <= 0) return set({ toast: "種が無い" });
          if (s.inventory.pots[pot] <= 0) return set({ toast: "鉢が無い" });
          if (s.inventory.soil[soil] <= 0) return set({ toast: "土が無い" });
          if (baseFert && s.inventory.baseFert <= 0) return set({ toast: "元肥が無い" });

          const serial = (s.serials[speciesId] ?? 0) + 1;
          const plant = makePlant({ sp, day: s.day, serial, asPup: false, potSize: pot, soil, baseFert });
          const placed = putToTarget(s, plant.id, target);
          if (!placed) {
            set({ toast: "その場所には置けない" });
            return;
          }
          set({
            ...placed,
            plants: { ...s.plants, [plant.id]: plant },
            serials: { ...s.serials, [speciesId]: serial },
            inventory: {
              ...s.inventory,
              seeds: { ...s.inventory.seeds, [speciesId]: s.inventory.seeds[speciesId] - 1 },
              pots: { ...s.inventory.pots, [pot]: s.inventory.pots[pot] - 1 },
              soil: { ...s.inventory.soil, [soil]: s.inventory.soil[soil] - 1 },
              baseFert: s.inventory.baseFert - (baseFert ? 1 : 0),
            },
            sowTarget: null,
            toast: `🌰 ${sp.name} の種をまいた (発芽まで約${sp.germDays}日・要保湿)`,
          });
        },

        movePlant: (id, target) => {
          const s = get();
          const p = s.plants[id];
          if (!p) return;
          const cleaned = removeFromSlots(s, id);
          const placed = putToTarget(cleaned, id, target);
          if (!placed) {
            set({ toast: "その場所には置けない" });
            return;
          }
          set({ ...placed, movingPlantId: null, toast: `↔️ ${p.name} を移動した` });
        },

        placeShelf: (kind, x, y) => {
          const s = get();
          if (s.inventory.shelves[kind] <= 0) return set({ toast: "棚の在庫が無い" });
          if (x < 0 || y < 0 || x >= ROOM_COLS || y >= ROOM_ROWS) return;
          if (s.shelves.some((sh) => sh.x === x && sh.y === y)) return set({ toast: "そこには既に棚がある" });
          const spec = SHELF_SPEC[kind];
          const shelf: Shelf = {
            id: uid("shelf"),
            kind,
            x,
            y,
            name: `ラック ${s.shelves.length + 1}`,
            levels: Array.from({ length: spec.levels }, () => ({
              slots: Array.from({ length: spec.cols }, () => null),
              led: null,
            })),
          };
          set({
            shelves: [...s.shelves, shelf],
            inventory: { ...s.inventory, shelves: { ...s.inventory.shelves, [kind]: s.inventory.shelves[kind] - 1 } },
            placingShelf: null,
            toast: `🪜 ${spec.name} を設置した`,
          });
        },

        removeShelf: (shelfId) => {
          const s = get();
          const shelf = s.shelves.find((sh) => sh.id === shelfId);
          if (!shelf) return;
          if (shelf.levels.some((lv) => lv.slots.some((p) => p !== null))) {
            return set({ toast: "株が載っている棚は撤去できない" });
          }
          const ledsBack = { ...s.inventory.leds };
          for (const lv of shelf.levels) {
            if (lv.led) ledsBack[lv.led.power] += 1;
          }
          set({
            shelves: s.shelves.filter((sh) => sh.id !== shelfId),
            inventory: {
              ...s.inventory,
              shelves: { ...s.inventory.shelves, [shelf.kind]: s.inventory.shelves[shelf.kind] + 1 },
              leds: ledsBack,
            },
            view: "room",
            activeShelfId: null,
            toast: "棚を撤去した (LEDは回収)",
          });
        },

        installLed: (shelfId, level, power) => {
          const s = get();
          if (s.inventory.leds[power] <= 0) return set({ toast: "そのLEDの在庫が無い" });
          set({
            shelves: s.shelves.map((sh) =>
              sh.id !== shelfId
                ? sh
                : {
                    ...sh,
                    levels: sh.levels.map((lv, li) =>
                      li !== level ? lv : { ...lv, led: { power, col: Math.floor(SHELF_SPEC[sh.kind].cols / 2), on: true } },
                    ),
                  },
            ),
            inventory: { ...s.inventory, leds: { ...s.inventory.leds, [power]: s.inventory.leds[power] - 1 } },
            toast: `💡 ${LED_SPEC[power].name} を取り付けた`,
          });
        },

        uninstallLed: (shelfId, level) => {
          const s = get();
          const shelf = s.shelves.find((sh) => sh.id === shelfId);
          const led = shelf?.levels[level]?.led;
          if (!shelf || !led) return;
          set({
            shelves: s.shelves.map((sh) =>
              sh.id !== shelfId
                ? sh
                : { ...sh, levels: sh.levels.map((lv, li) => (li !== level ? lv : { ...lv, led: null })) },
            ),
            inventory: { ...s.inventory, leds: { ...s.inventory.leds, [led.power]: s.inventory.leds[led.power] + 1 } },
            toast: "LEDを取り外した",
          });
        },

        setLedCol: (shelfId, level, col) => {
          set((s) => ({
            shelves: s.shelves.map((sh) =>
              sh.id !== shelfId
                ? sh
                : {
                    ...sh,
                    levels: sh.levels.map((lv, li) => (li !== level || !lv.led ? lv : { ...lv, led: { ...lv.led, col } })),
                  },
            ),
          }));
        },

        toggleLed: (shelfId, level) => {
          set((s) => ({
            shelves: s.shelves.map((sh) =>
              sh.id !== shelfId
                ? sh
                : {
                    ...sh,
                    levels: sh.levels.map((lv, li) =>
                      li !== level || !lv.led ? lv : { ...lv, led: { ...lv.led, on: !lv.led.on } },
                    ),
                  },
            ),
          }));
        },

        toggleDevice: (d) => {
          set((s) => ({ devices: { ...s.devices, [d]: !s.devices[d] } }));
        },

        buySeed: (speciesId) => {
          const sp = SPECIES_MAP[speciesId];
          if (!pay(sp.seedPrice, sp.name + "の種")) return;
          set((s) => ({
            inventory: { ...s.inventory, seeds: { ...s.inventory.seeds, [speciesId]: (s.inventory.seeds[speciesId] ?? 0) + 1 } },
            toast: `🌰 ${sp.name} の種を購入した`,
          }));
        },

        buyPup: (speciesId) => {
          const s = get();
          const sp = SPECIES_MAP[speciesId];
          if (s.bench.length >= 8) return set({ toast: "作業台がいっぱい。先に棚へ置こう" });
          if (!pay(sp.pupPrice, sp.name + "の子株")) return;
          const serial = (get().serials[speciesId] ?? 0) + 1;
          const plant = makePlant({ sp, day: get().day, serial, asPup: true, potSize: 1, soil: "akadama", baseFert: false });
          set((st) => ({
            plants: { ...st.plants, [plant.id]: plant },
            bench: [...st.bench, plant.id],
            serials: { ...st.serials, [speciesId]: serial },
            toast: `🪴 ${plant.name} (子株) が届いた！ 作業台にある`,
          }));
        },

        buyPot: (size) => {
          if (!pay(POT_SPEC[size].price, POT_SPEC[size].name)) return;
          set((s) => ({
            inventory: { ...s.inventory, pots: { ...s.inventory.pots, [size]: s.inventory.pots[size] + 1 } },
            toast: `${POT_SPEC[size].name} を購入した`,
          }));
        },

        buySoil: (soil) => {
          if (!pay(SOIL_SPEC[soil].price, SOIL_SPEC[soil].name)) return;
          set((s) => ({
            inventory: { ...s.inventory, soil: { ...s.inventory.soil, [soil]: s.inventory.soil[soil] + 1 } },
            toast: `${SOIL_SPEC[soil].name} を購入した`,
          }));
        },

        buyFert: (kind) => {
          const spec = FERT_SPEC[kind];
          if (!pay(spec.price, spec.name)) return;
          set((s) => ({
            inventory: {
              ...s.inventory,
              baseFert: s.inventory.baseFert + (kind === "base" ? 1 : 0),
              liquidFert: s.inventory.liquidFert + (kind === "liquid" ? 1 : 0),
            },
            toast: `${spec.name} を購入した`,
          }));
        },

        buyLed: (power) => {
          if (!pay(LED_SPEC[power].price, LED_SPEC[power].name)) return;
          set((s) => ({
            inventory: { ...s.inventory, leds: { ...s.inventory.leds, [power]: s.inventory.leds[power] + 1 } },
            toast: `${LED_SPEC[power].name} を購入した (棚画面で取付)`,
          }));
        },

        buyShelf: (kind) => {
          if (!pay(SHELF_SPEC[kind].price, SHELF_SPEC[kind].name)) return;
          set((s) => ({
            inventory: { ...s.inventory, shelves: { ...s.inventory.shelves, [kind]: s.inventory.shelves[kind] + 1 } },
            toast: `${SHELF_SPEC[kind].name} を購入した (部屋画面で設置)`,
          }));
        },

        buyDevice: (d) => {
          const s = get();
          if (s.devices[d]) return set({ toast: "すでに持っている" });
          if (!pay(DEVICE_SPEC[d].price, DEVICE_SPEC[d].name)) return;
          set((st) => ({
            devices: { ...st.devices, [d]: true, [`${d}On`]: true } as Devices,
            toast: `${DEVICE_SPEC[d].name} を購入した (稼働中)`,
          }));
        },

        resetGame: () => {
          // 設定 (成長速度) はリセットしても引き継ぐ
          const settings = get().settings;
          set({ ...initialGame(), settings, view: "room", activeShelfId: null, selectedPlantId: null, showHelp: true, showReport: false });
        },
      };
    },
    {
      name: SAVE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        day: s.day,
        money: s.money,
        lastRealDate: s.lastRealDate,
        settings: s.settings,
        plants: s.plants,
        bench: s.bench,
        shelves: s.shelves,
        inventory: s.inventory,
        devices: s.devices,
        market: s.market,
        report: s.report,
        collection: s.collection,
        serials: s.serials,
        totalEarned: s.totalEarned,
        totalDaysPlayed: s.totalDaysPlayed,
        helpSeen: s.helpSeen,
      }),
    },
  ),
);
