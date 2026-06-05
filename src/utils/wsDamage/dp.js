// WS Damage — Dynamic Programming optimal attack policy
// State: (d, c, r, rc, cl, lv, budget)
//   d  = deck size
//   c  = climaxes in deck
//   r  = rest pile size
//   rc = climaxes in rest pile
//   cl = clock cards (0-6)
//   lv = current level (0-3; 4 = loss)
//   budget = remaining attacks

// ── Math helpers ─────────────────────────────────────────────────────────────

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return r;
}

// P(n-point attack hits | deck d/c)
function pHit(d, c, n) {
  if (n <= 0 || d <= 0 || n > d - c) return 0;
  return comb(d - c, n) / comb(d, n);
}

// {k, p}: first climax at position k, probability p
function cancelBranches(d, c, n) {
  const out = [];
  for (let k = 1; k <= n; k++) {
    if (k - 1 > d - c) break;
    let p = 1;
    for (let i = 0; i < k - 1; i++) p *= (d - c - i) / (d - i);
    p *= c / (d - (k - 1));
    if (p > 1e-14) out.push({ k, p });
  }
  return out;
}

// P(exactly k climaxes in n draws from deck d/c) — hypergeometric
function hypergeo(d, c, n, k) {
  if (k < 0 || k > Math.min(n, c)) return 0;
  if (n - k > d - c) return 0;
  return comb(c, k) * comb(d - c, n - k) / comb(d, n);
}

// Apply level-up chain after cl increases. Returns updated {cl, lv, r}.
// Assumes clock cards leaving are all non-climax: 1 → level zone, 6 → rest.
function applyLevelUp(cl, lv, r) {
  while (cl >= 7 && lv < 4) {
    lv += 1;
    cl -= 7;
    r  += 6;
  }
  return { cl, lv, r };
}

// ── Shared DP transition primitives ──────────────────────────────────────────

/**
 * Evaluate a DAMAGE(n) operation from (d,c,r,rc,cl,lv), then call continueFn
 * with the post-operation state. Returns expected kill probability.
 */
function evalDamageOp(n, d, c, r, rc, cl, lv, continueFn) {
  let prob = 0;

  // Hit branch
  const ph = pHit(d, c, n);
  if (ph > 0) {
    const applied = applyLevelUp(cl + n, lv, r);
    if (applied.lv >= 4) prob += ph;
    else prob += ph * continueFn(d - n, c, applied.r, rc, applied.cl, applied.lv);
  }

  // Cancel branches
  for (const { k, p } of cancelBranches(d, c, n)) {
    // k cards revealed (k-1 non-CX + 1 CX) → all to rest
    prob += p * continueFn(d - k, c - 1, r + k, rc + 1, cl, lv);
  }

  return prob;
}

/**
 * Evaluate `times` sequential DAMAGE(m) follow-ups, then call continueFn.
 * Used for cancel follow-up chains (onCancel: [DAMAGE(m)] × times).
 */
function evalFollowUps(m, times, d, c, r, rc, cl, lv, continueFn) {
  if (times <= 0) return continueFn(d, c, r, rc, cl, lv);
  return evalDamageOp(m, d, c, r, rc, cl, lv,
    (d2, c2, r2, rc2, cl2, lv2) =>
      evalFollowUps(m, times - 1, d2, c2, r2, rc2, cl2, lv2, continueFn)
  );
}

// ── Step-type evaluators ──────────────────────────────────────────────────────

/**
 * Evaluate one step of type `spec.type` with free parameter n,
 * then call continueFn(d, c, r, rc, cl, lv) for subsequent steps.
 *
 * Supported types:
 *   direct          — DAMAGE(n)
 *   cancel          — DAMAGE(n, onCancel: DAMAGE(m) × times)
 *   top_remove_cx   — reveal top n, send CX to rest, return non-CX
 *   return_cx       — move min(n, r-rc) non-CX from rest to deck (shuffle)
 *   attack          — DAMAGE(n + bonusDmg) with prob triggerRate, else DAMAGE(n)
 */
