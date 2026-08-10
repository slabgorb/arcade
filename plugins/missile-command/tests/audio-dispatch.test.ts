// plugins/missile-command/tests/audio-dispatch.test.ts
//
// Story mc8-2 — RED phase (O'Brien / TEA). The SHELL half: the event→POKEY
// wiring as a PURE, importable function — battlezone's audio-dispatch.ts
// extraction, deliberately NOT star-wars's inline-in-main.ts switch, precisely
// so this file can exist: a recording fake asserts the exact sound commands, in
// order, without booting a canvas or a real AudioContext (the story's "mockable
// audio seam, not a real AudioContext"). The CORE emits the events (proven in
// sound-events.test.ts); this proves the MAP and the EDGE-silence.
//
// The sound map pinned here (spike mc8-1 §5, W3MAIN call sites; every game event
// in the mc8-2 AC inventory, nothing more):
//   launched            → play('launch')     LA  SABLAU  (W3MAIN:1399)
//   detonated           → play('explosion')  EX  EXSNON  (W3MAIN:2121 "BANG ON")
//   structureDestroyed  → play('explosion')  EX  SOHNO≡SEXPLO (W3MAIN:2215/2259)
//   ammoEmpty           → play('no-fire')    NS  SNSHOT  (W3MAIN:1283 "NO FIRE NOISE")
//   bonusTick           → play('bonus-tick') TK  SUNABM  (W3MAIN:4277)
//   icbmKilled          → (SILENT — see the fidelity note below)
//
// ─── icbmKilled IS SILENT — the ONE flagged judgement call (spike §5) ─────────
// The explosion cue (EX) fires at the ABM DETONATION ("BANG ON", W3MAIN:2121) —
// which is the `detonated` event above. An ICBM caught by that already-detonated,
// still-expanding fireball is a SCORED consequence, not a second bang: the ROM
// plays NO cue per catch. So `detonated` carries the sound and `icbmKilled` is
// silent — mapping it to a second 'explosion' would double-voice every kill, a
// fidelity regression. This reading (fidelity over the AC's flat "each event
// triggers a sound" prose) is filed as a Delivery Finding for Reviewer/owner to
// veto; it is a one-line change here if overruled.
//
// bonusTick has no sim producer yet (wave.ts is unwired — sound-events.test.ts
// scope note), so ONLY its map is pinned here, from a hand-built event; the
// emitter is a filed follow-up. The sustained DRONE's parametric pitch sweep is
// mc8-3 — mc8-2 stands up only its start/stop LIFECYCLE so the edge-silence AC
// is provable now.
//
// RED today: src/shell/audio-dispatch.ts is absent — module-load failure is the
// RED signal (the battlezone bz1-11 idiom), alongside the assertions below.

import { describe, it, expect } from 'vitest'
import { playEventSounds, updateSustainedSounds } from '../src/shell/audio-dispatch.js'
import type { SoundEvent } from '../src/core/sound-events.js'
import { createPlayGame, type GameState } from '../src/core/game.js'
import type { Icbm } from '../src/core/icbm.js'
import type { DroneKind } from '../src/core/drone.js'

/** A recording fake of the audio surface — captures every call, in order. */
function recorder() {
  const calls: string[] = []
  return {
    calls,
    audio: {
      play(name: string): void {
        calls.push(`play:${name}`)
      },
      startLoop(name: string): void {
        calls.push(`startLoop:${name}`)
      },
      stopLoop(name: string): void {
        calls.push(`stopLoop:${name}`)
      },
      // mc8-5: the parametric sweep feed. Records the KIND and the sweep FRAME it was
      // driven with, so a test can prove the running drone is fed the right voice and
      // that the sweep actually advances (droneSweep reachability).
      feedDrone(frame: number, kind: DroneKind): void {
        calls.push(`feedDrone:${kind}:${frame}`)
      },
    },
  }
}

