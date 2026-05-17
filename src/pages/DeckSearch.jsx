import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocale } from "../contexts/LocaleContext";
import {
	Typography,
	Box,
	CircularProgress,
	Card,
	CardContent,
	Stack,
	Button,
	Chip,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Alert,
	TextField,
	Autocomplete,
	Container,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import {
	PrimaryButton,
	SecondaryButton,
	DangerButton,
	GenerateButton,
	SubtleButton,
} from "../components/ButtonVariants";
import { apiRequest } from "../utils/api.js";

const DeckSearch = () => {
	const { t } = useLocale();
	const { token } = useAuth();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [decks, setDecks] = useState([]);
	const [refreshIndex, setRefreshIndex] = useState(0);
	const [cardDetails, setCardDetails] = useState({});
	const fetchedCardNosRef = useRef(new Set());
	const [exportingDeck, setExportingDeck] = useState(null);
	const [snackbar, setSnackbar] = useState({
		open: false,
		message: "",
		severity: "success",
	});
	const [customDialogOpen, setCustomDialogOpen] = useState(false);
	const [customDialogDeck, setCustomDialogDeck] = useState(null);
	const [customDrawnCards, setCustomDrawnCards] = useState([]);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingDeck, setDeletingDeck] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (!token) {
			setDecks([]);
			return;
		}

		let isMounted = true;
		const fetchDecks = async () => {
			setLoading(true);
			setError("");
			try {
				const res = await apiRequest('/api/decks/mine');
				const data = await res.json();
				if (isMounted) {
					setDecks(Array.isArray(data) ? data : []);
				}
			} catch (err) {
				console.error("加载卡组失败:", err);
				if (isMounted) {
					setError(err.message || t("deckSearch.messages.loadFailed"));
					setDecks([]);
				}
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		fetchDecks();
		return () => {
			isMounted = false;
		};
	}, [token, refreshIndex, t]);

	useEffect(() => {
		if (!token) {
			setCardDetails({});
			fetchedCardNosRef.current = new Set();
		}
	}, [token]);

	useEffect(() => {
		if (!token || decks.length === 0) return;

		const uniqueCardNos = new Set();
		decks.forEach((deck) => {
			deck.cards?.forEach((card) => {
				if (card?.cardNo) uniqueCardNos.add(card.cardNo);
			});
		});

		const missingCardNos = Array.from(uniqueCardNos).filter(
			(cardNo) => !fetchedCardNosRef.current.has(cardNo)
		);

		if (missingCardNos.length === 0) return;

		let isCancelled = false;

		const fetchCardDetails = async () => {
			const updates = {};
			for (const cardNo of missingCardNos) {
				fetchedCardNosRef.current.add(cardNo);
				try {
					const res = await apiRequest(
						`/api/cards?search=${encodeURIComponent(cardNo)}&page=1&pageSize=1`
					);
					const json = await res.json();
					const detail = Array.isArray(json.data) ? json.data[0] : undefined;
					if (detail) {
						updates[cardNo] = {
							name: detail.name || detail.zh_name || cardNo,
							imageUrl: detail.image_url,
							series: detail.series,
							level: detail.level,
							color: detail.color,
						};
						continue;
					}
				} catch (err) {
					console.error(`获取卡片 ${cardNo} 详情失败:`, err);
				}
				updates[cardNo] = updates[cardNo] || { name: cardNo };
			}

			if (!isCancelled && Object.keys(updates).length > 0) {
				setCardDetails((prev) => ({ ...prev, ...updates }));
			}
		};

		fetchCardDetails();

		return () => {
			isCancelled = true;
		};
	}, [token, decks]);

	const formatDateTime = (value) => {
		if (!value) return "时间未知";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "时间未知";
		return date.toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDateLabel = (value) => {
		if (!value) return "时间未知";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "时间未知";
		return date.toLocaleDateString("zh-CN", {
			month: "2-digit",
			day: "2-digit",
		});
	};

	const deckSummaries = useMemo(() => {
		return decks.map((deck) => {
			const totalCards = Array.isArray(deck.cards)
				? deck.cards.reduce((sum, card) => sum + (card.count || 0), 0)
				: 0;

			const levelCounter = new Map();
			const colorCounter = new Map();

			return {
				id: deck._id,
				name: deck.name || t("deckSearch.unnamed"),
				totalCards,
				isPublic: deck.isPublic,
				cards: Array.isArray(deck.cards)
					? deck.cards.map((card) => ({
							cardNo: card.cardNo,
							count: card.count,
							imageUrl: card.imageUrl || card.image_url || "",
							info:
								typeof card.info === "object" && card.info !== null
									? card.info
									: undefined,
					  }))
					: [],
				createdAt: deck.createdAt,
				updatedAt: deck.updatedAt,
				levelStats: (() => {
					(Array.isArray(deck.cards) ? deck.cards : []).forEach((card) => {
						const info =
							typeof card.info === "object" &&
							card.info !== null &&
							Object.keys(card.info).length
								? card.info
								: cardDetails[card.cardNo] || {};
						const level = info.level ?? info.Level;
						const count = card.count || 0;
						if (!level || !count) return;
						const key = String(level);
						levelCounter.set(key, (levelCounter.get(key) || 0) + count);
					});
					return Array.from(levelCounter.entries())
						.sort((a, b) => {
							const an = Number(a[0]);
							const bn = Number(b[0]);
							const aIsNum = !Number.isNaN(an);
							const bIsNum = !Number.isNaN(bn);
							if (aIsNum && bIsNum) return an - bn;
							if (aIsNum) return -1;
							if (bIsNum) return 1;
							return a[0].localeCompare(b[0]);
						})
						.map(([label, count]) => ({ label, count }));
				})(),
				colorStats: (() => {
					(Array.isArray(deck.cards) ? deck.cards : []).forEach((card) => {
						const info =
							typeof card.info === "object" &&
							card.info !== null &&
							Object.keys(card.info).length
								? card.info
								: cardDetails[card.cardNo] || {};
						const color = info.color ?? info.Color;
						const count = card.count || 0;
						if (!color || !count) return;
						const key = String(color);
						colorCounter.set(key, (colorCounter.get(key) || 0) + count);
					});
					return Array.from(colorCounter.entries())
						.sort((a, b) => b[1] - a[1])
						.map(([label, count]) => ({ label, count }));
				})(),
			};
		});
	}, [decks, cardDetails, t]);

	const COLOR_BASE_STYLES = {
		yellow: {
			bg: "rgba(246, 211, 101, 0.25)",
			border: "rgba(246, 211, 101, 0.55)",
			text: "#7A5A0A",
		},
		green: {
			bg: "rgba(129, 199, 132, 0.25)",
			border: "rgba(129, 199, 132, 0.55)",
			text: "#1B5E20",
		},
		red: {
			bg: "rgba(239, 154, 154, 0.28)",
			border: "rgba(239, 83, 80, 0.55)",
			text: "#7F1D1D",
		},
		blue: {
			bg: "rgba(144, 202, 249, 0.28)",
			border: "rgba(66, 165, 245, 0.55)",
			text: "#0D47A1",
		},
		purple: {
			bg: "rgba(206, 147, 216, 0.28)",
			border: "rgba(171, 71, 188, 0.55)",
			text: "#4A148C",
		},
		black: {
			bg: "rgba(158, 158, 158, 0.25)",
			border: "rgba(97, 97, 97, 0.55)",
			text: "#212121",
		},
		white: {
			bg: "rgba(238, 238, 238, 0.8)",
			border: "rgba(224, 224, 224, 0.9)",
			text: "#616161",
		},
		colorless: {
			bg: "rgba(224, 224, 224, 0.3)",
			border: "rgba(189, 189, 189, 0.6)",
			text: "#4E342E",
		},
	};

	const COLOR_ALIAS_TO_BASE = new Map([
		["黄", "yellow"],
		["黃", "yellow"],
		["y", "yellow"],
		["黄色", "yellow"],
		["green", "green"],
		["g", "green"],
		["绿", "green"],
		["綠", "green"],
		["緑", "green"],
		["绿色", "green"],
		["グリーン", "green"],
		["red", "red"],
		["r", "red"],
		["红", "red"],
		["紅", "red"],
		["blue", "blue"],
		["b", "blue"],
		["蓝", "blue"],
		["藍", "blue"],
		["purple", "purple"],
		["紫", "purple"],
		["紫色", "purple"],
		["black", "black"],
		["黑", "black"],
		["黑色", "black"],
		["white", "white"],
		["白", "white"],
		["白色", "white"],
		["colorless", "colorless"],
		["c", "colorless"],
		["无色", "colorless"],
		["無色", "colorless"],
	]);

	const DEFAULT_COLOR_STYLE = {
		bg: "rgba(118, 15, 16, 0.1)",
		border: "rgba(118, 15, 16, 0.2)",
		text: "#5C0F10",
	};

	const getColorStyle = (label) => {
		if (!label) return DEFAULT_COLOR_STYLE;
		const normalized = label.trim();
		const lower = normalized.toLowerCase();
		const baseKey = COLOR_BASE_STYLES[lower]
			? lower
			: COLOR_ALIAS_TO_BASE.get(normalized) || COLOR_ALIAS_TO_BASE.get(lower);
		return COLOR_BASE_STYLES[baseKey] || DEFAULT_COLOR_STYLE;
	};

	const BUTTON_STYLES = {
		primary: {
			borderRadius: 30,
			px: 2.5,
			py: 1,
			fontWeight: 600,
			textTransform: "none",
			background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
			color: "#ffffff",
			boxShadow: "0 12px 26px rgba(17, 24, 39, 0.16)",
			"&:hover": {
				background: "linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-dark) 100%)",
				boxShadow: "0 16px 32px rgba(17, 24, 39, 0.2)",
			},
			"&:disabled": {
				background:
					"linear-gradient(135deg, rgba(166, 206, 182, 0.65) 0%, rgba(141, 188, 160, 0.65) 100%)",
				color: "rgba(255,255,255,0.85)",
				boxShadow: "none",
			},
		},
		accent: {
			borderRadius: 30,
			px: 2.5,
			py: 1,
			fontWeight: 600,
			textTransform: "none",
			background: "linear-gradient(135deg, #760f10 0%, #99151a 100%)",
			color: "#ffffff",
			boxShadow: "0 12px 28px rgba(118, 15, 16, 0.35)",
			"&:hover": {
				background: "linear-gradient(135deg, #5c0f10 0%, #7a1014 100%)",
				boxShadow: "0 16px 34px rgba(118, 15, 16, 0.4)",
			},
			"&:disabled": {
				background:
					"linear-gradient(135deg, rgba(118, 15, 16, 0.55) 0%, rgba(153, 21, 26, 0.55) 100%)",
				color: "rgba(255,255,255,0.85)",
				boxShadow: "none",
			},
		},
		secondary: {
			borderRadius: 30,
			px: 2.3,
			py: 1,
			fontWeight: 600,
			textTransform: "none",
			borderColor: "rgba(118, 15, 16, 0.45)",
			color: "#5C0F10",
			backgroundColor: "rgba(118, 15, 16, 0.06)",
			boxShadow: "0 8px 20px rgba(17, 24, 39, 0.08)",
			"&:hover": {
				backgroundColor: "rgba(118, 15, 16, 0.12)",
				borderColor: "rgba(118, 15, 16, 0.6)",
			},
			"&:disabled": {
				backgroundColor: "rgba(118, 15, 16, 0.05)",
				borderColor: "rgba(118, 15, 16, 0.2)",
				color: "rgba(92, 15, 16, 0.45)",
				boxShadow: "none",
			},
		},
		ghost: {
			borderRadius: 24,
			px: 2,
			py: 0.75,
			fontWeight: 500,
			textTransform: "none",
			color: "#5C0F10",
			"&:hover": {
				backgroundColor: "rgba(118, 15, 16, 0.08)",
			},
		},
	};

	const buildCardPool = () => {
		if (!customDialogDeck?.cards?.length) return [];

		const pool = [];
		customDialogDeck.cards.forEach((card) => {
			const count = card.count || 0;
			if (!count) return;
			const info =
				typeof card.info === "object" &&
				card.info !== null &&
				Object.keys(card.info).length
					? card.info
					: cardDetails[card.cardNo] || {};
			const name = info.name || info.zh_name || card.cardNo;
			const imageUrl = card.imageUrl || info.image_url;
			for (let i = 0; i < count; i += 1) {
				pool.push({ cardNo: card.cardNo, name, imageUrl });
			}
		});
		return pool;
	};

	const drawRandomCards = (amount = 5) => {
		const pool = buildCardPool();
		if (pool.length === 0) {
			setCustomDrawnCards([]);
			return;
		}

		const poolCopy = [...pool];
		const selected = [...customDrawnCards];
		const drawCount = Math.min(amount, poolCopy.length);
		for (let i = 0; i < drawCount; i += 1) {
			const index = Math.floor(Math.random() * poolCopy.length);
			selected.push(poolCopy.splice(index, 1)[0]);
		}

		setCustomDrawnCards(selected.slice(-20));
	};
	const buildCardEffectText = (deck) => {
		if (!deck?.cards?.length) return "暂无卡片数据";
		return deck.cards
			.map((card) => {
				const info =
					card.info && Object.keys(card.info).length
						? card.info
						: cardDetails[card.cardNo] || {};
				const jpEffect = info.effect || "无";
				const zhEffect = info.zh_effect || "无";
				return `${card.cardNo}\n日文效果：${jpEffect}\n中文效果：${zhEffect}`;
			})
			.join("\n\n");
	};

	const handleCopyEffects = async (deck) => {
		const text = buildCardEffectText(deck);
		try {
			await navigator.clipboard.writeText(text);
			setSnackbar({
				open: true,
				message: "已复制到剪贴板",
				severity: "success",
			});
		} catch (err) {
			console.error("复制失败", err);
			setSnackbar({
				open: true,
				message: "复制失败，请手动复制",
				severity: "error",
			});
		}
	};

	const handleSnackbarClose = (_, reason) => {
		if (reason === "clickaway") return;
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	// 打开编辑页面
	const handleEditDeck = (deck) => {
		const deckId = deck._id || deck.id;
		if (!deckId) {
			setSnackbar({
				open: true,
				message: t("deckSearch.messages.dataError"),
				severity: "error",
			});
			return;
		}

		navigate("/deck-edit", {
			state: {
				deckId: deckId,
			},
		});
	};

	// 打开删除确认对话框
	const handleDeleteDeck = (deck) => {
		setDeletingDeck(deck);
		setDeleteDialogOpen(true);
	};

	// 执行删除卡组
	const handleConfirmDelete = async () => {
		if (!deletingDeck || isDeleting) return;

		setIsDeleting(true);
		try {
			const response = await apiRequest(`/api/decks/${deletingDeck.id}`, {
				method: "DELETE",
			});

			await response.json();

			setSnackbar({
				open: true,
				message: t("deckSearch.messages.deleteSuccess"),
				severity: "success",
			});

			// 刷新卡组列表
			setRefreshIndex((prev) => prev + 1);
		} catch (error) {
			console.error("删除卡组失败:", error);
			setSnackbar({
				open: true,
				message: error.message || t("deckSearch.messages.deleteFailed"),
				severity: "error",
			});
		} finally {
			setIsDeleting(false);
			setDeleteDialogOpen(false);
			setDeletingDeck(null);
		}
	};

	// 取消删除
	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setDeletingDeck(null);
	};

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Box textAlign="center" mb={4}>
				<Typography variant="h4" fontWeight={700} color="var(--text)" gutterBottom>
					{t("deckSearch.title")}
				</Typography>
			</Box>

			<Box sx={{ mt: 3 }}>
				<Box display="flex" justifyContent="flex-end" mb={1}>
					<PrimaryButton
						variant="contained"
						size="small"
						disabled={!token || loading}
						onClick={() => setRefreshIndex((idx) => idx + 1)}
						sx={{ ...BUTTON_STYLES.primary }}>
						刷新
					</PrimaryButton>
				</Box>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
						<CircularProgress />
					</Box>
				) : !token ? (
					<Typography
						align="center"
						color="text.secondary"
						sx={{ py: 6 }}>
						登录后即可查看
					</Typography>
				) : error ? (
					<Typography
						color="error"
						align="center"
						sx={{ py: 4 }}>
						{error}
					</Typography>
				) : deckSummaries.length === 0 ? (
					<Typography
						align="center"
						color="text.secondary"
						sx={{ py: 6 }}>
						{t("deckSearch.noDecks")}
					</Typography>
				) : (
					<Stack spacing={3}>
						{deckSummaries.map((deck) => {
							return (
								<Card
									key={deck.id}
									sx={{
										position: "relative",
										overflow: "hidden",
										borderRadius: 3,
										background:
											"linear-gradient(135deg, rgba(255,255,255,0.96) 5%, rgba(214,236,223,0.9) 50%, rgba(255,255,255,0.92) 100%)",
										border: "1px solid rgba(166, 206, 182, 0.35)",
										boxShadow: "0 18px 40px rgba(17, 24, 39, 0.18)",
										transition: "transform 0.35s ease, box-shadow 0.35s ease",
										"&::before": {
											content: '""',
											position: "absolute",
											top: -120,
											right: -120,
											width: 240,
											height: 240,
											borderRadius: "50%",
											background:
												"radial-gradient(circle, rgba(118,15,16,0.15), transparent 65%)",
										},
										"&:hover": {
											transform: "translateY(-6px)",
											boxShadow: "0 26px 55px rgba(17, 24, 39, 0.24)",
										},
									}}>
									<CardContent
										sx={{
											position: "relative",
											zIndex: 1,
											p: { xs: 3, md: 4 },
										}}>
										<Stack spacing={3}>
											<Stack
												direction={{ xs: "column", sm: "row" }}
												justifyContent="space-between"
												alignItems={{ xs: "flex-start", sm: "center" }}
												spacing={2}>
												<Box sx={{ flex: "1 1 auto" }}>
													<Typography
														variant="h6"
														sx={{ fontWeight: 600 }}>
														{deck.name}
													</Typography>
													<Stack
														direction="row"
														spacing={1}
														flexWrap="wrap"
														sx={{ mt: 1, rowGap: 1 }}>
														<Chip
															label={
																deck.isPublic
																	? t("deckSearch.publicDeck")
																	: t("deckSearch.privateDeck")
															}
															size="small"
															sx={{
																backgroundColor: deck.isPublic
																	? "rgba(118, 15, 16, 0.14)"
																	: "rgba(33, 150, 243, 0.12)",
																color: deck.isPublic ? "#760f10" : "#0d47a1",
																fontWeight: 600,
															}}
														/>
														<Chip
															label={`共 ${deck.totalCards} 张`}
															size="small"
															sx={{
																backgroundColor: "rgba(166, 206, 182, 0.22)",
																border: "1px solid rgba(166, 206, 182, 0.4)",
																color: "#24513f",
															}}
														/>
														{deck.updatedAt && (
															<Tooltip
																title={`最近更新于 ${formatDateTime(
																	deck.updatedAt
																)}`}>
																<Chip
																	label={`更新 ${formatDateLabel(
																		deck.updatedAt
																	)}`}
																	size="small"
																	sx={{
																		backgroundColor: "rgba(33, 33, 33, 0.08)",
																		color: "rgba(0,0,0,0.64)",
																		fontWeight: 500,
																	}}
																/>
															</Tooltip>
														)}
													</Stack>
												</Box>
											</Stack>

											{(deck.levelStats?.length || deck.colorStats?.length) && (
												<Stack
													spacing={1.5}
													sx={{
														mt: 1,
														borderRadius: 2,
														backgroundColor: "rgba(255,255,255,0.6)",
														border: "1px solid rgba(166, 206, 182, 0.3)",
														px: { xs: 2, md: 2.5 },
														py: { xs: 1.5, md: 2 },
														backdropFilter: "blur(6px)",
													}}>
													{deck.levelStats?.length > 0 && (
														<Stack spacing={1}>
															<Typography
																variant="subtitle2"
																sx={{ fontWeight: 600 }}>
																等级分布
															</Typography>
															<Stack
																direction="row"
																spacing={1}
																flexWrap="wrap"
																sx={{ rowGap: 1 }}>
																{deck.levelStats.map((stat) => (
																	<Chip
																		key={`${deck.id}-level-${stat.label}`}
																		label={`Lv${stat.label} · ${stat.count}张`}
																		size="small"
																		sx={{
																			backgroundColor:
																				"rgba(118, 15, 16, 0.09)",
																			border:
																				"1px solid rgba(118, 15, 16, 0.18)",
																			fontWeight: 500,
																		}}
																	/>
																))}
															</Stack>
														</Stack>
													)}

													{deck.colorStats?.length > 0 && (
														<Stack spacing={1}>
															<Typography
																variant="subtitle2"
																sx={{ fontWeight: 600 }}>
																颜色分布
															</Typography>
															<Stack
																direction="row"
																spacing={1}
																flexWrap="wrap"
																sx={{ rowGap: 1 }}>
																{deck.colorStats.map((stat) => {
																	const style = getColorStyle(stat.label);
																	return (
																		<Tooltip
																			key={`${deck.id}-color-${stat.label}`}
																			title={stat.label}>
																			<Chip
																				label={`${stat.count}张`}
																				size="small"
																				sx={{
																					backgroundColor: style.bg,
																					border: `1px solid ${style.border}`,
																					color: style.text,
																					fontWeight: 600,
																				}}
																			/>
																		</Tooltip>
																	);
																})}
															</Stack>
														</Stack>
													)}
												</Stack>
											)}

											<Box
												sx={{
													p: { xs: 2.5, md: 3 },
													borderRadius: 2,
													backgroundColor: "rgba(255,255,255,0.7)",
													border: "1px solid rgba(166, 206, 182, 0.35)",
													backdropFilter: "blur(8px)",
													minHeight: 140,
												}}>
												{deck.cards.length === 0 ? (
													<Typography
														variant="body2"
														color="text.secondary"
														align="center">
														暂无卡片明细
													</Typography>
												) : (
													<>
														<Box
															sx={{
																display: "grid",
																gridTemplateColumns: {
																	xs: "repeat(2, minmax(0, 1fr))",
																	sm: "repeat(3, minmax(0, 1fr))",
																	md: "repeat(4, minmax(0, 1fr))",
																	lg: "repeat(5, minmax(0, 1fr))",
																},
																gap: { xs: 1.5, md: 2 },
																justifyItems: "center",
																alignItems: "start",
															}}>
															{deck.cards.map((card, idx) => {
																const detailInfo =
																	typeof card.info === "object" &&
																	card.info !== null &&
																	Object.keys(card.info).length
																		? card.info
																		: cardDetails[card.cardNo] || {};
																const imageUrl =
																	card.imageUrl || detailInfo.image_url;
																const displayName =
																	detailInfo.name ||
																	detailInfo.zh_name ||
																	card.cardNo;

																return (
																	<Box
																		key={`${deck.id}-${card.cardNo}-${idx}`}
																		sx={{
																			width: "100%",
																			maxWidth: { xs: 150, md: 140 },
																			display: "flex",
																			flexDirection: "column",
																			alignItems: "center",
																			textAlign: "center",
																			gap: 0.75,
																		}}>
																		<Box
																			sx={{
																				width: "100%",
																				position: "relative",
																				aspectRatio: "3 / 4.2",
																				borderRadius: 2,
																				overflow: "hidden",
																				boxShadow:
																					"0 8px 20px rgba(17,24,39,0.18)",
																				background: imageUrl
																					? `url(${imageUrl}) center/cover no-repeat`
																					: "linear-gradient(135deg, rgba(224,224,224,0.7), rgba(189,189,189,0.6))",
																				display: "flex",
																				alignItems: "center",
																				justifyContent: "center",
																				color: imageUrl
																					? "inherit"
																					: "rgba(0,0,0,0.5)",
																				fontSize: "0.75rem",
																			}}
																			title={displayName}
																			role="img"
																			aria-label={displayName}>
																			{imageUrl ? null : "无卡图"}
																		</Box>
																		<Typography
																			variant="body2"
																			sx={{ lineHeight: 1.3, mt: 0.75 }}>
																			{displayName}
																		</Typography>
																		<Typography
																			variant="caption"
																			color="text.secondary">
																			数量：{card.count || 0}
																		</Typography>
																	</Box>
																);
															})}
														</Box>
													</>
												)}
											</Box>
										</Stack>
									</CardContent>
									<Box
										sx={{
											display: "flex",
											flexDirection: { xs: "column", sm: "row" },
											justifyContent: { xs: "flex-start", sm: "flex-end" },
											alignItems: { xs: "stretch", sm: "center" },
											gap: { xs: 1.5, sm: 1 },
											px: 3,
											pb: 3,
											pt: { xs: 1.25, sm: 2 },
											borderTop: "1px solid rgba(118, 15, 16, 0.1)",
										}}>
										<PrimaryButton
											variant="outlined"
											size="small"
											onClick={() => handleEditDeck(deck)}
											startIcon={<EditIcon />}
											sx={{
												...BUTTON_STYLES.secondary,
												borderColor: "var(--primary)",
												color: "var(--primary)",
												width: { xs: "100%", sm: "auto" },
												"&:hover": {
													backgroundColor: "var(--primary)",
													color: "white",
												},
											}}>
											编辑
										</PrimaryButton>
										<DangerButton
											variant="outlined"
											size="small"
											onClick={() => handleDeleteDeck(deck)}
											startIcon={<DeleteIcon />}
											sx={{
												...BUTTON_STYLES.secondary,
												borderColor: "#dc3545",
												color: "#dc3545",
												width: { xs: "100%", sm: "auto" },
												"&:hover": {
													backgroundColor: "#dc3545",
													color: "white",
												},
											}}>
											删除
										</DangerButton>
										<SecondaryButton
											variant="outlined"
											size="small"
											onClick={() => {
												setCustomDialogDeck(deck);
												setCustomDrawnCards([]);
												setCustomDialogOpen(true);
											}}
											sx={{
												...BUTTON_STYLES.secondary,
												width: { xs: "100%", sm: "auto" },
											}}>
											模拟起手
										</SecondaryButton>
										<PrimaryButton
											variant="contained"
											size="small"
											onClick={() => setExportingDeck(deck)}
											sx={{
												...BUTTON_STYLES.accent,
												width: { xs: "100%", sm: "auto" },
											}}>
											导出中文效果
										</PrimaryButton>
									</Box>
								</Card>
							);
						})}
					</Stack>
				)}
			</Box>
			<Dialog
				fullWidth
				maxWidth="md"
				open={Boolean(exportingDeck)}
				onClose={() => setExportingDeck(null)}>
				<DialogTitle>中文效果导出</DialogTitle>
				<DialogContent dividers>
					{exportingDeck && (
						<Box>
							<Typography
								variant="subtitle1"
								sx={{ fontWeight: 600, mb: 2 }}>
								{exportingDeck.name}
							</Typography>
							<Box
								sx={{
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									fontFamily: "monospace",
									fontSize: "0.9rem",
								}}>
								{buildCardEffectText(exportingDeck)}
							</Box>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<SecondaryButton
						variant="text"
						sx={{ ...BUTTON_STYLES.ghost }}
						onClick={() => setExportingDeck(null)}>
						关闭
					</SecondaryButton>
					<PrimaryButton
						variant="contained"
						startIcon={<ContentCopyIcon />}
						onClick={() => exportingDeck && handleCopyEffects(exportingDeck)}
						sx={{ ...BUTTON_STYLES.accent }}>
						复制全部
					</PrimaryButton>
				</DialogActions>
			</Dialog>
			<Dialog
				open={customDialogOpen}
				onClose={() => {
					setCustomDialogOpen(false);
					setCustomDialogDeck(null);
					setCustomDrawnCards([]);
				}}
				maxWidth="sm"
				fullWidth>
				<DialogTitle>
					{customDialogDeck
						? `${t("deckSearch.customAction")} · ${
								customDialogDeck.name || t("deckSearch.unnamed")
						  }`
						: "自定义操作"}
				</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={2}>
						<Stack
							direction="row"
							spacing={1}
							sx={{
								position: "sticky",
								top: -20,
								zIndex: 2,
								backgroundColor: "rgba(255,255,255,0.92)",
								backdropFilter: "blur(6px)",
								borderRadius: 1,
								px: 1.5,
								py: 1,
								boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
							}}>
							<GenerateButton
								variant="contained"
								size="small"
								onClick={() => drawRandomCards(5)}
								disabled={!customDialogDeck?.cards?.length}
								sx={{ ...BUTTON_STYLES.primary }}>
								抽5张
							</GenerateButton>
							<SecondaryButton
								variant="outlined"
								size="small"
								onClick={() => drawRandomCards(1)}
								disabled={!customDialogDeck?.cards?.length}
								sx={{ ...BUTTON_STYLES.secondary }}>
								抽1张
							</SecondaryButton>
							<DangerButton
								variant="outlined"
								size="small"
								onClick={() => setCustomDrawnCards([])}
								disabled={customDrawnCards.length === 0}
								sx={{ ...BUTTON_STYLES.secondary }}>
								重置
							</DangerButton>
						</Stack>
						<Box
							sx={{
								minHeight: 180,
								borderRadius: 2,
								border: "1px dashed rgba(118, 15, 16, 0.25)",
								backgroundColor: "rgba(255,255,255,0.6)",
								px: 2,
								py: 2,
							}}>
							{customDrawnCards.length === 0 ? (
								<Typography
									color="text.secondary"
									align="center">
									点击上方按钮抽取五张卡片
								</Typography>
							) : (
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: {
											xs: "repeat(2, minmax(0, 1fr))",
											sm: "repeat(3, minmax(0, 1fr))",
											md: "repeat(5, minmax(0, 1fr))",
										},
										gap: 2,
									}}>
									{customDrawnCards.map((card, index) => (
										<Box
											key={`${card.cardNo}-${index}`}
											sx={{
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												gap: 1,
											}}>
											<Box
												sx={{
													width: "100%",
													maxWidth: 120,
													borderRadius: 2,
													overflow: "hidden",
													boxShadow: "0 6px 18px rgba(17,24,39,0.18)",
													aspectRatio: "3 / 4.2",
													background: card.imageUrl
														? `url(${card.imageUrl}) center/cover no-repeat`
														: "linear-gradient(135deg, rgba(224,224,224,0.7), rgba(189,189,189,0.6))",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													color: card.imageUrl ? "inherit" : "rgba(0,0,0,0.5)",
													fontSize: "0.7rem",
												}}>
												{card.imageUrl ? null : "无卡图"}
											</Box>
											<Typography
												variant="body2"
												sx={{ textAlign: "center" }}>
												{card.name}
											</Typography>
										</Box>
									))}
								</Box>
							)}
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions>
					<SecondaryButton
						variant="text"
						sx={{ ...BUTTON_STYLES.ghost }}
						onClick={() => {
							setCustomDialogOpen(false);
							setCustomDialogDeck(null);
							setCustomDrawnCards([]);
						}}>
						关闭
					</SecondaryButton>
				</DialogActions>
			</Dialog>

			{/* 删除确认对话框 */}
			<Dialog
				open={deleteDialogOpen}
				onClose={handleCancelDelete}
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
						color: "#dc3545",
						fontWeight: "bold",
						fontSize: "1.2rem",
					}}>
					⚠️ 确认删除卡组
				</DialogTitle>
				<DialogContent sx={{ textAlign: "center", padding: 3 }}>
					<Typography
						variant="body1"
						sx={{ marginBottom: 2 }}>
						您确定要删除卡组：
						<strong style={{ color: "#dc3545" }}>{deletingDeck?.name}</strong>
						吗？
					</Typography>
					<Typography
						variant="body2"
						sx={{ color: "#666", fontStyle: "italic" }}>
						此操作不可撤销，删除后将无法恢复。
					</Typography>
				</DialogContent>
				<DialogActions sx={{ padding: 2, justifyContent: "center", gap: 2 }}>
					<SecondaryButton
						onClick={handleCancelDelete}
						variant="outlined"
						sx={{
							borderColor: "var(--primary)",
							color: "var(--primary)",
							fontWeight: "bold",
							paddingX: 3,
							borderRadius: "20px",
							"&:hover": {
								backgroundColor: "rgba(166, 206, 182, 0.1)",
								borderColor: "var(--primary-hover)",
							},
						}}>
						取消
					</SecondaryButton>
					<DangerButton
						onClick={handleConfirmDelete}
						variant="contained"
						disabled={isDeleting}
						sx={{
							backgroundColor: "#dc3545",
							color: "white",
							fontWeight: "bold",
							paddingX: 3,
							borderRadius: "20px",
							"&:hover": {
								backgroundColor: "#c82333",
							},
							"&:disabled": {
								backgroundColor: "#f8d7da",
								color: "#721c24",
							},
						}}>
						{isDeleting ? (
							<>
								<CircularProgress
									size={20}
									sx={{ mr: 1 }}
								/>
								删除中...
							</>
						) : (
							"确认删除"
						)}
					</DangerButton>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={3000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
				<Alert
					severity={snackbar.severity}
					onClose={handleSnackbarClose}
					sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Container>
	);
};

export default DeckSearch;
