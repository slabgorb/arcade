// tests/pause-behaviour.test.ts
//
// Story cp7-6 (centipede) — RED phase (Han Solo / TEA). The LIVE pause behaviour,
// observed by BOOTING src/main.ts through the shell harness (helpers/boot-shell)
// and driving real keydowns — the same technique tests/audio-wiring.test.ts uses,
// and the reason centipede can pin behaviour a source-text grep never could.
//
// Nothing here fakes the game. The REAL core, atlas, renderer, timebase and input
// adapters all run; only the browser is a stub. Two seams are wrapped, each to
// OBSERVE rather than replace:
//   • shell/audio        — createAudio returns a RECORDING engine, so every cue
//                          (play / startLoop / stopLoop / tick) the real dispatch
//                          emits is captured. This is the "existing SoundSurface
//                          double" AC2 names.
//   • @shared/esc-overlay — drawEscOverlay records its call rather than stroking
//                          the ctx. Two reasons: (a) the node ctx stub has no
//                          beginPath/stroke, so the real overlay would throw; and
//                          (b) recording is exactly how AC3's "the overlay is
//                          drawn while paused" becomes checkable here. The overlay
//                          PLACEMENT — on the visible ctx AFTER the integer blit so
//                          the card is not pixel-scaled — has no unit seam and is
//                          an acceptance-by-manual-run (see the TEA Assessment).
//
// WHY EDGE-DRIVEN AUDIO IS THE HARD PART (lang-review #14, origin: cp5-1). The
// core emits only the EDGES of a sustained voice — march-start once, march-stop
// once — dispatched to startLoop/stopLoop. So a naive pause that simply stops
// stepping the sim emits no stop edge, and the march, spider and flea loops RING
// FOREVER THROUGH THE PAUSE. Silencing them is a transition the SHELL must take at
// the pause edge, where every ringing voice is visible; this file asserts the
// double sees it happen, and sees them restart on resume.

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { installShellDom, ONE_STEP_MS } from './helpers/boot-shell'
import type { SimState } from '../src/core/sim'
import type { AudioEngine, SoundName } from '../src/shell/audio'

// ── the recording double ─────────────────────────────────────────────────────
// vi.mock factories are hoisted above imports, so the arrays they close over must
// be hoisted too (temporal-dead-zone otherwise).
const rec = vi.hoisted(() => ({
  /** Every sustained/one-shot cue the dispatch drove: method + sound name. */
  cues: [] as { method: 'play' | 'startLoop' | 'stopLoop'; name: string }[],
  /** audio.tick() count — playEventSounds calls it once per STEPPED sim frame
   *  (audio-dispatch.ts:63), so this is a direct step counter. */
  ticks: 0,
  /** How many engines were built — main.ts must build exactly one, at boot. */
  engines: 0,
  /** Every drawEscOverlay call: the viewport it was handed. */
  overlay: [] as { w: number; h: number }[],
}))

vi.mock('../src/shell/audio', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/shell/audio')>()
  return {
    ...real,
    // Forward the real factory's parameters (house rule: a mock that swallows an
    // argument stops modelling the thing it stands in for).
    createAudio: (..._args: Parameters<typeof real.createAudio>): AudioEngine => {
      rec.engines += 1
      return {
        resume: (): void => {},
        play: (name: SoundName): void => {
          rec.cues.push({ method: 'play', name })
        },
        startLoop: (name: SoundName): void => {
          rec.cues.push({ method: 'startLoop', name })
        },
        stopLoop: (name: SoundName): void => {
          rec.cues.push({ method: 'stopLoop', name })
        },
        ready: (): boolean => false,
        tick: (): void => {
          rec.ticks += 1
        },
      }
    },
  }
})

vi.mock('@shared/esc-overlay', async (importOriginal) => {
  const real = await importOriginal<typeof import('@shared/esc-overlay')>()
  return {
    // Anchor the recorder's parameters to the REAL drawEscOverlay signature
    // (ctx, w, h, opts) so a future signature change is caught at compile time
    // here — the same discipline the audio mock above uses (lang-review #8). A
    // bare `(ctx, w, h)` would silently drop the 4th `opts` param.
    drawEscOverlay: (...args: Parameters<typeof real.drawEscOverlay>): void => {
      const [, w, h] = args
      rec.overlay.push({ w, h })
    },
  }
})

const shell = installShellDom()

/** The four sustained voices — one channel each (shell/audio.ts:118-121). These
 *  are the loops that ring through a naive pause. */
const SUSTAINED: readonly SoundName[] = ['march', 'spiderLoop', 'fleaLoop', 'scorpionLoop']

/** Which sustained voices are currently RINGING in a cue log: started strictly
 *  more often than stopped. Edge pairs are well-formed, so net > 0 ⇒ open. */
function openVoices(cues: readonly { method: string; name: string }[]): SoundName[] {
  return SUSTAINED.filter((name) => {
    const starts = cues.filter((c) => c.name === name && c.method === 'startLoop').length
    const stops = cues.filter((c) => c.name === name && c.method === 'stopLoop').length
    return starts > stops
  })
}

