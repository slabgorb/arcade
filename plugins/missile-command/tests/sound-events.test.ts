// plugins/missile-command/tests/sound-events.test.ts
//
// Story mc8-2 — RED phase (O'Brien / TEA). The CORE half of the audio story:
// the pure per-frame sound-event channel the shell voices. Mirrors the house
// pattern (battlezone/star-wars core/events.ts): `GameState` carries a fresh
// `soundEvents: readonly SoundEvent[]` list each step, describing the audio
// moments the shell reacts to — plain DATA, never callbacks, so core/ stays
// pure and deterministic (a fixed seed yields an identical event stream). The
// event→POKEY mapping is the SHELL's job and lives in audio-dispatch.test.ts;
// this file proves the CORE actually EMITS each moment, at the frame it happens.
//
// WHY a separate emitter suite (project memory — "audio seam suites cannot see
// emitters"): a dispatch/seam test fed a hand-built SoundEvent[] proves the MAP
// but is BLIND to whether stepGame ever produces the event. So every emitter
// below is driven through the REAL sim to the exact frame the moment occurs and
// the event is asserted THERE — the down-count/seam blind spot the memory names.
//
// SCOPE (mc8-1 spike §5 / §8). The emitters wired by stepGame today —
// `detonated`, `icbmKilled`, `structureDestroyed` — and the fire-driven
// `launched` / `ammoEmpty` (fireFromKey) are DRIVEN here. `bonusTick` (the
// wave-bonus count-up, W3MAIN:4277) has no producer in the sim yet (wave.ts is
// not wired into stepGame), and the parametric cruise/Sputnik drone (mc8-3) has
// none either — those are exercised at the dispatch seam only, and their sim
// emitters are filed as follow-ups (see the mc8-2 session Delivery Findings).
//
// FIDELITY (spike §5 finding): Missile Command has NO incoming-ICBM sound —
// regular ICBM trails are silent; spawning and mere flight emit nothing. The
// union must carry no incoming/whistle/threat kind and a flying/spawning frame
// must be silent. Asserted below so a future "add an incoming whistle" regresses.
//
// RED today: src/core/sound-events.ts is absent and GameState has no
// `soundEvents` field, so this file fails to type-check / load until GREEN adds
// both and wires the emitters through stepGame + fireFromKey.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import type { SoundEvent } from '../src/core/sound-events.js'
import { fireFromKey } from '../src/shell/input.js'
import { NICBMS } from '../src/core/spawn.js'
import { type Icbm } from '../src/core/icbm.js'
import { type Abm } from '../src/core/abm.js'
import {
  startExplosion,
  stepExplosion,
  blastRadius,
  MAX_BLAST_RADIUS,
  type Explosion,
} from '../src/core/explosion.js'

/** A blast stepped to its PEAK radius — MAX_BLAST_RADIUS on BOTH the mc1-4 triangle
 *  and the mc9-3 OLDRAD curve, so this kill fixture does not depend on which radius
 *  model is live (their lifetimes differ, so no single hardcoded `t` works). */
const peakBlast = (h: number, v: number): Explosion => {
  let e = startExplosion(h, v)
  for (let i = 0; blastRadius(e) < MAX_BLAST_RADIUS && i < 10000; i++) e = stepExplosion(e)
  return e
}

/** Fold `stepGame` `n` times, collecting the soundEvents emitted each frame. */
const collect = (s: GameState, n: number): SoundEvent[][] => {
  const frames: SoundEvent[][] = []
  let cur = s
  for (let k = 0; k < n; k++) {
    cur = stepGame(cur)
    frames.push([...cur.soundEvents])
  }
  return frames
}

const kinds = (events: readonly SoundEvent[]): string[] => events.map((e) => e.type)

// ─── AC1: a fresh game is silent, and the channel is per-frame DATA ───────────
describe('mc8-2 — GameState.soundEvents is a pure per-frame channel', () => {
  it('a fresh game emits nothing (createGame is silent)', () => {
    expect(createGame(1).soundEvents).toEqual([])
  })

  it('the field is an array of discriminated `{type}` data, never a callback', () => {
    // Data, not behaviour: every emitted event narrows on a string `type`.
    const g = createGame(1)
    expect(Array.isArray(g.soundEvents)).toBe(true)
    for (const e of g.soundEvents) expect(typeof e.type).toBe('string')
  })

  it('the spawn frame is SILENT — spawning/incoming makes no sound (spike §5 fidelity)', () => {
    // The first step launches a full salvo of ICBMs (game.test pins MXICON) yet
    // nothing arrives, detonates or dies — so the frame must be silent. This is
    // the "no incoming-ICBM sound" fidelity guard: a threat appearing on screen
    // is not a sound event.
    const first = stepGame(createGame(1))
    expect(first.icbms.length, 'staging: the salvo must have launched').toBeGreaterThan(0)
    expect(kinds(first.soundEvents)).toEqual([])
  })
})

