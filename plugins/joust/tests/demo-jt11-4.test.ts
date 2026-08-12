// tests/demo-jt11-4.test.ts
//
// Story jt11-4 — RED phase (Han Solo / TEA). Wave enemies must MATERIALIZE ONE
// BY ONE on the pads, served by the ROM's take-a-number transporter queue —
// not spliced in as a one-frame batch.
//
// ─── WHAT THE PORT DOES TODAY (the defect) ──────────────────────────────────
// `spawnWaveEnemies` builds the whole complement and hands it back as a finished
// array. Both callers insert that array WHOLE, on ONE frame: `createWaveSim`
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
// The suite drives `createWaveSim`/`stepSim` and reads the enemies PRESENT in
// `sim.processes` per frame — the exact set `drawList` blits and `collisionPass`
// admits. A faithful serve-queue port shows the enemy count CLIMBING one at a
// time; the batch insert shows the whole complement standing on frame 0.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createWaveSim, stepSim, drawList, type SimProcess, type SimState } from '../src/core/sim.js'
import { strippedToPlayers } from './helpers/wave-entry.js'

// `WAVE_TABLE` wave 1 = 3 bounders, 0 pterodactyls; wave 2 = 4 bounders, 0
// pterodactyls. Both complements are pure ground enemies, so nothing here is
// entangled with jt9-59's separate PTERWV ptero schedule.
const SEED = 0x1234
const WAVE_1_ENEMIES = 3
const WAVE_2_ENEMIES = 4
/** Long enough for any sane per-turn cadence to seat a 4-enemy complement. */
const WINDOW = 400
/** WCREATE's `PCNAP 61` between creating each of a wave's enemies (JOUSTRV4.SRC:2191)
 *  — decimal frames, the stagger a player actually sees. Mirrored here rather than
 *  imported so the suite pins the ROM figure, not whatever `sim.ts` happens to hold. */
const ENEMY_STAGGER_FRAMES = 61

const enemiesOf = (d: SimState): SimProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const entityOps = (d: SimState): number => drawList(d).filter((op) => op.kind === 'entity').length

/** Park with the wave cleared of enemies: the next `stepSim` clears-and-advances.
 *  Wave 1's complement must be emptied out of the transporter's WAITING ROOM as well
 *  as out of the arena — an enemy still holding a number is alive and holds the wave
 *  open, exactly as its CRELP-spinning process does in the ROM. */
function onTheBrinkOfWave2(seed: number): SimState {
  return strippedToPlayers(createWaveSim(seed))
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
function walkArrivals(start: SimState, frames = WINDOW): ArrivalTimeline {
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
    d = stepSim(d, {})
  }
  return { presentCount, drawOps, firstSeen, arrivalOrder, napLeftOnArrival, typeOf }
}

/** The distinct frames on which SOMETHING arrived — a batch insert has exactly one. */
const arrivalFrames = (t: ArrivalTimeline): number[] => [...new Set(t.firstSeen.values())].sort((a, b) => a - b)

// ─────────────────────────────────────────────────────────────────────────────
// Wave 1 — the complement `createWaveSim` assembles
// ─────────────────────────────────────────────────────────────────────────────

