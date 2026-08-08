// tests/audio-thud.test.ts
//
// Story jt5-4 — RED phase (Mr. Praline / TEA). The THUDs: two cues blocked on
// physics the sim computes and throws away.
//
// The work is APPLYING the bounce. The cue is the easy half and must not land
// without it, because a thud announcing a collision the sim does not resolve is
// an audible lie. That is not a figure of speech here — it is measured. On the
// tree this file was written against, two buzzards staged into each other stay
// inside each other for **97 consecutive frames** with their pixel separation
// pinned at 2 the whole time, because `collisionPass` reaches
// `if (contact.outcome.kind !== 'kill') continue` and drops the bounce on the
// floor. `bounceTop`, `bounceBottom` and `bounceHorizontal` have zero
// production callers; so do `drainBumpX` and `consumeBumpY`.
//
// ─── THE OPEN QUESTION THIS STORY TURNED ON, AND THE ROM'S ANSWER ────────────
// The two thud paths do NOT share a continuation, and SM handed the second one
// over unfollowed:
//
//   SNETHD  :5019  OSTHT2 LDX #SNETHD   ENEMIES COLIDE
//           :5020         JSR VSND                          ← cue
//           :5028  OSTH11 JSR OSTBMP    NO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS
//           :5029         JMP HITEM2    (carry CLEAR)
//
//   SNPTHD  :5014  1$     LDX #SNPTHD   PLAYERS COLIDE
//           :5015         JSR VSND                          ← cue
//           :5016         LDX COLOBJ
//           :5017         BRA OSTXTT
//           :5053  OSTXTT JSR OSTXTP    REG.X WILL BE RESTORIED
//           :5054         BRA OSTX12    (carry SET)
//
// **The player-involved tie DOES bump.** `OSTXTT`'s whole body is a `JSR` into
// the bouncer, and the bouncer's own header names it as a client:
//
//     :5093  *  BOUNCER ROUTINE
//     :5094  * PLAYER VS. PLAYER & ENEMY VS. PLAYER & ENEMY VS. ENEMY
//     :5095  * & PTERODACTYL VS. PTERODACTYL
//
// But the two paths reach that bouncer DIFFERENTLY, and the difference is the
// only thing in this story that could not be guessed:
//
//   • SNETHD goes through `OSTBMP` (:5042-5046), which COMPARES THE TWO SCREEN
//     Ys — `LDB PPOSY+1,X / SUBB PPOSY+1,U` — and dispatches on the result.
//     `LBPL -> OSTUTP` sends U up and X down; the fall-through `JMP OSTXTP`
//     sends U down and X up. Both arms send the PHYSICALLY HIGHER bird UP, so
//     OSTBMP is symmetric and register-free: height decides.
//   • SNPTHD skips OSTBMP entirely and calls `OSTXTP` UNCONDITIONALLY. There is
//     no height comparison on that path at all. Which bird rises is fixed by
//     REGISTER ROLE (`JSR OSTXDN` on U, `JSR OSTXUP` on X — :5106/:5108), not by
//     where either one is.
//
// So "apply the bounce first" means two different things for the two parties,
// exactly as the story feared, and the discriminator is testable: MIRROR the
// geometry. Under SNETHD the vertical roles SWAP; under SNPTHD they do not.
// That pair of tests is the whole answer, and neither can pass by accident.
//
// Two further facts read off the same block, recorded but deliberately NOT
// asserted here (see the session's Delivery Findings):
//   • `LBEQ OSTLR` (:5045) is UNREACHABLE — `LBPL` (:5044) already branches on
//     zero. An exact pixel tie therefore takes OSTUTP, not the horizontal-only
//     path a reader of :5045 would expect.
//   • The two paths return OPPOSITE carry — `JMP HITEM2` (`ANDCC #$FE`, :4947)
//     clears it, `OSTX12` (`ORCC #$01`, :5059) sets it. The scan for the current
//     object CONTINUES after an enemy thud and ABORTS after a player tie.
//
// ─── SNPTHD IS NOT "TWO PLAYERS" ─────────────────────────────────────────────
// The derived AC3 says the player thud fires "when two players collide at the
// same height". The machine says otherwise, twice:
//   :8124  SNPTHD FCB 020,…  AT LEAST 1 PERSON THUD'ED     ← "AT LEAST 1"
//   :5094  * PLAYER VS. PLAYER & ENEMY VS. PLAYER
// `OSTBO` (:5002) is reached for buzzard-vs-player as well as player-vs-player,
// and its :5010 `BEQ 1$  BR=BOTH ON SAME LEVEL` is the only door to SNPTHD. So
// the partition over a `bounce` outcome is total and has exactly two cells, and
// it is the one `resolveJoust` already computes:
//   both parties enemy   (joust.ts  ↔  :4961)  -> enemy-thud   (SNETHD)
//   otherwise, ha === hb (joust.ts  ↔  :5010)  -> player-thud  (SNPTHD)
// The measured seeded windows below land one of each, and the player one is a
// buzzard walking through a standing knight — a case AC3 as written would have
// left silent.
//
// ─── HAZARD C: THE SEAM SUITE CANNOT SEE EMITTERS ────────────────────────────
// Measured on jt5-1: the manifest sweep, the dispatch sweep and the coverage
// check all read the same `EVENT_KINDS` tuple, so they agree with each other
// whether or not a single event ever fires — six of eleven cues could have been
// deleted with the whole project green. jt5-3 beat it by staging the exact
// moment and asserting EXACT streams; its Reviewer deleted each emitter in turn
// and scored 13/5/5/1 reds.
//
// Everything in the DECLARATION group below is therefore necessary and NOT
// sufficient. Every behavioural assertion in this file:
//   • stages a real `stepDemo`/`stepGame` and reads `DemoState.cues` /
//     `GameState.events` — the seam the shell actually plays from;
//   • asserts an EXACT stream (`toEqual`), never `toContain`, so a cue on the
//     wrong frame fails as loudly as one that never fires;
//   • asserts the frame BEFORE, or the same staging moved APART, is clean;
//   • and — this story's addition — asserts the PHYSICS on the same frame, so a
//     cue cannot be green while the birds still pass through each other.
//
// ─── HOW THE FIXTURES ARE STAGED, AND WHY A `nap` OF 100000 IS THE POINT ─────
// `collisionPass` runs over the whole process list; it does not consult `nap`.
// A process parked asleep therefore still COLLIDES while its flight step never
// runs — so its velocity and position change for exactly one reason, the
// bounce, and gravity cannot smear the measurement. Every frozen fixture below
// was run on the pre-story tree first: each resolves a `bounce`, emits `[]`,
// removes nothing, and leaves both entities byte-identical. That is what makes
// the exact streams honest rather than brittle, and it is why the `kill`
// control beside them (which DOES emit and DOES remove) is not optional.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { EVENT_KINDS, type GameEvent } from '../src/core/events.js'
import { CHANNELS, CUE_SOURCES, SOUNDS, type CueSource } from '../src/shell/audio.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(root, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

/** Read a line (1-based) from the vendored tree. Only ever called inside an
 *  `it()` — the tp1-8 collection trap: a module-scope read kills the file on CI. */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  const line = readFileSync(p, 'latin1').split('\n')[n - 1]
  if (line === undefined) throw new Error(`${file} has no line ${n}`)
  return line
}

// ─── the two kinds and the two cues this story adds ──────────────────────────

const PLAYER_THUD = 'player-thud'
const ENEMY_THUD = 'enemy-thud'
const THUD_KINDS: readonly string[] = [PLAYER_THUD, ENEMY_THUD]

/** cue name -> the Williams table it must cite, its priority byte and its row. */
const THUD_CUES: Readonly<
  Record<string, { table: string; priority: number; line: number; comment: string; callSite: number }>
> = {
  playerThud: {
    table: 'SNPTHD',
    priority: 20,
    line: 8124,
    comment: "AT LEAST 1 PERSON THUD'ED",
    callSite: 5014,
  },
  enemyThud: {
    table: 'SNETHD',
    priority: 9,
    line: 8106,
    comment: 'ENEMIES THUD',
    callSite: 5019,
  },
}

// Widened views: the two kinds are not in the shipped union yet, so the RED tree
// must reach them through `string` or it cannot `npm run lint`.
const kindsTuple = EVENT_KINDS as readonly string[]
const cueSources = CUE_SOURCES as unknown as Readonly<Record<string, CueSource | undefined>>
const sounds = SOUNDS as unknown as Readonly<Record<string, string | undefined>>
const channels = CHANNELS as unknown as Readonly<Record<string, string | undefined>>
const asEvent = (type: string): GameEvent => ({ type }) as unknown as GameEvent

/** A cue's ROM priority, or −1 where it is an invention / missing. */
function priorityOf(cue: string): number {
  const s = cueSources[cue]
  return s !== undefined && s.kind === 'rom' ? s.priority : -1
}

// ─── reading the emitted stream ──────────────────────────────────────────────

const IDLE: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const DIRS: readonly (-1 | 0 | 1)[] = [-1, -1, 0, 1, 1]
/** jt5-1's and jt5-3's shared script, re-used verbatim so the frame numbers
 *  below sit in the same coordinate system as the fingerprints they guard. */
const scripted = (frame: number): PlayerInput => {
  const flap = frame % 13 === 0
  return { dir: DIRS[frame % 5], flap, flapHeld: flap }
}
const inputsAt = (frame: number): Record<number, PlayerInput> => ({ 1: scripted(frame), 2: IDLE })

const cuesOf = (d: DemoState): string[] => d.cues.map((c) => c.type as string)
const eventsOf = (g: GameState): string[] => g.events.map((e) => e.type as string)
const thudsOf = (kinds: string[]): string[] => kinds.filter((k) => THUD_KINDS.includes(k))

// ─── staging ─────────────────────────────────────────────────────────────────

/** A nap no window in this file reaches: the process is FROZEN. It still
 *  collides (collisionPass never reads `nap`) but never takes a flight step, so
 *  the only thing that can move it is the bounce. */
