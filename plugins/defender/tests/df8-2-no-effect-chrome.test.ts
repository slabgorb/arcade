// tests/df8-2-no-effect-chrome.test.ts
//
// Story df8-2 — RED phase (O'Brien / TEA). REMOVE THE INVENTED EFFECT CHROME.
//
// The clone's effect renderer (core/scene.ts drawEffect) decorates every effect with
// TWO inventions the ROM never draws:
//
//   1. THE SCREEN "WASH" (drawScreenWash, pt1-25): a stride-3 lattice of dim palette
//      indices painted over the whole empty field whenever a SCREEN effect (player
//      death / smart bomb / hyperspace) is live. Built as an ADR-0005 "anti-strobe"
//      substitute — but the owner is NOT photosensitive (corrected 2026-08-21), so the
//      rationale is void and what remains is a non-ROM red/green dot grid (CRAM maps
//      index 2=RED, 3=GREEN) smeared across the playfield at every death/bomb/warp.
//
//   2. THE SPARK "RING" (drawRing, df4-6): a diamond outline (radius 6..10) drawn
//      around every LOCALIZED enemy appear/explode effect. The ROM's SAMEXAP7 animates
//      the object's OWN picture; it draws no ring.
//
// ─── THE CONTRACT THIS SUITE PINS (what GREEN/Dev must build) ─────────────────────
//   • A SCREEN effect contributes NO pixels: composing a state with its screen effects
//     present is byte-identical to composing it with them stripped. The sim-side wiring
//     (pt1-25: killPlayer/hyperspace/smart-bomb spawn tagged effects) is UNCHANGED —
//     the effects still exist and still tag their events; only the paint goes.
//     (The ROM's real white-strobe substitute is NOT being added back — the field
//     simply stays clean: background + stars + sprites + terrain + HUD.)
//   • A LOCALIZED effect contributes ONLY its sprite blit: every pixel it changes lies
//     inside the sprite's own cell (width×2 columns × height rows at its projected
//     column). No diamond shell, no pixel outside the cell.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────
// Today drawEffect calls drawScreenWash for every non-raster presentation (the lattice
// diffs thousands of background cells) and drawRing after every localized sprite blit
// (the diamond's cells lie OUTSIDE the sprite cell — EFFECT_RING_MIN exceeds the
// sprite half-extents by design). Both assertions below fail on exactly those pixels.
//
// Diff-against-control idiom (pt1-24 / pt1-25 / pt1-27): composeFrame is PURE, so
// composing the SAME state with and without its effects isolates the effect's exact
// pixel contribution — every differing cell IS the effect's paint.

import { describe, it, expect } from 'vitest'
import { createSim, stepSim, spawnLander, spawnExplosion, type Input, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { classify, type EffectEvent, type PlacedEffect } from '../src/core/effects.js'
import { projectWorldX } from '../src/core/world.js'
import type { Framebuffer } from '../src/core/framebuffer.js'
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

/** A safe byte source: constant 100 — in-band for initStars' rejection loops, and ≤192 so a
 *  hyperspace re-entry roll TELEPORTS (the pt1-25 derivation of the deterministic drives). */
const safeRand = (): (() => number) => () => 100

/** A byte source returning 100 until a value is injected — lands a chosen byte on the tick's
 *  FIRST draw (the hyperspace death roll) without disturbing createSim (pt1-25 idiom). */
function injectableRand(): { fn: () => number; inject: (v: number) => void } {
  const q: number[] = []
  return { fn: (): number => (q.length ? (q.shift() as number) : 100), inject: (v: number): void => void q.push(v) }
}

const SCREEN_EVENTS: readonly EffectEvent[] = ['player-death', 'smart-bomb', 'hyperspace']
const isScreenEvent = (e: EffectEvent): boolean => SCREEN_EVENTS.includes(e)

/** Strip ONLY the screen-classified effects, keeping localized enemy bursts — the pt1-25
 *  isolation, inverted: any pixel differing between the two compositions IS screen paint. */
const withoutScreenEffects = (s: SimState): SimState => ({
  ...s,
  effects: s.effects.filter((e) => !isScreenEvent(e.event)),
})

/** Diff two equal-size frames: how many cells differ, and which palette indices the FIRST
 *  frame holds at the differing cells (so a RED run names the invented lattice colours). */
function diffFrames(a: Framebuffer, b: Framebuffer): { changed: number; indices: number[] } {
  const seen = new Set<number>()
  let changed = 0
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) {
      changed++
      seen.add(a.data[i])
    }
  }
  return { changed, indices: [...seen].sort((x, y) => x - y) }
}

