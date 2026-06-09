// 程序化生成 4 个空骨架项目的剧本
// 风格：密集散文 + 剧本对白；avg 行长 ≥ 15；无 em-dash 瀑布
process.env.NO_PROXY = '*';
process.env.no_proxy = '*';

const BASE = 'http://127.0.0.1:4173';

async function fetchJson(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// ============ 各项目场目录 ============

// 九重霜（玄幻·仙侠）— 24 场
const JIUCHONG_SCENES = makeJiuchongScenes();
const NANMEN_SCENES = makeNanmenScenes();
const SHANHUN_SCENES = makeShanhunScenes();
const CHONGSHENG_SCENES = makeChongshengScenes();

// ============ 主流程 ============

const TARGETS = [
  { pid: 'project_mpo78v43_jm1afy', label: '九重霜', slug: '08-xuanhuan-xianxia', scenes: JIUCHONG_SCENES, microdrama: false },
  { pid: 'project_mpo792s3_62fxay', label: '南门外的录像厅', slug: '09-niandai-90s', scenes: NANMEN_SCENES, microdrama: false },
  { pid: 'project_mpo77e8l_0l10r2', label: '闪婚豪门', slug: '01-dushi-tianchong', scenes: SHANHUN_SCENES, microdrama: true },
  { pid: 'project_mpo77tlv_fw9mi3', label: '重生 1999', slug: '04-chuanyue-chongsheng', scenes: CHONGSHENG_SCENES, microdrama: true },
];

function lintCheck(script) {
  if (!script || !script.trim()) return { ok: false, reason: 'EMPTY' };
  const lines = script.split(/\r?\n/);
  let run = 0, maxRun = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const tooShort = /^[^。.!?]{1,4}—{1,2}\s*$/.test(t) || (/^[一-龥]{1,3}。?$/.test(t) && i + 1 < lines.length && /^[一-龥]{1,4}—/.test(lines[i + 1].trim()));
    if (tooShort) { run++; if (run > maxRun) maxRun = run; } else run = 0;
  }
  const emCount = (script.match(/——/g) || []).length;
  const emDensity = (emCount * 100) / script.length;
  const nb = lines.map(l => l.trim()).filter(Boolean);
  const avg = nb.reduce((s, l) => s + l.length, 0) / Math.max(nb.length, 1);
  const hasSlug = lines.some(l => /^(INT\.|EXT\.|内景|外景)/i.test(l.trim()));
  const issues = [];
  if (!hasSlug) issues.push('NO_SLUG');
  if (maxRun >= 6) issues.push(`STACCATO(${maxRun})`);
  if (emDensity > 12) issues.push(`EMDASH(${emDensity.toFixed(1)})`);
  if (avg < 8) issues.push(`AVG(${avg.toFixed(1)})`);
  return { ok: issues.length === 0, issues, avg, maxRun, emDensity, len: script.length };
}

async function pushOne(t) {
  console.log(`\n=== ${t.label} ===`);
  const { project } = await fetchJson('GET', `/api/projects/${t.pid}`);
  const acts = project.structure_profile.acts;
  const cards = project.plot_board.cards;
  const charIds = project.story_bible.characters.map(c => c.id);

  // 自检
  for (let i = 0; i < t.scenes.length; i++) {
    const s = t.scenes[i];
    const r = lintCheck(s.script);
    if (!r.ok) {
      console.log(`  WARN #${i + 1} ${s.title}: ${r.issues.join(',')} (len=${r.len}, avg=${r.avg.toFixed(1)})`);
    }
  }

  const built = t.scenes.map((s, idx) => {
    const actId = acts[s.act]?.id || acts[Math.floor(idx * acts.length / t.scenes.length)]?.id || acts[0].id;
    const cardId = cards[s.cardIdx % cards.length]?.id || '';
    const povId = charIds[s.pov % charIds.length] ?? charIds[0];
    const sceneId = `scene_${t.slug}_v3_${String(idx).padStart(2, '0')}`;
    const bible = {
      id: sceneId, order_index: idx + 1, act_id: actId, title: s.title,
      pov_character_id: povId, location: s.location, time_of_day: s.time || '',
      goal: s.goal || '', obstacle: s.obstacle || '', tactic: '', turn: s.outcome || '',
      value_shift: '', new_information: [], input_state: '', output_state: '',
      production_tags: [], dialogue_seed: '', emotion_stage: '',
      script_full: s.script, screenplay_notes: '',
    };
    const workbench = {
      id: sceneId, order_index: idx + 1, title: s.title, act_id: actId,
      linked_plot_card_ids: cardId ? [cardId] : [],
      pov_character_id: povId, location: s.location, time_of_day: s.time || '',
      purpose: s.goal || '', obstacle: s.obstacle || '', beat_summary: s.outcome || '',
      entry_state: '', exit_state: '', status: 'draft',
      script_excerpt: '', script_full: s.script, screenplay_notes: '', notes: '',
    };
    return { bible, workbench };
  });

  project.story_bible.scene_cards = built.map(b => b.bible);
  project.scene_workbench = project.scene_workbench || {};
  project.scene_workbench.scenes = built.map(b => b.workbench);

  await fetchJson('PUT', `/api/projects/${t.pid}`, { project });

  const { project: re } = await fetchJson('GET', `/api/projects/${t.pid}`);
  let total = 0, min = Infinity;
  re.story_bible.scene_cards.forEach(sc => {
    const n = (sc.script_full || '').length;
    total += n;
    if (n < min) min = n;
  });
  console.log(`${t.label} | ${re.story_bible.scene_cards.length} 场 | ${total} 字 | 单场最低 ${min}`);
}

async function main() {
  for (const t of TARGETS) await pushOne(t);
}

// ============================== 场内容生成器 ==============================

// --- 通用：把一系列行（每行一句完整或半句）拼成密集散文剧本 ---
// 输入：lines 数组；每行就是一行
// 规则：场景头 1 行 + 空行 + 散文段（每段 ~50-80 字）+ 对白块（角色名/(情绪)/台词 三行）
function joinScript(slug, blocks) {
  return [slug, '', ...blocks, ''].join('\n');
}

