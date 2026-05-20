/* eslint-disable react/prop-types */
/**
 * MahjongTile — renders a single riichi mahjong tile.
 *
 * Tile images: FluffyStuff/riichi-mahjong-tiles (CC0 public domain)
 * Source     : https://github.com/FluffyStuff/riichi-mahjong-tiles
 * License    : CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/
 * Assets in  : /public/assets/mahjong-tiles/
 *
 * Falls back to CSS/text rendering when an image fails to load.
 */
import React, { useState } from 'react';

// ── Image asset map ───────────────────────────────────────────────────────────

const TILE_IMAGE = {
  m1: '/assets/mahjong-tiles/Man1.svg',
  m2: '/assets/mahjong-tiles/Man2.svg',
  m3: '/assets/mahjong-tiles/Man3.svg',
  m4: '/assets/mahjong-tiles/Man4.svg',
  m5: '/assets/mahjong-tiles/Man5.svg',
  m6: '/assets/mahjong-tiles/Man6.svg',
  m7: '/assets/mahjong-tiles/Man7.svg',
  m8: '/assets/mahjong-tiles/Man8.svg',
  m9: '/assets/mahjong-tiles/Man9.svg',
  p1: '/assets/mahjong-tiles/Pin1.svg',
  p2: '/assets/mahjong-tiles/Pin2.svg',
  p3: '/assets/mahjong-tiles/Pin3.svg',
  p4: '/assets/mahjong-tiles/Pin4.svg',
  p5: '/assets/mahjong-tiles/Pin5.svg',
  p6: '/assets/mahjong-tiles/Pin6.svg',
  p7: '/assets/mahjong-tiles/Pin7.svg',
  p8: '/assets/mahjong-tiles/Pin8.svg',
  p9: '/assets/mahjong-tiles/Pin9.svg',
  s1: '/assets/mahjong-tiles/Sou1.svg',
  s2: '/assets/mahjong-tiles/Sou2.svg',
  s3: '/assets/mahjong-tiles/Sou3.svg',
  s4: '/assets/mahjong-tiles/Sou4.svg',
  s5: '/assets/mahjong-tiles/Sou5.svg',
  s6: '/assets/mahjong-tiles/Sou6.svg',
  s7: '/assets/mahjong-tiles/Sou7.svg',
  s8: '/assets/mahjong-tiles/Sou8.svg',
  s9: '/assets/mahjong-tiles/Sou9.svg',
  z1: '/assets/mahjong-tiles/Ton.svg',    // East
  z2: '/assets/mahjong-tiles/Nan.svg',    // South
  z3: '/assets/mahjong-tiles/Shaa.svg',   // West
  z4: '/assets/mahjong-tiles/Pei.svg',    // North
  z5: '/assets/mahjong-tiles/Haku.svg',   // White
  z6: '/assets/mahjong-tiles/Hatsu.svg',  // Green
  z7: '/assets/mahjong-tiles/Chun.svg',   // Red
};

// ── CSS fallback display ──────────────────────────────────────────────────────

const MAN_CHARS   = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const PIN_CHARS   = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
const SOU_CHARS   = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const HONOR_CHARS = { 1: '東', 2: '南', 3: '西', 4: '北', 5: '白', 6: '發', 7: '中' };
const SUIT_LABEL  = { m: '万', p: '饼', s: '索' };

const SUIT_STYLE = {
  m: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  p: { color: '#111', bg: '#fff', border: '#111', font: '"Helvetica Neue","Arial",sans-serif' },
  s: { color: '#111', bg: '#fff', border: '#111', font: '"Helvetica Neue","Arial",monospace' },
};
const HONOR_STYLE = {
  1: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  2: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  3: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  4: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  5: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  6: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
  7: { color: '#111', bg: '#fff', border: '#111', font: '"BIZUDPMincho","Noto Serif CJK SC",serif' },
};

function getFallbackChar(tile) {
  if (tile.suit === 'm') return MAN_CHARS[tile.value] ?? '';
  if (tile.suit === 'p') return PIN_CHARS[tile.value] ?? '';
  if (tile.suit === 's') return SOU_CHARS[tile.value] ?? '';
  return HONOR_CHARS[tile.value] ?? '';
}

function getFallbackStyle(tile) {
  if (tile.suit === 'z') return HONOR_STYLE[tile.value] ?? HONOR_STYLE[1];
  return SUIT_STYLE[tile.suit] ?? SUIT_STYLE.m;
}

