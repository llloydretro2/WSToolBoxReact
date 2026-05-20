/**
 * Comprehensive fu calculation test suite.
 * Source: MahjongRepository/mahjong — tests/hand_calculating/tests_fu_calculation.py
 *
 * Run: node test-fu.js
 */
import { computeFu } from './src/utils/mahjong/scoring.js';
import { extractAllHandGroups } from './src/utils/mahjong/tileParser.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fromStr(suit, digits) {
  return [...digits].map(d => ({ suit, value: parseInt(d, 10) }));
}
function hand({ man='', pin='', sou='', honors='' } = {}) {
  return [...fromStr('m',man), ...fromStr('p',pin), ...fromStr('s',sou), ...fromStr('z',honors)];
}
function t(suit, value) { return { suit, value }; }

// Get first valid decomposition
function decompose(tiles, melds = []) {
  const all = extractAllHandGroups(tiles, melds.length);
  return all[0] ?? null;
}

// Manually build concealedGroups when extractAllHandGroups won't work (e.g. kans)
function groups(...sets) { return sets; }

let pass = 0, fail = 0;
const failures = [];
function check(desc, got, expected) {
  const ok = got === expected;
  ok ? pass++ : (fail++, failures.push(`  ✗ ${desc}: expected ${expected}, got ${got}`));
}

const SW = 1, RW = 1; // seat=East, round=East

// ── 1. Chiitoitsu: always 25 ──────────────────────────────────────────────────
{
  const h = hand({ sou:'112244', man:'115599', pin:'6' }); // 13 tiles
  const drawn6p = t('p', 6);
  const h14 = [...h, drawn6p];
  const g = decompose(h14);
  if (g) {
    check('Chiitoitsu ron = 25',  computeFu(g, [], SW, RW, 'ron',   drawn6p), 25);
    check('Chiitoitsu tsumo = 25', computeFu(g, [], SW, RW, 'tsumo', drawn6p), 25);
  }
}

// ── 2. Pinfu ron = 30, tsumo = 20 ────────────────────────────────────────────
// 234567m + 2278s [67s waiting for 5s or 8s = ryanmen] + 11p pair
{
  const h = hand({ sou:'2278', man:'123456', pin:'123' }); // 13 tiles
  const drawn6s = t('s', 6); // ryanmen: 6 is low end of [678s] (low=6≤6 ✓)
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) {
    check('Pinfu ron = 30',  computeFu(g, [], SW, RW, 'ron',   drawn6s), 30);
    check('Pinfu tsumo = 20', computeFu(g, [], SW, RW, 'tsumo', drawn6s), 20);
  }
}

// ── 3. Tsumo not pinfu (has closed triplet 111p): 20+2+8 = 30 ────────────────
// 111p (closed terminal triplet=8fu), 123456m, 2278s + win 6s (ryanmen [678s])
{
  const h = hand({ sou:'2278', man:'123456', pin:'111' }); // 13 tiles
  const drawn6s = t('s', 6);
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) check('Tsumo not pinfu (111p closed terminal): 20+2+8=30',
    computeFu(g, [], SW, RW, 'tsumo', drawn6s), 30);
}

// ── 4. Penchan [12→3]: 30+2 = 40 ─────────────────────────────────────────────
// 123456m 12456s + 55p pair; win 3s → completes [123s] as high-end (high=3<4 → penchan)
{
  const h = hand({ man:'123456', sou:'12456', pin:'55' }); // 13 tiles
  const drawn3s = t('s', 3);
  const h14 = [...h, drawn3s];
  const g = decompose(h14);
  if (g) check('Penchan [12s→3s] (high=3<4): 30+2=40',
    computeFu(g, [], SW, RW, 'ron', drawn3s), 40);
}

// ── 5. Penchan [89→7]: 30+2 = 40 ─────────────────────────────────────────────
// 123456m 34589s + 55p pair; win 7s → completes [789s] as low-end (low=7>6 → penchan)
{
  const h = hand({ man:'123456', sou:'34589', pin:'55' }); // 13 tiles
  const drawn7s = t('s', 7);
  const h14 = [...h, drawn7s];
  const g = decompose(h14);
  if (g) check('Penchan [89s→7s] (low=7>6): 30+2=40',
    computeFu(g, [], SW, RW, 'ron', drawn7s), 40);
}

// ── 6. Kanchan [57→6]: 30+2 = 40 ─────────────────────────────────────────────
// 123456m + 12357s + 55p; win 6s → middle of [567s] → kanchan
{
  const h = hand({ man:'123456', sou:'12357', pin:'55' }); // 13 tiles
  const drawn6s = t('s', 6);
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) check('Kanchan [57s→6s] (middle): 30+2=40',
    computeFu(g, [], SW, RW, 'ron', drawn6s), 40);
}

