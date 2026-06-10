const severityOrder = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

function countFilled(values) {
  return values.filter(Boolean).length;
}

function findCharacter(project, characterId) {
  return project.story_bible.characters.find((item) => item.id === characterId);
}

function getSceneIndexById(project, sceneId) {
  return project.story_bible.scene_cards.findIndex((scene) => scene.id === sceneId);
}

function createIssue({
  ruleId,
  severity,
  title,
  summary,
  whyItMatters,
  affectedObjects,
  suggestedNextStep
}) {
  return {
    id: `${ruleId}_${affectedObjects.join("_")}`,
    ruleId,
    severity,
    title,
    summary,
    whyItMatters,
    affectedObjects,
    suggestedNextStep
  };
}

export function computeIssues(project) {
  const issues = [];
  const scenes = [...project.story_bible.scene_cards].sort(
    (left, right) => left.order_index - right.order_index
  );
  const setups = project.story_bible.setup_payoffs;
  const motif = project.intent_anchor.motif?.trim();
  const arc = project.intent_anchor.arc?.trim();

  const seenOrder = new Set();
  for (const scene of scenes) {
    if (!scene.goal || !scene.obstacle) {
      issues.push(
        createIssue({
          ruleId: "scene_goal_missing_v1",
          severity: "high",
          title: "场景目标不完整",
          summary: `《${scene.title}》缺少明确目标或阻力，人物会像在闲聊而不是推动剧情。`,
          whyItMatters: "没有目标和阻力，场景就无法形成真正的戏剧压力。",
          affectedObjects: [scene.id],
          suggestedNextStep: "先补齐“这一场谁想得到什么”和“什么在阻止他”。"
        })
      );
    }

    if (!scene.turn || !scene.value_shift) {
      issues.push(
        createIssue({
          ruleId: "scene_turn_missing_v1",
          severity: "high",
          title: "场景缺少转折",
          summary: `《${scene.title}》前后状态变化还不够明确。`,
          whyItMatters: "没有转折，观众会感觉信息在重复推进，中段尤其容易塌。",
          affectedObjects: [scene.id],
          suggestedNextStep: "补一条“这一场结束后谁的判断、关系或风险发生了变化”。"
        })
      );
    }

    if (seenOrder.has(scene.order_index)) {
      issues.push(
        createIssue({
          ruleId: "timeline_conflict_v1",
          severity: "critical",
          title: "场景顺序冲突",
          summary: `场景顺序编号 ${scene.order_index} 出现重复。`,
          whyItMatters: "顺序冲突会直接破坏时间线和因果链。",
          affectedObjects: [scene.id],
          suggestedNextStep: "给每个场景一个唯一顺序，并重新确认上下场因果。"
        })
      );
    }
    seenOrder.add(scene.order_index);

    if (!scene.emotion_stage && arc) {
      issues.push(
        createIssue({
          ruleId: "arc_tracking_v1",
          severity: "medium",
          title: "弧光阶段未定义",
          summary: `《${scene.title}》还没有标注它落在主角弧光的哪个阶段。`,
          whyItMatters: "弧光不被标注，后续就很难判断人物有没有在变，还是只在重复受苦。",
          affectedObjects: [scene.id],
          suggestedNextStep: "给这场补一个情感阶段，例如“否认 / 对抗 / 崩塌 / 松动 / 接受”。"
        })
      );
    }

    const character = findCharacter(project, scene.pov_character_id);
    if (character && character.story_role === "protagonist") {
      const hasMotivationHint =
        scene.goal?.includes(character.external_want?.slice(0, 4) || "") ||
        scene.output_state?.includes("决定") ||
        scene.tactic?.includes("追问");
      if (!hasMotivationHint) {
        issues.push(
          createIssue({
            ruleId: "character_consistency_v1",
            severity: "medium",
            title: "主角动机连接偏弱",
            summary: `《${scene.title}》里主角的动作和她的长期欲望连接还不够清晰。`,
            whyItMatters: "角色行为如果脱离长期欲望，观众会感觉她只是为了推进剧情而行动。",
            affectedObjects: [scene.id, character.id],
            suggestedNextStep: "在目标或战术里明确这一步如何逼近她要的真相。"
          })
        );
      }
    }
  }

  setups.forEach((setup) => {
    if (setup.status === "open") {
      const setupSceneIndex = getSceneIndexById(project, setup.setup_scene_id);
      if (setupSceneIndex !== -1 && scenes.length - setupSceneIndex >= 2) {
        issues.push(
          createIssue({
            ruleId: "setup_payoff_gap_v1",
            severity: "high",
            title: "伏笔尚未回收",
            summary: `“${setup.setup_summary}” 已经埋下，但还没有绑定明确回收。`,
            whyItMatters: "伏笔长期悬空会让观众觉得故事在许诺重要性却迟迟不兑现。",
            affectedObjects: [setup.id, setup.setup_scene_id],
            suggestedNextStep: "要么给它指定回收场景，要么下调它的重要级别。"
          })
        );
      }
    }
  });

  if (motif) {
    const motifHits = scenes.filter((scene) =>
      (scene.production_tags || []).some((tag) => tag.includes("倒影") || tag.includes("水"))
    );
    if (motifHits.length === 0) {
      issues.push(
        createIssue({
          ruleId: "motif_tracking_v1",
          severity: "low",
          title: "视觉母题还没进入场景层",
          summary: `当前设定了“${motif}”，但场景标签里还看不见它的稳定落点。`,
          whyItMatters: "视觉母题如果只停在概念层，后续很难形成统一的画面记忆。",
          affectedObjects: ["anchor_001"],
          suggestedNextStep: "先给开场或关键转折场景补一处具体、可拍的母题植入。"
        })
      );
    }
  }

  const expensiveScenes = scenes.filter((scene) =>
    (scene.production_tags || []).some((tag) =>
      ["夜戏", "群演", "动作", "海上"].includes(tag)
    )
  );
  if (expensiveScenes.length >= 3 && expensiveScenes.length / Math.max(scenes.length, 1) > 0.6) {
    issues.push(
      createIssue({
        ruleId: "production_hotspot_v1",
        severity: "low",
        title: "高成本场景偏集中",
        summary: "当前样例里夜戏或高复杂度场景占比较高。",
        whyItMatters: "如果第一版就把成本压力集中在同一段，后续改稿会很难兼顾可拍性。",
        affectedObjects: expensiveScenes.map((scene) => scene.id),
        suggestedNextStep: "把其中一场换成更便宜但同样有压迫感的空间。"
      })
    );
  }

  return issues.sort(
    (left, right) => severityOrder[left.severity] - severityOrder[right.severity]
  );
}

export function summarizeIssues(issues) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const issue of issues) {
    summary[issue.severity] += 1;
  }

  return summary;
}
