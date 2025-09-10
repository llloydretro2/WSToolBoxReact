import React, { useState } from "react";
import {
	Container,
	Box,
	TextField,
	Button,
	Typography,
	Grid,
	Autocomplete,
	Card,
	CardMedia,
	CardContent,
	Pagination,
} from "@mui/material";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";

const RAILWAY_BACKEND_URL =
	"https://wstoolboxbackend-production.up.railway.app";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

function CardList() {
	const [result, setResult] = useState({
		data: [],
		total: 0,
		page: 1,
		pageSize: 20,
	});

	const [form, setForm] = useState({ page: 1 });
	const [draftForm, setDraftForm] = useState({ page: 1 });

	const handleSearch = (draftForm) => {
		const params = new URLSearchParams(
			Object.entries(draftForm).filter(
				([_, v]) => v !== undefined && v !== "" && v !== null
			)
		).toString();
		console.log(params);

		// 本地后端测试地址
		// http://localhost:4000/api/cards?${params}
		// 线上后端测试地址
		// https://wstoolboxbackend-production.up.railway.app/api/cards?${params}

		fetch(`${RAILWAY_BACKEND_URL}/api/cards?${params}`)
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

	return (
		<Container maxWidth="sm" sx={{ textAlign: "center", pt: 8 }}>
			<Typography variant="h5" gutterBottom>
				卡片查询
			</Typography>
			<Typography variant="body1" color="text.secondary">
				根据关键词和筛选条件查询卡片信息
			</Typography>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "center",
					gap: 2,
					mt: 4,
				}}
			>
				<Box
					component="form"
					onSubmit={(e) => {
						e.preventDefault();
						handleSearch({ ...draftForm, page: 1 });
						setForm((prev) => ({ ...draftForm, page: 1 }));
					}}
					sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}
				>
					<Box sx={{ flexBasis: "100%" }}>
						<Autocomplete
							sx={{ maxWidth: 300, mx: "auto" }}
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
									label="系列编号"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

					<Box sx={{ flexBasis: "100%" }}>
						<Autocomplete
							sx={{ maxWidth: 300, mx: "auto" }}
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
									label="系列名"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

					<Box sx={{ flexBasis: "100%" }}>
						<Autocomplete
							sx={{ maxWidth: 300, mx: "auto" }}
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
									label="产品名"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

					<Box sx={{ flexBasis: "100%" }}>
						<Autocomplete
							options={productList.side.slice().sort()}
							size="small"
							sx={{ maxWidth: 300, mx: "auto" }}
							value={draftForm.side || ""}
							onChange={(_, newValue) =>
								setDraftForm((prev) => ({ ...prev, side: newValue }))
							}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Side"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Box>

					<Box sx={{ flexBasis: "100%" }}>
						<TextField
							name="search"
							label="搜索关键字"
							variant="outlined"
							fullWidth
							size="small"
							sx={{ maxWidth: 300 }}
							value={draftForm.search || ""}
							onChange={(e) =>
								setDraftForm((prev) => ({ ...prev, search: e.target.value }))
							}
						/>
					</Box>

					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							gap: 2,
							justifyContent: "space-between",
							width: "100%",
							mt: 2,
						}}
					>
						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="颜色"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>

						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="等级"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>

						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="稀有度"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>

						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="卡片类型"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>
					</Box>

					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							gap: 2,
							justifyContent: "space-between",
							width: "100%",
							mt: 2,
						}}
					>
						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="攻击力"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>

						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="费用"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>

						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="灵魂"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>

						<Box sx={{ flex: 1, minWidth: 120 }}>
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
										label="触发"
										variant="outlined"
										fullWidth
									/>
								)}
							/>
						</Box>
					</Box>
					<Box
						flex
						row
						sx={{
							display: "flex",
							flexDirection: "row",
							width: "100%",
							textAlign: "center",
							m: 3,
							gap: 2,
							justifyContent: "center",
						}}
						gap={2}
					>
						<Button
							type="submit"
							variant="contained"
							size="large"
							sx={{
								px: 6,
								py: 1.5,
								backgroundColor: "#a6ceb6",
								"&:hover": { backgroundColor: "#95bfa5" },
							}}
						>
							搜索
						</Button>

						<Button
							type="button"
							variant="contained"
							size="large"
							onClick={handleReset}
							sx={{
								px: 6,
								py: 1.5,
								backgroundColor: "#760f10",
								"&:hover": {
									backgroundColor: "#5c0f10",
								},
							}}
						>
							重置
						</Button>
					</Box>
				</Box>
			</Box>

			<Box m={4}>
				<Grid container spacing={2}>
					{result.data.map((card) => (
						<Grid item xs={12} sm={6} md={4} lg={3} key={card.cardno}>
							<Card>
								<CardMedia
									component="img"
									image={card.image_url}
									alt={card.name}
									sx={{ height: 300, objectFit: "contain", mt: 2 }}
								/>
								<CardContent>
									<Typography variant="h6">{card.name}</Typography>
									<Typography variant="h6">{card.zh_name}</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>编号:</strong> {card.cardno}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>颜色:</strong> {card.color}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>稀有度:</strong> {card.rarity}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>等级:</strong> {card.level}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>费用:</strong> {card.cost}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>力量:</strong> {card.power}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>产品名：</strong> {card.product_name}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>系列：</strong> {card.series}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>风味：</strong> {card.flavor}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>风味（中文）：</strong> {card.zh_flavor}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>效果：</strong> {card.effect}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>效果（中文）：</strong> {card.zh_effect}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>

				{result.total > result.pageSize && (
					<Box mt={4} display="flex" justifyContent="center" mb={4}>
						<Pagination
							count={Math.ceil(result.total / result.pageSize)}
							page={result.page}
							onChange={handlePageChange}
							color="primary"
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
			</Box>
			<Box display="flex" justifyContent="center" mb={4}>
				<Button
					variant="outlined"
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
					sx={{
						color: "#4b4b4b",
						borderColor: "#a6ceb6",
						"&:hover": {
							borderColor: "#95bfa5",
							backgroundColor: "#f5f5f5",
						},
					}}
				>
					回到顶部
				</Button>
			</Box>
		</Container>
	);
}

export default CardList;
