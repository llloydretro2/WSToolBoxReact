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
