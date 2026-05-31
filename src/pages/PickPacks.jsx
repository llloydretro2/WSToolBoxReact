import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import seedrandom from "seedrandom";
import { useLocale } from "../contexts/LocaleContext";
import packImage from "../assets/765_box.png";
import temari from "../assets/tiny_temari.png";
import lilja from "../assets/tiny_lilja.png";
import wscollection from "../assets/wscollection.png";

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
	useEffect(() => {
		if (!message) return;
		const id = setTimeout(onClose, 5000);
		return () => clearTimeout(id);
	}, [message, onClose]);
	if (!message) return null;
	return (
		<div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
		                px-5 py-3 rounded-2xl shadow-xl text-sm font-bold bg-[var(--error)] text-white">
			{message}
			<button type="button" onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity ml-1">✕</button>
		</div>
	);
}

// ── Stepper ────────────────────────────────────────────────────────────────────
function Stepper({ label, value, onChange, min = 1 }) {
	const num = parseInt(value) || 0;
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[11px] font-bold text-[var(--text-secondary)]">{label}</span>
			<div className="flex items-center border border-[var(--border)] rounded-xl overflow-hidden">
				<button type="button" onClick={() => onChange(String(Math.max(min, num - 1)))}
					className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)]
					           hover:bg-[var(--card-background)] transition-colors text-xl font-bold shrink-0
					           border-r border-[var(--border)]">
					−
				</button>
				<input
					type="number" min={min} value={value}
					onChange={(e) => onChange(e.target.value)}
					className="flex-1 min-w-0 text-center text-lg font-black text-[var(--text)] bg-transparent
					           border-0 focus:outline-none py-2 [appearance:textfield]
					           [&::-webkit-outer-spin-button]:appearance-none
					           [&::-webkit-inner-spin-button]:appearance-none"
				/>
				<button type="button" onClick={() => onChange(String(num + 1))}
					className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)]
					           hover:bg-[var(--card-background)] transition-colors text-xl font-bold shrink-0
					           border-l border-[var(--border)]">
					+
				</button>
			</div>
		</div>
	);
}

// ── Seed logic ─────────────────────────────────────────────────────────────────
const tianGan = "甲乙丙丁戊己庚辛壬癸";
const diZhi = "子丑寅卯辰巳午未申酉戌亥";

function getGanZhiYear(year) {
	return tianGan[(year - 4) % 10] + diZhi[(year - 4) % 12];
}

function generateFixedBaziSeed() {
	const date = new Date("2001-12-11T00:00:00");
	const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate(), h = date.getHours();
	const yearGZ = getGanZhiYear(y);
	const monthGZ = tianGan[(y * 12 + m) % 10] + diZhi[(m + 1) % 12];
	const dayGZ = tianGan[(y * 5 + m + d) % 10] + diZhi[(d + 2) % 12];
	const hourGZ = tianGan[(y + m + d + Math.floor(h / 2)) % 10] + diZhi[Math.floor(h / 2) % 12];
	const baziStr = yearGZ + monthGZ + dayGZ + hourGZ;
	let total = 0;
	for (const ch of baziStr) {
		if (tianGan.includes(ch)) total += tianGan.indexOf(ch) + 1;
		else if (diZhi.includes(ch)) total += diZhi.indexOf(ch) + 1;
	}
	const now = new Date();
	total += now.getFullYear() + now.getMonth() + now.getDate() + now.getHours() + now.getMinutes() + now.getSeconds();
	return { baziStr, seed: total };
}

// ── Main ───────────────────────────────────────────────────────────────────────
Toast.propTypes = {
	message: PropTypes.string,
	onClose: PropTypes.func.isRequired,
};

Stepper.propTypes = {
	label:    PropTypes.string.isRequired,
	value:    PropTypes.number.isRequired,
	onChange: PropTypes.func.isRequired,
	min:      PropTypes.number,
};

