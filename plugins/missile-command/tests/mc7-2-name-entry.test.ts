// plugins/missile-command/tests/mc7-2-name-entry.test.ts
//
// Story mc7-2 — RED phase (Han Solo / TEA). The name-entry `'entry'` phase +
// initials buffer in core, reusing @shared/name-entry. On game-over a QUALIFYING
// score routes phase 'over' -> 'entry'; `stepNameEntry` drives the 3-char initials
// buffer over the ROM charset; COMMIT inserts into the mc7-1 table and returns to
// attract; ABORT (start-switch OR timeout) returns to attract WITHOUT inserting.
// Slots onto mc6-1's phase machine (state.ts) as the ROM's post-game-over SETUP task.
//
// ─── GROUND TRUTH (REV-01, W3DSUP.MAC — `grep -a`, physical lines, .RADIX 16) ────
//   TAKE INITIALS FOR NEW HIGH SCORE  (.SBTTL, :4064) is the entry routine.
//   • 3 initials:   INTLHS: .BYTE 82,78,6E ;HORIZ COORD OF 3 INITIALS BEING ENTERED
//                   (:4060) — three horiz coords, one per initial. Claim MC-INITIALS-LEN.
//   • charset A-Z:  LDA I,26.  (:4128, the cursor wraps over 26 letters) and
//                   ADC I,41   (:4158/:4172, "ADD IN ASCII OFFSET" — 0x41 = 'A'),
//                   so the selectable letters are A..Z. Claim MC-INITIALS-CHARSET.
//   • dual abort:   BNE ABORT ;ABORT IF EITHER START SWITCH PRESS   (:4076) and
//                   IFEQ ;TOO MUCH TIME? / JMP ABORT ;YES. ABORT INITIALS (:4086/:4088);
//                   timeout seed LDA I,84 ;RESET TIMEOUT TO 30 SEC (:4180). Claim MC-ENTRY-ABORT.
//   • commit:       a fire selects the letter and advances; after the third,
//                   the ladder INSERT runs (INTLDR, :4162-4195).
//
// ─── DESIGN RULINGS CARRIED FROM THE mc7 ARCHITECT DESIGN (2026-08-09) ────────────
//   §3 The ROM's initials entry is a TRACKBALL CURSOR CYCLER over [A..Z + a blank
//   27th slot]. Per the fleet ruling (joust jt10-7, asteroids, tempest, …) that
//   cycler is DELIBERATELY not ported: MC reuses @shared/name-entry.stepNameEntry,
//   whose charset is A-Z. So the PORT charset is A-Z (the 26 ROM letters); the ROM's
//   extra blank slot and the trackball scroll are out of scope (a shell input-mapping
//   choice, O-7b, resolved with the human smoke test the pointer-lock path needs).
//   §2 The abort/timeout path is NOT optional coverage — both triggers must abort
//   with NO insert. Here both route through one pure `abortNameEntry` transition
//   (the shell decides WHEN to call it: on a start-switch press or a 30-sec timeout);
//   the exact per-frame countdown wiring into stepGame is the deferred O-7b shell
//   item. See the session Design Deviations.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────
// None of `enterNameEntry`, `stepInitials`, `commitNameEntry`, `abortNameEntry` or
// `MC_INITIALS_LEN` exist in src/core/game.ts yet, `'entry'` is not in state.ts's
// Phase union, GameState carries no `highScores`/`initials`, and the three mc7-2
// claims are unfiled. The pure surface is reached through a self-describing
// dynamic-import loader (the fleet idiom, cf. start-of-game.test.ts), so every test
// reddens for the FEATURE's absence with a message that tells Dev exactly what to build.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game.js'
import {
  DEFAULT_HIGH_SCORES,
  qualifiesForHighScore,
  insertHighScore,
  type MissileCommandHighScore,
} from '../src/core/highscore.js'
import { stepNameEntry } from '@shared/name-entry'
import { loadClaims, claimCovers } from './helpers/claims.js'