// 紧凑对白：把角色名 + parenthetical + 台词压成一行（destaccato 已验证的格式）
function dlg(name, paren, text) {
  return paren ? `${name}（${paren}）：${text}` : `${name}：${text}`;
}

// 散文段：把多句拼成一段（避免过短行）
function prose(...sentences) {
  return sentences.filter(Boolean).join('').replace(/\s+/g, '');
}

// ============================== 九重霜 ==============================
// 角色：应霜（女主，凡身渡劫弟子）、玄昭（男主，九重天司命）、阿芜（婢女/真身魂仆）
// 题材：玄幻仙侠；九重劫 / 命格之争 / 司命笔
function makeJiuchongScenes() {
  const A = '应霜', B = '玄昭', C = '阿芜';
  const out = [];

  const tplProse = (idx, sceneTitle, loc, time, povName, lines) => {
    const slug = `INT. ${loc} - ${time}`;
    const body = [];
    body.push(prose(`${time}。${loc}。`, sceneTitle.includes('云海')?'云海低垂，剑光自远处划过。':'殿宇深寂，朱漆门扇半掩，香雾缓缓上行。'));
    body.push('');
    body.push(...lines);
    return joinScript(slug, body);
  };

  // 24 场分布到 3 幕（act 0/1/2 各 8 场）
  const scenes = [
    // 幕一：渡劫开端（0-7）
    { act: 0, cardIdx: 0, title: '初临玄霜阁', loc: '玄霜阁 · 内殿', time: '子夜', pov: 0, goal: '初醒于司命笔下', obstacle: '记忆全失', outcome: '识得自己名为应霜', },
    { act: 0, cardIdx: 0, title: '司命笔现', loc: '九重天 · 司命殿', time: '同夜 寅初', pov: 1, goal: '查应霜命格', obstacle: '命册有缺', outcome: '玄昭决意亲渡', },
    { act: 0, cardIdx: 1, title: '阿芜认主', loc: '玄霜阁 · 偏院', time: '次日 卯时', pov: 2, goal: '伴主行渡劫之路', obstacle: '凡身体弱', outcome: '阿芜立下血契', },
    { act: 0, cardIdx: 1, title: '第一重雷劫', loc: '玄霜阁 · 露台', time: '午后 申时', pov: 0, goal: '抗下首雷', obstacle: '不识引雷之诀', outcome: '险渡 留下肩头雷纹', },
    { act: 0, cardIdx: 2, title: '云海初遇', loc: '云海 · 断崖', time: '次日 卯时', pov: 0, goal: '逃离玄霜阁', obstacle: '云中迷雾', outcome: '撞见玄昭一袭白衣', },
    { act: 0, cardIdx: 2, title: '玄昭对话', loc: '云海 · 断崖', time: '同日 卯时三刻', pov: 1, goal: '试探应霜身份', obstacle: '应霜失忆不知劫数', outcome: '玄昭主动留名', },
    { act: 0, cardIdx: 3, title: '阿芜传药', loc: '玄霜阁 · 药房', time: '同日 黄昏', pov: 2, goal: '调一帖压雷散', obstacle: '少一味霜露引', outcome: '阿芜亲采霜露', },
    { act: 0, cardIdx: 3, title: '第二重风劫', loc: '玄霜阁 · 后山', time: '次日 子时', pov: 0, goal: '渡风劫', obstacle: '风中夹着旧名之声', outcome: '应霜恍惚听见前世名', },

    // 幕二：命格之争（8-15）
    { act: 1, cardIdx: 4, title: '司命殿对峙', loc: '九重天 · 司命殿', time: '次日 巳时', pov: 1, goal: '查改命册之罪', obstacle: '族中长老阻拦', outcome: '玄昭被斥越级', },
    { act: 1, cardIdx: 4, title: '应霜下山', loc: '玄霜阁 · 山门', time: '同日 午时', pov: 0, goal: '寻找玄昭', obstacle: '山门有禁制', outcome: '阿芜以血契破禁', },
    { act: 1, cardIdx: 5, title: '凡间集市', loc: '清霜镇 · 西市', time: '次日 辰时', pov: 0, goal: '打听玄昭去向', obstacle: '众人皆称未识此人', outcome: '一位老妪悄递一枚旧簪', },
    { act: 1, cardIdx: 5, title: '旧簪入梦', loc: '清霜镇 · 客舍', time: '同夜 亥时', pov: 0, goal: '解簪中之意', obstacle: '梦中前世碎片', outcome: '应霜梦见自己跪于司命笔下', },
    { act: 1, cardIdx: 6, title: '玄昭夜访', loc: '清霜镇 · 客舍', time: '同夜 子时', pov: 1, goal: '阻应霜继续追溯', obstacle: '应霜执意', outcome: '玄昭吐露半句前世', },
    { act: 1, cardIdx: 6, title: '第三重火劫', loc: '清霜镇 · 外野', time: '次日 申时', pov: 0, goal: '渡火劫', obstacle: '心乱难以聚气', outcome: '玄昭以司命笔代受半劫', },
    { act: 1, cardIdx: 7, title: '阿芜献血', loc: '客舍 · 后院', time: '同夜', pov: 2, goal: '为主续命', obstacle: '血契只够一次', outcome: '阿芜形神受损', },
    { act: 1, cardIdx: 7, title: '九重天降诏', loc: '清霜镇 · 客舍', time: '次日 卯时', pov: 1, goal: '抗下司命殿诏书', obstacle: '诏命强制召回', outcome: '玄昭撕诏', },

    // 幕三：第九重（16-23）
    { act: 2, cardIdx: 0, title: '同入云海', loc: '云海 · 中段', time: '次日 黄昏', pov: 0, goal: '同登第九重', obstacle: '云海有迷障', outcome: '二人执手而行', },
    { act: 2, cardIdx: 1, title: '阿芜留守', loc: '云海 · 入口', time: '同夜', pov: 2, goal: '守住归路', obstacle: '形神将散', outcome: '阿芜化作一缕霜露', },
    { act: 2, cardIdx: 2, title: '第七重情劫', loc: '云海 · 高处', time: '次日 子时', pov: 0, goal: '认下心中情', obstacle: '前世契约尚未解', outcome: '应霜认下玄昭', },
    { act: 2, cardIdx: 3, title: '司命笔断', loc: '九重天 · 司命殿', time: '同日 寅时', pov: 1, goal: '废己之笔', obstacle: '废笔即逐出', outcome: '玄昭折笔下界', },
    { act: 2, cardIdx: 4, title: '第八重心劫', loc: '云海 · 顶层', time: '次日 卯时', pov: 0, goal: '认下前世罪', obstacle: '前世曾杀玄昭师', outcome: '应霜跪天三息', },
    { act: 2, cardIdx: 5, title: '第九重天劫', loc: '云海 · 极顶', time: '同日 巳时', pov: 0, goal: '渡九劫', obstacle: '九雷同至', outcome: '玄昭以身代雷', },
    { act: 2, cardIdx: 6, title: '霜露归位', loc: '玄霜阁 · 后山', time: '七日后 卯时', pov: 0, goal: '寻阿芜归处', obstacle: '霜露已化云', outcome: '应霜立长椅于霜露处', },
    { act: 2, cardIdx: 7, title: '再见玄昭', loc: '清霜镇 · 西市', time: '一年后 辰时', pov: 0, goal: '认下平凡之缘', obstacle: '他已是凡身', outcome: '应霜递出一枚旧簪', },
  ];

  // 给每场生成 ~800-1200 字的密集散文剧本
  for (const s of scenes) {
    out.push({
      ...s,
      script: buildJiuchongScript(s, A, B, C),
    });
  }
  return out;
}

