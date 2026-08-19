// tests/df7-7-lifecycle-playtest.test.ts
//
// Story df7-7 — RED phase (O'Brien / TEA). The df7 CAPSTONE: the eyes for the whole Defender
// cabinet. df5-7 proved the df5 GAME LOOP reaches the live frame; df7-7 proves the whole
// LIFECYCLE — driven by the df7-1 phase machine — reaches the frames a player screenshots at
// http://127.0.0.1:5270/defender/ , and registers Defender in the lobby-showcase carousel.
//
// Two deliverables, mirroring df5-7's structure but across the PHASE MACHINE, not one play state:
//
//   AC1 — Defender is REGISTERED in the lobby showcase (Decision E, the existing seam): its
//         manifest opts in (`showcase: true`) and the generated registry carries it, so
//         createShowcase(GAMES) puts it in the carousel. No new lobby infrastructure — the flag
//         is the whole seam (lobby/src/core/showcase.ts filters on it).
//   AC2 — the LIFECYCLE frames each render for real and each DIFFER from a nonsense control
//         (composeStaticFrame — the render-layer canonical-serve lesson): the attract demo
//         PLAYING (df7-3), a started game with HUD + populated scanner (df7-2/df7-5), a death
//         beat, the GAME OVER screen (df5-6), and the hall-of-fame NAME-ENTRY screen (df7-4).
//   AC3 — NO full-frame strobe in ANY phase or transition (ADR-0005, the df4-2 guard): across
//         every cabinet edge (attract->play, play->death, play->game-over, the entry overlay,
//         and the loop back to attract) assertNoFullFrameStrobe must hold — the owner has
//         photosensitive epilepsy, the ONE exception to ROM-always-wins. Teeth-checked so the
//         "does not throw" is never vacuous.
//
// AC4 (the df8+ hand-forward note — the epic is content-complete, hardening batteries remain) is
// a DOCUMENTED deliverable (Dev writes it; Reviewer checks it), not a brittle prose assertion —
// the same call the uf1-20 liveness gate made for its "manual gate" contract.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────────
// The lifecycle RENDER is built and green in pieces (df7-1 phase machine, df7-2 start, df7-3
// attract, df7-4/df7-4b hall-of-fame, df7-5 HUD/scanner), so the AC2/AC3 frame proofs below hold
// today — this file makes that capstone coverage explicit and mutation-proof. What is NOT done is
// AC1: Defender ships `showcase: false` (plugins/defender/plugin.ts:21, src/host/registry.ts) —
// "a black-canvas scaffold cannot boot into a live demo … df7 grows the attract demo and earns
// the flip." df7-3 grew the demo; df7-7 earns the flip. GREEN sets `showcase: true` in the
// manifest and runs `npm run gen:registry` so the committed registry carries it.
//
// 2P (df7-6, the ST2 alternating handoff) was CANCELED — the lifecycle here is single-player
// only; there is no 2P handoff frame to screenshot.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeFrame, composeStaticFrame } from '../src/core/scene.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import { stepSim, type Input, type SimState } from '../src/core/sim.js'
import { attractInput } from '../src/core/attract.js'
import {
  bootSession,
  advanceStart,
  stepSessionInitials,
  abortNameEntry,
  type Session,
} from '../src/core/start.js'
import { GAMES, getGame } from '@host/registry'

const LOGICAL_WIDTH = 292 // src/shell/render.ts — core takes them as args (df4-6/df5-7 re-declare locally)
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0

const IDLE: Input = { thrust: false, reverse: false, up: false, down: false, fire: false, smartBomb: false }

/** Deterministic byte source (LCG), the df3-6/df4-6/df5-7 shape — no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** Render a session EXACTLY as the shell does (main.ts): the hall-of-fame payload is fed only in
 *  the 'game-over' phase, so the GAME OVER + board + name-entry overlay reaches the frame there
 *  and nowhere else. Everything else renders the live sim. */
function render(session: Session): Framebuffer {
  const hof =
    session.phase === 'game-over' ? { board: session.board, nameEntry: session.nameEntry } : undefined
  return composeFrame(session.sim, LOGICAL_WIDTH, LOGICAL_HEIGHT, hof)
}

/** Step the attract demo N ticks through the SAME stepSim play uses (attract has no forked path). */
function stepAttract(session: Session, ticks: number): Session {
  let sim: SimState = session.sim
  for (let i = 0; i < ticks; i++) sim = stepSim(sim, attractInput(sim))
  return { ...session, sim }
}

/** Advance to 'play' and step IDLE until a wave is populated, so the play frame carries real
 *  attackers + a live scanner (df5-2/df5-1) — not an empty field. */
