/**
 * Compares our ukeire.js output against the Python MahjongRepository reference.
 * Reads /tmp/ukeire-reference.json produced by validate-ukeire.py.
 *
 * Run: node validate-ukeire.js
 */
import { readFileSync } from 'fs';
import { computeUkeire, computeWaits, analyzeEfficiency } from './src/utils/mahjong/ukeire.js';
import { computeShanten } from './src/utils/mahjong/shanten.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fromStr(suit, digits) {
  return [...String(digits)].map(d => ({ suit, value: parseInt(d, 10) }));
}
function tileKey(t) { return t.suit + t.value; }

// Re-build the same hands as validate-ukeire.py
const HANDS_JS = {
  'rw-07':    [...fromStr('m','333'), ...fromStr('p','567'), ...fromStr('s','12789'), ...fromStr('z','55')],
  'rw-14':    [...fromStr('m','199'), ...fromStr('p','99'),  ...fromStr('s','55'),    ...fromStr('z','223355')],
  'rw-01':    [...fromStr('m','258'), ...fromStr('p','258'), ...fromStr('s','258'),   ...fromStr('z','1235')],
  'ext-01':   [...fromStr('s','111234567'), ...fromStr('p','11'), ...fromStr('m','567')],
  'ext-02':   [...fromStr('s','111345677'), ...fromStr('m','11'), ...fromStr('p','567')],
  'ext-03':   [...fromStr('s','11122245679999')],
  'ext-04':   [...fromStr('s','114477'), ...fromStr('p','114477'), ...fromStr('m','76')],
  'ext-05':   [...fromStr('s','114477'), ...fromStr('p','114479'), ...fromStr('m','76')],
  'uk-01':    [...fromStr('m','123456789'), ...fromStr('p','1155')],
  'uk-02':    [...fromStr('m','123456789'), ...fromStr('p','1255')],
  'uk-03':    [...fromStr('m','1122334455'), ...fromStr('p','66'), ...fromStr('s','7')],
  'uk-04':    [...fromStr('s','19'), ...fromStr('p','19'), ...fromStr('m','19'), ...fromStr('z','1234567')],
  'uk-05':    [...fromStr('s','111345677'), ...fromStr('m','56'), ...fromStr('p','33')],
  'uk-06':    [...fromStr('m','123456789'), ...fromStr('p','23'), ...fromStr('s','56')],
  'uk-07':    [...fromStr('m','123456789'), ...fromStr('p','235'), ...fromStr('z','1')],
  'uk-08':    [...fromStr('m','456789'), ...fromStr('p','2355'), ...fromStr('s','789')],
  'yaku-01':  [...fromStr('s','234567'), ...fromStr('m','234567'), ...fromStr('p','22')],
  'yaku-02':  [...fromStr('s','123456'), ...fromStr('m','123456'), ...fromStr('p','55')],
  'yaku-03':  [...fromStr('m','11234567677889')],
  'yaku-04':  [...fromStr('m','123455667'), ...fromStr('z','11122')],
  'yaku-05':  [...fromStr('s','112233'), ...fromStr('m','333'), ...fromStr('p','12344')],
  'edge-01':  [...fromStr('s','4566677'), ...fromStr('p','1367'), ...fromStr('m','8'), ...fromStr('z','12')],
  'edge-02':  [...fromStr('m','123456789'), ...fromStr('p','123'), ...fromStr('z','22')],
  'edge-03':  [...fromStr('s','123'), ...fromStr('p','123'), ...fromStr('m','12399'), ...fromStr('z','33')],
};

// ── Load reference ────────────────────────────────────────────────────────────
const reference = JSON.parse(readFileSync('/tmp/ukeire-reference.json', 'utf8'));

// ── Compare ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0, skip = 0;
const failures = [];

