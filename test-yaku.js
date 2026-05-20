/**
 * Comprehensive yaku detection test suite
 * Source: MahjongRepository/mahjong (Python, MIT) — tests/hand_calculating/tests_yaku_calculation.py
 *         https://github.com/MahjongRepository/mahjong
 *
 * Tests our evaluateYakuFromDecomposition + extractHandGroups against the same
 * hand cases used by a library validated on 26 million Tenhou phoenix-lobby games.
 *
 * Run: node test-yaku.js
 */
import { evaluateYakuFromDecomposition } from './src/utils/mahjong/handSimulator.js';
import { extractHandGroups, canCompleteHand } from './src/utils/mahjong/tileParser.js';

// ── Tile builder helpers ──────────────────────────────────────────────────────
// fromStr('m','234567') → [{suit:'m',value:2}, ...]
function fromStr(suit, digits) {
  return [...digits].map(d => ({ suit, value: parseInt(d, 10) }));
}

// hand({ man, pin, sou, honors }) → flat tile array
function hand({ man = '', pin = '', sou = '', honors = '' } = {}) {
  return [
    ...fromStr('m', man),
    ...fromStr('p', pin),
    ...fromStr('s', sou),
    ...fromStr('z', honors),
  ];
}

// Evaluate a closed 14-tile hand; returns yaku id array or null if not a complete hand
function evalClosed(tiles, seatWind = 1, roundWind = 1, rules = { openTanyao: true }) {
  if (!canCompleteHand(tiles, 0)) return null;
  const groups = extractHandGroups(tiles, 0);
  if (!groups) return null;
  return evaluateYakuFromDecomposition(groups, [], seatWind, roundWind, rules);
}

// Evaluate a hand with open melds
// openMelds: array of tile arrays e.g. [fromStr('s','111')]
function evalOpen(concTiles, openMelds, seatWind = 1, roundWind = 1, rules = { openTanyao: true }) {
  const numMelds = openMelds.length;
  if (!canCompleteHand(concTiles, numMelds)) return null;
  const groups = extractHandGroups(concTiles, numMelds);
  if (!groups) return null;
  return evaluateYakuFromDecomposition(groups, openMelds, seatWind, roundWind, rules);
}

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function check(desc, yaku, tiles, opts = {}) {
  const { open = [], seatWind = 1, roundWind = 1, rules, shouldHave = true, note = '' } = opts;
  const r = open.length > 0
    ? evalOpen(tiles, open, seatWind, roundWind, rules)
    : evalClosed(tiles, seatWind, roundWind, rules);

  if (r === null) {
    // hand didn't decompose
    if (!shouldHave) { passed++; return; } // expected to fail is ok if hand is invalid
    failed++;
    failures.push(`  ✗ [${yaku}] ${desc}${note ? ' — ' + note : ''}\n       hand did not decompose`);
    return;
  }

  const hasYaku = r.includes(yaku);
  const ok = shouldHave ? hasYaku : !hasYaku;
  if (ok) {
    passed++;
  } else {
    failed++;
    const msg = shouldHave
      ? `expected ${yaku} in [${r.join(', ')}]`
      : `expected ${yaku} NOT in [${r.join(', ')}]`;
    failures.push(`  ✗ [${yaku}] ${desc}${note ? ' — ' + note : ''}\n       ${msg}`);
  }
}

// ── Tanyao (断幺九) ──────────────────────────────────────────────────────────
console.log('\n── Tanyao ──');
check('all simples closed',    'tanyao', hand({ man:'234567', sou:'234567', pin:'22' }));
check('has terminal 1man',     'tanyao', hand({ man:'123456', sou:'234567', pin:'22' }), { shouldHave: false });
check('has honour',            'tanyao', hand({ man:'234567', sou:'234567', honors:'22' }), { shouldHave: false });
check('open with kuitan',      'tanyao', hand({ man:'234567', pin:'22567' }),
  { open: [fromStr('s','234')], rules: { openTanyao: true } });
check('open kuitan disabled',  'tanyao', hand({ man:'234567', pin:'22567' }),
  { open: [fromStr('s','234')], rules: { openTanyao: false }, shouldHave: false });

