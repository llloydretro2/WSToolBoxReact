/* global process */
/**
 * recordDraft.js 自测。运行：node src/utils/test-recordDraft.js
 *
 * 重点覆盖两个曾经出过问题的点：
 *   1. goesFirst === false（後攻）是合法值且 falsy，真值判断会把它吃掉
 *   2. goesFirst / tags 曾被写入 localStorage 但从未读回
 */

// 必须在 import 之前装好 localStorage：模块内的函数在调用时才读它，
// 但 Node 没有这个全局对象，缺了会直接 ReferenceError。
class FakeStorage {
	constructor() { this.map = new Map(); }
	getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
	setItem(k, v) { this.map.set(k, String(v)); }
	removeItem(k) { this.map.delete(k); }
	clear() { this.map.clear(); }
	get size() { return this.map.size; }
	keys() { return [...this.map.keys()]; }
}
const storage = new FakeStorage();
globalThis.localStorage = storage;

const {
	DRAFT_KEY, VIEW_KEY, CLEAR_ON_SUBMIT, EMPTY_FORM,
	emptyForm, readJSON, writeJSON, presetRange,
	clearLegacyKeys, loadPersisted, draftToFormState,
} = await import("./recordDraft.js");

let passed = 0;
let failed = 0;

const check = (name, cond, detail = "") => {
	if (cond) { passed++; console.log(`  ✅ ${name}`); }
	else { failed++; console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ""}`); }
};
const eq = (name, actual, expected) =>
	check(name, JSON.stringify(actual) === JSON.stringify(expected),
		`期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);

const section = (title) => console.log(`\n── ${title} ──`);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;


section("draftToFormState — 字段恢复");
{
	eq("空存档 → 空表单", draftToFormState(null), EMPTY_FORM);
	eq("非对象存档不炸", draftToFormState("garbage"), EMPTY_FORM);

	// 核心回归：後攻 = false，falsy 但合法
	const back = draftToFormState({ goesFirst: false });
	check("goesFirst=false 能恢复（不被真值判断吃掉）", back.goesFirst === false,
		`实际 ${JSON.stringify(back.goesFirst)}`);

	eq("goesFirst=true 能恢复", draftToFormState({ goesFirst: true }).goesFirst, true);
	eq("goesFirst 缺省保持 null", draftToFormState({}).goesFirst, null);

	// 核心回归：tags 此前只写不读
	eq("tags 能恢复", draftToFormState({ tags: ["区域赛", "8月"] }).tags, ["区域赛", "8月"]);

	eq("notes 能恢复", draftToFormState({ notes: "对面爆种" }).notes, "对面爆种");
	eq("result 能恢复", draftToFormState({ result: "lose" }).result, "lose");
	eq("卡组名/系列能恢复",
		draftToFormState({ playerDeckName: "青黄", playerSeries: "ホロライブ" }).playerDeckName, "青黄");

	// result="" 是「未选择」，不该覆盖成别的
	eq("result 空串保持空串", draftToFormState({ result: "" }).result, "");

	const unknown = draftToFormState({ evilField: 1, playerDeckName: "x" });
	check("白名单外的字段被忽略", !("evilField" in unknown));
}

section("emptyForm — 引用隔离");
{
	const a = emptyForm();
	const b = emptyForm();
	check("每次返回全新的 tags 数组", a.tags !== b.tags);
	a.tags.push("污染");
	eq("改 a 不影响 b", b.tags, []);
	eq("也不影响 EMPTY_FORM 常量", EMPTY_FORM.tags, []);
}

section("CLEAR_ON_SUBMIT — 提交后清空的字段");
{
	eq("只清胜负与先后攻", CLEAR_ON_SUBMIT, ["result", "goesFirst"]);
	const form = { ...emptyForm(), playerDeckName: "青黄", tags: ["区域赛"], result: "win", goesFirst: false };
	const after = { ...form };
	CLEAR_ON_SUBMIT.forEach((f) => { after[f] = EMPTY_FORM[f]; });
	eq("提交后 result 清空", after.result, "");
	eq("提交后 goesFirst 清空", after.goesFirst, null);
	eq("提交后卡组名保留", after.playerDeckName, "青黄");
	eq("提交后标签保留", after.tags, ["区域赛"]);
}

section("presetRange — 日期区间");
{
	eq("all → 无区间", presetRange("all"), { start: null, end: null });

	// 相对预设必须按「今天」重算，不能沿用存档里的旧日期
	const stale = "2020-01-01T00:00:00.000Z";
	const r7 = presetRange("7d", stale, stale);
	const today = new Date();
	const expect7 = new Date(); expect7.setDate(expect7.getDate() - 6);
	check("7d 按当前时间重算（忽略存档旧值）",
		ymd(r7.start) === ymd(expect7) && ymd(r7.end) === ymd(today),
		`实际 ${ymd(r7.start)} → ${ymd(r7.end)}`);
	check("7d 起点是当天 00:00:00.000",
		r7.start.getHours() === 0 && r7.start.getMinutes() === 0 && r7.start.getMilliseconds() === 0);
	check("7d 终点是当天 23:59:59.999",
		r7.end.getHours() === 23 && r7.end.getMinutes() === 59 && r7.end.getMilliseconds() === 999);

	const r30 = presetRange("30d");
	const expect30 = new Date(); expect30.setDate(expect30.getDate() - 29);
	check("30d 覆盖 30 天（含今天）", ymd(r30.start) === ymd(expect30));

	// custom 才沿用存档
	const rc = presetRange("custom", "2026-03-01T00:00:00.000Z", "2026-03-31T23:59:59.999Z");
	check("custom 恢复存档区间", rc.start instanceof Date && rc.end instanceof Date
		&& rc.start.toISOString() === "2026-03-01T00:00:00.000Z");
	eq("custom 存档为空时归 null", presetRange("custom", null, null), { start: null, end: null });
}

