// 说话人识别叶子模块：从剧本文本找出不在项目人物名单里的对白说话人。
// 纯逻辑，无副作用，A(sceneGeneration)/B(creationWorkbench)/D(scriptTools) 共用——
// 单独成模块以打破三簇间的循环依赖。
import { appState } from "../state.js";
import { list } from "../utils.js";

// 通用称谓（路人/职务），不算「名单外人名」
// 设备音/画外音类 cue：以这些词结尾的说话人不算「名单外人名」（科幻/现代题材常见）
const GENERIC_SUFFIX_RE = /(的?声音|提示音|广播|系统|电台|喇叭|控制台|对讲机?|铃声|录音|男声|女声)$/;
const GENERIC_SPEAKER_RE = /^(路人|店员|老板娘?|服务员|护士长?|医生|主治医生|警察|警员|司机|保安|旁白|画外音|众人|群众|记者|主持人|播音员|法医|助理|秘书|售货员|收银员|清洁工|门卫|邻居|乘客|售票员|司仪|副手|登记员|值班同事|取信员|工作人员|男声|女声|童声|电视新闻|电视(里|机)?|广播|出租车广播|电话(里|那头)?|对讲机)[甲乙丙丁ABC]?$/;

// 从剧本文本中找出不在项目人物名单里的对白说话人
export function findUnknownSpeakers(script) {
  const roster = new Set([
    ...list(appState.project.character_hub?.characters).map((c) => (c.name || "").trim()),
    ...list(appState.project.series_bible?.regulars).map((c) => (c.name || "").trim())
  ].filter(Boolean));
  const unknown = new Set();
  const lines = String(script).split(/\r?\n/).map((l) => l.trim());
  for (let i = 0; i < lines.length; i++) {
    // 对白说话人行：2-6 个汉字独立成行（允许带括注），且下一行紧跟对白文本
    const m = lines[i].match(/^([一-龥]{2,6})(（[^）]*）)?$/);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j]) j++;
    const next = lines[j] ?? "";
    // 下一行必须像对白（有内容且本身不是另一个独立人名行），否则当作短动作行跳过
    if (!next || /^([一-龥]{2,6})(（[^）]*）)?$/.test(next)) continue;
    const name = m[1];
    if (roster.has(name) || GENERIC_SPEAKER_RE.test(name) || GENERIC_SUFFIX_RE.test(name)) continue;
    if (/^(清晨|上午|正午|午后|黄昏|夜晚|深夜|黎明|同时|稍后|片刻|内景|外景)$/.test(name)) continue;
    unknown.add(name);
  }
  return Array.from(unknown);
}

// 人物名单（含「周念/小雅」这类别名写法拆开后的每个名字）
function rosterNameParts() {
  const parts = new Set();
  const all = [
    ...list(appState.project.character_hub?.characters).map((c) => c.name || ""),
    ...list(appState.project.series_bible?.regulars).map((c) => c.name || "")
  ];
  for (const raw of all) {
    raw.split(/[\/／·、]/).map((s) => s.trim()).filter(Boolean).forEach((p) => parts.add(p));
  }
  return parts;
}

// 同姓漂移检测：动作行里被引号强调的短人名（字条/物证/照片上的名字），
// 若与名单人物同姓但不在名单内，多半是 AI 写漂了（如设定「周念」写成「周瑶」）。
// 只查引号内的 2-3 字词，控制误报。
export function findRosterNameDrift(script) {
  const parts = rosterNameParts();
  const surnames = new Set(Array.from(parts).map((n) => n[0]).filter(Boolean));
  const drift = new Set();
  const quoted = String(script).matchAll(/[「“"']([一-龥]{2,3})[」”"']/g);
  for (const m of quoted) {
    const token = m[1];
    if (parts.has(token)) continue;
    if (!surnames.has(token[0])) continue;
    if (GENERIC_SPEAKER_RE.test(token) || GENERIC_SUFFIX_RE.test(token)) continue;
    drift.add(token);
  }
  return Array.from(drift);
}
