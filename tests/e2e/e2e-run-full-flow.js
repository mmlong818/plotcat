/**
 * E2E Test: Full 5-Step Creation Flow with Real AI
 * Story: 孤岛 (Lone Island)
 *
 * Uses REAL AI endpoints (no mocks). Server must be running at localhost:4173.
 * Timeouts: character generation up to 300s, each act up to 300s.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'e2e-screenshots');
const BASE_URL = 'http://localhost:4173';

// Chromium 1208 installed at this path
const CHROMIUM_PATH = 'C:\\Users\\nd851\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// ── Story data ────────────────────────────────────────────────────────────────
const STORY = {
  format:      'feature',       // 电影长片
  title:       '孤岛',
  logline:     '一位精神病院的医生发现自己是病人，必须在72小时内证明自己的清醒，否则将被永久收治',
  protagonist: '林医生',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[E2E] ${new Date().toISOString()} ${msg}`);
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`Screenshot saved: ${name}.png`);
  return filePath;
}

/**
 * Fill a field and dispatch a click so the capture-phase handler reads the value.
 * The app's event listener reads e.target.value on click (not on input/change).
 */
async function fillAndTrigger(cf, selector, value, isSelect = false) {
  const el = cf.locator(selector);
  await el.waitFor({ state: 'visible', timeout: 8000 });
  if (isSelect) {
    await el.selectOption(value);
  } else {
    await el.fill(value);
  }
  await el.dispatchEvent('click');
  await cf.page().waitForTimeout(150);
}

/**
 * Poll for a condition with timeout. Returns true if condition met, false on timeout.
 */
