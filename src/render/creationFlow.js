import { escapeHtml } from "../utils.js";
import { GENRE_LIBRARY } from "../data/genreLibrary.js";
import { resolveGenreBlend } from "../shared/genreContract.js";

// 「新建项目」准备阶段 5 步（与项目编辑阶段的 6 步 workflow 区分开 — 这是设置阶段不是正式创作）
const CREATION_STEPS = [
  { id: 1, label: "故事核心" },
  { id: 2, label: "结构" },
  { id: 3, label: "人物" },
  { id: 4, label: "情节大纲" },
  { id: 5, label: "审核 · 完成" }
];


const ROLE_GROUPS = [
  { key: "protagonist",   label: "主角" },
  { key: "antagonist",    label: "对手" },
  { key: "ally",          label: "盟友" },
  { key: "opponent_ally", label: "复杂盟友" },
  { key: "supporting",    label: "配角" },
];

const FORMAT_OPTIONS = [
  ["feature",     "电影长片"],
  ["pilot",       "试播集"],
  ["series",      "连续剧季"],
  ["short",       "短片"],
  ["micro_drama", "微短剧"]
];

const TEMPLATE_RECS = {
  feature:     { template: "three_act", reason: "好莱坞行业标准 — 建置 / 对抗 / 解决，最普适的故事结构" },
  pilot:       { template: "three_act", reason: "三幕剧适配试播集 — 第一幕立人物，第二幕推升级，第三幕留续看钩子" },
  series:      { template: "three_act", reason: "三幕剧适配单集叙事节奏，剧情清晰" },
  short:       { template: "three_act", reason: "三幕剧浓缩版，适合短片的紧凑节奏" },
  micro_drama: { template: "three_act", reason: "三幕剧浓缩版，每幕留强钩子" }
};

const TEMPLATE_LABELS = {
  three_act:          "三幕（好莱坞标准）",
  four_act:           "四幕（电视试播常用）",
  feature_film:       "五幕长片（救猫咪节拍）",
  pilot_episode:      "试播集模板",
  series_season:      "连续剧季",
  short_form:         "短片模板",
  micro_drama_serial: "微短剧模板",
  custom:             "自定义"
};

const FORMAT_TEMPLATES = {
  feature:     ["three_act", "four_act", "feature_film"],
  pilot:       ["four_act", "three_act", "pilot_episode"],
  series:      ["four_act", "three_act", "series_season"],
  short:       ["three_act", "short_form"],
  micro_drama: ["three_act", "micro_drama_serial"]
};

// ── Timeline Stepper ──────────────────────────────────────────────────────

function renderStepper(creation) {
  const cur = creation.currentStep ?? 1;
  const items = CREATION_STEPS.map((step, i) => {
    const isDone = step.id < cur;
    const isCurrent = step.id === cur;
    const cls = isDone ? "is-done" : isCurrent ? "is-current" : "";
    const inner = isDone
      ? `<button class="cf-tl-dot" type="button" data-action="goto-creation-step" data-step="${step.id}">✓</button>`
      : `<div class="cf-tl-dot">${step.id}</div>`;
    const sep = i < CREATION_STEPS.length - 1
      ? `<div class="cf-tl-sep ${isDone ? "is-done" : ""}"></div>` : "";
    return `
      <div class="cf-tl-node ${cls}">${inner}<span class="cf-tl-label">${escapeHtml(step.label)}</span></div>${sep}`;
  });
  return `
    <nav class="cf-timeline" aria-label="新建项目进度">
      <div class="cf-tl-meta">
        <span class="cf-tl-meta__label">新建项目 · 准备阶段</span>
        <span class="cf-tl-meta__progress">第 ${cur} 步 / 共 ${CREATION_STEPS.length} 步</span>
      </div>
      <div class="cf-tl-inner">${items.join("")}</div>
    </nav>`;
}

// ── Loading ───────────────────────────────────────────────────────────────

const STEP_LOADING_LABELS = {
  2: "AI 推荐结构中…",
  3: "AI 生成角色…",
  4: "AI 生成本幕节点…"
};

function loadingDots(prefix = "") {
  return `${escapeHtml(prefix)}<span class="ai-loading"><span></span><span></span><span></span></span>`;
}

