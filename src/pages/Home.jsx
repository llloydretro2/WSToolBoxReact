import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Layers, LayoutGrid, SlidersHorizontal, Mail } from "lucide-react";

const GithubIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
	</svg>
);
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import { SITE_SECTIONS, getSectionToolItems } from "../config/siteStructure";
import pinnedMessageRaw from "../data/pinnedMessage.md?raw";


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

// ─── Markdown renderer（支持 **bold** *italic* [link](url) 段落）─────────────

function renderMarkdown(md) {
	return md.split(/\n\n+/).map((para, pi) => {
		const inline = para.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-[var(--text-muted)] hover:text-[var(--text)]">$1</a>')
			.replace(/\n/g, "<br>");
		return (
			<p key={pi} className="text-sm text-[var(--text-secondary)] leading-relaxed"
			   dangerouslySetInnerHTML={{ __html: inline }} />
		);
	});
}

// ─── RecentUpdates ─────────────────────────────────────────────────────────────

const GITHUB_API = "https://api.github.com/repos/llloydretro2/WSToolBoxReact/commits?per_page=3";

function formatDate(iso) {
	const d = new Date(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCommit(raw) {
	return raw.split("\n")[0].trim();
}

function RecentUpdates({ t }) {
	const [commits, setCommits] = useState([]);
	const [series, setSeries] = useState({ jp: [], en: [] });
	const [seriesTab, setSeriesTab] = useState("jp");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			fetch(GITHUB_API).then((r) => r.json()).catch(() => []),
			fetch(`${import.meta.env.VITE_BACKEND_URL || "https://api.cardtoolbox.org"}/api/options/recent-updates`)
				.then((r) => r.json()).catch(() => ({ jp: [], en: [] })),
		]).then(([commitData, seriesData]) => {
			if (Array.isArray(commitData)) setCommits(commitData);
			if (seriesData?.jp) setSeries(seriesData);
		}).finally(() => setLoading(false));
	}, []);

	const Divider = () => <div className="border-t border-[rgba(166,206,182,0.28)] my-1" />;

	return (
		<div className="mt-8 border border-[var(--border)] rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md">
			{/* Rainbow bar */}
			<div className="h-1" style={{ background: "linear-gradient(90deg, #4f9b78, #d26a6a, #5b84d6)" }} />

			<div className="p-5 sm:p-6 flex flex-col gap-5">

				{/* ── 置顶留言 ── */}
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
							📌 {t("pages.home.recentUpdates.pinned")}
						</span>
					</div>
					<div className="flex flex-col gap-1.5">
						{renderMarkdown(pinnedMessageRaw)}
					</div>
				</div>

				<Divider />

				{/* ── 最近更新系列 ── */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
							{t("pages.home.recentUpdates.seriesTitle")}
						</span>
						<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
							{["jp", "en"].map((lang, i) => (
								<button
									key={lang}
									onClick={() => setSeriesTab(lang)}
									className={`px-3 py-1 text-[10px] font-bold transition-colors ${
										i === 0 ? "border-r border-[var(--border)]" : ""
									} ${seriesTab === lang
										? "bg-[var(--text)] text-[var(--background)]"
										: "text-[var(--text)] hover:bg-[var(--card-background)]"
									}`}>
									{lang.toUpperCase()}
								</button>
							))}
						</div>
					</div>
					{loading ? (
						<div className="flex justify-center py-3">
							<div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--text-muted)] animate-spin" />
						</div>
					) : (
						<div className="flex flex-col gap-0">
							{(series[seriesTab] || []).map((item, i) => (
								<div key={item.name}
								     className={`flex items-center gap-3 py-2 ${i > 0 ? "border-t border-[rgba(166,206,182,0.18)]" : ""}`}>
									<span className="text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap w-14 shrink-0">
										{item.month}
									</span>
									<span className="text-sm text-[var(--text)] truncate">{item.name}</span>
								</div>
							))}
						</div>
					)}
				</div>

				<Divider />

				{/* ── 最新提交 ── */}
				<div>
					<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] block mb-3">
						{t("pages.home.recentUpdates.commitsTitle")}
					</span>
					{loading ? (
						<div className="flex justify-center py-3">
							<div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--text-muted)] animate-spin" />
						</div>
					) : (
						<div className="flex flex-col gap-0">
							{commits.map((c, i) => (
								<a key={c.sha} href={c.html_url} target="_blank" rel="noopener noreferrer"
								   className={`flex items-start gap-3 py-2 hover:bg-[var(--card-background)] rounded-lg px-2 -mx-2 transition-colors ${
								   	i > 0 ? "border-t border-[rgba(166,206,182,0.18)]" : ""
								   }`}>
									<span className="text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap w-24 shrink-0 pt-0.5">
										{formatDate(c.commit.author.date)}
									</span>
									<span className="text-sm text-[var(--text)] leading-snug">
										{parseCommit(c.commit.message)}
									</span>
								</a>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

RecentUpdates.propTypes = {
	t: PropTypes.func.isRequired,
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

			<RecentUpdates t={t} />

			{/* Contact */}
			<div className="text-center mt-12">
				<p className="text-sm font-semibold text-[var(--text-muted)] mb-3">
					{t("pages.home.contactTitle")}
				</p>
				<div className="flex justify-center gap-3">
					{[
						{ href: "https://github.com/llloydretro2/WSToolBoxReact", icon: <GithubIcon />, label: "GitHub" },
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
