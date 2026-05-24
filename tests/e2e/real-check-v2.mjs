import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SHOTS_DIR = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots';
fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function shot(page, name) {
  const p = path.join(SHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`[screenshot] ${name}`);
}

function w(ms) { return new Promise(r => setTimeout(r, ms)); }

const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server']
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') console.log(`[page error] ${msg.text()}`);
});
page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

// =========================================================
// PART 1: 首页检查
// =========================================================
console.log('\n=== STEP 1: 首页 ===');
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await w(4000);
await page.waitForSelector('button', { timeout: 10000 }).catch(() => {});

const homeBodyText = await page.locator('body').innerText().catch(() => '');
console.log('Homepage body (500):', homeBodyText.slice(0, 500));
await shot(page, '01-homepage');

// =========================================================
// PART 2: 新建项目向导 — 快速创作流程截图
// =========================================================
console.log('\n=== STEP 2: 新建项目向导 ===');

// Click 新建项目
await page.locator('button').filter({ hasText: /新建项目/ }).first().click();
await w(1500);
await shot(page, '02-create-mode-select');

// 选择"精品创作" (deep mode — more interesting to test)
const deepModeBtn = page.locator('.wizard-mode-card, [data-mode], button, .card').filter({ hasText: /精品创作|深度/ }).first();
const hasDeeep = await deepModeBtn.count();
console.log(`Deep mode button found: ${hasDeeep}`);
if (hasDeeep > 0) {
  await deepModeBtn.click();
} else {
  // Fall back to first mode card
  await page.locator('.wizard-mode-card, [data-mode]').first().click().catch(async () => {
    // Click 快速创作
    await page.locator('button, .card').filter({ hasText: /快速创作/ }).first().click();
  });
}
await w(1500);
await shot(page, '02b-wizard-step1');

// Check what wizard step we are at
const wizardBody = await page.locator('body').innerText().catch(() => '');
console.log('Wizard body:', wizardBody.slice(0, 800));

// Try to fill concept if there's a textarea/input visible
const visibleInputs = await page.locator('textarea:visible, input[type="text"]:visible').all();
console.log(`Visible inputs: ${visibleInputs.length}`);
for (const inp of visibleInputs) {
  const ph = await inp.getAttribute('placeholder').catch(() => '');
  console.log(`  visible input: "${ph}"`);
}

if (visibleInputs.length > 0) {
  // Fill concept
  await visibleInputs[0].fill('都市悬疑剧，女主是刑警，调查连环失踪案，发现背后是一个AI系统');
  await w(500);
  await shot(page, '02c-concept-filled');
}

// Look for next/confirm buttons
const nextBtns = await page.locator('button:visible').filter({ hasText: /下一步|确定|继续|开始|生成|创建|next/i }).all();
console.log(`Next buttons: ${nextBtns.length}`);
for (const b of nextBtns) {
  console.log(`  next btn: "${await b.textContent().catch(()=>'')}"`)
}
if (nextBtns.length > 0) {
  await nextBtns[0].click();
  await w(2000);
  await shot(page, '02d-wizard-step2');
}

// Keep walking through wizard steps
for (let i = 0; i < 6; i++) {
  const body = await page.locator('body').innerText().catch(() => '');
  console.log(`Wizard step ${i}: ${body.slice(0, 200)}`);

  // Fill any visible inputs
  const inps = await page.locator('textarea:visible, input[type="text"]:visible').all();
  for (const inp of inps) {
    const val = await inp.inputValue().catch(() => '');
    if (!val) {
      await inp.fill('都市悬疑，女刑警调查AI系统主导的连环失踪案').catch(() => {});
    }
  }

  // Check for radio/select options
  const opts = await page.locator('[role="radio"]:visible, .option-card:visible, .genre-tag:visible').all();
  if (opts.length > 0) {
    console.log(`  Clicking option: "${await opts[0].textContent().catch(()=>'')}"`)
    await opts[0].click().catch(() => {});
    await w(300);
  }

  const next = await page.locator('button:visible').filter({ hasText: /下一步|继续|生成|创建|完成|开始创作/i }).first();
  const hasNext = await next.count();
  if (hasNext) {
    const t = await next.textContent().catch(() => '');
    console.log(`  Clicking: "${t}"`);
    await next.click();
    await w(3000);
    await shot(page, `02-wizard-step-${i+3}`);
  } else {
    console.log('  No next button found, breaking wizard loop');
    break;
  }

  // If we've left the wizard
  const stillWizard = await page.locator('.wizard, .modal, [class*="wizard"], [class*="create-dialog"]').count();
  if (stillWizard === 0) {
    console.log('Left wizard');
    break;
  }
}

