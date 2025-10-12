// 简单的API请求函数，自动处理401错误
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

	try {
		const response = await fetch(url, config);

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
