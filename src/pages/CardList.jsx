import React, { useState, useEffect } from "react";
import {
	Container,
	Box,
	TextField,
	Button,
	Typography,
	Autocomplete,
	Card,
	CardContent,
	Pagination,
	Fab,
	Tooltip,
	Chip,
	Stack,
	Divider,
} from "@mui/material";
import { PrimaryButton, DangerButton } from "../components/ButtonVariants";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useLocale } from "../contexts/LocaleContext";

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const BACKEND_URL = "http://localhost:4000";

function CardList() {
	const [result, setResult] = useState({
		data: [],
		total: 0,
		page: 1,
		pageSize: 20,
	});

	const [form, setForm] = useState({ page: 1 });
	const [draftForm, setDraftForm] = useState({ page: 1 });
	const [showZh, setShowZh] = useState(false);
	const [showJP, setShowJP] = useState(true);
	const [showScrollTop, setShowScrollTop] = useState(false);
	const [showScrollBottom, setShowScrollBottom] = useState(false);
	const { locale, t } = useLocale();
	const colon = locale === "zh" ? "：" : ": ";
	const zhToggleTitle = showZh
		? t("pages.cardList.toggle.hideZh")
		: t("pages.cardList.toggle.showZh");
	const jpToggleTitle = showJP
		? t("pages.cardList.toggle.hideJp")
		: t("pages.cardList.toggle.showJp");
	const scrollDownLabel = t("pages.cardList.scroll.down");
	const scrollUpLabel = t("pages.cardList.scroll.up");

	useEffect(() => {
		const handleScroll = () => {
			const scrollTop = window.scrollY;
			const windowHeight = window.innerHeight || 0;
			const docHeight = document.documentElement.scrollHeight || 0;
			setShowScrollTop(scrollTop > 400);
			setShowScrollBottom(scrollTop + windowHeight < docHeight - 400);
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const handleSearch = (draftForm) => {
		const params = new URLSearchParams(
			Object.entries(draftForm).filter(
				([, v]) => v !== undefined && v !== "" && v !== null
			)
		).toString();
		console.log(params);

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
				console.log(res);
			})
			.catch((err) => {
				console.error("搜索失败:", err);
				setResult({ data: [], total: 0 }); // 清空结果，保持页面正常显示
			});
		setForm(draftForm);
	};

	const handleReset = () => {
		setForm({ page: 1 });
		setDraftForm({ page: 1 });
		setResult({ data: [], total: 0, page: 1, pageSize: 20 });
	};

	const handlePageChange = (_, newPage) => {
		handleSearch({ ...form, page: newPage });
		setForm((prev) => ({ ...prev, page: newPage }));
	};

	const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
	const scrollToBottom = () =>
		window.scrollTo({
			top: document.documentElement.scrollHeight,
			behavior: "smooth",
		});

	return (
		<Container
			maxWidth="md"
			sx={{ textAlign: "center" }}>
			<Typography
				variant="h4"
				fontWeight={700}
				color="#1b4332"
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
					backgroundColor: "rgba(27, 67, 50, 0.1)",
					borderRadius: 3,
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
					border: "1px solid rgba(27, 67, 50, 0.2)",
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
								/>
							)}
						/>
					</Box>

					{/* 关键词和Side搜索 */}
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								sm: "2fr 1fr",
							},
							gap: 2,
							mb: 3,
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

						<Autocomplete
							options={productList.side.slice().sort()}
							size="small"
							value={draftForm.side || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, side: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.side")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

					{/* 卡片属性 */}
					<Typography
						variant="h6"
						sx={{ mb: 2, textAlign: "left" }}>
						{t("pages.cardList.sections.cardAttributes")}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr 1fr",
								sm: "1fr 1fr 1fr 1fr",
								md: "1fr 1fr 1fr 1fr",
							},
							gap: 2,
							mb: 3,
						}}>
						<Autocomplete
							options={productList.color.slice().sort()}
							size="small"
							value={draftForm.color || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, color: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.color")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>

						<Autocomplete
							options={productList.level
								.slice()
								.sort((a, b) => Number(a) - Number(b))}
							size="small"
							value={draftForm.level || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, level: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.level")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>

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
								/>
							)}
						/>

						<Autocomplete
							options={productList.card_type.slice().sort()}
							size="small"
							value={draftForm.card_type || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, card_type: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.cardType")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

					{/* 数值属性 */}
					<Typography
						variant="h6"
						sx={{ mb: 2, textAlign: "left" }}>
						{t("pages.cardList.sections.numericAttributes")}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr 1fr",
								sm: "1fr 1fr 1fr 1fr",
							},
							gap: 2,
							mb: 4,
						}}>
						<Autocomplete
							options={productList.power
								.slice()
								.sort((a, b) => Number(a) - Number(b))}
							size="small"
							value={draftForm.power || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, power: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.power")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>

						<Autocomplete
							options={productList.cost
								.slice()
								.sort((a, b) => Number(a) - Number(b))}
							size="small"
							value={draftForm.cost || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, cost: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.cost")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>

						<Autocomplete
							options={productList.soul.slice().sort()}
							size="small"
							value={draftForm.soul || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, soul: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.soul")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>

						<Autocomplete
							options={productList.trigger.slice().sort()}
							size="small"
							value={draftForm.trigger || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, trigger: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.cardList.fields.trigger")}
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

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
								backgroundColor: "#a6ceb6",
								color: "#1b4332",
								"&:hover": { backgroundColor: "#95bfa5" },
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
								backgroundColor: "#760f10",
								"&:hover": {
									backgroundColor: "#5c0f10",
								},
							}}>
							{t("pages.cardList.resetButton")}
						</DangerButton>
					</Box>
				</Box>
			</Box>

			<Box m={{ xs: 2, md: 4 }}>
				{result.data.map((card, index) => {
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
							key={card.cardno || card.id || `${card.image_url}-${index}`}
							sx={{
								position: "relative",
								display: "flex",
								flexDirection: { xs: "column", sm: "row" },
								overflow: "hidden",
								mb: 3,
								borderRadius: 3,
								background:
									"linear-gradient(140deg, rgba(255,255,255,0.96) 5%, rgba(214,236,223,0.92) 45%, rgba(255,255,255,0.9) 100%)",
								boxShadow: "0 18px 45px rgba(17, 24, 39, 0.15)",
								border: "1px solid rgba(166, 206, 182, 0.45)",
								transition: "transform 0.4s ease, box-shadow 0.4s ease",
								backdropFilter: "blur(4px)",
								"&::before": {
									content: '""',
									position: "absolute",
									top: 0,
									left: 0,
									width: "40%",
									height: "100%",
									background:
										"radial-gradient(circle at top left, rgba(166,206,182,0.35), transparent 65%)",
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
									background:
										"linear-gradient(160deg, rgba(255,255,255,0.15) 0%, rgba(166,206,182,0.25) 100%)",
									zIndex: 1,
								}}>
								<Box
									component="img"
									src={card.image_url}
									alt={card.name}
									sx={{
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
								<Box>
									<Typography
										variant="h6"
										sx={{ fontWeight: 600 }}>
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
												backgroundColor: "rgba(166, 206, 182, 0.2)",
												border: "1px solid rgba(166, 206, 182, 0.6)",
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
													backgroundColor: "rgba(118, 15, 16, 0.08)",
													border: "1px solid rgba(118, 15, 16, 0.18)",
													fontWeight: 500,
												}}
											/>
										))}
									</Stack>
								)}

								<Divider sx={{ borderColor: "rgba(118, 15, 16, 0.12)" }} />

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
											backgroundColor: "rgba(166, 206, 182, 0.16)",
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
							</CardContent>
						</Card>
					);
				})}
			</Box>

			{result.total > result.pageSize && (
				<Box
					mt={4}
					display="flex"
					justifyContent="center"
					mb={4}>
					<Pagination
						count={Math.ceil(result.total / result.pageSize)}
						page={result.page}
						onChange={handlePageChange}
						color="primary"
						size="small"
						sx={{
							"& .MuiPaginationItem-root": {
								color: "#4b4b4b",
								borderColor: "#a6ceb6",
							},
							"& .Mui-selected": {
								backgroundColor: "#a6ceb6",
								color: "#fff",
								"&:hover": {
									backgroundColor: "#95bfa5",
								},
							},
						}}
					/>
				</Box>
			)}

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

				{showScrollBottom && (
					<Fab
						color="primary"
						aria-label={scrollDownLabel}
						onClick={scrollToBottom}
						sx={{
							backgroundColor: "#a6ceb6",
							color: "#fff",
							"&:hover": {
								backgroundColor: "#95bfa5",
							},
						}}
						size="small">
						<KeyboardArrowDownIcon />
					</Fab>
				)}

				{showScrollTop && (
					<Fab
						color="primary"
						aria-label={scrollUpLabel}
						onClick={scrollToTop}
						sx={{
							backgroundColor: "#a6ceb6",
							color: "#fff",
							"&:hover": {
								backgroundColor: "#95bfa5",
							},
						}}
						size="small">
						<KeyboardArrowUpIcon />
					</Fab>
				)}
			</Box>
		</Container>
	);
}

export default CardList;
