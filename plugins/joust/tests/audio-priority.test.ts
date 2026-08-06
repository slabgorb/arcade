// tests/audio-priority.test.ts
//
// Story jt5-5 (epic jt5) — RED phase (Mr. Praline / TEA). joust wires its
// already-recorded ROM priorities, and the frame windows they hold the voice for,
// through to the shared engine's new arbitration (AC3), and the claim jt5-3 left
// overreaching becomes true of THIS PORT rather than only of the machine (AC5).
//
// The mechanism itself is pinned next door in `src/shared/tests/audio-priority.test.ts`.
// This file is about joust's NUMBERS, and about one number in particular being
// much harder to read off the ROM than the story assumed.
//
// ─── THE DURATION TRAP: A CUE'S TABLE IS NOT ALWAYS ITS CITED LINE ───────────
// The story asks for frame durations "parsed from ROM verbatim strings". For 15
// of joust's 18 cues that works, because their whole table is one `FCB` row. For
// THREE of them it is wrong, and quietly so — the row parses cleanly and yields a
// number that is simply not the table's length.
//
// The sound table's own format header says how a table ends
// (`JOUSTRV4.SRC:8045-8049`, byte-exact):
//
//   *	SOUND TABLE
//   *	 PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)
//
// "IF M.S.BIT SET ON SOUND" — a pair whose CODE carries `+$80` is followed by
// another pair, and the assembler is free to put that pair on the next line. Three
// of joust's cues do exactly that:
//
//   SNPCR1 (playerMaterialise) — :8116-8118, and its cited row is :8116
//     8116: SNPCR1	FCB	070,!N$12!+$80,30	PLAYER 1 RE-CREATED (TRANSPORTER)
//     8117: 	FCB	    !N$14!+$80,255	PLAYER FADING IN  (TRANSPORTER)
//     8118: 	FCB	    !N$00!.$7F,165
//     cited row alone → 30 frames.   Whole table → 30+255+165 = 450 frames. 15x.
//
//   SNPTED (pteroDeath) — :8091-8093, and its cited row is :8091
//     8091: SNPTED	FCB	066,!N$16!+$80,15,!N$16!+$80,15	PTERODACTYL DYING SOUND
//     8092: 	FCB	    !N$16!+$80,07,!N$16!+$80,7
//     8093: 	FCB	    !N$16!.$7F,90
//     cited row alone → 30 frames.   Whole table → 15+15+7+7+90 = 134 frames.
//
//   SNPCR2 (player2Materialise) — :8119-8121, and its cited row is :8119
//     8119: SNPCR2	FCB	070,!N$12!+$80,30+13	PLAYER 2 RE-CREATED (TRANSPORTER)
//     8120: 	FCB	    !N$15!+$80,255	PLAYER FADING IN  (TRANSPORTER)
//     8121: 	FCB	    !N$00!.$7F,165-13
//     cited row alone → 30+13 = 43 frames.   Whole table → 43+255+152 = 450 frames.
//     (jt5-6's 18th cue — SNPCR1's player-2 twin; the +13/-13 offsets net to 450.)
//
// All three cited rows are byte-perfect. All three are the wrong length. This is the
// repo's standing lesson about its own citation gate — the gate re-opens the
// QUOTED LINE and can neither see nor check what a reading of that line claims —
// arriving here as an off-by-15x rather than as prose. The `+$80` continuation
// bit is the tell, and it is checkable: a table is complete at the first pair
// whose code does NOT carry `+$80`.
//
// So the expected windows below are the FULL-TABLE totals, and
// `the two multi-line tables are not truncated to their cited row` fails
// specifically against the single-line shortcut. If Dev parses only `verbatim`,
// 15 cues come out right and those three come out their cited rows (30, 30 and 43) — a bug that would be
// inaudible until a transporter materialise stopped holding the voice for the
// seven and a half seconds the machine gives it.
//
// ─── CONTRACT Dev implements ─────────────────────────────────────────────────
//   • createAudioEngine() passes `priorities` (all 18, from CUE_SOURCES) and
//     `frameDurations` (all 18, the FULL table totals) to the shared engine.
//   • `playEventSounds` advances the clock exactly ONCE per call, BEFORE it plays
//     any of that frame's cues — the machine decrements STMR in `EXECST`
//     (SYSTEM.SRC:173-187) at the top of the frame, and only then does game logic
//     reach `SND`. It is called once per STEPPED frame inside `pumpFrames`
//     (`src/main.ts`), so that is the ROM's own cadence.
//
// ─── RED audit — the THREE tests here that pass before the fix ───────────────
// 12 of these 15 fail today. The three that pass are all of one shape: they
// assert that a cue IS heard (`lets the priority-80 playerDeath interrupt`,
// `accepts that same enemyDeath on the frame the window closes`, `still lets the
// knight's wingbeat interrupt the buzzard's`), and today every cue is heard
// because nothing arbitrates. They are kept because each one guards the opposite
// error from its neighbours — an implementation that refuses too MUCH, inverts
// the comparison, or never reopens the window — and each would fail against it.
// They are weak now and load-bearing later; that is the correct trade for a
// one-way mechanism, where the failure everyone tests for is the false refusal
// and the failure that actually ships is the silence.
//
// The `>= 128` test would have been a fourth, and a genuinely vacuous one: "no
// priority exceeds 127" is trivially true of a manifest with no priorities. It
// asserts the map is fully populated first, so it cannot go green over an engine
// that never learned to arbitrate.
import { describe, it, expect, vi } from 'vitest'
import { CUE_SOURCES, type SoundName } from '../src/shell/audio.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'

