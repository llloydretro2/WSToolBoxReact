import React, { useState } from "react";
import { interpolateSpectral } from "d3-scale-chromatic";
import { apiRequest } from "../utils/api.jsx";
import { useLocale } from "../contexts/LocaleContext";
import {
	Box,
	Typography,
	Paper,
	CircularProgress,
	Tabs,
	Tab,
	TextField,
	MenuItem,
	Button,
	Autocomplete,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Switch,
	FormControlLabel,
	Card,
	CardContent,
	CardActions,
	IconButton,
	Chip,
	Avatar,
	Tooltip,
	Grid,
	Fab,
	Menu,
	MenuItem as MenuItemMui,
	ListItemIcon,
	ListItemText,
	useTheme,
	useMediaQuery,
} from "@mui/material";
import {
	Delete as DeleteIcon,
	EmojiEvents as TrophyIcon,
	Person as PersonIcon,
	Casino as DeckIcon,
	Settings as SettingsIcon,
	BarChart as ChartIcon,
	TableChart as TableIcon,
	Visibility as VisibilityIcon,
	VisibilityOff as VisibilityOffIcon,
	Download as DownloadIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
	PrimaryButton,
	SecondaryButton,
	DangerButton,
	GenerateButton,
	SubtleButton,
} from "../components/ButtonVariants";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";
import ReactECharts from "echarts-for-react";

// 本地后端测试地址
// http://localhost:4000/api/cards?${params}

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

