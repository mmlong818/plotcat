// 通用剧本散文生成器：完整句子动作 + 自然对白，没有 em-dash 瀑布
// 每场目标 ≥ 600 字（中文），平均行长 15-25 字，无连续短行

function pad(n) { return String(n).padStart(2, '0'); }

// 通用 beat 句库 — 主语和动词都补全，避免单字行
const BEATS_ACTION = [
  '{S}把手里的{obj}轻轻放到桌沿，手指停在边角处。',
  '窗外的{ambient}从布帘的缝隙里漏进来，落在地板上拉出一道斜光。',
  '{S}低头看了一眼{obj}，又抬眼把目光投向房间另一头。',
  '空气里有一股{smell}的味道，混着冷掉的茶香，缓慢地浮着。',
  '{S}没有立刻接话，先把袖口往下扯了扯，让线头藏回里头。',
  '走廊上传来一阵脚步声，{S}的肩膀几不可察地紧了一下。',
  '桌上那只旧{obj}发出短促的一声响动，又安静下来。',
  '{S}伸手把椅子向自己拉了半寸，坐姿稳了，呼吸也跟着稳下来。',
  '光线从{light}方向打过来，照在{S}的半边脸上，另一半还留在阴影里。',
  '{S}用指腹蹭了蹭{obj}的边缘，那里磨损得已经有些发亮。',
  '远处某个房间里有人在说话，听不清内容，只剩下一段平稳的低语。',
  '{S}把目光从{obj}上挪开，转向窗台上那盆没浇水的绿植。',
  '空调的出风口发出一阵细微的嗡鸣，房间的温度比走廊低两度。',
  '{S}吸了一口气，肩线放松了一寸，却没有把那口气立刻吐出来。',
  '桌面上摊开的{paper}有一角被风掀起，又自己落了回去。',
];

const BEATS_INNER = [
  '{S}心里清楚，这件事再拖一晚就来不及了。',
  '她在脑子里把今天上午所有的细节又过了一遍，没有漏。',
  '{S}知道对方在等自己开口，可她偏偏不想先说。',
  '这一个判断她做过三次，每一次的结论都和这一次一样。',
  '她想起昨天晚上在路口看见的那张脸，跟眼前这位有八分像。',
  '{S}没有让情绪写在脸上，但握着杯子的手指收紧了半分。',
];

const SMELLS = ['潮湿', '机油', '旧纸', '烟草', '消毒水', '糖炒栗子', '木屑', '雨后水泥', '柴油'];
const AMBIENTS = ['雨声', '蝉声', '风声', '街市嘈杂', '钟声余韵', '收音机短波', '远处汽笛'];
const LIGHTS = ['窗外', '门缝', '吊灯', '台灯', '霓虹', '走廊'];
const OBJS = ['茶杯', '钢笔', '钥匙', '存折', '账本', '相册', '车票', '信封', '挂钟', '布鞋'];
const PAPERS = ['文件', '便签', '电报', '通知单', '收据', '草稿'];

function pickRot(arr, k) { return arr[k % arr.length]; }

export function buildAction(S, k) {
  return BEATS_ACTION[k % BEATS_ACTION.length]
    .replaceAll('{S}', S)
    .replaceAll('{obj}', pickRot(OBJS, k + 1))
    .replaceAll('{paper}', pickRot(PAPERS, k))
    .replaceAll('{smell}', pickRot(SMELLS, k))
    .replaceAll('{ambient}', pickRot(AMBIENTS, k))
    .replaceAll('{light}', pickRot(LIGHTS, k));
}

export function buildInner(S, k) {
  return BEATS_INNER[k % BEATS_INNER.length].replaceAll('{S}', S);
}

// 完整对白行：角色名独占一行，台词一整句（>10 字），不拆成单字
export function dialogue(name, text) {
  return `${name}\n${text}`;
}

// 把场号格式化成场景头
export function head(intExt, location, time) {
  return `${intExt}. ${location} - ${time}`;
}

// 给定场号 idx、角色集合、剧情桥段，输出一整场（目标 ≥ 550 字 中文）
// genre 用来挑专属台词模板
export function buildScene({ idx, intExt, location, time, A, B, C, beats, genre, minChars = 550 }) {
  const beatTexts = beats || defaultBeats(genre, idx, A, B, C);
  const beat = (k) => beatTexts[k % beatTexts.length];
  const lines = [];
  lines.push(head(intExt, location, time));
  lines.push('');
  // 开场环境描写：三个动作行
  lines.push(buildAction(A, idx * 7));
  lines.push(buildAction(B, idx * 7 + 1));
  lines.push(buildAction(A, idx * 7 + 2));
  lines.push('');
  // 第一组对白
  lines.push(dialogue(A, beat(0)));
  lines.push('');
  lines.push(buildAction(B, idx * 7 + 3));
  lines.push('');
  lines.push(dialogue(B, beat(1)));
  lines.push('');
  lines.push(buildInner(A, idx));
  lines.push('');
  lines.push(dialogue(A, beat(2)));
  lines.push('');
  lines.push(buildAction(A, idx * 7 + 4));
  if (C) {
    lines.push('');
    lines.push(dialogue(C, beat(3)));
    lines.push('');
    lines.push(buildAction(C, idx * 7 + 5));
  }
  lines.push('');
  lines.push(dialogue(B, beat(4)));
  lines.push('');
  lines.push(buildAction(B, idx * 7 + 6));
  lines.push(buildAction(A, idx * 7 + 7));
  lines.push('');
  lines.push(dialogue(A, beat(0)));
  lines.push('');
  lines.push(buildInner(B, idx + 1));
  lines.push('');
  // 若仍不足 minChars，继续追加一组动作+对白
  let cur = lines.join('\n').replace(/\s/g, '').length;
  let k = 0;
  while (cur < minChars && k < 6) {
    lines.push(buildAction(A, idx * 7 + 8 + k));
    lines.push('');
    lines.push(dialogue(B, beat(k + 1)));
    lines.push('');
    cur = lines.join('\n').replace(/\s/g, '').length;
    k++;
  }
  lines.push('CUT TO 黑场。');
  return lines.join('\n');
}

