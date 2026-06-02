// WS Card Maker — Canvas Rendering Engine

import {
  getCanvasSize,
  getFramePath, getMaskPath, getLevelPath, getCostPath, getTriggerPath, getBackupPath,
  getTraitBorderPaths,
  LAYOUT,
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
  { family: 'WSCardName', file: 'agfa rotis semi serif.ttf', weight: '400' },
  { family: 'WSEffect',   file: 'vagabond-regular.ttf',      weight: '400' },
  { family: 'WSEffect',   file: 'vagabond-bold.ttf',         weight: '700' },
  { family: 'WSPower',    file: 'warnockpro-semibold.otf',   weight: '600' },
  { family: 'WSFlavor',   file: 'souvenir lt.ttf',           weight: '400' },
  { family: 'WSMeta',     file: 'opensans-regular.ttf',      weight: '400' },
  { family: 'WSMeta',     file: 'opensans-bold.ttf',         weight: '700' },
];

export async function ensureFonts() {
  if (fontsReady) return;
  await Promise.allSettled(FONT_DEFS.map(async ({ family, file, weight }) => {
    const url = `/assets/card-maker/font/${encodeURIComponent(file)}`;
    const face = new FontFace(family, `url("${url}")`, { weight });
    document.fonts.add(await face.load());
  }));
  fontsReady = true;
}

// ── Canvas drawing primitives ──────────────────────────────────────────────────

function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = ctx.shadowOffsetY = ctx.shadowBlur = 0;
}

function setupText(ctx, { size, family, weight = '400', color, shadow = null, shadowBlur = 0 }) {
  ctx.font = `${weight === '700' ? 'bold ' : weight === '600' ? '600 ' : ''}${size}px ${family}, sans-serif`;
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 1;
    ctx.shadowBlur = shadowBlur;
  } else {
    clearShadow(ctx);
  }
}

// Center text in a box; scales horizontally if too wide
function drawFitText(ctx, text, el, opts) {
  if (!text || !el) return;
  setupText(ctx, opts);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const measured = ctx.measureText(text).width;
  if (measured > el.w) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(el.w / measured, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, cx, cy);
  }
  clearShadow(ctx);
}

