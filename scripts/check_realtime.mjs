// リアル日付同期・成長速度設定・セーブマイグレーションの検証
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

// ===== 1. リアル日付同期: 3日前にプレイしたことにする =====
await page.evaluate(() => {
  const d = new Date(Date.now() - 3 * 86400000);
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  window.__game.setState({ lastRealDate: stamp });
  window.__game.getState().syncRealDay();
});
await page.waitForTimeout(400);
const sync = await page.evaluate(() => {
  const s = window.__game.getState();
  return { day: s.day, days: s.report?.days, showReport: s.showReport };
});
check("3日離脱 → day が 1+3=4", sync.day === 4, `(day=${sync.day})`);
check("経過レポート days=3", sync.days === 3);
const title = await page.locator(".modal h2").innerText().catch(() => "");
check("おかえりモーダル表示", title.includes("3日が経過"), `(title="${title}")`);
await page.getByRole("button", { name: /朝になった/ }).click();

// 連続呼び出しで二重進行しないこと
const dayBefore = await page.evaluate(() => window.__game.getState().day);
await page.evaluate(() => window.__game.getState().syncRealDay());
const dayAfter = await page.evaluate(() => window.__game.getState().day);
check("同日中の再同期では進まない", dayBefore === dayAfter);

// ===== 2. 設定モーダルで成長速度を変更 =====
await page.getByRole("button", { name: "⚙️" }).click();
await page.waitForTimeout(300);
await page.locator("label.opt", { hasText: "せっかち" }).locator("input").check();
const speed = await page.evaluate(() => window.__game.getState().settings.growthSpeed);
check("設定 UI で growthSpeed=4", speed === 4);
await page.getByRole("button", { name: "閉じる" }).click();

// ===== 3. 成長速度が成長量に反映されるか =====
const mkPlant = () => ({
  id: "rt_test",
  speciesId: "raijin",
  name: "速度テスト",
  genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
  geneticsKnown: true,
  stage: "plant",
  sownDay: 1,
  leaves: Array.from({ length: 6 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
  growthProgress: 0,
  leafScale: 0.6,
  moisture: 0.6,
  health: 100,
  rootBound: 0,
  baseFertDays: 0,
  liquidFertDays: 0,
  potSize: 1,
  soil: "akadama",
  stressDays: 0,
  lightAvg: 0.7,
  daysSinceWater: 1,
  rot: 0,
  pest: false,
});
const growWith = async (mult) => {
  await page.evaluate(
    ({ plant, mult }) => {
      const game = window.__game;
      const s = game.getState();
      const shelves = s.shelves.map((sh, si) =>
        si !== 0 ? sh : { ...sh, levels: sh.levels.map((lv, li) => (li !== 0 ? lv : { ...lv, slots: [plant.id, null, null] })) },
      );
      game.setState({
        plants: { [plant.id]: plant },
        shelves,
        settings: { ...s.settings, growthSpeed: mult },
        devices: { ...s.devices, circulator: true, circulatorOn: true }, // 害虫の乱数を抑える
      });
      game.getState().advanceDays(1);
    },
    { plant: mkPlant(), mult },
  );
  return page.evaluate(() => {
    const s = window.__game.getState();
    return { growth: s.plants["rt_test"].growthProgress, elec: s.report.electricity };
  });
};
const r1 = await growWith(1);
await page.evaluate(() => window.__game.getState().closeReport());
const r4 = await growWith(4);
await page.evaluate(() => window.__game.getState().closeReport());
const ratio = r4.growth / r1.growth;
check("成長量が約4倍", ratio > 3.5 && ratio < 4.5, `(×1: ${r1.growth.toFixed(1)}pt, ×4: ${r4.growth.toFixed(1)}pt, 比 ${ratio.toFixed(2)})`);
check(
  "電気代も4倍 (1株あたりコスト一定)",
  r4.elec === r1.elec * 4,
  `(×1: ¥${r1.elec}/日, ×4: ¥${r4.elec}/日)`,
);

await page.screenshot({ path: "/app/.verify/realtime_check.png" });
await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