function renderAiLoadingOverlay(creation) {
  const step = creation.loadingStep;
  if (step < 0) return "";
  const label = STEP_LOADING_LABELS[step] ?? "AI 生成中…";
  const preview = creation.streamPreview ?? "";
  const tail = preview.length > 200 ? "…" + preview.slice(-200) : preview;
  return `
    <div class="cf-ai-overlay">
      <div class="cf-ai-overlay-inner">
        <div class="cf-ai-spinner">
          <span></span><span></span><span></span><span></span>
        </div>
        <p class="cf-ai-overlay-label">${escapeHtml(label)}</p>
        ${tail ? `<pre class="cf-ai-overlay-stream">${escapeHtml(tail)}</pre>` : ""}
        <button class="button button--ghost button--small cf-ai-cancel-btn" type="button" data-action="cancel-cf-ai">取消生成</button>
      </div>
    </div>`;
}

function renderStreamPreview(creation) {
  const text = creation.streamPreview ?? "";
  if (!text) return "";
  const preview = text.length > 300 ? "…" + text.slice(-300) : text;
  return `<div class="cf-stream-preview"><pre class="cf-stream-text">${escapeHtml(preview)}</pre></div>`;
}

// ── Reasoning panel ───────────────────────────────────────────────────────

function renderReasoningPanel(creation) {
  if (!creation.reasoningPanelOpen || !creation.lastReasoning) return "";
  return `
    <div class="reasoning-panel">
      <div class="reasoning-panel__header">
        <h3>AI 创作思路</h3>
        <button class="button button--ghost button--small" type="button" data-action="close-reasoning-panel">✕</button>
      </div>
      <div class="reasoning-panel__body">
        <p>${escapeHtml(creation.lastReasoning)}</p>
      </div>
    </div>
  `;
}

// ── Step 1: 故事核心 ──────────────────────────────────────────────────────

