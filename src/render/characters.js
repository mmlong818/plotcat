import { escapeHtml, inputField, textareaField, selectField, list, renderEmptyState } from "../utils.js";
import { storyRoleLabels, CHARACTER_TRAITS, CHARACTER_MBTI_TYPES } from "../state.js";

const ROLE_GROUPS = [
  { key: "protagonist", label: "主角" },
  { key: "deuteragonist", label: "次主角" },
  { key: "antagonist",  label: "对手" },
  { key: "ally",        label: "盟友" },
  { key: "opponent_ally", label: "复杂盟友" },
  { key: "supporting",  label: "配角" },
];

const LOCKABLE_FIELDS = [
  "name", "story_role",
  "external_goal", "dramatic_need", "contradiction", "pressure_point", "secret",
  "notes",
  "starting_mask", "arc_start", "arc_end",
  "traits", "mbti", "moral_alignment", "core_drive"
];

function lockBadge(character, fieldKey) {
  const locked = list(character.locked_fields).includes(fieldKey);
  const title = locked ? "已锁定：AI 辅助修正时保持不变（点击解锁）" : "锁定此项：AI 修正时保持不变";
  return `<button type="button" class="field-lock ${locked ? "is-locked" : ""}"
    data-action="toggle-character-field-lock" data-id="${escapeHtml(fieldKey)}"
    title="${title}" aria-label="${title}">${locked ? "🔒" : "🔓"}</button>`;
}

function lockedInputField(character, label, fieldName, value, options = {}) {
  const base = inputField(label, "character-field", fieldName, value, options);
  return base.replace(/<label>([^<]*)<\/label>/, (_, l) => `<label class="field-label-row"><span>${l}</span>${lockBadge(character, fieldName)}</label>`);
}

function lockedTextareaField(character, label, fieldName, value, options = {}) {
  const base = textareaField(label, "character-field", fieldName, value, options);
  return base.replace(/<label>([^<]*)<\/label>/, (_, l) => `<label class="field-label-row"><span>${l}</span>${lockBadge(character, fieldName)}</label>`);
}

function lockedSelectField(character, label, fieldName, value, choices) {
  const base = selectField(label, "character-field", fieldName, value, choices);
  return base.replace(/<label>([^<]*)<\/label>/, (_, l) => `<label class="field-label-row"><span>${l}</span>${lockBadge(character, fieldName)}</label>`);
}

function renderTraitDisplay(character) {
  const selected = new Set(list(character.traits));
  const locked = list(character.locked_fields).includes("traits");
  return `
    <section class="${locked ? "is-locked-section" : ""}">
      <p class="section-label section-label--row">
        <span>性格特质 <span class="section-label__hint">AI 识别 · 共 ${selected.size} 项</span></span>
        ${lockBadge(character, "traits")}
      </p>
      <div class="chip-wrap trait-pool">
        ${CHARACTER_TRAITS.map((t) => `
          <span class="ref-chip ref-chip--readonly ${selected.has(t) ? "is-active" : ""}"
            aria-disabled="true">${escapeHtml(t)}</span>
        `).join("")}
      </div>
    </section>
  `;
}

const MBTI_GROUPS = [
  { key: "analyst",  label: "分析家 · NT", hint: "理性主导" },
  { key: "diplomat", label: "外交官 · NF", hint: "价值驱动" },
  { key: "sentinel", label: "哨兵 · SJ",   hint: "秩序守护" },
  { key: "explorer", label: "探险家 · SP", hint: "行动派" },
];

