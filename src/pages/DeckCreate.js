import React, { useState } from "react";
import {
	TextField,
	Button,
	Box,
	Typography,
	Autocomplete,
	Grid,
} from "@mui/material";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";

const DeckCreate = () => {
	const [deckName, setDeckName] = useState("");
	const [form, setForm] = useState({
		series: "",
		search: "",
		color: "",
		level: "",
		rarity: "",
		card_type: "",
		cost: "",
		power: "",
		soul: "",
		trigger: "",
	});
	const [seriesInput, setSeriesInput] = useState("");

	// const handleCreate = () => {
	// 	console.log("创建卡组：", deckName);
	// };

	const handleFilterChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleAutocompleteChange = (field) => (event, newValue) => {
		setForm((prev) => ({
			...prev,
			[field]: newValue || "",
		}));
	};

	const handleFilterSearch = () => {
		console.log("筛选：", form);
	};

	const handleFilterReset = () => {
		setForm({
			series: "",
			search: "",
			color: "",
			level: "",
			rarity: "",
			card_type: "",
			cost: "",
			power: "",
			soul: "",
			trigger: "",
		});
	};

	return (
		<Box display={"flex"} flexDirection="column" alignItems="center">
			<Typography variant="h6" gutterBottom>
				创建新的卡组
			</Typography>
			<TextField
				label="卡组名称"
				variant="outlined"
				value={deckName}
				onChange={(e) => setDeckName(e.target.value)}
				sx={{ mb: 2, width: "50%" }}
			/>
			{/* 筛选器区域 */}
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					mb: 2,
					width: "50%",
					gap: 2,
				}}
			>
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
						<TextField {...params} label="系列" variant="outlined" />
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
					}}
				>
					确定
				</Button>
			</Box>
			<Box
				component="form"
				sx={{
					display: "flex",
					flexWrap: "wrap",
					gap: 2,
					alignItems: "center",
					mb: 3,
					width: "100%",
					justifyContent: "center",
				}}
				noValidate
				autoComplete="off"
				onSubmit={(e) => {
					e.preventDefault();
					handleFilterSearch();
				}}
			>
				<Box
					sx={{
						display: "flex",
						width: "100%",
						justifyContent: "center",
						mb: 2,
					}}
				>
					<Box sx={{ width: "50%" }}>
						<TextField
							label="搜索"
							name="search"
							value={form.search}
							onChange={handleFilterChange}
							variant="outlined"
							size="small"
							fullWidth
						/>
					</Box>
				</Box>
				<Grid
					container
					columns={16}
					spacing={2}
					justifyContent="center"
					sx={{ width: "50%", px: 2 }}
				>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.color.slice().sort()}
							value={form.color || null}
							onChange={handleAutocompleteChange("color")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="颜色"
									variant="outlined"
									size="small"
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.level
								.slice()
								.sort((a, b) => Number(a) - Number(b))}
							value={form.level || null}
							onChange={handleAutocompleteChange("level")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="等级"
									variant="outlined"
									size="small"
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.rarity.slice().sort()}
							value={form.rarity || null}
							onChange={handleAutocompleteChange("rarity")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="稀有度"
									variant="outlined"
									size="small"
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.card_type.slice().sort()}
							value={form.card_type || null}
							onChange={handleAutocompleteChange("card_type")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="卡片类型"
									variant="outlined"
									size="small"
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.power
								.slice()
								.sort((a, b) => Number(a) - Number(b))}
							size="small"
							value={form.power || null}
							onChange={handleAutocompleteChange("power")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="攻击力"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.cost
								.slice()
								.sort((a, b) => Number(a) - Number(b))}
							size="small"
							value={form.cost || null}
							onChange={handleAutocompleteChange("cost")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="费用"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.soul.slice().sort()}
							size="small"
							value={form.soul || null}
							onChange={handleAutocompleteChange("soul")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="灵魂"
									variant="outlined"
									fullWidth
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} size={4}>
						<Autocomplete
							options={productList.trigger.slice().sort()}
							value={form.trigger || null}
							onChange={handleAutocompleteChange("trigger")}
							renderInput={(params) => (
								<TextField
									{...params}
									label="触发"
									variant="outlined"
									size="small"
								/>
							)}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={2}>
						<Button
							variant="contained"
							color="primary"
							onClick={handleFilterSearch}
							fullWidth
							size="medium"
						>
							筛选
						</Button>
					</Grid>
					<Grid item xs={12} sm={6} md={2}>
						<Button
							variant="outlined"
							color="secondary"
							onClick={handleFilterReset}
							fullWidth
							size="medium"
						>
							重置
						</Button>
					</Grid>
				</Grid>
			</Box>
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
				}}
			>
				{JSON.stringify(form, null, 2)}
			</Box>
		</Box>
	);
};

export default DeckCreate;