// ── 7. Tanki (pair wait): 30+2 = 40 ──────────────────────────────────────────
// 123456s 123456m + 1p single; win 1p → tanki on [11p] pair
{
  const h = hand({ sou:'123678', man:'123456', pin:'1' }); // 13 tiles
  const drawn1p = t('p', 1);
  const h14 = [...h, drawn1p];
  const g = decompose(h14);
  if (g) check('Tanki [1p]: 30+2=40',
    computeFu(g, [], SW, RW, 'ron', drawn1p), 40);
}

// ── 8. Single valued pair (1z=East wind, SW=1): 30+2 = 40 ────────────────────
// 123456m + 12378s + 11z pair (seat wind East = value=1, valued pair +2)
// wait: 6s (ryanmen [678s]... low=6≤6 ✓)
{
  const h = hand({ man:'123456', sou:'12378', honors:'11' }); // 13 tiles, seat=East
  const drawn6s = t('s', 6);
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) check('Single wind pair (East=SW=1): 30+0+2=40',
    computeFu(g, [], 1, 2, 'ron', drawn6s), 40); // SW=1 only (RW=2≠SW)
}

// ── 9. Double valued pair (1z=East, SW=1 AND RW=1): 30+4 = 40 ───────────────
{
  const h = hand({ man:'123456', sou:'12378', honors:'11' }); // same hand
  const drawn6s = t('s', 6);
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) check('Double wind pair (East=SW=RW=1): 30+0+4=40',
    computeFu(g, [], 1, 1, 'ron', drawn6s), 40);
}

// ── 10. Closed simples pon (222s = 4fu): 30+4 = 40 ───────────────────────────
// 123456m + 22278s + 11p; win 6s → [678s] ryanmen (6≤6 ✓)
{
  const h = hand({ man:'123456', sou:'22278', pin:'11' }); // 13 tiles
  const drawn6s = t('s', 6);
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) check('Closed simples pon [222s] (4fu): 30+0+0+4=40',
    computeFu(g, [], SW, RW, 'ron', drawn6s), 40);
}

// ── 11. Closed terminal pon (111s = 8fu): 30+8 = 40 → wait makes 38→40 ───────
// 123456m + 11178s + 11p; win 6s → [678s] ryanmen
{
  const h = hand({ man:'123456', sou:'11178', pin:'11' }); // 13 tiles
  const drawn6s = t('s', 6);
  const h14 = [...h, drawn6s];
  const g = decompose(h14);
  if (g) check('Closed terminal pon [111s] (8fu): 30+0+0+8=38→40',
    computeFu(g, [], SW, RW, 'ron', drawn6s), 40);
}

// ── 12. Closed honor pon (111z East wind = 8fu): 30+8 = 40 ───────────────────
// honors "111" = 1z×3 (East wind, yaochu), 123456m, 1178s, pair=11p
{
  const h = hand({ man:'123456', sou:'1178', honors:'111', pin:'11' }); // 13 tiles? 6+4+3+2=15... too many
  // Fix: use only 4 non-honor tiles in sou
  const h2 = hand({ man:'123456', sou:'178', honors:'111', pin:'11' }); // 6+3+3+2=14, need 13
  // Actually: 13 tiles. man=6, sou=178, honors=111, pin=11: 6+3+3+2=14 (14≠13)
  // Let me use: man=1234, sou=6789, honors=111, pin=55 = 4+4+3+2=13 ✓
  const h3 = hand({ man:'1234', sou:'6789', honors:'111', pin:'55' }); // 4+4+3+2=13 tiles ✓
  // Win: need to complete; tenpai with [1234m]... pair=[55p], [111z](triplet), [6789s]?
  // Actually [6789s] is only 4 tiles which can form [678s]+[9s isolated] or [789s]+[6s isolated]
  // Let me use a simpler arrangement: man=123456, sou=278, honors=111, pin=55 = 6+3+3+2=14...
  // Too many. Let me just construct manually.

  // Manual: pair=55p, sets=[123m][456m][678s][111z(honors triplet)]
  const g = groups(
    [t('m',1),t('m',2),t('m',3)],      // 123m
    [t('m',4),t('m',5),t('m',6)],      // 456m
    [t('s',6),t('s',7),t('s',8)],      // 678s (ryanmen: drew 6s, low=6≤6 ✓)
    [t('z',1),t('z',1),t('z',1)],      // 111z (East wind, honor triplet, closed)
    [t('p',5),t('p',5)],               // pair 55p (non-value)
  );
  const drawn6s = t('s', 6);
  check('Closed honor pon [111z] (8fu): 30+0+0+8=38→40',
    computeFu(g, [], SW, RW, 'ron', drawn6s), 40);
}

