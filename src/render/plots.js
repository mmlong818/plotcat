import { escapeHtml, list } from "../utils.js";
import { plotTypeLabels, plotStatusLabels, PLOT_TROPE_OPTIONS, PLOT_MACGUFFIN_OPTIONS, PLOT_CATALYST_OPTIONS, PLOT_CONFLICT_TYPE_OPTIONS, PLOT_TWIST_OPTIONS } from "../state.js";

const STATUS_LABELS = {
  draft: "草稿", exploring: "探索中", review: "待审", locked: "已锁定", discarded: "废弃",
};
const STATUS_CLASS = {
  draft: "pgs-draft", exploring: "pgs-explore", review: "pgs-review", locked: "pgs-locked", discarded: "pgs-discard",
};

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
      <div class="pgrid-card__quick">
        <button class="pgrid-card__qbtn" type="button" data-action="open-plot-editor" data-id="${escapeHtml(card.id)}" title="完整编辑">编辑</button>
        <button class="pgrid-card__qbtn" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(card.id)}" title="${card.status === "locked" ? "解锁" : "锁定"}">${card.status === "locked" ? "解锁" : "锁定"}</button>
        <button class="pgrid-card__qbtn" type="button" data-action="scene-from-plot" data-id="${escapeHtml(card.id)}" title="生成场景">生成场景</button>
      </div>
    </div>`;
}

function renderGrid(appState, lanes, acts, allCards, { getOrderedNodes, getPlotLane }) {
  // Build column list: [{actId, node, isEmpty}]
  const cols = acts.flatMap((act) => getOrderedNodes(act.id).map((node) => {
    const isEmpty = !allCards.some((c) => c.node_id === node.id);
    return { actId: act.id, node, isEmpty };
  }));

  if (cols.length === 0) {
    return `<div class="pgrid-empty">尚未生成结构节点，请先在「结构骨架」步骤建立幕与节点。</div>`;
  }

  // Act header spans
  const actSpans = acts.map((act) => ({ act, span: getOrderedNodes(act.id).length })).filter((s) => s.span > 0);

  // Row 1: act headers — 决议 5：每个 act 展开成 N 个 cell，让表头视觉上"跨"满它的所有节点列
  const row1Cells = actSpans.map(({ act, span }, idx) => {
    const isLast = idx === actSpans.length - 1;
    const head = `<div class="pgrid-hcell pgrid-hcell--act pgrid-hcell--act-head"><span class="pgrid-act-title">${escapeHtml(act.title)}</span><span class="pgrid-chip">${span} 节点</span></div>`;
    const fillers = Array.from({ length: span - 1 }, (_, i) => {
      const isActLastCell = i === span - 2; // 仅最后一个 filler 画分幕粗线
      return `<div class="pgrid-hcell pgrid-hcell--act pgrid-hcell--act-fill ${!isLast && isActLastCell ? "pgrid-hcell--act-end" : ""}"></div>`;
    }).join("");
    // 单 cell 幕（span=1）：head 直接当作 act-end
    const headWithEnd = span === 1
      ? `<div class="pgrid-hcell pgrid-hcell--act pgrid-hcell--act-head ${isLast ? "" : "pgrid-hcell--act-end"}"><span class="pgrid-act-title">${escapeHtml(act.title)}</span><span class="pgrid-chip">${span} 节点</span></div>`
      : head + fillers;
    return headWithEnd;
  }).join("");

  // Row 2: node name headers (with delete button)
  const row2Cells = cols.map(({ actId, node, isEmpty }, idx) => {
    const isActEnd = idx < cols.length - 1 && cols[idx + 1].actId !== actId;
    const emptyCls = isEmpty ? "pgrid-col--empty" : "";
    return `
      <div class="pgrid-hcell pgrid-hcell--node ${isActEnd ? "pgrid-hcell--act-end" : ""} ${emptyCls}">
        <span class="pgrid-node-seq">${String(idx + 1).padStart(2, "0")}</span>
        <span class="pgrid-node-title">${escapeHtml(node.title)}</span>
        <button class="pgrid-del-col" data-action="delete-plot-node-col" data-node-id="${escapeHtml(node.id)}" title="删除此列">✕</button>
      </div>`;
  }).join("");

  // Data rows: one per lane
  const dataRows = lanes.map((lane) => {
    const colorSlot = lane.color_slot ?? "gray";
    const cells = cols.map(({ actId, node, isEmpty }, idx) => {
      const isActEnd = idx < cols.length - 1 && cols[idx + 1].actId !== actId;
      const emptyCls = isEmpty ? "pgrid-col--empty" : "";
      const cellCards = allCards.filter((c) => c.lane_id === lane.id && c.node_id === node.id)
        .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
      return `
        <div class="pgrid-cell ${isActEnd ? "pgrid-cell--act-end" : ""} ${emptyCls}"
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
    <div class="pgrid-scroll">
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
      </div>
    </div>`;
}

function renderLibraryPanel(appState, allCards, trashedCards, lanes, { getPlotLane, getActTitle, getNode }) {
  const sorted = allCards.slice().sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
  const unplaced = allCards.filter((c) => !c.node_id || !c.act_id);
  const laneById = new Map(lanes.map((l) => [l.id, l]));
  const trashOpen = !!appState.plotTrashOpen;

  return `
    <aside class="pgrid-library pgrid-library--bottom">
      <div class="pgrid-lib-head">
        <span class="pgrid-lib-title">卡片库 <span class="pgrid-lib-ct">${allCards.length}</span></span>
        ${unplaced.length > 0 ? `<span class="pgrid-lib-unplaced-hint">未归位 ${unplaced.length}</span>` : ""}
        <button class="pgrid-lib-trash-toggle ${trashOpen ? "is-active" : ""}" type="button" data-action="toggle-plot-trash-view" title="废纸篓">
          🗑 废纸篓 ${trashedCards.length > 0 ? `<span class="pgrid-lib-trash-count">${trashedCards.length}</span>` : ""}
        </button>
        <button class="pgrid-lib-new button button--primary button--small" data-action="add-plot-card">+ 新建卡片</button>
      </div>
      <div class="pgrid-lib-body pgrid-lib-body--row">
        ${trashOpen
          ? (trashedCards.length === 0
              ? `<div class="pgrid-trash-empty">废纸篓是空的</div>`
              : trashedCards.map((c) => {
                  const lane = lanes.find((l) => l.id === c.lane_id) || { color_slot: "gray", title: "未定" };
                  return `
                    <div class="pgrid-card pgrid-card--trashed pgrid-card--${escapeHtml(lane.color_slot)}">
                      <div class="pgrid-card__top">
                        <span class="pgrid-card__lane">${escapeHtml(lane.title)}</span>
                        <span class="pgrid-card__status pgs-discard">已删除</span>
                      </div>
                      <div class="pgrid-card__title">${escapeHtml(c.title || "未命名剧情卡")}</div>
                      ${c.summary ? `<div class="pgrid-card__summary">${escapeHtml(c.summary)}</div>` : ""}
                      <div class="pgrid-trash-actions">
                        <button class="pgrid-trash-restore" type="button" data-action="restore-plot-card" data-id="${escapeHtml(c.id)}" title="恢复">↺ 恢复</button>
                        <button class="pgrid-trash-purge" type="button" data-action="purge-plot-card" data-id="${escapeHtml(c.id)}" title="永久删除">永久删除</button>
                      </div>
                    </div>`;
                }).join(""))
          : sorted.map((c) => {
              const lane = laneById.get(c.lane_id);
              return renderPCard(appState, c, lane);
            }).join("")
        }
      </div>
    </aside>`;
}

function renderEditorDrawer(appState, selectedCard, lanes, orderedActs, scenarioGroups, activeScenarioGroup, getActTitle, getNode, linkedScenes = []) {
  if (!selectedCard) return "";
  const statusCls = STATUS_CLASS[selectedCard.status] ?? "pgs-draft";
  const statusLabel = STATUS_LABELS[selectedCard.status] ?? selectedCard.status;
  const actTitle = getActTitle ? getActTitle(selectedCard.act_id) : "";
  const nodeTitle = getNode?.(selectedCard.node_id)?.title || "未挂节点";
  const lane = lanes.find((l) => l.id === selectedCard.lane_id);
  const laneColor = lane?.color_slot ?? "gray";
  const characters = list(appState.project.character_hub?.characters);
  const selectedChars = list(selectedCard.character_ids);

  return `
    <div class="plot-editor-drawer ${appState.plotEditorOpen ? "is-open" : ""}" ${appState.plotEditorOpen ? "" : "hidden"}>
      <button class="plot-editor-drawer__scrim" type="button" data-action="close-plot-editor" aria-label="关闭"></button>
      <section class="plot-editor-drawer__panel plot-edv2">
        <header class="plot-edv2__topbar">
          <nav class="plot-edv2__breadcrumb">
            <span class="plot-edv2__bc-act">${escapeHtml(actTitle || "—")}</span>
            <span class="plot-edv2__bc-sep">·</span>
            <span class="plot-edv2__bc-node">${escapeHtml(nodeTitle)}</span>
          </nav>
          <button class="plot-edv2__close" type="button" data-action="close-plot-editor" title="关闭 (Esc)">✕</button>
        </header>

        <div class="plot-edv2__body">
          <div class="plot-edv2__main">
            <input class="plot-edv2__title" type="text"
              data-action="plot-field" data-field="title"
              value="${escapeHtml(selectedCard.title)}" placeholder="未命名剧情卡…" />

            <div class="plot-edv2__field">
              <label class="plot-edv2__field-label">摘要</label>
              <textarea class="plot-edv2__input" rows="3"
                data-action="plot-field" data-field="summary"
                placeholder="一句话说清这张卡发生了什么">${escapeHtml(selectedCard.summary || "")}</textarea>
            </div>

            <div class="plot-edv2__field">
              <label class="plot-edv2__field-label">戏剧问题</label>
              <textarea class="plot-edv2__input" rows="2"
                data-action="plot-field" data-field="dramatic_question"
                placeholder="这一幕在追问什么？">${escapeHtml(selectedCard.dramatic_question || "")}</textarea>
            </div>

            <div class="plot-edv2__field">
              <label class="plot-edv2__field-label">核心冲突</label>
              <textarea class="plot-edv2__input" rows="2"
                data-action="plot-field" data-field="conflict"
                placeholder="谁挡了谁的路，挡得多狠">${escapeHtml(selectedCard.conflict || "")}</textarea>
            </div>

            <div class="plot-edv2__field">
              <label class="plot-edv2__field-label">发生了什么变化</label>
              <textarea class="plot-edv2__input" rows="2"
                data-action="plot-field" data-field="change"
                placeholder="进出这场后，世界/角色不同了哪里">${escapeHtml(selectedCard.change || "")}</textarea>
            </div>
          </div>

          <aside class="plot-edv2__side">
            <div class="plot-edv2__prop">
              <p class="plot-edv2__prop-label">状态</p>
              <div class="plot-edv2__prop-value">
                <span class="pgrid-card__status ${statusCls}" style="margin-right:6px">${escapeHtml(statusLabel)}</span>
                <select class="plot-edv2__select" data-action="plot-field" data-field="status">
                  ${Object.entries(plotStatusLabels).map(([k, label]) => `<option value="${escapeHtml(k)}" ${k === selectedCard.status ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="plot-edv2__prop">
              <p class="plot-edv2__prop-label">轨道</p>
              <div class="plot-edv2__prop-value">
                <span class="plot-edv2__lane-dot pgrid-track-dot--${escapeHtml(laneColor)}"></span>
                <select class="plot-edv2__select" data-action="plot-lane-field" data-field="lane_id">
                  ${lanes.map((l) => `<option value="${escapeHtml(l.id)}" ${l.id === selectedCard.lane_id ? "selected" : ""}>${escapeHtml(l.title)}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="plot-edv2__prop">
              <p class="plot-edv2__prop-label">所在幕</p>
              <select class="plot-edv2__select" data-action="plot-position-field" data-field="act_id">
                ${orderedActs.map((a) => `<option value="${escapeHtml(a.id)}" ${a.id === selectedCard.act_id ? "selected" : ""}>${escapeHtml(a.title)}</option>`).join("")}
              </select>
            </div>

            <div class="plot-edv2__prop">
              <p class="plot-edv2__prop-label">叙事层级</p>
              <select class="plot-edv2__select" data-action="plot-field" data-field="type">
                ${Object.entries(plotTypeLabels).map(([k, label]) => `<option value="${escapeHtml(k)}" ${k === selectedCard.type ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
              </select>
            </div>

            ${selectedCard.lane_kind === "scenario" ? `
              <div class="plot-edv2__prop">
                <p class="plot-edv2__prop-label">方案组</p>
                <select class="plot-edv2__select" data-action="plot-scenario-field" data-field="scenario_group_id">
                  ${scenarioGroups.map((g) => `<option value="${escapeHtml(g.id)}" ${g.id === selectedCard.scenario_group_id ? "selected" : ""}>${escapeHtml(g.title)}</option>`).join("")}
                </select>
              </div>
            ` : ""}

            <div class="plot-edv2__prop">
              <p class="plot-edv2__prop-label">影响角色 <span class="plot-edv2__prop-count">${selectedChars.length}</span></p>
              <div class="plot-edv2__chars">
                ${characters.length === 0 ? `<span class="plot-edv2__empty">尚无人物</span>` : characters.map((ch) => `
                  <label class="plot-edv2__char ${selectedChars.includes(ch.id) ? "is-active" : ""}">
                    <input type="checkbox" data-action="plot-character-toggle" data-id="${escapeHtml(ch.id)}" ${selectedChars.includes(ch.id) ? "checked" : ""}/>
                    <span>${escapeHtml(ch.name)}</span>
                  </label>
                `).join("")}
              </div>
            </div>

            <details class="plot-edv2__group">
              <summary>情节套路 <span class="plot-edv2__prop-count">${list(selectedCard.trope_tags).length}</span></summary>
              <div class="chip-wrap" style="margin-top:8px">
                ${PLOT_TROPE_OPTIONS.map((t) => `<button class="ref-chip ${list(selectedCard.trope_tags).includes(t) ? "is-active" : ""}" type="button" data-action="toggle-plot-trope" data-id="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}
              </div>
            </details>

            <details class="plot-edv2__group">
              <summary>情节元件</summary>
              <div class="element-group" style="margin-top:8px">
                <p class="element-group__label">情节装置 / 麦高芬</p>
                <div class="chip-wrap">${PLOT_MACGUFFIN_OPTIONS.map((m) => `<button class="ref-chip ${m === (selectedCard.macguffin ?? "") ? "is-active" : ""}" type="button" data-action="select-plot-macguffin" data-id="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("")}</div>
              </div>
              <div class="element-group">
                <p class="element-group__label">催化剂 / 激励事件</p>
                <div class="chip-wrap">${PLOT_CATALYST_OPTIONS.map((c) => `<button class="ref-chip ${c === (selectedCard.catalyst_type ?? "") ? "is-active" : ""}" type="button" data-action="select-plot-catalyst" data-id="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>
              </div>
              <div class="element-group">
                <p class="element-group__label">冲突类型</p>
                <div class="chip-wrap">${PLOT_CONFLICT_TYPE_OPTIONS.map((c) => `<button class="ref-chip ${list(selectedCard.conflict_types).includes(c) ? "is-active" : ""}" type="button" data-action="toggle-plot-conflict" data-id="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}</div>
              </div>
              <div class="element-group">
                <p class="element-group__label">转折与揭示</p>
                <div class="chip-wrap">${PLOT_TWIST_OPTIONS.map((t) => `<button class="ref-chip ${list(selectedCard.twist_types).includes(t) ? "is-active" : ""}" type="button" data-action="toggle-plot-twist" data-id="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}</div>
              </div>
            </details>

            <div class="plot-edv2__prop">
              <p class="plot-edv2__prop-label">关联场景 <span class="plot-edv2__prop-count">${linkedScenes.length}</span></p>
              <div class="plot-edv2__scenes">
                ${linkedScenes.length === 0
                  ? `<button class="plot-edv2__scene-stub" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">+ 从此卡生成场景</button>`
                  : `
                    ${linkedScenes.map((s) => `
                      <button class="plot-edv2__scene-row" type="button" data-action="jump-to-scene" data-id="${escapeHtml(s.id)}">
                        <span class="plot-edv2__scene-seq">${String(s.order_index ?? "").padStart(2, "0")}</span>
                        <span class="plot-edv2__scene-title">${escapeHtml(s.title || "未命名场景")}</span>
                        <span class="plot-edv2__scene-arrow">→</span>
                      </button>
                    `).join("")}
                    <button class="plot-edv2__scene-add" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">+ 再生成一场</button>
                  `}
              </div>
            </div>

            <details class="plot-edv2__group">
              <summary>备注</summary>
              <textarea class="plot-edv2__input" rows="3" style="margin-top:8px"
                data-action="plot-field" data-field="notes"
                placeholder="给未来的自己留点话">${escapeHtml(selectedCard.notes || "")}</textarea>
            </details>
          </aside>
        </div>

        <footer class="plot-edv2__footer">
          <div class="plot-edv2__footer-left">
            <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="-1">← 前移</button>
            <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="1">后移 →</button>
          </div>
          <div class="plot-edv2__footer-right">
            <button class="button button--ghost button--small" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "🔓 解锁" : "🔒 锁定"}</button>
            <button class="button button--ghost button--small" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">→ 生成场景</button>
            <button class="plot-edv2__danger" type="button" data-action="delete-plot-card" data-id="${escapeHtml(selectedCard.id)}">删除</button>
          </div>
        </footer>
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
  const rawCards = list(appState.project.plot_board?.cards);
  const allCards = rawCards.filter((c) => !c.deleted_at);
  const trashedCards = rawCards.filter((c) => !!c.deleted_at);
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
        ${renderGrid(appState, lanes, orderedActs, allCards, { getOrderedNodes, getPlotLane })}
      </div>

      <!-- 右侧卡片库 -->
      ${renderLibraryPanel(appState, allCards, trashedCards, lanes, { getPlotLane, getActTitle, getNode })}

      <!-- 编辑抽屉 -->
      ${renderEditorDrawer(appState, selectedCard, lanes, orderedActs, scenarioGroups, activeScenarioGroup, getActTitle, getNode, relatedScenes)}

    </div>
  `;
}
