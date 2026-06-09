// 全量页面捕获 - 用于设计评审
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-2026-05-29';
const VIEWPORT = { width: 1920, height: 1080 };

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.fullPage ?? true });
  console.log('  shot:', name);
}

async function click(page, sel, timeout = 2000) {
  const loc = page.locator(sel).first();
  if (!(await loc.count())) return false;
  await loc.click({ timeout });
  return true;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  // === 项目中心 ===
  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, '01-project-center');

  // === 创建项目向导 ===
  if (await click(page, '[data-action="open-create-dialog"], [data-action="open-create"], button:has-text("新建")').catch(() => false)) {
    await shot(page, '02-create-dialog');
    // 关闭
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(200);
  }

  // === 打开第一个项目 ===
  await click(page, '[data-action="open-project"]');
  await page.waitForTimeout(600);
  await shot(page, '03-after-open-project');

  // === 各步骤页面 ===
  const steps = [
    { sel: 'text=结构骨架', name: '04-structure' },
    { sel: 'text=人物核心', name: '05-characters' },
    { sel: 'text=关系张力', name: '06-relationships' },
    { sel: 'text=剧情开发', name: '07-plots' },
    { sel: 'text=场景拆解', name: '08-scenes' },
    { sel: 'text=剧本撰写', name: '09-script' },
  ];
  for (const s of steps) {
    if (await click(page, s.sel)) {
      await page.waitForTimeout(700);
      await shot(page, s.name);
    }
  }

  // === 剧情卡编辑抽屉 ===
  await click(page, 'text=剧情开发');
  await page.waitForTimeout(500);
  const firstCard = page.locator('.pgrid-card').first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForTimeout(200);
    // 通过卡片上的"编辑"小按钮
    const editBtn = page.locator('.pgrid-card__qbtn').first();
    if (await editBtn.count()) {
      await editBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '10-plot-editor-drawer');
      // 关闭
      await page.locator('[data-action="close-plot-editor"]').first().click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  // === 关系张力页 - 详细 ===
  await click(page, 'text=关系张力');
  await page.waitForTimeout(700);
  await shot(page, '11-relationships-detail');

  // === 场景拆解 ===
  await click(page, 'text=场景拆解');
  await page.waitForTimeout(700);
  await shot(page, '12-scenes-detail');

  // === 剧本撰写 ===
  await click(page, 'text=剧本撰写');
  await page.waitForTimeout(700);
  await shot(page, '13-script-detail');

  // === 项目中心 ===
  await click(page, 'text=项目中心');
  await page.waitForTimeout(500);
  await shot(page, '14-back-to-center');

  // === 资料库 ===
  if (await click(page, 'text=资料库')) {
    await page.waitForTimeout(500);
    await shot(page, '15-library');
  }

  // === 设置 ===
  if (await click(page, '[aria-label="设置"], [title="设置"], .icon-button:has-text("⚙")')) {
    await page.waitForTimeout(400);
    await shot(page, '16-settings');
  }

  await browser.close();
  console.log('DONE');
})();