describe('jt11-4 — wave 1 enters through the transporter queue, not as a frame-0 batch', () => {
  it('no ground enemy stands in the arena on frame 0 — each waits its turn to be served', () => {
    const d = createWaveSim(SEED)
    // Today `createWaveSim` seeds `sim.processes` with the whole complement, so
    // this reads 3. The ROM's enemy holds a ticket and naps at least one PCNAP
    // before it can be served (CRELP, JOUSTRV4.SRC:5667).
    expect(enemiesOf(d), 'a fresh wave-1 demo must not have its complement already standing').toHaveLength(0)
  })

  it('wave 1 seats all three bounders, one at a time', () => {
    const t = walkArrivals(createWaveSim(SEED))
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
    const advanced = stepSim(onTheBrinkOfWave2(SEED), {})
    // `processes = [...processes, ...arrivals]` puts all four of wave 2's
    // bounders in on this single frame today.
    expect(advanced.wave, 'the fixture must actually have advanced into wave 2').toBe(2)
    expect(enemiesOf(advanced), 'the advance frame must serve no enemy yet').toHaveLength(0)
  })

  it('wave 2 serves its four bounders one at a time, never two in a frame', () => {
    const t = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
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
    const t = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
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

  it('consecutive arrivals are a WCREATE nap apart — the stagger has magnitude, not just order', () => {
    // "Different frames" and "strictly later" are both satisfied by a 1-frame
    // stagger, which is the batch insert with a limp: four birds still appear
    // inside a fifteenth of a second. That implementation shipped earlier in this
    // story and was green against every other assertion here while still failing
    // the reported defect. WCREATE parks `PCNAP 61` BEFORE creating each enemy
    // (`10$ PCNAP 61 / SECCR CREEM,EMYID`, JOUSTRV4.SRC:2187-2192), so the gap
    // between consecutive arrivals is a full 61 frames — the same lower-bound
    // idiom demo-jt9-59 pins for PTERWV's `PCNAP 65` ptero cadence.
    const t = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
    const frames = t.arrivalOrder.map((id) => t.firstSeen.get(id) ?? -1)
    expect(frames, 'the fixture must have observed every arrival').toHaveLength(WAVE_2_ENEMIES)
    expect(
      frames[0],
      `the first bird owes WCREATE's nap before it is even created; arrived on frame ${frames[0]}`,
    ).toBeGreaterThanOrEqual(ENEMY_STAGGER_FRAMES)
    for (let i = 1; i < frames.length; i++) {
      expect(
        frames[i] - frames[i - 1],
        `enemy ${i} must arrive at least ${ENEMY_STAGGER_FRAMES} frames after enemy ${i - 1} ` +
          `(WCREATE PCNAP 61, JOUSTRV4.SRC:2191); frames were ${frames.join(',')}`,
      ).toBeGreaterThanOrEqual(ENEMY_STAGGER_FRAMES)
    }
  })

  it('two birds awake on the same frame: one is served, the other retries the NEXT frame', () => {
    // The transporter serves ONE customer per frame (`GOTTR INC [TCURUSE,X]` marks
    // the pad in use, JOUSTRV4.SRC:5710), so a contended frame must defer the loser
    // rather than seat both. Production never reaches this arm on its own — the
    // seeded naps are 61 apart, so exactly one bird is ever awake — which is why it
    // is driven here from a hand-woken waiting room. It also pins the RETRY delay:
    // the loser goes back to CRELP having already spent this frame as its `PCNAP 1`
    // (JOUSTRV4.SRC:5667-5676), so it is eligible on the very next frame, not the
    // one after. A retry that re-naps for a full frame would push it to +2.
    const advanced = stepSim(onTheBrinkOfWave2(SEED), {})
    const room = advanced.pendingEnemies ?? []
    expect(room.length, 'premise: the advance seeds a waiting room to wake').toBeGreaterThanOrEqual(2)
    const contended: SimState = {
      ...advanced,
      pendingEnemies: room.map((pe, i) => (i < 2 ? { ...pe, nap: 0 } : pe)),
    }

    const first = stepSim(contended, {})
    expect(
      enemiesOf(first).length - enemiesOf(contended).length,
      'exactly one bird may leave the pads on a contended frame',
    ).toBe(1)
    expect(
      (first.pendingEnemies ?? []).length,
      'the loser stays in the waiting room — it is not dropped',
    ).toBe(room.length - 1)

    const second = stepSim(first, {})
    expect(
      enemiesOf(second).length - enemiesOf(first).length,
      'the loser retried with no fresh nap, so it is served on the very next frame',
    ).toBe(1)
  })

  it('an unserved enemy is absent from the draw list too — it does not exist yet', () => {
    const t = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
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
    const t = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
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
    const t = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
    const naps = [...t.napLeftOnArrival.values()]
    expect(naps, 'the fixture must have observed every arrival').toHaveLength(WAVE_2_ENEMIES)
    for (const n of naps) {
      expect(n, 'an arriving enemy must carry a materialisation window').toBeGreaterThan(0)
    }
    expect(new Set(naps).size, `every enemy must arrive with a FULL window; saw ${naps.join(',')}`).toBe(1)
  })

  it('the arrival schedule is deterministic — the same seed replays the same frames', () => {
    const a = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
    const b = walkArrivals(stepSim(onTheBrinkOfWave2(SEED), {}))
    expect([...b.firstSeen.entries()]).toEqual([...a.firstSeen.entries()])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// The deferred troll rise — and the wave it must NOT wait on
// ─────────────────────────────────────────────────────────────────────────────

/** Clear the wave and step: `stepSim` advances, re-applies wave destruction to the
 *  arena, and re-arms the troll. The demo-troll suite's `forceAdvance` idiom. */
function advanceIntoWave(target: number, seed: number): SimState {
  let d = createWaveSim(seed)
  for (let i = 0; d.wave < target; i++) {
    if (i > 4 * target) throw new Error(`could not reach wave ${target}; stuck on ${d.wave}`)
    d = stepSim(strippedToPlayers(d), {})
  }
  return d
}

/** Frame (0 = the advance frame itself) on which a troll first stands in the arena,
 *  or -1 if none rose inside the window. */
function firstTrollFrame(start: SimState, frames = WINDOW): number {
  let d = start
  for (let f = 0; f < frames; f++) {
    if (d.sim.processes.some((p) => p.kind === 'troll')) return f
    d = stepSim(d, {})
  }
  return -1
}

describe('jt11-4 — deferring the troll must not suppress it', () => {
  it('wave 4 (a normal wave): the troll waits for a bird to be SERVED, not for the advance', () => {
    // The intent of the deferral: `pickTrollVictim` binds the nearest bird, so
    // rising into an arena of knights alone would grab a player by default rather
    // than by proximity (the jt9-42 defect). It therefore waits out WCREATE's nap.
    const d = advanceIntoWave(4, SEED)
    expect(d.wave, 'the fixture must be standing on the troll wave').toBe(4)
    expect(
      d.sim.processes.some((p) => p.kind === 'enemy'),
      'wave 4 seeds a waiting room — nobody is served on the advance frame',
    ).toBe(false)
    const rose = firstTrollFrame(d)
    expect(rose, 'the troll must still rise on a normal wave').toBeGreaterThanOrEqual(0)
    expect(
      rose,
      `it must wait for the first arrival (WCREATE PCNAP 61, JOUSTRV4.SRC:2191); rose on frame ${rose}`,
    ).toBeGreaterThanOrEqual(ENEMY_STAGGER_FRAMES)
    // …and it must wait for the FIRST arrival, not the last. A lower bound alone
    // cannot tell those apart: gate the rise on the waiting room EMPTYING instead
    // of on a bird being served and the troll arrives on frame 366 rather than 61,
    // with every other assertion in this file still green (measured, round-2
    // review). That is the `61 * count` park the gate's own comment in sim.ts
    // exists to rule out, so the window is pinned on both sides.
    expect(
      rose,
      `one served bird is enough — waiting for the whole complement parks the troll ` +
        `for 61 * count frames; rose on frame ${rose}`,
    ).toBeLessThanOrEqual(ENEMY_STAGGER_FRAMES + 2)
  })

  it('wave 5 (an EGG wave): the troll rises anyway — no bird is ever coming', () => {
    // The regression this test exists for. An egg wave's complement is laid where
    // it sits (WAVEGG, JOUSTRV4.SRC:2737): eggs take no ticket, so the waiting room
    // is empty and no `kind:'enemy'` will EVER appear. A gate that waits for one
    // parks the troll for the whole wave — and waves 5/10/15/20 past TROLL_WAVE=4
    // are all egg waves, so one wave in five silently loses the feature.
    const d = advanceIntoWave(5, SEED)
    expect(d.wave, 'the fixture must be standing on the egg wave').toBe(5)
    expect(
      d.sim.processes.some((p) => p.kind === 'enemy'),
      'an egg wave fields eggs, never a ground enemy — that is the whole trap',
    ).toBe(false)
    expect(
      d.sim.processes.some((p) => p.kind === 'egg'),
      'the fixture must actually have laid the egg complement',
    ).toBe(true)
    const rose = firstTrollFrame(d)
    expect(rose, `no troll rose in ${WINDOW} frames of the egg wave`).toBeGreaterThanOrEqual(0)
    expect(rose, 'with an empty waiting room there is nothing to wait FOR').toBeLessThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-9 — the dead serving law gains a production caller
// ─────────────────────────────────────────────────────────────────────────────

/** sim.ts with comments stripped — a name inside a comment must never satisfy a
 *  wiring guard (block comments first, then line comments). */
function simSourceSansComments(): string {
  const path = fileURLToPath(new URL('../src/core/sim.ts', import.meta.url))
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** sim.ts with comments AND every `import { … } from '…'` block stripped. A name that
 *  appears only because it was IMPORTED must not satisfy a wiring guard — the whole
 *  serving law is listed verbatim in the transporter import, so a `src.includes(fn)`
 *  over the comment-stripped text alone stays green with every call site deleted
 *  (the lang-review #25 failure mode). What is left here is call sites and nothing
 *  else. */
function simSourceSansImports(): string {
  return simSourceSansComments().replace(/import\s*(?:type\s*)?\{[^}]*\}\s*from\s*'[^']*'/g, ' ')
}

describe('jt11-4 — the ServiceQueue stops being dead code', () => {
  const SERVING_LAW = ['newServiceQueue', 'takeEnemyNumber', 'enemyTurn', 'serveEnemy'] as const

  it.each(SERVING_LAW)('sim.ts calls %s in production code, not just tests', (fn) => {
    // Today sim.ts imports only `enterViaPads`, `beginMaterialise`,
    // `stepMaterialise` and `PADS` — the whole take-a-number law has zero
    // production callers. Wiring it is the story.
    const src = simSourceSansImports()
    expect(
      new RegExp(`\\b${fn}\\s*\\(`).test(src),
      `${fn} must be INVOKED in sim.ts — outside comments, and not merely imported`,
    ).toBe(true)
  })

  it('the call-site guard above cannot be satisfied by the import block alone', () => {
    // The guard's own non-vacuity check: the transporter import really does list
    // all four names, so if `simSourceSansImports` ever stopped stripping it the
    // test above would go back to proving nothing.
    const stripped = simSourceSansImports()
    const importBlock = /import\s*\{([^}]*)\}\s*from\s*'\.\/transporter\.js'/.exec(simSourceSansComments())
    expect(importBlock, 'sim.ts must import from ./transporter.js').not.toBeNull()
    expect(
      /import\s*\{[^}]*\}\s*from\s*'\.\/transporter\.js'/.test(stripped),
      'the transporter import must be gone from the text the call-site guard scans',
    ).toBe(false)
  })

  it('the serving law is imported from the transporter module, not re-implemented locally', () => {
    const src = simSourceSansComments()
    // Guards against Dev satisfying the check above by writing a private copy of
    // the queue in sim.ts — the point is to consume the transcribed, ROM-cited
    // implementation that already exists.
    for (const fn of SERVING_LAW) {
      expect(
        new RegExp(`function\\s+${fn}\\b`).test(src),
        `${fn} must be imported from ./transporter.js, not redefined in sim.ts`,
      ).toBe(false)
    }
    const importBlock = /import\s*\{([^}]*)\}\s*from\s*'\.\/transporter\.js'/.exec(src)
    expect(importBlock, 'sim.ts must import from ./transporter.js').not.toBeNull()
    for (const fn of SERVING_LAW) {
      expect(importBlock?.[1].includes(fn), `${fn} must appear in the transporter import`).toBe(true)
    }
  })
})
