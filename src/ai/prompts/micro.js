// 微短剧节点 AI 提示词（依据《2025版微短剧AI辅助编剧系统》各节点设计）。
// 每个 builder 返回 {system, user}，user 末尾给出严格 JSON 输出 schema。

import { resolveProjectDoc } from "./shared.js";

const NO_EN_QUOTE = "严格输出 JSON；字符串内部禁止使用英文双引号，用书名号《》或中文引号代替。";

// 连贯性铁律：下游节点必须严格沿用上游已锁定的同一个故事/主角/世界/题材，禁止另起炉灶。
const COHERENCE = `【连贯性铁律·最高优先级】下面「已锁定设定」是本剧此前各节点确定的内容。你必须严格沿用——同一个故事、同一个主角（姓名与身份不得更换）、同一个世界观、同一题材方向。绝对禁止另起炉灶、不得新造一个无关的故事或主角、不得偷换题材。本节点只是把这个【已定的故事】在当前维度上具体化、向下延展。`;

// 把锁定的故事/主角以【具体内联指令】再钉一次——GLM 类模型有强烈套路惯性（动辄漂成赘婿/战神/
// 医仙/算命师），仅靠"参照上文设定"的软约束会被忽略，必须把具体身份直接写进指令。
function hardAnchor(proj) {
  const ll = proj.theme_anchor?.logline, pid = proj.char_smith?.protagonist?.identity;
  const P = [];
  if (ll) P.push(`本剧自始至终只讲这一个故事：《${ll}》。`);
  if (pid) P.push(`主角永远是同一个人：「${pid}」。你的输出必须沿用这个主角，绝不允许改名/改性别/改身份/改职业，更不得擅自替换成赘婿、战神、医仙、算命师、鉴宝师等任何与该身份不符的流量套路人设。`);
  return P.length ? `【强制锚点】${P.join("")}` : "";
}

// 汇总【上游】已锁定设定供下游强约束。level 控制只纳入严格上游节点，排除自身与下游，
// 否则重生成本节点时会被自己的旧产出锁死、永远复刻旧内容。
// level: 1=仅theme | 2=+world | 3=+chars | 4=+plot | 5=全部(后段节点)
function lockedSettings(proj, level = 5) {
  const ta = proj.theme_anchor ?? {}, w = proj.world_forge ?? {}, cs = proj.char_smith ?? {}, pf = proj.plot_frame ?? {};
  const L = [];
  if (level >= 1) {
    if (ta.logline) L.push(`· 一句话故事：《${ta.logline}》`);
    if (ta.track) L.push(`· 赛道：${ta.track}`);
    if (ta.values) L.push(`· 价值底色：${ta.values}`);
    if (ta.theme_statement?.core) L.push(`· 核心命题(全剧升华落点)：${ta.theme_statement.core}`);
  }
  if (level >= 2) {
    if (w.summary) L.push(`· 世界观：${w.summary}`);
    if (w.rules?.power) L.push(`· 权力/制度：${w.rules.power}`);
  }
  if (level >= 3) {
    if (cs.protagonist?.identity) L.push(`· 主角：${cs.protagonist.identity}（欲望：${cs.protagonist.desire || ""}；缺陷：${cs.protagonist.flaw || ""}）`);
    if (cs.antagonist?.motive) L.push(`· 反派：${cs.antagonist.motive}`);
  }
  if (level >= 4) {
    if (Array.isArray(pf.event_chain) && pf.event_chain.length) L.push(`· 主线事件链：${pf.event_chain.join(" → ")}`);
  }
  if (proj.gender_tune?.mode) L.push(`· 频向：${{ male: "男频", female: "女频", mixed: "混频" }[proj.gender_tune.mode]}`);
  return L.length ? L.join("\n") : "（暂无上游设定，请据题材自行确立并保持自洽）";
}

