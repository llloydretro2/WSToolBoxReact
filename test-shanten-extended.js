/**
 * Extended shanten test suite
 * Source: MahjongRepository/mahjong — tests/tests_shanten.py
 *
 * Only uses cases from test_calculate_shanten (full 3-path minimum),
 * NOT from test_calculate_shanten_for_regular_hand (single-path only).
 * Single-path expected values differ from our 3-way minimum engine.
 *
 * Run: npx vite-node test-shanten-extended.js
 */
import { computeShanten } from './src/utils/mahjong/shanten.js';

function fromStr(suit, digits) {
  return [...digits].map(d => ({ suit, value: parseInt(d, 10) }));
}
function hand({ man = '', pin = '', sou = '', honors = '' } = {}) {
  return [...fromStr('m',man), ...fromStr('p',pin), ...fromStr('s',sou), ...fromStr('z',honors)];
}

let pass = 0, fail = 0;
const failures = [];

function run(desc, tiles, expected, numMelds = 0) {
  const got = computeShanten(tiles, numMelds);
  const ok  = got === expected;
  ok ? pass++ : (fail++, failures.push(`  ✗ ${desc}\n       expected=${expected} got=${got}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Multi-suit hands (from test_calculate_shanten — full minimum)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Multi-suit (full minimum) ──');

run('4566677s + 1367p + 8m + 12z = 2-shanten',
  hand({ sou:'4566677', pin:'1367', man:'8', honors:'12' }), 2);

run('14s + 3356p + 3678m + 2567z = 4-shanten',
  hand({ sou:'14', pin:'3356', man:'3678', honors:'2567' }), 4);

run('1111222235555m + 1z = tenpai',
  hand({ man:'1111222235555', honors:'1' }), 0);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Complete hands (shanten = -1)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Complete hands (-1) ──');

run('111234567s + 11p + 567m',
  hand({ sou:'111234567', pin:'11', man:'567' }), -1);

run('11123456788999s',
  hand({ sou:'11123456788999' }), -1);

run('44467778s + 222567p',
  hand({ sou:'44467778', pin:'222567' }), -1);

run('123456789s + 123p + 33m',
  hand({ sou:'123456789', pin:'123', man:'33' }), -1);


// ─────────────────────────────────────────────────────────────────────────────
// 3. Tenpai (shanten = 0)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Tenpai (0) ──');

run('11122245679999s',
  hand({ sou:'11122245679999' }), 0);

run('111345677s + 11m + 567p',
  hand({ sou:'111345677', man:'11', pin:'567' }), 0);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Chiitoitsu path (test_calculate_shanten_for_chiitoitsu_hand)
//    Hands are designed so chiitoitsu gives the minimum shanten
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Chiitoitsu path ──');

run('114477s + 114477p + 77m = complete chiitoitsu (-1)',
  hand({ sou:'114477', pin:'114477', man:'77' }), -1);

run('114477s + 114477p + 76m = tenpai chiitoi',
  hand({ sou:'114477', pin:'114477', man:'76' }), 0);

run('114477s + 114479p + 76m = 1-shanten chiitoi',
  hand({ sou:'114477', pin:'114479', man:'76' }), 1);

run('114477s + 14479p + 76m + 1z = 2-shanten chiitoi',
  hand({ sou:'114477', pin:'14479', man:'76', honors:'1' }), 2);

run('114477s + 13479p + 76m + 1z = 3-shanten chiitoi',
  hand({ sou:'114477', pin:'13479', man:'76', honors:'1' }), 3);

// Note: cases with expected ≥ 4 removed — for those hands the standard path
// gives a lower shanten than the chiitoitsu path, so our 3-way minimum
// disagrees with Python's single-path chiitoitsu test.

// ─────────────────────────────────────────────────────────────────────────────
// 5. Kokushi path — pure terminal/honour hands where kokushi wins
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Kokushi path ──');

run('19s + 19p + 19m + 12345677z = complete kokushi (-1)',
  hand({ sou:'19', pin:'19', man:'19', honors:'12345677' }), -1);

run('129s + 19p + 19m + 1234567z = 0-shanten kokushi',
  hand({ sou:'129', pin:'19', man:'19', honors:'1234567' }), 0);

run('129s + 129p + 19m + 123456z = 1-shanten kokushi',
  hand({ sou:'129', pin:'129', man:'19', honors:'123456' }), 1);

// Note: higher-shanten kokushi cases removed — for mixed hands the standard
// path dominates, so 3-way minimum ≠ single-path kokushi test value.

// ─────────────────────────────────────────────────────────────────────────────
// 6. Open hand shanten (with melds)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Open hands ──');

// 1 meld → 11 concealed tiles, setsNeeded = 3
// 11 tiles + 1 meld: pair=99s, sets=123s+123m+456m — hand is complete
run('1 meld: 12399s + 123456m (complete)',
  hand({ sou:'12399', man:'123456' }), -1, 1);

// 2 melds → 8 concealed tiles, setsNeeded = 2
run('2 melds: 123s + 345m + 44p (tenpai)',
  hand({ sou:'123', man:'345', pin:'44' }), -1, 2);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${pass}/${pass + fail} passed${fail > 0 ? ` — ${fail} FAILED` : ' ✅'}`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log(f)); }
console.log(`${'─'.repeat(60)}\n`);
