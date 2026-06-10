// audit-round5 run3: CRUD 实测（场景/剧情卡/人物/关系/时间线）+ 弹窗预览 + 项目卡菜单 + 向导
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'http://127.0.0.1:4173';
const OUT = 'tests/e2e/audit-round5';
const PID = 'project_mptv97q3_xyh2ju';
const consoleLog = [], dialogLog = [];
let ctxName = 'init';

async function shot(page, name) { await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot:', name); }
async function apiScenes() {
  const r = await fetch(`${URL}/api/projects/${PID}`); const j = await r.json();
  return {
    scenes: j.project.scene_workbench.scenes.length,
    cards: j.project.plot_board.cards.length,
    chars: j.project.character_hub.characters.length,
    rels: j.project.character_hub.relationship_map.length,
    timeline: (j.project.lock_layer?.projections?.timeline_events || []).length,
  };
}

(async () => {
  console.log('API before:', JSON.stringify(await apiScenes()));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleLog.push(`[${ctxName}] ${m.text()}`); });
  page.on('pageerror', e => consoleLog.push(`[${ctxName}][pageerror] ${e.message}`));
  page.on('dialog', async d => { dialogLog.push(`[${ctxName}] ${d.type()}: ${d.message().slice(0, 80)}`); await d.accept(); });

  await page.goto(URL, { waitUntil: 'networkidle' });

  // G. 项目中心卡片 "..." 菜单
  ctxName = 'card-menu';
  const dots = page.locator('.project-card button:has-text("…"), [data-action="request-delete-project"], button:has-text("⋯"), button:has-text("...")');
  console.log('dots-like buttons:', await dots.count());
  // 直接找次要卡片上的菜单按钮
  const menuBtn = page.locator('article button').filter({ hasText: /^(\.\.\.|…|⋯)$/ });
  if (await menuBtn.count()) { await menuBtn.first().click(); await shot(page, 'c01-card-menu-open'); await page.keyboard.press('Escape'); }
  else console.log('NO card menu button matched');

  await page.locator(`[data-id="${PID}"]`).first().click();
  await page.waitForTimeout(900);

  // ---------- A. 场景 CRUD ----------
  ctxName = 'scene-add';
  await page.locator('text=场景拆解').first().click(); await page.waitForTimeout(700);
  const sceneRows = () => page.locator('[data-action="select-scene"]');
  const before = await sceneRows().count();
  await page.locator('[data-action="add-scene"]').click(); await page.waitForTimeout(600);
  console.log('scene count', before, '->', await sceneRows().count());
  await shot(page, 'c02-scene-added');
  // 编辑标题
  ctxName = 'scene-edit';
  const titleInput = page.locator('[data-action="scene-field"][data-field="title"]:visible').first();
  console.log('title input found:', await titleInput.count());
  await titleInput.fill('【测试】审计场景'); await titleInput.blur(); await page.waitForTimeout(800);
  await shot(page, 'c03-scene-renamed');
  // 验证剧本撰写页可见
  await page.locator('text=剧本撰写').first().click(); await page.waitForTimeout(700);
  const hasInScreenplay = await page.locator('text=【测试】审计场景').count();
  console.log('test scene visible in screenplay page:', hasInScreenplay);
  await shot(page, 'c04-scene-in-screenplay');
  console.log('API after scene add:', JSON.stringify(await apiScenes()));
  // 删除（观察是否有确认弹窗）
  ctxName = 'scene-delete';
  await page.locator('text=场景拆解').first().click(); await page.waitForTimeout(600);
  await page.locator('[data-action="select-scene"]:has-text("【测试】审计场景")').first().click(); await page.waitForTimeout(400);
  await page.locator('[data-action="delete-scene"]:visible').first().click(); await page.waitForTimeout(700);
  console.log('scene count after delete:', await sceneRows().count(), '| dialogs so far:', dialogLog.length);
  await shot(page, 'c05-scene-deleted');

  // ---------- B. 剧情卡 CRUD ----------
  ctxName = 'plot-add';
  await page.locator('text=剧情开发').first().click(); await page.waitForTimeout(800);
  await page.locator('[data-action="add-plot-card"]:visible').first().click(); await page.waitForTimeout(700);
  await shot(page, 'c06-plot-added');
  // 编辑器应已打开或需要打开；填标题
  const plotTitle = page.locator('[data-action="plot-field"][data-field="title"]:visible').first();
  console.log('plot title input:', await plotTitle.count());
  if (await plotTitle.count()) { await plotTitle.fill('【测试】审计剧情卡'); await plotTitle.blur(); await page.waitForTimeout(600); }
  await shot(page, 'c07-plot-renamed');
  // 关闭编辑器
  await page.locator('[data-action="close-plot-editor"]:visible').first().click().catch(() => {});
  await page.waitForTimeout(500);
  // 场景拆解页关联剧情卡列表互通验证
  await page.locator('text=场景拆解').first().click(); await page.waitForTimeout(600);
  console.log('test plot card visible in scene page:', await page.locator('text=【测试】审计剧情卡').count());
  await shot(page, 'c08-plot-in-scenepage');
  // 删除 → 废纸篓 → 彻底删除
  ctxName = 'plot-delete';
  await page.locator('text=剧情开发').first().click(); await page.waitForTimeout(700);
  // 找到测试卡的删除按钮：先开编辑器
  const testCard = page.locator('.pgrid-card:has-text("【测试】审计剧情卡"), [class*="card"]:has-text("【测试】审计剧情卡")').first();
  console.log('test card located:', await testCard.count());
  const editBtn = page.locator(':is(.pgrid-card,[class*="card"]):has-text("【测试】审计剧情卡") >> text=编辑');
  if (await editBtn.count()) { await editBtn.first().click(); await page.waitForTimeout(500); }
  const delBtn = page.locator('[data-action="delete-plot-card"]:visible');
  console.log('delete-plot-card visible:', await delBtn.count());
  if (await delBtn.count()) { await delBtn.first().click(); await page.waitForTimeout(600); }
  await shot(page, 'c09-plot-deleted-to-trash');
  await page.locator('[data-action="toggle-plot-trash-view"]').click(); await page.waitForTimeout(500);
  await shot(page, 'c10-plot-trash-view');
  const purge = page.locator('[data-action="purge-plot-card"]:visible');
  console.log('purge buttons:', await purge.count());
  if (await purge.count()) { await purge.first().click(); await page.waitForTimeout(500); }
  await shot(page, 'c11-plot-purged');
  await page.locator('[data-action="toggle-plot-trash-view"]').click().catch(() => {});

  // ---------- C. 人物 CRUD ----------
  ctxName = 'char-add';
  await page.locator('text=人物核心').first().click(); await page.waitForTimeout(700);
  await page.locator('[data-action="add-character"]:visible').first().click(); await page.waitForTimeout(600);
  await shot(page, 'c12-char-added');
  const nameInput = page.locator('[data-action="character-field"][data-field="name"]:visible').first();
  console.log('char name input:', await nameInput.count());
  if (await nameInput.count()) { await nameInput.fill('测试角色甲'); await nameInput.blur(); await page.waitForTimeout(700); }
  await shot(page, 'c13-char-named');
  // 互通：关系页下拉、场景页 POV
  await page.locator('text=关系张力').first().click(); await page.waitForTimeout(600);
  const inRelSelect = await page.locator('option:has-text("测试角色甲")').count();
  console.log('test char in relationship selects (options):', inRelSelect);
  await page.locator('text=场景拆解').first().click(); await page.waitForTimeout(600);
  const inPov = await page.locator('text=测试角色甲').count();
  console.log('test char visible on scene page (POV):', inPov);
  await shot(page, 'c14-char-in-pov');

  // ---------- D. 关系 CRUD ----------
  ctxName = 'rel-add';
  await page.locator('text=关系张力').first().click(); await page.waitForTimeout(600);
  const relCountBefore = await page.locator('[data-action="select-relationship"]').count();
  await page.locator('[data-action="add-relationship"]:visible').first().click(); await page.waitForTimeout(600);
  const relCountAfter1 = await page.locator('[data-action="select-relationship"]').count();
  console.log('rel rows after 新增 click #1:', relCountBefore, '->', relCountAfter1, '(若相等=去重直接选中既有关系，未新建)');
  await shot(page, 'c15-rel-add-click1');
  // 把选中关系的角色B改成 测试角色甲（注意：这是在改既有关系——记录这一点）
  const selB = page.locator('select[data-action="relationship-field"][data-field="target_character_id"]:visible').first();
  console.log('target select found:', await selB.count());
  if (await selB.count()) {
    await selB.selectOption({ label: '测试角色甲' }).catch(async e => {
      console.log('selectOption by label failed:', e.message);
      const opts = await selB.locator('option').allInnerTexts(); console.log('options:', opts);
    });
    await page.waitForTimeout(600);
  }
  await shot(page, 'c16-rel-target-changed');
  // 再点新增 → 现在 (沈,周) 不存在，应能新建
  await page.locator('[data-action="add-relationship"]:visible').first().click(); await page.waitForTimeout(600);
  const relCountAfter2 = await page.locator('[data-action="select-relationship"]').count();
  console.log('rel rows after 新增 click #2:', relCountAfter2);
  await shot(page, 'c17-rel-added-second');
  // 删除新建的那条（当前选中）
  ctxName = 'rel-delete';
  const relDel = page.locator('[data-action="delete-relationship"]:visible');
  if (await relDel.count()) { await relDel.first().click(); await page.waitForTimeout(600); }
  console.log('rel rows after delete:', await page.locator('[data-action="select-relationship"]').count(), '| dialogs:', dialogLog.length);
  await shot(page, 'c18-rel-deleted');

  // 删除测试人物（观察确认弹窗有无）
  ctxName = 'char-delete';
  await page.locator('text=人物核心').first().click(); await page.waitForTimeout(600);
  await page.locator('[data-action="select-character"]:has-text("测试角色甲")').first().click().catch(() => {});
  await page.waitForTimeout(400);
  const charDel = page.locator('[data-action="delete-character"]:visible');
  console.log('char delete btn:', await charDel.count());
  if (await charDel.count()) { await charDel.first().click(); await page.waitForTimeout(700); }
  console.log('char still present:', await page.locator('text=测试角色甲').count(), '| dialogs:', dialogLog.length);
  await shot(page, 'c19-char-deleted');

  // ---------- E. 时间线节点 ----------
  ctxName = 'timeline';
  await page.locator('#page-library-button').click(); await page.waitForTimeout(700);
  await page.locator('[data-action="add-timeline"]').click(); await page.waitForTimeout(600);
  await shot(page, 'c20-timeline-added');
  const tlSummary = page.locator('[data-action="timeline-field"][data-field="summary"]:visible').first();
  if (await tlSummary.count()) { await tlSummary.fill('【测试】审计时间节点'); await tlSummary.blur(); await page.waitForTimeout(600); }
  await shot(page, 'c21-timeline-filled');
  // 找删除按钮
  const tlDel = await page.locator('button:visible').filter({ hasText: /删除|移除|🗑/ }).allInnerTexts();
  console.log('visible delete-ish buttons on timeline tab:', JSON.stringify(tlDel));
  console.log('API after timeline add:', JSON.stringify(await apiScenes()));
  await page.locator('[data-action="library-back"]').click(); await page.waitForTimeout(500);

  // ---------- F. 全本预览（popup） ----------
  ctxName = 'popup-preview';
  await page.locator('text=剧本撰写').first().click(); await page.waitForTimeout(700);
  const popupP = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await page.locator('[data-action="preview-screenplay-full"]').click();
  const popup = await popupP;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded');
    await popup.setViewportSize({ width: 1400, height: 1080 });
    await popup.waitForTimeout(700);
    await popup.screenshot({ path: `${OUT}/c22-fullpreview-popup.png` });
    fs.writeFileSync(`${OUT}/text-fullpreview.txt`, await popup.locator('body').innerText());
    console.log('popup opened, title:', await popup.title());
    await popup.close();
  } else console.log('NO POPUP for 全本预览');

  // ---------- H. 新建向导到第二步 ----------
  ctxName = 'wizard';
  await page.locator('[data-action="back-to-projects"]').first().click().catch(() => page.locator('#page-project-button').click());
  await page.waitForTimeout(700);
  await page.locator('[data-action="open-create-mode-picker"]').first().click(); await page.waitForTimeout(500);
  await shot(page, 'c23-create-picker');
  await page.locator('[data-action="open-quick-creation"]').first().click(); await page.waitForTimeout(800);
  await shot(page, 'c24-wizard-step1');
  fs.writeFileSync(`${OUT}/text-wizard-step1.txt`, await page.locator('body').innerText());
  const visTa = page.locator('textarea:visible').first();
  if (await visTa.count()) { await visTa.fill('深夜便利店的店员发现每个雨夜都会出现同一位顾客购买同一件商品，直到某天他在监控里看见了自己。'); await page.waitForTimeout(400); }
  const allBtns = (await page.locator('button:visible').allInnerTexts()).filter(t => t.trim());
  console.log('wizard step1 buttons:', JSON.stringify(allBtns.slice(0, 30)));
  const next = page.locator('button:visible').filter({ hasText: /下一步|继续|生成/ }).first();
  if (await next.count()) {
    console.log('clicking next-ish button:', await next.innerText());
    await next.click(); await page.waitForTimeout(1500);
    await shot(page, 'c25-wizard-step2');
    fs.writeFileSync(`${OUT}/text-wizard-step2.txt`, await page.locator('body').innerText());
    const btns2 = (await page.locator('button:visible').allInnerTexts()).filter(t => t.trim());
    console.log('wizard step2 buttons:', JSON.stringify(btns2.slice(0, 30)));
  }
  // 取消
  ctxName = 'wizard-cancel';
  const cancel = page.locator('button:visible').filter({ hasText: /取消|退出|返回/ }).first();
  if (await cancel.count()) { console.log('cancel via:', await cancel.innerText()); await cancel.click(); await page.waitForTimeout(700); }
  else { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  await shot(page, 'c26-after-cancel');

  console.log('API final:', JSON.stringify(await apiScenes()));
  console.log('--- dialogs fired:', dialogLog.length); dialogLog.forEach(l => console.log(l));
  console.log('--- console errors:', consoleLog.length); consoleLog.forEach(l => console.log(l));
  fs.writeFileSync(`${OUT}/console-run3.log`, [...consoleLog, '--dialogs--', ...dialogLog].join('\n'));
  await browser.close();
  console.log('RUN3 DONE');
})();
