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
		const formattedP1 = formatTime(p1Seconds);
		const formattedP2 = formatTime(p2Seconds);
		setP1Time(formattedP1);
		setP2Time(formattedP2);
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
	const statusChipLabel = isRunning
		? `${side === 1 ? "玩家一" : "玩家二"} 正在计时`
		: "计时已暂停";

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

	return (
		<Box
			sx={{
				minHeight: "100vh",
				py: { xs: 4, md: 8 },
			}}>
			<Container maxWidth="md">
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
						<Stack
							spacing={1.5}
							alignItems="center">
							<Typography
								variant="h4"
								fontWeight={700}
								color="#1b4332">
								棋钟
							</Typography>
							<Typography
								variant="body1"
								color="text.secondary"
								align="center">
								轻触当前回合的玩家按钮即可切换，合理掌控每一次思考时间。
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

						<Divider
							flexItem
							light
						/>

						<Stack spacing={{ xs: 2, md: 3 }}>
							{[
								{ id: 1, label: "玩家一", time: p1Time },
								{ id: 2, label: "玩家二", time: p2Time },
							].map((player) => {
								const isActive = activeSide === player.id;
								return (
									<Paper
										key={player.id}
										component="button"
										type="button"
										onClick={() => handlePlayerTap(player.id)}
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
											<Stack spacing={0.75}>
												<Typography
													variant="h6"
													fontWeight={600}
													color="#1b4332">
													{player.label}
												</Typography>
												<Typography
													variant="body2"
													color="text.secondary">
													点击以宣告回合结束并切换到对手
												</Typography>
											</Stack>
											<Typography
												variant="h3"
												fontWeight={700}
												color={isActive ? "#5c0f10" : "#1b4332"}>
												{player.time}
											</Typography>
										</Stack>
										{isActive && (
											<Chip
												label="当前行动"
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
								color={isRunning ? "warning" : "success"}
								startIcon={
									isRunning ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />
								}
								sx={{
									minWidth: 160,
									backgroundColor: isRunning
										? "rgba(255, 193, 7, 0.85)"
										: "rgba(166, 206, 182, 0.8)",
									"&:hover": {
										backgroundColor: isRunning ? "#f5a623" : "#95bfa5",
									},
								}}
								onClick={togglePause}>
								{isRunning ? "暂停计时" : "继续计时"}
							</Button>
							<Button
								variant="outlined"
								color="primary"
								startIcon={<SwapVertRoundedIcon />}
								sx={{ minWidth: 160 }}
								onClick={handleSwitchSide}>
								切换行动方
							</Button>
							<Button
								variant="outlined"
								color="error"
								startIcon={<RestartAltRoundedIcon />}
								sx={{ minWidth: 160 }}
								onClick={() => setShowResetConfirm(true)}>
								重置计时
							</Button>
						</Stack>

						<Stack
							direction="row"
							justifyContent="center">
							<Chip
								label={`总用时 ${totalTime}`}
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
				<DialogTitle>确认要重置吗？</DialogTitle>
				<DialogContent>
					<Typography>这将清空两位玩家的所有计时记录。</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowResetConfirm(false)}>取消</Button>
					<Button
						color="error"
						onClick={handleResetAll}
						startIcon={<RestartAltRoundedIcon />}>
						立即重置
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

export default ChessClock;
