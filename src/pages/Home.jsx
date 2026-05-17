import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import {
	Container,
	Box,
	Typography,
	Paper,
	Chip,
	Grid,
	IconButton,
	Link,
	Fade,
} from "@mui/material";
import { GitHub as GitHubIcon, Email as EmailIcon } from "@mui/icons-material";
import { useLocale } from "../contexts/LocaleContext";

function GameCard({ name, desc, chips, path, accent, onNavigate }) {
	return (
		<Paper
			onClick={() => onNavigate(path)}
			elevation={0}
			sx={{
				p: 3,
				height: "100%",
				cursor: "pointer",
				border: "1px solid var(--border)",
				borderRadius: 3,
				background: accent
					? "linear-gradient(135deg, var(--primary-light), var(--primary))"
					: "var(--surface)",
				transition: "all 0.25s ease",
				"&:hover": {
					transform: "translateY(-4px)",
					boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
				},
			}}>
			<Typography
				variant="h5"
				fontWeight={700}
				color="var(--text)"
				gutterBottom>
				{name}
			</Typography>
			<Typography
				variant="body2"
				color="text.secondary"
				sx={{ mb: 2, minHeight: 40 }}>
				{desc}
			</Typography>
			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
				{chips.map((chip) => (
					<Chip
						key={chip}
						label={chip}
						size="small"
						sx={{
							backgroundColor: "rgba(255,255,255,0.45)",
							color: "var(--text)",
							fontWeight: 500,
						}}
					/>
				))}
			</Box>
		</Paper>
	);
}

GameCard.propTypes = {
	name: PropTypes.string.isRequired,
	desc: PropTypes.string.isRequired,
	chips: PropTypes.arrayOf(PropTypes.string).isRequired,
	path: PropTypes.string.isRequired,
	accent: PropTypes.bool,
	onNavigate: PropTypes.func.isRequired,
};

function Home() {
	const { t } = useLocale();
	const navigate = useNavigate();

	return (
		<Box sx={{ minHeight: "100%" }}>
			<Box
				sx={{
					color: "var(--text)",
					py: 4,
					textAlign: "center",
				}}>
				<Container maxWidth="md">
					<Fade in timeout={1200}>
						<Typography
							variant="h2"
							fontWeight={900}
							sx={{
								mb: 2,
								color: "var(--text)",
								fontSize: { xs: "2.5rem", md: "3.5rem" },
							}}>
							{t("pages.home.title")}
						</Typography>
					</Fade>
					<Fade in timeout={1400}>
						<Typography
							variant="h5"
							sx={{
								mb: 2,
								opacity: 0.8,
								fontWeight: 300,
								letterSpacing: 1,
								fontSize: { xs: "1.2rem", md: "1.5rem" },
								color: "text.secondary",
							}}>
							{t("pages.home.subtitle")}
						</Typography>
					</Fade>
				</Container>
			</Box>

			<Container maxWidth="md" sx={{ py: 2 }}>
				<Grid container spacing={3} sx={{ mb: 4 }}>
					<Grid size={{ xs: 12, md: 4 }}>
						<Fade in timeout={1000}>
							<Box sx={{ height: "100%" }}>
								<GameCard
									name={t("pages.home.ws.name")}
									desc={t("pages.home.ws.desc")}
									chips={[
										t("menu.cardSearch"),
										t("menu.pack"),
										t("menu.record"),
									]}
									path="/ws/cards"
									accent
									onNavigate={navigate}
								/>
							</Box>
						</Fade>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<Fade in timeout={1200}>
							<Box sx={{ height: "100%" }}>
								<GameCard
									name={t("pages.home.mahjong.name")}
									desc={t("pages.home.mahjong.desc")}
									chips={[t("menu.mahjong")]}
									path="/mahjong/trainer"
									onNavigate={navigate}
								/>
							</Box>
						</Fade>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<Fade in timeout={1400}>
							<Box sx={{ height: "100%" }}>
								<GameCard
									name={t("pages.home.tools.name")}
									desc={t("pages.home.tools.desc")}
									chips={[
										t("menu.dice"),
										t("menu.chessClock"),
									]}
									path="/tools/dice"
									onNavigate={navigate}
								/>
							</Box>
						</Fade>
					</Grid>
				</Grid>

				<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
					<Box sx={{ textAlign: "center", py: 2 }}>
						<Typography
							variant="body2"
							fontWeight={600}
							color="var(--text)"
							sx={{ mb: 1 }}>
							{t("pages.home.contactTitle")}
						</Typography>
						<Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
							<IconButton
								component={Link}
								href="https://github.com/llloydretro2/WSToolBoxReact"
								target="_blank"
								rel="noopener"
								sx={{
									width: 40,
									height: 40,
									background:
										"linear-gradient(135deg, var(--text), var(--text-secondary))",
									color: "white",
									"&:hover": {
										transform: "scale(1.1)",
										boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
									},
									transition: "all 0.3s ease",
								}}>
								<GitHubIcon sx={{ fontSize: 20 }} />
							</IconButton>
							<IconButton
								component={Link}
								href="https://space.bilibili.com/13365744"
								target="_blank"
								rel="noopener"
								sx={{
									width: 40,
									height: 40,
									background:
										"linear-gradient(135deg, var(--info), var(--primary-dark))",
									color: "white",
									"&:hover": {
										transform: "scale(1.1)",
										boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
									},
									transition: "all 0.3s ease",
								}}>
								<img
									src="bilibili.svg"
									alt="Bilibili"
									width={18}
									height={18}
									style={{ filter: "brightness(0) invert(1)" }}
								/>
							</IconButton>
							<IconButton
								component={Link}
								href="mailto:lloydretro2@gmail.com"
								sx={{
									width: 40,
									height: 40,
									background:
										"linear-gradient(135deg, var(--primary), var(--primary-hover))",
									color: "white",
									"&:hover": {
										transform: "scale(1.1)",
										boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
									},
									transition: "all 0.3s ease",
								}}>
								<EmailIcon sx={{ fontSize: 20 }} />
							</IconButton>
						</Box>
					</Box>
				</Box>
			</Container>
		</Box>
	);
}

export default Home;
