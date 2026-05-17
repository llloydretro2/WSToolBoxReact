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
| `/mahjong/*` | Mahjong | `/mahjong/trainer` |
| `/tools/*` | General tools | `/tools/dice`, `/tools/clock` |
| `/login` | Auth | `/login` |

Legacy flat paths (e.g. `/cardlist`, `/mahjong`, `/dice`) redirect to the new paths via `<Navigate replace>` in `App.jsx`.

**Note:** DeckCreate and DeckSearch pages exist as files but are not routed or linked — they are incomplete and pending a redesign.

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

A beginner-oriented Riichi Mahjong yaku-awareness tool merged into `main`.

### Location

| Item | Path |
|------|------|
| Page | `src/pages/MahjongTrainer.jsx` |
| Route | `/mahjong/trainer` (added to `src/App.jsx`) |
| NavBar entry | `menu.mahjong` in `src/components/NavBar.jsx` (under `MAHJONG_NAV`) |
| Locale keys | `mahjong.*` in `src/locales/zh.json` + `en.json` |
| Tile images | `public/assets/mahjong-tiles/` (34 SVGs, CC0 from FluffyStuff/riichi-mahjong-tiles) |
| Tile components | `src/components/mahjong/MahjongTile.jsx`, `MahjongTilePicker.jsx` |

### Calculation engine (all in `src/utils/mahjong/`)

| Module | Responsibility |
|--------|----------------|
| `tileParser.js` | Tile model, `parseTiles`, `parseMelds`, `extractHandGroups` (DFS decomposer), `canCompleteHand`, `generateHandString` |
| `shanten.js` | Accurate 3-way shanten: standard (Neval DFS), Chiitoitsu, Kokushi — `computeShanten(tiles, numMelds)` |
| `handSimulator.js` | `evaluateYakuFromDecomposition` (14 yaku), `findScenarios` (brute-force 0/1-step), `extractYakuRelevantGroups`, `ALL_34_TILES` |
| `yakuBFS.js` | Bounded BFS route search — `searchYakuRoute(...)`, `getDiscardCandidates`, `getDrawCandidates`, `makeBFSScenario` |
| `yakuAnalyzer.js` | Main entry `analyzeHand(...)` — feasibility heuristics, 3-tier scenario pipeline (simulation → BFS → heuristic), EXAMPLES, MEANINGS |

### Scenario priority in `analyzeHand`

1. **Tier 1 `findScenarios`** — exact 0/1-step via brute-force 34-draw scan; returns `isExactCompletion: true`
2. **Tier 2 `searchYakuRoute`** — bounded BFS (depth 2, ≤280 states, per-yaku pruned); returns exact route or null
3. **Tier 3 `SCENARIO_BUILDERS`** — heuristic tile-count rules; always `isExample: true` (shown as "Reference route")

### UI architecture (MahjongTrainer.jsx)

- **`buildTrainerViewModel`** — thin adapter: reshapes `analyzeHand()` output into UI-friendly fields. Also computes `achievedRoutes` (routes with `CONFIRMED` feasibility or `HIGH` feasibility where the yaku structure is already present) and `achievedHan`. Upgrades qualifying `HIGH` routes to the local `FEASIBILITY_ACHIEVED` tier before sorting so `FeasibilityChip` renders them correctly.
- **`FEASIBILITY_ACHIEVED = 'achieved'`** — a UI-only feasibility tier defined in `MahjongTrainer.jsx` (not in the engine). Sits between `CONFIRMED` and `HIGH`. Styled in dark green (`#52b788`). Applied to routes where `en.needed === ''` or `en.needed.startsWith('Keep')`, meaning the yaku tile structure is already present in the hand.
- **`FixedHandBar`** — `position: fixed` below AppBar. Shows tile count, status badges (门清/向听/役种 stacked **vertically**), live tile row, and a clear-all button. Displays `achievedRoutes` chips whenever the analysis is available, even for incomplete hands. Rendered outside `<Container>`.
- **`CompletedHandPanel`** — shown instead of `YakuRoutesPanel` when `hand.isComplete === true`. Displays achieved yaku list and han total; no route suggestions.
- **`MahjongTilePicker`** — mode toggle removed. Main tile grid always adds to the concealed hand (left-click add, right-click remove). Meld builder section is always visible with its own compact tile grid (`onMeldTileClick`).
- **Collapsible `RouteCard`** — collapsed shows name + meaning + example hand + feasibility chip (may show "已达成"); expanded shows Need/Discard/Target/Why scenarios.

### Known limitations (do not paper over in UI)

- **`extractHandGroups` is first-decomposition-only** (DFS returns the first valid split, not all valid splits). Ambiguous hands (e.g. `223344m`) may miss some yaku. `extractAllHandGroups` not yet implemented.
- **No ukeire** — the system does not enumerate all tiles that improve shanten.
- **No scoring** — no fu/han calculation, no riichi/dora/ippatsu mechanics.
- **Pinfu wait check simplified** — all-sequence + non-value pair is labelled Pinfu without verifying two-sided (ryanmen) wait.
- **Sanankou win-method not enforced** — does not distinguish tsumo vs ron for the completing triplet.
- **BFS draw candidates are per-yaku pruned** — may miss structural fixes needed from non-yaku tiles (demonstrated in TC1 Yakuhai case).

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
