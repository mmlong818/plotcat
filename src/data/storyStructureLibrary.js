// src/data/storyStructureLibrary.js
// 29 类通用剧本结构参考库

export const STRUCTURE_LIBRARY_TAGS = ["通用", "电影", "剧集", "短片", "微短剧", "角色驱动", "多线", "非线性", "悬疑侦探", "冒险奇幻", "科幻", "音乐", "实验文艺", "方法论"];

export const STORY_STRUCTURE_LIBRARY = [
  // ─── 0. 微短剧连载结构 ────────────────────────────────────────────
  {
    id: "micro_drama_serial",
    name: "微短剧连载结构",
    englishName: "Micro-Drama Serial",
    description: "竖屏微短剧（60-100 集、每集 1-3 分钟）的连载骨架。前几集快速起钩锁定爽点，中段用身份反转与每集结尾钩子维持追更，后段以阶段性爆点重置站位，结局完成总回收。",
    tags: ["微短剧", "剧集"],
    builtInKey: "micro_drama_serial",
    acts: [
      { key: "act_1", title: "起钩集群", purpose: "用前几集快速起钩并锁定爽点", range_label: "0% - 20%" },
      { key: "act_2", title: "连续反转", purpose: "保持每集结尾的追更钩子", range_label: "20% - 55%" },
      { key: "act_3", title: "阶段爆点", purpose: "用几次大爆点重置关系和站位", range_label: "55% - 85%" },
      { key: "act_4", title: "大结局", purpose: "完成总回收并给终极爽点", range_label: "85% - 100%" }
    ],
    nodes: [
      ["episode_hook", "act_1", "前几集起钩", true, { dramatic_function: "黄金三秒抓人 + 前三集内完成核心爽点承诺的首次兑付，让观众明确「追这部剧能爽到什么」", failure_modes: ["开篇铺垫世界观超过一集，观众划走", "爽点承诺模糊，前三集没有一次完整兑付"] }],
      ["identity_flip", "act_2", "身份/关系反转", true, { dramatic_function: "主角隐藏身份或核心关系发生第一次公开反转，重置所有人对主角的态度，制造第一波大爽点", failure_modes: ["反转太晚，中段全靠拖延误会维持", "反转只对观众揭示而剧中人无反应，爽感落空"] }],
      ["cliff_loop", "act_2", "追更钩子循环", true, { dramatic_function: "每集结尾必须落在钩子上（新威胁/新揭露/打脸前奏），维持「再看一集」的循环冲动", failure_modes: ["连续多集结尾平收，弃剧率陡增", "钩子全靠同一招（反复被打断的揭露），观众疲劳"] }],
      ["stage_peak", "act_3", "阶段爆点", true, { dramatic_function: "用一次大爆点（灭门真相/大反派现身/底牌尽出）把冲突提升一个量级，旧的对抗格局作废", failure_modes: ["爆点量级不足，只是更大的误会", "爆点后站位不变，剧情原地打转"] }],
      ["final_payoff", "act_4", "大结局回收", true, { dramatic_function: "所有埋设一次性总回收：恶人尽数打脸、身份全面公开、情感关系落定，终极爽点必须超过此前所有爆点", failure_modes: ["留太多线头不回收，差评集中爆发", "结局爽点弱于中段爆点，高开低走"] }]
    ]
  },
  // ─── 1. 三幕式结构 ──────────────────────────────────────────────────
  {
    id: "three_act",
    name: "三幕式结构",
    englishName: "Three-Act Structure",
    description: "最经典的戏剧结构。第一幕建立世界与诱因，第二幕对抗升级，第三幕高潮决战与收束。适用范围极广。",
    tags: ["通用", "电影", "剧集"],
    builtInKey: "three_act",
    acts: [
      { key: "act_1", title: "第一幕", purpose: "设定世界/角色登场/诱因事件", range_label: "0% - 25%" },
      { key: "act_2", title: "第二幕", purpose: "尝试/对抗/中点大事件/转折危机", range_label: "25% - 75%" },
      { key: "act_3", title: "第三幕", purpose: "高潮决战/问题解决/结尾收束", range_label: "75% - 100%" }
    ],
    nodes: [
      ["opening_image", "act_1", "开场印象", true, { dramatic_function: "用单一画面建立故事基调与主角处境，暗示主题缺陷，为结尾画面的镜像对照打下基础", failure_modes: ["开场与主题脱节，只追求视觉冲击", "基调不清晰，观众无法判断这是什么类型的故事"] }],
      ["setup", "act_1", "基础铺陈", true, { dramatic_function: "建立主角的旧世界全貌——日常处境、核心缺陷、人际关系——同时埋下让观众喜欢主角的具体细节", failure_modes: ["铺陈过长导致节奏拖沓，观众流失", "主角缺陷只靠台词说明而非行动呈现", "忘记安排让观众同情主角的「救猫咪时刻」"] }],
      ["catalyst", "act_1", "诱发事件", true, { dramatic_function: "一个外部事件打破主角的旧世界平衡，迫使故事必须往前走；事件本身对主角是被动接收的", failure_modes: ["诱因量级太弱，主角理性上完全可以选择不理会", "诱因来得太晚（超过全片15%处），开篇节奏拖沓"] }],
      ["break_into_two", "act_1", "进入第二幕", true, { dramatic_function: "主角做出主动选择，踏入新世界——这必须是主角的主动选择，不是被推着走；新旧世界必须有质的对比", failure_modes: ["主角被动进入第二幕，丧失叙事主体性", "进入时刻不清晰，观众感受不到结构转折"] }],
      ["midpoint", "act_2", "中点翻转", true, { dramatic_function: "故事正中间的重大转折，或「假胜利」或「假失败」；此后赌注显著提升，主角行动模式改变", failure_modes: ["中点事件量级不足，不能撼动故事格局", "中点后故事节奏没有改变，压力没有真正升级"] }],
      ["crisis", "act_2", "危机时刻", true, { dramatic_function: "主角的最低谷——外部失败与内部崩塌同时到达顶点，某种「死亡」（字面或象征）在此发生", failure_modes: ["危机太短、太轻，没有充分建立绝望感", "危机只有外部失败，没有内心崩溃的深度"] }],
      ["break_into_three", "act_2", "进入第三幕", true, { dramatic_function: "主角带着内在改变后的新状态重新踏上战场，动机从外部驱动转为内部驱动", failure_modes: ["主角被外部事件推入第三幕而非主动选择", "进入第三幕时状态与第一幕无变化，看不出弧光"] }],
      ["finale", "act_3", "终局行动", true, { dramatic_function: "综合运用旧技能+新能力+内在成长，完成最终对抗；主角的弧光在行动中（非台词中）被体现", failure_modes: ["终局行动只靠运气或外部援助，主角成长白费", "A线和B线分开收尾，没有在高潮中融合"] }],
      ["final_image", "act_3", "结尾印象", false, { dramatic_function: "与开场画面形成镜像对照，用单一画面封印全片情感意义，呈现主角弧光的完成", failure_modes: ["结尾画面与开场画面缺乏呼应", "结尾承载过多叙事信息，失去纯粹的情感力量"] }]
    ]
  },

  // ─── 2. 四幕式结构 ──────────────────────────────────────────────────
  {
    id: "four_act",
    name: "四幕式结构",
    englishName: "Four-Act Structure",
    description: "三幕结构的细化版本。将中段分为「初步尝试」与「危机升级」两幕，节奏更分明，适合内容量较大的作品。",
    tags: ["通用", "电影", "剧集"],
    builtInKey: "four_act",
    acts: [
      { key: "act_1", title: "第一幕", purpose: "设定与诱因", range_label: "0% - 20%" },
      { key: "act_2", title: "第二幕", purpose: "初步尝试", range_label: "20% - 45%" },
      { key: "act_3", title: "第三幕", purpose: "危机升级", range_label: "45% - 75%" },
      { key: "act_4", title: "第四幕", purpose: "高潮解决与结尾", range_label: "75% - 100%" }
    ],
    nodes: [
      ["setup", "act_1", "基础铺陈", true, { dramatic_function: "建立主角处境、核心缺陷和初始关系网，完成观众情感投入的基础", failure_modes: ["铺陈只有信息没有情感钩子", "主角缺陷靠说明而非行动呈现"] }],
      ["catalyst", "act_1", "诱发事件", true, { dramatic_function: "外部事件打破现有平衡，给主角带来不可回避的问题或机会", failure_modes: ["诱因太弱或太晚出现", "诱因是主角内心决定而非外部事件"] }],
      ["break_into_two", "act_1", "第一转折", true, { dramatic_function: "主角主动踏入新处境，故事引擎全面启动，新旧世界边界清晰", failure_modes: ["转折不清晰，观众感受不到结构节点", "主角被动进入新处境"] }],
      ["reaction", "act_2", "反应段", true, { dramatic_function: "主角对新处境的反应和初步尝试，建立新世界规则，为中点积累动能", failure_modes: ["反应段只是过渡填充，没有推进人物或主题", "主角反应不符合其性格和动机"] }],
      ["midpoint", "act_2", "中点翻转", true, { dramatic_function: "赌注显著提升的重大事件，主角从被动反应转入主动进攻（或相反），故事格局发生质变", failure_modes: ["中点事件量级不足", "中点后节奏和张力没有改变"] }],
      ["attack", "act_3", "主动进攻", true, { dramatic_function: "主角以新的主动姿态向目标推进，但各方阻力也同步升级，压力从内外两面涌来", failure_modes: ["进攻段只是外部障碍堆叠，没有内部压力", "主角的核心缺陷没有在压力下被激活"] }],
      ["crisis", "act_3", "局势崩塌", true, { dramatic_function: "主角的支持系统瓦解，处境达到最低点，某种「死亡」在此发生，绝望感必须被充分建立", failure_modes: ["崩塌太快被跳过，绝望感不足", "崩塌只有外部失败，没有内心的彻底崩溃"] }],
      ["finale", "act_4", "高潮对决", true, { dramatic_function: "主角综合运用整个旅程的全部学习，以成长后的新自我完成最终对抗，弧光在行动中体现", failure_modes: ["主角靠运气或外力赢得胜利", "高潮缺乏内在成长层面的体现，只是力量决战"] }],
      ["final_image", "act_4", "结尾收束", true, { dramatic_function: "清晰呈现故事结束后的世界新状态，确认主角弧光完成，给观众情感落点", failure_modes: ["结尾仓促，情感落点不够充分", "结尾只收束了A线，B线情感悬空"] }]
    ]
  },

  // ─── 3. 五幕结构 ────────────────────────────────────────────────────
  {
    id: "five_act",
    name: "五幕结构",
    englishName: "Five-Act Structure (Freytag's Pyramid)",
    description: "弗赖塔格金字塔，源自莎士比亚戏剧。暴露→上升动作→高潮→下降动作→结局，弧线对称，情感充分。",
    tags: ["电影", "通用"],
    builtInKey: "feature_film",
    acts: [
      { key: "act_1", title: "暴露", purpose: "背景介绍、人物登场、初始矛盾埋下", range_label: "0% - 15%" },
      { key: "act_2", title: "上升动作", purpose: "冲突逐步升温、主角被迫卷入", range_label: "15% - 45%" },
      { key: "act_3", title: "高潮", purpose: "最高张力点、命运转折、不可逆决定", range_label: "45% - 60%" },
      { key: "act_4", title: "下降动作", purpose: "结果显现、代价清算、余震蔓延", range_label: "60% - 85%" },
      { key: "act_5", title: "结局", purpose: "最终状态、情感落点、世界新秩序", range_label: "85% - 100%" }
    ],
    nodes: [
      ["exposition", "act_1", "初始情境铺陈", true, { dramatic_function: "建立故事世界的背景、人物和初始矛盾的种子，让观众进入这个世界", failure_modes: ["铺陈过长，张力起步太晚", "初始矛盾太模糊，缺乏具体化"] }],
      ["inciting_incident", "act_2", "引爆冲突", true, { dramatic_function: "将潜在矛盾引爆为具体冲突，迫使所有人物站队或行动，冲突规模不可逆地扩大", failure_modes: ["引爆事件量级与后续冲突规模不匹配", "引爆后冲突节奏没有持续升温"] }],
      ["rising_conflict", "act_2", "冲突逐步升级", true, { dramatic_function: "冲突以螺旋上升的方式持续升温，每次升级都引入新的变量（新人物、新信息、新困境）", failure_modes: ["升级只是重复同一冲突模式，缺乏新变量", "上升动作过于线性，缺乏起伏"] }],
      ["climax", "act_3", "命运高潮", true, { dramatic_function: "整个故事的最高张力点，是命运的分水岭——此刻之后，什么都不会再一样", failure_modes: ["高潮点不够「高」，张力不是全篇最强的时刻", "高潮缺乏「命运性」，结局感觉还有很多可能性"] }],
      ["turning_point", "act_3", "不可逆转折", true, { dramatic_function: "主角或世界做出一个不可撤回的选择或行动，从根本上改变了故事的走向方向", failure_modes: ["转折可以被撤回或解除，不够「不可逆」", "转折缺乏角色的主动选择，只是被动接受命运"] }],
      ["falling_action", "act_4", "结果显现", true, { dramatic_function: "高潮后的结果在各个层面上被呈现：外部代价、人物关系的重组、情感的震荡余波", failure_modes: ["下降动作过于匆忙，代价没有被充分展示", "只处理外部结果，忽视内心和关系层面的余波"] }],
      ["denouement", "act_5", "结局收束", true, { dramatic_function: "所有开放的线索和关系得到最终处理，故事世界达到新的（脆弱的）平衡状态", failure_modes: ["结局太仓促，重要线索没有收束", "结局强行圆满，忽视了悲剧性的真实代价"] }],
      ["final_state", "act_5", "世界新秩序", false, { dramatic_function: "用一个具体场景或画面，清晰呈现故事结束后世界的新面貌，与开篇形成对照", failure_modes: ["新秩序太抽象，缺乏具体化的画面支撑", "新秩序与旧秩序缺乏明显的对照"] }]
    ]
  },

  // ─── 4. 英雄之旅 ────────────────────────────────────────────────────
  {
    id: "hero_journey",
    name: "英雄之旅",
    englishName: "The Hero's Journey / Monomyth",
    description: "坎贝尔原始神话结构，12个阶段描绘英雄从平凡世界出发、历经磨砺后带着智慧归来的完整旅程。",
    tags: ["冒险奇幻", "电影", "成长"],
    acts: [
      { key: "ordinary_world", title: "出发前", purpose: "平凡世界与英雄原点", range_label: "0% - 20%" },
      { key: "initiation", title: "磨砺历程", purpose: "进入陌生世界、考验与转变", range_label: "20% - 75%" },
      { key: "return", title: "归来", purpose: "带着改变回归，完成英雄蜕变", range_label: "75% - 100%" }
    ],
    nodes: [
      ["ordinary_world_node", "ordinary_world", "平凡世界", true, { dramatic_function: "建立英雄的起点处境，同时暗示其「注定属于更大世界」的特殊潜质——让观众相信英雄的不凡是有根基的", failure_modes: ["平凡世界太平凡，英雄潜质的萌芽完全看不见", "平凡世界阶段太长，召唤迟迟不来"] }],
      ["call_to_adventure", "ordinary_world", "冒险召唤", true, { dramatic_function: "一个外部事件/信息召唤英雄踏入更大的故事，此召唤必须与英雄的特殊性有内在联系，有「命中注定」的感觉", failure_modes: ["召唤与英雄个人特质无关，任何人都可以接这个召唤", "召唤太模糊，没有具体的行动指向"] }],
      ["refusal_of_call", "ordinary_world", "拒绝召唤", false, { dramatic_function: "英雄的旧我进行最后抵抗，拒绝的理由必须基于其核心恐惧，让踏出旅程更有重量", failure_modes: ["拒绝理由太蠢或太容易被外部解决，让英雄显得不可信", "拒绝阶段完全省略，英雄毫无阻力地出发"] }],
      ["meeting_mentor", "initiation", "遇到导师", true, { dramatic_function: "导师提供英雄踏上旅程所需的工具、知识或信心，但导师有明确局限——他不能替英雄完成旅程", failure_modes: ["导师成为救场机器，每次危机都出来解决，英雄丧失主体性", "导师只提供信息，没有情感层面的深度影响"] }],
      ["crossing_threshold", "initiation", "跨越门槛", true, { dramatic_function: "英雄正式踏入冒险世界，越过这道门后旧世界的保护消失，新世界有全新的规则和危险", failure_modes: ["门槛跨越不够「不可逆」，英雄随时可以回头", "新世界与旧世界规则差异不够显著"] }],
      ["tests_allies", "initiation", "试炼与盟友", true, { dramatic_function: "英雄通过多次小试炼学习新世界规则，建立关键盟友，识别潜在对手，每次试炼都有真实后果", failure_modes: ["试炼太容易，英雄无代价通过所有考验", "盟友建立没有过程，凭空就「是好人了」"] }],
      ["approach_cave", "initiation", "接近洞穴", false, { dramatic_function: "英雄接近核心挑战前的心理和外部准备，开始直面最深的恐惧，赌注再次明确化", failure_modes: ["准备阶段被草草带过，直接跳入磨难，心理铺垫不足", "赌注的明确化缺失，观众对失败代价感知不足"] }],
      ["ordeal", "initiation", "黑暗时刻（重大考验）", true, { dramatic_function: "英雄直视最深恐惧，经历某种「死亡」——字面或象征的——并在绝境中做出来自内心深处的选择", failure_modes: ["磨难太容易被克服，「死亡」感不足，重生说服力弱", "英雄靠外部援助或运气渡过磨难，而非自身成长"] }],
      ["reward", "initiation", "获得奖励", true, { dramatic_function: "英雄渡过磨难后获得奖励（物品/信息/内在智慧），奖励必须是磨难代价直接换来的", failure_modes: ["奖励凭空出现，与磨难的代价脱节", "奖励在后续故事中没有被真正运用"] }],
      ["road_back", "return", "回归之路", true, { dramatic_function: "英雄带着奖励踏上归途，但追击或最后阻碍让归途成为新考验；英雄面临「是否值得带着这些回去」的内心质疑", failure_modes: ["归途过于顺畅，失去了这个阶段应有的紧张感", "英雄回归动机不够清晰有力"] }],
      ["resurrection", "return", "最终考验", true, { dramatic_function: "在踏入旧世界前的最后门槛，英雄综合整个旅程所学，以彻底蜕变的新自我完成最终战斗，旧英雄在此死去", failure_modes: ["最终考验只是力量决战，缺乏内在成长层面的体现", "与磨难阶段过于相似，看不出整体旅程带来的成长"] }],
      ["return_with_elixir", "return", "回归新生", true, { dramatic_function: "英雄带着「仙液」回归，旧世界因英雄的归来而具体改变，旅程的意义在这里被最终确认", failure_modes: ["英雄归来后旧世界没有任何改变，旅程意义成疑", "「仙液」太抽象，无法在具体场景中体现"] }]
    ]
  },

  // ─── 5. Save the Cat! 节拍表 ────────────────────────────────────────
  {
    id: "save_the_cat",
    name: "Save the Cat! 节拍表",
    englishName: "Save the Cat! Beat Sheet",
    description: "布莱克·斯奈德的 15 节拍公式，精准定位每个故事节点的位置。好莱坞最常用的商业剧本结构工具。",
    tags: ["通用", "电影"],
    acts: [
      { key: "act_1", title: "第一幕", purpose: "建立世界、角色与诱因", range_label: "0% - 25%" },
      { key: "act_2a", title: "第二幕前半", purpose: "新世界的趣味与挑战", range_label: "25% - 55%" },
      { key: "act_2b", title: "第二幕后半", purpose: "压力倍增、崩溃深夜", range_label: "55% - 75%" },
      { key: "act_3", title: "第三幕", purpose: "终极行动与结尾", range_label: "75% - 100%" }
    ],
    nodes: [
      ["opening_image", "act_1", "开场画面", true, { dramatic_function: "用一个画面建立故事基调、主角处境和主题缺陷，与结尾画面形成镜像对照", failure_modes: ["开场画面与主题脱节，只追求视觉冲击", "缺乏与结尾形成对照的结构意识"] }],
      ["theme_stated", "act_1", "主题说明", false, { dramatic_function: "通过非主角的配角说出一句触及核心主题的话，主角此时必须不接受或忽视——旅程就是从「不接受」到「内化」", failure_modes: ["主题由主角本人自我陈述，失去叙事精髓", "主题说得过于直白，变成说教"] }],
      ["setup", "act_1", "设定世界", true, { dramatic_function: "建立主角旧世界的完整面貌，通过行动呈现核心缺陷，安排「拯救猫咪」时刻让观众喜欢主角", failure_modes: ["设定世界太慢，缺乏情感钩子", "忘记「救猫咪时刻」，观众对主角缺乏情感投入"] }],
      ["catalyst", "act_1", "诱因", true, { dramatic_function: "一个具体外部事件打破旧世界平衡，量级要足够撼动现状，是被动接收而非主角内心决定", failure_modes: ["诱因太弱，主角可以合理选择不理会", "诱因太晚出现（超过全片12%处）"] }],
      ["debate", "act_1", "犹豫期", false, { dramatic_function: "主角基于核心恐惧表现出对踏入新世界的真实抗拒，这是旧我最后的防线，让旅程的踏出更有重量", failure_modes: ["犹豫理由不令人信服，让主角显得无理由地墨迹", "犹豫期太短，主角立刻无阻力进入第二幕"] }],
      ["break_into_two", "act_1", "进入第二幕", true, { dramatic_function: "主角做出主动选择踏入新世界，新旧世界规则对比鲜明，主角的主体性在这里被确立", failure_modes: ["主角被动进入第二幕", "进入时刻不清晰，缺乏「一扇门被打开」的结构感"] }],
      ["b_story", "act_2a", "B 故事", false, { dramatic_function: "第二故事线正式启动，B线是主题的真正承载者，主角的真正成长将在这段关系中完成", failure_modes: ["B线与A线主题无关，只是填充", "B线人物只是工具人，没有独立的动机和弧光"] }],
      ["fun_and_games", "act_2a", "趣味游戏", true, { dramatic_function: "故事「兑现类型承诺」的核心段落——观众来看这个类型期待看到的内容在这里被充分呈现，同时推进人物和主题", failure_modes: ["只是爽点堆砌，没有推进任何人物关系或主题发展", "B线在这个段落消失，情感层次单薄"] }],
      ["midpoint", "act_2a", "中点", true, { dramatic_function: "「假胜利」或「假失败」的重大事件，赌注显著提升，主角行动模式转变，真正的考验从此开始", failure_modes: ["中点事件太弱，不能撼动故事格局", "假胜利后没有立即出现危机信号"] }],
      ["bad_guys_close_in", "act_2b", "坏事成双", true, { dramatic_function: "压力从内外两面同步涌来：外部威胁多维升级，内部支持系统瓦解，主角核心缺陷在高压下造成真实损失", failure_modes: ["只有外部压力，没有内部瓦解——单维度压力结构薄弱", "主角缺陷没有被激活造成真实代价"] }],
      ["all_is_lost", "act_2b", "万念俱灰", true, { dramatic_function: "主角最低谷，外部失败与内部崩塌同时到达顶点，某种「死亡」在此发生，绝望感必须被充分建立", failure_modes: ["最低谷太短太轻，没有充分建立绝望就跳入顿悟", "「死亡」元素太隐晦，观众感受不到这是最低点"] }],
      ["dark_night_soul", "act_2b", "灵感火花", false, { dramatic_function: "在最黑暗时刻后，主角独处审视内心，触达真正问题所在；灵感来自B线的主题真理，而非外部援助", failure_modes: ["顿悟来自外部新信息而非内部洞见", "顿悟内容与全片主题无关，只是一个聪明计划"] }],
      ["break_into_three", "act_2b", "进入第三幕", true, { dramatic_function: "主角带着内在改变主动踏回战场，动机质地与第一幕进入第二幕时截然不同——这次是清醒的选择", failure_modes: ["主角再次被外部事件推入行动而非主动选择", "进入第三幕时状态与旅程开始时无变化，弧光缺失"] }],
      ["finale", "act_3", "终极高潮", true, { dramatic_function: "A线外部冲突最终解决，B线情感落点，主角运用旧技能+新能力+内在成长做出「旧的自己绝对不会做」的选择", failure_modes: ["终局行动只靠外部能力，内在成长白费", "A线和B线分别收尾，没有在高潮中融合"] }],
      ["final_image", "act_3", "结尾画面", false, { dramatic_function: "与开场画面形成镜像，主角的「新状态」被具体化，全片情感意义被这个画面封印", failure_modes: ["结尾画面与开场缺乏呼应，浪费了最重要的首尾结构工具", "结尾画面承载过多叙事信息，失去情感力量"] }]
    ]
  },

  // ─── 6. 序列法 ──────────────────────────────────────────────────────
  {
    id: "sequence_approach",
    name: "序列法",
    englishName: "Sequence Approach",
    description: "将剧本分为 8 个各自完整的序列，每段序列各有张力目标。专业编剧常用来精准控制节奏与段落密度。",
    tags: ["电影", "通用"],
    acts: [
      { key: "act_1", title: "建立（序列 1-2）", purpose: "世界、人物与诱因", range_label: "0% - 25%" },
      { key: "act_2", title: "推进（序列 3-4）", purpose: "新目标、首次尝试与复杂困境", range_label: "25% - 50%" },
      { key: "act_3", title: "转折（序列 5-6）", purpose: "中点大事件、失败与新希望", range_label: "50% - 75%" },
      { key: "act_4", title: "收束（序列 7-8）", purpose: "最后障碍与高潮结局", range_label: "75% - 100%" }
    ],
    nodes: [
      ["seq1", "act_1", "序列1：世界设定、角色与诱因", true, { dramatic_function: "建立故事世界、主角处境和核心问题，序列结尾有明确的「小悬念」驱使观众进入序列2", failure_modes: ["序列1太慢，缺乏推动观众进入下一序列的钩子", "诱因被淡化，主角的行动动机不清晰"] }],
      ["seq2", "act_1", "序列2：主角初步反应", true, { dramatic_function: "主角对诱因做出反应并尝试用旧方式解决，序列内有自己完整的张力弧，结尾有转折推进序列3", failure_modes: ["初步反应太顺利，缺乏张力", "序列自身的完整性不足，只是过渡段落"] }],
      ["seq3", "act_2", "序列3：新目标/首次尝试", true, { dramatic_function: "主角确立更清晰的目标并进行首次真正尝试，序列在「看似可行」与「暗流涌动」之间制造张力", failure_modes: ["新目标与诱因脱节，缺乏逻辑推进感", "首次尝试太成功，失去戏剧性"] }],
      ["seq4", "act_2", "序列4：复杂困境", true, { dramatic_function: "主角面临多个方向的同步压力，处境比序列3更复杂，旧的解决方案失效，新方案尚未成型", failure_modes: ["困境只是障碍升级，没有带来新的人物维度", "复杂化缺乏内部逻辑，是随机堆叠的障碍"] }],
      ["seq5", "act_3", "序列5：中点大事件", true, { dramatic_function: "整个故事的格局被重新定义，赌注骤然提升，主角从「反应模式」切换为「主动模式」（或相反）", failure_modes: ["大事件量级不足，不能撼动全片格局", "中点后行动模式没有改变，失去转折感"] }],
      ["seq6", "act_3", "序列6：失败与新希望", true, { dramatic_function: "主角经历重大挫败并达到最低谷，随后在某个洞见或转机中找到前行的新方向", failure_modes: ["失败被草草带过，最低谷的情感重量不足", "新希望出现得太轻松，缺乏内在转变作为基础"] }],
      ["seq7", "act_4", "序列7：最后障碍", true, { dramatic_function: "主角在通往终局的最后阶段，面临一个集合了旅程中所有核心矛盾的终极障碍", failure_modes: ["最后障碍是新引入的随机困难，而非整个旅程矛盾的集中体现", "障碍被过快解决，终局行动缺乏足够的铺垫积累"] }],
      ["seq8", "act_4", "序列8：高潮与结局", true, { dramatic_function: "主角综合运用整个旅程的全部成长，完成最终对抗并收束所有开放线索", failure_modes: ["高潮缺乏主角内在成长的体现，只是力量决战", "结局过于仓促，各条线索没有得到充分收束"] }]
    ]
  },

  // ─── 7. 故事圆环 ────────────────────────────────────────────────────
  {
    id: "story_circle",
    name: "故事圆环",
    englishName: "Story Circle (Dan Harmon)",
    description: "Dan Harmon 从坎贝尔神话提炼的 8 步圆形结构，强调角色离开舒适区、经历改变后归来。",
    tags: ["通用", "角色驱动", "剧集"],
    acts: [
      { key: "you", title: "舒适区（上半圆）", purpose: "角色的起始状态与欲望", range_label: "0% - 30%" },
      { key: "new_world", title: "陌生世界（中段）", purpose: "离开舒适区、适应与获得", range_label: "30% - 75%" },
      { key: "return", title: "归来（下半圆）", purpose: "付出代价、回归与成长", range_label: "75% - 100%" }
    ],
    nodes: [
      ["comfort_zone", "you", "①角色处于舒适区", true, { dramatic_function: "建立角色的初始状态和舒适区的具体面貌，让观众理解「离开」对角色意味着什么", failure_modes: ["舒适区太理想化，角色离开没有心理成本", "舒适区建立不够具体，缺乏情感基础"] }],
      ["want", "you", "②想要某物", true, { dramatic_function: "明确角色的核心欲望，这个欲望是整个旅程的驱动引擎；「想要」不一定等于「需要」，这个落差是弧光的来源", failure_modes: ["想要的东西太模糊，缺乏具体性和驱动力", "想要的东西与后面「得到」的结果之间没有代价关系"] }],
      ["unfamiliar", "new_world", "③进入陌生世界", true, { dramatic_function: "角色踏入与舒适区规则完全不同的陌生环境，旧有的应对方式在此开始失效", failure_modes: ["陌生世界与舒适区差异不够显著，「陌生感」不足", "进入陌生世界缺乏具体的「越界时刻」"] }],
      ["adapt", "new_world", "④适应新环境", true, { dramatic_function: "角色学习新世界的规则，建立新关系，发展出新的应对能力，同时暴露出旧有局限", failure_modes: ["适应过程太顺畅，缺乏真实的学习成本", "新世界规则没有真正考验角色的核心缺陷"] }],
      ["get_what_wanted", "new_world", "⑤得到想要的东西", true, { dramatic_function: "角色得到了他/她「想要」的东西——但此时通常发现，得到之后的感觉与预期不同，或代价超过预期", failure_modes: ["得到的东西凭空出现，没有付出对应代价", "得到与代价之间的张力被轻描淡写"] }],
      ["pay_price", "new_world", "⑥为其付出代价", true, { dramatic_function: "得到想要的东西的代价在此显现——这个代价让角色意识到「想要」和「需要」之间的真正差距", failure_modes: ["代价太轻，与得到的东西不成比例", "代价与角色核心缺陷无关，是外部随机损失"] }],
      ["return_home", "return", "⑦回归原处", true, { dramatic_function: "角色带着改变后的自己回到熟悉的世界，熟悉的环境以「新眼光」被重新审视", failure_modes: ["回归过于顺畅，失去了回归本身的成本感", "熟悉的世界没有因角色的改变而显得不同"] }],
      ["changed", "return", "⑧获得成长/改变", true, { dramatic_function: "角色改变后的新状态被具体化呈现，「想要」与「需要」的关系被最终回答，旅程的意义在这里落地", failure_modes: ["改变太抽象，缺乏具体场景的落地呈现", "改变与旅程经历的内在逻辑不清晰"] }]
    ]
  },

  // ─── 8. 角色弧/成长驱动结构 ─────────────────────────────────────────
  {
    id: "character_arc",
    name: "角色弧/成长驱动结构",
    englishName: "Character-Driven / Arc Structure",
    description: "以角色内在转变为核心轴线。从缺陷出发，经触发、内心挣扎、决策，走向转变或失败。适合人物深度作品。",
    tags: ["角色驱动", "电影", "剧情"],
    acts: [
      { key: "act_1", title: "起点", purpose: "角色缺陷、困境与触发事件", range_label: "0% - 20%" },
      { key: "act_2", title: "挣扎", purpose: "内心挣扎与外界对抗的双重压力", range_label: "20% - 75%" },
      { key: "act_3", title: "转变", purpose: "决定性抉择与内在蜕变", range_label: "75% - 100%" }
    ],
    nodes: [
      ["arc_start", "act_1", "角色起点（缺陷/困境）", true, { dramatic_function: "建立角色的核心缺陷和初始处境，这个缺陷必须通过具体行为而非说明来呈现，且必须是真正阻碍角色达成核心目标的东西", failure_modes: ["缺陷只靠台词说明，没有行动化呈现", "缺陷与后续故事冲突缺乏内在逻辑联系"] }],
      ["trigger_event", "act_1", "触发事件", true, { dramatic_function: "一个外部事件直接激活角色的核心缺陷，迫使内心挣扎浮出水面——触发事件应该直指缺陷的痛点", failure_modes: ["触发事件是随机困难而非直接触发核心缺陷", "触发后的内心挣扎缺乏足够的积累就被跳过"] }],
      ["inner_struggle", "act_2", "内心挣扎", true, { dramatic_function: "角色内心的新旧价值观/信念的真实对抗，这个挣扎必须通过具体的场景和选择呈现，不只是内心独白", failure_modes: ["内心挣扎被外部冲突掩盖，情感深度不足", "挣扎太快被解决，缺乏足够的积累"] }],
      ["external_conflict", "act_2", "对抗外界", true, { dramatic_function: "外部冲突作为内心挣扎的「镜子」——外部对抗的每次失败或胜利，都应该反映角色内心状态的变化", failure_modes: ["外部冲突与内心挣扎脱节，两条线互不影响", "外部冲突占据太多篇幅，内心维度被边缘化"] }],
      ["decision_action", "act_3", "决策与行动", true, { dramatic_function: "角色基于内心挣扎后的真实改变，做出一个来自新自我的决定性行动——这个行动是旧的自己不可能做出的", failure_modes: ["决策没有体现内心挣扎带来的真正改变", "行动是被迫的而非角色主动选择的"] }],
      ["transformation", "act_3", "转变/成长/失败", true, { dramatic_function: "角色弧光的最终答案在此落地——无论是成长、部分成长、还是悲剧性的失败，都必须有具体场景呈现", failure_modes: ["转变太突然，缺乏前面挣扎的充分铺垫", "悲剧性失败没有揭示出深刻的意义，只是「坏结局」"] }],
      ["realization", "act_3", "终极自我实现", false, { dramatic_function: "在转变完成后，角色（和观众）对角色旅程的完整意义有一刻清醒的认识——可以是安静的洞见，也可以是爆发式的顿悟", failure_modes: ["「领悟」被直白地说出来而非通过画面和行动呈现", "自我实现的内容与整个旅程的主题不一致"] }]
    ]
  },

  // ─── 9. 卡片法/场景卡片 ─────────────────────────────────────────────
  {
    id: "index_cards",
    name: "卡片法/场景卡片",
    englishName: "Index Cards Method",
    description: "为每个场景编写独立卡片，标注时间/地点/事件/人物/动机，可灵活排序组合。是一种灵活的开发过程工具。",
    tags: ["通用", "方法论"],
    acts: [
      { key: "act_1", title: "场景序列（前段）", purpose: "建立关系、矛盾与世界的开头场景群", range_label: "0% - 35%" },
      { key: "act_2", title: "场景序列（中段）", purpose: "核心事件、冲突发展与转折场景群", range_label: "35% - 70%" },
      { key: "act_3", title: "场景序列（后段）", purpose: "高潮与结尾场景群", range_label: "70% - 100%" }
    ],
    nodes: [
      ["card_setup", "act_1", "建立类场景卡", true, { dramatic_function: "用具体的单场景建立人物处境、关系和世界规则；每张建立卡都应该同时完成情感投入和信息传递两个功能", failure_modes: ["建立卡只传递信息，没有情感钩子", "场景之间缺乏连接逻辑，排列随意"] }],
      ["card_conflict_intro", "act_1", "矛盾引入场景卡", true, { dramatic_function: "核心矛盾通过一个具体场景被引入，这个场景让观众感受到「故事真正开始了」", failure_modes: ["矛盾引入太模糊，观众无法确定核心冲突是什么", "场景只展示矛盾，没有让观众对某一方建立情感立场"] }],
      ["card_development", "act_2", "事件发展场景卡", true, { dramatic_function: "每张发展卡推进一步：人物关系变化、信息揭示、局势升级——每张卡都应该让故事处于不同于上一张的新状态", failure_modes: ["发展卡重复同一模式，缺乏escalation", "场景只是「发生了事情」，没有改变人物关系或力量格局"] }],
      ["card_midpoint", "act_2", "核心转折场景卡", true, { dramatic_function: "整个故事排列的中心转折，这张卡让整个叙事格局发生质变，之后的场景在新的规则下运行", failure_modes: ["转折卡的量级不足以重组叙事格局", "转折缺乏前面建立卡和发展卡的铺垫积累"] }],
      ["card_crisis", "act_2", "危机场景卡", true, { dramatic_function: "将中段积累的所有压力汇聚为一次具体的危机场景，主角处于最困难的境地，旧有解决方案全面失效", failure_modes: ["危机卡太短，没有充分展示处境的绝境感", "危机来得太快，没有足够的前期积累"] }],
      ["card_climax", "act_3", "高潮场景卡", true, { dramatic_function: "整个故事张力的最高点，主角在这张卡中做出决定性的选择或行动，体现整个旅程的弧光完成", failure_modes: ["高潮卡靠运气或外力解决，主角成长没有被体现", "高潮与危机之间缺乏过渡，显得突兀"] }],
      ["card_resolution", "act_3", "收束场景卡", true, { dramatic_function: "高潮后的世界新状态被具体化呈现，所有主要关系线得到明确处理，情感落点清晰落地", failure_modes: ["收束卡过于仓促，重要关系线悬空", "结尾场景只有外部状态呈现，缺乏情感意义的封印"] }]
    ]
  },

  // ─── 10. 嵌套/多线结构 ──────────────────────────────────────────────
  {
    id: "multi_storyline",
    name: "嵌套/多线结构",
    englishName: "Nested/Multiple Storylines",
    description: "两条或以上平行主线各自推进，在交点/融合节点碰撞交汇。适合群像剧和复杂人物关系故事。",
    tags: ["多线", "剧集", "群像"],
    acts: [
      { key: "act_1", title: "多线展开", purpose: "分别建立各主线的起点与驱动力", range_label: "0% - 30%" },
      { key: "act_2", title: "各线推进", purpose: "主线独立发展并开始相互影响", range_label: "30% - 65%" },
      { key: "act_3", title: "交汇收束", purpose: "各线交点碰撞，走向各自结局", range_label: "65% - 100%" }
    ],
    nodes: [
      ["storyline_a_start", "act_1", "主线A建立", true, { dramatic_function: "建立主线A的起始处境、核心人物和驱动力，让观众理解这条线的内在逻辑和情感投入点", failure_modes: ["主线A建立与主线B同质化，两线缺乏对比度", "驱动力不清晰，观众不知道这条线「要去哪里」"] }],
      ["storyline_b_start", "act_1", "主线B建立", true, { dramatic_function: "建立主线B的独立逻辑和情感质地，同时暗示与A线未来交汇的可能性；B线的价值在于与A线形成对照或互补", failure_modes: ["主线B像是A线的支线而非真正的独立主线", "B线与A线的潜在关联太隐晦，观众无法预见交汇"] }],
      ["subplot_setup", "act_1", "副线/支线铺垫", false, { dramatic_function: "铺垫将在后期影响主线的支线关系或信息，支线的价值在于为主线交汇时提供情感深度", failure_modes: ["支线在后期被遗忘，没有真正影响主线", "支线占据太多篇幅，喧宾夺主"] }],
      ["storyline_a_develop", "act_2", "主线A推进", true, { dramatic_function: "主线A独立推进到中段，积累了足够的张力，同时开始受到B线存在的影响（即使尚未正面交汇）", failure_modes: ["A线推进过于独立，完全不感知B线的存在", "推进缺乏内部的升级节奏，只是线性进展"] }],
      ["storyline_b_develop", "act_2", "主线B推进", true, { dramatic_function: "主线B在中段也积累足够的张力，并开始以某种方式影响或感知A线的存在", failure_modes: ["B线中段节奏与A线完全一致，缺乏节奏对比", "B线内部矛盾没有得到充分发展"] }],
      ["first_intersection", "act_2", "初次交点", false, { dramatic_function: "两线的第一次接触或碰撞，不一定是完全融合，而是让两线都感受到对方的存在和影响", failure_modes: ["初次交点太早，在两线各自建立完整逻辑之前就交汇", "交点太弱，对两线后续发展没有实质影响"] }],
      ["collision_node", "act_3", "交点/融合节点", true, { dramatic_function: "两线的真正碰撞时刻，这个节点产生的化学反应比任何一条单线都更大；碰撞方式必须是两线各自内在逻辑的必然结果", failure_modes: ["碰撞节点缺乏两线积累的充分铺垫，显得突兀", "碰撞产生的结果对两线都太小，没有真正改变任何一线"] }],
      ["storyline_a_end", "act_3", "主线A结局", true, { dramatic_function: "主线A在经历与B线碰撞后，达到自己的最终状态——这个结局应该是被碰撞改变后的版本，而非A线孤立发展的必然结果", failure_modes: ["A线结局好像从未与B线交汇过，多线结构的意义丧失", "结局太仓促，没有给A线足够的「落地」时间"] }],
      ["storyline_b_end", "act_3", "主线B结局", true, { dramatic_function: "主线B的最终状态，在与A线碰撞的影响下完成自己的收束，两线结局之间应该有明确的呼应或对照关系", failure_modes: ["B线结局与A线结局情感质地重复，缺乏对比", "B线结局草草收束，重要性远低于A线，使B线显得多余"] }]
    ]
  },

  // ─── 11. 环状/非线性结构 ────────────────────────────────────────────
  {
    id: "nonlinear",
    name: "环状/非线性结构",
    englishName: "Circular/Nonlinear Structure",
    description: "打破时间顺序，通过回溯、闪前、多视角重叠重新排列事件。结尾呼应开头，真相在拼图中浮现。",
    tags: ["非线性", "悬疑侦探", "实验文艺", "电影"],
    acts: [
      { key: "act_present", title: "现时主线", purpose: "当下时间轴的核心事件推进", range_label: "交织推进" },
      { key: "act_past", title: "回溯层", purpose: "过去事件与关键背景的揭示", range_label: "交织推进" },
      { key: "act_resolution", title: "真相收束", purpose: "多时空线索汇聚，完整图景显现", range_label: "尾段" }
    ],
    nodes: [
      ["present_opening", "act_present", "现时开场节点", true, { dramatic_function: "建立现时时间线的基准状态和核心悬念，同时设计好回溯触发点，让观众渴望了解「过去发生了什么」", failure_modes: ["现时开场就揭示太多，回溯的神秘感丧失", "现时线与回溯线缺乏明确的情感联系"] }],
      ["flashback_1", "act_past", "关键回溯片段1", true, { dramatic_function: "第一段回溯既要揭示新信息，又要制造新的疑问；回溯信息必须以能改变观众对现时事件理解的方式被选择", failure_modes: ["回溯只提供背景信息，没有真正改变观众对现时线的理解", "回溯与现时线的切换时机不当，中断了叙事动能"] }],
      ["present_complication", "act_present", "现时复杂化", true, { dramatic_function: "现时线在得到第一段回溯信息后，以新的复杂方式向前推进，观众用已知信息重新理解现时事件", failure_modes: ["现时线的复杂化与回溯信息的揭示脱节", "现时线节奏过慢，观众失去对时间线的感知"] }],
      ["flashback_2", "act_past", "关键回溯片段2", true, { dramatic_function: "第二段回溯大幅刷新观众的认知框架，通常揭示一个让之前所有现时事件都需要被重新解读的关键信息", failure_modes: ["第二次回溯的冲击力弱于第一次，节奏泄气", "回溯揭示的信息在情感上没有足够的重量"] }],
      ["echo_node", "act_past", "多时空对照节点", false, { dramatic_function: "在不同时空之间制造有意义的对照——相似的场景、台词或意象在不同时空出现，产生共鸣和反差", failure_modes: ["对照过于刻意，显得做作", "对照缺乏情感意义，只是技术性的叙事装饰"] }],
      ["revelation", "act_resolution", "真相揭示", true, { dramatic_function: "所有时空线索的拼图在此完成，真相同时满足「意外性」（没想到是这样）和「必然性」（回看所有线索都指向这里）", failure_modes: ["真相缺乏意外性，观众早已猜到", "真相缺乏必然性，回看线索逻辑不自洽，感觉像「作弊」"] }],
      ["circular_ending", "act_resolution", "尾声呼应开头", true, { dramatic_function: "结尾回到开篇的场景或意象，但以完全不同的眼光被重新审视——观众看到了「同一个世界的不同真相」", failure_modes: ["循环结构只是形式上的首尾呼应，缺乏内在意义", "结尾解释太多，失去了非线性结构的诗意留白"] }]
    ]
  },

  // ─── 12. 情感曲线结构 ───────────────────────────────────────────────
  {
    id: "emotional_arc",
    name: "情感曲线结构",
    englishName: "Emotional Arc Structure",
    description: "以角色情感旅程为主轴，设计起伏有致的情绪节奏。适合爱情、家庭、人文题材，注重观众共情体验。",
    tags: ["角色驱动", "剧情", "爱情"],
    acts: [
      { key: "act_1", title: "情感基准", purpose: "建立角色情感初始状态", range_label: "0% - 20%" },
      { key: "act_2", title: "情感激荡", purpose: "触发、递进、冲突、低谷与高峰", range_label: "20% - 80%" },
      { key: "act_3", title: "情感收束", purpose: "和解、成长或破碎的落点", range_label: "80% - 100%" }
    ],
    nodes: [
      ["emotional_baseline", "act_1", "角色情感初始状态", true, { dramatic_function: "建立角色的情感起点——这是整个情感旅程的基准线，必须足够具体（不只是「开心」，而是「用忙碌麻痹自己的孤独感」）", failure_modes: ["情感基准太模糊，情感曲线缺乏参照点", "情感状态只通过旁白说明，没有具体场景呈现"] }],
      ["emotional_trigger", "act_2", "触发情感波动", true, { dramatic_function: "一个具体事件触发角色的情感防线，唤醒长期压抑或麻木的情感——触发事件应该精准击中角色的情感脆弱点", failure_modes: ["触发事件太普通，不足以打破角色的情感平衡", "触发与角色的核心情感伤口缺乏直接联系"] }],
      ["emotional_escalation", "act_2", "情绪递进/冲突", true, { dramatic_function: "情感波动持续升温，并在人际关系中制造具体的摩擦和冲突——情感内部状态必须转化为可见的外部行为", failure_modes: ["情绪递进只停留在内心独白层面，缺乏外化为行动和冲突", "升级缺乏内在逻辑，情绪波动感觉随机"] }],
      ["emotional_low", "act_2", "情感低谷", true, { dramatic_function: "情感旅程的最深谷底，角色的核心情感伤口被完全暴露；这个时刻必须让观众感受到真实的痛苦共情", failure_modes: ["低谷太浅，情感重量不足", "低谷只有外部失败，缺乏内心层面的崩溃"] }],
      ["emotional_peak", "act_2", "情感高峰", true, { dramatic_function: "情感旅程的最高峰——无论是爱、喜悦、愤怒还是释放，这个时刻让情感张力达到顶点，观众的共情在此爆发", failure_modes: ["高峰来得太突然，缺乏前面充分积累", "高峰只是情绪的爆发，没有推进任何内心转变"] }],
      ["emotional_resolution", "act_3", "内心和解/成长", true, { dramatic_function: "角色完成某种内心层面的和解或成长——与他人、与过去、或与自己；这个过程必须来自内心真实的改变，不是外部压力的妥协", failure_modes: ["和解来得太轻松，没有体现角色真正的内心转变", "成长只通过台词说出来，没有通过行动和场景呈现"] }],
      ["catharsis", "act_3", "共情释放/情感落点", false, { dramatic_function: "为观众提供情感宣泄的出口，让积累的共情在一个具体的场景中得到充分释放，同时给出情感落点", failure_modes: ["宣泄场景在情感上是「正确的」但在审美上太直白，缺乏余味", "落点只关注角色，没有为观众提供情感出口"] }]
    ]
  },

  // ─── 13. 事件驱动结构 ───────────────────────────────────────────────
  {
    id: "event_driven",
    name: "事件驱动结构",
    englishName: "Event-Driven Structure",
    description: "以重大事件为节点推进故事，每个大事件重塑人物处境。适合动作片、灾难片、政治题材。",
    tags: ["通用", "电影", "动作"],
    acts: [
      { key: "act_1", title: "起因", purpose: "初始大事件，设定故事起点", range_label: "0% - 20%" },
      { key: "act_2", title: "推进", purpose: "连续事件推动升级与反转", range_label: "20% - 70%" },
      { key: "act_3", title: "高潮结局", purpose: "决定性事件与结局", range_label: "70% - 100%" }
    ],
    nodes: [
      ["event_1_setup", "act_1", "大事件1（设定故事起点）", true, { dramatic_function: "第一个大事件建立故事的初始动态平衡，同时投下改变一切的「石头」——此事件之后，旧秩序不可恢复", failure_modes: ["大事件1量级不足，没有真正改变故事格局", "事件只有外部影响，没有通过人物的具体反应被内化"] }],
      ["event_2_push", "act_2", "大事件2（推进/反转）", true, { dramatic_function: "第二个大事件将故事推入新阶段，通常包含一个颠覆事件1所建立假设的反转，迫使人物和观众重新评估局势", failure_modes: ["事件2只是事件1的量级升级，缺乏质的改变（没有真正的「反转」）", "事件与人物关系和主题的联系松散，感觉是随机的外部干扰"] }],
      ["event_3_escalate", "act_2", "大事件3（危机升级）", true, { dramatic_function: "第三个大事件将所有力量推向危机点，各方力量的对比在此被彻底改写，高潮不可避免地到来", failure_modes: ["事件3缺乏对之前事件的内在逻辑延续，感觉是独立的新冲突", "危机升级缺乏人物内心层面的同步升级"] }],
      ["event_climax", "act_3", "高潮事件", true, { dramatic_function: "所有事件驱动力在此汇聚，产生整个故事最具决定性的单一事件，此事件的结果决定了故事走向终局", failure_modes: ["高潮事件缺乏前面所有事件的充分积累，显得突兀", "高潮事件的戏剧性主要靠外部力量而非人物选择"] }],
      ["event_resolution", "act_3", "结局", true, { dramatic_function: "高潮事件的后果在人物和世界层面被充分呈现，故事回答了「这个世界经历了这些事件之后，最终成为了什么」", failure_modes: ["结局只处理外部后果，忽视了人物内心层面的结算", "结局太仓促，高潮事件的影响没有得到充分展现"] }]
    ]
  },

  // ─── 14. 短片集/章节式结构 ──────────────────────────────────────────
  {
    id: "anthology",
    name: "短片集/章节式结构",
    englishName: "Anthology/Chapter Structure",
    description: "由若干相对独立的故事单元组成，各章节有自身完整叙事，共同指向同一主题或通过隐形线索相连。",
    tags: ["剧集", "短片", "实验文艺"],
    acts: [
      { key: "chapter_1", title: "章节一", purpose: "第一个独立故事单元/主题", range_label: "按段数分配" },
      { key: "chapter_2", title: "章节二", purpose: "第二个独立故事单元", range_label: "按段数分配" },
      { key: "chapter_n", title: "章节…", purpose: "更多独立故事单元", range_label: "按段数分配" },
      { key: "convergence", title: "主题收束", purpose: "主题回收与隐形关联揭示", range_label: "尾段" }
    ],
    nodes: [
      ["chapter_1_hook", "chapter_1", "章节一钩子", true, { dramatic_function: "第一个章节的开篇钩子，必须在独立单元开始时快速建立本章的核心问题和情感吸引力", failure_modes: ["钩子太弱，单元开篇缺乏进入动力", "各章钩子设计模式雷同，失去了章节式结构的多样性优势"] }],
      ["chapter_1_payoff", "chapter_1", "章节一落点", true, { dramatic_function: "第一章节在自身内部完成叙事落点，同时埋下能与其他章节产生共鸣的主题种子", failure_modes: ["章节落点只处理本章内部逻辑，没有埋下跨章节的主题线索", "落点太封闭，观众无法感知到更大故事的存在"] }],
      ["chapter_2_hook", "chapter_2", "章节二钩子", true, { dramatic_function: "第二章节开篇以与第一章形成对照或互补的方式建立新的独立叙事入口", failure_modes: ["章节二钩子与章节一太相似，缺乏对比价值", "章节切换时没有建立「同一主题，不同视角」的感知"] }],
      ["chapter_2_payoff", "chapter_2", "章节二落点", true, { dramatic_function: "第二章节完成自身叙事落点，与第一章的落点形成有意义的对话关系（对照、互补或深化）", failure_modes: ["两章落点情感质地相同，缺乏章节间的对话关系", "落点设计忽视了与整体主题的联系"] }],
      ["thematic_echo", "chapter_n", "主题呼应段落", false, { dramatic_function: "在多个章节之间制造明确的主题呼应，让单独成立的章节开始形成整体共鸣，观众感受到「拼图正在成形」", failure_modes: ["主题呼应过于刻意，破坏了各章独立性", "呼应只停留在表面细节，没有深度的主题联系"] }],
      ["hidden_connection", "convergence", "隐形关联揭示", false, { dramatic_function: "揭示不同章节之间潜藏的叙事或主题联系，让观众惊喜地发现「原来这些看似独立的故事是同一个更大故事的不同侧面」", failure_modes: ["隐形联系揭示时缺乏震撼感，联系太表面", "联系是事后强行建立的，而非从一开始就精心设计的"] }],
      ["theme_closure", "convergence", "主题最终收束", true, { dramatic_function: "所有章节的主题线索在此汇聚，给出整部作品的最终主题陈述——不是单一章节的结论，而是所有故事合在一起所揭示的更深真理", failure_modes: ["主题收束只是对各章主题的总结，没有呈现新的更深层次", "收束过于说教，用台词直白陈述而非用场景体现"] }]
    ]
  },

  // ─── 15. 开放式/片段式结构 ──────────────────────────────────────────
  {
    id: "fragmented",
    name: "开放式/片段式结构",
    englishName: "Open/Fragmented Structure",
    description: "由独立意象/场景/感受片段构成，不强求线性叙事或明确结局，邀请观众自我拼接意义。",
    tags: ["实验文艺", "短片"],
    acts: [
      { key: "fragments", title: "片段铺陈", purpose: "独立意象与感受片段的自由组合", range_label: "主体部分" },
      { key: "resonance", title: "意义空间", purpose: "主题氛围的开放性收束", range_label: "结尾段" }
    ],
    nodes: [
      ["fragment_a", "fragments", "片段A（意象/场景）", true, { dramatic_function: "第一个片段建立故事的情感基调和初始意象，为后续片段的对话或延伸提供参照点", failure_modes: ["第一个片段太普通，没有建立独特的氛围基调", "片段缺乏内部完整性，只是「未完成的片段」而非「意味深长的片段」"] }],
      ["fragment_b", "fragments", "片段B", true, { dramatic_function: "第二个片段以与片段A形成对照、延续或反差的方式存在，片段之间的空白由观众主动填充", failure_modes: ["片段B与片段A缺乏任何隐性联系，观众无法感受到整体", "片段之间的跳切太随意，开放性变成混乱"] }],
      ["fragment_c", "fragments", "片段C", false, { dramatic_function: "第三个片段深化主题氛围，或引入新的情感维度，丰富整体的意义空间", failure_modes: ["片段C重复了前两个片段的情感质地，缺乏新的维度", "片段数量过多，稀释了每个片段的意象密度"] }],
      ["fragment_d", "fragments", "片段D", false, { dramatic_function: "可选的第四片段，通常用于在到达开放性结局前制造最后一次情感共振或主题深化", failure_modes: ["片段D是多余的重复，而非有价值的补充", "四个片段中情感强弱分配不合理，顺序感不对"] }],
      ["open_ending", "resonance", "开放性结局/意义留白", true, { dramatic_function: "以一个具体但意义开放的意象或场景结束，这个结尾激活观众的主动解读，而非给出「答案」", failure_modes: ["开放性结局其实是「没有结局」，缺乏内在完整性", "结尾太封闭，违背了开放式结构的初衷"] }]
    ]
  },

  // ─── 16. 日记体/第一人称结构 ────────────────────────────────────────
  {
    id: "diary",
    name: "日记体/第一人称结构",
    englishName: "Diary/First-person Narrative Structure",
    description: "叙述者以个人视角展开，通过回忆与现时的交织呈现内心成长。适合成长题材、自传体、心理剧。",
    tags: ["角色驱动", "剧情", "成长"],
    acts: [
      { key: "act_present", title: "现时叙述", purpose: "叙述者当下视角与自白", range_label: "框架层" },
      { key: "act_past", title: "回忆展开", purpose: "关键往事事件的详细呈现", range_label: "主体" },
      { key: "act_synthesis", title: "成长收束", purpose: "回忆与现时融合，世界观演变", range_label: "尾段" }
    ],
    nodes: [
      ["narrator_voice", "act_present", "叙述者自白/心声", true, { dramatic_function: "建立叙述者当下的心理状态和叙述立场，同时激发观众对「过去发生了什么」的好奇；叙述者的当下视角应该暗示已经完成的成长", failure_modes: ["叙述者当下状态太模糊，缺乏鲜明的叙述人格", "自白太直白，剥夺了观众从回忆中自行发现的乐趣"] }],
      ["key_memory_1", "act_past", "关键事件回忆一", true, { dramatic_function: "第一段关键回忆建立过去时空的具体性，呈现一个塑造了叙述者核心人格的重要事件", failure_modes: ["回忆缺乏具体性，只是抽象的「发生了什么」", "回忆与叙述者当下状态的关联不够清晰"] }],
      ["present_action", "act_present", "现时行动节点", true, { dramatic_function: "叙述者当下采取一个具体行动，此行动受到我们刚看到的回忆的影响——两个时间层在此产生叙事共振", failure_modes: ["现时行动与回忆揭示的信息没有形成因果或共鸣关系", "现时线节奏过慢，观众沉浸在回忆层次无法回到现时"] }],
      ["key_memory_2", "act_past", "关键事件回忆二", true, { dramatic_function: "第二段回忆揭示一个比第一段更深刻或更复杂的事件，改变观众对叙述者成长轨迹的理解", failure_modes: ["第二次回忆的情感冲击力低于第一次，节奏下行", "回忆揭示的信息与叙述者当下的行为选择之间缺乏内在逻辑"] }],
      ["emotional_shift", "act_past", "情感/观点变化节点", true, { dramatic_function: "回忆中的一个关键时刻——叙述者过去的情感状态或世界观发生了重要转变，这是理解其成长轨迹的核心节点", failure_modes: ["情感转变发生得太快，缺乏足够的内部铺垫", "转变只通过叙述者的告知呈现，没有通过具体场景呈现"] }],
      ["worldview_change", "act_synthesis", "个人成长/世界观演变", true, { dramatic_function: "叙述者在现时时间线上完成最终的成长跨越，回忆中积累的所有体验在这一刻被整合为新的世界观", failure_modes: ["成长跨越缺乏回忆积累的充分支撑，显得突兀", "世界观演变太抽象，没有在具体行动或场景中落地"] }],
      ["closing_voice", "act_synthesis", "叙述者最终心声", false, { dramatic_function: "叙述者以成长后的视角发出最后的声音，与开篇的自白形成明确的情感弧线对照", failure_modes: ["结尾自白重复了开篇，没有体现成长带来的视角变化", "最终心声太直白总结，失去了第一人称结构的私密诗意"] }]
    ]
  },

  // ─── 17. 并行蒙太奇结构 ─────────────────────────────────────────────
  {
    id: "parallel_montage",
    name: "并行蒙太奇结构",
    englishName: "Parallel Montage Structure",
    description: "两条或以上故事线同步推进，通过节奏交错与对照制造张力，多线在高潮处汇聚共振。",
    tags: ["多线", "电影", "动作"],
    acts: [
      { key: "parallel_build", title: "双线平行建立", purpose: "两条故事线分别起步并独立推进", range_label: "0% - 65%" },
      { key: "convergence", title: "汇聚高潮", purpose: "多线交错加速，共振爆发", range_label: "65% - 100%" }
    ],
    nodes: [
      ["line_1_setup", "parallel_build", "故事线1建立", true, { dramatic_function: "建立第一条故事线的独立逻辑和情感投入点，同时暗示与第二条线潜在的张力或联系", failure_modes: ["故事线1建立太长，第二条线迟迟不来，单线化趋势"] }],
      ["line_2_setup", "parallel_build", "故事线2建立", true, { dramatic_function: "建立第二条故事线，其风格、节奏或主题应与第一条形成有意义的对照，让并行结构本身产生意义", failure_modes: ["故事线2只是故事线1的弱化版，缺乏独立价值", "两线的建立顺序安排不当，观众对第二线的情感投入不足"] }],
      ["line_1_develop", "parallel_build", "故事线1推进", true, { dramatic_function: "第一条线以自己的节奏向前推进，同时开始感知第二条线的存在（即使未直接接触）", failure_modes: ["推进只是内部升级，完全不受第二条线的影响", "节奏与第二条线完全同步，失去并行的对话价值"] }],
      ["line_2_develop", "parallel_build", "故事线2推进", true, { dramatic_function: "第二条线在中段积累足够的张力，通常节奏与第一条形成一快一慢、一紧一松的对比效果", failure_modes: ["两线在这个阶段节奏和张力都相同，交错剪辑显得单调", "第二条线内部发展逻辑自相矛盾"] }],
      ["intercut_tension", "parallel_build", "节奏交错/对照高压段", false, { dramatic_function: "利用两线的快速交错剪辑制造超越单线的压力感——交替的频率本身成为叙事张力的来源", failure_modes: ["交错剪辑只追求形式感，没有真正增加叙事张力", "交错过于频繁，观众来不及在任一线上积累情感"] }],
      ["lines_converge", "convergence", "多线汇聚节点", true, { dramatic_function: "两线在此产生真正的碰撞或交汇，这个节点之前的所有积累（两线各自的张力）在此同时爆发", failure_modes: ["汇聚节点缺乏对前面双线积累的有效利用", "汇聚后两线的化学反应弱于单线，多线结构的意义崩塌"] }],
      ["resonance_climax", "convergence", "共振高潮", true, { dramatic_function: "两线在汇聚后共同产生一个比任何单线都更大的高潮时刻，两线的主题在此共鸣并给出统一的情感落点", failure_modes: ["共振高潮实际上只有一条线在运作，另一条变成旁观者", "高潮后两线各自分别收尾，共振消失"] }]
    ]
  },

  // ─── 18. 24小时/实时结构 ────────────────────────────────────────────
  {
    id: "real_time",
    name: "24小时/实时结构",
    englishName: "Real-Time Structure",
    description: "故事在有限真实时间段内发生（一天内或接近实时），时间压力本身成为核心叙事驱动力。",
    tags: ["电影", "悬疑侦探", "动作"],
    acts: [
      { key: "hour_early", title: "起始时刻", purpose: "故事开始，初始局面建立", range_label: "开头段" },
      { key: "hour_mid", title: "中段推进", purpose: "随时间推进，紧迫感递升", range_label: "中段" },
      { key: "hour_final", title: "最终节点", purpose: "时间即将耗尽，一切收束", range_label: "结尾段" }
    ],
    nodes: [
      ["time_zero", "hour_early", "故事起始时刻", true, { dramatic_function: "清晰建立时间压力的基准：几点开始、有多少时间、如果时间耗尽会发生什么——时间本身成为故事的另一个「角色」", failure_modes: ["时间压力的后果没有被清晰化，「倒计时」缺乏真实感", "故事一开始就没有明确的时间线索，实时结构的张力无从建立"] }],
      ["time_push_1", "hour_early", "时间推进节点1", true, { dramatic_function: "明确标记时间的流逝，同时推进故事事件，让观众感受到「时间在减少，事件在累积」的双重压力", failure_modes: ["时间标记不明显，观众失去对剩余时间的感知", "时间推进节点只标记时间，没有同步推进故事事件"] }],
      ["time_complication", "hour_mid", "中段复杂化", true, { dramatic_function: "在时间压力的背景下引入新的复杂变量，让「有限时间内完成的任务」变得更加困难，压力从两个方向同步施加", failure_modes: ["复杂化与时间压力完全无关，忽视了实时结构的核心张力", "复杂化后时间的剩余量没有被重新强调"] }],
      ["time_push_2", "hour_mid", "时间推进节点2", true, { dramatic_function: "第二次时间推进标记，通常在时间过半时引发强烈的紧迫感，「还剩这么少时间」的意识需要在场景中被明确激活", failure_modes: ["第二次时间标记的情感冲击比第一次弱，紧迫感递减而非递增", "角色对时间减少的反应不够真实"] }],
      ["urgency_spike", "hour_mid", "紧迫升级节点", true, { dramatic_function: "时间压力与事件复杂度同时到达中段高峰，让观众强烈感受到「时间已经不够了」，为最终时刻的极限感做铺垫", failure_modes: ["紧迫升级节点不够明显，没有形成清晰的「情感加速」感", "角色在紧急情况下的行为决策不符合真实的高压心理"] }],
      ["final_moment", "hour_final", "最终时刻", true, { dramatic_function: "时间耗尽的前一刻，所有积累的张力在此汇聚；角色必须在极限时间压力下做出决定性选择", failure_modes: ["最终时刻缺乏前面积累的充分铺垫，张力显得突兀", "时间压力在最关键时刻被遗忘，变回了普通的决策场景"] }],
      ["time_closure", "hour_final", "时限内全部收束", true, { dramatic_function: "时限结束，所有未了的事在最后时刻得到处理，时间结构的「特殊性」在结尾被明确呼应——这个故事只能在这个时间窗口内发生", failure_modes: ["收束缺乏对实时结构独特性的回应，只是普通的结局", "重要线索在最后时刻没有得到处理，时限的压迫被浪费"] }]
    ]
  },

  // ─── 19. 三点转折法 ─────────────────────────────────────────────────
  {
    id: "three_point_turn",
    name: "三点转折法",
    englishName: "Three-Point Turning Structure",
    description: "设定→第一转折→第二转折→结局，用两次剧烈转变驱动故事进入新阶段，节奏紧凑明确，入门友好。",
    tags: ["通用", "电影", "短片"],
    acts: [
      { key: "setup", title: "设定", purpose: "介绍世界、角色和故事基线", range_label: "0% - 25%" },
      { key: "post_turn1", title: "第一转折后", purpose: "突发事件推动故事进入新阶段", range_label: "25% - 60%" },
      { key: "post_turn2", title: "第二转折后", purpose: "再次剧烈变化，推进到高潮或反转", range_label: "60% - 85%" },
      { key: "resolution", title: "结局", purpose: "问题解决，人物或世界有新变化", range_label: "85% - 100%" }
    ],
    nodes: [
      ["world_setup", "setup", "设定：世界与角色", true, { dramatic_function: "快速建立故事世界的基本规则和主要人物的初始状态，为两次转折提供充分的情感基础", failure_modes: ["设定阶段太长，故事张力起步太晚", "设定缺乏情感钩子，只是信息堆砌"] }],
      ["first_turning_point", "post_turn1", "第一转折点", true, { dramatic_function: "第一个剧烈改变：事件或信息将故事推入新阶段，使设定阶段建立的假设被颠覆，主角必须以新的方式行动", failure_modes: ["第一转折量级不足，故事方向改变不明显", "转折缺乏前面设定阶段的充分铺垫"] }],
      ["post_turn1_action", "post_turn1", "转折后行动", true, { dramatic_function: "主角在第一次转折后采取的行动段落，展示主角如何适应或应对新局面，同时积累第二次转折的动能", failure_modes: ["转折后行动只是过渡性填充，没有独立的戏剧价值", "行动段落节奏过慢，失去了第一转折的动能"] }],
      ["second_turning_point", "post_turn2", "第二转折点", true, { dramatic_function: "比第一次更剧烈的第二个转折，通常完全颠覆了第一次转折建立的新假设，将故事推向终局方向", failure_modes: ["第二转折比第一次弱，叙事节奏倒退", "第二转折与第一转折过于相似，缺乏新的质变"] }],
      ["climax_push", "post_turn2", "推向高潮", true, { dramatic_function: "在第二次转折的基础上，积累故事的终极张力，为最终解决设置最高门槛", failure_modes: ["向高潮推进的过程太短，缺乏足够的积累", "推进只是事件升级，没有同步推进角色的内心状态"] }],
      ["resolution_end", "resolution", "最终解决", true, { dramatic_function: "经历两次转折的故事在此完成最终的解决，呈现主角和世界在经历了这些变化后的最终状态", failure_modes: ["最终解决缺乏两次转折积累的厚度，显得草率", "解决只处理了一次转折引发的问题，另一次的影响被忽视"] }]
    ]
  },

  // ─── 20. 普罗普故事功能结构 ─────────────────────────────────────────
  {
    id: "propp",
    name: "普罗普故事功能结构",
    englishName: "Propp's Morphology of the Folktale",
    description: "弗拉基米尔·普罗普从民间故事提炼出的功能节点体系，适用于童话、神话、传统故事，功能可自由组合。",
    tags: ["冒险奇幻", "童话神话"],
    acts: [
      { key: "preparation", title: "准备阶段", purpose: "家庭设定、任务分配、警告与违禁", range_label: "0% - 25%" },
      { key: "core", title: "冒险核心", purpose: "恶人作恶、英雄离家、考验与奖励", range_label: "25% - 80%" },
      { key: "aftermath", title: "归来阶段", purpose: "英雄归来、揭露身份、幸福结局", range_label: "80% - 100%" }
    ],
    nodes: [
      ["family_setup", "preparation", "家庭成员/初始世界", true, { dramatic_function: "建立故事的初始家庭/社群世界，包括其内部秩序、每个成员的功能和已有的潜在矛盾", failure_modes: ["初始世界设定过于单薄，后续「恶人作恶」缺乏情感基础", "家庭/社群成员没有差异化，故事驱动力不足"] }],
      ["prohibition_violation", "preparation", "警告/禁令与违禁", false, { dramatic_function: "建立一个明确的「不可违反的规则」并呈现其被违反的时刻，为后续的恶意入侵或困境提供叙事逻辑", failure_modes: ["违禁行为的后果与后续困境缺乏直接逻辑联系", "警告/禁令设定得太模糊"] }],
      ["villainy", "core", "恶人作恶/初始困境", true, { dramatic_function: "恶人以具体行动打破世界秩序，制造英雄必须应对的核心困境——这个事件启动整个故事机器", failure_modes: ["恶人的行动后果对家庭/社群的冲击不够深刻", "困境的建立缺乏情感重量"] }],
      ["hero_departs", "core", "英雄离家出发", true, { dramatic_function: "英雄踏上解决困境的旅程，「离家」的时刻标志着英雄开始承担解决困境的个人使命", failure_modes: ["英雄出发缺乏充分的动机建立", "离家的代价（英雄失去的日常保护）没有被明确呈现"] }],
      ["donor_trial", "core", "考验/遇到授予者", true, { dramatic_function: "英雄通过一次考验证明其资格，从授予者处获得继续旅程所需的特殊工具或力量", failure_modes: ["考验与英雄的核心困境缺乏逻辑联系", "授予者角色没有自己的逻辑，只是「道具发放机」"] }],
      ["magical_agent", "core", "获得魔法力量/道具", false, { dramatic_function: "英雄获得将用于最终对抗的特殊能力或道具，这个获得必须有前因（考验或牺牲）", failure_modes: ["魔法能力/道具凭空出现，缺乏前因", "获得的东西在终局战斗中没有被真正使用"] }],
      ["villain_defeated", "core", "恶人被战胜", true, { dramatic_function: "英雄综合运用旅程中积累的一切（包括魔法道具），以直接对抗的方式战胜恶人，困境被根本性解决", failure_modes: ["战胜方式缺乏前面旅程积累的逻辑依据", "恶人被战胜的过程过于简单，与旅程付出的代价不成比例"] }],
      ["hero_returns", "aftermath", "英雄踏上归途", true, { dramatic_function: "英雄带着胜利和改变踏上回家的旅程，「归途」强调了旅程的完整闭环性质", failure_modes: ["归途被匆匆带过，失去了旅程闭环的仪式感", "英雄回归时的状态没有体现旅程带来的改变"] }],
      ["recognition", "aftermath", "英雄被认可", true, { dramatic_function: "英雄的功绩被其社群正式认可，社群秩序在新的基础上得到恢复，英雄的地位发生改变", failure_modes: ["认可场景缺乏情感重量，只是形式化的仪式", "认可与英雄完成的实际使命缺乏直接对应"] }],
      ["happy_ending", "aftermath", "幸福结局", true, { dramatic_function: "故事世界达到新的平衡，参与者的命运得到明确处理，确认了「秩序被恢复、正义得到伸张」的类型承诺", failure_modes: ["幸福结局没有体现旅程付出的代价和改变", "结局过于仓促，重要关系线没有得到处理"] }]
    ]
  },

  // ─── 21. 雪花法 ─────────────────────────────────────────────────────
  {
    id: "snowflake",
    name: "雪花法",
    englishName: "Snowflake Method",
    description: "从一句话概述出发，逐层扩展为完整剧本的递进式开发工具。适合初稿规划，每轮迭代都加深故事密度。",
    tags: ["通用", "方法论"],
    acts: [
      { key: "concept", title: "概念层", purpose: "一行概述与核心前提", range_label: "开发起点" },
      { key: "synopsis", title: "梗概层", purpose: "段落扩写与幕级梗概", range_label: "中层扩展" },
      { key: "detail", title: "细节层", purpose: "角色弧线与场景卡片序列", range_label: "细化阶段" }
    ],
    nodes: [
      ["one_line", "concept", "故事一行概述", true, { dramatic_function: "用一句话捕捉故事的核心前提——主角+目标+障碍+主题质感；这一行字必须能激发「我想知道更多」的欲望", failure_modes: ["一行概述只说明故事背景，没有呈现核心冲突", "一行概述太长，无法作为故事的「最小可测试单元」"] }],
      ["paragraph_expand", "concept", "一段扩写（引入/冲突/结局）", true, { dramatic_function: "将一句话扩展为三段落：第一段建立主角和处境，第二段呈现核心冲突，第三段暗示结局方向——每段都必须推进而非重复", failure_modes: ["三个段落情感质地雷同，缺乏叙事节奏的起伏", "结局暗示太明确，失去了扩展到完整稿的悬念空间"] }],
      ["act_outline", "synopsis", "三/五幕简要梗概", true, { dramatic_function: "为每一幕写出核心事件、主角状态和幕末转折，确认各幕的戏剧功能在故事整体中发挥了应有的作用", failure_modes: ["幕级梗概只是事件列表，没有包含人物内心状态的维度", "各幕之间的转折点不够清晰，叙事节奏感缺失"] }],
      ["character_arcs", "synopsis", "角色动机与弧线梳理", true, { dramatic_function: "为主要角色明确：起点状态、核心欲望/恐惧、关键转变节点、终点状态，确保角色弧光有内在逻辑", failure_modes: ["角色弧线只有外部事件节点，没有内心状态的追踪", "各角色弧线之间缺乏相互影响和冲突关系的设计"] }],
      ["scene_cards", "detail", "详细场景卡片序列", true, { dramatic_function: "将每一场景写成独立卡片：设置、目标、障碍、结果、情感价值变化，确保每个场景都有戏剧功能", failure_modes: ["场景卡片只记录事件，没有包含场景的戏剧功能", "大量场景没有明确的目标和结果，只是「发生了什么」"] }],
      ["detail_fill", "detail", "逐步填充细节至完整稿", false, { dramatic_function: "在场景卡片骨架上逐步填充对话、动作描述、感官细节，保持每次填充都在加强而非改变核心戏剧结构", failure_modes: ["填充细节时偏离了场景卡片确立的核心戏剧功能", "填充阶段引入大量新元素，破坏了结构的内在逻辑"] }]
    ]
  },

  // ─── 22. 分形/嵌套结构 ──────────────────────────────────────────────
  {
    id: "fractal",
    name: "分形/嵌套结构",
    englishName: "Fractal/Nested Structure",
    description: "主结构包含若干子结构，每个子结构自成起承转合，层层递进。适合多层主题、复杂关系、大型系列片。",
    tags: ["多线", "剧集", "系列片"],
    acts: [
      { key: "main_arc", title: "主结构（主线/主弧）", purpose: "整体故事的核心走向", range_label: "全片覆盖" },
      { key: "sub_arc_1", title: "子结构1（副线/副弧）", purpose: "嵌套在主线内的完整子故事", range_label: "嵌套层" },
      { key: "sub_arc_2", title: "子结构2（插曲/嵌套回忆）", purpose: "第二层嵌套故事单元", range_label: "嵌套层" }
    ],
    nodes: [
      ["main_start", "main_arc", "主线起点", true, { dramatic_function: "建立整体故事的主线起点，同时在宏观层面埋下所有嵌套子故事的主题种子", failure_modes: ["主线起点缺乏对嵌套结构的宏观考量，后续子线插入显得突兀", "主题种子埋得过于隐晦，子线出现时观众感受不到有机联系"] }],
      ["main_midpoint", "main_arc", "主线中点翻转", true, { dramatic_function: "主线在故事中间发生质变，这个转折通常也触发或影响了某条子线的关键变化，体现分形结构的同步性", failure_modes: ["主线中点只影响主线，与子线发展完全独立", "中点转折的量级不足以撼动整体叙事格局"] }],
      ["sub1_start", "sub_arc_1", "副线建立", true, { dramatic_function: "嵌套在主线内的第一条副线开始展开，其主题或人物逻辑应该是主线的某个维度的深化或折射", failure_modes: ["副线是完全独立的故事，与主线缺乏有机的主题联系", "副线的戏剧逻辑自相矛盾"] }],
      ["sub1_climax", "sub_arc_1", "副线自身高潮", true, { dramatic_function: "第一条副线在自身内部完成高潮，这个高潮通常与主线的某个关键节点形成共鸣或对照", failure_modes: ["副线高潮与主线节奏完全脱节，破坏整体叙事节奏", "副线在自身高潮后被遗忘，没有被整合回主线"] }],
      ["sub2_insert", "sub_arc_2", "嵌套插曲/回忆", false, { dramatic_function: "第二层嵌套（可选）提供另一个角度或时间维度，通常以插曲、回忆或内嵌故事的形式出现，为整体增加深度", failure_modes: ["第二层嵌套使叙事过于复杂，观众失去方向感", "嵌套层次缺乏清晰的功能区分，各层之间混乱"] }],
      ["fractal_convergence", "main_arc", "各层汇聚节点", true, { dramatic_function: "所有嵌套层次在此汇聚——主线、副线和嵌套插曲的力量在同一时刻共同作用，产生比任何单一层次都更大的共鸣效果", failure_modes: ["汇聚节点各层之间的关联太松散，没有真正产生共鸣", "汇聚节点只是时间上的同步，没有主题上的有机结合"] }],
      ["main_end", "main_arc", "主线收束", true, { dramatic_function: "主线在整合了所有嵌套层次的影响后，达到最终状态——结束必须体现整个分形结构的整体意义，而非只是主线自身逻辑的终点", failure_modes: ["主线收束忽视了副线和嵌套层的存在，分形结构的意义丧失", "结束场景信息量过大，无法在单一收束场景中处理所有层次"] }]
    ]
  },

  // ─── 23. 音乐剧本结构 ───────────────────────────────────────────────
  {
    id: "musical",
    name: "音乐剧本结构",
    englishName: "Musical Structure",
    description: "每首歌对应一个剧情节点，用歌曲推动叙事与情感。适合音乐剧、歌舞片，歌曲节点与剧情节点严格对齐。",
    tags: ["音乐", "歌舞"],
    acts: [
      { key: "act_1", title: "第一幕", purpose: "开场、人物欲望与初始情境建立", range_label: "0% - 50%" },
      { key: "act_2", title: "第二幕", purpose: "冲突激化、大歌与终曲", range_label: "50% - 100%" }
    ],
    nodes: [
      ["opening_number", "act_1", "开场号角（Opening Number）", true, { dramatic_function: "通过歌曲快速建立故事世界的规则、气氛和主要人物的初始状态——音乐比对话更快地传达情感基调", failure_modes: ["开场号角只是视觉奇观，没有推进任何叙事或人物信息", "风格与后续歌曲断裂，无法建立统一的音乐剧世界观"] }],
      ["i_want_song", "act_1", "主要人物歌（I Want Song）", true, { dramatic_function: "主角用歌曲直接陈述其核心欲望和当前处境，这首歌是主角整个旅程的情感基础和参照点", failure_modes: ["I Want Song的欲望太模糊，缺乏具体性和驱动力", "歌曲与主角的后续行动脱节，欲望只停留在表达层面"] }],
      ["relationship_song", "act_1", "关系/情感推进曲", false, { dramatic_function: "通过歌曲推进关键人物关系（通常是爱情或友谊），歌曲不只是情感表达，还应该改变关系的状态", failure_modes: ["关系歌曲只是「情感时刻」，没有真正改变关系动态", "歌曲叙事与对话叙事重复，只是情感的另一种形式"] }],
      ["reprise_ensemble", "act_2", "情感推进曲（Reprise/Ensemble）", false, { dramatic_function: "在第二幕的关键节点重复第一幕的主题曲或群像歌，但在改变的处境下呈现出截然不同的情感意义", failure_modes: ["Reprise只是音乐的重复，没有新的情感层次", "Ensemble场景各角色的声部没有真正反映其各自的叙事状态"] }],
      ["eleven_o_clock", "act_2", "冲突爆发曲（11点钟歌）", true, { dramatic_function: "在高潮前的关键时刻，通过最强烈的单人或双人曲呈现角色的内心决战——这首歌通常是整部剧中情感强度最高的时刻", failure_modes: ["11点钟歌的情感强度达不到全剧最高，无法作为情感高潮", "歌曲内容与之前的叙事积累脱节，情感爆发缺乏说服力"] }],
      ["finale_song", "act_2", "终曲（Finale）", true, { dramatic_function: "以歌曲完成整个故事的情感落点，通常回应开场号角或I Want Song，以音乐的方式呈现主角的弧光完成", failure_modes: ["终曲只是形式上的收尾，没有完成情感弧光的落地", "终曲主题与开场/I Want Song缺乏有意义的呼应"] }]
    ]
  },

  // ─── 24. 片段拼贴/意象流结构 ────────────────────────────────────────
  {
    id: "montage_collage",
    name: "片段拼贴/意象流结构",
    englishName: "Montage/Collage Structure",
    description: "由独立意象片段拼贴而成，跨越时空与主题，整体氛围大于线性故事。先锋文艺、诗性影像常用。",
    tags: ["实验文艺", "短片"],
    acts: [
      { key: "collage_flow", title: "意象流", purpose: "意象片段的自由流动与主题积累", range_label: "主体" }
    ],
    nodes: [
      ["image_fragment_a", "collage_flow", "意象片段A", true, { dramatic_function: "第一个意象片段建立整部作品的初始感官质地和情感基调，引导观众进入「意象流」的接收模式", failure_modes: ["第一个片段太概念化，没有建立足够具体的感官入口", "片段缺乏内部完整性，只是「不完整画面」而非「充满意义的片段」"] }],
      ["image_fragment_b", "collage_flow", "意象片段B", true, { dramatic_function: "第二个意象片段以与A形成对话的方式存在——延续、反转或深化A的情感质地，两个片段之间的「空白」是意义产生的场所", failure_modes: ["片段B与片段A缺乏任何隐性对话关系", "拼贴的逻辑过于清晰，变成了线性叙事的伪装"] }],
      ["image_fragment_c", "collage_flow", "意象片段C", false, { dramatic_function: "第三个意象片段引入新的情感维度或主题层次，使拼贴不只是双线对话，而是多声部的复调结构", failure_modes: ["片段C是多余的重复，稀释了前两个片段的意象密度", "意象数量过多，观众的感知能力被超载"] }],
      ["thematic_echo_1", "collage_flow", "主题氛围回响1", false, { dramatic_function: "对前面出现过的意象或情感进行有意义的回响——不是重复，而是在不同语境下的再现，制造共鸣", failure_modes: ["回响过于字面，变成了意象的机械重复", "回响的时机不对，打断了意象流的自然节律"] }],
      ["thematic_echo_2", "collage_flow", "主题氛围回响2", false, { dramatic_function: "第二次回响通常深化或修正第一次回响，让整部作品的主题氛围在结尾前达到最大密度", failure_modes: ["两次回响内容和功能重复，缺乏层次", "回响太频繁，破坏了意象流的开放性"] }],
      ["open_resonance", "collage_flow", "开放性意义共鸣", true, { dramatic_function: "以一个具体但意义开放的意象作为结束，激活观众的主动解读，整部作品的意义在「余音」中浮现", failure_modes: ["结尾太封闭，违背了拼贴结构的开放性初衷", "结尾片段的内在意义太模糊，只是「随机收尾」而非「有意义的留白」"] }]
    ]
  },

  // ─── 25. 循环往复结构 ───────────────────────────────────────────────
  {
    id: "looping",
    name: "循环往复结构",
    englishName: "Looping/Time Loop Structure",
    description: "主角困在反复循环的时间/事件中，每次循环带来新信息或微小变化，直至破圈或陷入永恒循环。",
    tags: ["科幻", "冒险奇幻", "悬疑侦探", "电影"],
    acts: [
      { key: "first_loop", title: "首次循环", purpose: "建立循环规则，展示初始困境", range_label: "0% - 25%" },
      { key: "middle_loops", title: "循环变体", purpose: "每次循环新信息、尝试与失败", range_label: "25% - 80%" },
      { key: "breakout", title: "破圈/终局", purpose: "打破循环或接受永恒循环", range_label: "80% - 100%" }
    ],
    nodes: [
      ["loop_origin", "first_loop", "循环起点事件", true, { dramatic_function: "建立「循环」的初始状态——主角的处境、循环前发生了什么、以及第一次重置时观众感受到的困惑和震惊", failure_modes: ["循环起点没有让观众感受到「规则改变了」的震惊", "初始循环的建立太模糊，观众无法理解循环的范围和边界"] }],
      ["loop_rules_reveal", "first_loop", "循环规则揭示", true, { dramatic_function: "明确循环的运作规则：重置点在哪里、什么会被保留（记忆？物品？）、什么会被抹去——规则必须清晰一致", failure_modes: ["规则揭示太晚，前期循环让观众感到困惑而非神秘", "规则在故事推进中随意变动，失去内在逻辑"] }],
      ["loop_attempt_1", "middle_loops", "第N次循环（尝试1）", true, { dramatic_function: "主角用第一次循环获得的信息进行新的尝试，每次尝试都应该以新的方式失败或产生新的后果，推进主角对「为何被困」的理解", failure_modes: ["每次循环的尝试本质上是同一个策略，缺乏真正的进展", "循环数量过多，观众失去了对「进展」的感知"] }],
      ["new_info_discovery", "middle_loops", "新信息/关键线索发现", true, { dramatic_function: "主角在某次循环中发现了改变一切的关键信息，这个发现必须有内在逻辑（主角做了某件不同的事才能发现）", failure_modes: ["关键信息的发现太随机，缺乏主角努力和成长的因果", "发现的信息与破圈的最终方案缺乏直接逻辑联系"] }],
      ["loop_attempt_2", "middle_loops", "第N+1次循环（变体）", true, { dramatic_function: "利用新发现的信息进行更接近破圈的尝试，但通常以一种新的、更接近根本原因的方式失败——每次失败都在缩小问题范围", failure_modes: ["「更接近破圈」的尝试缺乏真实进展感，观众对破圈可能性产生怀疑", "这次尝试的失败与之前失败本质上相同，没有新学到什么"] }],
      ["breakthrough_moment", "breakout", "破圈关键时刻", true, { dramatic_function: "主角找到并运用整个循环旅程中积累的全部认知，在一次关键的内在或外在改变后实现突破——破圈必须来自主角的成长，而非随机运气", failure_modes: ["破圈方式与主角在循环中的学习旅程缺乏直接关联", "破圈来自外部干预而非主角内在成长"] }],
      ["loop_resolution", "breakout", "永久破圈或接受结局", true, { dramatic_function: "故事的最终状态：主角永久脱离循环并回应了「为何被困的根本原因」，或以某种有意义的方式接受了永恒循环的命运", failure_modes: ["破圈后的状态没有回答「为何被困」的根本问题", "接受永恒循环的结局缺乏足够的情感重量和主题意义"] }]
    ]
  },

  // ─── 26. 诗性结构 ───────────────────────────────────────────────────
  {
    id: "poetic",
    name: "诗性结构",
    englishName: "Poetic Structure",
    description: "以主题句/母题为核心，通过诗化画面、自由联想和意象反复强化构建叙事。重氛围、轻叙事逻辑。",
    tags: ["实验文艺", "短片"],
    acts: [
      { key: "motif_intro", title: "意象铺陈", purpose: "主题句与核心意象的建立", range_label: "前段" },
      { key: "motif_deepen", title: "主题深化", purpose: "意象与情感的反复强化", range_label: "主体" },
      { key: "poetic_closure", title: "诗性收束", purpose: "主题句回归，情感/哲理落点", range_label: "尾段" }
    ],
    nodes: [
      ["motif_statement", "motif_intro", "主题句（Motif）引入", true, { dramatic_function: "建立作品的核心母题——一个意象、一个问题或一种情感——这个母题将在整部作品中反复回响并不断深化", failure_modes: ["母题太抽象，观众无法在具体感官层面抓住它", "母题与后续场景缺乏有机联系，只是开篇的装饰性引用"] }],
      ["poetic_scene_1", "motif_intro", "诗化画面/象征场景1", true, { dramatic_function: "第一个具体的诗化场景让母题在感官层面得到体现——这个场景不只是「美丽的画面」，而是承载了母题的象征意义", failure_modes: ["诗化场景只追求视觉美感，缺乏象征意义的深度", "场景与母题的联系太概念化，观众无法感性感知"] }],
      ["free_association", "motif_deepen", "自由联想段落", false, { dramatic_function: "允许叙事暂时脱离线性逻辑，通过意识流或自由联想深化母题的情感维度，拓宽作品的意义空间", failure_modes: ["自由联想失控，变成真正的无意义随机内容", "联想段落与整体母题缺乏内在联系，只是形式上的技法展示"] }],
      ["emotion_reinforce", "motif_deepen", "情感/意象反复强化", true, { dramatic_function: "通过重复出现但每次都略有变化的意象或情感，逐渐加深母题在观众内心的积累，让意义在「似曾相识」中不断深化", failure_modes: ["重复过于机械，没有变化的重复变成无意义的套路", "强化的频率过高，稀释了每次出现的冲击力"] }],
      ["philosophical_beat", "motif_deepen", "哲理层反射点", false, { dramatic_function: "在某个场景或意象中，母题的哲理维度被短暂地直接呈现——不是说教，而是一个让观众停顿并思考的瞬间", failure_modes: ["哲理层被过度说明，变成直白的主题陈述", "哲理层与感官层脱节，显得空洞"] }],
      ["motif_return", "poetic_closure", "主题句归来", true, { dramatic_function: "母题在经历了整部作品的深化和复杂化后，以一种被改变了意义的方式回归——观众用新的理解重新经历了它", failure_modes: ["母题的归来只是机械重复开篇，没有意义层次的升华", "归来时机不对，打断了诗性结构的自然收束"] }],
      ["poetic_end", "poetic_closure", "诗性落点", true, { dramatic_function: "以一个具体而余味深长的画面或场景为整部作品画上句号，让情感和意义在余韵中继续发酵", failure_modes: ["落点太封闭，给出了明确答案，剥夺了诗性结构应有的开放空间", "落点缺乏与全篇母题的最终联系，只是形式上的收尾"] }]
    ]
  },

  // ─── 27. 任务型结构 ─────────────────────────────────────────────────
  {
    id: "quest",
    name: "任务型结构",
    englishName: "Quest Structure",
    description: "围绕明确任务/目标展开，组队→行动→阻碍→达成或失败。人物关系随任务推进变化，适合冒险、侦破、团队故事。",
    tags: ["冒险奇幻", "动作", "悬疑侦探"],
    acts: [
      { key: "quest_setup", title: "任务建立", purpose: "接受任务、组建团队与初始计划", range_label: "0% - 20%" },
      { key: "quest_execute", title: "执行与阻碍", purpose: "推进任务，遭遇层层阻碍", range_label: "20% - 75%" },
      { key: "quest_end", title: "任务结局", purpose: "达成目标或失败反转，关系收束", range_label: "75% - 100%" }
    ],
    nodes: [
      ["quest_assigned", "quest_setup", "收到任务/目标确立", true, { dramatic_function: "任务被清晰地确立——是什么任务、赌注是什么、为何必须完成——任务的清晰度决定了后续所有障碍的有效性", failure_modes: ["任务目标太模糊，观众无法判断何时成功、何时失败", "任务赌注太低，观众对任务结果缺乏真实的情感投入"] }],
      ["team_assemble", "quest_setup", "组队/分工", true, { dramatic_function: "团队成员各自的能力、个性和内在动机被建立，同时埋下团队内部的潜在摩擦点——分工要为后续的「信任考验」提供基础", failure_modes: ["团队成员只有技能分工，没有个性差异，群像人物单薄", "组队过于顺畅，缺乏初始的关系张力"] }],
      ["first_obstacle", "quest_execute", "第一道障碍", true, { dramatic_function: "第一个真实的阻碍测试团队的初始假设——计划的某个部分失效，团队必须即时调整，展示任务世界的真实复杂性", failure_modes: ["第一个障碍太容易被克服，没有展示任务世界的危险性", "障碍只考验团队的技术能力，没有考验团队关系"] }],
      ["complications", "quest_execute", "困难重重/关系考验", true, { dramatic_function: "多重并发的困难同时施压，并开始考验团队成员之间的信任——压力应该揭示出每个人的真实价值观和优先级", failure_modes: ["困难只是外部障碍的堆叠，没有触发团队内部的关系张力", "团队关系考验的设计与任务本身缺乏内在联系"] }],
      ["critical_challenge", "quest_execute", "核心难关", true, { dramatic_function: "整个任务过程中最大的单一挑战，通常同时考验技术能力和团队关系，需要团队以某种超预期的方式应对", failure_modes: ["核心难关的量级与之前障碍相差不大，缺乏「终极考验」的感觉", "应对方式完全依赖运气或意外，缺乏团队实力和成长的体现"] }],
      ["quest_climax", "quest_end", "达成目标或失败反转", true, { dramatic_function: "任务结果在此明确——无论是成功、失败、还是以意想不到的方式完成，结果必须对团队关系和每个成员的弧光有具体影响", failure_modes: ["任务结果对人物关系没有任何影响，团队成员在完成后与开始前相同", "失败或反转缺乏前面所有铺垫的必然性"] }],
      ["relationship_aftermath", "quest_end", "人物关系成长收束", false, { dramatic_function: "在任务结果之后，呈现团队成员各自关系在经历了这次任务后的最终状态——任务结束，但关系的改变是永久的", failure_modes: ["关系收束太快太草率，没有充分体现任务对人物的改变", "只关注任务成败，完全忽视了人物关系层面的收束"] }]
    ]
  },

  // ─── 28. 嵌套梦境/多重现实结构 ──────────────────────────────────────
  {
    id: "nested_dream",
    name: "嵌套梦境/多重现实结构",
    englishName: "Nested Dream/Multiple Reality Structure",
    description: "现实与梦境/幻想交替嵌套，真假交错。观众与角色共同面对「什么是真实」的核心困境。",
    tags: ["科幻", "悬疑侦探", "心理", "电影"],
    acts: [
      { key: "reality_layer", title: "现实层", purpose: "外层现实的框架与基准建立", range_label: "框架层" },
      { key: "dream_layer", title: "梦境/幻想层", purpose: "内层世界的展开与深化", range_label: "核心层" },
      { key: "revelation_layer", title: "真相收束", purpose: "多重现实的碰撞与最终答案", range_label: "尾段" }
    ],
    nodes: [
      ["reality_baseline", "reality_layer", "现实层基准建立", true, { dramatic_function: "建立外层「现实」的基准规则——这是观众判断「什么是真实」的初始参照系，必须足够具体，后来的模糊化才有意义", failure_modes: ["现实层建立不够清晰，后续模糊化失去了参照系的对照价值", "「现实」太过普通，没有任何「也许不那么真实」的暗示种子"] }],
      ["enter_dream", "dream_layer", "进入梦境/幻想层", true, { dramatic_function: "清晰但不过于突兀地呈现「进入另一层现实」的时刻，让观众和主角一起体验规则变化的感知冲击", failure_modes: ["进入内层的时刻太模糊，观众无法确认层次切换", "内层世界与外层世界差异不够显著，多重现实结构的意义减弱"] }],
      ["dream_deeper", "dream_layer", "层层递进节点", false, { dramatic_function: "如果有多层嵌套，每一层进入都应该加深「什么是真实」的困惑，同时提供一个新的视角或信息", failure_modes: ["嵌套层次过多，观众失去方向感", "每层的规则差异不明确，层次间的区别感消失"] }],
      ["reality_dream_blur", "dream_layer", "真假交错时刻", true, { dramatic_function: "内外层的边界开始模糊，主角（和观众）无法确定自己在哪一层现实中——这是多重现实结构最核心的戏剧时刻", failure_modes: ["模糊时刻处理太简单，观众依然能轻易区分两层", "模糊导致叙事混乱而非有意义的认知困境"] }],
      ["cross_layer_echo", "dream_layer", "穿插回溯/层间呼应", false, { dramatic_function: "不同层次之间出现有意义的呼应——相似的场景、台词或意象在不同层次出现，制造「这些层次之间有深刻联系」的感知", failure_modes: ["层间呼应过于刻意，破坏了多重现实的自然感", "呼应的内容在情感或主题上缺乏深度意义"] }],
      ["final_reality_question", "revelation_layer", "「什么是真实」核心抛出", true, { dramatic_function: "整部作品的核心哲学问题在此被直接、无法回避地抛出——不是「解答」，而是让这个问题以最强烈的形式出现在主角和观众面前", failure_modes: ["问题被过于直白地说出，失去了多重现实结构应有的哲学深度", "问题抛出缺乏前面所有层次积累的充分铺垫"] }],
      ["multi_ending", "revelation_layer", "多重结局/破层归来", true, { dramatic_function: "以破层回归（明确选择了某个层次）或多重结局并置（允许观众自行选择）作为结束——两种方式都必须有内在的情感逻辑，而非技巧性的噱头", failure_modes: ["多重结局只是形式噱头，每个结局都没有足够的情感重量", "破层回归太简单，没有体现主角在这个过程中的真实成长"] }]
    ]
  },

  // ─── 29. 线性解谜结构 ───────────────────────────────────────────────
  {
    id: "linear_mystery",
    name: "线性解谜结构",
    englishName: "Linear Mystery Structure",
    description: "案件设定→线索铺设→调查推进→推理高潮→真相揭晓，是侦探片、悬疑片、推理剧的经典范式。",
    tags: ["悬疑侦探", "电影", "剧集"],
    acts: [
      { key: "case_setup", title: "案件建立", purpose: "谜题/案件出现，主角卷入调查", range_label: "0% - 20%" },
      { key: "investigation", title: "调查推进", purpose: "线索发现、嫌疑人浮现、逐步深入", range_label: "20% - 75%" },
      { key: "deduction", title: "推理解局", purpose: "真相拼图完成，最终揭示", range_label: "75% - 100%" }
    ],
    nodes: [
      ["crime_scene", "case_setup", "案件/谜题设定", true, { dramatic_function: "第一现场必须同时呈现足够的「可见线索」和「误导性细节」，让观众与主角一起进入解谜状态——这不只是展示谜题，而是邀请观众参与", failure_modes: ["第一现场只呈现谜题，没有足够的可见线索供观众推理", "现场缺乏视觉冲击或情感重量，案件的严重性没有被建立"] }],
      ["detective_intro", "case_setup", "侦探/调查者卷入", true, { dramatic_function: "调查者卷入案件的原因必须具有内在逻辑（为何是这个人、为何必须调查），同时建立调查者的能力和局限，确立其独特的推理视角", failure_modes: ["调查者卷入的理由太随意，缺乏「命中注定」的必然感", "调查者的独特性（为何是他而非其他人）没有被清晰建立"] }],
      ["clue_1", "investigation", "嫌疑线索一", true, { dramatic_function: "第一条真实线索既要推进调查，又要与后面的误导线索形成对比——观众对线索的「排名」的感知是悬疑类型的核心体验", failure_modes: ["线索缺乏具体性，只是模糊的「可疑迹象」", "线索太容易被解读，没有留下多种可能性的解读空间"] }],
      ["clue_2", "investigation", "嫌疑线索二", true, { dramatic_function: "第二条线索与第一条产生意义上的互动——可以互相支持、互相矛盾，或指向完全不同的方向，推动「嫌疑人范围缩小或扩大」", failure_modes: ["两条线索本质上指向同一个方向，缺乏悬疑感", "线索之间的关系没有被通过主角的推理过程呈现"] }],
      ["red_herring", "investigation", "误导/假线索", false, { dramatic_function: "一个看似有力但实际上将调查引向错误方向的误导，误导必须有内在合理性——基于已知信息的合理误判，而非纯粹欺骗观众", failure_modes: ["误导太明显，观众一眼看穿是假线索，失去效果", "误导被揭穿后，没有解释清楚为何它会误导（事后逻辑不自洽）"] }],
      ["investigation_complication", "investigation", "调查遇阻/新转折", true, { dramatic_function: "调查进入最复杂阶段——新信息颠覆了之前的假设，嫌疑人格局重组，或一个关键线索被毁灭/消失，主角必须以新方式继续", failure_modes: ["转折只是增加一个新嫌疑人，没有真正颠覆调查框架", "调查遇阻让主角停滞太久，悬疑节奏下行"] }],
      ["deduction_climax", "deduction", "推理高潮", true, { dramatic_function: "主角将所有线索整合，进行最终推理——这个过程必须让观众能够跟上（所有关键信息之前都已呈现），同时推理结论让观众感到意外", failure_modes: ["推理中使用了之前没有向观众呈现过的信息，感觉像「作弊」", "推理过程太长太复杂，观众在过程中失去兴趣和理解"] }],
      ["truth_reveal", "deduction", "真相揭晓", true, { dramatic_function: "真相同时满足「意外性」（没想到是这样）和「必然性」（回看所有线索都指向这里），真相揭示后必须让观众感到「原来如此，一切都对了」", failure_modes: ["真相缺乏意外性，观众早已猜到", "真相缺乏必然性，回看线索逻辑不自洽，感觉像随机决定"] }],
      ["aftermath", "deduction", "案件收场与影响", false, { dramatic_function: "案件揭晓后的世界状态——正义是否实现？代价是什么？主角和相关人物的处境如何改变？—— 良好的收场给解谜增加了道德和情感的重量", failure_modes: ["收场只是交代凶手的命运，没有处理案件对相关人物的深层影响", "收场太草率，剥夺了真相揭示之后本应有的情感落地时间"] }]
    ]
  }
];