const FROZEN = 100_000

const entity = (posXpx: number, posYpx: number, velY: number, plantZ = 0): EntityState => ({
  posX: posXpx,
  posY: posYpx << 8,
  velXIndex: 0,
  velXFrac: 0,
  velY,
  timeUp: 10,
  groundState: null,
  plantZ,
  airborne: true,
  animPhase: 0,
})

const enemyProcess = (id: number, e: EntityState, nap = FROZEN): DemoProcess => ({
  id,
  cls: 'secondary',
  nap,
  period: nap,
  kind: 'enemy',
  enemyType: 'bounder',
  enemy: { entity: e, facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' } as EnemyState,
})

const playerProcess = (id: number, e: EntityState, nap = FROZEN): DemoProcess => ({
  id,
  cls: 'primary',
  nap,
  period: nap,
  kind: 'player',
  entity: e,
  facing: 1,
})

/** A demo whose process list is exactly the one handed in. `budget` is pinned so
 *  no buzzard is promoted out of LINET mid-window. */
function stage(processes: DemoProcess[]): DemoState {
  const base = createWaveDemo(0x1234)
  return {
    ...base,
    sim: { ...base.sim, processes, budget: { nsmart: 0, wsmart: 0 } },
  }
}

const procOf = (d: DemoState, id: number): DemoProcess | undefined =>
  d.sim.processes.find((p) => p.id === id)
const entityOf = (d: DemoState, id: number): EntityState | undefined => {
  const p = procOf(d, id)
  return p?.entity ?? p?.enemy?.entity
}
const velYOf = (d: DemoState, id: number): number | undefined => entityOf(d, id)?.velY
const pixelYOf = (d: DemoState, id: number): number | undefined => {
  const e = entityOf(d, id)
  return e === undefined ? undefined : e.posY >> 8
}

const A = 0xa01
const B = 0xa02
const P1 = 1
const P2 = 2
/** A third bird parked far away and frozen — nothing in a two-body bounce may
 *  reach it. Also keeps a wave-clear from firing in the player-only fixtures. */
const FAR = 0xa99
const farBird = (): DemoProcess => enemyProcess(FAR, entity(20, 40, 64))

/**
 * Descending at +64. `bounceTop` inverts and halves a DESCENDING velocity
 * (`-velY >> 1` = −32) and `bounceBottom` leaves it alone — so after a bounce
 * the bird that went UP is the one reading −32 and the bird that went DOWN is
 * the one still reading +64. That is the whole observable, and it is exactly
 * OSTXUP's `BLE 2$` / OSTXDN's `BGE 2$` wrong-way guard.
 */
const DESCENDING = 64
const UP_FROM_DESCENDING = -32
/** And the other polarity: rising at −64 leaves the UP bird alone and inverts
 *  the DOWN bird to +32. */
const RISING = -64
const DOWN_FROM_RISING = 32

// ═════════════════════════════════════════════════════════════════════════════
// The ROM law re-opens, byte for byte — the evidence every group below rests on
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-4 — the two thud paths re-open in JOUSTRV4.SRC', () => {
  it('both cues exist, at DIFFERENT priorities, sending the SAME 6-bit code', () => {
    // 020 vs 009 on an identical `!N$08!+$80,30,$00,1` payload: two sounds,
    // never one — the same shape as the SNEDIE/SNPDIE death pair.
    expect(vendoredLine('JOUSTRV4.SRC', 8124)).toBe(
      "SNPTHD\tFCB\t020,!N$08!+$80,30,$00,1\tAT LEAST 1 PERSON THUD'ED",
    )
    expect(vendoredLine('JOUSTRV4.SRC', 8106)).toBe(
      'SNETHD\tFCB\t009,!N$08!+$80,30,$00,1\tENEMIES THUD',
    )
  })

  it('each is played from its own call site, and the cue precedes the bump', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 5014)).toBe('1$\tLDX\t#SNPTHD\t\tPLAYERS COLIDE')
    expect(vendoredLine('JOUSTRV4.SRC', 5015)).toBe('\tJSR\tVSND')
    expect(vendoredLine('JOUSTRV4.SRC', 5019)).toBe('OSTHT2\tLDX\t#SNETHD\t\tENEMIES COLIDE')
    expect(vendoredLine('JOUSTRV4.SRC', 5020)).toBe('\tJSR\tVSND')
    // The bump is BELOW both `JSR VSND`s, on both paths.
    expect(vendoredLine('JOUSTRV4.SRC', 5028)).toBe(
      'OSTH11\tJSR\tOSTBMP\t\tNO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5053)).toBe(
      'OSTXTT\tJSR\tOSTXTP\t\tREG.X WILL BE RESTORIED',
    )
  })

  it('the branch map: enemies bypass the joust, a player tie reaches OSTBO', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 4961)).toBe(
      '\tBNE\tOSTHT2\t\t BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5010)).toBe('\tBEQ\t1$\t\t BR=BOTH ON SAME LEVEL')
    expect(vendoredLine('JOUSTRV4.SRC', 5016)).toBe('\tLDX\tCOLOBJ')
    expect(vendoredLine('JOUSTRV4.SRC', 5017)).toBe('\tBRA\tOSTXTT')
  })

  it('THE ANSWER — the player-involved tie is a client of the bouncer', () => {
    // The three-line header that settles the story's open question. `OSTXTT`
    // (:5053, above) is nothing but a `JSR` into this routine.
    expect(vendoredLine('JOUSTRV4.SRC', 5093)).toBe('*\t BOUNCER ROUTINE')
    expect(vendoredLine('JOUSTRV4.SRC', 5094)).toBe(
      '*\tPLAYER VS. PLAYER & ENEMY VS. PLAYER & ENEMY VS. ENEMY',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5095)).toBe('*\t& PTERODACTYL VS. PTERODACTYL')
  })

  it('SNETHD dispatches on SCREEN Y; SNPTHD does not dispatch at all', () => {
    // OSTBMP compares the two PPOSY+1 bytes and picks an arm. Both arms send the
    // physically higher bird up, so height alone decides.
    expect(vendoredLine('JOUSTRV4.SRC', 5042)).toBe(
      'OSTBMP\tLDB\tPPOSY+1,X\tDETERMINATION OF WHO HAS BEEN BUMPED',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5043)).toBe('\tSUBB\tPPOSY+1,U')
    expect(vendoredLine('JOUSTRV4.SRC', 5044)).toBe('\tLBPL\tOSTUTP')
    expect(vendoredLine('JOUSTRV4.SRC', 5046)).toBe('\tJMP\tOSTXTP')
    expect(vendoredLine('JOUSTRV4.SRC', 5099)).toBe('\tJSR\tOSTXUP\t\tMOVE REG.U GUY UP')
    expect(vendoredLine('JOUSTRV4.SRC', 5101)).toBe('\tJSR\tOSTXDN\t\t & REG.X GUY DOWN')
    expect(vendoredLine('JOUSTRV4.SRC', 5106)).toBe('\tJSR\tOSTXDN\t\tMOVE REG.U GUY DOWN')
    expect(vendoredLine('JOUSTRV4.SRC', 5108)).toBe('\tJSR\tOSTXUP\t\t & REG.X GUY UP')
  })

  it('the vertical law: ±2 pixels, and the WRONG-WAY velocity only', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 5163)).toBe('OSTXUP\tLDA\t#-2')
    expect(vendoredLine('JOUSTRV4.SRC', 5164)).toBe(
      '\tSTA\tPBUMPY,X\t\tX IS ON TOP, MAKE X GO UP',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5166)).toBe('\tBLE\t2$')
    expect(vendoredLine('JOUSTRV4.SRC', 5170)).toBe('\tASRA\t\t\tSLOW DOWN A BIT')
    expect(vendoredLine('JOUSTRV4.SRC', 5175)).toBe('OSTXDN\tLDA\t#2')
    expect(vendoredLine('JOUSTRV4.SRC', 5176)).toBe(
      '\tSTA\tPBUMPY,X\t\tU IS ON TOP, MAKE X LOWER',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5178)).toBe('\tBGE\t2$')
    // …and the register is spent WHOLE by the flight loop, one frame later.
    expect(vendoredLine('JOUSTRV4.SRC', 6495)).toBe('\tADDA\tPBUMPY,U\tADD IN BUMPING REGISTER')
    expect(vendoredLine('JOUSTRV4.SRC', 6496)).toBe('\tCLR\tPBUMPY,U')
  })

  it('the re-opens are DISCRIMINATING — a neighbouring line is not the cited one', () => {
    // Without this, every group above could be passing because `vendoredLine`
    // returned whatever it was compared against.
    expect(vendoredLine('JOUSTRV4.SRC', 8124)).not.toBe(vendoredLine('JOUSTRV4.SRC', 8106))
    expect(vendoredLine('JOUSTRV4.SRC', 5099)).not.toBe(vendoredLine('JOUSTRV4.SRC', 5106))
    expect(vendoredLine('JOUSTRV4.SRC', 5163)).not.toBe(vendoredLine('JOUSTRV4.SRC', 5175))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2/AC3 — DECLARATION. Necessary, and (Hazard C) nowhere near sufficient.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-4 — the two thud kinds join the core union', () => {
  it('EVENT_KINDS names both', () => {
    expect(kindsTuple.length, 'precondition: the tuple is not empty').toBeGreaterThan(0)
    for (const kind of THUD_KINDS) {
      expect(kindsTuple, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
    }
  })

  it('there is no BARE `thud` — 020 and 009 are two sounds, never one', () => {
    // The collapse this file exists to prevent. SNPTHD and SNETHD send the same
    // 6-bit code $08 and differ only in priority, which is exactly the shape
    // that tempts a single kind — and a single kind cannot be arbitrated by the
    // priority jt5-5 owns.
    expect(kindsTuple, "a bare 'thud' collapses SNPTHD and SNETHD into one cue").not.toContain(
      'thud',
    )
    expect(new Set(kindsTuple).size, 'no duplicates anywhere in the tuple').toBe(kindsTuple.length)
  })

  it('the fifteen kinds jt5-1 and jt5-3 shipped survive — this story ADDS', () => {
    for (const kind of [
      'enemy-death',
      'player-death',
      'egg-collected',
      'egg-hatched',
      'ptero-arrives',
      'ptero-death',
      'player-materialise',
      'enemy-materialise',
      'extra-man',
      'wave-bounty',
      'cliff-destroyed',
      'player-wing-down',
      'player-wing-up',
      'enemy-wing-down',
      'enemy-wing-up',
    ]) {
      expect(kindsTuple, `'${kind}' was dropped`).toContain(kind)
    }
  })
})

describe('jt5-4 — each thud cue cites its own Williams table', () => {
  it('the manifest, channel map and provenance all carry both cues', () => {
    for (const cue of Object.keys(THUD_CUES)) {
      expect(sounds[cue], `SOUNDS has no '${cue}'`).toBeTruthy()
      expect(channels[cue], `CHANNELS has no '${cue}'`).toBeTruthy()
      expect(cueSources[cue], `CUE_SOURCES has no '${cue}'`).toBeTruthy()
    }
    const files = Object.keys(THUD_CUES).map((c) => sounds[c])
    expect(new Set(files).size, 'two cues, two distinct samples').toBe(2)
  })

  it('each cites the right TABLE, PRIORITY, ROW and CALL SITE', () => {
    for (const [cue, want] of Object.entries(THUD_CUES)) {
      const src = cueSources[cue]
      expect(src, `CUE_SOURCES has no '${cue}'`).toBeTruthy()
      expect(src?.kind, `'${cue}' must be ROM-cited, not an invention`).toBe('rom')
      if (src === undefined || src.kind !== 'rom') continue
      expect(src.table, `'${cue}' cites the wrong table`).toBe(want.table)
      expect(src.priority, `'${cue}' cites the wrong priority byte`).toBe(want.priority)
      expect(src.romComment, `'${cue}' quotes the wrong row comment`).toBe(want.comment)
      expect(src.source.line, `'${cue}' cites the wrong table row`).toBe(want.line)
      expect(src.callSite.line, `'${cue}' cites the wrong call site`).toBe(want.callSite)
    }
  })

  it('the PERSON thud outranks the ENEMY thud, as the machine has it', () => {
    // 020 vs 009 is the only thing separating two identical payloads, so it is a
    // fact about the cue set and not a detail of one entry. jt5-5 owns building
    // arbitration on it; this story only records it truthfully.
    expect(priorityOf('playerThud')).toBe(20)
    expect(priorityOf('enemyThud')).toBe(9)
    expect(priorityOf('playerThud')).toBeGreaterThan(priorityOf('enemyThud'))
  })

  it('two cues share a channel ONLY when they share a ROM priority', () => {
    // audio.ts's rule, swept over the whole map rather than hard-coded, so it
    // still bites for the two cues this story adds (020 and 009 are distinct
    // priorities, so they need distinct channels and cannot join prio-6/10).
    const byChannel = new Map<string, string[]>()
    for (const [cue, chan] of Object.entries(channels)) {
      if (chan === undefined) continue
      byChannel.set(chan, [...(byChannel.get(chan) ?? []), cue])
    }
    const clashes: string[] = []
    for (const [chan, cues] of byChannel) {
      const priorities = new Set(
        cues.map((c) => (priorityOf(c) >= 0 ? `prio:${priorityOf(c)}` : `invention:${c}`)),
      )
      if (priorities.size > 1)
        clashes.push(`${chan}: ${cues.join(', ')} span ${[...priorities].join('/')}`)
    }
    expect(clashes, 'a shared channel means the engine steals; only equal priorities may').toEqual(
      [],
    )
  })
})

describe('jt5-4 — the dispatch plays a distinct sound for each thud', () => {
  it('two kinds in, two DISTINCT cues out, in order', () => {
    const played: string[] = []
    // `tick` is jt5-5's per-frame clock on the same seam; unrecorded because this
    // test counts the CUES the thuds produce, and a frame tick is not one.
    const recorder = { play: (name: string): void => void played.push(name), tick: () => {} }
    const sink = recorder as unknown as Parameters<typeof playEventSounds>[0]
    playEventSounds(sink, [asEvent(PLAYER_THUD), asEvent(ENEMY_THUD)])
    expect(played, 'a kind that falls through the switch is a silent cue').toEqual([
      'playerThud',
      'enemyThud',
    ])
  })

  it('the thuds are not routed onto some OTHER cue', () => {
    const played: string[] = []
    // `tick` is jt5-5's per-frame clock on the same seam; unrecorded because this
    // test counts the CUES the thuds produce, and a frame tick is not one.
    const recorder = { play: (name: string): void => void played.push(name), tick: () => {} }
    const sink = recorder as unknown as Parameters<typeof playEventSounds>[0]
    playEventSounds(sink, [asEvent(ENEMY_THUD)])
    expect(played).toEqual(['enemyThud'])
    expect(played, 'a thud collapsed onto the death cue').not.toContain('enemyDeath')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1/AC4 — HAZARD A: the bounce is APPLIED, on the frame the cue is emitted
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-4 — SNETHD: two enemies thud AND are pushed apart', () => {
  it('the fixture is real: a bounce, no removal, and today it is SILENT and INERT', () => {
    // The staging honesty check, and the reason every `toEqual` below can be an
    // exact array. Green on arrival; it is what the assertions rest on.
    const before = stage([enemyProcess(A, entity(100, 92, DESCENDING)), enemyProcess(B, entity(104, 94, DESCENDING))])
    const after = stepDemo(before, {})
    expect(after.sim.processes.length, 'a bounce removes nobody and spawns nobody').toBe(2)
    expect(after.sim.processes.map((p) => p.id), 'and re-orders nobody').toEqual([A, B])
  })

  it('the thud fires, exactly once, on the frame of the contact', () => {
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, DESCENDING)),
        enemyProcess(B, entity(104, 94, DESCENDING)),
      ]),
      {},
    )
    expect(cuesOf(d), 'one thud per PAIR — not one per bird, not none').toEqual([ENEMY_THUD])
  })

  it('and the SAME frame applies the bounce — the higher bird is thrown UP', () => {
    // Hazard A, in one assertion: the cue and the velocity change are read off
    // ONE `stepDemo`. A implementation that emits and does not push fails here
    // with the cue assertion green.
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, DESCENDING)), // higher on screen
        enemyProcess(B, entity(104, 94, DESCENDING)),
      ]),
      {},
    )
    expect(cuesOf(d), 'precondition: the thud really fired on this frame').toEqual([ENEMY_THUD])
    expect(velYOf(d, A), 'the HIGHER bird takes OSTXUP: a descending velY inverts and halves').toBe(
      UP_FROM_DESCENDING,
    )
    expect(velYOf(d, B), 'the LOWER bird takes OSTXDN: already descending, so left alone').toBe(
      DESCENDING,
    )
  })

  it('MIRROR the geometry and the roles SWAP — OSTBMP dispatches on screen Y', () => {
    // The discriminator against a hard-coded "the first one goes up". Same two
    // processes, same order, same velocities: only the Ys are exchanged.
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 94, DESCENDING)),
        enemyProcess(B, entity(104, 92, DESCENDING)), // now B is the higher one
      ]),
      {},
    )
    expect(cuesOf(d), 'precondition: the mirrored staging still thuds').toEqual([ENEMY_THUD])
    expect(velYOf(d, B), 'B is higher now, so B takes OSTXUP').toBe(UP_FROM_DESCENDING)
    expect(velYOf(d, A), 'and A takes OSTXDN').toBe(DESCENDING)
  })

  it('a RISING pair inverts the other one — the wrong-way guard, both ways', () => {
    // OSTXUP's `BLE 2$` (:5166) and OSTXDN's `BGE 2$` (:5178). With both birds
    // already climbing it is the DOWN one whose velocity is wrong-way.
    const d = stepDemo(
      stage([enemyProcess(A, entity(100, 92, RISING)), enemyProcess(B, entity(104, 94, RISING))]),
      {},
    )
    expect(cuesOf(d), 'precondition: the thud fired').toEqual([ENEMY_THUD])
    expect(velYOf(d, A), 'the higher bird is already rising — OSTXUP leaves it alone').toBe(RISING)
    expect(velYOf(d, B), 'the lower bird is climbing the wrong way — OSTXDN inverts and halves').toBe(
      DOWN_FROM_RISING,
    )
  })

  it('an EXACT pixel tie still separates them, and the ROM sends A (register U) up — never B', () => {
    // `LBPL OSTUTP` (:5044) branches on zero too, so an equal-Y pair still takes
    // the OSTUTP arm rather than a horizontal-only bounce, and OSTUTP is NOT a
    // coin flip: it unconditionally sends REG.U up (:5099) and REG.X down
    // (:5101). This port's pair loop plays `a` (eligible[i], the OUTER object)
    // as U and `b` (eligible[j], the one the INNER loop found) as X — settled by
    // the SCAN DRIVER, not the bouncer (JOUSTRV4.SRC:4874 `LDU PLINK,U` walks
    // the process list into U; :4880 `LEAX ,U` / :4881 `LDX PLINK,X` starts X AT
    // U and walks it forward, so U is always the earlier element of a pair and
    // X always a later one). So on an exact tie the ROM deterministically sends
    // A up, never B — this used to be a symmetric `length === 1` count on both
    // sides, which cannot fail: flipping the tie's `<=` to `<` sent the rise to
    // B instead of A and the old assertion stayed green.
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 94, DESCENDING)),
        enemyProcess(B, entity(104, 94, DESCENDING)),
      ]),
      {},
    )
    expect(cuesOf(d), 'precondition: the thud fired').toEqual([ENEMY_THUD])
    expect(
      velYOf(d, A),
      'A is U: an exact tie is >=0, LBPL takes OSTUTP, and OSTUTP sends U up',
    ).toBe(UP_FROM_DESCENDING)
    expect(velYOf(d, B), 'B is X: OSTUTP sends X down; already descending, so left alone').toBe(
      DESCENDING,
    )
  })

  it('the tie compares the WHOLE PIXEL (PPOSY+1), not the raw sub-pixel value', () => {
    // OSTBMP's `LDB PPOSY+1,X` (:5042) reads the PIXEL byte at offset +1 — one
    // level coarser than the full fixed-point `posY` — so two birds sharing a
    // pixel but differing only in sub-pixel fraction must STILL take the
    // whole-pixel tie arm (A up, per the guard above), not whichever one
    // happens to hold the larger raw `posY`. A sits at pixel 94 with a LARGER
    // raw fraction than B, who also sits at pixel 94: the whole-pixel compare
    // (94 <= 94) sends A up regardless, but a sub-pixel compare of the raw
    // fixed-point value (A's posY > B's posY here) would send B up instead —
    // a mistake the guard above cannot see, because entity() never gives two
    // birds the same pixel with different fractions.
    const higherFraction = { ...entity(100, 94, DESCENDING), posY: (94 << 8) + 200 }
    const lowerFraction = { ...entity(104, 94, DESCENDING), posY: (94 << 8) + 50 }
    expect(
      higherFraction.posY >> 8,
      'precondition: both birds share the same whole pixel',
    ).toBe(lowerFraction.posY >> 8)
    expect(
      higherFraction.posY,
      'precondition: they differ in raw sub-pixel value',
    ).not.toBe(lowerFraction.posY)
    const d = stepDemo(
      stage([enemyProcess(A, higherFraction), enemyProcess(B, lowerFraction)]),
      {},
    )
    expect(cuesOf(d), 'precondition: the thud fired').toEqual([ENEMY_THUD])
    expect(
      velYOf(d, A),
      'the WHOLE-PIXEL tie still sends A (U) up, regardless of the sub-pixel fraction',
    ).toBe(UP_FROM_DESCENDING)
    expect(velYOf(d, B), 'and B (X) down').toBe(DESCENDING)
  })

  it('TWO disjoint pairs on one frame thud TWICE — the loop does not stop at the first', () => {
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, DESCENDING)),
        enemyProcess(B, entity(104, 94, DESCENDING)),
        enemyProcess(0xb01, entity(200, 60, DESCENDING)),
        enemyProcess(0xb02, entity(204, 62, DESCENDING)),
      ]),
      {},
    )
    expect(cuesOf(d), 'two overlapping pairs are two thuds').toEqual([ENEMY_THUD, ENEMY_THUD])
    expect(velYOf(d, 0xb01), 'the SECOND pair is bounced too, not merely counted').toBe(
      UP_FROM_DESCENDING,
    )
  })
})

