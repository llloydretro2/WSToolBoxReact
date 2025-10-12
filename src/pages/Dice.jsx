import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
	Container,
	Typography,
	Button,
	TextField,
	Box,
	Grid,
	Paper,
	Stack,
	Divider,
	Chip,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useLocale } from "../contexts/LocaleContext";

function Dice() {
	const [diceInputs, setDiceInputs] = useState([{ sides: 6, count: 1 }]);
	const [results, setResults] = useState([]);
	const { t } = useLocale();

	useEffect(() => {
		const savedInputs = localStorage.getItem("diceInputs");
		const savedResults = localStorage.getItem("diceResults");
		if (savedInputs) {
			setDiceInputs(JSON.parse(savedInputs));
		}
		if (savedResults) {
			setResults(JSON.parse(savedResults));
		}
	}, []);

	const handleChange = (index, field, value) => {
		const numericValue = parseInt(value, 10);
		const minValue = field === "sides" ? 2 : 1;

		setDiceInputs((prevInputs) => {
			const nextInputs = prevInputs.map((input, idx) => {
				if (idx !== index) {
					return input;
				}
				if (Number.isNaN(numericValue)) {
					return { ...input, [field]: "" };
				}
				return { ...input, [field]: Math.max(minValue, numericValue) };
			});

			localStorage.setItem("diceInputs", JSON.stringify(nextInputs));
			return nextInputs;
		});
	};

	const addDiceInput = () => {
		setDiceInputs((prevInputs) => {
			const nextInputs = [...prevInputs, { sides: 6, count: 1 }];
			localStorage.setItem("diceInputs", JSON.stringify(nextInputs));
			return nextInputs;
		});
	};

	const resetDiceInputs = () => {
		setDiceInputs([{ sides: 6, count: 1 }]);
		setResults([]);
		localStorage.removeItem("diceInputs");
		localStorage.removeItem("diceResults");
	};

	const rollDice = () => {
		const sanitizedInputs = diceInputs.map(({ count, sides }) => ({
			count: Math.max(1, parseInt(count, 10) || 1),
			sides: Math.max(2, parseInt(sides, 10) || 6),
		}));

		setDiceInputs(sanitizedInputs);
		localStorage.setItem("diceInputs", JSON.stringify(sanitizedInputs));

		const allResults = sanitizedInputs.map(({ count, sides }) => {
			const rolls = [];
			for (let i = 0; i < count; i += 1) {
				rolls.push(Math.floor(Math.random() * sides) + 1);
			}
			return rolls;
		});
		setResults(allResults);
		localStorage.setItem("diceResults", JSON.stringify(allResults));
	};

	const flattenedResults = results.flat();
	const total = flattenedResults.reduce((sum, value) => sum + value, 0);
	const average =
		flattenedResults.length > 0
			? (total / flattenedResults.length).toFixed(2)
			: "0";
	const hasResults = results.length > 0 && flattenedResults.length > 0;

	const GREEN_MAIN = "#a6ceb6";
	const GREEN_DARK = "#95bfa5";
	const GREEN_TEXT = "#1b4332";
	const ACCENT_RED = "#760f10";
	const ACCENT_RED_DARK = "#5c0f10";

	return (
		<Box
			sx={{
				minHeight: "100%", // 使用100%而不是视口高度
			}}>
			<Container maxWidth="md">
				{/* 页面标题和副标题 */}
				<Box
					textAlign="center"
					mb={4}>
					<Typography
						variant="h4"
						fontWeight={700}
						color="#1b4332"
						gutterBottom>
						{t("pages.dice.title")}
					</Typography>
					<Typography
						variant="body1"
						color="text.secondary">
						{t("pages.dice.subtitle")}
					</Typography>
				</Box>

				<Paper
					elevation={8}
					sx={{
						p: { xs: 3, md: 5 },
						backgroundColor: "rgba(166, 206, 182, 0)",
						border: "1px solid rgba(166, 206, 182, 0.45)",
						boxShadow: "0 20px 45px -18px rgba(74, 141, 112, 0.35)",
					}}>
					<Stack spacing={2}>
						{diceInputs.map((input, index) => (
							<Paper
								key={`dice-input-${index}`}
								elevation={3}
								sx={{
									p: { xs: 2, md: 3 },
									borderRadius: 3,
									border: "1px solid rgba(27, 67, 50, 0.2)",
									backgroundColor: "rgba(27, 67, 50, 0.1)",
								}}>
								<Grid
									container
									spacing={2}
									alignItems="center"
									justifyContent="center"
									textAlign="center">
									<Grid size={{ xs: 12, sm: 4, md: 3 }}>
										<Stack
											spacing={0.25}
											alignItems="center">
											<Typography
												variant="subtitle2"
												color="text.secondary">
												{t("pages.dice.setLabel", { index: index + 1 })}
											</Typography>
											<Typography
												variant="h6"
												fontWeight={600}>
												D{input.sides || "?"}
											</Typography>
											<Typography
												variant="caption"
												color="text.secondary">
												{t("pages.dice.facesLabel")}
											</Typography>
										</Stack>
									</Grid>
									<Grid size={{ xs: 12, sm: 4, md: 3 }}>
										<TextField
											label={t("pages.dice.countLabel")}
											type="number"
											fullWidth
											value={input.count}
											onChange={(e) =>
												handleChange(index, "count", e.target.value)
											}
											inputProps={{ min: 1, style: { textAlign: "center" } }}
										/>
									</Grid>
									<Grid size={{ xs: 12, sm: 4, md: 3 }}>
										<TextField
											label={t("pages.dice.facesLabel")}
											type="number"
											fullWidth
											value={input.sides}
											onChange={(e) =>
												handleChange(index, "sides", e.target.value)
											}
											inputProps={{ min: 2, style: { textAlign: "center" } }}
										/>
									</Grid>
								</Grid>
							</Paper>
						))}
					</Stack>

					<Divider sx={{ my: { xs: 3, md: 4 } }} />

					<Grid
						container
						spacing={2}
						justifyContent="center">
						<Grid size={{ xs: 12, sm: 4 }}>
							<motion.div
								whileHover={{ scale: 1.05, rotate: 1 }}
								whileTap={{ scale: 0.95 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}>
								<Button
									variant="outlined"
									color="primary"
									fullWidth
									startIcon={<AddCircleOutlineRoundedIcon />}
									onClick={addDiceInput}
									sx={{
										borderColor: GREEN_MAIN,
										color: GREEN_TEXT,
										"&:hover": {
											borderColor: GREEN_DARK,
											backgroundColor: "rgba(149, 191, 165, 0.15)",
										},
									}}>
									{t("pages.dice.addButton")}
								</Button>
							</motion.div>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<motion.div
								whileHover={{ scale: 1.05, rotate: -1 }}
								whileTap={{ scale: 0.95 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}>
								<Button
									variant="outlined"
									color="secondary"
									fullWidth
									startIcon={<RefreshRoundedIcon />}
									onClick={resetDiceInputs}
									sx={{
										borderColor: ACCENT_RED,
										color: ACCENT_RED,
										"&:hover": {
											borderColor: ACCENT_RED_DARK,
											color: ACCENT_RED_DARK,
											backgroundColor: "rgba(118, 15, 16, 0.08)",
										},
									}}>
									{t("pages.dice.resetButton")}
								</Button>
							</motion.div>
						</Grid>
						<Grid size={{ xs: 12, sm: 4 }}>
							<motion.div
								whileHover={{ scale: 1.05, rotate: 1 }}
								whileTap={{ scale: 0.95 }}
								transition={{ type: "spring", stiffness: 400, damping: 17 }}>
								<Button
									variant="contained"
									color="primary"
									fullWidth
									startIcon={<CasinoIcon />}
									onClick={rollDice}
									sx={{
										backgroundColor: GREEN_MAIN,
										color: GREEN_TEXT,
										"&:hover": {
											backgroundColor: GREEN_DARK,
										},
									}}>
									{t("pages.dice.rollButton")}
								</Button>
							</motion.div>
						</Grid>
					</Grid>

					{hasResults && (
						<Box sx={{ mt: { xs: 4, md: 5 }, textAlign: "center" }}>
							<Typography
								variant="h5"
								gutterBottom
								fontWeight={600}>
								{t("pages.dice.resultsTitle")}
							</Typography>
							<Grid
								container
								spacing={2}
								justifyContent="center">
								{results.map((rolls, idx) => {
									const maxRoll = rolls.length > 0 ? Math.max(...rolls) : null;
									return (
										<Grid
											size={{ xs: 12, md: 6 }}
											key={`result-${idx}`}>
											<Paper
												elevation={0}
												sx={{
													p: { xs: 2, md: 3 },
													borderRadius: 3,
													border: "1px solid rgba(27, 67, 50, 0.2)",
													backgroundColor: "rgba(27, 67, 50, 0.1)",
												}}>
												<Typography
													variant="subtitle1"
													gutterBottom>
													{t("pages.dice.setLabel", { index: idx + 1 })}
												</Typography>
												<Stack
													direction="row"
													spacing={1}
													flexWrap="wrap"
													justifyContent="center">
													{rolls.map((value, rollIndex) => (
														<Chip
															key={`chip-${idx}-${rollIndex}`}
															label={value}
															color={
																maxRoll !== null &&
																value === maxRoll &&
																rolls.length > 1
																	? "primary"
																	: "default"
															}
															variant={
																maxRoll !== null &&
																value === maxRoll &&
																rolls.length > 1
																	? "filled"
																	: "outlined"
															}
														/>
													))}
												</Stack>
											</Paper>
										</Grid>
									);
								})}
							</Grid>
							<Paper
								elevation={0}
								sx={{
									mt: { xs: 3, md: 4 },
									p: { xs: 2, md: 3 },
									borderRadius: 3,
									backgroundColor: "rgba(166, 206, 182, 0.2)",
									border: "1px solid rgba(166, 206, 182, 0.6)",
									maxWidth: 420,
									mx: "auto",
								}}>
								<Typography
									variant="subtitle2"
									color="text.secondary">
									{t("pages.dice.summaryTitle")}
								</Typography>
								<Typography
									variant="h6"
									fontWeight={600}>
									{t("pages.dice.summaryValue", { total, average })}
								</Typography>
							</Paper>
						</Box>
					)}
				</Paper>
			</Container>
		</Box>
	);
}

export default Dice;
