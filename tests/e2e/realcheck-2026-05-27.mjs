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
  await page.screenshot({ path: fp, fullPage: true });
  log(`[shot] ${name}`);
}

async function dumpVisiblePanel(page) {
  const info = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('section.panel')];
    const vis = panels.filter(p => !p.hidden && getComputedStyle(p).display !== 'none')
      .map(p => ({ id: p.id, page: p.dataset.page, group: p.dataset.stepGroup, text: p.innerText.slice(0, 600) }));
    return {
      title: document.querySelector('#hero-title')?.innerText,
      eyebrow: document.querySelector('#hero-eyebrow')?.innerText,
      stepper: document.querySelector('#stepper-nav')?.innerText,
      runtime: document.querySelector('#runtime-status')?.innerText,
      visible: vis,
    };
  });
  log('[dump]', JSON.stringify(info).slice(0, 1500));
  return info;
}

async function clickIfExists(page, sel, label) {
  const el = page.locator(sel).first();
  const n = await el.count();
  if (!n) { log(`[skip] ${label} (no ${sel})`); return false; }
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
    await el.click({ timeout: 4000 });
    log(`[click] ${label} (${sel})`);
    await page.waitForTimeout(400);
    return true;
  } catch (e) {
    log(`[click-fail] ${label}: ${e.message}`);
    return false;
  }
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', err => { errors.push(err.message); log('[pageerror]', err.message); });
  page.on('console', msg => { if (msg.type() === 'error') log('[console.error]', msg.text().slice(0, 300)); });

  log('=== 1. 项目中心 ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '01-project-center.png');
  await dumpVisiblePanel(page);

  const projHtml = await page.locator('#project-list').innerHTML().catch(() => '');
  log('[project-list-len]', projHtml.length);
  log('[project-list-head]', projHtml.slice(0, 800).replace(/\s+/g, ' '));

  log('=== 2. 点击新增项目 ===');
  // Try various selectors for "new project"
  const newProjBtns = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a, [role=button]')];
    return btns.filter(b => /新增|新建|创建|新项目|开始/.test(b.innerText || '')).map(b => ({
      tag: b.tagName, id: b.id, cls: b.className, text: (b.innerText || '').slice(0, 50)
    })).slice(0, 20);
  });
  log('[new-project-candidates]', JSON.stringify(newProjBtns));

  // Most common: a "新增项目" button in project-list area
  const opened = await clickIfExists(page, 'button:has-text("新增项目")', '新增项目按钮')
    || await clickIfExists(page, 'button:has-text("新建项目")', '新建项目按钮')
    || await clickIfExists(page, 'button:has-text("创建项目")', '创建项目按钮')
    || await clickIfExists(page, '.project-board button', '项目板按钮');

  await page.waitForTimeout(800);
  await shot(page, '02-create-dialog-step1.png');
  await dumpVisiblePanel(page);

  // Inspect dialog
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('#project-create-dialog');
    if (!d || d.hidden) return null;
    return {
      visible: !d.hidden,
      title: d.querySelector('#project-create-title')?.innerText,
      desc: d.querySelector('#project-create-description')?.innerText,
      formHtml: d.querySelector('#project-create-form')?.innerHTML?.slice(0, 2000),
    };
  });
  log('[dialog]', JSON.stringify(dlg).slice(0, 1500));

  log('=== 3. 走通向导 ===');
  // Step through wizard: fill any input, click next/confirm, screenshot each step.
  const projectName = `真检-${Date.now().toString().slice(-6)}`;
  let stepIdx = 1;
  while (stepIdx <= 8) {
    // Fill visible inputs in dialog
    const inputs = await page.locator('#project-create-form input, #project-create-form textarea').all();
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      try {
        const tag = await el.evaluate(n => n.tagName);
        const type = await el.evaluate(n => n.type || '');
        const val = await el.inputValue().catch(() => '');
        if (val) continue;
        if (type === 'radio' || type === 'checkbox') continue;
        const ph = await el.getAttribute('placeholder') || '';
        let v = `${projectName}-step${stepIdx}-i${i}`;
        if (/字数|集数|集时|数字|分钟/.test(ph)) v = '30';
        else if (/名|标题|主题|项目/.test(ph)) v = projectName;
        else if (/logline|一句话|梗概|简介|描述/i.test(ph)) v = '一个普通女孩在末日中重逢初恋的高甜虐恋故事。';
        await el.fill(v).catch(() => {});
      } catch {}
    }
    // Click any not-checked radio if all empty
    const radios = await page.locator('#project-create-form input[type=radio]').all();
    if (radios.length) {
      const checked = await page.locator('#project-create-form input[type=radio]:checked').count();
      if (!checked) {
        await radios[0].check({ force: true }).catch(() => {});
      }
    }

    await shot(page, `03-wizard-step${stepIdx}.png`);
    const dlg2 = await page.evaluate(() => {
      const d = document.querySelector('#project-create-dialog');
      if (!d || d.hidden) return { closed: true };
      return {
        title: d.querySelector('#project-create-title')?.innerText,
        desc: d.querySelector('#project-create-description')?.innerText,
        form: d.querySelector('#project-create-form')?.innerText?.slice(0, 800),
        confirmText: d.querySelector('#confirm-create-project-button')?.innerText,
      };
    });
    log(`[wizard-step${stepIdx}]`, JSON.stringify(dlg2).slice(0, 800));
    if (dlg2.closed) { log('[wizard] closed'); break; }

    // Click confirm/next
    const confirmText = dlg2.confirmText || '';
    await clickIfExists(page, '#confirm-create-project-button', `下一步 (${confirmText})`);
    await page.waitForTimeout(700);
    stepIdx++;

    const stillOpen = await page.evaluate(() => {
      const d = document.querySelector('#project-create-dialog');
      return d && !d.hidden;
    });
    if (!stillOpen) { log('[wizard] closed after confirm'); break; }
  }

  await page.waitForTimeout(1200);
  await shot(page, '04-after-create.png');
  await dumpVisiblePanel(page);

  log('=== 4. Stepper 各步骤逐个走 ===');
  const steps = await page.evaluate(() => {
    const nav = document.querySelector('#stepper-nav');
    if (!nav) return [];
    return [...nav.querySelectorAll('button, [role=button], a, .stepper-nav__item')].map((b, i) => ({
      i, id: b.id, cls: b.className, text: (b.innerText || '').slice(0, 30),
    }));
  });
  log('[stepper-items]', JSON.stringify(steps));

  // Walk each stepper item
  for (let i = 0; i < steps.length; i++) {
    try {
      const items = await page.locator('#stepper-nav button, #stepper-nav [role=button], #stepper-nav a').all();
      if (!items[i]) break;
      await items[i].click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
      await shot(page, `05-step-${i}-${(steps[i].text || 'x').replace(/[^\w一-龥]/g, '')}.png`);
      const info = await dumpVisiblePanel(page);
      // Click first prominent button inside the active workflow panel to exercise it
      const panelId = info.visible[0]?.id;
      if (panelId) {
        const innerBtns = await page.locator(`#${panelId} button:visible`).all();
        log(`[panel-${panelId}-buttons]`, innerBtns.length);
        // Try first non-destructive primary button
        if (innerBtns.length > 0) {
          for (let j = 0; j < Math.min(innerBtns.length, 3); j++) {
            const txt = await innerBtns[j].innerText().catch(() => '');
            if (/删除|清空|重置|危险/.test(txt)) continue;
            log(`[panel-${panelId}-btn${j}]`, txt.slice(0, 30));
          }
        }
      }
    } catch (e) {
      log(`[step-${i}-fail]`, e.message);
    }
  }

  log('=== 5. 资料库 ===');
  await clickIfExists(page, '#page-library-button', '资料库');
  await page.waitForTimeout(800);
  await shot(page, '06-library.png');
  await dumpVisiblePanel(page);

  log('=== 6. 设置 ===');
  await clickIfExists(page, '#open-settings-button', '设置');
  await page.waitForTimeout(500);
  await shot(page, '07-settings.png');
  const settingsInfo = await page.evaluate(() => {
    const d = document.querySelector('#settings-dialog');
    return d && !d.hidden ? { html: d.querySelector('#settings-form')?.innerText?.slice(0, 800) } : { closed: true };
  });
  log('[settings]', JSON.stringify(settingsInfo).slice(0, 800));
  await clickIfExists(page, '#close-settings-button', '关闭设置');

  log('=== 7. 返回项目中心查看新项目 ===');
  await clickIfExists(page, '#page-project-button', '项目中心');
  await page.waitForTimeout(800);
  await shot(page, '08-back-to-projects.png');
  const projHtml2 = await page.locator('#project-list').innerHTML().catch(() => '');
  log('[project-list-after-len]', projHtml2.length);
  log('[project-list-after-head]', projHtml2.slice(0, 800).replace(/\s+/g, ' '));

  log('=== DONE ===');
  log('[total-errors]', errors.length);

  await writeFile(path.join(OUT, 'log.txt'), logLines.join('\n'), 'utf8');
  await browser.close();
}

run().catch(err => { console.error('Fatal:', err.stack || err.message); process.exit(1); });
