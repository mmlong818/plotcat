# 剧情主线驱动数据模型规格

## 1. 目标

这套数据模型服务于新的创作主链：

- 幕
- 必要节点
- 剧情卡
- 场

并同时满足两个前提：

1. 角色是一级对象，可以先于剧情存在，也可以反向影响剧情。
2. 类型片是一级约束层，会影响结构、节奏、桥段和观众期待。

## 2. 设计原则

### 原则 1：剧情卡是创作期主对象

创作过程中，用户首先操作的是剧情卡，而不是故事圣经字段。

### 原则 2：角色与剧情是双向联动

角色变化要能影响剧情卡，剧情卡锁定后也要反向沉淀角色变化。

### 原则 3：锁定层是投影层

角色、关系、时间线、规则、伏笔这些内容仍然存在，但它们在第一版里更像被剧情卡“锁定后投影出来的事实层”。

### 原则 4：兼容现有故事圣经

现有的 `story_bible` 结构不直接废弃，而是退为：

- `lock_layer.projections`

这样旧逻辑和新逻辑之间可以平滑过渡。

## 3. 顶层对象

第一版建议的顶层对象如下：

| 顶层对象 | 作用 |
| --- | --- |
| `project` | 项目基础信息 |
| `intent_anchor` | 全局创作锚点 |
| `story_core` | premise、core conflict 等故事总纲 |
| `structure_profile` | 幕、结构模板、节拍模板、必要节点 |
| `genre_profile` | 类型片约束与观众承诺 |
| `character_hub` | 角色与关系网络 |
| `plot_board` | 剧情卡主工作区 |
| `lock_layer` | 锁定后的事实投影层 |
| `scene_workbench` | 场景卡工作区 |

## 4. 核心枚举

### 结构模板

- `three_act`
- `four_act`
- `custom`

### 节奏模板

- `none`
- `save_the_cat`
- `hero_journey`
- `story_circle`
- `custom`

### 剧情卡类型

- `mainline`
- `enhancement`
- `alternate`

### 剧情卡状态

- `draft`
- `exploring`
- `review`
- `locked`
- `discarded`

### 角色状态

- `draft`
- `active`
- `locked`
- `archived`

### 关系状态

- `draft`
- `active`
- `locked`
- `retired`

### 场景状态

- `draft`
- `outline`
- `locked`
- `scripted`

## 5. 顶层对象字段建议

### 5.1 `project`

保留现有基础字段：

- `id`
- `title`
- `format`
- `language`
- `genre`
- `logline`
- `theme_question`
- `tone`
- `status`

### 5.2 `intent_anchor`

继续保留：

- `core_idea`
- `theme`
- `protagonist`
- `arc`
- `motif`
- `genre`
- `revisions`

### 5.3 `story_core`

建议新增并单独抽出：

- `premise`
- `core_conflict`
- `central_question`
- `stakes`
- `ending_direction`

### 5.4 `structure_profile`

这是新的骨架层。

建议字段：

- `template`
- `rhythm_overlay`
- `customization_mode`
- `acts`
- `nodes`
- `coverage_summary`

其中：

#### `acts`

每一幕至少应包含：

- `id`
- `label`
- `purpose`
- `target_ratio`
- `sort_order`
- `status`

#### `nodes`

每个必要节点至少应包含：

- `id`
- `act_id`
- `slot_code`
- `label`
- `required`
- `source`
- `sort_order`
- `goal`
- `status`
- `linked_plot_card_ids`

### 5.5 `genre_profile`

这是类型片约束层。

建议字段：

- `primary_genre`
- `secondary_genres`
- `tone_axis`
- `audience_promise`
- `required_conventions`
- `optional_conventions`
- `taboo_items`
- `pace_profile`
- `notes`

其中：

#### `required_conventions`

每条建议包含：

- `id`
- `label`
- `description`
- `status`
- `linked_plot_card_ids`

### 5.6 `character_hub`

角色层与关系层都放在这里。

#### `characters`

每个角色至少应包含：

- `id`
- `name`
- `function_role`
- `story_role`
- `external_want`
- `internal_need`
- `flaw`
- `wound`
- `secret`
- `stance`
- `arc_start`
- `arc_end`
- `status`
- `linked_plot_card_ids`
- `impacted_plot_card_ids`
- `tags`

#### `relationships`

每段关系至少应包含：

- `id`
- `source_character_id`
- `target_character_id`
- `relationship_type`
- `tension`
- `power_balance`
- `shared_history`
- `hidden_information`
- `status`
- `linked_plot_card_ids`

### 5.7 `plot_board`

这是创作期核心层。

#### `cards`

每张剧情卡至少应包含：

