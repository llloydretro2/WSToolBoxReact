import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { Plus, Trash2, ChevronUp, ChevronDown, Play, Loader2, Copy, X } from "lucide-react";
import { simulate } from "../utils/wsDamage/simulator.js";
import { buildSimpleDeck, makeCharacter } from "../utils/wsDamage/card.js";
import { OpType, ZoneId } from "../utils/wsDamage/types.js";
import { useLocale } from "../contexts/LocaleContext.jsx";

// ── Helpers ────────────────────────────────────────────────────────────────────

function permutations(arr) {
	if (arr.length <= 1) return [arr.slice()];
	return arr.flatMap((_, i) => {
		const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
		return permutations(rest).map(p => [arr[i], ...p]);
	});
}

function cartesianProduct(arrays) {
	if (arrays.length === 0) return [[]];
	const [first, ...rest] = arrays;
	const restProd = cartesianProduct(rest);
	return first.flatMap(item => restProd.map(p => [item, ...p]));
}

// Substitute variable name references in a step's numeric fields.
function resolveStep(step, varValues) {
	const out = { ...step };
	for (const [field, val] of Object.entries(step)) {
		if (typeof val === "string" && varValues[val] !== undefined) {
			out[field] = varValues[val];
		}
	}
	return out;
}

function killRateColor(rate) {
	return rate >= 50 ? "text-green-600" : rate >= 20 ? "text-orange-500" : "text-red-500";
}

function factorialOf(n) {
	return n <= 1 ? 1 : n * factorialOf(n - 1);
}

const GROUP_LABELS = ["A", "B", "C", "D", "E"];
const GROUP_COLORS = ["#52675a", "#3b82f6", "#e11d48", "#7c3aed", "#ea580c"];

// ── Step type definitions ──────────────────────────────────────────────────────

const STEP_TYPE_DEFS = [
	{ id: "direct",            badgeColor: "#52675a", defaults: { n: 2 } },
	{ id: "cancel",            badgeColor: "#3b82f6", defaults: { n: 2, m: 1, times: 1 } },
	{ id: "bottom_flip",       badgeColor: "#e11d48", defaults: { n: 4, perClimax: 1, dmg: 1, times: 1 } },
	{ id: "bottom_flip_any",   badgeColor: "#db2777", defaults: { n: 4, dmg: 2 } },
	{ id: "bottom_flip_count", badgeColor: "#b45309", defaults: { n: 4 } },
	{ id: "top_remove_cx",     badgeColor: "#0d9488", defaults: { n: 4 } },
	{ id: "cancel_return",     badgeColor: "#7c3aed", defaults: { n: 2, y: 3 } },
	{ id: "return_cx",         badgeColor: "#ea580c", defaults: { n: 1 } },
	{ id: "attack",            badgeColor: "#0284c7", defaults: { n: 1, triggerRate: 50, bonusDmg: 1 } },
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
			const { n, perClimax, dmg, times } = step;
			const safePerClimax = Math.max(1, perClimax);
			const maxTriggers   = Math.floor(n / safePerClimax);
			const triggerOps    = Array.from({ length: times }, () => ({ type: OpType.DAMAGE, n: dmg }));
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
			return [{
				type:   OpType.MOVE,
				source: { zone: ZoneId.DECK, method: { type: "top", n: step.n } },
				act: {
					selections: [{ filter: { type: "climax" }, count: { type: "all" }, destination: ZoneId.REST }],
					remainder:  { destination: "source", order: "original" },
				},
			}];
		case "bottom_flip_count":
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
			return [{
				type:     OpType.MOVE,
				source:   { zone: ZoneId.DECK, method: { type: "bottom", n: step.n } },
				act:      { selections: [], remainder: { destination: ZoneId.REST, order: "any" } },
				onClimax: [{ type: OpType.DAMAGE, n: step.dmg }],
			}];
		case "cancel_return":
			return [{
				type:     OpType.DAMAGE,
				n:        step.n,
				onCancel: [{ type: OpType.FX, n: step.y, filter: { type: "non_climax" } }],
			}];
		case "return_cx":
			return [{ type: OpType.FX, n: step.n, filter: { type: "non_climax" } }];
		case "attack": {
			const prob     = Math.max(0, Math.min(1, (step.triggerRate ?? 50) / 100));
			const base     = step.n ?? 1;
			const bonusDmg = step.bonusDmg ?? 1;
			return [{ type: OpType.VARIABLE_DAMAGE, nFn: () => Math.random() < prob ? base + bonusDmg : base }];
		}
		default:
			return [];
	}
}

// ── Group state factory ────────────────────────────────────────────────────────
// Returns [groups, groupCallbacks] to avoid duplicating group management logic.

