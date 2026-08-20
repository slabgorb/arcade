// tests/pt1-25-death-power-effects.test.ts
//
// Story pt1-25 — RED phase (O'Brien / TEA). THE ADR-0005 EFFECT POLICY IS BUILT BUT
// NEVER CALLED.
//
// THE DEFECT (render audit 2026-08-20, root cause R2). core/effects.ts carries the whole
// ADR-0005 effect-presentation layer — classify() (which already maps 'player-death',
// 'smart-bomb' and 'hyperspace' to full-frame-strobe SAFE variants), the appear/explode
// lifecycle, the effect BANK, and the assertNoFullFrameStrobe render guard. But the three
// PLAYER-FACING events have ZERO call sites in the live loop (grep classify in sim.ts →
// nothing):
//   • killPlayer (sim.ts) only loseMan()s and pushes the 'player-death' CUE — no effect.
//   • hyperspace (sim.ts) teleports the ship instantly — no vanish/reappear effect.
//   • the smart bomb clears the field with per-enemy explosions but no SCREEN-level flash.
// So death, hyperspace and the smart bomb are audible (a cue) and mechanical (a teleport /
// a cleared field) but INVISIBLE. The effect infrastructure sits one spawn call away.
//
// ─── THE CONTRACT THIS SUITE PINS (what GREEN/Dev must build) ─────────────────────────
//   Each of the three triggers spawns ONE effect through the existing _effectBank, and that
//   effect is TAGGED with its ADR-0005 EffectEvent so the composer can classify() it into
//   the seizure-safe presentation. The read side (PlacedEffect, the `state.effects` view)
//   gains a discriminator — an `event` field — set on the three screen effects:
//     killPlayer()  → an effect with event 'player-death'  (classify → fade)  — spawned in
//                     killPlayer itself, so EVERY death cause (collision, hyperspace strand)
//                     surfaces it, not just one call site.
//     hyperspace()  → an effect with event 'hyperspace'    (classify → freeze)
//     smart bomb    → an effect with event 'smart-bomb'    (classify → fade), DISTINCT from
//                     the localized enemy-explode bursts clearAllEnemies already queues.
//   The ADR-0005 Design Deviation (the ROM's three full-frame strobes → freeze/fade) is
//   logged in the session; the assertNoFullFrameStrobe guard stays the enforcement, so the
//   wired effect must NOT render as a whole-frame white-fill/inversion.
//
// ─── WHY THESE DRIVES ARE DETERMINISTIC ───────────────────────────────────────────────
// createSim takes an INJECTED byte source (the shell owns entropy). Only initStars LOOPS on
// it (`while x>=$9C` / `while y∉(YMIN,$A8]`), so a constant must land in-band: 100 satisfies
// both (100<156, 42<100<=168) and is the safe default here. Inside a tick, nothing draws
// rand before the hyperspace decision — `hyperspaceKilled(rand)` is the FIRST draw — so an
// injected byte lands there exactly: >192 strands the player (a death), ≤192 teleports.
//
// ─── WHY THIS IS RED ───────────────────────────────────────────────────────────────────
// No trigger spawns anything today, so `state.effects` never carries a 'player-death',
// 'hyperspace' or 'smart-bomb' event, and composing the smart-bomb frame is byte-identical
// with or without its (absent) screen effect. Every wiring test below fails on that.

import { describe, it, expect } from 'vitest'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { classify, assertNoFullFrameStrobe } from '../src/core/effects.js'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../src/shell/render.js'

const NEUTRAL: Input = {
  thrust: false,
  reverse: false,
  up: false,
  down: false,
  fire: false,
  smartBomb: false,
  hyperspace: false,
}
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

// ─── The pt1-25 contract shim (the pt1-27 pattern: a test-local view of the field GREEN
//     must add). The read side today has no discriminator; the wiring must tag each screen
//     effect with its EffectEvent so the composer can classify() it. We only ASSERT on the
//     three screen events — legacy enemy effects may leave `event` unset. ─────────────────
type ScreenEvent = 'player-death' | 'smart-bomb' | 'hyperspace'
interface TaggedEffect {
  readonly event?: ScreenEvent | 'enemy-explode' | 'terrain-blow'
}
const SCREEN_EVENTS: readonly ScreenEvent[] = ['player-death', 'smart-bomb', 'hyperspace']
const isScreenEvent = (e: unknown): e is ScreenEvent => SCREEN_EVENTS.includes(e as ScreenEvent)

/** Every screen-effect tag present in a `state.effects` view. */
const screenTags = (state: SimState): ScreenEvent[] =>
  state.effects.map((e) => (e as TaggedEffect).event).filter(isScreenEvent)

/** A safe byte source: constant 100 — in-band for initStars, ≤192 so hyperspace teleports. */
const safeRand = (): (() => number) => () => 100

/** A byte source that returns 100 (safe) until a value is injected — used to land a chosen
 *  byte on the tick's FIRST draw (the hyperspace death roll) without disturbing createSim. */