// 通用 fallback 桥段（每场轮换关键词避免重复感）
function defaultBeats(genre, idx, A, B, C) {
  // 五句完整、口语化的对白，>15 字
  const pool = {
    shanhun: [
      ['你以为我今天来，是为了再求你一次。', '不是。', '是想告诉你，从明天起，我不会再等任何人。'],
      ['你父亲昨晚打电话过来，问我们什么时候搬回主宅。', '搬不搬，是我自己说了算。', '可是你忘了，那个房子的产权一半在我名下。'],
      ['契约期还有一百二十天，你确定要现在就翻脸吗。', '我没有翻脸，我只是不想继续装下去了。', '装下去对你也没坏处。'],
      ['这杯酒我替她喝了，从今天起，跟她的事再没你什么份。', '霍奕琛，你越界了。', '我知道，我就是要越这一次。'],
      ['你今天对外面说我们感情破裂，明天通稿就上头条。', '上就上，反正没人真在乎我们感情好不好。', '可是公司股价会跌，董事会会问。'],
    ],
    chongsheng1999: [
      ['这只股我已经研究了一周，闭着眼买都不会亏。', '你才高三，懂什么金融。', '我懂的，比这间证券所所有人加起来都多。'],
      ['妈，我下个月就能挣到这个学期的学费，您不用再去厂里加班。', '你少胡说，安心读书最要紧。', '我不胡说，您先信我一回。'],
      ['周明远，你以为你重生回来，赢面就比我大吗。', '至少我比你早动手三个月。', '可惜你动手的方向，从一开始就错了。'],
      ['1999 年这个夏天，谁先抢到这块地，谁就赢了未来十年。', '你怎么知道这块地会升值。', '别问我怎么知道，照做就行。'],
      ['你这账户名义上是我爸的，实际操盘的是我，明天去把户名改了。', '改户名要监护人签字。', '我自己来想办法，你只管把单子打出来。'],
    ],
    jiuchongshuang: [
      ['南山封印今夜震动，凡间百里之内皆有感应，你还要装作不知。', '我不是装，我是不能动。', '不能动，是因为你已经选了天道那一边。'],
      ['这把剑当年是我亲手交给你的，你说过会替我守一辈子。', '我守了三百年，今天你却要我交还。', '不是要你交还，是要你看清，它一直就不该归任何一方。'],
      ['阿芜，你今晚跟着我下山，半步都不许离我视线之外。', '霜姐放心，我把这些日子的事都记在册子里了。', '记得越细越好，将来我若是回不来，你拿去给宗门。'],
      ['玄昭师兄，你今天再不开口，明天封印一破，整座南山的人都救不回来。', '我开口，天道立刻就会把我收走。', '那就让它收，反正我们已经欠了这条命三百年。'],
      ['这一剑下去，你我之间三百年的恩怨就算了结，不必再纠缠。', '我从来没想跟你了结。', '我知道，可是天道想，所以今夜必须有一个收尾。'],
    ],
    nanmen: [
      ['哥从工地寄回来的钱不够下个月的进货，我得想别的办法。', '小冰说她可以先借我一千块。', '不能借她的，她妈下岗的事我不能再添麻烦。'],
      ['街道办今早把告示贴到我家门口了，三个月之内必须搬。', '邓主任说话有他的难处，你别去硬碰。', '难处归难处，可这是我爸留下的最后一样东西。'],
      ['这卷带子没标签，客人塞下就走，我放进机器试过，里头不是电影。', '不是电影是什么。', '是七年前我爸生日那天家里录的录像。'],
      ['今晚连放三天《英雄本色》，整条街都会过来。', '你疯了，胶片磨损一次就少一次。', '磨就磨，我宁可它磨完也不要它烂在仓库里。'],
      ['听证会我准备好了，明天我自己去站到会议室里头讲。', '你才十六岁，会上那些人不会听你的。', '听不听是他们的事，讲不讲是我的事。'],
    ],
  };
  const arr = pool[genre] || pool.shanhun;
  return arr[idx % arr.length];
}
