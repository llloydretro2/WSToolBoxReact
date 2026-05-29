import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { Combobox } from "@headlessui/react";
import { Trophy, X as XIcon, Swords, User, RotateCcw, ChevronDown, Trash2, TrendingUp, LayoutGrid, Layers } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import { useOptions } from "../contexts/OptionsContext";

function SeriesCombobox({ value, onChange, label, id, name }) {
	const { jpNeostandardMap, neostandardMap, translationMap } = useOptions();
	const [query, setQuery] = useState("");
	const [side, setSide] = useState("jp");

	const options = useMemo(() => {
		if (side === "en") {
			return Object.keys(neostandardMap)
				.filter((s) => s.trim() !== "")
				.sort()
				.map((s) => ({ key: s, label: s }));
		}
		return Object.keys(jpNeostandardMap)
			.filter((s) => s.trim() !== "")
			.sort()
			.map((s) => ({
				key: s,
				label: `${s}${translationMap.neostandard?.[s] ? `（${translationMap.neostandard[s]}）` : ""}`,
			}));
	}, [side, jpNeostandardMap, neostandardMap, translationMap.neostandard]);

	const filtered =
		query === ""
			? options
			: options.filter((o) =>
					o.label.toLowerCase().includes(query.toLowerCase())
			  );

	const handleSideSwitch = (newSide) => {
		if (newSide === side) return;
		setSide(newSide);
		onChange("");
		setQuery("");
	};

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<label htmlFor={id} className="text-[11px] font-bold text-[var(--text-secondary)]">
					{label} <span className="text-[var(--error)]">*</span>
				</label>
				<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
					{["jp", "en"].map((s, i) => (
						<button
							key={s}
							type="button"
							onClick={() => handleSideSwitch(s)}
							className={`px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
								i === 0 ? "border-r border-[var(--border)]" : ""
							} ${
								side === s
									? "bg-[var(--text)] text-[var(--background)]"
									: "bg-transparent text-[var(--text)] hover:bg-[var(--card-background)]"
							}`}>
							{s.toUpperCase()}
						</button>
					))}
				</div>
			</div>
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

	// 分析对话框
	const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
	const [analysisTab, setAnalysisTab] = useState(0);
	const [seriesSort, setSeriesSort] = useState("total");
	const [trendPeriod, setTrendPeriod] = useState("month");
	const [deckFilter, setDeckFilter] = useState(null);

	const filteredRecords = useMemo(() => {
		if (!deckFilter) return records;
		return records.filter(
			(rec) =>
				(rec.playerSeries || "") === deckFilter.series &&
				(rec.playerDeckName || "") === deckFilter.deck
		);
	}, [records, deckFilter]);

	const totalMatches = filteredRecords.length;

	const wins = useMemo(
		() => filteredRecords.filter((record) => record.result === "win").length,
		[filteredRecords]
	);
	const losses = useMemo(
		() => filteredRecords.filter((record) => record.result === "lose").length,
		[filteredRecords]
	);
	const winRate = totalMatches
		? ((wins / totalMatches) * 100).toFixed(1)
		: "0.0";

	const mySeriesWinRate = useMemo(() => {
		const unknownLabel = t("record.display.unknownSeries");
		const map = {};
		records.forEach((rec) => {
			const key = rec.playerSeries || unknownLabel;
			if (!map[key]) map[key] = { total: 0, wins: 0, losses: 0, draws: 0 };
			map[key].total++;
			if (rec.result === "win") map[key].wins++;
			else if (rec.result === "lose") map[key].losses++;
			else map[key].draws++;
		});
		return Object.entries(map)
			.map(([name, s]) => ({
				name,
				...s,
				winRate: s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : "0.0",
			}))
			.sort((a, b) => b.total - a.total);
	}, [records, t]);

	const opponentSeriesWinRate = useMemo(() => {
		const unknownLabel = t("record.display.unknownSeries");
		const map = {};
		records.forEach((rec) => {
			const key = rec.opponentSeries || unknownLabel;
			if (!map[key]) map[key] = { total: 0, wins: 0, losses: 0, draws: 0 };
			map[key].total++;
			if (rec.result === "win") map[key].wins++;
			else if (rec.result === "lose") map[key].losses++;
			else map[key].draws++;
		});
		return Object.entries(map)
			.map(([name, s]) => ({
				name,
				...s,
				winRate: s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : "0.0",
			}))
			.sort((a, b) => b.total - a.total);
	}, [records, t]);

	const recentForm = useMemo(() => records.slice(0, 15).reverse(), [records]);

	const currentStreak = useMemo(() => {
		if (!records.length) return null;
		const first = records[0].result;
		let count = 0;
		for (const rec of records) {
			if (rec.result === first) count++;
			else break;
		}
		return { result: first, count };
	}, [records]);

	const longestWinStreak = useMemo(() => {
		if (!records.length) return 0;
		let max = 0, cur = 0;
		const sorted = [...records].sort(
			(a, b) => new Date(a.timestamp) - new Date(b.timestamp)
		);
		for (const rec of sorted) {
			if (rec.result === "win") { cur++; if (cur > max) max = cur; }
			else cur = 0;
		}
		return max;
	}, [records]);

	const trendData = useMemo(() => {
		if (!records.length) return [];
		const groups = {};
		records.forEach((rec) => {
			const date = new Date(rec.timestamp);
			let key;
			if (trendPeriod === "week") {
				const d = new Date(date);
				d.setHours(0, 0, 0, 0);
				d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
				key = d.toISOString().split("T")[0];
			} else {
				key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			}
			if (!groups[key]) groups[key] = { total: 0, wins: 0 };
			groups[key].total++;
			if (rec.result === "win") groups[key].wins++;
		});
		return Object.entries(groups)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, s]) => ({
				key,
				...s,
				winRate: s.total > 0 ? (s.wins / s.total) * 100 : 0,
				label: trendPeriod === "week"
					? key.slice(5).replace("-", "/")
					: key.slice(2).replace("-", "/"),
			}));
	}, [records, trendPeriod]);

	const matchupMatrix = useMemo(() => {
		const unknownLabel = t("record.display.unknownSeries");
		const matrix = {};
		const mySeriesSet = new Set();
		const oppSeriesSet = new Set();
		records.forEach((rec) => {
			const ms = rec.playerSeries || unknownLabel;
			const os = rec.opponentSeries || unknownLabel;
			mySeriesSet.add(ms);
			oppSeriesSet.add(os);
			if (!matrix[ms]) matrix[ms] = {};
			if (!matrix[ms][os]) matrix[ms][os] = { total: 0, wins: 0 };
			matrix[ms][os].total++;
			if (rec.result === "win") matrix[ms][os].wins++;
		});
		const myRows = [...mySeriesSet].sort();
		const oppCols = [...oppSeriesSet].sort();
		return { matrix, myRows, oppCols };
	}, [records, t]);

	const deckData = useMemo(() => {
		const unknownSeries = t("record.display.unknownSeries");
		const unknownDeck = t("record.display.unknownDeck");
		const map = {};
		records.forEach((rec) => {
			const series = rec.playerSeries || unknownSeries;
			const deck = rec.playerDeckName || unknownDeck;
			const key = `${series}\x00${deck}`;
			if (!map[key]) map[key] = { series, deck, total: 0, wins: 0, losses: 0, draws: 0 };
			map[key].total++;
			if (rec.result === "win") map[key].wins++;
			else if (rec.result === "lose") map[key].losses++;
			else map[key].draws++;
		});
		return Object.entries(map)
			.map(([, s]) => ({
				name: `${s.series} / ${s.deck}`,
				series: s.series,
				deck: s.deck,
				total: s.total, wins: s.wins, losses: s.losses, draws: s.draws,
				winRate: s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : "0.0",
			}))
			.sort((a, b) => b.total - a.total);
	}, [records, t]);

	const tournamentData = useMemo(() => {
		const map = {};
		records.forEach((rec) => {
			if (!rec.tournamentName) return;
			const key = rec.tournamentName;
			if (!map[key]) map[key] = { total: 0, wins: 0, losses: 0, draws: 0 };
			map[key].total++;
			if (rec.result === "win") map[key].wins++;
			else if (rec.result === "lose") map[key].losses++;
			else map[key].draws++;
		});
		return Object.entries(map)
			.map(([name, s]) => ({
				name, ...s,
				winRate: s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : "0.0",
			}))
			.sort((a, b) => b.total - a.total);
	}, [records]);

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

	const exportMatrixPNG = () => {
		const { matrix, myRows, oppCols } = matchupMatrix;
		if (!myRows.length || !oppCols.length) return;

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cellW = 76;
		const cellH = 54;
		const rowHeaderW = 112;
		const colHeaderH = 64;
		const pad = 24;
		const titleH = 48;
		const legendH = 28;

		const logicalW = pad * 2 + rowHeaderW + oppCols.length * cellW;
		const logicalH = pad + titleH + colHeaderH + myRows.length * cellH + legendH + pad;

		const canvas = document.createElement("canvas");
		canvas.width = logicalW * dpr;
		canvas.height = logicalH * dpr;
		const ctx = canvas.getContext("2d");
		ctx.scale(dpr, dpr);

		const roundedRect = (x, y, w, h, r) => {
			ctx.beginPath();
			ctx.moveTo(x + r, y);
			ctx.lineTo(x + w - r, y);
			ctx.quadraticCurveTo(x + w, y, x + w, y + r);
			ctx.lineTo(x + w, y + h - r);
			ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
			ctx.lineTo(x + r, y + h);
			ctx.quadraticCurveTo(x, y + h, x, y + h - r);
			ctx.lineTo(x, y + r);
			ctx.quadraticCurveTo(x, y, x + r, y);
			ctx.closePath();
		};

		const truncate = (str, maxW, font) => {
			ctx.font = font;
			if (ctx.measureText(str).width <= maxW) return str;
			while (str.length > 1 && ctx.measureText(str + "…").width > maxW) str = str.slice(0, -1);
			return str + "…";
		};

		// Background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, logicalW, logicalH);

		// Title
		ctx.fillStyle = "#35443b";
		ctx.font = "bold 16px sans-serif";
		ctx.textBaseline = "middle";
		ctx.fillText(t("record.stats.matchupTitle"), pad, pad + titleH / 2);

		const startX = pad + rowHeaderW;
		const startY = pad + titleH + colHeaderH;

		// Column headers
		const colFont = "bold 11px sans-serif";
		oppCols.forEach((col, ci) => {
			const cx = startX + ci * cellW + cellW / 2;
			ctx.save();
			ctx.translate(cx, pad + titleH + colHeaderH - 10);
			ctx.rotate(-Math.PI / 4);
			ctx.fillStyle = "#52675a";
			ctx.font = colFont;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(truncate(col, 72, colFont), 0, 0);
			ctx.restore();
		});

		// Grid lines
		ctx.strokeStyle = "#e8f0eb";
		ctx.lineWidth = 1;
		myRows.forEach((_, ri) => {
			const y = startY + ri * cellH;
			ctx.beginPath();
			ctx.moveTo(pad, y);
			ctx.lineTo(logicalW - pad, y);
			ctx.stroke();
		});

		// Rows
		const rowLabelFont = "bold 11px sans-serif";
		myRows.forEach((row, ri) => {
			const y = startY + ri * cellH;
			const cy = y + cellH / 2;

			// Row label
			ctx.fillStyle = "#0c120f";
			ctx.font = rowLabelFont;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(truncate(row, rowHeaderW - 8, rowLabelFont), pad, cy);

			// Cells
			oppCols.forEach((col, ci) => {
				const x = startX + ci * cellW;
				const cell = matrix[row]?.[col];

				if (!cell) {
					ctx.fillStyle = "#f4f8f5";
					roundedRect(x + 3, y + 4, cellW - 6, cellH - 8, 6);
					ctx.fill();
					ctx.fillStyle = "#aac0b0";
					ctx.font = "13px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText("—", x + cellW / 2, cy);
					return;
				}

				const rate = cell.wins / cell.total;
				const hue = Math.round(rate * 120);
				ctx.fillStyle = `hsla(${hue}, 55%, 45%, 0.88)`;
				roundedRect(x + 3, y + 4, cellW - 6, cellH - 8, 6);
				ctx.fill();

				ctx.fillStyle = "#ffffff";
				ctx.font = "bold 14px sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(`${(rate * 100).toFixed(0)}%`, x + cellW / 2, cy - 6);

				ctx.font = "10px sans-serif";
				ctx.fillStyle = "rgba(255,255,255,0.78)";
				ctx.fillText(`${cell.wins}/${cell.total}`, x + cellW / 2, cy + 9);
			});
		});

		// Legend
		const legendY = startY + myRows.length * cellH + 10;
		const legendBarW = 100;
		const legendStartX = logicalW - pad - legendBarW;
		for (let i = 0; i < legendBarW; i++) {
			const hue = Math.round((i / legendBarW) * 120);
			ctx.fillStyle = `hsla(${hue}, 55%, 45%, 0.88)`;
			ctx.fillRect(legendStartX + i, legendY, 1, 8);
		}
		ctx.fillStyle = "#52675a";
		ctx.font = "10px sans-serif";
		ctx.textAlign = "right";
		ctx.textBaseline = "top";
		ctx.fillText("0%", legendStartX - 4, legendY);
		ctx.textAlign = "left";
		ctx.fillText("100%", legendStartX + legendBarW + 4, legendY);

		const link = document.createElement("a");
		link.download = "matchup-matrix.png";
		link.href = canvas.toDataURL("image/png");
		link.click();
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

			<div className="flex bg-[var(--card-background)] rounded-xl p-1 mb-6">
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
						className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200
							${tabValue === index
								? "bg-white text-[var(--text-muted)] shadow-sm"
								: "text-[var(--text-muted)] opacity-50 hover:opacity-80"
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
				<div>
					{/* ── Filter bar ─────────────────────────────── */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
						<div className="flex-1 flex flex-col gap-1.5">
							<label htmlFor="startDate" className="text-[11px] font-bold text-[var(--text-secondary)]">
								{t("record.form.startDate")}
							</label>
							<input
								type="date"
								id="startDate"
								value={startDate ? startDate.toISOString().split("T")[0] : ""}
								onChange={(e) => setAndSaveStartDate(e.target.value ? new Date(e.target.value + "T00:00:00") : null)}
								className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
							/>
						</div>
						<div className="flex-1 flex flex-col gap-1.5">
							<label htmlFor="endDate" className="text-[11px] font-bold text-[var(--text-secondary)]">
								{t("record.form.endDate")}
							</label>
							<input
								type="date"
								id="endDate"
								value={endDate ? endDate.toISOString().split("T")[0] : ""}
								onChange={(e) => setAndSaveEndDate(e.target.value ? new Date(e.target.value + "T23:59:59") : null)}
								className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
							/>
						</div>
						<button
							onClick={() => { setLoading(true); getHistory(); }}
							className="py-2.5 px-5 rounded-xl bg-[var(--text-muted)] text-white font-bold text-sm hover:bg-[var(--text-secondary)] transition-colors whitespace-nowrap">
							{t("record.form.filterButton")}
						</button>
					</div>

					{/* ── Delete dialog ──────────────────────────── */}
					{deleteDialog.open && (
						<div
							className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
							onClick={() => setDeleteDialog({ open: false, record: null })}>
							<div
								className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4 flex flex-col gap-4"
								onClick={(e) => e.stopPropagation()}>
								<div>
									<p className="text-base font-bold text-[var(--text)] mb-1">{t("record.deleteDialog.title")}</p>
									<p className="text-sm text-[var(--text-secondary)]">{t("record.deleteDialog.content")}</p>
								</div>
								<div className="flex gap-2 justify-end">
									<button
										onClick={() => setDeleteDialog({ open: false, record: null })}
										className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
										{t("record.deleteDialog.cancel")}
									</button>
									<button
										onClick={deleteRecord}
										className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--reset)] text-white hover:bg-[var(--reset-hover)] transition-colors">
										{t("record.deleteDialog.confirm")}
									</button>
								</div>
							</div>
						</div>
					)}

					{loading ? (
						<div className="flex justify-center py-12">
							<div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--text-muted)] animate-spin" />
						</div>
					) : records.length === 0 ? (
						<div className="text-center py-12 px-4 border border-[var(--border)] rounded-2xl bg-[var(--card-background)]">
							<p className="text-base font-bold text-[var(--text)] mb-1">{t("record.display.noRecords")}</p>
							<p className="text-sm text-[var(--text-secondary)]">{t("record.display.startFirst")}</p>
						</div>
					) : filteredRecords.length === 0 ? (
						<div className="text-center py-12 px-4 border border-[var(--border)] rounded-2xl bg-[var(--card-background)]">
							<p className="text-base font-bold text-[var(--text)] mb-1">{t("record.display.noFilterResults")}</p>
							<button onClick={() => setDeckFilter(null)} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mt-1">
								{t("record.display.clearFilter")}
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{/* ── Deck filter chip ───────────────────── */}
							{deckFilter && (
								<div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--text-muted)] bg-[var(--card-background)]">
									<div className="flex-1 min-w-0">
										<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">{t("record.stats.deckFilterLabel")}</span>
										<p className="text-xs font-medium text-[var(--text)] truncate">{deckFilter.series} / {deckFilter.deck}</p>
									</div>
									<button
										onClick={() => setDeckFilter(null)}
										className="shrink-0 text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
										<XIcon size={14} />
									</button>
								</div>
							)}
							{/* ── Summary bar ────────────────────────── */}
							<div className="grid grid-cols-4 gap-px bg-[var(--border)] rounded-2xl overflow-hidden border border-[var(--border)] mb-5">
								{[
									{ value: totalMatches, label: t("record.stats.totalLabel"), color: "text-[var(--text)]" },
									{ value: wins, label: t("record.stats.winsLabel"), color: "text-[#52b788]" },
									{ value: losses, label: t("record.stats.lossesLabel"), color: "text-[#e05c5c]" },
									{ value: `${winRate}%`, label: t("record.stats.winRateLabel"), color: "text-[var(--text-muted)]" },
								].map(({ value, label, color }) => (
									<div key={label} className="bg-white/70 backdrop-blur-md py-3 flex flex-col items-center gap-0.5">
										<span className={`text-xl font-black ${color}`}>{value}</span>
										<span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
									</div>
								))}
							</div>

							{/* ── Analysis actions ──────────────────────── */}
						<div className="mb-5">
							<div className="flex items-center gap-3 mb-3">
								<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
									{t("record.stats.analysisLabel")}
								</span>
								<div className="flex-1 border-t border-[var(--border)]" />
							</div>
							<div className="grid grid-cols-3 gap-2">
								{[
									{ tab: 0, Icon: TrendingUp,  label: t("record.stats.tabForm") },
									{ tab: 1, Icon: User,        label: t("record.stats.tabMySeries") },
									{ tab: 2, Icon: Swords,      label: t("record.stats.tabOpponentSeries") },
									{ tab: 3, Icon: LayoutGrid,  label: t("record.stats.tabMatchup") },
									{ tab: 4, Icon: Trophy,      label: t("record.stats.tabTournament") },
									{ tab: 5, Icon: Layers,      label: t("record.stats.tabDeck") },
								].map(({ tab, Icon, label }) => (
									<button
										key={tab}
										onClick={() => { setAnalysisTab(tab); setAnalysisDialogOpen(true); }}
										className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-[var(--border)] bg-white/60 backdrop-blur-sm text-center hover:border-[var(--text-muted)] hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150">
										<Icon size={15} className="text-[var(--text-muted)]" />
										<span className="text-[10px] font-bold text-[var(--text-secondary)] leading-tight">{label}</span>
									</button>
								))}
							</div>
						</div>
						{filteredRecords.map((record) => (
								<div
									key={record._id}
									className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
									{/* Result header */}
									<div className={`px-4 py-3 flex items-center justify-between text-white ${
										record.result === "win" ? "bg-[#52b788]"
										: record.result === "lose" ? "bg-[#e05c5c]"
										: "bg-[#7b8fa1]"
									}`}>
										<div className="flex items-center gap-2">
											<Trophy size={15} />
											<span className="font-bold text-sm">
												{record.result === "win" ? t("record.form.result.win")
													: record.result === "lose" ? t("record.form.result.lose")
													: t("record.form.result.doubleLose")}
											</span>
										</div>
										<span className="text-xs opacity-90">{new Date(record.timestamp).toLocaleDateString()}</span>
									</div>
									{/* Card body */}
									<div className="p-4">
										{record.tournamentName && (
											<div className="flex justify-center mb-3">
												<span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[var(--card-background)] text-[var(--text-secondary)] border border-[var(--border)]">
													{record.tournamentName}
												</span>
											</div>
										)}
										<div className="mb-3">
											<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">{t("record.display.myDeck")}</p>
											<p className="text-sm font-medium text-[var(--text)] mb-1.5">{record.playerDeckName || t("record.display.unknownDeck")}</p>
											<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--text-muted)] text-[var(--text-muted)]">
												{record.playerSeries || t("record.display.unknownSeries")}
											</span>
										</div>
										<div className="flex items-center gap-3 my-3">
											<div className="flex-1 border-t border-[var(--border)]" />
											<span className="text-[10px] font-black tracking-widest text-[var(--text-muted)]">VS</span>
											<div className="flex-1 border-t border-[var(--border)]" />
										</div>
										<div className="mb-1">
											<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">{t("record.display.opponentDeck")}</p>
											<p className="text-sm font-medium text-[var(--text)] mb-1.5">{record.opponentDeckName || t("record.display.unknownDeck")}</p>
											<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
												{record.opponentSeries || t("record.display.unknownSeries")}
											</span>
										</div>
										{record.notes && (
											<div className="mt-3 p-3 rounded-xl bg-[var(--card-background)] border border-[var(--border)]">
												<p className="text-xs text-[var(--text-secondary)]">
													<span className="font-bold">{t("record.display.notesLabel")}</span>{record.notes}
												</p>
											</div>
										)}
									</div>
									{/* Footer */}
									<div className="px-4 py-2.5 flex items-center justify-end border-t border-[var(--border)]">
										<button
											title={t("record.display.deleteTooltip")}
											onClick={() => setDeleteDialog({ open: true, record: record })}
											className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
											<Trash2 size={15} />
										</button>
									</div>
							</div>
							))}
						</div>
					)}
				</div>
			)}

		{/* ── Unified analysis dialog ────────────────── */}
		{analysisDialogOpen && (
			<div
				className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
				onClick={() => setAnalysisDialogOpen(false)}>
				<div
					className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white"
					onClick={(e) => e.stopPropagation()}>

					{/* Header */}
					<div className="px-5 py-4 bg-[var(--text-muted)] flex items-center justify-between shrink-0">
						<p className="font-bold text-base text-white">{t("record.stats.analysisTitle")}</p>
						<button onClick={() => setAnalysisDialogOpen(false)} className="text-white/70 hover:text-white transition-colors">
							<XIcon size={16} />
						</button>
					</div>

					{/* Tab bar */}
					<div className="px-5 pt-4 shrink-0">
						<div className="flex bg-[var(--card-background)] rounded-xl p-1">
							{[
								{ idx: 0, label: t("record.stats.tabForm") },
								{ idx: 1, label: t("record.stats.tabMySeries") },
								{ idx: 2, label: t("record.stats.tabOpponentSeries") },
								{ idx: 3, label: t("record.stats.tabMatchup") },
							{ idx: 4, label: t("record.stats.tabTournament") },
							{ idx: 5, label: t("record.stats.tabDeck") },
							].map(({ idx, label }) => (
								<button
									key={idx}
									onClick={() => setAnalysisTab(idx)}
									className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-all duration-200 ${
										analysisTab === idx
											? "bg-white text-[var(--text-muted)] shadow-sm"
											: "text-[var(--text-muted)] opacity-50 hover:opacity-80"
									}`}>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Content */}
					<div className="flex-1 overflow-auto p-5">

						{/* ── Tab 0: Recent Form ───────────────────── */}
						{analysisTab === 0 && (
							<div>
								<div className="flex items-center gap-3 mb-2">
									<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.stats.recentFormTitle")}</span>
									<div className="flex-1 border-t border-[var(--border)]" />
								</div>
								<p className="text-xs text-[var(--text-muted)] mb-4">{t("record.stats.recentFormDesc")}</p>
								<div className="flex flex-wrap gap-1.5 mb-4">
									{recentForm.length === 0 ? (
										<p className="text-sm text-[var(--text-muted)]">{t("record.charts.noData")}</p>
									) : recentForm.map((rec, i) => (
										<div
											key={rec._id || i}
											title={new Date(rec.timestamp).toLocaleDateString()}
											className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black select-none ${
												rec.result === "win" ? "bg-[#52b788]"
												: rec.result === "lose" ? "bg-[#e05c5c]"
												: "bg-[#7b8fa1]"}`}>
											{rec.result === "win" ? "W" : rec.result === "lose" ? "L" : "D"}
										</div>
									))}
								</div>
								{currentStreak && (
									<div className="flex flex-wrap gap-2 mb-5">
										<span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
											currentStreak.result === "win"
												? "bg-[rgba(82,183,136,0.12)] text-[#3a9d6e]"
												: currentStreak.result === "lose"
												? "bg-[rgba(224,92,92,0.10)] text-[#c94444]"
												: "bg-[rgba(123,143,161,0.10)] text-[#5a6f80]"}`}>
											{currentStreak.result === "win"
												? t("record.stats.streakWin", { count: currentStreak.count })
												: currentStreak.result === "lose"
												? t("record.stats.streakLose", { count: currentStreak.count })
												: t("record.stats.streakDraw", { count: currentStreak.count })}
										</span>
										<span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--card-background)] text-[var(--text-secondary)]">
											{t("record.stats.longestStreak", { count: longestWinStreak })}
										</span>
									</div>
								)}
								<div className="flex items-center gap-3 mb-3">
									<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.stats.basicSection")}</span>
									<div className="flex-1 border-t border-[var(--border)]" />
								</div>
								<div className="grid grid-cols-2 gap-2">
									{[
										{ label: t("record.stats.totalLabel"), value: totalMatches, color: "text-[var(--text)]" },
										{ label: t("record.stats.winRateLabel"), value: `${winRate}%`, color: "text-[#52b788]" },
										{ label: t("record.stats.winsLabel"), value: wins, color: "text-[#52b788]" },
										{ label: t("record.stats.lossesLabel"), value: losses, color: "text-[#e05c5c]" },
									].map(({ label, value, color }) => (
										<div key={label} className="border border-[var(--border)] rounded-xl p-3 flex flex-col gap-0.5 bg-white/70">
											<span className={`text-2xl font-black ${color}`}>{value}</span>
											<span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
										</div>
									))}
								</div>

								{/* ── Trend chart ──────────────────────── */}
								<div className="flex items-center gap-3 mt-5 mb-2">
									<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.stats.trendTitle")}</span>
									<div className="flex-1 border-t border-[var(--border)]" />
									<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
										{[
											{ key: "month", label: t("record.stats.trendMonth") },
											{ key: "week", label: t("record.stats.trendWeek") },
										].map((opt) => (
											<button
												key={opt.key}
												onClick={() => setTrendPeriod(opt.key)}
												className={`px-2.5 py-1 text-[10px] font-bold border-r border-[var(--border)] last:border-r-0 transition-colors
													${trendPeriod === opt.key
														? "bg-[var(--text)] text-[var(--background)]"
														: "bg-transparent text-[var(--text)] hover:bg-[var(--card-background)]"}`}>
												{opt.label}
											</button>
										))}
									</div>
								</div>
								{trendData.length < 2 ? (
									<p className="text-xs text-center text-[var(--text-muted)] py-4">{t("record.stats.trendNotEnough")}</p>
								) : (() => {
									const cW = 400, cH = 130;
									const pL = 32, pR = 6, pT = 10, pB = 22;
									const iW = cW - pL - pR;
									const iH = cH - pT - pB;
									const maxTotal = Math.max(...trendData.map((d) => d.total));
									const pts = trendData.map((d, i) => ({
										...d,
										x: pL + (trendData.length === 1 ? iW / 2 : (i / (trendData.length - 1)) * iW),
										y: pT + iH - (d.winRate / 100) * iH,
									}));
									const step = trendData.length <= 8 ? 1 : trendData.length <= 14 ? 2 : Math.ceil(trendData.length / 7);
									return (
										<svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" style={{ height: "auto" }}>
											{[0, 50, 100].map((pct) => {
												const gy = pT + iH - (pct / 100) * iH;
												return (
													<g key={pct}>
														<line x1={pL} y1={gy} x2={cW - pR} y2={gy}
															stroke={pct === 50 ? "#a6ceb6" : "#e8f0eb"}
															strokeWidth={pct === 50 ? 1 : 0.5}
															strokeDasharray={pct === 50 ? "4 3" : undefined} />
														<text x={pL - 3} y={gy + 3.5} textAnchor="end" fontSize="7.5" fill="#7b9987">{pct}%</text>
													</g>
												);
											})}
											{pts.map((pt, i) => {
												const bW = Math.min(iW / trendData.length * 0.55, 20);
												const bH = maxTotal > 0 ? (pt.total / maxTotal) * iH * 0.28 : 0;
												return <rect key={i} x={pt.x - bW / 2} y={pT + iH - bH}
													width={bW} height={bH} fill="rgba(166,206,182,0.30)" rx="2" />;
											})}
											<polyline
												points={pts.map((pt) => `${pt.x},${pt.y}`).join(" ")}
												fill="none" stroke="#52675a" strokeWidth="1.8"
												strokeLinejoin="round" strokeLinecap="round" />
											{pts.map((pt, i) => (
												<circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#52675a" stroke="white" strokeWidth="1.2">
													<title>{`${pt.key}  ${pt.winRate.toFixed(0)}%  (${pt.wins}胜 / ${pt.total}局)`}</title>
												</circle>
											))}
											{pts.map((pt, i) => {
												if (i % step !== 0 && i !== pts.length - 1) return null;
												return (
													<text key={i} x={pt.x} y={cH - 4} textAnchor="middle" fontSize="8" fill="#7b9987">
														{pt.label}
													</text>
												);
											})}
										</svg>
									);
								})()}
							</div>
						)}

						{/* ── Tab 1: My Series ─────────────────────── */}
						{(analysisTab === 1 || analysisTab === 2 || analysisTab === 4 || analysisTab === 5) && (() => {
							const baseData = analysisTab === 1 ? mySeriesWinRate
								: analysisTab === 2 ? opponentSeriesWinRate
								: analysisTab === 4 ? tournamentData
								: deckData;
							const desc = analysisTab === 1 ? t("record.stats.mySeriesDesc")
								: analysisTab === 2 ? t("record.stats.opponentSeriesDesc")
								: analysisTab === 4 ? t("record.stats.tournamentDesc")
								: t("record.stats.deckDesc");
							const sorted = [...baseData].sort((a, b) => {
								if (seriesSort === "winRate_desc") return parseFloat(b.winRate) - parseFloat(a.winRate);
								if (seriesSort === "winRate_asc") return parseFloat(a.winRate) - parseFloat(b.winRate);
								if (seriesSort === "wins_desc") return b.wins - a.wins;
								if (seriesSort === "wins_asc") return a.wins - b.wins;
								return b.total - a.total;
							});
							const sortOptions = [
								{ key: "total", label: t("record.stats.sortByTotal") },
								{ key: "winRate_desc", label: t("record.stats.sortByWinRateDesc") },
								{ key: "winRate_asc", label: t("record.stats.sortByWinRateAsc") },
								{ key: "wins_desc", label: t("record.stats.sortByWinsDesc") },
								{ key: "wins_asc", label: t("record.stats.sortByWinsAsc") },
							];
							return (
								<div>
									<div className="flex items-center gap-3 mb-2">
										<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.stats.seriesBreakdownTitle")}</span>
										<div className="flex-1 border-t border-[var(--border)]" />
									</div>
									<p className="text-xs text-[var(--text-muted)] mb-3">{desc}</p>
									<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden mb-4">
										{sortOptions.map((opt) => (
											<button
												key={opt.key}
												onClick={() => setSeriesSort(opt.key)}
												className={`px-3 py-1.5 text-[11px] font-bold border-r border-[var(--border)] last:border-r-0 transition-colors
													${seriesSort === opt.key
														? "bg-[var(--text)] text-[var(--background)]"
														: "bg-transparent text-[var(--text)] hover:bg-[var(--card-background)]"}`}>
												{opt.label}
											</button>
										))}
									</div>
									{sorted.length === 0 ? (
										<p className="text-sm text-center text-[var(--text-muted)] py-8">{t("record.charts.noData")}</p>
									) : (
										<div className="flex flex-col gap-2.5">
											{sorted.map((item) => (
												<div
												key={item.name}
												className={`flex items-center gap-3 ${analysisTab === 5 ? "cursor-pointer rounded-xl px-2 py-1 -mx-2 hover:bg-[var(--card-background)] transition-colors" : ""}`}
												onClick={analysisTab === 5 ? () => { setDeckFilter({ series: item.series, deck: item.deck }); setAnalysisDialogOpen(false); } : undefined}>
													{analysisTab === 5 ? (
																<div className="shrink-0 w-32 flex flex-col gap-0.5 min-w-0">
																	<span className="text-[10px] text-[var(--text-muted)] truncate" title={item.series}>{item.series}</span>
																	<span className="text-xs font-medium text-[var(--text)] truncate" title={item.deck}>{item.deck}</span>
																</div>
															) : (
																<span className="text-xs text-[var(--text)] truncate shrink-0 w-24">{item.name}</span>
															)}
													<div className={`flex-1 flex rounded-full overflow-hidden bg-[var(--card-background)] ${analysisTab === 5 ? "h-8" : "h-5"}`}>
														{item.wins > 0 && <div className="bg-[#52b788] h-full" style={{ width: `${(item.wins / item.total) * 100}%` }} />}
														{item.draws > 0 && <div className="bg-[#7b8fa1] h-full" style={{ width: `${(item.draws / item.total) * 100}%` }} />}
														{item.losses > 0 && <div className="bg-[#e05c5c] h-full" style={{ width: `${(item.losses / item.total) * 100}%` }} />}
													</div>
													<div className="shrink-0 text-right w-20">
														<span className="text-xs font-bold text-[var(--text-muted)]">{item.winRate}%</span>
														<span className="text-[10px] text-[var(--text-muted)] ml-1">{t("record.stats.gamesCount", { count: item.total })}</span>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							);
						})()}

					{/* ── Tab 3: Matchup Matrix ────────────────── */}
						{analysisTab === 3 && (() => {
							const { matrix, myRows, oppCols } = matchupMatrix;
							const cellStyle = (wins, total) => {
								if (!total) return {};
								const hue = Math.round((wins / total) * 120);
								return { backgroundColor: `hsla(${hue}, 55%, 48%, 0.80)` };
							};
							return (
								<div>
									<div className="flex items-center gap-3 mb-2">
										<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.stats.matchupTitle")}</span>
										<div className="flex-1 border-t border-[var(--border)]" />
										{myRows.length > 0 && (
											<button
												onClick={exportMatrixPNG}
												className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors">
												{t("record.stats.exportPNG")}
											</button>
										)}
									</div>
									<p className="text-xs text-[var(--text-muted)] mb-4">{t("record.stats.matchupDesc")}</p>
									{myRows.length === 0 ? (
										<p className="text-sm text-center text-[var(--text-muted)] py-8">{t("record.charts.noData")}</p>
									) : (
										<div className="overflow-x-auto">
											<table className="text-[11px] border-collapse w-full">
												<thead>
													<tr>
														<th className="sticky left-0 bg-white z-10 p-2 min-w-[88px] max-w-[88px]" />
														{oppCols.map((col) => (
															<th key={col} className="p-1.5 font-bold text-center min-w-[56px]">
																<span className="block truncate max-w-[56px] text-[var(--text-secondary)] text-[10px]" title={col}>{col}</span>
															</th>
														))}
													</tr>
												</thead>
												<tbody>
													{myRows.map((row) => (
														<tr key={row} className="border-t border-[var(--border)]">
															<td className="sticky left-0 bg-white z-10 py-2 px-2 font-bold text-[var(--text)] truncate max-w-[88px]" title={row}>
																{row}
															</td>
															{oppCols.map((col) => {
																const cell = matrix[row]?.[col];
																if (!cell) return (
																	<td key={col} className="p-1.5 text-center text-[var(--text-muted)] opacity-30">—</td>
																);
																return (
																	<td
																		key={col}
																		className="p-1 text-center"
																		title={`${(cell.wins / cell.total * 100).toFixed(0)}%  ${cell.wins}胜/${cell.total}局`}>
																		<div
																			className="rounded-md flex flex-col items-center justify-center py-1.5 px-1"
																			style={cellStyle(cell.wins, cell.total)}>
																			<span className="font-black text-white leading-none">
																				{(cell.wins / cell.total * 100).toFixed(0)}%
																			</span>
																			<span className="text-white/70 text-[9px] leading-none mt-0.5">
																				{cell.wins}/{cell.total}
																			</span>
																		</div>
																	</td>
																);
															})}
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
									{/* Legend */}
									<div className="flex items-center gap-2 mt-4 justify-end">
										<span className="text-[10px] text-[var(--text-muted)]">{t("record.stats.matchupLegend")}</span>
										<div className="flex rounded overflow-hidden h-3 w-20">
											{Array.from({ length: 10 }, (_, i) => {
												const hue = Math.round((i / 9) * 120);
												return <div key={i} className="flex-1 h-full" style={{ backgroundColor: `hsla(${hue}, 55%, 48%, 0.80)` }} />;
											})}
										</div>
										<span className="text-[10px] font-bold text-[#3a8a55]">100%</span>
									</div>
								</div>
							);
						})()}

					</div>

					{/* Footer */}
					<div className="px-5 py-3 border-t border-[var(--border)] flex justify-end shrink-0">
						<button
							onClick={() => setAnalysisDialogOpen(false)}
							className="px-5 py-2 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors">
							{t("record.stats.close")}
						</button>
					</div>
				</div>
			</div>
		)}

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

		</div>
	);
};

export default Record;
