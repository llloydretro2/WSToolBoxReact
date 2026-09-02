import React from "react";
import PropTypes from "prop-types";

/**
 * 把文本里命中搜索词的片段包成 <mark>。
 *
 * 搜索是跨字段的模糊匹配（卡组名/系列/备注/标签），不高亮的话用户看着一屏卡片
 * 根本不知道是哪个字段命中的。
 *
 * 纯子串匹配、不做正则，避免用户输入的 `(`、`*` 之类被当成元字符。
 */
export default function Highlight({ text, query }) {
	const raw = text == null ? "" : String(text);
	const q = (query || "").trim();
	if (!q) return raw;

	const lower = raw.toLowerCase();
	const lq = q.toLowerCase();
	const parts = [];
	let i = 0;
	for (;;) {
		const idx = lower.indexOf(lq, i);
		if (idx === -1) {
			parts.push(raw.slice(i));
			break;
		}
		if (idx > i) parts.push(raw.slice(i, idx));
		parts.push(
			<mark key={idx} className="bg-[var(--primary)] text-[var(--text)] rounded-[2px] px-px">
				{raw.slice(idx, idx + q.length)}
			</mark>
		);
		i = idx + q.length;
	}
	return <>{parts}</>;
}

Highlight.propTypes = {
	text:  PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	query: PropTypes.string,
};
