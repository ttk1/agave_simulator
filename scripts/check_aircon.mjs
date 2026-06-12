// LED 発熱とエアコンの動作チェック (dev サーバーに接続)
import { chromium } from "playwright";

const BASE = process.env.TARGET_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.getByRole("button", { name: "はじめる" }).click();

// 真夏 (8月) に設定し、強 LED ×4 を点灯させる
await page.evaluate(() => {
  const game = window.__game;
  const s = game.getState();
  const shelves = s.shelves.map((sh) => ({
    ...sh,
    levels: sh.levels.map((lv) => ({ ...lv, led: { power: 3, col: 1, on: true } })),
  }));
  // 2段 → LED 2台では足りないので棚をもう1つ複製して計4台に
  const extra = { ...shelves[0], id: "shelf_test2", x: 3, y: 1, name: "ラック T" };
  game.setState({ day: 95, shelves: [...shelves, extra] }); // day95 = 8月上旬
});
await page.waitForTimeout(300);

const readTemp = async () => (await page.locator(".hud .stat").nth(2).innerText()).replace(/\n/g, " ");
console.log("エアコン無し:", await readTemp());

// エアコン購入 & ON
await page.evaluate(() => {
  const game = window.__game;
  game.setState({ devices: { ...game.getState().devices, aircon: true, airconOn: true } });
});
await page.waitForTimeout(300);
console.log("エアコンON :", await readTemp());

// 1日進めて電気代を確認
await page.evaluate(() => window.__game.getState().nextDay());
await page.waitForTimeout(300);
const report = await page.evaluate(() => window.__game.getState().report);
console.log("電気代:", report.electricity, "円 (LED強4台=480円 + エアコン)");

// エアコンOFFで日送り → 高温ダメージのレポートが出るか
await page.evaluate(() => {
  const game = window.__game;
  game.setState({ devices: { ...game.getState().devices, airconOn: false } });
});
await page.evaluate(() => window.__game.getState().nextDay());
await page.waitForTimeout(300);
const report2 = await page.evaluate(() => window.__game.getState().report);
console.log("OFF時の電気代:", report2.electricity, "円 / レポート:", report2.lines.join(" | ") || "(なし)");

await browser.close();
console.log("CHECK DONE");
