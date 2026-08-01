// tests/audio-priority.test.ts
//
// Story jt5-5 (epic jt5) — RED phase (Mr. Praline / TEA). The shared SFX engine
// learns the ONE thing joust's machine does that no Atari cabinet in this arcade
// does: it REFUSES a sound.
//
// ─── WHAT THE MACHINE ACTUALLY DOES ──────────────────────────────────────────
// Joust has ONE sound voice, arbitrated by a priority byte. `SND`
// (`reference/williams-source/joust/SYSTEM.SRC:761-773`) is the whole algorithm,
// and it is four decisions, not one. Byte-exact — the misspellings are Williams's:
//
//   761: SND	LDA	,X+		GET SOUND PIRORITY
//   762: 	BMI	1$		SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT
//   763: 	LDB	GOVER		NO SOUNDS 0 TO 127 DURING END OF GAME
//   764: 	BPL	NOSND
//   765: 1$	LDB	STMR		SOUND STILL SOUNDING
//   766: 	BEQ	SN1NS		 BR=NO SOUND
//   767: 	CMPA	SPRI		OK TO INTERUPT THIS PIRORITY SOUND?
//   768: 	BLO	NOSND		 BR=NO
//   769: SN1NS	STA	SPRI		NEW PIRORITY
//   770: 	LDA	#1		ALLOW FOR NEXT SOUND
//   771: 	STA	STMR
//   772: 	STX	SNDPTR		SAVE SOUND TABLE ADDRESS
//   773: NOSND	RTS
//
// The two facts the story's own description omits, and which this suite exists
// to pin, are both at :765-766. FIRST, the comparison is CONDITIONAL: if `STMR`
// is zero, control jumps straight to the accept path and NO comparison happens
// at all — a priority-6 buzzard wingbeat follows a priority-100 extra man with no
// argument, because by then nothing is sounding. SECOND, `STMR` is a per-frame
// COUNTDOWN, not a flag. `EXECST` (`SYSTEM.SRC:173-187`) decrements it once per
// frame (`:175 DEC STMR`) and reloads it from the sound table's own duration byte
// (`:183 STB STMR`). So the window in which a sound can refuse another is measured
// in FRAMES from the ROM table — never in wall-clock, and never in the length of a
// `.wav` we happen to have baked (jt5-2 has not baked any yet).
//
// `BLO` is Branch-if-LOWER, UNSIGNED. It refuses a STRICTLY lower priority, so an
// EQUAL priority interrupts. That asymmetry is tested here explicitly because it
// is the single easiest thing to get backwards, and nothing else would catch it.
//
// ─── CONTRACT Dev implements to turn this GREEN ──────────────────────────────
//
//   interface AudioManifest<N extends string> {
//     baseUrl: string
//     masterGain?: number
//     sounds: Record<N, string>
//     channels: Record<N, string>
//     priorities?: Partial<Record<N, number>>      // NEW — SND's `SPRI` key
//     frameDurations?: Partial<Record<N, number>>  // NEW — the table's `STMR` seed
//   }
//   interface AudioEngine<N extends string> {
//     resume(): void; play(name: N): void
//     startLoop(name: N): void; stopLoop(name: N): void; ready(): boolean
//     tick(): void                                 // NEW — the ROM's `DEC STMR`
//   }
//
// Semantics, in the order `SND` takes them:
//
//   • A name with an entry in `priorities` is ARBITRATED. Arbitrated names share
//     ONE voice — the machine has one — REGARDLESS of their `channels` entries.
//     That is the whole point of the story: joust maps its thirteen priorities to
//     thirteen channels today, so a priority-40 enemy death and a priority-80
//     player death never meet and both simply play. A fence, not the mechanism.
//   • A name with NO `priorities` entry is unchanged: per-channel stealing, never
//     refused, never refusing. Six of the seven games in this cabinet pass no
//     priorities at all and must not be able to tell this story shipped.
//   • play(arbitrated):
//       – window == 0 (nothing sounding)  → ACCEPT, no comparison  (:765-766)
//       – incoming >= sounding            → ACCEPT, steal the voice (:767-768)
//       – incoming <  sounding            → REFUSE: no source, and the sounding
//                                           voice is left completely untouched
//   • On ACCEPT the voice's priority becomes the incoming one and its window is
//     set to `frameDurations[name] ?? 0`.
//   • tick() decrements the window by one, flooring at zero.
//
// ─── ONE RULE THAT IS NOT IN THE ROM, BECAUSE THE ROM CANNOT HAVE THE PROBLEM ─
// The machine's sounds are always available; ours are files that may still be
// decoding or may have 404'd. So: arbitration state may only be claimed by a
// sound that ACTUALLY STARTS. If an accepted-but-unloaded cue seized the voice it
// would hold a silent window and refuse real sounds behind it — audible silence
// caused by an inaudible sound. This suite pins that (`an accepted sound that
// cannot start claims no window`), because it is the failure mode that would ship
// green and be blamed on the samples.
//
// ─── RED audit — the NINE tests here that pass BEFORE the fix, and why ──────
// 18 of these 27 fail today. The other 9 pass, and a passing test in a RED phase
// has to justify itself or it is decoration. Six are keep-behaviour guards whose
// whole job is to still be green afterwards; three are real guards that today's
// engine happens to satisfy by having no opinion at all. None is vacuous, and the
// distinction is checkable — each of the last three names the specific wrong
// implementation it would catch:
//
//   KEEP-BEHAVIOUR (must pass before AND after — they ARE the AC1 guarantee):
//     • still exposes the five methods the other six cabinets already call
//     • a manifest with NO priorities still steals unconditionally
//     • a manifest with NO priorities never refuses, however many retriggers
//     • independent channels still do not steal one another
//     • an UNARBITRATED cue in a mixed manifest is never refused
//     • keys neither new map by a bare `string` — green today only because the
//       maps do not exist yet; it is here so the widening can never arrive.
//
//   PASSES NOW, BITES LATER (green today only because nothing arbitrates yet):
//     • `an accepted cue whose sample failed to load claims no window` — fails
//       against the tempting implementation that claims the voice at the accept
//       decision instead of at the moment a source actually starts.
//     • `duration 0 opens a window that is already closed` — fails against
//       `frameDurations?.[name] || DEFAULT`, which reads 0 as absent.
//     • `a priority with NO duration entry degrades` — fails against any
//       implementation that throws, or that substitutes a non-zero default.
//
// If a later change makes one of the last three pass for a NEW reason, that is a
// regression in the test, not a success: re-check it against the named wrong
// implementation before believing it.
//
// RED until `src/shared/audio.ts` grows `tick()` and honours the two new maps.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ── Fake WebAudio surface ─────────────────────────────────────────────────────
// Same controllable stub as audio.test.ts / audio-pending-loop.test.ts: each audio
// suite carries its own, so no test can be broken from another file.

