import { escapeHtml, list, renderEmptyState } from "../utils.js";

function getOrderedScenes(appState) {
  return list(appState.project.scene_workbench?.scenes)
    .slice()
    .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
}

function getCharNameById(appState, id) {
  return list(appState.project.character_hub?.characters).find((c) => c.id === id)?.name ?? "";
}

function getActTitle(appState, actId) {
  return list(appState.project.structure_profile?.acts).find((a) => a.id === actId)?.title ?? "";
}

function sceneStatusLabel(scene) {
  if (scene.script_full && scene.script_full.trim().length > 50) return { tag: "已成稿", cls: "is-done" };
  if (scene.script_full && scene.script_full.trim().length > 0)  return { tag: "草稿",   cls: "is-draft" };
  return { tag: "未撰写", cls: "is-empty" };
}

// 启发式判定室内/外景：先用显式标记 → 再判定明显外景词 → 最后判定室内关键词
const OUTDOOR_HINTS = [
  "门口", "门外", "街", "路", "巷", "桥", "湖", "海", "山", "林", "田", "野",
  "坝", "墓园", "广场", "公园", "渡口", "码头", "操场", "院子", "草坪",
  "天台", "屋顶", "阳台"
];
const INDOOR_HINTS = [
  "卧室", "客厅", "厨房", "餐厅", "书房", "办公", "教室", "医院", "派出所",
  "车里", "车内", "车上", "船舱", "机舱", "电梯", "走廊",
  "家", "店", "馆", "厅", "室", "屋", "房"
];
function isIndoorLocation(location = "") {
  const s = String(location).trim();
  if (!s) return false;
  if (s.startsWith("内") || s.startsWith("内景")) return true;
  if (s.startsWith("外") || s.startsWith("外景")) return false;
  // 外景关键词优先（解决「派出所门口」「墓园」这类）
  if (OUTDOOR_HINTS.some((k) => s.includes(k))) return false;
  return INDOOR_HINTS.some((k) => s.includes(k));
}

function fountainHeader(scene, appState) {
  const intExt = isIndoorLocation(scene.location) ? "INT." : "EXT.";
  const where = scene.location || "未定地点";
  const when = scene.time_of_day || "";
  return `${intExt} ${where}${when ? " - " + when : ""}`.toUpperCase();
}

function renderSceneListItem(appState, scene, isActive) {
  const status = sceneStatusLabel(scene);
  const pov = getCharNameById(appState, scene.pov_character_id);
  return `
    <button
      class="screenplay-scene-item ${isActive ? "is-active" : ""}"
      type="button"
      data-action="select-screenplay-scene"
      data-id="${escapeHtml(scene.id)}"
    >
      <div class="screenplay-scene-item__head">
        <span class="screenplay-scene-item__order">#${escapeHtml(scene.order_index ?? "-")}</span>
        <span class="screenplay-scene-item__title">${escapeHtml(scene.title || "未命名场景")}</span>
        <span class="screenplay-scene-item__status ${status.cls}">${status.tag}</span>
      </div>
      <div class="screenplay-scene-item__meta">
        ${escapeHtml(getActTitle(appState, scene.act_id))} · ${escapeHtml(scene.location || "未定地点")}${pov ? " · " + escapeHtml(pov) : ""}
      </div>
    </button>
  `;
}

function renderEditor(appState, scene) {
  if (!scene) {
    return renderEmptyState("在左侧选择一个场景开始撰写剧本。");
  }
  const header = fountainHeader(scene, appState);
  const status = sceneStatusLabel(scene);
  const pov = getCharNameById(appState, scene.pov_character_id);
  const busyList = appState.screenplayAi?.busySceneIds ?? [];
  const isSceneAiBusy = busyList.includes(scene.id);
  return `
    <article class="screenplay-editor">
      <header class="screenplay-editor__head">
        <div class="screenplay-editor__title-row">
          <h3>${escapeHtml(scene.title || "未命名场景")}</h3>
          <span class="screenplay-scene-item__status ${status.cls}">${status.tag}</span>
        </div>
        <div class="screenplay-editor__slug">${escapeHtml(header)}</div>
        <div class="screenplay-editor__meta">
          ${pov ? `POV：${escapeHtml(pov)} · ` : ""}
          目标：${escapeHtml(scene.purpose || "—")} · 障碍：${escapeHtml(scene.obstacle || "—")}
        </div>
      </header>
      <div class="screenplay-editor__toolbar">
        <button class="button button--ghost button--tiny" type="button" data-action="ai-write-scene-script" data-id="${escapeHtml(scene.id)}" ${isSceneAiBusy ? "disabled" : ""}>${isSceneAiBusy ? "AI 写作中..." : "AI 写本场"}</button>
        <button class="button button--ghost button--tiny" type="button" data-action="insert-scene-script-template" data-id="${escapeHtml(scene.id)}">插入剧本模板</button>
        <span class="screenplay-editor__hint">${(scene.script_full || "").length} 字 · 约 ${Math.ceil((scene.script_full || "").length / 250)} 页</span>
      </div>
      <textarea
        class="screenplay-editor__body"
        data-action="screenplay-field"
        data-field="script_full"
        data-id="${escapeHtml(scene.id)}"
        rows="28"
        placeholder="${escapeHtml(header)}\n\n（动作描述写在左对齐段落，简练具象。）\n\n${pov ? escapeHtml(pov.toUpperCase()) : "人物名"}\n（情绪/动作提示）\n对白内容。\n\n（继续下一段动作或对白...）"
      >${escapeHtml(scene.script_full || "")}</textarea>
      <footer class="screenplay-editor__foot">
        <p class="screenplay-editor__notes-label">本场场记 / 提醒</p>
        <textarea
          class="screenplay-editor__notes"
          data-action="screenplay-field"
          data-field="screenplay_notes"
          data-id="${escapeHtml(scene.id)}"
          rows="2"
          placeholder="撰写本场时的笔记、待办、修改提示..."
        >${escapeHtml(scene.screenplay_notes || "")}</textarea>
      </footer>
    </article>
  `;
}

