/**
 * E2E Test: 精品创作 (Pro Creation) Mode
 *
 * Scenarios tested:
 *   1. Open app, navigate to project list
 *   2. Click "新建项目" → mode picker overlay appears
 *   3. Verify mode picker shows "快速创作" and "精品创作"
 *   4. Click "精品创作" → pro creation page (anchor step)
 *   5. Verify textarea for creative starting point
 *   6. Enter prompt, click "开始创作"
 *   7. Wait ≤90s for AI analysis (mocked)
 *   8. Verify three workbench tabs: 主题台, 人物台, 场景台
 *   9. Verify questions appear in active workbench
 *  10. "快速创作" mode still works (shows 5-step flow, Step 1: 故事核心)
 *  11. Theme toggle (🌙) switches light/dark
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'e2e-screenshots');
const BASE_URL = 'http://localhost:4173';

const CHROMIUM_PATH = 'C:\\Users\\nd851\\AppData\\Local\\ms-playwright\\chromium-1208\\chrome-win64\\chrome.exe';

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function log(msg) {
  console.log(`[E2E] ${new Date().toISOString()} ${msg}`);
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `pro-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`Screenshot saved: pro-${name}.png`);
  return filePath;
}

const results = {
  appLoaded: false,
  newProjectButtonFound: false,
  modePickerOpened: false,
  modePickerHasQuickCreation: false,
  modePickerHasProCreation: false,
  proCreationPageOpened: false,
  proCreationHasTextarea: false,
  anchorEntered: false,
  analyzeClicked: false,
  workbenchTabsAppeared: false,
  tabTheme: false,
  tabCharacter: false,
  tabScene: false,
  questionsAppeared: false,
  quickCreationFlowWorks: false,
  quickCreationStep1Visible: false,
  themeToggleWorks: false,
  errors: [],
  consoleErrors: [],
};

async function runTest() {
  log('Starting E2E test: 精品创作 (Pro Creation) mode');

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROMIUM_PATH,
    args: ['--no-proxy-server', '--proxy-bypass-list=<-loopback>'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  // ── Mock /api/pro/analyze ──────────────────────────────────────────────────
  await context.route('**/api/pro/analyze', async (route) => {
    log('[MOCK] /api/pro/analyze → instant response');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_wb: 'theme',
        context: {
          anchor_type: 'premise',
          key_elements: ['心理咨询师', '病人', '共同梦境'],
          tone: '悬疑',
          potential_themes: ['集体无意识', '职业伦理', '边界崩溃'],
        },
      }),
    });
  });

  // ── Mock /api/pro/questions ────────────────────────────────────────────────
  await context.route('**/api/pro/questions', async (route) => {
    const body = JSON.parse((await route.request().postData()) ?? '{}');
    const wb = body.wb ?? 'theme';
    log(`[MOCK] /api/pro/questions for wb="${wb}"`);

    const questionSets = {
      theme: [
        { id: 'q1', question: '这个故事最核心的主题矛盾是什么？', answer: '' },
        { id: 'q2', question: '你希望观众在结尾感受到什么？', answer: '' },
      ],
      character: [
        { id: 'q3', question: '咨询师的内心创伤是什么？', answer: '' },
        { id: 'q4', question: '这些病人之间有什么共同点？', answer: '' },
      ],
      scene: [
        { id: 'q5', question: '梦境在视觉上应该呈现怎样的风格？', answer: '' },
        { id: 'q6', question: '咨询室的空间氛围如何支撑主题？', answer: '' },
      ],
    };

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: questionSets[wb] ?? [] }),
    });
  });

  // ── Mock /api/pro/assemble (just in case) ─────────────────────────────────
  await context.route('**/api/pro/assemble', async (route) => {
    log('[MOCK] /api/pro/assemble → instant response');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
      log(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    // ── STEP 1: Load app ────────────────────────────────────────────────────
    log('Navigating to app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await screenshot(page, '00-app-loaded');

    const appShell = page.locator('.app-shell');
    const appShellVisible = await appShell.isVisible().catch(() => false);
    results.appLoaded = appShellVisible;
    log(`App loaded: ${appShellVisible}`);
    if (!appShellVisible) {
      results.errors.push('App shell not visible after load');
    }

    // ── STEP 2: Find "新建项目" button ───────────────────────────────────────
    log('Looking for "新建项目" button...');
    const newProjBtn = page.locator('button[data-action="open-create-mode-picker"]');
    await newProjBtn.waitFor({ state: 'visible', timeout: 8000 });
    results.newProjectButtonFound = true;
    log('Found "新建项目" button');

    // ── STEP 3: Click "新建项目" → mode picker ───────────────────────────────
    log('Clicking "新建项目"...');
    await newProjBtn.click();
    await page.waitForTimeout(400);
    await screenshot(page, '01-mode-picker-opened');

    const modePickerBackdrop = page.locator('.mode-picker-backdrop');
    const modePickerVisible = await modePickerBackdrop.isVisible().catch(() => false);
    results.modePickerOpened = modePickerVisible;
    log(`Mode picker visible: ${modePickerVisible}`);
    if (!modePickerVisible) {
      results.errors.push('Mode picker did not open after clicking 新建项目');
    }

    // ── STEP 4: Verify mode picker has both options ──────────────────────────
    const quickBtn = page.locator('button[data-action="open-quick-creation"]');
    const proBtn = page.locator('button[data-action="open-pro-creation"]');

    results.modePickerHasQuickCreation = await quickBtn.isVisible().catch(() => false);
    results.modePickerHasProCreation = await proBtn.isVisible().catch(() => false);
    log(`Mode picker has 快速创作: ${results.modePickerHasQuickCreation}`);
    log(`Mode picker has 精品创作: ${results.modePickerHasProCreation}`);

    if (!results.modePickerHasQuickCreation) {
      results.errors.push('Mode picker: 快速创作 button not found (data-action="open-quick-creation")');
    }
    if (!results.modePickerHasProCreation) {
      results.errors.push('Mode picker: 精品创作 button not found (data-action="open-pro-creation")');
    }

    // Verify text content
    if (results.modePickerHasQuickCreation) {
      const quickText = await quickBtn.textContent();
      log(`快速创作 button text: "${quickText?.trim()}"`);
    }
    if (results.modePickerHasProCreation) {
      const proText = await proBtn.textContent();
      log(`精品创作 button text: "${proText?.trim()}"`);
    }

    // ── STEP 5: Click "精品创作" ─────────────────────────────────────────────
    log('Clicking "精品创作"...');
    await proBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, '02-pro-creation-page');

    // Verify panel-creation is now active
    const creationPanel = page.locator('#panel-creation:not([hidden])');
    const creationPanelVisible = await creationPanel.count() > 0;
    results.proCreationPageOpened = creationPanelVisible;
    log(`Pro creation panel visible: ${creationPanelVisible}`);
    if (!creationPanelVisible) {
      results.errors.push('Pro creation panel (#panel-creation) not visible after clicking 精品创作');
    }

    // Verify the anchor step UI title and subtitle
    const proTitle = await page.locator('.pro-creation__title').first().textContent().catch(() => '');
    log(`Pro creation title: "${proTitle?.trim()}"`);

    // ── STEP 6: Verify textarea for creative starting point ──────────────────
    const anchorTextarea = page.locator('textarea[data-action="pro-anchor-input"]');
    results.proCreationHasTextarea = await anchorTextarea.isVisible().catch(() => false);
    log(`Anchor textarea visible: ${results.proCreationHasTextarea}`);
    if (!results.proCreationHasTextarea) {
      results.errors.push('Anchor textarea (data-action="pro-anchor-input") not found');
    }

    // ── STEP 7: Enter test creative prompt ───────────────────────────────────
    const testPrompt = '一个心理咨询师发现自己的病人都在说同一个梦境';
    log(`Entering test prompt: "${testPrompt}"`);
    await anchorTextarea.fill(testPrompt);
    // Dispatch input event to update appState.proCreation.anchor
    await anchorTextarea.dispatchEvent('input');
    await page.waitForTimeout(200);
    results.anchorEntered = true;
    log('Anchor prompt entered');

    await screenshot(page, '03-anchor-entered');

    // ── STEP 8: Click "开始创作" ─────────────────────────────────────────────
    log('Clicking "开始创作"...');
    const analyzeBtn = page.locator('button[data-action="pro-analyze-anchor"]');
    await analyzeBtn.waitFor({ state: 'visible', timeout: 5000 });
    await analyzeBtn.click();
    results.analyzeClicked = true;
    log('Clicked 开始创作');

    await screenshot(page, '04-analyzing');

    // ── STEP 9: Wait ≤90s for workbench tabs to appear ──────────────────────
    log('Waiting for workbench tabs (≤90s)...');
    const startWait = Date.now();
    const maxWait = 90_000;
    let tabsFound = false;

    while (Date.now() - startWait < maxWait) {
      const tabCount = await page.locator('.pro-wb-tab').count();
      if (tabCount >= 3) {
        tabsFound = true;
        break;
      }
      await page.waitForTimeout(1000);
      const elapsed = Math.round((Date.now() - startWait) / 1000);
      if (elapsed % 5 === 0) {
        log(`  Waiting... ${elapsed}s elapsed, tabs found: ${tabCount}`);
      }
    }

    const elapsed = Math.round((Date.now() - startWait) / 1000);
    log(`Workbench tabs appeared: ${tabsFound} (after ${elapsed}s)`);
    results.workbenchTabsAppeared = tabsFound;

    if (!tabsFound) {
      results.errors.push(`Workbench tabs did not appear within ${Math.round(maxWait / 1000)}s`);
      await screenshot(page, '05-tabs-timeout');
    } else {
      await screenshot(page, '05-workbench-tabs');

      // ── STEP 10: Verify three tabs ─────────────────────────────────────────
      const allTabs = await page.locator('.pro-wb-tab').allTextContents();
      log(`Tab texts: ${JSON.stringify(allTabs.map((t) => t.trim()))}`);

      results.tabTheme = allTabs.some((t) => t.includes('主题台'));
      results.tabCharacter = allTabs.some((t) => t.includes('人物台'));
      results.tabScene = allTabs.some((t) => t.includes('场景台'));

      log(`Tab 主题台: ${results.tabTheme}`);
      log(`Tab 人物台: ${results.tabCharacter}`);
      log(`Tab 场景台: ${results.tabScene}`);

      if (!results.tabTheme) results.errors.push('Workbench tab "主题台" not found');
      if (!results.tabCharacter) results.errors.push('Workbench tab "人物台" not found');
      if (!results.tabScene) results.errors.push('Workbench tab "场景台" not found');

      // ── STEP 11: Verify questions appear in active workbench ───────────────
      log('Waiting for questions to appear in active workbench...');
      const qWaitStart = Date.now();
      const qMaxWait = 15_000;
      let questionsFound = false;

      while (Date.now() - qWaitStart < qMaxWait) {
        // Check for question items or loading state
        const qCount = await page.locator('.pro-qa-item').count();
        const loading = await page.locator('.pro-wb-loading').count();
        if (qCount > 0) {
          questionsFound = true;
          break;
        }
        if (loading === 0 && qCount === 0) {
          // Not loading and no questions - check for empty panel with gen button
          const genBtn = await page.locator('button[data-action="pro-gen-questions"]').count();
          if (genBtn > 0) {
            log('Questions gen button visible but no questions loaded - clicking it');
            await page.locator('button[data-action="pro-gen-questions"]').first().click();
          }
        }
        await page.waitForTimeout(500);
      }

      results.questionsAppeared = questionsFound;
      const qCount = await page.locator('.pro-qa-item').count();
      log(`Questions in workbench: ${qCount} (found: ${questionsFound})`);

      if (!questionsFound) {
        results.errors.push('No questions appeared in active workbench within 15s');
      }

      await screenshot(page, '06-workbench-with-questions');
    }

    // ── TEST B: 快速创作 mode still works ─────────────────────────────────────
    log('=== TEST B: Verifying 快速创作 mode ===');

    // Navigate back to project list
    const backBtn = page.locator('button[data-action="back-to-projects"]');
    const backBtnVisible = await backBtn.isVisible().catch(() => false);
    if (backBtnVisible) {
      await backBtn.click();
      log('Clicked back-to-projects');
    } else {
      // Try clicking on project nav button
      const pageProjectBtn = page.locator('#page-project-button');
      await pageProjectBtn.click();
      log('Clicked project list nav button');
    }
    await page.waitForTimeout(400);

    // Click "新建项目" again
    const newProjBtn2 = page.locator('button[data-action="open-create-mode-picker"]');
    await newProjBtn2.waitFor({ state: 'visible', timeout: 5000 });
    await newProjBtn2.click();
    await page.waitForTimeout(400);

    // Click "快速创作"
    const quickBtn2 = page.locator('button[data-action="open-quick-creation"]');
    await quickBtn2.waitFor({ state: 'visible', timeout: 5000 });
    await quickBtn2.click();
    await page.waitForTimeout(600);

    await screenshot(page, '07-quick-creation-opened');

    // Verify creation flow panel is visible
    const creationPanel2 = page.locator('#panel-creation:not([hidden])');
    const creationPanel2Visible = await creationPanel2.count() > 0;
    results.quickCreationFlowWorks = creationPanel2Visible;
    log(`Quick creation panel visible: ${creationPanel2Visible}`);

    // Verify Step 1 indicator: 故事核心
    const step1Texts = await page.locator('.cf-tl-node, .cf-step-label, h2, .cf-title').allTextContents();
    const hasStep1 = step1Texts.some((t) => t.includes('故事核心'));
    results.quickCreationStep1Visible = hasStep1;
    log(`Quick creation Step 1 (故事核心) visible: ${hasStep1}`);

    if (!creationPanel2Visible) {
      results.errors.push('Quick creation: creation panel not visible after clicking 快速创作');
    }
    if (!hasStep1) {
      // Try wider search
      const bodyText = await page.locator('#creationContent').textContent().catch(() => '');
      const hasInBody = bodyText.includes('故事核心');
      results.quickCreationStep1Visible = hasInBody;
      log(`  Step 1 in creationContent body: ${hasInBody}`);
      if (!hasInBody) {
        results.errors.push('Quick creation: Step 1 "故事核心" not found in creation content');
      }
    }

    await screenshot(page, '08-quick-creation-step1');

    // ── TEST C: Theme toggle ───────────────────────────────────────────────────
    log('=== TEST C: Theme toggle ===');

    const themeBtn = page.locator('#theme-toggle-button');
    await themeBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Get initial theme
    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? 'none');
    log(`Initial theme: "${initialTheme}"`);

    // Click toggle
    await themeBtn.click();
    await page.waitForTimeout(200);

    const afterFirstClick = await page.evaluate(() => document.documentElement.dataset.theme ?? 'none');
    log(`Theme after first click: "${afterFirstClick}"`);

    await screenshot(page, '09-theme-toggled');

    // Click toggle again
    await themeBtn.click();
    await page.waitForTimeout(200);

    const afterSecondClick = await page.evaluate(() => document.documentElement.dataset.theme ?? 'none');
    log(`Theme after second click: "${afterSecondClick}"`);

    // The toggle should have changed on first click and reverted on second
    const themeChangedOnFirstClick = afterFirstClick !== initialTheme;
    const themeRevertedOnSecondClick = afterSecondClick === initialTheme;
    results.themeToggleWorks = themeChangedOnFirstClick && themeRevertedOnSecondClick;
    log(`Theme toggle works: ${results.themeToggleWorks} (changed=${themeChangedOnFirstClick}, reverted=${themeRevertedOnSecondClick})`);

    if (!themeChangedOnFirstClick) {
      results.errors.push(`Theme toggle: theme did not change on click (was "${initialTheme}", still "${afterFirstClick}")`);
    }

    await screenshot(page, '10-theme-reverted');

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    log(err.stack ?? '');
    results.errors.push(`Fatal: ${err.message}`);
    await screenshot(page, '99-fatal-error').catch(() => {});
  } finally {
    await browser.close();
    log('Browser closed');
  }

  // ── Print Results ─────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('E2E TEST RESULTS: 精品创作 (Pro Creation) Mode');
  console.log('='.repeat(70));

  function line(label, pass, note = '') {
    const status = pass ? 'PASS' : 'FAIL';
    const pad = ' '.repeat(Math.max(0, 45 - label.length));
    console.log(`  ${label}${pad}${status}${note ? '  # ' + note : ''}`);
  }

  console.log('\n[Pro Creation Flow]');
  line('App loaded', results.appLoaded);
  line('"新建项目" button found', results.newProjectButtonFound);
  line('Mode picker opened', results.modePickerOpened);
  line('  Mode picker has "快速创作"', results.modePickerHasQuickCreation);
  line('  Mode picker has "精品创作"', results.modePickerHasProCreation);
  line('Pro creation page opened', results.proCreationPageOpened);
  line('  Anchor textarea present', results.proCreationHasTextarea);
  line('  Anchor text entered', results.anchorEntered);
  line('  "开始创作" clicked', results.analyzeClicked);
  line('Workbench tabs appeared (≤90s)', results.workbenchTabsAppeared);
  line('  Tab: 主题台', results.tabTheme);
  line('  Tab: 人物台', results.tabCharacter);
  line('  Tab: 场景台', results.tabScene);
  line('Questions appear in workbench', results.questionsAppeared);

  console.log('\n[Quick Creation Mode]');
  line('"快速创作" mode opens panel', results.quickCreationFlowWorks);
  line('Step 1 (故事核心) visible', results.quickCreationStep1Visible);

  console.log('\n[Theme Toggle]');
  line('Theme toggle (🌙) works', results.themeToggleWorks);

  const checks = [
    results.appLoaded,
    results.newProjectButtonFound,
    results.modePickerOpened,
    results.modePickerHasQuickCreation,
    results.modePickerHasProCreation,
    results.proCreationPageOpened,
    results.proCreationHasTextarea,
    results.analyzeClicked,
    results.workbenchTabsAppeared,
    results.tabTheme,
    results.tabCharacter,
    results.tabScene,
    results.questionsAppeared,
    results.quickCreationFlowWorks,
    results.quickCreationStep1Visible,
    results.themeToggleWorks,
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
    results.consoleErrors.slice(0, 10).forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  const screenshotFiles = fs.readdirSync(SCREENSHOTS_DIR)
    .filter((f) => f.startsWith('pro-'))
    .map((f) => path.join(SCREENSHOTS_DIR, f));

  console.log('\nScreenshots:');
  screenshotFiles.forEach((f) => console.log(`  ${f}`));
  console.log('='.repeat(70));

  return { results, passed, total };
}

runTest().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