function evalStepType(spec, n, d, c, r, rc, cl, lv, continueFn) {
  if (lv >= 4) return 1.0;

  switch (spec.type) {

    case 'direct':
      return evalDamageOp(n, d, c, r, rc, cl, lv, continueFn);

    case 'cancel': {
      const m     = spec.m     ?? 1;
      const times = spec.times ?? 1;
      let prob = 0;

      // Hit branch: same as direct damage
      const ph = pHit(d, c, n);
      if (ph > 0) {
        const applied = applyLevelUp(cl + n, lv, r);
        if (applied.lv >= 4) prob += ph;
        else prob += ph * continueFn(d - n, c, applied.r, rc, applied.cl, applied.lv);
      }

      // Cancel at k: execute m-point follow-up × times, then continue
      for (const { k, p } of cancelBranches(d, c, n)) {
        const d2 = d - k, c2 = c - 1, r2 = r + k, rc2 = rc + 1;
        prob += p * evalFollowUps(m, times, d2, c2, r2, rc2, cl, lv, continueFn);
      }

      return prob;
    }

    case 'top_remove_cx': {
      // Reveal top n cards; CX → rest; non-CX → back to deck (order preserved).
      // For DP state purposes: deck shrinks by k CX, rest gains k CX.
      // Net deck size is unchanged (non-CX cards return); CX count drops by k.
      if (n <= 0 || d <= 0) return continueFn(d, c, r, rc, cl, lv);

      const maxK = Math.min(n, c, d);
      let prob   = 0;

      for (let k = 0; k <= maxK; k++) {
        const ph = hypergeo(d, c, n, k);
        if (ph < 1e-14) continue;
        // k CX leave deck → rest; (n-k) non-CX stay in deck
        prob += ph * continueFn(d, c - k, r + k, rc + k, cl, lv);
      }

      return prob;
    }

    case 'return_cx': {
      // Move min(n, r-rc) non-CX cards from rest back to deck, then shuffle.
      // Deterministic: all non-CX cards are equivalent.
      const available = Math.max(0, r - rc);
      const moved     = Math.min(n, available);
      return continueFn(d + moved, c, r - moved, rc, cl, lv);
    }

    case 'attack': {
      // With probability p: DAMAGE(n + bonusDmg); else DAMAGE(n).
      const p        = Math.max(0, Math.min(1, (spec.triggerRate ?? 50) / 100));
      const bonusDmg = spec.bonusDmg ?? 1;

      const probTrigger   = evalDamageOp(n + bonusDmg, d, c, r, rc, cl, lv, continueFn);
      const probNoTrigger = evalDamageOp(n,             d, c, r, rc, cl, lv, continueFn);

      return p * probTrigger + (1 - p) * probNoTrigger;
    }

    case 'bottom_flip': {
      // MOVE(bottom n): flip n cards from deck bottom → all go to rest.
      // Count CX found (k). Triggers = floor(k / perClimax).
      // Each trigger fires `times` × DAMAGE(dmg).
      const perClimax = Math.max(1, spec.perClimax ?? 1);
      const dmg       = spec.dmg   ?? 1;
      const times     = spec.times ?? 1;
      const flipped   = Math.min(n, d); // can't flip more than deck has
      if (flipped <= 0) return continueFn(d, c, r, rc, cl, lv);

      let prob = 0;
      for (let k = 0; k <= Math.min(flipped, c); k++) {
        const ph = hypergeo(d, c, flipped, k);
        if (ph < 1e-14) continue;
        const d2 = d - flipped, c2 = c - k, r2 = r + flipped, rc2 = rc + k;
        const triggers = Math.floor(k / perClimax);
        if (triggers <= 0) {
          prob += ph * continueFn(d2, c2, r2, rc2, cl, lv);
        } else {
          // triggers × times sequential DAMAGE(dmg) ops
          prob += ph * evalFollowUps(dmg, triggers * times, d2, c2, r2, rc2, cl, lv, continueFn);
        }
      }
      return prob;
    }

    case 'bottom_flip_any': {
      // MOVE(bottom n): if ANY CX found → DAMAGE(dmg); else no damage.
      const dmg     = spec.dmg ?? 2;
      const flipped = Math.min(n, d);
      if (flipped <= 0) return continueFn(d, c, r, rc, cl, lv);

      let prob = 0;
      for (let k = 0; k <= Math.min(flipped, c); k++) {
        const ph = hypergeo(d, c, flipped, k);
        if (ph < 1e-14) continue;
        const d2 = d - flipped, c2 = c - k, r2 = r + flipped, rc2 = rc + k;
        if (k > 0) {
          prob += ph * evalDamageOp(dmg, d2, c2, r2, rc2, cl, lv, continueFn);
        } else {
          prob += ph * continueFn(d2, c2, r2, rc2, cl, lv);
        }
      }
      return prob;
    }

    case 'bottom_flip_count': {
      // MOVE(bottom n): VARIABLE_DAMAGE = number of CX found (k points of damage).
      // k=0 → no damage; k>0 → DAMAGE(k) (goes through cancel check).
      const flipped = Math.min(n, d);
      if (flipped <= 0) return continueFn(d, c, r, rc, cl, lv);

      let prob = 0;
      for (let k = 0; k <= Math.min(flipped, c); k++) {
        const ph = hypergeo(d, c, flipped, k);
        if (ph < 1e-14) continue;
        const d2 = d - flipped, c2 = c - k, r2 = r + flipped, rc2 = rc + k;
        if (k > 0) {
          prob += ph * evalDamageOp(k, d2, c2, r2, rc2, cl, lv, continueFn);
        } else {
          prob += ph * continueFn(d2, c2, r2, rc2, cl, lv);
        }
      }
      return prob;
    }

    case 'cancel_return': {
      // DAMAGE(n, onCancel: FX(y non-CX from rest → deck)).
      const y = spec.y ?? 3;
      let prob = 0;

      // Hit branch
      const ph = pHit(d, c, n);
      if (ph > 0) {
        const applied = applyLevelUp(cl + n, lv, r);
        if (applied.lv >= 4) prob += ph;
        else prob += ph * continueFn(d - n, c, applied.r, rc, applied.cl, applied.lv);
      }

      // Cancel at k: FX(y non-CX) from post-cancel rest, then continue
      for (const { k, p } of cancelBranches(d, c, n)) {
        const d2 = d - k, c2 = c - 1, r2 = r + k, rc2 = rc + 1;
        const moved = Math.min(y, Math.max(0, r2 - rc2));
        prob += p * continueFn(d2 + moved, c2, r2 - moved, rc2, cl, lv);
      }

      return prob;
    }

    default:
      return continueFn(d, c, r, rc, cl, lv);
  }
}

