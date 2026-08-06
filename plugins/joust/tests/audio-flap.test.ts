// tests/audio-flap.test.ts
//
// Story jt5-3 — RED phase (Mr. Praline / TEA). The FLAP: joust's signature cue,
// and the only one in the set that fires on BOTH edges of a button.
//
// ─── THE ROM LAW, READ OFF THE CONTROL FLOW AND NOT OFF THE TABLES ───────────
// An airborne bird lives in one of two mutually exclusive loops, and the sound
// is on the TRANSITION between them — never inside either:
//
//   FLAPLP  "WINGS ARE DOWN LOOP (FLAP PRESSED)"        :6163-6180
//     :6168-6169  TSTB / BEQ GOFLIP        button let go -> leave the loop
//   GOFLIP                                              :6182-6184
//     LDX PDECSN,U / LDX DSNWU,X / JSR VSND             ← WING UP sounds here
//   FLIPLP  "WINGS ARE UP LOOP (FLAP RELEASED)"         :6190-6210
//     :6195-6196  TSTB / BNE GOFLAP        button pressed -> leave the loop
//   GOFLAP -> FLAST2                                    :6212-6218
//     LDX PDECSN,U / LDX DSNWD,X / JSR VSND             ← WING DOWN sounds here
//
// So PRESS = wing DOWN, RELEASE = wing UP, and a HELD button re-enters its loop
// at `FLAPS2`/`FLIPS2` (:6170 / :6197) — the labels that BYPASS each
// `JSR VSND` — which is precisely why holding the button does not
// machine-gun the cue. The two bypasses are NOT symmetric (jt5-7): FLIPS2
// does sit below the wing-up cue (:6184), since GOFLIP plays it then falls
// on via `BRA FLIPS2` (:6186); FLAPS2 sits ABOVE the wing-down cue (:6218),
// which the cue path never reaches — GOFLAP exits via `TSTB` (:6223) to
// WINGDN (:6176) / WINGFK (:6177). FLAPS2 is the fall-through the held path
// drops into from FLAPLP's `TSTB` / `BEQ GOFLIP` (:6168-6169).
//
// Trust the SYMBOL, not the comment: :6217 reads `LDX DSNWD,X  GET WING UP
// SOUND`, a 1982 copy-paste of :6183's comment. `DSNWD` ("SOUND OF WINGS GOING
// DOWN", :119) is what the CPU loads, and the tables corroborate three ways —
// the RMB declarations at :118-119, the table comments at :8107-8108 / :8125-8126,
// and the control flow above.
//
// ─── TWO CORRECTIONS TO THE DERIVED ACs, BOTH MEASURED ───────────────────────
//  1. TAKE-OFF BY FLAP *DOES* SOUND. The derived AC3 ("the first frame of flight
//     does NOT emit a wing cue, regardless of button state") conflates the two
//     ways a bird leaves the ground, and the ROM keeps them apart:
//
//       STFLY  "START TO FLY"   :6123-6135, reached from PLYRLP's :5966
//                               `LBNE STFLY`, ends `JMP FLAST2`  ← SOUNDS
//       STFALL "START TO FALL"  :6139-6157, reached from :6016 `LBEQ STFALL`,
//                               ends `BNE FLAPS2` / `BRA FLIPS2` ← SILENT
//
//     A flap take-off jumps straight AT the wing-down cue; walking off a ledge
//     enters both loops at their BYPASS labels, skipping each cue. Both are
//     pinned in the groups that follow.
//  2. THE CORE IS NOT THE ONLY THING MISSING A PREVIOUS LEVEL. The ROM keeps one
//     on the ground, in PTIMUP: `TST PTIMUP,U / BNE PLNFLY / TSTB / LBNE STFLY`
//     then `PLNFLY STB PTIMUP,U  WAIT UNTIL BUTTON RELEASED` (:5963-5967). A
//     take-off needs the button DOWN NOW and NOT down last wake — a rising-edge
//     test written out longhand. That is the shape this story ports.
//
// ─── HAZARD C: THE SEAM SUITE CANNOT SEE EMITTERS ────────────────────────────
// Measured on jt5-1 (2026-08-01): the manifest sweep, the dispatch sweep and the
// coverage check all read the same `EVENT_KINDS` tuple, so they agree with each
// other whether or not a single event ever fires — six of eleven cues could be
// deleted with the whole 1932-test project green. Everything in the DECLARATION
// group below is therefore necessary and NOT sufficient, and it is followed by
// emission groups that stage an input sequence, assert the cue lands on the
// EXACT frame of the edge, and assert the frame BEFORE it is clean.
//
// Every staged frame below is an OBSERVATION of the shipped sim, not a guess:
// each window was measured to be otherwise cue-free before it was written, which
// is what lets the assertions be exact arrays (`toEqual`) rather than
// `toContain`. A `toContain` on a stream that never reached the interesting
// state passes for the wrong reason.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
// jt9-3 — the RAW scheduler seam. ONE of jt5-3's three unguarded invariants is
// invisible from `stepGame`, BY CONSTRUCTION: the accumulation one (see the
// jt9-3 block at the foot of this file), so its guards call `stepFrame`
// directly. The pre-step `wasAirborne` invariant is NOT in that position — it
// is reachable either way, and the walk-off guard below reaches it through
// `stepGame`. `GameState` is aliased because game.ts already owns that name here.
import { createState, spawn, stepFrame, type GameState as SimState } from '../src/core/frame.js'
import { EVENT_KINDS, type GameEvent } from '../src/core/events.js'
import { CHANNELS, CUE_SOURCES, SOUNDS, type CueSource } from '../src/shell/audio.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import { linet, type EnemyState } from '../src/core/enemy.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(root, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

/** Read a line (1-based) from the vendored tree. Only ever called in an `it()` —
 *  the tp1-8 collection trap: a module-scope read kills the file on CI. */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  const line = readFileSync(p, 'latin1').split('\n')[n - 1]
  if (line === undefined) throw new Error(`${file} has no line ${n}`)
  return line
}

// ─── the four kinds and the four cues this story adds ────────────────────────

const PLAYER_WING_DOWN = 'player-wing-down'
const PLAYER_WING_UP = 'player-wing-up'
const ENEMY_WING_DOWN = 'enemy-wing-down'
const ENEMY_WING_UP = 'enemy-wing-up'
const WING_KINDS: readonly string[] = [
  PLAYER_WING_DOWN,
  PLAYER_WING_UP,
  ENEMY_WING_DOWN,
  ENEMY_WING_UP,
]

/** cue name -> the Williams table it must cite, and that table's priority byte. */
const WING_CUES: Readonly<Record<string, { table: string; priority: number; line: number }>> = {
  playerWingDown: { table: 'SNPLWD', priority: 10, line: 8126 },
  playerWingUp: { table: 'SNPLWU', priority: 10, line: 8125 },
  enemyWingDown: { table: 'SNELWD', priority: 6, line: 8108 },
  enemyWingUp: { table: 'SNELWU', priority: 6, line: 8107 },
}

// Widened views: the four kinds are not in the shipped union yet, so the RED
// tree must reach them through `string` or it cannot `npm run lint`.
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
const LEFT: PlayerInput = { dir: -1, flap: false, flapHeld: false }
/** jt9-3 — walking left with the button DOWN, so the NEXT frame's release is a
 *  real edge without spending a flap impulse that would move the walk-off. */
const LEFT_HELD: PlayerInput = { dir: -1, flap: false, flapHeld: true }
/** `flap` is the shell's RISING edge, `flapHeld` the level (shell/input.ts). */
const btn = (flap: boolean, flapHeld: boolean): PlayerInput => ({ dir: 0, flap, flapHeld })

const kindsOf = (g: GameState): string[] => g.events.map((e) => e.type as string)
const simKindsOf = (d: DemoState): string[] => d.cues.map((c) => c.type as string)
const wingsOf = (g: GameState): string[] => kindsOf(g).filter((k) => WING_KINDS.includes(k))

const procOf = (g: GameState, id: number): DemoProcess | undefined =>
  g.sim.sim.processes.find((p) => p.id === id)
const airborne = (g: GameState, id: number): boolean | undefined => procOf(g, id)?.entity?.airborne

/**
 * Park every non-player process asleep for the whole window. The wave stays OPEN
 * (so no advance fires its own cues) and no buzzard flaps, which is what lets the
 * knight assertions below be EXACT streams instead of filtered ones. Measured:
 * with this applied, every frame of every player window in this file emits `[]`
 * on the pre-story tree.
 */
