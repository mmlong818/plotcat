# 原点编剧系统 MVP

这是一个已经能跑起来的本地应用，不再只是文档和静态原型。

当前这版已经包含：

- `docs/`：项目方法论、产品规格、规则引擎规格和参考分析
- `specs/`：故事圣经与规则检查器的结构化样例
- `index.html` + `app.css` + `src/app.js`：前端工作台
- `server.js`：本地 HTTP 服务入口
- `src/server/`：数据库、项目读写、AI 调用

## 当前能力

现在的应用已经支持：

- 多项目管理
- 项目切换
- 版本快照与历史恢复
- 意图锚点编辑
- 故事圣经编辑
  - 角色
  - 关系
  - 时间线
  - 世界规则
  - 伏笔
- 场景室编辑
- 规则体检
- 专家面板
- 本地 SQLite 数据库存储
- OpenAI 专家建议调用
  - 未配置 API Key 时自动回退到本地建议

## 启动方式

先决条件：

- 已安装 Node.js 24 或更高版本

启动：

1. 在仓库根目录运行 `node server.js`
2. 打开 [http://127.0.0.1:4173](http://127.0.0.1:4173)

也可以运行：

- `cmd /c npm.cmd run check`

这个命令会检查后端模块是否能正常加载。

## AI 接入

有两种方式：

1. 启动服务前设置环境变量 `OPENAI_API_KEY`
2. 打开应用后，在“专家面板”里直接输入 API Key 和模型名，再点“连接 AI”

默认模型是 `gpt-5`。

说明：

- 通过界面输入的 API Key 只保存在当前服务进程里
- 不会写进 SQLite 数据库
- 没有配置 Key 时，专家面板仍然可用，但会回退到本地策略版建议

## 数据存储

运行后会在 `data/` 下生成本地 SQLite 数据库：

- `data/yuandian.db`

数据库会在第一次启动时自动创建。

## 项目结构

- `docs/screenwriting-system-blueprint.md`
  - 方法论蓝图
- `docs/stable-route-mvp-spec.md`
  - 第一版产品规格
- `docs/story-bible-rule-engine-spec.md`
  - 故事圣经和规则引擎规格
- `docs/origin-v2-reference-analysis.md`
  - 你提供的“原点系统”参考分析
- `src/data/defaultProject.js`
  - 样例项目数据
- `src/logic/rules.js`
  - 规则检查逻辑
- `src/logic/experts.js`
  - 本地专家建议逻辑
- `src/server/db.js`
  - SQLite 初始化与事务
- `src/server/repository.js`
  - 项目持久化
- `src/server/ai.js`
  - OpenAI 调用与回退逻辑

## 已验证

已经实际验证过：

- 前端模块可初始化
- 本地服务可启动
- 首页和脚本资源可返回 `200`
- `/api/status`、`/api/projects` 可正常返回
- `/api/projects/:id` 可写回数据库
- `/api/projects/:id/versions` 可创建版本快照
- `/api/projects/:id/versions/:versionId/restore` 可恢复历史版本
- `/api/experts/:id` 在无 Key 时可正常回退到本地建议

## 还没做的部分

当前还没有做这些：

- 协作权限
- 正式剧本排版导出
- 复杂制片预算与排期
- AI 输出的精细改稿流编排

但作为第一版最小可用原型，核心链路已经通了：

项目台 -> 意图锚点 -> 故事圣经 -> 场景卡 -> 规则体检 -> 专家建议 -> 版本快照 -> 数据库存储
