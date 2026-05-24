import { escapeHtml, inputField, textareaField, selectField, field, list, renderEmptyState } from "../utils.js";
import { plotTypeLabels, plotStatusLabels, storyRoleLabels, PLOT_TROPE_OPTIONS, PLOT_MACGUFFIN_OPTIONS, PLOT_CATALYST_OPTIONS, PLOT_CONFLICT_TYPE_OPTIONS, PLOT_TWIST_OPTIONS } from "../state.js";

const STATUS_LABELS = {
  draft: "草稿", exploring: "探索中", review: "待审", locked: "已锁定", discarded: "废弃",
};
const STATUS_CLASS = {
  draft: "pgs-draft", exploring: "pgs-explore", review: "pgs-review", locked: "pgs-locked", discarded: "pgs-discard",
};

function renderCharacterChecklist(appState, selectedIds = []) {
  const selected = new Set(list(selectedIds));
  return `
    <div class="check-list">
      ${list(appState.project.character_hub?.characters)
        .map((ch) => `
          <label class="check-list__item">
            <input type="checkbox" data-action="plot-character-toggle" data-id="${escapeHtml(ch.id)}" ${selected.has(ch.id) ? "checked" : ""}/>
            <span>${escapeHtml(ch.name)}</span>
          </label>`)
        .join("")}
    </div>`;
}

function renderPCard(appState, card, lane) {
  const isActive = card.id === appState.selection.plotCardId;
  const statusCls = STATUS_CLASS[card.status] ?? "pgs-draft";
  const statusLabel = STATUS_LABELS[card.status] ?? card.status;
  const colorSlot = lane?.color_slot ?? "gray";
  return `
    <div class="pgrid-card pgrid-card--${escapeHtml(colorSlot)} ${isActive ? "is-active" : ""}"
      data-action="select-plot-card" data-id="${escapeHtml(card.id)}"
      draggable="true" data-drag-plot-id="${escapeHtml(card.id)}">
      <div class="pgrid-card__top">
        <span class="pgrid-card__lane">${escapeHtml(lane?.title ?? "轨道")}</span>
        <span class="pgrid-card__status ${statusCls}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="pgrid-card__title">${escapeHtml(card.title || "未命名剧情卡")}</div>
      ${card.summary ? `<div class="pgrid-card__summary">${escapeHtml(card.summary)}</div>` : ""}
      ${card.change ? `<div class="pgrid-card__change"><span class="pgrid-card__change-label">核心变化</span>${escapeHtml(card.change)}</div>` : ""}
    </div>`;
}

