/**
 * Hand simulation for the Mahjong Yaku Route Trainer.
 *
 * Instead of hand-written heuristics, we simulate actual draw/discard
 * combinations and evaluate yaku on the real decompositions returned by
 * extractHandGroups (from tileParser).
 *
 * Public API:
 *   findScenarios(concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn,
 *                 seatWind, roundWind, rules, limit?)
 *     → scenario[]  (exact if the hand is in/near tenpai, else [])
 *
 *   evaluateYakuFromDecomposition(concealedGroups, openMelds, seatWind, roundWind, rules)
 *     → string[]   (yaku IDs present in this winning hand)
 */

import {
  groupTiles, tileKey, parseTileKey, tileName, extractHandGroups,
} from './tileParser';

// ── All 34 riichi tile types ──────────────────────────────────────────────────

export const ALL_34_TILES = [
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'm', value: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'p', value: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 's', value: i + 1 })),
  ...Array.from({ length: 7 }, (_, i) => ({ suit: 'z', value: i + 1 })),
];

// ── Tile predicates ───────────────────────────────────────────────────────────

function isTerminal(t) { return t.suit !== 'z' && (t.value === 1 || t.value === 9); }
function isHonor(t) { return t.suit === 'z'; }
function isTerminalOrHonor(t) { return isTerminal(t) || isHonor(t); }
function isDragon(t) { return t.suit === 'z' && t.value >= 5; }

function isTripletGroup(g) {
  return g.length >= 3 && g.every(t => tileKey(t) === tileKey(g[0]));
}

