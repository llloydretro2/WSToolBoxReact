# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CardToolBox Frontend — a React + Vite PWA that has expanded from a Weiss Schwarz tool into a multi-game platform. Currently hosts Weiss Schwarz tools (card search, pack simulator, match records, shuffle), Riichi Mahjong tools (yaku trainer, efficiency analysis, centrepiece table board), and general game utilities (first/second, dice, chess clock, audio board). Domain: `cardtoolbox.org`.

## Commands

```bash
npm run dev       # dev server on port 3000 (auto-opens browser)
npm run build     # production build → dist/
npm run preview   # preview production build
npm run lint      # ESLint
npm run test:mahjong       # full mahjong regression suite
npm run test:mahjong:core  # shanten/agari/ukeire/fu/scoring
npm run test:mahjong:yaku  # standard yaku + yakuman detection
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
| `/ws/*` | Weiss Schwarz | `/ws/cards`, `/ws/packs`, `/ws/simulator`, `/ws/record`, `/ws/shuffle` |
| `/mahjong/*` | Mahjong | `/mahjong/trainer`, `/mahjong/efficiency`, `/mahjong/centrepiece` |
| `/tools/*` | General tools | `/tools/first-second`, `/tools/dice`, `/tools/clock`, `/tools/audio` |
| `/login` | Auth | `/login` |

Legacy flat paths (e.g. `/cardlist`, `/mahjong`, `/dice`) redirect to the new paths via `<Navigate replace>` in `App.jsx`.

**Note:** All deck management pages (DeckCreate, DeckSearch, Deck, DeckEdit) have been deleted. They are kept only in git history and historical session notes; there is no active route or page component left in `src/pages/`. `/ws/record` is protected by `ProtectedRoute` and redirects unauthenticated users to `/login`.

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

Since preflight is disabled, `src/index.css` manually resets browser defaults for native elements used in Tailwind pages:
```css
input, textarea, select { box-sizing: border-box; }
button { background: none; border: none; padding: 0; cursor: pointer; font: inherit; }
```
Without these, `w-full` inputs overflow their containers and `<button>` elements show browser chrome (gray background, border).

- **NavBar** — fully Tailwind. Uses MUI only for `Menu`/`MenuItem` (dropdowns), `Avatar`/`Badge`, `Snackbar`, `Tooltip`.
- **WS pages** — being incrementally migrated to Tailwind:
  - `Record.jsx` — outer frame + Create tab (`tabValue === 0`) fully migrated; query/history tab (`tabValue === 1`) still MUI.
  - `CardList`, `PickPacks`, `Simulator`, `RandomShuffle` — still MUI.
- **General tool pages** include FirstSecond, Dice, ChessClock, and AudioBoard; these are still mostly MUI except where individually redesigned.
- **Mahjong pages and NavBar** — Tailwind-first. `/mahjong/centrepiece` is a special transparent fixed board below the NavBar.

## Tailwind migration conventions (WS tools)

WS tools are being incrementally migrated from MUI to Tailwind. These conventions define the target style system, derived from the existing Mahjong tool design language adapted for the Spring Rain theme.

### Migration rules

- Migrate **whole pages** at once, not partially. A page is either MUI or Tailwind — no mixing `sx` props and `className` at the same component level.
- **MUI islands** are allowed inside Tailwind pages only for `DatePicker`. All other formerly-island components now have Tailwind replacements (see below).
- `ButtonVariants` (`PrimaryButton`, `DangerButton`, etc.) belong to still-MUI pages and MUI islands only. Fully migrated Tailwind sections use plain `<button>` with Tailwind classes.
- Use **Lucide icons** (`lucide-react`) in all new Tailwind components. MUI icons only in components that still use MUI.
- Never mix `className` and `sx` on the same element.
- **`Autocomplete` → `@headlessui/react` `Combobox`**: use the `SeriesCombobox` pattern in `Record.jsx` as reference. Key points: `immediate` prop for open-on-focus, `anchor={{ to: "bottom start", gap: 4 }}` on `Combobox.Options` to portal the dropdown outside stacking contexts (`backdrop-filter` creates a stacking context that traps `z-index`).
- **`Dialog` → native modal**: backdrop `fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm`, click-outside closes, inner card is `bg-white rounded-2xl shadow-xl p-6`. See the reset confirmation dialog in `Record.jsx` as reference.

### Color tokens in Tailwind

CSS variables are referenced via Tailwind's arbitrary value syntax. Never hardcode hex values.

```
text-[var(--text)]              border-[var(--border)]
text-[var(--text-secondary)]    border-[var(--primary)]
text-[var(--text-muted)]        bg-[var(--primary)]
bg-[var(--surface)]             bg-[var(--card-background)]
bg-[var(--primary)]             bg-[var(--background)]
```

Semantic shorthand to use consistently:

| Intent | Class |
|--------|-------|
| Default border | `border-[var(--border)]` |
| Accent/focus border | `border-[var(--text-muted)]` |
| Body text | `text-[var(--text)]` |
| Secondary text | `text-[var(--text-secondary)]` |
| Muted/placeholder | `text-[var(--text-muted)]` |
| Frosted card background | `bg-white/70 backdrop-blur-md` |
| Subtle hover fill | `hover:bg-[var(--card-background)]` |

`--primary` (#a6ceb6) is too light for interactive accents on white backgrounds. Use `--text-muted` (#52675a, spring-rain-900) for focus rings, selected states, active tab indicators, and card accent borders. Use `--text-secondary` (#35443b) as the hover/active step darker.

### Page layout structure

```jsx
<div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

  {/* Title block */}
  <div className="mb-8">
    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-2">
      {t("page.title")}
    </h1>
    <p className="text-sm text-[var(--text-secondary)]">{t("page.subtitle")}</p>
  </div>

  {/* content */}
