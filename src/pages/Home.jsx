import React from "react";
import { useNavigate } from "react-router-dom";
import { Layers, LayoutGrid, SlidersHorizontal, Mail } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import { useAuth } from "../contexts/AuthContext";
import { SITE_SECTIONS, getSectionToolItems } from "../config/siteStructure";
import SectionCard from "../components/home/SectionCard";
import RecentUpdates from "../components/home/RecentUpdates";

const GithubIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
	</svg>
);

const SECTION_ICONS = {
	ws:      Layers,
	mahjong: LayoutGrid,
	tools:   SlidersHorizontal,
};

const SECTIONS = SITE_SECTIONS.map((section) => ({
	...section,
	Icon: SECTION_ICONS[section.key],
	path: section.defaultPath,
}));

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
		<div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

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
