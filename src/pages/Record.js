import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";

// 本地后端测试地址
// http://localhost:4000/api/cards?${params}
// 线上后端测试地址
// https://wstoolboxbackend-production.up.railway.app/api/cards?${params}

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

	const token = localStorage.getItem("token");

	useEffect(() => {
		fetch(
			"https://wstoolboxbackend-production.up.railway.app/api/matches/history",
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
			.then((res) => {
				if (!res.ok) throw new Error("Network response was not ok");
				return res.json();
			})
			.then((data) => {
				setRecords(data);
			})
			.catch((err) => {
				console.error("Error fetching match records:", err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	return (
		<Box sx={{ p: 3, width: "50%", mx: "auto" }}>
			<Typography variant="h4" gutterBottom>
				对战记录
			</Typography>

			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				<Box sx={{ display: "flex", justifyContent: "center" }}>
					<Tabs
						value={tabValue}
						onChange={(e, newValue) => setTabValue(newValue)}
					>
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
						fetch(
							"https://wstoolboxbackend-production.up.railway.app/api/matches/create",
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
								body: JSON.stringify(data),
							}
						)
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
					sx={{ display: "flex", flexDirection: "column", gap: 2 }}
				>
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
							<TextField {...params} label="我方系列" required />
						)}
					/>
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
											? `（${translationMap.series[formState.opponentSeries]}）`
											: ""
								  }`
								: ""
						}
						onChange={(_, newValue) => {
							const key = newValue?.split("（")[0];
							setFormState((prev) => ({ ...prev, opponentSeries: key || "" }));
						}}
						renderInput={(params) => (
							<TextField {...params} label="对手系列" required />
						)}
					/>
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
						}
					>
						<MenuItem value="win">胜利</MenuItem>
						<MenuItem value="lose">失败</MenuItem>
						<MenuItem value="doubleLose">双败</MenuItem>
					</TextField>
					<Button type="submit" variant="contained">
						提交记录
					</Button>
				</Box>
			)}

			{tabValue === 1 && (
				<Box>
					{loading ? (
						<CircularProgress />
					) : records.length === 0 ? (
						<Typography>暂无记录</Typography>
					) : (
						records.map((record) => (
							<Paper
								key={record._id}
								sx={{ p: 2, mb: 2, display: "flex", flexDirection: "column" }}
								elevation={2}
							>
								<Typography variant="h6">
									{record.tournamentName || "普通对战"} -{" "}
									{record.result === "win" ? "胜利" : "失败"}
								</Typography>
								<Typography>我方系列：{record.playerSeries}</Typography>
								<Typography>我方卡组：{record.playerDeckName}</Typography>
								<Typography>对手系列：{record.opponentSeries}</Typography>
								<Typography>对手卡组：{record.opponentDeckName}</Typography>
								{record.notes && <Typography>备注：{record.notes}</Typography>}
								<Typography
									sx={{ mt: 1 }}
									variant="caption"
									color="text.secondary"
								>
									{new Date(record.timestamp).toLocaleString()}
								</Typography>
							</Paper>
						))
					)}
				</Box>
			)}
		</Box>
	);
};

export default Record;
