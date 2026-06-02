import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { Plus, Trash2, ChevronUp, ChevronDown, Play, Loader2, Copy } from "lucide-react";
import { simulate } from "../utils/wsDamage/simulator.js";
import { buildSimpleDeck, makeCharacter } from "../utils/wsDamage/card.js";
import { OpType, ZoneId } from "../utils/wsDamage/types.js";
import { useLocale } from "../contexts/LocaleContext.jsx";

// ── Step type definitions ─────────────────────────────────────────────────────

const STEP_TYPES = [
	{ id: "direct",           label: "直接伤害",     badgeColor: "#52675a", defaults: { n: 2 } },
	{ id: "cancel",           label: "取消追加",     badgeColor: "#3b82f6", defaults: { n: 2, m: 1, times: 1 } },
	{ id: "bottom_flip",      label: "翻底X潮次伤害", badgeColor: "#e11d48", defaults: { n: 4, perClimax: 1, dmg: 1, times: 1 } },
	{ id: "bottom_flip_any",  label: "翻底有潮打X",  badgeColor: "#db2777", defaults: { n: 4, dmg: 2 } },
	{ id: "bottom_flip_count",label: "翻底潮数单伤", badgeColor: "#b45309", defaults: { n: 4 } },
	{ id: "top_remove_cx",    label: "看X顶送潮入墓", badgeColor: "#0d9488", defaults: { n: 4 } },
	{ id: "cancel_return",    label: "取消后X洗回卡组", badgeColor: "#7c3aed", defaults: { n: 2, y: 3 } },
	{ id: "return_cx",        label: "洗X非潮回卡组",  badgeColor: "#ea580c", defaults: { n: 1 } },
];

