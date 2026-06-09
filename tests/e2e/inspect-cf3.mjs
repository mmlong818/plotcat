process.env.NO_PROXY='*';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4173/?nocache=' + Date.now(), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(()=>document.querySelector('button[data-action="open-create-mode-picker"]')?.click());
await page.waitForTimeout(300);
await page.evaluate(()=>document.querySelector('[data-action="open-quick-creation"]')?.click());
await page.waitForTimeout(1200);
// Walk full ancestor chain from a fixed deep point
const info = await page.evaluate(()=>{
  let el = document.elementFromPoint(720, 400);
  const chain = [];
  while (el) {
    const cs = getComputedStyle(el);
    chain.push({
      tag: el.tagName, id: el.id, cls: el.className,
      bg: cs.backgroundColor, bgImage: cs.backgroundImage?.slice(0,60),
    });
    el = el.parentElement;
  }
  return { chain, htmlBg: getComputedStyle(document.documentElement).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor, bodyDataMode: document.body.dataset.mode };
});
console.log(JSON.stringify(info,null,2));
await browser.close();
