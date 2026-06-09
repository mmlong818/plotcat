// 真实使用模式：填充已存在的空 convention/taboo 条目（修复 bug 后验证）
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realuse-shots';

async function fill(loc, value) {
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
  await loc.fill('');
  await loc.type(String(value), { delay: 6 });
  await loc.dispatchEvent('input');
}

const CONV = [
  ['公平线索', '所有指向真相的关键证据须在揭晓前以画面或台词向观众呈现，禁止凭空翻案。'],
  ['渐进式真相', '真相分层释放，每一幕推翻一个先前的认知，而非结尾一次性倒豆子。'],
  ['情感代价', '每一次侦破推进都必须伴随主角的情感损耗或关系裂痕，悬疑服务于人物。'],
];
const TAB = [
  ['天降证人', '靠从未铺垫过的人物或物证一举破案，违背公平线索原则。'],
  ['旁白解谜', '用上帝视角旁白直接告知观众真相，绕过戏剧化呈现。'],
];

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('  [pageerror]:', e.message));
await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('[data-action="open-project"]').first().click();
await p.waitForTimeout(700);
await p.locator('#page-library-button').click();
await p.waitForTimeout(600);
await p.locator('[data-action="locks-tab"][data-id="genres"]').click();
await p.waitForTimeout(400);

const names = p.locator('[data-action="convention-field"][data-field="name"]');
const descs = p.locator('[data-action="convention-field"][data-field="description"]');
const cn = await names.count();
console.log('existing conventions:', cn);
for (let i = 0; i < Math.min(cn, CONV.length); i++) {
  await fill(names.nth(i), CONV[i][0]);
  await fill(descs.nth(i), CONV[i][1]);
  console.log('  filled conv', i, CONV[i][0]);
}

const tnames = p.locator('[data-action="taboo-field"][data-field="name"]');
const tdescs = p.locator('[data-action="taboo-field"][data-field="description"]');
const tn = await tnames.count();
console.log('existing taboos:', tn);
for (let i = 0; i < Math.min(tn, TAB.length); i++) {
  await fill(tnames.nth(i), TAB[i][0]);
  await fill(tdescs.nth(i), TAB[i][1]);
  console.log('  filled taboo', i, TAB[i][0]);
}

await p.locator('#save-button').click();
await p.waitForTimeout(1300);
await p.screenshot({ path: `${OUT}/g05-filled-saved.png`, fullPage: true });
await b.close();
console.log('FILL EXISTING DONE');
