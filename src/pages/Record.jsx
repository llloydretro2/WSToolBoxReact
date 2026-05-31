import React, { useState, useMemo, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Combobox } from "@headlessui/react";
import { Trophy, X as XIcon, Swords, User, RotateCcw, ChevronDown, Trash2, TrendingUp, LayoutGrid, Layers, Calendar, ArrowLeftRight, Pencil, Tag, Plus, Check } from "lucide-react";
import { DayPicker } from "react-day-picker";
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

const DAY_PICKER_CLASS = {
	root: "p-4 select-none",
	months: "flex",
	month: "w-[280px]",
	month_caption: "flex items-center justify-between mb-3 px-1",
	caption_label: "text-sm font-bold text-[var(--text)]",
	nav: "flex items-center gap-1",
	button_previous: "p-1.5 rounded-lg hover:bg-[var(--card-background)] text-[var(--text-muted)] transition-colors",
	button_next: "p-1.5 rounded-lg hover:bg-[var(--card-background)] text-[var(--text-muted)] transition-colors",
	chevron: "size-4 fill-current",
	weekdays: "flex mb-1",
	weekday: "w-10 text-center text-[10px] font-bold text-[var(--text-muted)] py-1",
	weeks: "space-y-0.5",
	week: "flex",
	day: "w-10 h-10 p-0.5",
	day_button: "w-full h-full rounded-full text-sm text-[var(--text)] hover:bg-[var(--card-background)] transition-colors flex items-center justify-center",
	today: "font-bold text-[var(--text-muted)]",
	selected: "!bg-[var(--text-muted)] !text-white hover:!bg-[var(--text-secondary)]",
	range_start: "!bg-[var(--text-muted)] !text-white hover:!bg-[var(--text-secondary)]",
	range_end: "!bg-[var(--text-muted)] !text-white hover:!bg-[var(--text-secondary)]",
	range_middle: "!bg-[var(--primary)] !text-[var(--text-secondary)] !rounded-none hover:!bg-[var(--primary-hover)]",
	outside: "opacity-30 pointer-events-none",
	disabled: "opacity-20 cursor-not-allowed pointer-events-none",
	hidden: "invisible",
};