function stepToOps(step) {
	switch (step.type) {
		case "direct":
			return [{ type: OpType.DAMAGE, n: step.n }];
		case "cancel":
			return [{
				type:     OpType.DAMAGE,
				n:        step.n,
				onCancel: Array.from({ length: step.times ?? 1 }, () => ({ type: OpType.DAMAGE, n: step.m })),
			}];
		case "bottom_flip": {
			// 底部翻 n 张，每 perClimax 张高潮触发一次：dmg 点 × times 次独立伤害
			const { n, perClimax, dmg, times } = step;
			const safePerClimax = Math.max(1, perClimax);
			const maxTriggers   = Math.floor(n / safePerClimax);
			// 每次触发 = times 次独立 dmg 点伤害
			const triggerOps = Array.from({ length: times }, () => ({ type: OpType.DAMAGE, n: dmg }));
			const damageConditions = Array.from({ length: maxTriggers }, (_, i) => ({
				type:      OpType.CONDITIONAL,
				condition: (s) => Math.floor((s._cxCount ?? 0) / safePerClimax) >= i + 1,
				then:      [...triggerOps],
			}));
			return [
				{
					type:   OpType.MOVE,
					source: { zone: ZoneId.DECK, method: { type: "bottom", n } },
					act:    { selections: [], remainder: { destination: ZoneId.REST, order: "any" } },
				},
				{
					type:      OpType.CONDITIONAL,
					condition: (state) => {
						state._cxCount = (state.lastResult?.cardsRevealed ?? [])
							.filter(c => c.type === "climax").length;
						return true;
					},
					then: damageConditions,
				},
			];
		}
		case "top_remove_cx":
			// 看对手牌组顶 N 张：高潮牌送废弃堆，非高潮原序放回顶部
			return [
				{
					type:   OpType.MOVE,
					source: { zone: ZoneId.DECK, method: { type: "top", n: step.n } },
					act: {
						selections: [
							{
								filter:      { type: "climax" },
								count:       { type: "all" },
								destination: ZoneId.REST,
							},
						],
						remainder: { destination: "source", order: "original" },
					},
				},
			];
		case "bottom_flip_count":
			// 翻底 N 张 → 废弃堆，单次造成高潮数量点伤害（整体可取消）
			return [
				{
					type:   OpType.MOVE,
					source: { zone: ZoneId.DECK, method: { type: "bottom", n: step.n } },
					act:    { selections: [], remainder: { destination: ZoneId.REST, order: "any" } },
				},
				{
					type: OpType.VARIABLE_DAMAGE,
					nFn:  (state) =>
						(state.lastResult?.cardsRevealed ?? []).filter(c => c.type === "climax").length,
				},
			];
		case "bottom_flip_any":
			// 翻底 N 张，含任意高潮 → 造成 dmg 点伤害（单次，可取消）
			return [
				{
					type:     OpType.MOVE,
					source:   { zone: ZoneId.DECK, method: { type: "bottom", n: step.n } },
					act:      { selections: [], remainder: { destination: ZoneId.REST, order: "any" } },
					onClimax: [{ type: OpType.DAMAGE, n: step.dmg }],
				},
			];
		case "cancel_return":
			// 打 n 点伤害，取消后从休息室回最多 y 张非潮入库并洗牌（不足则取全部）
			return [{
				type:     OpType.DAMAGE,
				n:        step.n,
				onCancel: [{ type: OpType.FX, n: step.y, filter: { type: "non_climax" } }],
			}];
		case "return_cx":
			// 直接从休息室取最多 n 张非潮回卡组并洗牌（不足则取全部）
			return [{ type: OpType.FX, n: step.n, filter: { type: "non_climax" } }];
		default:
			return [];
	}
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DamageCalculator() {
	const { t } = useLocale();

	// Opponent state
	const [deckTotal,  setDeckTotal]  = useState(20);
	const [deckCX,     setDeckCX]     = useState(3);
	const [restTotal,  setRestTotal]  = useState(10);
	const [restCX,     setRestCX]     = useState(4);
	const [clockCount, setClockCount] = useState(0);
	const [opLevel,    setOpLevel]    = useState(2);

	// Sequence
	const [steps,   setSteps]   = useState([]);
	const [result,  setResult]  = useState(null);
	const [running, setRunning] = useState(false);
	const [error,   setError]   = useState(null);

	const addStep = useCallback((typeId) => {
		const cfg = STEP_TYPES.find(t => t.id === typeId);
		if (!cfg) return;
		setSteps(prev => [...prev, { id: Date.now(), type: typeId, ...cfg.defaults }]);
		setResult(null);
	}, []);

	const removeStep = useCallback((id) => {
		setSteps(prev => prev.filter(s => s.id !== id));
		setResult(null);
	}, []);

	const updateStep = useCallback((id, field, rawValue) => {
		const value = Math.max(1, Math.min(20, parseInt(rawValue) || 1));
		setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
		setResult(null);
	}, []);

	const moveStep = useCallback((idx, dir) => {
		setSteps(prev => {
			const next   = [...prev];
			const target = idx + dir;
			if (target < 0 || target >= next.length) return prev;
			[next[idx], next[target]] = [next[target], next[idx]];
			return next;
		});
		setResult(null);
	}, []);

	const duplicateStep = useCallback((id) => {
		setSteps(prev => {
			const idx  = prev.findIndex(s => s.id === id);
			if (idx === -1) return prev;
			const copy = { ...prev[idx], id: Date.now() };
			const next = [...prev];
			next.splice(idx + 1, 0, copy);
			return next;
		});
		setResult(null);
	}, []);

	const clearSteps = useCallback(() => {
		setSteps([]);
		setResult(null);
	}, []);

	const runSimulation = useCallback(() => {
		if (steps.length === 0 || running) return;
		setRunning(true);
		setResult(null);
		setError(null);

		setTimeout(() => {
			try {
				const sequence = steps.flatMap(stepToOps);
				const deckN    = Math.max(0, deckTotal - deckCX);
				const restN    = Math.max(0, restTotal - restCX);

				const initial = {
					deck:  buildSimpleDeck({ characters: deckN,  climaxes: deckCX }),
					rest:  buildSimpleDeck({ characters: restN,  climaxes: restCX }),
					clock: Array.from({ length: clockCount }, () => makeCharacter()),
					level: Array.from({ length: opLevel   }, () => makeCharacter()),
				};

				const r = simulate({ sequence, initial, config: { trials: 100_000 } });
				setResult(r);
			} catch (e) {
				setError(e.message);
			} finally {
				setRunning(false);
			}
		}, 0);
	}, [steps, deckTotal, deckCX, restTotal, restCX, clockCount, opLevel, running]);

	const killRate = result ? result.lossRate * 100 : null;
	const killColor =
		killRate === null  ? "text-[var(--text)]" :
		killRate >= 50     ? "text-green-600" :
		killRate >= 20     ? "text-orange-500" :
		                     "text-red-500";

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

			{/* Title */}
			<div className="mb-6">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-1">
					伤害计算器
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">输入对手状态和伤害序列，计算斩杀概率</p>
			</div>

			{/* ── Opponent State ─────────────────────────────────────────────── */}
			<div className="grid grid-cols-3 gap-3 mb-4">

				{/* Deck */}
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-3">
						牌库状态
					</p>
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<NumInput value={deckTotal} onChange={v => { setDeckTotal(v); setResult(null); }} max={60} />
							<span className="text-xs text-[var(--text-muted)] shrink-0">张</span>
						</div>
						<div className="flex items-center gap-2">
							<NumInput value={deckCX} onChange={v => { setDeckCX(Math.min(v, deckTotal)); setResult(null); }} max={deckTotal} />
							<span className="text-xs text-[var(--text-muted)] shrink-0">高潮</span>
						</div>
					</div>
				</div>

				{/* Rest */}
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-3">
						弃牌堆状态
					</p>
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<NumInput value={restTotal} onChange={v => { setRestTotal(v); setResult(null); }} max={60} />
							<span className="text-xs text-[var(--text-muted)] shrink-0">张</span>
						</div>
						<div className="flex items-center gap-2">
							<NumInput value={restCX} onChange={v => { setRestCX(Math.min(v, restTotal)); setResult(null); }} max={restTotal} />
							<span className="text-xs text-[var(--text-muted)] shrink-0">高潮</span>
						</div>
					</div>
				</div>

				{/* Level + Clock */}
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-3">
						血量状态
					</p>
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<NumInput value={opLevel} onChange={v => { setOpLevel(Math.min(v, 3)); setResult(null); }} max={3} />
							<span className="text-xs text-[var(--text-muted)] shrink-0">{t("damage.levelLabel")}</span>
						</div>
						<div className="flex items-center gap-2">
							<NumInput value={clockCount} onChange={v => { setClockCount(Math.min(v, 6)); setResult(null); }} max={6} />
							<span className="text-xs text-[var(--text-muted)] shrink-0">{t("damage.clockLabel")}</span>
						</div>
					</div>
				</div>

			</div>

			{/* ── Damage Sequence ────────────────────────────────────────────── */}
			<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5 mb-4">
				<div className="flex items-center justify-between mb-3">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
						伤害序列
					</p>
					{steps.length > 0 && (
						<button onClick={clearSteps}
							className="text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors font-medium">
							清空
						</button>
					)}
				</div>

				{/* Add buttons */}
				<div className="flex flex-wrap gap-2 mb-4">
					{STEP_TYPES.map(cfg => (
						<button key={cfg.id} onClick={() => addStep(cfg.id)}
							className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full
							           border border-[var(--border)] text-[var(--text-secondary)]
							           hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
							<Plus size={10} />
							{cfg.label}
						</button>
					))}
				</div>

				{/* Step list */}
				{steps.length === 0 ? (
					<p className="text-sm text-[var(--text-muted)] text-center py-8">
						点击上方按钮添加伤害步骤
					</p>
				) : (
					<div className="flex flex-col gap-2">
						{steps.map((step, idx) => (
							<StepCard
								key={step.id}
								step={step}
								idx={idx}
								total={steps.length}
								onUpdate={updateStep}
								onRemove={removeStep}
								onMove={moveStep}
								onDuplicate={duplicateStep}
							/>
						))}
					</div>
				)}
			</div>

			{/* ── Run button ─────────────────────────────────────────────────── */}
			<button onClick={runSimulation}
				disabled={steps.length === 0 || running}
				className="w-full py-3 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold
				           hover:bg-[var(--text-secondary)] active:scale-95 transition-all shadow-sm
				           disabled:opacity-40 disabled:cursor-not-allowed
				           flex items-center justify-center gap-2 mb-4">
				{running
					? <><Loader2 size={16} className="animate-spin" />计算中…</>
					: <><Play size={16} />计算斩杀率</>
				}
			</button>

			{/* Error */}
			{error && (
				<div className="border border-red-200 rounded-xl p-3 bg-red-50 text-sm text-red-600 mb-4">
					计算出错：{error}
				</div>
			)}

			{/* ── Results ────────────────────────────────────────────────────── */}
			{result && (
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-5">
						计算结果
					</p>

					{/* Kill rate — primary */}
					<div className="text-center mb-6">
						<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-2">
							斩杀率
						</p>
						<p className={`text-6xl font-black leading-none ${killColor}`}>
							{killRate.toFixed(1)}%
						</p>
					</div>

					{/* Secondary stats */}
					<div className="grid grid-cols-3 gap-3 mb-4">
						{[
							{ label: t("damage.expectedClock"), value: result.total.mean.toFixed(2) + " 张" },
							{ label: t("damage.avgRefresh"),   value: result.refresh.mean.toFixed(2) + " 次" },
							{ label: t("damage.avgLevelUp"),   value: result.levelUp.mean.toFixed(2) + " 次" },
						].map(({ label, value }) => (
							<div key={label} className="border border-[var(--border)] rounded-xl p-3 text-center bg-[var(--card-background)]">
								<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">
									{label}
								</p>
								<p className="text-base font-bold text-[var(--text)]">{value}</p>
							</div>
						))}
					</div>

					<DistributionSection total={result.total} />
				</div>
			)}
		</div>
	);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const stepShape = PropTypes.shape({
	id: PropTypes.number,
	type: PropTypes.string,
	n: PropTypes.number,
	m: PropTypes.number,
	y: PropTypes.number,
	times: PropTypes.number,
	dmg: PropTypes.number,
	perClimax: PropTypes.number,
});

function StepCard({ step, idx, total, onUpdate, onRemove, onMove, onDuplicate }) {
	const cfg = STEP_TYPES.find(t => t.id === step.type);

	return (
		<div className="border border-[var(--border)] rounded-xl bg-[var(--card-background)] px-3 py-3">

			{/* ── Header ──────────────────────────────────────────────────── */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-black text-[var(--text-muted)] w-4 text-center shrink-0">
						{idx + 1}
					</span>
					<span
						style={{ backgroundColor: cfg?.badgeColor ?? "#52675a" }}
						className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white">
						{cfg?.label}
					</span>
				</div>
				<div className="flex items-center">
					<button onClick={() => onMove(idx, -1)} disabled={idx === 0}
						className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-25 transition-colors">
						<ChevronUp size={13} />
					</button>
					<button onClick={() => onMove(idx, 1)} disabled={idx === total - 1}
						className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-25 transition-colors">
						<ChevronDown size={13} />
					</button>
					<button onClick={() => onDuplicate(step.id)}
						className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
						<Copy size={13} />
					</button>
					<button onClick={() => onRemove(step.id)}
						className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
						<Trash2 size={13} />
					</button>
				</div>
			</div>

			{/* ── Inputs (multi-line) ──────────────────────────────────────── */}
			<div className="flex flex-col gap-1.5 pl-6">

				{step.type === "direct" && (
					<Row>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} />
						<L>点伤害</L>
					</Row>
				)}

				{step.type === "cancel" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">主伤</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} />
						<L>点</L>
					</Row>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">取消后追加</span>
						<StepInput value={step.m} onChange={v => onUpdate(step.id, "m", v)} />
						<L>点</L>
						<StepInput value={step.times ?? 1} onChange={v => onUpdate(step.id, "times", v)} max={8} />
						<L>次</L>
					</Row>
				</>)}

				{step.type === "top_remove_cx" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">看对手牌组顶</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} max={15} />
						<L>张</L>
					</Row>
					<Row><L>高潮送墓地，非潮原序放回</L></Row>
				</>)}

				{step.type === "bottom_flip_count" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">底部翻</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} max={15} />
						<L>张</L>
					</Row>
					<Row><L>单次造成高潮数点伤害</L></Row>
				</>)}

				{step.type === "bottom_flip_any" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">底部翻</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} max={15} />
						<L>张</L>
					</Row>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">含高潮则造成</span>
						<StepInput value={step.dmg} onChange={v => onUpdate(step.id, "dmg", v)} />
						<L>点伤害</L>
					</Row>
				</>)}

				{step.type === "return_cx" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">从休息室洗</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} max={8} />
						<L>张非潮回卡组（不足取全部）</L>
					</Row>
				</>)}

				{step.type === "cancel_return" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">主伤</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} />
						<L>点</L>
					</Row>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">取消后从休息室回</span>
						<StepInput value={step.y} onChange={v => onUpdate(step.id, "y", v)} max={20} />
						<L>张非潮入库（不足取全部）</L>
					</Row>
				</>)}

				{step.type === "bottom_flip" && (<>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">底部翻</span>
						<StepInput value={step.n} onChange={v => onUpdate(step.id, "n", v)} max={15} />
						<L>张</L>
					</Row>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">每</span>
						<StepInput value={step.perClimax} onChange={v => onUpdate(step.id, "perClimax", v)} max={step.n} />
						<L>张高潮</L>
					</Row>
					<Row>
						<span className="text-xs text-[var(--text-secondary)]">造成</span>
						<StepInput value={step.dmg} onChange={v => onUpdate(step.id, "dmg", v)} />
						<L>点伤害</L>
						<StepInput value={step.times} onChange={v => onUpdate(step.id, "times", v)} max={8} />
						<L>次</L>
					</Row>
				</>)}

			</div>
		</div>
	);
}

