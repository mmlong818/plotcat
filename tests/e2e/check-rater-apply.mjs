import { chromium } from 'playwright';
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
  await p.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await p.locator('[data-action="open-project"]').first().click();
  await p.waitForTimeout(700);
  await p.locator('text=剧本撰写').first().click();
  await p.waitForTimeout(800);
  await p.locator('button:has-text("幕评师全片")').first().click();
  await p.locator('.rater-panel').first().waitFor({state:'visible',timeout:120000});
  await p.waitForTimeout(1000);
  const dir=await p.locator('.rater-directive, .rater-panel [data-action]').count();
  const applyFull=await p.locator('[data-action="apply-rater-revision-full"]').count();
  const sceneDir=await p.locator('.rater-directive__scene').count();
  console.log('修稿指令元素数:',dir,'| 应用全片按钮:',applyFull,'| 带场景标签指令:',sceneDir);
  await b.close();
})();