interface Created {
  contexts: FakeCtx[]
  gains: FakeGain[]
  sources: FakeSource[]
  fetches: string[]
}

interface InstallOpts {
  startState?: 'suspended' | 'running'
  fetchFails?: Set<string>
}

class FakeGain {
  gain = { value: -1 }
  connectedTo: unknown = null
  connect(dest: unknown): void {
    this.connectedTo = dest
  }
}

class FakeSource {
  buffer: unknown = null
  loop = false
  onended: (() => void) | null = null
  connectedTo: unknown = null
  started = false
  stopped = false
  connect(dest: unknown): void {
    this.connectedTo = dest
  }
  start(): void {
    this.started = true
  }
  stop(): void {
    this.stopped = true
  }
  disconnect(): void {}
}

class FakeCtx {
  state: 'suspended' | 'running'
  destination = { __dest: true }
  resumeCalls = 0
  private created: Created
  constructor(opts: InstallOpts, created: Created) {
    this.created = created
    this.state = opts.startState ?? 'running'
    created.contexts.push(this)
  }
  createGain(): FakeGain {
    const g = new FakeGain()
    this.created.gains.push(g)
    return g
  }
  createBufferSource(): FakeSource {
    const s = new FakeSource()
    this.created.sources.push(s)
    return s
  }
  resume(): Promise<void> {
    this.resumeCalls++
    return Promise.resolve()
  }
  decodeAudioData(data: { __url?: string }): Promise<unknown> {
    return Promise.resolve({ __buffer: data && data.__url })
  }
}

