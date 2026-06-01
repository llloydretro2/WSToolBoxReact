// WS Damage Simulator — Card Construction & Filter Matching

import { CardType, Color } from './types.js';

// ── Construction ──────────────────────────────────────────────────────────────

export function makeCard({
  type,
  color    = Color.YELLOW,
  level    = 0,
  cost     = 0,
  trigger  = null,
  soul     = undefined,
  power    = undefined,
  traits   = [],
  name     = undefined,
  id       = undefined,
} = {}) {
  if (!type) throw new Error('Card must have a type');
  return { type, color, level, cost, trigger, soul, power, traits, name, id };
}

export function makeClimax({
  color   = Color.YELLOW,
  trigger = null,
  name    = undefined,
  id      = undefined,
} = {}) {
  return makeCard({ type: CardType.CLIMAX, color, level: 0, cost: 0, trigger, name, id });
}

export function makeCharacter({
  color   = Color.YELLOW,
  level   = 0,
  cost    = 0,
  power   = 0,
  soul    = 1,
  trigger = null,
  traits  = [],
  name    = undefined,
  id      = undefined,
} = {}) {
  return makeCard({ type: CardType.CHARACTER, color, level, cost, power, soul, trigger, traits, name, id });
}

export function makeEvent({
  color   = Color.YELLOW,
  level   = 0,
  cost    = 0,
  trigger = null,
  traits  = [],
  name    = undefined,
  id      = undefined,
} = {}) {
  return makeCard({ type: CardType.EVENT, color, level, cost, trigger, traits, name, id });
}

// ── Type Helpers ──────────────────────────────────────────────────────────────

export const isClimax    = (card) => card.type === CardType.CLIMAX;
export const isNonClimax = (card) => card.type !== CardType.CLIMAX;
export const isCharacter = (card) => card.type === CardType.CHARACTER;
export const isEvent     = (card) => card.type === CardType.EVENT;

// ── Filter Matching ───────────────────────────────────────────────────────────

/**
 * Check if a card matches a CardFilter.
 *
 * CardFilter fields (all optional):
 *   type:       CardType | 'non_climax' | 'any'
 *   color:      Color | Color[]
 *   level:      number | { min?, max? }
 *   cost:       number | { min?, max? }
 *   power:      number | { min?, max? }
 *   soul:       number | { min?, max? }
 *   trigger:    TriggerType | 'any' | 'none'
 *   hasTrigger: boolean
 *   name:       string  (substring match)
 *   traits:     string[]  (card must have ALL listed traits)
 */
export function matchesFilter(card, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  // type
  if (filter.type !== undefined && filter.type !== 'any') {
    if (filter.type === 'non_climax') {
      if (isClimax(card)) return false;
    } else {
      if (card.type !== filter.type) return false;
    }
  }

  // color
  if (filter.color !== undefined) {
    if (Array.isArray(filter.color)) {
      if (!filter.color.includes(card.color)) return false;
    } else {
      if (card.color !== filter.color) return false;
    }
  }

  // numeric range fields
  for (const field of ['level', 'cost', 'power', 'soul']) {
    if (filter[field] === undefined) continue;
    const val = card[field];
    if (val === undefined || val === null) return false;
    const f = filter[field];
    if (typeof f === 'number') {
      if (val !== f) return false;
    } else {
      if (f.min !== undefined && val < f.min) return false;
      if (f.max !== undefined && val > f.max) return false;
    }
  }

  // trigger
  if (filter.trigger !== undefined) {
    if (filter.trigger === 'none') {
      if (card.trigger !== null && card.trigger !== undefined) return false;
    } else if (filter.trigger !== 'any') {
      if (card.trigger !== filter.trigger) return false;
    }
  }

  // hasTrigger
  if (filter.hasTrigger !== undefined) {
    const hasTrig = card.trigger !== null && card.trigger !== undefined;
    if (filter.hasTrigger !== hasTrig) return false;
  }

  // name (substring)
  if (filter.name !== undefined && filter.name !== null) {
    if (!card.name || !card.name.includes(filter.name)) return false;
  }

  // traits (card must have ALL listed traits)
  if (filter.traits && filter.traits.length > 0) {
    if (!card.traits) return false;
    for (const t of filter.traits) {
      if (!card.traits.includes(t)) return false;
    }
  }

  return true;
}

// ── Deck Builder Helpers ──────────────────────────────────────────────────────

/**
 * Build a deck array from a composition spec.
 * composition: [{ card: CardTemplate, count: number }, ...]
 */
export function buildDeck(composition) {
  const deck = [];
  for (const { card, count } of composition) {
    for (let i = 0; i < count; i++) deck.push({ ...card });
  }
  return deck;
}

/**
 * Quick deck from counts only (no specific attributes beyond type).
 * Useful for basic simulations where only type distribution matters.
 */
export function buildSimpleDeck({ characters = 0, events = 0, climaxes = 0, color = Color.YELLOW } = {}) {
  const deck = [];
  for (let i = 0; i < characters; i++) deck.push(makeCharacter({ color }));
  for (let i = 0; i < events; i++)     deck.push(makeEvent({ color }));
  for (let i = 0; i < climaxes; i++)   deck.push(makeClimax({ color }));
  return deck;
}

/**
 * Deck with realistic level distribution for accurate level-dependent effect testing.
 * Default: 50 cards, 8 climax — typical competitive deck level spread.
 *   level0: 20 (early-game characters / events)
 *   level1: 12
 *   level2:  8
 *   level3:  2 (finisher characters)
 *   climax:  8
 */
export function buildRealisticDeck({
  level0   = 20,
  level1   = 12,
  level2   = 8,
  level3   = 2,
  climaxes = 8,
  color    = Color.YELLOW,
} = {}) {
  const deck = [];
  for (let i = 0; i < level0; i++)   deck.push(makeCharacter({ color, level: 0, cost: 0 }));
  for (let i = 0; i < level1; i++)   deck.push(makeCharacter({ color, level: 1, cost: 1 }));
  for (let i = 0; i < level2; i++)   deck.push(makeCharacter({ color, level: 2, cost: 2 }));
  for (let i = 0; i < level3; i++)   deck.push(makeCharacter({ color, level: 3, cost: 2 }));
  for (let i = 0; i < climaxes; i++) deck.push(makeClimax({ color }));
  return deck;
}
