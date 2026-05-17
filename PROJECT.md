# WSToolBox Frontend — Project Status

> Last updated: 2026-05-17

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

## Recommended next work

### Mahjong engine improvements
1. **`extractAllHandGroups`** — try all valid decompositions; required for accurate Toitoi/Iipeikou/Sanankou detection
2. **Ukeire** — enumerate shanten-improving tiles (O(34) shanten calls per hand)
3. **Wait classification** — distinguish ryanmen/kanchan/penchan/tanki; fixes Pinfu labelling
4. **Scoring** — fu/han calculation, basic point table

### App-wide
5. **i18n completion** — DeckSearch, DeckCreate, PickPacks lore section, Record tooltips, AudioBoard still have hardcoded Chinese strings not covered by `t()`
6. **DeckEdit completion** — the page is functional but was originally a work-in-progress; consider a proper card-editor redesign using DeckCreate as the base
7. **CardList `useMemo` deps** — 3 pre-existing `react-hooks/exhaustive-deps` warnings for `productList.level/power/cost` dependency arrays
