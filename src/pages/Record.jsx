import React, { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, Suspense, lazy } from "react";
import PropTypes from "prop-types";
import { Trophy, X as XIcon, Swords, User, RotateCcw, ChevronDown, Trash2, TrendingUp, LayoutGrid, Layers, ArrowLeftRight, Pencil, Tag, Plus, Check, Rows3, Download } from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import {
	DRAFT_KEY, VIEW_KEY, CLEAR_ON_SUBMIT, EMPTY_FORM,
	emptyForm, writeJSON, presetRange, clearLegacyKeys, loadPersisted, draftToFormState,
} from "../utils/recordDraft.js";
import CommittedField from "../components/record/CommittedField.jsx";
import SeriesCombobox from "../components/record/SeriesCombobox.jsx";
import TagSelector from "../components/record/TagSelector.jsx";
import RecordCard from "../components/record/RecordCard.jsx";
import ActiveFilters from "../components/record/ActiveFilters.jsx";
import RecordDialog from "../components/record/RecordDialog.jsx";
import { buildCsv, downloadCsv, CSV_COLUMNS } from "../utils/recordCsv.js";
import StatsCardView, { EXPORT_CARD_BG } from "../components/record/StatsCard.jsx";
import { EXPORT_MODULE_IDS } from "../components/record/exportModules.js";

// react-day-picker 只在「自定义」日期区间下才用得上，懒加载把它移出 Record 的首次加载。
const DateRangePicker = lazy(() => import("../components/record/DateRangePicker.jsx"));

// 把一条新录入的卡组名并进本地历史：已存在就 count+1 并前移，不存在就插到最前。
// 保持「常用的排前面」这个排序语义，与后端 /deck-names 一致。
const mergeDeckName = (rows, deck, series) => {
	if (!deck) return rows;
	const i = rows.findIndex((r) => r.deck === deck && r.series === series);
	if (i === -1) return [{ deck, series: series || "", count: 1 }, ...rows];
	const next = [...rows];
	const [hit] = next.splice(i, 1);
	return [{ ...hit, count: hit.count + 1 }, ...next];
};

// 四个必填字段 → 对应的 locale key。
// 卡组名 / 系列锁定成胶囊后 input 会离开 DOM，浏览器原生 required 校验随之失效，
// 所以提交时必须手动兜底一遍，否则空字段能静默提交。
const REQUIRED_FIELDS = [
	["playerDeckName",   "record.form.myDeckName"],
	["playerSeries",     "record.form.mySeries"],
	["opponentDeckName", "record.form.opponentDeckName"],
	["opponentSeries",   "record.form.opponentSeries"],
];