function hushEverythingButKnights(g: GameState): GameState {
  return {
    ...g,
    sim: {
      ...g.sim,
      sim: {
        ...g.sim.sim,
        processes: g.sim.sim.processes.map((p) =>
          p.kind === 'player' ? p : { ...p, nap: 100_000 },
        ),
      },
    },
  }
}

/** A knight standing on cliff 5: 68 frames of walking left off the spawn glide.
 *  Measured — at 68 steps P1 is grounded (PLYBR) at x=100, and at 70 it has
 *  walked off the edge. */
function knightOnTheGround(): GameState {
  let g = createGame(0xbeef)
  for (let i = 0; i < 68; i++) g = stepGame(g, { 1: LEFT, 2: IDLE })
  return hushEverythingButKnights(g)
}

// ═════════════════════════════════════════════════════════════════════════════
// The ROM law re-opens, byte for byte (the evidence every group below rests on)
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-3 — the two-edge law re-opens in JOUSTRV4.SRC', () => {
  it('the two loops leave on the button, and each cue sits on the TRANSITION', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 6168)).toBe('\tTSTB\t\t\tFLAP BUTTON STILL PRESSE?')
    expect(vendoredLine('JOUSTRV4.SRC', 6169)).toBe('\tBEQ\tGOFLIP\t\t BR=NO')
    expect(vendoredLine('JOUSTRV4.SRC', 6182)).toBe('GOFLIP\tLDX\tPDECSN,U')
    expect(vendoredLine('JOUSTRV4.SRC', 6183)).toBe('\tLDX\tDSNWU,X\t\tGET WING UP SOUND')
    expect(vendoredLine('JOUSTRV4.SRC', 6184)).toBe('\tJSR\tVSND')

    expect(vendoredLine('JOUSTRV4.SRC', 6195)).toBe('\tTSTB\t\t\tFLAP BUTTON STILL RELEASED?')
    expect(vendoredLine('JOUSTRV4.SRC', 6196)).toBe('\tBNE\tGOFLAP\t\t BR=NO')
    expect(vendoredLine('JOUSTRV4.SRC', 6212)).toBe(
      'GOFLAP\tJSR\tADDFLP\t\tADD IN NEW X & Y VELOCITIES',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 6216)).toBe('FLAST2\tLDX\tPDECSN,U')
    // The 1982 typo, kept verbatim on purpose: DSNWD is what loads.
    expect(vendoredLine('JOUSTRV4.SRC', 6217)).toBe('\tLDX\tDSNWD,X\t\tGET WING UP SOUND')
    expect(vendoredLine('JOUSTRV4.SRC', 6218)).toBe('\tJSR\tVSND')
    expect(vendoredLine('JOUSTRV4.SRC', 118)).toBe('DSNWU\tRMB\t2\tSOUND OF WINGS GOING UP')
    expect(vendoredLine('JOUSTRV4.SRC', 119)).toBe('DSNWD\tRMB\t2\tSOUND OF WINGS GOING DOWN')
  })

  it('a HELD button re-enters at the BYPASS label — which is why holding is silent', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 6170)).toBe('FLAPS2\tCLRB\t\t\tNO OFFSET TO GRAVITY')
    expect(vendoredLine('JOUSTRV4.SRC', 6197)).toBe('FLIPS2\tLDB\t#$04\t\tOFFSET TO GRAVITY')
  })

  it('STFLY jumps AT the wing-down cue; STFALL bypasses both cues', () => {
    // The correction to the derived AC3. These two lines are the whole of it.
    expect(vendoredLine('JOUSTRV4.SRC', 6123)).toBe('STFLY\tJSR\tCPLYR\t\tERASE PLAYER')
    expect(vendoredLine('JOUSTRV4.SRC', 6135)).toBe('\tJMP\tFLAST2')
    expect(vendoredLine('JOUSTRV4.SRC', 6139)).toBe(
      'STFALL\tLDA\tPFRAME,U\tA SKIDDING FALL OFF A CLIFF?',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 6155)).toBe('\tLDA\tCURJOY+1\tFLAP BUTTON PRESSED?')
    expect(vendoredLine('JOUSTRV4.SRC', 6156)).toBe('\tBNE\tFLAPS2\t\t BR=YES')
    expect(vendoredLine('JOUSTRV4.SRC', 6157)).toBe('\tBRA\tFLIPS2\t\tNO, START AT CORRECT FRAME')
  })

  it('the ground loop already keeps a PREVIOUS button level, in PTIMUP', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 5963)).toBe(
      '\tTST\tPTIMUP,U\tFLAP BUTTON WAS RELEASED, WASNT IT?',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5964)).toBe('\tBNE\tPLNFLY\t\t BR=YES')
    expect(vendoredLine('JOUSTRV4.SRC', 5965)).toBe('\tTSTB\t\t\tSTARTING TO FLY??')
    expect(vendoredLine('JOUSTRV4.SRC', 5966)).toBe('\tLBNE\tSTFLY\t\t BR=YES')
    expect(vendoredLine('JOUSTRV4.SRC', 5967)).toBe(
      'PLNFLY\tSTB\tPTIMUP,U\tWAIT UNTIL BUTTON RELEASED',
    )
  })

  it('the ENEMY runs the same loops, and its button is a LEVEL held across wakes', () => {
    // Hazard A, answered from the source. The enemy's `CURJOY+1` is written by
    // the brain routine `AIROVR` calls (`JSR [PJOY,U]`, :6456) and is LATCHED:
    //   dumb LINET  — LNTUP sets B=1 and swaps PJOY to LNTOFP; the NEXT wake
    //                 LNTOFP restores LINET and CLRBs. One wake down, then up.
    //   smart BOUNDR — PJOYT is literally "WING DOWN TIME": BOUPWD wakes of B=1,
    //                 then BOUPWU wakes of B=0.
    expect(vendoredLine('JOUSTRV4.SRC', 3746)).toBe(
      'LNTUP\tLDD\t#LNTOFP\t\tGET OFF GROUND OR JUST FLAP',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 3748)).toBe('\tLDB\t#1')
    expect(vendoredLine('JOUSTRV4.SRC', 3759)).toBe('LNTOFP\tLDD\t#LINET')
    expect(vendoredLine('JOUSTRV4.SRC', 3761)).toBe('\tCLRB')
    expect(vendoredLine('JOUSTRV4.SRC', 3864)).toBe('\tLDA\tBOUPWD\t\t#2')
    expect(vendoredLine('JOUSTRV4.SRC', 3865)).toBe('BOUP12\tSTA\tPJOYT,U\t\tWING DOWN TIME')
    expect(vendoredLine('JOUSTRV4.SRC', 3894)).toBe('\tLDA\tBOUPWU\t\t#8')
    // And the enemy decision blocks bind the ENEMY tables to those same loops.
    expect(vendoredLine('JOUSTRV4.SRC', 5560)).toBe(
      '\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 5544)).toBe(
      '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,0,SNPCR1',
    )
  })

  it('the re-opens are DISCRIMINATING — a neighbouring line is not the cited one', () => {
    // Without this the seven groups above could all be passing because
    // `vendoredLine` returned whatever it was compared against.
    expect(vendoredLine('JOUSTRV4.SRC', 6183)).not.toBe(vendoredLine('JOUSTRV4.SRC', 6217))
    expect(vendoredLine('JOUSTRV4.SRC', 8125)).not.toBe(vendoredLine('JOUSTRV4.SRC', 8126))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 / AC7 — DECLARATION. Necessary, and (Hazard C) nowhere near sufficient.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-3 AC2 — the four wing kinds join the core union', () => {
  it('EVENT_KINDS names all four', () => {
    expect(kindsTuple.length, 'precondition: the tuple is not empty').toBeGreaterThan(0)
    for (const kind of WING_KINDS) {
      expect(kindsTuple, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
    }
  })

  it('the four are DISTINCT — one name for two edges collapses the cue', () => {
    expect(new Set(WING_KINDS.filter((k) => kindsTuple.includes(k))).size).toBe(4)
    expect(new Set(kindsTuple).size, 'no duplicates anywhere in the tuple').toBe(kindsTuple.length)
  })

  it('the eleven jt5-1 kinds survive — this story ADDS, it does not re-cut', () => {
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
    ]) {
      expect(kindsTuple, `jt5-1's '${kind}' was dropped`).toContain(kind)
    }
  })
})

