// tests/audio-ptero-wing-source.test.ts
//
// Story jt5-10 — RED phase (Mr. Praline / TEA). The story asks one question and
// will not accept a shrug for an answer:
//
//     P7DEC binds SNELWU/SNELWD to the pterodactyl (:5576), exactly as every
//     buzzard block does. Does the ROM's pterodactyl ever REACH the loops that
//     load through those bindings — or is the row boilerplate?
//
// ─── THE ANSWER, AND HOW IT WAS OBTAINED ─────────────────────────────────────
// It does not reach them. The pterodactyl is SILENT by design, and the two
// bindings at :5576 are dead. The proof is a closed chain, and every hop is
// re-derived below from the vendored source by a reader Dev does not import:
//
//   1. A ptero is created by PTERST (:1423) / BAITST (:1427), which ends
//      `BRA PTESTF` (:1487) — landing INSIDE the PTEFLY loop body.
//   2. PTEFLY (:1491-1510) is a closed loop: its last instruction is
//      `BRA PTEFLY` (:1510), unconditional. Nothing falls out of the bottom.
//   3. Every reference to the flap-loop labels in the whole file lies inside
//      :6135-6226. The only entries from OUTSIDE that region are STFLY's
//      `JMP FLAST2` (:6135, "START TO FLY") and STFALL's `BNE FLAPS2` /
//      `BRA FLIPS2` (:6156-6157, "START TO FALL") — both ground-state
//      transitions belonging to the knight/buzzard machine.
//   4. A ptero makes neither transition. PTEFLY never calls CKGND, and SRCADP
//      clamps it at `$D3-1` while clearing PVELY (:1526-1531), so it never
//      lands and never falls out of the world.
//   5. AIROVR hands the flap bit back in register B (`LDD CURJOY`, :6480) to a
//      ptero exactly as it does to a buzzard — and PTEFLY DISCARDS it. There is
//      no TSTB anywhere in the ptero's loop.
//
// Corroboration, because one chain deserves a second witness: ALL NINE of
// P7DEC's sound fields are read at exactly one site each, and every one of
// those sites sits in the ground/landing machine the ptero never enters —
// DSNWU :6183, DSNWD :6217, DSNSK :7238, DSNSK2 :5987, DSNFAL :6142,
// DSNTREF :5893, DSNCRE :5718 (DSNRU1/DSNRU2 are the two zeroed entries). The
// pterodactyl's ENTIRE sound repertoire in its own code is two immediates that
// never touch PDECSN: SNPTEI (:1467, the introduction) and SNPTE (:1173, the
// call). So the ptero needs NO new sample from jt5-2, and the wing question is
// closed rather than deferred.
//
// ─── TWO READINGS THIS FILE REFUTES, BOTH FROM THE STORY ITSELF ──────────────
// (a) "It zeroes the two RUN entries, consistent with a bird that never touches
//     the ground." True textually, and NOT a discriminator: if never touching
//     the ground were the principle, SNEMSK (skid), SNEMS2 (skid end) and
//     SNEFAL (falling) would be zeroed too. They are not. P7DEC's row is
//     boilerplate carrying two arbitrary zeros, which is why the zeros cannot
//     settle the question either way.
// (b) "P7DEC field 6 is 0 where the buzzards carry PLYR3/4/5 — possibly the
//     animation table." It is DPLYR, "RIDERS IMAGE" (:109). A pterodactyl has
//     no rider. Noise, not evidence.
//
// And one thing that is NOT a refutation: the ptero DOES animate its wings.
// PTESEQ (:1580-1583) cycles FLY1, FLY2, FLY3, FLY2 on an 8-tick hold, driven
// by a frame timer in PTESTF (:1493-1503). It flaps visibly and silently, on a
// clock, with no flap bit involved. A reader who sees the animation and infers
// a cue is making exactly the mistake this story was filed to prevent.
//
// ─── WHAT IS RED HERE AND WHAT IS A GREEN GUARD (stated, not implied) ────────
// Groups 1-2 are ORACLE groups: they re-open the ROM and pass on arrival,
// because the ROM already says what it says. They are the evidence base, not
// the deliverable — the same shape audio-flap.test.ts opens with.
// Groups 3-4 are the RED: the port does not yet RECORD the settled answer, in
// either its source comments or its claims registry. That record IS the story.
// Group 5 is a GREEN-ON-ARRIVAL regression guard, and its non-vacuity is proven
// inside the group by a control that fires the very cue the ptero must not:
// the same harness, one buzzard instead of one ptero, emits enemy-wing-down.
// Without that control the group would be the "certifies its own shape" failure
// audio-emission.test.ts was written against.
// Group 6 pins the SNETHD finding and the scope fence the story's ruling drew.
//
// ─── DEGRADATION (the tp1-8 collection trap) ─────────────────────────────────
// CI has no vendored tree, so every source re-derivation is
// describe.skipIf(!vendoredAvailable) and EVERY vendored read happens inside an
// it() body. `describe.skipIf` still executes the describe callback at
// collection, so a file-reading const hoisted there would throw on CI and kill
// the file before a single test ran.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { sourceLines, vendoredAvailable } from './helpers/joust-source.js'
import type { EntityState } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(root, 'docs', 'rom-study', 'claims')

