import React, { createContext, useState, useEffect, useContext } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [username, setUsername] = useState(null);

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		const storedToken = localStorage.getItem("token");
		const storedUsername = localStorage.getItem("username");

		if (storedUser) setUser(JSON.parse(storedUser));
		if (storedToken) setToken(storedToken);
		if (storedUsername) setUsername(storedUsername);
	}, []);

	const login = ({ userData, token, username }) => {
		setUser(userData);
		setToken(token);
		setUsername(username);

		localStorage.setItem("user", JSON.stringify(userData));
		localStorage.setItem("token", token);
		localStorage.setItem("username", username);
	};

	const logout = () => {
		setUser(null);
		setToken(null);
		setUsername(null);

		localStorage.removeItem("user");
		localStorage.removeItem("token");
		localStorage.removeItem("username");
	};

	return (
		<AuthContext.Provider value={{ user, token, username, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
