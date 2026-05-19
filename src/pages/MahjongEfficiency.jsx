/* eslint-disable react/prop-types */
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ArrowUp, Shuffle } from 'lucide-react';
import MahjongTile       from '../components/mahjong/MahjongTile';
import MahjongTilePicker from '../components/mahjong/MahjongTilePicker';
import { useLocale }     from '../contexts/LocaleContext';
import { sortTiles, tileName, tileKey, groupTiles, parseTiles, generateHandString, extractAllHandGroups } from '../utils/mahjong/tileParser';
import { analyzeEfficiency } from '../utils/mahjong/ukeire.js';
import { evaluateYakuFromDecomposition } from '../utils/mahjong/handSimulator.js';
import { computeScore } from '../utils/mahjong/scoring.js';

// All 34 tile types used for random draw
const ALL_34 = [
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'm', value: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 'p', value: i + 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ suit: 's', value: i + 1 })),
  ...Array.from({ length: 7 }, (_, i) => ({ suit: 'z', value: i + 1 })),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function removeOne(tiles, key) {
  let removed = false;
  return tiles.filter(t => {
    if (!removed && tileKey(t) === key) { removed = true; return false; }
    return true;
  });
}

// ── Shanten badge ─────────────────────────────────────────────────────────────

function ShantenBadge({ shanten, locale }) {
  if (shanten === undefined || shanten === null) return null;
  if (shanten === -1) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-950 text-white">
      {locale === 'zh' ? '和牌' : 'Complete'}
    </span>
  );
  if (shanten === 0) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-700 text-white">
      {locale === 'zh' ? '听牌' : 'Tenpai'}
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600">
      {shanten}{locale === 'zh' ? '向听' : '-shanten'}
    </span>
  );
}

// ── Waits panel (tenpai) ──────────────────────────────────────────────────────

