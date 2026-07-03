// 连续剧形态插件：把本形态的页面渲染器 / 点击处理器 / AI 生成簇注册进模式注册表。
// orchestrator 遍历注册表分发，core 不再静态 import 这些文件。
import { registerFormatPlugin } from "../../modes/registry.js";
import { initContext } from "../../handlers/context.js";
import { renderOverviewPage } from "./overviewPage.js";
import { renderSeriesLibraryPage } from "./libraryPage.js";
import { handleEpisodeClick } from "./episodeHandlers.js";
import { createSeriesGen } from "./seriesGen.js";

registerFormatPlugin({
  format: "series",
  pages: [renderOverviewPage, renderSeriesLibraryPage],
  clickHandlers: [handleEpisodeClick],
  // wire：core 启动后注入本形态 AI 生成簇（本季分集设计）到 ctx。
  wire: ({ render, markDirty }) => { initContext(createSeriesGen({ render, markDirty })); }
});
