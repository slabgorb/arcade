// tests/plane-fire-wiring.test.ts
//
// Story uf1-1 — RED phase (Leeloo / TEA). ENEMY PLANES CAN SHOOT THE PILOT.
//
// The pure fire DECISION (planeFires / planeFireChance — the PLNLVL level gate and
// the ÷2 FRAME cadence, R2BRON.MAC:4798-4807 & 2345-2355) is already ported and
// exhaustively covered by tests/core/enemy-fire.test.ts (rb2-7). But that decision
// has ZERO production callers: main.ts:638 says so in plain English —
//   "…plane fire (planeFires) is not yet wired into the shell loop, so it stays
//    silent for now."
// so the game's central threat does not exist and the pilot is IMMORTAL to gunfire.
//
// This file drives THE REAL COCKPIT (tests/helpers/boot-cockpit.ts — the rb4-4
// pattern: boot src/main.ts against a fake DOM and run the real accumulator/calc
// frames), watching only what the player HEARS. No import scans, no regex — the
// rb4-1 lesson. A crash the pilot hears is a life the wiring cost him.
//
// ISOLATION — plane fire must be the ONLY damage source these runs can produce, so a
// crash is unambiguous proof the PLANE wiring landed (and nothing else). main.ts has
// exactly three player-hit sites (findings §6B): the returning ace (main.ts:563), the
// blimp's gun (:756), and a ground collision (:608). We mute the first two by module
// tap and keep every run inside the OPENING PLANE WAVE (sky, pre-floor) where the
// third cannot fire — the probe that calibrated this file measured 0 crashes of ANY
// kind across 600 hands-off calc frames on four seeds with these mutes in place, so
// the RED baseline is a genuine "the sky never shoots back", not a lucky seed.
//
// THE LEVEL LEVER. Plane fire is gated: planeFireChance is 0 below level 4, 0.5 at 4,
// 1 above (rb2-7). Level = gmlevlForKills(kills), and reaching level 4 needs 22 kills
// (PLNLVL index 11) — unreachable hands-off in a bounded run. So `gmlevlForKills` is
// tapped to a controllable value (ctl.forceLevel): forced to 5 (always-fire) to prove
// the wiring lands, and left REAL (level 0 at zero kills) to prove the gate holds end
// to end. Everything else in scoring passes through untouched.

import { describe, it, expect, vi, afterAll } from 'vitest'
import { bootCockpit } from './helpers/boot-cockpit'

// ── control + recorder, hoisted so the module taps below can close over it ──────
const ctl = vi.hoisted(() => ({
  frame: 0,
  /** null → the real gmlevlForKills; a number → force that GMLEVL (the level lever). */
  forceLevel: null as number | null,
  plays: [] as Array<{ frame: number; sound: string }>,
  tones: [] as Array<{ frame: number; tone: string }>,
  gunOn: [] as number[], // calc frames on which setGun(true) was called (the SN-017 rattle)
  reset(): void {
    this.frame = 0
    this.plays = []
    this.tones = []
    this.gunOn = []
  },
}))

// Tap the audio engine — the pilot's ears. play('crash') is a life lost (player-hit,
// audio-dispatch.ts:56-57); setGun(true) is the enemy gun rattling (the SN-017 cue,
// audio-dispatch.ts:90, enemyFiring); playTone('WP') is a wave announced.
vi.mock('../src/shell/audio', () => ({
  createAudioEngine: () => ({
    resume: () => {},
    play: (name: string) => ctl.plays.push({ frame: ctl.frame, sound: name }),
    playTone: (tone: string) => ctl.tones.push({ frame: ctl.frame, tone }),
    setEngine: () => {},
    setGun: (on: boolean) => {
      if (on) ctl.gunOn.push(ctl.frame)
    },
    setApproach: () => {},
  }),
}))

// The level lever: force GMLEVL when ctl.forceLevel is set, else the real ramp.
vi.mock('../src/core/scoring', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/scoring')>()
  return {
    ...actual,
    gmlevlForKills: (kills: number) => (ctl.forceLevel === null ? actual.gmlevlForKills(kills) : ctl.forceLevel),
  }
})

// Mute the returning ace: it never arms (closesPast→false) and never lands a hit
// (evadeCheck→'evaded'). It is the OTHER enemy→player damage channel (main.ts:563).
vi.mock('../src/core/returning-ace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/returning-ace')>()
  return {
    ...actual,
    closesPast: () => false,
    evadeCheck: (ace: unknown) => ({ ace, result: 'evaded' }),
  }
})

// Mute the blimp's gun: it may still cruise, but it never shoots (main.ts:756).
vi.mock('../src/core/blimp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/blimp')>()
  return { ...actual, blimpFires: () => false }
})

