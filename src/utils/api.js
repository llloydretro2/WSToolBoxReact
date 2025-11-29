// 简单的API请求函数，自动处理401错误
// 使用 VITE_BACKEND_URL 环境变量作为后端基地址，回退到 https://api.cardtoolbox.org
const BACKEND_URL =
	import.meta.env.VITE_BACKEND_URL || "https://api.cardtoolbox.org";

export const apiRequest = async (url, options = {}) => {
	const token = localStorage.getItem("token");

	const config = {
		headers: {
			"Content-Type": "application/json",
			...(token && { Authorization: `Bearer ${token}` }),
			...options.headers,
		},
		...options,
	};

	// 如果传入的是相对路径（以 /api 开头），则自动加上后端基地址
	const fullUrl = /^https?:/.test(url) ? url : `${BACKEND_URL}${url}`;

	try {
		const response = await fetch(fullUrl, config);

		// 如果是401错误，自动清除认证信息并跳转登录
		if (response.status === 401) {
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			localStorage.removeItem("username");
			window.location.href = "/login";
			throw new Error("认证已过期，请重新登录");
		}

		if (!response.ok) {
			throw new Error(`HTTP错误: ${response.status}`);
		}

		return response;
	} catch (error) {
		console.error("API请求错误:", error);
		throw error;
	}
};