const MBTI_DESCRIPTIONS = {
  INTJ: "战略思想家 · 计划周密、独立、目标导向，善于把复杂问题变成可执行路径。",
  INTP: "逻辑学家 · 无穷求知欲，擅长抽象推理，对内在一致性的追求胜于社交。",
  ENTJ: "指挥官 · 果断、掌控全局，天生的组织者与战略领袖。",
  ENTP: "辩论家 · 机敏、挑战传统、享受智力交锋，常扮演颠覆者。",
  INFJ: "提倡者 · 理想主义、神秘、深度共情，为信念行动的沉静革命家。",
  INFP: "调停者 · 富诗意的利他主义者，忠于内心价值，难以妥协。",
  ENFJ: "主人公 · 富魅力的领袖，善于读懂并激励他人。",
  ENFP: "竞选者 · 热情自由的灵魂，善于发现可能性，但难以专注。",
  ISTJ: "物流师 · 务实、严谨、重传统，一诺千金的责任承担者。",
  ISFJ: "守卫者 · 温暖奉献的守护者，默默维护他人需要。",
  ESTJ: "总经理 · 高效组织者，靠规则与标准驱动结果。",
  ESFJ: "执政官 · 热心周到的组织者，把社群的和谐当使命。",
  ISTP: "鉴赏家 · 敏捷理性的实干家，在工具与系统中找到乐趣。",
  ISFP: "探险家 · 灵活低调的艺术家，用行动而非语言表达自我。",
  ESTP: "企业家 · 精力充沛的行动派，边做边想，享受冒险。",
  ESFP: "表演者 · 热情即兴的娱乐家，带着人群奔向当下。",
};

const CORE_DRIVE_DESCRIPTIONS = {
  "生理需求（生存）": "最底层：食物、水、睡眠、身体安全——一切行为先为活下去。",
  "安全需求（秩序/保障）": "身处动荡时首要目标：稳定、秩序、经济与人身保障。",
  "归属与爱（家庭/友谊）": "渴望被接纳、归属于群体、建立亲密关系。",
  "尊重需求（成就/地位）": "追求自尊与他人认可：成就、能力、社会地位。",
  "认知需求（知识/理解）": "好奇心与求真欲：理解世界、获取知识、追根究底。",
  "审美需求（秩序/美感）": "追求秩序、对称、平衡与美——偏向美学完整性。",
  "自我实现（潜能/创造）": "把个人潜能发挥到极致，做真正想做且擅长的事。",
  "超越需求（利他/精神）": "超越自我，服务他人、信念或更大的整体意义。",
};

const CORE_DRIVE_META = [
  { label: "生理需求（生存）",         short: "生理",   tier: 1, tone: "deficiency" },
  { label: "安全需求（秩序/保障）",     short: "安全",   tier: 2, tone: "deficiency" },
  { label: "归属与爱（家庭/友谊）",     short: "归属",   tier: 3, tone: "deficiency" },
  { label: "尊重需求（成就/地位）",     short: "尊重",   tier: 4, tone: "deficiency" },
  { label: "认知需求（知识/理解）",     short: "认知",   tier: 5, tone: "growth" },
  { label: "审美需求（秩序/美感）",     short: "审美",   tier: 6, tone: "growth" },
  { label: "自我实现（潜能/创造）",     short: "自我实现", tier: 7, tone: "peak" },
  { label: "超越需求（利他/精神）",     short: "超越",   tier: 8, tone: "peak" },
];

