import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4173';
const pid = 'project_mptv97q3_xyh2ju';
// 1. 注入旧版被污染的 notes
let proj = (await (await fetch(`${BASE}/api/projects/${pid}`)).json()).project;
const scene = proj.scene_workbench.scenes[1];
scene.notes = "我的真实创作笔记\n\n【上轮幕评师修稿指令】\n1. [high] 对白太直白\n   定位：开头\n   要求：加潜台词";
await fetch(`${BASE}/api/projects/${pid}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify({project: proj}) });
// 2. 浏览器打开项目（normalize 迁移）+ 等 autosave
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(BASE);
await page.waitForTimeout(800);
await page.locator('[data-action="open-project"]').first().click();
await page.waitForTimeout(1000);
// 触发 markDirty 的修改？normalize 在 load 时就跑了，但 autosave 只在 dirty 时触发。
// 切个步骤（setCurrentStep 已会 markDirty 当 visited 新增…可能已访问过）。手动改个字段触发保存：
await page.click('[data-action="go-step"][data-id="scenes"]');
await page.waitForTimeout(3500);
await browser.close();
// 3. 检查落库结果
proj = (await (await fetch(`${BASE}/api/projects/${pid}`)).json()).project;
const s = proj.scene_workbench.scenes[1];
console.log('notes:', JSON.stringify(s.notes));
console.log('rater_directives:', JSON.stringify(s.rater_directives));
console.log('pageerrors:', errors.length ? errors : '无');
// 还原
s.notes = ""; s.rater_directives = "";
await fetch(`${BASE}/api/projects/${pid}`, { method:'PUT', headers:{'content-type':'application/json'}, body: JSON.stringify({project: proj}) });
