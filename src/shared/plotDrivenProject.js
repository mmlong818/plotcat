const STRUCTURES = {
  feature_film: {
    acts: [
      ["act_1", "第一幕", "立人物缺口与世界压力", "0% - 12%"],
      ["act_2", "第二幕", "诱发事件后锁定主线", "12% - 30%"],
      ["act_3", "第三幕", "在中段持续兑现故事承诺", "30% - 55%"],
      ["act_4", "第四幕", "连续反扑并逼近崩塌", "55% - 80%"],
      ["act_5", "第五幕", "决断、终局与余波", "80% - 100%"]
    ],
    nodes: [
      ["opening_image", "act_1", "开场印象", true],
      ["setup", "act_1", "世界与缺口", true],
      ["catalyst", "act_2", "诱发事件", true],
      ["lock_in", "act_2", "主线锁定", true],
      ["promise", "act_3", "故事承诺兑现", true],
      ["midpoint", "act_3", "中点翻转", true],
      ["reversal", "act_4", "局势反扑", true],
      ["collapse", "act_4", "崩塌时刻", true],
      ["final_choice", "act_5", "最终选择", true],
      ["finale", "act_5", "终局行动", true],
      ["aftershock", "act_5", "余波落点", false]
    ]
  },
  pilot_episode: {
    acts: [
      ["teaser", "冷开场", "先抛出剧集气质和悬念钩子", "0% - 10%"],
      ["act_1", "第一段", "立主角、立世界、立本集问题", "10% - 30%"],
      ["act_2", "第二段", "把人物关系和剧集引擎推出来", "30% - 55%"],
      ["act_3", "第三段", "放大冲突并建立持续观看动力", "55% - 85%"],
      ["tag", "尾钩", "用尾钩把观众送进下一集", "85% - 100%"]
    ],
    nodes: [
      ["cold_open", "teaser", "冷开场钩子", true],
      ["series_premise", "act_1", "剧集前提建立", true],
      ["protagonist_problem", "act_1", "主角问题抛出", true],
      ["episode_break_1", "act_2", "第一段落钩子", false],
      ["world_expansion", "act_2", "世界扩张", true],
      ["midpoint_hook", "act_2", "中段钩子", true],
      ["escalation", "act_3", "关系与危机升级", true],
      ["episode_climax", "act_3", "本集高潮", true],
      ["season_hook", "tag", "尾钩与续看承诺", true]
    ]
  },
  series_season: {
    acts: [
      ["act_1", "开季段", "建立季目标、主冲突和人物群", "0% - 20%"],
      ["act_2", "前中段", "推进多线并持续扩张世界", "20% - 45%"],
      ["act_3", "中后段", "让各线开始碰撞与重组", "45% - 70%"],
      ["act_4", "冲刺段", "把关键线推到失控边缘", "70% - 90%"],
      ["act_5", "季终段", "季终兑现并留下下一季钩子", "90% - 100%"]
    ],
    nodes: [
      ["season_engine", "act_1", "季引擎建立", true],
      ["cast_network", "act_1", "人物群关系网", true],
      ["line_split", "act_2", "多线展开", true],
      ["midseason_shift", "act_3", "季中转向", true],
      ["line_collision", "act_3", "线索碰撞", true],
      ["endgame_push", "act_4", "终局推进", true],
      ["season_climax", "act_5", "季终高潮", true],
      ["next_season_hook", "act_5", "下一季钩子", false]
    ]
  },
  short_form: {
    acts: [
      ["act_1", "起", "快速立人立题", "0% - 40%"],
      ["act_2", "转合", "完成转折并迅速落点", "40% - 100%"]
    ],
    nodes: [
      ["hook", "act_1", "起手钩子", true],
      ["core_turn", "act_2", "核心转折", true],
      ["payoff", "act_2", "落点回收", true]
    ]
  },
  micro_drama_serial: {
    acts: [
      ["act_1", "起钩集群", "用前几集快速起钩并锁定爽点", "0% - 20%"],
      ["act_2", "连续反转", "保持每集结尾的追更钩子", "20% - 55%"],
      ["act_3", "阶段爆点", "用几次大爆点重置关系和站位", "55% - 85%"],
      ["act_4", "大结局", "完成总回收并给终极爽点", "85% - 100%"]
    ],
    nodes: [
      ["episode_hook", "act_1", "前几集起钩", true],
      ["identity_flip", "act_2", "身份/关系反转", true],
      ["cliff_loop", "act_2", "追更钩子循环", true],
      ["stage_peak", "act_3", "阶段爆点", true],
      ["final_payoff", "act_4", "大结局回收", true]
    ]
  },
  three_act: {
    acts: [
      ["act_1", "第一幕", "建立世界与问题", "0% - 25%"],
      ["act_2", "第二幕", "持续升级冲突", "25% - 75%"],
      ["act_3", "第三幕", "完成最终选择", "75% - 100%"]
    ],
    nodes: [
      ["opening_image", "act_1", "开场印象", true],
      ["setup", "act_1", "基础铺陈", true],
      ["catalyst", "act_1", "诱发事件", true],
      ["break_into_two", "act_1", "进入第二幕", true],
      ["b_story", "act_2", "副线启动", false],
      ["midpoint", "act_2", "中点翻转", true],
      ["pressure_wave", "act_2", "压力推进", true],
      ["crisis", "act_2", "危机时刻", true],
      ["break_into_three", "act_2", "进入第三幕", true],
      ["finale", "act_3", "终局行动", true],
      ["final_image", "act_3", "结尾印象", false]
    ]
  },
  four_act: {
    acts: [
      ["act_1", "第一幕", "立人物与问题", "0% - 20%"],
      ["act_2", "第二幕", "主角先反应后试探", "20% - 45%"],
      ["act_3", "第三幕", "主动推进再崩塌", "45% - 75%"],
      ["act_4", "第四幕", "决断与收束", "75% - 100%"]
    ],
    nodes: [
      ["setup", "act_1", "基础铺陈", true],
      ["catalyst", "act_1", "诱发事件", true],
      ["break_into_two", "act_1", "第一转折", true],
      ["reaction", "act_2", "反应段", true],
      ["midpoint", "act_2", "中点翻转", true],
      ["attack", "act_3", "主动进攻", true],
      ["crisis", "act_3", "局势崩塌", true],
      ["finale", "act_4", "高潮对决", true],
      ["final_image", "act_4", "结尾收束", true]
    ]
  }
};

