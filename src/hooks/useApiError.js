import { useState, useCallback } from "react";
import { useAuth } from "../contexts/auth.jsx";

export const useApiError = () => {
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const { logout } = useAuth();

	const handleError = useCallback(
		(error) => {
			console.error("API Error:", error);

			// 如果是认证错误，自动登出
			if (
				error.message.includes("认证已过期") ||
				error.message.includes("401")
			) {
				logout();
				setError("登录已过期，请重新登录");
				return;
			}

			// 设置错误消息
			setError(error.message || "操作失败，请重试");
		},
		[logout]
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const executeWithErrorHandling = useCallback(
		async (apiCall) => {
			setLoading(true);
			setError(null);

			try {
				const result = await apiCall();
				return result;
			} catch (error) {
				handleError(error);
				throw error; // 重新抛出错误以便调用者处理
			} finally {
				setLoading(false);
			}
		},
		[handleError]
	);

	return {
		error,
		loading,
		clearError,
		handleError,
		executeWithErrorHandling,
	};
};
