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
} from "@mui/material";
import {
	Delete as DeleteIcon,
	EmojiEvents as TrophyIcon,
	Person as PersonIcon,
	Casino as DeckIcon,
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
import { Pie } from "react-chartjs-2";
import {
	Chart as ChartJS,
	ArcElement,
	Tooltip as ChartTooltip,
	Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels);

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
	const [startDate, setStartDate] = useState(null);
	const [endDate, setEndDate] = useState(null);
	const [seriesStats, setSeriesStats] = useState([]);
	const [opponentSeriesStats, setOpponentSeriesStats] = useState([]);
	const [showPlayerChart, setShowPlayerChart] = useState(false);
	const [showOpponentChart, setShowOpponentChart] = useState(false);
	const [showWinRateTable, setShowWinRateTable] = useState(false);

	const generateColors = (count) => {
		if (count === 1) return [interpolateSpectral(0.5)];
		return Array.from({ length: count }, (_, i) =>
			interpolateSpectral(i / (count - 1))
		);
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
			const statsArray = Object.entries(countMap).map(([name, value]) => ({
				name,
				value,
			}));
			setSeriesStats(statsArray);

			const opponentMap = {};
			filtered.forEach((rec) => {
				const key = rec.opponentSeries || "未知";
				opponentMap[key] = (opponentMap[key] || 0) + 1;
			});
			const opponentStatsArray = Object.entries(opponentMap).map(
				([name, value]) => ({
					name,
					value,
				})
			);
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
				<Box sx={{ display: "flex", justifyContent: "center" }}>
					<Tabs
						value={tabValue}
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
					<PrimaryButton
						type="submit"
						variant="contained"
						sx={{
							px: 6,
							py: 1.5,
							backgroundColor: "#a6ceb6",
							"&:hover": { backgroundColor: "#95bfa5" },
						}}>
						提交记录
					</PrimaryButton>
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
						}}>
						<LocalizationProvider dateAdapter={AdapterDateFns}>
							<DatePicker
								label={t("pages.record.form.startDate")}
								value={startDate}
								onChange={(newValue) => setStartDate(newValue)}
								slotProps={{ textField: { id: "startDate", fullWidth: true } }}
							/>
							<DatePicker
								label={t("pages.record.form.endDate")}
								value={endDate}
								onChange={(newValue) => setEndDate(newValue)}
								slotProps={{ textField: { id: "endDate", fullWidth: true } }}
							/>
						</LocalizationProvider>
						<SecondaryButton
							variant="outlined"
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
					{(seriesStats.length > 0 || opponentSeriesStats.length > 0) && (
						<Box
							display="flex"
							flexDirection="column"
							gap={4}
							mb={4}>
							{showPlayerChart &&
								seriesStats.length > 0 &&
								(() => {
									const playerColors = generateColors(seriesStats.length);
									return (
										<Box
											sx={{
												width: "100%",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
											}}>
											<Typography
												align="center"
												sx={{ mt: 1 }}
												variant="h6">
												我方系列分布
											</Typography>
											<Box sx={{ width: "100%", height: "40vh" }}>
												<Pie
													data={{
														labels: seriesStats.map((s) => s.name),
														datasets: [
															{
																data: seriesStats.map((s) => s.value),
																backgroundColor: playerColors,
															},
														],
													}}
													options={{
														responsive: true,
														maintainAspectRatio: false,
														plugins: {
															legend: { display: false },
															datalabels: {
																color: "#fff",
																font: {
																	weight: "bold",
																},
																formatter: (value) => {
																	return value;
																},
															},
														},
													}}
												/>
											</Box>
											<Box
												display="flex"
												justifyContent="center"
												flexWrap="wrap"
												mt={1}>
												{seriesStats.map((s, i) => (
													<Box
														key={s.name}
														display="flex"
														alignItems="center"
														mx={1}
														mb={0.5}>
														<Box
															sx={{
																width: 16,
																height: 16,
																backgroundColor: playerColors[i],
																borderRadius: "50%",
																mr: 1,
																border: "1px solid #ccc",
															}}
														/>
														<Typography variant="body2">{s.name}</Typography>
													</Box>
												))}
											</Box>
										</Box>
									);
								})()}
							{showOpponentChart &&
								opponentSeriesStats.length > 0 &&
								(() => {
									const opponentColors = generateColors(
										opponentSeriesStats.length
									);
									return (
										<Box
											sx={{
												width: "100%",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
											}}>
											<Typography
												align="center"
												sx={{ mt: 1 }}
												variant="h6">
												对手系列分布
											</Typography>
											<Box sx={{ width: "100%", height: "40vh" }}>
												<Pie
													data={{
														labels: opponentSeriesStats.map((s) => s.name),
														datasets: [
															{
																data: opponentSeriesStats.map((s) => s.value),
																backgroundColor: opponentColors,
															},
														],
													}}
													options={{
														responsive: true,
														maintainAspectRatio: false,
														plugins: {
															legend: { display: false },
															datalabels: {
																color: "#fff",
																font: {
																	weight: "bold",
																},
																formatter: (value) => {
																	return value;
																},
															},
														},
													}}
												/>
											</Box>
											<Box
												display="flex"
												justifyContent="center"
												flexWrap="wrap"
												mt={1}>
												{opponentSeriesStats.map((s, i) => (
													<Box
														key={s.name}
														display="flex"
														alignItems="center"
														mx={1}
														mb={0.5}>
														<Box
															sx={{
																width: 16,
																height: 16,
																backgroundColor: opponentColors[i],
																borderRadius: "50%",
																mr: 1,
																border: "1px solid #ccc",
															}}
														/>
														<Typography variant="body2">{s.name}</Typography>
													</Box>
												))}
											</Box>
										</Box>
									);
								})()}
						</Box>
					)}
					{showWinRateTable && records.length > 0 && (
						<Box sx={{ m: 4 }}>
							<Typography
								variant="h6"
								gutterBottom
								align="center">
								各敌人系列胜率统计
							</Typography>
							<Box
								component="table"
								sx={{
									width: "100%",
									borderCollapse: "collapse",
									textAlign: "center",
									mt: 1,
									"& th, & td": {
										border: "1px solid #ddd",
										padding: "8px",
									},
									"& th": {
										backgroundColor: "#f2f2f2",
									},
								}}>
								<thead>
									<tr>
										<th>对手系列</th>
										<th>对战次数</th>
										<th>胜场</th>
										<th>胜率</th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(
										records.reduce((acc, rec) => {
											const key = rec.opponentSeries || "未知";
											if (!acc[key]) acc[key] = { total: 0, wins: 0 };
											acc[key].total += 1;
											if (rec.result === "win") acc[key].wins += 1;
											return acc;
										}, {})
									)
										.sort((a, b) => b[1].total - a[1].total)
										.map(([series, stats]) => (
											<tr key={series}>
												<td>{series}</td>
												<td>{stats.total}</td>
												<td>{stats.wins}</td>
												<td>
													{((stats.wins / stats.total) * 100).toFixed(1)}%
												</td>
											</tr>
										))}
								</tbody>
							</Box>
						</Box>
					)}
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
		</Box>
	);
};

export default Record;
