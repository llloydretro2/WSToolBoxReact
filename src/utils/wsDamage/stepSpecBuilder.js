// stepSpecBuilder.js
// Converts DamageCalculator step objects → DP stepSpec objects for buildPolicySequence.
//
// The primary "n" field can be:
//   - A number  → fixedN: that number (DP uses it directly)
//   - "dp"      → fixedN: null (DP searches nMin..nMax at runtime — truly adaptive)
//   - "X"/"Y"   → fixedN: varValues["X"] — linked variable; value chosen by outer enumeration,
//                  same value used everywhere the variable appears
//
// All other parameters (m, dmg, times, y, triggerRate, bonusDmg) remain fixed.

// Special marker: step.n === DP_MARKER → DP freely optimises n.
export const DP_MARKER = "dp";

// Resolve the primary n field given current variable bindings.
// varValues: { X: 5, Y: 3, ... } — values chosen by the outer enumeration loop.
// Returns null   → DP optimises (adaptive)
// Returns number → fixed (either literal or bound variable value)
function resolveN(val, varValues = {}) {
  if (val === DP_MARKER) return null;                         // dp: let DP decide
  if (typeof val === 'number') return val;                    // literal fixed value
  if (typeof val === 'string' && varValues[val] !== undefined) // named variable
    return varValues[val];
  return null; // unknown → treat as dp
}

function resolveNum(val, fallback) {
  return typeof val === 'number' ? val : fallback;
}

/**
 * Convert a single step object (as stored in DamageCalculator state) to a DP spec.
 * The returned spec describes FIXED parameters; `n` is left for DP to optimise.
 */
// varValues: { X: 5, Y: 3 } — resolved by outer enumeration loop
export function stepToSpec(step, varValues = {}) {
  const fixedN = resolveN(step.n, varValues);
  // Per-step search bounds — only meaningful when fixedN is null (dp mode)
  const nMin = fixedN === null ? (step.nMin ?? 1)    : null;
  const nMax = fixedN === null ? (step.nMax ?? null) : null;

  switch (step.type) {

    case 'direct':
      return { type: 'direct', fixedN, nMin, nMax };

    case 'cancel':
      return {
        type: 'cancel', fixedN, nMin, nMax,
        m:     resolveNum(step.m,     1),
        times: resolveNum(step.times, 1),
      };

    case 'bottom_flip':
      return {
        type: 'bottom_flip', fixedN, nMin, nMax,
        perClimax: resolveNum(step.perClimax, 1),
        dmg:       resolveNum(step.dmg,       1),
        times:     resolveNum(step.times,     1),
      };

    case 'bottom_flip_any':
      return { type: 'bottom_flip_any', fixedN, nMin, nMax, dmg: resolveNum(step.dmg, 2) };

    case 'bottom_flip_count':
      return { type: 'bottom_flip_count', fixedN, nMin, nMax };

    case 'top_remove_cx':
      return { type: 'top_remove_cx', fixedN, nMin, nMax };

    case 'cancel_return':
      return { type: 'cancel_return', fixedN, nMin, nMax, y: resolveNum(step.y, 3) };

    case 'return_cx':
      return { type: 'return_cx', fixedN, nMin, nMax };

    case 'attack':
      return {
        type: 'attack', fixedN, nMin, nMax,
        triggerRate: resolveNum(step.triggerRate, 50),
        bonusDmg:    resolveNum(step.bonusDmg,    1),
      };

    default:
      return { type: 'direct', fixedN, nMin, nMax };
  }
}

/**
 * Convert an array of step objects (one group) to a flat spec array.
 */
export function stepsToSpecs(steps, varValues = {}) {
  return steps.map(s => stepToSpec(s, varValues));
}

/**
 * Convert groups in a given permutation order to a flat spec sequence.
 * varValues: current variable bindings from the outer enumeration loop.
 *
 * @param {Array} groups    array of group objects { id, steps }
 * @param {Array} perm      array of group indices, e.g. [2, 0, 1]
 * @param {object} varValues e.g. { X: 5, Y: 3 }
 */
export function groupsToSpecSequence(groups, perm, varValues = {}) {
  return perm.flatMap(gi => stepsToSpecs(groups[gi].steps, varValues));
}

/**
 * Build a parallel label array for each step in the sequence.
 * Each entry: { groupLabel, stepType } — used by InteractiveSession to show
 * which group and step type the current recommendation applies to.
 */
export function groupsToLabelSequence(groups, perm) {
  return perm.flatMap(gi =>
    groups[gi].steps.map(s => ({ groupLabel: groups[gi].label, stepType: s.type }))
  );
}

/**
 * Check whether a spec sequence contains any DP-optimisable steps.
 * (Steps with no variable parameters are still optimisable — DP picks optimal n.)
 * Returns false only if the sequence is empty.
 */
export function isOptimisable(specSequence) {
  return specSequence.length > 0;
}