function buildCustomStructure(rawActCount = 2) {
  const actCount = Math.max(1, Math.min(6, Number(rawActCount) || 2));
  const acts = Array.from({ length: actCount }, (_, index) => {
    const start = Math.round((index / actCount) * 100);
    const end = Math.round(((index + 1) / actCount) * 100);
    return [
      `act_${index + 1}`,
      `第 ${index + 1} 幕`,
      index === 0 ? "建立起点" : index === actCount - 1 ? "收束与落点" : "推进变化与转折",
      `${start}% - ${end}%`
    ];
  });
  const nodes = [];
  for (let index = 0; index < actCount; index += 1) {
    const seq = index + 1;
    const actKey = `act_${seq}`;
    nodes.push([
      `segment_${seq}`,
      actKey,
      seq === 1 ? "开端段落" : seq === actCount ? "收束段落" : `第 ${seq} 幕段落`,
      true
    ]);
    if (seq < actCount) {
      nodes.push([`turn_${seq}`, actKey, `第 ${seq} 幕转折`, false]);
    }
  }
  return { acts, nodes, custom_act_count: actCount };
}

function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value, fallback) {
  if (value == null) {
    return structuredClone(fallback);
  }
  return structuredClone(value);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values = []) {
  return [...new Set(list(values).map((item) => String(item ?? "").trim()).filter(Boolean))];
}

function splitWords(value = "") {
  return unique(String(value ?? "").split(/[、,，/｜|]/).map((item) => item.trim()));
}

function storyBibleDefaults(storyBible = {}) {
  return {
    premise: storyBible.premise ?? "",
    core_conflict: storyBible.core_conflict ?? "",
    characters: list(storyBible.characters),
    relationships: list(storyBible.relationships),
    world_rules: list(storyBible.world_rules),
    timeline_events: list(storyBible.timeline_events),
    beats: list(storyBible.beats),
    scene_cards: list(storyBible.scene_cards),
    setup_payoffs: list(storyBible.setup_payoffs)
  };
}

