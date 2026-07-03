# 编剧资料库系统设计文档

版本：v1.0
面向：技术实现
日期：2026-03-29

---

## 一、总体定位

编剧资料库不是一个"参考文献集"，而是 AI 主导剧本创作时的**知识骨架**。

它要解决的核心问题：

1. AI 在创作过程中调用的知识是碎片化的，资料库让这些知识**结构化可查询**。
2. 不同类型、不同结构、不同风格的故事需要不同约束，资料库让这些约束**可配置、可组合**。
3. 资料库不只是读写库，它要**主动参与**创作决策——提示缺失桥段、警告类型违规、验证角色功能。

与现有系统的关系：

- 现有的 `storyStructureLibrary.js`（29 个结构）是资料库的**结构层子集**，需要扩充到完整规格。
- 现有的 `rules-v1.json`（12 条规则）是资料库的**规则引擎子集**，需要与类型规范联动。
- 现有的 `story-bible-template-v1.json` 是单项目层，资料库是**跨项目共享层**。

---

## 二、资料库整体架构

```
编剧资料库
├── L1 结构层        叙事结构模板、节拍表、幕间转折模式
├── L2 类型层        类型规范、承诺清单、必备场景、禁忌规则
├── L3 角色层        原型库、弧光模式、角色功能配置
├── L4 情节层        情节机制、冲突类型、解决路径
├── L5 场景层        场景类型、戏剧化方式、转场模式
├── L6 对白层        对白风格、潜台词技巧、声音区分
├── L7 世界观层      世界规则框架、一致性检查清单
└── L8 参考层        参考剧本索引、可复用模式提取
```

每层的数据都以**独立 JSON 集合**存储，层间通过 `id` 引用，不直接嵌套。

---

## 三、L1 结构层

### 3.1 设计目标

结构层管理所有宏观叙事框架。现有系统已有 29 个结构，但数据只描述"幕和节点"，缺少：

- 每个节点的**戏剧目标**（这一节点要完成什么功能）
- 节点之间的**依赖关系**（B 节点成立的前提是 A 节点完成了什么）
- 节点的**失败模式**（这个节点常见的写坏方式）
- 与**类型层**的联动接口（不同类型对同一节点的特殊要求）

### 3.2 扩充后的节点数据结构

```json
{
  "id": "save_the_cat_midpoint",
  "structure_id": "save_the_cat",
  "slot": "midpoint",
  "label": "中点",
  "position_hint": "55%",
  "act": "act_2a",
  "required": true,
  "dramatic_function": "让主角从被动转向主动，或从表面胜利转向真实危机",
  "prerequisite_slots": ["break_into_two", "fun_and_games"],
  "failure_modes": [
    "只是一个普通场景，没有明确的价值翻转",
    "主角依然完全被动",
    "与高潮提前重叠，导致后段失去张力"
  ],
  "genre_overrides": {
    "romance": "情侣关系达到表面最近，但根本障碍尚未解决",
    "thriller": "主角第一次真正理解了对手的实力或真实目的",
    "horror": "主角第一次看到了真正的威胁，无路可退"
  },
  "ai_prompt_hint": "请确认这一节点的场景让主角的处境发生了方向性转变，而非仅仅是新信息的披露。"
}
```

### 3.3 节拍表独立对象

节拍表（Beat Sheet）和结构模板分离存储：

- **结构模板**：定义幕的划分和权重（现有 storyStructureLibrary.js 已有）
- **节拍表**：定义具体节点，可以"叠加"在结构模板上

这样用户可以用"三幕结构 + Save the Cat 节拍覆层"，也可以"四幕结构 + 自定义节拍"。

### 3.4 幕间转折点模式库

独立收录常见的幕间转折设计模式：

| 模式 ID | 名称 | 描述 | 适用类型 |
|---|---|---|---|
| `turn_revelation` | 揭示型转折 | 新信息彻底改变局面 | 悬疑、惊悚 |
| `turn_decision` | 决定型转折 | 主角做出不可逆选择 | 所有类型 |
| `turn_loss` | 失去型转折 | 主角失去重要的人/物/信念 | 悲剧、成长 |
| `turn_deception` | 欺骗型转折 | 盟友变对手，或信任被摧毁 | 惊悚、犯罪 |
| `turn_mirror` | 镜像型转折 | 主角看到了自己真实的面目 | 角色驱动 |
| `turn_escalation` | 升级型转折 | 赌注突然变大，不再只是个人问题 | 动作、灾难 |

---

## 四、L2 类型层（最高优先级）

