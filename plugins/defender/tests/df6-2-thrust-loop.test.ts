// tests/df6-2-thrust-loop.test.ts
//
// Story df6-2 — RED phase (O'Brien / TEA). AC1 + AC4 (thrust half): the THRUST is a
// HELD LOOP, and the core does not have it yet. df6-1 shipped only single-shot cues;
// thrust is the first cue with STATE — a sound that STARTS on the press edge, RINGS
// while held, and STOPS on the release edge. The core sees `input.thrust` every tick
// but never the on->off / off->on EDGE (the jt5-3 flap analog), so this story adds a
// held/released edge detector on the sim state and two new kinds — `thrust-start`,
// `thrust-stop` — routed through @shared/audio's LOOP seam (startLoop/stopLoop), not
// its one-shot play().
//
// ─── THE ROM LAW, READ OFF SNDSEQ AND NOT OFF A TABLE ────────────────────────────
// Thrust has NO SOUND-TABLE FCB row: it is a THFLG side-path inside the sound driver.
// SNDSEQ reads the PIA21 thrust bit each pass and drives THFLG ("THRUST SOUND FLAG"):
//
//   SNDS00 LDA  PIA21   THRUST ON?        (DEFA7.SRC:737)
//          BITA #2                        (:738)
//          BNE  SNDS01  YES               (:739)         held? -> SNDS01
//          LDA  THFLG   NO,ACTIVE?        (:740)
//          BEQ  SNDSX   NO                (:741)         released & already off -> nothing
//          CLR  THFLG   YES,TURN IT OFF   (:742)         RELEASE edge: THFLG := 0
//          LDB  #$0F                      (:743)                        sound := $0F (off)
//   SNDS01 LDA  THFLG   THRUST ALREADY ON?(:745)
//          BNE  SNDSX   YIP...            (:746)         held & already on -> NOTHING (not re-hit)
//          ...
//          LDB  #$16    NO HIT IT         (:750)         PRESS edge: sound := $16 (on)
//          STB  THFLG                     (:751)                     THFLG := $16
//
// So the machine keys the sound on the TRANSITION of THFLG, and a HELD button hits
// `BNE SNDSX` (:746) — the reason holding thrust does not machine-gun the cue. That is
// exactly the edge this story ports: press = loop-on, release = loop-off, hold = silent.
//
// ─── WHY THESE ASSERTIONS ARE THE SHAPE THEY ARE ─────────────────────────────────
// The four wing kinds jt5-3 added were still ONE-SHOTS (joust never loops); Defender's
// thrust is a genuine LOOP, so the dispatch group below asserts startLoop/stopLoop, not
// play. The emission groups stage an input sequence and assert the cue lands on the
// EXACT tick of the edge, with the tick before it clean and a non-vacuity guard first —
// a `toContain` on a stream that never reached the edge passes for the wrong reason.
//
// RED today: `EVENT_KINDS` has no `thrust-start`/`thrust-stop`, the dispatch has no loop
// cases, and `CUE_SOURCES` has no thrust provenance. The kinds are reached through
// `string` widening so the RED tree still type-checks (`npm run lint`) — the failures
// are runtime assertions, not compile errors.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { EVENT_KINDS, type GameEvent } from '../src/core/events.js'
import { CUE_SOURCES } from '../src/shell/audio.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'

// ─── the vendored 1981 tree (fail loud, never skip silent — the df6-1 presence rule) ──
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)

/** Read a 1-based line from the vendored tree. Only ever called inside an `it()`. */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  const line = readFileSync(p, 'latin1').split('\n')[n - 1]
  if (line === undefined) throw new Error(`${file} has no line ${n}`)
  return line
}

// ─── the two kinds this story adds (not in the shipped union yet — widened to string) ──
const THRUST_START = 'thrust-start'
const THRUST_STOP = 'thrust-stop'
const THRUST_KINDS: readonly string[] = [THRUST_START, THRUST_STOP]

