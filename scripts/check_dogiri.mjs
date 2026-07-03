import { chromium } from "playwright";
const BASE = process.env.TARGET_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exitCode = 1;
};

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".hud");
await page.getByRole("button", { name: "はじめる" }).click();

// 成熟株 (葉12枚・健康90) を棚に置いて選択
await page.evaluate(() => {
  const game = window.__game;
  const p = {
    id: "mother", speciesId: "raijin", name: "雷神 #1",
    genetics: { compact: 0.5, thick: 0.55, spine: 0.4, growth: 0.7, hue: -0.2, variegation: 0, vtype: "margin" },
    geneticsKnown: true, stage: "plant", sownDay: 1,
    leaves: Array.from({ length: 12 }, (_, i) => ({
      len: 1, width: 1, thick: 0.85, etiole: 0.05, hueShift: Math.sin(i) * 0.04, born: i * 5,
    })),
    growthProgress: 0, leafScale: 1.0, moisture: 0.8, health: 90, rootBound: 0,
    baseFertDays: 0, liquidFertDays: 0, potSize: 2, soil: "akadama", stressDays: 0,
    lightAvg: 0.7, daysSinceWater: 1, rot: 0, pest: false,
  };
  const spec = { levels: 2, cols: 3 };
  const levels = Array.from({ length: spec.levels }, () => ({
    slots: Array.from({ length: spec.cols }, () => null),
    led: null,
  }));
  levels[1].slots[1] = "mother";
  const shelf = { id: "sh", kind: "small", x: 2, y: 0, rot: 0, name: "ラック1", levels };
  game.setState({
    plants: { mother: p }, shelves: [shelf], bench: [],
    view: "shelf", activeShelfId: "sh", selectedPlantId: "mother", day: 95,
  });
});
await page.waitForSelector(".plant-viewer canvas");
await page.waitForTimeout(1200);

console.log("== 1. 胴切りサブパネルを開く");
await page.getByRole("button", { name: "🔪 胴切り" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/app/.verify/dg_01_panel.png" });

console.log("== 2. 切る");
await page.getByRole("button", { name: /^切る/ }).click();
await page.waitForTimeout(300);
const afterCut = await page.evaluate(() => {
  const p = window.__game.getState().plants.mother;
  return { leaves: p.leaves.length, dogiri: p.dogiri, stress: p.stressDays, health: p.health };
});
console.log("after cut:", JSON.stringify(afterCut));
if (!afterCut.dogiri || afterCut.dogiri.sproutLeft !== 14) fail("dogiri state not set");
if (afterCut.leaves !== 5) fail(`leaves should be 5, got ${afterCut.leaves}`);
await page.waitForTimeout(1200);
await page.screenshot({ path: "/app/.verify/dg_02_cut.png" });

// 販売不可の確認
const saleBlocked = await page.getByText("胴切りチャレンジ中は販売できない").count();
if (saleBlocked !== 1) fail("sale should be blocked during dogiri");

console.log("== 3. 15日経過 (5日ごとに水やり)");
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => {
    const g = window.__game.getState();
    g.waterPlant("mother");
    g.advanceDays(5);
    window.__game.getState().closeReport();
  });
  await page.waitForTimeout(200);
}
const sprouted = await page.evaluate(() => {
  const p = window.__game.getState().plants.mother;
  return { dogiri: p.dogiri, leaves: p.leaves.length, report: window.__game.getState().report?.lines ?? [] };
});
console.log("after 15 days:", JSON.stringify(sprouted.dogiri), "leaves:", sprouted.leaves);
if (!sprouted.dogiri || sprouted.dogiri.sproutLeft > 0) fail("should have sprouted by now");
if (!(sprouted.dogiri?.buds > 0)) fail("buds should be > 0 for a healthy big plant");
if (sprouted.leaves !== 5) fail("no new leaves should grow during dogiri");
await page.waitForTimeout(1500);
await page.screenshot({ path: "/app/.verify/dg_03_sprouted.png" });

console.log("== 4. 子株を外す");
await page.getByRole("button", { name: /子株を外す/ }).click();
await page.waitForTimeout(300);
const harvested = await page.evaluate(() => {
  const s = window.__game.getState();
  const pups = s.bench.map((id) => s.plants[id]);
  return {
    benchCount: s.bench.length,
    motherDogiri: s.plants.mother.dogiri ?? null,
    pupGenetics: pups[0]?.genetics ?? null,
    pupSpecies: pups[0]?.speciesId,
    pupKnown: pups[0]?.geneticsKnown,
  };
});
console.log("harvested:", JSON.stringify(harvested));
if (harvested.benchCount !== sprouted.dogiri.buds) fail("bench should hold all pups");
if (harvested.motherDogiri !== null) fail("mother dogiri should be cleared after full harvest");
if (harvested.pupGenetics?.growth !== 0.7 || harvested.pupGenetics?.compact !== 0.5) {
  fail("pup should clone mother genetics");
}
if (!harvested.pupKnown) fail("pup genetics should be known");
await page.screenshot({ path: "/app/.verify/dg_04_harvested.png" });

console.log("== 5. 台の成長再開を確認 (30日)");
const before = await page.evaluate(() => window.__game.getState().plants.mother.leaves.length);
await page.evaluate(() => {
  const g = window.__game.getState();
  for (let i = 0; i < 6; i++) {
    window.__game.getState().waterPlant("mother");
    window.__game.getState().advanceDays(5);
    window.__game.getState().closeReport();
  }
  void g;
});
const after = await page.evaluate(() => window.__game.getState().plants.mother.leaves.length);
console.log(`mother leaves: ${before} -> ${after}`);
if (after <= before) fail("mother should resume growing after harvest");

const errors = await page.evaluate(() => window.__errors ?? []);
if (errors.length > 0) fail("console errors: " + errors.join(" / "));

await browser.close();
console.log(process.exitCode ? "RESULT: NG" : "RESULT: OK");
