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
} from "@mui/material";

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
		if (saved) {
			const { p1Time, p2Time, side, isRunning } = JSON.parse(saved);
			setP1Time(p1Time);
			setP2Time(p2Time);
			setSide(side);
			setIsRunning(isRunning);
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
		const format = (s) =>
			`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
				2,
				"0"
			)}`;
		setP1Time(format(p1Seconds));
		setP2Time(format(p2Seconds));
	}, [p1Seconds, p2Seconds]);

	return (
		<Container>
			<Box display="flex" flexDirection="column" alignItems="center" mb={4}>
				<Typography variant="h4" gutterBottom>
					棋钟
				</Typography>
				<Typography variant="subtitle1">帮助双方计时自己的回合用时</Typography>
			</Box>

			<Box height="60vh">
				<Box display="flex" flexDirection="column" height="100%" width="100%">
					<Box flex={3} display="flex" justifyContent="center">
						<Button
							variant="contained"
							color={isRunning && side === 1 ? "error" : "primary"}
							size="large"
							sx={{ width: "50%", height: "100%", mb: 2 }}
							onClick={() => {
								setIsRunning(true);
								setSide(1);
							}}
						>
							<Typography variant="h4">{p1Time}</Typography>
						</Button>
					</Box>

					<Box flex={1} display="flex" justifyContent="center" m={2} gap={2}>
						<Button
							variant="contained"
							color="success"
							size="large"
							onClick={() => {
								setIsRunning(true);
								setSide(side === 1 ? 2 : 1);
							}}
							sx={{
								backgroundColor: "rgba(166, 206, 182, 0.7)",
								"&:hover": { backgroundColor: "#95bfa5" },
							}}
						>
							开始计时
						</Button>
						<Button
							variant="contained"
							color="error"
							size="large"
							onClick={() => setShowResetConfirm(true)}
							sx={{
								backgroundColor: "rgba(118, 15, 16, 0.7)",
								"&:hover": {
									backgroundColor: "#5c0f10",
								},
							}}
						>
							重置计时
						</Button>
					</Box>

					<Box flex={3} display="flex" justifyContent="center">
						<Button
							variant="contained"
							color={isRunning && side === 2 ? "error" : "primary"}
							size="large"
							sx={{ width: "50%", height: "100%" }}
							onClick={() => {
								setIsRunning(true);
								setSide(2);
							}}
						>
							<Typography variant="h4">{p2Time}</Typography>
						</Button>
					</Box>
				</Box>
			</Box>

			<Dialog
				open={showResetConfirm}
				onClose={() => setShowResetConfirm(false)}
			>
				<DialogTitle>确认重置</DialogTitle>
				<DialogContent>
					<Typography>确定要重置计时吗？</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowResetConfirm(false)}>取消</Button>
					<Button
						color="error"
						onClick={() => {
							setIsRunning(false);
							setP1Seconds(0);
							setP2Seconds(0);
							setP1Time("00:00");
							setP2Time("00:00");
							setShowResetConfirm(false);
						}}
					>
						确定重置
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
}

export default ChessClock;