function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, t }) {
	const [open, setOpen] = useState(false);

	const range = { from: startDate || undefined, to: endDate || undefined };

	const handleSelect = (newRange) => {
		onStartChange(newRange?.from ?? null);
		if (newRange?.to) {
			const end = new Date(newRange.to);
			end.setHours(23, 59, 59, 999);
			onEndChange(end);
			if (newRange.from) setOpen(false);
		} else {
			onEndChange(null);
		}
	};

	const fmt = (d) => d ? `${d.getMonth() + 1}月${d.getDate()}日` : null;

	return (
		<div className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-sm hover:bg-[var(--card-background)] transition-colors">
				<Calendar size={14} className="text-[var(--text-muted)] shrink-0" />
				<span className={startDate ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
					{fmt(startDate) ?? t("record.form.startDate")}
				</span>
				<span className="text-[var(--text-muted)] shrink-0 px-0.5">—</span>
				<span className={endDate ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
					{fmt(endDate) ?? t("record.form.endDate")}
				</span>
				{(startDate || endDate) && (
					<button
						onClick={(e) => { e.stopPropagation(); onStartChange(null); onEndChange(null); }}
						className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0">
						<XIcon size={13} />
					</button>
				)}
			</button>

			{open && (
				<>
					<div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
					<div className="absolute top-full mt-2 left-0 z-[101] bg-white rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden">
						<DayPicker
							mode="range"
							selected={range}
							onSelect={handleSelect}
							captionLayout="label"
							formatters={{
								formatCaption: (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`,
								formatWeekdayName: (d) => ["日", "一", "二", "三", "四", "五", "六"][d.getDay()],
							}}
							classNames={DAY_PICKER_CLASS}
						/>
					</div>
				</>
			)}
		</div>
	);
}

DateRangePicker.propTypes = {
	startDate: PropTypes.instanceOf(Date),
	endDate:   PropTypes.instanceOf(Date),
	onStartChange: PropTypes.func.isRequired,
	onEndChange:   PropTypes.func.isRequired,
	t: PropTypes.func.isRequired,
};

function TagSelector({ selected, available, onChange }) {
	const [open, setOpen] = useState(false);
	const unselected = available.filter((t) => !selected.includes(t));

	const remove = (tag) => onChange(selected.filter((t) => t !== tag));
	const add    = (tag) => { onChange([...selected, tag]); setOpen(false); };

	return (
		<div className="relative">
			<div className="flex flex-wrap gap-1.5 min-h-[36px] border border-[var(--border)] rounded-lg px-2 py-1.5 bg-transparent">
				{selected.map((tag) => (
					<span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--card-background)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-muted)]">
						{tag}
						<button type="button" onClick={() => remove(tag)} className="hover:text-[var(--reset)] transition-colors"><XIcon size={10} /></button>
					</span>
				))}
				{unselected.length > 0 && (
					<button type="button" onClick={() => setOpen((v) => !v)}
						className="flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-[var(--border)] text-[11px] text-[var(--text-muted)] hover:bg-[var(--card-background)] transition-colors">
						<Plus size={10} /> 添加
					</button>
				)}
			</div>
			{open && unselected.length > 0 && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
					<div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-xl shadow-lg border border-[var(--border)] overflow-hidden min-w-[140px]">
						{unselected.map((tag) => (
							<button key={tag} type="button" onClick={() => add(tag)}
								className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
								{tag}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

TagSelector.propTypes = {
	selected:  PropTypes.arrayOf(PropTypes.string).isRequired,
	available: PropTypes.arrayOf(PropTypes.string).isRequired,
	onChange:  PropTypes.func.isRequired,
};

const Record = () => {
	const { t } = useLocale();
	const { user } = useAuth();

	const [rawRecords, setRawRecords] = useState([]);
	const [loading, setLoading] = useState(true);
	const [tabValue, setTabValue] = useState(0);
	const hasFetchedRef = useRef(false);
	const [datePreset, setDatePreset] = useState("all");
	const [formState, setFormState] = useState({
		playerDeckName: "",
		opponentDeckName: "",
		playerSeries: "",
		opponentSeries: "",
		notes: "",
		result: "",
		goesFirst: null,
		tags: [],
	});
	const [editDialog, setEditDialog] = useState({ open: false, record: null });
	const [editFormState, setEditFormState] = useState({});

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
				"notes",
				"result",
				"startDate",
				"endDate",
				"tabValue",
				"datePreset",
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
				if (v === 1) { getHistory(); fetchTags(); }
			}
			if (restored.datePreset && restored.datePreset !== "custom") {
				// 时间相对预设在恢复时重新计算，不沿用旧的日期值
				setDatePreset(restored.datePreset);
			} else if (restored.datePreset === "custom") {
				setDatePreset("custom");
				// startDate/endDate 已由上方逻辑恢复
			}
		} catch (err) {
			console.warn("Record: failed to restore per-field draft", err);
		}
		// 清理已废弃的 tournamentName localStorage key
		try { localStorage.removeItem(`${storagePrefix}tournamentName`); } catch (e) { void e; }
	}, []);
	const [deleteDialog, setDeleteDialog] = useState({ open: false, record: null });
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [startDate, setStartDate] = useState(null);
	const [endDate, setEndDate] = useState(null);

	// 挂载时加载标签库（创建表单 Tab 0 也需要）
	useEffect(() => { fetchTags(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

	// 自定义日期变更时自动向服务器重新请求
	useEffect(() => {
		if (datePreset === "custom" && hasFetchedRef.current) {
			setLoading(true);
			getHistory({ start: startDate, end: endDate });
		}
	}, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

	const applyPreset = (preset) => {
		setDatePreset(preset);
		try { localStorage.setItem(`${storagePrefix}datePreset`, JSON.stringify(preset)); } catch (e) { void e; }
		let start = null, end = null;
		if (preset === "all") {
			setAndSaveStartDate(null);
			setAndSaveEndDate(null);
		} else if (preset === "7d") {
			end = new Date(); end.setHours(23, 59, 59, 999);
			start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
			setAndSaveStartDate(start); setAndSaveEndDate(end);
		} else if (preset === "30d") {
			end = new Date(); end.setHours(23, 59, 59, 999);
			start = new Date(); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
			setAndSaveStartDate(start); setAndSaveEndDate(end);
		}
		// 非 custom 预设立即用新日期请求服务器
		if (preset !== "custom") {
			setLoading(true);
			getHistory({ start, end });
		}
	};

	// 日期过滤由服务端完成，rawRecords 已是过滤后结果
	const records = rawRecords;

	// 标签管理
	const [tags, setTags] = useState([]);
	const [tagsPanel, setTagsPanel] = useState(false);
	const [newTagInput, setNewTagInput] = useState("");
	const [editingTag, setEditingTag] = useState(null);
	const [editingTagValue, setEditingTagValue] = useState("");
	const [deletingTag, setDeletingTag] = useState(null);

	const fetchTags = async () => {
		try {
			const res = await apiRequest("/api/tags");
			setTags(await res.json());
		} catch (err) {
			console.error("获取标签失败:", err);
		}
	};

	const handleCreateTag = async () => {
		if (!newTagInput.trim()) return;
		try {
			const res = await apiRequest("/api/tags", {
				method: "POST",
				body: JSON.stringify({ name: newTagInput.trim() }),
			});
			if (res.status === 409) { showToast(t("record.tags.existsError"), "error"); return; }
			const data = await res.json();
			setTags((prev) => [...prev, data.name].sort());
			setNewTagInput("");
		} catch (err) {
			console.error("创建标签失败:", err);
			showToast(t("record.tags.createError"), "error");
		}
	};

	const handleDeleteTag = async (name) => {
		try {
			await apiRequest(`/api/tags/${encodeURIComponent(name)}`, { method: "DELETE" });
			setTags((prev) => prev.filter((t) => t !== name));
			setRawRecords((prev) => prev.map((r) => ({ ...r, tags: (r.tags || []).filter((tg) => tg !== name) })));
			setDeletingTag(null);
			showToast(t("record.tags.deleteSuccess"));
		} catch (err) {
			console.error("删除标签失败:", err);
			showToast(t("record.tags.deleteError"), "error");
		}
	};

	const handleRenameTag = async (oldName) => {
		const newName = editingTagValue.trim();
		if (!newName || newName === oldName) { setEditingTag(null); return; }
		try {
			await apiRequest("/api/tags/rename", {
				method: "PUT",
				body: JSON.stringify({ oldName, newName }),
			});
			setTags((prev) => prev.map((t) => t === oldName ? newName : t).sort());
			setRawRecords((prev) => prev.map((r) => ({ ...r, tags: (r.tags || []).map((tg) => tg === oldName ? newName : tg) })));
			setEditingTag(null);
			showToast(t("record.tags.renameSuccess"));
		} catch (err) {
			if (err?.status === 409) showToast(t("record.tags.existsError"), "error");
			else showToast(t("record.tags.renameError"), "error");
			setEditingTag(null);
		}
	};

	// 批量重命名对话框
	const [renameDialog, setRenameDialog] = useState({ open: false, field: "playerDeckName", oldValue: "", newValue: "" });
	const [toast, setToast] = useState(null);

	const showToast = (message, type = "success") => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	};

	const handleBatchRename = async () => {
		const { field, oldValue, newValue } = renameDialog;
		if (!oldValue.trim() || !newValue.trim()) return;
		try {
			const res = await apiRequest("/api/matches/rename", {
				method: "PUT",
				body: JSON.stringify({ field, oldValue: oldValue.trim(), newValue: newValue.trim() }),
			});
			const data = await res.json();
			setRenameDialog({ open: false, field: "playerDeckName", oldValue: "", newValue: "" });
			setLoading(true);
			getHistory();
			showToast(t("record.rename.success", { count: data.modifiedCount }));
		} catch (err) {
			console.error("批量重命名失败:", err);
			showToast(t("record.rename.error"), "error");
		}
	};

	const openEdit = (record) => {
		setEditFormState({
			playerDeckName:   record.playerDeckName   || "",
			opponentDeckName: record.opponentDeckName || "",
			playerSeries:     record.playerSeries     || "",
			opponentSeries:   record.opponentSeries   || "",
			result:           record.result           || "",
			notes:            record.notes            || "",
			goesFirst:        record.goesFirst        ?? null,
			tags:             record.tags             || [],
		});
		setEditDialog({ open: true, record });
	};

	const handleSaveEdit = async () => {
		if (!editDialog.record) return;
		try {
			const res = await apiRequest(`/api/matches/update/${editDialog.record._id}`, {
				method: "PUT",
				body: JSON.stringify(editFormState),
			});
			const updated = await res.json();
			setRawRecords((prev) => prev.map((r) => r._id === updated._id ? updated : r));
			setEditDialog({ open: false, record: null });
			showToast(t("record.edit.success"));
		} catch (err) {
			console.error("编辑记录失败:", err);
			showToast(t("record.edit.error"), "error");
		}
	};

	// 分析对话框
	const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
	const [analysisTab, setAnalysisTab] = useState(0);
	const [seriesSort, setSeriesSort] = useState("total");
	const [trendPeriod, setTrendPeriod] = useState("month");
	const [deckFilter, setDeckFilter] = useState(null);
	const [tagFilter, setTagFilter] = useState(null);
	const [visibleCount, setVisibleCount] = useState(20);
	const [searchQuery, setSearchQuery] = useState("");

	const filteredRecords = useMemo(() => {
		let result = records;
		if (deckFilter) {
			result = result.filter(
				(rec) =>
					(rec.playerSeries || "") === deckFilter.series &&
					(rec.playerDeckName || "") === deckFilter.deck
			);
		}
		if (tagFilter) {
			result = result.filter((rec) => (rec.tags || []).includes(tagFilter));
		}
		return result;
	}, [records, deckFilter, tagFilter]);

	const searchedRecords = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return filteredRecords;
		return filteredRecords.filter((rec) =>
			[rec.playerDeckName, rec.opponentDeckName,
			 rec.playerSeries, rec.opponentSeries, rec.notes,
			 ...(rec.tags || [])].some((v) => v?.toLowerCase().includes(q))
		);
	}, [filteredRecords, searchQuery]);

	// 过滤条件变化时重置分页
	useEffect(() => { setVisibleCount(20); }, [tagFilter, deckFilter, records, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

	const totalMatches = searchedRecords.length;

	const wins = useMemo(
		() => searchedRecords.filter((record) => record.result === "win").length,
		[searchedRecords]
	);
	const losses = useMemo(
		() => searchedRecords.filter((record) => record.result === "lose").length,
		[searchedRecords]
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
	}, [searchedRecords, t]);

	const opponentSeriesWinRate = useMemo(() => {
		const unknownLabel = t("record.display.unknownSeries");
		const map = {};
		searchedRecords.forEach((rec) => {
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
	}, [searchedRecords, t]);

	const recentForm = useMemo(() => searchedRecords.slice(0, 15).reverse(), [searchedRecords]);

	const currentStreak = useMemo(() => {
		if (!searchedRecords.length) return null;
		const first = searchedRecords[0].result;
		let count = 0;
		for (const rec of searchedRecords) {
			if (rec.result === first) count++;
			else break;
		}
		return { result: first, count };
	}, [searchedRecords]);

	const longestWinStreak = useMemo(() => {
		if (!searchedRecords.length) return 0;
		let max = 0, cur = 0;
		const sorted = [...searchedRecords].sort(
			(a, b) => new Date(a.timestamp) - new Date(b.timestamp)
		);
		for (const rec of sorted) {
			if (rec.result === "win") { cur++; if (cur > max) max = cur; }
			else cur = 0;
		}
		return max;
	}, [searchedRecords]);

	const trendData = useMemo(() => {
		if (!searchedRecords.length) return [];
		const groups = {};
		searchedRecords.forEach((rec) => {
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
	}, [searchedRecords, trendPeriod]);

	const matchupMatrix = useMemo(() => {
		const unknownLabel = t("record.display.unknownSeries");
		const matrix = {};
		const mySeriesSet = new Set();
		const oppSeriesSet = new Set();
		searchedRecords.forEach((rec) => {
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
	}, [searchedRecords, t]);

	const deckData = useMemo(() => {
		const unknownSeries = t("record.display.unknownSeries");
		const unknownDeck = t("record.display.unknownDeck");
		const map = {};
		searchedRecords.forEach((rec) => {
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
	}, [searchedRecords, t]);

	const tournamentData = useMemo(() => {
		const map = {};
		searchedRecords.forEach((rec) => {
			if (!rec.tags?.length) return;
			rec.tags.forEach((tag) => {
				if (!map[tag]) map[tag] = { total: 0, wins: 0, losses: 0, draws: 0 };
				map[tag].total++;
				if (rec.result === "win") map[tag].wins++;
				else if (rec.result === "lose") map[tag].losses++;
				else map[tag].draws++;
			});
		});
		return Object.entries(map)
			.map(([name, s]) => ({
				name, ...s,
				winRate: s.total > 0 ? ((s.wins / s.total) * 100).toFixed(1) : "0.0",
			}))
			.sort((a, b) => b.total - a.total);
	}, [searchedRecords]);

	const resetForm = () => {
		setFormState({
			playerDeckName: "",
			playerSeries: "",
			opponentDeckName: "",
			opponentSeries: "",
			result: "",
			notes: "",
			goesFirst: null,
			tags: [],
		});
		setResetDialogOpen(false);

		// 清除本地存储的各字段草稿
		try {
			const keys = [
				"playerDeckName",
				"opponentDeckName",
				"playerSeries",
				"opponentSeries",
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

			setRawRecords((prev) =>
				prev.filter((record) => record._id !== deleteDialog.record._id)
			);
			setDeleteDialog({ open: false, record: null });
			getHistory({ start: startDate, end: endDate });
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

		const cs = getComputedStyle(document.documentElement);
		const cText          = cs.getPropertyValue("--text").trim();
		const cTextSecondary = cs.getPropertyValue("--text-secondary").trim();
		const cTextMuted     = cs.getPropertyValue("--text-muted").trim();
		const cBorder        = cs.getPropertyValue("--border").trim();
		const cBackground    = cs.getPropertyValue("--background").trim();
		const cPrimary       = cs.getPropertyValue("--primary").trim();

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
		ctx.fillStyle = cTextSecondary;
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
			ctx.fillStyle = cTextMuted;
			ctx.font = colFont;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(truncate(col, 72, colFont), 0, 0);
			ctx.restore();
		});

		// Grid lines
		ctx.strokeStyle = cBorder;
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
			ctx.fillStyle = cText;
			ctx.font = rowLabelFont;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(truncate(row, rowHeaderW - 8, rowLabelFont), pad, cy);

			// Cells
			oppCols.forEach((col, ci) => {
				const x = startX + ci * cellW;
				const cell = matrix[row]?.[col];

				if (!cell) {
					ctx.fillStyle = cBackground;
					roundedRect(x + 3, y + 4, cellW - 6, cellH - 8, 6);
					ctx.fill();
					ctx.fillStyle = cPrimary;
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
		ctx.fillStyle = cTextMuted;
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

	const getHistory = async ({ start = startDate, end = endDate } = {}) => {
		try {
			const params = new URLSearchParams();
			if (start) params.set("startDate", new Date(start).toISOString());
			if (end)   params.set("endDate",   new Date(end).toISOString());
			const qs = params.toString();
			const res = await apiRequest(`/api/matches/history${qs ? `?${qs}` : ""}`);
			const data = await res.json();
			setRawRecords(data);
			hasFetchedRef.current = true;
		} catch (err) {
			console.error("Error fetching match records:", err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">
			{/* ── Toast ───────────────────────────────── */}
			{toast && (
				<div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold text-white transition-all ${
					toast.type === "error" ? "bg-[var(--error)]" : "bg-[var(--text-muted)]"
				}`}>
					{toast.message}
				</div>
			)}
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
							if (index === 1 && !hasFetchedRef.current) getHistory();
							if (index === 1) fetchTags();
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
						data.goesFirst = formState.goesFirst;
						data.tags = formState.tags;
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
							setRawRecords((prev) => [newRecord, ...prev]);
							setTabValue(1);
							setLoading(true);
							getHistory({ start: startDate, end: endDate });
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
										? "bg-[var(--success)] border-[var(--success)] text-white"
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
										? "bg-[var(--error)] border-[var(--error)] text-white"
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

					{/* ── Goes first ────────────────────────────────── */}
					<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] block mb-3">
							{t("record.form.goesFirst.label")}
						</span>
						<div className="flex gap-2">
							{[
								{ value: true,  label: t("record.form.goesFirst.first") },
								{ value: false, label: t("record.form.goesFirst.second") },
								{ value: null,  label: t("record.form.goesFirst.unset") },
							].map(({ value, label }) => (
								<button
									key={String(value)}
									type="button"
									onClick={() => updateFormField("goesFirst", formState.goesFirst === value ? null : value)}
									className={`flex-1 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
										formState.goesFirst === value
											? "bg-[var(--text-muted)] border-[var(--text-muted)] text-white"
											: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
									}`}>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* ── Match details ─────────────────────────────── */}
					<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md flex flex-col gap-4">
						{tags.length > 0 && (
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.tagsLabel")}</label>
								<TagSelector
									selected={formState.tags}
									available={tags}
									onChange={(v) => updateFormField("tags", v)} />
							</div>
						)}
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
					<div className="mb-5">
						<div className="flex items-center gap-2 flex-wrap">
							{[
								{ key: "all",    label: t("record.filter.all") },
								{ key: "7d",     label: t("record.filter.last7") },
								{ key: "30d",    label: t("record.filter.last30") },
								{ key: "custom", label: t("record.filter.custom") },
							].map(({ key, label }) => (
								<button
									key={key}
									onClick={() => applyPreset(key)}
									className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
										datePreset === key
											? "bg-[var(--text-muted)] text-white"
											: "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
									}`}>
									{label}
								</button>
							))}
							<div className="ml-auto flex items-center gap-1.5">
								<button
									onClick={() => setTagsPanel((v) => !v)}
									title={t("record.tags.panelButton")}
									className={`p-1.5 rounded-full border transition-colors ${
										tagsPanel
											? "bg-[var(--text-muted)] border-[var(--text-muted)] text-white"
											: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
									}`}>
									<Tag size={14} />
								</button>
								<button
									onClick={() => setRenameDialog((d) => ({ ...d, open: true }))}
									title={t("record.rename.button")}
									className="p-1.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)] transition-colors">
									<ArrowLeftRight size={14} />
								</button>
								<button
									onClick={() => { setLoading(true); getHistory({ start: startDate, end: endDate }); }}
									title={t("record.form.refreshButton")}
									className="p-1.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)] transition-colors">
									<RotateCcw size={14} />
								</button>
							</div>
						</div>

						{datePreset === "custom" && (
							<div className="mt-3">
								<DateRangePicker
									startDate={startDate}
									endDate={endDate}
									onStartChange={setAndSaveStartDate}
									onEndChange={setAndSaveEndDate}
									t={t}
								/>
							</div>
						)}

						{/* ── Search input ─────────────────────────── */}
						<div className="relative mt-3">
							<input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={t("record.search.placeholder")}
								className="w-full bg-transparent border border-[var(--border)] rounded-xl px-4 py-2 pr-8 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
							/>
							{searchQuery && (
								<button
									onClick={() => setSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
									<XIcon size={13} />
								</button>
							)}
						</div>

						{/* ── Tags panel ───────────────────────────── */}
						{tagsPanel && (
							<div className="mt-3 border border-[var(--border)] rounded-2xl p-4 bg-white/70 backdrop-blur-md">
								<div className="flex items-center gap-3 mb-3">
									<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.tags.panelTitle")}</span>
									<div className="flex-1 border-t border-[var(--border)]" />
								</div>

								{/* Create new tag */}
								<div className="flex gap-2 mb-3">
									<input
										value={newTagInput}
										onChange={(e) => setNewTagInput(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
										placeholder={t("record.tags.inputPlaceholder")}
										className="flex-1 bg-transparent border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors" />
									<button
										onClick={handleCreateTag}
										disabled={!newTagInput.trim()}
										className="px-3 py-1.5 rounded-lg bg-[var(--text-muted)] text-white hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
										<Plus size={14} />
									</button>
								</div>

								{/* Tag list */}
								{tags.length === 0 ? (
									<p className="text-sm text-[var(--text-muted)] text-center py-2">{t("record.tags.empty")}</p>
								) : (
									<div className="flex flex-col gap-1.5">
										{tags.map((tag) => (
											<div key={tag} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card-background)]">
												{editingTag === tag ? (
													<input
														autoFocus
														value={editingTagValue}
														onChange={(e) => setEditingTagValue(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === "Enter") handleRenameTag(tag);
															if (e.key === "Escape") setEditingTag(null);
														}}
														className="flex-1 bg-transparent border-b border-[var(--text-muted)] text-sm text-[var(--text)] focus:outline-none" />
												) : deletingTag === tag ? (
													<span className="flex-1 text-sm font-medium text-[var(--error)]">
														{t("record.tags.confirmDelete", { name: tag })}
													</span>
												) : (
													<span className="flex-1 text-sm font-medium text-[var(--text)]">{tag}</span>
												)}

												{editingTag === tag ? (
													<>
														<button onClick={() => handleRenameTag(tag)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"><Check size={13} /></button>
														<button onClick={() => setEditingTag(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"><XIcon size={13} /></button>
													</>
												) : deletingTag === tag ? (
													<>
														<button onClick={() => handleDeleteTag(tag)} className="text-[11px] font-bold text-[var(--error)] hover:text-red-700 transition-colors">{t("record.tags.yes")}</button>
														<button onClick={() => setDeletingTag(null)} className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">{t("record.tags.no")}</button>
													</>
												) : (
													<>
														<button onClick={() => { setEditingTag(tag); setEditingTagValue(tag); setDeletingTag(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"><Pencil size={13} /></button>
														<button onClick={() => { setDeletingTag(tag); setEditingTag(null); }} className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors"><Trash2 size={13} /></button>
													</>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</div>

					{/* ── Edit dialog ───────────────────────────── */}
				{editDialog.open && (
					<div
						className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
						onClick={() => setEditDialog({ open: false, record: null })}>
						<div
							className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
							onClick={(e) => e.stopPropagation()}>
							<p className="text-base font-bold text-[var(--text)]">{t("record.edit.title")}</p>

							{/* Result */}
							<div>
								<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] block mb-2">{t("record.form.resultLabel")}</span>
								<div className="flex gap-2">
									{[
										{ value: "win",        label: t("record.form.result.win") },
										{ value: "lose",       label: t("record.form.result.lose") },
										{ value: "doubleLose", label: t("record.form.result.doubleLose") },
									].map(({ value, label }) => (
										<button key={value} type="button"
											onClick={() => setEditFormState((s) => ({ ...s, result: value }))}
											className={`flex-1 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
												editFormState.result === value
													? value === "win" ? "bg-[var(--success)] border-[var(--success)] text-white"
													: value === "lose" ? "bg-[var(--error)] border-[var(--error)] text-white"
													: "bg-[#7b8fa1] border-[#7b8fa1] text-white"
													: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
											}`}>{label}</button>
									))}
								</div>
							</div>

							{/* Goes first */}
							<div>
								<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] block mb-2">{t("record.form.goesFirst.label")}</span>
								<div className="flex gap-2">
									{[
										{ value: true,  label: t("record.form.goesFirst.first") },
										{ value: false, label: t("record.form.goesFirst.second") },
										{ value: null,  label: t("record.form.goesFirst.unset") },
									].map(({ value, label }) => (
										<button key={String(value)} type="button"
											onClick={() => setEditFormState((s) => ({ ...s, goesFirst: value }))}
											className={`flex-1 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
												editFormState.goesFirst === value
													? "bg-[var(--text-muted)] border-[var(--text-muted)] text-white"
													: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
											}`}>{label}</button>
									))}
								</div>
							</div>

							{/* My deck */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.myDeckName")}</label>
								<input value={editFormState.playerDeckName || ""}
									onChange={(e) => setEditFormState((s) => ({ ...s, playerDeckName: e.target.value }))}
									className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)] transition-colors" />
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.mySeries")}</label>
								<SeriesCombobox id="edit-playerSeries" name="edit-playerSeries" label=""
									value={editFormState.playerSeries || ""}
									onChange={(key) => setEditFormState((s) => ({ ...s, playerSeries: key ?? "" }))} />
							</div>

							{/* Opponent deck */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.opponentDeckName")}</label>
								<input value={editFormState.opponentDeckName || ""}
									onChange={(e) => setEditFormState((s) => ({ ...s, opponentDeckName: e.target.value }))}
									className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)] transition-colors" />
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.opponentSeries")}</label>
								<SeriesCombobox id="edit-opponentSeries" name="edit-opponentSeries" label=""
									value={editFormState.opponentSeries || ""}
									onChange={(key) => setEditFormState((s) => ({ ...s, opponentSeries: key ?? "" }))} />
							</div>

							{/* Tags */}
							{tags.length > 0 && (
								<div className="flex flex-col gap-1.5">
									<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.tagsLabel")}</label>
									<TagSelector
										selected={editFormState.tags || []}
										available={tags}
										onChange={(v) => setEditFormState((s) => ({ ...s, tags: v }))} />
								</div>
							)}

							{/* Notes */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.form.notes")}</label>
								<textarea rows={2} value={editFormState.notes || ""}
									onChange={(e) => setEditFormState((s) => ({ ...s, notes: e.target.value }))}
									className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--text-muted)] transition-colors resize-none" />
							</div>

							<div className="flex gap-2">
								<button onClick={() => setEditDialog({ open: false, record: null })}
									className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
									{t("record.edit.cancel")}
								</button>
								<button onClick={handleSaveEdit}
									disabled={!editFormState.result}
									className="flex-1 py-2 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
									{t("record.edit.confirm")}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ── Rename dialog ─────────────────────────── */}
					{renameDialog.open && (
						<div
							className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
							onClick={() => setRenameDialog((d) => ({ ...d, open: false }))}>
							<div
								className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4"
								onClick={(e) => e.stopPropagation()}>
								<div>
									<p className="text-base font-bold text-[var(--text)] mb-1">{t("record.rename.title")}</p>
									<p className="text-xs text-[var(--text-muted)]">{t("record.rename.subtitle")}</p>
								</div>
								<div className="flex flex-col gap-3">
									<div className="flex flex-col gap-1.5">
										<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.rename.field")}</label>
										<div className="grid grid-cols-2 gap-1.5">
											{[
												{ value: "playerDeckName",   label: t("record.rename.fields.playerDeckName") },
												{ value: "opponentDeckName", label: t("record.rename.fields.opponentDeckName") },
												{ value: "playerSeries",     label: t("record.rename.fields.playerSeries") },
												{ value: "opponentSeries",   label: t("record.rename.fields.opponentSeries") },
											].map(({ value, label }) => (
												<button
													key={value}
													onClick={() => setRenameDialog((d) => ({ ...d, field: value }))}
													className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-colors text-left ${
														renameDialog.field === value
															? "bg-[var(--text-muted)] text-white"
															: "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
													}`}>
													{label}
												</button>
											))}
										</div>
									</div>
									<div className="flex flex-col gap-1.5">
										<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.rename.oldValue")}</label>
										<input
											value={renameDialog.oldValue}
											onChange={(e) => setRenameDialog((d) => ({ ...d, oldValue: e.target.value }))}
											placeholder={t("record.rename.oldPlaceholder")}
											className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors" />
									</div>
									<div className="flex flex-col gap-1.5">
										<label className="text-[11px] font-bold text-[var(--text-secondary)]">{t("record.rename.newValue")}</label>
										<input
											value={renameDialog.newValue}
											onChange={(e) => setRenameDialog((d) => ({ ...d, newValue: e.target.value }))}
											placeholder={t("record.rename.newPlaceholder")}
											className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors" />
									</div>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => setRenameDialog((d) => ({ ...d, open: false }))}
										className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
										{t("record.rename.cancel")}
									</button>
									<button
										onClick={handleBatchRename}
										disabled={!renameDialog.oldValue.trim() || !renameDialog.newValue.trim()}
										className="flex-1 py-2 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
										{t("record.rename.confirm")}
									</button>
								</div>
							</div>
						</div>
					)}

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
					) : searchedRecords.length === 0 ? (
						<div className="text-center py-12 px-4 border border-[var(--border)] rounded-2xl bg-[var(--card-background)]">
							<p className="text-base font-bold text-[var(--text)] mb-1">{t("record.display.noFilterResults")}</p>
							<button onClick={() => { setDeckFilter(null); setTagFilter(null); }} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mt-1">
								{t("record.display.clearFilter")}
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{/* ── Tag filter pills ───────────────────── */}
							{tags.length > 0 && (
								<div className="flex flex-wrap gap-1.5">
									{tags.map((tag) => (
										<button
											key={tag}
											onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
											className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
												tagFilter === tag
													? "bg-[var(--text-muted)] text-white"
													: "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
											}`}>
											{tag}
										</button>
									))}
								</div>
							)}

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
									{ value: wins, label: t("record.stats.winsLabel"), color: "text-[var(--success)]" },
									{ value: losses, label: t("record.stats.lossesLabel"), color: "text-[var(--error)]" },
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
									{ tab: 4, Icon: Trophy,      label: t("record.stats.tabTags") },
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
						{searchedRecords.slice(0, visibleCount).map((record) => (
								<div
									key={record._id}
									className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
									{/* Result header */}
									<div className={`px-4 py-3 flex items-center justify-between text-white ${
										record.result === "win" ? "bg-[var(--success)]"
										: record.result === "lose" ? "bg-[var(--error)]"
										: "bg-[#7b8fa1]"
									}`}>
										<div className="flex items-center gap-2">
											<Trophy size={15} />
											<span className="font-bold text-sm">
												{record.result === "win" ? t("record.form.result.win")
													: record.result === "lose" ? t("record.form.result.lose")
													: t("record.form.result.doubleLose")}
											</span>
											{record.goesFirst !== null && record.goesFirst !== undefined && (
												<span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20">
													{record.goesFirst ? t("record.form.goesFirst.first") : t("record.form.goesFirst.second")}
												</span>
											)}
										</div>
										<span className="text-xs opacity-90">{new Date(record.timestamp).toLocaleDateString()}</span>
									</div>
									{/* Card body */}
									<div className="p-4">
										{record.tags?.length > 0 && (
											<div className="flex flex-wrap gap-1 justify-center mb-3">
												{record.tags.map((tag) => (
													<span key={tag} className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--card-background)] text-[var(--text-secondary)] border border-[var(--border)]">
														{tag}
													</span>
												))}
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
									<div className="px-4 py-2.5 flex items-center justify-between border-t border-[var(--border)]">
										<button
											title={t("record.edit.button")}
											onClick={() => openEdit(record)}
											className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
											<Pencil size={15} />
										</button>
										<button
											title={t("record.display.deleteTooltip")}
											onClick={() => setDeleteDialog({ open: true, record: record })}
											className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
											<Trash2 size={15} />
										</button>
									</div>
							</div>
							))}
						{searchedRecords.length > visibleCount && (
							<button
								onClick={() => setVisibleCount((v) => v + 20)}
								className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--card-background)] transition-colors">
								{t("record.display.loadMore", { current: visibleCount, total: searchedRecords.length })}
							</button>
						)}
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
							{ idx: 4, label: t("record.stats.tabTags") },
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
												rec.result === "win" ? "bg-[var(--success)]"
												: rec.result === "lose" ? "bg-[var(--error)]"
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
										{ label: t("record.stats.winRateLabel"), value: `${winRate}%`, color: "text-[var(--success)]" },
										{ label: t("record.stats.winsLabel"), value: wins, color: "text-[var(--success)]" },
										{ label: t("record.stats.lossesLabel"), value: losses, color: "text-[var(--error)]" },
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
															stroke={pct === 50 ? "var(--primary)" : "var(--border)"}
															strokeWidth={pct === 50 ? 1 : 0.5}
															strokeDasharray={pct === 50 ? "4 3" : undefined} />
														<text x={pL - 3} y={gy + 3.5} textAnchor="end" fontSize="7.5" fill="var(--text-muted)">{pct}%</text>
													</g>
												);
											})}
											{pts.map((pt, i) => {
												const bW = Math.min(iW / trendData.length * 0.55, 20);
												const bH = maxTotal > 0 ? (pt.total / maxTotal) * iH * 0.28 : 0;
												return <rect key={i} x={pt.x - bW / 2} y={pT + iH - bH}
													width={bW} height={bH} fill="var(--card-background)" rx="2" />;
											})}
											<polyline
												points={pts.map((pt) => `${pt.x},${pt.y}`).join(" ")}
												fill="none" stroke="var(--text-muted)" strokeWidth="1.8"
												strokeLinejoin="round" strokeLinecap="round" />
											{pts.map((pt, i) => (
												<circle key={i} cx={pt.x} cy={pt.y} r="3" fill="var(--text-muted)" stroke="white" strokeWidth="1.2">
													<title>{`${pt.key}  ${pt.winRate.toFixed(0)}%  (${pt.wins}胜 / ${pt.total}局)`}</title>
												</circle>
											))}
											{pts.map((pt, i) => {
												if (i % step !== 0 && i !== pts.length - 1) return null;
												return (
													<text key={i} x={pt.x} y={cH - 4} textAnchor="middle" fontSize="8" fill="var(--text-muted)">
														{pt.label}
													</text>
												);
											})}
										</svg>
									);
								})()}
							</div>
						)}

						{/* ── Goes first stats (Tab 0) ─────────────── */}
						{analysisTab === 0 && (() => {
							const firstRecs  = records.filter((r) => r.goesFirst === true);
							const secondRecs = records.filter((r) => r.goesFirst === false);
							const rate = (recs) => recs.length === 0 ? null : Math.round(recs.filter((r) => r.result === "win").length / recs.length * 100);
							const firstRate  = rate(firstRecs);
							const secondRate = rate(secondRecs);
							if (firstRecs.length === 0 && secondRecs.length === 0) return null;
							return (
								<div className="mt-4 border border-[var(--border)] rounded-2xl p-4 bg-white/70">
									<div className="flex items-center gap-3 mb-3">
										<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("record.stats.goesFirstTitle")}</span>
										<div className="flex-1 border-t border-[var(--border)]" />
									</div>
									<div className="grid grid-cols-2 gap-3">
										{[
											{ label: t("record.form.goesFirst.first"),  recs: firstRecs,  rate: firstRate },
											{ label: t("record.form.goesFirst.second"), recs: secondRecs, rate: secondRate },
										].map(({ label, recs, rate: r }) => (
											<div key={label} className="text-center p-3 rounded-xl bg-[var(--card-background)]">
												<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">{label}</p>
												<p className="text-2xl font-black text-[var(--text-muted)]">{r === null ? "—" : `${r}%`}</p>
												<p className="text-[11px] text-[var(--text-muted)]">{recs.length} {t("record.stats.matchesUnit")}</p>
											</div>
										))}
									</div>
								</div>
							);
						})()}

						{/* ── Tab 1: My Series ─────────────────────── */}
						{(analysisTab === 1 || analysisTab === 2 || analysisTab === 4 || analysisTab === 5) && (() => {
							const baseData = analysisTab === 1 ? mySeriesWinRate
								: analysisTab === 2 ? opponentSeriesWinRate
								: analysisTab === 4 ? tournamentData
								: deckData;
							const desc = analysisTab === 1 ? t("record.stats.mySeriesDesc")
								: analysisTab === 2 ? t("record.stats.opponentSeriesDesc")
								: analysisTab === 4 ? t("record.stats.tagsDesc")
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
														{item.wins > 0 && <div className="bg-[var(--success)] h-full" style={{ width: `${(item.wins / item.total) * 100}%` }} />}
														{item.draws > 0 && <div className="bg-[#7b8fa1] h-full" style={{ width: `${(item.draws / item.total) * 100}%` }} />}
														{item.losses > 0 && <div className="bg-[var(--error)] h-full" style={{ width: `${(item.losses / item.total) * 100}%` }} />}
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
