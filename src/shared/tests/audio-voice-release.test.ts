// tests/audio-voice-release.test.ts
//
// Story jt9-6 (epic jt9) — RED phase (O'Brien / TEA). `stopChannel` silences the
// arbitrated voice's SOURCE without releasing the voice's WINDOW.
//
// ─── THE DEFECT ──────────────────────────────────────────────────────────────
// jt5-5 gave the engine one arbitrated voice: `voicePriority` / `voiceFrames` /
// `voiceChannel`, claimed at `src/shared/audio.ts:273-277` by a cue that actually
// starts, and read at `:232` to REFUSE a strictly-lower-priority cue while the
// window holds. `stopChannel` (`:206-216`) stops whatever is sounding on a channel
// and touches none of those three. `stopLoop` compensates one level up (`:300`,
// `if (voiceChannel === channel) releaseVoice()`); the steal inside `startSource`
// (`:250`) does not. So a cue with NO priority entry, landing on the channel the
// arbitrated voice happens to be sounding on, stops the voice's source and leaves
// its window holding — and every lower-priority arbitrated cue behind it is refused
// by a voice nobody can hear.
//
// ─── IT IS REACHABLE TODAY. The filed story says otherwise; the story is stale ──
// The description closes with "NOT REACHABLE TODAY ... a trap for the next cabinet
// that does [pass `priorities`]". That was true when it was filed and is false now:
// `cp6-3` (commit `77ef628`) made centipede the SECOND cabinet passing
// `priorities`/`frameDurations`, and it ships two channels holding BOTH an
// arbitrated and an unarbitrated cue (`plugins/centipede/src/shell/audio.ts`,
// `CHANNELS` + `PRIORITIES`):
//
//   channel `alert`  — arbitrated playerDeath (rank 1, 76 frames)
//                      unarbitrated headBottom, waveClear
//   channel `impact` — arbitrated segmentKill/spiderKill/fleaKill/scorpionKill
//                      (rank 0, 19 frames) — unarbitrated mushroom
//
// Both shapes are reproduced below on a synthetic manifest, because this is the
// SHARED engine's suite and it must not depend on one game's numbers: `MIXED` is
// the `alert` shape and `IMPACT` is the `impact` shape, each with the ranks that
// make the two behave differently.
//
// ─── THE `impact` SHAPE IS NOT BENIGN, AND THAT NEEDED MEASURING ─────────────
// The obvious reading is that a stale rank-0 window is harmless: refusal is
// STRICTLY-lower and nothing ranks below 0, so no cue is ever refused by it. That
// is true, and it is not the whole story. The stale voice also leaves `voiceChannel`
// pointing at a channel the voice no longer owns, and `:253-255` uses `voiceChannel`
// to STOP a source on another channel when an arbitrated cue is accepted. So the
// next accepted arbitrated cue reaches across and stops whatever unarbitrated sound
// has since taken that channel over — a second, independent observable, pinned by
// `a released voice no longer reaches across to a channel it lost`. The refusal
// axis and the cross-channel-steal axis fail separately: the mutation battery
// includes a fix that clears the counters but not `voiceChannel`, and it passes
// every refusal test here while reddening that one.
//
// ─── THE PLACEMENT FORK, SETTLED: the release goes BELOW the early return ────
// `stopChannel` opens with `const prev = live.get(channel); if (!prev) return`.
// `releaseVoice()` above that guard and below it are NOT equivalent, and only one
// is right:
//
//   • An arbitrated window deliberately OUTLIVES its own sample. jt5-5's whole
//     design note is that the window is measured in FRAMES FROM THE ROM TABLE,
//     "never in wall-clock, and never in the length of a `.wav` we happen to have
//     baked" (`audio-priority.test.ts:33-35`). When the sample ends on its own,
//     `onended` (`:264-266`) deletes the channel's `live` entry while `voiceFrames`
//     keeps counting. That state — window held, `live` empty — is normal, not an
//     error.
//   • ABOVE the guard, an unarbitrated cue arriving in that state cuts the window
//     short having STOPPED NOTHING. That is a new defect pointing the other way:
//     silence that should still be refusing gets overwritten because an unrelated
//     cue touched the same channel bucket.
//   • BELOW the guard, the voice is released exactly when something audible was
//     actually taken away — which is what the engine's own comment at `:298-299`
//     already asserts for `stopLoop` ("the window describes how long a sound RINGS,
//     so it cannot outlive one that has been stopped").
//
// `an arbitrated window survives an unarbitrated cue that stopped nothing` is the
// discriminator. It passes today, passes with the release below the guard, and
// FAILS with it above — a battery built only from the story's own scenario cannot
// tell the two placements apart, so this test is the reason the fork is decidable.
//
// ─── `stopLoop`'s `:300` IS NOT REDUNDANT — do not delete it ─────────────────
// Moving the release into `stopChannel` looks like it subsumes `:300`. It does not,
// for the same reason the fork above exists: when the arbitrated sample has already
// ended, `stopChannel` finds nothing and (correctly) releases nothing, while
// `stopLoop`'s explicit "silence this channel" command releases unconditionally and
// has since jt5-5. Those are different operations and the asymmetry is deliberate —
// `stopLoop` is the game SAYING stop, `play` is the game saying start something
// else. `stopLoop still frees a window whose sample already ended` pins the shipped
// behaviour so the redundancy claim is testable rather than assumed.
//
// ─── RED audit — 4 of these 11 fail today; the other 7 justify themselves ────
// FAIL TODAY (the defect, on all four of its routes):
//   • an unarbitrated cue that silences the arbitrated voice releases its window
//   • the same steal through startLoop() releases it too
//   • a released voice no longer reaches across to a channel it lost
//   • an arbitrated cue whose source fails to build releases the voice it silenced
//
// PASS TODAY, and each names the wrong fix it would catch (mutant ids are the ones
// recorded in this story's session file):
//   • an unarbitrated cue on ANOTHER channel does not release the voice — kills M4,
//     "release on every unarbitrated trigger", which passes the headline test.
//   • an arbitrated window survives an unarbitrated cue that stopped nothing —
//     kills M2 (release ABOVE the early return) and M5 (release at the `:250` call
//     site, which is above-the-guard by another spelling).
//   • an arbitrated cue re-taking its own channel still holds the voice — kills a
//     fix that releases and then fails to re-claim.
//   • an arbitrated cue still steals a sounding unarbitrated one (both the
//     same-channel and the `:253-255` cross-channel form) — the story's explicit
//     "check the reverse too", and the POSITIVE CONTROL for the cross-channel steal
//     that `a released voice no longer reaches across...` asserts the absence of.
//   • stopLoop still frees a window whose sample already ended — kills M3, deleting
//     `:300` as redundant.
//   • a manifest with no priorities cannot tell this story shipped — the six
//     cabinets that pass no `priorities` at all.
//
// RED until `src/shared/audio.ts` releases the arbitrated voice inside
// `stopChannel`, BELOW its early return.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── Fake WebAudio surface ─────────────────────────────────────────────────────
// Each audio suite in this directory carries its own stub so no test can be broken
// from another file. This one adds ONE capability the others do not have:
// `sourceThrowsOnCall`, which makes the Nth `createBufferSource()` throw. That is
// how the `:256` try-block's failure path — the third `stopChannel` caller's
// consequence — is reached without a real browser.

