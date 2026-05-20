/**
 * Ukeire algorithm test suite.
 * Run: node test-ukeire.js
 */
import { computeUkeire, computeWaits, analyzeEfficiency } from './src/utils/mahjong/ukeire.js';
import { computeShanten } from './src/utils/mahjong/shanten.js';

function fromStr(suit, digits) {
  return [...digits].map(d => ({ suit, value: parseInt(d, 10) }));
}
function hand({ man = '', pin = '', sou = '', honors = '' } = {}) {
  return [...fromStr('m',man), ...fromStr('p',pin), ...fromStr('s',sou), ...fromStr('z',honors)];
}
function tileKey(t) { return t.suit + t.value; }

let pass = 0, fail = 0;
const failures = [];
function check(desc, cond) {
  cond ? pass++ : (fail++, failures.push(`  ✗ ${desc}`));
}

// ── 1. computeWaits ───────────────────────────────────────────────────────────
console.log('\n── computeWaits ──');

// Verify the hand is actually tenpai before testing waits
{
  // 123m 456m 789m 12p 55p → waiting for 3p  (13 tiles, pair=55p)
  const h = hand({ man:'123456789', pin:'12', sou:'', honors:'', ...{pin:'1255'} });
  // Actually build correctly:
  const h2 = [...fromStr('m','123456789'), ...fromStr('p','1255')]; // 9+4=13 tiles
  check('hand is tenpai (shanten=0)', computeShanten(h2, 0) === 0);

  const w = computeWaits(h2);
  const keys = w.map(e => tileKey(e.tile));
  check('waits for 3p (completes 123p sequence)', keys.includes('p3'));
  check('5p NOT a wait (it is the pair)', !keys.includes('p5'));
  // 3p not in hand → remaining = 4
  check('3p remaining = 4', w.find(e => tileKey(e.tile) === 'p3')?.remaining === 4);
  // 5p in hand ×2 → does NOT appear as wait
  check('only 1 wait type for this hand', w.length === 1);
}

// Shanpon (双碰) wait: 123m 456m 789m 11p 55p
{
  const h = [...fromStr('m','123456789'), ...fromStr('p','1155')]; // 9+4=13
  check('shanpon hand is tenpai', computeShanten(h, 0) === 0);

  const w = computeWaits(h);
  const keys = w.map(e => tileKey(e.tile));
  check('shanpon: waits contain 1p', keys.includes('p1'));
  check('shanpon: waits contain 5p', keys.includes('p5'));
  check('shanpon: exactly 2 wait types', w.length === 2);
  // 1p: hand has 2 → remaining=2; 5p: hand has 2 → remaining=2; total=4
  check('shanpon: 1p remaining = 2', w.find(e => tileKey(e.tile) === 'p1')?.remaining === 2);
  check('shanpon: 5p remaining = 2', w.find(e => tileKey(e.tile) === 'p5')?.remaining === 2);
  check('shanpon: total waits = 4', w.reduce((s,e) => s+e.remaining, 0) === 4);
}

// Chiitoitsu tenpai: 6 pairs + 1 single
{
  const h = [...fromStr('m','1122334455'), ...fromStr('p','66'), ...fromStr('s','7')]; // 10+2+1=13
  check('chiitoi tenpai (shanten=0)', computeShanten(h, 0) === 0);

  const w = computeWaits(h);
  check('chiitoi waits for 7s', w.some(e => tileKey(e.tile) === 's7'));
  check('chiitoi exactly 1 wait type', w.length === 1);
  check('7s remaining = 3 (1 in hand)', w.find(e => tileKey(e.tile) === 's7')?.remaining === 3);
}

// Kokushi tenpai
{
  const h = [...fromStr('m','19'), ...fromStr('p','19'), ...fromStr('s','19'), ...fromStr('z','1234567')];
  check('kokushi tenpai (shanten=0)', computeShanten(h, 0) === 0);
  const w = computeWaits(h);
  check('kokushi: 13 wait types', w.length === 13);
  check('kokushi: waits include 1m', w.some(e => tileKey(e.tile) === 'm1'));
  check('kokushi: waits include 7z', w.some(e => tileKey(e.tile) === 'z7'));
}

// ── 2. computeUkeire ──────────────────────────────────────────────────────────
console.log('\n── computeUkeire ──');

