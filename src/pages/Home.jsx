import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
	Container,
	Box,
	Typography,
	Chip,
	Grid,
	IconButton,
	Link,
	Fade,
} from "@mui/material";
import StyleIcon from "@mui/icons-material/Style";
import GridViewIcon from "@mui/icons-material/GridView";
import TuneIcon from "@mui/icons-material/Tune";
import { GitHub as GitHubIcon, Email as EmailIcon } from "@mui/icons-material";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import { SITE_SECTIONS, getHomeChips } from "../config/siteStructure";
import { RECENT_UPDATES, getLocalizedUpdateField } from "../data/recentUpdates";

// ─── Section config ────────────────────────────────────────────────────────────
// chipKeys are derived directly from section nav items.

const SECTION_ICONS = {
	ws: StyleIcon,
	mahjong: GridViewIcon,
	tools: TuneIcon,
};

const SECTIONS = SITE_SECTIONS.map((section) => ({
	...section,
	Icon: SECTION_ICONS[section.key],
	path: section.defaultPath,
}));

// ─── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ section, t, locale, onNavigate }) {
	const { Icon, accent, path, chipKeys, homeImage } = section;

	return (
		<Box
			onClick={() => onNavigate(path)}
			sx={{
				cursor: "pointer",
				borderRadius: 3,
				border: "1px solid var(--border)",
				overflow: "hidden",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				position: "relative",
				backgroundImage: `url('${homeImage}')`,
				backgroundSize: "cover",
				backgroundPosition: "center",
				transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
				"&:hover": {
					transform: "translateY(-5px)",
					boxShadow: `0 16px 40px ${accent}44`,
					borderColor: accent,
				},
				"&:hover .card-overlay": {
					backgroundColor: "rgba(255,255,255,0.44)",
				},
			}}>

			{/* Overlay — keeps text readable over any background image */}
			<Box
				className="card-overlay"
				sx={{
					position: "absolute",
					inset: 0,
					backgroundColor: "rgba(255,255,255,0.58)",
					transition: "background-color 0.2s ease",
				}}
			/>

			{/* Accent bar */}
			<Box sx={{ height: 5, backgroundColor: accent, flexShrink: 0, position: "relative", zIndex: 1 }} />

				{/* Body */}
				<Box sx={{ p: 3, display: "flex", flexDirection: "column", flex: 1, position: "relative", zIndex: 1 }}>

					{/* Icon + title + count */}
					<Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, mb: 1.75 }}>
						<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, minWidth: 0 }}>
							<Box
								sx={{
									width: 42,
									height: 42,
									borderRadius: 2,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: `${accent}18`,
									flexShrink: 0,
								}}>
								<Icon sx={{ fontSize: 22, color: accent }} />
							</Box>
							<Box>
								<Typography
									variant="h6"
									fontWeight={700}
									color="var(--text)"
									sx={{ lineHeight: 1.25, mb: 0.25 }}>
									{t(section.labelKey)}
								</Typography>
								<Typography
									variant="caption"
									sx={{ color: accent, fontWeight: 600, letterSpacing: "0.02em" }}>
									{chipKeys.length}{locale === 'zh' ? ' 个工具' : ` tool${chipKeys.length !== 1 ? 's' : ''}`}
								</Typography>
							</Box>
						</Box>
					</Box>

					{/* Description */}
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2, lineHeight: 1.65, fontSize: "0.825rem", flex: 1 }}>
						{t(section.descKey)}
					</Typography>

					{/* Chips */}
					<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
						{chipKeys.map((chipKey) => (
							<Chip
								key={chipKey}
								label={t(chipKey)}
								size="small"
								variant="outlined"
								sx={{
									fontSize: "0.7rem",
									height: 22,
									backgroundColor: `${accent}14`,
									color: accent,
									fontWeight: 600,
									border: `1px solid ${accent}30`,
								}}
							/>
						))}
					</Box>
				</Box>
		</Box>
	);
}

SectionCard.propTypes = {
	section: PropTypes.shape({
		key: PropTypes.string.isRequired,
		Icon: PropTypes.elementType.isRequired,
		accent: PropTypes.string.isRequired,
		path: PropTypes.string.isRequired,
		labelKey: PropTypes.string.isRequired,
		descKey: PropTypes.string.isRequired,
		homeImage: PropTypes.string.isRequired,
		chipKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
	}).isRequired,
	t: PropTypes.func.isRequired,
	locale: PropTypes.string.isRequired,
	onNavigate: PropTypes.func.isRequired,
};

// ─── Recent updates ───────────────────────────────────────────────────────────