// ── buildPolicy — original single-step-type API (backward compat) ─────────────

/**
 * Compute optimal dynamic attack policy for `budget` direct-damage steps.
 *
 * @param {object} initial    { d, c, r, rc, cl, lv }
 * @param {number} maxBudget  number of attacks available
 * @param {number} maxN       max attack size to consider (default 15)
 */
export function buildPolicy(initial, maxBudget, maxN = 15) {
  const { d: d0, c: c0, r: r0, rc: rc0, cl: cl0, lv: lv0 } = initial;

  const V      = new Map();
  const policy = new Map();

  function key(d, c, r, rc, cl, lv, b) {
    return `${d}|${c}|${r}|${rc}|${cl}|${lv}|${b}`;
  }

  function dp(d, c, r, rc, cl, lv, b) {
    if (lv >= 4) return 1.0;
    if (b <= 0)  return 0.0;

    if (d === 0) {
      if (r === 0) return 0.0;
      const applied = applyLevelUp(cl + 1, lv, 0);
      if (applied.lv >= 4) return 1.0;
      return dp(r, rc, applied.r, 0, applied.cl, applied.lv, b);
    }

    const k = key(d, c, r, rc, cl, lv, b);
    if (V.has(k)) return V.get(k);
    V.set(k, 0);

    let best  = 0;
    let bestN = 1;
    const cap = Math.min(d, maxN);

    for (let n = 1; n <= cap; n++) {
      const prob = evalStepType(
        { type: 'direct' }, n, d, c, r, rc, cl, lv,
        (d2, c2, r2, rc2, cl2, lv2) => dp(d2, c2, r2, rc2, cl2, lv2, b - 1)
      );
      if (prob > best) { best = prob; bestN = n; }
    }

    V.set(k, best);
    policy.set(k, bestN);
    return best;
  }

  const optProb = dp(d0, c0, r0, rc0, cl0, lv0, maxBudget);

  return {
    optProb,
    stateCount: V.size,
    getOptimalN: (d, c, r, rc, cl, lv, b) =>
      policy.get(key(d, c, r, rc, cl, lv, b)) ?? 1,
    budgetSnapshot: Array.from({ length: maxBudget }, (_, i) => {
      const b = i + 1;
      return {
        budget:   b,
        optN:     policy.get(key(d0, c0, r0, rc0, cl0, lv0, b)) ?? 1,
        killRate: dp(d0, c0, r0, rc0, cl0, lv0, b),
      };
    }),
  };
}

