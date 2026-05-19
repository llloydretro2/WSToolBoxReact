#!/usr/bin/env python3
"""
Independent ukeire reference implementation using MahjongRepository/mahjong.
Compares against our JS ukeire.js output.

Usage:
    pip install mahjong
    python3 compare-ukeire.py
"""

try:
    from mahjong.shanten import Shanten
    from mahjong.tile import TilesConverter
    _SHANTEN = Shanten()
    HAS_LIB = True
except ImportError:
    HAS_LIB = False
    print("⚠️  mahjong library not installed. Run: pip install mahjong\n")
    exit(1)


# ── Tile helpers ──────────────────────────────────────────────────────────────

ALL_34 = (
    [('m', v) for v in range(1, 10)] +
    [('p', v) for v in range(1, 10)] +
    [('s', v) for v in range(1, 10)] +
    [('z', v) for v in range(1, 8)]
)

def idx(suit, value):
    if suit == 'm': return value - 1
    if suit == 'p': return 9  + value - 1
    if suit == 's': return 18 + value - 1
    if suit == 'z': return 27 + value - 1

def hand_to_34(**kwargs):
    t = [0] * 34
    for suit, digits in kwargs.items():
        s = {'man':'m','pin':'p','sou':'s','honors':'z'}[suit]
        for d in str(digits):
            t[idx(s, int(d))] += 1
    return t

def shanten_34(t34):
    return _SHANTEN.calculate_shanten(t34)

def tile_label(suit, value):
    names = {1:'東',2:'南',3:'西',4:'北',5:'白',6:'發',7:'中'}
    if suit == 'z': return names[value]
    return f"{value}{'万饼索'['mps'.index(suit)]}"


# ── Reference ukeire ──────────────────────────────────────────────────────────

def compute_ukeire_ref(t34_orig):
    """
    Reference implementation using the REPLACEMENT method:
      effective tile D for discard C = shanten(hand - C + D) < shanten(original)

    This avoids computing shanten on 12-tile intermediate states, which the
    MahjongRepository library rejects (only 3n+1 / 3n+2 counts accepted).
    The replacement method is equivalent to our JS algorithm for nearly all
    practical cases.

    shantenAfter is approximated as: min shanten achievable by swapping C
    with any tile (the best possible hand after discarding C).
    """
    current = shanten_34(t34_orig)
    results = []
    seen = set()

    for i, (suit, value) in enumerate(ALL_34):
        if t34_orig[i] == 0: continue
        if i in seen: continue
        seen.add(i)

        effective = []
        best_shanten_after = current  # will be lowered if any swap improves

        for j, (ds, dv) in enumerate(ALL_34):
            remaining = 4 - t34_orig[j]
            if remaining <= 0: continue

            t34_new = t34_orig[:]
            t34_new[i] -= 1
            t34_new[j] += 1

            sh_new = shanten_34(t34_new)
            if sh_new < current:
                effective.append({'suit': ds, 'value': dv, 'remaining': remaining})
            if sh_new < best_shanten_after:
                best_shanten_after = sh_new

        results.append({
            'discard':      (suit, value),
            'shantenAfter': best_shanten_after,
            'effective':    effective,
            'kinds':        len(effective),
            'total':        sum(e['remaining'] for e in effective),
        })

    return sorted(results, key=lambda r: (r['shantenAfter'], -r['total']))


def compute_waits_ref(t34_orig):
    """Reference waits: tiles that complete the hand."""
    waits = []
    for j, (s, v) in enumerate(ALL_34):
        remaining = 4 - t34_orig[j]
        if remaining <= 0: continue
        t34 = t34_orig[:]
        t34[j] += 1
        if shanten_34(t34) == -1:
            waits.append({'suit': s, 'value': v, 'remaining': remaining})
    return waits


# ── Print helpers ─────────────────────────────────────────────────────────────

def print_ukeire(results, label=''):
    print(f"\n{'─'*60}")
    if label: print(f"  {label}")
    print(f"  {'打出':<6}  {'向听后':>4}  {'种类':>4}  {'张数':>4}  有效牌")
    print(f"  {'─'*56}")
    for r in results:
        disc  = tile_label(*r['discard'])
        eff   = ' '.join(tile_label(e['suit'], e['value']) + f"×{e['remaining']}" for e in r['effective'])
        print(f"  [{disc}]    {r['shantenAfter']:>4}    {r['kinds']:>4}    {r['total']:>4}  {eff or '—'}")

def print_waits(waits, label=''):
    print(f"\n  {label}  待ち牌 ({len(waits)}种 · {sum(e['remaining'] for e in waits)}张)")
    for w in waits:
        print(f"    [{tile_label(w['suit'],w['value'])}] ×{w['remaining']}", end='')
    print()


# ── Test hands ────────────────────────────────────────────────────────────────

HANDS = [
    {
        'id': 'H1',
        'desc': '1向听 — 有孤立字牌 (1-9万+235饼+东)',
        't34': hand_to_34(man='123456789', pin='235', honors='1'),
    },
    {
        'id': 'H2',
        'desc': '听牌 — 双碰 (1-9万+1155饼)',
        't34': hand_to_34(man='123456789', pin='1155'),
    },
    {
        'id': 'H3',
        'desc': '听牌 — 单骑 (1-9万+1255饼)',
        't34': hand_to_34(man='123456789', pin='1255'),
    },
    {
        'id': 'H4',
        'desc': '1向听 — 两组顺子候补 (123m+456m+789m+23p+56s)',
        't34': hand_to_34(man='123456789', pin='23', sou='56'),
    },
    {
        'id': 'H5',
        'desc': '2向听 — 复杂混合手 (456m+789m+23p+55p+789s)',
        't34': hand_to_34(man='456789', pin='2355', sou='789'),
    },
]

for h in HANDS:
    t34   = h['t34']
    melds = h.get('melds', 0)
    sh    = shanten_34(t34)
    print(f"\n{'='*60}")
    print(f"  {h['id']}: {h['desc']}")
    print(f"  向听数: {sh}  (tiles: {sum(t34)}  melds: {melds})")

    if sh > 0:
        results = compute_ukeire_ref(t34)
        print_ukeire(results[:5], '前5打法（最多显示5行）:')
    elif sh == 0:
        waits = compute_waits_ref(t34)
        print_waits(waits, '')
    else:
        print("  → 已和牌")

print(f"\n{'='*60}")
print("  ✅ Python reference output complete.")
print(f"{'='*60}\n")