类型层是整个资料库中**对 AI 约束力最强**的一层。

### 4.1 类型层的作用

- 类型决定**观众与故事的隐性契约**：什么必须有，什么绝对不能有
- 类型决定**节奏偏好**：信息揭示速度、情绪密度、高潮形态
- 类型决定**角色功能配置**：哪些角色原型是必须的，哪些是可选的
- 类型决定**必备场景清单**（Obligatory Scenes）

### 4.2 顶层类型目录

主类型（`genre_primary`）：

```
爱情片 / romance
悬疑片 / mystery
惊悚片 / thriller
恐怖片 / horror
动作片 / action
犯罪片 / crime
成长片 / coming_of_age
家庭片 / family_drama
历史片 / historical
科幻片 / sci_fi
奇幻片 / fantasy
喜剧片 / comedy
灾难片 / disaster
战争片 / war
传记片 / biopic
```

副类型（`genre_secondary`）可与主类型自由组合，例如"爱情 + 喜剧"、"科幻 + 惊悚"。

### 4.3 单个类型规范的完整结构

以**爱情片**为例：

```json
{
  "id": "romance",
  "label": "爱情片",
  "tagline": "两个人克服障碍走到一起（或分开）",
  "audience_promise": "观看者期待见证情感靠近、真实的阻碍、以及令人满足或令人心碎的结局",
  "core_emotion": "向往、甜蜜、痛苦、释然",
  "obligatory_scenes": [
    {
      "id": "rom_meet",
      "label": "相遇场景",
      "required": true,
      "notes": "两人的首次相遇必须具有戏剧张力或意外性，奠定关系基调"
    },
    {
      "id": "rom_first_date",
      "label": "第一次靠近",
      "required": true,
      "notes": "两人之间第一个真正的情感连接时刻"
    },
    {
      "id": "rom_obstacle_reveal",
      "label": "障碍揭示",
      "required": true,
      "notes": "使两人无法在一起的核心障碍必须被明确呈现，而不是模糊存在"
    },
    {
      "id": "rom_false_victory",
      "label": "虚假胜利",
      "required": false,
      "notes": "两人短暂以为障碍已经解决，但随即更深的危机出现"
    },
    {
      "id": "rom_separation",
      "label": "分离时刻",
      "required": true,
      "notes": "真正的情感危机点，两人处于最远的状态"
    },
    {
      "id": "rom_grand_gesture",
      "label": "主动跨越",
      "required": true,
      "notes": "其中一方（或双方）主动打破障碍的行动，必须有真实代价"
    },
    {
      "id": "rom_resolution",
      "label": "关系收束",
      "required": true,
      "notes": "明确的情感落地，无论结局是在一起、分开还是开放式"
    }
  ],
  "forbidden_patterns": [
    "主角因为误解而不沟通超过两场戏，但没有明确的内部原因",
    "障碍只靠对话消解，没有任何行动代价",
    "结局完全依赖巧合而非角色主动选择",
    "对手（情敌/家庭阻力等）单纯邪恶，没有合理立场"
  ],
  "pacing_profile": {
    "act_1_density": "中等，重点建立关系起点和角色吸引力基础",
    "act_2_pattern": "靠近-拉远-靠近，节奏呈波浪形",
    "climax_shape": "情感决定性时刻，不需要物理动作高潮",
    "ideal_scene_length": "中等，对话戏比例较高"
  },
  "required_character_archetypes": ["protagonist_lover", "love_interest", "confidant"],
  "optional_character_archetypes": ["rival", "wise_elder", "comic_relief"],
  "tone_range": ["轻喜剧浪漫", "苦涩现实主义", "史诗悲恸"],
  "genre_blends": {
    "romance_comedy": "障碍更多来自误解和性格冲突，节奏更快，结局几乎确定是在一起",
    "romance_drama": "障碍更多来自外部现实，情感更沉，结局可以开放",
    "romance_thriller": "爱情关系本身成为危险来源，信任感持续受到威胁"
  }
}
```

### 4.4 悬疑片示例（展示类型差异）

