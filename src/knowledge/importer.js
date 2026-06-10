// 把知识源条目（KnowledgeEntryDetail）映射到本地 story_bible 字段。
// 调用方传入 detail + 选择的 target（world_rule / timeline_event / setup / scene_note），
// 此模块返回一个待 push 的对象 + 目标字段名。

function pickSection(detail, key) {
  return detail?.sections?.[key] || "";
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asWorldRule(detail) {
  // 用 definition + mechanism 拼成规则正文；scope 用 tags 第一个；rule_level 默认 soft（导入的是参考，不是硬约束）
  const statement = [
    detail.title + (detail.subtitle ? `（${detail.subtitle}）` : ""),
    pickSection(detail, "definition"),
    pickSection(detail, "mechanism") ? `运作机制：${pickSection(detail, "mechanism")}` : ""
  ].filter(Boolean).join("\n\n");
  return {
    field: "world_rules",
    item: {
      id: makeId("rule"),
      rule_statement: statement,
      scope: (detail.tags || [])[0] || "叙事原则",
      rule_level: "soft",
      exceptions: [],
      source_ref: { source_id: detail.source_id, external_id: detail.external_id, title: detail.title }
    }
  };
}

function asTimelineEvent(detail) {
  // 知识条目不是事件 — 这个映射主要用于「将示例案例做成参考事件」场景
  const examples = pickSection(detail, "examples");
  return {
    field: "timeline_events",
    item: {
      id: makeId("tl"),
      story_day: 0,
      sequence_index: 9999,
      summary: `参考：${detail.title}`,
      participants: [],
      location: "",
      trigger: pickSection(detail, "definition").slice(0, 120),
      consequence: examples.slice(0, 200),
      source_ref: { source_id: detail.source_id, external_id: detail.external_id, title: detail.title }
    }
  };
}

function asSetup(detail) {
  // 把"诊断 / 误区"段当作伏笔提醒
  return {
    field: "setup_payoffs",
    item: {
      id: makeId("setup"),
      setup_summary: `参考：${detail.title}${detail.subtitle ? ` (${detail.subtitle})` : ""}`,
      setup_scene_id: "",
      expected_payoff_window: "",
      status: "open",
      payoff_scene_id: "",
      payoff_summary: [
        pickSection(detail, "diagnostics") && `诊断：${pickSection(detail, "diagnostics")}`,
        pickSection(detail, "pitfalls") && `误区：${pickSection(detail, "pitfalls")}`
      ].filter(Boolean).join("\n\n"),
      source_ref: { source_id: detail.source_id, external_id: detail.external_id, title: detail.title }
    }
  };
}

const MAPPERS = {
  world_rule: asWorldRule,
  timeline_event: asTimelineEvent,
  setup: asSetup
};

/**
 * 返回 { field, item, sourceRefSummary } 供调用方 push 到 project.story_bible[field]。
 */
export function buildImportPatch(detail, target) {
  const mapper = MAPPERS[target];
  if (!mapper) throw new Error(`不支持的导入目标：${target}`);
  return mapper(detail);
}

