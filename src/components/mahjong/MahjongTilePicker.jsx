/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import MahjongTile from './MahjongTile';
import { tileKey } from '../../utils/mahjong/tileParser';

// ── Meld validator ────────────────────────────────────────────────────────────

function validateMeld(tiles) {
  const n = tiles.length;
  if (n < 3) return { valid: false, reason: null };
  if (n > 4) return { valid: false, reason: { zh: '副露最多4张', en: 'Max 4 tiles per meld' } };

  const sorted = [...tiles].sort((a, b) =>
    a.suit !== b.suit ? a.suit.localeCompare(b.suit) : a.value - b.value
  );

  const allSame = sorted.every(t => t.suit === sorted[0].suit && t.value === sorted[0].value);
  if (allSame) {
    if (n === 3) return { valid: true, label: { zh: '刻子 ✓', en: 'Triplet ✓' } };
    if (n === 4) return { valid: true, label: { zh: '杠 ✓',   en: 'Quad ✓'    } };
  }

  if (n === 4) {
    return { valid: false, reason: { zh: '杠须为4张相同的牌', en: 'Kan requires 4 identical tiles' } };
  }

  // Sequence check (3 tiles only)
  const allSameSuit = sorted.every(t => t.suit === sorted[0].suit);
  if (!allSameSuit) {
    return { valid: false, reason: { zh: '顺子须为同一花色', en: 'Sequence must be same suit' } };
  }
  if (sorted[0].suit === 'z') {
    return { valid: false, reason: { zh: '字牌不能组成顺子', en: 'Honors cannot form sequences' } };
  }
  if (sorted[1].value === sorted[0].value + 1 && sorted[2].value === sorted[0].value + 2) {
    return { valid: true, label: { zh: '顺子 ✓', en: 'Sequence ✓' } };
  }
  return { valid: false, reason: { zh: '须为连续数字', en: 'Numbers must be consecutive' } };
}

// ── Tile catalog ──────────────────────────────────────────────────────────────

const GROUPS = [
  {
    key: 'manzu',
    short: '万',
    labelZh: '万子',
    labelEn: 'Manzu',
    tiles: Array.from({ length: 9 }, (_, i) => ({ suit: 'm', value: i + 1 })),
  },
  {
    key: 'pinzu',
    short: '饼',
    labelZh: '饼子',
    labelEn: 'Pinzu',
    tiles: Array.from({ length: 9 }, (_, i) => ({ suit: 'p', value: i + 1 })),
  },
  {
    key: 'souzu',
    short: '索',
    labelZh: '索子',
    labelEn: 'Souzu',
    tiles: Array.from({ length: 9 }, (_, i) => ({ suit: 's', value: i + 1 })),
  },
  {
    key: 'redFives',
    short: '赤',
    labelZh: '赤五',
    labelEn: 'Red 5s',
    tiles: [
      { suit: 'm', value: 5, red: true },
      { suit: 'p', value: 5, red: true },
      { suit: 's', value: 5, red: true },
    ],
  },
  {
    key: 'honors',
    short: '字',
    labelZh: '字牌',
    labelEn: 'Honors',
    tiles: [1, 2, 3, 4, 5, 6, 7].map((v) => ({ suit: 'z', value: v })),
  },
];

function MahjongTilePicker({
  allTiles = [],
  totalCount = 0,
  onTileClick,
  onTileRightClick,
  onMeldTileClick,
  meldBuilder = [],
  onAddMeld,
  onClearMeldBuilder,
  onRemoveFromBuilder,
  locale = 'zh',
  size = 'sm',
}) {
  const [meldOpen, setMeldOpen] = useState(false);

  const counts = {};
  for (const t of allTiles) {
    const k = tileKey(t);
    counts[k] = (counts[k] ?? 0) + 1;
  }

  const isHandFull = totalCount >= 14;
  const meldValidation = validateMeld(meldBuilder);
  const canAddMeld = meldValidation.valid;

  return (
    <div>
      {/* Hint + counter */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-black">
          {locale === 'zh'
            ? '左键添加到暗手 · 右键移除一张'
            : 'Left-click to add · Right-click to remove'}
        </p>
        <span className={`text-[11px] font-bold tabular-nums text-black`}>
          {totalCount} / 14
        </span>
      </div>

      {/* Suit rows */}
      <div className="flex flex-col gap-3">
        {GROUPS.map(({ key, short, tiles }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-5 text-center text-[11px] font-black text-black shrink-0 select-none">
              {short}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tiles.map((tile) => {
                const cnt = counts[tileKey(tile)] ?? 0;
                return (
                  <MahjongTile
                    key={tileKey(tile)}
                    tile={tile}
                    size={size}
                    onClick={onTileClick}
                    onRightClick={onTileRightClick}
                    count={cnt}
                    maxCount={4}
                    disabled={cnt >= 4 || isHandFull}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Meld builder — toggle */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-black" />
        <button
          onClick={() => setMeldOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-700 transition-colors shrink-0"
        >
          {locale === 'zh' ? '副露构建' : 'Meld Builder'}
          {meldBuilder.length > 0 && (
            <span className="opacity-70">({meldBuilder.length})</span>
          )}
          <ChevronDown
            size={11}
            className={`transition-transform duration-200 ${meldOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className="flex-1 h-px bg-black" />
      </div>

        {meldOpen && (
          <div className="mt-3">
            {/* Staged tiles */}
            <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
              {meldBuilder.length === 0 ? (
                <span className="text-[11px] text-black">
                  {locale === 'zh' ? '从下方选牌加入副露' : 'Click tiles below to build a meld'}
                </span>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  {meldBuilder.map((tile, i) => (
                    <MahjongTile
                      key={i}
                      tile={tile}
                      size="xs"
                      onClick={() => onRemoveFromBuilder?.(i)}
                    />
                  ))}
                </div>
              )}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button
                  disabled={!canAddMeld}
                  onClick={onAddMeld}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${
                    canAddMeld ? 'bg-black text-white hover:bg-gray-700' : 'text-black cursor-not-allowed'
                  }`}
                >
                  {locale === 'zh' ? '+ 确认副露' : '+ Confirm'}
                </button>
                {meldBuilder.length > 0 && (
                  <button
                    onClick={onClearMeldBuilder}
                    className="text-[11px] text-black hover:text-black transition-colors"
                  >
                    {locale === 'zh' ? '清空' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            {/* Validation message */}
            {meldBuilder.length >= 3 && (
              <p className={`text-[11px] mt-1.5 mb-2 ${meldValidation.valid ? 'text-black' : 'text-black'}`}>
                {meldValidation.valid
                  ? (locale === 'zh' ? meldValidation.label.zh : meldValidation.label.en)
                  : meldValidation.reason
                    ? (locale === 'zh' ? meldValidation.reason.zh : meldValidation.reason.en)
                    : null}
              </p>
            )}

            {/* Compact xs picker for meld */}
            <div className="flex flex-col gap-2">
              {GROUPS.map(({ key, short, tiles }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-4 text-center text-[10px] font-black text-black shrink-0">
                    {short}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tiles.map((tile) => {
                      const cnt = counts[tileKey(tile)] ?? 0;
                      return (
                        <MahjongTile
                          key={tileKey(tile)}
                          tile={tile}
                          size="xs"
                          onClick={onMeldTileClick}
                          count={cnt}
                          maxCount={4}
                          disabled={cnt >= 4 || isHandFull}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

export default MahjongTilePicker;
