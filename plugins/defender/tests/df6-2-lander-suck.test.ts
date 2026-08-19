// tests/df6-2-lander-suck.test.ts
//
// Story df6-2 — RED phase (O'Brien / TEA). AC2 + AC4 (lander-suck half): the LANDER
// SUCK is a sustained REPEAT cue tied to the df4-3 abduction state — the second cue
// with STATE the single-shot path could not express. It STARTS when a lander begins
// carrying a humanoid upward and STOPS when the carry ends: the humanoid is grabbed to
// the top, or the carrier is killed (dropping its passenger). Routed through
// @shared/audio's LOOP seam (startLoop/stopLoop) on the abduction edge, like thrust.
//
// ─── THE ROM CUE, AND THE DESIGN DEVIATION THIS STORY MAKES (both cited) ──────────
//   LSKSND FCB $C8,$0A,$01,$0E,0 LANDER SUCK   (DEFA7.SRC:684)  REPCNT = $0A ($C8 pri)
// The machine plays LSKSND at LANDFX (DEFB6.SRC:803 `LDD #LSKSND` / :804 `JSR SNDLD`),
// reached by `CMPA #YMIN+8 / BLS LANDFX` (:798-799) — i.e. at the TOP, the instant the
// carrying lander pulls the humanoid inside to transform it. That is a single trigger of
// a table that internally repeats $0A times. df6-2 sounds this REPEAT cue as a HELD LOOP
// across the whole abduction ASCENT (start at grab-lift, stop at top/drop) rather than a
// one-shot at the pull-inside instant — the only multi-tick "abduction in progress" state
// the core has, and the way a tractor beam reads to the ear. It is a logged Design
// Deviation, with precedent (audio.ts's ST1SND wave-start deviation), and the cue's
// provenance records the true call site (LANDFX, the top) so nothing is confabulated.
//
// ─── THE ABDUCTION STATE, from the df4-3 core ────────────────────────────────────
// A lander grabs at the bottom (`carrying := true`, phase `carry`), rises `CARRY_STEP`
// per tick, and at `y <= LANDER_TOP_Y` latches `reachedTop := true` (phase `done`) and
// consumes the humanoid. Killing a carrier drops its passenger and clears `carrying`.
// So "carrying a humanoid upward" is exactly `alive && carrying && !reachedTop`, and its
// three exits (top, carrier-killed, passenger-lost) all clear it — the held state the
// loop edges on. There is ONE sound voice, so the loop is AGGREGATE: it rings while ANY
// lander is in that state and stops only when the LAST one leaves it.
//
// Written RED (no `lander-suck-start`/`-stop` kinds, no loop dispatch, no LSKSND
// provenance existed); GREEN now lands them. The `string` widening on kinds survives.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { EVENT_KINDS, type GameEvent } from '../src/core/events.js'
import { CUE_SOURCES } from '../src/shell/audio.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import { loadClaims, coveredBy, type ProseCitation } from './audit/dossier-sweep'

// ─── the vendored 1981 tree (fail loud, never skip silent) ──────────────────────────
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRoot =
  process.env.DEFENDER_SOURCE_DIR ?? join(pluginRoot, '..', '..', 'reference', 'original-source', 'defender')
const vendoredAvailable = existsSync(vendoredRoot)
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  const line = readFileSync(p, 'latin1').split('\n')[n - 1]
  if (line === undefined) throw new Error(`${file} has no line ${n}`)
  return line
}

// ─── the two kinds this story adds (kept as `string` so the degrade path can feed them) ──
const SUCK_START = 'lander-suck-start'
const SUCK_STOP = 'lander-suck-stop'
const SUCK_KINDS: readonly string[] = [SUCK_START, SUCK_STOP]

