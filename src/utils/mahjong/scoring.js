/**
 * Riichi Mahjong scoring: fu / han / points calculation.
 *
 * Static-analysis constraints (no live game state):
 *   - Riichi / ippatsu / tsumo-from-game not tracked → user must specify winType
 *   - Dora / red-five dora not counted (no discard-pile info)
 *   - Dealer / non-dealer distinction exposed via isDealer parameter
 *
 * Public API:
 *   computeFu(concealedGroups, openMelds, seatWind, roundWind, winType, drawnTile?)
 *   computeHan(yakuIds, isOpen, concealedGroups, openMelds, seatWind, roundWind)
 *   computePoints(han, fu)
 *   computeScore(concealedGroups, openMelds, yakuIds, seatWind, roundWind, winType, drawnTile?)
 */

import { tileKey } from './tileParser.js';

// ── Tile predicates ───────────────────────────────────────────────────────────

function isYaochuTile(t) {
  return t.suit === 'z' || t.value === 1 || t.value === 9;
}

function isSequenceGroup(g) {
  if (g.length !== 3) return false;
  const s = [...g].sort((a, b) => a.value - b.value);
  return s[0].suit !== 'z' &&
    s[0].suit === s[1].suit && s[1].suit === s[2].suit &&
    s[1].value === s[0].value + 1 && s[2].value === s[0].value + 2;
}

function isTripletGroup(g) {
  return g.length >= 3 && g.every(t => tileKey(t) === tileKey(g[0]));
}

// ── Wait type helpers ─────────────────────────────────────────────────────────

/**
 * Returns the wait fu (0 or 2) for the given drawnTile completing the hand.
 *
 * Wait type → fu:
 *   ryanmen (両面) 0  — consecutive pair, both-sided
 *   shanpon  (双碰) 0  — two-pair wait, completing a triplet
 *   kanchan  (嵌張) 2  — middle-tile wait
 *   penchan  (辺張) 2  — edge wait (1-2→3 or 8-9→7)
 *   tanki    (単騎) 2  — single-tile wait for pair
 */
function waitFu(concealedGroups, drawnTile) {
  if (!drawnTile) return 0; // unknown: assume best case (ryanmen)
  if (drawnTile.suit === 'z') {
    // Honor drawn tile — check tanki vs shanpon
    // If it completes a triplet: shanpon (0); if completes pair: tanki (2)
    return pairOrShanpon(concealedGroups, drawnTile) ? 0 : 2;
  }

  const v = drawnTile.value;
  const s = drawnTile.suit;
  const allSets = concealedGroups.slice(0, -1);
  const pair    = concealedGroups[concealedGroups.length - 1];

  // Check sequences containing drawnTile
  for (const set of allSets) {
    if (!isSequenceGroup(set) || set[0].suit !== s) continue;
    const vals = set.map(t => t.value).sort((a, b) => a - b);
    const [low, , high] = vals;
    if (v === low  && low  <= 6) return 0; // ryanmen (drew low end)
    if (v === high && high >= 4) return 0; // ryanmen (drew high end)
    if (v === low  || v === high) return 2; // penchan (edge)
    // v === mid → kanchan → 2 (handled below)
  }

  // Check triplets containing drawnTile (shanpon)
  for (const set of allSets) {
    if (isTripletGroup(set) && tileKey(set[0]) === tileKey(drawnTile)) {
      // shanpon if pair is a different tile; tanki if pair is this tile
      return tileKey(pair[0]) === tileKey(drawnTile) ? 2 : 0;
    }
  }

  // drawnTile completed the pair → tanki
  if (tileKey(pair[0]) === tileKey(drawnTile)) return 2;

  // Kanchan (middle of a sequence) or unidentified
  return 2;
}