function useGroupState(setResult) {
	const [groups, setGroups] = useState([
		{ id: 1, steps: [] },
		{ id: 2, steps: [] },
		{ id: 3, steps: [] },
	]);

	const addStep = useCallback((groupId, typeId) => {
		const cfg = STEP_TYPE_DEFS.find(d => d.id === typeId);
		if (!cfg) return;
		setGroups(prev => prev.map(g =>
			g.id !== groupId ? g :
			{ ...g, steps: [...g.steps, { id: Date.now(), type: typeId, ...cfg.defaults }] }
		));
		setResult(null);
	}, [setResult]);

	const removeStep = useCallback((groupId, stepId) => {
		setGroups(prev => prev.map(g =>
			g.id !== groupId ? g : { ...g, steps: g.steps.filter(s => s.id !== stepId) }
		));
		setResult(null);
	}, [setResult]);

	const updateStep = useCallback((groupId, stepId, field, rawValue) => {
		const value = typeof rawValue === "string"
			? rawValue
			: Math.max(1, Math.min(100, parseInt(rawValue) || 1));
		setGroups(prev => prev.map(g =>
			g.id !== groupId ? g :
			{ ...g, steps: g.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s) }
		));
		setResult(null);
	}, [setResult]);

	const moveStep = useCallback((groupId, idx, dir) => {
		setGroups(prev => prev.map(g => {
			if (g.id !== groupId) return g;
			const steps  = [...g.steps];
			const target = idx + dir;
			if (target < 0 || target >= steps.length) return g;
			[steps[idx], steps[target]] = [steps[target], steps[idx]];
			return { ...g, steps };
		}));
		setResult(null);
	}, [setResult]);

	const duplicateStep = useCallback((groupId, stepId) => {
		setGroups(prev => prev.map(g => {
			if (g.id !== groupId) return g;
			const idx  = g.steps.findIndex(s => s.id === stepId);
			if (idx === -1) return g;
			const copy  = { ...g.steps[idx], id: Date.now() };
			const steps = [...g.steps];
			steps.splice(idx + 1, 0, copy);
			return { ...g, steps };
		}));
		setResult(null);
	}, [setResult]);

	const clearSteps = useCallback((groupId) => {
		setGroups(prev => prev.map(g =>
			g.id !== groupId ? g : { ...g, steps: [] }
		));
		setResult(null);
	}, [setResult]);

	const addGroup = useCallback(() => {
		setGroups(prev => prev.length >= 5 ? prev : [...prev, { id: Date.now(), steps: [] }]);
		setResult(null);
	}, [setResult]);

	const removeGroup = useCallback((groupId) => {
		setGroups(prev => prev.length <= 1 ? prev : prev.filter(g => g.id !== groupId));
		setResult(null);
	}, [setResult]);

	return [groups, { addStep, removeStep, updateStep, moveStep, duplicateStep, clearSteps, addGroup, removeGroup }];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DamageCalculator() {
	const { t } = useLocale();
	const STEP_TYPES = STEP_TYPE_DEFS.map(d => ({ ...d, label: t(`damage.steps.${d.id}`) }));
	const sd = (key) => t(`damage.stepDesc.${key}`);

	// Mode
	const [mode, setMode] = useState("permutation");

	// Opponent state (shared)
	const [deckTotal,  setDeckTotal]  = useState(20);
	const [deckCX,     setDeckCX]     = useState(3);
	const [restTotal,  setRestTotal]  = useState(10);
	const [restCX,     setRestCX]     = useState(4);
	const [clockCount, setClockCount] = useState(0);
	const [opLevel,    setOpLevel]    = useState(2);

	// Single mode
	const [steps,  setSteps]  = useState([]);
	const [result, setResult] = useState(null);

	// Permutation mode
	const [permResult, setPermResult] = useState(null);
	const [groups, permCbs] = useGroupState(setPermResult);

	// Variable mode
	const [varResult, setVarResult] = useState(null);
	const [varGroups, varCbs] = useGroupState(setVarResult);
	const [variables, setVariables] = useState([]);

	// Shared
	const [running,  setRunning]  = useState(false);
	const [error,    setError]    = useState(null);
	const [progress, setProgress] = useState(0); // 0-100, only used in perm/var modes

	// varValues resolves string variable references in opponent state fields
	const buildInitial = useCallback((varValues = {}) => {
		const res = (v, fallback) =>
			typeof v === "string" ? (varValues[v] ?? fallback) : (typeof v === "number" ? v : fallback);
		const dt = res(deckTotal,  20);
		const dc = res(deckCX,      3);
		const rt = res(restTotal,  10);
		const rc = res(restCX,      4);
		const cc = res(clockCount,  0);
		const ol = res(opLevel,     2);
		const deckN = Math.max(0, dt - dc);
		const restN = Math.max(0, rt - rc);
		return {
			deck:  buildSimpleDeck({ characters: deckN, climaxes: Math.min(dc, dt) }),
			rest:  buildSimpleDeck({ characters: restN, climaxes: Math.min(rc, rt) }),
			clock: Array.from({ length: Math.min(cc, 6) }, () => makeCharacter()),
			level: Array.from({ length: Math.min(ol, 3) }, () => makeCharacter()),
		};
	}, [deckTotal, deckCX, restTotal, restCX, clockCount, opLevel]);

	const clearAll = useCallback(() => {
		setResult(null); setPermResult(null); setVarResult(null);
	}, []);

	// ── Single mode handlers ───────────────────────────────────────────────────

	const addSingleStep = useCallback((typeId) => {
		const cfg = STEP_TYPE_DEFS.find(d => d.id === typeId);
		if (!cfg) return;
		setSteps(prev => [...prev, { id: Date.now(), type: typeId, ...cfg.defaults }]);
		setResult(null);
	}, []);

	const removeSingleStep = useCallback((id) => {
		setSteps(prev => prev.filter(s => s.id !== id));
		setResult(null);
	}, []);

	const updateSingleStep = useCallback((id, field, rawValue) => {
		const value = Math.max(1, Math.min(100, parseInt(rawValue) || 1));
		setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
		setResult(null);
	}, []);

	const moveSingleStep = useCallback((idx, dir) => {
		setSteps(prev => {
			const next   = [...prev];
			const target = idx + dir;
			if (target < 0 || target >= next.length) return prev;
			[next[idx], next[target]] = [next[target], next[idx]];
			return next;
		});
		setResult(null);
	}, []);

	const duplicateSingleStep = useCallback((id) => {
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

	const runSimulation = useCallback(() => {
		if (steps.length === 0 || running) return;
		setRunning(true); setResult(null); setError(null);
		setTimeout(() => {
			try {
				const r = simulate({ sequence: steps.flatMap(stepToOps), initial: buildInitial(), config: { trials: 100_000 } });
				setResult(r);
			} catch (e) { setError(e.message); }
			finally { setRunning(false); }
		}, 0);
	}, [steps, running, buildInitial]);

	// ── Permutation run ────────────────────────────────────────────────────────

	const runPermutation = useCallback(() => {
		if (running) return;
		const active = groups.map((g, i) => ({ ...g, label: GROUP_LABELS[i] })).filter(g => g.steps.length > 0);
		if (active.length === 0) { setError(t("damage.perm.emptyHint")); return; }

		const initial = buildInitial();
		const perms   = permutations(active.map((_, i) => i));
		const trials  = active.length >= 4 ? 50_000 : 100_000;
		const results = [];
		let idx = 0;

		setRunning(true); setPermResult(null); setError(null); setProgress(0);

		function step() {
			if (idx >= perms.length) {
				results.sort((a, b) => b.killRate - a.killRate || b.meanClock - a.meanClock);
				setPermResult(results);
				setRunning(false);
				return;
			}
			try {
				const perm     = perms[idx];
				const sequence = perm.flatMap(gi => active[gi].steps.flatMap(stepToOps));
				const r        = simulate({ sequence, initial, config: { trials } });
				results.push({ order: perm.map(gi => active[gi].label), killRate: r.lossRate * 100, meanClock: r.total.mean });
				idx++;
				setProgress(Math.round(idx / perms.length * 100));
				setTimeout(step, 0);
			} catch (e) {
				setError(e.message);
				setRunning(false);
			}
		}
		setTimeout(step, 0);
	}, [groups, running, buildInitial, t]);

	// ── Variable mode: variable definition handlers ────────────────────────────

	const addVariable = useCallback(() => {
		setVariables(prev => {
			if (prev.length >= 10) return prev;
			const defaultNames = ["X", "Y", "Z", "W", "V"];
			const used = new Set(prev.map(v => v.name));
			const name = defaultNames.find(n => !used.has(n)) ?? `V${prev.length + 1}`;
			return [...prev, { id: Date.now(), name, min: 1, max: 3 }];
		});
		setVarResult(null);
	}, []);

	const removeVariable = useCallback((id) => {
		setVariables(prev => prev.filter(v => v.id !== id));
		setVarResult(null);
	}, []);

	const updateVariable = useCallback((id, field, value) => {
		setVariables(prev => prev.map(v => v.id !== id ? v : { ...v, [field]: value }));
		setVarResult(null);
	}, []);

	// ── Variable run ───────────────────────────────────────────────────────────

	const runVariableAnalysis = useCallback(() => {
		if (running) return;
		const active = varGroups.map((g, i) => ({ ...g, label: GROUP_LABELS[i] })).filter(g => g.steps.length > 0);

		const hasVarRef = active.some(g => g.steps.some(s =>
			Object.values(s).some(v => typeof v === "string")
		));

		if (active.length === 0 || (variables.length > 0 && !hasVarRef)) {
			setError(t("damage.var.emptyHint")); return;
		}

		const perms     = permutations(active.map((_, i) => i));
		const varRanges = variables.map(v => {
			const vals = [];
			for (let i = v.min; i <= v.max; i++) vals.push({ name: v.name, value: i });
			return vals;
		});
		const varCombos = varRanges.length > 0 ? cartesianProduct(varRanges) : [[]];
		const totalSims = varCombos.length * perms.length;
		const trials    = Math.max(20_000, Math.min(100_000, Math.floor(3_000_000 / totalSims)));

		// Flatten into a list of (varValues, perm) tasks
		const tasks = varCombos.flatMap(combo => {
			const varValues = Object.fromEntries(combo.map(v => [v.name, v.value]));
			return perms.map(perm => ({ varValues, perm }));
		});
		const results = [];
		let idx = 0;

		setRunning(true); setVarResult(null); setError(null); setProgress(0);

		function step() {
			if (idx >= tasks.length) {
				results.sort((a, b) => b.killRate - a.killRate || b.meanClock - a.meanClock);
				setVarResult({ results, totalSims, trials });
				setRunning(false);
				return;
			}
			try {
				const { varValues, perm } = tasks[idx];
				// Rebuild initial per combo to support opponent-state variables
				const initial = buildInitial(varValues);
				const sequence = perm.flatMap(gi =>
					active[gi].steps.flatMap(s => stepToOps(resolveStep(s, varValues)))
				);
				const r = simulate({ sequence, initial, config: { trials } });
				results.push({
					varValues,
					order:     perm.map(gi => active[gi].label),
					killRate:  r.lossRate * 100,
					meanClock: r.total.mean,
				});
				idx++;
				setProgress(Math.round(idx / tasks.length * 100));
				setTimeout(step, 0);
			} catch (e) {
				setError(e.message);
				setRunning(false);
			}
		}
		setTimeout(step, 0);
	}, [varGroups, variables, running, buildInitial, t]);

	// ── Derived ────────────────────────────────────────────────────────────────

	const killRate       = result ? result.lossRate * 100 : null;
	const activePermCnt  = groups.filter(g => g.steps.length > 0).length;
	const permCnt        = activePermCnt > 1 ? factorialOf(activePermCnt) : activePermCnt;

	const activeVarCnt   = varGroups.filter(g => g.steps.length > 0).length;
	const varComboCnt    = variables.reduce((acc, v) => acc * Math.max(1, v.max - v.min + 1), 1);
	const varPermCnt     = activeVarCnt > 1 ? factorialOf(activeVarCnt) : activeVarCnt;
	const totalVarSims   = varComboCnt * varPermCnt;

	const varNames = variables.map(v => v.name);

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

			{/* Title */}
			<div className="mb-6">
				<h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-1">
					{t("damage.title")}
				</h1>
				<p className="text-sm text-[var(--text-secondary)]">{t("damage.subtitle")}</p>
			</div>

			{/* Mode tabs */}
			<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden mb-4">
				{[
					{ key: "permutation", label: t("damage.modePerm") },
					{ key: "variable",    label: t("damage.modeVar")  },
					{ key: "single",      label: t("damage.modeSingle") },
				].map(({ key, label }) => (
					<button key={key}
						onClick={() => { setMode(key); setError(null); }}
						className={`px-4 py-2 text-[11px] font-bold border-r border-[var(--border)] last:border-r-0 transition-colors
							${mode === key
								? "bg-[var(--text)] text-[var(--background)]"
								: "bg-transparent text-[var(--text)] hover:bg-[var(--card-background)]"
							}`}>
						{label}
					</button>
				))}
			</div>

			{/* ── Opponent State (shared) ─────────────────────────────────── */}
			{/* ── Opponent State — 3 independent cards ── */}
			<div className="grid grid-cols-3 gap-3 mb-4">
				{/* 牌库 */}
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4 flex flex-col gap-2">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
						{t("damage.deckState")}
					</p>
					<StateField label={t("damage.labelDeckCards")} value={deckTotal} max={50}
						unit={t("damage.unitCard")}
						onChange={v => { setDeckTotal(v); clearAll(); }}
						variables={mode === "variable" ? varNames : []} />
					<StateField label={t("damage.labelDeckCX")} value={deckCX}
						max={typeof deckTotal === "number" ? Math.min(deckTotal, 8) : 8}
						onChange={v => { setDeckCX(typeof v === "string" ? v : Math.min(v, typeof deckTotal === "number" ? deckTotal : Infinity, 8)); clearAll(); }}
						variables={mode === "variable" ? varNames : []} />
				</div>
				{/* 休息室 */}
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4 flex flex-col gap-2">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
						{t("damage.restState")}
					</p>
					<StateField label={t("damage.labelRestCards")} value={restTotal} max={50}
						unit={t("damage.unitCard")}
						onChange={v => { setRestTotal(v); clearAll(); }}
						variables={mode === "variable" ? varNames : []} />
					<StateField label={t("damage.labelRestCX")} value={restCX}
						max={typeof restTotal === "number" ? Math.min(restTotal, 8) : 8}
						onChange={v => { setRestCX(typeof v === "string" ? v : Math.min(v, typeof restTotal === "number" ? restTotal : Infinity, 8)); clearAll(); }}
						variables={mode === "variable" ? varNames : []} />
				</div>
				{/* 血量状态 */}
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4 flex flex-col gap-2">
					<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
						{t("damage.healthState")}
					</p>
					<StateField label={t("damage.levelLabel")} value={opLevel} max={3}
						onChange={v => { setOpLevel(typeof v === "string" ? v : Math.min(v, 3)); clearAll(); }}
						variables={mode === "variable" ? varNames : []} />
					<StateField label={t("damage.clockLabel")} value={clockCount} max={6}
						onChange={v => { setClockCount(typeof v === "string" ? v : Math.min(v, 6)); clearAll(); }}
						variables={mode === "variable" ? varNames : []} />
				</div>
			</div>

			{/* ── Single Mode ─────────────────────────────────────────────── */}
			{mode === "single" && (<>
				<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5 mb-4">
					<div className="flex items-center justify-between mb-3">
						<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("damage.sequence")}</p>
						{steps.length > 0 && (
							<button onClick={() => { setSteps([]); setResult(null); }}
								className="text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors font-medium">
								{t("damage.clearAll")}
							</button>
						)}
					</div>
					<div className="flex flex-wrap gap-2 mb-4">
						{STEP_TYPES.map(cfg => (
							<button key={cfg.id} onClick={() => addSingleStep(cfg.id)}
								className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full
								           border border-[var(--border)] text-[var(--text-secondary)]
								           hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
								<Plus size={10} />{cfg.label}
							</button>
						))}
					</div>
					{steps.length === 0 ? (
						<p className="text-sm text-[var(--text-muted)] text-center py-8">{t("damage.emptyHint")}</p>
					) : (
						<div className="flex flex-col gap-2">
							{steps.map((step, idx) => (
								<StepCard key={step.id} step={step} idx={idx} total={steps.length}
									onUpdate={updateSingleStep} onRemove={removeSingleStep}
									onMove={moveSingleStep} onDuplicate={duplicateSingleStep}
									sd={sd} stepTypes={STEP_TYPES} />
							))}
						</div>
					)}
				</div>
				<button onClick={runSimulation} disabled={steps.length === 0 || running}
					className="w-full py-3 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold
					           hover:bg-[var(--text-secondary)] active:scale-95 transition-all shadow-sm
					           disabled:opacity-40 disabled:cursor-not-allowed
					           flex items-center justify-center gap-2 mb-4">
					{running ? <><Loader2 size={16} className="animate-spin" />{t("damage.calculating")}</> : <><Play size={16} />{t("damage.calculate")}</>}
				</button>
				{result && <SingleResultPanel result={result} killRate={killRate} t={t} />}
			</>)}

			{/* ── Permutation Mode ──────────────────────────────────────────── */}
			{mode === "permutation" && (<>
				<div className="flex flex-col gap-4 mb-4">
					{groups.map((group, i) => (
						<GroupPanel key={group.id} group={group} groupIdx={i} groupCount={groups.length}
							onAddStep={permCbs.addStep} onRemoveGroup={permCbs.removeGroup}
							onRemoveStep={permCbs.removeStep} onUpdateStep={permCbs.updateStep}
							onMoveStep={permCbs.moveStep} onDuplicateStep={permCbs.duplicateStep}
							onClearSteps={permCbs.clearSteps} stepTypes={STEP_TYPES} sd={sd} />
					))}
				</div>
				{groups.length < 5 && (
					<button onClick={permCbs.addGroup}
						className="w-full py-2 mb-4 rounded-xl border border-dashed border-[var(--border)]
						           text-[11px] font-bold text-[var(--text-muted)]
						           hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-colors
						           flex items-center justify-center gap-1.5">
						<Plus size={12} />{t("damage.perm.addGroup")}
					</button>
				)}
				<button onClick={runPermutation} disabled={activePermCnt === 0 || running}
					className="w-full py-3 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold
					           hover:bg-[var(--text-secondary)] active:scale-95 transition-all shadow-sm
					           disabled:opacity-40 disabled:cursor-not-allowed
					           flex items-center justify-center gap-2 mb-4">
					{running ? (
						<><Loader2 size={16} className="animate-spin" />{t("damage.perm.analyzing")}</>
					) : (<>
						<Play size={16} />{t("damage.perm.analyze")}
						{permCnt > 1 && (
							<span className="text-white/60 text-[11px] font-medium">
								({t("damage.perm.permCount").replace("{{n}}", String(permCnt))})
							</span>
						)}
					</>)}
				</button>
				{running && <ProgressBar progress={progress} />}
			{permResult && <PermutationResultPanel results={permResult} t={t} />}
			</>)}

			{/* ── Variable Mode ─────────────────────────────────────────────── */}
			{mode === "variable" && (<>

				{/* Variable definitions */}
				<VariableDefPanel variables={variables} onAdd={addVariable} onRemove={removeVariable} onUpdate={updateVariable} t={t} />

				{/* Groups (variable-aware) */}
				<div className="flex flex-col gap-4 mb-4">
					{varGroups.map((group, i) => (
						<GroupPanel key={group.id} group={group} groupIdx={i} groupCount={varGroups.length}
							onAddStep={varCbs.addStep} onRemoveGroup={varCbs.removeGroup}
							onRemoveStep={varCbs.removeStep} onUpdateStep={varCbs.updateStep}
							onMoveStep={varCbs.moveStep} onDuplicateStep={varCbs.duplicateStep}
							onClearSteps={varCbs.clearSteps} stepTypes={STEP_TYPES} sd={sd}
							variables={varNames} />
					))}
				</div>
				{varGroups.length < 5 && (
					<button onClick={varCbs.addGroup}
						className="w-full py-2 mb-4 rounded-xl border border-dashed border-[var(--border)]
						           text-[11px] font-bold text-[var(--text-muted)]
						           hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-colors
						           flex items-center justify-center gap-1.5">
						<Plus size={12} />{t("damage.perm.addGroup")}
					</button>
				)}

				{/* Analyze button */}
				<button onClick={runVariableAnalysis} disabled={activeVarCnt === 0 || running}
					className="w-full py-3 rounded-xl bg-[var(--text-muted)] text-white text-sm font-bold
					           hover:bg-[var(--text-secondary)] active:scale-95 transition-all shadow-sm
					           disabled:opacity-40 disabled:cursor-not-allowed
					           flex items-center justify-center gap-2 mb-4">
					{running ? (
						<><Loader2 size={16} className="animate-spin" />{t("damage.var.analyzing")}</>
					) : (<>
						<Play size={16} />{t("damage.var.analyze")}
						{totalVarSims > 1 && (
							<span className="text-white/60 text-[11px] font-medium">
								({t("damage.var.simCount").replace("{{n}}", String(totalVarSims))})
							</span>
						)}
					</>)}
				</button>

				{running && <ProgressBar progress={progress} />}
			{varResult && <VariableResultPanel resultData={varResult} t={t} />}
			</>)}

			{/* Error */}
			{error && (
				<div className="border border-red-200 rounded-xl p-3 bg-red-50 text-sm text-red-600 mb-4">
					{t("damage.calcError")}：{error}
				</div>
			)}
		</div>
	);
}

