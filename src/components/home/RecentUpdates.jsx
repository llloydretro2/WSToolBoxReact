import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { apiRequest } from "../../utils/api.js";
import pinnedMessageRaw from "../../data/pinnedMessage.md?raw";

// ── GitHub commits cache ───────────────────────────────────────────────────────

const GITHUB_API       = "https://api.github.com/repos/llloydretro2/WSToolBoxReact/commits?per_page=3";
const GITHUB_CACHE_KEY = "gh_commits_cache";
const GITHUB_CACHE_TTL = 24 * 60 * 60 * 1000;

function getCachedCommits() {
	try {
		const raw = localStorage.getItem(GITHUB_CACHE_KEY);
		if (!raw) return null;
		const { data, ts } = JSON.parse(raw);
		if (Date.now() - ts > GITHUB_CACHE_TTL) return null;
		return data;
	} catch {
		return null;
	}
}

function setCachedCommits(data) {
	try {
		localStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
	} catch {
		// localStorage 不可用时静默失败
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso) {
	const d = new Date(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCommit(raw) {
	return raw.split("\n")[0].trim();
}

function renderMarkdown(md) {
	return md.split(/\n\n+/).map((para, pi) => {
		const inline = para
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-[var(--text-muted)] hover:text-[var(--text)]">$1</a>')
			.replace(/\n/g, "<br>");
		return (
			<p key={pi} className="text-sm text-[var(--text-secondary)] leading-relaxed"
			   dangerouslySetInnerHTML={{ __html: inline }} />
		);
	});
}

// ── RecentUpdates ──────────────────────────────────────────────────────────────

export default function RecentUpdates({ t }) {
	const [commits,    setCommits]    = useState([]);
	const [series,     setSeries]     = useState({ jp: [], en: [] });
	const [seriesTab,  setSeriesTab]  = useState("jp");
	const [loading,    setLoading]    = useState(true);

	useEffect(() => {
		const cached = getCachedCommits();
		const githubFetch = cached
			? Promise.resolve(cached)
			: fetch(GITHUB_API).then((r) => r.json()).then((data) => {
				if (Array.isArray(data)) setCachedCommits(data);
				return data;
			}).catch(() => []);

		Promise.all([
			githubFetch,
			apiRequest("/api/options/recent-updates").then((r) => r.json()).catch(() => ({ jp: [], en: [] })),
		]).then(([commitData, seriesData]) => {
			if (Array.isArray(commitData)) setCommits(commitData);
			if (seriesData?.jp) setSeries(seriesData);
		}).finally(() => setLoading(false));
	}, []);

	const Divider = () => <div className="border-t border-[var(--border)] my-1" />;

	return (
		<div className="mt-8 border border-[var(--border)] rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md">
			{/* Rainbow bar */}
			<div className="h-1" style={{ background: "linear-gradient(90deg, #4f9b78, #d26a6a, #5b84d6)" }} />

			<div className="p-5 sm:p-6 flex flex-col gap-5">

				{/* 置顶留言 */}
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

				{/* 最近更新系列 */}
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

				{/* 最新提交 */}
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
