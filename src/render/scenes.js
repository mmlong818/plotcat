import { escapeHtml, inputField, textareaField, selectField, field, list, renderEmptyState } from "../utils.js";
import { sceneStatusLabels, storyRoleLabels, SCENE_GOAL_OPTIONS, SCENE_OUTCOME_OPTIONS, EMOTION_OPTIONS, DIALOGUE_STYLE_OPTIONS, SUBTEXT_OPTIONS, DIALOGUE_POWER_OPTIONS, DIALOGUE_PACE_OPTIONS, DESC_DENSITY_OPTIONS, WRITING_STYLE_OPTIONS } from "../state.js";

function sceneStatusDot(status) {
  const map = { draft: "draft", outline: "active", locked: "locked", scripted: "done" };
  const cls = map[status] ?? "draft";
  return `<span class="status-dot status-dot--${cls}"></span>`;
}

function renderEmotionPicker(label, field, selected) {
  return `
    <div class="weave-field">
      <p class="weave-field__label">${label}</p>
      <div class="chip-wrap chip-wrap--dense">
        ${EMOTION_OPTIONS.map((e) => `
          <button class="ref-chip ref-chip--xs ${e === selected ? "is-active" : ""}"
            type="button" data-action="select-scene-emotion" data-field="${escapeHtml(field)}" data-id="${escapeHtml(e)}">
            ${escapeHtml(e)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSceneWeavingSection(scene) {
  return `
    <div class="scene-weaving-section">
      <p class="section-label section-label--weaving">场景编织</p>

      <div class="weave-group">
        <p class="weave-group__title">6.1 场景目标与结局</p>
        <div class="weave-field">
          <p class="weave-field__label">场景目标模板</p>
          <div class="chip-wrap">
            ${SCENE_GOAL_OPTIONS.map((g) => `
              <button class="ref-chip ${g === scene.scene_goal_template ? "is-active" : ""}"
                type="button" data-action="select-scene-goal" data-id="${escapeHtml(g)}">
                ${escapeHtml(g)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="weave-field">
          <p class="weave-field__label">场景结局</p>
          <div class="chip-wrap">
            ${SCENE_OUTCOME_OPTIONS.map((o) => `
              <button class="ref-chip ${o === scene.scene_outcome ? "is-active" : ""}"
                type="button" data-action="select-scene-outcome" data-id="${escapeHtml(o)}">
                ${escapeHtml(o)}
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="weave-group">
        <p class="weave-group__title">6.2 情感节拍</p>
        ${renderEmotionPicker("起始情绪", "emotion_start", scene.emotion_start)}
        ${renderEmotionPicker("终止情绪", "emotion_end", scene.emotion_end)}
        ${scene.emotion_start || scene.emotion_end ? `
          <div class="emotion-path-preview">
            <span class="emotion-pill">${escapeHtml(scene.emotion_start || "…")}</span>
            <span class="emotion-arrow">→</span>
            <span class="emotion-pill">${escapeHtml(scene.emotion_end || "…")}</span>
          </div>
        ` : ""}
      </div>

      <div class="weave-group">
        <p class="weave-group__title">6.3 对白与潜台词</p>
        <div class="weave-field">
          <p class="weave-field__label">对话风格</p>
          <div class="chip-wrap">
            ${DIALOGUE_STYLE_OPTIONS.map((s) => `
              <button class="ref-chip ${s.key === scene.dialogue_style ? "is-active" : ""}"
                type="button" data-action="select-scene-dialogue-style" data-id="${escapeHtml(s.key)}"
                title="${escapeHtml(s.desc)}">
                ${escapeHtml(s.label)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="weave-field">
          <p class="weave-field__label">潜台词类型</p>
          <div class="chip-wrap chip-wrap--dense">
            ${SUBTEXT_OPTIONS.map((s) => `
              <button class="ref-chip ref-chip--xs ${s === scene.subtext_type ? "is-active" : ""}"
                type="button" data-action="select-scene-subtext" data-id="${escapeHtml(s)}">
                ${escapeHtml(s)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="weave-row">
          <div class="weave-field">
            <p class="weave-field__label">权力关系</p>
            <div class="chip-wrap">
              ${DIALOGUE_POWER_OPTIONS.map((p) => `
                <button class="ref-chip ${p === scene.dialogue_power ? "is-active" : ""}"
                  type="button" data-action="select-scene-power" data-id="${escapeHtml(p)}">
                  ${escapeHtml(p)}
                </button>
              `).join("")}
            </div>
          </div>
          <div class="weave-field">
            <p class="weave-field__label">对话节奏</p>
            <div class="chip-wrap">
              ${DIALOGUE_PACE_OPTIONS.map((p) => `
                <button class="ref-chip ${p === scene.dialogue_pace ? "is-active" : ""}"
                  type="button" data-action="select-scene-pace" data-id="${escapeHtml(p)}">
                  ${escapeHtml(p)}
                </button>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <div class="weave-group">
        <p class="weave-group__title">6.4 行为与描述风格</p>
        <div class="weave-field">
          <p class="weave-field__label">描述密度</p>
          <div class="chip-wrap">
            ${DESC_DENSITY_OPTIONS.map((d) => `
              <button class="ref-chip ${d === scene.desc_density ? "is-active" : ""}"
                type="button" data-action="select-scene-desc-density" data-id="${escapeHtml(d)}">
                ${escapeHtml(d)}
              </button>
            `).join("")}
          </div>
        </div>
        <div class="weave-field">
          <p class="weave-field__label">文笔风格</p>
          <div class="chip-wrap chip-wrap--dense">
            ${WRITING_STYLE_OPTIONS.map((s) => `
              <button class="ref-chip ref-chip--xs ${s === scene.writing_style ? "is-active" : ""}"
                type="button" data-action="select-scene-writing-style" data-id="${escapeHtml(s)}">
                ${escapeHtml(s)}
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPlotChecklist(appState, selectedIds = []) {
  const selected = new Set(list(selectedIds));
  return `
    <div class="check-list">
      ${list(appState.project.plot_board?.cards)
        .map(
          (card) => `
            <label class="check-list__item">
              <input
                type="checkbox"
                data-action="scene-plot-toggle"
                data-id="${escapeHtml(card.id)}"
                ${selected.has(card.id) ? "checked" : ""}
              />
              <span>${escapeHtml(card.title || "未命名剧情卡")}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

export function renderScenesPage(dom, appState, { getScene, getSceneLinkedPlotCards, getSceneLinkedCharacters, getSceneLinkedRelationships, getSceneLinkedTimelineEvents, getActTitle, getNode, getCharacterNameById }) {
  if (!dom.scenesContent) {
    return;
  }
  const selectedScene = getScene();
  const scenes = list(appState.project.scene_workbench?.scenes)
    .slice()
    .sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
  const linkedPlotCards = getSceneLinkedPlotCards(selectedScene);
  const linkedCharacters = getSceneLinkedCharacters(selectedScene);
  const linkedRelationships = getSceneLinkedRelationships(selectedScene);
  const linkedTimeline = getSceneLinkedTimelineEvents(selectedScene);
  dom.scenesContent.innerHTML = `
    <section class="scene-workbench scene-workbench--triple">
      <aside class="workbench-pane workbench-pane--rail">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">场景导航</p>
              <h3>场景列表</h3>
            </div>
            <button class="button button--ghost button--tiny" type="button" data-action="add-scene">新增场景</button>
          </div>
          <div class="stack workbench-scroll-list">
            ${scenes
              .map(
                (scene) => `
                  <button class="list-select ${scene.id === appState.selection.sceneId ? "is-active" : ""}" type="button" data-action="select-scene" data-id="${escapeHtml(scene.id)}">
                    <strong>${escapeHtml(scene.order_index)} 路 ${escapeHtml(scene.title || "未命名场景")}</strong>
                    <span>${escapeHtml(getActTitle(scene.act_id))} 路 ${sceneStatusDot(scene.status)}${escapeHtml(sceneStatusLabels[scene.status] ?? scene.status)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="summary-card summary-card--compact">
          <div class="list-card__head">
            <h3>当前场景</h3>
            <span class="chip chip--soft">${scenes.length} 场</span>
          </div>
          ${
            !selectedScene
              ? renderEmptyState("先创建一个场景。")
              : `
                <div class="summary-strip">
                  <span class="chip chip--soft">${escapeHtml(getActTitle(selectedScene.act_id))}</span>
                  <span class="chip chip--soft">${linkedPlotCards.length} 张剧情卡</span>
                  <span class="chip chip--soft">${linkedCharacters.length} 位人物</span>
                </div>
                <div class="stack workbench-mini-stack">
                  <div class="list-select list-select--static">
                    <strong>地点</strong>
                    <span>${escapeHtml(selectedScene.location || "还没确定")}</span>
                  </div>
                  <div class="list-select list-select--static">
                    <strong>场景目的</strong>
                    <span>${escapeHtml(selectedScene.purpose || "还没确定")}</span>
                  </div>
                </div>
              `
          }
        </div>
      </aside>
      <div class="workbench-pane workbench-pane--main">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">主编辑区</p>
              <h3>${escapeHtml(selectedScene?.title || "未命名场景")}</h3>
            </div>
            ${
              selectedScene
                ? `<button class="button button--ghost button--tiny" type="button" data-action="delete-scene" data-id="${escapeHtml(selectedScene.id)}">删除场景</button>`
                : ""
            }
          </div>
          ${
            !selectedScene
              ? renderEmptyState("还没有选择场景", "点击左侧列表中的场景开始编辑")
              : `
                <div class="form-grid">
                  ${inputField("场名", "scene-field", "title", selectedScene.title)}
                  ${field("顺序", `<input type="number" data-action="scene-field" data-field="order_index" value="${escapeHtml(selectedScene.order_index)}" />`)}
                  ${field(
                    "所属幕",
                    `<select data-action="scene-field" data-field="act_id">${list(appState.project.structure_profile?.acts)
                      .map((act) => `<option value="${escapeHtml(act.id)}" ${act.id === selectedScene.act_id ? "selected" : ""}>${escapeHtml(act.title)}</option>`)
                      .join("")}</select>`
                  )}
                  ${field(
                    "视角人物",
                    `<select data-action="scene-field" data-field="pov_character_id">${[
                      `<option value="">未指定</option>`,
                      ...list(appState.project.character_hub?.characters).map((character) => `<option value="${escapeHtml(character.id)}" ${character.id === selectedScene.pov_character_id ? "selected" : ""}>${escapeHtml(character.name)}</option>`)
                    ].join("")}</select>`
                  )}
                  ${inputField("地点", "scene-field", "location", selectedScene.location)}
                  ${inputField("时段", "scene-field", "time_of_day", selectedScene.time_of_day)}
                  ${selectField("状态", "scene-field", "status", selectedScene.status, Object.entries(sceneStatusLabels))}
                  ${field("关联剧情卡", renderPlotChecklist(appState, selectedScene.linked_plot_card_ids), true)}
                  ${textareaField("场景目的", "scene-field", "purpose", selectedScene.purpose, { rows: 3 })}
                  ${textareaField("阻力", "scene-field", "obstacle", selectedScene.obstacle, { rows: 3 })}
                  ${textareaField("转折 / 变化", "scene-field", "beat_summary", selectedScene.beat_summary, { rows: 3 })}
                  ${inputField("进入状态", "scene-field", "entry_state", selectedScene.entry_state)}
                  ${inputField("离开状态", "scene-field", "exit_state", selectedScene.exit_state)}
                  ${textareaField("台词或片段种子", "scene-field", "script_excerpt", selectedScene.script_excerpt, { rows: 4 })}
                  ${textareaField("备注", "scene-field", "notes", selectedScene.notes, { rows: 3 })}
                </div>
                ${renderSceneWeavingSection(selectedScene)}
              `
          }
        </div>
      </div>
      <aside class="workbench-pane workbench-pane--context">
        <div class="summary-card">
          <div class="list-card__head">
            <div>
              <p class="section-label">速查区</p>
              <h3>关联剧情卡</h3>
            </div>
            <span class="chip chip--soft">${linkedPlotCards.length} 张</span>
          </div>
          ${
            linkedPlotCards.length === 0
              ? renderEmptyState("当前场景还没挂到剧情卡。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedPlotCards
                    .map(
                      (card) => `
                        <button class="list-select" type="button" data-action="jump-to-plot-card" data-id="${escapeHtml(card.id)}">
                          <strong>${escapeHtml(card.title || "未命名剧情卡")}</strong>
                          <span>${escapeHtml(getActTitle(card.act_id))} 路 ${escapeHtml(getNode(card.node_id)?.title ?? "未挂节点")}</span>
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
            <h3>出场人物</h3>
            <span class="chip chip--soft">${linkedCharacters.length} 位</span>
          </div>
          ${
            linkedCharacters.length === 0
              ? renderEmptyState("当前场景还没牵动人物。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedCharacters
                    .map(
                      (character) => `
                        <button class="list-select" type="button" data-action="jump-to-character" data-id="${escapeHtml(character.id)}">
                          <strong>${escapeHtml(character.name || "未命名人物")}</strong>
                          <span>${escapeHtml(storyRoleLabels[character.story_role] ?? character.story_role)}</span>
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
            <h3>共现场关系</h3>
            <span class="chip chip--soft">${linkedRelationships.length} 条</span>
          </div>
          ${
            linkedRelationships.length === 0
              ? renderEmptyState("当前场景里还没有可用的关系。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedRelationships
                    .map(
                      (relationship) => `
                        <button class="list-select" type="button" data-action="jump-to-relationship" data-id="${escapeHtml(relationship.id)}">
                          <strong>${escapeHtml(getCharacterNameById(relationship.source_character_id))} 路 ${escapeHtml(getCharacterNameById(relationship.target_character_id))}</strong>
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
            <h3>时间线线索</h3>
            <span class="chip chip--soft">${linkedTimeline.length} 条</span>
          </div>
          ${
            linkedTimeline.length === 0
              ? renderEmptyState("当前场景还没有可引用的时间线。")
              : `
                <div class="stack workbench-scroll-list">
                  ${linkedTimeline
                    .map(
                      (event) => `
                        <div class="list-select list-select--static">
                          <strong>第 ${escapeHtml(event.story_day || "?")} 天 路 ${escapeHtml(event.summary || "未命名事件")}</strong>
                          <span>${escapeHtml(event.location || "未定地点")} 路 ${escapeHtml(event.trigger || "未定触发")}</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
          }
        </div>
      </aside>
    </section>
  `;
}