// ── phase snapshots, captured as the single boot run drives through them ──────
let openBeforePause: SoundName[] = []
let simRefBeforePause: SimState
let simRefsDuringPause: SimState[] = []
let ticksDuringPause = 0
let overlayCallsDuringPause = 0
let openDuringPause: SoundName[] = []
let sustainedStartsDuringPause = 0
let ticksOnResumeFrame = 0
let openAfterResume: SoundName[] = []
let overlayCallsAfterResume = 0

beforeAll(async () => {
  await import('../src/main')

  let t = 0
  const run = (frames: number, ms: number): void => {
    for (let i = 0; i < frames; i++) {
      t += ms
      shell.frame(t)
    }
  }
  const escape = (): void =>
    // key:'Escape' (the DOM spelling installPauseToggle lowercases), repeat:false
    // so it reads as an EDGE, not an auto-repeat level.
    shell.emit('window', 'keydown', { key: 'Escape', repeat: false })

  run(1, 0) // baseline frame — main.ts only stamps `last`, no sub-steps

  // START1 → leave attract for a live game (the core keeps attract silent, so no
  // sustained voice can ring until this lands).
  shell.emit('window', 'keydown', { key: 'Enter' })
  run(40, ONE_STEP_MS)
  shell.emit('window', 'keyup', { key: 'Enter' })

  // The march is the game's heartbeat — it rings continuously through live play.
  // Snapshot the ringing set and the live state reference the instant before we
  // pause; these are what must go silent / stay frozen.
  openBeforePause = openVoices(rec.cues)
  simRefBeforePause = shell.sim()
  // The cue-stream boundary: everything after this index is emitted from the
  // pause edge onward (the shell's silencing stops, and nothing else if frozen).
  const cuesAtPauseEdge = rec.cues.length

  // ── PAUSE, then hold it across a LONG wall-clock span ───────────────────────
  // The big per-frame jumps are AC4's probe: a naive gate BANKS this elapsed time
  // and fast-forwards on resume. A frozen sim must ignore it entirely.
  const ticksAtPause = rec.ticks
  const overlayAtPause = rec.overlay.length
  escape()
  simRefsDuringPause = []
  for (let i = 0; i < 8; i++) {
    t += 4000 // ~4s of wall-clock per frame — 32s paused in total
    shell.frame(t)
    simRefsDuringPause.push(shell.sim())
  }
  ticksDuringPause = rec.ticks - ticksAtPause
  overlayCallsDuringPause = rec.overlay.length - overlayAtPause
  // Only cues emitted AFTER the pause edge — did anything start ringing, or did
  // the ringing set get silenced?
  openDuringPause = openVoices(rec.cues)
  // A distinct probe on the raw stream: how many sustained voices were STARTED
  // after the pause edge. A frozen sim emits no edges, so this must be zero.
  sustainedStartsDuringPause = rec.cues
    .slice(cuesAtPauseEdge)
    .filter((c) => c.method === 'startLoop' && (SUSTAINED as readonly string[]).includes(c.name))
    .length

  // ── RESUME — one ordinary frame ─────────────────────────────────────────────
  const ticksAtResume = rec.ticks
  const overlayAtResume = rec.overlay.length
  escape()
  t += ONE_STEP_MS
  shell.frame(t)
  ticksOnResumeFrame = rec.ticks - ticksAtResume
  overlayCallsAfterResume = rec.overlay.length - overlayAtResume
  run(20, ONE_STEP_MS) // let the resumed voices re-open
  openAfterResume = openVoices(rec.cues)
})

// ═════════════════════════════════════════════════════════════════════════════
// Precondition — the run reached LIVE PLAY with a voice ringing (non-vacuity)
// ═════════════════════════════════════════════════════════════════════════════