- `id`
- `title`
- `summary`
- `act_id`
- `node_id`
- `type`
- `status`
- `dramatic_function`
- `priority`
- `owner_character_ids`
- `influenced_character_ids`
- `relationship_ids`
- `dependency_ids`
- `blocked_by_ids`
- `leads_to_ids`
- `impact_summary`
- `lock_candidate`
- `scene_count_estimate`
- `notes`

#### `impact_summary`

建议拆成：

- `character_changes`
- `relationship_changes`
- `timeline_changes`
- `rule_changes`
- `setup_changes`

### 5.8 `lock_layer`

这是新系统与旧式故事圣经之间的桥。

建议字段：

- `locked_plot_card_ids`
- `pending_lock_ids`
- `change_requests`
- `projections`

#### `projections`

建议包含：

- `characters`
- `relationships`
- `timeline_events`
- `world_rules`
- `setup_payoffs`
- `story_facts`

说明：

- 第一版里，旧 `story_bible` 可视为这里的可视化结果。
- 之后如果完全迁移，也可以只保留锁定层投影。

### 5.9 `scene_workbench`

场景层从锁定后的剧情卡展开。

建议字段：

- `scene_cards`
- `ordering_mode`
- `unassigned_plot_card_ids`

#### `scene_cards`

每张场景卡至少应包含：

- `id`
- `plot_card_id`
- `act_id`
- `order_index`
- `title`
- `pov_character_id`
- `location`
- `time_of_day`
- `goal`
- `obstacle`
- `turn`
- `value_shift`
- `input_state`
- `output_state`
- `status`

## 6. 推荐的数据库表

如果后面要落 SQLite，第一版建议如下拆表：

### 项目与锚点

- `projects`
- `intent_anchors`
- `anchor_revisions`
- `story_cores`

### 结构层

- `structure_profiles`
- `acts`
- `structure_nodes`

### 类型层

- `genre_profiles`
- `genre_conventions`
- `genre_taboos`

### 角色层

- `characters`
- `character_relationships`

### 剧情层

- `plot_cards`
- `plot_card_links`
- `plot_card_character_links`
- `plot_card_relationship_links`
- `plot_card_impacts`

### 锁定层

- `lock_batches`
- `lock_items`
- `projection_timeline_events`
- `projection_world_rules`
- `projection_setup_payoffs`
- `projection_story_facts`

### 场景层

- `scene_cards`
- `scene_plot_card_links`

## 7. 关键关系

### 关系 1：幕与剧情卡

- 一个幕下可以有多张剧情卡。
- 一张剧情卡必须属于一个幕。

### 关系 2：必要节点与剧情卡

- 一张剧情卡可以挂在一个必要节点上。
- 一个必要节点可以对应多张剧情卡。

### 关系 3：角色与剧情卡

- 一个角色可以关联多张剧情卡。
- 一张剧情卡也可以影响多个角色。

### 关系 4：剧情卡与场景卡

- 一张剧情卡可以拆成一到多场。
- 一场通常以一张主剧情卡为核心，也可以关联辅助剧情卡。

### 关系 5：剧情卡与锁定层

- 只有被锁定的剧情卡才能进入锁定层。
- 锁定层不是新写作对象，而是确认后的事实视图。

## 8. 联动规则建议

### 改幕结构时

系统应：

- 标记失去所属幕的剧情卡
- 标记失去必要节点的剧情卡
- 更新节拍覆盖率

### 改角色时

系统应：

- 标记被该角色驱动的剧情卡
- 标记依赖该角色动机的场景
- 标记可能失效的关系变化

### 改类型约束时

系统应：

- 标记缺失必要桥段
- 标记节奏风险
- 标记不符合类型承诺的剧情卡

### 改剧情卡时

系统应：

- 重算依赖链
- 重算关联角色影响
- 重算锁定层待更新项

## 9. 与现有模型的映射

为了平滑过渡，建议按以下方式映射：

| 现有对象 | 新模型位置 |
| --- | --- |
| `intent_anchor` | 原样保留 |
| `story_bible.premise` | `story_core.premise` |
| `story_bible.core_conflict` | `story_core.core_conflict` |
| `story_bible.characters` | `character_hub.characters` |
| `story_bible.relationships` | `character_hub.relationships` |
| `story_bible.beats` | `structure_profile.nodes` |
| `story_bible.scene_cards` | `scene_workbench.scene_cards` |
| `story_bible.timeline_events` | `lock_layer.projections.timeline_events` |
| `story_bible.world_rules` | `lock_layer.projections.world_rules` |
| `story_bible.setup_payoffs` | `lock_layer.projections.setup_payoffs` |

## 10. 第一版最稳做法

最稳的推进方式不是一次性替换旧系统，而是：

1. 先增加新对象层：结构、类型、剧情卡、角色台。
2. 让锁定层继续输出到现有故事圣经形态。
3. 最后再逐步弱化旧式“故事圣经先编辑”的入口。

这样风险最低，也最容易分阶段落地。
