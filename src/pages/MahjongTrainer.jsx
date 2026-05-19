/* eslint-disable react/prop-types */
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, RefreshCw, X, ChevronDown, ChevronUp, ArrowUp,
} from "lucide-react";
import MahjongTile       from "../components/mahjong/MahjongTile";
import MahjongTilePicker from "../components/mahjong/MahjongTilePicker";
import { useLocale }     from "../contexts/LocaleContext";
import { sortTiles, tileName, tileKey, groupTiles, extractAllHandGroups } from "../utils/mahjong/tileParser";
import { analyzeHand, FEASIBILITY } from "../utils/mahjong/yakuAnalyzer";
import { evaluateYakuFromDecomposition } from "../utils/mahjong/handSimulator";
import { computeScore } from "../utils/mahjong/scoring";

// ── Feasibility ───────────────────────────────────────────────────────────────

const FEASIBILITY_ACHIEVED = 'achieved';

const FEASIBILITY_CONFIG = {
  [FEASIBILITY.CONFIRMED]: { label: { zh: '已确立', en: 'Confirmed' }, badgeCls: 'bg-gray-950 text-white',                          borderColor: '#111111' },
  [FEASIBILITY_ACHIEVED]:  { label: { zh: '已达成', en: 'Achieved'  }, badgeCls: 'bg-gray-700 text-white',                          borderColor: '#374151' },
  [FEASIBILITY.HIGH]:      { label: { zh: '高可行', en: 'High'      }, badgeCls: 'bg-gray-500 text-white',                          borderColor: '#9ca3af' },
  [FEASIBILITY.MEDIUM]:    { label: { zh: '可行',   en: 'Medium'    }, badgeCls: 'bg-gray-200 text-gray-700',                       borderColor: '#d1d5db' },
  [FEASIBILITY.LOW]:       { label: { zh: '较低',   en: 'Low'       }, badgeCls: 'bg-gray-100 text-gray-500',                       borderColor: '#e5e7eb' },
  [FEASIBILITY.VERY_LOW]:  { label: { zh: '极低',   en: 'Very Low'  }, badgeCls: 'border border-gray-200 text-gray-400 bg-white',   borderColor: '#f3f4f6' },
  [FEASIBILITY.IMPOSSIBLE]:{ label: { zh: '不可能', en: 'Impossible' }, badgeCls: 'border border-gray-100 text-gray-300 bg-white',  borderColor: '#f9fafb' },
};

const FEASIBILITY_ORDER = [
  FEASIBILITY.CONFIRMED, FEASIBILITY_ACHIEVED, FEASIBILITY.HIGH, FEASIBILITY.MEDIUM,
  FEASIBILITY.LOW, FEASIBILITY.VERY_LOW, FEASIBILITY.IMPOSSIBLE,
];

// ── View-model adapter ────────────────────────────────────────────────────────