// ─── AC2: one cue per gameplay event, in core order ───────────────────────────
describe('playEventSounds — the event→POKEY map (spike §5)', () => {
  it('launched plays the LAUNCH cue', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'launched' }])
    expect(r.calls).toEqual(['play:launch'])
  })

  it('detonated plays the EXPLOSION cue', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'detonated' }])
    expect(r.calls).toEqual(['play:explosion'])
  })

  it('structureDestroyed plays the EXPLOSION cue — SOHNO reuses SEXPLO (§5:242)', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'structureDestroyed' }])
    expect(r.calls).toEqual(['play:explosion'])
  })

  it('ammoEmpty plays the NO-FIRE cue (NS, §5:243)', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'ammoEmpty' }])
    expect(r.calls).toEqual(['play:no-fire'])
  })

  it('bonusTick plays the BONUS-TICK cue (TK, §5:245)', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'bonusTick' }])
    expect(r.calls).toEqual(['play:bonus-tick'])
  })

  it('icbmKilled is SILENT — the detonation already banged (spike §5; flagged finding)', () => {
    // The flagged fidelity call. If overruled, this becomes ['play:explosion'].
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'icbmKilled' }])
    expect(r.calls).toEqual([])
  })

  it('an empty frame makes no sound at all', () => {
    const r = recorder()
    playEventSounds(r.audio, [])
    expect(r.calls).toEqual([])
  })

  it('multiple events in one frame all dispatch, preserving core order', () => {
    // A real frame bundles moments — a fresh launch, an ABM detonation that
    // catches an ICBM (kill is silent), and a city lost to another warhead —
    // nothing dropped or reordered.
    const frame: readonly SoundEvent[] = [
      { type: 'launched' },
      { type: 'detonated' },
      { type: 'icbmKilled' },
      { type: 'structureDestroyed' },
    ]
    const r = recorder()
    playEventSounds(r.audio, frame)
    expect(r.calls).toEqual(['play:launch', 'play:explosion', 'play:explosion'])
  })

  it('handles every SoundEvent kind without throwing (exhaustiveness guard)', () => {
    const oneOfEach: readonly SoundEvent[] = [
      { type: 'launched' },
      { type: 'detonated' },
      { type: 'icbmKilled' },
      { type: 'structureDestroyed' },
      { type: 'ammoEmpty' },
      { type: 'bonusTick' },
    ]
    const r = recorder()
    expect(() => playEventSounds(r.audio, oneOfEach)).not.toThrow()
    // Sanity on the whole map: launch + 2×explosion + no-fire + bonus-tick; the
    // silent icbmKilled adds nothing.
    expect(r.calls.filter((c) => c === 'play:launch')).toHaveLength(1)
    expect(r.calls.filter((c) => c === 'play:explosion')).toHaveLength(2)
    expect(r.calls.filter((c) => c === 'play:no-fire')).toHaveLength(1)
    expect(r.calls.filter((c) => c === 'play:bonus-tick')).toHaveLength(1)
  })

  it('never voices an incoming/whistle/threat cue for any event (spike §5 fidelity)', () => {
    const oneOfEach: readonly SoundEvent[] = [
      { type: 'launched' },
      { type: 'detonated' },
      { type: 'icbmKilled' },
      { type: 'structureDestroyed' },
      { type: 'ammoEmpty' },
      { type: 'bonusTick' },
    ]
    const r = recorder()
    playEventSounds(r.audio, oneOfEach)
    for (const c of r.calls) expect(/incoming|whistle|threat/i.test(c)).toBe(false)
  })
})

