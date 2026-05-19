# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CardToolBox Frontend — a React + Vite PWA that has expanded from a Weiss Schwarz tool into a multi-game platform. Currently hosts Weiss Schwarz tools (card search, pack simulator, match records), a Riichi Mahjong yaku trainer, and general game utilities (dice, chess clock). Domain: `cardtoolbox.org`.

## Commands

```bash
npm run dev       # dev server on port 3000 (auto-opens browser)
npm run build     # production build → dist/
npm run preview   # preview production build
npm run lint      # ESLint
```

Dev proxy: `/api` and `/audios` requests are forwarded to `http://localhost:4000`. The production backend is `https://api.cardtoolbox.org`.

Override backend in dev: set `VITE_BACKEND_URL` env var.

## Architecture

### Provider tree (outer → inner)

```
LocaleProvider       # i18n (src/contexts/LocaleContext.jsx)
  ThemeProvider      # light-theme only stub (src/contexts/ThemeContext.jsx)
    AuthProvider     # JWT auth (src/contexts/AuthContext.jsx)
      OptionsProvider  # product list / deck rules / translations (src/contexts/OptionsContext.jsx)
        Router + NavBar + AnimatedRoutes
```

All pages are lazy-loaded via `React.lazy` + `Suspense` with framer-motion page transitions.

### Route structure

The app uses a **game hub model** with section-scoped URL namespaces:

| Prefix | Section | Example routes |
|--------|---------|----------------|
| `/` | Hub (game selector) | `/` |
| `/ws/*` | Weiss Schwarz | `/ws/cards`, `/ws/packs`, `/ws/simulator`, `/ws/record`, `/ws/audio`, `/ws/first-second`, `/ws/shuffle`, `/ws/deck/edit` |
| `/mahjong/*` | Mahjong | `/mahjong/trainer`, `/mahjong/efficiency` |
| `/tools/*` | General tools | `/tools/dice`, `/tools/clock` |
| `/login` | Auth | `/login` |

Legacy flat paths (e.g. `/cardlist`, `/mahjong`, `/dice`) redirect to the new paths via `<Navigate replace>` in `App.jsx`.

**Note:** All deck management pages (DeckCreate, DeckSearch, Deck, DeckEdit) have been deleted (session 9). Only DeckEdit route `/ws/deck/edit` existed; it is now removed. Code preserved in git history.

### Key hooks

| Hook | Source | Purpose |
|------|--------|---------|
| `useLocale()` | `LocaleContext` | `t(key)` translation + `locale`/`setLocale` |
| `useAuth()` | `AuthContext` | `user`, `token`, `login()`, `logout()`, `isAuthenticated()` |
| `useOptions()` | `OptionsContext` | `productList`, `translationMap`, `deckRules`, `optionsLoading` |

### API layer

All backend calls go through `src/utils/api.js:apiRequest(url, options)`:
- Automatically attaches `Authorization: Bearer <token>` from localStorage
- On 401, clears auth state and redirects to `/login`
- Prepends `VITE_BACKEND_URL` (or `https://api.cardtoolbox.org`) to relative `/api/...` paths
- Returns the raw `Response` object — still call `.json()` to get data
- For POST/PUT pass `{ method: 'POST', body: JSON.stringify(data) }` — `Content-Type: application/json` is added automatically

**Every page must use `apiRequest` — never define a local `BACKEND_URL` constant or call `fetch` directly.** Audio playback URLs (used in `new Audio(url)`) are the only exception; those use `import.meta.env.VITE_BACKEND_URL || 'https://api.cardtoolbox.org'` directly.

Endpoint constants are in `src/constants/api.js`.

### OptionsContext data loading

`OptionsContext` initialises synchronously from static JSON files in `src/data/` (product list, filter translations, deck rules for Weiss and Schwarz sides). On mount it fetches live versions from the backend and replaces them. Components always get data from the context — never import the JSON files directly.

### Auth

JWT stored in localStorage (`token`, `user`, `username`). On load, `AuthContext` calls `/api/auth/me` to validate the stored token. Deck management and match record pages are only visible to logged-in users.

## Theme system

Light theme only. Colors are CSS variables defined in `src/index.css` (Spring Rain palette, `#a6ceb6` family):

```
--primary, --primary-hover, --primary-light, --primary-dark
--background, --surface, --card-background
--text, --text-secondary, --text-muted
--border, --divider
--success, --error, --warning, --info, --reset, --reset-hover
```

**Never hardcode color values.** Always use `var(--primary)` etc. in `sx` props, CSS files, or Tailwind `style` props.