</div>
```

Width scale mirrors MUI Container:
- `max-w-5xl` — full-feature pages (Record, CardList)
- `max-w-3xl` — single-focus tool pages (matches Mahjong tools)
- `max-w-lg` — single-form pages (Login)

### Panel / Card

Outer panel (frosted glass card):
```jsx
<div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md">
```

Panel section with top accent (replaces `borderTop: "3px solid var(--primary)"`):
```jsx
<div className="border border-[var(--border)] border-t-[3px] border-t-[var(--text-muted)] rounded-2xl p-5 sm:p-6 bg-white/70 backdrop-blur-md">
```

Inner sub-panel (nested content block):
```jsx
<div className="border border-[var(--border)] rounded-xl p-4 bg-transparent">
```

Section divider within a panel:
```jsx
<div className="border-b border-[var(--border)]" />
```

Section eyebrow with horizontal rule (results/analysis sections):
```jsx
<div className="flex items-center gap-3 mb-5">
  <span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]">
    Section Title
  </span>
  <div className="flex-1 border-t border-[var(--border)]" />
</div>
```

### Typography scale

| Role | Classes |
|------|---------|
| Page title | `text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none` |
| Section heading | `text-base font-bold text-[var(--text)]` |
| Panel eyebrow label | `text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)]` |
| Body | `text-sm text-[var(--text)]` |
| Secondary body | `text-sm text-[var(--text-secondary)]` |
| Small metadata | `text-[11px] text-[var(--text-muted)]` |
| Micro label | `text-[10px] text-[var(--text-muted)]` |

### Buttons

Primary full-width CTA:
```jsx
<button className="w-full py-3 bg-[var(--text-muted)] text-white text-sm font-bold rounded-xl
                   hover:bg-[var(--text-secondary)] transition-colors
                   flex items-center justify-center gap-2">
```

Primary small action (pill):
```jsx
<button className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[var(--text-muted)]
                   text-white hover:bg-[var(--text-secondary)] transition-colors">
```

Secondary / outline:
```jsx
<button className="text-sm font-bold px-4 py-2 rounded-xl border border-[var(--border)]
                   text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
```

Icon-only reset button (borderless, color-only feedback):
```jsx
<button className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
```

Toggle option group (radio-style, replaces `ToggleButtonGroup`):
```jsx
<div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
  {/* active */}
  <button className="px-3 py-1.5 text-[11px] font-bold border-r border-[var(--border)] last:border-r-0
                     bg-[var(--text)] text-[var(--background)] transition-colors">
  {/* inactive */}
  <button className="px-3 py-1.5 text-[11px] font-bold border-r border-[var(--border)] last:border-r-0
                     bg-transparent text-[var(--text)] hover:bg-[var(--card-background)] transition-colors">