function renderGrid(appState, lanes, acts, allCards, { getOrderedNodes, getPlotLane }) {
  // Build column list: [{actId, node}]
  const cols = acts.flatMap((act) => getOrderedNodes(act.id).map((node) => ({ actId: act.id, node })));

  if (cols.length === 0) {
    return `<div class="pgrid-empty">尚未生成结构节点，请先在「结构骨架」步骤建立幕与节点。</div>`;
  }

  // Act header spans
  const actSpans = acts.map((act) => ({ act, span: getOrderedNodes(act.id).length })).filter((s) => s.span > 0);

  // Row 1: act headers
  const row1Cells = actSpans.map(({ act, span }, idx) => {
    const isLast = idx === actSpans.length - 1;
    return `<div class="pgrid-hcell pgrid-hcell--act ${isLast ? "" : "pgrid-hcell--act-end"}" style="--col-span:${span}">${escapeHtml(act.title)}<span class="pgrid-chip">${span} 节点</span></div>`;
  }).join("");

  // Row 2: node name headers (with delete button)
  const row2Cells = cols.map(({ actId, node }, idx) => {
    const isActEnd = idx < cols.length - 1 && cols[idx + 1].actId !== actId;
    return `
      <div class="pgrid-hcell pgrid-hcell--node ${isActEnd ? "pgrid-hcell--act-end" : ""}">
        <span class="pgrid-node-seq">${String(idx + 1).padStart(2, "0")}</span>
        ${escapeHtml(node.title)}
        <button class="pgrid-del-col" data-action="delete-plot-node-col" data-node-id="${escapeHtml(node.id)}" title="删除此列">✕</button>
      </div>`;
  }).join("");

  // Data rows: one per lane
  const dataRows = lanes.map((lane) => {
    const colorSlot = lane.color_slot ?? "gray";
    const cells = cols.map(({ actId, node }, idx) => {
      const isActEnd = idx < cols.length - 1 && cols[idx + 1].actId !== actId;
      const cellCards = allCards.filter((c) => c.lane_id === lane.id && c.node_id === node.id)
        .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
      return `
        <div class="pgrid-cell ${isActEnd ? "pgrid-cell--act-end" : ""}"
          data-plot-dropzone="grid" data-lane-id="${escapeHtml(lane.id)}" data-node-id="${escapeHtml(node.id)}" data-act-id="${escapeHtml(actId)}">
          ${cellCards.length > 0
            ? cellCards.map((c) => renderPCard(appState, c, lane)).join("")
            : `<button class="pgrid-add-stub" data-action="add-plot-card" data-lane-id="${escapeHtml(lane.id)}" data-node-id="${escapeHtml(node.id)}" data-act-id="${escapeHtml(actId)}" title="在此添加剧情卡">+</button>`}
        </div>`;
    }).join("");

    const laneCount = allCards.filter((c) => c.lane_id === lane.id).length;
    return `
      <div class="pgrid-row pgrid-row--${escapeHtml(colorSlot)}">
        <div class="pgrid-track-label">
          <span class="pgrid-track-dot pgrid-track-dot--${escapeHtml(colorSlot)}"></span>
          <span class="pgrid-track-name">${escapeHtml(lane.title)}</span>
          <span class="pgrid-track-count">${laneCount} 卡</span>
        </div>
        ${cells}
        <div class="pgrid-add-col-data"></div>
      </div>`;
  }).join("");

  return `
    <div class="pgrid-inner">
      <!-- Row 1: acts -->
      <div class="pgrid-hrow pgrid-hrow--acts">
        <div class="pgrid-corner">轨道</div>
        ${row1Cells}
        <div class="pgrid-add-col-corner"></div>
      </div>
      <!-- Row 2: nodes -->
      <div class="pgrid-hrow pgrid-hrow--nodes">
        <div class="pgrid-corner"></div>
        ${row2Cells}
        <div class="pgrid-add-col-head">
          <button class="pgrid-add-col-btn" data-action="add-plot-node-col" title="添加节点列">+</button>
        </div>
      </div>
      <!-- Data rows -->
      ${dataRows}
    </div>`;
}

function renderLibraryPanel(appState, allCards, lanes, { getPlotLane, getActTitle, getNode }) {
  const byLane = lanes.map((lane) => {
    const laneCards = allCards.filter((c) => c.lane_id === lane.id)
      .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
    return { lane, cards: laneCards };
  });

  const unplaced = allCards.filter((c) => !c.node_id || !c.act_id);

  return `
    <aside class="pgrid-library">
      <div class="pgrid-lib-head">
        <span class="pgrid-lib-title">卡片库</span>
        <button class="pgrid-lib-new button button--primary button--small" data-action="add-plot-card">+ 新建卡片</button>
      </div>
      <div class="pgrid-lib-body">
        ${byLane.map(({ lane, cards }) => {
          if (cards.length === 0) return "";
          const colorSlot = lane.color_slot ?? "gray";
          return `
            <div class="pgrid-lib-group">
              <div class="pgrid-lib-group-head pgrid-lib-group-head--${escapeHtml(colorSlot)}">
                <span class="pgrid-track-dot pgrid-track-dot--${escapeHtml(colorSlot)}"></span>
                ${escapeHtml(lane.title)}
                <span class="pgrid-lib-ct">${cards.length}</span>
              </div>
              ${cards.map((c) => `
                <div class="pgrid-mini pgrid-mini--${escapeHtml(colorSlot)} ${c.id === appState.selection.plotCardId ? "is-active" : ""}"
                  data-action="select-plot-card" data-id="${escapeHtml(c.id)}"
                  draggable="true" data-drag-plot-id="${escapeHtml(c.id)}">
                  <div class="pgrid-mini-title">${escapeHtml(c.title || "未命名剧情卡")}</div>
                  <div class="pgrid-mini-meta">${escapeHtml(getActTitle(c.act_id))} · ${escapeHtml(getNode(c.node_id)?.title || "未挂节点")}</div>
                </div>`).join("")}
            </div>`;
        }).join("")}
        ${unplaced.length > 0 ? `
          <div class="pgrid-lib-group pgrid-lib-group--unplaced">
            <div class="pgrid-lib-group-head">未归位 <span class="pgrid-lib-ct pgrid-lib-ct--accent">${unplaced.length}</span></div>
            ${unplaced.map((c) => `
              <div class="pgrid-mini ${c.id === appState.selection.plotCardId ? "is-active" : ""}"
                data-action="select-plot-card" data-id="${escapeHtml(c.id)}"
                draggable="true" data-drag-plot-id="${escapeHtml(c.id)}">
                <div class="pgrid-mini-title">${escapeHtml(c.title || "未命名剧情卡")}</div>
                <div class="pgrid-mini-meta">未挂载 · 拖入画布</div>
              </div>`).join("")}
          </div>` : ""}
      </div>
    </aside>`;
}

