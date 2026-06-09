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
const info = await page.evaluate(()=>{
  const sec = document.querySelector('.cf-section');
  const cs = sec ? getComputedStyle(sec) : null;
  return {
    bg: cs?.backgroundColor,
    bgImage: cs?.backgroundImage,
    bgPos: cs?.backgroundPosition,
    bgSize: cs?.backgroundSize,
    bgRepeat: cs?.backgroundRepeat,
    box: sec?.getBoundingClientRect(),
  };
});
console.log(JSON.stringify(info,null,2));
await browser.close();
