# tests/e2e 脚本说明

本目录混有两类脚本：

## 可回归运行的验证脚本（verify-*）

对当前代码有断言价值，修改相关功能后应重跑：

- `verify-persist-fields.mjs` — 人物/关系新字段（traits/mbti/relationship_kind）保存后重载不丢
- `verify-library-back.mjs` — 资料库页返回创作入口 + 顶栏 toggle
- `verify-step-checks.mjs` — 步骤导航 ✓ 跨页面/跨会话一致
- `verify-board-heal.mjs` — 剧情卡归位自愈 + 场景三幕分布
- `verify-softdelete.mjs` — 剧情卡软删除/恢复全链路（板/场景关联/废纸篓）
- `verify-task8.mjs` — 场景名后缀清理 / 成稿口径 / favicon
- `verify-fountain-preview.mjs` — fountain 导出预览

运行方式：先 `node server.js`（端口 4173），再 `node tests/e2e/<脚本>`。

## 历史一次性排查脚本

已于 2026-06-11 清理（git 历史可找回）。新排查请新建脚本。
`quality-lint.mjs` 是正式验收工具：`node tests/e2e/quality-lint.mjs all`，CRITICAL=0 才算过。

截图产物目录（audit-*/、*-shots/、realcheck-10-runs/）已被 .gitignore 排除。