section("loadPersisted — 新格式");
{
	storage.clear();
	eq("全空 → 默认值", loadPersisted(), {
		draft: {}, view: {}, preset: "all",
		range: { start: null, end: null }, tabValue: 0, compact: false, isLegacy: false,
	});

	storage.clear();
	writeJSON(DRAFT_KEY, { playerDeckName: "青黄", goesFirst: false, tags: ["区域赛"] });
	writeJSON(VIEW_KEY, {
		tabValue: 1, datePreset: "custom",
		startDate: "2026-03-01T00:00:00.000Z", endDate: "2026-03-31T00:00:00.000Z",
	});
	const boot = loadPersisted();
	eq("tabValue 读回", boot.tabValue, 1);
	eq("preset 读回", boot.preset, "custom");
	eq("compact 默认 false", boot.compact, false);
	check("custom 区间读回", boot.range.start.toISOString() === "2026-03-01T00:00:00.000Z");
	check("isLegacy=false", boot.isLegacy === false);
	eq("草稿透传给 draftToFormState 后 goesFirst=false",
		draftToFormState(boot.draft).goesFirst, false);
}

section("loadPersisted — 紧凑视图开关");
{
	storage.clear();
	writeJSON(VIEW_KEY, { compact: true });
	eq("compact=true 读回", loadPersisted().compact, true);
	storage.clear();
	writeJSON(VIEW_KEY, { tabValue: 1 });
	eq("未存 compact 时默认 false", loadPersisted().compact, false);
}

section("loadPersisted — 旧格式迁移");
{
	storage.clear();
	// 旧版按字段散列存储；goesFirst / tags 是从未被读回的孤儿 key
	storage.setItem("record:playerDeckName", JSON.stringify("青黄"));
	storage.setItem("record:opponentSeries", JSON.stringify("ホロライブ"));
	storage.setItem("record:notes", JSON.stringify("旧草稿"));
	storage.setItem("record:goesFirst", JSON.stringify(false));
	storage.setItem("record:tags", JSON.stringify(["区域赛"]));
	storage.setItem("record:tabValue", JSON.stringify(1));
	storage.setItem("record:datePreset", JSON.stringify("custom"));
	storage.setItem("record:startDate", JSON.stringify("2026-03-01T00:00:00.000Z"));
	storage.setItem("record:tournamentName", JSON.stringify("已废弃"));

	const boot = loadPersisted();
	check("识别为旧格式", boot.isLegacy === true);
	const form = draftToFormState(boot.draft);
	eq("迁移后卡组名还在", form.playerDeckName, "青黄");
	eq("迁移后备注还在", form.notes, "旧草稿");
	eq("孤儿 key goesFirst 被救回", form.goesFirst, false);
	eq("孤儿 key tags 被救回", form.tags, ["区域赛"]);
	eq("迁移后 tabValue 还在", boot.tabValue, 1);
	eq("迁移后 preset 还在", boot.preset, "custom");
	check("迁移后 custom 区间还在", boot.range.start.toISOString() === "2026-03-01T00:00:00.000Z");

	// 模拟组件挂载后的收尾：先写新格式，再删旧 key
	writeJSON(DRAFT_KEY, form);
	writeJSON(VIEW_KEY, { tabValue: boot.tabValue, datePreset: boot.preset,
		startDate: boot.range.start.toISOString(), endDate: null });
	clearLegacyKeys();

	check("旧 key 全部清除", storage.keys().every((k) => k === DRAFT_KEY || k === VIEW_KEY),
		`残留 ${JSON.stringify(storage.keys())}`);
	check("已废弃的 tournamentName 也清掉", storage.getItem("record:tournamentName") === null);

	const again = loadPersisted();
	check("迁移后再读走新格式", again.isLegacy === false);
	eq("迁移后再读 goesFirst 仍是 false", draftToFormState(again.draft).goesFirst, false);
	eq("迁移后再读 tags 仍在", draftToFormState(again.draft).tags, ["区域赛"]);
}

section("loadPersisted — 新格式优先于旧格式");
{
	storage.clear();
	writeJSON(DRAFT_KEY, { playerDeckName: "新" });
	storage.setItem("record:playerDeckName", JSON.stringify("旧"));
	const boot = loadPersisted();
	check("不回落到旧格式", boot.isLegacy === false);
	eq("取新格式的值", draftToFormState(boot.draft).playerDeckName, "新");
}

section("容错");
{
	storage.clear();
	storage.setItem(DRAFT_KEY, "{ 这不是 JSON");
	eq("脏数据不抛，按空处理", readJSON(DRAFT_KEY), null);
	const boot = loadPersisted();
	eq("脏数据下 loadPersisted 仍返回默认", boot.preset, "all");
	eq("脏数据下表单为空", draftToFormState(boot.draft), EMPTY_FORM);

	// localStorage 整体不可用（无痕模式 / 禁用 cookie）
	const real = globalThis.localStorage;
	globalThis.localStorage = {
		getItem() { throw new Error("SecurityError"); },
		setItem() { throw new Error("SecurityError"); },
		removeItem() { throw new Error("SecurityError"); },
	};
	eq("localStorage 抛异常时 readJSON 返回 null", readJSON(DRAFT_KEY), null);
	let threw = false;
	try { writeJSON(DRAFT_KEY, { a: 1 }); clearLegacyKeys(); loadPersisted(); }
	catch { threw = true; }
	check("localStorage 抛异常时不冒泡到调用方", !threw);
	globalThis.localStorage = real;
}


console.log(`\n${"═".repeat(46)}`);
console.log(`通过 ${passed} / 失败 ${failed}`);
if (failed > 0) process.exit(1);