const Record = () => {
	const { t } = useLocale();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const [records, setRecords] = useState([]);
	const [loading, setLoading] = useState(true);
	const [tabValue, setTabValue] = useState(0);
	const [formState, setFormState] = useState({
		playerDeckName: "",
		opponentDeckName: "",
		playerSeries: "",
		opponentSeries: "",
		tournamentName: "",
		notes: "",
		result: "",
	});
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [recordToDelete, setRecordToDelete] = useState(null);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [startDate, setStartDate] = useState(null);
	const [endDate, setEndDate] = useState(null);
	const [seriesStats, setSeriesStats] = useState([]);
	const [opponentSeriesStats, setOpponentSeriesStats] = useState([]);
	const [showPlayerChart, setShowPlayerChart] = useState(false);
	const [showOpponentChart, setShowOpponentChart] = useState(false);
	const [showWinRateTable, setShowWinRateTable] = useState(false);

	// 浮动按钮菜单状态
	const [fabMenuAnchor, setFabMenuAnchor] = useState(null);
	const fabMenuOpen = Boolean(fabMenuAnchor);

	// 对话框状态
	const [chartDialogOpen, setChartDialogOpen] = useState(false);
	const [opponentChartDialogOpen, setOpponentChartDialogOpen] = useState(false);
	const [tableDialogOpen, setTableDialogOpen] = useState(false);
	const [activeChartType, setActiveChartType] = useState(null); // 'playerChart', 'opponentChart', 'winRateTable'

	// 图表ref用于导出
	// 已移除：ECharts有内置导出功能，不再需要ref

	// 创建 ECharts 配置 (带内置导出功能)
	const createEChartsOption = (data, title) => {
		const sortedData = [...data].sort((a, b) => b.value - a.value);
		const colors = sortedData.map((_, index) =>
			interpolateSpectral(
				sortedData.length <= 1 ? 0 : index / (sortedData.length - 1)
			)
		);
		const itemCount = sortedData.length;
		const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);
		const deviceWidth =
			typeof window !== "undefined" ? window.innerWidth : undefined;
		const mobileMaxChars = (() => {
			if (!deviceWidth) return 16;
			if (deviceWidth >= 430) return 18;
			if (deviceWidth >= 390) return 16;
			if (deviceWidth >= 360) return 14;
			return 12;
		})();
		const wrapLegendLabel = (label) => {
			const maxChars = isMobile ? mobileMaxChars : 24;
			if (label.length <= maxChars) return label;
			const chunks = label.match(new RegExp(`.{1,${maxChars}}`, "g")) || [
				label,
			];
			return chunks.join("\n");
		};
		const formatPercent = (value) => {
			if (!totalValue) return "0%";
			const percent = (value / totalValue) * 100;
			const digits = percent >= 10 ? 1 : 2;
			const fixed = percent.toFixed(digits);
			return `${fixed.replace(/\.0+$|0+$/g, "").replace(/\.$/, "")}%`;
		};

		const mobileChartHeight = Math.max(
			360,
			Math.min(880, 240 + itemCount * 22)
		);

		return {
			option: {
				title: {
					text: title,
					left: "center",
					top: isMobile ? 10 : 24,
					textStyle: {
						fontSize: 18,
						fontWeight: "bold",
					},
				},
				tooltip: {
					trigger: "item",
					formatter: ({ name, value }) => `${name}: ${formatPercent(value)}`,
				},
				legend: {
					orient: "horizontal",
					...(isMobile
						? { left: "center", width: "90%" }
						: { left: "6%", right: "6%", width: "88%" }),
					...(isMobile
						? { top: "48%", bottom: 22 }
						: { top: "80%", bottom: 28 }),
					itemGap: isMobile
						? itemCount <= 3
							? 12
							: itemCount <= 6
							? 9
							: 6
						: itemCount <= 5
						? 22
						: itemCount <= 10
						? 16
						: 12,
					itemWidth: isMobile ? 14 : 18,
					itemHeight: isMobile ? 10 : 14,
					data: sortedData.map((item) => item.name),
					textStyle: {
						fontSize: isMobile
							? itemCount > 10
								? 9
								: itemCount > 6
								? 10
								: 11
							: 12,
						padding: [0, 2, 0, 2],
						lineHeight: isMobile ? 14 : 20,
					},
					formatter: (name) => {
						const item = sortedData.find((d) => d.name === name);
						const countLabel = item ? `${item.value}个` : "0个";
						return wrapLegendLabel(`${name} (${countLabel})`);
					},
				},
				toolbox: {
					show: true,
					feature: {
						saveAsImage: {
							show: true,
							title: "导出图片",
							name: title,
							type: "png",
							backgroundColor: "#ffffff",
							pixelRatio: 2,
						},
					},
					right: 15,
					top: 15,
				},
				series: [
					{
						name: title,
						type: "pie",
						radius: ["0%", isMobile ? "52%" : "46%"],
						center: ["50%", isMobile ? "26%" : "42%"],
						data: sortedData.map((item, index) => ({
							value: item.value,
							name: item.name,
							itemStyle: {
								color: colors[index],
							},
						})),
						emphasis: {
							itemStyle: {
								shadowBlur: 10,
								shadowOffsetX: 0,
								shadowColor: "rgba(0, 0, 0, 0.5)",
							},
						},
						label: {
							show: !isMobile,
							position: "outside",
							formatter: ({ name, value }) =>
								`${name}\n${formatPercent(value)}`,
							fontSize: 11,
							distance: 15,
						},
						labelLine: {
							show: !isMobile,
						},
					},
				],
			},
			mobileChartHeight,
		};
	};

	const resetForm = () => {
		setFormState({
			playerDeckName: "",
			playerSeries: "",
			opponentDeckName: "",
			opponentSeries: "",
			result: "",
			tournamentName: "",
			notes: "",
		});
		setResetDialogOpen(false);
	};

	// 处理浮动按钮菜单
	const handleFabMenuOpen = (event) => {
		setFabMenuAnchor(event.currentTarget);
	};

	const handleFabMenuClose = () => {
		setFabMenuAnchor(null);
	};

	const toggleDisplayOption = (option) => {
		switch (option) {
			case "playerChart":
				setActiveChartType("playerChart");
				setChartDialogOpen(true);
				break;
			case "opponentChart":
				setActiveChartType("opponentChart");
				setOpponentChartDialogOpen(true);
				break;
			case "winRateTable":
				setActiveChartType("winRateTable");
				setTableDialogOpen(true);
				break;
		}
		handleFabMenuClose();
	};

	const deleteRecord = async () => {
		if (!recordToDelete) return;

		try {
			await apiRequest(
				`${BACKEND_URL}/api/matches/delete/${recordToDelete._id}`,
				{
					method: "DELETE",
				}
			);

			setRecords((prev) =>
				prev.filter((record) => record._id !== recordToDelete._id)
			);
			setRecordToDelete(null);
			getHistory();
		} catch (err) {
			console.error("删除出错:", err);
		}
	};

	const getHistory = async () => {
		try {
			const res = await apiRequest(`${BACKEND_URL}/api/matches/history`);
			const data = await res.json();

			// 筛选时间范围
			const filtered = data.filter((record) => {
				const time = new Date(record.timestamp).getTime();
				if (startDate && time < new Date(startDate).getTime()) return false;
				if (endDate && time > new Date(endDate).getTime()) return false;
				return true;
			});
			setRecords(filtered);
			const countMap = {};
			filtered.forEach((rec) => {
				const key = rec.playerSeries || "未知";
				countMap[key] = (countMap[key] || 0) + 1;
			});
			const statsArray = Object.entries(countMap)
				.map(([name, value]) => ({
					name,
					value,
				}))
				.sort((a, b) => b.value - a.value);
			setSeriesStats(statsArray);

			const opponentMap = {};
			filtered.forEach((rec) => {
				const key = rec.opponentSeries || "未知";
				opponentMap[key] = (opponentMap[key] || 0) + 1;
			});
			const opponentStatsArray = Object.entries(opponentMap)
				.map(([name, value]) => ({
					name,
					value,
				}))
				.sort((a, b) => b.value - a.value);
			setOpponentSeriesStats(opponentStatsArray);
		} catch (err) {
			console.error("Error fetching match records:", err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				p: 3,
				width: {
					xs: "80%",
					sm: "80%",
					md: "60%",
					lg: "50%",
				},
				mx: "auto",
			}}>
			<Typography
				variant="h4"
				fontWeight={700}
				color="#1b4332"
				gutterBottom>
				对战记录
			</Typography>

			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				<Tabs
					value={tabValue}
					variant="fullWidth"
					onChange={(e, newValue) => {
						if (newValue === 1) {
							getHistory();
						}
						setTabValue(newValue);
					}}>
					<Tab label={t("pages.record.tabs.create")} />
					<Tab label={t("pages.record.tabs.query")} />
				</Tabs>
			</Box>

			{tabValue === 0 && (
				<Box
					component="form"
					onSubmit={async (e) => {
						e.preventDefault();
						const data = {};
						const userName = JSON.parse(localStorage.getItem("user")).username;
						data.userName = userName;
						data.playerDeckName = formState.playerDeckName.trim();
						data.opponentDeckName = formState.opponentDeckName.trim();
						data.playerSeries = formState.playerSeries.trim();
						data.opponentSeries = formState.opponentSeries.trim();
						data.result = formState.result.trim();
						if (formState.tournamentName.trim())
							data.tournamentName = formState.tournamentName.trim();
						if (formState.notes.trim()) data.notes = formState.notes.trim();
						console.log("Submitting match record:", data);

						try {
							const res = await apiRequest(
								`${BACKEND_URL}/api/matches/create`,
								{
									method: "POST",
									body: JSON.stringify(data),
								}
							);
							const newRecord = await res.json();
							setRecords((prev) => [newRecord, ...prev]);
							setTabValue(1);
						} catch (err) {
							console.error("提交出错:", err);
						}
					}}
					sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 2,
							backgroundColor: "rgba(166, 206, 182, 0.15)",
							borderRadius: 2,
							p: 2,
						}}>
						<Typography
							variant="subtitle2"
							sx={{ fontWeight: 600 }}>
							{t("pages.record.form.myInfo")}
						</Typography>
						<TextField
							required
							label={t("pages.record.form.myDeckName")}
							name="playerDeckName"
							value={formState.playerDeckName}
							onChange={(e) =>
								setFormState((prev) => ({
									...prev,
									playerDeckName: e.target.value,
								}))
							}
						/>
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
								formState.playerSeries
									? `${formState.playerSeries}${
											translationMap.series?.[formState.playerSeries]
												? `（${translationMap.series[formState.playerSeries]}）`
												: ""
									  }`
									: ""
							}
							onChange={(_, newValue) => {
								const key = newValue?.split("（")[0];
								setFormState((prev) => ({ ...prev, playerSeries: key || "" }));
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.record.form.mySeries")}
									required
								/>
							)}
						/>
					</Box>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 2,
							backgroundColor: "rgba(255, 205, 210, 0.15)",
							borderRadius: 2,
							p: 2,
						}}>
						<Typography
							variant="subtitle2"
							sx={{ fontWeight: 600 }}>
							{t("pages.record.form.opponentInfo")}
						</Typography>
						<TextField
							required
							label={t("pages.record.form.opponentDeckName")}
							name="opponentDeckName"
							value={formState.opponentDeckName}
							onChange={(e) =>
								setFormState((prev) => ({
									...prev,
									opponentDeckName: e.target.value,
								}))
							}
						/>
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
								formState.opponentSeries
									? `${formState.opponentSeries}${
											translationMap.series?.[formState.opponentSeries]
												? `（${
														translationMap.series[formState.opponentSeries]
												  }）`
												: ""
									  }`
									: ""
							}
							onChange={(_, newValue) => {
								const key = newValue?.split("（")[0];
								setFormState((prev) => ({
									...prev,
									opponentSeries: key || "",
								}));
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label={t("pages.record.form.opponentSeries")}
									required
								/>
							)}
						/>
					</Box>
					<TextField
						label={t("pages.record.form.matchName")}
						name="tournamentName"
						value={formState.tournamentName}
						onChange={(e) =>
							setFormState((prev) => ({
								...prev,
								tournamentName: e.target.value,
							}))
						}
					/>
					<TextField
						label={t("pages.record.form.notes")}
						name="notes"
						multiline
						minRows={2}
						value={formState.notes}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, notes: e.target.value }))
						}
					/>
					<TextField
						label={t("pages.record.form.resultLabel")}
						name="result"
						select
						required
						value={formState.result}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, result: e.target.value }))
						}>
						<MenuItem value="win">{t("pages.record.form.result.win")}</MenuItem>
						<MenuItem value="lose">
							{t("pages.record.form.result.lose")}
						</MenuItem>
						<MenuItem value="doubleLose">
							{t("pages.record.form.result.doubleLose")}
						</MenuItem>
					</TextField>
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							gap: 2,
							mb: 3,
						}}>
						<PrimaryButton
							type="submit"
							variant="contained"
							sx={{
								px: 4,
								py: 1.5,
								backgroundColor: "#a6ceb6",
								"&:hover": { backgroundColor: "#95bfa5" },
							}}>
							提交
						</PrimaryButton>
						<SecondaryButton
							type="button"
							variant="contained"
							onClick={() => setResetDialogOpen(true)}
							sx={{
								backgroundColor: "#760f10",
								color: "#fff",
								"&:hover": {
									backgroundColor: "#5a0c0d",
								},
								px: 4,
								py: 1.5,
							}}>
							重置
						</SecondaryButton>
					</Box>
				</Box>
			)}

			{tabValue === 1 && (
				<Box textAlign={"center"}>
					<Box
						sx={{
							display: "flex",
							flexDirection: { xs: "column", sm: "row" },
							justifyContent: "center",
							alignItems: "center",
							gap: 2,
							mb: 2,
							width: "100%",
							px: 1,
						}}>
						<LocalizationProvider dateAdapter={AdapterDateFns}>
							<DatePicker
								label={t("pages.record.form.startDate")}
								value={startDate}
								onChange={(newValue) => setStartDate(newValue)}
								slotProps={{
									textField: {
										id: "startDate",
										fullWidth: true,
										sx: { width: { xs: "100%", sm: "40%" } },
									},
								}}
							/>
							<DatePicker
								label={t("pages.record.form.endDate")}
								value={endDate}
								onChange={(newValue) => setEndDate(newValue)}
								slotProps={{
									textField: {
										id: "endDate",
										fullWidth: true,
										sx: { width: { xs: "100%", sm: "40%" } },
									},
								}}
							/>
						</LocalizationProvider>
						<SecondaryButton
							variant="outlined"
							sx={{
								width: { xs: "100%", sm: "20%" },
								whiteSpace: "nowrap",
							}}
							onClick={() => {
								setLoading(true);
								getHistory();
							}}>
							{t("pages.record.form.filterButton")}
						</SecondaryButton>
					</Box>
					<Box
						display="flex"
						justifyContent="center"
						flexDirection="column"
						alignItems="center">
						<FormControlLabel
							control={
								<Switch
									checked={showPlayerChart}
									onChange={(e) => setShowPlayerChart(e.target.checked)}
									sx={{
										"& .MuiSwitch-switchBase.Mui-checked": {
											color: "rgba(166, 206, 182, 1)",
										},
										"& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
											backgroundColor: "rgba(166, 206, 182, 1)",
										},
									}}
								/>
							}
							label={t("pages.record.charts.showMySeriesDistribution")}
						/>
						<FormControlLabel
							control={
								<Switch
									checked={showOpponentChart}
									onChange={(e) => setShowOpponentChart(e.target.checked)}
									sx={{
										"& .MuiSwitch-switchBase.Mui-checked": {
											color: "rgba(166, 206, 182, 1)",
										},
										"& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
											backgroundColor: "rgba(166, 206, 182, 1)",
										},
									}}
								/>
							}
							label={t("pages.record.charts.showOpponentSeriesDistribution")}
						/>
					</Box>
					<FormControlLabel
						control={
							<Switch
								checked={showWinRateTable}
								onChange={(e) => setShowWinRateTable(e.target.checked)}
								sx={{
									"& .MuiSwitch-switchBase.Mui-checked": {
										color: "rgba(166, 206, 182, 1)",
									},
									"& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
										backgroundColor: "rgba(166, 206, 182, 1)",
									},
								}}
							/>
						}
						label={t("pages.record.charts.showWinRateTable")}
						sx={{ mb: 2 }}
					/>
					<Dialog
						open={deleteDialogOpen}
						onClose={() => setDeleteDialogOpen(false)}>
						<DialogTitle>{t("pages.record.deleteDialog.title")}</DialogTitle>
						<DialogContent>
							<DialogContentText>
								{t("pages.record.deleteDialog.content")}
							</DialogContentText>
						</DialogContent>
						<DialogActions>
							<SecondaryButton onClick={() => setDeleteDialogOpen(false)}>
								{t("pages.record.deleteDialog.cancel")}
							</SecondaryButton>
							<DangerButton
								color="error"
								onClick={() => {
									console.log("将删除记录:", recordToDelete);
									deleteRecord();
									setDeleteDialogOpen(false);
								}}>
								{t("pages.record.deleteDialog.confirm")}
							</DangerButton>
						</DialogActions>
					</Dialog>
					{loading ? (
						<Box
							sx={{
								width: "100%",
								display: "flex",
								justifyContent: "center",
								mt: 2,
							}}>
							<CircularProgress />
						</Box>
					) : records.length === 0 ? (
						<Box
							sx={{
								textAlign: "center",
								py: 8,
								backgroundColor: "white",
								borderRadius: 2,
								boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
							}}>
							<Typography
								variant="h6"
								color="text.secondary"
								gutterBottom>
								{t("pages.record.display.noRecords")}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary">
								{t("pages.record.display.startFirst")}
							</Typography>
						</Box>
					) : (
						<Grid
							container
							spacing={2}
							sx={{ width: "100%" }}>
							{records.map((record) => (
								<Grid
									item
									xs={12}
									sx={{ width: "100%" }}
									key={record._id}>
									<Card
										sx={{
											display: "flex",
											flexDirection: "column",
											transition: "all 0.3s ease",
											boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
											"&:hover": {
												boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
												transform: "translateY(-2px)",
											},
											borderRadius: 2,
											background:
												"linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
											width: "100%",
										}}>
										{/* 卡片头部 - 比赛结果 */}
										<Box
											sx={{
												p: 1.5,
												backgroundColor:
													record.result === "win"
														? "#4caf50"
														: record.result === "lose"
														? "#f44336"
														: "#ff9800",
												color: "white",
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
											}}>
											<Box
												sx={{ display: "flex", alignItems: "center", gap: 1 }}>
												<TrophyIcon />
												<Typography
													variant="h6"
													fontWeight="bold">
													{record.result === "win"
														? t("pages.record.form.result.win")
														: record.result === "lose"
														? t("pages.record.form.result.lose")
														: t("pages.record.form.result.doubleLose")}
												</Typography>
											</Box>
											<Typography
												variant="caption"
												sx={{ opacity: 0.9 }}>
												{new Date(record.timestamp).toLocaleDateString()}
											</Typography>
										</Box>

										<CardContent sx={{ flexGrow: 1, p: 1.5 }}>
											{/* 比赛名称 */}
											{record.tournamentName && (
												<Box sx={{ mb: 1.5, textAlign: "center" }}>
													<Chip
														label={record.tournamentName}
														color="info"
														variant="filled"
														size="small"
														sx={{ fontWeight: "bold" }}
													/>
												</Box>
											)}

											{/* 玩家信息 */}
											<Box sx={{ mb: 1.5 }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 1,
														mb: 0.5,
													}}>
													<Avatar
														sx={{
															width: 20,
															height: 20,
															backgroundColor: "primary.main",
														}}>
														<PersonIcon sx={{ fontSize: 12 }} />
													</Avatar>
													<Typography
														variant="caption"
														color="text.secondary">
														{t("pages.record.display.myDeck")}
													</Typography>
												</Box>
												<Typography
													variant="body2"
													fontWeight="medium"
													sx={{ mb: 0.5 }}>
													{record.playerDeckName || "未知牌组"}
												</Typography>
												<Chip
													label={
														record.playerSeries ||
														t("pages.record.display.unknownSeries")
													}
													size="small"
													color="primary"
													variant="outlined"
												/>
											</Box>

											{/* VS 分隔符 */}
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													my: 1,
													position: "relative",
												}}>
												<Box
													sx={{
														width: "100%",
														height: 1,
														backgroundColor: "divider",
													}}
												/>
												<Typography
													variant="caption"
													sx={{
														position: "absolute",
														backgroundColor: "background.paper",
														px: 1,
														color: "text.secondary",
														fontWeight: "bold",
													}}>
													VS
												</Typography>
											</Box>

											{/* 对手信息 */}
											<Box sx={{ mb: 1.5 }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 1,
														mb: 0.5,
													}}>
													<Avatar
														sx={{
															width: 20,
															height: 20,
															backgroundColor: "secondary.main",
														}}>
														<DeckIcon sx={{ fontSize: 12 }} />
													</Avatar>
													<Typography
														variant="caption"
														color="text.secondary">
														{t("pages.record.display.opponentDeck")}
													</Typography>
												</Box>
												<Typography
													variant="body2"
													fontWeight="medium"
													sx={{ mb: 0.5 }}>
													{record.opponentDeckName || "未知牌组"}
												</Typography>
												<Chip
													label={
														record.opponentSeries ||
														t("pages.record.display.unknownSeries")
													}
													size="small"
													color="secondary"
													variant="outlined"
												/>
											</Box>

											{/* 备注信息 */}
											{record.notes && (
												<Box
													sx={{
														mt: 1.5,
														p: 1,
														backgroundColor: "grey.50",
														borderRadius: 1,
														border: "1px solid",
														borderColor: "grey.200",
													}}>
													<Typography
														variant="caption"
														display="block"
														color="text.secondary">
														<strong>
															{t("pages.record.display.notesLabel")}
														</strong>
														{record.notes}
													</Typography>
												</Box>
											)}
										</CardContent>

										<CardActions
											sx={{
												justifyContent: "space-between",
												p: 1.5,
												pt: 0,
												borderTop: "1px solid",
												borderColor: "divider",
											}}>
											<Typography
												variant="caption"
												color="text.secondary">
												{new Date(record.timestamp).toLocaleString()}
											</Typography>
											<Tooltip title={t("pages.record.display.deleteTooltip")}>
												<IconButton
													onClick={() => {
														setRecordToDelete(record);
														setDeleteDialogOpen(true);
													}}
													color="error"
													size="small"
													sx={{
														"&:hover": {
															backgroundColor: "error.light",
															color: "white",
														},
													}}>
													<DeleteIcon />
												</IconButton>
											</Tooltip>
										</CardActions>
									</Card>
								</Grid>
							))}
						</Grid>
					)}
				</Box>
			)}

			{/* 图表对话框 */}
			{/* 我方系列分布图对话框 */}
			<Dialog
				open={chartDialogOpen}
				onClose={() => setChartDialogOpen(false)}
				maxWidth="lg"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 3,
						minHeight: { xs: "auto", md: "650px" },
						maxHeight: { xs: "95vh", md: "90vh" },
					},
				}}>
				<DialogTitle
					sx={{
						textAlign: "center",
						background: "linear-gradient(135deg, #1b4332 0%, #2d5a42 100%)",
						color: "white",
						fontWeight: "bold",
						fontSize: "1.25rem",
					}}>
					我方系列分布图
				</DialogTitle>
				<DialogContent
					sx={{
						px: { xs: 2, sm: 4 },
						py: { xs: 2, sm: 4 },
						overflowX: "hidden",
						overflowY: { xs: "auto", md: "visible" },
						maxHeight: { xs: "75vh", md: "none" },
					}}>
					{activeChartType === "playerChart" &&
						seriesStats.length > 0 &&
						(() => {
							const { option, mobileChartHeight } = createEChartsOption(
								seriesStats,
								"我方系列分布"
							);
							const chartHeight = isMobile ? mobileChartHeight : 560;
							return (
								<Box
									sx={{
										width: "100%",
										boxSizing: "border-box",
									}}>
									<ReactECharts
										option={option}
										style={{ width: "100%", height: chartHeight }}
										theme="default"
									/>
								</Box>
							);
						})()}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setChartDialogOpen(false)}>关闭</Button>
				</DialogActions>
			</Dialog>

			{/* 对手系列分布图对话框 */}
			<Dialog
				open={opponentChartDialogOpen}
				onClose={() => setOpponentChartDialogOpen(false)}
				maxWidth="lg"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 3,
						minHeight: { xs: "auto", md: "650px" },
						maxHeight: { xs: "95vh", md: "90vh" },
					},
				}}>
				<DialogTitle
					sx={{
						textAlign: "center",
						background: "linear-gradient(135deg, #760f10 0%, #5c0f10 100%)",
						color: "white",
						fontWeight: "bold",
						fontSize: "1.25rem",
					}}>
					对手系列分布图
				</DialogTitle>
				<DialogContent
					sx={{
						px: { xs: 2, sm: 4 },
						py: { xs: 2, sm: 4 },
						overflowX: "hidden",
						overflowY: { xs: "auto", md: "visible" },
						maxHeight: { xs: "75vh", md: "none" },
					}}>
					{activeChartType === "opponentChart" &&
						opponentSeriesStats.length > 0 &&
						(() => {
							const { option, mobileChartHeight } = createEChartsOption(
								opponentSeriesStats,
								"对手系列分布"
							);
							const chartHeight = isMobile ? mobileChartHeight : 560;
							return (
								<Box
									sx={{
										width: "100%",
										boxSizing: "border-box",
									}}>
									<ReactECharts
										option={option}
										style={{ width: "100%", height: chartHeight }}
										theme="default"
									/>
								</Box>
							);
						})()}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpponentChartDialogOpen(false)}>
						关闭
					</Button>
				</DialogActions>
			</Dialog>

			{/* 胜率统计表格对话框 */}
			<Dialog
				open={tableDialogOpen}
				onClose={() => setTableDialogOpen(false)}
				maxWidth="lg"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 3,
						maxHeight: "90vh",
					},
				}}>
				<DialogTitle
					sx={{
						textAlign: "center",
						background: "linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%)",
						color: "white",
						fontWeight: "bold",
						fontSize: "1.25rem",
					}}>
					📊 详细胜率统计
				</DialogTitle>
				<DialogContent sx={{ p: 0 }}>
					{activeChartType === "winRateTable" && records.length > 0 && (
						<Box sx={{ p: 3, maxHeight: "70vh", overflowY: "auto" }}>
							{/* 综合数据概览 */}
							<Card
								elevation={4}
								sx={{ mb: 3, borderRadius: 2 }}>
								<CardContent sx={{ p: 3 }}>
									<Typography
										variant="h6"
										gutterBottom
										align="center"
										color="primary"
										fontWeight="bold">
										📊 综合数据概览
									</Typography>
									<Grid
										container
										spacing={2}>
										{(() => {
											const totalGames = records.length;
											const totalWins = records.filter(
												(r) => r.result === "win"
											).length;
											const totalLosses = records.filter(
												(r) => r.result === "lose"
											).length;
											const totalDraws = records.filter(
												(r) => r.result === "doubleLose"
											).length;
											const winRate =
												totalGames > 0
													? ((totalWins / totalGames) * 100).toFixed(1)
													: 0;

											const stats = [
												{
													label: "总对局数",
													value: totalGames,
													color: "#3f51b5",
													icon: "🎯",
												},
												{
													label: "胜场",
													value: totalWins,
													color: "#4caf50",
													icon: "🏆",
												},
												{
													label: "负场",
													value: totalLosses,
													color: "#f44336",
													icon: "💔",
												},
												{
													label: "平局",
													value: totalDraws,
													color: "#ff9800",
													icon: "🤝",
												},
												{
													label: "总胜率",
													value: `${winRate}%`,
													color:
														winRate >= 60
															? "#4caf50"
															: winRate >= 40
															? "#ff9800"
															: "#f44336",
													icon: "📈",
												},
											];

											return stats.map((stat, index) => (
												<Grid
													key={index}
													size={{ xs: 6, sm: 4, md: 2.4 }}>
													<Box
														sx={{
															p: 1.5,
															borderRadius: 2,
															textAlign: "center",
															border: `2px solid ${stat.color}20`,
															backgroundColor: `${stat.color}10`,
														}}>
														<Typography variant="h5">{stat.icon}</Typography>
														<Typography
															variant="h6"
															fontWeight="bold"
															color={stat.color}>
															{stat.value}
														</Typography>
														<Typography
															variant="caption"
															color="text.secondary">
															{stat.label}
														</Typography>
													</Box>
												</Grid>
											));
										})()}
									</Grid>
								</CardContent>
							</Card>

							{/* 对手卡组统计表格 */}
							<Card
								elevation={4}
								sx={{ mb: 3, borderRadius: 2 }}>
								<CardContent sx={{ p: 3 }}>
									<Typography
										variant="h6"
										gutterBottom
										align="center"
										color="warning.main"
										fontWeight="bold">
										🎯 对手卡组对战统计
									</Typography>
									<Box sx={{ overflowX: "auto" }}>
										<Box
											component="table"
											sx={{
												width: "100%",
												borderCollapse: "collapse",
												"& th": {
													backgroundColor: "#1b4332",
													color: "white",
													padding: "8px",
													fontWeight: "bold",
													fontSize: "0.85rem",
												},
												"& td": {
													padding: "8px",
													borderBottom: "1px solid #e0e0e0",
													fontSize: "0.8rem",
													textAlign: "center",
												},
											}}>
											<thead>
												<tr>
													<th>对手卡组</th>
													<th>对战次数</th>
													<th>胜</th>
													<th>负</th>
													<th>平</th>
													<th>胜率</th>
												</tr>
											</thead>
											<tbody>
												{Object.entries(
													records.reduce((acc, rec) => {
														const opponentKey = `${
															rec.opponentDeckName || "未知卡组"
														} [${rec.opponentSeries || "未知系列"}]`;
														if (!acc[opponentKey])
															acc[opponentKey] = {
																total: 0,
																wins: 0,
																losses: 0,
																draws: 0,
																deckName: rec.opponentDeckName || "未知卡组",
																series: rec.opponentSeries || "未知系列",
															};
														acc[opponentKey].total += 1;
														if (rec.result === "win")
															acc[opponentKey].wins += 1;
														if (rec.result === "lose")
															acc[opponentKey].losses += 1;
														if (rec.result === "doubleLose")
															acc[opponentKey].draws += 1;
														return acc;
													}, {})
												)
													.sort((a, b) => b[1].total - a[1].total)
													.map(([opponentKey, stats]) => {
														const winRate = (stats.wins / stats.total) * 100;
														return (
															<tr key={opponentKey}>
																<td>
																	<Box>
																		<Chip
																			label={stats.deckName}
																			size="small"
																			sx={{
																				backgroundColor: "#1b4332",
																				color: "white",
																				mb: 0.5,
																			}}
																		/>
																		<br />
																		<Chip
																			label={stats.series}
																			size="small"
																			variant="outlined"
																			sx={{
																				color: "#1b4332",
																				borderColor: "#1b4332",
																			}}
																		/>
																	</Box>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold">
																		{stats.total}
																	</Typography>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold"
																		color="#4caf50">
																		{stats.wins}
																	</Typography>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold"
																		color="#f44336">
																		{stats.losses}
																	</Typography>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold"
																		color="#ff9800">
																		{stats.draws}
																	</Typography>
																</td>
																<td>
																	<Chip
																		label={`${winRate.toFixed(1)}%`}
																		size="small"
																		sx={{
																			backgroundColor:
																				winRate >= 70
																					? "#4caf50"
																					: winRate >= 50
																					? "#ff9800"
																					: "#f44336",
																			color: "white",
																			fontWeight: "bold",
																		}}
																	/>
																</td>
															</tr>
														);
													})}
											</tbody>
										</Box>
									</Box>
								</CardContent>
							</Card>

							{/* 我方卡组统计表格 */}
							<Card
								elevation={4}
								sx={{ borderRadius: 2 }}>
								<CardContent sx={{ p: 3 }}>
									<Typography
										variant="h6"
										gutterBottom
										align="center"
										color="success.main"
										fontWeight="bold">
										🃏 我方卡组表现统计
									</Typography>
									<Box sx={{ overflowX: "auto" }}>
										<Box
											component="table"
											sx={{
												width: "100%",
												borderCollapse: "collapse",
												"& th": {
													backgroundColor: "#4caf50",
													color: "white",
													padding: "8px",
													fontWeight: "bold",
													fontSize: "0.85rem",
												},
												"& td": {
													padding: "8px",
													borderBottom: "1px solid #e0e0e0",
													fontSize: "0.8rem",
													textAlign: "center",
												},
											}}>
											<thead>
												<tr>
													<th>我方卡组</th>
													<th>使用次数</th>
													<th>胜</th>
													<th>负</th>
													<th>平</th>
													<th>胜率</th>
												</tr>
											</thead>
											<tbody>
												{Object.entries(
													records.reduce((acc, rec) => {
														const deckKey = `${
															rec.playerDeckName || "未知卡组"
														} [${rec.playerSeries || "未知系列"}]`;
														if (!acc[deckKey])
															acc[deckKey] = {
																total: 0,
																wins: 0,
																losses: 0,
																draws: 0,
																deckName: rec.playerDeckName || "未知卡组",
																series: rec.playerSeries || "未知系列",
															};
														acc[deckKey].total += 1;
														if (rec.result === "win") acc[deckKey].wins += 1;
														if (rec.result === "lose") acc[deckKey].losses += 1;
														if (rec.result === "doubleLose")
															acc[deckKey].draws += 1;
														return acc;
													}, {})
												)
													.sort((a, b) => b[1].total - a[1].total)
													.map(([deckKey, stats]) => {
														const winRate = (stats.wins / stats.total) * 100;
														return (
															<tr key={deckKey}>
																<td>
																	<Box>
																		<Chip
																			label={stats.deckName}
																			size="small"
																			sx={{
																				backgroundColor: "#4caf50",
																				color: "white",
																				mb: 0.5,
																			}}
																		/>
																		<br />
																		<Chip
																			label={stats.series}
																			size="small"
																			variant="outlined"
																			sx={{
																				color: "#4caf50",
																				borderColor: "#4caf50",
																			}}
																		/>
																	</Box>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold">
																		{stats.total}
																	</Typography>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold"
																		color="#4caf50">
																		{stats.wins}
																	</Typography>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold"
																		color="#f44336">
																		{stats.losses}
																	</Typography>
																</td>
																<td>
																	<Typography
																		variant="body2"
																		fontWeight="bold"
																		color="#ff9800">
																		{stats.draws}
																	</Typography>
																</td>
																<td>
																	<Chip
																		label={`${winRate.toFixed(1)}%`}
																		size="small"
																		sx={{
																			backgroundColor:
																				winRate >= 60
																					? "#4caf50"
																					: winRate >= 40
																					? "#ff9800"
																					: "#f44336",
																			color: "white",
																			fontWeight: "bold",
																		}}
																	/>
																</td>
															</tr>
														);
													})}
											</tbody>
										</Box>
									</Box>
								</CardContent>
							</Card>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setTableDialogOpen(false)}>关闭</Button>
				</DialogActions>
			</Dialog>

			{/* Reset Confirmation Dialog */}
			<Dialog
				open={resetDialogOpen}
				onClose={() => setResetDialogOpen(false)}>
				<DialogTitle>确认重置</DialogTitle>
				<DialogContent>
					<DialogContentText>
						您确定要重置表单吗？所有已填写的内容将会被清空。
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<SecondaryButton onClick={() => setResetDialogOpen(false)}>
						取消
					</SecondaryButton>
					<DangerButton
						color="error"
						onClick={resetForm}>
						确认重置
					</DangerButton>
				</DialogActions>
			</Dialog>

			{/* 浮动按钮 - 仅在历史记录标签页显示 */}
			{tabValue === 1 && records.length > 0 && (
				<>
					<Fab
						color="primary"
						aria-label="display options"
						onClick={handleFabMenuOpen}
						sx={{
							position: "fixed",
							bottom: 24,
							left: 24,
							zIndex: 1000,
							background: "linear-gradient(135deg, #1b4332 0%, #2d5a42 100%)",
							"&:hover": {
								background: "linear-gradient(135deg, #2d5a42 0%, #40916c 100%)",
								transform: "scale(1.1)",
							},
							transition: "all 0.3s ease-in-out",
							boxShadow: "0 4px 16px rgba(27, 67, 50, 0.3)",
						}}>
						<SettingsIcon />
					</Fab>

					{/* 浮动按钮菜单 */}
					<Menu
						anchorEl={fabMenuAnchor}
						open={fabMenuOpen}
						onClose={handleFabMenuClose}
						anchorOrigin={{
							vertical: "top",
							horizontal: "right",
						}}
						transformOrigin={{
							vertical: "bottom",
							horizontal: "left",
						}}
						sx={{
							"& .MuiPaper-root": {
								borderRadius: 2,
								minWidth: 200,
								boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
								border: "1px solid rgba(27, 67, 50, 0.1)",
							},
						}}>
						<MenuItemMui
							onClick={() => toggleDisplayOption("playerChart")}
							sx={{
								py: 1.5,
								"&:hover": {
									backgroundColor: "rgba(27, 67, 50, 0.08)",
								},
							}}>
							<ListItemIcon>
								<ChartIcon color="primary" />
							</ListItemIcon>
							<ListItemText>我方系列分布图</ListItemText>
						</MenuItemMui>

						<MenuItemMui
							onClick={() => toggleDisplayOption("opponentChart")}
							sx={{
								py: 1.5,
								"&:hover": {
									backgroundColor: "rgba(27, 67, 50, 0.08)",
								},
							}}>
							<ListItemIcon>
								<ChartIcon color="secondary" />
							</ListItemIcon>
							<ListItemText>对手系列分布图</ListItemText>
						</MenuItemMui>

						<MenuItemMui
							onClick={() => toggleDisplayOption("winRateTable")}
							sx={{
								py: 1.5,
								"&:hover": {
									backgroundColor: "rgba(27, 67, 50, 0.08)",
								},
							}}>
							<ListItemIcon>
								<TableIcon color="info" />
							</ListItemIcon>
							<ListItemText>胜率统计表格</ListItemText>
						</MenuItemMui>
					</Menu>
				</>
			)}
		</Box>
	);
};

export default Record;