// The shared engine is replaced wholesale so this file observes the NUMBERS
// joust passes rather than any audio behaviour — no AudioContext, no canvas.
// `vi.mock` rather than assigning onto the imported namespace: an ES module
// namespace object is frozen and exposes getters only, so monkeypatching it
// throws `Cannot set property ... which has only a getter` and every test in the
// file dies for a reason that has nothing to do with what it asserts.
const hoisted = vi.hoisted(() => ({ captured: [] as Record<string, unknown>[] }))
vi.mock('@shared/audio', () => ({
  createAudioEngine: (manifest: Record<string, unknown>) => {
    hoisted.captured.push(manifest)
    return {
      resume() {},
      play() {},
      startLoop() {},
      stopLoop() {},
      ready: () => false,
      tick() {},
    }
  },
}))

// ─── The ROM's numbers, transcribed from the FULL extent of each table ───────
// priority is CUE_SOURCES' own recorded byte; frames is the sum of every
// (code, duration) pair in the table, following `+$80` continuations across
// lines. `lines` is the table's real extent in JOUSTRV4.SRC — cite THAT, not
// just the defining row, for any claim about how long a cue holds the voice.
const ROM: Record<SoundName, { priority: number; frames: number; lines: string }> = {
  enemyDeath: { priority: 40, frames: 20, lines: '8104' },
  playerDeath: { priority: 80, frames: 20, lines: '8115' },
  eggCollected: { priority: 45, frames: 30, lines: '8098' },
  eggHatched: { priority: 45, frames: 30, lines: '8099' },
  pteroArrives: { priority: 65, frames: 60, lines: '8094' },
  pteroDeath: { priority: 66, frames: 134, lines: '8091-8093' },
  playerMaterialise: { priority: 70, frames: 450, lines: '8116-8118' },
  // jt5-6 — player 2's own table. Same priority and the same 450-frame window,
  // reached differently: `30+13` on the opener and `165-13` on the silent tail,
  // so the 13 frames are MOVED head-ward rather than added. A transcription
  // that read the digits instead of the expressions would land on 450 by luck.
  player2Materialise: { priority: 70, frames: 450, lines: '8119-8121' },
  enemyMaterialise: { priority: 40, frames: 91, lines: '8103' },
  extraMan: { priority: 100, frames: 90, lines: '8089' },
  waveBounty: { priority: 50, frames: 60, lines: '8096' },
  cliffDestroyed: { priority: 67, frames: 90, lines: '8090' },
  playerWingDown: { priority: 10, frames: 90, lines: '8126' },
  playerWingUp: { priority: 10, frames: 90, lines: '8125' },
  enemyWingDown: { priority: 6, frames: 60, lines: '8108' },
  enemyWingUp: { priority: 6, frames: 60, lines: '8107' },
  playerThud: { priority: 20, frames: 31, lines: '8124' },
  enemyThud: { priority: 9, frames: 31, lines: '8106' },
}

/** The manifest the joust wrapper hands the shared engine. */
interface ArbitratedManifest {
  sounds: Record<string, string>
  channels: Record<string, string>
  priorities?: Partial<Record<string, number>>
  frameDurations?: Partial<Record<string, number>>
}