interface Created {
  contexts: FakeCtx[]
  gains: FakeGain[]
  sources: FakeSource[]
  fetches: string[]
}

interface InstallOpts {
  startState?: 'suspended' | 'running'
  fetchFails?: Set<string>
  /** 1-indexed: the Nth createBufferSource() call throws instead of returning. */
  sourceThrowsOnCall?: number
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
  private opts: InstallOpts
  private sourceCalls = 0
  constructor(opts: InstallOpts, created: Created) {
    this.created = created
    this.opts = opts
    this.state = opts.startState ?? 'running'
    created.contexts.push(this)
  }
  createGain(): FakeGain {
    const g = new FakeGain()
    this.created.gains.push(g)
    return g
  }
  createBufferSource(): FakeSource {
    this.sourceCalls += 1
    // Throw BEFORE the node is recorded, so `created.sources` counts only the
    // nodes the engine really got — a failed build must leave no trace.
    if (this.opts.sourceThrowsOnCall === this.sourceCalls) {
      throw new Error('createBufferSource failed')
    }
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

/** Same local surface audio-priority.test.ts declares, for the same reason. */
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

// The filed repro, generalised: `loud` is the arbitrated voice, `plain` is the
// unarbitrated cue SHARING ITS CHANNEL (the centipede `alert` shape), `quiet` is
// the lower-priority arbitrated cue that gets refused by the corpse, and `noise`
// is an unarbitrated cue on a channel the voice does NOT own — the control that
// stops an over-broad fix passing.
const MIXED = {
  baseUrl: BASE,
  sounds: {
    loud: 'loud.wav',
    loud2: 'loud2.wav',
    plain: 'plain.wav',
    quiet: 'quiet.wav',
    noise: 'noise.wav',
  },
  channels: { loud: 'v', loud2: 'v', plain: 'v', quiet: 'w', noise: 'x' },
  priorities: { loud: 80, loud2: 80, quiet: 10 },
  frameDurations: { loud: 76, loud2: 76, quiet: 20 },
}

// Centipede's `impact` shape: FOUR equal-rank arbitrated kills and one
// unarbitrated cue on one channel, plus a higher-ranked cue on another. Nothing
// ranks below `kill`, so the stale window refuses nothing — which is exactly why
// the damage here has to be looked for on the other axis.
const IMPACT = {
  baseUrl: BASE,
  sounds: { kill: 'kill.wav', kill2: 'kill2.wav', mush: 'mush.wav', death: 'death.wav' },
  channels: { kill: 'impact', kill2: 'impact', mush: 'impact', death: 'alert' },
  priorities: { kill: 0, kill2: 0, death: 1 },
  frameDurations: { kill: 19, kill2: 19, death: 76 },
}

// The `:256` try-block failure path: `hi2` is accepted, stops `hi` on the OTHER
// channel via `:253-255`, and then fails to build its own source.
const THROWER = {
  baseUrl: BASE,
  sounds: { hi: 'hi.wav', hi2: 'hi2.wav', lo: 'lo.wav' },
  channels: { hi: 'a', hi2: 'b', lo: 'c' },
  priorities: { hi: 50, hi2: 50, lo: 10 },
  frameDurations: { hi: 30, hi2: 30, lo: 30 },
}

// An arbitrated ONE-SHOT and an unarbitrated LOOP sharing a channel: the state in
// which `stopChannel` has nothing to stop but `stopLoop` still means "silence".
const LOOPY = {
  baseUrl: BASE,
  sounds: { bang: 'bang.wav', hum: 'hum.wav', quiet: 'quiet.wav' },
  channels: { bang: 'c1', hum: 'c1', quiet: 'c2' },
  priorities: { bang: 80, quiet: 10 },
  frameDurations: { bang: 600, quiet: 20 },
}

// The six cabinets that pass no `priorities` at all.
const LEGACY = {
  baseUrl: BASE,
  sounds: { a: 'a.wav', b: 'b.wav' },
  channels: { a: 'ch', b: 'ch' },
}

// ── jt9-35 manifests ──────────────────────────────────────────────────────────
// jt9-6's release inside `stopChannel` is guarded `if (voiceChannel === channel)`,
// but nothing in the jt9-6 suite pins that GUARD CONDITION. The `an unarbitrated
// cue on ANOTHER channel does not release the voice` test uses `noise` — the ONLY
// cue on channel `x` — so `stopChannel(x)` always hits `if (!prev) return` and the
// release line at `:222` is NEVER reached. A bare unconditional `releaseVoice()`
// there is therefore invisible to that test. FOREIGN puts TWO unarbitrated cues on
// a foreign channel (`x`) the voice does not own, so the SECOND one's `stopChannel`
// reaches past the early return and executes the release line while the arbitrated
// window on `v` is still legitimately holding.
const FOREIGN = {
  baseUrl: BASE,
  sounds: { loud: 'loud.wav', n1: 'n1.wav', n2: 'n2.wav', quiet: 'quiet.wav' },
  channels: { loud: 'v', n1: 'x', n2: 'x', quiet: 'w' },
  priorities: { loud: 80, quiet: 10 },
  frameDurations: { loud: 76, quiet: 20 },
}

// The ZERO-LENGTH WINDOW: `zap` has a priority but NO `frameDurations` entry, so it
// claims the voice with `voiceChannel = 'v'` but `voiceFrames = 0`
// (`frameDurations?.['zap'] ?? 0`). `tick()` can never clear that state — it only
// acts while `voiceFrames > 0` — so ONLY `stopChannel` / `stopLoop` can release it.
// A `&& voiceFrames > 0` restrictor on any of the three release/steal sites leaves
// `voiceChannel` pointing at a channel the voice no longer owns; the next accepted
// arbitrated cue then reaches across (`:266`) and stops whatever took that channel.
const ZEROWIN = {
  baseUrl: BASE,
  sounds: { zap: 'zap.wav', plain: 'plain.wav', boom: 'boom.wav' },
  channels: { zap: 'v', plain: 'v', boom: 'w' },
  priorities: { zap: 5, boom: 9 },
  frameDurations: { boom: 30 }, // zap has NONE -> voiceFrames 0 with voiceChannel set
}

// Same zero-length window, but reached through `stopLoop`'s OWN release (`:313`)
// rather than the `stopChannel` release. `zap`'s sample ends on its own (onended
// clears `live`) so a later `stopLoop` on that channel finds nothing to stop — the
// `:222` release never runs, and only `stopLoop`'s `:313` line can free the window.
const ZEROLOOP = {
  baseUrl: BASE,
  sounds: { zap: 'zap.wav', hum: 'hum.wav', plain: 'plain.wav', boom: 'boom.wav' },
  channels: { zap: 'v', hum: 'v', plain: 'v', boom: 'w' },
  priorities: { zap: 5, boom: 9 },
  frameDurations: { boom: 30 }, // zap has NONE -> voiceFrames 0
}

// ── jt9-35 rework (Reviewer B1/B2) manifests ─────────────────────────────────
// B2 needs FOREIGN's reach-the-:222-line shape AND ZEROWIN's zero-length window
// in ONE manifest: `zap` claims the voice with `voiceFrames = 0` on `v`, while
// `n1`/`n2` on foreign channel `x` make the SECOND cue's stopChannel(x) execute
// the :222 line with `voiceChannel !== channel` — the exact state in which a
// `|| voiceFrames === 0` widening of the guard wrongly releases a voice that is
// still sounding on a channel nobody touched.
const ZEROFOREIGN = {
  baseUrl: BASE,
  sounds: { zap: 'zap.wav', n1: 'n1.wav', n2: 'n2.wav', boom: 'boom.wav' },
  channels: { zap: 'v', n1: 'x', n2: 'x', boom: 'w' },
  priorities: { zap: 5, boom: 9 },
  frameDurations: { boom: 30 }, // zap has NONE -> voiceFrames 0 with voiceChannel `v`
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

// ── The defect itself ─────────────────────────────────────────────────────────

describe('jt9-6 shared audio — silencing the arbitrated voice releases its window', () => {
  it('an unarbitrated cue that silences the arbitrated voice releases its window', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud') // priority 80, a 76-frame window opens on channel `v`
    const voice = created.sources[0]
    engine.play('plain') // NO priority entry — outside arbitration, but same channel
    expect(
      voice.stopped,
      'premise of this test: the unarbitrated cue really does silence the voice — if ' +
        'this is false the rest proves nothing',
    ).toBe(true)
    engine.play('quiet') // priority 10 — lower, but nothing is sounding any more
    expect(
      startedSources(created),
      'the voice was silenced, so its window must be gone: a cue nobody can hear must ' +
        'not go on refusing cues that could be heard',
    ).toHaveLength(3)
  })

  it('the same steal through startLoop() releases it too', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud')
    const voice = created.sources[0]
    engine.startLoop('plain') // the OTHER route into startSource -> stopChannel
    expect(voice.stopped, 'a sustained unarbitrated cue steals the channel the same way').toBe(true)
    engine.play('quiet')
    expect(
      startedSources(created),
      'the fix belongs where both routes pass — inside stopChannel, not inside play()',
    ).toHaveLength(3)
  })

  it('a released voice no longer reaches across to a channel it lost', async () => {
    const { engine, created } = await mkLoadedEngine(IMPACT)
    engine.play('kill') // rank 0, 19-frame window, channel `impact`
    const killSrc = created.sources[0]
    engine.play('mush') // unarbitrated, same channel — silences the kill
    const mushSrc = created.sources[1]
    expect(killSrc.stopped, 'premise: the unarbitrated cue silences the arbitrated one').toBe(true)
    expect(mushSrc.started, 'premise: and the unarbitrated cue is itself sounding').toBe(true)
    engine.play('death') // rank 1 >= 0, so accepted on EITHER side of this fix
    expect(
      startedSources(created),
      'control: the accepted higher-ranked cue really did start, so the assertion below ' +
        'is about what it did NOT do, not about a cue that never ran',
    ).toHaveLength(3)
    expect(
      mushSrc.stopped,
      'a stale `voiceChannel` makes `:253-255` stop a channel the voice no longer owns. ' +
        'Nothing ranks below the kills, so this — not a refusal — is how the `impact` ' +
        'overlap does damage.',
    ).toBe(false)
  })

  it('an arbitrated cue whose source fails to build releases the voice it silenced', async () => {
    const { engine, created } = await mkLoadedEngine(THROWER, { sourceThrowsOnCall: 2 })
    engine.play('hi') // priority 50, 30-frame window, channel `a`
    const first = created.sources[0]
    engine.play('hi2') // accepted, stops `hi` via :253-255, then throws at :257
    expect(first.stopped, 'premise: the cross-channel steal silenced the sounding voice').toBe(true)
    expect(
      created.sources,
      'premise: and the replacement never became a node at all',
    ).toHaveLength(1)
    engine.play('lo') // priority 10
    expect(
      startedSources(created),
      'nothing is sounding: `hi` was stopped and `hi2` never started. The engine already ' +
        'rules that "a sound that never sounded must not hold a window" (:269-272); a sound ' +
        'that was SILENCED must not hold one either.',
    ).toHaveLength(2)
  })
})

// ── The placement fork: the window outlives the sample, on purpose ────────────

describe('jt9-6 shared audio — the release belongs BELOW stopChannel`s early return', () => {
  it('an arbitrated window survives an unarbitrated cue that stopped nothing', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud') // 76-frame window
    const voice = created.sources[0]
    expect(voice.onended, 'the engine wires onended to clear the channel').toBeTypeOf('function')
    voice.onended?.() // the SAMPLE ended; the ROM-declared window keeps counting
    for (let i = 0; i < 10; i++) engine.tick() // 66 of 76 frames still to run
    engine.play('plain') // unarbitrated, same channel — but there is nothing to stop
    expect(
      created.sources[1].started,
      'premise: the unarbitrated cue did start, so `stopChannel` really was reached',
    ).toBe(true)
    engine.play('quiet') // priority 10 — the window is still legitimately open
    expect(
      startedSources(created),
      'the window is measured in FRAMES from the ROM table, not in the length of the .wav. ' +
        'Releasing ABOVE the early return would let a cue that silenced NOTHING cut a live ' +
        'window short — the same defect pointing the other way.',
    ).toHaveLength(2)
  })

  it('an unarbitrated cue on ANOTHER channel does not release the voice', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud') // 76-frame window on channel `v`
    engine.play('noise') // unarbitrated, channel `x` — touches nothing arbitrated
    expect(
      created.sources[1].started,
      'premise: the unrelated unarbitrated cue really did play',
    ).toBe(true)
    engine.play('quiet')
    expect(
      startedSources(created),
      'only the channel the voice is SOUNDING ON may release it — "release on every ' +
        'unarbitrated trigger" would pass the headline test and destroy arbitration',
    ).toHaveLength(2)
  })

