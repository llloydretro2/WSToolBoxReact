import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";
import firstCard from "../assets/ims_s.png";
import secondCard from "../assets/ims_k.png";
import cardback from "../assets/ws_cardback.png";

function FirstSecondV2() {
	const { t } = useLocale();
	const [result, setResult] = useState(null);   // null | "first" | "second"
	const [flipped, setFlipped] = useState(false);

	const decide = () => {
		if (flipped) return;
		const pick = Math.random() < 0.5 ? "first" : "second";
		setResult(pick);
		setFlipped(true);
	};

	const reset = () => {
		setFlipped(false);
		setResult(null);
	};

	const resultImg = result === "first" ? firstCard : secondCard;
	const isFirst = result === "first";

	return (
		<div className="max-w-xs mx-auto px-4 pb-10 sm:py-14 flex flex-col items-center gap-8">

			{/* Title */}
			<div className="text-center">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
					{t("pages.firstSecond.title")}
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">
					{t("pages.firstSecond.subtitle")}
				</p>
			</div>

			{/* Flip card */}
			<div
				className="w-48 cursor-pointer select-none"
				style={{ perspective: "900px" }}
				onClick={!flipped ? decide : undefined}
			>
				<div
					style={{
						transformStyle: "preserve-3d",
						transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
						transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
						position: "relative",
						aspectRatio: "5/7",
					}}
				>
					{/* Back face — card back (shown before flip) */}
					<div
						style={{ backfaceVisibility: "hidden" }}
						className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
					>
						<img
							src={cardback}
							alt="card back"
							className="w-full h-full object-cover"
						/>
					</div>

					{/* Front face — result (shown after flip) */}
					<div
						style={{
							backfaceVisibility: "hidden",
							transform: "rotateY(180deg)",
						}}
						className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl"
					>
						{result && (
							<img
								src={resultImg}
								alt={result}
								className="w-full h-full object-cover"
							/>
						)}
					</div>
				</div>
			</div>

			{/* Result label */}
			<div className="h-10 flex items-center justify-center">
				{flipped && result && (
					<span
						className={`text-3xl font-black tracking-widest transition-opacity duration-300 ${
							isFirst ? "text-[#e05c5c]" : "text-[#5b84d6]"
						}`}
					>
						{t(`pages.firstSecond.${result}`)}
					</span>
				)}
			</div>

			{/* Action button */}
			{!flipped ? (
				<button
					onClick={decide}
					className="w-full py-3 bg-[var(--text-muted)] text-white text-sm font-bold rounded-xl
					           hover:bg-[var(--text-secondary)] transition-colors">
					{t("pages.firstSecond.button")}
				</button>
			) : (
				<button
					onClick={reset}
					className="w-full py-2.5 flex items-center justify-center gap-2 border border-[var(--border)]
					           text-[var(--text)] text-sm font-bold rounded-xl
					           hover:bg-[var(--card-background)] transition-colors">
					<RotateCcw size={14} />
					{t("pages.firstSecond.again")}
				</button>
			)}
		</div>
	);
}

export default FirstSecondV2;
