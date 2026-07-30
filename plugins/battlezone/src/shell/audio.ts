// src/shell/audio.ts
//
// Shell-side WebAudio synthesis engine (story bz1-11; skeleton extracted to
// @shared/synth in SH2-18). Battlezone's cabinet mixed POKEY's four voices
// with DISCRETE analog circuits (engine rumble, cannon report, explosion) — unlike
// tempest/star-wars there is no ROM register data to bake into authentic samples, so
// every sound here is runtime SYNTHESIS: oscillators and filtered noise tuned against
// reference recordings and published analyses. No parameter below is asserted as a ROM
// fact — sources are documented in reference/README.md (story sourcing rule). If real
// recordings ever replace synthesis they go to R2 per tempest's convention, never
// committed as binary assets.
//
// SH2-18 — WHAT MOVED AND WHAT DID NOT. The ENGINE SKELETON (the lazy gesture gate,
// the vendor-prefix fallback, the white-noise buffer, voice bookkeeping, and the
// no-throw contract) now comes from `@shared/synth`, which red-baron — this
// cabinet's hardware twin — donated after its rb2-11 review round. Everything BELOW
// the skeleton stays here: the throttle→hum curve, the visitor's warble, the tread
// rattle, the cannon and explosion tunings. Those are battlezone's NUMBERS, and no
// other cabinet needs them.
//
// Note we consume `@shared/synth`, NOT `@shared/audio`: that one is a
// SAMPLE (.wav) buffer player and cannot host oscillator synthesis. The two are
// siblings, not alternatives.
//
// THE NO-THROW CONTRACT IS NEW HERE (SH2-18). This engine previously had none: it did
// not treat a CLOSED context as absent, wrapped no Web Audio call in a try/catch, and
// left `ctx.resume()` un-caught. A browser closing the context out from under the game
// (iOS reclaiming audio, a long-backgrounded tab) therefore threw InvalidStateError
// straight out of `play`/`startLoop`/`setEngine` — and because those run inside
// main.ts's frame() ABOVE the requestAnimationFrame(frame) re-schedule, that froze
// rendering and input, not merely the sound. `withAudio()` closes that hole: the effect
// runs only against a live context, and anything it throws is swallowed.
//
// This is IO (shell), not simulation (core): the pure core emits `GameEvent` DATA and
// never imports this module — core/ must stay free of Web Audio (the bz1-11 swept AC).
import {
  createSynthEngine,
  noiseBuffer,
  type SynthTarget,
  type Voice,
} from '@shared/synth'

/**
 * One-shot cues. `cannon`/`explosion` are the discrete analog circuits (no
 * ROM data — approximated to recordings, see the file banner). The other
 * five are POKEY-DRIVEN sequences with real ROM byte tables (BZSOUN.MAC) —
 * story bz3-10, cluster C10 (U-008/009/010/012/014) — so their DURATION is a
 * genuine ROM fact; see `cueEnvelope` below.
 */
export type SoundName = 'cannon' | 'explosion' | 'warng' | 'rbeep' | 'boing' | 'boner' | 'disint'

/** Sustained cues — running until stopped. `saucer` is the visitor's warble
 *  (POKEY-voice style); `track` is the hostile's tread rattle. */
export type LoopName = 'saucer' | 'track'

export interface AudioEngine {
  /** Build (once) and unlock the context. Idempotent — wire it to any gesture. */
  resume(): void
  /** Fire a one-shot cue. Silent no-op before the gesture gate opens. */
  play(name: SoundName): void
  /** Start a sustained cue. Harmless when already running or pre-gate. */
  startLoop(name: LoopName): void
  /** Stop a sustained cue. Harmless when not running or pre-gate. */
  stopLoop(name: LoopName): void
  /** Drive the continuous engine hum from the tread throttle, every frame. */
  setEngine(throttle: number): void
  /**
   * ACTUALLY silence the hum (review round 1). `setEngine(0)` is the audible
   * in-run idle by design — outside a live run the hum must go to a real 0.
   * Idempotent; harmless pre-gate or before any hum exists; a later
   * `setEngine` revives the hum at the correct params.
   */
  stopEngine(): void
}

/**
 * The PURE throttle→hum mapping, exported so the knob curve is testable with
 * no context at all. A low rumble whose pitch and weight rise with tread
 * effort: 40 Hz at idle (the tank never falls silent — the cabinet's engine
 * circuit free-runs) up to 120 Hz flat out; gain 0.12 → 0.30. APPROXIMATION
 * tuned against cabinet footage, not a ROM fact (see reference/README.md).
 */
export function engineParams(throttle: number): { frequency: number; gain: number } {
  const t = throttle < 0 ? 0 : throttle > 1 ? 1 : throttle
  return { frequency: 40 + 80 * t, gain: 0.12 + 0.18 * t }
}

