import React, { useState } from "react";
import { interpolateSpectral } from "d3-scale-chromatic";
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
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

// 本地后端测试地址
// http://localhost:4000/api/cards?${params}

const BACKEND_URL = "http://38.244.14.142:4000";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

const Record = () => {
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

	const token = localStorage.getItem("token");

	const deleteRecord = () => {
		if (!recordToDelete) return;
		fetch(`${BACKEND_URL}/api/matches/delete/${recordToDelete._id}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("删除失败");
				setRecords((prev) =>
					prev.filter((record) => record._id !== recordToDelete._id)
				);
				setRecordToDelete(null);
				getHistory();
			})
			.catch((err) => console.error("删除出错:", err));
	};

	const getHistory = () => {
		fetch(`${BACKEND_URL}/api/matches/history`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("Network response was not ok");
				return res.json();
			})
			.then((data) => {
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
			})
			.catch((err) => {
				console.error("Error fetching match records:", err);
			})
			.finally(() => {
				setLoading(false);
			});
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
						<Tab label="创建记录" />
						<Tab label="查询记录" />
					</Tabs>
				</Box>
			</Box>

			{tabValue === 0 && (
				<Box
					component="form"
					onSubmit={(e) => {
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
						fetch(`${BACKEND_URL}/api/matches/create`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${token}`,
							},
							body: JSON.stringify(data),
						})
							.then((res) => {
								if (!res.ok) throw new Error("提交失败");
								return res.json();
							})
							.then((newRecord) => {
								setRecords((prev) => [newRecord, ...prev]);
								setTabValue(1);
							})
							.catch((err) => console.error("提交出错:", err));
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
							我方信息
						</Typography>
						<TextField
							required
							label="我方卡组名称"
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
									label="我方系列"
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
							对手信息
						</Typography>
						<TextField
							required
							label="对方卡组名称"
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
									label="对手系列"
									required
								/>
							)}
						/>
					</Box>
					<TextField
						label="比赛名（可选）"
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
						label="备注（可选）"
						name="notes"
						multiline
						minRows={2}
						value={formState.notes}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, notes: e.target.value }))
						}
					/>
					<TextField
						label="胜负"
						name="result"
						select
						required
						value={formState.result}
						onChange={(e) =>
							setFormState((prev) => ({ ...prev, result: e.target.value }))
						}>
						<MenuItem value="win">胜利</MenuItem>
						<MenuItem value="lose">失败</MenuItem>
						<MenuItem value="doubleLose">双败</MenuItem>
					</TextField>
					<Button
						type="submit"
						variant="contained"
						sx={{
							px: 6,
							py: 1.5,
							backgroundColor: "#a6ceb6",
							"&:hover": { backgroundColor: "#95bfa5" },
						}}>
						提交记录
					</Button>
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
								label="起始日期"
								value={startDate}
								onChange={(newValue) => setStartDate(newValue)}
								slotProps={{ textField: { id: "startDate", fullWidth: true } }}
							/>
							<DatePicker
								label="结束日期"
								value={endDate}
								onChange={(newValue) => setEndDate(newValue)}
								slotProps={{ textField: { id: "endDate", fullWidth: true } }}
							/>
						</LocalizationProvider>
						<Button
							variant="outlined"
							onClick={() => {
								setLoading(true);
								getHistory();
							}}>
							筛选
						</Button>
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
							label="显示我方系列分布"
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
							label="显示对手系列分布"
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
						label="显示胜率统计表格"
						sx={{ mb: 2 }}
					/>
					<Dialog
						open={deleteDialogOpen}
						onClose={() => setDeleteDialogOpen(false)}>
						<DialogTitle>确认删除</DialogTitle>
						<DialogContent>
							<DialogContentText>
								确定要删除该记录吗？此操作不可撤销。
							</DialogContentText>
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
							<Button
								color="error"
								onClick={() => {
									console.log("将删除记录:", recordToDelete);
									deleteRecord();
									setDeleteDialogOpen(false);
								}}>
								确认删除
							</Button>
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
						<Typography>暂无记录</Typography>
					) : (
						records.map((record) => (
							<Paper
								key={record._id}
								sx={{ p: 2, mb: 2, display: "flex", flexDirection: "column" }}
								elevation={2}>
								<Typography variant="h6">
									{record.tournamentName || "普通对战"}
								</Typography>
								<Typography
									variant="h4"
									color={
										record.result === "win"
											? "green"
											: record.result === "lose"
											? "red"
											: "gray"
									}>
									{record.result === "win"
										? "胜利"
										: record.result === "lose"
										? "失败"
										: "双败"}
								</Typography>
								<Typography variant="bod1">
									{record.playerDeckName} - {record.playerSeries}
								</Typography>
								<Typography variant="bod2">VS</Typography>
								<Typography variant="bod1">
									{record.opponentDeckName} - {record.opponentSeries}
								</Typography>
								{record.notes && <Typography>备注：{record.notes}</Typography>}
								<Box
									sx={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
										mt: 1,
									}}>
									<Typography
										variant="caption"
										color="text.secondary">
										{new Date(record.timestamp).toLocaleString()}
									</Typography>
									<Typography
										sx={{
											color: "red",
											cursor: "pointer",
											textDecoration: "underline",
										}}
										onClick={() => {
											setRecordToDelete(record);
											setDeleteDialogOpen(true);
										}}>
										删除
									</Typography>
								</Box>
							</Paper>
						))
					)}
				</Box>
			)}
		</Box>
	);
};

export default Record;
