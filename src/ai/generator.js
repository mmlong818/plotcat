import { spawnClaude } from '../server/spawnClaude.js';
import {
  buildLoglinePrompt,
  buildTreatmentPrompt,
  buildCharactersPrompt,
  buildBeatSheetPrompt,
  buildSceneOutlinePrompt,
  buildSceneWeavePrompt,
  buildSceneScriptPrompt,
  buildSceneBreakdownPrompt,
  buildSceneExpansionPrompt,
  buildContinuityExtractionPrompt,
  buildGenreAuditPrompt,
  buildActRaterPrompt,
  buildDiagnosisPrompt,
  buildPulsePrompt,
  buildConceptPrompt,
  buildSynopsisPrompt,
  buildKeyScenesPrompt,
  buildActStructurePrompt,
  buildSingleCharacterPrompt,
  buildRefineCharacterPrompt,
  buildRelationshipsPrompt,
  buildWorldRulesPrompt,
  buildTimelineEventsPrompt,
  buildSetupPayoffsPrompt,
  buildEvaluateConceptsPrompt,
  buildEvaluateSynopsisPrompt,
  buildEvaluateCharactersPrompt,
  buildEvaluateKeyScenesPrompt,
  buildEvaluateActStructurePrompt
} from './prompts.js';

let BEAT_SHEET_LIBRARY = {};

try {
  const beatModule = await import('../data/beatSheetLibrary.js');
  BEAT_SHEET_LIBRARY = beatModule.BEAT_SHEET_LIBRARY ?? {};
} catch {
  // 知识库文件尚未创建，使用空对象
}

const TIMEOUT_MS = 300_000;

function makeId() {
  return `choice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// 类型知识注入已迁移到 prompts.js（shared/genreContract.js 的混合契约），不再在此层取库

function getBeatData(template) {
  return BEAT_SHEET_LIBRARY[template] ?? null;
}

function callClaude(system, user) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `${system}\n\n---\n\n${user}`;

    const proc = spawnClaude(['-p', '--output-format', 'text']);
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdin.setDefaultEncoding('utf8');

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('claude CLI 超时'));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    proc.stdin.write(fullPrompt, 'utf8');
    proc.stdin.end();

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude CLI 退出码 ${code}: ${stderr.slice(0, 300)}`));
      } else {
        resolve(parseJsonFromText(stdout));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function parseJsonFromText(text) {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  let raw;
  if (codeBlockMatch) {
    raw = codeBlockMatch[1];
  } else {
    // 从首个 { 开始用 brace counter 配对到对应 }，正确处理嵌套数组/对象
    raw = extractFirstBalancedJson(text) ?? text;
  }
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return JSON.parse(repairLLMJsonQuotes(trimmed));
    } catch {
      return { raw: text };
    }
  }
}

// 从文本中提取第一个 brace 平衡的 {...} 片段
function extractFirstBalancedJson(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === "\\") { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

// 修复 LLM 返回的 JSON 中，字符串值内嵌未转义的英文双引号
// 状态机：遇到 string 中的 "，若后续非空白非 : , } ] 则视为内嵌引号转义
function repairLLMJsonQuotes(text) {
  let result = "";
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { result += ch; escapeNext = false; continue; }
    if (ch === "\\") { result += ch; escapeNext = true; continue; }
    if (ch !== '"') { result += ch; continue; }
    if (!inString) { inString = true; result += ch; continue; }
    // 在 string 内遇到 "：看下一个非空白字符判断是否为字符串结束
    let j = i + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    const next = text[j];
    if (next === "," || next === "}" || next === "]" || next === ":" || next === undefined) {
      inString = false;
      result += ch;
    } else {
      result += '\\"';
    }
  }
  return result;
}

function formatLoglineChoices(parsed) {
  const loglines = parsed.loglines ?? [];
  if (loglines.length === 0) {
    return [{
      id: makeId(),
      label: '方案A',
      content: parsed.raw ?? JSON.stringify(parsed),
      data: parsed
    }];
  }
  const labels = ['方案A', '方案B', '方案C', '方案D'];
  return loglines.map((item, i) => ({
    id: makeId(),
    label: labels[i] ?? `方案${i + 1}`,
    content: `【${item.title ?? ''}】\n${item.hook ?? ''}\n\n外部冲突：${item.external_conflict ?? ''}\n内部冲突：${item.internal_conflict ?? ''}\n反转潜力：${item.twist_potential ?? ''}\n对标：${item.comparable ?? ''}`,
    data: item
  }));
}