```json
{
  "id": "mystery",
  "label": "悬疑片",
  "tagline": "主角调查一个谜题，真相在最后揭晓",
  "audience_promise": "观看者期待公平的线索投放、令人惊喜但合理的真相、以及真凶受到应有的结局",
  "obligatory_scenes": [
    { "id": "mys_crime", "label": "谜题建立场景", "required": true },
    { "id": "mys_false_suspect", "label": "误导嫌疑人", "required": true, "notes": "至少一次明确的误导" },
    { "id": "mys_clue_trail", "label": "线索追踪序列", "required": true },
    { "id": "mys_revelation", "label": "真相揭示", "required": true, "notes": "必须回答所有主要谜题" },
    { "id": "mys_confrontation", "label": "主角与真凶对峙", "required": true }
  ],
  "forbidden_patterns": [
    "真凶在前两幕从未出现过",
    "真相依赖主角未曾见过的信息",
    "误导过于明显，观众在第一幕就确定了真凶",
    "真相揭示靠独白解释，而非戏剧性场景"
  ],
  "information_management": {
    "rule": "每一条线索必须对观众可见，但意义可以被隐藏",
    "fair_play_principle": "不允许在揭示场景中使用未曾展示给观众的信息"
  }
}
```

---

## 五、L3 角色层

### 5.1 角色原型库

原型库管理可复用的角色功能定义，与类型层中的 `required_character_archetypes` 联动。

```json
{
  "id": "protagonist_hero",
  "label": "主角英雄",
  "core_function": "故事的中心视角，承载主题问题，完成弧光",
  "structural_requirements": {
    "must_have_external_want": true,
    "must_have_internal_need": true,
    "want_need_must_conflict": true,
    "notes": "欲望与需求的冲突是故事发动机"
  },
  "arc_options": ["正面成长弧", "负面堕落弧", "平坦弧（改变世界而非自身）"],
  "common_flaws": ["自大", "恐惧", "执念", "逃避", "不信任他人"],
  "compatible_genres": ["所有类型"],
  "anti_patterns": [
    "欲望不明确导致主角似乎只在随波逐流",
    "弧光缺乏内在触发，只靠外部事件推动",
    "外部欲望达成但内部需求从未被面对"
  ]
}
```

**完整原型清单（Campbell + Truby + Vogler 综合体系）：**

| 原型 ID | 中文名 | 核心功能 | 常见类型 |
|---|---|---|---|
| `protagonist_hero` | 主角英雄 | 故事中心，承载弧光 | 所有 |
| `antagonist_shadow` | 阴影对手 | 映射主角最怕成为的自己 | 所有 |
| `mentor` | 导师 | 传授知识/工具，推动主角跨越门槛 | 冒险、成长 |
| `trickster` | 捣蛋者 | 提供喜剧落差，挑战既有秩序 | 喜剧、冒险 |
| `shapeshifter` | 变形者 | 让主角（和观众）对其忠诚度持续存疑 | 惊悚、爱情 |
| `herald` | 先驱者 | 宣告变化将至，触发主角出发 | 冒险 |
| `ally` | 盟友 | 提供支持和互补视角 | 所有 |
| `gatekeeper` | 守门人 | 测试主角是否准备好前进 | 冒险、成长 |
| `love_interest` | 爱人 | 触发主角情感开放与脆弱 | 爱情、成长 |
| `confidant` | 知心人 | 为主角提供内心独白的外化对象 | 爱情、家庭 |
| `rival` | 竞争者 | 反映主角的另一条可能路径 | 体育、职场、爱情 |
| `foil` | 对照角色 | 通过对比突出主角特质 | 所有 |

### 5.2 角色弧光模式库

```json
{
  "id": "arc_positive_change",
  "label": "正面成长弧",
  "description": "主角从有缺陷的起点，经历考验后真正改变，成为更好的版本",
  "stages": [
    { "stage": "arc_start", "label": "缺陷状态", "notes": "主角有明确的心理或道德缺陷，这个缺陷会阻碍他/她得到真正需要的东西" },
    { "stage": "arc_test", "label": "考验缺陷", "notes": "故事事件直接针对这个缺陷施压，让主角无法回避它" },
    { "stage": "arc_crisis", "label": "缺陷代价", "notes": "因为缺陷，主角付出最沉重的代价，到达最低点" },
    { "stage": "arc_turn", "label": "内在转化", "notes": "主角真正放弃旧信念或旧行为模式，选择改变" },
    { "stage": "arc_end", "label": "新状态", "notes": "主角以新的方式面对最终挑战，结果由改变来决定" }
  ],
  "common_mistakes": [
    "转化发生得太快，缺少足够的内部阻力",
    "转化只停留在行动层面，内部信念没有真正改变",
    "弧光终点过于圆满，主角失去了真实性"
  ],
  "suitable_genres": ["成长片", "爱情片", "家庭片", "传记片"]
}
```

---

## 六、L4 情节层