const kindsTuple = EVENT_KINDS as readonly string[]
// CUE_SOURCES is read directly now (`landerSuck` is a real SoundName). `asEvent` keeps its
// widening deliberately — the loop-routing tests feed kinds through the shipped dispatch.
const asEvent = (type: string): GameEvent => ({ type }) as unknown as GameEvent
const claims = loadClaims()
const defa7 = (line: number): ProseCitation => ({
  file: 'DEFA7.SRC',
  start: line,
  end: line,
  raw: `defender/DEFA7.SRC:${line}`,
  from: 'df6-2-lander-suck.test.ts',
})

// ─── the rig: the sim's own bank spawners + kill paths, typed (the df6-1 shape) ─────
interface RigHumanoid {
  x: number
  y: number
  alive: boolean
  state: string
}
interface RigLander {
  x: number
  y: number
  alive: boolean
  carrying: boolean
  reachedTop: boolean
  phase: string
  target: RigHumanoid | null
}
interface Rig {
  _enemyBank: {
    landers: RigLander[]
    humanoids: RigHumanoid[]
    spawnLander: (x: number) => RigLander | null
    spawnHumanoid: (x: number, y: number) => RigHumanoid | null
    killLander: (l: RigLander) => void
  }
}
const rig = (s: SimState): Rig => s as unknown as Rig

// LANDER_TOP_Y = YMIN + 8 = 50 (world.ts). A carrier well below it has room to ascend.
const TOP_Y = 50

// ─── driving the sim ────────────────────────────────────────────────────────────────
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}
const suckCues = (s: SimState): string[] => s.cues.map((c) => c.type as string).filter((k) => SUCK_KINDS.includes(k))
function opened(seed: number): SimState {
  return stepSim(createSim(makeRand(seed)), NEUTRAL)
}

/** Put `lander` into the carrying-ascent state at row `y`, riding a live grabbed astro. */
function stageCarry(r: Rig, x: number, y: number): RigLander {
  const l = r._enemyBank.spawnLander(x)
  if (!l) throw new Error('staging: spawnLander returned null')
  const h = r._enemyBank.spawnHumanoid(x, y)
  if (!h) throw new Error('staging: spawnHumanoid returned null')
  h.state = 'grabbed'
  h.x = x
  h.y = y
  l.carrying = true
  l.reachedTop = false
  l.phase = 'carry'
  l.target = h
  l.x = x
  l.y = y
  return l
}

// ═══════════════════════════════════════════════════════════════════════════════════
// The ROM cue re-opens, byte for byte (the ground truth, incl. the true call site)
// ═══════════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('df6-2 — the LANDER SUCK cue re-opens in the 1981 source', () => {
  it('LSKSND is a REPEAT cue, REPCNT=$0A (DEFA7.SRC:684)', () => {
    expect(vendoredLine('DEFA7.SRC', 684)).toBe('LSKSND\tFCB\t$C8,$0A,$01,$0E,0 LANDER SUCK')
  })

  it('the ROM plays it at LANDFX — the TOP, the pull-inside (DEFB6.SRC:798-804)', () => {
    // The Design Deviation is honest only if the true call site re-opens: the machine
    // reaches LSKSND on `BLS LANDFX` (top), not during the ascent.
    expect(vendoredLine('DEFB6.SRC', 798)).toBe('\tCMPA\t#YMIN+8')
    expect(vendoredLine('DEFB6.SRC', 799)).toBe('\tBLS\tLANDFX\tALL DONE')
    expect(vendoredLine('DEFB6.SRC', 803)).toBe('LANDFX\tLDD\t#LSKSND')
    expect(vendoredLine('DEFB6.SRC', 804)).toBe('\tJSR\tSNDLD')
  })

  it('the re-open is DISCRIMINATING — LSKSND is not its LPKSND neighbour', () => {
    expect(vendoredLine('DEFA7.SRC', 684)).not.toBe(vendoredLine('DEFA7.SRC', 683))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC2 — DECLARATION + the dispatch routes both edges through the LOOP seam
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC2 — the two lander-suck kinds join the core union', () => {
  it('EVENT_KINDS names lander-suck-start and lander-suck-stop, distinctly', () => {
    for (const kind of SUCK_KINDS) expect(kindsTuple, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
    expect(new Set(SUCK_KINDS.filter((k) => kindsTuple.includes(k))).size).toBe(2)
    expect(kindsTuple, 'the df6-1 one-shot pickup survives — this story ADDS').toContain('lander-pickup')
  })
})

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
  return { sink: rec, played, loopsOn, loopsOff }
}