function formatTreatmentChoices(parsed) {
  const t = parsed.treatment ?? {};
  const content = [
    `【开端】${t.opening ?? ''}`,
    `【激励事件】${t.catalyst ?? ''}`,
    `【中段复杂化】${t.midpoint_complication ?? ''}`,
    `【黑暗时刻】${t.dark_moment ?? ''}`,
    `【终局抉择】${t.final_choice ?? ''}`,
    `【余韵】${t.aftermath ?? ''}`,
    `\n主题：${parsed.theme_statement ?? ''}`
  ].join('\n\n');
  return [{ id: makeId(), label: '方案A', content, data: parsed }];
}

function formatCharactersChoices(parsed) {
  const chars = parsed.characters ?? [];
  const content = chars.map((c) =>
    `【${c.name}】${c.story_role ?? ''}\n欲望：${c.desire ?? ''}\n需求：${c.need ?? ''}\n创伤：${c.wound ?? ''}\n弧光：${c.arc_start ?? ''} → ${c.arc_end ?? ''}`
  ).join('\n\n');
  return [{ id: makeId(), label: '方案A', content, data: parsed }];
}

function formatBeatSheetChoices(parsed) {
  const beats = parsed.beat_sheet ?? [];
  const content = beats.map((b) =>
    `[${b.percentage ?? ''}] ${b.beat_name ?? ''}\n${b.what_happens ?? ''}\n主角状态：${b.protagonist_state ?? ''}`
  ).join('\n\n');
  return [{ id: makeId(), label: '方案A', content, data: parsed }];
}

function formatSceneOutlineChoices(parsed) {
  const scenes = parsed.scenes ?? [];
  if (scenes.length === 0) {
    return [{ id: makeId(), label: '方案A', content: parsed.raw ?? '', data: parsed }];
  }
  return scenes.map((s, i) => ({
    id: makeId(),
    label: `场景${i + 1}`,
    content: `${s.title ?? ''}\n目标：${s.scene_goal ?? ''}\n冲突：${s.conflict ?? ''}\n转折：${s.turn ?? ''}\n信息增量：${s.information_gain ?? ''}\n结尾问题：${s.end_question ?? ''}`,
    data: s
  }));
}

function formatSceneWeaveChoices(parsed) {
  return [{
    id: makeId(),
    label: '方案A',
    content: parsed.script ?? parsed.raw ?? '',
    data: parsed
  }];
}

function formatPulseChoices(parsed) {
  const seeds = parsed.seeds ?? [];
  if (seeds.length === 0) {
    return [{ id: makeId(), label: '方案A', content: parsed.raw ?? '', data: parsed }];
  }
  const labels = ['种子A', '种子B', '种子C'];
  return seeds.map((s, i) => ({
    id: makeId(),
    label: labels[i] ?? `种子${i + 1}`,
    content: `【${s.title ?? ''}】\n${s.hook ?? ''}\n\n冲突：${s.core_conflict ?? ''}\n置换：${s.twist ?? ''}\n风险：${s.weakness ?? ''}`,
    data: s
  }));
}

function formatDiagnosisChoices(parsed) {
  const scores = parsed.scores ?? {};
  const lines = Object.entries(scores).map(([key, val]) => {
    const labels = {
      story_structure: '故事结构',
      character_development: '角色发展',
      scene_tension: '场景张力',
      dialogue_quality: '对话质量',
      genre_fit: '类型符合度'
    };
    return `${labels[key] ?? key}：${val.score ?? 0}/10 - ${val.comment ?? ''}`;
  });
  const issues = (parsed.critical_issues ?? []).map((i) => `⚠ ${i.issue ?? ''} → ${i.fix ?? ''}`);
  const content = [
    `综合评分：${parsed.overall_score ?? 0}/10`,
    '',
    ...lines,
    '',
    '问题与建议：',
    ...issues,
    '',
    '优势：',
    ...(parsed.strengths ?? []).map((s) => `✓ ${s}`)
  ].join('\n');
  return [{ id: makeId(), label: '诊断报告', content, data: parsed }];
}

function formatConceptChoices(parsed) {
  const concepts = parsed.concepts ?? [];
  if (concepts.length === 0) {
    return [{ id: makeId(), label: '方案A', content: parsed.raw ?? JSON.stringify(parsed), data: parsed }];
  }
  const labels = ['方案A', '方案B', '方案C'];
  return concepts.map((item, i) => ({
    id: makeId(),
    label: labels[i] ?? `方案${i + 1}`,
    content: `【${item.title ?? ''}】\n${item.hook ?? ''}\n\n核心冲突：${item.core_conflict ?? ''}\n独特视角：${item.unique_angle ?? ''}`,
    data: item
  }));
}

