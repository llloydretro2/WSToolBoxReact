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

// ─── Section config ────────────────────────────────────────────────────────────

const SECTIONS = [
	{
		key: "ws",
		Icon: StyleIcon,
		accent: "#5c4f6b",   // 深紫玫瑰，来自 WS 图片的石板蓝紫调
		path: "/ws/cards",
		chipKeys: ["menu.cardSearch", "menu.pack", "menu.record"],
	},
	{
		key: "mahjong",
		Icon: GridViewIcon,
		accent: "#5a3f45",   // 深暖棕炭，来自麻将图片的暗调
		path: "/mahjong/trainer",
		chipKeys: ["menu.mahjong"],
	},
	{
		key: "tools",
		Icon: TuneIcon,
		accent: "#7a6552",   // 深暖褐，来自 Tools 图片的沙漠色调
		path: "/tools/first-second",
		chipKeys: ["menu.firstSecond", "menu.dice", "menu.chessClock"],
	},
];

// ─── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ section, t, onNavigate }) {
	const { key, Icon, accent, path, chipKeys } = section;

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
				backgroundImage: `url('/assets/home/${key}.webp')`,
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
				<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
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
							{t(`pages.home.${key}.name`)}
						</Typography>
						<Typography
							variant="caption"
							sx={{ color: accent, fontWeight: 600, letterSpacing: "0.02em" }}>
							{t(`pages.home.${key}.count`)}
						</Typography>
					</Box>
				</Box>

				{/* Description */}
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mb: 2.5, lineHeight: 1.65, fontSize: "0.825rem", flex: 1 }}>
					{t(`pages.home.${key}.desc`)}
				</Typography>

				{/* Chips */}
				<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
					{chipKeys.map((chipKey) => (
						<Chip
							key={chipKey}
							label={t(chipKey)}
							size="small"
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
		chipKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
	}).isRequired,
	t: PropTypes.func.isRequired,
	onNavigate: PropTypes.func.isRequired,
};

// ─── Home ──────────────────────────────────────────────────────────────────────

export default function Home() {
	const { t } = useLocale();
	const navigate = useNavigate();

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
				{SECTIONS.map((section, idx) => (
					<Grid key={section.key} size={{ xs: 12, md: 4 }}>
						<Fade in timeout={600 + idx * 150}>
							<Box sx={{ height: "100%" }}>
								<SectionCard
									section={section}
									t={t}
									onNavigate={navigate}
								/>
							</Box>
						</Fade>
					</Grid>
				))}
			</Grid>

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
