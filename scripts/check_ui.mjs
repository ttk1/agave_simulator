// 全ビューの見た目確認用スクリーンショット
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
await page.waitForTimeout(400);
await page.screenshot({ path: "/app/.verify/ui_room.png" });

await page.getByRole("button", { name: /ショップ/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/app/.verify/ui_shop.png" });

await page.getByRole("button", { name: /図鑑/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/app/.verify/ui_collection.png" });

await page.getByRole("button", { name: "⚙️" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/app/.verify/ui_settings.png" });
await page.getByRole("button", { name: "閉じる" }).click();

// 株を置いた棚 + 詳細パネル + 移動モード
await page.evaluate(() => {
  const game = window.__game;
  const s = game.getState();
  const p = {
    id: "ui_test",
    speciesId: "hakugei",
    name: "UIテスト株",
    genetics: { compact: 0.85, thick: 0.85, spine: 0.9, growth: 0.5, hue: -0.1, variegation: 0, vtype: "margin" },
    geneticsKnown: true,
    stage: "plant",
    sownDay: 1,
    leaves: Array.from({ length: 20 }, (_, i) => ({
      len: 1, width: 1.1, thick: 1.2, etiole: 0, hueShift: Math.sin(i) * 0.05, born: i,
    })),
    growthProgress: 0,
    leafScale: 1.0,
    moisture: 0.5,
    health: 95,
    rootBound: 0.2,
    baseFertDays: 30,
    liquidFertDays: 0,
    potSize: 2,
    soil: "pumice",
    stressDays: 0,
    lightAvg: 0.8,
    daysSinceWater: 2,
    rot: 0,
    pest: false,
  };
  const shelves = s.shelves.map((sh, si) =>
    si !== 0 ? sh : { ...sh, levels: sh.levels.map((lv, li) => (li !== 0 ? lv : { ...lv, slots: ["ui_test", null, null] })) },
  );
  game.setState({
    plants: { ...s.plants, [p.id]: p },
    shelves,
    view: "shelf",
    activeShelfId: shelves[0].id,
    selectedPlantId: "ui_test",
  });
});
await page.waitForTimeout(2000);
await page.screenshot({ path: "/app/.verify/ui_shelf_panel.png" });

await page.getByRole("button", { name: /移動/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/app/.verify/ui_move_banner.png" });

await browser.close();
console.log("DONE");