Dead theme files removed: `src/hooks/useTheme.js`, `src/hooks/useThemeVariables.js`, `src/theme/themeConfig.js`. `ThemeContext.jsx` is kept (imported by `App.jsx`) but is a light-only stub with no toggle logic.

## CSS framework

**Dual-stack: MUI (existing pages) + Tailwind CSS v3 (NavBar and new pages).**

Tailwind is configured with `corePlugins.preflight: false` so it does not reset MUI's global styles. Config: `tailwind.config.js` + `postcss.config.js`. Directives are at the top of `src/index.css`.

- **NavBar** — fully Tailwind. Uses MUI only for `Menu`/`MenuItem` (dropdowns), `Avatar`/`Badge`, `Snackbar`, `Tooltip`.
- **WS pages** (CardList, Record, DeckEdit, AudioBoard, etc.) — remain MUI.
- **New sections** (Mahjong, Tools, Hub) — use Tailwind + shadcn/ui as they are built or redesigned.

## Page layout conventions

Every MUI page must follow this standard structure:

```jsx
<Container maxWidth="lg" sx={{ py: 3 }}>   {/* lg for data pages, md for simple tools */}
  <Box textAlign="center" mb={4}>
    <Typography variant="h4" fontWeight={700} color="var(--text)" gutterBottom>
      {t("page.title")}
    </Typography>
    <Typography variant="body1" color="text.secondary">   {/* optional subtitle */}
      {t("page.subtitle")}
    </Typography>
  </Box>

  {/* page content */}
</Container>
```

- **Never use manual `Box sx={{ width: "80%", mx: "auto" }}`** as a layout container — use `Container`.
- `maxWidth="lg"` for full-feature pages (Record, CardList).
- `maxWidth="md"` for single-focus tool pages (Dice, ChessClock, RandomShuffle, Simulator, PickPacks, AudioBoard, MahjongTrainer).
- `maxWidth="sm"` for single-form pages (Login).
- The Hub page (`/`) does **not** follow this pattern — it is a custom Tailwind layout with game-selector cards.

## MUI Grid API

This project uses **MUI v6**. Always use the `size` prop, never the v5 `item` prop:

```jsx
// ✅ Correct (v6)
<Grid size={{ xs: 12, md: 6 }}>

// ❌ Wrong (v5 legacy)
<Grid item xs={12} md={6}>
```

## Button components

Import from `src/components/ButtonVariants.jsx`. Never set `backgroundColor` or `color` directly on these buttons.

| Variant | Use case |
|---------|----------|
| `PrimaryButton` | Confirm, submit, save |
| `DangerButton` | Delete, reset |
| `SecondaryButton` | Cancel, back |
| `GenerateButton` | Generate, randomise |
| `SubtleButton` | Icon buttons, links |
| `InfoButton` | Details, help |
| `WarningButton` | Caution actions |

Custom toggle buttons (e.g. AudioBoard track buttons that toggle between active/inactive states) may use `Box component="button"` with CSS variable colors when no ButtonVariant fits the interaction pattern.

## Localisation

Default locale: `zh`. Fallback locale: `zh`. Keys live in `src/locales/zh.json` and `src/locales/en.json`. Template variables use `{{varName}}` syntax:

```jsx
const { t } = useLocale();
t("deck.cardCount", { count: 50 })
```

When adding UI text, add keys to **both** locale files.

## Mobile / Capacitor

Capacitor config (`capacitor.config.ts`) targets `webDir: 'build'`. The production Vite output for mobile is `build/` (not `dist/`). Android project is in `android/`.

---

## Mahjong Yaku Route Trainer

A beginner-oriented Riichi Mahjong yaku-awareness tool at `/mahjong/trainer`.

### Location

| Item | Path |
|------|------|
| Page | `src/pages/MahjongTrainer.jsx` |
| Route | `/mahjong/trainer` |
| NavBar entry | `menu.mahjong` in `src/components/NavBar.jsx` (under `MAHJONG_NAV`) |
| Locale keys | `mahjong.*` in `src/locales/zh.json` + `en.json` |
| Tile images | `public/assets/mahjong-tiles/` (34 SVGs, CC0 from FluffyStuff/riichi-mahjong-tiles) |
| Tile components | `src/components/mahjong/MahjongTile.jsx`, `MahjongTilePicker.jsx` |

### UI stack — Mahjong pages are Tailwind-only, zero MUI

All mahjong files use **Tailwind CSS only**. No MUI components, no `sx` props, no `var(--primary)` or other WS theme colours. Background is plain white. The WS background image (`/bg.webp`) is scoped to `/ws/*` via `WSBackground` in `App.jsx` and must not appear on mahjong pages.

