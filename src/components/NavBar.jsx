import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useLocale } from "../contexts/LocaleContext";
import Avatar from "@mui/material/Avatar";
import { Snackbar, Badge, Tooltip } from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { flattenNavItems, getSectionByPath } from "../config/siteStructure";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getAvatarIndex(username) {
	const hash = [...username].reduce((acc, c) => acc + c.charCodeAt(0), 0);
	return (hash % 29) + 1;
}

// ─── Pill style constants ──────────────────────────────────────────────────────

const PILL_BG = "rgba(255, 255, 255, 0.86)";
const PILL_BORDER = "1px solid rgba(166, 206, 182, 0.45)";
const PILL_SHADOW = "0 4px 32px rgba(80,140,106,0.12), 0 1px 6px rgba(0,0,0,0.06)";
const PILL_BLUR = "blur(24px) saturate(180%)";

// ─── Desktop nav button ────────────────────────────────────────────────────────

function NavBtn({ label, isActive, onClick }) {
	return (
		<button
			onClick={onClick}
			className={[
				"px-3.5 py-1.5 rounded-full text-[13px] border-0 cursor-pointer select-none",
				"transition-all duration-150 whitespace-nowrap",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
				isActive ? "font-semibold" : "opacity-60 font-medium hover:opacity-100",
			].join(" ")}
			style={{
				fontFamily: "inherit",
				color: "var(--text)",
				backgroundColor: isActive ? "rgba(166,206,182,0.35)" : "transparent",
			}}>
			{label}
		</button>
	);
}

NavBtn.propTypes = {
	label: PropTypes.string.isRequired,
	isActive: PropTypes.bool,
	onClick: PropTypes.func.isRequired,
};

// ─── Desktop dropdown button ───────────────────────────────────────────────────

function DropBtn({ label, isActive, onClick }) {
	return (
		<button
			onClick={onClick}
			className={[
				"flex items-center gap-0.5 px-3.5 py-1.5 rounded-full text-[13px]",
				"border-0 cursor-pointer select-none",
				"transition-all duration-150 whitespace-nowrap",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
				isActive ? "font-semibold" : "opacity-60 font-medium hover:opacity-100",
			].join(" ")}
			style={{
				fontFamily: "inherit",
				color: "var(--text)",
				backgroundColor: isActive ? "rgba(166,206,182,0.35)" : "transparent",
			}}>
			{label}
			<KeyboardArrowDownIcon style={{ fontSize: 14, opacity: 0.55, marginLeft: 1 }} />
		</button>
	);
}

DropBtn.propTypes = {
	label: PropTypes.string.isRequired,
	isActive: PropTypes.bool,
	onClick: PropTypes.func.isRequired,
};

// ─── Dropdown menu paper styles ────────────────────────────────────────────────

const dropMenuSx = {
	"& .MuiPaper-root": {
		mt: "6px",
		background: "rgba(240, 250, 244, 0.97)",
		backdropFilter: "blur(20px)",
		border: "1px solid rgba(166,206,182,0.4)",
		borderRadius: "14px",
		boxShadow: "0 8px 32px rgba(80,140,106,0.14), 0 2px 8px rgba(0,0,0,0.06)",
		minWidth: 152,
		px: "5px",
		py: "5px",
	},
};

const dropItemSx = (active) => ({
	fontSize: "0.8rem",
	fontWeight: active ? 600 : 400,
	color: "var(--text)",
	borderRadius: "8px",
	backgroundColor: active ? "rgba(166,206,182,0.3)" : "transparent",
	opacity: active ? 1 : 0.65,
	transition: "all 0.12s",
	"&:hover": { backgroundColor: "rgba(166,206,182,0.2)", opacity: 1 },
});

// ─── NavBar ────────────────────────────────────────────────────────────────────