// ─── AC1 emitters: each moment fires its event AT the frame it happens ────────
describe('mc8-2 — stepGame emits each sim sound-moment at its frame', () => {
  it('an ABM arriving this frame emits exactly one `detonated`', () => {
    // An ABM sitting on its target snaps to arrived on the next step (abm.ts),
    // detonating a blast. remaining:0 + no icbms isolates the frame to the
    // detonation alone — no spawn, no kill, no impact.
    const abm: Abm = { origin: { h: 40, v: 8 }, target: { h: 120, v: 100 }, pos: { h: 120, v: 100 }, arrived: false }
    const g: GameState = { ...createGame(1), remaining: 0, icbms: [], abms: [abm] }

    const next = stepGame(g)
    expect(next.explosions.length, 'staging: the arrival must detonate a blast').toBe(1)
    expect(kinds(next.soundEvents)).toEqual(['detonated'])
  })

  it('a standing blast killing an ICBM emits `icbmKilled` (and no `detonated`)', () => {
    // game.test's deterministic kill construction: a live blast over one of two
    // ICBM heads, remaining:0 so no spawn perturbs it. The blast PRE-EXISTS, so
    // no ABM arrives → the ONLY moment is the kill. Score sanity ties the event
    // to the real kill, not a coincidence.
    const victim: Icbm = { origin: { h: 100, v: 222 }, target: { h: 100, v: 20 }, pos: { h: 100, v: 100 }, arrived: false }
    const bystander: Icbm = { origin: { h: 5, v: 222 }, target: { h: 5, v: 20 }, pos: { h: 5, v: 100 }, arrived: false }
    const blast = peakBlast(100, 99)
    const g: GameState = { ...createGame(1), remaining: 0, icbms: [victim, bystander], explosions: [blast], abms: [] }

    const next = stepGame(g)
    expect(next.score, 'staging: exactly one kill scored').toBe(25)
    expect(kinds(next.soundEvents)).toContain('icbmKilled')
    expect(kinds(next.soundEvents)).not.toContain('detonated')
  })

  it('an arrived ICBM destroying a city emits `structureDestroyed`', () => {
    const base = createGame(1)
    const target = base.cities[0].pos
    const arrived: Icbm = { origin: { h: target.h, v: 222 }, target, pos: target, arrived: true }
    const g: GameState = { ...base, remaining: 0, icbms: [arrived], abms: [] }

    const next = stepGame(g)
    expect(next.cities[0].alive, 'staging: the struck city must die').toBe(false)
    expect(kinds(next.soundEvents)).toContain('structureDestroyed')
  })

  it('an ALREADY-dead structure does NOT re-emit `structureDestroyed` on a later frame', () => {
    // structureDestroyed is a rising-edge moment — the frame a structure DIES — not
    // a per-frame census of the dead. A frame with a pre-dead city but no new loss
    // must be silent; a guard that counts every !alive structure would machine-gun
    // the explosion cue for the graveyard every frame (mutation-caught).
    const base = createGame(1)
    const g: GameState = {
      ...base,
      remaining: 0, // no spawn
      // One ICBM still descending — nothing ARRIVES this frame (so no new destruction),
      // but it keeps the wave open so this is a mid-wave frame, not an end-of-wave beat.
      icbms: [{ origin: { h: 10, v: 222 }, target: base.bases[0].pos, pos: { h: 10, v: 200 }, arrived: false }],
      abms: [],
      cities: base.cities.map((c, i) => (i === 0 ? { ...c, alive: false } : c)), // city 0 died earlier
    }
    const next = stepGame(g)
    expect(next.phase, 'staging: five cities still stand, so still in play').toBe('play')
    expect(kinds(next.soundEvents)).not.toContain('structureDestroyed')
  })
})