async function pollUntil(fn, timeoutMs, intervalMs = 5000, label = '') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await fn()) return true;
    } catch (_) { /* ignore transient errors */ }
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (label) log(`  polling "${label}" … ${elapsed}s elapsed`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

// ── Main test ─────────────────────────────────────────────────────────────────

async function runTest() {
  log('Starting E2E test: 孤岛 — Full 5-Step Creation Flow (Real AI)');

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: [
      '--proxy-server=direct://',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const networkLog = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      log(`CONSOLE ERROR: ${text}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`PageError: ${err.message}`);
    log(`PAGE ERROR: ${err.message}`);
  });

  // Log all API requests/responses for diagnostics
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/generate') || url.includes('/api/ai')) {
      const status = response.status();
      log(`API response: ${status} ${url}`);
      if (status !== 200) {
        const body = await response.text().catch(() => '(body unavailable)');
        log(`  Response body: ${body.substring(0, 300)}`);
        networkLog.push({ url, status, body: body.substring(0, 300) });
      } else {
        networkLog.push({ url, status });
      }
    }
  });

  const results = {
    step0_appLoaded:    false,
    step0_newProject:   false,
    step0_quickCreate:  false,
    step1_filled:       false,
    step1_next:         false,
    step2_banner:       false,
    step2_next:         false,
    step3_overlayLabel: null,     // exact text from the loading overlay
    step3_charCards:    0,
    step3_confirmed:    false,
    step3_next:         false,
    step4_act1:         false,
    step4_act2:         false,
    step4_finished:     false,
    step5_reached:      false,
    step5_finalized:    false,
    nav_workbench:      false,
    consoleErrors:      [],
  };

  try {
    // ── 0. Load app ───────────────────────────────────────────────────────────
    log('=== STEP 0: Load app + hard refresh ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });
    // Hard refresh (bypass cache)
    await page.keyboard.down('Control');
    await page.keyboard.press('F5');
    await page.keyboard.up('Control');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '00-app-loaded');

    // Verify app shell is present
    const appLoaded = await page.locator('.app-shell, #app, body').first().isVisible();
    results.step0_appLoaded = appLoaded;
    log(`App loaded: ${appLoaded}`);

    // Check for null guard / JS startup errors
    const startupErrors = consoleErrors.filter(e => e.includes('Cannot read') || e.includes('null') || e.includes('undefined'));
    if (startupErrors.length > 0) {
      log(`WARN: Startup JS errors detected: ${startupErrors.join('; ')}`);
    } else {
      log('No null-guard/startup JS errors detected');
    }

    // ── 0a. Click "新建项目" ──────────────────────────────────────────────────
    log('Clicking "+ 新建项目" button...');
    const newProjBtn = page.locator('button[data-action="open-create-mode-picker"]');
    await newProjBtn.waitFor({ state: 'visible', timeout: 8000 });
    await newProjBtn.click();
    results.step0_newProject = true;
    await page.waitForTimeout(600);
    await screenshot(page, '01-mode-picker');

    // ── 0b. Select "快速创作" ─────────────────────────────────────────────────
    log('Selecting "快速创作"...');
    const quickBtn = page.locator('button[data-action="open-quick-creation"]');
    await quickBtn.waitFor({ state: 'visible', timeout: 8000 });
    await quickBtn.click();
    results.step0_quickCreate = true;
    log('Mode picker: selected 快速创作');

    await page.waitForSelector('#panel-creation:not([hidden])', { timeout: 10000 });
    await page.waitForTimeout(600);
    await screenshot(page, '02-creation-flow-opened');

    // Verify stepper count (expect 5)
    const stepNodeCount = await page.locator('.cf-tl-node').count();
    log(`Stepper nodes: ${stepNodeCount} (expected 5)`);

    // ── STEP 1: 故事核心 ──────────────────────────────────────────────────────
    log('=== STEP 1: 故事核心 ===');
    const cf = page.locator('#creationContent');

    await fillAndTrigger(cf, 'select[data-action="cf-set-draft-field"][data-field="format"]', STORY.format, true);
    log(`Format selected: ${STORY.format} (电影长片)`);

    await fillAndTrigger(cf, 'input[data-action="cf-set-draft-field"][data-field="title"]', STORY.title);
    log(`Title filled: ${STORY.title}`);

    await fillAndTrigger(cf, 'textarea[data-action="cf-set-draft-field"][data-field="logline"]', STORY.logline);
    log(`Logline filled: ${STORY.logline}`);

    await fillAndTrigger(cf, 'input[data-action="cf-set-draft-field"][data-field="protagonist"]', STORY.protagonist);
    log(`Protagonist filled: ${STORY.protagonist}`);

    await page.waitForTimeout(500);
    await screenshot(page, '03-step1-filled');

    results.step1_filled = true;

    // Check for field errors
    const step1ErrText = await page.locator('.cf-error').first().textContent().catch(() => '');
    if (step1ErrText) log(`Step 1 error shown: "${step1ErrText}"`);

    // Click next — wait up to 10s for button to be enabled
    const step1Btn = page.locator('button[data-action="cf-step1-next"]');
    await step1Btn.waitFor({ state: 'attached', timeout: 5000 });
    const step1Disabled = await step1Btn.isDisabled();
    if (step1Disabled) {
      const hint = await page.locator('.cf-next-hint').textContent().catch(() => '');
      log(`Step 1 btn disabled, hint: "${hint}"`);
      // Try clicking anyway — Playwright will wait if it becomes enabled
    }
    await step1Btn.click({ timeout: 15000 });
    results.step1_next = true;
    log('Clicked: 下一步：选结构 →');

    await page.waitForTimeout(1000);
    await screenshot(page, '04-step2-structure');

    // ── STEP 2: 结构 ─────────────────────────────────────────────────────────
    log('=== STEP 2: 结构 ===');

    // Verify AI recommendation banner
    const recTag = page.locator('.cf-rec-tag').first();
    const recTagVisible = await recTag.isVisible().catch(() => false);
    results.step2_banner = recTagVisible;
    if (recTagVisible) {
      const bannerText = await page.locator('.cf-rec-banner').first().textContent().catch(() => '');
      log(`AI rec banner visible: "${bannerText.trim().substring(0, 120)}"`);
    } else {
      log('WARN: AI recommendation banner (.cf-rec-tag) not found');
    }

    await screenshot(page, '05-step2-with-banner');

    // Keep default structure, click next
    const step2Btn = page.locator('button[data-action="cf-step2-next"]');
    await step2Btn.waitFor({ state: 'visible', timeout: 5000 });
    await step2Btn.click();
    results.step2_next = true;
    log('Clicked: 下一步：生成人物 →');

    await page.waitForTimeout(1000);
    await screenshot(page, '06-step3-characters-loading');

    // ── STEP 3: 人物 ─────────────────────────────────────────────────────────
    log('=== STEP 3: 人物 ===');
    log('AI should auto-start character generation (loadingStep=3 fix applied)...');

    // Capture the overlay label immediately (should say "AI 生成角色…" not "AI 生成本幕节点…")
    await page.waitForTimeout(1500);
    const overlayVisible = await page.locator('.cf-ai-overlay').isVisible().catch(() => false);
    if (overlayVisible) {
      const overlayLabel = await page.locator('.cf-ai-overlay-label').textContent().catch(() => '');
      results.step3_overlayLabel = overlayLabel.trim();
      log(`Overlay label text: "${results.step3_overlayLabel}"`);
      if (results.step3_overlayLabel.includes('角色')) {
        log('CORRECT: Overlay says "AI 生成角色…"');
      } else if (results.step3_overlayLabel.includes('节点')) {
        log('BUG DETECTED: Overlay incorrectly says "AI 生成本幕节点…" (loadingStep bug)');
      }
    } else {
      log('Overlay not visible after 1.5s — checking if generation already done or not started');
      // Check if a generate button is present (generation didn't auto-start)
      const genBtn = page.locator('button[data-action="ai-generate-characters-cf"]');
      const genBtnVisible = await genBtn.isVisible().catch(() => false);
      if (genBtnVisible) {
        const genBtnText = await genBtn.textContent().catch(() => '');
        log(`Generate button found: "${genBtnText}" — clicking manually`);
        await genBtn.click();
        await page.waitForTimeout(1000);
        const overlayAfter = await page.locator('.cf-ai-overlay').isVisible().catch(() => false);
        if (overlayAfter) {
          const lbl = await page.locator('.cf-ai-overlay-label').textContent().catch(() => '');
          results.step3_overlayLabel = lbl.trim();
          log(`Overlay label after manual trigger: "${results.step3_overlayLabel}"`);
        }
      }
    }

    await screenshot(page, '06b-step3-overlay-captured');

    // Poll every 10s for up to 300s (5 min) for character cards to appear
    // Also detect silent failure: overlay gone + generate button reappeared = generation done but no cards
    log('Polling for character cards (up to 300s)...');
    let charsSilentFail = false;
    const charsDone = await pollUntil(async () => {
      const overlay = await page.locator('.cf-ai-overlay').isVisible().catch(() => false);
      const cards = await page.locator('.cf-char-card').count();
      const errEl = await page.locator('.cf-error').first().textContent().catch(() => '');
      if (errEl) log(`  error element: "${errEl}"`);
      log(`  overlay=${overlay}, cards=${cards}`);
      if (!overlay && cards === 0) {
        // Check if generate button is back (silent failure) or error
        const genBtnBack = await page.locator('button[data-action="ai-generate-characters-cf"]:not([disabled])').isVisible().catch(() => false);
        if (genBtnBack) {
          log('  Silent failure detected: overlay gone, cards=0, generate button back');
          charsSilentFail = true;
          return true; // exit poll loop, handle below
        }
      }
      return !overlay && cards > 0;
    }, 300000, 10000, 'characters');

    await screenshot(page, '07-step3-characters-result');

    if (!charsDone || charsSilentFail) {
      // Overlay gone but no cards — generation completed but returned empty result
      // Check if the generate button reappeared (silent failure), try clicking again
      const errText = await page.locator('.cf-error').first().textContent().catch(() => '');
      log(`Step 3: Generation completed without cards (silentFail=${charsSilentFail}). Error shown: "${errText}"`);

      const genBtnRetry = page.locator('button[data-action="ai-generate-characters-cf"]');
      const canRetry = await genBtnRetry.isVisible().catch(() => false);
      if (canRetry) {
        log('Retrying character generation (clicking AI 生成角色 button again)...');
        await genBtnRetry.click();
        await page.waitForTimeout(2000);

        // Poll again for up to 300s
        const charsDone2 = await pollUntil(async () => {
          const overlay = await page.locator('.cf-ai-overlay').isVisible().catch(() => false);
          const cards = await page.locator('.cf-char-card').count();
          log(`  [retry] overlay=${overlay}, cards=${cards}`);
          return !overlay && cards > 0;
        }, 300000, 10000, 'characters-retry');

        await screenshot(page, '07b-step3-characters-retry-result');

        if (!charsDone2) {
          const errText2 = await page.locator('.cf-error').first().textContent().catch(() => '');
          log(`ERROR: Characters still not generated after retry. Error: "${errText2}"`);
          results.consoleErrors.push(`Step 3 retry timeout. Error: "${errText2}"`);
        } else {
          const cardCount = await page.locator('.cf-char-card').count();
          results.step3_charCards = cardCount;
          log(`Characters generated on retry! Cards: ${cardCount}`);
        }
      } else {
        results.consoleErrors.push(`Step 3 timeout/failure. Error text: "${errText}"`);
      }
    } else if (charsDone && !charsSilentFail) {
      const cardCount = await page.locator('.cf-char-card').count();
      results.step3_charCards = cardCount;
      log(`Characters generated! Card count: ${cardCount}`);
    }

    // Confirm first character
    const alreadyConfirmed = await page.locator('.cf-char-card.is-confirmed').count();
    log(`Already-confirmed chars: ${alreadyConfirmed}`);

    if (alreadyConfirmed === 0) {
      const confirmBtn = page.locator('button[data-action="confirm-character"]').first();
      const confirmExists = await confirmBtn.count() > 0;
      if (confirmExists) {
        await confirmBtn.click();
        results.step3_confirmed = true;
        log('Confirmed first character');
        await page.waitForTimeout(400);
      } else {
        log('WARN: No confirm button found — checking if chars are auto-confirmed');
        const anyCard = await page.locator('.cf-char-card').count();
        if (anyCard > 0) results.step3_confirmed = true;
      }
    } else {
      results.step3_confirmed = true;
      log('Characters already confirmed');
    }

    await screenshot(page, '08-step3-character-confirmed');

    // Click next
    const step3Btn = page.locator('button[data-action="cf-step3-next"]');
    await step3Btn.waitFor({ state: 'attached', timeout: 5000 });
    const step3Disabled = await step3Btn.isDisabled();
    if (step3Disabled) {
      log('WARN: Step 3 next button is disabled (no confirmed character?)');
      results.consoleErrors.push('Step 3: next button disabled');
    } else {
      await step3Btn.click();
      results.step3_next = true;
      log('Clicked: 下一步：节点填充 →');
    }

    await page.waitForTimeout(1000);
    await screenshot(page, '09-step4-node-fill-initial');

    // ── STEP 4: 节点填充 ─────────────────────────────────────────────────────
    log('=== STEP 4: 节点填充 ===');

    const MAX_ACTS = 10;
    let actNum = 0;
    let step4Done = false;

    while (actNum < MAX_ACTS && !step4Done) {
      actNum++;
      log(`--- Act ${actNum} ---`);
      await screenshot(page, `10-step4-act${actNum}-initial`);

      // Check if finish button already visible (last act was already generated on entry)
      const finishBtnEarly = page.locator('button[data-action="cf-step4-finish"]');
      if (await finishBtnEarly.count() > 0) {
        log(`Finish button visible at act ${actNum} entry — clicking`);
        await finishBtnEarly.click();
        results.step4_finished = true;
        step4Done = true;
        break;
      }

      // Generate all acts — the UI requires generation before advancing.
      // "Skip" (advance without generating) is not supported by the UI:
      // the advance button only appears after a successful generation.
      const shouldGenerate = true;

      if (shouldGenerate) {
        // Retry act generation up to 3 times (handles JSON parse errors from Claude)
        let actGenSuccess = false;
        for (let attempt = 1; attempt <= 3 && !actGenSuccess; attempt++) {
          const genBtn = page.locator('button[data-action="cf-generate-act"]').first();
          const genBtnExists = await genBtn.count() > 0;
          if (!genBtnExists) {
            log(`WARN: No generate button found for act ${actNum} (attempt ${attempt})`);
            break;
          }

          await genBtn.click();
          log(`Clicked: ⚡ 生成本幕 for act ${actNum} (attempt ${attempt})`);
          await page.waitForTimeout(1500);

          // Poll for generation to complete (up to 300s)
          log(`Waiting up to 300s for act ${actNum} to generate (attempt ${attempt})...`);
          const actDone = await pollUntil(async () => {
            const overlay = await page.locator('.cf-ai-overlay').isVisible().catch(() => false);
            const generated = await page.locator('.cf-act-node.is-generated').count();
            const errShown = await page.locator('.cf-error').first().textContent().catch(() => '');
            if (errShown) log(`  act${actNum} error: "${errShown.substring(0, 100)}"`);
            log(`  overlay=${overlay}, generated-nodes=${generated}`);
            return !overlay;
          }, 300000, 10000, `act${actNum}-attempt${attempt}`);

          // Check if advance/finish button appeared (means success)
          const advBtnCheck = page.locator('button[data-action="cf-advance-act"], button[data-action="cf-step4-finish"]');
          const advBtnVisible = await advBtnCheck.count() > 0;

          if (advBtnVisible) {
            log(`Act ${actNum} generation succeeded (attempt ${attempt})`);
            actGenSuccess = true;
            if (actNum === 1) results.step4_act1 = true;
            if (actNum === 2) results.step4_act2 = true;
          } else {
            const errText = await page.locator('.cf-error').first().textContent().catch(() => '');
            log(`Act ${actNum} attempt ${attempt} failed. Error: "${errText.substring(0, 150)}". Retrying...`);
            if (attempt < 3) await page.waitForTimeout(2000);
          }
        }

        if (!actGenSuccess) {
          log(`ERROR: Act ${actNum} generation failed after 3 attempts`);
          results.consoleErrors.push(`Step 4 act ${actNum} generation failed after 3 attempts`);
        }

        await screenshot(page, `11-step4-act${actNum}-generated`);
      } else {
        log(`Act ${actNum}: skipping generation per instructions, just advancing`);
      }

      // Check if finish button now visible
      const finishBtn = page.locator('button[data-action="cf-step4-finish"]');
      if (await finishBtn.count() > 0) {
        log(`Clicking: 完成节点，查看总结 → (act ${actNum} was last)`);
        await finishBtn.click();
        results.step4_finished = true;
        step4Done = true;
        break;
      }

      // Advance to next act
      const advBtn = page.locator('button[data-action="cf-advance-act"]');
      if (await advBtn.count() > 0) {
        await advBtn.click();
        log(`Advanced to act ${actNum + 1}`);
        await page.waitForTimeout(500);
      } else {
        log(`No advance button at act ${actNum} and no finish button — checking next-act button variations`);
        // Try alternative selectors
        const nextActBtn = page.locator('button:has-text("下一幕")').first();
        if (await nextActBtn.count() > 0) {
          await nextActBtn.click();
          log('Clicked: 下一幕 → (alternative selector)');
          await page.waitForTimeout(500);
        } else {
          log(`No advance/finish button at act ${actNum} — stopping`);
          results.consoleErrors.push(`Step 4: no advance/finish button at act ${actNum}`);
          break;
        }
      }
    }

    if (!step4Done) {
      results.consoleErrors.push(`Step 4: did not reach finish button after ${actNum} acts`);
    }

    await page.waitForTimeout(1000);
    await screenshot(page, '12-step4-completed');

    // ── STEP 5: 确认 ─────────────────────────────────────────────────────────
    log('=== STEP 5: 确认 ===');
    await page.waitForTimeout(500);

    const finalizeBtn = page.locator('button[data-action="cf-finalize-new"]');
    const finalizeBtnFound = await finalizeBtn.count() > 0;

    if (!finalizeBtnFound) {
      const content = await page.locator('#creationContent').textContent().catch(() => '');
      log(`WARN: Finalize button not found. Content snippet: "${content.substring(0, 200)}"`);
      results.consoleErrors.push('Step 5: finalize button (cf-finalize-new) not found');
      await screenshot(page, '13-step5-not-reached');
    } else {
      results.step5_reached = true;
      const actSummaryCount = await page.locator('.cf-confirm-act, .cf-confirm-acts').count();
      log(`Step 5 reached. Act summaries: ${actSummaryCount}`);

      await screenshot(page, '13-step5-summary');

      const btnText = await finalizeBtn.textContent().catch(() => '');
      log(`Finalize button text: "${btnText?.trim()}"`);
      await finalizeBtn.click();
      log('Clicked: 完成创建，进入工作台 →');

      // Wait for navigation
      await page.waitForTimeout(3000);
      await screenshot(page, '14-after-finalize');

      // Verify navigation away from creation flow
      const onWorkflow = await page.locator(
        '#panel-structure:not([hidden]), #panel-plots:not([hidden]), #panel-characters:not([hidden])'
      ).count() > 0;
      const creationStillVisible = await page.locator('#panel-creation:not([hidden])').count() > 0;
      const finalizeGone = (await page.locator('button[data-action="cf-finalize-new"]').count()) === 0;

      // Check for workbench elements
      const hasStepButton = await page.locator('.step-button').count() > 0;
      const hasPanelWorkflow = await page.locator('#panel-workflow').count() > 0;
      const hasWorkbench = await page.locator('.workbench').count() > 0;

      log(`After finalize: onWorkflow=${onWorkflow}, creationVisible=${creationStillVisible}, finalizeGone=${finalizeGone}`);
      log(`Workbench elements: stepButton=${hasStepButton}, panelWorkflow=${hasPanelWorkflow}, workbench=${hasWorkbench}`);

      results.step5_finalized = true;

      if (onWorkflow || hasStepButton || hasPanelWorkflow || hasWorkbench) {
        results.nav_workbench = true;
        log('SUCCESS: Navigated to workbench/workflow page');
      } else if (creationStillVisible && !finalizeGone) {
        log('BUG: Still on creation page — navigation not implemented');
        results.consoleErrors.push('BUG: handleFinalizeNewCreation does not navigate to workbench');
      } else if (creationStillVisible && finalizeGone) {
        log('PARTIAL: Project created but creation panel remains (no routing)');
        results.consoleErrors.push('Navigation after finalize: creation panel still visible');
      } else {
        const bodyText = await page.locator('body').textContent().catch(() => '');
        log(`Unknown state. Body snippet: "${bodyText.substring(0, 300)}"`);
      }

      await screenshot(page, '15-final-workbench');
    }

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    log(err.stack);
    results.consoleErrors.push(`Fatal: ${err.message}`);
    await screenshot(page, '99-error-state').catch(() => {});
  } finally {
    await browser.close();
    log('Browser closed');
  }

  // ── Collect console errors ────────────────────────────────────────────────
  results.consoleErrors.push(...consoleErrors);

  // Log network requests
  if (networkLog.length > 0) {
    console.log('\nAPI Network Log:');
    networkLog.forEach(entry => console.log(`  ${entry.status} ${entry.url}${entry.body ? ` — ${entry.body}` : ''}`));
  }

  // ── Print Results ─────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('E2E TEST RESULTS: 孤岛 — 5-Step Creation Flow (Real AI)');
  console.log('='.repeat(70));
  console.log(`App loaded:              ${results.step0_appLoaded ? 'PASS' : 'FAIL'}`);
  console.log(`Mode picker → 快速创作:  ${results.step0_quickCreate ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(`Step 1 (故事核心) filled: ${results.step1_filled ? 'PASS' : 'FAIL'}`);
  console.log(`Step 1 → next:           ${results.step1_next ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(`Step 2 AI rec banner:    ${results.step2_banner ? 'PASS' : 'FAIL'}`);
  console.log(`Step 2 → next:           ${results.step2_next ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(`Step 3 overlay label:    ${results.step3_overlayLabel ?? '(not captured)'}`);
  console.log(`  Expected: "AI 生成角色…"`);
  console.log(`  Correct:  ${results.step3_overlayLabel?.includes('角色') ? 'YES' : 'NO — BUG?'}`);
  console.log(`Step 3 char cards:       ${results.step3_charCards}`);
  console.log(`Step 3 char confirmed:   ${results.step3_confirmed ? 'PASS' : 'FAIL'}`);
  console.log(`Step 3 → next:           ${results.step3_next ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(`Step 4 act 1 generated:  ${results.step4_act1 ? 'PASS' : 'FAIL'}`);
  console.log(`Step 4 act 2 generated:  ${results.step4_act2 ? 'PASS' : 'FAIL'}`);
  console.log(`Step 4 finished:         ${results.step4_finished ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(`Step 5 reached:          ${results.step5_reached ? 'PASS' : 'FAIL'}`);
  console.log(`Step 5 finalized:        ${results.step5_finalized ? 'PASS' : 'FAIL'}`);
  console.log(`Nav → workbench:         ${results.nav_workbench ? 'PASS' : 'FAIL'}`);
  console.log('');

  const checks = [
    results.step1_next, results.step2_next,
    results.step3_next, results.step4_finished,
    results.step5_reached, results.step5_finalized,
  ];
  const passed = checks.filter(Boolean).length;
  console.log(`Overall: ${passed}/${checks.length} key steps passed`);
  console.log('');

  if (results.consoleErrors.length > 0) {
    console.log('Errors / Issues:');
    results.consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  } else {
    console.log('No errors recorded.');
  }

  console.log('');
  console.log(`Screenshots dir: ${SCREENSHOTS_DIR}`);
  console.log('='.repeat(70));

  return results;
}

runTest().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
