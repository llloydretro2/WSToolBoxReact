/**
 * 战绩记录导出 CSV。
 *
 * 页面原本只能导出统计卡片 PNG 与对位矩阵 PNG，想自己用 Excel 深挖的用户没路走。
 *
 * 纯函数（除 triggerDownload），可用 node 直接跑 test-recordCsv.js。
 */

/**
 * CSV 字段转义。
 *
 * 两件事都必须做：
 * 1. **RFC4180 转义** —— 一律用双引号包裹，内部双引号写成两个。
 *    备注里带逗号或换行时不这么做会直接串列。
 * 2. **公式注入防护** —— Excel / Numbers 会把以 = + - @ 开头的单元格当公式执行，
 *    卡组名叫「=cmd」之类就成了攻击面。前置一个单引号让它退回文本。
 *    制表符与回车开头同理（部分实现会跳过前导空白再判断）。
 */
export const escapeCell = (value) => {
	let s = value == null ? "" : String(value);
	if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return `"${s.replace(/"/g, '""')}"`;
};

/** 列定义：表头文案由调用方用 t() 提供，取值逻辑留在这里。 */
export const CSV_COLUMNS = [
	{ key: "timestamp", get: (r) => new Date(r.timestamp).toLocaleString() },
	{ key: "result", get: (r, t) =>
		r.result === "win" ? t("record.form.result.win")
		: r.result === "lose" ? t("record.form.result.lose")
		: t("record.form.result.doubleLose") },
	{ key: "goesFirst", get: (r, t) =>
		r.goesFirst === true ? t("record.form.goesFirst.first")
		: r.goesFirst === false ? t("record.form.goesFirst.second")
		: "" },
	{ key: "playerSeries",     get: (r) => r.playerSeries },
	{ key: "playerDeckName",   get: (r) => r.playerDeckName },
	{ key: "opponentSeries",   get: (r) => r.opponentSeries },
	{ key: "opponentDeckName", get: (r) => r.opponentDeckName },
	{ key: "tags",             get: (r) => (r.tags || []).join(" / ") },
	{ key: "notes",            get: (r) => r.notes },
];

/**
 * @param records 已应用全部筛选的记录（与页面所见一致）
 * @param t       locale 取词函数
 * @param header  key → 表头文案
 */
export const buildCsv = (records, t, header) => {
	const lines = [CSV_COLUMNS.map((c) => escapeCell(header[c.key])).join(",")];
	records.forEach((r) => {
		lines.push(CSV_COLUMNS.map((c) => escapeCell(c.get(r, t))).join(","));
	});
	// CRLF：Excel 对纯 \n 的兼容性不如 \r\n
	return lines.join("\r\n");
};

/**
 * 触发下载。
 * BOM 是必需的——没有它 Excel 会用系统本地编码打开，中文/日文卡组名全是乱码。
 */
export const downloadCsv = (csv, filename) => {
	const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
