// 微短剧形态插件：把本形态的页面渲染器 / 点击处理器 / AI 生成簇注册进模式注册表。
import { registerFormatPlugin } from "../../modes/registry.js";
import { initContext } from "../../handlers/context.js";
import { renderMicroPage } from "./microPage.js";
import { handleMicroClick } from "./microHandlers.js";
import { createMicroGen } from "./microGen.js";

registerFormatPlugin({
  format: "micro_drama",
  pages: [renderMicroPage],
  clickHandlers: [handleMicroClick],
  // wire：core 启动后用核心依赖创建本形态 AI 生成簇并注入 ctx，供本形态 handler 调用。
  // core 不再 import microGen——形态自己拥有并接线。
  wire: ({ render, markDirty }) => { initContext(createMicroGen({ render, markDirty })); }
});
