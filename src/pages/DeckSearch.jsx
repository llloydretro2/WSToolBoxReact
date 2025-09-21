import React, { useEffect, useState, useMemo, useRef } from "react";
import {
	Typography,
	Box,
	CircularProgress,
	Card,
	CardContent,
	Stack,
	Button,
	Divider,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Snackbar,
	Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "../contexts/AuthContext.jsx";

const RAILWAY_BACKEND_URL =
	"https://wstoolboxbackend-production.up.railway.app";

const DeckSearch = () => {
	const { token, username } = useAuth();
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
				const res = await fetch(`${RAILWAY_BACKEND_URL}/api/decks/mine`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (!res.ok) {
					throw new Error("获取卡组失败");
				}
				const data = await res.json();
				if (isMounted) {
					setDecks(Array.isArray(data) ? data : []);
				}
			} catch (err) {
				console.error("加载卡组失败:", err);
				if (isMounted) {
					setError(err.message || "加载卡组失败");
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
	}, [token, refreshIndex]);

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
					const res = await fetch(
						`${RAILWAY_BACKEND_URL}/api/cards?search=${encodeURIComponent(
							cardNo
						)}&page=1&pageSize=1`
					);
					if (!res.ok) throw new Error("获取卡片详情失败");
					const json = await res.json();
					const detail = Array.isArray(json.data) ? json.data[0] : undefined;
					if (detail) {
						updates[cardNo] = {
							name: detail.name || detail.zh_name || cardNo,
							imageUrl: detail.image_url,
							series: detail.series,
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

	const deckSummaries = useMemo(() => {
		return decks.map((deck) => {
			const totalCards = Array.isArray(deck.cards)
				? deck.cards.reduce((sum, card) => sum + (card.count || 0), 0)
				: 0;
			return {
				id: deck._id,
				name: deck.name || "未命名卡组",
				totalCards,
				isPublic: deck.isPublic,
				cards: Array.isArray(deck.cards)
					? deck.cards.map((card) => ({
							cardNo: card.cardNo,
							count: card.count,
							imageUrl: card.imageUrl || card.image_url || "",
							info: card.info || "",
					  }))
					: [],
				createdAt: deck.createdAt,
				updatedAt: deck.updatedAt,
			};
		});
	}, [decks]);

	const buildCardEffectText = (deck) => {
		if (!deck?.cards?.length) return "暂无卡片数据";
		console.log("Building card effect text for deck:", deck);
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

	return (
		<Box sx={{ maxWidth: 900, mx: "auto", mt: 2, px: { xs: 1, md: 3 } }}>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center">
				<Box>
					<Typography
						variant="h5"
						gutterBottom>
						我的卡组
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary">
						{token
							? `当前账号：${username || "未知用户"}`
							: "请先登录以查看自己的卡组"}
					</Typography>
				</Box>
				<Box>
					<Button
						variant="outlined"
						size="small"
						disabled={!token || loading}
						onClick={() => setRefreshIndex((idx) => idx + 1)}>
						刷新
					</Button>
				</Box>
			</Stack>

			<Box sx={{ mt: 3 }}>
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
						暂时还没有创建卡组
					</Typography>
				) : (
					<Stack spacing={2}>
						{deckSummaries.map((deck) => (
							<Card
								key={deck.id}
								variant="outlined">
								<CardContent>
									<Stack
										direction={{ xs: "column", sm: "row" }}
										justifyContent="space-between"
										alignItems={{ xs: "flex-start", sm: "center" }}
										spacing={1}>
										<Box
											sx={{
												minWidth: { xs: "100%", sm: "35%" },
												mb: { xs: 1, sm: 0 },
											}}>
											<Typography variant="h6">{deck.name}</Typography>
											<Typography
												variant="body2"
												color="text.secondary">
												{deck.isPublic ? "公开卡组" : "私密卡组"} · 共{" "}
												{deck.totalCards} 张
											</Typography>
										</Box>
										<Box sx={{ width: "100%" }}>
											<Divider sx={{ my: 1 }} />
											{deck.cards.length === 0 ? (
												<Typography
													variant="body2"
													color="text.secondary">
													暂无卡片明细
												</Typography>
											) : (
												<>
													<Box
														sx={{
															display: "flex",
															flexWrap: "wrap",
															justifyContent: {
																xs: "center",
																sm: "flex-start",
															},
															gap: 1.5,
															rowGap: 2,
														}}>
														{deck.cards.slice(0, 6).map((card) => {
															const detailInfo =
																card.info && Object.keys(card.info).length
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
																	key={`${deck.id}-${card.cardNo}`}
																	sx={{
																		flexBasis: {
																			xs: "45%",
																			sm: "18%",
																			md: "15%",
																		},
																		display: "flex",
																		flexDirection: "column",
																		alignItems: "center",
																		textAlign: "center",
																	}}>
																	{imageUrl ? (
																		<Box
																			component="img"
																			src={imageUrl}
																			alt={displayName}
																			sx={{
																				width: "100%",
																				height: "auto",
																				objectFit: "cover",
																				borderRadius: 1,
																				boxShadow: 1,
																			}}
																		/>
																	) : (
																		<Box
																			sx={{
																				width: "100%",
																				height: "auto",
																				borderRadius: 1,
																				backgroundColor: "rgba(0,0,0,0.08)",
																				display: "flex",
																				alignItems: "center",
																				justifyContent: "center",
																				fontSize: "0.7rem",
																				color: "text.secondary",
																				boxShadow: 1,
																			}}>
																			无卡图
																		</Box>
																	)}
																	<Typography
																		variant="body2"
																		sx={{ lineHeight: 1.2, mt: 0.5 }}>
																		{displayName}
																	</Typography>
																	<Typography
																		variant="caption"
																		color="text.secondary">
																		{card.count}
																	</Typography>
																</Box>
															);
														})}
													</Box>
													{deck.cards.length > 6 && (
														<Typography
															variant="caption"
															color="text.secondary"></Typography>
													)}
												</>
											)}
										</Box>
									</Stack>
								</CardContent>
								<Box
									sx={{
										display: "flex",
										justifyContent: "flex-end",
										px: 2,
										pb: 2,
									}}>
									<Button
										variant="outlined"
										size="small"
										onClick={() => setExportingDeck(deck)}>
										导出中文效果
									</Button>
								</Box>
							</Card>
						))}
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
					<Button onClick={() => setExportingDeck(null)}>关闭</Button>
					<Button
						startIcon={<ContentCopyIcon />}
						onClick={() => exportingDeck && handleCopyEffects(exportingDeck)}>
						复制全部
					</Button>
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
		</Box>
	);
};

export default DeckSearch;
