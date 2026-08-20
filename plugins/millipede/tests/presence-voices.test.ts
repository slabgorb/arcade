// tests/presence-voices.test.ts
//
// Story ml7-8 (AC1) — the per-creature PRESENCE voices. ml6-2 emits only the
// march loop (CHAN1) and the shared explosion/shot/etc. one-shots; the seven
// creatures each own a CHAN sound slot (EFFECT_NAMES: spider/bee/beetle/
// dragonfly/mosquito/earwig/inchworm) that is DECLARED but never emitted. This
// suite pins the sustained per-creature voice as a `-start`/`-stop` loop pair on
// the same edge-signalled model the march already uses (core/events.ts), maps
// each to its own CHAN slot (shell/audio.ts EVENT_SOUND), and — the liveness
// anchor (a green data test proves nothing if the sim never fires the edge) —
// asserts stepGame emits the start edge when a creature first becomes live and
// the stop edge when the last one dies/exits.
//
// RED until ml7-8 wires the presence voices. Today: the events do not exist, the
// EVENT_SOUND map has no per-creature entries, and the sim emits neither edge.

import { describe, it, expect } from 'vitest'
import { EVENT_KINDS, isLoopStart, isLoopStop, loopVoiceOf } from '../src/core/events'
import type { GameEventKind } from '../src/core/events'
import { EVENT_SOUND } from '../src/shell/audio'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'
import { BODY_COLOR, type Segment } from '../src/core/millipede'
import { BEETLE_COLOR, BEETLE_PIC } from '../src/core/beetle'
import { PLYFLD_SIZE } from '../src/core/conway'

// The seven creatures, each named EXACTLY as its CHAN sound slot (EFFECT_NAMES).
// The presence voice roots the sim edge-signals as `${root}-start`/`${root}-stop`.
const CREATURES = [
  'spider',
  'bee',
  'beetle',
  'dragonfly',
  'mosquito',
  'earwig',
  'inchworm',
] as const

describe('ml7-8 AC1 — presence voice vocabulary (core/events.ts)', () => {
  it('declares a balanced -start/-stop pair for every creature', () => {
    for (const c of CREATURES) {
      expect(EVENT_KINDS, `${c}-start missing`).toContain(`${c}-start` as GameEventKind)
      expect(EVENT_KINDS, `${c}-stop missing`).toContain(`${c}-stop` as GameEventKind)
    }
  })

  it('every -start/-stop across the vocabulary is still a matched pair (march invariant holds)', () => {
    const starts = EVENT_KINDS.filter((k) => k.endsWith('-start'))
    const stops = EVENT_KINDS.filter((k) => k.endsWith('-stop'))
    expect(starts.length).toBe(stops.length)
    for (const s of starts) expect(EVENT_KINDS).toContain(s.replace(/-start$/, '-stop'))
    for (const s of stops) expect(EVENT_KINDS).toContain(s.replace(/-stop$/, '-start'))
  })

  it('classifies each creature edge as a loop voice rooted at the creature name', () => {
    for (const c of CREATURES) {
      expect(isLoopStart(`${c}-start` as GameEventKind), `${c}-start`).toBe(true)
      expect(isLoopStop(`${c}-stop` as GameEventKind), `${c}-stop`).toBe(true)
      expect(loopVoiceOf(`${c}-start` as GameEventKind)).toBe(c)
      expect(loopVoiceOf(`${c}-stop` as GameEventKind)).toBe(c)
    }
  })
})

describe('ml7-8 AC1 — presence voice → CHAN slot mapping (shell/audio.ts)', () => {
  it('maps each creature start AND stop edge to that creature’s own CHAN slot', () => {
    for (const c of CREATURES) {
      // both edges drive the SAME cue (the shell turns the loop on/off), and that
      // cue is the creature's own EFFECT_NAMES slot — spider→'spider', etc.
      expect(EVENT_SOUND[`${c}-start` as GameEventKind], `${c}-start slot`).toBe(c)
      expect(EVENT_SOUND[`${c}-stop` as GameEventKind], `${c}-stop slot`).toBe(c)
    }
  })
})