let saved: { AC: unknown; WK: unknown; FETCH: unknown }

function install(opts: InstallOpts = {}): Created {
  const created: Created = { contexts: [], gains: [], sources: [], fetches: [] }
  const g = globalThis as Record<string, unknown>
  g.AudioContext = class extends FakeCtx {
    constructor() {
      super(opts, created)
    }
  }
  g.webkitAudioContext = undefined
  g.fetch = (url: string) => {
    created.fetches.push(url)
    const fails = [...(opts.fetchFails ?? [])].some((f) => url.endsWith(f))
    if (fails) return Promise.reject(new Error('network error'))
    return Promise.resolve({ arrayBuffer: () => Promise.resolve({ __url: url }) })
  }
  return created
}

/** Drain the fetch -> arrayBuffer -> decode -> store microtask chain. */
async function flush(): Promise<void> {
  for (let i = 0; i < 16; i++) await Promise.resolve()
}

const load = () => import('../audio')

/**
 * The engine surface this story needs, `tick()` included. Declared locally rather
 * than imported: `tick` does not exist on the shipped `AudioEngine` yet, so typing
 * these tests against the real interface would make the suite fail to COMPILE
 * rather than fail to PASS — and a red build is not a RED test. The one widening
 * cast below is the price of that, and it is paid back immediately by
 * `exposes tick() on the engine surface`, which checks at RUNTIME that the method
 * the cast promises actually arrives. Without that test the cast could hide a
 * missing method behind a pile of `undefined is not a function` errors.
 */
interface ArbitratingEngine {
  resume(): void
  play(name: string): void
  startLoop(name: string): void
  stopLoop(name: string): void
  ready(): boolean
  tick(): void
}

/** Build an engine on the fake context with its samples already decoded. */
async function mkLoadedEngine(manifest: unknown, opts: InstallOpts = {}) {
  const created = install(opts)
  const { createAudioEngine } = await load()
  const engine = createAudioEngine(manifest as never) as unknown as ArbitratingEngine
  engine.resume()
  await flush()
  return { engine, created }
}

/** Sources that actually began sounding — the only evidence a cue was accepted. */
const startedSources = (created: Created) => created.sources.filter((s) => s.started)

// ── Manifests ─────────────────────────────────────────────────────────────────
const BASE = 'https://sfx.example/'

// The story's headline pair, on DIFFERENT channels exactly as joust ships them
// today (`prio-40` / `prio-80`). If arbitration were implemented per-channel
// rather than across the arbitrated set, every refusal test below would pass
// vacuously — these two would simply never meet.
const DEATHS = {
  baseUrl: BASE,
  sounds: { enemyDeath: 'ed.wav', playerDeath: 'pd.wav' },
  channels: { enemyDeath: 'prio-40', playerDeath: 'prio-80' },
  priorities: { enemyDeath: 40, playerDeath: 80 },
  frameDurations: { enemyDeath: 20, playerDeath: 20 },
}

// Equal priorities, distinct names — pins the `BLO` (strictly-lower) asymmetry.
const EQUAL = {
  baseUrl: BASE,
  sounds: { a: 'a.wav', b: 'b.wav' },
  channels: { a: 'ca', b: 'cb' },
  priorities: { a: 45, b: 45 },
  frameDurations: { a: 30, b: 30 },
}