function renderEditorDrawer(appState, selectedCard, lanes, orderedActs, scenarioGroups, activeScenarioGroup) {
  if (!selectedCard) return "";
  return `
    <div class="plot-editor-drawer ${appState.plotEditorOpen ? "is-open" : ""}" ${appState.plotEditorOpen ? "" : "hidden"}>
      <button class="plot-editor-drawer__scrim" type="button" data-action="close-plot-editor" aria-label="关闭剧情卡编辑"></button>
      <section class="plot-editor-drawer__panel">
        <div class="list-card__head">
          <div>
            <p class="section-label">完整编辑</p>
            <h3>${escapeHtml(selectedCard.title || "未命名剧情卡")}</h3>
          </div>
          <button class="button button--ghost button--tiny" type="button" data-action="close-plot-editor">收起</button>
        </div>
        <div class="plot-editor-drawer__body">
          <div class="inline-actions">
            <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="-1">前移</button>
            <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="1">后移</button>
            <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "解除锁定" : "锁定"}</button>
            <button class="button button--ghost button--tiny" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">生成场景</button>
            <button class="button button--ghost button--tiny" type="button" data-action="delete-plot-card" data-id="${escapeHtml(selectedCard.id)}">删除</button>
          </div>
          <div class="form-grid">
            ${inputField("标题", "plot-field", "title", selectedCard.title)}
            ${field("所在轨道", `<select data-action="plot-lane-field" data-field="lane_id">${lanes.map((l) => `<option value="${escapeHtml(l.id)}" ${l.id === selectedCard.lane_id ? "selected" : ""}>${escapeHtml(l.title)}</option>`).join("")}</select>`)}
            ${field("所在幕", `<select data-action="plot-position-field" data-field="act_id">${orderedActs.map((a) => `<option value="${escapeHtml(a.id)}" ${a.id === selectedCard.act_id ? "selected" : ""}>${escapeHtml(a.title)}</option>`).join("")}</select>`)}
            ${selectField("叙事层级", "plot-field", "type", selectedCard.type, Object.entries(plotTypeLabels))}
            ${selectField("当前状态", "plot-field", "status", selectedCard.status, Object.entries(plotStatusLabels))}
            ${selectedCard.lane_kind === "scenario" ? field("方案组", `<select data-action="plot-scenario-field" data-field="scenario_group_id">${scenarioGroups.map((g) => `<option value="${escapeHtml(g.id)}" ${g.id === selectedCard.scenario_group_id ? "selected" : ""}>${escapeHtml(g.title)}</option>`).join("")}</select>`) : ""}
            ${textareaField("内容摘要", "plot-field", "summary", selectedCard.summary, { rows: 4 })}
            ${textareaField("戏剧问题", "plot-field", "dramatic_question", selectedCard.dramatic_question, { rows: 3 })}
            ${textareaField("核心冲突", "plot-field", "conflict", selectedCard.conflict, { rows: 3 })}
            ${textareaField("发生了什么变化", "plot-field", "change", selectedCard.change, { rows: 3 })}
            ${textareaField("备注", "plot-field", "notes", selectedCard.notes, { rows: 3 })}
            ${field("影响角色", renderCharacterChecklist(appState, selectedCard.character_ids), true)}
          </div>
          <div class="plot-trope-section">
            <p class="section-label">情节套路</p>
            <div class="chip-wrap">
              ${PLOT_TROPE_OPTIONS.map((t) => `<button class="ref-chip ${list(selectedCard.trope_tags).includes(t) ? "is-active" : ""}" type="button" data-action="toggle-plot-trope" data-id="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}
            </div>
          </div>
          <div class="plot-element-section">
            <p class="section-label">情节元件库</p>
            <div class="element-group">
              <p class="element-group__label">情节装置 / 麦高芬</p>
              <div class="chip-wrap">${PLOT_MACGUFFIN_OPTIONS.map((m) => `<button class="ref-chip ${m === (selectedCard.macguffin ?? "") ? "is-active" : ""}" type="button" data-action="select-plot-macguffin" data-id="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("")}</div>
            </div>
            <div class="element-group">
              <p class="element-group__label">催化剂 / 激励事件</p>
              <div class="chip-wrap">${PLOT_CATALYST_OPTIONS.map((c) => `<button class="ref-chip ${c === (selectedCard.catalyst_type ?? "") ? "is-active" : ""}" type="button" data-action="select-plot-catalyst" data-id="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>
            </div>
            <div class="element-row">
              <div class="element-group">
                <p class="element-group__label">冲突类型（多选）</p>
                <div class="chip-wrap">${PLOT_CONFLICT_TYPE_OPTIONS.map((c) => `<button class="ref-chip ${list(selectedCard.conflict_types).includes(c) ? "is-active" : ""}" type="button" data-action="toggle-plot-conflict" data-id="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>
              </div>
              <div class="element-group">
                <p class="element-group__label">转折与揭示（多选）</p>
                <div class="chip-wrap">${PLOT_TWIST_OPTIONS.map((t) => `<button class="ref-chip ${list(selectedCard.twist_types).includes(t) ? "is-active" : ""}" type="button" data-action="toggle-plot-twist" data-id="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>`;
}

export function renderPlotsPage(dom, appState, {
  getPlotCard, getPlotLane, getVisibleLanes, getScenarioGroups, getActiveScenarioGroup,
  getPlotLinkedRelationships, getPlotLinkedScenes, getPlotLinkedTimelineEvents,
  getOrderedActs, getOrderedNodes, getActTitle, getNode, getCharacterNameById
}) {
  if (!dom.plotsContent) return;

  const selectedCard = getPlotCard();
  const allCards = list(appState.project.plot_board?.cards);
  const lanes = getVisibleLanes();
  const orderedActs = getOrderedActs();
  const scenarioGroups = getScenarioGroups();
  const activeScenarioGroup = getActiveScenarioGroup();

  const relatedCharacters = selectedCard
    ? list(appState.project.character_hub?.characters).filter((ch) => list(selectedCard.character_ids).includes(ch.id))
    : [];
  const relatedRelationships = getPlotLinkedRelationships(selectedCard);
  const relatedScenes = getPlotLinkedScenes(selectedCard);
  const relatedTimeline = getPlotLinkedTimelineEvents(selectedCard);

  dom.plotsContent.innerHTML = `
    <div class="pgrid-workbench">

      <!-- 主画布 -->
      <div class="pgrid-canvas-wrap">
        <div class="pgrid-toolbar">
          <button class="button button--primary button--small" data-action="add-plot-card">+ 新建剧情卡</button>
          <span class="pgrid-toolbar-info">${allCards.length} 张卡 · ${lanes.length} 条轨道 · ${orderedActs.length} 幕</span>
          ${selectedCard ? `<span class="pgrid-toolbar-sel">已选：${escapeHtml(selectedCard.title || "未命名")}</span>` : ""}
          ${selectedCard ? `<button class="button button--ghost button--small" data-action="open-plot-editor">编辑详情</button>` : ""}
        </div>
        ${renderGrid(appState, lanes, orderedActs, allCards, { getOrderedNodes, getPlotLane })}
      </div>

      <!-- 右侧卡片库 -->
      ${renderLibraryPanel(appState, allCards, lanes, { getPlotLane, getActTitle, getNode })}

      <!-- 选中卡片底部速查条 -->
      ${selectedCard ? `
        <div class="pgrid-inspector-bar">
          <div class="pgrid-inspector-bar__info">
            <strong>${escapeHtml(selectedCard.title || "未命名剧情卡")}</strong>
            <span>${escapeHtml(getActTitle(selectedCard.act_id))} · ${escapeHtml(getNode(selectedCard.node_id)?.title || "未挂节点")}</span>
            ${selectedCard.summary ? `<span class="pgrid-inspector-bar__summary">${escapeHtml(selectedCard.summary)}</span>` : ""}
          </div>
          <div class="pgrid-inspector-bar__actions">
            <button class="button button--ghost button--small" data-action="open-plot-editor">完整编辑</button>
            <button class="button button--ghost button--small" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "解锁" : "锁定"}</button>
            <button class="button button--ghost button--small" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">生成场景</button>
            ${relatedCharacters.length > 0 ? `<span class="pgrid-inspector-bar__chars">${relatedCharacters.map((c) => escapeHtml(c.name)).join("、")}</span>` : ""}
          </div>
        </div>` : ""}

      <!-- 编辑抽屉 -->
      ${renderEditorDrawer(appState, selectedCard, lanes, orderedActs, scenarioGroups, activeScenarioGroup)}

    </div>
  `;
}
