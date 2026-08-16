// plugins/missile-command/tests/mc11-3-name-entry-timeout-abort.test.ts
//
// Story mc11-3 — RED phase (Han Solo / TEA). WIRE THE NAME-ENTRY ABORT. The core
// verb `abortNameEntry` (core/game.ts) is fully built and tested but has NO caller
// (epic mc11 unwired-feature audit, 2026-08-16), so during initials entry the player
// can only commit or edit forever. The ROM's TAKE-INITIALS screen aborts on EITHER of
// two triggers, discarding the entry with no ladder insert:
//   • a START-SWITCH press           — W3DSUP.MAC:4076  BNE ABORT ";ABORT IF EITHER START SWITCH"
//   • a TIMEOUT                        — W3DSUP.MAC:4080-4088  AND I,0F / DEC UCVTAB / IFEQ -> JMP ABORT
// This story wires both to `abortNameEntry` -> attract, buffer cleared, ladder UNCHANGED.
//
// ─── GROUND TRUTH (REV-01, W3DSUP.MAC; project claim MC-ENTRY-ABORT) ──────────
// GETINI (the per-frame TAKE-INITIALS handler) runs, in order:
//     LDA SWSTAT / EOR I,0FF / AND I,MSTRT1!MSTRT2 / BNE ABORT   ; :4070-4076 start-switch abort
//     LDA FRAME  / AND I,0F  / IFEQ / DEC UCVTAB / IFEQ / JMP ABORT ; :4078-4088 timeout
// so UCVTAB is decremented once every 16 FRAME ticks (FRAME & 0x0F == 0) and the entry
// aborts when it reaches 0. The countdown SEED is UCVTAB = 0x84 ("RESET TIMEOUT TO 30
// SEC", :4180 — the value the port's claim MC-ENTRY-ABORT pins as the canonical window;
// the ROM's larger 0xFF first-letter window at :4010 is the trackball per-letter refinement
// the KEYBOARD port does not model). Under W3COMN.MAC's inherited .RADIX 16, 0x84 = 132 and
// 0x0F masks to a 16-frame tick, so the abort window is:
//     NAME_ENTRY_TIMEOUT_FRAMES = 0x84 * 0x10 = 132 * 16 = 2112 frames
// The DETERMINISTIC quantity is FRAMES, not seconds (the "30 SEC" comment is a loose
// designer note; 2112 frames ~= 34 s at MC's ~61 Hz raster) — the tests below pin the
// frame count, never a wall-clock duration, so nothing here couples to the refresh rate.
//
// ─── DESIGN DECISIONS resolved at RED (see the session's Design Deviations) ───
// (1) THE START SWITCH IS THE "1" KEY. MC's keyboard port has no trackball; Enter already
//     COMMITS the buffer (shell/input.nameEntryFromKey), so the abort switch cannot be
//     Enter. The fleet convention for the 1-Player START button (ROM MSTRT1) is the "1"
//     key — battlezone (`key === '1'`), star-wars (`Digit1`), joust/centipede (Digit1 /
//     START1 port). "1" is not an A-Z initials letter, so it never collides with entry.
// (2) THE TIMEOUT IS A PURE FRAME COUNTER IN CORE, like mc6-6's OVER_TIMEOUT_FRAMES: a
//     single threshold constant, no sub-frame UCVTAB emulation. It counts ENTRY-frames
//     (state-threaded, reset on each entry), not the free-running boot `frame`.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `stepGame`'s 'entry' branch today only does `frame + 1`, forever — it
// never aborts, so the timeout tests never leave 'entry'. `keydownReducer` treats "1"
// during entry as inert (stepInitials no-op), so the start-abort tests never leave
// 'entry'. And `src/core` exports no NAME_ENTRY_TIMEOUT_FRAMES, so loadTimeoutFrames()
// throws self-describingly (the fleet loader idiom — a variable import specifier keeps
// `tsc --noEmit` green while the surface is absent). Dev makes them GREEN by wiring
// `abortNameEntry` into both seams and exporting the cited constant.
//
// The REGRESSION guards below (attract "1" still starts a game; letters still type; Enter
// still commits with an insert) are GREEN today and must STAY green — they keep the new
// abort mapping from hijacking the keystrokes it sits beside.

