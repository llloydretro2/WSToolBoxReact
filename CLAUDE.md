# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CardToolBox Frontend — a React + Vite PWA that has expanded from a Weiss Schwarz tool into a multi-game platform. Currently hosts Weiss Schwarz tools (card search, pack simulator, match records, shuffle), Riichi Mahjong tools (yaku trainer, efficiency analysis, centrepiece table board), and general game utilities (first/second, dice, chess clock, audio board). Domain: `cardtoolbox.org`.

## 开发规范

**提交前必须更新文档。** 每次完成一个功能、重构或重要修复后，在 `git commit` 之前必须先更新对应文档：
- 架构/约定变更 → 更新 `CLAUDE.md`
- 功能开发/完成阶段 → 更新 `PROJECT.md`（追加 session 记录）

---

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
| `/ws/*` | Weiss Schwarz | `/ws/cards`, `/ws/cards/en`, `/ws/packs`, `/ws/simulator`, `/ws/shuffle`, `/ws/damage`, `/ws/card-maker`, `/ws/record` |
| `/mahjong/*` | Mahjong | `/mahjong/trainer`, `/mahjong/efficiency`, `/mahjong/centrepiece` |
| `/tools/*` | General tools | `/tools/first-second`, `/tools/dice`, `/tools/clock`, `/tools/audio` |
| `/login` | Auth | `/login` |

Legacy flat paths (e.g. `/cardlist`, `/mahjong`, `/dice`) redirect to the new paths via `<Navigate replace>` in `App.jsx`.

**Note:** All deck management pages (DeckCreate, DeckSearch, Deck, DeckEdit) have been deleted. They are kept only in git history and historical session notes; there is no active route or page component left in `src/pages/`. `/ws/record` is protected by `ProtectedRoute` and redirects unauthenticated users to `/login`.

**`/ws/record` feature summary:** Two-tab layout (创建 / 查询). The query tab includes:
- Inline stats bar (total / wins / losses / win rate) computed from `filteredRecords`
- Deck filter: set via the Deck analysis tab, clears with ×; `filteredRecords` is derived from `records + deckFilter`
- Analysis dialog (6 tabs): 走势 (recent form squares + SVG win-rate trend chart by week/month) · 我方 · 对手 · 矩阵 (matchup matrix with PNG export via Canvas API) · 赛事 · 卡组 (series/deck two-line layout with click-to-filter)
- All analysis charts use full `records`; only the summary bar and card list respect `deckFilter`
- Pure CSS stacked bars for W/D/L breakdown; pure SVG for trend chart; pure Canvas for PNG export — zero chart library dependencies

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

**Migration complete: all pages are Tailwind-only. MUI is no longer used in any page component.**

Tailwind is configured with `corePlugins.preflight: false` so it does not reset MUI's global styles. Config: `tailwind.config.js` + `postcss.config.js`. Directives are at the top of `src/index.css`.

Since preflight is disabled, `src/index.css` manually resets browser defaults for native elements used in Tailwind pages:
```css
input, textarea, select { box-sizing: border-box; }
button { background: none; border: none; padding: 0; cursor: pointer; font: inherit; }
```
Without these, `w-full` inputs overflow their containers and `<button>` elements show browser chrome (gray background, border).

- **NavBar** — fully Tailwind. Uses MUI only for `Menu`/`MenuItem` (dropdowns), `Avatar`/`Badge`, `Snackbar`, `Tooltip`.
- **WS pages** — all fully migrated:
  - `Record.jsx`, `PickPacks.jsx`, `Simulator.jsx`, `RandomShuffle.jsx` — fully migrated. `Record.jsx` reference patterns: native `<input type="date">` replaces DatePicker; `SeriesCombobox` (Headless UI) replaces MUI Autocomplete; all dialogs are native modals.
  - `JPCardList.jsx` (JP) and `ENCardList.jsx` (EN) — fully migrated. JP card_type values are Japanese (`"クライマックス"`, `"キャラ"`, `"イベント"`); Climax rotation check must use `"クライマックス"`, not `"Climax"`.
- **General tool pages** — all fully migrated to Tailwind: `FirstSecond`, `Dice`, `ChessClock`, `AudioBoard`, `Login`.
- **Home.jsx** — fully migrated to Tailwind.
- **Mahjong pages** — Tailwind-first. `/mahjong/centrepiece` is a special transparent fixed board below the NavBar.

