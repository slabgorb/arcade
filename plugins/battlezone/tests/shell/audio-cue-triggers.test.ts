// tests/shell/audio-cue-triggers.test.ts
//
// Story bz3-10 — RED phase (O'Brien / TEA). Cluster C10. The TRIGGER half: each
// of the five ROM cues must fire on its EXISTING core moment. Envelope timing is
// pinned in audio-cues.test.ts; this file pins the event->cue wiring in
// shell/audio-dispatch.ts and the saucer-kill DISINT LAYER (U-014).
//
// HOUSE ARCHITECTURE (bz1-11): one-shot cues ride the pure-core GameEvent stream
// (`playEventSounds`), continuous sounds re-read live state (`updateContinuousSounds`).
// These five are all one-shots at a MOMENT, so they belong on the event channel —
// exactly where cannon/explosion already live. The ROM fires each once, on a
// rising EDGE:
//   WARNG  enemy first enters range   BZONE.MAC:4050-4054 (EIRNGE latch, SNDON)
//   RBEEP  sweep passes a blip        BZONE.MAC:3993-3996 (BLIP >= 0F0, SNDON)
//   BOING  drive into an object       BZONE.MAC:2677-2680 (OBJCOL latch, SNDON)
//   BONER  a bonus tank is earned     BZONE.MAC:2560-2564 (INC LIVES, SNDON)
//   DISINT saucer kill zap LAYER      BZONE.MAC:2483-2492 (DISINT via SNDON, THEN EXPCNT explosion)
//
// So GREEN adds four core GameEvents (enemy-in-range / radar-blip / motion-blocked
// / bonus-tank), emitted on their rising edge in sim.ts, mapped to cues here; and
// LAYERS `disint` onto the existing `enemy-destroyed(kind:'saucer')` event (no new
// event — the kill moment already exists, sim.ts:157). See the RED delivery notes
// in .session/bz3-10-session.md for the exact emission points.
//
// tsconfig includes `tests`, and none of the four new event kinds exist in the
// GameEvent union yet — so events are passed through a locally-declared loose
// type and audio-dispatch is loaded defensively (radar-sweep.test.ts pattern),
// keeping `tsc --noEmit` clean while the wiring is still absent. RED signal: an
// unknown event hits playEventSounds' `default` (a silent no-op), so the cue is
// never recorded; the saucer kill records only `explosion`, not `disint`.
import { describe, it, expect, beforeAll } from 'vitest'
import { initGame, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'

// ── loose surfaces (must type-check against TODAY's code) ─────────────────────
interface Surface {
  play(name: string): void
  startLoop(name: string): void
  stopLoop(name: string): void
  setEngine(t: number): void
  stopEngine(): void
}
interface LooseEvent {
  readonly type: string
  readonly kind?: string
}
type DispatchModule = {
  playEventSounds?: (audio: Surface, events: readonly LooseEvent[]) => void
}

let dispatch: DispatchModule = {}

const playEventSounds = (audio: Surface, events: readonly LooseEvent[]): void => {
  if (!dispatch.playEventSounds) throw new Error('audio-dispatch.ts must export playEventSounds')
  dispatch.playEventSounds(audio, events)
}

/** A recording fake of the audio surface — captures every call, in order. */
function recorder(): { calls: string[]; audio: Surface } {
  const calls: string[] = []
  return {
    calls,
    audio: {
      play: (name) => calls.push(`play:${name}`),
      startLoop: (name) => calls.push(`startLoop:${name}`),
      stopLoop: (name) => calls.push(`stopLoop:${name}`),
      setEngine: (t) => calls.push(`setEngine:${t}`),
      stopEngine: () => calls.push('stopEngine'),
    },
  }
}

beforeAll(async () => {
  try {
    dispatch = (await import('../../src/shell/audio-dispatch')) as DispatchModule
  } catch {
    dispatch = {}
  }
})

// ── the four new one-shot cues map to their moment (U-008/009/010/012) ────────
describe('bz3-10 — playEventSounds maps each new moment to its ROM cue', () => {
  const MAP = [
    { type: 'enemy-in-range', cue: 'warng', note: 'WARNG — a hostile first entered range (BZONE.MAC:4053)' },
    { type: 'radar-blip', cue: 'rbeep', note: 'RBEEP — the sweep passed a contact (BZONE.MAC:3995)' },
    { type: 'motion-blocked', cue: 'boing', note: 'BOING — drove into an object (BZONE.MAC:2679)' },
    { type: 'bonus-tank', cue: 'boner', note: 'BONER — a bonus tank was earned (BZONE.MAC:2563)' },
  ] as const

  it.each(MAP)('$note', ({ type, cue }) => {
    const r = recorder()
    playEventSounds(r.audio, [{ type }])
    expect(r.calls).toEqual([`play:${cue}`])
  })

  it('an empty frame stays silent (no phantom cue)', () => {
    const r = recorder()
    playEventSounds(r.audio, [])
    expect(r.calls).toEqual([])
  })

  it('one dispatched enemy-in-range event calls play("warng") exactly once (fan-out cardinality)', () => {
    // NOTE: this only proves the map doesn't fan one event out to multiple
    // play() calls — it says nothing about whether core emits the event once
    // per rising edge. That ROM-edge guarantee (EIRNGE/OBJCOL fire once per
    // entry, never every frame the condition holds) is core's job and is
    // pinned with a real stepGame drive in tests/core/events.test.ts and
    // tests/core/radar-sweep.test.ts (review round 2).
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'enemy-in-range' }])
    expect(r.calls.filter((c) => c === 'play:warng')).toHaveLength(1)
  })

  it('a bundled frame dispatches every new cue in core order, nothing dropped', () => {
    const r = recorder()
    playEventSounds(r.audio, [
      { type: 'shot-fired' },
      { type: 'enemy-in-range' },
      { type: 'motion-blocked' },
      { type: 'radar-blip' },
      { type: 'bonus-tank' },
    ])
    expect(r.calls).toEqual(['play:cannon', 'play:warng', 'play:boing', 'play:rbeep', 'play:boner'])
  })
})

