import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { console.log(new Date().toISOString(), '[dialog]', d.message().replace(/\n/g,' | ').slice(0,300)); await d.accept(); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(900);
const back = page.locator('text=← 项目列表');
if (await back.count()) { await back.click(); await page.waitForTimeout(500); }
await page.locator('[data-action="open-project"]').first().click({ force: true });
await page.waitForTimeout(900);
await page.click('#page-library-button');
await page.waitForTimeout(400);
await page.click('[data-action="locks-tab"][data-id="genres"]');
await page.waitForTimeout(400);
const remedyBtn = await page.locator('[data-action="ai-genre-remedy"]').count();
console.log('「按契约修复」按钮可见:', remedyBtn > 0);
if (!remedyBtn) process.exit(1);
console.log(new Date().toISOString(), '触发修复');
await page.click('[data-action="ai-genre-remedy"]');
// 等全程（开方 + 重生成，上限 40 分钟）
for (let i = 0; i < 240; i++) {
  await page.waitForTimeout(10000);
  const busy = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.includes('开方中') || [...document.querySelectorAll('button')].some(b => b.disabled && /生成|开方/.test(b.textContent));
  });
  // aiWriteSceneScript 期间 busySceneIds 在剧本页才可见；用网络静默判断不可靠，靠 dialog 日志 + 长轮询
  if (!busy && i > 30) break;
}
await page.waitForTimeout(3500);
console.log('pageerrors:', errors.length ? errors.slice(0,3) : '无');
await browser.close();
// 复核
const proj = (await (await fetch('http://127.0.0.1:4173/api/projects/project_mptv97q3_xyh2ju')).json()).project;
const scenes = proj.scene_workbench.scenes.sort((a,b)=>a.order_index-b.order_index);
console.log('总场数:', scenes.length);
const withDirectives = scenes.filter(s => s.rater_directives);
console.log('仍带未消费指令的场次:', withDirectives.map(s=>s.order_index));
const newOnes = scenes.filter(s => (s.notes||'').includes('兑现类型必备场景'));
console.log('新增场:', newOnes.map(s=>`#${s.order_index}《${s.title}》${(s.script_full||'').replace(/\s+/g,'').length}字`));