function buildTrainerViewModel(analysis, concealedTiles, openMelds) {
  const { handStatus, routes, warnings } = analysis;
  const shanten = routes.length > 0 ? (routes[0].shanten ?? null) : null;

  const sortByFeasibility = (arr) =>
    [...arr].sort((a, b) =>
      FEASIBILITY_ORDER.indexOf(a.feasibility) - FEASIBILITY_ORDER.indexOf(b.feasibility)
    );

  const upgradeToAchieved = (arr) => arr.map((r) => {
    if (r.feasibility !== FEASIBILITY.HIGH) return r;
    const needed = r.en?.needed ?? '';
    if (needed === '' || needed.startsWith('Keep')) return { ...r, feasibility: FEASIBILITY_ACHIEVED };
    return r;
  });

  const regularRoutes = sortByFeasibility(upgradeToAchieved(routes.filter((r) => !r.isYakuman)));
  const yakumanRoutes = sortByFeasibility(upgradeToAchieved(routes.filter((r) => r.isYakuman)));

  const achievedRoutes = [...regularRoutes, ...yakumanRoutes].filter(
    (r) => r.feasibility === FEASIBILITY.CONFIRMED || r.feasibility === FEASIBILITY_ACHIEVED
  );
  const achievedHan = achievedRoutes.reduce((acc, r) => {
    const h = handStatus.isOpen ? r.han.open : r.han.closed;
    return typeof h === 'number' ? acc + h : acc;
  }, 0);

  return {
    hand: {
      concealedTiles, openMelds,
      isOpen: handStatus.isOpen, isComplete: handStatus.isComplete,
      tileCountStatus: handStatus.tileCountStatus,
      concealedCount: handStatus.concealedCount, numMelds: handStatus.numMelds,
      expectedWaiting: handStatus.expectedWaiting, expectedComplete: handStatus.expectedComplete,
      shanten, achievedRoutes, achievedHan, errors: handStatus.errors,
    },
    warnings, regularRoutes, yakumanRoutes,
  };
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Pill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

function FeasibilityChip({ feasibility, locale }) {
  const cfg = FEASIBILITY_CONFIG[feasibility] ?? FEASIBILITY_CONFIG[FEASIBILITY.IMPOSSIBLE];
  return <Pill className={cfg.badgeCls}>{cfg.label[locale] ?? cfg.label.en}</Pill>;
}

function HanDisplay({ han, isOpen, locale }) {
  if (han.closed === 'yakuman') {
    return <Pill className="bg-gray-950 text-white">{locale === 'zh' ? '役满' : 'Yakuman'}</Pill>;
  }
  const v = isOpen
    ? (han.open != null
        ? `${han.open}${locale === 'zh' ? '番' : 'han (open)'}`
        : (locale === 'zh' ? '仅门清' : 'closed only'))
    : `${han.closed}${locale === 'zh' ? '番' : 'han'}`;
  return <Pill className="border border-gray-200 text-gray-500 bg-white">{v}</Pill>;
}

function ShantenLine({ shanten, locale }) {
  if (shanten === null || shanten === undefined) return null;
  if (shanten === -1) return <span className="text-[11px] font-bold text-gray-950">✓ {locale === 'zh' ? '和牌' : 'Complete'}</span>;
  if (shanten === 0)  return <span className="text-[11px] font-bold text-gray-700">{locale === 'zh' ? '听牌' : 'Tenpai'}</span>;
  return <span className="text-[11px] text-gray-500">{shanten}{locale === 'zh' ? '向听' : '-shanten'}</span>;
}

// ── Tile display helpers ──────────────────────────────────────────────────────

function TileRow({ tiles, size = 'xs' }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {tiles.map((t, i) => <MahjongTile key={i} tile={t} size={size} />)}
    </div>
  );
}

function TileGroups({ groups, size = 'xs' }) {
  if (!groups?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g, i) => <TileRow key={i} tiles={g} size={size} />)}
    </div>
  );
}

function LabeledTiles({ label, labelCls, tiles }) {
  if (!tiles?.length) return null;
  return (
    <div className="flex items-start gap-1.5">
      <span className={`text-[10px] font-bold shrink-0 leading-[22px] ${labelCls ?? 'text-gray-500'}`}>{label}</span>
      <div className="flex flex-wrap gap-0.5">{tiles.map((t, i) => <MahjongTile key={i} tile={t} size="xs" />)}</div>
    </div>
  );
}

// ── Scenario ──────────────────────────────────────────────────────────────────

function Scenario({ scenario, locale }) {
  const text         = locale === 'zh' ? scenario.zh  : scenario.en;
  const neededTiles  = scenario.neededTiles  ?? scenario.drawOrCall ?? scenario.needed ?? [];
  const discardTiles = scenario.discardTiles ?? scenario.discard ?? [];
  const targetGroups = scenario.targetYakuGroups ?? null;
  const routeType    = scenario.routeType;
  const isExample    = !!scenario.isExample;

  const typeLabel = routeType === 'one-step'    ? null
    : routeType === 'short'                     ? (locale === 'zh' ? '短期路线' : 'Short route')
    : routeType === 'longer-term'               ? (locale === 'zh' ? '较长路线' : 'Longer-term')
    : isExample                                 ? (locale === 'zh' ? '参考路线' : 'Reference')
    : null;

  return (
    <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
      {typeLabel && (
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
          {typeLabel}
        </span>
      )}
      {(neededTiles.length > 0 || discardTiles.length > 0) && (
        <div className="flex flex-wrap gap-3 mt-1">
          <LabeledTiles label={locale === 'zh' ? '摸：' : 'Need:'} labelCls="text-gray-700" tiles={neededTiles} />
          <LabeledTiles label={locale === 'zh' ? '打：' : 'Discard:'} labelCls="text-red-400" tiles={discardTiles} />
        </div>
      )}
      {targetGroups?.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold text-gray-400 mb-1">
            {locale === 'zh' ? '目标役种结构' : 'Target structure'}
          </p>
          <TileGroups groups={targetGroups} />
        </div>
      )}
      {text?.explanation && (
        <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{text.explanation}</p>
      )}
    </div>
  );
}

