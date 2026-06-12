// 4K / FHD でのレイアウト確認用スクリーンショット撮影
import { chromium } from "playwright";

const BASE = process.env.TARGET_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();

async function capture(width, height, tag) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hud");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hud");
  await page.getByRole("button", { name: "はじめる" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/app/.verify/4k_${tag}_room.png` });

  // 成熟株を注入して棚ビュー + 詳細パネル
  await page.evaluate(() => {
    const game = window.__game;
    const s = game.getState();
    const leaves = Array.from({ length: 24 }, (_, i) => ({
      len: 1.0 + Math.sin(i * 3.7) * 0.05,
      width: 1.1,
      thick: 1.2,
      etiole: 0,
      hueShift: Math.sin(i * 2.1) * 0.06,
      born: i,
    }));
    const p = {
      id: "test_4k",
      speciesId: "hakugei",
      name: "検証株",
      genetics: { compact: 0.85, thick: 0.85, spine: 0.9, growth: 0.5, hue: -0.1, variegation: 0, vtype: "margin" },
      geneticsKnown: true,
      stage: "plant",
      sownDay: 1,
      leaves,
      growthProgress: 0,
      leafScale: 1.1,
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
      si !== 0
        ? sh
        : { ...sh, levels: sh.levels.map((lv, li) => (li !== 0 ? lv : { ...lv, slots: ["test_4k", null, null] })) },
    );
    game.setState({
      plants: { ...s.plants, [p.id]: p },
      shelves,
      view: "shelf",
      activeShelfId: shelves[0].id,
      selectedPlantId: "test_4k",
    });
  });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `/app/.verify/4k_${tag}_shelf.png` });
  await page.close();
  console.log("captured:", tag);
}

await capture(3840, 2160, "uhd");
await capture(1500, 950, "fhd");
await browser.close();
console.log("DONE");
