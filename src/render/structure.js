import { escapeHtml, field, inputField, textareaField, selectField, list } from "../utils.js";
import { structureTemplateLabels, formatStructureOptions, ENDING_DIRECTION_OPTIONS, NODE_TOOLTIPS } from "../state.js";

function endingDirectionSelect(current) {
  const options = [["", "— 未定 —"], ...ENDING_DIRECTION_OPTIONS.map((e) => [e, e])];
  return selectField("结局方向", "story-core-field", "ending_direction", current ?? "", options);
}

function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["feature_film", "pilot_episode", "three_act", "four_act", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) {
    values.unshift(currentTemplate);
  }
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

function parseActRange(rangeLabel) {
  const m = String(rangeLabel ?? "").match(/(\d+)[%％][–—\-](\d+)[%％]/);
  if (!m) return { start: 0, end: 100 };
  return { start: parseInt(m[1]), end: parseInt(m[2]) };
}

const ACT_CHINESE_NUMS = ["一", "二", "三", "四", "五", "六"];


function renderStructureArc(orderedActs) {
  if (orderedActs.length === 0) return "";

  const ACT_ARC_BG = [
    "rgba(186,86,22,0.12)", "rgba(30,95,168,0.10)", "rgba(46,125,82,0.10)",
    "rgba(180,83,9,0.10)", "rgba(192,57,43,0.10)", "rgba(138,117,96,0.10)"
  ];
  const ACT_ARC_BORDER = [
    "rgba(186,86,22,0.5)", "rgba(30,95,168,0.4)", "rgba(46,125,82,0.4)",
    "rgba(180,83,9,0.4)", "rgba(192,57,43,0.4)", "rgba(138,117,96,0.4)"
  ];

  const total = orderedActs.reduce((sum, act) => {
    const { start, end } = parseActRange(act.range_label);
    return sum + Math.max(end - start, 1);
  }, 0);

  const segments = orderedActs.map((act, i) => {
    const { start, end } = parseActRange(act.range_label);
    const span = Math.max(end - start, 1);
    const pct = (span / Math.max(total, 100)) * 100;
    const bg = ACT_ARC_BG[i % ACT_ARC_BG.length];
    const border = ACT_ARC_BORDER[i % ACT_ARC_BORDER.length];
    return `
      <div class="structure-arc__seg" style="flex:${pct};background:${bg};border-color:${border}">
        <span class="structure-arc__seg-label">${escapeHtml(act.title || `第${ACT_CHINESE_NUMS[i] || i + 1}幕`)}</span>
      </div>
    `;
  }).join("");

  const rangeLabels = orderedActs.map((act, i) => {
    const { start, end } = parseActRange(act.range_label);
    const span = Math.max(end - start, 1);
    const pct = (span / Math.max(total, 100)) * 100;
    return `<span class="structure-arc__range" style="flex:${pct}">${start}%</span>`;
  }).join("") + `<span class="structure-arc__range-end">100%</span>`;

  return `
    <div class="structure-arc">
      <div class="structure-arc__track">${segments}</div>
      <div class="structure-arc__labels">${rangeLabels}</div>
    </div>
  `;
}

function renderActBlock(act, index, nodes, nodeCards) {
  const { start, end } = parseActRange(act.range_label);
  const chineseNum = ACT_CHINESE_NUMS[index] ?? String(index + 1);

  const nodeItems = nodes.map((node) => {
    const cards = list(node.card_ids).map((id) => nodeCards.get(id)).filter(Boolean);
    return `
      <div class="act-node-item ${node.required ? "is-required" : ""}">
        <div class="act-node-item__head">
          <span class="act-node-item__dot ${node.required ? "is-required" : ""}"></span>
          <span class="act-node-item__title">${escapeHtml(node.title)}</span>
          ${NODE_TOOLTIPS[node.node_type] ? `<span class="node-tooltip-trigger" data-tooltip="${escapeHtml(NODE_TOOLTIPS[node.node_type])}">!</span>` : ""}
          ${node.required ? `<span class="act-node-item__req">必要</span>` : ""}
          ${cards.length > 0 ? `<span class="chip chip--soft act-node-item__badge">${cards.length} 卡</span>` : ""}
        </div>
        <textarea class="act-node-item__note"
          data-action="node-field" data-id="${escapeHtml(node.id)}" data-field="note"
          rows="2" placeholder="节点备注…">${escapeHtml(node.note || "")}</textarea>
      </div>
    `;
  }).join("");

  return `
    <article class="act-block">
      <div class="act-block__head">
        <div class="act-block__meta">
          <span class="act-block__num">第${chineseNum}幕</span>
          <span class="act-block__range">${start}%–${end}%</span>
          ${nodes.length > 0 ? `<span class="chip chip--soft">${nodes.length} 节点</span>` : ""}
        </div>
        <div class="act-block__fields">
          <input class="act-block__title-input"
            data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="title"
            value="${escapeHtml(act.title)}" placeholder="幕标题" />
          <input class="act-block__purpose-input"
            data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="purpose"
            value="${escapeHtml(act.purpose)}" placeholder="此幕的叙事功能…" />
        </div>
      </div>
      ${nodes.length > 0
        ? `<div class="act-block__nodes">${nodeItems}</div>`
        : `<p class="act-block__empty">此幕暂无叙事节点</p>`
      }
    </article>
  `;
}

