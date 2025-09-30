import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useLocale } from "../contexts/LocaleContext";
import LanguageToggle from "./LanguageToggle";
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
	Stack,
	Tooltip,
	Badge,
} from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useNavigate, useLocation } from "react-router-dom";

// 主要导航项（显示在顶层）
const primaryNavItems = [
	{ labelKey: "menu.home", path: "/" },
	{ labelKey: "menu.cardSearch", path: "/cardlist" },
	{ labelKey: "menu.firstSecond", path: "/first_second" },
	{ labelKey: "menu.shuffle", path: "/shuffle" },
];

// 工具菜单项（分组到下拉菜单）
const toolsMenuItems = [
	{ labelKey: "menu.pickPacks", path: "/pick_packs" },
	{ labelKey: "menu.simulator", path: "/simulator" },
	{ labelKey: "menu.dice", path: "/dice" },
	{ labelKey: "menu.chessClock", path: "/chess_clock" },
];

// 用户相关菜单项
const userNavItems = [
	{ labelKey: "menu.record", path: "/record" },
	{ labelKey: "menu.deck", path: "/deck" },
];

function getAvatarIndexFromUsername(username) {
	const hash = [...username].reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return (hash % 29) + 1;
}

function NavBar() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [toolsMenuAnchor, setToolsMenuAnchor] = useState(null);
	const { user, logout } = useAuth();
	const isLoggedIn = !!user;
	const { t } = useLocale();

	// 为移动端抽屉创建所有菜单项的列表（不包含用户菜单项，因为它们在头像菜单中）
	const allNavItems = [...primaryNavItems, ...toolsMenuItems];

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

	// 工具菜单相关的处理函数
	const handleToolsMenuOpen = (event) => {
		setToolsMenuAnchor(event.currentTarget);
	};
	const handleToolsMenuClose = () => {
		setToolsMenuAnchor(null);
	};

	// 检查工具菜单中是否有活跃路径
	const isToolsMenuActive = () => {
		return toolsMenuItems.some((item) => isActivePath(item.path));
	};

	// Avatar menu state and handlers
	const [anchorEl, setAnchorEl] = useState(null);
	const [avatarError, setAvatarError] = useState(false);
	const displayName = user?.username ?? "";
	const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "?";
	const avatarIndex = displayName ? getAvatarIndexFromUsername(displayName) : 1;
	const avatarSrc =
		!avatarError && displayName
			? displayName === "Amon"
				? "/assets/283/6.png"
				: `/assets/283/${avatarIndex}.png`
			: undefined;

	useEffect(() => {
		setAvatarError(false);
	}, [displayName]);

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
			<Stack
				direction="row"
				justifyContent="flex-end"
				sx={{ p: 2 }}>
				<LanguageToggle />
			</Stack>
			<List>
				{allNavItems.map((item) => {
					const label = item.labelKey ? t(item.labelKey) : "";
					if (!label) return null;
					const isActive = isActivePath(item.path);
					return (
						<ListItemButton
							key={item.labelKey || item.path}
							selected={isActive}
							onClick={() => {
								if (item.path === "/deck" && !isLoggedIn) {
									navigate("/login", { state: { fromDeck: true } });
								} else {
									navigate(item.path);
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
							<ListItemText primary={label} />
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
						{t("title")}
					</Typography>
					<Box sx={{ display: { xs: "none", md: "flex" } }}>
						{/* 主要导航项 */}
						{primaryNavItems.map((item) => {
							const label = item.labelKey ? t(item.labelKey) : "";
							if (!label) return null;
							const isActive = isActivePath(item.path);
							return (
								<motion.div
									key={item.labelKey || item.path}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									transition={{ type: "spring", stiffness: 400, damping: 17 }}>
									<Button
										color="inherit"
										onClick={() => {
											navigate(item.path);
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
										{label}
									</Button>
								</motion.div>
							);
						})}

						{/* 工具菜单下拉 */}
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 17 }}>
							<Button
								color="inherit"
								onClick={handleToolsMenuOpen}
								endIcon={<ArrowDropDownIcon />}
								sx={{
									ml: 0.75,
									borderRadius: 1,
									fontWeight: isToolsMenuActive() ? 600 : 500,
									backgroundColor: isToolsMenuActive()
										? "rgba(255,255,255,0.25)"
										: "transparent",
									color: isToolsMenuActive() ? "#1b4332" : "inherit",
									transition: "background-color 0.2s ease, color 0.2s ease",
									"&:hover": {
										backgroundColor: isToolsMenuActive()
											? "rgba(255,255,255,0.35)"
											: "rgba(255,255,255,0.2)",
									},
								}}>
								{t("menu.tools")}
							</Button>
						</motion.div>
						<Menu
							anchorEl={toolsMenuAnchor}
							open={Boolean(toolsMenuAnchor)}
							onClose={handleToolsMenuClose}
							anchorOrigin={{
								vertical: "bottom",
								horizontal: "left",
							}}
							transformOrigin={{
								vertical: "top",
								horizontal: "left",
							}}
							sx={{
								"& .MuiPaper-root": {
									backgroundColor: "rgba(166, 206, 182, 0.95)",
									backdropFilter: "blur(10px)",
									border: "1px solid rgba(255,255,255,0.2)",
								},
							}}>
							{toolsMenuItems.map((item) => {
								const label = item.labelKey ? t(item.labelKey) : "";
								if (!label) return null;
								const isActive = isActivePath(item.path);
								return (
									<MenuItem
										key={item.labelKey || item.path}
										onClick={() => {
											navigate(item.path);
											handleToolsMenuClose();
										}}
										sx={{
											fontWeight: isActive ? 600 : 500,
											backgroundColor: isActive
												? "rgba(255,255,255,0.25)"
												: "transparent",
											color: isActive ? "#1b4332" : "#ffffff",
											"&:hover": {
												backgroundColor: "rgba(255,255,255,0.2)",
											},
										}}>
										{label}
									</MenuItem>
								);
							})}
						</Menu>
					</Box>
					<Box
						sx={{
							display: { xs: "none", md: "flex" },
							alignItems: "center",
							ml: 2,
						}}>
						<LanguageToggle />
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
						<Stack
							direction="row"
							spacing={1.5}
							alignItems="center"
							sx={{ ml: 2 }}>
							<Tooltip
								title={t("navbar.avatarTooltip") || ""}
								arrow>
								<motion.div
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									transition={{ type: "spring", stiffness: 400, damping: 17 }}>
									<IconButton
										onClick={handleAvatarClick}
										aria-label={t("navbar.avatarTooltip") || "avatar"}
										sx={{
											p: 0,
											borderRadius: "50%",
											boxShadow: "0 6px 14px -8px rgba(0,0,0,0.45)",
										}}>
										<Badge
											overlap="circular"
											color="success"
											variant="dot"
											anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
											sx={{
												"& .MuiBadge-badge": {
													height: 10,
													minWidth: 10,
													borderRadius: "50%",
													boxShadow: "0 0 0 2px rgba(166, 206, 182, 0.4)",
												},
											}}>
											<Avatar
												alt={displayName}
												src={avatarSrc}
												sx={{
													width: 36,
													height: 36,
													backgroundColor: "rgba(166, 206, 182, 0.35)",
													color: "#1b4332",
													fontWeight: 600,
													border: "1px solid rgba(166, 206, 182, 0.6)",
												}}
												onError={() => setAvatarError(true)}>
												{avatarInitial}
											</Avatar>
										</Badge>
									</IconButton>
								</motion.div>
							</Tooltip>
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
								}}>
								<Typography
									variant="body2"
									fontWeight={600}
									color="inherit"
									sx={{ lineHeight: 1.2 }}>
									{displayName}
								</Typography>
								<Typography
									variant="caption"
									color="inherit"
									sx={{
										fontSize: "0.6rem",
										opacity: 0.8,
										lineHeight: 1,
										mt: 0.2,
									}}>
									{t("navbar.clickAvatarHint")}
								</Typography>
							</Box>
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
								}}
								sx={{
									"& .MuiPaper-root": {
										backgroundColor: "rgba(166, 206, 182, 0.95)",
										backdropFilter: "blur(10px)",
										border: "1px solid rgba(255,255,255,0.2)",
									},
								}}>
								{/* 用户菜单项 */}
								{userNavItems.map((item) => {
									const label = item.labelKey ? t(item.labelKey) : "";
									if (!label) return null;
									const isActive = isActivePath(item.path);
									return (
										<MenuItem
											key={item.labelKey || item.path}
											onClick={() => {
												if (item.path === "/deck" && !isLoggedIn) {
													navigate("/login", { state: { fromDeck: true } });
												} else {
													navigate(item.path);
												}
												handleCloseMenu();
											}}
											sx={{
												fontWeight: isActive ? 600 : 500,
												backgroundColor: isActive
													? "rgba(255,255,255,0.25)"
													: "transparent",
												color: isActive ? "#1b4332" : "#ffffff",
												"&:hover": {
													backgroundColor: "rgba(255,255,255,0.2)",
												},
											}}>
											{label}
										</MenuItem>
									);
								})}
								{/* 分隔线 */}
								{userNavItems.length > 0 && (
									<Box
										sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", my: 1 }}
									/>
								)}
								{/* 退出登录 */}
								<MenuItem
									onClick={handleLogout}
									sx={{
										color: "red",
										"&:hover": {
											backgroundColor: "rgba(255,255,255,0.2)",
										},
									}}>
									{t("navbar.logout")}
								</MenuItem>
							</Menu>
						</Stack>
					) : (
						<Button
							color="inherit"
							sx={{ ml: 2 }}
							onClick={() => navigate("/login")}>
							{t("navbar.login")}
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
				message={t("navbar.loginPrompt")}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</>
	);
}

export default NavBar;
