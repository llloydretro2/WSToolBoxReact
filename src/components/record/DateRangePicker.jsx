import React, { useState } from "react";
import PropTypes from "prop-types";
import { DayPicker } from "react-day-picker";
import { Calendar, X as XIcon } from "lucide-react";

const DAY_PICKER_CLASS = {
	root: "p-4 select-none",
	months: "flex",
	month: "w-[280px]",
	month_caption: "flex items-center justify-between mb-3 px-1",
	caption_label: "text-sm font-bold text-[var(--text)]",
	nav: "flex items-center gap-1",
	button_previous: "p-1.5 rounded-lg hover:bg-[var(--card-background)] text-[var(--text-muted)] transition-colors",
	button_next: "p-1.5 rounded-lg hover:bg-[var(--card-background)] text-[var(--text-muted)] transition-colors",
	chevron: "size-4 fill-current",
	weekdays: "flex mb-1",
	weekday: "w-10 text-center text-[10px] font-bold text-[var(--text-muted)] py-1",
	weeks: "space-y-0.5",
	week: "flex",
	day: "w-10 h-10 p-0.5",
	day_button: "w-full h-full rounded-full text-sm text-[var(--text)] hover:bg-[var(--card-background)] transition-colors flex items-center justify-center",
	today: "font-bold text-[var(--text-muted)]",
	selected: "!bg-[var(--text-muted)] !text-white hover:!bg-[var(--text-secondary)]",
	range_start: "!bg-[var(--text-muted)] !text-white hover:!bg-[var(--text-secondary)]",
	range_end: "!bg-[var(--text-muted)] !text-white hover:!bg-[var(--text-secondary)]",
	range_middle: "!bg-[var(--primary)] !text-[var(--text-secondary)] !rounded-none hover:!bg-[var(--primary-hover)]",
	outside: "opacity-30 pointer-events-none",
	disabled: "opacity-20 cursor-not-allowed pointer-events-none",
	hidden: "invisible",
};

export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, t }) {
	const [open, setOpen] = useState(false);

	const range = { from: startDate || undefined, to: endDate || undefined };

	const handleSelect = (newRange) => {
		onStartChange(newRange?.from ?? null);
		if (newRange?.to) {
			const end = new Date(newRange.to);
			end.setHours(23, 59, 59, 999);
			onEndChange(end);
			if (newRange.from) setOpen(false);
		} else {
			onEndChange(null);
		}
	};

	const fmt = (d) => d
		? t("record.form.dateShort", { month: d.getMonth() + 1, day: d.getDate() })
		: null;

	return (
		<div className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] text-sm hover:bg-[var(--card-background)] transition-colors">
				<Calendar size={14} className="text-[var(--text-muted)] shrink-0" />
				<span className={startDate ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
					{fmt(startDate) ?? t("record.form.startDate")}
				</span>
				<span className="text-[var(--text-muted)] shrink-0 px-0.5">—</span>
				<span className={endDate ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
					{fmt(endDate) ?? t("record.form.endDate")}
				</span>
				{(startDate || endDate) && (
					<button
						onClick={(e) => { e.stopPropagation(); onStartChange(null); onEndChange(null); }}
						className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)] transition-colors shrink-0">
						<XIcon size={13} />
					</button>
				)}
			</button>

			{open && (
				<>
					<div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
					<div className="absolute top-full mt-2 left-0 z-[101] bg-white rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden">
						<DayPicker
							mode="range"
							selected={range}
							onSelect={handleSelect}
							captionLayout="label"
							formatters={{
								formatCaption: (date) => t("record.form.monthCaption", { year: date.getFullYear(), month: date.getMonth() + 1 }),
								formatWeekdayName: (d) => { const w = t("record.weekdays"); return Array.isArray(w) ? w[d.getDay()] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]; },
							}}
							classNames={DAY_PICKER_CLASS}
						/>
					</div>
				</>
			)}
		</div>
	);
}

DateRangePicker.propTypes = {
	startDate: PropTypes.instanceOf(Date),
	endDate:   PropTypes.instanceOf(Date),
	onStartChange: PropTypes.func.isRequired,
	onEndChange:   PropTypes.func.isRequired,
	t: PropTypes.func.isRequired,
};
