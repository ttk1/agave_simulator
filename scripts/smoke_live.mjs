// 公開サイトのスモークチェック
import { chromium } from "playwright";

const URL = process.env.TARGET_URL ?? "https://ttk1.github.io/agave_simulator/";
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});
await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector(".hud", { timeout: 20000 });
await page.getByRole("button", { name: "はじめる" }).click();
await page.locator(".shelf-card").first().click();
await page.waitForTimeout(2500);
const canvasCount = await page.locator("canvas").count();
await page.screenshot({ path: "/app/.verify/live_smoke.png" });
console.log("HUD: OK / canvas:", canvasCount, "/ errors:", errors.length ? errors.join(" | ") : "なし");
await browser.close();
console.log(canvasCount > 0 && errors.length === 0 ? "LIVE SMOKE: OK" : "LIVE SMOKE: NG");
