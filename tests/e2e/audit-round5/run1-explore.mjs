// audit-round5 run1: 全流程探查 + 截图 + console 记录
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
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push(`[${currentCtx}][${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => consoleLog.push(`[${currentCtx}][pageerror] ${e.message}`));

  currentCtx = 'home';
  await page.goto(URL, { waitUntil: 'networkidle' });
  await shot(page, '01-project-center');

  // 项目中心卡片文本（看重复项目怎么区分）
  const cards = await page.locator('[data-action="open-project"]').allInnerTexts();
  console.log('--- project cards ---'); cards.forEach((c, i) => console.log(i, JSON.stringify(c.slice(0, 220))));

  currentCtx = 'open-project';
  await page.locator(`[data-action="open-project"][data-id="${PROJECT_ID}"], [data-id="${PROJECT_ID}"]`).first().click();
  await page.waitForTimeout(900);
  await shot(page, '02-opened-default');

  const steps = [['structure', '结构骨架'], ['characters', '人物核心'], ['relationships', '关系张力'], ['plots', '剧情开发'], ['scenes', '场景拆解'], ['screenplay', '剧本撰写']];
  for (const [id, label] of steps) {
    currentCtx = id;
    await page.locator(`text=${label}`).first().click().catch(e => console.log('nav fail', label, e.message));
    await page.waitForTimeout(800);
    await shot(page, `03-step-${id}`);
  }

  // 剧本撰写页：全本预览
  currentCtx = 'preview-full';
  const previewBtn = page.locator('[data-action="preview-screenplay-full"]');
  console.log('preview btn count:', await previewBtn.count());
  if (await previewBtn.count()) {
    await previewBtn.first().click();
    await page.waitForTimeout(1200);
    await shot(page, '04-full-preview');
    await page.evaluate(() => { const el = document.querySelector('.fountain-viewer, .preview-modal, dialog[open], .modal'); if (el) el.scrollTop = el.scrollHeight / 2; });
    await shot(page, '04b-full-preview-mid');
    // 找关闭按钮
    const closeSel = ['.fountain-viewer__close', '[data-action="close-preview"]', 'button:has-text("关闭")', 'button:has-text("✕")'];
    for (const s of closeSel) { if (await page.locator(s).count()) { await page.locator(s).first().click().catch(() => {}); break; } }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
  }

  // 导出 fountain
  currentCtx = 'export-fountain';
  const expBtn = page.locator('[data-action="export-screenplay-fountain"]');
  console.log('export btn count:', await expBtn.count());
  if (await expBtn.count()) {
    const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await expBtn.first().click();
    const download = await dl;
    if (download) {
      const p = `${OUT}/exported.fountain`;
      await download.saveAs(p);
      console.log('downloaded:', download.suggestedFilename(), 'size:', fs.statSync(p).size);
    } else { console.log('NO DOWNLOAD EVENT'); await shot(page, '05-export-aftermath'); }
  }
  await shot(page, '05b-after-export');

  // 资料库
  currentCtx = 'library';
  const libBtn = page.locator('button:has-text("资料库")');
  console.log('library btn count:', await libBtn.count());
  await libBtn.first().click().catch(e => console.log('lib fail', e.message));
  await page.waitForTimeout(700);
  await shot(page, '06-library-default');
  const tabs = await page.locator('[data-action="locks-tab"]').allInnerTexts();
  console.log('locks tabs:', tabs);
  for (let i = 0; i < tabs.length; i++) {
    await page.locator('[data-action="locks-tab"]').nth(i).click();
    await page.waitForTimeout(500);
    await shot(page, `06-library-tab${i}-${tabs[i].trim()}`);
  }
  // 返回
  currentCtx = 'library-back';
  const backBtn = page.locator('[data-action="library-back"]');
  console.log('library-back count:', await backBtn.count());
  if (await backBtn.count()) { await backBtn.first().click(); await page.waitForTimeout(600); await shot(page, '07-after-library-back'); }

  // 回项目中心 → 新建向导
  currentCtx = 'wizard';
  await page.locator('[data-action="back-to-projects"], button:has-text("项目中心")').first().click().catch(() => {});
  await page.waitForTimeout(600);
  const createBtns = await page.locator('button:has-text("新建")').allInnerTexts();
  console.log('create buttons:', createBtns);
  await page.locator('[data-action="open-create-mode-picker"], button:has-text("新建项目"), button:has-text("新建")').first().click().catch(e => console.log('create fail', e.message));
  await page.waitForTimeout(600);
  await shot(page, '08-create-picker');
  // 模式选择器内容
  const pickerText = await page.locator('body').innerText();
  fs.writeFileSync(`${OUT}/picker-text.txt`, pickerText);
  // 选快速创建/向导，走到第二步
  const quick = page.locator('[data-action="open-quick-creation"]');
  const pro = page.locator('[data-action="open-pro-creation"]');
  console.log('quick:', await quick.count(), 'pro:', await pro.count());
  if (await quick.count()) {
    await quick.first().click(); await page.waitForTimeout(700);
    await shot(page, '09-wizard-step1');
    fs.writeFileSync(`${OUT}/wizard-step1-text.txt`, await page.locator('body').innerText());
  }

  fs.writeFileSync(`${OUT}/console-run1.log`, consoleLog.join('\n') || '(no console errors)');
  console.log('--- console issues:', consoleLog.length, '---');
  consoleLog.slice(0, 40).forEach(l => console.log(l));
  await browser.close();
  console.log('RUN1 DONE');
})();
