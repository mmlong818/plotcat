process.env.NO_PROXY='*';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(()=>document.querySelector('button[data-action="open-create-mode-picker"]')?.click());
await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('[data-action="open-quick-creation"]')?.click());
await page.waitForTimeout(1000);
const info = await page.evaluate(()=>{
  const out = [];
  const sel = ['.creation-flow','.cf-section','.cf-step-card','.summary-card','.cf-deco-header','.cf-input','#creationContent','.cf-genre-slots'];
  for (const s of sel) {
    const el = document.querySelector(s);
    if (!el) { out.push({s, exists: false}); continue; }
    const c = getComputedStyle(el);
    out.push({s, bg: c.backgroundColor, color: c.color});
  }
  // Also dump first <div> inside #creationContent
  const cc = document.querySelector('#creationContent');
  if (cc) {
    const kids = [...cc.children].slice(0,4);
    for (const k of kids) {
      const c = getComputedStyle(k);
      out.push({ tag: k.tagName, cls: k.className, bg: c.backgroundColor });
    }
  }
  return out;
});
console.log(JSON.stringify(info,null,2));
await browser.close();
