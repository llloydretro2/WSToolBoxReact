import React, { useState, useEffect } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";

const formatTime = (seconds) => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function ChessClockV2() {
	const { t } = useLocale();
	const [side, setSide] = useState(1);
	const [isRunning, setIsRunning] = useState(false);
	const [p1Seconds, setP1Seconds] = useState(0);
	const [p2Seconds, setP2Seconds] = useState(0);
	const [showReset, setShowReset] = useState(false);

	// Restore from localStorage
	useEffect(() => {
		try {
			const saved = localStorage.getItem("chessclock");
			if (!saved) return;
			const d = JSON.parse(saved);
			if (typeof d.p1Seconds === "number") setP1Seconds(d.p1Seconds);
			if (typeof d.p2Seconds === "number") setP2Seconds(d.p2Seconds);
			if (d.side === 1 || d.side === 2) setSide(d.side);
			if (typeof d.isRunning === "boolean") setIsRunning(d.isRunning);
		} catch { /* localStorage not available */ }
	}, []);

	// Tick
	useEffect(() => {
		if (!isRunning) return;
		const id = setInterval(() => {
			if (side === 1) setP1Seconds((v) => v + 1);
			else setP2Seconds((v) => v + 1);
		}, 1000);
		return () => clearInterval(id);
	}, [isRunning, side]);

	// Persist
	useEffect(() => {
		localStorage.setItem("chessclock", JSON.stringify({ p1Seconds, p2Seconds, side, isRunning }));
	}, [p1Seconds, p2Seconds, side, isRunning]);

	const tap = (targetSide) => {
		setSide(targetSide);
		setIsRunning(true);
	};

	const togglePause = (e) => {
		e.stopPropagation();
		setIsRunning((v) => !v);
	};

	const confirmReset = () => {
		setIsRunning(false);
		setSide(1);
		setP1Seconds(0);
		setP2Seconds(0);
		setShowReset(false);
		localStorage.removeItem("chessclock");
	};

	const total = formatTime(p1Seconds + p2Seconds);

	// eslint-disable-next-line react/prop-types
	const PlayerPanel = ({ id }) => {
		const isActive = isRunning && side === id;
		const time = formatTime(id === 1 ? p1Seconds : p2Seconds);

		return (
			<button
				type="button"
				onClick={() => tap(id)}
				className={`flex-1 flex flex-col items-center justify-center gap-3 rounded-2xl
				            border transition-all duration-200 select-none cursor-pointer relative
				            ${isActive
				              ? "border-[var(--primary)] bg-[var(--primary-light,rgba(166,206,182,0.18))]"
				              : "border-[var(--border)] bg-white/60 hover:bg-white/90"
				            }`}
				style={{ minHeight: "36vh" }}
			>
				{/* Active indicator bar */}
				{isActive && (
					<div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-[var(--primary)]" />
				)}

				<span className={`text-xs font-black tracking-widest uppercase ${
					isActive ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"
				}`}>
					{t("chessClock.playerLabel", { index: id })}
				</span>

				<span className={`font-black tabular-nums leading-none transition-colors duration-200 ${
					isActive ? "text-[var(--text)]" : "text-[var(--text-secondary)]"
				}`} style={{ fontSize: "clamp(3rem, 10vw, 5rem)" }}>
					{time}
				</span>

				{isActive ? (
					<span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)]">
						<span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
						计时中
					</span>
				) : (
					<span className="text-[11px] text-[var(--text-muted)]">
						{t("chessClock.playerHint")}
					</span>
				)}
			</button>
		);
	};

	return (
		<div className="max-w-lg mx-auto px-4 sm:px-6 py-6 flex flex-col gap-3" style={{ minHeight: "calc(100dvh - 72px)" }}>

			{/* Title */}
			<div className="mb-2">
				<h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text)] leading-none mb-1">
					{t("chessClock.title")}
				</h1>
				<p className="text-xs text-[var(--text-secondary)]">{t("chessClock.subtitle")}</p>
			</div>

			{/* Player 1 */}
			<PlayerPanel id={1} />

			{/* Controls */}
			<div className="flex items-center gap-2 py-1">
				<span className="text-xs font-bold text-[var(--text-muted)]">
					{t("chessClock.totalTime", { time: total })}
				</span>
				<div className="flex-1" />
				<button
					onClick={togglePause}
					className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
						isRunning
							? "bg-[var(--text-muted)] text-white hover:bg-[var(--text-secondary)]"
							: "bg-[var(--text-muted)] text-white hover:bg-[var(--text-secondary)]"
					}`}>
					{isRunning ? <Pause size={13} /> : <Play size={13} />}
					{isRunning ? t("chessClock.pauseButton") : t("chessClock.resumeButton")}
				</button>
				<button
					onClick={() => setShowReset(true)}
					className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
					           border border-[var(--border)] text-[var(--text-secondary)]
					           hover:bg-[var(--card-background)] transition-colors">
					<RotateCcw size={13} />
					{t("chessClock.resetButton")}
				</button>
			</div>

			{/* Player 2 */}
			<PlayerPanel id={2} />

			{/* Reset confirmation modal */}
			{showReset && (
				<div
					className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm"
					onClick={() => setShowReset(false)}>
					<div
						className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4 flex flex-col gap-4"
						onClick={(e) => e.stopPropagation()}>
						<div>
							<p className="text-base font-bold text-[var(--text)] mb-1">
								{t("chessClock.dialogTitle")}
							</p>
							<p className="text-sm text-[var(--text-secondary)]">
								{t("chessClock.dialogBody")}
							</p>
						</div>
						<div className="flex gap-2 justify-end">
							<button
								onClick={() => setShowReset(false)}
								className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)]
								           hover:text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
								{t("chessClock.dialogCancel")}
							</button>
							<button
								onClick={confirmReset}
								className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--reset)] text-white
								           hover:bg-[var(--reset-hover)] transition-colors">
								{t("chessClock.dialogConfirm")}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