  it('an arbitrated cue re-taking its own channel still holds the voice', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud') // 80 on `v`
    engine.play('loud2') // 80 on `v` — equal interrupts, same channel
    expect(created.sources[0].stopped, 'premise: the equal-priority cue stole the channel').toBe(
      true,
    )
    engine.play('quiet')
    expect(
      startedSources(created),
      'a release inside stopChannel runs BEFORE the claim at :273-277, so the stealing cue ' +
        'must still end up owning the voice — release-and-forget-to-reclaim fails here',
    ).toHaveLength(2)
  })
})

// ── The reverse case the story asks for: it is correct today and must stay ────

describe('jt9-6 shared audio — an arbitrated cue stealing from an unarbitrated one stays correct', () => {
  it('an arbitrated cue still steals the channel of a sounding unarbitrated cue', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('plain') // unarbitrated, channel `v`, no window
    engine.play('loud') // arbitrated, same channel — the reverse of the defect
    expect(created.sources[0].stopped, 'the arbitrated cue cuts in exactly as before').toBe(true)
    expect(created.sources[1].started).toBe(true)
    engine.play('quiet')
    expect(
      startedSources(created),
      'and it claims a real window: the lower-priority cue behind it is refused',
    ).toHaveLength(2)
  })

  it('an arbitrated cue still reaches across channels to stop the voice (:253-255)', async () => {
    const { engine, created } = await mkLoadedEngine(THROWER)
    engine.play('hi') // 50 on channel `a`
    const first = created.sources[0]
    engine.play('hi2') // 50 on channel `b` — one voice, so `a` must go quiet
    expect(
      first.stopped,
      'POSITIVE CONTROL for the cross-channel steal: this suite elsewhere asserts this ' +
        'mechanism does NOT fire, and that assertion is worthless if it cannot fire here',
    ).toBe(true)
    expect(created.sources[1].started, 'and the new voice sounds').toBe(true)
  })
})

