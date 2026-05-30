import React, { useState, useEffect, useMemo } from "react";
import { Plus, RotateCcw, Dices, Trash2 } from "lucide-react";
import { useLocale } from "../contexts/LocaleContext";

const PRESET_SIDES = [4, 6, 8, 10, 12, 20, 100];

function Stepper({ value, onChange, min, max, label }) {
	return (
		<div className="flex flex-col items-center gap-1">
			<span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">
				{label}
			</span>
			<div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
				<button
					type="button"
					onClick={() => onChange(Math.max(min, value - 1))}
					className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)]
					           hover:bg-[var(--card-background)] transition-colors text-lg font-bold">
					−
				</button>
				<span className="w-10 text-center text-sm font-black text-[var(--text)]">
					{value}
				</span>
				<button
					type="button"
					onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
					className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)]
					           hover:bg-[var(--card-background)] transition-colors text-lg font-bold">
					+
				</button>
			</div>
		</div>
	);
}

function DiceRow({ input, index, onChange, onRemove, canRemove }) {
	return (
		<div className="border border-[var(--border)] rounded-2xl p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
					第 {index + 1} 组 · D{input.sides}
				</span>
				{canRemove && (
					<button
						type="button"
						onClick={onRemove}
						className="text-[var(--text-muted)] hover:text-[var(--reset)] transition-colors">
						<Trash2 size={14} />
					</button>
				)}
			</div>

			{/* Preset sides */}
			<div className="flex flex-wrap gap-1.5">
				{PRESET_SIDES.map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => onChange("sides", s)}
						className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
							input.sides === s
								? "bg-[var(--text)] text-[var(--background)]"
								: "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--card-background)]"
						}`}>
						D{s}
					</button>
				))}
			</div>

			{/* Steppers */}
			<div className="flex gap-6 justify-center">
				<Stepper
					label="面数"
					value={input.sides}
					onChange={(v) => onChange("sides", v)}
					min={2}
				/>
				<Stepper
					label="数量"
					value={input.count}
					onChange={(v) => onChange("count", v)}
					min={1}
					max={20}
				/>
			</div>
		</div>
	);
}

function DiceResult({ value, isMax, multiDice }) {
	const highlight = isMax && multiDice;
	return (
		<div
			className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border transition-colors ${
				highlight
					? "bg-[var(--text-muted)] text-white border-[var(--text-muted)]"
					: "border-[var(--border)] text-[var(--text)] bg-white/60"
			}`}>
			{value}
		</div>
	);
}

export default function DiceV2() {
	const { t } = useLocale();
	const [diceInputs, setDiceInputs] = useState([{ sides: 6, count: 1 }]);
	const [results, setResults] = useState([]);

	useEffect(() => {
		const savedInputs = localStorage.getItem("diceInputs");
		const savedResults = localStorage.getItem("diceResults");
		if (savedInputs) setDiceInputs(JSON.parse(savedInputs));
		if (savedResults) setResults(JSON.parse(savedResults));
	}, []);

	const save = (inputs, res) => {
		localStorage.setItem("diceInputs", JSON.stringify(inputs));
		if (res !== undefined) localStorage.setItem("diceResults", JSON.stringify(res));
	};

	const handleChange = (index, field, value) => {
		setDiceInputs((prev) => {
			const next = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
			save(next);
			return next;
		});
	};

	const addDice = () => {
		setDiceInputs((prev) => {
			const next = [...prev, { sides: 6, count: 1 }];
			save(next);
			return next;
		});
	};

	const removeDice = (index) => {
		setDiceInputs((prev) => {
			const next = prev.filter((_, i) => i !== index);
			save(next);
			return next;
		});
	};

	const reset = () => {
		setDiceInputs([{ sides: 6, count: 1 }]);
		setResults([]);
		localStorage.removeItem("diceInputs");
		localStorage.removeItem("diceResults");
	};

	const roll = () => {
		const allResults = diceInputs.map(({ count, sides }) => {
			const c = Math.max(1, count || 1);
			const s = Math.max(2, sides || 6);
			return Array.from({ length: c }, () => Math.floor(Math.random() * s) + 1);
		});
		setResults(allResults);
		save(diceInputs, allResults);
	};

	const flat = useMemo(() => results.flat(), [results]);
	const total = flat.reduce((s, v) => s + v, 0);
	const hasResults = flat.length > 0;

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

			{/* Title */}
			<div className="mb-8">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
					{t("dice.title")}
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">{t("dice.subtitle")}</p>
			</div>

			{/* Dice config */}
			<div className="flex flex-col gap-3 mb-5">
				{diceInputs.map((input, index) => (
					<DiceRow
						key={index}
						input={input}
						index={index}
						onChange={(field, val) => handleChange(index, field, val)}
						onRemove={() => removeDice(index)}
						canRemove={diceInputs.length > 1}
					/>
				))}
			</div>

			{/* Actions */}
			<div className="flex gap-2 mb-8 flex-wrap">
				<button
					onClick={roll}
					className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--text-muted)] text-white
					           text-sm font-bold hover:bg-[var(--text-secondary)] transition-colors">
					<Dices size={15} />
					{t("dice.rollButton")}
				</button>
				<button
					onClick={addDice}
					className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)]
					           text-[var(--text)] text-sm font-bold hover:bg-[var(--card-background)] transition-colors">
					<Plus size={14} />
					{t("dice.addButton")}
				</button>
				<button
					onClick={reset}
					className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)]
					           text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--card-background)] transition-colors ml-auto">
					<RotateCcw size={14} />
					{t("dice.resetButton")}
				</button>
			</div>

			{/* Results */}
			{hasResults && (
				<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">

					{/* Header */}
					<div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-3">
						<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
							{t("dice.resultsTitle")}
						</span>
						<div className="flex-1 border-t border-[var(--border)]" />
						<span className="text-sm font-black text-[var(--text)]">{total}</span>
						<span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">总计</span>
					</div>

					{/* Per-group results */}
					<div className="p-5 flex flex-col gap-4">
						{results.map((rolls, idx) => {
							const max = Math.max(...rolls);
							return (
								<div key={idx}>
									<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">
										第 {idx + 1} 组 · D{diceInputs[idx]?.sides ?? "?"}
									</p>
									<div className="flex flex-wrap gap-2">
										{rolls.map((val, ri) => (
											<DiceResult
												key={ri}
												value={val}
												isMax={val === max}
												multiDice={rolls.length > 1}
											/>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
