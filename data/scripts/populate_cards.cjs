const http = require('http');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: 4173, path, method: 'GET' }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.end();
  });
}

function apiPut(path, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 4173, path, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject); req.write(b); req.end();
  });
}

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 4173, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject); req.write(b); req.end();
  });
}

function makeId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function main() {
  const resp = await apiGet('/api/projects/project_mnyhwhzo_5veqx5');
  const proj = resp.project;
  const nodes = proj.structure_profile.nodes;
  const chars = proj.character_hub.characters;

  const linke = chars.find(c => c.name === '林可');
  const jiang = chars.find(c => c.name === '江明远');
  const linkeId = linke ? linke.id : '';
  const jiangId = jiang ? jiang.id : '';

  const nodeByType = new Map(nodes.map(n => [n.node_type, n]));

  function card(nodeType, title, summary, dramaticQ, conflict, change, notes, tags, charIds) {
    const node = nodeByType.get(nodeType);
    return {
      id: makeId('plot'),
      title,
      act_id: node.act_id,
      node_id: node.id,
      type: 'mainline',
      status: 'draft',
      summary,
      dramatic_question: dramaticQ,
      conflict,
      change,
      notes,
      character_ids: charIds,
      impact_tags: tags,
      depends_on: [],
      next_ids: [],
      scene_seed_ids: []
    };
  }

  const cards = [
    card('opening_image', '重返传译亭',
      '林可三年后以"临时任用"身份走进联合国传译亭C-7，调试设备，等待会议开始。陈好进入，两人短暂对话。透过单向玻璃，林可看见楼下的江明远入场就座。摄影机第一次固定。',
      '三年后重返这个亭子，她是谁？',
      '职业精度与个人情感的共存张力',
      '从"前传译员"重新变回"传译员"——但语境已改变',
      '调整麦克风那半厘米建立她的精准性。那张"临时任用"证件是核心道具。',
      ['开场印象', '人物建立'], [linkeId]),

    card('setup', '闪回：那个晚上',
      '闪回三年前：江明远用"在这个时间节点上，我们的家庭需要一个稳定的支撑"劝林可辞职。那是他第一次使用这套语言。林可当晚没有说不。字幕：三个月后，她提交了辞职申请。',
      '她当时为什么没有说不？',
      '个人意志与家庭共识框架的张力',
      '她从"有正式职位的人"变成"没有职位的人"',
      '那杯静止的红酒是关键意象。语言是凶器，但穿着关心的外衣。',
      ['闪回', '世界建立', '主题'], [linkeId, jiangId]),

    card('catalyst', '诱发事件：那句话',
      '江明远登台发言，说出"在这个时间节点上（at this juncture）"。林可正在翻译，手悬在麦克风上整整0.5秒。她听出了那句话的两层——今天的外交立场和三年前的那个私人说辞。她继续翻译，一字不差。',
      '她知道了。但她能做什么？',
      '翻译职责与个人认知的正面碰撞',
      '从"完成翻译"到"听见了那句话"',
      '那0.5秒的停顿是全片的爆炸核心。摄影机不动。陈好没有注意到。',
      ['诱发事件', '核心时刻'], [linkeId, jiangId]),

    card('lock_in', '核查与确认',
      '会后，林可回放录音，翻出过去一年江明远所有公开发言和婚姻中的短信，逐一比对。那个句型出现了12次，每次都出现在他需要让某人"自主选择"的时候。第一次对质在酒店，他平静地将她的质疑包装成"疲劳"。她确认了：这是一个系统。',
      '这是习惯还是工具？他知不知道自己在做什么？',
      '她有证据，但没有他的意图——这两者不同',
      '从感觉不对到我知道是什么了',
      '她作为传译员的精准性第一次用于自己的生活。',
      ['调查', '认知升级', '主线锁定'], [linkeId]),

    card('promise', '婚姻的语言考古',
      '林可在庭院翻看四年前的短信，发现每次她的重大人生选择前面都有他的一个精心设计的问题：晋升评估、住所、出行安排——同一套结构。她不是在找证据，她在做考古。然后是第二次对质，比第一次更深，但仍然被他消解了。',
      '如果每个我的选择都是在他的框架里做出的，那什么是我自己的？',
      '历史是她拥有的，但历史不可改变',
      '她开始用分析语言而非情感语言理解自己的婚姻',
      '这是第三幕的核心动作：从感知到命名。',
      ['调查深化', '故事承诺'], [linkeId]),

    card('midpoint', '中点：对质失败',
      '林可正面质问江明远：四年前的晋升评估，三年前的辞职，住所的选择——你是不是知道自己在做什么？他用同一套语言应对，把她的质疑包装成情绪状态，建议等她冷静了再谈。她无法突破这个结构。独自在黑暗客厅坐着。孤立开始。',
      '当对方用同一套工具回应你对那套工具的质疑，出口在哪里？',
      '他的防御体系和她的认知体系使用同一种语言',
      '她意识到：在他划定的语言里，她永远是错的那个',
      '影片中点。不是情绪爆发，是一堵看不见的墙。',
      ['对质', '中点翻转', '孤立'], [linkeId, jiangId]),

    card('reversal', '签名与第一个不',
      '林可把联合国正式合同摆上桌。他提出使馆考量和我们的节奏，她说我知道你只是提出来讨论，但我的答案是不，然后签了合同。稍早，当他提议要孩子，她直接说不——整部影片里她第一个没有解释、没有迟疑的不。那个不说出来之后，空气里有什么不同了。',
      '她能在他的系统里开辟属于自己的空间吗？',
      '自主权与婚姻关系的张力',
      '她第一次用完整的句子表达她要的东西',
      '那个不字是第四幕的转折点。说出它之后空气不同了。',
      ['决断', '反扑', '转折'], [linkeId, jiangId]),

    card('collapse', '她搬出去了',
      '林可告诉江明远她要搬出去住：我需要一段时间住在只有我自己做决定的地方。她搬了。江明远在书房一个人坐着，第一次在无人看见的地方露出了人的样子——不是崩溃，只是人的样子。她的市区公寓，很小，是她的。',
      '这是终点还是起点？',
      '婚姻的物理分离与情感的未竟',
      '她从婚姻空间进入自己的空间',
      '江明远书房那一幕很重要——他不是反派，他也是一个被自己训练出来的人。',
      ['分居', '崩塌时刻'], [linkeId, jiangId]),

    card('final_choice', '坐回传译亭',
      '三个月后，林可坐回传译亭（现在是正式合同P-3）。今天她将翻译由江明远起草但由助理代表宣读的文件。她再次听见那个熟悉的语言结构。这次不同：她知道它的两层，站在它的外侧，不再被困在里面。她做出选择：如何使用她的声音。',
      '知道了所有层次之后，她会做什么？',
      '翻译忠实性与个人觉知的最终张力',
      '从被动接收到主动选择',
      '这是全片最安静的戏，也是最重的戏。',
      ['最终选择'], [linkeId]),

    card('finale', '她翻译，那是她的声音',
      '林可翻译，准确，专注，稳定。她翻译得一字不差——但这次，这是她的选择，不是职业训练的反射。会议结束后，她向汤主管提交维也纳人权事务司调职申请。维也纳，新的位置，她的位置。',
      '她离开了吗？还是她开始了？',
      '已完成，不再是冲突',
      '她找回了自己的声音，通过选择翻译来使用它',
      '摄影机从传译亭拉远，在所有语言的喧嚣里，亭子是稳定的。',
      ['终局', '高潮行动'], [linkeId]),

    card('aftershock', '那个没有标题的文档',
      '林可在市区公寓写一个文档，文档没有标题，里面是她第一次用自己的语言写的东西。她写，然后去上班了，屏幕自动变暗，那些字还在上面，光标闪烁。全片结束。本片无配乐。',
      '（没有问题了——故事结束于一个开始）',
      '无',
      '从无处说话到开始说话',
      '最后的意象：不是答案，是持续的动作。光标在闪。',
      ['余波落点', '尾声'], [linkeId])
  ];

  // Replace all cards
  proj.plot_board.cards = cards;

  // Update node card_ids
  proj.structure_profile.nodes = proj.structure_profile.nodes.map(node => ({
    ...node,
    card_ids: cards.filter(c => c.node_id === node.id).map(c => c.id)
  }));

  // Clear the manually-added scenes from scene_workbench so system can regenerate
  proj.scene_workbench = null;

  const r = await apiPut('/api/projects/project_mnyhwhzo_5veqx5', { project: proj });
  console.log('PUT status:', r.status);
  console.log('Cards populated:', cards.length);
  cards.forEach(c => {
    const node = nodes.find(n => n.id === c.node_id);
    console.log('  [' + (node ? node.node_type : '?') + '] ' + c.title);
  });
}

main().catch(console.error);
