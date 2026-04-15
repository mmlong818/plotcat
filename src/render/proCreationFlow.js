import { escapeHtml } from "../utils.js";

const GENRE_OPTIONS = [
  "剧情", "喜剧", "悬疑", "惊悚", "爱情", "动作", "科幻", "奇幻", "历史", "犯罪", "家庭", "青春"
];

function renderActiveWorkbench(appState) {
  const activeWb = appState.proCreation.activeWb;
  const wb = appState.proCreation.workbenches[activeWb];
  if (wb.loading) {
    return `
      <div class="pro-wb-panel">
        <div class="pro-wb-loading">AI 正在思考问题…</div>
      </div>
    `;
  }
  if (wb.questions.length === 0) {
    return `
      <div class="pro-wb-panel">
        <div class="pro-wb-empty">
          <button class="button button--ghost" type="button"
            data-action="pro-gen-questions" data-wb="${escapeHtml(activeWb)}">
            生成问题
          </button>
        </div>
      </div>
    `;
  }
  return `
    <div class="pro-wb-panel">
      <div class="pro-qa-list">
        ${wb.questions.map((q) => `
          <div class="pro-qa-item">
            <p class="pro-qa-question">${escapeHtml(q.question)}</p>
            <textarea class="pro-qa-answer"
              data-action="pro-set-answer"
              data-wb="${escapeHtml(activeWb)}"
              data-qid="${escapeHtml(q.id)}"
              rows="3"
            >${escapeHtml(q.answer)}</textarea>
          </div>
        `).join("")}
        <div class="pro-wb-actions">
          <button class="button button--ghost button--small" type="button"
            data-action="pro-gen-questions" data-wb="${escapeHtml(activeWb)}">重新生成问题</button>
          <button class="button button--ghost button--small ${wb.done ? "is-active" : ""}" type="button"
            data-action="pro-mark-wb-done" data-wb="${escapeHtml(activeWb)}">
            ${wb.done ? "✓ 已完成" : "标记完成"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderAnchorStep(appState) {
  const { anchor, genres, loading, error } = appState.proCreation;
  return `
    <section class="pro-creation pro-creation--anchor">
      <div class="pro-creation__header">
        <button class="cf-back-btn" data-action="back-to-projects">← 返回</button>
        <h2 class="pro-creation__title">精品创作</h2>
        <p class="pro-creation__subtitle">从任何地方开始——一个人物、一幅画面、一句话、一种感受</p>
      </div>

      <div class="pro-anchor-card">
        <div class="pro-anchor-genres">
          <p class="section-label">类型（可选）</p>
          <div class="chip-wrap">
            ${GENRE_OPTIONS.map((g) => `
              <button class="genre-chip ${genres.includes(g) ? "is-active" : ""}"
                type="button" data-action="pro-toggle-genre" data-value="${escapeHtml(g)}">
                ${escapeHtml(g)}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="pro-anchor-input-wrap">
          <textarea
            class="pro-anchor-textarea"
            data-action="pro-anchor-input"
            placeholder="你想写什么？可以是一个人、一个场景、一句台词、一种情感，或者什么都行……"
            rows="5"
          >${escapeHtml(anchor)}</textarea>
        </div>

        ${error ? `<p class="pro-error">${escapeHtml(error)}</p>` : ""}

        <div class="pro-anchor-actions">
          <button class="button button--primary" type="button" data-action="pro-analyze-anchor"
            ${loading ? "disabled" : ""}>
            ${loading ? "分析中…" : "开始创作"}
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderWorkbenchesStep(appState) {
  const { anchor, activeWb, workbenches, loading } = appState.proCreation;
  const wbLabels = { theme: "主题台", character: "人物台", scene: "场景台" };
  return `
    <section class="pro-creation pro-creation--workbenches">
      <div class="pro-creation__header">
        <button class="cf-back-btn" data-action="pro-back-to-anchor">← 重新输入</button>
        <h2 class="pro-creation__title">深度开发</h2>
        <div class="pro-header-actions">
          <button class="button button--primary" type="button" data-action="pro-assemble"
            ${loading ? "disabled" : ""}>
            ${loading ? "组装中…" : "进入创作 →"}
          </button>
        </div>
      </div>

      <div class="pro-anchor-summary">
        <p class="pro-anchor-summary__text">${escapeHtml(anchor.slice(0, 80))}${anchor.length > 80 ? "…" : ""}</p>
      </div>

      <div class="pro-wb-tabs">
        ${["theme", "character", "scene"].map((wb) => {
          const wbState = workbenches[wb];
          const isActive = activeWb === wb;
          const isDone = wbState.done;
          return `<button class="pro-wb-tab ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}"
            type="button" data-action="pro-switch-wb" data-wb="${wb}">
            ${isDone ? "✓ " : ""}${wbLabels[wb]}
          </button>`;
        }).join("")}
      </div>

      ${renderActiveWorkbench(appState)}
    </section>
  `;
}

function renderAssemblingStep() {
  return `
    <section class="pro-creation pro-creation--assembling">
      <div class="pro-assembling-state">
        <p class="pro-assembling-title">AI 正在整合创作材料…</p>
        <p class="pro-assembling-sub">即将进入创作工作台</p>
      </div>
    </section>
  `;
}

export function renderProCreationPage(dom, appState) {
  const step = appState.proCreation.step;
  let html = "";
  if (step === "anchor") {
    html = renderAnchorStep(appState);
  } else if (step === "workbenches") {
    html = renderWorkbenchesStep(appState);
  } else {
    html = renderAssemblingStep();
  }
  dom.creationContent.innerHTML = html;
}
