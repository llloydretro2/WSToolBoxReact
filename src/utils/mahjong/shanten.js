/**
 * Accurate shanten calculation for Riichi Mahjong.
 *
 * Algorithm: the classic recursive partial-set scan (Neval algorithm).
 * Conceptually based on MahjongRepository/mahjong (MIT licence):
 *   https://github.com/MahjongRepository/mahjong
 *
 * Three patterns are checked; the minimum is taken:
 *   - Standard hand  (4-N sets + 1 pair, where N = number of open melds)
 *   - Chiitoitsu     (7 unique pairs, closed hand only)
 *   - Kokushi Musou  (13 unique terminals/honours + duplicate, closed only)
 *
 * Public API:
 *   computeShanten(tiles, numMelds) → number
 *     -1 = complete winning hand
 *      0 = tenpai (one tile away)
 *      N = N tiles away from tenpai
 *
 * Algorithm notes (standard hand):
 *   We represent the hand as a 34-element integer count array (t34).
 *   scanMentsu() DFS-scans t34 from left to right, at each non-empty
 *   position trying:
 *     (1) complete set  — triplet or sequence       → score +2
 *     (2) partial set   — pair / kanchan / ryanmen  → score +1
 *     (3) skip          — tile is wasted
 *   It returns the maximum achievable score = nMentsu*2 + nToitsu subject
 *   to nMentsu + nToitsu ≤ setsNeeded.
 *   Outer loop designates each tile type (≥2 copies) as the head pair
 *   (jantai), adjusting the shanten formula by -1, and takes the minimum.
 *
 * Time complexity:
 *   Standard: O(34 × recursion), practically < 0.5 ms per hand.
 *   Chiitoitsu / Kokushi: O(34) / O(13) single pass.
 */

// ── 34-index tile encoding ────────────────────────────────────────────────────
// m1-m9 → 0-8  |  p1-p9 → 9-17  |  s1-s9 → 18-26  |  z1-z7 → 27-33

const SUIT_BASE = { m: 0, p: 9, s: 18 };

function tileIdx(tile) {
  if (tile.suit === 'z') return 27 + tile.value - 1;
  return SUIT_BASE[tile.suit] + tile.value - 1;
}

// The 13 terminal/honour tile indices required for Kokushi
const KOKUSHI_INDICES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

// ── Recursive partial-set scanner ─────────────────────────────────────────────
/**
 * DFS scan of t34 from `pos` onwards.
 * Returns max score = nMentsu*2 + nToitsu, given nMentsu+nToitsu ≤ setsNeeded.
 * All mutations to t34 are restored before returning.
 */
function scanMentsu(t34, pos, nMentsu, nToitsu, setsNeeded) {
  while (pos < 34 && t34[pos] === 0) pos++;

  // Cap on total blocks: nMentsu + nToitsu must not exceed setsNeeded.
  // Checking the *sum* (not only nMentsu) prevents accumulated partials from
  // later contributing extra complete sets beyond the allowed capacity.
  if (pos >= 34 || nMentsu + nToitsu >= setsNeeded) {
    return nMentsu * 2 + nToitsu;
  }

  let best = nMentsu * 2 + nToitsu;
  const i    = pos;
  const suit = i < 27 ? Math.floor(i / 9) : -1; // 0=m 1=p 2=s -1=honour
  const rank = suit >= 0 ? i % 9 : -1;           // 0-based rank within suit

  // ── Complete sets ─────────────────────────────────────────────────────────

  if (t34[i] >= 3) {
    t34[i] -= 3;
    best = Math.max(best, scanMentsu(t34, i, nMentsu + 1, nToitsu, setsNeeded));
    t34[i] += 3;
  }

  // Sequence: only numbered suits; rank ≤ 6 keeps i+1 and i+2 in the same suit
  if (suit >= 0 && rank <= 6 && t34[i + 1] >= 1 && t34[i + 2] >= 1) {
    t34[i]--; t34[i + 1]--; t34[i + 2]--;
    best = Math.max(best, scanMentsu(t34, i, nMentsu + 1, nToitsu, setsNeeded));
    t34[i]++; t34[i + 1]++; t34[i + 2]++;
  }

  // ── Partial sets (only when capacity remains) ─────────────────────────────

  if (nMentsu + nToitsu < setsNeeded) {
    if (t34[i] >= 2) {
      t34[i] -= 2;
      best = Math.max(best, scanMentsu(t34, i + 1, nMentsu, nToitsu + 1, setsNeeded));
      t34[i] += 2;
    }

    if (suit >= 0) {
      // Kanchan (gap wait: i and i+2)
      if (rank <= 6 && t34[i + 2] >= 1) {
        t34[i]--; t34[i + 2]--;
        best = Math.max(best, scanMentsu(t34, i + 1, nMentsu, nToitsu + 1, setsNeeded));
        t34[i]++; t34[i + 2]++;
      }
      // Consecutive pair: ryanmen / penchan (i and i+1)
      if (rank <= 7 && t34[i + 1] >= 1) {
        t34[i]--; t34[i + 1]--;
        best = Math.max(best, scanMentsu(t34, i + 1, nMentsu, nToitsu + 1, setsNeeded));
        t34[i]++; t34[i + 1]++;
      }
    }
  }

  // Skip: branch where tile i starts no useful block
  best = Math.max(best, scanMentsu(t34, i + 1, nMentsu, nToitsu, setsNeeded));

  return best;
}

// ── Three-pattern shanten functions ──────────────────────────────────────────

function standardShanten(t34, setsNeeded) {
  let best = 2 * setsNeeded; // worst case

  for (let i = 0; i < 34; i++) {
    if (t34[i] >= 2) {
      t34[i] -= 2;
      const score = scanMentsu(t34, 0, 0, 0, setsNeeded);
      best = Math.min(best, 2 * setsNeeded - score - 1);
      t34[i] += 2;
    }
  }

  // Without a head pair
  const score = scanMentsu(t34, 0, 0, 0, setsNeeded);
  best = Math.min(best, 2 * setsNeeded - score);

  return best;
}

function chiitoiShanten(t34) {
  let pairs = 0;
  let kinds = 0;
  for (let i = 0; i < 34; i++) {
    if (t34[i] >= 1) kinds++;
    if (t34[i] >= 2) pairs++;
  }
  // Both conditions: enough pairs AND enough distinct types
  return Math.max(6 - pairs, 6 - kinds);
}

function kokushiShanten(t34) {
  let unique  = 0;
  let hasPair = false;
  for (const i of KOKUSHI_INDICES) {
    if (t34[i] >= 1) unique++;
    if (t34[i] >= 2) hasPair = true;
  }
  return 13 - unique - (hasPair ? 1 : 0);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the accurate shanten number for a riichi mahjong hand.
 *
 * @param {Array<{suit:string, value:number}>} tiles  concealed tiles
 * @param {number} [numMelds=0]  open melds (chi / pon / kan)
 * @returns {number}  -1 = complete | 0 = tenpai | N = N-shanten
 */
export function computeShanten(tiles, numMelds) {
  const n = numMelds ?? 0;
  const setsNeeded = 4 - n;

  const t34 = new Array(34).fill(0);
  for (const tile of tiles) t34[tileIdx(tile)]++;

  const std = standardShanten(t34, setsNeeded);
  const c7  = n === 0 ? chiitoiShanten(t34) : 8;
  const kok = n === 0 ? kokushiShanten(t34) : 8;

  return Math.min(std, c7, kok);
}