StepCard.propTypes = {
	step: stepShape.isRequired,
	idx: PropTypes.number.isRequired,
	total: PropTypes.number.isRequired,
	onUpdate: PropTypes.func.isRequired,
	onRemove: PropTypes.func.isRequired,
	onMove: PropTypes.func.isRequired,
	onDuplicate: PropTypes.func.isRequired,
};

// Tiny layout helpers
function Row({ children }) {
	return <div className="flex items-center gap-1.5">{children}</div>;
}
Row.propTypes = { children: PropTypes.node };

function L({ children }) {
	return <span className="text-xs text-[var(--text-muted)]">{children}</span>;
}
L.propTypes = { children: PropTypes.node };

function NumInput({ value, onChange, min = 0, max = 99 }) {
	return (
		<input
			type="number"
			value={value}
			min={min}
			max={max}
			onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
			className="w-full border border-solid border-[var(--border)] rounded-lg px-2 py-1.5
			           text-sm text-[var(--text)] bg-transparent focus:outline-none
			           focus:border-[var(--text-muted)] transition-colors text-center"
		/>
	);
}

function StepInput({ value, onChange, min = 1, max = 20 }) {
	const [draft, setDraft] = useState(String(value));

	useEffect(() => { setDraft(String(value)); }, [value]);

	const commit = (raw) => {
		const n = parseInt(raw, 10);
		const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n));
		setDraft(String(clamped));
		if (clamped !== value) onChange(clamped);
	};

	return (
		<div className="inline-flex items-center border border-solid border-[var(--border)] rounded-md overflow-hidden">
			<button type="button"
				onClick={() => onChange(Math.max(min, value - 1))}
				disabled={value <= min}
				className="px-1.5 py-1 text-[var(--text-muted)] hover:bg-[var(--card-background)]
				           hover:text-[var(--text)] transition-colors disabled:opacity-30 text-xs leading-none select-none">
				−
			</button>
			<input
				type="text"
				inputMode="numeric"
				value={draft}
				onChange={e => setDraft(e.target.value)}
				onBlur={e => commit(e.target.value)}
				onKeyDown={e => { if (e.key === "Enter") commit(e.target.value); }}
				className="w-8 text-xs text-[var(--text)] bg-transparent focus:outline-none
				           text-center border-x border-[var(--border)] py-1"
			/>
			<button type="button"
				onClick={() => onChange(Math.min(max, value + 1))}
				disabled={value >= max}
				className="px-1.5 py-1 text-[var(--text-muted)] hover:bg-[var(--card-background)]
				           hover:text-[var(--text)] transition-colors disabled:opacity-30 text-xs leading-none select-none">
				+
			</button>
		</div>
	);
}
NumInput.propTypes  = { value: PropTypes.number, onChange: PropTypes.func, min: PropTypes.number, max: PropTypes.number };
StepInput.propTypes = { value: PropTypes.number, onChange: PropTypes.func, min: PropTypes.number, max: PropTypes.number };

