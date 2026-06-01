// WS Damage Simulator — Auto-Triggered Game Rules

import { isClimax, matchesFilter } from './card.js';
import { getZone, shuffle, shuffleZone, zoneIsEmpty, countNonClimax } from './state.js';

// ── Refresh ───────────────────────────────────────────────────────────────────

/**
 * Perform a Refresh:
 *   rest → deck (shuffled) → top card → clock (true_damage +1)
 *
 * Returns true if refresh occurred, false if nothing to refresh.
 */
export function doRefresh(state) {
  if (!zoneIsEmpty(state, 'deck')) return false;
  if (zoneIsEmpty(state, 'rest') && zoneIsEmpty(state, 'deck')) {
    // Both empty: fatal loss condition handled externally
    return false;
  }
  if (zoneIsEmpty(state, 'rest')) return false;

  state.stats.refreshCount++;

  // Move all rest cards to deck and shuffle
  const restCards = [...getZone(state, 'rest')];
  getZone(state, 'rest').length = 0;
  getZone(state, 'deck').push(...restCards);
  shuffleZone(state, 'deck');

  // Top card of new deck → clock (true damage, no cancel)
  if (getZone(state, 'deck').length > 0) {
    const deck = getZone(state, 'deck');
    const card = deck.pop();
    getZone(state, 'clock').push(card);
    state.stats.trueDamage++;
    checkLevelUp(state);
  }

  return true;
}

/**
 * Ensure deck is non-empty by refreshing if needed.
 * Called before any card needs to be taken from deck.
 * Returns false if deck is still empty after attempting refresh.
 */
export function ensureDeck(state) {
  if (!zoneIsEmpty(state, 'deck')) return true;
  const refreshed = doRefresh(state);
  return refreshed && !zoneIsEmpty(state, 'deck');
}

// ── Level Up ──────────────────────────────────────────────────────────────────

/**
 * Perform Level Up resolution (rules 9.3):
 *   Take bottom 7 cards from clock.
 *   Choose 1 to put in level zone.
 *   Put remaining 6 in rest.
 *
 * chooser: 'optimal' | 'random' | CardFilter
 *   optimal = prefer non-climax (simulates best play)
 *   random  = random selection
 *   filter  = prefer card matching filter, else first available
 */
export function checkLevelUp(state, chooser = 'optimal') {
  const clock = getZone(state, 'clock');

  while (clock.length >= 7) {
    state.stats.levelUpCount++;

    // Take bottom 7 cards
    const bottom7 = clock.splice(0, 7);

    // Choose 1 card to put in level zone
    const chosen = pickLevelUpCard(bottom7, chooser);
    const rest6  = bottom7.filter(c => c !== chosen);

    // Move to zones
    getZone(state, 'level').push(chosen);
    getZone(state, 'rest').push(...rest6);

    // Check loss condition
    if (getZone(state, 'level').length >= 4) {
      state.ended    = true;
      state.endReason = 'level_4';
      return;
    }
  }
}

function pickLevelUpCard(cards, chooser) {
  if (chooser === 'optimal') {
    // Prefer non-climax to keep climaxes in the rest (cycling back to deck)
    return cards.find(c => !isClimax(c)) ?? cards[0];
  }
  if (chooser === 'random') {
    return cards[Math.floor(Math.random() * cards.length)];
  }
  if (typeof chooser === 'object') {
    // CardFilter: find first matching card
    return cards.find(c => matchesFilter(c, chooser))
        ?? cards.find(c => !isClimax(c))
        ?? cards[0];
  }
  return cards.find(c => !isClimax(c)) ?? cards[0];
}

// ── Loss Conditions ───────────────────────────────────────────────────────────

export function checkLoss(state) {
  if (state.ended) return true;

  // Level 4+
  if (getZone(state, 'level').length >= 4) {
    state.ended    = true;
    state.endReason = 'level_4';
    return true;
  }

  // Deck + rest both empty (can't refresh)
  if (zoneIsEmpty(state, 'deck') && zoneIsEmpty(state, 'rest')) {
    state.ended    = true;
    state.endReason = 'deck_rest_empty';
    return true;
  }

  return false;
}
