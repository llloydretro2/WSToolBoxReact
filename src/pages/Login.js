import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { Box, Button, TextField, Typography, Container } from "@mui/material";
import { Snackbar, Alert } from "@mui/material";

const RAILWAY_BACKEND_URL =
	"https://wstoolboxbackend-production.up.railway.app";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isRegister, setIsRegister] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const handleSubmit = async () => {
		if (!username || !password) {
			setErrorMessage("请输入用户名和密码");
			// removed
			return;
		}

		try {
			const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

			const response = await fetch(`${RAILWAY_BACKEND_URL}${endpoint}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || (isRegister ? "注册失败" : "登录失败")
				);
			}

			const data = await response.json();
			if (!isRegister) {
				localStorage.setItem("token", data.token);
				localStorage.setItem("username", data.user.username);
				setSuccessMessage("登录成功！跳转到首页...");
				setTimeout(() => {
					navigate("/");
				}, 1000);
				login({ token: data.token, username: data.user.username });
			} else {
				setErrorMessage("注册成功，请登录！");
				// removed
				setIsRegister(false);
			}
		} catch (error) {
			setErrorMessage(error.message);
			// removed
		}
	};

	return (
		<>
			<Snackbar
				open={Boolean(errorMessage)}
				autoHideDuration={4000}
				onClose={() => setErrorMessage("")}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					onClose={() => setErrorMessage("")}
					severity="info"
					sx={{ width: "100%" }}
				>
					{errorMessage}
				</Alert>
			</Snackbar>
			<Snackbar
				open={Boolean(successMessage)}
				autoHideDuration={3000}
				onClose={() => setSuccessMessage("")}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					onClose={() => setSuccessMessage("")}
					severity="success"
					sx={{ width: "100%" }}
				>
					{successMessage}
				</Alert>
			</Snackbar>
			<Container maxWidth="sm">
				<Box sx={{ p: 4, mt: 8 }}>
					<Typography variant="h2" align="center" gutterBottom>
						{isRegister ? "注册" : "登录"}
					</Typography>
					<Box display="flex" flexDirection="column" gap={2}>
						<TextField
							label="用户名"
							variant="outlined"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							fullWidth
						/>
						<TextField
							label="密码"
							type="password"
							variant="outlined"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							fullWidth
						/>
						<Button
							variant="contained"
							onClick={handleSubmit}
							sx={{
								backgroundColor: "#a6ceb6",
								"&:hover": { backgroundColor: "#95bfa5" },
							}}
						>
							{isRegister ? "注册" : "登录"}
						</Button>
						<Button variant="text" onClick={() => setIsRegister(!isRegister)}>
							{isRegister ? "已有账号？点击登录" : "没有账号？点击注册"}
						</Button>
					</Box>
				</Box>
			</Container>
		</>
	);
}

export default LoginPage;
