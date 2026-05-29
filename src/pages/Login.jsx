import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocale } from "../contexts/LocaleContext";
import { apiRequest } from "../utils/api.js";

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, severity, onClose }) {
	useEffect(() => {
		if (!message) return;
		const id = setTimeout(onClose, 4000);
		return () => clearTimeout(id);
	}, [message, onClose]);

	if (!message) return null;

	const colors = severity === "success"
		? "bg-[#52b788] text-white"
		: "bg-[#e05c5c] text-white";

	return (
		<div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
		                 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold ${colors}
		                 animate-[fade-in_0.2s_ease]`}>
			{message}
			<button type="button" onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity ml-1">✕</button>
		</div>
	);
}

// ── LoginPage ──────────────────────────────────────────────────────────────────

export default function LoginPage() {
	const { t } = useLocale();
	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isRegister, setIsRegister] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [toast, setToast] = useState({ message: "", severity: "error" });

	const showToast = (message, severity = "error") => setToast({ message, severity });
	const closeToast = () => setToast((s) => ({ ...s, message: "" }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!username || !password) {
			showToast(t("login.error.emptyFields"));
			return;
		}
		try {
			const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
			const response = await apiRequest(endpoint, {
				method: "POST",
				body: JSON.stringify({ username, password }),
			});
			const data = await response.json();

			if (!isRegister) {
				showToast(t("login.success.login"), "success");
				await login({ token: data.token, username: data.user.username, userData: data.user });
				const redirectTo = location.state?.from?.pathname || "/";
				setTimeout(() => navigate(redirectTo, { replace: true }), 1000);
			} else {
				showToast(t("login.success.register"), "success");
				setIsRegister(false);
			}
		} catch (error) {
			showToast(error.message);
		}
	};

	const Icon = isRegister ? UserPlus : LogIn;

	return (
		<>
			<Toast message={toast.message} severity={toast.severity} onClose={closeToast} />

			<div className="min-h-full flex items-center justify-center p-4">
				<div className="w-full max-w-sm">
					<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)]">
						<form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">

							{/* Avatar + Title */}
							<div className="flex flex-col items-center gap-3">
								<div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg">
									<Icon size={28} color="white" />
								</div>
								<h1 className="text-2xl font-black text-[var(--primary)]">
									{isRegister ? t("login.registerTitle") : t("login.title")}
								</h1>
							</div>

							{/* Inputs */}
							<div className="flex flex-col gap-3">
								<div className="relative">
									<User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
									<input
										type="text"
										name="username"
										autoComplete="username"
										placeholder={t("login.username")}
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										className="w-full pl-9 pr-4 py-3 bg-transparent border border-[var(--border)] rounded-xl
										           text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
										           focus:outline-none focus:border-[var(--primary)] transition-colors"
									/>
								</div>
								<div className="relative">
									<Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]" />
									<input
										type={showPassword ? "text" : "password"}
										name="password"
										autoComplete={isRegister ? "new-password" : "current-password"}
										placeholder={t("login.password")}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full pl-9 pr-10 py-3 bg-transparent border border-[var(--border)] rounded-xl
										           text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
										           focus:outline-none focus:border-[var(--primary)] transition-colors"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((v) => !v)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--primary)] hover:opacity-70 transition-opacity">
										{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</div>

							{/* Submit */}
							<button
								type="submit"
								className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm
								           hover:bg-[var(--primary-hover)] hover:-translate-y-0.5 transition-all duration-200
								           shadow-lg">
								{isRegister ? t("login.registerButton") : t("login.loginButton")}
							</button>

							{/* Divider */}
							<div className="flex items-center gap-3">
								<div className="flex-1 border-t border-[var(--border)]" />
								<span className="text-xs font-medium text-[var(--primary)] bg-[var(--card-background)] px-2 py-0.5 rounded-full border border-[var(--border)]">
									{t("login.or")}
								</span>
								<div className="flex-1 border-t border-[var(--border)]" />
							</div>

							{/* Switch mode */}
							<div className="text-center flex flex-col gap-1.5">
								<p className="text-sm text-[var(--text-secondary)]">
									{isRegister ? t("login.hasAccount") : t("login.noAccount")}
								</p>
								<button
									type="button"
									onClick={() => setIsRegister((v) => !v)}
									className="text-sm font-bold text-[var(--primary)] hover:opacity-70 transition-opacity">
									{isRegister ? t("login.switchToLogin") : t("login.switchToRegister")}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</>
	);
}