describe('jt5-4 — SNPTHD: a tie involving a PERSON', () => {
  /**
   * A tie whose two birds are at DIFFERENT screen Ys. `plantHeight` is
   * `plantZ + (posY >> 8)` (joust.ts), so a skidding bird's `PLANTZ = 2`
   * ("A LANTZ 2 PIXELS LOWER", :6071) ties with a bird two pixels lower down.
   * That is the ONLY staging that can tell OSTBMP's height dispatch apart from
   * OSTXTT's unconditional `JSR OSTXTP`, and it is why this story needed the
   * ROM read rather than a guess.
   *
   * DISCLOSED, not hidden: `airborne: true` with `plantZ: 2` is legal state but
   * not a combination ordinary play produces, because PLANTZ=2 is the SKID and
   * the skid is a ground state. The law under test does not depend on the
   * staging being reachable — a tie is a tie — and the reachable half of the
   * same law is pinned separately by the seed-0x2468 frame-189 window below,
   * where a walking buzzard meets a standing knight with nothing synthetic
   * about it.
   */
  const tie = (skidderAtTop: boolean): DemoProcess[] =>
    skidderAtTop
      ? [playerProcess(P1, entity(100, 92, DESCENDING, 2)), enemyProcess(A, entity(104, 94, DESCENDING, 0))]
      : [playerProcess(P1, entity(100, 94, DESCENDING, 0)), enemyProcess(A, entity(104, 92, DESCENDING, 2))]

  it('a BUZZARD vs a KNIGHT at the same lance height is a PERSON thud, not an enemy one', () => {
    // The correction to the derived AC3. ":8124 AT LEAST 1 PERSON THUD'ED" and
    // ":5094 ENEMY VS. PLAYER". A rule keyed on "two players" leaves the
    // commonest tie in the game silent.
    const d = stepDemo(stage(tie(true)), { [P1]: IDLE })
    expect(cuesOf(d)).toEqual([PLAYER_THUD])
    expect(cuesOf(d), 'this is the SNPTHD path, not the SNETHD one').not.toContain(ENEMY_THUD)
  })

  it('two KNIGHTS at the same height thud too', () => {
    const d = stepDemo(
      stage([
        playerProcess(P1, entity(100, 94, DESCENDING)),
        playerProcess(P2, entity(104, 94, DESCENDING)),
        farBird(),
      ]),
      { [P1]: IDLE, [P2]: IDLE },
    )
    expect(cuesOf(d)).toEqual([PLAYER_THUD])
  })

  it('and the bounce lands on the same frame — the ROM sends X up and U down, never the reverse', () => {
    // ABSOLUTE, not a count. `OSTXTP` (:5104-5108) is unconditional and names its
    // two parties by REGISTER: `:5106 JSR OSTXDN  MOVE REG.U GUY DOWN` and
    // `:5108 JSR OSTXUP  & REG.X GUY UP`. Which party is which is settled by the
    // SCAN DRIVER, not by this port (`:4874 LDU PLINK,U` walks the process list
    // into U; `:4880 LEAX ,U` / `:4881 LDX PLINK,X` starts X AT U and walks it
    // forward), so U is always the EARLIER element of a pair — here `P1`,
    // `eligible[0]` — and X always a LATER one — here `A`.
    //
    // This used to count `filter(v => v === UP_FROM_DESCENDING).length === 1` on
    // both birds, which is symmetric by construction and CANNOT FAIL: swapping
    // `bounceBottom(a)`/`bounceTop(b)` at demo.ts inverted both roles and
    // left it green. The count assertions are kept below the absolute ones —
    // they are what catches a bounce that separates NOBODY.
    const d = stepDemo(stage(tie(true)), { [P1]: IDLE })
    expect(cuesOf(d), 'precondition: the thud really fired on this frame').toEqual([PLAYER_THUD])
    expect(velYOf(d, A), 'A is X (eligible[1]): OSTXTP sends REG.X UP, :5108').toBe(
      UP_FROM_DESCENDING,
    )
    expect(velYOf(d, P1), 'P1 is U (eligible[0]): OSTXTP sends REG.U DOWN, :5106').toBe(DESCENDING)
    const vys = [velYOf(d, P1), velYOf(d, A)]
    expect(vys.filter((v) => v === UP_FROM_DESCENDING).length, 'exactly one takes OSTXUP').toBe(1)
    expect(vys.filter((v) => v === DESCENDING).length, 'and exactly one takes OSTXDN').toBe(1)
  })

  it('THE ANSWER — mirroring the geometry does NOT swap the roles', () => {
    // `OSTXTT` calls `OSTXTP` UNCONDITIONALLY (:5053): the player-involved tie
    // never runs OSTBMP, so it never looks at where either bird is. This is the
    // one assertion in the file that could not be guessed from the story, and it
    // is the reason SM handed the branch over as a question.
    //
    // Both stagings keep the SAME processes in the SAME order and only exchange
    // the two Ys; under the enemy path (above) that swap moves the rise from one
    // bird to the other, and here it must not.
    const top = stepDemo(stage(tie(true)), { [P1]: IDLE })
    const bottom = stepDemo(stage(tie(false)), { [P1]: IDLE })
    expect(cuesOf(top), 'precondition: staging A thuds').toEqual([PLAYER_THUD])
    expect(cuesOf(bottom), 'precondition: staging B thuds').toEqual([PLAYER_THUD])

    const riser = (d: DemoState): number[] =>
      [P1, A].filter((id) => velYOf(d, id) === UP_FROM_DESCENDING)
    expect(riser(top).length, 'precondition: A really bounced').toBe(1)
    expect(riser(bottom).length, 'precondition: B really bounced').toBe(1)
    // The ABSOLUTE pair carries the coverage; the relative assertion below is
    // kept for its failure message, not for unique reach. MEASURED both ways:
    //   • role INVERSION (swap bounceBottom(a)/bounceTop(b) at demo.ts)
    //     moves the rise in BOTH stagings at once, so the relative assertion
    //     stays green — only the absolute pair sees it.
    //   • GEOMETRY dispatch (make the person tie consult screen Y) diverges in
    //     `tie(true)` and AGREES in `tie(false)`: `tie(true)` puts P1 at pixel 92
    //     and A at 94, so `92 <= 94` sends P1 up — wrong — while `tie(false)`
    //     computes `94 <= 92` and sends A up, which is what the ROM does anyway.
    //     So `staging A` below catches it and `staging B` does not, and the
    //     relative assertion never fires at all.
    // Both mutations therefore redden `staging A`. Do NOT trim it as duplicate
    // of the relative check — that check catches neither.
    expect(riser(top), 'staging A: OSTXTP sends REG.X (=A) up, :5108').toEqual([A])
    expect(riser(bottom), 'staging B: the SAME register, though the geometry moved').toEqual([A])
    expect(
      riser(bottom),
      'the player tie routes through OSTXTT -> OSTXTP with no height test, ' +
        'so exchanging the two screen Ys must not move which bird rises',
    ).toEqual(riser(top))
  })

  it('the ENEMY path is the control — the SAME exchange DOES swap its roles', () => {
    // Without this, the assertion above is satisfied by an implementation that
    // ignores geometry everywhere, which would be wrong for SNETHD.
    const top = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, DESCENDING)),
        enemyProcess(B, entity(104, 94, DESCENDING)),
      ]),
      {},
    )
    const bottom = stepDemo(
      stage([
        enemyProcess(A, entity(100, 94, DESCENDING)),
        enemyProcess(B, entity(104, 92, DESCENDING)),
      ]),
      {},
    )
    const riser = (d: DemoState): number[] =>
      [A, B].filter((id) => velYOf(d, id) === UP_FROM_DESCENDING)
    expect(riser(top), 'precondition: the higher bird rose').toEqual([A])
    expect(riser(bottom), 'OSTBMP dispatches on screen Y, so the roles swap').toEqual([B])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — HAZARD A: no thud without a resolution, no resolution without a thud
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-4 — the sim RESOLVES what the thud announces', () => {
  it('the SAME staging moved apart is silent AND still — the negative control', () => {
    // Without this, every "the bounce landed" assertion is satisfied by code
    // that mangles velocities unconditionally.
    const d = stepDemo(
      stage([enemyProcess(A, entity(100, 92, DESCENDING)), enemyProcess(B, entity(180, 94, DESCENDING))]),
      {},
    )
    expect(cuesOf(d), 'no contact, no cue').toEqual([])
    expect(velYOf(d, A), 'no contact, no push').toBe(DESCENDING)
    expect(velYOf(d, B)).toBe(DESCENDING)
  })

  it('a KILL is not a thud — the outcome fork stays a fork', () => {
    // Player above the buzzard: strictly smaller plantHeight WINS (:5011).
    const d = stepDemo(
      stage([
        playerProcess(P1, entity(100, 92, DESCENDING)),
        enemyProcess(A, entity(104, 94, DESCENDING)),
      ]),
      { [P1]: IDLE },
    )
    expect(cuesOf(d), 'a lance-height WIN is a death, never a thud').toEqual(['enemy-death'])
    expect(thudsOf(cuesOf(d))).toEqual([])
  })

  it('the OVERLAP ENDS — today two staged buzzards sit inside each other for 97 frames', () => {
    // THE Hazard A guard, and the one that cannot be satisfied by a cue alone.
    // Measured on the pre-story tree: this pair of AWAKE buzzards resolves a
    // `bounce` on 97 consecutive frames with their pixel separation pinned at
    // exactly 2 the whole time, because nothing is ever applied. Once the bounce
    // lands they must come apart.
    let d = stage([
      enemyProcess(A, entity(100, 92, 0), 1),
      enemyProcess(B, entity(104, 94, 0), 1),
    ])
    let run = 0
    let maxSeparation = 0
    for (let f = 0; f < 120; f++) {
      d = stepDemo(d, {})
      const ya = pixelYOf(d, A)
      const yb = pixelYOf(d, B)
      if (ya !== undefined && yb !== undefined) maxSeparation = Math.max(maxSeparation, Math.abs(ya - yb))
      if (thudsOf(cuesOf(d)).length > 0) run += 1
      else if (run > 0) break
    }
    expect(run, 'precondition: the pair really did thud at all').toBeGreaterThan(0)
    expect(
      run,
      'the pair thudded on ~every frame of a 97-frame overlap: the cue is announcing a ' +
        'collision the sim still does not resolve',
    ).toBeLessThanOrEqual(24)
    expect(
      maxSeparation,
      'the two birds never got further apart than the 2 pixels they started at',
    ).toBeGreaterThan(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2/AC3 — EMISSION IN ORDINARY SEEDED PLAY, not only in staged fixtures
// ═════════════════════════════════════════════════════════════════════════════
//
// Both windows are OBSERVATIONS of the shipped sim under jt5-1's shared script.
// jt5-4 measured them on its pre-story tree (first thuds at 147 / 189); uf1-8's
// range-gated brains legitimately re-fly every smart buzzard, so both windows
// were RE-MEASURED on the post-uf1-8 tree: seed 0xbeef's first thud is now
// frame 119 (still enemy-vs-enemy), and seed 0x2468's whole early window is
// contact-free — its first thud moved out to frame 611, an enemy-vs-PLAYER
// bump. The claims are unchanged; only the measured frames moved.
//
// jt5-8 RE-MEASURED both windows again. 0xbeef's first thud is STILL frame 119
// and still enemy-vs-enemy. 0x2468's moved out again to 746 — and its
// enemy-vs-PLAYER character did not survive: with the dumb brain alternating,
// no seed this file used produces a person thud at all, so that case moved to a
// seed of its own (see the test below, which carries the sweep).
//
// jt9-24 RE-MEASURED both windows a final time. 0xbeef's first thud is STILL
// frame 119 and still enemy-vs-enemy. 0x2468, by contrast, no longer bounces AT
// ALL inside 1300 frames: the decoded SELPLY nearest-of-two metric re-routes its
// birds so every contact resolves as a kill, so its whole window is now
// thud-free (its pre-contact anchor below stands more firmly than ever, and its
// post-contact anchor moved off it — to 0xface, which still bounces at 119). The
// person-thud case, already rare, is now near-eliminated fleet-wide (see the
// SNPTHD test below, which carries the census).

describe('jt5-4 — the thuds happen in ordinary play', () => {
  const advanceTo = (seed: number, frame: number): GameState => {
    let g = createGame(seed)
    for (let i = 0; i < frame; i++) g = stepGame(g, inputsAt(i))
    return g
  }

  it('seed 0xbeef, frame 119: two buzzards collide and it is an ENEMY thud', () => {
    const before = stepGame(advanceTo(0xbeef, 118), inputsAt(118))
    expect(thudsOf(eventsOf(before)), 'the frame BEFORE is thud-free').toEqual([])
    const fired = stepGame(advanceTo(0xbeef, 119), inputsAt(119))
    expect(thudsOf(eventsOf(fired))).toEqual([ENEMY_THUD])
  })

  it('seed 0x1001, frame 1401: a buzzard bumps a knight — a PERSON thud', () => {
    // The case derived AC3 would have left silent: enemy-vs-player, not
    // player-vs-player. Measured — the frame before emits NOTHING at all, so both
    // streams can be asserted exactly: the thud arrives with the knight's own
    // wing-down cue (the scripted flap on a %13 frame), and nothing else.
    //
    // jt9-24 RE-BASELINE, and the SEED had to move — this is the empty-solution
    // case AC5 anticipates, re-found by sweeping and NOT by relaxing. The decoded
    // SELPLY nearest-of-two metric re-routes targeting so that almost every
    // equal-height approach now resolves as a KILL rather than a bump: a census
    // over 6000 seeds (frame window 1200) found only TWO producing a person-thud
    // at all, one of them clean — down from the "common" this file measured
    // pre-jt9-24 (jt9-1's census: 62 of 400 seeds in [0x2200,0x2390)). 0x1b4a is
    // the earliest clean person-thud in [0x1000,0x3000); its thud lands at frame
    // 1151, which is not a %13 flap frame, so the knight's own wing cue does not
    // ride along and the stream is EXACTLY the person thud, same as 0x2332 was.
    // The SNPTHD near-eliminating is a faithful consequence of the ROM metric,
    // recorded as a Delivery Finding — the mechanic is not gone, only rare.
    //
    // uf1-9 RE-BASELINE: seed 0x2468 frame 611 -> seed 0xface frame 260, and the
    // SEED had to move. Swept 1200 frames of all three seeds this file uses: with
    // the ROM wing cadence the knights are no longer bumped by a buzzard on either
    // 0x2468 or 0xbeef at all (both produce enemy-vs-enemy thuds only), so no
    // frame on those seeds can satisfy this test's precondition. 0xface frame 260
    // reproduces the shape exactly — a silent frame before, and a stream of
    // precisely `player-wing-down` + the person thud. Every assertion is unchanged.
    //
    // jt5-8 RE-BASELINE: seed 0xface frame 260 -> seed 0x2332 frame 973, and the
    // seed had to move AGAIN — this time off every seed the file uses. Swept
    // 2600 frames of all FOUR (0xbeef, 0x2468, 0x1a2b3c4d, 0xface) for this
    // test's own precondition: with the dumb brain alternating, not one of them
    // produces a `player-thud` anywhere in that window. The buzzards keep more
    // height, so what used to be a bump is a joust — every contact on those
    // seeds now resolves as a kill or as enemy-vs-enemy. AC5 of this story
    // anticipates exactly this case (a pin whose precondition has an EMPTY
    // solution set on the old seed) and requires it be re-found by sweeping, not
    // by relaxing the assertion. So a seed scan was run instead, and 0x2332 was
    // taken from it.
    //
    // jt9-1 (R-4) CORRECTS WHAT THAT SCAN PROVED. The line here used to say
    // 0x2221 (f=1241), 0x2332, 0x310f and 0x3442 (all f=973) "are the only
    // hits". They are each individually correct and 0x2332 remains a valid
    // choice — but they were never the only ones, and a future re-baseliner who
    // reads that sentence goes looking for a needle that is not rare. Two
    // independent censuses of the 400 seeds in [0x2200,0x2390) both refute it
    // and DISAGREE with each other on the number: the jt5-8 review counted 36
    // seeds producing a player-thud (20 at frame 973); a jt9-1 re-run counting
    // each seed's FIRST thud within 1100 frames found 62, none of them at 973.
    // Neither is wrong — they count different things — which is exactly why a
    // bare census number does not belong in this comment. What survives both
    // methods is the only claim worth making: SUCH SEEDS ARE COMMON, so if this
    // pin has to move again, scan and take the earliest rather than assuming
    // scarcity. Verified enemy-vs-PLAYER, not player-vs-player, from the process
    // positions: at the moment of contact player#1 is at (145,162) with
    // enemy#256 at (128,162) — the same row — while player#2 has never left its
    // spawn perch at (200,128), 55 px away. The stream is now EXACTLY the person
    // thud (frame 973 is not a %13 flap frame, so the knight's own wing cue does
    // not ride along), which makes the assertion strictly tighter than before.
    //
    // jt9-8 RE-BASELINE: seed 0x1b4a frame 1151 -> seed 0x1001 frame 1401, and the
    // SEED had to move again — AC5's empty-solution case, re-found by SWEEPING and
    // not by relaxing either assertion. 0x1b4a produces no `player-thud` anywhere
    // in 2600 frames once the flap-lift budget re-inits on a wing edge: the knight
    // no longer runs up an unbounded `timeUp` across a glide, so it arrives at the
    // buzzards' height on different frames and its old bump is gone.
    //
    // AND THE SWEEP WINDOW ITSELF WAS THE TRAP — record this, because two of the
    // re-baselines above nearly stalled on it. A sweep of ALL 8192 seeds in
    // [0x1000,0x3000) over 1300 frames finds person-thuds in abundance but ZERO
    // that satisfy this test's precondition; every one of them shares its frame
    // with a buzzard's wing cue. The window, not the seed space, is what was too
    // small: re-swept to 6000 frames, seeds 0x1001/0x1004/0x1006/0x100d/0x1012 all
    // qualify, the earliest of them at frame 1401. So if this pin has to move
    // again, DEEPEN the frame window before widening the seed range.
    //
    // 0x1001 is the earliest clean person-thud in [0x1000,0x3000) — 0x1000 itself
    // was swept for all 6000 frames and has none. Verified enemy-vs-PLAYER, not
    // player-vs-player, from the process positions: entering frame 1401 the
    // hatched buzzard `enemy#4260097` stands at (218,128) and knight `player#2` at
    // (200,128) — the same row — while `player#1` is 80 px away at (283,210) with
    // `enemy#256` beside it at (253,209), a different height and no contact. The
    // bounce lands on that pair and on nothing else: `player#2` is pushed DOWN to
    // y=130 (OSTXTP's `REG.U GUY DOWN`, :5106 — the knight is the earlier process)
    // and the buzzard UP to y=126 (`& REG.X GUY UP`, :5108). Frame 1401 is not a
    // %13 flap frame (1401 % 13 = 10), so the knight's own wing cue does not ride
    // along and the stream is EXACTLY the person thud, as it was on 0x2332/0x1b4a.
    //
    // jt9-43 RE-BASELINE: seed 0x1001 frame 1401 -> seed 0x1007 frame 344, and the
    // SEED had to move — the empty-solution case again, re-found by SWEEPING and not
    // by relaxing either assertion. Folding BPCOL's COLDX makes every contact screen-
    // precise, so 0x1001's old person-thud is gone. Swept [0x1000,0x1120) over 4000
    // frames for this test's precondition (a stream of EXACTLY one `player-thud` with a
    // silent frame before): 0x1007 frame 344 is the earliest clean hit. 344 % 13 = 6,
    // not a flap frame, so no knight wing cue rides along. Every assertion unchanged.
    const before = stepGame(advanceTo(0x1007, 343), inputsAt(343))
    expect(eventsOf(before), 'the frame BEFORE emits nothing at all').toEqual([])
    const fired = stepGame(advanceTo(0x1007, 344), inputsAt(344))
    expect(eventsOf(fired)).toEqual([PLAYER_THUD])
    expect(eventsOf(fired), 'this is the SNPTHD path, not the SNETHD one').not.toContain(ENEMY_THUD)
  })

  it('a replayed seed emits an identical per-frame thud stream', () => {
    const run = (seed: number): string[][] => {
      let g = createGame(seed)
      const perFrame: string[][] = []
      for (let f = 0; f < 200; f++) {
        g = stepGame(g, inputsAt(f))
        perFrame.push(thudsOf(eventsOf(g)))
      }
      return perFrame
    }
    const a = run(0xbeef)
    // Non-vacuity BEFORE the comparison: two empty runs match forever.
    expect(a.flat().length, 'the replay emitted no thuds at all').toBeGreaterThan(0)
    expect(run(0xbeef)).toEqual(a)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC7 — HAZARD D: which determinism pins may be re-baselined, and which may not
// ═════════════════════════════════════════════════════════════════════════════
//
// Applying the bounce moves birds, so seeded-replay fingerprints WILL move. That
// is the story, not damage. But a blanket re-baseline would absorb any other
// regression Dev introduces, so the ruling is drawn here rather than left to
// GREEN, and it is drawn at a MEASURED line — jt5-4's own line was the first
// non-killing contact (0xbeef 147, 0x2468/0x1a2b3c4d 189), because the bounce
// could not touch a frame before one.
//
// uf1-8 RE-BASELINE (2026-08-01): the range-gated episodic brains re-fly every
// SMART buzzard from its first promoted wake, so uf1-8's line is not a contact
// frame at all — every digest with a smart enemy in it moved, pre-contact
// included. What bounds THAT re-baseline instead: the players' entities are
// brain-free and bit-identical (value-checked against jt5-4's pinned arrays at
// frames 146/188/200; at 118 by construction — no contact has occurred in
// either tree), and `rng` is UNMOVED everywhere (neither the brains nor the
// bounce draw randomness). First thuds re-measured post-uf1-8:
//
//   seed 0xbeef      first non-killing contact at frame 119
//   seed 0x2468      first non-killing contact at frame 611
//   seed 0x1a2b3c4d  first non-killing contact at frame 611
//
// A future change that moves these digests again must bring its own justified
// line: player rows and `rng` moving is a REGRESSION under any story that does
// not touch player physics or the RNG schedule.
//
// jt5-8 RE-BASELINE (2026-08-02) meets that requirement, and its line is the
// same one uf1-9 drew: every PLAYER row is bit-identical at every anchor below,
// and so is `rng` — a dumb bird's wingbeat re-flies enemies and draws nothing.
// The dumb brain is the one EVERY enemy runs before promotion, so this time the
// moved row at each pre-contact anchor is the seed's still-dumb bird
// specifically, which is why the bound reads as "one enemy row" rather than
// "the smart ones". First contacts re-measured by sweeping 1300 frames of each
// seed for a thud — not inferred from the old numbers:
//
//   seed 0xbeef      first non-killing contact at frame 119   (unmoved)
//   seed 0x2468      first non-killing contact at frame 746   (was 611)
//   seed 0x1a2b3c4d  NO contact at all inside 1300 frames     (was 611)
//
// The 0x2468 move is why the post-contact anchor below is 755 and not 620: a
// "post-contact" pin whose contact has moved past it still passes, silently
// asserting the reverse of its own name.
//
// jt9-8 RE-BASELINE (2026-08-05) — `CLR PTIMUP,U`, the flap-lift budget re-inited
// on a PLAYER wing edge. This story inverts the bound every re-baseline above
// drew: it is the PLAYER row that legitimately moves at every anchor, and the
// ENEMY rows that must not, because the reset is reached only from
// `runBehaviour`'s player path (buzzard and ptero flight are untouched). Measured
// at all four anchors: `player#1` moved everywhere and EVERY enemy row is
// bit-identical everywhere, as is `rng`. First contacts re-swept, not inferred:
//
//   seed 0xbeef      first non-killing contact at frame 119   (unmoved)
//   seed 0xface      first non-killing contact at frame 119   (unmoved)
//   seed 0x2468      NO contact at all inside 1300 frames     (unmoved)
//
// A future change that moves an ENEMY row at these anchors without touching enemy
// flight is a regression whatever it claims.

describe('jt5-4 — the re-baseline is bounded at the first contact', () => {
  const fingerprint = (seed: number, frames: number) => {
    let g = createGame(seed)
    for (let i = 0; i < frames; i++) g = stepGame(g, inputsAt(i))
    return {
      frame: g.sim.sim.frame,
      rng: g.sim.sim.rng,
      wave: g.wave,
      procs: g.sim.sim.processes.map((p) => `${p.kind}#${p.id}`).join(','),
      scores: g.players.map((p) => p.score),
      lives: g.players.map((p) => p.lives),
    }
  }
  const entityDigest = (seed: number, frames: number): string[] => {
    let g = createGame(seed)
    for (let f = 0; f < frames; f++) g = stepGame(g, inputsAt(f))
    return g.sim.sim.processes.map((p) => {
      const e = p.entity ?? p.enemy?.entity
      return e
        ? `${p.kind}#${p.id}:${e.posX},${e.posY},${e.velY},${e.velXIndex},${e.velXFrac},${e.timeUp},${e.airborne ? 1 : 0}`
        : `${p.kind}#${p.id}:-`
    })
  }

  it('BEFORE the first contact, seed 0xbeef is bit-identical — frame 118', () => {
    // MEASURED post-uf1-8 (the first thud is now frame 119, so the pre-contact
    // anchor moved back from 146). The player rows are bit-identical to the
    // jt5-4 tree — a change that moves THEM is a regression whatever it claims.
    //
    // uf1-9 RE-BASELINE, and the guard's own claim survives intact: `player#1`,
    // `player#2`, `enemy#256`, `enemy#258` and every fingerprint field including
    // `rng` are BIT-IDENTICAL. Only `enemy#257` moved — the wing cadence changes
    // how a buzzard flies from its first wake, so a "pre-contact" window is not a
    // pre-CHANGE window for the enemies. It still is for the players, which is
    // what this test asserts.
    //
    // jt5-8 RE-BASELINE, and the guard's claim survives a third time in exactly
    // the same shape: `player#1`, `player#2`, `enemy#256`, `enemy#258` and every
    // fingerprint field INCLUDING `rng` are bit-identical, and the ONE row that
    // moved is `enemy#257` — this seed's still-DUMB bird at frame 118, which is
    // precisely the actor this story re-flies. Its first contact was re-measured
    // rather than assumed: still frame 119, so 118 is still strictly pre-contact.
    //
    // jt9-8 RE-BASELINE (`CLR PTIMUP,U` — a wing transition re-inits the flap-lift
    // budget). This story's line is the PLAYER, and the digest shows exactly that
    // and nothing more: `player#1` is the ONE row that moved, all three enemy rows
    // are BIT-IDENTICAL, and so is every fingerprint field including `rng`, procs,
    // scores and lives. The moved row's signature is the story itself — `timeUp`
    // 79 -> 0 (the budget re-inited on this frame's wing edge) with the position
    // and velocity that follow from it. First contact re-measured by sweeping 1300
    // frames for a thud, not assumed: still frame 119, so the anchor does not move.
    expect(entityDigest(0xbeef, 118)).toEqual([
      'player#1:71,15592,-80,-2,0,0,1',
      'player#2:200,32768,0,0,0,1,0',
      'enemy#256:89,32725,-62,8,64,60,1',
      'enemy#257:275,33037,-39,8,0,41,1',
      'enemy#258:89,33219,18,8,64,60,1',
    ])
    expect(fingerprint(0xbeef, 118)).toEqual({
      frame: 118,
      rng: 1_376_450_013,
      wave: 1,
      procs: 'player#1,player#2,enemy#256,enemy#257,enemy#258',
      scores: [0, 0],
      lives: [5, 5],
    })
  })

  it('BEFORE the first contact, seed 0x2468 is bit-identical — frame 188', () => {
    // Post-uf1-8 this whole window is contact-free (first thud: frame 611), so
    // frame 188 is still strictly pre-contact. `rng`, procs order, scores and
    // lives are all bit-identical to the jt5-4 pin — only the smart buzzards'
    // rows moved, which is exactly uf1-8's measured line. uf1-9 re-baseline: the
    // same two smart rows moved again and `rng`, procs, scores, lives and both
    // player rows stayed bit-identical.
    //
    // jt5-8 RE-BASELINE: again ONE row, `enemy#257`, and it is the story's own
    // signature — under uf1-9 that bird was GROUNDED at frame 188
    // (`53760,0,…,1,0`: on a platform, airborne 0) and it is now flying
    // (`53313,14,…,1`), because a dumb bird that cannot hold its wings down
    // sinks more slowly and had not landed by here. `rng`, the process order,
    // scores, lives and BOTH player rows are bit-identical. This seed's first
    // contact moved (611 -> 746, re-measured) but moved AWAY, so frame 188 is
    // still strictly pre-contact and the anchor does not need to move.
    //
    // jt9-24 RE-BASELINE (decoded SELPLY metric): `rng` is BIT-IDENTICAL
    // (736_998_484 — a kill draws no randomness, the law this group pins) and so
    // are BOTH player rows. This seed's whole window is now thud-free (see AC7's
    // header note: 0x2468 no longer bounces at all under the decoded metric), so
    // 188 is more-than-ever strictly pre-CONTACT. What moved is one enemy: the
    // re-routed metric sends `enemy#256` to its death before 188 (P1 +500), so it
    // leaves `egg#65792` where it used to fly; `enemy#257`/`enemy#258` are
    // unchanged. procs and P1's score move with that kill; lives do not.
    //
    // jt9-8 RE-BASELINE (`CLR PTIMUP,U`). `rng` is BIT-IDENTICAL again
    // (736_998_484) and so are `enemy#257` and `enemy#258` — the two birds that
    // never meet a knight in this window. `player#1` moved, which is this story's
    // whole line (`timeUp` 149 -> 4: the budget re-inits on every wing edge, so it
    // can no longer run up unbounded across a long glide). And the jt9-24 kill
    // UNWINDS: the re-flown knight is no longer where it needs to be to take
    // `enemy#256` before frame 188, so that buzzard is ALIVE here, `egg#65792` is
    // never laid, and P1's score returns to 0. procs and scores move with that;
    // `rng`, lives, wave and `player#2` do not. This seed is still thud-free
    // across 1300 frames (re-swept, not assumed), so 188 remains strictly
    // pre-contact.
    expect(entityDigest(0x2468, 188)).toEqual([
      'player#1:47,14512,0,-2,0,4,1',
      'player#2:200,32768,0,0,0,1,0',
      'enemy#256:64,28338,-77,8,64,95,1',
      'enemy#257:252,53313,14,8,192,95,1',
      'enemy#258:159,33196,10,8,64,95,1',
    ])
    expect(fingerprint(0x2468, 188)).toEqual({
      frame: 188,
      rng: 736_998_484,
      wave: 1,
      procs: 'player#1,player#2,enemy#256,enemy#257,enemy#258',
      scores: [0, 0],
      lives: [5, 5],
    })
  })

  it('AFTER it, seed 0xbeef has moved to its frozen post-story digest — frame 160', () => {
    // The other half of the ruling. RED-phase this was a `not.toEqual` against
    // the pre-story (inert-bounce) values — an anti-no-op guard any change at
    // all could satisfy, including a wrong one. The post-story values are
    // frozen as an exact pin: a real regression guard, not just "something
    // moved". Re-measured at uf1-8 (frame 160 is downstream of the frame-119
    // thud AND of the re-flown smart buzzards), and again at uf1-9, where the two
    // smart buzzards fly the ROM's wing cadence. Both PLAYER rows are unchanged.
    //
    // jt5-8 RE-BASELINE: frame 160 is still downstream of the frame-119 thud
    // (re-measured, not assumed), so the anchor itself does not move. Both
    // PLAYER rows are unchanged for a fourth tree and so is `enemy#256`; the
    // dumb `enemy#257` is still FLYING here where the held-wings port had
    // already dropped it onto a platform (`35072,0,…,1,0` — airborne 0), and
    // `enemy#258` moved with the traffic.
    //
    // jt9-24 RE-BASELINE (decoded SELPLY metric): the frame-119 thud is UNMOVED
    // (re-measured by sweeping for a thud, not assumed), so 160 is still strictly
    // post-contact. Both PLAYER rows are unchanged a fifth time — the guard's
    // claim. The one enemy row that moved is `enemy#256`: the decoded metric
    // re-routes which knight it homes on, so it sinks on a different arc here
    // (`30547,-40` -> `29844,-51`); `enemy#257`/`enemy#258` are unchanged.
    //
    // jt9-8 RE-BASELINE (`CLR PTIMUP,U`): the frame-119 thud is UNMOVED (re-swept
    // for a thud, not assumed), so 160 is still strictly post-contact. `player#1`
    // is the ONLY row that moved and it carries the story's signature — `timeUp`
    // 121 -> 2, a budget re-inited two frames ago on a wing edge instead of
    // accumulated since the last one. All THREE enemy rows are bit-identical,
    // which is the bound: a story that touches player physics may not move a
    // buzzard.
    //
    // jt9-50 RE-BASELINE (the bounder BOUP cliff-above divert to BOLEV): the mirror
    // bound — a story that touches only ENEMY brains may not move a PLAYER. Both
    // player rows are bit-identical, and of the three enemies only the BOUNDER
    // `enemy#256` moved: diverting off a blocked climb to level flight, it sinks on a
    // different arc here (`29844,-51` -> `30547,-40`; posX/velXIndex/timeUp unchanged).
    // `enemy#257`/`enemy#258` are unchanged.
    expect(entityDigest(0xbeef, 160)).toEqual([
      'player#1:56,14560,-32,-4,64,2,1',
      'player#2:200,32768,0,0,0,1,0',
      'enemy#256:131,30547,-40,8,64,81,1',
      'enemy#257:14,33111,-30,8,0,62,1',
      'enemy#258:131,34247,-49,8,64,81,1',
    ])
  })

  it('AFTER it, seed 0xface has moved to its frozen post-story digest — frame 128', () => {
    // jt5-4 froze the post-contact anchor on seed 0x2468 (frame 200, then 620,
    // then 755 as its first contact drifted out). jt9-24 ends that lineage: the
    // decoded SELPLY metric turns 0x2468 THUD-FREE (no contact in 1300 frames, see
    // the header note above), so a "post-contact" anchor cannot live on it at all
    // — frame 755 would sit past nothing and assert the reverse of its own name.
    //
    // jt9-24 RE-BASELINE: the post-contact anchor moves to a seed that still
    // bounces. 0xface's first contact is frame 119 (enemy-thud, re-measured by
    // sweeping for a thud), so frame 128 is 119 + 9 — the same nine-frame offset
    // jt5-4/uf1-8 always used — and sits strictly AFTER it. An exact frozen pin,
    // the pair to 0xbeef's frame-160 anchor above. Both knights are still up at
    // 128 (no death/respawn yet on this seed inside the window), so the list is
    // the natural five processes.
    //
    // jt9-8 RE-BASELINE (`CLR PTIMUP,U`): 0xface's first contact is STILL frame
    // 119 (re-swept for a thud), so 128 is still 119 + 9 and still strictly after
    // it. `player#1` alone moved — `timeUp` 89 -> 9 — and all three enemy rows are
    // bit-identical, the same bound the 0xbeef anchor above carries.
    expect(entityDigest(0xface, 128)).toEqual([
      'player#1:68,15232,0,-2,128,9,1',
      'player#2:200,32768,0,0,0,1,0',
      'enemy#256:189,15895,-22,8,64,65,1',
      'enemy#257:285,32962,1,8,0,46,1',
      'enemy#258:189,20041,-32,8,64,65,1',
    ])
  })

  it('the digest is DISCRIMINATING — two seeds do not agree', () => {
    // Without this, four `toEqual`/`not.toEqual`s could all be passing because
    // `entityDigest` returns something constant.
    expect(entityDigest(0xbeef, 146)).not.toEqual(entityDigest(0x2468, 146))
  })
})

describe('jt5-4 — a thud frame is a PHYSICS event and nothing else', () => {
  /** The same frame, with and without the contact. Everything the bounce is not
   *  allowed to touch must agree across the two. */
  const withContact = (): DemoState =>
    stage([
      enemyProcess(A, entity(100, 92, DESCENDING)),
      enemyProcess(B, entity(104, 94, DESCENDING)),
      farBird(),
    ])
  const withoutContact = (): DemoState =>
    stage([
      enemyProcess(A, entity(100, 92, DESCENDING)),
      enemyProcess(B, entity(180, 94, DESCENDING)),
      farBird(),
    ])

  it('it draws no randomness — the rng cursor is the same either way', () => {
    const hit = stepDemo(withContact(), {})
    const miss = stepDemo(withoutContact(), {})
    expect(cuesOf(hit), 'precondition: one staging really thudded').toEqual([ENEMY_THUD])
    expect(cuesOf(miss), 'precondition: the other really did not').toEqual([])
    expect(hit.sim.rng, 'a bounce that consumes an rng draw desynchronises every replay').toBe(
      miss.sim.rng,
    )
  })

  it('it removes nobody, spawns nobody and re-orders nobody', () => {
    const hit = stepDemo(withContact(), {})
    expect(cuesOf(hit), 'precondition: the thud fired').toEqual([ENEMY_THUD])
    expect(hit.sim.processes.map((p) => p.id)).toEqual([A, B, FAR])
  })

  it('it does not touch a THIRD entity', () => {
    const hit = stepDemo(withContact(), {})
    const miss = stepDemo(withoutContact(), {})
    expect(cuesOf(hit), 'precondition: the thud fired').toEqual([ENEMY_THUD])
    expect(entityOf(hit, FAR), 'the bystander was bounced too').toEqual(entityOf(miss, FAR))
  })

  it('the cue stream is REBUILT per frame — a thud does not survive into the next', () => {
    // jt5-1's rule, restated for this story's kinds: the trap replay determinism
    // cannot see, because a stale carry-forward is carried forward identically
    // in both runs.
    const first = stepDemo(withContact(), {})
    expect(cuesOf(first), 'precondition: the thud fired').toEqual([ENEMY_THUD])
    const apart: DemoState = {
      ...first,
      sim: {
        ...first.sim,
        processes: first.sim.processes.map((p) =>
          p.id === B ? enemyProcess(B, entity(180, 94, DESCENDING)) : p,
        ),
      },
    }
    expect(thudsOf(cuesOf(stepDemo(apart, {}))), "'enemy-thud' survived a frame with no contact").toEqual(
      [],
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — HAZARD B: jt5-1's deferred guard, and the rename that would dodge it
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-4 — the thuds leave jt5-1’s deferred list, and only the thuds', () => {
  /** The literal `deferred` array in the sibling guard, as SOURCE TEXT. Reading
   *  the guard rather than importing it is the point: the guard is a hard-coded
   *  list, so only its text can say what it still forbids. */
  function deferredNames(): string[] {
    const src = readFileSync(join(root, 'tests', 'audio-events.test.ts'), 'utf8')
    const m = /const deferred = \[([^\]]*)\]/.exec(src)
    if (!m) throw new Error('audio-events.test.ts no longer declares a `deferred` array')
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  }

  it('the guard still exists and still forbids what jt5-4 does NOT wire', () => {
    const deferred = deferredNames()
    expect(deferred.length, 'an emptied guard forbids nothing').toBeGreaterThan(0)
    expect(
      deferred,
      "'troll-grab' belongs to uf1-10/uf1-11 and must stay deferred — jt5-4 must not clear the guard wholesale",
    ).toContain('troll-grab')
  })

  it('no thud-family name is deferred any more — the emitters exist now', () => {
    const deferred = deferredNames()
    for (const kind of ['player-thud', 'enemy-thud', 'thud']) {
      expect(
        deferred,
        `'${kind}' is still listed as unreachable, but jt5-4 wires the thud — the guard now lies`,
      ).not.toContain(kind)
    }
    // The dodge this group exists to close: a Dev who renames the new kinds to
    // something the list does not mention satisfies jt5-1's guard while wiring
    // nothing. So the family must be REACHABLE, BY THESE NAMES, and emitted —
    // which every group above asserts. Restated here so the two halves of AC5
    // fail together and a reader sees why.
    for (const kind of THUD_KINDS) {
      expect(kindsTuple, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
      expect(deferred, `'${kind}' cannot be both declared and deferred`).not.toContain(kind)
    }
  })

  it('the flap family stays out of it — jt5-3 is not re-deferred by this edit', () => {
    const deferred = deferredNames()
    for (const kind of ['player-flap', 'enemy-flap', 'flap', 'player-wing-down', 'enemy-wing-up']) {
      expect(deferred, `'${kind}' was re-deferred; jt5-3 wired it`).not.toContain(kind)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// jt9-3 — THE THIRD jt5-3 INVARIANT THAT SHIPPED HELD BY PROSE ALONE
//
// jt5-3's Reviewer ran a 24-mutation battery. Three of its twenty-four mutations
// reddened NOTHING, so three deliberate behaviours were documented in comments
// and enforced by no test. The shipped code is CORRECT in all three — this pins
// it, it does not change it. RE-MEASURED 2026-08-03 against the grown suite (the
// original figure was "0 of 1979"): all three still pass 2499 of 2499, so none
// of them was covered by accident in the meantime.
//
// WHY THIS ONE IS HERE AND NOT IN jt5-3'S OWN SUITE. The other two are frame.ts's
// and live in audio-flap.test.ts beside that story's emission groups. This one
// needs a frame that raises BOTH a flight cue and a collision cue, and the
// staging that puts two bodies at one lance height is THIS file's
// (`stage`/`playerProcess`/`enemyProcess`/`entity`). Copying that kit into
// audio-flap.test.ts to keep the three together would re-introduce exactly the
// duplication jt9-2 spent a whole story removing. `grep -rn jt9-3
// plugins/joust/tests` finds all three.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt9-3 — the frame’s cue stream is flight-first, collision-second', () => {
  // ─── THE MUTATION THIS GROUP FORBIDS ───────────────────────────────────────
  // src/core/demo.ts, `stepDemo`:
  //
  //   -  const cues: GameEvent[] = [...stepped.cues, ...collided.cues]
  //   +  const cues: GameEvent[] = [...collided.cues, ...stepped.cues]
  //
  // MEASURED 2026-08-03: with it applied, 2499 of 2499 joust tests pass.
  //
  // THE LAW. `stepFrame` runs the whole flight-stepping phase before
  // `collisionPass` is handed this frame's processes at all, so a wing edge
  // detected inside the step happened EARLIER in the frame than a thud decided
  // after it. The concatenation is the port's record of that ordering, and its
  // comment was the only thing holding it.
  //
  // IT IS NOT COSMETIC. `playEventSounds` walks the stream in order and the
  // channel map lets a later cue take a channel from an earlier one, so which of
  // two same-channel moments is actually HEARD is decided by this line.

  /** A press: the waking knight raises `player-wing-down` inside `stepFrame`. */
  const PRESS: PlayerInput = { dir: 0, flap: true, flapHeld: true }
  const PLAYER_WING_DOWN = 'player-wing-down'

  /**
   * One AWAKE knight far from everything — `nap: 1`, so unlike every other
   * fixture in this file it really does take a flight step and can therefore
   * raise a wing edge — plus the frozen knight-and-buzzard tie this file
   * measured as a `player-thud`.
   *
   * The two moments are CAUSALLY INDEPENDENT: the flapper is 80 pixels and two
   * platforms away from the tie and never touches it, so nothing about the flap
   * can influence the thud or vice versa. That is what makes the order of the
   * emitted pair a fact about the concatenation and about nothing else.
   */
  const flapperAndTie = (): DemoProcess[] => [
    playerProcess(P1, entity(20, 40, DESCENDING), 1),
    playerProcess(P2, entity(100, 94, DESCENDING)),
    enemyProcess(A, entity(104, 94, DESCENDING)),
  ]

  it('a frame that flaps AND thuds emits the wing edge first', () => {
    const d = stepDemo(stage(flapperAndTie()), { [P1]: PRESS, [P2]: IDLE })
    expect(
      cuesOf(d),
      'the flight-stepping phase runs before collisionPass sees the frame, so its ' +
        'cues belong ahead of the thud',
    ).toEqual([PLAYER_WING_DOWN, PLAYER_THUD])
  })

  it('the fixture is real — each moment fires ALONE, so neither is imagined', () => {
    // Without this, the exact array above could be satisfied by a stream that is
    // right for a reason unrelated to the concatenation — a frame that emits only
    // one of the two, or emits them for the wrong causes.
    const flapOnly = stepDemo(
      stage([playerProcess(P1, entity(20, 40, DESCENDING), 1), enemyProcess(FAR, entity(240, 40, DESCENDING))]),
      { [P1]: PRESS },
    )
    expect(cuesOf(flapOnly), 'the flapper alone raises exactly the wing cue').toEqual([
      PLAYER_WING_DOWN,
    ])

    const tieOnly = stepDemo(
      stage([
        playerProcess(P2, entity(100, 94, DESCENDING)),
        enemyProcess(A, entity(104, 94, DESCENDING)),
      ]),
      { [P2]: IDLE },
    )
    expect(cuesOf(tieOnly), 'the tie alone raises exactly the thud').toEqual([PLAYER_THUD])
  })

  it('the flight cue precedes the collision cue by INDEX, not by luck of the list', () => {
    // The same law stated as a relation rather than a literal array, so a future
    // story that legitimately adds a THIRD cue to this frame breaks the exact
    // assertion above without silently losing the ordering guarantee here.
    const kinds = cuesOf(stepDemo(stage(flapperAndTie()), { [P1]: PRESS, [P2]: IDLE }))
    const wing = kinds.indexOf(PLAYER_WING_DOWN)
    const thud = kinds.indexOf(PLAYER_THUD)
    expect(wing, 'the frame raised no wing cue at all — the comparison below is vacuous').toBeGreaterThanOrEqual(0)
    expect(thud, 'the frame raised no thud at all — the comparison below is vacuous').toBeGreaterThanOrEqual(0)
    expect(wing, 'a flight cue must never follow a collision cue from the same frame').toBeLessThan(thud)
  })
})
