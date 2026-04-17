import { escapeHtml, inputField, textareaField, selectField, list, renderEmptyState } from "../utils.js";
import { storyRoleLabels, CHARACTER_TRAITS, CHARACTER_ENNEAGRAM, CHARACTER_MORAL_ALIGNMENT, CHARACTER_CORE_DRIVE } from "../state.js";

const ROLE_GROUPS = [
  { key: "protagonist", label: "主角" },
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
  "traits", "enneagram", "moral_alignment", "core_drive"
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

function renderTraitPicker(character) {
  const selected = new Set(list(character.traits));
  const locked = list(character.locked_fields).includes("traits");
  return `
    <section class="${locked ? "is-locked-section" : ""}">
      <p class="section-label section-label--row">
        <span>性格特质 <span class="section-label__hint">（多选）</span></span>
        ${lockBadge(character, "traits")}
      </p>
      <div class="chip-wrap">
        ${CHARACTER_TRAITS.map((t) => `
          <button class="ref-chip ${selected.has(t) ? "is-active" : ""}"
            type="button" data-action="toggle-character-trait" data-id="${escapeHtml(t)}">
            ${escapeHtml(t)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPsychologySection(character) {
  return `
    <section>
      <p class="section-label">心理剖面</p>
      <div class="psych-grid">
        <div class="psych-block ${list(character.locked_fields).includes("enneagram") ? "is-locked-section" : ""}">
          <p class="psych-block__label psych-block__label--row"><span>九型人格</span>${lockBadge(character, "enneagram")}</p>
          <div class="chip-wrap chip-wrap--dense">
            ${CHARACTER_ENNEAGRAM.map((e) => `
              <button class="ref-chip ref-chip--xs ${e === (character.enneagram ?? "") ? "is-active" : ""}"
                type="button" data-action="select-char-enneagram" data-id="${escapeHtml(e)}">
                ${escapeHtml(e)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="psych-block ${list(character.locked_fields).includes("moral_alignment") ? "is-locked-section" : ""}">
          <p class="psych-block__label psych-block__label--row"><span>道德阵营</span>${lockBadge(character, "moral_alignment")}</p>
          <div class="alignment-grid">
            ${CHARACTER_MORAL_ALIGNMENT.map((a) => `
              <button class="alignment-cell ${a === (character.moral_alignment ?? "") ? "is-active" : ""}"
                type="button" data-action="select-char-alignment" data-id="${escapeHtml(a)}">
                ${escapeHtml(a)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="psych-block ${list(character.locked_fields).includes("core_drive") ? "is-locked-section" : ""}">
          <p class="psych-block__label psych-block__label--row"><span>核心驱动力（马斯洛）</span>${lockBadge(character, "core_drive")}</p>
          <div class="chip-wrap">
            ${CHARACTER_CORE_DRIVE.map((d) => `
              <button class="ref-chip ${d === (character.core_drive ?? "") ? "is-active" : ""}"
                type="button" data-action="select-char-drive" data-id="${escapeHtml(d)}">
                ${escapeHtml(d)}
              </button>
            `).join("")}
          </div>
        </div>
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
      ${renderTraitPicker(character)}
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

function characterSummaryLine(character) {
  const goal = (character.external_goal ?? "").trim();
  const need = (character.dramatic_need ?? "").trim();
  if (goal && need) return `${goal} · ${need}`;
  return goal || need || "暂无动机描述";
}

function renderCharacterCard(character) {
  const roleLabel = storyRoleLabels[character.story_role] ?? character.story_role ?? "未定角色";
  const arcStart = (character.arc_start ?? "").trim();
  const arcEnd = (character.arc_end ?? "").trim();
  const hasArc = arcStart || arcEnd;
  return `
    <article class="char-card">
      <header class="char-card__head">
        <div class="char-card__identity">
          <strong class="char-card__name">${escapeHtml(character.name || "未命名人物")}</strong>
          <span class="char-card__role">${escapeHtml(roleLabel)}</span>
        </div>
        <div class="char-card__actions">
          <button class="button button--ghost button--tiny" type="button" data-action="edit-character" data-id="${escapeHtml(character.id)}">编辑</button>
          <button class="button button--ghost button--tiny" type="button" data-action="delete-character" data-id="${escapeHtml(character.id)}">删除</button>
        </div>
      </header>
      <p class="char-card__summary">${escapeHtml(characterSummaryLine(character))}</p>
      ${hasArc ? `<p class="char-card__arc"><span class="char-card__arc-label">弧光</span> ${escapeHtml(arcStart || "—")} → ${escapeHtml(arcEnd || "—")}</p>` : ""}
    </article>
  `;
}

function renderCharacterGrid(characters) {
  if (!characters.length) return renderEmptyState("还没有人物", "点击上方「新增人物」或「AI 生成角色」开始");

  const byRole = new Map(ROLE_GROUPS.map((g) => [g.key, []]));
  const other = [];
  for (const c of characters) {
    if (byRole.has(c.story_role)) byRole.get(c.story_role).push(c);
    else other.push(c);
  }

  const sections = [];
  for (const { key, label } of ROLE_GROUPS) {
    const group = byRole.get(key);
    if (!group.length) continue;
    sections.push(`
      <section class="char-grid-section">
        <p class="char-grid-section__label">${label}（${group.length}）</p>
        <div class="char-card-grid">
          ${group.map(renderCharacterCard).join("")}
        </div>
      </section>
    `);
  }
  if (other.length) {
    sections.push(`
      <section class="char-grid-section">
        <p class="char-grid-section__label">其他（${other.length}）</p>
        <div class="char-card-grid">
          ${other.map(renderCharacterCard).join("")}
        </div>
      </section>
    `);
  }
  return sections.join("");
}

function renderCardGridView(characters, appState) {
  return `
    <section class="character-workbench character-workbench--cards">
      <div class="summary-card">
        <div class="list-card__head">
          <div>
            <p class="section-label">人物名单</p>
            <h3>${characters.length} 人</h3>
          </div>
          <div class="inline-actions">
            <button class="button button--ghost button--tiny" type="button" data-action="add-character">新增人物</button>
          </div>
        </div>
        ${appState.characterGen?.loading ? `<p class="scene-summary-hint">AI 正在生成角色… ${escapeHtml(appState.characterGen.progress || "")}</p>` : ""}
        ${appState.characterGen?.error ? `<p class="ai-error-hint">${escapeHtml(appState.characterGen.error)}</p>` : ""}
        ${renderCharacterGrid(characters)}
      </div>
    </section>
  `;
}

function renderEditorView(character, appState) {
  const lockedCount = list(character.locked_fields).length;
  const refineLoading = appState.characterDesign?.loading;
  const refineError = appState.characterDesign?.error;
  return `
    <section class="character-workbench character-workbench--editor">
      <div class="summary-card">
        <div class="list-card__head">
          <div class="inline-actions">
            <button class="button button--ghost button--tiny" type="button" data-action="close-character-editor">← 返回卡片</button>
          </div>
          <div class="inline-actions">
            <span class="char-editor-hint">已锁定 ${lockedCount} 项</span>
            <button class="button button--tiny" type="button"
              data-action="ai-refine-character" data-id="${escapeHtml(character.id)}"
              ${refineLoading ? "disabled" : ""}>
              ${refineLoading ? "AI 修正中…" : "AI 辅助修正"}
            </button>
            <button class="button button--ghost button--tiny" type="button" data-action="delete-character" data-id="${escapeHtml(character.id)}">删除人物</button>
          </div>
        </div>
        ${refineError ? `<p class="ai-error-hint">${escapeHtml(refineError)}</p>` : ""}
        ${renderCharacterEditorFields(character)}
      </div>
    </section>
  `;
}

export function renderCharactersPage(dom, appState, { getCharacter }) {
  if (!dom.charactersContent) return;
  const characters = list(appState.project.character_hub?.characters);
  const editorOpen = !!appState.characterEditorOpen;
  const selectedCharacter = editorOpen ? getCharacter() : null;

  if (editorOpen && selectedCharacter) {
    dom.charactersContent.innerHTML = renderEditorView(selectedCharacter, appState);
  } else {
    dom.charactersContent.innerHTML = renderCardGridView(characters, appState);
  }
}

export { LOCKABLE_FIELDS };