export function renderStructurePage(dom, appState, { getOrderedActs, getOrderedNodes, getActTitle }) {
  const structure = appState.project.structure_profile;
  const storyCore = appState.project.story_core;
  const orderedActs = getOrderedActs();
  const nodeCards = new Map(list(appState.project.plot_board?.cards).map((card) => [card.id, card]));

  const templateOptions = getStructureOptionsForFormat(appState.project.project.format, structure.template);

  dom.structureContent.innerHTML = `
    <section class="workbench workbench--structure">

      <!-- ── 左列：故事核心 + 结构配置 ─────────────────── -->
      <div class="structure-col structure-col--left">

        <div class="summary-card">
          <p class="section-label">故事核心</p>
          <div class="form-grid form-grid--compact" style="margin-top:10px">
            ${textareaField("故事前提", "story-core-field", "premise", storyCore.premise, { rows: 3 })}
            ${textareaField("核心冲突", "story-core-field", "core_conflict", storyCore.core_conflict, { rows: 3 })}
            ${textareaField("中心问题", "story-core-field", "central_question", storyCore.central_question, { rows: 2 })}
            ${inputField("情绪承诺", "story-core-field", "emotional_promise", storyCore.emotional_promise)}
            ${textareaField("主题陈述", "story-core-field", "theme_statement", storyCore.theme_statement, { rows: 2 })}
            ${endingDirectionSelect(storyCore.ending_direction)}
          </div>
        </div>

        <div class="summary-card">
          <div class="section-label-row">
            <p class="section-label">结构配置</p>
            <button class="button button--ghost button--small" type="button" data-action="open-structure-library">
              浏览结构库
            </button>
          </div>
          ${structure.library_name ? `<p class="library-applied-label">套用：<strong>${escapeHtml(structure.library_name)}</strong></p>` : ""}
          <div class="form-grid form-grid--compact" style="margin-top:10px">
            ${selectField("结构模板", "structure-meta-field", "template", structure.template, templateOptions)}
            ${structure.template === "custom"
              ? selectField("自定义幕数", "structure-meta-field", "custom_act_count",
                  String(structure.custom_act_count ?? list(structure.acts).length ?? 2),
                  [["1","1幕"],["2","2幕"],["3","3幕"],["4","4幕"],["5","5幕"],["6","6幕"]])
              : ""
            }
            ${selectField("节奏覆层", "structure-meta-field", "rhythm_overlay", structure.rhythm_overlay, [
              ["save_the_cat", "旧猫咪节拍表"],
              ["hero_journey", "英雄之旅"],
              ["story_circle", "故事圆环"],
              ["none", "不套节拍表"]
            ])}
          </div>
        </div>

      </div>

      <!-- ── 右列：弧线 + 各幕（含节点） ─────────────────── -->
      <div class="structure-col structure-col--right">

        <div class="summary-card">
          <p class="section-label">结构弧线</p>
          ${orderedActs.length > 0
            ? renderStructureArc(orderedActs)
            : `<p class="structure-arc-empty">选定结构模板后自动生成幕划分</p>`
          }
        </div>

        <div class="structure-acts">
          ${orderedActs.map((act, i) =>
            renderActBlock(act, i, getOrderedNodes(act.id), nodeCards)
          ).join("")}
          ${orderedActs.length === 0
            ? `<div class="empty-state"><p>选定结构模板后将自动生成幕结构</p></div>`
            : ""
          }
        </div>

      </div>
    </section>
  `;
}
