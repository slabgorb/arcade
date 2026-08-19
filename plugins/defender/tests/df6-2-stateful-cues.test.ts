// tests/df6-2-stateful-cues.test.ts
//
// Story df6-2 — RED phase (O'Brien / TEA). The cross-cutting halves of the two stateful
// cues: AC3 (purity + df3 seeded-determinism replay still reproduces bit-for-bit with the
// thrust loop and the lander-suck live) and the AC4 guards that span both cues — the loop
// manifest entries, the thrust on/off citation under the df1-1 gate, and the standing "no
// .wav is committed, Defender is wired-but-silent when this story closes" invariant.
//
// AC3 is the one a stateful cue is most likely to quietly break: an edge detector that
// reaches for a clock, ambient entropy, or Map/Set ITERATION ORDER would replay
// differently on the second run. The determinism group drives a script that exercises BOTH
// new states — thrust toggling AND a staged abduction that starts then ends — and asserts
// two same-seed runs produce a byte-identical cue stream, a different seed diverges, and
// the stream actually CONTAINS the new stateful kinds (determinism of an empty stream is
// vacuous). purity.test.ts already scans src/core for the DOM/clock/entropy bans, so the
// "pure data on the sim state" half of AC3 is enforced there and not re-derived here.
//
// Written RED (the loop SOUNDS/CHANNELS entries, the thrust claims, and the stateful kinds
// were all absent); GREEN now lands them. The `string` widenings survive where noted.

import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { SOUNDS, CHANNELS } from '../src/shell/audio.js'
import { loadClaims, coveredBy, type ProseCitation } from './audit/dossier-sweep'

// Read directly — `thrust`/`landerSuck` are real SoundNames now, so no widening is needed.
const sounds = SOUNDS
const channels = CHANNELS
const claims = loadClaims()
const cite = (file: string, line: number): ProseCitation => ({
  file,
  start: line,
  end: line,
  raw: `defender/${file}:${line}`,
  from: 'df6-2-stateful-cues.test.ts',
})

// ─── driving the sim ────────────────────────────────────────────────────────────────
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

// The stateful kinds this story adds (widened; the run must actually reach them).
const STATEFUL_KINDS = ['thrust-start', 'thrust-stop', 'lander-suck-start', 'lander-suck-stop']

interface RigLander {
  x: number
  y: number
  alive: boolean
  carrying: boolean
  reachedTop: boolean
  phase: string
  target: unknown
}
interface RigHumanoid {
  x: number
  y: number
  alive: boolean
  state: string
}
interface Rig {
  _enemyBank: {
    spawnLander: (x: number) => RigLander | null
    spawnHumanoid: (x: number, y: number) => RigHumanoid | null
    killLander: (l: RigLander) => void
  }
}
const rig = (s: SimState): Rig => s as unknown as Rig

/**
 * A fully-scripted run that drives BOTH new states deterministically: `thrustOf(i)`
 * chooses the thrust level each tick (a stream of press/release edges), and a carrier is
 * staged at tick 3 and killed at tick 12 (a suck start and a suck stop). Returns the whole
 * cue stream — every kind, in tick order. Same seed + same script must reproduce it
 * exactly. The thrust predicate is a parameter so a control can prove the stream REFLECTS
 * its input (a no-thrust run lacks the thrust cues a toggling one has) rather than being a
 * constant — the staged df6-1 cues in this short window are seed-independent, so a
 * seed-vs-seed control would be vacuous.
 */
function cueStream(seed: number, thrustOf: (i: number) => boolean): string[] {
  let s = stepSim(createSim(makeRand(seed)), NEUTRAL)
  const stream: string[] = []
  let carrier: RigLander | null = null
  for (let i = 0; i < 40; i++) {
    if (i === 3) {
      const r = rig(s)
      const l = r._enemyBank.spawnLander(0x4000)
      const h = r._enemyBank.spawnHumanoid(0x4000, 150)
      if (l && h) {
        h.state = 'grabbed'
        h.x = 0x4000
        h.y = 150
        l.carrying = true
        l.reachedTop = false
        l.phase = 'carry'
        l.target = h
        l.x = 0x4000
        l.y = 150
        carrier = l
      }
    }
    if (i === 12 && carrier) rig(s)._enemyBank.killLander(carrier)
    s = stepSim(s, withInput({ thrust: thrustOf(i) }))
    for (const c of s.cues) stream.push(c.type as string)
  }
  return stream
}

