/**
 * Bounded BFS-based route search for the Mahjong Yaku Route Trainer.
 *
 * Replaces the hand-written heuristic scenario builders with a search that
 * actually enumerates legal tile sequences and validates completions.
 *
 * Design:
 *   - BFS over (discard, [intermediate-draw, discard]*, winning-draw) sequences.
 *   - State = concealed tiles at *waiting* count (13 − 3×N).
 *   - A BFS expansion: draw a non-winning tile then discard one → new waiting state.
 *   - A BFS leaf: draw a tile that completes the hand with the target yaku.
 *   - Intermediate draws are pruned to yaku-relevant candidates to keep the
 *     branching factor ≤ EXPAND_DRAWS × EXPAND_DISCARDS per level.
 *   - Hard caps: BFS_MAX_STATES states explored, BFS_MAX_DEPTH levels, 2 results max.
 *
 * For each yaku, per-yaku candidate generators restrict which draw and discard
 * tiles are tried. This makes the search fast and directional.
 *
 * Public API:
 *   searchYakuRoute(concealedTiles, openMelds, yakuId, seatWind, roundWind,
 *                   rules, maxDepth?, maxStates?) → BFSResult | null
 *
 *   computeShanten — now in shanten.js; re-exported here for back-compat.
 */

import {
  groupTiles, tileKey, parseTileKey, tileName,
  extractHandGroups,
} from './tileParser';
import {
  evaluateYakuFromDecomposition, extractYakuRelevantGroups,
  ALL_34_TILES,
} from './handSimulator';
// Re-export the accurate shanten implementation so callers that import it
// from yakuBFS continue to work without change.
export { computeShanten } from './shanten';

// ── Search constants ──────────────────────────────────────────────────────────

export const BFS_MAX_DEPTH   = 2;   // draw-discard cycles before the winning draw
export const BFS_MAX_STATES  = 280; // hard cap on total extractHandGroups calls
export const WIN_DRAW_CANDS  = 5;   // candidates tried as winning draw per state
export const EXPAND_DRAWS    = 3;   // intermediate draw candidates for expansion
export const EXPAND_DISCARDS = 3;   // discard candidates per expansion state

// ── Tile predicates ───────────────────────────────────────────────────────────

function isTerminal(t) { return t.suit !== 'z' && (t.value === 1 || t.value === 9); }
function isHonor(t)    { return t.suit === 'z'; }
function isTermOrHon(t){ return isTerminal(t) || isHonor(t); }

// ── Internal helpers ──────────────────────────────────────────────────────────

function removeOneTile(tiles, key) {
  let found = false;
  return tiles.filter(t => {
    if (!found && tileKey(t) === key) { found = true; return false; }
    return true;
  });
}

function getDominantSuit(tiles) {
  const c = { m: 0, p: 0, s: 0 };
  for (const t of tiles) if (c[t.suit] !== undefined) c[t.suit]++;
  return ['m', 'p', 's'].reduce((a, b) => (c[a] >= c[b] ? a : b));
}

// Canonical key for a tile multiset — used to deduplicate BFS states
function stateKey(tiles) {
  const g = groupTiles(tiles);
  return Object.keys(g).sort().map(k => `${k}${g[k]}`).join('');
}

// ── Per-yaku candidate generators ─────────────────────────────────────────────

/**
 * Return the N best discard candidates for this yaku.
 * Tiles that conflict with the yaku score higher.
 */
