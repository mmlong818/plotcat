import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('  [pageerror]:', e.message));
p.on('dialog', async d => { console.log('  [dialog]', d.message().slice(0, 60)); await d.accept(); });

function dump(tag) {
  return p.evaluate((t) => {
    const btns = [...document.querySelectorAll('button,[data-action]')]
      .filter(b => b.offsetParent !== null)
      .map(b => ({ da: b.getAttribute('data-action'), t: (b.textContent || '').trim().slice(0, 18) }))
      .filter(b => b.da);
    const fields = [...document.querySelectorAll('input,textarea,select')]
      .filter(f => f.offsetParent !== null)
      .map(f => ({ da: f.getAttribute('data-action'), df: f.getAttribute('data-field'), tag: f.tagName, ph: f.placeholder || '' }));
    return { tag: t, btns, fields };
  }, tag);
}

await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('[data-action="open-create-mode-picker"]').click();
await p.waitForTimeout(400);
await p.locator('[data-action="open-quick-creation"]').click();
await p.waitForTimeout(700);
console.log('STEP1:', JSON.stringify(await dump('quick-step1'), null, 1));
await p.screenshot({ path: 'tests/e2e/realuse-shots/_recon-quick1.png', fullPage: true });
await b.close();
