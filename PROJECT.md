# CardToolBox Frontend — Project Status

> Last updated: 2026-05-19 (session 9)

## Deployment

- **Production URL**: Cloudflare Pages (deployed from `main` branch)
- **Deploy method**: push `main` to `origin` → Cloudflare Pages auto-deploys
- **Backend**: `https://api.cardtoolbox.org` (WS card data, deck management, auth)
- **Dev proxy**: `/api` and `/audios` → `http://localhost:4000`

---

## Completed work (merged to `main`)

### Mahjong tools

A beginner-friendly Riichi Mahjong tool suite. See `CLAUDE.md` for full architecture details.

| Tool | Route | Status |
|---|---|---|
| Yaku route trainer | `/mahjong/trainer` | Active |
| Efficiency / ukeire | `/mahjong/efficiency` | Active |
| Table centrepiece | `/mahjong/centrepiece` | Initial implementation; landscape UX needs redesign |

#### Yaku route trainer

| Capability | Status |
|---|---|
| Visual tile picker (34 tiles, suit rows with label) | ✅ |
| Fixed hand bar — multi-line wrap, ResizeObserver dynamic padding | ✅ |
| 14-tile global limit with live `X / 14` counter | ✅ |
| Meld builder with legal meld validation (刻子/顺子/杠) | ✅ |
| Shanten calculation (3-way: standard/Chiitoitsu/Kokushi) | ✅ |
| Exact 0/1-step brute-force simulation | ✅ |
| Bounded BFS route search (depth 2, ≤280 states) | ✅ |
| Heuristic fallback with "Reference route" label | ✅ |
| `FEASIBILITY_ACHIEVED` tier — yaku structure already present in hand | ✅ |
| `CompletedHandPanel` — shown when hand is complete, no route suggestions | ✅ |
| 14 regular yaku + 9 yakuman route cards | ✅ |
| Seat wind / round wind / kuitan / two-han-min rule toggles | ✅ |
| Honitsu bug fixed — now requires honor tiles to be present | ✅ |
| 混老头 + 三色同刻 added to evaluator and route analyzer | ✅ |
| 9 yakuman added to evaluator (大三元/四暗刻/字一色/小四喜/大四喜/清老头/绿一色/九莲宝灯) | ✅ |
| 国士无双 added to canCompleteHand | ✅ |
| Chanta bug fixed — closed all-triplet hands no longer show HIGH | ✅ |
| FEASIBILITY_ACHIEVED upgrade logic standardised across all yaku | ✅ |

**Known limitations (by design):** first-decomposition only (`extractHandGroups`), no ukeire, no scoring, simplified Pinfu wait check, Sanankou tsumo/ron not enforced.

---

### Mahjong UI redesign (2026-05-18 session 4)

Full migration of mahjong pages from MUI to Tailwind-only with a new B&W design language.

#### UI stack migration
- Removed all MUI imports from `MahjongTrainer.jsx`, `MahjongTile.jsx`, `MahjongTilePicker.jsx`
- Removed all `var(--primary)` / Spring Rain theme colour references from mahjong files
- Replaced `Box`/`Paper`/`Container`/`Chip`/`Collapse`/`Snackbar`/`Fab` with plain HTML + Tailwind
- Installed `lucide-react` for icons (replaces MUI icon imports in mahjong section only)

#### Design language
- Page background: `bg-white` (no global background — WS background scoped to `/ws/*` via `WSBackground` in `App.jsx`)
- Panels: `border border-gray-200 rounded-2xl`
- Feasibility chips: grayscale spectrum (black → very light gray) as the sole colour accent
- All action buttons: black rounded-full pill (`rounded-full bg-black text-white`)
- Toggle buttons (winds): `rounded-lg` group, active = `bg-gray-950 text-white`
- Custom `ToggleSwitch` replaces MUI `Switch`

#### Layout
- Two-card layout: input card (settings + analyze CTA) + picker card (tile grid + meld builder)
- `FixedHandBar`: multi-line tile wrap, dynamic height via `ResizeObserver`, positioned at `top-[64px] md:top-[72px]`
- Results auto-scroll via `scrollIntoView` after analysis

#### Picker improvements
- 14-tile global limit: `X / 14` counter, all tiles disabled when full
- Meld builder: collapsible via centred pill button; `validateMeld()` validates 刻子/顺子/杠 before confirming; inline validation message shows type or error reason

---

