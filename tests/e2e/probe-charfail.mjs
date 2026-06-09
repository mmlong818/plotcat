// 探针：只跑到 Step3，捕获是否发出 characters 请求 + 真实 aiError
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const CONCEPT =
  '一名癌症晚期的法医母亲，在生命最后三个月里，决定亲手重查二十年前被定为意外的女儿坠楼案；' +
  '她必须在记忆衰退和身体崩溃之前，从当年第一个赶到现场、如今已是副局长的旧搭档身上撬出真相。';

const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on('request', r => { if (/\/api\//.test(r.url())) console.log('  >> REQ', r.method(), r.url()); });
p.on('response', r => { if (/\/api\//.test(r.url())) console.log('  << RES', r.status(), r.url()); });
p.on('pageerror', e => console.log('  [pageerror]', e.message));
p.on('console', m => console.log(`  [console.${m.type()}]`, m.text().slice(0, 200)));

await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('[data-action="open-create-mode-picker"]').first().click();
await p.waitForTimeout(400);
await p.locator('[data-action="open-quick-creation"]').first().click();
await p.waitForTimeout(800);

await p.locator('[data-action="cf-set-draft-field"][data-field="format"]').first().selectOption('feature').catch(()=>{});
const lg = p.locator('[data-action="cf-set-draft-field"][data-field="logline"]').first();
await lg.click(); await lg.fill(CONCEPT); await lg.dispatchEvent('input');
await p.waitForTimeout(400);
await p.locator('[data-action="cf-step1-next"]:not([disabled])').first().click();
await p.waitForTimeout(800);

console.log('--- 点击 cf-step2-next（触发 characters 自动生成）---');
await p.locator('[data-action="cf-step2-next"]').first().click();

// 轮询 200s，每 10s dump 一次 creation 关键状态
for (let i = 0; i < 20; i++) {
  await p.waitForTimeout(10000);
  const st = await p.evaluate(() => {
    const c = window.appState?.creation;
    return c ? { step: c.currentStep, loadingStep: c.loadingStep, aiError: c.aiError,
      props: (c.characterProposals||[]).length, preview: (c.streamPreview||'').slice(0,40) } : null;
  });
  console.log(`  [t+${(i+1)*10}s]`, JSON.stringify(st));
  if (st && (st.props > 0 || st.aiError)) { console.log('  >> 终态达成'); break; }
}
await b.close();
