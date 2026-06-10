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

function sceneScriptQualityCheck(text = "") {
  const issues = [];
  if (text.length < 200) issues.push("过短");
  // 必须有 slug line（INT./EXT.）
  if (!/^(INT\.|EXT\.|内景|外景)/m.test(text)) issues.push("缺场景头");
  // 必须有至少 2 行全大写或单独成行的人物名（对白存在迹象）
  const dialogueLines = (text.match(/^[A-Z一-龥]{2,8}\s*$/gm) || []).length;
  if (dialogueLines < 2) issues.push("对白稀薄");
  return issues;
}

function sceneStatusLabel(scene) {
  const text = (scene.script_full || "").trim();
  if (!text) return { tag: "未撰写", cls: "is-empty" };
  if (text.length < 50) return { tag: "草稿", cls: "is-draft" };
  const issues = sceneScriptQualityCheck(text);
  if (issues.length === 0) return { tag: "已成稿", cls: "is-done" };
  if (issues.includes("过短")) return { tag: "草稿", cls: "is-draft" };
  return { tag: "需修订", cls: "is-review", title: issues.join(" / ") };
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

function renderRaterPanel(raterResult, allScenes = []) {
  const { sceneId, mode, data } = raterResult;
  if (!data) return "";
  const isFull = mode === "full";
  const sev = (s) => ({ P0: "rater-sev-p0", P1: "rater-sev-p1", P2: "rater-sev-p2" })[s] ?? "rater-sev-p2";
  const overall = data.overall ?? {};
  const sc = data.scorecard ?? {};
  const story = sc.story ?? {}, char = sc.character ?? {}, scene2 = sc.scene ?? {}, eng = sc.engagement ?? {}, tech = sc.technical ?? {};
  const directives = data.revision_directives ?? [];
  const sceneScores = data.scene_scores ?? [];
  const crossIssues = data.cross_scene_issues ?? [];
  const sceneById = new Map(allScenes.map((s) => [s.id, s]));

  const scoreCell = (label, v) => `<div class="rater-cell"><span class="rater-cell__label">${escapeHtml(label)}</span><span class="rater-cell__value">${v ?? "—"}</span></div>`;
  return `
    <div class="rater-panel ${isFull ? "rater-panel--full" : ""}">
      <div class="rater-panel__head">
        <div>
          <p class="rater-panel__title">${isFull ? "幕评师 · 全片评分" : "幕评师 · 单场评分"}</p>
          <p class="rater-panel__overall">${overall.score ?? "—"} <span class="rater-panel__overall-max">/10</span></p>
        </div>
        <button class="button button--ghost button--tiny" type="button" data-action="close-rater">收起</button>
      </div>
      ${overall.summary ? `<p class="rater-panel__summary">${escapeHtml(overall.summary)}</p>` : ""}
      ${isFull && sceneScores.length > 0 ? `
        <div class="rater-scene-scores">
          <p class="rater-scene-scores__head">各场分数</p>
          <div class="rater-scene-scores__list">
            ${sceneScores.map((s) => `
              <div class="rater-scene-score">
                <span class="rater-scene-score__num">#${s.order ?? "?"}</span>
                <span class="rater-scene-score__title">${escapeHtml(s.title || "未命名")}</span>
                <span class="rater-scene-score__val ${s.score >= 8 ? "is-good" : s.score >= 6 ? "is-ok" : "is-weak"}">${s.score ?? "—"}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
      ${isFull && crossIssues.length > 0 ? `
        <div class="rater-cross">
          <p class="rater-cross__head">跨场问题</p>
          <ul class="rater-cross__list">
            ${crossIssues.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      <div class="rater-grid">
        <div class="rater-block">
          <h4>故事内容</h4>
          ${scoreCell("概念", story.concept)}${scoreCell("情节", story.plot)}${scoreCell("原创性", story.originality)}
        </div>
        <div class="rater-block">
          <h4>角色</h4>
          ${scoreCell("角色塑造", char.characters)}${scoreCell("角色变化", char.character_changes)}
          ${char.internal_goal ? `<p class="rater-cell__hint">内目标：${escapeHtml(char.internal_goal)}</p>` : ""}
          ${char.external_goal ? `<p class="rater-cell__hint">外目标：${escapeHtml(char.external_goal)}</p>` : ""}
        </div>
        <div class="rater-block">
          <h4>场景</h4>
          ${scoreCell("冲突", scene2.conflict_level)}${scoreCell("对立面", scene2.opposition)}${scoreCell("风险", scene2.high_stakes)}${scoreCell("推进", scene2.story_forward)}${scoreCell("不可预测", scene2.unpredictability)}
        </div>
        <div class="rater-block">
          <h4>观众参与</h4>
          ${scoreCell("情感", eng.emotional_impact)}${scoreCell("对话", eng.dialogue)}${scoreCell("参与", eng.engagement)}${scoreCell("节奏", eng.pacing)}
        </div>
        <div class="rater-block">
          <h4>技术</h4>
          ${scoreCell("格式", tech.formatting)}${scoreCell("结构", tech.structure)}
        </div>
      </div>

      ${directives.length > 0 ? `
        <div class="rater-directives">
          <p class="rater-directives__head">修稿指令 <span class="rater-directives__count">${directives.length} 条</span></p>
          <ol class="rater-directives__list">
            ${directives.map((d) => {
              const sceneTag = isFull && d.scene_id ? (() => {
                const sc = sceneById.get(d.scene_id);
                return sc ? `<span class="rater-directive__scene">#${sc.order_index ?? "?"} ${escapeHtml(sc.title || "未命名")}</span>` : "";
              })() : "";
              return `
              <li class="rater-directive ${sev(d.severity)}">
                <span class="rater-directive__sev">${escapeHtml(d.severity || "P2")}</span>
                <div class="rater-directive__body">
                  ${sceneTag}
                  <p class="rater-directive__issue">${escapeHtml(d.issue || "")}</p>
                  ${d.location_hint ? `<p class="rater-directive__loc">定位：「${escapeHtml(d.location_hint)}」</p>` : ""}
                  <p class="rater-directive__do">→ ${escapeHtml(d.directive || "")}</p>
                </div>
              </li>
            `;}).join("")}
          </ol>
          ${isFull
            ? `<button class="button button--primary button--small rater-apply" type="button" data-action="apply-rater-revision-full">↻ 按全片建议修稿（按场重写）</button>`
            : `<button class="button button--primary button--small rater-apply" type="button" data-action="apply-rater-revision" data-id="${escapeHtml(sceneId)}">↻ 按建议修稿（AI 重写本场）</button>`
          }
        </div>
      ` : ""}
    </div>
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
        ${(scene.script_full || "").length > 80 ? `<button class="button button--ghost button--tiny" type="button" data-action="ai-rate-scene" data-id="${escapeHtml(scene.id)}" ${appState.raterLoading?.[scene.id] ? "disabled" : ""}>${appState.raterLoading?.[scene.id] ? "评分中…" : "✦ 幕评师评分"}</button>` : ""}
        <button class="button button--ghost button--tiny" type="button" data-action="insert-scene-script-template" data-id="${escapeHtml(scene.id)}">插入剧本模板</button>
        <span class="screenplay-editor__hint">${(scene.script_full || "").replace(/\s+/g, "").length} 字 · 约 ${Math.max(1, Math.ceil((scene.script_full || "").replace(/\s+/g, "").length / 250))} 页</span>
      </div>
      ${appState.raterResult && appState.raterResult.sceneId === scene.id ? renderRaterPanel(appState.raterResult) : ""}
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

// 在 innerHTML 替换前后保留聚焦 textarea 的光标位置 + 滚动位置，
// 否则 autosave 触发的 re-render 会让正在打字的用户被弹回内容开头。
function captureFocusState(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) return null;
  const action = active.dataset?.action;
  const field = active.dataset?.field;
  const id = active.dataset?.id || "";
  if (!action || !field) return null;
  return {
    action, field, id,
    selectionStart: active.selectionStart,
    selectionEnd: active.selectionEnd,
    scrollTop: active.scrollTop,
    parentScrollTop: active.parentElement?.scrollTop
  };
}

function restoreFocusState(root, captured) {
  if (!captured) return;
  const sel = `[data-action="${captured.action}"][data-field="${captured.field}"]` +
    (captured.id ? `[data-id="${captured.id}"]` : "");
  const el = root.querySelector(sel);
  if (!el) return;
  el.focus();
  if (typeof captured.selectionStart === "number" && el.setSelectionRange) {
    try { el.setSelectionRange(captured.selectionStart, captured.selectionEnd); } catch {}
  }
  if (typeof captured.scrollTop === "number") el.scrollTop = captured.scrollTop;
  if (typeof captured.parentScrollTop === "number" && el.parentElement) el.parentElement.scrollTop = captured.parentScrollTop;
}

export function renderScreenplayPage(dom, appState) {
  if (!dom.screenplayContent) return;
  const focusState = captureFocusState(dom.screenplayContent);
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

  // 统一口径（与全本预览一致）：去空白字符数；页数 = 字数 / 250
  const totalChars = scenes.reduce((sum, s) => sum + (s.script_full || "").replace(/\s+/g, "").length, 0);
  // 与侧栏标签同口径：通过质量检查的才算成稿，避免「已成稿 8」而侧栏全是「需修订」的自相矛盾
  const donCount = scenes.filter((s) => sceneStatusLabel(s).tag === "已成稿").length;
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
          <button class="button button--ghost button--small" type="button" data-action="ai-rewrite-all-screenplay" ${ai.bulkRunning ? "disabled" : ""} title="清空所有已写剧本并重新生成，应用最新反同质化规则">↻ 全片重写</button>
          <button class="button button--ghost button--small" type="button" data-action="ai-rate-screenplay-full" ${appState.raterFullLoading ? "disabled" : ""} title="对所有已写场进行整片评分，跨场问题诊断">${appState.raterFullLoading ? "全片评分中…" : "✦ 幕评师全片"}</button>
          <button class="button button--ghost button--small" type="button" data-action="audit-speakers" title="全量回扫所有已写场次，列出不在人物名单内的说话人">人名巡检</button>
          <button class="button button--ghost button--small" type="button" data-action="global-find-replace" title="跨所有场次的剧本正文与字段做查找替换（人名统一等）">查找替换</button>
          <button class="button button--ghost button--small" type="button" data-action="export-screenplay-fountain">导出 .fountain</button>
          <button class="button button--primary button--small" type="button" data-action="preview-screenplay-full">全本预览</button>
        </div>
        ${appState.raterResult && appState.raterResult.mode === "full" ? renderRaterPanel(appState.raterResult, scenes) : ""}
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
  restoreFocusState(dom.screenplayContent, focusState);
}

// Fountain 规范化：中文角色 cue 加 @ 强制标记（标准解析器对非全大写 cue 一律按 action 处理）、
// 去掉旧代生成器的缩进排版、保证 cue 前有空行。结构启发式与人名巡检一致：
// 2-6 个汉字独立成行（可带括注）且下一行是对白文本。
function normalizeFountainScript(script) {
  const lines = String(script).split(/\r?\n/);
  const isNameLine = (s) => /^([一-龥]{2,6})(（[^）]*）)?$/.test(s);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const m = trimmed.match(/^([一-龥]{2,6})(（[^）]*）)?$/);
    if (m) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = (lines[j] ?? "").trim();
      if (next && !isNameLine(next) && !/^(INT\.|EXT\.|内景|外景)/i.test(next)) {
        if (out.length && out[out.length - 1].trim() !== "") out.push("");
        out.push(`@${m[1]}`);
        if (m[2]) out.push(m[2]);
        continue;
      }
    }
    // 非 cue 行：去掉旧代生成器的行首缩进（对白/动作在 fountain 中都应顶格）
    out.push(lines[i].replace(/^\s+/, ""));
  }
  return out.join("\n");
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

  const hasRealLocation = (scene) => {
    const v = (scene.location || "").trim();
    return v && !/待定|未定/.test(v);
  };
  const body = scenes.map((scene) => {
    const slug = fountainHeader(scene, appState);
    const script = normalizeFountainScript((scene.script_full || "").trim());
    const lines = [];
    if (script) {
      // 若 AI 已写出 slug 行（INT./EXT. 或 内景/外景 开头）：
      // 仅当场景有真实定位时才用启发式 slug 覆盖第一行（纠正 INT/EXT 误判）；
      // 若场景定位仍是占位（待定/未定/空），保留 AI 自己写的更具体的 slug，绝不用「未定地点」抹掉它。
      if (/^(INT\.|EXT\.|内景|外景)/i.test(script)) {
        if (hasRealLocation(scene)) {
          const idx = script.indexOf("\n");
          const rest = idx > -1 ? script.slice(idx) : "";
          lines.push(slug + rest);
        } else {
          // AI 自带 slug 但场景定位仍是占位：保留 AI slug，若它本身也是占位则显式标 TODO
          const firstLine = script.split("\n")[0];
          const todo = /待定|未定/.test(firstLine)
            ? "\n[[ TODO：本场拍摄定位未填——在场景拆解页补「地点/时段」后重新导出 ]]"
            : "";
          lines.push(script + todo);
        }
      } else {
        const todo = !hasRealLocation(scene)
          ? "\n[[ TODO：本场拍摄定位未填——在场景拆解页补「地点/时段」后重新导出 ]]"
          : "";
        lines.push(slug + todo, "", script);
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