// ── stopLoop's own release is not made redundant by the fix ───────────────────

describe('jt9-6 shared audio — stopLoop keeps its own release (:300)', () => {
  it('stopLoop still frees a window whose sample already ended', async () => {
    const { engine, created } = await mkLoadedEngine(LOOPY)
    engine.play('bang') // arbitrated one-shot, 600-frame window on `c1`
    created.sources[0].onended?.() // the sample ends; `live` is empty, window holds
    engine.stopLoop('hum') // an explicit "silence c1" — hum shares that channel
    engine.play('quiet') // priority 10
    expect(
      startedSources(created),
      'stopLoop releases unconditionally and has since jt5-5. `stopChannel` finds nothing ' +
        'to stop here, so a fix that deletes :300 as redundant would leave 600 frames of ' +
        'silent refusal behind.',
    ).toHaveLength(2)
  })
})

// ── The six cabinets that declare no priorities ───────────────────────────────

describe('jt9-6 shared audio — a manifest with no priorities cannot tell this shipped', () => {
  it('unconditional channel stealing and the clock both still behave', async () => {
    const { engine, created } = await mkLoadedEngine(LEGACY)
    for (let i = 0; i < 100; i++) engine.tick()
    engine.play('a')
    engine.play('b')
    engine.play('a')
    expect(
      startedSources(created),
      'three triggers, three sounds — an unarbitrated manifest refuses nothing',
    ).toHaveLength(3)
    expect(created.sources[0].stopped, 'and still steals its shared channel').toBe(true)
    expect(() => engine.stopLoop('a'), 'stopLoop with no voice to release must not throw').not.toThrow()
  })
})

