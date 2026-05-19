/**
 * Ukeire (有効牌) — effective tile enumeration for Riichi Mahjong.
 *
 * For a given hand, computes:
 *   computeUkeire  — for each possible discard, which tiles improve shanten
 *   computeWaits   — for a tenpai hand, which tiles complete the hand
 *
 * "Remaining" counts assume only tiles visible in the current hand
 * (concealed + open melds). Discard-pile tiles are unknown in a static
 * hand analyser, so remaining = 4 − (copies in hand).
 *
 * Algorithm complexity: O(uniqueDiscards × 34) shanten calls.
 * For a 13-tile hand: ≤13 discards × 34 draws ≈ 442 calls, < 200ms sync.
 */

import { computeShanten }                    from './shanten.js';
import { groupTiles, tileKey, parseTileKey } from './tileParser.js';

// ── All 34 tile types ─────────────────────────────────────────────────────────

const ALL_34 = [
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'm', value: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'p', value: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 's', value: i + 1 })),
  ...Array.from({ length: 7 }, (_, i) => ({ suit: 'z', value: i + 1 })),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function removeOne(tiles, key) {
  let removed = false;
  return tiles.filter(t => {
    if (!removed && tileKey(t) === key) { removed = true; return false; }
    return true;
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute ukeire for each possible discard from the concealed hand.
 *
 * @param {tile[]} concealedTiles
 * @param {tile[][]} openMelds
 * @returns {UkeireEntry[]} sorted best-first (lowest shantenAfter, then highest totalCount)
 *
 * UkeireEntry shape:
 *   discardTile   — the tile being discarded
 *   shantenAfter  — shanten of the hand after the discard
 *   effectiveTiles — [{tile, remaining}] tiles that further reduce shanten
 *   totalCount    — sum of remaining counts across effectiveTiles
 *   kinds         — number of distinct effective tile types
 */
export function computeUkeire(concealedTiles, openMelds = []) {
  const numMelds = openMelds.length;

  if (concealedTiles.length === 0) return [];

  // How many of each tile are already in the full hand (for remaining count)
  const inHand = groupTiles([...concealedTiles, ...openMelds.flat()]);

  // Tenhou 牌理 condition: effective tile p for discard k is one where
  //   shanten(original - k + p) == originalShanten - 1
  // This uses the ORIGINAL shanten as baseline, not the post-discard shanten.
  // Using post-discard shanten incorrectly includes "recovery" tiles for bad discards.
  const originalShanten = computeShanten(concealedTiles, numMelds);

  const seen = new Set();
  const results = [];

  for (const tile of concealedTiles) {
    const key = tileKey(tile);
    if (seen.has(key)) continue;
    seen.add(key);

    const afterDiscard = removeOne(concealedTiles, key);
    const effectiveTiles = [];
    let shantenAfter = computeShanten(afterDiscard, numMelds);

    for (const draw of ALL_34) {
      const dk        = tileKey(draw);
      const remaining = 4 - (inHand[dk] || 0);
      if (remaining <= 0) continue;

      const afterDraw = [...afterDiscard, draw];
      const sh        = computeShanten(afterDraw, numMelds);
      // Match Tenhou: effective only if replacement hand improves vs ORIGINAL shanten
      if (sh < originalShanten) {
        effectiveTiles.push({ tile: draw, remaining });
        if (sh < shantenAfter) shantenAfter = sh;
      }
    }

    results.push({
      discardTile: tile,
      shantenAfter,
      effectiveTiles,
      totalCount: effectiveTiles.reduce((s, e) => s + e.remaining, 0),
      kinds:      effectiveTiles.length,
    });
  }

  // Sort by totalCount descending — matches Tenhou 牌理's sort order.
  // Higher count = more tiles available to draw next turn = Tenhou's optimality criterion.
  return results.sort((a, b) => b.totalCount - a.totalCount);
}

/**
 * Compute winning tiles (待ち牌) for a tenpai hand (shanten = 0).
 * Returns all tiles that complete the hand (shanten → -1).
 *
 * @param {tile[]} concealedTiles
 * @param {tile[][]} openMelds
 * @returns {WaitEntry[]} sorted by tile suit/value
 *
 * WaitEntry shape: { tile, remaining }
 */
export function computeWaits(concealedTiles, openMelds = []) {
  const numMelds = openMelds.length;
  const inHand   = groupTiles([...concealedTiles, ...openMelds.flat()]);
  const waits    = [];

  for (const tile of ALL_34) {
    const key       = tileKey(tile);
    const remaining = 4 - (inHand[key] || 0);
    if (remaining <= 0) continue;

    if (computeShanten([...concealedTiles, tile], numMelds) === -1) {
      waits.push({ tile, remaining });
    }
  }

  return waits;
}

/**
 * Convenience: compute both ukeire and waits in one call.
 * Returns { shanten, ukeire, waits } where:
 *   - shanten = current shanten number
 *   - ukeire  = computeUkeire result (empty when shanten ≤ 0)
 *   - waits   = computeWaits result  (empty when shanten ≠ 0)
 */
export function analyzeEfficiency(concealedTiles, openMelds = []) {
  const numMelds = openMelds.length;
  const shanten  = computeShanten(concealedTiles, numMelds);

  return {
    shanten,
    ukeire: shanten > 0  ? computeUkeire(concealedTiles, openMelds) : [],
    waits:  shanten === 0 ? computeWaits(concealedTiles, openMelds)  : [],
  };
}
