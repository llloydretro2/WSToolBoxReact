import React, { useState } from "react";
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
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [recordToDelete, setRecordToDelete] = useState(null);

	const token = localStorage.getItem("token");

	const deleteRecord = () => {
		if (!recordToDelete) return;
		fetch(
			`https://wstoolboxbackend-production.up.railway.app/api/matches/delete/${recordToDelete._id}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
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
	};

	return (
		<Box
			sx={{
				p: 3,
				width: {
					xs: "100%",
					sm: "80%",
					md: "60%",
					lg: "50%",
				},
				mx: "auto",
			}}
		>
			<Typography variant="h4" gutterBottom>
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
						}}
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
					<Button
						type="submit"
						variant="contained"
						sx={{
							px: 6,
							py: 1.5,
							backgroundColor: "#a6ceb6",
							"&:hover": { backgroundColor: "#95bfa5" },
						}}
					>
						提交记录
					</Button>
				</Box>
			)}

			{tabValue === 1 && (
				<Box textAlign={"center"}>
					<Dialog
						open={deleteDialogOpen}
						onClose={() => setDeleteDialogOpen(false)}
					>
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
								}}
							>
								确认删除
							</Button>
						</DialogActions>
					</Dialog>
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
									}
								>
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
									}}
								>
									<Typography variant="caption" color="text.secondary">
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
										}}
									>
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
