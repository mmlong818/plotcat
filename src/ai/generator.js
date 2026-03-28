import {
  buildLoglinePrompt,
  buildTreatmentPrompt,
  buildCharactersPrompt,
  buildBeatSheetPrompt,
  buildSceneOutlinePrompt,
  buildSceneWeavePrompt,
  buildDiagnosisPrompt
} from './prompts.js';

let GENRE_LIBRARY = {};
let BEAT_SHEET_LIBRARY = {};

try {
  const genreModule = await import('../data/genreLibrary.js');
  GENRE_LIBRARY = genreModule.GENRE_LIBRARY ?? {};
} catch {
  // 知识库文件尚未创建，使用空对象
}

try {
  const beatModule = await import('../data/beatSheetLibrary.js');
  BEAT_SHEET_LIBRARY = beatModule.BEAT_SHEET_LIBRARY ?? {};
} catch {
  // 知识库文件尚未创建，使用空对象
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 90_000;

function makeId() {
  return `choice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function getGenreData(projectContext) {
  const p = projectContext?.project ?? projectContext;
  const genres = p?.project?.genre ?? p?.genre_profile?.primary_genre ?? [];
  const primaryGenre = Array.isArray(genres) ? genres[0] : genres;
  return primaryGenre ? (GENRE_LIBRARY[primaryGenre] ?? null) : null;
}

function getBeatData(template) {
  return BEAT_SHEET_LIBRARY[template] ?? null;
}

async function callClaude(system, user, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: 'user', content: user }]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API错误 ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    return parseJsonFromText(text);
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonFromText(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    return { raw: text };
  }
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

const FORMATTERS = {
  logline: formatLoglineChoices,
  treatment: formatTreatmentChoices,
  characters: formatCharactersChoices,
  beat_sheet: formatBeatSheetChoices,
  scene_outline: formatSceneOutlineChoices,
  scene_weave: formatSceneWeaveChoices,
  diagnosis: formatDiagnosisChoices
};

const PROMPT_BUILDERS = {
  logline: (ctx, opts, gd) => buildLoglinePrompt(ctx, opts, gd),
  treatment: (ctx, opts) => buildTreatmentPrompt(ctx, opts),
  characters: (ctx, opts, gd) => buildCharactersPrompt(ctx, opts, gd),
  beat_sheet: (ctx, opts, gd, bd) => buildBeatSheetPrompt(ctx, opts, gd, bd),
  scene_outline: (ctx, opts) => buildSceneOutlinePrompt(ctx, opts),
  scene_weave: (ctx, opts) => buildSceneWeavePrompt(ctx, opts),
  diagnosis: (ctx) => buildDiagnosisPrompt(ctx)
};

export async function generateContent(step, projectContext, options, apiKey) {
  const builder = PROMPT_BUILDERS[step];
  if (!builder) throw new Error(`未知的生成步骤: ${step}`);

  const genreData = getGenreData(projectContext);
  const beatData = options?.template ? getBeatData(options.template) : null;

  const { system, user } = builder(projectContext, options, genreData, beatData);
  const parsed = await callClaude(system, user, apiKey);

  const formatter = FORMATTERS[step] ?? ((p) => [{ id: makeId(), label: '方案A', content: JSON.stringify(p), data: p }]);
  const choices = formatter(parsed);

  return {
    choices,
    reasoning: parsed.reasoning ?? '',
    warnings: parsed.warnings ?? []
  };
}