/** Returns true if drawnTile completed a triplet (shanpon = 0 fu). */
function pairOrShanpon(concealedGroups, drawnTile) {
  const allSets = concealedGroups.slice(0, -1);
  for (const set of allSets) {
    if (isTripletGroup(set) && tileKey(set[0]) === tileKey(drawnTile)) return true;
  }
  return false;
}

// ── Set fu ────────────────────────────────────────────────────────────────────

/**
 * Fu contributed by a single meld/set.
 * Sequences: 0
 * Triplet:   simples concealed 4, simples open 2,
 *            yaochu  concealed 8, yaochu  open 4
 * Kan:       triplet value × 4
 */
function setFu(set, isConcealed) {
  if (!isTripletGroup(set)) return 0; // sequence → 0

  const isKan       = set.length === 4;
  const hasYaochu   = isYaochuTile(set[0]);
  const base        = hasYaochu
    ? (isConcealed ? 8 : 4)
    : (isConcealed ? 4 : 2);

  return isKan ? base * 4 : base;
}

// ── Pair (jantai) fu ──────────────────────────────────────────────────────────

/**
 * Fu from the pair:
 *   Dragons (5/6/7z): +2 each type
 *   Seat wind:        +2
 *   Round wind:       +2
 *   (Double wind gets +4 = +2 seat + +2 round)
 */
function pairFu(pair, seatWind, roundWind) {
  const t = pair[0];
  if (t.suit !== 'z') return 0;
  let fu = 0;
  if ([5, 6, 7].includes(t.value)) fu += 2;       // dragon
  if (t.value === seatWind)        fu += 2;        // seat wind
  if (t.value === roundWind)       fu += 2;        // round wind
  return fu;
}

// ── computeFu ─────────────────────────────────────────────────────────────────

/**
 * Compute the fu (符) for a winning hand.
 *
 * @param {tile[][]} concealedGroups  decomposition from extractAllHandGroups (sets + pair last)
 * @param {tile[][]} openMelds        open meld sets
 * @param {number}   seatWind         1=East … 4=North
 * @param {number}   roundWind        1=East … 4=North
 * @param {'ron'|'tsumo'} winType
 * @param {tile|null}    drawnTile    winning tile (null = unknown, assume ryanmen)
 * @returns {number} fu rounded up to nearest 10
 */
export function computeFu(concealedGroups, openMelds, seatWind, roundWind, winType, drawnTile = null) {
  const isOpen  = openMelds.length > 0;
  const pair    = concealedGroups[concealedGroups.length - 1];
  const concSets = concealedGroups.slice(0, -1);
  const allSets  = [...concSets, ...openMelds];

  // ── Chiitoitsu: fixed 25 fu ──────────────────────────────────────────────
  if (concealedGroups.length === 7) return 25;

  // ── Pinfu: fixed fu (requires closed hand) ───────────────────────────────
  // Pinfu = all sequences + non-value pair + ryanmen wait
  if (!isOpen) {
    const allSeqs    = allSets.every(s => isSequenceGroup(s));
    const valueTiles = new Set([5, 6, 7, seatWind, roundWind].filter(Boolean));
    const pairOk     = !(pair[0].suit === 'z' && valueTiles.has(pair[0].value));
    const ryanmen    = drawnTile ? waitFu(concealedGroups, drawnTile) === 0 : true;

    if (allSeqs && pairOk && ryanmen) {
      return winType === 'tsumo' ? 20 : 30;
    }
  }

  // ── Standard calculation ─────────────────────────────────────────────────
  let fu = 20; // base

  // Menzen ron bonus (+10 for closed ron)
  if (!isOpen && winType === 'ron') fu += 10;

  // Tsumo bonus (+2 for any tsumo)
  if (winType === 'tsumo') fu += 2;

  // Wait type
  fu += waitFu(concealedGroups, drawnTile);

  // Pair fu
  fu += pairFu(pair, seatWind, roundWind);

  // Concealed sets
  for (const set of concSets) fu += setFu(set, true);

  // Open melds
  for (const meld of openMelds) fu += setFu(meld, false);

  // Round up to nearest 10 (minimum 30 after menzen ron, 22+ for others)
  return Math.ceil(fu / 10) * 10;
}

