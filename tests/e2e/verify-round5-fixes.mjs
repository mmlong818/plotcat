import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', async d => { console.log('  [dialog]', d.type(), '|', d.message().split('\n')[0]); await d.dismiss(); });
await page.goto('http://127.0.0.1:4173');
await page.waitForTimeout(800);

// 1. 项目卡 ⋯ 菜单
await page.locator('.project-card__more').first().click();
await page.waitForTimeout(300);
const menu = await page.evaluate(() => [...document.querySelectorAll('[data-action="rename-project"],[data-action="request-delete-project"]')].map(b=>b.textContent.trim()));
console.log('1. ⋯ 菜单项:', menu);
await page.locator('[data-action="close-project-menu"]').click();
await page.waitForTimeout(200);

// 2. 进项目
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);

// 3. 关系新增（4人1关系 → 应新增成功一条新配对）
await page.click('[data-action="go-step"][data-id="relationships"]');
await page.waitForTimeout(500);
const before = await page.evaluate(() => document.body.innerText.match(/(\d+) 条关系/)?.[1]);
await page.click('[data-action="add-relationship"]');
await page.waitForTimeout(400);
const after = await page.evaluate(() => document.body.innerText.match(/(\d+) 条关系/)?.[1]);
console.log('3. 关系新增:', before, '→', after);
// 删掉测试关系（确认对话框会被 dismiss → 不删？需要 accept）
// 重新挂 accept 逻辑删除刚加的
page.removeAllListeners('dialog');
page.on('dialog', async d => { await d.accept(); });
await page.locator('[data-action="delete-relationship"]').click();
await page.waitForTimeout(400);
const restored = await page.evaluate(() => document.body.innerText.match(/(\d+) 条关系/)?.[1]);
console.log('   删除测试关系后:', restored, '（注意：删的是当前选中条，可能是新加那条）');

// 4. 词表
const chips = await page.evaluate(() => [...document.querySelectorAll('.rel-seg')].map(b=>b.textContent.trim()));
console.log('4. 词表含亲子/搭档/加害:', chips.includes('亲子羁绊'), chips.includes('搭档拍档'), chips.includes('加害与受害'), '| 总数:', chips.length);

// 5. 场景删除确认（dismiss → 不删）
page.removeAllListeners('dialog');
let dialogMsg = '';
page.on('dialog', async d => { dialogMsg = d.message(); await d.dismiss(); });
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(500);
const scenesBefore = await page.evaluate(() => document.querySelectorAll('.scene-row').length);
await page.locator('[data-action="delete-scene"]').first().click();
await page.waitForTimeout(400);
const scenesAfter = await page.evaluate(() => document.querySelectorAll('.scene-row').length);
console.log('5. 场景删除确认弹出:', dialogMsg.split('\n')[0], '| 取消后场数不变:', scenesBefore === scenesAfter);

// 6. 游离场警示
const orphans = await page.evaluate(() => [...document.querySelectorAll('.scene-row__orphan')].length);
console.log('6. 游离场警示数:', orphans, '(开场场景应为 1)');

// 7. 场景状态自愈（成稿场应显示已写成稿）
const statuses = await page.evaluate(() => [...document.querySelectorAll('.scene-row__meta')].map(e=>e.textContent.trim()));
console.log('7. 状态样本:', statuses.slice(7,10));

// 8. 资料库删除按钮
await page.click('#page-library-button');
await page.waitForTimeout(500);
await page.click('[data-action="add-timeline"]');
await page.waitForTimeout(400);
const delBtn = await page.locator('[data-action="delete-timeline"]').count();
page.removeAllListeners('dialog');
page.on('dialog', async d => { await d.accept(); });
if (delBtn) { await page.click('[data-action="delete-timeline"]'); await page.waitForTimeout(300); }
const tlLeft = await page.evaluate(() => [...document.querySelectorAll('[data-action="select-timeline"]')].length);
console.log('8. 时间线删除按钮存在:', !!delBtn, '| 删后节点数:', tlLeft);

// 9. 剧本页字数口径
await page.click('[data-action="library-back"]');
await page.waitForTimeout(400);
await page.click('[data-action="go-step"][data-id="screenplay"]');
await page.waitForTimeout(500);
const m = await page.evaluate(() => document.body.innerText.match(/总字数\s*(\d+)[\s\S]*?估算页数\s*(\d+)/));
console.log('9. 剧本页字数/页数（应≈11067/45）:', m?.[1], '/', m?.[2]);

console.log('pageerrors:', errors.length ? errors : '无');
await browser.close();
