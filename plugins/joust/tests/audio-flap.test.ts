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
// at `FLAPS2`/`FLIPS2` (:6170 / :6197) — the labels BELOW each `JSR VSND` —
// which is precisely why holding the button does not machine-gun the cue.
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
//     enters both loops BELOW their cues. Both are pinned below.
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
import { EVENT_KINDS, type GameEvent } from '../src/core/events.js'
import { CHANNELS, CUE_SOURCES, SOUNDS, type CueSource } from '../src/shell/audio.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import type { EntityState, PlayerInput } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

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
/** `flap` is the shell's RISING edge, `flapHeld` the level (shell/input.ts:45). */
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

  it('a HELD button re-enters BELOW the cue — which is why holding is silent', () => {
    expect(vendoredLine('JOUSTRV4.SRC', 6170)).toBe('FLAPS2\tCLRB\t\t\tNO OFFSET TO GRAVITY')
    expect(vendoredLine('JOUSTRV4.SRC', 6197)).toBe('FLIPS2\tLDB\t#$04\t\tOFFSET TO GRAVITY')
  })

  it('STFLY jumps AT the wing-down cue; STFALL enters BELOW both cues', () => {
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
    { input: btn(false, true), expect: [], why: 'HELD — FLAPLP re-enters at FLAPS2, below the cue' },
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

  it('WALKING off a ledge is silent — STFALL enters below both cues', () => {
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
// as the level by FLAPS2's `CLRB`. The latch it adds — LINET holds B
// for exactly one wake (LNTUP -> LNTOFP), BOUNDR for `BOUPWD` wakes (PJOYT, "WING
// DOWN TIME"). So a wing-down followed by a wing-up on the next WAKE is the
// machine's own wingbeat, and the thing that must never happen is a second
// wing-down while the bit is still set.
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
    // wake after it flaps and LINET stops asking. That is a whole wingbeat, and
    // it is exactly LINET's LNTUP -> LNTOFP one-shot in the ROM.
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

  it('wings HELD across many wakes sound ONCE — the edge, never the level', () => {
    // timeUp 255 spends the impulse down to -1, so the bird keeps sinking and
    // LINET keeps asking for a flap on every wake. The ROM's FLAPLP loops on
    // that condition and re-enters at FLAPS2, BELOW the `JSR VSND`.
    let d = stageBuzzard(enemyEntity(0x90, -1, 255), 1)
    const before = stepDemo(d, {})
    expect(simKindsOf(before), 'precondition: the first wake is the silent rising one').toEqual([])

    d = stepDemo(before, {})
    expect(simKindsOf(d), 'precondition: the second wake is the press edge').toEqual([
      ENEMY_WING_DOWN,
    ])

    const rest: string[] = []
    for (let i = 0; i < 12; i++) {
      const prev = d
      d = stepDemo(d, {})
      expect(buzzardStepped(prev, d), `precondition: the buzzard is still waking (${i})`).toBe(true)
      rest.push(...simKindsOf(d))
    }
    expect(rest, 'a wing-down per wake is a machine-gun, not a wingbeat').toEqual([])
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
    for (const i of [0, 1, 3, 4, 5]) {
      expect(emitted[i].cues, `frame ${i} is not this buzzard's wake`).toEqual([])
    }
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

  it('seed 0xbeef, 200 frames — jt5-4 then uf1-8 re-baselined: the players never move', () => {
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
    expect(entityDigest(0xbeef, 200)).toEqual([
      'player#1:40,30508,326,-4,192,161,1',
      'player#2:200,32768,0,0,0,1,0',
      'enemy#256:171,30017,-13,8,64,101,1',
      'enemy#257:34,35072,0,2,0,1,0',
      'enemy#258:171,38715,178,8,64,101,1',
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