function RecentUpdates({ t, locale }) {
	const updates = RECENT_UPDATES;

	if (updates.length === 0) return null;

	return (
		<Fade in timeout={1000}>
			<Box
				mt={5}
				sx={{
					border: "1px solid var(--border)",
					borderRadius: 3,
					background:
						"linear-gradient(135deg, rgba(255,255,255,0.82), rgba(240,250,244,0.7))",
					backdropFilter: "blur(18px)",
					boxShadow: "0 14px 36px rgba(80,140,106,0.08)",
					overflow: "hidden",
				}}>
				<Box
					sx={{
						height: 4,
						background:
							"linear-gradient(90deg, #4f9b78, #d26a6a, #5b84d6)",
					}}
				/>
				<Box sx={{ p: { xs: 2.5, md: 3 } }}>
					<Typography
						variant="overline"
						sx={{
							color: "var(--text-muted)",
							fontWeight: 800,
							letterSpacing: "0.12em",
						}}>
						{t("pages.home.recentUpdates.eyebrow")}
					</Typography>
					<Typography
						variant="h6"
						fontWeight={800}
						color="var(--text)"
						sx={{ mt: 0.25, mb: 0.75 }}>
						{t("pages.home.recentUpdates.title")}
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ lineHeight: 1.7, mb: 2.25 }}>
						{t("pages.home.recentUpdates.subtitle")}
					</Typography>

					<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
						{updates.map((item, index) => (
							<Box
								key={`${item.date}-${item.title}`}
								sx={{
									display: "grid",
									gridTemplateColumns: { xs: "1fr", sm: "88px 1fr" },
									gap: { xs: 0.5, sm: 2 },
									py: 1.25,
									borderTop: index > 0 ? "1px solid rgba(166,206,182,0.28)" : "none",
								}}>
								<Typography
									variant="caption"
									fontWeight={700}
									sx={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
									{getLocalizedUpdateField(item.date, locale)}
								</Typography>
								<Box>
									<Typography
										variant="body2"
										fontWeight={700}
										color="var(--text)"
										sx={{ mb: 0.25 }}>
										{getLocalizedUpdateField(item.title, locale)}
									</Typography>
									<Typography
										variant="body2"
										color="text.secondary"
										sx={{ lineHeight: 1.65 }}>
										{getLocalizedUpdateField(item.body, locale)}
									</Typography>
								</Box>
							</Box>
						))}
					</Box>
				</Box>
			</Box>
		</Fade>
	);
}

RecentUpdates.propTypes = {
	t: PropTypes.func.isRequired,
	locale: PropTypes.string.isRequired,
};

// ─── Home ──────────────────────────────────────────────────────────────────────

export default function Home() {
	const { t, locale } = useLocale();
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();
	const includeAuth = isAuthenticated();
	const sections = SECTIONS.map((section) => ({
		...section,
		chipKeys: getHomeChips(section, includeAuth),
	}));

	return (
		<Container maxWidth="md" sx={{ py: 3 }}>

			{/* Header */}
			<Fade in timeout={800}>
				<Box textAlign="center" mb={4}>
					<Typography
						variant="h2"
						fontWeight={900}
						color="var(--text)"
						sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 1, letterSpacing: "-0.5px" }}>
						{t("pages.home.title")}
					</Typography>
					<Typography
						variant="body1"
						color="text.secondary"
						sx={{ fontSize: "1rem", opacity: 0.75 }}>
						{t("pages.home.subtitle")}
					</Typography>
				</Box>
			</Fade>

			{/* Section cards */}
			<Grid container spacing={3}>
				{sections.map((section, idx) => (
					<Grid key={section.key} size={{ xs: 12, md: 4 }}>
						<Fade in timeout={600 + idx * 150}>
							<Box sx={{ height: "100%" }}>
								<SectionCard
									section={section}
									t={t}
									locale={locale}
									onNavigate={navigate}
								/>
							</Box>
						</Fade>
					</Grid>
				))}
			</Grid>

			<RecentUpdates t={t} locale={locale} />

			{/* Contact */}
			<Fade in timeout={1100}>
				<Box textAlign="center" mt={8}>
					<Typography
						variant="body2"
						fontWeight={600}
						color="var(--text-muted)"
						mb={1.5}>
						{t("pages.home.contactTitle")}
					</Typography>
					<Box sx={{ display: "flex", justifyContent: "center", gap: 1.5 }}>
						<IconButton
							component={Link}
							href="https://github.com/llloydretro2/WSToolBoxReact"
							target="_blank"
							rel="noopener"
							size="small"
							sx={{
								width: 36, height: 36,
								backgroundColor: "rgba(0,0,0,0.06)",
								color: "var(--text-secondary)",
								"&:hover": { backgroundColor: "rgba(0,0,0,0.12)", transform: "scale(1.1)" },
								transition: "all 0.2s ease",
							}}>
							<GitHubIcon sx={{ fontSize: 18 }} />
						</IconButton>
						<IconButton
							component={Link}
							href="https://space.bilibili.com/13365744"
							target="_blank"
							rel="noopener"
							size="small"
							sx={{
								width: 36, height: 36,
								backgroundColor: "rgba(0,0,0,0.06)",
								color: "var(--text-secondary)",
								"&:hover": { backgroundColor: "rgba(0,0,0,0.12)", transform: "scale(1.1)" },
								transition: "all 0.2s ease",
							}}>
							<img
								src="bilibili.svg"
								alt="Bilibili"
								width={16}
								height={16}
								style={{ opacity: 0.6 }}
							/>
						</IconButton>
						<IconButton
							component={Link}
							href="mailto:lloydretro2@gmail.com"
							size="small"
							sx={{
								width: 36, height: 36,
								backgroundColor: "rgba(0,0,0,0.06)",
								color: "var(--text-secondary)",
								"&:hover": { backgroundColor: "rgba(0,0,0,0.12)", transform: "scale(1.1)" },
								transition: "all 0.2s ease",
							}}>
							<EmailIcon sx={{ fontSize: 18 }} />
						</IconButton>
					</Box>
				</Box>
			</Fade>
		</Container>
	);
}
