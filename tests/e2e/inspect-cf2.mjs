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
// Element at center of the dark area (around 720,300)
const info = await page.evaluate(()=>{
  // probe stack at multiple points inside the dark area
  const points = [[720,200],[720,300],[720,400],[400,300],[1040,300]];
  return points.map(([x,y])=>{
    const stack = document.elementsFromPoint(x,y).slice(0,6);
    return { point:[x,y], stack: stack.map(el=>({
      tag: el.tagName,
      cls: el.className,
      id: el.id,
      bg: getComputedStyle(el).backgroundColor,
      bgImage: getComputedStyle(el).backgroundImage.slice(0,80),
    }))};
  });
});
console.log(JSON.stringify(info,null,2));
await browser.close();
