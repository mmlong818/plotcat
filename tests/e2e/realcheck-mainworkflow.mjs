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
    const visible = id => {
      const el = document.getElementById(id);
      if (!el) return null;
      if (el.hidden) return null;
      if (getComputedStyle(el).display === 'none') return null;
      return (el.innerText || '').slice(0, 800);
    };
    return {
      eyebrow: document.querySelector('#hero-eyebrow')?.innerText,
      title: document.querySelector('#hero-title')?.innerText,
      stepperVisible: !document.querySelector('#stepper-nav')?.hidden &&
        getComputedStyle(document.querySelector('#stepper-nav')).display !== 'none',
      activePanel: [...document.querySelectorAll('section.panel')]
        .filter(p => !p.hidden && getComputedStyle(p).display !== 'none')
        .map(p => p.id),
      structureText: visible('structure-content')?.slice(0, 600),
      charactersText: visible('characters-content')?.slice(0, 600),
      relationshipsText: visible('relationships-content')?.slice(0, 600),
      plotsText: visible('plots-content')?.slice(0, 600),
      scenesText: visible('scenes-content')?.slice(0, 600),
      screenplayText: visible('screenplay-content')?.slice(0, 600),
      libraryText: visible('locks-content')?.slice(0, 600),
    };
  });
  log(`[dump-${tag}]`, JSON.stringify(info).slice(0, 2200));
  return info;
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => log('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') log('[console.error]', m.text().slice(0, 200)); });

  log('=== goto home ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'D0-home-with-projects.png');
  await dump(page, 'home');

  log('=== click project card ===');
  const card = page.locator('.project-card, [data-project-id]').first();
  log('[card-count]', await card.count());
  if (await card.count()) {
    await card.click({ timeout: 4000 }).catch(e => log('[card-click-fail]', e.message));
    await page.waitForTimeout(1500);
  }
  await shot(page, 'D1-after-open-project.png');
  let info = await dump(page, 'after-open');

  // If we landed in creation, click "← 项目列表" then click card again? Or use go-step directly?
  // Otherwise the stepper-nav should be visible on hero.
  const stepIds = ['structure', 'characters', 'relationships', 'plots', 'scenes', 'screenplay'];
  for (let i = 0; i < stepIds.length; i++) {
    const id = stepIds[i];
    log(`=== STEP ${i+1}: ${id} ===`);
    const btn = page.locator(`button[data-id="${id}"]`).first();
    const cnt = await btn.count();
    log(`[step-btn-count] ${id}=${cnt}`);
    if (cnt) {
      try {
        await btn.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
        await btn.click({ timeout: 4000 });
        log(`[step-clicked] ${id}`);
      } catch (e) {
        log(`[step-click-fail] ${id}: ${e.message.slice(0, 150)}`);
        // fall back: dispatch click via JS
        await page.evaluate((sel) => {
          const b = document.querySelector(sel);
          if (b) b.click();
        }, `button[data-id="${id}"]`);
        log(`[step-js-click] ${id}`);
      }
      await page.waitForTimeout(1200);
    }
    await shot(page, `D${i+2}-step-${id}.png`);
    const info = await dump(page, `step-${id}`);
    // Enumerate visible buttons in active panel
    const activeId = info.activePanel.find(x => x !== 'panel-projects' && x !== 'panel-creation');
    if (activeId) {
      const btns = await page.evaluate(aid => {
        const sec = document.getElementById(aid);
        if (!sec) return [];
        return [...sec.querySelectorAll('button')].slice(0, 40).map(b => ({
          text: (b.innerText || '').slice(0, 40),
          action: b.dataset.action || '',
          disabled: b.disabled,
        }));
      }, activeId);
      log(`[buttons-${activeId}]`, JSON.stringify(btns).slice(0, 1800));
    }
  }

  // Now exercise some interactions on each major page
  log('=== INTERACT: add a plot card ===');
  await page.evaluate(() => document.querySelector('button[data-id="plots"]')?.click());
  await page.waitForTimeout(900);
  // try "新增" or "+ 新建剧情卡"
  const addBtns = await page.locator('#panel-plots button:has-text("新增"), #panel-plots button:has-text("新建剧情卡")').all();
  log('[plots-add-btns]', addBtns.length);
  if (addBtns.length) {
    await addBtns[0].click({ timeout: 3000 }).catch(e => log('[plot-add-fail]', e.message));
    await page.waitForTimeout(800);
    await shot(page, 'E1-after-add-plot.png');
  }

  log('=== INTERACT: add a character ===');
  await page.evaluate(() => document.querySelector('button[data-id="characters"]')?.click());
  await page.waitForTimeout(900);
  const charAdd = await page.locator('#panel-characters button:has-text("新增"), #panel-characters button:has-text("+")').all();
  log('[char-add-btns]', charAdd.length);
  if (charAdd.length) {
    await charAdd[0].click({ timeout: 3000 }).catch(e => log('[char-add-fail]', e.message));
    await page.waitForTimeout(800);
    await shot(page, 'E2-after-add-char.png');
    await dump(page, 'after-add-char');
  }

  log('=== INTERACT: try structure library ===');
  await page.evaluate(() => document.querySelector('button[data-id="structure"]')?.click());
  await page.waitForTimeout(800);
  const libBtn = await page.locator('#panel-structure button').filter({ hasText: /参考库|29类|结构库/ }).all();
  log('[struct-lib-btns]', libBtn.length);
  if (libBtn.length) {
    await libBtn[0].click({ timeout: 3000 }).catch(e => log('[struct-lib-fail]', e.message));
    await page.waitForTimeout(800);
    await shot(page, 'E3-structure-library-open.png');
    // close
    await page.locator('#close-library-button').click({ timeout: 2000 }).catch(() => {});
  }

  log('=== INTERACT: scenes view ===');
  await page.evaluate(() => document.querySelector('button[data-id="scenes"]')?.click());
  await page.waitForTimeout(900);
  await shot(page, 'E4-scenes-view.png');
  await dump(page, 'scenes-detail');

  log('=== INTERACT: screenplay view ===');
  await page.evaluate(() => document.querySelector('button[data-id="screenplay"]')?.click());
  await page.waitForTimeout(900);
  await shot(page, 'E5-screenplay-view.png');
  await dump(page, 'screenplay-detail');

  log('=== INTERACT: library page ===');
  await page.locator('#page-library-button').click({ timeout: 3000 }).catch(e => log('[lib-click-fail]', e.message));
  await page.waitForTimeout(800);
  await shot(page, 'E6-library-page.png');
  await dump(page, 'library-page');

  log('=== INTERACT: settings ===');
  await page.locator('#open-settings-button').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, 'E7-settings.png');
  await page.locator('#close-settings-button').click({ timeout: 2000 }).catch(() => {});

  log('=== INTERACT: back to project center ===');
  await page.locator('#page-project-button').click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, 'E8-back-to-projects.png');
  await dump(page, 'back-to-projects');

  log('=== DONE ===');
  await writeFile(path.join(OUT, 'main-flow-log.txt'), lines.join('\n'), 'utf8');
  await browser.close();
}

run().catch(e => { console.error(e.stack || e.message); process.exit(1); });
