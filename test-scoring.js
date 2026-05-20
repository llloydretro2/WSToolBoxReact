/**
 * Comprehensive scoring test suite.
 * Source: MahjongRepository/mahjong — tests/hand_calculating/tests_scores_calculation.py
 *
 * Mapping to our API:
 *   Python "main"       for non-dealer ron  → computePoints.ron.nonDealer
 *   Python "main"       for dealer ron       → computePoints.ron.dealer
 *   Python "main"       for non-dealer tsumo → computePoints.tsumo.dealer    (dealer pays)
 *   Python "additional" for non-dealer tsumo → computePoints.tsumo.nonDealer (others pay each)
 *   Python "main"       for dealer tsumo     → computePoints.tsumo.dealer    (each pays)
 *
 * Run: node test-scoring.js
 */
import { computePoints } from './src/utils/mahjong/scoring.js';

let pass = 0, fail = 0;
const failures = [];
function check(desc, got, expected) {
  const ok = got === expected;
  ok ? pass++ : (fail++, failures.push(`  ✗ ${desc}: expected=${expected} got=${got}`));
}

// ── Non-dealer ron ────────────────────────────────────────────────────────────
// Python: test_calculate_scores_and_ron
// formula: basic = fu × 2^(han+2); payment = roundUp100(basic × 4)
console.log('\n── Non-dealer ron ──');

const nonDealerRon = [
  [1, 30, 1000],
  [1, 110, 3600],  // 110×8=880 × 4=3520 → 3600
  [2, 30, 2000],
  [3, 30, 3900],
  [4, 30, 7700],   // basic=1920 < 2000, NOT mangan (standard rules)
  [4, 40, 8000],   // basic=2560 ≥ 2000 → mangan
  [5, 30, 8000],   // mangan
  [6, 30, 12000],  // haneman
  [8, 30, 16000],  // baiman
  [11, 30, 24000], // sanbaiman
  [13, 30, 32000], // yakuman
];
for (const [han, fu, expected] of nonDealerRon) {
  check(`non-dealer ron ${han}han ${fu}fu = ${expected}`,
    computePoints(han, fu).ron.nonDealer, expected);
}

// ── Dealer ron ────────────────────────────────────────────────────────────────
// Python: test_calculate_scores_and_ron_by_dealer
// formula: payment = roundUp100(basic × 6)
console.log('\n── Dealer ron ──');

const dealerRon = [
  [1, 30, 1500],
  [2, 30, 2900],   // 480×6=2880 → 2900
  [3, 30, 5800],   // 960×6=5760 → 5800
  [4, 30, 11600],  // basic=1920, 1920×6=11520 → 11600 (NOT mangan)
  [5, 30, 12000],  // mangan dealer ron
  [6, 30, 18000],  // haneman
  [8, 30, 24000],  // baiman
  [11, 30, 36000], // sanbaiman
  [13, 30, 48000], // yakuman
];
for (const [han, fu, expected] of dealerRon) {
  check(`dealer ron ${han}han ${fu}fu = ${expected}`,
    computePoints(han, fu).ron.dealer, expected);
}

// ── Non-dealer tsumo ──────────────────────────────────────────────────────────
// Python: test_calculate_scores_and_tsumo
// main = dealer pays = roundUp100(basic × 2)
// additional = each non-dealer pays = roundUp100(basic × 1)
console.log('\n── Non-dealer tsumo ──');

const nonDealerTsumo = [
  //  han  fu  main(dealer pays)  additional(non-dealer pays)
  [1, 30, 500, 300],
  [3, 30, 2000, 1000],
  [3, 60, 3900, 2000],  // 60×32=1920: dealer 3840→3900, others 1920→2000
  [4, 30, 3900, 2000],  // basic=1920 < 2000: dealer 3840→3900, others 1920→2000
  [5, 30, 4000, 2000],  // mangan non-dealer tsumo
  [6, 30, 6000, 3000],  // haneman
  [8, 30, 8000, 4000],  // baiman
  [11, 30, 12000, 6000],// sanbaiman
  [13, 30, 16000, 8000],// yakuman
];
for (const [han, fu, main, additional] of nonDealerTsumo) {
  check(`non-dealer tsumo ${han}han ${fu}fu dealer=${main}`,
    computePoints(han, fu).tsumo.dealer, main);
  check(`non-dealer tsumo ${han}han ${fu}fu others=${additional}`,
    computePoints(han, fu).tsumo.nonDealer, additional);
}

// ── Dealer tsumo ──────────────────────────────────────────────────────────────
// Python: test_calculate_scores_and_tsumo_by_dealer
// All 3 opponents pay the same: roundUp100(basic × 2) each
// → our tsumo.dealer (since dealer wins, all pay dealer rate = basic×2)
console.log('\n── Dealer tsumo ──');

const dealerTsumo = [
  [1, 30, 500],
  [3, 30, 2000],
  [4, 30, 3900],  // basic=1920: each pays 3840→3900
  [5, 30, 4000],  // mangan dealer tsumo: each pays 4000
  [6, 30, 6000],
  [8, 30, 8000],
  [11, 30, 12000],
  [13, 30, 16000], // yakuman
];
for (const [han, fu, eachPays] of dealerTsumo) {
  // For dealer tsumo: all opponents pay tsumo.dealer (= basic×2 per person)
  check(`dealer tsumo ${han}han ${fu}fu each=${eachPays}`,
    computePoints(han, fu).tsumo.dealer, eachPays);
}

// ── Limit boundary verification ───────────────────────────────────────────────
console.log('\n── Limit boundaries ──');

// 4 han 30 fu: NOT mangan (standard rules) — basic=1920 < 2000
check('4han 30fu NOT mangan (standard)', computePoints(4, 30).isLimit, false);
check('4han 30fu non-dealer ron = 7700', computePoints(4, 30).ron.nonDealer, 7700);
check('4han 30fu dealer ron = 11600',    computePoints(4, 30).ron.dealer,    11600);

// 4 han 40 fu: mangan — basic=2560 ≥ 2000
check('4han 40fu mangan (basic≥2000)', computePoints(4, 40).isLimit, true);
check('4han 40fu non-dealer ron = 8000', computePoints(4, 40).ron.nonDealer, 8000);

// 3 han 70 fu: mangan — basic=2240 ≥ 2000
check('3han 70fu mangan (basic≥2000)',  computePoints(3, 70).isLimit,  true);
check('3han 70fu non-dealer ron = 8000', computePoints(3, 70).ron.nonDealer, 8000);

// 3 han 60 fu: NOT mangan — basic=1920 < 2000
check('3han 60fu NOT mangan', computePoints(3, 60).isLimit, false);
check('3han 60fu non-dealer ron = 7700', computePoints(3, 60).ron.nonDealer, 7700);

// Yakuman
check('yakuman non-dealer ron = 32000', computePoints('yakuman', 30).ron.nonDealer, 32000);
check('yakuman dealer ron = 48000',     computePoints('yakuman', 30).ron.dealer,    48000);
check('yakuman non-dealer tsumo dealer = 16000',  computePoints('yakuman', 30).tsumo.dealer,    16000);
check('yakuman non-dealer tsumo others = 8000',   computePoints('yakuman', 30).tsumo.nonDealer,  8000);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${pass}/${pass+fail} passed${fail > 0 ? ` — ${fail} FAILED` : ' ✅'}`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log(f)); }
console.log(`${'─'.repeat(60)}\n`);
if (fail > 0) process.exitCode = 1;
