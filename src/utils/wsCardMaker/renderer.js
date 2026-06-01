// WS Card Maker — Canvas Rendering Engine

import {
  CARD_W, CARD_H,
  getFramePath, getMaskPath, getLevelPath, getCostPath, getTriggerPath, getBackupPath,
  ELEMENTS,
} from './layout.js';

// ── Image cache ────────────────────────────────────────────────────────────────

const imgCache = new Map();

function loadImg(src) {
  if (imgCache.has(src)) return Promise.resolve(imgCache.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => { imgCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`Image load failed: ${src}`));
    img.src = src;
  });
}

// ── Font loading ───────────────────────────────────────────────────────────────

let fontsReady = false;

const FONT_DEFS = [
  { family: 'WSCardName', file: 'agfa rotis semi serif.ttf',  weight: '400' },
  { family: 'WSEffect',   file: 'vagabond-regular.ttf',       weight: '400' },
  { family: 'WSEffect',   file: 'vagabond-bold.ttf',          weight: '700' },
  { family: 'WSPower',    file: 'warnockpro-semibold.otf',    weight: '600' },
  { family: 'WSFlavor',   file: 'souvenir lt.ttf',            weight: '400' },
  { family: 'WSMeta',     file: 'opensans-regular.ttf',       weight: '400' },
  { family: 'WSMeta',     file: 'opensans-bold.ttf',          weight: '700' },
];

export async function ensureFonts() {
  if (fontsReady) return;
  await Promise.allSettled(FONT_DEFS.map(async ({ family, file, weight }) => {
    const url = `/assets/card-maker/font/${encodeURIComponent(file)}`;
    const face = new FontFace(family, `url("${url}")`, { weight });
    const loaded = await face.load();
    document.fonts.add(loaded);
  }));
  fontsReady = true;
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
}

function setupText(ctx, { size, family, weight = '400', color, shadow = null, shadowBlur = 0 }) {
  const weightStr = weight === '700' ? 'bold ' : weight === '600' ? '600 ' : '';
  ctx.font = `${weightStr}${size}px ${family}, sans-serif`;
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = shadowBlur;
  } else {
    clearShadow(ctx);
  }
}

// Draws text centered in a box; scales horizontally if too wide
function drawFitText(ctx, text, cx, cy, maxW, opts) {
  if (!text) return;
  setupText(ctx, opts);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const measured = ctx.measureText(text).width;
  if (measured > maxW) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(maxW / measured, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, cx, cy);
  }
  clearShadow(ctx);
}

// Wraps text into lines respecting explicit \n and maxWidth
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    const words = para.split(' ');
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = word;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

// ── Mask-based art compositing ─────────────────────────────────────────────────

