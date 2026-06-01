# CardToolBox Frontend — Project Status

> Last updated: 2026-05-31 (session 36)

## Deployment

- **Production URL**: Cloudflare Pages (deployed from `main` branch)
- **Deploy method**: push `main` to `origin` → Cloudflare Pages auto-deploys
- **Backend**: `https://api.cardtoolbox.org` (WS card data, deck management, auth)
- **Dev proxy**: `/api` and `/audios` → `http://localhost:4000`

---

## Completed work (merged to `main`)

> Notes before editing this file:
> - The sections below include historical session records. Treat the summary tables and the newest dated entries as current state.
> - `src/config/siteStructure.js` is the source of truth for section nav items, home chips, home tool counts, and legacy redirects.
> - Do not hardcode section tool counts or section tool lists in locale files.

### Mahjong tools

A beginner-friendly Riichi Mahjong tool suite. See `CLAUDE.md` for full architecture details.

| Tool | Route | Status |
|---|---|---|
| Yaku route trainer | `/mahjong/trainer` | Active |
| Efficiency / ukeire | `/mahjong/efficiency` | Active |
| Table centrepiece | `/mahjong/centrepiece` | Active; mahtools-style 3x3 centrepiece below NavBar |

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

**Current trainer limitations (by design):** ukeire lives on the separate `/mahjong/efficiency` page; completed hands can show basic fu/han/point output but there is no full riichi/dora/ippatsu/win-condition workflow; Sanankou tsumo/ron is not enforced. Historical notes below may mention older limitations that were later fixed.

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
| `/audio` | `/tools/audio` |
| `/first_second` | `/tools/first-second` |
| `/shuffle` | `/ws/shuffle` (moved from tools to WS) |
| `/mahjong` | `/mahjong/trainer` |
| `/dice` | `/tools/dice` |
| `/chess_clock` | `/tools/clock` |

Additional compatibility redirect: `/ws/audio` → `/tools/audio`.

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
- Added `pages.home.*.count` locale keys to zh/en.json at the time; this was later removed because counts are now derived dynamically from `siteStructure.js`.

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
- **导航接入**：`src/config/siteStructure.js` 的 Mahjong section 新增 `menu.mahjongCentrepiece`；首页麻将卡片按 nav 结构自动显示工具 chips。
- **路由接入**：`App.jsx` 新增 `/mahjong/centrepiece`，并保留 `/mahjong/centerpiece` → `/mahjong/centrepiece` 兼容跳转。
- **当前状态**：已被 session 12 的 mahtools-style 重做取代，保留为历史记录。

---

### 牌桌中枢 mahtools-style 重做 (2026-05-20 session 12)

- **目标修正**：不再做强制横屏或覆盖整页的控制盘；页面只占用 NavBar 下方的内容区域，保持项目导航可见。
- **参考实现**：按 `mahtools/riichi-centrepiece/index.html` 的核心模式重做，而不是扩展成完整记分器。
- **当前交互**：
  - 3x3 网格：四个座风在四边，中央显示当前局数与本场。
  - 点击中央局数推进下一局；点击本场增加本场。
  - 角落控制：明暗模式、三麻/四麻、东风/半庄/一荘、重置。
  - 非初始状态下点击三麻/四麻或场制按钮会重置，与 upstream 行为一致。
- **布局约束**：
  - 根容器使用 `position: fixed; top: clamp(64px, 9dvh, 80px); bottom: 0`，固定在 NavBar 下方，避免页面上下滚动。
  - 页面背景透明、无边框，让全局路由背景图透出。
  - 不使用 MUI；保持 Tailwind-only。
- **刻意不做**：暂不加入供托、分数、流局/荣和/自摸结算、手动设庄、历史栈，避免从“中枢”膨胀成完整记分器。

---

### 移动端 NavBar 子分区状态提示 (2026-05-20 session 12)

- **目标**：移动端进入 `/ws/*`、`/mahjong/*`、`/tools/*` 任一子分区后，让用户明确知道左侧品牌区可返回首页，同时显示当前所在分区。
- **实现**：
  - `NavBar.jsx` 的品牌按钮在移动端子分区显示一个左箭头图标；点击箭头或“卡牌工具箱”标题均返回 `/`。
  - 标题下方显示当前 section 名，而不是具体工具名：Weiss Schwarz / 麻将 / 通用工具。
  - 桌面端保持原设计，仍使用 section chip 和桌面导航。
- **动画**：
  - 使用现有 `framer-motion` / `AnimatePresence`。
  - 箭头进入/离开时做轻微横向位移 + opacity 过渡。
  - section 小字进入/离开时做轻微纵向位移 + 高度展开/收起。
  - 动画时长约 0.18s，使用 `[0.4, 0, 0.2, 1]` easing，保持轻量不抢注意力。

---

### 音效面板移入通用工具 (2026-05-20 session 12)

- **路由调整**：`AudioBoard` 从 `/ws/audio` 移动到 `/tools/audio`。
- **导航调整**：`menu.audio` 从 Weiss Schwarz 分区移除，加入通用工具分区。
- **兼容跳转**：`/audio` 和旧的 `/ws/audio` 都重定向到 `/tools/audio`。
- **首页同步**：通用工具卡片加入音效；首页工具数量和 chips 由 `siteStructure.js` 动态派生。

---

### 首页/导航数据边界清理 (2026-05-21 session 13)

- **单一数据源**：`src/config/siteStructure.js` 继续作为 section、nav item、home chip、工具数量和 legacy redirect 的来源。
- **派生 helper**：新增/使用 `getSectionToolItems()`、`getSectionToolCount()`、`getSectionToolLabelKeys()`，让 Home/NavBar 不再重复理解 nav 结构。
- **首页卡片**：
  - 工具数量由 `section.nav` 动态计算。
  - 工具 chip 由 nav item 的 `labelKey` 动态翻译生成。
  - section 简介保留为一句概览文案，不列出所有工具；具体工具交给 chips 展示。
- **Locale 约束**：`zh.json` / `en.json` 只保留 section 名称和一句简介，不维护 `5 个工具`、`4 tools` 或工具清单。
- **清理项**：删除/避免使用 `pages.home.*.count` 这类易过期 key；移动工具时只改 `siteStructure.js`，首页自动更新。

---

### 对战记录页 Phase 3 完成 + Phase 4 P5 战绩卡片导出 (2026-05-31 session 31–34)

#### Phase 3 完成

- **P2 列表分页** ✅：「加载更多」每次追加 20 条；修复编辑/删除/创建误触发分页重置 bug（移除 records 依赖，改为 applyPreset 和自定义日期变更时显式重置）
- **P3 关键字搜索** ✅：实时匹配 6 个字段，统计条和分析弹窗均跟随搜索结果

#### Phase 4 — P5 战绩卡片导出

采用 **html-to-image**（~50KB）替代手写 Canvas 方案，根本解决了 Canvas 路径坐标导致的形变 bug。

**技术架构：**
- `StatsCardView`：纯 React 组件 + inline styles，暗色主题（`#0d0d0d` 背景）
- `StatModule`：10 个模块各自独立组件，flexbox 布局，不会溢出
- `CardTrendChart`：内联 SVG 折线图
- `toPng(offscreenRef, { pixelRatio: 2 })`：截图脱离视口的隐藏容器，避免 overflow 裁切

**10 个可选模块：** 总战绩 / 当前连胜状态 / 历史最长连胜 / 先手後手胜率 / 最常用卡组 Top3 / 胜率最高卡组 / 最难/最容易对手系列 / 标签战绩 Top3 / 近期走势图

