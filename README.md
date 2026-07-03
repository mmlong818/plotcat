# 原点编剧系统

本地运行的 AI 辅助编剧工作台。从一句话概念到成稿剧本的完整创作链路：

项目向导 → 意图锚点 → 故事圣经 → 结构/剧情板 → 场景 → 剧本生成 → 规则体检 → 专家面板 → 版本快照

## 功能

- **五种作品形态**：电影长片、试播集、连续剧（季/集结构 + 跨集支线）、短片、微短剧
- **新建项目向导**：AI 补全概念候选、蓝图字段，可逐字段重写
- **故事圣经**：角色、关系、时间线、世界规则、伏笔
- **剧情板与场景室**：结构模板（三幕/四幕/自定义）、剧情卡、场景展开、写本
- **规则体检**：一致性、弧光追踪、视觉母题等自动检查
- **专家面板**：结构、对白、潜台词、节奏等 10 个专家视角
- **多项目管理 + 版本快照**：本地 SQLite 存储，可回滚历史版本
- **多模型接入**：默认智谱 GLM（glm-5.2），支持 Claude（CLI 订阅 / API）、OpenAI（gpt-5.4）、Gemini 及任意 OpenAI 兼容端点（DeepSeek/Kimi/Qwen/Ollama…）；未配置模型时自动回退到本地策略建议

## 启动

先决条件：Node.js 24+（使用内置 `node:sqlite`，无需额外数据库）。

```
node server.js
```

打开 http://127.0.0.1:4173 即可使用。Windows 也可以用 `pnpm start`（走 `start-server.ps1`）。

## AI 接入

两种方式：

1. **界面配置（推荐）**：打开应用 → 设置 → 选择模型服务商 → 粘贴 API Key → 选择模型 → 连接。连接时会做一次微型生成验证，坏 key 当场报错。支持保存多套连接一键切换。
2. **环境变量**：启动前设置 `LLM_PROVIDER`（`zhipu`/`claude_cli`/`anthropic`/`openai`/`gemini`/`custom`）及对应的 key：`ZHIPU_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `LLM_API_KEY`（配 `LLM_BASE_URL`）。

`claude_cli` 使用本机已登录的 claude CLI（订阅计费），无需 API Key。

### 关于 API Key 的存储（请务必了解）

- 通过界面输入的 API Key 会**明文保存在本地 SQLite 数据库**（`data/yuandian.db`）中，重启后无需重新粘贴。这是单机本地工具的有意设计：数据库就在你自己的磁盘上。
- 环境变量来源的 key 不落库。
- 服务只监听 `127.0.0.1`，不对局域网/公网开放。
- **不要把 `data/` 目录（尤其是 `.db` 文件）分享或上传**——`.gitignore` 已默认排除。

## 数据存储

首次启动自动在 `data/yuandian.db` 创建本地 SQLite 数据库，所有项目数据、版本快照、模型连接配置都在这一个文件里。

## 测试与质量门禁

```
npm test          # 单元测试
npm run check     # 后端模块加载检查
npm run smoke     # API 冒烟测试（需服务未启动，脚本自起）
npm run gates     # 三道架构门禁：形态条件 / 形态边界 / action 基线
```

## 许可证

[PolyForm Noncommercial 1.0.0](./LICENSE)：允许个人使用、学习、修改和非商业分发；**不允许任何商业用途**。