### 6.1 情节机制库（Plot Mechanisms）

情节机制是比"类型"更细粒度的情节组织单位。一个故事可能同时包含多个情节机制。

```json
{
  "id": "mechanism_pursuit",
  "label": "追逐机制",
  "description": "一方追逐另一方，追逐的目标在过程中可能发生变化",
  "roles_required": ["pursuer", "pursued"],
  "tension_source": "距离感和时间压力",
  "escalation_patterns": [
    "追逐者逐渐接近",
    "被追者发现追逐者是谁",
    "被追者开始反追"
  ],
  "resolution_options": ["逃脱", "被捕", "追逐变合作", "追逐者放弃"],
  "genre_affinity": ["动作片", "惊悚片", "犯罪片"]
}
```

**完整情节机制清单：**

| 机制 ID | 名称 | 核心张力 |
|---|---|---|
| `mechanism_pursuit` | 追逐 | 距离与时间压力 |
| `mechanism_revenge` | 复仇 | 正义与代价的张力 |
| `mechanism_rescue` | 营救 | 时间与牺牲的张力 |
| `mechanism_heist` | 谋划行动 | 计划与意外的博弈 |
| `mechanism_love_obstacle` | 爱情障碍 | 靠近与阻力的交替 |
| `mechanism_mystery_investigation` | 谜题调查 | 信息的控制与揭示 |
| `mechanism_coming_of_age` | 成长考验 | 旧自我与新自我的冲突 |
| `mechanism_survival` | 生存危机 | 极端条件下的人性选择 |
| `mechanism_deception` | 欺骗揭穿 | 表象与真相的落差 |
| `mechanism_competition` | 竞争对决 | 两条路径的最终比较 |
| `mechanism_sacrifice` | 牺牲抉择 | 个人利益与更高价值的冲突 |
| `mechanism_forbidden` | 禁忌跨越 | 规则与欲望的冲突 |

### 6.2 冲突类型矩阵

```json
{
  "conflict_types": [
    {
      "id": "conflict_person_vs_person",
      "label": "人物对人物",
      "description": "主角与具体对手的直接冲突",
      "dramatic_advantage": "最直观，最容易制造戏剧性场景",
      "risk": "如果对手只是障碍而没有自己的动机，会显得单薄"
    },
    {
      "id": "conflict_person_vs_self",
      "label": "人物对自我",
      "description": "主角与自己内心的冲突",
      "dramatic_advantage": "产生最深层的角色弧光",
      "risk": "难以视觉化，容易流于内心独白"
    },
    {
      "id": "conflict_person_vs_society",
      "label": "人物对社会",
      "description": "主角与社会规则、制度、集体的冲突",
      "dramatic_advantage": "具有主题深度和社会意义",
      "risk": "对手过于抽象，难以制造具体场景"
    },
    {
      "id": "conflict_person_vs_nature",
      "label": "人物对自然",
      "description": "主角与环境、灾难、不可控力量的冲突",
      "dramatic_advantage": "天然的生存张力",
      "risk": "主角容易显得被动"
    },
    {
      "id": "conflict_person_vs_fate",
      "label": "人物对命运",
      "description": "主角与不可避免的结局或预言的冲突",
      "dramatic_advantage": "哲学深度与悲剧力量",
      "risk": "容易显得主角无能为力，观众失去代入感"
    }
  ]
}
```

---

## 七、L5 场景层

### 7.1 场景类型库

每种场景类型都包含：戏剧化最大化建议 + 常见失误 + 转场提示。

```json
{
  "id": "scene_type_confrontation",
  "label": "对峙场景",
  "description": "两个或多个人物直接碰撞，利益或价值观不可调和",
  "dramatic_maximizers": [
    "确保双方都有合理的动机和不能妥协的原因",
    "不要让一方完全正确，给对方一个有力的论点",
    "使用空间和沉默——不说什么比说什么更有力",
    "在场景结束时，力量平衡必须有明确变化"
  ],
  "common_mistakes": [
    "一方立刻认输，冲突过快消解",
    "对峙变成辩论赛，缺少情感和身体层面的动作",
    "没有外部压力，两人可以无限期对峙"
  ],
  "transition_options": [
    "强行中断（第三方出现或外部事件打断）",
    "暂时和解（但根本矛盾未解决）",
    "决裂（双方关系发生不可逆变化）",
    "意外联盟（共同威胁让两人暂时搁置冲突）"
  ],
  "value_shift_patterns": ["胜负", "相互尊重", "深化仇恨", "意外共情"]
}
```