// ── Han table ─────────────────────────────────────────────────────────────────
// [closedHan, openHan]  null = closed-only (impossible/invalid when open)

const HAN_TABLE = {
  tanyao:          [1, 1],
  toitoi:          [2, 2],
  chiitoitsu:      [2, null],
  pinfu:           [1, null],
  sanshoku_doujun: [2, 1],
  sanshoku_doukou: [2, 2],
  ittsu:           [2, 1],
  honitsu:         [3, 2],
  chinitsu:        [6, 5],
  shousangen:      [2, 2],
  chanta:          [2, 1],
  junchan:         [3, 2],
  sanankou:        [2, 2],
  iipeikou:        [1, null],
  honroutou:       [2, 2],
  // Future: menzen_tsumo: [1, null], riichi: [1, null]
};

const YAKUMAN_IDS = new Set([
  'daisangen', 'suuankou', 'tsuuiisou', 'shousuushii', 'daisuushii',
  'chinroutou', 'ryuuiisou', 'chuuren', 'kokushi',
]);

/**
 * Count the total han contributed by yakuhai (value tile triplets).
 * Each dragon = 1 han; seat wind = 1 han; round wind = 1 han.
 * Double wind (seat == round) gives 2 han for one triplet.
 */
function yakuhaiHan(concealedGroups, openMelds, seatWind, roundWind) {
  const allSets = [...concealedGroups.slice(0, -1), ...openMelds];
  let han = 0;
  for (const set of allSets) {
    if (!isTripletGroup(set) || set[0].suit !== 'z') continue;
    const v = set[0].value;
    if (v >= 5)           han += 1; // dragon (白/発/中)
    if (v === seatWind)   han += 1; // seat wind
    if (v === roundWind)  han += 1; // round wind
    // Note: if seatWind === roundWind, the same triplet accumulates both (+2 total)
  }
  return han;
}

// ── computeHan ────────────────────────────────────────────────────────────────

/**
 * Compute han for a winning hand.
 *
 * @param {string[]} yakuIds        IDs from evaluateYakuFromDecomposition
 * @param {boolean}  isOpen         true if any open melds
 * @param {tile[][]} concealedGroups decomposition (for yakuhai counting)
 * @param {tile[][]} openMelds
 * @param {number}   seatWind
 * @param {number}   roundWind
 * @returns {{ total: number|'yakuman', breakdown: {yakuId, han}[] }}
 */
export function computeHan(yakuIds, isOpen, concealedGroups, openMelds, seatWind, roundWind) {
  // Yakuman takes precedence — return immediately
  const yakumanFound = yakuIds.filter(id => YAKUMAN_IDS.has(id));
  if (yakumanFound.length > 0) {
    return {
      total: 'yakuman',
      breakdown: yakumanFound.map(id => ({ yakuId: id, han: 'yakuman' })),
    };
  }

  let total = 0;
  const breakdown = [];

  for (const id of yakuIds) {
    // Yakuhai: count per-triplet (may be multiple value triplets)
    if (id === 'yakuhai') {
      const h = yakuhaiHan(concealedGroups, openMelds, seatWind, roundWind);
      if (h > 0) { total += h; breakdown.push({ yakuId: 'yakuhai', han: h }); }
      continue;
    }

    const entry = HAN_TABLE[id];
    if (!entry) continue; // unknown or untracked yaku

    const [closedHan, openHan] = entry;
    const han = isOpen ? (openHan ?? 0) : closedHan;
    if (han > 0) { total += han; breakdown.push({ yakuId: id, han }); }
  }

  return { total, breakdown };
}

// ── computePoints ─────────────────────────────────────────────────────────────

