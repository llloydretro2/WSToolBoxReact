import React, { useState, useEffect, useMemo, useCallback, useId } from "react";
import {
	Container,
	Box,
	TextField,
	Button,
	Typography,
	IconButton,
	Autocomplete,
	Card,
	CardContent,
	Pagination,
	Fab,
	Tooltip,
	Switch,
	FormControlLabel,
	Chip,
	Stack,
	Divider,
	ToggleButton,
	ToggleButtonGroup,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Paper,
	Slider,
	CircularProgress,
} from "@mui/material";
import { PrimaryButton, DangerButton } from "../components/ButtonVariants";
import LazyImage from "../components/LazyImage";

import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useLocale } from "../contexts/LocaleContext";
import { themeConfig } from "../theme/themeConfig";

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const BACKEND_URL = "http://localhost:4000";

const extractBaseCardNo = (cardno) => {
	if (!cardno) {
		return null;
	}
	const trimmed = cardno.trim();
	const match = trimmed.match(/^(.*\d)([A-Za-z]+)$/);
	return match ? match[1] : trimmed;
};

function CardList() {
	const [result, setResult] = useState({
		data: [],
		total: 0,
		page: 1,
		pageSize: 20,
	});

	const [form, setForm] = useState({ page: 1 });
	const [draftForm, setDraftForm] = useState({ page: 1 });
	const [levelRange, setLevelRange] = useState(null);
	const [powerRange, setPowerRange] = useState(null);
	const [costRange, setCostRange] = useState(null);
	const [showZh, setShowZh] = useState(false);
	const [showJP, setShowJP] = useState(true);
	const [showMergedVariants, setShowMergedVariants] = useState(true);
	const [selectedVariants, setSelectedVariants] = useState({});
	const [showScrollButtons, setShowScrollButtons] = useState(false);
	// related modal removed: relatedModalCard state is no longer used
	// New: detail dialog for showing a single card when clicking related chips
	const [detailCard, setDetailCard] = useState(null);

	const openDetailCard = (card) => {
		setDetailCard(card);
	};

	const closeDetailCard = () => setDetailCard(null);

	// 重置数值过滤（等级、攻击力、费用）
	const resetNumericFilters = () => {
		setLevelRange(null);
		setPowerRange(null);
		setCostRange(null);
	};
	const [hasSearched, setHasSearched] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { locale, t } = useLocale();
	const mergeVariantsSwitchId = useId();
	const colon = locale === "zh" ? "：" : ": ";
	const zhToggleTitle = showZh
		? t("pages.cardList.toggle.hideZh")
		: t("pages.cardList.toggle.showZh");
	const jpToggleTitle = showJP
		? t("pages.cardList.toggle.hideJp")
		: t("pages.cardList.toggle.showJp");
	const scrollDownLabel = t("pages.cardList.scroll.down");
	const scrollUpLabel = t("pages.cardList.scroll.up");

	// 计算有效的level值
	const validLevels = useMemo(() => {
		return productList.level
			.filter((level) => level !== "-")
			.map((level) => Number(level))
			.sort((a, b) => a - b);
	}, []);

	// level scale函数
	const levelScale = useCallback(
		(value) => {
			if (validLevels.length === 0) return 0;
			const index = Math.min(
				Math.max(0, Math.round(value)),
				validLevels.length - 1
			);
			return validLevels[index];
		},
		[validLevels]
	);

	// 计算有效的power值
	const validPowers = useMemo(() => {
		return productList.power
			.filter((power) => power !== "-")
			.map((power) => Number(power))
			.sort((a, b) => a - b);
	}, []);

	// power scale函数
	const powerScale = useCallback(
		(value) => {
			if (validPowers.length === 0) return 0;
			const index = Math.min(
				Math.max(0, Math.round(value)),
				validPowers.length - 1
			);
			return validPowers[index];
		},
		[validPowers]
	);

	// 计算有效的cost值
	const validCosts = useMemo(() => {
		return productList.cost
			.filter((cost) => cost !== "-")
			.map((cost) => Number(cost))
			.sort((a, b) => a - b);
	}, []);

	// cost scale函数
	const costScale = useCallback(
		(value) => {
			if (validCosts.length === 0) return 0;
			const index = Math.min(
				Math.max(0, Math.round(value)),
				validCosts.length - 1
			);
			return validCosts[index];
		},
		[validCosts]
	);

	// 获取实际的滚动容器（PageTransition 内部的 div）
	const getScrollContainer = () => {
		// PageTransition 创建的滚动容器是它内部的 div
		// 查找第一个有 overflowY: auto 的父元素
		let element = document.querySelector(
			'[style*="overflow-y: auto"], [style*="overflowY: auto"]'
		);
		if (!element) {
			// 如果找不到，查找 motion.div 的子 div
			const motionDiv = document.querySelector('div[style*="calc(100vh"]');
			if (motionDiv) {
				element = motionDiv.querySelector("div");
			}
		}
		return element || window;
	};

	// 设置range的默认值，根据选项数组长度计算
	useEffect(() => {
		if (validLevels.length > 0 && levelRange === null) {
			setLevelRange([0, validLevels.length - 1]);
		}
	}, [validLevels.length, levelRange]);

	useEffect(() => {
		if (validPowers.length > 0 && powerRange === null) {
			setPowerRange([0, validPowers.length - 1]);
		}
	}, [validPowers.length, powerRange]);

	useEffect(() => {
		if (validCosts.length > 0 && costRange === null) {
			setCostRange([0, validCosts.length - 1]);
		}
	}, [validCosts.length, costRange]);

	// 监听搜索结果，当有结果时显示滚动按钮
	useEffect(() => {
		setShowScrollButtons(result.data.length > 0);
	}, [result.data]);

	useEffect(() => {
		setSelectedVariants({});
	}, [result.data, showMergedVariants]);

	// 监听levelRange变化，更新draftForm.level
	useEffect(() => {
		if (!levelRange) return;
		const [min, max] = levelRange;
		// 如果是全范围，则不传递level参数
		if (min === 0 && max === validLevels.length - 1) {
			setDraftForm((prev) => ({
				...prev,
				minLevel: undefined,
				maxLevel: undefined,
			}));
			return;
		}
		const minLevel = levelScale(min);
		const maxLevel = levelScale(max);
		setDraftForm((prev) => ({
			...prev,
			minLevel: minLevel.toString(),
			maxLevel: maxLevel.toString(),
		}));
	}, [levelRange, levelScale, validLevels.length]); // 移除setDraftForm依赖，因为它是稳定的

	// 监听powerRange变化，更新draftForm.power
	useEffect(() => {
		if (!powerRange) return;
		const [min, max] = powerRange;
		// 如果是全范围，则不传递power参数
		if (min === 0 && max === validPowers.length - 1) {
			setDraftForm((prev) => ({
				...prev,
				minPower: undefined,
				maxPower: undefined,
			}));
			return;
		}
		const minPower = powerScale(min);
		const maxPower = powerScale(max);
		setDraftForm((prev) => ({
			...prev,
			minPower: minPower.toString(),
			maxPower: maxPower.toString(),
		}));
	}, [powerRange, powerScale, validPowers.length]); // 移除setDraftForm依赖

	// 监听costRange变化，更新draftForm.cost
	useEffect(() => {
		if (!costRange) return;
		const [min, max] = costRange;
		// 如果是全范围，则不传递cost参数
		if (min === 0 && max === validCosts.length - 1) {
			setDraftForm((prev) => ({
				...prev,
				minCost: undefined,
				maxCost: undefined,
			}));
			return;
		}
		const minCost = costScale(min);
		const maxCost = costScale(max);
		setDraftForm((prev) => ({
			...prev,
			minCost: minCost.toString(),
			maxCost: maxCost.toString(),
		}));
	}, [costRange, costScale, validCosts.length]); // 移除setDraftForm依赖

	const cardGroups = useMemo(() => {
		const groupsInOrder = [];
		const groupMap = new Map();

		result.data.forEach((card, index) => {
			const normalizedCardNo = card.cardno ? card.cardno.trim() : "";
			const baseCardNo = extractBaseCardNo(normalizedCardNo);
			const key =
				baseCardNo ||
				normalizedCardNo ||
				(card.id ? `id-${card.id}` : `index-${index}`);
			if (!groupMap.has(key)) {
				groupMap.set(key, {
					key,
					baseCardNo,
					variants: [],
				});
				groupsInOrder.push(groupMap.get(key));
			}
			groupMap.get(key).variants.push(card);
		});

		groupsInOrder.forEach((group) => {
			group.variants.sort((a, b) => {
				const aCardNo = a.cardno ? a.cardno.trim() : "";
				const bCardNo = b.cardno ? b.cardno.trim() : "";
				const aIsBase = group.baseCardNo ? aCardNo === group.baseCardNo : false;
				const bIsBase = group.baseCardNo ? bCardNo === group.baseCardNo : false;

				if (aIsBase && !bIsBase) return -1;
				if (!aIsBase && bIsBase) return 1;
				return aCardNo.localeCompare(bCardNo);
			});
		});

		return groupsInOrder;
	}, [result.data]); // 移除extractBaseCardNo依赖，因为它是稳定的函数

	const cardsToRender = useMemo(() => {
		if (showMergedVariants) {
			return cardGroups;
		}

		return result.data.map((card, index) => ({
			key:
				(card.cardno && card.cardno.trim()) ||
				(card.id ? `id-${card.id}` : `card-${index}`),
			baseCardNo: extractBaseCardNo(card.cardno),
			variants: [card],
		}));
	}, [cardGroups, result.data, showMergedVariants]); // 移除extractBaseCardNo依赖

	const handleSearch = (draftForm) => {
		setIsLoading(true);
		const params = new URLSearchParams(
			Object.entries(draftForm).filter(
				([, v]) => v !== undefined && v !== "" && v !== null
			)
		).toString();

		// 本地后端测试地址
		// http://localhost:4000/api/cards?${params}

		fetch(`${BACKEND_URL}/api/cards?${params}`)
			.then((res) => res.json())
			.then((res) => {
				setResult({
					data: res.data,
					total: res.total,
					page: res.page,
					pageSize: res.pageSize,
				});
			})
			.catch((err) => {
				console.error("搜索失败:", err);
				setResult({ data: [], total: 0 }); // 清空结果，保持页面正常显示
			})
			.finally(() => {
				setIsLoading(false);
			});
		setForm(draftForm);
		setHasSearched(true);
	};

	const handleReset = () => {
		setForm({ page: 1 });
		setDraftForm({ page: 1 });
		setResult({ data: [], total: 0, page: 1, pageSize: 20 });
		setHasSearched(false);
		setIsLoading(false);
		setLevelRange(null);
		setPowerRange(null);
		setCostRange(null);
	};

	const handlePageChange = (_, newPage) => {
		handleSearch({ ...form, page: newPage });
		setForm((prev) => ({ ...prev, page: newPage }));
	};

	// 处理Autocomplete回车键选择第一个匹配项
	const handleAutocompleteEnter = (event, options, fieldName) => {
		if (event.key === "Enter") {
			event.preventDefault();
			const inputValue = event.target.value;
			if (inputValue && options.length > 0) {
				// 找到第一个匹配的选项
				const firstMatch = options.find((option) =>
					option.toLowerCase().includes(inputValue.toLowerCase())
				);
				if (firstMatch) {
					// 根据字段名处理不同的值格式
					let selectedValue;
					if (["series_number", "series", "product_name"].includes(fieldName)) {
						// 这些字段需要提取括号前的值
						selectedValue = firstMatch.split("（")[0];
					} else {
						selectedValue = firstMatch;
					}
					setDraftForm((prev) => ({ ...prev, [fieldName]: selectedValue }));
				}
			}
		}
	};

	const scrollToTop = () => {
		const container = getScrollContainer();
		if (container === window) {
			window.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			container.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const scrollToBottom = () => {
		const container = getScrollContainer();
		if (container === window) {
			window.scrollTo({
				top: document.documentElement.scrollHeight,
				behavior: "smooth",
			});
		} else {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "smooth",
			});
		}
	};

	// related modal handlers removed

	return (
		<Container
			maxWidth="md"
			sx={{ textAlign: "center" }}>
			<Typography
				variant="h4"
				fontWeight={700}
				color="var(--text)"
				gutterBottom>
				{t("pages.cardList.title")}
			</Typography>
			<Typography
				variant="body1"
				color="text.secondary"
				align="center">
				{t("pages.cardList.subtitle")}
			</Typography>

			{/* 搜索表单 */}
			<Box
				sx={{
					mt: 4,
					mb: 4,
					p: 3,
					backgroundColor: "var(--card-background)",
					borderRadius: 3,
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
					border: "1px solid var(--border)",
				}}>
				<Box
					component="form"
					onSubmit={(e) => {
						e.preventDefault();
						handleSearch({ ...draftForm, page: 1 });
						setForm({ ...draftForm, page: 1 });
					}}>
					{/* 主要搜索字段 */}
					<Typography
						variant="h6"
						sx={{ mb: 2, textAlign: "left" }}>
						{t("pages.cardList.sections.primarySearch")}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								sm: "1fr 1fr",
								md: "1fr 1fr 1fr",
							},
							gap: 2,
							mb: 3,
						}}>
						<Autocomplete
							options={productList.series_number
								.slice()
								.sort()
								.map(
									(s) =>
										`${s}${
											translationMap.series_number?.[s]
												? `（${translationMap.series_number?.[s]}）`
												: ""
										}`
								)}
							size="small"
							value={
								draftForm.series_number
									? `${draftForm.series_number}${
											translationMap.series_number?.[draftForm.series_number]
												? `（${
														translationMap.series_number?.[
															draftForm.series_number
														]
												  }）`
												: ""
									  }`
									: ""
							}
							onChange={(_, newValue) => {
								const key = newValue?.split("（")[0];
								setDraftForm((prev) => ({ ...prev, series_number: key }));
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.seriesNumber")}
									variant="outlined"
									fullWidth
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											const inputValue = e.target.value;
											if (inputValue) {
												const matchingOption = productList.series_number
													.slice()
													.sort()
													.find((option) =>
														`${option}${
															translationMap.series_number?.[option]
																? `（${translationMap.series_number?.[option]}）`
																: ""
														}`
															.toLowerCase()
															.includes(inputValue.toLowerCase())
													);
												if (matchingOption) {
													setDraftForm((prev) => ({
														...prev,
														series_number: matchingOption,
													}));
												}
											}
										}
									}}
								/>
							)}
						/>

						<Autocomplete
							options={productList.series
								.slice()
								.sort()
								.map(
									(s) =>
										`${s}${
											translationMap.series?.[s]
												? `（${translationMap.series?.[s]}）`
												: ""
										}`
								)}
							size="small"
							value={
								draftForm.series
									? `${draftForm.series}${
											translationMap.series?.[draftForm.series]
												? `（${translationMap.series?.[draftForm.series]}）`
												: ""
									  }`
									: ""
							}
							onChange={(_, newValue) => {
								const key = newValue?.split("（")[0];
								setDraftForm((prev) => ({ ...prev, series: key }));
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.series")}
									variant="outlined"
									fullWidth
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											const inputValue = e.target.value;
											if (inputValue) {
												const matchingOption = productList.series
													.slice()
													.sort()
													.find((option) =>
														`${option}${
															translationMap.series?.[option]
																? `（${translationMap.series?.[option]}）`
																: ""
														}`
															.toLowerCase()
															.includes(inputValue.toLowerCase())
													);
												if (matchingOption) {
													setDraftForm((prev) => ({
														...prev,
														series: matchingOption,
													}));
												}
											}
										}
									}}
								/>
							)}
						/>

						<Autocomplete
							options={productList.product_name
								.slice()
								.sort()
								.map(
									(p) =>
										`${p}${
											translationMap.product_name?.[p]
												? `（${translationMap.product_name?.[p]}）`
												: ""
										}`
								)}
							size="small"
							value={
								draftForm.product_name
									? `${draftForm.product_name}${
											translationMap.product_name?.[draftForm.product_name]
												? `（${
														translationMap.product_name?.[
															draftForm.product_name
														]
												  }）`
												: ""
									  }`
									: ""
							}
							onChange={(_, newValue) => {
								const key = newValue?.split("（")[0];
								setDraftForm((prev) => ({ ...prev, product_name: key }));
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.product")}
									variant="outlined"
									fullWidth
									onKeyDown={(e) =>
										handleAutocompleteEnter(
											e,
											productList.series
												.slice()
												.sort()
												.map(
													(s) =>
														`${s}${
															translationMap.series?.[s]
																? `（${translationMap.series?.[s]}）`
																: ""
														}`
												),
											"series"
										)
									}
								/>
							)}
						/>
					</Box>
					{/* 关键词搜索 */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								sm: "1fr",
							},
							gap: 2,
							mb: 2,
						}}>
						<TextField
							name="search"
							label={t("pages.cardList.fields.keyword")}
							variant="outlined"
							fullWidth
							size="small"
							value={draftForm.search || ""}
							onChange={(e) =>
								setDraftForm((prev) => ({ ...prev, search: e.target.value }))
							}
						/>
					</Box>
					{/* Side 单独一排 */}
					<Box
						sx={{
							display: "flex",
							gap: { xs: 0.5, sm: 1 },
							mb: 3,
							width: "100%",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: { xs: "flex-start", sm: "center" },
						}}>
						<Typography
							variant="body2"
							sx={{
								minWidth: { xs: "auto", sm: 60 },
								fontSize: { xs: "0.875rem", sm: "0.875rem" },
								fontWeight: 600,
								mb: { xs: 1, sm: 0 },
							}}>
							{t("pages.cardList.fields.side")}
						</Typography>
						<ToggleButtonGroup
							value={draftForm.side || ""}
							exclusive
							onChange={(_, value) => {
								setDraftForm((prev) => ({ ...prev, side: value }));
							}}
							size="small"
							sx={{
								width: { xs: "100%", sm: "auto" },
								flexGrow: { xs: 0, sm: 1 },
								"& .MuiToggleButton-root": {
									flex: { xs: 1, sm: 1 },
									minWidth: { xs: "auto", sm: "auto" },
									px: { xs: 1, sm: 2 },
									fontSize: { xs: "0.75rem", sm: "0.875rem" },
								},
							}}>
							{productList.side.map((side) => (
								<ToggleButton
									key={side}
									value={side}
									selected={draftForm.side === side}
									sx={{
										fontWeight: 600,
										"&.Mui-selected, &.Mui-selected:hover": {
											backgroundColor:
												themeConfig.light.colors.primary + " !important",
											color: "#fff",
										},
									}}>
									{t("pages.cardList.sides." + side)}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</Box>
					{/* 卡片属性 */}
					<Typography
						variant="h6"
						sx={{ mb: 2, textAlign: "left" }}>
						{t("pages.cardList.sections.cardAttributes")}
					</Typography>
					{/* Color 单独一排 */}
					<Box
						sx={{
							display: "flex",
							gap: { xs: 0.5, sm: 1 },
							mb: 3,
							width: "100%",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: { xs: "flex-start", sm: "center" },
						}}>
						<Typography
							variant="body2"
							sx={{
								minWidth: { xs: "auto", sm: 60 },
								fontSize: { xs: "0.875rem", sm: "0.875rem" },
								fontWeight: 600,
								mb: { xs: 1, sm: 0 },
							}}>
							{t("pages.cardList.fields.color")}
						</Typography>
						<ToggleButtonGroup
							value={draftForm.color || ""}
							exclusive
							onChange={(_, value) => {
								setDraftForm((prev) => ({ ...prev, color: value }));
							}}
							size="small"
							sx={{
								width: { xs: "100%", sm: "auto" },
								flexGrow: { xs: 0, sm: 1 },
								"& .MuiToggleButton-root": {
									flex: { xs: 1, sm: 1 },
									minWidth: { xs: "auto", sm: "auto" },
									px: { xs: 1, sm: 2 },
									fontSize: { xs: "0.75rem", sm: "0.875rem" },
								},
							}}>
							{productList.color.map((color) => (
								<ToggleButton
									key={color}
									value={color}
									selected={draftForm.color === color}
									sx={{
										fontWeight: 600,
										"&.Mui-selected, &.Mui-selected:hover": {
											backgroundColor:
												themeConfig.light.colors.primary + " !important",
											color: "#fff",
										},
									}}>
									{t("pages.cardList.colors." + color)}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
					</Box>
					{/* Card Type 单独一排 */}
					<Box
						sx={{
							display: "flex",
							gap: { xs: 0.5, sm: 1 },
							mb: 3,
							width: "100%",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: { xs: "flex-start", sm: "center" },
						}}>
						<Typography
							variant="body2"
							sx={{
								minWidth: { xs: "auto", sm: 60 },
								fontSize: { xs: "0.875rem", sm: "0.875rem" },
								fontWeight: 600,
								mb: { xs: 1, sm: 0 },
							}}>
							{t("pages.cardList.fields.card_type")}
						</Typography>
						<ToggleButtonGroup
							value={draftForm.card_type || ""}
							exclusive
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, card_type: newValue }))
							}
							size="small"
							sx={{
								width: { xs: "100%", sm: "auto" },
								flexGrow: { xs: 0, sm: 1 },
								"& .MuiToggleButton-root": {
									flex: { xs: 1, sm: 1 },
									minWidth: { xs: "auto", sm: "auto" },
									px: { xs: 1, sm: 2 },
									fontSize: { xs: "0.75rem", sm: "0.875rem" },
								},
							}}>
							{productList.card_type
								.slice()
								.sort()
								.map((cardType) => (
									<ToggleButton
										key={cardType}
										value={cardType}
										selected={draftForm.card_type === cardType}
										sx={{
											fontWeight: 600,
											"&.Mui-selected, &.Mui-selected:hover": {
												backgroundColor:
													themeConfig.light.colors.primary + " !important",
												color: "#fff",
											},
										}}>
										{t("pages.cardList.cardTypes." + cardType)}
									</ToggleButton>
								))}
						</ToggleButtonGroup>
					</Box>
					{/* Soul 单独一排 */}
					<Box
						sx={{
							display: "flex",
							gap: { xs: 0.5, sm: 1 },
							mb: 3,
							width: "100%",
							flexDirection: { xs: "column", sm: "row" },
							alignItems: { xs: "flex-start", sm: "center" },
						}}>
						<Typography
							variant="body2"
							sx={{
								minWidth: { xs: "auto", sm: 60 },
								fontSize: { xs: "0.875rem", sm: "0.875rem" },
								fontWeight: 600,
								mb: { xs: 1, sm: 0 },
							}}>
							{t("pages.cardList.fields.soul")}
						</Typography>
						<ToggleButtonGroup
							value={draftForm.soul ? "soul" : ""}
							exclusive
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({
									...prev,
									soul: newValue === "soul" ? "soul" : "",
								}))
							}
							size="small"
							sx={{
								width: { xs: "100%", sm: "auto" },
								flexGrow: { xs: 0, sm: 1 },
								"& .MuiToggleButton-root": {
									flex: { xs: 1, sm: 1 },
									minWidth: { xs: "auto", sm: "auto" },
									px: { xs: 1, sm: 2 },
									fontSize: { xs: "0.75rem", sm: "0.875rem" },
								},
							}}>
							<ToggleButton
								value="soul"
								selected={draftForm.soul === "soul"}
								sx={{
									fontWeight: 600,
									"&.Mui-selected, &.Mui-selected:hover": {
										backgroundColor:
											themeConfig.light.colors.primary + " !important",
										color: "#fff",
									},
								}}>
								{t("pages.cardList.fields.soul")}
							</ToggleButton>
						</ToggleButtonGroup>
					</Box>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr 1fr",
								sm: "1fr 1fr",
								md: "1fr 1fr",
							},
							gap: 2,
							mb: 3,
						}}>
						<Autocomplete
							options={productList.rarity.slice().sort()}
							size="small"
							value={draftForm.rarity || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, rarity: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.rarity")}
									variant="outlined"
									fullWidth
									onKeyDown={(e) =>
										handleAutocompleteEnter(
											e,
											productList.trigger.slice().sort(),
											"trigger"
										)
									}
								/>
							)}
						/>
						<Autocomplete
							options={productList.trigger
								.slice()
								.sort()
								.map(
									(t) =>
										`${t}${
											translationMap.trigger?.[t]
												? `（${translationMap.trigger?.[t]}）`
												: ""
										}`
								)}
							size="small"
							value={
								draftForm.trigger
									? `${draftForm.trigger}${
											translationMap.trigger?.[draftForm.trigger]
												? `（${translationMap.trigger?.[draftForm.trigger]}）`
												: ""
									  }`
									: ""
							}
							onChange={(_, newValue) => {
								const key = newValue?.split("（")[0];
								setDraftForm((prev) => ({ ...prev, trigger: key }));
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.trigger")}
									variant="outlined"
									fullWidth
									onKeyDown={(e) =>
										handleAutocompleteEnter(
											e,
											productList.trigger
												.slice()
												.sort()
												.map(
													(t) =>
														`${t}${
															translationMap.trigger?.[t]
																? `（${translationMap.trigger?.[t]}）`
																: ""
														}`
												),
											"trigger"
										)
									}
								/>
							)}
						/>
					</Box>
					{/* 数值属性 */}
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							mb: 2,
						}}>
						<Typography
							variant="h6"
							sx={{ textAlign: "left" }}>
							{t("pages.cardList.sections.numericAttributes")}
						</Typography>
						<DangerButton
							size="small"
							onClick={resetNumericFilters}
							sx={{ ml: 2, px: 2, py: 0.5 }}>
							{t("pages.cardList.buttons.resetNumeric")}
						</DangerButton>
					</Box>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 1,
							mb: 3,
						}}>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 2,
							}}>
							<Typography
								variant="body2"
								sx={{
									fontWeight: 600,
									color: "var(--text)",
									fontSize: "0.875rem",
								}}>
								{t("pages.cardList.fields.level")}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: "var(--text)",
									fontSize: "0.875rem",
									fontWeight: 600,
								}}>
								{validLevels.length > 0
									? `${
											validLevels[
												Math.min(levelRange?.[0] ?? 0, validLevels.length - 1)
											] || "0"
									  } - ${
											validLevels[
												Math.min(
													levelRange?.[1] ?? validLevels.length - 1,
													validLevels.length - 1
												)
											] || "0"
									  }`
									: "0 - 0"}
							</Typography>
						</Box>
						<Slider
							value={levelRange || [0, validLevels.length - 1]}
							onChange={(_, newValue) => {
								// 确保 min 不能超过 max，如果超过则交换位置
								const [min, max] = newValue;
								if (min > max) {
									setLevelRange([max, min]);
								} else {
									setLevelRange(newValue);
								}
							}}
							min={0}
							max={validLevels.length - 1}
							step={1}
							sx={{
								color: "var(--primary)",
								"& .MuiSlider-thumb:first-of-type": {
									backgroundColor: "#4caf50", // 绿色 - 最小值滑块
									border: "2px solid #fff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
									"&:hover, &.Mui-focusVisible": {
										boxShadow: "0 0 0 8px rgba(76, 175, 80, 0.16)",
									},
								},
								"& .MuiSlider-thumb:last-child": {
									backgroundColor: "var(--reset)", // 红色 - 最大值滑块
									border: "2px solid #fff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
									"&:hover, &.Mui-focusVisible": {
										boxShadow: "0 0 0 8px rgba(118, 15, 16, 0.16)",
									},
								},
								"& .MuiSlider-track": {
									backgroundColor: "var(--primary)",
									height: 3,
								},
								"& .MuiSlider-rail": {
									backgroundColor: "var(--border)",
									height: 3,
								},
							}}
						/>
					</Box>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 1,
							mb: 3,
						}}>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 2,
							}}>
							<Typography
								variant="body2"
								sx={{
									fontWeight: 600,
									color: "var(--text)",
									fontSize: "0.875rem",
								}}>
								{t("pages.cardList.fields.power")}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: "var(--text)",
									fontSize: "0.875rem",
									fontWeight: 600,
								}}>
								{validPowers.length > 0
									? `${
											validPowers[
												Math.min(powerRange?.[0] ?? 0, validPowers.length - 1)
											] || "0"
									  } - ${
											validPowers[
												Math.min(
													powerRange?.[1] ?? validPowers.length - 1,
													validPowers.length - 1
												)
											] || "0"
									  }`
									: "0 - 0"}
							</Typography>
						</Box>
						<Slider
							value={powerRange || [0, validPowers.length - 1]}
							onChange={(_, newValue) => {
								// 确保 min 不能超过 max，如果超过则交换位置
								const [min, max] = newValue;
								if (min > max) {
									setPowerRange([max, min]);
								} else {
									setPowerRange(newValue);
								}
							}}
							min={0}
							max={validPowers.length - 1}
							step={1}
							sx={{
								color: "var(--primary)",
								"& .MuiSlider-thumb:first-of-type": {
									backgroundColor: "#4caf50", // 绿色 - 最小值滑块
									border: "2px solid #fff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
									"&:hover, &.Mui-focusVisible": {
										boxShadow: "0 0 0 8px rgba(76, 175, 80, 0.16)",
									},
								},
								"& .MuiSlider-thumb:last-child": {
									backgroundColor: "var(--reset)", // 红色 - 最大值滑块
									border: "2px solid #fff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
									"&:hover, &.Mui-focusVisible": {
										boxShadow: "0 0 0 8px rgba(118, 15, 16, 0.16)",
									},
								},
								"& .MuiSlider-track": {
									backgroundColor: "var(--primary)",
									height: 3,
								},
								"& .MuiSlider-rail": {
									backgroundColor: "var(--border)",
									height: 3,
								},
							}}
						/>
					</Box>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 1,
							mb: 3,
						}}>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 2,
							}}>
							<Typography
								variant="body2"
								sx={{
									fontWeight: 600,
									color: "var(--text)",
									fontSize: "0.875rem",
								}}>
								{t("pages.cardList.fields.cost")}
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: "var(--text)",
									fontSize: "0.875rem",
									fontWeight: 600,
								}}>
								{validCosts.length > 0
									? `${
											validCosts[
												Math.min(costRange?.[0] ?? 0, validCosts.length - 1)
											] || "0"
									  } - ${
											validCosts[
												Math.min(
													costRange?.[1] ?? validCosts.length - 1,
													validCosts.length - 1
												)
											] || "0"
									  }`
									: "0 - 0"}
							</Typography>
						</Box>
						<Slider
							value={costRange || [0, validCosts.length - 1]}
							onChange={(_, newValue) => {
								// 确保 min 不能超过 max，如果超过则交换位置
								const [min, max] = newValue;
								if (min > max) {
									setCostRange([max, min]);
								} else {
									setCostRange(newValue);
								}
							}}
							min={0}
							max={validCosts.length - 1}
							step={1}
							sx={{
								color: "var(--primary)",
								"& .MuiSlider-thumb:first-of-type": {
									backgroundColor: "#4caf50", // 绿色 - 最小值滑块
									border: "2px solid #fff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
									"&:hover, &.Mui-focusVisible": {
										boxShadow: "0 0 0 8px rgba(76, 175, 80, 0.16)",
									},
								},
								"& .MuiSlider-thumb:last-child": {
									backgroundColor: "var(--reset)", // 红色 - 最大值滑块
									border: "2px solid #fff",
									boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
									"&:hover, &.Mui-focusVisible": {
										boxShadow: "0 0 0 8px rgba(118, 15, 16, 0.16)",
									},
								},
								"& .MuiSlider-track": {
									backgroundColor: "var(--primary)",
									height: 3,
								},
								"& .MuiSlider-rail": {
									backgroundColor: "var(--border)",
									height: 3,
								},
							}}
						/>
					</Box>{" "}
					{/* 操作按钮 */}
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							gap: 2,
							pt: 2,
							borderTop: "1px solid rgba(0, 0, 0, 0.1)",
						}}>
						<PrimaryButton
							type="submit"
							variant="contained"
							size="large"
							sx={{
								px: 4,
								py: 1.5,
							}}>
							{t("pages.cardList.searchButton")}
						</PrimaryButton>

						<DangerButton
							type="button"
							variant="contained"
							size="large"
							onClick={handleReset}
							sx={{
								px: 4,
								py: 1.5,
							}}>
							{t("pages.cardList.resetButton")}
						</DangerButton>
					</Box>
				</Box>
			</Box>

			{result.data.length > 0 && (
				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						px: { xs: 2, md: 4 },
						mt: 2,
					}}>
					<FormControlLabel
						control={
							<Switch
								color="success"
								checked={showMergedVariants}
								onChange={(_, checked) => setShowMergedVariants(checked)}
								inputProps={{ id: mergeVariantsSwitchId }}
								sx={{
									m: 0,
									"& .MuiSwitch-switchBase": {
										p: 0.5,
										"&.Mui-checked": {
											transform: "translateX(20px)",
											color: "#fff",
											"& + .MuiSwitch-track": {
												background: "var(--success)",
												opacity: 1,
											},
										},
									},
									"& .MuiSwitch-thumb": {
										boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
										width: 18,
										height: 18,
									},
									"& .MuiSwitch-track": {
										borderRadius: 999,
										backgroundColor: "var(--border)",
										opacity: 1,
									},
								}}
							/>
						}
						slotProps={{ label: { htmlFor: mergeVariantsSwitchId } }}
						label={
							showMergedVariants
								? t("pages.cardList.toggle.splitVariants")
								: t("pages.cardList.toggle.mergeVariants")
						}
						sx={{
							userSelect: "none",
							px: 2.5,
							py: 1,
							borderRadius: 999,
							backgroundColor: "var(--card-background)",
							boxShadow: "0 8px 18px rgba(0, 0, 0, 0.1)",
							color: "var(--text)",
							gap: 1.5,
							"& .MuiTypography-root": {
								fontWeight: 600,
								fontSize: "0.95rem",
							},
						}}
					/>
				</Box>
			)}

			<Box m={{ xs: 2, md: 4 }}>
				{isLoading ? (
					<Box
						sx={{
							mt: { xs: 6, md: 8 },
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							minHeight: 200,
						}}>
						<CircularProgress
							size={60}
							sx={{
								color: "var(--primary)",
							}}
						/>
					</Box>
				) : hasSearched && cardsToRender.length === 0 ? (
					<Paper
						elevation={0}
						sx={{
							mt: { xs: 6, md: 8 },
							mx: "auto",
							maxWidth: 440,
							px: { xs: 3, md: 5 },
							py: { xs: 4, md: 5 },
							textAlign: "center",
							borderRadius: 4,
							background:
								"linear-gradient(145deg, rgba(166, 206, 182, 0.24), rgba(255, 255, 255, 0.88))",
							backdropFilter: "blur(12px)",
							border: "1px solid rgba(166, 206, 182, 0.35)",
							boxShadow: "0 18px 45px rgba(52, 85, 66, 0.14)",
						}}>
						<Stack
							spacing={2.5}
							alignItems="center">
							<SearchOffIcon
								sx={{
									fontSize: 52,
									color: "var(--spring-rain-600)",
								}}
							/>
							<Typography
								variant="h6"
								fontWeight={700}
								color="text.primary">
								{t("pages.cardList.noResultsTitle")}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ maxWidth: 360, lineHeight: 1.6 }}>
								{t("pages.cardList.noResultsDescription")}
							</Typography>
							<Button
								variant="contained"
								onClick={handleReset}
								sx={{
									mt: 1,
									textTransform: "none",
									borderRadius: 999,
									px: 3,
									py: 1,
									backgroundColor: "var(--reset)",
									color: "#fff",
									boxShadow: "0 12px 24px rgba(118, 15, 16, 0.28)",
									"&:hover": {
										backgroundColor: "var(--reset-hover)",
									},
								}}>
								{t("pages.cardList.noResultsAction")}
							</Button>
						</Stack>
					</Paper>
				) : (
					cardsToRender.map((group, index) => {
						const groupKey = group.key || `group-${index}`;
						const variants = group.variants || [];
						const selectedIndex = showMergedVariants
							? selectedVariants[groupKey] ?? 0
							: 0;
						const activeCard = variants[selectedIndex] || variants[0];
						if (!activeCard) {
							return null;
						}
						const card = activeCard;
						const relatedCards = Array.isArray(card.related_cards)
							? card.related_cards
									.map((item) => {
										if (!item) {
											return null;
										}
										if (typeof item === "string") {
											return { cardno: item };
										}
										if (typeof item === "object") {
											return {
												cardno: item.cardno || "",
												name: item.name,
												zh_name: item.zh_name,
												image_url: item.image_url,
												series: item.series,
												series_number: item.series_number,
												product_name: item.product_name,
												rarity: item.rarity,
												card_type: item.card_type,
												color: item.color,
												level: item.level,
												cost: item.cost,
												power: item.power,
												soul: item.soul,
												trigger: item.trigger,
												effect: item.effect,
												zh_effect: item.zh_effect,
												flavor: item.flavor,
												zh_flavor: item.zh_flavor,
												trait: item.trait || item.feature,
												zh_trait: item.zh_trait || item.zh_feature,
											};
										}
										return { cardno: String(item) };
									})
									.filter(
										(item) => item && (item.cardno || item.name || item.zh_name)
									)
							: [];

						const stats = [
							card.level && { key: "level", label: `Lv.${card.level}` },
							card.cost && { key: "cost", label: `Cost ${card.cost}` },
							card.power && {
								key: "power",
								label: `${card.power} ${t("pages.cardList.fields.power")}`,
							},
							card.soul && {
								key: "soul",
								label: `${card.soul} ${t("pages.cardList.fields.soul")}`,
							},
							card.trigger && {
								key: "trigger",
								label: `${t("pages.cardList.fields.trigger")} ${card.trigger}`,
							},
						].filter(Boolean);

						const meta = [
							card.color && { key: "color", label: card.color },
							card.side && { key: "side", label: `Side ${card.side}` },
							card.rarity && { key: "rarity", label: card.rarity },
							card.card_type && { key: "type", label: card.card_type },
						].filter(Boolean);

						return (
							<Card
								key={
									groupKey ||
									card.cardno ||
									card.id ||
									`${card.image_url}-${index}`
								}
								sx={{
									position: "relative",
									display: "flex",
									flexDirection: { xs: "column", sm: "row" },
									overflow: "hidden",
									mb: 3,
									borderRadius: 3,

									boxShadow: "0 18px 45px rgba(17, 24, 39, 0.15)",
									border: "1px solid var(--border)",
									transition: "transform 0.4s ease, box-shadow 0.4s ease",
									backdropFilter: "blur(4px)",
									"&::before": {
										content: '""',
										position: "absolute",
										top: 0,
										left: 0,
										width: "40%",
										height: "100%",
									},
									"&:hover": {
										transform: "translateY(-6px)",
										boxShadow: "0 24px 55px rgba(17, 24, 39, 0.22)",
									},
								}}>
								<Box
									sx={{
										flexBasis: { xs: "100%", sm: "280px" },
										flexShrink: 0,
										position: "relative",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										p: { xs: 3, sm: 4 },

										zIndex: 1,
									}}>
									<LazyImage
										src={card.image_url}
										alt={card.name}
										placeholder="卡片加载中..."
										style={{
											width: "100%",
											maxWidth: 260,
											borderRadius: 2,
											objectFit: "contain",
											boxShadow: "0 14px 30px rgba(17, 24, 39, 0.28)",
										}}
									/>
								</Box>
								<CardContent
									sx={{
										flex: "1 1 auto",
										position: "relative",
										zIndex: 1,
										display: "flex",
										flexDirection: "column",
										gap: 1.5,
										px: { xs: 3, sm: 4 },
										py: { xs: 3, sm: 4 },
									}}>
									{showMergedVariants && variants.length > 1 && (
										<Box
											sx={{
												display: "flex",
												justifyContent: {
													xs: "flex-start",
													sm: "flex-end",
												},
												mb: 1,
											}}>
											<Stack
												direction="row"
												spacing={1.5}
												alignItems="center"
												flexWrap="wrap"
												sx={{ rowGap: 1.2 }}>
												<Typography
													variant="body2"
													sx={{ fontWeight: 600, color: "text.secondary" }}>
													{t("pages.cardList.labels.variant")}
												</Typography>
												<ToggleButtonGroup
													exclusive
													value={selectedIndex}
													onChange={(_, value) => {
														if (value === null) return;
														setSelectedVariants((prev) => ({
															...prev,
															[groupKey]: value,
														}));
													}}
													size="small"
													sx={{
														borderRadius: 999,
														backgroundColor: "var(--card-background)",
														"& .MuiToggleButton-root": {
															border: "none",
															px: 1.5,
															minWidth: 44,
															color: "var(--text)",
															fontWeight: 600,
															textTransform: "none",
															transition: "all 0.2s ease",
															"&.Mui-selected": {
																backgroundColor: "var(--success)",
																color: "#fff",
																boxShadow: "0 6px 12px rgba(46, 125, 50, 0.3)",
															},
															"&:hover": {
																backgroundColor: "rgba(76, 175, 80, 0.18)",
															},
														},
													}}>
													{variants.map((variant, variantIndex) => {
														const label =
															variant.rarity ||
															variant.cardno ||
															t("pages.cardList.labels.variant");
														return (
															<ToggleButton
																key={`${groupKey}-${
																	variant.cardno || variantIndex
																}`}
																value={variantIndex}>
																{label}
															</ToggleButton>
														);
													})}
												</ToggleButtonGroup>
											</Stack>
										</Box>
									)}
									<Box>
										<Typography sx={{ fontWeight: 600 }}>
											{card.name}
										</Typography>
										{showZh && card.zh_name && (
											<Typography
												variant="subtitle1"
												color="text.secondary">
												{card.zh_name}
											</Typography>
										)}
										{card.cardno && (
											<Typography
												variant="body2"
												color="text.secondary"
												sx={{ mt: 0.5, fontWeight: 600 }}>
												{card.cardno}
											</Typography>
										)}
										<Typography
											variant="body2"
											color="text.secondary">
											{card.series_number} · {card.series}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary">
											{card.product_name}
										</Typography>
									</Box>

									<Stack
										direction="row"
										spacing={1}
										flexWrap="wrap"
										sx={{ rowGap: 1 }}>
										{stats.map((chip) => (
											<Chip
												key={chip.key}
												label={chip.label}
												size="small"
												sx={{
													backgroundColor: "var(--card-background)",
													border: "1px solid var(--border)",
													fontWeight: 500,
												}}
											/>
										))}
									</Stack>

									{meta.length > 0 && (
										<Stack
											direction="row"
											spacing={1}
											flexWrap="wrap"
											sx={{ rowGap: 1 }}>
											{meta.map((chip) => (
												<Chip
													key={chip.key}
													label={chip.label}
													size="small"
													sx={{
														backgroundColor: "rgba(244, 67, 54, 0.08)",
														border: "1px solid rgba(244, 67, 54, 0.18)",
														fontWeight: 500,
													}}
												/>
											))}
										</Stack>
									)}

									<Divider sx={{ borderColor: "var(--divider)" }} />

									<Box>
										{card.trait && (
											<Typography
												variant="body2"
												color="text.secondary">
												<strong>
													{t("pages.cardList.labels.trait")}
													{colon}
												</strong>
												{card.trait}
											</Typography>
										)}
										{showZh && card.zh_trait && (
											<Typography
												variant="body2"
												color="text.secondary">
												<strong>
													{t("pages.cardList.labels.traitZh")}
													{colon}
												</strong>
												{card.zh_trait}
											</Typography>
										)}
										{card.flavor && (
											<Typography
												variant="body2"
												color="text.secondary">
												<strong>
													{t("pages.cardList.labels.flavor")}
													{colon}
												</strong>
												{card.flavor}
											</Typography>
										)}
										{showZh && card.zh_flavor && (
											<Typography
												variant="body2"
												color="text.secondary">
												<strong>
													{t("pages.cardList.labels.flavorZh")}
													{colon}
												</strong>
												{card.zh_flavor}
											</Typography>
										)}
									</Box>

									{(showJP && card.effect) || (showZh && card.zh_effect) ? (
										<Box
											sx={{
												backgroundColor: "var(--card-background)",
												borderRadius: 2,
												p: 2,
											}}>
											{showJP && card.effect && (
												<Typography
													variant="body2"
													sx={{ mb: showZh && card.zh_effect ? 1 : 0 }}>
													<strong>
														{t("pages.cardList.labels.effect")}
														{colon}
													</strong>
													{card.effect}
												</Typography>
											)}
											{showZh && card.zh_effect && (
												<Typography variant="body2">
													<strong>
														{t("pages.cardList.labels.effectZh")}
														{colon}
													</strong>
													{card.zh_effect}
												</Typography>
											)}
										</Box>
									) : null}

									{relatedCards.length > 0 && (
										<Box
											sx={{
												mt: 2,
												p: 2,
												backgroundColor: "var(--card-background)",
												borderRadius: 2,
												border: "1px solid var(--border)",
											}}>
											<Typography
												variant="subtitle2"
												sx={{ fontWeight: 600, color: "var(--text)", mb: 1.5 }}>
												{t("pages.cardList.labels.related")}
											</Typography>
											<Stack
												direction="row"
												spacing={1}
												flexWrap="wrap"
												sx={{ rowGap: 1 }}>
												{relatedCards.map((related, relatedIndex) => (
													<Chip
														key={`${card.cardno || card.id}-related-${
															related.cardno || related.name || relatedIndex
														}`}
														label={`${
															related.cardno ||
															related.name ||
															related.zh_name ||
															""
														}${
															related.cardno && related.name
																? ` · ${related.name}`
																: ""
														}`}
														variant="outlined"
														size="small"
														clickable
														onClick={() => openDetailCard(related)}
														sx={{
															borderColor: "var(--border)",
															color: "var(--text)",
															fontWeight: 500,
															maxWidth: "100%",
															height: "auto",
															alignSelf: "flex-start",
															cursor: "pointer",
															"& .MuiChip-label": {
																whiteSpace: "normal",
																lineHeight: 1.3,
																display: "block",
															},
														}}
													/>
												))}
											</Stack>
										</Box>
									)}
								</CardContent>
							</Card>
						);
					})
				)}
			</Box>

			{result.total > result.pageSize && (
				<Box
					mt={4}
					display="flex"
					justifyContent="center"
					mb={8}>
					<Pagination
						count={Math.ceil(result.total / result.pageSize)}
						page={result.page}
						onChange={handlePageChange}
						color="primary"
						size="small"
						sx={{
							"& .MuiPaginationItem-root": {
								color: "var(--text-secondary)",
								borderColor: "var(--primary)",
							},
							"& .Mui-selected": {
								backgroundColor: "var(--primary) !important",
								color: "#fff !important",
								borderColor: "#a6ceb6 !important",
								"&:hover": {
									backgroundColor: "var(--primary-hover) !important",
								},
							},
						}}
					/>
				</Box>
			)}

			{/* related-card modal removed */}

			<Box
				sx={{
					position: "fixed",
					bottom: 60,
					left: 24,
					display: "flex",
					flexDirection: "column",
					gap: 2,
					alignItems: "flex-start",
					zIndex: 1200,
				}}>
				<Tooltip
					title={zhToggleTitle}
					placement="left">
					<Fab
						variant="extended"
						size="small"
						onClick={() => setShowZh((prev) => !prev)}
						sx={{
							backgroundColor: showZh ? "#a6ceb6" : "#cfd8dc",
							color: showZh ? "#fff" : "#4b4b4b",
							fontSize: 14,
							"&:hover": {
								backgroundColor: showZh ? "#95bfa5" : "#b0bec5",
							},
						}}>
						{showZh ? "中" : "中"}
					</Fab>
				</Tooltip>

				<Tooltip
					title={jpToggleTitle}
					placement="left">
					<Fab
						variant="extended"
						size="small"
						onClick={() => setShowJP((prev) => !prev)}
						sx={{
							backgroundColor: showJP ? "#a6ceb6" : "#cfd8dc",
							color: showJP ? "#fff" : "#4b4b4b",
							fontSize: 14,
							"&:hover": {
								backgroundColor: showJP ? "#95bfa5" : "#b0bec5",
							},
						}}>
						{showJP ? "日" : "日"}
					</Fab>
				</Tooltip>

				{showScrollButtons && (
					<>
						<Tooltip
							title={scrollUpLabel}
							placement="right">
							<Fab
								size="small"
								onClick={scrollToTop}
								aria-label={scrollUpLabel}
								sx={{
									backgroundColor: "#a6ceb6",
									color: "#fff",
									fontSize: 14,
									minWidth: 40,
									width: 40,
									height: 40,
									"&:hover": {
										backgroundColor: "#95bfa5",
									},
								}}>
								<KeyboardArrowUpIcon />
							</Fab>
						</Tooltip>

						<Tooltip
							title={scrollDownLabel}
							placement="right">
							<Fab
								size="small"
								onClick={scrollToBottom}
								aria-label={scrollDownLabel}
								sx={{
									backgroundColor: "#a6ceb6",
									color: "#fff",
									fontSize: 14,
									minWidth: 40,
									width: 40,
									height: 40,
									"&:hover": {
										backgroundColor: "#95bfa5",
									},
								}}>
								<KeyboardArrowDownIcon />
							</Fab>
						</Tooltip>
					</>
				)}
			</Box>
			<Box sx={{ height: 48 }} />

			{/* Detail dialog for a single card when clicking a related chip */}
			<Dialog
				open={Boolean(detailCard)}
				onClose={closeDetailCard}
				fullWidth
				maxWidth="sm"
				PaperProps={{ sx: { borderRadius: 3 } }}>
				<DialogTitle sx={{ px: 3, py: 2 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography
								variant="h6"
								sx={{ fontWeight: 700 }}>
								{detailCard
									? detailCard.name || detailCard.zh_name || detailCard.cardno
									: ""}
							</Typography>
							{detailCard?.cardno && (
								<Chip
									size="small"
									label={detailCard.cardno}
									sx={{ mt: 1 }}
								/>
							)}
						</Box>
						<IconButton
							onClick={closeDetailCard}
							aria-label={t("close")}>
							<CloseIcon />
						</IconButton>
					</Box>
				</DialogTitle>
				<DialogContent
					dividers
					sx={{ px: 3, py: 2 }}>
					{detailCard && (
						<Box
							sx={{
								display: "flex",
								gap: 2,
								flexDirection: { xs: "column", sm: "row" },
							}}>
							{detailCard.image_url && (
								<Box
									sx={{
										flex: { xs: "0 0 auto", sm: "0 0 260px" },
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										p: { xs: 0, sm: 0 },
									}}>
									<img
										src={detailCard.image_url}
										alt={detailCard.name || detailCard.cardno}
										style={{
											maxWidth: "100%",
											height: "auto",
											borderRadius: 6,
											boxShadow: "0 14px 30px rgba(17,24,39,0.12)",
										}}
									/>
								</Box>
							)}
							<Box sx={{ flex: 1 }}>
								<Box>
									<Typography sx={{ fontWeight: 600 }}>
										{detailCard.name}
									</Typography>
									{showZh && detailCard.zh_name && (
										<Typography
											variant="subtitle1"
											color="text.secondary">
											{detailCard.zh_name}
										</Typography>
									)}
									{detailCard.cardno && (
										<Typography
											variant="body2"
											color="text.secondary"
											sx={{ mt: 0.5, fontWeight: 600 }}>
											{detailCard.cardno}
										</Typography>
									)}
									<Typography
										variant="body2"
										color="text.secondary">
										{detailCard.series_number} · {detailCard.series}
									</Typography>
									<Typography
										variant="body2"
										color="text.secondary">
										{detailCard.product_name}
									</Typography>
								</Box>

								{/* stats chips */}
								{(() => {
									const stats = [
										detailCard.level && {
											key: "level",
											label: `Lv.${detailCard.level}`,
										},
										detailCard.cost && {
											key: "cost",
											label: `Cost ${detailCard.cost}`,
										},
										detailCard.power && {
											key: "power",
											label: `${detailCard.power} ${t(
												"pages.cardList.fields.power"
											)}`,
										},
										detailCard.soul && {
											key: "soul",
											label: `${detailCard.soul} ${t(
												"pages.cardList.fields.soul"
											)}`,
										},
										detailCard.trigger && {
											key: "trigger",
											label: `${t("pages.cardList.fields.trigger")} ${
												detailCard.trigger
											}`,
										},
									].filter(Boolean);
									return (
										<Stack
											direction="row"
											spacing={1}
											flexWrap="wrap"
											sx={{ rowGap: 1, mt: 1 }}>
											{stats.map((chip) => (
												<Chip
													key={chip.key}
													label={chip.label}
													size="small"
													sx={{
														backgroundColor: "var(--card-background)",
														border: "1px solid var(--border)",
														fontWeight: 500,
													}}
												/>
											))}
										</Stack>
									);
								})()}

								{/* meta chips */}
								{(() => {
									const meta = [
										detailCard.color && {
											key: "color",
											label: detailCard.color,
										},
										detailCard.side && {
											key: "side",
											label: `Side ${detailCard.side}`,
										},
										detailCard.rarity && {
											key: "rarity",
											label: detailCard.rarity,
										},
										detailCard.card_type && {
											key: "type",
											label: detailCard.card_type,
										},
									].filter(Boolean);
									if (meta.length === 0) return null;
									return (
										<Stack
											direction="row"
											spacing={1}
											flexWrap="wrap"
											sx={{ rowGap: 1, mt: 1 }}>
											{meta.map((chip) => (
												<Chip
													key={chip.key}
													label={chip.label}
													size="small"
													sx={{
														backgroundColor: "rgba(244, 67, 54, 0.08)",
														border: "1px solid rgba(244, 67, 54, 0.18)",
														fontWeight: 500,
													}}
												/>
											))}
										</Stack>
									);
								})()}

								<Divider sx={{ borderColor: "var(--divider)", my: 1 }} />

								{detailCard.trait && (
									<Typography
										variant="body2"
										color="text.secondary">
										<strong>
											{t("pages.cardList.labels.trait")}
											{colon}
										</strong>
										{detailCard.trait}
									</Typography>
								)}
								{showZh && detailCard.zh_trait && (
									<Typography
										variant="body2"
										color="text.secondary">
										<strong>
											{t("pages.cardList.labels.traitZh")}
											{colon}
										</strong>
										{detailCard.zh_trait}
									</Typography>
								)}
								{detailCard.flavor && (
									<Typography
										variant="body2"
										color="text.secondary">
										<strong>
											{t("pages.cardList.labels.flavor")}
											{colon}
										</strong>
										{detailCard.flavor}
									</Typography>
								)}
								{showZh && detailCard.zh_flavor && (
									<Typography
										variant="body2"
										color="text.secondary">
										<strong>
											{t("pages.cardList.labels.flavorZh")}
											{colon}
										</strong>
										{detailCard.zh_flavor}
									</Typography>
								)}

								{(showJP && detailCard.effect) ||
								(showZh && detailCard.zh_effect) ? (
									<Box
										sx={{
											backgroundColor: "var(--card-background)",
											borderRadius: 2,
											p: 2,
											mt: 1,
										}}>
										{showJP && detailCard.effect && (
											<Typography
												variant="body2"
												sx={{ mb: showZh && detailCard.zh_effect ? 1 : 0 }}>
												<strong>
													{t("pages.cardList.labels.effect")}
													{colon}
												</strong>
												{detailCard.effect}
											</Typography>
										)}
										{showZh && detailCard.zh_effect && (
											<Typography variant="body2">
												<strong>
													{t("pages.cardList.labels.effectZh")}
													{colon}
												</strong>
												{detailCard.zh_effect}
											</Typography>
										)}
									</Box>
								) : null}
							</Box>
						</Box>
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, py: 2 }}>
					<Button
						onClick={closeDetailCard}
						variant="contained">
						{t("close")}
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
}

export default CardList;
