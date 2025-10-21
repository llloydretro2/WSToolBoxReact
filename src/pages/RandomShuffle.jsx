import React, { useState, useMemo } from "react";
import {
	Container,
	Typography,
	Grid,
	Paper,
	Stack,
	Divider,
	Chip,
} from "@mui/material";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useLocale } from "../contexts/LocaleContext";
import {
	GenerateButton,
	SecondaryButton,
	DangerButton,
} from "../components/ButtonVariants";

function RandomShuffle() {
	const [deck, setDeck] = useState([]);
	const [generatedCount, setGeneratedCount] = useState(0);
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
	};

	const handleReset = () => {
		setDeck([]);
		setGeneratedCount(0);
	};

	const handleDecrease = () => {
		setDeck((prevDeck) => prevDeck.map((value) => Math.max(0, value - 1)));
	};

	const totalSum = useMemo(
		() => deck.reduce((sum, value) => sum + value, 0),
		[deck]
	);
	const averageValue =
		deck.length > 0 ? (totalSum / deck.length).toFixed(2) : "0";

	const GREEN_MAIN = "#a6ceb6";
	const GREEN_DARK = "#95bfa5";
	const GREEN_TEXT = "#1b4332";

	return (
		<Container maxWidth="md">
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
					{t("shuffle.title")}
				</Typography>
				<Typography
					variant="body1"
					color="text.secondary"
					align="center">
					{t("shuffle.subtitle")}
				</Typography>
				<Chip
					label={
						deck.length
							? t("shuffle.summary", {
									deckLength: deck.length,
									average: averageValue,
							  })
							: t("shuffle.summaryEmpty")
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
						alignItems="center"
						flexWrap="wrap">
						<GenerateButton
							variant="contained"
							startIcon={<ShuffleRoundedIcon />}
							onClick={handleGenerate}
							sx={{
								minWidth: 180,
								backgroundColor: GREEN_MAIN,
								color: GREEN_TEXT,
								"&:hover": { backgroundColor: GREEN_DARK },
							}}>
							{t("shuffle.generateButton")}
						</GenerateButton>
						<SecondaryButton
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
							{t("shuffle.clearButton")}
						</SecondaryButton>
						{deck.length > 0 && (
							<DangerButton
								variant="outlined"
								startIcon={<RemoveCircleOutlineIcon />}
								sx={{
									minWidth: 160,
									borderColor: "#d32f2f",
									color: "#d32f2f",
									"&:hover": {
										borderColor: "#b71c1c",
										backgroundColor: "rgba(211, 47, 47, 0.08)",
									},
								}}
								onClick={handleDecrease}>
								{t("shuffle.decreaseButton")}
							</DangerButton>
						)}
					</Stack>

					{deck.length > 0 && (
						<Stack spacing={{ xs: 2, md: 3 }}>
							{" "}
							<Chip
								label={t("shuffle.generationChip", {
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
												opacity: card === 0 ? 0.5 : 1,
												transition: "opacity 0.3s ease",
											}}>
											<Stack
												spacing={0.5}
												alignItems="center">
												<Typography
													variant="h5"
													fontWeight={600}
													color="#1b4332"
													component="div"
													sx={{
														opacity: card === 0 ? 0.6 : 1,
													}}>
													{card}
												</Typography>
												<Typography
													variant="caption"
													color="text.secondary"
													sx={{
														opacity: card === 0 ? 0.6 : 1,
													}}>
													{t("shuffle.cardCaption")}
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
