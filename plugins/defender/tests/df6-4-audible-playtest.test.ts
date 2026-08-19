// tests/df6-4-audible-playtest.test.ts
//
// Story df6-4 — RED phase (Leeloo / TEA). The df6 AUDIBLE PLAYTEST capstone, the EARS
// for df6 the exact way df5-7 (`df5-7-visual-playtest.test.ts`) is the EYES for df5.
// df5-7 proved the whole df5 game loop reaches the FRAME the player screenshots; df6-4
// proves the whole df6 game loop reaches the ENGINE the player hears — the one line
// `main.ts` runs every play tick:
//
//     playEventSounds(audio, session.sim.cues)                       (main.ts:144)
//
// ─── WHY A MECHANISED BACKSTOP, AND WHAT IT DOES *NOT* REPLACE ─────────────────────
// The story's headline acceptance (AC1/AC2) is a LIVE run: at http://127.0.0.1:5270/
// defender/ , the Playwright NETWORK log shows every SOUNDS `.wav` FETCHED 200 when its
// event fires — because @shared/audio degrades SILENTLY on a 404 (Decision B), a green
// vitest can NEVER prove the sound actually loaded. That live network-log playtest is
// the controller's deliverable, recorded in the session (the df5-7 precedent: "the eyes
// … rendered via composeFrame, confirmed by eye"). This file is its mechanised twin: it
// proves — deterministically, in CI — that the SEAM composes end to end, so that when the
// live 200 is green the sound the player hears is the sound the moment demands. The two
// are complementary: this locks the WIRING; the live curl/network-log proves the BYTES.
//
// ─── WHY THIS IS (LARGELY) A LOCK, NOT A RED ──────────────────────────────────────
// Unlike df5-7 — which had to PULL render code into composeFrame — df6's seam was built
// whole across df6-1/df6-2/df6-3: core/events.ts emits, shell/audio-dispatch.ts routes,
// main.ts drains, @shared/audio sounds. df6-1-audio-emission proves each cue is EMITTED
// from the sim; df6-1-audio-dispatch proves each kind ROUTES to a verb. NEITHER drives
// the real sim and feeds `sim.cues` through `playEventSounds` into a recording engine —
// the COMPOSITION main.ts performs. That composition, the Decision-D audio↔visual
// coupling, and the audible DIFFER-from-control are this file's new, unduplicated ground.
//
// The engine @shared/audio builds is INERT in a headless test (no WebAudio → ready()
// false, play()/startLoop() are silent no-ops), so — exactly as df5-7 read composeFrame
// rather than a canvas — this drives the real `playEventSounds` into a RECORDING FAKE
// that captures the { verb, name } main.ts's real engine would have received. The fake is
// a `Pick<AudioEngine,'play'|'startLoop'|'stopLoop'>`, so a change to that slice reddens
// here.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import type { AudioEngine, SoundName } from '../src/shell/audio.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts — core takes them as args (df5-7 re-declares locally)
const LOGICAL_HEIGHT = 240

const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

/** Deterministic byte source (LCG) — the df3-6/df5-8/df6-1 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

// ─── The recording engine: main.ts's real @shared/audio, minus the WebAudio ──────────
type Rung = { readonly verb: 'play' | 'startLoop' | 'stopLoop'; readonly name: SoundName }

interface RecordingEngine {
  readonly slice: Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>
  readonly rung: readonly Rung[]
  played(name: SoundName): boolean
  looped(name: SoundName): boolean
  stopped(name: SoundName): boolean
}

/** A fake that records exactly what `playEventSounds` would have driven on the live engine. */
function recorder(): RecordingEngine {
  const rung: Rung[] = []
  const slice: Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'> = {
    play: (name) => void rung.push({ verb: 'play', name }),
    startLoop: (name) => void rung.push({ verb: 'startLoop', name }),
    stopLoop: (name) => void rung.push({ verb: 'stopLoop', name }),
  }
  return {
    slice,
    rung,
    played: (name) => rung.some((r) => r.verb === 'play' && r.name === name),
    looped: (name) => rung.some((r) => r.verb === 'startLoop' && r.name === name),
    stopped: (name) => rung.some((r) => r.verb === 'stopLoop' && r.name === name),
  }
}