describe('df6-2 AC2 — suck-start starts the loop, suck-stop stops it, neither is a play()', () => {
  it('lander-suck-start routes to startLoop("landerSuck") and does NOT play a one-shot', () => {
    const { sink, played, loopsOn } = loopRecorder()
    playEventSounds(sink, [asEvent(SUCK_START)])
    expect(loopsOn, 'the abduction start must START the suck loop').toEqual(['landerSuck'])
    expect(played, 'the suck loop must not be a one-shot play()').toEqual([])
  })

  it('lander-suck-stop routes to stopLoop("landerSuck") and does NOT play a one-shot', () => {
    const { sink, played, loopsOff } = loopRecorder()
    playEventSounds(sink, [asEvent(SUCK_STOP)])
    expect(loopsOff, 'the carry ending must STOP the suck loop').toEqual(['landerSuck'])
    expect(played).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC2 / AC4 — EMISSION: start on the carry edge, stop when the carry ends
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC2 — the abduction sounds a loop that starts at lift and stops at the top', () => {
  it('a lander entering the carry state emits ONE suck-start, then holds silent while it rises', () => {
    let s = opened(3)
    const r = rig(s)
    stageCarry(r, 0x4000, 150) // far below the top — many ticks of ascent
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'the carry edge must start the suck loop exactly once').toEqual([SUCK_START])

    const held: string[] = []
    for (let i = 0; i < 20; i++) {
      s = stepSim(s, NEUTRAL)
      held.push(...suckCues(s))
    }
    expect(held, 'a rising carrier re-starts nothing — the loop is not re-ticked per frame').toEqual([])
  })

  it('reaching the top (the real carry branch, not a forced flag) emits suck-stop', () => {
    let s = opened(3)
    const l = stageCarry(rig(s), 0x4000, TOP_Y + 8) // four ticks (CARRY_STEP=2) from the top
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'precondition: the loop started').toEqual([SUCK_START])

    const stream: string[][] = []
    for (let i = 0; i < 8; i++) {
      s = stepSim(s, NEUTRAL)
      stream.push(suckCues(s))
    }
    // NON-VACUITY: something must have sounded across the ascent-to-top window.
    expect(stream.flat().length, 'nothing sounded — the stop assertion would be vacuous').toBeGreaterThan(0)
    expect(stream.flat(), 'reaching the top ends the carry — exactly one stop, no second start').toEqual([SUCK_STOP])
    expect(l.reachedTop, 'precondition: the carrier really reached the top via the real branch').toBe(true)
  })

  it('killing the carrier (dropping its passenger) emits suck-stop', () => {
    let s = opened(3)
    const l = stageCarry(rig(s), 0x4000, 150)
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'precondition: the loop started').toEqual([SUCK_START])

    rig(s)._enemyBank.killLander(l) // LKIL1 — drops the passenger into AFALL, clears carrying
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'a killed carrier ends the abduction — the loop stops').toEqual([SUCK_STOP])
  })

  it('a run with no abduction is silent of both suck cues (the control)', () => {
    let s = opened(3)
    const all: string[] = []
    for (let i = 0; i < 40; i++) {
      s = stepSim(s, NEUTRAL)
      all.push(...suckCues(s))
    }
    expect(all, 'no carry in progress can produce no suck cue').toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC2 / AC4 — ONE VOICE: the loop is aggregate, not one startLoop per lander
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC2 — two carriers share one loop voice (start once, stop only when the last ends)', () => {
  it('a second carrier does NOT re-start the loop, and it stops only when BOTH carries end', () => {
    let s = opened(3)
    const a = stageCarry(rig(s), 0x2000, 150)
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'precondition: the first carrier started the loop').toEqual([SUCK_START])

    // A second lander begins carrying while the first still is — one voice, so NO new start.
    const b = stageCarry(rig(s), 0x6000, 150)
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'a second carrier must not re-start the single suck voice').toEqual([])

    // End the first carry: the second is still carrying, so the loop must NOT stop yet.
    rig(s)._enemyBank.killLander(a)
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'the loop stops only when the LAST carrier ends — one still carries').toEqual([])

    // End the second: now the last carry is over, so the loop stops.
    rig(s)._enemyBank.killLander(b)
    s = stepSim(s, NEUTRAL)
    expect(suckCues(s), 'the last carry ending stops the loop').toEqual([SUCK_STOP])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC3 / AC4 — the suck edge memory is per-sim, not a module `let` (mirrors the thrust guard)
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC2 — the previous sucking state is carried per-sim, not globally', () => {
  it('two sims in flight do not share a suck-loop memory', () => {
    // The module-scoped-`let prevSucking` regression class, mirrored from the thrust guard
    // (df6-2-thrust-loop.test.ts): a global would let one game's abduction sound in another.
    // Stage a carrier in A only; a short window keeps each sim's own wave landers (still
    // descending from the top) from grabbing and adding noise.
    let a = opened(3)
    let b = opened(7)
    stageCarry(rig(a), 0x4000, 150)
    a = stepSim(a, NEUTRAL)
    b = stepSim(b, NEUTRAL)
    expect(suckCues(a), 'precondition: only sim A has a carrier').toEqual([SUCK_START])
    expect(suckCues(b), 'sim B has no abduction — it must stay silent').toEqual([])

    for (let i = 0; i < 4; i++) {
      a = stepSim(a, NEUTRAL)
      b = stepSim(b, NEUTRAL)
      expect(suckCues(a), `sim A, extra tick ${i}: a held carry re-starts nothing`).toEqual([])
      expect(suckCues(b), `sim B, extra tick ${i}: no carrier, no cue`).toEqual([])
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC2 / AC4 — the suck cue is CITED (LSKSND, REPCNT=$0A), and the deviation is honest
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC2 — lander-suck provenance is byte-pinned under the df1-1 gate', () => {
  it('a claims/*.json entry pins LSKSND at DEFA7.SRC:684 (REPCNT=$0A)', () => {
    expect(
      coveredBy(claims, defa7(684)),
      'add a claims/19-sound.json entry pinning DEFA7.SRC:684 (LSKSND FCB $C8,$0A,... LANDER SUCK)',
    ).toBe(true)
  })

  it('CUE_SOURCES.landerSuck cites LSKSND at $C8, and records the true LANDFX call site', () => {
    const src = CUE_SOURCES.landerSuck
    expect(src, "CUE_SOURCES has no 'landerSuck'").toBeTruthy()
    expect(src.kind, "the suck cue is a real SOUND-TABLE row, not an 'invention'").toBe('rom')
    if (src.kind !== 'rom') return
    expect(src.table, 'it must cite the LSKSND table').toBe('LSKSND')
    expect(src.priority, 'LSKSND is SNDPRI $C8 (200)').toBe(0xc8)
    expect(src.source.line, 'the FCB row is DEFA7.SRC:684').toBe(684)
    // The Design Deviation is honest ONLY if the recorded call site is the true one —
    // LANDFX (DEFB6.SRC:803), the top, even though the port sounds it across the ascent.
    expect(src.callSite.file, 'the call site must name the true DEFB6 site').toBe('DEFB6.SRC')
    expect(src.callSite.line, 'LSKSND is played at LANDFX, DEFB6.SRC:803').toBe(803)
  })
})
