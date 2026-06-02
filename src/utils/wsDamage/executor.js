// WS Damage Simulator — Operation Executor

import { OpType, EmptyPolicy } from './types.js';
import { isClimax, matchesFilter } from './card.js';
import {
  getZone, zoneIsEmpty, insertCards, shuffleZone,
} from './state.js';
import { takeIntoWindow, buildWindowView, applyActSpec } from './window.js';
import { ensureDeck, doRefresh, checkLevelUp, checkLoss } from './rules.js';

// ── Public Execution Entry Points ─────────────────────────────────────────────

export function executeSequence(ops, state, config = {}) {
  if (!ops || ops.length === 0) return;
  for (const op of ops) {
    if (state.ended) break;
    executeOperation(op, state, config);
  }
}

export function executeOperation(op, state, config = {}) {
  if (state.ended) return;
  switch (op.type) {
    case OpType.DAMAGE:          return executeDamage(op, state, config);
    case OpType.VARIABLE_DAMAGE: return executeVariableDamage(op, state, config);
    case OpType.TRUE_DAMAGE:     return executeTrueDamage(op, state, config);
    case OpType.MILL:        return executeMill(op, state, config);
    case OpType.MOVE:        return executeMove(op, state, config);
    case OpType.SEARCH:      return executeSearch(op, state, config);
    case OpType.FX:          return executeFx(op, state, config);
    case OpType.SHUFFLE:     return executeShuffleOp(op, state, config);
    case OpType.REORDER:     return executeReorder(op, state, config);
    case OpType.STATE_EDIT:  return executeStateEdit(op, state, config);
    case OpType.CONDITIONAL: return executeConditional(op, state, config);
    case OpType.REFRESH:     return executeRefreshOp(op, state, config);
    case OpType.SEQUENCE:    return executeSequence(op.ops, state, config);
    default:
      throw new Error(`Unknown operation type: ${op.type}`);
  }
}

// ── Damage ────────────────────────────────────────────────────────────────────

function executeDamage(op, state, config) {
  const n      = op.n ?? 0;
  if (n <= 0) return;

  // Inject propagated effects
  let onCancel = op.onCancel ? [...op.onCancel] : [];
  if (state.propagated.inheritedCancel.length > 0) {
    onCancel = [...state.propagated.inheritedCancel, ...onCancel];
    state.propagated.inheritedCancel = [];
  }

  const watchCancel = [...state.propagated.watchCancel];
  state.propagated.watchCancel = [];

  const revealed = [];

  for (let i = 0; i < n; i++) {
    // Ensure deck has cards
    if (zoneIsEmpty(state, 'deck')) {
      if (!ensureDeck(state)) break;  // deck + rest empty → stop
    }
    if (state.ended) break;

    const deck = getZone(state, 'deck');
    const card  = deck.pop();
    revealed.push(card);

    if (isClimax(card)) {
      // Damage Cancel: all revealed cards go to rest
      getZone(state, 'rest').push(...revealed);

      state.lastResult = { type: 'damage', cancelled: true, cardsRevealed: [...revealed] };

      // Fire watchCancel effects (Shot trigger etc.)
      if (watchCancel.length > 0) {
        executeSequence(watchCancel, state, config);
      }

      // Fire onCancel effects (zj etc.)
      if (onCancel.length > 0) {
        executeSequence(onCancel, state, config);
      }

      // Propagate to next damage (传火)
      if (op.propagate && onCancel.length > 0) {
        state.propagated.inheritedCancel = onCancel;
      }

      return false;  // cancelled
    }
  }

  if (revealed.length === 0) return false;

  // All N cards revealed without a climax → enter clock
  getZone(state, 'clock').push(...revealed);
  state.stats.clockDamage += revealed.length;

  state.lastResult = {
    type: 'damage', cancelled: false,
    cardsRevealed: [...revealed], damageDealt: revealed.length,
  };

  checkLevelUp(state, config.levelUpChooser);
  checkLoss(state);

  // Fire onHit effects
  if (op.onHit && op.onHit.length > 0) {
    executeSequence(op.onHit, state, config);
  }

  return true;  // hit
}