function reachPopulatedPlay(rand: () => number): Session {
  let s = bootSession(rand, [])
  s = advanceStart(s, { startRequested: true }, rand) // attract -> setup
  s = advanceStart(s, { setupComplete: true }, rand) // setup -> play
  let sim = s.sim
  let met = false
  for (let i = 0; i < 20_000 && !met; i++) {
    if (sim.landers.length > 0 && sim.wave >= 1) met = true
    else sim = stepSim(sim, IDLE)
  }
  return { ...s, sim, phase: 'play' }
}

// ─── AC1 — Defender is registered in the lobby-showcase carousel (Decision E) ──────────
describe('df7-7 AC1 — Defender opts into the lobby showcase (the existing seam)', () => {
  it('the registry marks defender showcase:true', () => {
    const meta = getGame('defender')
    expect(meta, 'defender must be in the generated registry').toBeDefined()
    expect(
      meta?.showcase,
      'defender ships showcase:false — df7 grew the attract demo, so df7-7 EARNS the flip: set ' +
        '`showcase: true` in plugins/defender/plugin.ts and run `npm run gen:registry`',
    ).toBe(true)
  })

  it('defender appears in the showcase set derived from the registry (createShowcase(GAMES) order)', () => {
    // createShowcase (lobby/src/core/showcase.ts) builds the carousel by filtering showcase:true.
    // Asserting membership in that DERIVED set — not just the flag — is what proves the tile reaches
    // the rotation, and it stays honest if the seam ever moves off the raw boolean.
    const carousel = GAMES.filter((g) => g.showcase).map((g) => g.id)
    expect(carousel, 'defender is not in the showcase carousel — its manifest has not opted in').toContain(
      'defender',
    )
  })
})