export default function PickPacksV2() {
	const { t } = useLocale();
	const [totalPacks, setTotalPacks] = useState("");
	const [openPacks, setOpenPacks] = useState("");
	const [results, setResults] = useState([]);
	const [toastMsg, setToastMsg] = useState("");
	const [litPacks, setLitPacks] = useState(new Set()); // 刚被点亮的包（动画用）
	const [noteOpen, setNoteOpen] = useState(false);
	const litTimerRef = useRef(null);

	useEffect(() => {
		const saved = localStorage.getItem("pickpacks");
		if (saved) {
			const { total, open, results } = JSON.parse(saved);
			setTotalPacks(total ?? "");
			setOpenPacks(open ?? "");
			setResults(results ?? []);
		}
		return () => { if (litTimerRef.current) clearTimeout(litTimerRef.current); };
	}, []);

	const clearPage = () => {
		setTotalPacks(""); setOpenPacks(""); setResults([]); setLitPacks(new Set());
		localStorage.removeItem("pickpacks");
	};

	const randomGeneratePacks = () => {
		const total = parseInt(totalPacks);
		const open = parseInt(openPacks);
		if (!total || !open || open > total || total <= 0 || open <= 0) {
			setToastMsg(t("pages.pickPacks.errorMessage"));
			return;
		}
		const { seed } = generateFixedBaziSeed();
		const rng = seedrandom(seed.toString());
		const available = new Set(Array.from({ length: total }, (_, i) => i + 1));
		const selected = [];
		while (selected.length < open) {
			const idx = Math.floor(rng() * available.size);
			const val = Array.from(available)[idx];
			available.delete(val);
			selected.push(val);
		}
		selected.sort((a, b) => a - b);
		setResults(selected);
		// 触发点亮动画
		setLitPacks(new Set(selected));
		if (litTimerRef.current) clearTimeout(litTimerRef.current);
		litTimerRef.current = setTimeout(() => setLitPacks(new Set()), 600);
		localStorage.setItem("pickpacks", JSON.stringify({ total: totalPacks, open: openPacks, seed, results: selected }));
	};

	const totalNum = parseInt(totalPacks) || 0;
	const openNum = parseInt(openPacks) || 0;

	return (
		<>
			<style>{`
				@keyframes pack-light {
					0%   { transform: scale(1.0); filter: drop-shadow(0 0 0px transparent); }
					40%  { transform: scale(1.22); filter: drop-shadow(0 0 14px color-mix(in srgb, var(--primary-dark) 95%, transparent)); }
					100% { transform: scale(1.1);  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--primary-dark) 50%, transparent)); }
				}
				.pack-lit { animation: pack-light 0.55s cubic-bezier(0.4,0,0.2,1) forwards; }
				.pack-selected { transform: scale(1.1); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--primary-dark) 50%, transparent)); }
			`}</style>

			<Toast message={toastMsg} onClose={() => setToastMsg("")} />

			<div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

				{/* Title */}
				<div className="mb-8">
					<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
						{t("pages.pickPacks.title")}
					</h1>
					<p className="text-sm text-[var(--text-secondary)]">{t("pages.pickPacks.subtitle")}</p>
				</div>

				{/* Input panel */}
				<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md mb-4">
					<div className="grid grid-cols-2 gap-4 mb-5">
						<Stepper label={t("pages.pickPacks.openPacks")} value={openPacks} onChange={setOpenPacks} />
						<Stepper label={t("pages.pickPacks.totalPacks")} value={totalPacks} onChange={setTotalPacks} />
					</div>
					{/* Counter display */}
					{totalNum > 0 && openNum > 0 && (
						<div className="flex items-baseline justify-center gap-2 mb-4">
							<span className="text-4xl font-black text-[var(--text-muted)]">{openNum}</span>
							<span className="text-lg text-[var(--text-muted)] font-bold">/</span>
							<span className="text-2xl font-black text-[var(--text-secondary)]">{totalNum}</span>
							<span className="text-sm text-[var(--text-muted)] ml-1">包</span>
						</div>
					)}
					<div className="flex gap-3">
						<button onClick={randomGeneratePacks}
							className="flex-1 py-2.5 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold
							           hover:bg-[var(--text-secondary)] transition-colors">
							{t("pages.pickPacks.openButton")}
						</button>
						<button onClick={clearPage}
							className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)]
							           text-sm font-bold hover:bg-[var(--card-background)] transition-colors">
							{t("pages.pickPacks.resetButton")}
						</button>
					</div>
				</div>

				{/* Pack grid */}
				{totalNum > 0 && (
					<div className="border border-[var(--border)] rounded-2xl p-5 bg-white/70 backdrop-blur-md mb-4">

						{/* Status eyebrow */}
						<div className="flex items-center gap-3 mb-5">
							<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
								包选择结果
							</span>
							<div className="flex-1 border-t border-[var(--border)]" />
							<span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
								results.length > 0
									? "bg-[var(--text-muted)] text-white"
									: "bg-[var(--card-background)] text-[var(--text-muted)]"
							}`}>
								{results.length > 0
									? t("pickPacks.selectionStatus", { count: results.length })
									: t("pickPacks.waitingSelection")}
							</span>
						</div>

						{/* Grid */}
						<div className="grid gap-4"
							style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}>
							{Array.from({ length: totalNum }, (_, i) => i + 1).map((pack) => {
								const isSelected = results.includes(pack);
								const isLit = litPacks.has(pack);
								const isDimmed = results.length > 0 && !isSelected;
								return (
									<div key={pack}
										className={`flex flex-col items-center gap-2 transition-opacity duration-300
										            ${isDimmed ? "opacity-20" : "opacity-100"}`}>
										<div className={`relative w-[72px] h-[72px] cursor-default
										                 hover:scale-105 transition-transform duration-150
										                 ${isLit ? "pack-lit" : isSelected ? "pack-selected" : ""}`}>
											<img src={packImage} alt={`Pack ${pack}`}
												className="w-full h-full object-contain" />
											{isSelected && (
												<div className="absolute inset-0 flex items-center justify-center">
													<div className="w-7 h-7 rounded-full bg-[var(--text-muted)] text-white
													                flex items-center justify-center text-sm font-black
													                shadow-lg">
														✓
													</div>
												</div>
											)}
										</div>
										<span className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all duration-300 ${
											isSelected
												? "bg-[var(--text-muted)] text-white"
												: "bg-[var(--card-background)] text-[var(--text-secondary)]"
										}`}>
											{pack}
										</span>
									</div>
								);
							})}
						</div>

						{/* Selected pill list */}
						{results.length > 0 && (
							<div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
								<span className="text-xs font-bold text-[var(--text-muted)]">选中：</span>
								{results.map((pack) => (
									<span key={pack}
										className="text-xs font-black px-2.5 py-1 rounded-full bg-[var(--text-muted)] text-white">
										{pack}
									</span>
								))}
							</div>
						)}
					</div>
				)}

				{/* 小记（折叠） */}
				<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">
					<div className="h-1 bg-[var(--primary)]" />
					<button type="button"
						onClick={() => setNoteOpen((v) => !v)}
						className="w-full flex items-center justify-between px-5 py-4
						           hover:bg-[var(--card-background)] transition-colors">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
							背后的故事
						</span>
						<span className={`text-[var(--text-muted)] transition-transform duration-200 text-sm ${noteOpen ? "rotate-180" : ""}`}>
							▾
						</span>
					</button>

					{noteOpen && (
						<div className="px-5 pb-5 border-t border-[var(--border)] flex flex-col gap-4 pt-4">

							<div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card-background)] border-l-4 border-[var(--primary)]">
								<img src={temari} alt="Temari" className="h-8 shrink-0" />
								<p className="text-sm font-bold text-[var(--text)]">
									这个随机开包器有什么特别的吗？
								</p>
							</div>

							<div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(224,92,92,0.08)] border-l-4 border-[var(--error)]">
								<img src={lilja} alt="Lilja" className="h-10 shrink-0" />
								<p className="text-sm font-bold text-[var(--reset)] leading-relaxed">
									完全没有！<br />
									就是普通的随机数生成器，只不过我设定了一个和我有关的、会随着时间变化的种子
								</p>
							</div>

							<div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(166,206,182,0.1)] border-l-4 border-[var(--primary)]">
								<img src={temari} alt="Temari" className="h-8 shrink-0" />
								<p className="text-sm font-bold text-[var(--text)]">
									那我为什么应该用这个随机开包器？
								</p>
							</div>

							<div className="p-4 rounded-xl bg-[rgba(118,15,16,0.05)] border border-[rgba(118,15,16,0.1)]">
								<div className="flex items-start gap-3 mb-4">
									<img src={lilja} alt="Lilja" className="h-10 shrink-0 mt-1" />
									<p className="text-sm font-bold text-[var(--text)] leading-relaxed">
										请看战绩⬇️ 平均3盒一个SP/SSP，只买散盒
									</p>
								</div>
								<img src={wscollection} alt="WS Collection"
									className="w-full rounded-xl shadow-md" />
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