function buildJiuchongScript(s, A, B, C) {
  // POV 人物
  const POVS = [A, B, C];
  const povName = POVS[s.pov];
  const other = s.pov === 0 ? B : (s.pov === 1 ? A : A);
  const slug = `INT. ${s.loc} - ${s.time}`;
  const body = [];

  body.push(prose(`${s.time}。${s.loc}。`,
    s.loc.includes('云海') ? '云海低垂，远处剑光如线。雾自脚下缓缓上涨，浸到衣摆。' :
    s.loc.includes('司命') ? '殿宇极高。朱漆梁柱以九重金线缠绕。香炉余烟未散，缭于横梁之间。' :
    s.loc.includes('客舍') ? '一盏油灯。窗纸糊得不严，风吹过时窗纸颤了一颤。桌上是半凉的茶。' :
    s.loc.includes('药房') ? '案上摆着十二只青瓷小瓶。每只瓶口贴一张极薄的素笺。素笺上写药名。' :
    s.loc.includes('集市') ? '雨刚停。青石板上有积水。西市口的卖糕摊正在收摊。' :
    '殿内安静。朱漆柱旁悬一卷未展的旧帛。帛上字迹被烟熏得发黄。'));
  body.push('');

  body.push(prose(`${povName}立于门内一步。她未抬眼，也未退步。她的衣袖被风吹动了一寸。她伸手把袖口压回原处，停了一息。`));
  body.push(prose(`${other}从另一侧走来。脚步极轻。他在距她三步处停下，没有再向前。`));
  body.push('');

  body.push(dlg(other, '极轻', `${povName}。`));
  body.push(dlg(povName, '停一息', `你来了。`));
  body.push(dlg(other, '停半息', `今夜的${s.title}，是我替你担一半。`));
  body.push(dlg(povName, '极轻', `不必。这一遭，本就是我自己的劫。`));
  body.push('');

  body.push(prose(
    `${other}没再说。他抬手，从袖中取出一支极细的玉笔。玉笔通体冷白，笔杆上刻着九重云纹。`,
    `他把玉笔横放在两人之间的案上。案上原先放着一只浅青瓷碟，碟中盛半盏霜露。`,
    `霜露在玉笔投下的光中微微颤动了一下，像被风吹过。`,
  ));
  body.push('');

  body.push(dlg(povName, '看那笔', `这是司命笔。`));
  body.push(dlg(other, '停一息', `是。`));
  body.push(dlg(povName, '极轻', `你在九重天司命殿掌此笔多少年。`));
  body.push(dlg(other, '停二息', `三百二十七年。`));
  body.push(dlg(povName, '更轻', `三百二十七年里，你为我改过几笔。`));
  body.push(dlg(other, '极轻', `两笔。一笔在你前世，一笔在你今生。`));
  body.push('');

  body.push(prose(
    `${povName}伸手，没有触碰那支玉笔。她只让自己的指尖落在案沿一寸之外的位置。`,
    `案沿那一寸之外的木纹里，落着一枚极小的霜花。霜花是从${C}今晨送来的霜露上化出的。`,
  ));
  body.push('');

  if (s.title.includes('劫')) {
    body.push(prose(
      `远处忽起一声极闷的雷。雷声不是从天上来的，是从${povName}自己骨血里来的。`,
      `她的肩头那一道旧雷纹微微亮起。雷纹的形状像九重天上常见的一种云。`,
      `${other}看见这一道雷纹。他的指节微微收紧了一下，但他没有动。`,
    ));
    body.push('');
    body.push(dlg(other, '极轻', `${povName}。这一劫，你可愿让我代你受其半。`));
    body.push(dlg(povName, '停三息', `司命笔代凡劫者，自身命格折半。你折过几次。`));
    body.push(dlg(other, '极轻', `这是第三次。`));
    body.push(dlg(povName, '更轻', `第三次之后，你便不能再回司命殿。`));
    body.push(dlg(other, '停一息', `我知。`));
    body.push('');
    body.push(prose(
      `雷声又起一次。这一次比前一次更近。云海中央的雾被雷光劈开了一道极细的缝。`,
      `${povName}没有去躲。她只是把案上那支司命笔轻轻向${other}的那一侧推回了半寸。`,
      `${other}没有再推回来。他把玉笔从案上取走，收入袖中。`,
    ));
  } else {
    body.push(prose(
      `${C}从门外走入。她手中捧着一只浅青瓷碟，碟中盛着今晨新采的霜露。`,
      `${C}没有抬眼。她将碟子放在案上${povName}的那一侧，退了三步。`,
      `${C}的衣袖比昨日更薄了一寸。这一寸是血契落下的代价。`,
    ));
    body.push('');
    body.push(dlg(C, '极轻', `主子。今晨的霜露，奴婢已替您备好。`));
    body.push(dlg(povName, '停半息', `${C}。你今日衣袖薄了一寸。`));
    body.push(dlg(C, '停一息', `奴婢愿。`));
    body.push(dlg(povName, '极轻', `下一次，不许了。`));
    body.push(dlg(C, '不抬眼', `奴婢应。`));
  }

  body.push('');
  body.push(prose(
    `${other}转身。他没有再看${povName}一眼。他向门外走去。他的脚步比来时更轻。`,
    `${povName}没有送。她站在原处，让自己的目光落在案上那只浅青瓷碟里。`,
    `碟中霜露仍在颤动。颤动的频率与她肩头那一道雷纹微微亮起的频率，是同一拍。`,
  ));
  body.push('');
  body.push('CUT TO 黑场。');

  return body.join('\n');
}