afterAll(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const SEED = 12345
const WINDOW = 600 // calc frames — inside the opening plane wave (probe-verified clean)

interface RunResult {
  crashes: number[]
  gunOn: number[]
  waveAnnounced: boolean
}

/** Boot the real cockpit HANDS-OFF at a chosen forced level and run WINDOW calc frames. */
async function flyHandsOff(seed: number, level: number | null, frames = WINDOW): Promise<RunResult> {
  ctl.reset()
  ctl.forceLevel = level
  const cockpit = await bootCockpit(1600, 900, seed)
  for (let f = 1; f <= frames; f++) {
    ctl.frame = f
    cockpit.tick() // no keys held — the pilot's own gun is silent, so any setGun(true) is the enemy's
  }
  return {
    crashes: ctl.plays.filter((p) => p.sound === 'crash').map((p) => p.frame),
    gunOn: [...ctl.gunOn],
    waveAnnounced: ctl.tones.some((t) => t.tone === 'WP'),
  }
}

// ═══ AC-2 / AC-5 — plane fire reaches the REAL loseLife damage channel ═════════
describe('uf1-1: a plane\'s fire costs the pilot a life (AC-2, AC-5 — the wiring, non-vacuous)', () => {
  it('the sky shoots back: a level-5 wave lands a hit and the pilot hears the CRSHSN crash', async () => {
    // RED TODAY: planeFires has no caller, so no plane-fire crash exists — this fails.
    // GREEN once wired: level 5 grants every plane the shoot bit (chance 1), the ÷2
    // cadence fires it every other frame, and a connecting per-shot roll opens the
    // rb2-9 loseLife channel → events.push({type:'player-hit'}) → play('crash').
    //
    // NON-VACUOUS BY MUTATION (AC-5): the ace and the blimp's gun are muted and the
    // window is the opening plane wave, so a 'crash' here can ONLY be plane fire. A Dev
    // who wires planeFires to the gun cue but forgets the damage channel — or deletes
    // the call site — produces zero crashes and this reddens. It asserts PLAYER DAMAGE,
    // not merely that planeFires returns true.
    const run = await flyHandsOff(SEED, 5)
    expect(
      run.crashes.length,
      `no plane-fire crash in ${WINDOW} calc frames at level 5 — the pilot is still immortal to gunfire`,
    ).toBeGreaterThanOrEqual(1)
  }, 60000)
})

// ═══ AC-1 — the fire roll is drawn from a SEEDED Rng, so a seed replays ════════
describe('uf1-1: the plane-fire pattern is deterministic under a fixed seed (AC-1)', () => {
  it('the same seed reproduces the SAME plane-fire crashes — a seeded Rng, not Math.random', async () => {
    // The roll must come from a seeded stream (like blimpRng/aceRng), so the ?seed=
    // replay the rest of epic rb4 relies on still holds. Two identical boots must agree.
    // RED TODAY: both runs crash zero times, so the "≥1" staging assertion fails (there
    // is no fire pattern to replay yet). GREEN once wired: identical, non-empty frames.
    // A Math.random() implementation would diverge run-to-run and redden this forever.
    const a = await flyHandsOff(SEED, 5)
    const b = await flyHandsOff(SEED, 5)
    expect(a.crashes.length, 'the wiring produced no fire to replay — see the AC-2 test').toBeGreaterThanOrEqual(1)
    expect(b.crashes, 'the same seed produced a DIFFERENT plane-fire pattern — the roll is not seeded').toEqual(a.crashes)
  }, 90000)
})

// ═══ AC-3 — a firing plane latches enemyFiring for the SN-017 gun cue ══════════
describe('uf1-1: a firing plane rattles the SN-017 gun cue (AC-3)', () => {
  it('setGun(true) fires while the pilot holds NOTHING — the rattle is the enemy\'s shell', async () => {
    // rb4-10 / SN-017: every shell — the enemy's included — bumps the shared gun
    // counter (main.ts:635-639). enemyFiring feeds setGun(playing && (gunFiring ||
    // enemyFiring)) (audio-dispatch.ts:90). Hands-off, gunFiring is false, the blimp is
    // muted — so a setGun(true) can ONLY be a plane latching enemyFiring on a fire-frame.
    // RED TODAY: enemyFiring is never set for planes, so setGun stays false all window.
    const run = await flyHandsOff(SEED, 5)
    expect(
      run.gunOn.length,
      'the enemy gun never rattled — a firing plane must latch enemyFiring (SN-017)',
    ).toBeGreaterThanOrEqual(1)
  }, 60000)
})

// ═══ AC-4 — the level gate holds END TO END in the running game ════════════════
describe('uf1-1: the PLNLVL level gate holds in the wired game (AC-4)', () => {
  it('a real level-0 game NEVER lets a plane shoot — no crash, no enemy gun rattle', async () => {
    // rb2-7 covers the gate on the pure decision; this proves it survives the WIRING:
    // at the real ramp (zero kills → level 0, below the level-4 grant) the sky must stay
    // a turkey shoot. This is a KEEP-BEHAVIOR guard — green today AND after wiring — that
    // catches a Dev who wires plane fire UNGATED (firing at every level).
    const run = await flyHandsOff(SEED, null)
    // Non-vacuity: planes really are up this window — a wave was announced (WP). Without
    // this a level-0 "no fire" could pass on an empty sky and prove nothing.
    expect(run.waveAnnounced, 'no wave was announced — the level-0 gate run was vacuous (no planes present)').toBe(true)
    expect(run.crashes, `a level-0 plane shot the pilot — the level-4 fire gate was not preserved`).toHaveLength(0)
    expect(run.gunOn, 'a level-0 plane rattled the enemy gun — the fire gate leaked below level 4').toHaveLength(0)
  }, 60000)
})
