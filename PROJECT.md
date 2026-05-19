# WSToolBox Frontend — Project Status

> Last updated: 2026-05-19 (session 6)

## Deployment

- **Production URL**: Cloudflare Pages (deployed from `main` branch)
- **Deploy method**: push `main` to `origin` → Cloudflare Pages auto-deploys
- **Backend**: `https://api.cardtoolbox.org` (WS card data, deck management, auth)
- **Dev proxy**: `/api` and `/audios` → `http://localhost:4000`

---

## Completed work (merged to `main`)

### Mahjong Yaku Route Trainer

A beginner-friendly Riichi Mahjong yaku-awareness trainer at `/mahjong/trainer`. See `CLAUDE.md` for full architecture details.

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
- Removed per-page `BACKEND_URL` constants from every page (CardList, Record, DeckCreate, DeckEdit, DeckSearch, Login, Simulator, AudioBoard)
- All API calls now route through `src/utils/api.js:apiRequest()` — automatic auth header, 401 handling, `VITE_BACKEND_URL` support

#### State cleanup
- **ChessClock**: removed derived `p1Time`/`p2Time` useState + sync useEffect; computed inline
- **Login**: merged `errorMessage` + `successMessage` into single `snackbar` state; fixed register-success showing as error
- **Record**: consolidated `deleteDialogOpen` + `recordToDelete` into `deleteDialog` object
- **DeckCreate + DeckEdit**: consolidated 8 flat filter useState fields (color/level/rarity/cardType/power/cost/soul/trigger) into `filterState` object

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
- Fixed MUI v5 `<Grid item>` → v6 `<Grid size>` in Record and DeckEdit
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
| `/first_second` | `/ws/first-second` |
| `/shuffle` | `/ws/shuffle` (moved from tools to WS) |
| `/mahjong` | `/mahjong/trainer` |
| `/dice` | `/tools/dice` |
| `/chess_clock` | `/tools/clock` |

DeckCreate and DeckSearch removed from routes and NavBar (pages pending redesign).

#### NavBar redesign

- Replaced MUI AppBar + hamburger/drawer with a **Tailwind floating pill** (Raycast-style).
- Primary pill: frosted glass white (`rgba(255,255,255,0.86)`) + Spring Rain border.
- Secondary pill: mobile-only horizontal scroll for section nav items, no hamburger.
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
- **Top accent bar** (5px): each section has an image-sampled colour — WS `#5c4f6b`, Mahjong `#5a3f45`, Tools `#7a6552`
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
- Pages that were already correct: `AudioBoard`, `Record`, `DeckEdit`

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

**Test suite built: 156 / 156 passing**

| File | Cases | Source |
|---|---|---|
| `test-shanten.js` | 17 | riichi.wiki |
| `test-yaku.js` | 54 | MahjongRepository/mahjong |
| `test-yakuman.js` | 33 | MahjongRepository/mahjong |
| `test-agari.js` | 33 | MahjongRepository/mahjong |
| `test-shanten-extended.js` | 19 | MahjongRepository/mahjong |

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

### Backlog (after Phase 2)

- **`extractAllHandGroups`** — enumerate all valid decompositions; fixes ambiguous hands like `223344m`
- **Pinfu wait check** — verify ryanmen wait condition
- **Scoring** — fu/han calculation, basic point table
- **i18n completion** — PickPacks, Record tooltips still have hardcoded Chinese strings
- **DeckCreate / DeckSearch redesign** — currently unrouted; needs design before re-enabling
- **CardList `useMemo` deps** — 3 pre-existing `react-hooks/exhaustive-deps` warnings