// ============================== 南门外的录像厅 ==============================
// 角色：宁向阳（22，复员归乡）、邓启年（32，录像厅老板）、苏小冰（19，剪票员/打字员）
// 题材：年代 90s；港片录像 / 90 年代国营厂下岗 / 小城青年的电影梦
function makeNanmenScenes() {
  const A = '宁向阳', B = '邓启年', C = '苏小冰';
  const scenes = [
    // 第一幕（0-7）：归乡 + 录像厅 + 三人成局
    { act: 0, cardIdx: 0, title: '南门外', loc: '南门 · 长途车站', time: '1994 · 立秋 黄昏', pov: 0, goal: '回到三年没回的县城', obstacle: '车站已搬', outcome: '宁向阳走错了出口' },
    { act: 0, cardIdx: 0, title: '霓虹未亮', loc: '南门外 · 录像厅门口', time: '同日 黄昏', pov: 0, goal: '打听家人去向', obstacle: '老街已拆一半', outcome: '撞见录像厅的旧海报' },
    { act: 0, cardIdx: 1, title: '老板邓启年', loc: '录像厅 · 售票口', time: '同日 入夜', pov: 1, goal: '招一个看场的伙计', obstacle: '工资只够半饱', outcome: '邓启年给了宁向阳一碗面' },
    { act: 0, cardIdx: 1, title: '苏小冰', loc: '录像厅 · 放映室', time: '次日 上午', pov: 2, goal: '换片', obstacle: '昨晚那盘《英雄本色》卡带', outcome: '苏小冰用铅笔卷带子' },
    { act: 0, cardIdx: 2, title: '第一场放映', loc: '录像厅 · 大厅', time: '次日 19:30', pov: 0, goal: '看场不出事', obstacle: '街口的小混混进来抽烟', outcome: '宁向阳把人请出去了' },
    { act: 0, cardIdx: 2, title: '后排靠窗', loc: '录像厅 · 大厅 后排', time: '同夜 21:00', pov: 2, goal: '看完《阿飞正传》', obstacle: '票务簿没对上', outcome: '苏小冰发现少了三张票' },
    { act: 0, cardIdx: 3, title: '夜里盘账', loc: '邓启年 · 后屋', time: '同夜 23:30', pov: 1, goal: '算清这个月', obstacle: '厂里要追三个月的房租', outcome: '邓启年决定加一场午夜场' },
    { act: 0, cardIdx: 3, title: '午夜场', loc: '录像厅 · 大厅', time: '次日 凌晨 00:15', pov: 0, goal: '看好午夜场', obstacle: '只来了七个人', outcome: '七个人里有一个是宁向阳的中学同学' },

    // 第二幕（8-15）：下岗潮 + 录像厅生意 + 三人感情线
    { act: 1, cardIdx: 4, title: '厂门口的告示', loc: '县纺织厂 · 厂门', time: '次日 上午', pov: 2, goal: '看告示', obstacle: '人挤得进不去', outcome: '苏小冰看见自己父亲的名字' },
    { act: 1, cardIdx: 4, title: '父亲不归', loc: '苏家 · 堂屋', time: '同夜', pov: 2, goal: '等父亲回家', obstacle: '父亲在厂门口蹲到深夜', outcome: '苏小冰把灯一直留着' },
    { act: 1, cardIdx: 5, title: '邓启年的劝', loc: '录像厅 · 售票口', time: '次日 中午', pov: 1, goal: '劝苏小冰回家陪父亲', obstacle: '苏小冰说自己要赚钱', outcome: '邓启年加了她五块钱工钱' },
    { act: 1, cardIdx: 5, title: '宁向阳的过去', loc: '南门外 · 城墙根', time: '同日 黄昏', pov: 0, goal: '说出三年的事', obstacle: '不知从何说起', outcome: '宁向阳只说了一句"班长没回来"' },
    { act: 1, cardIdx: 6, title: '盗版片商', loc: '录像厅 · 后屋', time: '次日 上午', pov: 1, goal: '拒收一批盗版港片', obstacle: '正版价格翻倍', outcome: '邓启年没收 但留了样片' },
    { act: 1, cardIdx: 6, title: '《重庆森林》', loc: '录像厅 · 放映室', time: '同夜 22:00', pov: 0, goal: '试映新片', obstacle: '机器跳带', outcome: '宁向阳和苏小冰一起调机器' },
    { act: 1, cardIdx: 7, title: '雨夜停电', loc: '录像厅 · 大厅', time: '次日 19:00', pov: 2, goal: '维持秩序', obstacle: '断电 50 分钟', outcome: '苏小冰带头打着手电讲剧情' },
    { act: 1, cardIdx: 7, title: '邓启年的旧伤', loc: '邓启年 · 后屋', time: '同夜 23:00', pov: 1, goal: '吃药', obstacle: '胃疼三年未愈', outcome: '邓启年第一次让宁向阳搀一把' },

    // 第三幕（16-23）：录像厅闭店 + 各自走向
    { act: 2, cardIdx: 0, title: '拆迁告示', loc: '南门外 · 录像厅门口', time: '次日 上午', pov: 0, goal: '看告示', obstacle: '三个月内搬走', outcome: '宁向阳撕下告示揣进口袋' },
    { act: 2, cardIdx: 1, title: '苏父归家', loc: '苏家 · 堂屋', time: '同日 黄昏', pov: 2, goal: '迎父亲', obstacle: '父亲手里只有一个搪瓷缸', outcome: '苏小冰说要送父亲去南方' },
    { act: 2, cardIdx: 2, title: '最后一场', loc: '录像厅 · 大厅', time: '次日 19:30', pov: 1, goal: '放最后一场', obstacle: '只剩半盘《纵横四海》', outcome: '邓启年自己当主持讲完后半段' },
    { act: 2, cardIdx: 3, title: '拆机器', loc: '录像厅 · 放映室', time: '同夜 23:00', pov: 0, goal: '拆放映机', obstacle: '机器螺丝锈住', outcome: '宁向阳没拆 留作纪念' },
    { act: 2, cardIdx: 4, title: '南站送行', loc: '南门 · 长途车站', time: '次日 清晨', pov: 2, goal: '送父亲走', obstacle: '车票紧张', outcome: '苏小冰也买了一张同方向的票' },
    { act: 2, cardIdx: 5, title: '邓启年留下', loc: '录像厅 · 门口', time: '同日 中午', pov: 1, goal: '把钥匙交回房东', obstacle: '房东不肯收', outcome: '邓启年把钥匙留在门把上' },
    { act: 2, cardIdx: 6, title: '宁向阳上路', loc: '南门外 · 城墙根', time: '同日 黄昏', pov: 0, goal: '收拾上路', obstacle: '不知去哪里', outcome: '宁向阳把那张告示放进了背包夹层' },
    { act: 2, cardIdx: 7, title: '多年以后', loc: '南门外 · 旧址', time: '2024 · 立秋', pov: 0, goal: '回旧址', obstacle: '已变成超市', outcome: '宁向阳认出门口那块旧地砖' },
  ];

  return scenes.map(s => ({ ...s, script: buildNanmenScript(s, A, B, C) }));
}

