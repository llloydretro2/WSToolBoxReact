import React, { useState, useEffect } from "react";
import { useLocale } from "../contexts/LocaleContext";
import {
	Container,
	Typography,
	Autocomplete,
	TextField,
	Box,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
} from "@mui/material";
import {
	PrimaryButton,
	DangerButton,
	GenerateButton,
} from "../components/ButtonVariants";
import productList from "../data/productList.json";

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";

function Simulator() {
	const { t } = useLocale();
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [cards, setCards] = useState([]);
	const [rarityMap, setRarityMap] = useState({});
	const [rarityRates, setRarityRates] = useState({});
	const [cardsPerPack, setCardsPerPack] = useState(8);
	const [packsPerBox, setPacksPerBox] = useState(12);
	const [boxesPerCase, setBoxesPerCase] = useState(24);
	const [simulationPackCount, setSimulationPackCount] = useState(12);
	const [simulatedResult, setSimulatedResult] = useState([]);
	const [selectedCard, setSelectedCard] = useState(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [sortedRarities, setSortedRarities] = useState([]);

	function simulatePacks() {
		setSimulatedResult([]);

		// 找出最大“保底（箱）”
		let maxCase = 0;
		for (const rarity of Object.keys(rarityMap)) {
			const caseBox = parseInt(rarityRates[rarity]?.case || 0);
			if (caseBox > maxCase) maxCase = caseBox;
		}
		if (maxCase === 0) maxCase = 1;
		console.log("最大保底（箱）:", maxCase);
		const cardPoolSize = packsPerBox * boxesPerCase * maxCase;
		console.log("卡池大小:", cardPoolSize);
		console.log("稀有度卡片表:", rarityMap);
		console.log("稀有度保底:", rarityRates);

		const sortedRarities = Object.entries(rarityRates)
			.filter(([, val]) => val.pack || val.box || val.case)
			.sort(([, aVal], [, bVal]) => {
				const aCase = parseInt(aVal.case);
				const bCase = parseInt(bVal.case);
				if (!isNaN(aCase) && !isNaN(bCase)) return bCase - aCase;
				if (!isNaN(aCase)) return -1;
				if (!isNaN(bCase)) return 1;

				const aBox = parseInt(aVal.box);
				const bBox = parseInt(bVal.box);
				if (!isNaN(aBox) && !isNaN(bBox)) return bBox - aBox;
				if (!isNaN(aBox)) return -1;
				if (!isNaN(bBox)) return 1;

				const aPack = parseInt(aVal.pack);
				const bPack = parseInt(bVal.pack);
				if (!isNaN(aPack) && !isNaN(bPack)) return bPack - aPack;
				if (!isNaN(aPack)) return -1;
				if (!isNaN(bPack)) return 1;

				return 0;
			})
			.map(([key, val]) => [key, val]);

		setSortedRarities(sortedRarities);
		console.log("排序后稀有度:", Object.fromEntries(sortedRarities));
		const knownRarities = sortedRarities.map(([rarity]) => rarity);
		const nonRatedMap = Object.fromEntries(
			Object.entries(rarityMap).filter(
				([rarity]) => !knownRarities.includes(rarity)
			)
		);

		const rareCardPool = [];

		for (const [rarity, rate] of sortedRarities) {
			console.log(`处理稀有度: ${rarity}，保底:`, rate);
			const currentRarityPack = rate.pack ? parseInt(rate.pack) : null;
			const currentRarityBox = rate.box ? parseInt(rate.box) : null;
			const currentRarityCase = rate.case ? parseInt(rate.case) : null;
			console.log(`当前稀有度 ${rarity} 的保底设置:`, {
				包: currentRarityPack,
				盒: currentRarityBox,
				箱: currentRarityCase,
			});

			var numCards;
			if (currentRarityCase) {
				numCards =
					cardPoolSize / (boxesPerCase * packsPerBox * currentRarityCase);
			} else if (currentRarityBox) {
				numCards = cardPoolSize / (packsPerBox * currentRarityBox);
			} else if (currentRarityPack) {
				numCards = cardPoolSize / currentRarityPack;
			}
			console.log(`当前稀有度 ${rarity} 的卡片数:`, numCards);

			const rarityCards = rarityMap[rarity] || [];
			for (let i = 0; i < Math.floor(numCards); i++) {
				if (rarityCards.length > 0) {
					if (rareCardPool.length >= cardPoolSize) break;
					const randomCard =
						rarityCards[Math.floor(Math.random() * rarityCards.length)];
					rareCardPool.push(randomCard);
				}
			}
			if (rareCardPool.length >= cardPoolSize) break;
		}

		console.log(
			"构建的高稀有卡池：",
			rareCardPool.map((c) => `${c.name} (${c.rarity})`)
		);
		const rarityCountMap = rareCardPool.reduce((acc, card) => {
			if (!acc[card.rarity]) acc[card.rarity] = 0;
			acc[card.rarity]++;
			return acc;
		}, {});
		console.log("高稀有卡池中每种稀有度数量：", rarityCountMap);

		const resultPacks = [];

		for (let i = 0; i < simulationPackCount; i++) {
			const pack = [];

			// 每包固定抽一个高稀有度
			const rareCard =
				rareCardPool[Math.floor(Math.random() * rareCardPool.length)];
			if (rareCard) {
				pack.push(rareCard);
			}

			// 从非稀有度卡池中填充剩余卡片
			const nonRatedCards = Object.values(nonRatedMap).flat();
			const remainingCards = cardsPerPack - pack.length;
			for (let j = 0; j < remainingCards; j++) {
				if (nonRatedCards.length > 0) {
					const card =
						nonRatedCards[Math.floor(Math.random() * nonRatedCards.length)];
					pack.push(card);
				}
			}

			resultPacks.push(pack);
		}

		console.log("最终模拟结果：", resultPacks);
		const simulatedRarityCounts = resultPacks.flat().reduce((acc, card) => {
			if (!acc[card.rarity]) acc[card.rarity] = 0;
			acc[card.rarity]++;
			return acc;
		}, {});
		console.log("模拟结果中每种稀有度卡片数量：", simulatedRarityCounts);
		setSimulatedResult(resultPacks);
	}

	useEffect(() => {
		const map = {};
		cards.forEach((card) => {
			if (card.rarity) {
				if (!map[card.rarity]) {
					map[card.rarity] = [];
				}
				map[card.rarity].push(card);
			}
		});
		setRarityMap(map);
	}, [cards]);

	return (
		<Container
			maxWidth="sm"
			sx={{ textAlign: "center" }}>
			<Typography
				variant="h4"
				fontWeight={700}
				color="#1b4332"
				gutterBottom>
				{t("pages.simulator.title")}
			</Typography>
			<Typography
				variant="body1"
				color="text.secondary"
				align="center">
				{t("pages.simulator.subtitle")}
			</Typography>
			<Typography
				variant="h6"
				color="text.secondary">
				{t("pages.simulator.subtitleNote")}
			</Typography>
			<Autocomplete
				options={productList.product_name.slice().sort()}
				getOptionLabel={(option) => option}
				value={selectedProduct}
				onChange={async (event, newValue) => {
					setSelectedProduct(newValue);

					// http://localhost:4000/api/cards/by-product?product_name=
					if (newValue) {
						try {
							const res = await fetch(
								`${BACKEND_URL}/api/cards/by-product?product_name=${encodeURIComponent(
									newValue
								)}`
							);
							if (res.ok) {
								const data = await res.json();
								setCards(data.data);
								console.log(data);
							} else {
								console.error("API 请求失败");
								setCards([]);
							}
						} catch (error) {
							console.error("请求出错:", error);
							setCards([]);
						}
					}
				}}
				renderInput={(params) => (
					<TextField
						{...params}
						fullWidth
						label={t("pages.simulator.selectProduct")}
						variant="outlined"
					/>
				)}
				sx={{ mt: 4 }}
			/>

			<Box
				m={2}
				p={2}
				borderRadius={4}
				display="grid"
				gridTemplateColumns={{ xs: "1fr", sm: "repeat(4, 1fr)" }}
				gap={2}
				sx={{
					backgroundColor: "rgba(27, 67, 50, 0.1)",
					border: "1px solid rgba(27, 67, 50, 0.2)",
				}}>
				<TextField
					fullWidth
					label={t("pages.simulator.cardsPerPack")}
					variant="outlined"
					type="number"
					value={cardsPerPack}
					onChange={(e) => {
						const value = e.target.value;
						setCardsPerPack(value === "" ? "" : Number(value));
					}}
					inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
				/>
				<TextField
					fullWidth
					label={t("pages.simulator.packsPerBox")}
					variant="outlined"
					type="number"
					value={packsPerBox}
					onChange={(e) => {
						const value = e.target.value;
						setPacksPerBox(value === "" ? "" : Number(value));
					}}
					inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
				/>
				<TextField
					fullWidth
					label={t("pages.simulator.boxesPerCase")}
					variant="outlined"
					type="number"
					value={boxesPerCase}
					onChange={(e) => {
						const value = e.target.value;
						setBoxesPerCase(value === "" ? "" : Number(value));
					}}
					inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
				/>
				<TextField
					fullWidth
					label={t("pages.simulator.simulationPackCount")}
					variant="outlined"
					type="number"
					value={simulationPackCount}
					onChange={(e) => {
						const value = e.target.value;
						setSimulationPackCount(value === "" ? "" : Number(value));
					}}
					inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
				/>
			</Box>
			{Object.keys(rarityMap).map((rarity) => (
				<Box
					key={rarity}
					m={2}
					p={2}
					borderRadius={4}
					sx={{
						backgroundColor: "rgba(27, 67, 50, 0.1)",
						border: "1px solid rgba(27, 67, 50, 0.2)",
					}}>
					<Typography
						variant="h6"
						gutterBottom>
						{rarity}
					</Typography>
					<Box
						display="grid"
						gridTemplateColumns={{ xs: "1fr", sm: "repeat(4, 1fr)" }}
						gap={2}>
						<TextField
							fullWidth
							label={t("pages.simulator.guaranteedPack")}
							variant="outlined"
							type="number"
							value={rarityRates[rarity]?.pack ?? ""}
							onChange={(e) => {
								const value = e.target.value;
								setRarityRates((prev) => ({
									...prev,
									[rarity]: {
										...prev[rarity],
										pack: value === "" ? "" : value,
									},
								}));
							}}
							slotProps={{ inputProps: { min: 0 } }}
							inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
						/>
						<TextField
							fullWidth
							label={t("pages.simulator.guaranteedBox")}
							variant="outlined"
							type="number"
							value={rarityRates[rarity]?.box ?? ""}
							onChange={(e) => {
								const value = e.target.value;
								setRarityRates((prev) => ({
									...prev,
									[rarity]: {
										...prev[rarity],
										box: value === "" ? "" : value,
									},
								}));
							}}
							slotProps={{ inputProps: { min: 0 } }}
							inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
						/>
						<TextField
							fullWidth
							label={t("pages.simulator.guaranteedCase")}
							variant="outlined"
							type="number"
							value={rarityRates[rarity]?.case ?? ""}
							onChange={(e) => {
								const value = e.target.value;
								setRarityRates((prev) => ({
									...prev,
									[rarity]: {
										...prev[rarity],
										case: value === "" ? "" : value,
									},
								}));
							}}
							slotProps={{ inputProps: { min: 0 } }}
							inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
						/>
						<DangerButton
							fullWidth
							variant="contained"
							sx={{
								backgroundColor: "#760f10",
								"&:hover": {
									backgroundColor: "#5c0f10",
								},
							}}
							onClick={() =>
								setRarityRates((prev) => ({
									...prev,
									[rarity]: { pack: "", box: "", case: "" },
								}))
							}>
							{t("pages.simulator.resetButton")}
						</DangerButton>
					</Box>
				</Box>
			))}

			<GenerateButton
				variant="contained"
				color="primary"
				size="large"
				onClick={simulatePacks}
				sx={{
					m: 2,
					backgroundColor: "#a6ceb6",
					"&:hover": { backgroundColor: "#95bfa5" },
				}}>
				{t("pages.simulator.startSimulation")}
			</GenerateButton>

			<DangerButton
				variant="contained"
				color="primary"
				size="large"
				onClick={() => setSimulatedResult([])}
				sx={{
					m: 2,
					backgroundColor: "#760f10",
					"&:hover": {
						backgroundColor: "#5c0f10",
					},
				}}>
				{t("pages.simulator.clearResults")}
			</DangerButton>

			{simulatedResult.length > 0 && (
				<Box sx={{ mt: 4 }}>
					<Typography
						variant="h5"
						gutterBottom>
						{t("pages.simulator.rarityDisplay")}
					</Typography>
					{sortedRarities
						.map(([rarity]) => rarity)
						.filter((rarity) =>
							simulatedResult.flat().some((card) => card.rarity === rarity)
						)
						.map((rarity) => {
							const cards = simulatedResult
								.flat()
								.filter((card) => card.rarity === rarity);

							const grouped = cards.reduce((map, card) => {
								const key = card.cardno;
								if (!map[key]) {
									map[key] = { card, count: 0 };
								}
								map[key].count++;
								return map;
							}, {});
							const uniqueCards = Object.values(grouped);

							return (
								<Box
									key={rarity}
									sx={{ mb: 3 }}>
									<Typography variant="subtitle1">{rarity}</Typography>
									<Box
										sx={{
											display: "flex",
											flexWrap: "wrap",
											gap: 1,
											mt: 1,
											border: "1px solid #ccc",
											borderRadius: 2,
											p: 1,
										}}>
										{uniqueCards.map(({ card, count }, i) => (
											<Box
												key={i}
												onClick={() => {
													setSelectedCard(card);
													setDialogOpen(true);
												}}
												sx={{
													width: 100,
													borderRadius: 1,
													cursor: "pointer",
													overflow: "hidden",
													transition: "transform 0.2s",
													"&:hover": { transform: "scale(1.05)" },
													textAlign: "center",
												}}>
												<Box
													component="img"
													src={card.image_url}
													alt={card.name}
													sx={{
														width: "100%",
														height: "auto",
													}}
												/>
												<Typography
													variant="caption"
													display="block">
													{t("pages.simulator.cardCount", { count })}
												</Typography>
											</Box>
										))}
									</Box>
								</Box>
							);
						})}
				</Box>
			)}
			{simulatedResult.length > 0 && (
				<Box sx={{ mt: 4 }}>
					<Typography
						variant="h5"
						gutterBottom>
						{t("pages.simulator.detailedResults")}
					</Typography>
					{simulatedResult.map((pack, index) => (
						<Box
							key={index}
							sx={{ mb: 3 }}>
							<Typography variant="subtitle1">
								{t("pages.simulator.packNumber", { number: index + 1 })}
							</Typography>
							<Box
								sx={{
									display: "flex",
									flexWrap: "wrap",
									gap: 1,
									mt: 1,
									border: "1px solid #ccc",
									borderRadius: 2,
									p: 1,
								}}>
								{pack.map((card, i) => (
									<Box
										key={i}
										onClick={() => {
											setSelectedCard(card);
											setDialogOpen(true);
										}}
										sx={{
											width: 100,
											borderRadius: 1,
											cursor: "pointer",
											overflow: "hidden",
											transition: "transform 0.2s",
											"&:hover": { transform: "scale(1.05)" },
										}}>
										<Box
											component="img"
											src={card.image_url}
											alt={card.name}
											sx={{
												width: "100%",
												height: "auto",
											}}
										/>
									</Box>
								))}
							</Box>
						</Box>
					))}
				</Box>
			)}
			<Dialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				maxWidth="sm"
				fullWidth>
				<DialogTitle>{selectedCard?.name}</DialogTitle>
				<DialogContent>
					<Box
						component="img"
						src={selectedCard?.image_url}
						alt={selectedCard?.name}
						sx={{ width: "100%", height: "auto", mb: 2 }}
					/>
					<DialogContentText>
						<strong>{t("pages.simulator.cardDetails.cardNumber")}</strong>{" "}
						{selectedCard?.cardno}
						<br />
						<strong>{t("pages.simulator.cardDetails.productName")}</strong>{" "}
						{selectedCard?.product_name}
						<br />
						<strong>{t("pages.simulator.cardDetails.series")}</strong>{" "}
						{selectedCard?.series}
						<br />
						<strong>{t("pages.simulator.cardDetails.rarity")}</strong>{" "}
						{selectedCard?.rarity}
						<br />
						<strong>{t("pages.simulator.cardDetails.cardType")}</strong>{" "}
						{selectedCard?.card_type}
						<br />
						<strong>{t("pages.simulator.cardDetails.color")}</strong>{" "}
						{selectedCard?.color}
						<br />
						<strong>{t("pages.simulator.cardDetails.level")}</strong>{" "}
						{selectedCard?.level}
						<br />
						<strong>{t("pages.simulator.cardDetails.cost")}</strong>{" "}
						{selectedCard?.cost}
						<br />
						<strong>{t("pages.simulator.cardDetails.power")}</strong>{" "}
						{selectedCard?.power}
						<br />
						<strong>{t("pages.simulator.cardDetails.soul")}</strong>{" "}
						{selectedCard?.soul}
						<br />
						<strong>{t("pages.simulator.cardDetails.trigger")}</strong>{" "}
						{selectedCard?.trigger}
						<br />
						<strong>{t("pages.simulator.cardDetails.feature")}</strong>{" "}
						{selectedCard?.feature}
						<br />
						<strong>{t("pages.simulator.cardDetails.effect")}</strong>{" "}
						{selectedCard?.effect}
						<br />
						<strong>{t("pages.simulator.cardDetails.flavor")}</strong>{" "}
						{selectedCard?.flavor}
					</DialogContentText>
				</DialogContent>
			</Dialog>
		</Container>
	);
}

export default Simulator;
