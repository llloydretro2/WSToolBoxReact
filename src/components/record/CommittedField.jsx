import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import FieldCapsule from "./FieldCapsule.jsx";
import PortalDropdown from "./PortalDropdown.jsx";

const INPUT_CLASS =
	"w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 text-sm " +
	"text-[var(--text)] placeholder:text-[var(--text-muted)] " +
	"focus:outline-none focus:border-[var(--text-muted)] transition-colors";

/**
 * 自由文本字段（卡组名）的「胶囊 / 输入框」二态控件。
 *
 * 输入框只是辅助录入的手段，录完就收起成胶囊，让「已确认」这件事在界面上看得见。
 *
 * 锁定时机：**失焦即锁定（非空时），回车也锁**。系列可以靠「从下拉选中」作为天然的
 * 确认时机，自由文本没有，失焦是最接近用户直觉的替代。
 *
 * X = 清空并回到输入态（与 SeriesCombobox 的 X 一致）。这样每个字段都能单独清掉，
 * 不必动卡片右上角那个「我方/对手」整体重置——那个会把卡组名和系列一起清了。
 *
 * `suggestions` 是历史用过的值（`[{ value, count }]`）。组件本身是「笨」的——
 * 只按当前输入做子串过滤；排序、按系列联动过滤都由父组件在传进来之前决定。
 *
 * ⚠️ 不要给这里的 input 加原生 `required`：胶囊态下 input 不在 DOM 里，浏览器校验
 * 会静默失效，导致空字段也能提交。必填校验统一由 Record.jsx 的 submit 处理器负责，
 * 并通过 ref.unlock() 把出问题的字段拆开聚焦。
 */
export default function CommittedField({
	value, onChange, label, id, name, clearLabel, suggestions = [], ref,
}) {
	// 带值挂载（从草稿恢复 / 打开编辑对话框）时直接进胶囊态
	const [editing, setEditing] = useState(() => !value);
	const [focused, setFocused] = useState(false);
	const inputRef = useRef(null);
	const focusPendingRef = useRef(false);

	// 已输入的内容作为子串过滤；完全等于某项时不再提示它（已经选中了，没意义）
	const matched = useMemo(() => {
		const q = value.trim().toLowerCase();
		return suggestions
			.filter((s) => s.value && s.value.toLowerCase() !== q)
			.filter((s) => !q || s.value.toLowerCase().includes(q))
			.slice(0, 8);
	}, [suggestions, value]);

	// 胶囊上的 X = 清空。value 变空后下面的 effect 也会把 editing 置回 true，
	// 这里显式写一遍是为了受控值未变时也能正确展开。
	const handleClear = () => {
		focusPendingRef.current = true;
		onChange("");
		setEditing(true);
	};

	// 供父组件在必填校验失败时调用。此时字段本就是空的，只需展开聚焦、不用清值。
	const unlock = () => {
		focusPendingRef.current = true;
		setEditing(true);
	};
	useImperativeHandle(ref, () => ({ unlock }), []);

	// 值被外部清空（局部重置 / 重置表单）时自动回到输入态，
	// 否则再次输入的瞬间就会被判定成「有值」而弹回胶囊，输入框根本没法用。
	useEffect(() => {
		if (!value) setEditing(true);
	}, [value]);

	useEffect(() => {
		if (!editing || !focusPendingRef.current) return;
		focusPendingRef.current = false;
		const el = inputRef.current;
		if (!el) return;
		el.focus();
		const len = el.value.length;
		el.setSelectionRange(len, len);   // 值非空时（校验回填）光标置末尾
	}, [editing]);

	const commit = () => {
		if (value.trim()) setEditing(false);
	};

	// 点建议项即填入并锁定
	const pick = (picked) => {
		onChange(picked);
		setFocused(false);
		setEditing(false);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="text-[11px] font-bold text-[var(--text-secondary)]">
				{label} <span className="text-[var(--error)]">*</span>
			</label>
			{!editing && value ? (
				<FieldCapsule text={value} onAction={handleClear} actionLabel={clearLabel} />
			) : (
				<div className="relative">
					<input
						ref={inputRef}
						id={id}
						name={name}
						autoComplete="off"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onFocus={() => setFocused(true)}
						onBlur={() => { setFocused(false); commit(); }}
						onKeyDown={(e) => {
							if (e.key === "Escape") { setFocused(false); return; }
							if (e.key !== "Enter") return;
							// 字段在 <form> 内，不拦截回车会直接触发表单提交
							e.preventDefault();
							setFocused(false);
							commit();
						}}
						className={INPUT_CLASS}
					/>
					<PortalDropdown
						anchorRef={inputRef}
						open={focused && matched.length > 0}
						onClose={() => setFocused(false)}>
						{matched.map((s) => (
							<button
								key={s.value}
								type="button"
								// mousedown 必须 preventDefault：否则 input 先失焦 → commit() 锁成胶囊
								// → 下拉随之卸载，click 根本落不到这个按钮上。
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => pick(s.value)}
								className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
								<span className="truncate">{s.value}</span>
								{s.count > 1 && (
									<span className="shrink-0 text-[10px] text-[var(--text-muted)]">{s.count}</span>
								)}
							</button>
						))}
					</PortalDropdown>
				</div>
			)}
		</div>
	);
}

CommittedField.propTypes = {
	value:       PropTypes.string,
	onChange:    PropTypes.func.isRequired,
	label:       PropTypes.string.isRequired,
	id:          PropTypes.string.isRequired,
	name:        PropTypes.string.isRequired,
	clearLabel:  PropTypes.string,
	suggestions: PropTypes.arrayOf(PropTypes.shape({
		value: PropTypes.string,
		count: PropTypes.number,
	})),
	ref:         PropTypes.object,
};