// ── Size config ───────────────────────────────────────────────────────────────
// Tile images have a 3:4 aspect ratio (300×400).

const SIZE = {
  xs: { w: 24, h: 32,  imgP: '4px',  primaryFs: '0.82rem', labelFs: null,      honorFs: '0.88rem', r: 2 },
  sm: { w: 30, h: 40,  imgP: '3px',  primaryFs: '1.0rem',  labelFs: '0.5rem',  honorFs: '1.05rem', r: 2 },
  md: { w: 38, h: 51,  imgP: '4px',  primaryFs: '1.25rem', labelFs: '0.62rem', honorFs: '1.3rem',  r: 3 },
  lg: { w: 50, h: 67,  imgP: '5px',  primaryFs: '1.65rem', labelFs: '0.8rem',  honorFs: '1.7rem',  r: 3 },
};

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *   tile        {suit, value}           required
 *   size        'xs'|'sm'|'md'|'lg'    default 'md'
 *   onClick     fn(tile)                left-click
 *   onRightClick fn(tile)              right-click / context-menu
 *   disabled    bool
 *   selected    bool                    highlighted border
 *   count       number                  badge — current copies in hand
 *   maxCount    number                  default 4; count >= maxCount → disabled
 */
function MahjongTile({
  tile,
  size = 'md',
  onClick,
  onRightClick,
  disabled = false,
  selected = false,
  count,
  maxCount = 4,
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!tile) return null;

  const cfg        = SIZE[size] ?? SIZE.md;
  const key        = tile.suit + tile.value;
  const imageSrc   = TILE_IMAGE[key];
  const useImage   = !!imageSrc && !imgFailed;
  const fbStyle    = getFallbackStyle(tile);
  const isHonor    = tile.suit === 'z';
  const isAtMax    = count !== undefined && count >= maxCount;
  const isDisabled = disabled || isAtMax;
  const isClickable = !isDisabled && !!onClick;

  const handleClick = isClickable ? () => onClick(tile) : undefined;
  const handleContextMenu = onRightClick
    ? (e) => { e.preventDefault(); onRightClick(tile); }
    : undefined;

  const containerStyle = {
    position: 'relative',
    width: cfg.w,
    height: cfg.h,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: useImage
      ? '#fff'
      : '#fff',
    border: selected
      ? '2px solid #111'
      : '1.5px solid #111',
    borderRadius: cfg.r,
    boxShadow: isDisabled
      ? 'none'
      : selected
      ? '0 0 0 2px #e5e7eb, 2px 3px 6px rgba(0,0,0,0.2)'
      : '1px 2px 5px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
    cursor: isClickable ? 'pointer' : 'default',
    userSelect: 'none',
    opacity: isDisabled ? 0.4 : 1,
    overflow: 'visible',
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={containerStyle}
      className={isClickable ? 'mj-tile-interactive' : ''}
    >
      {useImage && (
        <img
          src={imageSrc}
          alt={key}
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: cfg.imgP,
            display: 'block',
            filter: isDisabled ? 'grayscale(80%) opacity(60%)' : 'none',
          }}
        />
      )}

      {!useImage && (
        isHonor ? (
          <span style={{
            fontSize: cfg.honorFs,
            fontWeight: 800,
            color: '#111',
            lineHeight: 1,
            fontFamily: fbStyle.font,
          }}>
            {getFallbackChar(tile)}
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <span style={{
              fontSize: cfg.primaryFs,
              fontWeight: tile.suit === 'm' ? 700 : 600,
              color: '#111',
              lineHeight: 1,
              fontFamily: fbStyle.font,
            }}>
              {getFallbackChar(tile)}
            </span>
            {cfg.labelFs && (
              <span style={{
                fontSize: cfg.labelFs,
                fontWeight: 600,
                color: '#111',
                lineHeight: 1,
                fontFamily: '"BIZUDPMincho","Noto Serif CJK SC",serif',
                opacity: 0.75,
              }}>
                {SUIT_LABEL[tile.suit]}
              </span>
            )}
          </div>
        )
      )}

      {count !== undefined && count > 0 && (
        <div style={{
          position: 'absolute',
          top: -5, right: -5,
          width: 15, height: 15,
          borderRadius: '50%',
          backgroundColor: '#fff',
          color: '#111',
          fontSize: '0.52rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #111',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {count}
        </div>
      )}
    </div>
  );
}

export default MahjongTile;
