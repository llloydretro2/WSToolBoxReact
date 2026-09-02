/* global process */
/**
 * recordCsv.js 自测。运行：node src/utils/test-recordCsv.js
 *
 * 重点是两类容易出事的转义：含逗号/换行/双引号的备注（串列），
 * 以及以 = + - @ 开头的值（Excel 公式注入）。
 */

import { escapeCell, buildCsv } from "./recordCsv.js";

let passed = 0;
let failed = 0;
const check = (name, cond, detail = "") => {
	if (cond) { passed++; console.log(`  ✅ ${name}`); }
	else { failed++; console.log(`  ❌ ${name}${detail ? `\n       ${detail}` : ""}`); }
};
const eq = (name, actual, expected) =>
	check(name, actual === expected, `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
const section = (t) => console.log(`\n── ${t} ──`);

const t = (key) => ({
	"record.form.result.win": "胜",
	"record.form.result.lose": "败",
	"record.form.result.doubleLose": "双败",
	"record.form.goesFirst.first": "先攻",
	"record.form.goesFirst.second": "後攻",
}[key] ?? key);

const HEADER = {
	timestamp: "时间", result: "结果", goesFirst: "先後攻",
	playerSeries: "我方系列", playerDeckName: "我方卡组",
	opponentSeries: "对手系列", opponentDeckName: "对手卡组",
	tags: "标签", notes: "备注",
};

section("escapeCell — RFC4180 转义");
{
	eq("普通值加引号", escapeCell("青黄扉"), '"青黄扉"');
	eq("null → 空", escapeCell(null), '""');
	eq("undefined → 空", escapeCell(undefined), '""');
	eq("含逗号不串列", escapeCell("a,b"), '"a,b"');
	eq("含换行不串行", escapeCell("第一行\n第二行"), '"第一行\n第二行"');
	eq("双引号转成两个", escapeCell('他说"好"'), '"他说""好"""');
}

section("escapeCell — 公式注入防护");
{
	eq("= 开头前置单引号", escapeCell("=1+1"), `"'=1+1"`);
	eq("+ 开头", escapeCell("+cmd"), `"'+cmd"`);
	eq("- 开头", escapeCell("-2"), `"'-2"`);
	eq("@ 开头", escapeCell("@SUM(A1)"), `"'@SUM(A1)"`);
	eq("制表符开头", escapeCell("\t=1"), `"'\t=1"`);
	check("正常值不被加单引号", escapeCell("青黄") === '"青黄"');
	// 真实场景：卡组名里带减号（如「赤単-アグロ」）不该被误伤成公式，
	// 但保守起见仍加前缀——显示时多一个引号远好过被当公式执行。
	eq("减号开头的卡组名也加前缀（保守）", escapeCell("-赤単"), `"'-赤単"`);
}

section("buildCsv — 整表");
{
	const records = [
		{ timestamp: "2026-08-30T14:25:00.000Z", result: "win", goesFirst: true,
		  playerSeries: "BanG Dream!", playerDeckName: "青黄扉",
		  opponentSeries: "ホロライブ", opponentDeckName: "赤単",
		  tags: ["区域赛", "8月"], notes: "对面,爆种" },
		{ timestamp: "2026-08-28T09:00:00.000Z", result: "doubleLose", goesFirst: null,
		  playerSeries: "A", playerDeckName: "B", opponentSeries: "C", opponentDeckName: "D",
		  tags: [], notes: "" },
	];
	const csv = buildCsv(records, t, HEADER);
	const lines = csv.split("\r\n");

	eq("行数 = 表头 + 记录数", lines.length, 3);
	check("用 CRLF 换行（Excel 兼容）", csv.includes("\r\n"));
	eq("表头正确", lines[0], '"时间","结果","先後攻","我方系列","我方卡组","对手系列","对手卡组","标签","备注"');
	check("胜负已本地化", lines[1].includes('"胜"'), lines[1]);
	check("先攻已本地化", lines[1].includes('"先攻"'), lines[1]);
	check("标签用 / 连接", lines[1].includes('"区域赛 / 8月"'), lines[1]);
	check("含逗号的备注被包住", lines[1].includes('"对面,爆种"'), lines[1]);
	check("goesFirst=null → 空", lines[2].includes('"双败","",'), lines[2]);

	// 每行的字段数必须一致，否则 Excel 会串列
	const cols = lines.map((l) => l.match(/"(?:[^"]|"")*"/g)?.length);
	check("每行字段数一致", new Set(cols).size === 1 && cols[0] === 9, `实际 ${JSON.stringify(cols)}`);

	eq("空记录只有表头", buildCsv([], t, HEADER).split("\r\n").length, 1);
}

section("buildCsv — 备注含换行时仍能被正确解析");
{
	const csv = buildCsv(
		[{ timestamp: "2026-08-30T00:00:00.000Z", result: "win", goesFirst: false,
		   playerSeries: "S", playerDeckName: "D", opponentSeries: "S2", opponentDeckName: "D2",
		   tags: [], notes: "第一行\n第二行" }], t, HEADER);
	// 简易 CSV 解析：引号内的换行不算行分隔
	const rows = [];
	let cur = "", inQuotes = false;
	for (let i = 0; i < csv.length; i++) {
		const ch = csv[i];
		if (ch === '"') inQuotes = !inQuotes;
		if (!inQuotes && ch === "\r" && csv[i + 1] === "\n") { rows.push(cur); cur = ""; i++; continue; }
		cur += ch;
	}
	if (cur) rows.push(cur);
	eq("解析出的行数仍是 2", rows.length, 2);
	check("备注里的换行保留在单元格内", rows[1].includes("第一行\n第二行"));
}

console.log(`\n${"═".repeat(46)}`);
console.log(`通过 ${passed} / 失败 ${failed}`);
if (failed > 0) process.exit(1);