function isSequenceGroup(g) {
  if (g.length !== 3) return false;
  const s = [...g].sort((a, b) => a.value - b.value);
  return s[0].suit !== 'z' &&
    s[0].suit === s[1].suit && s[1].suit === s[2].suit &&
    s[1].value === s[0].value + 1 && s[2].value === s[0].value + 2;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function removeOneTile(tiles, key) {
  let found = false;
  return tiles.filter(t => {
    if (!found && tileKey(t) === key) { found = true; return false; }
    return true;
  });
}

// ── Yaku evaluation from actual decomposition ─────────────────────────────────

/**
 * Given the output of extractHandGroups + the open melds, return which yaku
 * are satisfied by this completed hand.
 *
 * concealedGroups: tile[][] from extractHandGroups (sets first, pair last)
 * openMelds:       tile[][]
 */
export function evaluateYakuFromDecomposition(concealedGroups, openMelds, seatWind, roundWind, rules) {
  const isOpen = openMelds.length > 0;

  // Chiitoitsu is detected by shape: 7 pairs, closed hand
  const isChiitoitsu = !isOpen && concealedGroups.length === 7 &&
    concealedGroups.every(g => g.length === 2 && tileKey(g[0]) === tileKey(g[1]));

  const pair         = concealedGroups[concealedGroups.length - 1];
  const concealedSets = concealedGroups.slice(0, -1);
  const allGroups    = [...openMelds, ...concealedGroups];
  const allSets      = allGroups.slice(0, allGroups.length - 1); // excludes pair
  const allTiles     = allGroups.flat();
  const valueTiles   = new Set([5, 6, 7, seatWind, roundWind].filter(Boolean));

  const yaku = [];

  // ── Yakuhai ──────────────────────────────────────────────────────────────
  if (allSets.some(s => isTripletGroup(s) && s[0].suit === 'z' && valueTiles.has(s[0].value))) {
    yaku.push('yakuhai');
  }

  // ── Tanyao ───────────────────────────────────────────────────────────────
  if (!allTiles.some(isTerminalOrHonor) && (!isOpen || rules?.openTanyao)) {
    yaku.push('tanyao');
  }

  // ── Toitoi ───────────────────────────────────────────────────────────────
  if (!isChiitoitsu && allSets.length === 4 && allSets.every(isTripletGroup)) {
    yaku.push('toitoi');
  }

  // ── Chiitoitsu ───────────────────────────────────────────────────────────
  if (isChiitoitsu) yaku.push('chiitoitsu');

  // ── Pinfu (simplified: all sequences + non-value pair, closed) ───────────
  if (!isOpen && !isChiitoitsu) {
    const allSeqs = allSets.every(isSequenceGroup);
    const pairOk  = !(pair[0].suit === 'z' && valueTiles.has(pair[0].value));
    if (allSeqs && pairOk) yaku.push('pinfu');
  }

  // ── Sanshoku Doujun ───────────────────────────────────────────────────────
  if (!isChiitoitsu) {
    const seqs = allSets.filter(isSequenceGroup);
    for (let v = 1; v <= 7; v++) {
      if (
        seqs.some(s => s[0].suit === 'm' && s[0].value === v) &&
        seqs.some(s => s[0].suit === 'p' && s[0].value === v) &&
        seqs.some(s => s[0].suit === 's' && s[0].value === v)
      ) { yaku.push('sanshoku_doujun'); break; }
    }
  }

  // ── Ittsu ─────────────────────────────────────────────────────────────────
  if (!isChiitoitsu) {
    const seqs = allSets.filter(isSequenceGroup);
    for (const suit of ['m', 'p', 's']) {
      if (
        seqs.some(s => s[0].suit === suit && s[0].value === 1) &&
        seqs.some(s => s[0].suit === suit && s[0].value === 4) &&
        seqs.some(s => s[0].suit === suit && s[0].value === 7)
      ) { yaku.push('ittsu'); break; }
    }
  }

  // ── Honitsu ───────────────────────────────────────────────────────────────
  if (!isChiitoitsu) {
    const numberedSuits = [...new Set(allTiles.filter(t => !isHonor(t)).map(t => t.suit))];
    if (numberedSuits.length === 1) yaku.push('honitsu');
  }

  // ── Chinitsu ──────────────────────────────────────────────────────────────
  if (!isChiitoitsu) {
    const allSuits = [...new Set(allTiles.map(t => t.suit))];
    if (allSuits.length === 1 && allSuits[0] !== 'z') yaku.push('chinitsu');
  }

  // ── Chanta ───────────────────────────────────────────────────────────────
  if (!isChiitoitsu && allGroups.every(g => g.some(isTerminalOrHonor)) && allSets.some(isSequenceGroup)) {
    yaku.push('chanta');
  }

  // ── Junchan ───────────────────────────────────────────────────────────────
  if (!isChiitoitsu) {
    const noHonorOnlyGroup = allGroups.every(g => !g.every(isHonor));
    const allHaveTerminal  = allGroups.every(g => g.some(isTerminal));
    if (allHaveTerminal && noHonorOnlyGroup && allSets.some(isSequenceGroup)) {
      yaku.push('junchan');
    }
  }

  // ── Sanankou ──────────────────────────────────────────────────────────────
  const concealedTripletCount = concealedSets.filter(isTripletGroup).length;
  if (concealedTripletCount >= 3) yaku.push('sanankou');

  // ── Iipeikou (closed only) ────────────────────────────────────────────────
  if (!isOpen && !isChiitoitsu) {
    const seqKeys = allSets.filter(isSequenceGroup).map(s => `${s[0].suit}${s[0].value}`);
    const seen = {};
    for (const k of seqKeys) {
      if (seen[k]) { yaku.push('iipeikou'); break; }
      seen[k] = true;
    }
  }

  // ── Shousangen ────────────────────────────────────────────────────────────
  const dragonTriplets = allSets.filter(s => isTripletGroup(s) && isDragon(s[0])).length;
  const dragonPair     = isDragon(pair[0]) && pair.length === 2 && tileKey(pair[0]) === tileKey(pair[1]);
  if (dragonTriplets === 2 && dragonPair) yaku.push('shousangen');

  return yaku;
}

// ── Yaku-relevant group extractor ─────────────────────────────────────────────
// Given a full winning decomposition, returns only the groups that visually
// demonstrate WHY this yaku is satisfied — much more compact than the full hand.

export function extractYakuRelevantGroups(yakuId, concealedGroups, openMelds, seatWind, roundWind) {
  const allGroups   = [...openMelds, ...concealedGroups];
  const pair        = concealedGroups[concealedGroups.length - 1];
  const concSets    = concealedGroups.slice(0, -1);
  const allSets     = allGroups.slice(0, allGroups.length - 1);
  const valueTiles  = new Set([5, 6, 7, seatWind, roundWind].filter(Boolean));
  const isChiitoi   = concealedGroups.length === 7 && concealedGroups.every(g => g.length === 2);

  switch (yakuId) {
    case 'yakuhai': {
      const vTriplets = allSets.filter(s => isTripletGroup(s) && s[0].suit === 'z' && valueTiles.has(s[0].value));
      return vTriplets.length > 0 ? vTriplets : null;
    }
    case 'tanyao':
      // Whole-hand yaku: all 5 groups must be simples — show the complete hand
      return allGroups;
    case 'toitoi': {
      // Requires all 4 sets to be triplets + 1 pair — show the full 5-group structure
      const trips = allSets.filter(isTripletGroup);
      return trips.length > 0 ? [...trips, pair] : null;
    }
    case 'chiitoitsu':
      return isChiitoi ? concealedGroups : null;
    case 'pinfu': {
      // All 4 sequences + pair
      const seqs = allSets.filter(isSequenceGroup);
      return seqs.length === 4 ? [...seqs, pair] : null;
    }
    case 'sanshoku_doujun': {
      // The matching sequence across all 3 suits (3 groups)
      const seqs = allSets.filter(isSequenceGroup);
      for (let v = 1; v <= 7; v++) {
        const match = ['m', 'p', 's'].map(suit => seqs.find(s => s[0].suit === suit && s[0].value === v)).filter(Boolean);
        if (match.length === 3) return match;
      }
      return null;
    }
    case 'ittsu': {
      // 1-2-3, 4-5-6, 7-8-9 in one suit (3 groups)
      const seqs = allSets.filter(isSequenceGroup);
      for (const suit of ['m', 'p', 's']) {
        const h1 = seqs.find(s => s[0].suit === suit && s[0].value === 1);
        const h4 = seqs.find(s => s[0].suit === suit && s[0].value === 4);
        const h7 = seqs.find(s => s[0].suit === suit && s[0].value === 7);
        if (h1 && h4 && h7) return [h1, h4, h7];
      }
      return null;
    }
    case 'honitsu':
    case 'chinitsu':
      // Whole-hand yaku: same-suit nature applies to every group
      return allGroups;
    case 'shousangen': {
      // Two dragon triplets + one dragon pair (2–3 groups)
      const dTrips = allSets.filter(s => isTripletGroup(s) && isDragon(s[0]));
      const dPair  = isDragon(pair[0]) ? [pair] : [];
      const res    = [...dTrips, ...dPair];
      return res.length >= 2 ? res : null;
    }
    case 'chanta':
    case 'junchan':
      // Every group must have a terminal/honour — show the full hand
      return allGroups;
    case 'sanankou': {
      // Three concealed triplets (the fourth set can be anything)
      const concTrips = concSets.filter(isTripletGroup);
      return concTrips.length >= 3 ? concTrips.slice(0, 3) : null;
    }
    case 'iipeikou': {
      // Two identical sequences (2 groups)
      const seqs = allSets.filter(isSequenceGroup);
      const seen = {};
      for (const s of seqs) {
        const k = `${s[0].suit}${s[0].value}`;
        if (seen[k]) return [seen[k], s];
        seen[k] = s;
      }
      return null;
    }
    default:
      return allGroups.length > 0 ? allGroups.slice(0, 4) : null;
  }
}

// ── Scenario builder helpers ──────────────────────────────────────────────────

function makeScenario({
  drawTile, discardTile, concealedGroups, openMelds,
  yakuNameZh, yakuNameEn, yakuId, seatWind, roundWind,
}) {
  const completedHandGroups = [...openMelds, ...concealedGroups];
  const targetYakuGroups    = extractYakuRelevantGroups(yakuId, concealedGroups, openMelds, seatWind, roundWind);
  const dZh = drawTile    ? tileName(drawTile,    'zh') : null;
  const dEn = drawTile    ? tileName(drawTile,    'en') : null;
  const xZh = discardTile ? tileName(discardTile, 'zh') : null;
  const xEn = discardTile ? tileName(discardTile, 'en') : null;

  let titleZh, titleEn, explanZh, explanEn;

  if (drawTile && !discardTile) {
    titleZh = `摸到${dZh}，和牌`;
    titleEn = `Win by drawing ${dEn}`;
    explanZh = `摸到${dZh}后手牌完整，满足「${yakuNameZh}」。`;
    explanEn = `Drawing ${dEn} completes the hand, satisfying ${yakuNameEn}.`;
  } else if (drawTile && discardTile) {
    titleZh = `打出${xZh}，待摸${dZh}和牌`;
    titleEn = `Discard ${xEn}, then win by drawing ${dEn}`;
    explanZh = `打出${xZh}后听到${dZh}，摸到后即可满足「${yakuNameZh}」和牌。`;
    explanEn = `Discarding ${xEn} puts the hand in tenpai waiting for ${dEn}, which satisfies ${yakuNameEn}.`;
  } else {
    titleZh = '当前手牌已完整';
    titleEn = 'Hand is already complete';
    explanZh = `手牌已满足「${yakuNameZh}」和牌条件。`;
    explanEn = `The hand already satisfies ${yakuNameEn}.`;
  }

  return {
    title: { zh: titleZh, en: titleEn },
    neededTiles:       drawTile    ? [drawTile]    : [],
    discardTiles:      discardTile ? [discardTile] : [],
    completedHandGroups,
    targetYakuGroups,
    targetType:        'exact',
    isExactCompletion: true,
    isExample:         false,
    distance:          drawTile && discardTile ? 2 : drawTile ? 1 : 0,
    zh: { explanation: explanZh },
    en: { explanation: explanEn },
  };
}

// ── Case 1: Hand already complete ─────────────────────────────────────────────

function checkAlreadyComplete(concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn, seatWind, roundWind, rules) {
  const numMelds = openMelds.length;
  const completeCount = 14 - 3 * numMelds;
  if (concealedTiles.length !== completeCount) return [];

  const concealedGroups = extractHandGroups(concealedTiles, numMelds);
  if (!concealedGroups) return [];

  const yakuPresent = evaluateYakuFromDecomposition(concealedGroups, openMelds, seatWind, roundWind, rules);
  if (!yakuPresent.includes(yakuId)) return [];

  return [makeScenario({ drawTile: null, discardTile: null, concealedGroups, openMelds, yakuNameZh, yakuNameEn, yakuId, seatWind, roundWind })];
}

// ── Case 2: Tenpai — draw 1 tile to win (no discard) ─────────────────────────

function findTenpaiWins(concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn, seatWind, roundWind, rules, limit) {
  const numMelds = openMelds.length;
  const waitingCount = 13 - 3 * numMelds;
  if (concealedTiles.length !== waitingCount) return [];

  const existingCounts = groupTiles([...concealedTiles, ...openMelds.flat()]);
  const results = [];

  for (const drawTile of ALL_34_TILES) {
    if (results.length >= limit) break;
    if ((existingCounts[tileKey(drawTile)] ?? 0) >= 4) continue;

    const testHand       = [...concealedTiles, drawTile];
    const concealedGroups = extractHandGroups(testHand, numMelds);
    if (!concealedGroups) continue;

    const yakuPresent = evaluateYakuFromDecomposition(concealedGroups, openMelds, seatWind, roundWind, rules);
    if (!yakuPresent.includes(yakuId)) continue;

    results.push(makeScenario({ drawTile, discardTile: null, concealedGroups, openMelds, yakuNameZh, yakuNameEn, yakuId, seatWind, roundWind }));
  }
  return results;
}

// ── Case 3: Post-draw — discard 1, then draw 1 to win ────────────────────────

function findDiscardThenWin(concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn, seatWind, roundWind, rules, limit) {
  const numMelds = openMelds.length;
  const completeCount = 14 - 3 * numMelds;
  // Only applies when at the "after draw" tile count but not yet winning
  if (concealedTiles.length !== completeCount) return [];
  // If already complete, checkAlreadyComplete handles it
  if (extractHandGroups(concealedTiles, numMelds)) return [];

  const results = [];
  const triedDiscards = new Set();

  for (const discardCandidate of concealedTiles) {
    if (results.length >= limit) break;
    const discardKey = tileKey(discardCandidate);
    if (triedDiscards.has(discardKey)) continue;
    triedDiscards.add(discardKey);

    const discardTile   = parseTileKey(discardKey);
    const handAfterDiscard = removeOneTile(concealedTiles, discardKey);

    // Count tiles in hand after discard + open melds (for the draw availability check)
    const postDiscardCounts = groupTiles([...handAfterDiscard, ...openMelds.flat()]);

    for (const drawTile of ALL_34_TILES) {
      if (results.length >= limit) break;
      const drawKey = tileKey(drawTile);
      if (drawKey === discardKey) continue; // skip drawing the tile we just discarded
      if ((postDiscardCounts[drawKey] ?? 0) >= 4) continue;

      const testHand       = [...handAfterDiscard, drawTile];
      const concealedGroups = extractHandGroups(testHand, numMelds);
      if (!concealedGroups) continue;

      const yakuPresent = evaluateYakuFromDecomposition(concealedGroups, openMelds, seatWind, roundWind, rules);
      if (!yakuPresent.includes(yakuId)) continue;

      results.push(makeScenario({ drawTile, discardTile, concealedGroups, openMelds, yakuNameZh, yakuNameEn, yakuId, seatWind, roundWind }));
    }
  }
  return results;
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Generate concrete scenarios for a specific yaku by simulation.
 *
 * Handles three cases:
 *   1. Hand already complete (14-3N tiles) and wins with this yaku → show win
 *   2. Tenpai (13-3N tiles) → find 1-tile winning draws for this yaku
 *   3. Post-draw (14-3N tiles, not yet complete) → find discard+draw combos
 *
 * Returns [] when the hand is too far from completion for an exact route,
 * letting the caller fall back to heuristic scenarios labelled "Example route".
 */
export function findScenarios(
  concealedTiles, openMelds,
  yakuId, yakuNameZh, yakuNameEn,
  seatWind, roundWind, rules,
  limit = 2
) {
  // Case 1: already complete
  const alreadyDone = checkAlreadyComplete(
    concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn, seatWind, roundWind, rules
  );
  if (alreadyDone.length > 0) return alreadyDone;

  // Case 2: tenpai — find winning draws
  const tenpaiWins = findTenpaiWins(
    concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn, seatWind, roundWind, rules, limit
  );
  if (tenpaiWins.length > 0) return tenpaiWins;

  // Case 3: post-draw — find discard → tenpai → win combos
  const discardWins = findDiscardThenWin(
    concealedTiles, openMelds, yakuId, yakuNameZh, yakuNameEn, seatWind, roundWind, rules, limit
  );
  return discardWins;
}
