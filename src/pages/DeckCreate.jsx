import React, { useState, useEffect } from "react";
import { useLocale } from "../contexts/LocaleContext";
import {
	TextField,
	Button,
	Box,
	Typography,
	Autocomplete,
	Dialog,
	DialogTitle,
	DialogContent,
	Fab,
	DialogActions,
	CircularProgress,
	Snackbar,
	Alert,
	ToggleButtonGroup,
	ToggleButton,
} from "@mui/material";
import {
	PrimaryButton,
	SecondaryButton,
	DangerButton,
} from "../components/ButtonVariants";
import deckRulesWeiss from "../data/deck_rules_weiss.json";
import deckRulesSchwarz from "../data/deck_rules_schwarz.json";

// Ensure BACKEND_URL is accessible from environment variables
const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";

const DeckCreate = () => {
	const { t } = useLocale();
	const [deckName, setDeckName] = useState("");
	const [side, setSide] = useState("weiss"); // "weiss" or "schwarz"
	const [form, setForm] = useState({
		series: "",
	});
	const [seriesInput, setSeriesInput] = useState("");
	const [allCards, setAllCards] = useState([]);
	const [filteredCards, setFilteredCards] = useState([]);
	const [currentPage, setCurrentPage] = useState(0);
	const pageSize = 20;
	const [isLoadingCards, setIsLoadingCards] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
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
	const [creatingDeck, setCreatingDeck] = useState(false);
	const [snackbar, setSnackbar] = useState({
		open: false,
		message: "",
		severity: "success",
	});
	const [confirmDialog, setConfirmDialog] = useState({
		open: false,
		newSeries: "",
		newSeriesCodes: "",
	});

	// 当side改变时，重置相关状态
	useEffect(() => {
		setSeriesInput("");
		setForm({ series: "" });
		setAllCards([]);
		setFilteredCards([]);
		setCurrentPage(0);
		setHasMore(false);
		// 重置筛选条件
		setColor("");
		setLevel("");
		setRarity("");
		setCardType("");
		setPower("");
		setCost("");
		setSoul("");
		setTrigger("");
		setSearchText("");
	}, [side]);

	const buildQueryParams = (seriesParam, overrides = {}) => {
		const params = new URLSearchParams();
		params.set("series", seriesParam);
		params.set("pageSize", pageSize.toString());

		const appliedFilters = {
			color,
			level,
			rarity,
			card_type: cardType,
			power,
			cost,
			soul,
			trigger,
			search: searchText.trim(),
			...overrides,
		};

		Object.entries(appliedFilters).forEach(([key, value]) => {
			if (value) {
				params.set(key, value);
			}
		});

		return params;
	};

	const fetchCards = async ({
		page = 1,
		reset = false,
		seriesParam,
		filters = {},
		isLoadMore = false,
	} = {}) => {
		const targetSeries = (seriesParam ?? form.series)?.trim();
		if (!targetSeries) return;

		const params = buildQueryParams(targetSeries, filters);
		params.set("page", page.toString());

		if (isLoadMore) {
			setIsLoadingMore(true);
		} else {
			setIsLoadingCards(true);
		}

		try {
			const response = await fetch(
				`${BACKEND_URL}/api/cards?${params.toString()}`
			);
			if (!response.ok) {
				throw new Error("获取卡片数据失败");
			}
			const result = await response.json();
			const incoming = Array.isArray(result.data) ? result.data : [];
			setAllCards((prev) => (reset ? incoming : [...prev, ...incoming]));
			setFilteredCards((prev) => (reset ? incoming : [...prev, ...incoming]));
			setCurrentPage(page);
			const total = Number(result.total) || incoming.length;
			setHasMore(page * pageSize < total);
		} catch (err) {
			console.error("获取系列数据失败:", err);
			if (reset) {
				setAllCards([]);
				setFilteredCards([]);
			}
		} finally {
			if (isLoadMore) {
				setIsLoadingMore(false);
			} else {
				setIsLoadingCards(false);
			}
		}
	};

	const fetchSeriesCards = async (series) => {
		setColor("");
		setLevel("");
		setRarity("");
		setCardType("");
		setPower("");
		setCost("");
		setSoul("");
		setTrigger("");
		setSearchText("");
		setAllCards([]);
		setFilteredCards([]);
		setCurrentPage(0);
		setHasMore(false);
		await fetchCards({
			page: 1,
			reset: true,
			seriesParam: series,
			filters: {
				color: "",
				level: "",
				rarity: "",
				card_type: "",
				power: "",
				cost: "",
				soul: "",
				trigger: "",
				search: "",
			},
		});
	};

	// 处理确认切换系列
	const handleConfirmSeriesChange = () => {
		const { newSeries, newSeriesCodes } = confirmDialog;
		setForm((prev) => ({ ...prev, series: newSeries }));
		fetchSeriesCards(newSeriesCodes);
		setConfirmDialog({ open: false, newSeries: "", newSeriesCodes: "" });
	};

	// 取消切换系列
	const handleCancelSeriesChange = () => {
		setConfirmDialog({ open: false, newSeries: "", newSeriesCodes: "" });
		// 重置输入框为当前系列
		setSeriesInput(form.series);
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
		setAllCards([]);
		setFilteredCards([]);
		setCurrentPage(0);
		setHasMore(false);
		fetchCards({ page: 1, reset: true });
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
		setSearchText("");
		setAllCards([]);
		setFilteredCards([]);
		setCurrentPage(0);
		setHasMore(false);
		fetchCards({
			page: 1,
			reset: true,
			filters: {
				color: "",
				level: "",
				rarity: "",
				card_type: "",
				power: "",
				cost: "",
				soul: "",
				trigger: "",
				search: "",
			},
		});
	};

	const incrementCount = (cardId) => {
		setCardCounts((prev) => {
			const currentCount = prev[cardId] || 0;
			return {
				...prev,
				[cardId]: currentCount + 1,
			};
		});
		setDeck((prevDeck) => {
			const currentCount = prevDeck[cardId] || 0;
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

	const handleLoadMore = () => {
		if (hasMore && !isLoadingMore) {
			fetchCards({ page: currentPage + 1, isLoadMore: true });
		}
	};

	const showSnackbar = (message, severity = "success") => {
		setSnackbar({ open: true, message, severity });
	};

	const handleSnackbarClose = (_, reason) => {
		if (reason === "clickaway") return;
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleCreateDeck = async () => {
		if (creatingDeck) return;
		const trimmedName = deckName.trim();
		if (!trimmedName) {
			showSnackbar("请输入卡组名称", "warning");
			return;
		}

		const deckEntries = Object.entries(deck).map(([cardNo, count]) => {
			const sourceCard =
				allCards.find((card) => card.cardno === cardNo) ||
				filteredCards.find((card) => card.cardno === cardNo);

			const info = sourceCard
				? {
						cardno: sourceCard.cardno,
						name: sourceCard.name,
						product_name: sourceCard.product_name,
						series: sourceCard.series,
						series_number: sourceCard.series_number,
						rarity: sourceCard.rarity,
						side: sourceCard.side,
						card_type: sourceCard.card_type,
						color: sourceCard.color,
						level: sourceCard.level,
						cost: sourceCard.cost,
						power: sourceCard.power,
						soul: sourceCard.soul,
						trigger: sourceCard.trigger,
						feature: sourceCard.feature,
						effect: sourceCard.effect,
						flavor: sourceCard.flavor,
						image_url: sourceCard.image_url,
						zh_name: sourceCard.zh_name,
						zh_effect: sourceCard.zh_effect,
						zh_flavor: sourceCard.zh_flavor,
				  }
				: {};

			return {
				cardNo,
				count,
				imageUrl: sourceCard?.image_url || "",
				info,
			};
		});

		if (deckEntries.length === 0) {
			showSnackbar("请先添加至少一张卡片", "warning");
			return;
		}

		const token = localStorage.getItem("token");
		if (!token) {
			showSnackbar(t("deckCreate.messages.loginRequired"), "warning");
			return;
		}

		setCreatingDeck(true);
		try {
			const deckPayload = {
				name: trimmedName,
				series: form.series,
				side: side, // 添加 side 字段
				cards: deckEntries,
				isPublic: true,
			};

			console.log("创建卡组请求数据:", deckPayload);
			console.log("当前选择的边:", side);
			console.log("当前选择的系列:", form.series);

			const response = await fetch(`${BACKEND_URL}/api/decks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(deckPayload),
			});

			if (!response.ok) {
				let errorMessage = t("deckCreate.messages.createFailed");
				try {
					const errorBody = await response.json();
					errorMessage = errorBody?.message || errorMessage;
				} catch (parseErr) {
					console.error("解析创建卡组错误响应失败:", parseErr);
				}
				throw new Error(errorMessage);
			}

			await response.json();
			showSnackbar(t("deckCreate.messages.createSuccess"), "success");
			setDeckName("");
			setDeck({});
			setCardCounts({});
			setDeckOpen(false);
		} catch (err) {
			console.error("创建卡组失败:", err);
			showSnackbar(
				err.message || t("deckCreate.messages.createFailed"),
				"error"
			);
		} finally {
			setCreatingDeck(false);
		}
	};

	// 获取当前side的系列数据
	const getCurrentSideData = () => {
		return side === "weiss"
			? deckRulesWeiss.title_categories
			: deckRulesSchwarz.title_categories;
	};

	// 获取当前side的系列选项
	const getCurrentSeriesOptions = () => {
		return getCurrentSideData()
			.map((item) => item.title)
			.sort();
	};

	return (
		<Box
			display={"flex"}
			flexDirection="column"
			alignItems="center">
			<Typography
				variant="h6"
				gutterBottom>
				{t("deckCreate.title")}
			</Typography>
			<TextField
				required
				label="卡组名称"
				variant="outlined"
				value={deckName}
				onChange={(e) => setDeckName(e.target.value)}
				sx={{ mb: 2, width: { xs: "80%", md: "50%" } }}
			/>

			{/* Side选择器 */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					mb: 2,
					width: { xs: "80%", md: "50%" },
				}}>
				<ToggleButtonGroup
					value={side}
					exclusive
					onChange={(_, newSide) => {
						if (newSide !== null) {
							setSide(newSide);
						}
					}}
					sx={{
						"& .MuiToggleButton-root": {
							border: "1px solid #a6ceb6",
							color: "#a6ceb6",
							fontWeight: "bold",
							px: 3,
							py: 1,
							"&.Mui-selected": {
								backgroundColor: "#a6ceb6",
								color: "white",
								"&:hover": {
									backgroundColor: "#8bb89d",
								},
							},
							"&:hover": {
								backgroundColor: "rgba(166, 206, 182, 0.1)",
							},
						},
					}}>
					<ToggleButton
						value="weiss"
						aria-label="weiss side">
						Weiß Side
					</ToggleButton>
					<ToggleButton
						value="schwarz"
						aria-label="schwarz side">
						Schwarz Side
					</ToggleButton>
				</ToggleButtonGroup>
			</Box>
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
					options={getCurrentSeriesOptions()}
					value={seriesInput}
					sx={{ flex: 1 }}
					size="small"
					onChange={(_, newValue) => {
						setSeriesInput(newValue || "");
					}}
					renderInput={(params) => (
						<TextField
							{...params}
							label={`系列 (${side === "weiss" ? "Weiß" : "Schwarz"})`}
							variant="outlined"
						/>
					)}
					clearOnEscape
					freeSolo={false}
					disableClearable={false}
				/>
				<PrimaryButton
					variant="contained"
					sx={{
						backgroundColor: "#a6ceb6",
						color: "white",
						fontWeight: "bold",
						"&:hover": {
							backgroundColor: "#8bb89d",
						},
					}}
					onClick={() => {
						const trimmedSeries = seriesInput.trim();
						if (!trimmedSeries) return;

						// 根据选择的系列标题获取所有系列代码
						const currentData = getCurrentSideData();
						const selectedSeriesData = currentData.find(
							(item) => item.title === trimmedSeries
						);

						const newSeriesCodes =
							selectedSeriesData && selectedSeriesData.series_codes
								? selectedSeriesData.series_codes.join(",")
								: trimmedSeries;

						// 如果已经有选择的系列且不同于当前选择，显示确认对话框
						if (form.series && form.series !== trimmedSeries) {
							setConfirmDialog({
								open: true,
								newSeries: trimmedSeries,
								newSeriesCodes: newSeriesCodes,
							});
						} else {
							// 直接切换系列
							setForm((prev) => ({ ...prev, series: trimmedSeries }));
							fetchSeriesCards(newSeriesCodes);
						}
					}}>
					确定
				</PrimaryButton>
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
								onChange={(event) => setSearchText(event.target.value)}
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
						<PrimaryButton
							variant="contained"
							color="primary"
							onClick={handleFilterSearch}
							fullWidth
							size="medium">
							筛选
						</PrimaryButton>
						<SecondaryButton
							variant="outlined"
							color="secondary"
							onClick={handleFilterReset}
							fullWidth
							size="medium">
							重置
						</SecondaryButton>
					</Box>
				</Box>
			)}
			<PrimaryButton
				type="button"
				variant="contained"
				size="large"
				disabled={creatingDeck}
				onClick={handleCreateDeck}
				sx={{
					px: 6,
					py: 1.5,
					backgroundColor: "#a6ceb6",
					"&:hover": { backgroundColor: "#95bfa5" },
				}}>
				{creatingDeck ? t("deckCreate.creating") : t("deckCreate.createButton")}
			</PrimaryButton>
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
				{isLoadingCards && filteredCards.length === 0 ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress />
					</Box>
				) : (
					<>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: {
									xs: "repeat(3, 1fr)",
									sm: "repeat(5, 1fr)",
								},
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
										<DangerButton
											variant="outlined"
											size="small"
											sx={{ minWidth: 22, px: 0.25, py: 0, fontSize: "0.7rem" }}
											onClick={() => decrementCount(card.cardno)}>
											-
										</DangerButton>
										<Typography
											sx={{
												minWidth: 16,
												textAlign: "center",
												fontSize: "0.7rem",
											}}>
											{cardCounts[card.cardno] || 0}
										</Typography>
										<PrimaryButton
											variant="outlined"
											size="small"
											sx={{ minWidth: 22, px: 0.25, py: 0, fontSize: "0.7rem" }}
											onClick={() => incrementCount(card.cardno)}>
											+
										</PrimaryButton>
									</Box>
								</Box>
							))}
						</Box>
						{filteredCards.length === 0 && !isLoadingCards && (
							<Typography
								align="center"
								sx={{ mt: 2 }}>
								没有符合条件的卡片
							</Typography>
						)}
						{hasMore && (
							<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
								<SecondaryButton
									variant="outlined"
									disabled={isLoadingMore}
									onClick={handleLoadMore}>
									{isLoadingMore ? "加载中..." : "加载更多"}
								</SecondaryButton>
							</Box>
						)}
					</>
				)}
			</Box>
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
					所有卡片
				</Typography>
				{JSON.stringify(allCards, null, 2)}
			</Box> */}
			<Fab
				sx={{
					position: "fixed",
					bottom: 16,
					right: 16,
					backgroundColor: "#a6ceb6",
					color: "white",
					fontSize: "16px",
					fontWeight: "bold",
					width: 64,
					height: 64,
					boxShadow: "0 8px 24px rgba(166, 206, 182, 0.4)",
					"&:hover": {
						backgroundColor: "#8bb89d",
						boxShadow: "0 12px 32px rgba(166, 206, 182, 0.6)",
						transform: "scale(1.05)",
					},
					transition: "all 0.3s ease",
				}}
				onClick={() => setDeckOpen(true)}>
				卡组
			</Fab>
			<Dialog
				open={deckOpen}
				onClose={() => setDeckOpen(false)}
				maxWidth="lg"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: "16px",
						maxHeight: "90vh",
						margin: "16px",
					},
				}}>
				<DialogTitle
					sx={{
						background: "linear-gradient(135deg, #a6ceb6 0%, #8bb89d 100%)",
						color: "white",
						fontWeight: "bold",
						textAlign: "center",
						fontSize: "1.3rem",
						padding: 3,
					}}>
					🎴 当前卡组 (
					{Object.values(deck).reduce((sum, count) => sum + count, 0)} 张卡片)
				</DialogTitle>
				<DialogContent sx={{ padding: 3, backgroundColor: "#f8f9fa" }}>
					{Object.keys(deck).length === 0 ? (
						<Box
							sx={{
								textAlign: "center",
								padding: 4,
								color: "#6c757d",
							}}>
							<Typography
								variant="h6"
								sx={{ marginBottom: 2 }}>
								📝 卡组为空
							</Typography>
							<Typography variant="body2">
								点击卡片添加到卡组中开始构建吧！
							</Typography>
						</Box>
					) : (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: {
									xs: "repeat(2, 1fr)",
									sm: "repeat(3, 1fr)",
									md: "repeat(4, 1fr)",
									lg: "repeat(5, 1fr)",
								},
								gap: 3,
							}}>
							{Object.entries(deck).map(([cardId, count]) => {
								const card = allCards.find((c) => c.cardno === cardId);
								if (!card) return null;
								return (
									<Box
										key={cardId}
										sx={{
											textAlign: "center",
											backgroundColor: "white",
											borderRadius: "12px",
											padding: 2,
											boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
											transition: "all 0.3s ease",
											"&:hover": {
												transform: "translateY(-4px)",
												boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
											},
										}}>
										<Box sx={{ position: "relative", marginBottom: 1 }}>
											<img
												src={card.image_url}
												alt={card.name}
												style={{
													width: "100%",
													height: "auto",
													borderRadius: "8px",
													boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
												}}
											/>
											<Box
												sx={{
													position: "absolute",
													top: -8,
													right: -8,
													backgroundColor: "#a6ceb6",
													color: "white",
													borderRadius: "50%",
													width: 32,
													height: 32,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													fontWeight: "bold",
													fontSize: "14px",
													boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
												}}>
												{count}
											</Box>
										</Box>
										<Typography
											variant="body2"
											sx={{
												fontWeight: "500",
												color: "#495057",
												marginBottom: 1,
												fontSize: "0.85rem",
												lineHeight: 1.2,
												display: "-webkit-box",
												WebkitLineClamp: 2,
												WebkitBoxOrient: "vertical",
												overflow: "hidden",
											}}>
											{card.name}
										</Typography>
										<Box
											sx={{
												display: "flex",
												justifyContent: "center",
												alignItems: "center",
												gap: 1,
											}}>
											<DangerButton
												size="small"
												variant="outlined"
												sx={{
													minWidth: 32,
													width: 32,
													height: 32,
													borderRadius: "50%",
													borderColor: "#dc3545",
													color: "#dc3545",
													"&:hover": {
														backgroundColor: "#dc3545",
														color: "white",
													},
												}}
												onClick={() => decrementCount(cardId)}>
												−
											</DangerButton>
											<Typography
												variant="body2"
												sx={{
													fontWeight: "bold",
													color: "#a6ceb6",
													minWidth: 24,
													textAlign: "center",
												}}>
												{count}
											</Typography>
											<PrimaryButton
												size="small"
												variant="outlined"
												sx={{
													minWidth: 32,
													width: 32,
													height: 32,
													borderRadius: "50%",
													borderColor: "#28a745",
													color: "#28a745",
													"&:hover": {
														backgroundColor: "#28a745",
														color: "white",
													},
												}}
												onClick={() => incrementCount(cardId)}>
												+
											</PrimaryButton>
										</Box>
									</Box>
								);
							})}
						</Box>
					)}
				</DialogContent>
			</Dialog>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
				<Alert
					onClose={handleSnackbarClose}
					severity={snackbar.severity}
					sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
			<Dialog
				open={cardDialogOpen}
				onClose={() => setCardDialogOpen(false)}
				maxWidth="md"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: { xs: "0", sm: "16px" },
						maxHeight: { xs: "100vh", sm: "90vh" },
						margin: { xs: "0", sm: "16px" },
						height: { xs: "100%", sm: "auto" },
					},
				}}>
				<DialogTitle
					sx={{
						background: "linear-gradient(135deg, #a6ceb6 0%, #8bb89d 100%)",
						color: "white",
						fontWeight: "bold",
						textAlign: "center",
						padding: { xs: 1.5, sm: 2 },
						fontSize: { xs: "1.1rem", sm: "1.25rem" },
					}}>
					{selectedCard?.name || "卡片详情"}
				</DialogTitle>
				<DialogContent
					dividers
					sx={{
						padding: { xs: 2, sm: 3 },
						overflowY: "auto",
						flex: 1,
					}}>
					{selectedCard && (
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								gap: { xs: 2, sm: 3 },
								alignItems: "center",
							}}>
							{/* 卡片图片 */}
							<Box
								sx={{
									display: "flex",
									justifyContent: "center",
									width: "100%",
								}}>
								<img
									src={selectedCard.image_url}
									alt={selectedCard.name}
									style={{
										maxWidth: "250px",
										width: "100%",
										height: "auto",
										borderRadius: "12px",
										boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
									}}
								/>
							</Box>

							{/* 卡片信息 */}
							<Box sx={{ width: "100%" }}>
								<Typography
									variant="h6"
									gutterBottom
									sx={{
										fontWeight: "bold",
										color: "#1b4332",
										borderBottom: "2px solid #a6ceb6",
										paddingBottom: 1,
										marginBottom: 2,
										fontSize: { xs: "1.1rem", sm: "1.25rem" },
									}}>
									{selectedCard.name}
								</Typography>

								{/* 基础信息网格 - 移动端改为单列 */}
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
										gap: { xs: 1.5, sm: 2 },
										marginBottom: { xs: 2, sm: 3 },
									}}>
									{[
										{ label: "稀有度", value: selectedCard.rarity, icon: "💎" },
										{
											label: "类型",
											value: selectedCard.card_type,
											icon: "🎴",
										},
										{ label: "颜色", value: selectedCard.color, icon: "🎨" },
										{ label: "等级", value: selectedCard.level, icon: "⭐" },
										{ label: "费用", value: selectedCard.cost, icon: "💰" },
										{ label: "攻击力", value: selectedCard.power, icon: "⚔️" },
										{ label: "灵魂", value: selectedCard.soul, icon: "👻" },
										{ label: "触发", value: selectedCard.trigger, icon: "⚡" },
									].map((item, index) => (
										<Box
											key={index}
											sx={{
												backgroundColor: "#f8f9fa",
												padding: { xs: 1, sm: 1.5 },
												borderRadius: "8px",
												border: "1px solid #e9ecef",
												display: "flex",
												alignItems: "center",
												gap: 1,
											}}>
											<span style={{ fontSize: { xs: "14px", sm: "16px" } }}>
												{item.icon}
											</span>
											<Typography
												variant="body2"
												sx={{
													fontWeight: "600",
													color: "#495057",
													fontSize: { xs: "0.8rem", sm: "0.875rem" },
												}}>
												{item.label}:
											</Typography>
											<Typography
												variant="body2"
												sx={{
													color: "#6c757d",
													fontSize: { xs: "0.8rem", sm: "0.875rem" },
												}}>
												{item.value || "无"}
											</Typography>
										</Box>
									))}
								</Box>

								{/* 风味文本 - 移动端优化 */}
								{(selectedCard.flavor || selectedCard.zh_flavor) && (
									<Box
										sx={{
											backgroundColor: "#f0f8f0",
											padding: { xs: 1.5, sm: 2 },
											borderRadius: "8px",
											borderLeft: "4px solid #a6ceb6",
											marginBottom: { xs: 1.5, sm: 2 },
										}}>
										<Typography
											variant="subtitle2"
											sx={{
												fontWeight: "bold",
												color: "#1b4332",
												marginBottom: 1,
												fontSize: { xs: "0.9rem", sm: "0.875rem" },
											}}>
											🌸 风味文本
										</Typography>
										{selectedCard.zh_flavor && (
											<Typography
												variant="body2"
												sx={{
													fontStyle: "italic",
													color: "#495057",
													marginBottom: 1,
													fontSize: { xs: "0.8rem", sm: "0.875rem" },
													lineHeight: 1.4,
												}}>
												{selectedCard.zh_flavor}
											</Typography>
										)}
										{selectedCard.flavor && (
											<Typography
												variant="body2"
												sx={{
													fontStyle: "italic",
													color: "#6c757d",
													fontSize: { xs: "0.75rem", sm: "0.8rem" },
													lineHeight: 1.4,
												}}>
												{selectedCard.flavor}
											</Typography>
										)}
									</Box>
								)}

								{/* 效果文本 - 移动端优化 */}
								{(selectedCard.effect || selectedCard.zh_effect) && (
									<Box
										sx={{
											backgroundColor: "#fff3cd",
											padding: { xs: 1.5, sm: 2 },
											borderRadius: "8px",
											borderLeft: "4px solid #ffc107",
										}}>
										<Typography
											variant="subtitle2"
											sx={{
												fontWeight: "bold",
												color: "#856404",
												marginBottom: 1,
												fontSize: { xs: "0.9rem", sm: "0.875rem" },
											}}>
											⚡ 卡片效果
										</Typography>
										{selectedCard.zh_effect && (
											<Typography
												variant="body2"
												sx={{
													color: "#495057",
													marginBottom: 1,
													lineHeight: 1.4,
													fontSize: { xs: "0.8rem", sm: "0.875rem" },
												}}>
												{selectedCard.zh_effect}
											</Typography>
										)}
										{selectedCard.effect && (
											<Typography
												variant="body2"
												sx={{
													color: "#6c757d",
													fontSize: { xs: "0.75rem", sm: "0.8rem" },
													lineHeight: 1.4,
												}}>
												{selectedCard.effect}
											</Typography>
										)}
									</Box>
								)}
							</Box>
						</Box>
					)}
				</DialogContent>
				<DialogActions
					sx={{
						padding: { xs: 1.5, sm: 2 },
						justifyContent: "center",
						borderTop: "1px solid #e9ecef",
					}}>
					<PrimaryButton
						onClick={() => setCardDialogOpen(false)}
						variant="contained"
						sx={{
							backgroundColor: "#a6ceb6",
							color: "white",
							fontWeight: "bold",
							paddingX: { xs: 3, sm: 4 },
							paddingY: { xs: 1, sm: 1.5 },
							borderRadius: "20px",
							fontSize: { xs: "0.9rem", sm: "1rem" },
							"&:hover": {
								backgroundColor: "#8bb89d",
							},
						}}>
						关闭
					</PrimaryButton>
				</DialogActions>
			</Dialog>

			{/* 确认切换系列对话框 */}
			<Dialog
				open={confirmDialog.open}
				onClose={handleCancelSeriesChange}
				maxWidth="sm"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: "12px",
						padding: 1,
					},
				}}>
				<DialogTitle
					sx={{
						textAlign: "center",
						color: "#1b4332",
						fontWeight: "bold",
						fontSize: "1.2rem",
					}}>
					⚠️ 确认切换系列
				</DialogTitle>
				<DialogContent sx={{ textAlign: "center", padding: 3 }}>
					<Typography
						variant="body1"
						sx={{ marginBottom: 2 }}>
						您当前已选择系列：
						<strong style={{ color: "#1b4332" }}>{form.series}</strong>
					</Typography>
					<Typography
						variant="body1"
						sx={{ marginBottom: 2 }}>
						确定要切换到：
						<strong style={{ color: "#a6ceb6" }}>
							{confirmDialog.newSeries}
						</strong>{" "}
						吗？
					</Typography>
					<Typography
						variant="body2"
						sx={{ color: "#666", fontStyle: "italic" }}>
						切换系列将清空当前的筛选条件和搜索结果
					</Typography>
				</DialogContent>
				<DialogActions sx={{ padding: 2, justifyContent: "center", gap: 2 }}>
					<SecondaryButton
						onClick={handleCancelSeriesChange}
						variant="outlined"
						sx={{
							borderColor: "#a6ceb6",
							color: "#a6ceb6",
							fontWeight: "bold",
							paddingX: 3,
							borderRadius: "20px",
							"&:hover": {
								backgroundColor: "rgba(166, 206, 182, 0.1)",
								borderColor: "#8bb89d",
							},
						}}>
						{t("deckCreate.cancel")}
					</SecondaryButton>
					<PrimaryButton
						onClick={handleConfirmSeriesChange}
						variant="contained"
						sx={{
							backgroundColor: "#a6ceb6",
							color: "white",
							fontWeight: "bold",
							paddingX: 3,
							borderRadius: "20px",
							"&:hover": {
								backgroundColor: "#8bb89d",
							},
						}}>
						确认切换
					</PrimaryButton>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default DeckCreate;
