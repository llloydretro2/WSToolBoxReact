// WS Damage Simulator — Type Constants

export const CardType = Object.freeze({
  CHARACTER: 'character',
  EVENT:     'event',
  CLIMAX:    'climax',
});

export const Color = Object.freeze({
  YELLOW: 'yellow',
  GREEN:  'green',
  RED:    'red',
  BLUE:   'blue',
  PURPLE: 'purple',
});

export const TriggerType = Object.freeze({
  SOUL1:     'soul+1',
  SOUL2:     'soul+2',
  POOL:      'pool',
  COMEBACK:  'comeback',
  RETURN:    'return',
  DRAW:      'draw',
  TREASURE:  'treasure',
  SHOT:      'shot',
  GATE:      'gate',
  STANDBY:   'standby',
  CHOICE:    'choice',
  DISCOVERY: 'discovery',
  CHANCE:    'chance',
  FOCUS:     'focus',
});

export const ZoneId = Object.freeze({
  DECK:   'deck',
  CLOCK:  'clock',
  LEVEL:  'level',
  STOCK:  'stock',
  REST:   'rest',
  MEMORY: 'memory',
  HAND:   'hand',
});

// Zones where order matters (index 0 = bottom, last = top)
export const ORDERED_ZONES = new Set(['deck', 'clock', 'level', 'stock']);

// Zones where order is meaningless
export const UNORDERED_ZONES = new Set(['rest', 'memory', 'hand']);

// Zones that participate in Refresh
export const REFRESH_SOURCE = 'rest';
export const REFRESH_TARGET = 'deck';

export const OpType = Object.freeze({
  DAMAGE:          'damage',
  VARIABLE_DAMAGE: 'variable_damage',
  TRUE_DAMAGE:     'true_damage',
  MILL:            'mill',
  MOVE:            'move',
  SEARCH:          'search',
  FX:              'fx',
  SHUFFLE:         'shuffle',
  REORDER:         'reorder',
  STATE_EDIT:      'state_edit',
  CONDITIONAL:     'conditional',
  REFRESH:         'refresh',
  SEQUENCE:        'sequence',
});

export const InsertPos = Object.freeze({
  TOP:        'top',
  BOTTOM:     'bottom',
  SHUFFLE_IN: 'shuffle_in',
});

export const RemainderOrder = Object.freeze({
  ORIGINAL: 'original',
  SHUFFLE:  'shuffle',
  REVERSE:  'reverse',
  ANY:      'any',
});

export const EmptyPolicy = Object.freeze({
  STOP:         'stop',
  AUTO_REFRESH: 'auto_refresh',
  FAIL:         'fail',
  SKIP:         'skip',
});
