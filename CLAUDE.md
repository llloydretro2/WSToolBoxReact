# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WSToolBox Frontend — a React + Vite PWA for Weiss Schwarz card game players. Features card search, pack simulator, deck management, match record tracking, and a set of in-game tools (dice, chess clock, shuffle, etc.).

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

Endpoint constants are in `src/constants/api.js`.

### OptionsContext data loading

`OptionsContext` initialises synchronously from static JSON files in `src/data/` (product list, filter translations, deck rules for Weiss and Schwarz sides). On mount it fetches live versions from the backend and replaces them. Components always get data from the context — never import the JSON files directly.

### Auth

JWT stored in localStorage (`token`, `user`, `username`). On load, `AuthContext` calls `/api/auth/me` to validate the stored token. Deck management and match record pages are only visible to logged-in users.

## Theme system

Light theme only — dark mode has been removed. Colors are CSS variables defined in `src/index.css` (Spring Rain palette, `#a6ceb6` family):

```
--primary, --primary-hover, --primary-light, --primary-dark
--background, --surface, --card-background
--text, --text-secondary, --text-muted
--border, --divider
--success, --error, --warning, --info, --reset, --reset-hover
```

**Never hardcode color values.** Always use `var(--primary)` etc. in `sx` props or CSS files.

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

A beginner-oriented Riichi Mahjong yaku-awareness tool added on branch `feature/mahjong-yaku-trainer`.

### Location

| Item | Path |
|------|------|
| Page | `src/pages/MahjongTrainer.jsx` |
| Route | `/mahjong` (added to `src/App.jsx`) |
| NavBar entry | `menu.mahjong` in `src/components/NavBar.jsx` |
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
| `yakuAnalyzer.js` | Main entry `analyzeHand(...)` — feasibility heuristics, 3-tier scenario pipeline (simulation → BFS → heuristic), EXAMPLES, MEANINGS, `buildTrainerViewModel` adapter |

### Scenario priority in `analyzeHand`

1. **Tier 1 `findScenarios`** — exact 0/1-step via brute-force 34-draw scan; returns `isExactCompletion: true`
2. **Tier 2 `searchYakuRoute`** — bounded BFS (depth 2, ≤280 states, per-yaku pruned); returns exact route or null
3. **Tier 3 `SCENARIO_BUILDERS`** — heuristic tile-count rules; always `isExample: true` (shown as "Reference route")

### UI architecture (MahjongTrainer.jsx)

- **`buildTrainerViewModel`** — thin adapter: reshapes `analyzeHand()` output into UI-friendly fields (extracts `shanten`, sorts routes, splits regular / yakuman). No new calculation logic.
- **`FixedHandBar`** — `position: fixed` below AppBar, shows live concealed tiles + open melds, tile count, status badges. Rendered outside `<Container>`.
- **Collapsible `RouteCard`** — collapsed shows name + meaning + example hand; expanded shows Need/Discard/Target/Why scenarios.

### Known limitations (do not paper over in UI)

- **`extractHandGroups` is first-decomposition-only** (DFS returns the first valid split, not all valid splits). Ambiguous hands (e.g. `223344m`) may miss some yaku. `extractAllHandGroups` not yet implemented.
- **No ukeire** — the system does not enumerate all tiles that improve shanten.
- **No scoring** — no fu/han calculation, no riichi/dora/ippatsu mechanics.
- **Pinfu wait check simplified** — all-sequence + non-value pair is labelled Pinfu without verifying two-sided (ryanmen) wait.
- **Sanankou win-method not enforced** — does not distinguish tsumo vs ron for the completing triplet.
- **BFS draw candidates are per-yaku pruned** — may miss structural fixes needed from non-yaku tiles (demonstrated in TC1 Yakuhai case).

### ⚠️ Critical rule

**Do not modify calculation engine files** (`tileParser.js`, `shanten.js`, `handSimulator.js`, `yakuBFS.js`, `yakuAnalyzer.js`) when making UI-only changes. The page consumes engine output via `buildTrainerViewModel`; UI layout changes belong in `MahjongTrainer.jsx` and the component files only.