**完整场景类型清单：**

| 类型 ID | 名称 | 核心戏剧功能 |
|---|---|---|
| `scene_confrontation` | 对峙 | 直接碰撞，力量对比变化 |
| `scene_revelation` | 揭示 | 改变信息状态，通常也改变关系 |
| `scene_seduction` | 诱惑/引诱 | 角色面临道德或欲望选择 |
| `scene_escape` | 逃脱 | 时间压力下的体力或智力行动 |
| `scene_pursuit` | 追逐 | 追与逃的空间化冲突 |
| `scene_negotiation` | 谈判 | 双方都想要的但各有红线 |
| `scene_reunion` | 重逢 | 时间和变化让相遇具有情感落差 |
| `scene_farewell` | 告别 | 终结一段关系或一个阶段 |
| `scene_initiation` | 入门/考验 | 角色被测试是否够格进入新阶段 |
| `scene_plan_making` | 制定计划 | 展示信息、建立期望、埋下即将失败的因素 |
| `scene_discovery` | 发现 | 角色（和观众）一起发现新信息 |
| `scene_mourning` | 哀悼/崩溃 | 情感最低点，重新定向的前夜 |
| `scene_declaration` | 宣言 | 角色明确表达立场，通常有不可逆代价 |

### 7.2 场景转场模式库

```json
{
  "transition_patterns": [
    {
      "id": "trans_contrast_cut",
      "label": "情绪对比切",
      "description": "前一场结束于高情绪点，下一场开始于完全不同的情绪或环境",
      "effect": "节奏对比，给观众呼吸，或产生强烈反差感"
    },
    {
      "id": "trans_cause_effect",
      "label": "因果连接切",
      "description": "前一场的决定或行动，直接引发下一场",
      "effect": "强化因果逻辑，维持叙事张力"
    },
    {
      "id": "trans_time_jump",
      "label": "时间跳跃",
      "description": "明显的时间流逝，通过视觉提示或字幕传达",
      "effect": "压缩平淡时段，强调重要时刻"
    },
    {
      "id": "trans_motif_link",
      "label": "母题连接",
      "description": "前一场结尾和下一场开头共享一个视觉或声音母题",
      "effect": "建立主题一致性，产生诗意感"
    },
    {
      "id": "trans_cliffhanger",
      "label": "悬念切",
      "description": "在最高张力点切换，让观众（或读者）必须继续",
      "effect": "剧集换集最常用，制造强驱动力"
    }
  ]
}
```

---

## 八、L6 对白层

### 8.1 对白风格库

```json
{
  "id": "dialogue_style_subtext",
  "label": "潜台词型对白",
  "description": "角色说的不是真正想说的，真实意图藏在言语之下",
  "techniques": [
    {
      "id": "tech_deflection",
      "label": "转移回避",
      "example": "A：'你爱我吗？' B：'今天的天气真好。'",
      "use_when": "角色无法或不愿直接面对某个问题时"
    },
    {
      "id": "tech_overstatement",
      "label": "过度确认",
      "example": "A：'我完全没事，真的完全没事，你不用担心我。'",
      "use_when": "角色越是用力否认，越暴露了真实的状态"
    },
    {
      "id": "tech_displacement",
      "label": "情绪转移",
      "example": "角色把对A的愤怒发泄给了不相关的B",
      "use_when": "角色面对真实来源时无力或不敢直接表达"
    },
    {
      "id": "tech_action_speech",
      "label": "行动代替言说",
      "example": "角色不说'我很抱歉'，而是默默帮对方修好了东西",
      "use_when": "情感最深的时刻，行动比言语更有力"
    }
  ],
  "genre_affinity": ["家庭片", "爱情片", "犯罪片"],
  "anti_patterns": [
    "潜台词过于隐晦，普通观众完全无法感知",
    "每段对白都是潜台词，导致信息传递失败",
    "用旁白或内心独白替代潜台词，失去戏剧性"
  ]
}
```

### 8.2 不同角色声音区分框架

```json
{
  "id": "voice_differentiation_framework",
  "dimensions": [
    {
      "dimension": "词汇层",
      "questions": [
        "这个角色用简单词还是复杂词？",
        "这个角色用行话、方言还是通用语？",
        "这个角色喜欢用比喻还是直白表述？"
      ]
    },
    {
      "dimension": "句式层",
      "questions": [
        "这个角色说长句还是短句？",
        "这个角色习惯打断别人还是等别人说完？",
        "这个角色倾向于问句还是陈述句？"
      ]
    },
    {
      "dimension": "信息管理层",
      "questions": [
        "这个角色倾向于过度分享还是惜字如金？",
        "这个角色在撒谎时有什么语言模式？",
        "这个角色如何处理不知道答案的问题？"
      ]
    },
    {
      "dimension": "情绪表达层",
      "questions": [
        "这个角色直接表达情绪还是压抑它？",
        "这个角色在愤怒时如何说话（更多话还是更少话）？",
        "这个角色在害怕时的语言特征是什么？"
      ]
    }
  ]
}
```

