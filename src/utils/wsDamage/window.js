// WS Damage Simulator — Window System

import { matchesFilter, isClimax } from './card.js';
import { getZone, takeTop, takeBottom, takeRandom, insertCards, shuffleZone } from './state.js';

// ── Take Cards into Window ────────────────────────────────────────────────────

/**
 * Take cards from a zone into a WindowCard[].
 * Each WindowCard: { card, sourceZone, sourceIndex }
 *
 * ZoneAccess: { zone, method: { type, n?, filter?, count? } }
 */
export function takeIntoWindow(state, zoneAccess) {
  const { zone, method } = zoneAccess;
  const zoneArr = getZone(state, zone);
  const window = [];

  switch (method.type) {
    case 'top': {
      const n = Math.min(method.n, zoneArr.length);
      // Record source indices BEFORE taking
      const startIdx = zoneArr.length - n;
      const taken = takeTop(state, zone, n);
      // taken[0] = first revealed (was at index startIdx + n - 1 before reverse in takeTop)
      // takeTop reverses so index 0 = topmost card = was at zoneArr.length-1
      for (let i = 0; i < taken.length; i++) {
        window.push({ card: taken[i], sourceZone: zone, sourceIndex: startIdx + (n - 1 - i) });
      }
      break;
    }
    case 'bottom': {
      const n = Math.min(method.n, zoneArr.length);
      // Record indices before taking
      const taken = takeBottom(state, zone, n);
      for (let i = 0; i < taken.length; i++) {
        window.push({ card: taken[i], sourceZone: zone, sourceIndex: i });
      }
      break;
    }
    case 'random': {
      // Random: source indices are meaningless for order purposes
      const taken = takeRandom(state, zone, method.n);
      for (const card of taken) {
        window.push({ card, sourceZone: zone, sourceIndex: -1 });
      }
      break;
    }
    case 'filter': {
      const filter = method.filter ?? {};
      const countSpec = method.count ?? { type: 'all' };
      const matching = [];
      for (let i = 0; i < zoneArr.length; i++) {
        if (matchesFilter(zoneArr[i], filter)) matching.push(i);
      }
      const limit = resolveCount(countSpec, matching.length);
      // Take from the end (most recent / top) first for ordered zones
      const toTake = matching.slice(-limit);
      // Remove in reverse order to preserve indices
      for (let i = toTake.length - 1; i >= 0; i--) {
        const idx = toTake[i];
        const [card] = zoneArr.splice(idx, 1);
        window.unshift({ card, sourceZone: zone, sourceIndex: idx });
      }
      break;
    }
    case 'search': {
      // Find first matching card
      const filter = method.filter ?? {};
      for (let i = zoneArr.length - 1; i >= 0; i--) {
        if (matchesFilter(zoneArr[i], filter)) {
          const [card] = zoneArr.splice(i, 1);
          window.push({ card, sourceZone: zone, sourceIndex: i });
          break;
        }
      }
      break;
    }
    case 'peek_top': {
      // Non-destructive: build window without removing cards
      const n = Math.min(method.n, zoneArr.length);
      const startIdx = zoneArr.length - n;
      for (let i = n - 1; i >= 0; i--) {
        window.push({ card: zoneArr[startIdx + i], sourceZone: zone, sourceIndex: startIdx + i });
      }
      break;
    }
    case 'all': {
      for (let i = zoneArr.length - 1; i >= 0; i--) {
        window.push({ card: zoneArr[i], sourceZone: zone, sourceIndex: i });
      }
      getZone(state, zone).length = 0;
      break;
    }
    case 'position': {
      const idx = method.index;
      if (idx >= 0 && idx < zoneArr.length) {
        const [card] = zoneArr.splice(idx, 1);
        window.push({ card, sourceZone: zone, sourceIndex: idx });
      }
      break;
    }
    case 'range': {
      const from = Math.max(0, method.from);
      const to   = Math.min(zoneArr.length - 1, method.to);
      if (from <= to) {
        const taken = zoneArr.splice(from, to - from + 1);
        for (let i = 0; i < taken.length; i++) {
          window.push({ card: taken[i], sourceZone: zone, sourceIndex: from + i });
        }
      }
      break;
    }
    default:
      throw new Error(`Unknown ZoneAccess method type: ${method.type}`);
  }

  return window;
}

// ── Window View ───────────────────────────────────────────────────────────────

/**
 * Build a queryable view over a window (WindowCard[]).
 */