function createStructureProfile(template = "three_act", rhythmOverlay = "save_the_cat", customActCount = 2) {
  const definition =
    template === "custom"
      ? buildCustomStructure(customActCount)
      : STRUCTURES[template] ?? STRUCTURES.three_act;
  const actIds = new Map();
  const acts = definition.acts.map(([key, title, purpose, rangeLabel], index) => {
    const id = makeId("act");
    actIds.set(key, id);
    return { id, key, title, purpose, range_label: rangeLabel, order_index: index + 1 };
  });
  const nodes = definition.nodes.map(([key, actKey, title, required], index) => ({
    id: makeId("node"),
    key,
    act_id: actIds.get(actKey) ?? acts[0]?.id ?? "",
    title,
    node_type: key,
    required,
    order_index: index + 1,
    note: "",
    card_ids: []
  }));
  return {
    template,
    rhythm_overlay: rhythmOverlay,
    custom_act_count: template === "custom" ? Number(definition.custom_act_count ?? customActCount) : acts.length,
    acts,
    nodes
  };
}

function nodeTypeFromSlot(slot = "") {
  const normalized = String(slot).toLowerCase();
  if (normalized.includes("mid")) return "midpoint";
  if (normalized.includes("final") || normalized.includes("climax")) return "finale";
  if (normalized.includes("crisis") || normalized.includes("lost")) return "crisis";
  if (normalized.includes("break_into_three")) return "break_into_three";
  if (normalized.includes("break_into_two") || normalized.includes("act_1_turn") || normalized.includes("first_turn")) return "break_into_two";
  if (normalized.includes("b_story")) return "b_story";
  if (normalized.includes("attack")) return "attack";
  if (normalized.includes("reaction")) return "reaction";
  if (normalized.includes("opening")) return "opening_image";
  if (normalized.includes("catalyst") || normalized.includes("inciting")) return "catalyst";
  return "setup";
}

function templateFromProject(project) {
  if (list(project.story_bible?.beats).some((beat) => beat.framework === "custom")) {
    return "custom";
  }
  const format = project.project?.format;
  if (format === "feature") return "feature_film";
  if (format === "pilot") return "pilot_episode";
  if (format === "series") return "series_season";
  if (format === "short") return "short_form";
  if (format === "micro_drama") return "micro_drama_serial";
  return list(project.story_bible?.beats).some((beat) => beat.framework === "four_act")
    ? "four_act"
    : list(project.story_bible?.beats).some((beat) => beat.framework === "three_act")
      ? "three_act"
      : "feature_film";
}

function deriveCharacterHub(storyBible, existingCharHub = null) {
  // 若已有 character_hub（来自 UI 编辑），优先保留其 UI 字段（name / external_goal 等），
  // 仅当 story_bible 有新条目而 character_hub 没有时才用 story_bible 派生新条目。
  const existingById = new Map(list(existingCharHub?.characters).map((c) => [c.id, c]));
  return {
    characters: list(storyBible.characters).map((character) => {
      const existing = existingById.get(character.id);
      // 任意 UI 字段非空都视为「用户已编辑」→ 保留 character_hub 整条记录
      if (existing && (existing.name || existing.external_goal || existing.dramatic_need || existing.contradiction)) {
        return existing;
      }
      return {
        id: character.id,
        name: character.name,
        story_role: character.story_role,
        external_goal: character.external_want,
        dramatic_need: character.internal_need,
        contradiction: unique([character.psychological_flaw, character.moral_flaw]).join("；"),
        starting_mask: character.public_mask,
        pressure_point: unique([character.wound, character.core_fear]).join("；"),
        arc_start: character.arc_start,
        arc_end: character.arc_end,
        secret: character.secret,
        notes: character.notes ?? "",
        archetype: character.archetype ?? "",
        traits: list(character.traits),
        status: "active",
        linked_plot_ids: []
      };
    }),
    relationship_map: list(storyBible.relationships).map((relationship) => ({
      id: relationship.id,
      source_character_id: relationship.source_character_id,
      target_character_id: relationship.target_character_id,
      relationship_type: relationship.relationship_type,
      tension: relationship.tension,
      power_balance: relationship.power_balance,
      shared_history: relationship.shared_history,
      hidden_information: relationship.hidden_information,
      status: "active",
      related_plot_ids: []
    }))
  };
}

