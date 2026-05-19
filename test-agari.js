/**
 * Hand completion (agari) test suite
 * Source: MahjongRepository/mahjong — tests/tests_agari.py
 *
 * Tests canCompleteHand() across standard, chiitoitsu, open, and edge-case hands.
 * Kokushi is marked PENDING (not yet implemented in canCompleteHand/extractHandGroups).
 *
 * Run: npx vite-node test-agari.js
 */
import { canCompleteHand } from './src/utils/mahjong/tileParser.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fromStr(suit, digits) {
  return [...digits].map(d => ({ suit, value: parseInt(d, 10) }));
}
function hand({ man = '', pin = '', sou = '', honors = '' } = {}) {
  return [...fromStr('m',man), ...fromStr('p',pin), ...fromStr('s',sou), ...fromStr('z',honors)];
}

// ── Runner ────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0, pending = 0;
const failures = [], pendingList = [];

function check(desc, got, { expect = true, isPending = false } = {}) {
  if (isPending) {
    pending++;
    pendingList.push(`  📋 ${desc} — currently ${got ? 'passes ✓' : 'fails ✗'}`);
    return;
  }
  const ok = got === expect;
  ok ? pass++ : (fail++, failures.push(`  ✗ ${desc} (expected ${expect}, got ${got})`));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Standard winning hands
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Standard winning hands ──');

check('3 sequences + pair + 1 set (3 suits)',
  canCompleteHand(hand({ sou:'123456789', pin:'123', man:'33' }), 0));

check('sequences + pair inside same suit variant',
  canCompleteHand(hand({ sou:'123456789', pin:'11123' }), 0));

check('sequences + honour pair + honour triplet',
  canCompleteHand(hand({ sou:'123456789', honors:'11777' }), 0));

check('complex single-suit 1 (12345556778899s)',
  canCompleteHand(hand({ sou:'12345556778899' }), 0));

check('complex single-suit 2 (11123456788999s)',
  canCompleteHand(hand({ sou:'11123456788999' }), 0));

check('mixed suits with honours pair',
  canCompleteHand(hand({ sou:'233334', pin:'789', man:'345', honors:'55' }), 0));

// pair at different positions within suit (atama_mentsu tests)
['66','99','22','44','77'].forEach(pair => {
  check(`pair ${pair}m + pin 111222333444 → complete`,
    canCompleteHand(hand({ man: pair, pin:'111222333444' }), 0));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Non-winning hands (should return false)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Non-winning hands ──');

check('too many tiles in wrong shape (123456789s + 12345p)',
  canCompleteHand(hand({ sou:'123456789', pin:'12345' }), 0),
  { expect: false });

check('isolated tile prevents completion (111222444s + 11145p)',
  canCompleteHand(hand({ sou:'111222444', pin:'11145' }), 0),
  { expect: false });

check('14-tile hand, no valid decomposition (11122233356888s)',
  canCompleteHand(hand({ sou:'11122233356888' }), 0),
  { expect: false });

check('non-adjacent isolated tiles (147m + 11z)',
  canCompleteHand(hand({ man:'147', honors:'11' }), 0),
  { expect: false });

check('can\'t form 2 sequences from 11m + 4m (114m + 11z)',
  canCompleteHand(hand({ man:'114', honors:'11' }), 0),
  { expect: false });

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chiitoitsu (seven pairs)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Chiitoitsu ──');

check('7 pairs across 2 suits (1133557799s + 1199p)',
  canCompleteHand(hand({ sou:'1133557799', pin:'1199' }), 0));

check('7 pairs across 3 suits + honours',
  canCompleteHand(hand({ sou:'2244', pin:'1199', man:'11', honors:'2277' }), 0));

check('7 pairs single suit (11223344556677m)',
  canCompleteHand(hand({ man:'11223344556677' }), 0));

check('NOT chiitoitsu: four-of-a-kind pair (11335555s + 1133m + 11p)',
  canCompleteHand(hand({ sou:'11335555', man:'1133', pin:'11' }), 0),
  { expect: false });

// ─────────────────────────────────────────────────────────────────────────────
// 4. Open hands
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Open hands ──');

// 1 meld: concealed = 11 tiles
// 1 meld → 11 concealed tiles needed (14-3)
check('valid open hand (1 meld)',
  canCompleteHand(hand({ sou:'12399', man:'123456' }), 1));

// 2 melds: concealed = 8 tiles; sou=23467 + pin=222 can NOT complete 2 sets
check('open hand 2 melds — concealed tiles do NOT complete',
  canCompleteHand(
    [...fromStr('s','23467'), ...fromStr('p','222')],  // 5+3 = 8 tiles
    2
  ),
  { expect: false });

// 2 melds: valid completion
// 2 melds → 8 concealed tiles needed (14-6)
check('valid open hand 2 melds (2 melds open, 123s + 345m + 44p concealed)',
  canCompleteHand(hand({ sou:'123', man:'345', pin:'44' }), 2));

// ─────────────────────────────────────────────────────────────────────────────
// 5. Edge cases
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Edge cases ──');

check('single tile in man suit → false',
  canCompleteHand(hand({ man:'1' }), 0),
  { expect: false });

check('single tile in pin suit → false',
  canCompleteHand(hand({ pin:'1' }), 0),
  { expect: false });

check('honour tile overflow (5 copies of same honour) → false',
  canCompleteHand(hand({ honors:'55555' }), 0),
  { expect: false });

check('two different pairs only (11m + 11p) → false',
  canCompleteHand(hand({ man:'11', pin:'11' }), 0),
  { expect: false });

check('single triplet only (111m) → false',
  canCompleteHand(hand({ man:'111' }), 0),
  { expect: false });

// ─────────────────────────────────────────────────────────────────────────────
// 6. Kokushi (PENDING — not implemented in canCompleteHand)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Kokushi ──');

[
  { sou:'19', pin:'19', man:'199', honors:'1234567' },  // 9m pair
  { sou:'19', pin:'19', man:'19',  honors:'11234567' }, // 1z pair
  { sou:'19', pin:'19', man:'19',  honors:'12345677' }, // 7z pair
].forEach(({ sou, pin, man, honors }, i) => {
  check(`国士无双 variant ${i+1} recognised as complete`,
    canCompleteHand(hand({ sou, pin, man, honors }), 0));
});

// not-kokushi hands should remain false (already correct)
check('2索 breaks kokushi (has non-terminal)',
  canCompleteHand(hand({ sou:'129', pin:'19', man:'19', honors:'1234567' }), 0),
  { expect: false });

check('three 1z breaks kokushi (duplicate pair type)',
  canCompleteHand(hand({ sou:'19', pin:'19', man:'19', honors:'11134567' }), 0),
  { expect: false });

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${pass}/${pass + fail} passed${fail > 0 ? ` — ${fail} FAILED` : ' ✅'}`);
console.log(`  ${pending} pending (kokushi, needs tileParser.js update)`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log(f)); }
if (pendingList.length) { console.log('\nPending:'); pendingList.forEach(p => console.log(p)); }
console.log(`${'─'.repeat(60)}\n`);
