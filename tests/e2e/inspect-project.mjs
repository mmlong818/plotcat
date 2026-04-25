import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'project_moe93eqh_wsdpcd';
const SHOTS_DIR = path.join(__dirname, 'inspect-shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1100 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`CONSOLE: ${m.text()}`); });

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });

// 进入项目
const card = page.locator(`[data-action="open-project"][data-id="${PROJECT_ID}"]`);
if (await card.count() === 0) {
  log('找不到项目卡片，dump project list');
  process.exit(1);
}
await card.first().click();
await page.waitForTimeout(1500);

// 扫描所有 step 按钮（顶部 6 个数字标签）
const stepButtons = await page.locator('button').evaluateAll(btns => btns
  .filter(b => /^\d\s/.test(b.textContent.trim()) || /^[1-6]\s+\S+/.test(b.textContent.trim()))
  .map(b => ({ text: b.textContent.trim().slice(0, 20), classes: b.className })));
log(`step buttons: ${stepButtons.length}`);

// 通用方式：点顶部带数字编号的按钮
const checkSteps = ['1 结构骨架', '2 人物核心', '3 关系张力', '4 剧情开发', '5 沉淀锁定', '6 场景拆解'];
const summary = {};

for (const stepLabel of checkSteps) {
  const stepNum = stepLabel.split(' ')[0];
  const stepName = stepLabel.split(' ')[1];
  // 模糊匹配：包含数字+名字
  const btn = page.getByRole('button', { name: new RegExp(stepNum + '.*' + stepName) }).first();
  const btnExists = await btn.count() > 0;
  if (!btnExists) { log(`  ⚠️ step ${stepLabel}: 按钮未找到`); summary[stepLabel] = { error: 'button-not-found' }; continue; }
  await btn.click().catch(e => log(`  click err: ${e.message}`));
  await page.waitForTimeout(900);
  const fname = `step-${stepNum}-${stepName}.png`;
  await page.screenshot({ path: path.join(SHOTS_DIR, fname), fullPage: false });

  // 抓主区域可见文本
  const mainTxt = await page.locator('main, body').first().innerText().catch(() => '');
  // 抓内容空指示词（占位文本数）
  const placeholders = (mainTxt.match(/写下这个|未填写|暂无|尚未|--/g) || []).length;
  // 抓字数（去掉常见 UI 词）
  const trimmed = mainTxt.replace(/[\s\n]/g, '').slice(0, 5000);
  summary[stepLabel] = {
    file: fname,
    contentChars: trimmed.length,
    placeholders,
    sample: mainTxt.slice(0, 200).replace(/\n/g, ' | ')
  };
  log(`  ✓ ${stepLabel}: ${trimmed.length}字, 占位词${placeholders}个`);
}

fs.writeFileSync(path.join(SHOTS_DIR, 'inspect-summary.json'), JSON.stringify({ projectId: PROJECT_ID, summary, pageErrors }, null, 2));

if (pageErrors.length) {
  log(`⚠️ ${pageErrors.length} page errors:`);
  pageErrors.slice(0, 5).forEach(e => console.log('  ', e));
}

log(`Done. shots → ${SHOTS_DIR}`);
await browser.close();