**Button style (mahjong pages):** all action buttons use the black rounded-full pill:
```jsx
className="text-[11px] font-bold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-700 transition-colors"
```
Disabled state: `text-gray-300 cursor-not-allowed` (no background). Do not use bordered/rectangular buttons or MUI `Button` on mahjong pages.

### Calculation engine (`src/utils/mahjong/`)

| Module | Responsibility |
|--------|----------------|
| `tileParser.js` | Tile model, `parseTiles`, `parseMelds`, `extractHandGroups` (DFS — first decomposition only), `canCompleteHand`, `generateHandString` |
| `shanten.js` | 3-way shanten: standard (Neval DFS), Chiitoitsu, Kokushi — `computeShanten(tiles, numMelds)`. Based on MahjongRepository/mahjong (MIT). |
| `handSimulator.js` | `evaluateYakuFromDecomposition` (16 standard yaku + 8 yakuman — see coverage below), `findScenarios` (brute-force 0/1-step), `extractYakuRelevantGroups`, `ALL_34_TILES` |
| `yakuBFS.js` | Bounded BFS route search — `searchYakuRoute(...)`, `getDiscardCandidates`, `getDrawCandidates`, `makeBFSScenario` |
| `yakuAnalyzer.js` | Main entry `analyzeHand(...)` — 3-tier pipeline (simulation → BFS → heuristic), per-yaku analyzers, EXAMPLES, MEANINGS |

### Engine coverage

**`evaluateYakuFromDecomposition` detects — 16 standard yaku:**
役牌、断幺九、对对和、七对子、平和、三色同顺、**三色同刻**、一气通贯、混一色、清一色、**混老头**、小三元、混全带幺九、纯全带幺九、三暗刻、一杯口

**Yakuman in evaluator — 8 kinds (tile-count or decomposition-based):**
大三元、四暗刻（门清）、字一色、小四喜、大四喜、清老头、绿一色、九莲宝灯

**`canCompleteHand` handles:** 标准手、七对子、**国士无双**

**`extractAllHandGroups`:** 枚举所有合法分解（上限 20），修复 `223344m` 等歧义手牌漏役问题。`handSimulator.js` 和 `yakuBFS.js` 中所有场景生成路径均使用。

**平和两面待验证:** `checkRyanmenWait(concealedGroups, drawnTile)` 确保平和场景仅在真正两面待时生成。坎张/边张赢牌不再被错误标记为平和。

**`yakuAnalyzer.js` route analyzers:** above 16 standard + 9 yakuman (all implemented)

**Test suite — 156 cases, all passing:**
`test-shanten.js`(17) · `test-yaku.js`(54) · `test-yakuman.js`(33) · `test-agari.js`(33) · `test-shanten-extended.js`(19)
Data sourced from riichi.wiki and MahjongRepository/mahjong (validated against 26M Tenhou phoenix games).

**Test coverage note:** yaku tests check "contains ID" not "exactly these IDs". Negative tests cover false-positives; unexpected extra yaku would not be caught.

### Scenario priority in `analyzeHand`

1. **Tier 1 `findScenarios`** — exact 0/1-step via brute-force 34-draw scan; returns `isExactCompletion: true`
2. **Tier 2 `searchYakuRoute`** — bounded BFS (depth 2, ≤280 states, per-yaku pruned); returns exact route or null
3. **Tier 3 `SCENARIO_BUILDERS`** — heuristic tile-count rules; always `isExample: true` (shown as "Reference route")

### UI architecture (MahjongTrainer.jsx)

- **Two-card layout**: input card (settings + analyze CTA) + picker card (tile grid + meld builder). Results appear below after analysis with `scrollIntoView` auto-scroll.
- **`FixedHandBar`** — `position: fixed` at `top-[64px] md:top-[72px]`. Multi-line wrapped tile row, shanten status, open/closed badge, tile count, clear button. Height measured via `ResizeObserver`; page `paddingTop` adjusts dynamically.
- **`buildTrainerViewModel`** — reshapes `analyzeHand()` output. Upgrades `HIGH` feasibility routes whose yaku structure is already present to local `FEASIBILITY_ACHIEVED` tier.
- **`FEASIBILITY_ACHIEVED = 'achieved'`** — UI-only tier. Applied when `en.needed === ''` or starts with `'Keep'`. Feasibility chip uses dark gray styling.
- **`CompletedHandPanel`** — shown when `hand.isComplete === true`. Lists achieved yaku and han total; no route suggestions.
- **`MahjongTilePicker`** — suit rows with single-char label (万/饼/索/字). 14-tile global limit (`isHandFull`) disables all tiles when reached. Meld builder is a collapsible section with centred pill toggle button; `validateMeld()` enforces legal meld types (刻子/顺子/杠) before confirming.
- **`RouteCard`** — collapsed: name + Japanese name + feasibility chip + han display + meaning + example hand. Expanded: scenarios (Need/Discard/Target/Why).