// ── jt9-35: pin the GUARD CONDITION jt9-6 left unpinned ────────────────────────
// jt9-6's fix `if (voiceChannel === channel) releaseVoice()` (src/shared/audio.ts:222)
// is correct and shipped. What the jt9-6 suite does NOT pin is its guard condition:
// four mutants — each proven non-equivalent by the story's own standalone probes —
// leave the full suite green today. These tests turn each RED. RED phase applies the
// verbatim mutant strings from the story description rather than reconstructing intent.
//
// RED audit — each PASSES on the shipped code and FAILS under exactly its mutant
// (mutants applied one at a time, verbatim, then reverted):
//   • A: bare `    releaseVoice()` at :222 (drops `if (voiceChannel === channel)`)
//   • B: `    if (voiceChannel === channel && voiceFrames > 0) releaseVoice()` at :222
//   • C: `&& voiceFrames > 0` added to the cross-channel steal condition at :266
//   • D: `&& voiceFrames > 0` added to stopLoop's own release at :313

describe('jt9-35 shared audio — the stopChannel release guard is pinned', () => {
  // Mutant A: bare unconditional `releaseVoice()` at :222. Reachable in centipede
  // today (spiderKill arbitrated on `impact`, spider-stop -> stopLoop(spiderLoop) on
  // `voice-spider`, both edges on one kill), so this is LIVE, not latent.
  it('an unarbitrated cue silencing a source on a channel the voice does NOT own leaves the window intact', async () => {
    const { engine, created } = await mkLoadedEngine(FOREIGN)
    engine.play('loud') // priority 80, a 76-frame window opens on channel `v`
    engine.play('n1') // unarbitrated, channel `x` — first cue there, nothing to stop
    engine.play('n2') // unarbitrated, channel `x` — now stopChannel(x) DOES stop n1
    expect(
      created.sources[2].started,
      'premise: n2 played, so stopChannel(x) passed its `if (!prev) return` and REACHED ' +
        'the release line at :222 — without this the mutant line is never executed',
    ).toBe(true)
    expect(
      created.sources[0].stopped,
      'premise: the arbitrated voice on channel `v` was never touched — n1/n2 are on `x`',
    ).toBe(false)
    engine.play('quiet') // priority 10 — must be refused by the window still on `v`
    expect(
      startedSources(created),
      'the release line ran on channel `x`, which the voice does NOT own, so the 76-frame ' +
        'window on `v` must survive and go on refusing `quiet`. A bare unconditional ' +
        'releaseVoice() there frees the window and lets `quiet` through — 4 sources, not 3.',
    ).toHaveLength(3)
  })

  // Mutant B: `&& voiceFrames > 0` on the :222 release. A zero-length window's
  // voiceChannel is left stale, so the next accepted arbitrated cue steals across.
  it('a zero-length arbitrated window is still released when its own channel is silenced', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROWIN)
    engine.play('zap') // priority 5, NO frameDurations -> voiceFrames 0, voiceChannel `v`
    engine.play('plain') // unarbitrated, same channel `v` — silences zap, reaches :222
    expect(
      created.sources[0].stopped,
      'premise: `plain` silenced `zap`, so stopChannel(v) reached the :222 release line',
    ).toBe(true)
    expect(created.sources[1].started, 'premise: `plain` is itself sounding on `v`').toBe(true)
    engine.play('boom') // priority 9 on channel `w` — accepted on either side of the fix
    expect(
      created.sources[2].started,
      'control: `boom` really started, so the cross-channel steal at :266 was evaluated',
    ).toBe(true)
    expect(
      created.sources[1].stopped,
      'the voice was released when `plain` silenced `zap`, so voiceChannel is null and the ' +
        'accepted `boom` cannot reach across to stop `plain`. A `&& voiceFrames > 0` ' +
        'restrictor on :222 skips the release (zap`s window is 0), leaving voiceChannel `v` ' +
        'stale — then `boom` steals channel `v` and stops `plain`.',
    ).toBe(false)
  })

  // Mutant C: `&& voiceFrames > 0` on the cross-channel steal at :266. A one-voice
  // machine must silence the sounding zero-window cue when it accepts a new one.
  it('an accepted arbitrated cue steals a zero-length voice`s channel — one voice, even at zero frames', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROWIN)
    engine.play('zap') // priority 5, voiceFrames 0, sounding on channel `v`
    engine.play('boom') // priority 9 on channel `w` — takes the one voice
    expect(
      created.sources[1].started,
      'control: `boom` was accepted, so the cross-channel steal at :266 was evaluated',
    ).toBe(true)
    expect(
      created.sources[0].stopped,
      'the machine has ONE voice: accepting `boom` must silence `zap` even though `zap`s ' +
        'window is zero frames. A `&& voiceFrames > 0` restrictor on the :266 steal skips ' +
        'it, leaving `zap` sounding alongside `boom` — two voices at once.',
    ).toBe(true)
  })

  // Mutant D: `&& voiceFrames > 0` on stopLoop's own release at :313. Reached only
  // when stopChannel found nothing (the sample already ended), so :222 never runs.
  it('stopLoop frees a zero-length arbitrated window whose sample already ended', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROLOOP)
    engine.play('zap') // priority 5, voiceFrames 0, voiceChannel `v`
    expect(created.sources[0].onended, 'the engine wires onended to clear the channel').toBeTypeOf(
      'function',
    )
    created.sources[0].onended?.() // the sample ends; `live` on `v` is now empty, window holds
    engine.stopLoop('hum') // explicit "silence `v`" — stopChannel finds nothing, :222 not reached
    engine.play('plain') // unarbitrated, channel `v` — a fresh source to be stolen
    expect(created.sources[1].started, 'premise: the fresh `plain` is sounding on `v`').toBe(true)
    engine.play('boom') // priority 9 on channel `w`
    expect(
      created.sources[2].started,
      'control: `boom` really started, so the cross-channel steal at :266 was evaluated',
    ).toBe(true)
    expect(
      created.sources[1].stopped,
      'stopLoop must free the zero-length window (voiceChannel `v`) so voiceChannel is null ' +
        'and `boom` cannot reach across to stop `plain`. A `&& voiceFrames > 0` restrictor on ' +
        'stopLoop`s :313 release skips it (zap`s window is 0), leaving voiceChannel stale — ' +
        'then `boom` steals channel `v` and stops `plain`.',
    ).toBe(false)
  })
})

