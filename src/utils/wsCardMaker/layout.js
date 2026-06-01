// WS Card Maker — Layout constants and asset path helpers
// Canvas size: 448×626 (character/event), 626×448 (climax, rotated 270°)
// All coordinates extracted from public/assets/card-maker/style (MSE plugin layout file)

export const CARD_W = 448;
export const CARD_H = 626;

const COLOR_CODE = { yellow: 'y', green: 'g', red: 'r', blue: 'b', purple: 'p' };

// Maps DB trigger names → trigger PNG filenames
const TRIGGER_FILE = {
  'soul+1':    'soul',
  'soul+2':    'goldbar',
  'gate':      'gate',
  'shot':      'shot',
  'standby':   'standby',
  'pool':      'goldbag',
  'comeback':  'bounce',
  'return':    'door',
  'draw':      'book',
  'treasure':  'ticket',
  'choice':    'choice',
  'discovery': 'discover',
  'chance':    'chance',
  'focus':     'focus',
};

// ── Path builders ──────────────────────────────────────────────────────────────

export function getFramePath(type, side, color, souls, hasTrigger) {
  const c = COLOR_CODE[color] ?? 'y';
  const s = ['weiss', 'schwarz', 'both'].includes(side) ? side : 'both';

  if (type === 'character') {
    if (souls === 0) return `/assets/card-maker/character/${s}/${c}0s.png`;
    const t = hasTrigger ? 1 : 0;
    return `/assets/card-maker/character/${s}/${c}${souls}s${t}t.png`;
  }
  if (type === 'event')  return `/assets/card-maker/event/${s}/${color}.png`;
  if (type === 'climax') return `/assets/card-maker/climax/${s}/${color}.png`;
  return '';
}

export function getMaskPath(type) {
  return `/assets/card-maker/${type}/mask2.png`;
}

export function getLevelPath(color, level) {
  if (level === 0) return '/assets/card-maker/level/l0.png';
  return `/assets/card-maker/level/${COLOR_CODE[color] ?? 'y'}l${level}.png`;
}

export function getCostPath(cost) {
  const safe = Math.max(0, Math.min(cost, 15));
  return `/assets/card-maker/cost/c${safe}.png`;
}

export function getTriggerPath(trigger) {
  const name = TRIGGER_FILE[trigger];
  return name ? `/assets/card-maker/triggers/${name}.png` : null;
}

export function getBackupPath(type) {
  if (type === 'backup')     return '/assets/card-maker/backup/back.png';
  if (type === 'clockshift') return '/assets/card-maker/backup/clock.png';
  return '/assets/card-maker/backup/nobackup.png';
}

// ── Element coordinates (all in 448×626 canvas) ────────────────────────────────

export const ELEMENTS = {
  // Image overlays
  level:    { x: 16,  y: 13,  w: 50, h: 60 },
  cost:     { x: 16,  y: 73,  w: 50, h: 42 },
  backup1:  { x: 23,  y: 118, w: 38, h: 38 },
  backup2:  { x: 23,  y: 156, w: 38, h: 38 },
  trigger:  { x: 385, y: 14,  w: 51, h: 58 },  // character / event
  trigger2: { x: 333, y: 14,  w: 51, h: 58 },  // climax second trigger slot

  // Text fields — cardname.top is Y of top edge; centered within the box
  cardname: {
    character: { x: 152, y: 557, w: 204, h: 24 },
    event:     { x: 152, y: 573, w: 204, h: 24 },
    climax:    { x: 54,  y: 377, w: 204, h: 24 },
  },

  power:  { x: 32,  y: 574, w: 90, h: 25 },

  // Traits — regular style (2 traits)
  trait1: { x: 212, y: 587, w: 90, h: 14 },
  trait2: { x: 314, y: 587, w: 90, h: 14 },

  // Small text
  serial: {
    character: { x: 44, y: 553, w: 77, h: 10 },
    event:     { x: 42, y: 578, w: 77, h: 10 },
    climax:    { x: 48, y: 268, w: 77, h: 10 },
  },
  artist: {
    character: { x: 61, y: 608, w: 323, h: 18 },
    event:     { x: 61, y: 608, w: 323, h: 18 },
    climax:    { x: 19, y: 260, w: 323, h: 18 },
  },

  // Dynamic text areas (bottomY = Y coordinate of bottom edge, text grows upward)
  rulesText: {
    character: { x: 26, bottomY: 543, w: 394 },
    event:     { x: 26, bottomY: 557, w: 394 },
    climax:    { x: 17, bottomY: 208, w: 204 },
  },
  flavorText: {
    character: { x: 20, w: 406 },
    event:     { x: 20, w: 406 },
    climax:    { x: 65, w: 398 },
  },
};
