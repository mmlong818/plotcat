// 接续 v6：找到现有项目，对未成稿场景重新触发 bulk，导出最终 fountain。
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v6';
function api(method, p, body) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(BASE + p, { method, headers: { 'content-type': 'application/json', ...(data ? { 'content-length': Buffer.byteLength(data) } : {}) } }, r => {
      let b=''; r.on('data',c=>b+=c); r.on('end',()=>{try{res({s:r.statusCode, j:JSON.parse(b)})}catch(e){res({s:r.statusCode, raw:b.slice(0,200)})}});
    });
    if (data) req.write(data); req.end();
  });
}
const w = (ms) => new Promise(r => setTimeout(r, ms));

const list = await api('GET', '/api/projects');
const proj = list.j.projects.find(p => p.title === '小镇七十二小时');
if (!proj) { console.error('找不到 v6 项目'); process.exit(1); }
console.log('恢复项目:', proj.id);

const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('[err]', e.message));

await page.goto(BASE); await w(2000);
await page.locator(`[data-action="open-project"][data-id="${proj.id}"]`).first().click(); await w(1500);
await page.locator(`#stepper-nav .step-button[data-id="screenplay"]`).click(); await w(800);

const before = await page.evaluate(() => {
  const statuses = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
  return { 已成稿: statuses.filter(s => s === '已成稿').length, 未撰写: statuses.filter(s => s === '未撰写').length };
});
console.log('恢复前:', before);

await page.evaluate(() => { window.confirm = () => true; });
await page.locator('button[data-action="ai-write-screenplay-bulk"]').click();

const start = Date.now();
const MAX_WAIT = 15 * 60 * 1000;
while (Date.now() - start < MAX_WAIT) {
  await w(15000);
  const state = await page.evaluate(() => {
    const btn = document.querySelector('button[data-action="ai-write-screenplay-bulk"]');
    const statuses = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
    return {
      btnText: btn?.textContent?.trim() || '',
      已成稿: statuses.filter(s => s === '已成稿').length,
      未撰写: statuses.filter(s => s === '未撰写').length
    };
  });
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`[${elapsed}s] ${state.btnText} · 成稿 ${state.已成稿} · 未撰 ${state.未撰写}`);
  if (!state.btnText.includes('批量中')) break;
}

const finalState = await page.evaluate(() => {
  const statuses = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
  return { 已成稿: statuses.filter(s => s === '已成稿').length, 未撰写: statuses.filter(s => s === '未撰写').length };
});
console.log('恢复后:', finalState);

// 重新导出
const dp = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.locator('button[data-action="export-screenplay-fountain"]').click();
const dl = await dp;
const fp = path.join(SHOTS, '小镇七十二小时-v6-final.fountain');
if (dl) await dl.saveAs(fp);

const finalProject = (await api('GET', `/api/projects/${encodeURIComponent(proj.id)}`)).j.project;
const scenes = (finalProject.scene_workbench?.scenes ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
const total = scenes.reduce((s, sc) => s + (sc.script_full?.length || 0), 0);
const written = scenes.filter(s => (s.script_full || '').length > 300).length;
console.log(`\n--- 最终体量 ---`);
console.log(`总字数: ${total} · 估算页数: ${Math.ceil(total / 250)} · 成稿率: ${written}/${scenes.length}`);

await browser.close();