// ─── The rig: stage the moments the running wave never brings, using the sim's OWN banks ─
// The df6-1-audio-emission vocabulary — cast to a mutable surface so a placement uses the
// real spawners/kill paths and a wiring regression in the true emit path is what reddens.
interface RigEnemy { x: number; y: number; alive: boolean }
interface Rig {
  _enemyBank: { landers: RigEnemy[]; spawnLander: (x: number) => RigEnemy | null }
  _ufoBank: { spawnUfo: (x: number, y: number) => unknown }
  _rt: { player: { x: number; y: number } }
}
const rig = (s: SimState): Rig => s as unknown as Rig

/**
 * Drive the real sim like main.ts's play loop and return the engine it fed. `setup`
 * mutates the fresh, once-stepped sim (so the opening wave is populated); each tick's
 * `sim.cues` are drained through the REAL `playEventSounds` into the recorder — the exact
 * composition at main.ts:144, nothing re-implemented.
 */
function playtest(seed: number, ticks: number, input: (i: number) => Input, setup?: (r: Rig) => void): RecordingEngine {
  const eng = recorder()
  let s = createSim(makeRand(seed))
  s = stepSim(s, NEUTRAL) // the opening tick: spawn wave 1 + the ground population
  playEventSounds(eng.slice, s.cues)
  if (setup) setup(rig(s))
  for (let i = 0; i < ticks; i++) {
    s = stepSim(s, input(i))
    playEventSounds(eng.slice, s.cues)
  }
  return eng
}

/** Stand a row of landers across the field ahead of the ship and hold FIRE — the df6-1
 *  fireWall shape, narrowed to landers. `spawnLander` takes only x (the bank fixes the
 *  spawn row), so this is one lander per column; the swept laser strikes them over the run. */
function landerWall(r: Rig): void {
  for (let col = 10; col <= 36; col += 2) r._enemyBank.spawnLander(col << 8) // pt1-18: on-screen firing band (col<<8 < 9600 window)
}

// ─── 1. The whole df6 loop reaches the ENGINE — laser / hit / explosion (AC1) ─────────
describe('df6-4 — the play loop SOUNDS on its moments: laser, enemy hit, explosion (AC1)', () => {
  it('holding fire into a lander wall makes the engine hear laserFire AND landerHit', () => {
    // The exact main.ts composition: real stepSim cues → playEventSounds → the engine. If
    // either half regresses (the sim stops emitting, or the dispatch stops routing) the
    // engine hears nothing and this reddens — the audible analogue of df5-7's "escalation
    // reaches the pixels".
    const eng = playtest(3, 60, () => withInput({ fire: true }), landerWall)
    expect(eng.played('laserFire'), 'firing sounded no LASSND — the laser cue did not reach the engine').toBe(true)
    expect(eng.played('landerHit'), 'a killed lander sounded no LHSND — the hit cue did not reach the engine').toBe(true)
  })

  it('a baiter materialising on the ship makes the engine hear playerDeath — the big EXPLOSION cue', () => {
    // "Explosion" in Defender's SOUND TABLE is the ship-death PDSND (:667) — the only whole-
    // ship explosion cue; enemy destruction rides its own *-hit cue above. Stage it the df6-1
    // way: a UFO body spawned on the ship pose kills the player through the real collision.
    const eng = playtest(3, 1, () => NEUTRAL, (r) => r._ufoBank.spawnUfo(r._rt.player.x, r._rt.player.y))
    expect(eng.played('playerDeath'), 'a body on the ship sounded no PDSND — the death explosion did not reach the engine').toBe(true)
  })
})

