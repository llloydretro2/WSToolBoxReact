import React from "react";
import PropTypes from "prop-types";
import { X as XIcon } from "lucide-react";

/**
 * 已确认字段的「胶囊」态。
 *
 * 视觉基准取自 Record.jsx 里 TagSelector 的标签胶囊（rounded-full + card-background +
 * border），尺寸放大到主字段级别。
 *
 * X 按钮统一是「清空该字段并回到输入态」，具体动作由使用方通过 onAction 传入。
 *
 * 外层 flex-wrap + break-all 让长文本换行显示完整——这是相对单行 input 的主要收益：
 * 「幻日のヨハネ -SUNSHINE in the MIRROR-（幻日夜羽 -镜中晖光-）」这类系列名
 * 在 input 里只能看到开头一小截。
 */
export default function FieldCapsule({ text, onAction, actionLabel }) {
	return (
		<div className="flex flex-wrap items-center gap-1.5 min-h-[38px]">
			<span
				className="inline-flex items-start gap-1.5 max-w-full px-3 py-1.5 rounded-full
					bg-[var(--card-background)] border border-[var(--border)]
					text-sm font-medium text-[var(--text)]">
				<span className="break-all" title={text}>{text}</span>
				<button
					type="button"
					title={actionLabel}
					aria-label={actionLabel}
					onClick={onAction}
					className="shrink-0 mt-[3px] text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
					<XIcon size={12} />
				</button>
			</span>
		</div>
	);
}

FieldCapsule.propTypes = {
	text:        PropTypes.string.isRequired,
	onAction:    PropTypes.func.isRequired,
	actionLabel: PropTypes.string,
};
