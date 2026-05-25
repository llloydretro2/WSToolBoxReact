import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import {
	interpolateSpectral,
	interpolateRainbow,
	interpolateViridis,
} from "d3-scale-chromatic";
import { Combobox } from "@headlessui/react";
import { Trophy, X as XIcon, Swords, User, RotateCcw, ChevronDown } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import {
	Box,
	Typography,
	Paper,
	CircularProgress,
	MenuItem,
	Button,
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
	Divider,
	Menu,
	MenuItem as MenuItemMui,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import {
	Delete as DeleteIcon,
	EmojiEvents as TrophyIcon,
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
import { useOptions } from "../contexts/OptionsContext";
import Chart from "react-apexcharts";

function SeriesCombobox({ value, onChange, label, id, name }) {
	const { productList, translationMap } = useOptions();
	const [query, setQuery] = useState("");

	const options = useMemo(
		() =>
			(productList.series ?? [])
				.slice()
				.sort()
				.map((s) => ({
					key: s,
					label: `${s}${translationMap.series?.[s] ? `（${translationMap.series[s]}）` : ""}`,
				})),
		[productList.series, translationMap.series]
	);

	const filtered =
		query === ""
			? options
			: options.filter((o) =>
					o.label.toLowerCase().includes(query.toLowerCase())
			  );

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="text-[11px] font-bold text-[var(--text-secondary)]">
				{label} <span className="text-[var(--error)]">*</span>
			</label>
			<Combobox value={value} onChange={onChange} onClose={() => setQuery("")} immediate>
				<div className="relative">
					<Combobox.Input
						id={id}
						name={name}
						autoComplete="off"
						placeholder={label}
						displayValue={(key) => {
							const opt = options.find((o) => o.key === key);
							return opt ? opt.label : key ?? "";
						}}
						onChange={(e) => setQuery(e.target.value)}
						className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 pr-8 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
					/>
					<Combobox.Button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--border)] hover:text-[var(--text-secondary)] transition-colors">
						<ChevronDown size={14} />
					</Combobox.Button>
					<Combobox.Options
						anchor={{ to: "bottom start", gap: 4 }}
						className="z-[9999] w-[var(--input-width)] border border-[var(--border)] rounded-xl bg-white shadow-lg max-h-56 overflow-auto">
						{filtered.length === 0 ? (
							<div className="px-3 py-2 text-sm text-[var(--text-muted)]">
								{query ? "无匹配结果" : "暂无选项"}
							</div>
						) : (
							filtered.map((option) => (
								<Combobox.Option
									key={option.key}
									value={option.key}
									className={({ active, selected }) =>
										`px-3 py-2 text-sm cursor-pointer transition-colors ${
											selected
												? "bg-[var(--text-muted)] text-white font-medium"
												: active
												? "bg-[var(--card-background)] text-[var(--text)]"
												: "text-[var(--text)]"
										}`
									}
								>
									{option.label}
								</Combobox.Option>
							))
						)}
					</Combobox.Options>
				</div>
			</Combobox>
		</div>
	);
}

SeriesCombobox.propTypes = {
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	label: PropTypes.string.isRequired,
	id: PropTypes.string.isRequired,
	name: PropTypes.string.isRequired,
};

