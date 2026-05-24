import { escapeHtml, inputField, textareaField, selectField, field, list, renderEmptyState } from "../utils.js";
import { setupStatusLabels } from "../state.js";

const LOCKS_TABS = [
  { id: "timeline", label: "时间线" },
  { id: "rules",    label: "世界规则" },
  { id: "setups",   label: "伏笔追踪" },
  { id: "genres",   label: "类型约束" },
  { id: "kb",       label: "外部知识源" }
];

function renderGenreItems(items = [], actionPrefix = "convention", emptyMessage = "还没有内容。") {
  if (items.length === 0) return renderEmptyState(emptyMessage);
  return `
    <div class="stack">
      ${items.map((item) => `
        <article class="list-select list-select--static">
          <strong>${escapeHtml(item.name || "未命名条目")}</strong>
          <span>${escapeHtml(item.status || item.description || "")}</span>
          <div class="form-grid form-grid--compact">
            ${inputField("名称", `${actionPrefix}-field`, "name", item.name)}
            ${actionPrefix === "convention" ? selectField("状态", `${actionPrefix}-field`, "status", item.status, [["required", "必备"], ["optional", "可选"]]) : ""}
            ${textareaField("说明", `${actionPrefix}-field`, "description", item.description, { rows: 3 })}
          </div>
          <div class="inline-actions">
            <button class="button button--ghost button--tiny" type="button" data-action="delete-${escapeHtml(actionPrefix)}" data-id="${escapeHtml(item.id)}">删除</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderGenresTab(appState) {
  const profile = appState.project.genre_profile;
  return `
    <section class="genre-workbench">
      <div class="summary-card">
        <p class="section-label">类型定位</p>
        <div class="form-grid">
          ${inputField("主类型", "genre-field", "primary_genre", profile.primary_genre)}
          ${inputField("副类型", "genre-field", "secondary_genres_text", list(profile.secondary_genres).join("、"))}
          ${textareaField("观众承诺", "genre-field", "audience_promise", profile.audience_promise, { rows: 3 })}
          ${inputField("气质词", "genre-field", "tone_words_text", list(profile.tone_words).join("、"), { full: true })}
        </div>
      </div>
      <div class="genre-workbench__grid">
        <div class="summary-card">
          <div class="list-card__head">
            <h3>类型常规</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-convention">新增常规</button>
          </div>
          ${renderGenreItems(list(profile.conventions), "convention", "先写下这一类作品必须兑现的期待。")}
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>类型禁区</h3>
            <button class="button button--ghost button--tiny" type="button" data-action="add-taboo">新增禁区</button>
          </div>
          ${renderGenreItems(list(profile.taboos), "taboo", "先写下不该踩的类型雷区。")}
        </div>
      </div>
    </section>
  `;
}

export function renderLocksPage(dom, appState, { getTimelineEvent, getWorldRule, getSetup }) {
  const activeTab = appState.locksActiveTab || "timeline";
  const lockedCards = list(appState.project.plot_board?.cards).filter((card) => card.status === "locked");
  const timeline = list(appState.project.lock_layer?.projections?.timeline_events);
  const rules = list(appState.project.lock_layer?.projections?.world_rules);
  const setups = list(appState.project.lock_layer?.projections?.setup_payoffs);

  const tabBar = `
    <div class="tab-bar">
      ${LOCKS_TABS.map((tab) => `
        <button class="tab-button ${tab.id === activeTab ? "is-active" : ""}" type="button" data-action="locks-tab" data-id="${tab.id}">${tab.label}</button>
      `).join("")}
    </div>
  `;

  let tabContent = "";
  if (activeTab === "timeline") {
    tabContent = `
      <div class="lock-workbench__lead summary-card">
        <p class="section-label">已锁定剧情卡</p>
        <div class="tag-row">
          ${lockedCards.length === 0 ? `<p class="scene-summary-hint">在「剧情开发」中将剧情卡状态设为「锁定」后将在此显示</p>` : lockedCards.map((card) => `<span class="tag">${escapeHtml(card.title)}</span>`).join("")}
        </div>
      </div>
      <div class="summary-card">
        <div class="list-card__head">
          <h3>时间线</h3>
          <button class="button button--ghost button--tiny" type="button" data-action="add-timeline">新增节点</button>
        </div>
        <div class="stack">
          ${timeline.map((item) => `
            <button class="list-select ${item.id === appState.selection.timelineId ? "is-active" : ""}" type="button" data-action="select-timeline" data-id="${escapeHtml(item.id)}">
              <strong>第 ${escapeHtml(item.story_day)} 天 · ${escapeHtml(item.summary || "未命名节点")}</strong>
              <span>${escapeHtml(item.location || "未定地点")}</span>
            </button>
          `).join("")}
        </div>
        ${getTimelineEvent() ? `
          <div class="form-grid form-grid--compact">
            ${field("故事日", `<input type="number" data-action="timeline-field" data-field="story_day" value="${escapeHtml(getTimelineEvent().story_day)}" />`)}
            ${inputField("事件摘要", "timeline-field", "summary", getTimelineEvent().summary, { full: true })}
            ${inputField("地点", "timeline-field", "location", getTimelineEvent().location)}
            ${inputField("触发", "timeline-field", "trigger", getTimelineEvent().trigger)}
            ${textareaField("结果", "timeline-field", "consequence", getTimelineEvent().consequence, { rows: 3 })}
          </div>
        ` : ""}
      </div>
    `;
  } else if (activeTab === "rules") {
    tabContent = `
      <div class="summary-card">
        <div class="list-card__head">
          <h3>世界规则</h3>
          <button class="button button--ghost button--tiny" type="button" data-action="add-world-rule">新增规则</button>
        </div>
        <div class="stack">
          ${rules.map((item) => `
            <button class="list-select ${item.id === appState.selection.worldRuleId ? "is-active" : ""}" type="button" data-action="select-world-rule" data-id="${escapeHtml(item.id)}">
              <strong>${escapeHtml(item.rule_statement || "未命名规则")}</strong>
              <span>${escapeHtml(item.scope || "未定范围")}</span>
            </button>
          `).join("")}
        </div>
        ${getWorldRule() ? `
          <div class="form-grid form-grid--compact">
            ${textareaField("规则本体", "world-rule-field", "rule_statement", getWorldRule().rule_statement, { rows: 3 })}
            ${inputField("作用范围", "world-rule-field", "scope", getWorldRule().scope)}
            ${selectField("强度", "world-rule-field", "rule_level", getWorldRule().rule_level, [["hard", "硬规则"], ["soft", "软规则"]])}
            ${textareaField("例外", "world-rule-field", "exceptions_text", list(getWorldRule().exceptions).join("、"), { rows: 2 })}
          </div>
        ` : ""}
      </div>
    `;
  } else if (activeTab === "setups") {
    tabContent = `
      <div class="summary-card">
        <div class="list-card__head">
          <h3>伏笔追踪</h3>
          <button class="button button--ghost button--tiny" type="button" data-action="add-setup">新增伏笔</button>
        </div>
        <div class="stack">
          ${setups.map((item) => `
            <button class="list-select ${item.id === appState.selection.setupId ? "is-active" : ""}" type="button" data-action="select-setup" data-id="${escapeHtml(item.id)}">
              <strong>${escapeHtml(item.setup_summary || "未命名伏笔")}</strong>
              <span>${escapeHtml(setupStatusLabels[item.status] ?? item.status)}</span>
            </button>
          `).join("")}
        </div>
        ${getSetup() ? `
          <div class="form-grid form-grid--compact">
            ${textareaField("埋设内容", "setup-field", "setup_summary", getSetup().setup_summary, { rows: 3 })}
            ${inputField("预期回收窗口", "setup-field", "expected_payoff_window", getSetup().expected_payoff_window)}
            ${selectField("状态", "setup-field", "status", getSetup().status, Object.entries(setupStatusLabels))}
            ${textareaField("回收说明", "setup-field", "payoff_summary", getSetup().payoff_summary, { rows: 3 })}
          </div>
        ` : ""}
      </div>
    `;
  } else if (activeTab === "genres") {
    tabContent = renderGenresTab(appState);
  } else if (activeTab === "kb") {
    tabContent = `
      <div class="summary-card">
        <div class="list-card__head">
          <h3>外部知识源</h3>
        </div>
        <p class="scene-summary-hint">
          这里将接入可插拔的外部知识库（如 storykb 等编剧知识库），用作创作时的参考资料。
          搜索 / 浏览 / 一键导入到本地条目的能力将在下一阶段交付。
        </p>
      </div>
    `;
  }

  const allEmpty = lockedCards.length === 0 && timeline.length === 0 && rules.length === 0 && setups.length === 0;
  const zeroGuide = allEmpty ? `
    <p class="scene-summary-hint" style="margin: 6px 2px 12px">
      资料库汇集本作品的时间节点、世界规则、伏笔、类型约束，以及未来对接的外部知识源。
      左侧的「已锁定剧情卡」来自「剧情开发」页面，可作为参考；勾选页签开始填写或导入资料。
    </p>
  ` : "";

  dom.locksContent.innerHTML = `
    <section class="lock-workbench">
      <div class="bible-overview-grid">
        <article class="metric-card"><span class="metric-card__label">已锁定剧情</span><strong class="metric-card__value ${lockedCards.length === 0 ? "metric-card__value--zero" : ""}">${lockedCards.length}</strong></article>
        <article class="metric-card"><span class="metric-card__label">时间节点</span><strong class="metric-card__value ${timeline.length === 0 ? "metric-card__value--zero" : ""}">${timeline.length}</strong></article>
        <article class="metric-card"><span class="metric-card__label">世界规则</span><strong class="metric-card__value ${rules.length === 0 ? "metric-card__value--zero" : ""}">${rules.length}</strong></article>
        <article class="metric-card"><span class="metric-card__label">伏笔</span><strong class="metric-card__value ${setups.length === 0 ? "metric-card__value--zero" : ""}">${setups.length}</strong></article>
      </div>
      ${zeroGuide}
      ${tabBar}
      ${tabContent}
    </section>
  `;
}