import { describe, it, expect } from 'vitest'
import {
  createPlayGame,
  stepGame,
  stepInitials,
  enterNameEntry,
  abortNameEntry,
  type GameState,
} from '../src/core/game.js'
import { keydownReducer } from '../src/shell/input.js'
import { createCities } from '../src/core/field.js'

// ─── loader idiom: the NEW core constant, imported so `tsc --noEmit` stays green ──
// A variable specifier (never a string literal) so tsc does not resolve the export
// statically — the fleet RED idiom (over-attract-timeout.test.ts). Dev exports
// NAME_ENTRY_TIMEOUT_FRAMES from src/core (state.ts, beside OVER_TIMEOUT_FRAMES, is the
// natural home); the loader tries state.js then game.js so either lands.
const CORE_SPECIFIERS = ['../src/core/state.js', '../src/core/game.js']
async function loadTimeoutFrames(): Promise<number> {
  for (const spec of CORE_SPECIFIERS) {
    try {
      const mod = (await import(/* @vite-ignore */ spec)) as Record<string, unknown>
      const v = mod['NAME_ENTRY_TIMEOUT_FRAMES']
      if (typeof v === 'number') return v
    } catch {
      /* module not present or not loadable — try the next candidate */
    }
  }
  throw new Error(
    'NAME_ENTRY_TIMEOUT_FRAMES not exported yet — GREEN (Dev) adds it to src/core, PURE: ' +
      'export const NAME_ENTRY_TIMEOUT_FRAMES = 0x84 * 0x10 = 2112 (UCVTAB seed 0x84 ' +
      '"RESET TIMEOUT TO 30 SEC" W3DSUP.MAC:4180, decremented once per 16 FRAME ticks by ' +
      'AND I,0F :4080; cite the derivation in // comments not JSDoc, and file the claim per ' +
      'the un-cited-literal rule). Then wire stepGame\'s entry branch to count ENTRY-frames ' +
      'and return abortNameEntry(state) at the threshold, and map the "1" start switch to ' +
      'abortNameEntry in the shell keydownReducer. No clock, no entropy, no shell import in core.',
  )
}

// ─── entry-state builders (enter through the REAL routing so Dev's bookkeeping runs) ──
// A fully-dead PLAY board with a ladder-qualifying score: one stepGame resolves it to
// 'over' then routes (enterNameEntry) into 'entry' (game.ts PLAY branch). We NEVER
// hand-construct a mid-entry state with a fabricated counter — the transition itself
// must initialise whatever the timeout counts.
const QUALIFYING_SCORE = 999_999 // beats the whole DEFAULT ladder (lowest rung 6950)
function allDeadQualifyingPlay(opts: Partial<GameState> = {}): GameState {
  const g = createPlayGame(1)
  return { ...g, cities: createCities().map((c) => ({ ...c, alive: false })), score: QUALIFYING_SCORE, ...opts }
}
function enterEntry(typed: readonly string[] = [], opts: Partial<GameState> = {}): GameState {
  let s = stepGame(allDeadQualifyingPlay(opts)) // play(all dead, qualifying) -> over -> entry
  if (s.phase !== 'entry') {
    throw new Error(`test setup: expected a qualifying game-over to route to 'entry', got '${s.phase}'`)
  }
  for (const k of typed) s = stepInitials(s, k) // buffer stays in 'entry' (stepInitials never leaves it)
  return s
}

const attractState = (): GameState => ({ ...createPlayGame(1), phase: 'attract' })

