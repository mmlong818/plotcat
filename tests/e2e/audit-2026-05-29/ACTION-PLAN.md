# 统一行动计划

## Phase 1 — 设计令牌系统（基础，无此不破其余）

**色板**（保留暖色基调但拉开对比）
- 背景 `--surface-0: #FAF6EE`（页面底）
- 卡片 `--surface-1: #FFFFFF`（卡/抽屉/模态）
- 输入 `--surface-2: #FAF3E4`（input/textarea）
- 边框 `--border: #E5D9BC` / `--border-strong: #D4C2A0`
- 文本 `--ink-1: #1B1813` / `--ink-2: #5C5247` / `--muted: #8A7E6D`
- 主橙 `--accent: #C9651F`（仅主 CTA 用 filled，其余 ghost/text）
- 状态色 `--success: #2F7D5F` / `--warning: #B17319` / `--danger: #B43E2F`

**字号阶梯（4 档）**
- xs 12px / sm 14px / base 16px / lg 20px / xl 24px / hero 32px

**间距网格（8px base）**：4 / 8 / 12 / 16 / 24 / 32 / 48

**圆角**：xs 4 / sm 6 / md 8 / lg 12，按钮/卡/输入统一 md(8)

**阴影**：sm `0 1px 2px rgba(0,0,0,.04)` / md `0 4px 12px rgba(0,0,0,.06)` / lg `0 12px 32px rgba(0,0,0,.12)`

## Phase 2 — 全局组件

1. button 系统：`.btn-primary`（filled accent） / `.btn-ghost` / `.btn-text` / `.btn-danger`（hover 才红） + size sm/md
2. input 统一：白底 1px border + focus ring 2px accent-soft
3. chip 选中态：filled `--ink-1` + 白字（未选 ghost border）
4. section header 统一：`13px/600` + 上 24px margin + 下 1px hairline
5. modal 遮罩：`rgba(20,15,8,.55) + blur(8px)` + 右上 × + ESC 关闭
6. nav 重排：step chip 左对齐 + utility cluster 右对齐 + 48px gap + 1px 分隔
7. 删除/导出 改 ghost-danger（hover 红）

## Phase 3 — 页面级（按优先级）

**项目中心**：
- 检查 max-width bug
- 卡片"继续创作"hover 才浮现
- 分区标题升级 18/600 + 32px margin
- 卡片 footer：最后编辑时间 + 进度

**创建向导**：modal 720px + 横排 3 卡 220×220 + 遮罩 + ×

**结构骨架**：stepper 单行；三幕色带 `#FFF1E0/#EEF4FA/#ECF5EE` + 4px 左色条；节拍卡 tag 改元信息；待填虚线提升对比；"故事核心"折叠

**人物核心**：删冗余 story_role 字段（标题旁 role chip）；MBTI/马斯洛改明显 accordion；section 标题升级；chip 对比度修复

**剧情开发**：卡片 200/12padding/14-600 标题/12-400/60% 正文/16gap；幕色带视觉层级；卡片 chip 移底部

**剧情卡抽屉**：背景升白；画布加遮罩；表单字段节奏 20px

**关系张力**：关系类型按 4 组分组；右侧 30% 空白利用

**场景拆解**：修响应式 bug（1920 → 480）；空状态优化

**剧本撰写**：4 统计卡 → 单行 metric bar；行高 1.65；人物名 uppercase + tracking；数字千分位

## Phase 4 — QA 验证

重新截图全站 → spawn 验证 agent → 新发现问题 = 0 才视为通过