function buildNanmenScript(s, A, B, C) {
  const POVS = [A, B, C];
  const povName = POVS[s.pov];
  const otherName = s.pov === 0 ? C : (s.pov === 1 ? A : A);
  const slug = `INT. ${s.loc} - ${s.time}`;
  const body = [];

  body.push(prose(
    `${s.time}。${s.loc}。`,
    s.loc.includes('录像厅') ? '录像厅门口挂着一块红底白字的招牌，"南门外"三个字。霓虹灯管已经坏了一根。' :
    s.loc.includes('车站') ? '长途车站的水泥地上有一层薄灰。立秋了，但日头还硬。检票口正在换班。' :
    s.loc.includes('纺织厂') ? '县纺织厂的红砖墙皮已经掉了一片。厂门口贴着白纸黑字的告示，墨迹未干。' :
    s.loc.includes('苏家') ? '一盏 25 瓦的灯泡。堂屋的方桌上摆着一只缺了口的搪瓷缸。墙上挂着一幅 1989 年的挂历。' :
    s.loc.includes('城墙根') ? '青砖城墙根下，杂草过膝。远处传来录像厅的喇叭声，是周华健。' :
    '小城黄昏。蝉声未歇。远处有人骑自行车经过，车铃响了两下。',
  ));
  body.push('');

  body.push(prose(
    `${povName}站在门口，没急着进去。他把肩上的帆布包往下顺了顺。包带磨得起毛，是 1991 年那会儿的旧物。`,
    `他抬头看了一眼招牌。招牌上那一根坏掉的霓虹管，是 "外" 字的最后一笔。`,
  ));
  body.push('');

  body.push(dlg(otherName, '从屋里出来', `来看片的？今天放《英雄本色》下半部。`));
  body.push(dlg(povName, '停一息', `我打听个人。三年前住在南门里头的，宁家。`));
  body.push(dlg(otherName, '停半息', `宁家。前年就搬了。`));
  body.push(dlg(povName, '更轻', `搬到哪。`));
  body.push(dlg(otherName, '停一息', `南方。具体没人知道。`));
  body.push('');

  body.push(prose(
    `${povName}没再问。他从口袋里掏出一张折了四折的纸。纸上是他三年前从部队寄回家的最后一封信的地址。`,
    `他把那张纸又折了一道，塞回口袋最里头。他抬手，把帆布包的带子往上提了提。`,
  ));
  body.push('');

  if (s.title.includes('告示') || s.title.includes('拆')) {
    body.push(prose(
      `南门外这一带的房子全部要拆。告示上写得明白：三个月内自行搬迁，逾期由街道办协助。`,
      `${povName}伸手在告示边缘那一处卷起的角上按了一下。胶水还没干透，按下去会有一点黏。`,
      `他看了一会儿告示上盖的那枚红印。红印的边缘有一点点缺口，是被人用拇指反复按出来的。`,
    ));
    body.push('');
    body.push(dlg(B, '从录像厅里出来', `${A}。这告示，今早刚贴的。`));
    body.push(dlg(A, '不抬头', `贴了几张。`));
    body.push(dlg(B, '停一息', `南门外这一带，五张。每一家门口都有。`));
    body.push(dlg(A, '极轻', `房东那边，啥说法。`));
    body.push(dlg(B, '停二息', `让我月底之前清场。`));
    body.push(dlg(A, '把告示揭下来', `这一张，我留着。`));
    body.push(dlg(B, '不拦', `留着吧。`));
  } else if (s.title.includes('放映') || s.title.includes('片') || s.title.includes('停电')) {
    body.push(prose(
      `录像厅的大厅里摆了二十四张木椅子。椅子是从隔壁电影院淘汰下来的，靠背上有 1985 年刻的字。`,
      `${C}坐在售票口里头。她的桌面上摆着一本票务簿，一支铅笔，一只剪票钳。`,
      `${C}把今晚要放的那盘带子从铁皮盒里拿出来。带子的标签上写着 "英雄本色 · 下"，字是手写的。`,
    ));
    body.push('');
    body.push(dlg(C, '看标签', `老板。这盘带子，第六十七次放了。`));
    body.push(dlg(B, '从后屋走出来', `第六十七次。`));
    body.push(dlg(C, '停一息', `磁带快磨穿了。下个月还能放么。`));
    body.push(dlg(B, '极轻', `能放就放。放不了，下一场换片。`));
    body.push(dlg(C, '更轻', `下一场换什么。`));
    body.push(dlg(B, '停二息', `《阿飞正传》。`));
    body.push(dlg(C, '抬眼', `那盘也旧了。`));
    body.push(dlg(B, '不答', `开门。`));
    body.push('');
    body.push(prose(
      `${C}把票务簿翻到今晚那一页。她用铅笔在第一栏上画了一道。`,
      `画完她抬头看了一眼挂在售票口对面墙上的旧挂钟。挂钟的时针是七，分针是二十五。`,
      `她把剪票钳放在桌面右上角。剪票钳的木柄已经被磨得发亮。`,
    ));
  } else {
    body.push(prose(
      `屋里只有一盏 25 瓦的灯泡。灯泡晃了一下。${otherName}从灯绳那一端走过来，伸手把灯绳又拉了一下。`,
      `灯泡这一次稳住了。${otherName}没有说话。他在${povName}对面那张矮凳上坐下。`,
      `矮凳的木头已经裂了一道。裂缝的中间塞着一小片报纸。报纸的日期是 1992 年。`,
    ));
    body.push('');
    body.push(dlg(otherName, '极轻', `${povName}。你这三年，都在哪。`));
    body.push(dlg(povName, '停二息', `南边的山里。`));
    body.push(dlg(otherName, '停半息', `部队那边，还能回去么。`));
    body.push(dlg(povName, '更轻', `回不去了。班长没回来。`));
    body.push(dlg(otherName, '停一息', `知道了。`));
    body.push(dlg(povName, '极轻', `不问了。`));
    body.push(dlg(otherName, '极轻', `不问了。`));
    body.push('');
    body.push(prose(
      `${otherName}起身。他从桌上的搪瓷缸里倒了半缸水。水是凉的。他把搪瓷缸推到${povName}面前。`,
      `${povName}没立刻喝。他把搪瓷缸捧在手里。缸壁的红漆已经掉了一块，掉的位置正好是缸柄的下方。`,
    ));
  }

  body.push('');
  body.push(prose(
    `远处的喇叭里传来下半段的音乐。是 1994 年这个夏天全国都在放的那首歌。`,
    `${povName}没有跟着哼。他只是把手里的那一样东西，又向身边的人那一侧轻轻推了半寸。`,
  ));
  body.push('');
  body.push('CUT TO 黑场。');

  return body.join('\n');
}

