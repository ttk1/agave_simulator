// デバッグモード (ローカル起動時のみの設定) の検証
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

// ===== 1. 設定にデバッグモードの項目が出る (dev サーバー = ローカル環境) =====
await page.getByRole("button", { name: "⚙️" }).click();
await page.waitForTimeout(200);
check("設定にデバッグモード項目が表示される", await page.locator(".modal", { hasText: "デバッグモード" }).isVisible());
check("OFF の間は追加ボタンが出ない", (await page.getByRole("button", { name: /1,000,000/ }).count()) === 0);

// ===== 2. 有効化 → 追加ボタンが出る =====
await page.locator(".modal input[type='checkbox']").check();
await page.waitForTimeout(150);
check("ON にすると追加ボタンが出る", await page.getByRole("button", { name: /1,000,000/ }).isVisible());

// ===== 3. 資金追加 =====
const moneyBefore = await page.evaluate(() => window.__game.getState().money);
await page.getByRole("button", { name: /1,000,000/ }).click();
await page.waitForTimeout(150);
const moneyAfter = await page.evaluate(() => window.__game.getState().money);
check("資金 +¥1,000,000", moneyAfter === moneyBefore + 1_000_000, `¥${moneyBefore} → ¥${moneyAfter}`);

// ===== 4. 全アイテム追加 =====
await page.getByRole("button", { name: /全アイテム追加/ }).click();
await page.waitForTimeout(150);
const inv = await page.evaluate(() => window.__game.getState().inventory);
check(
  "種・鉢・土・肥料・LED・棚・家具が増える",
  (inv.seeds.raijin ?? 0) >= 13 &&
    inv.pots[3] >= 10 &&
    inv.soil.pumice >= 10 &&
    inv.baseFert >= 11 &&
    inv.liquidFert >= 13 &&
    inv.leds[3] >= 10 &&
    inv.shelves.large >= 5 &&
    (inv.furniture?.bed ?? 0) >= 5,
  `seeds.raijin=${inv.seeds.raijin} pots3=${inv.pots[3]} leds3=${inv.leds[3]} shelves.large=${inv.shelves.large} furn.bed=${inv.furniture?.bed}`,
);

// ===== 5. HUD にバッジ、閉じても状態が残る =====
await page.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(150);
check("HUD に DEBUG バッジが出る", await page.locator(".debug-chip").isVisible());

// ===== 6. OFF に戻すとバッジが消える =====
await page.getByRole("button", { name: "⚙️" }).click();
await page.waitForTimeout(150);
await page.locator(".modal input[type='checkbox']").uncheck();
await page.getByRole("button", { name: "閉じる" }).click();
await page.waitForTimeout(150);
check("OFF でバッジが消える", (await page.locator(".debug-chip").count()) === 0);

await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
