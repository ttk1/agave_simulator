// 窓まわり3点の修正検証:
//  1. 株詳細画面の「光」に窓の明るさが反映される
//  2. ラック画面で窓に隣接する場合、窓パネルが表示される
//  3. 背面が窓のときも正面と同等の光量 (背面で0にならない)
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
await page.waitForTimeout(300);

const mkPlant = (id) => ({
  id, speciesId: "raijin", name: id,
  genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
  geneticsKnown: true, stage: "plant", sownDay: 1,
  leaves: Array.from({ length: 8 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
  growthProgress: 0, leafScale: 0.6, moisture: 0.7, health: 100, rootBound: 0,
  baseFertDays: 0, liquidFertDays: 0, potSize: 1, soil: "akadama", stressDays: 0,
  lightAvg: 0.4, daysSinceWater: 1, rot: 0, pest: false,
});

// ===== 3. 背面/正面の光量が同等 (LEDなし・窓際最上段) =====
const measureLight = (rot) =>
  page.evaluate((rot) => {
    const game = window.__game;
    const s = game.getState();
    const top = s.shelves[0].levels.length - 1;
    const shelves = s.shelves.map((sh, i) => {
      if (i !== 0) return sh;
      const levels = sh.levels.map((lv, li) =>
        li === top ? { ...lv, slots: ["w", null, null], led: null } : { ...lv, slots: [null, null, null], led: null },
      );
      return { ...sh, x: 2, y: 0, rot, levels };
    });
    game.setState({ plants: { w: { ...window.__mk("w") } }, shelves, day: 95, selectedPlantId: "w", view: "shelf", activeShelfId: shelves[0].id });
    // env.slotLight を直接呼べないので詳細画面の光ラベルから読む
    return null;
  }, rot);

await page.evaluate((mkSrc) => {
  // ブラウザ側に mkPlant を注入
  window.__mk = new Function("id", `return (${mkSrc})(id)`);
}, mkPlant.toString());

// 詳細画面の「光 (現在地)」のバー幅(%)を読む関数
const readLightPct = async () => {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll(".side .stat-row")];
    const row = rows.find((r) => r.querySelector(".name")?.textContent?.includes("光"));
    if (!row) return null;
    const bar = row.querySelector(".statbar > div");
    return bar ? parseFloat(bar.style.width) : null;
  });
};

await measureLight(0); // 背面が窓
await page.waitForTimeout(300);
const backPct = await readLightPct();
await measureLight(2); // 正面が窓
await page.waitForTimeout(300);
const frontPct = await readLightPct();

// ===== 1. 窓の明るさが詳細画面の光に反映 (窓際 vs 部屋の奥で差) =====
const lightAtY = async (y) => {
  await page.evaluate((y) => {
    const game = window.__game;
    const s = game.getState();
    const top = s.shelves[0].levels.length - 1;
    const shelves = s.shelves.map((sh, i) => {
      if (i !== 0) return sh;
      const levels = sh.levels.map((lv, li) =>
        li === top ? { ...lv, slots: ["w", null, null], led: null } : { ...lv, slots: [null, null, null], led: null },
      );
      return { ...sh, x: 2, y, rot: 0, levels };
    });
    game.setState({ plants: { w: window.__mk("w") }, shelves, day: 95, selectedPlantId: "w", view: "shelf", activeShelfId: shelves[0].id });
  }, y);
  await page.waitForTimeout(250);
  return readLightPct();
};
const nearPct = await lightAtY(0);
const farPct = await lightAtY(3);

check("詳細画面の光に窓が反映 (窓際>奥)", nearPct != null && farPct != null && nearPct > farPct + 3, `(窓際 ${nearPct}% vs 奥 ${farPct}%)`);
check("背面でも正面と同等の光量 (背面≧正面*0.95)", backPct != null && frontPct != null && backPct >= frontPct * 0.95, `(背面 ${backPct}% / 正面 ${frontPct}%)`);

// ===== 2. 窓のラック画面表示: パネル(mesh)が描画されるとスクショ確認 =====
await page.evaluate(() => {
  const game = window.__game;
  const s = game.getState();
  const shelves = s.shelves.map((sh, i) => (i === 0 ? { ...sh, x: 2, y: 0, rot: 0 } : sh));
  game.setState({ shelves, view: "shelf", activeShelfId: shelves[0].id, selectedPlantId: null });
});
await page.waitForTimeout(1800);
await page.screenshot({ path: "/app/.verify/shelf_window_near.png" });

// 窓の列から横にずれた棚 (x=0,y=0) は窓由来の光がほぼ無い (面さない)
await page.evaluate(() => {
  const game = window.__game;
  const s = game.getState();
  const top = s.shelves[0].levels.length - 1;
  const shelves = s.shelves.map((sh, i) => {
    if (i !== 0) return sh;
    const levels = sh.levels.map((lv, li) =>
      li === top ? { ...lv, slots: ["w", null, null], led: null } : { ...lv, slots: [null, null, null], led: null },
    );
    return { ...sh, x: 0, y: 0, rot: 0, levels };
  });
  game.setState({ plants: { w: window.__mk("w") }, shelves, day: 95, selectedPlantId: "w", view: "shelf", activeShelfId: shelves[0].id });
});
await page.waitForTimeout(250);
const sidePct = await readLightPct();
check("窓の列から横にずれた棚は採光が乏しい (奥と同程度以下)", sidePct != null && sidePct <= farPct + 2, `(横ずれ ${sidePct}% vs 奥 ${farPct}%)`);

await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
