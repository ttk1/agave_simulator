// 飾り家具 (購入・設置・移動・回転・撤去・セーブ復元) の検証
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

// ===== 1. ショップで購入 (所持金 30,000 → ベッド 25,000) =====
await page.getByRole("button", { name: /ショップ/ }).click();
await page.waitForTimeout(200);
const bedItem = page.locator(".shop-item", { hasText: "ベッド" });
await bedItem.getByRole("button", { name: "買う" }).click();
await page.waitForTimeout(200);
const afterBuy = await page.evaluate(() => {
  const s = window.__game.getState();
  return { money: s.money, inv: s.inventory.furniture?.bed ?? 0 };
});
check("ベッドを購入 (¥25,000 減)", afterBuy.money === 5000, `¥${afterBuy.money}`);
check("未設置在庫に入る", afterBuy.inv === 1);
// 資金不足で買えない
const sofaBtn = page.locator(".shop-item", { hasText: "ソファ" }).getByRole("button", { name: "買う" });
check("資金不足だと買えない", await sofaBtn.isDisabled());

// ===== 2. 部屋で設置 =====
await page.getByRole("button", { name: /部屋/ }).click();
await page.waitForTimeout(200);
await page.locator(".card", { hasText: "未設置の棚・家具" }).getByRole("button", { name: "設置する" }).last().click();
await page.waitForTimeout(150);
check("設置バナー表示", await page.locator(".picking-banner").isVisible());
await page.locator(".room-grid .room-cell").first().click(); // (0,0)
await page.waitForTimeout(200);
let furn = await page.evaluate(() => window.__game.getState().furniture);
check("(0,0) に設置される", furn.length === 1 && furn[0].x === 0 && furn[0].y === 0, JSON.stringify(furn[0] ?? null));
check("家具カードが表示される", (await page.locator(".shelf-card.furn").count()) === 1);

// ===== 3. 棚のあるマスへは移動できない / 空きマスへは移動できる =====
await page.locator(".shelf-card.furn button[title='移動']").click();
await page.waitForTimeout(150);
await page.locator(".room-grid .room-cell").nth(1 * 6 + 2).click(); // (2,1) = 初期棚のマス
await page.waitForTimeout(200);
furn = await page.evaluate(() => window.__game.getState().furniture);
check("棚のあるマスへは移動できない", furn[0].x === 0 && furn[0].y === 0);
await page.locator(".room-grid .room-cell").nth(3 * 6 + 5).click(); // (5,3)
await page.waitForTimeout(200);
furn = await page.evaluate(() => window.__game.getState().furniture);
check("空きマスへ移動できる", furn[0].x === 5 && furn[0].y === 3, `(${furn[0].x},${furn[0].y})`);

// ===== 4. 回転 =====
await page.locator(".shelf-card.furn button[title*='90°回転']").click();
await page.waitForTimeout(150);
furn = await page.evaluate(() => window.__game.getState().furniture);
check("回転できる (rot=1)", furn[0].rot === 1);

// ===== 5. 家具のあるマスへ棚を置けない =====
await page.evaluate(() => {
  const s = window.__game.getState();
  window.__game.setState({ inventory: { ...s.inventory, shelves: { ...s.inventory.shelves, small: 1 } } });
});
await page.locator(".card", { hasText: "未設置の棚・家具" }).getByRole("button", { name: "設置する" }).first().click();
await page.waitForTimeout(150);
await page.locator(".room-grid .room-cell").nth(3 * 6 + 5).click(); // 家具のマス
await page.waitForTimeout(200);
const shelvesN = await page.evaluate(() => window.__game.getState().shelves.length);
check("家具のあるマスに棚は置けない", shelvesN === 1);
await page.evaluate(() => window.__game.getState().setPlacingShelf(null));

// ===== 6. 3D ビューで描画 (エラーなく表示) =====
await page.getByRole("button", { name: /3Dビュー/ }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: "/app/.verify/furniture_3d.png" });
check("3D ビューが表示される", await page.locator(".shelf-canvas canvas").isVisible());

// ===== 7. リロードで復元 =====
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.waitForTimeout(300);
furn = await page.evaluate(() => window.__game.getState().furniture);
check("セーブから復元される", furn.length === 1 && furn[0].x === 5 && furn[0].rot === 1);

// ===== 8. 撤去 → 在庫に戻る =====
await page.locator(".shelf-card.furn button[title*='片付ける']").click();
await page.waitForTimeout(200);
const after = await page.evaluate(() => {
  const s = window.__game.getState();
  return { n: s.furniture.length, inv: s.inventory.furniture?.bed ?? 0 };
});
check("片付けると在庫に戻る", after.n === 0 && after.inv === 1, JSON.stringify(after));

await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
