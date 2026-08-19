// tests/df5-7-visual-playtest.test.ts
//
// Story df5-7 — RED phase (Han Solo / TEA). The df5 VISUAL PLAYTEST capstone, the direct
// mirror of df4-6: df4-6 proved the df4 play-field menagerie (enemies, effects, abduction)
// composes into the LIVE frame the player screenshots at http://127.0.0.1:5270/defender/ .
// df5-7 proves the WHOLE df5 GAME LOOP reaches that same frame:
//
//   1. the SCANNER (df5-1) draws the radar strip — every live object a blip by palette
//      INDEX, and an OFF-CAMERA attacker still appears on it (the whole point of the radar).
//   2. WAVES (df5-2) escalate VISIBLY — a later wave paints more attackers into the frame,
//      not just a higher `wave` counter (df5-8 locked the counter and left the on-screen
//      proof to "the story df5-7 exists to show").
//   3. the score / men HUD (df5-3) renders, and killing an enemy RAISES the on-screen score.
//   4. a SMART BOMB (df5-5) fires as the ACCESSIBILITY-SAFE clear — a freeze/fade that clears
//      the on-screen enemies and NEVER strobes the whole screen (ADR-0005, the ONE exception
//      to ROM-always-wins — the owner has photosensitive epilepsy).
//   5. the game ends (men < 0) and the GAME-OVER / hall-of-fame SCREEN (df5-6) renders.
//   6. the populated df5 frame DIFFERS from a nonsense control (empty frame + static title
//      still) — the render-layer canonical-serve lesson; and every composed cell stays a
//      valid 4-bit palette index.
//
// ─── SCOPE RULING (do-it-right, recorded so a later reader is not confused) ───────────
// df5-6's endgame.ts carried "Decision C": the HUD render AND the game-over screen render
// were deferred to df7 alongside the phase machine. Under this story the OWNER ruled the
// whole loop must actually RENDER now — so df5-7 pulls the HUD render, the scanner strip
// render and the game-over/hall-of-fame SCREEN render into composeFrame. Decision C is
// NARROWED accordingly: only the attract->play->death->game-over phase-MACHINE wiring and
// the 2P alternating handoff (Decision D) remain df7's. df5-6-game-over.test.ts's deferral
// assertion is updated in lock-step (this same RED commit). The persisted hall-of-fame
// TABLE + interactive initials entry stay the SHELL's (input+storage); the pure core here
// renders the GAME OVER / final-score screen from SimState alone.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────────
// scanner.ts / score.ts / powers.ts / endgame.ts are built, pure and green IN ISOLATION,
// but NOTHING wires them into the live sim/scene: `grep scanner|score|powers|endgame
// src/core/sim.ts src/core/scene.ts` is empty. SimState carries no `score`/`men`/`gameOver`;
// composeFrame draws no strip, no HUD, no game-over screen; Input has no `smartBomb`; a kill
// awards no points; nothing ends the game. Every assertion below fails until GREEN wires it.
//
// ─── THE CONTRACT GREEN (Dev) BUILDS ─────────────────────────────────────────────────
//   • SimState gains `score:number`, `men:number` (men===3 fresh), `gameOver:boolean`
//     (false fresh) — refreshed each stepSim from a wired df5-3 ScoreState, exactly as
//     `lasers`/`landers`/`effects`/`wave` refresh.
//   • stepSim AWARDS points (df5-3 addPoints) when the df4-1 COLIDE seam kills an enemy, so
//     `score` rises after a kill.
//   • `killShip(state)` — the public death seam (df5-3 loseMan): decrements `men`, and sets
//     `gameOver` once men<0 (df5-6 isGameOver). The seam the death wiring uses AND the
//     playtest drives deterministically (df4-6 spawnExplosion precedent).
//   • Input gains `smartBomb:boolean`; a smart-bomb tick clears the on-screen enemies
//     (df5-5 clearsType) and enqueues the SAFE presentation (df4-2 policy: classify(
//     'smart-bomb') fade / classify('hyperspace') freeze) — NEVER the ROM COM PCRAM whole-
//     page invert. composeFrame renders it and it passes assertNoFullFrameStrobe.
//   • composeFrame renders the SCANNER strip (df5-1 projectScanner over the live objects,
//     by palette INDEX), the score/men HUD (writeText), and — when gameOver — the GAME OVER
//     / final-score screen. Colour is never invented: every cell stays 0..15.
//
// Loader idiom mirrors df4-6: a variable module specifier keeps `tsc --noEmit` from binding
// this file's observable-subset SimState to the concrete one, and a self-describing throw
// turns a missing export/field into an ABSENT-FEATURE RED.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeStaticFrame } from '../src/core/scene.js'
import { classify, assertNoFullFrameStrobe } from '../src/core/effects.js'
import { wrap16 } from '../src/core/world.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts — core takes them as args (df4-6 re-declares locally)
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0
const WORLD = 0x10000

