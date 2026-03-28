import { escapeHtml, field, inputField, textareaField, selectField, list } from "../utils.js";
import { structureTemplateLabels, formatStructureOptions, ENDING_DIRECTION_OPTIONS } from "../state.js";

function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["feature_film", "pilot_episode", "three_act", "four_act", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) {
    values.unshift(currentTemplate);
  }
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

export function renderStructurePage(dom, appState, { getOrderedActs, getOrderedNodes, getActTitle }) {
  const structure = appState.project.structure_profile;
  const storyCore = appState.project.story_core;
  const orderedActs = getOrderedActs();
  const orderedNodes = getOrderedNodes();
  const nodeCards = new Map(list(appState.project.plot_board?.cards).map((card) => [card.id, card]));
  const poster = storyCore.poster_base64 || "";
  dom.structureContent.innerHTML = `
    <section class="workbench workbench--structure">
      <div class="workbench__main">
        <div class="summary-card">
          <div class="story-core-layout">
            <div class="story-core-fields">
              <p class="section-label">故事核心</p>
              <div class="form-grid">
                ${textareaField("故事前提", "story-core-field", "premise", storyCore.premise, { rows: 4 })}
                ${textareaField("核心冲突", "story-core-field", "core_conflict", storyCore.core_conflict, { rows: 4 })}
                ${textareaField("中心问题", "story-core-field", "central_question", storyCore.central_question, { rows: 3 })}
                ${inputField("情绪承诺", "story-core-field", "emotional_promise", storyCore.emotional_promise)}
                ${textareaField("主题陈述", "story-core-field", "theme_statement", storyCore.theme_statement, { rows: 3 })}
                <div class="field field--full">
                  <label>结局方向</label>
                  <div class="chip-wrap" style="margin-top:6px">
                    ${ENDING_DIRECTION_OPTIONS.map((e) => `
                      <button class="ref-chip ${storyCore.ending_direction === e ? "is-active" : ""}"
                        type="button" data-action="select-ending-direction" data-id="${escapeHtml(e)}">
                        ${escapeHtml(e)}
                      </button>
                    `).join("")}
                  </div>
                </div>
              </div>
            </div>
            <div class="poster-upload-area" data-action="trigger-poster-upload" title="点击上传海报">
              ${poster
                ? `<img class="poster-image" src="${escapeHtml(poster)}" alt="电影海报" />`
                : `<div class="poster-placeholder">
                    <span class="poster-placeholder__icon">＋</span>
                    <span class="poster-placeholder__label">上传海报</span>
                  </div>`
              }
              ${poster ? `<button class="poster-remove" data-action="remove-poster" title="移除海报">✕</button>` : ""}
            </div>
          </div>
        </div>
        <div class="summary-card">
          <div class="section-label-row">
            <p class="section-label">结构模板</p>
            <button class="button button--ghost button--small" type="button" data-action="open-structure-library">
              浏览结构库 (29类)
            </button>
          </div>
          ${structure.library_name ? `<p class="library-applied-label">当前套用：<strong>${escapeHtml(structure.library_name)}</strong></p>` : ""}
          <div class="form-grid">
            ${selectField(
              "结构模板",
              "structure-meta-field",
              "template",
              structure.template,
              getStructureOptionsForFormat(appState.project.project.format, structure.template)
            )}
            ${
              structure.template === "custom"
                ? selectField(
                    "自定义幕数",
                    "structure-meta-field",
                    "custom_act_count",
                    String(structure.custom_act_count ?? list(structure.acts).length ?? 2),
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
            ${selectField("节奏覆层", "structure-meta-field", "rhythm_overlay", structure.rhythm_overlay, [["save_the_cat", "旧猫咪节拍表"], ["hero_journey", "英雄之旅"], ["story_circle", "故事圆环"], ["none", "不套节拍表"]])}
          </div>
        </div>
        <div class="structure-acts">
          ${orderedActs
            .map(
              (act) => `
                <article class="list-card">
                  <div class="list-card__head">
                    <div>
                        <h3>${escapeHtml(act.title)}</h3>
                        <p>${escapeHtml(act.range_label)}</p>
                      </div>
                    <span class="chip chip--soft">${getOrderedNodes(act.id).length} 节点</span>
                  </div>
                  <div class="form-grid form-grid--compact">
                    ${field("幕标题", `<input data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="title" value="${escapeHtml(act.title)}" />`)}
                    ${field("幕功能", `<input data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="purpose" value="${escapeHtml(act.purpose)}" />`, true)}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
      <aside class="workbench__side">
        <div class="summary-card">
          <p class="section-label">必要节点</p>
          <div class="stack">
            ${orderedNodes
              .map((node, index) => {
                const cards = list(node.card_ids).map((id) => nodeCards.get(id)).filter(Boolean);
                return `
                  <article class="node-card ${node.required ? "is-required" : ""}">
                    <div class="node-card__top">
                      <div>
                        <h3>${index + 1}. ${escapeHtml(node.title)}</h3>
                        <p>${escapeHtml(getActTitle(node.act_id))}</p>
                      </div>
                      <span class="chip chip--soft">${cards.length} 张卡</span>
                    </div>
                    <textarea data-action="node-field" data-id="${escapeHtml(node.id)}" data-field="note" rows="2">${escapeHtml(node.note || "")}</textarea>
                  </article>
                `;
              })
              .join("")}
          </div>
        </div>
      </aside>
    </section>
  `;
}
