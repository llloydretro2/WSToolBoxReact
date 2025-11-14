import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
	interpolateSpectral,
	interpolateRainbow,
	interpolateViridis,
} from "d3-scale-chromatic";
import { apiRequest } from "../utils/api.js";
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
} from "@mui/material";
import {
	Delete as DeleteIcon,
	EmojiEvents as TrophyIcon,
	Person as PersonIcon,
	Casino as DeckIcon,
	Settings as SettingsIcon,
	TableChart as TableIcon,
	Visibility as VisibilityIcon,
	VisibilityOff as VisibilityOffIcon,
	Analytics as AnalyticsIcon,
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
import Chart from "react-apexcharts";

// 本地后端测试地址
// http://localhost:4000/api/cards?${params}

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

const Record = () => {
	const { t } = useLocale();

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

	// 浮动按钮菜单状态
	const [fabMenuAnchor, setFabMenuAnchor] = useState(null);
	const fabMenuOpen = Boolean(fabMenuAnchor);

	// 对话框状态
	const [playerChartDialogOpen, setPlayerChartDialogOpen] = useState(false);
	const [opponentChartDialogOpen, setOpponentChartDialogOpen] = useState(false);
	const [battleStatsDialogOpen, setBattleStatsDialogOpen] = useState(false);
	const [seriesStats, setSeriesStats] = useState([]);
	const [opponentSeriesStats, setOpponentSeriesStats] = useState([]);

	const totalMatches = records.length;

	const wins = useMemo(
		() => records.filter((record) => record.result === "win").length,
		[records]
	);
	const losses = useMemo(
		() => records.filter((record) => record.result === "lose").length,
		[records]
	);
	const draws = useMemo(
		() => records.filter((record) => record.result === "doubleLose").length,
		[records]
	);
	const winRate = totalMatches
		? ((wins / totalMatches) * 100).toFixed(1)
		: "0.0";

	const playerSeriesSummary = useMemo(() => {
		const noDataLabel = t("record.stats.noData");
		const unknownSeriesLabel = t("record.display.unknownSeries");

		if (!records.length) {
			return {
				counts: {},
				topSeries: noDataLabel,
				topCount: 0,
				totalSeries: 0,
			};
		}

		const counts = records.reduce((acc, rec) => {
			const key = rec.playerSeries || unknownSeriesLabel;
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});

		const [topSeries, topCount] = Object.entries(counts).sort(
			(a, b) => b[1] - a[1]
		)[0] || [noDataLabel, 0];

		return {
			counts,
			topSeries,
			topCount,
			totalSeries: Object.keys(counts).length,
		};
	}, [records, t]);

	const opponentSeriesSummary = useMemo(() => {
		const noDataLabel = t("record.stats.noData");
		const unknownSeriesLabel = t("record.display.unknownSeries");

		if (!records.length) {
			return {
				counts: {},
				topSeries: noDataLabel,
				topCount: 0,
				totalSeries: 0,
			};
		}

		const counts = records.reduce((acc, rec) => {
			const key = rec.opponentSeries || unknownSeriesLabel;
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});

		const [topSeries, topCount] = Object.entries(counts).sort(
			(a, b) => b[1] - a[1]
		)[0] || [noDataLabel, 0];

		return {
			counts,
			topSeries,
			topCount,
			totalSeries: Object.keys(counts).length,
		};
	}, [records, t]);

	const basicStatsLines = useMemo(
		() => [
			t("record.stats.totalMatches", { count: totalMatches }),
			t("record.stats.wins", { count: wins }),
			t("record.stats.losses", { count: losses }),
			t("record.stats.draws", { count: draws }),
			totalMatches
				? t("record.stats.winRateDetailed", {
						percentage: winRate,
						wins,
						losses,
						draws,
				  })
				: t("record.stats.winRateEmpty"),
		],
		[totalMatches, wins, losses, draws, winRate, t]
	);

	const playerSeriesLines = useMemo(
		() => [
			playerSeriesSummary.topCount > 0
				? t("record.stats.playerTop", {
						series: playerSeriesSummary.topSeries,
						count: playerSeriesSummary.topCount,
				  })
				: t("record.stats.playerTopEmpty"),
			playerSeriesSummary.totalSeries > 0
				? t("record.stats.playerTotal", {
						count: playerSeriesSummary.totalSeries,
				  })
				: t("record.stats.playerTotalEmpty"),
		],
		[playerSeriesSummary, t]
	);

	const opponentSeriesLines = useMemo(
		() => [
			opponentSeriesSummary.topCount > 0
				? t("record.stats.opponentTop", {
						series: opponentSeriesSummary.topSeries,
						count: opponentSeriesSummary.topCount,
				  })
				: t("record.stats.opponentTopEmpty"),
			opponentSeriesSummary.totalSeries > 0
				? t("record.stats.opponentTotal", {
						count: opponentSeriesSummary.totalSeries,
				  })
				: t("record.stats.opponentTotalEmpty"),
		],
		[opponentSeriesSummary, t]
	);

	const StatSection = ({ title, lines }) => (
		<Box
			sx={{
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 2,
				p: 2,
				mb: 3,
				backgroundColor: "background.paper",
			}}>
			<Typography
				variant="subtitle1"
				fontWeight="bold"
				sx={{ mb: 1 }}>
				{title}
			</Typography>
			<Box
				component="ul"
				sx={{ pl: 2.5, m: 0 }}>
				{lines.map((line, index) => (
					<Typography
						component="li"
						variant="body2"
						sx={{ lineHeight: 1.7 }}
						key={`${title}-${index}`}>
						{line}
					</Typography>
				))}
			</Box>
		</Box>
	);

	StatSection.propTypes = {
		title: PropTypes.string.isRequired,
		lines: PropTypes.array.isRequired,
	};

	// 生成饼图颜色 - 使用d3颜色方案
	const generateColors = (count) => {
		if (count <= 1) return ["#8884d8"];

		// 方案1: 彩虹色方案 - 适合大量数据
		if (count > 20) {
			return Array.from({ length: count }, (_, i) =>
				interpolateRainbow(i / Math.max(count - 1, 1))
			);
		}

		// 方案2: 光谱色方案 - 适合中等数量数据
		if (count > 10) {
			return Array.from({ length: count }, (_, i) =>
				interpolateSpectral(i / Math.max(count - 1, 1))
			);
		}

		// 方案3: Viridis色方案 - 适合少量数据
		if (count > 5) {
			return Array.from({ length: count }, (_, i) =>
				interpolateViridis(i / Math.max(count - 1, 1))
			);
		}

		// 方案4: 预定义基础颜色 - 适合少量数据
		const baseColors = [
			"#8884d8",
			"#82ca9d",
			"#ffc658",
			"#ff7300",
			"#8dd1e1",
			"#d084d0",
			"#ff8042",
			"#00C49F",
			"#FFBB28",
			"#FF6B6B",
			"#4ECDC4",
			"#45B7D1",
			"#96CEB4",
			"#FFEAA7",
			"#DDA0DD",
			"#98D8C8",
			"#F7DC6F",
			"#BB8FCE",
			"#85C1E9",
			"#F8C471",
		];
		return baseColors.slice(0, count);
	};

	// 准备ApexCharts配置
	const prepareChartOptions = (data, _title) => {
		const total = data.reduce((sum, item) => sum + item.value, 0);

		return {
			chart: {
				type: "pie",
				toolbar: {
					show: false,
				},
			},
			labels: data.map((item) => item.name),
			colors: generateColors(data.length),
			responsive: [
				{
					breakpoint: 768,
					options: {
						chart: {
							width: 400,
						},
						legend: {
							position: "bottom",
						},
					},
				},
				{
					breakpoint: 480,
					options: {
						chart: {
							width: 300,
						},
						legend: {
							position: "bottom",
						},
					},
				},
			],
			legend: {
				position: "bottom",
				formatter: function (seriesName, opts) {
					const value = data[opts.seriesIndex].value;
					const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
					return t("record.charts.legendFull", {
						series: seriesName,
						count: value,
						percentage,
					});
				},
			},
			tooltip: {
				y: {
					formatter: function (value, { seriesIndex: _seriesIndex }) {
						const percentage =
							total > 0 ? ((value / total) * 100).toFixed(1) : 0;
						return t("record.charts.legendShort", {
							count: value,
							percentage,
						});
					},
				},
			},
			dataLabels: {
				enabled: true,
				formatter: function (val, opts) {
					const value = data[opts.seriesIndex].value;
					return value.toString();
				},
			},
			plotOptions: {
				pie: {
					donut: {
						labels: {
							show: false,
						},
					},
				},
			},
		};
	};

	// 准备图表数据
	const prepareChartSeries = (data) => {
		return data.map((item) => item.value);
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

	// 切换显示选项
	const toggleDisplayOption = (option) => {
		handleFabMenuClose();
		switch (option) {
			case "playerChart":
				setPlayerChartDialogOpen(true);
				break;
			case "opponentChart":
				setOpponentChartDialogOpen(true);
				break;
			case "battleStats":
				setBattleStatsDialogOpen(true);
				break;
			default:
				break;
		}
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
			console.error("Failed to delete record:", err);
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
			const unknownSeriesLabel = t("record.display.unknownSeries");
			filtered.forEach((rec) => {
				const key = rec.playerSeries || unknownSeriesLabel;
				countMap[key] = (countMap[key] || 0) + 1;
			});
			const statsArray = Object.entries(countMap)
				.map(([name, value]) => ({
					name,
					value,
				}))
				.sort((a, b) => b.value - a.value);
			setSeriesStats(statsArray);

			// 敌方系列统计
			const opponentMap = {};
			filtered.forEach((rec) => {
				const key = rec.opponentSeries || unknownSeriesLabel;
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
				color="var(--text)"
				gutterBottom>
				{t("record.title")}
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
					}}
					sx={{
						"& .MuiTab-root": {
							color: "text.secondary",
						},
						"& .MuiTab-root.Mui-selected": {
							color: "var(--primary)",
						},
						"& .MuiTabs-indicator": {
							backgroundColor: "var(--primary)",
						},
					}}>
					<Tab label={t("record.tabs.create")} />
					<Tab label={t("record.tabs.query")} />
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
							setLoading(true);
							getHistory();
						} catch (err) {
							console.error("Failed to submit record:", err);
						}
					}}
					sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 2,
							backgroundColor: "var(--card-background)",
							borderRadius: 2,
							p: 2,
						}}>
						<Typography
							variant="subtitle2"
							sx={{ fontWeight: 600 }}>
							{t("record.form.myInfo")}
						</Typography>
						<TextField
							required
							label={t("record.form.myDeckName")}
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
									label={t("record.form.mySeries")}
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
							backgroundColor: "var(--card-background)",
							borderRadius: 2,
							p: 2,
						}}>
						<Typography
							variant="subtitle2"
							sx={{ fontWeight: 600 }}>
							{t("record.form.opponentInfo")}
						</Typography>
						<TextField
							required
							label={t("record.form.opponentDeckName")}
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
									label={t("record.form.opponentSeries")}
									required
								/>
							)}
						/>
					</Box>
					<TextField
						label={t("record.form.matchName")}
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
						label={t("record.form.notes")}
						name="notes"
						multiline
						minRows={2}
						value={formState.notes}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, notes: e.target.value }))
						}
					/>
					<TextField
						label={t("record.form.resultLabel")}
						name="result"
						select
						required
						value={formState.result}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, result: e.target.value }))
						}>
						<MenuItem value="win">{t("record.form.result.win")}</MenuItem>
						<MenuItem value="lose">{t("record.form.result.lose")}</MenuItem>
						<MenuItem value="doubleLose">
							{t("record.form.result.doubleLose")}
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
							}}>
							{t("record.form.submitButton")}
						</PrimaryButton>
						<DangerButton
							type="button"
							variant="contained"
							onClick={() => setResetDialogOpen(true)}
							sx={{
								px: 4,
								py: 1.5,
							}}>
							{t("record.form.resetButton")}
						</DangerButton>
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
								label={t("record.form.startDate")}
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
								label={t("record.form.endDate")}
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
						<PrimaryButton
							variant="contained"
							sx={{
								width: { xs: "100%", sm: "20%" },
								whiteSpace: "nowrap",
							}}
							onClick={() => {
								setLoading(true);
								getHistory();
							}}>
							{t("record.form.filterButton")}
						</PrimaryButton>
					</Box>

					<Dialog
						open={deleteDialogOpen}
						onClose={() => setDeleteDialogOpen(false)}>
						<DialogTitle>{t("record.deleteDialog.title")}</DialogTitle>
						<DialogContent>
							<DialogContentText>
								{t("record.deleteDialog.content")}
							</DialogContentText>
						</DialogContent>
						<DialogActions>
							<SecondaryButton onClick={() => setDeleteDialogOpen(false)}>
								{t("record.deleteDialog.cancel")}
							</SecondaryButton>
							<DangerButton
								color="error"
								onClick={() => {
									console.log("Preparing to delete record:", recordToDelete);
									deleteRecord();
									setDeleteDialogOpen(false);
								}}>
								{t("record.deleteDialog.confirm")}
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
								backgroundColor: "var(--surface)",
								borderRadius: 2,
								boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
							}}>
							<Typography
								variant="h6"
								color="text.secondary"
								gutterBottom>
								{t("record.display.noRecords")}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary">
								{t("record.display.startFirst")}
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
														? "var(--success)"
														: record.result === "lose"
														? "var(--error)"
														: "var(--warning)",
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
														? t("record.form.result.win")
														: record.result === "lose"
														? t("record.form.result.lose")
														: t("record.form.result.doubleLose")}
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
													<Typography
														variant="caption"
														color="text.secondary">
														{t("record.display.myDeck")}
													</Typography>
												</Box>
												<Typography
													variant="body2"
													fontWeight="medium"
													sx={{ mb: 0.5 }}>
													{record.playerDeckName ||
														t("record.display.unknownDeck")}
												</Typography>
												<Chip
													label={
														record.playerSeries ||
														t("record.display.unknownSeries")
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
													<Typography
														variant="caption"
														color="text.secondary">
														{t("record.display.opponentDeck")}
													</Typography>
												</Box>
												<Typography
													variant="body2"
													fontWeight="medium"
													sx={{ mb: 0.5 }}>
													{record.opponentDeckName ||
														t("record.display.unknownDeck")}
												</Typography>
												<Chip
													label={
														record.opponentSeries ||
														t("record.display.unknownSeries")
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
														<strong>{t("record.display.notesLabel")}</strong>
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
											<Tooltip title={t("record.display.deleteTooltip")}>
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

			{/* 我方系列分布对话框 */}
			<Dialog
				open={playerChartDialogOpen}
				onClose={() => setPlayerChartDialogOpen(false)}
				maxWidth="md"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 3,
						maxHeight: "80vh",
						minHeight: "500px",
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
					{t("record.charts.playerDialogTitle")}
				</DialogTitle>
				<DialogContent
					sx={{
						px: { xs: 2, sm: 3 },
						py: { xs: 2, sm: 3 },
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
					}}>
					{seriesStats.length > 0 ? (
						<Box
							sx={{
								width: "100%",
								maxWidth: "600px",
								margin: "0 auto",
								textAlign: "center",
							}}>
							<Box
								id="player-chart-container"
								sx={{
									width: "100%",
									height: "350px",
								}}>
								<Chart
									options={prepareChartOptions(
										seriesStats,
										t("record.charts.playerDialogTitle")
									)}
									series={prepareChartSeries(seriesStats)}
									type="pie"
									height="100%"
								/>
							</Box>
						</Box>
					) : (
						<Typography
							variant="body1"
							align="center"
							color="text.secondary">
							{t("record.charts.noData")}
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPlayerChartDialogOpen(false)}>
						{t("record.stats.close")}
					</Button>
				</DialogActions>
			</Dialog>

			{/* 敌方系列分布对话框 */}
			<Dialog
				open={opponentChartDialogOpen}
				onClose={() => setOpponentChartDialogOpen(false)}
				maxWidth="md"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 3,
						maxHeight: "80vh",
						minHeight: "500px",
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
					{t("record.charts.opponentDialogTitle")}
				</DialogTitle>
				<DialogContent
					sx={{
						px: { xs: 2, sm: 3 },
						py: { xs: 2, sm: 3 },
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
					}}>
					{opponentSeriesStats.length > 0 ? (
						<Box
							sx={{
								width: "100%",
								maxWidth: "600px",
								margin: "0 auto",
								textAlign: "center",
							}}>
							<Box
								id="opponent-chart-container"
								sx={{
									width: "100%",
									height: "350px",
								}}>
								<Chart
									options={prepareChartOptions(
										opponentSeriesStats,
										t("record.charts.opponentDialogTitle")
									)}
									series={prepareChartSeries(opponentSeriesStats)}
									type="pie"
									height="100%"
								/>
							</Box>
						</Box>
					) : (
						<Typography
							variant="body1"
							align="center"
							color="text.secondary">
							{t("record.charts.noData")}
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpponentChartDialogOpen(false)}>
						{t("record.stats.close")}
					</Button>
				</DialogActions>
			</Dialog>

			{/* 对战数据统计对话框 */}
			<Dialog
				open={battleStatsDialogOpen}
				onClose={() => setBattleStatsDialogOpen(false)}
				maxWidth="lg"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 3,
						background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
					},
				}}>
				<DialogTitle
					sx={{
						textAlign: "center",
						background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
						color: "white",
						fontWeight: "bold",
						fontSize: "1.5rem",
						py: 3,
						boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
					}}>
					{t("record.stats.dialogTitle")}
				</DialogTitle>
				<DialogContent
					sx={{
						px: { xs: 2, sm: 4 },
						py: { xs: 3, sm: 4 },
						overflow: "auto",
						maxHeight: "75vh",
					}}>
					{records.length > 0 ? (
						<Box sx={{ width: "100%", mt: 2 }}>
							<StatSection
								title={t("record.stats.basicSection")}
								lines={basicStatsLines}
							/>
							<StatSection
								title={t("record.stats.playerSection")}
								lines={playerSeriesLines}
							/>
							<StatSection
								title={t("record.stats.opponentSection")}
								lines={opponentSeriesLines}
							/>
						</Box>
					) : (
						<Box sx={{ textAlign: "center", py: 8 }}>
							<Box
								sx={{
									width: 80,
									height: 80,
									borderRadius: "50%",
									background:
										"linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									margin: "0 auto 16px",
									fontSize: "2rem",
								}}>
								📊
							</Box>
							<Typography
								variant="h6"
								color="text.secondary"
								gutterBottom>
								{t("record.stats.emptyStateTitle")}
							</Typography>
							<Typography
								variant="body2"
								color="text.secondary">
								{t("record.stats.emptyStateSubtitle")}
							</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 3 }}>
					<Button
						variant="contained"
						onClick={() => setBattleStatsDialogOpen(false)}
						sx={{
							background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
							borderRadius: 2,
							px: 4,
							py: 1,
							fontWeight: "bold",
							boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
							"&:hover": {
								boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
								transform: "translateY(-1px)",
							},
							transition: "all 0.3s ease",
						}}>
						{t("record.stats.close")}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Reset Confirmation Dialog */}
			<Dialog
				open={resetDialogOpen}
				onClose={() => setResetDialogOpen(false)}>
				<DialogTitle>{t("record.resetDialog.title")}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{t("record.resetDialog.content")}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<SecondaryButton onClick={() => setResetDialogOpen(false)}>
						{t("record.resetDialog.cancel")}
					</SecondaryButton>
					<DangerButton
						color="error"
						onClick={resetForm}>
						{t("record.resetDialog.confirm")}
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
						<AnalyticsIcon />
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
							<ListItemText>
								{t("record.charts.showMySeriesDistribution")}
							</ListItemText>
						</MenuItemMui>

						<MenuItemMui
							onClick={() => toggleDisplayOption("opponentChart")}
							sx={{
								py: 1.5,
								"&:hover": {
									backgroundColor: "rgba(27, 67, 50, 0.08)",
								},
							}}>
							<ListItemText>
								{t("record.charts.showOpponentSeriesDistribution")}
							</ListItemText>
						</MenuItemMui>

						<MenuItemMui
							onClick={() => toggleDisplayOption("battleStats")}
							sx={{
								py: 1.5,
								"&:hover": {
									backgroundColor: "rgba(27, 67, 50, 0.08)",
								},
							}}>
							<ListItemText>{t("record.stats.menuItem")}</ListItemText>
						</MenuItemMui>
					</Menu>
				</>
			)}
		</Box>
	);
};

export default Record;
