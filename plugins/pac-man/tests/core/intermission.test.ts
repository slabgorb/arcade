// tests/core/intermission.test.ts
//
// Story pm6-1 (RED, TEA / Atia) — the intermission PHASE + its level-gated
// trigger, written BEFORE the code exists. Decision A: the coffee-break is a
// PHASE hung off the pm4 machine (game.ts `GamePhase`, phase.ts `advancePhase`),
// entered from the `level-clear` transition (events.ts `level-cleared`), NOT a
// forked path. Pure-first: this story adds the phase + the trigger only — the
// scripted actor animations are pm6-2/pm6-3, so nothing here reads a clock, DOM
// or RNG and purity.test.ts must stay green.
//
// DECISION C — RED-ANCHOR, DO NOT FABRICATE.
//   The TRIGGER is ROM-cited: the ROM writes intermission music #02 into the
//   voice request bytes and reads the level byte to decide the scene —
//     pacman.asm:1613  `0a33  3e02      ld      a,#02`      (the #02 request)
//     pacman.asm:1614  `0a35  32cc4e    ld      (#4ecc),a`  (into voice-1 req)
//     pacman.asm:1615  `0a38  32dc4e    ld      (#4edc),a`  (into voice-2 req)
//     pacman.asm:1616  `0a3b  3a134e    ld      a,(#4e13)`  (read level #)
//   and sound #02 is grounded as the LOOPING intermission music in pm2's dossier
//   (claims/sound.json SND-THEME-TRIGGER meaning: "Sound #02 … is the looping
//   intermission music"). AC2/AC3 demand a citations.test.ts CLAIM for the #02
//   trigger line — one does not yet exist (only the #01 start-theme trigger is
//   claimed), so the claim assertion below is RED until GREEN adds it.
//
//   The ROUND CADENCE {2,5,9,13,17} is the documented Pac-Man coffee-break order
//   (act 1 after round 2, act 2 after round 5, act 3 after rounds 9/13/17 — the
//   Pac-Man Dossier). It is NOT a single isolable ROM literal (no contiguous
//   `02 05 09 0d 11` table exists in the vendored source), so per the codebase's
//   standing HONEST-UNCITED policy (game.ts READY_HOLD_FRAMES / level.ts speed
//   table) the SET is a documented cadence gated on the ROM-cited level byte,
//   never a fabricated `pacman.asm` address. These tests pin the set as a value;
//   a mutation to it reddens a concrete assertion (AC3), not a coverage check.

import { describe, it, expect } from 'vitest'
import { createGameState, stepGame, type GameState } from '../../src/core/game'
import type { GameEvent } from '../../src/core/events'
import { advancePhase, PHASES } from '../../src/core/phase'
import {
  isIntermissionLevel,
  INTERMISSION_LEVELS,
  INTERMISSION_MUSIC,
} from '../../src/core/intermission'
import { DOT_COUNT } from '../../src/core/maze'
import { loadClaims } from '../audit/dossier-sweep'

const MAX_FRAMES = 2000

/** Force a phase without narrowing `s.phase` to a single literal at the call
 *  site (the freeze-pauses.test.ts / lifecycle.test.ts precedent — a bare
 *  `s.phase = 'x'` makes tsc treat a later `.toBe('y')` as an impossible
 *  comparison and reddens `npm run lint` forever). */
function forcePhase(s: GameState, phase: GameState['phase']): void {
  s.phase = phase
}

/** A board already in `playing` at a chosen (just-about-to-complete) level. */
function playingAtLevel(seed: number, level: number): GameState {
  const state = createGameState(seed)
  forcePhase(state, 'playing')
  state.level = level
  return state
}

/** Drive a board from `playing` through its clear, collecting every phase seen
 *  and every event emitted (stepGame REPLACES `state.events` each frame, so they
 *  must be accumulated). Stops once the round has advanced past `fromLevel` and
 *  settled back into `ready`, or at the frame ceiling. */