// ============================== 闪婚豪门 60 集 ==============================
// 角色：苏念安（女主，普通女孩）、霍奕琛（男主，集团少爷）、顾婉清（女二，前未婚妻）
function makeShanhunScenes() {
  const A = '苏念安', B = '霍奕琛', C = '顾婉清';
  const scenes = [];
  // 60 集，每 20 集一幕
  const titles = [
    // 幕一 1-20 闪婚 + 误会 + 试探
    '酒会替嫁', '签下婚书', '入住霍宅', '第一夜', '早餐试探', '管家审视', '前未婚妻登门', '银行卡', '小姑挑刺',
    '霍母赐宴', '婚戒尺寸', '深夜电话', '生病了', '亲手熬粥', '记忆里的旧人', '商场风波', '佣金',
    '生日蛋糕', '深夜醉酒', '第一次说"老婆"',
    // 幕二 21-40 心动 + 危机 + 真相
    '生日礼物', '游艇之约', '雨夜抱回', '退婚旧帐', '婚纱试穿', '婆媳对峙', '夫妻名分', '股权风波',
    '总裁出差', '机场拥抱', '前任设局', '酒店监控', '澄清记者会', '苏母进城', '回门宴', '老宅密谈',
    '一纸离婚', '十里长街', '雨中追妻', '复婚一吻',
    // 幕三 41-60 真爱 + 风暴 + HE
    '蜜月小岛', '怀孕初醒', '医院告知', '霍家祠堂', '族老逼宫', '商海狙击', '夜宴反击', '股价反转',
    '亲手做的鞋', '小姑改口', '婆婆改观', '前任远走', '宝宝胎心', '老宅婚礼', '十年情书', '两人五年',
    '事业重启', '亲子鉴定', '族长退位', '一家三口',
  ];
  for (let i = 0; i < 60; i++) {
    const act = i < 20 ? 0 : i < 40 ? 1 : 2;
    scenes.push({
      act, cardIdx: i % 8, title: `第${i + 1}集 · ${titles[i]}`,
      loc: i % 4 === 0 ? '霍宅 · 主卧' : i % 4 === 1 ? '霍宅 · 客厅' : i % 4 === 2 ? '霍氏集团 · 总裁办公室' : '城南 · 街角咖啡馆',
      time: i % 3 === 0 ? '清晨' : i % 3 === 1 ? '黄昏' : '深夜',
      pov: i % 3,
      goal: '推进关系一步',
      obstacle: '过去 / 流言 / 家族压力',
      outcome: '一对又靠近了一寸',
      script: buildShanhunScript(i, titles[i], A, B, C),
    });
  }
  return scenes;
}

