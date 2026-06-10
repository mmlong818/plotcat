// audit-round5 run1b: 资料库 + 返回 + 新建向导 + 项目中心卡片检查
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-round5';
const PROJECT_ID = 'project_mptv97q3_xyh2ju';
const consoleLog = [];
let currentCtx = 'init';

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: opts.fullPage ?? true });
  console.log('shot:', name);
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  page.on('console', m => { if (m.type() === 'error') consoleLog.push(`[${currentCtx}][${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => consoleLog.push(`[${currentCtx}][pageerror] ${e.message}`));

  currentCtx = 'home';
  await page.goto(URL, { waitUntil: 'networkidle' });

  // 项目中心：卡片全文（看重复标题如何区分）
  const cardTexts = await page.evaluate(() => Array.from(document.querySelectorAll('.project-card, article, [class*="project"]')).slice(0, 30).map(el => el.className + ' :: ' + el.innerText.replace(/\n/g, ' | ').slice(0, 300)));
  fs.writeFileSync(`${OUT}/project-cards.txt`, cardTexts.join('\n\n'));

  currentCtx = 'open-project';
  await page.locator(`[data-id="${PROJECT_ID}"]`).first().click();
  await page.waitForTimeout(900);

  // 进入场景页再去资料库（验证返回是否回到原步骤）
  await page.locator('text=场景拆解').first().click();
  await page.waitForTimeout(700);

  currentCtx = 'library';
  await page.locator('#page-library-button').click();
  await page.waitForTimeout(700);
  await shot(page, '06-library-timeline');
  fs.writeFileSync(`${OUT}/library-timeline-text.txt`, await page.locator('body').innerText());

  const tabBtns = page.locator('[data-action="locks-tab"]');
  const tabs = await tabBtns.allInnerTexts();
  for (let i = 1; i < tabs.length; i++) {
    currentCtx = 'library-tab-' + tabs[i];
    await tabBtns.nth(i).click();
    await page.waitForTimeout(500);
    await shot(page, `06-library-tab${i}-${tabs[i].trim().replace(/\s/g, '')}`);
  }
  // 切回时间线 tab
  await tabBtns.nth(0).click(); await page.waitForTimeout(400);

  // 返回（验证回到场景拆解还是别处）
  currentCtx = 'library-back';
  const backBtn = page.locator('[data-action="library-back"]');
  console.log('library-back count:', await backBtn.count());
  await backBtn.first().click();
  await page.waitForTimeout(700);
  await shot(page, '07-after-library-back');
  const activeStep = await page.evaluate(() => document.querySelector('.is-active[class*="step"], [class*="step"].is-active')?.innerText || document.querySelector('main')?.innerText.slice(0, 100));
  console.log('after back, active area:', JSON.stringify(activeStep?.slice(0, 120)));

  // 回项目中心
  currentCtx = 'back-to-projects';
  await page.locator('[data-action="back-to-projects"]').first().click().catch(async () => {
    await page.locator('#page-project-button, button:has-text("项目中心")').first().click().catch(() => {});
  });
  await page.waitForTimeout(700);
  await shot(page, '08-project-center-back');

  // 新建项目
  currentCtx = 'create-picker';
  const picker = page.locator('[data-action="open-create-mode-picker"]');
  console.log('picker btn count:', await picker.count());
  if (await picker.count()) { await picker.first().click(); }
  else { await page.locator('button:has-text("新建")').first().click(); }
  await page.waitForTimeout(600);
  await shot(page, '09-create-mode-picker');
  fs.writeFileSync(`${OUT}/picker-text.txt`, await page.locator('body').innerText());

  currentCtx = 'quick-creation';
  const quick = page.locator('[data-action="open-quick-creation"]');
  console.log('quick count:', await quick.count(), 'pro count:', await page.locator('[data-action="open-pro-creation"]').count());
  if (await quick.count()) {
    await quick.first().click(); await page.waitForTimeout(800);
    await shot(page, '10-wizard-step1');
    fs.writeFileSync(`${OUT}/wizard-step1-text.txt`, await page.locator('body').innerText());
    // 尝试填表走到第二步
    const ta = page.locator('textarea').first();
    if (await ta.count()) {
      await ta.fill('一名癌症晚期的法医母亲，在生命最后三个月里，决定亲手重查二十年前被定为意外的女儿坠楼案。她必须在记忆衰退之前从旧搭档身上撬出真相。');
      await page.waitForTimeout(400);
      await shot(page, '10b-wizard-step1-filled');
    }
    // 找下一步按钮
    const nextBtns = await page.locator('button:visible').allInnerTexts();
    console.log('visible buttons on wizard:', JSON.stringify(nextBtns.filter(t => t.trim()).slice(0, 40)));
    const next = page.locator('button:has-text("下一步"), button:has-text("继续"), [data-action="go-step"]');
    if (await next.count()) {
      await next.first().click(); await page.waitForTimeout(900);
      await shot(page, '11-wizard-step2');
      fs.writeFileSync(`${OUT}/wizard-step2-text.txt`, await page.locator('body').innerText());
    }
    // 取消/退出向导
    currentCtx = 'wizard-cancel';
    const cancelBtns = await page.locator('button:visible').allInnerTexts();
    console.log('buttons at step2:', JSON.stringify(cancelBtns.filter(t => t.trim()).slice(0, 40)));
    const cancel = page.locator('button:has-text("取消"), button:has-text("退出"), button:has-text("返回项目"), [data-action="back-to-projects"]');
    if (await cancel.count()) { await cancel.first().click(); await page.waitForTimeout(600); await shot(page, '12-after-cancel'); }
    else { await page.keyboard.press('Escape'); await page.waitForTimeout(400); await shot(page, '12-after-escape'); }
  }

  fs.writeFileSync(`${OUT}/console-run1b.log`, consoleLog.join('\n') || '(no console errors)');
  console.log('--- console issues:', consoleLog.length); consoleLog.forEach(l => console.log(l));
  await browser.close();
  console.log('RUN1B DONE');
})();