// ─── AC1: the channel is per-frame, not sticky, and deterministic ─────────────
describe('mc8-2 — the channel resets each frame and is seed-deterministic', () => {
  it('an event does not linger — the quiet frame AFTER a detonation is silent again', () => {
    const abm: Abm = { origin: { h: 40, v: 8 }, target: { h: 120, v: 100 }, pos: { h: 120, v: 100 }, arrived: false }
    const g: GameState = { ...createGame(1), remaining: 0, icbms: [], abms: [abm] }

    const boom = stepGame(g)
    expect(kinds(boom.soundEvents)).toEqual(['detonated'])
    // Next frame: the blast merely ages, no new arrival — the channel is empty,
    // proving soundEvents is rebuilt each step, not accumulated.
    const after = stepGame(boom)
    expect(kinds(after.soundEvents)).not.toContain('detonated')
  })

  it('same seed → identical soundEvents stream across a long run (data, not effects)', () => {
    expect(collect(createGame(7), 250)).toEqual(collect(createGame(7), 250))
  })

  it('game over freezes the channel — a terminal frame emits no new sim sound', () => {
    const dead = createGame(9)
    const g: GameState = { ...dead, cities: dead.cities.map((c) => ({ ...c, alive: false })) }
    const over = stepGame(g) // all cities dead → phase flips to 'over'
    expect(over.phase).toBe('over')
    // From here the loop only advances the frame counter — no spawn/flight/damage,
    // hence no sound. (The play→over transition frame's own event, if any, is a
    // dispatch concern; here we pin that the FROZEN steps after it are silent.)
    const frozen = stepGame(over)
    expect(kinds(frozen.soundEvents)).toEqual([])
  })
})

// ─── AC1: fire-driven events (fireFromKey is the launch/ammo producer) ────────
describe('mc8-2 — firing surfaces launched / ammoEmpty on the same channel', () => {
  it('firing a live base with ammo emits `launched` (and never `ammoEmpty`)', () => {
    const g = createGame(1) // three live bases, ammo 10
    const fired = fireFromKey('z', g) // Z → left base
    expect(fired.abms.length, 'staging: the shot must launch an ABM').toBe(1)
    expect(kinds(fired.soundEvents)).toContain('launched')
    expect(kinds(fired.soundEvents)).not.toContain('ammoEmpty')
  })

  it('firing an EMPTY base emits `ammoEmpty` — the out-of-ammo klaxon (NS) — and launches nothing', () => {
    const base = createGame(1)
    const g: GameState = { ...base, bases: base.bases.map((b, i) => (i === 0 ? { ...b, ammo: 0 } : b)) }
    const fired = fireFromKey('z', g)
    expect(fired.abms.length, 'staging: an empty base fires no missile').toBe(0)
    expect(kinds(fired.soundEvents)).toContain('ammoEmpty')
    expect(kinds(fired.soundEvents)).not.toContain('launched')
  })

  it('firing a DESTROYED base emits `ammoEmpty`, not `launched`', () => {
    const base = createGame(1)
    const g: GameState = { ...base, bases: base.bases.map((b, i) => (i === 0 ? { ...b, alive: false } : b)) }
    const fired = fireFromKey('z', g)
    expect(fired.abms.length).toBe(0)
    expect(kinds(fired.soundEvents)).toContain('ammoEmpty')
    expect(kinds(fired.soundEvents)).not.toContain('launched')
  })

  it('a non-fire key makes no sound and does not touch the channel', () => {
    const g = createGame(1)
    const tapped = fireFromKey('q', g)
    expect(tapped.abms.length).toBe(0)
    expect(kinds(tapped.soundEvents)).toEqual([])
  })
})

// ─── Fidelity guard: the union carries no incoming/threat sound at all ────────
describe('mc8-2 — no incoming-ICBM sound exists anywhere (spike §5 regression guard)', () => {
  it('a full wave of ICBMs flying (none arriving/killed) never voices a threat sound', () => {
    // Run long enough to spawn and fly the wave; assert every frame that no
    // emitted event is an incoming/whistle/threat cue. The ROM has none, so a
    // later story that invents one (a fidelity regression) reddens here.
    let g = createGame(3)
    for (let k = 0; k < NICBMS; k++) {
      g = stepGame(g)
      for (const e of g.soundEvents) {
        expect(
          /incoming|whistle|threat/i.test(e.type),
          `frame ${g.frame} voiced a non-existent threat cue: ${e.type}`,
        ).toBe(false)
      }
    }
  })
})