**导出流程（两步）：**
1. 弹窗勾选模块 → 点「预览」
2. 全屏黑色预览界面（可滚动查看完整卡片）→ 点「保存 PNG」

**截图不截断的关键设计：** 隐藏容器 `position: fixed; left: -9999px` 脱离视口，与可见预览分开渲染；明确传 `width/height` 给 toPng；导出前等待 100ms 确保渲染完成。

#### 其他优化

- 创建表单胜负选择器：未选中状态改为无色（与先手/後手按钮风格一致）
- 分页重置 bug root cause fix

---

### 对战记录页 Phase 2 完成 & Lint 修复 (2026-05-30 session 23–30)

#### Phase 2 全部实施完成

| 步骤 | 内容 |
|------|------|
| P7 批量重命名 | 卡组/系列名批量替换，pill 字段选择器 + toast 提示 |
| P1 服务端日期过滤 | 切换预设直接带日期参数请求后端，移除前端 useMemo 日期层 |
| P0 编辑记录 | 每条记录编辑弹窗，预填所有字段，提交走 PUT /update/:id |
| P6 先手/後手 | 创建/编辑表单加三选按钮，卡片顶部显示标记，分析走势 Tab 显示先後手胜率 |
| P8b 标签管理 | 展开/收起面板，创建/重命名（内联编辑）/删除（含确认警告）标签 |
| P8a 表单加标签 | 移除 tournamentName 输入框，加 TagSelector 多选；清理 localStorage 旧 key |
| P8c 标签过滤 | 查询 Tab 标签 pill 过滤，与 deckFilter 可叠加 |
| P8d 标签分析 | 分析弹窗「赛事」Tab 改为「标签」Tab，按 tags 分组统计（方案 X，重复计数） |

#### 新增组件

- **DateRangePicker**：react-day-picker v10，中文月历，范围高亮跟随分区主题
- **TagSelector**：多选标签 pill，从标签库选择，下拉展示未选标签

#### Lint 全量修复

全站 prop-types errors 从 75 → 0，涉及 7 个文件（AudioBoard、ChessClock、Dice、Login、PickPacks、Simulator、Record）

---

### 对战记录页 Phase 1 完成 (2026-05-30 session 22)

Phase 1 后端升级全部实施完毕，已推送 main 并部署生产环境（`pm2 restart ws-backend`）。

生产环境测试结果（12 项全部通过）：
- Schema：`goesFirst`、`tags` 字段存在，`tournamentName` 已移除 ✅
- GET /history 日期过滤正确返回区间内记录 ✅
- POST /api/tags 创建标签、重复创建返回 409 ✅
- GET /api/tags 按名称排序返回 ✅
- POST /create 支持 goesFirst、tags 新字段 ✅
- PUT /update/:id 编辑单条，白名单保护（tournamentName 被正确忽略） ✅
- DELETE /delete/:id 返回 204 ✅
- PUT /api/tags/rename 重命名标签并同步更新记录 ✅
- DELETE /api/tags/:name 硬删除（标签库 + 记录同步） ✅
- PUT /api/matches/rename 白名单保护（result 字段返回 400） ✅

注：`tournamentName` 已从 Schema 移除，生产环境现有记录中该字段在 API 层不可见。前端赛事相关功能暂时失效，Phase 2 完成后由标签系统接替。

---

### 对战记录页升级规划 (2026-05-30 session 21)

#### 架构决策

- **后端优先策略**：所有 Schema 变更和新 API 先完成并测试，再统一做前端改造，避免边等接口边写 UI
- **tournamentName 废弃**：原自由文本赛事名难以管理（大小写不一致、输入随机），替换为统一标签系统
- **标签系统设计**：
  - 新建 `Tag` 集合（`models/tag.js`），存储用户的标签库；`(userName, name)` 唯一约束
  - `Match.tags: [String]` 存标签名字符串（去引用，查询简单）
  - 用户预先创建标签（赛事名/练习赛/关键失误等），记录时从中多选
  - 标签重命名通过 `PUT /api/tags/rename` 同步更新 Tag 集合和所有 Match 记录

#### Phase 1 后端改动（已规划，待实施）

Match Schema 变更：移除 `tournamentName`，新增 `goesFirst: Boolean`、`tags: [String]`

新增 API：
- `PUT /api/matches/update/:id`（编辑单条）
- `PUT /api/matches/rename`（批量重命名卡组/系列名）
- `GET/POST/DELETE /api/tags`（标签库 CRUD）
- `PUT /api/tags/rename`（标签重命名，同步更新记录）

修改 API：
- `GET /api/matches/history` 新增可选 `?startDate=&endDate=` 参数

详细规范见 Near-term candidates 中「对战记录页升级计划」。

---

### 对战记录页优化 (2026-05-30 session 20)

#### 请求逻辑重构

- **问题**：每次切到「查询」tab 都全量 fetch；页面刷新后恢复 tabValue=1 但不自动加载数据（空列表）
- **架构调整**：
  - `records` state 拆分为 `rawRecords`（服务器原始数据）+ `records`（useMemo 按日期过滤）
  - `getHistory()` 只负责 fetch，不再做日期过滤
  - 日期过滤移到 `useMemo`，切换预设无需重新请求服务器
  - 新增 `hasFetchedRef`：首次访问查询 tab 才 fetch，后续切 tab 跳过
  - `useEffect` 恢复 localStorage 时若 tabValue=1 自动触发 fetch，修复刷新后空列表 bug
- **删除操作**同步改为 `setRawRecords`

#### 日期过滤 UI 重设计

旧设计：两个原生 `<input type="date">`（弹出浏览器原生日历，无法跟随主题）

新设计：
- **预设 pill 按钮**：全部 / 近 7 天 / 近 30 天 / 自定义；切换即时过滤，无需请求服务器
- **DateRangePicker 组件**（仅在「自定义」时展开）：
  - 触发器：单行按钮显示"M月D日 — M月D日"，含 ✕ 清除
  - 弹出月历：圆角白卡，中文月份/星期（日/一/二…六）
  - 范围高亮：起止日期深色圆形（`--text-muted`），中间日期淡色填充（`--primary`），跟随分区主题
  - 关闭：选完终止日期自动关闭，或点外部关闭
- **手动刷新按钮**：pill 行右侧图标按钮（RotateCcw），强制重新 fetch
- 新增依赖：`react-day-picker` v10（3KB gzipped，无额外依赖，完全 CSS 自定义）
- `datePreset` state 持久化到 localStorage，刷新后恢复；时间相对预设（近7天/近30天）恢复时重新计算

---

### 文档整理 & 移动端间距修复 (2026-05-30 session 19)

#### Backlog 清理

- 删除中优先级颜色 backlog 中的两条不可行/无必要项：`Home.jsx` SectionCard accent 色（首页在 hub 分区下无法引用各分区 CSS 变量，by design）、`NavBar.jsx` pill Spring Rain 硬编码（品牌色永远 Spring Rain，变量化无收益）
- `Record.jsx` 硬编码颜色全面修复：canvas export 用 `getComputedStyle` 读取 CSS 变量，SVG 走势图改用 `var(--primary)`/`var(--border)`/`var(--text-muted)`/`var(--card-background)`，胜负色统一改为 `var(--success)`/`var(--error)`（共 8 处）
- 低优先级 backlog 三条删除：`overflow-x hidden` 重复清理（无 sticky 使用，风险实为零）、页面顶部间距不一致（已知设计意图）、页面标题对齐方式（已知设计惯例）
- JPCardList / ENCardList 共享组件抽取分析（85% 代码可共享，约 2 小时工作量）移入 Deferred，触发条件：新增第三个卡牌列表页面时再做
- 新增 `/mahjong/defense` 守备分析页面构想至 Near-term candidates，含调研结论和算法分层规划