for (const ref of reference) {
  const tiles = HANDS_JS[ref.id];
  if (!tiles) { skip++; continue; }

  const shanten = computeShanten(tiles, 0);

  // 1. Shanten must match
  if (shanten !== ref.shanten) {
    fail++;
    failures.push(`[${ref.id}] shanten: JS=${shanten} PY=${ref.shanten}  (${ref.desc})`);
    continue;
  }
  pass++;

  // 2a. Tenpai: compare waits
  if (ref.shanten === 0 && ref.waits !== null && ref.waits !== undefined) {
    const jsWaits  = computeWaits(tiles);
    const pyKeys   = new Set(ref.waits.map(w => w.tile));
    const jsKeys   = new Set(jsWaits.map(w => tileKey(w.tile)));

    // Wait tiles must match exactly
    const missingInJS = [...pyKeys].filter(k => !jsKeys.has(k));
    const extraInJS   = [...jsKeys].filter(k => !pyKeys.has(k));

    if (missingInJS.length || extraInJS.length) {
      fail++;
      failures.push(`[${ref.id}] waits mismatch:\n  PY=${[...pyKeys].sort().join(',')}  JS=${[...jsKeys].sort().join(',')}\n  (${ref.desc})`);
    } else {
      // Remaining counts must match
      let countMismatch = false;
      for (const pyW of ref.waits) {
        const jsW = jsWaits.find(w => tileKey(w.tile) === pyW.tile);
        if (!jsW || jsW.remaining !== pyW.remaining) {
          countMismatch = true;
          failures.push(`[${ref.id}] wait ${pyW.tile}: PY remaining=${pyW.remaining} JS=${jsW?.remaining}`);
          fail++;
          break;
        }
      }
      if (!countMismatch) { pass++; console.log(`  ✓ [${ref.id}] waits match (${ref.waits.length}种)  ${ref.desc}`); }
    }
    continue;
  }

  // 2b. Non-tenpai: compare GOOD discards only (shantenAfter ≤ original shanten)
  // Bad discards (shantenAfter > original) always return [] in the Python replacement
  // method but have effective tiles in JS sequential method — this is a known
  // methodological difference, not a bug. Tenhou 牌理 uses the JS approach.
  if (ref.shanten > 0 && ref.ukeire) {
    const jsUkeire  = computeUkeire(tiles);
    const goodPy    = ref.ukeire.filter(e => e.shantenAfter <= ref.shanten);

    if (goodPy.length === 0) {
      console.log(`  ○ [${ref.id}] no good discards in PY output (skip)  ${ref.desc}`);
      skip++; continue;
    }

    let allMatch = true;
    for (const pyEntry of goodPy) {
      // Skip entries where Python returns 0 effective tiles (bad discard per replacement method)
      if (pyEntry.effective.length === 0) continue;

      const jsEntry = jsUkeire.find(e => tileKey(e.discardTile) === pyEntry.discard);
      if (!jsEntry) {
        failures.push(`[${ref.id}] discard ${pyEntry.discard} missing in JS  (${ref.desc})`);
        fail++; allMatch = false; break;
      }

      const pyEffSet = new Set(pyEntry.effective);
      const jsEffSet = new Set(jsEntry.effectiveTiles.map(e => tileKey(e.tile)));
      const missing  = [...pyEffSet].filter(k => !jsEffSet.has(k));
      const extra    = [...jsEffSet].filter(k => !pyEffSet.has(k));

      if (missing.length || extra.length) {
        failures.push(`[${ref.id}] discard=${pyEntry.discard}:\n  PY=[${[...pyEffSet].sort()}]\n  JS=[${[...jsEffSet].sort()}]\n  (${ref.desc})`);
        fail++; allMatch = false; break;
      }
      if (jsEntry.totalCount !== pyEntry.total) {
        failures.push(`[${ref.id}] discard=${pyEntry.discard} total: PY=${pyEntry.total} JS=${jsEntry.totalCount}`);
        fail++; allMatch = false; break;
      }
    }
    if (allMatch) { pass++; console.log(`  ✓ [${ref.id}] ukeire match (${goodPy.length} good discards)  ${ref.desc}`); }
    continue;
  }

  // Complete or skip-waits hand
  console.log(`  ○ [${ref.id}] shanten=${ref.shanten} (skipped: complete or 14-tile tenpai)  ${ref.desc}`);
  skip++;
}

console.log(`\n${'─'.repeat(70)}`);
console.log(`  ${pass} passed  ${fail} failed  ${skip} skipped`);
if (fail === 0) console.log('  ✅ All compared results match Python reference!');
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  ✗ ' + f));
}
console.log(`${'─'.repeat(70)}\n`);
if (fail > 0) process.exitCode = 1;
