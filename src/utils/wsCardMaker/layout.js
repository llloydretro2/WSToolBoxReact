// WS Card Maker — Layout constants and asset path helpers
// Coordinates extracted from public/assets/card-maker/style (MSE plugin)
// Climax coordinates derived via 90° CW rotation: (x_p, y_p) → (625-y_p, x_p)

// ── Canvas dimensions ──────────────────────────────────────────────────────────

export const DIMS = {
  character: { w: 448, h: 626 },
  event:     { w: 448, h: 626 },
  climax:    { w: 626, h: 448 },
};

export function getCanvasSize(type) {
  return DIMS[type] ?? DIMS.character;
}

// ── Asset path builders ────────────────────────────────────────────────────────

const COLOR_CODE = { yellow: 'y', green: 'g', red: 'r', blue: 'b', purple: 'p' };

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

export function getFramePath(type, side, color, souls, hasTrigger) {
  const c = COLOR_CODE[color] ?? 'y';
  const s = ['weiss', 'schwarz', 'both'].includes(side) ? side : 'both';
  if (type === 'character') {
    if (souls === 0) return `/assets/card-maker/character/${s}/${c}0s.png`;
    return `/assets/card-maker/character/${s}/${c}${souls}s${hasTrigger ? 1 : 0}t.png`;
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
  return `/assets/card-maker/cost/c${Math.max(0, Math.min(cost, 15))}.png`;
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

// ── Layout configs per card type ───────────────────────────────────────────────
// All coordinates are in the card's OWN canvas space.
// Character/Event use 448×626 (portrait).
// Climax uses 626×448 (landscape), derived via 90° CW from portrait values.
//
// Shared helpers for text rendering:
//   rulesText:  { x, bottomY, w }   — text grows UPWARD from bottomY
//   flavorText: { x, w }            — positioned above rulesText, same direction
//   whitebar:   { x, w }            — semi-transparent bg behind effect+flavor text

export const LAYOUT = {
  character: {
    // Image overlays
    level:    { x: 16,  y: 13,  w: 50, h: 60 },
    cost:     { x: 16,  y: 73,  w: 50, h: 42 },
    backup1:  { x: 23,  y: 118, w: 38, h: 38 },
    trigger:  { x: 385, y: 14,  w: 51, h: 58 },
    // Text fields
    cardname: { x: 152, y: 557, w: 204, h: 24, angle: 0 },
    power:    { x: 32,  y: 574, w: 90,  h: 25 },
    trait1:   { x: 212, y: 587, w: 90,  h: 14 },
    trait2:   { x: 314, y: 587, w: 90,  h: 14 },
    serial:   { x: 44,  y: 553, w: 77,  h: 10 },
    artist:   { x: 61,  y: 608, w: 323, h: 18 },
    rulesText:  { x: 26, bottomY: 543, w: 394 },
    flavorText: { x: 20, w: 406 },
    whitebar:   { x: 20, w: 406 },
  },

  event: {
    // Image overlays (same x/y as character)
    level:    { x: 16,  y: 13,  w: 50, h: 60 },
    cost:     { x: 16,  y: 73,  w: 50, h: 42 },
    backup1:  { x: 23,  y: 118, w: 38, h: 38 },
    trigger:  { x: 385, y: 14,  w: 51, h: 58 },
    // Text fields — event has no power/traits, name and text positions differ
    cardname: { x: 152, y: 573, w: 204, h: 24, angle: 0 },
    serial:   { x: 42,  y: 578, w: 77,  h: 10 },
    artist:   { x: 61,  y: 608, w: 323, h: 18 },
    rulesText:  { x: 26, bottomY: 557, w: 394 },
    flavorText: { x: 20, w: 406 },
    whitebar:   { x: 20, w: 406 },
  },

  // Climax canvas: 626×448 (landscape).
  // Frame analysis: art area y=0-390, mechanics bar y=392-447.
  // Bar contains: CX label (left), name strip (x=240-355), two asterisk trigger slots (x≈355 and x≈580).
  climax: {
    // ── Derived from style file via 90°CCW formula: ──────────────────────────
    // landscape_x = top, landscape_y_bot = 447 - left, landscape_y_top = 447 - (left+h)
    //
    // Trigger icons: top=14, left=385, w=51, h=58
    trigger:  { x: 14, y:  4, w: 51, h: 58 },
    // Extra trigger: top=14, left=333, w=51, h=58 (stacked below trigger1)
    trigger2: { x: 14, y: 56, w: 51, h: 58 },
    // Card name: top=377, left=54, w=204, h=24  → landscape(377, 369, 204, 24)
    cardname: { x: 377, y: 369, w: 204, h: 24, angle: 0 },
    // Serial: top=268, left=48, w=77, h=10  → landscape(268, 389, 77, 10)
    serial:   { x: 268, y: 389, w: 77,  h: 10 },
    // Artist: top=260, left=19, w=323, h=18  → landscape(260, 410, 323, 18)
    artist:   { x: 260, y: 410, w: 323, h: 18 },
    // ── Text areas (empirical bottomY, x from style bottom= value) ───────────
    // Effect text: style bottom=19, left=17, width=204  → x=19, w=204
    // topY empirically capped at y=310 (matches card images)
    rulesText:  { x: 19, bottomY: 381, w: 204, topY: 310 },
    whitebar:   { x: 13, w: 216 },
    // Flavor text: style bottom=227, left=65, width=398  → x=227, w=398
    // bottomY empirically ~320 (above effect text, style_left=65 hints bar-relative)
    flavorText: { x: 227, w: 398, bottomY: 320, fontSize: 22, standalone: true },
  },
};

// ── Trait border helpers ───────────────────────────────────────────────────────
// Returns the three border image paths (left, middle, right) for a trait box
export function getTraitBorderPaths(hasValue) {
  const state = hasValue ? 'on' : 'off';
  return {
    l: `/assets/card-maker/traits/trait_border_${state}_left.png`,
    m: `/assets/card-maker/traits/trait_border_${state}_middle.png`,
    r: `/assets/card-maker/traits/trait_border_${state}_right.png`,
  };
}