### Frontend refactoring (2026-05-17)

A comprehensive quality pass across all non-Mahjong pages. No features added — only correctness, consistency, and maintainability improvements.

#### API centralisation
- Removed per-page `BACKEND_URL` constants from every page that existed at the time (CardList, Record, DeckCreate, DeckEdit, DeckSearch, Login, Simulator, AudioBoard)
- All API calls now route through `src/utils/api.js:apiRequest()` — automatic auth header, 401 handling, `VITE_BACKEND_URL` support

#### State cleanup
- **ChessClock**: removed derived `p1Time`/`p2Time` useState + sync useEffect; computed inline
- **Login**: merged `errorMessage` + `successMessage` into single `snackbar` state; fixed register-success showing as error
- **Record**: consolidated `deleteDialogOpen` + `recordToDelete` into `deleteDialog` object
- **DeckCreate + DeckEdit**: consolidated 8 flat filter useState fields (color/level/rarity/cardType/power/cost/soul/trigger) into `filterState` object before those pages were later removed

#### DeckEdit critical fixes
- Removed two debug JSON data cards that were exposed to end users
- Merged duplicate `handleSaveDeck` / `handleSave` into one correct save function
- Removed duplicate `isSaving` state (was alongside `saving`)
- Removed 15 `console.log` / `console.error` statements

#### Layout standardisation
- All pages now use `Container` with consistent `maxWidth` (lg/md/sm) — no more manual `Box width="80%"` patterns
- All page titles standardised to `variant="h4" fontWeight={700} color="var(--text)"` in a centred `Box mb={4}`
- Simulator widened from `sm` → `md` (was too narrow for 4-column config grid)
- PickPacks narrowed from `lg` → `md` (inconsistent with other tool pages)