// ── the saucer-kill DISINT layer, at the ROM's priority (U-014) ──────────────
describe('bz3-10 — DISINT layers over the saucer kill, and ONLY the saucer', () => {
  it('a saucer kill plays BOTH the explosion and the DISINT zap (BZONE.MAC:2485-2489)', () => {
    // The ROM fires DISINT via SNDON, THEN sets EXPCNT=0A0 for the big explosion
    // — two layered sounds. The clone today plays only the generic explosion.
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'enemy-destroyed', kind: 'saucer' }])
    expect(r.calls, 'the base explosion layer is kept').toContain('play:explosion')
    expect(r.calls, 'the DISINT zap layer is ADDED (this is the U-014 fix)').toContain('play:disint')
    expect(r.calls.filter((c) => c === 'play:explosion')).toHaveLength(1)
    expect(r.calls.filter((c) => c === 'play:disint')).toHaveLength(1)
    expect(r.calls, 'exactly the two layers, nothing else').toHaveLength(2)
  })

  it.each(['tank', 'super-tank', 'missile'])(
    'a %s kill plays the explosion ALONE — no DISINT (saucer and tank deaths must differ)',
    (kind) => {
      const r = recorder()
      playEventSounds(r.audio, [{ type: 'enemy-destroyed', kind }])
      expect(r.calls).toEqual(['play:explosion'])
      expect(r.calls, 'DISINT is the saucer-only distinction the ROM drew').not.toContain('play:disint')
    },
  )
})

// ── end-to-end keystone: the REAL sim emits, the dispatch fires (honesty check) ──
// A dead event that is wired to a cue but never emitted by core would pass the
// map tests above while doing nothing in-game. This stages a genuine saucer kill
// that crosses the 15,000-point bonus threshold and drives the REAL stepGame
// output through playEventSounds — proving core actually emits `bonus-tank` and
// the saucer-kill DISINT layer, together, on one step.
describe('bz3-10 — a real saucer kill crossing the bonus threshold, end to end', () => {
  const FAR = 60_000 // far from the boot hostile near the origin — no interference

  /** A live run with score just under the first bonus tank and a shot dead on a
   *  live saucer. dt=0: the mutual kill is position-based and dt-INDEPENDENT
   *  (saucer.ts:139-140), so nothing drifts and the kill is deterministic. */
  function saucerKillCrossing(): GameState {
    const base = stepGame(initGame(7), { ...NO_INPUT, start: true }, 1 / 60)
    const staged: GameState = {
      ...base,
      mode: 'playing',
      score: 14_000, // + 5000 saucer kill = 19_000, crossing 15_000
      playerShell: { x: FAR, z: FAR, heading: 0, range: 0 },
      saucer: {
        ...base.saucer,
        saucer: { x: FAR, z: FAR, heading: 0, phase: 'alive', phaseAge: 0 },
      },
      // Neutralise the hostile so it neither eats the shell nor hits the player.
      enemies: {
        ...base.enemies,
        hostile: { ...base.enemies.hostile, phase: 'exploding' },
        shell: null,
      },
    }
    return stepGame(staged, NO_INPUT, 0)
  }

  it('core emits the saucer kill AND the bonus-tank award on that step', () => {
    const stepped = saucerKillCrossing()
    const killedSaucer = stepped.events.some((e) => e.type === 'enemy-destroyed' && e.kind === 'saucer')
    expect(killedSaucer, 'staging: the saucer must actually die this step').toBe(true)
    // The bonus-tank event is the missing core emission (U-012's audio half).
    const types = stepped.events.map((e) => e.type as string)
    expect(types, 'crossing 15,000 must emit a bonus-tank moment for BONER').toContain('bonus-tank')
  })

  it('that one step fires explosion + DISINT + BONER through the dispatch', () => {
    const stepped = saucerKillCrossing()
    const r = recorder()
    playEventSounds(r.audio, stepped.events)
    expect(r.calls, 'the saucer blast').toContain('play:explosion')
    expect(r.calls, 'the DISINT zap layer (U-014)').toContain('play:disint')
    expect(r.calls, 'the bonus-tank bell (U-012)').toContain('play:boner')
  })
})
