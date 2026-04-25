import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'e2e-screenshots');
const BASE_URL = 'http://localhost:4173';

let screenshotIndex = 0;

async function screenshot(page, name) {
  screenshotIndex++;
  const filename = path.join(SCREENSHOTS_DIR, `${String(screenshotIndex).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`[SCREENSHOT] ${filename}`);
  return filename;
}

async function checkErrors(page) {
  const errors = await page.$$eval('.cf-error', els => els.map(el => el.textContent.trim())).catch(() => []);
  if (errors.length > 0) {
    console.log(`[CF-ERROR] ${errors.length} error(s) found:`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
  return errors;
}

async function waitForSelectorVisible(page, selector, timeout = 30000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

async function getButtonByText(page, ...texts) {
  for (const text of texts) {
    try {
      const el = await page.$(`button:has-text("${text}")`);
      if (el) return el;
    } catch {}
  }
  return null;
}

async function clickButtonByText(page, ...texts) {
  const el = await getButtonByText(page, ...texts);
  if (!el) {
    const allBtns = await page.$$eval('button', bs => bs.map(b => b.textContent.trim())).catch(() => []);
    console.log(`[WARN] No button found for texts: ${texts.join(', ')}`);
    console.log(`[ALL BUTTONS] ${JSON.stringify(allBtns)}`);
    return false;
  }
  const disabled = await el.isDisabled();
  console.log(`[BTN] "${await el.textContent()}" disabled=${disabled}`);
  if (!disabled) {
    await el.click();
    return true;
  }
  return false;
}

// Click a button only within the creation flow panel (#panel-creation)
async function clickInCreationPanel(page, selector) {
  const locator = page.locator(`#panel-creation ${selector}, #creationContent ${selector}`).first();
  const count = await locator.count();
  if (count === 0) {
    console.log(`[WARN] Not found in creation panel: ${selector}`);
    return false;
  }
  const disabled = await locator.isDisabled().catch(() => true);
  const text = await locator.textContent().catch(() => '');
  console.log(`[CREATION BTN] "${text.trim()}" disabled=${disabled}`);
  if (!disabled) {
    await locator.click();
    return true;
  }
  return false;
}

async function main() {
  console.log('=== E2E Test: 5-Step Creation Flow ===\n');
  console.log('[INFO] Starting Chromium browser...');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-proxy-server',
      '--disable-extensions',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  try {
    // ===== STEP 0: Navigate =====
    console.log('\n[STEP 0] Navigating to', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await screenshot(page, 'step0-initial-load');

    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`[URL] ${currentUrl}`);
    console.log(`[TITLE] ${pageTitle}`);

    // Check for creation panel vs project list
    // The app uses #panel-creation for the creation flow and #panel-projects for project list
    const panelProjects = await page.$('#panel-projects');
    const panelCreation = await page.$('#panel-creation');
    console.log(`[PANELS] projects=${!!panelProjects}, creation=${!!panelCreation}`);

    // Look for stepper-nav in header - if visible, we might be in creation flow already
    const stepperNav = await page.$('#stepper-nav');
    const stepperVisible = stepperNav ? await stepperNav.isVisible() : false;
    console.log(`[STEPPER-NAV] exists=${!!stepperNav}, visible=${stepperVisible}`);

    // Check what's currently displayed
    const bodyText = await page.textContent('body');
    console.log('[PAGE CONTENT SNIPPET]', bodyText.slice(0, 400));

    // Hard refresh to clear any cached state
    console.log('[INFO] Performing hard refresh...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, 'step0-after-reload');

    // ===== FIND AND CLICK 新建项目 =====
    console.log('\n[STEP 0b] Looking for 新建项目 button...');

    // The project board has a button with data-action="open-create-mode-picker"
    const newProjectBtn = await page.$('[data-action="open-create-mode-picker"]');
    if (newProjectBtn) {
      console.log('[CLICK] Found 新建项目 (open-create-mode-picker)');
      await newProjectBtn.click();
      await page.waitForTimeout(1000);
    } else {
      // Fallback: try by text
      console.log('[INFO] data-action button not found, trying text...');
      const allBtns = await page.$$eval('button', bs => bs.map(b => ({
        text: b.textContent.trim(),
        action: b.getAttribute('data-action') || ''
      }))).catch(() => []);
      console.log('[ALL BUTTONS]', JSON.stringify(allBtns));
      await clickButtonByText(page, '新建项目');
      await page.waitForTimeout(1000);
    }

    await screenshot(page, 'step0-mode-picker');

    // Mode picker should now be open with "快速创作" and "精品创作" options
    // Click "快速创作" (data-action="open-quick-creation")
    console.log('[STEP 0c] Looking for 快速创作 in mode picker...');
    const quickCreationBtn = await page.$('[data-action="open-quick-creation"]');
    if (quickCreationBtn) {
      console.log('[CLICK] 快速创作 button');
      await quickCreationBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('[WARN] open-quick-creation not found, dumping page...');
      const modePickerText = await page.textContent('body').catch(() => '');
      console.log('[MODE PICKER TEXT]', modePickerText.slice(0, 500));
    }

    await screenshot(page, 'step0-after-quick-creation');

    // Check if creation panel is now visible
    const creationPanelText = await page.$eval('#creationContent', el => el.textContent).catch(() => '');
    console.log('[CREATION CONTENT]', creationPanelText.slice(0, 300));

    // ===== STEP 1: 故事核心 =====
    console.log('\n[STEP 1] 故事核心');

    // Wait for the creation flow step 1 to appear
    // Step 1 has: .cf-section with 第一步 eyebrow
    const step1Visible = await waitForSelectorVisible(page, '.cf-section', 5000);
    console.log(`[STEP1] .cf-section visible: ${step1Visible}`);

    if (!step1Visible) {
      // Maybe we need to navigate to creation somehow
      console.log('[WARN] Creation flow not visible, dumping page state...');
      const html = await page.content();
      console.log('[HTML SNIPPET]', html.slice(0, 2000));
      await screenshot(page, 'step1-not-visible');
    }

    // Select format: 电影长片
    console.log('[ACTION] Selecting format 电影长片...');
    try {
      // The select has data-action="cf-set-draft-field" data-field="format"
      await page.selectOption('[data-action="cf-set-draft-field"][data-field="format"]', { value: 'feature' });
      console.log('[FORMAT] Selected: feature (电影长片)');
    } catch (e) {
      console.log('[FORMAT SELECT ERROR]', e.message);
      // Try by visible text
      try {
        await page.selectOption('select.cf-input', { label: '电影长片' });
        console.log('[FORMAT] Selected via label');
      } catch (e2) {
        console.log('[FORMAT SELECT FAILED]', e2.message);
      }
    }
    await page.waitForTimeout(300);

    // Enter title: 孤岛
    console.log('[ACTION] Entering title: 孤岛');
    try {
      await page.fill('[data-action="cf-set-draft-field"][data-field="title"]', '孤岛');
      console.log('[TITLE] Entered: 孤岛');
    } catch (e) {
      console.log('[TITLE INPUT ERROR]', e.message);
    }
    await page.waitForTimeout(300);

    // Enter logline
    const logline = '一位精神病院的医生发现自己是病人，必须在72小时内证明自己的清醒，否则将被永久收治';
    console.log(`[ACTION] Entering logline (${logline.length} chars)...`);
    try {
      await page.fill('[data-action="cf-set-draft-field"][data-field="logline"]', logline);
      console.log('[LOGLINE] Entered');
    } catch (e) {
      console.log('[LOGLINE INPUT ERROR]', e.message);
      // Try by placeholder
      try {
        await page.fill('textarea[placeholder*="主角是谁"]', logline);
        console.log('[LOGLINE] Entered via placeholder selector');
      } catch (e2) {
        console.log('[LOGLINE FAILED]', e2.message);
      }
    }
    await page.waitForTimeout(300);

    // Enter protagonist: 林医生
    console.log('[ACTION] Entering protagonist: 林医生');
    try {
      await page.fill('[data-action="cf-set-draft-field"][data-field="protagonist"]', '林医生');
      console.log('[PROTAGONIST] Entered: 林医生');
    } catch (e) {
      console.log('[PROTAGONIST INPUT ERROR]', e.message);
    }
    await page.waitForTimeout(500);

    await checkErrors(page);
    await screenshot(page, 'step1-form-filled');

    // Wait for next button to be enabled (requires logline >= 10 chars)
    console.log('[WAITING] For step1 next button to be enabled...');
    await page.waitForTimeout(500);

    // Use locator (not $) so it re-evaluates after DOM re-render
    const step1NextLocator = page.locator('[data-action="cf-step1-next"]');
    const step1NextExists = await step1NextLocator.count();
    console.log(`[STEP1 NEXT BTN] count=${step1NextExists}`);

    if (step1NextExists > 0) {
      const disabled = await step1NextLocator.isDisabled();
      const btnText = await step1NextLocator.textContent();
      console.log(`[STEP1 NEXT BTN] text="${btnText.trim()}" disabled=${disabled}`);

      if (disabled) {
        console.log('[WARN] Button still disabled, checking logline value...');
        const loglineVal = await page.$eval('[data-action="cf-set-draft-field"][data-field="logline"]', el => el.value).catch(() => '');
        console.log(`[LOGLINE VALUE] "${loglineVal}" (${loglineVal.length} chars)`);
      }

      await screenshot(page, 'step1-ready');
      console.log('[CLICK] Step 1 next button');
      await step1NextLocator.click({ force: false });
    } else {
      console.log('[ERROR] cf-step1-next button not found!');
      await screenshot(page, 'step1-no-next-btn');
      await clickButtonByText(page, '下一步：选结构', '下一步');
    }

    await page.waitForTimeout(2000);

    // ===== STEP 2: 结构 =====
    console.log('\n[STEP 2] 结构');
    await screenshot(page, 'step2-structure');

    // Verify AI 推荐 banner
    const recBanner = await page.$('.cf-rec-banner');
    if (recBanner) {
      const bannerText = await recBanner.textContent();
      console.log(`[AI RECOMMEND BANNER] "${bannerText.trim()}"`);
    } else {
      console.log('[AI RECOMMEND BANNER] Not found (.cf-rec-banner)');
    }

    // Check for 电影长片（五幕）
    const pageContent2 = await page.textContent('body');
    const hasFeatureFilm = pageContent2.includes('电影长片（五幕）');
    const hasWuMu = pageContent2.includes('五幕');
    console.log(`[STRUCTURE] Has 电影长片（五幕）: ${hasFeatureFilm}, Has 五幕: ${hasWuMu}`);

    await checkErrors(page);

    // Click 下一步：生成人物
    const step2NextLocator = page.locator('[data-action="cf-step2-next"]');
    if (await step2NextLocator.count() > 0) {
      const btnText2 = await step2NextLocator.textContent();
      const disabled2 = await step2NextLocator.isDisabled();
      console.log(`[STEP2 NEXT BTN] text="${btnText2.trim()}" disabled=${disabled2}`);
      if (!disabled2) {
        await step2NextLocator.click();
        console.log('[CLICK] Step 2 next button');
      }
    } else {
      console.log('[ERROR] cf-step2-next button not found!');
      await clickButtonByText(page, '下一步：生成人物', '生成人物', '下一步');
    }

    await page.waitForTimeout(2000);

    // ===== STEP 3: 人物 =====
    console.log('\n[STEP 3] 人物 - Waiting for AI character generation...');
    await screenshot(page, 'step3-characters-starting');

    // Check if loading starts automatically - the overlay already appears because
    // moving to step 3 triggers auto-generation
    const loadingOverlayCount = await page.locator('.cf-ai-overlay').count();
    console.log(`[LOADING OVERLAY] already active: ${loadingOverlayCount > 0}`);

    // Wait up to 90 seconds for characters to appear
    let charactersFound = false;
    const charGenBtnLocator = page.locator('[data-action="ai-generate-characters-cf"]');

    if (loadingOverlayCount === 0 && await charGenBtnLocator.count() > 0) {
      // Auto-generation did not start, click the button manually
      const btnClass = await charGenBtnLocator.getAttribute('class').catch(() => '');
      const isLoading = btnClass?.includes('is-loading');
      const btnText = await charGenBtnLocator.textContent().catch(() => '');
      console.log(`[AI GEN BTN] text="${btnText.trim()}" loading=${isLoading}`);

      if (!isLoading) {
        console.log('[CLICK] AI 生成角色 (starting generation manually)');
        await charGenBtnLocator.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('[INFO] AI generation already in progress (overlay visible), waiting...');
    }

    console.log('[WAITING] Up to 300 seconds for characters (claude CLI can take up to 5 min)...');
    for (let attempt = 1; attempt <= 60; attempt++) {
      await page.waitForTimeout(5000);

      const charCardCount = await page.locator('.cf-char-card').count();
      if (charCardCount > 0) {
        console.log(`[ATTEMPT ${attempt}] Found ${charCardCount} character cards!`);
        charactersFound = true;
        break;
      }

      // Check loading state
      const overlayCount = await page.locator('.cf-ai-overlay').count();
      const aiBtnClass = await charGenBtnLocator.getAttribute('class').catch(() => '');
      const errorCount = await page.locator('.cf-error').count();
      console.log(`[ATTEMPT ${attempt}/60] chars=0, overlay=${overlayCount > 0}, btnLoading=${aiBtnClass?.includes('is-loading')}, errors=${errorCount}`);

      // Check for cf-error - if there's an error, the overlay should be gone
      if (errorCount > 0) {
        await checkErrors(page);
        console.log('[INFO] Error detected, checking if we can retry...');
        await screenshot(page, `step3-error-attempt-${attempt}`);
        break;
      }

      // At 30s mark, if no overlay, try clicking the button
      if (attempt === 6 && overlayCount === 0 && await charGenBtnLocator.count() > 0) {
        const aiBtnText2 = await charGenBtnLocator.textContent().catch(() => '');
        const aiBtnClass2 = await charGenBtnLocator.getAttribute('class').catch(() => '');
        if (!aiBtnClass2?.includes('is-loading')) {
          console.log(`[30s fallback] Clicking AI gen btn: "${aiBtnText2.trim()}"`);
          await charGenBtnLocator.click().catch(e => console.log('[CLICK ERROR]', e.message));
        }
      }
    }

    if (!charactersFound) {
      // Check if there's an error and try to retry
      const errorMessages = await checkErrors(page);
      console.log('[WARN] No characters appeared');
      if (errorMessages.length > 0) {
        console.log('[RETRY] Error detected, trying to retry character generation...');
        // Click AI 生成角色 button again to retry
        const retryBtnLocator = page.locator('[data-action="ai-generate-characters-cf"]');
        if (await retryBtnLocator.count() > 0) {
          const retryBtnClass = await retryBtnLocator.getAttribute('class').catch(() => '');
          if (!retryBtnClass?.includes('is-loading')) {
            await retryBtnLocator.click();
            console.log('[RETRY] Clicked AI 生成角色 again...');
            await page.waitForTimeout(2000);

            // Wait again for another 90 seconds
            for (let retry = 1; retry <= 18; retry++) {
              await page.waitForTimeout(5000);
              const retryCharCount = await page.locator('.cf-char-card').count();
              if (retryCharCount > 0) {
                console.log(`[RETRY ATTEMPT ${retry}] Found ${retryCharCount} character cards!`);
                charactersFound = true;
                break;
              }
              const retryOverlay = await page.locator('.cf-ai-overlay').count();
              const retryErrors = await page.locator('.cf-error').count();
              console.log(`[RETRY ${retry}/18] chars=0, overlay=${retryOverlay > 0}, errors=${retryErrors}`);
              if (retryErrors > 0) {
                await checkErrors(page);
                break;
              }
            }
          }
        }
      }
    }

    await screenshot(page, 'step3-characters-result');

    // Try to confirm first character (use locator to avoid stale ref after DOM re-render)
    if (charactersFound) {
      console.log('[ACTION] Confirming first character...');
      const confirmLocator = page.locator('[data-action="confirm-character"]').first();
      if (await confirmLocator.count() > 0) {
        await confirmLocator.click();
        console.log('[CONFIRMED] First character');
        await page.waitForTimeout(500);
      } else {
        console.log('[WARN] No confirm button found');
      }

      await screenshot(page, 'step3-character-confirmed');
    } else {
      console.log('[WARN] Proceeding without confirmed characters - step3-next will be disabled');
      const creationContent3 = await page.$eval('#creationContent', el => el.textContent).catch(() => '');
      console.log('[CREATION CONTENT after char failure]', creationContent3.slice(0, 500));
    }

    await checkErrors(page);

    // Click 下一步：节点填充
    const step3NextLocator = page.locator('[data-action="cf-step3-next"]');
    if (await step3NextLocator.count() > 0) {
      const disabled3 = await step3NextLocator.isDisabled();
      const btnText3 = await step3NextLocator.textContent();
      console.log(`[STEP3 NEXT BTN] text="${btnText3.trim()}" disabled=${disabled3}`);
      if (!disabled3) {
        await step3NextLocator.click();
        console.log('[CLICK] Step 3 next button');
      } else {
        console.log('[WARN] Step 3 next button is disabled - need to confirm a character first');
      }
    } else {
      console.log('[WARN] cf-step3-next not found, trying text...');
      await clickButtonByText(page, '下一步：节点填充', '节点填充', '下一步');
    }

    await page.waitForTimeout(2000);

    // ===== STEP 4: 节点填充 =====
    console.log('\n[STEP 4] 节点填充');
    await screenshot(page, 'step4-initial');

    // Check we're in the creation panel (not workbench)
    const creationContent4 = await page.$eval('#creationContent', el => el.textContent).catch(() => '');
    console.log('[CREATION CONTENT STEP4]', creationContent4.slice(0, 300));

    // Check progress dots (scoped to creation panel)
    const progressDots = await page.locator('#creationContent .cf-act-dot, #panel-creation .cf-act-dot').count();
    console.log(`[PROGRESS DOTS] Found ${progressDots} dots`);

    // Check nodes (scoped to creation panel)
    const actNodes = await page.locator('#creationContent .cf-act-node, #panel-creation .cf-act-node').count();
    console.log(`[ACT NODES] Found ${actNodes} nodes`);

    await checkErrors(page);

    // Generate Act 1
    console.log('[ACTION] Generating Act 1...');
    // Scope to creation panel to avoid finding the workbench "生成" buttons
    const generateActLocator = page.locator('#creationContent [data-action="cf-generate-act"], #panel-creation [data-action="cf-generate-act"]').first();
    if (await generateActLocator.count() > 0) {
      const genBtnText = await generateActLocator.textContent();
      const genBtnDisabled = await generateActLocator.isDisabled();
      console.log(`[GENERATE BTN] text="${genBtnText.trim()}" disabled=${genBtnDisabled}`);

      if (!genBtnDisabled) {
        await generateActLocator.click();
        console.log('[CLICK] ⚡ 生成本幕');
      }
    } else {
      console.log('[WARN] cf-generate-act button not found in creation panel');
      // Log what IS in creation panel
      const allCreationBtns = await page.$$eval('#creationContent button, #panel-creation button', bs => bs.map(b => ({
        text: b.textContent.trim().slice(0, 50),
        action: b.getAttribute('data-action') || ''
      }))).catch(() => []);
      console.log('[CREATION PANEL BUTTONS]', JSON.stringify(allCreationBtns));
    }

    // Wait up to 300 seconds for act 1 generation
    console.log('[WAITING] Up to 300 seconds for Act 1 generation...');
    let act1Done = false;

    // Scope to creation panel
    const CF = '#creationContent, #panel-creation';
    for (let attempt = 1; attempt <= 60; attempt++) {
      await page.waitForTimeout(5000);

      // Check if "下一幕 →" or "完成节点，查看总结 →" appears (means generation done)
      const nextActBtnCount = await page.locator(`${CF} [data-action="cf-advance-act"]`).count() +
                              await page.locator(`${CF} [data-action="cf-step4-finish"]`).count();
      const regenBtnCount = await page.locator(`${CF} button:has-text("↺ 重新生成")`).count();
      const overlayCount2 = await page.locator('.cf-ai-overlay').count();
      const errorCount2 = await page.locator('.cf-error').count();

      console.log(`[ACT1 ATTEMPT ${attempt}/60] nextActBtn=${nextActBtnCount > 0}, regen=${regenBtnCount > 0}, overlay=${overlayCount2 > 0}, errors=${errorCount2}`);

      if (nextActBtnCount > 0 || regenBtnCount > 0) {
        console.log('[ACT1 DONE] Generation complete!');
        act1Done = true;
        break;
      }

      if (errorCount2 > 0) {
        await checkErrors(page);
        console.log('[ACT1 ERROR] Error detected');
        await screenshot(page, `step4-act1-error`);
        break;
      }
    }

    await screenshot(page, 'step4-act1-done');

    if (act1Done) {
      // Click 下一幕 → (use locator scoped to creation panel)
      const advanceLocator = page.locator(`${CF} [data-action="cf-advance-act"]`).first();
      const finishLocator = page.locator(`${CF} [data-action="cf-step4-finish"]`).first();

      if (await advanceLocator.count() > 0) {
        await advanceLocator.click();
        console.log('[CLICK] 下一幕 → (advancing to Act 2)');
      } else if (await finishLocator.count() > 0) {
        await finishLocator.click();
        console.log('[CLICK] 完成节点，查看总结 → (reached last act)');
        await page.waitForTimeout(1000);
        await screenshot(page, 'step5-early');
      } else {
        console.log('[WARN] No advance or finish button found after Act 1');
      }
    }

    await page.waitForTimeout(1500);
    await screenshot(page, 'step4-act2-initial');

    // Generate Act 2
    console.log('[ACTION] Generating Act 2...');
    const generateActLocator2 = page.locator(`${CF} [data-action="cf-generate-act"]`).first();
    if (await generateActLocator2.count() > 0) {
      const genBtn2Disabled = await generateActLocator2.isDisabled();
      if (!genBtn2Disabled) {
        await generateActLocator2.click();
        console.log('[CLICK] ⚡ 生成本幕 (Act 2)');
      }
    } else {
      console.log('[WARN] No cf-generate-act in creation panel for Act 2');
    }

    console.log('[WAITING] Up to 300 seconds for Act 2 generation...');
    let act2Done = false;
    for (let attempt = 1; attempt <= 60; attempt++) {
      await page.waitForTimeout(5000);

      const nextActBtn2Count = await page.locator(`${CF} [data-action="cf-advance-act"]`).count() +
                               await page.locator(`${CF} [data-action="cf-step4-finish"]`).count();
      const regen2Count = await page.locator(`${CF} button:has-text("↺ 重新生成")`).count();
      const overlay2Count = await page.locator('.cf-ai-overlay').count();
      const errorCount3 = await page.locator('.cf-error').count();

      console.log(`[ACT2 ATTEMPT ${attempt}/60] nextActBtn=${nextActBtn2Count > 0}, regen=${regen2Count > 0}, overlay=${overlay2Count > 0}, errors=${errorCount3}`);

      if (nextActBtn2Count > 0 || regen2Count > 0) {
        console.log('[ACT2 DONE] Generation complete!');
        act2Done = true;
        break;
      }

      if (errorCount3 > 0) {
        await checkErrors(page);
        await screenshot(page, `step4-act2-error`);
        break;
      }
    }

    await screenshot(page, 'step4-act2-done');

    // Now advance through remaining acts until we can finish
    console.log('[ACTION] Advancing through remaining acts...');
    for (let actNum = 3; actNum <= 6; actNum++) {
      const advanceLocator3 = page.locator(`${CF} [data-action="cf-advance-act"]`).first();
      const finishLocator3 = page.locator(`${CF} [data-action="cf-step4-finish"]`).first();

      const hasAdvance = await advanceLocator3.count() > 0;
      const hasFinish = await finishLocator3.count() > 0;

      if (!hasAdvance && !hasFinish) {
        console.log(`[ACT ${actNum}] No advance/finish button found`);
        break;
      }

      if (hasFinish) {
        await finishLocator3.click();
        console.log('[STEP4 DONE] Clicked 完成节点，查看总结 → button');
        break;
      }

      // advance to next act
      await advanceLocator3.click();
      const advBtnText = await advanceLocator3.textContent().catch(() => '');
      console.log(`[ACT ${actNum}] Advancing...`);
      await page.waitForTimeout(1000);

      // For acts 3+, skip generation (just advance)
      await screenshot(page, `step4-act${actNum}-initial`);

      // Generate the act
      const genLocatorN = page.locator(`${CF} [data-action="cf-generate-act"]`).first();
      if (await genLocatorN.count() > 0) {
        const genDisabled = await genLocatorN.isDisabled();
        if (!genDisabled) {
          await genLocatorN.click();
          console.log(`[ACT ${actNum}] Starting generation...`);

          // Wait for generation (up to 300s for each act)
          for (let attempt = 1; attempt <= 60; attempt++) {
            await page.waitForTimeout(5000);
            const doneBtnCnt = await page.locator(`${CF} [data-action="cf-advance-act"]`).count() +
                               await page.locator(`${CF} [data-action="cf-step4-finish"]`).count();
            const regenBtnCnt = await page.locator(`${CF} button:has-text("↺ 重新生成")`).count();
            const overlayCnt = await page.locator('.cf-ai-overlay').count();
            const errCnt = await page.locator('.cf-error').count();
            console.log(`[ACT ${actNum} ATTEMPT ${attempt}] done=${doneBtnCnt > 0 || regenBtnCnt > 0}, overlay=${overlayCnt > 0}, errors=${errCnt}`);
            if (doneBtnCnt > 0 || regenBtnCnt > 0) {
              console.log(`[ACT ${actNum} DONE]`);
              await checkErrors(page);
              break;
            }
            if (errCnt > 0) {
              await checkErrors(page);
              break;
            }
          }
          await screenshot(page, `step4-act${actNum}-done`);
        }
      }
    }

    await page.waitForTimeout(2000);
    await screenshot(page, 'step4-complete');
    await checkErrors(page);

    // ===== STEP 5: 确认 =====
    console.log('\n[STEP 5] 确认');
    await page.waitForTimeout(500);

    // Wait for step 5 content to appear
    const step5Section = await waitForSelectorVisible(page, '.cf-confirm-acts, .cf-confirm-act', 5000);
    console.log(`[STEP5] cf-confirm-acts visible: ${step5Section}`);

    await screenshot(page, 'step5-confirmation');

    const step5Text = await page.textContent('body').catch(() => '');
    console.log('[STEP5 CONTENT]', step5Text.slice(0, 600));

    await checkErrors(page);

    // Click 完成创建，进入工作台
    const finalizeLocator = page.locator('[data-action="cf-finalize-new"]');
    if (await finalizeLocator.count() > 0) {
      const finalizeBtnText = await finalizeLocator.textContent();
      const finalizeDisabled = await finalizeLocator.isDisabled();
      console.log(`[FINALIZE BTN] text="${finalizeBtnText.trim()}" disabled=${finalizeDisabled}`);
      if (!finalizeDisabled) {
        await finalizeLocator.click();
        console.log('[CLICK] 完成创建，进入工作台 →');
      }
    } else {
      console.log('[WARN] cf-finalize-new not found, trying text...');
      await clickButtonByText(page, '完成创建，进入工作台', '完成创建', '进入工作台', '工作台');
    }

    await page.waitForTimeout(3000);

    // ===== VERIFY WORKBENCH =====
    console.log('\n[STEP 6] Verify Workbench Navigation');
    const finalUrl = page.url();
    const finalTitle = await page.title();
    console.log(`[FINAL URL] ${finalUrl}`);
    console.log(`[FINAL TITLE] ${finalTitle}`);

    const finalBody = await page.textContent('body').catch(() => '');
    console.log('[FINAL PAGE]', finalBody.slice(0, 800));

    await screenshot(page, 'final-workbench');

    // Check page identity
    const workbenchPanelVisible = await page.$eval('#panel-structure, #panel-plots, #panel-characters', el => {
      return window.getComputedStyle(el).display !== 'none';
    }).catch(() => false);

    const projectsPanelVisible = await page.$eval('#panel-projects', el => {
      return window.getComputedStyle(el).display !== 'none';
    }).catch(() => false);

    const creationPanelVisible = await page.$eval('#panel-creation', el => {
      return window.getComputedStyle(el).display !== 'none';
    }).catch(() => false);

    console.log(`\n=== NAVIGATION RESULT ===`);
    console.log(`Workbench panel visible: ${workbenchPanelVisible}`);
    console.log(`Projects panel visible: ${projectsPanelVisible}`);
    console.log(`Creation panel visible: ${creationPanelVisible}`);

    // Determine what page we're on
    if (workbenchPanelVisible) {
      console.log('[RESULT] SUCCESS - Navigated to workbench!');
    } else if (projectsPanelVisible) {
      console.log('[RESULT] Navigated back to project list');
    } else if (creationPanelVisible) {
      console.log('[RESULT] Still on creation flow');
    } else {
      console.log('[RESULT] Unknown page state');
    }

    // Check stepper nav for context
    const stepperText = await page.$eval('#stepper-nav', el => el.textContent).catch(() => '');
    console.log(`[STEPPER NAV] "${stepperText.trim()}"`);

    const heroTitle = await page.$eval('#hero-title', el => el.textContent).catch(() => '');
    console.log(`[HERO TITLE] "${heroTitle}"`);

    console.log('\n=== E2E Test COMPLETE ===');

  } catch (error) {
    console.error(`\n[FATAL ERROR] ${error.message}`);
    console.error(error.stack?.slice(0, 500));
    await screenshot(page, 'error-state').catch(() => {});
  } finally {
    console.log('\n[INFO] Waiting 3 seconds before closing...');
    await page.waitForTimeout(3000);
    await browser.close();
    console.log('[BROWSER CLOSED]');
  }
}

// Helper label (not a real goto)
function goto_step5(page) {
  // Intentional no-op - just a marker
}

main().catch(console.error);
