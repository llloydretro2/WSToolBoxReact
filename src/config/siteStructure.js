export const SITE_SECTIONS = [
	{
		key: "ws",
		label: "Weiss Schwarz",
		labelKey: "pages.home.ws.name",
		descKey: "pages.home.ws.desc",
		accent: "#4f9b78",
		homeImage: "/assets/home/ws.webp",
		defaultPath: "/ws/cards",
		nav: [
			{ type: "link", labelKey: "menu.cardSearch", path: "/ws/cards" },
			{ type: "link", labelKey: "menu.pickPacks", path: "/ws/packs" },
			{ type: "link", labelKey: "menu.simulator", path: "/ws/simulator" },
			{ type: "link", labelKey: "menu.shuffle", path: "/ws/shuffle" },
			{ type: "link", labelKey: "menu.audio", path: "/ws/audio" },
			{
				type: "link",
				labelKey: "menu.record",
				path: "/ws/record",
				authRequired: true,
			},
		],
	},
	{
		key: "mahjong",
		labelKey: "pages.home.mahjong.name",
		descKey: "pages.home.mahjong.desc",
		accent: "#d26a6a",
		homeImage: "/assets/home/mahjong.webp",
		defaultPath: "/mahjong/trainer",
		nav: [
			{
				type: "link",
				labelKey: "menu.mahjongTrainer",
				path: "/mahjong/trainer",
			},
			{
				type: "link",
				labelKey: "menu.mahjongEfficiency",
				path: "/mahjong/efficiency",
			},
			{
				type: "link",
				labelKey: "menu.mahjongCentrepiece",
				path: "/mahjong/centrepiece",
			},
		],
	},
	{
		key: "tools",
		labelKey: "pages.home.tools.name",
		descKey: "pages.home.tools.desc",
		accent: "#5b84d6",
		homeImage: "/assets/home/tools.webp",
		defaultPath: "/tools/first-second",
		nav: [
			{
				type: "link",
				labelKey: "menu.firstSecond",
				path: "/tools/first-second",
			},
			{ type: "link", labelKey: "menu.dice", path: "/tools/dice" },
			{ type: "link", labelKey: "menu.chessClock", path: "/tools/clock" },
		],
	},
];

export const LEGACY_REDIRECTS = [
	{ from: "/cardlist", to: "/ws/cards" },
	{ from: "/pick_packs", to: "/ws/packs" },
	{ from: "/simulator", to: "/ws/simulator" },
	{ from: "/record", to: "/ws/record" },
	{ from: "/audio", to: "/ws/audio" },
	{ from: "/first_second", to: "/tools/first-second" },
	{ from: "/ws/first-second", to: "/tools/first-second" },
	{ from: "/mahjong", to: "/mahjong/trainer" },
	{ from: "/dice", to: "/tools/dice" },
	{ from: "/chess_clock", to: "/tools/clock" },
	{ from: "/shuffle", to: "/ws/shuffle" },
	{ from: "/mahjong/centerpiece", to: "/mahjong/centrepiece" },
];

export function getSectionByPath(pathname) {
	return (
		SITE_SECTIONS.find((section) =>
			pathname.startsWith(`/${section.key}`)
		) ?? null
	);
}

export function flattenNavItems(nav, includeAuth = false) {
	return nav.flatMap((item) => {
		if (item.authRequired && !includeAuth) return [];
		if (item.type === "group") {
			return item.items.filter((child) => !child.authRequired || includeAuth);
		}
		return [item];
	});
}

export function getHomeChips(section, includeAuth = false) {
	return flattenNavItems(section.nav, includeAuth).map((item) => item.labelKey);
}
