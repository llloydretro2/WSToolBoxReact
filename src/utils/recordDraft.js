/**
 * 战绩页（/ws/record）的草稿持久化。
 *
 * 表单草稿与视图状态分两个 localStorage key：
 * 「重置表单」只该清草稿，不该连带清掉日期筛选和当前页签。
 *
 * 纯函数，不依赖 React，可用 node 直接跑 test-recordDraft.js。
 */

export const DRAFT_KEY = "record:draft";
export const VIEW_KEY = "record:view";

/**
 * 字段名的单一数据源，写入 / 恢复 / 清理三处共用。
 * 此前这三处各自手写一份列表，goesFirst 和 tags 只出现在写入侧，
 * 于是被存进 localStorage 却从来没被读回来过。
 */
export const DRAFT_FIELDS = [
	"playerDeckName", "playerSeries",
	"opponentDeckName", "opponentSeries",
	"result", "goesFirst", "tags", "notes",
];

/**
 * 提交后清空的字段：避免下一条记录沿用上一条的胜负与先后攻。
 * 卡组名 / 系列 / 标签保留，方便连续录入同一场比赛的多局对战。
 */
export const CLEAR_ON_SUBMIT = ["result", "goesFirst"];

/** 形状参考（CLEAR_ON_SUBMIT 取默认值用）。放进 state 的一律走 emptyForm()。 */
export const EMPTY_FORM = {
	playerDeckName: "",
	opponentDeckName: "",
	playerSeries: "",
	opponentSeries: "",
	notes: "",
	result: "",
	goesFirst: null,
	tags: [],
};

/** 每次返回新对象，避免多处共享同一个 tags 数组引用。 */
export const emptyForm = () => ({ ...EMPTY_FORM, tags: [] });

export const readJSON = (key) => {
	try {
		const raw = localStorage.getItem(key);
		return raw == null ? null : JSON.parse(raw);
	} catch {
		return null;   // 无痕模式 / 配额满 / 脏数据
	}
};

export const writeJSON = (key, value) => {
	try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 同上 */ }
};

/** 相对预设（近 7 天 / 近 30 天）每次恢复都按当前时间重算，不沿用存下来的旧区间。 */
export const presetRange = (preset, savedStart, savedEnd) => {
	if (preset === "7d" || preset === "30d") {
		const end = new Date();
		end.setHours(23, 59, 59, 999);
		const start = new Date();
		start.setDate(start.getDate() - (preset === "7d" ? 6 : 29));
		start.setHours(0, 0, 0, 0);
		return { start, end };
	}
	if (preset === "custom") {
		return {
			start: savedStart ? new Date(savedStart) : null,
			end:   savedEnd   ? new Date(savedEnd)   : null,
		};
	}
	return { start: null, end: null };   // "all"
};

/**
 * 旧版把每个字段单独存成 record:<field>。这里只做纯读取，
 * 写新格式与删旧 key 都由调用方在挂载后进行，避免 render 阶段产生副作用。
 */
const LEGACY_VIEW_FIELDS = ["startDate", "endDate", "tabValue", "datePreset"];

const readLegacyDraft = () => {
	const draft = {};
	const view = {};
	let found = false;
	const pick = (target, field) => {
		const raw = localStorage.getItem(`record:${field}`);
		if (raw == null) return;
		found = true;
		try { target[field] = JSON.parse(raw); } catch { target[field] = raw; }
	};
	try {
		DRAFT_FIELDS.forEach((f) => pick(draft, f));
		LEGACY_VIEW_FIELDS.forEach((f) => pick(view, f));
	} catch {
		return null;
	}
	return found ? { draft, view } : null;
};

/** record:goesFirst / record:tags 是只写不读的孤儿，record:tournamentName 是已废弃字段。 */
export const clearLegacyKeys = () => {
	[...DRAFT_FIELDS, ...LEGACY_VIEW_FIELDS, "tournamentName"].forEach((f) => {
		try { localStorage.removeItem(`record:${f}`); } catch { /* ignore */ }
	});
};

/**
 * 挂载时读一次存档：新格式优先，回落到旧的按字段散列格式。
 * 结果喂给各 state 的惰性初始化——首帧就是恢复后的值，
 * 于是不存在「effect 里 setState 还没 flush 就被读到 null」这类时序问题。
 */
export const loadPersisted = () => {
	const newDraft = readJSON(DRAFT_KEY);
	const newView = readJSON(VIEW_KEY);
	const legacy = newDraft || newView ? null : readLegacyDraft();
	const draft = newDraft || legacy?.draft || {};
	const view = newView || legacy?.view || {};
	const preset = view.datePreset || "all";
	return {
		draft,
		view,
		preset,
		range: presetRange(preset, view.startDate, view.endDate),
		tabValue: Number(view.tabValue) || 0,
		compact: Boolean(view.compact),
		isLegacy: Boolean(legacy),
	};
};

/**
 * 把存档里的草稿合并到空表单上。
 * 判 undefined 而非真值：goesFirst === false（後攻）是合法值且 falsy，
 * 用真值判断会让「选了後攻」在刷新后变回未选。
 */
export const draftToFormState = (draft) => {
	const next = emptyForm();
	if (!draft || typeof draft !== "object") return next;
	DRAFT_FIELDS.forEach((f) => {
		if (draft[f] !== undefined) next[f] = draft[f];
	});
	return next;
};
