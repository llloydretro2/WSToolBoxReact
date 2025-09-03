import React, { useState, useEffect } from "react";
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
import productList from "../data/productList.json";

function Simulator() {
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [cards, setCards] = useState([]);
	const [rarityMap, setRarityMap] = useState({});
	const [rarityRates, setRarityRates] = useState({});
	const [cardsPerPack, setCardsPerPack] = useState(6);
	const [packsPerBox, setPacksPerBox] = useState(16);
	const [boxesPerCase, setBoxesPerCase] = useState(20);
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
			.filter(([key, val]) => val.pack || val.box || val.case)
			.sort(([aKey, aVal], [bKey, bVal]) => {
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
		<Container maxWidth="sm" sx={{ textAlign: "center", pt: 8 }}>
			<Typography variant="h2" gutterBottom>
				模拟开包
			</Typography>
			<Typography variant="body1" color="text.secondary">
				如果是高稀有的卡请填写保底多少盒出现一次，系统自动计算概率。
			</Typography>
			<Typography variant="h6" color="text.secondary">
				如果不是高稀有度卡请不要设定保底输入。
			</Typography>
			<Autocomplete
				options={productList.product_name.slice().sort()}
				getOptionLabel={(option) => option}
				value={selectedProduct}
				onChange={async (event, newValue) => {
					setSelectedProduct(newValue);
					// https://wstoolboxbackend-production.up.railway.app/api/cards?${params}
					// http://localhost:4000/api/cards/by-product?product_name=
					if (newValue) {
						try {
							const res = await fetch(
								`https://wstoolboxbackend-production.up.railway.app/api/cards/by-product?product_name=${encodeURIComponent(
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
						label="选择产品"
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
				sx={{ bgcolor: "rgba(166, 206, 182, 0.6)" }}
			>
				<TextField
					fullWidth
					label="一包卡片数"
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
					label="一盒总包数"
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
					label="一箱总盒数"
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
					label="模拟开包数"
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
					sx={{ bgcolor: "rgba(166, 206, 182, 0.6)" }}
				>
					<Typography variant="h6" gutterBottom>
						{rarity}
					</Typography>
					<Box
						display="grid"
						gridTemplateColumns={{ xs: "1fr", sm: "repeat(4, 1fr)" }}
						gap={2}
					>
						<TextField
							fullWidth
							label={`保底（包）`}
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
							label={`保底（盒）`}
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
							label={`保底（箱）`}
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
						<Button
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
							}
						>
							重置
						</Button>
					</Box>
				</Box>
			))}

			<Button
				variant="contained"
				color="primary"
				size="large"
				onClick={simulatePacks}
				sx={{
					m: 2,
					backgroundColor: "#a6ceb6",
					"&:hover": { backgroundColor: "#95bfa5" },
				}}
			>
				开始模拟
			</Button>

			<Button
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
				}}
			>
				清除结果
			</Button>

			{simulatedResult.length > 0 && (
				<Box sx={{ mt: 4 }}>
					<Typography variant="h5" gutterBottom>
						稀有度分类展示（仅展示模拟抽到的卡）
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
								<Box key={rarity} sx={{ mb: 3 }}>
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
										}}
									>
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
												}}
											>
												<Box
													component="img"
													src={card.image_url}
													alt={card.name}
													sx={{
														width: "100%",
														height: "auto",
													}}
												/>
												<Typography variant="caption" display="block">
													×{count}
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
					<Typography variant="h5" gutterBottom>
						具体模拟结果
					</Typography>
					{simulatedResult.map((pack, index) => (
						<Box key={index} sx={{ mb: 3 }}>
							<Typography variant="subtitle1">第 {index + 1} 包</Typography>
							<Box
								sx={{
									display: "flex",
									flexWrap: "wrap",
									gap: 1,
									mt: 1,
									border: "1px solid #ccc",
									borderRadius: 2,
									p: 1,
								}}
							>
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
										}}
									>
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
				fullWidth
			>
				<DialogTitle>{selectedCard?.name}</DialogTitle>
				<DialogContent>
					<Box
						component="img"
						src={selectedCard?.image_url}
						alt={selectedCard?.name}
						sx={{ width: "100%", height: "auto", mb: 2 }}
					/>
					<DialogContentText>
						<strong>编号:</strong> {selectedCard?.cardno}
						<br />
						<strong>产品名:</strong> {selectedCard?.product_name}
						<br />
						<strong>系列:</strong> {selectedCard?.series}
						<br />
						<strong>稀有度:</strong> {selectedCard?.rarity}
						<br />
						<strong>卡片类型:</strong> {selectedCard?.card_type}
						<br />
						<strong>颜色:</strong> {selectedCard?.color}
						<br />
						<strong>等级:</strong> {selectedCard?.level}
						<br />
						<strong>费用:</strong> {selectedCard?.cost}
						<br />
						<strong>攻击力:</strong> {selectedCard?.power}
						<br />
						<strong>灵魂:</strong> {selectedCard?.soul}
						<br />
						<strong>触发:</strong> {selectedCard?.trigger}
						<br />
						<strong>特征:</strong> {selectedCard?.feature}
						<br />
						<strong>效果:</strong> {selectedCard?.effect}
						<br />
						<strong>风味文本:</strong> {selectedCard?.flavor}
					</DialogContentText>
				</DialogContent>
			</Dialog>
		</Container>
	);
}

export default Simulator;
