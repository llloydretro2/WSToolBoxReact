# WSToolBox Frontend — Project Status

> Last updated: 2026-05-18 (session 3)

## Deployment

- **Production URL**: Cloudflare Pages (deployed from `main` branch)
- **Deploy method**: push `main` to `origin` → Cloudflare Pages auto-deploys
- **Backend**: `https://api.cardtoolbox.org` (WS card data, deck management, auth)
- **Dev proxy**: `/api` and `/audios` → `http://localhost:4000`

---

## Completed work (merged to `main`)

### Mahjong Yaku Route Trainer

A beginner-friendly Riichi Mahjong yaku-awareness trainer at `/mahjong`. See `CLAUDE.md` for full architecture details.

| Capability | Status |
|---|---|
| Visual tile picker (34 tiles), meld builder | ✅ |
| Fixed hand bar (tile count, status badges, clear button) | ✅ |
| Shanten calculation (3-way: standard/Chiitoitsu/Kokushi) | ✅ |
| Exact 0/1-step brute-force simulation | ✅ |
| Bounded BFS route search (depth 2, ≤280 states) | ✅ |
| Heuristic fallback with "Reference route" label | ✅ |
| `FEASIBILITY_ACHIEVED` tier — yaku structure already present in hand | ✅ |
| `CompletedHandPanel` — shown when hand is complete, no route suggestions | ✅ |
| 14 regular yaku + 9 yakuman route cards | ✅ |
| Seat wind / round wind / kuitan / two-han-min rule toggles | ✅ |

**Known limitations:** first-decomposition only (`extractHandGroups`), no ukeire, no scoring, simplified Pinfu wait check, BFS draw-candidate over-pruning.

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

## Recommended next work

### Mahjong engine improvements
1. **`extractAllHandGroups`** — try all valid decompositions; required for accurate Toitoi/Iipeikou/Sanankou detection
2. **Ukeire** — enumerate shanten-improving tiles (O(34) shanten calls per hand)
3. **Wait classification** — distinguish ryanmen/kanchan/penchan/tanki; fixes Pinfu labelling
4. **Scoring** — fu/han calculation, basic point table

### App-wide
5. **i18n completion** — PickPacks, Record tooltips still have some hardcoded Chinese strings not covered by `t()`
6. **DeckCreate / DeckSearch redesign** — currently removed from routing; needs a proper design before re-enabling
7. **CardList `useMemo` deps** — 3 pre-existing `react-hooks/exhaustive-deps` warnings for `productList.level/power/cost` dependency arrays
8. **Section-specific themes** — NavBar uses Spring Rain green for all sections; WS/Mahjong/Tools could have distinct accent colours as the platform grows
9. **shadcn/ui adoption** — new Mahjong and Tools pages should use Tailwind + shadcn instead of MUI for new features