function renderStep1(creation) {
  const fmt         = creation.draft?.format ?? "feature";
  const title       = creation.draft?.title ?? "";
  const logline     = creation.draft?.logline ?? "";
  const protagonist = creation.draft?.protagonist ?? "";
  const canProceed  = logline.trim().length >= 10;
  const isLoadingConcept = creation.loadingStep === 1;
  const conceptChoices   = creation.conceptChoices ?? [];
  const stream           = creation.streamPreview ?? "";

  return `
    <div class="cf-section">
      <div class="cf-deco-header">
        <h2 class="cf-deco-title">
          <span class="cf-deco-line"></span>
          <span class="cf-deco-text">故事核心</span>
          <span class="cf-deco-line"></span>
        </h2>
        <p class="cf-step-sub">先告诉 AI 你想讲什么故事，接下来的 5 步会一气呵成产出结构 / 人物 / 情节 / 场景的全套内容 — 所有内容随后都可自由修改。</p>
      </div>

      <div class="cf-form-stack">
        <div class="cf-field">
          <label class="cf-label">这是什么类型的作品？ <span class="cf-label-opt">（决定篇幅与节奏）</span></label>
          <select class="cf-input" data-action="cf-set-draft-field" data-field="format">
            ${FORMAT_OPTIONS.map(([val, label]) =>
              `<option value="${val}" ${fmt === val ? "selected" : ""}>${escapeHtml(label)}${val === "feature" ? "（最常用）" : ""}</option>`
            ).join("")}
          </select>
        </div>

        <div class="cf-field">
          <label class="cf-label">题材类型 <span class="cf-label-opt">（第一个选中的是主导类型，再选最多 2 个做调味——主导给骨架，调味给肌理）</span></label>
          <div class="cf-genre-cards">
            ${GENRE_LIBRARY.filter((g) => g.kind !== "format").map((g) => {
              const selected = (creation.genres ?? []).includes(g.label);
              const idx = (creation.genres ?? []).indexOf(g.label);
              const badge = idx === 0 ? "主导" : idx > 0 ? "调味" : "";
              return `
                <button class="cf-genre-card ${selected ? "is-active" : ""}" type="button"
                  data-action="cf-toggle-genre" data-id="${escapeHtml(g.label)}"
                  title="${escapeHtml(g.audience_promise)}">
                  <span class="cf-genre-card__name">${escapeHtml(g.label)}</span>
                  ${badge ? `<span class="cf-genre-card__badge">${badge}</span>` : ""}
                </button>
              `;
            }).join("")}
          </div>
          ${(() => {
            const blend = resolveGenreBlend(creation.genres ?? []);
            if (!blend.primary) return `<p class="cf-step-sub" style="margin-top:6px">选定后，该类型的观众承诺 / 必备场景 / 禁忌将作为契约注入后续所有 AI 生成。</p>`;
            return `<p class="cf-step-sub" style="margin-top:6px">📜 ${escapeHtml(blend.primary.audience_promise)}${blend.secondaries.length ? `<br/>调味：${blend.secondaries.map((g) => escapeHtml(g.label)).join("、")}——只加肌理，不抢骨架。` : ""}</p>`;
          })()}
        </div>

        <div class="cf-field cf-field--collapsible">
          <details>
            <summary class="cf-label cf-label--summary">已有故事名？ <span class="cf-label-opt">（不填就让 AI 起）</span></summary>
            <input class="cf-input" type="text" style="margin-top:8px;"
              placeholder="留空让 AI 根据概念建议"
              data-action="cf-set-draft-field" data-field="title"
              value="${escapeHtml(title)}" />
          </details>
        </div>

        <div class="cf-field">
          <div class="cf-label-row">
            <label class="cf-label">一句话概念 <span class="cf-label-req">必填</span></label>
            <button class="cf-ai-btn" type="button"
              data-action="cf-step1-ai-suggest"
              ${isLoadingConcept ? "disabled" : ""}
              title="基于已填的类型和标题，AI 给 3 个方向作参考（不会覆盖你已写的）">
              ${isLoadingConcept ? "AI 正在想（约 20-40 秒）…" : "✨ 看看 AI 的 3 个方向"}
            </button>
          </div>
          <textarea class="cf-textarea" rows="3"
            placeholder="主角是谁、面对什么困境、核心冲突是什么…（至少10字，也可点上方按钮让 AI 起草）"
            data-action="cf-set-draft-field" data-field="logline">${escapeHtml(logline)}</textarea>
        </div>

        ${isLoadingConcept && stream ? `
          <div class="cf-stream-preview">
            <p class="cf-stream-label">AI 流式生成中…</p>
            <pre class="cf-stream-text">${escapeHtml(stream.slice(-400))}</pre>
          </div>
        ` : ""}

        ${conceptChoices.length > 0 ? `
          <div class="cf-concept-choices">
            <p class="cf-choices-title">AI 给你的 ${conceptChoices.length} 个方向 · 选一个填回概念</p>
            <div class="cf-choices-grid">
              ${conceptChoices.map((choice, idx) => {
                const d = choice.data ?? {};
                return `
                  <article class="cf-choice-card">
                    <header class="cf-choice-head">
                      <span class="cf-choice-tag">${escapeHtml(choice.label ?? `方案${idx + 1}`)}</span>
                      <strong class="cf-choice-title">${escapeHtml(d.title ?? "（无标题）")}</strong>
                    </header>
                    <p class="cf-choice-hook">${escapeHtml(d.hook ?? "")}</p>
                    ${d.core_conflict ? `<p class="cf-choice-meta"><b>核心冲突：</b>${escapeHtml(d.core_conflict)}</p>` : ""}
                    ${d.unique_angle ? `<p class="cf-choice-meta"><b>独特视角：</b>${escapeHtml(d.unique_angle)}</p>` : ""}
                    <button class="cf-choice-pick" type="button"
                      data-action="cf-step1-pick-concept" data-idx="${idx}">采用此方向</button>
                  </article>
                `;
              }).join("")}
            </div>
          </div>
        ` : ""}

        <div class="cf-field cf-field--collapsible">
          <details>
            <summary class="cf-label cf-label--summary">主角的身份或特征？ <span class="cf-label-opt">（不填会从概念里推断）</span></summary>
            <input class="cf-input" type="text" style="margin-top:8px;"
              placeholder="如：退役刑警、新晋御史、深空科考站工程师"
              data-action="cf-set-draft-field" data-field="protagonist"
              value="${escapeHtml(protagonist)}" />
          </details>
        </div>
      </div>

      ${creation.aiError ? `<p class="cf-error">${escapeHtml(creation.aiError)}</p>` : ""}

      <div class="cf-actions">
        <button class="cf-deco-btn" type="button"
          data-action="cf-step1-next"
          ${!canProceed ? "disabled" : ""}>
          下一步：选结构 <span class="cf-arrow">→</span>
        </button>
        ${!canProceed && logline.trim().length > 0 ? `<span class="cf-next-hint">把故事再说具体一点 — 主角是谁、面对什么</span>` : ""}
      </div>
    </div>
  `;
}

