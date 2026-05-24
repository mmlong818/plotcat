// Bypass system proxy for localhost
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

async function waitReady(page) {
  // wait for any loading spinners to disappear, or just settle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

async function run() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    // proxy bypass handled via env NO_PROXY
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // also bypass proxy at context level
  });
  const page = await ctx.newPage();

  // --- 1. Project center ---
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitReady(page);
  await shot(page, 'page-01-projects.png', '项目中心');

  // --- 2. Click first project ---
  // Try to find a project list item — common selectors
  const projectSelectors = [
    '[data-testid="project-item"]',
    '.project-item',
    '.project-card',
    'li.project',
    '.project-list li',
    'ul li a',
    '[class*="project"] [class*="title"]',
    '[class*="ProjectItem"]',
    'h3',
    '.project-title',
  ];

  let clicked = false;
  for (const sel of projectSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      await el.click();
      clicked = true;
      console.log(`Clicked project via: ${sel}`);
      break;
    }
  }

  if (!clicked) {
    // Dump visible text to help debug
    const text = await page.locator('body').innerText();
    console.log('Could not find project item. Body text sample:', text.slice(0, 500));
  }

  await waitReady(page);
  await page.waitForTimeout(1500);

  // --- 3. Navigate to 结构骨架 ---
  const stepperNav = async (label) => {
    const candidates = [
      `[data-testid="step-${label}"]`,
      `text=${label}`,
      `button:has-text("${label}")`,
      `li:has-text("${label}")`,
      `a:has-text("${label}")`,
      `[class*="step"]:has-text("${label}")`,
      `[class*="Step"]:has-text("${label}")`,
    ];
    for (const sel of candidates) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) {
        await el.click();
        console.log(`Navigated to "${label}" via: ${sel}`);
        await waitReady(page);
        await page.waitForTimeout(1000);
        return true;
      }
    }
    console.warn(`Could not find step: ${label}`);
    return false;
  };

  // Take shot of current page (after entering project)
  await shot(page, 'page-02-structure.png', '结构骨架 (initial)');

  // Navigate to 结构骨架
  await stepperNav('结构骨架');
  await shot(page, 'page-02-structure.png', '结构骨架');

  // Navigate to 剧情开发
  await stepperNav('剧情开发');
  await shot(page, 'page-03-plots.png', '剧情开发');

  // Navigate to 人物核心
  await stepperNav('人物核心');
  await shot(page, 'page-04-characters.png', '人物核心');

  // Navigate to 场景 (try multiple labels)
  const sceneLabel = await (async () => {
    for (const lbl of ['场景设计', '场景工作台', '场景拆解', '场景']) {
      if (await stepperNav(lbl)) return lbl;
    }
    return null;
  })();
  await shot(page, 'page-05-scenes.png', `场景 (${sceneLabel})`);

  await browser.close();
  console.log('\nAll screenshots saved to:', OUT);
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
