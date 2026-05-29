import React, { useState, useMemo } from "react";
import { Shuffle, RotateCcw, Minus } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";

function RandomShuffleV2() {
	const [deck, setDeck] = useState([]);
	const [generatedCount, setGeneratedCount] = useState(0);
	const { t } = useLocale();

	const handleGenerate = () => {
		const targetSum = 50;
		const count = Math.floor(Math.random() * 5) + 6;
		const nums = Array.from({ length: count }, () => 1);
		let currentSum = count;
		while (currentSum < targetSum) {
			nums[Math.floor(Math.random() * count)] += 1;
			currentSum += 1;
		}
		setDeck(nums);
		setGeneratedCount((prev) => prev + 1);
	};

	const handleReset = () => {
		setDeck([]);
		setGeneratedCount(0);
	};

	const handleDecrease = () => {
		setDeck((prev) => prev.map((v) => Math.max(0, v - 1)));
	};

	const totalSum = useMemo(() => deck.reduce((s, v) => s + v, 0), [deck]);
	const maxVal = deck.length > 0 ? Math.max(...deck) : 1;

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

			{/* Title */}
			<div className="mb-8">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
					{t("shuffle.title")}
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">{t("shuffle.subtitle")}</p>
			</div>

			{/* Actions */}
			<div className="flex flex-wrap gap-2 mb-6">
				<button
					onClick={handleGenerate}
					className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--text-muted)] text-white
					           text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors">
					<Shuffle size={15} />
					{t("shuffle.generateButton")}
				</button>
				<button
					onClick={handleReset}
					className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)]
					           text-[var(--text)] text-sm font-bold hover:bg-[var(--card-background)] transition-colors">
					<RotateCcw size={14} />
					{t("shuffle.clearButton")}
				</button>
				{deck.length > 0 && (
					<button
						onClick={handleDecrease}
						className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)]
						           text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--card-background)] transition-colors ml-auto">
						<Minus size={14} />
						{t("shuffle.decreaseButton")}
					</button>
				)}
			</div>

			{/* Results */}
			{deck.length > 0 ? (
				<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">

					{/* Stats bar */}
					<div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-4 flex-wrap">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
							第 {generatedCount} 次生成
						</span>
						<div className="flex-1 border-t border-[var(--border)]" />
						{[
							{ label: "组数", value: deck.length },
							{ label: "总点数", value: totalSum },
						].map(({ label, value }) => (
							<div key={label} className="flex items-baseline gap-1.5">
								<span className="text-base font-black text-[var(--text)]">{value}</span>
								<span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
							</div>
						))}
					</div>

					{/* Card grid */}
					<div className="p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
						{deck.map((val, i) => {
							const fillPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
							const isEmpty = val === 0;
							return (
								<div
									key={i}
									className={`relative flex flex-col items-center justify-end rounded-xl overflow-hidden
									            border transition-opacity duration-300 ${
									              isEmpty
									                ? "border-[var(--border)] opacity-40"
									                : "border-[var(--border)]"
									            }`}
									style={{ aspectRatio: "1/1.2" }}
								>
									{/* Fill bar */}
									<div
										className="absolute bottom-0 left-0 right-0 bg-[var(--primary)] transition-all duration-500"
										style={{ height: `${fillPct}%`, opacity: 0.35 }}
									/>
									{/* Content */}
									<div className="relative z-10 flex flex-col items-center pb-2 pt-3 w-full text-center">
										<span className={`text-2xl font-black leading-none ${isEmpty ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
											{val}
										</span>
										<span className="text-[10px] text-[var(--text-muted)] mt-0.5">
											{t("shuffle.cardCaption")}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			) : (
				<div className="border border-[var(--border)] rounded-2xl bg-[var(--card-background)] py-16 flex flex-col items-center gap-2">
					<p className="text-base font-bold text-[var(--text)]">{t("shuffle.summaryEmpty")}</p>
					<p className="text-sm text-[var(--text-secondary)]">点击「生成牌堆」开始</p>
				</div>
			)}
		</div>
	);
}

export default RandomShuffleV2;