// ─── the five POKEY cue envelopes — story bz3-10 (cluster C10) ───────────────
//
// A ROM record is STVAL/FRCNT/CHANGE/NUMBER (BZSOUN.MAC:62-65). Duration per
// record is NUMBER x FRCNT sound-frames — NOT (NUMBER+1) x FRCNT (review
// round 2: the RED-phase draft over-counted by a whole extra FRCNT-frame per
// record). Proof: MODSND, the sound-continue engine (BZSOUN.MAC:301-348),
// walks NUMBER FRCNT-frame holds per record, then falls straight into the
// NEXT record's own STVAL — no extra hold tacked on. The file's own EX2
// (BZSOUN.MAC:79, `0,45,0,1`) confirms it: NUMBER=1, FRCNT=0x45=69,
// documented to play ~0x46=70 frames ≈ FRCNT, NOT 2×FRCNT. One sound-frame is
// one NMI = 4 ms (250 Hz) — NOT the 15.625 Hz game frame (that timebase would
// inflate every duration ~16x). Duration per cue = Σ (NUMBER x FRCNT) / 250.
//
// This is a PER-RECORD formula, so a multi-record cue is corrected once per
// record, not once total: MODSND preempts EACH record's final conceptual value
// (the (NUMBER+1)th) the instant COUNT hits 0, falling straight into the next
// record's STVAL with no extra FRCNT hold — so every record loses exactly one
// FRCNT-frame vs the naive (NUMBER+1) count. That is why the FRCNT=1 cues DO
// move: BOING (WP1, 10 records) is 10 frames = 40 ms shorter (496 → 456 ms) and
// DISINT (DS1, 2 records) is 2 frames = 8 ms shorter (104 → 96 ms). bz4-4 lands
// both at Σ NUMBER×FRCNT.

/** WG3 BZSOUN.MAC:167-169  40,2,-1,18  ×3 records = 3×(24 vals×2 fr) = 144 fr → 576 ms. */
const WARNG_DURATION_SEC = 0.576
/** BE3 BZSOUN.MAC:175  23,10,0,1 = 1 val×16 fr = 16 fr → 64 ms. */
const RBEEP_DURATION_SEC = 0.064
/** WP1 BZSOUN.MAC:187-196  0C0,1,0F6,6 + 9 records = 6 + 9×12 = 114 fr → 456 ms
 *  by Σ NUMBER×FRCNT (all 10 records FRCNT=1). The old 496 ms counted the
 *  (NUMBER+1)th conceptual value of every record — 10 records, +10 fr, +40 ms —
 *  which MODSND preempts (bz4-4). */
const BOING_DURATION_SEC = 0.456
/** BO3 BZSOUN.MAC:204  10,70,0,2 = 2 vals×112 fr = 224 fr → 896 ms. */
const BONER_DURATION_SEC = 0.896
/** DS1 BZSOUN.MAC:217-218  30,1,0FC,0C  ×2 = 2×(12 vals×1 fr) = 24 fr → 96 ms
 *  by Σ NUMBER×FRCNT. bz4-4 ruling: 96 ms is source-correct; the old 104 ms
 *  (U-014's refuter DS1 decode) counted NUMBER+1 = 13 vals/record — MODSND
 *  preempts the 13th, so each record sounds only 12 (2 records, +2 fr, +8 ms). */
const DISINT_DURATION_SEC = 0.096

/** A cue's envelope timing — the ROM fact this story pins. */
export interface CueEnvelope {
  /** Total envelope length in seconds, decoded per the header above. */
  readonly durationSec: number
}

/**
 * The PURE ROM envelope descriptor for the five POKEY cues, exported so the
 * duration is testable with no context at all (the `engineParams` habit).
 * Undefined for `cannon`/`explosion` — those are discrete analog circuits
 * with no ROM byte table to decode. `play()` below schedules every cue's
 * synthesis from this SAME descriptor, so the two can never drift apart.
 */
export function cueEnvelope(name: SoundName): CueEnvelope | undefined {
  switch (name) {
    case 'warng':
      return { durationSec: WARNG_DURATION_SEC }
    case 'rbeep':
      return { durationSec: RBEEP_DURATION_SEC }
    case 'boing':
      return { durationSec: BOING_DURATION_SEC }
    case 'boner':
      return { durationSec: BONER_DURATION_SEC }
    case 'disint':
      return { durationSec: DISINT_DURATION_SEC }
    default:
      return undefined
  }
}

// ─── battlezone's NUMBERS: the instruments, not the engine ───────────────────

/**
 * A filtered noise burst — the shared skeleton of the cannon report and
 * the explosion: noise → lowpass → decaying gain → master.
 *
 * The CHAIN is common, but the ENVELOPE is not: this one decays exponentially,
 * where red-baron's walks a ROM level table step by step. That difference is
 * precisely why the burst stays local and only `noiseBuffer` is shared.
 */