// No priorities at all: the six other cabinets. Must behave EXACTLY as before.
const LEGACY_SAME_CHANNEL = {
  baseUrl: BASE,
  sounds: { a: 'a.wav', b: 'b.wav' },
  channels: { a: 'ch', b: 'ch' },
}
const LEGACY_TWO_CHANNEL = {
  baseUrl: BASE,
  sounds: { a: 'a.wav', b: 'b.wav' },
  channels: { a: 'ca', b: 'cb' },
}

// One arbitrated cue and one plain cue side by side — the mixed manifest.
const MIXED = {
  baseUrl: BASE,
  sounds: { loud: 'loud.wav', plain: 'plain.wav' },
  channels: { loud: 'prio-80', plain: 'plain' },
  priorities: { loud: 80 },
  frameDurations: { loud: 20 },
}

// ── ZERO is a legitimate value on BOTH new maps ───────────────────────────────
// TS lang-review #4: `x || d` where x can be 0 is a BUG; `??` is required. A
// priority of 0 is the machine's lowest, not "unset", and a duration of 0 is a
// window that closes immediately, not "unset". Both are read through the same
// lookup a `||` would silently corrupt, so both are pinned.
const ZEROS = {
  baseUrl: BASE,
  sounds: { floor: 'floor.wav', instant: 'instant.wav', mid: 'mid.wav' },
  channels: { floor: 'c1', instant: 'c2', mid: 'c3' },
  priorities: { floor: 0, instant: 50, mid: 50 },
  frameDurations: { floor: 30, instant: 0, mid: 30 },
}

beforeEach(() => {
  const g = globalThis as Record<string, unknown>
  saved = { AC: g.AudioContext, WK: g.webkitAudioContext, FETCH: g.fetch }
})
afterEach(() => {
  const g = globalThis as Record<string, unknown>
  g.AudioContext = saved.AC
  g.webkitAudioContext = saved.WK
  g.fetch = saved.FETCH
})

// ── The surface itself ────────────────────────────────────────────────────────

describe('jt5-5 shared audio — the engine surface (AC1)', () => {
  it('exposes tick() on the engine surface', async () => {
    const { engine } = await mkLoadedEngine(DEATHS)
    expect(
      typeof (engine as unknown as Record<string, unknown>).tick,
      'tick() is the ROM`s `DEC STMR` (SYSTEM.SRC:175) and must be a real method, ' +
        'not a type-level promise the widening cast in this file merely asserts',
    ).toBe('function')
  })

  it('still exposes the five methods the other six cabinets already call', async () => {
    const { engine } = await mkLoadedEngine(LEGACY_TWO_CHANNEL)
    const surface = engine as unknown as Record<string, unknown>
    for (const method of ['resume', 'play', 'startLoop', 'stopLoop', 'ready']) {
      expect(typeof surface[method], `${method}() must survive this story`).toBe('function')
    }
  })
})

// ── AC1: additive and backward-compatible ─────────────────────────────────────

