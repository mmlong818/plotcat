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
      '--disable-extensions',
      '--allow-file-access-from-files',
      '--disable-web-security',
    ]
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('pageerror', err => console.log('[pageerror]', err.message));

  // Navigate and wait for projects API
  const responsePromise = page.waitForResponse(
    resp => resp.url().includes('127.0.0.1:4173') && resp.url().includes('projects'),
    { timeout: 12000 }
  ).catch(() => null);

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const resp = await responsePromise;
  if (resp) {
    const data = await resp.json().catch(() => null);
    console.log('Projects API response:', JSON.stringify(data)?.slice(0, 300));
  }

  // Also check if localStorage has projects
  const lsData = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.map(k => ({ key: k, value: (localStorage.getItem(k) || '').slice(0, 100) }));
  });
  console.log('localStorage keys:', JSON.stringify(lsData).slice(0, 500));

  await page.waitForTimeout(3000);
  await shot(page, 'page-01-projects.png', '项目中心');

  const html = await page.locator('#project-list').innerHTML();
  console.log('project-list:', html.slice(0, 500) || '(empty)');

  await browser.close();
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
