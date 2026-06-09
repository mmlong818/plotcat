# 源点编剧系统（yuandian-screenwriting-system）

AI 辅助编剧系统，帮助编剧创作剧本。

## 技术栈
- Node.js + ES Module
- 服务端：server.js
- 数据库：本地 SQLite（db.js）

## 启动
```
pnpm start          # PowerShell 启动脚本
node server.js      # 直接启动
```

## 核心模块
- `src/server/db.js` — 数据库
- `src/server/repository.js` — 数据仓储
- `src/server/ai.js` — AI 调用层