#### ButtonVariants adoption
- **FirstSecond**: raw `Button` with hardcoded colors → `PrimaryButton`; removed redundant `framer-motion` wrapper
- **ChessClock**: all 3 control buttons + dialog buttons → `PrimaryButton` / `SecondaryButton` / `DangerButton`
- **AudioBoard**: track toggle buttons → `Box component="button"` with CSS variables (toggle state pattern doesn't fit ButtonVariants)

#### Hardcoded color elimination
- `color="#1b4332"` replaced with `color="var(--text)"` on titles in FirstSecond, ChessClock, RandomShuffle, Simulator
- Removed illegal `DangerButton` color overrides in RandomShuffle (violates CLAUDE.md)
- ChessClock Paper border `rgba(...)` → `var(--border)`
- Removed `themeConfig` import from CardList; replaced with `var(--primary)`

#### Polish
- Removed 19 `console.log` statements across Simulator, DeckSearch, Record
- Removed 5 unused color constants from Dice
- Fixed MUI v5 `<Grid item>` → v6 `<Grid size>` in Record and the then-existing DeckEdit page
- Polished Record empty state (bordered card with i18n keys)
- Added loading spinner to Simulator during product card fetch
- DeckCreate card ±1 touch targets increased from 22px → 36px

---

---

### Multi-game platform restructuring (2026-05-17 session 2)

Expanded scope from a WS-only tool to a multi-game platform at `cardtoolbox.org`.

#### Game hub model

- `/` redesigned as a **Game Hub** — three clickable cards (Weiss Schwarz / 麻将 / 通用工具) replacing the old update/todo home page.
- Routes reorganised into section namespaces: `/ws/*`, `/mahjong/*`, `/tools/*`.
- All old flat paths (`/cardlist`, `/mahjong`, `/dice`, etc.) kept as `<Navigate replace>` redirects.

#### Route changes

| Old | New |
|-----|-----|
| `/cardlist` | `/ws/cards` |
| `/pick_packs` | `/ws/packs` |
| `/simulator` | `/ws/simulator` |
| `/record` | `/ws/record` |
| `/audio` | `/ws/audio` |
| `/first_second` | `/tools/first-second` |
| `/shuffle` | `/ws/shuffle` (moved from tools to WS) |
| `/mahjong` | `/mahjong/trainer` |
| `/dice` | `/tools/dice` |
| `/chess_clock` | `/tools/clock` |

DeckCreate and DeckSearch were removed from routes and NavBar before being deleted entirely; there is no active redesign track for them now.

#### NavBar redesign

- Replaced MUI AppBar + hamburger/drawer with a **Tailwind floating pill** (Raycast-style).
- Primary pill: frosted glass white (`rgba(255,255,255,0.86)`) + Spring Rain border.
- Initial mobile nav used a secondary horizontal-scroll pill; this was later replaced by the Raycast-style hamburger dropdown documented below.
- Language toggle: replaced MUI ToggleButtonGroup with a minimal single `<button>` showing current locale.
- Added Tailwind CSS v3 (`tailwind.config.js`, `postcss.config.js`) with `preflight: false` to coexist with MUI.

#### Dead code removed

- `src/hooks/useTheme.js` — never imported by any page
- `src/hooks/useThemeVariables.js` — never imported by any page
- `src/theme/themeConfig.js` — deprecated, only used by the above two

#### AudioBoard improvements

- Loading state: wave skeleton cards while fetching track list.
- Track tiles: show format badge (e.g. `MP3`) and duration (prefetched via `preload="metadata"` — only a few KB per file, no full download).
- Player bar: appears when a track is selected. Controls: prev / play-pause / next / loop toggle / volume slider with mute. Progress bar with seek support (mouse + touch). Current time and total duration display.
- EQ animation bars on the active playing card (`eq-bounce` CSS keyframe, 4 bars with staggered delays).

---

### NavBar mobile dropdown (2026-05-17 session 2, cont.)

Replaced the secondary scrollable pill (second row below the primary pill) with a hamburger-triggered dropdown menu, matching Raycast.com's single-pill-with-dropdown pattern.

- Mobile only: `≡` / `✕` toggle button in the primary pill (right side, game sections only)
- Dropdown panel: `position: absolute`, same frosted-glass style as the pill, anchored 6px below
- Animation: `height: 0 → auto` with `overflow: hidden` via framer-motion `AnimatePresence` — content grows downward from the pill edge rather than appearing as a separate floating window
- Easing: `[0.4, 0, 0.2, 1]` (Material ease-in-out) for height, separate 0.15s opacity fade
- Backdrop (`fixed inset-0 z-40`) closes the menu on outside tap; route changes also close it
- Spacer height simplified to `h-[64px] md:h-[72px]` always (no more conditional secondary-bar height)

---

### Codebase audit & cleanup (2026-05-18)

Systematic review of all active pages and locale files.

#### Locale file restructure
- **Root cause fixed**: `en.json` had `dice`, `chessClock`, `shuffle`, `record`, `deckEdit`, `deckCreate`, `deckSearch`, `deck` nested inside `pages.*`, but all pages use top-level keys like `t("dice.title")`. This meant every English translation for those pages silently fell back to the key name. Moved all affected keys to the top level to match `zh.json`.
- Removed duplicate `deckCreate` entry in `en.json` (`pages.deckCreate` was a duplicate of top-level).
- Both files now have identical key structure.
- Fixed `menu.firstSecond` duplicate in `zh.json`.
- Fixed stray comma formatting in both files.
- Updated `en.json` `login.registerSubtitle` to remove WS-specific copy.

#### NavBar mobile dropdown (completed)
- Replaced horizontal-scroll secondary pill with a Raycast-style hamburger dropdown.
- `height: 0 → auto` framer-motion animation with `overflow: hidden` gives a "grow from pill" feel.
- `AnimatePresence` handles exit animation; backdrop closes on outside tap.

#### Minor fixes
- `PickPacks.jsx`: removed `console.log` leaking seed algorithm internals to console.
- `App.jsx`: removed `/options-test` route and its lazy import (dev-only page).
- Deleted `src/components/LanguageToggle.jsx` (unused since NavBar switched to inline toggle).
- `Home.jsx`: Tools card entry now navigates to `/tools/first-second` (first item in section).
- Moved `FirstSecond` from WS section to Tools section (`/tools/first-second`).
- Deleted `src/pages/Tracker.jsx` (empty stub).

---

### Home page redesign & spacing standardisation (2026-05-18 session 3)

#### Home hub card redesign

Replaced the plain equal-card layout with visually distinct section cards:
- **Top accent bar** (5px): current section colours are WS green `#4f9b78`, Mahjong red `#d26a6a`, Tools blue `#5b84d6`
- **Icon + title + count row**: `StyleIcon` / `GridViewIcon` / `TuneIcon` in a tinted box; tool count displayed in accent colour
- **Chips** tinted in each section's accent colour with matching border
- **Hover**: `translateY(-5px)` + coloured shadow + accent border
- Grid: `xs:12 md:4` — adding a new section just adds another card, no layout changes needed
- Added `pages.home.*.count` locale keys to zh/en.json

#### Background images

Added `public/assets/home/{ws,mahjong,tools}.webp` as card backgrounds.
- White overlay `rgba(255,255,255,0.58)` keeps text readable; `0.44` on hover lets image show through more
- Accent colours were extracted from the images using ImageMagick histogram analysis

#### Page spacing standardisation

All active pages now consistently use `py: 3` (24px) on their root Container:
- `Home.jsx`: reduced from `py: 5` → `py: 3`; header `mb: 6 → 4`
- `Dice`, `ChessClock`, `RandomShuffle`, `PickPacks`, `FirstSecond`, `Simulator`: added `py: 3` (were missing entirely)
- Pages that were already correct: `AudioBoard`, `Record`

---

## Active development plan

### Phase 1 — Complete the mahjong engine ✅ DONE

**1A: Evaluator additions** (`handSimulator.js`) — complete
- ✅ 混老头, 三色同刻 (+ isGreen, isWind helpers)
- ✅ 7 standard yakuman: 大三元, 四暗刻, 字一色, 小四喜, 大四喜, 清老头, 绿一色
- ✅ 九莲宝灯 (tile-count check, decomposition-independent)
- ✅ 国士无双 added to canCompleteHand (`tileParser.js`)

**1B: Route analyzers** (`yakuAnalyzer.js`) — complete
- ✅ `analyzeHonroutou()`, `analyzeSanshokuDoukou()` with EXAMPLES + MEANINGS

**1C: Bugs fixed along the way**
- ✅ Honitsu false-positive on pure-suit hands
- ✅ Chanta HIGH on closed all-triplet hands (no sequences)
- ✅ FEASIBILITY_ACHIEVED upgrade — 8 yaku had wrong `needed` text

**Test suite integrated:** `npm run test:mahjong` runs core shape/score tests, yaku/yakuman tests, and ukeire Python-reference validation.

| File | Cases | Source |
|---|---|---|
| `test-shanten.js` | 17 | riichi.wiki |
| `test-shanten-extended.js` | 19 | MahjongRepository/mahjong |
| `test-agari.js` | 33 | MahjongRepository/mahjong |
| `test-ukeire.js` | 44 | local + reference-aligned |
| `test-yaku.js` | 54 | MahjongRepository/mahjong |
| `test-yakuman.js` | 33 | MahjongRepository/mahjong |
| `test-fu.js` | 20 | MahjongRepository/mahjong |
| `test-scoring.js` | 59 | MahjongRepository/mahjong |
| `validate-ukeire.js` | 38 pass / 10 skip | Python reference comparison |

**Test coverage note:** `test-yaku.js` checks "contains yaku ID" not "exactly these IDs only". Negative tests cover false-positive cases but unexpected extra yaku would not be caught. Acceptable for current scope.

---

### Phase 2 — Ukeire ✅ DONE (new standalone page)

New page `/mahjong/efficiency` — full Tenhou 牌理 parity.

**Files:**
- `src/utils/mahjong/ukeire.js` — core algorithm
- `src/pages/MahjongEfficiency.jsx` — page UI
- `test-ukeire.js` — algorithm test suite (44 cases)
- `validate-ukeire.py` + `validate-ukeire.js` — Python/JS cross-validation scripts

**Algorithm (`ukeire.js`):**
- `computeUkeire(concealedTiles, openMelds)` — for each unique discard: tries all 34 draws, collects tiles where `shanten(original - discard + draw) < originalShanten` (Tenhou's exact condition)
- `computeWaits(concealedTiles, openMelds)` — tenpai waiting tiles with remaining counts
- `analyzeEfficiency(concealedTiles, openMelds)` → `{shanten, ukeire, waits}`
- **Sort**: totalCount descending (matches Tenhou 牌理)
- **shantenAfter**: best shanten achievable after discarding + drawing optimally

**Key bugs found and fixed during development:**
1. `shantenAfter` used post-discard 12-tile shanten → changed to best post-draw shanten
2. Sort order wrong (by shantenAfter) → changed to totalCount desc (Tenhou standard)
3. Effective tile condition used `sh < shantenAfterDiscard` → changed to `sh < originalShanten` (Tenhou's `F(f) == q-1` condition); this prevents bad discards from showing spurious "effective" tiles

**Verification:** directly extracted and ran Tenhou's `1008.js` algorithm; cross-validated against MahjongRepository/mahjong Python library (38 test cases pass). Hand `5779m168p268s1147z` (14-tile) matches Tenhou exactly.

**UI:**
- Text notation input (real-time sync: `123m456p789s11z`)
- Auto-analysis on every tile change (no button needed)
- Compact horizontal row layout: [打出 tile] → [eff tiles ×N...] [total张]
- Click any row for depth-2 drill-down (after-discard hand + next waits/ukeire)
- Tenpai badge on rows where discard leads to tenpai
- Bad discards (worsen shanten) shown dimmed at bottom

### Phase 3 — 牌理页面 Tenhou 完整对齐 ✅ DONE

| 项目 | 状态 | 说明 |
|---|---|---|
| URL 状态保存 (`?q=`) | ✅ | 刷新保留手牌，可分享链接，格式与 Tenhou 一致 |
| 14张摸牌视觉提示 | ❌ 取消 | 13张无"摸牌"概念，任务无意义 |
| 赤五支持 (`0m/0p/0s`) | ✅ | 牌面模型 `{red:true}`，选牌器新增赤五行，红色边框显示 |
| 随机摸牌按钮 | ✅ | 13张时显示「随机摸牌」按钮，按剩余张数加权随机 |
| 点击有效牌摸入 | ✅ | 点击分析列表中的有效牌直接加入手牌，继续分析 |

**主页导航动态化**：站点结构统一由 `src/config/siteStructure.js` 提供，`Home.jsx`、`NavBar.jsx` 和旧路由重定向共用同一份 section/nav/legacy redirect 配置。

---

### 牌理页面完善 & 主页导航重构 (2026-05-19 session 7)

#### 牌理页面 Tenhou 对齐补全

- **URL 状态保存**：手牌同步到 `?q=` URL 参数（`useSearchParams`），刷新页面后自动还原，可分享链接，格式与 Tenhou 牌理一致
- **随机摸牌按钮**：手牌达到等待张数（13/10/7/4，取决于副露数）时出现「随机摸牌」按钮，从剩余牌墙按权重随机抽一张，变为 14 张进入打牌决策分析
- **点击有效牌摸入**：分析结果里每张有效牌可点击，点击后该牌加入手牌，自动切换到 14 张打牌分析模式（`stopPropagation` 阻止触发行展开）
- **赤五（赤牌）支持**：
  - `tileParser.js`：解析 `0m/0p/0s` → `{suit, value:5, red:true}`；`generateHandString` 输出 `0` 表示赤五；`tileName` 返回"赤5万"等
  - `MahjongTile.jsx`：`tile.red` 时显示红色边框 + 浅红背景
  - `MahjongTilePicker.jsx`：新增「赤」行，含赤5万/赤5饼/赤5索三枚选牌
  - 赤五与普通五共享 `tileKey`，向听数/有效牌计算完全透明

#### 主页导航动态化

- `src/config/siteStructure.js` 是站点结构单一数据源，包含 section、nav group、首页 card metadata 和 legacy redirects
- `Home.jsx` 从 `SITE_SECTIONS` 自动派生卡片入口与 chips；chip 列表直接跟随 nav 结构展开，不再单独维护摘要配置
- `NavBar.jsx` 从同一份配置渲染桌面 dropdown 与移动端扁平菜单
- `App.jsx` 从 `LEGACY_REDIRECTS` 生成旧路径跳转
- 新增页面时优先更新 `siteStructure.js`，再补对应 route component

---

---

### 引擎改进：歧义分解 & 平和验证 (2026-05-19 session 8)

#### `extractAllHandGroups` — 歧义手牌修复

- **问题**：原 `extractHandGroups` 只返回第一个合法分解（DFS 首路径）。`223344m` 等歧义手牌漏掉依赖特定分解才能识别的役种（如对对和 vs 一杯口）
- **修复**：新增私有 `extractAllSets`（收集所有合法面子组合）和导出函数 `extractAllHandGroups`（枚举所有分解，上限 20 个）
- `handSimulator.js`：加 `findDecompWithYaku` helper，`findScenarios` 三处调用点升级为遍历所有分解
- `yakuBFS.js`：BFS 胜利判断也升级为遍历所有分解
- 验证：`111222333m+444p+55z` 正确返回 2 条分解，役种并集包含对对和 + 一杯口

#### 平和两面待验证

- **问题**：平和检测只验证「全顺子 + 非役牌雀头」，坎张/边张待（如 `[24p]→3p`）也被错误标记
- **修复**：新增 `checkRyanmenWait(concealedGroups, drawnTile)` 函数
  - 摸入低端（low ≤ 6）→ 两面待 ✓；摸入高端（high ≥ 4）→ 两面待 ✓；摸入中间 → 坎张 ✗
  - 在 `findTenpaiWins` 和 `findDiscardThenWin` 中，平和场景生成后加校验，非两面待则跳过
- 验证：`[23p]→1p/4p` 有精确场景 ✓；`[24p]→3p` 无精确场景 ✓；`[89m]→7m` 无精确场景 ✓

---

### 代码清理 & 历史 Backlog 清理 (2026-05-19 session 9)

#### 评分系统 UI 集成

- **MahjongTrainer**：`CompletedPanel` 在完整和牌时显示得点（番数、符数、荣和/自摸四种情境点数）
- **MahjongEfficiency**：`WaitsPanel` 为每张待ち牌单独计算并显示荣和/自摸得点

#### 历史 Backlog 清理

- **删除所有卡组管理页面**：DeckCreate、DeckSearch、DeckEdit 全部删除（无开发计划，git 历史保留）；App.jsx 移除相关路由和 lazy import
- **CardList useMemo deps**：`validLevels`/`validPowers`/`validCosts` 三个 `useMemo` 补充 `productList.level/power/cost` 依赖，消除 3 个 lint warning
- **i18n 补全**：PickPacks「已选择 N 包/等待选择」、Record「重置我方/对手信息」tooltip 提取为 locale key（zh + en）

历史 backlog 已清理；新的长期改进项单独记录在 Future backlog。

---

### 站点结构、首页公告与测试整合 (2026-05-19 session 10)

- **站点结构配置化**：新增 `src/config/siteStructure.js`，集中维护 section/nav/home card/legacy redirect 数据；`Home.jsx`、`NavBar.jsx`、`App.jsx` 已改为消费该配置
- **对战记录路由保护**：新增 `ProtectedRoute`，`/ws/record` 未登录时跳转 `/login`，登录成功后回到来源路径
- **最近更新栏**：首页功能卡片下方新增最近更新区块；更新内容抽离到 `src/data/recentUpdates.js`，locale 只保留栏目 UI 文案
- **PWA/品牌文案统一**：项目展示文案从旧 `WSToolBox` / WS-only 描述统一为 `CardToolBox` / 卡牌与桌游多合一工具集
- **麻将测试整合**：测试脚本补充失败退出码；麻将 utils ESM import 统一 `.js` 后缀；`package.json` 新增 `test:mahjong:core`、`test:mahjong:yaku`、`test:mahjong`
- **开发调试页清理**：删除未路由的 `OptionsApiTest.jsx`

---

### 麻将牌桌中枢初版 (2026-05-19 session 11)

- **新增页面**：`/mahjong/centrepiece`，参考开源项目 `mahtools/riichi-centrepiece` 的 3x3 牌桌中心布局。
- **导航接入**：`src/config/siteStructure.js` 的 Mahjong section 新增 `menu.mahjongCentrepiece`；首页麻将卡片自动显示 3 个工具。
- **路由接入**：`App.jsx` 新增 `/mahjong/centrepiece`，并保留 `/mahjong/centerpiece` → `/mahjong/centrepiece` 兼容跳转。
- **当前状态**：页面支持四麻/三麻、东风/半庄/一荘、局数、本场和重置；当前版本是可用原型，不是最终横屏桌面形态。

---

## Future backlog

- **CardList 分阶段拆分**：`CardList.jsx` 当前体积较大。后续如恢复查卡器数据更新或继续维护 WS 区，建议先抽 `useCardSearch()` hook，承接搜索请求、分页、loading、`result`、`form/draftForm` 等状态；再逐步拆 `CardSearchFilters`、`CardResultGrid`、`CardDetailDialog`、`RelatedCardsDialog`。该项复杂度较高，暂不作为近期任务。
- **牌桌中枢横屏重做**：`/mahjong/centrepiece` 目前是参考 `riichi-centrepiece` 的初版 3x3 网格。后续需要按真实“横屏设备放在桌面中央”的使用场景重新设计，目标是全屏、横屏优先、触控面积大、信息只保留局数/本场/场风/座风，避免普通网站页面感。
