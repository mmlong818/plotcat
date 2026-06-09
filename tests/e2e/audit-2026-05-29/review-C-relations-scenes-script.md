# 评审 C：关系/场景/剧本 + 全局一致性

| 页面 | 评分 |
|------|------|
| 关系张力 | 4.5/10 |
| 场景拆解 | 3/10 (响应式 bug) |
| 剧本撰写 | 6.5/10 |
| 项目中心 (二次审) | 3.5/10 |

## P0

- **场景拆解页 & 项目中心在 1920px 视口下渲染成 ~480px** — CSS max-width / container query 配置错误，桌面端不该触发。全站强制 desktop min-width 1280px 审计。
- 剧本撰写顶部 4 个统计卡数字 40px 巨大但语义价值低，吃 140px 垂直空间 → 单行 metric bar ≤ 56px。
- 项目卡删除/导出按钮橙底白字 → 破坏性操作改 ghost + 图标 + hover 红。
- 关系张力页右侧 30% 视宽空白，表单挤在 1020px 内 → 卡片上限提到 1440 或加可视化。

## P1

- 关系类型 14 个胶囊扁平等权 → 按"恋爱/家庭/职场/对抗" 4 组分组。
- 场景列表条目无场景名预览，仅 #01 + 幕节信息 → 双行：场景名 14/600 + 11/灰幕节。
- 剧本撰写行间距 1.4 太紧 → 1.65；人物名 uppercase + tracking。
- 数字缺千分位 → `Intl.NumberFormat('zh-CN')`。
- 项目卡缺最后编辑时间 / 进度条 → footer `最后编辑 2 小时前 · 24/24 场已成稿`。

## P2

- 等宽字体 EXT./人物名无区分
- AI 写本场和模板等权 → AI 改 filled
- 右上多个 ghost 按钮中"全本预览"用了 filled 抢 ship action

## 全局一致性（10 大问题）

1. **导航栏过载**：7 step + 5 utility 单行 → step 左对齐 + utility 归右上 cluster + 保存独立 sticky bar
2. **主橙色滥用**：每屏 5+ filled → ≤ 1 个 filled primary
3. **背景色阶混乱**：底 `#F5EFE0` / 卡片 `#F8F1DF` / 输入 `#F3EBD8` / 选中 `#F5E9C8` 四档差异 <5% → 重设 `底 #F5EFE0 → 卡片 #FFFFFF → 输入 #FAF6EC`
4. **章节标题 11px 比 label 12px 还小**反层级 → 统一 13/600
5. **空状态用灰色文字占位** 重复 ≥ 3 次 → dashed border + icon + 单按钮
6. **响应式断点错误**：1920px 下场景/项目中心被压 480px
7. **数字/单位缺千分位**
8. **按钮形态 5 种混用** → primary filled / secondary ghost / tertiary text / destructive icon
9. **utility 按钮缺图标**：本地服务/已同步/保存视觉扫描是同一文字带
10. **品牌识别弱**：标题外全 sans → 剧本/标题引入思源宋体衬线，UI chrome 用 sans