#### 移动端 NavBar 下方间距修复

- **问题**：移动端 pill 底部到页面标题距离 28px，比设计意图（4px）多出 24px
- **根源**：`PageTransition.jsx` 内层 Box 的 `py: { xs: 3, md: 4 }` 在移动端产生 24px 顶部内边距；Session 18 已去掉所有页面容器的移动端顶部 padding（`py-8 → pb-8`），但 PageTransition 未同步
- **修复**：`py: { xs: 3, md: 4 }` → `pt: { xs: 0, md: 4 }, pb: { xs: 3, md: 4 }`，桌面端和底部间距不受影响

---

### 性能审计 & 资产清理 (2026-05-30 session 18，第二阶段)

#### 性能审计发现的问题（按优先级）

| 优先级 | 问题 | 状态 |
|---|---|---|
| 🔴 | `public/assets/character/`+`event/`+`climax/` 共 39MB 无引用资产 | ✅ 已删除，public/ 从 56MB→17MB |
| 🟠 | PWA 图标缺失（只有 favicon.ico，无 192/512px PNG） | ✅ 已完成 |
| 🟠 | 背景图对 0.18 透明度过重（~1MB，可压缩至 ~100KB） | ✅ 已完成，缩至 1280×720 + q20，~1MB→196KB |
| 🟠 | PWA 图标 + index.html CRA 遗留语法修复 | ✅ 已完成 |
| 🟡 | Simulator 卡图无懒加载 | ✅ 三处 `<img>` 改为 `LazyImage`（结果网格×2、详情 Modal×1） |
| 🟡 | MahjongTrainer 14 个子组件无 `React.memo` | ✅ 8 个重渲染敏感组件加 memo，FixedHandBar/RouteCard 相关 callbacks 加 useCallback，测试 279/279 通过。Bug 修复：`useCallback` 漏加 import 导致白屏，已补。 |
| 🟢 | Record.jsx 两个 useEffect 无 cleanup | ✅ 误报——实际只有 1 个 useEffect 且是同步 localStorage 读取，无需 cleanup |
| 🟢 | `chunkSizeWarningLimit: 1000` 过高抑制警告 | ✅ 改回默认值 500，构建时 MUI chunk 警告重新可见 |

---

### 主页 SectionCard 视觉优化 (2026-05-30 session 18)

- **Accent 色对齐分区主题**：`siteStructure.js` 中三个分区的 accent 色更新为各自 `--text-muted` 值——WS `#4f9b78`→`#277d0e`（harlequin-700）、麻将 `#d26a6a`→`#be1e3e`（cardinal-700）、工具 `#5b84d6`→`#27553f`（spring-rain-700）。工具分区原本是蓝色，现已对齐绿色主题。
- **蒙版加白提升可读性**：白色蒙版从 `rgba(255,255,255,0.58)` 提升到 `0.78`，hover 时降至 `0.65`；同时将 `onMouseEnter/onMouseLeave` 命令式 JS 改为 Tailwind `group`/`group-hover:` 纯 CSS 实现，消除 hover 状态卡住的 bug。
- **布局紧凑化**：Body padding `p-5`→`p-4`，内部间距 `gap-3`→`gap-2`，图标盒 `w-10 h-10`→`w-8 h-8`，描述字号 `text-sm`→`text-xs`，chip 间距 `gap-1.5`→`gap-1`，色条高度 `h-1.5`→`h-1`。

---

### 查卡器 UI 全面汉化 & 交互重设计 (2026-05-31 session 36)

#### 全站 UI 汉化（JP/EN 同步）

- **20 处英文硬编码全部 i18n 化**：卡片详情弹窗（Level/Cost/Power/Soul/Trigger/Traits/Expansion/Effect/Ability Text/Flavor/Related Cards）、筛选面板（All、Loading…、No results、Trigger type）、所有输入框 placeholder（商品名→例：Fate/stay night、系列→例：刀剑神域、稀有度→例：RR、系列代号→例：SAO）。JP 复用 `pages.cardList.*` 已有键，EN 新增 `enCardList.*` 键。
- **`CardDetailModal` 补加 `useLocale()`** 修复因缺少 `t` 导致的白屏。

#### 筛选输入框交互重设计

- **选中后锁定为 tag 模式**：`FilterCombobox` 和 `NeoCombobox`（JP 双语）选中后 `Combobox.Input` 改为 `readOnly + pointer-events-none`，深色背景白字，边框透明，`pr-8` 预留 × 按钮空间。原生 `<input>` 天然截断超长文字，彻底解决 flex 布局撑宽问题。`TriggerCombobox`（Listbox）同步采用 `<input readOnly>` 呈现选中态。
- **`Combobox.Options` 条件渲染**：仅在无值时渲染，选中后不触发下拉。

#### 激活筛选视觉强化

- **圆点指示器**：筛选面板所有 11 个标签（关键词/系列/系列代号/商品/触发/稀有度/卡片类型/魂/颜色/阵营/等级/费用/攻击力）均加 `1.5×1.5` 实心圆点，激活时可见，未激活时 `invisible` 占位（不产生布局抖动）。标签文字同步由 `text-[var(--text-secondary)]` 切换为 `text-[var(--text-muted)]`。
- **range 标签修复**：等级/费用/攻击力 label 从 `w-10 tracking-widest` 改为 `w-12 tracking-wide`，防止"攻击力"加圆点后换行。

---

### 查卡器样式 & 功能修复 (2026-05-31 session 35)

#### 样式改进（JP/EN 查卡器同步）

- **颜色筛选按钮重设计**：未选中态改为白底 + 黑色实线边框 + 黑色字母（`border-solid border-black`），选中态变为对应颜色填充；彻底解决原先"已选中"难以识别的问题。全局 `button { border: none }` 重置需配合 `border-solid` 显式覆盖。
- **卡片类型汉化**：筛选按钮和详情 Modal 的 card_type 均通过 `t()` 翻译。JP 复用 `pages.cardList.cardTypes.*` 键（キャラ→角色、イベント→事件、クライマックス→高潮），EN 新增 `enCardList.cardTypes.*` 键（Character/Event/Climax → 角色/事件/高潮）。`CardDetailModal` 补加 `const { t } = useLocale()` 解决白屏。
- **颜色名称汉化**：筛选按钮 title、字母标签、详情 Modal 颜色 badge 均改用 `t("pages.cardList.colors.${value}")`（已有键，直接复用）。
- **Level / Cost / Power 各加重置按钮**：行尾加 `RotateCcw` 小按钮，范围未修改时 `opacity-0 pointer-events-none` 占位，修改后显现并点击复位。
- **Trigger 图标化**：从 `en.ws-tcg.com` 官方网站下载 11 种 trigger GIF（soul/2soul/gate/standby/pool/shot/return/comeback/treasure/choice/draw），存入 `public/assets/triggers/`。筛选下拉改为 `TriggerCombobox`（Listbox），选中显示图标，选项显示图标+文字；详情 Modal trigger 改为图标行。`discovery` / `chance` / `focus` 三个 JP 专属 trigger 无官方 GIF，保留文字降级。图标背景为官方 GIF 本身的黑色底（非 CSS 造成），待后续处理。

