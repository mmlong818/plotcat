import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const PROJECT_ID = process.env.PID || "project_mpo79am3_tkcfra"; // 晨星 2049 (CLOSE-UP 测试用)
const BASE = "http://127.0.0.1:4173";
const OUT = path.join(process.cwd(), "tests", "e2e", "realcheck-shots", "fountain-viewer");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text()); });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// 在项目列表中点击破壁人
const openBtn = page.locator(`[data-action="open-project"][data-id="${PROJECT_ID}"]`).first();
await openBtn.waitFor({ timeout: 5000 });
await openBtn.click();
await page.waitForTimeout(1200);

// 跳到剧本页：通过 stepper 找到含"剧本"文字的步骤按钮
const stepBtn = page.locator('button:has-text("剧本"), [data-step*="screenplay"], [data-tab="screenplay"]').first();
if (await stepBtn.count()) await stepBtn.click().catch(() => {});
await page.waitForTimeout(800);

await page.screenshot({ path: path.join(OUT, "01-screenplay-page.png"), fullPage: false });

// 监听 popup（window.open）
const [popup] = await Promise.all([
  ctx.waitForEvent("page", { timeout: 8000 }),
  page.locator('[data-action="preview-screenplay-full"]').first().click()
]);
await popup.waitForLoadState("domcontentloaded");
await popup.waitForTimeout(400);
await popup.setViewportSize({ width: 1100, height: 1400 });

await popup.screenshot({ path: path.join(OUT, "02-fountain-preview-top.png"), fullPage: false });
await popup.screenshot({ path: path.join(OUT, "03-fountain-preview-full.png"), fullPage: true });

// 验证关键 DOM 元素存在
const counts = await popup.evaluate(() => ({
  scene: document.querySelectorAll(".fv-scene").length,
  dialogue: document.querySelectorAll(".fv-dialogue").length,
  character: document.querySelectorAll(".fv-character").length,
  action: document.querySelectorAll(".fv-action").length,
  paren: document.querySelectorAll(".fv-paren").length,
  transition: document.querySelectorAll(".fv-transition").length,
  titlePage: document.querySelectorAll(".fv-title-page").length,
  toolbar: document.querySelectorAll(".fv-toolbar").length,
  rawHidden: document.getElementById("fv-raw")?.style.display === "none"
}));
console.log("[verify]", JSON.stringify(counts, null, 2));

// 滚动到 CLOSE-UP / 第一场具体内容那一段
await popup.evaluate(() => {
  const shot = document.querySelector(".fv-shot");
  if (shot) shot.scrollIntoView({ block: "center" });
});
await popup.waitForTimeout(200);
await popup.screenshot({ path: path.join(OUT, "04-fountain-preview-closeup.png"), fullPage: false });

await popup.evaluate(() => window.scrollTo(0, 1800));
await popup.waitForTimeout(200);
await popup.screenshot({ path: path.join(OUT, "05-fountain-preview-dialogue.png"), fullPage: false });

await browser.close();
console.log("done. shots in", OUT);