/** The live screen effect(s) in a state — the non-vacuity handle: the trigger genuinely
 *  fired and the composer genuinely faces a non-raster presentation. */
const liveScreenEffects = (s: SimState): readonly PlacedEffect[] =>
  s.effects.filter((e) => isScreenEvent(e.event) && !e.done)

/** Assert the state carries a live `event` screen effect, then prove composing WITH it is
 *  byte-identical to composing WITHOUT it — a screen effect paints NOTHING (df8-2). */
function expectScreenEffectPaintsNothing(s: SimState, event: EffectEvent): void {
  // Non-vacuity 1: the trigger fired — the effect is live in the bank, not absent/expired.
  const live = liveScreenEffects(s)
  expect(
    live.map((e) => e.event),
    `the ${event} trigger must have spawned a live screen effect (pt1-25 wiring) — else this test proves nothing`,
  ).toContain(event)
  // Non-vacuity 2: the composer classifies it OFF the raster path — the exact branch that
  // used to paint the wash. If classify() ever re-routes these to 'raster', this test's
  // subject has vanished and the assertion below would pass vacuously.
  expect(
    classify(event).presentation,
    `${event} must classify off the raster path — the drawEffect branch under test`,
  ).not.toBe('raster')

  const full = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  const control = composeFrame(withoutScreenEffects(s), LOGICAL_WIDTH, LOGICAL_HEIGHT)
  const { changed, indices } = diffFrames(full, control)
  expect(
    changed,
    `a SCREEN ${event} effect must paint NOTHING — the invented stride-3 wash lattice is removed, ` +
      `the playfield stays clean during death/bomb/warp. It painted ${changed} cells with palette ` +
      `indices [${indices.join(', ')}] over the control frame`,
  ).toBe(0)
}

describe('df8-2 — a SCREEN effect draws NO full-field paint (the invented wash is gone)', () => {
  it('a smart bomb leaves the composed field free of the wash lattice', () => {
    const s = stepSim(createSim(safeRand()), withInput({ smartBomb: true }))
    expectScreenEffectPaintsNothing(s, 'smart-bomb')
  })

  it('a hyperspace teleport leaves the composed field free of the wash lattice', () => {
    const s = stepSim(createSim(safeRand()), withInput({ hyperspace: true })) // 100 ≤ 192 → teleport
    expectScreenEffectPaintsNothing(s, 'hyperspace')
  })

  it('a player death (hyperspace strand) leaves the composed field free of the wash lattice', () => {
    const r = injectableRand()
    const s0 = createSim(r.fn)
    r.inject(200) // >192: the re-entry roll strands the player — killPlayer() fires
    const s = stepSim(s0, withInput({ hyperspace: true }))
    expect(s.men, 'the strand must have cost a man — confirms killPlayer fired').toBe(s0.men - 1)
    expectScreenEffectPaintsNothing(s, 'player-death')
  })
})

// ─── LOCALIZED effects: the sprite blit is the WHOLE effect — no diamond ring ────────

/** The sprite cell of a localized effect on the framebuffer: its projected column, its row,
 *  and the cell's pixel extent (width bytes × 2 pixels each, height rows). */
function spriteRect(e: PlacedEffect, camera: number): { x0: number; y0: number; x1: number; y1: number } {
  expect(e.picture, 'a localized effect must carry its sprite picture').toBeDefined()
  const col = projectWorldX(e.x, camera)
  expect(col, 'the staged effect must project on-window — stage it on-screen').not.toBeNull()
  const pic = e.picture as NonNullable<typeof e.picture>
  return { x0: col as number, y0: e.y, x1: (col as number) + pic.width * 2, y1: e.y + pic.height }
}