// ─── the pure surface GREEN (Yoda / Dev) implements ──────────────────────────────
// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while the
// new exports / GameState fields / Phase member are still absent (the mc6-2 idiom).
// States are typed loosely here because the new `highScores`/`initials` fields and
// the `'entry'` Phase are not on GameState yet — a cast would otherwise redden tsc.
const GAME_SPECIFIER = '../src/core/game.js'

// `phase` is widened to string here: the 'entry' member and the highScores/initials
// fields are not on GameState yet, so a Phase-typed comparison to 'entry' would redden
// tsc — the RED must land at RUNTIME (feature absent), never as a compile error.
type St = Omit<GameState, 'phase'> & {
  readonly phase: string
  readonly highScores: readonly MissileCommandHighScore[]
  readonly initials: string
}
type StateFn = (state: St) => St
type KeyFn = (state: St, key: string) => St

interface NameEntryApi {
  readonly MC_INITIALS_LEN: number
  readonly enterNameEntry: StateFn
  readonly stepInitials: KeyFn
  readonly commitNameEntry: StateFn
  readonly abortNameEntry: StateFn
}

const BUILD_GUIDANCE =
  'mc7-2 name-entry core not built yet — GREEN (Yoda) adds to src/core/game.ts (Phase in state.ts):\n' +
  "  • state.ts: add 'entry' to the Phase union (the ROM's post-game-over TAKE INITIALS task).\n" +
  '  • GameState: add `highScores: readonly MissileCommandHighScore[]` (seeded to DEFAULT_HIGH_SCORES\n' +
  "    in createGame) and `initials: string` (seeded '') so commit can insert and the shell (mc7-3) persist.\n" +
  '  • MC_INITIALS_LEN = 3  // claim MC-INITIALS-LEN (W3DSUP.MAC:4060, three INTLHS coords) — a // cite, not JSDoc.\n' +
  "  • enterNameEntry(state): from 'over' with qualifiesForHighScore(highScores, score) -> phase 'entry',\n" +
  "    initials '' (highScores unchanged); 'over' but not qualifying -> UNCHANGED (over->attract is mc6-6);\n" +
  '    any non-over phase -> UNCHANGED. Pure.\n' +
  "  • stepInitials(state, key): in 'entry', initials = stepNameEntry(initials, key, MC_INITIALS_LEN)\n" +
  '    (reuse @shared/name-entry — A-Z uppercased, Backspace, capped at 3); any other phase -> UNCHANGED.\n' +
  "  • commitNameEntry(state): in 'entry' with a full 3-char buffer -> highScores =\n" +
  "    insertHighScore(highScores, { name: initials, score }), initials '', phase 'attract'; otherwise UNCHANGED.\n" +
  "  • abortNameEntry(state): in 'entry' -> phase 'attract', initials '', highScores UNCHANGED (NO insert)\n" +
  '    // claim MC-ENTRY-ABORT (start-switch :4076, timeout :4086/:4088); any other phase -> UNCHANGED.\n' +
  '  All pure: no clock, no Math.random; purity.test.ts + citations.test.ts stay green.'

async function loadNameEntry(): Promise<NameEntryApi> {
  const mod = (await import(/* @vite-ignore */ GAME_SPECIFIER)) as Record<string, unknown>
  const missing: string[] = []
  if (typeof mod.MC_INITIALS_LEN !== 'number') missing.push('MC_INITIALS_LEN (number)')
  if (typeof mod.enterNameEntry !== 'function') missing.push('enterNameEntry')
  if (typeof mod.stepInitials !== 'function') missing.push('stepInitials')
  if (typeof mod.commitNameEntry !== 'function') missing.push('commitNameEntry')
  if (typeof mod.abortNameEntry !== 'function') missing.push('abortNameEntry')
  if (missing.length > 0) throw new Error(`missing ${missing.join(', ')}.\n${BUILD_GUIDANCE}`)
  // Single casts after the typeof guards above — the double-cast bypass is banned
  // by the lang-review checklist, and each field's runtime shape is already proven.
  return {
    MC_INITIALS_LEN: mod.MC_INITIALS_LEN as number,
    enterNameEntry: mod.enterNameEntry as StateFn,
    stepInitials: mod.stepInitials as KeyFn,
    commitNameEntry: mod.commitNameEntry as StateFn,
    abortNameEntry: mod.abortNameEntry as StateFn,
  }
}