async function drawMaskedArt(ctx, artSrc, maskSrc) {
  const [artImg, maskImg] = await Promise.all([loadImg(artSrc), loadImg(maskSrc)]);

  const tmp = document.createElement('canvas');
  tmp.width = CARD_W;
  tmp.height = CARD_H;
  const tCtx = tmp.getContext('2d');

  // Draw scaled art
  tCtx.drawImage(artImg, 0, 0, CARD_W, CARD_H);

  // Apply mask: convert mask RGB luminance → art alpha channel
  const artData  = tCtx.getImageData(0, 0, CARD_W, CARD_H);
  const maskTmp  = document.createElement('canvas');
  maskTmp.width  = CARD_W;
  maskTmp.height = CARD_H;
  const mCtx = maskTmp.getContext('2d');
  mCtx.drawImage(maskImg, 0, 0, CARD_W, CARD_H);
  const maskData = mCtx.getImageData(0, 0, CARD_W, CARD_H);

  const ap = artData.data;
  const mp = maskData.data;
  for (let i = 0; i < ap.length; i += 4) {
    // Luminance: white=255 (show art), black=0 (hide art)
    ap[i + 3] = Math.round(mp[i] * 0.299 + mp[i + 1] * 0.587 + mp[i + 2] * 0.114);
  }
  tCtx.putImageData(artData, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}

// ── Trait borders ──────────────────────────────────────────────────────────────

async function drawTraitBorders(ctx, trait1, trait2) {
  const [onL, onM, onR, offL, offM, offR] = await Promise.all([
    loadImg('/assets/card-maker/traits/trait_border_on_left.png'),
    loadImg('/assets/card-maker/traits/trait_border_on_middle.png'),
    loadImg('/assets/card-maker/traits/trait_border_on_right.png'),
    loadImg('/assets/card-maker/traits/trait_border_off_left.png'),
    loadImg('/assets/card-maker/traits/trait_border_off_middle.png'),
    loadImg('/assets/card-maker/traits/trait_border_off_right.png'),
  ]);

  function drawBorder(el, hasValue) {
    const { x, y, w, h } = el;
    const bH = 18;
    const bY = y + h - bH + 3;
    const [l, m, r] = hasValue ? [onL, onM, onR] : [offL, offM, offR];
    ctx.drawImage(l, x - 8,    bY, 8, bH);
    ctx.drawImage(m, x,        bY, w, bH);
    ctx.drawImage(r, x + w,    bY, 8, bH);
  }

  drawBorder(ELEMENTS.trait1, !!trait1);
  drawBorder(ELEMENTS.trait2, !!trait2);
}

// ── Text rendering ─────────────────────────────────────────────────────────────

function drawTextLayers(ctx, data) {
  const { type, power, name, trait1, trait2, effect, flavor, serial, artist } = data;
  const nameEl  = ELEMENTS.cardname[type]  ?? ELEMENTS.cardname.character;
  const rulesEl = ELEMENTS.rulesText[type] ?? ELEMENTS.rulesText.character;
  const flavEl  = ELEMENTS.flavorText[type]?? ELEMENTS.flavorText.character;

  // Card name
  if (name) {
    drawFitText(ctx, name,
      nameEl.x + nameEl.w / 2, nameEl.y + nameEl.h / 2,
      nameEl.w,
      { size: 16, family: 'WSCardName', weight: '400', color: 'rgb(255,255,255)', shadow: 'rgb(0,0,0)' }
    );
  }

  // Power (character only)
  if (type === 'character' && power != null) {
    const pe = ELEMENTS.power;
    drawFitText(ctx, String(power),
      pe.x + pe.w / 2, pe.y + pe.h / 2,
      pe.w,
      { size: 21, family: 'WSPower', weight: '600', color: 'rgb(255,255,255)' }
    );
  }

  // Traits (character only)
  if (type === 'character') {
    if (trait1) {
      const te = ELEMENTS.trait1;
      drawFitText(ctx, trait1,
        te.x + te.w / 2, te.y + te.h / 2,
        te.w,
        { size: 9, family: 'WSEffect', weight: '700', color: 'rgb(0,0,0)' }
      );
    }
    if (trait2) {
      const te = ELEMENTS.trait2;
      drawFitText(ctx, trait2,
        te.x + te.w / 2, te.y + te.h / 2,
        te.w,
        { size: 9, family: 'WSEffect', weight: '700', color: 'rgb(0,0,0)' }
      );
    }
  }

  const EFFECT_SIZE  = 11;
  const EFFECT_LINE  = 14;
  const FLAVOR_SIZE  = 11;
  const FLAVOR_LINE  = 13;

  // Measure effect text lines first (needed to position flavor text)
  let effectLines = [];
  if (effect) {
    setupText(ctx, { size: EFFECT_SIZE, family: 'WSEffect', weight: '400', color: 'rgb(20,20,20)' });
    effectLines = wrapText(ctx, effect, rulesEl.w);
  }

  // Effect text — bottom-anchored, grows upward
  if (effectLines.length > 0) {
    setupText(ctx, { size: EFFECT_SIZE, family: 'WSEffect', weight: '400', color: 'rgb(20,20,20)' });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const totalH = effectLines.length * EFFECT_LINE;
    let y = rulesEl.bottomY - totalH;
    for (const line of effectLines) {
      if (line) ctx.fillText(line, rulesEl.x, y);
      y += EFFECT_LINE;
    }
    clearShadow(ctx);
  }

  // Flavor text — above effect text
  if (flavor) {
    const effectH = effectLines.length * EFFECT_LINE;
    const flavorBottom = rulesEl.bottomY - effectH - (effectLines.length > 0 ? 6 : 0);

    setupText(ctx, { size: FLAVOR_SIZE, family: 'WSFlavor', weight: '400', color: 'rgb(20,20,20)', shadow: 'rgba(255,255,255,0.5)', shadowBlur: 4 });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lines = wrapText(ctx, flavor, flavEl.w);
    const totalH = lines.length * FLAVOR_LINE;
    let y = flavorBottom - totalH;
    for (const line of lines) {
      if (line) ctx.fillText(line, flavEl.x + flavEl.w / 2, y);
      y += FLAVOR_LINE;
    }
    clearShadow(ctx);
  }

  // Serial number
  if (serial) {
    const se = ELEMENTS.serial[type] ?? ELEMENTS.serial.character;
    setupText(ctx, { size: 6.1, family: 'WSMeta', weight: '400', color: 'rgb(0,0,0)' });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(serial, se.x + se.w / 2, se.y + se.h / 2);
    clearShadow(ctx);
  }

  // Artist name
  if (artist) {
    const ae = ELEMENTS.artist[type] ?? ELEMENTS.artist.character;
    const sideColor = data.side === 'weiss' ? 'rgb(122,122,39)' : 'rgb(244,244,0)';
    setupText(ctx, { size: 6, family: 'WSMeta', weight: '700', color: sideColor });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(artist, ae.x + ae.w / 2, ae.y + ae.h / 2);
    clearShadow(ctx);
  }
}

// ── Main render function ───────────────────────────────────────────────────────

export async function renderCard(canvas, data) {
  await ensureFonts();

  const {
    type    = 'character',
    side    = 'both',
    color   = 'green',
    level   = 1,
    cost    = 0,
    souls   = 1,
    trigger = 'none',
    backup  = 'none',
    art     = null,
  } = data;

  const ctx = canvas.getContext('2d');
  canvas.width  = CARD_W;
  canvas.height = CARD_H;
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  const hasTrigger = !!trigger && trigger !== 'none';

  // ① Masked art
  if (art) {
    try {
      await drawMaskedArt(ctx, art, getMaskPath(type));
    } catch {
      // Art load failed — continue without art
    }
  }

  // ② Frame
  const frameImg = await loadImg(getFramePath(type, side, color, souls, hasTrigger));
  ctx.drawImage(frameImg, 0, 0, CARD_W, CARD_H);

  // ③ Level + Cost (not on climax)
  if (type !== 'climax') {
    const levelImg = await loadImg(getLevelPath(color, level));
    const el = ELEMENTS.level;
    ctx.drawImage(levelImg, el.x, el.y, el.w, el.h);

    const costImg = await loadImg(getCostPath(cost));
    const ec = ELEMENTS.cost;
    ctx.drawImage(costImg, ec.x, ec.y, ec.w, ec.h);
  }

  // ④ Backup badge (character/event only)
  if (type !== 'climax' && backup && backup !== 'none') {
    const b1Img = await loadImg(getBackupPath(backup));
    const eb = ELEMENTS.backup1;
    ctx.drawImage(b1Img, eb.x, eb.y, eb.w, eb.h);
  }

  // ⑤ Trigger icon
  if (hasTrigger) {
    const triggerSrc = getTriggerPath(trigger);
    if (triggerSrc) {
      try {
        const tImg = await loadImg(triggerSrc);
        const et = type === 'climax' ? ELEMENTS.trigger2 : ELEMENTS.trigger;
        ctx.drawImage(tImg, et.x, et.y, et.w, et.h);
      } catch { /* trigger image missing, skip */ }
    }
  }

  // ⑥ Trait borders (character only)
  if (type === 'character') {
    await drawTraitBorders(ctx, data.trait1, data.trait2);
  }

  // ⑦ Text layers
  drawTextLayers(ctx, { ...data, type, side });

  // ⑧ Clear overlay
  try {
    const clearImg = await loadImg('/assets/card-maker/clear/clear.png');
    ctx.drawImage(clearImg, 0, 0, CARD_W, CARD_H);
  } catch { /* optional overlay */ }
}
