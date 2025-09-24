import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Avatar from "@mui/material/Avatar";
import {
	AppBar,
	Toolbar,
	IconButton,
	Typography,
	Drawer,
	List,
	ListItemText,
	ListItemButton,
	Box,
	Button,
	Snackbar,
} from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate, useLocation } from "react-router-dom";

const baseNavItems = [
	{ label: "主页", path: "/" },
	{ label: "卡片查询", path: "/cardlist" },
	{ label: "模拟开包", path: "/simulator" },
	{ label: "选择开包", path: "/pick_packs" },
	{ label: "先后攻", path: "/first_second" },
	{ label: "骰子", path: "/dice" },
	{ label: "棋钟", path: "/chess_clock" },
	{ label: "随机洗牌", path: "/shuffle" },
];

const loggedInNavItems = [
	{ label: "记录", path: "/record" },
	{ label: "卡组", path: "/deck" },
];

function getAvatarIndexFromUsername(username) {
	const hash = [...username].reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return (hash % 29) + 1;
}

function NavBar() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const { user, logout } = useAuth();
	const isLoggedIn = !!user;

	const navItems = isLoggedIn
		? [...baseNavItems, ...loggedInNavItems]
		: baseNavItems;

	const navigate = useNavigate();
	const location = useLocation();

	const [showLoginSnackbar, setShowLoginSnackbar] = useState(false);

	const isActivePath = (targetPath) => {
		if (!targetPath) return false;
		if (targetPath === "/") {
			return location.pathname === "/";
		}
		return location.pathname.startsWith(targetPath);
	};

	// Avatar menu state and handlers
	const [anchorEl, setAnchorEl] = useState(null);
	const handleAvatarClick = (event) => {
		setAnchorEl(event.currentTarget);
	};
	const handleCloseMenu = () => {
		setAnchorEl(null);
	};
	const handleLogout = () => {
		logout();
		handleCloseMenu();
	};

	const toggleDrawer = (open) => (event) => {
		if (
			event.type === "keydown" &&
			(event.key === "Tab" || event.key === "Shift")
		) {
			return;
		}
		setDrawerOpen(open);
	};

	useEffect(() => {
		if (location.state?.fromDeck) {
			setShowLoginSnackbar(true);
			// 清除状态，避免返回上一页仍然触发
			window.history.replaceState({}, document.title);
		}
	}, [location]);

	const drawer = (
		<Box
			sx={{ maxWidth: 300, width: "50vw" }}
			role="presentation"
			onClick={toggleDrawer(false)}
			onKeyDown={toggleDrawer(false)}>
			<List>
				{navItems.map((item) => {
					if (!item.label) return null;
					const isActive = isActivePath(item.path);
					return (
						<ListItemButton
							key={item.label}
							selected={isActive}
							onClick={() => {
								if (item.label === "卡组" && !isLoggedIn) {
									navigate("/login", { state: { fromDeck: true } });
								} else {
									window.location.href = item.path;
								}
							}}
							sx={{
								borderRadius: 1,
								mb: 0.5,
								backgroundColor: isActive
									? "rgba(255,255,255,0.25)"
									: "transparent",
								color: isActive ? "#1b4332" : "inherit",
								transition: "background-color 0.2s ease, color 0.2s ease",
								"&:hover": {
									backgroundColor: isActive
										? "rgba(255,255,255,0.35)"
										: "rgba(255,255,255,0.2)",
								},
								"&.Mui-selected": {
									backgroundColor: "rgba(255,255,255,0.25)",
									color: "#1b4332",
								},
								"&.Mui-selected:hover": {
									backgroundColor: "rgba(255,255,255,0.35)",
								},
								"& .MuiListItemText-primary": {
									fontWeight: isActive ? 600 : 500,
									color: isActive ? "#1b4332" : "#ffffff",
								},
							}}>
							<ListItemText primary={item.label} />
						</ListItemButton>
					);
				})}
			</List>
		</Box>
	);

	return (
		<>
			<AppBar
				position="fixed"
				sx={{ backgroundColor: "#a6ceb6" }}>
				<Toolbar>
					<Typography
						variant="h6"
						component="div"
						sx={{ flexGrow: 1 }}>
						WS工具箱
					</Typography>
					<Box sx={{ display: { xs: "none", md: "flex" } }}>
						{navItems.map((item) => {
							if (!item.label) return null;
							const isActive = isActivePath(item.path);
							return (
								<Button
									key={item.label}
									color="inherit"
									onClick={() => {
										if (item.label === "卡组" && !isLoggedIn) {
											navigate("/login", { state: { fromDeck: true } });
										} else {
											window.location.href = item.path;
										}
									}}
									sx={{
										ml: 0.75,
										borderRadius: 1,
										fontWeight: isActive ? 600 : 500,
										backgroundColor: isActive
											? "rgba(255,255,255,0.25)"
											: "transparent",
										color: isActive ? "#1b4332" : "inherit",
										transition: "background-color 0.2s ease, color 0.2s ease",
										"&:hover": {
											backgroundColor: isActive
												? "rgba(255,255,255,0.35)"
												: "rgba(255,255,255,0.2)",
										},
									}}>
									{item.label}
								</Button>
							);
						})}
					</Box>
					<Box sx={{ display: { xs: "flex", md: "none" } }}>
						<IconButton
							color="inherit"
							edge="start"
							onClick={toggleDrawer(true)}>
							<MenuIcon />
						</IconButton>
					</Box>
					{isLoggedIn ? (
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								ml: 2,
							}}>
							<Avatar
								alt={user.username}
								src={
									user.username === "Amon"
										? "/assets/283/6.png"
										: `/assets/283/${getAvatarIndexFromUsername(
												user.username
										  )}.png`
								}
								onClick={handleAvatarClick}
								sx={{ cursor: "pointer", width: 32, height: 32 }}
							/>
							<Menu
								anchorEl={anchorEl}
								open={Boolean(anchorEl)}
								onClose={handleCloseMenu}
								anchorOrigin={{
									vertical: "bottom",
									horizontal: "center",
								}}
								transformOrigin={{
									vertical: "top",
									horizontal: "center",
								}}>
								<MenuItem onClick={handleLogout}>退出登录</MenuItem>
							</Menu>
						</Box>
					) : (
						<Button
							color="inherit"
							sx={{ ml: 2 }}
							onClick={() => (window.location.href = "/login")}>
							登录
						</Button>
					)}
				</Toolbar>
			</AppBar>
			<Toolbar />
			<Drawer
				anchor="left"
				open={drawerOpen}
				onClose={toggleDrawer(false)}
				sx={{
					"& .MuiDrawer-paper": {
						backgroundColor: "rgba(166, 206, 182)", // 自定义背景色
						color: "white", // 自定义文字颜色
					},
					"& .MuiListItemText-root": {
						color: "white",
					},
					"& .MuiButtonBase-root": {
						color: "white",
					},
				}}>
				{drawer}
			</Drawer>
			<Snackbar
				open={showLoginSnackbar}
				autoHideDuration={3000}
				onClose={() => setShowLoginSnackbar(false)}
				message="请先登录后编辑卡组"
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</>
	);
}

export default NavBar;