function renderMbtiDisplay(character) {
  const value = character.mbti ?? "";
  const match = value.match(/^([A-Z]{4})(?:-.+)?$/);
  const selectedCode = match ? match[1] : "";
  return `
    <div class="mbti-board">
      <div class="mbti-legend">
        ${MBTI_GROUPS.map((g) => `
          <span class="mbti-legend__item mbti-legend__item--${g.key}">
            <span class="mbti-legend__dot"></span>${escapeHtml(g.label)}
          </span>
        `).join("")}
      </div>
      <div class="mbti-grid">
        ${CHARACTER_MBTI_TYPES.map((t) => {
          const isActive = t.code === selectedCode;
          const value = `${t.code}-${t.name}`;
          const desc = MBTI_DESCRIPTIONS[t.code] ?? t.name;
          return `
            <button class="mbti-cell mbti-cell--${t.group} ${isActive ? "is-active" : ""}"
              type="button" data-action="select-char-mbti" data-id="${escapeHtml(value)}"
              data-tooltip="${escapeHtml(desc)}">
              <span class="mbti-cell__code">${t.code}</span>
              <span class="mbti-cell__name">${escapeHtml(t.name)}</span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderMaslowRow(character) {
  // core_drive 表示角色追求的"需求上限"：单选一层，该层及以下都受驱动
  let selected = "";
  if (typeof character.core_drive === "string") {
    selected = character.core_drive;
  } else if (Array.isArray(character.core_drive) && character.core_drive.length) {
    // 兼容旧多选数据：取最高层作为上限
    const highest = CORE_DRIVE_META.slice().reverse()
      .find((d) => character.core_drive.includes(d.label));
    selected = highest?.label ?? "";
  }
  const selectedTier = CORE_DRIVE_META.find((d) => d.label === selected)?.tier ?? 0;

  return `
    <div class="maslow-row">
      <div class="maslow-row__axis">
        <span class="maslow-row__axis-left">匮乏</span>
        <span class="maslow-row__axis-mid">成长</span>
        <span class="maslow-row__axis-right">顶峰</span>
      </div>
      <div class="maslow-row__chips">
        ${CORE_DRIVE_META.map((d) => {
          const isCeiling = d.label === selected;
          const isBelow = selectedTier > 0 && d.tier < selectedTier;
          const desc = CORE_DRIVE_DESCRIPTIONS[d.label] ?? d.label;
          return `
            <button class="maslow-chip maslow-chip--${d.tone} ${isCeiling ? "is-ceiling" : ""} ${isBelow ? "is-below" : ""}"
              type="button" data-action="select-char-drive" data-id="${escapeHtml(d.label)}"
              data-tooltip="${escapeHtml(d.label)}｜${escapeHtml(desc)}">
              <span class="maslow-chip__num">${d.tier}</span>
              <span class="maslow-chip__label">${escapeHtml(d.short)}</span>
            </button>
          `;
        }).join("")}
      </div>
      <p class="maslow-row__note">点击选择「需求上限」——角色行为受该层及以下驱动</p>
    </div>
  `;
}

function renderPsychologySection(character) {
  const mbtiLocked = list(character.locked_fields).includes("mbti");
  const driveLocked = list(character.locked_fields).includes("core_drive");
  return `
    <section>
      <p class="section-label">心理剖面</p>
      <div class="psych-block psych-block--mbti ${mbtiLocked ? "is-locked-section" : ""}">
        <p class="psych-block__label psych-block__label--row"><span>MBTI 16 型人格 <span class="section-label__hint">点击切换 · 悬停查看描述</span></span>${lockBadge(character, "mbti")}</p>
        ${renderMbtiDisplay(character)}
      </div>
      <div class="psych-block psych-block--maslow ${driveLocked ? "is-locked-section" : ""}" style="margin-top:14px">
        <p class="psych-block__label psych-block__label--row"><span>核心驱动力 · 马斯洛需求上限 <span class="section-label__hint">选一层：该层及以下都驱动其行为</span></span>${lockBadge(character, "core_drive")}</p>
        ${renderMaslowRow(character)}
      </div>
    </section>
  `;
}

function renderCharacterEditorFields(character) {
  return `
    <div class="stack">
      <section class="char-identity-section">
        <div class="char-name-row">
          <input
            class="char-name-hero"
            data-action="character-field" data-field="name"
            value="${escapeHtml(character.name)}"
            placeholder="输入人物名…"
          />
          ${lockBadge(character, "name")}
        </div>
        <div class="char-identity-meta">
          ${lockedSelectField(character, "故事角色", "story_role", character.story_role, Object.entries(storyRoleLabels))}
        </div>
      </section>
      <section>
        <p class="section-label">动机与秘密</p>
        <div class="form-grid form-grid--compact">
          ${lockedInputField(character, "外部目标", "external_goal", character.external_goal, { full: true })}
          ${lockedInputField(character, "内部需要", "dramatic_need", character.dramatic_need, { full: true })}
          ${lockedTextareaField(character, "核心矛盾", "contradiction", character.contradiction, { rows: 3 })}
          ${lockedInputField(character, "压力点", "pressure_point", character.pressure_point, { full: true })}
          ${lockedTextareaField(character, "秘密", "secret", character.secret, { rows: 4, full: true })}
        </div>
      </section>
      <section>
        <p class="section-label">弧光变化</p>
        <div class="form-grid form-grid--compact">
          ${lockedInputField(character, "开场面具", "starting_mask", character.starting_mask, { full: true })}
          ${lockedInputField(character, "弧光起点", "arc_start", character.arc_start, { full: true })}
          ${lockedInputField(character, "弧光终点", "arc_end", character.arc_end, { full: true })}
        </div>
      </section>
      ${renderTraitDisplay(character)}
      ${renderPsychologySection(character)}
      <section>
        <p class="section-label section-label--row"><span>备注</span>${lockBadge(character, "notes")}</p>
        <div class="form-grid form-grid--compact">
          ${textareaField("", "character-field", "notes", character.notes, { rows: 2, full: true })}
        </div>
      </section>
    </div>
  `;
}

function renderRailItem(character, isActive, isCompare) {
  const roleLabel = storyRoleLabels[character.story_role] ?? character.story_role ?? "未定";
  const goal = (character.external_goal ?? "").trim();
  const activeClass = isActive ? "is-active" : isCompare ? "is-compare" : "";
  return `
    <button class="list-select char-rail-item ${activeClass}" type="button"
      data-action="select-character" data-id="${escapeHtml(character.id)}">
      <div class="char-rail-item__body">
        <strong class="char-rail-item__name">${escapeHtml(character.name || "未命名人物")}</strong>
        <span class="char-rail-item__role">${escapeHtml(roleLabel)}</span>
        ${goal ? `<span class="char-rail-item__goal">${escapeHtml(goal)}</span>` : ""}
      </div>
    </button>
  `;
}

function renderRail(characters, appState) {
  const activeId = appState.selection.characterId;
  const compareId = appState.characterCompareId;

  const byRole = new Map(ROLE_GROUPS.map((g) => [g.key, []]));
  const other = [];
  for (const c of characters) {
    if (byRole.has(c.story_role)) byRole.get(c.story_role).push(c);
    else other.push(c);
  }

  const groups = [];
  for (const { key, label } of ROLE_GROUPS) {
    const arr = byRole.get(key);
    if (!arr.length) continue;
    groups.push(`
      <div class="char-rail-group">
        <p class="char-rail-group__label">${label}（${arr.length}）</p>
        <div class="char-rail-group__list">
          ${arr.map((c) => renderRailItem(c, c.id === activeId, c.id === compareId)).join("")}
        </div>
      </div>
    `);
  }
  if (other.length) {
    groups.push(`
      <div class="char-rail-group">
        <p class="char-rail-group__label">其他（${other.length}）</p>
        <div class="char-rail-group__list">
          ${other.map((c) => renderRailItem(c, c.id === activeId, c.id === compareId)).join("")}
        </div>
      </div>
    `);
  }

  if (!groups.length) {
    return renderEmptyState("还没有人物", "点击「新增人物」开始");
  }
  return `<div class="stack">${groups.join("")}</div>`;
}

function renderCompareReadOnly(character) {
  const roleLabel = storyRoleLabels[character.story_role] ?? character.story_role ?? "未定";
  const field = (label, value) => `
    <div class="char-compare-field">
      <p class="char-compare-field__label">${escapeHtml(label)}</p>
      <p class="char-compare-field__value ${value ? "" : "char-compare-field__value--empty"}">${value ? escapeHtml(value) : "—"}</p>
    </div>
  `;

  return `
    <section class="char-compare">
      <div class="char-compare__head">
        <div>
          <h2 class="char-compare__name">${escapeHtml(character.name || "未命名人物")}</h2>
          <p class="char-compare__role">${escapeHtml(roleLabel)}</p>
        </div>
        <button class="button button--ghost button--tiny" type="button" data-action="clear-character-compare">关闭对比</button>
      </div>
      <div class="char-compare__body">
        ${field("外部目标", character.external_goal)}
        ${field("内部需要", character.dramatic_need)}
        ${field("核心矛盾", character.contradiction)}
        ${field("压力点", character.pressure_point)}
        ${field("秘密", character.secret)}
        ${field("开场面具", character.starting_mask)}
        ${field("弧光起点", character.arc_start)}
        ${field("弧光终点", character.arc_end)}
      </div>
    </section>
  `;
}

function renderEditorPane(character, appState, characters) {
  if (!character) {
    return renderEmptyState("从左侧选择一位人物开始编辑", "或点击「新增人物」");
  }
  const lockedCount = list(character.locked_fields).length;
  const refineLoading = appState.characterDesign?.loading;
  const refineError = appState.characterDesign?.error;
  const compareId = appState.characterCompareId;
  const compareCandidates = characters.filter((c) => c.id !== character.id);

  return `
    <div class="list-card__head char-editor-head">
      <div class="inline-actions">
        <span class="char-editor-hint">已锁定 ${lockedCount} 项</span>
      </div>
      <div class="inline-actions">
        ${compareCandidates.length > 0 ? `
          <label class="char-compare-trigger">
            <span class="char-compare-trigger__label">对比</span>
            <select data-action="set-character-compare">
              <option value="">—</option>
              ${compareCandidates.map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === compareId ? "selected" : ""}>${escapeHtml(c.name || "未命名")}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        <button class="button button--tiny" type="button"
          data-action="ai-refine-character" data-id="${escapeHtml(character.id)}"
          ${refineLoading ? "disabled" : ""}>
          ${refineLoading ? "AI 修正中…" : "AI 辅助修正"}
        </button>
        <button class="button button--ghost button--tiny" type="button" data-action="delete-character" data-id="${escapeHtml(character.id)}">删除</button>
      </div>
    </div>
    ${refineError ? `<p class="ai-error-hint">${escapeHtml(refineError)}</p>` : ""}
    ${renderCharacterEditorFields(character)}
  `;
}

export function renderCharactersPage(dom, appState, { getCharacter }) {
  if (!dom.charactersContent) return;
  const characters = list(appState.project.character_hub?.characters);
  const selectedCharacter = getCharacter();
  const compareId = appState.characterCompareId;
  const compareCharacter = compareId ? characters.find((c) => c.id === compareId) : null;

  dom.charactersContent.innerHTML = `
    <section class="character-workbench character-workbench--split">
      <aside class="workbench-pane workbench-pane--rail char-rail-pane">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">人物名单</p>
              <h3>${characters.length} 人</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-character">新增</button>
          </div>
          ${appState.characterGen?.loading ? `<p class="scene-summary-hint">AI 正在生成角色… ${escapeHtml(appState.characterGen.progress || "")}</p>` : ""}
          ${appState.characterGen?.error ? `<p class="ai-error-hint">${escapeHtml(appState.characterGen.error)}</p>` : ""}
          ${renderRail(characters, appState)}
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main char-editor-pane ${compareCharacter ? "has-compare" : ""}">
        <div class="summary-card char-editor-card">
          ${renderEditorPane(selectedCharacter, appState, characters)}
        </div>
        ${compareCharacter ? `
          <div class="summary-card char-compare-card">
            ${renderCompareReadOnly(compareCharacter)}
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

export { LOCKABLE_FIELDS };
