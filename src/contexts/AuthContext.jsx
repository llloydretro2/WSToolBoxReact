/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { apiRequest } from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [username, setUsername] = useState(null);

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		const storedToken = localStorage.getItem("token");
		const storedUsername = localStorage.getItem("username");

		if (storedToken) {
			// 有本地 token，先把 token 写入 state，然后向后端验证并获取最新用户信息
			setToken(storedToken);
			apiRequest("/api/auth/me")
				.then(async (res) => {
					const data = await res.json();
					setUser(data);
					setUsername(data.username);
					localStorage.setItem("user", JSON.stringify(data));
					localStorage.setItem("username", data.username);
				})
				.catch((err) => {
					// token 无效或请求失败，清除本地登录状态
					setToken(null);
					setUser(null);
					setUsername(null);
					localStorage.removeItem("token");
					localStorage.removeItem("user");
					localStorage.removeItem("username");
					console.warn("自动验证 token 失败：", err.message || err);
				});
		} else {
			if (storedUser) setUser(JSON.parse(storedUser));
			if (storedUsername) setUsername(storedUsername);
		}
	}, []);

	// login: 接收 { token, userData?, username? }
	const login = async ({ token: newToken, userData, username: userName }) => {
		if (!newToken) return;
		// 先保存 token，再向后端验证/获取用户信息
		setToken(newToken);
		localStorage.setItem("token", newToken);

		// 如果后端已经在 login 响应返回了 userData，可以先乐观更新
		if (userData) {
			setUser(userData);
			if (userName) setUsername(userName);
			localStorage.setItem("user", JSON.stringify(userData));
			if (userName) localStorage.setItem("username", userName);
		}

		try {
			const res = await apiRequest("/api/auth/me");
			const data = await res.json();
			setUser(data);
			setUsername(data.username);
			localStorage.setItem("user", JSON.stringify(data));
			localStorage.setItem("username", data.username);
		} catch (err) {
			// 验证失败，清理 token
			setToken(null);
			setUser(null);
			setUsername(null);
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			localStorage.removeItem("username");
			console.warn("登录后验证 token 失败：", err.message || err);
			throw err;
		}
	};

	const logout = () => {
		setUser(null);
		setToken(null);
		setUsername(null);

		localStorage.removeItem("user");
		localStorage.removeItem("token");
		localStorage.removeItem("username");
	};

	// 检查是否已登录
	const isAuthenticated = () => {
		return !!token && !!user;
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				token,
				username,
				login,
				logout,
				isAuthenticated,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

AuthProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);
