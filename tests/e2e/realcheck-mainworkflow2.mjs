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

async function dump(page, tag) {
  const info = await page.evaluate(() => {
    return {
      eyebrow: document.querySelector('#hero-eyebrow')?.innerText,
      title: document.querySelector('#hero-title')?.innerText,
      stepperVisible: !!document.querySelector('#stepper-nav') &&
        !document.querySelector('#stepper-nav').hidden &&
        getComputedStyle(document.querySelector('#stepper-nav')).display !== 'none',
      activePanels: [...document.querySelectorAll('section.panel')]
        .filter(p => !p.hidden && getComputedStyle(p).display !== 'none')
        .map(p => ({ id: p.id, step: p.dataset.stepGroup })),
      currentStepBtn: document.querySelector('.step-button.is-active')?.dataset?.id,
    };
  });
  log(`[dump-${tag}]`, JSON.stringify(info));
  return info;
}

async function jsClick(page, sel) {
  return page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') log('[console.error]', m.text().slice(0, 200)); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dump(page, 'home');

  log('=== click 继续创作 ===');
  // The button is action=open-project
  const ok = await jsClick(page, 'button[data-action="open-project"]');
  log('[jsClick-open-project]', ok);
  await page.waitForTimeout(2500); // wait for loadProjectFromServer
  await shot(page, 'F0-workflow-loaded.png');
  await dump(page, 'workflow-loaded');

  const stepIds = ['structure', 'characters', 'relationships', 'plots', 'scenes', 'screenplay'];
  for (let i = 0; i < stepIds.length; i++) {
    const id = stepIds[i];
    log(`=== STEP ${i+1}: ${id} ===`);
    const clicked = await jsClick(page, `button[data-id="${id}"]`);
    log('[jsClick]', id, clicked);
    await page.waitForTimeout(1200);
    await shot(page, `F${i+1}-${id}.png`);
    const info = await dump(page, id);
    // also enumerate buttons
    const btns = await page.evaluate(stepId => {
      // find panel via step group
      const pid = { structure: 'panel-structure', characters: 'panel-characters',
        relationships: 'panel-relationships', plots: 'panel-plots',
        scenes: 'panel-scenes', screenplay: 'panel-screenplay' }[stepId];
      const sec = document.getElementById(pid);
      if (!sec) return null;
      const visible = !sec.hidden && getComputedStyle(sec).display !== 'none';
      const buttons = [...sec.querySelectorAll('button')].slice(0, 40).map(b => ({
        text: (b.innerText || '').slice(0, 40).replace(/\s+/g, ' '),
        action: b.dataset.action || '',
        disabled: b.disabled,
      }));
      return { visible, count: buttons.length, buttons };
    }, id);
    log(`[panel-${id}]`, JSON.stringify(btns).slice(0, 1800));
  }

  log('=== try add character ===');
  await jsClick(page, 'button[data-id="characters"]');
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => document.querySelectorAll('#panel-characters .character-card, #panel-characters [data-character-id]').length);
  log('[chars-before]', before);
  await jsClick(page, '#panel-characters button[data-action="add-character"]');
  await page.waitForTimeout(800);
  await shot(page, 'G1-after-add-character.png');
  const after = await page.evaluate(() => document.querySelectorAll('#panel-characters .character-card, #panel-characters [data-character-id]').length);
  log('[chars-after]', after);

  log('=== try add plot card ===');
  await jsClick(page, 'button[data-id="plots"]');
  await page.waitForTimeout(800);
  const plotsBefore = await page.evaluate(() => document.querySelectorAll('#panel-plots .pgrid-card, #panel-plots [data-card-id]').length);
  log('[plots-before]', plotsBefore);
  await jsClick(page, '#panel-plots button[data-action="add-plot-card"]');
  await page.waitForTimeout(800);
  await shot(page, 'G2-after-add-plot.png');
  const plotsAfter = await page.evaluate(() => document.querySelectorAll('#panel-plots .pgrid-card, #panel-plots [data-card-id]').length);
  log('[plots-after]', plotsAfter);

  log('=== try screenplay ===');
  await jsClick(page, 'button[data-id="screenplay"]');
  await page.waitForTimeout(800);
  await shot(page, 'G3-screenplay.png');
  const spInfo = await page.evaluate(() => {
    const sec = document.getElementById('panel-screenplay');
    return { text: sec?.innerText?.slice(0, 600), buttons: [...(sec?.querySelectorAll('button') || [])].slice(0, 20).map(b => b.innerText.slice(0, 30)) };
  });
  log('[screenplay]', JSON.stringify(spInfo).slice(0, 1500));

  log('=== try library page ===');
  const libOk = await jsClick(page, '#page-library-button');
  log('[lib-click]', libOk);
  await page.waitForTimeout(800);
  await shot(page, 'G4-library.png');
  const libInfo = await page.evaluate(() => {
    const sec = document.getElementById('panel-library');
    const visible = sec && !sec.hidden && getComputedStyle(sec).display !== 'none';
    return { visible, text: sec?.innerText?.slice(0, 800) };
  });
  log('[library]', JSON.stringify(libInfo).slice(0, 1500));

  log('=== try settings ===');
  await jsClick(page, '#open-settings-button');
  await page.waitForTimeout(500);
  await shot(page, 'G5-settings.png');
  await jsClick(page, '#close-settings-button');

  log('=== back to project center ===');
  await jsClick(page, '#page-project-button');
  await page.waitForTimeout(800);
  await shot(page, 'G6-projects.png');

  log('=== open menu (...) on project card ===');
  // find dot button
  const menuBtn = await page.evaluate(() => {
    const b = document.querySelector('.project-card .project-card__menu, .project-card [data-action="toggle-project-menu"]');
    if (b) { b.click(); return { found: true, action: b.dataset.action }; }
    // try any "..." text
    const dots = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '...' || x.innerText.trim() === '…');
    if (dots) { dots.click(); return { found: 'dot' }; }
    return { found: false };
  });
  log('[menu]', JSON.stringify(menuBtn));
  await page.waitForTimeout(500);
  await shot(page, 'G7-card-menu.png');

  await writeFile(path.join(OUT, 'main-flow2-log.txt'), lines.join('\n'), 'utf8');
  await browser.close();
}

run().catch(e => { console.error(e.stack || e.message); process.exit(1); });