const ROM = 'JOUSTRV4.SRC'

/** Read one 1-based line of the vendored source. Only ever called inside an it(). */
function romLine(n: number): string {
  const line = sourceLines(ROM)[n - 1]
  if (line === undefined) throw new Error(`${ROM} has no line ${n}`)
  return line
}

const readSrc = (...parts: string[]): string => readFileSync(join(root, 'src', ...parts), 'utf8')

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 1 (oracle) — the ROM law re-opens, byte for byte
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-10 — the question, re-opened verbatim', () => {
  it('P7DEC is the pterodactyl, and its sound row DOES bind the enemy wing cues', () => {
    // The binding is the QUESTION, not the answer. Kept byte-exact so nobody
    // has to take the story's paraphrase on trust.
    expect(romLine(5574)).toBe('P7DEC\tFDB\tLINET,PTERO,0000,$0000,SCOPL2,0,TREPL3,EMYDIE')
    expect(romLine(5575)).toBe('\tFDB\tDEATH4,0,STENMY,SCRHUN,0,EMYTIM')
    expect(romLine(5576)).toBe('\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,0,0,SNEFAL,0,SNECRE')
  })

  it('a buzzard block is IDENTICAL but for the two zeroed RUN entries', () => {
    // P3DEC-P6DEC all carry the same row with SNERU1,SNERU2 in slots 5 and 6.
    // Every one of them is byte-identical to every other, which is what makes
    // "boilerplate" a measurement rather than an impression.
    const buzzardRow = '\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE'
    for (const n of [5560, 5564, 5568, 5572]) {
      expect(romLine(n), `enemy sound row at :${n}`).toBe(buzzardRow)
    }
    // Slots 5 and 6 are the ONLY difference between a buzzard's row and the
    // ptero's. The skid, skid-end, fall and transporter cues are NOT zeroed —
    // which is why the zeros cannot mean "never touches the ground".
    expect(romLine(5576).replace(',0,0,', ',SNERU1,SNERU2,')).toBe(buzzardRow)
  })

  it('field 6 is DPLYR, the RIDERS IMAGE — a pterodactyl has no rider', () => {
    // Settles the story's second open signal. The decision-block offset table
    // names every field; field 6 (offset 10) is the rider's image, not an
    // animation table, so P7DEC's 0 there says nothing about flapping.
    expect(romLine(109)).toBe('DPLYR\tRMB\t2\tRIDERS IMAGE')
    expect(romLine(118)).toBe('DSNWU\tRMB\t2\tSOUND OF WINGS GOING UP')
    expect(romLine(119)).toBe('DSNWD\tRMB\t2\tSOUND OF WINGS GOING DOWN')
  })

  it('the ptero is born INTO its own loop, which closes on an unconditional BRA', () => {
    expect(romLine(1487)).toBe('\tBRA\tPTESTF')
    expect(romLine(1491)).toBe('PTEFLY\tPCNAP\t1\t\t')
    expect(romLine(1492)).toBe('\tJSR\tAIROVR\t\tFLYING OVERHEAD')
    expect(romLine(1506)).toBe('\tLDX\t#FLYXP\t\tADD IN BUMPX,Y; AND VELX,Y; NO GRAVITY!')
    expect(romLine(1510)).toBe('\tBRA\tPTEFLY')
  })

  it('AIROVR hands the flap bit BACK, and the ptero never tests it', () => {
    // The buzzard's loops do `TSTB` on exactly this value (:6168, :6195). The
    // ptero receives the identical register and drops it on the floor.
    expect(romLine(6456)).toBe('AIROVR\tJSR\t[PJOY,U]\t\tREAD JOYSTICK')
    expect(romLine(6480)).toBe('\tLDD\tCURJOY\t\tGIVE BACK JOYSTICK POSITION')
    expect(romLine(6481)).toBe('\tRTS')
  })

  it('the two ways INTO the flap loops are both ground-state transitions', () => {
    expect(romLine(6121)).toBe('*\tSTART TO FLY')
    expect(romLine(6135)).toBe('\tJMP\tFLAST2')
    expect(romLine(6137)).toBe('*\tSTART TO FALL')
    expect(romLine(6156)).toBe('\tBNE\tFLAPS2\t\t BR=YES')
    expect(romLine(6157)).toBe('\tBRA\tFLIPS2\t\tNO, START AT CORRECT FRAME')
  })

  it('SRCADP clamps the ptero above the floor, so it never lands', () => {
    expect(romLine(1526)).toBe('\tCMPB\t#$D3-1\t\tMINIMUM POSITION IN THE Y DIRECTION')
    expect(romLine(1528)).toBe('\tCLR\tPVELY,U\t\tSTOP FALLING')
  })

  it('the ptero animates its wings on a TIMER, with no flap bit — PTESEQ', () => {
    // The trap this story exists to disarm: visible wings, no cue.
    expect(romLine(1578)).toBe("*\tPTERODACTYLS FLYING ANIMATION SEQUENCE")
    expect(romLine(1580)).toBe('PTESEQ\tFCB\tFLY1-FLY1,8')
    expect(romLine(1581)).toBe('\tFCB\tFLY2-FLY1,8')
    expect(romLine(1582)).toBe('\tFCB\tFLY3-FLY1,8')
    expect(romLine(1583)).toBe('\tFCB\tFLY2-FLY1,8')
  })

  it("the ptero's OWN sounds are two immediates that never touch PDECSN", () => {
    expect(romLine(1173)).toBe('\tLDX\t#SNPTE\t\tPTERODACTYL CALL')
    expect(romLine(1467)).toBe('\tLDX\t#SNPTEI\t\tPTERODACTYL INTRODUCTION CALL')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 2 (oracle) — the chain is CLOSED, computed rather than asserted
//
// Group 1 quotes lines. Quoting proves each hop exists; it does not prove there
// is no OTHER hop. These tests scan the whole file, so a route into the flap
// loops that nobody thought of would redden them.
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-10 — nothing reaches the wing cues from outside', () => {
  /** Every label whose mention would mean control entered the flap machine. */
  const FLAP_LABELS = [
    'FLAPLP',
    'FLIPLP',
    'FLAPS2',
    'FLIPS2',
    'FLAPST',
    'FLIPST',
    'GOFLIP',
    'GOFLAP',
    'FLAST2',
    'WINGDN',
    'WINGFK',
  ] as const

  /** 1-based line numbers of every line mentioning any flap label. */
  function flapLabelLines(): number[] {
    const lines = sourceLines(ROM)
    const hits: number[] = []
    lines.forEach((line, i) => {
      if (line.startsWith('*')) return // full-line comment, not code
      if (FLAP_LABELS.some((l) => new RegExp(`\\b${l}\\b`).test(line))) hits.push(i + 1)
    })
    return hits
  }

  it('every mention of a flap label lives in one contiguous region, :6135-6226', () => {
    const hits = flapLabelLines()
    expect(hits.length, 'precondition: the labels really are referenced').toBeGreaterThan(10)
    expect(Math.min(...hits)).toBe(6135)
    expect(Math.max(...hits)).toBe(6226)
  })

  it('the ONLY mentions outside the loop body itself are STFLY and STFALL', () => {
    // The loop body proper begins at FLAPLP (:6163). Anything before it that
    // still names a flap label is an entry point from another routine.
    const outside = flapLabelLines().filter((n) => n < 6163)
    expect(outside, 'STFLY :6135, then STFALL :6156-6157 — and nothing else').toEqual([
      6135, 6156, 6157,
    ])
  })

  it("the ptero's loop body names no flap label, no CKGND and no TSTB", () => {
    // PTEFLY's body is :1491 to its closing BRA at :1510. If a single one of
    // these appeared, the chain would have a hole in it.
    const body = sourceLines(ROM).slice(1491 - 1, 1510)
    const text = body.join('\n')
    for (const label of [...FLAP_LABELS, 'CKGND', 'TSTB', 'DSNWU', 'DSNWD']) {
      expect(text, `PTEFLY's body must not mention ${label}`).not.toMatch(
        new RegExp(`\\b${label}\\b`),
      )
    }
    // ...and it really is the body we think it is.
    expect(body[0]).toMatch(/^PTEFLY\b/)
    expect(body.at(-1)).toBe('\tBRA\tPTEFLY')
  })

  it('DSNWU and DSNWD are read at exactly two sites, both inside the flap loops', () => {
    const lines = sourceLines(ROM)
    const reads: number[] = []
    lines.forEach((line, i) => {
      if (/\bLDX\s+DSNW[UD],X\b/.test(line)) reads.push(i + 1)
    })
    expect(reads, 'GOFLIP :6183 and FLAST2 :6217, and nowhere else').toEqual([6183, 6217])
  })

  it("all NINE of P7DEC's sound fields are read from the ground/landing machine", () => {
    // The corroborating witness: the wing cues are not specially dead, the
    // whole row is. Each field is read at exactly one site, and none of those
    // sites is reachable from PTEFLY.
    const lines = sourceLines(ROM)
    const siteOf = (field: string): number[] => {
      const hits: number[] = []
      lines.forEach((line, i) => {
        if (new RegExp(`\\bLD[XA]\\s+${field},X\\b`).test(line)) hits.push(i + 1)
      })
      return hits
    }
    expect(siteOf('DSNSK')).toEqual([7238])
    expect(siteOf('DSNSK2')).toEqual([5987])
    expect(siteOf('DSNFAL')).toEqual([6142])
    expect(siteOf('DSNTREF')).toEqual([5893])
    expect(siteOf('DSNCRE')).toEqual([5718])
    // DSNRU1/DSNRU2 are the two entries P7DEC zeroes; they are read in the
    // running machine, which a bird that never lands cannot enter either.
    expect(siteOf('DSNRU1').length + siteOf('DSNRU2').length).toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 3 (RED) — the port RECORDS the settled answer
//
// This is the story's actual deliverable. The citations are pinned, NOT the
// wording: a test that demanded a sentence would fail on a better sentence.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-10 AC1/AC2 — the answer is written down where the ptero lives', () => {
  it('ptero.ts states the answer and cites every hop of the chain', () => {
    const src = readSrc('core', 'ptero.ts')
    // The chain's load-bearing anchors. Each is a LABEL plus its line, which is
    // the citation shape the sidecar's `LABEL (:line)` rule asks for and the
    // one that survives a comment edit shifting numbers elsewhere.
    for (const anchor of ['PTEFLY', 'PTESTF', 'AIROVR', 'STFLY', 'STFALL', 'SRCADP']) {
      expect(src, `the record must name ${anchor}`).toContain(anchor)
    }
    for (const line of [':1487', ':1491', ':1510', ':6135', ':6480']) {
      expect(src, `the record must cite ${line}`).toContain(line)
    }
  })

  it('ptero.ts names the BINDING it is refuting — P7DEC, SNELWU/SNELWD, :5576', () => {
    const src = readSrc('core', 'ptero.ts')
    expect(src).toContain('P7DEC')
    expect(src).toContain('SNELWU')
    expect(src).toContain('SNELWD')
    expect(src).toContain(':5576')
  })

  it('ptero.ts names BOTH loops, so the refuted branch is visible, not merely absent', () => {
    // AC2: "the OTHER branch is explicitly named in the record as refuted".
    // A record that only says "the ptero is silent" leaves the next reader to
    // rediscover what was considered and rejected.
    const src = readSrc('core', 'ptero.ts')
    expect(src).toContain('FLAPLP')
    expect(src).toContain('FLIPLP')
  })

  it('ptero.ts records that the wings ANIMATE — the trap, disarmed in writing', () => {
    // Without this, the first person to look at the sprite sheet re-opens the
    // whole question on the strength of four wing frames.
    const src = readSrc('core', 'ptero.ts')
    expect(src).toContain('PTESEQ')
  })

  it('the audio seam points at the record, so a cue reader finds it too', () => {
    // events.ts is where somebody wondering "why is there no ptero wing cue?"
    // actually looks. The enemy-wing comments must not say only "a buzzard's".
    const src = readSrc('core', 'events.ts')
    expect(src, 'the seam must name the pterodactyl exclusion').toMatch(/ptero/i)
    expect(src, 'and point at the story that settled it').toContain('jt5-10')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 4 (RED) — the claims registry carries the finding, verbatim-checked
// ═════════════════════════════════════════════════════════════════════════════

interface Claim {
  id?: string
  claim?: string
  source?: { file: string; line: number; verbatim?: string }
}

function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}

const jt510Claims = (): Claim[] => loadClaims().filter((c) => c.id?.startsWith('JT510-'))

describe('jt5-10 AC1 — the finding enters the claims registry', () => {
  it('there are JT510-* claims at all', () => {
    expect(jt510Claims().length, 'the settled answer must be a citable claim').toBeGreaterThan(0)
  })

  it('the chain’s load-bearing lines are each covered by a claim', () => {
    const covered = new Set(
      jt510Claims()
        .filter((c) => c.source && c.source.file.endsWith(ROM))
        .map((c) => c.source!.line),
    )
    // :5576 is the binding (the question), :1510 closes the ptero's loop (the
    // answer), :6135 is the only outside door into the flap machine, and :6480
    // is the flap bit the ptero throws away.
    for (const line of [5576, 1510, 6135, 6480]) {
      expect(covered, `a JT510 claim must cite ${ROM}:${line}`).toContain(line)
    }
  })

  it.skipIf(!vendoredAvailable)('every JT510 verbatim matches the vendored line byte-for-byte', () => {
    const claims = jt510Claims()
    expect(claims.length, 'precondition: there is something to check').toBeGreaterThan(0)
    for (const c of claims) {
      if (!c.source?.verbatim) continue
      expect(romLine(c.source.line), `${c.id} cites ${c.source.file}:${c.source.line}`).toBe(
        c.source.verbatim,
      )
    }
  })

  it('no JT510 claim asserts the ptero SOUNDS its wings', () => {
    // The one thing the registry must never come to say. Cheap, and it guards
    // against a later edit inverting the finding while the citations still pass.
    for (const c of jt510Claims()) {
      expect(c.claim ?? '', `${c.id}`).not.toMatch(/ptero[^.]{0,80}\b(emits|plays|sounds)\b/i)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 5 — the behavioural guard, with its own non-vacuity control
//
// GREEN ON ARRIVAL, deliberately. The port already emits no ptero wing cue; the
// value here is that it can never START to without this reddening. A guard that
// asserts an absence is worthless unless the same harness is shown capable of
// producing the presence — so the control below stages a buzzard through the
// identical path and requires the cue to fire.
// ═════════════════════════════════════════════════════════════════════════════

const WING_KINDS = ['enemy-wing-down', 'enemy-wing-up', 'player-wing-down', 'player-wing-up']
const cueKinds = (d: DemoState): string[] => d.cues.map((c) => c.type as string)

const PTERO_ID = 0xb01
const CONTROL_ID = 0xb02

/**
 * Park every process that is not a knight or `keep` asleep for the whole window.
 *
 * MEASURED NECESSITY, not caution. The first draft of this group staged one
 * ptero beside the players and asserted the stream held no wing cue. It failed —
 * on `enemy-wing-down`, with `enemy-materialise` sitting in the same stream.
 * `createWaveDemo` keeps SPAWNING the wave's buzzards as the frames run, so
 * "the only enemy I added is a ptero" is true at frame 0 and false by frame 12,
 * and the cue belonged to a buzzard that arrived while I was not looking. Cues
 * carry no process id (`cues.push({ type })`), so attribution has to come from
 * the fixture: if nothing else can act, anything that sounds is the subject.
 *
 * Re-applied EVERY frame, because a process that did not exist at frame 0
 * cannot be hushed at frame 0.
 */
function hushAllBut(d: DemoState, keep: number): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.map((p) =>
        p.kind === 'player' || p.id === keep ? p : { ...p, nap: 100_000 },
      ),
    },
  }
}

/** The flight state demo.ts gives a real spawned ptero (`pteroFlightEntity`). */
const pteroEntity = (): EntityState => ({
  posX: 8,
  posY: 0x60 << 8,
  velXIndex: 8,
  velXFrac: 0,
  velY: 0,
  timeUp: 1,
  groundState: null,
  plantZ: 0,
  airborne: true,
  animPhase: 0,
})

/** One ptero beside the knights and nothing else that could sound a wing.
 *  Any enemy-wing-* in this fixture is necessarily the ptero's. */
function stagePtero(): DemoState {
  const base = createWaveDemo(0x1234)
  const ptero: DemoProcess = {
    id: PTERO_ID,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'ptero',
    facing: 1,
    collisionEnabled: false,
    entity: pteroEntity(),
  }
  return {
    ...base,
    sim: {
      ...base.sim,
      processes: [...base.sim.processes.filter((p) => p.kind === 'player'), ptero],
      budget: { nsmart: 0, wsmart: 0 },
    },
  }
}

/** The control: the SAME fixture with a buzzard in the ptero's place, staged on
 *  the settings audio-flap.test.ts measured to produce a wingbeat. */
function stageControlBuzzard(): DemoState {
  const base = createWaveDemo(0x1234)
  const entity: EntityState = { ...pteroEntity(), posY: 0x90 << 8, velY: -1, timeUp: 1 }
  const enemy: EnemyState = { entity, facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' }
  const buzzard: DemoProcess = {
    id: CONTROL_ID,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemyType: 'bounder',
    collisionEnabled: false,
    enemy,
  }
  return {
    ...base,
    sim: {
      ...base.sim,
      processes: [...base.sim.processes.filter((p) => p.kind === 'player'), buzzard],
      budget: { nsmart: 0, wsmart: 0 },
    },
  }
}

const procOf = (d: DemoState, id: number): DemoProcess | undefined =>
  d.sim.processes.find((p) => p.id === id)

describe('jt5-10 AC3 — a pterodactyl flies, and flying is all it does', () => {
  it('the control proves this harness CAN sound a wing (else the guard is theatre)', () => {
    // Same fixture, same hush, a buzzard in the ptero's place. If this ever
    // stops firing, the guard below has become an assertion about a harness
    // that cannot produce the thing it forbids — which is no assertion at all.
    let d = stageControlBuzzard()
    const all: string[] = []
    for (let i = 0; i < 12; i++) {
      d = hushAllBut(d, CONTROL_ID)
      d = stepDemo(d, {})
      all.push(...cueKinds(d))
    }
    expect(all, 'a buzzard in the same hushed fixture must reach enemy-wing-down').toContain(
      'enemy-wing-down',
    )
  })

  it('a ptero flying 40 frames emits no wing cue of any species', () => {
    let d = stagePtero()
    const seen: string[] = []
    let moved = false
    for (let i = 0; i < 40; i++) {
      d = hushAllBut(d, PTERO_ID)
      const before = procOf(d, PTERO_ID)
      d = stepDemo(d, {})
      const after = procOf(d, PTERO_ID)
      // PRECONDITION, per the audio-emission.test.ts rule: prove the moment
      // really happened. An absent cue over a ptero that never woke, or was
      // removed on frame 1, proves nothing whatsoever.
      expect(after, `precondition: the ptero still exists on frame ${i}`).toBeDefined()
      if (before?.entity !== after?.entity) moved = true
      seen.push(...cueKinds(d))
    }
    expect(moved, 'precondition: the ptero actually flew').toBe(true)
    expect(
      procOf(d, PTERO_ID)?.entity?.posX,
      'precondition: it really moved across the screen',
    ).not.toBe(8)

    for (const kind of WING_KINDS) {
      expect(seen, `a pterodactyl must never sound ${kind}`).not.toContain(kind)
    }
  })

  it('the ptero branch of runBehaviour returns no cue — pinned at the source', () => {
    // The behavioural test above can only catch an emitter that fires. This
    // catches the edit itself: frame.ts's ptero branch must not grow a
    // `wingCue(...)` the way the enemy branch has one.
    const src = readSrc('core', 'frame.ts')
    const branch = src.slice(src.indexOf("p.kind === 'ptero'"))
    const upToNextBranch = branch.slice(0, branch.indexOf('if (p.kind ==', 1))
    expect(upToNextBranch, "the ptero branch must not emit a wing cue").not.toContain('wingCue')
    // ...and the enemy branch still does, so the slice above is meaningful.
    expect(src, 'precondition: the enemy branch does emit one').toContain("wingCue(stepped.wingEdge, 'enemy')")
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 6 — the SNETHD arm is recorded, and the scope fence holds
//
// The story's ruling: settle the ptero-vs-ptero read HERE, FILE the collision
// change. So the obligation in this repo is a written record plus an untouched
// eligible set — not a mechanic.
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-10 AC4 — the ROM routes ptero-vs-ptero, verbatim', () => {
  it('OSTHT2 sounds SNETHD BEFORE it dispatches on species', () => {
    expect(romLine(5019)).toBe('OSTHT2\tLDX\t#SNETHD\t\tENEMIES COLIDE')
    expect(romLine(5020)).toBe('\tJSR\tVSND')
  })

  it('two pterodactyls fall back to the ORDINARY bump', () => {
    expect(romLine(5031)).toBe("OSTH12\tLDA\tPID,X\t\t2 PTERODACTYL'S?")
    expect(romLine(5032)).toBe('\tCMPA\t#$80+PTEID')
    expect(romLine(5033)).toBe('\tBEQ\tOSTH11\t\tBR=YES, SAME OLD COLISION')
    expect(romLine(5028)).toBe('OSTH11\tJSR\tOSTBMP\t\tNO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS')
  })
})

describe('jt5-10 AC4/AC5 — recorded here, built elsewhere', () => {
  it('demo.ts records why ptero-vs-ptero is unreachable in this port', () => {
    const src = readSrc('core', 'demo.ts')
    expect(src, 'the eligible-set filter must explain its own ptero gap').toContain('OSTHT2')
    expect(src, 'and name the story that settled it').toContain('jt5-10')
  })

  it('the eligible-set filter is UNCHANGED — this story builds no mechanic', () => {
    // AC5's scope fence, made mechanical. Widening this filter is precisely the
    // gameplay change the user's ruling moved to a follow-up story.
    const src = readSrc('core', 'demo.ts')
    expect(src).toContain("(p.kind === 'player' || p.kind === 'enemy') && p.collisionEnabled !== false")
    expect(src, 'no ptero may be admitted to the joust pair loop here').not.toContain(
      "p.kind === 'player' || p.kind === 'enemy' || p.kind === 'ptero'",
    )
  })
})
