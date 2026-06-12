/* eslint-disable no-console */
// Playwright によるアガベシミュレーターの E2E 動作確認スクリプト。
// dev サーバー (host.docker.internal:5173) に接続して操作・スクショ撮影する。
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.TARGET_URL ?? "http://host.docker.internal:5173/";
const OUT = "/app/.verify";
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
}

function step(msg) {
  console.log("== " + msg);
}

try {
  step("1. トップページを開く");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hud", { timeout: 20000 });
  // クリーンな状態から検証する
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hud", { timeout: 20000 });
  await page.waitForTimeout(800);
  await shot("01_help");

  step("2. ヘルプを閉じる");
  const start = page.getByRole("button", { name: "はじめる" });
  if (await start.isVisible().catch(() => false)) await start.click();
  await page.waitForTimeout(400);
  await shot("02_room");

  step("3. 棚を開く (3D)");
  await page.locator(".shelf-card").first().click();
  await page.waitForTimeout(2500); // WebGL 初期化待ち
  await shot("03_shelf3d");

  step("4. 空きスロットをクリックして種まきダイアログを開く");
  const canvas = page.locator(".shelf-canvas canvas");
  const box = await canvas.boundingBox();
  // 1段目のスロット (下段・手前) を狙って何点かクリック
  const candidates = [
    [0.5, 0.78], [0.35, 0.78], [0.65, 0.78], [0.5, 0.72], [0.32, 0.72], [0.68, 0.72],
    [0.5, 0.45], [0.35, 0.45], [0.65, 0.45],
  ];
  let dialogOpen = false;
  for (const [fx, fy] of candidates) {
    await canvas.click({ position: { x: box.width * fx, y: box.height * fy } });
    await page.waitForTimeout(350);
    if (await page.locator(".modal").isVisible().catch(() => false)) {
      dialogOpen = true;
      break;
    }
  }
  if (!dialogOpen) throw new Error("種まきダイアログが開けなかった");
  await shot("04_sow_dialog");

  step("5. 雷神の種をまく");
  await page.getByRole("button", { name: "まく", exact: true }).click();
  await page.waitForTimeout(600);
  await shot("05_sown");

  step("6. 日送り x14 (発芽と成長を待つ)");
  for (let i = 0; i < 14; i++) {
    await page.getByRole("button", { name: /次の日へ/ }).click();
    await page.waitForTimeout(250);
    const morning = page.getByRole("button", { name: /朝になった/ });
    if (await morning.isVisible().catch(() => false)) await morning.click();
    await page.waitForTimeout(150);
    // 株を選んで水やり (2日おき)
    if (i % 2 === 0) {
      const slotClicked = await canvas
        .click({ position: { x: box.width * 0.5, y: box.height * 0.78 } })
        .then(() => true)
        .catch(() => false);
      if (slotClicked) {
        await page.waitForTimeout(300);
        const water = page.getByRole("button", { name: /水やり/ });
        if (await water.isVisible().catch(() => false)) await water.click();
        await page.waitForTimeout(200);
      }
    }
  }
  await page.waitForTimeout(1500);
  await shot("06_after14days");

  step("7. 株の詳細パネル (3D ビューア)");
  await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.78 } });
  await page.waitForTimeout(2000);
  await shot("07_plant_panel");

  step("7b. 成熟株を注入して描画確認 (締まり個体 vs 徒長個体)");
  await page.evaluate(() => {
    const game = window.__game;
    const s = game.getState();
    const mkLeaf = (etiole, compact, thick, i) => ({
      len: (1.55 - 0.75 * compact) * (1 + 0.95 * etiole) * (0.95 + Math.sin(i * 3.7) * 0.05),
      width: (0.72 + 0.55 * thick) * (1 - 0.4 * etiole),
      thick: (0.5 + 0.85 * thick) * (1 - 0.5 * etiole),
      etiole,
      hueShift: Math.sin(i * 2.1) * 0.06,
      born: i,
    });
    const mkPlant = (id, name, etiole, compact, thick, spine, varie) => ({
      id,
      speciesId: "hakugei",
      name,
      genetics: { compact, thick, spine, growth: 0.5, hue: -0.1, variegation: varie, vtype: "margin" },
      geneticsKnown: true,
      stage: "plant",
      sownDay: 1,
      leaves: Array.from({ length: 26 }, (_, i) => mkLeaf(etiole, compact, thick, i)),
      growthProgress: 0,
      leafScale: 1.15,
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
    });
    const a = mkPlant("test_compact", "検証·締まり", 0.0, 0.9, 0.9, 0.95, 0);
    const b = mkPlant("test_etiole", "検証·徒長", 0.85, 0.9, 0.9, 0.95, 0);
    const c = mkPlant("test_varie", "検証·斑入り", 0.1, 0.7, 0.7, 0.6, 0.8);
    const shelves = s.shelves.map((sh, si) =>
      si !== 0
        ? sh
        : {
            ...sh,
            levels: sh.levels.map((lv, li) =>
              li !== 1 ? lv : { ...lv, slots: ["test_compact", "test_etiole", "test_varie"] },
            ),
          },
    );
    game.setState({ plants: { ...s.plants, [a.id]: a, [b.id]: b, [c.id]: c }, shelves });
  });
  await page.waitForTimeout(1800);
  await shot("07b_mature_shelf");
  // 締まり個体の詳細
  await page.evaluate(() => window.__game.setState({ selectedPlantId: "test_compact" }));
  await page.waitForTimeout(1800);
  await shot("07c_compact_detail");
  await page.evaluate(() => window.__game.setState({ selectedPlantId: "test_etiole" }));
  await page.waitForTimeout(1800);
  await shot("07d_etiole_detail");
  await page.evaluate(() => window.__game.setState({ selectedPlantId: "test_varie" }));
  await page.waitForTimeout(1800);
  await shot("07e_varie_detail");
  await page.evaluate(() => window.__game.setState({ selectedPlantId: null }));

  step("8. ショップで子株 (白鯨) を購入");
  await page.getByRole("button", { name: /ショップ/ }).click();
  await page.waitForTimeout(400);
  await shot("08_shop");
  const pupButtons = page.getByRole("button", { name: "子株を買う" });
  await pupButtons.nth(5).click(); // 白鯨
  await page.waitForTimeout(400);

  step("9. 部屋ビュー: 作業台の子株を選択");
  await page.getByRole("button", { name: /部屋/ }).click();
  await page.waitForTimeout(400);
  const benchPlant = page.locator(".card button", { hasText: "白鯨" }).first();
  await benchPlant.click();
  await page.waitForTimeout(2200);
  await shot("09_pup_panel");

  step("10. 図鑑");
  await page.getByRole("button", { name: /図鑑/ }).click();
  await page.waitForTimeout(400);
  await shot("10_collection");

  step("11. リロードしてセーブ復元を確認");
  const moneyBefore = await page.locator(".hud .money").innerText();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".hud", { timeout: 20000 });
  await page.waitForTimeout(800);
  const moneyAfter = await page.locator(".hud .money").innerText();
  console.log("money before/after reload:", moneyBefore, moneyAfter);
  if (moneyBefore !== moneyAfter) throw new Error("リロードで所持金が変わった (セーブ失敗?)");
  await shot("11_after_reload");

  console.log("RESULT: OK");
} catch (e) {
  console.log("RESULT: FAIL", e.message);
  await shot("99_failure");
  process.exitCode = 1;
} finally {
  if (errors.length) {
    console.log("--- ブラウザエラー ---");
    errors.slice(0, 20).forEach((e) => console.log(e));
  } else {
    console.log("ブラウザコンソールエラー: なし");
  }
  await browser.close();
}