/** Diff two frames, split by whether the differing cell lies inside the given rect. */
function diffSplitByRect(
  a: Framebuffer,
  b: Framebuffer,
  r: { x0: number; y0: number; x1: number; y1: number },
): { inside: number; outside: number } {
  let inside = 0
  let outside = 0
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = y * a.width + x
      if (a.data[i] === b.data[i]) continue
      if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) inside++
      else outside++
    }
  }
  return { inside, outside }
}

describe('df8-2 — a LOCALIZED effect draws ONLY its sprite (the invented spark ring is gone)', () => {
  it('an enemy EXPLODE effect changes pixels only inside its own sprite cell', () => {
    // spawnExplosion on a fresh sim (the df4-6 staging): the explode sprite blits where no
    // enemy stands, so its cell pixels are the effect's genuine — and ONLY legal — paint.
    const s = spawnExplosion(createSim(safeRand()), 20 << 8, 120) // pt1-18: offset 5120 < 9600 window
    const e = s.effects.find((fx) => fx.kind === 'explode')
    expect(e, 'spawnExplosion must enqueue an explode effect (df4-6)').toBeDefined()
    const eff = e as PlacedEffect
    expect(classify(eff.event).presentation, 'an enemy explode rasters — the branch under test').toBe('raster')

    const rect = spriteRect(eff, s.camera)
    const full = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const control = composeFrame({ ...s, effects: [] }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const { inside, outside } = diffSplitByRect(full, control, rect)

    // Non-vacuity: the sprite genuinely reached the frame — the effect is not a no-op.
    expect(inside, 'the explode sprite painted nothing — the ring check below would be vacuous').toBeGreaterThan(0)
    // The df8-2 removal: no pixel outside the sprite cell. Today drawRing lights a diamond
    // shell (Manhattan radius ≥ 6 from the cell centre) whose cells lie beyond the cell.
    expect(
      outside,
      `a localized explode must paint ONLY its sprite cell — ${outside} pixel(s) landed outside it ` +
        '(the invented drawRing diamond shell). The ROM animates the picture alone; remove the ring',
    ).toBe(0)
  })

  it('an enemy APPEAR (materialize) effect adds NO pixels beyond the sprite cell', () => {
    // spawnLander enqueues the appear effect AT the live lander with the SAME picture, so the
    // effect's blit overdraws the lander pixel-for-pixel: once the ring is gone, the appear
    // effect's paint is confined to (in fact invisible inside) the sprite cell.
    const s = spawnLander(createSim(safeRand()), 1000)
    const e = s.effects.find((fx) => fx.kind === 'appear')
    expect(e, 'spawnLander must enqueue an appear effect (df4-6)').toBeDefined()
    const eff = e as PlacedEffect
    expect(classify(eff.event).presentation, 'an enemy appear rasters — the branch under test').toBe('raster')

    const rect = spriteRect(eff, s.camera)
    const full = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const control = composeFrame({ ...s, effects: [] }, LOGICAL_WIDTH, LOGICAL_HEIGHT)

    // Non-vacuity: the SPRITE is genuinely on the frame (drawn by the lander + the effect's
    // overdraw) — this scenario is not an empty frame passing by default. The appear effect
    // itself may legally contribute zero NEW pixels (perfect overdraw), so the guard reads
    // the composed cell content, not the diff.
    let spritePixels = 0
    for (let y = rect.y0; y < rect.y1; y++) {
      for (let x = rect.x0; x < rect.x1; x++) {
        if (full.data[y * full.width + x] !== 0) spritePixels++
      }
    }
    expect(spritePixels, 'no sprite pixels in the cell — the staging is broken, the test is vacuous').toBeGreaterThan(0)

    const { outside } = diffSplitByRect(full, control, rect)
    expect(
      outside,
      `a materialize must add NOTHING beyond the sprite cell — ${outside} pixel(s) landed outside it ` +
        '(the invented drawRing diamond shell). The ROM animates the picture alone; remove the ring',
    ).toBe(0)
  })
})
