// WS Damage Simulator — GameState Management

import { ORDERED_ZONES } from './types.js';

// ── Shuffle ───────────────────────────────────────────────────────────────────

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── State Creation ────────────────────────────────────────────────────────────

/**
 * Create a fresh GameState for one simulation trial.
 * Decks are deep-copied and shuffled.
 */
export function createState({
  deck    = [],
  rest    = [],
  clock   = [],
  level   = [],
  stock   = [],
  memory  = [],
  hand    = [],
} = {}) {
  return {
    zones: {
      deck:   shuffle([...deck]),
      rest:   [...rest],
      clock:  [...clock],
      level:  [...level],
      stock:  shuffle([...stock]),
      memory: [...memory],
      hand:   [...hand],
    },

    // Current step observable state — null when no step is active
    window: null,

    // Cross-step propagation
    propagated: {
      inheritedCancel: [],  // 传火: injected into next DamageOp's onCancel
      watchCancel:     [],  // Shot: fire when next cancel event occurs
    },

    // Last operation result (for ConditionalOp to query)
    lastResult: null,

    // Per-trial statistics
    stats: {
      clockDamage:  0,  // total cards that entered clock via damage
      trueDamage:   0,  // cards that entered clock via true_damage / refresh
      refreshCount: 0,
      levelUpCount: 0,
    },

    // Trial ended flag (set on loss condition)
    ended: false,
    endReason: null,
  };
}

// ── Zone Accessors ────────────────────────────────────────────────────────────

export function getZone(state, zoneId) {
  return state.zones[zoneId];
}

export function zoneSize(state, zoneId) {
  return state.zones[zoneId].length;
}

export function zoneIsEmpty(state, zoneId) {
  return state.zones[zoneId].length === 0;
}

export function peekTop(state, zoneId, n = 1) {
  const zone = state.zones[zoneId];
  return zone.slice(Math.max(0, zone.length - n));
}

export function peekBottom(state, zoneId, n = 1) {
  return state.zones[zoneId].slice(0, n);
}

// ── Zone Mutations ────────────────────────────────────────────────────────────

export function shuffleZone(state, zoneId) {
  shuffle(state.zones[zoneId]);
}

/** Take n cards from the top of an ordered zone (destructive). */
export function takeTop(state, zoneId, n) {
  const zone = state.zones[zoneId];
  const taken = zone.splice(Math.max(0, zone.length - n), n);
  // splice returns in original order; reverse so index 0 = first revealed
  taken.reverse();
  return taken;
}

/** Take n cards from the bottom of an ordered zone (destructive). */
export function takeBottom(state, zoneId, n) {
  return state.zones[zoneId].splice(0, n);
}

/** Take n random cards from any zone (destructive). */
export function takeRandom(state, zoneId, n) {
  const zone = state.zones[zoneId];
  const taken = [];
  const available = Math.min(n, zone.length);
  for (let i = 0; i < available; i++) {
    const idx = Math.floor(Math.random() * zone.length);
    taken.push(zone.splice(idx, 1)[0]);
  }
  return taken;
}

/** Put cards at the top (push to end) of a zone. */
export function putTop(state, zoneId, cards) {
  state.zones[zoneId].push(...cards);
}

/** Put cards at the bottom (unshift) of a zone. */
export function putBottom(state, zoneId, cards) {
  state.zones[zoneId].unshift(...cards);
}

/** Put cards at a specific index in a zone. */
export function putAt(state, zoneId, index, cards) {
  state.zones[zoneId].splice(index, 0, ...cards);
}

/** Put cards into a zone then shuffle that zone. */
export function putAndShuffle(state, zoneId, cards) {
  state.zones[zoneId].push(...cards);
  shuffleZone(state, zoneId);
}

/** Place cards into a zone according to an InsertPos spec. */
export function insertCards(state, zoneId, cards, insertAt = 'top') {
  if (!cards || cards.length === 0) return;
  if (insertAt === 'top')        { putTop(state, zoneId, cards); }
  else if (insertAt === 'bottom') { putBottom(state, zoneId, cards); }
  else if (insertAt === 'shuffle_in') { putAndShuffle(state, zoneId, cards); }
  else if (typeof insertAt === 'object' && insertAt.index !== undefined) {
    putAt(state, zoneId, insertAt.index, cards);
  } else {
    putTop(state, zoneId, cards);
  }
}

// ── Zone Count Helpers ────────────────────────────────────────────────────────

import { isClimax } from './card.js';

export function countClimax(state, zoneId) {
  return state.zones[zoneId].filter(isClimax).length;
}

export function countNonClimax(state, zoneId) {
  return state.zones[zoneId].filter(c => !isClimax(c)).length;
}