function noiseBurst(
  context: AudioContext,
  out: GainNode,
  seconds: number,
  cutoffHz: number,
  peak: number,
): void {
  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context, seconds)

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoffHz, context.currentTime)

  const envelope = context.createGain()
  envelope.gain.setValueAtTime(peak, context.currentTime)
  envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds)

  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(out)
  source.start()
  source.stop(context.currentTime + seconds)
}

/**
 * WARNG — the enemy-in-range alarm: a tonal oscillator repeating a fast
 * descending sweep three times (the ROM's WG3 table is three warble passes),
 * scheduled to last exactly `cueEnvelope('warng').durationSec` so the
 * descriptor and the real sound cannot drift apart.
 */
function warngCue(context: AudioContext, out: GainNode): void {
  const t0 = context.currentTime
  const dur = WARNG_DURATION_SEC
  const passes = 3
  const passDur = dur / passes

  const osc = context.createOscillator()
  osc.type = 'sawtooth'
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.3, t0)
  for (let i = 0; i < passes; i++) {
    const start = t0 + i * passDur
    osc.frequency.setValueAtTime(900, start)
    osc.frequency.linearRampToValueAtTime(350, start + passDur)
  }
  gain.gain.setValueAtTime(0.0001, t0 + dur)

  osc.connect(gain)
  gain.connect(out)
  osc.start(t0)
  osc.stop(t0 + dur)
}

/**
 * RBEEP — the radar-sweep tick: one short, STEADY tone (the ROM's BE3 table
 * has CHANGE=0, no pitch movement), lasting `cueEnvelope('rbeep').durationSec`.
 */
function rbeepCue(context: AudioContext, out: GainNode): void {
  const t0 = context.currentTime
  const dur = RBEEP_DURATION_SEC

  const osc = context.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(1200, t0)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.3, t0)
  gain.gain.setValueAtTime(0.0001, t0 + dur)

  osc.connect(gain)
  gain.connect(out)
  osc.start(t0)
  osc.stop(t0 + dur)
}

/**
 * BOING — the obstacle-bump one-shot: a damped pitch bounce (the ROM's WP1
 * table cascades down then settles), lasting `cueEnvelope('boing').durationSec`.
 */
function boingCue(context: AudioContext, out: GainNode): void {
  const t0 = context.currentTime
  const dur = BOING_DURATION_SEC

  const osc = context.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(500, t0)
  osc.frequency.exponentialRampToValueAtTime(120, t0 + dur * 0.6)
  osc.frequency.exponentialRampToValueAtTime(200, t0 + dur)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.35, t0)
  gain.gain.setValueAtTime(0.0001, t0 + dur)

  osc.connect(gain)
  gain.connect(out)
  osc.start(t0)
  osc.stop(t0 + dur)
}

/**
 * BONER — the bonus-tank bell: a STEADY tone with a slow volume tremolo (the
 * "bong" — the ROM's BO4 control tail alternates two levels, not a pitch
 * move), lasting `cueEnvelope('boner').durationSec`.
 */
function bonerCue(context: AudioContext, out: GainNode): void {
  const t0 = context.currentTime
  const dur = BONER_DURATION_SEC

  const osc = context.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(660, t0)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.25, t0)

  const tremolo = context.createOscillator()
  tremolo.frequency.setValueAtTime(5, t0)
  const tremoloDepth = context.createGain()
  tremoloDepth.gain.setValueAtTime(0.15, t0)
  tremolo.connect(tremoloDepth)
  tremoloDepth.connect(gain.gain)

  gain.gain.setValueAtTime(0.0001, t0 + dur)

  osc.connect(gain)
  gain.connect(out)
  osc.start(t0)
  tremolo.start(t0)
  osc.stop(t0 + dur)
  tremolo.stop(t0 + dur)
}

/**
 * DISINT — the saucer-kill zap, layered over the generic explosion (U-014):
 * a very fast descending sweep, distinct from every other cue's shape,
 * lasting `cueEnvelope('disint').durationSec`.
 */
function disintCue(context: AudioContext, out: GainNode): void {
  const t0 = context.currentTime
  const dur = DISINT_DURATION_SEC

  const osc = context.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(1800, t0)
  osc.frequency.exponentialRampToValueAtTime(200, t0 + dur)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.4, t0)
  gain.gain.setValueAtTime(0.0001, t0 + dur)

  osc.connect(gain)
  gain.connect(out)
  osc.start(t0)
  osc.stop(t0 + dur)
}

