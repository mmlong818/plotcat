// ── 故事核心反推（创建后从幕节点推导四件套） ─────────────────────
export function buildStoryCorePrompt(context) {
  const doc = context?.project ? context : { project: {} };
  const proj = doc.project?.project ?? doc.project ?? {};
  const core = doc.story_core ?? doc.project?.story_core ?? {};
  const genres = Array.isArray(proj.genre) ? proj.genre : [];
  const nodes = (doc.structure_profile?.nodes ?? [])
    .filter((n) => (n.note ?? "").trim())
    .map((n) => `- ${n.title}：${String(n.note).slice(0, 90)}`)
    .join("\n");
  const chars = (doc.story_bible?.characters ?? [])
    .map((c) => `${c.name}（${c.story_role ?? ""}）：${c.external_want ?? ""}`)
    .join("；");

  const system = `你是剧作顾问，擅长从故事素材中提炼作品的核心命题。只输出JSON，字符串内禁止英文双引号，用《》代替。`;
  const user = `题材：${genres.join("、") || "未定"}
故事前提：${core.premise ?? proj.logline ?? ""}
主要人物：${chars || "未定"}
${nodes ? `结构节点（已定情节）：
${nodes}` : ""}

请从以上素材反推这部作品的核心命题，每个字段都要具体、贴合本故事，禁止套话：

输出JSON格式：
{
  "core_conflict": "核心冲突：两股不可调和的力量是什么（一句话，30-60字）",
  "central_question": "中心戏剧问题：观众追看全片想知道答案的那个问题（疑问句）",
  "emotional_promise": "情绪承诺：观众看这部片能获得的核心情绪体验（10-20字）",
  "theme_statement": "主题陈述：这个故事真正想说的话（一句话，不说教）"
}`;
  return { system, user };
}
