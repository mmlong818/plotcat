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
            ${inputField("名称", `${actionPrefix}-field`, "name", item.name, { dataId: item.id })}
            ${actionPrefix === "convention" ? selectField("状态", `${actionPrefix}-field`, "status", item.status, [["required", "必备"], ["optional", "可选"]], { dataId: item.id }) : ""}
            ${textareaField("说明", `${actionPrefix}-field`, "description", item.description, { rows: 3, dataId: item.id })}
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

function renderKnowledgeTab(appState) {
  const k = appState.knowledge ?? {};
  const sources = k.sources ?? [];
  const sel = sources.find((s) => s.id === k.selectedSourceId) ?? sources[0];

  if (sources.length === 0) {
    return `
      <div class="summary-card">
        <div class="list-card__head"><h3>外部知识源</h3></div>
        <p class="scene-summary-hint">尚未加载知识源列表。<button class="button button--ghost button--tiny" data-action="kb-init">立即加载</button></p>
      </div>
    `;
  }

  const sourceOpts = sources.map((s) => `<option value="${escapeHtml(s.id)}" ${s.id === sel?.id ? "selected" : ""}>${escapeHtml(s.name)}（${s.status?.entryCount ?? 0} 条）</option>`).join("");

  const syncMeta = sel?.status?.lastSyncedAt
    ? `已同步 · ${new Date(sel.status.lastSyncedAt).toLocaleString("zh-CN")}`
    : "尚未同步，点击「同步」拉取数据。";

  const itemsBody = k.loading
    ? `<p class="scene-summary-hint">搜索中…</p>`
    : (k.items.length === 0
      ? `<p class="scene-summary-hint">${k.query ? `「${escapeHtml(k.query)}」无结果` : "输入关键词搜索条目"}</p>`
      : `
        <div class="kb-list">
          ${k.items.map((it) => `
            <button class="kb-list-item ${k.selectedEntry?.external_id === it.external_id ? "is-active" : ""}" type="button" data-action="kb-open-entry" data-id="${escapeHtml(it.external_id)}">
              <strong>${escapeHtml(it.title)}</strong>
              <span class="kb-list-item__subtitle">${escapeHtml(it.subtitle || "")}</span>
              <span class="kb-list-item__tags">${(it.tags || []).map((t) => `<em>${escapeHtml(t)}</em>`).join("")}</span>
            </button>
          `).join("")}
        </div>
        ${k.total > k.items.length ? `<p class="scene-summary-hint">显示前 ${k.items.length} / ${k.total} 条，缩小搜索词以精准定位。</p>` : ""}
      `);

  const detail = k.selectedEntry;
  const detailBody = k.entryLoading
    ? `<p class="scene-summary-hint">加载详情中…</p>`
    : (detail
      ? `
        <article class="kb-detail">
          <header class="kb-detail__head">
            <h3>${escapeHtml(detail.title)}</h3>
            <span class="kb-detail__subtitle">${escapeHtml(detail.subtitle || "")}</span>
            <div class="kb-detail__tags">${(detail.tags || []).map((t) => `<em>${escapeHtml(t)}</em>`).join("")}</div>
            ${detail.aliases?.length ? `<p class="kb-detail__aliases">别名：${escapeHtml(detail.aliases.join("、"))}</p>` : ""}
          </header>
          <div class="kb-detail__body">${detail.body.split("\n").map((line) => {
            if (line.startsWith("## ")) return `<h4>${escapeHtml(line.slice(3))}</h4>`;
            if (!line.trim()) return "";
            return `<p>${escapeHtml(line)}</p>`;
          }).join("")}</div>
          <footer class="kb-detail__foot">
            <p class="section-label">导入到本地（带源引用）</p>
            <div class="inline-actions">
              <button class="button button--ghost button--small" type="button" data-action="kb-import" data-target="world_rule" ${k.importing ? "disabled" : ""}>导入为世界规则</button>
              <button class="button button--ghost button--small" type="button" data-action="kb-import" data-target="setup" ${k.importing ? "disabled" : ""}>导入为伏笔提醒</button>
              <button class="button button--ghost button--small" type="button" data-action="kb-import" data-target="timeline_event" ${k.importing ? "disabled" : ""}>导入为时间线参考</button>
            </div>
            ${detail.related?.length ? `<p class="kb-detail__related">相关：${detail.related.map((r) => escapeHtml(r)).join("、")}</p>` : ""}
          </footer>
        </article>
      `
      : `<p class="scene-summary-hint">在左侧选择一个条目查看详情。</p>`);

  const errorBanner = k.lastError ? `<p class="kb-banner kb-banner--error">⚠ ${escapeHtml(k.lastError)}</p>` : "";
  const importBanner = k.lastImportMessage ? `<p class="kb-banner kb-banner--ok">✓ ${escapeHtml(k.lastImportMessage)}</p>` : "";

  return `
    <section class="kb-tab">
      <header class="kb-tab__head">
        <div class="kb-tab__source">
          <label class="section-label">知识源</label>
          <select class="kb-select" data-action="kb-select-source">${sourceOpts}</select>
          <button class="button button--ghost button--tiny" type="button" data-action="kb-sync" ${k.syncing ? "disabled" : ""}>${k.syncing ? "同步中…" : "同步"}</button>
          ${sel?.homepage ? `<a class="kb-link" href="${escapeHtml(sel.homepage)}" target="_blank" rel="noopener">↗ 源仓库</a>` : ""}
        </div>
        <input class="kb-search-input" type="search" placeholder="搜索条目（中英文标题或别名）" value="${escapeHtml(k.query)}" data-action="kb-search-input" />
      </header>
      <p class="kb-tab__meta">${escapeHtml(sel?.description || "")} · ${escapeHtml(syncMeta)}</p>
      ${errorBanner}
      ${importBanner}
      <div class="kb-tab__body">
        <aside class="kb-tab__list">${itemsBody}</aside>
        <main class="kb-tab__detail">${detailBody}</main>
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
    tabContent = renderKnowledgeTab(appState);
  }

  const allEmpty = lockedCards.length === 0 && timeline.length === 0 && rules.length === 0 && setups.length === 0;
  const zeroGuide = allEmpty ? `
    <p class="scene-summary-hint" style="margin: 6px 2px 12px">
      资料库汇集本作品的时间节点、世界规则、伏笔、类型约束，以及未来对接的外部知识源。
      左侧的「已锁定剧情卡」来自「剧情开发」页面，可作为参考；勾选页签开始填写或导入资料。
    </p>
  ` : "";

  const backToWorkflow = appState.libraryReturnPage === "workflow";
  dom.locksContent.innerHTML = `
    <section class="lock-workbench">
      <div style="margin-bottom: 10px">
        <button class="button button--ghost button--small" type="button" data-action="library-back">
          ← ${backToWorkflow ? "返回创作" : "返回项目中心"}
        </button>
      </div>
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
