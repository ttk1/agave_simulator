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

// 窓際 (2,0) に large 棚 (3段) を置く
await page.evaluate(() => {
  const game = window.__game;
  const spec = { levels: 3, cols: 4 };
  const levels = Array.from({ length: spec.levels }, (_, li) => ({
    slots: Array.from({ length: spec.cols }, () => null),
    led: li === 0 ? { power: 1, col: 1, on: true } : null,
  }));
  levels[spec.levels - 1].slots[0] = "w";
  const p = {
    id: "w", speciesId: "raijin", name: "w",
    genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
    geneticsKnown: true, stage: "plant", sownDay: 1,
    leaves: Array.from({ length: 8 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
    growthProgress: 0, leafScale: 0.6, moisture: 0.7, health: 100, rootBound: 0,
    baseFertDays: 0, liquidFertDays: 0, potSize: 1, soil: "akadama", stressDays: 0,
    lightAvg: 0.5, daysSinceWater: 1, rot: 0, pest: false,
  };
  const shelf = { id: "sh", kind: "large", x: 2, y: 0, rot: 0, name: "ラック1", levels };
  game.setState({ plants: { w: p }, shelves: [shelf], view: "room", day: 95 });
});
await page.waitForTimeout(400);

// 部屋ビュー (比較用)
await page.getByRole("button", { name: /3Dビュー/ }).click();
await page.waitForTimeout(2200);
await page.screenshot({ path: "/app/.verify/cmp_room.png" });

// ラックビュー
await page.getByRole("button", { name: "🗺️ レイアウト" }).click();
await page.waitForTimeout(200);
await page.evaluate(() => window.__game.setState({ view: "shelf", activeShelfId: "sh" }));
await page.waitForTimeout(1800);
await page.screenshot({ path: "/app/.verify/cmp_shelf.png" });

await browser.close();
console.log("DONE");
