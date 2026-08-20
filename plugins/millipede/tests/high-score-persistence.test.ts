// plugins/millipede/tests/high-score-persistence.test.ts
//
// Story ml5-4 — RED phase (Han Solo / TEA). Persist the Millipede high-score ladder
// via ONE-ORIGIN localStorage under highScoreKey('millipede'), reusing the fleet's
// asteroids/joust/mc7 consumer pattern. ml5-3 landed the pure CORE table + initials
// (src/core/highscore.ts: MilliHighScore, DEFAULT_HIGH_SCORES, MILLI_HIGH_SCORE_DEPTH,
// qualifiesForHighScore/insertHighScore/stepInitials) — deliberately UNWIRED, "no
// storage here (that is ml5-4's shell job)". This story adds the SHELL persistence
// module and nothing else.
//
// ─── WHAT DEV (Yoda) BUILDS ──────────────────────────────────────────────────────
// A new module `src/shell/highscore.ts`, the battlezone/mc7 base-shape precedent
// (MilliHighScore is the shared base row { name, score } with NO domain field, so it
// binds `isHighScoreRow` directly rather than makeHighScoreRowGuard(field)):
//
//   export const MILLI_HIGH_SCORE_GAME_ID = 'millipede'
//   export function makeMilliHighScoreStorage(): HighScoreStorage<MilliHighScore>
//       => makeHighScoreStorage<MilliHighScore>(MILLI_HIGH_SCORE_GAME_ID, isHighScoreRow, '')
//   export function loadHighScores(storage): readonly MilliHighScore[]
//       => storage.load() has rows ? those : DEFAULT_HIGH_SCORES   // seeded ROM ladder
//
// ─── WHAT IS OUT OF SCOPE (ml7) ──────────────────────────────────────────────────
// millipede's src/main.ts is an ATTRACT-SCREEN DEMO (ml7-3): no state machine, no
// GameState.highScores, no game-over/name-entry commit. The epic reserves "attract
// state machine + WIRING + HUD render" for ml7. So this story does NOT wire main.ts
// (read-on-boot / write-on-commit call-sites) — it delivers the module ml7 will call.
// See the session's Delivery Findings. The save/load FUNCTIONS are fully built + tested
// here; only their in-game call-sites are ml7's.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// The `describe('shared contract …')` group asserts the shared invariants the module
// depends on and is GREEN today (it guards the key + base-shape round-trip the module
// relies on — a non-vacuous floor). Every group that needs `src/shell/highscore.ts`
// loads it through a VARIABLE-specifier dynamic import (`loadExport`) so `tsc --noEmit`
// (the lint gate) stays GREEN while the module does not exist, and the RED lands at
// RUNTIME with a message naming exactly what Dev must create — the mc7-3 / RED-seam
// idiom. millipede's vitest project is `environment: 'node'` (no localStorage), so the
// battlezone/mc7 fake-Storage harness installs a stub on globalThis per test.

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import {
  DEFAULT_HIGH_SCORES,
  MILLI_HIGH_SCORE_DEPTH,
  type MilliHighScore,
} from '../src/core/highscore.js'
import {
  makeHighScoreStorage,
  isHighScoreRow,
  highScoreKey,
  type HighScoreStorage,
} from '@shared/highscore'

const GAME_ID = 'millipede'

// ─── the pure shell surface Dev (Yoda) implements ────────────────────────────────
// Reached through a variable specifier so tsc never resolves a not-yet-created module
// (keeping the lint gate green); the RED lands at runtime with a Dev-actionable message.
const HS_SHELL_SPEC = '../src/shell/highscore.js'

type LoadHighScores = (storage: HighScoreStorage<MilliHighScore>) => readonly MilliHighScore[]
type MakeMilliHighScoreStorage = () => HighScoreStorage<MilliHighScore>

