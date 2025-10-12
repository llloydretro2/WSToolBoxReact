// API端点常量
export const API_ENDPOINTS = {
	// 认证相关
	AUTH: {
		LOGIN: "/api/auth/login",
		REGISTER: "/api/auth/register",
		VERIFY: "/api/auth/verify",
	},

	// 牌组相关
	DECKS: {
		LIST: "/api/decks",
		CREATE: "/api/decks",
		UPDATE: (id) => `/api/decks/${id}`,
		DELETE: (id) => `/api/decks/${id}`,
		GET_BY_ID: (id) => `/api/decks/${id}`,
	},

	// 比赛记录相关
	MATCHES: {
		HISTORY: "/api/matches/history",
		CREATE: "/api/matches",
		DELETE: (id) => `/api/matches/delete/${id}`,
	},

	// 卡牌相关
	CARDS: {
		SEARCH: "/api/cards/search",
		FILTER: "/api/cards/filter",
	},
};

// 错误消息常量
export const ERROR_MESSAGES = {
	AUTH_EXPIRED: "认证已过期，请重新登录",
	NETWORK_ERROR: "网络连接错误，请检查网络设置",
	SERVER_ERROR: "服务器错误，请稍后重试",
	INVALID_TOKEN: "无效的认证信息",
	PERMISSION_DENIED: "权限不足",
};
