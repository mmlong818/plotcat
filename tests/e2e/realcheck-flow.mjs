process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/realcheck-shots';

const logLines = [];
function log(...a) {
  const s = a.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
  console.log(s);
  logLines.push(s);
}

async function shot(page, name) {
  const fp = path.join(OUT, name);
  try { await page.screenshot({ path: fp, fullPage: true }); log(`[shot] ${name}`); }
  catch (e) { log(`[shot-fail] ${name}: ${e.message}`); }
}

async function dump(page, tag = '') {
  const info = await page.evaluate(() => {
    const sectionTextOf = id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const css = getComputedStyle(el);
      if (el.hidden || css.display === 'none') return null;
      return (el.innerText || '').slice(0, 400);
    };
    return {
      eyebrow: document.querySelector('#hero-eyebrow')?.innerText,
      title: document.querySelector('#hero-title')?.innerText,
      stepper: document.querySelector('#stepper-nav')?.innerText?.slice(0, 200),
      runtime: document.querySelector('#runtime-status')?.innerText,
      visiblePanels: [...document.querySelectorAll('section.panel')]
        .filter(p => !p.hidden && getComputedStyle(p).display !== 'none')
        .map(p => p.id),
      panelProjects: sectionTextOf('panel-projects')?.slice(0, 200),
      panelCreation: sectionTextOf('panel-creation')?.slice(0, 500),
      panelStructure: sectionTextOf('panel-structure')?.slice(0, 300),
      panelCharacters: sectionTextOf('panel-characters')?.slice(0, 300),
      panelPlots: sectionTextOf('panel-plots')?.slice(0, 300),
      panelScenes: sectionTextOf('panel-scenes')?.slice(0, 300),
      panelScreenplay: sectionTextOf('panel-screenplay')?.slice(0, 300),
      panelLibrary: sectionTextOf('panel-library')?.slice(0, 300),
    };
  });
  log(`[dump${tag ? '-' + tag : ''}]`, JSON.stringify(info).slice(0, 1800));
  return info;
}

async function clickByText(page, text, scope = 'body') {
  try {
    const loc = page.locator(`${scope} :text("${text}")`).filter({ visible: true }).first();
    await loc.click({ timeout: 4000 });
    log(`[click-text] "${text}"`);
    await page.waitForTimeout(500);
    return true;
  } catch (e) {
    log(`[click-text-fail] "${text}": ${e.message.slice(0, 100)}`);
    return false;
  }
}

