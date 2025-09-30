import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
	Box,
	Button,
	TextField,
	Typography,
	Container,
	Paper,
	InputAdornment,
	IconButton,
	Divider,
	Chip,
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";
import {
	Person as PersonIcon,
	Lock as LockIcon,
	Visibility,
	VisibilityOff,
	LoginRounded,
	PersonAddRounded,
} from "@mui/icons-material";
import "./Login.css";

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

function LoginPage() {
	const { login } = useAuth();
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isRegister, setIsRegister] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = async () => {
		if (!username || !password) {
			setErrorMessage("请输入用户名和密码");
			// removed
			return;
		}

		try {
			const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

			const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
			// localStorage.setItem("token", data.token);
			// localStorage.setItem("username", data.user.username);

			if (!isRegister) {
				setSuccessMessage("登录成功！跳转到首页...");
				setTimeout(() => {
					navigate("/");
				}, 1000);
				login({
					token: data.token,
					username: data.user.username,
					userData: data.user,
				});
			} else {
				setErrorMessage("注册成功，请登录！");
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
				sx={{ zIndex: 9999, mt: 8 }}>
				<Alert
					onClose={() => setErrorMessage("")}
					severity="warning"
					variant="filled"
					sx={{
						width: "100%",
						borderRadius: 2,
						boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
					}}>
					{errorMessage}
				</Alert>
			</Snackbar>
			<Snackbar
				open={Boolean(successMessage)}
				autoHideDuration={3000}
				onClose={() => setSuccessMessage("")}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
				sx={{ zIndex: 9999, mt: 8 }}>
				<Alert
					onClose={() => setSuccessMessage("")}
					severity="success"
					variant="filled"
					sx={{
						width: "100%",
						borderRadius: 2,
						boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
					}}>
					{successMessage}
				</Alert>
			</Snackbar>
			{/* 主容器 - 正常布局，可滚动 */}
			<Box
				sx={{
					minHeight: "calc(100vh - 64px)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: 2,
				}}>
				<Container maxWidth="sm">
					<Paper
						className="login-card"
						elevation={0}
						sx={{
							borderRadius: 4,
							overflow: "hidden",
							backgroundColor: "rgba(255, 255, 255, 0.6)",
							border: "1px solid rgba(0, 0, 0, 0.1)",
						}}>
						<Box
							className="login-form-container"
							sx={{ p: 4 }}>
							{/* 标题部分 */}
							<Box sx={{ textAlign: "center", mb: 4 }}>
								<Box
									className="login-avatar"
									sx={{
										width: 80,
										height: 80,
										borderRadius: "50%",
										background: "linear-gradient(135deg, #1b4332, #a6ceb6)",
										margin: "0 auto 16px auto",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										boxShadow: "0 8px 25px rgba(27, 67, 50, 0.3)",
									}}>
									{isRegister ? (
										<PersonAddRounded sx={{ fontSize: 40, color: "white" }} />
									) : (
										<LoginRounded sx={{ fontSize: 40, color: "white" }} />
									)}
								</Box>
								<Typography
									className="login-title"
									variant="h4"
									fontWeight={700}
									sx={{
										background: "linear-gradient(135deg, #1b4332, #2d5a3d)",
										backgroundClip: "text",
										WebkitBackgroundClip: "text",
										WebkitTextFillColor: "transparent",
										mb: 1,
									}}>
									{isRegister ? "创建账户" : "欢迎回来"}
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ fontSize: "0.95rem" }}>
									{isRegister
										? "加入我们，开始您的卡牌工具之旅"
										: "登录您的账户以继续使用"}
								</Typography>
							</Box>

							{/* 表单部分 */}
							<Box sx={{ mb: 3 }}>
								<TextField
									className="login-input"
									label="用户名"
									variant="outlined"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									fullWidth
									sx={{ mb: 2.5 }}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<PersonIcon sx={{ color: "#1b4332" }} />
											</InputAdornment>
										),
										sx: {
											borderRadius: 2,
											"& .MuiOutlinedInput-root": {
												"&:hover fieldset": {
													borderColor: "#a6ceb6",
												},
												"&.Mui-focused fieldset": {
													borderColor: "#1b4332",
												},
											},
										},
									}}
									InputLabelProps={{
										sx: {
											"&.Mui-focused": {
												color: "#1b4332",
											},
										},
									}}
								/>
								<TextField
									className="login-input"
									label="密码"
									type={showPassword ? "text" : "password"}
									variant="outlined"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									fullWidth
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<LockIcon sx={{ color: "#1b4332" }} />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													onClick={() => setShowPassword(!showPassword)}
													edge="end"
													sx={{ color: "#1b4332" }}>
													{showPassword ? <VisibilityOff /> : <Visibility />}
												</IconButton>
											</InputAdornment>
										),
										sx: {
											borderRadius: 2,
											"& .MuiOutlinedInput-root": {
												"&:hover fieldset": {
													borderColor: "#a6ceb6",
												},
												"&.Mui-focused fieldset": {
													borderColor: "#1b4332",
												},
											},
										},
									}}
									InputLabelProps={{
										sx: {
											"&.Mui-focused": {
												color: "#1b4332",
											},
										},
									}}
								/>
							</Box>

							{/* 主按钮 */}
							<Button
								className="login-button"
								variant="contained"
								onClick={handleSubmit}
								fullWidth
								size="large"
								sx={{
									borderRadius: 2.5,
									py: 1.5,
									fontSize: "1.1rem",
									fontWeight: 600,
									background: "linear-gradient(135deg, #1b4332, #2d5a3d)",
									boxShadow: "0 8px 25px rgba(27, 67, 50, 0.3)",
									"&:hover": {
										background: "linear-gradient(135deg, #2d5a3d, #1b4332)",
										transform: "translateY(-2px)",
									},
									mb: 3,
								}}>
								{isRegister ? "立即注册" : "登录账户"}
							</Button>

							{/* 分割线 */}
							<Divider sx={{ my: 3 }}>
								<Chip
									label="或者"
									size="small"
									sx={{
										backgroundColor: "rgba(27, 67, 50, 0.1)",
										color: "#1b4332",
										fontWeight: 500,
									}}
								/>
							</Divider>

							{/* 切换按钮 */}
							<Box sx={{ textAlign: "center" }}>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1 }}>
									{isRegister ? "已经有账户了？" : "还没有账户？"}
								</Typography>
								<Button
									variant="text"
									onClick={() => setIsRegister(!isRegister)}
									sx={{
										color: "#1b4332",
										fontWeight: 600,
										textTransform: "none",
										fontSize: "1rem",
										"&:hover": {
											backgroundColor: "rgba(27, 67, 50, 0.1)",
											transform: "scale(1.02)",
										},
										transition: "all 0.2s ease",
									}}>
									{isRegister ? "点击登录" : "创建新账户"}
								</Button>
							</Box>
						</Box>
					</Paper>
				</Container>
			</Box>
		</>
	);
}

export default LoginPage;
