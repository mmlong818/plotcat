import { escapeHtml, inputField, textareaField, selectField, list, renderEmptyState } from "../utils.js";
import { storyRoleLabels, CHARACTER_ARCHETYPES, CHARACTER_TRAITS, CHARACTER_ENNEAGRAM, CHARACTER_MORAL_ALIGNMENT, CHARACTER_CORE_DRIVE } from "../state.js";

const ROLE_GROUPS = [
  { key: "protagonist", label: "主角" },
  { key: "antagonist",  label: "对手" },
  { key: "ally",        label: "盟友" },
  { key: "opponent_ally", label: "复杂盟友" },
  { key: "supporting",  label: "配角" },
];

const ARCHETYPE_GROUPS = ["主角", "反派", "配角"];

function renderArchetypePicker(character) {
  const selected = character.archetype ?? "";
  return `
    <section>
      <p class="section-label">角色原型 <span class="section-label__hint">（点击快速定位，可不选）</span></p>
      ${ARCHETYPE_GROUPS.map((group) => {
        const items = CHARACTER_ARCHETYPES.filter((a) => a.group === group);
        return `
          <div class="archetype-group">
            <p class="archetype-group__label">${group}</p>
            <div class="chip-wrap">
              ${items.map((a) => `
                <button class="ref-chip ${a.key === selected ? "is-active" : ""}"
                  type="button" data-action="select-character-archetype" data-id="${escapeHtml(a.key)}"
                  title="${escapeHtml(a.desc)}">
                  ${escapeHtml(a.key)}
                </button>
              `).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderTraitPicker(character) {
  const selected = new Set(list(character.traits));
  return `
    <section>
      <p class="section-label">性格特质 <span class="section-label__hint">（多选）</span></p>
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
        <div class="psych-block">
          <p class="psych-block__label">九型人格</p>
          <div class="chip-wrap chip-wrap--dense">
            ${CHARACTER_ENNEAGRAM.map((e) => `
              <button class="ref-chip ref-chip--xs ${e === (character.enneagram ?? "") ? "is-active" : ""}"
                type="button" data-action="select-char-enneagram" data-id="${escapeHtml(e)}">
                ${escapeHtml(e)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="psych-block">
          <p class="psych-block__label">道德阵营</p>
          <div class="alignment-grid">
            ${CHARACTER_MORAL_ALIGNMENT.map((a) => `
              <button class="alignment-cell ${a === (character.moral_alignment ?? "") ? "is-active" : ""}"
                type="button" data-action="select-char-alignment" data-id="${escapeHtml(a)}">
                ${escapeHtml(a)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="psych-block">
          <p class="psych-block__label">核心驱动力（马斯洛）</p>
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
      ${renderArchetypePicker(character)}
      <section>
        <p class="section-label">基础定位</p>
        <div class="form-grid form-grid--compact">
          ${inputField("人物名", "character-field", "name", character.name)}
          ${selectField("人物位置", "character-field", "story_role", character.story_role, Object.entries(storyRoleLabels))}
          ${textareaField("备注", "character-field", "notes", character.notes, { rows: 3, full: true })}
        </div>
      </section>
      <section>
        <p class="section-label">动机与秘密</p>
        <div class="form-grid form-grid--compact">
          ${inputField("外部目标", "character-field", "external_goal", character.external_goal, { full: true })}
          ${inputField("内部需要", "character-field", "dramatic_need", character.dramatic_need, { full: true })}
          ${textareaField("核心矛盾", "character-field", "contradiction", character.contradiction, { rows: 3 })}
          ${inputField("压力点", "character-field", "pressure_point", character.pressure_point)}
          ${textareaField("秘密", "character-field", "secret", character.secret, { rows: 4, full: true })}
        </div>
      </section>
      <section>
        <p class="section-label">弧光变化</p>
        <div class="form-grid form-grid--compact">
          ${inputField("人物表层", "character-field", "starting_mask", character.starting_mask, { full: true })}
          ${inputField("弧光起点", "character-field", "arc_start", character.arc_start, { full: true })}
          ${inputField("弧光终点", "character-field", "arc_end", character.arc_end, { full: true })}
        </div>
      </section>
      ${renderTraitPicker(character)}
      ${renderPsychologySection(character)}
    </div>
  `;
}

function renderCharacterRail(characters, selectedId) {
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
      <div class="char-role-group">
        <p class="char-role-group__label">${label}</p>
        ${group.map((c) => `
          <button class="list-select ${c.id === selectedId ? "is-active" : ""}"
            type="button" data-action="select-character" data-id="${escapeHtml(c.id)}">
            <strong>${escapeHtml(c.name || "未命名人物")}</strong>
            ${c.archetype ? `<span>${escapeHtml(c.archetype)}</span>` : ""}
          </button>
        `).join("")}
      </div>
    `);
  }
  if (other.length) {
    sections.push(`
      <div class="char-role-group">
        <p class="char-role-group__label">其他</p>
        ${other.map((c) => `
          <button class="list-select ${c.id === selectedId ? "is-active" : ""}"
            type="button" data-action="select-character" data-id="${escapeHtml(c.id)}">
            <strong>${escapeHtml(c.name || "未命名人物")}</strong>
          </button>
        `).join("")}
      </div>
    `);
  }

  if (!sections.length) return renderEmptyState("还没有人物，点击「新增」开始。");
  return `<div class="stack workbench-scroll-list">${sections.join("")}</div>`;
}

export function renderCharactersPage(dom, appState, { getCharacter }) {
  if (!dom.charactersContent) return;
  const selectedCharacter = getCharacter();
  const characters = list(appState.project.character_hub?.characters);
  dom.charactersContent.innerHTML = `
    <section class="character-workbench character-workbench--dual">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">人物名单</p>
              <h3>${characters.length} 人</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-character">新增</button>
          </div>
          ${renderCharacterRail(characters, appState.selection.characterId)}
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>${escapeHtml(selectedCharacter?.name || "未命名人物")}</h3>
            </div>
            ${selectedCharacter
              ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-character" data-id="${escapeHtml(selectedCharacter.id)}">删除人物</button>`
              : ""}
          </div>
          ${!selectedCharacter
            ? renderEmptyState("还没有选择人物", "点击左侧列表中的人物开始编辑")
            : renderCharacterEditorFields(selectedCharacter)
          }
        </div>
      </div>
    </section>
  `;
}