---

## 九、L7 世界观层

### 9.1 不同类型世界的规则框架

```json
{
  "id": "world_framework_contemporary_realism",
  "label": "当代现实主义世界",
  "rules_template": [
    { "category": "物理规则", "default": "遵循现实物理规律" },
    { "category": "社会规则", "default": "当代社会制度与法律" },
    { "category": "信息规则", "default": "人物只知道自己能知道的信息" },
    { "category": "死亡规则", "default": "死亡不可逆，有现实后果" }
  ],
  "consistency_checklist": [
    "地理位置与旅行时间是否合理？",
    "经济状态与角色的行为选择是否一致？",
    "手机、网络、监控等现代技术的存在是否被考虑进剧情？",
    "法律程序和机构行为是否大致准确？"
  ]
}
```

```json
{
  "id": "world_framework_fantasy",
  "label": "奇幻世界",
  "rules_template": [
    { "category": "魔法规则", "default": "必须在第一幕确立能做什么，以及不能做什么（成本）" },
    { "category": "世界历史", "default": "世界的历史要能解释当前冲突的根源" },
    { "category": "种族/阵营", "default": "每个群体必须有自己的内在逻辑，不能只是背景装饰" },
    { "category": "经济体系", "default": "资源稀缺性需要与魔法能力一致" }
  ],
  "consistency_checklist": [
    "魔法规则是否在全片保持一致？",
    "是否存在'魔法解决一切'但之前从未展示这个解法的情况？",
    "世界地图上的距离感是否被剧情尊重？",
    "旧世界的历史是否与当下事件的逻辑自洽？"
  ],
  "first_act_obligations": [
    "在观众需要理解之前展示魔法规则",
    "通过代价或限制来建立规则的真实感",
    "让角色行为受到世界规则的实际约束"
  ]
}
```

---

## 十、L8 参考层

### 10.1 参考剧本索引结构

参考层不存储完整剧本（版权问题），存储**可复用的结构性提取**。

```json
{
  "id": "ref_chinatown_1974",
  "title": "唐人街",
  "original_title": "Chinatown",
  "year": 1974,
  "genre_primary": "mystery",
  "genre_secondary": ["noir", "crime"],
  "structure_template_used": "three_act",
  "notable_techniques": [
    {
      "id": "tech_false_clarity",
      "label": "伪明朗结局",
      "description": "主角以为解决了谜题，但真正的谜底更黑暗，导致反高潮结局",
      "extract_pattern": "protagonist_believes_truth_but_truth_is_worse"
    },
    {
      "id": "tech_institutional_corruption",
      "label": "制度性腐败作为真正的反派",
      "description": "真正的恶不是某一个坏人，而是让坏人无法被制裁的系统",
      "extract_pattern": "antagonist_is_system_not_person"
    }
  ],
  "arc_pattern": "protagonist_fails_but_changes_world_understanding",
  "obligatory_scene_usage": {
    "mystery_revelation": "通过两次揭示完成——表层真相和深层真相",
    "mystery_confrontation": "最终对峙以悲剧而非正义结束"
  },
  "reuse_patterns": [
    "多层谜题结构：每解决一层，暴露更深的层",
    "主角调查者的道德困境",
    "私人调查与公共腐败的交织"
  ],
  "caution_notes": "此模式只适合接受悲剧结局的作品，不适用于需要满足感结局的商业类型片"
}
```

### 10.2 参考分类索引

参考剧本/作品的多维索引：

```
按类型：genre_index[genre_id] → [ref_ids]
按结构模式：structure_index[structure_id] → [ref_ids]
按情节机制：mechanism_index[mechanism_id] → [ref_ids]
按角色弧光：arc_index[arc_id] → [ref_ids]
按对白技巧：dialogue_index[technique_id] → [ref_ids]
```

---

## 十一、数据结构设计原则

### 11.1 层级组织

