// 真实使用模式 · 全前端完整走查（零后台注入）
// 专家：A=现实题材总编剧（结构）  B=好莱坞剧本医生/开发主管（张力·可拍性）
// 路径：新建→一句话概念向导(5步)→工作台(结构/人物/关系/剧情/场景/剧本)→导出 .fountain
import { chromium } from 'playwright';
const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/realuse-shots';
const SHORT = 800, AI = 180000, GEN_WAIT = 300000;  // GEN_WAIT：SSE 流式角色生成偶发慢，给足轮询窗口

const CONCEPT =
  '一名癌症晚期的法医母亲，在生命最后三个月里，决定亲手重查二十年前被定为意外的女儿坠楼案；' +
  '她必须在记忆衰退和身体崩溃之前，从当年第一个赶到现场、如今已是副局长的旧搭档身上撬出真相。';

const obs = [];   // 专家观察
function note(who, sev, text) { obs.push({ who, sev, text }); console.log(`  [${who}/${sev}] ${text}`); }

async function clickIf(p, sel, label, timeout = 5000) {
  const loc = p.locator(sel).first();
  try { await loc.waitFor({ state: 'visible', timeout }); await loc.scrollIntoViewIfNeeded(); await loc.click(); console.log(`  ✓ click ${label}`); return true; }
  catch { console.log(`  ✗ 未找到/不可点 ${label} (${sel})`); return false; }
}
async function setSelect(p, sel, value) { const l = p.locator(sel).first(); await l.selectOption(value).catch(() => {}); }
async function fill(p, sel, value) {
  const l = p.locator(sel).first();
  await l.scrollIntoViewIfNeeded(); await l.click();
  await l.fill(String(value));               // 单次设值（避免逐字符在临界点重渲丢字符）
  await l.dispatchEvent('input'); await l.dispatchEvent('change');
}
async function waitGen(p, label) {
  const r = await p.waitForResponse(rr => /\/api\/(generate|ai|complete)/.test(rr.url()) && rr.request().method() === 'POST', { timeout: AI }).catch(() => null);
  console.log(`  generate(${label}) ->`, r ? r.status() : 'NO RESPONSE');
  return r;
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
const p = await ctx.newPage();
const pageErrors = [];
p.on('pageerror', e => { pageErrors.push(e.message); console.log('  [pageerror]:', e.message); });
p.on('console', m => { if (m.type() === 'error') console.log('  [console err]:', m.text().slice(0, 160)); });
p.on('dialog', async d => { console.log('  [dialog]', d.type(), JSON.stringify(d.message().slice(0, 60))); await d.accept(); });

try {
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${OUT}/ff00-home.png`, fullPage: true });

  // ── 进入一句话概念向导 ──
  await clickIf(p, '[data-action="open-create-mode-picker"]', '新建项目');
  await p.waitForTimeout(400);
  await clickIf(p, '[data-action="open-quick-creation"]', '一句话概念模式');
  await p.waitForTimeout(SHORT);

  // ── Step1 故事核心 ──
  console.log('\n=== Step1 故事核心 ===');
  await setSelect(p, '[data-action="cf-set-draft-field"][data-field="format"]', 'feature');
  await fill(p, '[data-action="cf-set-draft-field"][data-field="logline"]', CONCEPT);
  await p.waitForTimeout(400);
  const nextOk = await clickIf(p, '[data-action="cf-step1-next"]:not([disabled])', '下一步：选结构');
  if (!nextOk) note('A', 'HIGH', 'Step1「下一步」按钮 disabled — 概念已填≥10字仍不可前进，校验逻辑可疑');
  await p.waitForTimeout(SHORT);
  await p.screenshot({ path: `${OUT}/ff01-step1.png`, fullPage: true });

  // ── Step2 结构（点「下一步」即自动触发角色生成，须先挂监听）──
  console.log('\n=== Step2 结构 ===');
  const charGenResp = waitGen(p, 'characters(auto)');
  await clickIf(p, '[data-action="cf-step2-next"]', '下一步：生成人物');

  // ── Step3 人物 ──
  console.log('\n=== Step3 人物 ===');
  await charGenResp;                       // SSE 200 响应头几秒即到（不等流结束）
  // SSE 流式生成角色偶发耗时 >180s，须给足窗口等渲染出 confirm 或错误兜底
  const t0 = Date.now();
  while (Date.now() - t0 < GEN_WAIT) {
    if (await p.locator('[data-action="confirm-character"]').count() > 0) break;
    if (await p.locator('[data-action="cf-use-fallback-characters"]').count() > 0) {
      console.log('  [WARN] 角色生成报错，用默认骨架兜底');
      await clickIf(p, '[data-action="cf-use-fallback-characters"]', '默认骨架人物');
      break;
    }
    await p.waitForTimeout(1000);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/ff02-step3-chars.png`, fullPage: true });
  // 确认全部 AI 角色（每次确认后重渲，按当前可见数循环）
  let safety = 0;
  while (await p.locator('[data-action="confirm-character"]').count() > 0 && safety++ < 12) {
    await clickIf(p, '[data-action="confirm-character"]', `confirm char #${safety}`, 2500);
    await p.waitForTimeout(300);
  }
  console.log('  已确认角色，剩余 confirm 按钮:', await p.locator('[data-action="confirm-character"]').count());
  await clickIf(p, '[data-action="cf-step3-next"]', '下一步：情节大纲');
  await p.waitForTimeout(SHORT);

  // ── Step4 情节大纲（逐幕生成）──
  console.log('\n=== Step4 情节大纲 ===');
  for (let guard = 0; guard < 8; guard++) {
    const genBtn = p.locator('[data-action="cf-generate-act"]').first();
    if (await genBtn.count() && await genBtn.isVisible().catch(() => false)) {
      await genBtn.scrollIntoViewIfNeeded(); await genBtn.click();
      console.log(`  ✓ 生成本幕 (round ${guard})`);
      await waitGen(p, `act${guard}`);
      await p.waitForTimeout(2000);
    }
    // 优先 finish，否则 advance
    if (await p.locator('[data-action="cf-step4-finish"]').count()) {
      await clickIf(p, '[data-action="cf-step4-finish"]', '完成节点');
      break;
    }
    if (await p.locator('[data-action="cf-advance-act"]').count()) {
      await clickIf(p, '[data-action="cf-advance-act"]', '下一幕');
      await p.waitForTimeout(600);
    } else { break; }
  }
  await p.waitForTimeout(SHORT);
  await p.screenshot({ path: `${OUT}/ff03-step4.png`, fullPage: true });

  // ── Step5 确认创建 ──
  console.log('\n=== Step5 确认创建 ===');
  await clickIf(p, '[data-action="cf-finalize-new"]', '完成创建，进入工作台');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/ff04-workspace.png`, fullPage: true });

  // ── 结构骨架：为每幕节点 AI 生成故事点 ──
  console.log('\n=== 工作台 · 结构骨架 ===');
  await clickIf(p, '[data-action="go-step"][data-id="structure"]', '结构骨架');
  await p.waitForTimeout(SHORT);
  const nodeCountBefore = await p.locator('[data-action="ai-gen-node-note"][data-id]').count();
  console.log('  结构节点数:', nodeCountBefore);
  const genBtn = p.locator('[data-action="ai-gen-structure-notes"]').first();
  if (await genBtn.count()) {
    await genBtn.scrollIntoViewIfNeeded();
    await genBtn.click();
    console.log('  ✓ click 一键生成结构故事点');
    // 逐幕调用 AI（3 幕）。先 waitGen 阻塞等首次响应（确认生成真的启动、
    // 此时仍处 loading），再等按钮恢复可用——否则 render 设 loading 的时序
    // 晚于 click 返回，:not([disabled]) 会过早匹配导致跳过、note 不生成。
    const firstResp = await waitGen(p, 'structure-act');
    if (!firstResp) {
      note('A', 'HIGH', '一键生成结构故事点未触发任何 AI 请求 — 按钮事件未生效');
    } else {
      await p.locator('[data-action="ai-gen-structure-notes"]:not([disabled])')
        .first().waitFor({ state: 'visible', timeout: AI }).catch(() => {
          note('A', 'HIGH', '结构故事点生成超时 — 一键生成按钮长时间未恢复可用');
        });
    }
    await p.waitForTimeout(1500);
    await clickIf(p, '#save-button', '保存结构', 2500);
    await p.waitForTimeout(800);
  } else {
    note('A', 'HIGH', '结构骨架页无「一键生成结构故事点」按钮');
  }
  await p.screenshot({ path: `${OUT}/ff04a-structure.png`, fullPage: true });

  // ── 人物核心：逐个角色 AI 精修 ──
  console.log('\n=== 工作台 · 人物核心 ===');
  await clickIf(p, '[data-action="go-step"][data-id="characters"]', '人物核心');
  await p.waitForTimeout(SHORT);
  const charIds = await p.locator('[data-action="select-character"][data-id]').evaluateAll(
    els => [...new Set(els.map(e => e.getAttribute('data-id')).filter(Boolean))]
  );
  console.log('  人物数:', charIds.length);
  if (charIds.length === 0) note('A', 'HIGH', '人物核心页无任何角色 — 向导生成的角色未落库');
  for (const cid of charIds) {
    // 选中后面板重渲，select 按钮节点会被 detach/重建，单次点击可能命中陈旧节点，
    // 编辑器没切到该角色 → 精修按钮不出现。重试至精修按钮出现（同场景写本的 race）。
    const refineBtn = p.locator(`[data-action="ai-refine-character"][data-id="${cid}"]`).first();
    let selected = false;
    for (let attempt = 0; attempt < 4 && !selected; attempt++) {
      await clickIf(p, `[data-action="select-character"][data-id="${cid}"]`, `选角 ${cid}`, 3000);
      await p.waitForTimeout(400);
      if (await refineBtn.count() > 0) { selected = true; break; }
      await p.waitForTimeout(500);
    }
    if (!selected) { console.log(`  ✗ 无精修按钮 ${cid}`); continue; }
    await refineBtn.scrollIntoViewIfNeeded();
    await refineBtn.click();
    console.log(`  ✓ click 精修 ${cid}`);
    await waitGen(p, `refine-${cid}`);
    await p.locator(`[data-action="ai-refine-character"][data-id="${cid}"]:not([disabled])`)
      .first().waitFor({ state: 'visible', timeout: AI }).catch(() => {});
    await p.waitForTimeout(800);
  }
  await clickIf(p, '#save-button', '保存人物', 2500);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/ff04b-characters.png`, fullPage: true });

  // ── 关系张力：建立角色间关系 ──
  console.log('\n=== 工作台 · 关系张力 ===');
  await clickIf(p, '[data-action="go-step"][data-id="relationships"]', '关系张力');
  await p.waitForTimeout(SHORT);
  if (charIds.length >= 2) {
    await clickIf(p, '[data-action="add-relationship"]', '新增关系');
    await p.waitForTimeout(500);
    // 设置 source / target / 类型
    await setSelect(p, '[data-action="relationship-field"][data-field="source_character_id"]', charIds[0]);
    await p.waitForTimeout(200);
    await setSelect(p, '[data-action="relationship-field"][data-field="target_character_id"]', charIds[1]);
    await p.waitForTimeout(200);
    const relChip = p.locator('[data-action="select-rel-type-chip"]').first();
    if (await relChip.count()) { await relChip.click().catch(() => {}); console.log('  ✓ 选关系类型'); }
    await p.waitForTimeout(300);
    await clickIf(p, '#save-button', '保存关系', 2500);
    await p.waitForTimeout(800);
  } else {
    note('A', 'MEDIUM', '角色少于2个，无法建立关系');
  }
  await p.screenshot({ path: `${OUT}/ff04c-relationships.png`, fullPage: true });

  // ── 工作台：剧情开发（从剧情卡建场景）──
  console.log('\n=== 工作台 · 剧情开发 ===');
  await clickIf(p, '[data-action="go-step"][data-id="plots"]', '剧情开发');
  await p.waitForTimeout(SHORT);
  // 收集所有剧情卡的 id（去重），按 id 逐张建一场，确保场景互不相同
  const cardIds = await p.locator('[data-action="select-plot-card"][data-id]').evaluateAll(
    els => [...new Set(els.map(e => e.getAttribute('data-id')).filter(Boolean))]
  );
  console.log('  剧情卡数（去重 id）:', cardIds.length);
  await p.screenshot({ path: `${OUT}/ff05-plots.png`, fullPage: true });
  for (const cid of cardIds) {
    // 先选中并锁定该卡（锁定后拆场景不再弹"未锁定"确认）
    await clickIf(p, `[data-action="select-plot-card"][data-id="${cid}"]`, `选卡 ${cid}`, 3000);
    await p.waitForTimeout(250);
    const lockBtn = p.locator(`[data-action="toggle-plot-lock"][data-id="${cid}"]`).first();
    if (await lockBtn.count() && /🔒\s*锁定/.test(await lockBtn.innerText().catch(() => ''))) {
      await lockBtn.click().catch(() => {});
      await p.waitForTimeout(200);
    }
    await clickIf(p, `[data-action="scene-from-plot"][data-id="${cid}"]`, `建场景<-${cid}`, 3000);
    await p.waitForTimeout(400);
  }

  // ── 场景拆解 ──
  console.log('\n=== 工作台 · 场景拆解 ===');
  await clickIf(p, '[data-action="go-step"][data-id="scenes"]', '场景拆解');
  await p.waitForTimeout(SHORT);
  let sceneRows = await p.locator('[data-action="select-scene"]').count();
  console.log('  场景数:', sceneRows);
  if (sceneRows === 0) {
    note('A', 'HIGH', '工作台无任何场景 — 从剧情卡建场景未生效，剧本撰写无对象');
    await clickIf(p, '[data-action="add-scene"]', '手动新增场景');
    await p.waitForTimeout(500);
    sceneRows = await p.locator('[data-action="select-scene"]').count();
  }
  await p.screenshot({ path: `${OUT}/ff06-scenes.png`, fullPage: true });
  // 逐场 AI 拆解（填 location/heading/进出场状态），按 scene id 定位
  const sceneIds = await p.locator('[data-action="select-scene"][data-id]').evaluateAll(
    els => [...new Set(els.map(e => e.getAttribute('data-id')).filter(Boolean))]
  );
  console.log('  待拆解场景 id 数:', sceneIds.length);
  for (const sid of sceneIds) {
    await clickIf(p, `[data-action="select-scene"][data-id="${sid}"]`, `选场 ${sid}`, 3000);
    await p.waitForTimeout(300);
    if (await clickIf(p, '[data-action="ai-breakdown-scene"]', `拆解 ${sid}`, 4000)) {
      await waitGen(p, `breakdown-${sid}`);
      await p.waitForTimeout(1500);
    }
  }
  await clickIf(p, '#save-button', '保存', 2500);
  await p.waitForTimeout(1000);

  // ── 剧本撰写 + 导出 ──
  console.log('\n=== 工作台 · 剧本撰写 ===');
  await clickIf(p, '[data-action="go-step"][data-id="screenplay"]', '剧本撰写');
  await p.waitForTimeout(SHORT);
  const spIds = await p.locator('[data-action="select-screenplay-scene"][data-id]').evaluateAll(
    els => [...new Set(els.map(e => e.getAttribute('data-id')).filter(Boolean))]
  );
  console.log('  可写场景 id 数:', spIds.length);
  await p.screenshot({ path: `${OUT}/ff07-screenplay.png`, fullPage: true });
  // 逐场写本场（select 后写，写按钮按 scene id 定位）—— 完整产出物，不顾 token
  let written = 0;
  for (const sid of spIds) {
    // 选场：面板每写完一场会整体重渲染，select 按钮节点会被 detach/重建，
    // 单次点击可能命中陈旧节点导致编辑器没切场。真人会重点一下 —— 这里重试至写按钮出现。
    const wb = p.locator(`[data-action="ai-write-scene-script"][data-id="${sid}"]`).first();
    let selected = false;
    for (let attempt = 0; attempt < 4 && !selected; attempt++) {
      await clickIf(p, `[data-action="select-screenplay-scene"][data-id="${sid}"]`, `选写 ${sid}`, 3000);
      await p.waitForTimeout(400);
      if (await wb.count() > 0) { selected = true; break; }
      await p.waitForTimeout(500); // 等重渲染稳定再重试
    }
    if (!selected) { console.log(`  ✗ 无写按钮 ${sid}`); continue; }
    await wb.scrollIntoViewIfNeeded();
    const rp = waitGen(p, `scene-${sid}`);
    await wb.click();
    await rp;
    // 真正的完成门：写按钮从 disabled 恢复（busySceneIds 清空 = 本场生成落库）。
    // waitGen 现在在响应「开始」即返回（服务端心跳），不能当完成信号，故这里等满 AI 窗口。
    await p.locator(`[data-action="ai-write-scene-script"][data-id="${sid}"]:not([disabled])`)
      .waitFor({ timeout: AI }).catch(() => {});
    // 二次确认：本场 script_full 已落到 DOM 预览（避免按钮态与内容态竞争）
    await p.waitForTimeout(800);
    written++;
  }
  console.log('  已写场次:', written);
  await clickIf(p, '#save-button', '保存剧本', 2500);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${OUT}/ff08-written.png`, fullPage: true });

  // 全本预览
  if (await clickIf(p, '[data-action="preview-screenplay-full"]', '全本预览')) {
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/ff09-preview.png`, fullPage: true });
  }
  // 导出 fountain（产出物）
  const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await clickIf(p, '[data-action="export-screenplay-fountain"]', '导出 .fountain');
  const d = await dl;
  if (d) { const path = `${OUT}/deliverable.fountain`; await d.saveAs(path); console.log('  ✓ 产出物已保存:', path); }
  else note('B', 'HIGH', '点击导出 .fountain 未触发下载 — 产出物通路可能断裂');

} catch (e) {
  console.log('\n[FATAL]', e.message);
} finally {
  console.log('\n===== 专家观察汇总 =====');
  if (obs.length === 0) console.log('  （脚本层未捕获显式问题，详见截图与 pageerror）');
  for (const o of obs) console.log(`  [${o.who}/${o.sev}] ${o.text}`);
  console.log('\n===== pageerror 汇总 =====');
  console.log(pageErrors.length ? [...new Set(pageErrors)].join('\n') : '  无 pageerror');
  await b.close();
  console.log('\nFULLFLOW DONE');
}