async function clickAction(page, action) {
  try {
    const el = page.locator(`[data-action="${action}"]`).filter({ visible: true }).first();
    await el.click({ timeout: 4000 });
    log(`[click-action] ${action}`);
    await page.waitForTimeout(500);
    return true;
  } catch (e) {
    log(`[click-action-fail] ${action}: ${e.message.slice(0, 100)}`);
    return false;
  }
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('pageerror', err => { consoleErrors.push('pageerr: ' + err.message); log('[pageerror]', err.message); });
  page.on('console', msg => { if (msg.type() === 'error') { consoleErrors.push('console: ' + msg.text()); log('[console.error]', msg.text().slice(0, 200)); } });

  log('=== 1. 首页 ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, 'A1-home.png');
  await dump(page, 'home');

  log('=== 2. 新建项目 → 模式选择器 ===');
  await page.locator('button:has-text("新建项目")').first().click();
  await page.waitForTimeout(600);
  await shot(page, 'A2-mode-picker.png');
  await dump(page, 'mode-picker');

  log('=== 3. 选快速创作 ===');
  // mode picker has data-action="open-quick-creation" via clickable .mode-picker-card or text "快速创作"
  let ok = await clickAction(page, 'open-quick-creation');
  if (!ok) ok = await clickByText(page, '快速创作', '.mode-picker-panel');
  await page.waitForTimeout(1200);
  await shot(page, 'A3-creation-step1.png');
  await dump(page, 'creation-step1');

  log('=== 4. 填 logline / 主角 ===');
  // Find textareas / inputs in creationContent
  const inputs = await page.locator('#creationContent textarea, #creationContent input[type=text]').all();
  log('[creation-inputs]', inputs.length);
  for (let i = 0; i < inputs.length; i++) {
    const el = inputs[i];
    const field = await el.getAttribute('data-field').catch(() => null);
    const ph = await el.getAttribute('placeholder').catch(() => '');
    log(`[input-${i}] field=${field} ph=${ph?.slice(0, 40)}`);
    let v = '';
    if (field === 'title') v = `真检-末日初恋-${Date.now().toString().slice(-5)}`;
    else if (field === 'logline') v = '末日来临前 24 小时，外卖员重逢失联十年的初恋，两人决定用最后一夜走完原本要走一辈子的路。';
    else if (field === 'protagonist') v = '林夏，28 岁外卖员，曾考上美院因家变退学，十年来用配送强行麻木自己。';
    else v = '末日初恋';
    await el.fill(v).catch(() => {});
    await page.waitForTimeout(150);
  }
  await shot(page, 'A4-filled-step1.png');

  // Choose format select if present
  const formatSel = page.locator('#creationContent select[data-field="format"]').first();
  if (await formatSel.count()) {
    const opts = await formatSel.locator('option').allTextContents();
    log('[format-options]', opts);
  }

  log('=== 5. step1 next ===');
  await clickAction(page, 'cf-step1-next');
  await page.waitForTimeout(2000);
  await shot(page, 'A5-step2-structure.png');
  await dump(page, 'step2');

  log('=== 6. step2 next (结构) ===');
  await clickAction(page, 'cf-step2-next');
  await page.waitForTimeout(2000);
  await shot(page, 'A6-step3-characters.png');
  await dump(page, 'step3');

  log('=== 7. 生成人物 ===');
  // Try to trigger AI character generation (may fail without API key; observe error UX)
  const aiGenBtn = page.locator('[data-action="ai-generate-characters-cf"]').first();
  if (await aiGenBtn.count()) {
    log('[has ai-generate-characters-cf]');
    await aiGenBtn.click({ timeout: 3000 }).catch(e => log('[ai-gen-click-fail]', e.message));
    // Wait up to 15s
    for (let t = 0; t < 30; t++) {
      await page.waitForTimeout(500);
      const text = await page.locator('#creationContent').innerText().catch(() => '');
      if (/确认|采用|跳过|错误|失败|api|未配置/i.test(text)) break;
    }
    await shot(page, 'A7-after-char-ai.png');
    await dump(page, 'after-char-ai');
  } else {
    log('[no ai-generate-characters-cf button]');
  }

  log('=== 8. 跳到 step4 (act gen) ===');
  const step3Next = await clickAction(page, 'cf-step3-next');
  await page.waitForTimeout(1500);
  await shot(page, 'A8-step4-acts.png');
  await dump(page, 'step4');

  log('=== 9. 试生成第一幕 ===');
  const actBtn = page.locator('[data-action="cf-generate-act"]').first();
  if (await actBtn.count()) {
    await actBtn.click({ timeout: 3000 }).catch(e => log('[act-click-fail]', e.message));
    for (let t = 0; t < 30; t++) {
      await page.waitForTimeout(500);
      const text = await page.locator('#creationContent').innerText().catch(() => '');
      if (/已生成|完成|错误|失败|api|未配置|下一幕/i.test(text)) break;
    }
    await shot(page, 'A9-after-act.png');
    await dump(page, 'after-act');
  }

  log('=== 10. 尝试 finalize ===');
  await clickAction(page, 'cf-finalize-new');
  await page.waitForTimeout(1500);
  await shot(page, 'A10-after-finalize.png');
  await dump(page, 'after-finalize');

  log('=== 11. 直接跳到主工作台（如果创作流程没法完成，至少回项目列表）===');
  await clickAction(page, 'go-to-project');
  await page.waitForTimeout(800);
  await shot(page, 'A11-back-projects.png');
  await dump(page, 'back-projects');

  // If we have a project card, click it
  const cards = await page.locator('.project-card, [data-project-id]').all();
  log('[project-cards]', cards.length);
  if (cards.length > 0) {
    await cards[0].click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await shot(page, 'A12-project-opened.png');
    await dump(page, 'project-opened');
  }

  log('=== 12. 逐步过 6 步主工作流 ===');
  const stepClasses = [
    'step-button--structure',
    'step-button--characters',
    'step-button--relationships',
    'step-button--plots',
    'step-button--scenes',
    'step-button--screenplay',
  ];
  for (let i = 0; i < stepClasses.length; i++) {
    const sel = `.${stepClasses[i]}`;
    const el = page.locator(sel).first();
    if (!(await el.count())) { log(`[skip-step] ${sel} not found`); continue; }
    await el.click({ timeout: 3000 }).catch(e => log(`[step-click-fail] ${sel}:`, e.message));
    await page.waitForTimeout(900);
    await shot(page, `B${i + 1}-${stepClasses[i].replace('step-button--', '')}.png`);
    const info = await dump(page, `step-${i}`);
    // Count interactive buttons in active panel
    const activeId = info.visiblePanels.find(id => id.startsWith('panel-') && id !== 'panel-projects');
    if (activeId) {
      const btnInfo = await page.evaluate(id => {
        const sec = document.getElementById(id);
        if (!sec) return [];
        return [...sec.querySelectorAll('button')].slice(0, 30).map(b => ({
          text: (b.innerText || '').slice(0, 40),
          action: b.dataset.action || '',
          disabled: b.disabled,
        }));
      }, activeId);
      log(`[buttons-in-${activeId}]`, JSON.stringify(btnInfo).slice(0, 1200));
    }
  }

  log('=== 13. 资料库 ===');
  // close any open dialog first
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('#page-library-button').click({ timeout: 3000 }).catch(e => log('[lib-click-fail]', e.message));
  await page.waitForTimeout(800);
  await shot(page, 'C1-library.png');
  const libInfo = await dump(page, 'library');
  // List library subsections
  const libBtns = await page.evaluate(() => {
    const sec = document.getElementById('panel-library');
    if (!sec) return [];
    return [...sec.querySelectorAll('button, [role=tab]')].slice(0, 30).map(b => (b.innerText || '').slice(0, 40));
  });
  log('[library-buttons]', JSON.stringify(libBtns));

  log('=== 14. 设置弹窗 ===');
  await page.locator('#open-settings-button').click({ timeout: 3000 }).catch(e => log('[settings-click-fail]', e.message));
  await page.waitForTimeout(500);
  await shot(page, 'C2-settings.png');
  const setInfo = await page.evaluate(() => {
    const d = document.querySelector('#settings-dialog');
    if (!d || d.hidden) return { closed: true };
    return { html: d.querySelector('#settings-form')?.innerText?.slice(0, 1000) };
  });
  log('[settings]', JSON.stringify(setInfo).slice(0, 1000));
  await page.locator('#close-settings-button').click({ timeout: 2000 }).catch(() => {});

  log('=== 15. 主题切换 ===');
  await page.locator('#theme-toggle-button').click({ timeout: 2000 }).catch(e => log('[theme-click-fail]', e.message));
  await page.waitForTimeout(400);
  await shot(page, 'C3-theme-toggled.png');

  log('=== DONE ===');
  log('[total-console-errors]', consoleErrors.length);
  await writeFile(path.join(OUT, 'flow-log.txt'), logLines.join('\n'), 'utf8');
  await browser.close();
}

run().catch(err => { console.error('Fatal:', err.stack || err.message); process.exit(1); });