// ── Distribution Section ───────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = new Set([7, 14, 21]);

function DistributionSection({ total }) {
	const max  = total.max;
	const data = Array.from({ length: max + 1 }, (_, k) => ({
		k,
		p: total.distribution[k] ?? 0,
	}));

	const maxP   = Math.max(...data.map(d => d.p), 0.001);
	const BAR_W  = 18;
	const CHART_H = 80;
	const LABEL_H = 14;
	const svgW   = data.length * BAR_W;

	return (
		<div className="border-t border-[var(--border)] pt-4 mt-2">

			{/* Eyebrow */}
			<div className="flex items-center gap-3 mb-4">
				<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
					伤害分布
				</span>
				<div className="flex-1 border-t border-[var(--border)]" />
			</div>

			{/* Bar chart */}
			<div className="overflow-x-auto mb-4">
				<svg width={svgW} height={CHART_H + LABEL_H} className="block">
					{data.map(({ k, p }, i) => {
						const barH = Math.max((p / maxP) * CHART_H, p > 0 ? 1 : 0);
						const x    = i * BAR_W;
						const isT  = LEVEL_THRESHOLDS.has(k);
						return (
							<g key={k}>
								<rect
									x={x + 1} y={CHART_H - barH}
									width={BAR_W - 2} height={barH}
									rx={2}
									style={{ fill: isT ? "var(--text-secondary)" : "var(--primary)" }}
								/>
								<text
									x={x + BAR_W / 2} y={CHART_H + LABEL_H - 1}
									textAnchor="middle" fontSize="7"
									style={{ fill: "var(--text-muted)", fontFamily: "inherit" }}
								>
									{k}
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			{/* Probability table */}
			<div className="grid grid-cols-3 sm:grid-cols-4 gap-x-1 gap-y-0.5">
				{data.map(({ k, p }) => {
					const isT = LEVEL_THRESHOLDS.has(k);
					return (
						<div key={k}
							className={`flex items-center justify-between px-2 py-0.5 rounded text-[11px] ${
								isT
									? "bg-[var(--text-muted)] text-white font-bold"
									: "text-[var(--text)]"
							}`}>
							<span>{k} 张</span>
							<span>{(p * 100).toFixed(1)}%</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
DistributionSection.propTypes = { total: PropTypes.shape({ max: PropTypes.number, distribution: PropTypes.object }) };
