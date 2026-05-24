// 给 v8 现有项目的 plot cards 补 character_ids，然后重新跑 AI 生成。
// 不重建项目，省 token。
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const BASE = 'http://127.0.0.1:4173';
const SHOTS = 'E:/CC/code/yuandian-screenwriting-system/tests/e2e/real-check-shots/v8';
function api(m, p, b) {
  return new Promise((res) => {
    const d = b ? JSON.stringify(b) : null;
    const req = http.request(BASE + p, { method: m, headers: { 'content-type': 'application/json', ...(d ? { 'content-length': Buffer.byteLength(d) } : {}) } }, r => {
      let buf=''; r.on('data',c=>buf+=c); r.on('end',()=>{try{res({s:r.statusCode,j:JSON.parse(buf)})}catch(e){res({s:r.statusCode,raw:buf.slice(0,300)})}});
    });
    if (d) req.write(d); req.end();
  });
}
const w = ms => new Promise(r => setTimeout(r, ms));

const pid = 'project_mpk2zl96_hc6vr6';
const proj = (await api('GET', `/api/projects/${pid}`)).j.project;

// 把场景 POV + 通过场景标题/POV 推断出的同场人物，写回剧情卡 character_ids
const chars = proj.character_hub.characters;
const findId = (name) => chars.find(c => c.name === name)?.id;

// 每个 scene title → 出场人物 names
const sceneCharMap = {
  '渡口黄昏': ['林知夏', '陈牧'],
  '医院走廊': ['林知夏', '林父'],
  '父亲卧室深夜': ['林知夏'],
  '理发店上午': ['林知夏', '阿珍'],
  '父亲家黄昏': ['林知夏', '陈牧'],
  '陈牧家晚饭': ['林知夏', '陈牧', '苏曼'],
  '医院告别': ['林知夏', '林父'],
  '理发店深谈': ['林知夏', '阿珍'],
  '水边踩点': ['林知夏'],
  '镇政府远观': ['林知夏', '陈牧'],
  '找老周': ['林知夏', '老周'],
  '老周交备忘': ['林知夏', '老周'],
  '夜里复印': ['林知夏'],
  '水坝雨夜': ['林知夏', '陈牧'],
  '父亲卧室凌晨': ['林知夏'],
  '雨中独行': ['林知夏'],
  '苏曼来访': ['林知夏', '苏曼'],
  '陈牧的恐惧': ['陈牧', '苏曼'],
  '镇政府台阶正午': ['林知夏', '陈牧', '苏曼'],
  '警车前的五分钟': ['林知夏', '陈牧'],
  '渡口清晨': ['林知夏']
};

// 找每张 plot card 对应的 scene（通过 linked_plot_card_ids 反查），把场景人物写回 card
const scenes = proj.scene_workbench.scenes;
for (const card of proj.plot_board.cards) {
  const linkedScene = scenes.find(s => (s.linked_plot_card_ids || []).includes(card.id));
  if (!linkedScene) continue;
  const charNames = sceneCharMap[linkedScene.title] || [];
  card.character_ids = charNames.map(findId).filter(Boolean);
}

// 同时清空已有剧本，强制重生
proj.scene_workbench.scenes.forEach(s => { s.script_full = ''; s.screenplay_notes = ''; });

const r = await api('PUT', `/api/projects/${pid}`, { project: proj });
console.log('PUT:', r.s);
const verify = (await api('GET', `/api/projects/${pid}`)).j.project;
console.log('card char_ids 修补后:');
verify.plot_board.cards.slice(0, 7).forEach(c => console.log(' ', c.title, '→', c.character_ids.length, '人'));

// UI 触发 bulk
const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('dialog', async d => { await d.accept(); });

await page.goto(BASE); await w(2000);
await page.locator(`[data-action="open-project"][data-id="${pid}"]`).first().click(); await w(1500);
await page.locator('#stepper-nav .step-button[data-id="screenplay"]').click(); await w(1000);

await page.evaluate(() => { window.confirm = () => true; });
await page.locator('button[data-action="ai-write-screenplay-bulk"]').click();
const start = Date.now();
while (Date.now() - start < 30 * 60 * 1000) {
  await w(15000);
  const st = await page.evaluate(() => {
    const btn = document.querySelector('button[data-action="ai-write-screenplay-bulk"]');
    const ss = Array.from(document.querySelectorAll('.screenplay-scene-item__status')).map(e => e.textContent?.trim() || '');
    return { btnText: btn?.textContent?.trim() || '', 成稿: ss.filter(s => s === '已成稿').length };
  });
  console.log(`[${Math.round((Date.now()-start)/1000)}s] ${st.btnText} · 成稿 ${st.成稿}`);
  if (!st.btnText.includes('批量中')) break;
}

const dp = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.locator('button[data-action="export-screenplay-fountain"]').click();
const dl = await dp;
const fp = path.join(SHOTS, '小镇七十二小时-v8-fixed.fountain');
if (dl) await dl.saveAs(fp);

const finalText = fs.readFileSync(fp, 'utf-8');
// 重新统计替代名
const placeholders = (finalText.match(/^(女人|男人|来人|陌生人|主角|路人[甲乙丙丁])$/gm) || []);
console.log(`\n替代名出现: ${placeholders.length} 处 (含路人甲/乙等可接受的群众通名)`);
const realPlaceholders = (finalText.match(/^(女人|男人|来人|陌生人|主角)$/gm) || []);
console.log(`真正的替代名（指代具体角色却用了"女人/男人/来人/陌生人/主角"）: ${realPlaceholders.length} 处`);

await browser.close();
