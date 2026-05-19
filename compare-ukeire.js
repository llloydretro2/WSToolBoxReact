/**
 * Our ukeire.js output for the SAME hands as compare-ukeire.py.
 * Run both and diff the results.
 *
 * Usage: npx vite-node compare-ukeire.js
 */
import { computeUkeire, computeWaits, analyzeEfficiency } from './src/utils/mahjong/ukeire.js';
import { computeShanten } from './src/utils/mahjong/shanten.js';

function fromStr(suit, digits) {
  return [...String(digits)].map(d => ({ suit, value: parseInt(d, 10) }));
}
function hand({ man = '', pin = '', sou = '', honors = '' } = {}) {
  return [...fromStr('m',man), ...fromStr('p',pin), ...fromStr('s',sou), ...fromStr('z',honors)];
}
function label(t) {
  const names = {1:'東',2:'南',3:'西',4:'北',5:'白',6:'發',7:'中'};
  if (t.suit === 'z') return names[t.value];
  return `${t.value}${'万饼索'['mps'.indexOf(t.suit)]}`;
}

function printUkeire(results, header = '') {
  console.log(`\n${'─'.repeat(60)}`);
  if (header) console.log(`  ${header}`);
  console.log(`  ${'打出'.padEnd(6)}  ${'向听后'.padStart(4)}  ${'种类'.padStart(4)}  ${'张数'.padStart(4)}  有效牌`);
  console.log(`  ${'─'.repeat(56)}`);
  for (const r of results.slice(0, 5)) {
    const disc = `[${label(r.discardTile)}]`;
    const eff  = r.effectiveTiles.map(e => `${label(e.tile)}×${e.remaining}`).join(' ');
    console.log(`  ${disc.padEnd(6)}  ${String(r.shantenAfter).padStart(6)}  ${String(r.kinds).padStart(6)}  ${String(r.totalCount).padStart(6)}  ${eff || '—'}`);
  }
}

function printWaits(waits, header = '') {
  const total = waits.reduce((s, e) => s + e.remaining, 0);
  console.log(`\n  ${header}  待ち牌 (${waits.length}种 · ${total}张)`);
  waits.forEach(w => process.stdout.write(`    [${label(w.tile)}] ×${w.remaining}`));
  console.log();
}

// ── Same test hands as compare-ukeire.py ─────────────────────────────────────

const HANDS = [
  { id: 'H1', desc: '1向听 — 有孤立字牌 (1-9万+235饼+东)',
    tiles: hand({ man: '123456789', pin: '235', honors: '1' }) },
  { id: 'H2', desc: '听牌 — 双碰 (1-9万+1155饼)',
    tiles: hand({ man: '123456789', pin: '1155' }) },
  { id: 'H3', desc: '听牌 — 单骑 (1-9万+1255饼)',
    tiles: hand({ man: '123456789', pin: '1255' }) },
  { id: 'H4', desc: '1向听 — 两组顺子候补 (123m+456m+789m+23p+56s)',
    tiles: hand({ man: '123456789', pin: '23', sou: '56' }) },
  { id: 'H5', desc: '2向听 — 复杂混合手 (456m+789m+23p+55p+789s)',
    tiles: hand({ man: '456789', pin: '2355', sou: '789' }) },
];

for (const h of HANDS) {
  const melds = h.melds ?? [];
  const sh    = computeShanten(h.tiles, melds.length);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${h.id}: ${h.desc}`);
  console.log(`  向听数: ${sh}  (tiles: ${h.tiles.length}  melds: ${melds.length})`);

  if (sh > 0) {
    const u = computeUkeire(h.tiles, melds);
    printUkeire(u, '前5打法（最多显示5行）:');
  } else if (sh === 0) {
    const w = computeWaits(h.tiles, melds);
    printWaits(w);
  } else {
    console.log('  → 已和牌');
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('  ✅ JS ukeire output complete.');
console.log(`${'='.repeat(60)}\n`);