function WaitsPanel({ waits, concealedTiles, openMelds, locale }) {
  if (!waits || waits.length === 0) return (
    <div className="border border-gray-200 rounded-2xl p-5 text-sm text-gray-400">
      {locale === 'zh' ? '当前手牌无和牌方式' : 'No winning tiles found'}
    </div>
  );
  const total = waits.reduce((s, e) => s + e.remaining, 0);

  // Compute score for each wait tile
  const waitScores = useMemo(() => waits.map(w => {
    try {
      const full = [...concealedTiles, w.tile];
      const groups = extractAllHandGroups(full, openMelds.length);
      if (!groups.length) return null;
      const ids = evaluateYakuFromDecomposition(groups[0], openMelds, 1, 1, { openTanyao: true });
      return computeScore(groups[0], openMelds, ids, 1, 1, 'ron', w.tile);
    } catch { return null; }
  }), [waits, concealedTiles, openMelds]);

  return (
    <div className="border border-gray-200 rounded-2xl p-5 sm:p-6">
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4">
        {locale === 'zh' ? `待ち牌 · ${waits.length}种 · ${total}张` : `Waits · ${waits.length} kinds · ${total} tiles`}
      </p>
      <div className="flex flex-col gap-3">
        {waits.map((w, i) => {
          const sc = waitScores[i];
          const p  = sc?.points;
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Tile + remaining */}
              <div className="flex flex-col items-center gap-0.5 w-12 shrink-0">
                <MahjongTile tile={w.tile} size="md" />
                <span className="text-[10px] font-bold text-gray-400">×{w.remaining}</span>
              </div>
              {/* Score info */}
              {sc && p ? (
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-500">
                    {sc.han === 'yakuman'
                      ? p.limitName
                      : `${sc.han}${locale === 'zh' ? '番' : 'han'} ${sc.fu}${locale === 'zh' ? '符' : 'fu'}${p.limitName ? ' · ' + p.limitName : ''}`}
                  </p>
                  <p className="text-xs font-bold text-gray-800">
                    {locale === 'zh' ? '荣' : 'Ron'} {p.ron.nonDealer.toLocaleString()}
                    <span className="font-normal text-gray-400 ml-1">
                      ({locale === 'zh' ? '庄' : 'dlr'} {p.ron.dealer.toLocaleString()})
                    </span>
                  </p>
                  {!p.isLimit && (
                    <p className="text-[10px] text-gray-400">
                      {locale === 'zh' ? '自摸' : 'Tsumo'} {p.tsumo.nonDealer.toLocaleString()} / {p.tsumo.dealer.toLocaleString()}
                    </p>
                  )}
                  {p.isLimit && (
                    <p className="text-[10px] text-gray-400">
                      {locale === 'zh' ? '自摸' : 'Tsumo'} {p.tsumo.nonDealer.toLocaleString()} / {p.tsumo.dealer.toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-[11px] text-gray-300">{locale === 'zh' ? '无役' : 'No yaku'}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Drill-down panel ──────────────────────────────────────────────────────────

function DrillDown({ discardTile, concealedTiles, openMelds, locale }) {
  const afterDiscard = useMemo(
    () => removeOne(concealedTiles, tileKey(discardTile)),
    [concealedTiles, discardTile]
  );
  const result = useMemo(
    () => analyzeEfficiency(afterDiscard, openMelds),
    [afterDiscard, openMelds]
  );

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
      {/* After-discard hand */}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
        {locale === 'zh' ? '打出后手牌' : 'After discarding'}
        <ShantenBadge shanten={result.shanten} locale={locale} />
      </p>
      <div className="flex flex-wrap gap-1 mb-4">
        {sortTiles(afterDiscard).map((t, i) => (
          <MahjongTile key={i} tile={t} size="xs" />
        ))}
        {openMelds.map((meld, mi) => (
          <div key={mi} className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-gray-200 bg-white">
            {meld.map((t, ti) => <MahjongTile key={ti} tile={t} size="xs" />)}
          </div>
        ))}
      </div>

      {/* Tenpai waits */}
      {result.shanten === 0 && result.waits.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {locale === 'zh'
              ? `待ち牌 · ${result.waits.length}种 · ${result.waits.reduce((s,w)=>s+w.remaining,0)}张`
              : `Waits · ${result.waits.length} kinds`}
          </p>
          <div className="flex flex-wrap gap-3">
            {result.waits.map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <MahjongTile tile={w.tile} size="sm" />
                <span className="text-[10px] text-gray-400">×{w.remaining}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Next ukeire (best 3 discards) */}
      {result.shanten > 0 && result.ukeire.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {locale === 'zh' ? '有效摸牌（最优打法）' : 'Effective draws (best discards)'}
          </p>
          <div className="flex flex-col gap-1.5">
            {result.ukeire.slice(0, 3).map((entry, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-gray-400">{locale === 'zh' ? '打' : 'D'}</span>
                  <MahjongTile tile={entry.discardTile} size="xs" />
                  <span className="text-[10px] text-gray-300 mx-1">→</span>
                  <span className="text-[10px] font-semibold text-gray-600">
                    {entry.kinds}{locale === 'zh' ? '种' : 'k'} {entry.totalCount}{locale === 'zh' ? '张' : 't'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.effectiveTiles.slice(0, 8).map((e, j) => (
                    <MahjongTile key={j} tile={e.tile} size="xs" />
                  ))}
                  {entry.effectiveTiles.length > 8 && (
                    <span className="text-[10px] text-gray-400 self-end">+{entry.effectiveTiles.length - 8}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Ukeire list (compact horizontal layout) ──────────────────────────────────

function UkeireTable({ ukeire, shanten, concealedTiles, openMelds, locale, expandedKey, onToggle, onDrawTile }) {
  const good = ukeire.filter(e => e.shantenAfter <= shanten);
  const bad  = ukeire.filter(e => e.shantenAfter >  shanten);

  const Row = ({ entry, dimmed = false }) => {
    const key    = tileKey(entry.discardTile);
    const isOpen = expandedKey === key;
    const isTenpai = entry.shantenAfter < shanten;

    return (
      <div>
        {/* Main row */}
        <div
          onClick={() => onToggle(isOpen ? null : key)}
          className={`flex items-center gap-2.5 px-4 py-2 border-b border-gray-100 cursor-pointer select-none transition-colors
            ${dimmed ? 'opacity-35' : 'hover:bg-gray-50'}
            ${isOpen ? 'bg-gray-50' : ''}`}
        >
          {/* Discard tile */}
          <div className="shrink-0">
            <MahjongTile tile={entry.discardTile} size="sm" />
          </div>

          {/* Arrow */}
          <span className="text-gray-300 text-xs shrink-0">→</span>

          {/* Effective tiles — horizontal wrap, clickable to draw */}
          <div
            className="flex flex-wrap gap-x-1.5 gap-y-1 flex-1 min-w-0 items-end"
            onClick={e => e.stopPropagation()}
          >
            {entry.effectiveTiles.map((e, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-px"
                title={onDrawTile
                  ? (locale === 'zh' ? `摸入${e.tile.value}${['','万','饼','索','z']['mpsz'.indexOf(e.tile.suit)+1]||''}` : `Draw this tile`)
                  : undefined}
              >
                <MahjongTile
                  tile={e.tile}
                  size="xs"
                  onClick={onDrawTile ? () => onDrawTile(e.tile) : undefined}
                />
                <span className="text-[9px] text-gray-400 leading-none">×{e.remaining}</span>
              </div>
            ))}
            {entry.effectiveTiles.length === 0 && (
              <span className="text-[11px] text-gray-300 self-center">—</span>
            )}
          </div>

          {/* Count + tenpai badge */}
          <div className="shrink-0 flex items-center gap-1.5">
            {isTenpai && (
              <span className="text-[10px] font-bold bg-gray-900 text-white px-1.5 py-0.5 rounded">
                {locale === 'zh' ? '听牌' : 'Tenpai'}
              </span>
            )}
            <span className="text-[12px] font-bold text-gray-700 tabular-nums">
              {entry.totalCount}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">
                {locale === 'zh' ? '张' : 't'}
              </span>
            </span>
          </div>
        </div>

        {/* Drill-down */}
        {isOpen && (
          <div className="px-4 pb-3 border-b border-gray-100">
            <DrillDown
              discardTile={entry.discardTile}
              concealedTiles={concealedTiles}
              openMelds={openMelds}
              locale={locale}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {good.map(e => <Row key={tileKey(e.discardTile)} entry={e} />)}
      {bad.length > 0 && good.length > 0 && (
        <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
          <span className="text-[10px] text-gray-300 uppercase tracking-wider">
            {locale === 'zh' ? '以下打法会使向听数升高' : 'Discards that worsen shanten'}
          </span>
        </div>
      )}
      {bad.map(e => <Row key={tileKey(e.discardTile)} entry={e} dimmed />)}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function MahjongEfficiency() {
  const { t, locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const [concealedTiles, setConcealedTiles] = useState([]);
  const [openMelds,      setOpenMelds]      = useState([]);
  const [meldBuilder,    setMeldBuilder]    = useState([]);
  const [tileWarning,    setTileWarning]    = useState('');
  const [expandedKey,    setExpandedKey]    = useState(null);
  const [textInput,      setTextInput]      = useState('');
  const [textError,      setTextError]      = useState('');

  useEffect(() => {
    if (!tileWarning) return;
    const t = setTimeout(() => setTileWarning(''), 2200);
    return () => clearTimeout(t);
  }, [tileWarning]);

  const allTiles   = useMemo(
    () => [...concealedTiles, ...openMelds.flat(), ...meldBuilder],
    [concealedTiles, openMelds, meldBuilder]
  );
  const tileCounts = useMemo(() => groupTiles(allTiles), [allTiles]);
  const totalCount = allTiles.length;
  const isHandFull = totalCount >= 14;
  const hasHand       = concealedTiles.length > 0 || openMelds.length > 0;
  // Waiting count: 13 tiles for 0 melds, 10 for 1, 7 for 2, 4 for 3
  const waitingCount  = 13 - 3 * openMelds.length;
  const isWaitingForDraw = concealedTiles.length === waitingCount;

  // Auto-compute analysis whenever hand changes
  const analysis = useMemo(() => {
    if (!hasHand) return null;
    return analyzeEfficiency(concealedTiles, openMelds);
  }, [concealedTiles, openMelds, hasHand]);

  // Reset drill-down when hand changes
  useEffect(() => { setExpandedKey(null); }, [concealedTiles, openMelds]);

  // Restore hand from URL on mount (?q=123m456p789s11z)
  useEffect(() => {
    const q = searchParams.get('q');
    if (!q) return;
    try {
      const tiles = parseTiles(q);
      if (tiles.length > 0 && tiles.length <= 14) {
        const counts = groupTiles(tiles);
        if (!Object.values(counts).some(n => n > 4)) {
          setConcealedTiles(tiles);
        }
      }
    } catch { /* ignore malformed URL param */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync hand → URL whenever tiles change
  useEffect(() => {
    const handStr = concealedTiles.length > 0 ? generateHandString(concealedTiles) : '';
    const current = searchParams.get('q') ?? '';
    if (handStr !== current) {
      setSearchParams(handStr ? { q: handStr } : {}, { replace: true });
    }
  }, [concealedTiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleTileClick = (tile) => {
    if (isHandFull) { setTileWarning(locale === 'zh' ? '手牌已达上限（14张）' : 'Hand full (14 tiles max)'); return; }
    if ((tileCounts[tileKey(tile)] ?? 0) >= 4) {
      setTileWarning(locale === 'zh' ? `${tileName(tile,'zh')}已有4张` : `Already 4 ${tileName(tile,'en')}`);
      return;
    }
    setTextInput(''); setTextError('');
    setConcealedTiles(prev => [...prev, tile]);
  };

  const handleTileRightClick = (tile) => {
    setTextInput(''); setTextError('');
    setConcealedTiles(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (tileKey(copy[i]) === tileKey(tile)) { copy.splice(i, 1); break; }
      }
      return copy;
    });
  };

  const handleMeldTileClick = (tile) => {
    if (isHandFull) { setTileWarning(locale === 'zh' ? '手牌已达上限（14张）' : 'Hand full'); return; }
    if ((tileCounts[tileKey(tile)] ?? 0) >= 4) {
      setTileWarning(locale === 'zh' ? `${tileName(tile,'zh')}已有4张` : `Already 4 ${tileName(tile,'en')}`);
      return;
    }
    setMeldBuilder(prev => [...prev, tile]);
  };

  const handleRemoveFromHand = (tile) => {
    setTextInput(''); setTextError('');
    setConcealedTiles(prev => {
      const copy = [...prev];
      const idx  = copy.findIndex(t => tileKey(t) === tileKey(tile));
      if (idx >= 0) copy.splice(idx, 1);
      return copy;
    });
  };

  const handleAddMeld = () => {
    if (meldBuilder.length < 3) { setTileWarning(locale === 'zh' ? '副露至少需要3张牌' : 'A meld needs at least 3 tiles.'); return; }
    setOpenMelds(prev => [...prev, [...meldBuilder]]);
    setMeldBuilder([]);
  };

  const handleClearAll = () => {
    setConcealedTiles([]); setOpenMelds([]); setMeldBuilder([]);
    setTextInput(''); setTextError('');
  };

  // Draw a specific tile (clicked from effective tile list)
  const handleDrawTile = (tile) => {
    if (isHandFull) return;
    if ((tileCounts[tileKey(tile)] ?? 0) >= 4) return;
    setTextInput(''); setTextError('');
    setConcealedTiles(prev => [...prev, tile]);
  };

  // Random draw: pick a tile from the remaining wall (weighted by remaining count)
  const handleRandomDraw = () => {
    const inHand = groupTiles([...concealedTiles, ...openMelds.flat()]);
    // Build candidate pool weighted by remaining count
    const pool = ALL_34.flatMap(tile => {
      const remaining = 4 - (inHand[tileKey(tile)] || 0);
      return Array.from({ length: remaining }, () => tile);
    });
    if (pool.length === 0) return;
    const drawn = pool[Math.floor(Math.random() * pool.length)];
    setTextInput(''); setTextError('');
    setConcealedTiles(prev => [...prev, drawn]);
  };

  // Real-time text → tiles sync
  const handleTextChange = (value) => {
    setTextInput(value);
    setTextError('');
    if (!value.trim()) return;
    try {
      const tiles = parseTiles(value);
      if (tiles.length === 0) return; // still typing, no suit letter yet
      if (tiles.length > 14) {
        setTextError(locale === 'zh' ? `超过14张（${tiles.length}张）` : `Too many tiles (${tiles.length})`);
        return;
      }
      const counts = groupTiles(tiles);
      if (Object.values(counts).some(n => n > 4)) {
        setTextError(locale === 'zh' ? '同一张牌最多4张' : 'Max 4 copies of any tile');
        return;
      }
      setConcealedTiles(tiles);
      setOpenMelds([]);
      setMeldBuilder([]);
    } catch { /* silently ignore mid-typing parse errors */ }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950 leading-none mb-2">
            {t('efficiency.title')}
          </h1>
          <p className="text-sm text-gray-400">{t('efficiency.subtitle')}</p>
        </div>

        {/* Input card */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">

          {/* Text notation input */}
          <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={locale === 'zh' ? '例：123m456p789s11z' : 'e.g. 123m456p789s11z'}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
              />
              {textInput && (
                <button
                  onClick={() => { setTextInput(''); setTextError(''); }}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {textError && (
              <p className="text-[11px] text-red-400 mt-1.5">{textError}</p>
            )}
            <p className="text-[10px] text-gray-300 mt-1.5">
              {locale === 'zh'
                ? '格式：数字+花色  m=万 p=饼 s=索 z=字(1-7)  0m/0p/0s=赤五'
                : 'Format: digits+suit  m=man p=pin s=sou z=honours(1-7)  0m/0p/0s=red five'}
            </p>
          </div>

          {/* Hand display */}
          <div className="px-5 sm:px-6 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black tracking-widest uppercase text-gray-300">
                {locale === 'zh' ? '当前手牌' : 'Hand'}
              </span>
              {analysis && <ShantenBadge shanten={analysis.shanten} locale={locale} />}
              <span className={`text-[10px] font-bold ${isHandFull ? 'text-red-400' : 'text-gray-400'}`}>
                {totalCount}/14
              </span>
              <div className="flex-1" />
              {hasHand && (
                <button onClick={handleClearAll}
                  className="text-[11px] font-bold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-700 transition-colors">
                  {t('efficiency.clearAll')}
                </button>
              )}
            </div>

            <div className="min-h-[44px] flex flex-wrap gap-1.5 items-end">
              {!hasHand ? (
                <p className="text-sm text-gray-300 leading-[40px] select-none">
                  {t('efficiency.noHand')}
                </p>
              ) : (
                <>
                  {sortTiles(concealedTiles).map((tile, i) => (
                    <div key={i} title={locale === 'zh' ? `移除${tileName(tile,'zh')}` : `Remove ${tileName(tile,'en')}`}>
                      <MahjongTile tile={tile} size="sm" onClick={handleRemoveFromHand} />
                    </div>
                  ))}
                  {openMelds.map((meld, mi) => (
                    <div key={mi} className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-gray-200 bg-gray-50">
                      {meld.map((tile, ti) => <MahjongTile key={ti} tile={tile} size="sm" />)}
                      <button onClick={() => setOpenMelds(prev => prev.filter((_,i) => i !== mi))}
                        className="ml-1 p-0.5 text-gray-400 hover:text-gray-700 transition-colors">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              {hasHand && (
                <p className="text-[10px] text-gray-300">{t('efficiency.removeHint')}</p>
              )}
              {isWaitingForDraw && (
                <button
                  onClick={handleRandomDraw}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-700 transition-colors ml-auto"
                >
                  <Shuffle size={11} />
                  {locale === 'zh' ? '随机摸牌' : 'Random Draw'}
                </button>
              )}
            </div>
          </div>

          {/* Tile picker */}
          <div className="border-t border-gray-100 px-5 sm:px-6 py-5">
            <MahjongTilePicker
              allTiles={allTiles}
              totalCount={totalCount}
              onTileClick={handleTileClick}
              onTileRightClick={handleTileRightClick}
              onMeldTileClick={handleMeldTileClick}
              meldBuilder={meldBuilder}
              onAddMeld={handleAddMeld}
              onClearMeldBuilder={() => setMeldBuilder([])}
              onRemoveFromBuilder={(idx) => setMeldBuilder(prev => prev.filter((_,i) => i !== idx))}
              locale={locale}
              size="sm"
            />
          </div>
        </div>

        {/* Analysis results */}
        {analysis && hasHand && (
          <div>
            {analysis.shanten === -1 && (
              <div className="border border-gray-200 rounded-2xl p-5 text-center">
                <p className="font-black text-2xl text-gray-950 mb-1">
                  {locale === 'zh' ? '✓ 和牌' : '✓ Complete Hand'}
                </p>
                <p className="text-sm text-gray-400">
                  {locale === 'zh' ? '当前手牌已构成完整和牌' : 'The current hand is a winning hand.'}
                </p>
              </div>
            )}

            {analysis.shanten === 0 && (
              <WaitsPanel
                waits={analysis.waits}
                concealedTiles={concealedTiles}
                openMelds={openMelds}
                locale={locale}
              />
            )}

            {analysis.shanten > 0 && analysis.ukeire.length > 0 && (
              <UkeireTable
                ukeire={analysis.ukeire}
                shanten={analysis.shanten}
                concealedTiles={concealedTiles}
                openMelds={openMelds}
                locale={locale}
                expandedKey={expandedKey}
                onToggle={setExpandedKey}
                onDrawTile={!isHandFull ? handleDrawTile : null}
              />
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

export default MahjongEfficiency;