// ─── AC3: sustained voices are silenced at the pause/game-over EDGE ───────────
//
// The edge-driven-voices gotcha (story + project memory "audio seam suites
// cannot see emitters" / edge blindness): a naive stop keyed only on an explicit
// "drone-gone" event leaves the drone RINGING when the game simply ends with the
// threat still on screen — no gone-event ever fires. The boot-shell seam
// `updateSustainedSounds(audio, state)` re-reads state every render frame and
// silences the sustained voices at the terminal edge, exactly as battlezone's
// updateContinuousSounds forces stopEngine at 'gameover'. mc8-2 owns only the
// drone's LIFECYCLE; its parametric sweep is mc8-3.
describe('updateSustainedSounds — the drone does not ring through game over', () => {
  const over = (): GameState => {
    const g = createPlayGame(1)
    return { ...g, phase: 'over', cities: g.cities.map((c) => ({ ...c, alive: false })) }
  }

  it('game over silences a running drone even with NO drone-gone event (the gotcha)', () => {
    const r = recorder()
    r.audio.startLoop('drone') // a threat had started the drone mid-run
    updateSustainedSounds(r.audio, over())
    // The observable: after the update, the drone is NOT running. Pinned as the
    // NET state so a belt-and-suspenders stop or a single stop both satisfy it.
    const droneRunning = (() => {
      let on = false
      for (const c of r.calls) {
        if (c === 'startLoop:drone') on = true
        if (c === 'stopLoop:drone') on = false
      }
      return on
    })()
    expect(droneRunning, 'a dead game must not drone').toBe(false)
  })

  it('the silencing is a real stop call at the edge, not merely never-started', () => {
    // Guard against a vacuous pass: if the fake had never started the drone the
    // net-state check would pass trivially. Here the drone IS running first, so
    // the update must EMIT the stop.
    const r = recorder()
    r.audio.startLoop('drone')
    updateSustainedSounds(r.audio, over())
    expect(r.calls).toContain('stopLoop:drone')
  })

  it('during PLAY WITH A THREAT it does NOT stop the drone — the silence is EDGE-conditional, not unconditional', () => {
    // RE-BASELINED by mc8-5. mc8-2's original used a fresh no-threat game and asserted
    // "play never stops the drone" — but mc8-5 makes an empty play frame STOP it (no
    // threat → silent; that case is now pinned below). The surviving invariant: an
    // unconditional stopLoop (ignoring phase/presence) would silence the drone every
    // frame, so a live-play frame WITH a threat present must leave a running drone
    // alone (mutation-caught). droneRequest only reads .kind — a cruise on screen keeps
    // the drone live.
    const V0 = { h: 0, v: 0 }
    const cruise: Icbm = { origin: V0, target: V0, pos: V0, arrived: false, kind: 'cruise' }
    const r = recorder()
    r.audio.startLoop('drone')
    updateSustainedSounds(r.audio, { ...createPlayGame(1), icbms: [cruise] }) // phase 'play', threat present
    expect(r.calls).not.toContain('stopLoop:drone')
  })
})

