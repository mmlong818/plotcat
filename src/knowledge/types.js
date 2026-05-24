// 知识源框架的标准类型定义。
// 所有 provider 输入输出对齐到这些形态，前端 / 后端通用路由只认识这些字段。

/**
 * @typedef {Object} KnowledgeSourceMeta
 * @property {string} id            短码，例如 "storykb"
 * @property {string} name          展示名
 * @property {string} description   一句话简介
 * @property {string} homepage      源仓库/网站
 * @property {string[]} kinds       支持的条目种类列表
 * @property {boolean} hasSync      是否支持运行时 sync
 * @property {Object} status        { entryCount, lastSyncedAt }
 */

/**
 * @typedef {Object} KnowledgeEntrySummary
 * @property {string} source_id     所属源 id
 * @property {string} external_id   源内部 id
 * @property {string} kind          标准 kind：concept | trope | structure | character_archetype | rule | raw
 * @property {string} title         主标题（默认中文）
 * @property {string} subtitle      副标题（默认英文 / 别名）
 * @property {string[]} tags        分类标签
 * @property {string} preview       摘要片段（不超过 200 字）
 */

/**
 * @typedef {Object} KnowledgeEntryDetail
 * @property {string} source_id
 * @property {string} external_id
 * @property {string} kind
 * @property {string} title
 * @property {string} subtitle
 * @property {string[]} tags
 * @property {string[]} aliases
 * @property {string} body          完整内容，markdown
 * @property {Object} sections      章节哈希 { definition, mechanism, ... }
 * @property {string[]} related     相关条目 external_id 数组
 * @property {Object[]} sources     原始来源引用
 */

/**
 * @typedef {Object} KnowledgeProvider
 * @property {KnowledgeSourceMeta} meta
 * @property {function(): Promise<{ added: number, updated: number, removed: number, total: number }>} sync
 * @property {function(Object): Promise<{ items: KnowledgeEntrySummary[], total: number }>} listEntries
 * @property {function(string): Promise<KnowledgeEntryDetail | null>} getEntry
 */

export const STANDARD_KINDS = [
  "concept",            // 概念词条（理论、术语）
  "trope",              // 套路 / 桥段
  "structure",          // 结构模板
  "character_archetype",// 人物原型
  "rule",               // 世界设定规则
  "raw"                 // 未分类原文片段
];

export const KIND_LABELS = {
  concept: "概念",
  trope: "桥段",
  structure: "结构",
  character_archetype: "人物原型",
  rule: "规则",
  raw: "原文片段"
};

/**
 * 将 KnowledgeEntryDetail 映射为本地 lock_layer 字段的候选 patch。
 * Provider 不直接负责导入，由 importer.js 统一执行。
 */
export const STANDARD_IMPORT_TARGETS = ["world_rule", "timeline_event", "setup", "scene_note"];

export const IMPORT_TARGET_LABELS = {
  world_rule: "世界规则",
  timeline_event: "时间线事件",
  setup: "伏笔",
  scene_note: "场景备注"
};
