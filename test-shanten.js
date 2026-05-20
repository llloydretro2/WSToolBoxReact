/**
 * Lightweight shanten test suite — riichi.wiki/Mahjong_programming_tests
 *
 * 17 canonical test cases covering:
 *   - Standard shanten decreasing 6→0 (cases 1–7, 15–16)
 *   - Kokushi / terminal accumulation path 6→0 (cases 8–14)
 *   - Chiitoitsu tenpai detection (case 14)
 *   - 14-tile hand (case 17)
 *
 * Source: https://riichi.wiki/Mahjong_programming_tests
 */
import { computeShanten } from './src/utils/mahjong/shanten.js';

// ── MPSZ parser ───────────────────────────────────────────────────────────────
// Converts e.g. "258m56p19s135z" → [{suit:'m',value:2}, ...]

function parseMPSZ(str) {
  const tiles = [];
  let pending = [];
  for (const ch of str) {
    if (/\d/.test(ch)) {
      pending.push(parseInt(ch, 10));
    } else if ('mpsz'.includes(ch)) {
      for (const v of pending) tiles.push({ suit: ch, value: v });
      pending = [];
    }
  }
  return tiles;
}

// ── Test cases from riichi.wiki ───────────────────────────────────────────────

const CASES = [
  // Standard path 6→0
  { hand: '258m258p258s1235z',  expected: 6, note: 'All isolated'                           },
  { hand: '238m2589p58s1225z',  expected: 5, note: '3 proto-groups'                         },
  { hand: '2389m56p1289s235z',  expected: 4, note: '5 proto-groups, no pair'                },
  { hand: '3389m56p1289s235z',  expected: 3, note: '5 proto-groups + pair'                  },
  { hand: '333m56p1289s2557z',  expected: 2, note: '1 complete set + 4 proto-groups'        },
  { hand: '333m567p1289s255z',  expected: 1, note: '2 complete sets + 3 proto-groups'       },
  { hand: '333m567p12789s55z',  expected: 0, note: 'Tenpai (3 sets + 2 proto)'              },

  // Kokushi / terminal accumulation 6→0
  { hand: '259m159p258s1235z',  expected: 6, note: '7 terminal types, no pair'              },
  { hand: '259m159p158s1235z',  expected: 5, note: '8 terminal types, no pair'              },
  { hand: '259m159p18s12335z',  expected: 4, note: '8 terminal types, 1 terminal pair'      },
  { hand: '159m159p18s12335z',  expected: 3, note: '9 terminal types, 1 terminal pair'      },
  { hand: '199m159p19s12335z',  expected: 2, note: '10 terminal types, 2 terminal pairs'    },
  { hand: '199m199p55s22335z',  expected: 1, note: '5 pairs, no complete sets'              },
  { hand: '199m99p55s223355z',  expected: 0, note: 'Chiitoitsu tenpai (6 pairs)'            },

  // Additional
  { hand: '123m258p258s1235z',  expected: 6, note: '1 complete sequence, rest isolated'     },
  { hand: '111m258p258s1235z',  expected: 5, note: '1 complete triplet, rest isolated'      },

  // 14-tile hand
  { hand: '458m158p158s12357z', expected: 6, note: '14-tile starting hand'                  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const { hand, expected, note } of CASES) {
  const tiles    = parseMPSZ(hand);
  const numMelds = 0;
  const got      = computeShanten(tiles, numMelds);
  const ok       = got === expected;

  if (ok) {
    passed++;
    console.log(`  ✓  ${hand.padEnd(22)} shanten=${got}  (${note})`);
  } else {
    failed++;
    console.log(`  ✗  ${hand.padEnd(22)} expected=${expected} got=${got}  (${note})`);
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`  ${passed}/${CASES.length} passed${failed > 0 ? `  —  ${failed} FAILED` : '  — all correct ✅'}`);
console.log(`${'─'.repeat(60)}\n`);
if (failed > 0) process.exitCode = 1;