// ── jt9-35 rework: two Reviewer-found survivors of the battery above ──────────
// The A–D battery pins the :222 guard against DELETING and RESTRICTING mutations,
// but two non-equivalent mutants still passed the whole file green:
//   • B1: tick() keeps `voiceFrames -= 1` (:325) but DROPS the natural-expiry
//     release `if (voiceFrames === 0) releaseVoice()` (:326). Every existing test
//     releases through stopChannel/stopLoop or never lets a window expire by
//     ticking, so the stale `voiceChannel` a tick-expired window leaves behind was
//     never observed.
//   • B2: the :222 guard WIDENED to `voiceChannel === channel || voiceFrames === 0`.
//     Mutants A–B delete or restrict that guard; nothing pinned it against
//     accepting MORE, and a zero-length window (FOREIGN's shape says the line is
//     reached; ZEROWIN's shape says voiceFrames is 0) satisfies the widened arm on
//     a FOREIGN channel's silencing.

describe('jt9-35 shared audio — Reviewer B1/B2: tick-expiry and widened-guard survivors', () => {
  // Mutant B1: natural expiry must RELEASE, not merely count to zero. A window
  // that reached 0 by ticking but kept its `voiceChannel` lets the next accepted
  // arbitrated cue reach across (:266) and stop an unarbitrated sound on a
  // channel the dead voice no longer owns.
  it('a window that expires naturally via tick() releases the voice — no later cross-steal', async () => {
    const { engine, created } = await mkLoadedEngine(MIXED)
    engine.play('loud') // priority 80, a 76-frame window opens on channel `v`
    expect(created.sources[0].onended, 'the engine wires onended to clear the channel').toBeTypeOf(
      'function',
    )
    // The SAMPLE ends; `live` on `v` empties while the window keeps counting.
    // Essential, not decorative: with `loud` still live, `plain` below would stop
    // it and the :222 release would clear the stale voice EVEN UNDER THE MUTANT.
    // Only an empty `v` makes the tick-expiry release the sole thing that can.
    created.sources[0].onended?.()
    for (let i = 0; i < 75; i++) engine.tick() // 75 of 76 — one frame still to run
    engine.play('quiet') // priority 10 < 80, window holds
    expect(
      startedSources(created),
      'premise: at frame 75 the window still refuses — proving tick() really was ' +
        'decrementing the counter this test is about',
    ).toHaveLength(1)
    engine.tick() // the 76th frame: voiceFrames hits 0 — the mutated line fires here
    engine.play('plain') // unarbitrated on `v`; stopChannel(v) finds nothing (:222 not reached)
    expect(created.sources[1].started, 'premise: `plain` is sounding on `v`').toBe(true)
    engine.play('quiet') // priority 10 on `w` — accepted either way (voiceFrames is 0)
    expect(
      created.sources[2].started,
      'control: `quiet` really started, so the cross-channel steal at :266 was evaluated',
    ).toBe(true)
    expect(
      created.sources[1].stopped,
      'natural expiry released the voice at the 76th tick, so voiceChannel is null and the ' +
        'accepted `quiet` cannot reach across to stop `plain`. Dropping the :326 release ' +
        'leaves voiceChannel `v` stale at zero frames — then `quiet` steals `v` and silences ' +
        'an unarbitrated sound on a channel the voice no longer owns.',
    ).toBe(false)
  })

  // Mutant B2: `if (voiceChannel === channel || voiceFrames === 0)` at :222. A
  // zero-length window's voice is still SOUNDING; a silencing on a FOREIGN
  // channel must not release it, or the next accepted arbitrated cue finds
  // voiceChannel null, the one-voice steal at :266 never fires, and two voices
  // sound at once.
  it('a foreign-channel silencing does not release a zero-length voice that is still sounding', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROFOREIGN)
    engine.play('zap') // priority 5, NO frameDurations -> voiceFrames 0, voiceChannel `v`
    engine.play('n1') // unarbitrated, channel `x` — first cue there, nothing to stop
    engine.play('n2') // unarbitrated, channel `x` — stopChannel(x) now executes :222
    expect(
      created.sources[2].started,
      'premise: n2 played, so stopChannel(x) passed its `if (!prev) return` and REACHED ' +
        'the :222 guard with voiceChannel `v` !== `x` and voiceFrames 0 — the exact state ' +
        'the widened arm wrongly matches',
    ).toBe(true)
    expect(
      created.sources[1].stopped,
      'premise: and it really silenced n1 — the release line ran having stopped something',
    ).toBe(true)
    expect(
      created.sources[0].stopped,
      'premise: the zero-window `zap` on `v` is still sounding — n1/n2 are on `x`',
    ).toBe(false)
    engine.play('boom') // priority 9 on channel `w` — accepted (voiceFrames is 0 either way)
    expect(
      created.sources[3].started,
      'control: `boom` really started, so the one-voice steal at :266 was evaluated',
    ).toBe(true)
    expect(
      created.sources[0].stopped,
      'the machine has ONE voice: `zap` still owns it (a foreign-channel silencing must not ' +
        'release a sounding voice), so accepting `boom` steals across and stops `zap`. The ' +
        'widened guard released the voice at n2`s silencing — voiceChannel null, the :266 ' +
        'steal never fires, and `zap` sounds alongside `boom`: two voices at once.',
    ).toBe(true)
  })
})

