function sceneLabel(scene) {
  return scene ? `《${scene.title}》` : "当前未选中场景";
}

function findCharacter(project, characterId) {
  return project.story_bible.characters.find((item) => item.id === characterId);
}

export const experts = [
  {
    id: "core_idea_excavator",
    name: "故事核挖掘者",
    summary: "把模糊想法压成可执行锚点",
    focus: "适合项目一开始或锚点想改的时候"
  },
  {
    id: "structure_genius",
    name: "结构天才",
    summary: "根据主题和弧光给 2 到 3 个结构方案",
    focus: "适合大纲阶段"
  },
  {
    id: "scene_crafter",
    name: "场景工坊",
    summary: "把一个场景拆成动作、对白、视觉三层",
    focus: "适合逐场推进"
  },
  {
    id: "dialogue_doctor",
    name: "对白医生",
    summary: "给对白更尖锐、贴人设的表达",
    focus: "适合写完一场后精修"
  },
  {
    id: "subtext_specialist",
    name: "潜台词专家",
    summary: "把解释换成行为、间接对白和沉默",
    focus: "适合去掉直说"
  },
  {
    id: "visual_hammer",
    name: "视觉锤",
    summary: "把视觉母题植入场景",
    focus: "适合场景发虚或画面感不够时"
  },
  {
    id: "emotion_resonator",
    name: "情感共鸣",
    summary: "检查当前场景是否落在正确弧光位置",
    focus: "适合判断感觉对不对"
  },
  {
    id: "pacing_doctor",
    name: "节奏调控师",
    summary: "给出提速或降速建议",
    focus: "适合拖沓或过快时"
  },
  {
    id: "character_psychologist",
    name: "角色心理学家",
    summary: "补强行为背后的心理动因",
    focus: "适合动机发硬时"
  },
  {
    id: "continuity_editor",
    name: "一致性监察",
    summary: "把全局问题压成体检报告",
    focus: "适合一轮开发结束后复盘"
  }
];

