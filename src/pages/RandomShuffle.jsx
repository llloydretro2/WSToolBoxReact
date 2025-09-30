import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
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
import { useLocale } from "../contexts/LocaleContext";

function RandomShuffle() {
	const [deck, setDeck] = useState([]);
	const [generatedCount, setGeneratedCount] = useState(0);
	const [copyState, setCopyState] = useState("idle");
	const { t } = useLocale();

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

	const totalSum = useMemo(
		() => deck.reduce((sum, value) => sum + value, 0),
		[deck]
	);
	const averageValue =
		deck.length > 0 ? (totalSum / deck.length).toFixed(2) : "0";

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

	const GREEN_MAIN = "#a6ceb6";
	const GREEN_DARK = "#95bfa5";
	const GREEN_TEXT = "#1b4332";

	return (
		<Container
			maxWidth="md"
			sx={{ mt: 4 }}>
			{/* 页面标题和副标题 */}
			<Stack
				spacing={1.5}
				alignItems="center"
				sx={{ mb: 4 }}>
				<Typography
					variant="h4"
					fontWeight={700}
					color="#1b4332"
					gutterBottom
					align="center">
					{t("pages.shuffle.title")}
				</Typography>
				<Typography
					variant="body1"
					color="text.secondary"
					align="center">
					{t("pages.shuffle.subtitle")}
				</Typography>
				<Chip
					label={
						deck.length
							? t("pages.shuffle.summary", {
									deckLength: deck.length,
									average: averageValue,
							  })
							: t("pages.shuffle.summaryEmpty")
					}
					size="small"
					sx={{
						backgroundColor: deck.length
							? "rgba(166, 206, 182, 0.25)"
							: "rgba(166, 206, 182, 0.18)",
						color: "#1b4332",
					}}
				/>
			</Stack>

			<Paper
				elevation={10}
				sx={{
					p: { xs: 3, md: 5 },
					borderRadius: 4,
					backgroundColor: "rgba(27, 67, 50, 0.1)",
					border: "1px solid rgba(27, 67, 50, 0.2)",
					boxShadow: "0 28px 60px -40px rgba(74, 141, 112, 0.38)",
				}}>
				<Stack spacing={{ xs: 3, md: 4 }}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						justifyContent="center"
						alignItems="center">
						<motion.div
							whileHover={{ scale: 1.05, rotate: 1 }}
							whileTap={{ scale: 0.95 }}
							transition={{ type: "spring", stiffness: 400, damping: 17 }}>
							<Button
								variant="contained"
								startIcon={<ShuffleRoundedIcon />}
								onClick={handleGenerate}
								sx={{
									minWidth: 180,
									backgroundColor: GREEN_MAIN,
									color: GREEN_TEXT,
									"&:hover": { backgroundColor: GREEN_DARK },
								}}>
								{t("pages.shuffle.generateButton")}
							</Button>
						</motion.div>
						<Button
							variant="outlined"
							startIcon={<RestartAltRoundedIcon />}
							sx={{
								minWidth: 160,
								borderColor: GREEN_MAIN,
								color: GREEN_TEXT,
								"&:hover": {
									borderColor: GREEN_DARK,
									backgroundColor: "rgba(149, 191, 165, 0.12)",
								},
							}}
							onClick={handleReset}>
							{t("pages.shuffle.clearButton")}
						</Button>
						<Tooltip
							title={
								copyState === "success"
									? t("pages.shuffle.copyTooltipSuccess")
									: copyState === "error"
									? t("pages.shuffle.copyTooltipError")
									: t("pages.shuffle.copyTooltip")
							}
							placement="top"
							arrow>
							<span>
								<Button
									variant="outlined"
									startIcon={<ContentCopyRoundedIcon />}
									disabled={deck.length === 0}
									sx={{
										minWidth: 160,
										borderColor: deck.length ? GREEN_MAIN : "rgba(0,0,0,0.12)",
										color: deck.length ? GREEN_TEXT : "rgba(0,0,0,0.26)",
										"&:hover": deck.length
											? {
													borderColor: GREEN_DARK,
													backgroundColor: "rgba(149, 191, 165, 0.12)",
											  }
											: {},
									}}
									onClick={handleCopy}>
									{t("pages.shuffle.copyButton")}
								</Button>
							</span>
						</Tooltip>
					</Stack>

					{deck.length > 0 && (
						<Stack spacing={{ xs: 2, md: 3 }}>
							{" "}
							<Chip
								label={t("pages.shuffle.generationChip", {
									count: generatedCount,
								})}
								size="small"
							/>
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
											<Stack
												spacing={0.5}
												alignItems="center">
												<Typography
													variant="h5"
													fontWeight={600}
													color="#1b4332"
													component="div">
													{card}
												</Typography>
												<Typography
													variant="caption"
													color="text.secondary">
													{t("pages.shuffle.cardCaption")}
												</Typography>
											</Stack>
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
