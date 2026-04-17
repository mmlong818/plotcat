import { escapeHtml, inputField, textareaField, selectField, field, list, renderEmptyState } from "../utils.js";
import { plotTypeLabels, plotStatusLabels, storyRoleLabels, PLOT_TROPE_OPTIONS, PLOT_MACGUFFIN_OPTIONS, PLOT_CATALYST_OPTIONS, PLOT_CONFLICT_TYPE_OPTIONS, PLOT_TWIST_OPTIONS } from "../state.js";

function plotStatusDot(status) {
  const map = { draft: "draft", exploring: "active", review: "review", locked: "locked", discarded: "discard" };
  const cls = map[status] ?? "draft";
  return `<span class="status-dot status-dot--${cls}"></span>`;
}

function renderCharacterChecklist(appState, selectedIds = []) {
  const selected = new Set(list(selectedIds));
  return `
    <div class="check-list">
      ${list(appState.project.character_hub?.characters)
        .map(
          (character) => `
            <label class="check-list__item">
              <input
                type="checkbox"
                data-action="plot-character-toggle"
                data-id="${escapeHtml(character.id)}"
                ${selected.has(character.id) ? "checked" : ""}
              />
              <span>${escapeHtml(character.name)}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPlotCardChip(appState, card, { getPlotLane, getActTitle, getNode }, options = {}) {
  const lane = getPlotLane(card.lane_id);
  const showAct = options.showAct ?? false;
  const showNode = options.showNode ?? false;
  return `
    <button
      class="plot-note plot-note--v2 ${card.id === appState.selection.plotCardId ? "is-active" : ""}"
      type="button"
      draggable="true"
      data-action="select-plot-card"
      data-id="${escapeHtml(card.id)}"
      data-drag-plot-id="${escapeHtml(card.id)}"
    >
      <div class="plot-note__head">
        <span class="plot-lane-tag plot-lane-tag--${escapeHtml(lane?.color_slot ?? "main")}">${escapeHtml(lane?.title ?? "轨道")}</span>
      </div>
      <strong>${escapeHtml(card.title || "未命名剧情卡")}</strong>
      <div class="plot-note__meta-group">
        <span class="plot-note__meta">
          ${showAct ? escapeHtml(getActTitle(card.act_id)) : ""}
          ${showAct && showNode ? " · " : ""}
          ${showNode ? escapeHtml(getNode(card.node_id)?.title || "未挂节点") : ""}
        </span>
        <span class="plot-note__status">${plotStatusDot(card.status)}${escapeHtml(plotStatusLabels[card.status] ?? card.status)}</span>
      </div>
    </button>
  `;
}

function renderStructureViewBoard(appState, cards, lanes, { getOrderedActs, getOrderedNodes, getPlotLane, getActTitle, getNode }) {
  const acts = getOrderedActs();
  return `
    <section class="plot-structure-board">
      ${acts
        .map((act) => {
          const actNodes = getOrderedNodes(act.id);
          return `
            <article class="plot-act-column">
              <div class="plot-act-column__head">
                <div>
                  <h3>${escapeHtml(act.title)}</h3>
                  <p>${escapeHtml(act.purpose)}</p>
                </div>
                <span class="chip chip--soft">${escapeHtml(act.range_label)}</span>
              </div>
              <div class="plot-node-stack">
                ${actNodes
                  .map((node, nodeIndex) => `
                    <section class="plot-node-block">
                      <div class="plot-node-block__head">
                        <div>
                          <h4>${nodeIndex + 1}. ${escapeHtml(node.title)}</h4>
                          <p>${node.required ? "必要节点" : "可选节点"}</p>
                        </div>
                        <button class="button button--ghost button--tiny" type="button" data-action="add-plot-card" data-node-id="${escapeHtml(node.id)}">新增卡片</button>
                      </div>
                      <div class="plot-node-lanes">
                        ${lanes
                          .filter((lane) => {
                            if (lane.kind !== "scenario") return true;
                            return cards.some((card) => card.node_id === node.id && card.lane_id === lane.id);
                          })
                          .map((lane) => {
                            const laneCards = cards
                              .filter((card) => card.node_id === node.id && card.lane_id === lane.id)
                              .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
                            return `
                              <div class="plot-lane-strip plot-lane-strip--${escapeHtml(lane.color_slot)}" data-plot-dropzone="node" data-node-id="${escapeHtml(node.id)}" data-act-id="${escapeHtml(act.id)}" data-lane-id="${escapeHtml(lane.id)}">
                                <div class="plot-lane-strip__label">
                                  <span class="plot-lane-dot plot-lane-dot--${escapeHtml(lane.color_slot)}"></span>
                                  <span>${escapeHtml(lane.title)}</span>
                                </div>
                                <div class="plot-lane-strip__cards">
                                  ${laneCards.length === 0 ? `<div class="plot-drop-hint">拖到这里</div>` : laneCards.map((card) => renderPlotCardChip(appState, card, { getPlotLane, getActTitle, getNode }, { showAct: false, showNode: false })).join("")}
                                </div>
                              </div>
                            `;
                          })
                          .join("")}
                      </div>
                    </section>
                  `)
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

function renderRehearsalViewBoard(appState, cards, lanes, { getOrderedActs, getPlotLane, getActTitle, getNode }) {
  const acts = getOrderedActs();
  return `
    <section class="plot-rehearsal-board">
      <div class="plot-rehearsal-head">
        <div class="plot-rehearsal-head__corner">轨道</div>
        <div class="plot-rehearsal-head__acts">
          ${acts.map((act) => `<div class="plot-act-chip">${escapeHtml(act.title)}</div>`).join("")}
        </div>
      </div>
      <div class="plot-track-list">
        ${lanes
          .map((lane) => `
            <section class="plot-track plot-track--${escapeHtml(lane.color_slot)}">
              <div class="plot-track__label">
                <div>
                  <h3>${escapeHtml(lane.title)}</h3>
                  <p>${lane.kind === "scenario" ? "方案比较轨" : lane.kind === "undefined" ? "临时归档区" : "正式叙事轨"}</p>
                </div>
              </div>
              <div class="plot-track__acts">
                ${acts
                  .map((act) => {
                    const laneCards = cards
                      .filter((card) => card.lane_id === lane.id && card.act_id === act.id)
                      .sort((left, right) => (left.order_index ?? 9999) - (right.order_index ?? 9999));
                    return `
                      <div class="plot-track__cell" data-plot-dropzone="lane" data-lane-id="${escapeHtml(lane.id)}" data-act-id="${escapeHtml(act.id)}">
                        ${laneCards.length === 0 ? `<div class="plot-drop-hint">拖到这里</div>` : laneCards.map((card) => renderPlotCardChip(appState, card, { getPlotLane, getActTitle, getNode }, { showAct: false, showNode: true })).join("")}
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderScenarioGroupToolbar(appState, groups) {
  if (groups.length <= 1) {
    return "";
  }
  return `
    <div class="plot-toolbar__row plot-toolbar__row--scenario">
      <span class="section-label">方案分组</span>
      <div class="choice-chip-row">
        ${groups
          .map(
            (group) => `
              <button
                class="choice-chip ${group.id === appState.activeScenarioGroupId ? "is-active" : ""}"
                type="button"
                data-action="set-scenario-group"
                data-id="${escapeHtml(group.id)}"
              >
                ${escapeHtml(group.title)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

export function renderPlotsPage(dom, appState, {
  getPlotCard, getPlotLane, getVisibleLanes, getScenarioGroups, getActiveScenarioGroup,
  getPlotLinkedRelationships, getPlotLinkedScenes, getPlotLinkedTimelineEvents,
  getOrderedActs, getOrderedNodes, getActTitle, getNode, getCharacterNameById
}) {
  if (!dom.plotsContent) {
    return;
  }
  const selectedCard = getPlotCard();
  const isRehearsalView = appState.plotBoardView === "rehearsal";
  const contextVisible = !isRehearsalView || appState.plotContextVisible;
  const allCards = list(appState.project.plot_board?.cards);
  const cards = allCards;
  const lanes = getVisibleLanes();
  const scenarioGroups = getScenarioGroups();
  const activeScenarioGroup = getActiveScenarioGroup();
  const relatedCharacters = selectedCard
    ? list(appState.project.character_hub?.characters).filter((character) => list(selectedCard.character_ids).includes(character.id))
    : [];
  const relatedRelationships = getPlotLinkedRelationships(selectedCard);
  const relatedScenes = getPlotLinkedScenes(selectedCard);
  const relatedTimeline = getPlotLinkedTimelineEvents(selectedCard);
  const orderedActs = getOrderedActs();
  const actOrder = new Map(orderedActs.map((act, index) => [act.id, act.order_index ?? index + 1]));
  const cardsForRail = cards
    .filter((card) => appState.plotFilter === "all" || card.lane_kind === appState.plotFilter)
    .slice()
    .sort((left, right) => {
      const leftAct = actOrder.get(left.act_id) ?? 9999;
      const rightAct = actOrder.get(right.act_id) ?? 9999;
      if (leftAct !== rightAct) return leftAct - rightAct;
      return (left.order_index ?? 9999) - (right.order_index ?? 9999);
    });
  const libraryTitle =
    appState.plotFilter === "canonical_mainline"
      ? "主线卡"
      : appState.plotFilter === "subplot"
        ? "支线卡"
        : appState.plotFilter === "scenario"
          ? "方案卡"
          : appState.plotFilter === "undefined"
            ? "未定义卡"
            : "全部剧情卡";

  const gettersForChip = { getPlotLane, getActTitle, getNode };

  const editorDrawer = !selectedCard
    ? ""
    : `
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
            <div class="summary-strip">
              <span class="chip chip--soft">${escapeHtml(getPlotLane(selectedCard.lane_id)?.title ?? "未归类")}</span>
              <span class="chip chip--soft">${escapeHtml(getActTitle(selectedCard.act_id))}</span>
              <span class="chip chip--soft">${escapeHtml(getNode(selectedCard.node_id)?.title ?? "未挂节点")}</span>
              <span class="chip chip--soft">${escapeHtml(plotStatusLabels[selectedCard.status] ?? selectedCard.status)}</span>
            </div>
            ${
              selectedCard.lane_kind === "scenario" && activeScenarioGroup
                ? `<div class="issue__hint">当前方案组：${escapeHtml(activeScenarioGroup.title)}</div>`
                : ""
            }
            <div class="inline-actions">
              <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="-1">前移</button>
              <button class="button button--ghost button--tiny" type="button" data-action="move-plot-card-position" data-id="${escapeHtml(selectedCard.id)}" data-direction="1">后移</button>
              <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "解除锁定" : "锁定这张卡"}</button>
              <button class="button button--ghost button--tiny" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">生成一场</button>
              <button class="button button--ghost button--tiny" type="button" data-action="delete-plot-card" data-id="${escapeHtml(selectedCard.id)}">删除</button>
            </div>
            <div class="form-grid">
              ${inputField("标题", "plot-field", "title", selectedCard.title)}
              ${field(
                "所在轨道",
                `<select data-action="plot-lane-field" data-field="lane_id">${lanes
                  .map((lane) => `<option value="${escapeHtml(lane.id)}" ${lane.id === selectedCard.lane_id ? "selected" : ""}>${escapeHtml(lane.title)}</option>`)
                  .join("")}</select>`
              )}
              ${field(
                "所在幕",
                `<select data-action="plot-position-field" data-field="act_id">${orderedActs
                  .map((act) => `<option value="${escapeHtml(act.id)}" ${act.id === selectedCard.act_id ? "selected" : ""}>${escapeHtml(act.title)}</option>`)
                  .join("")}</select>`
              )}
              ${selectField("叙事层级", "plot-field", "type", selectedCard.type, Object.entries(plotTypeLabels))}
              ${selectField("当前状态", "plot-field", "status", selectedCard.status, Object.entries(plotStatusLabels))}
              ${
                selectedCard.lane_kind === "scenario"
                  ? field(
                      "方案组",
                      `<select data-action="plot-scenario-field" data-field="scenario_group_id">${scenarioGroups
                        .map((group) => `<option value="${escapeHtml(group.id)}" ${group.id === selectedCard.scenario_group_id ? "selected" : ""}>${escapeHtml(group.title)}</option>`)
                        .join("")}</select>`
                    )
                  : ""
              }
              ${textareaField("这张卡讲什么", "plot-field", "summary", selectedCard.summary, { rows: 4 })}
              ${textareaField("戏剧问题", "plot-field", "dramatic_question", selectedCard.dramatic_question, { rows: 3 })}
              ${textareaField("核心冲突", "plot-field", "conflict", selectedCard.conflict, { rows: 3 })}
              ${textareaField("发生了什么变化", "plot-field", "change", selectedCard.change, { rows: 3 })}
              ${textareaField("备注", "plot-field", "notes", selectedCard.notes, { rows: 3 })}
              ${field("影响角色", renderCharacterChecklist(appState, selectedCard.character_ids), true)}
            </div>
            <div class="plot-trope-section">
              <p class="section-label">情节套路 <span class="section-label__hint">（多选标记）</span></p>
              <div class="chip-wrap">
                ${PLOT_TROPE_OPTIONS.map((t) => `
                  <button class="ref-chip ${list(selectedCard.trope_tags).includes(t) ? "is-active" : ""}"
                    type="button" data-action="toggle-plot-trope" data-id="${escapeHtml(t)}">
                    ${escapeHtml(t)}
                  </button>
                `).join("")}
              </div>
            </div>
            <div class="plot-element-section">
              <p class="section-label">情节元件库 <span class="section-label__hint">（快速标记，可选）</span></p>
              <div class="element-group">
                <p class="element-group__label">情节装置 / 麦高芬</p>
                <div class="chip-wrap">
                  ${PLOT_MACGUFFIN_OPTIONS.map((m) => `
                    <button class="ref-chip ${m === (selectedCard.macguffin ?? "") ? "is-active" : ""}"
                      type="button" data-action="select-plot-macguffin" data-id="${escapeHtml(m)}">
                      ${escapeHtml(m)}
                    </button>
                  `).join("")}
                </div>
              </div>
              <div class="element-group">
                <p class="element-group__label">催化剂 / 激励事件</p>
                <div class="chip-wrap">
                  ${PLOT_CATALYST_OPTIONS.map((c) => `
                    <button class="ref-chip ${c === (selectedCard.catalyst_type ?? "") ? "is-active" : ""}"
                      type="button" data-action="select-plot-catalyst" data-id="${escapeHtml(c)}">
                      ${escapeHtml(c)}
                    </button>
                  `).join("")}
                </div>
              </div>
              <div class="element-row">
                <div class="element-group">
                  <p class="element-group__label">冲突类型（多选）</p>
                  <div class="chip-wrap">
                    ${PLOT_CONFLICT_TYPE_OPTIONS.map((c) => `
                      <button class="ref-chip ${list(selectedCard.conflict_types).includes(c) ? "is-active" : ""}"
                        type="button" data-action="toggle-plot-conflict" data-id="${escapeHtml(c)}">
                        ${escapeHtml(c)}
                      </button>
                    `).join("")}
                  </div>
                </div>
                <div class="element-group">
                  <p class="element-group__label">转折与揭示（多选）</p>
                  <div class="chip-wrap">
                    ${PLOT_TWIST_OPTIONS.map((t) => `
                      <button class="ref-chip ${list(selectedCard.twist_types).includes(t) ? "is-active" : ""}"
                        type="button" data-action="toggle-plot-twist" data-id="${escapeHtml(t)}">
                        ${escapeHtml(t)}
                      </button>
                    `).join("")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

  dom.plotsContent.innerHTML = `
    <section class="plot-workbench plot-workbench--triple plot-workbench--studio ${contextVisible ? "" : "plot-workbench--context-hidden"}">
      <aside class="workbench-pane workbench-pane--rail workbench-pane--rail-nav">
        <div class="summary-card plot-nav-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">剧情导航</p>
              <h3>卡池分类</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-plot-card">新增剧情卡</button>
          </div>
          <div class="plot-nav-list">
            ${[
              ["all", "全部剧情卡", allCards.length],
              ["canonical_mainline", "主线卡", allCards.filter((card) => card.lane_kind === "canonical_mainline").length],
              ["subplot", "支线卡", allCards.filter((card) => card.lane_kind === "subplot").length],
              ["scenario", "方案卡", allCards.filter((card) => card.lane_kind === "scenario").length],
              ["undefined", "未定义卡", allCards.filter((card) => card.lane_kind === "undefined").length]
            ]
              .map(([value, label, count]) => `
                  <button
                    class="choice-chip choice-chip--nav ${appState.plotFilter === value ? "is-active" : ""}"
                    type="button"
                    data-action="set-plot-filter"
                    data-id="${escapeHtml(value)}"
                  >
                    <span>${escapeHtml(label)}</span>
                    <strong>${count}</strong>
                  </button>
                `)
              .join("")}
          </div>
        </div>
        <div class="summary-card plot-stat-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">卡池统计</p>
              <h3>剧情卡分布</h3>
            </div>
          </div>
          <div class="plot-stat-list">
            <div class="plot-stat-row"><span>主线卡</span><strong>${allCards.filter((card) => card.lane_kind === "canonical_mainline").length}</strong></div>
            <div class="plot-stat-row"><span>支线卡</span><strong>${allCards.filter((card) => card.lane_kind === "subplot").length}</strong></div>
            <div class="plot-stat-row"><span>方案卡</span><strong>${allCards.filter((card) => card.lane_kind === "scenario").length}</strong></div>
            <div class="plot-stat-row"><span>未定义卡</span><strong>${allCards.filter((card) => card.lane_kind === "undefined").length}</strong></div>
          </div>
        </div>
      </aside>
      <aside class="workbench-pane workbench-pane--library">
        <div class="summary-card plot-library-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">剧情卡池</p>
              <h3>${libraryTitle}</h3>
            </div>
            <span class="chip chip--soft">${cardsForRail.length} 张</span>
          </div>
          ${
            cardsForRail.length === 0
              ? renderEmptyState("当前分类下还没有剧情卡。")
              : `
                <div class="plot-rail-card-list plot-library-list">
                  ${cardsForRail
                    .map((card) => renderPlotCardChip(appState, card, gettersForChip, { showAct: true, showNode: true }))
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card plot-workbench__toolbar">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>剧情排布</h3>
            </div>
            <div class="plot-workbench__head-tools">
              <div class="choice-chip-row">
                <button class="choice-chip ${appState.plotBoardView === "structure" ? "is-active" : ""}" type="button" data-action="set-plot-view" data-id="structure">结构视图</button>
                <button class="choice-chip ${appState.plotBoardView === "rehearsal" ? "is-active" : ""}" type="button" data-action="set-plot-view" data-id="rehearsal">排演视图</button>
              </div>
              ${isRehearsalView ? renderScenarioGroupToolbar(appState, scenarioGroups) : ""}
              ${
                isRehearsalView
                  ? `
                    <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-context">
                      ${contextVisible ? "隐藏速查区" : "显示速查区"}
                    </button>
                  `
                  : ""
              }
              ${
                selectedCard
                  ? `<span class="chip chip--soft">${escapeHtml(selectedCard.title || "未命名剧情卡")}</span>`
                  : `<span class="chip chip--soft">先选中一张剧情卡</span>`
              }
            </div>
          </div>
        </div>
        <div class="plot-board-panel">
          ${
            appState.plotBoardView === "structure"
              ? renderStructureViewBoard(appState, cards, lanes, { getOrderedActs, getOrderedNodes, getPlotLane, getActTitle, getNode })
              : renderRehearsalViewBoard(appState, cards, lanes, { getOrderedActs, getPlotLane, getActTitle, getNode })
          }
        </div>
      </div>
      <aside class="workbench-pane workbench-pane--context">
        <div class="summary-card plot-inspector__lead">
          <div class="list-card__head">
            <div>
              <p class="section-label">当前检视</p>
              <h3>${selectedCard ? escapeHtml(selectedCard.title || "未命名剧情卡") : "未选中剧情卡"}</h3>
            </div>
            ${
              selectedCard
                ? `<span class="chip chip--soft">${escapeHtml(plotStatusLabels[selectedCard.status] ?? selectedCard.status)}</span>`
                : ""
            }
          </div>
          ${
            !selectedCard
              ? renderEmptyState("先选中一张剧情卡。")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${escapeHtml(getPlotLane(selectedCard.lane_id)?.title ?? "未归类")}</span>
                  <span class="chip chip--soft">${escapeHtml(getActTitle(selectedCard.act_id))}</span>
                  <span class="chip chip--soft">${escapeHtml(getNode(selectedCard.node_id)?.title ?? "未挂节点")}</span>
                </div>
                ${
                  selectedCard.lane_kind === "scenario" && activeScenarioGroup
                    ? `<div class="issue__hint">当前方案组：${escapeHtml(activeScenarioGroup.title)}</div>`
                    : ""
                }
                <div class="plot-inspector__summary">
                  <p>${escapeHtml(selectedCard.summary || "这张剧情卡还没有摘要。")}</p>
                </div>
                <div class="inline-actions">
                  <button class="button button--ghost button--tiny" type="button" data-action="open-plot-editor">打开完整编辑</button>
                  <button class="button button--ghost button--tiny" type="button" data-action="toggle-plot-lock" data-id="${escapeHtml(selectedCard.id)}">${selectedCard.status === "locked" ? "解除锁定" : "锁定这张卡"}</button>
                  <button class="button button--ghost button--tiny" type="button" data-action="scene-from-plot" data-id="${escapeHtml(selectedCard.id)}">生成一场</button>
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>关联角色</h3>
            <span class="chip chip--soft">${relatedCharacters.length} 人</span>
          </div>
          ${
            relatedCharacters.length === 0
              ? renderEmptyState("这张剧情卡还没有关联角色。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedCharacters
                    .map(
                      (character) => `
                        <button class="list-select" type="button" data-action="jump-to-character" data-id="${escapeHtml(character.id)}">
                          <strong>${escapeHtml(character.name || "未命名人物")}</strong>
                          ${(() => { const roleLabel = storyRoleLabels[character.story_role] ?? character.story_role; return roleLabel && roleLabel !== character.name ? `<span>${escapeHtml(roleLabel)}</span>` : ""; })()}
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>共现关系</h3>
            <span class="chip chip--soft">${relatedRelationships.length} 条</span>
          </div>
          ${
            relatedRelationships.length === 0
              ? renderEmptyState("这张剧情卡暂时还没有形成明确关系。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedRelationships
                    .map(
                      (relationship) => `
                        <button class="list-select" type="button" data-action="jump-to-relationship" data-id="${escapeHtml(relationship.id)}">
                          <strong>${escapeHtml(getCharacterNameById(relationship.source_character_id))} · ${escapeHtml(getCharacterNameById(relationship.target_character_id))}</strong>
                          <span>${escapeHtml(relationship.relationship_type || "未命名关系")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>已拆场景</h3>
            <span class="chip chip--soft">${relatedScenes.length} 场</span>
          </div>
          ${
            relatedScenes.length === 0
              ? renderEmptyState("这张剧情卡还没有拆成场景。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedScenes
                    .map(
                      (scene) => `
                        <button class="list-select" type="button" data-action="jump-to-scene" data-id="${escapeHtml(scene.id)}">
                          <strong>${escapeHtml(scene.order_index)} · ${escapeHtml(scene.title || "未命名场景")}</strong>
                          <span>${escapeHtml(scene.location || "未定地点")} · ${escapeHtml(scene.time_of_day || "未定时段")}</span>
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
        <div class="summary-card">
          <div class="list-card__head">
            <h3>时间线线索</h3>
            <span class="chip chip--soft">${relatedTimeline.length} 条</span>
          </div>
          ${
            relatedTimeline.length === 0
              ? renderEmptyState("当前还没有可引用的时间线线索。")
              : `
                <div class="stack plot-inspector__list">
                  ${relatedTimeline
                    .map(
                      (event) => `
                        <div class="list-select list-select--static">
                          <strong>第 ${escapeHtml(event.story_day || "?")} 天 · ${escapeHtml(event.summary || "未命名事件")}</strong>
                          <span>${escapeHtml(event.location || "未定地点")} · ${escapeHtml(event.trigger || "未定触发")}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
      ${editorDrawer}
    </section>
  `;
}