### Known limitations (do not paper over in UI)

- ~~**`extractHandGroups` is first-decomposition-only**~~ — **Fixed (session 8)**: `extractAllHandGroups` now enumerates all valid decompositions (cap 20). All scenario-generation paths use it.
- **No ukeire in trainer** — the trainer page does not enumerate effective tiles; use `/mahjong/efficiency` for that.
- **No scoring** — no fu/han/point calculation, no riichi/dora/ippatsu mechanics.
- ~~**Pinfu wait check simplified**~~ — **Fixed (session 8)**: `checkRyanmenWait` verifies the drawn tile gives two-sided (ryanmen) wait before creating a pinfu scenario.
- **Sanankou win-method not enforced** — does not distinguish tsumo vs ron for the completing triplet.
- **BFS draw candidates are per-yaku pruned** — may miss structural fixes needed from non-yaku tiles.
- **Yakuman not confirmed in evaluator** — complete yakuman hands are not marked as achieved in `CompletedHandPanel`.

## Mahjong Efficiency Page (`/mahjong/efficiency`)

Standalone ukeire (有効牌) analysis tool aligned with Tenhou 牌理. **Separate from the yaku trainer** — does not share state or components beyond `MahjongTile` and `MahjongTilePicker`.

### Key files

| File | Purpose |
|---|---|
| `src/utils/mahjong/ukeire.js` | Core algorithm: `computeUkeire`, `computeWaits`, `analyzeEfficiency` |
| `src/pages/MahjongEfficiency.jsx` | Page (Tailwind-only, B&W) |

### Algorithm (`ukeire.js`)

**Effective tile condition (Tenhou-exact):**
```js
// Tile p is effective for discard k if:
shanten(original - k + p) < originalShanten
// NOT: shanten(afterDiscard + p) < shantenAfterDiscard
// Using post-discard shanten incorrectly includes "recovery" tiles for bad discards.
```

**`shantenAfter`** = min shanten achievable by drawing any effective tile (not the 12-tile intermediate shanten).

**Sort**: totalCount descending (matches Tenhou 牌理's `t.sort((a,b) => b.n - a.n)`).

### Input modes

- **14 tiles** (post-draw): primary mode, shows which tile to discard → Tenhou 牌理 equivalent
- **13 tiles** (pre-draw): shows waits for tenpai or effective draws for non-tenpai
- Text notation: real-time sync — typing `123m456p` updates tiles and picker immediately

### Verification

Algorithm extracted from Tenhou's `1008.js` (directly downloaded, not guessed). Cross-validated against MahjongRepository/mahjong Python reference. Run:
```bash
python3 validate-ukeire.py > /tmp/ukeire-reference.json
npx vite-node validate-ukeire.js
npx vite-node test-ukeire.js
```

---

## NavBar architecture

`src/components/NavBar.jsx` is fully Tailwind-based and section-aware.

### Section detection

```js
getGameSection(pathname) → "hub" | "ws" | "mahjong" | "tools"
```

### Layout

- **Floating pill** — `position: fixed`, `pointer-events-none` on the outer header so content scrolls under the margins; each pill has `pointer-events-auto`.
- **Primary pill** — 3-column CSS grid (`auto 1fr auto`): brand+chip | centered desktop nav | lang toggle + auth.
- **Secondary pill** — mobile only, game sections only. Horizontally scrollable flat nav items. Hidden with `md:hidden`.

### Nav configs

`WS_NAV`, `MAHJONG_NAV`, `TOOLS_NAV` are plain objects at the top of the file. The component reads `section` and switches between them. No hamburger, no drawer.

### Language toggle

A single `<button>` that shows the current locale (`"中文"` or `"EN"`) and calls `setLocale()` on click. The MUI `LanguageToggle` component is no longer used in NavBar.

### ⚠️ Critical rule

**Do not modify calculation engine files** (`tileParser.js`, `shanten.js`, `handSimulator.js`, `yakuBFS.js`, `yakuAnalyzer.js`) when making UI-only changes. The page consumes engine output via `buildTrainerViewModel`; UI layout changes belong in `MahjongTrainer.jsx` and the component files only.
