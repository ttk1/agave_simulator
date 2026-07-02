// サーキュレーターの効果範囲と害虫伝播の検証
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
await page.waitForTimeout(200);

// ===== 1. 効果範囲の表示: (0,3) に設置 → 部屋の隅なので風が届くのは 4 マス =====
await page.evaluate(() => {
  window.__game.setState({
    devices: {
      heater: false,
      heaterOn: false,
      circulator: true,
      circulatorOn: true,
      circulatorPos: { x: 0, y: 3 },
      aircon: false,
      airconOn: false,
    },
  });
});
await page.waitForTimeout(200);
const windyCorner = await page.locator(".room-cell.windy").count();
check("隅 (0,3) 設置で風の届くマスが 4", windyCorner === 4, `${windyCorner} マス`);
check("🌀 バッジが表示される", (await page.locator(".circ-badge").count()) === 1);

// ===== 2. UI から移動: 移動ボタン → (3,1) のマスをクリック → 3×3 = 9 マス =====
await page.locator(".card", { hasText: "環境設備" }).locator("button.mini", { hasText: "移動" }).click();
await page.waitForTimeout(150);
check("設置マス選択のバナー表示", await page.locator(".picking-banner").isVisible());
await page.locator(".room-grid .room-cell").nth(1 * 6 + 3).click(); // (x=3, y=1)
await page.waitForTimeout(200);
const pos = await page.evaluate(() => window.__game.getState().devices.circulatorPos);
check("クリックしたマスへ移動", pos.x === 3 && pos.y === 1, `(${pos.x},${pos.y})`);
const windyMid = await page.locator(".room-cell.windy").count();
check("部屋の中では風の届くマスが 9", windyMid === 9, `${windyMid} マス`);

// ===== 3. 害虫の伝播: 同じ棚 → うつる / 隣のマスの棚 → うつる / 離れた棚 → うつらない =====
// 冬 (day 270〜) は湿度が低く自然発生しないので、増えた pest はすべて伝播由来。
// 成長速度 4 で伝播率を上げ、30 日で統計的にほぼ確実に伝播させる。
await page.evaluate(() => {
  const game = window.__game;
  const mk = (id, pest) => ({
    id, speciesId: "raijin", name: id,
    genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
    geneticsKnown: true, stage: "plant", sownDay: 1,
    leaves: Array.from({ length: 8 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
    growthProgress: 0, leafScale: 0.6, moisture: 0.7, health: 100, rootBound: 0,
    baseFertDays: 0, liquidFertDays: 0, potSize: 1, soil: "akadama", stressDays: 0,
    lightAvg: 0.5, daysSinceWater: 1, rot: 0, pest,
  });
  const mkShelf = (id, x, y, slots) => ({
    id, kind: "small", x, y, rot: 0, name: id,
    levels: [
      { slots, led: null },
      { slots: [null, null, null], led: null },
    ],
  });
  game.setState({
    plants: {
      src1: mk("src1", true),
      src2: mk("src2", true),
      tgtA: mk("tgtA", false),
      tgtB: mk("tgtB", false),
      tgtC: mk("tgtC", false),
    },
    shelves: [
      mkShelf("A", 0, 3, ["src1", "src2", "tgtA"]),
      mkShelf("B", 1, 3, ["tgtB", null, null]),
      mkShelf("C", 4, 3, ["tgtC", null, null]),
    ],
    bench: [],
    devices: {
      heater: false, heaterOn: false,
      circulator: false, circulatorOn: false,
      aircon: false, airconOn: false,
    },
    settings: { growthSpeed: 4 },
    day: 270,
  });
  game.getState().advanceDays(30);
});
await page.waitForTimeout(300);
const pests = await page.evaluate(() => {
  const p = window.__game.getState().plants;
  return { tgtA: p.tgtA.pest, tgtB: p.tgtB.pest, tgtC: p.tgtC.pest };
});
check("同じ棚の株に害虫がうつる", pests.tgtA === true);
check("隣のマスの棚にも害虫がうつる", pests.tgtB === true);
check("離れた棚 (距離2以上) にはうつらない", pests.tgtC === false);

await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