/** The visitor's warble: a mid tone whose pitch wobbles via an LFO. */
function saucerVoice({ context, out }: SynthTarget): Voice {
  const carrier = context.createOscillator()
  carrier.type = 'triangle'
  carrier.frequency.setValueAtTime(620, context.currentTime)

  const lfo = context.createOscillator()
  lfo.frequency.setValueAtTime(6, context.currentTime)
  const depth = context.createGain()
  depth.gain.setValueAtTime(180, context.currentTime)
  lfo.connect(depth)
  depth.connect(carrier.frequency)

  const level = context.createGain()
  level.gain.setValueAtTime(0.08, context.currentTime)
  carrier.connect(level)
  level.connect(out)
  carrier.start()
  lfo.start()

  return {
    stop: () => {
      carrier.stop()
      lfo.stop()
      level.disconnect()
    },
  }
}

/** The hostile's tread rattle: a slow-pulsed low square. */
function trackVoice({ context, out }: SynthTarget): Voice {
  const rumble = context.createOscillator()
  rumble.type = 'square'
  rumble.frequency.setValueAtTime(55, context.currentTime)

  // The pulse: an LFO chopping the rattle's level at tread cadence.
  const chop = context.createOscillator()
  chop.frequency.setValueAtTime(9, context.currentTime)
  const chopDepth = context.createGain()
  chopDepth.gain.setValueAtTime(0.03, context.currentTime)
  chop.connect(chopDepth)

  const level = context.createGain()
  level.gain.setValueAtTime(0.05, context.currentTime)
  chopDepth.connect(level.gain)
  rumble.connect(level)
  level.connect(out)
  rumble.start()
  chop.start()

  return {
    stop: () => {
      rumble.stop()
      chop.stop()
      level.disconnect()
    },
  }
}

// ─── the cabinet, wired onto the shared skeleton ─────────────────────────────

export function createAudioEngine(): AudioEngine {
  // The skeleton owns the context, the master bus and the sustained-voice registry.
  const synth = createSynthEngine<LoopName>()

  // The engine hum is a persistent, engine-owned voice (SH2-22): its oscillator free-runs
  // for the life of the cabinet and its GAIN is the on/off switch (cheaper than tearing the
  // voice down; a later setEngine revives it instantly). Held as a persistentVoice HANDLE,
  // never as a raw node — so when the browser closes the context and the engine builds a
  // replacement, the engine rebuilds this controller automatically. There is no `humOsc`
  // ref to survive a recovery still pointing at the DEAD context, and nothing to reset by
  // hand: the half-recovery trap (the tank runs silent while the loops come back — review
  // round 2) is structurally unreachable now.
  const hum = synth.persistentVoice(({ context, out }) => {
    const osc = context.createOscillator()
    osc.type = 'sawtooth'
    const gain = context.createGain()
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    return { osc, gain, context }
  })

  return {
    resume(): void {
      synth.resume()
    },

    play(name: SoundName): void {
      synth.withAudio(({ context, out }) => {
        switch (name) {
          case 'cannon':
            // The report: a sharp, bright crack — short burst, open filter.
            noiseBurst(context, out, 0.18, 2200, 0.9)
            return
          case 'explosion':
            // The blast: longer, darker, heavier.
            noiseBurst(context, out, 0.9, 700, 1.0)
            return
          // bz3-10 — the five POKEY cues. Each is a TONAL oscillator (never
          // the noise-burst chain above) scheduled from the SAME duration
          // `cueEnvelope` reports, so descriptor and sound cannot drift.
          case 'warng':
            warngCue(context, out)
            return
          case 'rbeep':
            rbeepCue(context, out)
            return
          case 'boing':
            boingCue(context, out)
            return
          case 'boner':
            bonerCue(context, out)
            return
          case 'disint':
            disintCue(context, out)
            return
          default: {
            // Exhaustiveness guard (audio-dispatch.ts pattern): a new
            // SoundName without a case becomes a COMPILE error.
            const _exhaustive: never = name
            void _exhaustive
          }
        }
      })
    },

    startLoop(name: LoopName): void {
      // Idempotent in the skeleton: a repeat start on a running loop builds nothing.
      synth.startVoice(name, name === 'saucer' ? saucerVoice : trackVoice)
    },

    stopLoop(name: LoopName): void {
      synth.stopVoice(name)
    },

    setEngine(throttle: number): void {
      hum.control(({ osc, gain, context }) => {
        const p = engineParams(throttle)
        osc.frequency.setValueAtTime(p.frequency, context.currentTime)
        gain.gain.setValueAtTime(p.gain, context.currentTime)
      })
    },

    stopEngine(): void {
      // The oscillator keeps running at zero gain — cheaper than tearing the voice down,
      // and the next setEngine revives it with fresh params. (control() builds the hum
      // lazily if it was never started, then silences it — a silent no-op either way.)
      hum.control(({ gain, context }) => {
        gain.gain.setValueAtTime(0, context.currentTime)
      })
    },
  }
}
