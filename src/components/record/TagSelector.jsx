import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Plus, X as XIcon } from "lucide-react";
import { useLocale } from "../../contexts/LocaleContext";
import PortalDropdown from "./PortalDropdown.jsx";

export default function TagSelector({ selected, available, onChange }) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const addBtnRef = useRef(null);
	const unselected = available.filter((t) => !selected.includes(t));

	const remove = (tag) => onChange(selected.filter((t) => t !== tag));
	const add    = (tag) => { onChange([...selected, tag]); setOpen(false); };

	return (
		<div className="relative">
			<div className="flex flex-wrap gap-1.5 min-h-[36px] border border-[var(--border)] rounded-lg px-2 py-1.5 bg-transparent">
				{selected.map((tag) => (
					<span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--card-background)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-muted)]">
						{tag}
						<button type="button" onClick={() => remove(tag)} className="hover:text-[var(--reset)] transition-colors"><XIcon size={10} /></button>
					</span>
				))}
				{unselected.length > 0 && (
					<button ref={addBtnRef} type="button" onClick={() => setOpen((v) => !v)}
						className="flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-[var(--border)] text-[11px] text-[var(--text-muted)] hover:bg-[var(--card-background)] transition-colors">
						<Plus size={10} /> {t("record.addButton")}
					</button>
				)}
			</div>
			{/* portal 而非 absolute：这个选择器就在 backdrop-blur-md 卡片内，
			    绝对定位的面板会被卡片的层叠上下文困住。详见 PortalDropdown 注释。 */}
			<PortalDropdown
				anchorRef={addBtnRef}
				open={open && unselected.length > 0}
				onClose={() => setOpen(false)}
				matchWidth={false}>
				<div className="min-w-[140px]">
					{unselected.map((tag) => (
						<button key={tag} type="button" onClick={() => add(tag)}
							className="w-full text-left px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
							{tag}
						</button>
					))}
				</div>
			</PortalDropdown>
		</div>
	);
}

TagSelector.propTypes = {
	selected:  PropTypes.arrayOf(PropTypes.string).isRequired,
	available: PropTypes.arrayOf(PropTypes.string).isRequired,
	onChange:  PropTypes.func.isRequired,
};