/** The manifest joust's `createAudioEngine()` hands the (mocked) shared factory. */
async function captureManifest(): Promise<ArbitratedManifest> {
  hoisted.captured.length = 0
  const { createAudioEngine } = await import('../src/shell/audio.js')
  createAudioEngine()
  expect(
    hoisted.captured,
    'joust must build its engine through the shared factory — exactly one manifest per call',
  ).toHaveLength(1)
  return hoisted.captured[0] as unknown as ArbitratedManifest
}

/** A recording engine that implements the arbitration under test. */
function recordingEngine(manifest: ArbitratedManifest) {
  const sounded: string[] = []
  let voicePriority = 0
  let window = 0
  return {
    sounded,
    tick(): void {
      if (window > 0) window -= 1
    },
    play(name: string): void {
      const p = manifest.priorities?.[name]
      if (p === undefined) {
        sounded.push(name)
        return
      }
      if (window > 0 && p < voicePriority) return // BLO NOSND
      sounded.push(name)
      voicePriority = p
      window = manifest.frameDurations?.[name] ?? 0
    },
  }
}

const NAMES = Object.keys(ROM) as SoundName[]

// ── AC3: the numbers reach the engine ─────────────────────────────────────────

describe('jt5-5 joust — every cue passes its ROM priority to the engine (AC3)', () => {
  it('declares a priority for all eighteen cues', async () => {
    const m = await captureManifest()
    const missing = NAMES.filter((n) => m.priorities?.[n] === undefined)
    expect(missing, `cues with no priority passed to the engine: ${missing.join(', ')}`).toEqual([])
  })

  it('passes the priority CUE_SOURCES already records — one idea, one spelling', async () => {
    const m = await captureManifest()
    for (const name of NAMES) {
      const src = CUE_SOURCES[name]
      if (src.kind !== 'rom') continue
      expect(
        m.priorities?.[name],
        `${name}: the engine's priority must be the one CUE_SOURCES cites, not a second transcription`,
      ).toBe(src.priority)
      expect(src.priority, `${name}: fixture guard against ROM drifting from this suite`).toBe(
        ROM[name].priority,
      )
    }
  })

  it('passes no priority >= 128 — the ROM`s always-sent branch is unreachable here (AC6)', async () => {
    const m = await captureManifest()
    const declared = NAMES.map((n) => m.priorities?.[n]).filter((p): p is number => p !== undefined)
    // Without this the test passes over an EMPTY map — "no priority is >= 128"
    // is trivially true of no priorities at all, and it would go green against
    // an engine that never learned to arbitrate.
    expect(declared, 'nothing is proven about a manifest that declares no priorities').toHaveLength(
      NAMES.length,
    )
    const high = NAMES.filter((n) => (m.priorities?.[n] ?? 0) >= 128)
    expect(
      high,
      'SYSTEM.SRC:762 bypasses the game-over mute for 128-255; joust`s highest cue is 100, ' +
        `so that branch must stay unbuilt. Offenders: ${high.join(', ')}`,
    ).toEqual([])
    expect(Math.max(...declared), 'joust`s ceiling is extraMan/SNREPL at 100').toBe(100)
  })
})

describe('jt5-5 joust — every cue passes its FULL-TABLE frame window (AC3)', () => {
  it('declares a frame duration for all eighteen cues', async () => {
    const m = await captureManifest()
    const missing = NAMES.filter((n) => m.frameDurations?.[n] === undefined)
    expect(missing, `cues with no frame window: ${missing.join(', ')}`).toEqual([])
  })

  it('matches the ROM table summed across every (code, duration) pair', async () => {
    const m = await captureManifest()
    for (const name of NAMES) {
      expect(
        m.frameDurations?.[name],
        `${name}: window must be the whole table at JOUSTRV4.SRC:${ROM[name].lines}`,
      ).toBe(ROM[name].frames)
    }
  })

  it('does NOT truncate the two multi-line tables to their cited row', async () => {
    const m = await captureManifest()
    // Both cited rows parse to 30 frames on their own. Reading only `verbatim`
    // yields 30 for each; the tables are 450 and 134. This is the whole trap.
    expect(
      m.frameDurations?.playerMaterialise,
      'SNPCR1 runs :8116-8118 (30+255+165) — its cited row is only the first pair',
    ).not.toBe(30)
    expect(m.frameDurations?.playerMaterialise, 'SNPCR1 is 450 frames').toBe(450)
    expect(
      m.frameDurations?.pteroDeath,
      'SNPTED runs :8091-8093 (15+15+7+7+90) — its cited row is only the first two pairs',
    ).not.toBe(30)
    expect(m.frameDurations?.pteroDeath, 'SNPTED is 134 frames').toBe(134)
  })
})

