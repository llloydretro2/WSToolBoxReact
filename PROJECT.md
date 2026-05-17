# WSToolBox Frontend — Project Status

> Last updated: 2026-05-16

## Deployment

- **Production URL**: Cloudflare Pages (deployed from `main` branch)
- **Deploy method**: push `main` to `origin` → Cloudflare Pages auto-deploys
- **Backend**: `https://api.cardtoolbox.org` (WS card data, deck management, auth)
- **Dev proxy**: `/api` and `/audios` → `http://localhost:4000`

## Current feature work

### Branch: `feature/mahjong-yaku-trainer`

**Status: MVP completed, ready to merge**

#### Product goal

A beginner-friendly Riichi Mahjong yaku-awareness trainer. Helps new players understand which yaku routes are reachable from their current hand, what tiles are needed, what should be discarded, and what the resulting hand structure looks like.

#### Completed capabilities

| Capability | Notes |
|---|---|
| Visual tile picker | 34-tile grid grouped by suit/honour; left-click adds, right-click removes |
| Fixed current-hand bar | `position: fixed` below AppBar — shows live concealed tiles + open melds at all times while scrolling |
| Tile count indicator | Shows concealed/meld/total counts in the fixed bar |
| Open meld support | Meld builder: select tiles, Add Meld, melds shown in fixed bar with × removal |
| Seat wind / round wind selectors | Drives Yakuhai detection |
| Rule toggles | Open Tanyao (kuitan), Two-han minimum |
| Hand status panel | Shanten badge, open/closed chip, confirmed yaku chips |
| Yaku route cards | 14 regular yaku + 9 yakuman; sorted by feasibility |
| Collapsible route detail | Collapsed = name/meaning/example; expanded = Need/Discard/Target/Why |
| Accurate shanten calculation | 3-way (standard Neval DFS + Chiitoitsu + Kokushi), `shanten.js` |
| Exact one-step simulation | Brute-force 34-draw scan for 0/1-step completions |
| Bounded BFS route search | Depth-2, per-yaku pruned draw/discard candidates, ≤280 states |
| Heuristic/reference fallback | Fires when BFS finds nothing; clearly labelled "Reference route" |
| Real mahjong tile images | 34 SVGs from FluffyStuff/riichi-mahjong-tiles (CC0 public domain) |
| Responsive layout | Mobile-friendly: tiles wrap, cards stack, no horizontal overflow |
| Back-to-top Fab | Fixed bottom-right, smooth scroll to tile picker |

#### Known limitations (next phase)

| Limitation | Impact |
|---|---|
| First-decomposition only (`extractHandGroups`) | May miss yaku in ambiguous hands (e.g. `223344m` = Iipeikou OR Toitoi) |
| No `extractAllHandGroups` | Cannot evaluate all valid decompositions per hand |
| No ukeire | Cannot enumerate all tiles that improve shanten |
| No scoring (fu/han/dora) | Cannot calculate point values |
| Pinfu wait check simplified | Kanchan/penchan falsely labelled Pinfu |
| BFS draw-candidate over-pruning | May miss structural fixes from non-yaku tiles |
| Sanankou win-method not enforced | Does not distinguish tsumo vs ron |

## Merging to deploy

```bash
git checkout main
git pull origin main
git merge feature/mahjong-yaku-trainer   # fast-forward, no conflicts expected
npm run build                             # verify
git push origin main                      # triggers Cloudflare Pages deploy
```

## Recommended next phase

1. **`extractAllHandGroups`** — try all valid decompositions; required for accurate Toitoi/Iipeikou/Sanankou detection
2. **Ukeire** — enumerate shanten-improving tiles (O(34) shanten calls per hand)
3. **Wait classification** — distinguish ryanmen/kanchan/penchan/tanki; fixes Pinfu labelling
4. **Engine refactor** (optional) — split `yakuAnalyzer.js` into `engine/feasibility.js` + `engine/scenarios.js` + `trainer/analyzer.js` for reuse by future tools
5. **Scoring** — fu/han calculation, basic point table (only if a score-display feature is planned)