function runClear(state: GameState, fromLevel: number) {
  const phasesSeen = new Set<string>()
  const events: GameEvent[] = []
  state.dotsEaten = DOT_COUNT // "every dot eaten" — the game.test.ts idiom
  let frames = 0
  phasesSeen.add(state.phase)
  while (frames < MAX_FRAMES) {
    stepGame(state, { dir: 'none' })
    phasesSeen.add(state.phase)
    for (const e of state.events) events.push(e)
    // settled: advanced to the next round and back in the READY hold
    if (state.level > fromLevel && state.phase === 'ready') break
    frames++
  }
  return { phasesSeen, events, frames }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — an `intermission` GamePhase, entered from the level-clear transition at
// the ROM-cited cadence; a test pins the correct levels AND not others.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-1 AC1: `intermission` is a phase off the pm4 machine', () => {
  it('PHASES carries the new intermission member alongside the six cabinet phases', () => {
    expect(PHASES).toContain('intermission')
    // the six pre-existing phases survive — intermission is ADDED, not a rename
    for (const p of ['attract', 'ready', 'playing', 'dying', 'level-clear', 'game-over']) {
      expect(PHASES).toContain(p)
    }
  })

  it('level-clear advances to `intermission` when the cleared round is a coffee-break round', () => {
    expect(advancePhase('level-clear', { clearExpired: true, intermissionDue: true })).toBe('intermission')
  })

  it('level-clear advances straight to `ready` when the cleared round is NOT a coffee-break round', () => {
    expect(advancePhase('level-clear', { clearExpired: true, intermissionDue: false })).toBe('ready')
    // and the default (no signal about intermissions) never invents one
    expect(advancePhase('level-clear', { clearExpired: true })).toBe('ready')
  })

  it('the intermission fires at the correct rounds and NOT the others (AC1 "and not others")', () => {
    // the documented coffee-break order — exact SET, both halves asserted
    expect([...INTERMISSION_LEVELS].sort((a, b) => a - b)).toEqual([2, 5, 9, 13, 17])
    for (const lvl of [2, 5, 9, 13, 17]) {
      expect(isIntermissionLevel(lvl), `round ${lvl} shows a coffee break`).toBe(true)
    }
    for (const lvl of [1, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 16, 18, 19, 20, 21]) {
      expect(isIntermissionLevel(lvl), `round ${lvl} does NOT show a coffee break`).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — the intermission REQUESTS the pm2 looping intermission music (#02),
// consumed not re-implemented, cited to the ROM trigger + the pm2 dossier claim.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-1 AC2: the intermission requests pm2 music #02 (consumed)', () => {
  it('INTERMISSION_MUSIC is sound #02 — the ROM value at pacman.asm:1613 `ld a,#02`', () => {
    expect(INTERMISSION_MUSIC).toBe(0x02)
  })

  it('entering the intermission emits an `intermission-started` cue requesting music #02', () => {
    const state = playingAtLevel(3, 2) // round 2 → act 1 coffee break
    const { events } = runClear(state, 2)
    const started = events.filter((e) => e.type === 'intermission-started')
    expect(started.length, 'exactly one intermission cue is emitted on entry').toBe(1)
    expect(
      (started[0] as { type: 'intermission-started'; music: number }).music,
      'the cue carries the pm2 looping-intermission sound number #02',
    ).toBe(INTERMISSION_MUSIC)
  })

  it('a citations.test.ts CLAIM anchors the #02 intermission trigger to the ROM (Decision C)', () => {
    // The trigger line is pacman.asm:1613 `0a33  3e02      ld      a,#02`. Some
    // claim in the dossier must cite the #02 request (addr 0a33 / line 1613);
    // the byte-check in tests/audit/citations.test.ts independently verifies its
    // verbatim against the vendored source. Only the #01 START-theme trigger is
    // claimed today, so this is RED until GREEN adds the #02 claim.
    type TextSource = { file: string; line: number; verbatim: string }
    const isTextSource = (s: unknown): s is TextSource =>
      !!s && typeof s === 'object' && 'line' in s && 'verbatim' in s
    const claims = loadClaims()
    const textClaims = claims.filter(
      (c): c is (typeof claims)[number] & { source: TextSource } => isTextSource(c.source),
    )
    const triggerClaim = textClaims.find(
      (c) => c.source.file === 'pacman.asm' && c.source.line === 1613,
    )
    expect(
      triggerClaim,
      'a claim must cite the intermission #02 trigger at pacman.asm:1613 `ld a,#02`',
    ).toBeDefined()
    expect(triggerClaim?.source.verbatim).toContain('3e02')
    expect(triggerClaim?.source.verbatim).toContain('a,#02')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — the cadence is a concrete pinned value; a mutation reddens an assertion
// (not a coverage check). Covered above by the exact-SET assertion; this adds
// the direct mutation-sensitivity guard the AC names.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-1 AC3: the cadence is value-pinned (a mutation reddens)', () => {
  it('the cadence set is exactly {2,5,9,13,17} — swapping any member reddens this', () => {
    // whole-set equality: dropping 9, adding 8, or reordering all fail here
    expect(new Set(INTERMISSION_LEVELS)).toEqual(new Set([2, 5, 9, 13, 17]))
    expect(INTERMISSION_LEVELS.length, 'no extra rounds slipped in').toBe(5)
  })

  it('the predicate and the constant agree — every listed round triggers, nothing else in 1..30', () => {
    for (let lvl = 1; lvl <= 30; lvl++) {
      expect(isIntermissionLevel(lvl)).toBe(INTERMISSION_LEVELS.includes(lvl))
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — the phase + trigger are pure; the intermission RETURNS to the next round
// (ready/playing) when it ends; a test pins the loop closing.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-1 AC4: the intermission closes the loop back to the next round', () => {
  it('intermission holds until its window ends, then hands off to ready', () => {
    expect(advancePhase('intermission', {}), 'no signal holds the phase').toBe('intermission')
    expect(
      advancePhase('intermission', { intermissionExpired: true }),
      'the window ending returns to ready for the next round',
    ).toBe('ready')
  })

  it('a round-2 clear passes THROUGH intermission and settles into the next round in ready', () => {
    const state = playingAtLevel(3, 2)
    const { phasesSeen } = runClear(state, 2)
    expect(phasesSeen.has('level-clear'), 'the clear freeze still runs').toBe(true)
    expect(phasesSeen.has('intermission'), 'the coffee break plays between rounds').toBe(true)
    expect(state.level, 'the next round eventually loads').toBe(3)
    expect(state.phase, 'and the machine settles back into ready').toBe('ready')
  })

  it('a NON-coffee-break round (round 3) never enters intermission and emits no cue', () => {
    const state = playingAtLevel(3, 3)
    const { phasesSeen, events } = runClear(state, 3)
    expect(phasesSeen.has('intermission'), 'round 3 shows no coffee break').toBe(false)
    expect(
      events.some((e) => e.type === 'intermission-started'),
      'and requests no intermission music',
    ).toBe(false)
    expect(state.level, 'it advances straight to the next round').toBe(4)
    expect(state.phase).toBe('ready')
  })
})