const kindsTuple = EVENT_KINDS as readonly string[]
const cueSources = CUE_SOURCES as unknown as Readonly<Record<string, { kind: string } | undefined>>
const asEvent = (type: string): GameEvent => ({ type }) as unknown as GameEvent

// ─── driving the sim ──────────────────────────────────────────────────────────────
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

/** The df3-6/df6-1 deterministic byte source (LCG) — no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

/** This tick's cues, filtered to the two thrust kinds (the field is otherwise noisy). */
const thrustCues = (s: SimState): string[] => s.cues.map((c) => c.type as string).filter((k) => THRUST_KINDS.includes(k))

/** A fresh sim, one opening tick spent (spawns wave 1); thrust false throughout the open. */
function opened(seed: number): SimState {
  return stepSim(createSim(makeRand(seed)), NEUTRAL)
}

// ═══════════════════════════════════════════════════════════════════════════════════
// The ROM law re-opens, byte for byte (the ground truth every group below rests on)
// ═══════════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('df6-2 — the thrust-sound law re-opens in the 1981 source', () => {
  it('THFLG is the THRUST SOUND FLAG (PHR6.SRC:293) — a held state, not a table row', () => {
    expect(vendoredLine('PHR6.SRC', 293)).toBe('THFLG\tRMB\t1\tTHRUST SOUND FLAG')
  })

  it('SNDSEQ keys the sound on the PIA21 thrust bit (DEFA7.SRC:737-739)', () => {
    expect(vendoredLine('DEFA7.SRC', 737)).toBe('SNDS00\tLDA\tPIA21\tTHRUST ON?')
    expect(vendoredLine('DEFA7.SRC', 738)).toBe('\tBITA\t#2')
    expect(vendoredLine('DEFA7.SRC', 739)).toBe('\tBNE\tSNDS01\tYES')
  })

  it('the PRESS edge sets THFLG := $16 (DEFA7.SRC:750-751) — loop ON', () => {
    expect(vendoredLine('DEFA7.SRC', 750)).toBe('\tLDB\t#$16\tNO HIT IT')
    expect(vendoredLine('DEFA7.SRC', 751)).toBe('\tSTB\tTHFLG')
  })

  it('the RELEASE edge clears THFLG and sounds $0F (DEFA7.SRC:742-743) — loop OFF', () => {
    expect(vendoredLine('DEFA7.SRC', 742)).toBe('\tCLR\tTHFLG\tYES,TURN IT OFF')
    expect(vendoredLine('DEFA7.SRC', 743)).toBe('\tLDB\t#$0F')
  })

  it('a HELD button hits `BNE SNDSX` (:745-746) — which is why holding does not re-hit', () => {
    expect(vendoredLine('DEFA7.SRC', 745)).toBe('SNDS01\tLDA\tTHFLG\tTHRUST ALREADY ON?')
    expect(vendoredLine('DEFA7.SRC', 746)).toBe('\tBNE\tSNDSX\tYIP...')
  })

  it('the re-opens are DISCRIMINATING — the $16 line is not the $0F line', () => {
    expect(vendoredLine('DEFA7.SRC', 750)).not.toBe(vendoredLine('DEFA7.SRC', 743))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 — DECLARATION. Necessary, and (the jt5-1 Hazard C) nowhere near sufficient.
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC1 — the two thrust kinds join the core union', () => {
  it('EVENT_KINDS names thrust-start and thrust-stop', () => {
    expect(kindsTuple.length, 'precondition: the tuple is not empty').toBeGreaterThan(0)
    for (const kind of THRUST_KINDS) {
      expect(kindsTuple, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
    }
  })

  it('the two are DISTINCT, and the df6-1 one-shot kinds all survive — this story ADDS', () => {
    expect(new Set(THRUST_KINDS.filter((k) => kindsTuple.includes(k))).size).toBe(2)
    expect(new Set(kindsTuple).size, 'no duplicates anywhere in the tuple').toBe(kindsTuple.length)
    for (const kind of ['laser-fire', 'smart-bomb', 'player-death', 'lander-pickup', 'wave-start']) {
      expect(kindsTuple, `df6-1's '${kind}' was dropped`).toContain(kind)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 — the dispatch routes the two edges through the LOOP seam, never play()
// ═══════════════════════════════════════════════════════════════════════════════════

/** A recording fake with all three verbs — Defender's dispatch now loops (df6-2). */
function loopRecorder(): {
  sink: Parameters<typeof playEventSounds>[0]
  played: string[]
  loopsOn: string[]
  loopsOff: string[]
} {
  const played: string[] = []
  const loopsOn: string[] = []
  const loopsOff: string[] = []
  const rec = {
    play: (name: string): void => void played.push(name),
    startLoop: (name: string): void => void loopsOn.push(name),
    stopLoop: (name: string): void => void loopsOff.push(name),
  }
  return { sink: rec as unknown as Parameters<typeof playEventSounds>[0], played, loopsOn, loopsOff }
}

describe('df6-2 AC1 — thrust-start starts a loop, thrust-stop stops it, neither is a play()', () => {
  it('thrust-start routes to startLoop("thrust") and does NOT play a one-shot', () => {
    const { sink, played, loopsOn } = loopRecorder()
    playEventSounds(sink, [asEvent(THRUST_START)])
    expect(loopsOn, 'the press edge must START the thrust loop').toEqual(['thrust'])
    expect(played, 'the thrust loop must not be a one-shot play()').toEqual([])
  })

  it('thrust-stop routes to stopLoop("thrust") and does NOT play a one-shot', () => {
    const { sink, played, loopsOff } = loopRecorder()
    playEventSounds(sink, [asEvent(THRUST_STOP)])
    expect(loopsOff, 'the release edge must STOP the thrust loop').toEqual(['thrust'])
    expect(played, 'the release edge is a stopLoop, never a play()').toEqual([])
  })

  it('a start/stop pair over the same channel loops on then off, in order', () => {
    const { sink, loopsOn, loopsOff } = loopRecorder()
    playEventSounds(sink, [asEvent(THRUST_START), asEvent(THRUST_STOP)])
    expect(loopsOn).toEqual(['thrust'])
    expect(loopsOff).toEqual(['thrust'])
  })

  it('the df6-1 one-shots still play() — the router did not break them', () => {
    const { sink, played, loopsOn, loopsOff } = loopRecorder()
    playEventSounds(sink, [asEvent('laser-fire'), asEvent('player-death')])
    expect(played, 'a one-shot cue must still reach play()').toEqual(['laserFire', 'playerDeath'])
    expect([...loopsOn, ...loopsOff], 'a one-shot must not touch the loop seam').toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 / AC4 — EMISSION: the edge lands on the exact tick; holding is silent
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC1 — press sounds START, release sounds STOP, and holding is silent', () => {
  const SCRIPT: readonly { input: Input; expect: string[]; why: string }[] = [
    { input: NEUTRAL, expect: [], why: 'thrust has never been pressed' },
    { input: withInput({ thrust: true }), expect: [THRUST_START], why: 'PRESS — off->on edge, THFLG := $16' },
    { input: withInput({ thrust: true }), expect: [], why: 'HELD — SNDS01 BNE SNDSX, the cue is not re-hit' },
    { input: withInput({ thrust: true }), expect: [], why: 'still HELD — a loop is not re-ticked per frame' },
    { input: NEUTRAL, expect: [THRUST_STOP], why: 'RELEASE — on->off edge, CLR THFLG' },
    { input: NEUTRAL, expect: [], why: 'still released — SNDSX, nothing to turn off' },
    { input: withInput({ thrust: true }), expect: [THRUST_START], why: 'PRESS again' },
    { input: NEUTRAL, expect: [THRUST_STOP], why: 'RELEASE on the very next tick' },
  ]

  it('the whole press/hold/release sequence lands tick for tick', () => {
    let s = opened(3)
    const seen: string[][] = []
    for (const step of SCRIPT) {
      s = stepSim(s, step.input)
      seen.push(thrustCues(s))
    }
    // NON-VACUITY first: an always-empty stream satisfies half the rows below.
    expect(seen.flat().length, 'the window emitted NO thrust cue — every row below is vacuous').toBeGreaterThan(0)
    seen.forEach((got, i) => expect(got, `tick ${i}: ${SCRIPT[i].why}`).toEqual(SCRIPT[i].expect))
  })

  it('holding thrust for a LONG time sounds START once — the level is not re-read as an edge', () => {
    let s = opened(3)
    s = stepSim(s, withInput({ thrust: true }))
    expect(thrustCues(s), 'precondition: the press really started the loop').toEqual([THRUST_START])

    const after: string[] = []
    for (let i = 0; i < 40; i++) {
      s = stepSim(s, withInput({ thrust: true }))
      after.push(...thrustCues(s))
    }
    expect(after, 'forty held ticks after the press emit no further thrust cue').toEqual([])
  })

  it('a thrust cue does NOT survive into the next tick — the stream is REBUILT per tick (Decision C)', () => {
    let s = opened(3)
    s = stepSim(s, withInput({ thrust: true }))
    expect(thrustCues(s), 'precondition: the press sounded').toEqual([THRUST_START])
    s = stepSim(s, withInput({ thrust: true }))
    expect(thrustCues(s), "'thrust-start' survived a tick with no edge — a stale carry-forward").toEqual([])
  })

  it('a run that never thrusts is silent of both thrust cues (the control)', () => {
    let s = opened(3)
    const all: string[] = []
    for (let i = 0; i < 60; i++) {
      s = stepSim(s, NEUTRAL)
      all.push(...thrustCues(s))
    }
    expect(all, 'no thrust input can produce no thrust cue').toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 / AC3 / AC4 — the edge memory lives ON THE STATE, not in a module `let`
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC1 — the previous thrust level is carried per-sim, not globally', () => {
  it('two sims in flight do not share a thrust edge memory', () => {
    // A module-scoped `let prevThrust` is global: interleaving two games makes each
    // see the other's button. Held A + idle B: only A sounds, and A does not re-fire.
    let held = opened(3)
    let free = opened(7)
    held = stepSim(held, withInput({ thrust: true }))
    free = stepSim(free, NEUTRAL)
    expect(thrustCues(held), 'precondition: only the first sim pressed').toEqual([THRUST_START])
    expect(thrustCues(free), 'the second sim never pressed — it must be silent').toEqual([])

    for (let i = 0; i < 4; i++) {
      held = stepSim(held, withInput({ thrust: true }))
      free = stepSim(free, NEUTRAL)
      expect(thrustCues(held), `held sim, extra tick ${i}: a held button re-fires nothing`).toEqual([])
      expect(thrustCues(free), `idle sim, extra tick ${i}`).toEqual([])
    }

    expect(thrustCues(stepSim(held, NEUTRAL)), 'the first sim releases — STOP').toEqual([THRUST_STOP])
    expect(thrustCues(stepSim(free, withInput({ thrust: true }))), 'the second sim presses — its own START').toEqual([
      THRUST_START,
    ])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 / AC4 — the thrust cue is CITED to the ROM (no un-cited src/core constant)
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC1 — thrust provenance: THFLG / SNDSEQ, not an invention', () => {
  it('CUE_SOURCES carries a thrust entry and it is ROM-cited, never fabricated', () => {
    const src = cueSources['thrust']
    expect(src, "CUE_SOURCES has no 'thrust' — the loop cue must carry its provenance").toBeTruthy()
    expect(src?.kind, "the thrust cue is a real THFLG side-path, not an 'invention'").not.toBe('invention')
  })
})