const Record = () => {
	const { t } = useLocale();
	const { user } = useAuth();

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

	// 简单的按字段保存到 localStorage 的实现
	const storagePrefix = "record:";
	const updateFormField = (field, value) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
		try {
			localStorage.setItem(`${storagePrefix}${field}`, JSON.stringify(value));
		} catch {
			// ignore
		}
	};

	const setAndSaveStartDate = (d) => {
		setStartDate(d);
		try {
			localStorage.setItem(
				`${storagePrefix}startDate`,
				JSON.stringify(d ? d.toISOString() : null)
			);
		} catch (e) {
			void e;
		}
	};

	const setAndSaveEndDate = (d) => {
		setEndDate(d);
		try {
			localStorage.setItem(
				`${storagePrefix}endDate`,
				JSON.stringify(d ? d.toISOString() : null)
			);
		} catch (e) {
			void e;
		}
	};

	// 挂载时逐项恢复字段（简单直接）
	useEffect(() => {
		try {
			const keys = [
				"playerDeckName",
				"opponentDeckName",
				"playerSeries",
				"opponentSeries",
				"tournamentName",
				"notes",
				"result",
				"startDate",
				"endDate",
				"tabValue",
			];
			const restored = {};
			keys.forEach((k) => {
				const raw = localStorage.getItem(`${storagePrefix}${k}`);
				if (raw != null) {
					try {
						const parsed = JSON.parse(raw);
						restored[k] = parsed;
					} catch {
						restored[k] = raw;
					}
				}
			});
			// 恢复到 state
			setFormState((prev) => ({
				...prev,
				...(restored.playerDeckName
					? { playerDeckName: restored.playerDeckName }
					: {}),
				...(restored.opponentDeckName
					? { opponentDeckName: restored.opponentDeckName }
					: {}),
				...(restored.playerSeries
					? { playerSeries: restored.playerSeries }
					: {}),
				...(restored.opponentSeries
					? { opponentSeries: restored.opponentSeries }
					: {}),
				...(restored.tournamentName
					? { tournamentName: restored.tournamentName }
					: {}),
				...(restored.notes ? { notes: restored.notes } : {}),
				...(restored.result ? { result: restored.result } : {}),
			}));
			if (restored.startDate) {
				try {
					setStartDate(new Date(restored.startDate));
				} catch {
					setStartDate(restored.startDate);
				}
			}
			if (restored.endDate) {
				try {
					setEndDate(new Date(restored.endDate));
				} catch {
					setEndDate(restored.endDate);
				}
			}
			if (
				typeof restored.tabValue !== "undefined" &&
				restored.tabValue !== null
			) {
				const v = Number(restored.tabValue) || 0;
				setTabValue(v);
			}
		} catch (err) {
			console.warn("Record: failed to restore per-field draft", err);
		}
	}, []);
	const [deleteDialog, setDeleteDialog] = useState({ open: false, record: null });
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

		// 清除本地存储的各字段草稿
		try {
			const keys = [
				"playerDeckName",
				"opponentDeckName",
				"playerSeries",
				"opponentSeries",
				"tournamentName",
				"notes",
				"result",
				"startDate",
				"endDate",
				"tabValue",
			];
			keys.forEach((k) => localStorage.removeItem(`${storagePrefix}${k}`));
		} catch (e) {
			void e;
		}
	};

	// 局部重置：我方 / 对手
	const resetMyInfo = () => {
		updateFormField("playerDeckName", "");
		updateFormField("playerSeries", "");
	};

	const resetOpponentInfo = () => {
		updateFormField("opponentDeckName", "");
		updateFormField("opponentSeries", "");
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
		if (!deleteDialog.record) return;

		try {
			await apiRequest(
				`/api/matches/delete/${deleteDialog.record._id}`,
				{
					method: "DELETE",
				}
			);

			setRecords((prev) =>
				prev.filter((record) => record._id !== deleteDialog.record._id)
			);
			setDeleteDialog({ open: false, record: null });
			getHistory();
		} catch (err) {
			console.error("Failed to delete record:", err);
		}
	};

	const getHistory = async () => {
		try {
			const res = await apiRequest(`/api/matches/history`);
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
		<div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
			<div className="mb-8">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none">
					{t("record.title")}
				</h1>
			</div>

			<div className="flex border-b border-[var(--border)] mb-6">
				{[
					{ index: 0, label: t("record.tabs.create") },
					{ index: 1, label: t("record.tabs.query") },
				].map(({ index, label }) => (
					<button
						key={index}
						onClick={() => {
							if (index === 1) getHistory();
							setTabValue(index);
							try {
								localStorage.setItem(
									`${storagePrefix}tabValue`,
									JSON.stringify(index)
								);
							} catch (e) {
								void e;
							}
						}}
						className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 -mb-px
							${tabValue === index
								? "border-[var(--text-muted)] text-[var(--text-muted)]"
								: "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
							}`}
					>
						{label}
					</button>
				))}
			</div>

			{tabValue === 0 && (
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						const data = {};
						const userName = user?.username;
						if (!userName) {
							console.error("未登录或无法获取用户名，提交记录失败");
							return;
						}
						data.userName = userName;
						data.playerDeckName = formState.playerDeckName.trim();
						data.opponentDeckName = formState.opponentDeckName.trim();
						data.playerSeries = formState.playerSeries.trim();
						data.opponentSeries = formState.opponentSeries.trim();
						data.result = formState.result.trim();
						if (formState.tournamentName.trim())
							data.tournamentName = formState.tournamentName.trim();
						if (formState.notes.trim()) data.notes = formState.notes.trim();

						try {
							const res = await apiRequest(
								`/api/matches/create`,
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
					className="flex flex-col gap-5">

					{/* ── Player vs Opponent ────────────────────────── */}
					<div className="relative">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* My Info */}
							<div className="border border-[var(--border)] border-t-[3px] border-t-[var(--text-muted)] rounded-2xl p-5 bg-white/70 backdrop-blur-md">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-1.5">
										<User size={14} className="shrink-0" style={{ color: "var(--text-muted)" }} />
										<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
											{t("record.form.myInfo")}
										</span>
									</div>
									<button
										type="button"
										title={t("record.resetMyInfo")}
										onClick={resetMyInfo}
										className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
										<RotateCcw size={14} />
									</button>
								</div>
								<div className="flex flex-col gap-1.5 mb-4">
									<label htmlFor="playerDeckName" className="text-[11px] font-bold text-[var(--text-secondary)]">
										{t("record.form.myDeckName")} <span className="text-[var(--error)]">*</span>
									</label>
									<input
										id="playerDeckName"
										name="playerDeckName"
										required
										value={formState.playerDeckName}
										onChange={(e) => updateFormField("playerDeckName", e.target.value)}
										className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
									/>
								</div>
								<SeriesCombobox
									id="playerSeries"
									name="playerSeries"
									label={t("record.form.mySeries")}
									value={formState.playerSeries}
									onChange={(key) => updateFormField("playerSeries", key ?? "")}
								/>
							</div>

							{/* Opponent Info */}
							<div className="border border-[var(--border)] border-t-[3px] border-t-[var(--text-muted)] rounded-2xl p-5 bg-white/70 backdrop-blur-md">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-1.5">
										<User size={14} className="shrink-0" style={{ color: "var(--text-muted)" }} />
										<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
											{t("record.form.opponentInfo")}
										</span>
									</div>
									<button
										type="button"
										title={t("record.resetOpponentInfo")}
										onClick={resetOpponentInfo}
										className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
										<RotateCcw size={14} />
									</button>
								</div>
								<div className="flex flex-col gap-1.5 mb-4">
									<label htmlFor="opponentDeckName" className="text-[11px] font-bold text-[var(--text-secondary)]">
										{t("record.form.opponentDeckName")} <span className="text-[var(--error)]">*</span>
									</label>
									<input
										id="opponentDeckName"
										name="opponentDeckName"
										required
										value={formState.opponentDeckName}
										onChange={(e) => updateFormField("opponentDeckName", e.target.value)}
										className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
									/>
								</div>
								<SeriesCombobox
									id="opponentSeries"
									name="opponentSeries"
									label={t("record.form.opponentSeries")}
									value={formState.opponentSeries}
									onChange={(key) => updateFormField("opponentSeries", key ?? "")}
								/>
							</div>
						</div>

						{/* VS badge */}
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
							w-11 h-11 rounded-full bg-[var(--text)] text-[var(--background)]
							flex items-center justify-center
							font-black text-[0.7rem] tracking-widest select-none
							shadow-[0_2px_10px_rgba(0,0,0,0.18)] border-2 border-white/60">
							VS
						</div>
					</div>

					{/* ── Result selector ───────────────────────────── */}
					<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] block mb-3">
							{t("record.form.resultLabel")}
						</span>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => updateFormField("result", formState.result === "win" ? "" : "win")}
								className={`flex-1 flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-xl border-2 font-bold text-sm transition-all
									${formState.result === "win"
										? "bg-[#52b788] border-[#52b788] text-white"
										: "bg-[rgba(82,183,136,0.12)] border-[rgba(82,183,136,0.4)] text-[#3a9d6e] hover:bg-[rgba(82,183,136,0.2)]"
									}`}>
								<Trophy size={18} className="hidden sm:block" />
								{t("record.form.result.win")}
							</button>
							<button
								type="button"
								onClick={() => updateFormField("result", formState.result === "lose" ? "" : "lose")}
								className={`flex-1 flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-xl border-2 font-bold text-sm transition-all
									${formState.result === "lose"
										? "bg-[#e05c5c] border-[#e05c5c] text-white"
										: "bg-[rgba(224,92,92,0.10)] border-[rgba(224,92,92,0.4)] text-[#c94444] hover:bg-[rgba(224,92,92,0.18)]"
									}`}>
								<XIcon size={18} className="hidden sm:block" />
								{t("record.form.result.lose")}
							</button>
							<button
								type="button"
								onClick={() => updateFormField("result", formState.result === "doubleLose" ? "" : "doubleLose")}
								className={`flex-1 flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-xl border-2 font-bold text-sm transition-all
									${formState.result === "doubleLose"
										? "bg-[#7b8fa1] border-[#7b8fa1] text-white"
										: "bg-[rgba(123,143,161,0.10)] border-[rgba(123,143,161,0.4)] text-[#5a6f80] hover:bg-[rgba(123,143,161,0.18)]"
									}`}>
								<Swords size={18} className="hidden sm:block" />
								{t("record.form.result.doubleLose")}
							</button>
						</div>
					</div>

					{/* ── Match details ─────────────────────────────── */}
					<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<label htmlFor="tournamentName" className="text-[11px] font-bold text-[var(--text-secondary)]">
								{t("record.form.matchName")}
							</label>
							<input
								id="tournamentName"
								name="tournamentName"
								value={formState.tournamentName}
								onChange={(e) => updateFormField("tournamentName", e.target.value)}
								className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label htmlFor="notes" className="text-[11px] font-bold text-[var(--text-secondary)]">
								{t("record.form.notes")}
							</label>
							<textarea
								id="notes"
								name="notes"
								rows={3}
								value={formState.notes}
								onChange={(e) => updateFormField("notes", e.target.value)}
								className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors resize-none"
							/>
						</div>
					</div>

					{/* ── Actions ───────────────────────────────────── */}
					<div className="flex flex-col items-center gap-2">
						<button
							type="submit"
							className="w-full py-2.5 rounded-xl bg-[var(--text-muted)] text-white font-bold text-sm hover:bg-[var(--text-secondary)] transition-colors">
							{t("record.form.submitButton")}
						</button>
						<button
							type="button"
							onClick={() => setResetDialogOpen(true)}
							className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
							{t("record.form.resetButton")}
						</button>
					</div>
				</form>
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
								onChange={(newValue) => setAndSaveStartDate(newValue)}
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
								onChange={(newValue) => setAndSaveEndDate(newValue)}
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
						open={deleteDialog.open}
						onClose={() => setDeleteDialog({ open: false, record: null })}>
						<DialogTitle>{t("record.deleteDialog.title")}</DialogTitle>
						<DialogContent>
							<DialogContentText>
								{t("record.deleteDialog.content")}
							</DialogContentText>
						</DialogContent>
						<DialogActions>
							<SecondaryButton onClick={() => setDeleteDialog({ open: false, record: null })}>
								{t("record.deleteDialog.cancel")}
							</SecondaryButton>
							<DangerButton
								color="error"
								onClick={() => {
									deleteRecord();
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
								px: 2,
								border: "1px solid var(--border)",
								borderRadius: 2,
								backgroundColor: "var(--card-background)",
							}}>
							<Typography variant="h6" fontWeight={600} color="var(--text)" gutterBottom>
								{t("record.display.noRecords")}
							</Typography>
							<Typography variant="body2" color="text.secondary">
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
									size={{ xs: 12 }}
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
											backgroundColor: "var(--surface)",
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
														setDeleteDialog({ open: true, record: record });
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
			{resetDialogOpen && (
				<div
					className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
					onClick={() => setResetDialogOpen(false)}>
					<div
						className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4 flex flex-col gap-4"
						onClick={(e) => e.stopPropagation()}>
						<div>
							<p className="text-base font-bold text-[var(--text)] mb-1">
								{t("record.resetDialog.title")}
							</p>
							<p className="text-sm text-[var(--text-secondary)]">
								{t("record.resetDialog.content")}
							</p>
						</div>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => setResetDialogOpen(false)}
								className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
								{t("record.resetDialog.cancel")}
							</button>
							<button
								onClick={resetForm}
								className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--reset)] text-white hover:bg-[var(--reset-hover)] transition-colors">
								{t("record.resetDialog.confirm")}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* 浮动按钮 - 仅在历史记录标签页显示 */}
			{tabValue === 1 && records.length > 0 && (
				<>
					<Fab
						color="primary"
						onClick={handleFabMenuOpen}
						sx={{
							position: "fixed",
							bottom: 24,
							left: 24,
							zIndex: 1000,
							background: "linear-gradient(135deg, #1b4332 0%, #2d5a42 100%)",
							"&:hover": {
								background: "linear-gradient(135deg, #2d5a42 0%, #40916c 100%)",
								transform: "scale(1.05)",
							},
							transition: "all 0.2s ease-in-out",
							boxShadow: "0 6px 18px rgba(27, 67, 50, 0.18)",
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
		</div>
	);
};

export default Record;
