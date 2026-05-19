#!/usr/bin/env python3
"""
Comprehensive ukeire validation — computes reference output for all test hands.
Outputs JSON for comparison with validate-ukeire.js.

Usage: python3 validate-ukeire.py > ukeire-reference.json
"""
import json
from mahjong.shanten import Shanten
from mahjong.tile import TilesConverter

_S = Shanten()

def s34(t): return _S.calculate_shanten(t)

ALL_34_INFO = (
    [('m', v) for v in range(1, 10)] +
    [('p', v) for v in range(1, 10)] +
    [('s', v) for v in range(1, 10)] +
    [('z', v) for v in range(1, 8)]
)

def h(**kw):
    return TilesConverter.string_to_34_array(**kw)

def key(suit, value):
    return suit + str(value)

def compute_waits(t34):
    # Adding 1 tile must produce a valid count (≤ 14 for standard hand)
    if sum(t34) >= 14:
        return None  # skip — would produce 15-tile hand
    waits = []
    for j, (s, v) in enumerate(ALL_34_INFO):
        remaining = 4 - t34[j]
        if remaining <= 0: continue
        t = t34[:]
        t[j] += 1
        try:
            if s34(t) == -1:
                waits.append({'tile': key(s,v), 'remaining': remaining})
        except ValueError:
            pass
    return waits

def compute_ukeire(t34_orig):
    current = s34(t34_orig)
    results = []
    seen = set()
    for i, (suit, value) in enumerate(ALL_34_INFO):
        if t34_orig[i] == 0: continue
        if i in seen: continue
        seen.add(i)

        effective = []
        best_after = current
        for j, (ds, dv) in enumerate(ALL_34_INFO):
            remaining = 4 - t34_orig[j]
            if remaining <= 0: continue
            t_new = t34_orig[:]
            t_new[i] -= 1
            t_new[j] += 1
            sh = s34(t_new)
            if sh < current:
                effective.append({'tile': key(ds,dv), 'remaining': remaining})
            if sh < best_after:
                best_after = sh

        results.append({
            'discard': key(suit, value),
            'shantenAfter': best_after,
            'kinds': len(effective),
            'total': sum(e['remaining'] for e in effective),
            'effective': [e['tile'] for e in effective],
        })
    return sorted(results, key=lambda r: (r['shantenAfter'], -r['total']))

# ── All test hands ────────────────────────────────────────────────────────────
HANDS = [
    # ── riichi.wiki canonical: tenpai (shanten=0) ────────────────────────────
    {'id': 'rw-07', 'desc': 'riichi.wiki case 7: 333m567p12789s55z (tenpai)',
     't34': h(man='333', pin='567', sou='12789', honors='55')},
    {'id': 'rw-14', 'desc': 'riichi.wiki case 14: 199m99p55s223355z (chiitoi tenpai)',
     't34': h(man='199', pin='99', sou='55', honors='223355')},

    # ── riichi.wiki: complete (-1) ────────────────────────────────────────────
    {'id': 'rw-01', 'desc': 'riichi.wiki case 1: 258m258p258s1235z (6-shanten)',
     't34': h(man='258', pin='258', sou='258', honors='1235')},

    # ── MahjongRepository shanten extended tests ──────────────────────────────
    {'id': 'ext-01', 'desc': '111234567s + 11p + 567m (complete)',
     't34': h(sou='111234567', pin='11', man='567')},
    {'id': 'ext-02', 'desc': '111345677s + 11m + 567p (tenpai)',
     't34': h(sou='111345677', man='11', pin='567')},
    {'id': 'ext-03', 'desc': '11122245679999s (tenpai)',
     't34': h(sou='11122245679999')},
    {'id': 'ext-04', 'desc': '114477s + 114477p + 76m (chiitoi tenpai)',
     't34': h(sou='114477', pin='114477', man='76')},
    {'id': 'ext-05', 'desc': '114477s + 114479p + 76m (1-shanten chiitoi)',
     't34': h(sou='114477', pin='114479', man='76')},

    # ── Ukeire test hands ────────────────────────────────────────────────────
    {'id': 'uk-01', 'desc': 'shanpon 123456789m + 1155p',
     't34': h(man='123456789', pin='1155')},
    {'id': 'uk-02', 'desc': 'single wait 123456789m + 1255p',
     't34': h(man='123456789', pin='1255')},
    {'id': 'uk-03', 'desc': 'chiitoi tenpai 1122334455m + 66p + 7s',
     't34': h(man='1122334455', pin='66', sou='7')},
    {'id': 'uk-04', 'desc': 'kokushi tenpai 19s + 19p + 19m + 1234567z',
     't34': h(sou='19', pin='19', man='19', honors='1234567')},
    {'id': 'uk-05', 'desc': '1-shanten 111345677s + 56m + 33p',
     't34': h(sou='111345677', man='56', pin='33')},
    {'id': 'uk-06', 'desc': '1-shanten 123456789m + 23p + 56s',
     't34': h(man='123456789', pin='23', sou='56')},
    {'id': 'uk-07', 'desc': '1-shanten H1: 123456789m + 235p + 1z',
     't34': h(man='123456789', pin='235', honors='1')},
    {'id': 'uk-08', 'desc': 'H5: 456789m + 2355p + 789s',
     't34': h(man='456789', pin='2355', sou='789')},

    # ── Yaku test hands (complete hands) ─────────────────────────────────────
    {'id': 'yaku-01', 'desc': 'tanyao: 234567s + 234567m + 22p',
     't34': h(sou='234567', man='234567', pin='22')},
    {'id': 'yaku-02', 'desc': 'pinfu: 123456s + 123456m + 55p',
     't34': h(sou='123456', man='123456', pin='55')},
    {'id': 'yaku-03', 'desc': 'chinitsu: 11234567677889m',
     't34': h(man='11234567677889')},
    {'id': 'yaku-04', 'desc': 'honitsu: 123455667m + 11122z',
     't34': h(man='123455667', honors='11122')},
    {'id': 'yaku-05', 'desc': 'iipeikou: 112233s + 333m + 12344p',
     't34': h(sou='112233', man='333', pin='12344')},

    # ── Extra edge cases ──────────────────────────────────────────────────────
    {'id': 'edge-01', 'desc': '2-shanten: 4566677s + 1367p + 8m + 12z',
     't34': h(sou='4566677', pin='1367', man='8', honors='12')},
    {'id': 'edge-02', 'desc': 'ittsu tenpai: 123456789m + 123p + 22z (13 tiles)',
     't34': h(man='123456789', pin='123', honors='22')},
    {'id': 'edge-03', 'desc': 'sanshoku tenpai: 123s + 123p + 12399m + 33z',
     't34': h(sou='123', pin='123', man='12399', honors='33')},
]

output = []
for hand in HANDS:
    t34 = hand['t34']
    sh = s34(t34)
    entry = {'id': hand['id'], 'desc': hand['desc'], 'shanten': sh}
    if sh == 0:
        entry['waits'] = compute_waits(t34)
    elif sh > 0:
        entry['ukeire'] = compute_ukeire(t34)[:8]  # top 8 discards
    output.append(entry)

print(json.dumps(output, ensure_ascii=False, indent=2))
