import { chromium } from 'playwright';
const URL='http://127.0.0.1:4173';
const OUT='tests/e2e/realcheck-shots/realcheck-2026-05-30';
(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
  const errs=[];
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  p.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
  await p.goto(URL,{waitUntil:'networkidle'});
  await p.locator('[data-action="open-project"]').first().click();
  await p.waitForTimeout(800);
  await p.locator('text=剧本撰写').first().click();
  await p.waitForTimeout(900);
  // 点幕评师全片
  const full=p.locator('button:has-text("幕评师全片")').first();
  if(!(await full.count())){console.log('NO 幕评师全片 BUTTON');await b.close();return;}
  await full.click();
  console.log('clicked 幕评师全片, waiting for AI...');
  // 等评分面板出现（最多 120s）
  try{
    await p.locator('.rater-panel').first().waitFor({state:'visible',timeout:120000});
    await p.waitForTimeout(1500);
    await p.screenshot({path:`${OUT}/12-rater-full.png`,fullPage:true});
    console.log('shot: 12-rater-full');
    const txt=await p.locator('.rater-panel').first().innerText().catch(()=>'');
    console.log('PANEL TEXT (first 600):\n'+txt.slice(0,600));
  }catch(e){
    await p.screenshot({path:`${OUT}/12-rater-timeout.png`,fullPage:true});
    console.log('RATER PANEL TIMEOUT:',e.message);
  }
  console.log('CONSOLE ERRORS:',errs.length?errs.join('\n'):'(none)');
  await b.close();
})();
