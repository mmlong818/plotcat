import { escapeHtml, field, inputField, textareaField, selectField, list } from "../utils.js";
import { structureTemplateLabels, formatStructureOptions, ENDING_DIRECTION_OPTIONS } from "../state.js";

const NODE_TYPE_LABELS = {
  opening_image: "开场印象", setup: "基础铺陈", catalyst: "诱发事件",
  break_into_two: "进入第二幕", b_story: "B 故事", fun_and_games: "娱乐段落",
  midpoint: "中点翻转", bad_guys_close_in: "压力上升", all_is_lost: "一切尽失",
  dark_night: "至暗时刻", reaction: "反应段", attack: "主动进攻",
  crisis: "危机时刻", pressure_wave: "压力波",
  break_into_three: "进入第三幕", finale: "终局行动", final_image: "结尾印象",
  // 5 幕 / feature_film 模板的节点
  lock_in: "主线锁定", promise: "故事承诺兑现", reversal: "局势反扑",
  collapse: "崩塌时刻", final_choice: "最终选择", aftershock: "余波落点"
};

const NODE_TYPE_HINTS = {
  opening_image: "用一个画面定义故事的情感基调，它应当与结尾印象形成呼应。",
  setup: "在诱发事件打破平衡之前，展示主角的日常世界与内在缺陷。",
  catalyst: "改变主角生活方向的事件，应在故事前10%内出现。",
  break_into_two: "主角主动选择进入新世界，第二幕从这里正式开始。",
  b_story: "通常是一段感情线，承载主题，与A故事形成对比或映衬。",
  fun_and_games: "展现新世界的承诺，给观众他们为这个故事而来的那种体验。",
  midpoint: "表面上的胜利或失败，将主角从被动推向主动。",
  bad_guys_close_in: "压力从四面八方涌来，主角的内外部问题开始激化。",
  all_is_lost: "主角失去一切，旧世界彻底崩塌，必须蜕变才能前进。",
  dark_night: "主角在绝望中反思，找到真正驱动自己前进的内在力量。",
  reaction: "主角对压力做出反应，处于被动状态，等待转机。",
  attack: "主角主动出击，掌握了主动权，向最终对决进发。",
  crisis: "终极抉择时刻，主角必须在两个同样困难的选项中做出选择。",
  pressure_wave: "危机带来的连锁反应，多个矛盾在此汇聚。",
  break_into_three: "B故事与A故事的解决方案汇合，主角获得完成任务的钥匙。",
  finale: "主角运用蜕变后的新能力，解决旧世界无法解决的问题。",
  final_image: "与开场印象呼应，用一个画面证明主角已经彻底改变。",
};

const ENDING_GROUPS = [
  { label: "爱情 / 情感", values: ["相濡以沫", "结为夫妻", "寻得真爱", "劳燕分飞", "博得芳心"] },
  { label: "正义 / 秩序", values: ["罪有应得", "天网恢恢", "公诸于世", "逍遥法外", "旗开得胜邪恶犹存"] },
  { label: "成长 / 救赎", values: ["成长蜕变", "实现自我", "皆有所悟", "主角得到救赎", "主人公重拾理想信念"] },
  { label: "归属 / 生活", values: ["家人团聚", "终得归家", "生活美满"] },
  { label: "悲剧 / 失落", values: ["同归于尽", "主角梦碎", "主角彻底隐退", "宝藏永失"] },
];

const ACT_CHINESE_NUMS = ["一", "二", "三", "四", "五", "六"];
const CIRC_NUMS = "①②③④⑤⑥⑦⑧⑨⑩";

const ACT_COLORS = [
  { bg: "rgba(186,86,22,0.07)", border: "rgba(186,86,22,0.28)", num: "rgba(186,86,22,0.85)" },
  { bg: "rgba(30,95,168,0.07)", border: "rgba(30,95,168,0.25)", num: "rgba(30,95,168,0.80)" },
  { bg: "rgba(46,125,82,0.07)", border: "rgba(46,125,82,0.25)", num: "rgba(46,125,82,0.80)" },
  { bg: "rgba(130,80,170,0.07)", border: "rgba(130,80,170,0.25)", num: "rgba(130,80,170,0.80)" },
  { bg: "rgba(180,83,9,0.07)",  border: "rgba(180,83,9,0.25)",  num: "rgba(180,83,9,0.80)"  },
  { bg: "rgba(50,110,120,0.07)", border: "rgba(50,110,120,0.25)", num: "rgba(50,110,120,0.80)" },
];

function parseActRange(rangeLabel) {
  const m = String(rangeLabel ?? "").match(/(\d+)\s*[%％]\s*[–—\-]\s*(\d+)\s*[%％]/);
  if (!m) return { start: 0, end: 100 };
  return { start: parseInt(m[1]), end: parseInt(m[2]) };
}