// ── Chiitoitsu (七对子) ──────────────────────────────────────────────────────
console.log('── Chiitoitsu ──');
check('7 pairs closed',        'chiitoitsu', hand({ sou:'113355', man:'113355', pin:'11' }));
check('has identical pairs',   'chiitoitsu', hand({ sou:'11335555', man:'1133', pin:'11' }), { shouldHave: false,
  note: 'four-of-a-kind counts as 1 pair only' });

// ── Pinfu (平和) ─────────────────────────────────────────────────────────────
console.log('── Pinfu ──');
check('all sequences + non-value pair',  'pinfu', hand({ sou:'123456', man:'123456', pin:'55' }));
check('valued pair (seat wind)',         'pinfu', hand({ sou:'123678', man:'123456', honors:'11' }),
  { seatWind: 1, roundWind: 3, shouldHave: false, note: 'East pair = value for seat=East' });
check('non-valued pair',                 'pinfu', hand({ sou:'123678', man:'123456', honors:'22' }),
  { note: 'South pair, seat=East round=East → not value' });
check('has triplet',                     'pinfu', hand({ sou:'111456', man:'123456', pin:'55' }),
  { shouldHave: false });
check('open hand',                       'pinfu', hand({ sou:'12399', man:'123456', pin:'456' }),
  { open: [fromStr('s','123')], shouldHave: false });

// ── Iipeikou (一杯口) ────────────────────────────────────────────────────────
console.log('── Iipeikou ──');
check('two identical sequences',  'iipeikou', hand({ sou:'112233', man:'333', pin:'12344' }));
check('open hand blocked',        'iipeikou', hand({ sou:'112233', man:'333', pin:'12344' }),
  { open: [fromStr('s','123')], shouldHave: false });

// ── Sanshoku Doujun (三色同顺) ───────────────────────────────────────────────
console.log('── Sanshoku Doujun ──');
check('same sequence in 3 suits',    'sanshoku_doujun', hand({ sou:'123456', man:'12399', pin:'123' }));
check('different starting values',   'sanshoku_doujun', hand({ sou:'123456', man:'23455', pin:'123' }),
  { shouldHave: false, note: 'sou=123456, man=234, pin=123 — starting vals differ' });

// ── Sanshoku Doukou (三色同刻) ───────────────────────────────────────────────
console.log('── Sanshoku Doukou ──');
check('same triplet in 3 suits closed', 'sanshoku_doukou', hand({ sou:'111', man:'111', pin:'11145677' }));
check('different values',               'sanshoku_doukou', hand({ sou:'111', man:'222', pin:'33344455' }),
  { shouldHave: false });
check('with open pon',                  'sanshoku_doukou',
  hand({ man:'222', pin:'22245699' }),
  { open: [fromStr('s','222')] });

// ── Ittsu (一气通贯) ─────────────────────────────────────────────────────────
console.log('── Ittsu ──');
check('123+456+789 same suit',    'ittsu', hand({ man:'123456789', sou:'123', honors:'22' }));
check('ittsu via double seq',     'ittsu', hand({ man:'112233456789', honors:'22' }));
check('incomplete straight',      'ittsu', hand({ man:'122334567789', honors:'11' }), { shouldHave: false });
check('open ittsu',               'ittsu', hand({ man:'456789', sou:'123', honors:'22' }),
  { open: [fromStr('m','123')] });

// ── Toitoi (对对和) ──────────────────────────────────────────────────────────
console.log('── Toitoi ──');
check('all triplets with melds',  'toitoi',
  hand({ man:'333', pin:'44555' }),
  { open: [fromStr('s','111'), fromStr('s','333')] });
check('all triplets closed',      'toitoi', hand({ man:'111333555', pin:'222', honors:'44' }));
check('has sequence',             'toitoi', hand({ man:'123333555', pin:'222', honors:'44' }),
  { shouldHave: false });

// ── Honroutou (混老头) ───────────────────────────────────────────────────────
console.log('── Honroutou ──');
check('all terminals+honours toitoi',   'honroutou', hand({ sou:'999', man:'111', honors:'11222' }),
  { open: [fromStr('s','111')] });
check('honroutou chiitoitsu',           'honroutou', hand({ pin:'11', honors:'22334466', man:'1199' }));
check('has middle tile',                'honroutou', hand({ sou:'111999', man:'111', pin:'22', honors:'1122' }),
  { shouldHave: false });