// ═════════════════════════════════════════════════════════════════════════════
// Precondition — the routing the whole suite rests on really reaches 'entry'
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 precondition — a qualifying game-over routes into name entry', () => {
  it("one stepGame takes an all-dead qualifying PLAY board to 'entry' with an empty buffer", () => {
    const s = stepGame(allDeadQualifyingPlay())
    expect(s.phase).toBe('entry')
    expect(s.initials).toBe('')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (value) — the timeout constant: pinned to the ROM derivation (mutation guard)
// Subject imported from src; expectation built from INDEPENDENT ROM literals (not a
// self-referential identity — checklist #26/#18).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 AC1 — NAME_ENTRY_TIMEOUT_FRAMES is the cited UCVTAB window', () => {
  it('equals the UCVTAB seed 0x84 times the 16-frame tick = 2112 (W3DSUP.MAC:4180/:4080)', async () => {
    const frames = await loadTimeoutFrames()
    const UCVTAB_SEED = 0x84 // 132 — W3DSUP.MAC:4180 "RESET TIMEOUT TO 30 SEC" (.RADIX 16)
    const TICK_FRAMES = 0x10 // 16  — AND I,0F decrements UCVTAB once per 16 FRAME ticks (:4080)
    // Derived here from the equates, NOT copied from Dev's constant — a wrong value reddens.
    expect(frames).toBe(UCVTAB_SEED * TICK_FRAMES) // 2112
  })

  it('is a positive whole number of frames (a real window, not 0 or a fraction)', async () => {
    const frames = await loadTimeoutFrames()
    expect(Number.isInteger(frames)).toBe(true)
    expect(frames).toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (timeout path) — stepGame times entry out to attract at the threshold
// Magnitude, not just ordering (checklist #29): the flip frame carries the NUMBER.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 AC1 — the entry countdown aborts to attract at the timeout', () => {
  it('flips entry -> attract at EXACTLY the threshold frame, never merely "eventually"', async () => {
    const frames = await loadTimeoutFrames()
    let s = enterEntry(['A', 'B']) // partial buffer, in entry, entryFrames starts at 0
    let flip = -1
    for (let i = 1; i <= frames + 4; i++) {
      s = stepGame(s)
      if (s.phase !== 'entry') {
        flip = i
        break
      }
    }
    expect(flip, 'name entry must time out on its own with no input').toBeGreaterThan(0)
    expect(s.phase).toBe('attract')
    // entryFrames starts at 0 and the loop starts at i=1, so the abort (`entryFrames >= frames`)
    // fires on EXACTLY frame `frames`. Pinned tight — a one-off boundary bug (`>` instead of `>=`,
    // shifting the flip to `frames + 1`) reddens here; a ±1 tolerance would mask it (checklist #29).
    expect(flip, `timed out at frame ${flip}, expected exactly ${frames}`).toBe(frames)
  })

  it('holds in entry well short of the timeout (no premature abort; buffer preserved)', async () => {
    const frames = await loadTimeoutFrames()
    let s = enterEntry(['A'])
    for (let i = 0; i < frames - 2; i++) s = stepGame(s)
    expect(s.phase, 'must not abort before the timeout elapses').toBe('entry')
    expect(s.initials, 'the buffer survives the countdown until the abort').toBe('A')
  })

  it('on timeout the buffer is discarded and the ladder is UNCHANGED — even from a FULL buffer', async () => {
    const frames = await loadTimeoutFrames()
    let s = enterEntry(['A', 'B', 'C']) // FULL buffer — a timeout on the last letter must NOT commit it
    expect(s.initials).toBe('ABC')
    const ladderBefore = s.highScores
    for (let i = 0; i < frames + 4; i++) s = stepGame(s)
    expect(s.phase).toBe('attract')
    expect(s.initials).toBe('')
    // The countdown is zeroed on the way out, so the held-at-0 invariant holds in attract (#15).
    expect(s.entryFrames, 'the timeout abort resets the entry countdown').toBe(0)
    // A commit would build a NEW array (insertHighScore); an abort preserves the reference.
    expect(s.highScores, 'a timeout inserts nothing — same ladder array reference').toBe(ladderBefore)
    expect(s.highScores.some((h) => h.name === 'ABC'), 'the discarded initials never reach the ladder').toBe(
      false,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (hardening) — the countdown is scoped to ENTRY-frames, and RESETS on entry
// Guards the "edge computed in one branch" trap (checklist #14): a counter read off
// the free-running boot `frame`, or one never reset when re-entering, both fail here.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 AC1 (hardening) — entry-scoped, boot-frame-independent, resets on re-entry', () => {
  it('runs on ENTRY-frames, not boot-frames (a long game still gets the full window)', async () => {
    const frames = await loadTimeoutFrames()
    // Enter 'entry' with the boot frame already an order of magnitude past the timeout.
    // A counter that read state.frame would abort on the very first entry step.
    let s = enterEntry([], { frame: frames * 10 })
    for (let i = 0; i < frames - 2; i++) s = stepGame(s)
    expect(s.phase, 'a high boot-frame count must not shorten the entry window').toBe('entry')
  })

  it('a SECOND entry gets its own full countdown (no leftover counter from the first)', async () => {
    const frames = await loadTimeoutFrames()
    // First entry: run the full window out to the timeout abort (attract).
    let s = enterEntry([])
    for (let i = 0; i < frames + 4; i++) s = stepGame(s)
    expect(s.phase).toBe('attract')
    // Re-enter carrying whatever counter the first entry left on the state (re-use the SAME
    // state via the real enterNameEntry verb). It must reset to a full window, not abort at once.
    const reOver: GameState = {
      ...s,
      phase: 'over',
      score: QUALIFYING_SCORE,
      cities: createCities().map((c) => ({ ...c, alive: false })),
    }
    let s2 = enterNameEntry(reOver)
    expect(s2.phase, 'a qualifying re-entry lands in entry').toBe('entry')
    for (let i = 0; i < frames - 2; i++) s2 = stepGame(s2)
    expect(s2.phase, 'the second entry must get a fresh full countdown').toBe('entry')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 (hardening, #15) — EVERY exit path zeroes the countdown (held-at-0 invariant)
// Each test drives the countdown to a NONZERO value first, then leaves 'entry', so the
// reset is load-bearing: deleting it from enterNameEntry / abortNameEntry /
// commitNameEntry would leave entryFrames nonzero here and redden. (Without the nonzero
// pre-step these would pass trivially — the exact mutation-survivor gap the reviewer found.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 (#15) — every entry/exit transition zeroes the entry countdown', () => {
  // Enter, then step the countdown to a known NONZERO value (well short of the timeout).
  const partwayThroughEntry = (typed: readonly string[]): GameState => {
    let s = enterEntry(typed)
    for (let i = 0; i < 10; i++) s = stepGame(s)
    expect(s.phase, 'still mid-entry, well short of the timeout').toBe('entry')
    expect(s.entryFrames, 'the entry branch advanced the countdown to a nonzero value').toBe(10)
    return s
  }

  it('the "1" start-switch abort zeroes a nonzero countdown (abortNameEntry reset)', () => {
    const next = keydownReducer('1', partwayThroughEntry(['A', 'B']))
    expect(next.phase).toBe('attract')
    expect(next.entryFrames, 'abortNameEntry must reset the countdown').toBe(0)
  })

  it('a full-buffer Enter commit zeroes a nonzero countdown (commitNameEntry reset)', () => {
    const next = keydownReducer('Enter', partwayThroughEntry(['A', 'B', 'C']))
    expect(next.phase).toBe('attract')
    expect(next.entryFrames, 'commitNameEntry must reset the countdown').toBe(0)
  })

  it('enterNameEntry zeroes a stale incoming countdown (defensive entry reset)', () => {
    // A qualifying game-over carrying a stale nonzero entryFrames must get a FRESH full
    // window — entering name entry zeroes it (guards a future second entry path, #14).
    const staleOver: GameState = {
      ...createPlayGame(1),
      phase: 'over',
      score: QUALIFYING_SCORE,
      cities: createCities().map((c) => ({ ...c, alive: false })),
      entryFrames: 999,
    }
    const entered = enterNameEntry(staleOver)
    expect(entered.phase).toBe('entry')
    expect(entered.entryFrames, 'enterNameEntry must zero a stale countdown').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 (start-abort path) — the "1" START switch aborts entry via keydownReducer
// Tested through the composed reducer main.ts actually drives (the real seam).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 AC2 — the "1" start switch aborts name entry immediately', () => {
  it('a "1" keydown during entry returns to attract with the buffer cleared', () => {
    const s = enterEntry(['A', 'B'])
    const next = keydownReducer('1', s)
    expect(next.phase).toBe('attract')
    expect(next.initials).toBe('')
  })

  it('the start-abort is IMMEDIATE — one keydown, no countdown frames needed', () => {
    const s = enterEntry([]) // empty buffer, just entered
    const next = keydownReducer('1', s)
    expect(next.phase, 'the start switch does not wait for the timeout').toBe('attract')
  })

  it('start-abort from a FULL buffer inserts NOTHING (abort, not commit)', () => {
    const s = enterEntry(['A', 'B', 'C'])
    const ladderBefore = s.highScores
    const next = keydownReducer('1', s)
    expect(next.phase).toBe('attract')
    expect(next.initials).toBe('')
    expect(next.entryFrames, 'the start-switch abort resets the entry countdown (#15)').toBe(0)
    expect(next.highScores, 'the start switch discards a full buffer — no insert').toBe(ladderBefore)
    expect(next.highScores.some((h) => h.name === 'ABC')).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — both abort paths reproduce abortNameEntry's contract exactly
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 AC3 — timeout and start-abort both equal the pure abortNameEntry result', () => {
  const abortShape = (s: GameState) => ({ phase: s.phase, initials: s.initials, highScores: s.highScores })

  it('the pure verb is the reference: entry -> attract, buffer cleared, ladder reference kept', () => {
    const s = enterEntry(['A', 'B'])
    const aborted = abortNameEntry(s)
    expect(aborted.phase).toBe('attract')
    expect(aborted.initials).toBe('')
    expect(aborted.highScores).toBe(s.highScores)
  })

  it('the start-abort path produces the same (phase, buffer, ladder) as abortNameEntry', () => {
    const s = enterEntry(['A', 'B'])
    expect(abortShape(keydownReducer('1', s))).toEqual(abortShape(abortNameEntry(s)))
  })

  it('the timeout path produces the same (phase, buffer, ladder) as abortNameEntry', async () => {
    const frames = await loadTimeoutFrames()
    let s = enterEntry(['A', 'B'])
    const reference = abortShape(abortNameEntry(s))
    for (let i = 0; i < frames + 4; i++) s = stepGame(s)
    expect(abortShape(s)).toEqual(reference)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2/AC4 (regression) — the abort mapping must NOT hijack the keystrokes beside it
// These are GREEN today and must STAY green after the wiring lands.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc11-3 regression — "1" outside entry, and the entry keys, are untouched', () => {
  it('"1" in ATTRACT still begins a game (any-input -> setup), not an abort', () => {
    const next = keydownReducer('1', attractState())
    expect(next.phase, 'the 1-Player start must still start a game from the demo').toBe('setup')
  })

  it('"1" in PLAY is inert (not a fire key, not an abort)', () => {
    const play = createPlayGame(1) // phase 'play'
    const next = keydownReducer('1', play)
    expect(next.phase).toBe('play')
    expect(next.abms.length, '"1" launches no ABM').toBe(0)
  })

  it('an A-Z key during entry still TYPES an initial (not swallowed by the abort mapping)', () => {
    const s = enterEntry([])
    const next = keydownReducer('A', s)
    expect(next.phase, 'typing a letter stays in entry').toBe('entry')
    expect(next.initials).toBe('A')
  })

  it('Enter during a full entry still COMMITS (inserts into the ladder) — abort is "1", commit is Enter', () => {
    const s = enterEntry(['A', 'B', 'C'])
    const ladderBefore = s.highScores
    const next = keydownReducer('Enter', s)
    expect(next.phase).toBe('attract')
    // Commit also zeroes the entry countdown on its way out (held-at-0 invariant, #15).
    expect(next.entryFrames, 'a commit resets the entry countdown too').toBe(0)
    // Commit builds a NEW ladder array containing the initials — the opposite of abort.
    expect(next.highScores, 'a commit is a fresh array, not the pre-entry reference').not.toBe(ladderBefore)
    expect(next.highScores.some((h) => h.name === 'ABC' && h.score === QUALIFYING_SCORE)).toBe(true)
  })
})
