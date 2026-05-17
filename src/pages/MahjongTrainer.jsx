/* eslint-disable react/prop-types */
import React, { useState, useMemo } from "react";
import {
  Box, Container, Typography, Paper, Grid, Stack, Chip, Divider,
  ToggleButton, ToggleButtonGroup, FormControlLabel, Switch,
  Collapse, Alert, AlertTitle, IconButton, Tooltip, Snackbar, Fab,
} from "@mui/material";
import ExpandMoreIcon        from "@mui/icons-material/ExpandMore";
import ExpandLessIcon        from "@mui/icons-material/ExpandLess";
import SearchIcon            from "@mui/icons-material/Search";
import RefreshRoundedIcon    from "@mui/icons-material/RefreshRounded";
import GridViewRoundedIcon   from "@mui/icons-material/GridViewRounded";
import CloseRoundedIcon      from "@mui/icons-material/CloseRounded";
import KeyboardArrowUpIcon   from "@mui/icons-material/KeyboardArrowUp";
import { PrimaryButton, DangerButton, SecondaryButton } from "../components/ButtonVariants";
import MahjongTile       from "../components/mahjong/MahjongTile";
import MahjongTilePicker from "../components/mahjong/MahjongTilePicker";
import { useLocale }     from "../contexts/LocaleContext";
import { sortTiles, tileName, tileKey, groupTiles } from "../utils/mahjong/tileParser";
import { analyzeHand, FEASIBILITY } from "../utils/mahjong/yakuAnalyzer";

// ── Feasibility config ────────────────────────────────────────────────────────

const FEASIBILITY_CONFIG = {
  [FEASIBILITY.CONFIRMED]: { color: '#1b4332', bg: '#a6ceb6', labelZh: '已确立', labelEn: 'Confirmed' },
  [FEASIBILITY.HIGH]:      { color: '#1b4332', bg: '#bdeacf', labelZh: '高可行', labelEn: 'High'      },
  [FEASIBILITY.MEDIUM]:    { color: '#7c4a00', bg: '#ffe0a0', labelZh: '可行',   labelEn: 'Medium'    },
  [FEASIBILITY.LOW]:       { color: '#7c2d00', bg: '#ffd0a8', labelZh: '较低',   labelEn: 'Low'       },
  [FEASIBILITY.VERY_LOW]:  { color: '#6a1a1a', bg: '#ffc0c0', labelZh: '极低',   labelEn: 'Very Low'  },
  [FEASIBILITY.IMPOSSIBLE]:{ color: '#555',    bg: '#ddd',    labelZh: '不可能', labelEn: 'Impossible' },
};

const FEASIBILITY_ORDER = [
  FEASIBILITY.CONFIRMED, FEASIBILITY.HIGH, FEASIBILITY.MEDIUM,
  FEASIBILITY.LOW, FEASIBILITY.VERY_LOW, FEASIBILITY.IMPOSSIBLE,
];

// ── Engine output → UI view-model adapter ─────────────────────────────────────
/**
 * Thin adapter: reshapes raw analyzeHand() output into UI-friendly fields.
 * No new calculation logic — only data restructuring.
 */
function buildTrainerViewModel(analysis, concealedTiles, openMelds) {
  const { handStatus, routes, warnings } = analysis;

  // Shanten is computed once and stored on every route; extract from the first.
  const shanten = routes.length > 0 ? (routes[0].shanten ?? null) : null;

  const sortByFeasibility = (arr) =>
    [...arr].sort(
      (a, b) =>
        FEASIBILITY_ORDER.indexOf(a.feasibility) -
        FEASIBILITY_ORDER.indexOf(b.feasibility)
    );

  const regularRoutes  = sortByFeasibility(routes.filter((r) => !r.isYakuman));
  const yakumanRoutes  = sortByFeasibility(routes.filter((r) => r.isYakuman));

  return {
    hand: {
      concealedTiles,
      openMelds,
      isOpen:           handStatus.isOpen,
      isComplete:       handStatus.isComplete,
      tileCountStatus:  handStatus.tileCountStatus,
      concealedCount:   handStatus.concealedCount,
      numMelds:         handStatus.numMelds,
      expectedWaiting:  handStatus.expectedWaiting,
      expectedComplete: handStatus.expectedComplete,
      shanten,
      confirmedRoutes:  handStatus.confirmedRoutes,
      confirmedHan:     handStatus.confirmedHan,
      errors:           handStatus.errors,
    },
    warnings,
    regularRoutes,
    yakumanRoutes,
  };
}

// ── Small display helpers ─────────────────────────────────────────────────────

