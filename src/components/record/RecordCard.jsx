import React from "react";
import PropTypes from "prop-types";
import { Trophy, Trash2, Pencil } from "lucide-react";
import Highlight from "./Highlight.jsx";

/**
 * 单条对战记录卡。
 *
 * 用 React.memo 包裹：整个 Record 页是一个 2000+ 行的渲染单元，搜索框每敲一个字符
 * 就会重建全部可见卡片的 JSX。memo 之后只有 record 真正变化的那张卡会重渲染。
 *
 * ⚠️ 父组件必须用 useCallback 稳定 onEdit / onDelete 的引用，
 * 否则每次渲染都是新函数，memo 会被直接击穿，等于白做。
 *
 * `compact` 是一行一条的紧凑视图：完整卡片含结果头/标签/我方/VS/对手/备注/操作栏，
 * 翻几十条要滚很久，紧凑视图把一屏能看的条数提高好几倍。
 * `query` 用于高亮搜索命中——搜索是跨字段模糊匹配，不高亮就看不出是哪个字段命中的。
 */
function RecordCard({ record, t, onEdit, onDelete, compact = false, query = "" }) {
	const resultBg =
		record.result === "win" ? "bg-[var(--success)]"
		: record.result === "lose" ? "bg-[var(--error)]"
		: "bg-[var(--draw)]";
	const resultLabel =
		record.result === "win" ? t("record.form.result.win")
		: record.result === "lose" ? t("record.form.result.lose")
		: t("record.form.result.doubleLose");
	const when = new Date(record.timestamp);

	if (compact) {
		return (
			<div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-white/70 backdrop-blur-md hover:shadow-sm transition-shadow">
				<span className={`shrink-0 min-w-[2rem] text-center text-[10px] font-black text-white rounded px-1 py-0.5 ${resultBg}`}>
					{resultLabel}
				</span>
				<span className="min-w-0 flex-1 text-xs text-[var(--text)] truncate">
					<Highlight text={record.playerDeckName || t("record.display.unknownDeck")} query={query} />
					<span className="mx-1.5 text-[10px] font-black text-[var(--text-muted)]">VS</span>
					<Highlight text={record.opponentDeckName || t("record.display.unknownDeck")} query={query} />
				</span>
				{record.tags?.length > 0 && (
					<span className="shrink-0 hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-background)] text-[var(--text-secondary)] max-w-[120px] truncate">
						<Highlight text={record.tags.join(" / ")} query={query} />
					</span>
				)}
				<span className="shrink-0 text-[10px] text-[var(--text-muted)]" title={when.toLocaleString()}>
					{when.toLocaleDateString()}
				</span>
				<button
					title={t("record.edit.button")}
					onClick={() => onEdit(record)}
					className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
					<Pencil size={13} />
				</button>
				<button
					title={t("record.display.deleteTooltip")}
					onClick={() => onDelete(record)}
					className="shrink-0 text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
					<Trash2 size={13} />
				</button>
			</div>
		);
	}

	return (
		<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
			{/* Result header */}
			<div className={`px-4 py-3 flex items-center justify-between text-white ${
				record.result === "win" ? "bg-[var(--success)]"
				: record.result === "lose" ? "bg-[var(--error)]"
				: "bg-[var(--draw)]"
			}`}>
				<div className="flex items-center gap-2">
					<Trophy size={15} />
					<span className="font-bold text-sm">
						{record.result === "win" ? t("record.form.result.win")
							: record.result === "lose" ? t("record.form.result.lose")
							: t("record.form.result.doubleLose")}
					</span>
					{record.goesFirst !== null && record.goesFirst !== undefined && (
						<span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/20">
							{record.goesFirst ? t("record.form.goesFirst.first") : t("record.form.goesFirst.second")}
						</span>
					)}
				</div>
				<span className="text-xs opacity-90" title={new Date(record.timestamp).toLocaleString()}>
					{new Date(record.timestamp).toLocaleDateString()}{" "}
					<span className="opacity-75">
						{new Date(record.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
					</span>
				</span>
			</div>
			{/* Card body */}
			<div className="p-4">
				{record.tags?.length > 0 && (
					<div className="flex flex-wrap gap-1 justify-center mb-3">
						{record.tags.map((tag) => (
							<span key={tag} className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--card-background)] text-[var(--text-secondary)] border border-[var(--border)]">
								<Highlight text={tag} query={query} />
							</span>
						))}
					</div>
				)}
				<div className="mb-3">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">{t("record.display.myDeck")}</p>
					<p className="text-sm font-medium text-[var(--text)] mb-1.5"><Highlight text={record.playerDeckName || t("record.display.unknownDeck")} query={query} /></p>
					<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--text-muted)] text-[var(--text-muted)]">
						<Highlight text={record.playerSeries || t("record.display.unknownSeries")} query={query} />
					</span>
				</div>
				<div className="flex items-center gap-3 my-3">
					<div className="flex-1 border-t border-[var(--border)]" />
					<span className="text-[10px] font-black tracking-widest text-[var(--text-muted)]">VS</span>
					<div className="flex-1 border-t border-[var(--border)]" />
				</div>
				<div className="mb-1">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">{t("record.display.opponentDeck")}</p>
					<p className="text-sm font-medium text-[var(--text)] mb-1.5"><Highlight text={record.opponentDeckName || t("record.display.unknownDeck")} query={query} /></p>
					<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
						<Highlight text={record.opponentSeries || t("record.display.unknownSeries")} query={query} />
					</span>
				</div>
				{record.notes && (
					<div className="mt-3 p-3 rounded-xl bg-[var(--card-background)] border border-[var(--border)]">
						<p className="text-xs text-[var(--text-secondary)]">
							<span className="font-bold">{t("record.display.notesLabel")}</span><Highlight text={record.notes} query={query} />
						</p>
					</div>
				)}
			</div>
			{/* Footer */}
			<div className="px-4 py-2.5 flex items-center justify-between border-t border-[var(--border)]">
				<button
					title={t("record.edit.button")}
					onClick={() => onEdit(record)}
					className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
					<Pencil size={15} />
				</button>
				<button
					title={t("record.display.deleteTooltip")}
					onClick={() => onDelete(record)}
					className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
					<Trash2 size={15} />
				</button>
			</div>
		</div>
	);
}

RecordCard.propTypes = {
	record:   PropTypes.object.isRequired,
	t:        PropTypes.func.isRequired,
	onEdit:   PropTypes.func.isRequired,
	onDelete: PropTypes.func.isRequired,
	compact:  PropTypes.bool,
	query:    PropTypes.string,
};

export default React.memo(RecordCard);