export function renderScreenplayPage(dom, appState) {
  if (!dom.screenplayContent) return;
  const scenes = getOrderedScenes(appState);
  const activeId = appState.selection.screenplaySceneId
    || scenes[0]?.id
    || "";
  const activeScene = scenes.find((s) => s.id === activeId) ?? scenes[0];

  if (scenes.length === 0) {
    dom.screenplayContent.innerHTML = `
      <section class="screenplay-page">
        ${renderEmptyState("还没有场景。请先在「场景拆解」步骤创建场景，再来这里撰写剧本。")}
      </section>
    `;
    return;
  }

  const totalChars = scenes.reduce((sum, s) => sum + (s.script_full?.length ?? 0), 0);
  const donCount = scenes.filter((s) => (s.script_full?.trim().length ?? 0) > 50).length;
  const ai = appState.screenplayAi ?? { bulkRunning: false, bulkProgress: { done: 0, total: 0 }, lastError: "" };
  const bulkLabel = ai.bulkRunning
    ? `批量中 ${ai.bulkProgress.done}/${ai.bulkProgress.total}`
    : "AI 批量生成全部";
  const errorBanner = ai.lastError
    ? `<p class="scene-summary-hint" style="color:#b04848;margin:4px 0 8px;">AI 错误：${escapeHtml(ai.lastError)}</p>`
    : "";

  dom.screenplayContent.innerHTML = `
    <section class="screenplay-page">
      <header class="screenplay-page__head">
        <div class="screenplay-page__metrics">
          <div class="metric-card"><span class="metric-card__label">总场景</span><strong class="metric-card__value">${scenes.length}</strong></div>
          <div class="metric-card"><span class="metric-card__label">已成稿</span><strong class="metric-card__value">${donCount}</strong></div>
          <div class="metric-card"><span class="metric-card__label">总字数</span><strong class="metric-card__value">${totalChars}</strong></div>
          <div class="metric-card"><span class="metric-card__label">估算页数</span><strong class="metric-card__value">${Math.ceil(totalChars / 250)}</strong></div>
        </div>
        <div class="screenplay-page__actions">
          <button class="button button--ghost button--small" type="button" data-action="ai-write-screenplay-bulk" ${ai.bulkRunning ? "disabled" : ""}>${escapeHtml(bulkLabel)}</button>
          <button class="button button--ghost button--small" type="button" data-action="export-screenplay-fountain">导出 .fountain</button>
          <button class="button button--primary button--small" type="button" data-action="preview-screenplay-full">全本预览</button>
        </div>
      </header>
      ${errorBanner}
      <div class="screenplay-page__body">
        <aside class="screenplay-page__list">
          ${scenes.map((s) => renderSceneListItem(appState, s, s.id === activeScene?.id)).join("")}
        </aside>
        <main class="screenplay-page__editor">
          ${renderEditor(appState, activeScene)}
        </main>
      </div>
    </section>
  `;
}

export function buildFountainText(appState) {
  const scenes = getOrderedScenes(appState);
  const title = appState.project.project?.title || "未命名剧本";
  const author = "原点编剧系统";
  const header = [
    `Title: ${title}`,
    `Author: ${author}`,
    `Draft date: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "===",
    ""
  ].join("\n");

  const body = scenes.map((scene) => {
    const slug = fountainHeader(scene, appState);
    const script = (scene.script_full || "").trim();
    const lines = [];
    if (script) {
      // 若 AI 已写出 slug 行（INT./EXT. 或 内景/外景 开头），用启发式判定的 slug 覆盖第一行，
      // 避免 AI 把内景误判为外景（或反之）；其余正文保留 AI 原文。
      if (/^(INT\.|EXT\.|内景|外景)/i.test(script)) {
        const idx = script.indexOf("\n");
        const rest = idx > -1 ? script.slice(idx) : "";
        lines.push(slug + rest);
      } else {
        lines.push(slug, "", script);
      }
    } else {
      const summary = scene.beat_summary || scene.purpose || "（本场尚未撰写）";
      lines.push(slug, "", `[[ 待撰写：${summary} ]]`);
    }
    lines.push("");
    return lines.join("\n");
  }).join("\n");

  return header + body;
}