// ── Step 2: 结构选择 ─────────────────────────────────────────────────────

function renderStep2(creation) {
  const fmt      = creation.draft?.format ?? "feature";
  const rec      = TEMPLATE_RECS[fmt] ?? TEMPLATE_RECS.feature;
  const chosen   = creation.draft?.structure_template ?? rec.template;
  const available = FORMAT_TEMPLATES[fmt] ?? FORMAT_TEMPLATES.feature;

  return `
    <div class="cf-section">
      <div class="cf-deco-header">
        <h2 class="cf-deco-title">
          <span class="cf-deco-line"></span>
          <span class="cf-deco-text">叙事结构</span>
          <span class="cf-deco-line"></span>
        </h2>
      </div>

      <div class="cf-rec-banner">
        <span class="cf-rec-tag">AI 推荐</span>
        <strong>${escapeHtml(TEMPLATE_LABELS[rec.template] ?? rec.template)}</strong>
        <span class="cf-rec-reason"> — ${escapeHtml(rec.reason)}</span>
      </div>

      <div class="cf-field" style="margin-top:20px">
        <label class="cf-label">选择结构模板</label>
        <select class="cf-input" data-action="cf-set-draft-field" data-field="structure_template">
          ${available.map(t =>
            `<option value="${t}" ${chosen === t ? "selected" : ""}>${escapeHtml(TEMPLATE_LABELS[t] ?? t)}</option>`
          ).join("")}
        </select>
      </div>

      ${creation.aiError ? `<p class="cf-error">${escapeHtml(creation.aiError)}</p>` : ""}

      <div class="cf-actions">
        <button class="cf-deco-btn" type="button" data-action="cf-step2-next">
          下一步：生成人物 <span class="cf-arrow">→</span>
        </button>
      </div>
    </div>
  `;
}

// ── Step 3: 人物 ─────────────────────────────────────────────────────────