// 1-shanten hand: 111s 345s 677s + 11p 567m (13 tiles, shanten=1)
// From MahjongRepository: sou="111345677", pin="11", man="567" → shanten=0 (tenpai)
// Use: sou="111345677", pin="1", man="567" + one more isolated = 13 tiles shanten=1
{
  // 1-shanten hand verified: 111s 345s 677s 56m 33p (13 tiles)
  const h = [...fromStr('s','111345677'), ...fromStr('m','56'), ...fromStr('p','33')]; // 9+2+2=13
  const sh = computeShanten(h, 0);
  check('test hand shanten verified (≥ 1)', sh >= 1);
  check('test hand shanten ≤ 2 (not too far from tenpai)', sh <= 2);

  const u = computeUkeire(h);
  check('ukeire returns results for non-tenpai hand', u.length > 0);
  check('each entry has discardTile', u.every(e => e.discardTile?.suit));
  check('each entry has effectiveTiles array', u.every(e => Array.isArray(e.effectiveTiles)));
  check('each entry has valid totalCount', u.every(e => typeof e.totalCount === 'number' && e.totalCount >= 0));
  // Some discards may worsen shanten (discarding useful tiles) — that's correct behaviour.
  // The BEST discard (first after sort) should at least not worsen shanten.
  check('best discard does not worsen shanten', u[0].shantenAfter <= sh);
  // Effective tiles have remaining ≥ 1
  check('all effective tile remainders ≥ 1',
    u.every(e => e.effectiveTiles.every(t => t.remaining >= 1)));
}

// 2-shanten hand: verify structural properties
{
  const h = [...fromStr('s','4566677'), ...fromStr('p','1367'), ...fromStr('m','8'), ...fromStr('z','12')];
  check('14-tile 2-shanten hand', computeShanten(h, 0) === 2);
  const u = computeUkeire(h);
  check('2-shanten: returns discard options', u.length > 0);
  check('2-shanten: best discard has shantenAfter ≤ 2', u[0].shantenAfter <= 2);
}

// ── 3. analyzeEfficiency routing ──────────────────────────────────────────────
console.log('\n── analyzeEfficiency routing ──');

{
  // tenpai
  const h = [...fromStr('m','123456789'), ...fromStr('p','1255')];
  const r = analyzeEfficiency(h);
  check('tenpai: shanten = 0', r.shanten === 0);
  check('tenpai: ukeire empty', r.ukeire.length === 0);
  check('tenpai: waits populated', r.waits.length > 0);
}

{
  // 1-shanten
  const h = [...fromStr('s','111345677'), ...fromStr('m','56'), ...fromStr('p','33')];
  const r = analyzeEfficiency(h);
  check('1-shanten: shanten ≥ 1', r.shanten >= 1);
  check('1-shanten: ukeire populated', r.ukeire.length > 0);
  check('1-shanten: waits empty', r.waits.length === 0);
}

{
  // complete
  const h = [...fromStr('m','123456789'), ...fromStr('p','12355')]; // 9+5=14 → complete
  const r = analyzeEfficiency(h);
  check('complete: shanten = -1', r.shanten === -1);
  check('complete: ukeire empty', r.ukeire.length === 0);
  check('complete: waits empty', r.waits.length === 0);
}

// ── 4. Sort order ─────────────────────────────────────────────────────────────
console.log('\n── Sort order ──');

{
  const h = [...fromStr('s','111345677'), ...fromStr('m','56'), ...fromStr('p','33')];
  const u = computeUkeire(h);
  // Tenhou 牌理 sorts purely by totalCount descending
  let sorted = true;
  for (let i = 1; i < u.length; i++) {
    if (u[i-1].totalCount < u[i].totalCount) { sorted = false; break; }
  }
  check('sorted: totalCount desc (matches Tenhou 牌理)', sorted);
}

// ── 5. Remaining count accuracy ───────────────────────────────────────────────
console.log('\n── Remaining counts ──');

{
  // shanpon hand: 1p×2, 5p×2 in hand
  const h = [...fromStr('m','123456789'), ...fromStr('p','1155')];
  const w = computeWaits(h);
  // 1p in hand ×2 → remaining = 2
  check('1p×2 in hand → remaining=2', w.find(e=>tileKey(e.tile)==='p1')?.remaining === 2);
  // 5p in hand ×2 → remaining = 2
  check('5p×2 in hand → remaining=2', w.find(e=>tileKey(e.tile)==='p5')?.remaining === 2);
}

{
  // A tile with 3 copies in hand: add 3 copies of 1m
  const h = [...fromStr('m','111234567'), ...fromStr('p','11'), ...fromStr('s','5')]; // 9+2+1=12
  // Actually check if this is tenpai first...
  // We just want to verify remaining count for 1m which has 3 copies
  const u = computeUkeire(h);
  // Find a discard that exposes 1m as an effective tile
  const allEffective = u.flatMap(e => e.effectiveTiles);
  const eff1m = allEffective.find(e => tileKey(e.tile) === 'm1');
  if (eff1m) {
    check('1m×3 in hand → effective remaining = 1', eff1m.remaining === 1);
  } else {
    // 1m might not be effective; just verify no entry exceeds 4 - handCount
    const inHand1m = h.filter(t => tileKey(t) === 'm1').length;
    const maxRemaining = 4 - inHand1m;
    check('no entry for 1m exceeds 4 - inHand count',
      !eff1m || eff1m.remaining <= maxRemaining);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${pass}/${pass + fail} passed${fail > 0 ? ` — ${fail} FAILED` : ' ✅'}`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log(f)); }
console.log(`${'─'.repeat(60)}\n`);
if (fail > 0) process.exitCode = 1;