describe('ml7-8 AC1 — the sim edge-signals presence (observed in play, not just declared)', () => {
  const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }
  const kinds = (g: GameState): GameEventKind[] => g.events.map((e) => e.type)

  /** A single live body segment planted far from the player so it neither dies
   *  to a stray shot nor kills the player — it just keeps the phase in `play`
   *  (DEAD≠0, so the BEETL gate can open). */
  const keeperSegment = (): Segment => ({
    h: 0xc0, v: 0xd0, dh: 0, dv: 0, pic: 0, color: BODY_COLOR,
  })

  it('emits beetle-start on the vacant→live edge (a beetle appears)', () => {
    // Prev frame: NO beetle live (a fresh play state's band is all vacant). This
    // frame the BEETL gate opens: frame 0x37 + score2 0 fires beetleSpawnTick, a
    // live keeper segment (DEAD≠0) and the CENTIN wave-length register 1 (<12, so
    // NOT "CENTIPEDE IS FULL", BT-12) pass the remaining gates, so stepBeetles spawns
    // one — the rising edge the sim must voice as beetle-start. The gate reads
    // `X,CENTIN` (the walked register, pt1-2), not the live segment count, so set it.
    const prev = createGame(0x1982, { phase: 'play' })
    const armed: GameState = {
      ...prev,
      frame: 0x37,
      field: new Uint8Array(PLYFLD_SIZE), // clear field so a stray shot can't confound
      segments: [keeperSegment()],
      centin: 1, // CENTIN register < 12 — beetles allowed (was implicitly the live count)
      player: { ...prev.player, h: 0x40, v: 0x30, alive: true },
      shot: { active: false, h: 0, v: 0 },
    }
    const after = stepGame(armed, idle)
    const beetleNowLive = after.roster.beetles.some((b) => b.color !== 0)
    // Guard: the scenario must actually spawn a beetle, or the assertion is vacuous.
    expect(beetleNowLive, 'scenario failed to spawn a beetle — test would be vacuous').toBe(true)
    expect(kinds(after), 'a beetle became live but no beetle-start emitted').toContain(
      'beetle-start' as GameEventKind,
    )
  })

  it('emits beetle-stop on the live→vacant edge (the last beetle exits the field)', () => {
    // A single beetle is live at the left edge (h 0xFF) walking off-screen (dh 1 →
    // h 0x00 = BEETL offscreen, which clears the slot). The player sits far away,
    // so the only roster change is the beetle vacating — the falling edge the sim
    // must voice as beetle-stop. No shot, no player-death: nothing else moves.
    const g = createGame(0x1982, { phase: 'play' })
    const beetles = g.roster.beetles.map((b) => ({ ...b }))
    beetles[0] = { color: BEETLE_COLOR, pic: BEETLE_PIC, v: 0x48, h: 0xff, dv: 0, dh: 1, timer: 0x0c }
    const armed: GameState = {
      ...g,
      frame: 1, // odd → beetleSpawnTick false, so no NEW beetle masks the exit
      field: new Uint8Array(PLYFLD_SIZE),
      segments: [keeperSegment()],
      roster: { ...g.roster, beetles },
      player: { ...g.player, h: 0x40, v: 0x30, alive: true },
      shot: { active: false, h: 0, v: 0 },
    }
    const after = stepGame(armed, idle)
    const beetleStillLive = after.roster.beetles.some((x) => x.color !== 0)
    expect(beetleStillLive, 'scenario failed to vacate the beetle — test would be vacuous').toBe(false)
    expect(kinds(after), 'the last beetle left the field but no beetle-stop emitted').toContain(
      'beetle-stop' as GameEventKind,
    )
  })
})
