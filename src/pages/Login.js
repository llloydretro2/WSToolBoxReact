import React, { useState } from "react";
import { Box, Button, TextField, Typography, Container } from "@mui/material";
import { Dialog } from "@mui/material";

const RAILWAY_BACKEND_URL =
	"https://wstoolboxbackend-production.up.railway.app";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

function LoginPage({ onLogin }) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isRegister, setIsRegister] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [showDialog, setShowDialog] = useState(false);

	const handleSubmit = async () => {
		if (!username || !password) {
			setErrorMessage("请输入用户名和密码");
			setShowDialog(true);
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
				onLogin();
			} else {
				setErrorMessage("注册成功，请登录！");
				setShowDialog(true);
				setIsRegister(false);
			}
		} catch (error) {
			setErrorMessage(error.message);
			setShowDialog(true);
		}
	};

	return (
		<>
			<Dialog open={showDialog} onClose={() => setShowDialog(false)}>
				<Box p={3}>
					<Typography variant="h6">{errorMessage}</Typography>
					<Box mt={2} display="flex" justifyContent="flex-end">
						<Button onClick={() => setShowDialog(false)}>关闭</Button>
					</Box>
				</Box>
			</Dialog>
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