await w(3000);
await shot(page, '03-after-wizard');
const afterWizardBody = await page.locator('body').innerText().catch(() => '');
console.log('After wizard:', afterWizardBody.slice(0, 600));

// =========================================================
// PART 3: 打开已有项目 — 走所有步骤
// =========================================================
// Navigate back to project list if needed
const isOnProject = await page.locator('#stepper-nav .step-button, .step-button').count();
console.log(`\n=== STEP 3: Check if on project (step buttons: ${isOnProject}) ===`);

if (isOnProject === 0) {
  // Go back to project list
  const homeBtn = await page.locator('button').filter({ hasText: /项目中心/ }).first();
  if (await homeBtn.count()) {
    await homeBtn.click();
    await w(1500);
  }
  await shot(page, '03b-back-to-home');

  // Open first project
  const continueBtn = await page.locator('button').filter({ hasText: /继续创作/ }).first();
  await continueBtn.click();
  await w(2000);
}

await shot(page, '03c-project-open');
const projectBody = await page.locator('body').innerText().catch(() => '');
console.log('Project body:', projectBody.slice(0, 400));

// =========================================================
// PART 4: 结构骨架
// =========================================================
console.log('\n=== STEP 4: 结构骨架 ===');
const structBtn = page.locator('.step-button.step-button--structure');
if (await structBtn.count()) {
  await structBtn.first().click();
  await w(2000);
}
await shot(page, '04-structure');
const structBody = await page.locator('body').innerText().catch(() => '');
console.log('Structure body:', structBody.slice(0, 1000));

// =========================================================
// PART 5: 人物核心
// =========================================================
console.log('\n=== STEP 5: 人物核心 ===');
const charBtn = page.locator('.step-button.step-button--characters');
if (await charBtn.count()) {
  await charBtn.click();
  await w(2000);
}
await shot(page, '05-characters');
const charBody = await page.locator('body').innerText().catch(() => '');
console.log('Characters body:', charBody.slice(0, 1500));

// =========================================================
// PART 6: 关系张力
// =========================================================
console.log('\n=== STEP 6: 关系张力 ===');
const relBtn = page.locator('.step-button.step-button--relationships');
if (await relBtn.count()) {
  await relBtn.click();
  await w(2000);
}
await shot(page, '06-relationships');
const relBody = await page.locator('body').innerText().catch(() => '');
console.log('Relationships body:', relBody.slice(0, 1000));

// =========================================================
// PART 7: 剧情开发
// =========================================================
console.log('\n=== STEP 7: 剧情开发 ===');
const plotBtn = page.locator('.step-button.step-button--plots');
if (await plotBtn.count()) {
  await plotBtn.click();
  await w(2000);
}
await shot(page, '07-plots');
const plotBody = await page.locator('body').innerText().catch(() => '');
console.log('Plots body:', plotBody.slice(0, 1000));

// =========================================================
// PART 8: 沉淀锁定
// =========================================================
console.log('\n=== STEP 8: 沉淀锁定 ===');
const lockBtn = page.locator('.step-button.step-button--locks');
if (await lockBtn.count()) {
  await lockBtn.click();
  await w(2000);
}
await shot(page, '08-locks');
const lockBody = await page.locator('body').innerText().catch(() => '');
console.log('Locks body:', lockBody.slice(0, 1000));

// =========================================================
// PART 9: 场景拆解
// =========================================================
console.log('\n=== STEP 9: 场景拆解 ===');
const sceneBtn = page.locator('.step-button.step-button--scenes');
if (await sceneBtn.count()) {
  await sceneBtn.click();
  await w(2000);
}
await shot(page, '09-scenes');
const sceneBody = await page.locator('body').innerText().catch(() => '');
console.log('Scenes body:', sceneBody.slice(0, 1500));

// =========================================================
// PART 10: Story Core check (故事核心 wizard step)
// =========================================================
// Check if there's a story-core panel
console.log('\n=== STEP 10: Check for story-core panel ===');
const storyBtn = page.locator('.step-button.step-button--story-core');
const hasStoryBtn = await storyBtn.count();
console.log(`Story-core btn: ${hasStoryBtn}`);
if (hasStoryBtn) {
  await storyBtn.click();
  await w(2000);
  await shot(page, '10-story-core');
}

console.log('\n=== ALL DONE ===');
await browser.close();
