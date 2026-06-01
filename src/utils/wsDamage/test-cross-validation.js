// WS Damage Simulator — Cross-Validation Runner
// Compares our engine against the existing WS-DamageSim project.
// Run: node src/utils/wsDamage/test-cross-validation.js

import { simulate } from './index.js';
import { runExisting } from './fixtures/existingAdapter.js';
import { FIXTURES } from './fixtures/index.js';

const TRIALS    = 100_000;
const MATCH_TOL = 0.020;  // ±2% → MATCH
const WARN_TOL  = 0.100;  // ±10% → DIVERGE (above = BUG)

// ── Helpers ───────────────────────────────────────────────────────────────────

function probAtLeast(result, k) {
  return result.probAtLeast?.[k] ?? 0;
}

function compareDist(ours, theirs, maxDmg) {
  let maxDiff = 0;
  for (let k = 1; k <= maxDmg; k++) {
    const o = probAtLeast(ours,   k);
    const t = probAtLeast(theirs, k);
    const d = Math.abs(o - t);
    if (d > maxDiff) maxDiff = d;
  }
  return maxDiff;
}

function verdict(diff) {
  if (diff <= MATCH_TOL) return { label: '✅ MATCH',   color: '' };
  if (diff <= WARN_TOL)  return { label: '⚠️  DIVERGE', color: '' };
  return                        { label: '❌ BUG',      color: '' };
}

// ── Runner ────────────────────────────────────────────────────────────────────

console.log('\n=== WS Damage Cross-Validation ===');
console.log(`Trials: ${TRIALS.toLocaleString()}  Match tolerance: ±${(MATCH_TOL*100).toFixed0}%  Diverge: ±${(WARN_TOL*100).toFixed0}%\n`);

const report = [];

for (const f of FIXTURES) {
  // ── Skip fixtures that can't be compared ──────────────────────────────────
  if (f.engineSupport === 'skip') {
    console.log(`⏭️  SKIP        [${f.id}] — ${f.skipReason?.split('.')[0]}`);
    report.push({ id: f.id, status: 'skip', category: f.category });
    continue;
  }

  if (f.engineSupport === 'engine_only' || !f.theirSyntax) {
    // Run only our engine
    const ours = simulate({
      sequence: f.ourSequence,
      initial:  f.initialState,
      config:   { trials: TRIALS },
    });
    const mean = ours.total.mean.toFixed(3);
    const analytical = f.analyticalMean != null
      ? ` (analytical: ${f.analyticalMean.toFixed(3)})`
      : '';
    console.log(`🔵 ENGINE_ONLY  [${f.id}]  our_mean=${mean}${analytical}`);
    report.push({ id: f.id, status: 'engine_only', ourMean: ours.total.mean, category: f.category });
    continue;
  }

  // ── Run both engines ──────────────────────────────────────────────────────
  const ours = simulate({
    sequence: f.ourSequence,
    initial:  f.initialState,
    config:   { trials: TRIALS },
  });

  // Extract D and N from initialState for the existing project
  const deck  = f.initialState.deck  ?? [];
  const rest  = f.initialState.rest  ?? [];
  const clock = f.initialState.clock ?? [];
  const D   = deck.length;
  const N   = deck.filter(c => c.type === 'climax').length;
  const R   = rest.length;
  const RC  = rest.filter(c => c.type === 'climax').length;
  const C   = clock.length;
  const CC  = clock.filter(c => c.type === 'climax').length;

  const theirs = runExisting(f.theirSyntax, D, N, R, RC, C, CC);

  // Compare distributions up to the max observed damage
  const maxDmg = Math.max(ours.total.max, theirs?.max ?? 0);
  const diff   = theirs ? compareDist(ours.total, theirs, maxDmg) : 1;
  // approx fixtures: divergence from the existing project is expected and documented.
  // Only flag as BUG if a 'full' fixture diverges.
  const rawVerdict = verdict(diff);
  const isApprox   = f.engineSupport === 'approx';
  const statusLabel = isApprox && !rawVerdict.label.startsWith('✅')
    ? '📝 EXPECTED_DIV'
    : rawVerdict.label;
  const status = statusLabel.startsWith('✅') ? 'match'
               : statusLabel.startsWith('📝') ? 'expected_div'
               : statusLabel.startsWith('⚠️') ? 'diverge'
               : 'bug';

  const ourMean   = ours.total.mean.toFixed(3);
  const theirMean = (theirs?.mean ?? 0).toFixed(3);
  const diffStr   = diff.toFixed(4);

  console.log(`${statusLabel.padEnd(16)} [${f.id}]`);
  console.log(`         our=${ourMean}  theirs=${theirMean}  maxDiff=${diffStr}  syntax="${f.theirSyntax}"`);
  if (isApprox) console.log(`         note: ${f.approxNote}`);

  report.push({
    id: f.id, category: f.category, status,
    ourMean: ours.total.mean, theirMean: theirs?.mean,
    maxDiff: diff, syntax: f.theirSyntax, engineSupport: f.engineSupport,
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────
const counts = { match: 0, diverge: 0, bug: 0, skip: 0, engine_only: 0 };
for (const r of report) counts[r.status] = (counts[r.status] ?? 0) + 1;

console.log('\n' + '═'.repeat(55));
console.log('Summary:');
console.log(`  ✅ MATCH:         ${counts.match ?? 0}`);
console.log(`  📝 EXPECTED_DIV: ${counts.expected_div ?? 0}  (approx fixture, divergence is intentional)`);
console.log(`  ⚠️  DIVERGE:      ${counts.diverge ?? 0}  (2–10% diff, manual review needed)`);
console.log(`  ❌ BUG:          ${counts.bug ?? 0}  (>10% diff on full fixture)`);
console.log(`  ⏭️  SKIP:         ${counts.skip ?? 0}  (engine feature not yet supported)`);
console.log(`  🔵 ENGINE_ONLY:  ${counts.engine_only ?? 0}  (no equivalent in existing project)`);
console.log('═'.repeat(55));

if ((counts.bug ?? 0) > 0) {
  console.error('\n❌ BUG fixtures found — engine needs review.');
  process.exit(1);
} else {
  console.log('\n✅ No engine bugs detected.');
}
