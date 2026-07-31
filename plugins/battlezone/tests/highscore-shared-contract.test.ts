// tests/highscore-shared-contract.test.ts
//
// SH-6 (ADR-0001) — the RUNTIME half of the high-score extraction: battlezone's
// captured board, persisted through the SHARED seam, satisfies the SHARED row
// validator the lobby reads with. This is the concrete payoff of SH-4 — the
// lobby's `battlezone` tile stops reading NO SCORE — and it pins the two
// battlezone-specific adoption choices the story leaves to TEA:
//
//   1. Domain-AGNOSTIC. Every other game records a numeric domain field
//      (tempest `level`; star-wars/asteroids `wave`) and binds
//      makeHighScoreRowGuard(field). Battlezone has none — "the run is the
//      unit" — so it binds the base guard isHighScoreRow directly and its entry
//      is a plain HighScoreEntryBase { name, score, date? }. Adding a nominal
//      domain field would rewrite the persisted JSON for no gameplay meaning; the
//      agnostic guard is exactly what the lobby's getTopScore already uses.
//   2. The optional `date` — an extra field the sibling ports don't carry — must
//      survive the shared round-trip (the shared load FILTERS rows, it does not
//      rebuild them, so survivors keep their exact shape).
//
// This suite imports @shared/highscore, which the CURRENT #v0.3.0 pin
// does NOT export (the ./highscore subpath landed in v0.4.0) — so the module
// fails to resolve and the whole file fails to load. That load failure IS the
// RED signal, exactly as battlezone's bz1-10 storage.test.ts framed its own.
//
// It drives battlezone's REAL capture path (core/sim.ts stepGame → the game-over
// auto-cycle folds a qualifying score into the board) so this is battlezone's
// own behaviour, not a re-test of the shared module in isolation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  makeHighScoreStorage,
  isHighScoreRow,
  highScoreKey,
  type HighScoreEntryBase,
} from '@shared/highscore'
import { initGame, type GameState } from '../src/core/state'
import { stepGame, GAME_OVER_SECONDS, ENTRY_SECONDS } from '../src/core/sim'
import { NO_INPUT } from '../src/core/input'

const GAME_ID = 'battlezone'

// ---- Fake Storage (the node test env has no localStorage) ------------------
// Mirrors battlezone's bz1-10 storage.test.ts harness.

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

// battlezone's persistence seam, as main.ts will build it post-SH-6.
const storage = () => makeHighScoreStorage<HighScoreEntryBase>(GAME_ID, isHighScoreRow, '')

// A faithful proxy for the lobby's read — lobby/src/shell/storage.ts getTopScore
// filters the parsed rows through the SAME shared isHighScoreRow and takes the
// max, so replaying it here proves battlezone's write is lobby-readable at the
// battlezone boundary (no cross-repo import).
function lobbyTopScore(gameId: string): number | null {
  const raw = globalThis.localStorage.getItem(highScoreKey(gameId))
  if (raw === null) return null
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) return null
  const scores = parsed.filter(isHighScoreRow).map((row) => row.score)
  return scores.length === 0 ? null : Math.max(...scores)
}

// Run battlezone's real game-over auto-cycle once with `score`, returning the
// board the sim recorded. SH2-13: a QUALIFYING score now passes through the
// typed initials-entry screen between the card and attract; under NO input it
// times out and commits the (empty) buffer verbatim via the shared table
// logic (core/sim.ts commitEntry) — nothing is auto-tagged any more.
function captureRun(score: number, board: readonly HighScoreEntryBase[] = []): readonly HighScoreEntryBase[] {
  const gameover: GameState = { ...initGame(1), mode: 'gameover', modeAge: 0, score, highScores: board }
  let after = stepGame(gameover, NO_INPUT, GAME_OVER_SECONDS)
  if (after.mode === 'entry') after = stepGame(after, NO_INPUT, ENTRY_SECONDS)
  expect(after.mode, 'the run loop must auto-cycle back to attract').toBe('attract')
  return after.highScores
}

describe('SH-6 AC-1 — battlezone captures a run through the shared table logic', () => {
  it('folds a qualifying untended run into the board under the typed (empty) buffer', () => {
    const board = captureRun(50_000)
    expect(board[0]).toEqual({ name: '', score: 50_000 })
  })

  it('a non-positive run never qualifies (the board stays empty)', () => {
    expect(captureRun(0)).toEqual([])
  })
})

describe('SH-6 AC-3 — the persisted shape satisfies the shared row validator', () => {
  it('every row battlezone persists passes isHighScoreRow', () => {
    const board = captureRun(50_000)
    storage().save(board)

    const raw = globalThis.localStorage.getItem(highScoreKey(GAME_ID))
    expect(raw, 'nothing landed under the conventional key').not.toBeNull()
    const parsed: unknown = JSON.parse(raw as string)
    expect(Array.isArray(parsed)).toBe(true)
    expect((parsed as unknown[]).length).toBeGreaterThan(0)
    for (const row of parsed as unknown[]) {
      expect(isHighScoreRow(row), `row failed the shared validator: ${JSON.stringify(row)}`).toBe(true)
    }
  })

  it("battlezone's domainless entry { name, score } passes the shared guard (decision: agnostic)", () => {
    // No `level`/`wave` field — proves the base guard, not makeHighScoreRowGuard,
    // is battlezone's validator. A row carrying a spurious domain field is not
    // required, and its absence must not disqualify the row.
    expect(isHighScoreRow({ name: 'AAA', score: 50_000 })).toBe(true)
  })

  it('the optional `date` field survives the shared save→load round-trip', () => {
    const dated: HighScoreEntryBase[] = [
      { name: 'AAA', score: 50_000, date: '2026-07-07T00:00:00.000Z' },
      { name: 'BOB', score: 30_000 }, // no date — absentees stay absent
    ]
    const seam = storage()
    seam.save(dated)
    expect(seam.load()).toEqual(dated)
  })
})

describe('SH-6 AC-2 — the lobby tile shows a real top score (NO SCORE gap closed)', () => {
  it('writes under the exact key the lobby reads', () => {
    expect(highScoreKey(GAME_ID)).toBe('battlezone-high-scores')
  })

  it('the lobby read returns the run score after a qualifying run — not NO SCORE', () => {
    expect(lobbyTopScore(GAME_ID)).toBeNull() // baseline: nothing persisted yet

    const board = captureRun(42_000)
    storage().save(board)

    expect(lobbyTopScore(GAME_ID)).toBe(42_000)
  })

  it('reports the true maximum even if a tampered board is out of order', () => {
    // getTopScore takes max(valid rows), never trusts row[0] — battlezone's
    // writes must remain readable under that contract.
    storage().save([
      { name: 'LOW', score: 1_000 },
      { name: 'TOP', score: 99_000 },
      { name: 'MID', score: 5_000 },
    ])
    expect(lobbyTopScore(GAME_ID)).toBe(99_000)
  })
})