// 节点 01 · 主题与创意定位器 ThemeAnchor
export function buildThemeAnchorPrompt(ctx, opts) {
  const p = ctx?.project?.project ?? ctx?.project ?? ctx ?? {};
  const o = opts ?? {};
  const concept = (o.concept || p.logline || "").trim();
  const platform = (o.platform || "竖屏微短剧 / 单集2-3分钟").trim();
  const audience = (o.audience || "").trim();
  const genres = (Array.isArray(p.genre) ? p.genre : []).join("、") || "不限";
  // 频向在设计之初(主题定位)即确立，须从本节点起贯穿全剧基调
  const gmode = resolveProjectDoc(ctx).gender_tune?.mode;
  const genderLine = gmode ? `\n频向（贯穿全剧基调，受众/赛道/价值观都须据此）：${{ male: "男频", female: "女频", mixed: "混频" }[gmode]}` : "";

  const system = `你是微短剧创意分析专家（主题与创意定位器 ThemeAnchor），负责在动笔前锁定赛道、受众与价值观，为后续所有节点提供"方向锚"。
${NO_EN_QUOTE}`;

  const user = `【输入】
故事概念/关键词：${concept || "（待定，请基于题材自由发挥一个有钩子的方向）"}
目标平台/时长：${platform}
受众设想：${audience || "（未定，请给出建议画像）"}
题材类型：${genres}${genderLine}

【分析框架】创意诊断矩阵：赛道匹配（类型→受众→平台时长）｜情感驱动（目标情绪与宣泄点）｜冲突潜力（可持续推进的矛盾源）｜差异化（避同质化的独特切口）。
【质量要求】
- 一句话故事 ≤15字、可复述、不含大而空的词
- 冲突源能连贯支撑多集推进
- 主题价值观清晰、不含越界表达
- 差异化必须能落到具体桥段或设定
【主题升华·开局即定】动笔前先钉死本剧的核心命题与记忆锚点，作为全剧情感与价值的最终落点，
反向指导后续每一集的写作（不是写完才升华，而是开局就立住要升华什么）。

仅输出如下 JSON（不要任何解释或代码块标记）：
{
  "logline": "一句话故事（≤15字核心概念）",
  "track": "赛道定位：类型/子类型/平台节奏要求",
  "audience": "目标受众：性别/年龄/核心诉求",
  "values": "主题与价值观：主旨/价值底色/不可逾线点",
  "theme_statement": {"core": "核心命题：一句话本剧到底要说什么", "form": "通过什么情节/人物转变来体现", "meaning": "对目标受众的情感或价值意义"},
  "anchors": {"line": "全剧金句（可独立传播）", "scene": "最高记忆点的场面", "emotion": "最强情感锚点"},
  "diff": ["差异化要素（独特设定/结构/人物关系/情感表达，可落到桥段）", "..."],
  "risks": ["风险预警（同质化/逻辑漏洞/审查/审美疲劳）及规避建议", "..."]
}`;

  return { system, user };
}

// 节点 02 · 背景与世界观构建器 WorldForge
export function buildWorldForgePrompt(ctx, opts) {
  const proj = resolveProjectDoc(ctx);
  const o = opts ?? {};
  const era = (o.era || "").trim();
  const place = (o.place || "").trim();
  const conflictType = (o.conflict_type || "").trim();

  const system = `你是微短剧背景设定顾问（背景与世界观构建器 WorldForge），构建时间/空间/社会规则的"叙事土壤"，让冲突合理、反转可被解释。
${NO_EN_QUOTE}`;

  const user = `${COHERENCE}

【已锁定设定】
${lockedSettings(proj, 1)}

【本节点输入】
时代设想：${era || "（未定，请据题材给最小可用设定）"}
地点/场域：${place || "（未定）"}
核心冲突类型：${conflictType || "（未定）"}

【框架】背景三层（时间轴/空间域/秩序面）＋冲突承载力（设定需能承载矛盾：稀缺/禁忌/等级/利益链）。
【要求】设定不喧宾夺主、服务剧情；规则能解释关键反转而非强行开挂；删繁就简只留支撑剧情的必要设定。

仅输出 JSON（不要解释或代码块标记）：
{
  "summary": "背景摘要：时间/地点/行业或圈层，简洁概括",
  "rules": {
    "identity": "身份/阶层划分及其影响",
    "power": "权力结构/社会制度及其运作方式",
    "resource": "稀缺资源/社会禁忌及其对人物行为的约束",
    "breakage": "核心规则被打破的后果，以及剧情如何修复/重塑这些规则"
  },
  "conflict_triggers": ["规则与人物目标直接冲突的爆发点（可支撑多集的矛盾源）", "..."]
}`;

  return { system, user };
}