## Tailwind migration conventions

These conventions define the target style system for all Tailwind pages, derived from the Mahjong tool design language adapted for the Spring Rain theme. All pages now use these conventions.

### Migration rules

- Migrate **whole pages** at once, not partially. A page is either MUI or Tailwind — no mixing `sx` props and `className` at the same component level.
- **MUI islands** are no longer needed in `Record.jsx`. `DatePicker` has been replaced with native `<input type="date">`. All pages that still use MUI may retain MUI islands where MUI components have no direct Tailwind replacement.
- `ButtonVariants` and `AnimatedButton` have been deleted — all pages now use plain `<button>` with Tailwind classes.
- Use **Lucide icons** (`lucide-react`) in all new Tailwind components. MUI icons only in components that still use MUI.
- Never mix `className` and `sx` on the same element.
- **`Autocomplete` → `@headlessui/react` `Combobox`**: use the `SeriesCombobox` pattern in `Record.jsx` as reference. Key points: `immediate` prop for open-on-focus, `anchor={{ to: "bottom start", gap: 4 }}` on `Combobox.Options` to portal the dropdown outside stacking contexts (`backdrop-filter` creates a stacking context that traps `z-index`).
- **`Dialog` → native modal**: backdrop `fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm`, click-outside closes, inner card is `bg-white rounded-2xl shadow-xl p-6`. See the reset confirmation dialog in `Record.jsx` as reference.
- **禁止使用原生 `<select>` 元素**作为用户可见的下拉选择 UI。所有下拉菜单须使用符合主题的自定义面板（`bg-white border border-[var(--border)] rounded-xl shadow-lg`），点击外部关闭（`mousedown` 事件监听 + `useRef`）。**关键约束**：当下拉面板的祖先元素含有 `backdrop-filter`（如 `backdrop-blur-md`）或 `overflow-hidden` 时，这两者均会创建新 stacking context 或裁剪绝对定位子元素，导致面板被隐藏或截断。此时必须使用 `createPortal` 将面板渲染到 `document.body`，并配合 `position: fixed` + `getBoundingClientRect()` 计算视口坐标定位。参考实现：`DamageCalculator.jsx` 中的 `VarDropdown` 组件。

  ```jsx
  // ✅ 正确：createPortal + fixed 定位，绕过所有 stacking context
  {open && createPortal(
    <div ref={panelRef}
      style={{ position: "fixed", top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
      className="bg-white border border-[var(--border)] rounded-xl shadow-lg p-1">
      {/* 选项列表 */}
    </div>,
    document.body
  )}

  // ❌ 错误：原生 select
  <select className="...">...</select>

  // ❌ 错误：absolute 定位在含 backdrop-filter 的祖先内
  <div className="absolute top-full z-50 ...">...</div>
  ```

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

## WS 卡牌数据模型（后端 API 返回格式）

后端 JP 卡牌数据（`GET /api/cards/jp`）使用以下字段，前端处理时注意：

### trigger 字段（重要：已变更为数组）

`trigger` 字段类型为 **`[String]`（字符串数组）**，不再是单个字符串。

```js
// 正确渲染方式
card.trigger?.join(", ")   // 无 trigger → undefined（不显示）
card.trigger?.length > 0   // 判断是否有 trigger
```

合法 trigger 值：`soul+1`、`soul+2`、`pool`、`comeback`、`return`、`draw`、`treasure`、`shot`、`gate`、`standby`、`choice`、`discovery`、`chance`，以及早期历史值 `focus`（6 张特殊卡）。

> ⚠️ 旧代码如果使用 `card.trigger === "soul+1"` 等字符串比较会失效，需改为 `card.trigger?.includes("soul+1")`。

### color 字段

合法值：`yellow`、`green`、`red`、`blue`、`purple`。

紫色（`purple`）于 2026-02-26 加入官方数据，数据库中目前共 2 张紫色卡。颜色 filter 和颜色显示 UI 应包含 purple。

### soul 字段

`soul` 字段存储 `0` 或 `1`（数字），表示该卡是否有 soul 标记。`soul+1`、`soul+2` 是 **trigger 类型**（属于 trigger 数组），与 soul 字段无关。