// ─── 2. The THRUST held-loop starts on press, stops on release (df6-2, AC2) ───────────
describe('df6-4 — the thrust loop starts held and stops on release, through the loop seam (df6-2)', () => {
  it('pressing thrust starts the thrust LOOP (never a one-shot play), releasing stops it', () => {
    // press for a stretch, then release — the engine must hear startLoop('thrust') then
    // stopLoop('thrust'), and NEVER play('thrust') (a loop cue must not retrigger as a one-shot).
    const eng = playtest(7, 20, (i) => withInput({ thrust: i < 10 }))
    expect(eng.looped('thrust'), 'holding thrust never started the thrust loop (startLoop)').toBe(true)
    expect(eng.stopped('thrust'), 'releasing thrust never stopped the thrust loop (stopLoop)').toBe(true)
    expect(eng.played('thrust'), 'the thrust loop retriggered as a one-shot play() — it must ring via the loop seam').toBe(false)
  })

  it('HOLDING thrust sounds START exactly once — a held button is not re-read as an edge', () => {
    const eng = playtest(7, 30, () => withInput({ thrust: true }))
    const starts = eng.rung.filter((r) => r.verb === 'startLoop' && r.name === 'thrust').length
    expect(starts, 'a held thrust re-fired startLoop every tick — the loop must start once on the edge').toBe(1)
  })

  it('a run that never thrusts sounds NEITHER thrust edge (the control)', () => {
    const eng = playtest(7, 30, () => NEUTRAL)
    expect(eng.looped('thrust') || eng.stopped('thrust'), 'a still ship sounded a thrust edge it never earned').toBe(false)
  })
})

// ─── 3. Decision D — the smart bomb PLAYS while its VISUAL stays the ADR-0005 safe clear ─
describe('df6-4 — a smart bomb SOUNDS while its visual is the accessibility-safe clear (Decision D)', () => {
  it('firing a smart bomb makes the engine hear smartBomb AND the frame never strobes', () => {
    // The exact Decision-D claim, coupled in ONE test: ADR-0005 substitutes the ROM's whole-
    // frame COM PCRAM invert for a bounded clear (the OWNER has photosensitive epilepsy), but
    // that VISUAL exception does NOT mute the SBSND audio. So: the engine hears play('smartBomb')
    // (audio present), the field actually changed (non-vacuity — else the safety check is empty),
    // and assertNoFullFrameStrobe (fails CLOSED) does NOT throw (visual safe).
    let s = createSim(makeRand(29))
    s = stepSim(s, NEUTRAL) // populate the opening wave to clear
    const eng = recorder()
    const before = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const enemiesBefore = s.landers.length
    expect(enemiesBefore, 'precondition: the opening wave populated a field to clear').toBeGreaterThan(0)

    s = stepSim(s, withInput({ smartBomb: true })) // rising edge → SBSND + clearAllEnemies
    playEventSounds(eng.slice, s.cues)
    const after = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)

    expect(eng.played('smartBomb'), 'the smart bomb was SILENT — Decision D says the safe visual does not mute SBSND').toBe(true)
    expect(s.landers.length, 'the smart bomb cleared no landers — the visual-safety check below would be vacuous').toBeLessThan(enemiesBefore)
    expect(
      () => assertNoFullFrameStrobe(before.data, after.data),
      'the smart bomb rendered a whole-frame strobe — ADR-0005 forbids it (the owner has photosensitive epilepsy)',
    ).not.toThrow()
  })

  it('assertNoFullFrameStrobe has teeth — a raw whole-frame flash DOES trip it (non-vacuity guard)', () => {
    // The guard the safety proof leans on must reject an actual strobe, or "does not throw" proves
    // nothing. A whole-frame white-fill is exactly the ROM invert ADR-0005 neuters.
    const base = composeFrame(stepSim(createSim(makeRand(31)), NEUTRAL), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const strobe = new Uint8Array(base.data.length).fill(0x0f)
    expect(() => assertNoFullFrameStrobe(base.data, strobe), 'the strobe guard let a whole-frame white-fill through').toThrow()
  })
})

