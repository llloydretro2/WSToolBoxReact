/* eslint-env node */
/* global process */
// WS Damage Simulator — Engine Validation Tests
// Run: node src/utils/wsDamage/test-engine.js

import {
  simulate, analyticalNoCancel, analyticalExpectedDamage,
  makeClimax, makeCharacter, buildSimpleDeck,
  OpType, ZoneId, CardType, Color,
} from './index.js';

// ── Test Helpers ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function expect(description, got, expected, tolerance = 0.01) {
  const diff = Math.abs(got - expected);
  const ok   = diff <= tolerance;
  if (ok) {
    console.log(`  ✅ ${description} — got ${got.toFixed(4)}, expected ${expected.toFixed(4)}`);
    passed++;
  } else {
    console.error(`  ❌ ${description} — got ${got.toFixed(4)}, expected ${expected.toFixed(4)} (diff ${diff.toFixed(4)})`);
    failed++;
  }
}

function expectBool(description, got, expected) {
  if (got === expected) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description} — got ${got}, expected ${expected}`);
    failed++;
  }
}

// Standard deck: 50 cards, 8 climax
function _standardDeck() {
  return buildSimpleDeck({ characters: 34, events: 8, climaxes: 8 });
}

function mkDeck(total, climax) {
  return buildSimpleDeck({ characters: total - climax, climaxes: climax });
}

const TRIALS = 200_000;
const TOL    = 0.008;  // ±0.8% tolerance at 200k trials

// ── Test Suite ────────────────────────────────────────────────────────────────

console.log('\n=== WS Damage Engine Tests ===\n');

// ── 1. Analytical Baseline ────────────────────────────────────────────────────
console.log('1. Analytical baseline (no simulation)');
{
  // P(1 damage no cancel) for 50 card deck, 8 climax = 42/50 = 0.84
  expect('P(1 damage, D=50 C=8)', analyticalNoCancel(50, 8, 1), 42/50, 0.0001);

  // P(2 damage no cancel) = (42*41)/(50*49)
  expect('P(2 damage, D=50 C=8)', analyticalNoCancel(50, 8, 2), (42*41)/(50*49), 0.0001);

  // P(3 damage no cancel) = (42*41*40)/(50*49*48)
  expect('P(3 damage, D=50 C=8)', analyticalNoCancel(50, 8, 3), (42*41*40)/(50*49*48), 0.0001);

  // Edge: N > D-C → 0
  expect('P(n > non-climax count)', analyticalNoCancel(10, 8, 4), 0, 0.0001);

  // Edge: D = 1, C = 0, N = 1 → 1.0
  expect('P(D=1 C=0 N=1)', analyticalNoCancel(1, 0, 1), 1.0, 0.0001);

  // Edge: D = 1, C = 1, N = 1 → 0.0
  expect('P(D=1 C=1 N=1)', analyticalNoCancel(1, 1, 1), 0.0, 0.0001);
}

// ── 2. Single Damage — Simulation vs Analytical ───────────────────────────────
console.log('\n2. Single damage — simulation vs analytical');
{
  const deck = mkDeck(50, 8);

  for (const n of [1, 2, 3, 4]) {
    const analytical = analyticalNoCancel(50, 8, n);
    const result = simulate({
      sequence: [{ type: OpType.DAMAGE, n }],
      initial:  { deck },
      config:   { trials: TRIALS },
    });
    const simProb = result.clockDamage.probAtLeast[n] ?? 0;
    expect(`P(${n} dmg hits, D=50 C=8)`, simProb, analytical, TOL);
  }
}

// ── 3. Expected Damage ────────────────────────────────────────────────────────
console.log('\n3. Expected damage');
{
  const deck = mkDeck(50, 8);

  for (const n of [1, 2, 3]) {
    const analytical = analyticalExpectedDamage(50, 8, n);
    const result = simulate({
      sequence: [{ type: OpType.DAMAGE, n }],
      initial:  { deck },
      config:   { trials: TRIALS },
    });
    expect(`E[${n} dmg, D=50 C=8]`, result.clockDamage.mean, analytical, TOL);
  }
}

// ── 4. Sequential Damage ──────────────────────────────────────────────────────
console.log('\n4. Sequential damage (2 then 2)');
{
  const deck = mkDeck(50, 8);
  const result = simulate({
    sequence: [
      { type: OpType.DAMAGE, n: 2 },
      { type: OpType.DAMAGE, n: 2 },
    ],
    initial: { deck },
    config:  { trials: TRIALS },
  });

  // Both hit: min expected ≈ P(2 hits) * 2 + P(2 hits | state after first)
  // Lower bound: if both hit = 2+2=4, if first cancels + second hits = 0+2=2, etc.
  // mean should be between 2 and 4
  const mean = result.clockDamage.mean;
  expectBool('Mean sequential in (2, 4)', mean > 2 && mean < 4, true);
  console.log(`     mean = ${mean.toFixed(3)}, min=${result.clockDamage.min}, max=${result.clockDamage.max}`);
}

// ── 5. Damage Cancel + zj (追加) ──────────────────────────────────────────────
console.log('\n5. zj (追加): 2zj(1) — cancel triggers 1 extra damage');
{
  // 2zj(1): if 2 damage is cancelled, deal 1 more
  const deck = mkDeck(50, 8);
  const result = simulate({
    sequence: [{
      type:     OpType.DAMAGE,
      n:        2,
      onCancel: [{ type: OpType.DAMAGE, n: 1 }],
    }],
    initial: { deck },
    config:  { trials: TRIALS },
  });

  // P(2 hits) = analyticalNoCancel(50,8,2) → damage = 2
  // P(2 cancels) → deal 1, P(1 hits) = analyticalNoCancel(50,8-1,1) roughly
  // Expected > E[plain 2 damage] because cancel triggers extra damage
  const plainMean = analyticalExpectedDamage(50, 8, 2);
  expectBool(`Mean 2zj(1) > E[plain 2]`, result.clockDamage.mean > plainMean - 0.01, true);
  console.log(`     zj mean = ${result.clockDamage.mean.toFixed(3)}, plain mean = ${plainMean.toFixed(3)}`);
}

// ── 6. True Damage ────────────────────────────────────────────────────────────
console.log('\n6. True damage (no cancel)');
{
  const deck = mkDeck(20, 10);  // High climax density; true damage always hits
  const result = simulate({
    sequence: [{ type: OpType.TRUE_DAMAGE, n: 3 }],
    initial:  { deck },
    config:   { trials: TRIALS },
  });

  // True damage: always exactly 3 into clock (unless deck runs out)
  expect('True damage mean = 3', result.trueDamage.mean, 3.0, 0.01);
  expect('Clock damage = 0 (true damage goes to trueDamage stat)', result.clockDamage.mean, 0, 0.001);
}

// ── 7. Mill (no cancel) ───────────────────────────────────────────────────────
console.log('\n7. Mill — cards go to rest, not clock');
{
  const deck = mkDeck(50, 8);
  const result = simulate({
    sequence: [{ type: OpType.MILL, n: 5 }],
    initial:  { deck },
    config:   { trials: TRIALS },
  });

  expect('Mill: zero clock damage', result.clockDamage.mean, 0, 0.001);
  expect('Mill: zero true damage',  result.trueDamage.mean, 0, 0.001);
}

// ── 8. Move Op: DT>RS (top 4 to rest, no condition) ─────────────────────────
console.log('\n8. Move Op: top 4 cards to rest');
{
  const deck = mkDeck(50, 8);
  const result = simulate({
    sequence: [{
      type:   OpType.MOVE,
      source: { zone: ZoneId.DECK, method: { type: 'top', n: 4 } },
      act: {
        selections: [],
        remainder: { destination: ZoneId.REST, order: 'any' },
      },
    }],
    initial: { deck },
    config:  { trials: TRIALS },
  });

  // No damage at all
  expect('Move op: zero clock damage', result.clockDamage.mean, 0, 0.001);
}

// ── 9. Move + Condition: DT>RS4:C+2 ─────────────────────────────────────────
console.log('\n9. Move+Condition: reveal top 4, if climax → deal 2 damage');
{
  // P(at least 1 climax in top 4) = 1 - C(42,4)/C(50,4)
  const D = 50, C = 8, k = 4;
  const pNoClimax = (42*41*40*39) / (50*49*48*47);
  const pHasClimax = 1 - pNoClimax;
  const pDamageHits = pHasClimax * analyticalNoCancel(D - k, C - 1, 2); // approx (1 climax moved out)

  const deck = mkDeck(D, C);
  const result = simulate({
    sequence: [{
      type:   OpType.MOVE,
      source: { zone: ZoneId.DECK, method: { type: 'top', n: k } },
      act: {
        selections: [],
        remainder: { destination: ZoneId.REST, order: 'any' },
      },
      onClimax: [{ type: OpType.DAMAGE, n: 2 }],
    }],
    initial: { deck },
    config:  { trials: TRIALS },
  });

  // pAnyDamage = P(climax found AND 2 damage not cancelled) ≈ pDamageHits
  const pAnyDamage = result.clockDamage.probAtLeast[1] ?? 0;
  expect('P(climax found AND 2 damage hits)', pAnyDamage, pDamageHits, TOL * 2);
  console.log(`     P(climax in top 4)=${pHasClimax.toFixed(4)}, P(damage hits)=${pDamageHits.toFixed(4)}, sim=${pAnyDamage.toFixed(4)}`);
}

// ── 10. Refresh Trigger ───────────────────────────────────────────────────────
console.log('\n10. Refresh: 5-card deck + large rest forces refresh during damage');
{
  // 5-card deck with 0 climax — all 5 damage hits guaranteed, exhausting deck.
  // rest has 30 cards → Refresh must fire to continue damage.
  const deck = mkDeck(5, 0);
  const rest  = Array.from({ length: 30 }, (_, i) =>
    i < 4 ? makeClimax({ color: Color.YELLOW }) : makeCharacter({ color: Color.YELLOW })
  );

  const result = simulate({
    sequence: [
      { type: OpType.DAMAGE, n: 3 },
      { type: OpType.DAMAGE, n: 3 },
      { type: OpType.DAMAGE, n: 3 },
    ],
    initial: { deck, rest },
    config:  { trials: TRIALS },
  });

  // After 5 cards (first 3 + 2 of second), deck empties → Refresh fires
  expectBool('Average refresh > 0', result.refresh.mean > 0, true);
  console.log(`     avg refreshes = ${result.refresh.mean.toFixed(3)}`);
}

// ── 11. Level Up Trigger ──────────────────────────────────────────────────────
console.log('\n11. Level Up: clock with 5 cards + 2 damage should sometimes trigger');
{
  const deck  = mkDeck(50, 4);  // low climax → high hit chance
  const clock = Array.from({ length: 5 }, () => makeCharacter({ color: Color.YELLOW }));

  const result = simulate({
    sequence: [
      { type: OpType.DAMAGE, n: 2 },
      { type: OpType.DAMAGE, n: 2 },
    ],
    initial: { deck, clock },
    config:  { trials: TRIALS },
  });

  expectBool('Some trials trigger level up', result.levelUp.mean > 0, true);
  console.log(`     avg level ups = ${result.levelUp.mean.toFixed(3)}`);
}

// ── 12. Fx (Reverse Wash) ─────────────────────────────────────────────────────
console.log('\n12. Fx: reverse wash improves deck quality');
{
  // Deck: 10 cards, 8 climax → very high cancel rate
  // Rest: 20 non-climax cards
  // After fx4: deck gets 4 non-climax, climax density drops
  const deck = mkDeck(10, 8);
  const rest  = mkDeck(20, 0);  // all non-climax

  const withFx = simulate({
    sequence: [
      { type: OpType.FX, n: 4 },
      { type: OpType.DAMAGE, n: 1 },
    ],
    initial: { deck, rest },
    config:  { trials: TRIALS },
  });

  const withoutFx = simulate({
    sequence: [{ type: OpType.DAMAGE, n: 1 }],
    initial:  { deck, rest: [] },
    config:   { trials: TRIALS },
  });

  expectBool('Fx improves hit rate', withFx.clockDamage.mean > withoutFx.clockDamage.mean, true);
  console.log(`     with fx mean=${withFx.clockDamage.mean.toFixed(3)}, without=${withoutFx.clockDamage.mean.toFixed(3)}`);
}

// ── 13. Outcome Distribution Sanity ──────────────────────────────────────────
console.log('\n13. Distribution sanity checks');
{
  const result = simulate({
    sequence: [{ type: OpType.DAMAGE, n: 3 }],
    initial:  { deck: mkDeck(50, 8) },
    config:   { trials: TRIALS },
  });

  // probAtLeast[0] should be 1.0 (always at least 0 damage)
  expect('P(>=0 damage) = 1', result.clockDamage.probAtLeast[0] ?? 1, 1.0, 0.001);

  // probAtLeast[3] = P(no cancel) analytically
  const analytical = analyticalNoCancel(50, 8, 3);
  expect('P(>=3) matches analytical', result.clockDamage.probAtLeast[3] ?? 0, analytical, TOL);

  // Distribution values sum to ~1
  const distSum = Object.values(result.clockDamage.distribution).reduce((a, b) => a + b, 0);
  expect('Distribution sums to 1', distSum, 1.0, 0.001);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some tests failed — engine needs review.');
  process.exit(1);
} else {
  console.log('All tests passed ✅');
}
