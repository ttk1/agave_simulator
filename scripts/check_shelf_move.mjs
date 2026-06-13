// 棚の移動・回転・向きによる窓光変化の検証
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

// 初期棚は (2,1)。移動ボタン → (0,0) のマスへ
const before = await page.evaluate(() => {
  const s = window.__game.getState();
  return { id: s.shelves[0].id, x: s.shelves[0].x, y: s.shelves[0].y, rot: s.shelves[0].rot };
});
check("初期棚の位置", before.x === 2 && before.y === 1, `(${before.x},${before.y})`);

// 移動ボタンをクリック → バナー表示
await page.locator(".shelf-card button.mini", { hasText: "移動" }).click();
await page.waitForTimeout(200);
check("棚移動モードのバナー表示", await page.locator(".picking-banner").isVisible());
const movingId = await page.evaluate(() => window.__game.getState().movingShelfId);
check("movingShelfId がセットされる", movingId === before.id);

// 空きマス (0,0) をクリック (左上端)
await page.locator(".room-grid .room-cell").first().click();
await page.waitForTimeout(300);
const moved = await page.evaluate(() => {
  const s = window.__game.getState();
  return { x: s.shelves[0].x, y: s.shelves[0].y, moving: s.movingShelfId };
});
check("棚が (0,0) へ移動", moved.x === 0 && moved.y === 0 && moved.moving === null, `(${moved.x},${moved.y})`);

// 同じマスに別の棚があると移動できないこと
await page.evaluate(() => {
  const s = window.__game.getState();
  const sh2 = { ...JSON.parse(JSON.stringify(s.shelves[0])), id: "shelf_b", x: 1, y: 0, name: "ラックB" };
  window.__game.setState({ shelves: [...s.shelves, sh2] });
});
await page.locator(".shelf-card", { hasText: "ラックB" }).locator("button.mini", { hasText: "移動" }).click();
await page.waitForTimeout(150);
await page.locator(".room-grid .room-cell").first().click(); // (0,0) は埋まっている
await page.waitForTimeout(200);
const blocked = await page.evaluate(() => {
  const b = window.__game.getState().shelves.find((s) => s.id === "shelf_b");
  return { x: b.x, y: b.y, toast: window.__game.getState().toast };
});
check("既に棚があるマスへは移動できない", blocked.x === 1 && blocked.y === 0, `toast="${blocked.toast}"`);
await page.evaluate(() => window.__game.getState().startMoveShelf(null));

// 回転: rot を 0→2 にして窓光が増えることを確認 (棚を窓際 y=0 のまま)
// 向きによる光量を測る: 株を最上段に置いて1日進める
const measure = async (rot) => {
  await page.evaluate((rot) => {
    const game = window.__game;
    const s = game.getState();
    const top = s.shelves[0].levels.length - 1;
    const p = {
      id: "rot_test", speciesId: "raijin", name: "向きテスト",
      genetics: { compact: 0.5, thick: 0.5, spine: 0.4, growth: 0.7, hue: 0, variegation: 0, vtype: "margin" },
      geneticsKnown: true, stage: "plant", sownDay: 1,
      leaves: Array.from({ length: 8 }, (_, i) => ({ len: 1, width: 1, thick: 0.8, etiole: 0.1, hueShift: 0, born: i })),
      growthProgress: 0, leafScale: 0.6, moisture: 0.7, health: 100, rootBound: 0,
      baseFertDays: 0, liquidFertDays: 0, potSize: 1, soil: "akadama", stressDays: 0,
      lightAvg: 0.4, daysSinceWater: 1, rot: 0, pest: false,
    };
    const shelves = s.shelves.map((sh, i) => {
      if (i !== 0) return sh;
      const levels = sh.levels.map((lv, li) => (li !== top ? { ...lv, led: null } : { ...lv, slots: ["rot_test", null, null], led: null }));
      return { ...sh, x: 2, y: 0, rot, levels };
    });
    game.setState({ plants: { rot_test: p }, shelves, day: 95 }); // 夏で日射強め
    game.getState().advanceDays(1);
  }, rot);
  await page.waitForTimeout(200);
  const v = await page.evaluate(() => window.__game.getState().plants.rot_test.lightAvg);
  await page.evaluate(() => window.__game.getState().closeReport());
  return v;
};
// ラックは背面開放なので、正面/背面が窓を向く向きは同等の採光になる
const backToWindow = await measure(0); // 背面が窓
const faceWindow = await measure(2); // 正面が窓
const sideways = await measure(1); // 横向き
check(
  "正面/背面が窓のときは採光が同等 (背面開放)",
  Math.abs(faceWindow - backToWindow) < 0.005,
  `(背面 ${backToWindow.toFixed(3)} / 正面 ${faceWindow.toFixed(3)})`,
);
check(
  "横向きは僅かに採光が落ちる",
  sideways < backToWindow && sideways > backToWindow * 0.7,
  `(正対 ${backToWindow.toFixed(3)} → 横向き ${sideways.toFixed(3)})`,
);

// 3Dビューでの描画 (回転反映) スクショ
await page.evaluate(() => window.__game.setState({ view: "room" }));
await page.getByRole("button", { name: /3Dビュー/ }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: "/app/.verify/shelf_rotated_3d.png" });

await browser.close();
console.log(ok ? "RESULT: OK" : "RESULT: NG");
process.exit(ok ? 0 : 1);