async function loadExport<T>(spec: string, name: string): Promise<T> {
  let mod: Record<string, unknown>
  try {
    mod = (await import(/* @vite-ignore */ spec)) as Record<string, unknown>
  } catch (err) {
    throw new Error(`ml5-4 RED — cannot import ${spec} (Dev must create it): ${String(err)}`)
  }
  const exported = mod[name]
  if (exported === undefined) {
    throw new Error(`ml5-4 RED — ${spec} does not export ${name} yet; Dev must add it.`)
  }
  return exported as T
}

let loadHighScores: LoadHighScores
let makeMilliHighScoreStorage: MakeMilliHighScoreStorage
let MILLI_HIGH_SCORE_GAME_ID: string

// ─── Fake Storage — the node test env has no localStorage (battlezone/mc7 harness) ──
function makeFakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    get length(): number {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  } as Storage
}

function installStorage(storage: Storage | undefined): void {
  if (storage === undefined) {
    delete (globalThis as Record<string, unknown>).localStorage
  } else {
    ;(globalThis as Record<string, unknown>).localStorage = storage
  }
}

beforeEach(() => installStorage(makeFakeStorage()))
afterEach(() => installStorage(undefined))

// A faithful proxy for the lobby's read (the lobby tile filters the SAME shared
// isHighScoreRow over the SAME key and takes the max) — proves the write is
// lobby-readable across the one origin.
function lobbyTopScore(gameId: string): number | null {
  const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(gameId))
  if (raw === null) return null
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) return null
  const scores = parsed.filter(isHighScoreRow).map((row) => row.score)
  return scores.length === 0 ? null : Math.max(...scores)
}

// Two rows in the millipede base shape { name, score } — NO wave/level domain field.
const board: readonly MilliHighScore[] = [
  { name: 'ZAP', score: 123_456 },
  { name: 'KEV', score: 42_000 },
]

// ─── Shared contract the module stands on (GREEN today — the non-vacuous floor) ───
describe('ml5-4 shared contract — the one-origin key + base-shape round-trip', () => {
  it("persists under the exact key the lobby reads: highScoreKey('millipede')", () => {
    expect(highScoreKey(GAME_ID)).toBe('millipede-high-scores')
  })

  it('base-shape { name, score } rows round-trip through the shared storage', () => {
    const seam = makeHighScoreStorage<MilliHighScore>(GAME_ID, isHighScoreRow, '')
    seam.save(board)
    expect(seam.load(), 'the persisted rows must survive their own validator').toEqual(board)
  })

  it('the seeded ROM ladder is eight rungs deep (MILLI_HIGH_SCORE_DEPTH), not the shared 10', () => {
    // ml5-4 must boot Millipede's OWN depth-8 ladder, so pin the fallback source now.
    expect(MILLI_HIGH_SCORE_DEPTH).toBe(8)
    expect(DEFAULT_HIGH_SCORES).toHaveLength(MILLI_HIGH_SCORE_DEPTH)
  })
})

