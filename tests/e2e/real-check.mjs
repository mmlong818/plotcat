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

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server']
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN'
});
const page = await ctx.newPage();

const log = [];
function record(step, notes) {
  console.log(`\n=== ${step} ===`);
  console.log(notes);
  log.push({ step, notes });
}

// ---- 1. 首页 ----
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await wait(4000);
// Wait for buttons to appear
await page.waitForSelector('button', { timeout: 10000 }).catch(() => {});
await wait(500);
await shot(page, '01-homepage');
const title = await page.title();
const h1 = await page.locator('h1').first().textContent().catch(() => '(no h1)');
const bodyText = await page.locator('body').innerText().catch(() => '');
record('首页', `title: ${title} | h1: ${h1} | body: ${bodyText.slice(0, 400)}`);

// ---- 2. 新建项目 ----
const newBtns = await page.locator('button, a').filter({ hasText: /新建|创建|新项目|create|new/i }).all();
console.log(`Found ${newBtns.length} create buttons`);
for (const btn of newBtns) {
  const txt = await btn.textContent().catch(() => '');
  console.log(`  btn: "${txt}"`);
}

let clicked = false;
for (const btn of newBtns) {
  try {
    await btn.click();
    clicked = true;
    break;
  } catch {}
}

await wait(1500);
await shot(page, '02-after-new-click');

const inputs = await page.locator('input[type="text"], textarea').all();
console.log(`Found ${inputs.length} text inputs`);
for (const inp of inputs) {
  const ph = await inp.getAttribute('placeholder').catch(() => '');
  const name = await inp.getAttribute('name').catch(() => '');
  console.log(`  input placeholder="${ph}" name="${name}"`);
}

const conceptText = '都市悬疑剧，女主是刑警，调查连环失踪案，发现背后是一个AI系统';
let filled = false;
for (const inp of inputs) {
  try {
    await inp.fill(conceptText);
    filled = true;
    console.log('Filled concept input');
    break;
  } catch {}
}

await wait(500);
await shot(page, '03-filled-concept');

const submitBtns = await page.locator('button').filter({ hasText: /确定|提交|创建|开始|下一步|next|submit|create/i }).all();
for (const btn of submitBtns) {
  const txt = await btn.textContent().catch(() => '');
  console.log(`  submit btn: "${txt}"`);
}

let submitted = false;
for (const btn of submitBtns) {
  try {
    await btn.click();
    submitted = true;
    console.log('Clicked submit');
    break;
  } catch {}
}

await wait(3000);
await shot(page, '04-after-create');
record('新建项目', `filled:${filled} submitted:${submitted} url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,500)}`);

// ---- 3. Story Core ----
await wait(1000);
let nav = await page.locator('nav, .nav, [role=navigation], .sidebar, .tabs').first().innerText().catch(() => '');
console.log(`Nav text: ${nav.slice(0, 300)}`);

// Try to find story core tab/link
const storyCoreBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /故事核心|story.?core/i }).all();
console.log(`Story core buttons: ${storyCoreBtns.length}`);
if (storyCoreBtns.length > 0) {
  await storyCoreBtns[0].click();
  await wait(2000);
}
await shot(page, '05-story-core');
record('故事核心', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,800)}`);

// AI assist
const aiButtons = await page.locator('button').filter({ hasText: /AI|生成|辅助|魔法/i }).all();
console.log(`AI buttons on story core: ${aiButtons.length}`);
for (const b of aiButtons) {
  console.log(`  AI btn: "${await b.textContent().catch(()=>'')}"`)
}

// ---- 4. 结构骨架 ----
const structBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /结构|骨架|structure/i }).all();
console.log(`Structure buttons: ${structBtns.length}`);
if (structBtns.length > 0) {
  await structBtns[0].click();
  await wait(2000);
}
await shot(page, '06-structure');

// Try AI generate button
const aiGenBtns = await page.locator('button').filter({ hasText: /AI|生成|一键/i }).all();
console.log(`AI gen buttons: ${aiGenBtns.length}`);
if (aiGenBtns.length > 0) {
  const t = await aiGenBtns[0].textContent().catch(() => '');
  console.log(`Clicking: "${t}"`);
  await aiGenBtns[0].click();
  await wait(8000);
  await shot(page, '06b-structure-ai-done');
}
record('结构骨架', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,1000)}`);

// ---- 5. 人物核心 ----
const charBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /人物|角色|character/i }).all();
console.log(`Character buttons: ${charBtns.length}`);
if (charBtns.length > 0) {
  await charBtns[0].click();
  await wait(2000);
}
await shot(page, '07-characters');
record('人物核心', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,1000)}`);

// ---- 6. 关系张力 ----
const relBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /关系|张力|relationship/i }).all();
if (relBtns.length > 0) {
  await relBtns[0].click();
  await wait(2000);
}
await shot(page, '08-relationships');
record('关系张力', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,800)}`);

// ---- 7. 剧情开发 ----
const plotBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /剧情|开发|plot/i }).all();
if (plotBtns.length > 0) {
  await plotBtns[0].click();
  await wait(2000);
}
await shot(page, '09-plot-dev');
record('剧情开发', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,800)}`);

// ---- 8. 沉淀锁定 ----
const lockBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /沉淀|锁定|lock/i }).all();
if (lockBtns.length > 0) {
  await lockBtns[0].click();
  await wait(2000);
}
await shot(page, '10-lock');
record('沉淀锁定', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,800)}`);

// ---- 9. 场景拆解 ----
const sceneBtns = await page.locator('button, a, [role=tab], li, .tab').filter({ hasText: /场景|拆解|scene/i }).all();
console.log(`Scene buttons: ${sceneBtns.length}`);
if (sceneBtns.length > 0) {
  await sceneBtns[0].click();
  await wait(2000);
  await shot(page, '11-scenes');
  record('场景拆解', `url:${page.url()} body:${(await page.locator('body').innerText().catch(()=>'')).slice(0,800)}`);
}

await shot(page, '12-final-state');

console.log('\n\n=== ALL STEPS COMPLETE ===');
console.log(JSON.stringify(log, null, 2));

await browser.close();