```

Disabled state (any button): append `disabled:opacity-40 disabled:cursor-not-allowed`.

### Form inputs

Text input (replaces `TextField`):
```jsx
<input
  className="w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-2
             text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
             focus:outline-none focus:border-[var(--text-muted)] transition-colors"
/>
```

Floating label pattern: pair input with a `<label>` above using `text-[11px] font-bold text-[var(--text-secondary)] mb-1 block`.

Combobox (replaces MUI `Autocomplete`): use `@headlessui/react` `Combobox`. Always set `immediate` (open-on-focus) and `anchor={{ to: "bottom start", gap: 4 }}` on `Combobox.Options` to avoid stacking context clipping. Add `Combobox.Button` with `ChevronDown` for dropdown affordance. See `SeriesCombobox` in `Record.jsx`.

### Layout grid

Two-column responsive (e.g. player vs opponent):
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

Three-column stats row:
```jsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

### Border radius scale

| Level | Value | Use |
|-------|-------|-----|
| `rounded-2xl` | outer panels/cards | |
| `rounded-xl` | inner sub-panels, CTA buttons | |
| `rounded-lg` | inputs, small containers | |
| `rounded-full` | pill buttons, badges, avatars | |
| `rounded-md` | inline tags/chips | |

### Icons

Use `lucide-react` for all Tailwind components. Common icons:

```js
import { Search, RefreshCw, X, ChevronDown, ChevronUp,
         Plus, Trash2, RotateCcw, User, Trophy, Swords } from "lucide-react";
```

Size convention: `size={14}` inline with text, `size={16}` for icon buttons, `size={18}` for CTA.

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
- `/mahjong/centrepiece` is a fixed table centrepiece below the NavBar and intentionally bypasses the standard `PageTransition` spacing wrapper in `App.jsx`.
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

Capacitor config (`capacitor.config.ts`) currently targets `webDir: 'build'`, while the default Vite build output remains `dist/`. If you are packaging for mobile, verify the copy/sync workflow before release instead of assuming the build directory matches automatically. Android project is in `android/`.

---

## Mahjong Yaku Route Trainer

A beginner-oriented Riichi Mahjong yaku-awareness tool at `/mahjong/trainer`.

### Location

| Item | Path |
|------|------|
| Page | `src/pages/MahjongTrainer.jsx` |
| Route | `/mahjong/trainer` |
| NavBar entry | `menu.mahjongTrainer` in `src/config/siteStructure.js` |
| Locale keys | `mahjong.*` in `src/locales/zh.json` + `en.json` |
| Tile images | `public/assets/mahjong-tiles/` (34 SVGs, CC0 from FluffyStuff/riichi-mahjong-tiles) |
| Tile components | `src/components/mahjong/MahjongTile.jsx`, `MahjongTilePicker.jsx` |

### UI stack — Mahjong pages are Tailwind-only, zero MUI

All mahjong files use **Tailwind CSS only**. No MUI components, no `sx` props, no `var(--primary)` or other WS theme colours. Most mahjong pages use a plain white background; `/mahjong/centrepiece` is the exception and keeps its page background transparent so the route background remains visible.

**Button style (mahjong trainer/efficiency pages):** action buttons use the black rounded-full pill:
```jsx
className="text-[11px] font-bold px-3 py-1 rounded-full bg-black text-white hover:bg-gray-700 transition-colors"
```
Disabled state: `text-gray-300 cursor-not-allowed` (no background). Do not use bordered/rectangular buttons or MUI `Button` on mahjong pages.

Exception: `/mahjong/centrepiece` follows the upstream `mahtools/riichi-centrepiece` style and intentionally uses transparent, borderless controls.

### Calculation engine (`src/utils/mahjong/`)

| Module | Responsibility |
|--------|----------------|
| `tileParser.js` | Tile model, `parseTiles`, `parseMelds`, `extractHandGroups`, `extractAllHandGroups`, `canCompleteHand`, `generateHandString` |
| `shanten.js` | 3-way shanten: standard (Neval DFS), Chiitoitsu, Kokushi — `computeShanten(tiles, numMelds)`. Based on MahjongRepository/mahjong (MIT). |
| `handSimulator.js` | `evaluateYakuFromDecomposition` (16 standard yaku + 8 yakuman — see coverage below), `findScenarios` (brute-force 0/1-step), all-decomposition yaku matching, `extractYakuRelevantGroups`, `ALL_34_TILES` |
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