前端 soul 过滤器的 URL 参数必须发送 `soul=1`（数字），不能发送 `soul=soul`（字符串），后端将其作为数值范围解析。

### side 字段

`side` 字段合法值：`"w"`（Weiß）、`"s"`（Schwarz）、`"ws"`（WS サイド——双边促销卡，如特典、联动等）。数据库原始值为 API 数字 ID，由 `fetch_cards.py` 的 `SIDE_MAP` 转换：

```python
SIDE_MAP = {"-1": "w", "-2": "s", "-3": "ws"}
```

i18n 中 `pages.cardList.sides` 必须包含三个键：`{"w": "Weiß", "s": "Schwarz", "ws": "WS"}`。

---

## EN 卡牌数据模型（后端 API 返回格式）

后端 EN 卡牌数据（`GET /api/cards/en`）字段与 JP 基本一致，但有以下差异：

### trigger 字段

EN 的 `trigger` 同样是 `[String]` 数组，渲染方式与 JP 相同：

```js
card.trigger?.length > 0   // 判断是否有 trigger
card.trigger?.join(", ")   // 渲染显示
```

### feature（Trait）字段

EN 数据库字段名为 `feature`（与 JP 一致）。注意：`attachRelatedCards` 在 `enRoutes.js` 中将相关卡的 `feature` 映射为 `trait` 字段返回，但主卡对象本身仍使用 `feature`。

### related_cards 字段

`GET /api/cards/en` 返回的每张卡包含 `related_cards` 数组，由后端 `attachRelatedCards()` 注入：

```js
card.related_cards  // Array<RelatedCard> | []（不会为 undefined）

// RelatedCard 对象结构：
{
  cardno, name, image_url,
  series, series_number, product_name,
  rarity, card_type, color,
  level, cost, power, soul,
  trigger,   // [String] 数组
  effect, flavor,
  trait,     // 对应数据库的 feature 字段
}
```

`CardDetailModal` 中点击相关卡会通过 `onRelatedCardClick` 回调直接切换 `selectedCard`，无需再次请求 API。

### trigger 过滤器 URL 编码

filter 参数中 `+` 必须编码为 `%2B`，否则服务器解析为空格：

```js
// ✅ 正确
params.set("trigger", "soul+1")  // URLSearchParams 自动编码为 %2B
// ❌ 错误
`/api/cards/en?trigger=soul+1`   // + 被解析为空格，查询失败
```

## EN 卡片列表页实现说明（ENCardList.jsx）

### Climax 卡图旋转

官方 WS 卡图尺寸：普通卡 400×559（竖版，5:7），Climax 卡 559×400（横版，7:5）。
展示时 Climax 卡图旋转 90°，使其在相同的 5:7 竖版容器内正常显示。

### `CardImage` 组件

`ENCardList.jsx` 内定义的局部组件，统一处理卡图展示和 Climax 旋转：

```jsx
// 容器始终为 5/7 竖版，overflow: hidden
<div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: "5/7" }}>
  <LazyImage src={src} alt={alt} style={isClimax ? CLIMAX_IMG_STYLE : NORMAL_IMG_STYLE} />
</div>
```

两种 style 常量均使用绝对定位填满容器（`height: "100%"` 在非绝对定位时无法可靠解析 `aspect-ratio` 派生的父高度）：

```js
// 普通卡：绝对定位填满容器
const NORMAL_IMG_STYLE = {
  position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "0",
};

// Climax 卡：旋转数学
// 容器 W×1.4W（5/7），旋转前元素尺寸 1.4W×W（横版），旋转后恰好填满容器
const CLIMAX_IMG_STYLE = {
  position: "absolute",
  width: "140%", height: "71.43%",   // 1.4W × W
  top: "14.285%", left: "-20%",      // 居中偏移
  transform: "rotate(90deg)",
  borderRadius: "0",
};
```

`CardImage` 仅用于卡片列表网格。`CardDetailModal` 中主图仍使用原始 `LazyImage`（`objectFit: contain`），不做旋转。

---

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

This project uses **MUI v7**. Always use the `size` prop, never the v5 `item` prop:

```jsx
// ✅ Correct (v6)
<Grid size={{ xs: 12, md: 6 }}>

// ❌ Wrong (v5 legacy)
<Grid item xs={12} md={6}>
```

## Button components