// 节点 03 · 人物设定工坊 CharSmith
export function buildCharSmithPrompt(ctx, opts) {
  const proj = resolveProjectDoc(ctx);
  const note = (opts?.note || "").trim();

  const system = `你是微短剧人物设计专家（人物设定工坊 CharSmith），打造主角/配角/反派的人设体系与关系网，确保"欲望—障碍—代价—成长"闭环，杜绝工具人。
${NO_EN_QUOTE}`;

  const user = `${COHERENCE}
${hardAnchor(proj)}
【特别注意】protagonist 必须就是上述「一句话故事」里的那个人，是同一个角色（沿用其身份与处境），不得另造一个无关主角，也不得套用赘婿/战神/医仙/算命师等与故事无关的流量人设。

【已锁定设定】
${lockedSettings(proj, 2)}
${note ? `创作者补充：${note}` : ""}

【框架】人物五键（身份/性格/欲望/伤口/能力与限制）＋功能分工（主角推动线/配角助推或对照/反派制造压强）。
【要求】主角"欲望-障碍-代价-成长"闭环；反派有魅力且压强足、非纯恶；配角功能明确、有记忆点；人设能解释关键反转与爽点。短剧人设要标签化、识别度高。

【输出前自检·必做】先在 premise_lock 里一字不差地复述上面「一句话故事」，protagonist 必须就是这个故事里的主角本人（身份/性别/处境一致），不得另造无关人设或套用赘婿/战神/医仙等流量套路。

仅输出 JSON（不要解释或代码块标记）：
{
  "premise_lock": "复述本剧锁定的一句话故事（沿用，不得更改）",
  "protagonist": {
    "identity": "身份标签：社会角色/外在特征/识别度",
    "desire": "核心欲望：最强烈渴望获得的东西（具体化）",
    "flaw": "致命缺陷：性格弱点/能力盲区/情感创伤",
    "ability": "独特能力：解决问题的专长/天赋",
    "growth": "成长路径：从缺陷到成熟的转变轨迹"
  },
  "supporting": [
    { "name": "配角名", "function": "功能定位：助攻/镜像/引导/阻碍", "relation": "与主角的情感与利益关系", "memory_tag": "观众易记的特质标签" }
  ],
  "antagonist": {
    "motive": "动机逻辑：行为的内在驱动力（非纯恶意）",
    "power": "能力评估：对抗主角的资源与手段",
    "charm": "魅力包装：让观众恨之入骨又欣赏的特质"
  },
  "relations": "关系图谱：核心人物间的利益/情感/权力关系网（一段话）"
}`;

  return { system, user };
}

