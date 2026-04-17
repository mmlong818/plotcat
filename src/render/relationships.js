import { escapeHtml, inputField, textareaField, selectField, field, list, renderEmptyState } from "../utils.js";
import { relationshipStatusLabels, RELATIONSHIP_TYPE_OPTIONS } from "../state.js";

function relStatusDot(status) {
  const map = { active: "active", locked: "locked", retired: "discard" };
  const cls = map[status] ?? "draft";
  return `<span class="status-dot status-dot--${cls}"></span>`;
}

// 以角色为锚点，展示每个角色参与的关系
function renderRelationshipRail(characters, relationships, selectedId) {
  if (!characters.length) return renderEmptyState("先在「人物核心」里创建角色。");

  const charMap = new Map(characters.map((c) => [c.id, c.name || "未命名人物"]));

  const sections = characters
    .map((char) => {
      const rels = relationships.filter(
        (r) => r.source_character_id === char.id || r.target_character_id === char.id
      );
      if (!rels.length) return "";
      return `
        <div class="rel-char-group">
          <p class="rel-char-group__name">${escapeHtml(char.name || "未命名人物")}</p>
          ${rels.map((r) => {
            const other = r.source_character_id === char.id
              ? charMap.get(r.target_character_id) ?? "未定"
              : charMap.get(r.source_character_id) ?? "未定";
            return `
              <button class="list-select rel-item ${r.id === selectedId ? "is-active" : ""}"
                type="button" data-action="select-relationship" data-id="${escapeHtml(r.id)}">
                <span class="rel-item__arrow">↔</span>
                <span class="rel-item__body">
                  <strong>${escapeHtml(other)}</strong>
                  <span>${escapeHtml(r.relationship_type || "未命名关系")}</span>
                </span>
                ${relStatusDot(r.status)}
              </button>
            `;
          }).join("")}
        </div>
      `;
    })
    .filter(Boolean);

  if (!sections.length) {
    return renderEmptyState("还没有关系，点击「新增」开始。");
  }
  return `<div class="stack workbench-scroll-list">${sections.join("")}</div>`;
}

export function renderRelationshipsPage(dom, appState, { getRelationship, getCharacterNameById }) {
  if (!dom.relationshipsContent) return;
  const selectedRelationship = getRelationship();
  const characters = list(appState.project.character_hub?.characters);
  const relationships = list(appState.project.character_hub?.relationship_map);

  const srcName = selectedRelationship ? getCharacterNameById(selectedRelationship.source_character_id) : "";
  const tgtName = selectedRelationship ? getCharacterNameById(selectedRelationship.target_character_id) : "";

  dom.relationshipsContent.innerHTML = `
    <section class="relationship-workbench relationship-workbench--dual">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">关系网 · 按角色分组</p>
              <h3>${relationships.length} 条关系</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-relationship">新增</button>
          </div>
          ${renderRelationshipRail(characters, relationships, appState.selection.relationshipId)}
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">关系详情</p>
              ${selectedRelationship ? `<h3 class="rel-editor__title">${escapeHtml(srcName)} <span class="rel-editor__arrow">↔</span> ${escapeHtml(tgtName)}</h3>` : ""}
            </div>
            ${selectedRelationship
              ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-relationship" data-id="${escapeHtml(selectedRelationship.id)}">删除</button>`
              : ""
            }
          </div>
          ${!selectedRelationship
            ? renderEmptyState("从左侧选择一条关系，或点击「新增」建立角色关系")
            : `
              <div class="stack">
                <section>
                  <p class="section-label">双方角色</p>
                  <div class="form-grid form-grid--compact">
                    ${field("角色 A", `<select data-action="relationship-field" data-field="source_character_id">${characters.map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === selectedRelationship.source_character_id ? "selected" : ""}>${escapeHtml(c.name || "未命名人物")}</option>`).join("")}</select>`)}
                    ${field("角色 B", `<select data-action="relationship-field" data-field="target_character_id">${characters.map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === selectedRelationship.target_character_id ? "selected" : ""}>${escapeHtml(c.name || "未命名人物")}</option>`).join("")}</select>`)}
                  </div>
                </section>
                <section>
                  <p class="section-label">关系定义</p>
                  <div class="form-grid form-grid--compact">
                    ${selectField("状态", "relationship-field", "status", selectedRelationship.status, Object.entries(relationshipStatusLabels))}
                  </div>
                  <div class="chip-wrap" style="margin-top:10px">
                    ${RELATIONSHIP_TYPE_OPTIONS.map((t) => `
                      <button class="ref-chip ${selectedRelationship.relationship_type === t ? "is-active" : ""}"
                        type="button" data-action="select-rel-type-chip" data-id="${escapeHtml(t)}">
                        ${escapeHtml(t)}
                      </button>
                    `).join("")}
                  </div>
                  <div class="form-grid form-grid--compact" style="margin-top:8px">
                    ${inputField("自定义名称", "relationship-field", "relationship_type", selectedRelationship.relationship_type, { full: true })}
                  </div>
                </section>
                <section>
                  <p class="section-label">结构张力</p>
                  <div class="form-grid form-grid--compact">
                    ${inputField("张力描述", "relationship-field", "tension", selectedRelationship.tension, { full: true })}
                    ${inputField("权力关系", "relationship-field", "power_balance", selectedRelationship.power_balance, { full: true })}
                  </div>
                </section>
                <section>
                  <p class="section-label">历史底色</p>
                  <div class="form-grid form-grid--compact">
                    ${textareaField("共同过去", "relationship-field", "shared_history", selectedRelationship.shared_history, { rows: 3, full: true })}
                    ${textareaField("隐情", "relationship-field", "hidden_information", selectedRelationship.hidden_information, { rows: 3, full: true })}
                  </div>
                </section>
              </div>
            `
          }
        </div>
      </div>
    </section>
  `;
}
