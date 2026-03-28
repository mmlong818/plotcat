import { escapeHtml } from "../utils.js";

// ── Step definitions ──────────────────────────────────────────────────────────

const CREATION_STEPS = [
  { id: 1, label: "概念" },
  { id: 2, label: "提要" },
  { id: 3, label: "角色" },
  { id: 4, label: "结构" },
  { id: 5, label: "场景纲要" }
];

const GENRE_CHIPS = ["悬疑", "爱情", "家庭", "古装", "都市", "犯罪", "喜剧", "惊悚", "奇幻", "科幻"];

const ENDING_CHIPS = ["开放", "救赎", "悲剧", "覆灭"];

const MOOD_CHIPS = ["压抑", "温情", "燃", "黑色幽默", "史诗", "轻松", "沉重", "荒诞"];

const BEAT_FRAMEWORKS = [
  ["save_the_cat", "救猫咪"],
  ["heros_journey", "英雄旅程"],
  ["cn_24_ep", "国产24集"]
];

// ── Stepper nav ───────────────────────────────────────────────────────────────

function renderStepper(creation) {
  return `
    <div class="creation-stepper">
      ${CREATION_STEPS.map((step) => {
        const isDone = step.id < creation.currentStep;
        const isCurrent = step.id === creation.currentStep;
        const isClickable = isDone;
        return `
          <button
            class="creation-step-btn ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}"
            type="button"
            ${isClickable ? `data-action="goto-creation-step" data-step="${step.id}"` : ""}
            ${!isClickable && !isCurrent ? "disabled" : ""}
          >
            <span class="creation-step-dot">${isDone ? "✓" : step.id}</span>
            <span>${escapeHtml(step.label)}</span>
          </button>
        `;
      }).join('<span class="creation-step-sep">→</span>')}
    </div>
  `;
}

// ── Step 1: 概念生成 ──────────────────────────────────────────────────────────