// 节点 04 · 总剧情框架架构师 PlotFrame
export function buildPlotFramePrompt(ctx, opts) {
  const proj = resolveProjectDoc(ctx);
  const o = opts ?? {};
  const episodes = (o.episodes || "").trim();
  const length = (o.length || "").trim();

  const system = `你是微短剧剧情架构师（总剧情框架架构师 PlotFrame），搭建全剧"起—承—转—合"的宏观走向与冲突主轴，为分集设计预留节点。
${NO_EN_QUOTE}`;

  const user = `${COHERENCE}
${hardAnchor(proj)}
【特别注意】event_chain 每一条都必须围绕上述这个主角展开，主线就是这个主角的故事，不得另设新主角/新故事。

【已锁定设定】
${lockedSettings(proj, 3)}

【本节点输入】
预期总集数：${episodes || "（未定，按短剧常见 60-100 集量级或你的判断）"}
单集时长：${length || "2-3分钟"}

【主轴三问】主角要什么？谁/什么在阻挡？付出什么代价后达成/失去什么？
【要求】每一阶段都有可演化的障碍；高潮前伏笔充分、反转合情合理；终局与人物弧/主题闭环。

【输出前自检·必做】先在 protagonist_lock 里一字不差地复述上面锁定的主角身份，写完后，event_chain/acts/turns 的每一句都必须紧扣这个被你复述的主角——若你写出的主线主角与 protagonist_lock 不是同一个人（例如擅自变成赘婿/入赘/战神），即为严重违规，必须推倒重写。

仅输出 JSON（不要解释或代码块标记）：
{
  "protagonist_lock": "复述本剧锁定主角的身份（沿用，不得更改）",
  "event_chain": ["事件链（起）", "（承）", "（转）", "（合）……共 6-10 句完成全剧主线，每句紧扣 protagonist_lock 里的主角"],
  "acts": {
    "act1": "第一幕·建立：人物登场/世界介绍/冲突萌芽",
    "act2": "第二幕·对抗：矛盾升级/多重阻碍/情感波动",
    "act3": "第三幕·解决：最终对决/真相揭示/价值确认"
  },
  "turns": {
    "catalyst": "激发事件：故事真正开始的触发点",
    "midpoint": "中点转折：改变局面的重大变化",
    "crisis": "危机时刻：主角面临最大威胁",
    "climax": "高潮决战：最终冲突的爆发点",
    "ending": "结局回响：主题落地的情感确认"
  },
  "suspense": ["每幕结尾的钩子设计", "..."]
}`;

  return { system, user };
}

function microCtxLines(proj) {
  return `${COHERENCE}\n${hardAnchor(proj)}\n\n【已锁定设定】\n${lockedSettings(proj)}`;
}

// 节点 ⑥⑦ · 爽点引擎 ThrillEngine + 矛盾递进高潮 ClimaxLadder（合并）
export function buildThrillPrompt(ctx) {
  const proj = resolveProjectDoc(ctx);
  const system = `你是微短剧爽点与冲突设计专家（爽点引擎 ThrillEngine ＋ 矛盾递进高潮 ClimaxLadder），提炼主/辅爽点并规划全剧释放节奏，同时设计压力递进与重量级反转、高潮落点。\n${NO_EN_QUOTE}`;
  const user = `【上游输入】\n${microCtxLines(proj)}\n\n【框架】三层爽点（本能/社会/智慧）＋复合化（叠加/升级/反转）；多重压力叠加（外压+内压+时间压）；反转=埋伏笔→误导→揭晓→余波。\n【要求】主爽点与主线紧绑；强度分级与间隔合理避疲劳；反转伏笔可回溯非生造巧合；高潮兼顾情绪峰值与信息价值。\n\n仅输出 JSON：\n{\n  "main_thrills": [{"layer":"本能/社会/智慧层","desc":"触发机制+表现形式","payoff":"情感回报"}],\n  "aux_thrills": ["辅助爽点（过渡/铺垫/变奏）"],\n  "release_table": [{"ep":"集数/区间","type":"爽点类型","strength":"强度1-10","note":"与悬念/付费关系"}],\n  "pressure": {"s1":"第1阶段·小摩擦","s2":"第2阶段·中冲突","s3":"第3阶段·大危机"},\n  "reversals": [{"foreshadow":"伏笔布局","mislead":"误导方向","reveal":"真相揭示","aftermath":"后果波及"}],\n  "climax": "高潮爆发点：触发时机/爆发形式/情感峰值/价值确认"\n}`;
  return { system, user };
}

