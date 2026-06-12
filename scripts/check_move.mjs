// 移動ボタンのフロー検証: 株を選択 → 移動 → 空きスロットクリック → 配置が変わる
import { chromium } from "playwright";

const BASE = process.env.TARGET_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.getByRole("button", { name: "はじめる" }).click();

// 1段目 col0 に株を注入して選択状態で棚を開く
await page.evaluate(() => {
  const game = window.__game;
  const s = game.getState();
  const p = {
    id: "mv_test",
    speciesId: "raijin",
    name: "移動テスト株",
    genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
    geneticsKnown: true,
    stage: "plant",
    sownDay: 1,
    leaves: Array.from({ length: 8 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
    growthProgress: 0,
    leafScale: 0.6,
    moisture: 0.5,
    health: 100,
    rootBound: 0,
    baseFertDays: 0,
    liquidFertDays: 0,
    potSize: 1,
    soil: "akadama",
    stressDays: 0,
    lightAvg: 0.7,
    daysSinceWater: 1,
    rot: 0,
    pest: false,
  };
  const shelves = s.shelves.map((sh, si) =>
    si !== 0 ? sh : { ...sh, levels: sh.levels.map((lv, li) => (li !== 0 ? lv : { ...lv, slots: ["mv_test", null, null] })) },
  );
  game.setState({ plants: { ...s.plants, [p.id]: p }, shelves, view: "shelf", activeShelfId: shelves[0].id, selectedPlantId: "mv_test" });
});
await page.waitForTimeout(1500);

// 移動ボタンをクリック
await page.getByRole("button", { name: /移動/ }).click();
await page.waitForTimeout(400);

const banner = await page.locator(".picking-banner").isVisible().catch(() => false);
console.log("移動モードバナー表示:", banner);
const movingId = await page.evaluate(() => window.__game.getState().movingPlantId);
console.log("movingPlantId:", movingId);
if (!banner || movingId !== "mv_test") {
  console.log("RESULT: NG (移動モードに入れていない)");
  await page.screenshot({ path: "/app/.verify/move_fail.png" });
  await browser.close();
  process.exit(1);
}

// 空きスロット (右側) をクリックして移動させる
const canvas = page.locator(".shelf-canvas canvas");
const box = await canvas.boundingBox();
const candidates = [
  [0.62, 0.8], [0.68, 0.78], [0.72, 0.75], [0.6, 0.75], [0.66, 0.72], [0.58, 0.82],
];
let moved = null;
for (const [fx, fy] of candidates) {
  await canvas.click({ position: { x: box.width * fx, y: box.height * fy } });
  await page.waitForTimeout(350);
  moved = await page.evaluate(() => {
    const s = window.__game.getState();
    const slots = s.shelves[0].levels.map((lv) => lv.slots);
    return { slots, moving: s.movingPlantId };
  });
  if (moved.slots[0][0] === null) break;
}
console.log("移動後の配置:", JSON.stringify(moved.slots));
const ok = moved.slots[0][0] === null && moved.slots.flat().includes("mv_test");
await page.screenshot({ path: "/app/.verify/move_after.png" });
console.log(ok ? "RESULT: OK (移動成功)" : "RESULT: NG");
await browser.close();
process.exit(ok ? 0 : 1);
