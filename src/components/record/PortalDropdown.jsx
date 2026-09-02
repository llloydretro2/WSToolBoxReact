import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";

/**
 * 挂到 document.body 的下拉面板。
 *
 * 为什么必须 portal：创建表单的卡片是 `bg-white/70 backdrop-blur-md`，
 * `backdrop-filter` 会创建 stacking context，把绝对定位的子元素困在卡片的层叠上下文里
 * ——面板会被后面的兄弟卡片盖住或被裁切。项目约定见 CLAUDE.md，
 * 现成参考实现是 DamageCalculator.jsx 的 VarDropdown。
 *
 * 相比 VarDropdown 多做了一件事：**滚动与窗口尺寸变化时重新定位**。
 * fixed 定位的面板不会跟着页面滚，不重算就会留在原地飘着。
 */
export default function PortalDropdown({ anchorRef, open, onClose, children, matchWidth = true }) {
	const [pos, setPos] = useState(null);
	const panelRef = useRef(null);

	useLayoutEffect(() => {
		if (!open) return undefined;
		const place = () => {
			const el = anchorRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			setPos({ top: r.bottom + 4, left: r.left, width: r.width });
		};
		place();
		// 捕获阶段监听：内层滚动容器（弹窗内容区等）的滚动也能收到
		window.addEventListener("scroll", place, true);
		window.addEventListener("resize", place);
		return () => {
			window.removeEventListener("scroll", place, true);
			window.removeEventListener("resize", place);
		};
	}, [open, anchorRef]);

	useEffect(() => {
		if (!open) return undefined;
		const onPointerDown = (e) => {
			if (anchorRef.current?.contains(e.target)) return;
			if (panelRef.current?.contains(e.target)) return;
			onClose();
		};
		const onKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open, onClose, anchorRef]);

	if (!open || !pos) return null;

	return createPortal(
		<div
			ref={panelRef}
			style={{
				position: "fixed",
				top: pos.top,
				left: pos.left,
				width: matchWidth ? pos.width : undefined,
				zIndex: 9999,
			}}
			className="max-h-56 overflow-auto bg-white border border-[var(--border)] rounded-xl shadow-lg">
			{children}
		</div>,
		document.body
	);
}

PortalDropdown.propTypes = {
	anchorRef:  PropTypes.object.isRequired,
	open:       PropTypes.bool,
	onClose:    PropTypes.func.isRequired,
	children:   PropTypes.node,
	matchWidth: PropTypes.bool,
};