export function buildWindowView(windowCards) {
  const cards   = windowCards.map(w => w.card);
  const byType  = {};
  const byColor = {};
  const byLevel = {};
  const byTrig  = {};

  for (const w of windowCards) {
    const { card } = w;
    byType[card.type]  = (byType[card.type]  || []).concat([w]);
    byColor[card.color]= (byColor[card.color] || []).concat([w]);
    byLevel[card.level]= (byLevel[card.level] || []).concat([w]);
    const tk = card.trigger ?? 'none';
    byTrig[tk] = (byTrig[tk] || []).concat([w]);
  }

  return {
    cards:          windowCards,
    total:          windowCards.length,
    climaxCount:    windowCards.filter(w => isClimax(w.card)).length,
    nonClimaxCount: windowCards.filter(w => !isClimax(w.card)).length,
    hasClimax:      windowCards.some(w => isClimax(w.card)),
    hasNormal:      windowCards.some(w => !isClimax(w.card)),

    byType,
    byColor,
    byLevel,
    byTrigger: byTrig,

    matching: (filter) => windowCards.filter(w => matchesFilter(w.card, filter)),
    any:      (filter) => windowCards.some(w => matchesFilter(w.card, filter)),
    count:    (filter) => windowCards.filter(w => matchesFilter(w.card, filter)).length,
  };
}

// ── Apply ActSpec to Window ───────────────────────────────────────────────────

/**
 * Execute an ActSpec against a window, placing cards into destinations.
 *
 * ActSpec: {
 *   selections: [{ filter, count, destination, insertAt }],
 *   remainder:  { destination, insertAt, order }
 * }
 */
export function applyActSpec(state, act, windowCards) {
  let remaining = [...windowCards];

  for (const sel of (act.selections ?? [])) {
    const matching = remaining.filter(w => matchesFilter(w.card, sel.filter ?? {}));
    const limit    = resolveCount(sel.count ?? { type: 'all' }, matching.length);
    const selected = matching.slice(0, limit);

    // Remove selected from remaining
    const selectedSet = new Set(selected);
    remaining = remaining.filter(w => !selectedSet.has(w));

    if (sel.destination && sel.destination !== 'source') {
      insertCards(state, sel.destination, selected.map(w => w.card), sel.insertAt ?? 'top');
    } else if (sel.destination === 'source') {
      returnToSource(state, selected, 'original');
    }
  }

  // Handle remainder
  if (remaining.length > 0) {
    const rem = act.remainder ?? { destination: 'source', order: 'any' };
    const dest = rem.destination ?? 'source';
    const order = rem.order ?? 'any';

    if (dest === 'source') {
      returnToSource(state, remaining, order, rem.insertAt);
    } else {
      const cards = orderRemainder(remaining, order);
      insertCards(state, dest, cards, rem.insertAt ?? 'top');
      if (order === 'shuffle') shuffleZone(state, dest);
    }
  }
}

// ── Return to Source ──────────────────────────────────────────────────────────

function returnToSource(state, windowCards, order, insertAt) {
  if (windowCards.length === 0) return;

  // Group by source zone (usually all from same zone)
  const byZone = {};
  for (const w of windowCards) {
    (byZone[w.sourceZone] = byZone[w.sourceZone] || []).push(w);
  }

  for (const [zone, wCards] of Object.entries(byZone)) {
    const cards = orderRemainder(wCards, order);
    if (order === 'original') {
      // Put back in original relative order at original positions
      // Since we took from top and cards have sourceIndex, put them back correctly
      // Simplification: push to top in original order (cards are ordered by sourceIndex desc)
      const sorted = [...wCards].sort((a, b) => a.sourceIndex - b.sourceIndex);
      insertCards(state, zone, sorted.map(w => w.card), insertAt ?? 'top');
    } else if (order === 'shuffle') {
      insertCards(state, zone, cards, insertAt ?? 'top');
      shuffleZone(state, zone);
    } else if (order === 'reverse') {
      insertCards(state, zone, [...cards].reverse(), insertAt ?? 'top');
    } else {
      insertCards(state, zone, cards, insertAt ?? 'top');
    }
  }
}

function orderRemainder(windowCards, order) {
  const cards = windowCards.map(w => w.card);
  if (order === 'original') {
    return windowCards.sort((a, b) => a.sourceIndex - b.sourceIndex).map(w => w.card);
  }
  if (order === 'reverse') {
    return [...cards].reverse();
  }
  return cards;
}

// ── Count Spec Resolution ─────────────────────────────────────────────────────

export function resolveCount(countSpec, available) {
  if (!countSpec || countSpec.type === 'all') return available;
  if (countSpec.type === 'exact')    return Math.min(countSpec.n, available);
  if (countSpec.type === 'up_to')    return Math.min(countSpec.n, available);
  if (countSpec.type === 'at_least') return available >= countSpec.n ? available : 0;
  return available;
}
