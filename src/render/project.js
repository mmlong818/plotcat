import { escapeHtml, list } from "../utils.js";
import { formatLabels, projectStatusLabels, projectCreateStepsCurrent, projectFormatChoices, TONE_OPTIONS } from "../state.js";
import { formatTime } from "../utils.js";

function createDraftToneField(appState, selected) {
  return `
    <div class="field field--full create-field">
      <div class="create-field__head"><label>风格方向</label></div>
      <div class="genre-chip-grid">
        ${TONE_OPTIONS.map((t) => `
          <button class="genre-chip ${selected === t ? "is-active" : ""}"
            type="button" data-action="toggle-draft-tone" data-value="${escapeHtml(t)}">
            ${escapeHtml(t)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

const GENRE_OPTIONS = [
  "剧情", "喜剧", "动作", "爱情", "侦探",
  "冒险", "惊悚", "历史", "恐怖", "科幻", "闹剧", "歌舞片"
];

function createDraftGenreField(appState, selected) {
  const arr = Array.isArray(selected) ? selected : [];
  return `
    <div class="field field--full create-field">
      <div class="create-field__head"><label>类型方向</label></div>
      <div class="genre-chip-grid">
        ${GENRE_OPTIONS.map((g) => `
          <button class="genre-chip ${arr.includes(g) ? "is-active" : ""}"
            type="button" data-action="toggle-draft-genre" data-value="${escapeHtml(g)}">
            ${escapeHtml(g)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderProjectList(dom, appState, { isBrokenPlaceholderText, getStructureOptionsForFormat }) {
  const sortedProjects = [...appState.projectList].sort((left, right) => {
    const leftValue = Date.parse(left.last_opened_at || left.updated_at || 0);
    const rightValue = Date.parse(right.last_opened_at || right.updated_at || 0);
    return rightValue - leftValue;
  });
  const heroProject = sortedProjects[0];
  const recentProjects = sortedProjects.slice(1, 4);
  const oldProjects = sortedProjects.slice(4);
  const renderHeroCard = (item) => {
    if (!item) return "";
    const safeTitle = isBrokenPlaceholderText(item.title) ? "未命名项目" : item.title;
    const safeLogline = /^[A-Z_]+_\d+$/.test(item.logline ?? "") ? "" : (item.logline || "");
    const charCount = item.character_count ?? 0;
    const sceneCount = item.scene_count ?? 0;
    const writtenCount = item.scene_written_count ?? 0;
    const progress = sceneCount > 0 ? Math.round((writtenCount / sceneCount) * 100) : 0;
    // hero 卡（最近打开项目）同样需要重命名/删除入口，否则该项目无法管理（须先打开别的项目挤下 hero 位）。
    // 删除当前项目由 confirm-delete-project 安全处理（置 appState.project=null）。
    const heroMenu = appState.projectDeleteConfirmId === item.id ? `
          <button class="button button--danger button--tiny" type="button" data-action="confirm-delete-project" data-id="${escapeHtml(item.id)}">确认删除</button>
          <button class="button button--ghost button--tiny" type="button" data-action="cancel-delete-project">取消</button>
        ` : appState.projectMenuId === item.id ? `
          <button class="button button--ghost button--tiny" type="button" data-action="rename-project" data-id="${escapeHtml(item.id)}">重命名</button>
          <button class="button button--ghost button--tiny" type="button" data-action="request-delete-project" data-id="${escapeHtml(item.id)}">删除</button>
          <button class="button button--ghost button--tiny" type="button" data-action="close-project-menu" aria-label="收起菜单">×</button>
        ` : `
          <button class="project-card__more" type="button" data-action="open-project-menu" data-id="${escapeHtml(item.id)}" title="更多操作" aria-label="更多操作">⋯</button>
        `;
    return `
      <article class="project-hero" data-action="open-project" data-id="${escapeHtml(item.id)}">
        <div class="project-hero__left">
          <p class="project-hero__eyebrow">最近打开 · ${escapeHtml(formatTime(item.last_opened_at || item.updated_at))}</p>
          <h2 class="project-hero__title">${escapeHtml(safeTitle)}</h2>
          <p class="project-hero__logline">${escapeHtml(safeLogline) || "<span class=\"project-hero__placeholder\">还没写 logline</span>"}</p>
          <div class="project-hero__tags">
            <span class="chip chip--soft">${escapeHtml(formatLabels[item.format] ?? item.format)}</span>
            ${list(item.genre).slice(0,3).map((g) => `<span class="tag">${escapeHtml(g)}</span>`).join("")}
          </div>
        </div>
        <div class="project-hero__right">
          <div class="project-hero__metric"><span class="project-hero__metric-num">${charCount}</span><span class="project-hero__metric-label">人物</span></div>
          <div class="project-hero__metric"><span class="project-hero__metric-num">${writtenCount}/${sceneCount || "—"}</span><span class="project-hero__metric-label">已写/总场景</span></div>
          ${sceneCount > 0 ? `
            <div class="project-hero__progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="project-hero__progress-bar" style="width: ${progress}%"></div>
            </div>
            <span class="project-hero__progress-label">进度 ${progress}%</span>
          ` : ""}
          <button class="button button--primary" type="button" data-action="open-project" data-id="${escapeHtml(item.id)}">继续创作 →</button>
          <div class="project-card__actions" style="justify-content:flex-end">${heroMenu}</div>
        </div>
      </article>
    `;
  };

  const renderProjectCard = (item) => {
    const safeTitle = isBrokenPlaceholderText(item.title) ? "未命名项目" : item.title;
    const confirmingDelete = appState.projectDeleteConfirmId === item.id;
    return `
      <article class="summary-card project-card" data-action="open-project" data-id="${escapeHtml(item.id)}">
        <div class="project-card__top">
          <div>
            <h3>${escapeHtml(safeTitle)}</h3>
            <p>${escapeHtml(formatLabels[item.format] ?? item.format)} · ${escapeHtml(projectStatusLabels[item.status] ?? item.status)}</p>
          </div>
          <div class="project-card__actions">
            <button class="button button--primary button--tiny" type="button" data-action="open-project" data-id="${escapeHtml(item.id)}">
              继续创作
            </button>
            ${confirmingDelete ? `
              <button class="button button--danger button--tiny" type="button" data-action="confirm-delete-project" data-id="${escapeHtml(item.id)}">
                确认删除
              </button>
              <button class="button button--ghost button--tiny" type="button" data-action="cancel-delete-project">
                取消
              </button>
            ` : appState.projectMenuId === item.id ? `
              <button class="button button--ghost button--tiny" type="button" data-action="rename-project" data-id="${escapeHtml(item.id)}">重命名</button>
              <button class="button button--ghost button--tiny" type="button" data-action="request-delete-project" data-id="${escapeHtml(item.id)}">删除</button>
              <button class="button button--ghost button--tiny" type="button" data-action="close-project-menu" aria-label="收起菜单">×</button>
            ` : `
              <button class="project-card__more" type="button" data-action="open-project-menu" data-id="${escapeHtml(item.id)}" title="更多操作" aria-label="更多操作">
                ⋯
              </button>
            `}
          </div>
        </div>
        <p class="project-card__logline ${!item.logline ? "project-card__logline--empty" : ""}">${escapeHtml(/^[A-Z_]+_\d+$/.test(item.logline ?? "") ? "" : (item.logline || "")) || "点击进入，开始定义这个故事的核心。"}</p>
        <div class="tag-row">
          ${list(item.genre).map((genre) => `<span class="tag">${escapeHtml(genre)}</span>`).join("")}
        </div>
        <div class="summary-strip">
          ${(item.character_count ?? 0) > 0 ? `<span class="chip chip--soft">${item.character_count} 人物</span>` : ""}
          ${(item.scene_count ?? 0) > 0 ? `<span class="chip chip--soft">${item.scene_count} 场景</span>` : ""}
          ${(item.version_count ?? 0) > 0 ? `<span class="chip chip--soft">${item.version_count} 版本</span>` : ""}
          <span class="chip chip--muted">打开于 ${escapeHtml(formatTime(item.last_opened_at || item.updated_at))}</span>
        </div>
      </article>
    `;
  };
  const totalProjects = sortedProjects.length;
  const recentLabel = totalProjects === 0
    ? "还没有项目"
    : totalProjects <= 3
      ? `共 ${totalProjects} 个项目`
      : `按最近打开排序 · 共 ${totalProjects} 个项目`;
  dom.projectList.innerHTML = `
    <section class="project-group">
      <div class="project-group__head project-group__head--row">
        <div>
          <h3>${totalProjects === 0 ? "开始你的第一个故事" : "最近项目"}</h3>
          <p>${escapeHtml(recentLabel)}</p>
        </div>
        <button class="button project-create-btn" type="button" data-action="open-create-mode-picker">
          <span class="project-card__plus">+</span>
          <span>新建项目</span>
        </button>
      </div>
      ${heroProject ? renderHeroCard(heroProject) : ""}
      ${recentProjects.length ? `<div class="project-list project-list--wide">${recentProjects.map(renderProjectCard).join("")}</div>` : (!heroProject ? `<p class="project-list__empty">点击右上角「新建项目」开始创作。</p>` : "")}
    </section>
    ${
      oldProjects.length === 0
        ? ""
        : `
          <section class="project-group">
            <div class="project-group__head">
              <h3>其他项目</h3>
              <p>按最后打开时间排列。</p>
            </div>
            <div class="project-list project-list--wide">
              ${oldProjects.map(renderProjectCard).join("")}
            </div>
          </section>
        `
    }
    ${appState.createModePickerOpen ? `
      <div class="mode-picker-backdrop" data-action="close-create-mode-picker">
        <div class="mode-picker-panel" onclick="event.stopPropagation()">
          <button class="mode-picker-close" type="button" data-action="close-create-mode-picker" title="关闭（Esc）" aria-label="关闭">×</button>
          <p class="mode-picker-title">做什么形态的作品？</p>
          <div class="mode-picker-formats">
            ${[["feature", "电影长片", "90-120 分钟 · 三幕结构"], ["series", "连续剧", "season 季播 · 多线引擎"], ["micro_drama", "微短剧", "竖屏 1-3 分钟/集 · 钩子纪律"]].map(([val, label, hint]) => `
              <button class="mode-format-card ${(appState.createModeFormat ?? "feature") === val ? "is-active" : ""}" type="button" data-action="pick-create-format" data-id="${val}">
                <strong>${label}</strong>
                <span>${hint}</span>
              </button>
            `).join("")}
          </div>
          <p class="mode-picker-title" style="margin-top:14px">你手上带着什么开始？</p>
          <div class="mode-picker-cards">
            <button class="mode-card" type="button" data-action="open-quick-creation">
              <div class="mode-card__icon">⚡</div>
              <h3>一句话概念</h3>
              <p>已经有一句 logline。AI 顺着帮你把结构 / 人物 / 情节都铺好。</p>
              <span class="mode-card__tag">→ 快速生成框架</span>
            </button>
            <button class="mode-card mode-card--pro" type="button" data-action="open-pro-creation">
              <div class="mode-card__icon">✦</div>
              <h3>一段画面 / 台词 / 感受</h3>
              <p>还说不清是什么故事。AI 反复追问帮你把这股冲动挖成可写的故事。</p>
              <span class="mode-card__tag">→ AI 反问挖掘</span>
            </button>
            <button class="mode-card" type="button" data-action="open-from-structure">
              <div class="mode-card__icon">▦</div>
              <h3>完整故事要重组</h3>
              <p>故事在脑子里已经成型。直接进结构骨架页，自己摆幕和节点。</p>
              <span class="mode-card__tag">→ 跳过 AI 入口</span>
            </button>
          </div>
        </div>
      </div>
    ` : ""}
  `;
}

function isCreateAssistantBusy(appState, target) {
  return appState.createAssistant.loading && appState.createAssistant.target === target;
}

function createDraftField(appState, label, control, options = {}) {
  const busy = options.aiField ? isCreateAssistantBusy(appState, `field:${options.aiField}`) : false;
  const actionButton = options.aiField
    ? `
      <button
        class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
        type="button"
        data-action="create-ai-field"
        data-field="${escapeHtml(options.aiField)}"
        ${appState.createAssistant.loading ? "disabled" : ""}
      >
        ${busy ? "生成中..." : "AI 重写"}
      </button>
    `
    : "";

  return `
    <div class="field ${options.full ? "field--full" : ""} create-field">
      <div class="create-field__head">
        <label>${escapeHtml(label)}</label>
        ${actionButton}
      </div>
      ${control}
    </div>
  `;
}

function createDraftInputField(appState, label, fieldName, value, options = {}) {
  const type = options.type ?? "text";
  return createDraftField(
    appState,
    label,
    `<input type="${type}" data-action="draft-field" data-field="${fieldName}" value="${escapeHtml(value)}" />`,
    options
  );
}

function createDraftTextareaField(appState, label, fieldName, value, options = {}) {
  return createDraftField(
    appState,
    label,
    `<textarea data-action="draft-field" data-field="${fieldName}" rows="${options.rows ?? 4}">${escapeHtml(value)}</textarea>`,
    { ...options, full: options.full ?? true }
  );
}

function createDraftSelectField(appState, label, fieldName, value, choices, options = {}) {
  const items = choices
    .map(
      ([optionValue, optionLabel]) =>
        `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`
    )
    .join("");
  return createDraftField(
    appState,
    label,
    `<select data-action="draft-field" data-field="${fieldName}">${items}</select>`,
    options
  );
}

function createAssistantStatusTextCurrent(appState) {
  if (appState.ai.provider === "claude") {
    return "当前使用 Claude 订阅，可以直接生成建议。";
  }
  if (appState.ai.configured) {
    const provider = appState.ai.provider === "gemini" ? "Gemini" : "OpenAI";
    return `当前使用 ${provider} · ${appState.ai.model || "默认模型"}，可以直接生成建议。`;
  }
  return "当前未连接模型服务，会先使用本地建议生成草稿。";
}

function createAssistantStepLabelCurrent(stepId) {
  if (stepId === "basics") return "AI 推荐这一步";
  if (stepId === "logline") return "AI 生成 3 组概念";
  if (stepId === "title") return "AI 生成片名";
  return "AI 补全蓝图";
}

function renderCreateAssistantFeedback(appState) {
  const type = appState.createAssistant.error
    ? "error"
    : appState.createAssistant.warning
      ? "warning"
      : appState.createAssistant.message
        ? "info"
        : "";
  const text =
    appState.createAssistant.error ||
    appState.createAssistant.warning ||
    appState.createAssistant.message;
  if (!text) {
    return "";
  }
  return `<div class="create-ai-feedback ${type ? `is-${type}` : ""}">${escapeHtml(text)}</div>`;
}

function renderCreateAssistantToolbarForCreate(appState, step) {
  const target = `step:${step.id}`;
  const busy = isCreateAssistantBusy(appState, target);
  return `
    <div class="create-step-tools">
      <div class="create-step-tools__meta">
        <span class="chip chip--soft">AI 辅助</span>
        <p>${escapeHtml(createAssistantStatusTextCurrent(appState))}</p>
      </div>
      <div class="create-step-tools__actions">
        <button
          class="button button--ghost button--tiny ${busy ? "is-busy" : ""}"
          type="button"
          data-action="create-ai-step"
          data-step="${escapeHtml(step.id)}"
          ${appState.createAssistant.loading ? "disabled" : ""}
        >
          ${busy ? "生成中..." : escapeHtml(createAssistantStepLabelCurrent(step.id))}
        </button>
      </div>
    </div>
    ${renderCreateAssistantFeedback(appState)}
  `;
}

export function renderProjectCreateForm(dom, appState, { getProjectCreateStep, getStructureOptionsForFormat, formatLabels: fmtLabels }) {
  const step = getProjectCreateStep();
  const nextStep = projectCreateStepsCurrent[appState.projectCreateStepIndex + 1];
  const selectedConceptId = appState.createConceptOptions.find(
    (item) => item.logline === appState.projectDraft.logline && item.core_conflict === appState.projectDraft.core_conflict
  )?.id;

  dom.projectCreateEyebrow.textContent = step.eyebrow;
  dom.projectCreateTitle.textContent = step.title;
  dom.projectCreateDescription.textContent = step.description;
  dom.projectCreateProgress.style.width = `${((appState.projectCreateStepIndex + 1) / projectCreateStepsCurrent.length) * 100}%`;
  dom.cancelCreateProjectButton.textContent = "取消";
  dom.prevCreateProjectButton.hidden = appState.projectCreateStepIndex === 0;
  dom.confirmCreateProjectButton.textContent = step.id === "blueprint" ? "创建并进入创作" : `进入${nextStep?.title || "下一步"}`;

  const canAdvance = Boolean(
    step.id === "basics" ? appState.projectDraft.format
    : step.id === "logline" ? appState.projectDraft.logline.trim() && appState.projectDraft.core_conflict.trim()
    : step.id === "title" ? appState.projectDraft.title.trim()
    : appState.projectDraft.title.trim() && appState.projectDraft.logline.trim()
  );
  dom.confirmCreateProjectButton.disabled = !canAdvance || appState.createAssistant.loading;

  const d = appState.projectDraft;

  if (step.id === "basics") {
    dom.projectCreateForm.className = "create-wizard";
    dom.projectCreateForm.innerHTML = `
      ${renderCreateAssistantToolbarForCreate(appState, step)}
      <div class="create-wizard__choices">
        ${projectFormatChoices
          .map(
            (value) => `
              <button
                class="choice-chip choice-chip--panel ${d.format === value ? "is-active" : ""}"
                type="button"
                data-action="draft-choice"
                data-field="format"
                data-value="${escapeHtml(value)}"
              >
                ${escapeHtml(fmtLabels[value] ?? value)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="form-grid">
        ${createDraftGenreField(appState, d.genre)}
        ${createDraftToneField(appState, d.tone)}
        ${createDraftSelectField(
          appState,
          "叙事结构",
          "structure_template",
          d.structure_template,
          getStructureOptionsForFormat(d.format, d.structure_template)
        )}
        ${
          d.structure_template === "custom"
            ? createDraftSelectField(
                appState,
                "自定义幕数",
                "custom_act_count",
                d.custom_act_count,
                [
                  ["1", "1 幕"],
                  ["2", "2 幕"],
                  ["3", "3 幕"],
                  ["4", "4 幕"],
                  ["5", "5 幕"],
                  ["6", "6 幕"]
                ]
              )
            : ""
        }
        ${createDraftInputField(appState, "风格方向", "tone", d.tone, { aiField: "tone" })}
      </div>
    `;
    return;
  }

  if (step.id === "logline") {
    dom.projectCreateForm.className = "create-wizard";
    dom.projectCreateForm.innerHTML = `
      ${renderCreateAssistantToolbarForCreate(appState, step)}
      <div class="create-wizard__stage">
        <section class="summary-card concept-stage">
          <div class="list-card__head">
            <div>
              <h3>概念候选</h3>
              <p class="mini-copy">先选方向，再进入起名。</p>
            </div>
            <button
              class="button button--ghost button--tiny ${isCreateAssistantBusy(appState, "step:logline") ? "is-busy" : ""}"
              type="button"
              data-action="create-ai-step"
              data-step="logline"
              ${appState.createAssistant.loading ? "disabled" : ""}
            >
              ${isCreateAssistantBusy(appState, "step:logline") ? "生成中..." : "重新生成 3 组"}
            </button>
          </div>
          ${
            appState.createConceptOptions.length
              ? `
                <div class="concept-option-grid">
                  ${appState.createConceptOptions
                    .map(
                      (option) => `
                        <article class="concept-option ${option.id === selectedConceptId ? "is-active" : ""}">
                          <div class="concept-option__head">
                            <strong>${escapeHtml(option.label || "候选方案")}</strong>
                            <button
                              class="button button--ghost button--tiny"
                              type="button"
                              data-action="apply-concept-option"
                              data-id="${escapeHtml(option.id)}"
                            >
                              ${option.id === selectedConceptId ? "已采用" : "采用这组"}
                            </button>
                          </div>
                          <div class="concept-option__body">
                            <p><span>一句话概念</span>${escapeHtml(option.logline || "待生成")}</p>
                            <p><span>核心冲突</span>${escapeHtml(option.core_conflict || "待生成")}</p>
                          </div>
                        </article>
                      `
                    )
                    .join("")}
                </div>
              `
              : `
                <div class="empty-state empty-state--compact">
                  <p>先生成 3 组候选，再选一组进入下一步。</p>
                </div>
              `
          }
        </section>
        <section class="summary-card concept-stage">
          <div class="list-card__head">
            <div>
              <h3>当前采用</h3>
              <p class="mini-copy">采用后仍然可以继续微调。</p>
            </div>
          </div>
          <div class="create-wizard__stage">
            ${createDraftTextareaField(appState, "一句话概念", "logline", d.logline, { rows: 4, aiField: "logline" })}
            ${createDraftTextareaField(appState, "核心冲突", "core_conflict", d.core_conflict, { rows: 4, aiField: "core_conflict" })}
          </div>
        </section>
      </div>
    `;
    return;
  }

  if (step.id === "title") {
    dom.projectCreateForm.className = "create-wizard";
    dom.projectCreateForm.innerHTML = `
      ${renderCreateAssistantToolbarForCreate(appState, step)}
      <div class="create-wizard__stage">
        <section class="summary-card concept-stage">
          <div class="list-card__head">
            <div>
              <h3>项目命名</h3>
              <p class="mini-copy">名称应服务于已经选定的概念方向。</p>
            </div>
          </div>
          ${createDraftTextareaField(appState, "项目名称", "title", d.title, { rows: 2, aiField: "title" })}
        </section>
      </div>
    `;
    return;
  }

  dom.projectCreateForm.className = "create-review";
  dom.projectCreateForm.innerHTML = `
    ${renderCreateAssistantToolbarForCreate(appState, step)}
    <section class="summary-card">
      <p class="section-label">基础信息</p>
      <div class="form-grid">
        ${createDraftInputField(appState, "项目名称", "title", d.title, { aiField: "title" })}
        ${createDraftGenreField(appState, d.genre)}
        ${createDraftToneField(appState, d.tone)}
        ${createDraftSelectField(
          appState,
          "叙事结构",
          "structure_template",
          d.structure_template,
          getStructureOptionsForFormat(d.format, d.structure_template)
        )}
        ${
          d.structure_template === "custom"
            ? createDraftSelectField(
                appState,
                "自定义幕数",
                "custom_act_count",
                d.custom_act_count,
                [
                  ["1", "1 幕"],
                  ["2", "2 幕"],
                  ["3", "3 幕"],
                  ["4", "4 幕"],
                  ["5", "5 幕"],
                  ["6", "6 幕"]
                ]
              )
            : ""
        }
        ${createDraftTextareaField(appState, "一句话概念", "logline", d.logline, { rows: 4, aiField: "logline" })}
        ${createDraftTextareaField(appState, "核心冲突", "core_conflict", d.core_conflict, { rows: 4, aiField: "core_conflict" })}
      </div>
    </section>
    <section class="summary-card">
      <p class="section-label">蓝图确认</p>
      <div class="form-grid">
        ${createDraftTextareaField(appState, "主题问题", "theme_question", d.theme_question, { rows: 3, aiField: "theme_question" })}
        ${createDraftTextareaField(appState, "主题陈述", "theme", d.theme, { rows: 3, aiField: "theme" })}
        ${createDraftInputField(appState, "主角", "protagonist", d.protagonist, { aiField: "protagonist" })}
        ${createDraftInputField(appState, "视觉母题", "motif", d.motif, { aiField: "motif" })}
        ${createDraftInputField(appState, "弧光起点", "arc_start", d.arc_start, { aiField: "arc_start" })}
        ${createDraftInputField(appState, "弧光终点", "arc_end", d.arc_end, { aiField: "arc_end" })}
        ${createDraftInputField(appState, "外部目标", "external_goal", d.external_goal, { aiField: "external_goal" })}
        ${createDraftInputField(appState, "内部需要", "internal_need", d.internal_need, { aiField: "internal_need" })}
        ${createDraftTextareaField(appState, "世界起点", "setting", d.setting, { rows: 3, aiField: "setting" })}
        ${createDraftTextareaField(appState, "观众承诺", "audience_promise", d.audience_promise, { rows: 3, aiField: "audience_promise" })}
      </div>
    </section>
  `;
}

export function renderAiSettingsDialog(dom, appState, { providerChoiceLabel, isAiConfigBusy, getCurrentAiModelOptions }) {
  const provider = appState.aiConfigDraft.provider || appState.ai.provider || "openai";
  const modelOptions = getCurrentAiModelOptions(provider);
  const hasStoredConnection = appState.ai.configured && appState.ai.provider === provider;
  const configBusy = isAiConfigBusy();
  const modelBusy = appState.createAssistant.loading && appState.createAssistant.target === "ai-models";
  const supportsModelList = provider === "openai" || provider === "gemini";
  const canFetchModels = supportsModelList && Boolean(appState.aiConfigDraft.apiKey.trim() || hasStoredConnection);
  const canConnect = provider === "claude_cli"
    || Boolean((appState.aiConfigDraft.apiKey.trim() || hasStoredConnection) && appState.aiConfigDraft.model.trim());

  const profiles = appState.llmProfiles ?? [];
  const profilesBlock = profiles.length ? `
    <div class="field field--full" style="margin-bottom: 10px">
      <label>已保存连接（点击切换）</label>
      <div class="tag-row">
        ${profiles.map((p) => `
          <span class="chip ${p.active ? "chip--save chip--save-synced" : "chip--soft"}" style="display:inline-flex;align-items:center;gap:6px">
            <button type="button" data-action="activate-llm-profile" data-id="${escapeHtml(p.id)}"
              style="all:unset;cursor:pointer" title="${escapeHtml(p.provider)}${p.baseUrl ? " · " + escapeHtml(p.baseUrl) : ""}">
              ${p.active ? "● " : ""}${escapeHtml(p.name)}
            </button>
            <button type="button" data-action="delete-llm-profile" data-id="${escapeHtml(p.id)}"
              style="all:unset;cursor:pointer;opacity:.55" title="删除此连接">×</button>
          </span>
        `).join("")}
      </div>
    </div>
  ` : "";

  dom.settingsForm.innerHTML = `
    <div class="create-ai-config create-ai-config--settings">
      ${profilesBlock}
      <div class="create-wizard__choices create-wizard__choices--providers">
        ${["claude_cli", "anthropic", "openai", "gemini", "custom"]
          .map(
            (value) => `
              <button
                class="choice-chip choice-chip--panel ${provider === value ? "is-active" : ""}"
                type="button"
                data-action="ai-provider-choice"
                data-value="${escapeHtml(value)}"
              >
                ${providerChoiceLabel(value)}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="create-ai-feedback">
        ${
          hasStoredConnection
            ? `当前已连接 ${escapeHtml(providerChoiceLabel(provider))} · ${escapeHtml(appState.ai.model || "未选择模型")}`
            : "当前未连接模型服务。先填入 Key，再获取模型列表。"
        }
      </div>
      ${provider === "claude_cli" ? `
        <p class="scene-summary-hint" style="margin: 4px 0 8px">
          使用本机已登录的 claude CLI（订阅计费），无需 API Key。生成质量最高但消耗订阅额度；
          日常批量生成建议切到 API provider（如「兼容端点」+ DeepSeek，成本最低）。
        </p>
      ` : `
      <div class="form-grid form-grid--ai-connect">
        <div class="field field--full">
          <label>${escapeHtml(providerChoiceLabel(provider))} Key</label>
          <input
            type="password"
            data-action="ai-config-field"
            data-field="apiKey"
            value="${escapeHtml(appState.aiConfigDraft.apiKey)}"
            placeholder="${hasStoredConnection ? "已连接时可留空；更换 key 后重新获取模型" : "粘贴你的 API Key"}"
          />
        </div>
        ${provider === "custom" ? `
        <div class="field field--full">
          <label>Base URL（OpenAI 兼容，如 DeepSeek/Kimi/Qwen/Ollama）</label>
          <input
            type="text"
            data-action="ai-config-field"
            data-field="baseUrl"
            value="${escapeHtml(appState.aiConfigDraft.baseUrl || "https://api.deepseek.com/v1")}"
            placeholder="https://api.deepseek.com/v1"
          />
        </div>
        ` : ""}
      </div>
      <div class="form-grid form-grid--ai">
        <div class="field field--full">
          <label>模型</label>
          ${(provider === "openai" || provider === "gemini") ? `
          <select data-action="ai-config-field" data-field="model" ${modelOptions.length ? "" : "disabled"}>
            <option value="">${modelOptions.length ? "选择一个模型" : "先获取模型列表"}</option>
            ${modelOptions
              .map(
                (item) => `
                  <option value="${escapeHtml(item.id)}" ${item.id === appState.aiConfigDraft.model ? "selected" : ""}>
                    ${escapeHtml(item.label || item.id)}
                  </option>
                `
              )
              .join("")}
          </select>
          ` : `
          <input
            type="text"
            data-action="ai-config-field"
            data-field="model"
            value="${escapeHtml(appState.aiConfigDraft.model)}"
            placeholder="${provider === "anthropic" ? "claude-sonnet-4-6" : "deepseek-v4-flash"}"
          />
          `}
        </div>
      </div>
      `}
      <div class="create-ai-config__actions">
        ${supportsModelList ? `
        <button
          class="button button--ghost button--tiny ${modelBusy ? "is-busy" : ""}"
          type="button"
          data-action="fetch-ai-models"
          ${appState.createAssistant.loading || !canFetchModels ? "disabled" : ""}
        >
          ${modelBusy ? "读取中..." : modelOptions.length ? "重新获取模型" : "获取模型列表"}
        </button>
        ` : ""}
        <button
          class="button button--primary button--tiny ${configBusy ? "is-busy" : ""}"
          type="button"
          data-action="save-ai-config"
          ${appState.createAssistant.loading || !canConnect ? "disabled" : ""}
        >
          ${configBusy ? "连接中..." : `连接 ${providerChoiceLabel(provider)}`}
        </button>
        ${
          appState.ai.configured
            ? `<button class="button button--ghost button--tiny" type="button" data-action="disconnect-ai-config" ${appState.createAssistant.loading ? "disabled" : ""}>断开</button>`
            : ""
        }
      </div>
      ${renderCreateAssistantFeedback(appState)}
    </div>
  `;
  if (dom.resetConfirmArea) {
    dom.resetConfirmArea.innerHTML = appState.resetConfirmPending
      ? `<p class="reset-confirm-text">确认重置？此操作不可撤销，将清空当前项目所有数据。</p>
         <div class="reset-confirm-actions">
           <button class="button button--danger button--tiny" data-action="confirm-reset">确认重置</button>
           <button class="button button--ghost button--tiny" data-action="cancel-reset">取消</button>
         </div>`
      : "";
  }
}