function buildCardsFromStory(project, structureProfile) {
  const beats = list(project.story_bible.beats);
  const scenes = list(project.story_bible.scene_cards);
  const cards = [];
  const nodesByType = new Map();
  const actsById = new Map(structureProfile.acts.map((act) => [act.id, act]));

  for (const node of structureProfile.nodes) {
    if (!nodesByType.has(node.node_type)) {
      nodesByType.set(node.node_type, []);
    }
    nodesByType.get(node.node_type).push(node);
  }

  const pickNode = (type, fallbackActKey = "act_1") => {
    const candidates = nodesByType.get(type) ?? [];
    if (candidates.length > 0) {
      return candidates[0];
    }
    return structureProfile.nodes.find((node) => actsById.get(node.act_id)?.key === fallbackActKey) ?? structureProfile.nodes[0];
  };

  if (beats.length > 0) {
    beats.forEach((beat, index) => {
      const targetNode = pickNode(nodeTypeFromSlot(beat.slot));
      const linkedScenes = scenes.filter((scene) => list(beat.linked_scene_ids).includes(scene.id));
      cards.push({
        id: `plot_${beat.id}`,
        title: beat.purpose?.slice(0, 18) || `剧情卡 ${index + 1}`,
        act_id: targetNode?.act_id ?? structureProfile.acts[0]?.id ?? "",
        node_id: targetNode?.id ?? "",
        type: "mainline",
        status: linkedScenes.length > 0 ? "review" : "draft",
        summary: beat.purpose ?? "",
        dramatic_question: "",
        conflict: linkedScenes.map((scene) => scene.obstacle).filter(Boolean).join("；"),
        change: linkedScenes.map((scene) => scene.value_shift || scene.turn).filter(Boolean).join("；"),
        notes: "",
        character_ids: unique(linkedScenes.map((scene) => scene.pov_character_id)),
        impact_tags: [],
        depends_on: index > 0 ? [`plot_${beats[index - 1].id}`] : [],
        next_ids: index < beats.length - 1 ? [`plot_${beats[index + 1].id}`] : [],
        scene_seed_ids: unique(beat.linked_scene_ids)
      });
    });
  }

  if (cards.length === 0 && scenes.length > 0) {
    scenes.forEach((scene, index) => {
      const targetNode = structureProfile.nodes[Math.min(index, structureProfile.nodes.length - 1)] ?? structureProfile.nodes[0];
      cards.push({
        id: `plot_from_${scene.id}`,
        title: scene.title || `剧情卡 ${index + 1}`,
        act_id: targetNode?.act_id ?? structureProfile.acts[0]?.id ?? "",
        node_id: targetNode?.id ?? "",
        type: "mainline",
        status: "draft",
        summary: scene.goal || scene.turn || "",
        dramatic_question: "",
        conflict: scene.obstacle || "",
        change: scene.value_shift || "",
        notes: "",
        character_ids: scene.pov_character_id ? [scene.pov_character_id] : [],
        impact_tags: unique(scene.production_tags),
        depends_on: index > 0 ? [`plot_from_${scenes[index - 1].id}`] : [],
        next_ids: index < scenes.length - 1 ? [`plot_from_${scenes[index + 1].id}`] : [],
        scene_seed_ids: [scene.id]
      });
    });
  }

  if (cards.length === 0) {
    const protagonistId = list(project.story_bible.characters)[0]?.id ?? "";
    const preferredNode =
      structureProfile.nodes.find((node) => node.node_type === "catalyst") ??
      structureProfile.nodes.find((node) => node.node_type === "setup") ??
      structureProfile.nodes[0];
    cards.push({
      id: makeId("plot"),
      title: "核心剧情卡",
      act_id: preferredNode?.act_id ?? structureProfile.acts[0]?.id ?? "",
      node_id: preferredNode?.id ?? "",
      type: "mainline",
      status: "draft",
      summary: "",
      dramatic_question: "",
      conflict: "",
      change: "",
      notes: "",
      character_ids: protagonistId ? [protagonistId] : [],
      impact_tags: [],
      depends_on: [],
      next_ids: [],
      scene_seed_ids: []
    });
  }

  structureProfile.nodes = structureProfile.nodes.map((node) => ({
    ...node,
    card_ids: cards.filter((card) => card.node_id === node.id).map((card) => card.id)
  }));

  return { structure_profile: structureProfile, plot_board: { cards } };
}

