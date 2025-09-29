import React, { useState, useMemo } from "react";
import {
	Container,
	Typography,
	Button,
	Grid,
	Paper,
	Stack,
	Divider,
	Chip,
	Tooltip,
} from "@mui/material";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

function RandomShuffle() {
	const [deck, setDeck] = useState([]);
	const [generatedCount, setGeneratedCount] = useState(0);
	const [copyState, setCopyState] = useState("idle");

	const handleGenerate = () => {
		const targetSum = 50;
		const count = Math.floor(Math.random() * 5) + 6;
		const nums = Array.from({ length: count }, () => 1);
		let currentSum = count;

		while (currentSum < targetSum) {
			const idx = Math.floor(Math.random() * count);
			nums[idx] += 1;
			currentSum += 1;
		}

		setDeck(nums);
		setGeneratedCount((prev) => prev + 1);
		setCopyState("idle");
	};

	const handleReset = () => {
		setDeck([]);
		setGeneratedCount(0);
		setCopyState("idle");
	};

	const handleCopy = async () => {
		if (deck.length === 0) {
			return;
		}
		try {
			await navigator.clipboard.writeText(deck.join(", "));
			setCopyState("success");
		} catch (error) {
			console.error("Copy failed", error);
			setCopyState("error");
		}
	};

	return (
		<Container
			maxWidth="md"
			sx={{ py: { xs: 4, md: 6 } }}>
			<Paper
				elevation={10}
				sx={{
					p: { xs: 3, md: 5 },
					borderRadius: 4,
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					border: "1px solid rgba(166, 206, 182, 0.45)",
					boxShadow: "0 28px 60px -40px rgba(74, 141, 112, 0.38)",
				}}>
				<Stack spacing={{ xs: 3, md: 4 }}>
					<Stack
						spacing={1}
						alignItems="center">
						<Typography
							variant="h4"
							fontWeight={700}
							color="#1b4332">
							随机洗牌工具
						</Typography>
						<Typography
							variant="body1"
							color="text.secondary"
							align="center">
							每次生成 50 点总和、6-10 张的不均匀牌堆
						</Typography>
					</Stack>

					<Divider flexItem />

					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						justifyContent="center"
						alignItems="center">
						<Button
							variant="contained"
							startIcon={<ShuffleRoundedIcon />}
							onClick={handleGenerate}
							sx={{
								minWidth: 180,
								backgroundColor: "rgba(166, 206, 182, 0.85)",
								"&:hover": { backgroundColor: "#95bfa5" },
							}}>
							生成牌堆
						</Button>
						<Button
							variant="outlined"
							startIcon={<RestartAltRoundedIcon />}
							sx={{ minWidth: 160 }}
							onClick={handleReset}>
							清空结果
						</Button>
						<Tooltip
							title={copyState === "success" ? "已复制" : "复制结果"}
							placement="top"
							arrow>
							<span>
								<Button
									variant="outlined"
									startIcon={<ContentCopyRoundedIcon />}
									disabled={deck.length === 0}
									sx={{ minWidth: 160 }}
									onClick={handleCopy}>
									复制数据
								</Button>
							</span>
						</Tooltip>
					</Stack>

					{deck.length > 0 && (
						<Stack spacing={{ xs: 2, md: 3 }}>
							<Grid
								container
								spacing={2}
								columns={12}
								justifyContent="center">
								{deck.map((card, index) => (
									<Grid
										key={`card-${index}`}
										size={{ xs: 4, sm: 3, md: 2 }}>
										<Paper
											elevation={2}
											sx={{
												borderRadius: 2,
												p: { xs: 1.5, md: 2 },
												backgroundColor: "rgba(166, 206, 182, 0.3)",
												border: "1px solid rgba(166, 206, 182, 0.4)",
												textAlign: "center",
											}}>
											<Typography
												variant="h5"
												fontWeight={600}
												color="#1b4332">
												{card}
											</Typography>
										</Paper>
									</Grid>
								))}
							</Grid>
						</Stack>
					)}
				</Stack>
			</Paper>
		</Container>
	);
}

export default RandomShuffle;