// ─── fixtures ─────────────────────────────────────────────────────────────────────
// A game state carrying the mc7-2 fields. Built from createGame(1) (so the rng word
// and every combat field are the canonical boot values) with `highScores`/`initials`
// layered on. A single `as St` is enough: St (above) deliberately widens `phase` to
// `string`, so building/comparing arbitrary phase strings (incl. 'entry') type-checks
// without a double-cast — GameState already carries highScores/initials post-GREEN.
const stateWith = (over: Partial<{ phase: string; score: number; initials: string; highScores: readonly MissileCommandHighScore[] }>): St =>
  ({
    ...createGame(1),
    highScores: DEFAULT_HIGH_SCORES,
    initials: '',
    ...over,
  }) as St

// A full default ladder's lowest rung is MJP 6950; on a full board a qualifier must
// STRICTLY beat it (mc7-1). 9999 qualifies; 100 does not — asserted via the oracle.
const QUALIFYING = 9999
const NON_QUALIFYING = 100

// ═══════════════════════════════════════════════════════════════════════════════════
// AC-A — MC-INITIALS-LEN: the buffer is exactly 3 chars (W3DSUP.MAC:4060 INTLHS).
// ═══════════════════════════════════════════════════════════════════════════════════
describe('mc7-2 AC-A — the initials buffer length is the ROM 3 (INTLHS)', () => {
  it('MC_INITIALS_LEN is 3', async () => {
    const { MC_INITIALS_LEN } = await loadNameEntry()
    expect(MC_INITIALS_LEN).toBe(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC-B — enterNameEntry: a QUALIFYING game-over score routes 'over' -> 'entry'.
//         A non-qualifying score does NOT enter; a non-over phase does NOT enter.
// ═══════════════════════════════════════════════════════════════════════════════════
describe('mc7-2 AC-B — a qualifying game-over score routes over -> entry', () => {
  it('a qualifying score at game over enters the name-entry phase with an empty buffer', async () => {
    const { enterNameEntry } = await loadNameEntry()
    const over = stateWith({ phase: 'over', score: QUALIFYING })
    // sanity: the fixture really does qualify on the full default board
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, QUALIFYING)).toBe(true)
    const next = enterNameEntry(over)
    expect(next.phase).toBe('entry')
    expect(next.initials).toBe('')
    // routing must NOT insert anything yet — the table is untouched until commit
    expect(next.highScores).toEqual(DEFAULT_HIGH_SCORES)
  })

  it('a NON-qualifying score at game over does not enter (stays over — over->attract is mc6-6)', async () => {
    const { enterNameEntry } = await loadNameEntry()
    const over = stateWith({ phase: 'over', score: NON_QUALIFYING })
    expect(qualifiesForHighScore(DEFAULT_HIGH_SCORES, NON_QUALIFYING)).toBe(false)
    expect(enterNameEntry(over).phase).toBe('over')
  })

  it.each(['play', 'pause', 'between', 'setup', 'attract'])(
    'never enters from a non-over phase (%s) even with a huge score',
    async (phase) => {
      const { enterNameEntry } = await loadNameEntry()
      const s = stateWith({ phase, score: QUALIFYING })
      expect(enterNameEntry(s)).toEqual(s) // unchanged — you cannot enter mid-game
    },
  )

  it('is pure — it does not mutate the input state', async () => {
    const { enterNameEntry } = await loadNameEntry()
    const over = stateWith({ phase: 'over', score: QUALIFYING })
    const snapshot = structuredClone(over)
    enterNameEntry(over)
    expect(over).toEqual(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC-C — stepInitials: the 3-char buffer over the ROM charset, reusing
//         @shared/name-entry (A-Z uppercased, Backspace, capped at MC_INITIALS_LEN).
// ═══════════════════════════════════════════════════════════════════════════════════
describe('mc7-2 AC-C — stepInitials drives the 3-char buffer via @shared/name-entry', () => {
  const entry = (initials: string): St => stateWith({ phase: 'entry', score: QUALIFYING, initials })

  it('appends an A-Z letter, uppercased', async () => {
    const { stepInitials } = await loadNameEntry()
    expect(stepInitials(entry(''), 'a').initials).toBe('A')
    expect(stepInitials(entry('A'), 'Z').initials).toBe('AZ')
  })

  it('caps the buffer at the ROM 3 initials (a 4th letter is inert)', async () => {
    const { stepInitials } = await loadNameEntry()
    expect(stepInitials(entry('ABC'), 'D').initials).toBe('ABC')
  })

  it('Backspace deletes the last char and never past empty', async () => {
    const { stepInitials } = await loadNameEntry()
    expect(stepInitials(entry('AB'), 'Backspace').initials).toBe('A')
    expect(stepInitials(entry(''), 'Backspace').initials).toBe('')
  })

  it.each(['5', ' ', '!', 'Enter', 'ArrowLeft', 'ß'])(
    'a non-letter key (%s) is inert — the A-Z port charset (the ROM blank slot is not ported)',
    async (key) => {
      const { stepInitials } = await loadNameEntry()
      expect(stepInitials(entry('A'), key).initials).toBe('A')
    },
  )

  it('is exactly the @shared/name-entry reducer over the buffer (reuse, not a re-implementation)', async () => {
    const { stepInitials, MC_INITIALS_LEN } = await loadNameEntry()
    for (const [buf, key] of [['', 'q'], ['A', 'b'], ['AB', 'c'], ['ABC', 'd'], ['AB', 'Backspace'], ['A', '3']] as const) {
      expect(stepInitials(entry(buf), key).initials).toBe(stepNameEntry(buf, key, MC_INITIALS_LEN))
    }
  })

  it.each(['over', 'play', 'attract'])('does nothing outside the entry phase (%s)', async (phase) => {
    const { stepInitials } = await loadNameEntry()
    const s = stateWith({ phase, initials: 'A' })
    expect(stepInitials(s, 'b')).toEqual(s)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC-D — commitNameEntry: a full 3-char buffer inserts into the mc7-1 table and
//         returns to attract. An incomplete buffer / a non-entry phase does NOT insert.
// ═══════════════════════════════════════════════════════════════════════════════════
describe('mc7-2 AC-D — commit inserts into the table and returns to attract', () => {
  it('a full 3-char buffer inserts { name, score } at the right rank and returns to attract', async () => {
    const { commitNameEntry } = await loadNameEntry()
    const s = stateWith({ phase: 'entry', score: QUALIFYING, initials: 'ABC' })
    const next = commitNameEntry(s)
    // insert via the mc7-1 depth-5 consumer — the oracle the module must match
    const expected = insertHighScore(DEFAULT_HIGH_SCORES, { name: 'ABC', score: QUALIFYING })
    expect(next.highScores).toEqual(expected)
    expect(next.highScores[0]).toEqual({ name: 'ABC', score: QUALIFYING }) // new best
    expect(next.highScores).toHaveLength(5) // stays 5-deep, lowest dropped
    expect(next.phase).toBe('attract')
    expect(next.initials).toBe('') // buffer cleared on commit
  })

  it('an INCOMPLETE buffer does not commit (no insert, no phase change)', async () => {
    const { commitNameEntry } = await loadNameEntry()
    const s = stateWith({ phase: 'entry', score: QUALIFYING, initials: 'AB' })
    expect(commitNameEntry(s)).toEqual(s)
  })

  it.each(['over', 'play', 'attract'])('does not commit outside the entry phase (%s)', async (phase) => {
    const { commitNameEntry } = await loadNameEntry()
    const s = stateWith({ phase, score: QUALIFYING, initials: 'ABC' })
    expect(commitNameEntry(s)).toEqual(s)
  })

  it('is pure — it does not mutate the input state or its table', async () => {
    const { commitNameEntry } = await loadNameEntry()
    const s = stateWith({ phase: 'entry', score: QUALIFYING, initials: 'ABC' })
    const snapshot = structuredClone(s)
    commitNameEntry(s)
    expect(s).toEqual(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC-E — abortNameEntry (MC-ENTRY-ABORT): start-switch OR timeout returns to attract
//         WITHOUT inserting. Both ROM triggers (W3DSUP.MAC:4076 / :4086-:4088) route
//         through this one transition; abort beats an otherwise-committable buffer.
// ═══════════════════════════════════════════════════════════════════════════════════
describe('mc7-2 AC-E — abort returns to attract without inserting (start-switch / timeout)', () => {
  it('an abort mid-entry returns to attract, clears the buffer, and leaves the table UNCHANGED', async () => {
    const { abortNameEntry } = await loadNameEntry()
    const s = stateWith({ phase: 'entry', score: QUALIFYING, initials: 'AB' })
    const next = abortNameEntry(s)
    expect(next.phase).toBe('attract')
    expect(next.initials).toBe('')
    expect(next.highScores).toEqual(DEFAULT_HIGH_SCORES) // NO insert — the abort's whole point
  })

  it('abort discards even a FULL, committable buffer (abort beats commit — a timeout on the last letter)', async () => {
    const { abortNameEntry } = await loadNameEntry()
    const s = stateWith({ phase: 'entry', score: QUALIFYING, initials: 'ABC' })
    const next = abortNameEntry(s)
    expect(next.highScores).toEqual(DEFAULT_HIGH_SCORES) // still no insert
    expect(next.highScores.some((e) => e.name === 'ABC')).toBe(false)
    expect(next.phase).toBe('attract')
  })

  it.each(['over', 'play', 'attract'])('does nothing outside the entry phase (%s)', async (phase) => {
    const { abortNameEntry } = await loadNameEntry()
    const s = stateWith({ phase, initials: 'AB' })
    expect(abortNameEntry(s)).toEqual(s)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC-F — CITATION DISCIPLINE: the three mc7-2 claims are committed and byte-pinned to
//         their W3DSUP TAKE INITIALS lines. (Byte-verification of each verbatim is
//         enforced separately by citations-source.test.ts / check-citations.mjs.)
// ═══════════════════════════════════════════════════════════════════════════════════
describe('mc7-2 AC-F — MC-INITIALS-LEN, MC-INITIALS-CHARSET, MC-ENTRY-ABORT are filed', () => {
  const CLAIMS = [
    { id: 'MC-INITIALS-LEN', file: 'W3DSUP.MAC', start: 4060, end: 4060 }, // INTLHS three coords
    { id: 'MC-INITIALS-CHARSET', file: 'W3DSUP.MAC', start: 4128, end: 4158 }, // LDA I,26. .. ADC I,41 (A-Z)
    { id: 'MC-ENTRY-ABORT', file: 'W3DSUP.MAC', start: 4076, end: 4088 }, // start-switch + timeout aborts
  ] as const

  it.each(CLAIMS)('$id pins $file:$start-$end with a committed claim', ({ id, file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — mc7-2 must file ${id}`,
    ).toBe(true)
  })

  it.each(CLAIMS)('$id carries the mc {id,symbol,value,meaning,source} claim shape', ({ id }) => {
    const claims = loadClaims()
    const c = claims.find((x) => x.id === id)
    expect(c, `claim ${id} is not committed`).toBeDefined()
    expect(c!.symbol.length).toBeGreaterThan(0)
    expect(c!.meaning.length).toBeGreaterThan(0)
    expect(c!.source.file).toContain('W3DSUP.MAC')
    expect(c!.source.verbatim.length).toBeGreaterThan(0)
  })
})