function deriveSceneWorkbench(project, structureProfile, plotBoard) {
  const scenes = list(project.story_bible.scene_cards).map((scene) => {
    const linkedPlotCardIds = list(plotBoard.cards)
      .filter((card) => list(card.scene_seed_ids).includes(scene.id))
      .map((card) => card.id);
    const actId =
      plotBoard.cards.find((card) => linkedPlotCardIds.includes(card.id))?.act_id ??
      structureProfile.acts[0]?.id ??
      "";
    return {
      id: scene.id,
      order_index: scene.order_index,
      title: scene.title,
      act_id: actId,
      linked_plot_card_ids: linkedPlotCardIds,
      pov_character_id: scene.pov_character_id,
      location: scene.location,
      time_of_day: scene.time_of_day,
      purpose: scene.goal,
      obstacle: scene.obstacle,
      beat_summary: unique([scene.turn, scene.value_shift]).join("；"),
      entry_state: scene.input_state,
      exit_state: scene.output_state,
      status: linkedPlotCardIds.length > 0 ? "outline" : "draft",
      script_excerpt: scene.dialogue_seed ?? "",
      script_full: scene.script_full ?? "",
      screenplay_notes: scene.screenplay_notes ?? "",
      notes: scene.emotion_stage ?? ""
    };
  });

  if (scenes.length === 0) {
    scenes.push({
      id: makeId("scene"),
      order_index: 1,
      title: "开场场景",
      act_id: plotBoard.cards[0]?.act_id ?? structureProfile.acts[0]?.id ?? "",
      linked_plot_card_ids: plotBoard.cards[0] ? [plotBoard.cards[0].id] : [],
      pov_character_id: list(project.story_bible.characters)[0]?.id ?? "",
      location: "待定地点",
      time_of_day: "待定",
      purpose: "",
      obstacle: "",
      beat_summary: "",
      entry_state: "",
      exit_state: "",
      status: "draft",
      script_excerpt: "",
      notes: ""
    });
  }

  return { scenes };
}

function relinkStructureCards(project) {
  const cardsByNode = new Map();
  list(project.plot_board?.cards).forEach((card) => {
    if (!cardsByNode.has(card.node_id)) {
      cardsByNode.set(card.node_id, []);
    }
    cardsByNode.get(card.node_id).push(card.id);
  });
  project.structure_profile.nodes = list(project.structure_profile?.nodes).map((node) => ({
    ...node,
    card_ids: cardsByNode.get(node.id) ?? []
  }));
}

function relinkCharacters(project) {
  project.character_hub.characters = list(project.character_hub?.characters).map((character) => ({
    ...character,
    linked_plot_ids: list(project.plot_board?.cards)
      .filter((card) => list(card.character_ids).includes(character.id))
      .map((card) => card.id)
  }));

  project.character_hub.relationship_map = list(project.character_hub?.relationship_map).map((relationship) => ({
    ...relationship,
    related_plot_ids: list(project.plot_board?.cards)
      .filter((card) => {
        const ids = list(card.character_ids);
        return ids.includes(relationship.source_character_id) && ids.includes(relationship.target_character_id);
      })
      .map((card) => card.id)
  }));
}

