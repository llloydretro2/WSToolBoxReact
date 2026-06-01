// WS Damage Simulator — Cross-Validation Fixtures
// Sourced from JP card database. Each fixture represents a real card effect
// categorized by damage pattern type.
//
// engineSupport:
//   'full'     — 完全可模拟，可与已有项目双引擎比对
//   'approx'   — 近似可模拟（有小差异，注明原因）
//   'skip'     — 引擎暂不支持（变量伤害等），仅记录，待扩展后实现
//   'engine_only' — 已有项目无对应语法，只跑我们引擎

import { OpType, ZoneId } from '../types.js';
import { buildSimpleDeck, buildRealisticDeck, makeCharacter, makeClimax } from '../card.js';

// ── 标准初始状态 ──────────────────────────────────────────────────────────────
// 50 张牌组，8 张 Climax，模拟标准竞技牌组
export function makeStandardDeck() {
  return buildSimpleDeck({ characters: 34, events: 8, climaxes: 8 });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const FIXTURES = [

  // ── A: 直接伤害 ──────────────────────────────────────────────────────────────

  {
    id: 'A1_direct_1pt',
    category: 'A',
    cardId: '5HY/W83-T88',
    cardName: '认真女孩 中野 五月',
    effectSummary: '攻击时支付费用→对手1点伤害（可取消）',
    engineSupport: 'full',

    ourSequence: [
      { type: OpType.DAMAGE, n: 1 },
    ],
    theirSyntax: '1',

    initialState: { deck: makeStandardDeck() },
    // 解析解: P(hit) = 42/50 = 0.84，E[damage] = 0.84
    analyticalMean: 42 / 50,
  },

  {
    id: 'A2_direct_2pt',
    category: 'A',
    cardId: '5HY/W101-025',
    cardName: '特别 中野 四叶',
    effectSummary: '满足记忆条件，攻击时支付费用→对手2点伤害（可取消）',
    engineSupport: 'full',

    ourSequence: [
      { type: OpType.DAMAGE, n: 2 },
    ],
    theirSyntax: '2',

    initialState: { deck: makeStandardDeck() },
    // 解析解: P(hit) = (42*41)/(50*49) ≈ 0.7029，E[damage] = 2 × P(hit) ≈ 1.406
    analyticalMean: 2 * (42 * 41) / (50 * 49),
  },

  // ── B: 顶牌条件伤害 ──────────────────────────────────────────────────────────

  {
    id: 'B1_peek_top1_trait_condition',
    category: 'B',
    cardId: '5HY/W83-076',
    cardName: '圣诞服装 中野 一花',
    effectSummary: '公开自己牌组顶1张，若为特定角色→对手1点伤害，公开的卡原序放回',
    // 注：条件是"《五つ子》角色"，在自己牌组中近似所有非Climax卡
    // 我们用 onNormal 近似（非Climax = 符合条件）
    // 差异：公开的是自己的牌组（source='deck'，但本卡是自己用的）
    // 用于测试时视为对对手牌组的操作，结构等价
    engineSupport: 'approx',
    approxNote: '条件简化为 non_climax（实际为特定特征），公开后原序放回',

    ourSequence: [
      {
        type: OpType.MOVE,
        source: { zone: ZoneId.DECK, method: { type: 'top', n: 1 } },
        act: {
          selections: [],
          remainder: { destination: 'source', order: 'original' },  // 放回原处
        },
        onNormal: [{ type: OpType.DAMAGE, n: 1 }],  // 非Climax → 1点伤害
      },
    ],
    // 已有项目近似（会将顶牌送废弃堆而非放回，有轻微偏差）
    theirSyntax: 'DT>RS1:N+1',

    initialState: { deck: makeStandardDeck() },
    // 关键：peek 后放回原处，若非Climax则顶牌仍是同一张非Climax牌，伤害必中
    // P(peek non-climax) = 42/50 = 0.840，给定非Climax：damage 100% 命中（同一张牌）
    // E[damage] = P(non-climax at top) × 1 = 42/50 = 0.840
    analyticalMean: 42 / 50,
  },

  {
    id: 'B2_konzentration_variable',
    category: 'B',
    cardId: 'AGS/W108-009',
    cardName: '相河 爱花（集中）',
    effectSummary: '揭自己牌组顶4张全部送废弃堆，造成X点伤害（X=高潮数），同一伤害流程',
    engineSupport: 'engine_only',

    ourSequence: [
      // Step 1: 揭顶4张 → 废弃堆，记录结果
      {
        type: OpType.MOVE,
        source: { zone: ZoneId.DECK, method: { type: 'top', n: 4 } },
        act: { selections: [], remainder: { destination: ZoneId.REST, order: 'any' } },
      },
      // Step 2: 造成 X 点伤害，X = 上一步揭出牌中的高潮数
      {
        type: OpType.VARIABLE_DAMAGE,
        nFn: (state) => {
          const cards = state.lastResult?.cardsRevealed ?? [];
          return cards.filter(c => c.type === 'climax').length;
        },
      },
    ],
    theirSyntax: null,  // 已有项目无法精确建模（只能二元条件，无法表达X=count）

    initialState: { deck: makeStandardDeck() },
    // 解析解: E[X] = 4 × (8/50) = 0.640，但伤害有取消，P(no cancel | X=k)复杂
    // 数值验证：P(X>=1) ≈ 1 - C(42,4)/C(50,4) ≈ 0.514，mean应低于0.640
  },

  {
    id: 'B3_top4_no_trait_2x1pt',
    category: 'B',
    cardId: 'AOH/W127-116',
    cardName: '我的心怦怦直跳呢 音霊魂子',
    effectSummary: '揭自己牌组顶4张送废弃堆，若4张中无《あおぎり高校》角色（近似：无Climax）→对手1点×2次',
    // 用 onNoneMatch 精确表达"无特定类型"条件（之前用 onNormal 是近似）
    // onNoneMatch fires when 0 cards match the filter — 比 onNormal 语义更精确
    engineSupport: 'full',

    ourSequence: [
      {
        type: OpType.MOVE,
        source: { zone: ZoneId.DECK, method: { type: 'top', n: 4 } },
        act: {
          selections: [],
          remainder: { destination: ZoneId.REST, order: 'any' },
        },
        // 当4张中没有Climax（近似：没有特定特征角色）→ 1点×2次
        onNoneMatch: [
          { filter: { type: 'climax' }, ops: [
            { type: OpType.DAMAGE, n: 1 },
            { type: OpType.DAMAGE, n: 1 },
          ]},
        ],
      },
    ],
    // 已有项目 :N+ 语义是"含非Climax"≈必然触发，不等价，标为 engine_only
    theirSyntax: null,

    initialState: { deck: makeStandardDeck() },
    // 解析解: P(4张均非Climax) = C(42,4)/C(50,4) ≈ 0.486
    // 条件满足时打2次1点，各自可取消
    // E[damage] = P(0CX in 4) × 2 × P(1pt no cancel) = 0.486 × 2 × 0.840 ≈ 0.817
    analyticalMean: (() => {
      const pNoCx4 = (42*41*40*39) / (50*49*48*47);
      // 精确修正：移走4张非CX后，deck剩46张含8CX，P(1pt hit)=38/46
      return pNoCx4 * 2 * (38/46);
    })(),
  },

  // ── C: 取消追加（Cancel Chain）────────────────────────────────────────────────

  {
    id: 'C1_shot_cancel_1pt',
    category: 'C',
    cardId: 'AB/W11-024',
    cardName: '降临的天使（Shot触发高潮卡）',
    effectSummary: 'Shot触发效果：本回合内，此卡触发的攻击角色下次伤害被取消时→1点追加',
    // Shot trigger + 主体伤害 = 主体N点，取消后1点追加
    // 这里测试主体伤害=2点 + Shot追加
    engineSupport: 'full',

    ourSequence: [
      { type: OpType.DAMAGE, n: 2, onCancel: [{ type: OpType.DAMAGE, n: 1 }] },
    ],
    theirSyntax: '2zj(1)',

    initialState: { deck: makeStandardDeck() },
  },

  {
    id: 'C3_cancel_variable_level_plus1',
    category: 'C',
    cardId: 'LNJ/W85-004',
    cardName: '想要传达的心意 天王寺 璃奈（C3部分）',
    effectSummary: '登场回合内，此卡伤害被取消时→送废弃堆顶1张，造成X点（X=该卡等级+1，Climax算0=1点）',
    engineSupport: 'engine_only',

    ourSequence: [
      {
        type: OpType.DAMAGE,
        n: 2,
        onCancel: [
          // 送废弃堆顶1张
          {
            type: OpType.MOVE,
            source: { zone: ZoneId.DECK, method: { type: 'top', n: 1 } },
            act: { selections: [], remainder: { destination: ZoneId.REST, order: 'any' } },
          },
          // 造成 X 点：该卡等级+1（Climax等级视为0）
          {
            type: OpType.VARIABLE_DAMAGE,
            nFn: (state) => {
              const card = state.lastResult?.cardsRevealed?.[0];
              if (!card) return 1;
              const level = card.type === 'climax' ? 0 : (card.level ?? 0);
              return level + 1;
            },
          },
        ],
      },
    ],
    theirSyntax: null,

    // 需要真实等级分布才能验证 level+1 的期望
    initialState: { deck: buildRealisticDeck() },
    // 解析解（近似）：
    // P(2pt hit) ≈ 0.703 → 期望2pt伤害 = 1.406
    // P(2pt cancel) ≈ 0.297 → 触发追加：揭顶1张
    //   追加伤害期望 ≈ 0.297 × E[level+1 of top card] × P(追加不取消)
    //   E[level+1] for realistic deck (42 non-cx: 20×1 + 12×2 + 8×3 + 2×4) / 42 ≈ 1.86
    //   近似：mean ≈ 1.406 + 0.297 × 1.86 × ~0.84 ≈ 1.871
  },

  // ── G: 多次独立伤害 ──────────────────────────────────────────────────────────

  {
    id: 'G1_1pt_twice',
    category: 'G',
    cardId: 'DAL/W99-003',
    cardName: '伸出的指尖 琴里',
    effectSummary: 'CX连携：选择"1点伤害×2次"（各自独立取消，非同一伤害流程）',
    engineSupport: 'full',

    ourSequence: [
      { type: OpType.DAMAGE, n: 1 },
      { type: OpType.DAMAGE, n: 1 },
    ],
    theirSyntax: '1,1',

    initialState: { deck: makeStandardDeck() },
    // 注：此卡还可选"4点伤害"模式，见下一条 fixture
  },

  {
    id: 'G1_alt_4pt',
    category: 'G',
    cardId: 'DAL/W99-003',
    cardName: '伸出的指尖 琴里（4点模式）',
    effectSummary: 'CX连携：选择"4点伤害×1次"（单一伤害流程）',
    engineSupport: 'full',

    ourSequence: [
      { type: OpType.DAMAGE, n: 4 },
    ],
    theirSyntax: '4',

    initialState: { deck: makeStandardDeck() },
  },

  // ── H: 操作对手牌组成分 ──────────────────────────────────────────────────────

  {
    id: 'H1_opp_rest_cx_to_deck',
    category: 'H',
    cardId: 'DG/S02-001',
    cardName: '树莓派与氟龙',
    effectSummary: '对手废弃堆选1张Climax→对手牌组并洗切（提高对手牌组Climax密度）',
    engineSupport: 'engine_only',

    // 初始状态：对手牌组 50张5Climax，废弃堆5张包含2张Climax
    // 效果：把废弃堆1张Climax塞回牌组 → 牌组变为50张6Climax
    ourSequence: [
      {
        type: OpType.SEARCH,
        zone: ZoneId.REST,
        filter: { type: 'climax' },
        count: { type: 'exact', n: 1 },
        destination: ZoneId.DECK,
        insertAt: 'shuffle_in',  // 放入后洗切
        afterSearch: 'none',
      },
      // 然后对手进行一次攻击（用来验证Climax密度变化后取消率上升）
      { type: OpType.DAMAGE, n: 2 },
    ],
    theirSyntax: null,

    // 初始状态含废弃堆Climax用于操作
    initialState: {
      deck: buildSimpleDeck({ characters: 37, events: 8, climaxes: 5 }),  // 50张5CX
      rest: [
        ...Array.from({ length: 3 }, () => makeCharacter()),
        makeClimax(),
        makeClimax(),  // 废弃堆2张Climax
      ],
    },
    // 验证逻辑：效果后牌组有6CX，P(2pt no cancel) ≈ (44*43)/(50*49) ≈ 0.773
    // 不做效果时 P(2pt no cancel) ≈ (45*44)/(50*49) ≈ 0.808
    // 预期：H1效果后伤害命中率更低（高潮更多）
  },

  {
    id: 'H2_opp_deck_top_to_rest',
    category: 'H',
    cardId: 'BD/WE31-021',
    cardName: 'Colorful Poppin! Arisa',
    effectSummary: '自己揭顶2张若含Climax→对手牌组顶1张送废弃堆（降低对手Climax密度），再从对手废弃堆取1张放对手牌组顶',
    engineSupport: 'engine_only',

    // 效果分两步：
    // 1. 自己揭顶2张，若有Climax → 对手牌组顶1张送废弃堆
    // 2. 从对手废弃堆选1张放对手牌组顶
    // 这里只建模关键的"降低对手Climax密度"部分（步骤1），
    // 步骤2（从废弃堆回牌组顶）根据玩家选择不同，测试时假设选非Climax
    ourSequence: [
      // 步骤1：揭自己顶2张
      {
        type: OpType.MOVE,
        source: { zone: ZoneId.DECK, method: { type: 'top', n: 2 } },
        act: { selections: [], remainder: { destination: ZoneId.REST, order: 'any' } },
        // 若含Climax → 对手牌组顶1张→废弃堆
        onClimax: [
          {
            type: OpType.MOVE,
            source: { zone: ZoneId.DECK, method: { type: 'top', n: 1 } },
            act: { selections: [], remainder: { destination: ZoneId.REST, order: 'any' } },
          },
        ],
      },
      // 然后验证性地对对手造成2点伤害（检验Climax密度是否正确降低）
      { type: OpType.DAMAGE, n: 2 },
    ],
    theirSyntax: null,

    initialState: { deck: makeStandardDeck() },
  },

  {
    id: 'H3_mill_opp_deck_bottom',
    category: 'H',
    cardId: '5HY/W83-106',
    cardName: '迈出的一步 中野 三玖（CX连携效果1）',
    effectSummary: 'CX连携：对手牌组底2张→废弃堆，造成X点（X=其中Climax数）+ 看对手牌组顶2张并选择安排',
    engineSupport: 'skip',
    skipReason: '同B2，X=Climax数需要 VariableDamageOp。此外，看并重排顶2张需要 ReorderOp，复合操作较复杂。',
    theirSyntax: null,

    initialState: { deck: makeStandardDeck() },
  },

  // ── I: Clock 换牌 ─────────────────────────────────────────────────────────────

  {
    id: 'I1_clock_swap',
    category: 'I',
    cardId: '5HY/W101-035',
    cardName: '守护的目光 中野 五月',
    effectSummary: '战斗对手被反转时：对手Clock顶1张→废弃堆，该角色→对手Clock（净零，但Clock成分改变）',
    engineSupport: 'engine_only',

    // 效果：从对手Clock取出顶部1张（可能是Climax）送废弃堆，
    // 换入一张确定为角色的牌（战斗中被反转的对手角色，非Climax）
    // 净效果：Clock张数不变，但可能移除了一张Climax，换入非Climax
    ourSequence: [
      // 从Clock取出顶部1张→废弃堆
      {
        type: OpType.MOVE,
        source: { zone: ZoneId.CLOCK, method: { type: 'top', n: 1 } },
        act: { selections: [], remainder: { destination: ZoneId.REST, order: 'any' } },
      },
      // 将一张非Climax角色放入Clock（模拟被反转的对手角色进Clock）
      {
        type: OpType.STATE_EDIT,
        zone: ZoneId.CLOCK,
        action: 'add',
        card: makeCharacter(),
        insertAt: 'top',
      },
      // 验证：之后造成2点伤害，检验Clock成分变化对Level Up的影响
      { type: OpType.DAMAGE, n: 2 },
    ],
    theirSyntax: null,

    // 初始状态：对手Clock有5张，其中2张Climax（典型中期局面）
    initialState: {
      deck: makeStandardDeck(),
      clock: [
        makeCharacter(), makeCharacter(), makeCharacter(),
        makeClimax(), makeClimax(),  // Clock中有2张Climax
      ],
    },
  },

  // ── J: 再次攻击（スタンド直立）────────────────────────────────────────────────

  {
    id: 'J1_cx_combo_stand_reattack',
    category: 'J',
    cardId: 'LNJ/W85-004',
    cardName: '想要传达的心意 天王寺 璃奈（J1部分）',
    effectSummary: 'CX连携满足时，攻击结束后此卡直立→可再次攻击（追加整套魂伤害）',
    // 再次攻击本身建模为序列中追加一次伤害
    // 此卡 soul+1 触发，假设主体soul=2（level3卡）+ trigger soul+1 = 3点攻击伤害
    // 然后若CX连携成功直立，再次攻击：soul=2 + 可能再次触发
    engineSupport: 'engine_only',

    ourSequence: [
      // 第一次攻击（含魂值）
      { type: OpType.DAMAGE, n: 2 },
      // CX连携条件满足（假设已满足）→ 直立 → 再次攻击
      { type: OpType.DAMAGE, n: 2 },
    ],
    theirSyntax: null,

    initialState: { deck: makeStandardDeck() },
  },

  {
    id: 'J2_battle_win_stand_reattack',
    category: 'J',
    cardId: '5HY/W83-T35',
    cardName: '横亘于前的壁垒 中野 二乃',
    effectSummary: '登场回合，战斗对手被反转时支付费用→此卡直立→再次攻击',
    // 正面攻击胜利后可再攻击一次
    engineSupport: 'engine_only',

    ourSequence: [
      // 正面攻击魂伤害（soul=2，level3卡）
      { type: OpType.DAMAGE, n: 2 },
      // 战斗胜利后支付费用直立，再次攻击（Direct Attack，+1soul）
      { type: OpType.DAMAGE, n: 3 },  // 再次直接攻击 soul+1
    ],
    theirSyntax: null,

    initialState: { deck: makeStandardDeck() },
  },

];

// ── Fixture Summary ───────────────────────────────────────────────────────────

export function getFixturesBySupport(support) {
  return FIXTURES.filter(f => f.engineSupport === support);
}

export const COMPARABLE_FIXTURES = FIXTURES.filter(
  f => f.engineSupport === 'full' || f.engineSupport === 'approx'
);
