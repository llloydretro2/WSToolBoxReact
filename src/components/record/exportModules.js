// 导出战绩卡时可勾选的模块清单。
// Record.jsx（勾选列表）与 StatsCard.jsx（渲染顺序）共用，label 各自用 t() 现取。
export const EXPORT_MODULE_IDS = [
	{ id: "overview",   type: "half" },
	{ id: "streak",     type: "half" },
	{ id: "bestStreak", type: "half" },
	{ id: "goesFirst",  type: "half" },
	{ id: "topDecks",   type: "half" },
	{ id: "bestDeck",   type: "half" },
	{ id: "hardestOpp", type: "half" },
	{ id: "easiestOpp", type: "half" },
	{ id: "topTags",    type: "half" },
	{ id: "trend",      type: "full" },
];