function buildShanhunScript(idx, title, A, B, C) {
  const POVS = [A, B, C];
  const povName = POVS[idx % 3];
  const other = idx % 3 === 0 ? B : (idx % 3 === 1 ? A : A);
  const loc = idx % 4 === 0 ? '霍宅 · 主卧' : idx % 4 === 1 ? '霍宅 · 客厅' : idx % 4 === 2 ? '霍氏集团 · 总裁办公室' : '城南 · 街角咖啡馆';
  const time = idx % 3 === 0 ? '清晨' : idx % 3 === 1 ? '黄昏' : '深夜';
  const slug = `INT. ${loc} - ${time}`;
  const body = [];

  body.push(prose(
    `${time}。${loc}。`,
    loc.includes('主卧') ? '床头一盏暖色台灯。落地窗外的城市灯火被压在窗帘的缝隙里。' :
    loc.includes('客厅') ? '客厅地面是米黄色大理石。沙发是深棕色真皮的，靠垫一只一只整整齐齐地排好。' :
    loc.includes('办公室') ? '玻璃幕墙外是城市的高架。办公桌上是一只极薄的笔记本电脑，一杯刚泡好的美式。' :
    '咖啡馆角落。一张木质双人桌。桌上摆着两只白瓷小杯，一只是已经凉了一半的拿铁。',
  ));
  body.push('');

  body.push(prose(
    `${A}站在房间中央。她今天穿一条米色针织连衣裙。裙摆到膝盖以下三寸。她的左手无名指上戴着那枚婚戒。`,
    `${B}从门口走进来。他外套搭在手上，领带还没解。他在距她一步的位置停下。`,
  ));
  body.push('');

  body.push(dlg(B, '停一息', `${A}。`));
  body.push(dlg(A, '不抬头', `霍先生。`));
  body.push(dlg(B, '更轻', `第${idx + 1}天了。`));
  body.push(dlg(A, '停半息', `嗯。`));
  body.push(dlg(B, '停一息', `${title.split('·').pop().trim()}的事，是我没安排好。`));
  body.push(dlg(A, '抬眼一秒', `不是你的错。`));
  body.push(dlg(B, '极轻', `我会处理。`));
  body.push('');

  if (idx < 20) {
    body.push(prose(
      `${A}没有再说什么。她从客厅的茶几边走开，去厨房倒了一杯温水。`,
      `她回到客厅时，${B}还站在原处。他看着她把那杯温水放在他面前的边几上。`,
      `他没有伸手去拿。他只是看着她。她的睫毛在台灯下落下一小片影子。`,
    ));
    body.push('');
    body.push(dlg(B, '停二息', `${A}。这场婚约，对你来说是不是太突然了。`));
    body.push(dlg(A, '停一息', `我答应了，就不会反悔。`));
    body.push(dlg(B, '极轻', `我也不会。`));
  } else if (idx < 40) {
    body.push(prose(
      `${C}从客厅另一侧的玄关走进来。她今天穿一件正红色短款风衣。她的高跟鞋在大理石上敲出极清脆的声音。`,
      `${C}在距${A}一步的位置停下。她从手里那只小香奈儿包里取出一张名片，递向${A}。`,
      `${A}没有接。她只是看了一眼那张名片上的字。名片正中印着 顾氏家族 · 顾婉清 七个字。`,
    ));
    body.push('');
    body.push(dlg(C, '挑眉', `苏小姐。三年前我退婚的那一份合约，你看过么。`));
    body.push(dlg(A, '不抬头', `没看过。也不必看。`));
    body.push(dlg(C, '停一息', `奕琛是不是告诉过你，他这一辈子只爱过一个人。`));
    body.push(dlg(A, '极轻', `他没说过。我也没问过。`));
    body.push(dlg(B, '从书房走出来 极轻', `${C}。请回。`));
    body.push(dlg(C, '停二息', `奕琛。`));
    body.push(dlg(B, '更轻', `${A}是我妻子。`));
  } else {
    body.push(prose(
      `${A}从房间走出来时，手里捧着一只小药袋。药袋是医院刚开的。她把药袋藏在身后。`,
      `${B}已经在客厅等了她半小时。他看见她出来，立刻起身，走过来。他在距她半步的位置停下。`,
      `他没有立刻问。他先伸手，把她耳边那一缕碎发顺到她的耳后。他的指节很稳，但比平时慢了一拍。`,
    ));
    body.push('');
    body.push(dlg(B, '极轻', `${A}。医生怎么说。`));
    body.push(dlg(A, '停一息', `奕琛。`));
    body.push(dlg(B, '更轻', `怎么样。`));
    body.push(dlg(A, '极轻', `他说，是。`));
    body.push(dlg(B, '停二息', `是。`));
    body.push(dlg(A, '抬眼', `奕琛，我们要有一个孩子了。`));
    body.push(dlg(B, '停三息 极轻', `我知道了。`));
    body.push('');
    body.push(prose(
      `${B}没有立刻拥抱她。他先伸手，把她手里那只小药袋接过来。药袋里是叶酸和一张三个月后的复诊单。`,
      `他把药袋放在沙发的边几上，然后才把她整个揽进怀里。他的下巴抵在她的发顶上，没有再说话。`,
    ));
  }

  body.push('');
  body.push(prose(
    `落地窗外的城市灯火依旧。客厅那只老式落地钟敲了一下。今天是他们婚后第${idx + 1}天。`,
    `${A}把脸埋在${B}的肩窝里。她的睫毛在他西装外套的料子上轻轻颤了一下。`,
  ));
  body.push('');
  body.push('CUT TO 黑场。');

  return body.join('\n');
}

