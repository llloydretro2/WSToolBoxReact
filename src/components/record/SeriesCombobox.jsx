import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Combobox } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { useOptions } from "../../contexts/OptionsContext";
import { useLocale } from "../../contexts/LocaleContext";
import FieldCapsule from "./FieldCapsule.jsx";

/**
 * 系列选择器：从 neostandard 列表里挑，因此「选中」就是天然的确认时机，选完即锁成胶囊。
 *
 * 胶囊态相对原来的单行 input 有两个实际收益：
 *   1. JP 侧的显示文本是 `日文（中文）` 格式，长标题在 input 里看不全，胶囊可以换行；
 *   2. 有了独立的 X，可以只清掉这一个字段，不必动旁边的卡组名。
 *
 * X = 取消选择并清空（见 handleClear），与 CommittedField 行为一致。
 *
 * 胶囊态会隐藏 JP/EN 切换：切换会清空已选值（见 handleSideSwitch），
 * 已锁定的字段不该暴露这个入口。
 */
export default function SeriesCombobox({
	value, onChange, label, id, name, clearLabel, ref,
}) {
	const { jpNeostandardMap, neostandardMap, translationMap } = useOptions();
	const { t } = useLocale();
	const [query, setQuery] = useState("");
	const [side, setSide] = useState("jp");
	const [editing, setEditing] = useState(() => !value);
	const inputRef = useRef(null);
	const focusPendingRef = useRef(false);

	const options = useMemo(() => {
		if (side === "en") {
			return Object.keys(neostandardMap)
				.filter((s) => s.trim() !== "")
				.sort()
				.map((s) => ({ key: s, label: s }));
		}
		return Object.keys(jpNeostandardMap)
			.filter((s) => s.trim() !== "")
			.sort()
			.map((s) => ({
				key: s,
				label: `${s}${translationMap.neostandard?.[s] ? `（${translationMap.neostandard[s]}）` : ""}`,
			}));
	}, [side, jpNeostandardMap, neostandardMap, translationMap.neostandard]);

	// 找不到对应项时回落到原始值：草稿恢复的是 EN 系列、而 side 默认 jp 时会走到这里
	const selectedLabel = useMemo(
		() => options.find((o) => o.key === value)?.label ?? value ?? "",
		[options, value]
	);

	const filtered =
		query === ""
			? options
			: options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

	// 值被外部清空（局部重置 / 重置表单 / 切换 JP-EN）时回到可选状态
	useEffect(() => {
		if (!value) setEditing(true);
	}, [value]);

	// 胶囊上的 X = 取消选择并清空，和 CommittedField、TagSelector 的标签 X 保持一致。
	const handleClear = () => {
		focusPendingRef.current = true;
		setQuery("");
		onChange("");
		// value 变空后上面的 effect 也会把 editing 置回 true，这里显式写一遍是为了
		// 父组件受控值未变时（比如本来就是空）也能正确展开。
		setEditing(true);
	};

	// 供父组件在必填校验失败时调用。此时字段本就是空的，所以只需展开聚焦、不用清值。
	const unlock = () => {
		focusPendingRef.current = true;
		setQuery("");
		setEditing(true);
	};
	useImperativeHandle(ref, () => ({ unlock }), []);

	useEffect(() => {
		if (!editing || !focusPendingRef.current) return;
		focusPendingRef.current = false;
		inputRef.current?.focus();
	}, [editing]);

	const handleSelect = (key) => {
		onChange(key ?? "");
		setQuery("");
		if (key) setEditing(false);   // 选中即锁定
	};

	const handleSideSwitch = (newSide) => {
		if (newSide === side) return;
		setSide(newSide);
		onChange("");
		setQuery("");
	};

	return (
		<div className="flex flex-col gap-1.5">
			{/* min-h 固定住这一行，避免胶囊态隐藏 JP/EN 切换后产生布局跳动 */}
			<div className="flex items-center justify-between min-h-[22px]">
				<label htmlFor={id} className="text-[11px] font-bold text-[var(--text-secondary)]">
					{label} <span className="text-[var(--error)]">*</span>
				</label>
				{editing && (
					<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
						{["jp", "en"].map((s, i) => (
							<button
								key={s}
								type="button"
								onClick={() => handleSideSwitch(s)}
								className={`px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
									i === 0 ? "border-r border-[var(--border)]" : ""
								} ${
									side === s
										? "bg-[var(--text)] text-[var(--background)]"
										: "bg-transparent text-[var(--text)] hover:bg-[var(--card-background)]"
								}`}>
								{s.toUpperCase()}
							</button>
						))}
					</div>
				)}
			</div>

			{!editing && value ? (
				<FieldCapsule text={selectedLabel} onAction={handleClear} actionLabel={clearLabel} />
			) : (
				<Combobox value={value} onChange={handleSelect} onClose={() => setQuery("")} immediate>
					<div className="relative">
						<Combobox.Input
							ref={inputRef}
							id={id}
							name={name}
							autoComplete="off"
							placeholder={label}
							displayValue={(key) => {
								const opt = options.find((o) => o.key === key);
								return opt ? opt.label : key ?? "";
							}}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2 pr-8 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)] transition-colors"
						/>
						<Combobox.Button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--border)] hover:text-[var(--text-secondary)] transition-colors">
							<ChevronDown size={14} />
						</Combobox.Button>
						<Combobox.Options
							anchor={{ to: "bottom start", gap: 4 }}
							className="z-[9999] w-[var(--input-width)] border border-[var(--border)] rounded-xl bg-white shadow-lg max-h-56 overflow-auto">
							{filtered.length === 0 ? (
								<div className="px-3 py-2 text-sm text-[var(--text-muted)]">
									{query ? t("record.search.noMatch") : t("record.search.noOptions")}
								</div>
							) : (
								filtered.map((option) => (
									<Combobox.Option
										key={option.key}
										value={option.key}
										className={({ active, selected }) =>
											`px-3 py-2 text-sm cursor-pointer transition-colors ${
												selected
													? "bg-[var(--text-muted)] text-white font-medium"
													: active
													? "bg-[var(--card-background)] text-[var(--text)]"
													: "text-[var(--text)]"
											}`
										}
									>
										{option.label}
									</Combobox.Option>
								))
							)}
						</Combobox.Options>
					</div>
				</Combobox>
			)}
		</div>
	);
}

SeriesCombobox.propTypes = {
	value:       PropTypes.string,
	onChange:    PropTypes.func.isRequired,
	label:       PropTypes.string.isRequired,
	id:          PropTypes.string.isRequired,
	name:        PropTypes.string.isRequired,
	clearLabel:  PropTypes.string,
	ref:         PropTypes.object,
};
