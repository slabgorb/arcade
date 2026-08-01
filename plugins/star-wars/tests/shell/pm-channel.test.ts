// tests/shell/pm-channel.test.ts
//
// RED-phase suite for Story sw8-13 — ONE PM player, exactly like the cabinet.
//
// THE RULING (TEA, from the 1983 source): the sound board has a single tune
// player. Every PM entry point — the "music" pieces (PMTH5 :372, PM4TH :379,
// PMTHB :386, PMDAR :400, PMRRP :365) and the one-shot tunes (PMSF2 :330,
// PMBEN :337, PMCNT :344, PMEND :351, PMREB :358, PMDES :393) alike — claims
// the SAME four POKEY voices via four `.TUNE n,…` invocations, and the .TUNE
// macro's expansion opens with "JSR PKCUT'VNUM ;CLEAR OUT AND INIT THIS VOICE"
// (SNDPM.MAC:319-326): an unconditional clear of whatever was sounding there.
// So ANY start steals, in BOTH directions, with no priority test and no resume:
//
//   - the space→surface warp: ground init's "JSR PM4TH ;BATTLE MUSIC IN
//     FOURTHS" (WSMAIN.MAC:1636) STEALS a descent tune (PMDES, cued at the 20s
//     milestone, WSMAIN.MAC:1439) still ringing ~1s into the warp;
//   - any new tune silences the loop: even the trench's REPEATING theme (PMRRP,
//     the one PM piece that genuinely loops) dies to the proton torpedo's
//     PMSF2 — and nothing restarts it. Silence until the next JSR PM*.
//
// That refutes the narrower "music-starts-kill-tunes" option the story offered:
// the steal is symmetric, so the port is a SINGLE logical channel shared by
// every music track and every tune. Our two-channel overlay (sw3-5's
// adaptation, pinned until now by tune-channel.test.ts's "a knell must not
// kill the phase loop") is the divergence this story retires; that pin is
// flipped in the same commit. SFX (POKEY effect voices, SNDAUD) and speech
// (the TMS5220) are OTHER hardware — the PM steal must not touch them.
//
// The shared engine (@shared/audio) already steals per-channel — startSource
// stops the channel's live voice whether the newcomer loops or not — so the
// behavior below follows from the channel maps alone; these tests pin the
// OBSERVABLE (which sources get stopped), not the map values' spelling.
//
// RED today: the maps split 'music' vs 'tune', so the union pin reads 2 ≠ 1,
// the warp steal leaves descent ringing, the knell leaves the trench loop
// ringing, and themeB leaves the space loop ringing. Two boundary guards are
// GREEN ON ARRIVAL by design and say so inline: tune-over-tune steal (true
// under the old model too) and the SFX/speech isolation pair (they fence the
// unification from overreaching into the other engines).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createAudioEngine, MUSIC_CHANNELS, TUNE_CHANNELS } from '../../src/shell/audio'

/** A buffer-source the fake context handed out: which decoded file it carries,
 *  whether it was started/stopped, its loop flag, and the engine's onended hook
 *  (fired by hand to simulate a one-shot ringing out). */
interface FakeSource {
  buffer: { url: string } | null
  loop: boolean
  started: boolean
  stopped: boolean
  /** True once the source rang out on its own (ringOut fired its onended) —
   *  a finished one-shot no longer sounds, though stop() was never called. */
  ended: boolean
  onended: (() => void) | null
  connect(): void
  disconnect(): void
  start(): void
  stop(): void
}

let sources: FakeSource[]

/** Web Audio stub with a real createBufferSource (speech-serial.test.ts idiom,
 *  plus stop() tracking): decode tags each buffer with the URL its bytes came
 *  from, so every started source names its file. */
class FakeAudioContext {
  state = 'running'
  destination = {}
  createGain() {
    return { gain: { value: 0 }, connect() {} }
  }
  decodeAudioData(data: { __url: string }) {
    return Promise.resolve({ url: data.__url })
  }
  resume() {
    return Promise.resolve()
  }
  createBufferSource(): FakeSource {
    const src: FakeSource = {
      buffer: null,
      loop: false,
      started: false,
      stopped: false,
      ended: false,
      onended: null,
      connect() {},
      disconnect() {},
      start() {
        src.started = true
      },
      stop() {
        src.stopped = true
      },
    }
    sources.push(src)
    return src
  }
}

/** Let the fetch -> arrayBuffer -> decode -> start promise chains settle. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

const fileOf = (s: FakeSource): string => s.buffer?.url.split('/').pop() ?? ''

/** Files audibly ringing right now: started and neither stopped nor rung out. */
const ringing = (): string[] =>
  sources.filter((s) => s.started && !s.stopped && !s.ended).map(fileOf)

/** A one-shot finishes on its own: mark it silent, then fire the engine's
 *  onended hook — the order a real AudioBufferSourceNode delivers. */
const ringOut = (s: FakeSource): void => {
  s.ended = true
  s.onended?.()
}