// 节点 ⑩ · 分集节奏与付费设计 PacePay
export function buildPacePayPrompt(ctx) {
  const proj = resolveProjectDoc(ctx);
  const eps = proj.plot_frame?.input_episodes || "";
  const system = `你是微短剧分集节奏设计师（PacePay），提供单集节奏模板与全剧付费节点布局，实现"看完这集必须点下一集"。\n${NO_EN_QUOTE}`;
  const user = `【上游输入】\n${microCtxLines(proj)}\n预期总集数：${eps || "（按短剧常见量级）"}\n\n【原则】单集模板：开场钩子(15s)→冲突(60s)→小反转(25s)→悬念钩(20s)；付费节点落在"最想看的瞬间之前"，付费后强度与信息密度显著提升。\n\n仅输出 JSON：\n{\n  "ep_template": "单集标准模板（钩-战-反-钩，标注各时间段任务与情感目标）",\n  "zones": {"free":"免费区（建立人物+核心冲突，第几集）","paid1":"首付费区（矛盾升级+局部高潮，第几集）","paid2":"深度付费区（终极对决+主题升华，第几集）"},\n  "pay_nodes": [{"at":"触发时机（第X集悬念点前）","mechanism":"心理机制","value":"付费后独特体验/信息"}]\n}`;
  return { system, user };
}

// 节点 ⑧ · 对话冲突生成器 DialogueForge（三段递进）
export function buildDialoguePrompt(ctx, opts) {
  const proj = resolveProjectDoc(ctx);
  const o = opts ?? {};
  const scene = (o.scene || "").trim();
  const system = `你是微短剧高张力对话生成器（DialogueForge），把场景级矛盾落地为"挑衅→加压→反杀"三段递进对白，产出短、狠、戳心的台词与一锤定音的金句。\n${NO_EN_QUOTE}`;
  const user = `【上游输入】\n${microCtxLines(proj)}\n本场冲突描述：${scene || "（请基于主线选一个高张力对峙场景）"}\n\n【框架】三段递进：表层挑衅→中段加压→终段反杀（每段3-5句）；短句优先、信息含金量高、情绪节拍清晰。\n【输出前自检·必做】先在 cast_lock 里写明本场对手戏的双方是谁（其中一方必须是锁定主角本人），台词须符合其身份口吻，不得让一个与本剧无关的新人物开口。\n\n仅输出 JSON：\n{\n  "cast_lock": "本场在场人物（必须含锁定主角，注明各自身份）",\n  "setting": "场景设定：地点环境+在场人物+时间压力",\n  "rounds": [\n    {"round":"第一轮·试探","a":"A的台词","b":"B的台词"},\n    {"round":"第二轮·施压","a":"...","b":"..."},\n    {"round":"第三轮·爆发","a":"...","b":"..."}\n  ],\n  "golden_line": "一锤定音、可独立传播的金句",\n  "action": "配合台词的关键动作与表情变化"\n}`;
  return { system, user };
}

// 节点 ⑪ · 主题升华与观众代入 ThemeLift
export function buildThemeLiftPrompt(ctx) {
  const proj = resolveProjectDoc(ctx);
  const system = `你是微短剧主题与共鸣顾问（ThemeLift），确保结局完成价值验证，并规划情绪曲线与记忆锚点强化共鸣与回味。\n${NO_EN_QUOTE}`;
  const user = `【上游输入】\n${microCtxLines(proj)}\n\n【框架】情绪曲线（爽/虐/甜/解压有节律循环，峰谷对比）＋主旨锚点（高潮/结局完成价值验证与人物弧收束）。\n\n仅输出 JSON：\n{\n  "theme_statement": {"core":"核心命题（要证明的价值观点）","form":"表现形式（主角经历体现的人生道理）","meaning":"社会意义（对观众的现实指导）"},\n  "emotion_curve": [{"eps":"集区间","mood":"主导情绪","strength":"强度1-10","turn":"转换节点"}],\n  "anchors": {"line":"金句锚点","scene":"场面锚点","emotion":"情感锚点"},\n  "immersion": "观众代入机制：身份/处境/愿望/成长 代入"\n}`;
  return { system, user };
}

