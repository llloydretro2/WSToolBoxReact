/* eslint-disable react/prop-types */
import React from 'react';
import { Box, Stack, Typography, Button, Chip, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ClearIcon from '@mui/icons-material/Clear';
import MahjongTile from './MahjongTile';
import { tileKey } from '../../utils/mahjong/tileParser';

// ── Tile catalog ──────────────────────────────────────────────────────────────
const GROUPS = [
  {
    key: 'manzu',
    labelZh: '万子（1-9万）',
    labelEn: 'Manzu (1–9m)',
    tiles: Array.from({ length: 9 }, (_, i) => ({ suit: 'm', value: i + 1 })),
  },
  {
    key: 'pinzu',
    labelZh: '饼子（1-9饼）',
    labelEn: 'Pinzu (1–9p)',
    tiles: Array.from({ length: 9 }, (_, i) => ({ suit: 'p', value: i + 1 })),
  },
  {
    key: 'souzu',
    labelZh: '索子（1-9索）',
    labelEn: 'Souzu (1–9s)',
    tiles: Array.from({ length: 9 }, (_, i) => ({ suit: 's', value: i + 1 })),
  },
  {
    key: 'honors',
    labelZh: '字牌（风/三元）',
    labelEn: 'Honours (Winds / Dragons)',
    tiles: [1, 2, 3, 4, 5, 6, 7].map((v) => ({ suit: 'z', value: v })),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * MahjongTilePicker
 *
 * Props:
 *   allTiles            tile[]       all tiles across hand + melds + builder (for count badges)
 *   onTileClick         fn(tile)     left-click (add)
 *   onTileRightClick    fn(tile)     right-click (remove one copy)
 *   mode                'hand'|'meld'
 *   onModeChange        fn(mode)
 *   meldBuilder         tile[]       tiles being staged for next meld
 *   onAddMeld           fn()         finalise meldBuilder as a meld
 *   onClearMeldBuilder  fn()
 *   onRemoveFromBuilder fn(idx)      remove tile at index from meldBuilder
 *   locale              'zh'|'en'
 *   size                tile size   default 'sm'
 */
function MahjongTilePicker({
  allTiles = [],
  onTileClick,
  onTileRightClick,
  mode = 'hand',
  onModeChange,
  meldBuilder = [],
  onAddMeld,
  onClearMeldBuilder,
  onRemoveFromBuilder,
  locale = 'zh',
  size = 'sm',
}) {
  // Per-tile count across all tiles (hand + melds + builder)
  const counts = {};
  for (const t of allTiles) {
    const k = tileKey(t);
    counts[k] = (counts[k] ?? 0) + 1;
  }

  const isMeldMode = mode === 'meld';
  const canAddMeld = meldBuilder.length >= 3 && meldBuilder.length <= 4;

  const toggleSx = {
    fontSize: '0.78rem',
    px: 1.25,
    py: 0.4,
    '&.Mui-selected': { backgroundColor: 'var(--primary)', color: 'var(--text)', fontWeight: 700 },
    '&.Mui-selected:hover': { backgroundColor: 'var(--primary-hover)' },
  };

  return (
    <Box>
      {/* Mode toggle */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Typography variant="caption" fontWeight={700} color="var(--text-secondary)">
          {locale === 'zh' ? '添加到：' : 'Add to:'}
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && onModeChange?.(v)}
          size="small"
        >
          <ToggleButton value="hand" sx={toggleSx}>
            {locale === 'zh' ? '暗手' : 'Hand'}
          </ToggleButton>
          <ToggleButton value="meld" sx={toggleSx}>
            {locale === 'zh' ? '副露' : 'Meld'}
          </ToggleButton>
        </ToggleButtonGroup>
        {!isMeldMode && (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {locale === 'zh' ? '左键添加 · 右键移除一张' : 'Left-click add · Right-click remove'}
          </Typography>
        )}
      </Stack>

      {/* Meld builder (only in meld mode) */}
      {isMeldMode && (
        <Box sx={{
          mb: 1.5, p: 1.25,
          backgroundColor: 'rgba(255,210,160,0.15)',
          border: '1px dashed #f0a060',
          borderRadius: 1.5,
        }}>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
            sx={{ display: 'block', mb: 0.75 }}>
            {locale === 'zh'
              ? `副露构建中（${meldBuilder.length}/3-4张，点击牌移除，点击"确认副露"添加）`
              : `Meld builder (${meldBuilder.length}/3–4 tiles, click tile to remove, then "Add Meld")`}
          </Typography>

          <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
            {meldBuilder.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                {locale === 'zh' ? '点击下方牌面添加到副露' : 'Click tiles below to build a meld'}
              </Typography>
            ) : (
              meldBuilder.map((tile, i) => (
                <MahjongTile
                  key={i}
                  tile={tile}
                  size={size}
                  onClick={() => onRemoveFromBuilder?.(i)}
                />
              ))
            )}

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" spacing={0.75}>
              <Button
                variant="contained"
                size="small"
                disabled={!canAddMeld}
                startIcon={<AddCircleOutlineIcon />}
                onClick={onAddMeld}
                sx={{
                  fontSize: '0.72rem',
                  backgroundColor: canAddMeld ? 'var(--primary)' : undefined,
                  color: canAddMeld ? 'var(--text)' : undefined,
                  '&:hover': { backgroundColor: 'var(--primary-hover)' },
                }}
              >
                {locale === 'zh' ? '确认副露' : 'Add Meld'}
              </Button>
              {meldBuilder.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={onClearMeldBuilder}
                  sx={{ fontSize: '0.72rem' }}
                >
                  {locale === 'zh' ? '清空' : 'Clear'}
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Tile grid */}
      <Stack spacing={1.25}>
        {GROUPS.map(({ key, labelZh, labelEn, tiles }) => (
          <Box key={key}>
            <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
              sx={{ display: 'block', mb: 0.6, letterSpacing: '0.02em' }}>
              {locale === 'zh' ? labelZh : labelEn}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.6}>
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
                    disabled={cnt >= 4}
                  />
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Typography variant="caption" color="text.disabled"
        sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
        {locale === 'zh'
          ? '右键点击牌面可移除一张 · 红色数字表示已满4张'
          : 'Right-click a tile to remove one copy · Red badge = 4 copies (full)'}
      </Typography>
    </Box>
  );
}

export default MahjongTilePicker;