/** The last source carrying `file` (a retrigger makes a fresh source). */
const srcOf = (file: string): FakeSource | undefined =>
  [...sources].reverse().find((s) => fileOf(s) === file)

beforeEach(() => {
  sources = []
  vi.stubGlobal('fetch', (input: string) =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve({ __url: input }) }),
  )
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sw8-13 — ONE PM player: every track and every tune share a single channel', () => {
  it('the union of MUSIC_CHANNELS and TUNE_CHANNELS values is ONE channel', () => {
    // The cabinet's PM entries all claim voices 1-4 (SNDPM.MAC:330-405); a
    // second logical channel is the two-player overlay the story retires.
    // Set-level, not spelling-level: WHAT the channel is called is Dev's.
    const union = new Set([
      ...Object.values(MUSIC_CHANNELS),
      ...Object.values(TUNE_CHANNELS),
    ])
    expect(union.size).toBe(1)
  })
})

describe('sw8-13 — the steal is symmetric, like PKCUT (behavioral pins)', () => {
  it('the warp: starting the towers loop STEALS a still-ringing descent tune (PM4TH over PMDES)', async () => {
    // The story's headline frame: descent (20s milestone) rings ~1s into the
    // warp; ground init fires PM4TH (WSMAIN.MAC:1636) and the cabinet's one
    // player cuts descent off. Ours must too.
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.playTune('descent')
    expect(ringing()).toContain('descent.wav')
    engine.startLoop('towers')
    expect(srcOf('descent.wav')?.stopped, 'PM4TH must steal PMDES').toBe(true)
    expect(ringing()).toEqual(['towers_theme.wav'])
  })

  it('any new tune silences the loop: the torpedo knell kills the repeating trench theme (PMSF2 over PMRRP)', async () => {
    // PMRRP is the one PM piece that genuinely repeats, and even it dies to
    // PMSF2's PKCUT — the cabinet's trench goes quiet when the torpedo fires.
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.startLoop('trench')
    expect(ringing()).toContain('trench_theme.wav')
    engine.playTune('deathKnell')
    expect(srcOf('trench_theme.wav')?.stopped, 'PMSF2 must silence PMRRP').toBe(true)
    expect(ringing()).toEqual(['death_knell.wav'])
  })

  it('the stolen loop does NOT come back when the tune rings out — silence until the next JSR PM*', async () => {
    // The cabinet has no resume: PKCUT cleared the voices and nothing replays
    // them. Pins the tempting wrong-fix (auto-restarting the stolen loop when
    // the tune's onended fires). RED today via the same missing steal; once
    // GREEN it guards the no-resume half forever.
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.startLoop('trench')
    engine.playTune('deathKnell')
    const knell = srcOf('death_knell.wav')
    expect(knell).toBeDefined()
    if (knell) ringOut(knell)
    await settle()
    expect(ringing()).toEqual([])
    // ...and no fresh trench source was minted behind our back.
    expect(sources.filter((s) => fileOf(s) === 'trench_theme.wav').length).toBe(1)
  })

  it('themeB at the 10s milestone silences the space loop (PMTHB claims the same voices)', async () => {
    // sw8-12 made themeB a milestone TUNE; on the cabinet PMTHB's .TUNE 1-4
    // (SNDPM.MAC:386-391) cuts whatever main theme was still sounding.
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.startLoop('space')
    engine.playTune('themeB')
    expect(srcOf('space_theme.wav')?.stopped, 'PMTHB must silence the space loop').toBe(true)
    expect(ringing()).toEqual(['theme_b.wav'])
  })

  it('tune-over-tune still steals (the unchanged half of the old law): Ben over descent', async () => {
    // GREEN ON ARRIVAL, deliberately: this held under the two-channel model
    // (both tunes shared 'tune') and must survive the unification — the
    // game-over edge plays cantina/Ben OVER a ringing descent, faithfully.
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.playTune('descent')
    engine.playTune('bensTheme')
    expect(srcOf('descent.wav')?.stopped).toBe(true)
    expect(ringing()).toEqual(['bens_theme.wav'])
  })
})

describe('sw8-13 — what the PM player does NOT own (boundary guards, green on arrival)', () => {
  it('SFX are POKEY effect voices, not the PM player — a laser must not stop the loop', async () => {
    // SNDAUD's effects live on their own voices; unifying the PM channel must
    // not sweep the SFX engine into the steal.
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.startLoop('towers')
    engine.play('fire')
    expect(srcOf('towers_theme.wav')?.stopped).toBe(false)
    expect(ringing()).toContain('towers_theme.wav')
  })

  it('speech is the TMS5220, not the PM player — a line must not stop the tune', async () => {
    const engine = createAudioEngine()
    engine.resume()
    await settle()
    engine.playTune('descent')
    engine.speak('remember')
    await settle()
    expect(srcOf('descent.wav')?.stopped).toBe(false)
    expect(ringing()).toContain('descent.wav')
  })
})
