// 真实使用模式：按 P0 修稿指令逐场前端重写（场景拆解写 notes/purpose → 剧本撰写 AI 写本场）
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realuse-shots';

const TAG = '【P0 修稿指令】';
const P0 = {
  scene_001: {
    purpose: null,
    notes: [
      'P0-伏笔推进：在沈澜写下便签《缺：47-49》那一拍之后，加一个动作——她翻回卷宗封皮，发现内侧有一枚旧的指纹印（油渍/烟味），不点名是谁，但要建立「有人动过」的物证锚点，为下一场周岭被报出卷宗编号埋雷。',
      'P0-林絮锚点（避免下一场天降证人）：在卷宗夹层里放一张校服照片的碎角（不点名、不解释），让观众日后见到林絮时是「确认」而非「初识」。',
      '硬约束：本场便签页码必须保持「缺47-49」三页，不得改成其它数字（下一场台词要与此一致）。',
    ],
  },
  scene_002: {
    purpose: null,
    notes: [
      'P0-页码连续性：沈澜报出卷宗缺页时必须说「第三卷，第四十七到四十九页，缺页」，与上一场便签「缺47-49」完全一致；严禁出现「第十七到第二十二页」等矛盾页码。',
      'P0-林絮锚点（避免下一场天降证人）：母亲缺席的椅背披肩口袋里，露出一封未拆的信封，落款一个「林」字（不展开、不解释），为下一场林絮出场做铺垫。',
    ],
  },
  scene_003: {
    purpose: '确认匿名信寄件人身份并完成对继父的指认',
    notes: [
      'P0-反光条认领要慢、要私人化：沈澜看到周岭袖口的深绿色反光条后，先插一个极短反应镜头——她无意识地摸了摸自己风衣袖口同一位置，暗示这条反光条是她当年亲手给周岭缝上的（家务记忆）；让「认出」成为情感重击，而不是单纯的视觉巧合。',
      'P0-公平线索：林絮此前已在场1（卷宗夹层校服照片碎角）、场2（披肩口袋「林」字信封）被铺垫，本场她的出现应是「确认」，不要再写成凭空登场的知情者。',
    ],
  },
};
const ORDER = ['scene_001', 'scene_002', 'scene_003'];

async function setField(loc, value) {
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
  await loc.fill('');
  await loc.type(String(value), { delay: 4 });
  await loc.dispatchEvent('input');
  await loc.dispatchEvent('change');
}

const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('  [pageerror]:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('  [console err]:', m.text()); });
p.on('dialog', async d => { console.log('  [dialog]', d.type(), JSON.stringify(d.message().slice(0, 40))); await d.accept(); });

await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('[data-action="open-project"]').first().click();
await p.waitForTimeout(800);

for (const sid of ORDER) {
  const spec = P0[sid];
  console.log(`\n=== ${sid} ===`);

  // 1. 进场景拆解
  await p.locator('text=场景拆解').first().click();
  await p.waitForTimeout(700);
  // 选中该场
  await p.locator(`[data-action="select-scene"][data-id="${sid}"]`).click();
  await p.waitForTimeout(500);

  // 2. 场目的（仅场3）
  if (spec.purpose) {
    const purp = p.locator('[data-action="scene-field"][data-field="purpose"]');
    if (await purp.count()) { await setField(purp.first(), spec.purpose); console.log('  purpose set'); }
  }

  // 3. 展开备注并写入 P0 指令（保留旧备注）
  const notesSummary = p.locator('.scene-edv2__notes summary').first();
  if (await notesSummary.count()) { await notesSummary.click().catch(() => {}); await p.waitForTimeout(200); }
  const notesTa = p.locator('[data-action="scene-field"][data-field="notes"]').first();
  const old = (await notesTa.inputValue().catch(() => '')) || '';
  const cleaned = old.replace(new RegExp(TAG + '[\\s\\S]*$'), '').trim();
  const block = `${TAG}\n` + spec.notes.map((n, i) => `${i + 1}. ${n}`).join('\n');
  const merged = cleaned ? `${cleaned}\n\n${block}` : block;
  await setField(notesTa, merged);
  console.log('  notes written');

  // 4. 保存
  await p.locator('#save-button').click();
  await p.waitForTimeout(1000);

  // 5. 进剧本撰写，选中该场，AI 写本场
  await p.locator('text=剧本撰写').first().click();
  await p.waitForTimeout(800);
  await p.locator(`[data-action="select-screenplay-scene"][data-id="${sid}"]`).click();
  await p.waitForTimeout(500);

  const writeBtn = p.locator(`[data-action="ai-write-scene-script"][data-id="${sid}"]`);
  await writeBtn.scrollIntoViewIfNeeded();
  const respP = p.waitForResponse(
    r => /\/api\/generate/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 180000 }
  ).catch(() => null);
  await writeBtn.click();
  console.log('  AI 写本场 clicked, waiting...');
  const resp = await respP;
  console.log('  generate ->', resp ? resp.status() : 'NO RESPONSE');
  // 等按钮恢复（写作完成）
  await p.locator(`[data-action="ai-write-scene-script"][data-id="${sid}"]:not([disabled])`)
    .waitFor({ timeout: 60000 }).catch(() => console.log('  [WARN] 按钮未恢复'));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/p0-${sid}-rewritten.png`, fullPage: true });
}

// 最后保存一次
await p.locator('#save-button').click();
await p.waitForTimeout(1200);
await b.close();
console.log('\nP0 REWRITE DONE');
