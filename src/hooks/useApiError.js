import { useState, useCallback } from "react";
import { useAuth } from "../contexts/auth.jsx";
import { useLocale } from "../contexts/LocaleContext";

export const useApiError = () => {
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const { logout } = useAuth();
	const { t } = useLocale();

	const handleError = useCallback(
		(error) => {
			console.error("API Error:", error);

			if (
				error.message.includes("认证已过期") ||
				error.message.includes("401")
			) {
				logout();
				setError(t("errors.authExpired"));
				return;
			}

			setError(error.message || t("errors.requestFailed"));
		},
		[logout, t]
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
