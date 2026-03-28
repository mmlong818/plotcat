export const defaultProject = {
  project: {
    id: "project_001",
    title: "潮汐尽头",
    format: "feature_or_pilot",
    language: "zh-CN",
    genre: ["现实悬疑", "家庭剧情"],
    logline:
      "一名失手害死弟弟的海上搜救员，在一宗旧案重启后被迫回到故乡，她必须在揭开真相与原谅自己之间做出选择。",
    theme_question: "当真相会摧毁仅剩的亲情时，人还应不应该继续追问？",
    tone: "克制、潮湿、压抑中带有微弱回暖",
    status: "development"
  },
  intent_anchor: {
    id: "anchor_001",
    core_idea: "一个把自我惩罚活成职责的人，最终学会承认失去并停止报复自己。",
    theme: "宽恕不是放过别人，而是停止用痛苦证明爱。",
    protagonist: "沈澜",
    arc: "从控制一切到允许自己被看见和被原谅",
    motif: "水面倒影",
    genre: ["现实悬疑", "家庭剧情"],
    status: "active",
    revisions: [
      {
        id: "anchor_rev_001",
        changed_fields: ["theme"],
        reason: "从复仇转向宽恕，让结尾更能落到人物转变而不是案件胜负。",
        created_at: "2026-03-15 10:20"
      }
    ]
  },
  story_bible: {
    premise:
      "沈澜回到海边小城调查弟弟的死因，却发现所有人都在默认一种更方便活下去的谎言。",
    core_conflict: "她越接近真相，就越可能毁掉母亲与继父勉强维持的家庭秩序。",
    characters: [
      {
        id: "char_001",
        name: "沈澜",
        story_role: "protagonist",
        external_want: "查清弟弟阿屿死亡当晚的完整经过",
        internal_need: "承认自己无法通过惩罚自己让死者回来",
        psychological_flaw: "控制欲过强",
        moral_flaw: "习惯以冷漠惩罚爱她的人",
        public_mask: "专业、强硬、无懈可击",
        core_fear: "一旦放下责任，就等于背叛弟弟",
        wound: "她曾在风暴预警中误判返航时机",
        arc_start: "把全部关系都变成任务",
        arc_end: "接受自己不能修复一切，但可以停止继续伤害别人",
        voice_rules: ["短句", "少用疑问句", "习惯先否定后解释"],
        secret: "她早就怀疑继父知道真相，却一直不敢真的问出口"
      },
      {
        id: "char_002",
        name: "周岭",
        story_role: "opponent_ally",
        external_want: "阻止沈澜重启旧案，保护港口项目",
        internal_need: "承认自己不是所有牺牲的管理者",
        psychological_flaw: "过度现实",
        moral_flaw: "习惯拿集体利益掩盖个人责任",
        public_mask: "可靠、能扛事",
        core_fear: "所有人一旦说真话，整个家会彻底散掉",
        wound: "当年事故后成为了母亲和家庭的实际支柱",
        arc_start: "把隐瞒当成保护",
        arc_end: "第一次允许别人承担真相后果",
        voice_rules: ["含混", "先安抚再转移话题"],
        secret: "事故夜他私自关闭过一段岸边照明"
      },
      {
        id: "char_003",
        name: "林絮",
        story_role: "ally",
        external_want: "把旧案做成报道，离开小城",
        internal_need: "停止把所有关系都当成素材",
        psychological_flaw: "情感抽离",
        moral_flaw: "为了真相会利用朋友",
        public_mask: "轻松、聪明、旁观",
        core_fear: "一旦站队就失去作为观察者的安全感",
        wound: "父亲曾因报道得罪当地权势人物而失业",
        arc_start: "只记录，不介入",
        arc_end: "主动承担公开真相的后果",
        voice_rules: ["快语速", "带反问", "喜欢给人留半句"],
        secret: "她手里有弟弟事故当晚的偷拍视频"
      }
    ],
    relationships: [
      {
        id: "rel_001",
        source_character_id: "char_001",
        target_character_id: "char_002",
        relationship_type: "继父与继女",
        tension: "照顾与怀疑并存",
        power_balance: "周岭在家庭秩序里更有话语权",
        shared_history: "事故后两人共同照顾母亲，却从未真正谈过事故",
        hidden_information: "两人都怀疑对方知道更多，但没人先摊牌"
      },
      {
        id: "rel_002",
        source_character_id: "char_001",
        target_character_id: "char_003",
        relationship_type: "旧友",
        tension: "信任与利用反复摇摆",
        power_balance: "信息优势在林絮",
        shared_history: "学生时代一起逃离过小城，最后只有林絮真的离开",
        hidden_information: "林絮握有偷拍视频但没有第一时间告诉沈澜"
      }
    ],
    world_rules: [
      {
        id: "rule_001",
        rule_statement: "所有关键真相都必须能落回到人的选择，不能靠巧合揭晓。",
        rule_level: "hard",
        scope: "全剧",
        exceptions: [],
        evidence: ["意图锚点", "主题"]
      },
      {
        id: "rule_002",
        rule_statement: "视觉母题只能围绕水面、倒影、折射，不引入无关火焰意象。",
        rule_level: "soft",
        scope: "场景视觉",
        exceptions: [],
        evidence: ["motif"]
      }
    ],
    timeline_events: [
      {
        id: "event_001",
        story_day: 1,
        sequence_index: 1,
        summary: "沈澜回到港口，得知旧案资料被匿名寄回。",
        participants: ["char_001", "char_003"],
        location: "旧港办公室",
        trigger: "匿名信",
        consequence: "她决定留下来继续查"
      },
      {
        id: "event_002",
        story_day: 2,
        sequence_index: 2,
        summary: "周岭试图说服她不要翻旧账。",
        participants: ["char_001", "char_002"],
        location: "家中餐桌",
        trigger: "家庭晚饭",
        consequence: "沈澜察觉继父隐瞒事实"
      },
      {
        id: "event_003",
        story_day: 2,
        sequence_index: 3,
        summary: "林絮交出偷拍视频的一小段。",
        participants: ["char_001", "char_003"],
        location: "海堤尽头",
        trigger: "调查停滞",
        consequence: "沈澜发现当晚灯塔方向有人影"
      }
    ],
    beats: [
      {
        id: "beat_001",
        framework: "three_act",
        slot: "act_1_turn",
        purpose: "沈澜从回乡者变成主动调查者",
        linked_scene_ids: ["scene_001", "scene_002"]
      },
      {
        id: "beat_002",
        framework: "three_act",
        slot: "midpoint",
        purpose: "她意识到隐瞒真相的人就在家里",
        linked_scene_ids: ["scene_003"]
      }
    ],
    scene_cards: [
      {
        id: "scene_001",
        order_index: 1,
        title: "港口回返",
        pov_character_id: "char_001",
        location: "旧港办公室",
        time_of_day: "夜",
        goal: "确认匿名信中的事故资料是否真实",
        obstacle: "资料缺页且负责保管的人临时失踪",
        tactic: "她先按流程盘点，再私下翻查旧封存柜",
        turn: "她在柜门倒影里看见林絮一直站在门外等她",
        value_shift: "从独自处理到被迫面对旧关系",
        new_information: ["匿名信里的档案编号真实存在"],
        input_state: "沈澜想尽快处理完后离开小城",
        output_state: "她意识到有人故意把她留在这里",
        production_tags: ["夜戏", "倒影"],
        dialogue_seed: "我不是回来翻旧账的，我只是把漏掉的流程补完。",
        emotion_stage: "否认"
      },
      {
        id: "scene_002",
        order_index: 2,
        title: "餐桌劝退",
        pov_character_id: "char_002",
        location: "周家餐厅",
        time_of_day: "晚",
        goal: "劝沈澜停止调查",
        obstacle: "沈澜故意用职业口吻逼问他",
        tactic: "周岭试图把话题拉回母亲的病情",
        turn: "",
        value_shift: "",
        new_information: ["周岭知道匿名信的存在却装作第一次听说"],
        input_state: "家庭秩序勉强维持平静",
        output_state: "餐桌开始变成审讯桌",
        production_tags: ["室内", "家庭戏"],
        dialogue_seed: "你不是在查真相，你是在找一个能继续恨下去的理由。",
        emotion_stage: "对抗"
      },
      {
        id: "scene_003",
        order_index: 3,
        title: "海堤拷问",
        pov_character_id: "char_001",
        location: "海堤尽头",
        time_of_day: "清晨",
        goal: "",
        obstacle: "林絮只愿意交出被剪过的一段视频",
        tactic: "沈澜先示弱，再突然追问拍摄时间",
        turn: "视频里的灯塔灯位与事故报告不一致",
        value_shift: "从怀疑外人到怀疑家人",
        new_information: ["事故夜灯塔方向出现过第二个人影"],
        input_state: "沈澜怀疑资料只是恶作剧",
        output_state: "她决定回家直接逼问周岭",
        production_tags: ["外景"],
        dialogue_seed: "你如果还想让我相信你，就别再给我剪过的东西。",
        emotion_stage: ""
      }
    ],
    setup_payoffs: [
      {
        id: "setup_001",
        setup_summary: "匿名信里的缺失页码",
        setup_scene_id: "scene_001",
        expected_payoff_window: "第二幕前半",
        status: "open",
        payoff_scene_id: "",
        payoff_summary: ""
      },
      {
        id: "setup_002",
        setup_summary: "周岭提到的停电借口",
        setup_scene_id: "scene_002",
        expected_payoff_window: "第二幕中点",
        status: "partial",
        payoff_scene_id: "scene_003",
        payoff_summary: "视频里灯位异常说明停电说法可疑，但还未实锤"
      }
    ]
  }
};

export function cloneDefaultProject() {
  return structuredClone(defaultProject);
}
