// Tile: { suit: 'm'|'p'|'s'|'z', value: number }
// z values: 1=East 2=South 3=West 4=North 5=White(Haku) 6=Green(Hatsu) 7=Red(Chun)

const HONOR_CHARS = {
  东: { suit: 'z', value: 1 },
  南: { suit: 'z', value: 2 },
  西: { suit: 'z', value: 3 },
  北: { suit: 'z', value: 4 },
  白: { suit: 'z', value: 5 },
  发: { suit: 'z', value: 6 },
  中: { suit: 'z', value: 7 },
};

const HONOR_ZH = ['', '东', '南', '西', '北', '白', '发', '中'];
const HONOR_EN = ['', 'East', 'South', 'West', 'North', 'White', 'Green', 'Red'];
const SUIT_ZH = { m: '万', p: '饼', s: '索' };
const SUIT_EN = { m: 'man', p: 'pin', s: 'sou' };

export function tileKey(tile) {
  return tile.suit + tile.value;
}

export function tileName(tile, lang = 'zh') {
  if (tile.suit === 'z') {
    return lang === 'zh' ? HONOR_ZH[tile.value] : HONOR_EN[tile.value];
  }
  return lang === 'zh'
    ? `${tile.value}${SUIT_ZH[tile.suit]}`
    : `${tile.value}${SUIT_EN[tile.suit]}`;
}

export function parseTiles(str) {
  if (!str || !str.trim()) return [];
  const tiles = [];
  const s = str.trim();
  let i = 0;
  let pending = [];

  while (i < s.length) {
    const ch = s[i];

    if (HONOR_CHARS[ch]) {
      pending = [];
      tiles.push({ ...HONOR_CHARS[ch] });
      i++;
      continue;
    }

    if (/\d/.test(ch)) {
      pending.push(parseInt(ch, 10));
      i++;
      continue;
    }

    if (['m', 'p', 's', 'z'].includes(ch)) {
      for (const v of pending) {
        if (ch === 'z' && v >= 1 && v <= 7) tiles.push({ suit: 'z', value: v });
        else if (ch !== 'z' && v >= 1 && v <= 9) tiles.push({ suit: ch, value: v });
      }
      pending = [];
      i++;
      continue;
    }

    pending = [];
    i++;
  }

  return tiles;
}

export function parseMelds(str) {
  if (!str || !str.trim()) return [];
  return str
    .split(',')
    .map((s) => parseTiles(s.trim()))
    .filter((m) => m.length >= 2);
}

export function groupTiles(tiles) {
  const g = {};
  for (const t of tiles) {
    const k = tileKey(t);
    g[k] = (g[k] || 0) + 1;
  }
  return g;
}

const SUIT_ORDER = { m: 0, p: 1, s: 2, z: 3 };

export function sortTiles(tiles) {
  return [...tiles].sort(
    (a, b) =>
      SUIT_ORDER[a.suit] * 10 + a.value - (SUIT_ORDER[b.suit] * 10 + b.value)
  );
}

// Convert a tile array back to a canonical input string (m/p/s groups + Chinese honor chars)
export function generateHandString(tiles) {
  const sorted = sortTiles(tiles);
  let result = '';
  for (const suit of ['m', 'p', 's']) {
    const vals = sorted.filter((t) => t.suit === suit).map((t) => t.value);
    if (vals.length > 0) result += vals.join('') + suit;
  }
  const honors = sorted.filter((t) => t.suit === 'z');
  if (honors.length > 0) result += honors.map((t) => HONOR_ZH[t.value]).join('');
  return result;
}

function removeTilesByKey(tiles, key, count) {
  let removed = 0;
  return tiles.filter((t) => {
    if (tileKey(t) === key && removed < count) {
      removed++;
      return false;
    }
    return true;
  });
}

