// WS Damage Simulator — Simulation Loop & Analysis

import { createState } from './state.js';
import { executeSequence } from './executor.js';
import { checkLoss } from './rules.js';

// ── Main Simulation Loop ──────────────────────────────────────────────────────

/**
 * Run a Monte Carlo simulation.
 *
 * input: {
 *   sequence: Operation[],
 *   initial:  { deck, rest?, clock?, level?, stock?, memory?, hand? },
 *   config?:  { trials, levelUpChooser, stopOnLoss }
 * }
 */
export function simulate(input) {
  const { sequence, initial, config: rawConfig = {} } = input;

  const config = {
    trials:          rawConfig.trials          ?? 100_000,
    levelUpChooser:  rawConfig.levelUpChooser  ?? 'optimal',
    stopOnLoss:      rawConfig.stopOnLoss      ?? true,
  };

  const clockDamageArr = new Int16Array(config.trials);
  const trueDamageArr  = new Int16Array(config.trials);
  const totalDamageArr = new Int16Array(config.trials);
  const refreshArr     = new Int16Array(config.trials);
  const levelUpArr     = new Int16Array(config.trials);
  const endReasons     = [];

  for (let t = 0; t < config.trials; t++) {
    const state = createState(initial);

    executeSequence(sequence, state, config);

    // Final loss check
    checkLoss(state);

    clockDamageArr[t] = state.stats.clockDamage;
    trueDamageArr[t]  = state.stats.trueDamage;
    totalDamageArr[t] = state.stats.clockDamage + state.stats.trueDamage;
    refreshArr[t]     = state.stats.refreshCount;
    levelUpArr[t]     = state.stats.levelUpCount;
    endReasons.push(state.endReason ?? 'completed');
  }

  return analyzeResults({
    clockDamage: clockDamageArr,
    trueDamage:  trueDamageArr,
    total:       totalDamageArr,
    refresh:     refreshArr,
    levelUp:     levelUpArr,
    endReasons,
    trials:      config.trials,
  });
}

// ── Result Analysis ───────────────────────────────────────────────────────────

function analyzeResults({ clockDamage, trueDamage, total, refresh, levelUp, endReasons, trials }) {
  return {
    // Per-source damage analysis
    clockDamage:  analyzeArray(clockDamage, trials),
    trueDamage:   analyzeArray(trueDamage, trials),
    total:        analyzeArray(total, trials),
    refresh:      analyzeArray(refresh, trials),
    levelUp:      analyzeArray(levelUp, trials),

    // End reason breakdown
    endReasonCounts: countEndReasons(endReasons),
    lossRate: endReasons.filter(r => r === 'level_4').length / trials,

    trials,
  };
}

function analyzeArray(arr, trials) {
  let sum = 0, min = Infinity, max = -Infinity;
  const freq = {};

  for (let i = 0; i < trials; i++) {
    const v = arr[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    freq[v] = (freq[v] ?? 0) + 1;
  }

  const mean = sum / trials;

  // Variance
  let variance = 0;
  for (let i = 0; i < trials; i++) {
    variance += (arr[i] - mean) ** 2;
  }
  const stdDev = Math.sqrt(variance / trials);

  // Distributions
  const distribution = {};   // exact: P(X = k)
  const probAtLeast  = {};   // P(X >= k)  — filled for every integer min..max
  const probAtMost   = {};   // P(X <= k)  — filled for every integer min..max

  for (const [k, cnt] of Object.entries(freq)) {
    distribution[k] = cnt / trials;
  }

  // Fill probAtLeast and probAtMost for ALL integers from min to max.
  // This ensures P(X >= k) is defined even when k never appears in results
  // (e.g. damage is binary 0 or 2, so freq[1] is absent but P(X>=1) = P(X>=2)).
  let cumAbove = 1;
  let cumBelow = 0;
  for (let k = min; k <= max; k++) {
    probAtLeast[k] = cumAbove;
    probAtMost[k]  = cumBelow + (freq[k] ?? 0) / trials;
    cumAbove -= (freq[k] ?? 0) / trials;
    cumBelow += (freq[k] ?? 0) / trials;
  }

  // Median
  const sorted = [...arr].sort((a, b) => a - b);
  const median = trials % 2 === 0
    ? (sorted[trials / 2 - 1] + sorted[trials / 2]) / 2
    : sorted[Math.floor(trials / 2)];

  // Mode
  const mode = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0);

  return { mean, median, mode, min, max, stdDev, distribution, probAtLeast, probAtMost };
}

function countEndReasons(reasons) {
  const counts = {};
  for (const r of reasons) counts[r] = (counts[r] ?? 0) + 1;
  return counts;
}

// ── Analytical Baseline (for validation) ─────────────────────────────────────

/**
 * Exact probability that N damage is NOT cancelled.
 * P = ∏_{k=0}^{N-1} (D - C - k) / (D - k)
 * D = deck size, C = climax count in deck
 */
export function analyticalNoCancel(D, C, N) {
  if (N <= 0) return 1;
  if (C >= D) return 0;
  if (N > D - C) return 0;

  let p = 1;
  for (let k = 0; k < N; k++) {
    p *= (D - C - k) / (D - k);
  }
  return p;
}

/**
 * Expected clock damage from N points in a single damage process.
 */
export function analyticalExpectedDamage(D, C, N) {
  return N * analyticalNoCancel(D, C, N);
}