export function buildExpertOutput(expertId, project, selectedScene, issues) {
  const motif = project.intent_anchor.motif || "未定义母题";
  const theme = project.intent_anchor.theme || "未定义主题";
  const sceneCharacter = selectedScene
    ? findCharacter(project, selectedScene.pov_character_id)
    : undefined;

  switch (expertId) {
    case "core_idea_excavator":
      return {
        title: "意图锚点收束建议",
        intro: "先把作品到底想成为什么说清楚，再继续扩写更稳。",
        sections: [
          {
            title: "下一轮最值得补清的 3 个问题",
            bullets: [
              `主角 ${project.intent_anchor.protagonist || "未定义"} 最怕失去的到底是什么？`,
              `主题“${theme}”最终是要被证明、被质疑，还是被付出代价后才成立？`,
              `视觉母题“${motif}”是象征自我审视、谎言，还是无法直视的真相？`
            ]
          },
          {
            title: "锚点修订建议",
            bullets: [
              "把故事核从“发生了什么”改写成“谁必须改变，否则会继续伤害谁”。",
              "把主题写成一句带张力的判断，而不是抽象名词。"
            ]
          }
        ]
      };
    case "structure_genius":
      return {
        title: "结构方案候选",
        intro: "这不是成稿，而是 3 条不同力度的组织方式。",
        sections: [
          {
            title: "方案 A：三幕悬疑推进",
            bullets: [
              "第一幕先用匿名信和回乡建立外部任务。",
              "中点让真相第一次落回家庭内部，而不是外部反派。",
              "高潮让主角决定是公开真相还是停止继续用痛苦维系爱。"
            ]
          },
          {
            title: "方案 B：关系驱动结构",
            bullets: [
              "每个关键节点都由一段关系破裂触发，而不是只由案件资料触发。",
              "把继父线和旧友线做成镜像，一个代表隐瞒，一个代表利用。"
            ]
          },
          {
            title: "方案 C：弧光优先结构",
            bullets: [
              `围绕“${project.intent_anchor.arc || "主角转变"}”排布节拍，每一幕都要求主角失去一层控制感。`,
              "案件真相作为外部压力存在，但真正的高潮放在人物是否愿意停止自我惩罚。"
            ]
          }
        ]
      };
    case "scene_crafter":
      return {
        title: `${sceneLabel(selectedScene)} 场景构建包`,
        intro: "先把动作、对白、视觉三层拆开，再决定怎么整合。",
        sections: [
          {
            title: "动作选项",
            bullets: [
              selectedScene
                ? `让 ${sceneCharacter?.name || "角色"} 在开场先做一件“假装镇定”的动作，而不是直接开口。`
                : "先选中一个场景，系统才能给动作建议。",
              selectedScene
                ? "把转折放在一个被看见、被打断或被拿走的具体动作上。"
                : "场景工坊适合在你已经知道“这一场想干嘛”之后使用。"
            ]
          },
          {
            title: "对白方向",
            bullets: [
              selectedScene?.dialogue_seed
                ? `保留这句种子台词的锋利感，但让它更像试探而不是陈述：“${selectedScene.dialogue_seed}”`
                : "先补一条对白种子，效果会更好。",
              "尽量让双方都不正面回答问题，而是各自守住自己的利益。"
            ]
          },
          {
            title: "视觉植入",
            bullets: [
              `把“${motif}”放进场景环境，而不是只当修辞。`,
              "让母题和人物选择同框出现，比如倒影被踩碎、被遮挡、被故意避开。"
            ]
          }
        ]
      };
    case "dialogue_doctor":
      return {
        title: "对白精修方向",
        intro: "目标不是更文艺，而是更像这个人、同时更有压力。",
        sections: [
          {
            title: "替换思路",
            bullets: [
              selectedScene?.dialogue_seed
                ? `方案 1：把“${selectedScene.dialogue_seed}”改成更短、更像威胁的句法。`
                : "先在场景里补一句对白种子。",
              "方案 2：让角色只说一半，把真正攻击点藏在后半句停顿里。",
              "方案 3：让对方先误解，再暴露更深的关系裂缝。"
            ]
          }
        ]
      };
    case "subtext_specialist":
      return {
        title: "潜台词改写建议",
        intro: "把“我很紧张 / 我不信你”之类的直说，换成可拍行为。",
        sections: [
          {
            title: "动作替代",
            bullets: [
              selectedScene
                ? `${sceneCharacter?.name || "角色"} 先整理物件、挪开视线、卡住呼吸，再开口。`
                : "先选中一个场景。",
              "让关键问题被一个无关动作打断，这个打断本身就是态度。"
            ]
          },
          {
            title: "间接对白",
            bullets: [
              "不要正面说“我不信你”，改成问一个看似无关但实际上直刺漏洞的细节。",
              "让角色重复对方刚说过的词，但语气里带出否定。"
            ]
          }
        ]
      };
    case "visual_hammer":
      return {
        title: "视觉母题植入",
        intro: "母题只在真正有意义时出现，次数少一点反而更有力。",
        sections: [
          {
            title: "当前最稳的 3 种植入方式",
            bullets: [
              `环境层：在 ${selectedScene?.location || "关键场景"} 里加入“${motif}”相关反射面。`,
              "动作层：角色刻意避开自己的倒影，说明她不愿直视自己。",
              "转折层：在真相露出时让倒影先出现，再让本体出现。"
            ]
          }
        ]
      };
    case "emotion_resonator":
      return {
        title: "弧光校验",
        intro: "先判断这场感觉是不是落在正确位置，再决定要不要继续写深。",
        sections: [
          {
            title: "当前判断",
            bullets: [
              selectedScene?.emotion_stage
                ? `${sceneLabel(selectedScene)} 目前标注为“${selectedScene.emotion_stage}”，建议检查它是否真的让主角更接近失控而不是重复强硬。`
                : `${sceneLabel(selectedScene)} 还没标注弧光阶段，暂时无法可靠校验。`,
              `主弧光目前定义为“${project.intent_anchor.arc || "未定义"}”，场景结束时最好能看见一点方向性变化。`
            ]
          }
        ]
      };
    case "pacing_doctor":
      return {
        title: "节奏调控建议",
        intro: "快慢不是字数问题，而是动作、信息和等待的组合问题。",
        sections: [
          {
            title: "提速方案",
            bullets: [
              "删一轮解释性来回，把冲突改成交错动作。",
              "让一条新信息提前半场出现，把后半场改成选择而不是解释。"
            ]
          },
          {
            title: "降速方案",
            bullets: [
              "在关键揭示前插入一个能制造悬念的感官细节。",
              "让角色先看见某个物件，再决定说不说真话。"
            ]
          }
        ]
      };
    case "character_psychologist":
      return {
        title: "动机补强建议",
        intro: "如果一个行为看起来不合逻辑，通常是表层目标和深层需求没有接上。",
        sections: [
          {
            title: "角色分析",
            bullets: [
              sceneCharacter
                ? `${sceneCharacter.name} 的外在欲望是“${sceneCharacter.external_want}”，内在需求是“${sceneCharacter.internal_need}”。`
                : "先选中一个场景和 POV 角色。",
              sceneCharacter
                ? `她当前最有戏的矛盾，在于“${sceneCharacter.psychological_flaw}”和“${sceneCharacter.core_fear}”是同一个保护壳。`
                : "角色心理学家最适合拿来补强一个行为为什么发生。"
            ]
          },
          {
            title: "改写方向",
            bullets: [
              "不要直接改台词，先给角色一个更能暴露防御机制的小动作。",
              "把“反应过激”解释成她在维护一个更深的自我叙事。"
            ]
          }
        ]
      };
    case "continuity_editor":
      return {
        title: "全局体检报告摘要",
        intro: "先修硬问题，再动风格层和细节层。",
        sections: [
          {
            title: "当前最优先",
            bullets:
              issues.length > 0
                ? issues.slice(0, 4).map((issue) => `${issue.title}：${issue.summary}`)
                : ["当前没有明显硬伤。"]
          },
          {
            title: "建议处理顺序",
            bullets: [
              "先补场景目标与转折。",
              "再补弧光阶段和伏笔回收。",
              "最后再让视觉母题更稳定地落场景。"
            ]
          }
        ]
      };
    default:
      return {
        title: "专家建议",
        intro: "请选择一个专家卡片。",
        sections: []
      };
  }
}