// ── AC3: the concrete pin the story names ─────────────────────────────────────

describe('jt5-5 joust — the headline case: a death refuses a death (AC3)', () => {
  it('refuses the priority-40 enemyDeath throughout the priority-80 playerDeath window', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('playerDeath') // priority 80, 20-frame window
    for (let i = 0; i < 19; i++) {
      e.tick()
      e.play('enemyDeath')
    }
    expect(
      e.sounded,
      'across all 19 frames the window is open, so only the player death ever sounded',
    ).toEqual(['playerDeath'])
  })

  it('accepts that same enemyDeath on the frame the window closes', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('playerDeath')
    for (let i = 0; i < 20; i++) e.tick() // the 20th tick empties STMR
    e.play('enemyDeath')
    expect(e.sounded, 'with nothing sounding, no comparison happens (SYSTEM.SRC:766)').toEqual([
      'playerDeath',
      'enemyDeath',
    ])
  })

  it('lets the priority-80 playerDeath interrupt a sounding priority-40 enemyDeath', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('enemyDeath')
    e.play('playerDeath')
    expect(e.sounded, 'higher priority cuts in immediately').toEqual(['enemyDeath', 'playerDeath'])
  })
})

// ── AC5: JT53-004's clause becomes true of THIS PORT ──────────────────────────

describe('jt5-5 joust — the buzzard`s wingbeat really cannot steal the knight`s (AC5)', () => {
  it('refuses enemyWingDown (006) while playerWingDown (010) is sounding', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('playerWingDown') // priority 10, 90-frame window
    e.play('enemyWingDown') // priority 6 — the exact clause JT53-004 asserts
    expect(
      e.sounded,
      'this is the claim`s own sentence, executed: 006 is below 010, so it is refused',
    ).toEqual(['playerWingDown'])
  })

  it('refuses enemyWingUp (006) while playerWingUp (010) is sounding', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('playerWingUp')
    e.play('enemyWingUp')
    expect(e.sounded, 'the claim covers the pair, so both edges are pinned').toEqual([
      'playerWingUp',
    ])
  })

  it('still lets the knight`s wingbeat interrupt the buzzard`s — the clause is one-way', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('enemyWingDown') // 006 first
    e.play('playerWingDown') // 010 is higher, so it steals
    expect(
      e.sounded,
      'JT53-004 claims the buzzard never steals the knight, NOT that they never interrupt',
    ).toEqual(['enemyWingDown', 'playerWingDown'])
  })

  it('refuses a priority-006 wingbeat under a priority-080 player death', async () => {
    const m = await captureManifest()
    const e = recordingEngine(m)
    e.play('playerDeath')
    e.play('enemyWingDown')
    expect(e.sounded).toEqual(['playerDeath'])
  })
})

// ── AC3: the clock runs at the machine's cadence, in the machine's order ──────

describe('jt5-5 joust — playEventSounds carries the frame clock (AC3)', () => {
  it('advances the clock exactly once per call, however many events that frame holds', () => {
    let ticks = 0
    const audio = { play() {}, tick: () => void ticks++ }
    playEventSounds(audio as never, [])
    expect(ticks, 'an empty frame still advances STMR — EXECST runs every frame').toBe(1)
    ticks = 0
    playEventSounds(audio as never, [
      { type: 'enemy-death' },
      { type: 'player-death' },
      { type: 'egg-collected' },
    ] as never)
    expect(ticks, 'three moments in one frame are still ONE frame').toBe(1)
  })

  it('ticks BEFORE playing the frame`s cues, as EXECST runs before game logic', () => {
    const order: string[] = []
    const audio = {
      play: (n: string) => void order.push(`play:${n}`),
      tick: () => void order.push('tick'),
    }
    playEventSounds(audio as never, [{ type: 'enemy-death' }] as never)
    expect(
      order,
      'EXECST decrements STMR at the top of the frame (SYSTEM.SRC:173-187); only then ' +
        'does game logic reach SND. Ticking after would give every cue one frame too much window.',
    ).toEqual(['tick', 'play:enemyDeath'])
  })
})
