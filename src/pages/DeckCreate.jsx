import React, { useState } from "react";
import {
	TextField,
	Button,
	Box,
	Typography,
	Autocomplete,
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
	Fab,
	DialogActions,
	DialogContentText,
} from "@mui/material";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";

// Ensure RAILWAY_BACKEND_URL is accessible from environment variables
const RAILWAY_BACKEND_URL =
	"https://wstoolboxbackend-production.up.railway.app";

const DeckCreate = () => {
	const [deckName, setDeckName] = useState("");
	const [form, setForm] = useState({
		series: "",
	});
	const [seriesInput, setSeriesInput] = useState("");
	const [allCards, setAllCards] = useState([]);
	const [filteredCards, setFilteredCards] = useState([]);
	const [searchText, setSearchText] = useState("");
	const [color, setColor] = useState("");
	const [level, setLevel] = useState("");
	const [rarity, setRarity] = useState("");
	const [cardType, setCardType] = useState("");
	const [power, setPower] = useState("");
	const [cost, setCost] = useState("");
	const [soul, setSoul] = useState("");
	const [trigger, setTrigger] = useState("");
	const [cardCounts, setCardCounts] = useState({});
	const [deck, setDeck] = useState({});
	const [deckOpen, setDeckOpen] = useState(false);
	const [cardDialogOpen, setCardDialogOpen] = useState(false);
	const [selectedCard, setSelectedCard] = useState(null);

	const fetchSeriesCards = async (series) => {
		try {
			const url = `${RAILWAY_BACKEND_URL}/api/cards?series=${encodeURIComponent(
				series
			)}&page=1&pageSize=9999`;
			const res = await fetch(url);
			const data = await res.json();
			setAllCards(data.data);
			setFilteredCards(data.data);
		} catch (err) {
			console.error("获取系列数据失败:", err);
			setAllCards([]);
			setFilteredCards([]);
		}
	};

	// Unique dropdown options, excluding falsy and "-" values
	const uniqueColors = [
		...new Set(allCards.map((c) => c.color).filter((v) => v && v !== "-")),
	].sort();
	const uniqueLevels = [
		...new Set(allCards.map((c) => c.level).filter((v) => v && v !== "-")),
	].sort((a, b) => Number(a) - Number(b));
	const uniqueRarities = [
		...new Set(allCards.map((c) => c.rarity).filter((v) => v && v !== "-")),
	].sort();
	const uniqueCardTypes = [
		...new Set(allCards.map((c) => c.card_type).filter((v) => v && v !== "-")),
	].sort();
	const uniquePowers = [
		...new Set(allCards.map((c) => c.power).filter((v) => v && v !== "-")),
	].sort((a, b) => Number(a) - Number(b));
	const uniqueCosts = [
		...new Set(allCards.map((c) => c.cost).filter((v) => v && v !== "-")),
	].sort((a, b) => Number(a) - Number(b));
	const uniqueSouls = [
		...new Set(allCards.map((c) => c.soul).filter((v) => v && v !== "-")),
	].sort();
	const uniqueTriggers = [
		...new Set(allCards.map((c) => c.trigger).filter((v) => v && v !== "-")),
	].sort();

	// const handleCreate = () => {
	// 	console.log("创建卡组：", deckName);
	// };

	const handleFilterSearch = () => {
		const result = allCards.filter((card) => {
			if (color && card.color !== color) return false;
			if (level && card.level != level) return false;
			if (rarity && card.rarity !== rarity) return false;
			if (cardType && card.card_type !== cardType) return false;
			if (power && card.power != power) return false;
			if (cost && card.cost != cost) return false;
			if (soul && card.soul != soul) return false;
			if (trigger && card.trigger !== trigger) return false;

			if (form.search) {
				const searchLower = form.search.toLowerCase();
				if (
					!card.name.toLowerCase().includes(searchLower) &&
					!card.effect?.toLowerCase().includes(searchLower) &&
					!card.flavor?.toLowerCase().includes(searchLower) &&
					!card.id.toLowerCase().includes(searchLower) &&
					!card.zh_name.toLowerCase().includes(searchLower) &&
					!card.zh_flavor.toLowerCase().includes(searchLower) &&
					!card.zh_effect?.toLowerCase().includes(searchLower)
				) {
					return false;
				}
			}
			return true;
		});
		setFilteredCards(result);
	};

	const handleFilterReset = () => {
		setColor("");
		setLevel("");
		setRarity("");
		setCardType("");
		setPower("");
		setCost("");
		setSoul("");
		setTrigger("");
		setForm((prev) => ({
			series: prev.series,
			search: "",
		}));
		setFilteredCards(allCards);
	};

	const incrementCount = (cardId) => {
		setCardCounts((prev) => {
			const currentCount = prev[cardId] || 0;
			if (currentCount >= 4) return prev;
			return {
				...prev,
				[cardId]: currentCount + 1,
			};
		});
		setDeck((prevDeck) => {
			const currentCount = prevDeck[cardId] || 0;
			if (currentCount >= 4) return prevDeck;
			return {
				...prevDeck,
				[cardId]: currentCount + 1,
			};
		});
	};

	const decrementCount = (cardId) => {
		setCardCounts((prev) => {
			const current = prev[cardId] || 0;
			if (current <= 0) return prev;
			return {
				...prev,
				[cardId]: current - 1,
			};
		});
		setDeck((prevDeck) => {
			const current = prevDeck[cardId] || 0;
			if (current <= 0) {
				return prevDeck;
			} else if (current === 1) {
				const { [cardId]: _, ...rest } = prevDeck;
				return rest;
			}
			return { ...prevDeck, [cardId]: current - 1 };
		});
	};

	return (
		<Box
			display={"flex"}
			flexDirection="column"
			alignItems="center">
			<Typography
				variant="h6"
				gutterBottom>
				创建新的卡组
			</Typography>
			<TextField
				label="卡组名称"
				variant="outlined"
				value={deckName}
				onChange={(e) => setDeckName(e.target.value)}
				sx={{ mb: 2, width: { xs: "80%", md: "50%" } }}
			/>
			{/* 筛选器区域 */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					mb: 2,
					width: { xs: "80%", md: "50%" },
					gap: 2,
				}}>
				<Autocomplete
					options={productList.series
						.slice()
						.sort()
						.map(
							(s) =>
								`${s}${
									translationMap.series?.[s]
										? `（${translationMap.series[s]}）`
										: ""
								}`
						)}
					value={
						seriesInput
							? `${seriesInput}${
									translationMap.series?.[seriesInput]
										? `（${translationMap.series[seriesInput]}）`
										: ""
							  }`
							: ""
					}
					sx={{ flex: 1 }}
					size="small"
					onChange={(_, newValue) => {
						const key = newValue?.split("（")[0];
						setSeriesInput(key || "");
					}}
					renderInput={(params) => (
						<TextField
							{...params}
							label="系列"
							variant="outlined"
						/>
					)}
					clearOnEscape
					freeSolo={false}
					disableClearable={false}
				/>
				<Button
					variant="contained"
					color="primary"
					onClick={() => {
						setForm((prev) => ({ ...prev, series: seriesInput }));
						fetchSeriesCards(seriesInput);
					}}>
					确定
				</Button>
			</Box>
			{form.series && (
				<Box
					component="form"
					sx={{
						display: "flex",
						flexWrap: "wrap",
						gap: 2,
						alignItems: "center",
						mb: 3,
						width: { xs: "80%", md: "50%" },
						justifyContent: "center",
					}}
					noValidate
					autoComplete="off"
					onSubmit={(e) => {
						e.preventDefault();
						handleFilterSearch();
					}}>
					<Box
						sx={{
							display: "flex",
							width: "100%",
							justifyContent: "center",
							mb: 2,
						}}>
						<Box sx={{ width: "100%" }}>
							<TextField
								label="搜索"
								name="search"
								value={searchText}
								onChange={(_, newValue) => setSearchText(newValue || "")}
								variant="outlined"
								size="small"
								fullWidth
							/>
						</Box>
					</Box>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "repeat(2, 1fr)",
								md: "repeat(4, 1fr)",
							},
							gap: 2,
							width: "100%",
							px: 2,
						}}>
						<Autocomplete
							options={uniqueColors}
							value={color || null}
							onChange={(_, newValue) => setColor(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="颜色"
									variant="outlined"
									size="small"
								/>
							)}
						/>
						<Autocomplete
							options={uniqueLevels}
							value={level || null}
							onChange={(_, newValue) => setLevel(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="等级"
									variant="outlined"
									size="small"
								/>
							)}
						/>
						<Autocomplete
							options={uniqueRarities}
							value={rarity || null}
							onChange={(_, newValue) => setRarity(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="稀有度"
									variant="outlined"
									size="small"
								/>
							)}
						/>
						<Autocomplete
							options={uniqueCardTypes}
							value={cardType || null}
							onChange={(_, newValue) => setCardType(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="卡片类型"
									variant="outlined"
									size="small"
								/>
							)}
						/>
						<Autocomplete
							options={uniquePowers}
							size="small"
							value={power || null}
							onChange={(_, newValue) => setPower(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="攻击力"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
						<Autocomplete
							options={uniqueCosts}
							size="small"
							value={cost || null}
							onChange={(_, newValue) => setCost(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="费用"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
						<Autocomplete
							options={uniqueSouls}
							size="small"
							value={soul || null}
							onChange={(_, newValue) => setSoul(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="灵魂"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
						<Autocomplete
							options={uniqueTriggers}
							value={trigger || null}
							onChange={(_, newValue) => setTrigger(newValue || "")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="触发"
									variant="outlined"
									size="small"
								/>
							)}
						/>
					</Box>
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							gap: 2,
							width: "50%",
						}}>
						<Button
							variant="contained"
							color="primary"
							onClick={handleFilterSearch}
							fullWidth
							size="medium">
							筛选
						</Button>
						<Button
							variant="outlined"
							color="secondary"
							onClick={handleFilterReset}
							fullWidth
							size="medium">
							重置
						</Button>
					</Box>
				</Box>
			)}
			<Button
				type="submit"
				variant="contained"
				size="large"
				sx={{
					px: 6,
					py: 1.5,
					backgroundColor: "#a6ceb6",
					"&:hover": { backgroundColor: "#95bfa5" },
				}}>
				创建
			</Button>
			<Box
				sx={{
					mt: 4,
					p: 2,
					width: "80%",
					maxWidth: 800,
					backgroundColor: "#f5f5f5",
					border: "1px solid #ccc",
					borderRadius: "8px",
					fontFamily: "monospace",
					fontSize: "0.85rem",
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}>
				{/* <Typography
					variant="subtitle1"
					gutterBottom>
					筛选结果
				</Typography> */}
				{/* <Box
					sx={{
						
						mt: 4,
						p: 2,
						width: "80%",
						maxWidth: 800,
						backgroundColor: "#f5f5f5",
						border: "1px solid #ccc",
						borderRadius: "8px",
						fontFamily: "monospace",
						fontSize: "0.85rem",
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
					}}>
					<Typography
						variant="subtitle1"
						gutterBottom>
						当前卡组 (deck)
					</Typography>
					{JSON.stringify(deck, null, 2)}
				</Box> */}
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(5, 1fr)" },
						gap: 2,
					}}>
					{filteredCards.map((card) => (
						<Box key={card.cardno}>
							<img
								src={card.image_url}
								alt={card.name}
								style={{
									width: "100%",
									height: "auto",
									borderRadius: 4,
									cursor: "pointer",
								}}
								onClick={() => {
									setSelectedCard(card);
									setCardDialogOpen(true);
								}}
							/>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									mt: 1,
									gap: 0.5,
									overflowX: "hidden",
									flexWrap: "nowrap",
									maxWidth: "100%",
								}}>
								<Button
									variant="outlined"
									size="small"
									sx={{ minWidth: 22, px: 0.25, py: 0, fontSize: "0.7rem" }}
									onClick={() => decrementCount(card.cardno)}>
									-
								</Button>
								<Typography
									sx={{
										minWidth: 16,
										textAlign: "center",
										fontSize: "0.7rem",
									}}>
									{cardCounts[card.cardno] || 0}
								</Typography>
								<Button
									variant="outlined"
									size="small"
									sx={{ minWidth: 22, px: 0.25, py: 0, fontSize: "0.7rem" }}
									onClick={() => incrementCount(card.cardno)}>
									+
								</Button>
							</Box>
						</Box>
					))}
				</Box>
			</Box>
			<Box
				sx={{
					mt: 4,
					p: 2,
					width: "80%",
					maxWidth: 800,
					backgroundColor: "#f5f5f5",
					border: "1px solid #ccc",
					borderRadius: "8px",
					fontFamily: "monospace",
					fontSize: "0.85rem",
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}>
				<Typography
					variant="subtitle1"
					gutterBottom>
					所有卡片
				</Typography>
				{JSON.stringify(allCards, null, 2)}
			</Box>
			<Fab
				color="primary"
				sx={{ position: "fixed", bottom: 16, right: 16 }}
				onClick={() => setDeckOpen(true)}>
				卡组
			</Fab>
			<Dialog
				open={deckOpen}
				onClose={() => setDeckOpen(false)}>
				<DialogTitle>当前卡组</DialogTitle>
				<DialogContent>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "repeat(3, 1fr)",
								sm: "repeat(5, 1fr)",
							},
							gap: 2,
						}}>
						{Object.entries(deck).map(([cardId, count]) => {
							const card = allCards.find((c) => c.cardno === cardId);
							if (!card) return null;
							return (
								<Box
									key={cardId}
									sx={{ textAlign: "center" }}>
									<img
										src={card.image_url}
										alt={card.name}
										style={{ width: "100%", height: "auto", borderRadius: 4 }}
									/>
									<Typography variant="body2">x{count}</Typography>
								</Box>
							);
						})}
					</Box>
				</DialogContent>
			</Dialog>
			<Dialog
				fullScreen
				open={cardDialogOpen}
				onClose={() => setCardDialogOpen(false)}>
				<DialogTitle>{selectedCard?.name || "卡片详情"}</DialogTitle>
				<DialogContent dividers>
					{selectedCard && (
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: 2,
							}}>
							<img
								src={selectedCard.image_url}
								alt={selectedCard.name}
								style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 8 }}
							/>
							<Box sx={{ width: "100%", maxWidth: 600 }}>
								<Typography
									variant="h6"
									gutterBottom>
									{selectedCard.name}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									稀有度: {selectedCard.rarity || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									类型: {selectedCard.card_type || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									颜色: {selectedCard.color || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									等级: {selectedCard.level || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									费用: {selectedCard.cost || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									攻击力: {selectedCard.power || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									灵魂: {selectedCard.soul || "无"}
								</Typography>
								<Typography
									variant="body1"
									gutterBottom>
									触发: {selectedCard.trigger || "无"}
								</Typography>
								{selectedCard.flavor && (
									<Typography
										variant="body2"
										gutterBottom
										sx={{ fontStyle: "italic" }}>
										风味: {selectedCard.flavor}
									</Typography>
								)}
								{selectedCard.flavor && (
									<Typography
										variant="body2"
										gutterBottom
										sx={{ fontStyle: "italic" }}>
										中文风味: {selectedCard.flavor}
									</Typography>
								)}
								{selectedCard.effect && (
									<Typography
										variant="body2"
										gutterBottom>
										效果: {selectedCard.effect}
									</Typography>
								)}
								{selectedCard.zh_effect && (
									<Typography
										variant="body2"
										gutterBottom>
										效果: {selectedCard.zh_effect}
									</Typography>
								)}
							</Box>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setCardDialogOpen(false)}
						color="primary">
						关闭
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default DeckCreate;
