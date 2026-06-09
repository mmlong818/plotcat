process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/realcheck-shots';

const lines = [];
const log = (...a) => { const s = a.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' '); console.log(s); lines.push(s); };
const shot = async (p, n) => { try { await p.screenshot({ path: path.join(OUT, n), fullPage: true }); log(`[shot] ${n}`); } catch (e) { log(`[shot-fail] ${e.message}`); } };
const jsClick = (p, s) => p.evaluate(sel => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }, s);

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') log('[console.error]', m.text().slice(0, 200)); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // ===== 验证决议 3：mode picker 3 选项 =====
  log('=== fix-3: mode picker 3 options ===');
  await jsClick(page, 'button[data-action="open-create-mode-picker"]');
  await page.waitForTimeout(600);
  await shot(page, 'fix-3-mode-picker.png');
  const modeInfo = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.mode-picker-panel .mode-card')];
    return cards.map(c => ({
      action: c.dataset.action,
      title: c.querySelector('h3')?.innerText,
      tag: c.querySelector('.mode-card__tag')?.innerText,
    }));
  });
  log('[mode-cards]', JSON.stringify(modeInfo));

  // ===== 验证决议 1：进入快速创作页是米色 =====
  log('=== fix-1: open quick creation, check theme ===');
  await jsClick(page, '[data-action="open-quick-creation"]');
  await page.waitForTimeout(1200);
  const themeColors = await page.evaluate(() => {
    const panel = document.getElementById('panel-creation');
    const flow = document.querySelector('.creation-flow');
    return {
      panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
      flowColor: flow ? getComputedStyle(flow).color : null,
      cfGold: flow ? getComputedStyle(flow).getPropertyValue('--cf-gold').trim() : null,
      cfText: flow ? getComputedStyle(flow).getPropertyValue('--cf-text').trim() : null,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  log('[theme-colors]', JSON.stringify(themeColors));
  await shot(page, 'fix-1-creation-step1.png');

  // ===== 验证决议 2：step3 始终有手动新增按钮 + AI 失败兜底 =====
  // 填 step1 → 进 step2 → 进 step3
  log('=== fix-2: step3 manual + fallback ===');
  // step1: logline
  await page.locator('#creationContent textarea[data-field="logline"]').first().fill(
    '深夜出租车司机在偶遇一名失忆的婚纱女子后，被迫卷入她寻找婚礼现场的一夜公路追逐。'
  );
  await page.waitForTimeout(300);
  await jsClick(page, '[data-action="cf-step1-next"]');
  await page.waitForTimeout(800);
  await jsClick(page, '[data-action="cf-step2-next"]');
  await page.waitForTimeout(1500);
  await shot(page, 'fix-2-step3-initial.png');

  // 看 step3 是否有手动新增按钮
  const step3Buttons = await page.evaluate(() => {
    return [...document.querySelectorAll('#creationContent button')].map(b => ({
      text: (b.innerText || '').slice(0, 30).replace(/\s+/g, ' '),
      action: b.dataset.action || '',
      disabled: b.disabled,
    }));
  });
  log('[step3-buttons]', JSON.stringify(step3Buttons));
  const hasManualBtn = step3Buttons.some(b => b.action === 'cf-add-blank-character');
  log('[fix-2 has-manual-add-button]', hasManualBtn);

  // 等 AI 超时（45s）或失败，然后看 fallback 按钮
  log('[wait for AI to fail/timeout — 50s]');
  await page.waitForTimeout(50000);
  await shot(page, 'fix-2-step3-after-ai-fail.png');
  const afterFailButtons = await page.evaluate(() => {
    return [...document.querySelectorAll('#creationContent button')].map(b => ({
      text: (b.innerText || '').slice(0, 30).replace(/\s+/g, ' '),
      action: b.dataset.action || '',
      disabled: b.disabled,
    }));
  });
  log('[step3-after-fail-buttons]', JSON.stringify(afterFailButtons));
  const errorMsg = await page.evaluate(() => document.querySelector('#creationContent .cf-error')?.innerText);
  log('[ai-error-text]', errorMsg);
  const hasFallback = afterFailButtons.some(b => b.action === 'cf-use-fallback-characters');
  log('[fix-2 has-fallback-button]', hasFallback);

  // 点 fallback 按钮，看是否注入了 3 个 character
  if (hasFallback) {
    await jsClick(page, '[data-action="cf-use-fallback-characters"]');
    await page.waitForTimeout(800);
    await shot(page, 'fix-2-after-fallback.png');
    const proposalCount = await page.evaluate(() => document.querySelectorAll('#creationContent .cf-char-card').length);
    log('[fallback-proposal-count]', proposalCount);
  }

  // 点 "手动新增人物"
  await jsClick(page, '[data-action="cf-add-blank-character"]');
  await page.waitForTimeout(600);
  await shot(page, 'fix-2-after-manual-add.png');
  const finalCount = await page.evaluate(() => document.querySelectorAll('#creationContent .cf-char-card').length);
  log('[after-manual-count]', finalCount);

  // ===== 验证决议 5：剧情矩阵列宽 =====
  log('=== fix-5: plot grid column flex ===');
  await jsClick(page, '[data-action="go-to-project"]');
  await page.waitForTimeout(800);
  // open 潮汐尽头
  await jsClick(page, 'button[data-action="open-project"]');
  await page.waitForTimeout(2500);
  // go to plots step
  await jsClick(page, 'button[data-id="plots"]');
  await page.waitForTimeout(1200);
  await shot(page, 'fix-5-plot-grid.png');
  const gridInfo = await page.evaluate(() => {
    const acts = [...document.querySelectorAll('.pgrid-hcell--act-head')];
    return acts.map(a => ({
      title: a.querySelector('.pgrid-act-title')?.innerText || a.innerText.split('\n')[0],
      chip: a.querySelector('.pgrid-chip')?.innerText,
      rect: a.getBoundingClientRect(),
    })).map(x => ({ ...x, rect: { left: Math.round(x.rect.left), width: Math.round(x.rect.width) } }));
  });
  log('[grid-act-heads]', JSON.stringify(gridInfo));
  // verify 第二幕 head 不再被 200px 截断（如果只是 head 200px，title="第二幕"不会被遮住 node "04 进入第二幕"的位置；
  // 但 act-span 让填充 cell 延展使整幕表头横跨；我们检查每幕 head 仍在自己第一个 node 列的位置上）
  const nodeHeads = await page.evaluate(() => {
    return [...document.querySelectorAll('.pgrid-hcell--node')].map(n => ({
      text: (n.innerText || '').replace(/\s+/g, ' ').slice(0, 30),
      left: Math.round(n.getBoundingClientRect().left),
      width: Math.round(n.getBoundingClientRect().width),
    }));
  });
  log('[grid-node-heads]', JSON.stringify(nodeHeads));

  // ===== 验证决议 4：关系页 add-relationship 去重 =====
  log('=== fix-4: relationships add dedupe ===');
  await jsClick(page, 'button[data-id="relationships"]');
  await page.waitForTimeout(1000);
  const beforeRels = await page.evaluate(() => {
    return [...document.querySelectorAll('#panel-relationships .list-select.rel-item')].length;
  });
  log('[rel-cards-before-add]', beforeRels);
  // Click "新增" — 现有数据中 char_001+char_002 已有 rel_001。
  // 默认新增会用 characters[0]+characters[1]，应被去重，选中 rel_001 而不是创建新条
  const relCountBefore = await page.evaluate(() => (window.appState?.project?.character_hub?.relationship_map ?? []).length);
  log('[rel-data-before]', relCountBefore);
  await jsClick(page, '#panel-relationships button[data-action="add-relationship"]');
  await page.waitForTimeout(600);
  await shot(page, 'fix-4-after-add-relationship.png');
  const relCountAfter = await page.evaluate(() => (window.appState?.project?.character_hub?.relationship_map ?? []).length);
  log('[rel-data-after]', relCountAfter);
  log('[fix-4 dedup-prevented-create]', relCountBefore === relCountAfter);

  // ===== 验证决议 1（part 2）：设置弹窗在工作流页打开（背景应为浅色 surface-1） =====
  log('=== fix-1b: settings dialog on workflow page ===');
  await jsClick(page, '#open-settings-button');
  await page.waitForTimeout(600);
  await shot(page, 'fix-1b-settings-on-workflow.png');
  await jsClick(page, '#close-settings-button');

  log('=== DONE ===');
  await writeFile(path.join(OUT, 'fix-verify-log.txt'), lines.join('\n'), 'utf8');
  await browser.close();
}

run().catch(e => { console.error(e.stack || e.message); process.exit(1); });