describe('jt5-5 shared audio — the six priority-free cabinets cannot tell this shipped (AC1)', () => {
  it('a manifest with NO priorities still steals unconditionally on a shared channel', async () => {
    const { engine, created } = await mkLoadedEngine(LEGACY_SAME_CHANNEL)
    engine.play('a')
    engine.play('b')
    expect(created.sources, 'both cues built a source — neither was refused').toHaveLength(2)
    expect(created.sources[0].stopped, 'b steals the channel from a, exactly as before').toBe(true)
    expect(created.sources[1].started).toBe(true)
  })

  it('a manifest with NO priorities never refuses, however many times it retriggers', async () => {
    const { engine, created } = await mkLoadedEngine(LEGACY_SAME_CHANNEL)
    for (let i = 0; i < 5; i++) {
      engine.play('a')
      engine.play('b')
    }
    expect(
      startedSources(created),
      'ten triggers, ten sounds — an unarbitrated manifest refuses nothing',
    ).toHaveLength(10)
  })

  it('independent channels still do not steal one another when no priorities are given', async () => {
    const { engine, created } = await mkLoadedEngine(LEGACY_TWO_CHANNEL)
    engine.play('a')
    engine.play('b')
    expect(created.sources[0].stopped, 'a on ca is untouched by b on cb').toBe(false)
    expect(startedSources(created)).toHaveLength(2)
  })

  it('tick() is a harmless no-op for a manifest that declares no priorities', async () => {
    const { engine, created } = await mkLoadedEngine(LEGACY_SAME_CHANNEL)
    expect(() => {
      for (let i = 0; i < 100; i++) engine.tick()
    }, 'a cabinet with no arbitration must never be affected by the clock').not.toThrow()
    engine.play('a')
    expect(startedSources(created), 'and still plays normally afterwards').toHaveLength(1)
  })

  it('tick() before resume() is a silent no-op (no context, no throw)', async () => {
    install()
    const { createAudioEngine } = await load()
    const engine = createAudioEngine(DEATHS as never) as unknown as ArbitratingEngine
    expect(() => engine.tick(), 'the clock must not build a context on its own').not.toThrow()
  })

  it('an UNARBITRATED cue in a mixed manifest is never refused by a sounding arbitrated one', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud') // priority 80, 20-frame window opens
    engine.play('plain') // carries no priority — not in the argument at all
    expect(
      startedSources(created),
      'a cue with no priority entry sits outside arbitration entirely',
    ).toHaveLength(2)
  })
})

// ── AC2: the comparison itself (SYSTEM.SRC:767-768) ───────────────────────────

describe('jt5-5 shared audio — higher-or-equal interrupts, strictly-lower is REFUSED (AC2)', () => {
  it('REFUSES a lower priority while a higher one is sounding — the story headline', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath') // priority 80
    const sounding = created.sources[0]
    engine.play('enemyDeath') // priority 40 — BLO taken, NOSND
    expect(
      startedSources(created),
      'the priority-40 enemy death must not sound over the priority-80 player death',
    ).toHaveLength(1)
    expect(sounding.stopped, 'and the refused cue must not disturb the sounding voice').toBe(false)
  })

  it('ACCEPTS a higher priority over a sounding lower one, stealing the voice', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('enemyDeath') // priority 40
    const first = created.sources[0]
    engine.play('playerDeath') // priority 80 — CMPA/BLO falls through
    expect(startedSources(created), 'the higher priority cuts in').toHaveLength(2)
    expect(first.stopped, 'the lower-priority voice is stopped, not left ringing under it').toBe(
      true,
    )
  })

  it('ACCEPTS an EQUAL priority — `BLO` refuses strictly-lower only (:768)', async () => {
    const { engine, created } = await mkLoadedEngine(EQUAL)
    engine.play('a') // priority 45
    engine.play('b') // priority 45 — equal, so NOT lower, so it interrupts
    expect(
      startedSources(created),
      'an equal priority interrupts: BLO is branch-if-LOWER, not branch-if-not-higher',
    ).toHaveLength(2)
    expect(created.sources[0].stopped, 'the equal-priority cue steals the voice').toBe(true)
  })

  it('arbitrates ACROSS channels — the two deaths sit on prio-40 and prio-80 and still meet', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    expect(
      DEATHS.channels.enemyDeath,
      'fixture guard: these must be DIFFERENT channels or the test proves nothing',
    ).not.toBe(DEATHS.channels.playerDeath)
    engine.play('playerDeath')
    engine.play('enemyDeath')
    expect(
      startedSources(created),
      'the machine has ONE voice — a separate channel must not buy a second one',
    ).toHaveLength(1)
  })

  it('refuses REPEATEDLY while the window holds, not merely on the first attempt', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath')
    for (let i = 0; i < 5; i++) engine.play('enemyDeath')
    expect(startedSources(created), 'five refusals, still one voice').toHaveLength(1)
  })
})

// ── AC2: the window gate (SYSTEM.SRC:765-766 + EXECST:173-187) ────────────────

