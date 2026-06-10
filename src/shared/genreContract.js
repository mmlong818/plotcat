// 类型契约引擎：单类型匹配 + 混合类型契约合成。
// 设计原则：主导类型（primary）给结构骨架——必备场景、典型弧线、观众承诺；
// 调味类型（secondary，至多 2 个）给场景级肌理——冲突素材、禁忌合并、调性提醒。
// 混合不是平均：副类型绝不覆盖主类型的结构义务，只做注入与扩充。
import { GENRE_LIBRARY } from "../data/genreLibrary.js";

// 用户自由输入的类型标签 → 知识库条目的别名表
const GENRE_ALIASES = {
  romance: ["爱情", "都市情感", "情感", "言情", "甜宠", "恋爱", "浪漫"],
  suspense_crime: ["悬疑", "犯罪", "刑侦", "推理", "罪案", "探案", "悬疑犯罪", "本格", "社会派"],
  family_drama: ["家庭", "伦理", "家庭伦理", "亲情", "家族"],
  youth_campus: ["青春", "校园", "成长", "青春成长", "校园青春"],
  workplace: ["职场", "行业", "职业", "商战", "医疗", "律政", "律师", "医生"],
  fantasy_xianxia: ["奇幻", "仙侠", "玄幻", "修仙", "古偶", "东方奇幻", "魔幻"],
  historical_costume: ["历史", "古装", "宫廷", "权谋", "朝堂", "年代", "传记"],
  comedy: ["喜剧", "轻喜剧", "荒诞", "搞笑", "幽默", "情景喜剧"],
  thriller_action: ["动作", "谍战", "特工", "惊险", "动作悬疑", "枪战", "卧底"],
  sci_fi: ["科幻", "未来", "赛博朋克", "太空", "人工智能", "AI", "时间旅行"],
  horror: ["恐怖", "惊悚", "灵异", "心理惊悚", "怪谈"],
  war_military: ["战争", "军旅", "军事", "抗战", "热血军营"],
  micro_drama: ["微短剧", "短剧", "竖屏", "爽剧", "赘婿", "甜宠短剧", "战神", "神豪", "真千金"]
};

const GENRE_BY_ID = new Map(GENRE_LIBRARY.map((g) => [g.id, g]));

// 把一个自由文本标签解析成知识库条目（找不到返回 null）
export function resolveGenre(tag) {
  const t = String(tag ?? "").trim();
  if (!t) return null;
  if (GENRE_BY_ID.has(t)) return GENRE_BY_ID.get(t);
  for (const g of GENRE_LIBRARY) {
    if (g.label === t || g.label.includes(t)) return g;
  }
  for (const [id, aliases] of Object.entries(GENRE_ALIASES)) {
    if (aliases.some((a) => t === a || t.includes(a) || a.includes(t))) return GENRE_BY_ID.get(id);
  }
  return null;
}

// 从项目的类型标签数组解析出 主导类型 + 调味类型（去重，最多 2 个调味）
export function resolveGenreBlend(genreTags = []) {
  const tags = Array.isArray(genreTags) ? genreTags : [genreTags];
  const seen = new Set();
  const resolved = [];
  for (const tag of tags) {
    const g = resolveGenre(tag);
    if (g && !seen.has(g.id)) { seen.add(g.id); resolved.push(g); }
  }
  return {
    primary: resolved[0] ?? null,
    secondaries: resolved.slice(1, 3),
    unrecognized: tags.filter((t) => String(t).trim() && !resolveGenre(t))
  };
}

// 合成混合类型契约文本（注入 prompt 用）。
// scope 控制详略：
//   "full"  — 结构级步骤（logline/beat/概念/结构）：主类型全量契约 + 副类型冲突与调性
//   "scene" — 场景级步骤（写本场/拆解）：禁忌全集 + 主类型观众承诺 + 副类型肌理提醒
export function buildGenreBlendContract(genreTags = [], scope = "full") {
  const { primary, secondaries } = resolveGenreBlend(genreTags);
  if (!primary) return "";
  const parts = [];

  if (scope === "full") {
    parts.push(`【主导类型：${primary.label}】`);
    parts.push(`观众承诺（全片必须兑现）：${primary.audience_promise}`);
    parts.push(`必备场景（结构义务，缺一即类型失格）：\n${primary.obligatory_scenes.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
    parts.push(`典型弧线：${primary.typical_arc}`);
    parts.push(`类型禁忌：\n${primary.forbidden_patterns.map((s) => `- ${s}`).join("\n")}`);
    for (const g of secondaries) {
      parts.push(`【调味类型：${g.label}】（只做注入，不得改变主导类型的结构义务）`);
      parts.push(`可借用的冲突引擎：${g.key_conflicts.join("；")}`);
      parts.push(`借用时同样要避开它的禁忌：${g.forbidden_patterns.slice(0, 2).map((s) => s.split("，")[0]).join("；")}`);
    }
    if (secondaries.length > 0) {
      parts.push(`【混合纪律】主导类型负责骨架（结构节点、幕高潮、结局形态），调味类型负责场景肌理（关系张力、调性、副线）。禁止两个类型各讲半部戏——每场戏都应同时被两种类型的能量穿过，而非交替切换。`);
    }
  } else {
    parts.push(`【类型契约：${[primary.label, ...secondaries.map((g) => g.label)].join(" × ")}】`);
    parts.push(`主导观众承诺：${primary.audience_promise}`);
    const allForbidden = [primary, ...secondaries].flatMap((g) => g.forbidden_patterns);
    parts.push(`本场必须避开的类型禁忌：\n${allForbidden.map((s) => `- ${s}`).join("\n")}`);
    for (const g of secondaries) {
      parts.push(`调味提醒（${g.label}）：在不喧宾夺主的前提下，让本场带上它的肌理——${g.key_conflicts[0]}`);
    }
  }
  return parts.join("\n\n");
}