// Character-level word wrap (supports CJK and mixed text)
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    let cur = '';
    for (const char of para) {
      const test = cur + char;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = char;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

// ── Masked art compositing ─────────────────────────────────────────────────────

async function drawMaskedArt(ctx, artSrc, maskSrc, transform, W, H) {
  const { scale = 1, offsetX = 0, offsetY = 0 } = transform ?? {};
  const [artImg, maskImg] = await Promise.all([loadImg(artSrc), loadImg(maskSrc)]);

  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tCtx = tmp.getContext('2d');

  const imgW = artImg.naturalWidth  || artImg.width;
  const imgH = artImg.naturalHeight || artImg.height;
  if (!imgW || !imgH) return;

  const coverScale = Math.max(W / imgW, H / imgH);
  const finalScale = coverScale * scale;
  const drawW = imgW * finalScale;
  const drawH = imgH * finalScale;
  const drawX = (W - drawW) / 2 + offsetX;
  const drawY = (H - drawH) / 2 + offsetY;

  tCtx.drawImage(artImg, drawX, drawY, drawW, drawH);

  // Apply mask: luminance → alpha
  const artData  = tCtx.getImageData(0, 0, W, H);
  const maskTmp  = document.createElement('canvas');
  maskTmp.width  = W; maskTmp.height = H;
  const mCtx    = maskTmp.getContext('2d');
  mCtx.drawImage(maskImg, 0, 0, W, H);
  const maskData = mCtx.getImageData(0, 0, W, H);
  const ap = artData.data;
  const mp = maskData.data;
  for (let i = 0; i < ap.length; i += 4) {
    ap[i + 3] = Math.round(mp[i] * 0.299 + mp[i + 1] * 0.587 + mp[i + 2] * 0.114);
  }
  tCtx.putImageData(artData, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}

// ── Shared layer renderers ─────────────────────────────────────────────────────

// Draws level + cost + backup + trigger overlays (character & event only)
async function drawStatIcons(ctx, data, layout) {
  const { color, level, cost, backup, trigger } = data;
  const hasTrigger = !!trigger && trigger !== 'none';

  if (layout.level) {
    const img = await loadImg(getLevelPath(color, level));
    const el = layout.level;
    ctx.drawImage(img, el.x, el.y, el.w, el.h);
  }
  if (layout.cost) {
    const img = await loadImg(getCostPath(cost));
    const el = layout.cost;
    ctx.drawImage(img, el.x, el.y, el.w, el.h);
  }
  if (layout.backup1 && backup && backup !== 'none') {
    const img = await loadImg(getBackupPath(backup));
    const el = layout.backup1;
    ctx.drawImage(img, el.x, el.y, el.w, el.h);
  }
  if (layout.trigger && hasTrigger) {
    const src = getTriggerPath(trigger);
    if (src) {
      try {
        const img = await loadImg(src);
        const el = layout.trigger;
        ctx.drawImage(img, el.x, el.y, el.w, el.h);
      } catch { /* ignore missing trigger icon */ }
    }
  }
}

// Draws climax trigger slot(s).
// Standard climax cards have one trigger; trigger2 only shows when explicitly set.
async function drawClimaxTriggers(ctx, data, layout) {
  const { trigger, trigger2 } = data;

  async function drawSlot(triggerType, el) {
    if (!triggerType || triggerType === 'none' || !el) return;
    const src = getTriggerPath(triggerType);
    if (!src) return;
    try {
      const img = await loadImg(src);
      ctx.drawImage(img, el.x, el.y, el.w, el.h);
    } catch { /* ignore */ }
  }

  await drawSlot(trigger,  layout.trigger);
  await drawSlot(trigger2, layout.trigger2);
}

// Trait borders (character only)
async function drawTraitBorders(ctx, trait1, trait2, layout) {
  async function drawBorder(el, hasValue) {
    const { l: lSrc, m: mSrc, r: rSrc } = getTraitBorderPaths(hasValue);
    const [lImg, mImg, rImg] = await Promise.all([loadImg(lSrc), loadImg(mSrc), loadImg(rSrc)]);
    const bH = 18;
    const bY = el.y + el.h - bH + 3;
    ctx.drawImage(lImg, el.x - 8, bY, 8, bH);
    ctx.drawImage(mImg, el.x,     bY, el.w, bH);
    ctx.drawImage(rImg, el.x + el.w, bY, 8, bH);
  }
  if (layout.trait1) await drawBorder(layout.trait1, !!trait1);
  if (layout.trait2) await drawBorder(layout.trait2, !!trait2);
}

// Climax standalone flavor text — large centered text over art area (no whitebar)
async function drawClimaxFlavor(ctx, flavor, layout) {
  if (!flavor) return;
  const fl = layout.flavorText;
  if (!fl?.standalone) return;

  const fontSize = fl.fontSize ?? 18;
  const lineH    = Math.round(fontSize * 1.35);

  setupText(ctx, {
    size: fontSize, family: 'WSFlavor', weight: '400',
    color: 'rgba(30,30,30,0.9)',
    shadow: 'rgba(255,255,255,0.7)', shadowBlur: 3,
  });
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const lines   = wrapText(ctx, flavor, fl.w);
  const totalH  = lines.length * lineH;
  const startY  = (fl.centerY ?? 280) - totalH / 2;
  const centerX = fl.x + fl.w / 2;

  lines.forEach((line, i) => {
    if (line) ctx.fillText(line, centerX, startY + i * lineH + lineH / 2);
  });
  clearShadow(ctx);
}

// Effect + flavor text with white bar background
async function drawEffectText(ctx, data, layout) {
  const { effect = '', flavor = '' } = data;
  // Climax: flavor is drawn separately by drawClimaxFlavor; skip it here
  const flavorInBox = layout.flavorText?.standalone ? '' : flavor;
  if (!effect && !flavorInBox) return;

  const FLAVOR_GAP  = 6;
  const ru = layout.rulesText;
  const fl = layout.flavorText;
  const wb = layout.whitebar;
  // topY: upper boundary for the text area (optional, used by climax)
  const topY = ru.topY ?? 0;
  const maxTextH = ru.bottomY - topY;

  // Determine font sizes that fit within the available vertical space
  let effectSize = 11, effectLine = 14;
  let flavorSize = 11, flavorLine = 13;

  if (effect || flavorInBox) {
    for (let attempt = 0; attempt < 6; attempt++) {
      let totalH = 0;
      if (effect) {
        setupText(ctx, { size: effectSize, family: 'WSEffect', weight: '400', color: 'rgb(20,20,20)' });
        totalH += wrapText(ctx, effect, ru.w).length * effectLine;
      }
      if (flavorInBox) {
        setupText(ctx, { size: flavorSize, family: 'WSFlavor', weight: '400', color: 'rgb(20,20,20)' });
        totalH += wrapText(ctx, flavorInBox, fl.w).length * flavorLine;
        if (effect) totalH += FLAVOR_GAP;
      }
      if (totalH <= maxTextH) break;
      effectSize = Math.max(7, effectSize - 1);
      effectLine = Math.round(effectSize * 1.27);
      flavorSize = Math.max(7, flavorSize - 1);
      flavorLine = Math.round(flavorSize * 1.18);
    }
  }

  // Measure final effect lines
  let effectLines = [];
  if (effect) {
    setupText(ctx, { size: effectSize, family: 'WSEffect', weight: '400', color: 'rgb(20,20,20)' });
    effectLines = wrapText(ctx, effect, ru.w);
  }

  // White background bar
  try {
    const whitebarImg = await loadImg('/assets/card-maker/bars/whitebar.png');
    const flavorLineCnt = flavorInBox
      ? (() => {
          setupText(ctx, { size: flavorSize, family: 'WSFlavor', weight: '400', color: 'rgb(20,20,20)' });
          return wrapText(ctx, flavorInBox, fl.w).length;
        })()
      : 0;
    const effectH = effectLines.length * effectLine;
    const flavorH = flavorLineCnt * flavorLine;
    const gapH    = (effectH > 0 && flavorH > 0) ? FLAVOR_GAP : 0;
    const barH    = Math.max(19, effectH + flavorH + gapH + 4);
    ctx.drawImage(whitebarImg, wb.x, ru.bottomY - barH, wb.w, barH);
  } catch { /* skip if missing */ }

  // Draw effect text
  if (effectLines.length > 0) {
    setupText(ctx, { size: effectSize, family: 'WSEffect', weight: '400', color: 'rgb(20,20,20)' });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let y = ru.bottomY - effectLines.length * effectLine;
    for (const line of effectLines) {
      if (line) ctx.fillText(line, ru.x, y);
      y += effectLine;
    }
    clearShadow(ctx);
  }

  // Draw flavor text (in-box, non-climax only)
  if (flavorInBox) {
    const effectH = effectLines.length * effectLine;
    const flavorBottom = ru.bottomY - effectH - (effectLines.length > 0 ? FLAVOR_GAP : 0);
    setupText(ctx, { size: flavorSize, family: 'WSFlavor', weight: '400', color: 'rgb(20,20,20)', shadow: 'rgba(255,255,255,0.5)', shadowBlur: 4 });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lines = wrapText(ctx, flavorInBox, fl.w);
    let y = flavorBottom - lines.length * flavorLine;
    for (const line of lines) {
      if (line) ctx.fillText(line, fl.x + fl.w / 2, y);
      y += flavorLine;
    }
    clearShadow(ctx);
  }
}

// All text labels (name, power, traits, serial, artist)
function drawLabels(ctx, data, layout) {
  const { name, power, trait1, trait2, serial, artist, type, side } = data;

  if (name && layout.cardname) {
    drawFitText(ctx, name, layout.cardname,
      { size: 16, family: 'WSCardName', weight: '400', color: 'rgb(255,255,255)', shadow: 'rgb(0,0,0)' }
    );
  }
  if (power != null && layout.power) {
    drawFitText(ctx, String(power), layout.power,
      { size: 21, family: 'WSPower', weight: '600', color: 'rgb(255,255,255)' }
    );
  }
  if (trait1 && layout.trait1) {
    drawFitText(ctx, trait1, layout.trait1,
      { size: 9, family: 'WSEffect', weight: '700', color: 'rgb(0,0,0)' }
    );
  }
  if (trait2 && layout.trait2) {
    drawFitText(ctx, trait2, layout.trait2,
      { size: 9, family: 'WSEffect', weight: '700', color: 'rgb(0,0,0)' }
    );
  }
  if (serial && layout.serial) {
    setupText(ctx, { size: 6.1, family: 'WSMeta', weight: '400', color: 'rgb(0,0,0)' });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const se = layout.serial;
    ctx.fillText(serial, se.x + se.w / 2, se.y + se.h / 2);
    clearShadow(ctx);
  }
  if (artist && layout.artist) {
    const sideColor = side === 'weiss' ? 'rgb(122,122,39)' : 'rgb(244,244,0)';
    setupText(ctx, { size: 6, family: 'WSMeta', weight: '700', color: sideColor });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ae = layout.artist;
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
    artTransform,
  } = data;

  const { w: W, h: H } = getCanvasSize(type);
  const layout = LAYOUT[type] ?? LAYOUT.character;
  const hasTrigger = !!trigger && trigger !== 'none';

  const ctx = canvas.getContext('2d');
  canvas.width  = W;
  canvas.height = H;

  // ① White base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // ② Masked art
  if (art) {
    try {
      await drawMaskedArt(ctx, art, getMaskPath(type), artTransform, W, H);
    } catch { /* continue without art */ }
  }

  // ③ Frame
  const frameImg = await loadImg(getFramePath(type, side, color, souls, hasTrigger));
  ctx.drawImage(frameImg, 0, 0, W, H);

  // ④ Stat icons (character & event)
  if (type !== 'climax') {
    await drawStatIcons(ctx, data, layout);
  } else {
    // ④b Climax two triggers
    await drawClimaxTriggers(ctx, data, layout);
  }

  // ⑤ Trait borders (character only)
  if (type === 'character') {
    await drawTraitBorders(ctx, data.trait1, data.trait2, layout);
  }

  // ⑥ Effect text with white bar background
  await drawEffectText(ctx, data, layout);

  // ⑥b Climax standalone flavor text (large, center-right, no whitebar)
  if (type === 'climax') {
    await drawClimaxFlavor(ctx, data.flavor, layout);
  }

  // ⑦ Other text labels
  drawLabels(ctx, data, layout);

  // ⑧ Clear overlay
  try {
    const clearImg = await loadImg('/assets/card-maker/clear/clear.png');
    ctx.drawImage(clearImg, 0, 0, W, H);
  } catch { /* optional */ }
}