describe('jt5-5 shared audio — the STMR window decides WHETHER to compare at all (AC2)', () => {
  it('accepts ANY priority when nothing is sounding — no comparison happens (:766 BEQ)', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath') // priority 80, 20-frame window
    for (let i = 0; i < 20; i++) engine.tick() // window closes
    engine.play('enemyDeath') // priority 40 — would have been refused a frame ago
    expect(
      startedSources(created),
      'once STMR hits 0 the priority comparison is skipped entirely',
    ).toHaveLength(2)
  })

  it('holds the refusal for the FULL declared window and releases on the very next frame', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath') // window = 20
    for (let i = 0; i < 19; i++) engine.tick()
    engine.play('enemyDeath')
    expect(
      startedSources(created),
      'after 19 of 20 frames the window is still open — still refused',
    ).toHaveLength(1)
    engine.tick() // the 20th frame closes it
    engine.play('enemyDeath')
    expect(startedSources(created), 'on the 20th tick the voice frees and the cue lands').toHaveLength(
      2,
    )
  })

  it('an ACCEPTED cue re-arms the window with ITS OWN duration, not the one it displaced', async () => {
    const MIX = {
      ...DEATHS,
      frameDurations: { enemyDeath: 20, playerDeath: 5 },
    }
    const { engine, created } = await mkLoadedEngine(MIX)
    engine.play('enemyDeath') // 40, window 20
    engine.play('playerDeath') // 80 steals, window must become 5 — not 20, not 15
    for (let i = 0; i < 5; i++) engine.tick()
    engine.play('enemyDeath')
    expect(
      startedSources(created),
      'the stealing cue installs its own 5-frame window, so frame 5 frees the voice',
    ).toHaveLength(3)
  })

  it('the window does not go negative — extra ticks on an idle voice change nothing', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath')
    for (let i = 0; i < 500; i++) engine.tick()
    engine.play('enemyDeath') // low priority, but nothing is sounding
    expect(startedSources(created), 'an over-ticked idle voice still accepts normally').toHaveLength(
      2,
    )
    // And a fresh high-priority cue must still be able to refuse afterwards.
    engine.play('playerDeath')
    engine.play('enemyDeath')
    expect(
      startedSources(created),
      'arbitration still works after the counter was driven far past zero',
    ).toHaveLength(3)
  })

  it('a REFUSED cue does not touch the sounding voice window', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath') // window 20
    for (let i = 0; i < 10; i++) engine.tick() // 10 left
    engine.play('enemyDeath') // refused — must not reset or shorten the window
    for (let i = 0; i < 9; i++) engine.tick() // 1 left
    engine.play('enemyDeath')
    expect(
      startedSources(created),
      'a refusal must not have re-armed the window (that would extend it forever)',
    ).toHaveLength(1)
    engine.tick()
    engine.play('enemyDeath')
    expect(startedSources(created), 'the original 20-frame window expires on schedule').toHaveLength(
      2,
    )
  })
})

// ── The rule the ROM cannot have: a silent cue must not hold the voice ────────

describe('jt5-5 shared audio — arbitration state is claimed only by a sound that STARTS', () => {
  it('an accepted cue whose sample failed to load claims no window', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS, { fetchFails: new Set(['pd.wav']) })
    engine.play('playerDeath') // priority 80, but its file 404'd — nothing sounds
    expect(created.sources, 'a failed sample produces no source at all').toHaveLength(0)
    engine.play('enemyDeath') // priority 40 — must NOT be refused by a silent voice
    expect(
      startedSources(created),
      'a cue that never sounded must not hold a 20-frame window against real audio',
    ).toHaveLength(1)
  })

  it('a REFUSED cue is not merely muted — it creates no source node at all', async () => {
    const { engine, created } = await mkLoadedEngine(DEATHS)
    engine.play('playerDeath')
    const before = created.sources.length
    engine.play('enemyDeath')
    expect(
      created.sources.length,
      'refusing must happen before the node is built, not by starting and stopping one',
    ).toBe(before)
  })
})

// ── AC2 / TS lang-review #4: zero is a value, not an absence ──────────────────

