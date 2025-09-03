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

function CardList() {
	const [result, setResult] = useState({
		data: [],
		total: 0,
		page: 1,
		pageSize: 20,
	});

	const [form, setForm] = useState({ page: 1 });

	const handleSearch = (searchForm) => {
		const params = new URLSearchParams(
			Object.entries(searchForm).filter(
				([_, v]) => v !== undefined && v !== "" && v !== null
			)
		).toString();
		console.log(params);

		// 本地后端测试地址
		// http://localhost:4000/api/cards?${params}
		// 线上后端测试地址
		// https://wstoolboxbackend-production.up.railway.app/api/cards?${params}

		fetch(
			`https://wstoolboxbackend-production.up.railway.app/api/cards?${params}`
		)
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
	};

	const handleReset = () => {
		setForm({ page: 1 });
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
						handleSearch(form);
					}}
					sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}
				>
					<Box sx={{ flexBasis: "100%" }}>
						<Autocomplete
							sx={{ maxWidth: 300, mx: "auto" }}
							options={productList.series_number.slice().sort()}
							size="small"
							value={form.series_number || ""}
							onChange={(_, newValue) =>
								setForm((prev) => ({ ...prev, series_number: newValue }))
							}
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
							options={productList.series.slice().sort()}
							size="small"
							value={form.series || ""}
							onChange={(_, newValue) =>
								setForm((prev) => ({ ...prev, series: newValue }))
							}
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
							options={productList.product_name.slice().sort()}
							size="small"
							value={form.product_name || ""}
							onChange={(_, newValue) =>
								setForm((prev) => ({ ...prev, product_name: newValue }))
							}
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
							value={form.side || ""}
							onChange={(_, newValue) =>
								setForm((prev) => ({ ...prev, side: newValue }))
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
							value={form.search || ""}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, search: e.target.value }))
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
								value={form.color || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, color: newValue }))
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
								value={form.level || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, level: newValue }))
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
								value={form.rarity || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, rarity: newValue }))
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
								value={form.card_type || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, card_type: newValue }))
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
								value={form.power || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, power: newValue }))
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
								value={form.cost || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, cost: newValue }))
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
								value={form.soul || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, soul: newValue }))
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
								value={form.trigger || ""}
								onChange={(_, newValue) =>
									setForm((prev) => ({ ...prev, trigger: newValue }))
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
							display: "flex", // 必须显式写出来
							flexDirection: "row", // 默认为 row，也可以省略
							width: "100%",
							textAlign: "center",
							m: 3,
							gap: 2, // 现在生效了
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
									<Typography variant="body2" color="text.secondary">
										No: {card.cardno}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Color: {card.color}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Rarity: {card.rarity}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Level: {card.level}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Power: {card.power}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										{card.product_name} - {card.series}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										{card.flavor}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										{card.effect}
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
		</Container>
	);
}

export default CardList;