#### 功能修复

- **关联卡双向展示**：后端 `attachRelatedCards`（JP/EN）改为同时查询 outgoing（`cardno.$in`）和 incoming（`related_cardnos.$in`）两个方向，`Promise.all` 并发后合并 Set，确保「提到这张卡的卡」也出现在相关卡里。
- **点击相关卡重新 fetch**：`CardDetailModal` 的 `onRelatedCardClick` 改为重新调 `/api/cards/jp?cardno=X` 取完整数据（含 `related_cards`），解决点进相关卡后 Modal 里关联卡为空的问题；fetch 失败时降级使用原轻量对象。

---

### 优化收尾 & 查卡器改进 (2026-05-30 session 18)

#### 性能优化 backlog 清理

- **首页 GitHub commits 缓存**：localStorage + 24 小时 TTL，命中缓存零网络请求，避免 GitHub API 60次/小时限速。
- **index.css body 死代码**：删除语义错误且永远不生效的 `color: var(--background)` 声明。
- **NavBar MUI Icons → Lucide**：`ArrowBackIosNewIcon`→`ChevronLeft`、`KeyboardArrowDownIcon`→`ChevronDown`、`MenuIcon`→`Menu`、`CloseIcon`→`X`。NavBar 不再 import `@mui/icons-material`。
- **LoadingFallback 颜色规范**：inline style 改为 Tailwind className，`color: "#2a5b46"` → `text-[var(--text-muted)]`。
- **路由背景动画重设计**：移除 `blur(10px)` + scale，改为 opacity + spring scale（stiffness 80/damping 20/mass 0.8）。入场 1.04→1 自然落定，出场 0.2s 快速淡出，纯 GPU 合成。
- **LazyImage shimmer 骨架**：文字占位符改为 `animate-pulse bg-[var(--card-background)]` 全尺寸 shimmer，条件从 `!isInView` 改为 `!isLoaded`。
- **字体文件全部清理**：删除 `src/assets/fonts/` 全部 29 个文件（~30MB）及 index.css 4 个 `@font-face` 声明。BIZUDPMincho 因名称不匹配从未实际加载，删除无视觉影响。

#### 移动端 responsive 优化

- **页面顶部间距**：所有页面容器 `py-8 sm:py-10` 拆分为 `pb-8 sm:py-10`（移动端顶部 padding 清零），最终 NavBar pill 到 title 间距约 4px（spacer 64px - pill 底部 60px）。桌面端 `sm:py-10` 不变。涉及 14 个页面文件。

#### 查卡器修复 & 改进

- **稀有度筛选过滤 `-`**：JP `rarityOptions`、EN `options.rarity` 均加 `.filter((v) => v !== "-")`，去除数据库占位值出现在下拉列表中。
- **CardImage 长宽比自动检测旋转**：废弃基于 `cardType`/`rarity` 的旋转判断，改为 `LazyImage` 的 `onNaturalLoad(w, h)` 回调检测实际图片尺寸，`w > h` 才旋转。React 18 自动批处理保证 `isLoaded` 与 `isLandscape` 同帧更新，零闪烁。JP/EN 两个查卡器同步改造。`LazyImage` 新增 `onNaturalLoad` prop 供外部监听自然尺寸。

---

### 性能优化 & 分区颜色系统 (2026-05-29 session 17)

#### 性能优化

- **死亡依赖清理**：从 `package.json` 移除 18 个未使用依赖（全套图表库 echarts/apexcharts/recharts/@nivo 等、d3、react-draggable、react-zoom-pan-pinch、html2canvas、@mui/x-date-pickers、date-fns 等），删除 114 个 package。`vite.config.js` manualChunks 清理为 react-vendor / mui-vendor / motion-vendor 三项。
- **OptionsContext 按需加载**：将 `OptionsProvider` 移入 `Router` 内部，使用 `useLocation` + `hasFetchedRef` 实现懒加载——只有进入 `/ws/*` 时才触发 3 个 filter option API 请求，首页/麻将/工具页完全零请求。
- **LazyImage 优化**：`rootMargin` 从 `50px` 扩大到 `200px`，减少快速滚动时卡片白块弹出；删除无效的 `entry.target.observer?.disconnect()` 代码。

#### 分区颜色系统（`data-section`）

**架构：** 路由切换时由 `RouteBackground`（App.jsx）将 `document.documentElement.dataset.section` 设为当前 section key（`ws` / `mahjong` / `tools` / `hub`）。各分区在 `index.css` 中通过 `[data-section="ws"]` 等选择器覆盖 CSS 变量，实现零 JS、纯 CSS 的主题切换。