// ── Variable Damage (n computed at runtime from state) ────���──────────────────

function executeVariableDamage(op, state, config) {
  const n = typeof op.nFn === 'function' ? Math.floor(op.nFn(state)) : 0;
  if (n <= 0) return;
  executeDamage({ ...op, type: OpType.DAMAGE, n }, state, config);
}

// ── True Damage (no cancel mechanic) ─────────────────────────────────────────

function executeTrueDamage(op, state, config) {
  const n = op.n ?? 0;
  if (n <= 0) return;

  for (let i = 0; i < n; i++) {
    if (zoneIsEmpty(state, 'deck')) {
      if (!ensureDeck(state)) break;
    }
    if (state.ended) break;

    const card = getZone(state, 'deck').pop();
    getZone(state, 'clock').push(card);
    state.stats.trueDamage++;
  }

  state.lastResult = { type: 'true_damage', damageDealt: n };
  checkLevelUp(state, config.levelUpChooser);
  checkLoss(state);
}

// ── Mill (top → rest, no cancel) ─────────────────────────────────────────────

function executeMill(op, state, _config) {
  const n    = op.n ?? 0;
  const from = op.from ?? 'top';

  const milled = [];
  for (let i = 0; i < n; i++) {
    if (zoneIsEmpty(state, 'deck')) {
      if (!ensureDeck(state)) break;
    }
    if (state.ended) break;

    const deck = getZone(state, 'deck');
    const card = from === 'top' ? deck.pop() : deck.shift();
    milled.push(card);
  }

  getZone(state, 'rest').push(...milled);
  state.lastResult = { type: 'mill', cardsMilled: milled.length };
}

// ── Move (window-based) ───────────────────────────────────────────────────────

function executeMove(op, state, config) {
  const { source, act, emptyPolicy, onClimax, onNormal, onMatch, onNoneMatch } = op;
  const policy = emptyPolicy ?? EmptyPolicy.STOP;

  // Handle empty source zone
  if (zoneIsEmpty(state, source.zone)) {
    if (source.zone === 'deck') {
      if (policy === EmptyPolicy.AUTO_REFRESH) {
        ensureDeck(state);
      } else if (policy === EmptyPolicy.SKIP) {
        return;
      } else if (policy === EmptyPolicy.FAIL) {
        throw new Error('MoveOp: source zone is empty');
      }
    } else if (policy === EmptyPolicy.SKIP) {
      return;
    }
  }

  // Take cards into window
  const windowCards = takeIntoWindow(state, source);
  state.window      = windowCards;

  const view = buildWindowView(windowCards);

  // Apply ActSpec (place cards into destinations)
  if (act) applyActSpec(state, act, windowCards);

  state.lastResult = {
    type: 'move',
    climaxFound: view.hasClimax,
    cardsRevealed: windowCards.map(w => w.card),
  };

  // Conditional triggers
  if (view.hasClimax && onClimax && onClimax.length > 0) {
    executeSequence(onClimax, state, config);
  }
  if (!view.hasClimax && onNormal && onNormal.length > 0) {
    executeSequence(onNormal, state, config);
  }
  if (onMatch) {
    for (const { filter, ops } of onMatch) {
      if (view.any(filter)) {
        executeSequence(ops, state, config);
      }
    }
  }
  // Fires when 0 cards in window match the filter (negation / "none of" condition)
  if (onNoneMatch) {
    for (const { filter, ops } of onNoneMatch) {
      if (view.count(filter) === 0) {
        executeSequence(ops, state, config);
      }
    }
  }

  checkLevelUp(state, config.levelUpChooser);
  checkLoss(state);
  state.window = null;
}

// ── Search ────────────────────────────────────────────────────────────────────