// ── Fixed hand bar ────────────────────────────────────────────────────────────

function FixedHandBar({ concealedTiles, openMelds, vm, onRemoveTile, onRemoveMeld, onClearAll, locale, barRef }) {
  if (!concealedTiles.length && !openMelds.length) return null;

  const shanten    = vm?.hand?.shanten ?? null;
  const isOpen     = openMelds.length > 0;
  const totalCount = concealedTiles.length + openMelds.reduce((s, m) => s + m.length, 0);

  return (
    <div
      ref={barRef}
      className="fixed top-[64px] md:top-[72px] left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5">

        {/* Status row + clear */}
        <div className="flex items-center gap-1.5 mb-2">
          <ShantenLine shanten={shanten} locale={locale} />
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[10px] text-gray-400">
            {isOpen ? (locale === 'zh' ? '副露' : 'Open') : (locale === 'zh' ? '门清' : 'Closed')}
          </span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className={`text-[10px] font-bold ${totalCount === 14 ? 'text-gray-900' : totalCount > 14 ? 'text-red-400' : 'text-gray-400'}`}>
            {totalCount}{locale === 'zh' ? '张' : ''}
          </span>
          <div className="flex-1" />
          <button
            onClick={onClearAll}
            className="text-[11px] font-bold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-700 transition-colors shrink-0"
          >
            {locale === 'zh' ? '清空' : 'Clear'}
          </button>
        </div>

        {/* Tiles — wrapped */}
        <div className="flex flex-wrap gap-1">
          {sortTiles(concealedTiles).map((tile, i) => (
            <div key={i} title={locale === 'zh' ? `移除${tileName(tile, 'zh')}` : `Remove ${tileName(tile, 'en')}`}>
              <MahjongTile tile={tile} size="xs" onClick={onRemoveTile} />
            </div>
          ))}
          {openMelds.length > 0 && (
            <>
              <span className="text-[10px] text-gray-300 self-end pb-0.5 mx-0.5 shrink-0">+</span>
              {openMelds.map((meld, mi) => (
                <div key={mi} className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-gray-200 bg-gray-50 shrink-0">
                  {meld.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="xs" />)}
                  <button onClick={() => onRemoveMeld(mi)} className="ml-0.5 p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={9} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Route card ────────────────────────────────────────────────────────────────

function RouteCard({ route, isOpen, locale }) {
  const [open, setOpen] = useState(false);

  const {
    feasibility, nameZh, nameEn, nameJa, zh, en,
    openAllowed, impossibleReason, han, exampleHand, meaning, scenarios,
  } = route;

  const name        = locale === 'zh' ? nameZh : nameEn;
  const text        = locale === 'zh' ? zh : en;
  const meaningText = meaning ? (locale === 'zh' ? meaning.zh : meaning.en) : null;
  const reason      = impossibleReason ? (locale === 'zh' ? impossibleReason.zh : impossibleReason.en) : null;
  const cfg         = FEASIBILITY_CONFIG[feasibility] ?? FEASIBILITY_CONFIG[FEASIBILITY.IMPOSSIBLE];
  const isImpossible = feasibility === FEASIBILITY.IMPOSSIBLE;
  const hasDetail    = !isImpossible && (scenarios?.length > 0 || !!text?.explanation);

  return (
    <div
      className={`rounded-xl border border-gray-200 overflow-hidden ${isImpossible ? 'opacity-50' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: cfg.borderColor }}
    >
      {/* Header — always visible */}
      <div
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`p-4 ${hasDetail ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''} select-none`}
      >
        {/* Name row */}
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <span className="font-bold text-sm text-gray-950 leading-tight">{name}</span>
          <span className="text-[11px] text-gray-400 italic leading-tight mt-[1px]">{nameJa}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <FeasibilityChip feasibility={feasibility} locale={locale} />
            <HanDisplay han={han} isOpen={isOpen} locale={locale} />
            {!openAllowed && (
              <Pill className="border border-gray-200 text-gray-400 bg-white">
                {locale === 'zh' ? '门清限定' : 'Closed'}
              </Pill>
            )}
            {hasDetail && (
              <span className="text-gray-300 ml-0.5">
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            )}
          </div>
        </div>

        {/* Meaning */}
        {meaningText && (
          <p className="text-[11px] text-gray-400 italic leading-relaxed mb-2">{meaningText}</p>
        )}

        {/* Impossible reason */}
        {isImpossible && reason && (
          <p className="text-[11px] text-red-400 mb-1">{locale === 'zh' ? '不可达：' : 'Blocked: '}{reason}</p>
        )}

        {/* Example hand */}
        {exampleHand?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-300 mb-1">
              {locale === 'zh' ? '示例牌型' : 'Example hand'}
            </p>
            <TileGroups groups={exampleHand} />
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <>
          <div className="border-t border-gray-100" />
          <div className="px-4 pb-4 pt-1">
            {scenarios?.length > 0
              ? scenarios.map((s, i) => <Scenario key={i} scenario={s} locale={locale} />)
              : text?.explanation && (
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{text.explanation}</p>
                )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Results sub-components ────────────────────────────────────────────────────

function Warnings({ warnings, locale }) {
  if (!warnings?.length) return null;
  const sev = {
    error:   'border-red-200 bg-red-50 text-red-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info:    'border-gray-200 bg-gray-50 text-gray-600',
  };
  return (
    <div className="flex flex-col gap-2 mb-4">
      {warnings.map((w) => {
        const txt = locale === 'zh' ? w.zh : w.en;
        return (
          <div key={w.id} className={`p-3 rounded-xl border text-xs ${sev[w.severity ?? 'info']}`}>
            <p className="font-bold mb-0.5">{txt.title}</p>
            <p>{txt.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function ResultsSummary({ vm, locale }) {
  const { achievedRoutes, achievedHan, isOpen, shanten, concealedCount, numMelds } = vm.hand;
  const totalTiles = concealedCount + numMelds * 3;
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5 pb-4 border-b border-gray-100">
      <ShantenLine shanten={shanten} locale={locale} />
      <span className="text-gray-200">·</span>
      <span className="text-[11px] text-gray-500">
        {isOpen ? (locale === 'zh' ? '副露' : 'Open') : (locale === 'zh' ? '门清' : 'Closed')}
      </span>
      <span className="text-gray-200">·</span>
      <span className="text-[11px] text-gray-400">{totalTiles}{locale === 'zh' ? '张' : ' tiles'}</span>
      {achievedRoutes?.length > 0 && (
        <>
          <span className="text-gray-200">·</span>
          <span className="text-[11px] font-semibold text-gray-950">
            {locale === 'zh' ? `已达成 ${achievedHan}番` : `${achievedHan} han achieved`}
          </span>
          <div className="flex flex-wrap gap-1">
            {achievedRoutes.map((r) => (
              <Pill key={r.id} className="bg-gray-900 text-white">
                {locale === 'zh' ? r.nameZh : r.nameEn}
              </Pill>
            ))}
          </div>
        </>
      )}
      {isOpen && achievedRoutes?.length === 0 && (
        <span className="text-[11px] text-red-400">{locale === 'zh' ? '无确立役种' : 'No confirmed yaku'}</span>
      )}
    </div>
  );
}

function CompletedPanel({ vm, locale, scoreResult }) {
  const { achievedRoutes, achievedHan } = vm.hand;
  const p = scoreResult?.points;
  return (
    <div className="p-5 border border-gray-200 rounded-2xl" style={{ borderLeftWidth: 3, borderLeftColor: '#111' }}>
      <p className="font-black text-lg text-gray-950 mb-1">
        {locale === 'zh' ? '✓ 和牌！' : '✓ Complete hand!'}
      </p>
      <p className="text-xs text-gray-400 mb-4">
        {locale === 'zh' ? '手牌已完整和牌，无需进一步分析。' : 'This hand is complete. No further analysis needed.'}
      </p>
      {achievedRoutes?.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {locale === 'zh' ? `达成役种 · ${achievedHan}番` : `Achieved · ${achievedHan} han`}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {achievedRoutes.map((r) => (
              <Pill key={r.id} className="bg-gray-950 text-white text-xs px-2.5 py-1">
                {locale === 'zh' ? r.nameZh : r.nameEn}
              </Pill>
            ))}
          </div>
        </>
      )}

      {/* Score display */}
      {scoreResult && p && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {locale === 'zh' ? '得点' : 'Score'}
            {scoreResult.han !== 'yakuman' && (
              <span className="ml-2 font-normal normal-case text-gray-400">
                {scoreResult.han}{locale === 'zh' ? '番' : 'han'} · {scoreResult.fu}{locale === 'zh' ? '符' : 'fu'}
                {p.limitName ? ` · ${p.limitName}` : ''}
              </span>
            )}
            {scoreResult.han === 'yakuman' && (
              <span className="ml-2 font-normal normal-case text-gray-400">{p.limitName}</span>
            )}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div>
              <span className="text-gray-400">{locale === 'zh' ? '荣和（非庄）' : 'Ron (non-dealer)'}</span>
              <span className="ml-1.5 font-bold text-gray-900">{p.ron.nonDealer.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">{locale === 'zh' ? '荣和（庄家）' : 'Ron (dealer)'}</span>
              <span className="ml-1.5 font-bold text-gray-900">{p.ron.dealer.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">{locale === 'zh' ? '自摸（庄付）' : 'Tsumo (dealer pays)'}</span>
              <span className="ml-1.5 font-bold text-gray-900">{p.tsumo.dealer.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">{locale === 'zh' ? '自摸（闲付）' : 'Tsumo (others pay)'}</span>
              <span className="ml-1.5 font-bold text-gray-900">{p.tsumo.nonDealer.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function YakuRoutes({ vm, locale }) {
  const { regularRoutes, yakumanRoutes, hand } = vm;
  const [showImp,    setShowImp]    = useState(false);
  const [showYk,     setShowYk]     = useState(false);
  const [showImpYk,  setShowImpYk]  = useState(false);

  const feasible   = regularRoutes.filter((r) => r.feasibility !== FEASIBILITY.IMPOSSIBLE);
  const impossible = regularRoutes.filter((r) => r.feasibility === FEASIBILITY.IMPOSSIBLE);
  const ykFeasible = yakumanRoutes.filter((r) => r.feasibility !== FEASIBILITY.IMPOSSIBLE);
  const ykImp      = yakumanRoutes.filter((r) => r.feasibility === FEASIBILITY.IMPOSSIBLE);
  const isOpen     = hand.isOpen;

  const ToggleBtn = ({ onClick, active, children }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
    >
      {active ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {children}
    </button>
  );

  return (
    <div>
      {/* Feasible routes */}
      {feasible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {feasible.map((r) => (
            <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />
          ))}
        </div>
      )}

      {/* Impossible routes */}
      {impossible.length > 0 && (
        <div className="mb-4">
          <ToggleBtn onClick={() => setShowImp((v) => !v)} active={showImp}>
            {locale === 'zh'
              ? `${showImp ? '收起' : '显示'}不可达役种（${impossible.length}）`
              : `${showImp ? 'Hide' : 'Show'} impossible (${impossible.length})`}
          </ToggleBtn>
          {showImp && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {impossible.map((r) => (
                <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Yakuman divider */}
      <div className="border-t border-gray-100 pt-4">
        <ToggleBtn onClick={() => setShowYk((v) => !v)} active={showYk}>
          {locale === 'zh'
            ? `${showYk ? '收起' : '显示'}役满参考（${ykFeasible.length + ykImp.length}种）`
            : `${showYk ? 'Hide' : 'Show'} Yakuman reference (${ykFeasible.length + ykImp.length})`}
        </ToggleBtn>

        {showYk && (
          <div className="mt-3">
            {ykFeasible.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {ykFeasible.map((r) => (
                  <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />
                ))}
              </div>
            )}
            {ykImp.length > 0 && (
              <div>
                <ToggleBtn onClick={() => setShowImpYk((v) => !v)} active={showImpYk}>
                  {locale === 'zh'
                    ? `${showImpYk ? '收起' : '显示'}不可达役满（${ykImp.length}）`
                    : `${showImpYk ? 'Hide' : 'Show'} impossible yakuman (${ykImp.length})`}
                </ToggleBtn>
                {showImpYk && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {ykImp.map((r) => (
                      <RouteCard key={r.id} route={r} isOpen={isOpen} locale={locale} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Toggle group ──────────────────────────────────────────────────────────────

function ToggleGroup({ options, value, onChange, locale }) {
  return (
    <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-[11px] font-bold transition-colors border-r border-gray-200 last:border-r-0
              ${active ? 'bg-gray-950 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            {locale === 'zh' ? opt.zh : opt.en}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${checked ? 'bg-gray-950' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-[1px] left-[1px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-[14px]' : ''}`} />
      </button>
      <span className="text-[11px] text-gray-600 whitespace-nowrap">{label}</span>
    </label>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIND_OPTIONS = [
  { value: 1, zh: '东', en: 'E' },
  { value: 2, zh: '南', en: 'S' },
  { value: 3, zh: '西', en: 'W' },
  { value: 4, zh: '北', en: 'N' },
];

// ── Main page ─────────────────────────────────────────────────────────────────

function MahjongTrainer() {
  const { t, locale } = useLocale();
  const resultRef  = useRef(null);
  const handBarRef = useRef(null);
  const [handBarHeight, setHandBarHeight] = useState(0);

  const [concealedTiles, setConcealedTiles] = useState([]);
  const [openMelds,      setOpenMelds]      = useState([]);
  const [meldBuilder,    setMeldBuilder]    = useState([]);
  const [seatWind,       setSeatWind]       = useState(1);
  const [roundWind,      setRoundWind]      = useState(1);
  const [openTanyao,     setOpenTanyao]     = useState(true);
  const [twoHanMin,      setTwoHanMin]      = useState(false);
  const [result,         setResult]         = useState(null);
  const [analyzeError,   setAnalyzeError]   = useState('');
  const [tileWarning,    setTileWarning]    = useState('');

  useEffect(() => {
    if (!tileWarning) return;
    const t = setTimeout(() => setTileWarning(''), 2200);
    return () => clearTimeout(t);
  }, [tileWarning]);

  // Keep page content below the fixed hand bar as its height changes
  useEffect(() => {
    const el = handBarRef.current;
    if (!el) { setHandBarHeight(0); return; }
    const ro = new ResizeObserver(([entry]) => setHandBarHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  });

  const allTiles = useMemo(
    () => [...concealedTiles, ...openMelds.flat(), ...meldBuilder],
    [concealedTiles, openMelds, meldBuilder]
  );
  const tileCounts = useMemo(() => groupTiles(allTiles), [allTiles]);

  const hasHand    = concealedTiles.length > 0 || openMelds.length > 0;
  const totalCount = allTiles.length;

  const handleTileClick = (tile) => {
    if (totalCount >= 14) {
      setTileWarning(locale === 'zh' ? '手牌已达上限（14张）' : 'Hand is full (14 tiles max)');
      return;
    }
    if ((tileCounts[tileKey(tile)] ?? 0) >= 4) {
      setTileWarning(locale === 'zh'
        ? `${tileName(tile, 'zh')}已有4张`
        : `Already 4 ${tileName(tile, 'en')}`);
      return;
    }
    setConcealedTiles((prev) => [...prev, tile]);
  };

  const handleMeldTileClick = (tile) => {
    if (totalCount >= 14) {
      setTileWarning(locale === 'zh' ? '手牌已达上限（14张）' : 'Hand is full (14 tiles max)');
      return;
    }
    if ((tileCounts[tileKey(tile)] ?? 0) >= 4) {
      setTileWarning(locale === 'zh'
        ? `${tileName(tile, 'zh')}已有4张`
        : `Already 4 ${tileName(tile, 'en')}`);
      return;
    }
    setMeldBuilder((prev) => [...prev, tile]);
  };

  const handleTileRightClick = (tile) => {
    setConcealedTiles((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (tileKey(copy[i]) === tileKey(tile)) { copy.splice(i, 1); break; }
      }
      return copy;
    });
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

  const handleClearMeldBuilder  = () => setMeldBuilder([]);
  const handleRemoveFromBuilder  = (idx) => setMeldBuilder((prev) => prev.filter((_, i) => i !== idx));
  const handleRemoveMeld         = (idx) => setOpenMelds((prev) => prev.filter((_, i) => i !== idx));

  const handleAnalyze = () => {
    setAnalyzeError('');
    if (!hasHand) {
      setAnalyzeError(locale === 'zh' ? '请先用选择器添加手牌' : 'Please add tiles using the picker first.');
      return;
    }
    const rules    = { openTanyao, twoHanMin };
    const analysis = analyzeHand(concealedTiles, openMelds, seatWind, roundWind, rules);
    const vm       = buildTrainerViewModel(analysis, [...concealedTiles], [...openMelds]);

    // Compute score for complete hands
    let scoreResult = null;
    if (analysis.handStatus.isComplete) {
      const groups = extractAllHandGroups(concealedTiles, openMelds.length);
      if (groups.length > 0) {
        const yakuIds = evaluateYakuFromDecomposition(groups[0], openMelds, seatWind, roundWind, rules);
        scoreResult = computeScore(groups[0], openMelds, yakuIds, seatWind, roundWind, 'ron', null);
      }
    }
    setResult({ vm, scoreResult });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleClearAll = () => {
    setConcealedTiles([]); setOpenMelds([]); setMeldBuilder([]);
    setResult(null); setAnalyzeError('');
  };

  const handleReset = () => {
    handleClearAll();
    setSeatWind(1); setRoundWind(1);
    setOpenTanyao(true); setTwoHanMin(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed hand bar */}
      <FixedHandBar
        concealedTiles={concealedTiles}
        openMelds={openMelds}
        vm={result?.vm ?? null}
        onRemoveTile={handleRemoveFromHand}
        onRemoveMeld={handleRemoveMeld}
        onClearAll={handleClearAll}
        locale={locale}
        barRef={handBarRef}
      />

      <div
        className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 sm:pb-14"
        style={hasHand ? { paddingTop: handBarHeight + 16 } : undefined}
      >

        {/* ── Title ── */}
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950 leading-none mb-2">
            {t('mahjong.title')}
          </h1>
          <p className="text-sm text-gray-400">{t('mahjong.subtitle')}</p>
        </div>

        {/* ── Input card ── */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">

          {/* Settings */}
          <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                {t('mahjong.seatWind')}
              </span>
              <ToggleGroup options={WIND_OPTIONS} value={seatWind} onChange={setSeatWind} locale={locale} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                {t('mahjong.roundWind')}
              </span>
              <ToggleGroup options={WIND_OPTIONS.slice(0, 2)} value={roundWind} onChange={setRoundWind} locale={locale} />
            </div>
            <ToggleSwitch checked={openTanyao} onChange={setOpenTanyao} label={t('mahjong.openTanyao')} />
            <ToggleSwitch checked={twoHanMin}  onChange={setTwoHanMin}  label={t('mahjong.twoHanMin')} />
          </div>

          {/* CTA */}
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100">
            {analyzeError && (
              <p className="text-xs text-red-400 mb-3">{analyzeError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                className="flex-1 py-3 bg-gray-950 text-white text-sm font-bold rounded-xl hover:bg-gray-800 active:bg-black transition-colors flex items-center justify-center gap-2"
              >
                <Search size={14} />
                {t('mahjong.analyzeButton')}
              </button>
              <button
                onClick={handleReset}
                title={locale === 'zh' ? '重置' : 'Reset'}
                className="px-4 py-3 border border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tile picker card ── */}
        <div className="border border-gray-200 rounded-2xl p-5 sm:p-6 mb-4">
          <MahjongTilePicker
            allTiles={allTiles}
            totalCount={totalCount}
            onTileClick={handleTileClick}
            onTileRightClick={handleTileRightClick}
            onMeldTileClick={handleMeldTileClick}
            meldBuilder={meldBuilder}
            onAddMeld={handleAddMeld}
            onClearMeldBuilder={handleClearMeldBuilder}
            onRemoveFromBuilder={handleRemoveFromBuilder}
            locale={locale}
            size="sm"
          />
        </div>

        {/* ── Results ── */}
        {result && (
          <div ref={resultRef} className="pt-2">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[10px] font-black tracking-widest uppercase text-gray-300">
                {locale === 'zh' ? '分析结果' : 'Analysis'}
              </span>
              <div className="flex-1 border-t border-gray-100" />
            </div>

            <Warnings warnings={result.vm.warnings} locale={locale} />
            <ResultsSummary vm={result.vm} locale={locale} />

            {result.vm.hand.isComplete ? (
              <CompletedPanel vm={result.vm} locale={locale} scoreResult={result.scoreResult} />
            ) : (
              <YakuRoutes vm={result.vm} locale={locale} />
            )}
          </div>
        )}

      </div>

      {/* Tile warning toast */}
      {tileWarning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-950 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl whitespace-nowrap">
          {tileWarning}
        </div>
      )}

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={locale === 'zh' ? '返回顶部' : 'Back to top'}
        className="fixed bottom-5 right-4 sm:bottom-7 sm:right-7 z-40 w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 transition-colors"
      >
        <ArrowUp size={15} />
      </button>
    </div>
  );
}

export default MahjongTrainer;
