// tests/demo-jt11-4.test.ts
//
// Story jt11-4 — RED phase (Han Solo / TEA). Wave enemies must MATERIALIZE ONE
// BY ONE on the pads, served by the ROM's take-a-number transporter queue —
// not spliced in as a one-frame batch.
//
// ─── WHAT THE PORT DOES TODAY (the defect) ──────────────────────────────────
// `spawnWaveEnemies` builds the whole complement and hands it back as a finished
// array. Both callers insert that array WHOLE, on ONE frame: `createWaveDemo`
// seeds `sim.processes` with it, and the wave advance splices it
// (`processes = [...processes, ...arrivals]`) while pushing one
// `enemy-materialise` cue per enemy in the same tick. Three buzzards appear in
// the same video frame.
//
// ─── WHAT THE MACHINE DOES (JOUSTRV4.SRC:5663-5724, read for this story) ────
// An enemy being created runs CREEM and then spins in CRELP:
//
//     CREEM   LDA   NESERV     ; TAKE A NUMBER TO BE SERVED BY THE TRANSPORTER
//             STA   PTIMX,U    ; the enemy holds its ticket
//             INC   NESERV
//     CRELP   PCNAP 1          ; <-- nap ONE frame, then re-test
//             LDB   PTIMX,U    ; PLEASE HAVE YOUR NUMBER READY FOR THE OPERATOR
//             …
//             LDA   NPSERV     ; ANY PLAYERS HOLDING A NUMBER?
//             CMPA  LPSERV
//             BNE   CRELP      ;  BR=YES, LET THEM FIND A TRANSPORTER 1ST
//             CMPB  LESERV     ; IS IT THIS ENEMIES TURN?
//             BNE   CRELP      ;  BR=NO, FAIL THIS GUY
//             LDX   #TRENY
//     CREALL  JSR   FREET      ; …pick a transporter that is not in use…
//     GOTTR   INC   [TCURUSE,X]
//             …
//     2$      INC   LESERV     ; ALLOW ENEMIES NEXT NUMBERED CARD (JOUSTRV4.SRC:5724)
//
// So the cadence is a QUEUE, not a burst: one enemy is served per turn, the next
// only after `INC LESERV` lets its ticket come up. That is exactly the
// `newServiceQueue`/`takeEnemyNumber`/`enemyTurn`/`serveEnemy` law already
// transcribed in transporter.ts — implemented, tested, and (until this story)
// called by nothing in production.
//
// ─── A CORRECTION THIS SUITE DELIBERATELY ENCODES ───────────────────────────
// The story text asks to gate enemy arrivals on `spawnProceeds` — "the
// empty-third deferral (JOUSTRV4.SRC:5641-5654)". Read at the source, those
// lines sit inside CREPLY, the **player** create path (reached by
// `CMPA #PLYID / BEQ CREPLY`, JOUSTRV4.SRC:5670-5671). The player picks a pad in
// a clear third; the ENEMY path never tests AREA1/AREA2/AREA3 at all — it takes
// its ticket, waits its turn behind any unserved player, then picks a
// transporter that is not in use (VRAND plus the STTR1..STTR4 fall-through,
// JOUSTRV4.SRC:5678-5709). `spawnProceeds` is a real and correctly-transcribed
// ROM law; it is simply the PLAYER's law. Gating enemy arrivals on it would
// invent a rule the machine does not have, so no test here asserts it. The
// genuine enemy-side deferral is pad occupancy (TCURUSE/STTRn,
// JOUSTRV4.SRC:5709-5710), which this port does not model yet — filed as a
// Delivery Finding, not smuggled in here.
//
// ─── THE OBSERVABLE, fix-agnostic ───────────────────────────────────────────
// Nothing below calls a scheduler directly or names a field Dev has to invent.
// The suite drives `createWaveDemo`/`stepDemo` and reads the enemies PRESENT in
// `sim.processes` per frame — the exact set `drawList` blits and `collisionPass`
// admits. A faithful serve-queue port shows the enemy count CLIMBING one at a
// time; the batch insert shows the whole complement standing on frame 0.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createWaveDemo, stepDemo, drawList, type DemoProcess, type DemoState } from '../src/core/demo.js'