const MANGAN_BASE = 2000; // non-dealer ron = 8000 (= base × 4)

const LIMITS = [
  { name: '役满', multiplier: 4 },   // yakuman
  { name: '三倍满', multiplier: 3 }, // sanbaiman  11-12 han
  { name: '倍满',   multiplier: 2 }, // baiman     8-10 han
  { name: '跳满',   multiplier: 1.5 },// haneman    6-7 han
  { name: '满贯',   multiplier: 1 }, // mangan     5 han (or 4+30fu, 3+70fu)
];

function roundUp100(n) { return Math.ceil(n / 100) * 100; }

function limitPoints(multiplier) {
  const base = MANGAN_BASE * multiplier;
  return {
    isLimit: true,
    ron:   { dealer: roundUp100(base * 6), nonDealer: roundUp100(base * 4) },
    tsumo: { dealer: roundUp100(base * 2), nonDealer: roundUp100(base) },
  };
}

/**
 * Compute point values from han + fu.
 *
 * @param {number|'yakuman'} han
 * @param {number} fu
 * @returns {{
 *   isLimit: boolean,
 *   limitName?: string,
 *   ron:   { dealer: number, nonDealer: number },
 *   tsumo: { dealer: number, nonDealer: number },
 * }}
 *
 * ron.dealer / ron.nonDealer = points for winning by ron (as dealer / non-dealer).
 * tsumo.dealer / tsumo.nonDealer = per-player payment when winning by tsumo.
 *   As dealer tsumo: each of 3 opponents pays tsumo.dealer.
 *   As non-dealer tsumo: dealer pays tsumo.dealer, other 2 pay tsumo.nonDealer.
 */
export function computePoints(han, fu) {
  if (han === 'yakuman') return { ...limitPoints(4), limitName: '役满' };
  if (han >= 13)         return { ...limitPoints(4), limitName: '役满（数え）' };
  if (han >= 11)         return { ...limitPoints(3), limitName: '三倍满' };
  if (han >= 8)          return { ...limitPoints(2), limitName: '倍满' };
  if (han >= 6)          return { ...limitPoints(1.5), limitName: '跳满' };

  // Mangan: 5+ han, or basic points ≥ 2000 (covers 3 han 70+ fu, 4 han 60+ fu, etc.)
  // Note: "4 han 30 fu = mangan" (切り上げ満貫) is a house-rule variant — NOT standard.
  const basic = fu * Math.pow(2, han + 2);
  if (han >= 5 || basic >= MANGAN_BASE) {
    return { ...limitPoints(1), limitName: '满贯' };
  }

  return {
    isLimit: false,
    ron:   { dealer: roundUp100(basic * 6), nonDealer: roundUp100(basic * 4) },
    tsumo: { dealer: roundUp100(basic * 2), nonDealer: roundUp100(basic) },
  };
}

// ── computeScore (convenience wrapper) ───────────────────────────────────────

/**
 * Full scoring: fu + han + points in one call.
 *
 * @param {tile[][]} concealedGroups
 * @param {tile[][]} openMelds
 * @param {string[]} yakuIds            from evaluateYakuFromDecomposition
 * @param {number}   seatWind
 * @param {number}   roundWind
 * @param {'ron'|'tsumo'} winType
 * @param {tile|null}    drawnTile      winning tile (null = unknown)
 * @returns {{ fu, han, hanBreakdown, points }}
 */
export function computeScore(
  concealedGroups, openMelds, yakuIds,
  seatWind, roundWind, winType, drawnTile = null
) {
  const isOpen = openMelds.length > 0;
  const fu     = computeFu(concealedGroups, openMelds, seatWind, roundWind, winType, drawnTile);
  const { total: han, breakdown } = computeHan(yakuIds, isOpen, concealedGroups, openMelds, seatWind, roundWind);
  const points = computePoints(han, fu);
  return { fu, han, hanBreakdown: breakdown, points };
}