function syncLegacyStoryBible(project) {
  const previous = storyBibleDefaults(project.story_bible);
  const previousCharacters = new Map(previous.characters.map((item) => [item.id, item]));
  const previousRelationships = new Map(previous.relationships.map((item) => [item.id, item]));
  const previousScenes = new Map(previous.scene_cards.map((item) => [item.id, item]));

  const storyBible = {
    ...previous,
    premise: project.story_core?.premise ?? previous.premise,
    core_conflict: project.story_core?.core_conflict ?? previous.core_conflict,
    characters: list(project.character_hub?.characters).map((character) => {
      const legacy = previousCharacters.get(character.id) ?? {};
      return {
        id: character.id,
        name: character.name ?? legacy.name ?? "",
        story_role: character.story_role ?? legacy.story_role ?? "supporting",
        external_want: character.external_goal ?? legacy.external_want ?? "",
        internal_need: character.dramatic_need ?? legacy.internal_need ?? "",
        psychological_flaw: legacy.psychological_flaw ?? character.contradiction ?? "",
        moral_flaw: legacy.moral_flaw ?? "",
        public_mask: character.starting_mask ?? legacy.public_mask ?? "",
        core_fear: legacy.core_fear ?? "",
        wound: character.pressure_point ?? legacy.wound ?? "",
        arc_start: character.arc_start ?? legacy.arc_start ?? "",
        arc_end: character.arc_end ?? legacy.arc_end ?? "",
        voice_rules: legacy.voice_rules ?? [],
        secret: character.secret ?? legacy.secret ?? ""
      };
    }),
    relationships: list(project.character_hub?.relationship_map).map((relationship) => {
      const legacy = previousRelationships.get(relationship.id) ?? {};
      return {
        id: relationship.id,
        source_character_id: relationship.source_character_id,
        target_character_id: relationship.target_character_id,
        relationship_type: relationship.relationship_type ?? legacy.relationship_type ?? "",
        tension: relationship.tension ?? legacy.tension ?? "",
        power_balance: relationship.power_balance ?? legacy.power_balance ?? "",
        shared_history: relationship.shared_history ?? legacy.shared_history ?? "",
        hidden_information: relationship.hidden_information ?? legacy.hidden_information ?? ""
      };
    }),
    world_rules: clone(project.lock_layer?.projections?.world_rules, previous.world_rules),
    timeline_events: clone(project.lock_layer?.projections?.timeline_events, previous.timeline_events),
    setup_payoffs: clone(project.lock_layer?.projections?.setup_payoffs, previous.setup_payoffs),
    scene_cards: list(project.scene_workbench?.scenes)
      .slice()
      .sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0))
      .map((scene) => {
        const legacy = previousScenes.get(scene.id) ?? {};
        return {
          id: scene.id,
          order_index: scene.order_index ?? legacy.order_index ?? 1,
          title: scene.title ?? legacy.title ?? "",
          pov_character_id: scene.pov_character_id ?? legacy.pov_character_id ?? "",
          location: scene.location ?? legacy.location ?? "",
          time_of_day: scene.time_of_day ?? legacy.time_of_day ?? "",
          goal: scene.purpose ?? legacy.goal ?? "",
          obstacle: scene.obstacle ?? legacy.obstacle ?? "",
          tactic: legacy.tactic ?? "",
          turn: legacy.turn ?? scene.beat_summary ?? "",
          value_shift: legacy.value_shift ?? "",
          new_information: legacy.new_information ?? [],
          input_state: scene.entry_state ?? legacy.input_state ?? "",
          output_state: scene.exit_state ?? legacy.output_state ?? "",
          production_tags: legacy.production_tags ?? [],
          dialogue_seed: scene.script_excerpt ?? legacy.dialogue_seed ?? "",
          emotion_stage: scene.notes ?? legacy.emotion_stage ?? "",
          script_full: scene.script_full ?? legacy.script_full ?? "",
          screenplay_notes: scene.screenplay_notes ?? legacy.screenplay_notes ?? ""
        };
      }),
    beats: list(project.structure_profile?.nodes)
      .filter((node) => node.required || list(node.card_ids).length > 0)
      .map((node) => ({
        id: `beat_${node.id}`,
        framework: project.structure_profile?.template ?? "three_act",
        slot: node.node_type ?? node.key ?? "setup",
        purpose:
          list(project.plot_board?.cards).find((card) => list(node.card_ids).includes(card.id))?.summary ||
          list(project.plot_board?.cards).find((card) => list(node.card_ids).includes(card.id))?.title ||
          node.title,
        linked_scene_ids: list(project.scene_workbench?.scenes)
          .filter((scene) => list(scene.linked_plot_card_ids).some((plotId) => list(node.card_ids).includes(plotId)))
          .map((scene) => scene.id)
      }))
  };

  project.story_bible = storyBible;
  project.project.genre = unique([
    project.genre_profile?.primary_genre,
    ...list(project.genre_profile?.secondary_genres)
  ]);
  project.project.theme_question = project.story_core?.central_question ?? project.project.theme_question ?? "";
  project.project.tone = unique(project.genre_profile?.tone_words).join("、") || project.project.tone || "";
  project.intent_anchor.genre = clone(project.project.genre, []);
  project.lock_layer.locked_plot_ids = list(project.plot_board?.cards)
    .filter((card) => card.status === "locked")
    .map((card) => card.id);
  project.lock_layer.projections = {
    characters: clone(project.character_hub?.characters, []),
    relationships: clone(project.character_hub?.relationship_map, []),
    world_rules: clone(project.lock_layer?.projections?.world_rules, []),
    timeline_events: clone(project.lock_layer?.projections?.timeline_events, []),
    setup_payoffs: clone(project.lock_layer?.projections?.setup_payoffs, [])
  };
}

