import React from "react";
import PropTypes from "prop-types";
import { Dialog, DialogPanel } from "@headlessui/react";

/**
 * 战绩页所有弹窗的统一外壳。
 *
 * 原来这里是 7 个各自手写的 `fixed inset-0` + 点击遮罩关闭，全文件 `aria-` 出现 0 次：
 * 没有 Esc 关闭、没有焦点陷阱（Tab 会跑到背后的页面上）、
 * 移动端弹窗打开时背景还能跟着滚。
 *
 * Headless UI 的 Dialog 自带这四件事（Esc、焦点陷阱与还原、滚动锁、role/aria-modal），
 * 视觉完全由传入的 className 决定，所以外观与之前保持一致。
 *
 * 注意：`onClose` 会被 Esc 与点击遮罩同时触发，这是 Dialog 的既定行为，
 * 与原先「点遮罩关闭」的交互一致。
 */
export default function RecordDialog({ open, onClose, panelClassName, children, variant = "centered" }) {
	if (variant === "fullscreen") {
		return (
			<Dialog open={open} onClose={onClose} className="relative z-[9998]">
				<DialogPanel className={panelClassName}>{children}</DialogPanel>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onClose={onClose} className="relative z-[9998]">
			{/* 遮罩：aria-hidden，避免被读屏当成内容 */}
			<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<DialogPanel className={panelClassName}>{children}</DialogPanel>
			</div>
		</Dialog>
	);
}

RecordDialog.propTypes = {
	open:           PropTypes.bool.isRequired,
	onClose:        PropTypes.func.isRequired,
	panelClassName: PropTypes.string,
	children:       PropTypes.node,
	/** fullscreen：导出预览那种自带深色背板、铺满视口的弹窗 */
	variant:        PropTypes.oneOf(["centered", "fullscreen"]),
};
