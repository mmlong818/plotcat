// 知识源 KB tab e2e 验证 — Phase 3
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/kb';
fs.mkdirSync(SHOTS, { recursive: true });

const OBS = [];
const note = (sev, msg) => { OBS.push({ sev, msg }); console.log(`[${sev}] ${msg}`); };
const w = (ms) => new Promise(r => setTimeout(r, ms));

function api(method, p, body) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(BASE + p, { method, headers: { 'content-type': 'application/json', ...(data ? { 'content-length': Buffer.byteLength(data) } : {}) } }, r => {
      let b=''; r.on('data',c=>b+=c); r.on('end',()=>{try{res({s:r.statusCode, j:JSON.parse(b)})}catch(e){res({s:r.statusCode, raw:b.slice(0,200)})}});
    });
    if (data) req.write(data); req.end();
  });
}

// ── 1. 准备项目 + 确认本地 storykb 缓存就绪
const proj = (await api('POST', '/api/projects', { title: 'KB 测试', format: 'feature', genre: ['悬疑'] })).j.project;
console.log('项目:', proj.project.id);
await api('POST', '/api/knowledge/storykb/sync');  // 确保缓存存在

// ── 2. UI 验证
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', e => note('HIGH', `pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') note('MEDIUM', `console: ${m.text()}`); });

await page.goto(BASE);
await w(2000);

// 打开项目
const openBtn = page.locator(`[data-action="open-project"][data-id="${proj.project.id}"]`).first();
if (await openBtn.count() > 0) { await openBtn.click(); await w(1200); }
else note('CRITICAL', '找不到 open-project');

// 进入资料库
await page.locator('#page-library-button').click();
await w(800);
await page.screenshot({ path: path.join(SHOTS, '01-library-default.png'), fullPage: true });

// 切到 KB tab
await page.locator('button[data-action="locks-tab"][data-id="kb"]').click();
await w(1500);  // 等加载 sources
await page.screenshot({ path: path.join(SHOTS, '02-kb-tab-loaded.png'), fullPage: true });

// 验证：sources 列表已加载
const srcCount = await page.locator('.kb-select option').count();
console.log(`知识源数: ${srcCount}`);
if (srcCount === 0) note('CRITICAL', '知识源下拉为空');

// 搜索 「潜台词」
await page.locator('input[data-action="kb-search-input"]').fill('潜台词');
await w(700);  // debounce 280ms + API
await page.screenshot({ path: path.join(SHOTS, '03-search-result.png'), fullPage: true });

const items = await page.locator('.kb-list-item').count();
console.log(`搜索结果: ${items}`);
if (items === 0) note('HIGH', '搜索「潜台词」无结果');

// 打开第一条
if (items > 0) {
  await page.locator('.kb-list-item').first().click();
  await w(1500);  // 远程拉详情 + 缓存
  await page.screenshot({ path: path.join(SHOTS, '04-entry-detail.png'), fullPage: true });

  const detailText = await page.locator('.kb-detail').innerText().catch(() => '');
  console.log(`详情长度: ${detailText.length}`);
  if (!detailText.includes('潜台词')) note('HIGH', '详情未渲染或不含期望标题');
  if (!detailText.includes('定义') && !detailText.includes('Subtext')) note('MEDIUM', '详情可能不完整');
}

// 导入为世界规则
await page.evaluate(() => {
  window.__confirmCalls = [];
  window.confirm = (m) => { window.__confirmCalls.push(m); return true; };
});
const importBtn = page.locator('button[data-action="kb-import"][data-target="world_rule"]');
if (await importBtn.count() > 0) {
  await importBtn.click();
  await w(800);
  // 切到「世界规则」tab，确认新条目存在
  await page.locator('button[data-action="locks-tab"][data-id="rules"]').click();
  await w(600);
  await page.screenshot({ path: path.join(SHOTS, '05-after-import-rules.png'), fullPage: true });
  const rulesText = await page.locator('#locks-content').innerText();
  if (!rulesText.includes('潜台词')) note('HIGH', '导入后世界规则 tab 未见「潜台词」');
  else console.log('✓ 导入成功：世界规则 tab 含「潜台词」');
}

console.log('\n========== KB 检查报告 ==========');
console.log(`观察数: ${OBS.length}`);
for (const o of OBS) console.log(`  [${o.sev}] ${o.msg}`);
fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(OBS, null, 2));
await browser.close();

// 清理测试项目
await api('DELETE', `/api/projects/${encodeURIComponent(proj.project.id)}`);
console.log('已清理测试项目');