function endingDirectionSelect(current) {
  const cur = current ?? "";
  const knownValues = new Set(ENDING_GROUPS.flatMap((g) => g.values));
  const groupsHtml = [
    `<option value="">— 未定 —</option>`,
    ...ENDING_GROUPS.map((g) => `
      <optgroup label="${escapeHtml(g.label)}">
        ${g.values.map((v) => `<option value="${escapeHtml(v)}" ${v === cur ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}
      </optgroup>
    `),
    ...(cur && !knownValues.has(cur) ? [`<option value="${escapeHtml(cur)}" selected>${escapeHtml(cur)}</option>`] : []),
  ].join("");
  return field("结局方向", `<select data-action="story-core-field" data-field="ending_direction">${groupsHtml}</select>`);
}

function getStructureOptionsForFormat(format, currentTemplate = null) {
  const values = [...(formatStructureOptions[format] ?? ["feature_film", "pilot_episode", "three_act", "four_act", "custom"])];
  if (currentTemplate && !values.includes(currentTemplate)) values.unshift(currentTemplate);
  return values.map((value) => [value, structureTemplateLabels[value] ?? value]);
}

function renderStoryCoreBar(storyCore) {
  const chips = [
    storyCore.emotional_promise && `情绪承诺：${storyCore.emotional_promise}`,
    storyCore.central_question && `中心问题：${storyCore.central_question}`,
    storyCore.ending_direction && `结局：${storyCore.ending_direction}`,
  ].filter(Boolean).map((t) => `<span class="sc-chip">${escapeHtml(t)}</span>`).join("");

  return `
    <details class="story-core-bar" id="story-core-bar">
      <summary>
        <span class="sc-bar-label">故事核心</span>
        <div class="sc-chips">${chips || '<span class="sc-chips__empty">点击展开填写</span>'}</div>
        <span class="sc-chevron">▾</span>
      </summary>
      <div class="story-core-expanded">
        <div class="sc-field sc-field--wide">
          ${textareaField("故事前提", "story-core-field", "premise", storyCore.premise, { rows: 2 })}
        </div>
        <div class="sc-field sc-field--wide">
          ${textareaField("核心冲突", "story-core-field", "core_conflict", storyCore.core_conflict, { rows: 2 })}
        </div>
        <div class="sc-field">
          ${textareaField("中心问题", "story-core-field", "central_question", storyCore.central_question, { rows: 2 })}
        </div>
        <div class="sc-field">
          ${inputField("情绪承诺", "story-core-field", "emotional_promise", storyCore.emotional_promise)}
        </div>
        <div class="sc-field">
          ${textareaField("主题陈述", "story-core-field", "theme_statement", storyCore.theme_statement, { rows: 2 })}
        </div>
        <div class="sc-field">
          ${endingDirectionSelect(storyCore.ending_direction)}
        </div>
      </div>
    </details>
  `;
}

function renderActRow(act, index, nodes) {
  const color = ACT_COLORS[index % ACT_COLORS.length];
  const chineseNum = ACT_CHINESE_NUMS[index] ?? String(index + 1);
  const { start, end } = parseActRange(act.range_label);

  const nodeCards = nodes.map((node, i) => {
    const seq = CIRC_NUMS[i] ?? String(i + 1);
    const typeLabel = escapeHtml(NODE_TYPE_LABELS[node.node_type] ?? node.node_type);
    const isEmpty = !node.note;
    const isRequired = node.required;
    const cardClass = ["struct-node-card", isEmpty ? "is-empty" : "", isRequired ? "is-required" : ""].filter(Boolean).join(" ");

    // 状态徽章：只在「待填写」时显示（提示用户还要做的事）；已填写则去掉噪音
    const statusBadge = isEmpty
      ? `<span class="struct-node-card__status node-card__status--empty"><span class="struct-node-card__dot"></span>待填写</span>`
      : "";

    return `
      <div class="${cardClass}" data-node-id="${escapeHtml(node.id)}" data-action="select-node">
        <div class="struct-node-card__type">${typeLabel}</div>
        <div class="struct-node-card__title">
          <input class="struct-node-card__title-input"
            data-action="node-field" data-id="${escapeHtml(node.id)}" data-field="title"
            value="${escapeHtml(node.title)}" placeholder="节点名称…" />
        </div>
        <div class="struct-node-card__preview">${escapeHtml(node.note || "点击填写核心事件与戏剧转变…")}</div>
        ${statusBadge}
      </div>
    `;
  }).join("");

  return `
    <div class="struct-act-row" style="--act-bg:${color.bg};--act-border:${color.border};--act-num-color:${color.num}">
      <div class="struct-act-row__label">
        <div class="struct-act-row__num">第${chineseNum}幕</div>
        <input class="struct-act-row__title"
          data-action="act-field" data-id="${escapeHtml(act.id)}" data-field="title"
          value="${escapeHtml(act.title)}" placeholder="幕名" />
        <div class="struct-act-row__range" title="结构比例">${start}–${end}%</div>
      </div>
      <div class="struct-act-row__nodes">
        ${nodes.length > 0 ? nodeCards : `<p class="struct-act-row__empty">此幕暂无叙事节点</p>`}
      </div>
    </div>
  `;
}

function renderNodeDrawer(node) {
  if (!node) return "";
  const typeLabel = NODE_TYPE_LABELS[node.node_type] ?? node.node_type;
  const hint = NODE_TYPE_HINTS[node.node_type] ?? "";
  return `
    <div class="struct-node-drawer" id="struct-node-drawer">
      <button class="struct-node-drawer__close" data-action="close-node-drawer" type="button">✕</button>
      <div class="struct-node-drawer__info">
        <div class="struct-node-drawer__info-type">${escapeHtml(typeLabel)}</div>
        <div class="struct-node-drawer__info-title">${escapeHtml(node.title || "未命名节点")}</div>
        ${hint ? `<div class="struct-node-drawer__hint"><strong>编剧提示：</strong>${escapeHtml(hint)}</div>` : ""}
      </div>
      <div class="struct-node-drawer__edit">
        <textarea class="struct-node-drawer__textarea"
          data-action="node-field" data-id="${escapeHtml(node.id)}" data-field="note"
          placeholder="写下这个情节点的核心事件与戏剧转变…">${escapeHtml(node.note || "")}</textarea>
        <div class="struct-node-drawer__actions">
          <button class="button button--ghost button--small" type="button" data-action="ai-gen-node-note" data-id="${escapeHtml(node.id)}">✦ AI 续写</button>
          <button class="button button--primary button--small" type="button" data-action="close-node-drawer">完成</button>
        </div>
      </div>
    </div>
  `;
}

export function renderStructurePage(dom, appState, { getOrderedActs, getOrderedNodes, getActTitle }) {
  const structure = appState.project.structure_profile;
  const storyCore = appState.project.story_core;
  const orderedActs = getOrderedActs();
  const templateOptions = getStructureOptionsForFormat(appState.project.project.format, structure.template);
  const selectedNodeId = appState.selection?.nodeId ?? null;
  const selectedNode = selectedNodeId
    ? list(appState.project.structure_profile?.acts).flatMap((a) => list(a.nodes)).find((n) => n.id === selectedNodeId)
    : null;

  const templateLabel = structureTemplateLabels[structure.template] ?? structure.template ?? "未设置";
  const rhythmLabel = {
    save_the_cat: "救猫咪节拍表", hero_journey: "英雄之旅",
    story_circle: "故事圆环", none: "无节拍表",
  }[structure.rhythm_overlay] ?? structure.rhythm_overlay ?? "";

  const actsHtml = orderedActs.length > 0
    ? orderedActs.map((act, i) => renderActRow(act, i, getOrderedNodes(act.id))).join("")
    : `<div class="empty-state"><p>选定结构模板后将自动生成幕结构</p></div>`;

  dom.structureContent.innerHTML = `
    <div class="struct-workbench">

      <!-- 顶部工具栏 -->
      <div class="struct-topbar">
        <div class="struct-topbar__left">
          <span class="struct-topbar__template-label">叙事结构</span>
          <button class="struct-topbar__template-chip" type="button" data-action="open-structure-library" title="点击切换叙事结构模板">
            <span class="struct-topbar__template-name">${escapeHtml(templateLabel)}</span>
            <span class="struct-topbar__template-caret">▾</span>
          </button>
          ${rhythmLabel ? `<span class="struct-topbar__rhythm">${escapeHtml(rhythmLabel)}</span>` : ""}
          ${structure.library_name ? `<span class="chip chip--soft">套用：${escapeHtml(structure.library_name)}</span>` : ""}
        </div>
        <div class="struct-topbar__right">
          ${orderedActs.length > 0 ? `
            <button class="button button--primary button--small" type="button" data-action="ai-gen-structure-notes"
              ${appState.structureNodeGen?.loading ? "disabled" : ""}>
              ${appState.structureNodeGen?.loading
                ? `生成中… ${appState.structureNodeGen.progress || ""}`
                : "✦ AI 填写情节点"}
            </button>
          ` : ""}
          <button class="button button--ghost button--tiny" type="button" data-action="open-structure-config" title="结构高级设置">
            ⚙
          </button>
        </div>
      </div>

      <!-- 故事核心折叠栏 -->
      ${renderStoryCoreBar(storyCore)}

      <!-- 幕行区域 -->
      <div class="struct-acts-area">
        ${appState.structureNodeGen?.error ? `<p class="ai-error-hint">${escapeHtml(appState.structureNodeGen.error)}</p>` : ""}
        ${actsHtml}
      </div>

      <!-- 节点编辑抽屉 -->
      ${renderNodeDrawer(selectedNode)}

    </div>
  `;

  // 自动撑高 textarea
  dom.structureContent.querySelectorAll("textarea").forEach((ta) => {
    const resize = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
    resize();
    ta.addEventListener("input", resize);
  });

  // 高亮已选节点卡片
  if (selectedNodeId) {
    const card = dom.structureContent.querySelector(`[data-node-id="${selectedNodeId}"]`);
    if (card) card.classList.add("is-active");
  }
}