// ─── AC2 — the lifecycle frames each render for real and DIFFER from the control ───────
describe('df7-7 AC2 — every lifecycle screen reaches the live frame, differing from the control', () => {
  it('drives attract -> play -> death -> game-over -> name-entry and each frame is a real, distinct render', () => {
    const rand = makeRand(101)

    // ── attract: the demo is PLAYING (df7-3) — the frame CHANGES as the auto-player acts ──
    const boot = bootSession(rand, [])
    expect(boot.phase, 'the cabinet boots on the attract screen').toBe('attract')
    const attractEarly = render(stepAttract(boot, 20))
    const attractLate = render(stepAttract(boot, 160))
    expect(
      digest(attractEarly),
      'the attract demo is frozen — its frame does not change as it plays (df7-3 self-play is dead)',
    ).not.toBe(digest(attractLate))

    // ── play: a started game with HUD + a populated scanner (df7-2 / df7-5 / df5-1/2) ──
    const play = reachPopulatedPlay(makeRand(43))
    expect(play.phase, 'precondition: reached play').toBe('play')
    expect(play.sim.landers.length, 'precondition: a wave populated so the play frame is real').toBeGreaterThan(0)
    const playFrame = render(play)

    // ── death: a survivable death beat (play + playerDied, men>=0) ──
    const deathSession = advanceStart(play, { playerDied: true, gameOver: false }, rand)
    expect(deathSession.phase, 'a survivable death enters the death beat').toBe('death')
    const deathFrame = render(deathSession)

    // ── game-over + hall-of-fame NAME ENTRY (df5-6 / df7-4): a qualifying final death ──
    // sim.gameOver is the flag composeFrame's end-screen branch keys on (scene.ts) — the shell
    // derives the game-over SIGNAL from it (df5-6 isGameOver, men<0). Set it so the fixture
    // renders the real GAME OVER / hall-of-fame screen, not the play field.
    const qualifying: Session = { ...play, sim: { ...play.sim, score: 50_000, gameOver: true } }
    const over = advanceStart(qualifying, { playerDied: true, gameOver: true }, rand)
    expect(over.phase, 'the fatal death reaches game-over').toBe('game-over')
    expect(over.nameEntry, 'a 50k score on an empty board qualifies — the entry opens (df7-4)').not.toBe(null)
    const gameOverFrame = render(over)

    let typed = over
    for (const ch of ['A', 'C', 'E']) typed = stepSessionInitials(typed, ch)
    expect(typed.nameEntry?.buffer, 'the initials buffer takes the typed letters').toBe('ACE')
    const nameEntryFrame = render(typed)

    // The bare game-over (entry aborted) isolates the NAME-ENTRY overlay's contribution.
    const bareOver = abortNameEntry(over)
    expect(bareOver.nameEntry, 'aborting closes the entry — same phase, no overlay').toBe(null)
    const bareOverFrame = render(bareOver)

    // ── the loop back to attract (game-over dwell times out) ──
    const looped = advanceStart(bareOver, { overTimeout: true }, rand)
    expect(looped.phase, 'the game-over dwell returns to attract — the cabinet loops').toBe('attract')
    const attractLoopFrame = render(looped)

    // Each lifecycle frame is a REAL render: non-blank AND distinct from the nonsense control.
    const control = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const frames: Array<[string, Framebuffer]> = [
      ['attract(early)', attractEarly],
      ['attract(late)', attractLate],
      ['play', playFrame],
      ['death', deathFrame],
      ['game-over', gameOverFrame],
      ['name-entry', nameEntryFrame],
      ['attract(loop)', attractLoopFrame],
    ]
    for (const [label, fb] of frames) {
      expect(fb.data.some((i) => i !== BACKGROUND), `the ${label} frame is blank`).toBe(true)
      expect(digest(fb), `the ${label} frame collapsed to the static control — it is not a real render`).not.toBe(
        digest(control),
      )
    }

    // The lifecycle actually PROGRESSES on screen (the transitions that must be visible):
    expect(digest(gameOverFrame), 'the GAME OVER screen is not distinct from the play frame').not.toBe(
      digest(playFrame),
    )
    expect(
      digest(nameEntryFrame),
      'the name-entry overlay (df7-4) does not reach the frame — it is identical to the entry-closed game-over',
    ).not.toBe(digest(bareOverFrame))

    // Every composed cell stays a valid 4-bit palette index across the WHOLE lifecycle — an
    // index > 15 renders as a colour the CRAM never named (df5-7's palette-validity guard, swept
    // across all phases).
    for (const [label, fb] of frames) {
      let worst = 0
      for (const px of fb.data) if (px > worst) worst = px
      expect(worst, `the ${label} frame holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(
        15,
      )
    }
  })
})

// ─── AC3 — NO full-frame strobe in ANY phase or transition (ADR-0005, df4-2 guard) ─────
describe('df7-7 AC3 — no lifecycle transition strobes the whole screen (the owner has epilepsy)', () => {
  it('assertNoFullFrameStrobe holds across every cabinet edge', () => {
    const rand = makeRand(211)
    const boot = bootSession(rand, [])
    const attractA = render(stepAttract(boot, 20))
    const attractB = render(stepAttract(boot, 160))

    const play = reachPopulatedPlay(makeRand(53))
    const playFrame = render(play)
    const deathFrame = render(advanceStart(play, { playerDied: true, gameOver: false }, rand))

    const qualifying: Session = { ...play, sim: { ...play.sim, score: 50_000, gameOver: true } }
    const over = advanceStart(qualifying, { playerDied: true, gameOver: true }, rand)
    const gameOverFrame = render(over)
    let typed = over
    for (const ch of ['A', 'C', 'E']) typed = stepSessionInitials(typed, ch)
    const nameEntryFrame = render(typed)
    const bareOver = abortNameEntry(over)
    const attractLoopFrame = render(advanceStart(bareOver, { overTimeout: true }, rand))

    // Every consecutive on-screen change a player sees across the lifecycle.
    const transitions: Array<[string, Framebuffer, Framebuffer]> = [
      ['attract demo (frame to frame)', attractA, attractB],
      ['attract -> play', attractB, playFrame],
      ['play -> death', playFrame, deathFrame],
      ['play -> game-over', playFrame, gameOverFrame],
      ['game-over -> name-entry', gameOverFrame, nameEntryFrame],
      ['game-over -> attract (loop)', render(bareOver), attractLoopFrame],
    ]
    for (const [label, before, after] of transitions) {
      expect(
        () => assertNoFullFrameStrobe(before.data, after.data),
        `the ${label} transition strobes the whole screen — ADR-0005 forbids it (photosensitive epilepsy)`,
      ).not.toThrow()
    }
  })

  it('assertNoFullFrameStrobe has teeth — a raw whole-frame flash DOES trip it', () => {
    // Non-vacuity guard: if the strobe detector accepted everything, "does not throw" above would
    // prove nothing. A whole-frame white-fill ($F everywhere) is exactly the ROM COM PCRAM invert
    // ADR-0005 forbids.
    const base = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const strobe = new Uint8Array(base.data.length).fill(0x0f)
    expect(
      () => assertNoFullFrameStrobe(base.data, strobe),
      'assertNoFullFrameStrobe let a whole-frame white-fill through — the lifecycle safety proof is vacuous',
    ).toThrow()
  })
})