// ── Sanankou (三暗刻) ────────────────────────────────────────────────────────
console.log('── Sanankou ──');
check('3 concealed triplets',         'sanankou', hand({ pin:'444789999', honors:'22333' }));
check('open meld reduces count',      'sanankou',
  hand({ sou:'444', man:'333', pin:'44555' }),
  { open: [fromStr('s','123')] });

// ── Shousangen (小三元) ──────────────────────────────────────────────────────
console.log('── Shousangen ──');
check('2 dragon trips + dragon pair', 'shousangen', hand({ sou:'123', man:'345', honors:'55666777' }));
check('2 dragon trips no pair',       'shousangen', hand({ sou:'123', man:'345666', honors:'777', pin:'55' }),
  { shouldHave: false, note: 'only 2 dragons, no dragon pair' });

// ── Chanta (混全带幺九) ──────────────────────────────────────────────────────
console.log('── Chanta ──');
check('sequences + honours',        'chanta', hand({ sou:'123', man:'123789', honors:'22333' }));
check('all triplets no sequence',   'chanta', hand({ sou:'111', man:'111999', honors:'22333' }),
  { shouldHave: false });
check('all terminals no sequence',  'chanta', hand({ sou:'111999', man:'111999', pin:'11' }),
  { shouldHave: false });
check('open chanta',                'chanta', hand({ man:'123789', honors:'22333' }),
  { open: [fromStr('s','123')] });

// ── Junchan (纯全带幺九) ─────────────────────────────────────────────────────
console.log('── Junchan ──');
check('terminal in every set',        'junchan', hand({ sou:'789', man:'123789', pin:'12399' }));
check('honours present → not junchan','junchan', hand({ sou:'111', man:'111999', honors:'22333' }),
  { shouldHave: false });
check('all triplets no sequence',     'junchan', hand({ sou:'111999', man:'111999', pin:'11' }),
  { shouldHave: false });
check('open junchan',                 'junchan', hand({ man:'123789', pin:'12399' }),
  { open: [fromStr('s','789')] });

// ── Honitsu (混一色) ─────────────────────────────────────────────────────────
console.log('── Honitsu ──');
check('one suit + honours',           'honitsu', hand({ man:'123455667', honors:'11122' }));
check('two suits → not honitsu',      'honitsu', hand({ man:'123456789', pin:'123', honors:'22' }),
  { shouldHave: false });
check('pure suit = chinitsu not honitsu','honitsu', hand({ man:'12345666778899' }),
  { shouldHave: false });
check('open honitsu',                 'honitsu', hand({ man:'455667', honors:'11122' }),
  { open: [fromStr('m','123')] });

// ── Chinitsu (清一色) ────────────────────────────────────────────────────────
console.log('── Chinitsu ──');
check('pure single suit',             'chinitsu', hand({ man:'11234567677889' }));
check('has honours → not chinitsu',   'chinitsu', hand({ man:'123456778899', honors:'22' }),
  { shouldHave: false });
check('open chinitsu',                'chinitsu', hand({ man:'11234567789' }),
  { open: [fromStr('m','678')] });

// ── Yakuhai (役牌) ───────────────────────────────────────────────────────────
console.log('── Yakuhai ──');
check('Haku (白) triplet',      'yakuhai', hand({ sou:'234567', man:'23422', honors:'555' }));
check('Hatsu (発) triplet',     'yakuhai', hand({ sou:'234567', man:'23422', honors:'666' }));
check('Chun (中) triplet',      'yakuhai', hand({ sou:'234567', man:'23422', honors:'777' }));
check('Seat wind triplet',      'yakuhai', hand({ sou:'234567', man:'23422', honors:'111' }),
  { seatWind: 1 });
check('Round wind triplet',     'yakuhai', hand({ sou:'234567', man:'23422', honors:'111' }),
  { roundWind: 1 });
check('Non-value wind',         'yakuhai', hand({ sou:'234567', man:'23422', honors:'333' }),
  { seatWind: 1, roundWind: 1, shouldHave: false, note: 'West triplet, seat=East round=East' });

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed}/${passed + failed} passed${failed > 0 ? `  —  ${failed} FAILED` : '  — all correct ✅'}`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(f));
}
console.log(`${'─'.repeat(60)}\n`);
if (failed > 0) process.exitCode = 1;