export function ensurePlotDrivenProject(sourceProject) {
  const project = clone(sourceProject, {});
  project.project = {
    id: project.project?.id ?? makeId("project"),
    title: project.project?.title?.trim() || "新项目",
    format: project.project?.format ?? "feature_or_pilot",
    language: project.project?.language ?? "zh-CN",
    genre: unique(project.project?.genre),
    logline: project.project?.logline ?? "",
    theme_question: project.project?.theme_question ?? "",
    tone: project.project?.tone ?? "",
    status: project.project?.status ?? "development"
  };
  project.intent_anchor = {
    id: project.intent_anchor?.id ?? makeId("anchor"),
    core_idea: project.intent_anchor?.core_idea ?? "",
    theme: project.intent_anchor?.theme ?? "",
    protagonist: project.intent_anchor?.protagonist ?? "",
    arc: project.intent_anchor?.arc ?? "",
    motif: project.intent_anchor?.motif ?? "",
    genre: unique(project.intent_anchor?.genre ?? project.project.genre),
    status: project.intent_anchor?.status ?? "active",
    revisions: list(project.intent_anchor?.revisions)
  };
  project.story_bible = storyBibleDefaults(project.story_bible);
  project.story_core = clone(project.story_core, {
    premise: project.story_bible.premise || project.project.logline || "",
    core_conflict: project.story_bible.core_conflict || "",
    central_question: project.project.theme_question || "",
    emotional_promise: project.project.tone || "",
    theme_statement: project.intent_anchor.theme || "",
    ending_direction: ""
  });
  project.genre_profile = clone(project.genre_profile, {
    primary_genre: project.project.genre[0] ?? "",
    secondary_genres: project.project.genre.slice(1),
    audience_promise: "",
    tone_words: splitWords(project.project.tone),
    conventions: [],
    taboos: []
  });
  // character_hub 从 story_bible 派生，但若已有 character_hub（UI 编辑过的）则保留其 UI 字段，
  // 避免每次 normalize 都把用户在 UI 输入的人物名、外部目标等擦回 story_bible 的旧值。
  // 保留已有的 relationship_map（如果非空）避免覆盖手动添加的关系。
  const derivedHub = deriveCharacterHub(project.story_bible, project.character_hub);
  const existingRelMap = list(project.character_hub?.relationship_map);
  project.character_hub = {
    ...derivedHub,
    relationship_map: existingRelMap.length > 0 ? existingRelMap : derivedHub.relationship_map
  };
  if (!project.structure_profile) {
    // 完全重建结构 + 卡片
    const derived = buildCardsFromStory(project, createStructureProfile(templateFromProject(project)));
    project.structure_profile = derived.structure_profile;
    project.plot_board = derived.plot_board;
  } else if (!project.plot_board) {
    // 已有 structure_profile（保留 finalize 写入的 note 等字段），只补 plot_board
    const derived = buildCardsFromStory(project, project.structure_profile);
    project.structure_profile = derived.structure_profile;
    project.plot_board = derived.plot_board;
  }
  project.scene_workbench = clone(
    project.scene_workbench,
    deriveSceneWorkbench(project, project.structure_profile, project.plot_board)
  );
  // lock_layer.projections 始终从 story_bible 派生（story_bible 是真源）；
  // 保留已有的 locked_plot_ids 避免覆盖用户在剧情开发页的锁定操作
  project.lock_layer = {
    locked_plot_ids: list(project.lock_layer?.locked_plot_ids),
    projections: {
      characters: list(project.character_hub?.characters),
      relationships: list(project.character_hub?.relationship_map),
      world_rules: clone(project.story_bible.world_rules, []),
      timeline_events: clone(project.story_bible.timeline_events, []),
      setup_payoffs: clone(project.story_bible.setup_payoffs, [])
    }
  };
  relinkStructureCards(project);
  relinkCharacters(project);
  syncLegacyStoryBible(project);
  return project;
}