// Neutral / fire / bomb input snapshots. The `smartBomb` field is the df5-7 addition — the
// shell (mapInput) grows the keybinding in GREEN; the test drives the literal.
const IDLE = { thrust: false, reverse: false, up: false, down: false, fire: false, smartBomb: false } as const
const FIRE = { thrust: false, reverse: false, up: false, down: false, fire: true, smartBomb: false } as const
const BOMB = { thrust: false, reverse: false, up: false, down: false, fire: false, smartBomb: true } as const

// ─── Observable subsets ──────────────────────────────────────────────────────────────
interface EnemyView {
  readonly x: number
  readonly y: number
  readonly alive?: boolean
}
interface ShipView {
  readonly x: number
  readonly y: number
}
interface SimState {
  readonly ship: ShipView
  readonly camera: number
  readonly landers: readonly EnemyView[]
  readonly humanoids: readonly EnemyView[]
  readonly wave: number
  // df5-7 additions:
  readonly score: number
  readonly men: number
  readonly gameOver: boolean
}
interface Input {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
  readonly smartBomb: boolean
}
interface SimModule {
  createSim: (rand: () => number) => SimState
  spawnLander: (state: SimState, x: number) => SimState
  spawnHumanoid: (state: SimState, x: number, y: number) => SimState
  killShip: (state: SimState) => SimState
  stepSim: (state: SimState, input: Input) => SimState
}
interface DynamicSceneModule {
  composeFrame: (state: SimState, width: number, height: number) => Framebuffer
}

const SIM_SPECIFIER = '../src/core/sim.js'
const SCENE_SPECIFIER = '../src/core/scene.js'

async function loadSim(): Promise<SimModule> {
  const mod = (await import(/* @vite-ignore */ SIM_SPECIFIER)) as Partial<SimModule>
  const missing = (['createSim', 'spawnLander', 'spawnHumanoid', 'killShip', 'stepSim'] as const).filter(
    (k) => typeof mod[k] !== 'function',
  )
  if (missing.length > 0) {
    throw new Error(
      `src/core/sim.ts is missing df5-7 export(s): ${missing.join(', ')}. GREEN wires the df5 loop into the ` +
        'live sim: SimState gains `score`/`men`/`gameOver`; stepSim awards df5-3 points on a df4-1 kill; ' +
        '`killShip(state)` decrements men (df5-3 loseMan) and sets gameOver at men<0 (df5-6 isGameOver); ' +
        'Input gains `smartBomb` and a bomb tick clears enemies via the df4-2 SAFE presentation. PURE core.',
    )
  }
  return mod as SimModule
}

async function loadDynamicScene(): Promise<DynamicSceneModule> {
  const mod = (await import(/* @vite-ignore */ SCENE_SPECIFIER)) as Partial<DynamicSceneModule>
  if (typeof mod.composeFrame !== 'function') {
    throw new Error('src/core/scene.ts has no `composeFrame` export — df3-6 lands it; df5-7 GREEN renders the HUD, the scanner strip and the game-over screen.')
  }
  return mod as DynamicSceneModule
}