// ─── The shell persistence module (RED until Dev creates src/shell/highscore.ts) ──
describe('ml5-4 — src/shell/highscore.ts persists the ladder under the cabinet key', () => {
  beforeAll(async () => {
    loadHighScores = await loadExport<LoadHighScores>(HS_SHELL_SPEC, 'loadHighScores')
    makeMilliHighScoreStorage = await loadExport<MakeMilliHighScoreStorage>(
      HS_SHELL_SPEC,
      'makeMilliHighScoreStorage',
    )
    MILLI_HIGH_SCORE_GAME_ID = await loadExport<string>(HS_SHELL_SPEC, 'MILLI_HIGH_SCORE_GAME_ID')
  })

  it("exports the cabinet game id 'millipede' (one place, so no 'milli' typo splits the board)", () => {
    expect(MILLI_HIGH_SCORE_GAME_ID).toBe('millipede')
    expect(highScoreKey(MILLI_HIGH_SCORE_GAME_ID)).toBe('millipede-high-scores')
  })

  it('makeMilliHighScoreStorage() saves under the exact one-origin cabinet key', () => {
    makeMilliHighScoreStorage().save(board)
    const raw = (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(GAME_ID))
    expect(raw, 'nothing landed under the cabinet key').not.toBeNull()
    expect(JSON.parse(raw as string)).toEqual(board)
  })

  it('rows persisted through makeMilliHighScoreStorage() are lobby-readable (one origin)', () => {
    makeMilliHighScoreStorage().save(board)
    expect(lobbyTopScore(GAME_ID)).toBe(123_456)
    for (const row of JSON.parse(
      (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(GAME_ID)) as string,
    ) as unknown[]) {
      expect(isHighScoreRow(row)).toBe(true)
    }
  })

  it('loadHighScores returns an EMPTY board on a first / empty boot (pt1-8: no built-in seed)', () => {
    // pt1-8: a fresh cabinet starts CLEAN — the ROM DEFAULT_HIGH_SCORES ladder is no
    // longer seeded onto an empty board. localStorage-backed real scores only, so an
    // empty store yields an empty ladder (any positive score then qualifies, filling it).
    const loaded = loadHighScores(makeMilliHighScoreStorage())
    expect(loaded).toEqual([])
  })

  it('loadHighScores returns the persisted board on a returning boot', () => {
    makeMilliHighScoreStorage().save(board)
    // A FRESH storage instance — proves the board is read from storage, not memoized.
    expect(loadHighScores(makeMilliHighScoreStorage())).toEqual(board)
  })

  it('a saved ladder survives a save → fresh-boot reload and stays lobby-readable', () => {
    makeMilliHighScoreStorage().save(board)
    expect(loadHighScores(makeMilliHighScoreStorage())).toEqual(board)
    expect(lobbyTopScore(GAME_ID)).toBe(123_456)
  })

  it('persists the millipede base shape only — no wave/level domain key is injected', () => {
    makeMilliHighScoreStorage().save(board)
    const rows = JSON.parse(
      (globalThis as { localStorage: Storage }).localStorage.getItem(highScoreKey(GAME_ID)) as string,
    ) as Record<string, unknown>[]
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['name', 'score'])
    }
  })

  // ─── Graceful degradation: persistence must NEVER crash the game (rule #10) ──────
  it('corrupt stored JSON degrades to an EMPTY board, never a throw (pt1-8)', () => {
    installStorage(makeFakeStorage({ [highScoreKey(GAME_ID)]: '{ not json ]' }))
    let loaded: readonly MilliHighScore[] = []
    expect(() => {
      loaded = loadHighScores(makeMilliHighScoreStorage())
    }).not.toThrow()
    expect(loaded).toEqual([])
  })

  it('a non-array / non-row payload is rejected and degrades to an EMPTY board (pt1-8)', () => {
    installStorage(makeFakeStorage({ [highScoreKey(GAME_ID)]: JSON.stringify({ hacked: true }) }))
    expect(loadHighScores(makeMilliHighScoreStorage())).toEqual([])
  })

  it('a stored table with junk rows keeps only the valid base-shape rows on load', () => {
    const junk = JSON.stringify([
      { name: 'OK1', score: 9000 },
      { name: 'BAD', score: 'not-a-number' }, // fails isHighScoreRow
      { nope: 1 }, // fails isHighScoreRow
      { name: 'OK2', score: 100 },
    ])
    installStorage(makeFakeStorage({ [highScoreKey(GAME_ID)]: junk }))
    expect(makeMilliHighScoreStorage().load()).toEqual([
      { name: 'OK1', score: 9000 },
      { name: 'OK2', score: 100 },
    ])
  })

  it('unreachable storage (no localStorage) loads an EMPTY board and save is an inert no-op (pt1-8)', () => {
    installStorage(undefined) // node / private-mode: even reading the global can be absent
    const storage = makeMilliHighScoreStorage()
    expect(loadHighScores(storage)).toEqual([])
    expect(() => storage.save(board)).not.toThrow()
  })
})