`ButtonVariants.jsx` and `AnimatedButton.jsx` have been deleted. All pages use plain `<button>` with Tailwind classes — see the Tailwind migration conventions section for button patterns.

## Localisation

Default locale: `zh`. Fallback locale: `zh`. Keys live in `src/locales/zh.json` and `src/locales/en.json`. Template variables use `{{varName}}` syntax:

```jsx
const { t } = useLocale();
t("deck.cardCount", { count: 50 })
```

### 硬编码中文禁止规则

**实现或修复任何页面时，不得在 JSX / JS 中硬编码中文字符串。** 所有用户可见的文字必须通过 `t()` 访问，并在两个 locale 文件中同时添加对应键值。

```jsx
// ❌ 禁止
<button>确认</button>
setError("操作失败，请重试");

// ✅ 正确
<button>{t("common.confirm")}</button>
setError(t("errors.requestFailed"));
```

**新增 locale 键的流程：**
1. 在 `zh.json` 添加中文值
2. 在 `en.json` 添加对应英文值（两个文件必须保持键结构完全一致）
3. 在组件中使用 `t("key")`

**例外（不需要走 locale）：**
- 麻将页面已有的 `locale === 'zh' ? ... : ...` 内联双语模式（历史遗留，新增内容也建议改用 `t()`）
- WS 专有术语（Soul、Gate、Shot 等国际通用词）
- `alt=""` 等纯辅助属性（对最终用户不可见）
- `console.log` / `console.error` 等开发调试输出
- `throw new Error(...)` 中的内部错误标识符（不直接渲染到 UI）

**When adding UI text, add keys to **both** locale files.**

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

## Damage Calculator Page (`/ws/damage`)

WS combat/refresh damage simulator. Pure front-end (no backend); Monte-Carlo sampling plus a DP-derived policy sequence.

| Item | Path |
|------|------|
| Page | `src/pages/DamageCalculator.jsx` |
| Route | `/ws/damage` |
| Engine | `src/utils/wsDamage/` |
| NavBar entry | `menu.damage` in `src/config/siteStructure.js` |

Engine layout (`src/utils/wsDamage/`):

| File | Role |
|------|------|
| `types.js` | Frozen enums: `CardType`, `Color`, `TriggerType`, `ZoneId`, `OpType`; `ORDERED_ZONES` (deck/clock/level/stock) vs `UNORDERED_ZONES` (rest/memory/hand) |
| `card.js` | `makeCharacter`, `buildSimpleDeck`, `buildRealisticDeck` |
| `state.js` | `createState`; zone model with ordered vs unordered semantics + refresh |
| `executor.js` | `executeSequence`, `executeOperation` — applies operations to state |
| `window.js` | Trigger/damage window resolution (soul, cancel checks) |
| `rules.js` | Refresh, cancel, and damage rules |
| `simulator.js` | `simulate` (Monte-Carlo), `analyticalNoCancel`, `analyticalExpectedDamage` |
| `dp.js` | `buildPolicySequence` — optimal attack ordering |
| `stepSpecBuilder.js` | `groupsToSpecSequence`, `groupsToLabelSequence` — UI groups → engine specs |
| `index.js` | Public API barrel |
| `test-engine.js`, `test-cross-validation.js` | Self-tests / Monte-Carlo-vs-analytical cross validation |

**Do not modify the engine files when making UI-only changes** (same rule as the Mahjong engine). The page consumes the engine via `simulate` / `buildPolicySequence` and the `stepSpecBuilder` adapters.

---

## Card Maker Page (`/ws/card-maker`)

WS custom/proxy card image generator rendered to a `<canvas>`.

| Item | Path |
|------|------|
| Page | `src/pages/CardMaker.jsx` |
| Route | `/ws/card-maker` |
| Renderer | `src/utils/wsCardMaker/` |
| NavBar entry | `menu.cardMaker` in `src/config/siteStructure.js` |

- `renderer.js` — `renderCard(ctx, cardData)` draws the full card; `ensureFonts()` must resolve before rendering so custom fonts are loaded.
- `layout.js` — `getCanvasSize()` and layout geometry.
- `DEFAULT_CARD` in `CardMaker.jsx` documents the editable fields (type/side/color/level/cost/power/souls/trigger/trigger2/backup/name/trait1/trait2/effect/flavor/serial/artist/art).

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