function renderStep3New(creation) {
  const proposals = creation.characterProposals ?? [];
  const isLoading = creation.loadingStep === 3;
  const hasAnyConfirmed = proposals.some((p) => p._status === "confirmed");

  return `
    <div class="cf-section">
      <div class="cf-deco-header">
        <h2 class="cf-deco-title"><span class="cf-deco-line"></span><span class="cf-deco-text">人物</span><span class="cf-deco-line"></span></h2>
        <p class="cf-step-sub">确认或跳过 AI 提议的人物</p>
      </div>

      <div class="cf-toolbar">
        <button class="cf-ai-btn ${isLoading ? "is-loading" : ""}" type="button"
          data-action="ai-generate-characters-cf"
          ${isLoading ? "disabled" : ""}>
          ${isLoading ? loadingDots("AI 设计中") : proposals.length > 0 ? "↺ 重新生成" : "AI 生成角色"}
        </button>
        <button class="cf-btn-ghost" type="button"
          data-action="cf-add-blank-character"
          ${isLoading ? "disabled" : ""}>
          + 手动新增人物
        </button>
      </div>

      ${creation.aiError ? `
        <div class="cf-error-block">
          <p class="cf-error">${escapeHtml(creation.aiError)}</p>
          <div class="cf-error-actions">
            <button class="cf-btn-ghost" type="button" data-action="cf-use-fallback-characters">
              用默认骨架填入 3 个主角（再手动改）
            </button>
            <button class="cf-btn-ghost" type="button" data-action="cf-step3-next">
              直接跳到情节大纲 →
            </button>
          </div>
        </div>
      ` : ""}
      ${isLoading ? renderStreamPreview(creation) : ""}

      ${proposals.length > 0 ? `
        <div class="cf-char-groups">
          ${ROLE_GROUPS.map(({ key, label }) => {
            const group = proposals
              .map((char, idx) => ({ char, idx }))
              .filter(({ char }) => (char.story_role ?? char.role ?? "supporting") === key);
            if (group.length === 0) return "";
            return `
              <div class="cf-char-group">
                <h4 class="cf-char-group-label">${escapeHtml(label)}</h4>
                <div class="cf-char-list">
                  ${group.map(({ char, idx }) => {
                    const status = char._status ?? "pending";
                    const isEditing = (creation.editingCharIdx ?? -1) === idx;
                    const isRegening = creation.regenCharIdx === idx;
                    return `
                      <div class="cf-char-card ${status === "confirmed" ? "is-confirmed" : ""} ${status === "skipped" ? "is-skipped" : ""} ${isEditing ? "is-editing" : ""}">
                        <div class="cf-char-top">
                          <div class="cf-char-identity">
                            <h3 class="cf-char-name">${escapeHtml(char.name ?? "人物 " + (idx + 1))}</h3>
                            ${char.archetype ? `<span class="cf-char-archetype">${escapeHtml(char.archetype)}</span>` : ""}
                          </div>
                          <div class="cf-char-actions">
                            ${isRegening ? `<span class="cf-char-regen-indicator">${loadingDots("生成中")}</span>` : `
                              <button class="cf-icon-btn" type="button" title="重新生成此角色"
                                data-action="regen-single-character" data-idx="${idx}"
                                ${isLoading ? "disabled" : ""}>↺</button>
                              <button class="cf-icon-btn" type="button" title="${isEditing ? "取消编辑" : "编辑"}"
                                data-action="${isEditing ? "cancel-edit-character" : "edit-character"}" data-idx="${idx}">
                                ${isEditing ? "✕" : "✎"}
                              </button>
                            `}
                            ${!isEditing && !isRegening ? (status === "pending" ? `
                              <button class="cf-choose-btn" type="button" data-action="confirm-character" data-idx="${idx}">确认</button>
                              <button class="cf-discard-btn" type="button" data-action="skip-character" data-idx="${idx}">跳过</button>
                            ` : `<span class="cf-char-status">${status === "confirmed" ? "✓ 已确认" : "— 已跳过"}</span>`) : ""}
                          </div>
                        </div>

                        ${isEditing ? `
                          <div class="cf-char-edit-form">
                            <div class="cf-edit-row">
                              <label class="cf-edit-label">姓名</label>
                              <input class="cf-input cf-edit-input" type="text" data-char-idx="${idx}" data-char-field="name" value="${escapeHtml(char.name ?? "")}" />
                            </div>
                            <div class="cf-edit-row">
                              <label class="cf-edit-label">位置</label>
                              <select class="cf-input cf-edit-input" data-char-idx="${idx}" data-char-field="story_role">
                                ${ROLE_GROUPS.map(r => `<option value="${r.key}" ${(char.story_role ?? "supporting") === r.key ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}
                              </select>
                            </div>
                            <div class="cf-edit-row">
                              <label class="cf-edit-label">欲望</label>
                              <input class="cf-input cf-edit-input" type="text" data-char-idx="${idx}" data-char-field="desire" value="${escapeHtml(char.desire ?? "")}" />
                            </div>
                            <div class="cf-edit-row">
                              <label class="cf-edit-label">创伤</label>
                              <input class="cf-input cf-edit-input" type="text" data-char-idx="${idx}" data-char-field="wound" value="${escapeHtml(char.wound ?? "")}" />
                            </div>
                            <div class="cf-edit-row">
                              <label class="cf-edit-label">弧光起</label>
                              <input class="cf-input cf-edit-input" type="text" data-char-idx="${idx}" data-char-field="arc_start" value="${escapeHtml(char.arc_start ?? "")}" />
                            </div>
                            <div class="cf-edit-row">
                              <label class="cf-edit-label">弧光终</label>
                              <input class="cf-input cf-edit-input" type="text" data-char-idx="${idx}" data-char-field="arc_end" value="${escapeHtml(char.arc_end ?? "")}" />
                            </div>
                            <button class="cf-choose-btn" type="button" data-action="save-character-edit" data-idx="${idx}">保存</button>
                          </div>
                        ` : `
                          <div class="cf-char-traits">
                            <div class="cf-trait"><span class="cf-trait-key">欲望</span><span>${escapeHtml(char.desire ?? "")}</span></div>
                            <div class="cf-trait"><span class="cf-trait-key">创伤</span><span>${escapeHtml(char.wound ?? "")}</span></div>
                            <div class="cf-trait cf-trait--full"><span class="cf-trait-key">弧光</span><span>${escapeHtml(char.arc_start ?? "")} → ${escapeHtml(char.arc_end ?? "")}</span></div>
                          </div>
                        `}
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>`;
          }).join("")}
        </div>

        <div class="cf-actions">
          <button class="cf-deco-btn" type="button"
            data-action="cf-step3-next"
            ${isLoading ? "disabled" : ""}>
            下一步：情节大纲 <span class="cf-arrow">→</span>
          </button>
          ${!hasAnyConfirmed && !isLoading ? `<span class="cf-next-hint">可直接跳过角色步骤</span>` : ""}
        </div>
      ` : `
        <div class="cf-actions">
          <button class="cf-deco-btn" type="button"
            data-action="cf-step3-next"
            ${isLoading ? "disabled" : ""}>
            ${isLoading ? loadingDots("生成中") : "跳过，直接进入情节大纲"} <span class="cf-arrow">→</span>
          </button>
        </div>
      `}

      ${proposals.length > 0 && creation.lastReasoning ? `
        <button class="cf-reasoning-btn" type="button" data-action="show-ai-reasoning">为什么是这些角色？</button>
      ` : ""}
    </div>
  `;
}

// ── Step 4: 节点按幕填充 ─────────────────────────────────────────────────

function renderStep4New(creation) {
  const template   = creation.draft?.structure_template ?? "feature_film";
  const preset     = creation._structurePreset ?? null;
  const actIdx     = creation.currentActIdx ?? 0;
  const actResults = creation.actResults ?? {};
  const isLoading  = creation.loadingStep === 4;

  if (!preset || !preset.acts || preset.acts.length === 0) {
    return `<div class="cf-section"><p class="cf-error">结构数据缺失，请返回第二步重新选择结构。</p></div>`;
  }

  const acts = preset.acts;
  const currentAct = acts[actIdx];
  if (!currentAct) {
    return renderStep5New(creation);
  }

  const actKey   = currentAct.key;
  const actNodes = (preset.nodes ?? []).filter(n => n[1] === actKey);
  const result   = actResults[actKey] ?? null;
  const isLast   = actIdx === acts.length - 1;

  const progressDots = acts.map((a, i) => {
    const done = actResults[a.key];
    const cur  = i === actIdx;
    return `<span class="cf-act-dot ${done ? "is-done" : ""} ${cur ? "is-current" : ""}"></span>`;
  }).join("");

  const nodeList = actNodes.map(n => {
    const [nodeType, , nodeTitle] = n;
    const generated = result?.nodes?.[nodeType];
    return `
      <div class="cf-act-node ${generated ? "is-generated" : ""}">
        <span class="cf-act-node-name">${escapeHtml(nodeTitle)}</span>
        ${generated ? `<p class="cf-act-node-summary">${escapeHtml((generated.summary ?? "").slice(0, 120))}</p>` : `<span class="cf-act-node-pending">待生成</span>`}
      </div>`;
  }).join("");

  return `
    <div class="cf-section">
      <div class="cf-deco-header">
        <p class="cf-eyebrow">${escapeHtml(currentAct.title)}</p>
        <h2 class="cf-deco-title">
          <span class="cf-deco-line"></span>
          <span class="cf-deco-text">情节大纲</span>
          <span class="cf-deco-line"></span>
        </h2>
        <p class="cf-step-sub">${escapeHtml(currentAct.purpose ?? "")}</p>
      </div>

      <div class="cf-act-progress">${progressDots}</div>

      <div class="cf-act-nodes">${nodeList}</div>

      ${creation.aiError ? `<p class="cf-error">${escapeHtml(creation.aiError)}</p>` : ""}

      <div class="cf-actions cf-actions--row">
        ${!result ? `
          <button class="cf-deco-btn" type="button"
            data-action="cf-generate-act"
            data-act-key="${escapeHtml(actKey)}"
            ${isLoading ? "disabled" : ""}>
            ${isLoading ? loadingDots("生成本幕") : "⚡ 生成本幕"}
          </button>
        ` : `
          <button class="cf-btn-ghost" type="button"
            data-action="cf-generate-act"
            data-act-key="${escapeHtml(actKey)}"
            ${isLoading ? "disabled" : ""}>
            ↺ 重新生成
          </button>
          <button class="cf-deco-btn" type="button"
            data-action="${isLast ? "cf-step4-finish" : "cf-advance-act"}">
            ${isLast ? "完成节点，查看总结 →" : "下一幕 →"}
          </button>
        `}
      </div>
    </div>
  `;
}

// ── Step 5: 确认总结 ──────────────────────────────────────────────────────

function renderStep5New(creation) {
  const preset     = creation._structurePreset ?? {};
  const actResults = creation.actResults ?? {};
  const acts       = preset.acts ?? [];

  const actSummaries = acts.map(act => {
    const result = actResults[act.key];
    const nodeCount = (preset.nodes ?? []).filter(n => n[1] === act.key).length;
    const genCount  = result ? Object.keys(result.nodes ?? {}).length : 0;
    return `
      <div class="cf-confirm-act">
        <span class="cf-confirm-act-title">${escapeHtml(act.title)}</span>
        <span class="cf-confirm-act-count">${genCount}/${nodeCount} 节点已生成</span>
      </div>`;
  }).join("");

  return `
    <div class="cf-section">
      <div class="cf-deco-header">
        <h2 class="cf-deco-title">
          <span class="cf-deco-line"></span>
          <span class="cf-deco-text">确认并创建</span>
          <span class="cf-deco-line"></span>
        </h2>
      </div>

      <div class="cf-confirm-acts">${actSummaries}</div>

      ${creation.aiError ? `<p class="cf-error">${escapeHtml(creation.aiError)}</p>` : ""}

      <div class="cf-actions">
        <button class="cf-deco-btn" type="button" data-action="cf-finalize-new">
          完成创建，进入工作台 <span class="cf-arrow">→</span>
        </button>
      </div>
    </div>
  `;
}

// ── Eval Rules Modal ──────────────────────────────────────────────────────

const EVAL_STEP_INFO = {
  concept:       { label: "概念", note: "每轮生成6个，4维度各25分：独特性/冲突清晰度/主角动机/钩子力度" },
  synopsis:      { label: "梗概", note: "每轮生成6个，4维度各25分：三幕结构/角色弧光/戏剧张力/主题深度" },
  characters:    { label: "角色", note: "4维度各25分：欲望需求张力/创伤真实性/弧光完整性/角色间张力" },
  key_scenes:    { label: "剧情点", note: "4维度各25分：场景结构/三幕覆盖/情感升级/转折力度" },
  act_structure: { label: "幕结构", note: "4维度各25分：三幕比例/转折点完整性/节拍分布/主题收束" },
};

const SCORE_GUIDE = "评分参考：50=平庸 / 65=还行 / 75=不错 / 85=很好 / 90+=优秀";

// ── Auto-gen progress panel ───────────────────────────────────────────────

const AUTO_GEN_STEPS = ["概念", "梗概", "角色", "剧情点", "幕结构"];

// ── Main render entry ─────────────────────────────────────────────────────

export function renderCreationFlowPage(dom, appState) {
  const creation = appState.creation;
  if (!creation) return;
  const step = creation.currentStep ?? 1;

  let mainContent = "";
  if (step === 1) mainContent = renderStep1(creation);
  else if (step === 2) mainContent = renderStep2(creation);
  else if (step === 3) mainContent = renderStep3New(creation);
  else if (step === 4) mainContent = renderStep4New(creation);
  else if (step === 5) mainContent = renderStep5New(creation);

  dom.creationContent.innerHTML = `
    <div class="creation-flow">
      <div class="cf-topbar">
        <button class="cf-back-btn" type="button" data-action="go-to-project">← 项目列表</button>
      </div>
      ${renderStepper(creation)}
      <div class="cf-main">
        ${mainContent}
      </div>
      ${renderReasoningPanel(creation)}
      ${renderAiLoadingOverlay(creation)}
    </div>
  `;
}
