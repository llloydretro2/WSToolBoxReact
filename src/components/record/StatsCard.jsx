/* eslint-disable react/prop-types */
import React from "react";
import PropTypes from "prop-types";
import { useLocale } from "../../contexts/LocaleContext";
import { EXPORT_MODULE_IDS } from "./exportModules.js";

// ── Stats Card (HTML → PNG via html-to-image) ────────────────────────────────

// 这张卡是独立于站点主题的深色导出物（PNG），配色刻意硬编码、不走 CSS 变量：
// 它最终被 html-to-image 渲染成图片分享出去，跟着 Spring Rain 亮色主题走反而不对。
// toPng 的 backgroundColor 必须和卡片自身背景一致，否则导出图片边缘会露出白边。
export const EXPORT_CARD_BG = "#0d0d0d";

const S = {
	bg:     EXPORT_CARD_BG,
	mod:    "#1a1a1a",
	bdr:    "1px solid rgba(255,255,255,0.07)",
	text:   "#ffffff",
	muted:  "rgba(255,255,255,0.40)",
	dim:    "rgba(255,255,255,0.16)",
	rule:   "rgba(255,255,255,0.08)",
	radius: 10,
	pad:    "14px 16px",
	mb:     10,
};

function CardLabel({ children }) {
	return (
		<div style={{ fontSize: 9, fontWeight: 700, color: S.muted,
			textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
			{children}
		</div>
	);
}

function CardTrendChart({ data }) {
	if (!data || data.length < 2)
		return <div style={{ fontSize: 11, color: S.muted }}>数据不足，至少需要 2 个时间段</div>;
	const W = 432, H = 130, pL = 28, pR = 8, pT = 8, pB = 22;
	const iW = W - pL - pR, iH = H - pT - pB;
	const pts = data.map((d, i) => ({
		x: pL + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW),
		y: pT + iH - (d.winRate / 100) * iH,
		label: d.label,
	}));
	const step = data.length <= 8 ? 1 : data.length <= 14 ? 2 : Math.ceil(data.length / 7);
	return (
		<svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
			{[0, 50, 100].map((pct) => {
				const gy = pT + iH - (pct / 100) * iH;
				return (
					<g key={pct}>
						<line x1={pL} y1={gy} x2={W - pR} y2={gy}
							stroke={pct === 50 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}
							strokeWidth={pct === 50 ? 1 : 0.5}
							strokeDasharray={pct === 50 ? "4 3" : undefined} />
						<text x={pL - 3} y={gy + 3.5} textAnchor="end" fontSize="7.5" fill={S.muted}>{pct}%</text>
					</g>
				);
			})}
			<polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
				fill="none" stroke="#ffffff" strokeWidth="1.6"
				strokeLinejoin="round" strokeLinecap="round" />
			{pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#ffffff" />)}
			{pts.map((p, i) => {
				if (i % step !== 0 && i !== pts.length - 1) return null;
				return <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="7.5" fill={S.muted}>{p.label}</text>;
			})}
		</svg>
	);
}

/* eslint-enable react/prop-types */

function StatModule({ id, stats }) {
	const { t } = useLocale();
	const box = { background: S.mod, border: S.bdr, borderRadius: S.radius,
		padding: S.pad, marginBottom: S.mb };
	const noData = (msg = t("record.charts.noData")) =>
		<div style={{ fontSize: 11, color: S.muted }}>{msg}</div>;

	if (id === "overview") return (
		<div style={box}>
			<CardLabel>{t("record.cardLabels.overview")}</CardLabel>
			<div style={{ display: "flex" }}>
				{[{ v: stats.total,  l: t("record.stats.totalLabel") },
				  { v: stats.wins,   l: t("record.stats.winsLabel") },
				  { v: stats.losses, l: t("record.stats.lossesLabel") },
				  { v: stats.winRate + "%", l: t("record.stats.winRateLabel") }]
					.map((it, i, arr) => (
						<div key={i} style={{ flex: 1, textAlign: "center", padding: "0 4px",
							borderRight: i < arr.length - 1 ? `1px solid ${S.rule}` : "none" }}>
							<div style={{ fontSize: 22, fontWeight: 700, color: S.text }}>{it.v}</div>
							<div style={{ fontSize: 10, color: S.muted, marginTop: 4 }}>{it.l}</div>
						</div>
					))}
			</div>
		</div>
	);

	if (id === "streak") return (
		<div style={box}>
			<CardLabel>{t("record.exportModules.streak")}</CardLabel>
			{!stats.currentStreak ? noData()
				: <div style={{ fontSize: 26, fontWeight: 700, color: S.text }}>
					{stats.currentStreak.result === "win" ? t("record.stats.streakWin", { count: stats.currentStreak.count })
						: stats.currentStreak.result === "lose" ? t("record.stats.streakLose", { count: stats.currentStreak.count })
						: t("record.stats.streakDraw", { count: stats.currentStreak.count })}
				  </div>}
		</div>
	);

	if (id === "bestStreak") return (
		<div style={box}>
			<CardLabel>{t("record.cardLabels.bestStreak")}</CardLabel>
			<div style={{ fontSize: 26, fontWeight: 700, color: S.text }}>
				{stats.longestWinStreak} <span style={{ fontSize: 14, color: S.muted }}>{t("record.stats.matchesUnit")}</span>
			</div>
		</div>
	);

	if (id === "goesFirst") {
		const sides = [
			{ l: t("record.cardLabels.first"), rate: stats.goesFirst.firstRate,  total: stats.goesFirst.firstTotal },
			{ l: t("record.cardLabels.second"), rate: stats.goesFirst.secondRate, total: stats.goesFirst.secondTotal },
		];
		return (
			<div style={box}>
				<CardLabel>{t("record.cardLabels.goesFirst")}</CardLabel>
				<div style={{ display: "flex" }}>
					{sides.map((s, i) => (
						<div key={i} style={{ flex: 1, textAlign: "center",
							borderRight: i === 0 ? `1px solid ${S.rule}` : "none", padding: "0 8px" }}>
							<div style={{ fontSize: 10, color: S.muted, marginBottom: 6 }}>{s.l}</div>
							<div style={{ fontSize: 24, fontWeight: 700, color: S.text }}>
								{s.total > 0 ? `${s.rate}%` : "—"}
							</div>
							<div style={{ fontSize: 10, color: S.dim, marginTop: 4 }}>{t("record.stats.gamesCount", { count: s.total })}</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (id === "topDecks") return (
		<div style={box}>
			<CardLabel>{t("record.exportModules.topDecks")}</CardLabel>
			{!stats.topDecks.length ? noData() : stats.topDecks.slice(0, 3).map((d, i) => (
				<div key={i} style={{ display: "flex", justifyContent: "space-between",
					alignItems: "flex-start", marginBottom: i < 2 ? 10 : 0 }}>
					<div>
						<div style={{ fontSize: 11, fontWeight: 700, color: S.text }}>{d.series}</div>
						<div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{d.deck}</div>
					</div>
					<div style={{ fontSize: 10, color: S.muted, whiteSpace: "nowrap", marginLeft: 8, paddingTop: 2 }}>
						{t("record.stats.gamesCount", { count: d.total })} &nbsp;{d.winRate}%
					</div>
				</div>
			))}
		</div>
	);

	if (id === "bestDeck") return (
		<div style={box}>
			<CardLabel>{t("record.cardLabels.bestDeck")}</CardLabel>
			{!stats.bestDeck ? noData(t("record.cardLabels.noDataMinGames")) : (
				<>
					<div style={{ fontSize: 28, fontWeight: 700, color: S.text, marginBottom: 8 }}>
						{stats.bestDeck.winRate}%
					</div>
					<div style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{stats.bestDeck.series}</div>
					<div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{stats.bestDeck.deck}</div>
				</>
			)}
		</div>
	);

	if (id === "hardestOpp") return (
		<div style={box}>
			<CardLabel>{t("record.exportModules.hardestOpp")}</CardLabel>
			{!stats.hardestOpp ? noData(t("record.cardLabels.noDataMinGames")) : (
				<>
					<div style={{ fontSize: 28, fontWeight: 700, color: S.text, marginBottom: 8 }}>
						{stats.hardestOpp.winRate}%
					</div>
					<div style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{stats.hardestOpp.name}</div>
					<div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{t("record.stats.gamesCount", { count: stats.hardestOpp.total })}</div>
				</>
			)}
		</div>
	);

	if (id === "easiestOpp") return (
		<div style={box}>
			<CardLabel>{t("record.exportModules.easiestOpp")}</CardLabel>
			{!stats.easiestOpp ? noData(t("record.cardLabels.noDataMinGames")) : (
				<>
					<div style={{ fontSize: 28, fontWeight: 700, color: S.text, marginBottom: 8 }}>
						{stats.easiestOpp.winRate}%
					</div>
					<div style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{stats.easiestOpp.name}</div>
					<div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{t("record.stats.gamesCount", { count: stats.easiestOpp.total })}</div>
				</>
			)}
		</div>
	);

	if (id === "topTags") return (
		<div style={box}>
			<CardLabel>{t("record.exportModules.topTags")}</CardLabel>
			{!stats.topTags.length ? noData() : stats.topTags.slice(0, 3).map((tg, i) => (
				<div key={i} style={{ display: "flex", justifyContent: "space-between",
					alignItems: "center", marginBottom: i < 2 ? 10 : 0 }}>
					<div style={{ fontSize: 11, fontWeight: 700, color: S.text }}>{tg.name}</div>
					<div style={{ fontSize: 10, color: S.muted }}>{t("record.stats.gamesCount", { count: tg.total })} &nbsp;{tg.winRate}%</div>
				</div>
			))}
		</div>
	);

	if (id === "trend") return (
		<div style={box}>
			<CardLabel>近期胜率走势</CardLabel>
			<CardTrendChart data={stats.trendData} />
		</div>
	);

	return null;
}

StatModule.propTypes = { id: PropTypes.string.isRequired, stats: PropTypes.object.isRequired };

function StatsCardView({ selectedIds, stats, username, dateLabel, cardRef }) {
	const { t } = useLocale();
	const exportModulesLocal = EXPORT_MODULE_IDS.map(m => ({ ...m, label: t(`record.exportModules.${m.id}`) || m.id }));
	const ordered = exportModulesLocal.filter((m) => selectedIds.includes(m.id));
	return (
		<div ref={cardRef} style={{
			width: 480, background: S.bg, padding: 24,
			fontFamily: "system-ui, -apple-system, sans-serif",
			boxSizing: "border-box",
		}}>
			{/* Header */}
			<div style={{ marginBottom: 16 }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div style={{ fontSize: 18, fontWeight: 700, color: S.text }}>{username || t("record.export.defaultTitle")}</div>
					<div style={{ fontSize: 10, color: S.muted, marginTop: 4 }}>{dateLabel}</div>
				</div>
				<div style={{ fontSize: 10, color: S.muted, marginTop: 4 }}>cardtoolbox.org</div>
			</div>
			<div style={{ height: 1, background: S.rule, marginBottom: 12 }} />

			{/* Modules */}
			{ordered.map((m) => <StatModule key={m.id} id={m.id} stats={stats} />)}

			{/* Footer */}
			<div style={{ height: 1, background: S.rule, marginTop: 4, marginBottom: 12 }} />
			<div style={{ display: "flex", justifyContent: "space-between" }}>
				<span style={{ fontSize: 9, color: S.dim }}>cardtoolbox.org</span>
				<span style={{ fontSize: 9, color: S.dim }}>@{username || "user"}</span>
			</div>
		</div>
	);
}

StatsCardView.propTypes = {
	selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
	stats:       PropTypes.object.isRequired,
	username:    PropTypes.string,
	dateLabel:   PropTypes.string,
	cardRef:     PropTypes.object,
};

export default StatsCardView;