```
资料库（全局共享）
    └── 类型规范集
    └── 结构模板集
    └── 原型库
    └── 情节机制库
    └── 场景类型库
    └── 对白技巧库
    └── 世界规则框架库
    └── 参考索引库

项目（单项目）
    └── IntentAnchor（引用资料库中的类型/结构）
    └── 角色卡（引用资料库中的原型）
    └── 剧情卡（引用资料库中的情节机制）
    └── 场景卡（引用资料库中的场景类型）
    └── 规则引擎（引用资料库中的类型规范）
```

### 11.2 引用而非复制

项目数据中只存 `id` 引用，不复制资料库内容：

```json
{
  "project_id": "proj_001",
  "genre_config": {
    "primary": "romance",
    "secondary": ["comedy"],
    "overrides": {
      "obligatory_scenes_add": [],
      "obligatory_scenes_remove": ["rom_grand_gesture"],
      "forbidden_patterns_add": []
    }
  }
}
```

`overrides` 字段允许创作者在不破坏资料库原始数据的前提下，针对当前项目定制类型规范。

### 11.3 可扩展性设计

每条资料条目都包含：

```json
{
  "id": "...",
  "source": "system_builtin",  // 或 "user_custom" 或 "team_shared"
  "version": "1.0",
  "created_at": "...",
  "is_locked": false,          // true 表示内建条目，不允许删除
  "tags": [],
  "notes": ""
}
```

---

## 十二、AI 集成接口设计

### 12.1 AI 在哪些步骤调用哪些资料

| 创作步骤 | 主要调用资料层 | 查询类型 |
|---|---|---|
| 灵感 → Logline | L2 类型层 | 结构查询：`getGenrePromise(genre_id)` |
| Logline → 角色设计 | L3 角色层 + L2 类型层 | 结构查询：`getRequiredArchetypes(genre_id)` |
| 角色 → 结构选择 | L1 结构层 | 结构查询：`getStructureForGenre(genre_id)` |
| 结构 → 剧情卡铺排 | L4 情节层 + L2 类型层 | 结构查询：`getObligatoryScenes(genre_id)` + `getMechanisms(genre_id)` |
| 剧情卡 → 场景卡 | L5 场景层 | 结构查询：`getSceneTypeGuide(scene_type_id)` |
| 场景卡 → 对白 | L6 对白层 + L3 角色层 | 结构查询：`getVoiceProfile(character_id)` |
| 改稿评审 | 全部层 | 规则引擎触发 |

### 12.2 两种查询模式的取舍

**结构化查询（优先）：**

- 适用于：必备场景检查、类型规范验证、角色功能配置、规则引擎
- 优势：精确、可审计、不产生幻觉
- 实现：SQL 或 JSON 直接查询
- 示例：`SELECT obligatory_scenes FROM genre_specs WHERE id = 'romance'`

**语义检索（辅助）：**

- 适用于：寻找相似参考案例、匹配对白风格、发现适用的情节机制
- 优势：灵活、能处理模糊需求
- 实现：向量数据库（embedding）
- 示例：`searchSimilarPatterns("主角以为赢了但实际上输了更大的东西")`

**核心原则：事实约束层用结构查询，创意启发层用语义检索。**

### 12.3 AI 提示词注入格式

每次 AI 生成前，系统自动注入相关资料库内容：

```
[类型约束注入]
当前类型：爱情片 + 喜剧
必备场景（未完成）：相遇场景、障碍揭示、分离时刻
禁忌模式：主角因误解不沟通超过两场且无内部原因

[结构约束注入]
当前节拍：Save the Cat 中点（55%）
中点戏剧功能：主角从被动转向主动，或表面胜利转向真实危机
当前弧光状态：弧光第2阶段（考验缺陷）

[角色约束注入]
主角当前状态：外部欲望=得到晋升，内部需求=学会信任他人
角色声音规则：说话简短直接，回避情绪话题时用工作话题转移

请在以上约束范围内生成本场景的剧情卡草案。
```

### 12.4 资料库的自定义与扩展

三级扩展机制：

1. **项目级覆盖（最常用）**：在 `genre_config.overrides` 中增删场景要求，不影响资料库
2. **团队级自定义**：创建 `source: "team_shared"` 的条目，跨团队项目共享
3. **全局新增（谨慎）**：添加新的类型、原型或机制到主库，需要版本标记

---

## 十三、MVP 优先级与建设路线

### 13.1 哪些资料最关键

影响最大、与现有系统集成成本最低的，按优先级排序：

**第一批（立即建设）：**

