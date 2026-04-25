/**
 * E2E Test: Real AI calls — Pro Creation + Quick Creation flows
 *
 * Tests real Claude CLI subprocess calls (no mocking).
 *
 * Pro Creation flow:
 *   1. Open app → click 新建项目 → mode picker
 *   2. Click 精品创作
 *   3. Enter anchor text
 *   4. Click 开始创作 → wait ≤90s for AI analyze
 *   5. Verify workbench tabs (主题台/人物台/场景台) with AI questions
 *   6. Fill in an answer in the active workbench
 *   7. Click 进入创作 → wait ≤300s for assemble
 *   8. Verify navigation to workflow/project page
 *
 * Quick Creation flow:
 *   1. Click 新建项目 → mode picker → 快速创作
 *   2. Verify step 1 (故事核心) form
 *   3. Fill logline → click 下一步：选结构
 *   4. Verify step 2 (结构选择)
 *   5. Click 下一步：生成人物
 *   6. Verify step 3 (人物) appears
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'e2e-screenshots', 'real-ai');
const BASE_URL = 'http://localhost:4173';
const CHROMIUM_PATH = 'C:\\Users\\nd851\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function log(msg) {
  console.log(`[E2E] ${new Date().toISOString()} ${msg}`);
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`Screenshot: ${filePath}`);
  return filePath;
}

function makeResult() {
  return {
    // Pro creation
    proAppLoaded: false,
    proNewProjectBtn: false,
    proModePickerOpened: false,
    proModePickerHasPro: false,
    proModePickerHasQuick: false,
    proPageOpened: false,
    proTextareaFound: false,
    proAnchorEntered: false,
    proAnalyzeClicked: false,
    proWorkbenchTabsAppeared: false,
    proTabTheme: false,
    proTabCharacter: false,
    proTabScene: false,
    proQuestionsAppeared: false,
    proAnswerFilled: false,
    proAssembleClicked: false,
    proAssembleCompleted: false,
    proNavigatedToProject: false,

    // Quick creation
    quickModePickerOpened: false,
    quickPageOpened: false,
    quickStep1Visible: false,
    quickLoglineFilled: false,
    quickNextStep1Clicked: false,
    quickStep2Visible: false,
    quickNextStep2Clicked: false,
    quickStep3Visible: false,

    // Timing
    analyzeElapsedSecs: 0,
    assembleElapsedSecs: 0,

    // Errors
    errors: [],
    consoleErrors: [],
  };
}

async function waitForSelector(page, selector, opts = {}) {
  const timeout = opts.timeout ?? 10_000;
  const state = opts.state ?? 'visible';
  try {
    await page.locator(selector).waitFor({ state, timeout });
    return true;
  } catch {
    return false;
  }
}

async function pollUntil(checkFn, maxMs, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const result = await checkFn();
    if (result) return { found: true, elapsedMs: Date.now() - start };
    await new Promise((r) => setTimeout(r, intervalMs));
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (elapsed % 10 === 0) log(`  ...polling ${elapsed}s elapsed`);
  }
  return { found: false, elapsedMs: Date.now() - start };
}

async function runProCreationFlow(page, results) {
  log('=== PRO CREATION FLOW ===');

  // Step 1: Load app
  log('Navigating to app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20_000 });
  await screenshot(page, '01-app-loaded');

  const appShell = await waitForSelector(page, '.app-shell', { timeout: 10_000 });
  results.proAppLoaded = appShell;
  log(`App loaded: ${appShell}`);
  if (!appShell) {
    results.errors.push('App shell not visible');
    return;
  }

  // Step 2: Find 新建项目 button
  const newProjOk = await waitForSelector(page, 'button[data-action="open-create-mode-picker"]', { timeout: 8_000 });
  results.proNewProjectBtn = newProjOk;
  log(`新建项目 button found: ${newProjOk}`);
  if (!newProjOk) {
    results.errors.push('新建项目 button not found');
    return;
  }

  // Step 3: Open mode picker
  log('Clicking 新建项目...');
  await page.locator('button[data-action="open-create-mode-picker"]').click();
  await page.waitForTimeout(500);
  await screenshot(page, '02-mode-picker');

  const modePickerVisible = await waitForSelector(page, '.mode-picker-backdrop', { timeout: 5_000 });
  results.proModePickerOpened = modePickerVisible;
  log(`Mode picker visible: ${modePickerVisible}`);

  const hasPro = await page.locator('button[data-action="open-pro-creation"]').isVisible().catch(() => false);
  const hasQuick = await page.locator('button[data-action="open-quick-creation"]').isVisible().catch(() => false);
  results.proModePickerHasPro = hasPro;
  results.proModePickerHasQuick = hasQuick;
  log(`Mode picker — 精品创作: ${hasPro}, 快速创作: ${hasQuick}`);

  if (!hasPro) {
    results.errors.push('精品创作 button not found in mode picker (data-action="open-pro-creation")');
    return;
  }

  // Step 4: Click 精品创作
  log('Clicking 精品创作...');
  await page.locator('button[data-action="open-pro-creation"]').click();
  await page.waitForTimeout(600);
  await screenshot(page, '03-pro-creation-anchor');

  const creationPanelVisible = await page.locator('#panel-creation:not([hidden])').count() > 0;
  results.proPageOpened = creationPanelVisible;
  log(`Pro creation panel visible: ${creationPanelVisible}`);
  if (!creationPanelVisible) {
    results.errors.push('Pro creation panel not visible after clicking 精品创作');
    return;
  }

  // Step 5: Verify anchor textarea
  const textareaOk = await waitForSelector(page, 'textarea[data-action="pro-anchor-input"]', { timeout: 5_000 });
  results.proTextareaFound = textareaOk;
  log(`Anchor textarea found: ${textareaOk}`);
  if (!textareaOk) {
    results.errors.push('Anchor textarea not found (data-action="pro-anchor-input")');
    return;
  }

  // Step 6: Enter anchor text
  const anchor = '一个公司高管发现秘书是自己失散多年的妹妹';
  log(`Entering anchor: "${anchor}"`);
  await page.locator('textarea[data-action="pro-anchor-input"]').fill(anchor);
  await page.locator('textarea[data-action="pro-anchor-input"]').dispatchEvent('input');
  await page.waitForTimeout(300);
  results.proAnchorEntered = true;
  await screenshot(page, '04-anchor-entered');

  // Step 7: Click 开始创作 → real AI analyze call
  log('Clicking 开始创作 (real AI call — up to 90s)...');
  const analyzeBtn = page.locator('button[data-action="pro-analyze-anchor"]');
  const analyzeBtnVisible = await analyzeBtn.isVisible().catch(() => false);
  if (!analyzeBtnVisible) {
    results.errors.push('开始创作 button not found (data-action="pro-analyze-anchor")');
    return;
  }

  await analyzeBtn.click();
  results.proAnalyzeClicked = true;
  await screenshot(page, '05-analyzing-started');

  // Step 8: Wait for workbench tabs (up to 90s)
  log('Waiting for workbench tabs (≤90s, real AI)...');
  const analyzeStart = Date.now();
  const { found: tabsFound, elapsedMs: analyzeMs } = await pollUntil(
    async () => {
      const count = await page.locator('.pro-wb-tab').count();
      return count >= 3;
    },
    90_000,
    1500
  );
  results.analyzeElapsedSecs = Math.round(analyzeMs / 1000);
  results.proWorkbenchTabsAppeared = tabsFound;
  log(`Workbench tabs appeared: ${tabsFound} (${results.analyzeElapsedSecs}s elapsed)`);

  if (!tabsFound) {
    results.errors.push(`Workbench tabs did not appear within 90s (real AI)`);
    await screenshot(page, '05b-analyze-timeout');
    // Check for error state
    const errText = await page.locator('.pro-error').textContent().catch(() => '');
    if (errText) results.errors.push(`AI error: ${errText}`);
    return;
  }

  await screenshot(page, '06-workbench-tabs');

  // Step 9: Verify the three tabs
  const allTabTexts = await page.locator('.pro-wb-tab').allTextContents();
  log(`Tab texts: ${JSON.stringify(allTabTexts.map((t) => t.trim()))}`);
  results.proTabTheme = allTabTexts.some((t) => t.includes('主题台'));
  results.proTabCharacter = allTabTexts.some((t) => t.includes('人物台'));
  results.proTabScene = allTabTexts.some((t) => t.includes('场景台'));

  if (!results.proTabTheme) results.errors.push('Workbench tab 主题台 not found');
  if (!results.proTabCharacter) results.errors.push('Workbench tab 人物台 not found');
  if (!results.proTabScene) results.errors.push('Workbench tab 场景台 not found');

  // Step 10: Wait for questions in active workbench (AI generates them)
  // The app auto-triggers question generation after analyze completes.
  // We wait for questions OR for a "generate" button to appear (meaning questions failed/empty),
  // then click it once and wait again. We do NOT click repeatedly to avoid concurrent calls.
  log('Waiting for questions in active workbench (≤90s)...');
  let genBtnClicked = false;
  const { found: questionsFound } = await pollUntil(
    async () => {
      const qCount = await page.locator('.pro-qa-item').count();
      if (qCount > 0) return true;

      // Check loading state
      const loading = await page.locator('.pro-wb-loading').count();
      if (loading > 0) return false; // Still generating

      // If not loading and no questions, and gen button visible — click once
      const genBtn = await page.locator('button[data-action="pro-gen-questions"]').count();
      if (genBtn > 0 && !genBtnClicked) {
        log('  Questions gen button found — clicking once to generate');
        await page.locator('button[data-action="pro-gen-questions"]').first().click();
        genBtnClicked = true;
      }
      return false;
    },
    90_000,
    2000
  );
  results.proQuestionsAppeared = questionsFound;

  const qCount = await page.locator('.pro-qa-item').count();
  log(`Questions appeared: ${questionsFound} (count: ${qCount})`);

  if (!questionsFound) {
    results.errors.push('No questions appeared in active workbench within 90s');
    await screenshot(page, '06b-questions-timeout');
  } else {
    await screenshot(page, '07-questions-loaded');

    // Step 11: Fill in an answer
    log('Filling in an answer in the active workbench...');
    const firstTextarea = page.locator('.pro-qa-answer').first();
    const firstTextareaVisible = await firstTextarea.isVisible().catch(() => false);
    if (firstTextareaVisible) {
      const existing = await firstTextarea.inputValue();
      const modified = existing ? existing + ' [已审阅]' : '这是一个关于家庭秘密与身份认同的故事，探讨血缘羁绊如何超越社会阶层';
      await firstTextarea.fill(modified);
      await firstTextarea.dispatchEvent('input');
      await page.waitForTimeout(300);
      results.proAnswerFilled = true;
      log(`Answer filled: "${modified.slice(0, 50)}..."`);
      await screenshot(page, '08-answer-filled');
    } else {
      results.errors.push('First answer textarea not visible — cannot fill answer');
    }
  }

  // Step 12: Click 进入创作 (assemble — real AI, up to 300s)
  log('Clicking 进入创作 → (real AI assemble call — up to 300s)...');
  const assembleBtn = page.locator('button[data-action="pro-assemble"]');
  const assembleBtnVisible = await assembleBtn.isVisible().catch(() => false);
  if (!assembleBtnVisible) {
    results.errors.push('进入创作 button not found (data-action="pro-assemble")');
    return;
  }

  await assembleBtn.click();
  results.proAssembleClicked = true;
  await screenshot(page, '09-assembling-started');

  // Wait for assembly — should navigate away from creation page or show assembling state
  log('Waiting for assembly to complete (≤300s)...');
  const assembleStart = Date.now();

  const { found: assembleCompleted, elapsedMs: assembleMs } = await pollUntil(
    async () => {
      // Completion signals:
      // 1. Assembling state disappears (pro-creation--assembling removed)
      // 2. Panel-creation becomes hidden
      // 3. Project page becomes visible (a project workflow panel shows up)
      const assemblingPanel = await page.locator('.pro-creation--assembling').count();
      const creationHidden = await page.locator('#panel-creation[hidden]').count() > 0;
      const projectPanelVisible = await page.locator('[data-page="project"]:not([hidden]), .workflow-page:not([hidden]), #stepper-nav:visible').count() > 0;

      // If assembling state shows initially then disappears, or panel-creation is hidden
      if (creationHidden || projectPanelVisible) return true;

      // If assembling panel is NOT visible anymore (and we already clicked assemble)
      // Check if we're showing the assembling state — that means it's in progress
      if (assemblingPanel === 0) {
        // Not in assembling state, check if creation panel is still visible
        const creationStillVisible = await page.locator('#panel-creation:not([hidden])').count() > 0;
        if (!creationStillVisible) return true; // navigated away
      }

      return false;
    },
    300_000,
    2000
  );

  results.assembleElapsedSecs = Math.round(assembleMs / 1000);
  results.proAssembleCompleted = assembleCompleted;
  log(`Assembly completed: ${assembleCompleted} (${results.assembleElapsedSecs}s elapsed)`);

  if (!assembleCompleted) {
    results.errors.push(`Assembly did not complete within 300s`);
    await screenshot(page, '09b-assemble-timeout');
    const errText = await page.locator('.pro-error, [data-error]').textContent().catch(() => '');
    if (errText) results.errors.push(`Assembly error text: ${errText}`);
    return;
  }

  await screenshot(page, '10-post-assemble');

  // Step 13: Verify navigation to project/workflow page
  // The app should show the project workflow (structure, characters, etc.)
  await page.waitForTimeout(1000);
  const projectPanelVisible = await page.locator('[data-page="project"]:not([hidden])').count() > 0;
  const stepperNavVisible = await page.locator('#stepper-nav').isVisible().catch(() => false);
  const workflowVisible = projectPanelVisible || stepperNavVisible;

  results.proNavigatedToProject = workflowVisible;
  log(`Navigated to project workflow: ${workflowVisible} (panel=${projectPanelVisible}, stepper=${stepperNavVisible})`);

  if (!workflowVisible) {
    // Check page URL or other indicators
    const pageContent = await page.locator('body').textContent().catch(() => '');
    const hasStructure = pageContent.includes('结构骨架') || pageContent.includes('人物核心');
    results.proNavigatedToProject = hasStructure;
    log(`  Checked page content for workflow indicators: ${hasStructure}`);
    if (!hasStructure) {
      results.errors.push('App did not navigate to project workflow page after assembly');
    }
  }

  await screenshot(page, '11-project-workflow');
}

async function runQuickCreationFlow(page, results) {
  log('=== QUICK CREATION FLOW ===');

  // Navigate back to project list first
  const backBtn = page.locator('button[data-action="back-to-projects"]');
  const backVisible = await backBtn.isVisible().catch(() => false);
  if (backVisible) {
    await backBtn.click();
    log('Clicked back-to-projects');
  } else {
    // Try project nav button
    const navBtn = page.locator('#page-project-button');
    const navVisible = await navBtn.isVisible().catch(() => false);
    if (navVisible) {
      await navBtn.click();
      log('Clicked page-project-button');
    } else {
      // Reload the app to get to project list
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20_000 });
      log('Reloaded app to get to project list');
    }
  }
  await page.waitForTimeout(500);

  // Open mode picker
  log('Clicking 新建项目 for quick creation...');
  const newProjBtn = page.locator('button[data-action="open-create-mode-picker"]');
  const newProjVisible = await waitForSelector(page, 'button[data-action="open-create-mode-picker"]', { timeout: 8_000 });
  if (!newProjVisible) {
    results.errors.push('Quick flow: 新建项目 button not found');
    return;
  }
  await newProjBtn.click();
  await page.waitForTimeout(500);

  const modePickerOk = await waitForSelector(page, '.mode-picker-backdrop', { timeout: 5_000 });
  results.quickModePickerOpened = modePickerOk;
  log(`Quick: mode picker opened: ${modePickerOk}`);
  await screenshot(page, '12-quick-mode-picker');

  // Click 快速创作
  log('Clicking 快速创作...');
  const quickBtn = page.locator('button[data-action="open-quick-creation"]');
  const quickBtnVisible = await quickBtn.isVisible().catch(() => false);
  if (!quickBtnVisible) {
    results.errors.push('Quick flow: 快速创作 button not found');
    return;
  }
  await quickBtn.click();
  await page.waitForTimeout(600);
  await screenshot(page, '13-quick-creation-opened');

  const quickPanelVisible = await page.locator('#panel-creation:not([hidden])').count() > 0;
  results.quickPageOpened = quickPanelVisible;
  log(`Quick creation panel opened: ${quickPanelVisible}`);
  if (!quickPanelVisible) {
    results.errors.push('Quick creation panel not visible after clicking 快速创作');
    return;
  }

  // Verify Step 1: 故事核心
  log('Verifying Step 1: 故事核心...');
  const pageBodyText = await page.evaluate(() => document.body.innerText);
  const hasStep1 = pageBodyText.includes('故事核心');
  results.quickStep1Visible = hasStep1;
  log(`Step 1 (故事核心) visible: ${hasStep1}`);

  if (!hasStep1) {
    // Wider search
    const allTexts = await page.locator('.cf-tl-node, .cf-step-label, h2, .cf-title, .step-title').allTextContents().catch(() => []);
    const found = allTexts.some((t) => t.includes('故事核心'));
    results.quickStep1Visible = found;
    log(`  Wider search for 故事核心: ${found}`);
    if (!found) {
      results.errors.push('Quick step 1: 故事核心 not found in creation content');
    }
  }

  // Fill in logline (≥10 chars)
  log('Filling logline...');
  const logline = '一个外卖骑手在送餐途中偶然发现了商业腐败的证据';

  // Find the logline/text input in step 1
  // The form typically has a textarea or input for the story core
  const possibleInputs = [
    'textarea[data-field="logline"]',
    'input[data-field="logline"]',
    'textarea[name="logline"]',
    '.cf-step-1 textarea',
    '.cf-step textarea',
    '#creationContent textarea',
    '#panel-creation textarea',
  ];

  let loglineFilled = false;
  for (const sel of possibleInputs) {
    const el = page.locator(sel).first();
    const visible = await el.isVisible().catch(() => false);
    if (visible) {
      await el.fill(logline);
      await el.dispatchEvent('input');
      await page.waitForTimeout(200);
      loglineFilled = true;
      log(`  Filled logline via selector: ${sel}`);
      break;
    }
  }

  if (!loglineFilled) {
    // Try to find any visible textarea
    const textareas = page.locator('#panel-creation textarea, #creationContent textarea');
    const count = await textareas.count();
    log(`  Found ${count} textareas in panel`);
    if (count > 0) {
      await textareas.first().fill(logline);
      await textareas.first().dispatchEvent('input');
      await page.waitForTimeout(200);
      loglineFilled = true;
      log(`  Filled logline via first textarea`);
    }
  }

  results.quickLoglineFilled = loglineFilled;
  if (!loglineFilled) {
    results.errors.push('Quick step 1: could not find a textarea to fill the logline');
  }

  await screenshot(page, '14-quick-step1-filled');

  // Click 下一步 button (step 1 → step 2)
  log('Clicking 下一步：选结构 (step 1 → 2)...');
  const nextBtns = [
    'button[data-action="next-step"]',
    'button[data-step-next]',
    '.cf-next-btn',
    'button:has-text("下一步")',
    'button:has-text("选结构")',
  ];

  let nextClicked = false;
  for (const sel of nextBtns) {
    const btn = page.locator(sel).first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      nextClicked = true;
      log(`  Clicked next via: ${sel}`);
      break;
    }
  }

  results.quickNextStep1Clicked = nextClicked;
  if (!nextClicked) {
    results.errors.push('Quick step 1: could not find 下一步 button');
  }

  await page.waitForTimeout(800);
  await screenshot(page, '15-quick-step2');

  // Verify Step 2: 结构选择
  log('Verifying Step 2: 结构选择...');
  await page.waitForTimeout(1000);
  // Use body textContent since #creationContent is nested inside #panel-creation
  const bodyText2 = await page.evaluate(() => document.body.innerText);
  const hasStep2 = bodyText2.includes('结构') || bodyText2.includes('三幕') || bodyText2.includes('四幕') || bodyText2.includes('模板') || bodyText2.includes('叙事');
  results.quickStep2Visible = hasStep2;
  log(`Step 2 (结构选择) visible: ${hasStep2}`);

  if (!hasStep2) {
    results.errors.push('Quick step 2: 结构选择 content not found');
  }

  // Click 下一步：生成人物 (step 2 → step 3)
  log('Clicking 下一步：生成人物 (step 2 → 3)...');
  let next2Clicked = false;
  for (const sel of nextBtns) {
    const btn = page.locator(sel).first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      next2Clicked = true;
      log(`  Clicked next (step2) via: ${sel}`);
      break;
    }
  }

  results.quickNextStep2Clicked = next2Clicked;
  if (!next2Clicked) {
    results.errors.push('Quick step 2: could not find 下一步 button');
  }

  await page.waitForTimeout(1000);
  await screenshot(page, '16-quick-step3');

  // Verify Step 3: 人物
  // This step triggers AI generation — allow more time and check for the AI overlay too
  log('Verifying Step 3: 人物...');
  await page.waitForTimeout(1500);
  const bodyText3 = await page.evaluate(() => document.body.innerText);
  // Step 3 shows either character forms or "AI 生成角色..." overlay
  const hasStep3 = bodyText3.includes('人物') || bodyText3.includes('角色') || bodyText3.includes('主角') || bodyText3.includes('AI 生成') || bodyText3.includes('生成角色');
  results.quickStep3Visible = hasStep3;
  log(`Step 3 (人物) visible: ${hasStep3}`);

  if (!hasStep3) {
    results.errors.push('Quick step 3: 人物 content not found');
  }

  await screenshot(page, '17-quick-step3-final');
}

async function runTest() {
  log('Starting E2E test with REAL AI calls (no mocking)');
  log(`App: ${BASE_URL}`);

  const results = makeResult();

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ['--no-proxy-server', '--proxy-bypass-list=<-loopback>'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  // Collect console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
      log(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  // Track network requests to the AI endpoints
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/pro/')) {
      const status = resp.status();
      log(`[NET] ${url.split('/api/pro/')[1]} → HTTP ${status}`);
    }
  });

  try {
    await runProCreationFlow(page, results);
    await runQuickCreationFlow(page, results);
  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    if (err.stack) log(err.stack.split('\n').slice(0, 5).join('\n'));
    results.errors.push(`Fatal: ${err.message}`);
    await screenshot(page, '99-fatal-error').catch(() => {});
  } finally {
    await browser.close();
    log('Browser closed');
  }

  // ── Print Results ──────────────────────────────────────────────────────────
  const sep = '='.repeat(72);
  console.log('\n' + sep);
  console.log('E2E TEST RESULTS — Real AI Calls');
  console.log(sep);

  function line(label, pass, note = '') {
    const status = pass ? 'PASS' : 'FAIL';
    const pad = ' '.repeat(Math.max(0, 50 - label.length));
    console.log(`  ${label}${pad}${status}${note ? '  # ' + note : ''}`);
  }

  console.log('\n[Pro Creation Flow — Real AI]');
  line('App loaded', results.proAppLoaded);
  line('"新建项目" button found', results.proNewProjectBtn);
  line('Mode picker opened', results.proModePickerOpened);
  line('  Mode picker has 精品创作', results.proModePickerHasPro);
  line('  Mode picker has 快速创作', results.proModePickerHasQuick);
  line('Pro creation page opened', results.proPageOpened);
  line('  Anchor textarea found', results.proTextareaFound);
  line('  Anchor text entered', results.proAnchorEntered);
  line('  开始创作 clicked', results.proAnalyzeClicked);
  line(
    `  Workbench tabs appeared (≤90s, took ${results.analyzeElapsedSecs}s)`,
    results.proWorkbenchTabsAppeared
  );
  line('    Tab: 主题台', results.proTabTheme);
  line('    Tab: 人物台', results.proTabCharacter);
  line('    Tab: 场景台', results.proTabScene);
  line('  AI questions appeared in workbench', results.proQuestionsAppeared);
  line('  Answer filled in workbench', results.proAnswerFilled);
  line('  进入创作 clicked', results.proAssembleClicked);
  line(
    `  Assembly completed (≤300s, took ${results.assembleElapsedSecs}s)`,
    results.proAssembleCompleted
  );
  line('  Navigated to project workflow page', results.proNavigatedToProject);

  console.log('\n[Quick Creation Flow]');
  line('Mode picker opened', results.quickModePickerOpened);
  line('Quick creation panel opened', results.quickPageOpened);
  line('Step 1 (故事核心) visible', results.quickStep1Visible);
  line('Logline filled (≥10 chars)', results.quickLoglineFilled);
  line('下一步：选结构 clicked', results.quickNextStep1Clicked);
  line('Step 2 (结构选择) visible', results.quickStep2Visible);
  line('下一步：生成人物 clicked', results.quickNextStep2Clicked);
  line('Step 3 (人物) visible', results.quickStep3Visible);

  const checks = [
    results.proAppLoaded,
    results.proNewProjectBtn,
    results.proModePickerOpened,
    results.proModePickerHasPro,
    results.proModePickerHasQuick,
    results.proPageOpened,
    results.proTextareaFound,
    results.proAnchorEntered,
    results.proAnalyzeClicked,
    results.proWorkbenchTabsAppeared,
    results.proTabTheme,
    results.proTabCharacter,
    results.proTabScene,
    results.proQuestionsAppeared,
    results.proAnswerFilled,
    results.proAssembleClicked,
    results.proAssembleCompleted,
    results.proNavigatedToProject,
    results.quickModePickerOpened,
    results.quickPageOpened,
    results.quickStep1Visible,
    results.quickLoglineFilled,
    results.quickNextStep1Clicked,
    results.quickStep2Visible,
    results.quickNextStep2Clicked,
    results.quickStep3Visible,
  ];
  const passed = checks.filter(Boolean).length;
  const total = checks.length;

  console.log(`\nOverall: ${passed}/${total} checks passed`);

  if (results.errors.length > 0) {
    console.log('\nErrors / Failures:');
    results.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  } else {
    console.log('\nNo errors recorded.');
  }

  if (results.consoleErrors.length > 0) {
    console.log('\nBrowser Console Errors:');
    results.consoleErrors.slice(0, 15).forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  console.log('\nScreenshots saved to:', SCREENSHOTS_DIR);
  const shots = fs.readdirSync(SCREENSHOTS_DIR).map((f) => path.join(SCREENSHOTS_DIR, f));
  shots.forEach((f) => console.log(`  ${f}`));
  console.log(sep);

  return { results, passed, total };
}

runTest().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
