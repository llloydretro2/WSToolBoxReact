import React from "react";
import PropTypes from "prop-types";

export default function SectionCard({ section, t, locale: _locale, onNavigate }) {
	const { Icon, accent, path, toolItems, homeImage } = section;
	const toolCountLabel = t("pages.home.toolCount").replace("{{count}}", toolItems.length);

	return (
		<div
			onClick={() => onNavigate(path)}
			className="group cursor-pointer rounded-2xl border border-[var(--border)] overflow-hidden h-full
			           flex flex-col relative transition-all duration-200
			           hover:-translate-y-1.5 hover:shadow-lg"
			style={{
				backgroundImage: `url('${homeImage}')`,
				backgroundSize: "cover",
				backgroundPosition: "center",
			}}
		>
			{/* Overlay */}
			<div className="absolute inset-0 bg-white/[0.78] group-hover:bg-white/[0.65] transition-colors duration-200" />

			{/* Accent bar */}
			<div className="h-1 flex-shrink-0 relative z-10" style={{ backgroundColor: accent }} />

			{/* Body */}
			<div className="p-4 flex flex-col flex-1 relative z-10 gap-2">

				{/* Icon + title + count */}
				<div className="flex items-center gap-2.5">
					<div
						className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
						style={{ backgroundColor: `${accent}18` }}>
						<Icon size={16} style={{ color: accent }} />
					</div>
					<div>
						<p className="text-sm font-bold text-[var(--text)] leading-tight">
							{t(section.labelKey)}
						</p>
						<p className="text-[11px] font-semibold" style={{ color: accent }}>
							{toolCountLabel}
						</p>
					</div>
				</div>

				{/* Description */}
				<p className="text-xs text-[var(--text-secondary)] leading-relaxed flex-1">
					{t(section.descKey)}
				</p>

				{/* Tool chips */}
				<div className="flex flex-wrap gap-1">
					{toolItems.map((item) => (
						<span
							key={item.path}
							className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
							style={{
								backgroundColor: `${accent}14`,
								color: accent,
								borderColor: `${accent}30`,
							}}>
							{t(item.labelKey)}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

SectionCard.propTypes = {
	section: PropTypes.shape({
		key: PropTypes.string.isRequired,
		Icon: PropTypes.elementType.isRequired,
		accent: PropTypes.string.isRequired,
		path: PropTypes.string.isRequired,
		labelKey: PropTypes.string.isRequired,
		descKey: PropTypes.string.isRequired,
		homeImage: PropTypes.string.isRequired,
		toolItems: PropTypes.arrayOf(PropTypes.shape({
			labelKey: PropTypes.string.isRequired,
			path: PropTypes.string.isRequired,
		})).isRequired,
	}).isRequired,
	t: PropTypes.func.isRequired,
	locale: PropTypes.string.isRequired,
	onNavigate: PropTypes.func.isRequired,
};
