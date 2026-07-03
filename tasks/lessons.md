# 经验沉淀（lessons）

## 子代理审计结论必须实证复核后再修（2026-06-10）

**现象**：并行派出的代码审查代理报告「人物新字段持久化丢失（CRITICAL）」「资料库按钮死按钮」，但实测：字段经 `project_documents.document_json` 整体 JSON 持久化完全正常（审查代理只看了 SQL 列，不知道存在文档表兜底）；资料库是整页切换而非弹层（走查代理只断言了 `dialog[open]`）。8 条结论中 2 条是误报。

**规则**：审计/走查代理的结论是「线索」不是「事实」。每条修复前先用 API/Playwright 做最小复现实验，确认现象真实存在、根因与报告一致，再动手。Iron Law：不调查不修。

## 内容级矛盾的修复范式：正典块 + rater_directives 定向重生成（2026-06-10）

剧本里的人名分裂/地点漂移/数字打架，机械替换只能解决无歧义词（林秋→沈砚秋）；
有歧义的（"母亲"既是 cue 又是叙述词）用行锚定正则；逻辑性矛盾（时间链、地点设定）
则写一段【全剧正典设定】共用块 + 每场专属 directive 存进 scene.rater_directives，
逐场调 scene_script 重生成后清空指令。重生成后必须正则复核越界关键词（如校园元素/
旧地名）是否归零，不能只看生成成功。

## 全链路断链优先查「字段没传」而非「逻辑写错」（2026-06-10）

剧情板空板、场景全挂第一幕、人物名两套并存——三个看似独立的大问题，根因全是**生成端少传字段**：创作流程造卡片漏了 `act_id/type/lane_id`、生成故事点的 projectCtx 漏了 `character_hub`。修复模式：① 生成端补字段；② normalize 里加自愈迁移（node 是 act 真相源、关联卡是场景 act 真相源）让旧数据自动修复；③ prompt 加硬约束兜底。

## 持有跨 render 的对象引用会变成孤儿（2026-05-31）

**现象**：结构骨架「一键生成故事点」AI 返回正确（node_type 键齐全、内容正确），但生成后 appState 里节点的 title/note 完全没变，落库的是模板默认值。

**根因**：`ensurePlotDrivenProject`（经 `relinkStructureCards`、`buildCardsFromStory`）每次都用 `{...node}` 展开把 `structure_profile.nodes` 重建成**全新对象数组**。`handleGenStructureNotes` 在循环外只抓了一次 `allNodes` 引用，循环内每次 `render()` 都会触发重建，于是这些引用全部变成孤儿对象，`applyNodeData` 改的是已脱离 appState 的死对象。

**修复**：先聚合所有幕的生成结果到一个 map，循环结束后按 `node_type` 从**当前 live** `appState.project.structure_profile.nodes` 重新查到节点再写入，最后 normalize+render 一次。`handleGenNodeNote` 同理——gen 后按 id 重新查 live 节点。

**通用规则**：任何"先拿引用 → 中间 render()/normalize → 再写回"的流程都危险。normalize 会重建数组。要么 render 后按 id/type 重新查活对象，要么聚合后一次性写回。不要跨 render 边界持有节点引用。
