// 真实检查 2026-05-30：两位专家完整走流程
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realcheck-shots/realcheck-2026-05-30';
const VIEWPORT = { width: 1920, height: 1080 };

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 350);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.fullPage ?? true });
  console.log('  shot:', name);
}

async function safeClick(page, sel, timeout = 1500) {
  try {
    const loc = page.locator(sel).first();
    if (!(await loc.count())) return false;
    await loc.click({ timeout });
    return true;
  } catch { return false; }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [console error]:', msg.text());
  });
  page.on('pageerror', err => console.log('  [pageerror]:', err.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, '00-home');

  // 1. 打开第一个项目
  await safeClick(page, '[data-action="open-project"]');
  await page.waitForTimeout(700);
  await shot(page, '01-opened-default-step');

  // 2. 结构骨架
  await safeClick(page, 'text=结构骨架');
  await page.waitForTimeout(600);
  await shot(page, '02-structure');
  // 滚动看完整
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(200);
  await shot(page, '02b-structure-scrolled');

  // 3. 人物核心 - 选第一个人物
  await page.evaluate(() => window.scrollTo(0, 0));
  await safeClick(page, 'text=人物核心');
  await page.waitForTimeout(700);
  await shot(page, '03-characters');
  // 点性格特质里的一个 chip 试试切换
  const traitChip = page.locator('.trait-pool .ref-chip').first();
  if (await traitChip.count()) {
    await traitChip.click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, '03b-characters-trait-toggled');
  }
  // 点 MBTI 折叠区
  const mbtiToggle = page.locator('.psych-details summary').first();
  if (await mbtiToggle.count()) {
    await mbtiToggle.click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, '03c-characters-psych-open');
  }

  // 4. 关系张力 - 创建/查看关系
  await safeClick(page, 'text=关系张力');
  await page.waitForTimeout(700);
  await shot(page, '04-relationships');
  // 点击 segmented relationship type
  const relSeg = page.locator('.rel-seg').nth(2);
  if (await relSeg.count()) {
    await relSeg.click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, '04b-relationships-type-changed');
  }

  // 5. 剧情开发
  await safeClick(page, 'text=剧情开发');
  await page.waitForTimeout(800);
  await shot(page, '05-plots');
  // 点击一张卡 open editor
  const firstCard = page.locator('.pgrid-card').first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForTimeout(300);
    await shot(page, '05b-plots-card-selected');
    // 点编辑
    const editBtn = page.locator('.pgrid-card__qbtn').first();
    if (await editBtn.count()) {
      await editBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '05c-plot-editor-drawer');
      // 关闭：用 panel 内的 ✕ 按钮，不是遮罩
      await safeClick(page, '.plot-edv2__close');
      await page.waitForTimeout(500);
    }
  }
  // 试试废纸篓 toggle
  const trashBtn = page.locator('.pgrid-lib-trash-toggle').first();
  if (await trashBtn.count()) {
    await trashBtn.click();
    await page.waitForTimeout(300);
    await shot(page, '05d-plots-trash-view');
    await trashBtn.click();
    await page.waitForTimeout(200);
  }

  // 6. 场景拆解
  await safeClick(page, 'text=场景拆解');
  await page.waitForTimeout(800);
  await shot(page, '06-scenes');
  // 选第二个场景看编辑器变化
  const secondScene = page.locator('.scene-row').nth(1);
  if (await secondScene.count()) {
    await secondScene.click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, '06b-scenes-second-selected');
  }
  // 测试 breadcrumb act 切换是否工作
  const actSelect = page.locator('.scene-edv2__bc-select').first();
  if (await actSelect.count()) {
    await shot(page, '06c-scenes-act-area');
  }
  // 备注 details 展开
  const notesDetails = page.locator('.scene-edv2__notes summary').first();
  if (await notesDetails.count()) {
    await notesDetails.click().catch(() => {});
    await page.waitForTimeout(200);
    await shot(page, '06d-scenes-notes-open');
  }
  // 关联剧情卡跳转按钮
  const plotJump = page.locator('.scene-plot-jump').first();
  if (await plotJump.count()) {
    await shot(page, '06e-scenes-with-jump-arrow');
  }

  // 7. 剧本撰写
  await safeClick(page, 'text=剧本撰写');
  await page.waitForTimeout(900);
  await shot(page, '07-script');
  // 切换不同场景
  const sceneList = page.locator('[data-action="select-screenplay-scene"], .screenplay-scene-row, .screenplay-row');
  const cnt = await sceneList.count();
  if (cnt > 1) {
    await sceneList.nth(1).click().catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, '07b-script-other-scene');
  }

  // 8. 资料库 - 试图打开（侧栏点击）
  const libraryBtn = page.locator('#page-library-button, button:has-text("资料库")');
  if (await libraryBtn.first().count()) {
    await libraryBtn.first().click().catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, '08-library');
  }

  // 9. 设置
  const settingsBtn = page.locator('#open-settings-button, button:has-text("⚙")');
  if (await settingsBtn.first().count()) {
    await settingsBtn.first().click().catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, '09-settings');
    await page.keyboard.press('Escape').catch(() => {});
  }

  // 10. 回到项目中心
  await safeClick(page, '#page-project-button, button:has-text("项目中心")');
  await page.waitForTimeout(500);
  await shot(page, '10-back-to-projects');

  // 11. 新建项目向导
  const createBtn = page.locator('.project-create-btn, button:has-text("新建项目")');
  if (await createBtn.first().count()) {
    await createBtn.first().click().catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, '11-create-modal');
    await page.keyboard.press('Escape').catch(() => {});
  }

  await browser.close();
  console.log('REAL CHECK DONE');
})();
