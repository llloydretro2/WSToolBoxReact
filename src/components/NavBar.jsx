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
const primaryNavItems = [{ labelKey: "menu.cardSearch", path: "/cardlist" }];

// 开包菜单项（分组到下拉菜单）
const packMenuItems = [
	{ labelKey: "menu.pickPacks", path: "/pick_packs" },
	{ labelKey: "menu.simulator", path: "/simulator" },
];

// 卡组菜单项（分组到下拉菜单）
const deckMenuItems = [
	{ labelKey: "menu.deckCreate", path: "/deck-create" },
	{ labelKey: "menu.deckSearch", path: "/deck-search" },
];

// 用户相关菜单项（与登录状态绑定）
const userNavItems = [{ labelKey: "menu.record", path: "/record" }];

// 对战工具菜单项（分组到下拉菜单）
const battleToolsMenuItems = [
	{ labelKey: "menu.firstSecond", path: "/first_second" },
	{ labelKey: "menu.shuffle", path: "/shuffle" },
	{ labelKey: "menu.dice", path: "/dice" },
	{ labelKey: "menu.chessClock", path: "/chess_clock" },
];

function getAvatarIndexFromUsername(username) {
	const hash = [...username].reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return (hash % 29) + 1;
}

function NavBar() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [deckMenuAnchor, setDeckMenuAnchor] = useState(null);
	const [battleToolsMenuAnchor, setBattleToolsMenuAnchor] = useState(null);
	const [packMenuAnchor, setPackMenuAnchor] = useState(null);
	const { user, logout } = useAuth();
	const isLoggedIn = !!user;
	const { t } = useLocale();

	// 为移动端抽屉创建所有菜单项的列表（包含所有导航项，保持平铺布局）
	const userNavItemsForDrawer = [
		{ labelKey: "menu.record", path: "/record" },
		{ labelKey: "menu.deckCreate", path: "/deck-create" },
		{ labelKey: "menu.deckSearch", path: "/deck-search" },
	];

	const otherNavItems = [
		{ labelKey: "menu.cardSearch", path: "/cardlist" },
		{ labelKey: "menu.pickPacks", path: "/pick_packs" },
		{ labelKey: "menu.simulator", path: "/simulator" },
		{ labelKey: "menu.firstSecond", path: "/first_second" },
		{ labelKey: "menu.shuffle", path: "/shuffle" },
		{ labelKey: "menu.dice", path: "/dice" },
		{ labelKey: "menu.chessClock", path: "/chess_clock" },
	];

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

	// 卡组菜单相关的处理函数
	const handleDeckMenuOpen = (event) => {
		setDeckMenuAnchor(event.currentTarget);
	};
	const handleDeckMenuClose = () => {
		setDeckMenuAnchor(null);
	};

	// 对战工具菜单相关的处理函数
	const handleBattleToolsMenuOpen = (event) => {
		setBattleToolsMenuAnchor(event.currentTarget);
	};
	const handleBattleToolsMenuClose = () => {
		setBattleToolsMenuAnchor(null);
	};

	// 检查卡组菜单中是否有活跃路径
	const isDeckMenuActive = () => {
		return deckMenuItems.some((item) => isActivePath(item.path));
	};

	// 检查对战工具菜单中是否有活跃路径
	const isBattleToolsMenuActive = () => {
		return battleToolsMenuItems.some((item) => isActivePath(item.path));
	};

	// 开包菜单相关的处理函数
	const handlePackMenuOpen = (event) => {
		setPackMenuAnchor(event.currentTarget);
	};
	const handlePackMenuClose = () => {
		setPackMenuAnchor(null);
	};

	// 检查开包菜单中是否有活跃路径
	const isPackMenuActive = () => {
		return packMenuItems.some((item) => isActivePath(item.path));
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
				justifyContent="center"
				sx={{ p: 2, pb: 1 }}>
				<LanguageToggle />
			</Stack>
			<List>
				{userNavItemsForDrawer
					.filter((item) => {
						// hide deck-related items and record in drawer when not logged in
						if (
							!isLoggedIn &&
							item.path &&
							(item.path.startsWith("/deck") || item.path === "/record")
						)
							return false;
						return true;
					})
					.map((item) => {
						const label = item.labelKey ? t(item.labelKey) : "";
						if (!label) return null;
						const isActive = isActivePath(item.path);
						return (
							<ListItemButton
								key={item.labelKey || item.path}
								selected={isActive}
								onClick={() => {
									navigate(item.path);
								}}
								sx={{
									borderRadius: 1,
									mb: 0.5,
									backgroundColor: isActive
										? "rgba(255,255,255,0.25)"
										: "transparent",
									color: isActive ? "var(--text)" : "inherit",
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
										color: isActive ? "var(--text)" : "#ffffff",
									},
								}}>
								<ListItemText primary={label} />
							</ListItemButton>
						);
					})}

				{/* 分割线 */}
				<Box
					sx={{
						borderTop: "1px solid rgba(255,255,255,0.3)",
						my: 1,
						mx: 2,
					}}
				/>

				{otherNavItems.map((item) => {
					const label = item.labelKey ? t(item.labelKey) : "";
					if (!label) return null;
					const isActive = isActivePath(item.path);
					return (
						<ListItemButton
							key={item.labelKey || item.path}
							selected={isActive}
							onClick={() => {
								navigate(item.path);
							}}
							sx={{
								borderRadius: 1,
								mb: 0.5,
								backgroundColor: isActive
									? "rgba(255,255,255,0.25)"
									: "transparent",
								color: isActive ? "var(--text)" : "inherit",
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
									color: isActive ? "var(--text)" : "#ffffff",
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
				sx={{ backgroundColor: "var(--primary)" }}>
				<Toolbar>
					<Box sx={{ display: { xs: "flex", md: "none" }, mr: 2 }}>
						<IconButton
							color="inherit"
							edge="start"
							onClick={toggleDrawer(true)}
							sx={{
								borderRadius: 1,
							}}>
							<MenuIcon />
						</IconButton>
					</Box>
					<Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
						<Typography
							variant="h6"
							component="div"
							onClick={() => navigate("/")}
							sx={{
								cursor: "pointer",
								"&:hover": {
									opacity: 0.8,
								},
							}}>
							{t("title")}
						</Typography>
						<Box sx={{ ml: 2, display: { xs: "none", md: "block" } }}>
							<LanguageToggle />
						</Box>
					</Box>
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
											color: isActive ? "var(--text)" : "inherit",
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

						{/* 开包菜单下拉 */}
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 17 }}>
							<Button
								color="inherit"
								onClick={handlePackMenuOpen}
								endIcon={<ArrowDropDownIcon />}
								sx={{
									ml: 0.75,
									borderRadius: 1,
									fontWeight: isPackMenuActive() ? 600 : 500,
									backgroundColor: isPackMenuActive()
										? "rgba(255,255,255,0.25)"
										: "transparent",
									color: isPackMenuActive() ? "var(--text)" : "inherit",
									transition: "background-color 0.2s ease, color 0.2s ease",
									"&:hover": {
										backgroundColor: isPackMenuActive()
											? "rgba(255,255,255,0.35)"
											: "rgba(255,255,255,0.2)",
									},
								}}>
								{t("menu.pack")}
							</Button>
						</motion.div>
						<Menu
							anchorEl={packMenuAnchor}
							open={Boolean(packMenuAnchor)}
							onClose={handlePackMenuClose}
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
									backgroundColor: "var(--primary)",
									backdropFilter: "blur(10px)",
									border: "1px solid rgba(255,255,255,0.2)",
								},
							}}>
							{packMenuItems.map((item) => {
								const label = item.labelKey ? t(item.labelKey) : "";
								if (!label) return null;
								const isActive = isActivePath(item.path);
								return (
									<MenuItem
										key={item.labelKey || item.path}
										onClick={() => {
											navigate(item.path);
											handlePackMenuClose();
										}}
										sx={{
											fontWeight: isActive ? 600 : 500,
											backgroundColor: isActive
												? "rgba(255,255,255,0.25)"
												: "transparent",
											color: isActive ? "var(--text)" : "#ffffff",
											"&:hover": {
												backgroundColor: "rgba(255,255,255,0.2)",
											},
										}}>
										{label}
									</MenuItem>
								);
							})}
						</Menu>

						{/* 卡组菜单下拉 */}
						{isLoggedIn && (
							<motion.div
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}>
								<Button
									color="inherit"
									onClick={handleDeckMenuOpen}
									endIcon={<ArrowDropDownIcon />}
									sx={{
										ml: 0.75,
										borderRadius: 1,
										fontWeight: isDeckMenuActive() ? 600 : 500,
										backgroundColor: isDeckMenuActive()
											? "rgba(255,255,255,0.25)"
											: "transparent",
										color: isDeckMenuActive() ? "var(--text)" : "inherit",
										transition: "background-color 0.2s ease, color 0.2s ease",
										"&:hover": {
											backgroundColor: isDeckMenuActive()
												? "rgba(255,255,255,0.35)"
												: "rgba(255,255,255,0.2)",
										},
									}}>
									{t("menu.deck")}
								</Button>
							</motion.div>
						)}
						{isLoggedIn && (
							<Menu
								anchorEl={deckMenuAnchor}
								open={Boolean(deckMenuAnchor)}
								onClose={handleDeckMenuClose}
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
										backgroundColor: "var(--primary)",
										backdropFilter: "blur(10px)",
										border: "1px solid rgba(255,255,255,0.2)",
									},
								}}>
								{deckMenuItems.map((item) => {
									const label = item.labelKey ? t(item.labelKey) : "";
									if (!label) return null;
									const isActive = isActivePath(item.path);
									return (
										<MenuItem
											key={item.labelKey || item.path}
											onClick={() => {
												navigate(item.path);
												handleDeckMenuClose();
											}}
											sx={{
												fontWeight: isActive ? 600 : 500,
												backgroundColor: isActive
													? "rgba(255,255,255,0.25)"
													: "transparent",
												color: isActive ? "var(--text)" : "#ffffff",
												"&:hover": {
													backgroundColor: "rgba(255,255,255,0.2)",
												},
											}}>
											{label}
										</MenuItem>
									);
								})}
							</Menu>
						)}

						{/* 对战工具菜单下拉 */}
						<motion.div
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 17 }}>
							<Button
								color="inherit"
								onClick={handleBattleToolsMenuOpen}
								endIcon={<ArrowDropDownIcon />}
								sx={{
									ml: 0.75,
									borderRadius: 1,
									fontWeight: isBattleToolsMenuActive() ? 600 : 500,
									backgroundColor: isBattleToolsMenuActive()
										? "rgba(255,255,255,0.25)"
										: "transparent",
									color: isBattleToolsMenuActive() ? "var(--text)" : "inherit",
									transition: "background-color 0.2s ease, color 0.2s ease",
									"&:hover": {
										backgroundColor: isBattleToolsMenuActive()
											? "rgba(255,255,255,0.35)"
											: "rgba(255,255,255,0.2)",
									},
								}}>
								{t("menu.battleTools")}
							</Button>
						</motion.div>
						<Menu
							anchorEl={battleToolsMenuAnchor}
							open={Boolean(battleToolsMenuAnchor)}
							onClose={handleBattleToolsMenuClose}
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
									backgroundColor: "var(--primary)",
									backdropFilter: "blur(10px)",
									border: "1px solid rgba(255,255,255,0.2)",
								},
							}}>
							{battleToolsMenuItems.map((item) => {
								const label = item.labelKey ? t(item.labelKey) : "";
								if (!label) return null;
								const isActive = isActivePath(item.path);
								return (
									<MenuItem
										key={item.labelKey || item.path}
										onClick={() => {
											navigate(item.path);
											handleBattleToolsMenuClose();
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

					{isLoggedIn ? (
						<Stack
							direction="row"
							spacing={1.5}
							alignItems="center"
							sx={{ ml: 2 }}>
							{/* 用户相关导航项 - 只在桌面端显示 */}
							<Box sx={{ display: { xs: "none", md: "flex" } }}>
								{userNavItems.map((item) => {
									const label = item.labelKey ? t(item.labelKey) : "";
									if (!label) return null;
									const isActive = isActivePath(item.path);
									return (
										<motion.div
											key={item.labelKey || item.path}
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											transition={{
												type: "spring",
												stiffness: 400,
												damping: 17,
											}}>
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
													transition:
														"background-color 0.2s ease, color 0.2s ease",
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
							</Box>

							{/* 卡组下拉菜单 - 仅在已登录时显示（桌面端） */}
							{isLoggedIn && (
								<Box sx={{ display: { xs: "none", md: "block" } }}>
									<motion.div
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										transition={{
											type: "spring",
											stiffness: 400,
											damping: 17,
										}}>
										<Button
											color="inherit"
											onClick={handleDeckMenuOpen}
											endIcon={<ArrowDropDownIcon />}
											sx={{
												ml: 0.75,
												borderRadius: 1,
												fontWeight: isDeckMenuActive() ? 600 : 500,
												backgroundColor: isDeckMenuActive()
													? "rgba(255,255,255,0.25)"
													: "transparent",
												color: isDeckMenuActive() ? "#1b4332" : "inherit",
												transition:
													"background-color 0.2s ease, color 0.2s ease",
												"&:hover": {
													backgroundColor: isDeckMenuActive()
														? "rgba(255,255,255,0.35)"
														: "rgba(255,255,255,0.2)",
												},
											}}>
											{t("menu.deck")}
										</Button>
									</motion.div>
								</Box>
							)}

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
						<Box sx={{ display: "flex", alignItems: "center" }}>
							<Button
								color="inherit"
								sx={{ ml: 1 }}
								onClick={() => navigate("/login")}>
								{t("navbar.login")}
							</Button>
						</Box>
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
