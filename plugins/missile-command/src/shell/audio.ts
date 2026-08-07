// src/shell/audio.ts
//
// Story mc8-2 (GREEN, Julia) — the shell's POKEY audio engine. This is IO, not
// simulation: the pure core (src/core/sound-tables.ts + modsnd.ts) owns the
// lifted W3SOUN byte tables and the deterministic envelope expansion; this file
// stands up the LIVE sound and never leaks a Web Audio type back across the
// boundary (purity.test.ts guards core/).
//
// DRIVER (mc8-1 spike, recommended path): the vendored `pokey.js` — a real POKEY
// emulator written as an `AudioWorkletProcessor` (registerProcessor('POKEY')) —
// run LIVE in the browser. `play()` expands a lifted sound into MODSND register
// writes (core), converts each write's sim-FRAME to a wall-clock time at the sim
// rate, and posts the time-ordered stream to the worklet's port; the worklet
// renders authentic POKEY samples. The vendored file is shared with star-wars's
// bake tool (one source, no copy) and referenced by URL so the build bundles it.
//
// THE NO-THROW CONTRACT (battlezone SH2-18, contract 5). Every public method runs
// inside main.ts's frame() ABOVE the requestAnimationFrame re-schedule, so a throw
// here would freeze render+input, not merely sound. There is no AudioContext until
// a user gesture, and NONE at all under node (vitest) — so every method degrades
// to a silent no-op when the context/worklet is absent, and every Web Audio call
// is guarded. Building the engine touches no context (the @shared/synth lazy-gate
// habit): it is safe to construct anywhere, including a test.
//
// The pokey.js port protocol (read from the vendor): postMessage([events]) where
// `events` is a FLAT, time-ordered list of triples [regIndex, value, timeSeconds];
// regIndex 0/2/4/6 = AUDF (voice pitch), 1/3/5/7 = AUDC (dist+vol), 8 = AUDCTL.
// Our RegisterWrite.register (0=AUDF1 … 7=AUDC4) maps straight onto that index.

import { SOUNDS, AUDCTL, type SoundLabel } from '../core/sound-tables.js'
import { expandSound } from '../core/modsnd.js'

// The one-shot cues mc8-2 can voice, each mapped to its lifted W3SOUN table.
export type SoundName =
  | 'launch'
  | 'explosion'
  | 'no-fire'
  | 'bonus-tick'
  | 'whoop'
  | 'end-game'
  | 'bonus-city'
  | 'low'

// Sustained cues — running until stopped. `drone` is the cruise/Sputnik descending
// drone; mc8-2 owns only its start/stop LIFECYCLE (so the edge-silence AC is
// provable), its parametric pitch sweep lands in mc8-3.
export type LoopName = 'drone'

export interface AudioEngine {
  // Build (once) and unlock the worklet. Idempotent — wire it to any gesture.
  resume(): void
  // Fire a one-shot cue. Silent no-op before the gesture gate / with no worklet.
  play(name: SoundName): void
  // Start a sustained cue. Harmless when already running or pre-gate.
  startLoop(name: LoopName): void
  // Stop a sustained cue. Harmless when not running or pre-gate.
  stopLoop(name: LoopName): void
}

// SoundName -> the lifted W3SOUN table it plays (spike event map).
const CUE: Readonly<Record<SoundName, SoundLabel>> = {
  launch: 'LA',
  explosion: 'EX',
  'no-fire': 'NS',
  'bonus-tick': 'TK',
  whoop: 'WP',
  'end-game': 'XX',
  'bonus-city': 'BN',
  low: 'LO',
}

// The sim frame rate — VSYNC ~= 61.0076 Hz (docs/rom-study/timebase.md). MODSND is
// a per-frame engine, so a write's sim frame N lands at N / FRAME_HZ seconds.
const FRAME_HZ = 61.0076

// The vendored POKEY worklet (shared with star-wars). Referenced by URL so Vite
// bundles it as a worklet module; never fetched under node.
const POKEY_WORKLET_URL = new URL(
  '../../../star-wars/tools/pokey-bake/vendor/pokey.js',
  import.meta.url,
)

// The AudioContext constructor if this environment has one (browser), else null —
// node/vitest has neither, which is what makes every method a silent no-op there.
type Ctor = typeof AudioContext
function audioContextCtor(): Ctor | null {
  const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor }
  return g.AudioContext ?? g.webkitAudioContext ?? null
}

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null
  let node: AudioWorkletNode | null = null
  let booting = false
  const running = new Set<LoopName>()

  // Post a time-ordered flat triple stream to the worklet, guarded.
  const feed = (events: number[]): void => {
    if (!node || !ctx) return
    try {
      node.port.postMessage([events])
    } catch {
      /* a closed context / dead port: swallow — sound is best-effort */
    }
  }

  const setAudctl = (): void => {
    if (!ctx) return
    feed([8, AUDCTL, ctx.currentTime])
  }

  return {
    resume(): void {
      if (node || booting) return
      const Ctor = audioContextCtor()
      if (!Ctor) return // node / no Web Audio — silent no-op
      try {
        ctx = new Ctor()
        void ctx.resume()
        booting = true
        // addModule is async; build the node when it resolves. Any failure
        // (unsupported worklet, blocked module) leaves the engine silent, never thrown.
        void ctx.audioWorklet
          .addModule(POKEY_WORKLET_URL)
          .then(() => {
            if (!ctx) return
            node = new AudioWorkletNode(ctx, 'POKEY')
            node.connect(ctx.destination)
            setAudctl()
          })
          .catch(() => {
            /* worklet unavailable — degrade to silence */
          })
          .finally(() => {
            booting = false
          })
      } catch {
        booting = false
        /* AudioContext construction refused — stay silent */
      }
    },

    play(name: SoundName): void {
      if (!node || !ctx) return
      try {
        const now = ctx.currentTime
        // Expand the lifted table to register writes, order by frame, and schedule
        // each at now + frame/FRAME_HZ. AUDCTL is already set for the run.
        const writes = [...expandSound(SOUNDS[CUE[name]])].sort((a, b) => a.frame - b.frame)
        const events: number[] = []
        for (const w of writes) {
          events.push(w.register, w.value, now + w.frame / FRAME_HZ)
        }
        feed(events)
      } catch {
        /* scheduling failed — swallow, per the no-throw contract */
      }
    },

    startLoop(name: LoopName): void {
      // mc8-2 lifecycle only: track that the drone is meant to be running. Its
      // parametric per-frame sweep (the actual sound) is mc8-3; here start/stop
      // exist so the game-over edge can silence it (audio-dispatch.updateSustainedSounds).
      running.add(name)
    },

    stopLoop(name: LoopName): void {
      running.delete(name)
    },
  }
}
