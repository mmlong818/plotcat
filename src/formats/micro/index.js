// 微短剧形态插件：把本形态的页面渲染器 / 点击处理器注册进模式注册表。
import { registerFormatPlugin } from "../../modes/registry.js";
import { renderMicroPage } from "./microPage.js";
import { handleMicroClick } from "./microHandlers.js";

registerFormatPlugin({
  format: "micro_drama",
  pages: [renderMicroPage],
  clickHandlers: [handleMicroClick]
});