function FeasibilityChip({ feasibility, locale }) {
  const cfg = FEASIBILITY_CONFIG[feasibility] ?? FEASIBILITY_CONFIG[FEASIBILITY.IMPOSSIBLE];
  return (
    <Chip label={locale === 'zh' ? cfg.labelZh : cfg.labelEn} size="small"
      sx={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.68rem', height: 20 }} />
  );
}

function HanDisplay({ han, isOpen, locale }) {
  if (han.closed === 'yakuman') {
    return <Chip size="small" label={locale === 'zh' ? '役满' : 'Yakuman'}
      sx={{ backgroundColor: '#ffd700', color: '#4a3000', fontWeight: 700, fontSize: '0.68rem', height: 20 }} />;
  }
  const v = isOpen
    ? (han.open != null ? `${han.open}${locale === 'zh' ? '番' : 'han (open)'}` : (locale === 'zh' ? '仅门清' : 'closed only'))
    : `${han.closed}${locale === 'zh' ? '番' : 'han'}`;
  return <Chip size="small" variant="outlined" label={v}
    sx={{ fontWeight: 600, fontSize: '0.68rem', height: 20 }} />;
}

/** Compact shanten label displayed prominently in the hand status panel. */
function ShantenBadge({ shanten, locale }) {
  if (shanten === null || shanten === undefined) return null;
  if (shanten === -1)
    return <Chip size="small" label={locale === 'zh' ? '✓ 完整和牌' : '✓ Complete'}
      sx={{ backgroundColor: '#4caf50', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />;
  if (shanten === 0)
    return <Chip size="small" label={locale === 'zh' ? '听牌' : 'Tenpai'}
      sx={{ backgroundColor: '#1a5fac', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />;
  const col = shanten === 1 ? '#d97706' : '#888';
  return <Chip size="small"
    label={locale === 'zh' ? `${shanten}向听` : `${shanten}-shanten`}
    sx={{ backgroundColor: col, color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />;
}

/** A single row of tiles within one group (meld / pair). */
function TileGroup({ tiles, size = 'xs' }) {
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.2}>
      {tiles.map((tile, i) => <MahjongTile key={i} tile={tile} size={size} />)}
    </Stack>
  );
}

/** Several tile groups with spacing between them, wrapping on narrow screens. */
function TileGroupRow({ groups, size = 'xs' }) {
  if (!groups?.length) return null;
  return (
    <Box sx={{ maxWidth: '100%', overflowX: 'auto' }}>
      <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={1.25}>
        {groups.map((group, gi) => <TileGroup key={gi} tiles={group} size={size} />)}
      </Stack>
    </Box>
  );
}

/** Inline label + tile row (for Need / Discard). */
function LabeledTileRow({ label, labelColor, tiles, size = 'xs' }) {
  if (!tiles?.length) return null;
  return (
    <Stack direction="row" alignItems="flex-start" gap={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="caption" fontWeight={700} color={labelColor ?? 'text.secondary'}
        sx={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.65rem', lineHeight: '22px' }}>
        {label}
      </Typography>
      <Stack direction="row" gap={0.2} flexWrap="wrap" sx={{ minWidth: 0 }}>
        {tiles.map((t, i) => <MahjongTile key={i} tile={t} size={size} />)}
      </Stack>
    </Stack>
  );
}

// ── Scenario display (spec layout: Need · Discard · Target · Why) ─────────────

function ScenarioDisplay({ scenario, locale }) {
  const text          = locale === 'zh' ? scenario.zh  : scenario.en;
  const neededTiles   = scenario.neededTiles  ?? scenario.drawOrCall ?? scenario.needed ?? [];
  const discardTiles  = scenario.discardTiles ?? scenario.discard ?? [];
  const targetGroups  = scenario.targetYakuGroups ?? null;
  const routeType     = scenario.routeType;
  const isExample     = !!scenario.isExample;

  const badgeLabel = routeType === 'one-step' ? null
    : routeType === 'short'        ? (locale === 'zh' ? '短期路线' : 'Short route')
    : routeType === 'longer-term'  ? (locale === 'zh' ? '较长路线' : 'Longer-term route')
    : (isExample                   ? (locale === 'zh' ? '参考路线' : 'Reference route') : null);

  return (
    <Box sx={{
      mt: 0.75, p: 1,
      border: '1px solid var(--border)', borderRadius: 1.5,
      backgroundColor: 'rgba(166,206,182,0.06)',
      minWidth: 0, overflow: 'hidden',
    }}>
      {badgeLabel && (
        <Chip label={badgeLabel} size="small"
          sx={{ fontSize: '0.58rem', height: 16, mb: 0.5, backgroundColor: 'rgba(0,0,0,0.07)' }} />
      )}

      {/* Need + Discard on one row where space allows */}
      {(neededTiles.length > 0 || discardTiles.length > 0) && (
        <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 0.25 }}>
          <LabeledTileRow
            label={locale === 'zh' ? '摸/碰：' : 'Need:'}
            labelColor="success.main"
            tiles={neededTiles}
          />
          <LabeledTileRow
            label={locale === 'zh' ? '打出：' : 'Discard:'}
            labelColor="error.main"
            tiles={discardTiles}
          />
        </Stack>
      )}

      {/* Target yaku structure */}
      {targetGroups?.length > 0 && (
        <Box sx={{ mt: 0.6 }}>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
            sx={{ display: 'block', fontSize: '0.62rem', mb: 0.3 }}>
            {locale === 'zh' ? '目标役种结构：' : 'Target yaku structure:'}
          </Typography>
          <TileGroupRow groups={targetGroups} />
        </Box>
      )}

      {/* Why explanation */}
      {text?.explanation && (
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 0.5, lineHeight: 1.55 }}>
          {text.explanation}
        </Typography>
      )}
    </Box>
  );
}

// ── Fixed hand summary bar ────────────────────────────────────────────────────
/**
 * Always fixed below the AppBar as soon as the user has added any tiles.
 * Shows the live current hand (concealedTiles + openMelds from component state)
 * so it is visible at all times — while building the hand AND while scrolling
 * through yaku route cards.
 *
 * Rendered OUTSIDE the Container so it spans the full viewport width.
 * A compensating spacer is added at the top of the Container when this bar
 * is visible, preventing the page title from sliding behind it.
 *
 * Individual tiles are clickable for removal; melds have a × button.
 */
function FixedHandBar({ concealedTiles, openMelds, vm, onRemoveTile, onRemoveMeld, locale }) {
  if (!concealedTiles?.length && !openMelds?.length) return null;

  const isOpen  = openMelds.length > 0;
  const shanten = vm?.hand?.shanten ?? null;
  const hasNoYaku = vm && isOpen && !(vm.hand?.confirmedRoutes?.length);

  const concealedCount = concealedTiles.length;
  const meldTileCount  = openMelds.reduce((s, m) => s + m.length, 0);
  const totalCount     = concealedCount + meldTileCount;

  return (
    // Outer wrapper: full-width, fixed, gives the 8px breathing gap from the AppBar
    <Box sx={{
      position: 'fixed',
      top: { xs: 'calc(56px + 8px)', sm: 'calc(64px + 8px)' },
      // Inset left/right so the bar floats rather than being edge-to-edge
      left: { xs: 8, sm: 16, md: 24 },
      right: { xs: 8, sm: 16, md: 24 },
      zIndex: 900,
    }}>
      {/* Floating panel */}
      <Paper elevation={0} sx={{
        borderRadius: 2.5,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        px: { xs: 1.25, sm: 1.75 },
        py: 0.75,
        maxWidth: 'lg',
        mx: 'auto',
      }}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>

          {/* ── Tile count indicator ── */}
          <Stack direction="column" alignItems="center" sx={{
            flexShrink: 0, mr: 0.5,
            borderRight: '1px solid var(--border)', pr: 1,
          }}>
            <Typography sx={{ fontSize: '0.58rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
              {locale === 'zh' ? '手' : 'Hnd'} {concealedCount}
              {openMelds.length > 0 ? `  +${meldTileCount}` : ''}
            </Typography>
            <Typography sx={{
              fontSize: '0.7rem', fontWeight: 800,
              color: totalCount === 14 ? 'var(--success)' : totalCount > 14 ? 'var(--error)' : 'var(--text)',
              lineHeight: 1.2,
            }}>
              {locale === 'zh' ? '共' : 'Tot'} {totalCount}
            </Typography>
          </Stack>

          {/* ── Status badges ── */}
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
            <Chip size="small"
              label={isOpen ? (locale === 'zh' ? '副露' : 'Open') : (locale === 'zh' ? '门清' : 'Closed')}
              sx={{
                backgroundColor: isOpen ? '#ffd0a8' : '#a6ceb6',
                color: isOpen ? '#7c2d00' : '#1b4332',
                fontWeight: 700, fontSize: '0.62rem', height: 20,
              }}
            />
            {shanten !== null && <ShantenBadge shanten={shanten} locale={locale} />}
            {hasNoYaku && (
              <Chip size="small" label={locale === 'zh' ? '⚠️ 无役' : '⚠️ No yaku'}
                sx={{ backgroundColor: '#ffd0a8', color: '#7c2d00', fontWeight: 700, fontSize: '0.62rem', height: 20 }} />
            )}
          </Stack>

          {/* ── Live tile display — click tile to remove, × to remove whole meld ── */}
          <Box sx={{ overflowX: 'auto', flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
              {/* Concealed hand — click to remove one copy */}
              {sortTiles(concealedTiles).map((tile, i) => (
                <Tooltip key={i}
                  title={locale === 'zh' ? `移除一张${tileName(tile, 'zh')}` : `Remove one ${tileName(tile, 'en')}`}>
                  <Box>
                    <MahjongTile tile={tile} size="xs" onClick={onRemoveTile} />
                  </Box>
                </Tooltip>
              ))}
              {/* Open melds — × button removes whole meld */}
              {openMelds.length > 0 && (
                <>
                  <Typography variant="caption" color="text.disabled"
                    fontWeight={700} sx={{ lineHeight: '22px', flexShrink: 0 }}>+</Typography>
                  <Stack direction="row" gap={0.6} flexWrap="wrap">
                    {openMelds.map((meld, mi) => (
                      <Stack key={mi} direction="row" alignItems="center" gap={0.1} sx={{
                        px: 0.4, py: '2px',
                        backgroundColor: 'rgba(255,210,160,0.3)',
                        border: '1px solid #f0c88a', borderRadius: 1,
                      }}>
                        {meld.map((tile, ti) => (
                          <MahjongTile key={ti} tile={tile} size="xs" />
                        ))}
                        <IconButton size="small" onClick={() => onRemoveMeld(mi)}
                          sx={{ p: 0.1, color: 'error.main' }}>
                          <CloseRoundedIcon sx={{ fontSize: '0.7rem' }} />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          </Box>

        </Stack>
      </Paper>
    </Box>
  );
}

// ── Yaku route card (collapsible) ─────────────────────────────────────────────
// Collapsed (default): yaku name + meaning + example hand + feasibility badge.
// Expanded:            adds Need / Discard / Target yaku structure / Why.

function RouteCard({ route, isOpen, locale }) {
  const [expanded, setExpanded] = useState(false);

  const {
    feasibility, nameZh, nameEn, nameJa, zh, en,
    openAllowed, impossibleReason, han, exampleHand,
    meaning, scenarios,
  } = route;

  const name        = locale === 'zh' ? nameZh : nameEn;
  const text        = locale === 'zh' ? zh : en;
  const meaningText = meaning ? (locale === 'zh' ? meaning.zh : meaning.en) : null;
  const reason      = impossibleReason
    ? (locale === 'zh' ? impossibleReason.zh : impossibleReason.en) : null;
  const cfg          = FEASIBILITY_CONFIG[feasibility] ?? FEASIBILITY_CONFIG[FEASIBILITY.IMPOSSIBLE];
  const isImpossible = feasibility === FEASIBILITY.IMPOSSIBLE;

  // Whether there is expandable detail (scenarios or explanation text)
  const hasDetail = !isImpossible && (scenarios?.length > 0 || !!text?.explanation);

  return (
    <Paper elevation={0} sx={{
      border: `1px solid ${isImpossible ? '#ddd' : 'var(--border)'}`,
      borderLeft: `4px solid ${cfg.bg}`,
      borderRadius: 2,
      backgroundColor: isImpossible ? 'rgba(0,0,0,0.02)' : 'transparent',
      opacity: isImpossible ? 0.7 : 1,
      minWidth: 0, overflow: 'hidden',
    }}>

      {/* ── Collapsed summary — always visible, click to expand ── */}
      <Box
        onClick={() => hasDetail && setExpanded((v) => !v)}
        sx={{
          p: 1.5,
          cursor: hasDetail ? 'pointer' : 'default',
          userSelect: 'none',
          '&:hover': hasDetail ? { backgroundColor: 'rgba(0,0,0,0.018)' } : {},
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ mb: 0.35 }}>
          <Typography fontWeight={700} fontSize="0.9rem" color="var(--text)">{name}</Typography>
          <Typography variant="caption" color="text.secondary"
            sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>{nameJa}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <FeasibilityChip feasibility={feasibility} locale={locale} />
          <HanDisplay han={han} isOpen={isOpen} locale={locale} />
          {!openAllowed && (
            <Chip size="small" variant="outlined"
              label={locale === 'zh' ? '门清限定' : 'Closed only'}
              sx={{ fontSize: '0.6rem', height: 18 }} />
          )}
          {hasDetail && (
            <IconButton size="small" tabIndex={-1} sx={{ p: 0.3, ml: 0.25 }}
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              aria-label={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </Stack>

        {/* Meaning — always visible */}
        {meaningText && (
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', fontStyle: 'italic', mb: 0.5, lineHeight: 1.5 }}>
            {meaningText}
          </Typography>
        )}

        {/* Impossible reason */}
        {isImpossible && reason && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.4 }}>
            {locale === 'zh' ? '无法达成：' : 'Blocked: '}{reason}
          </Typography>
        )}

        {/* Example yaku hand — always visible for quick recognition */}
        {exampleHand?.length > 0 && (
          <Box>
            <Typography variant="caption" fontWeight={600} color="var(--text-secondary)"
              sx={{ display: 'block', fontSize: '0.62rem', mb: 0.3 }}>
              {locale === 'zh' ? '示例和牌型：' : 'Example yaku hand:'}
            </Typography>
            <TileGroupRow groups={exampleHand} />
          </Box>
        )}
      </Box>

      {/* ── Expanded detail: Need / Discard / Target / Why ── */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ p: 1.5, pt: 1 }}>
          {!isImpossible && scenarios?.length > 0 && (
            scenarios.map((s, i) => <ScenarioDisplay key={i} scenario={s} locale={locale} />)
          )}
          {!isImpossible && !scenarios?.length && text?.explanation && (
            <Typography variant="caption" color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.55 }}>
              {text.explanation}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Hand status panel ─────────────────────────────────────────────────────────

function HandStatusPanel({ vm, locale }) {
  const { hand } = vm;
  const {
    tileCountStatus, concealedCount, numMelds, expectedWaiting, expectedComplete,
    isOpen, isComplete, shanten, confirmedRoutes, confirmedHan,
  } = hand;
  const totalTiles = concealedCount + numMelds * 3;

  const statusLabel = tileCountStatus === 'complete' && isComplete
    ? null  // already shown by ShantenBadge
    : tileCountStatus === 'waiting'
      ? (locale === 'zh' ? '等待摸牌' : 'Waiting')
      : tileCountStatus === 'low'
        ? (locale === 'zh'
            ? `暗手${concealedCount}张，期望${expectedWaiting}–${expectedComplete}张`
            : `${concealedCount} tiles — expected ${expectedWaiting}–${expectedComplete}`)
        : (locale === 'zh'
            ? `暗手${concealedCount}张，可能过多`
            : `${concealedCount} tiles — may be too many`);

  return (
    <Paper elevation={0} sx={{
      p: { xs: 2, md: 2.5 }, mb: 2,
      border: '1px solid var(--border)', borderRadius: 2,
      backgroundColor: 'transparent',
    }}>
      {/* Top row: open/closed + shanten + tile count */}
      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
        <Chip size="small"
          label={isOpen ? (locale === 'zh' ? '副露手' : 'Open') : (locale === 'zh' ? '门清手' : 'Closed')}
          sx={{
            backgroundColor: isOpen ? '#ffd0a8' : '#a6ceb6',
            color: isOpen ? '#7c2d00' : '#1b4332',
            fontWeight: 700, fontSize: '0.7rem', height: 22,
          }}
        />
        <ShantenBadge shanten={shanten} locale={locale} />
        <Chip size="small" variant="outlined"
          label={locale === 'zh'
            ? `暗手${concealedCount} · 副露${numMelds}组 · 共${totalTiles}张`
            : `${concealedCount} concealed · ${numMelds} meld(s) · ${totalTiles} total`}
          sx={{ fontSize: '0.62rem', height: 20 }}
        />
        {statusLabel && (
          <Typography variant="caption" color={tileCountStatus === 'low' || tileCountStatus === 'high' ? 'warning.main' : 'text.secondary'}>
            {statusLabel}
          </Typography>
        )}
      </Stack>

      {/* Confirmed yaku */}
      {confirmedRoutes?.length > 0 && (
        <Box>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
            sx={{ display: 'block', mb: 0.4, fontSize: '0.65rem' }}>
            {locale === 'zh' ? `已确立役种（${confirmedHan}番）：` : `Confirmed yaku (${confirmedHan} han):`}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {confirmedRoutes.map((r) => (
              <Chip key={r.id} size="small"
                label={locale === 'zh' ? r.nameZh : r.nameEn}
                sx={{ backgroundColor: '#a6ceb6', color: '#1b4332', fontWeight: 700, fontSize: '0.68rem', height: 22 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {confirmedRoutes?.length === 0 && isOpen && (
        <Typography variant="caption" color="error">
          {locale === 'zh' ? '❌ 当前无确立役种' : '❌ No confirmed yaku'}
        </Typography>
      )}
    </Paper>
  );
}

// ── Warnings ──────────────────────────────────────────────────────────────────

function WarningsSection({ warnings, locale }) {
  if (!warnings?.length) return null;
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {warnings.map((w) => {
        const txt = locale === 'zh' ? w.zh : w.en;
        return (
          <Alert key={w.id} severity={w.severity ?? 'info'} sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>{txt.title}</AlertTitle>
            {txt.body}
          </Alert>
        );
      })}
    </Stack>
  );
}

// ── Yaku routes panel ─────────────────────────────────────────────────────────

function YakuRoutesPanel({ vm, locale }) {
  const { regularRoutes, yakumanRoutes, hand } = vm;
  const [showImpossible, setShowImpossible] = useState(false);
  const [showYakuman,    setShowYakuman]    = useState(false);
  const [showImpYakuman, setShowImpYakuman] = useState(false);

  const feasibleRoutes   = regularRoutes.filter((r) => r.feasibility !== FEASIBILITY.IMPOSSIBLE);
  const impossibleRoutes = regularRoutes.filter((r) => r.feasibility === FEASIBILITY.IMPOSSIBLE);
  const yakumanFeasible  = yakumanRoutes.filter((r) => r.feasibility !== FEASIBILITY.IMPOSSIBLE);
  const yakumanImpossible = yakumanRoutes.filter((r) => r.feasibility === FEASIBILITY.IMPOSSIBLE);
  const isOpen = hand.isOpen;

  return (
    <Box>
      <Typography fontWeight={700} fontSize="1rem" color="var(--text)" sx={{ mb: 1.5 }}>
        {locale === 'zh' ? '役种路线分析' : 'Yaku Route Analysis'}
      </Typography>

      {/* Feasible regular routes — 2-column on desktop */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        {feasibleRoutes.map((r) => (
          <Grid key={r.id} size={{ xs: 12, md: 6 }}>
            <RouteCard route={r} isOpen={isOpen} locale={locale} />
          </Grid>
        ))}
      </Grid>

      {/* Impossible regular routes (collapsed) */}
      {impossibleRoutes.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <SecondaryButton variant="outlined" size="small"
            onClick={() => setShowImpossible((v) => !v)}
            endIcon={showImpossible ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: 1, fontSize: '0.78rem' }}>
            {locale === 'zh'
              ? `${showImpossible ? '收起' : '显示'}不可达役种（${impossibleRoutes.length}）`
              : `${showImpossible ? 'Hide' : 'Show'} impossible yaku (${impossibleRoutes.length})`}
          </SecondaryButton>
          <Collapse in={showImpossible}>
            <Grid container spacing={1.5}>
              {impossibleRoutes.map((r) => (
                <Grid key={r.id} size={{ xs: 12, md: 6 }}>
                  <RouteCard route={r} isOpen={isOpen} locale={locale} />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </Box>
      )}

      <Divider sx={{ my: 1.5 }} />

      {/* Yakuman routes (collapsed) */}
      <SecondaryButton variant="outlined" size="small"
        onClick={() => setShowYakuman((v) => !v)}
        endIcon={showYakuman ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1, fontSize: '0.78rem' }}>
        {locale === 'zh'
          ? `${showYakuman ? '收起' : '显示'}役满参考（${yakumanFeasible.length + yakumanImpossible.length}种）`
          : `${showYakuman ? 'Hide' : 'Show'} Yakuman reference (${yakumanFeasible.length + yakumanImpossible.length})`}
      </SecondaryButton>

      <Collapse in={showYakuman}>
        {yakumanFeasible.length > 0 && (
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {yakumanFeasible.map((r) => (
              <Grid key={r.id} size={{ xs: 12, md: 6 }}>
                <RouteCard route={r} isOpen={isOpen} locale={locale} />
              </Grid>
            ))}
          </Grid>
        )}
        {yakumanImpossible.length > 0 && (
          <Box>
            <SecondaryButton variant="outlined" size="small"
              onClick={() => setShowImpYakuman((v) => !v)}
              endIcon={showImpYakuman ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1, fontSize: '0.78rem' }}>
              {locale === 'zh'
                ? `${showImpYakuman ? '收起' : '显示'}不可达役满（${yakumanImpossible.length}）`
                : `${showImpYakuman ? 'Hide' : 'Show'} impossible yakuman (${yakumanImpossible.length})`}
            </SecondaryButton>
            <Collapse in={showImpYakuman}>
              <Grid container spacing={1.5}>
                {yakumanImpossible.map((r) => (
                  <Grid key={r.id} size={{ xs: 12, md: 6 }}>
                    <RouteCard route={r} isOpen={isOpen} locale={locale} />
                  </Grid>
                ))}
              </Grid>
            </Collapse>
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIND_OPTIONS = [
  { value: 1, zh: '东', en: 'East'  },
  { value: 2, zh: '南', en: 'South' },
  { value: 3, zh: '西', en: 'West'  },
  { value: 4, zh: '北', en: 'North' },
];


// ── Main page component ───────────────────────────────────────────────────────

function MahjongTrainer() {
  const { t, locale } = useLocale();

  // ── State ──────────────────────────────────────────────────────────────────
  const [concealedTiles, setConcealedTiles] = useState([]);
  const [openMelds,      setOpenMelds]      = useState([]);
  const [pickerMode,     setPickerMode]     = useState('hand');
  const [meldBuilder,    setMeldBuilder]    = useState([]);
  const [showPicker,     setShowPicker]     = useState(true);
  const [seatWind,       setSeatWind]       = useState(1);
  const [roundWind,      setRoundWind]      = useState(1);
  const [openTanyao,     setOpenTanyao]     = useState(true);
  const [twoHanMin,      setTwoHanMin]      = useState(false);
  const [result,         setResult]         = useState(null);
  const [analyzeError,   setAnalyzeError]   = useState('');
  const [tileWarning,    setTileWarning]    = useState('');

  // ── Derived ────────────────────────────────────────────────────────────────
  const allTiles = useMemo(
    () => [...concealedTiles, ...openMelds.flat(), ...meldBuilder],
    [concealedTiles, openMelds, meldBuilder]
  );
  const tileCounts = useMemo(() => groupTiles(allTiles), [allTiles]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTileClick = (tile) => {
    const total = tileCounts[tileKey(tile)] ?? 0;
    if (total >= 4) {
      setTileWarning(
        locale === 'zh'
          ? `${tileName(tile, 'zh')}已有4张，不能再添加！`
          : `Already 4 ${tileName(tile, 'en')} — cannot add more.`
      );
      return;
    }
    if (pickerMode === 'hand') {
      setConcealedTiles((prev) => [...prev, tile]);
    } else {
      setMeldBuilder((prev) => [...prev, tile]);
    }
  };

  const handleTileRightClick = (tile) => {
    const removeLastOf = (arr, match) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (tileKey(copy[i]) === tileKey(match)) { copy.splice(i, 1); break; }
      }
      return copy;
    };
    if (pickerMode === 'hand') {
      setConcealedTiles((prev) => removeLastOf(prev, tile));
    } else {
      setMeldBuilder((prev) => removeLastOf(prev, tile));
    }
  };

  const handleRemoveFromHand = (tile) => {
    setConcealedTiles((prev) => {
      const copy = [...prev];
      const idx  = copy.findIndex((t) => tileKey(t) === tileKey(tile));
      if (idx >= 0) copy.splice(idx, 1);
      return copy;
    });
  };


  const handleAddMeld = () => {
    if (meldBuilder.length < 3) {
      setTileWarning(locale === 'zh' ? '副露至少需要3张牌' : 'A meld needs at least 3 tiles.');
      return;
    }
    setOpenMelds((prev) => [...prev, [...meldBuilder]]);
    setMeldBuilder([]);
  };

  const handleClearMeldBuilder   = () => setMeldBuilder([]);
  const handleRemoveFromBuilder   = (idx) => setMeldBuilder((prev) => prev.filter((_, i) => i !== idx));
  const handleRemoveMeld          = (idx) => setOpenMelds((prev) => prev.filter((_, i) => i !== idx));

  const handleAnalyze = () => {
    setAnalyzeError('');
    if (concealedTiles.length === 0 && openMelds.length === 0) {
      setAnalyzeError(locale === 'zh' ? '请先用选择器添加手牌' : 'Please add tiles using the picker first.');
      return;
    }
    const rules    = { openTanyao, twoHanMin };
    const analysis = analyzeHand(concealedTiles, openMelds, seatWind, roundWind, rules);
    const vm       = buildTrainerViewModel(analysis, [...concealedTiles], [...openMelds]);
    setResult({ vm });
  };

  const handleReset = () => {
    setConcealedTiles([]); setOpenMelds([]); setMeldBuilder([]);
    setPickerMode('hand'); setShowPicker(true);
    setSeatWind(1); setRoundWind(1);
    setOpenTanyao(true); setTwoHanMin(false);
    setResult(null); setAnalyzeError('');
  };

  // ── Shared sx ──────────────────────────────────────────────────────────────

  const paperSx = {
    p: { xs: 2.5, md: 3.5 }, backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    boxShadow: '0 20px 45px -18px rgba(0,0,0,0.15)',
    borderRadius: 2, mb: 3,
  };
  const toggleButtonSx = {
    fontSize: '0.82rem', px: 1.25, py: 0.5,
    '&.Mui-selected': { backgroundColor: 'var(--primary)', color: 'var(--text)', fontWeight: 700 },
    '&.Mui-selected:hover': { backgroundColor: 'var(--primary-hover)' },
  };
  const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--primary)' },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--primary)' },
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: '100%' }}>
      {/* Fixed hand bar — live state, visible as soon as the user adds any tile.
          Spans the full viewport width, sits below the AppBar, shows at all times. */}
      {(concealedTiles.length > 0 || openMelds.length > 0) && (
        <FixedHandBar
          concealedTiles={concealedTiles}
          openMelds={openMelds}
          vm={result?.vm ?? null}
          onRemoveTile={handleRemoveFromHand}
          onRemoveMeld={handleRemoveMeld}
          locale={locale}
        />
      )}

      <Container maxWidth="lg">

        {/* Spacer: 8px AppBar gap + ~48px floating bar height */}
        {(concealedTiles.length > 0 || openMelds.length > 0) && (
          <Box sx={{ height: { xs: '66px', sm: '62px' } }} />
        )}

        {/* Title */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight={700} color="var(--text)" gutterBottom>
            {t('mahjong.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('mahjong.subtitle')}
          </Typography>
        </Box>

        {/* ── A. Hand Input Panel ──────────────────────────────────────────── */}
        <Paper elevation={8} sx={paperSx}>

          {/* Hand tiles are displayed in the fixed bar at top.
              Inline hint shown only before the first tile is added. */}
          {concealedTiles.length === 0 && openMelds.length === 0 && (
            <Typography variant="caption" color="text.disabled"
              sx={{ display: 'block', mb: 1.5 }}>
              {locale === 'zh'
                ? '使用下方选择器添加手牌，牌面会显示在页面顶部。'
                : 'Add tiles with the picker. Your hand appears fixed at the top of the page.'}
            </Typography>
          )}

          {/* — Tile picker (default visible) — */}
          <Divider sx={{ mb: 1.5 }} />
          <Stack direction="row" alignItems="center" sx={{ mb: showPicker ? 1.5 : 0 }}>
            <SecondaryButton variant="outlined" size="small"
              onClick={() => setShowPicker((v) => !v)}
              startIcon={<GridViewRoundedIcon />}
              endIcon={showPicker ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ fontSize: '0.78rem' }}>
              {locale === 'zh'
                ? `${showPicker ? '收起' : '展开'}牌面选择器`
                : `${showPicker ? 'Hide' : 'Show'} tile picker`}
            </SecondaryButton>
          </Stack>
          <Collapse in={showPicker}>
            <Box sx={{ p: 2, backgroundColor: 'rgba(166,206,182,0.06)', border: '1px solid var(--border)', borderRadius: 1.5 }}>
              <MahjongTilePicker
                allTiles={allTiles}
                onTileClick={handleTileClick}
                onTileRightClick={handleTileRightClick}
                mode={pickerMode}
                onModeChange={setPickerMode}
                meldBuilder={meldBuilder}
                onAddMeld={handleAddMeld}
                onClearMeldBuilder={handleClearMeldBuilder}
                onRemoveFromBuilder={handleRemoveFromBuilder}
                locale={locale}
                size="sm"
              />
            </Box>
          </Collapse>

          {/* — Settings — */}
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="var(--text-secondary)" sx={{ mb: 0.75 }}>
                {t('mahjong.seatWind')}
              </Typography>
              <ToggleButtonGroup value={seatWind} exclusive size="small"
                onChange={(_, v) => v && setSeatWind(v)}>
                {WIND_OPTIONS.map((w) => (
                  <ToggleButton key={w.value} value={w.value} sx={toggleButtonSx}>
                    {locale === 'zh' ? w.zh : w.en}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="var(--text-secondary)" sx={{ mb: 0.75 }}>
                {t('mahjong.roundWind')}
              </Typography>
              <ToggleButtonGroup value={roundWind} exclusive size="small"
                onChange={(_, v) => v && setRoundWind(v)}>
                {WIND_OPTIONS.slice(0, 2).map((w) => (
                  <ToggleButton key={w.value} value={w.value} sx={toggleButtonSx}>
                    {locale === 'zh' ? w.zh : w.en}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
            <FormControlLabel
              control={<Switch checked={openTanyao} onChange={(e) => setOpenTanyao(e.target.checked)} sx={switchSx} />}
              label={<Typography variant="body2">{t('mahjong.openTanyao')}</Typography>}
            />
            <FormControlLabel
              control={<Switch checked={twoHanMin} onChange={(e) => setTwoHanMin(e.target.checked)} sx={switchSx} />}
              label={<Typography variant="body2">{t('mahjong.twoHanMin')}</Typography>}
            />
          </Stack>

          {analyzeError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{analyzeError}</Alert>
          )}

          {/* — Actions — */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <PrimaryButton variant="contained" onClick={handleAnalyze}
              startIcon={<SearchIcon />} sx={{ minWidth: 140 }}>
              {t('mahjong.analyzeButton')}
            </PrimaryButton>
            <DangerButton variant="outlined" onClick={handleReset}
              startIcon={<RefreshRoundedIcon />} sx={{ minWidth: 100 }}>
              {t('mahjong.resetButton')}
            </DangerButton>
          </Stack>
        </Paper>

        {/* ── B + C. Results: Hand Status + Yaku Routes ───────────────────── */}
        {result && (
          <Box>
            <WarningsSection warnings={result.vm.warnings} locale={locale} />
            <HandStatusPanel vm={result.vm} locale={locale} />
            <Paper elevation={8} sx={paperSx}>
              <YakuRoutesPanel vm={result.vm} locale={locale} />
            </Paper>
          </Box>
        )}
      </Container>

      {/* Tile warning snackbar */}
      <Snackbar
        open={!!tileWarning}
        autoHideDuration={2200}
        onClose={() => setTileWarning('')}
        message={tileWarning}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ content: { sx: { backgroundColor: '#c41c24', color: '#fff', fontWeight: 600 } } }}
      />

      {/* Back-to-top Fab — fixed bottom-right, scrolls smoothly to the tile picker */}
      <Fab
        size="small"
        aria-label={locale === 'zh' ? '返回顶部' : 'Back to top'}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{
          position: 'fixed',
          bottom: { xs: 20, sm: 28 },
          right:  { xs: 16, sm: 28 },
          zIndex: 800,
          backgroundColor: 'var(--primary)',
          color: 'var(--text)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '&:hover': { backgroundColor: 'var(--primary-hover)' },
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Box>
  );
}

export default MahjongTrainer;