export function rekeyPlotDrivenProject(project, maps) {
  const nextProject = clone(project, {});
  const actIdMap = new Map();
  const nodeIdMap = new Map();
  const plotIdMap = new Map();

  nextProject.structure_profile.acts = list(nextProject.structure_profile?.acts).map((act) => {
    const nextId = makeId("act");
    actIdMap.set(act.id, nextId);
    return { ...act, id: nextId };
  });
  nextProject.structure_profile.nodes = list(nextProject.structure_profile?.nodes).map((node) => {
    const nextId = makeId("node");
    nodeIdMap.set(node.id, nextId);
    return { ...node, id: nextId, act_id: actIdMap.get(node.act_id) ?? node.act_id, card_ids: [] };
  });
  nextProject.plot_board.cards = list(nextProject.plot_board?.cards).map((card) => {
    const nextId = makeId("plot");
    plotIdMap.set(card.id, nextId);
    return {
      ...card,
      id: nextId,
      act_id: actIdMap.get(card.act_id) ?? card.act_id,
      node_id: nodeIdMap.get(card.node_id) ?? card.node_id,
      character_ids: list(card.character_ids).map((characterId) => maps.characterIdMap.get(characterId) ?? characterId),
      depends_on: list(card.depends_on),
      next_ids: list(card.next_ids),
      scene_seed_ids: list(card.scene_seed_ids).map((id) => maps.sceneIdMap.get(id) ?? id)
    };
  });
  nextProject.plot_board.cards = nextProject.plot_board.cards.map((card) => ({
    ...card,
    depends_on: list(card.depends_on).map((id) => plotIdMap.get(id) ?? id),
    next_ids: list(card.next_ids).map((id) => plotIdMap.get(id) ?? id)
  }));
  nextProject.scene_workbench.scenes = list(nextProject.scene_workbench?.scenes).map((scene) => ({
    ...scene,
    act_id: actIdMap.get(scene.act_id) ?? scene.act_id,
    linked_plot_card_ids: list(scene.linked_plot_card_ids).map((id) => plotIdMap.get(id) ?? id),
    pov_character_id: maps.characterIdMap.get(scene.pov_character_id) ?? scene.pov_character_id
  }));
  nextProject.character_hub.relationship_map = list(nextProject.character_hub?.relationship_map).map((relationship) => ({
    ...relationship,
    source_character_id: maps.characterIdMap.get(relationship.source_character_id) ?? relationship.source_character_id,
    target_character_id: maps.characterIdMap.get(relationship.target_character_id) ?? relationship.target_character_id,
    related_plot_ids: list(relationship.related_plot_ids).map((id) => plotIdMap.get(id) ?? id)
  }));
  nextProject.lock_layer.locked_plot_ids = list(nextProject.lock_layer?.locked_plot_ids).map((id) => plotIdMap.get(id) ?? id);
  relinkStructureCards(nextProject);
  relinkCharacters(nextProject);
  syncLegacyStoryBible(nextProject);
  return nextProject;
}

export function summarizeProjectCounts(project) {
  const target = project?.character_hub && project?.scene_workbench && project?.lock_layer
    ? project
    : ensurePlotDrivenProject(project);
  return {
    character_count: list(target.character_hub?.characters).length,
    scene_count: list(target.scene_workbench?.scenes).length,
    setup_count: list(target.lock_layer?.projections?.setup_payoffs).length
  };
}