export function getDiscardCandidates(yakuId, tiles, seatWind, roundWind, maxN = EXPAND_DISCARDS) {
  const counts = groupTiles(tiles);
  const valZ   = new Set([5, 6, 7, seatWind, roundWind].filter(Boolean));
  const cnt    = t => counts[tileKey(t)] ?? 0;

  const score = (tile) => {
    switch (yakuId) {
      case 'tanyao':
        return isTermOrHon(tile) ? 100 : 0;
      case 'honitsu': {
        const dom = getDominantSuit(tiles);
        return !isHonor(tile) && tile.suit !== dom ? 90 - cnt(tile) * 10 : 0;
      }
      case 'chinitsu': {
        const dom = getDominantSuit(tiles);
        return tile.suit !== dom ? 90 - cnt(tile) * 10 : 0;
      }
      case 'yakuhai':
        if (tile.suit === 'z' && valZ.has(tile.value)) return -999;
        return cnt(tile) === 1 ? 70 : 0;
      case 'toitoi':
        return cnt(tile) === 1 ? 80 : 0;
      case 'chiitoitsu':
        return cnt(tile) >= 3 ? 70 : cnt(tile) === 1 ? 50 : 0;
      case 'pinfu':
        return (tile.suit === 'z' && valZ.has(tile.value)) ? 80 : 0;
      case 'sanshoku_doujun':
      case 'ittsu':
        return isHonor(tile) ? 90 : cnt(tile) === 1 ? 35 : 0;
      default:
        return cnt(tile) === 1 ? 30 : isHonor(tile) ? 45 : 0;
    }
  };

  const uniqueKeys = [...new Set(tiles.map(tileKey))];
  const scored = uniqueKeys
    .map(k => ({ tile: parseTileKey(k), s: score(parseTileKey(k)) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const result = scored.slice(0, maxN).map(x => x.tile);
  if (result.length === 0) {
    // Fallback: discard isolated tiles
    return uniqueKeys
      .filter(k => (counts[k] ?? 0) === 1)
      .map(k => parseTileKey(k))
      .slice(0, maxN);
  }
  return result;
}

/**
 * Return the N most useful draw candidates for this yaku.
 * Tiles that help build the target yaku structure score higher.
 */
export function getDrawCandidates(yakuId, tilesAtWaiting, seatWind, roundWind, maxN = WIN_DRAW_CANDS) {
  const counts = groupTiles(tilesAtWaiting);
  const valZ   = new Set([5, 6, 7, seatWind, roundWind].filter(Boolean));
  const cnt    = t => counts[tileKey(t)] ?? 0;

  const useful = (t) => {
    if (cnt(t) >= 4) return false; // already 4 copies in hand
    switch (yakuId) {
      case 'tanyao':    return !isTermOrHon(t);
      case 'honitsu': {
        const dom = getDominantSuit(tilesAtWaiting);
        return isHonor(t) || t.suit === dom;
      }
      case 'chinitsu': {
        const dom = getDominantSuit(tilesAtWaiting);
        return t.suit === dom;
      }
      case 'yakuhai':   return t.suit === 'z' && valZ.has(t.value);
      case 'toitoi':    return cnt(t) >= 1;        // prefer tiles already in hand
      case 'chiitoitsu':return cnt(t) === 1;       // singles → can form pairs
      case 'pinfu':     return t.suit !== 'z';     // sequences only
      case 'sanshoku_doujun': return t.suit !== 'z';
      case 'ittsu':     return t.suit !== 'z';
      default:          return true;
    }
  };

  return ALL_34_TILES
    .filter(useful)
    .sort((a, b) => cnt(b) - cnt(a))   // prefer tiles already present
    .slice(0, maxN);
}

// computeShanten has moved to shanten.js and is re-exported at the top of this file.

// ── Core BFS ──────────────────────────────────────────────────────────────────

/**
 * BFSResult shape returned when a route is found:
 * {
 *   discardTiles:        tile[]   — tiles to discard from current hand
 *   drawnTiles:          tile[]   — [the winning draw tile]
 *   concealedGroups:     tile[][] — winning hand concealed decomposition
 *   completedHandGroups: tile[][] — full winning hand (open melds + concealed)
 *   targetYakuGroups:    tile[][] — yaku-relevant structure subset
 *   depth:               number   — total draw/discard steps
 *   routeType:           string   — 'one-step'|'short'|'longer-term'
 *   isExactCompletion:   true
 *   targetType:          'exact'
 * }
 */

/**
 * Search for the shortest draw/discard route from the current hand to a valid
 * complete hand satisfying the target yaku.
 *
 * BFS state = concealed tiles at waiting count (13 − 3×N).
 * Each expansion: draw a non-winning tile → discard one tile → new waiting state.
 * Leaf: draw a tile that completes the hand + satisfies yaku.
 *
 * Returns null if no route found within maxDepth / maxStates.
 */
export function searchYakuRoute(
  concealedTiles, openMelds,
  yakuId, seatWind, roundWind, rules,
  maxDepth = BFS_MAX_DEPTH,
  maxStates = BFS_MAX_STATES
) {
  const numMelds = openMelds.length;
  const waitingN = 13 - 3 * numMelds;
  const completeN = 14 - 3 * numMelds;

  // Build initial waiting-count states.
  // If the hand is already at waiting count: start directly.
  // If at complete count: generate waiting states by discarding each candidate.
  let initialStates;

  if (concealedTiles.length === waitingN) {
    initialStates = [{ tiles: concealedTiles, discarded: [] }];
  } else if (concealedTiles.length === completeN) {
    const dcands = getDiscardCandidates(yakuId, concealedTiles, seatWind, roundWind, 4);
    const candidates = dcands.length > 0 ? dcands
      : [...new Set(concealedTiles.map(tileKey))].slice(0, 3).map(k => parseTileKey(k));
    initialStates = candidates.map(d => ({
      tiles:    removeOneTile(concealedTiles, tileKey(d)),
      discarded: [d],
    })).filter(s => s.tiles.length === waitingN);
  } else {
    return null; // tile count doesn't fit any standard state
  }

  const seen = new Set();
  let queue = initialStates.filter(s => {
    const k = stateKey(s.tiles);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let statesChecked = 0;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const nextQueue = [];

    for (const { tiles, discarded } of queue) {
      if (statesChecked >= maxStates) break;
      if (tiles.length !== waitingN) continue;

      // ── Win-check: try each draw candidate, see if hand completes + yaku ──
      const winDraws = getDrawCandidates(yakuId, tiles, seatWind, roundWind, WIN_DRAW_CANDS);

      for (const drawTile of winDraws) {
        statesChecked++;
        if (statesChecked > maxStates) break;

        const afterDraw = [...tiles, drawTile];
        if (afterDraw.length !== completeN) continue;
        if ((groupTiles(afterDraw)[tileKey(drawTile)] ?? 0) > 4) continue;

        const groups = extractHandGroups(afterDraw, numMelds);
        if (!groups) continue;

        const yakuPresent = evaluateYakuFromDecomposition(
          groups, openMelds, seatWind, roundWind, rules
        );
        if (!yakuPresent.includes(yakuId)) continue;

        // ✓ Found a valid route — build result
        const targetYakuGroups = extractYakuRelevantGroups(
          yakuId, groups, openMelds, seatWind, roundWind
        );
        const totalSteps = discarded.length > 0 ? 2 : 1; // rough: discard steps + winning draw
        const routeType  = totalSteps <= 1 ? 'one-step'
          : depth <= 1                     ? 'short'
          :                                  'longer-term';
        return {
          discardTiles:        discarded,
          drawnTiles:          [drawTile],
          concealedGroups:     groups,
          completedHandGroups: [...openMelds, ...groups],
          targetYakuGroups:    targetYakuGroups ?? [...openMelds, ...groups],
          depth:               depth + 1,
          routeType,
          isExactCompletion:   true,
          targetType:          'exact',
        };
      }

      // ── Expansion: draw an intermediate tile, then discard, → new waiting state ──
      if (depth < maxDepth) {
        const expandDraws    = getDrawCandidates(yakuId, tiles, seatWind, roundWind, EXPAND_DRAWS);
        const expandDiscards = getDiscardCandidates(yakuId, tiles, seatWind, roundWind, EXPAND_DISCARDS);

        for (const interDraw of expandDraws) {
          const afterInterDraw = [...tiles, interDraw];
          if (afterInterDraw.length !== completeN) continue;
          if ((groupTiles(afterInterDraw)[tileKey(interDraw)] ?? 0) > 4) continue;

          for (const discardTile of expandDiscards) {
            if (tileKey(discardTile) === tileKey(interDraw)) continue; // don't draw+discard same tile
            const newTiles = removeOneTile(afterInterDraw, tileKey(discardTile));
            if (newTiles.length !== waitingN) continue;

            const sk = stateKey(newTiles);
            if (seen.has(sk)) continue;
            seen.add(sk);

            nextQueue.push({
              tiles:     newTiles,
              discarded: [...discarded, discardTile],
            });
          }
        }
      }
    }

    queue = nextQueue;
    if (statesChecked >= maxStates) break;
  }

  return null; // no route found within caps
}

// ── Scenario object builder ───────────────────────────────────────────────────
// Converts a BFSResult into the scenario shape expected by MahjongTrainer.

export function makeBFSScenario(bfsResult, yakuNameZh, yakuNameEn, concealedTiles, openMelds) {
  const { discardTiles, drawnTiles, targetYakuGroups, routeType, depth, completedHandGroups } = bfsResult;

  const dZh  = drawnTiles.map(t => tileName(t, 'zh')).join('、');
  const dEn  = drawnTiles.map(t => tileName(t, 'en')).join(', ');
  const xZh  = discardTiles.map(t => tileName(t, 'zh')).join('、');
  const xEn  = discardTiles.map(t => tileName(t, 'en')).join(', ');

  const hasDiscards = discardTiles.length > 0;

  const routeLabel = {
    'one-step':    { zh: '一步路线', en: 'One-step route' },
    'short':       { zh: '短期路线', en: 'Short route' },
    'longer-term': { zh: '较长路线', en: 'Longer-term route' },
  }[routeType] ?? { zh: '路线', en: 'Route' };

  const titleZh = hasDiscards ? `打出${xZh}，待摸${dZh}和牌` : `摸到${dZh}，和牌`;
  const titleEn = hasDiscards ? `Discard ${xEn}, then win by drawing ${dEn}` : `Win by drawing ${dEn}`;

  const explanZh = hasDiscards
    ? `打出${xZh}改善手牌，然后摸到${dZh}即可满足「${yakuNameZh}」和牌。`
    : `摸到${dZh}后手牌完整，满足「${yakuNameZh}」。`;
  const explanEn = hasDiscards
    ? `Discard ${xEn} to reshape the hand, then draw ${dEn} to satisfy ${yakuNameEn}.`
    : `Drawing ${dEn} completes the hand, satisfying ${yakuNameEn}.`;

  return {
    title:               { zh: `[${routeLabel.zh}] ${titleZh}`, en: `[${routeLabel.en}] ${titleEn}` },
    neededTiles:         drawnTiles,
    discardTiles,
    completedHandGroups,
    targetYakuGroups,
    targetType:          'exact',
    routeType,
    depth,
    distance:            depth,
    isExactCompletion:   true,
    isExample:           false,
    currentConcealedTiles: concealedTiles,
    currentOpenMelds:      openMelds,
    zh: { explanation: explanZh },
    en: { explanation: explanEn },
  };
}