// 节点 ⑨ · 性别向差异化调优 GenderTune（mode 由用户选）
export function buildGenderTunePrompt(ctx, opts) {
  const proj = resolveProjectDoc(ctx);
  const mode = (opts?.mode || proj.gender_tune?.mode || "mixed");
  const modeLabel = mode === "male" ? "男频" : mode === "female" ? "女频" : "混频";
  const system = `你是微短剧性别向差异化设计专家（GenderTune），针对${modeLabel}受众优化诉求、节奏、场景与台词风格。\n${NO_EN_QUOTE}`;
  const user = `【上游输入】\n${microCtxLines(proj)}\n目标频向：${modeLabel}\n\n【原则】男频=能力/资源/尊严的快速满足、快节奏密集爽点、直接对抗；女频=情感/关系/成长的细腻递进、情感铺垫、心理博弈。诉求要落到场景与桥段而非抽象标签。\n\n仅输出 JSON：\n{\n  "demand_map": "受众核心诉求分析（落到具体桥段）",\n  "pace": "节奏控制方案",\n  "emotion": "情感处理方案",\n  "scenes": ["典型场景建议（×3）"],\n  "dialogue_style": "台词风格指引"\n}`;
  return { system, user };
}

// 流式剧本卷轴 · 单集写本/续写（节点⑤分集 + ⑥⑦爽点 + ⑩付费 落地为可拍剧本）
export function buildEpisodeScriptPrompt(ctx, opts) {
  const proj = resolveProjectDoc(ctx);
  const num = opts?.episodeNumber ?? "";
  const plan = opts?.plan ?? {};
  const prevTail = (opts?.prevTail ?? "").trim();
  const system = `你是微短剧剧本写手，把分集规划落地为可直接拍摄的竖屏短剧剧本（单集时长 1-2 分钟）。\n${NO_EN_QUOTE}`;
  const user = `${COHERENCE}
${hardAnchor(proj)}

【已锁定设定】
${lockedSettings(proj)}

【本集规划·第 ${num} 集】
- 黄金三秒钩子：${plan.hook_3s || "（开场即抓人，避免铺垫）"}
- 本集要兑付的爽/虐点：${plan.payoff || "（按主线推进）"}
- 集尾 cliffhanger：${plan.cliffhanger || "（结尾留强钩子逼追下一集）"}
- 本集情节：${plan.summary || "（按事件链顺序推进）"}
${prevTail ? `\n【上一集结尾（须无缝承接，不重复、不跳脱）】\n${prevTail.slice(-400)}` : "\n（这是开篇第一集，从黄金三秒钩子直接切入）"}

【写本铁律】
- 前 3 秒必须是钩子（冲突/反差/悬念），禁止环境铺垫开场。
- 主角即锁定主角本人，身份口吻一致；不得引入与本剧无关的新人物开口。
- 对白短句优先、含金量高、口语可表演；动作/表情提示精准。
- 结尾落在 cliffhanger 上，制造追看冲动。
- 标准剧本格式：场景头（内/外景 地点 时间）→ 动作描述 → 角色名+对白。

【输出前自检·必做】先在 premise_lock 写明锁定主角姓名与本集要推进的主线一句话，再写剧本。

仅输出 JSON：
{
  "premise_lock": "锁定主角（姓名+身份）+ 本集主线一句话",
  "script": "完整单集剧本文本（含场景头/动作/对白，可直接拍摄）"
}`;
  return { system, user };
}
