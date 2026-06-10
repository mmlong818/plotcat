import { chromium } from 'playwright';
const PID = 'project_mq80kei3_opfrlt';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { console.log('[dialog]', d.message().slice(0,80)); await d.accept(); });
await page.goto('http://127.0.0.1:4173');
await page.evaluate(()=>localStorage.clear()); await page.reload();
await page.waitForTimeout(900);
await page.locator(`[data-action="open-project"][data-id="${PID}"]`).click({ force: true });
await page.waitForTimeout(1000);
await page.click('[data-action="go-step"][data-id="characters"]');
await page.waitForTimeout(600);
const btn = await page.locator('[data-action="ai-character-audit"]').count();
console.log('体检按钮:', btn > 0 ? '存在' : '缺失');
console.log(new Date().toISOString(), '触发体检（全片正文对照，约 3-5 分钟）');
await page.click('[data-action="ai-character-audit"]');
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(5000);
  const loading = await page.evaluate(() => document.body.innerText.includes('体检中'));
  if (!loading) break;
}
await page.waitForTimeout(800);
const panel = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    hasPanel: t.includes('档案兑现体检（'),
    arc: t.includes('弧光（起点→终点）'),
    drift: t.includes('档案承诺被正文改写')
  };
});
console.log('面板:', JSON.stringify(panel));
await page.screenshot({ path: 'tests/e2e/audit-2026-06-10/character-audit.png', fullPage: false });
await page.waitForTimeout(3000);
console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
// 落库复核
const proj = (await (await fetch(`http://127.0.0.1:4173/api/projects/${PID}`)).json()).project;
const fa = proj.character_hub.fulfillment_audit;
console.log('落库人数:', fa?.characters?.length);
for (const c of fa?.characters ?? []) {
  console.log(`【${c.name}】弧光:${c.arc?.status} 秘密:${c.secret?.status} 声音:${c.voice?.status} 漂移:${(c.drift??[]).length}条`);
  for (const d of (c.drift ?? []).slice(0,2)) console.log('   ⚠', d.slice(0, 70));
}