function executeSearch(op, state, _config) {
  const { zone, filter, count, destination, insertAt, afterSearch } = op;
  const zoneArr = getZone(state, zone);
  const toFind  = count ?? { type: 'exact', n: 1 };
  let found     = 0;
  const max     = toFind.type === 'all' ? Infinity : (toFind.n ?? 1);

  for (let i = zoneArr.length - 1; i >= 0 && found < max; i--) {
    if (matchesFilter(zoneArr[i], filter ?? {})) {
      const [card] = zoneArr.splice(i, 1);
      insertCards(state, destination, [card], insertAt ?? 'top');
      found++;
    }
  }

  if (afterSearch === 'shuffle') shuffleZone(state, zone);

  state.lastResult = { type: 'search', found };
}

// ── Fx (Reverse Wash) ─────────────────────────────────────────────────────────

function executeFx(op, state, _config) {
  const n      = op.n ?? 0;
  const filter = op.filter ?? { type: 'non_climax' };
  const rest   = getZone(state, 'rest');
  let moved    = 0;

  for (let i = rest.length - 1; i >= 0 && moved < n; i--) {
    if (matchesFilter(rest[i], filter)) {
      const [card] = rest.splice(i, 1);
      getZone(state, 'deck').push(card);
      moved++;
    }
  }

  shuffleZone(state, 'deck');
  state.lastResult = { type: 'fx', moved };
}

// ── Shuffle Zone ──────────────────────────────────────────────────────────────

function executeShuffleOp(op, state) {
  shuffleZone(state, op.zone);
  state.lastResult = { type: 'shuffle', zone: op.zone };
}

// ── Reorder ───────────────────────────────────────────────────────────────────

function executeReorder(op, state, _config) {
  const windowCards = takeIntoWindow(state, op.source);
  const { newOrder, destination } = op;

  let ordered;
  if (newOrder === 'random') {
    ordered = windowCards.map(w => w.card);
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  } else if (newOrder === 'player_choice') {
    // Simulate optimal ordering: non-climaxes on top, climaxes at bottom
    const nonCx = windowCards.filter(w => !isClimax(w.card)).map(w => w.card);
    const cx    = windowCards.filter(w =>  isClimax(w.card)).map(w => w.card);
    ordered = [...cx, ...nonCx];  // bottom = cx, top = nonCx (optimal: avoid cancel)
  } else if (Array.isArray(newOrder)) {
    ordered = windowCards.map(w => w.card);
  } else {
    ordered = windowCards.map(w => w.card);
  }

  const dest = destination ?? op.source.zone;
  const insertAt = destination === 'source' ? 'top' : 'top';
  insertCards(state, dest, ordered, insertAt);
  state.lastResult = { type: 'reorder' };
}

// ── State Edit ────────────────────────────────────────────────────────────────

function executeStateEdit(op, state) {
  const { zone, action, card, insertAt } = op;

  if (action === 'add') {
    const c = typeof card === 'object' && card.type ? card : { type: 'normal', ...card };
    insertCards(state, zone, [c], insertAt ?? 'top');
  } else if (action === 'remove') {
    const zoneArr = getZone(state, zone);
    const filter  = card;
    for (let i = zoneArr.length - 1; i >= 0; i--) {
      if (matchesFilter(zoneArr[i], filter ?? {})) {
        zoneArr.splice(i, 1);
        break;
      }
    }
  }

  state.lastResult = { type: 'state_edit', zone, action };
  checkLevelUp(state);
}

// ── Conditional ───────────────────────────────────────────────────────────────

function executeConditional(op, state, config) {
  const view = state.window ? buildWindowView(state.window) : null;
  const result = op.condition(state, view);
  if (result) {
    executeSequence(op.then, state, config);
  } else if (op.else) {
    executeSequence(op.else, state, config);
  }
}

// ── Explicit Refresh ──────────────────────────────────────────────────────────

function executeRefreshOp(op, state, _config) {
  doRefresh(state);
  checkLoss(state);
}
