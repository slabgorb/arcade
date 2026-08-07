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
import { createGame, type GameState } from '../src/core/game.js'

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
    const g = createGame(1)
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
})