// `WAVE_TABLE` wave 1 = 3 bounders, 0 pterodactyls; wave 2 = 4 bounders, 0
// pterodactyls. Both complements are pure ground enemies, so nothing here is
// entangled with jt9-59's separate PTERWV ptero schedule.
const SEED = 0x1234
const WAVE_1_ENEMIES = 3
const WAVE_2_ENEMIES = 4
/** Long enough for any sane per-turn cadence to seat a 4-enemy complement. */
const WINDOW = 400

const enemiesOf = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const entityOps = (d: DemoState): number => drawList(d).filter((op) => op.kind === 'entity').length

/** Park with the wave cleared of enemies: the next `stepDemo` clears-and-advances. */
function onTheBrinkOfWave2(seed: number): DemoState {
  const base = createWaveDemo(seed)
  return { ...base, sim: { ...base.sim, processes: base.sim.processes.filter((p) => p.kind === 'player') } }
}

interface ArrivalTimeline {
  /** Enemies present in `sim.processes` per frame, index = frames since frame 0. */
  presentCount: number[]
  /** Total entity draw ops per frame (players + whichever enemies have arrived). */
  drawOps: number[]
  /** Frame each distinct enemy id was FIRST seen, in id order. */
  firstSeen: Map<number, number>
  /** Enemy ids in the order they first appeared. */
  arrivalOrder: number[]
  /** `mat.napLeft` for each enemy on the frame it first appeared, keyed by id. */
  napLeftOnArrival: Map<number, number | undefined>
  /** `enemyType` per id, so the complement can be compared as a set. */
  typeOf: Map<number, string | undefined>
}

/**
 * Walk `frames` frames from `start`, recording what is present each frame.
 * Enemies are hushed (a huge `nap`) so they neither fly nor collide while the
 * arrival schedule plays out — the wave must stay open for the whole window,
 * exactly the fixture discipline demo-jt9-59 uses for the ptero stagger.
 */
function walkArrivals(start: DemoState, frames = WINDOW): ArrivalTimeline {
  let d = start
  const presentCount: number[] = []
  const drawOps: number[] = []
  const firstSeen = new Map<number, number>()
  const arrivalOrder: number[] = []
  const napLeftOnArrival = new Map<number, number | undefined>()
  const typeOf = new Map<number, string | undefined>()

  for (let f = 0; f < frames; f++) {
    for (const p of enemiesOf(d)) {
      if (!firstSeen.has(p.id)) {
        firstSeen.set(p.id, f)
        arrivalOrder.push(p.id)
        napLeftOnArrival.set(p.id, p.mat?.napLeft)
        typeOf.set(p.id, p.enemyType)
      }
    }
    presentCount.push(enemiesOf(d).length)
    drawOps.push(entityOps(d))
    d = {
      ...d,
      sim: {
        ...d.sim,
        processes: d.sim.processes.map((p) => (p.kind === 'enemy' ? { ...p, nap: 100_000 } : p)),
      },
    }
    d = stepDemo(d, {})
  }
  return { presentCount, drawOps, firstSeen, arrivalOrder, napLeftOnArrival, typeOf }
}

/** The distinct frames on which SOMETHING arrived — a batch insert has exactly one. */
const arrivalFrames = (t: ArrivalTimeline): number[] => [...new Set(t.firstSeen.values())].sort((a, b) => a - b)

// ─────────────────────────────────────────────────────────────────────────────
// Wave 1 — the complement `createWaveDemo` assembles
// ─────────────────────────────────────────────────────────────────────────────