const TOGGLING = (i: number): boolean => i % 4 < 2 // press/release every two ticks
const NEVER = (): boolean => false

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 / AC2 — the loop MANIFEST: the two stateful cues name their own samples + channels
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 — the loop cues carry manifest entries (thrust, landerSuck)', () => {
  it('SOUNDS names a distinct .wav for the thrust loop and the lander-suck loop', () => {
    expect(sounds['thrust'], "SOUNDS has no 'thrust' sample").toBeTruthy()
    expect(sounds['landerSuck'], "SOUNDS has no 'landerSuck' sample").toBeTruthy()
    expect(sounds['thrust']?.endsWith('.wav'), 'the thrust sample must be a .wav').toBe(true)
    expect(sounds['landerSuck']?.endsWith('.wav'), 'the lander-suck sample must be a .wav').toBe(true)
    expect(sounds['thrust']).not.toBe(sounds['landerSuck'])
  })

  it('CHANNELS routes each loop cue to a voice', () => {
    expect(channels['thrust'], "CHANNELS has no 'thrust' voice").toBeTruthy()
    expect(channels['landerSuck'], "CHANNELS has no 'landerSuck' voice").toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC3 — df3 seeded-determinism replays bit-for-bit WITH both stateful cues live
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC3 — the cue stream is deterministic with the thrust loop + suck live', () => {
  it('two runs of the same seed + script produce a byte-identical cue stream', () => {
    const a = cueStream(42, TOGGLING)
    const b = cueStream(42, TOGGLING)
    expect(a, 'the stateful edges introduced nondeterminism (a clock, entropy, or Set order?)').toEqual(b)
  })

  it('the stream is NON-VACUOUS — it really exercises both new states', () => {
    // Determinism of an empty stream is trivially true, so this precondition guards the
    // test above: the script must actually emit thrust edges AND the suck start/stop.
    const stream = cueStream(42, TOGGLING)
    for (const kind of STATEFUL_KINDS) {
      expect(stream, `the determinism script never reached '${kind}'`).toContain(kind)
    }
  })

  it('the stream REFLECTS its input — a no-thrust run lacks the thrust cues a toggling one has', () => {
    // The non-triviality control: proves the equality above is not vacuously true because
    // the function returns a constant. A seed-vs-seed control cannot do this job here — the
    // staged df6-1 cues in this short window are seed-independent — so vary the INPUT.
    expect(cueStream(42, TOGGLING), 'toggling thrust must change the stream vs never thrusting').not.toEqual(
      cueStream(42, NEVER),
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC1 / AC4 — the thrust on/off values are CITED to THFLG / SNDSEQ under the df1-1 gate
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC1 — the thrust sound flag + its $16/$0F transitions are byte-pinned', () => {
  it('THFLG is claimed (PHR6.SRC:293) — the held state the loop edges on', () => {
    expect(
      coveredBy(claims, cite('PHR6.SRC', 293)),
      'add a claims/19-sound.json entry pinning PHR6.SRC:293 (THFLG — THRUST SOUND FLAG)',
    ).toBe(true)
  })

  it('the PRESS transition (LDB #$16, DEFA7.SRC:750) is claimed — loop ON', () => {
    expect(
      coveredBy(claims, cite('DEFA7.SRC', 750)),
      'add a claims/19-sound.json entry pinning DEFA7.SRC:750 (LDB #$16 — thrust sound ON)',
    ).toBe(true)
  })

  it('the RELEASE transition (LDB #$0F, DEFA7.SRC:743) is claimed — loop OFF', () => {
    expect(
      coveredBy(claims, cite('DEFA7.SRC', 743)),
      'add a claims/19-sound.json entry pinning DEFA7.SRC:743 (LDB #$0F — thrust sound OFF)',
    ).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════
// AC4 — Defender is still SILENT: wired but no sample committed (df6-3 bakes them)
// ═══════════════════════════════════════════════════════════════════════════════════

describe('df6-2 AC4 — the loops are wired, the audio is not — no .wav is committed', () => {
  it('no .wav sample exists under the plugin (the seam loops, the sample is df6-3)', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const wavs: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.toLowerCase().endsWith('.wav')) wavs.push(full)
      }
    }
    walk(root)
    expect(wavs, `df6-2 stays silent, but found committed .wav files:\n  ${wavs.join('\n  ')}`).toEqual([])
  })
})
