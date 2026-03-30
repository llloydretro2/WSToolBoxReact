import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLocale } from "../contexts/LocaleContext";
import {
	Box,
	Typography,
	TextField,
	Button,
	Card,
	CardContent,
	Snackbar,
	Alert,
	CircularProgress,
	Grid,
	Autocomplete,
	ToggleButtonGroup,
	ToggleButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Divider,
	Fab,
} from "@mui/material";
import { Visibility } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import {
	PrimaryButton,
	SecondaryButton,
	DangerButton,
	GenerateButton,
	SubtleButton,
} from "../components/ButtonVariants";

// 导入卡组规则数据
import { useOptions } from "../contexts/OptionsContext";

const BACKEND_URL = "https://api.cardtoolbox.org";

const DeckEdit = () => {
	const { t } = useLocale();
	const navigate = useNavigate();
	const location = useLocation();
	const { token } = useAuth();
	const { deckRules } = useOptions();

	// 原有状态
	const [deckData, setDeckData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// 与 DeckCreate 相同的状态
	const [side, setSide] = useState("weiss");
	const [form, setForm] = useState({ series: "" });
	const [seriesInput, setSeriesInput] = useState("");
	const [deckName, setDeckName] = useState("");
	const [deck, setDeck] = useState({});
	const [cardCounts, setCardCounts] = useState({});

	// 筛选相关状态
	const [color, setColor] = useState("");
	const [level, setLevel] = useState("");
	const [rarity, setRarity] = useState("");
	const [cardType, setCardType] = useState("");
	const [power, setPower] = useState("");
	const [cost, setCost] = useState("");
	const [soul, setSoul] = useState("");
	const [trigger, setTrigger] = useState("");
	const [searchText, setSearchText] = useState("");

	// 卡片数据相关状态
	const [allCards, setAllCards] = useState([]);
	const [filteredCards, setFilteredCards] = useState([]);
	const [isLoadingCards, setIsLoadingCards] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [currentPage, setCurrentPage] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [snackbarOpen, setSnackbarOpen] = useState(false);
	const [snackbarMessage, setSnackbarMessage] = useState("");
	const pageSize = 20;

	// 对话框状态
	const [confirmDialog, setConfirmDialog] = useState({
		open: false,
		newSeries: "",
		newSeriesCodes: "",
	});
	const [deckOpen, setDeckOpen] = useState(false);

	// 从后端获取卡组数据
	useEffect(() => {
		const fetchDeckData = async () => {
			console.log("DeckEdit 组件启动");
			console.log("location:", location);
			console.log("location.state:", location.state);

			// 从 location.state 获取卡组 ID
			const deckId = location.state?.deckId;
			console.log("获取到的 deckId:", deckId);
			console.log("当前 token:", token ? "存在" : "不存在");

			if (!deckId) {
				console.error("❌ 缺少卡组ID");
				setSnackbarMessage("缺少卡组ID，将返回卡组列表");
				setSnackbarOpen(true);
				setLoading(false);
				setTimeout(() => navigate("/deck-search"), 3000);
				return;
			}

			if (!token) {
				console.error("❌ 用户未登录");
				setSnackbarMessage("请先登录，将返回卡组列表");
				setSnackbarOpen(true);
				setLoading(false);
				setTimeout(() => navigate("/deck-search"), 3000);
				return;
			}

			setLoading(true);
			try {
				console.log("正在获取卡组数据，ID:", deckId);

				const response = await fetch(`${BACKEND_URL}/api/decks/${deckId}`, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) {
					throw new Error("获取卡组数据失败");
				}

				const data = await response.json();

				// 显示完整的获取到的信息用于调试
				console.log("从后端获取的完整卡组数据:", data);
				console.log("卡组ID:", data._id || data.id);
				console.log("卡组名称:", data.name);
				console.log("卡组边:", data.side);
				console.log("卡组系列:", data.series);
				console.log("卡组卡片:", data.cards);
				console.log("创建时间:", data.createdAt);
				console.log("更新时间:", data.updatedAt);
				console.log("作者:", data.author);

				setDeckData(data);
				setDeckName(data.name || "");

				// 处理卡组数据
				const deckCards = data.cards || [];
				const processedDeck = {};

				if (Array.isArray(deckCards)) {
					deckCards.forEach((card) => {
						if (card.cardNo && card.count) {
							processedDeck[card.cardNo] = card.count;
						}
					});
				}

				console.log("处理后的卡组数据:", processedDeck);
				setDeck(processedDeck);
			} catch (error) {
				console.error("获取卡组数据失败:", error);
				setSnackbarMessage(error.message || "获取卡组数据失败");
				setSnackbarOpen(true);
			} finally {
				setLoading(false);
			}
		};

		fetchDeckData();
	}, [location, token, navigate]);

	// 初始化数据：设置从数据库获取的值到对应的状态
	useEffect(() => {
		if (deckData) {
			// 设置边
			setSide(deckData.side || "weiss");
			// 设置系列
			setForm({ series: deckData.series || "" });
			setSeriesInput(deckData.series || "");
			// 从卡组数据中设置 cardCounts
			const counts = {};
			if (Array.isArray(deckData.cards)) {
				deckData.cards.forEach((card) => {
					if (card.cardNo && card.count) {
						counts[card.cardNo] = card.count;
					}
				});
			}
			setCardCounts(counts);
		}
	}, [deckData]);

	// 从 DeckCreate 复制的所有函数
	const buildQueryParams = (targetSeries, overrides = {}) => {
		const params = new URLSearchParams();
		params.set("series", targetSeries);

		const appliedFilters = {
			color: overrides.color ?? color,
			level: overrides.level ?? level,
			rarity: overrides.rarity ?? rarity,
			card_type: overrides.card_type ?? cardType,
			power: overrides.power ?? power,
			cost: overrides.cost ?? cost,
			soul: overrides.soul ?? soul,
			trigger: overrides.trigger ?? trigger,
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

	// Unique dropdown options
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

	// 获取当前side的系列数据
	const getCurrentSideData = () => {
		return side === "weiss" ? deckRules.weiss : deckRules.schwarz;
	};

	// 获取当前side的系列选项
	const getCurrentSeriesOptions = () => {
		return getCurrentSideData()
			.map((item) => item.title)
			.sort();
	};

	// 保存卡组的函数
	const handleSaveDeck = async () => {
		try {
			setIsSaving(true);

			// 准备卡片数据
			const cardsArray = Object.entries(cardCounts)
				.filter(([_cardNo, count]) => count > 0)
				.map(([cardNo, count]) => {
					const cardInfo = allCards.find((card) => card.card_no === cardNo);
					return {
						cardNo: cardNo,
						count: count,
						imageUrl: cardInfo?.image_path || "",
						info: cardInfo || {},
					};
				});

			const deckDataToSave = {
				name: deckName,
				side: side,
				series: form.series,
				cards: cardsArray,
			};

			const response = await fetch(`${BACKEND_URL}/api/decks/${deckData._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(deckDataToSave),
			});

			if (!response.ok) {
				throw new Error("更新卡组失败");
			}

			setSnackbarMessage("卡组更新成功！");
			setSnackbarOpen(true);

			// 重新获取卡组数据以更新显示
			// await fetchDeckData();
		} catch (error) {
			console.error("保存卡组失败:", error);
			setSnackbarMessage("保存卡组失败: " + error.message);
			setSnackbarOpen(true);
		} finally {
			setIsSaving(false);
		}
	};

	// 保存卡组
	const handleSave = async () => {
		if (!deckData || !deckName.trim()) {
			setSnackbarMessage("请输入卡组名称");
			setSnackbarOpen(true);
			return;
		}

		setSaving(true);
		try {
			const deckEntries = Object.entries(deck).map(([cardNo, count]) => ({
				cardNo,
				count,
			}));

			const response = await fetch(`${BACKEND_URL}/api/decks/${deckData._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name: deckName.trim(),
					series: deckData.series,
					side: deckData.side,
					cards: deckEntries,
					isPublic: deckData.isPublic,
				}),
			});

			if (!response.ok) {
				throw new Error("保存卡组失败");
			}

			setSnackbarMessage("卡组保存成功");
			setSnackbarOpen(true);
		} catch (error) {
			console.error("保存卡组失败:", error);
			setSnackbarMessage(error.message || "保存卡组失败");
			setSnackbarOpen(true);
		} finally {
			setSaving(false);
		}
	};

	console.log("DeckEdit 组件正在渲染");
	console.log("当前状态 - loading:", loading, "deckData:", deckData);

	// 简化渲染逻辑，确保基本显示
	return (
		<Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
			<Typography
				variant="h4"
				component="h1"
				gutterBottom
				textAlign="center">
				编辑卡组
			</Typography>

			{loading ? (
				<Box
					display="flex"
					justifyContent="center"
					alignItems="center"
					minHeight="50vh">
					<CircularProgress />
					<Typography sx={{ ml: 2 }}>加载卡组数据中...</Typography>
				</Box>
			) : (
				<Grid
					container
					spacing={3}>
					{/* 原生数据展示框 */}
					<Grid
						item
						xs={12}>
						<Grid
							container
							spacing={2}>
							<Grid
								item
								xs={12}
								md={6}>
								<Card>
									<CardContent>
										<Typography
											variant="h6"
											gutterBottom
											color="primary">
											🔍 数据库原生数据
										</Typography>
										<Box
											sx={{
												backgroundColor: "#f5f5f5",
												p: 2,
												borderRadius: 1,
												maxHeight: "300px",
												overflow: "auto",
												fontFamily: "monospace",
												fontSize: "12px",
											}}>
											<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
												{deckData
													? JSON.stringify(deckData, null, 2)
													: "等待加载..."}
											</pre>
										</Box>
									</CardContent>
								</Card>
							</Grid>
							<Grid
								item
								xs={12}
								md={6}>
								<Card>
									<CardContent>
										<Typography
											variant="h6"
											gutterBottom
											color="secondary">
											📨 传递的参数数据
										</Typography>
										<Box
											sx={{
												backgroundColor: "#f0f8ff",
												p: 2,
												borderRadius: 1,
												maxHeight: "300px",
												overflow: "auto",
												fontFamily: "monospace",
												fontSize: "12px",
											}}>
											<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
												{JSON.stringify(location.state, null, 2)}
											</pre>
										</Box>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					</Grid>

					<Grid
						item
						xs={12}
						md={6}>
						<Card>
							<CardContent>
								<Typography
									variant="h6"
									gutterBottom>
									卡组信息
								</Typography>

								<TextField
									fullWidth
									label="卡组名称"
									value={deckName}
									onChange={(e) => setDeckName(e.target.value)}
									margin="normal"
								/>

								{deckData && (
									<Box sx={{ mt: 2 }}>
										<Typography
											variant="body2"
											color="text.secondary">
											卡组ID: {deckData._id || deckData.id || "未知"}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											{t("deckEdit.sideLabel")}:{" "}
											{deckData.side || t("deckEdit.notSet")}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											{t("deckEdit.seriesLabel")}:{" "}
											{deckData.series || t("deckEdit.notSet")}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											作者:{" "}
											{deckData.author?.username || deckData.author || "未知"}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											创建时间:{" "}
											{deckData.createdAt
												? new Date(deckData.createdAt).toLocaleString()
												: "未知"}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											更新时间:{" "}
											{deckData.updatedAt
												? new Date(deckData.updatedAt).toLocaleString()
												: "未知"}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											卡片数量:{" "}
											{Object.values(deck).reduce(
												(sum, count) => sum + count,
												0
											)}
										</Typography>
									</Box>
								)}
							</CardContent>
						</Card>
					</Grid>

					<Grid
						item
						xs={12}
						md={6}>
						<Card>
							<CardContent>
								<Typography
									variant="h6"
									gutterBottom>
									卡组内容
								</Typography>

								{Object.keys(deck).length > 0 ? (
									<Box>
										{Object.entries(deck).map(([cardno, count]) => (
											<Box
												key={cardno}
												display="flex"
												justifyContent="space-between"
												alignItems="center"
												py={1}
												borderBottom="1px solid #eee">
												<Typography variant="body2">{cardno}</Typography>
												<Typography variant="body2">x{count}</Typography>
											</Box>
										))}
									</Box>
								) : (
									<Typography
										variant="body2"
										color="text.secondary">
										{deckData ? "卡组为空" : "等待加载..."}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			)}

			<Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center" }}>
				<SecondaryButton
					variant="outlined"
					onClick={() => navigate("/deck-search")}
					disabled={saving}>
					返回卡组列表
				</SecondaryButton>
				{deckData && (
					<PrimaryButton
						variant="contained"
						onClick={handleSave}
						disabled={saving}
						sx={{
							backgroundColor: "#a6ceb6",
							"&:hover": {
								backgroundColor: "#8bb89d",
							},
						}}>
						{saving ? <CircularProgress size={20} /> : "保存卡组"}
					</PrimaryButton>
				)}
			</Box>

			{/* ===== 以下是完全复制 DeckCreate 的 UI 布局 ===== */}
			<Divider sx={{ my: 4, width: "100%" }} />

			<Box
				display={"flex"}
				flexDirection="column"
				alignItems="center"
				sx={{ mt: 4 }}>
				<Typography
					variant="h6"
					gutterBottom>
					编辑卡组配置
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
								value={power || null}
								onChange={(_, newValue) => setPower(newValue || "")}
								renderInput={(params) => (
									<TextField
										{...params}
										label="力量"
										variant="outlined"
										size="small"
									/>
								)}
							/>
							<Autocomplete
								options={uniqueCosts}
								value={cost || null}
								onChange={(_, newValue) => setCost(newValue || "")}
								renderInput={(params) => (
									<TextField
										{...params}
										label="费用"
										variant="outlined"
										size="small"
									/>
								)}
							/>
							<Autocomplete
								options={uniqueSouls}
								value={soul || null}
								onChange={(_, newValue) => setSoul(newValue || "")}
								renderInput={(params) => (
									<TextField
										{...params}
										label="魂"
										variant="outlined"
										size="small"
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
								gap: 2,
								justifyContent: "center",
								width: "100%",
								mt: 2,
							}}>
							<PrimaryButton
								type="submit"
								variant="contained"
								sx={{
									backgroundColor: "#a6ceb6",
									color: "white",
									fontWeight: "bold",
									"&:hover": {
										backgroundColor: "#8bb89d",
									},
								}}>
								搜索
							</PrimaryButton>
							<SecondaryButton
								type="button"
								variant="outlined"
								sx={{
									borderColor: "#a6ceb6",
									color: "#a6ceb6",
									fontWeight: "bold",
									"&:hover": {
										borderColor: "#8bb89d",
										backgroundColor: "rgba(166, 206, 182, 0.1)",
									},
								}}
								onClick={handleFilterReset}>
								重置
							</SecondaryButton>
						</Box>
					</Box>
				)}
			</Box>

			{/* 卡片展示区域 */}
			{form.series && (
				<Box sx={{ width: "100%", mt: 4 }}>
					{isLoadingCards ? (
						<Box
							display="flex"
							justifyContent="center"
							alignItems="center"
							minHeight="200px">
							<CircularProgress />
							<Typography sx={{ ml: 2 }}>加载卡片中...</Typography>
						</Box>
					) : (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: {
									xs: "repeat(3, 1fr)",
									sm: "repeat(5, 1fr)",
								},
								gap: 2,
							}}>
							{filteredCards.map((card) => {
								const cardId = card.cardno;
								const count = cardCounts[cardId] || 0;
								return (
									<Box key={cardId}>
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
												// 可以添加卡片详情对话框功能
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
												sx={{
													minWidth: 22,
													px: 0.25,
													py: 0,
													fontSize: "0.7rem",
												}}
												onClick={() => decrementCount(cardId)}
												disabled={count === 0}>
												-
											</DangerButton>
											<Typography
												sx={{
													minWidth: 30,
													textAlign: "center",
													fontSize: "0.75rem",
													fontWeight: "bold",
													backgroundColor: count > 0 ? "#a6ceb6" : "#e0e0e0",
													color: count > 0 ? "white" : "black",
													borderRadius: 1,
													px: 0.5,
													py: 0.25,
												}}>
												{count}
											</Typography>
											<PrimaryButton
												variant="outlined"
												size="small"
												sx={{
													minWidth: 22,
													px: 0.25,
													py: 0,
													fontSize: "0.7rem",
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

					{/* 加载更多按钮 */}
					{hasMore && !isLoadingCards && (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								mt: 3,
								mb: 2,
							}}>
							<SecondaryButton
								variant="outlined"
								onClick={handleLoadMore}
								disabled={isLoadingMore}
								sx={{
									borderColor: "#a6ceb6",
									color: "#a6ceb6",
									"&:hover": {
										borderColor: "#8bb89d",
										backgroundColor: "rgba(166, 206, 182, 0.1)",
									},
								}}>
								{isLoadingMore ? <CircularProgress size={20} /> : "加载更多"}
							</SecondaryButton>
						</Box>
					)}
				</Box>
			)}

			{/* 保存卡组按钮 */}
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					mt: 4,
					mb: 3,
				}}>
				<PrimaryButton
					variant="contained"
					onClick={handleSaveDeck}
					disabled={isSaving}
					sx={{
						backgroundColor: "#a6ceb6",
						color: "white",
						"&:hover": {
							backgroundColor: "#8bb89d",
						},
						minWidth: 120,
					}}>
					{isSaving ? <CircularProgress size={20} /> : "保存卡组"}
				</PrimaryButton>
			</Box>

			{/* 确认对话框 */}
			<Dialog
				open={confirmDialog.open}
				onClose={handleCancelSeriesChange}>
				<DialogTitle>确认切换系列</DialogTitle>
				<DialogContent>
					<Typography>
						切换系列将清空当前的筛选结果和卡片列表。确定要切换到 &quot;
						{confirmDialog.newSeries}&quot; 吗？
					</Typography>
				</DialogContent>
				<DialogActions>
					<SecondaryButton
						onClick={handleCancelSeriesChange}
						color="primary">
						取消
					</SecondaryButton>
					<PrimaryButton
						onClick={handleConfirmSeriesChange}
						color="primary"
						variant="contained">
						确定
					</PrimaryButton>
				</DialogActions>
			</Dialog>

			{/* 浮动按钮显示卡组 */}
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

			{/* 卡组详情对话框 */}
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
					{Object.values(cardCounts).reduce((sum, count) => sum + count, 0)}{" "}
					张卡片)
				</DialogTitle>
				<DialogContent sx={{ padding: 3, backgroundColor: "#f8f9fa" }}>
					{/* 调试信息 */}
					{Object.keys(cardCounts).length > 0 && (
						<Box
							sx={{ mb: 2, p: 1, backgroundColor: "#e9ecef", borderRadius: 1 }}>
							<Typography
								variant="caption"
								display="block">
								调试: cardCounts keys: {Object.keys(cardCounts).join(", ")}
							</Typography>
							<Typography
								variant="caption"
								display="block">
								调试: allCards length: {allCards.length}
							</Typography>
							<Typography
								variant="caption"
								display="block">
								调试: deckData.cards length: {deckData?.cards?.length || 0}
							</Typography>
						</Box>
					)}

					{Object.keys(cardCounts).length === 0 ? (
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
								点击搜索并添加卡片到卡组中开始构建吧！
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
							{Object.entries(cardCounts)
								.filter(([_cardId, count]) => count > 0)
								.map(([cardId, count]) => {
									// 首先尝试从 allCards 中查找
									let card = allCards.find((c) => c.cardno === cardId);

									// 如果在 allCards 中没找到，从 deckData.cards 中查找
									if (!card && deckData && deckData.cards) {
										const deckCard = deckData.cards.find(
											(c) => c.cardNo === cardId
										);
										if (deckCard && deckCard.info) {
											card = {
												cardno: deckCard.cardNo,
												image_url: deckCard.imageUrl,
												name:
													deckCard.info.name || deckCard.info.zh_name || cardId,
												...deckCard.info,
											};
										}
									}

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
				open={snackbarOpen}
				autoHideDuration={6000}
				onClose={() => setSnackbarOpen(false)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
				<Alert
					onClose={() => setSnackbarOpen(false)}
					severity="success"
					sx={{ width: "100%" }}>
					{snackbarMessage}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default DeckEdit;
