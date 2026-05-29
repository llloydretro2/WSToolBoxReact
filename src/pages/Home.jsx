import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Layers, LayoutGrid, SlidersHorizontal, Github, Mail } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import { SITE_SECTIONS, getSectionToolItems } from "../config/siteStructure";
import { RECENT_UPDATES, getLocalizedUpdateField } from "../data/recentUpdates";

const SECTION_ICONS = {
	ws:     Layers,
	mahjong: LayoutGrid,
	tools:  SlidersHorizontal,
};

const SECTIONS = SITE_SECTIONS.map((section) => ({
	...section,
	Icon: SECTION_ICONS[section.key],
	path: section.defaultPath,
}));

// ─── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ section, t, locale, onNavigate }) {
	const { Icon, accent, path, toolItems, homeImage } = section;
	const toolCountLabel = locale === "zh"
		? `${toolItems.length} 个工具`
		: `${toolItems.length} tool${toolItems.length !== 1 ? "s" : ""}`;

	return (
		<div
			onClick={() => onNavigate(path)}
			className="cursor-pointer rounded-2xl border border-[var(--border)] overflow-hidden h-full
			           flex flex-col relative transition-all duration-200
			           hover:-translate-y-1.5 hover:shadow-lg"
			style={{
				backgroundImage: `url('${homeImage}')`,
				backgroundSize: "cover",
				backgroundPosition: "center",
			}}
		>
			{/* Overlay */}
			<div
				className="absolute inset-0 transition-colors duration-200"
				style={{ backgroundColor: "rgba(255,255,255,0.58)" }}
				onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.44)")}
				onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.58)")}
			/>

			{/* Accent bar */}
			<div className="h-1.5 flex-shrink-0 relative z-10" style={{ backgroundColor: accent }} />

			{/* Body */}
			<div className="p-5 flex flex-col flex-1 relative z-10 gap-3">

				{/* Icon + title + count */}
				<div className="flex items-start gap-3">
					<div
						className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
						style={{ backgroundColor: `${accent}18` }}>
						<Icon size={20} style={{ color: accent }} />
					</div>
					<div>
						<p className="text-base font-bold text-[var(--text)] leading-tight mb-0.5">
							{t(section.labelKey)}
						</p>
						<p className="text-xs font-semibold" style={{ color: accent }}>
							{toolCountLabel}
						</p>
					</div>
				</div>

				{/* Description */}
				<p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
					{t(section.descKey)}
				</p>

				{/* Tool chips */}
				<div className="flex flex-wrap gap-1.5">
					{toolItems.map((item) => (
						<span
							key={item.path}
							className="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
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

// ─── RecentUpdates ─────────────────────────────────────────────────────────────

function RecentUpdates({ t, locale }) {
	const [expanded, setExpanded] = useState(false);
	const updates = RECENT_UPDATES;
	const visible = expanded ? updates : updates.slice(0, 2);
	if (updates.length === 0) return null;

	return (
		<div className="mt-8 border border-[var(--border)] rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md">
			{/* Rainbow bar */}
			<div className="h-1" style={{ background: "linear-gradient(90deg, #4f9b78, #d26a6a, #5b84d6)" }} />

			<div className="p-5 sm:p-6">
				<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-0.5">
					{t("pages.home.recentUpdates.eyebrow")}
				</p>
				<p className="text-lg font-black text-[var(--text)] mb-1">
					{t("pages.home.recentUpdates.title")}
				</p>
				<p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
					{t("pages.home.recentUpdates.subtitle")}
				</p>

				<div className="flex flex-col gap-0">
					{visible.map((item, i) => (
						<div
							key={`${item.date}-${item.title}`}
							className={`grid grid-cols-1 sm:grid-cols-[88px_1fr] gap-1 sm:gap-4 py-3
							            ${i > 0 ? "border-t border-[rgba(166,206,182,0.28)]" : ""}`}>
							<p className="text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap">
								{getLocalizedUpdateField(item.date, locale)}
							</p>
							<div>
								<p className="text-sm font-bold text-[var(--text)] mb-0.5">
									{getLocalizedUpdateField(item.title, locale)}
								</p>
								<p className="text-sm text-[var(--text-secondary)] leading-relaxed">
									{getLocalizedUpdateField(item.body, locale)}
								</p>
							</div>
						</div>
					))}
				</div>

				{updates.length > 2 && (
					<div className="flex justify-center mt-4">
						<button
							type="button"
							onClick={() => setExpanded((v) => !v)}
							className="text-[12px] font-bold px-4 py-1.5 rounded-full text-[var(--text-secondary)]
							           bg-[rgba(166,206,182,0.24)] hover:bg-[rgba(166,206,182,0.38)] transition-colors">
							{expanded
								? t("pages.home.recentUpdates.collapse")
								: t("pages.home.recentUpdates.expand")}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

RecentUpdates.propTypes = {
	t: PropTypes.func.isRequired,
	locale: PropTypes.string.isRequired,
};

// ─── Home ──────────────────────────────────────────────────────────────────────

export default function Home() {
	const { t, locale } = useLocale();
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();
	const includeAuth = isAuthenticated();
	const sections = SECTIONS.map((section) => ({
		...section,
		toolItems: getSectionToolItems(section, includeAuth),
	}));

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

			{/* Header */}
			<div className="text-center mb-8">
				<h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[var(--text)] leading-none mb-2"
				    style={{ letterSpacing: "-0.5px" }}>
					{t("pages.home.title")}
				</h1>
				<p className="text-base text-[var(--text-secondary)] opacity-75">
					{t("pages.home.subtitle")}
				</p>
			</div>

			{/* Section cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{sections.map((section) => (
					<SectionCard
						key={section.key}
						section={section}
						t={t}
						locale={locale}
						onNavigate={navigate}
					/>
				))}
			</div>

			<RecentUpdates t={t} locale={locale} />

			{/* Contact */}
			<div className="text-center mt-12">
				<p className="text-sm font-semibold text-[var(--text-muted)] mb-3">
					{t("pages.home.contactTitle")}
				</p>
				<div className="flex justify-center gap-3">
					{[
						{ href: "https://github.com/llloydretro2/WSToolBoxReact", icon: <Github size={16} />, label: "GitHub" },
						{
							href: "https://space.bilibili.com/13365744",
							icon: <img src="bilibili.svg" alt="Bilibili" width={16} height={16} className="opacity-60" />,
							label: "Bilibili",
						},
						{ href: "mailto:lloydretro2@gmail.com", icon: <Mail size={16} />, label: "Email" },
					].map(({ href, icon, label }) => (
						<a
							key={label}
							href={href}
							target={label !== "Email" ? "_blank" : undefined}
							rel="noopener noreferrer"
							className="w-9 h-9 rounded-full flex items-center justify-center
							           bg-black/[0.06] text-[var(--text-secondary)]
							           hover:bg-black/[0.12] hover:scale-110 transition-all duration-200">
							{icon}
						</a>
					))}
				</div>
			</div>
		</div>
	);
}
