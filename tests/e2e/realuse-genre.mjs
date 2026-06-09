// 真实使用模式 2026-05-31：林骁(现实悬疑编剧) + Dana Cross(好莱坞剧本医生)
// 通过前端 UI 补全「类型约束」契约，禁止后台注入
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realuse-shots';
const VIEWPORT = { width: 1920, height: 1080 };

async function shot(page, name, wait = 350) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('  shot:', name);
}

// 像人一样填字段：聚焦、清空、逐字输入、触发 input 事件
async function fill(page, sel, value, idx = 0) {
  const loc = page.locator(sel).nth(idx);
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
  await loc.fill('');
  await loc.type(String(value), { delay: 8 });
  await loc.dispatchEvent('input');
  await page.waitForTimeout(120);
}

// 现实悬疑 + 家庭剧情 的类型契约（专家共识内容）
const PROMISE = '悬疑线索必须公平可推理；真相揭露与情感救赎同等重要；每一幕至少推进一个可验证的事实进展，且伴随主角的情感代价。';
const CONVENTIONS = [
  ['公平线索', 'required', '所有指向真相的关键证据须在揭晓前以画面或台词向观众呈现，禁止凭空翻案。'],
  ['渐进式真相', 'required', '真相分层释放，每一幕推翻一个先前的认知，而非结尾一次性倒豆子。'],
  ['情感代价', 'required', '每一次侦破推进都必须伴随主角的情感损耗或关系裂痕，悬疑服务于人物。'],
];
const TABOOS = [
  ['天降证人', '靠从未铺垫过的人物或物证一举破案，违背公平线索原则。'],
  ['旁白解谜', '用上帝视角旁白直接告知观众真相，绕过戏剧化呈现。'],
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('  [pageerror]:', err.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  [console err]:', m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle' });

  // 打开项目 潮汐尽头
  await page.locator('[data-action="open-project"]').first().click();
  await page.waitForTimeout(700);

  // 进资料库
  await page.locator('#page-library-button').click();
  await page.waitForTimeout(600);

  // 切到「类型约束」tab
  await page.locator('[data-action="locks-tab"][data-id="genres"]').click();
  await page.waitForTimeout(400);
  await shot(page, 'g00-genres-empty');

  // 1. 林骁/Dana 写观众承诺
  await fill(page, '[data-action="genre-field"][data-field="audience_promise"]', PROMISE);
  await shot(page, 'g01-promise-filled');

  // 2. 逐条新增类型常规
  for (let i = 0; i < CONVENTIONS.length; i++) {
    const [name, status, desc] = CONVENTIONS[i];
    await page.locator('[data-action="add-convention"]').click();
    await page.waitForTimeout(300);
    // 新条目排在列表里，按 index 填（每次新增后重新定位最后一条）
    const nameInputs = '[data-action="convention-field"][data-field="name"]';
    const cnt = await page.locator(nameInputs).count();
    const idx = cnt - 1;
    await fill(page, nameInputs, name, idx);
    await fill(page, '[data-action="convention-field"][data-field="description"]', desc, idx);
    // 状态 select：required 是默认值，仅在需要 optional 时改；此处都 required
    console.log('  convention added:', name);
  }
  await shot(page, 'g02-conventions');

  // 3. 逐条新增类型禁区
  for (let i = 0; i < TABOOS.length; i++) {
    const [name, desc] = TABOOS[i];
    await page.locator('[data-action="add-taboo"]').click();
    await page.waitForTimeout(300);
    const nameInputs = '[data-action="taboo-field"][data-field="name"]';
    const cnt = await page.locator(nameInputs).count();
    const idx = cnt - 1;
    await fill(page, nameInputs, name, idx);
    await fill(page, '[data-action="taboo-field"][data-field="description"]', desc, idx);
    console.log('  taboo added:', name);
  }
  await shot(page, 'g03-taboos');

  // 4. 保存
  const saveBtn = page.locator('#save-button').first();
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.waitForTimeout(1200);
    console.log('  saved');
  } else {
    console.log('  [WARN] 找不到保存按钮');
  }
  await shot(page, 'g04-after-save');

  await browser.close();
  console.log('GENRE FILL DONE');
})();
