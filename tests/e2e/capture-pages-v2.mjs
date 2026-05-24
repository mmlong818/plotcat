process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://127.0.0.1:4173';
const OUT = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/inspect-shots';

async function shot(page, filename, label) {
  const fp = path.join(OUT, filename);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`[ok] ${label} -> ${filename}`);
}

async function run() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--headless=new',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
    ]
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('pageerror', err => console.log('[pageerror]', err.message));
  page.on('console', msg => {
    if (['error', 'warn'].includes(msg.type())) {
      console.log(`[${msg.type()}]`, msg.text().slice(0, 150));
    }
  });

  // --- 1. Wait for app to load and project list to populate ---
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  // Wait for /api/projects to complete
  let apiLoaded = false;
  try {
    await page.waitForResponse(
      resp => resp.url().includes('/api/projects') && resp.status() === 200,
      { timeout: 8000 }
    );
    apiLoaded = true;
    console.log('API projects loaded');
  } catch(e) {
    console.log('Waiting for project list to appear...');
  }

  // Wait for project list to have content
  try {
    await page.waitForFunction(() => {
      const el = document.getElementById('project-list');
      return el && el.children.length > 0;
    }, { timeout: 10000 });
    console.log('Project list rendered');
  } catch(e) {
    console.log('Project list still empty after wait');
  }

  await page.waitForTimeout(500);
  await shot(page, 'page-01-projects.png', '项目中心');

  // --- Dump project list for debugging ---
  const projectListHtml = await page.locator('#project-list').innerHTML();
  console.log('project-list HTML (first 500):', projectListHtml.slice(0, 500));

  if (projectListHtml.length === 0) {
    console.log('ERROR: Project list is empty. Cannot continue navigation.');
    await browser.close();
    return;
  }

  // --- 2. Click first project's "继续创作" button ---
  const openBtn = page.locator('button[data-action="open-project"]').first();
  if (await openBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await openBtn.click();
    console.log('Clicked "open-project" button');
  } else {
    console.warn('Could not find open-project button');
  }

  await page.waitForTimeout(1500);

  // --- 3. Navigate to stepper steps ---
  const navigateToStep = async (label) => {
    // Stepper buttons have data-id matching the step, with label in a span
    // Try: button in #stepper-nav whose .step-button__label span contains the label
    const stepBtn = page.locator(`#stepper-nav button:has(.step-button__label:text("${label}"))`).first();
    if (await stepBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await stepBtn.click();
      await page.waitForTimeout(800);
      console.log(`Navigated to: ${label}`);
      return true;
    }
    // Fallback: button with data-id
    const stepIdMap = {
      '结构骨架': 'structure', '人物核心': 'characters', '关系张力': 'relationships',
      '剧情开发': 'plots', '沉淀锁定': 'locks', '场景拆解': 'scenes',
      '场景设计': 'scenes', '场景工作台': 'scenes', '场景': 'scenes'
    };
    const id = stepIdMap[label];
    if (id) {
      const byId = page.locator(`#stepper-nav button[data-id="${id}"]`).first();
      if (await byId.isVisible({ timeout: 1000 }).catch(() => false)) {
        await byId.click();
        await page.waitForTimeout(800);
        console.log(`Navigated to (by id): ${label}`);
        return true;
      }
    }
    console.warn(`Step not found: ${label}`);
    return false;
  };

  // After project open, take structure screenshot
  await shot(page, 'page-02-structure.png', '结构骨架');

  // Try explicit navigation
  await navigateToStep('结构骨架');
  await shot(page, 'page-02-structure.png', '结构骨架');

  await navigateToStep('剧情开发');
  await shot(page, 'page-03-plots.png', '剧情开发');

  await navigateToStep('人物核心');
  await shot(page, 'page-04-characters.png', '人物核心');

  for (const label of ['场景拆解', '场景设计', '场景工作台', '场景']) {
    if (await navigateToStep(label)) break;
  }
  await shot(page, 'page-05-scenes.png', '场景');

  await browser.close();
  console.log('\nDone. Screenshots in:', OUT);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