describe('jt5-5 shared audio — 0 is a legitimate priority and a legitimate duration (TS #4)', () => {
  it('priority 0 is arbitrated as the LOWEST priority, not treated as "no priority"', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROS)
    engine.play('mid') // priority 50, 30-frame window
    engine.play('floor') // priority 0 — strictly lower, must be REFUSED
    expect(
      startedSources(created),
      'a `||` on the priority lookup would read 0 as unset and let this through',
    ).toHaveLength(1)
  })

  it('duration 0 opens a window that is already closed — it refuses nothing', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROS)
    engine.play('instant') // priority 50, duration 0
    engine.play('floor') // priority 0 — lower, but nothing is still sounding
    expect(
      startedSources(created),
      'a `||` on the duration lookup would substitute a default and wrongly refuse',
    ).toHaveLength(2)
  })

  it('a priority with NO duration entry degrades to a zero-length window, never a throw', async () => {
    const NO_DUR = {
      baseUrl: BASE,
      sounds: { a: 'a.wav', b: 'b.wav' },
      channels: { a: 'ca', b: 'cb' },
      priorities: { a: 90, b: 10 },
      // frameDurations omitted entirely
    }
    const { engine, created } = await mkLoadedEngine(NO_DUR)
    expect(() => {
      engine.play('a')
      engine.play('b')
    }, 'a missing duration must degrade, never throw — this engine never throws').not.toThrow()
    expect(
      startedSources(created),
      'with no declared window nothing can be refused, so both sound',
    ).toHaveLength(2)
  })
})

// ── TS lang-review #2 — the new maps must not widen the manifest ─────────────
// `sounds` and `channels` are `Record<N, string>`, and audio-source-rules.test.ts
// guards them against collapsing to `Record<string, string>` because the whole
// point of the generic is that a typo in a cue name is a compile error. The two
// new maps are the same idea with a number payload, and they are EASIER to widen:
// they are optional, so `Record<string, number>` typechecks at every call site
// and nothing complains until a misspelled cue silently never arbitrates.
describe('jt5-5 shared audio source — the new maps stay keyed by the generic N (TS #2)', () => {
  const src = () => readFileSync(fileURLToPath(new URL('../audio.ts', import.meta.url)), 'utf8')

  it('declares an optional `priorities` map on the manifest', () => {
    expect(src(), 'AudioManifest must accept an optional priorities map').toMatch(
      /priorities\?\s*:/,
    )
  })

  it('declares an optional `frameDurations` map on the manifest', () => {
    expect(src(), 'AudioManifest must accept an optional frameDurations map').toMatch(
      /frameDurations\?\s*:/,
    )
  })

  it('keys neither new map by a bare `string` — a misspelt cue must not typecheck', () => {
    expect(
      src(),
      'Record<string, number> would accept any key at all, so a typo in a cue name would ' +
        'compile and simply never arbitrate. Key both by the generic N.',
    ).not.toMatch(/Record\s*<\s*string\s*,\s*number\s*>/)
  })
})

// ── Loops: stopping the voice frees it ────────────────────────────────────────

describe('jt5-5 shared audio — stopLoop releases the arbitrated voice', () => {
  it('stopping an arbitrated loop frees the window immediately', async () => {
    const LOOPS = {
      baseUrl: BASE,
      sounds: { hum: 'hum.wav', beep: 'beep.wav' },
      channels: { hum: 'c1', beep: 'c2' },
      priorities: { hum: 80, beep: 10 },
      frameDurations: { hum: 600, beep: 5 },
    }
    const { engine, created } = await mkLoadedEngine(LOOPS)
    engine.startLoop('hum') // priority 80, a very long window
    engine.play('beep')
    expect(startedSources(created), 'the low-priority beep is refused under the hum').toHaveLength(1)
    engine.stopLoop('hum') // nothing is sounding any more
    engine.play('beep')
    expect(
      startedSources(created),
      'a stopped voice must release its window without waiting out 600 frames',
    ).toHaveLength(2)
  })
})
