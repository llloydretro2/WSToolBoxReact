/**
 * Yakuman detection test suite
 * Source: MahjongRepository/mahjong — tests/hand_calculating/tests_yakuman_calculation.py
 *
 * Two layers:
 *   Layer 1 — canCompleteHand: can we even recognise these as valid winning hands?
 *   Layer 2 — evaluator:       does evaluateYakuFromDecomposition detect the yakuman?
 *
 * Run: node test-yakuman.js
 */
import { evaluateYakuFromDecomposition } from './src/utils/mahjong/handSimulator.js';
import { extractHandGroups, canCompleteHand } from './src/utils/mahjong/tileParser.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fromStr(suit, digits) {
  return [...digits].map(d => ({ suit, value: parseInt(d, 10) }));
}
function hand({ man = '', pin = '', sou = '', honors = '' } = {}) {
  return [...fromStr('m',man), ...fromStr('p',pin), ...fromStr('s',sou), ...fromStr('z',honors)];
}
function evalClosed(tiles, sw = 1, rw = 1) {
  if (!canCompleteHand(tiles, 0)) return null;
  const g = extractHandGroups(tiles, 0);
  return g ? evaluateYakuFromDecomposition(g, [], sw, rw, {}) : null;
}
function evalOpen(conc, melds, sw = 1, rw = 1) {
  if (!canCompleteHand(conc, melds.length)) return null;
  const g = extractHandGroups(conc, melds.length);
  return g ? evaluateYakuFromDecomposition(g, melds, sw, rw, {}) : null;
}

// ── Runner ────────────────────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, pending: 0 };
const failures = [];
const pending  = [];

function check(desc, cond, { expect = true, isPending = false } = {}) {
  if (isPending) {
    results.pending++;
    const icon = cond ? '✓' : '✗';
    pending.push(`  📋 [PENDING] ${desc} — currently ${cond ? 'passes' : 'fails'}`);
    return;
  }
  const ok = cond === expect;
  if (ok) { results.pass++; }
  else     { results.fail++; failures.push(`  ✗ ${desc} (expected ${expect}, got ${cond})`); }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: canCompleteHand
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Layer 1: canCompleteHand ──────────────────────────────────────');

// 大三元
check('大三元 is complete hand',
  canCompleteHand(hand({ sou:'123', man:'22', honors:'555666777' }), 0));

// 小四喜
check('小四喜 is complete hand',
  canCompleteHand(hand({ sou:'123', honors:'11122233344' }), 0));

// 大四喜
check('大四喜 is complete hand',
  canCompleteHand(hand({ sou:'22', honors:'111222333444' }), 0));

// 字一色 toitoi form
check('字一色 (all-triplet) is complete hand',
  canCompleteHand(hand({ honors:'11122233366677' }), 0));

// 字一色 chiitoitsu form
check('字一色 (chiitoitsu) is complete hand',
  canCompleteHand(hand({ honors:'11223344556677' }), 0));

// 清老头
check('清老头 is complete hand',
  canCompleteHand(hand({ sou:'111999', man:'111999', pin:'99' }), 0));

// 绿一色
check('绿一色 is complete hand',
  canCompleteHand(hand({ sou:'22334466888', honors:'666' }), 0));

// 四暗刻 (tanki — shanpon wins by ron are NOT suuankou, but structure is still complete)
check('四暗刻 structure is complete hand',
  canCompleteHand(hand({ sou:'111444', man:'333', pin:'44555' }), 0));

// 九莲宝灯 variants (all 9 from parametrized Python tests)
const chuurenHands = [
  { man:'11112345678999' },
  { pin:'11122345678999' },
  { sou:'11123345678999' },
  { sou:'11123445678999' },
  { sou:'11123455678999' },
  { sou:'11123456678999' },
  { sou:'11123456778999' },
  { sou:'11123456788999' },
  { sou:'11123456789999' },
];
chuurenHands.forEach((h, i) => {
  check(`九莲宝灯 variant ${i+1} is complete hand`,
    canCompleteHand(hand(h), 0));
});

// 国士无双 — now handled in canCompleteHand
check('国士无双 recognised as complete hand',
  canCompleteHand(hand({ sou:'119', man:'19', pin:'19', honors:'1234567' }), 0));

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: evaluator yakuman detection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Layer 2: evaluator ────────────────────────────────────────────');

// 大三元
{
  const r = evalClosed(hand({ sou:'123', man:'22', honors:'555666777' }));
  check('大三元 detected', r?.includes('daisangen'));
  check('大三元 NOT false-fired on non-daisangen',
    !evalClosed(hand({ sou:'123456', man:'22', honors:'556677' }))?.includes('daisangen'));
}

// 小四喜
{
  const r = evalClosed(hand({ sou:'123', honors:'11122233344' }));
  check('小四喜 detected', r?.includes('shousuushii'));
  check('小四喜 NOT fired with only 3 winds',
    !evalClosed(hand({ sou:'123456', man:'22', honors:'111222334' }))?.includes('shousuushii'));
}

// 大四喜
{
  const r = evalClosed(hand({ sou:'22', honors:'111222333444' }));
  check('大四喜 detected', r?.includes('daisuushii'));
}

// 字一色 (toitoi form)
{
  const r = evalClosed(hand({ honors:'11122233366677' }));
  check('字一色 (toitoi) detected', r?.includes('tsuuiisou'));
}

// 字一色 (chiitoitsu form)
{
  const r = evalClosed(hand({ honors:'11223344556677' }));
  check('字一色 (chiitoitsu) detected', r?.includes('tsuuiisou'));
}

// 清老头
{
  const r = evalClosed(hand({ sou:'111999', man:'111999', pin:'99' }));
  check('清老头 detected', r?.includes('chinroutou'));
  check('清老头 NOT fired when middle tiles present',
    !evalClosed(hand({ sou:'111555', man:'111999', pin:'99' }))?.includes('chinroutou'));
}

// 绿一色
{
  const r = evalClosed(hand({ sou:'22334466888', honors:'666' }));
  check('绿一色 detected', r?.includes('ryuuiisou'));
  check('绿一色 NOT fired with non-green tile',
    !evalClosed(hand({ sou:'22334466888', honors:'777' }))?.includes('ryuuiisou'));
}

// 四暗刻
{
  const r = evalClosed(hand({ sou:'111444', man:'333', pin:'44555' }));
  check('四暗刻 detected (closed)', r?.includes('suuankou'));
  const rOpen = evalOpen(hand({ sou:'444', man:'333', pin:'44555' }), [fromStr('s','111')]);
  check('四暗刻 NOT fired with open meld', !rOpen?.includes('suuankou'));
}

// 九莲宝灯
{
  const r = evalClosed(hand({ man:'11112345678999' }));
  check('九莲宝灯 detected', r?.includes('chuuren'));
  check('九莲宝灯 NOT fired when mixed suits',
    !evalClosed(hand({ man:'1111234567899', pin:'9' }))?.includes('chuuren'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  Layer 1 (canCompleteHand): ${results.pass}/${results.pass + results.fail} passed${results.fail > 0 ? ` — ${results.fail} FAILED` : ' ✅'}`);
console.log(`  Layer 2 (evaluator):       ${results.pending} pending`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(f));
}
if (pending.length > 0) {
  console.log('\nPending (will pass after yakuman evaluator is implemented):');
  pending.forEach(p => console.log(p));
}
console.log(`${'─'.repeat(60)}\n`);
if (results.fail > 0) process.exitCode = 1;