describe('jt5-3 AC7 — each wing cue cites its own Williams table', () => {
  it('the manifest, channel map and provenance all carry the four cues', () => {
    for (const cue of Object.keys(WING_CUES)) {
      expect(sounds[cue], `SOUNDS has no '${cue}'`).toBeTruthy()
      expect(channels[cue], `CHANNELS has no '${cue}'`).toBeTruthy()
      expect(cueSources[cue], `CUE_SOURCES has no '${cue}'`).toBeTruthy()
    }
    const files = Object.keys(WING_CUES).map((c) => sounds[c])
    expect(new Set(files).size, 'four cues, four distinct samples').toBe(4)
  })

  it('each cites the right TABLE at the right PRIORITY — not the neighbouring row', () => {
    // SNPLWU/SNPLWD and SNELWU/SNELWD sit adjacent in the table and carry the
    // SAME sound codes ($21 up, $20 down); only the priority (010 vs 006) and
    // the duration tell the species apart. A one-row slip is invisible to a
    // byte-check that only re-opens whatever line it was handed.
    for (const [cue, want] of Object.entries(WING_CUES)) {
      const src = cueSources[cue]
      expect(src, `CUE_SOURCES has no '${cue}'`).toBeTruthy()
      expect(src?.kind, `'${cue}' must be ROM-cited, not an invention`).toBe('rom')
      if (src === undefined || src.kind !== 'rom') continue
      expect(src.table, `'${cue}' cites the wrong table`).toBe(want.table)
      expect(src.priority, `'${cue}' cites the wrong priority byte`).toBe(want.priority)
      expect(src.source.line, `'${cue}' cites the wrong table row`).toBe(want.line)
    }
  })

  it('the player pair outranks the enemy pair, as the machine has it', () => {
    // 010 vs 006 is the only thing separating two identical sound codes, so it
    // is a fact about the cue set and not a detail of one entry.
    expect(priorityOf('playerWingDown')).toBeGreaterThan(priorityOf('enemyWingDown'))
    expect(priorityOf('playerWingUp')).toBeGreaterThan(priorityOf('enemyWingUp'))
  })

  it('two cues share a channel ONLY when they share a ROM priority', () => {
    // audio.ts's rule ("a channel per distinct ROM priority") stated as a sweep
    // over the whole map rather than as four hard-coded channel names, so it
    // still bites when jt5-4/jt5-5 add cues. Green today for the eleven; the
    // wing pair (10) and the enemy pair (6) must each get their own channel.
    const byChannel = new Map<string, string[]>()
    for (const [cue, chan] of Object.entries(channels)) {
      if (chan === undefined) continue
      byChannel.set(chan, [...(byChannel.get(chan) ?? []), cue])
    }
    const clashes: string[] = []
    for (const [chan, cues] of byChannel) {
      // An INVENTION has no priority to share, so it is its own bucket — two of
      // them on one channel must not read as "equal priority, so it is fine".
      const priorities = new Set(
        cues.map((c) => (priorityOf(c) >= 0 ? `prio:${priorityOf(c)}` : `invention:${c}`)),
      )
      if (priorities.size > 1) clashes.push(`${chan}: ${cues.join(', ')} span ${[...priorities].join('/')}`)
    }
    expect(clashes, 'a shared channel means the engine steals; only equal priorities may').toEqual(
      [],
    )
  })
})