function formatSynopsisChoices(parsed) {
  const synopses = parsed.synopses ?? [];
  if (synopses.length === 0) {
    return [{ id: makeId(), label: '方案A', content: parsed.raw ?? '', data: parsed }];
  }
  return synopses.map((s, i) => ({
    id: makeId(),
    label: s.version_label ?? `版本${i + 1}`,
    content: s.summary ?? '',
    data: s
  }));
}

function formatKeyScenesChoices(parsed) {
  const scenes = parsed.scenes ?? [];
  if (scenes.length === 0) {
    return [{ id: makeId(), label: '场景A', content: parsed.raw ?? '', data: parsed }];
  }
  return scenes.map((s, i) => ({
    id: makeId(),
    label: s.title ?? `场景${i + 1}`,
    content: `${s.title ?? ''}\n目标：${s.goal ?? ''}\n冲突：${s.conflict ?? ''}\n转折：${s.turn ?? ''}\n位置：${s.act_position ?? ''}`,
    data: s
  }));
}

function formatActStructureChoices(parsed) {
  const acts = parsed.acts ?? [];
  return [{
    id: makeId(),
    label: '三幕结构',
    content: acts.map((a) => `【${a.act_name ?? ''}】${a.percentage_range ?? ''}\n${(a.beats ?? []).map((b) => `  · ${b.name ?? ''}（${b.timing ?? ''}）：${b.description ?? ''}`).join('\n')}`).join('\n\n'),
    data: { acts, reasoning: parsed.reasoning ?? '' }
  }];
}

const FORMATTERS = {
  pulse: formatPulseChoices,
  logline: formatLoglineChoices,
  treatment: formatTreatmentChoices,
  characters: formatCharactersChoices,
  beat_sheet: formatBeatSheetChoices,
  scene_outline: formatSceneOutlineChoices,
  scene_weave: formatSceneWeaveChoices,
  scene_script: (parsed) => [{
    id: makeId(),
    label: '剧本',
    content: (parsed.script ?? '').slice(0, 80),
    data: parsed
  }],
  scene_breakdown: (parsed) => [{ id: makeId(), label: '场景拆解', content: parsed.entry_state ?? '', data: parsed }],
  scene_expansion: (parsed) => [{ id: makeId(), label: '全片场景表', content: `${(parsed.scenes ?? []).length} 场`, data: parsed }],
  continuity_extraction: (parsed) => [{ id: makeId(), label: '连续性提炼', content: `${(parsed.setup_payoffs ?? []).length} 组伏笔 / ${(parsed.timeline_events ?? []).length} 条时间线`, data: parsed }],
  genre_audit: (parsed) => [{ id: makeId(), label: '类型契约审计', content: `${(parsed.fulfillment ?? []).filter((f) => f.status === 'fulfilled').length}/${(parsed.fulfillment ?? []).length} 兑现`, data: parsed }],
  act_rater: (parsed) => [{ id: makeId(), label: '幕评师', content: `${parsed.overall?.score ?? '?'}/10`, data: parsed }],
  diagnosis: formatDiagnosisChoices,
  concept: formatConceptChoices,
  synopsis: formatSynopsisChoices,
  key_scenes: formatKeyScenesChoices,
  act_structure: formatActStructureChoices,
  single_character: (parsed) => [{ id: makeId(), label: '角色', content: parsed.character?.name ?? '', data: parsed }],
  refine_character: (parsed) => [{ id: makeId(), label: '修正结果', content: parsed.character?.name ?? '', data: parsed }],
  relationships: (parsed) => [{ id: makeId(), label: '关系网', content: `${(parsed.relationships ?? []).length} 条关系`, data: parsed }],
  world_rules: (parsed) => [{ id: makeId(), label: '世界规则', content: `${(parsed.world_rules ?? []).length} 条规则`, data: parsed }],
  timeline_events: (parsed) => [{ id: makeId(), label: '时间线', content: `${(parsed.timeline_events ?? []).length} 条事件`, data: parsed }],
  setup_payoffs: (parsed) => [{ id: makeId(), label: '伏笔', content: `${(parsed.setup_payoffs ?? []).length} 组伏笔`, data: parsed }]
};