// ─── 4. The live seam DIFFERS from a nonsense control (canonical-serve, audio layer) ──
describe('df6-4 — a real session SOUNDS, and it DIFFERS from a do-nothing control (AC1)', () => {
  it('a firing/bombing session drives cues the idle control never does — no fallback that sounds everything or nothing', () => {
    // tests/canonical-serve.test.mjs proves the served /defender/ path DIFFERs from a nonsense
    // control at the HTTP layer; an all-200 sweep proves nothing (the SPA fallback answers 200 to
    // everything). This is its AUDIO analogue: the heard-cue set must be a FUNCTION of play, not a
    // constant. A real session (fire + smart bomb into a wall) sounds cues; a still control sounds
    // none of them — so the seam neither sounds everything (a stuck channel) nor nothing (a dead one).
    const live = playtest(3, 40, (i) => withInput({ fire: true, smartBomb: i === 5 }), landerWall)
    const control = playtest(3, 40, () => NEUTRAL)

    const liveNames = new Set(live.rung.map((r) => r.name))
    const controlNames = new Set(control.rung.map((r) => r.name))
    expect(liveNames.size, 'a whole firing/bombing session sounded NOTHING — the seam is dead').toBeGreaterThan(0)
    expect(liveNames.has('laserFire'), 'the live session never sounded the laser it fired').toBe(true)
    expect(liveNames.has('smartBomb'), 'the live session never sounded the smart bomb it fired').toBe(true)
    expect(controlNames.has('laserFire'), 'the idle control sounded a laser it never fired — the seam sounds regardless of input').toBe(false)
    expect(controlNames.has('smartBomb'), 'the idle control sounded a smart bomb it never fired').toBe(false)
    expect([...liveNames].join('|'), 'the live cue set is byte-identical to the idle control — the seam does not reflect play').not.toBe(
      [...controlNames].join('|'),
    )
  })
})

// ─── 5. The RUNTIME seam the live 200 depends on is present in main.ts ────────────────
describe('df6-4 — main.ts drains sim.cues into the resumed engine, gated to play (the live seam)', () => {
  const mainSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'main.ts'), 'utf8')

  it('main.ts feeds sim.cues to playEventSounds — the composition this file mechanises above', () => {
    // The vitest above drives playEventSounds directly; this guards that main.ts actually performs
    // the same composition at runtime, so the live network-log playtest CAN hear sound. Without this
    // line the seam is built but never called — the exact "built-but-unwired" gap a playtest exists
    // to catch (df5-7 found killShip had no live caller).
    expect(mainSrc, 'main.ts does not drain sim.cues through playEventSounds — the runtime seam is unwired').toMatch(
      /playEventSounds\(\s*audio\s*,\s*session\.sim\.cues\s*\)/,
    )
  })

  it('main.ts resumes the engine on a user gesture — a suspended context sounds nothing', () => {
    // @shared/audio is inert until resume() runs on a gesture (browsers refuse an AudioContext
    // before one). Without this hook every fetch/decode is deferred forever and the live 200 never
    // fires — so the gesture-resume is part of the seam the playtest depends on.
    expect(mainSrc, 'main.ts never resumes the audio engine on a gesture — the context stays suspended and silent').toMatch(
      /audio\.resume\(\)/,
    )
  })

  it('main.ts leaves ATTRACT silent — cues are drained only in the play phase (df6-1)', () => {
    // The attract demo drives the SAME stepSim and emits cues, but the shell must not sound them
    // (df6-1's decision). The drain sits under `phase === 'play'`; the attract branch steps the sim
    // WITHOUT a playEventSounds call. Guard that the drain is play-gated, not global.
    const playIdx = mainSrc.indexOf("phase === 'play'")
    const attractIdx = mainSrc.indexOf("phase === 'attract'")
    const drainIdx = mainSrc.indexOf('playEventSounds(audio')
    expect(playIdx, 'main.ts has no play-phase branch to gate the drain').toBeGreaterThan(-1)
    expect(attractIdx, 'main.ts has no attract-phase branch').toBeGreaterThan(-1)
    expect(drainIdx > playIdx && drainIdx < attractIdx, 'the cue drain is not inside the play branch — attract would sound').toBe(true)
  })
})