/** Deterministic byte source (LCG), the df3-6/df4-3/df4-6 shape — no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

function changedCells(a: Framebuffer, b: Framebuffer): number {
  let n = 0
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++
  return n
}

function stepUntil(
  sim: SimModule,
  start: SimState,
  input: Input,
  pred: (s: SimState) => boolean,
  budget: number,
): { state: SimState; met: boolean } {
  let state = start
  for (let i = 0; i < budget; i++) {
    if (pred(state)) return { state, met: true }
    state = sim.stepSim(state, input)
  }
  return { state, met: pred(state) }
}

// ─── 1. The score / men HUD is wired and RENDERED (df5-3) ──────────────────────────────
describe('df5-7 — the score/men HUD reaches the live frame (df5-3)', () => {
  it('a fresh sim exposes score 0 and men 3 (df5-3 createScore: STARTING_MEN), gameOver false', async () => {
    const sim = await loadSim()
    const s = sim.createSim(makeRand(1))
    expect(typeof s.score, 'SimState must carry a numeric `score`').toBe('number')
    expect(s.score, 'a fresh game scores 0').toBe(0)
    expect(s.men, 'a fresh game has STARTING_MEN === 3 lives').toBe(3)
    expect(s.gameOver, 'a fresh game is not over').toBe(false)
  })

  it('composeFrame DRAWS the HUD — the frame changes when only the score/men differ', async () => {
    // Isolate the HUD's contribution: two sims identical but for the score/men counters.
    // If the digests match, composeFrame ignored them and no HUD reaches the screen.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const base = sim.createSim(makeRand(2))
    const scored: SimState = { ...base, score: 12_345, men: 5 }
    expect(
      digest(composeFrame(scored, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'composeFrame ignored the score/men — the HUD never reaches the frame',
    ).not.toBe(digest(composeFrame(base, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })

  it('killing a lander under fire RAISES the on-screen score (df4-1 kill → df5-3 addPoints)', async () => {
    // The df4-6 kill staging: a humanoid on the beam row baits the lander into the laser
    // stream; the COLIDE kill must now ALSO award df5-3 points, so `score` rises.
    const sim = await loadSim()
    const SHIP_ROW = 120
    let s = sim.createSim(makeRand(7))
    s = sim.spawnHumanoid(s, 48 << 8, SHIP_ROW)
    s = sim.spawnLander(s, 38 << 8)
    const scoreBefore = s.score
    const before = s.landers.length
    const { state, met } = stepUntil(sim, s, FIRE, (st) => st.landers.length < before && st.score > scoreBefore, 20_000)
    expect(met, 'a killed lander awarded no points — the df4-1 kill is not wired to df5-3 addPoints').toBe(true)
    expect(state.score, 'the score must rise by at least the lander value (ENEMY_POINTS.lander === 150)').toBeGreaterThanOrEqual(
      scoreBefore + 150,
    )
  })
})

// ─── 2. The SCANNER strip renders, and OFF-CAMERA attackers appear on it (df5-1) ───────
describe('df5-7 — the scanner radar strip reaches the live frame (df5-1)', () => {
  it('an OFF-CAMERA attacker changes the composed frame — only the scanner can show it', async () => {
    // An attacker on the FAR side of the $10000 cylinder is not in the main play-field view,
    // so the ONLY surface that can paint it is the radar strip. If adding it leaves the frame
    // byte-identical, no scanner is drawn (RED). projectScanner is pure/green (df5-1); df5-7
    // wires it into composeFrame over the live objects.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const baseline = sim.createSim(makeRand(3))
    const farX = wrap16(baseline.camera + WORLD / 2) // maximally off-camera on the cylinder
    const withOffCamera = sim.spawnLander(baseline, farX)
    expect(
      digest(composeFrame(withOffCamera, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'an off-camera attacker changed nothing on screen — the scanner strip is not rendered',
    ).not.toBe(digest(composeFrame(baseline, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })

  it('every composed cell stays a valid 4-bit palette index with the scanner + play-field populated', async () => {
    // The scanner blits by OBJCOL (palette INDEX); an index > 15 would render as CRAM[i&0x0f]
    // — a colour the palette never named. Sample a frame carrying on- and off-camera enemies.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = sim.createSim(makeRand(17))
    s = sim.spawnLander(s, wrap16(s.camera + 0x1000)) // on/near camera
    s = sim.spawnLander(s, wrap16(s.camera + WORLD / 2)) // off camera → scanner-only
    const fb = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(fb.data.some((i) => i !== BACKGROUND), 'the composed frame is blank').toBe(true)
    let worst = 0
    for (const px of fb.data) if (px > worst) worst = px
    expect(worst, `a composed cell holds palette index ${worst} > 15 — a colour the CRAM never named`).toBeLessThanOrEqual(15)
  })
})

// ─── 3. Waves escalate VISIBLY — the escalation reaches the pixels (df5-2 / df5-8) ─────
describe('df5-7 — wave escalation is visible on the frame, not just the counter (df5-2)', () => {
  it('a populated wave paints attackers into the frame — the frame differs when they are removed', async () => {
    // df5-8 locked the COUNTER (wave 1 → 15 landers). df5-7 proves those landers reach the
    // FRAME: the live wave frame differs from the same state with the landers stripped. A
    // higher `wave` with no on-screen change would be an escalation the player can't see.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const { state, met } = stepUntil(sim, sim.createSim(makeRand(23)), IDLE, (st) => st.landers.length > 0 && st.wave >= 1, 20_000)
    expect(met, 'the wave director never populated a wave through stepSim').toBe(true)
    const emptied: SimState = { ...state, landers: [] }
    expect(
      digest(composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
      'the wave’s attackers are not painted into the frame — escalation is invisible',
    ).not.toBe(digest(composeFrame(emptied, LOGICAL_WIDTH, LOGICAL_HEIGHT)))
  })
})

// ─── 4. SMART BOMB — the ACCESSIBILITY-SAFE clear, never a strobe (df5-5, ADR-0005) ────
describe('df5-7 — a smart bomb clears the screen SAFELY (df5-5 / ADR-0005)', () => {
  it("the df5 emergency powers are classified as SAFE presentations, never a raw strobe", () => {
    // The policy the render relies on. The ROM's smart bomb / hyperspace COM PCRAM the whole
    // page (a strobe that would seize the owner); the df4-2 policy overrides that to a
    // freeze/fade while keeping the CLASS honest. Lock it alongside the render proof.
    const bomb = classify('smart-bomb')
    expect(bomb.class, 'a smart bomb IS a full-frame event in the ROM').toBe('full-frame-strobe')
    expect(bomb.presentation, 'ADR-0005 presents the smart bomb as a FADE, never a raw strobe').toBe('fade')
    const hyper = classify('hyperspace')
    expect(hyper.presentation, 'ADR-0005 presents hyperspace as a FREEZE, never a raw strobe').toBe('freeze')
  })

  it('firing a smart bomb clears the on-screen enemies and NEVER strobes the whole screen (ADR-0005)', async () => {
    // Populate the field, snapshot the frame, fire the bomb, snapshot again. The bomb must
    // (a) actually clear enemies (df5-5 clearsType) — so the frame genuinely changed, else the
    // safety check below is vacuous (the repo's zero-canvas-guard trap) — and (b) present via
    // the df4-2 SAFE path: assertNoFullFrameStrobe (fails CLOSED) must NOT throw, and the change
    // must NOT be a near-whole-screen repaint.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = sim.createSim(makeRand(29))
    s = sim.spawnLander(s, wrap16(s.camera + 0x0800))
    s = sim.spawnLander(s, wrap16(s.camera + 0x1000))
    const { state: armed, met } = stepUntil(sim, s, IDLE, (st) => st.landers.length >= 2, 20_000)
    expect(met, 'could not populate the field to fire the bomb against').toBe(true)

    const before = composeFrame(armed, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const cleared = sim.stepSim(armed, BOMB)
    const after = composeFrame(cleared, LOGICAL_WIDTH, LOGICAL_HEIGHT)

    expect(cleared.landers.length, 'the smart bomb cleared no landers — it is not wired into stepSim (df5-5 clearsType)').toBeLessThan(
      armed.landers.length,
    )
    const changed = changedCells(before, after)
    expect(changed, 'the bomb changed nothing on screen — the safety assertion below would be vacuous').toBeGreaterThan(0)
    expect(
      () => assertNoFullFrameStrobe(before.data, after.data),
      'the smart bomb rendered a whole-framebuffer strobe — ADR-0005 forbids it (the owner has photosensitive epilepsy)',
    ).not.toThrow()
    const total = LOGICAL_WIDTH * LOGICAL_HEIGHT
    expect(changed / total, `the bomb repainted ${changed}/${total} cells — a SAFE clear is not a near-full-screen flash`).toBeLessThan(0.9)
  })

  it('assertNoFullFrameStrobe has teeth — a raw whole-frame flash DOES trip it', async () => {
    // Non-vacuity guard for the safety test above: the guard must reject an actual strobe, or
    // its "does not throw" above proves nothing. A whole-frame white-fill ($F everywhere) is
    // exactly the ROM COM PCRAM invert df5-5 is forbidden from doing.
    const { composeFrame } = await loadDynamicScene()
    const sim = await loadSim()
    const base = composeFrame(sim.createSim(makeRand(31)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const strobe = new Uint8Array(base.data.length).fill(0x0f)
    expect(
      () => assertNoFullFrameStrobe(base.data, strobe),
      'assertNoFullFrameStrobe let a whole-frame white-fill through — the safety proof above is vacuous',
    ).toThrow()
  })
})

// ─── 5. GAME OVER — men<0 renders the game-over / hall-of-fame screen (df5-6) ──────────
describe('df5-7 — the game ends and the game-over/hall-of-fame screen renders (df5-6)', () => {
  it('killShip drives men below zero and sets gameOver (df5-3 loseMan → df5-6 isGameOver)', async () => {
    const sim = await loadSim()
    let s = sim.createSim(makeRand(37))
    expect(s.men, 'precondition: three lives').toBe(3)
    // 3 → 2 → 1 → 0 → -1 : four deaths end a one-player game (men < 0).
    for (let i = 0; i < 4; i++) {
      expect(s.gameOver, `the game ended early at men=${s.men} — game-over is men<0, not men<=0`).toBe(false)
      s = sim.killShip(s)
    }
    expect(s.men, 'four deaths from three lives leaves men === -1').toBe(-1)
    expect(s.gameOver, 'men<0 must set gameOver (df5-6 isGameOver)').toBe(true)
  })

  it('composeFrame draws the GAME OVER screen once the game is over — it differs from the play frame', async () => {
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = sim.createSim(makeRand(41))
    s = { ...s, score: 5000 }
    const playFrame = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    for (let i = 0; i < 4; i++) s = sim.killShip(s)
    expect(s.gameOver, 'precondition: the game is over').toBe(true)
    const overFrame = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      digest(overFrame),
      'the game-over/hall-of-fame screen is not rendered — the over frame is byte-identical to the play frame',
    ).not.toBe(digest(playFrame))
  })
})

// ─── 6. The whole df5 loop DIFFERS from a control (canonical-serve, render layer) ──────
describe('df5-7 — the populated df5 frame is a real render, not the empty/static control', () => {
  it('a live df5 frame (wave + enemies + HUD) differs from the fresh sim AND the static title still', async () => {
    // tests/canonical-serve.test.mjs proves the served /defender/ path DIFFERs from a nonsense
    // control at the HTTP layer. This is its render-layer analogue: the live df5 frame must not
    // collapse to the empty frame or the attract still — a fallback that answers the same bytes
    // everywhere proves nothing.
    const sim = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const { state, met } = stepUntil(sim, sim.createSim(makeRand(43)), IDLE, (st) => st.landers.length > 0 && st.wave >= 1, 20_000)
    expect(met, 'the sim never populated a wave to screenshot').toBe(true)
    const populated = composeFrame({ ...state, score: 4200 }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const empty = composeFrame(sim.createSim(makeRand(43)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const still = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(digest(populated), 'the populated df5 frame collapsed to the empty frame').not.toBe(digest(empty))
    expect(digest(populated), 'the live df5 frame is byte-identical to the static title still').not.toBe(digest(still))
  })
})