**WS 分区 — Harlequin 绿（`[data-section="ws"]`）：**
- 调色板：harlequin（鲜艳石灰绿），50–950 完整色阶
- 主色 `--primary` = harlequin-200 (#b9fa9c)，按钮/强调 `--text-muted` = harlequin-700 (#277d0e)
- WS 页面已全部使用 CSS 变量，变量覆盖自动生效，无需改动组件
- `PickPacks.jsx`：动画 glow 改用 `color-mix(in srgb, var(--primary-dark) …)` 跟随主题；错误色替换为 `--error`/`--reset` 变量

**麻将分区 — Cardinal 红（`[data-section="mahjong"]`）：**
- 调色板：cardinal（深红），50–950 完整色阶
- 删除旧 `.mahjong-black-theme` 全局覆盖，改由 `data-section` 接管
- `MahjongTrainer.jsx`、`MahjongEfficiency.jsx`、`MahjongTilePicker.jsx`：全部 `text-black`/`border-black`/`bg-black`/`bg-gray-*` 替换为 CSS 变量
- `FEASIBILITY_CONFIG` borderColor 从硬编码 `#000000` 改为对应变量
- MahjongTile 牌面颜色（`#111`/`#fff`）保持不动——牌面始终黑白

**主页（hub）：** 沿用默认 Spring Rain 变量，暂无覆盖。

**工具分区（tools）— Spring Rain 新版（`[data-section="tools"]`）：**
- 调色板：spring-rain 重新定义版（50–950 完整色阶，色值与 hub 默认不同）
- 主色 `--primary` = spring-rain-200 (#bedcc8)，按钮/强调 `--text-muted` = spring-rain-700 (#27553f)
- `AudioBoard` slider glow 改用 `color-mix(in srgb, var(--primary) 30%, transparent)`

#### Bug 修复（session 17）

- **OptionsContext StrictMode 竞态**：`hasFetchedRef.current = true` 原本在 fetch 启动时设置，导致 React 18 StrictMode 双 mount 下：第一次 fetch 被 `active = false` 丢弃，第二次 mount 被 ref 拦截不再 fetch，JP 查卡器 level/cost/power 三个范围选项永远显示 Loading。修复：将 `hasFetchedRef.current = true` 移至数据成功写入 state 之后。
- **PickPacks Stepper `+` 按钮被裁剪**：`<input type="number">` 默认 `min-width: auto` 使 input 无法在 flex 容器内充分收缩，将 `+` 按钮挤到 `overflow-hidden` 范围外不可见。修复：为 input 添加 `min-w-0`。
- **PickPacks Stepper input 黑色边框**：`<input>` 未设置 `border-0`，浏览器默认边框在 `preflight: false` 下直接透出。修复：添加 `border-0`。同时为 `−`/`+` 按钮添加 `border-r`/`border-l` 分隔线并统一使用 `text-[var(--text-muted)]`。

---

### WS 筛选体系重构：Neostandard + filter_option (2026-05-29 session 15)

#### filter_option 重命名与清理

- 后端 `productList.json` 重命名为 `filter_option.json`，API 端点 `/product-list` → `/filter-option`
- 删除所有 `deck_rules` 相关文件和路由（前端确认无任何页面消费 `deckRules`）
- `OptionsContext` 移除 deck_rules 请求、移除静态 fallback（所有数据强制从后端拉取）
- `optionsLoading` 初始值改为 `true`，避免加载前误认为数据就绪

#### Neostandard 系列筛选

**JP 查卡器（CardList.jsx）**
- 系列筛选从 195 条 `series` 字段（JP 语义混杂）改为 162 条 Neostandard 官方标题
- 数据来自后端 `/filter-options` API 的 `sides[]`，`title_number` 解析为 series_number 代码列表
- 选中系列 → 翻译为对应 `series_number` 列表 → 发送 `?series_number=CODE1,CODE2,...`（`$in` 查询）
- Autocomplete 显示 `日文名（中文名）` 双语格式

**EN 查卡器（ENCardList.jsx）**
- 系列筛选从 209 条 `product_name` 改为 80 条 Neostandard 标题
- 数据来自 `en.ws-tcg.com/cardlist/` 下拉菜单，逐 title 翻页收集所有 series_number codes
- 同样通过 `series_number` `$in` 查询实现 franchise 级别过滤

**Record.jsx SeriesCombobox**
- JP/EN 切换按钮；JP 模式用 162 条 neostandard 标题（双语），EN 模式用 80 条 neostandard 标题

#### Neostandard 中文翻译体系

经过 5 轮 prompt 迭代测试，最终采用 **Bangumi API + DeepSeek LLM hybrid** 方案：

1. **Bangumi API 精确匹配**（`api.bgm.tv/search/subject`）→ 覆盖约 100/162 条
2. **Bangumi 变体匹配**（去括号、拆 ／ 组合等）→ 再覆盖 ~5 条
3. **LLM fallback**（专用 prompt，引用 Bangumi.tv/维基百科/萌娘百科）→ 剩余 ~57 条
4. **手动 override 表** → 8 条已知问题修正

翻译结果存入 `filter_translations.json` 的 `neostandard` 字段（162 条）。生成脚本（`generate_filter_data.py`）已集成增量更新逻辑：新系列出现时自动走 Bangumi→LLM 流程补充翻译，已翻译条目不重复调用。

#### JP/EN routes 改进

- `jpRoutes.js` / `enRoutes.js`：`series_number` 参数新增逗号分隔 `$in` 支持（与 `series` 保持一致）

---

### FirstSecond 迁移至 Tailwind + 翻牌动画重设计 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：`Container`/`Typography`/`Box`/`PrimaryButton` 全部替换为 Tailwind
- **翻牌动画**：CSS 3D flip（`perspective` + `preserve-3d` + `backface-visibility`，500ms cubic-bezier 过渡）；点击前显示 `ws_cardback.png` 牌背，点击后翻转揭示先攻/後攻卡图
- **结果显示**：先攻红色、後攻蓝色大字，翻牌完成后显示在卡片下方
- **交互**：点击卡片或「决定」按钮均可触发；翻开后显示「再次决定」按钮（带 RotateCcw 图标）重置
- **locale**：新增 `firstSecond.again` 键（zh: 再次决定 / en: Decide Again），更新 subtitle 文案

---

### RandomShuffle 迁移至 Tailwind + 可视化重设计 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：`Container`/`Typography`/`Grid`/`Paper`/`Stack`/`Divider`/`Chip`/`GenerateButton`/`DangerButton` 全部替换为 Tailwind；MUI icons 替换为 Lucide（`Shuffle`/`RotateCcw`/`Minus`）
- **进度条可视化**：每个卡格底部添加绿色填充条，高度按该格数值占最大值的比例计算，直观展示各组相对大小
- **统计眉头**：第 N 次生成 / 组数 / 总点数，移除无意义的「平均」项（工具目的是打散固定 50 张，平均无意义）
- **0 值降调**：opacity-40 + 文字颜色降调，视觉上明确区分
- **按钮布局**：生成（主）+ 清空（次）左对齐，「全部-1」靠右，条件显示

---

### Dice 迁移至 Tailwind + 交互重设计 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：所有 MUI 组件和 MUI icons 移除，framer-motion 按钮动画改为 CSS transition
- **骰子面数快捷按钮**：每组显示 `D4 D6 D8 D10 D12 D20 D100` 快捷选项，点选即切换
- **步进器输入**：面数和数量改用 `−/数字/+` 步进器，替代 MUI TextField，移动端友好
- **多组管理**：单组时隐藏删除按钮，多组时各行右上角显示 Trash2 删除
- **结果展示**：圆角方块展示每个点数，同组多骰时最大值高亮深色背景
- **操作区**：投掷（主）+ 添加骰子（次）左对齐，重置靠右

---

### ChessClock 迁移至 Tailwind + 大面板重设计 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：所有 MUI 组件、MUI icons、framer-motion 移除；Dialog 改为原生 modal
- **大面板布局**：两个玩家面板各占约 36vh，点击整个面板即切换计时，移动端对战体验大幅提升
- **时间数字极大居中**：`clamp(3rem, 10vw, 5rem)` 响应式字体，时间是页面视觉重心
- **Active 状态**：左侧绿色竖条 + 轻微背景色 + 脉冲绿点「计时中」指示
- **去掉冗余 Switch 按钮**：点击对方面板即可切换，与 Switch 功能完全重复
- **控制区夹在面板之间**：总用时 / 暂停|继续 / 重置，紧凑小按钮不抢主视觉

---

### Home 迁移至 Tailwind (2026-05-29 session 15 cont.)

- **MUI 完全移除**：`Container`/`Box`/`Grid`/`Typography`/`Chip`/`IconButton`/`Link`/`Fade` 全部替换
- **MUI icons → Lucide**：`StyleIcon`→`Layers`，`GridViewIcon`→`LayoutGrid`，`TuneIcon`→`SlidersHorizontal`，`GitHub`→`Github`，`Email`→`Mail`
- **SectionCard**：背景图、accent 色条、悬停上移动效完整保留，用 Tailwind + inline style 实现
- **RecentUpdates**：彩虹色条、展开/收起完整保留，`Fade` 动画移除
- **Contact**：`IconButton`+`Link` → `<a>` + Tailwind，hover scale 效果保留
- **布局**：`max-w-3xl mx-auto` 替代 MUI Container

---

### Simulator 重设计：Tailwind + 箱级模拟算法 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：所有 MUI 组件、ButtonVariants 替换为 Tailwind + Headless UI Combobox
- **JP/EN 切换**：同 ENCardList 模式，JP 用 productList，EN 用 enProductList
- **版本规格 Preset**：
  - 经典规格（16包×8张）：RRR×1、RR×4、R×11、Climax×16 自动填充
  - EN 2024+（16包×9张）：无 RRR/RR 保底，第9张随机
  - JP 2026+（10包×8张）：RRR×1、RR×4，SR 留空
  - 自定义：全手动
- **标配稀有度表**：每种 rarity 填「每箱张数」，Preset 自动填充可手动调整
- **高稀有度独立面板**：SP/SSP/SEC/SIR/AGR/OFR 等自动归类，填「每 X 箱 X 张」（支持 1/2 箱和 2/1 箱两个方向）
- **新算法（箱级模拟）**：
  1. 先生成整箱固定卡池（按每箱张数）
  2. 对高稀有度：整除部分保证加入，余数部分按概率掷骰
  3. 剩余槽位由未配置稀有度的卡填充
  4. 洗牌后逐包分配（有限制抽取，非无限重复采样）
- **结果展示**：稀有度分组（超高稀有优先）+ 折叠式逐包详情 + 卡详情左图右文 modal

---

### Login 迁移至 Tailwind (2026-05-29 session 15 cont.)

- **MUI 完全移除**：所有 MUI 组件、ButtonVariants、Login.css 移除
- **MUI icons → Lucide**：`Person`→`User`，`Lock`→`Lock`，`Visibility/Off`→`Eye/EyeOff`，`LoginRounded`→`LogIn`，`PersonAddRounded`→`UserPlus`
- **Toast 组件**：原生实现替代 `Snackbar`+`Alert`，固定定位居上，4秒自动关闭，成功/错误颜色区分
- **输入框**：左侧图标绝对定位，密码右侧显示/隐藏切换按钮
- **分割线**：flex + border-t 替代 MUI `Divider`+`Chip`

---

### AudioBoard 迁移至 Tailwind + 固定播放器栏重设计 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：所有 MUI 组件和 MUI icons 移除，MUI Slider → 原生 `<input type="range">` + 自定义 CSS
- **MUI icons → Lucide**：Play/Pause/SkipBack/SkipForward/Repeat/Volume2/VolumeX/Music
- **播放器栏固定底部**：`position: fixed; bottom: 0`，白色磨砂玻璃，全宽进度条在顶部，控制区三段（曲名｜播放控制｜循环+音量）
- **曲目卡片**：frosted glass，活跃态绿色边框 + 淡绿背景，播放中 EQ 动画条
- **进度/音量 RangeInput**：CSS 变量 `--pct` 驱动填充渐变，webkit/moz 均适配
- **加载态**：Tailwind `animate-pulse` 骨架屏替代 MUI Skeleton
- **后端修复**：`/api/audios/file/:name` 新增 `Cross-Origin-Resource-Policy: cross-origin` 头，解决 `new Audio(url)` 跨域被 helmet 拦截的问题

---

### PickPacks 迁移至 Tailwind + 视觉优化 (2026-05-29 session 15 cont.)

- **MUI 完全移除**：Container/Box/Grid/Typography/TextField/Snackbar/Alert 全部替换，framer-motion 移除
- **ButtonVariants → 原生 Tailwind 按钮**
- **步进器输入**：`−/数字/+` 替代 TextField，复用 Dice 页的 Stepper 组件
- **输入计数预览**：步进器下方显示 `X / Y 包` 大字预览
- **包格子视觉优化**：
  - 包尺寸从 56px 放大到 72px
  - 选中态：`scale(1.1)` + `drop-shadow` 绿色光晕
  - 点亮动画：点击开包时触发 `pack-light` keyframe（快速放大+光晕，再稳定）
  - 未选中降透明度到 20%
- **选中 pill 列表**：结果以深色圆形 badge 横排展示
- **小记区默认折叠**：「背后的故事 ▾」点击展开，保持主功能区整洁
- **Toast 错误提示**：复用 Login 的 Toast 组件

---

### JP 查卡器新界面 & MUI 迁移完成 (2026-05-29 session 16)

- **`JPCardList.jsx` 正式上线**：以 `ENCardList.jsx` 为 UI 模板，重写 JP 查卡器。零 MUI，完整 Tailwind。路由 `/ws/cards` 切换至新页面。
- **旧 `CardList.jsx` 删除**：2289 行 MUI 页面已移除，仅保留 git 历史。
- **`ButtonVariants.jsx` + `AnimatedButton.jsx` 删除**：随 CardList 一起清理，全站不再有任何 MUI 按钮组件。
- **JP 专有差异**（相对 ENCardList）：
  - 数据来自 `useOptions()`（`productList`/`jpNeostandardMap`/`translationMap`），不重复 fetch
  - `card_type` 值为日文（`"クライマックス"` / `"キャラ"` / `"イベント"`）；Climax 旋转判断使用日文值
  - Side 增加 `ws` 选项；Color 增加 `purple`；Soul 参数用 `soul=1`（非 `soul_min`）
  - Neostandard 下拉显示 `日文名（中文名）` 双语格式（`NeoCombobox` 组件）
  - 卡图格显示 `zh_name`；详情 Modal 显示 `zh_effect` / `zh_trait` / `zh_flavor`

**全站 MUI 迁移至此完成。** 所有页面组件均为 Tailwind-only。NavBar 保留 MUI 岛屿（Avatar/Badge/Snackbar/Tooltip/Menu/MenuItem）；`PageTransition.jsx` 保留 MUI（基础设施组件）。

#### 迁移完成后全面审计

对 `src/pages/` 和 `src/components/` 做系统检查，修复以下硬编码颜色：

- `LazyImage.jsx`：占位背景色 `#f5f5f5` → `var(--card-background)`，占位文字色 `#666` → `var(--text-muted)`
- `Home.jsx` Divider：`rgba(166,206,182,0.28)` → `var(--border)`

其余检查全部通过：无 MUI 残留、无删除文件残引、无 BACKEND_URL 违规、无孤立页面、zh/en locale 结构完全对齐。

---

## Future backlog

### 性能 & 维护优化（2026-05-29 审计，按优先级排序）

> 以下条目来自一次系统性代码审计。☑ 表示已完成。

#### ★★★ 高优先级（简单、收益大）

- [x] **清理死亡依赖**：`package.json` 中安装但代码中一处都没有 import 的库：所有图表库（`echarts`/`echarts-for-react`、`apexcharts`/`react-apexcharts`、`recharts`、`react-chartjs-2`/`chartjs-plugin-datalabels`、`@nivo/core`/`@nivo/pie`）、数据可视化（`d3`、`d3-interpolate`、`d3-scale-chromatic`）、`react-draggable`、`react-zoom-pan-pinch`、`html2canvas`（Record.jsx 用原生 Canvas API）、`@mui/x-date-pickers`、`@date-io/date-fns`、`date-fns`。同步清理 `vite.config.js` 中对应的 `manualChunks` 条目。删除 114 个 package。
- [x] **OptionsContext 按需加载**：将 `OptionsProvider` 移入 `Router` 内部以支持 `useLocation`；加 `hasFetchedRef` 确保只 fetch 一次；`isWsRoute` 判断使非 WS 页面（首页/麻将/工具）完全不触发这 3 个请求。
- [x] **LazyImage rootMargin 扩大**：`rootMargin: “50px”` → `”200px”`，快速滚动时减少图片白块弹出感。同时删除 `entry.target.observer?.disconnect()` 无效代码。
- [x] **LoadingFallback 硬编码颜色修复**：inline style 全部换为 Tailwind className，颜色改为 `text-[var(--text-muted)]`。

#### ★★★ 颜色系统重设计（部分完成）

> 四分区颜色系统已全部实施完成。
>
> | 分区 | 调色板 | 主色 | 按钮/强调 |
> |---|---|---|---|
> | `hub`（主页） | Spring Rain 原版 | `#a6ceb6` | `#52675a` |
> | `ws` | Harlequin 绿 | `#b9fa9c` | `#277d0e` |
> | `mahjong` | Cardinal 红 | `#f8a9af` | `#be1e3e` |
> | `tools` | Spring Rain 新版 | `#bedcc8` | `#27553f` |
>
> **已完成：**
> - `data-section` attribute 机制（App.jsx RouteBackground）
> - `[data-section="ws"]` harlequin 绿变量；`PickPacks` 动画 glow 改用 `color-mix`
> - `[data-section="mahjong"]` cardinal 红变量；组件全量颜色迁移，删除 `.mahjong-black-theme`
> - `[data-section="tools"]` spring-rain 新版变量；`AudioBoard` slider glow 改用 `color-mix`
>
> **遗留待处理（不阻塞当前功能）：**
> - [x] `App.jsx` LoadingFallback `#2a5b46` 硬编码 → `var(--text-muted)`
> - [x] `index.css` body 死代码 `color: var(--background)` 删除
> - [x] `Record.jsx` canvas export / SVG 走势图 / 胜负色 硬编码 hex → CSS 变量（canvas 用 `getComputedStyle` 读取，SVG 直接用 `var(...)`，win/loss 用 `--success`/`--error`）

#### ★★ 中优先级

- [x] **首页 GitHub API 缓存**：`Home.jsx` 改用 localStorage + 24 小时 TTL 缓存 commits 数据。命中缓存时零网络请求；缓存失效才 fetch 并更新；localStorage 不可用时静默降级。
- [x] **index.css body 死代码清理**：删除语义错误且永远不生效的 `color: var(--background)` 声明。
- [x] **NavBar MUI Icons → Lucide**：`ArrowBackIosNewIcon`→`ChevronLeft`，`KeyboardArrowDownIcon`→`ChevronDown`，`MenuIcon`→`Menu`，`CloseIcon`→`X`。`style={{ fontSize }}` 改为 `size` prop，颜色/opacity 改为 className。
- [x] **路由背景过渡动画重设计**：移除 `blur(10px)` + scale 动画，改为 opacity + spring scale（stiffness 80 / damping 20 / mass 0.8）。入场 1.04→1 自然落定，出场 0.2s 快速淡出。纯 GPU 合成，零 blur 计算开销。

#### ★ 低优先级 / 较大改动

- [x] **LazyImage 改为 shimmer 骨架**：删除文字占位符，改为 `animate-pulse bg-[var(--card-background)]` 全尺寸 shimmer div。条件从 `!isInView` 改为 `!isLoaded`，图片加载期间持续显示。颜色跟随分区主题变化。
- [x] **未使用字体文件清理**：删除 `src/assets/fonts/` 全部 29 个文件（~30MB）。BIZUDPMincho 因 `@font-face` 名称与代码引用不匹配从未实际加载，与其修复不如删除（修复反而引入 12MB 首次加载开销）。同步清理 index.css 中 4 个死 `@font-face` 声明。
- [x] **移动端页面顶部间距优化**：将所有页面容器的 `py-8 sm:py-10` 拆分为 `pb-8 sm:py-10`（移除移动端顶部 padding），使 title 尽可能靠近 NavBar。移动端 gap 最终为 4px（spacer 64px - pill 底部 60px），桌面端 `sm:py-10` 不变。涉及全部 14 个页面文件。

---

### Near-term candidates

- **对战记录页升级计划**（四期实施，基于 2026-05-30 全面代码审计 + 架构讨论）

  **背景与关键设计决策**：
  - 采用**后端优先策略**：Phase 1 完成所有 Schema 变更和新 API 并测试，Phase 2 再统一做前端改造
  - `tournamentName` 从 Match Schema **移除**，替换为统一标签系统
  - 标签库独立存储（Tag 集合），Match.tags 存字符串（去引用，查询简单）
  - 用户预先在标签库中创建标签（赛事名/练习赛/关键失误等），记录时从中多选

  ---

  **Phase 1 — 后端 Schema + API** ✅ 完成并已部署生产环境（2026-05-30）

  文件：`models/match.js`（改）、`models/tag.js`（新）、`routes/matchRoutes.js`（改）、`routes/tagRoutes.js`（新）、`server.js`（挂载）

  Match Schema 变更：移除 `tournamentName`；新增 `goesFirst: Boolean`（default: null）、`tags: [String]`（default: []）

  Tag 模型：`{ userName, name, createdAt }`，`(userName, name)` 唯一约束

  | 方法 | 路径 | 新/改 | 说明 |
  |------|------|-------|------|
  | POST | /api/matches/create | 不变 | 可传 tags、goesFirst |
  | GET | /api/matches/history | **改** | 新增可选 ?startDate=&endDate= |
  | DELETE | /api/matches/delete/:id | 不变 | — |
  | PUT | /api/matches/update/:id | **新** | 编辑单条，字段白名单保护 |
  | PUT | /api/matches/rename | **新** | 批量重命名卡组/系列名 |
  | GET | /api/tags | **新** | 获取用户标签库 |
  | POST | /api/tags | **新** | 创建标签（409 if 重复） |
  | DELETE | /api/tags/:name | **新** | 从库中删除（不影响已有记录） |
  | PUT | /api/tags/rename | **新** | 重命名（同步更新所有 Match.tags） |

  ---

  **Phase 2 — 前端核心改造** ✅ 完成（2026-05-30）

  实施顺序（已确认）：

  | 顺序 | 项目 | 依赖 | 状态 |
  |------|------|------|------|
  | 1 | P7 批量重命名 | 无 | ✅ |
  | 2 | P1 服务端日期过滤 | 无 | ✅ |
  | 3 | P0 + P6 编辑记录 + 先手/後手 | 无 | ✅ |
  | 4 | P8b 标签管理界面 | 无 | ✅ |
  | 5 | P8a 表单加标签 | P0、P8b | ✅ |
  | 6 | P8c 查询 Tab 标签过滤 | P8a | ✅ |
  | 7 | P8d 分析弹窗标签 Tab | P8a、P8c | ✅ |

  设计决策（已确认）：
  - 多标签统计：方案 X，记录贡献到所有标签，重复计数，各标签独立
  - 删除标签 UX：显示警告「将同时从 N 条记录中移除」
  - localStorage：Phase 2 移除 `tournamentName` key
  - 旧记录 tags=[]：不进入任何标签分组，自然过滤

  **P7 批量重命名**：查询 Tab 内工具入口，输入旧名称→新名称，确认后调 `PUT /api/matches/rename`，字段范围：playerDeckName / opponentDeckName / playerSeries / opponentSeries

  **P1 服务端日期过滤**：日期 preset 计算结果作为 query params 传后端，移除前端 records useMemo 日期过滤层

  **P0 + P6 编辑记录 + 先手/後手**：每条记录加编辑图标，弹窗复用创建表单；创建/编辑同时加先手/後手三选（先手/後手/未记录）；旧记录 goesFirst=null 视为"未记录"

  **P8b 标签管理界面**：独立入口（查询 Tab 内），支持新增/删除（含警告）/重命名标签

  **P8a 创建/编辑表单加标签**：移除 tournamentName 输入框，替换为从标签库多选的 Combobox；清理 localStorage tournamentName key

  **P8c 查询 Tab 标签过滤**：标签 pill 筛选，前端 useMemo 按 tags 过滤

  **P8d 分析弹窗标签 Tab**：原「赛事」Tab 改为按标签分组统计（方案 X，重复计数）
  ---

  **Phase 3 — 前端增强功能** ✅ 完成（2026-05-30）

  - **P2 列表分页** ✅：前端「加载更多」，每次追加 20 条，过滤条件变化自动重置
  - **P3 关键字搜索** ✅：搜索框实时过滤，匹配 6 个字段，统计条和分析弹窗均跟随搜索结果

  ---

  **Phase 4 — 创意功能**（进行中）

  - **P5 可组合式战绩档案图片导出**：用户勾选统计组件组合后导出 PNG（Canvas API）；组件种类、布局、风格待设计讨论
  - **P9 赛季总结报告**：每月/赛季末生成图文总结（Canvas），类似 Spotify Wrapped；是否与 P5 共用组件待定

  **Phase 5 — 未来功能扩展**（根据实际使用需求再决定）

  - **P4 扩展统计分析**：在现有 6 个分析 Tab 基础上新增维度；具体模块待使用中发现真实需求后再定，不提前设计。候选方向：赛事专项分析、时间段对比、对手卡组追踪、矩阵增强（按先後手分开）等

- **WS 卡片 DIY 制作页面**：新增 `/ws/card-maker` 路由，让用户自定义制作 WS 卡片并导出 PNG。核心功能：① 卡片属性填写（名称、等级/费用/力量/魂、颜色、类型、trigger、特征、效果文本、风味文本）；② 卡图上传（用户本地图片）；③ 实时预览——使用 Canvas API 按 WS 卡片标准比例（400×559 普通卡 / 559×400 Climax 横版）渲染卡面，叠加项目已有的边框/图标/排版素材（`public/assets/` 下已有大量相关资源）；④ 导出为 PNG（`canvas.toDataURL`）。纯前端实现，无需后端。复杂度较高，主要工作量在 Canvas 排版还原 WS 卡片设计规范。

- **移动端 NavBar 实机校验**：当前动画和布局已在代码层收敛，但仍建议用真实手机尺寸重点检查 `/ws/*`、`/mahjong/*`、`/tools/*` 的进入/返回状态：标题是否换行合理、箭头点击区是否足够、下拉菜单是否和品牌区动画冲突。该项不应引入新设计，只做小幅 CSS 微调。
- **首页组件拆分**：`Home.jsx` 已承担 section card、recent updates、contact links、布局容器等职责。建议先抽出 `SectionCard`、`RecentUpdates`、`ContactLinks` 到 `src/components/home/`，保持现有视觉不变，只降低页面文件复杂度。
- **`siteStructure.js` 约束强化**：继续把 `src/config/siteStructure.js` 作为单一数据源。下一步可补充轻量校验或更清晰的 helper/JSDoc，检查 nav item 是否有 `labelKey/path`、legacy redirect 目标是否仍存在、auth-only 工具是否被 Home/NavBar 正确过滤。目标是减少”移动一个工具但漏改首页/导航/跳转”的风险。
- **AudioBoard 通用化文案检查**：音效面板已经移到 `/tools/audio`，后续需要确认页面文案、空状态、错误提示不再暗示它只属于 WS。这个优化应以 locale 文案和小范围 UI 文案为主，不改变播放器逻辑。

- **麻将守备分析页面** `/mahjong/defense`：根据对手牌河和副露推理危险牌，帮助玩家训练场上信息读取能力。

  **调研结论（2026-05-30）**：主流平台（天凤、雀魂）均无内置的实时守备推理界面；商业工具 MahjongMasterAI 有类似功能但闭源收费；开源的 Akagi 通过拦截游戏 WebSocket 流量实现，不是独立工具。**纯前端教学型守备分析工具目前是空白，有做的价值。**

  **算法分层：**
  - 第一层（规则，确定性）：现物（Genbutsu）/ 筋（Suji）/ 壁・无机会（Kabe / No Chance）/ ワンチャンス — 查表即可，O(n)
  - 第二层（启发式，统计近似）：综合副露形态、打牌时机（早打/晚打）、Dora 接近度、中张/幺九权重加权评分
  - 第三层（AI，不做）：接入 Mortal 等深度学习模型，需后端，超出范围

  **实现范围：第一层 + 第二层，纯前端，不接 AI。**

  **所需输入：** 三家各自的牌河（含巡目顺序）+ 副露（吃/碰/杠内容）+ 自家手牌（用于壁/ワンチャンス 的可见牌计数）。

  **输出：** 对 34 种牌标注安全等级（现物 / 筋 / 壁 / ワンチャンス / 无保护），并附文字解释。

  **与现有引擎的关系：** 需新写守备推理逻辑，可复用 `tileParser.js` 的牌面模型；`shanten.js` 不直接复用。严禁在实现过程中修改现有引擎文件。

  **参考资源：** riichi.wiki/Defense、riichi.wiki/Suji、riichi.wiki/Kabe；开源参考 killer_mortal_gui（启发式评分权重设计）、Riichi-Trainer（Folding 模块交互模式）。


### Documentation candidates

- **文档结构进一步分层**：当前 `CLAUDE.md` 负责当前架构规则，`PROJECT.md` 同时保存当前状态和历史 session。后续可把较长历史迁移到 `docs/history.md`，把麻将引擎说明迁移到 `docs/mahjong-engine.md`，让 `PROJECT.md` 更聚焦当前状态、近期记录和 backlog。

### Deferred / high-complexity

- **JPCardList / ENCardList 共享组件抽取**（触发条件：新增第三个卡牌列表页面时再做）：

  两文件约 85% 代码完全相同，可共享约 1200 行。分析如下：

  **可直接抽取（无差异，各 ~5 分钟）：**
  `CardImage`、`PaginationBar`、`FilterCombobox`、`ValueListbox`、`RangeSelect` → `src/components/ws/`

  **需配置化抽取（~30 分钟）：**
  `CardDetailModal` 有 6 处实质差异：JP 显示 zh_name/zh_trait/zh_effect/zh_flavor，EN 无；
  JP 展开信息包含 series_number + series + product_name，EN 仅 product_name；
  effect 标签文本不同；Side badge 渲染方式不同。
  做法：带 `config` 对象的共享组件，JP/EN 各传不同配置。

  **Hook 层（~30 分钟）：**
  `useCardGroups`（变体分组）、`useCardSearch`（搜索/分页/重置）完全相同可直接抽；
  `buildParams` 的 soul 参数名不同（JP: `soul=1`，EN: `soul_min=1`），需参数化。

  **不可抽取：** NeoCombobox（JP 专用双语组件）、CARD_TYPE_OPTIONS（JP 日文 vs EN 英文）、
  COLOR_OPTIONS（JP 含 purple，EN 无）、SIDE_OPTIONS（JP 含 ws，EN 无）、
  数据加载方式（JP 用 OptionsContext，EN 自己 fetch）。

  **建议执行顺序：** P0 纯 UI 组件（30 min）→ P1 CardDetailModal + Hook（60 min）→ 验证（30 min），合计约 2 小时。

- **CardList 拆分**（已从 deferred 移除）：`JPCardList.jsx` 已于 Session 16 完成重写，旧 `CardList.jsx` 已删除。若未来需要进一步拆分子组件，参考 ENCardList 模式。
- **牌桌中枢后续增强（谨慎）**：当前 `/mahjong/centrepiece` 已按 `mahtools/riichi-centrepiece` 收敛为轻量中枢。后续如增强，优先保持 mahtools 的极简交互；只有用户明确要求时再考虑供托、分数、流局/和牌结算或手动设庄。
