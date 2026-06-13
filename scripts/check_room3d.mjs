// 部屋 3D ビューと窓からの自然光の検証
import { chromium } from "playwright";

const BASE = process.env.TARGET_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
let ok = true;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${name} ${detail}`);
  if (!cond) ok = false;
};

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.getByRole("button", { name: "はじめる" }).click();

// 窓際 (x=2,y=0) と部屋の奥 (x=2,y=3) に棚 + LED無し株を配置
await page.evaluate(() => {
  const game = window.__game;
  const s = game.getState();
  const mkPlant = (id) => ({
    id, speciesId: "raijin", name: id,
    genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
    geneticsKnown: true, stage: "plant", sownDay: 1,
    leaves: Array.from({ length: 8 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
    growthProgress: 0, leafScale: 0.6, moisture: 0.6, health: 100, rootBound: 0,
    baseFertDays: 0, liquidFertDays: 0, potSize: 1, soil: "akadama", stressDays: 0,
    lightAvg: 0.5, daysSinceWater: 1, rot: 0, pest: false,
  });
  const mkShelf = (id, x, y, pid) => ({
    id, kind: "small", x, y, rot: 2, name: id, // 正面を窓に向けて採光条件を揃える
    levels: [
      { slots: [null, null, null], led: null },
      { slots: [pid, null, null], led: null }, // 最上段に配置 (窓光が一番当たる)
    ],
  });
  game.setState({
    plants: { near: mkPlant("near"), far: mkPlant("far") },
    shelves: [mkShelf("s_near", 2, 0, "near"), mkShelf("s_far", 2, 3, "far")],
    devices: { ...s.devices, circulator: true, circulatorOn: true },
  });
  game.getState().advanceDays(1);
});
await page.waitForTimeout(400);
const light = await page.evaluate(() => {
  const s = window.__game.getState();
  return { near: s.plants.near.lightAvg, far: s.plants.far.lightAvg };
});
check(
  "窓際の棚のほうが光量が多い",
  light.near > light.far + 0.05,
  `(窓際 ${light.near.toFixed(3)} vs 奥 ${light.far.toFixed(3)})`,
);
await page.evaluate(() => window.__game.getState().closeReport());

// 部屋 3D ビュー
await page.getByRole("button", { name: /3Dビュー/ }).click();
await page.waitForTimeout(2500);
const canvasCount = await page.locator(".shelf-canvas canvas").count();
check("3D ビューの canvas が表示される", canvasCount === 1);
await page.screenshot({ path: "/app/.verify/room3d.png" });

// 3D 内の棚クリック → 棚ビューへ (窓際の棚: 画面のやや左上〜中央)
const canvas = page.locator(".shelf-canvas canvas");
const box = await canvas.boundingBox();
const candidates = [[0.37, 0.6], [0.52, 0.39], [0.38, 0.55], [0.53, 0.43], [0.36, 0.64]];
let opened = false;
for (const [fx, fy] of candidates) {
  await canvas.click({ position: { x: box.width * fx, y: box.height * fy } });
  await page.waitForTimeout(400);
  opened = await page.evaluate(() => window.__game.getState().view === "shelf");
  if (opened) break;
}
check("3D ビューで棚クリック → 棚画面が開く", opened);

// 2D レイアウトの窓マーカー
await page.getByRole("button", { name: "🏠 部屋" }).click();
await page.waitForTimeout(300);
const windowMark = await page.locator(".window-mark").first().isVisible();
check("2D レイアウトに窓マーカー表示", windowMark);
await page.screenshot({ path: "/app/.verify/room2d_window.png" });

await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