export default function NavBar() {
	const [navMenuAnchors, setNavMenuAnchors] = useState({});
	const [avatarAnchor, setAvatarAnchor] = useState(null);
	const [avatarError, setAvatarError] = useState(false);
	const [loginSnackbar, setLoginSnackbar] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const { user, logout } = useAuth();
	const isLoggedIn = !!user;
	const { t, locale, setLocale } = useLocale();
	const navigate = useNavigate();
	const location = useLocation();

	const currentSection = getSectionByPath(location.pathname);
	const section = currentSection?.key ?? "hub";
	const sectionNav = currentSection?.nav ?? [];

	// Close mobile menu on navigation
	useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

	const isActive = (path) => {
		if (!path) return false;
		if (path === "/") return location.pathname === "/";
		return location.pathname.startsWith(path);
	};

	const chipLabel = currentSection
		? currentSection.label ?? t(currentSection.labelKey)
		: null;

	const displayName = user?.username ?? "";
	const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "?";
	const avatarSrc =
		!avatarError && displayName
			? displayName === "Amon"
				? "/assets/283/6.png"
				: `/assets/283/${getAvatarIndex(displayName)}.png`
			: undefined;

	useEffect(() => { setAvatarError(false); }, [displayName]);

	useEffect(() => {
		if (location.state?.fromDeck) {
			setLoginSnackbar(true);
			window.history.replaceState({}, document.title);
		}
	}, [location]);

	// ── Mobile nav items (flat) ──────────────────────────────────────────────────

	const getMobileItems = () => flattenNavItems(sectionNav, isLoggedIn);

	// ── Desktop nav ──────────────────────────────────────────────────────────────

	const closeNavMenu = (key) => {
		setNavMenuAnchors((anchors) => ({ ...anchors, [key]: null }));
	};

	const renderDesktopNav = () =>
		sectionNav.map((item) => {
			if (item.authRequired && !isLoggedIn) return null;

			if (item.type === "group") {
				const anchor = navMenuAnchors[item.labelKey] ?? null;
				return (
					<React.Fragment key={item.labelKey}>
						<DropBtn
							label={t(item.labelKey)}
							isActive={item.items.some((i) => isActive(i.path))}
							onClick={(e) =>
								setNavMenuAnchors((anchors) => ({
									...anchors,
									[item.labelKey]: e.currentTarget,
								}))
							}
						/>
						<Menu
							anchorEl={anchor}
							open={Boolean(anchor)}
							onClose={() => closeNavMenu(item.labelKey)}
							anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
							transformOrigin={{ vertical: "top", horizontal: "left" }}
							sx={dropMenuSx}>
							{item.items
								.filter((i) => !i.authRequired || isLoggedIn)
								.map((i) => (
									<MenuItem
										key={i.path}
										onClick={() => {
											navigate(i.path);
											closeNavMenu(item.labelKey);
										}}
										sx={dropItemSx(isActive(i.path))}>
										{t(i.labelKey)}
									</MenuItem>
								))}
						</Menu>
					</React.Fragment>
				);
			}

			return (
				<NavBtn
					key={item.path}
					label={t(item.labelKey)}
					isActive={isActive(item.path)}
					onClick={() => navigate(item.path)}
				/>
			);
		});

	// ── Render ───────────────────────────────────────────────────────────────────

	return (
		<>
			{/* Backdrop — closes mobile menu on outside tap */}
			{mobileMenuOpen && (
				<div
					className="fixed inset-0 z-40 md:hidden"
					onClick={() => setMobileMenuOpen(false)}
				/>
			)}

			<header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-3 md:px-8 pt-3 md:pt-4">
				{/* Outer wrapper is relative so the dropdown can anchor to it */}
				<div className="relative max-w-5xl mx-auto">

					{/* ── Primary pill ─────────────────────────────────────────── */}
					<div
						className="pointer-events-auto rounded-2xl md:rounded-full"
						style={{
							background: PILL_BG,
							backdropFilter: PILL_BLUR,
							WebkitBackdropFilter: PILL_BLUR,
							border: PILL_BORDER,
							boxShadow: PILL_SHADOW,
						}}>

						<div className="grid grid-cols-[auto_1fr_auto] items-center h-12 px-3 md:px-5 gap-3">

							{/* LEFT: brand + section chip */}
							<div className="flex items-center gap-2 min-w-0">
								<button
									onClick={() => navigate("/")}
									className="border-0 bg-transparent cursor-pointer p-0 flex-shrink-0"
									style={{ fontFamily: "inherit" }}>
									<span
										className="font-bold text-[15px] md:text-base tracking-tight leading-none hover:opacity-60 transition-opacity duration-150"
										style={{ color: "var(--text)" }}>
										{t("title")}
									</span>
								</button>

								{chipLabel && (
									<span
										className="flex-shrink-0 hidden sm:inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full leading-none"
										style={{
											backgroundColor: "rgba(166,206,182,0.3)",
											color: "var(--text-secondary)",
											letterSpacing: "0.04em",
										}}>
										{chipLabel}
									</span>
								)}
							</div>

							{/* CENTER: desktop nav */}
							<nav className="hidden md:flex items-center justify-center gap-0.5">
								{renderDesktopNav()}
							</nav>

							{/* RIGHT: language + mobile menu toggle + auth */}
							<div className="flex items-center justify-end gap-1.5 md:gap-2">
								{/* Language toggle */}
								<button
									onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
									className="border-0 bg-transparent cursor-pointer px-2 py-1 rounded-lg text-[12px] font-medium transition-all duration-150 opacity-50 hover:opacity-90 select-none"
									style={{ fontFamily: "inherit", color: "var(--text)" }}>
									{locale === "zh" ? "中文" : "EN"}
								</button>

								{/* Mobile menu toggle — only in game sections */}
								{section !== "hub" && (
									<button
										onClick={() => setMobileMenuOpen((o) => !o)}
										className={[
											"md:hidden border-0 cursor-pointer p-1.5 rounded-lg",
											"transition-all duration-150 select-none",
											mobileMenuOpen
												? "opacity-100"
												: "opacity-55 hover:opacity-90",
										].join(" ")}
										style={{
											fontFamily: "inherit",
											color: "var(--text)",
											backgroundColor: mobileMenuOpen
												? "rgba(166,206,182,0.35)"
												: "transparent",
										}}>
										{mobileMenuOpen
											? <CloseIcon style={{ fontSize: 18, display: "block" }} />
											: <MenuIcon style={{ fontSize: 18, display: "block" }} />}
									</button>
								)}

								{/* Auth */}
								{isLoggedIn ? (
									<>
										<Tooltip title={t("navbar.avatarTooltip") || ""} arrow>
											<button
												onClick={(e) => setAvatarAnchor(e.currentTarget)}
												className="flex items-center gap-2 border-0 bg-transparent cursor-pointer p-0 hover:opacity-75 transition-opacity duration-150">
												<Badge
													overlap="circular"
													color="success"
													variant="dot"
													anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
													sx={{
														"& .MuiBadge-badge": {
															height: 8, minWidth: 8, borderRadius: "50%",
															boxShadow: "0 0 0 1.5px rgba(255,255,255,0.86)",
														},
													}}>
													<Avatar
														alt={displayName}
														src={avatarSrc}
														sx={{
															width: 30, height: 30,
															backgroundColor: "rgba(166,206,182,0.4)",
															color: "var(--text)",
															fontWeight: 700,
															fontSize: "0.75rem",
															border: "1.5px solid rgba(166,206,182,0.5)",
														}}
														onError={() => setAvatarError(true)}>
														{avatarInitial}
													</Avatar>
												</Badge>
												<span
													className="hidden md:block text-[13px] font-medium leading-none"
													style={{ color: "var(--text)" }}>
													{displayName}
												</span>
											</button>
										</Tooltip>

										<Menu
											anchorEl={avatarAnchor}
											open={Boolean(avatarAnchor)}
											onClose={() => setAvatarAnchor(null)}
											anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
											transformOrigin={{ vertical: "top", horizontal: "right" }}
											sx={{
												"& .MuiPaper-root": {
													mt: "8px",
													background: "rgba(240,250,244,0.97)",
													backdropFilter: "blur(20px)",
													border: "1px solid rgba(166,206,182,0.4)",
													borderRadius: "14px",
													boxShadow: "0 8px 32px rgba(80,140,106,0.14), 0 2px 8px rgba(0,0,0,0.06)",
													px: "5px", py: "5px",
													minWidth: 132,
												},
											}}>
											<MenuItem
												onClick={() => { logout(); setAvatarAnchor(null); }}
												sx={{
													fontSize: "0.8rem",
													color: "var(--error)",
													borderRadius: "8px",
													transition: "all 0.12s",
													"&:hover": { backgroundColor: "rgba(244,67,54,0.07)" },
												}}>
												{t("navbar.logout")}
											</MenuItem>
										</Menu>
									</>
								) : (
									<button
										onClick={() => navigate("/login")}
										className="border-0 cursor-pointer px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150"
										style={{
											fontFamily: "inherit",
											color: "var(--text)",
											backgroundColor: "rgba(166,206,182,0.25)",
										}}
										onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(166,206,182,0.42)"; }}
										onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(166,206,182,0.25)"; }}>
										{t("navbar.login")}
									</button>
								)}
							</div>
						</div>
					</div>

					{/* ── Mobile dropdown — anchored below the pill ─────────────── */}
					<AnimatePresence>
					{mobileMenuOpen && section !== "hub" && (
						<motion.nav
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{
								height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
								opacity: { duration: 0.15 },
							}}
							className="pointer-events-auto absolute inset-x-0 top-[calc(100%+6px)] rounded-2xl md:hidden overflow-hidden"
							style={{
								background: PILL_BG,
								backdropFilter: PILL_BLUR,
								WebkitBackdropFilter: PILL_BLUR,
								border: PILL_BORDER,
								boxShadow: PILL_SHADOW,
							}}>
							{getMobileItems().map((item, idx) => {
								const active = isActive(item.path);
								return (
									<button
										key={item.path}
										onClick={() => navigate(item.path)}
										className="w-full flex items-center px-4 py-3 text-left border-0 cursor-pointer transition-all duration-150 select-none"
										style={{
											fontFamily: "inherit",
											color: "var(--text)",
											fontSize: "0.875rem",
											fontWeight: active ? 600 : 400,
											backgroundColor: active
												? "rgba(166,206,182,0.28)"
												: "transparent",
											borderTop: idx > 0
												? "1px solid rgba(166,206,182,0.2)"
												: "none",
										}}
										onMouseEnter={(e) => {
											if (!active) e.currentTarget.style.backgroundColor = "rgba(166,206,182,0.12)";
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.backgroundColor = active
												? "rgba(166,206,182,0.28)"
												: "transparent";
										}}>
										{active && (
											<span
												className="w-1 h-4 rounded-full mr-3 flex-shrink-0"
												style={{ backgroundColor: "var(--primary-dark)" }}
											/>
										)}
										{!active && <span className="w-1 mr-3 flex-shrink-0" />}
										{t(item.labelKey)}
									</button>
								);
							})}
						</motion.nav>
					)}
					</AnimatePresence>
				</div>
			</header>

			{/* Spacer */}
			<div className="h-[64px] md:h-[72px]" />

			<Snackbar
				open={loginSnackbar}
				autoHideDuration={3000}
				onClose={() => setLoginSnackbar(false)}
				message={t("navbar.loginPrompt")}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			/>
		</>
	);
}
