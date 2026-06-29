// 连续剧形态插件：把本形态的页面渲染器 / 点击处理器注册进模式注册表。
// orchestrator 遍历注册表分发，core 不再静态 import 这些文件。
import { registerFormatPlugin } from "../../modes/registry.js";
import { renderOverviewPage } from "./overviewPage.js";
import { renderSeriesLibraryPage } from "./libraryPage.js";
import { handleEpisodeClick } from "./episodeHandlers.js";

registerFormatPlugin({
  format: "series",
  pages: [renderOverviewPage, renderSeriesLibraryPage],
  clickHandlers: [handleEpisodeClick]
});