describe('jt5-3 AC2 — the dispatch plays a distinct sound for each wing edge', () => {
  it('four kinds in, four DISTINCT cues out, in order', () => {
    const played: string[] = []
    // `tick` is jt5-5's per-frame clock on the same seam; unrecorded here because
    // this test counts the CUES four wing edges produce, and a frame tick is not one.
    const recorder = { play: (name: string): void => void played.push(name), tick: () => {} }
    const sink = recorder as unknown as Parameters<typeof playEventSounds>[0]
    playEventSounds(sink, [
      asEvent(PLAYER_WING_DOWN),
      asEvent(PLAYER_WING_UP),
      asEvent(ENEMY_WING_DOWN),
      asEvent(ENEMY_WING_UP),
    ])
    expect(played, 'a kind that falls through the switch is a silent cue').toEqual([
      'playerWingDown',
      'playerWingUp',
      'enemyWingDown',
      'enemyWingUp',
    ])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 / AC4 — EMISSION: the knight's two edges, on the exact frames
// ═════════════════════════════════════════════════════════════════════════════
//
// Staging: `createGame(0xbeef)` opens with BOTH knights airborne (measured), so
// the airborne press/release path needs no set-up at all. Every buzzard is
// hushed for the window so the streams below are exact.

describe('jt5-3 AC4 — press sounds DOWN, release sounds UP, and holding is silent', () => {
  /** The frame-by-frame script and what the ROM says each frame must sound. */
  const SCRIPT: readonly { input: PlayerInput; expect: string[]; why: string }[] = [
    { input: IDLE, expect: [], why: 'the button has never been touched' },
    { input: btn(true, true), expect: [PLAYER_WING_DOWN], why: 'PRESS — GOFLAP -> FLAST2' },
    { input: btn(false, true), expect: [], why: 'HELD — FLAPLP falls through to FLAPS2, bypassing the cue' },
    { input: btn(false, false), expect: [PLAYER_WING_UP], why: 'RELEASE — GOFLIP' },
    { input: IDLE, expect: [], why: 'still released — FLIPLP re-enters at FLIPS2' },
    { input: btn(true, true), expect: [PLAYER_WING_DOWN], why: 'PRESS again' },
    { input: btn(false, false), expect: [PLAYER_WING_UP], why: 'RELEASE on the very next frame' },
    { input: IDLE, expect: [], why: 'quiet again' },
  ]

  it('the whole wingbeat sequence lands frame for frame', () => {
    let g = hushEverythingButKnights(createGame(0xbeef))
    expect(airborne(g, 1), 'precondition: the knight starts airborne').toBe(true)

    const seen: string[][] = []
    for (const step of SCRIPT) {
      g = stepGame(g, { 1: step.input, 2: IDLE })
      expect(airborne(g, 1), 'precondition: the knight stays airborne for the whole window').toBe(
        true,
      )
      seen.push(kindsOf(g))
    }

    // NON-VACUITY first: an always-empty stream satisfies half the rows below.
    expect(
      seen.flat().length,
      'the window emitted NOTHING — every row below would be vacuous',
    ).toBeGreaterThan(0)

    seen.forEach((got, i) => {
      expect(got, `frame ${i}: ${SCRIPT[i].why}`).toEqual(SCRIPT[i].expect)
    })
  })

  it('holding for a LONG time stays silent — the level is not re-read as an edge', () => {
    // The shape the naive detector gets wrong in the other direction: emitting
    // once per frame the button is down. Forty held frames, one cue.
    let g = hushEverythingButKnights(createGame(0xbeef))
    g = stepGame(g, { 1: btn(true, true), 2: IDLE })
    expect(wingsOf(g), 'precondition: the press really sounded').toEqual([PLAYER_WING_DOWN])

    const after: string[] = []
    for (let i = 0; i < 40; i++) {
      g = stepGame(g, { 1: btn(false, true), 2: IDLE })
      after.push(...kindsOf(g))
    }
    expect(after, 'a held button sounds once, at the press').toEqual([])
  })

  it('both knights sound the SAME table, once each, on a shared frame', () => {
    // G1DEC and G2DEC bind the identical SNPLWU/SNPLWD (:5544 / :5548) — unlike
    // SNPCR1/SNPCR2, the wings are NOT per-knight. So two flaps on one frame is
    // two firings of one cue, not one firing and not two different cues.
    let g = hushEverythingButKnights(createGame(0xbeef))
    expect(airborne(g, 2), 'precondition: the second knight is airborne too').toBe(true)
    g = stepGame(g, { 1: btn(true, true), 2: btn(true, true) })
    expect(kindsOf(g)).toEqual([PLAYER_WING_DOWN, PLAYER_WING_DOWN])
  })

  it('one knight flapping does not sound for the other', () => {
    let g = hushEverythingButKnights(createGame(0xbeef))
    g = stepGame(g, { 1: btn(true, true), 2: IDLE })
    expect(kindsOf(g)).toEqual([PLAYER_WING_DOWN])
  })

  it('no knight cue is ever an ENEMY cue', () => {
    let g = hushEverythingButKnights(createGame(0xbeef))
    const all: string[] = []
    for (const input of [btn(true, true), btn(false, true), btn(false, false)]) {
      g = stepGame(g, { 1: input, 2: IDLE })
      all.push(...kindsOf(g))
    }
    // The positive half FIRST: without it the two `not.toContain`s below pass on
    // a stream that never emitted anything at all.
    expect(all, 'precondition: the knight really did sound').toEqual([
      PLAYER_WING_DOWN,
      PLAYER_WING_UP,
    ])
    expect(all).not.toContain(ENEMY_WING_DOWN)
    expect(all).not.toContain(ENEMY_WING_UP)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 (CORRECTED) — the two ways into flight sound DIFFERENTLY
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-3 AC3 — entering flight: STFLY sounds, STFALL does not', () => {
  it('a flap TAKE-OFF sounds wing-down — STFLY ends `JMP FLAST2`', () => {
    const ground = knightOnTheGround()
    expect(airborne(ground, 1), 'precondition: the knight really is standing').toBe(false)
    expect(kindsOf(ground), 'precondition: the staging frame is quiet').toEqual([])

    const off = stepGame(ground, { 1: btn(true, true), 2: IDLE })
    expect(airborne(off, 1), 'precondition: the press really took off').toBe(true)
    expect(kindsOf(off)).toEqual([PLAYER_WING_DOWN])
  })

  it('WALKING off a ledge raises no WING cue — STFALL bypasses both', () => {
    const ground = knightOnTheGround()
    const stillOn = stepGame(ground, { 1: LEFT, 2: IDLE })
    expect(airborne(stillOn, 1), 'precondition: one more step is still on the cliff').toBe(false)
    expect(kindsOf(stillOn)).toEqual([])

    // The CONTROL, on the very same staging frame: leaving the ground WITH a
    // button edge does sound. Without it, the silence below is satisfied by a
    // detector that never fires at all — which is the state of the tree in RED.
    const flappedOff = stepGame(stillOn, { 1: btn(true, true), 2: IDLE })
    expect(airborne(flappedOff, 1), 'control: the press really takes off from here').toBe(true)
    expect(kindsOf(flappedOff), 'control: this staging CAN sound').toEqual([PLAYER_WING_DOWN])

    const walkedOff = stepGame(stillOn, { 1: LEFT, 2: IDLE })
    expect(airborne(walkedOff, 1), 'precondition: THIS is the frame it leaves the ground').toBe(
      true,
    )
    expect(
      kindsOf(walkedOff),
      'becoming airborne is not itself a cue — only the button edge is',
    ).toEqual([])
  })

  it('a RELEASE while standing is silent — PLYRLP has no wing sound at all', () => {
    // The over-fire a level-difference detector produces unless it is gated on
    // flight: land while holding the button, then let go. The ground loop
    // (PLYRLP, :5948-6024) plays SNPLSK/SNPLS2/SNPRU1/SNPRU2 and never a wing.
    const ground = knightOnTheGround()
    // CONTROL first: this knight, on this frame, CAN make a wing sound. Without
    // it the two silences below are satisfied by a detector that never fires.
    expect(
      kindsOf(stepGame(ground, { 1: btn(true, true), 2: IDLE })),
      'control: a real edge on this staging does sound',
    ).toEqual([PLAYER_WING_DOWN])

    const held = stepGame(ground, { 1: btn(false, true), 2: IDLE })
    expect(airborne(held, 1), 'precondition: a held button with no EDGE does not take off').toBe(
      false,
    )
    expect(kindsOf(held), 'precondition: the hold itself is quiet').toEqual([])

    const released = stepGame(held, { 1: btn(false, false), 2: IDLE })
    expect(airborne(released, 1), 'precondition: still standing on the frame of the release').toBe(
      false,
    )
    expect(kindsOf(released), 'a knight on the ground has no wings to raise').toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — HAZARD A: the buzzard's wings
// ═════════════════════════════════════════════════════════════════════════════
//
// `stepEnemyDetailed` (enemy.ts) builds the synthetic joystick. UPDATED BY uf1-9,
// which changed both halves of what this paragraph used to say — it is kept
// because the ROM reading is still the point, and corrected because the port has
// moved underneath it.
//
// It USED to read `{ dir, flap: decision.flap, flapHeld: decision.flap }` — ONE
// bit doing both jobs — and this comment said the LATCH was what the ROM adds and
// the port lacked. uf1-9 added that latch: the joystick is now
// `{ dir, flap: pressed, flapHeld: held }`, where `held` is the wing phase the
// PJOYT cadence is holding and `pressed` is its rising edge. The machine's own
// shape is unchanged and is still the reason this is not a bug: one bit
// (`CURJOY+1`, register B), read as the edge by FLIPLP's `TSTB / BNE GOFLAP` and
// as the level by FLAPS2's `CLRB`. The latch it adds — BOUNDR holds B for
// `BOUPWD` wakes (PJOYT, "WING DOWN TIME"). So a wing-down followed by a wing-up
// on the next WAKE is the machine's own wingbeat, and the thing that must never
// happen is a second wing-down while the bit is still set.
//
// CORRECTED BY jt5-8. This paragraph also said "LINET holds B for exactly one
// wake (LNTUP -> LNTOFP)" alongside the BOUNDR clause, as though uf1-9 had built
// both. It had not: uf1-9 explicitly denied the DUMB brain a PJOY workspace, so
// as a claim about the port that sentence was false for the whole of uf1-9's
// life. jt5-8 is what makes it true, and it is a different mechanism from the
// one beside it — LINET's is two routine pointers with NO timer (`LNTUP` parks
// `#LNTOFP`, :3746-3747; `LNTOFP` restores `#LINET` and `CLRB`s, :3759-3762),
// where BOUNDR's is a DYTBL-scaled countdown. Both halves of the port are pinned
// in tests/dumb-wingbeat.test.ts, whose AC2 group is precisely the control that
// tells the two apart (the dumb alternation is identical at waves 1, 7 and 16;
// the smart cadence is not).
//
// The fixture is a dumb LINET buzzard with the intelligence budget exhausted (so
// it is not promoted out of LINET on its first wake) and its first wake staged
// RISING, so the detector's previous level is established by an observed silent
// wake rather than by whatever it defaults to.

const enemyEntity = (pixelY: number, velY: number, timeUp: number): EntityState => ({
  posX: 100,
  posY: pixelY << 8,
  velXIndex: 0,
  velXFrac: 0,
  velY,
  timeUp,
  groundState: null,
  plantZ: 0,
  airborne: true,
  animPhase: 0,
})

const BUZZARD_ID = 0xa01

function stageBuzzard(entity: EntityState, period: number): DemoState {
  const base = createWaveDemo(0x1234)
  const enemy: EnemyState = { entity, facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' }
  const buzzard: DemoProcess = {
    id: BUZZARD_ID,
    cls: 'secondary',
    nap: 1,
    period,
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
      // `nsmart === wsmart` — no promotion, so the brain stays LINET and the
      // decision below is the one `linet()` documents.
      budget: { nsmart: 0, wsmart: 0 },
    },
  }
}

const buzzardOf = (d: DemoState): DemoProcess | undefined =>
  d.sim.processes.find((p) => p.id === BUZZARD_ID)
const buzzardStepped = (before: DemoState, after: DemoState): boolean =>
  buzzardOf(before)?.enemy?.entity !== buzzardOf(after)?.enemy?.entity

describe('jt5-3 AC5 — the buzzard beats its wings, it does not machine-gun them', () => {
  it('one flapping wake, then one not: DOWN on the first, UP on the second', () => {
    // timeUp 1 makes the flap impulse a full -96, so the bird is rising on the
    // wake after it flaps and LINET stops asking. That is a whole wingbeat.
    //
    // CORRECTED BY jt5-8: this comment used to end "and it is exactly LINET's
    // LNTUP -> LNTOFP one-shot in the ROM", which attributed the silence to a
    // mechanism the port did not have. The alternation seen HERE is the flap
    // IMPULSE — at low `timeUp` a full -96 leaves the bird rising, so the lane
    // decision declines on its own and this fixture reads the same with the
    // latch absent. jt5-8 adds the real LNTUP/LNTOFP one-shot, and this fixture
    // is exactly the one that CANNOT tell you so: it is kept as the named
    // natural-glide control in tests/dumb-wingbeat.test.ts (`NATURAL_GLIDE`),
    // beside the `SUNK_AND_SINKING` fixture that can.
    let d = stageBuzzard(enemyEntity(0x90, -1, 1), 1)
    const expected: string[][] = [
      [], //  wake 0 — rising, LINET does not flap: establishes wings-UP
      [ENEMY_WING_DOWN], // wake 1 — sunk below the lane and no longer rising
      [ENEMY_WING_UP], //   wake 2 — the impulse has it climbing again
      [], //  wake 3
      [], //  wake 4
      [], //  wake 5
    ]
    const seen: string[][] = []
    for (let i = 0; i < expected.length; i++) {
      const before = d
      d = stepDemo(d, {})
      expect(buzzardStepped(before, d), `precondition: the buzzard woke on step ${i}`).toBe(true)
      expect(
        buzzardOf(d)?.enemy?.entity.airborne,
        `precondition: the buzzard is still flying on step ${i}`,
      ).toBe(true)
      seen.push(simKindsOf(d))
    }
    expect(seen.flat().length, 'nothing was emitted — the rows below are vacuous').toBeGreaterThan(0)
    seen.forEach((got, i) => expect(got, `wake ${i}`).toEqual(expected[i]))
  })

  it('a sinking buzzard ALTERNATES down/up — it cannot hold its wings at all (jt5-8)', () => {
    // jt5-8 RE-STAGE, and this one is a change of LAW-HOLDER, not a moved number
    // — read this before treating it as an ordinary re-baseline.
    //
    // This test used to be `wings HELD across many wakes sound ONCE — the edge,
    // never the level`, staged right here on a dumb buzzard: timeUp 255 spends
    // the impulse down to -1, so the bird keeps sinking and LINET keeps asking
    // for a flap on every wake, and the assertion was that the twelve wakes
    // after the press edge are SILENT.
    //
    // jt5-8 makes that staging impossible. LNTOFP (JOUSTRV4.SRC:3759-3762)
    // forbids a dumb bird from flapping on two consecutive wakes at all, so it
    // can no longer hold its wings down across wakes — the actor is gone, and
    // re-baselining this test to the alternating stream WITHOUT saying so would
    // have quietly deleted jt5-3's machine-gun guard. It did not: the law is
    // re-staged, before this edit, on the two actors that CAN still hold, in
    // tests/dumb-wingbeat.test.ts →
    //   `GUARD — a HELD wing still sounds once, on the actors that can still
    //    hold one`  (the knight, holding the button for 14 frames → exactly one
    //    `player-wing-down`; and a SMART bird, whose PJOYT cadence holds the
    //    wings down for two wakes → `down` then `null`).
    //
    // What is pinned HERE instead is the thing that replaced it, through the
    // whole `stepDemo` pipeline rather than through `stepEnemyDetailed` alone:
    // the ROM's alternation, wake after wake, for as long as the bird keeps
    // asking. Each `down` is still an EDGE — the level falls between them —
    // which is why a machine-gun would fail this test too: it would put a `down`
    // where every `up` is. The bypass jt5-7 corrected (FLAPLP falls through to
    // FLAPS2, BYPASSING the `JSR VSND`) is still the reason a held level is
    // silent; what jt5-8 removes is this brain's ability to hold one.
    let d = stageBuzzard(enemyEntity(0x90, -1, 255), 1)
    const before = stepDemo(d, {})
    expect(simKindsOf(before), 'precondition: the first wake is the silent rising one').toEqual([])

    d = stepDemo(before, {})
    expect(simKindsOf(d), 'precondition: the second wake is the press edge').toEqual([
      ENEMY_WING_DOWN,
    ])

    const rest: string[][] = []
    for (let i = 0; i < 12; i++) {
      const prev = d
      d = stepDemo(d, {})
      expect(buzzardStepped(prev, d), `precondition: the buzzard is still waking (${i})`).toBe(true)
      // The lane decision must still WANT a flap on every one of these wakes,
      // or the alternation below could be the bird having simply stopped asking
      // — the natural-glide trap, in this file's own fixture vocabulary.
      const e = buzzardOf(d)?.enemy?.entity
      // jt9-1 (R-7): `e` is genuinely `EntityState | undefined` — it is reached
      // through two optional chains, and the `buzzardStepped` precondition above
      // establishes that the buzzard MOVED, not that this lookup resolved. A
      // missing buzzard used to throw from inside `linet()`; now it fails here,
      // naming what actually went wrong.
      expect(e, `the buzzard's entity must resolve on wake ${i}`).toBeDefined()
      expect(linet({ entity: e as NonNullable<typeof e>, facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' }).flap,
        `precondition: the lane decision still wants a flap on wake ${i}`).toBe(true)
      rest.push(simKindsOf(d))
    }
    expect(rest.flat().length, 'nothing was emitted — the rows below are vacuous').toBeGreaterThan(0)
    expect(rest).toEqual([
      [ENEMY_WING_UP],
      [ENEMY_WING_DOWN],
      [ENEMY_WING_UP],
      [ENEMY_WING_DOWN],
      [ENEMY_WING_UP],
      [ENEMY_WING_DOWN],
      [ENEMY_WING_UP],
      [ENEMY_WING_DOWN],
      [ENEMY_WING_UP],
      [ENEMY_WING_DOWN],
      [ENEMY_WING_UP],
      [ENEMY_WING_DOWN],
    ])
  })

  it('a frame the buzzard does not WAKE on is silent', () => {
    // The enemy nap divider (EMYTIM) is 2 on the early waves, so its edges are
    // per WAKE and not per frame. A detector that compares a level frame-to-frame
    // instead of wake-to-wake fires in the gaps.
    let d = stageBuzzard(enemyEntity(0x90, -1, 255), 2)
    const emitted: { woke: boolean; cues: string[] }[] = []
    for (let i = 0; i < 6; i++) {
      const before = d
      d = stepDemo(d, {})
      emitted.push({ woke: buzzardStepped(before, d), cues: simKindsOf(d) })
    }
    expect(
      emitted.map((e) => e.woke),
      'precondition: the staged period really does skip alternate frames',
    ).toEqual([true, false, true, false, true, false])
    expect(emitted[2].cues, 'the press edge lands on the WAKE').toEqual([ENEMY_WING_DOWN])
    // CORRECTED BY jt5-8. This loop used to run over [0, 1, 3, 4, 5] under the
    // message "frame N is not this buzzard's wake" — but the precondition
    // directly above says frames 0 and 4 ARE wakes, so two of the five were
    // riding along under a false label and the per-frame-vs-per-wake law was
    // only ever carried by 1, 3 and 5. Split, so each index is asserted for
    // what it actually is:
    for (const i of [1, 3, 5]) {
      expect(emitted[i].cues, `frame ${i} is not this buzzard's wake`).toEqual([])
    }
    //   • frame 0 IS a wake, and is silent because the bird is still rising —
    //     LINET declines to flap, which is what establishes the wings-up level.
    expect(emitted[0].cues, 'the first wake is the silent rising one').toEqual([])
    //   • frame 4 IS a wake, and jt5-8 is what moved it: it is LNTOFP's forced
    //     glide (:3759-3762), so the wings come UP. Under the held-level port it
    //     was silent, which is the one index in this test the story touches.
    expect(emitted[4].cues, "the glide wake raises the buzzard's wings").toEqual([ENEMY_WING_UP])
  })

  it('a buzzard cue is never a KNIGHT cue', () => {
    // The two knights are in this fixture and never touch a button, so anything
    // player-shaped here is a species mix-up in the emitter.
    let d = stageBuzzard(enemyEntity(0x90, -1, 1), 1)
    const all: string[] = []
    for (let i = 0; i < 6; i++) {
      d = stepDemo(d, {})
      all.push(...simKindsOf(d))
    }
    expect(all, 'precondition: the buzzard really did sound').toContain(ENEMY_WING_DOWN)
    expect(all).not.toContain(PLAYER_WING_DOWN)
    expect(all).not.toContain(PLAYER_WING_UP)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the previous level lives IN THE STATE, not in the module
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-3 AC1 — the edge memory is carried by the state the shell steps', () => {
  /** A knight airborne with the button HELD, so the next step is a release edge. */
  function holdingTheButton(): GameState {
    const g = hushEverythingButKnights(createGame(0xbeef))
    const pressed = stepGame(g, { 1: btn(true, true), 2: IDLE })
    expect(wingsOf(pressed), 'precondition: the press sounded').toEqual([PLAYER_WING_DOWN])
    return stepGame(pressed, { 1: btn(false, true), 2: IDLE })
  }

  it('stepping the SAME state twice gives the same cue — nothing is mutated in place', () => {
    const held = holdingTheButton()
    const a = kindsOf(stepGame(held, { 1: btn(false, false), 2: IDLE }))
    const b = kindsOf(stepGame(held, { 1: btn(false, false), 2: IDLE }))
    expect(a, 'precondition: the release really sounds').toEqual([PLAYER_WING_UP])
    expect(b).toEqual(a)
  })

  it('a state round-tripped through JSON still knows the button was down', () => {
    // THE test for a `let prevFlap` living in a module: a serialised state that
    // has lost the level cannot produce the release edge, and this is the only
    // assertion in the file that can tell the two implementations apart.
    const held = holdingTheButton()
    const revived = JSON.parse(JSON.stringify(held)) as GameState
    expect(
      kindsOf(stepGame(revived, { 1: btn(false, false), 2: IDLE })),
      'the previous flap level is not on the state — a replay from a snapshot loses the cue',
    ).toEqual([PLAYER_WING_UP])
  })

  it('two games in flight do not share an edge memory', () => {
    // The other shape of the same defect: a module-scoped previous level is
    // global, so interleaving two games makes each one see the other's button.
    let held = hushEverythingButKnights(createGame(0xbeef))
    let free = hushEverythingButKnights(createGame(0x2468))
    held = stepGame(held, { 1: btn(true, true), 2: IDLE })
    free = stepGame(free, { 1: IDLE, 2: IDLE })
    expect(wingsOf(held), 'precondition: only the first game pressed').toEqual([PLAYER_WING_DOWN])
    expect(wingsOf(free)).toEqual([])

    for (let i = 0; i < 4; i++) {
      held = stepGame(held, { 1: btn(false, true), 2: IDLE })
      free = stepGame(free, { 1: IDLE, 2: IDLE })
      expect(wingsOf(held), `held game, extra frame ${i}`).toEqual([])
      expect(wingsOf(free), `idle game, extra frame ${i}`).toEqual([])
    }

    expect(wingsOf(stepGame(held, { 1: btn(false, false), 2: IDLE }))).toEqual([PLAYER_WING_UP])
    expect(wingsOf(stepGame(free, { 1: IDLE, 2: IDLE }))).toEqual([])
  })

  it('the stream is REBUILT per frame — a wing cue does not survive into the next', () => {
    // jt5-1's rule, restated for the kinds this story adds: the trap replay
    // determinism cannot see, because a stale carry-forward is carried forward
    // identically in both runs.
    let g = hushEverythingButKnights(createGame(0xbeef))
    g = stepGame(g, { 1: btn(true, true), 2: IDLE })
    expect(kindsOf(g), 'precondition: the press sounded').toEqual([PLAYER_WING_DOWN])
    g = stepGame(g, { 1: btn(false, true), 2: IDLE })
    expect(kindsOf(g), "'player-wing-down' survived a frame with no edge").toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// jt9-3 — TWO OF THE THREE jt5-3 INVARIANTS THAT SHIPPED HELD BY PROSE ALONE
//
// jt5-3's Reviewer ran a 24-mutation battery against this seam. Twenty-one
// mutations reddened something; THREE reddened nothing at all, which means three
// behaviours this story deliberately chose were documented in a comment and
// enforced by no test. The shipped code is CORRECT in all three cases — nothing
// below changes behaviour, it pins it.
//
// RE-MEASURED 2026-08-03 against the grown suite, because the original figure
// was "0 of 1979" and the project is now 2499 tests: all three mutations still
// pass 2499 of 2499. Nothing in the intervening two days covered them by
// accident, so all three guards are genuinely new coverage rather than
// duplicates of somebody else's.
//
// TWO of the three are frame.ts's and live here, beside the emission groups
// above. The third — `stepDemo` emitting flight cues before collision cues —
// needs the two-bodies-at-one-lance-height staging that audio-thud.test.ts
// already owns, so it lives there rather than being written twice.
// `grep -rn jt9-3 plugins/joust/tests` finds all three.
//
// ─── EACH GROUP RECORDS ITS MUTATION VERBATIM ────────────────────────────────
// Hazard C at the head of this file is the whole reason: a seam whose sweeps all
// read one shared tuple agrees with itself whether or not anything works, and
// six of jt5-1's eleven cues could once be deleted with the suite green. So a
// guard nobody has watched FAIL is not a guard. Every group below was run with
// its mutation applied (red), then reverted (green), and the diff that produced
// the red is written out so the battery can be repeated by anyone.
//
// ─── WHY THE ACCUMULATION GUARDS USE THE RAW `stepFrame` SEAM ────────────────
// For the ACCUMULATION invariant this is not preference but a STRUCTURAL
// necessity, and the two invariants differ here — see the correction at the
// foot of this block. `stepDemo` calls
//
//     stepFrame({ ...demo.sim, targets: tickedTargets, cues: [] }, …)
//
// which overwrites `cues` on the way IN. So no amount of play through
// `stepGame` can ever observe `stepFrame` reading `state.cues` — that is
// precisely why the accumulate mutation reddened nothing, and why the
// "the stream is REBUILT per frame" test immediately above, which goes through
// `stepGame`, cannot see it. It tests the DEMO's rebuild, not the scheduler's.
//
// THE `wasAirborne` GROUP IS A DIFFERENT CASE — corrected by the Reviewer,
// 2026-08-03, because the first draft of this block claimed the necessity for
// BOTH and that is false. The pre-step read IS observable through `stepGame`,
// and this story's own `WALKING off a ledge…` guard observes it that way: it
// plays three `stepGame` frames and reddens under the M1 mutation. Its three
// siblings use the raw seam only because staging a one-step landing is cheaper
// there than playing one out — preference, not necessity. The distinction
// matters to anyone extending these guards: only the accumulation invariant
// FORCES the raw seam.
// ═════════════════════════════════════════════════════════════════════════════

const RAW_PID = 1

/** An airborne knight at the raw scheduler seam: pixels in, the sim's 8.8 fixed
 *  point out. Same shape audio-thud.test.ts stages its bodies with. */
const rawEntity = (posXpx: number, posYpx: number, velY: number): EntityState => ({
  posX: posXpx,
  posY: posYpx << 8,
  velXIndex: 0,
  velXFrac: 0,
  velY,
  timeUp: 10,
  groundState: null,
  plantZ: 0,
  airborne: true,
  animPhase: 0,
})

/**
 * One player process, alone, waking every frame.
 *
 * `prevFlapHeld` is SEEDED rather than played in, and that is not a synthetic:
 * it is a first-class `ProcessSpec` field which `runBehaviour` writes on every
 * single player wake (`prevFlapHeld: input.flapHeld`), so `true` here is exactly
 * the state the sim itself leaves behind after any held frame. Playing it in
 * would cost a press frame whose flap impulse moves the measured landing.
 */
const rawSim = (e: EntityState, prevFlapHeld: boolean): SimState =>
  spawn(createState(0x1234), {
    id: RAW_PID,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    entity: e,
    prevFlapHeld,
  })

const rawCues = (s: SimState): string[] => s.cues.map((c) => c.type as string)
const rawAirborne = (s: SimState): boolean | undefined =>
  s.processes.find((p) => p.id === RAW_PID)?.entity?.airborne

describe('jt9-3 — the airborne level is read BEFORE the step, never after', () => {
  // ─── THE MUTATION THIS GROUP FORBIDS ───────────────────────────────────────
  // src/core/frame.ts, `runBehaviour`, the `p.kind === 'player'` branch:
  //
  //   -    const wasAirborne = p.entity.airborne
  //        const prevFlapHeld = p.prevFlapHeld ?? false
  //        …
  //        const entity = stepPlayerEntity(p.entity, input, facing)
  //   +    const wasAirborne = entity.airborne
  //
  // It moves ONE read across ONE call. It is neither a deletion nor a permissive
  // widening — the mutant computes a DIFFERENT answer, on exactly the frames
  // where `airborne` flips INSIDE `stepPlayerEntity`, and an identical one on
  // every other frame. That is why 3000 frames of scripted play move the cue
  // count by ONE (1610 → 1609, jt5-3's Reviewer) and why no seeded replay
  // fingerprint notices: the divergence is two or three frames in three
  // thousand, and a digest that never reaches one of them is unmoved.
  //
  // MEASURED 2026-08-03: with the mutation applied and none of these tests
  // present, 2499 of 2499 joust tests pass.
  //
  // BOTH DIRECTIONS ARE PINNED, deliberately. A landing (true → false) makes the
  // mutant SWALLOW a cue the machine plays; a walk-off (false → true) makes it
  // INVENT one the machine does not. A guard for only one of them is satisfied
  // by a fix that special-cases that one.

  /** x=100, y=162, velY=+256. MEASURED, not guessed: the first cell of a
   *  y ∈ [120,200] sweep at x=100 where ONE step puts this knight on a
   *  platform. `groundOutcome` reports `platform` for the position the step
   *  lands on, which is what flips `airborne` inside `stepPlayerEntity`. */
  const aboutToLand = (): EntityState => rawEntity(100, 162, 256)

  it('a knight that LANDS on its release frame still sounds wing-up', () => {
    const landing = stepFrame(rawSim(aboutToLand(), true), { [RAW_PID]: btn(false, false) })

    // THE precondition the whole test rests on: `airborne` really does flip
    // inside this one step. Without it the staging silently degenerates into the
    // aloft control below and the assertion passes for an unrelated reason.
    expect(rawAirborne(landing), 'staging: THIS is the frame the knight lands on').toBe(false)

    expect(
      rawCues(landing),
      'GOFLIP sounds because the bird was in FLIPLP when the frame BEGAN. Reading the ' +
        'level after `stepPlayerEntity` has landed it takes the GROUND branch of ' +
        '`wingEdge`, whose only cue is a flap take-off — so the release is swallowed.',
    ).toEqual([PLAYER_WING_UP])
  })

  it('the same release twenty pixels higher sounds too — the control that must NOT move', () => {
    // Airborne before AND after, so the mutant computes the identical answer
    // here and this test stays GREEN under it. Its job is to prove the
    // assertion above is about the LANDING, and not about release edges being
    // broken in general — which is the reading a lone red would also support.
    const aloft = stepFrame(rawSim(rawEntity(100, 142, 256), true), {
      [RAW_PID]: btn(false, false),
    })
    expect(rawAirborne(aloft), 'control: this one is still flying afterwards').toBe(true)
    expect(rawCues(aloft), 'control: a release edge in open air sounds').toEqual([PLAYER_WING_UP])
  })

  it('landing with the button still HELD is silent — a landing is not itself a cue', () => {
    // The negative half, on the SAME staging. `wingEdge` has no edge to report,
    // so neither reading sounds. Without it, the first test above is satisfied
    // by a rule as crude as "any landing emits wing-up".
    const held = stepFrame(rawSim(aboutToLand(), true), { [RAW_PID]: btn(false, true) })
    expect(rawAirborne(held), 'staging: it lands on this frame too').toBe(false)
    expect(rawCues(held), 'the button never moved — there is no edge to sound').toEqual([])
  })

  it('WALKING off a ledge on the release frame stays SILENT — the other direction', () => {
    // The mirror image: `airborne` flips false → true inside the step. The
    // pre-step read sees the GROUND loop, whose only wing cue is a flap
    // take-off (`input.flap`), so a release that happens to coincide with
    // walking off is silent — STFALL's `BRA FLIPS2` (:6157), already re-opened
    // at the head of this file. The post-step read sees FLIPLP instead and
    // manufactures a `player-wing-up` the machine never plays.
    const ground = knightOnTheGround()
    const armed = stepGame(ground, { 1: LEFT_HELD, 2: IDLE })
    expect(airborne(armed, 1), 'staging: still standing on the cliff, button down').toBe(false)

    // CONTROL FIRST, on the very same staging: this knight, on this frame, CAN
    // make a wing sound. Without it the silence below is satisfied by a detector
    // that has stopped firing at all.
    const pressed = stepGame(armed, { 1: btn(true, true), 2: IDLE })
    expect(airborne(pressed, 1), 'control: the press really takes off from here').toBe(true)
    expect(kindsOf(pressed), 'control: this staging CAN sound').toEqual([PLAYER_WING_DOWN])

    const walkedOff = stepGame(armed, { 1: LEFT, 2: IDLE })
    expect(airborne(walkedOff, 1), 'staging: THIS is the frame it leaves the ground').toBe(true)
    expect(
      kindsOf(walkedOff),
      'STFALL enters FLIPLP at its BYPASS label, so a release coinciding with the ' +
        'walk-off must not manufacture a wing-up',
    ).toEqual([])
  })
})

describe('jt9-3 — `GameState.cues` is REBUILT every frame, never accumulated', () => {
  // ─── THE MUTATION THIS GROUP FORBIDS ───────────────────────────────────────
  // src/core/frame.ts, `stepFrame`:
  //
  //   -  const cues: GameEvent[] = []
  //   +  const cues: GameEvent[] = [...state.cues]
  //
  // MEASURED 2026-08-03: with it applied, 2499 of 2499 joust tests pass. The
  // field's own doc comment says the cues are "REBUILT from scratch every step,
  // never accumulated (`stepFrame` never READS `state.cues`, only builds a fresh
  // one)" — and until this group that sentence was the entire enforcement.
  //
  // WHY IT COULD ROT UNSEEN. A carried-forward cue is invisible to every seeded
  // replay digest, because both runs carry it forward identically; and it is
  // unreachable through `stepDemo`, which passes `cues: []` in. It would first
  // appear in the SHELL, as one sound repeating for the rest of the game —
  // which is the failure this whole seam was designed to make impossible.

  /** A kind no wing edge can raise, so finding it in the output can only mean it
   *  was carried in. Deliberately NOT a wing cue: a sentinel from the family the
   *  emitter itself raises cannot tell carry-forward from a fresh emission. */
  const CARRIED: GameEvent = { type: 'egg-hatched' }
  const aloft = (): SimState => rawSim(rawEntity(100, 60, 256), true)

  it('a cue handed IN does not come back out — even on a frame that emits', () => {
    const out = stepFrame({ ...aloft(), cues: [CARRIED] }, { [RAW_PID]: btn(false, false) })
    expect(rawCues(out), 'precondition: this frame is not silent — the release fired').toEqual([
      PLAYER_WING_UP,
    ])
    expect(
      rawCues(out),
      "'egg-hatched' was handed in on `state.cues` and must not survive the step",
    ).not.toContain('egg-hatched')
  })

  it('and not on a SILENT frame either — the output is [], not the input', () => {
    // The stronger half, and the one that actually kills the mutant: an EXACT
    // empty array. A lone `not.toContain` on a frame that emits something can be
    // satisfied by a stream that carried everything else forward.
    const out = stepFrame({ ...aloft(), cues: [CARRIED] }, { [RAW_PID]: btn(false, true) })
    expect(
      rawCues(out),
      'a held button raises no edge, so this frame must emit NOTHING at all',
    ).toEqual([])
  })

  it('the array handed in is neither returned nor written to', () => {
    // A third shape of the same defect, which the two above would both pass:
    // `const cues = state.cues as GameEvent[]` reuses the caller's array, so the
    // scheduler scribbles on a state its caller is still holding. `stepFrame` is
    // a pure reducer; this is that promise, observed rather than asserted.
    const handedIn: GameEvent[] = [CARRIED]
    const out = stepFrame({ ...aloft(), cues: handedIn }, { [RAW_PID]: btn(false, false) })
    expect(rawCues(out), 'precondition: the step really did emit').toEqual([PLAYER_WING_UP])
    expect(Object.is(out.cues, handedIn), 'the returned array IS the one handed in').toBe(false)
    expect(handedIn, 'stepFrame wrote into its own argument').toEqual([CARRIED])
  })

  it('two steps of one state do not share a cue array', () => {
    // The module-scoped-accumulator shape — the same defect the "two games in
    // flight do not share an edge memory" test above guards for `prevFlapHeld`.
    // It survives the accumulate mutation and is not meant to catch it.
    const armed = aloft()
    const a = stepFrame(armed, { [RAW_PID]: btn(false, false) })
    const b = stepFrame(armed, { [RAW_PID]: btn(false, false) })
    expect(rawCues(a), 'precondition: both steps really emit').toEqual([PLAYER_WING_UP])
    expect(rawCues(b), 'the same state stepped twice gives the same stream').toEqual(rawCues(a))
    expect(Object.is(a.cues, b.cues), 'two frames must not share one array').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — determinism: the detector adds no draw, no re-ordering, no physics
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-3 — jt2 replays still reproduce bit for bit', () => {
  const DIRS: readonly (-1 | 0 | 1)[] = [-1, -1, 0, 1, 1]
  const scripted = (frame: number): PlayerInput => {
    const flap = frame % 13 === 0
    return { dir: DIRS[frame % 5], flap, flapHeld: flap }
  }

  /** Every entity's position/velocity/airtime after `frames` frames. jt5-1's
   *  fingerprint pins the rng cursor, the process ORDER and the ledgers; it does
   *  NOT pin where anything IS. Threading the new level through `flap()` or
   *  `stepFlight()` — e.g. selecting gravity from the PREVIOUS level instead of
   *  the current one — moves every bird and moves none of jt5-1's numbers. */
  function entityDigest(seed: number, frames: number): string[] {
    let g = createGame(seed)
    for (let f = 0; f < frames; f++) g = stepGame(g, { 1: scripted(f), 2: IDLE })
    return g.sim.sim.processes.map((p) => {
      const e = p.entity ?? p.enemy?.entity
      return e
        ? `${p.kind}#${p.id}:${e.posX},${e.posY},${e.velY},${e.velXIndex},${e.velXFrac},${e.timeUp},${e.airborne ? 1 : 0}`
        : `${p.kind}#${p.id}:-`
    })
  }

  it('seed 0xbeef, 200 frames — jt5-4/uf1-8/jt9-8 re-baselined: a discriminating full-sim digest (jt9-8 moves player#1 — see comment)', () => {
    // MEASURED against the tree at 6d93fa2 (pre-jt5-4), with this exact script;
    // re-measured post-jt5-4 (session AC-7 ruling — only the bounced bird
    // moved) and again post-uf1-8, whose range-gated brains re-fly BOTH smart
    // buzzards from their first promoted wake (audio-thud.test.ts AC7 carries
    // the uf1-8 ruling). What keeps this a regression guard and not a blanket
    // re-baseline: `player#1` and `player#2` are bit-identical across all FOUR
    // trees — the flap/flight seam this suite pins is player-shared, so a change
    // that moves a PLAYER row here is a bug whatever story it rides in on.
    //
    // uf1-9 RE-BASELINE, and the EGG left the invariant. Both player rows are
    // byte-for-byte what they were, and so is `enemy#256` — that is the
    // assertion that matters. The rest moved because the wing cadence is now the
    // ROM's: `enemy#257` is still ALIVE at frame 200 where it used to be dead, so
    // the egg it used to have become (`egg#65793`) does not exist yet and
    // `enemy#258` is elsewhere. The egg can no longer be cited as an unchanged
    // row — it is downstream of a KILL, and kill timing is exactly what a flap
    // cadence moves.
    //
    // jt5-8 RE-BASELINE, and the invariant survives a FIFTH tree: `player#1`,
    // `player#2` AND `enemy#256` are byte-for-byte what they were — a change
    // that moves a player row here is still a bug whatever story it rides in on.
    // The dumb wingbeat swings the kill the other way: `enemy#257` dies at frame
    // 199 (it was alive at 200 under uf1-9, dead under uf1-8), so `egg#65793` is
    // back in the list and `enemy#258` is elsewhere again. Which enemy row moves
    // is not the claim; that no PLAYER row does, is.
    //
    // jt9-24 RE-BASELINE (decoded SELPLY metric): the invariant survives a SIXTH
    // tree, and this is the pin narrowing to its true claim — `player#1` and
    // `player#2` are STILL byte-for-byte what they were. `enemy#256` now moves
    // (its y/vy change: the decoded nearest-of-two metric re-routes which knight
    // the buzzard homes on), which is exactly what an ENEMY row is permitted to
    // do. The claim was never "enemy#256 is invariant" — it is "no PLAYER row
    // moves", and that holds.
    //
    // jt9-8 + jt9-43 COMBINED RE-BASELINE. jt9-8 puts the ROM's `CLR PTIMUP,U` back on
    // the player's wing transitions (frame.ts `runBehaviour`; pinned by
    // ptimup-reset.test.ts), so a knight's flap-lift budget RE-INITs on every edge —
    // this every-13th-frame script is nothing but wing edges, so player#1's whole
    // 200-frame trajectory legitimately changes (it now ends still climbing with a
    // fresh budget). jt9-43 then folds BPCOL's COLDX (screen-precise collision): the
    // box-only kill that removed `enemy#257` was an X-blind over-reach the mask now
    // REJECTS, so the enemy/egg rows move too. The "no PLAYER row moves" invariant is
    // retired (jt9-8 owns the flap seam on purpose); what survives is a frozen,
    // DISCRIMINATING full-sim digest that still catches any UNINTENDED perturbation.
    // MEASURED on the integrated (jt9-8 + jt9-43) tree, seed 0xbeef, 200 frames.
    expect(entityDigest(0xbeef, 200)).toEqual([
      'player#1:42,14656,0,-4,192,3,1',
      'player#2:200,32768,0,0,0,1,0',
      'enemy#256:171,28788,-33,8,64,101,1',
      'enemy#257:54,33030,-15,8,0,82,1',
      'enemy#258:171,33756,-20,8,64,101,1',
    ])
  })

  it('the digest is DISCRIMINATING — another seed puts the birds elsewhere', () => {
    expect(entityDigest(0xbeef, 200)).not.toEqual(entityDigest(0x2468, 200))
  })

  it('two runs of one seed emit an identical per-frame WING stream', () => {
    const run = (seed: number): string[][] => {
      let g = createGame(seed)
      const perFrame: string[][] = []
      for (let f = 0; f < 240; f++) {
        g = stepGame(g, { 1: scripted(f), 2: IDLE })
        perFrame.push(wingsOf(g))
      }
      return perFrame
    }
    const a = run(0xbeef)
    const b = run(0xbeef)
    // Non-vacuity BEFORE the comparison: two empty runs match forever, and both
    // parties (knight and buzzard) must actually have flapped.
    expect(a.flat().length, 'the replay emitted no wings at all').toBeGreaterThan(0)
    expect(
      new Set(a.flat()).size,
      'the run must exercise more than one wing kind',
    ).toBeGreaterThan(1)
    expect(a.flat(), 'ordinary play must reach the buzzard cue too').toContain(ENEMY_WING_DOWN)
    expect(a.flat(), 'and the knight cue').toContain(PLAYER_WING_DOWN)
    expect(b).toEqual(a)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — HAZARD B: jt5-1's deferred guard, and the rename that would dodge it
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-3 AC6 — the flap leaves jt5-1’s deferred list, and only the flap', () => {
  /** The literal `deferred` array in the sibling guard, as SOURCE TEXT. Reading
   *  the guard rather than importing it is the point: the guard is a hard-coded
   *  list, so only its text can say what it still forbids. */
  function deferredNames(): string[] {
    const src = readFileSync(join(root, 'tests', 'audio-events.test.ts'), 'utf8')
    const m = /const deferred = \[([^\]]*)\]/.exec(src)
    if (!m) throw new Error('audio-events.test.ts no longer declares a `deferred` array')
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  }

  it('the guard still exists and still forbids the kinds jt5-3 does NOT wire', () => {
    const deferred = deferredNames()
    expect(deferred.length, 'an emptied guard forbids nothing').toBeGreaterThan(0)
    // jt5-3 shipped requiring 'player-thud', 'enemy-thud', 'thud' and
    // 'troll-grab' here — its point being that jt5-3 must not clear the guard
    // wholesale. jt5-4 has since WIRED the thuds (it applies the bounce
    // collisionPass discarded), so requiring them would now make this guard the
    // lie it was written to prevent; tests/audio-thud.test.ts asserts they are
    // gone AND that both kinds are declared and emitted. 'troll-grab' is the
    // remaining deferral (uf1-10/uf1-11) and is still required here, so this
    // test keeps its original job: jt5-3's list may shrink only as far as the
    // stories that own each name.
    expect(
      deferred,
      "'troll-grab' belongs to uf1-10/uf1-11 and must stay deferred",
    ).toContain('troll-grab')
  })

  it('no flap-family name is deferred any more — the emitters exist now', () => {
    const deferred = deferredNames()
    for (const kind of ['player-flap', 'enemy-flap', 'flap']) {
      expect(
        deferred,
        `'${kind}' is still listed as unreachable, but jt5-3 wires the flap — the guard now lies`,
      ).not.toContain(kind)
    }
    // The dodge this file exists to close: a Dev who renames the new kinds to
    // something the list does not mention satisfies jt5-1's guard while wiring
    // nothing. So the family must be REACHABLE, by these names, and emitted —
    // which the groups above assert. Restated here so the two halves of AC6
    // fail together and a reader sees why.
    for (const kind of WING_KINDS) {
      expect(kindsTuple, `EVENT_KINDS is missing '${kind}'`).toContain(kind)
      expect(deferred, `'${kind}' cannot be both declared and deferred`).not.toContain(kind)
    }
  })
})