describe('jt11-4 — wave 1 enters through the transporter queue, not as a frame-0 batch', () => {
  it('no ground enemy stands in the arena on frame 0 — each waits its turn to be served', () => {
    const d = createWaveDemo(SEED)
    // Today `createWaveDemo` seeds `sim.processes` with the whole complement, so
    // this reads 3. The ROM's enemy holds a ticket and naps at least one PCNAP
    // before it can be served (CRELP, JOUSTRV4.SRC:5667).
    expect(enemiesOf(d), 'a fresh wave-1 demo must not have its complement already standing').toHaveLength(0)
  })

  it('wave 1 seats all three bounders, one at a time', () => {
    const t = walkArrivals(createWaveDemo(SEED))
    expect(t.firstSeen.size, 'the wave-1 complement must still arrive in full').toBe(WAVE_1_ENEMIES)
    expect(t.presentCount[0], 'none present on frame 0').toBe(0)
    for (let f = 1; f < t.presentCount.length; f++) {
      expect(
        t.presentCount[f] - t.presentCount[f - 1],
        `at most one enemy may be served per frame (INC LESERV, JOUSTRV4.SRC:5724); jump at frame ${f}`,
      ).toBeLessThanOrEqual(1)
    }
    expect(Math.max(...t.presentCount), 'all three eventually fly').toBe(WAVE_1_ENEMIES)
    expect(
      arrivalFrames(t),
      'the three must be served on three DIFFERENT frames, not one shared batch frame',
    ).toHaveLength(WAVE_1_ENEMIES)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The wave ADVANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('jt11-4 — the wave advance queues its complement instead of splicing it whole', () => {
  it('the advance frame inserts NO enemy — the batch splice is gone', () => {
    const advanced = stepDemo(onTheBrinkOfWave2(SEED), {})
    // `processes = [...processes, ...arrivals]` puts all four of wave 2's
    // bounders in on this single frame today.
    expect(advanced.wave, 'the fixture must actually have advanced into wave 2').toBe(2)
    expect(enemiesOf(advanced), 'the advance frame must serve no enemy yet').toHaveLength(0)
  })

  it('wave 2 serves its four bounders one at a time, never two in a frame', () => {
    const t = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    expect(t.firstSeen.size, "wave 2's complement must still arrive in full").toBe(WAVE_2_ENEMIES)
    // Without this, the batch insert satisfies the per-frame delta below
    // vacuously: a complement that is ALREADY seated on frame 0 never steps.
    expect(t.presentCount[0], 'none may be seated on the advance frame itself').toBe(0)
    expect(
      arrivalFrames(t),
      'four enemies must be served on four DIFFERENT frames — a batch shares one',
    ).toHaveLength(WAVE_2_ENEMIES)
    for (let f = 1; f < t.presentCount.length; f++) {
      expect(
        t.presentCount[f] - t.presentCount[f - 1],
        `only the enemy whose ticket equals LESERV may be served (JOUSTRV4.SRC:5675-5676); jump at frame ${f}`,
      ).toBeLessThanOrEqual(1)
    }
    expect(Math.max(...t.presentCount), 'all four eventually fly').toBe(WAVE_2_ENEMIES)
  })

  it('the enemies are served in TICKET order, each on a strictly later frame than the last', () => {
    const t = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    const frames = t.arrivalOrder.map((id) => t.firstSeen.get(id) ?? -1)
    // A queue serves one number at a time: no two enemies share an arrival frame.
    for (let i = 1; i < frames.length; i++) {
      expect(
        frames[i],
        `enemy ${i} must be served on a strictly later frame than enemy ${i - 1} ` +
          `(tickets are drawn in entry order and LESERV advances one per service); frames were ${frames.join(',')}`,
      ).toBeGreaterThan(frames[i - 1])
    }
    // Tickets are drawn in `spawnWaveEnemies` entry order, and an enemy's id is
    // `0x100 * waveNumber + entry.index` — so ticket order IS ascending id order.
    // Serving out of order would mean LESERV was ignored.
    expect(t.arrivalOrder, 'enemies must be served in the order they took their numbers').toEqual(
      [...t.arrivalOrder].sort((a, b) => a - b),
    )
  })

  it('an unserved enemy is absent from the draw list too — it does not exist yet', () => {
    const t = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    // `drawList` iterates `sim.processes`, so absence from the process list is
    // absence from the screen. The op count must therefore CLIMB as the
    // complement is served, not start at its maximum.
    expect(t.drawOps[0], 'the advance frame must draw fewer entities than the seated wave does').toBeLessThan(
      Math.max(...t.drawOps),
    )
    expect(
      new Set(t.drawOps).size,
      'the drawn-entity count must actually change across the entry window',
    ).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Durability — what must NOT change while the timing moves
// ─────────────────────────────────────────────────────────────────────────────

describe('jt11-4 — only the insertion TIMING moves', () => {
  it('the same complement arrives: same ids, same types, same count as the batch built', () => {
    // The story is explicit that `enemyProcess` and the materialise effect are
    // untouched. Wave 2 is four bounders with ids 0x200 + index.
    const t = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    const ids = [...t.firstSeen.keys()].sort((a, b) => a - b)
    expect(ids, "wave 2's four enemies keep their wave-namespaced ids").toEqual([0x200, 0x201, 0x202, 0x203])
    for (const id of ids) {
      expect(t.typeOf.get(id), `enemy ${id.toString(16)} keeps its DVALUE type`).toBe('bounder')
    }
  })

  it("each enemy's materialisation window starts on ITS OWN arrival frame, not the wave's", () => {
    // The trap jt9-45 fell into and jt9-59 fixed for pteros: creating everything
    // up front and merely DELAYING it. If Dev pre-creates the complement and
    // holds it, the later arrivals surface with an already-decremented window.
    // Every enemy first seen with the SAME napLeft proves each window began when
    // that enemy was served (`beginMaterialise(MATERIALISE_WINDOW)`).
    const t = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    const naps = [...t.napLeftOnArrival.values()]
    expect(naps, 'the fixture must have observed every arrival').toHaveLength(WAVE_2_ENEMIES)
    for (const n of naps) {
      expect(n, 'an arriving enemy must carry a materialisation window').toBeGreaterThan(0)
    }
    expect(new Set(naps).size, `every enemy must arrive with a FULL window; saw ${naps.join(',')}`).toBe(1)
  })

  it('the arrival schedule is deterministic — the same seed replays the same frames', () => {
    const a = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    const b = walkArrivals(stepDemo(onTheBrinkOfWave2(SEED), {}))
    expect([...b.firstSeen.entries()]).toEqual([...a.firstSeen.entries()])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-9 — the dead serving law gains a production caller
// ─────────────────────────────────────────────────────────────────────────────

/** demo.ts with comments stripped — a name inside a comment must never satisfy a
 *  wiring guard (block comments first, then line comments). */
function demoSourceSansComments(): string {
  const path = fileURLToPath(new URL('../src/core/demo.ts', import.meta.url))
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('jt11-4 — the ServiceQueue stops being dead code', () => {
  const SERVING_LAW = ['newServiceQueue', 'takeEnemyNumber', 'enemyTurn', 'serveEnemy'] as const

  it.each(SERVING_LAW)('demo.ts calls %s in production code, not just tests', (fn) => {
    // Today demo.ts imports only `enterViaPads`, `beginMaterialise`,
    // `stepMaterialise` and `PADS` — the whole take-a-number law has zero
    // production callers. Wiring it is the story.
    const src = demoSourceSansComments()
    expect(src.includes(fn), `${fn} must have a real caller in demo.ts, outside comments`).toBe(true)
  })

  it('the serving law is imported from the transporter module, not re-implemented locally', () => {
    const src = demoSourceSansComments()
    // Guards against Dev satisfying the check above by writing a private copy of
    // the queue in demo.ts — the point is to consume the transcribed, ROM-cited
    // implementation that already exists.
    for (const fn of SERVING_LAW) {
      expect(
        new RegExp(`function\\s+${fn}\\b`).test(src),
        `${fn} must be imported from ./transporter.js, not redefined in demo.ts`,
      ).toBe(false)
    }
    const importBlock = /import\s*\{([^}]*)\}\s*from\s*'\.\/transporter\.js'/.exec(src)
    expect(importBlock, 'demo.ts must import from ./transporter.js').not.toBeNull()
    for (const fn of SERVING_LAW) {
      expect(importBlock?.[1].includes(fn), `${fn} must appear in the transporter import`).toBe(true)
    }
  })
})