function injectableRand(): { fn: () => number; inject: (v: number) => void } {
  const q: number[] = []
  return { fn: (): number => (q.length ? (q.shift() as number) : 100), inject: (v: number): void => void q.push(v) }
}

const hasCue = (state: SimState, type: string): boolean => state.cues.some((c) => c.type === type)

describe('pt1-25 — player death spawns an ADR-0005 player-death effect (killPlayer wiring)', () => {
  it('a fresh sim carries no screen effect — the baseline the trigger must break', () => {
    const s = createSim(safeRand())
    expect(screenTags(s), 'nothing has died/warped/bombed yet').toEqual([])
  })

  it('a death (hyperspace strand) spawns a player-death effect, keeps the cue, and loses a man', () => {
    const r = injectableRand()
    let s = createSim(r.fn)
    const menBefore = s.men
    r.inject(200) // >192: the re-entry death roll strands the player — killPlayer() fires

    s = stepSim(s, withInput({ hyperspace: true }))

    expect(hasCue(s, 'player-death'), 'the existing PDSND cue must survive the wiring').toBe(true)
    expect(s.men, 'the strand cost a man — confirms we took the death branch').toBe(menBefore - 1)
    expect(
      screenTags(s),
      'killPlayer must spawn a player-death effect — today it only sounds + loseMan()s',
    ).toContain('player-death')
  })

  it('the player-death event classifies as a seizure-safe full-frame-strobe, never a raster', () => {
    const p = classify('player-death')
    expect(p.class).toBe('full-frame-strobe')
    expect(p.presentation, 'ADR-0005: death is a fade of the frame, not a rastered sprite').not.toBe('raster')
  })
})

describe('pt1-25 — hyperspace spawns an ADR-0005 freeze effect', () => {
  it('a successful teleport spawns a hyperspace effect — and does NOT read as a death', () => {
    const s0 = createSim(safeRand()) // 100 ≤ 192 → the teleport branch, not the strand
    const menBefore = s0.men
    const s = stepSim(s0, withInput({ hyperspace: true }))

    expect(s.men, 'a clean teleport costs no man').toBe(menBefore)
    const tags = screenTags(s)
    expect(tags, 'hyperspace must spawn its own effect — today it teleports invisibly').toContain('hyperspace')
    expect(tags, 'a clean jump is not a death').not.toContain('player-death')
  })

  it('the hyperspace event classifies as a seizure-safe full-frame-strobe, never a raster', () => {
    const p = classify('hyperspace')
    expect(p.class).toBe('full-frame-strobe')
    expect(p.presentation, 'ADR-0005: hyperspace holds a freeze across the jump').not.toBe('raster')
  })
})

describe('pt1-25 — a smart bomb spawns an ADR-0005 fade effect (not just per-enemy bursts)', () => {
  it('firing a smart bomb spends a bomb and spawns a distinct smart-bomb screen effect', () => {
    const s0 = createSim(safeRand())
    const bombsBefore = s0.smartBombs
    const s = stepSim(s0, withInput({ smartBomb: true }))

    expect(s.smartBombs, 'the fire spent one bomb — confirms the trigger fired').toBe(bombsBefore - 1)
    expect(hasCue(s, 'smart-bomb'), 'the existing SBSND cue must survive the wiring').toBe(true)
    expect(
      screenTags(s),
      'the field clear needs its own screen flash — a per-enemy burst is not a smart-bomb effect',
    ).toContain('smart-bomb')
  })

  it('the smart-bomb screen effect is drawn and is bounded — surfaced in scene.ts, never a strobe', () => {
    const s = stepSim(createSim(safeRand()), withInput({ smartBomb: true }))

    // Isolate the SCREEN effect's contribution: the same state with only the screen effects
    // stripped (enemy bursts kept). composeFrame is pure, so any differing pixel is the wash.
    const withWash = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const withoutWash = composeFrame(
      { ...s, effects: s.effects.filter((e) => !isScreenEvent((e as TaggedEffect).event)) },
      LOGICAL_WIDTH,
      LOGICAL_HEIGHT,
    )

    let differs = false
    for (let i = 0; i < withWash.data.length; i++) {
      if (withWash.data[i] !== withoutWash.data[i]) {
        differs = true
        break
      }
    }
    expect(differs, 'the smart-bomb effect must actually reach the framebuffer, not just SimState').toBe(true)

    // ADR-0005: whatever the wash is, it must not be a whole-frame white-fill/inversion.
    expect(() => assertNoFullFrameStrobe(withoutWash.data, withWash.data)).not.toThrow()
  })

  it('the smart-bomb event classifies as a seizure-safe full-frame-strobe, never a raster', () => {
    const p = classify('smart-bomb')
    expect(p.class).toBe('full-frame-strobe')
    expect(p.presentation, 'ADR-0005: the COM PCRAM invert is substituted by a bounded fade').not.toBe('raster')
  })
})