1. **L2 类型层核心 8 个类型的完整规范**（爱情、悬疑、惊悚、成长、喜剧、动作、犯罪、科幻）
   - 理由：类型规范直接影响 AI 生成质量，且现有系统完全缺失这一层
   - 形式：JSON 文件，放入 `src/data/genreLibrary.js`
   - 工作量：中等（每个类型约 50-80 行 JSON）

2. **L1 结构层节点扩充**（为现有 29 个结构补充 `dramatic_function` + `failure_modes` + `genre_overrides`）
   - 理由：现有结构库只有骨架，没有编剧指导内容
   - 形式：扩展现有 `storyStructureLibrary.js` 的节点字段
   - 工作量：中等

3. **L3 角色原型库**（12 个原型的完整规格）
   - 理由：角色卡是现有系统的核心对象，原型库直接服务角色创建流程
   - 形式：JSON 文件，放入 `src/data/characterArchetypeLibrary.js`
   - 工作量：小

**第二批（结构稳定后建设）：**

4. L4 情节机制库（12 个机制）
5. L5 场景类型库（13 个场景类型）
6. L7 世界观框架（5 个世界框架）

**第三批（系统成熟后建设）：**

7. L6 对白层（需要大量示例，依赖真实改稿经验积累）
8. L8 参考层（需要有实际剧本录入后才有价值）

### 13.2 最小可用资料库（MVP）

一个能让 AI 创作系统产生明显质量提升的最小资料库，必须包含：

```
genreLibrary.js              8个主类型的：类型承诺 + 必备场景清单 + 禁忌规则
structureLibrary.js（扩充）  29个结构 + 每节点的戏剧功能 + 失败模式
characterArchetypeLibrary.js 12个原型 + 弧光模式 + 类型对应关系
mechanismLibrary.js          12个情节机制 + 冲突类型矩阵
```

这 4 个文件合计约 800-1200 行 JSON，覆盖了 AI 创作中 80% 的约束需求。

### 13.3 与现有系统的集成入口

| 现有代码位置 | 资料库调用点 | 具体作用 |
|---|---|---|
| `src/data/storyStructureLibrary.js` | L1 结构层 | 为现有节点补充戏剧功能字段 |
| `src/logic/` | L2 类型层 | 类型选择后自动加载必备场景清单 |
| `src/shared/plotDrivenProject.js` | L2 + L4 | 剧情卡创建时提示适用的情节机制 |
| `specs/rules-v1.json` | L2 类型层 | 规则引擎引用类型禁忌规则 |
| `src/data/experts.js` | 全部层 | 每个专家角色在调用前注入对应层的约束 |

---

## 十四、文件组织建议

```
src/data/
├── storyStructureLibrary.js     （已有，需扩充节点字段）
├── genreLibrary.js              （新建，L2 类型层）
├── characterArchetypeLibrary.js （新建，L3 角色层）
├── plotMechanismLibrary.js      （新建，L4 情节机制）
├── sceneTypeLibrary.js          （新建，L5 场景类型）
├── dialogueStyleLibrary.js      （后期，L6 对白层）
└── worldFrameworkLibrary.js     （新建，L7 世界观层）

specs/
├── story-bible-template-v1.json （已有）
├── rules-v1.json                （已有，需联动类型禁忌规则）
└── knowledge-base-schema-v1.json（新建，资料库 JSON Schema 定义）
```

---

## 十五、关键设计决策说明

**决策 1：为什么类型层优先级最高**

现有系统（结构层）解决的是"故事怎么组织"，类型层解决的是"这类型故事承诺了什么"。AI 在不知道类型承诺的情况下，会生成结构正确但类型违规的内容——这是目前 AI 生成剧本质量最常见的问题。

**决策 2：为什么不做 RAG 向量库作为主存储**

RAG 适合处理"找相似"的任务，不适合处理"检查是否违规"的任务。类型承诺、必备场景、禁忌规则需要精确的结构化查询，而不是语义相似度匹配。向量检索作为补充（参考案例检索），但不作为约束层的主存储。

**决策 3：为什么原型库和类型库分离存储**

同一个原型（如"导师"）在不同类型中的具体要求不同，但原型的核心功能定义是共享的。分离存储后，类型库通过 `required_character_archetypes: ["mentor"]` 引用原型库，原型库保持独立可扩展，类型库通过引用而非复制来约束角色。

**决策 4：资料库条目的版本化**

每条条目有 `version` 字段，修改时不覆盖，而是创建新版本。已有项目引用的旧版条目保持稳定，新项目使用新版。这解决了"资料库更新导致已有项目规则变化"的一致性问题。