// ─── mc8-5: the cruise/Sputnik drone LIVE TRIGGER ─────────────────────────────
//
// Story mc8-5 — RED (O'Brien / TEA). mc8-2 stood up the drone's start/stop lifecycle
// and the game-over edge-silence (above); mc8-4 built the pitch SWEEP (core/drone.ts
// droneSweep + engine.feedDrone). Both were UNREACHABLE — nothing ever STARTS the
// drone or FEEDS the sweep. This story wires the live trigger into the same per-frame
// seam (`updateSustainedSounds`, called from main.ts each frame): the ROM's CMSNON/
// STSNON, gated by CRMONS — start the drone while a cruise missile and/or a Sputnik
// is on screen during play, drive its parametric sweep each frame, and stop it the
// moment the threat clears — WITHOUT reopening the game-over leak mc8-2 closed.
//
// The pure presence→kind projection is `core/drone-trigger.ts::droneRequest` and is
// fully truth-tabled in drone-trigger.test.ts; this file proves the SHELL consumes it
// live through the recording fake (start/stop/feed), NOT the selector's math.
//
// WHY RED: updateSustainedSounds today only stops the drone at 'over' — it never
// starts it, never feeds the sweep, and never silences a paused game. The new-behavior
// cases below (start-on-presence, stop-on-clear, sweep-feed, pause-silence) all fail
// until GREEN wires droneRequest + feedDrone into the seam (widening its audio surface
// to include feedDrone). The game-over case is a REGRESSION GUARD: it passes today and
// must keep passing once the trigger lands (a naive `droneRequest ? start : stop` with
// no phase gate would reopen the leak).
describe('mc8-5 — the drone LIVE TRIGGER starts/stops from on-screen threats', () => {
  const V0 = { h: 0, v: 0 }
  // droneRequest reads only `.kind` off each ICBM and `.length` off sputniks, so these
  // minimal shapes are all the shell seam needs (the selector's full contract lives in
  // drone-trigger.test.ts). Cruise/ballistic are valid Icbm literals; a "plane" is any
  // object — only its presence in the roster counts.
  const cruise: Icbm = { origin: V0, target: V0, pos: V0, arrived: false, kind: 'cruise' }
  const ballistic: Icbm = { origin: V0, target: V0, pos: V0, arrived: false, kind: 'ballistic' }
  const plane = {} as GameState['sputniks'][number]

  const play = (over: Partial<GameState>): GameState => ({ ...createPlayGame(1), ...over })
  // Net running state of the drone after a run of calls (last start/stop wins).
  const droneRunning = (calls: readonly string[]): boolean => {
    let on = false
    for (const c of calls) {
      if (c === 'startLoop:drone') on = true
      if (c === 'stopLoop:drone') on = false
    }
    return on
  }

  // ── START on presence ───────────────────────────────────────────────────────
  it('a cruise missile on screen during play STARTS the drone', () => {
    const r = recorder()
    updateSustainedSounds(r.audio, play({ icbms: [cruise] }))
    expect(droneRunning(r.calls), 'a live cruise threat must sound the drone').toBe(true)
    expect(r.calls).toContain('startLoop:drone')
  })

  it('a Sputnik aloft during play STARTS the drone', () => {
    const r = recorder()
    updateSustainedSounds(r.audio, play({ sputniks: [plane] }))
    expect(droneRunning(r.calls)).toBe(true)
  })

  it('cruise AND Sputnik together STARTS the drone', () => {
    const r = recorder()
    updateSustainedSounds(r.audio, play({ icbms: [cruise], sputniks: [plane] }))
    expect(droneRunning(r.calls)).toBe(true)
  })

  it('ballistic warheads alone do NOT start the drone — only cruise/Sputnik trigger it', () => {
    // Guards a mutant that keys the trigger off icbms.length instead of the cruise kind.
    const r = recorder()
    updateSustainedSounds(r.audio, play({ icbms: [ballistic, ballistic] }))
    expect(droneRunning(r.calls), 'ordinary ICBMs are silent — no drone').toBe(false)
    expect(r.calls.some((c) => c.startsWith('feedDrone'))).toBe(false)
  })

  // ── STOP when the threat clears ──────────────────────────────────────────────
  it('a play frame with NO threat STOPS a running drone (the threat just cleared → silence)', () => {
    const r = recorder()
    r.audio.startLoop('drone') // it had been sounding
    updateSustainedSounds(r.audio, play({ icbms: [ballistic], sputniks: [] })) // no cruise, no plane
    expect(droneRunning(r.calls), 'a cleared screen must silence the drone').toBe(false)
    expect(r.calls).toContain('stopLoop:drone')
  })

  // ── DRIVE the parametric sweep while running (feedDrone reachability + kind) ──
  it('while a cruise threat runs, the sweep is FED with kind "cruise"', () => {
    const r = recorder()
    updateSustainedSounds(r.audio, play({ icbms: [cruise] }))
    expect(r.calls.some((c) => c.startsWith('feedDrone:cruise:'))).toBe(true)
  })

  it('a Sputnik-only threat feeds the sweep with kind "sputnik" (not a hardcoded cruise)', () => {
    // The kind must track droneRequest — sputnik/cruise sweep DIFFERENT bounds
    // (TOP 0x70 vs 0x30, core/drone.ts). A mutant that always feeds 'cruise' dies here.
    const r = recorder()
    updateSustainedSounds(r.audio, play({ sputniks: [plane] }))
    expect(r.calls.some((c) => c.startsWith('feedDrone:sputnik:'))).toBe(true)
    expect(r.calls.some((c) => c.startsWith('feedDrone:cruise:'))).toBe(false)
  })

  it('cruise AND Sputnik feeds the sweep with kind "both"', () => {
    const r = recorder()
    updateSustainedSounds(r.audio, play({ icbms: [cruise], sputniks: [plane] }))
    expect(r.calls.some((c) => c.startsWith('feedDrone:both:'))).toBe(true)
  })

  it('the sweep ADVANCES across frames — consecutive frames feed different sweep positions', () => {
    // Proves droneSweep is actually driven (not stuck at one value): two frames of a
    // held cruise threat must feed two DIFFERENT sweep frames, whether the shell tracks
    // the sim clock or an internal counter. Extract the frame arg the fake recorded.
    const frameOf = (calls: readonly string[]): number => {
      const hit = calls.find((c) => c.startsWith('feedDrone:cruise:'))
      return Number(hit?.split(':')[2])
    }
    const r0 = recorder()
    updateSustainedSounds(r0.audio, play({ icbms: [cruise], frame: 0 }))
    const r1 = recorder()
    updateSustainedSounds(r1.audio, play({ icbms: [cruise], frame: 5 }))
    expect(frameOf(r0.calls)).not.toBe(frameOf(r1.calls))
  })

  // ── the game-over leak must NOT reopen (regression guard) ─────────────────────
  it('game over with a cruise STILL on screen does NOT start or feed the drone — it is silenced', () => {
    // The headline paranoia: at 'over' the rosters are FROZEN (game.ts:178), so a
    // cruise remains on screen and droneRequest still returns 'cruise'. A trigger that
    // ignored phase would RE-START the drone at the terminal edge — exactly the leak
    // mc8-2 closed. Game-over must win over presence.
    const r = recorder()
    r.audio.startLoop('drone')
    updateSustainedSounds(r.audio, play({ phase: 'over', icbms: [cruise] }))
    expect(droneRunning(r.calls), 'a dead game must not drone even with a frozen threat').toBe(false)
    expect(r.calls).toContain('stopLoop:drone')
    expect(r.calls.some((c) => c.startsWith('feedDrone'))).toBe(false)
  })

  it('a PAUSED game with a threat on screen does NOT drone (pre-emptive guard for mc6 pause)', () => {
    // 'pause' is NOT yet wired into stepGame/nextPhase — nothing sets phase 'pause' today
    // (unlike 'over', which game.ts:178 genuinely freezes). This is a forward guard: when
    // mc6 wires pause, a paused cabinet must not hum, and the SAME 'play'-only phase gate
    // already silences it (droneRequest is phase-agnostic, so presence alone would leak).
    const r = recorder()
    r.audio.startLoop('drone')
    updateSustainedSounds(r.audio, play({ phase: 'pause', icbms: [cruise] }))
    expect(droneRunning(r.calls), 'a paused game must not drone').toBe(false)
    expect(r.calls.some((c) => c.startsWith('feedDrone'))).toBe(false)
  })

  it('a NON-play, non-terminal phase (between/attract) with a threat present does NOT drone — the gate is an ALLOWLIST', () => {
    // Locks the 'play'-ONLY allowlist. Without this, an enumerated-denylist mutant
    // (`phase === 'over' || phase === 'pause' ? null : droneRequest(state)`) passes every
    // other test yet drones through 'between'/'attract'/'setup'. 'between' carries a
    // frozen-in ICBM roster into its one-frame beat, so droneRequest is non-null here —
    // only the phase gate silences it.
    for (const phase of ['between', 'attract', 'setup'] as const) {
      const r = recorder()
      r.audio.startLoop('drone')
      updateSustainedSounds(r.audio, play({ phase, icbms: [cruise], sputniks: [plane] }))
      expect(droneRunning(r.calls), `phase '${phase}' must not drone`).toBe(false)
      expect(r.calls.some((c) => c.startsWith('feedDrone')), `phase '${phase}' feeds no sweep`).toBe(false)
    }
  })
})
