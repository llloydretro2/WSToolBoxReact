import { groupTiles, tileKey, tileName, canCompleteHand, extractHandGroups, sortTiles } from './tileParser';
import { findScenarios } from './handSimulator';
import { searchYakuRoute, makeBFSScenario } from './yakuBFS';
import { computeShanten } from './shanten';

export const FEASIBILITY = {
  CONFIRMED: 'confirmed',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  VERY_LOW: 'very_low',
  IMPOSSIBLE: 'impossible',
};

// ── Tile predicates ───────────────────────────────────────────────────────────

function isTerminal(t) {
  return t.suit !== 'z' && (t.value === 1 || t.value === 9);
}
function isHonor(t) {
  return t.suit === 'z';
}
function isTerminalOrHonor(t) {
  return isTerminal(t) || isHonor(t);
}
function isDragon(t) {
  return t.suit === 'z' && t.value >= 5;
}
function isGreen(t) {
  if (t.suit === 'z' && t.value === 6) return true;
  if (t.suit === 's' && [2, 3, 4, 6, 8].includes(t.value)) return true;
  return false;
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function countIn(tiles, suit, value) {
  return tiles.filter((t) => t.suit === suit && t.value === value).length;
}

function countTotal(concealedTiles, openMelds, suit, value) {
  return countIn(concealedTiles, suit, value) + countIn(openMelds.flat(), suit, value);
}

function meldIsTriplet(meld, suit, value) {
  return meld.length >= 3 && meld.every((t) => t.suit === suit && t.value === value);
}

function meldIsSequence(meld) {
  if (meld.length !== 3) return false;
  const sorted = [...meld].sort((a, b) => a.value - b.value);
  return (
    sorted[0].suit === sorted[1].suit &&
    sorted[1].suit === sorted[2].suit &&
    sorted[0].suit !== 'z' &&
    sorted[1].value === sorted[0].value + 1 &&
    sorted[2].value === sorted[0].value + 2
  );
}

// Detect complete sequences present in tiles for a given suit
function sequencesPresent(tiles, suit) {
  const g = groupTiles(tiles.filter((t) => t.suit === suit));
  const seqs = [];
  for (let v = 1; v <= 7; v++) {
    if ((g[suit + v] || 0) >= 1 && (g[suit + (v + 1)] || 0) >= 1 && (g[suit + (v + 2)] || 0) >= 1) {
      seqs.push(v);
    }
  }
  return seqs;
}

// Count tiles in each suit
function suitCounts(tiles) {
  const counts = { m: 0, p: 0, s: 0, z: 0 };
  for (const t of tiles) counts[t.suit]++;
  return counts;
}

// Which suits appear (excluding z)
function suitsPresent(tiles) {
  return ['m', 'p', 's'].filter((s) => tiles.some((t) => t.suit === s));
}

// ── HAND VALIDATION ────────────────────────────────────────────────────────────

export function validateHand(concealedTiles, openMelds) {
  const numMelds = openMelds.length;
  const concealedCount = concealedTiles.length;
  const expectedWaiting = 13 - 3 * numMelds;
  const expectedComplete = 14 - 3 * numMelds;
  const errors = [];

  let tileCountStatus;
  if (concealedCount === expectedWaiting) tileCountStatus = 'waiting';
  else if (concealedCount === expectedComplete) tileCountStatus = 'complete';
  else if (concealedCount < expectedWaiting) {
    tileCountStatus = 'low';
    errors.push('tile_count_low');
  } else {
    tileCountStatus = 'high';
    errors.push('tile_count_high');
  }

  for (const m of openMelds) {
    if (m.length < 3) errors.push('meld_too_short');
  }

  const isComplete =
    tileCountStatus === 'complete' && canCompleteHand(concealedTiles, numMelds);

  return {
    tileCountStatus,
    expectedWaiting,
    expectedComplete,
    concealedCount,
    numMelds,
    isOpen: numMelds > 0,
    isComplete,
    errors,
  };
}

// ── YAKU ANALYZERS ─────────────────────────────────────────────────────────────

// context shape: { concealedTiles, openMelds, allTiles, isOpen, seatWind, roundWind, rules }

function analyzeYakuhai(ctx) {
  const { concealedTiles, openMelds, seatWind, roundWind } = ctx;
  const WIND_ZH = { 1: '东', 2: '南', 3: '西', 4: '北' };
  const WIND_EN = { 1: 'East', 2: 'South', 3: 'West', 4: 'North' };
  const DRAGON_ZH = { 5: '白', 6: '发', 7: '中' };
  const DRAGON_EN = { 5: 'White', 6: 'Green', 7: 'Red' };

  const valueTiles = [...new Set([5, 6, 7, seatWind, roundWind].filter(Boolean))];

  function label(zv, lang) {
    if (lang === 'zh') return DRAGON_ZH[zv] || WIND_ZH[zv] || '';
    return DRAGON_EN[zv] || WIND_EN[zv] || '';
  }

  // Is it a double wind (seat == round)?
  const doubleWindValue = seatWind === roundWind ? seatWind : null;

  // Check open meld triplets first
  for (const meld of openMelds) {
    for (const zv of valueTiles) {
      if (meldIsTriplet(meld, 'z', zv)) {
        const isDouble = doubleWindValue === zv;
        const lzh = label(zv, 'zh');
        const len = label(zv, 'en');
        const han = isDouble ? 2 : 1;
        return {
          id: 'yakuhai',
          nameZh: '役牌', nameEn: 'Yakuhai', nameJa: '役牌',
          han: { closed: han, open: han },
          feasibility: FEASIBILITY.CONFIRMED,
          zh: { needed: '', explanation: `已有${lzh}刻子（副露），役牌已确立（${han}番）。` },
          en: { needed: '', explanation: `${len} triplet is open — Yakuhai is confirmed (${han} han).` },
          openAllowed: true, impossibleReason: null, isYakuman: false,
        };
      }
    }
  }

  // Concealed triplets / pairs / singles
  let bestZv = null;
  let bestCnt = 0;
  for (const zv of valueTiles) {
    const c = countIn(concealedTiles, 'z', zv);
    if (c > bestCnt) { bestCnt = c; bestZv = zv; }
  }

  if (bestCnt >= 3) {
    const lzh = label(bestZv, 'zh');
    const len = label(bestZv, 'en');
    return {
      id: 'yakuhai', nameZh: '役牌', nameEn: 'Yakuhai', nameJa: '役牌',
      han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '', explanation: `手中已有${lzh}暗刻，和牌即确立役牌。` },
      en: { needed: '', explanation: `Concealed ${len} triplet in hand — wins lock in Yakuhai.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (bestCnt === 2) {
    const lzh = label(bestZv, 'zh');
    const len = label(bestZv, 'en');
    return {
      id: 'yakuhai', nameZh: '役牌', nameEn: 'Yakuhai', nameJa: '役牌',
      han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: `再摸一张${lzh}，凑成刻子（或碰牌副露）`, explanation: `有${lzh}对子，再得一张或碰牌即可确立役牌。` },
      en: { needed: `One more ${len} to complete the triplet (or pon)`, explanation: `${len} pair in hand — one tile or a pon secures Yakuhai.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (bestCnt === 1) {
    const lzh = label(bestZv, 'zh');
    const len = label(bestZv, 'en');
    return {
      id: 'yakuhai', nameZh: '役牌', nameEn: 'Yakuhai', nameJa: '役牌',
      han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.MEDIUM,
      zh: { needed: `再摸两张${lzh}或等待碰牌机会`, explanation: `有一张${lzh}，字牌只能碰不能吃，需要更多巡目。` },
      en: { needed: `Two more ${len} tiles (pon from another player)`, explanation: `One ${len} in hand. Honor tiles can only be ponned, not chii — harder to collect.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  return {
    id: 'yakuhai', nameZh: '役牌', nameEn: 'Yakuhai', nameJa: '役牌',
    han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.LOW,
    zh: { needed: '需要收集役牌字牌（三元牌或本场/自风）并凑成刻子', explanation: '当前手牌无役牌字牌，收集难度较大，字牌只能摸或碰。' },
    en: { needed: 'Collect a triplet of dragons or the matching wind tile', explanation: 'No value tiles in hand. Honor tiles must be drawn or ponned — slow to build.' },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeTanyao(ctx) {
  const { allTiles, isOpen, rules } = ctx;

  if (isOpen && !rules.openTanyao) {
    return {
      id: 'tanyao', nameZh: '断幺九', nameEn: 'Tanyao', nameJa: '断么九',
      han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: false,
      impossibleReason: { zh: '当前规则禁止副露断幺九（kuitan disabled）', en: 'Open tanyao (kuitan) is disabled in current rules.' },
      isYakuman: false,
    };
  }

  const badInMelds = ctx.openMelds.flat().filter(isTerminalOrHonor);
  if (badInMelds.length > 0) {
    return {
      id: 'tanyao', nameZh: '断幺九', nameEn: 'Tanyao', nameJa: '断么九',
      han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: true,
      impossibleReason: { zh: '副露中含幺九字牌，断幺九已不可能', en: 'Open melds contain terminal/honour tiles — Tanyao blocked.' },
      isYakuman: false,
    };
  }

  const bad = allTiles.filter(isTerminalOrHonor);
  if (bad.length === 0) {
    return {
      id: 'tanyao', nameZh: '断幺九', nameEn: 'Tanyao', nameJa: '断么九',
      han: { closed: 1, open: 1 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持全为2-8中张', explanation: '手牌已全为中张（2-8），断幺九路线畅通。' },
      en: { needed: 'Keep all tiles as 2–8', explanation: 'All tiles are simples (2–8) — Tanyao path is clear.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  const n = bad.length;
  const feasibility = n <= 2 ? FEASIBILITY.MEDIUM : n <= 4 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  return {
    id: 'tanyao', nameZh: '断幺九', nameEn: 'Tanyao', nameJa: '断么九',
    han: { closed: 1, open: 1 }, feasibility,
    zh: { needed: `打出${n}张幺九字牌并换成中张`, explanation: `手中有${n}张端牌/字牌，需要替换才能走断幺九路线。` },
    en: { needed: `Discard ${n} terminal/honour tile(s) and replace with simples`, explanation: `${n} terminal/honour tile(s) in hand need to be replaced for Tanyao.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeToitoi(ctx) {
  const { concealedTiles, openMelds } = ctx;
  const cg = groupTiles(concealedTiles);

  // Count confirmed triplets (open meld triplets + concealed tiles with 3+)
  let confirmedTriplets = 0;
  for (const meld of openMelds) {
    if (meld.length >= 3 && meld.every((t) => tileKey(t) === tileKey(meld[0]))) confirmedTriplets++;
  }
  for (const cnt of Object.values(cg)) {
    if (cnt >= 3) confirmedTriplets++;
  }

  // Count tiles in pairs (potential additional triplets)
  const concealedPairs = Object.values(cg).filter((c) => c === 2).length;

  // Count sequential tiles that suggest sequences (block toitoi)
  const sequentialConflicts = ['m', 'p', 's'].reduce((acc, suit) => {
    return acc + sequencesPresent(concealedTiles, suit).length;
  }, 0);

  const totalSetsNeeded = 4 - openMelds.length;
  const setsHaveOrLikely = confirmedTriplets + concealedPairs;

  if (confirmedTriplets >= totalSetsNeeded && confirmedTriplets + (Object.values(cg).filter(c => c >= 2).length) >= totalSetsNeeded + 1) {
    // Has enough triplets and a pair
    return {
      id: 'toitoi', nameZh: '对对和', nameEn: 'Toitoi', nameJa: '対々和',
      han: { closed: 2, open: 2 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '凑齐雀头和剩余刻子', explanation: '手牌刻子结构较强，对对和路线明确。' },
      en: { needed: 'Complete the pair and any remaining triplets', explanation: 'Strong triplet structure — Toitoi path is clear.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (sequentialConflicts >= 2 && setsHaveOrLikely < 3) {
    return {
      id: 'toitoi', nameZh: '对对和', nameEn: 'Toitoi', nameJa: '対々和',
      han: { closed: 2, open: 2 }, feasibility: FEASIBILITY.LOW,
      zh: { needed: '拆掉顺子结构，将手牌重组为刻子', explanation: '手中顺子较多，对对和需要大幅改造手牌。' },
      en: { needed: 'Break up sequence structure and rebuild as triplets', explanation: 'Multiple sequences in hand — reshaping for Toitoi requires major changes.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  const feasibility = setsHaveOrLikely >= totalSetsNeeded ? FEASIBILITY.MEDIUM : FEASIBILITY.LOW;
  return {
    id: 'toitoi', nameZh: '对对和', nameEn: 'Toitoi', nameJa: '対々和',
    han: { closed: 2, open: 2 }, feasibility,
    zh: { needed: '将手牌全部组成刻子', explanation: `已有${confirmedTriplets}个刻子，还需更多对子升级为刻子。` },
    en: { needed: 'Form all sets as triplets', explanation: `${confirmedTriplets} triplet(s) confirmed. Upgrade remaining pairs to triplets.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeChiitoitsu(ctx) {
  const { concealedTiles, isOpen } = ctx;

  if (isOpen) {
    return {
      id: 'chiitoitsu', nameZh: '七对子', nameEn: 'Chiitoitsu', nameJa: '七対子',
      han: { closed: 2, open: null }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: false,
      impossibleReason: { zh: '七对子只能门清，已有副露后不可能', en: 'Chiitoitsu requires a closed hand — already open.' },
      isYakuman: false,
    };
  }

  const g = groupTiles(concealedTiles);
  const pairs = Object.values(g).filter((c) => c >= 2).length;
  // Chiitoitsu needs exactly 7 unique pairs (duplicates not allowed)
  const duplicates = Object.values(g).filter((c) => c >= 4).length;

  const pairsToFind = 7 - pairs;
  let feasibility;
  if (pairs >= 7) feasibility = FEASIBILITY.HIGH;
  else if (pairs >= 6) feasibility = FEASIBILITY.HIGH;
  else if (pairs >= 5) feasibility = FEASIBILITY.MEDIUM;
  else if (pairs >= 4) feasibility = FEASIBILITY.LOW;
  else feasibility = FEASIBILITY.VERY_LOW;

  const dupNote = duplicates > 0
    ? { zh: '注意：四张相同的牌算作一对（七对子不可用重复对）。', en: 'Note: four-of-a-kind only counts as one pair for Chiitoitsu.' }
    : null;

  return {
    id: 'chiitoitsu', nameZh: '七对子', nameEn: 'Chiitoitsu', nameJa: '七対子',
    han: { closed: 2, open: null }, feasibility,
    zh: {
      needed: pairsToFind > 0 ? `还需要${pairsToFind}个对子` : '凑齐7个对子',
      explanation: `当前手中有${pairs}个对子。七对子需要7个不同的对子。${dupNote ? dupNote.zh : ''}`,
    },
    en: {
      needed: pairsToFind > 0 ? `Need ${pairsToFind} more pair(s)` : 'Complete 7 pairs',
      explanation: `${pairs} pair(s) currently. Chiitoitsu needs 7 unique pairs. ${dupNote ? dupNote.en : ''}`,
    },
    openAllowed: false, impossibleReason: null, isYakuman: false,
  };
}

function analyzePinfu(ctx) {
  const { concealedTiles, isOpen, seatWind, roundWind } = ctx;

  if (isOpen) {
    return {
      id: 'pinfu', nameZh: '平和', nameEn: 'Pinfu', nameJa: '平和',
      han: { closed: 1, open: null }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: false,
      impossibleReason: { zh: '平和只能门清', en: 'Pinfu requires a closed hand.' },
      isYakuman: false,
    };
  }

  const g = groupTiles(concealedTiles);
  // Count tiles that appear 3+ (triplets block pinfu)
  const tripletCount = Object.entries(g).filter(([, c]) => c >= 3).length;
  // Count honor tiles (can only be the pair if not a value tile, otherwise block)
  const valueTiles = [5, 6, 7, seatWind, roundWind].filter(Boolean);
  const valueTriplets = valueTiles.filter((zv) => (g['z' + zv] || 0) >= 3).length;
  const valuePairs = valueTiles.filter((zv) => (g['z' + zv] || 0) === 2).length;

  if (tripletCount >= 2 || valueTriplets > 0) {
    return {
      id: 'pinfu', nameZh: '平和', nameEn: 'Pinfu', nameJa: '平和',
      han: { closed: 1, open: null }, feasibility: FEASIBILITY.LOW,
      zh: { needed: '将刻子改为顺子结构', explanation: '手中刻子较多，平和需要全顺子构成。' },
      en: { needed: 'Convert triplets into sequences', explanation: 'Too many triplets — Pinfu requires all sequences.' },
      openAllowed: false, impossibleReason: null, isYakuman: false,
    };
  }

  // Check for sequences
  const seqCount = ['m', 'p', 's'].reduce((acc, s) => acc + sequencesPresent(concealedTiles, s).length, 0);
  // Honor tiles count (can't be in sequences)
  const honorCount = concealedTiles.filter(isHonor).length;

  if (valuePairs > 0) {
    return {
      id: 'pinfu', nameZh: '平和', nameEn: 'Pinfu', nameJa: '平和',
      han: { closed: 1, open: null }, feasibility: FEASIBILITY.MEDIUM,
      zh: { needed: '雀头不能是役牌（风牌/三元牌），需换掉对子或换其他雀头', explanation: '当前对子为役牌，平和要求雀头不能带番，需要改为普通数牌对子。' },
      en: { needed: 'Change the pair — it cannot be a value tile (dragon/wind)', explanation: 'Current pair is a value tile, which blocks Pinfu. Use a non-value pair instead.' },
      openAllowed: false, impossibleReason: null, isYakuman: false,
    };
  }

  if (honorCount > 2) {
    return {
      id: 'pinfu', nameZh: '平和', nameEn: 'Pinfu', nameJa: '平和',
      han: { closed: 1, open: null }, feasibility: FEASIBILITY.LOW,
      zh: { needed: '打出字牌，凑成全顺子结构', explanation: '手中字牌较多，字牌不能组顺子，平和路线难度较大。' },
      en: { needed: 'Discard honour tiles and form all sequences', explanation: 'Too many honour tiles — they cannot form sequences, blocking Pinfu.' },
      openAllowed: false, impossibleReason: null, isYakuman: false,
    };
  }

  const feasibility = seqCount >= 3 ? FEASIBILITY.HIGH : seqCount >= 1 ? FEASIBILITY.MEDIUM : FEASIBILITY.LOW;
  return {
    id: 'pinfu', nameZh: '平和', nameEn: 'Pinfu', nameJa: '平和',
    han: { closed: 1, open: null }, feasibility,
    zh: { needed: '所有面子为顺子，雀头非役牌，两面听牌', explanation: `当前有${seqCount}组完整顺子结构，继续保持全顺子方向即可。` },
    en: { needed: 'All sets as sequences, non-value pair, two-sided wait', explanation: `${seqCount} sequence structure(s) detected — keep building sequences for Pinfu.` },
    openAllowed: false, impossibleReason: null, isYakuman: false,
  };
}

function analyzeSanshokuDoujun(ctx) {
  const { allTiles } = ctx;

  // Find sequences in each suit across all tiles
  const mSeqs = sequencesPresent(allTiles, 'm');
  const pSeqs = sequencesPresent(allTiles, 'p');
  const sSeqs = sequencesPresent(allTiles, 's');

  // Find common starting values across all 3 suits
  const inAll3 = mSeqs.filter((v) => pSeqs.includes(v) && sSeqs.includes(v));
  const inAny2 = [...new Set([
    ...mSeqs.filter((v) => pSeqs.includes(v)),
    ...mSeqs.filter((v) => sSeqs.includes(v)),
    ...pSeqs.filter((v) => sSeqs.includes(v)),
  ])];

  if (inAll3.length > 0) {
    const v = inAll3[0];
    return {
      id: 'sanshoku_doujun', nameZh: '三色同顺', nameEn: 'Sanshoku Doujun', nameJa: '三色同順',
      han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持三种花色相同的顺子', explanation: `已有万/饼/索的${v}-${v+1}-${v+2}顺子结构，三色同顺路线明确。` },
      en: { needed: 'Keep all three matching sequences', explanation: `${v}-${v+1}-${v+2} sequence present in all three suits — Sanshoku path is clear.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (inAny2.length > 0) {
    const v = inAny2[0];
    return {
      id: 'sanshoku_doujun', nameZh: '三色同顺', nameEn: 'Sanshoku Doujun', nameJa: '三色同順',
      han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.MEDIUM,
      zh: { needed: `在第三种花色中凑出${v}-${v+1}-${v+2}的顺子`, explanation: '两种花色已有匹配顺子，还需第三种花色补全。' },
      en: { needed: `Complete ${v}-${v+1}-${v+2} sequence in the third suit`, explanation: 'Two suits already have matching sequences — one more suit needed.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  // Check if any suit has a sequence and if tiles in other suits could match
  const allSeqVals = [...new Set([...mSeqs, ...pSeqs, ...sSeqs])];
  if (allSeqVals.length > 0) {
    return {
      id: 'sanshoku_doujun', nameZh: '三色同顺', nameEn: 'Sanshoku Doujun', nameJa: '三色同順',
      han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.LOW,
      zh: { needed: '在三种花色中凑出相同数值的顺子', explanation: '仅有一种花色有顺子，三色同顺需要在三种花色中各建立一组相同顺子。' },
      en: { needed: 'Build the same sequence in all three suits', explanation: 'Only one suit has a sequence so far — need to match it across all three suits.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  return {
    id: 'sanshoku_doujun', nameZh: '三色同顺', nameEn: 'Sanshoku Doujun', nameJa: '三色同順',
    han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.VERY_LOW,
    zh: { needed: '在三种花色中各建立一组相同数值的顺子', explanation: '当前手牌没有明显的三色同顺结构，改向难度大。' },
    en: { needed: 'Build the same sequence in all three suits from scratch', explanation: 'No matching sequence structure detected — very hard to build from current hand.' },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeIttsu(ctx) {
  const { allTiles } = ctx;

  const suits = ['m', 'p', 's'];
  for (const suit of suits) {
    const seqs = sequencesPresent(allTiles, suit);
    const has123 = seqs.includes(1);
    const has456 = seqs.includes(4);
    const has789 = seqs.includes(7);
    const count = [has123, has456, has789].filter(Boolean).length;

    if (count === 3) {
      const names = { m: '万子', p: '饼子', s: '索子' };
      return {
        id: 'ittsu', nameZh: '一气通贯', nameEn: 'Ittsu', nameJa: '一気通貫',
        han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.HIGH,
        zh: { needed: '', explanation: `${names[suit]}已有123/456/789三组顺子，一气通贯路线明确。` },
        en: { needed: '', explanation: `123/456/789 sequences in ${suit} suit confirmed — Ittsu path clear.` },
        openAllowed: true, impossibleReason: null, isYakuman: false,
      };
    }

    if (count === 2) {
      const missingSeqs = [
        !has123 ? '1-2-3' : null,
        !has456 ? '4-5-6' : null,
        !has789 ? '7-8-9' : null,
      ].filter(Boolean);
      return {
        id: 'ittsu', nameZh: '一气通贯', nameEn: 'Ittsu', nameJa: '一気通貫',
        han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.MEDIUM,
        zh: { needed: `在同花色中凑出${missingSeqs.join('/')}顺子`, explanation: `同花色已有两组顺子，还需补齐最后一组。` },
        en: { needed: `Complete ${missingSeqs.join('/')} in the same suit`, explanation: 'Two of the three sequences present — complete the last one for Ittsu.' },
        openAllowed: true, impossibleReason: null, isYakuman: false,
      };
    }

    if (count === 1) {
      return {
        id: 'ittsu', nameZh: '一气通贯', nameEn: 'Ittsu', nameJa: '一気通貫',
        han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.LOW,
        zh: { needed: '在同一花色中凑齐1-2-3、4-5-6、7-8-9三组顺子', explanation: '已有一组顺子，还需在同花色中再建两组。' },
        en: { needed: 'Complete all three sequences (1-2-3, 4-5-6, 7-8-9) in one suit', explanation: 'One sequence found — need two more in the same suit for Ittsu.' },
        openAllowed: true, impossibleReason: null, isYakuman: false,
      };
    }
  }

  return {
    id: 'ittsu', nameZh: '一气通贯', nameEn: 'Ittsu', nameJa: '一気通貫',
    han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.VERY_LOW,
    zh: { needed: '在同一花色中凑齐1-9全段三组顺子', explanation: '当前无明显的一气通贯结构，需要大量同花色数牌。' },
    en: { needed: 'Build 1-2-3, 4-5-6, 7-8-9 all in one suit', explanation: 'No Ittsu structure detected — requires many tiles from a single suit.' },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeHonitsu(ctx) {
  const { allTiles } = ctx;

  const sc = suitCounts(allTiles);
  const sp = suitsPresent(allTiles);
  const honorCount = sc.z;

  if (sp.length === 0 && honorCount > 0) {
    return {
      id: 'honitsu', nameZh: '混一色', nameEn: 'Honitsu', nameJa: '混一色',
      han: { closed: 3, open: 2 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持只有一种花色+字牌', explanation: '当前手牌全为字牌，添加数牌后即构成混一色基础。' },
      en: { needed: 'Keep to one suit + honours', explanation: 'All honour tiles now — add one suit of number tiles to build Honitsu.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (sp.length === 1) {
    const dominantSuit = sp[0];
    const names = { m: '万子', p: '饼子', s: '索子' };
    return {
      id: 'honitsu', nameZh: '混一色', nameEn: 'Honitsu', nameJa: '混一色',
      han: { closed: 3, open: 2 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: `保持只用${names[dominantSuit]}和字牌`, explanation: `手牌已只有${names[dominantSuit]}+字牌，混一色路线畅通。` },
      en: { needed: `Keep only ${dominantSuit}-suit and honour tiles`, explanation: `Only ${dominantSuit}-suit + honours in hand — Honitsu path is clear.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  // Multiple suits present
  const suitTotals = sp.map((s) => ({ suit: s, count: sc[s] })).sort((a, b) => b.count - a.count);
  const dominant = suitTotals[0];
  const offSuitCount = allTiles.filter((t) => t.suit !== 'z' && t.suit !== dominant.suit).length;

  const feasibility = offSuitCount <= 2 ? FEASIBILITY.MEDIUM : offSuitCount <= 4 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  const names = { m: '万子', p: '饼子', s: '索子' };
  return {
    id: 'honitsu', nameZh: '混一色', nameEn: 'Honitsu', nameJa: '混一色',
    han: { closed: 3, open: 2 }, feasibility,
    zh: { needed: `打出${offSuitCount}张非${names[dominant.suit]}的数牌`, explanation: `主攻${names[dominant.suit]}+字牌路线，还有${offSuitCount}张多余花色需要处理。` },
    en: { needed: `Discard ${offSuitCount} tile(s) from other suits`, explanation: `${offSuitCount} off-suit tile(s) need to be cleared for Honitsu.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeChinitsu(ctx) {
  const { allTiles } = ctx;

  const sc = suitCounts(allTiles);
  const sp = suitsPresent(allTiles);

  if (sp.length === 1 && sc.z === 0) {
    const names = { m: '万子', p: '饼子', s: '索子' };
    return {
      id: 'chinitsu', nameZh: '清一色', nameEn: 'Chinitsu', nameJa: '清一色',
      han: { closed: 6, open: 5 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: `保持全${names[sp[0]]}`, explanation: `手牌已全为${names[sp[0]]}，清一色路线明确。` },
      en: { needed: `Keep all ${sp[0]}-suit tiles`, explanation: `All tiles are ${sp[0]}-suit — Chinitsu path is clear.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  const dominant = sp.length > 0
    ? sp.reduce((a, b) => sc[a] > sc[b] ? a : b)
    : null;
  if (!dominant) {
    return {
      id: 'chinitsu', nameZh: '清一色', nameEn: 'Chinitsu', nameJa: '清一色',
      han: { closed: 6, open: 5 }, feasibility: FEASIBILITY.LOW,
      zh: { needed: '选定一种花色并将手牌全换成该花色', explanation: '手牌均为字牌，需要引入并专注一种数牌花色。' },
      en: { needed: 'Choose one suit and replace all tiles', explanation: 'No suit dominant yet — need to commit to one suit for Chinitsu.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  const offCount = allTiles.filter((t) => t.suit !== dominant).length;
  const feasibility = offCount <= 2 ? FEASIBILITY.MEDIUM : offCount <= 5 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  const names = { m: '万子', p: '饼子', s: '索子' };
  return {
    id: 'chinitsu', nameZh: '清一色', nameEn: 'Chinitsu', nameJa: '清一色',
    han: { closed: 6, open: 5 }, feasibility,
    zh: { needed: `打出${offCount}张非${names[dominant]}的牌`, explanation: `主攻${names[dominant]}路线，还有${offCount}张其他牌需处理。清一色需大量同花色牌。` },
    en: { needed: `Discard ${offCount} off-suit tile(s)`, explanation: `${offCount} non-${dominant} tile(s) need clearing. Chinitsu needs a large number of same-suit tiles.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeShousangen(ctx) {
  const { concealedTiles, openMelds, allTiles } = ctx;
  const dragons = [5, 6, 7];

  let tripletCount = 0;
  let pairCount = 0;

  for (const dv of dragons) {
    const total = countTotal(concealedTiles, openMelds, 'z', dv);
    if (total >= 3) tripletCount++;
    else if (total === 2) pairCount++;
  }

  if (tripletCount >= 2 && (tripletCount >= 3 || pairCount >= 1)) {
    return {
      id: 'shousangen', nameZh: '小三元', nameEn: 'Shousangen', nameJa: '小三元',
      han: { closed: 4, open: 4 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持两个三元刻子和一个三元雀头', explanation: '已有两个三元牌刻子，小三元路线非常明确。' },
      en: { needed: 'Maintain two dragon triplets and one dragon pair', explanation: 'Two dragon triplets confirmed — Shousangen is very close.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (tripletCount >= 1 && pairCount >= 1) {
    const dragonTotal = allTiles.filter(isDragon).length;
    return {
      id: 'shousangen', nameZh: '小三元', nameEn: 'Shousangen', nameJa: '小三元',
      han: { closed: 4, open: 4 }, feasibility: FEASIBILITY.MEDIUM,
      zh: { needed: '再凑一个三元刻子（共需两个三元刻子+一个三元对子）', explanation: `已有1个三元刻子和1个对子，共${dragonTotal}张三元牌，还差1个刻子。` },
      en: { needed: 'Complete one more dragon triplet', explanation: `1 triplet and 1 pair of dragons — ${dragonTotal} total. One more triplet needed.` },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  const dragonTotal = allTiles.filter(isDragon).length;
  const feasibility = dragonTotal >= 5 ? FEASIBILITY.LOW : dragonTotal >= 3 ? FEASIBILITY.VERY_LOW : FEASIBILITY.IMPOSSIBLE;

  if (feasibility === FEASIBILITY.IMPOSSIBLE) {
    return {
      id: 'shousangen', nameZh: '小三元', nameEn: 'Shousangen', nameJa: '小三元',
      han: { closed: 4, open: 4 }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: true,
      impossibleReason: { zh: '三元牌数量过少，无法凑成小三元', en: 'Too few dragon tiles to build Shousangen.' },
      isYakuman: false,
    };
  }

  return {
    id: 'shousangen', nameZh: '小三元', nameEn: 'Shousangen', nameJa: '小三元',
    han: { closed: 4, open: 4 }, feasibility,
    zh: { needed: '收集三元牌凑成两个刻子+一个对子（共8张）', explanation: `当前共有${dragonTotal}张三元牌，小三元需要大量三元牌。` },
    en: { needed: 'Collect dragon tiles: two triplets + one pair (8 total)', explanation: `${dragonTotal} dragon tile(s) in hand. Shousangen needs 8 dragon tiles total.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeChanta(ctx) {
  const { allTiles, openMelds, concealedTiles, isOpen } = ctx;

  // Check each open meld for terminal/honor
  const meldsMissingTerminal = openMelds.filter(
    (meld) => !meld.some(isTerminalOrHonor)
  ).length;

  if (meldsMissingTerminal > 0) {
    return {
      id: 'chanta', nameZh: '混全带幺九', nameEn: 'Chanta', nameJa: '混全帯么九',
      han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: true,
      impossibleReason: { zh: '副露中有面子不含幺九字牌，混全带幺九已不可能', en: 'Open meld without terminal/honour — Chanta blocked.' },
      isYakuman: false,
    };
  }

  // Must also have at least one sequence (not all triplets)
  const hasSequence = openMelds.some(meldIsSequence) ||
    ['m', 'p', 's'].some((s) => sequencesPresent(concealedTiles, s).length > 0);

  if (!hasSequence && isOpen) {
    return {
      id: 'chanta', nameZh: '混全带幺九', nameEn: 'Chanta', nameJa: '混全帯么九',
      han: { closed: 2, open: 1 }, feasibility: FEASIBILITY.LOW,
      zh: { needed: '需要至少一组含端牌的顺子', explanation: '混全带幺九需要至少有一组顺子（不能全刻子），否则变为对对和。' },
      en: { needed: 'Need at least one sequence containing a terminal', explanation: 'Chanta requires at least one sequence — otherwise it becomes Toitoi.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  const internalTiles = allTiles.filter((t) => !isTerminalOrHonor(t));
  const feasibility = internalTiles.length === 0 ? FEASIBILITY.HIGH :
    internalTiles.length <= 3 ? FEASIBILITY.MEDIUM : FEASIBILITY.LOW;

  return {
    id: 'chanta', nameZh: '混全带幺九', nameEn: 'Chanta', nameJa: '混全帯么九',
    han: { closed: 2, open: 1 }, feasibility,
    zh: { needed: '每组面子都含有幺九或字牌', explanation: `${internalTiles.length === 0 ? '所有面子已含端牌/字牌，' : `还有${internalTiles.length}张非端牌需处理，`}注意还需保留至少一组顺子。` },
    en: { needed: 'Every set must contain a terminal or honour tile', explanation: `${internalTiles.length === 0 ? 'All sets contain terminals/honours.' : `${internalTiles.length} non-terminal tile(s) need to be replaced.`} Keep at least one sequence.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeJunchan(ctx) {
  const { allTiles, openMelds } = ctx;

  // Junchan: all sets contain terminal (not honor), at least one sequence
  const meldWithHonorOnly = openMelds.filter(
    (meld) => meld.every(isHonor)
  ).length;

  if (meldWithHonorOnly > 0) {
    return {
      id: 'junchan', nameZh: '纯全带幺九', nameEn: 'Junchan', nameJa: '純全帯么九',
      han: { closed: 3, open: 2 }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: true,
      impossibleReason: { zh: '副露有纯字牌面子，纯全带幺九要求每组含端牌（非字）', en: 'Open meld of only honour tiles — Junchan requires terminals (not honours) in every set.' },
      isYakuman: false,
    };
  }

  const meldsMissingTerminal = openMelds.filter(
    (meld) => !meld.some(isTerminal)
  ).length;

  if (meldsMissingTerminal > 0) {
    return {
      id: 'junchan', nameZh: '纯全带幺九', nameEn: 'Junchan', nameJa: '純全帯么九',
      han: { closed: 3, open: 2 }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: true,
      impossibleReason: { zh: '副露中有面子不含端牌（1或9），纯全带幺九已不可能', en: 'Open meld without terminal (1 or 9) — Junchan blocked.' },
      isYakuman: false,
    };
  }

  const nonTerminalTiles = allTiles.filter((t) => !isTerminal(t) && !isHonor(t));
  const honorCount = allTiles.filter(isHonor).length;

  const feasibility =
    nonTerminalTiles.length === 0 && honorCount === 0 ? FEASIBILITY.HIGH :
    nonTerminalTiles.length <= 2 ? FEASIBILITY.MEDIUM : FEASIBILITY.LOW;

  return {
    id: 'junchan', nameZh: '纯全带幺九', nameEn: 'Junchan', nameJa: '純全帯么九',
    han: { closed: 3, open: 2 }, feasibility,
    zh: { needed: '每组面子含端牌（1或9，非字牌），且至少一组顺子', explanation: `纯全带幺九比混全带幺九更严格，字牌不计入。当前还有${nonTerminalTiles.length}张中张和${honorCount}张字牌需处理。` },
    en: { needed: 'Every set contains terminal (1 or 9, not honour), with at least one sequence', explanation: `Junchan is stricter than Chanta — honours don't count. ${nonTerminalTiles.length} middle tile(s) and ${honorCount} honour(s) need replacing.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeSanankou(ctx) {
  const { concealedTiles } = ctx;

  const cg = groupTiles(concealedTiles);
  const concealedTriplets = Object.values(cg).filter((c) => c >= 3).length;
  const concealedPairs = Object.values(cg).filter((c) => c === 2).length;

  if (concealedTriplets >= 3) {
    return {
      id: 'sanankou', nameZh: '三暗刻', nameEn: 'Sanankou', nameJa: '三暗刻',
      han: { closed: 2, open: 2 }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持三个暗刻结构', explanation: '手中已有三个暗刻，三暗刻路线明确（需摸切和牌）。' },
      en: { needed: 'Maintain three concealed triplets', explanation: '3 concealed triplets confirmed — Sanankou path is clear (win by tsumo for full effect).' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  if (concealedTriplets === 2 && concealedPairs >= 1) {
    return {
      id: 'sanankou', nameZh: '三暗刻', nameEn: 'Sanankou', nameJa: '三暗刻',
      han: { closed: 2, open: 2 }, feasibility: FEASIBILITY.MEDIUM,
      zh: { needed: '把一个对子升级为暗刻', explanation: '已有两个暗刻，再摸到一张配对即可凑成第三个暗刻。' },
      en: { needed: 'Upgrade one pair to a triplet', explanation: 'Two concealed triplets found — one more draw to complete the third.' },
      openAllowed: true, impossibleReason: null, isYakuman: false,
    };
  }

  return {
    id: 'sanankou', nameZh: '三暗刻', nameEn: 'Sanankou', nameJa: '三暗刻',
    han: { closed: 2, open: 2 }, feasibility: concealedTriplets >= 1 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW,
    zh: { needed: '在暗手中凑成三个刻子', explanation: `当前手中只有${concealedTriplets}个暗刻，三暗刻需要较多对子/刻子。` },
    en: { needed: 'Form three concealed triplets', explanation: `Only ${concealedTriplets} concealed triplet(s) so far — need more pairs to convert.` },
    openAllowed: true, impossibleReason: null, isYakuman: false,
  };
}

function analyzeIipeikou(ctx) {
  const { concealedTiles, isOpen } = ctx;

  if (isOpen) {
    return {
      id: 'iipeikou', nameZh: '一杯口', nameEn: 'Iipeikou', nameJa: '一盃口',
      han: { closed: 1, open: null }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: false,
      impossibleReason: { zh: '一杯口只能门清', en: 'Iipeikou requires a closed hand.' },
      isYakuman: false,
    };
  }

  // Look for two identical sequences
  // Simplified check: count tiles that appear as pairs (suggesting two copies of same sequence)
  const g = groupTiles(concealedTiles);
  const doublePairs = Object.entries(g).filter(([, c]) => c >= 2);

  // Check for sets of 4 consecutive tiles (suggests two overlapping sequences)
  let identicalSeqScore = 0;
  for (const suit of ['m', 'p', 's']) {
    for (let v = 1; v <= 7; v++) {
      const k1 = suit + v, k2 = suit + (v + 1), k3 = suit + (v + 2);
      if ((g[k1] || 0) >= 2 && (g[k2] || 0) >= 2 && (g[k3] || 0) >= 2) {
        identicalSeqScore += 3;
      }
    }
  }

  if (identicalSeqScore >= 3) {
    return {
      id: 'iipeikou', nameZh: '一杯口', nameEn: 'Iipeikou', nameJa: '一盃口',
      han: { closed: 1, open: null }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持两组相同的顺子', explanation: '手中有两组相同顺子的基础，一杯口路线明确。' },
      en: { needed: 'Keep two identical sequences', explanation: 'Tile structure suggests two identical sequences — Iipeikou path clear.' },
      openAllowed: false, impossibleReason: null, isYakuman: false,
    };
  }

  const feasibility = doublePairs.length >= 3 ? FEASIBILITY.MEDIUM :
    doublePairs.length >= 1 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;

  return {
    id: 'iipeikou', nameZh: '一杯口', nameEn: 'Iipeikou', nameJa: '一盃口',
    han: { closed: 1, open: null }, feasibility,
    zh: { needed: '收集两组完全相同的顺子（需门清）', explanation: '一杯口需要两组完全一样的顺子，且必须门清，难度较高。' },
    en: { needed: 'Collect two identical sequences (closed hand only)', explanation: 'Iipeikou needs two completely identical sequences while keeping the hand closed.' },
    openAllowed: false, impossibleReason: null, isYakuman: false,
  };
}

// ── YAKUMAN (recognition only) ────────────────────────────────────────────────

function analyzeKokushi(ctx) {
  const { allTiles } = ctx;
  const required = [
    { suit: 'm', value: 1 }, { suit: 'm', value: 9 },
    { suit: 'p', value: 1 }, { suit: 'p', value: 9 },
    { suit: 's', value: 1 }, { suit: 's', value: 9 },
    { suit: 'z', value: 1 }, { suit: 'z', value: 2 }, { suit: 'z', value: 3 },
    { suit: 'z', value: 4 }, { suit: 'z', value: 5 }, { suit: 'z', value: 6 }, { suit: 'z', value: 7 },
  ];

  const g = groupTiles(allTiles);
  const haveCount = required.filter((t) => (g[tileKey(t)] || 0) >= 1).length;
  const hasDuplicate = required.some((t) => (g[tileKey(t)] || 0) >= 2);

  if (haveCount >= 13 && hasDuplicate) {
    return {
      id: 'kokushi', nameZh: '国士无双', nameEn: 'Kokushi Musou', nameJa: '国士無双',
      han: { closed: 'yakuman', open: null }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持结构不变，等待和牌', explanation: '13张幺九字牌齐全且有重复，国士无双待和！' },
      en: { needed: 'Wait for the winning tile', explanation: 'All 13 terminal/honour types present with a duplicate — Kokushi ready!' },
      openAllowed: false, impossibleReason: null, isYakuman: true,
    };
  }

  const feasibility = haveCount >= 11 ? FEASIBILITY.MEDIUM :
    haveCount >= 8 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;

  return {
    id: 'kokushi', nameZh: '国士无双', nameEn: 'Kokushi Musou', nameJa: '国士無双',
    han: { closed: 'yakuman', open: null }, feasibility,
    zh: { needed: `收集所有13种幺九字牌（目前${haveCount}/13）`, explanation: `国士无双需要万/饼/索的1和9以及全部七种字牌各一张再加一张重复牌。` },
    en: { needed: `Collect all 13 terminal/honour types (${haveCount}/13 present)`, explanation: 'Kokushi needs one of each: 1m 9m 1p 9p 1s 9s plus all 7 honours, plus one duplicate.' },
    openAllowed: false, impossibleReason: null, isYakuman: true,
  };
}

function analyzeDaisangen(ctx) {
  const { concealedTiles, openMelds } = ctx;
  const dragons = [5, 6, 7];
  const triplets = dragons.filter((dv) => countTotal(concealedTiles, openMelds, 'z', dv) >= 3).length;
  const total = dragons.reduce((acc, dv) => acc + countTotal(concealedTiles, openMelds, 'z', dv), 0);

  if (triplets >= 3) {
    return {
      id: 'daisangen', nameZh: '大三元', nameEn: 'Daisangen', nameJa: '大三元',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持三个三元刻子', explanation: '三种三元牌各有3张，大三元待和！' },
      en: { needed: 'Maintain all three dragon triplets', explanation: 'All three dragon triplets confirmed — Daisangen is ready!' },
      openAllowed: true, impossibleReason: null, isYakuman: true,
    };
  }

  const feasibility = triplets === 2 ? FEASIBILITY.MEDIUM :
    total >= 5 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;

  return {
    id: 'daisangen', nameZh: '大三元', nameEn: 'Daisangen', nameJa: '大三元',
    han: { closed: 'yakuman', open: 'yakuman' }, feasibility,
    zh: { needed: `三种三元牌各凑3张（共9张，目前${total}张）`, explanation: '大三元极难，需要白/发/中各3张。' },
    en: { needed: `Three triplets of all three dragons (need 9, have ${total})`, explanation: 'Daisangen is very rare — needs 3 of each dragon tile (White, Green, Red).' },
    openAllowed: true, impossibleReason: null, isYakuman: true,
  };
}

function analyzeSuuankou(ctx) {
  const { concealedTiles, isOpen } = ctx;

  if (isOpen) {
    return {
      id: 'suuankou', nameZh: '四暗刻', nameEn: 'Suuankou', nameJa: '四暗刻',
      han: { closed: 'yakuman', open: null }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: false,
      impossibleReason: { zh: '四暗刻只能门清', en: 'Suuankou requires a fully concealed hand.' },
      isYakuman: true,
    };
  }

  const cg = groupTiles(concealedTiles);
  const triplets = Object.values(cg).filter((c) => c >= 3).length;

  if (triplets >= 4) {
    return {
      id: 'suuankou', nameZh: '四暗刻', nameEn: 'Suuankou', nameJa: '四暗刻',
      han: { closed: 'yakuman', open: null }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持四个暗刻结构，等待雀头', explanation: '已有四个暗刻！四暗刻是门清役满，极为罕见。' },
      en: { needed: 'Keep four concealed triplets and complete the pair', explanation: 'Four concealed triplets in hand — Suuankou is ready!' },
      openAllowed: false, impossibleReason: null, isYakuman: true,
    };
  }

  const feasibility = triplets >= 3 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  return {
    id: 'suuankou', nameZh: '四暗刻', nameEn: 'Suuankou', nameJa: '四暗刻',
    han: { closed: 'yakuman', open: null }, feasibility,
    zh: { needed: `手牌全部凑成暗刻（目前${triplets}个暗刻）`, explanation: '四暗刻需要四组暗刻，是最难达成的役满之一。' },
    en: { needed: `Form four concealed triplets (${triplets} currently)`, explanation: 'Suuankou needs four concealed triplets — one of the rarest yakuman.' },
    openAllowed: false, impossibleReason: null, isYakuman: true,
  };
}

function analyzeTsuuiisou(ctx) {
  const { allTiles } = ctx;
  const nonHonor = allTiles.filter((t) => !isHonor(t)).length;
  const total = allTiles.length;

  if (nonHonor === 0 && total > 0) {
    return {
      id: 'tsuuiisou', nameZh: '字一色', nameEn: 'Tsuuiisou', nameJa: '字一色',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持全字牌结构', explanation: '手牌已全为字牌，字一色路线确立！' },
      en: { needed: 'Keep all honour tiles', explanation: 'All tiles are honours — Tsuuiisou is confirmed!' },
      openAllowed: true, impossibleReason: null, isYakuman: true,
    };
  }

  const feasibility = nonHonor <= 3 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  return {
    id: 'tsuuiisou', nameZh: '字一色', nameEn: 'Tsuuiisou', nameJa: '字一色',
    han: { closed: 'yakuman', open: 'yakuman' }, feasibility,
    zh: { needed: `打出所有数牌（还有${nonHonor}张）`, explanation: '字一色需要全部14张均为字牌，极为罕见。' },
    en: { needed: `Discard all number tiles (${nonHonor} remaining)`, explanation: 'Tsuuiisou needs all 14 tiles to be honour tiles — extremely rare.' },
    openAllowed: true, impossibleReason: null, isYakuman: true,
  };
}

function analyzeShousuushii(ctx) {
  const { concealedTiles, openMelds } = ctx;
  const winds = [1, 2, 3, 4];
  const triplets = winds.filter((wv) => countTotal(concealedTiles, openMelds, 'z', wv) >= 3).length;
  const pairs = winds.filter((wv) => countTotal(concealedTiles, openMelds, 'z', wv) === 2).length;
  const total = winds.reduce((acc, wv) => acc + countTotal(concealedTiles, openMelds, 'z', wv), 0);

  if (triplets >= 3 && (triplets >= 4 || pairs >= 1)) {
    const feasibility = triplets >= 4 ? FEASIBILITY.HIGH : FEASIBILITY.HIGH;
    return {
      id: 'shousuushii', nameZh: '小四喜', nameEn: 'Shousuushii', nameJa: '小四喜',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility,
      zh: { needed: '三个风刻子+一个风对子', explanation: '小四喜结构完善，役满路线确立！' },
      en: { needed: 'Three wind triplets + one wind pair', explanation: 'Strong wind tile structure — Shousuushii is close!' },
      openAllowed: true, impossibleReason: null, isYakuman: true,
    };
  }

  const feasibility = triplets >= 2 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  return {
    id: 'shousuushii', nameZh: '小四喜', nameEn: 'Shousuushii', nameJa: '小四喜',
    han: { closed: 'yakuman', open: 'yakuman' }, feasibility,
    zh: { needed: `收集四种风牌各至少2-3张（目前${total}张风牌）`, explanation: '小四喜需要三个风牌刻子+一个风牌雀头，共11张风牌。' },
    en: { needed: `Collect enough wind tiles — ${total} of 11 needed`, explanation: 'Shousuushii needs three wind triplets + one wind pair (11 wind tiles total).' },
    openAllowed: true, impossibleReason: null, isYakuman: true,
  };
}

function analyzeDaisuushii(ctx) {
  const { concealedTiles, openMelds } = ctx;
  const winds = [1, 2, 3, 4];
  const triplets = winds.filter((wv) => countTotal(concealedTiles, openMelds, 'z', wv) >= 3).length;
  const total = winds.reduce((acc, wv) => acc + countTotal(concealedTiles, openMelds, 'z', wv), 0);

  if (triplets >= 4) {
    return {
      id: 'daisuushii', nameZh: '大四喜', nameEn: 'Daisuushii', nameJa: '大四喜',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持四种风牌刻子', explanation: '四种风牌各有刻子，大四喜！极为罕见的役满。' },
      en: { needed: 'Maintain all four wind triplets', explanation: 'All four wind triplets confirmed — Daisuushii!' },
      openAllowed: true, impossibleReason: null, isYakuman: true,
    };
  }

  return {
    id: 'daisuushii', nameZh: '大四喜', nameEn: 'Daisuushii', nameJa: '大四喜',
    han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.VERY_LOW,
    zh: { needed: `四种风牌各凑3张（目前${total}张，${triplets}个刻子）`, explanation: '大四喜需要东南西北各3张（共12张风牌），是极为罕见的役满。' },
    en: { needed: `Four wind triplets (have ${triplets} of 4, ${total} wind tiles)`, explanation: 'Daisuushii needs 12 wind tiles (triplets of all four winds) — exceptionally rare.' },
    openAllowed: true, impossibleReason: null, isYakuman: true,
  };
}

function analyzeChinroutou(ctx) {
  const { allTiles } = ctx;
  const nonTerminal = allTiles.filter((t) => !isTerminal(t)).length;

  if (nonTerminal === 0 && allTiles.length > 0) {
    return {
      id: 'chinroutou', nameZh: '清老头', nameEn: 'Chinroutou', nameJa: '清老頭',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持全端牌结构', explanation: '手牌已全为端牌（1和9），清老头！' },
      en: { needed: 'Keep all terminal tiles', explanation: 'All tiles are terminals (1s and 9s) — Chinroutou!' },
      openAllowed: true, impossibleReason: null, isYakuman: true,
    };
  }

  const feasibility = nonTerminal <= 3 ? FEASIBILITY.VERY_LOW : FEASIBILITY.IMPOSSIBLE;

  if (feasibility === FEASIBILITY.IMPOSSIBLE) {
    return {
      id: 'chinroutou', nameZh: '清老头', nameEn: 'Chinroutou', nameJa: '清老頭',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.IMPOSSIBLE,
      zh: { needed: '', explanation: '' },
      en: { needed: '', explanation: '' },
      openAllowed: true,
      impossibleReason: { zh: '手牌中有太多非端牌，清老头不现实', en: 'Too many non-terminal tiles — Chinroutou is not realistic.' },
      isYakuman: true,
    };
  }

  return {
    id: 'chinroutou', nameZh: '清老头', nameEn: 'Chinroutou', nameJa: '清老頭',
    han: { closed: 'yakuman', open: 'yakuman' }, feasibility,
    zh: { needed: `将所有牌换成端牌1和9（还有${nonTerminal}张非端牌）`, explanation: '清老头需要全部为1和9，是极为罕见的役满。' },
    en: { needed: `Replace ${nonTerminal} non-terminal tile(s) with 1s and 9s`, explanation: 'Chinroutou needs all tiles to be terminals (1 and 9 only) — extremely rare.' },
    openAllowed: true, impossibleReason: null, isYakuman: true,
  };
}

function analyzeRyuuiisou(ctx) {
  const { allTiles } = ctx;
  const nonGreen = allTiles.filter((t) => !isGreen(t)).length;

  if (nonGreen === 0 && allTiles.length > 0) {
    return {
      id: 'ryuuiisou', nameZh: '绿一色', nameEn: 'Ryuuiisou', nameJa: '緑一色',
      han: { closed: 'yakuman', open: 'yakuman' }, feasibility: FEASIBILITY.HIGH,
      zh: { needed: '保持全绿色牌', explanation: '手牌已全为绿色牌（2/3/4/6/8索+发），绿一色！' },
      en: { needed: 'Keep all green tiles', explanation: 'All tiles are green (2/3/4/6/8 sou + Green Dragon) — Ryuuiisou!' },
      openAllowed: true, impossibleReason: null, isYakuman: true,
    };
  }

  const greenTileCount = allTiles.filter(isGreen).length;
  const feasibility = nonGreen <= 3 ? FEASIBILITY.LOW : FEASIBILITY.VERY_LOW;
  return {
    id: 'ryuuiisou', nameZh: '绿一色', nameEn: 'Ryuuiisou', nameJa: '緑一色',
    han: { closed: 'yakuman', open: 'yakuman' }, feasibility,
    zh: { needed: `将手牌全换成绿色牌（目前${greenTileCount}张绿色牌）`, explanation: '绿一色需要2/3/4/6/8索及发（绿中），全为绿色。' },
    en: { needed: `Replace ${nonGreen} non-green tile(s) (${greenTileCount} green tiles now)`, explanation: 'Ryuuiisou needs all tiles to be green: 2/3/4/6/8 sou and the Green Dragon.' },
    openAllowed: true, impossibleReason: null, isYakuman: true,
  };
}

function analyzeChuuren(ctx) {
  const { allTiles } = ctx;
  const sc = suitCounts(allTiles);
  const sp = suitsPresent(allTiles);

  for (const suit of ['m', 'p', 's']) {
    if (sp.length === 1 && sp[0] === suit && sc.z === 0) {
      const g = groupTiles(allTiles.filter((t) => t.suit === suit));
      // Check min requirements: at least 3×1, 1×2-8, 3×9
      const has1s = (g[suit + 1] || 0) >= 3;
      const has9s = (g[suit + 9] || 0) >= 3;
      const has2to8 = [2, 3, 4, 5, 6, 7, 8].every((v) => (g[suit + v] || 0) >= 1);
      if (has1s && has9s && has2to8) {
        return {
          id: 'chuuren', nameZh: '九莲宝灯', nameEn: 'Chuuren Poutou', nameJa: '九蓮宝燈',
          han: { closed: 'yakuman', open: null }, feasibility: FEASIBILITY.HIGH,
          zh: { needed: '保持九莲结构，等待和牌', explanation: '九莲宝灯结构完整，等待九面待！' },
          en: { needed: 'Maintain the Chuuren structure and win', explanation: 'Chuuren Poutou structure confirmed — nine-way wait!' },
          openAllowed: false, impossibleReason: null, isYakuman: true,
        };
      }

      return {
        id: 'chuuren', nameZh: '九莲宝灯', nameEn: 'Chuuren Poutou', nameJa: '九蓮宝燈',
        han: { closed: 'yakuman', open: null }, feasibility: FEASIBILITY.LOW,
        zh: { needed: `凑齐同花色1112345678999结构（目前还缺少部分）`, explanation: '九莲宝灯需要同一花色的1,1,1,2,3,4,5,6,7,8,9,9,9+1张，极为罕见。' },
        en: { needed: 'Complete 1112345678999 in one suit + one extra tile', explanation: 'Chuuren needs 1112345678999 all in one suit — an exceptionally rare yakuman.' },
        openAllowed: false, impossibleReason: null, isYakuman: true,
      };
    }
  }

  return {
    id: 'chuuren', nameZh: '九莲宝灯', nameEn: 'Chuuren Poutou', nameJa: '九蓮宝燈',
    han: { closed: 'yakuman', open: null }, feasibility: FEASIBILITY.VERY_LOW,
    zh: { needed: '专注一种数牌花色，凑成1112345678999', explanation: '九莲宝灯需要全部为同一花色数牌，当前手牌多花色/字牌，难度极高。' },
    en: { needed: 'Focus on one suit and build 1112345678999', explanation: 'Hand has multiple suits or honours — Chuuren requires all tiles in one number suit.' },
    openAllowed: false, impossibleReason: null, isYakuman: true,
  };
}

// ── RISK ANALYSIS ─────────────────────────────────────────────────────────────

function buildWarnings(concealedTiles, openMelds, routes, rules, validation) {
  const warnings = [];
  const isOpen = openMelds.length > 0;

  const confirmedRoutes = routes.filter((r) => r.feasibility === FEASIBILITY.CONFIRMED);
  const confirmedHan = confirmedRoutes.reduce((acc, r) => {
    const h = isOpen ? r.han.open : r.han.closed;
    return typeof h === 'number' ? acc + h : acc;
  }, 0);

  // Open hand with no confirmed yaku
  if (isOpen && confirmedRoutes.length === 0) {
    warnings.push({
      id: 'open_no_yaku',
      severity: 'error',
      zh: { title: '⚠️ 副露无役风险', body: '手牌已有副露，但目前没有任何确定役种。如果继续和牌将无法获胜（无役）。建议立刻检查役种方向。' },
      en: { title: '⚠️ Open Hand — No Confirmed Yaku', body: 'The hand is open but no yaku is confirmed yet. Winning without a yaku results in a chombo. Check your yaku direction immediately.' },
    });
  }

  // Two-han minimum not met
  if (rules.twoHanMin && confirmedHan < 2 && confirmedHan > 0) {
    warnings.push({
      id: 'two_han_min',
      severity: 'warning',
      zh: { title: '注意：未达到两番起和', body: `当前确定役只有${confirmedHan}番，规则要求起和两番，手牌可能还不能和牌。` },
      en: { title: 'Two-han minimum not met', body: `Confirmed yaku is only ${confirmedHan} han, but the rule requires 2 han minimum to win.` },
    });
  }

  // Closed-only yaku impossible because open
  const closedOnlyBlocked = routes.filter(
    (r) => r.feasibility === FEASIBILITY.IMPOSSIBLE && !r.openAllowed && isOpen
  );
  if (closedOnlyBlocked.length > 0) {
    const names = closedOnlyBlocked.map((r) => r.nameZh).join('、');
    const namesEn = closedOnlyBlocked.map((r) => r.nameEn).join(', ');
    warnings.push({
      id: 'closed_only_blocked',
      severity: 'info',
      zh: { title: '门清役不可用', body: `因为已有副露，以下门清役已不可能：${names}。` },
      en: { title: 'Closed-hand yaku unavailable', body: `Because the hand is open, the following closed-only yaku are blocked: ${namesEn}.` },
    });
  }

  // Tile count issues
  if (validation.errors.includes('tile_count_low')) {
    warnings.push({
      id: 'tile_count',
      severity: 'warning',
      zh: { title: '牌张数不足', body: `当前手牌${validation.concealedCount}张，${validation.numMelds}个副露应有${validation.expectedWaiting}-${validation.expectedComplete}张暗手。` },
      en: { title: 'Too few tiles', body: `Hand has ${validation.concealedCount} concealed tiles. With ${validation.numMelds} meld(s), expected ${validation.expectedWaiting}–${validation.expectedComplete}.` },
    });
  } else if (validation.errors.includes('tile_count_high')) {
    warnings.push({
      id: 'tile_count',
      severity: 'warning',
      zh: { title: '牌张数过多', body: `当前手牌${validation.concealedCount}张，${validation.numMelds}个副露应有${validation.expectedWaiting}-${validation.expectedComplete}张暗手。` },
      en: { title: 'Too many tiles', body: `Hand has ${validation.concealedCount} concealed tiles. With ${validation.numMelds} meld(s), expected ${validation.expectedWaiting}–${validation.expectedComplete}.` },
    });
  }

  return warnings;
}

// ── EXAMPLE HANDS ─────────────────────────────────────────────────────────────
// Each value is an array of tile groups (arrays of tiles).
// Groups are displayed visually separated in the UI.

const mk = (suit, ...vals) => vals.map((v) => ({ suit, value: v }));

const EXAMPLES = {
  yakuhai:         [mk('z',7,7,7), mk('m',3,4,5), mk('p',6,7,8), mk('s',1,2,3), mk('m',5,5)],
  tanyao:          [mk('m',2,3,4), mk('m',6,7,8), mk('p',3,4,5), mk('s',5,6,7), mk('p',8,8)],
  toitoi:          [mk('m',7,7,7), mk('p',5,5,5), mk('z',7,7,7), mk('s',3,3,3), mk('m',2,2)],
  chiitoitsu:      [mk('m',1,1),   mk('m',7,7),   mk('p',3,3),   mk('p',9,9),   mk('s',5,5),  mk('z',1,1), mk('z',7,7)],
  pinfu:           [mk('m',1,2,3), mk('m',7,8,9), mk('p',4,5,6), mk('s',2,3,4), mk('p',2,2)],
  sanshoku_doujun: [mk('m',2,3,4), mk('p',2,3,4), mk('s',2,3,4), mk('m',7,7,7), mk('s',5,5)],
  ittsu:           [mk('m',1,2,3), mk('m',4,5,6), mk('m',7,8,9), mk('p',5,5,5), mk('s',3,3)],
  honitsu:         [mk('z',1,1,1), mk('m',2,3,4), mk('m',5,6,7), mk('m',8,8,8), mk('m',1,1)],
  chinitsu:        [mk('p',1,2,3), mk('p',4,5,6), mk('p',7,8,9), mk('p',3,3,3), mk('p',5,5)],
  shousangen:      [mk('z',5,5,5), mk('z',6,6,6), mk('m',2,3,4), mk('s',6,6,6), mk('z',7,7)],
  chanta:          [mk('m',1,2,3), mk('p',7,8,9), mk('z',1,1,1), mk('s',1,1,1), mk('m',9,9)],
  junchan:         [mk('m',1,2,3), mk('p',7,8,9), mk('s',1,2,3), mk('m',9,9,9), mk('p',1,1)],
  sanankou:        [mk('m',3,3,3), mk('p',7,7,7), mk('s',5,5,5), mk('m',2,3,4), mk('z',1,1)],
  iipeikou:        [mk('m',2,3,4), mk('m',2,3,4), mk('p',5,6,7), mk('s',8,8,8), mk('z',2,2)],
  kokushi:         [mk('m',1), mk('m',9), mk('p',1), mk('p',9), mk('s',1), mk('s',9), mk('z',1), mk('z',2), mk('z',3), mk('z',4), mk('z',5), mk('z',6), mk('z',7,7)],
  daisangen:       [mk('z',5,5,5), mk('z',6,6,6), mk('z',7,7,7), mk('m',1,2,3), mk('s',3,3)],
  suuankou:        [mk('m',3,3,3), mk('p',7,7,7), mk('s',5,5,5), mk('z',7,7,7), mk('m',2,2)],
  tsuuiisou:       [mk('z',1,1,1), mk('z',2,2,2), mk('z',3,3,3), mk('z',5,5,5), mk('z',7,7)],
  shousuushii:     [mk('z',1,1,1), mk('z',2,2,2), mk('z',3,3,3), mk('z',4,4),   mk('m',5,5,5)],
  daisuushii:      [mk('z',1,1,1), mk('z',2,2,2), mk('z',3,3,3), mk('z',4,4,4), mk('m',5,5)],
  chinroutou:      [mk('m',1,1,1), mk('m',9,9,9), mk('p',1,1,1), mk('p',9,9,9), mk('s',1,1)],
  ryuuiisou:       [mk('s',2,3,4), mk('s',6,6,6), mk('s',8,8,8), mk('z',6,6,6), mk('s',2,2)],
  chuuren:         [mk('m',1,1,1), mk('m',2,3,4,5,6,7,8), mk('m',9,9,9), mk('m',5)],
};

// ── YAKU MEANINGS ─────────────────────────────────────────────────────────────
// Short beginner-readable definition for each yaku, shown in the route card.

const MEANINGS = {
  yakuhai:         { zh: '三元牌（白发中）或自风、场风的刻子/杠子。', en: 'A triplet or quad of dragons, your seat wind, or the round wind.' },
  tanyao:          { zh: '手牌全为2-8的数牌，不含幺九（1/9）或字牌。', en: 'All tiles are numbered 2–8 — no terminals (1/9) or honour tiles.' },
  toitoi:          { zh: '四组刻子（或杠子）加一对雀头，全无顺子。', en: 'Four triplets or quads plus one pair — no sequences at all.' },
  chiitoitsu:      { zh: '七组互不相同的对子，需门清。', en: 'Seven different pairs — closed hand only.' },
  pinfu:           { zh: '全顺子构成、非役牌雀头、且两面听牌，需门清。', en: 'All sequences, a non-value pair, and a two-sided wait — closed hand only.' },
  sanshoku_doujun: { zh: '三种花色（万/饼/索）各含一组数值完全相同的顺子。', en: 'The same numbered sequence appears once in each of the three suits.' },
  ittsu:           { zh: '同一花色内含1-2-3、4-5-6、7-8-9三段连续顺子。', en: 'One suit contains all three sequences: 1-2-3, 4-5-6, and 7-8-9.' },
  honitsu:         { zh: '手牌仅含一种数牌花色加字牌，不含其他花色数牌。', en: 'Only one suit of numbered tiles plus honour tiles — no other numbered suits.' },
  chinitsu:        { zh: '手牌全为同一花色数牌，不含字牌或其他花色。', en: 'All tiles are from a single suit — no honours or other suits.' },
  shousangen:      { zh: '三元牌（白发中）中两种凑成刻子，第三种作为对子雀头。', en: 'Two dragon triplets or quads, with the third dragon as the pair.' },
  chanta:          { zh: '每组面子和雀头各含至少一张幺九字牌，且至少有一组顺子。', en: 'Every set and the pair contain a terminal or honour tile, with at least one sequence.' },
  junchan:         { zh: '每组面子和雀头含端牌（1或9），字牌刻子不算，至少一组顺子。', en: 'Every set and the pair contain a terminal (1 or 9). Honour-only sets do not count. Needs at least one sequence.' },
  sanankou:        { zh: '三组刻子由暗手摸牌完成（暗刻），第四组面子可任意。', en: 'Three triplets formed entirely within the concealed hand. The fourth set can be anything.' },
  iipeikou:        { zh: '两组完全相同的顺子，需门清。', en: 'Two completely identical sequences — closed hand only.' },
  kokushi:         { zh: '万索饼的1和9各一张加七种字牌各一张（共13种），再加一张重复牌。', en: 'One of each of the 13 terminal/honour types, plus one duplicate of any one of them.' },
  daisangen:       { zh: '三元牌白、发、中各凑成一组刻子/杠子。', en: 'Triplets or quads of all three dragons: White (白), Green (發), and Red (中).' },
  suuankou:        { zh: '四组暗刻全在暗手中摸成，需门清。', en: 'All four triplets are formed within the concealed hand — closed hand only.' },
  tsuuiisou:       { zh: '手牌全由字牌（风牌或三元牌）组成，无数牌。', en: 'Every tile is an honour tile — only winds and dragons, no numbered tiles.' },
  shousuushii:     { zh: '四种风牌中三种为刻子/杠，第四种为雀头对子。', en: 'Triplets of three wind tiles, with the fourth wind as the pair.' },
  daisuushii:      { zh: '四种风牌（东南西北）各凑一组刻子/杠子。', en: 'Triplets or quads of all four wind tiles: East, South, West, and North.' },
  chinroutou:      { zh: '手牌全为端牌（仅1和9），不含任何中间牌或字牌。', en: 'All tiles are terminals — only 1s and 9s. No middle tiles, no honours.' },
  ryuuiisou:       { zh: '手牌全为绿色牌（2/3/4/6/8索及发字）。', en: 'All tiles are "green": 2, 3, 4, 6, 8 of bamboo (souzu) and the Green Dragon (發).' },
  chuuren:         { zh: '同花色数牌中含三张1、三张9、2至8各一张再加一张，需门清。', en: 'Three 1s, three 9s, one each of 2–8 in one suit, plus one extra tile — closed hand.' },
};

// ── SCENARIO BUILDERS ─────────────────────────────────────────────────────────
// Scenario shape:
//   { title:{zh,en}, drawOrCall:tile[], discard:tile[], result:tile[][], distance:number, zh:{explanation}, en:{explanation} }
// drawOrCall = tiles to acquire; discard = tiles to remove; result = visual outcome groups.

const DRAGON_ZH = { 5: '白', 6: '发', 7: '中' };
const DRAGON_EN = { 5: 'White', 6: 'Green', 7: 'Red' };
const WIND_ZH   = { 1: '东', 2: '南', 3: '西', 4: '北' };
const WIND_EN   = { 1: 'East', 2: 'South', 3: 'West', 4: 'North' };

function buildYakuhaiScenarios(ctx) {
  const { concealedTiles, openMelds, seatWind, roundWind } = ctx;
  const valueTiles = [...new Set([5, 6, 7, seatWind, roundWind].filter(Boolean))];
  const scenarios = [];

  const sorted = valueTiles
    .map((zv) => ({
      tile: { suit: 'z', value: zv },
      total: countTotal(concealedTiles, openMelds, 'z', zv),
      inMeld: openMelds.some((m) => meldIsTriplet(m, 'z', zv)),
      zh: DRAGON_ZH[zv] || WIND_ZH[zv] || '',
      en: DRAGON_EN[zv] || WIND_EN[zv] || '',
    }))
    .filter((x) => !x.inMeld)
    .sort((a, b) => b.total - a.total);

  for (const { tile, total, zh, en } of sorted) {
    if (total >= 3) continue;
    const triplet = [tile, tile, tile];
    if (total === 2) {
      scenarios.push({
        title: { zh: `再摸一张${zh}`, en: `Draw or call one more ${en}` },
        drawOrCall: [tile], discard: [], result: [triplet], distance: 1,
        targetYakuGroups: [triplet], targetType: 'example',
        zh: { explanation: `你已有${zh}${zh}对子。再摸到或碰到一张${zh}，即成${zh}${zh}${zh}刻子，役牌确立。` },
        en: { explanation: `You have a ${en} pair. Draw or pon one more ${en} to form a triplet — Yakuhai confirmed.` },
      });
    } else if (total === 1) {
      scenarios.push({
        title: { zh: `收集两张${zh}`, en: `Collect two more ${en}` },
        drawOrCall: [tile, tile], discard: [], result: [triplet], distance: 2,
        targetYakuGroups: [triplet], targetType: 'longer-term',
        zh: { explanation: `你有一张${zh}。字牌只能碰不能吃，还需两张才能组成刻子，需要耐心等待。` },
        en: { explanation: `You have one ${en}. Honour tiles can only be ponned — need two more to complete the triplet.` },
      });
    } else {
      scenarios.push({
        title: { zh: `从零开始收集${zh}`, en: `Collect ${en} from scratch` },
        drawOrCall: [tile, tile, tile], discard: [], result: [triplet], distance: 3,
        targetYakuGroups: [triplet], targetType: 'longer-term',
        zh: { explanation: `当前无${zh}牌。字牌不能吃，需通过摸牌或碰牌逐张收集，难度较大。` },
        en: { explanation: `No ${en} in hand. Must collect by drawing or ponning — no chii possible. Difficult from scratch.` },
      });
    }
    if (scenarios.length >= 2) break;
  }
  return scenarios;
}

function buildTanyaoScenarios(ctx) {
  const { allTiles } = ctx;
  const bad = allTiles.filter(isTerminalOrHonor);
  if (bad.length === 0) return [];
  return [{
    title: { zh: `打出${bad.length}张端张/字牌`, en: `Discard ${bad.length} terminal/honour tile(s)` },
    drawOrCall: [], discard: bad.slice(0, 4), result: [], distance: bad.length,
    targetYakuGroups: null, targetType: 'example',
    zh: { explanation: `你有${bad.length}张幺九字牌（1、9或字牌）。打出这些牌并换成2-8的中张，手牌即满足断幺九。` },
    en: { explanation: `You have ${bad.length} terminal/honour tile(s). Discard them and replace with simples (2–8) to satisfy Tanyao.` },
  }];
}

function buildToitoiScenarios(ctx) {
  const { concealedTiles, openMelds } = ctx;
  const cg = groupTiles(concealedTiles);
  const isMeldTriplet = (m) => m.length >= 3 && m.every(t => tileKey(t) === tileKey(m[0]));

  // ── Build the full Toitoi target from the current hand ────────────────────
  // Start with open triplets (already complete)
  const tripletGroups = [...openMelds.filter(isMeldTriplet)];

  // Add concealed triplets (tiles appearing 3+ times in hand)
  for (const [key, cnt] of Object.entries(cg)) {
    if (cnt >= 3) {
      const tile = { suit: key[0], value: parseInt(key.slice(1)) };
      tripletGroups.push([tile, tile, tile]);
    }
  }

  // Promote pairs to triplets (each needs 1 more tile) until we have 4 sets
  const neededTiles = [];
  let pairGroup = null;

  for (const [key, cnt] of Object.entries(cg)) {
    if (cnt !== 2) continue;
    const tile = { suit: key[0], value: parseInt(key.slice(1)) };
    if (tripletGroups.length < 4) {
      tripletGroups.push([tile, tile, tile]);
      neededTiles.push(tile); // need 1 more to complete
    } else if (!pairGroup) {
      pairGroup = [tile, tile];
    }
  }

  // Conflicting sequences to discard
  const seqDiscards = [];
  for (const suit of ['m', 'p', 's']) {
    const seqs = sequencesPresent(concealedTiles, suit);
    if (seqs.length > 0) {
      seqDiscards.push({ suit, value: seqs[0] + 1 }); // middle tile
      break;
    }
  }

  // ── If we can build a complete 4-triplet + pair structure, show it ─────────
  if (tripletGroups.length >= 4 && pairGroup) {
    const targetGroups = [...tripletGroups.slice(0, 4), pairGroup];
    const distance     = neededTiles.length + seqDiscards.length;
    const targetType   = distance <= 2 ? 'example' : 'longer-term';
    const needNames    = neededTiles.map(t => tileName(t, 'zh')).join('、');
    const needNamesEn  = neededTiles.map(t => tileName(t, 'en')).join(', ');
    const discardNote  = seqDiscards.length > 0
      ? `打出${tileName(seqDiscards[0],'zh')}等顺子牌，` : '';
    return [{
      title: { zh: '完整对对和结构', en: 'Complete Toitoi structure' },
      drawOrCall: neededTiles,
      discard:    seqDiscards,
      result:     targetGroups,
      distance,
      targetYakuGroups: targetGroups,
      targetType,
      zh: { explanation: `${discardNote}再摸 ${needNames} 各一张（或碰牌），手牌即形成四组刻子加一个雀头，满足对对和。` },
      en: { explanation: `${seqDiscards.length > 0 ? `Discard conflicting sequence tiles, then d` : 'D'}raw or pon ${needNamesEn} to complete four triplets and a pair — satisfying Toitoi.` },
    }];
  }

  // ── Fallback: partial hints when full structure not achievable yet ─────────
  const scenarios = [];

  for (const [key, cnt] of Object.entries(cg)) {
    if (cnt === 2 && scenarios.length < 2) {
      const tile = { suit: key[0], value: parseInt(key.slice(1)) };
      const nm   = tileName(tile, 'zh');
      const nmE  = tileName(tile, 'en');
      const triplet = [tile, tile, tile];
      scenarios.push({
        title: { zh: `再摸一张${nm}`, en: `Draw or call one more ${nmE}` },
        drawOrCall: [tile], discard: [], result: [triplet], distance: 1,
        targetYakuGroups: [triplet], targetType: 'longer-term',
        zh: { explanation: `你已有${nm}${nm}对子。摸到或碰到一张${nm}，即成${nm}${nm}${nm}刻子，向对对和方向推进。` },
        en: { explanation: `You have a ${nmE} pair. Draw or pon one more ${nmE} to form a triplet — advancing Toitoi.` },
      });
    }
  }

  for (const suit of ['m', 'p', 's']) {
    const seqs = sequencesPresent(concealedTiles, suit);
    if (seqs.length > 0 && scenarios.length < 3) {
      const v  = seqs[0];
      const t2 = { suit, value: v + 1 };
      scenarios.push({
        title: { zh: '打出顺子中间张', en: 'Break up conflicting sequence' },
        drawOrCall: [], discard: [t2], result: [], distance: 3,
        targetYakuGroups: null, targetType: 'example',
        zh: { explanation: `顺子结构与对对和（全刻子）冲突。打出中间张${tileName(t2)}，手牌向刻子方向重组。` },
        en: { explanation: `Sequences conflict with Toitoi (all triplets). Discard the middle tile to break the sequence and rebuild toward triplets.` },
      });
      break;
    }
  }

  return scenarios;
}

function buildChiitoitsuScenarios(ctx) {
  const { concealedTiles } = ctx;
  const cg = groupTiles(concealedTiles);
  const singles = Object.entries(cg)
    .filter(([, c]) => c === 1)
    .map(([key]) => ({ suit: key[0], value: parseInt(key.slice(1)) }))
    .slice(0, 4);
  if (singles.length === 0) return [];
  const pairGroups = singles.map((t) => [t, t]);
  return [{
    title: { zh: `补全${singles.length}个对子`, en: `Complete ${singles.length} more pair(s)` },
    drawOrCall: singles, discard: [], result: pairGroups, distance: singles.length,
    targetYakuGroups: pairGroups, targetType: 'example',
    zh: { explanation: `各摸一张这些牌，即可分别凑成对子。七对子需要7个互不相同的对子（四张相同只算一对）。` },
    en: { explanation: `Draw one of each of these tiles to form pairs. Chiitoitsu needs 7 unique pairs — four-of-a-kind counts as only one pair.` },
  }];
}

function buildPinfuScenarios(ctx) {
  const { concealedTiles, seatWind, roundWind } = ctx;
  const cg = groupTiles(concealedTiles);
  const valueTiles = [...new Set([5, 6, 7, seatWind, roundWind].filter(Boolean))];
  const badPairs = valueTiles
    .filter((zv) => (cg['z' + zv] || 0) >= 2)
    .map((zv) => ({ suit: 'z', value: zv }));
  if (badPairs.length === 0) return [];
  const t = badPairs[0];
  return [{
    title: { zh: `更换${tileName(t)}雀头`, en: `Replace ${tileName(t,'en')} as the pair` },
    drawOrCall: [], discard: [t], result: [], distance: 1,
    targetYakuGroups: null, targetType: 'example',
    zh: { explanation: `平和的雀头不能是役牌（风牌/三元牌）。打出一张${tileName(t)}，改用普通数牌作雀头，平和路线即通畅。` },
    en: { explanation: `Pinfu requires a non-value pair. Discard one ${tileName(t,'en')} and switch to a numbered pair — then Pinfu becomes possible.` },
  }];
}

function buildSanshokuScenarios(ctx) {
  const { allTiles } = ctx;
  for (const suit of ['m', 'p', 's']) {
    const seqs = sequencesPresent(allTiles, suit);
    if (seqs.length > 0) {
      const v = seqs[0];
      const missingSuits = ['m', 'p', 's'].filter((s) => s !== suit && !sequencesPresent(allTiles, s).includes(v));
      const needed = missingSuits.flatMap((s) => [{ suit: s, value: v }, { suit: s, value: v + 1 }, { suit: s, value: v + 2 }]);
      if (needed.length === 0) return [];
      const allThreeSeqs = ['m', 'p', 's'].map((s) => [{ suit: s, value: v }, { suit: s, value: v + 1 }, { suit: s, value: v + 2 }]);
      const SUIT_ZH = { m: '万', p: '饼', s: '索' };
      return [{
        title: { zh: `补齐其他花色的${v}-${v+1}-${v+2}顺子`, en: `Build ${v}-${v+1}-${v+2} in missing suit(s)` },
        drawOrCall: needed.slice(0, 6), discard: [], result: allThreeSeqs, distance: missingSuits.length,
        targetYakuGroups: allThreeSeqs, targetType: 'example',
        zh: { explanation: `你已有${SUIT_ZH[suit]}色的${v}-${v+1}-${v+2}顺子。在另外${missingSuits.length}种花色中各建一组相同顺子，三色同顺即告成立。` },
        en: { explanation: `You already have ${v}-${v+1}-${v+2} in ${suit} suit. Build the same sequence in the other ${missingSuits.length} suit(s) to complete Sanshoku Doujun.` },
      }];
    }
  }
  return [];
}

function buildIttsuScenarios(ctx) {
  const { allTiles } = ctx;
  for (const suit of ['m', 'p', 's']) {
    const seqs = sequencesPresent(allTiles, suit);
    if (seqs.some((v) => [1, 4, 7].includes(v))) {
      const missing = [1, 4, 7].filter((v) => !seqs.includes(v));
      if (missing.length === 0) return [];
      const needed = missing.flatMap((v) => [{ suit, value: v }, { suit, value: v + 1 }, { suit, value: v + 2 }]);
      const allIttsu = [
        [{ suit, value: 1 }, { suit, value: 2 }, { suit, value: 3 }],
        [{ suit, value: 4 }, { suit, value: 5 }, { suit, value: 6 }],
        [{ suit, value: 7 }, { suit, value: 8 }, { suit, value: 9 }],
      ];
      const SUIT_ZH = { m: '万', p: '饼', s: '索' };
      return [{
        title: { zh: `凑齐${SUIT_ZH[suit]}色缺失顺子段`, en: `Complete missing ${suit}-suit segment(s)` },
        drawOrCall: needed.slice(0, 6), discard: [], result: allIttsu, distance: missing.length,
        targetYakuGroups: allIttsu, targetType: 'example',
        zh: { explanation: `一气通贯需要同花色内有1-2-3、4-5-6、7-8-9三段。你在${SUIT_ZH[suit]}色已有部分，还缺${missing.length}段，收集缺失的牌即可。` },
        en: { explanation: `Ittsu needs 1-2-3, 4-5-6, and 7-8-9 all in one suit. You have some in ${suit} — collect the missing segment(s) to complete it.` },
      }];
    }
  }
  return [];
}

function buildHonitsuScenarios(ctx) {
  const { allTiles } = ctx;
  const sp = suitsPresent(allTiles);
  if (sp.length <= 1) return [];
  const sc = suitCounts(allTiles);
  const dominant = sp.reduce((a, b) => sc[a] > sc[b] ? a : b);
  const SUIT_ZH = { m: '万', p: '饼', s: '索' };
  const offSuit = allTiles.filter((t) => t.suit !== 'z' && t.suit !== dominant);
  if (offSuit.length === 0) return [];
  return [{
    title: { zh: `打出${offSuit.length}张非${SUIT_ZH[dominant]}数牌`, en: `Discard ${offSuit.length} off-suit numbered tile(s)` },
    drawOrCall: [], discard: offSuit.slice(0, 4), result: [], distance: offSuit.length,
    targetYakuGroups: null, targetType: 'example',
    zh: { explanation: `你主要持有${SUIT_ZH[dominant]}色牌，打出这${offSuit.length}张其他花色数牌后，手牌即满足混一色（一色+字牌）。` },
    en: { explanation: `Your hand is mostly ${dominant} suit. Discard these ${offSuit.length} off-suit tile(s) — the hand will then satisfy Honitsu (one suit + honours).` },
  }];
}

function buildChinitsuScenarios(ctx) {
  const { allTiles } = ctx;
  const sp = suitsPresent(allTiles);
  if (sp.length === 0) return [];
  const sc = suitCounts(allTiles);
  const dominant = sp.reduce((a, b) => sc[a] > sc[b] ? a : b);
  const SUIT_ZH = { m: '万', p: '饼', s: '索' };
  const offSuit = allTiles.filter((t) => t.suit !== dominant);
  if (offSuit.length === 0) return [];
  return [{
    title: { zh: `打出${offSuit.length}张非${SUIT_ZH[dominant]}牌（含字牌）`, en: `Discard ${offSuit.length} non-${dominant} tile(s) including honours` },
    drawOrCall: [], discard: offSuit.slice(0, 4), result: [], distance: offSuit.length,
    targetYakuGroups: null, targetType: 'example',
    zh: { explanation: `清一色要求手牌全为${SUIT_ZH[dominant]}色。打出这${offSuit.length}张非${SUIT_ZH[dominant]}牌（含字牌），手牌即达成清一色方向。` },
    en: { explanation: `Chinitsu needs all tiles to be ${dominant} suit. Discard these ${offSuit.length} non-${dominant} tile(s) — including honours — to commit to this route.` },
  }];
}

// ── AFTER-STEP COMPUTER ───────────────────────────────────────────────────────
// Applies a scenario action (add neededTiles, drop discardTiles) to the current
// hand and returns one of two results:
//
//   isExactCompletion: true
//     completedHandGroups = open melds + valid concealed decomposition
//     afterStepGroups     = null
//
//   isExactCompletion: false
//     completedHandGroups = null   (never falls back to the generic exampleHand)
//     afterStepGroups     = open melds + resulting concealed tiles (sorted, flat)
//                           so the UI can show "After this step:" without inventing tiles

function computeAfterStep(ctx, neededTiles, discardTiles) {
  const { concealedTiles, openMelds } = ctx;
  const numMelds = openMelds.length;
  const expectedComplete = 14 - 3 * numMelds;

  // Apply scenario action
  let result = [...concealedTiles, ...neededTiles];
  for (const d of discardTiles) {
    const idx = result.findIndex((t) => tileKey(t) === tileKey(d));
    if (idx >= 0) result.splice(idx, 1);
  }

  // Try exact winning decomposition
  if (result.length === expectedComplete) {
    const groups = extractHandGroups(result, numMelds);
    if (groups) {
      return {
        completedHandGroups: [...openMelds, ...groups],
        afterStepGroups: null,
        isExactCompletion: true,
      };
    }
  }

  // Not a complete winning hand — produce the "after step" hand state without decomposing
  const sorted = sortTiles(result);
  // Display: each open meld as its own group, remaining concealed tiles as one flat group
  const afterParts = [
    ...openMelds,
    ...(sorted.length > 0 ? [sorted] : []),
  ];
  return {
    completedHandGroups: null,
    afterStepGroups: afterParts.length > 0 ? afterParts : null,
    isExactCompletion: false,
  };
}

const SCENARIO_BUILDERS = {
  yakuhai: buildYakuhaiScenarios,
  tanyao: buildTanyaoScenarios,
  toitoi: buildToitoiScenarios,
  chiitoitsu: buildChiitoitsuScenarios,
  pinfu: buildPinfuScenarios,
  sanshoku_doujun: buildSanshokuScenarios,
  ittsu: buildIttsuScenarios,
  honitsu: buildHonitsuScenarios,
  chinitsu: buildChinitsuScenarios,
};

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────

export function analyzeHand(concealedTiles, openMelds, seatWind, roundWind, rules) {
  const validation = validateHand(concealedTiles, openMelds);

  const ctx = {
    concealedTiles,
    openMelds,
    allTiles: [...concealedTiles, ...openMelds.flat()],
    isOpen: openMelds.length > 0,
    seatWind,
    roundWind,
    rules,
  };

  const routes = [
    analyzeYakuhai(ctx),
    analyzeTanyao(ctx),
    analyzeToitoi(ctx),
    analyzeChiitoitsu(ctx),
    analyzePinfu(ctx),
    analyzeSanshokuDoujun(ctx),
    analyzeIttsu(ctx),
    analyzeHonitsu(ctx),
    analyzeChinitsu(ctx),
    analyzeShousangen(ctx),
    analyzeChanta(ctx),
    analyzeJunchan(ctx),
    analyzeSanankou(ctx),
    analyzeIipeikou(ctx),
    // Yakuman (recognition only)
    analyzeKokushi(ctx),
    analyzeDaisangen(ctx),
    analyzeSuuankou(ctx),
    analyzeTsuuiisou(ctx),
    analyzeShousuushii(ctx),
    analyzeDaisuushii(ctx),
    analyzeChinroutou(ctx),
    analyzeRyuuiisou(ctx),
    analyzeChuuren(ctx),
  ];

  // Attach example hands, meanings, and concrete scenarios to every route.
  //
  // Three-tier priority — stops at the first tier that returns results:
  //   1. findScenarios()   — brute-force over all 34 draws; exact for 0/1-step hands.
  //   2. searchYakuRoute() — BFS with per-yaku pruning; exact for 2-step hands.
  //   3. SCENARIO_BUILDERS — heuristic tile suggestions (last resort only).
  //
  // Tiers 1 and 2 always produce scenarios whose neededTiles / discardTiles /
  // targetYakuGroups are derived from actual hand decompositions.
  // Tier 3 scenarios are labelled isExample:true to signal they are approximate.

  const shanten = computeShanten(concealedTiles, openMelds.length);

  const enrichedRoutes = routes.map((route) => {
    const exampleHand = EXAMPLES[route.id] ?? [];
    const meaning     = MEANINGS[route.id] ?? null;

    if (route.feasibility === FEASIBILITY.IMPOSSIBLE) {
      return { ...route, exampleHand, meaning, scenarios: [], shanten };
    }

    // ── Tier 1: simulation (0/1-step exact) ──────────────────────────────────
    const simScenarios = findScenarios(
      concealedTiles, openMelds,
      route.id, route.nameZh, route.nameEn,
      seatWind, roundWind, rules
    ).map((s) => ({
      ...s,
      isExactCompletion:     true,
      afterStepGroups:       null,
      isExample:             false,
      routeType:             s.distance <= 1 ? 'one-step' : 'short',
      currentConcealedTiles: concealedTiles,
      currentOpenMelds:      openMelds,
    }));

    if (simScenarios.length > 0) {
      return { ...route, exampleHand, meaning, scenarios: simScenarios, shanten };
    }

    // ── Tier 2: bounded BFS (2-step exact) ───────────────────────────────────
    const bfsResult = searchYakuRoute(
      concealedTiles, openMelds,
      route.id, seatWind, roundWind, rules
    );

    if (bfsResult) {
      const bfsScenario = makeBFSScenario(
        bfsResult, route.nameZh, route.nameEn, concealedTiles, openMelds
      );
      return { ...route, exampleHand, meaning, scenarios: [bfsScenario], shanten };
    }

    // ── Tier 3: heuristic fallback (labelled as non-exact) ───────────────────
    const heuristicRaw = SCENARIO_BUILDERS[route.id]?.(ctx) ?? [];
    const heuristicScenarios = heuristicRaw.map((s) => {
      const neededTiles  = s.neededTiles  ?? s.drawOrCall ?? s.needed ?? [];
      const discardTiles = s.discardTiles ?? s.discard ?? [];
      const afterStep    = computeAfterStep(ctx, neededTiles, discardTiles);
      const targetType   = s.targetType ?? (afterStep.isExactCompletion ? 'exact' : 'example');
      return {
        ...s,
        neededTiles,
        discardTiles,
        resultGroups:        s.resultGroups ?? s.result ?? [],
        completedHandGroups: afterStep.completedHandGroups,
        afterStepGroups:     afterStep.afterStepGroups,
        isExactCompletion:   afterStep.isExactCompletion,
        isExample:           true, // always mark heuristic scenarios as non-exact
        routeType:           s.targetType === 'longer-term' ? 'longer-term' : 'example',
        targetYakuGroups:    s.targetYakuGroups ?? null,
        targetType,
        currentConcealedTiles: concealedTiles,
        currentOpenMelds:      openMelds,
      };
    });

    return { ...route, exampleHand, meaning, scenarios: heuristicScenarios, shanten };
  });

  const confirmedRoutes = enrichedRoutes.filter((r) => r.feasibility === FEASIBILITY.CONFIRMED);
  const confirmedHan = confirmedRoutes.reduce((acc, r) => {
    const h = openMelds.length > 0 ? r.han.open : r.han.closed;
    return typeof h === 'number' ? acc + h : acc;
  }, 0);

  const warnings = buildWarnings(concealedTiles, openMelds, enrichedRoutes, rules, validation);

  return {
    handStatus: {
      ...validation,
      confirmedRoutes,
      confirmedHan,
    },
    routes: enrichedRoutes,
    warnings,
  };
}