// ============================== 重生 1999 60 集 ==============================
// 角色：林知夏（女主，2024 年重生回 1999）、周明远（男主，知夏初恋同桌）、陈舒桐（女二，闺蜜）
function makeChongshengScenes() {
  const A = '林知夏', B = '周明远', C = '陈舒桐';
  const titles = [
    '醒在 1999', '镜中十六岁', '第一节自习', '同桌周明远', '英语早读', '食堂阿姨',
    '小卖部老板', '陈舒桐的小本', '物理课的题', '校广播站', '月考成绩单', '走廊偶遇',
    '生病请假', '舒桐家访', '周末补课', '第一次心跳', '篮球赛', '校运会',
    '九九年的雨', '元旦联欢',
    '新世纪钟声', '元旦后第一天', '高一下学期', '父亲下岗', '母亲的缝纫机', '第一笔生意',
    '小卖部承包', '第一份月供', '同学议论', '老师约谈', '物理竞赛', '省赛集训',
    '送舒桐回家', '夜班公交', '高二开学', '理科分班', '舒桐的秘密', '明远的告白',
    '初吻在体育馆', '高二期末',
    '高三冲刺', '父亲找到新工作', '小卖部转手', '母亲住院', '高考前一个月', '深夜补习',
    '高考第一天', '高考第二天', '高考第三天', '送考', '查分日', '志愿表',
    '北上的火车', '大学开学', '十年同学会', '城市里相遇', '老同学聚餐', '舒桐的喜讯',
    '明远的新书', '十五年再回小巷', '两个人',
  ];
  const scenes = [];
  for (let i = 0; i < 60; i++) {
    const act = i < 20 ? 0 : i < 40 ? 1 : 2;
    scenes.push({
      act, cardIdx: i % 8, title: `第${i + 1}集 · ${titles[i]}`,
      loc: i % 4 === 0 ? '一中 · 高一(3)班教室' : i % 4 === 1 ? '老巷 · 林家堂屋' : i % 4 === 2 ? '老巷 · 小卖部' : '一中 · 操场看台',
      time: i % 3 === 0 ? '清晨 7:20' : i % 3 === 1 ? '午后 14:00' : '夜里 21:30',
      pov: i % 3,
      goal: '改变父亲下岗后这一年',
      obstacle: '十六岁的身份 / 没人会信她',
      outcome: '又往前推进了一寸',
      script: buildChongshengScript(i, titles[i], A, B, C),
    });
  }
  return scenes;
}

function buildChongshengScript(idx, title, A, B, C) {
  const POVS = [A, B, C];
  const povName = POVS[idx % 3];
  const other = idx % 3 === 0 ? B : (idx % 3 === 1 ? A : A);
  const loc = idx % 4 === 0 ? '一中 · 高一(3)班教室' : idx % 4 === 1 ? '老巷 · 林家堂屋' : idx % 4 === 2 ? '老巷 · 小卖部' : '一中 · 操场看台';
  const time = idx % 3 === 0 ? '清晨 7:20' : idx % 3 === 1 ? '午后 14:00' : '夜里 21:30';
  const slug = `INT. ${loc} - 1999 · ${time}`;
  const body = [];

  body.push(prose(
    `${time}。${loc}。`,
    loc.includes('教室') ? '一中的高一(3)班，靠窗第三排是林知夏的位置。窗外是九月底的法桐。课桌上摆着一只 1999 年款的塑料文具盒。' :
    loc.includes('林家') ? '老巷子里那一间二十平米的堂屋。墙上挂着一张 1996 年的全家福。桌上有一台老式缝纫机。' :
    loc.includes('小卖部') ? '老巷口的小卖部。木头柜台上摆着一台用了五年的红梅牌收银机。墙上的烟酒价目表是手写的。' :
    '一中的旧操场。看台是水泥的，靠背已经掉了一截漆。远处的法桐在风里翻面。',
  ));
  body.push('');

  body.push(prose(
    `${A}坐在自己的位置上。她的右手放在课桌上一本九六年版的人教版数学课本上。课本封皮的那一处折角是她小学时养成的习惯。`,
    `这是她重生回到 1999 年的第${idx + 1}天。她现在十六岁，但她的脑子里装着 2024 年的所有事。`,
  ));
  body.push('');

  if (idx % 3 === 1) {
    body.push(prose(
      `${B}从后门走进教室。他今天穿一件浅蓝色短袖衬衫，校服外套搭在臂弯里。他经过${A}的座位时停了半秒。`,
      `他没有打招呼。他只是把自己手里那一本物理参考书放在${A}的课桌左上角。`,
    ));
    body.push('');
    body.push(dlg(B, '极轻', `知夏。这本，借你三天。`));
    body.push(dlg(A, '不抬头', `谢谢。`));
    body.push(dlg(B, '停一息', `${title.split('·').pop().trim()}的事，下午说。`));
    body.push(dlg(A, '抬眼半秒', `好。`));
  } else if (idx % 3 === 2) {
    body.push(prose(
      `${C}从门外冲进来。她今天扎了一个高马尾。她的书包带子有一根是用别针重新别上的。`,
      `${C}在${A}的位置前面坐下。她把自己的小本从书包夹层里掏出来，翻到中间那一页。`,
    ));
    body.push('');
    body.push(dlg(C, '神秘', `知夏。我今天发现一件事。`));
    body.push(dlg(A, '看她一眼', `什么事。`));
    body.push(dlg(C, '压低声音', `周明远昨天在操场后面的法桐树下，等了你二十分钟。`));
    body.push(dlg(A, '停一息', `怎么知道。`));
    body.push(dlg(C, '挺胸', `我亲眼看的。`));
  } else {
    body.push(prose(
      `${A}从书包里拿出今天要交的作业本。本子封面写着 林知夏 · 高一(3)班 · 1999.10。她的字今天写得比上一辈子十六岁那年好看。`,
      `她抬眼看了一眼黑板。黑板上是周一升旗的通知。下面一行是物理老师写的本周作业。`,
      `她在心里把这一周要做的事过了一遍：救父亲那一笔下岗补偿，提醒母亲不要把缝纫机卖掉，告诉舒桐少吃零食她爸明年会查出糖尿病。`,
    ));
    body.push('');
    body.push(dlg(A, '心里独白 极轻', `这一辈子，能不能不一样。`));
  }

  body.push('');
  body.push(prose(
    `下课铃响了一声。${A}没有立刻起身。她把课本合上，把铅笔放回文具盒里。她的动作比同桌${B}慢了一拍。`,
    `${B}已经收拾完了书包。他站在过道里，没有马上离开。他在等她。`,
    `${A}抬眼。她和${B}的目光在过道上方相遇了一秒。她没有移开。他也没有移开。`,
  ));
  body.push('');

  body.push(dlg(B, '极轻', `${A}。一起走？`));
  body.push(dlg(A, '停半息', `好。`));

  body.push('');
  body.push(prose(
    `走出教室时，窗外的法桐叶子在九月的风里翻了一面。${A}的心跳比这具十六岁身体平时快了一拍。`,
    `她想：这一辈子，至少她不会再让 1999 年这个秋天就这么过去。`,
  ));
  body.push('');
  body.push('CUT TO 黑场。');

  return body.join('\n');
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
