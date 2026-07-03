import { chromium } from "playwright";
const BASE = process.env.TARGET_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.getByRole("button", { name: "はじめる" }).click();

// constants.ts の遺伝子レンジ中央値 (compact, thick, spine, hue)
const GENES = {
  raijin: { compact: 0.42, thick: 0.45, spine: 0.35, hue: -0.2 },
  kisshokan: { compact: 0.47, thick: 0.5, spine: 0.45, hue: -0.1 },
  horrida: { compact: 0.52, thick: 0.55, spine: 0.77, hue: 0.1 },
  sasanoyuki: { compact: 0.67, thick: 0.65, spine: 0.27, hue: -0.45 },
  oteroi: { compact: 0.6, thick: 0.62, spine: 0.67, hue: 0.1 },
  hakugei: { compact: 0.75, thick: 0.75, spine: 0.82, hue: -0.1 },
  kokugei: { compact: 0.77, thick: 0.77, spine: 0.85, hue: 0.3 },
  himeganryu: { compact: 0.87, thick: 0.85, spine: 0.77, hue: 0.0 },
};
const SPECIES = Object.keys(GENES);

// 各品種 1 株 (遺伝子はレンジ中央値) を大棚に並べる
await page.evaluate((genes) => {
  const game = window.__game;
  const plants = {};
  const spec = { levels: 3, cols: 4 };
  const levels = Array.from({ length: spec.levels }, () => ({
    slots: Array.from({ length: spec.cols }, () => null),
    led: null,
  }));
  Object.entries(genes).forEach(([sid, gg], i) => {
    const g = { ...gg, growth: 0.5, variegation: 0, vtype: "margin" };
    plants[sid] = {
      id: sid, speciesId: sid, name: sid,
      genetics: g, geneticsKnown: true, stage: "plant", sownDay: 1,
      leaves: Array.from({ length: 11 }, (_, k) => ({
        len: 1, width: 1, thick: 0.85, etiole: 0.05,
        hueShift: Math.sin(k * 3.7 + i) * 0.05, born: k,
      })),
      growthProgress: 0, leafScale: 0.8, moisture: 0.7, health: 100, rootBound: 0,
      baseFertDays: 0, liquidFertDays: 0, potSize: 2, soil: "akadama", stressDays: 0,
      lightAvg: 0.7, daysSinceWater: 1, rot: 0, pest: false,
    };
    const li = Math.floor(i / spec.cols);
    levels[li].slots[i % spec.cols] = sid;
  });
  const shelf = { id: "sh", kind: "large", x: 2, y: 0, rot: 0, name: "ラック1", levels };
  game.setState({ plants, shelves: [shelf], view: "shelf", activeShelfId: "sh", day: 120 });
}, GENES);
await page.waitForTimeout(2200);
await page.screenshot({ path: "/app/.verify/species_shelf.png" });

// 各品種をフォトビューアで撮影
for (const sid of SPECIES) {
  await page.evaluate((id) => window.__game.setState({ selectedPlantId: id }), sid);
  await page.waitForSelector(".plant-viewer canvas");
  await page.waitForTimeout(1500);
  const el = await page.$(".plant-viewer");
  await el.screenshot({ path: `/app/.verify/sp_${sid}.png` });
}

await browser.close();
console.log("DONE");