describe('cp7-6 — precondition: the harness reached live play with a ringing voice', () => {
  it('built exactly one audio engine at boot', () => {
    expect(rec.engines, 'main.ts must build the engine once, at boot').toBe(1)
  })

  it('at least one sustained voice is ringing before the pause', () => {
    // If nothing is ringing, every silencing assertion below is vacuously true —
    // this is the guard that keeps them honest. The march is expected; the test
    // asserts the general fact so it does not turn brittle on a sim tweak.
    expect(
      openBeforePause.length,
      'no sustained voice was ringing before the pause — the run never reached live ' +
        'play, so the silencing assertions cannot fail even once main.ts is wired',
    ).toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — Escape freezes the sim (no segment / spider / flea motion), and it stays
//       frozen for the WHOLE pause (AC4: a long pause is not banked)
// ═════════════════════════════════════════════════════════════════════════════

describe('cp7-6 AC1/AC4 — a paused sim is frozen and does not advance', () => {
  it('the live SimState reference does not change across the entire paused span', () => {
    // main.ts keeps only the newest state and reassigns `sim` only inside the
    // stepped callback. A paused frame must not step, so the reference the
    // window.__sim tap returns is byte-identical throughout — the same
    // frozen-by-reference guarantee @shared/pause.stepUnlessPaused gives.
    // RED today: with no gate, every frame steps the sim and hands back a NEW
    // object, so these references all differ from the pre-pause one.
    expect(simRefsDuringPause.length, 'the paused span drove no frames').toBeGreaterThan(0)
    for (const ref of simRefsDuringPause) {
      expect(
        ref,
        'the sim advanced while paused — Escape did not freeze the game (the segments, ' +
          'spider and flea kept moving)',
      ).toBe(simRefBeforePause)
    }
  })

  it('no sim step ran while paused — tick() (once per stepped frame) never fired', () => {
    // audio.tick() is driven once per STEPPED frame (audio-dispatch.ts:51-63). A
    // frozen sim steps zero times, so across 32s of paused wall-clock it must not
    // fire at all. RED today: the sim keeps stepping, so tick() fires every frame.
    expect(
      ticksDuringPause,
      'sim steps ran while paused (audio.tick fired) — the frame loop is still ' +
        'advancing the core behind the pause',
    ).toBe(0)
  })

  it('does NOT fast-forward on resume — the paused span was discarded, not banked (AC4)', () => {
    // The paused frames jumped the wall clock by ~32s. If that time were BANKED
    // into the accumulator, the first resumed frame would run a catch-up burst
    // (clamped only by advanceFixedSteps' spiral guard). One ordinary frame is
    // ONE sim step; a burst is many. Bound well below the spiral clamp.
    //
    // This is a GUARD on the chosen paused-time policy (tempest discards; the
    // pump callback consuming acc via no-op steps discards for free): it holds on
    // today's no-pause code and must keep holding once pause lands — it fails only
    // on a naive gate that banks. See the TEA Assessment's paused-time note.
    expect(
      ticksOnResumeFrame,
      'the first resumed frame ran a catch-up BURST of sim steps — paused time was ' +
        'banked into the accumulator instead of discarded (AC4)',
    ).toBeLessThanOrEqual(3)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — every sustained voice goes SILENT for the pause and resumes correctly
// ═════════════════════════════════════════════════════════════════════════════

describe('cp7-6 AC2 — the sustained voices are silenced through the pause', () => {
  it('every voice that was ringing is stopped for the duration of the pause', () => {
    // The core emits only edges and does not step while paused, so the SHELL must
    // stop each ringing loop at the pause boundary (shell-side loop tracking, or a
    // suspend seam that stops them — either way visible on this double, as AC2
    // requires). RED today: nothing stops them, so the march (and any other open
    // voice) is still ringing on the double all through the pause.
    expect(
      openDuringPause,
      `the sustained voices ${JSON.stringify(openBeforePause)} were left RINGING through the ` +
        'pause — because the core emits only edges, not stepping the sim leaves the march, ' +
        'spider and flea loops sounding forever (lang-review #14)',
    ).toEqual([])
  })

  it('no sustained voice is (re)started while paused — silence means silence', () => {
    // Distinct from the net-open check above: this reads the RAW cue stream after
    // the pause edge and counts startLoop cues on the four sustained voices. A
    // frozen sim emits no edges, so the shell must issue exactly zero of them
    // while paused. RED today: the sim keeps playing behind the "pause" and fires
    // march/spider start edges throughout the span.
    expect(
      sustainedStartsDuringPause,
      'a sustained voice was (re)started while paused — the core is still stepping ' +
        'and emitting loop edges behind the pause',
    ).toBe(0)
  })

  it('the voices resume ringing after Escape is pressed again', () => {
    // "resumes correctly": the set that was silenced must ring again once the
    // player un-pauses. RED once the silencing lands but the restart is dropped —
    // the mirror defect (voices stopped and never restarted) is just as wrong as
    // never stopping them.
    for (const name of openBeforePause) {
      expect(
        openAfterResume,
        `the '${name}' voice was silenced by the pause but never resumed — a paused game ` +
          'that un-pauses into silence is as wrong as one that rings through the pause',
      ).toContain(name)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the pause overlay is drawn while paused (placement is manual-run; see hdr)
// ═════════════════════════════════════════════════════════════════════════════

describe('cp7-6 AC3 — the keybind overlay is drawn while paused, and only then', () => {
  it('drawEscOverlay is called during the paused span', () => {
    // RED today: main.ts never imports or calls drawEscOverlay, so a paused frame
    // draws no overlay. (That the card lands on the VISIBLE ctx AFTER the blit, so
    // it is not pixel-scaled into the 240x256 backbuffer, is AC3's placement half
    // — no unit seam, verified by the manual run recorded in the TEA Assessment.)
    expect(
      overlayCallsDuringPause,
      'no pause overlay was drawn while paused — drawEscOverlay was never called',
    ).toBeGreaterThan(0)
  })

  it('drawEscOverlay is NOT called while playing (before the pause)', () => {
    // The dim card must not sit over live play. The whole run before the pause
    // drew no overlay. (Holds today too — this is the negative guard that keeps
    // the positive one honest.)
    const overlayBeforePause = rec.overlay.length - overlayCallsDuringPause - overlayCallsAfterResume
    expect(
      overlayBeforePause,
      'the pause overlay was drawn during ordinary play, not just while paused',
    ).toBe(0)
  })
})
