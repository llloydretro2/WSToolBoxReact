import React from "react";
import PropTypes from "prop-types";
import { X as XIcon } from "lucide-react";

/**
 * 当前生效的筛选条件摘要。
 *
 * 日期、搜索、标签、卡组四个筛选原本分散在四处、四种不同的视觉（preset 按钮行 /
 * 输入框 / pill 组 / 独立 chip），用户很难一眼看出"我现在在看哪个范围的数据"——
 * 而分析弹窗里所有数字都基于这个范围。
 *
 * 这是**叠加的摘要，不替换选择器**：标签 pill 仍是选择入口，日期 preset 行照旧。
 * 这里只集中回答「当前生效了什么」，并提供逐项与一键清除。
 */
export default function ActiveFilters({ items, totalLabel, clearAllLabel, onClearAll }) {
	if (!items.length) return null;

	return (
		<div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card-background)]">
			{items.map((it) => (
				<span
					key={it.key}
					className="inline-flex items-center gap-1 max-w-full px-2.5 py-1 rounded-full
						bg-white border border-[var(--border)] text-[11px] font-bold text-[var(--text)]">
					<span className="shrink-0 text-[var(--text-muted)]">{it.label}</span>
					<span className="truncate max-w-[160px]" title={it.value}>{it.value}</span>
					{it.onClear && (
						<button
							type="button"
							title={it.label}
							onClick={it.onClear}
							className="shrink-0 text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
							<XIcon size={10} />
						</button>
					)}
				</span>
			))}
			<span className="ml-auto shrink-0 text-[11px] font-bold text-[var(--text-muted)]">{totalLabel}</span>
			<button
				type="button"
				onClick={onClearAll}
				className="shrink-0 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--reset)] underline underline-offset-2 transition-colors">
				{clearAllLabel}
			</button>
		</div>
	);
}

ActiveFilters.propTypes = {
	items: PropTypes.arrayOf(PropTypes.shape({
		key:     PropTypes.string.isRequired,
		label:   PropTypes.string.isRequired,
		value:   PropTypes.string.isRequired,
		onClear: PropTypes.func,
	})).isRequired,
	totalLabel:    PropTypes.string.isRequired,
	clearAllLabel: PropTypes.string.isRequired,
	onClearAll:    PropTypes.func.isRequired,
};