function renderStep1(creation) {
  const choices = creation.loglineChoices ?? [];
  const selectedIdx = creation.selectedLoglineIdx ?? -1;
  const isLoading = creation.loadingStep === 1;

  return `
    <div class="creation-section">
      <h2 class="creation-section-title">Step 1：概念生成</h2>

      <div class="creation-form-group">
        <label class="creation-label">类型方向</label>
        <div class="chip-wrap">
          ${GENRE_CHIPS.map((g) => `
            <button class="ref-chip ${creation.genre === g ? "is-active" : ""}"
              type="button" data-action="creation-set-genre" data-value="${escapeHtml(g)}">
              ${escapeHtml(g)}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="creation-form-group">
        <label class="creation-label">风格关键词</label>
        <input class="creation-input" type="text" placeholder="例：底层视角、高压职场…"
          data-action="creation-set-style-keywords"
          value="${escapeHtml(creation.styleKeywords ?? "")}" />
      </div>

      <div class="creation-form-group">
        <label class="creation-label">禁忌元素（可选）</label>
        <input class="creation-input" type="text" placeholder="例：不要穿越、不要车祸失忆…"
          data-action="creation-set-taboos"
          value="${escapeHtml(creation.taboos ?? "")}" />
      </div>

      <button class="button button--primary creation-ai-btn ${isLoading ? "is-loading" : ""}"
        type="button"
        data-action="ai-generate-logline"
        ${isLoading ? "disabled" : ""}>
        ${isLoading ? renderLoadingDots("AI 思考中") : "AI 生成 Logline"}
      </button>

      ${creation.aiError ? `<p class="creation-error">${escapeHtml(creation.aiError)}</p>` : ""}

      ${choices.length > 0 ? `
        <div class="creation-choices">
          <p class="creation-label">选择一个方向继续：</p>
          <div class="creation-choice-grid">
            ${choices.map((choice, idx) => {
              const isSelected = selectedIdx === idx;
              const isDimmed = selectedIdx >= 0 && !isSelected;
              return `
                <div class="ai-choice-card ${isSelected ? "is-selected" : ""} ${isDimmed ? "is-dimmed" : ""}">
                  ${isSelected ? '<span class="ai-choice-check">✓</span>' : ""}
                  <h3 class="ai-choice-title">${escapeHtml(choice.title ?? "方案 " + (idx + 1))}</h3>
                  <p class="ai-choice-hook">${escapeHtml(choice.hook ?? "")}</p>
                  <p class="ai-choice-conflict"><strong>核心冲突：</strong>${escapeHtml(choice.core_conflict ?? "")}</p>
                  <button class="button ${isSelected ? "button--ghost" : "button--primary"} button--small creation-choose-btn"
                    type="button"
                    data-action="select-ai-choice"
                    data-idx="${idx}">
                    ${isSelected ? "已选择" : "选择这个方案"}
                  </button>
                </div>
              `;
            }).join("")}
          </div>
          ${selectedIdx >= 0 ? `
            <div class="creation-next-row">
              <button class="button button--primary" type="button" data-action="next-creation-step">
                进入 Step 2：故事提要 →
              </button>
            </div>
          ` : ""}
        </div>
      ` : ""}

      ${choices.length > 0 && creation.lastReasoning ? `
        <button class="button button--ghost button--small creation-reasoning-btn"
          type="button" data-action="show-ai-reasoning">
          为什么这么写？
        </button>
      ` : ""}
    </div>
  `;
}

// ── Step 2: 故事提要 ──────────────────────────────────────────────────────────

function renderStep2(creation) {
  const isLoading = creation.loadingStep === 2;
  const isLocked = creation.treatmentLocked;
  const selectedLogline = creation.selectedLogline;

  return `
    <div class="creation-section">
      <h2 class="creation-section-title">Step 2：故事提要（锚点）</h2>

      ${selectedLogline ? `
        <div class="creation-selected-logline">
          <p class="creation-label">已选 Logline</p>
          <div class="creation-logline-display">
            <strong>${escapeHtml(selectedLogline.title ?? "")}</strong>
            <p>${escapeHtml(selectedLogline.hook ?? "")}</p>
            <p><em>核心冲突：${escapeHtml(selectedLogline.core_conflict ?? "")}</em></p>
          </div>
        </div>
      ` : ""}

      <div class="creation-form-group">
        <label class="creation-label">结局倾向</label>
        <div class="chip-wrap">
          ${ENDING_CHIPS.map((e) => `
            <button class="ref-chip ${creation.endingTone === e ? "is-active" : ""}"
              type="button" data-action="creation-set-ending" data-value="${escapeHtml(e)}">
              ${escapeHtml(e)}
            </button>
          `).join("")}
        </div>
      </div>

      <div class="creation-form-group">
        <label class="creation-label">氛围词（可多选）</label>
        <div class="chip-wrap">
          ${MOOD_CHIPS.map((m) => {
            const moodList = creation.moods ?? [];
            const isActive = moodList.includes(m);
            return `
              <button class="ref-chip ${isActive ? "is-active" : ""}"
                type="button" data-action="creation-toggle-mood" data-value="${escapeHtml(m)}">
                ${escapeHtml(m)}
              </button>
            `;
          }).join("")}
        </div>
      </div>

      ${!isLocked ? `
        <button class="button button--primary creation-ai-btn ${isLoading ? "is-loading" : ""}"
          type="button"
          data-action="ai-generate-treatment"
          ${isLoading ? "disabled" : ""}>
          ${isLoading ? renderLoadingDots("AI 展开中") : "AI 展开提要"}
        </button>
      ` : ""}

      ${creation.aiError ? `<p class="creation-error">${escapeHtml(creation.aiError)}</p>` : ""}

      ${creation.treatment ? `
        <div class="creation-form-group">
          ${isLocked ? `
            <div class="anchor-locked">
              <p class="creation-lock-notice">已锁定：这是你故事的核心，后续所有生成基于此</p>
              <div class="creation-treatment-locked">${escapeHtml(creation.treatment)}</div>
              <button class="button button--ghost button--small" type="button" data-action="unlock-treatment">
                解锁并重新编辑
              </button>
            </div>
          ` : `
            <label class="creation-label">提要内容（可编辑）</label>
            <textarea class="creation-textarea" rows="8"
              data-action="creation-set-treatment">${escapeHtml(creation.treatment)}</textarea>
            <div class="creation-next-row">
              <button class="button button--primary" type="button" data-action="lock-treatment">
                锁定为锚点
              </button>
            </div>
          `}
        </div>
      ` : ""}

      ${isLocked ? `
        <div class="creation-next-row">
          <button class="button button--primary" type="button" data-action="next-creation-step">
            进入 Step 3：人物设计 →
          </button>
        </div>
      ` : ""}

      ${creation.lastReasoning ? `
        <button class="button button--ghost button--small creation-reasoning-btn"
          type="button" data-action="show-ai-reasoning">
          为什么这么写？
        </button>
      ` : ""}
    </div>
  `;
}

// ── Step 3: 人物设计 ──────────────────────────────────────────────────────────

function renderStep3(creation) {
  const isLoading = creation.loadingStep === 3;
  const characterDrafts = creation.characterDrafts ?? [];
  const characters = creation.characters ?? [];

  return `
    <div class="creation-section">
      <h2 class="creation-section-title">Step 3：人物设计</h2>

      <div class="creation-form-group">
        <label class="creation-label">人物数量</label>
        <div class="chip-wrap">
          ${[2, 3, 4, 5].map((n) => `
            <button class="ref-chip ${(creation.characterCount ?? 3) === n ? "is-active" : ""}"
              type="button" data-action="creation-set-char-count" data-value="${n}">
              ${n} 人
            </button>
          `).join("")}
        </div>
      </div>

      <button class="button button--primary creation-ai-btn ${isLoading ? "is-loading" : ""}"
        type="button"
        data-action="ai-generate-characters"
        ${isLoading ? "disabled" : ""}>
        ${isLoading ? renderLoadingDots("AI 设计中") : "AI 生成人物卡"}
      </button>

      ${creation.aiError ? `<p class="creation-error">${escapeHtml(creation.aiError)}</p>` : ""}

      ${characterDrafts.length > 0 ? `
        <div class="creation-char-list">
          ${characterDrafts.map((char, idx) => {
            const status = char._status ?? "pending";
            return `
              <div class="creation-char-card ${status === "accepted" ? "is-accepted" : ""} ${status === "discarded" ? "is-discarded" : ""}">
                <div class="creation-char-header">
                  <h3>${escapeHtml(char.name ?? "人物 " + (idx + 1))}</h3>
                  <span class="creation-char-role">${escapeHtml(char.role ?? "")}</span>
                </div>
                <div class="creation-char-traits">
                  <div class="creation-char-trait"><span class="creation-trait-label">欲望</span><span>${escapeHtml(char.desire ?? "")}</span></div>
                  <div class="creation-char-trait"><span class="creation-trait-label">恐惧</span><span>${escapeHtml(char.fear ?? "")}</span></div>
                  <div class="creation-char-trait"><span class="creation-trait-label">创伤</span><span>${escapeHtml(char.wound ?? "")}</span></div>
                  <div class="creation-char-trait"><span class="creation-trait-label">弧光</span><span>${escapeHtml(char.arc ?? "")}</span></div>
                </div>
                ${status === "pending" ? `
                  <div class="creation-char-actions">
                    <button class="button button--primary button--small" type="button"
                      data-action="accept-character" data-idx="${idx}">接受</button>
                    <button class="button button--ghost button--small" type="button"
                      data-action="modify-character" data-idx="${idx}">修改</button>
                    <button class="button button--ghost button--small creation-discard-btn" type="button"
                      data-action="discard-character" data-idx="${idx}">放弃这个人物</button>
                  </div>
                ` : `
                  <p class="creation-char-status">${status === "accepted" ? "✓ 已接受" : "✕ 已放弃"}</p>
                `}
              </div>
            `;
          }).join("")}
        </div>
        ${characterDrafts.some((c) => c._status === "accepted") ? `
          <div class="creation-next-row">
            <button class="button button--primary" type="button" data-action="next-creation-step">
              进入 Step 4：结构节拍 →
            </button>
          </div>
        ` : ""}
      ` : ""}

      ${creation.lastReasoning ? `
        <button class="button button--ghost button--small creation-reasoning-btn"
          type="button" data-action="show-ai-reasoning">
          为什么这么写？
        </button>
      ` : ""}
    </div>
  `;
}

// ── Step 4: 结构节拍 ──────────────────────────────────────────────────────────

function renderStep4(creation) {
  const isLoading = creation.loadingStep === 4;
  const beatSheet = creation.beatSheet ?? [];

  return `
    <div class="creation-section">
      <h2 class="creation-section-title">Step 4：结构节拍</h2>

      <div class="creation-form-group">
        <label class="creation-label">节拍框架</label>
        <div class="chip-wrap">
          ${BEAT_FRAMEWORKS.map(([value, label]) => `
            <button class="ref-chip ${(creation.beatFramework ?? "save_the_cat") === value ? "is-active" : ""}"
              type="button" data-action="creation-set-beat-framework" data-value="${escapeHtml(value)}">
              ${escapeHtml(label)}
            </button>
          `).join("")}
        </div>
      </div>

      <button class="button button--primary creation-ai-btn ${isLoading ? "is-loading" : ""}"
        type="button"
        data-action="ai-generate-beat-sheet"
        ${isLoading ? "disabled" : ""}>
        ${isLoading ? renderLoadingDots("AI 生成中") : "AI 生成节拍表"}
      </button>

      ${creation.aiError ? `<p class="creation-error">${escapeHtml(creation.aiError)}</p>` : ""}

      ${beatSheet.length > 0 ? `
        <div class="creation-beat-list">
          ${beatSheet.map((beat, idx) => `
            <div class="creation-beat-item">
              <div class="creation-beat-index">${idx + 1}</div>
              <div class="creation-beat-body">
                <strong class="creation-beat-name">${escapeHtml(beat.name ?? "")}</strong>
                <p class="creation-beat-desc">${escapeHtml(beat.description ?? "")}</p>
              </div>
            </div>
          `).join("")}
        </div>
        <div class="creation-next-row">
          <button class="button button--primary" type="button" data-action="next-creation-step">
            全部接受并进入场景 →
          </button>
        </div>
      ` : ""}

      ${creation.lastReasoning ? `
        <button class="button button--ghost button--small creation-reasoning-btn"
          type="button" data-action="show-ai-reasoning">
          为什么这么写？
        </button>
      ` : ""}
    </div>
  `;
}

// ── Step 5: 场景纲要 ──────────────────────────────────────────────────────────

function renderStep5(creation) {
  const sceneCards = creation.sceneCards ?? [];

  const acts = ["第一幕", "第二幕", "第三幕"];

  return `
    <div class="creation-section">
      <h2 class="creation-section-title">Step 5：场景纲要</h2>

      ${acts.map((actLabel, actIdx) => {
        const actCards = sceneCards.filter((c) => c.act === actIdx);
        return `
          <div class="creation-act-section">
            <h3 class="creation-act-label">${escapeHtml(actLabel)}</h3>
            <div class="creation-scene-grid">
              ${actCards.map((card, cardIdx) => {
                const isLoading = creation.loadingSceneIdx === card.id;
                if (card.generated) {
                  return `
                    <div class="creation-scene-card is-generated">
                      <p class="creation-scene-location">${escapeHtml(card.location ?? "")}</p>
                      <p class="creation-scene-goal"><strong>目标：</strong>${escapeHtml(card.goal ?? "")}</p>
                      <p class="creation-scene-conflict"><strong>冲突：</strong>${escapeHtml(card.conflict ?? "")}</p>
                      <p class="creation-scene-twist"><strong>转折：</strong>${escapeHtml(card.twist ?? "")}</p>
                      <p class="creation-scene-info"><strong>信息增量：</strong>${escapeHtml(card.info_delta ?? "")}</p>
                    </div>
                  `;
                }
                return `
                  <div class="creation-scene-card">
                    <p class="creation-scene-placeholder">场景 ${actIdx + 1}-${cardIdx + 1}</p>
                    <button class="button button--primary button--small ${isLoading ? "is-loading" : ""}"
                      type="button"
                      data-action="ai-generate-scene"
                      data-scene-id="${escapeHtml(String(card.id))}"
                      ${isLoading ? "disabled" : ""}>
                      ${isLoading ? renderLoadingDots("生成中") : "AI 生成场景"}
                    </button>
                  </div>
                `;
              }).join("")}
              <div class="creation-scene-card creation-scene-add">
                <button class="button button--ghost button--small" type="button"
                  data-action="add-scene-card" data-act="${actIdx}">
                  + 添加场景
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("")}

      ${creation.lastReasoning ? `
        <button class="button button--ghost button--small creation-reasoning-btn"
          type="button" data-action="show-ai-reasoning">
          为什么这么写？
        </button>
      ` : ""}
    </div>
  `;
}

// ── Loading dots ──────────────────────────────────────────────────────────────

function renderLoadingDots(prefix = "") {
  return `${escapeHtml(prefix)}<span class="ai-loading"><span></span><span></span><span></span></span>`;
}

// ── Reasoning panel ───────────────────────────────────────────────────────────

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

// ── Main render entry ─────────────────────────────────────────────────────────

export function renderCreationFlowPage(dom, appState) {
  const creation = appState.creation;
  const step = creation.currentStep ?? 1;

  let stepContent = "";
  if (step === 1) stepContent = renderStep1(creation);
  else if (step === 2) stepContent = renderStep2(creation);
  else if (step === 3) stepContent = renderStep3(creation);
  else if (step === 4) stepContent = renderStep4(creation);
  else if (step === 5) stepContent = renderStep5(creation);

  dom.creationContent.innerHTML = `
    <div class="creation-flow">
      ${renderStepper(creation)}
      <div class="creation-main">
        ${stepContent}
      </div>
      ${renderReasoningPanel(creation)}
    </div>
  `;
}