**Test suite — run with `npm run test:mahjong`:**
`test-shanten.js`(17) · `test-shanten-extended.js`(19) · `test-agari.js`(33) · `test-ukeire.js`(44) · `test-yaku.js`(54) · `test-yakuman.js`(33) · `test-fu.js`(20) · `test-scoring.js`(59) · `validate-ukeire.js`(Python reference comparison: 38 pass / 10 skip).
Data sourced from riichi.wiki, MahjongRepository/mahjong, and Tenhou-aligned ukeire reference checks.

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
- **No full scoring workflow in trainer** — completed hands can display basic fu/han/point output, but there is no riichi/dora/ippatsu or full win-condition flow.
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
node validate-ukeire.js
npm run test:mahjong:core
```

## Mahjong Centrepiece Page (`/mahjong/centrepiece`)

Lightweight Riichi table state board based on `mahtools/riichi-centrepiece`. It tracks round wind, round number, honba, and seat winds for live table use.

| Item | Path |
|------|------|
| Page | `src/pages/MahjongCentrepiece.jsx` |
| Route | `/mahjong/centrepiece` |
| NavBar entry | `menu.mahjongCentrepiece` in `src/config/siteStructure.js` |

Implementation notes:
- Uses a 3x3 grid matching the upstream centrepiece pattern: four seat winds around the edges and current hand / honba in the centre.
- It is **not** allowed to cover the NavBar. The root container is fixed with `top: clamp(64px, 9dvh, 80px)` and `bottom: 0`, so only the content area below the NavBar is occupied.
- Keep the page background transparent and avoid visible panel backgrounds/borders, so the project route background can show through.
- Current interactions are intentionally minimal: click hand to advance, click honba to increment, corner controls for dark mode, 3/4 players, game length, and reset.
- Do not add scoring, riichi sticks, settlement flows, manual dealer assignment, or history unless explicitly requested; this page should stay closer to a centrepiece than a full score tracker.

---

## NavBar architecture

`src/components/NavBar.jsx` is fully Tailwind-based and section-aware.

### Section data source

`src/config/siteStructure.js` is the single source of truth for section metadata, nav items, home card chips/counts, and legacy redirects. `Home.jsx`, `NavBar.jsx`, and `App.jsx` consume this config. Do not hardcode section tool counts or tool lists in locale files.

Helper boundaries:
- `getSectionToolItems(section, includeAuth)` returns the filtered nav/tool items for a section.
- `getSectionToolCount(section, includeAuth)` and `getSectionToolLabelKeys(section, includeAuth)` derive display data from those items.
- Use these helpers in Home/NavBar instead of duplicating auth filtering or chip derivation.

### Layout

- **Floating pill** — `position: fixed`, `pointer-events-none` on the outer header so content scrolls under the margins; each pill has `pointer-events-auto`.
- **Primary pill** — 3-column CSS grid (`auto 1fr auto`): brand+chip | centered desktop nav | lang toggle + auth.
- **Mobile dropdown** — game sections only. Hamburger button opens a framer-motion height animation dropdown from the primary pill.
- **Mobile brand state** — on `/ws/*`, `/mahjong/*`, and `/tools/*`, the left brand button shows a back arrow plus the app title, with the current section name as a small muted subtitle underneath. The arrow and title both navigate to `/`. Show the section label, not the concrete tool/page label.
- **Mobile brand animation** — the back arrow and section subtitle use `AnimatePresence` with short opacity/position transitions when entering or leaving section pages. Keep this animation subtle and local to the brand area.

### Nav configs

Nav items come from `SITE_SECTIONS`. Desktop preserves grouped dropdowns for `type: "group"` items; mobile uses `getSectionToolItems(...)`. Auth-only links, such as `/ws/record`, use `authRequired: true`.

### Language toggle

A single `<button>` that shows the current locale (`"中文"` or `"EN"`) and calls `setLocale()` on click. The MUI `LanguageToggle` component is no longer used in NavBar.

### ⚠️ Critical rule

**Do not modify calculation engine files** (`tileParser.js`, `shanten.js`, `handSimulator.js`, `yakuBFS.js`, `yakuAnalyzer.js`) when making UI-only changes. The page consumes engine output via `buildTrainerViewModel`; UI layout changes belong in `MahjongTrainer.jsx` and the component files only.