function canFormSets(tiles, setsNeeded) {
  if (setsNeeded === 0) return tiles.length === 0;
  if (tiles.length < 3) return false;

  const sorted = [...tiles].sort(
    (a, b) =>
      SUIT_ORDER[a.suit] * 10 + a.value - (SUIT_ORDER[b.suit] * 10 + b.value)
  );
  const first = sorted[0];
  const groups = groupTiles(sorted);
  const firstKey = tileKey(first);

  // Try triplet
  if (groups[firstKey] >= 3) {
    const rem = removeTilesByKey(sorted, firstKey, 3);
    if (canFormSets(rem, setsNeeded - 1)) return true;
  }

  // Try sequence (numbered suits only)
  if (first.suit !== 'z' && first.value <= 7) {
    const k2 = first.suit + (first.value + 1);
    const k3 = first.suit + (first.value + 2);
    if ((groups[k2] || 0) >= 1 && (groups[k3] || 0) >= 1) {
      let rem = removeTilesByKey(sorted, firstKey, 1);
      rem = removeTilesByKey(rem, k2, 1);
      rem = removeTilesByKey(rem, k3, 1);
      if (canFormSets(rem, setsNeeded - 1)) return true;
    }
  }

  return false;
}

// Parse a tile key string (e.g. "m3", "z7") back into a tile object
export function parseTileKey(key) {
  return { suit: key[0], value: parseInt(key.slice(1), 10) };
}

// Decompose concealedTiles into (4-numMelds) sets + 1 pair.
// Returns array of tile-groups (sets first, pair last), or null on failure.
export function extractHandGroups(concealedTiles, numMelds) {
  const setsNeeded = 4 - numMelds;
  if (setsNeeded < 0 || setsNeeded > 4) return null;

  const groups = groupTiles(concealedTiles);

  for (const [key, cnt] of Object.entries(groups)) {
    if (cnt >= 2) {
      const pairTile = parseTileKey(key);
      const pair = [pairTile, pairTile];
      const remaining = removeTilesByKey(concealedTiles, key, 2);
      const sets = extractSets(remaining, setsNeeded);
      if (sets !== null) return [...sets, pair]; // pair goes last
    }
  }

  // Chiitoitsu (7 pairs, closed only)
  if (numMelds === 0 && concealedTiles.length === 14) {
    const vals = Object.values(groups);
    if (vals.length === 7 && vals.every((v) => v === 2)) {
      return Object.keys(groups).map((k) => { const t = parseTileKey(k); return [t, t]; });
    }
  }

  return null;
}

function extractSets(tiles, setsNeeded) {
  if (setsNeeded === 0) return tiles.length === 0 ? [] : null;
  if (tiles.length < 3) return null;

  const sorted = sortTiles(tiles);
  const first = sorted[0];
  const groups = groupTiles(sorted);
  const fk = tileKey(first);

  // Triplet
  if ((groups[fk] || 0) >= 3) {
    const triplet = [first, first, first];
    const rem = removeTilesByKey(sorted, fk, 3);
    const result = extractSets(rem, setsNeeded - 1);
    if (result !== null) return [triplet, ...result];
  }

  // Sequence
  if (first.suit !== 'z' && first.value <= 7) {
    const k2 = first.suit + (first.value + 1);
    const k3 = first.suit + (first.value + 2);
    if ((groups[k2] || 0) >= 1 && (groups[k3] || 0) >= 1) {
      const seq = [
        first,
        { suit: first.suit, value: first.value + 1 },
        { suit: first.suit, value: first.value + 2 },
      ];
      let rem = removeTilesByKey(sorted, fk, 1);
      rem = removeTilesByKey(rem, k2, 1);
      rem = removeTilesByKey(rem, k3, 1);
      const result = extractSets(rem, setsNeeded - 1);
      if (result !== null) return [seq, ...result];
    }
  }

  return null;
}

// Check if concealedTiles can form (4 - numMelds) sets + 1 pair
export function canCompleteHand(concealedTiles, numMelds) {
  const setsNeeded = 4 - numMelds;
  if (setsNeeded < 0 || setsNeeded > 4) return false;

  const groups = groupTiles(concealedTiles);

  // Standard: pair + sets
  for (const [key, cnt] of Object.entries(groups)) {
    if (cnt >= 2) {
      const rem = removeTilesByKey(concealedTiles, key, 2);
      if (canFormSets(rem, setsNeeded)) return true;
    }
  }

  // Chiitoitsu (7 pairs, closed only)
  if (numMelds === 0 && concealedTiles.length === 14) {
    const vals = Object.values(groups);
    if (vals.length === 7 && vals.every((v) => v === 2)) return true;
  }

  return false;
}