// ── jt9-53: the tick() IDLE path ─────────────────────────────────────────────
// jt9-52's B1 pins that a window counting DOWN to zero via tick() releases (the
// `:326` line must EXIST). It cannot see a DIFFERENT tick() mutant: HOISTING that
// release out of the `if (voiceFrames > 0)` countdown block —
//     function tick(): void {
//       if (voiceFrames > 0) { voiceFrames -= 1 }
//       if (voiceFrames === 0) releaseVoice()   // now fires on EVERY idle tick
//     }
// A voice that started with frames > 0 releases at zero either way, so B1 is blind
// to the hoist; and the ZEROWIN Mutant-C test never ticks, so it is blind too. The
// gap is a SOUNDING zero-window voice (voiceFrames 0, voiceChannel set) meeting an
// idle tick: correct code's `voiceFrames > 0` guard skips the block and the voice
// stays held; the hoisted release frees it, so the next accepted arbitrated cue
// finds voiceChannel null, the one-voice steal at `:266` never fires, and two
// voices sound at once. Latent today (no shipped cabinet arbitrates a cue with no
// frameDurations entry — joust framesFor throws on frames <= 0), same shape the
// A–D / B1–B2 battery pins at the other release sites.

describe('jt9-53 shared audio — an idle tick() must not release a sounding zero-window voice', () => {
  it('an idle tick() leaves a sounding zero-window voice held — a later arbitrated cue still cross-steals', async () => {
    const { engine, created } = await mkLoadedEngine(ZEROWIN)
    engine.play('zap') // priority 5, NO frameDurations -> voiceFrames 0, voiceChannel `v`
    expect(created.sources[0].started, 'premise: the zero-window `zap` is sounding on `v`').toBe(true)
    engine.tick() // ONE idle tick — no cue arrives; voiceFrames is already 0
    engine.play('boom') // priority 9 on channel `w` — accepted (voiceFrames is 0 either way)
    expect(
      created.sources[1].started,
      'control: `boom` really started, so the one-voice steal at :266 was evaluated',
    ).toBe(true)
    expect(
      created.sources[0].stopped,
      'the idle tick() must leave the zero-window voice HELD (voiceChannel `v`), so accepting ' +
        '`boom` reaches across (:266) and stops `zap` — ONE voice. Hoisting the :326 release ' +
        'out of the `voiceFrames > 0` block frees the window on that idle tick, leaving ' +
        'voiceChannel null: the :266 steal never fires and `zap` sounds alongside `boom`.',
    ).toBe(true)
  })
})
