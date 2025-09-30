import React, { useState, useEffect } from "react";
import {
	Box,
	Button,
	Container,
	Typography,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Paper,
	Stack,
	Divider,
	Chip,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import { useLocale } from "../contexts/LocaleContext";

const formatTime = (seconds) => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(
		remainingSeconds
	).padStart(2, "0")}`;
};

function ChessClock() {
	const [p1Time, setP1Time] = useState("00:00");
	const [p2Time, setP2Time] = useState("00:00");
	const [side, setSide] = useState(1);
	const [isRunning, setIsRunning] = useState(false);
	const [p1Seconds, setP1Seconds] = useState(0);
	const [p2Seconds, setP2Seconds] = useState(0);
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const { t } = useLocale();

	useEffect(() => {
		const saved = localStorage.getItem("chessclock");
		if (!saved) {
			return;
		}
		try {
			const parsed = JSON.parse(saved);
			if (typeof parsed.p1Seconds === "number") {
				setP1Seconds(parsed.p1Seconds);
				setP1Time(formatTime(parsed.p1Seconds));
			}
			if (typeof parsed.p2Seconds === "number") {
				setP2Seconds(parsed.p2Seconds);
				setP2Time(formatTime(parsed.p2Seconds));
			}
			if (parsed.side === 1 || parsed.side === 2) {
				setSide(parsed.side);
			}
			if (typeof parsed.isRunning === "boolean") {
				setIsRunning(parsed.isRunning);
			}
		} catch (error) {
			console.error("Failed to parse chess clock settings", error);
		}
	}, []);

	useEffect(() => {
		if (!isRunning) return;

		const interval = setInterval(() => {
			if (side === 1) {
				setP1Seconds((prev) => prev + 1);
			} else {
				setP2Seconds((prev) => prev + 1);
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [isRunning, side]);

	useEffect(() => {
		setP1Time(formatTime(p1Seconds));
		setP2Time(formatTime(p2Seconds));
	}, [p1Seconds, p2Seconds]);

	useEffect(() => {
		localStorage.setItem(
			"chessclock",
			JSON.stringify({
				p1Seconds,
				p2Seconds,
				side,
				isRunning,
			})
		);
	}, [p1Seconds, p2Seconds, side, isRunning]);

	const activeSide = isRunning ? side : null;
	const totalSeconds = p1Seconds + p2Seconds;
	const totalTime = formatTime(totalSeconds);
	const activePlayerLabel = t("pages.chessClock.playerLabel", { index: side });
	const statusChipLabel = isRunning
		? t("pages.chessClock.statusRunning", { player: activePlayerLabel })
		: t("pages.chessClock.statusPaused");

	const GREEN_MAIN = "#a6ceb6";
	const GREEN_DARK = "#95bfa5";
	const GREEN_TEXT = "#1b4332";
	const ACCENT_RED = "#760f10";
	const ACCENT_RED_DARK = "#5c0f10";

	const handlePlayerTap = (targetSide) => {
		setSide(targetSide);
		setIsRunning(true);
	};

	const togglePause = () => {
		setIsRunning((prev) => !prev);
	};

	const handleSwitchSide = () => {
		setSide((prev) => (prev === 1 ? 2 : 1));
		setIsRunning(true);
	};

	const handleResetAll = () => {
		setIsRunning(false);
		setSide(1);
		setP1Seconds(0);
		setP2Seconds(0);
		setP1Time("00:00");
		setP2Time("00:00");
		setShowResetConfirm(false);
		localStorage.removeItem("chessclock");
	};

	const pauseLabel = isRunning
		? t("pages.chessClock.pauseButton")
		: t("pages.chessClock.resumeButton");

	return (
		<Box
			sx={{
				minHeight: "100vh",
				mt: 4,
			}}>
			<Container maxWidth="md">
				{/* 页面标题和副标题 */}
				<Stack
					spacing={1.5}
					alignItems="center"
					sx={{ mb: 4 }}>
					<Typography
						variant="h4"
						fontWeight={700}
						color="#1b4332">
						{t("pages.chessClock.title")}
					</Typography>
					<Typography
						variant="body1"
						color="text.secondary"
						align="center">
						{t("pages.chessClock.subtitle")}
					</Typography>
					<Chip
						label={statusChipLabel}
						color={isRunning ? "error" : "default"}
						size="small"
						sx={{
							backgroundColor: isRunning
								? "rgba(118, 15, 16, 0.12)"
								: "rgba(166, 206, 182, 0.22)",
							color: isRunning ? "#5c0f10" : "#1b4332",
						}}
					/>
				</Stack>

				<Paper
					elevation={10}
					sx={{
						p: { xs: 3, md: 5 },
						borderRadius: 4,
						backgroundColor: "rgba(255, 255, 255, 0)",
						border: "1px solid rgba(166, 206, 182, 0.45)",
						boxShadow: "0 32px 80px -48px rgba(74, 141, 112, 0.45)",
					}}>
					<Stack spacing={{ xs: 3, md: 4 }}>
						<Divider
							flexItem
							light
						/>

						<Stack spacing={{ xs: 2, md: 3 }}>
							{[1, 2].map((playerId) => {
								const isActive = activeSide === playerId;
								const playerLabel = t("pages.chessClock.playerLabel", {
									index: playerId,
								});
								const playerTime = playerId === 1 ? p1Time : p2Time;
								return (
									<Paper
										key={`clock-player-${playerId}`}
										component="button"
										type="button"
										onClick={() => handlePlayerTap(playerId)}
										elevation={isActive ? 8 : 3}
										sx={{
											width: "100%",
											borderRadius: 3,
											p: { xs: 2.5, md: 3.5 },
											textAlign: "left",
											cursor: "pointer",
											border: `1px solid ${
												isActive
													? "rgba(118, 15, 16, 0.38)"
													: "rgba(166, 206, 182, 0.4)"
											}`,
											backgroundColor: isActive
												? "rgba(166, 206, 182, 0.38)"
												: "rgba(255, 255, 255, 0.94)",
											boxShadow: isActive
												? "0 26px 48px -32px rgba(118, 15, 16, 0.55)"
												: "0 24px 48px -32px rgba(76, 175, 80, 0.35)",
											transition: "all 0.3s ease",
											borderStyle: "solid",
											"&:hover": {
												boxShadow: "0 30px 60px -35px rgba(76, 175, 80, 0.45)",
												transform: "translateY(-2px)",
											},
											"&:focus-visible": {
												outline: "2px solid rgba(118, 15, 16, 0.6)",
												outlineOffset: 2,
											},
										}}>
										<Stack
											direction="row"
											justifyContent="space-between"
											alignItems="center"
											spacing={2}>
											<Stack spacing={0.25}>
												<Typography
													variant="h6"
													fontWeight={600}
													color="#1b4332">
													{playerLabel}
												</Typography>
												<Typography
													variant="body2"
													color="text.secondary">
													{t("pages.chessClock.playerHint")}
												</Typography>
											</Stack>
											<Typography
												variant="h3"
												fontWeight={700}
												color={isActive ? "#5c0f10" : "#1b4332"}>
												{playerTime}
											</Typography>
										</Stack>
										{isActive && (
											<Chip
												label={t("pages.chessClock.activeChip")}
												color="error"
												size="small"
												sx={{ mt: { xs: 2, md: 2.5 } }}
											/>
										)}
									</Paper>
								);
							})}
						</Stack>

						<Divider
							flexItem
							light
						/>

						<Stack
							direction={{ xs: "column", sm: "row" }}
							spacing={2}
							justifyContent="center">
							<Button
								variant="contained"
								startIcon={
									isRunning ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />
								}
								sx={{
									minWidth: 160,
									backgroundColor: isRunning ? "#f6c756" : GREEN_MAIN,
									color: GREEN_TEXT,
									"&:hover": {
										backgroundColor: isRunning ? "#e6b749" : GREEN_DARK,
									},
								}}
								onClick={togglePause}>
								{pauseLabel}
							</Button>
							<Button
								variant="outlined"
								startIcon={<SwapVertRoundedIcon />}
								sx={{
									minWidth: 160,
									borderColor: GREEN_MAIN,
									color: GREEN_TEXT,
									"&:hover": {
										borderColor: GREEN_DARK,
										backgroundColor: "rgba(149, 191, 165, 0.12)",
									},
								}}
								onClick={handleSwitchSide}>
								{t("pages.chessClock.switchButton")}
							</Button>
							<Button
								variant="outlined"
								startIcon={<RestartAltRoundedIcon />}
								sx={{
									minWidth: 160,
									borderColor: ACCENT_RED,
									color: ACCENT_RED,
									"&:hover": {
										borderColor: ACCENT_RED_DARK,
										color: ACCENT_RED_DARK,
										backgroundColor: "rgba(118, 15, 16, 0.08)",
									},
								}}
								onClick={() => setShowResetConfirm(true)}>
								{t("pages.chessClock.resetButton")}
							</Button>
						</Stack>

						<Stack
							direction="row"
							justifyContent="center">
							<Chip
								label={t("pages.chessClock.totalTime", { time: totalTime })}
								size="small"
								sx={{
									mt: { xs: 2, md: 3 },
									px: 2,
									color: "#1b4332",
									backgroundColor: "rgba(166, 206, 182, 0.25)",
								}}
							/>
						</Stack>
					</Stack>
				</Paper>
			</Container>

			<Dialog
				open={showResetConfirm}
				onClose={() => setShowResetConfirm(false)}
				sx={{ "& .MuiDialog-paper": { borderRadius: 3 } }}>
				<DialogTitle>{t("pages.chessClock.dialogTitle")}</DialogTitle>
				<DialogContent>
					<Typography>{t("pages.chessClock.dialogBody")}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowResetConfirm(false)}>
						{t("pages.chessClock.dialogCancel")}
					</Button>
					<Button
						onClick={handleResetAll}
						startIcon={<RestartAltRoundedIcon />}
						sx={{
							backgroundColor: ACCENT_RED,
							color: "#fff",
							"&:hover": {
								backgroundColor: ACCENT_RED_DARK,
							},
						}}>
						{t("pages.chessClock.dialogConfirm")}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

export default ChessClock;
