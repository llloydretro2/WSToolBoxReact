/* eslint-disable react/prop-types */
import React, { useState, useMemo } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Stack,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Collapse,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  Snackbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ClearAllRoundedIcon from "@mui/icons-material/ClearAllRounded";
import { PrimaryButton, DangerButton, SecondaryButton } from "../components/ButtonVariants";
import MahjongTile from "../components/mahjong/MahjongTile";
import MahjongTilePicker from "../components/mahjong/MahjongTilePicker";
import { useLocale } from "../contexts/LocaleContext";
import { sortTiles, tileName, tileKey, groupTiles } from "../utils/mahjong/tileParser";
import { analyzeHand, FEASIBILITY } from "../utils/mahjong/yakuAnalyzer";

// ── Feasibility display ───────────────────────────────────────────────────────

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

function FeasibilityChip({ feasibility, locale }) {
  const cfg = FEASIBILITY_CONFIG[feasibility] ?? FEASIBILITY_CONFIG[FEASIBILITY.IMPOSSIBLE];
  return (
    <Chip label={locale === 'zh' ? cfg.labelZh : cfg.labelEn} size="small"
      sx={{ backgroundColor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
  );
}

function HanDisplay({ han, isOpen, locale }) {
  if (han.closed === 'yakuman') {
    return <Chip label={locale === 'zh' ? '役满' : 'Yakuman'} size="small"
      sx={{ backgroundColor: '#ffd700', color: '#4a3000', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />;
  }
  const display = isOpen
    ? (han.open != null
      ? `${han.open}${locale === 'zh' ? '番（副露）' : ' han (open)'}`
      : (locale === 'zh' ? '仅门清' : 'closed only'))
    : `${han.closed}${locale === 'zh' ? '番' : ' han'}`;
  return <Chip label={display} size="small" variant="outlined"
    sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }} />;
}

// ── Compact inline tile row: "Label: [tile][tile]..." ────────────────────────
// sx prop lets callers override mt/spacing.
function TileRow({ label, labelColor, tiles, size = 'xs', sx: sxProp }) {
  if (!tiles || tiles.length === 0) return null;
  return (
    <Stack direction="row" alignItems="flex-start" gap={0.5} sx={{ mt: 0.4, ...sxProp }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color={labelColor ?? 'text.secondary'}
        sx={{ whiteSpace: 'nowrap', minWidth: 46, flexShrink: 0, fontSize: '0.65rem' }}
      >
        {label}
      </Typography>
      {/* minWidth:0 lets the flex child shrink; flexWrap allows wrapping on narrow screens */}
      <Stack direction="row" gap={0.2} flexWrap="wrap" sx={{ minWidth: 0 }}>
        {tiles.map((tile, i) => <MahjongTile key={i} tile={tile} size={size} />)}
      </Stack>
    </Stack>
  );
}

// ── Tile group row — used for "Your hand can become" / "After this step" ──────
// Outer Stack wraps groups; inner Stacks also wrap so no single row overflows.
// A Box with overflowX:auto gives a scroll escape hatch for very wide hands.
function TileGroupRow({ groups }) {
  return (
    <Box sx={{ maxWidth: '100%', overflowX: 'auto', mt: 0.3 }}>
      <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={1.25}>
        {groups.map((group, gi) => (
          // Each group (meld/pair/flat-concealed) wraps internally if too wide
          <Stack key={gi} direction="row" flexWrap="wrap" gap={0.2} sx={{ maxWidth: '100%' }}>
            {group.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="xs" />)}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ── Scenario item ─────────────────────────────────────────────────────────────
function ScenarioItem({ scenario, locale }) {
  const text              = locale === 'zh' ? scenario.zh  : scenario.en;
  const title             = locale === 'zh' ? scenario.title?.zh : scenario.title?.en;
  const neededTiles       = scenario.neededTiles  ?? scenario.drawOrCall ?? scenario.needed ?? [];
  const discardTiles      = scenario.discardTiles ?? scenario.discard ?? [];
  const isExactCompletion = !!scenario.isExactCompletion;
  const isExample         = !!scenario.isExample;
  const currentConcealed  = scenario.currentConcealedTiles ?? [];
  const currentMelds      = scenario.currentOpenMelds ?? [];
  const hasCurrentHand    = currentConcealed.length > 0 || currentMelds.length > 0;

  // Target display: prefer the focused yaku-specific structure over the full hand
  const targetYakuGroups = scenario.targetYakuGroups ?? null;
  const routeType        = scenario.routeType;
  // routeType and isExample drive the badge; targetType exists in data but is not rendered directly

  // Badge — combines route type (from BFS/simulation) and exact/heuristic flag
  const badgeLabel = (() => {
    if (routeType === 'one-step') return null; // clean exact result, no badge needed
    if (routeType === 'short')
      return locale === 'zh' ? '短期路线' : 'Short route';
    if (routeType === 'longer-term')
      return locale === 'zh' ? '较长路线' : 'Longer-term route';
    if (isExample && !isExactCompletion)
      return locale === 'zh' ? '参考路线' : 'Reference route';
    return null;
  })();

  const handToShow = targetYakuGroups;  // always use the focused yaku structure
  const handLabel  = handToShow?.length > 0
    ? (locale === 'zh' ? '目标役种结构：' : 'Target yaku structure:')
    : null;

  return (
    <Box sx={{
      p: 1, mt: 0.5,
      backgroundColor: 'rgba(166,206,182,0.07)',
      border: '1px solid var(--border)',
      borderRadius: 1.5,
      minWidth: 0,      // allow shrinking inside flex/grid parents
      overflow: 'hidden',
    }}>
      {/* Title row + badge */}
      {(title || isExample) && (
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.3 }}>
          {title && (
            <Typography variant="caption" fontWeight={700} color="var(--text)"
              sx={{ fontSize: '0.72rem' }}>
              {title}
            </Typography>
          )}
          {badgeLabel && (
            <Chip
              label={badgeLabel}
              size="small"
              sx={{ fontSize: '0.58rem', height: 16, backgroundColor: 'rgba(0,0,0,0.07)' }}
            />
          )}
        </Stack>
      )}

      {/* Current hand snapshot */}
      {hasCurrentHand && (
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
            sx={{ display: 'block', mb: 0.25, fontSize: '0.65rem' }}>
            {locale === 'zh' ? '当前手牌：' : 'Current hand:'}
          </Typography>
          <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={0.75} sx={{ maxWidth: '100%' }}>
            {currentConcealed.length > 0 && (
              <Stack direction="row" gap={0.2} flexWrap="wrap" sx={{ maxWidth: '100%' }}>
                {sortTiles(currentConcealed).map((tile, i) => (
                  <MahjongTile key={i} tile={tile} size="xs" />
                ))}
              </Stack>
            )}
            {currentConcealed.length > 0 && currentMelds.length > 0 && (
              <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ lineHeight: '24px' }}>+</Typography>
            )}
            {currentMelds.map((meld, mi) => (
              <Stack key={mi} direction="row" gap={0.2} sx={{
                px: 0.5, py: '2px',
                backgroundColor: 'rgba(255,210,160,0.25)',
                border: '1px solid #f0c88a',
                borderRadius: 1,
              }}>
                {meld.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="xs" />)}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* Need + Discard */}
      {(neededTiles.length > 0 || discardTiles.length > 0) && (
        <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ mt: 0.2 }}>
          <TileRow label={locale === 'zh' ? '摸/碰：' : 'Need:'}    labelColor="success.main" tiles={neededTiles}  sx={{ mt: 0 }} />
          <TileRow label={locale === 'zh' ? '打出：' : 'Discard:'} labelColor="error.main"   tiles={discardTiles} sx={{ mt: 0 }} />
        </Stack>
      )}

      {/* Hand result — derived from user's actual hand, never the generic example */}
      {handToShow && handLabel && (
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
            sx={{ display: 'block', mb: 0.25, fontSize: '0.65rem' }}>
            {handLabel}
          </Typography>
          <TileGroupRow groups={handToShow} />
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

function RouteCard({ route, isOpen, locale }) {
  const {
    feasibility, nameZh, nameEn, nameJa,
    zh, en, openAllowed, impossibleReason, han,
    exampleHand, scenarios, meaning,
  } = route;
  const name   = locale === 'zh' ? nameZh : nameEn;
  const text   = locale === 'zh' ? zh : en;
  const reason = impossibleReason ? (locale === 'zh' ? impossibleReason.zh : impossibleReason.en) : null;
  const cfg    = FEASIBILITY_CONFIG[feasibility] ?? FEASIBILITY_CONFIG[FEASIBILITY.IMPOSSIBLE];
  const isImpossible = feasibility === FEASIBILITY.IMPOSSIBLE;
  const meaningText = meaning ? (locale === 'zh' ? meaning.zh : meaning.en) : null;

  return (
    <Paper elevation={0} sx={{
      p: 1.5,
      border: `1px solid ${isImpossible ? '#ddd' : 'var(--border)'}`,
      borderLeft: `4px solid ${cfg.bg}`,
      borderRadius: 2,
      backgroundColor: isImpossible ? 'rgba(0,0,0,0.02)' : 'transparent',
      opacity: isImpossible ? 0.75 : 1,
      height: '100%',          // fill Grid cell height evenly
      boxSizing: 'border-box',
      // Prevent card from escaping its Grid column on narrow screens
      minWidth: 0,
      overflow: 'hidden',
    }}>
      {/* ── Header row ── */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5}>
        <Typography fontWeight={700} fontSize="0.9rem" color="var(--text)">{name}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.72rem' }}>
          {nameJa}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <FeasibilityChip feasibility={feasibility} locale={locale} />
        <HanDisplay han={han} isOpen={isOpen} locale={locale} />
        {!openAllowed && (
          <Chip label={locale === 'zh' ? '门清限定' : 'Closed only'} size="small"
            variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
        )}
      </Stack>

      {/* ── Meaning — inline, no box ── */}
      {meaningText && (
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 0.4, lineHeight: 1.5, fontStyle: 'italic' }}>
          {meaningText}
        </Typography>
      )}

      {/* ── Impossible reason ── */}
      {isImpossible && reason && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.4 }}>
          {locale === 'zh' ? '无法达成：' : 'Blocked: '}{reason}
        </Typography>
      )}

      {/* ── Example hand — label + tiles on one compact row ── */}
      {exampleHand?.length > 0 && (
        <Box sx={{ maxWidth: '100%', overflowX: 'auto', mt: 0.75 }}>
          <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={1.25}>
            <Typography variant="caption" fontWeight={600} color="var(--text-secondary)"
              sx={{ whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.65rem', lineHeight: '24px' }}>
              {locale === 'zh' ? '示例和牌型：' : 'Example yaku hand:'}
            </Typography>
            {exampleHand.map((group, gi) => (
              <Stack key={gi} direction="row" flexWrap="wrap" gap={0.2}>
                {group.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="xs" />)}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {/* ── Route scenarios (current hand hints) ── */}
      {!isImpossible && scenarios?.length > 0 && (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)"
            sx={{ display: 'block', mb: 0.2, fontSize: '0.68rem' }}>
            {locale === 'zh' ? '当前手牌路线：' : 'Route hints:'}
          </Typography>
          {scenarios.map((s, i) => <ScenarioItem key={i} scenario={s} locale={locale} />)}
        </Box>
      )}

      {/* ── General feasibility text — skip text.needed when scenarios cover it ── */}
      {!isImpossible && text?.explanation && (
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 0.6, lineHeight: 1.55 }}>
          {!scenarios?.length && text.needed && (
            <Box component="span" sx={{ mr: 0.5 }}>
              <Box component="span" fontWeight={700}>
                {locale === 'zh' ? '需要：' : 'Needed: '}
              </Box>
              {text.needed}
              {' '}
            </Box>
          )}
          {text.explanation}
        </Typography>
      )}
    </Paper>
  );
}

function HandStatusCard({ status, isOpen, locale }) {
  const { tileCountStatus, concealedCount, numMelds, expectedWaiting, expectedComplete, isComplete, confirmedRoutes, confirmedHan } = status;
  const totalTiles = concealedCount + numMelds * 3;
  const statusColor =
    tileCountStatus === 'complete' && isComplete ? 'var(--success)'
    : tileCountStatus === 'waiting' ? 'var(--info)'
    : 'var(--warning)';
  const statusLabel = locale === 'zh'
    ? (tileCountStatus === 'complete' && isComplete ? '✓ 完整和牌型'
      : tileCountStatus === 'complete' ? '完整牌数但非标准和牌型'
      : tileCountStatus === 'waiting' ? '听牌中（等待摸牌）'
      : tileCountStatus === 'low' ? `牌数不足（应有${expectedWaiting}-${expectedComplete}张暗手）`
      : `牌数过多（应有${expectedWaiting}-${expectedComplete}张暗手）`)
    : (tileCountStatus === 'complete' && isComplete ? '✓ Complete winning hand'
      : tileCountStatus === 'complete' ? 'Full tile count but not a standard winning shape'
      : tileCountStatus === 'waiting' ? 'Tenpai (waiting)'
      : tileCountStatus === 'low' ? `Too few tiles (expected ${expectedWaiting}–${expectedComplete} concealed)`
      : `Too many tiles (expected ${expectedWaiting}–${expectedComplete} concealed)`);

  return (
    <Paper elevation={8} sx={{ p: { xs: 2.5, md: 3.5 }, backgroundColor: 'transparent', border: '1px solid var(--border)', boxShadow: '0 20px 45px -18px rgba(0,0,0,0.15)', borderRadius: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <Typography fontWeight={700} fontSize="1rem" color="var(--text)">{locale === 'zh' ? '手牌状态' : 'Hand Status'}</Typography>
        <Chip
          label={isOpen ? (locale === 'zh' ? '副露手' : 'Open') : (locale === 'zh' ? '门清手' : 'Closed')}
          size="small"
          sx={{ backgroundColor: isOpen ? '#ffd0a8' : '#a6ceb6', color: isOpen ? '#7c2d00' : '#1b4332', fontWeight: 700, fontSize: '0.7rem' }}
        />
      </Stack>
      <Typography variant="body2" sx={{ color: statusColor, fontWeight: 600, mb: 1 }}>{statusLabel}</Typography>
      <Typography variant="caption" color="text.secondary">
        {locale === 'zh'
          ? `暗手：${concealedCount}张 · 副露：${numMelds}组 · 合计：${totalTiles}张`
          : `Concealed: ${concealedCount} · Melds: ${numMelds} · Total: ${totalTiles}`}
      </Typography>
      {confirmedRoutes.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={700} color="var(--text-secondary)" sx={{ display: 'block', mb: 0.5 }}>
            {locale === 'zh' ? `已确立役种（${confirmedHan}番）：` : `Confirmed yaku (${confirmedHan} han):`}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {confirmedRoutes.map((r) => (
              <Chip key={r.id} label={locale === 'zh' ? r.nameZh : r.nameEn} size="small"
                sx={{ backgroundColor: '#a6ceb6', color: '#1b4332', fontWeight: 700, fontSize: '0.7rem', height: 22 }} />
            ))}
          </Stack>
        </Box>
      )}
      {confirmedRoutes.length === 0 && isOpen && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {locale === 'zh' ? '❌ 当前无确立役种' : '❌ No confirmed yaku'}
        </Typography>
      )}
    </Paper>
  );
}

function WarningsSection({ warnings, locale }) {
  if (!warnings?.length) return null;
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {warnings.map((w) => {
        const text = locale === 'zh' ? w.zh : w.en;
        return (
          <Alert key={w.id} severity={w.severity ?? 'info'} sx={{ borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>{text.title}</AlertTitle>
            {text.body}
          </Alert>
        );
      })}
    </Stack>
  );
}

function RoutesSection({ routes, isOpen, locale }) {
  const [showImpossible, setShowImpossible] = useState(false);
  const [showYakuman, setShowYakuman] = useState(false);
  const [showImpossibleYakuman, setShowImpossibleYakuman] = useState(false);

  const regular = routes.filter((r) => !r.isYakuman);
  const yakuman = routes.filter((r) => r.isYakuman);
  const sort = (arr) => arr.sort((a, b) => FEASIBILITY_ORDER.indexOf(a.feasibility) - FEASIBILITY_ORDER.indexOf(b.feasibility));
  const regularFeasible  = sort(regular.filter((r) => r.feasibility !== FEASIBILITY.IMPOSSIBLE));
  const regularImpossible = regular.filter((r) => r.feasibility === FEASIBILITY.IMPOSSIBLE);
  const yakumanFeasible  = sort(yakuman.filter((r) => r.feasibility !== FEASIBILITY.IMPOSSIBLE));
  const yakumanImpossible = yakuman.filter((r) => r.feasibility === FEASIBILITY.IMPOSSIBLE);

  return (
    <Box>
      <Typography fontWeight={700} fontSize="1rem" color="var(--text)" sx={{ mb: 1.5 }}>
        {locale === 'zh' ? '役种路线分析' : 'Yaku Route Analysis'}
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {regularFeasible.map((r) => (
          <Grid key={r.id} size={{ xs: 12, md: 6 }}>
            <RouteCard route={r} isOpen={isOpen} locale={locale} />
          </Grid>
        ))}
      </Grid>
      {regularImpossible.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <SecondaryButton variant="outlined" size="small"
            onClick={() => setShowImpossible((v) => !v)}
            endIcon={showImpossible ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: 1.5, fontSize: '0.8rem' }}>
            {locale === 'zh'
              ? `${showImpossible ? '收起' : '显示'}不可达役种（${regularImpossible.length}）`
              : `${showImpossible ? 'Hide' : 'Show'} impossible yaku (${regularImpossible.length})`}
          </SecondaryButton>
          <Collapse in={showImpossible}>
            <Stack spacing={1.5}>{regularImpossible.map((r) => <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />)}</Stack>
          </Collapse>
        </Box>
      )}
      <Divider sx={{ my: 2 }} />
      <SecondaryButton variant="outlined" size="small"
        onClick={() => setShowYakuman((v) => !v)}
        endIcon={showYakuman ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1.5, fontSize: '0.8rem' }}>
        {locale === 'zh'
          ? `${showYakuman ? '收起' : '显示'}役满参考（${yakumanFeasible.length + yakumanImpossible.length}种）`
          : `${showYakuman ? 'Hide' : 'Show'} Yakuman reference (${yakumanFeasible.length + yakumanImpossible.length})`}
      </SecondaryButton>
      <Collapse in={showYakuman}>
        {yakumanFeasible.length > 0 && (
          <Stack spacing={1.5} sx={{ mb: 1.5 }}>
            {yakumanFeasible.map((r) => <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />)}
          </Stack>
        )}
        {yakumanImpossible.length > 0 && (
          <Box>
            <SecondaryButton variant="outlined" size="small"
              onClick={() => setShowImpossibleYakuman((v) => !v)}
              endIcon={showImpossibleYakuman ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mb: 1.5, fontSize: '0.8rem' }}>
              {locale === 'zh'
                ? `${showImpossibleYakuman ? '收起' : '显示'}不可达役满（${yakumanImpossible.length}）`
                : `${showImpossibleYakuman ? 'Hide' : 'Show'} impossible yakuman (${yakumanImpossible.length})`}
            </SecondaryButton>
            <Collapse in={showImpossibleYakuman}>
              <Stack spacing={1.5}>{yakumanImpossible.map((r) => <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />)}</Stack>
            </Collapse>
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIND_OPTIONS = [
  { value: 1, zh: '东', en: 'East' },
  { value: 2, zh: '南', en: 'South' },
  { value: 3, zh: '西', en: 'West' },
  { value: 4, zh: '北', en: 'North' },
];

// Expected concealed tile count given n open melds
const expectedConcealedCount = (numMelds) => 13 - 3 * numMelds;

// ── Main page ─────────────────────────────────────────────────────────────────

function MahjongTrainer() {
  const { t, locale } = useLocale();

  // Primary state: tile arrays (no text inputs)
  const [concealedTiles, setConcealedTiles] = useState([]);
  const [openMelds, setOpenMelds]           = useState([]);

  // Picker state
  const [pickerMode, setPickerMode]         = useState('hand');
  const [meldBuilder, setMeldBuilder]       = useState([]);
  const [showPicker, setShowPicker]         = useState(true);

  // Settings
  const [seatWind, setSeatWind]   = useState(1);
  const [roundWind, setRoundWind] = useState(1);
  const [openTanyao, setOpenTanyao] = useState(true);
  const [twoHanMin, setTwoHanMin]   = useState(false);

  // UI feedback
  const [result, setResult]           = useState(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [tileWarning, setTileWarning]   = useState('');

  // ── Derived ─────────────────────────────────────────────────────────────────
  const allTiles = useMemo(
    () => [...concealedTiles, ...openMelds.flat(), ...meldBuilder],
    [concealedTiles, openMelds, meldBuilder]
  );
  const tileCounts = useMemo(() => groupTiles(allTiles), [allTiles]);
  const sortedHand = useMemo(() => sortTiles(concealedTiles), [concealedTiles]);

  const targetCount = expectedConcealedCount(openMelds.length);

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const handleClearHand = () => setConcealedTiles([]);

  const handleAddMeld = () => {
    if (meldBuilder.length < 3) {
      setTileWarning(locale === 'zh' ? '副露至少需要3张牌' : 'A meld needs at least 3 tiles.');
      return;
    }
    setOpenMelds((prev) => [...prev, [...meldBuilder]]);
    setMeldBuilder([]);
  };

  const handleClearMeldBuilder = () => setMeldBuilder([]);
  const handleRemoveFromMeldBuilder = (idx) => setMeldBuilder((prev) => prev.filter((_, i) => i !== idx));
  const handleRemoveMeld = (meldIdx) => setOpenMelds((prev) => prev.filter((_, i) => i !== meldIdx));
  const handleClearMelds = () => { setOpenMelds([]); setMeldBuilder([]); };

  const handleAnalyze = () => {
    setAnalyzeError('');
    if (concealedTiles.length === 0 && openMelds.length === 0) {
      setAnalyzeError(locale === 'zh' ? '请先用选择器添加手牌' : 'Please add tiles using the picker first.');
      return;
    }
    const rules    = { openTanyao, twoHanMin };
    const analysis = analyzeHand(concealedTiles, openMelds, seatWind, roundWind, rules);
    setResult({ analysis, concealedTiles: [...concealedTiles], openMelds: [...openMelds] });
  };

  const handleReset = () => {
    setConcealedTiles([]);
    setOpenMelds([]);
    setMeldBuilder([]);
    setPickerMode('hand');
    setShowPicker(true);
    setSeatWind(1);
    setRoundWind(1);
    setOpenTanyao(true);
    setTwoHanMin(false);
    setResult(null);
    setAnalyzeError('');
  };

  // ── Shared sx ────────────────────────────────────────────────────────────────

  const paperSx = {
    p: { xs: 3, md: 4 },
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    boxShadow: '0 20px 45px -18px rgba(0,0,0,0.15)',
    borderRadius: 2, mb: 3,
  };

  const toggleButtonSx = {
    fontSize: '0.85rem', px: 1.5, py: 0.5,
    '&.Mui-selected': { backgroundColor: 'var(--primary)', color: 'var(--text)', fontWeight: 700 },
    '&.Mui-selected:hover': { backgroundColor: 'var(--primary-hover)' },
  };

  const switchSx = {
    '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--primary)' },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--primary)' },
  };

  const handBoxSx = {
    minHeight: 52, p: 1, borderRadius: 1.5,
    border: '1px solid var(--border)',
    backgroundColor: 'rgba(166,206,182,0.06)',
  };

  return (
    <Box sx={{ minHeight: '100%' }}>
      <Container maxWidth="lg">

        {/* Title */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight={700} color="var(--text)" gutterBottom>
            {t('mahjong.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('mahjong.subtitle')}
          </Typography>
        </Box>

        {/* ── Input panel ─────────────────────────────────────────────────── */}
        <Paper elevation={8} sx={paperSx}>

          {/* ═══ Section 1: Current Hand State ═══ */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={800} color="var(--text)" sx={{ mb: 1.5, letterSpacing: '0.01em' }}>
              {locale === 'zh' ? '当前手牌' : 'Current Hand'}
            </Typography>

            {/* — Concealed hand — */}
            <Box sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography variant="subtitle2" fontWeight={700} color="var(--text)">
                  {locale === 'zh' ? '暗手' : 'Concealed Hand'}
                </Typography>
                <Chip
                  label={`${sortedHand.length} / ${targetCount}`}
                  size="small"
                  sx={{
                    height: 20, fontSize: '0.65rem', fontWeight: 700,
                    backgroundColor:
                      sortedHand.length === targetCount ? 'var(--primary-light)'
                      : sortedHand.length > targetCount ? '#ffd0a8'
                      : 'transparent',
                    border: '1px solid var(--border)',
                  }}
                />
                {sortedHand.length > 0 && (
                  <Tooltip title={locale === 'zh' ? '清空暗手' : 'Clear concealed hand'}>
                    <IconButton size="small" onClick={handleClearHand} sx={{ color: 'var(--error)', p: 0.4 }}>
                      <ClearAllRoundedIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Typography variant="caption" color="text.secondary">
                  {locale === 'zh' ? '（点击牌面移除）' : '(click a tile to remove)'}
                </Typography>
              </Stack>

              <Box sx={handBoxSx}>
                {sortedHand.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    {locale === 'zh'
                      ? '在下方选择器中点击牌面添加暗手'
                      : 'Click tiles in the picker below to add to your concealed hand'}
                  </Typography>
                ) : (
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {sortedHand.map((tile, i) => (
                      <Tooltip
                        key={i}
                        title={locale === 'zh' ? `移除一张${tileName(tile, 'zh')}` : `Remove one ${tileName(tile, 'en')}`}
                      >
                        <Box>
                          <MahjongTile tile={tile} size="sm" onClick={handleRemoveFromHand} />
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>

            {/* — Open melds — */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography variant="subtitle2" fontWeight={700} color="var(--text)">
                  {locale === 'zh' ? '副露' : 'Open Melds'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {locale === 'zh' ? '（吃/碰/杠面子）' : '(chi / pon / kan groups)'}
                </Typography>
                {openMelds.length > 0 && (
                  <Tooltip title={locale === 'zh' ? '清空所有副露' : 'Clear all melds'}>
                    <IconButton size="small" onClick={handleClearMelds} sx={{ color: 'var(--error)', p: 0.4 }}>
                      <ClearAllRoundedIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              {openMelds.length === 0 ? (
                <Box sx={{ ...handBoxSx, minHeight: 44 }}>
                  <Typography variant="caption" color="text.disabled">
                    {locale === 'zh'
                      ? '切换到「副露」模式后，点击牌面构建副露面子，完成后点击「确认副露」'
                      : 'Switch to Meld mode, click tiles to build a meld group, then click "Add Meld"'}
                  </Typography>
                </Box>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {openMelds.map((meld, mi) => (
                    <Box
                      key={mi}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.4,
                        p: 0.75,
                        backgroundColor: 'rgba(255,210,160,0.2)',
                        border: '1px solid #f0c88a',
                        borderRadius: 1.5,
                      }}
                    >
                      {meld.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="sm" />)}
                      <Tooltip title={locale === 'zh' ? '移除此副露' : 'Remove this meld'}>
                        <IconButton
                          size="small" onClick={() => handleRemoveMeld(mi)}
                          sx={{ ml: 0.25, color: 'error.main', p: 0.25 }}
                        >
                          <CloseRoundedIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          {/* ═══ Section 2: Tile Picker ═══ */}
          <Divider sx={{ mb: 2 }} />

          <Stack direction="row" alignItems="center" sx={{ mb: showPicker ? 1.5 : 0 }}>
            <SecondaryButton
              variant="outlined" size="small"
              onClick={() => setShowPicker((v) => !v)}
              startIcon={<GridViewRoundedIcon />}
              endIcon={showPicker ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ fontSize: '0.8rem' }}
            >
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
                onRemoveFromBuilder={handleRemoveFromMeldBuilder}
                locale={locale}
                size="sm"
              />
            </Box>
          </Collapse>

          {/* ═══ Section 3: Settings ═══ */}
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="var(--text-secondary)" sx={{ mb: 0.75 }}>
                {t('mahjong.seatWind')}
              </Typography>
              <ToggleButtonGroup value={seatWind} exclusive onChange={(_, v) => v && setSeatWind(v)} size="small">
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
              <ToggleButtonGroup value={roundWind} exclusive onChange={(_, v) => v && setRoundWind(v)} size="small">
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

          {/* ═══ Section 4: Actions ═══ */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <PrimaryButton variant="contained" onClick={handleAnalyze} startIcon={<SearchIcon />} sx={{ minWidth: 140 }}>
              {t('mahjong.analyzeButton')}
            </PrimaryButton>
            <DangerButton variant="outlined" onClick={handleReset} startIcon={<RefreshRoundedIcon />} sx={{ minWidth: 100 }}>
              {t('mahjong.resetButton')}
            </DangerButton>
          </Stack>
        </Paper>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {result && (
          <Box>
            {/* Snapshot of analyzed hand */}
            {result.concealedTiles.length > 0 && (
              <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: '1px solid var(--border)', borderRadius: 2, backgroundColor: 'transparent' }}>
                <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
                  <Typography variant="caption" color="var(--text-secondary)" sx={{ mr: 0.5 }}>
                    {locale === 'zh' ? '分析的手牌：' : 'Analyzed hand:'}
                  </Typography>
                  {sortTiles(result.concealedTiles).map((tile, i) => (
                    <MahjongTile key={i} tile={tile} size="sm" />
                  ))}
                  {result.openMelds.length > 0 && (
                    <>
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      <Typography variant="caption" color="var(--text-secondary)">
                        {locale === 'zh' ? '副露：' : 'Melds:'}
                      </Typography>
                      {result.openMelds.map((meld, mi) => (
                        <React.Fragment key={mi}>
                          {mi > 0 && <Typography variant="caption" color="text.secondary">·</Typography>}
                          {meld.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="sm" />)}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </Stack>
              </Paper>
            )}

            <WarningsSection warnings={result.analysis.warnings} locale={locale} />
            <HandStatusCard status={result.analysis.handStatus} isOpen={result.analysis.handStatus.isOpen} locale={locale} />
            <Paper elevation={8} sx={paperSx}>
              <RoutesSection routes={result.analysis.routes} isOpen={result.analysis.handStatus.isOpen} locale={locale} />
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
    </Box>
  );
}

export default MahjongTrainer;