const Record = () => {
	const { t } = useLocale();
	const { user } = useAuth();

	const EXPORT_MODULES = EXPORT_MODULE_IDS.map(m => ({
		...m,
		label: t(`record.exportModules.${m.id}`) || m.id,
	}));

	// 存档只读一次，供下面各 state 的惰性初始化共用
	const bootRef = useRef(null);
	if (bootRef.current === null) bootRef.current = loadPersisted();
	const boot = bootRef.current;

	const [rawRecords, setRawRecords] = useState([]);
	const [fetchError, setFetchError] = useState(false);
	// 卡组名历史（补全用）。必须声明在下面 playerDeckSuggestions 等 useMemo 之前——
	// useMemo 的工厂在渲染期就执行，引用尚未初始化的 const 会抛 TDZ ReferenceError。
	const [deckNames, setDeckNames] = useState({ player: [], opponent: [] });
	const [loading, setLoading] = useState(true);
	const [tabValue, setTabValue] = useState(boot.tabValue);
	const [compact, setCompact] = useState(boot.compact);
	const hasFetchedRef = useRef(false);
	const [datePreset, setDatePreset] = useState(boot.preset);
	const [formState, setFormState] = useState(() => draftToFormState(boot.draft));
	const [editDialog, setEditDialog] = useState({ open: false, record: null });
	const [editFormState, setEditFormState] = useState({});

	// 选了系列就只推荐该系列下用过的卡组；未选系列时给全量。
	// 组件本身不做这个判断——过滤策略属于业务，留在页面里。
	const suggestFor = (rows, series) => {
		const scoped = series ? rows.filter((r) => r.series === series) : rows;
		return scoped.map((r) => ({ value: r.deck, count: r.count }));
	};
	const playerDeckSuggestions = useMemo(
		() => suggestFor(deckNames.player, formState.playerSeries),
		[deckNames.player, formState.playerSeries]
	);
	const opponentDeckSuggestions = useMemo(
		() => suggestFor(deckNames.opponent, formState.opponentSeries),
		[deckNames.opponent, formState.opponentSeries]
	);
	const editPlayerDeckSuggestions = useMemo(
		() => suggestFor(deckNames.player, editFormState.playerSeries),
		[deckNames.player, editFormState.playerSeries]
	);
	const editOpponentDeckSuggestions = useMemo(
		() => suggestFor(deckNames.opponent, editFormState.opponentSeries),
		[deckNames.opponent, editFormState.opponentSeries]
	);

	// 必填校验失败时用这些 ref 把对应字段拆回输入态并聚焦（见 REQUIRED_FIELDS 注释）
	const fieldRefs = {
		playerDeckName:   useRef(null),
		playerSeries:     useRef(null),
		opponentDeckName: useRef(null),
		opponentSeries:   useRef(null),
	};

	// 编辑对话框用独立的一套 ref（两处字段会同时存在于 DOM 中）
	const editFieldRefs = {
		playerDeckName:   useRef(null),
		playerSeries:     useRef(null),
		opponentDeckName: useRef(null),
		opponentSeries:   useRef(null),
	};

	// 持久化由下方的 debounce effect 统一负责，这里只改 state。
	// 旧实现在这里同步 setItem，等于备注每敲一个字符就阻塞主线程写一次盘。
	const updateFormField = (field, value) => {
		setFormState((prev) => ({ ...prev, [field]: value }));
	};

	// 挂载后的一次性收尾：旧格式迁移 + 首次拉取历史
	useEffect(() => {
		if (boot.isLegacy) {
			// 必须先写新格式再删旧 key：反过来的话，两者之间的窗口里
			// 进程被杀就会两边都没有，用户的在途草稿凭空消失。
			writeJSON(DRAFT_KEY, draftRef.current);
			writeJSON(VIEW_KEY, {
				tabValue: boot.tabValue,
				datePreset: boot.preset,
				startDate: boot.range.start ? boot.range.start.toISOString() : null,
				endDate:   boot.range.end   ? boot.range.end.toISOString()   : null,
			});
			clearLegacyKeys();
		}

		// 直接用 boot.range，不依赖 state：日期已在首帧就位，
		// 旧代码在这里调无参 getHistory()，闭包里的 startDate 还是 null，
		// 导致恢复自定义区间时拉的是全量记录；而本该兜底的 [startDate, endDate] effect
		// 又被尚未置位的 hasFetchedRef 挡住，筛选条件就被静默丢弃了。
		if (boot.tabValue === 1) getHistory(boot.range);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	const [deleteDialog, setDeleteDialog] = useState({ open: false, record: null });
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [exportDialog, setExportDialog] = useState({ open: false, step: "select", selected: EXPORT_MODULES.map((m) => m.id) });
	const cardRef = useRef(null);
	const [startDate, setStartDate] = useState(boot.range.start);
	const [endDate, setEndDate] = useState(boot.range.end);

	// 挂载时加载标签库（创建表单 Tab 0 也需要）
	useEffect(() => { fetchTags(); fetchDeckNames(); }, []); // mount-only

	// ── 草稿写入 ──────────────────────────────────────────────────────────────
	// debounce 400ms，避免逐字符写盘；draftRef 供离开页面时的兜底 flush 读取最新值。
	// 首帧的 state 已经是恢复后的值，所以这些 effect 在挂载时跑一次是幂等的，无需守卫。
	const draftRef = useRef(formState);
	draftRef.current = formState;

	useEffect(() => {
		const id = setTimeout(() => writeJSON(DRAFT_KEY, formState), 400);
		return () => clearTimeout(id);
	}, [formState]);

	// 离开页面时兜底：debounce 可能还没到期。只靠卸载 cleanup 不够稳
	// （浏览器直接杀进程、标签页崩溃都拿不到），所以 pagehide / visibilitychange 一起挂。
	useEffect(() => {
		const flush = () => writeJSON(DRAFT_KEY, draftRef.current);
		const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
		window.addEventListener("pagehide", flush);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			window.removeEventListener("pagehide", flush);
			document.removeEventListener("visibilitychange", onVisibility);
			flush();   // 路由切走时也存一次
		};
	}, []);

	// 视图状态（页签 + 日期筛选）与表单草稿分开存，互不影响
	useEffect(() => {
		writeJSON(VIEW_KEY, {
			tabValue,
			datePreset,
			compact,
			startDate: startDate ? startDate.toISOString() : null,
			endDate:   endDate   ? endDate.toISOString()   : null,
		});
	}, [tabValue, datePreset, startDate, endDate, compact]);

	// 自定义日期变更时自动向服务器重新请求
	useEffect(() => {
		if (datePreset === "custom" && hasFetchedRef.current) {
			setVisibleCount(20);
			setLoading(true);
			getHistory({ start: startDate, end: endDate });
		}
	}, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps

	const applyPreset = (preset) => {
		setDatePreset(preset);
		setVisibleCount(20);
		// 自定义：区间由日历选择器决定，这里不动日期，否则会新建 Date 对象
		// 触发上面的 [startDate, endDate] effect 白拉一次
		if (preset === "custom") return;
		const { start, end } = presetRange(preset);
		setStartDate(start);
		setEndDate(end);
		setLoading(true);
		getHistory({ start, end });
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

	// 卡组名历史，供创建表单的输入补全。刻意用独立接口而不是从 rawRecords 提取：
	// rawRecords 受日期筛选限制，选了「近 7 天」就只剩那几个值，而且用户停在创建页时
	// 可能根本还没拉过历史。
	const fetchDeckNames = async () => {
		try {
			const res = await apiRequest("/api/matches/deck-names");
			setDeckNames(await res.json());
		} catch (err) {
			// 补全是锦上添花，失败不该打断录入，静默降级成纯手打
			console.error("获取卡组名历史失败:", err);
		}
	};

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

	const toastTimerRef = useRef(null);
	// action 可选：{ label, onClick }，用于「已保存 → 查看记录」这类后续动作。
	// 带动作的 toast 停留久一点，否则用户还没来得及点就消失了。
	const showToast = (message, type = "success", action = null) => {
		// 不清旧定时器的话，连续两次操作时第一个定时器会把第二条 toast 提前掐掉
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		setToast({ message, type, action });
		toastTimerRef.current = setTimeout(() => setToast(null), action ? 6000 : 3000);
	};
	useEffect(() => () => clearTimeout(toastTimerRef.current), []);

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

	// RecordCard 是 memo 组件，这两个回调必须保持引用稳定，否则 memo 会被击穿
	const openEdit = useCallback((record) => {
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
	}, []);

	const openDelete = useCallback((record) => {
		setDeleteDialog({ open: true, record });
	}, []);

	const handleSaveEdit = async () => {
		if (!editDialog.record) return;

		// 与创建表单同一套必填校验。四个字段在后端 schema 里是 required，
		// 直接提交空值会触发 runValidators 报 500，这里挡在前面。
		const missing = REQUIRED_FIELDS.find(
			([f]) => !String(editFormState[f] ?? "").trim()
		);
		if (missing) {
			const [field, labelKey] = missing;
			showToast(t("record.form.requiredMissing", { field: t(labelKey) }), "error");
			editFieldRefs[field].current?.unlock();
			return;
		}
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

	// 搜索框保持即时响应，把 8 个统计 useMemo + 卡片列表的重算降到低优先级。
	// 比手写 debounce 更合适：它推迟的是渲染调度，不是用户看到自己输入的时机。
	const deferredQuery = useDeferredValue(searchQuery);

	const searchedRecords = useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		if (!q) return filteredRecords;
		return filteredRecords.filter((rec) =>
			[rec.playerDeckName, rec.opponentDeckName,
			 rec.playerSeries, rec.opponentSeries, rec.notes,
			 ...(rec.tags || [])].some((v) => v?.toLowerCase().includes(q))
		);
	}, [filteredRecords, deferredQuery]);

	// 用户主动改变过滤条件时重置分页（不包含 records，避免编辑/创建/删除误触发）
	useEffect(() => { setVisibleCount(20); }, [tagFilter, deckFilter, searchQuery]);

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
		searchedRecords.forEach((rec) => {
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

	// 导出预览打开时，可见预览与离屏导出层会各调一次，且内部有 4 次 [...arr].sort()。
	const cardStats = useMemo(() => {
		const oppMin = opponentSeriesWinRate.filter((s) => s.total >= 3);
		const goesFirstRecs  = searchedRecords.filter((r) => r.goesFirst === true);
		const goesSecondRecs = searchedRecords.filter((r) => r.goesFirst === false);
		const gfRate = (recs) => recs.length === 0 ? 0
			: Math.round(recs.filter((r) => r.result === "win").length / recs.length * 100);
		return {
			total: totalMatches, wins, losses, winRate, currentStreak, longestWinStreak,
			goesFirst: {
				firstRate:   gfRate(goesFirstRecs),  firstTotal:  goesFirstRecs.length,
				secondRate:  gfRate(goesSecondRecs), secondTotal: goesSecondRecs.length,
			},
			topDecks:   deckData.slice(0, 3),
			bestDeck:   [...deckData].sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate)).find((d) => d.total >= 3) || null,
			hardestOpp: [...oppMin].sort((a, b) => parseFloat(a.winRate) - parseFloat(b.winRate))[0] || null,
			easiestOpp: [...oppMin].sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))[0] || null,
			topTags:    tournamentData.slice(0, 3),
			trendData,
		};
	}, [opponentSeriesWinRate, searchedRecords, totalMatches, wins, losses, winRate,
		currentStreak, longestWinStreak, deckData, tournamentData, trendData]);

	const getDateLabel = () =>
		datePreset === "all"    ? t("record.filter.all")
		: datePreset === "7d"  ? t("record.filter.last7")
		: datePreset === "30d" ? t("record.filter.last30")
		: startDate && endDate
			? `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`
			: t("record.filter.custom");

	// 当前生效的筛选条件，集中显示一处（详见 ActiveFilters 注释）
	const activeFilters = useMemo(() => {
		const list = [];
		if (datePreset !== "all") {
			list.push({
				key: "date",
				label: t("record.filter.dateLabel"),
				value: getDateLabel(),
				onClear: () => applyPreset("all"),
			});
		}
		if (tagFilter) {
			list.push({
				key: "tag",
				label: t("record.form.tagsLabel"),
				value: tagFilter,
				onClear: () => setTagFilter(null),
			});
		}
		if (deckFilter) {
			list.push({
				key: "deck",
				label: t("record.stats.deckFilterLabel"),
				value: `${deckFilter.series} / ${deckFilter.deck}`,
				onClear: () => setDeckFilter(null),
			});
		}
		if (searchQuery.trim()) {
			list.push({
				key: "search",
				label: t("record.filter.searchLabel"),
				value: searchQuery.trim(),
				onClear: () => setSearchQuery(""),
			});
		}
		return list;
	}, [datePreset, tagFilter, deckFilter, searchQuery, startDate, endDate, t]); // eslint-disable-line react-hooks/exhaustive-deps

	const clearAllFilters = () => {
		setTagFilter(null);
		setDeckFilter(null);
		setSearchQuery("");
		if (datePreset !== "all") applyPreset("all");
	};

	// 导出当前 searchedRecords —— 尊重全部筛选，与页面上「共 N 场」一致
	const handleExportCsv = () => {
		const header = Object.fromEntries(
			CSV_COLUMNS.map((c) => [c.key, t(`record.export.csvHeaders.${c.key}`)])
		);
		const stamp = new Date().toISOString().slice(0, 10);
		downloadCsv(buildCsv(searchedRecords, t, header), `records-${user?.username || "export"}-${stamp}.csv`);
	};

	const handleExportCard = async () => {
		// 等待隐藏元素完成渲染
		await new Promise((r) => setTimeout(r, 100));
		if (!cardRef.current) return;
		try {
			// 动态 import：html-to-image 只在点「保存」这一下用得到，
		// 静态 import 会把它压进每次进入战绩页的首包。
		const { toPng } = await import("html-to-image");
		const dataUrl = await toPng(cardRef.current, {
				pixelRatio: 2,
				backgroundColor: EXPORT_CARD_BG,
				// 明确指定元素完整尺寸，忽略视口裁切
				width:  cardRef.current.offsetWidth,
				height: cardRef.current.offsetHeight,
			});
			const link = document.createElement("a");
			link.download = `stats-${user?.username || "card"}.png`;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error("导出失败:", err);
		}
	};

	const resetForm = () => {
		setFormState(emptyForm());
		setResetDialogOpen(false);
		// 只清表单草稿。日期筛选与当前页签属于视图状态，
		// 「重置表单」不该把它们一起清掉（旧实现会）。
		writeJSON(DRAFT_KEY, emptyForm());
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

			// 乐观移除即可，不再全量重拉
			setRawRecords((prev) =>
				prev.filter((record) => record._id !== deleteDialog.record._id)
			);
			setDeleteDialog({ open: false, record: null });
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

		// 导出图片固定白底：这张 PNG 是拿去分享的，跟随站点主题反而不便于阅读
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
		setFetchError(false);
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
			// 不设错误态的话，loading 转 false 后会掉进「暂无对战记录，先去创建一条吧」，
			// 断网时用户看到的是「你还没有记录」而不是「加载失败」。
			setFetchError(true);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">
			{/* ── Toast ───────────────────────────────── */}
			{toast && (
				<div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-xl shadow-lg text-sm font-bold text-white transition-all flex items-center gap-3 ${
					toast.type === "error" ? "bg-[var(--error)]" : "bg-[var(--text-muted)]"
				}`}>
					<span>{toast.message}</span>
					{toast.action && (
						<button
							onClick={() => { toast.action.onClick(); setToast(null); }}
							className="shrink-0 underline underline-offset-2 hover:opacity-80 transition-opacity">
							{toast.action.label}
						</button>
					)}
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
							setTabValue(index);   // 持久化交给上方的 VIEW_KEY effect
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

						// 手动必填校验：胶囊态下 input 不在 DOM 里，原生 required 不会触发。
						// 只报第一个缺失项并聚焦过去，逐个补比一次列一串更好操作。
						const missing = REQUIRED_FIELDS.find(
							([f]) => !String(formState[f] ?? "").trim()
						);
						if (missing) {
							const [field, labelKey] = missing;
							showToast(t("record.form.requiredMissing", { field: t(labelKey) }), "error");
							fieldRefs[field].current?.unlock();
							return;
						}

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
						await res.json();
						// 把刚录入的两个卡组名并入本地历史，下一条就能补全到，
						// 不必为一条记录再拉一次 /deck-names
						setDeckNames((prev) => ({
							player:   mergeDeckName(prev.player,   data.playerDeckName,   data.playerSeries),
							opponent: mergeDeckName(prev.opponent, data.opponentDeckName, data.opponentSeries),
						}));
							// 保存后清空「对战结果」与「先后攻」，避免下一条记录沿用上次的值导致误录；
							// 其余字段（卡组/系列/标签等）保留以便连续录入同一组对局。
							// localStorage 由 DRAFT_KEY 的 debounce effect 同步，无需在此手动 remove。
							setFormState((prev) => {
								const next = { ...prev };
								CLEAR_ON_SUBMIT.forEach((f) => { next[f] = EMPTY_FORM[f]; });
								return next;
							});
							// 停在创建表单，方便连录同一场比赛的下一轮——这本来就是上面
							// 「保留卡组/系列/标签」的意图，跳到查询页反而把它打断了。
							// 列表只标记为待刷新：用户还在创建页看不到列表，此刻重拉是白费。
							// （必须重拉而非乐观插入：日期筛选在服务端，新记录可能落在当前区间之外。）
							hasFetchedRef.current = false;
							showToast(t("record.form.saved"), "success", {
								label: t("record.form.viewRecords"),
								onClick: () => { setTabValue(1); setLoading(true); getHistory({ start: startDate, end: endDate }); },
							});
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
								<div className="mb-4">
									<CommittedField
										ref={fieldRefs.playerDeckName}
										id="playerDeckName"
										name="playerDeckName"
										label={t("record.form.myDeckName")}
										clearLabel={t("record.form.clearField")}
										value={formState.playerDeckName}
										onChange={(v) => updateFormField("playerDeckName", v)}
										suggestions={playerDeckSuggestions}
									/>
								</div>
								<SeriesCombobox
									ref={fieldRefs.playerSeries}
									id="playerSeries"
									name="playerSeries"
									label={t("record.form.mySeries")}
									clearLabel={t("record.form.clearField")}
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
								<div className="mb-4">
									<CommittedField
										ref={fieldRefs.opponentDeckName}
										id="opponentDeckName"
										name="opponentDeckName"
										label={t("record.form.opponentDeckName")}
										clearLabel={t("record.form.clearField")}
										value={formState.opponentDeckName}
										onChange={(v) => updateFormField("opponentDeckName", v)}
										suggestions={opponentDeckSuggestions}
									/>
								</div>
								<SeriesCombobox
									ref={fieldRefs.opponentSeries}
									id="opponentSeries"
									name="opponentSeries"
									label={t("record.form.opponentSeries")}
									clearLabel={t("record.form.clearField")}
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
										: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
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
										: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
									}`}>
								<XIcon size={18} className="hidden sm:block" />
								{t("record.form.result.lose")}
							</button>
							<button
								type="button"
								onClick={() => updateFormField("result", formState.result === "doubleLose" ? "" : "doubleLose")}
								className={`flex-1 flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-xl border-2 font-bold text-sm transition-all
									${formState.result === "doubleLose"
										? "bg-[var(--draw)] border-[var(--draw)] text-white"
										: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
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
									onClick={() => setCompact((v) => !v)}
									title={t("record.display.compactView")}
									className={`p-1.5 rounded-full border transition-colors ${
										compact
											? "bg-[var(--text-muted)] border-[var(--text-muted)] text-white"
											: "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-background)]"
									}`}>
									<Rows3 size={14} />
								</button>
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
								<Suspense fallback={<div className="h-[38px] rounded-xl border border-[var(--border)]" />}>
									<DateRangePicker
										startDate={startDate}
										endDate={endDate}
										onStartChange={setStartDate}
										onEndChange={setEndDate}
										t={t}
									/>
								</Suspense>
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

					{/* ── Export dialog ─────────────────────────── */}
				{exportDialog.open && exportDialog.step === "select" && (
					<RecordDialog open onClose={() => setExportDialog((d) => ({ ...d, open: false, step: "select" }))} panelClassName="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4">
						<p className="text-base font-bold text-[var(--text)]">{t("record.export.title")}</p>
						<div className="flex flex-col gap-1.5">
							{EXPORT_MODULES.map((m) => (
								<label key={m.id} className="flex items-center gap-3 cursor-pointer py-1">
									<input
										type="checkbox"
										checked={exportDialog.selected.includes(m.id)}
										onChange={(e) => setExportDialog((d) => ({
											...d,
											selected: e.target.checked
												? [...d.selected, m.id]
												: d.selected.filter((id) => id !== m.id),
										}))}
										className="w-4 h-4 accent-[var(--text-muted)]"
									/>
									<span className="text-sm text-[var(--text)]">{m.label}</span>
								</label>
							))}
						</div>
						<div className="flex gap-2 pt-1">
							<button onClick={() => setExportDialog((d) => ({ ...d, open: false, step: "select" }))}
								className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
								{t("record.export.cancel")}
							</button>
							<button
								onClick={() => setExportDialog((d) => ({ ...d, step: "preview" }))}
								disabled={exportDialog.selected.length === 0}
								className="flex-1 py-2 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
								{t("record.export.preview")}
							</button>
						</div>
					</RecordDialog>
				)}

				{/* 深色背板：配合 StatsCard 的深色导出卡（见该文件 EXPORT_CARD_BG 注释），刻意不走主题变量 */}
				{exportDialog.open && exportDialog.step === "preview" && (
					<RecordDialog
						open
						// Esc 退回模块选择步骤，与工具栏「返回」一致
						onClose={() => setExportDialog((d) => ({ ...d, step: "select" }))}
						variant="fullscreen"
						panelClassName="fixed inset-0 flex flex-col bg-[#111]">
						{/* Preview toolbar */}
						<div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
							<button
								onClick={() => setExportDialog((d) => ({ ...d, step: "select" }))}
								className="flex items-center gap-1.5 text-sm font-bold text-white/60 hover:text-white transition-colors">
								<ChevronDown size={14} className="-rotate-90" />
								{t("record.export.back")}
							</button>
							<button
								onClick={handleExportCard}
								className="px-4 py-1.5 rounded-full bg-white text-[#111] text-sm font-bold hover:bg-white/80 transition-colors">
								{t("record.export.save")}
							</button>
						</div>
						{/* Scrollable preview (display only, no ref) */}
						<div className="flex-1 overflow-y-auto flex justify-center py-8 px-4">
							<StatsCardView
								selectedIds={exportDialog.selected}
								stats={cardStats}
								username={user?.username}
								dateLabel={getDateLabel()}
							/>
						</div>
					</RecordDialog>
				)}

				{/* ── Off-screen full-size card for export (always rendered when preview open) ── */}
				{exportDialog.open && exportDialog.step === "preview" && (
					<div style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none", opacity: 0, zIndex: -1 }}>
						<StatsCardView
							cardRef={cardRef}
							selectedIds={exportDialog.selected}
							stats={cardStats}
							username={user?.username}
							dateLabel={getDateLabel()}
						/>
					</div>
				)}

				{/* ── Edit dialog ───────────────────────────── */}
				{editDialog.open && (
					<RecordDialog open onClose={() => setEditDialog({ open: false, record: null })} panelClassName="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
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
												: "bg-[var(--draw)] border-[var(--draw)] text-white"
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

						{/* My deck —— 与创建表单同一套胶囊控件，保持两处形态一致 */}
						<CommittedField
							ref={editFieldRefs.playerDeckName}
							id="edit-playerDeckName"
							name="edit-playerDeckName"
							label={t("record.form.myDeckName")}
							clearLabel={t("record.form.clearField")}
							value={editFormState.playerDeckName || ""}
							onChange={(v) => setEditFormState((s) => ({ ...s, playerDeckName: v }))}
							suggestions={editPlayerDeckSuggestions}
						/>
						<SeriesCombobox
							ref={editFieldRefs.playerSeries}
							id="edit-playerSeries"
							name="edit-playerSeries"
							label={t("record.form.mySeries")}
							clearLabel={t("record.form.clearField")}
							value={editFormState.playerSeries || ""}
							onChange={(key) => setEditFormState((s) => ({ ...s, playerSeries: key ?? "" }))}
						/>

						{/* Opponent deck */}
						<CommittedField
							ref={editFieldRefs.opponentDeckName}
							id="edit-opponentDeckName"
							name="edit-opponentDeckName"
							label={t("record.form.opponentDeckName")}
							clearLabel={t("record.form.clearField")}
							value={editFormState.opponentDeckName || ""}
							onChange={(v) => setEditFormState((s) => ({ ...s, opponentDeckName: v }))}
							suggestions={editOpponentDeckSuggestions}
						/>
						<SeriesCombobox
							ref={editFieldRefs.opponentSeries}
							id="edit-opponentSeries"
							name="edit-opponentSeries"
							label={t("record.form.opponentSeries")}
							clearLabel={t("record.form.clearField")}
							value={editFormState.opponentSeries || ""}
							onChange={(key) => setEditFormState((s) => ({ ...s, opponentSeries: key ?? "" }))}
						/>

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
					</RecordDialog>
				)}

				{/* ── Rename dialog ─────────────────────────── */}
					{renameDialog.open && (
						<RecordDialog open onClose={() => setRenameDialog((d) => ({ ...d, open: false }))} panelClassName="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 flex flex-col gap-4">
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
						</RecordDialog>
					)}

					{/* ── Delete dialog ──────────────────────────── */}
					{deleteDialog.open && (
						<RecordDialog open onClose={() => setDeleteDialog({ open: false, record: null })} panelClassName="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4 flex flex-col gap-4">
							<div>
								<p className="text-base font-bold text-[var(--text)] mb-1">{t("record.deleteDialog.title")}</p>
								<p className="text-sm text-[var(--text-secondary)]">{t("record.deleteDialog.content")}</p>
								{/* 对话框会盖住卡片，不写清楚删的是哪条，用户没法核对 */}
								{deleteDialog.record && (
									<p className="mt-2 px-3 py-2 rounded-lg bg-[var(--card-background)] text-xs text-[var(--text)] break-all">
										{t("record.deleteDialog.summary", {
											player:   deleteDialog.record.playerDeckName   || t("record.display.unknownDeck"),
											opponent: deleteDialog.record.opponentDeckName || t("record.display.unknownDeck"),
											result:   deleteDialog.record.result === "win"  ? t("record.form.result.win")
												: deleteDialog.record.result === "lose" ? t("record.form.result.lose")
												: t("record.form.result.doubleLose"),
										})}
									</p>
								)}
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
						</RecordDialog>
					)}

					{loading ? (
						<div className="flex justify-center py-12">
							<div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--text-muted)] animate-spin" />
						</div>
					) : fetchError ? (
						<div className="text-center py-12 px-4 border border-[var(--border)] rounded-2xl bg-[var(--card-background)]">
							<p className="text-base font-bold text-[var(--text)] mb-3">{t("record.display.loadError")}</p>
							<button
								onClick={() => { setLoading(true); getHistory({ start: startDate, end: endDate }); }}
								className="text-sm font-bold px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
								{t("record.display.retry")}
							</button>
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

							{/* ── 生效筛选摘要（取代原来只作指示器的卡组 chip）───── */}
							<ActiveFilters
								items={activeFilters}
								totalLabel={t("record.filter.matchCount", { count: totalMatches })}
								clearAllLabel={t("record.filter.clearAll")}
								onClearAll={clearAllFilters}
							/>
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
							<div className="mt-2 grid grid-cols-2 gap-2">
								<button
									onClick={() => setExportDialog((d) => ({ ...d, open: true }))}
								className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] bg-white/60 backdrop-blur-sm text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150">
									<Layers size={13} />
									{t("record.export.button")}
								</button>
								<button
									onClick={handleExportCsv}
									disabled={searchedRecords.length === 0}
									className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--border)] bg-white/60 backdrop-blur-sm text-[11px] font-bold text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0">
									<Download size={13} />
									{t("record.export.csvButton")}
								</button>
							</div>
						</div>
						<div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-3"}>
							{searchedRecords.slice(0, visibleCount).map((record) => (
								<RecordCard
									key={record._id}
									record={record}
									t={t}
									compact={compact}
									query={deferredQuery}
									onEdit={openEdit}
									onDelete={openDelete}
								/>
							))}
						</div>
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
			<RecordDialog open onClose={() => setAnalysisDialogOpen(false)} panelClassName="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white">

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
											: "bg-[var(--draw)]"}`}>
										{rec.result === "win" ? "W" : rec.result === "lose" ? "L" : "D"}
									</div>
								))}
							</div>
							{currentStreak && (
								<div className="flex flex-wrap gap-2 mb-5">
									<span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
										currentStreak.result === "win"
											? "bg-[var(--success-tint)] text-[var(--success-strong)]"
											: currentStreak.result === "lose"
											? "bg-[var(--error-tint)] text-[var(--error-strong)]"
											: "bg-[var(--draw-tint)] text-[var(--draw-strong)]"}`}>
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
												<title>{`${pt.key}  ${pt.winRate.toFixed(0)}%  (${t("record.stats.recordSummary", { wins: pt.wins, total: pt.total })})`}</title>
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
						const firstRecs  = searchedRecords.filter((r) => r.goesFirst === true);
						const secondRecs = searchedRecords.filter((r) => r.goesFirst === false);
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
													{item.draws > 0 && <div className="bg-[var(--draw)] h-full" style={{ width: `${(item.draws / item.total) * 100}%` }} />}
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
																	title={`${(cell.wins / cell.total * 100).toFixed(0)}%  ${t("record.stats.recordSummary", { wins: cell.wins, total: cell.total })}`}>
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
									<span className="text-[10px] font-bold text-[var(--success-strong)]">100%</span>
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
			</RecordDialog>
		)}

			{/* Reset Confirmation Dialog */}
			{resetDialogOpen && (
				<RecordDialog open onClose={() => setResetDialogOpen(false)} panelClassName="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4 flex flex-col gap-4">
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
				</RecordDialog>
			)}

		</div>
	);
};

export default Record;
