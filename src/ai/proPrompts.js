export function buildAnalyzeAnchorPrompt(anchor, genres) {
  const system = `你是专业故事顾问。你只输出JSON，不输出任何其他内容。`;

  const user = `分析以下创作起点，判断其类型并推断故事方向。

起点内容：「${anchor}」
已选类型：${genres.join('、') || '未指定'}

判断锚点主要属于哪个类别（character=人物驱动 / scene=场景/画面驱动 / theme=主题/情感驱动 / mixed=多重混合），推断可能的故事类型和关键元素，给出应该从哪个工作台开始（first_wb）。

只输出以下JSON：
{"anchor_type":"character","context":{"inferred_genre":["剧情","家庭"],"key_elements":["背叛","谎言","家庭关系"],"summary":"一个关于家庭内部秘密与信任破裂的故事"},"first_wb":"character"}`;

  return { system, user };
}

export function buildWorkbenchQuestionsPrompt(wb, context, anchor, genres) {
  if (wb === 'theme') {
    const system = `你是获得过奥斯卡的编剧顾问。你只输出JSON，不输出任何其他内容。`;
    const user = `基于以下创作起点，生成4个深度问题来挖掘故事的主题与核心张力。每个问题必须聚焦于一个具体的人性困境，而不是泛泛的描述。同时给出你认为最有戏剧张力的默认答案。

起点：「${anchor}」
已知信息：${JSON.stringify(context)}
类型：${genres}

要求：
- 问题必须具体，涉及人物处境，不能是"描述你的主题"这类泛问
- 默认答案要有实质内容，能直接作为创作材料使用
- 必须包含一个关于"核心困境"的问题——其答案要包含两个相互冲突的合理立场

只输出JSON：
{"questions":[{"id":"t1","question":"具体问题","answer":"具体默认答案"},{"id":"t2","question":"...","answer":"..."}]}`;
    return { system, user };
  }

  if (wb === 'character') {
    const system = `你是获得过奥斯卡的编剧顾问，擅长挖掘角色心理深度。你只输出JSON，不输出任何其他内容。`;
    const user = `基于以下创作起点，生成4-5个问题来建立核心人物的心理画像。问题要挖掘具体的行为特征、内在矛盾和创伤，而不是抽象的性格描述。

起点：「${anchor}」
已知信息：${JSON.stringify(context)}

要求：
- 至少一个问题要挖掘人物的**具体行为习惯**（不是性格标签）
- 至少一个问题要挖掘人物的**内在矛盾**（他/她的两面）
- 默认答案要是具体的人物细节，不是心理学概念

只输出JSON：
{"questions":[{"id":"c1","question":"具体问题","answer":"具体默认答案"},...]}`;
    return { system, user };
  }

  if (wb === 'scene') {
    const system = `你是获得过奥斯卡的编剧顾问，擅长设计关键场景。你只输出JSON，不输出任何其他内容。`;
    const user = `基于以下创作起点，生成4个问题来设计故事中最关键的几个场景时刻。每个问题聚焦于一个具体的戏剧性节点。

起点：「${anchor}」
已知信息：${JSON.stringify(context)}

要求：
- 每个问题针对不同的故事节点（开端/转折/高潮/结局）
- 默认答案要包含具体的场景描述（地点、动作、冲突）

只输出JSON：
{"questions":[{"id":"s1","question":"具体问题","answer":"具体默认答案"},...]}`;
    return { system, user };
  }

  throw new Error(`未知工作台: ${wb}`);
}

export function buildAssemblePrompt(anchor, genres, themeQA, characterQA, sceneQA) {
  const system = `你是专业故事顾问，负责将创作材料整合成结构化故事大纲。你只输出JSON，不输出任何其他内容。`;

  const formatQA = (questions) =>
    (questions ?? []).map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');

  const user = `将以下创作材料整合成结构化故事数据。

原始起点：「${anchor}」
类型：${genres.join('、')}

主题工作台内容：
${formatQA(themeQA)}

人物工作台内容：
${formatQA(characterQA)}

场景工作台内容：
${formatQA(sceneQA)}

整合要求：
1. title = 一个**简短有力**的故事标题（2-8 字，意象/张力词为主，不要包含动词全句、不要把 premise 拿来截断）
2. premise = 一句能激起好奇的故事前提（来自主题台）
3. core_conflict = 核心冲突（来自主题台，必须包含两方立场）
4. central_question = 核心困境问题（来自主题台，不能有明显正确答案）
5. theme_statement = 主题陈述
6. 构建3-5个人物（以人物台素材为核心，补足故事必需的叙事位置——主角/对手/盟友/配角各司其职），每人包含 name/story_role/desire/need/wound/arc_start/arc_end/contradiction/notes；用户没提到的人物由你按故事需要设计，但不得与人物台素材矛盾
7. 提取2-4个关键场景（来自场景台），包含 title/goal/conflict/turn/act_position

只输出以下JSON（必须包含所有字段）：
{
  "story_core": {
    "title": "...",
    "premise": "...",
    "core_conflict": "...",
    "central_question": "...",
    "theme_statement": "..."
  },
  "characters": [
    {
      "name": "...",
      "story_role": "protagonist",
      "desire": "...",
      "need": "...",
      "wound": "...",
      "arc_start": "...",
      "arc_end": "...",
      "contradiction": "...",
      "notes": "具体的行为习惯或人物细节"
    }
  ],
  "scenes": [
    {
      "title": "...",
      "goal": "...",
      "conflict": "...",
      "turn": "...",
      "act_position": "catalyst|midpoint|crisis|finale"
    }
  ]
}`;

  return { system, user };
}
