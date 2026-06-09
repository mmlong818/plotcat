// 2026-06-10 资深编剧视角走查
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-2026-06-10';
const errors = [];

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.fullPage ?? true });
  console.log('shot:', name);
}
async function safeClick(page, sel, timeout = 2000) {
  try {
    const loc = page.locator(sel).first();
    if (!(await loc.count())) { console.log('  [miss]', sel); return false; }
    await loc.click({ timeout });
    return true;
  } catch (e) { console.log('  [clickfail]', sel, e.message.split('\n')[0]); return false; }
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/nd851/AppData/Local/ms-playwright/chromium-1155/chrome-win/chrome.exe' });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('[console error]', m.text().slice(0, 300)); } });
  page.on('pageerror', e => { errors.push('PAGEERROR ' + e.message); console.log('[pageerror]', e.message); });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, '00-home');

  // 项目列表上的按钮文案盘点
  const homeButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0, 60));
  console.log('HOME BUTTONS:', JSON.stringify(homeButtons));

  // 新建项目入口 → 看创建向导（creationFlow）
  const newBtn = page.locator('button:has-text("新建")').first();
  if (await newBtn.count()) {
    await newBtn.click().catch(() => {});
    await shot(page, '01-creation-flow-step1', { wait: 800 });
    // 看向导里的文案/步骤
    const cfText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
    console.log('CF TEXT >>>\n' + cfText + '\n<<<');
    await shot(page, '01b-creation-flow-scrolled', { fullPage: true });
    // 退出向导回首页
    const back = page.locator('button:has-text("返回"), button:has-text("退出"), .cf-back, [data-action="back-home"]').first();
    if (await back.count()) await back.click().catch(() => {});
    else await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
  }

  // 打开第一个已有项目
  await page.goto(URL, { waitUntil: 'networkidle' });
  const opened = await safeClick(page, '[data-action="open-project"]');
  if (!opened) await safeClick(page, '.project-card, .proj-card, li button');
  await shot(page, '02-project-opened', { wait: 1000 });

  const navText = await page.evaluate(() => {
    const nav = document.querySelector('nav, .step-nav, header');
    return nav ? nav.innerText : '(no nav)';
  });
  console.log('NAV:', JSON.stringify(navText));

  // AI 创作流程页
  await safeClick(page, 'text=AI 创作流程');
  await shot(page, '03-ai-creation-flow', { wait: 900 });

  // 各步骤
  const steps = [
    ['结构骨架', '04-structure'],
    ['人物核心', '05-characters'],
    ['关系张力', '06-relationships'],
    ['剧情开发', '07-plots'],
    ['场景拆解', '08-scenes'],
    ['剧本撰写', '09-screenplay']
  ];
  for (const [label, name] of steps) {
    await safeClick(page, `text=${label}`);
    await shot(page, name, { wait: 900 });
  }

  // 剧本预览（如有）
  await safeClick(page, 'text=预览');
  await shot(page, '10-preview', { wait: 800 });

  console.log('\nERRORS TOTAL:', errors.length);
  errors.slice(0, 20).forEach((e, i) => console.log(`E${i}:`, e.slice(0, 400)));
  await browser.close();
})();