// ── VariableDefPanel ───────────────────────────────────────────────────────────

function VariableDefPanel({ variables, onAdd, onRemove, onUpdate, t }) {
	return (
		<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-4 mb-4">
			<div className="flex items-center justify-between mb-3">
				<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
					{t("damage.var.title")}
				</p>
				{variables.length < 10 && (
					<button onClick={onAdd}
						className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full
						           border border-[var(--border)] text-[var(--text-secondary)]
						           hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
						<Plus size={10} />{t("damage.var.addVar")}
					</button>
				)}
			</div>

			{variables.length === 0 ? (
				<p className="text-sm text-[var(--text-muted)] text-center py-2">{t("damage.var.noVars")}</p>
			) : (
				<div className="flex flex-col gap-2">
					{variables.map(v => (
						<div key={v.id} className="flex items-center gap-2 flex-wrap">
							{/* Variable name */}
							<input
								value={v.name}
								onChange={e => onUpdate(v.id, "name", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2) || v.name)}
								className="w-10 text-center text-sm font-black border border-[var(--border)] rounded-lg px-1 py-1
								           bg-transparent text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)]"
							/>
							<span className="text-xs text-[var(--text-muted)]">{t("damage.var.range")}</span>
							<div className="w-14"><NumInput value={v.min} onChange={val => onUpdate(v.id, "min", Math.min(val, v.max))} min={0} max={20} /></div>
							<span className="text-xs text-[var(--text-muted)]">{t("damage.var.to")}</span>
							<div className="w-14"><NumInput value={v.max} onChange={val => onUpdate(v.id, "max", Math.max(val, v.min))} min={0} max={20} /></div>
							<button onClick={() => onRemove(v.id)}
								className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
								<X size={13} />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

VariableDefPanel.propTypes = {
	variables: PropTypes.array.isRequired,
	onAdd:     PropTypes.func.isRequired,
	onRemove:  PropTypes.func.isRequired,
	onUpdate:  PropTypes.func.isRequired,
	t:         PropTypes.func.isRequired,
};

// ── GroupPanel ─────────────────────────────────────────────────────────────────

function GroupPanel({
	group, groupIdx, groupCount,
	onAddStep, onRemoveGroup, onRemoveStep, onUpdateStep, onMoveStep, onDuplicateStep, onClearSteps,
	stepTypes, sd,
	variables = [],
}) {
	const { t } = useLocale();
	const label = GROUP_LABELS[groupIdx] ?? String(groupIdx + 1);
	const color = GROUP_COLORS[groupIdx] ?? "#52675a";

	return (
		<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md overflow-hidden"
			style={{ borderTopColor: color, borderTopWidth: 3 }}>
			<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
				<div className="flex items-center gap-2">
					<span className="text-xl font-black" style={{ color }}>{label}</span>
					<span className="text-sm font-bold text-[var(--text)]">
						{t("damage.perm.group").replace("{{label}}", label)}
					</span>
					{group.steps.length > 0 && (
						<span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
							style={{ backgroundColor: color + "22", color }}>
							{group.steps.length}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					{group.steps.length > 0 && (
						<button onClick={() => onClearSteps(group.id)}
							className="text-[10px] text-[var(--text-muted)] hover:text-red-500 transition-colors font-medium px-2 py-1">
							{t("damage.perm.clearGroup")}
						</button>
					)}
					{groupCount > 1 && (
						<button onClick={() => onRemoveGroup(group.id)}
							className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
							<X size={14} />
						</button>
					)}
				</div>
			</div>

			<div className="px-4 pt-3 flex flex-wrap gap-1.5">
				{stepTypes.map(cfg => (
					<button key={cfg.id} onClick={() => onAddStep(group.id, cfg.id)}
						className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full
						           border border-[var(--border)] text-[var(--text-secondary)]
						           hover:border-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
						<Plus size={9} />{cfg.label}
					</button>
				))}
			</div>

			<div className="p-4">
				{group.steps.length === 0 ? (
					<p className="text-sm text-[var(--text-muted)] text-center py-4">{t("damage.perm.groupEmpty")}</p>
				) : (
					<div className="flex flex-col gap-2">
						{group.steps.map((step, idx) => (
							<StepCard key={step.id} step={step} idx={idx} total={group.steps.length}
								onUpdate={(sid, field, val) => onUpdateStep(group.id, sid, field, val)}
								onRemove={(sid) => onRemoveStep(group.id, sid)}
								onMove={(i, dir) => onMoveStep(group.id, i, dir)}
								onDuplicate={(sid) => onDuplicateStep(group.id, sid)}
								sd={sd} stepTypes={stepTypes} variables={variables} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

GroupPanel.propTypes = {
	group:           PropTypes.shape({ id: PropTypes.number, steps: PropTypes.array }).isRequired,
	groupIdx:        PropTypes.number.isRequired,
	groupCount:      PropTypes.number.isRequired,
	onAddStep:       PropTypes.func.isRequired,
	onRemoveGroup:   PropTypes.func.isRequired,
	onRemoveStep:    PropTypes.func.isRequired,
	onUpdateStep:    PropTypes.func.isRequired,
	onMoveStep:      PropTypes.func.isRequired,
	onDuplicateStep: PropTypes.func.isRequired,
	onClearSteps:    PropTypes.func.isRequired,
	stepTypes:       PropTypes.array.isRequired,
	sd:              PropTypes.func.isRequired,
	variables:       PropTypes.arrayOf(PropTypes.string),
};

// ── VariableResultPanel ────────────────────────────────────────────────────────

function VariableResultPanel({ resultData, t }) {
	const [showAll, setShowAll] = useState(false);
	if (!resultData) return null;

	const { results, totalSims, trials } = resultData;
	const best     = results[0];
	const worst    = results[results.length - 1];
	const gap      = best.killRate - worst.killRate;
	const SHOW_MAX = 20;
	const displayed = showAll ? results : results.slice(0, SHOW_MAX);

	const fmtVars = (varValues) =>
		Object.entries(varValues).map(([k, v]) => `${k}=${v}`).join("  ");

	return (
		<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
			{/* Eyebrow */}
			<div className="flex items-center gap-3 mb-5">
				<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
					{t("damage.var.resultTitle")}
				</span>
				<div className="flex-1 border-t border-[var(--border)]" />
				<span className="text-[10px] text-[var(--text-muted)]">
					{t("damage.var.simCount").replace("{{n}}", String(totalSims))}
					{" · "}{(trials / 1000).toFixed(0)}k
				</span>
			</div>

			{/* Best summary */}
			<div className="mb-5">
				<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-2">
					{t("damage.var.best")}
				</p>
				<p className="text-xl font-black text-[var(--text)] tracking-widest mb-1">
					{fmtVars(best.varValues)}
				</p>
				<p className="text-sm font-bold text-[var(--text-secondary)] mb-3">
					{best.order.join(" → ")}
				</p>
				<div className="grid grid-cols-2 gap-3">
					<div className="border border-[var(--border)] rounded-xl p-4 text-center bg-[var(--card-background)]">
						<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{t("damage.killRate")}</p>
						<p className={`text-4xl font-black leading-none ${killRateColor(best.killRate)}`}>{best.killRate.toFixed(1)}%</p>
						<p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{t("damage.killRateDesc")}</p>
					</div>
					<div className="border border-[var(--border)] rounded-xl p-4 text-center bg-[var(--card-background)]">
						<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{t("damage.expectedDmg")}</p>
						<p className="text-4xl font-black leading-none text-[var(--text)]">{best.meanClock.toFixed(2)}</p>
						<p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{t("damage.expectedDmgUnit")}</p>
					</div>
				</div>
				{gap > 0.05 && (
					<p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
						+{gap.toFixed(1)}% {t("damage.perm.vsWorst")}
					</p>
				)}
			</div>

			{/* Ranking list */}
			<div className="flex flex-col gap-1.5">
				{displayed.map((r, i) => {
					const isBest = i === 0;
					const diff   = r.killRate - best.killRate;
					return (
						<div key={`${fmtVars(r.varValues)}-${r.order.join("")}`}
							className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors
								${isBest
									? "bg-[var(--text-muted)] border-[var(--text-muted)]"
									: "border-[var(--border)] bg-transparent hover:bg-[var(--card-background)]"
								}`}>
							<span className={`text-[10px] font-black w-4 text-center shrink-0 ${isBest ? "text-white/60" : "text-[var(--text-muted)]"}`}>
								{i + 1}
							</span>
							<span className={`text-[11px] font-bold font-mono shrink-0 ${isBest ? "text-white" : "text-[var(--text-muted)]"}`}>
								{fmtVars(r.varValues)}
							</span>
							<span className={`text-xs font-bold font-mono flex-1 ${isBest ? "text-white/80" : "text-[var(--text-secondary)]"}`}>
								{r.order.join("→")}
							</span>
							<span className={`text-[11px] tabular-nums shrink-0 ${isBest ? "text-white/70" : "text-[var(--text-muted)]"}`}>
								{r.meanClock.toFixed(2)} {t("damage.unitCard")}
							</span>
							{!isBest && (
								<span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
									{diff.toFixed(1)}%
								</span>
							)}
							<span className={`text-sm font-black tabular-nums shrink-0 ${isBest ? "text-white" : killRateColor(r.killRate)}`}>
								{r.killRate.toFixed(1)}%
							</span>
						</div>
					);
				})}
			</div>

			{results.length > SHOW_MAX && !showAll && (
				<button onClick={() => setShowAll(true)}
					className="w-full mt-3 py-2 text-[11px] font-bold text-[var(--text-muted)]
					           hover:text-[var(--text)] transition-colors text-center">
					{t("damage.var.showAll").replace("{{n}}", String(results.length))}
				</button>
			)}
		</div>
	);
}

VariableResultPanel.propTypes = {
	resultData: PropTypes.shape({
		results:   PropTypes.array,
		totalSims: PropTypes.number,
		trials:    PropTypes.number,
	}),
	t: PropTypes.func.isRequired,
};

// ── PermutationResultPanel ─────────────────────────────────────────────────────

function PermutationResultPanel({ results, t }) {
	if (!results || results.length === 0) return null;

	const best  = results[0];
	const worst = results[results.length - 1];
	const gap   = best.killRate - worst.killRate;

	return (
		<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
			<div className="flex items-center gap-3 mb-5">
				<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
					{t("damage.perm.resultTitle")}
				</span>
				<div className="flex-1 border-t border-[var(--border)]" />
				<span className="text-[10px] text-[var(--text-muted)]">
					{t("damage.perm.permCount").replace("{{n}}", String(results.length))}
				</span>
			</div>

			<div className="mb-5">
				<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-2">
					{t("damage.perm.best")}
				</p>
				<p className="text-xl font-black text-[var(--text)] tracking-widest mb-3">{best.order.join(" → ")}</p>
				<div className="grid grid-cols-2 gap-3">
					<div className="border border-[var(--border)] rounded-xl p-4 text-center bg-[var(--card-background)]">
						<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{t("damage.killRate")}</p>
						<p className={`text-4xl font-black leading-none ${killRateColor(best.killRate)}`}>{best.killRate.toFixed(1)}%</p>
						<p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{t("damage.killRateDesc")}</p>
					</div>
					<div className="border border-[var(--border)] rounded-xl p-4 text-center bg-[var(--card-background)]">
						<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{t("damage.expectedDmg")}</p>
						<p className="text-4xl font-black leading-none text-[var(--text)]">{best.meanClock.toFixed(2)}</p>
						<p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{t("damage.expectedDmgUnit")}</p>
					</div>
				</div>
				{results.length > 1 && gap > 0.05 && (
					<p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
						+{gap.toFixed(1)}% {t("damage.perm.vsWorst")}
					</p>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				{results.map((r, i) => {
					const isBest = i === 0;
					const diff   = r.killRate - best.killRate;
					return (
						<div key={r.order.join("→")}
							className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors
								${isBest ? "bg-[var(--text-muted)] border-[var(--text-muted)]" : "border-[var(--border)] bg-transparent hover:bg-[var(--card-background)]"}`}>
							<span className={`text-[10px] font-black w-4 text-center shrink-0 ${isBest ? "text-white/60" : "text-[var(--text-muted)]"}`}>{i + 1}</span>
							<span className={`text-sm font-bold font-mono tracking-wide flex-1 ${isBest ? "text-white" : "text-[var(--text)]"}`}>{r.order.join(" → ")}</span>
							<span className={`text-[11px] tabular-nums shrink-0 ${isBest ? "text-white/70" : "text-[var(--text-muted)]"}`}>{r.meanClock.toFixed(2)} {t("damage.unitCard")}</span>
							{!isBest && <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">{diff.toFixed(1)}%</span>}
							<span className={`text-base font-black tabular-nums shrink-0 ${isBest ? "text-white" : killRateColor(r.killRate)}`}>{r.killRate.toFixed(1)}%</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

PermutationResultPanel.propTypes = {
	results: PropTypes.arrayOf(PropTypes.shape({ order: PropTypes.array, killRate: PropTypes.number, meanClock: PropTypes.number })),
	t:       PropTypes.func.isRequired,
};

// ── SingleResultPanel ──────────────────────────────────────────────────────────

function SingleResultPanel({ result, killRate, t }) {
	const killColor = killRate >= 50 ? "text-green-600" : killRate >= 20 ? "text-orange-500" : "text-red-500";
	return (
		<div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
			<p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-4">{t("damage.result")}</p>
			<div className="grid grid-cols-2 gap-3 mb-4">
				<div className="border border-[var(--border)] rounded-xl p-4 text-center bg-[var(--card-background)]">
					<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{t("damage.killRate")}</p>
					<p className={`text-5xl font-black leading-none ${killColor}`}>{killRate.toFixed(1)}%</p>
					<p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{t("damage.killRateDesc")}</p>
				</div>
				<div className="border border-[var(--border)] rounded-xl p-4 text-center bg-[var(--card-background)]">
					<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-2">{t("damage.expectedDmg")}</p>
					<p className="text-5xl font-black leading-none text-[var(--text)]">{result.total.mean.toFixed(2)}</p>
					<p className="text-[10px] text-[var(--text-muted)] mt-2 leading-snug">{t("damage.expectedDmgUnit")}</p>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3 mb-4">
				{[
					{ label: t("damage.avgRefresh"), value: result.refresh.mean.toFixed(2) + " " + t("damage.unitTimes") },
					{ label: t("damage.avgLevelUp"), value: result.levelUp.mean.toFixed(2) + " " + t("damage.unitTimes") },
				].map(({ label, value }) => (
					<div key={label} className="border border-[var(--border)] rounded-xl p-3 text-center bg-[var(--card-background)]">
						<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-muted)] mb-1">{label}</p>
						<p className="text-base font-bold text-[var(--text)]">{value}</p>
					</div>
				))}
			</div>
			<DistributionSection total={result.total} t={t} />
		</div>
	);
}
SingleResultPanel.propTypes = { result: PropTypes.object.isRequired, killRate: PropTypes.number.isRequired, t: PropTypes.func.isRequired };

// ── StepCard ───────────────────────────────────────────────────────────────────

const numOrVar   = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);
const stepShape  = PropTypes.shape({
	id: PropTypes.number, type: PropTypes.string,
	n: numOrVar, m: numOrVar, y: numOrVar, times: numOrVar,
	dmg: numOrVar, perClimax: numOrVar, triggerRate: PropTypes.number, bonusDmg: numOrVar,
});

function StepCard({ step, idx, total, onUpdate, onRemove, onMove, onDuplicate, sd, stepTypes, variables = [] }) {
	const cfg = stepTypes?.find(t => t.id === step.type);

	const SI = (field, props = {}) => (
		<StepInput value={step[field] ?? 1} onChange={v => onUpdate(step.id, field, v)} variables={variables} {...props} />
	);

	return (
		<div className="border border-[var(--border)] rounded-xl bg-[var(--card-background)] px-3 py-3">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-black text-[var(--text-muted)] w-4 text-center shrink-0">{idx + 1}</span>
					<span style={{ backgroundColor: cfg?.badgeColor ?? "#52675a" }}
						className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white">{cfg?.label}</span>
				</div>
				<div className="flex items-center">
					<button onClick={() => onMove(idx, -1)} disabled={idx === 0}
						className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-25 transition-colors"><ChevronUp size={13} /></button>
					<button onClick={() => onMove(idx, 1)} disabled={idx === total - 1}
						className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-25 transition-colors"><ChevronDown size={13} /></button>
					<button onClick={() => onDuplicate(step.id)}
						className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"><Copy size={13} /></button>
					<button onClick={() => onRemove(step.id)}
						className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5 pl-6">

				{/* 直接伤害 */}
				{step.type === "direct" && (
					<Row><Lbl>{sd("dealDmg")}</Lbl>{SI("n")}<L>{sd("pts")}</L></Row>
				)}

				{/* 取消追加 */}
				{step.type === "cancel" && (<>
					<Row><Lbl>{sd("mainDmg")}</Lbl>{SI("n")}<L>{sd("pts")}</L></Row>
					<Row><Lbl>{sd("cancelThen")}</Lbl>{SI("m")}<L>{sd("pts")}</L>
						<L>×</L><StepInput value={step.times ?? 1} onChange={v => onUpdate(step.id, "times", v)} max={8} variables={variables} /><L>{sd("times")}</L>
					</Row>
				</>)}

				{/* 看X顶送潮入墓 */}
				{step.type === "top_remove_cx" && (<>
					<Row><Lbl>{sd("lookTop")}</Lbl>{SI("n", { max: 15 })}<L>{sd("cards")}</L></Row>
					<Sub>{sd("sendCxToGrave")}</Sub>
				</>)}

				{/* 翻底潮数单伤 */}
				{step.type === "bottom_flip_count" && (<>
					<Row><Lbl>{sd("flipBottom")}</Lbl>{SI("n", { max: 15 })}<L>{sd("cards")}</L></Row>
					<Sub>{sd("singleCxDmg")}</Sub>
				</>)}

				{/* 翻底有潮打X */}
				{step.type === "bottom_flip_any" && (<>
					<Row><Lbl>{sd("flipBottom")}</Lbl>{SI("n", { max: 15 })}<L>{sd("cards")}</L></Row>
					<Row><Lbl>{sd("ifCx")}</Lbl>{SI("dmg")}<L>{sd("dmgPts")}</L></Row>
				</>)}

				{/* 洗X非潮回卡组 */}
				{step.type === "return_cx" && (<>
					<Row><Lbl>{sd("fromGrave")}</Lbl>{SI("n", { max: 8 })}<L>{sd("backToDeck")}</L></Row>
					<Sub>{sd("takeFull")}</Sub>
				</>)}

				{/* 取消后X洗回卡组 */}
				{step.type === "cancel_return" && (<>
					<Row><Lbl>{sd("mainDmg")}</Lbl>{SI("n")}<L>{sd("pts")}</L></Row>
					<Row><Lbl>{sd("returnNonCx")}</Lbl>{SI("y", { max: 20 })}<L>{sd("notEnough")}</L></Row>
					<Sub>{sd("takeFull")}</Sub>
				</>)}

				{/* 翻底X潮次伤害 */}
				{step.type === "bottom_flip" && (<>
					<Row><Lbl>{sd("flipBottom")}</Lbl>{SI("n", { max: 15 })}<L>{sd("cards")}</L></Row>
					<Row><Lbl>{sd("every")}</Lbl>
						<StepInput value={step.perClimax ?? 1} onChange={v => onUpdate(step.id, "perClimax", v)} max={typeof step.n === "number" ? step.n : 15} variables={variables} />
						<L>{sd("perCx")}</L>
					</Row>
					<Row><Lbl>{sd("dealDmg")}</Lbl>{SI("dmg")}<L>{sd("dmgPts")}</L>
						<L>×</L><StepInput value={step.times ?? 1} onChange={v => onUpdate(step.id, "times", v)} max={8} variables={variables} /><L>{sd("times")}</L>
					</Row>
				</>)}

				{/* 攻击 */}
				{step.type === "attack" && (<>
					<Row><Lbl>{sd("baseDmg")}</Lbl>{SI("n")}<L>{sd("pts")}</L></Row>
					<Row><Lbl>{sd("triggerRate")}</Lbl>
						<StepInput value={step.triggerRate ?? 50} onChange={v => onUpdate(step.id, "triggerRate", v)} min={1} max={100} variables={variables} />
						<L>{sd("triggerBonus")}</L>
					</Row>
					<Row><Lbl>{sd("triggerThen")}</Lbl>{SI("bonusDmg")}<L>{sd("pts")}</L></Row>
				</>)}

			</div>
		</div>
	);
}

StepCard.propTypes = {
	step: stepShape.isRequired, idx: PropTypes.number.isRequired, total: PropTypes.number.isRequired,
	onUpdate: PropTypes.func.isRequired, onRemove: PropTypes.func.isRequired,
	onMove: PropTypes.func.isRequired, onDuplicate: PropTypes.func.isRequired,
	sd: PropTypes.func, stepTypes: PropTypes.array, variables: PropTypes.arrayOf(PropTypes.string),
};

// ── Layout helpers ─────────────────────────────────────────────────────────────

// ── StateField — compact label + input cell for opponent state grid ───────────
function StateField({ label, value, onChange, min = 0, max = 99, unit, variables = [] }) {
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-[9px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
				{label}
			</p>
			<div className="flex items-center gap-1.5">
				<NumInput value={value} onChange={onChange} min={min} max={max} variables={variables} />
				{unit && <span className="text-xs text-[var(--text-muted)] shrink-0">{unit}</span>}
			</div>
		</div>
	);
}
StateField.propTypes = {
	label:     PropTypes.string.isRequired,
	value:     PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	onChange:  PropTypes.func.isRequired,
	min:       PropTypes.number,
	max:       PropTypes.number,
	unit:      PropTypes.string,
	variables: PropTypes.arrayOf(PropTypes.string),
};

function Row({ children }) { return <div className="flex items-center gap-1.5">{children}</div>; }
Row.propTypes = { children: PropTypes.node };

// Muted unit text (张, 点, 次…)
function L({ children }) { return <span className="text-xs text-[var(--text-muted)]">{children}</span>; }
L.propTypes = { children: PropTypes.node };

// Row-leading label (主伤, 造成, 触发率…)
function Lbl({ children }) { return <span className="text-xs text-[var(--text-secondary)] shrink-0">{children}</span>; }
Lbl.propTypes = { children: PropTypes.node };

// Static description line — replaces info-only rows
function Sub({ children }) { return <p className="text-[10px] text-[var(--text-muted)] leading-snug">{children}</p>; }
Sub.propTypes = { children: PropTypes.node };

function NumInput({ value, onChange, min = 0, max = 99, variables = [] }) {
	const isVar = typeof value === "string";
	const [draft, setDraft] = useState(isVar ? "" : String(value));

	useEffect(() => { if (!isVar) setDraft(String(value)); }, [value, isVar]);

	const commit = (raw) => {
		const n = parseInt(raw, 10);
		const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n));
		setDraft(String(clamped));
		if (clamped !== value) onChange(clamped);
	};

	// No variables — return plain input, same as before
	if (variables.length === 0 && !isVar) {
		return (
			<input
				type="text"
				inputMode="numeric"
				value={draft}
				onChange={e => setDraft(e.target.value)}
				onBlur={e => commit(e.target.value)}
				onKeyDown={e => { if (e.key === "Enter") commit(e.target.value); }}
				className="w-full border border-solid border-[var(--border)] rounded-lg px-2 py-1.5
				           text-sm text-[var(--text)] bg-transparent focus:outline-none
				           focus:border-[var(--text-muted)] transition-colors text-center"
			/>
		);
	}

	return (
		<div className="flex items-center gap-1 flex-1 min-w-0">
			{!isVar ? (
				<input
					type="text"
					inputMode="numeric"
					value={draft}
					onChange={e => setDraft(e.target.value)}
					onBlur={e => commit(e.target.value)}
					onKeyDown={e => { if (e.key === "Enter") commit(e.target.value); }}
					className="flex-1 min-w-0 border border-solid border-[var(--border)] rounded-lg px-2 py-1.5
					           text-sm text-[var(--text)] bg-transparent focus:outline-none
					           focus:border-[var(--text-muted)] transition-colors text-center"
				/>
			) : (
				<div className="flex-1 min-w-0 text-center text-sm font-black rounded-lg px-2 py-1.5"
					style={{ backgroundColor: "var(--text-muted)", color: "white" }}>
					{value}
				</div>
			)}
			{variables.length > 0 && (
				<VarDropdown
					selected={isVar ? value : null}
					variables={variables}
					onSelect={(name) => name ? onChange(name) : onChange(min)}
				/>
			)}
		</div>
	);
}
NumInput.propTypes = {
	value:     PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	onChange:  PropTypes.func,
	min:       PropTypes.number,
	max:       PropTypes.number,
	variables: PropTypes.arrayOf(PropTypes.string),
};

// ── VarDropdown — 变量选择下拉菜单 ────────────────────────────────────────────

// VarDropdown renders its panel via createPortal to escape backdrop-filter / overflow-hidden
// stacking contexts in GroupPanel — otherwise the popup gets clipped or z-index-isolated.
function VarDropdown({ selected, variables, onSelect }) {
	const [open, setOpen]       = useState(false);
	const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
	const triggerRef = useRef(null);
	const panelRef   = useRef(null);

	const handleToggle = () => {
		if (!open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setDropPos({ top: rect.bottom + 4, left: rect.left });
		}
		setOpen(o => !o);
	};

	useEffect(() => {
		if (!open) return;
		const handler = (e) => {
			if (!triggerRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	return (
		<div className="relative inline-block">
			{/* Trigger button */}
			<button ref={triggerRef} type="button" onClick={handleToggle}
				className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md border transition-colors leading-none
					${selected
						? "bg-[var(--text-muted)] text-white border-[var(--text-muted)]"
						: "text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]"
					}`}>
				{selected ?? "fx"}
				<ChevronDown size={7} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
			</button>

			{/* Panel — portaled to body to escape overflow-hidden / backdrop-filter stacking contexts */}
			{open && createPortal(
				<div ref={panelRef}
					style={{ position: "fixed", top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
					className="bg-white border border-[var(--border)] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[44px]">
					{/* 取消变量 */}
					<button type="button" onClick={() => { onSelect(null); setOpen(false); }}
						className={`text-[10px] font-bold px-2 py-1 rounded-lg text-center transition-colors
							${!selected
								? "bg-[var(--text-muted)] text-white"
								: "text-[var(--text-muted)] hover:bg-[var(--card-background)]"
							}`}>
						—
					</button>
					{/* 变量列表 */}
					{variables.map(name => (
						<button key={name} type="button" onClick={() => { onSelect(name); setOpen(false); }}
							className={`text-[10px] font-black px-2 py-1 rounded-lg text-center transition-colors
								${selected === name
									? "bg-[var(--text-muted)] text-white"
									: "text-[var(--text)] hover:bg-[var(--card-background)]"
								}`}>
							{name}
						</button>
					))}
				</div>,
				document.body
			)}
		</div>
	);
}
VarDropdown.propTypes = {
	selected:  PropTypes.string,
	variables: PropTypes.arrayOf(PropTypes.string).isRequired,
	onSelect:  PropTypes.func.isRequired,
};

function StepInput({ value, onChange, min = 1, max = 20, variables = [] }) {
	const isVar = typeof value === "string";
	const [draft, setDraft] = useState(isVar ? "" : String(value));

	useEffect(() => { if (!isVar) setDraft(String(value)); }, [value, isVar]);

	const commit = (raw) => {
		const n       = parseInt(raw, 10);
		const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n));
		setDraft(String(clamped));
		if (clamped !== value) onChange(clamped);
	};

	return (
		<div className="inline-flex items-center gap-1">
			{/* 数字步进器 — 变量激活时隐藏 */}
			{!isVar && (
				<div className="inline-flex items-center border border-solid border-[var(--border)] rounded-md overflow-hidden">
					<button type="button" onClick={() => onChange(Math.max(min, Number(value) - 1))} disabled={Number(value) <= min}
						className="px-1.5 py-1 text-[var(--text-muted)] hover:bg-[var(--card-background)] hover:text-[var(--text)] transition-colors disabled:opacity-30 text-xs leading-none select-none">
						−
					</button>
					<input type="text" inputMode="numeric" value={draft}
						onChange={e => setDraft(e.target.value)}
						onBlur={e => commit(e.target.value)}
						onKeyDown={e => { if (e.key === "Enter") commit(e.target.value); }}
						className="w-8 text-xs text-[var(--text)] bg-transparent focus:outline-none text-center border-x border-[var(--border)] py-1" />
					<button type="button" onClick={() => onChange(Math.min(max, Number(value) + 1))} disabled={Number(value) >= max}
						className="px-1.5 py-1 text-[var(--text-muted)] hover:bg-[var(--card-background)] hover:text-[var(--text)] transition-colors disabled:opacity-30 text-xs leading-none select-none">
						+
					</button>
				</div>
			)}

			{/* 变量下拉菜单 — 仅在变量模式下可用时显示 */}
			{variables.length > 0 && (
				<VarDropdown
					selected={isVar ? value : null}
					variables={variables}
					onSelect={(name) => name ? onChange(name) : onChange(min)}
				/>
			)}
		</div>
	);
}
StepInput.propTypes = {
	value:     PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	onChange:  PropTypes.func,
	min:       PropTypes.number,
	max:       PropTypes.number,
	variables: PropTypes.arrayOf(PropTypes.string),
};

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ progress }) {
	return (
		<div className="mb-4">
			<div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
				<div
					className="h-full bg-[var(--text-muted)] rounded-full transition-[width] duration-200 ease-out"
					style={{ width: `${progress}%` }}
				/>
			</div>
			<p className="text-[10px] text-[var(--text-muted)] text-right mt-1 tabular-nums">
				{progress}%
			</p>
		</div>
	);
}
ProgressBar.propTypes = { progress: PropTypes.number.isRequired };

// ── DistributionSection ────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = new Set([7, 14, 21]);

function DistributionSection({ total, t }) {
	const max  = total.max;
	const data = Array.from({ length: max + 1 }, (_, k) => ({ k, p: total.distribution[k] ?? 0 }));
	const maxP = Math.max(...data.map(d => d.p), 0.001);
	const BAR_W = 18, CHART_H = 80, LABEL_H = 14;

	return (
		<div className="border-t border-[var(--border)] pt-4 mt-2">
			<div className="flex items-center gap-3 mb-4">
				<span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">{t("damage.distribution")}</span>
				<div className="flex-1 border-t border-[var(--border)]" />
			</div>
			<div className="overflow-x-auto mb-4">
				<svg width={data.length * BAR_W} height={CHART_H + LABEL_H} className="block">
					{data.map(({ k, p }, i) => {
						const barH = Math.max((p / maxP) * CHART_H, p > 0 ? 1 : 0);
						const x    = i * BAR_W;
						const isT  = LEVEL_THRESHOLDS.has(k);
						return (
							<g key={k}>
								<rect x={x + 1} y={CHART_H - barH} width={BAR_W - 2} height={barH} rx={2}
									style={{ fill: isT ? "var(--text-secondary)" : "var(--primary)" }} />
								<text x={x + BAR_W / 2} y={CHART_H + LABEL_H - 1} textAnchor="middle" fontSize="7"
									style={{ fill: "var(--text-muted)", fontFamily: "inherit" }}>{k}</text>
							</g>
						);
					})}
				</svg>
			</div>
			<div className="grid grid-cols-3 sm:grid-cols-4 gap-x-1 gap-y-0.5">
				{data.map(({ k, p }) => {
					const isT = LEVEL_THRESHOLDS.has(k);
					return (
						<div key={k} className={`flex items-center justify-between px-2 py-0.5 rounded text-[11px] ${isT ? "bg-[var(--text-muted)] text-white font-bold" : "text-[var(--text)]"}`}>
							<span>{t("damage.nCards").replace("{{n}}", String(k))}</span>
							<span>{(p * 100).toFixed(1)}%</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
DistributionSection.propTypes = {
	total: PropTypes.shape({ max: PropTypes.number, distribution: PropTypes.object }),
	t:     PropTypes.func.isRequired,
};