// ── 13. Open terminal pon meld (honor 111z = 4fu): 20+4 = 24→30 ──────────────
// Meld: open pon 111z (East, honor, terminal → 4fu open)
// Concealed: 123456m + 2278s (8 tiles, 1 meld)
{
  const concTiles = [...fromStr('m','123456'), ...fromStr('s','2278')]; // 8 tiles
  const melds = [fromStr('z','111')]; // open pon East
  const drawn6s = t('s', 6);
  const concTiles14 = [...concTiles, drawn6s]; // 9 tiles = 3 sets + pair from conc
  const g = decompose(concTiles14, melds);
  if (g) check('Open honor pon [111z] (4fu): 20+0+0+4=24→30',
    computeFu(g, melds, SW, RW, 'ron', drawn6s), 30);
}

// ── 14. Closed simples kan (2222s = 4×4=16fu): 30+16 = 46→50 ─────────────────
// Manual groups: closed kan [2222s] (4-tile group in concealedGroups = closed)
{
  const g = groups(
    [t('m',1),t('m',2),t('m',3)],           // 123m
    [t('m',4),t('m',5),t('m',6)],           // 456m
    [t('s',2),t('s',2),t('s',2),t('s',2)],  // closed kan 2222s (simples, 4×4=16fu)
    [t('s',6),t('s',7),t('s',8)],           // 678s (ryanmen drew 6s)
    [t('p',1),t('p',1)],                    // pair 11p
  );
  const drawn6s = t('s', 6);
  check('Closed simples kan [2222s] (16fu): 30+0+0+16=46→50',
    computeFu(g, [], SW, RW, 'ron', drawn6s), 50);
}

// ── 15. Open simples kan (2222s open = 2×4=8fu): 20+8 = 28→30 ────────────────
{
  const conc = groups(
    [t('m',1),t('m',2),t('m',3)],
    [t('m',4),t('m',5),t('m',6)],
    [t('s',6),t('s',7),t('s',8)],
    [t('p',1),t('p',1)],
  );
  const openKan = [t('s',2),t('s',2),t('s',2),t('s',2)]; // open kan
  const drawn6s = t('s', 6);
  check('Open simples kan [2222s] (8fu): 20+0+0+8=28→30',
    computeFu(conc, [openKan], SW, RW, 'ron', drawn6s), 30);
}

// ── 16. Closed terminal kan (1111p = 8×4=32fu): 30+32 = 62→70 ────────────────
{
  const g = groups(
    [t('m',1),t('m',2),t('m',3)],
    [t('m',4),t('m',5),t('m',6)],
    [t('p',1),t('p',1),t('p',1),t('p',1)],  // closed kan terminal (8×4=32fu)
    [t('s',6),t('s',7),t('s',8)],
    [t('s',2),t('s',2)],
  );
  const drawn6s = t('s', 6);
  check('Closed terminal kan [1111p] (32fu): 30+0+0+32=62→70',
    computeFu(g, [], SW, RW, 'ron', drawn6s), 70);
}

// ── 17. Open terminal kan (1111p open = 4×4=16fu): 20+16 = 36→40 ─────────────
{
  const conc = groups(
    [t('m',1),t('m',2),t('m',3)],
    [t('m',4),t('m',5),t('m',6)],
    [t('s',6),t('s',7),t('s',8)],
    [t('s',2),t('s',2)],
  );
  const openKan = [t('p',1),t('p',1),t('p',1),t('p',1)];
  const drawn6s = t('s', 6);
  check('Open terminal kan [1111p] (16fu): 20+0+0+16=36→40',
    computeFu(conc, [openKan], SW, RW, 'ron', drawn6s), 40);
}

// ── 18. MahjongRepository test_incorrect_fu_calculation_test_case_1 ───────────
// tsumo, 111s(closed terminal=8fu) + 123456m (seqs) + 2278s → win 6s (ryanmen)
// Actually: sou="11123456777" man="234" — from the Python test
// man=234, sou=111+234+56+777... let me parse: sou="11123456777" = 1,1,1,2,3,4,5,6,7,7,7
// With man="234": man=3, sou=11, total=14 tiles
// Tenpai: sou=1112345677, man=234... tsumo on sou=4? Let me just test from Python:
// tiles: sou="11123456777", man="234", win tsumo sou="4"
// This means concealed had 13 tiles + drew sou=4
// Structure: man=234(seq) + sou=111(closed term trip=8fu)+234(seq)+567(seq)+77(pair)
{
  const h = hand({ sou:'1112345677', man:'234' }); // 13 tiles ✓
  const drawn4s = t('s', 4);
  const h14 = [...h, drawn4s];
  const g = decompose(h14);
  if (g) check('test_case_1: tsumo 111s(8fu)+seqs: 20+2+8=30',
    computeFu(g, [], 1, 1, 'tsumo', drawn4s), 30);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${pass}/${pass+fail} passed${fail > 0 ? ` — ${fail} FAILED` : ' ✅'}`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log(f)); }
console.log(`${'─'.repeat(60)}\n`);
if (fail > 0) process.exitCode = 1;