const PROMPT_BUILDERS = {
  pulse: (_ctx, opts) => buildPulsePrompt(opts),
  logline: (ctx, opts, gd) => buildLoglinePrompt(ctx, opts, gd),
  treatment: (ctx, opts) => buildTreatmentPrompt(ctx, opts),
  characters: (ctx, opts, gd) => buildCharactersPrompt(ctx, opts, gd),
  beat_sheet: (ctx, opts, gd, bd) => buildBeatSheetPrompt(ctx, opts, gd, bd),
  scene_outline: (ctx, opts) => buildSceneOutlinePrompt(ctx, opts),
  scene_weave: (ctx, opts) => buildSceneWeavePrompt(ctx, opts),
  scene_script: (ctx, opts) => buildSceneScriptPrompt(ctx, opts),
  scene_breakdown: (ctx, opts) => buildSceneBreakdownPrompt(ctx, opts),
  scene_expansion: (ctx, opts) => buildSceneExpansionPrompt(ctx, opts),
  continuity_extraction: (ctx) => buildContinuityExtractionPrompt(ctx),
  genre_audit: (ctx) => buildGenreAuditPrompt(ctx),
  act_rater: (ctx, opts) => buildActRaterPrompt(ctx, opts),
  diagnosis: (ctx) => buildDiagnosisPrompt(ctx),
  concept: (_ctx, opts) => buildConceptPrompt(opts),
  synopsis: (ctx, opts) => buildSynopsisPrompt(ctx, opts),
  key_scenes: (ctx) => buildKeyScenesPrompt(ctx),
  act_structure: (ctx) => buildActStructurePrompt(ctx),
  single_character: (ctx, opts) => buildSingleCharacterPrompt(ctx, opts?.existingChars ?? [], opts?.storyRole ?? "supporting"),
  refine_character: (ctx, opts) => buildRefineCharacterPrompt(ctx, opts?.character ?? {}, opts?.lockedFields ?? []),
  relationships: (ctx, opts) => buildRelationshipsPrompt(ctx, opts),
  world_rules: (ctx) => buildWorldRulesPrompt(ctx),
  timeline_events: (ctx) => buildTimelineEventsPrompt(ctx),
  setup_payoffs: (ctx) => buildSetupPayoffsPrompt(ctx)
};

export function buildPromptForStep(step, projectContext, options) {
  const builder = PROMPT_BUILDERS[step];
  if (!builder) throw new Error(`未知的生成步骤: ${step}`);
  const beatData = options?.template ? getBeatData(options.template) : null;
  const { system, user } = builder(projectContext, options, null, beatData);
  return `${system}\n\n---\n\n${user}`;
}

export function formatStepResult(step, parsed) {
  const formatter = FORMATTERS[step] ?? ((p) => [{ id: makeId(), label: '方案A', content: JSON.stringify(p), data: p }]);
  return {
    choices: formatter(parsed),
    reasoning: parsed.reasoning ?? '',
    warnings: parsed.warnings ?? []
  };
}

export async function generateContent(step, projectContext, options, apiKey) {
  const builder = PROMPT_BUILDERS[step];
  if (!builder) throw new Error(`未知的生成步骤: ${step}`);

  const beatData = options?.template ? getBeatData(options.template) : null;

  const { system, user } = builder(projectContext, options, null, beatData);
  const parsed = await callClaude(system, user);

  const formatter = FORMATTERS[step] ?? ((p) => [{ id: makeId(), label: '方案A', content: JSON.stringify(p), data: p }]);
  const choices = formatter(parsed);

  return {
    choices,
    reasoning: parsed.reasoning ?? '',
    warnings: parsed.warnings ?? []
  };
}

const EVALUATE_BUILDERS = {
  concepts:      (content, ctx) => buildEvaluateConceptsPrompt(content, ctx),
  synopsis:      (content, ctx) => buildEvaluateSynopsisPrompt(content, ctx),
  characters:    (content, ctx) => buildEvaluateCharactersPrompt(content, ctx),
  key_scenes:    (content, ctx) => buildEvaluateKeyScenesPrompt(content, ctx),
  act_structure: (content, ctx) => buildEvaluateActStructurePrompt(content, ctx),
};

export function buildEvaluatePromptForStep(step, content, context) {
  const builder = EVALUATE_BUILDERS[step];
  if (!builder) throw new Error(`未知评估步骤: ${step}`);
  const { system, user } = builder(content, context ?? {});
  return `${system}\n\n---\n\n${user}`;
}
