export const RECENT_UPDATES = [
	{
		id: "card-search-paused",
		date: {
			zh: "置顶",
			en: "Pinned",
		},
		title: {
			zh: "查卡器暂停更新说明",
			en: "Card Search Updates Are Paused",
		},
		body: {
			zh: "由于武士道官网修改了查卡器，数据抓取方式需要重新调整，所以查卡器目前处于暂停更新状态，最后收录的系列大概是“突击莉莉”。后端现在拿去开 MC 服务器了，资源比较吃紧；加上我最近在专注学习日麻，等我日麻和 MC 玩腻了就回来更新查卡器。",
			en: "Bushiroad changed its official card search site, so the data scraping flow needs to be rebuilt. Card search updates are paused for now; the latest included set is probably Assault Lily. The backend is currently also being used to host a Minecraft server, so resources are tight. I am also focused on learning Riichi Mahjong right now. Once I get tired of Mahjong and Minecraft, I will come back to update the card search data.",
		},
	},
	{
		id: "audio-moved-to-tools",
		date: "2026-05-20",
		title: {
			zh: "音效移入通用工具",
			en: "Audio Moved to General Tools",
		},
		body: {
			zh: "音效面板已从 Weiss Schwarz 分区移动到通用工具分区，旧的 /audio 和 /ws/audio 链接会自动跳转到新的 /tools/audio。",
			en: "The audio board moved from the Weiss Schwarz section to General Tools. Old /audio and /ws/audio links now redirect to /tools/audio.",
		},
	},
	{
		id: "mobile-navbar-section-state",
		date: "2026-05-20",
		title: {
			zh: "移动端导航优化",
			en: "Mobile Navigation Polish",
		},
		body: {
			zh: "移动端进入 WS、麻将或通用工具子页面时，导航左侧会显示返回箭头和当前分区名，并加入轻量过渡动画，让返回首页和识别当前分区更直观。",
			en: "On mobile section pages, the navbar now shows a back arrow and the current section name with a subtle transition, making it clearer how to return home and where you are.",
		},
	},
	{
		id: "mahjong-centrepiece-mahtools",
		date: "2026-05-20",
		title: {
			zh: "牌桌中枢重做",
			en: "Mahjong Centrepiece Rework",
		},
		body: {
			zh: "牌桌中枢已按 mahtools/riichi-centrepiece 的 3x3 中心盘模式重做：保留座风、局数、本场和轻量设置，并固定在导航栏下方，背景保持透明。",
			en: "The Mahjong centrepiece was rebuilt around the mahtools/riichi-centrepiece 3x3 pattern, keeping seat winds, hand, honba, and lightweight settings below the navbar with a transparent background.",
		},
	},
	{
		id: "site-structure",
		date: "2026-05-19",
		title: {
			zh: "统一网站结构配置",
			en: "Unified Site Structure",
		},
		body: {
			zh: "首页、导航和旧路径重定向已改为读取同一份站点结构配置，后续新增工具会更容易维护。",
			en: "The home page, navigation, and legacy redirects now read from one site structure config, making future tools easier to maintain.",
		},
	},
	{
		id: "mahjong-tools-update",
		date: "2026-05-18",
		title: {
			zh: "麻将工具更新",
			en: "Mahjong Tools Update",
		},
		body: {
			zh: "新增牌理分析页面，役种训练器也补充了更多役种、役满和完成手牌展示。",
			en: "Added the efficiency page, and expanded the yaku trainer with more yaku, yakuman, and completed-hand display.",
		},
	},
	{
		id: "multi-game-hub",
		date: "2026-05-17",
		title: {
			zh: "多游戏首页上线",
			en: "Multi-game Hub",
		},
		body: {
			zh: "网站从单一 WS 工具箱扩展为 Weiss Schwarz、麻将和通用工具三个板块。",
			en: "The site expanded from a WS-only toolbox into three sections: Weiss Schwarz, Mahjong, and general tools.",
		},
	},
];

export function getLocalizedUpdateField(value, locale) {
	if (typeof value === "string") return value;
	return value?.[locale] ?? value?.zh ?? "";
}
