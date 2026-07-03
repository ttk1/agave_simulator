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

// ネタグッズ 6 種を部屋に並べる (棚は撤去して見やすく)
await page.evaluate(() => {
  const kinds = ["plushAgave", "neonSign", "manekiNeko", "trophy", "vending", "goldAgave"];
  const furniture = kinds.map((kind, i) => ({
    id: `f_${kind}`, kind, x: i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 4, y: i < 3 ? 0 : 2,
    rot: 0,
  }));
  window.__game.setState({ shelves: [], furniture, view: "room" });
});
await page.waitForTimeout(500);
await page.getByRole("button", { name: /3Dビュー/ }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "/app/.verify/goods_room.png" });

// ショップのインテリア欄
await page.evaluate(() => window.__game.setState({ view: "shop" }));
await page.waitForTimeout(400);
await page.evaluate(() => {
  document.querySelector("h3:nth-of-type(1)");
  const els = [...document.querySelectorAll("h3")];
  const target = els.find((e) => e.textContent?.includes("インテリア"));
  target?.scrollIntoView();
});
await page.waitForTimeout(300);
await page.screenshot({ path: "/app/.verify/goods_shop.png" });

await browser.close();
console.log("DONE");
