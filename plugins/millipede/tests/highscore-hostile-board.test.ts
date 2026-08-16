// plugins/millipede/tests/highscore-hostile-board.test.ts
//
// Story ml10-2 — REWORK round 1, RED (Leeloo / TEA). Reviewer [SEC] HIGH: ml10-2 wires an
// UNTRUSTED persisted high-score board into the attract renderer. The only gate on a stored
// row is @shared/highscore.isHighScoreRow, which checks SHAPE only (`typeof name === 'string'
// && Number.isFinite(score)`) — it admits a lowercase/punctuation/unicode name or a negative /
// fractional / huge score. `core/attract-showcase.ts` then feeds `entry.name` and
// `String(entry.score)` through `place()` → `encodeChar()`, which THROWS `RangeError` for any
// character outside A-Z / 0-9 / space. Because `renderShowcase` runs inside the uncaught
// `requestAnimationFrame` loop (`main.ts` `frame()`), that throw kills the animation loop
// permanently — the game freezes until a full page reload. Reachable on a plain boot once the
// attract cycle reaches the HIGH SCORES showcase (~7s in), and via the cross-subdomain legacy
// cookie seed. Before ml10-2 the board was the hardcoded ROM DEFAULT_HIGH_SCORES (all-caps),
// so this was unreachable — this story introduces it.
//
// This test boots the REAL shell over a fake localStorage seeded with a hostile board and runs
// a full attract cycle (crossing the showcase window) — it must NOT throw. It is fix-agnostic:
// whether Dev filters `loadHighScores`'s rows to the renderable charset (dropping bad rows →
// fall back to DEFAULT) or makes `encodeChar`/`place` fail safe (render a blank for an
// unencodable char, as the HUD's `sixDigitStamps` already does), the observable is the same —
// a hostile stored board never crashes the attract render. Own file because boot-shell imports
// `src/main` once per module (module-cached), and the seeded storage must be installed BEFORE
// that boot import.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'
import { highScoreKey, isHighScoreRow } from '@shared/highscore'

const KEY = highScoreKey('millipede')

function makeFakeStorage(initial: Record<string, string>): Storage {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage
}

// A board the SHAPE guard admits but the millipede glyph encoder cannot render: a lowercase
// name and a negative score both contain characters (`a`..`z`, `-`) outside encodeChar's
// A-Z/0-9/space set. This is exactly what the legacy-cookie seed / a sibling subdomain can plant.
const HOSTILE_BOARD = [
  { name: 'abc', score: 5000 },
  { name: 'AAA', score: -1 },
]

describe('ml10-2 rework [SEC] — a hostile persisted board must not crash the attract showcase', () => {
  let shell: ShellHarness

  beforeAll(async () => {
    // Sanity: the hostile rows genuinely pass the only gate ml10-2 relies on, so they really
    // do reach GameState.highScores — the test is not vacuous.
    for (const row of HOSTILE_BOARD) expect(isHighScoreRow(row)).toBe(true)
    ;(globalThis as Record<string, unknown>).localStorage = makeFakeStorage({
      [KEY]: JSON.stringify(HOSTILE_BOARD),
    })
    shell = await bootMillipedeShell()
  })

  afterAll(() => {
    delete (globalThis as Record<string, unknown>).localStorage
  })

  it('renders a full attract cycle — including the HIGH SCORES showcase window — without throwing', () => {
    // ~5 sim steps per frame() (the fixed-clock catch-up cap), so ~200 calls step well past a
    // full 720-frame attract cycle, guaranteeing the showcase window [420,720) is rendered with
    // the hostile board in state. Any encodeChar RangeError surfaces as a thrown frame().
    expect(() => {
      for (let i = 0; i < 200; i++) shell.frame(i * 100)
    }).not.toThrow()
    // Non-vacuity: prove we actually stepped past a full cycle, so the showcase render ran.
    expect(
      shell.sim().frame,
      'must step past a full attract cycle (>720) so the showcase render was exercised',
    ).toBeGreaterThan(720)
  })
})