// ── buildPolicySequence — multi-step-type API (Step 1 of variable-mode DP) ───

/**
 * Compute optimal dynamic policy for a fixed sequence of (possibly different)
 * step types, where each step's primary parameter `n` is optimised by DP.
 *
 * @param {object} initial    { d, c, r, rc, cl, lv }
 * @param {Array}  stepSpecs  ordered array of step specs, e.g.:
 *                   [{ type: 'direct' },
 *                    { type: 'cancel', m: 2, times: 1 },
 *                    { type: 'top_remove_cx' },
 *                    { type: 'return_cx' },
 *                    { type: 'attack', triggerRate: 50, bonusDmg: 1 }]
 * @param {number} maxN       max n to try per step (default 10)
 *
 * @returns {{ optProb, stateCount, getOptN(stepIdx, d, c, r, rc, cl, lv) }}
 */
export function buildPolicySequence(initial, stepSpecs, maxN = 10) {
  const { d: d0, c: c0, r: r0, rc: rc0, cl: cl0, lv: lv0 } = initial;
  const nSteps = stepSpecs.length;

  const V      = new Map();  // key → best prob
  const policy = new Map();  // key → best n

  function key(si, d, c, r, rc, cl, lv) {
    return `${si}|${d}|${c}|${r}|${rc}|${cl}|${lv}`;
  }

  function dp(si, d, c, r, rc, cl, lv) {
    if (lv >= 4)    return 1.0;
    if (si >= nSteps) return 0.0;

    // Auto-refresh when deck is empty (before executing current step)
    if (d === 0) {
      if (r === 0) return 0.0;
      const applied = applyLevelUp(cl + 1, lv, 0);
      if (applied.lv >= 4) return 1.0;
      return dp(si, r, rc, applied.r, 0, applied.cl, applied.lv);
    }

    const k = key(si, d, c, r, rc, cl, lv);
    if (V.has(k)) return V.get(k);
    V.set(k, 0);

    const spec = stepSpecs[si];
    let best  = 0;
    let bestN = 1;

    // spec.fixedN: a specific value to use (no optimisation); null = search nMin..nMax
    // spec.nMin / spec.nMax: per-step search bounds (fallback to global maxN)
    const nMin = spec.fixedN !== null && spec.fixedN !== undefined ? spec.fixedN : (spec.nMin ?? 1);
    const nMax = spec.fixedN !== null && spec.fixedN !== undefined ? spec.fixedN : Math.min(d, spec.nMax ?? maxN);

    for (let n = nMin; n <= nMax; n++) {
      const prob = evalStepType(
        spec, n, d, c, r, rc, cl, lv,
        (d2, c2, r2, rc2, cl2, lv2) => dp(si + 1, d2, c2, r2, rc2, cl2, lv2)
      );
      if (prob > best) { best = prob; bestN = n; }
    }

    V.set(k, best);
    policy.set(k, bestN);
    return best;
  }

  const optProb = dp(0, d0, c0, r0, rc0, cl0, lv0);

  return {
    optProb,
    stateCount: V.size,
    getOptN: (si, d, c, r, rc, cl, lv) =>
      policy.get(key(si, d, c, r, rc, cl, lv)) ?? 1,
  };
}
