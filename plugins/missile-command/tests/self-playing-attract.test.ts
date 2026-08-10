// plugins/missile-command/tests/self-playing-attract.test.ts
//
// Story mc6-4 — RED phase (O'Brien / TEA). The self-playing attract demo: a
// deterministic AUTCUR "smart cursor" drives the crosshair and fires ABMs during
// phase 'attract' so the field plays itself, and ANY input leaves attract for
// 'setup' (which auto-advances to a fresh 'play' game this story).
//
// ─── RULING AT RED (user, this session) ──────────────────────────────────────
// Following the mc6-1/mc6-2 precedent that the USER rules phase-model shape at
// RED, TEA measured the ROM and surfaced the fork; the user chose **Faithful**:
//   • createGame BOOTS to 'attract' (was 'play'). A new createPlayGame(seed)
//     returns the old fully-defended 'play' field; the combat/wave suites that
//     call createGame() and assume play migrate to it in GREEN.
//   • stepGame gains an 'attract' branch: it applies the pure attractDriver
//     (AUTCUR) AND runs the full combat sim, keeping phase 'attract' (never
//     auto-flipping via nextPhase). MIRV is suppressed in attract (W3MAIN.MAC:1519).
//   • ANY input in attract -> 'setup' (broadened from mc6-2's fire-keys-only).
//   • stepGame's 'setup' branch AUTO-ADVANCES to a fresh 'play' game (reseed).
//     End-to-end: attract -(input)-> setup -(1 frame)-> play.
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
// SMART CURSOR MOVER (ATTRACT): AUTCUR, W3MAIN.MAC:891 (.SBTTL) / :895 (label),
// called from UPCURS when ATRACT is set (:855-859 LDA ATRACT / JSR AUTCUR). AUTCUR
// is DETERMINISTIC pursuit, not RNG: it targets an active ICBM (NEWTAR, :1061),
// LEADS it (V toward a ~0x0E-dot offset, H via the ICBM's H-velocity >> 4), steps
// the cursor by AUTSPD = 2 (W3COMN.MAC:233), and — when on target AND < 2 ABMs are
// on screen AND ABMONS+EXPLCT < ICBONS — fires one ABM from the base nearest the
// cursor (H thresholds 0x60 / 0xA0, :1005-1015), then picks a new target. The
// "seeded" in the story title is the whole attract REPLAY (ICBM spawns draw the
// seeded rng); the cursor logic itself uses no entropy. So these tests pin the
// OBSERVABLES (pursuit direction, gradual step, nearest-base fire gate,
// determinism) — never the exact fixed-point lead math (mc9-level; ADCURS
// multiplies the raw AUTSPD increment, so the pixel step is out of scope here).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// createGame still boots 'play', attractDriver / createPlayGame (core/game.ts) and
// beginSetupOnInput (shell/input.ts) do not exist, stepGame has no attract/setup
// branch, fireOrStart in attract still reseeds to play on a fire key, and the
// MC-ATTRACT-AUTCUR claim is unfiled. Each new surface is reached through a
// self-describing dynamic-import loader (the fleet idiom) so tsc stays green.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, startGame, type GameState } from '../src/core/game.js'
import { type Icbm } from '../src/core/icbm.js'
import { type Abm } from '../src/core/abm.js'
import { createCities, createBases, BASES, MAXMIS } from '../src/core/field.js'
import { INITIAL_WAVE, waveSchedule } from '../src/core/wave.js'
import { NICBMS } from '../src/core/spawn.js'
import { fireOrStart } from '../src/shell/input.js'
import { type Phase } from '../src/core/state.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

// ─── the contracts GREEN (Loki / Dev) implements ─────────────────────────────
// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while the
// new surface is still absent (the state/field/start-of-game.test.ts idiom).
const GAME_SPECIFIER = '../src/core/game.js'
const INPUT_SPECIFIER = '../src/shell/input.js'

type CreatePlayGame = (seed?: number) => GameState
type AttractDriver = (state: GameState) => GameState
type BeginSetupOnInput = (state: GameState) => GameState

async function loadCreatePlayGame(): Promise<CreatePlayGame> {
  const mod = (await import(/* @vite-ignore */ GAME_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.createPlayGame !== 'function') {
    throw new Error(
      'createPlayGame not built yet — GREEN adds `createPlayGame(seed?): GameState` to ' +
        "src/core/game.ts: the fresh, fully-defended field in phase 'play' (createGame's OLD " +
        "contract). createGame now boots 'attract'; the ~18 combat/wave suites that call " +
        'createGame() and assume play must migrate to createPlayGame().',
    )
  }
  return mod.createPlayGame as CreatePlayGame
}

async function loadAttractDriver(): Promise<AttractDriver> {
  const mod = (await import(/* @vite-ignore */ GAME_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.attractDriver !== 'function') {
    throw new Error(
      'attractDriver not built yet — GREEN adds a PURE `attractDriver(state): GameState` to ' +
        "src/core/game.ts (AUTCUR, W3MAIN.MAC:895). When phase is 'attract' and an ACTIVE ICBM " +
        'exists: move the cursor TOWARD the (led) target by ~AUTSPD=2/axis (gradual, no teleport), ' +
        'and when on target with < 2 ABMs aloft AND abms+explosions < icbms, launch ONE ABM from ' +
        'the base nearest the cursor. No active target -> cursor holds. Not attract -> state ' +
        'unchanged. Deterministic, pure (no clock, no entropy).',
    )
  }
  return mod.attractDriver as AttractDriver
}

async function loadBeginSetupOnInput(): Promise<BeginSetupOnInput> {
  const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.beginSetupOnInput !== 'function') {
    throw new Error(
      'beginSetupOnInput not built yet — GREEN adds `beginSetupOnInput(state): GameState` to ' +
        "src/shell/input.ts: when state.phase is 'attract' return { ...state, phase: 'setup' } " +
        '(ANY input leaves the attract demo — W3MAIN.MAC:740-757 writes S.SETU); every other ' +
        'phase is returned UNCHANGED. fireOrStart routes attract keydowns here; main.ts routes ' +
        'pointer input here too. Pure.',
    )
  }
  return mod.beginSetupOnInput as BeginSetupOnInput
}

// ─── fixtures ────────────────────────────────────────────────────────────────

/** A single ACTIVE (in-flight, descending) enemy ICBM at `pos`, homing straight
 *  down onto `pos.h`. RNG-free literal — a target the smart cursor can pursue. */
const activeIcbm = (h: number, v: number): Icbm => ({
  origin: { h, v: 231 },
  target: { h, v: 0 },
  pos: { h, v },
  arrived: false,
})

/** An already-landed ICBM (arrived): NOT a valid target — AUTCUR/NEWTAR skip it
 *  (they scan for ICCPVH-active slots). Used to prove the driver ignores it. */
const landedIcbm = (h: number): Icbm => ({
  origin: { h, v: 231 },
  target: { h, v: 0 },
  pos: { h, v: 0 },
  arrived: true,
})

/** A fresh attract game (once GREEN flips the boot) with `patch` applied. Built on
 *  createGame so cities/bases/rng match a real cold boot; phase forced to 'attract'
 *  so the fixture is valid even before GREEN flips createGame's default. */
const attract = (patch: Partial<GameState> = {}): GameState => ({
  ...createGame(1),
  phase: 'attract',
  ...patch,
})

/** A played-OUT game in `phase`: cities dead, magazines spent, a live ICBM on
 *  screen, a high score, a late wave, a spent budget, a huge frame count — so a
 *  reseed can be shown to CLEAR the board, not merely flip the phase. */
const dirty = (phase: Phase): GameState => ({
  ...createGame(1),
  phase,
  score: 5000,
  cities: createCities().map((c) => ({ ...c, alive: false })),
  bases: createBases().map((b) => ({ ...b, alive: false, ammo: 0 })),
  icbms: [activeIcbm(100, 120)],
  wave: 7,
  remaining: 0,
  frame: 9999,
})

/** Every observable of a fresh, fully-defended game at rest in 'play' (mc3-4 AC1's
 *  shape), asserted against the cited constants — never bare magic numbers. */
function expectFreshPlayGame(g: GameState): void {
  expect(g.phase).toBe('play')
  expect(g.cities.length).toBe(6)
  expect(g.cities.every((c) => c.alive)).toBe(true)
  expect(g.bases.length).toBe(3)
  expect(g.bases.every((b) => b.alive && b.ammo === MAXMIS)).toBe(true)
  expect(g.icbms).toEqual([])
  expect(g.abms).toEqual([])
  expect(g.explosions).toEqual([])
  expect(g.sputniks).toEqual([])
  expect(g.score).toBe(0)
  expect(g.wave).toBe(INITIAL_WAVE)
  expect(g.remaining).toBe(waveSchedule(INITIAL_WAVE).count)
  expect(g.remaining).not.toBe(NICBMS)
  expect(g.frame).toBe(0)
}

/** Step the game forward `n` frames with NO player input, returning every state
 *  (index 0 = start). The self-play is emergent from stepGame alone. */
function run(start: GameState, n: number): GameState[] {
  const frames: GameState[] = [start]
  for (let i = 0; i < n; i++) frames.push(stepGame(frames[frames.length - 1]))
  return frames
}

const DEMO_FRAMES = 300 // generous: wave-1 spawns + ABM flight land well inside this

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the boot flips: createGame -> 'attract', createPlayGame -> 'play'.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-4 AC1 — createGame boots to attract; createPlayGame is the play field', () => {
  it("createGame() boots into phase 'attract' (the cabinet cold-starts on the demo)", () => {
    // RED today: createGame still returns 'play' (mc6-2 kept the boot, deferring to mc6-4).
    expect(createGame().phase).toBe('attract')
  })

  it("createPlayGame() is the fresh, fully-defended 'play' field (createGame's OLD contract)", async () => {
    const createPlayGame = await loadCreatePlayGame()
    expectFreshPlayGame(createPlayGame())
  })

  it('createGame and createPlayGame differ ONLY in phase (same seed => same field)', async () => {
    const createPlayGame = await loadCreatePlayGame()
    // The two builders share every field but `phase`, so the demo board and the
    // playable board can never drift — the mc6-2 "one place the field is defined" rule.
    expect({ ...createGame(1), phase: 'play' }).toEqual(createPlayGame(1))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — attractDriver is a pure, deterministic smart-cursor PURSUIT (AUTCUR).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-4 AC2 — attractDriver pursues an active ICBM (gradually, deterministically)', () => {
  it('moves the cursor TOWARD an active ICBM in H, without teleporting onto it', async () => {
    const attractDriver = await loadAttractDriver()
    const target = activeIcbm(240, 130) // far to the RIGHT, ~level with the cursor
    const s = attract({ cursor: { h: 130, v: 125 }, icbms: [target] })
    const d = attractDriver(s)
    expect(d.cursor.h).toBeGreaterThan(s.cursor.h) // pursued rightward, toward the ICBM
    expect(d.cursor.h).toBeLessThan(target.pos.h) // but a GRADUAL step — not a teleport
  })

  it('holds the cursor when there is NO active target (empty field)', async () => {
    const attractDriver = await loadAttractDriver()
    const s = attract({ cursor: { h: 100, v: 100 }, icbms: [] })
    expect(attractDriver(s).cursor).toEqual(s.cursor)
  })

  it('IGNORES a landed (arrived) ICBM — only descending warheads are targets', async () => {
    const attractDriver = await loadAttractDriver()
    const s = attract({ cursor: { h: 100, v: 100 }, icbms: [landedIcbm(240)] })
    expect(attractDriver(s).cursor).toEqual(s.cursor) // an arrived ICBM is not pursued
  })

  it("does nothing when the phase is NOT 'attract' (the driver is phase-gated)", async () => {
    const attractDriver = await loadAttractDriver()
    const play = { ...createGame(1), phase: 'play' as Phase, icbms: [activeIcbm(240, 130)] }
    const d = attractDriver(play)
    expect(d.cursor).toEqual(play.cursor) // no auto-move outside attract
    expect(d.abms).toEqual(play.abms)
  })

  it('is deterministic and does not mutate its input', async () => {
    const attractDriver = await loadAttractDriver()
    const s = attract({ cursor: { h: 130, v: 125 }, icbms: [activeIcbm(240, 130)] })
    const snapshot = structuredClone(s)
    expect(attractDriver(s)).toEqual(attractDriver(s)) // same input -> same output
    attractDriver(s)
    expect(s).toEqual(snapshot) // input untouched
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — attractDriver FIRES from the nearest base once converged, gated by the
//        AUTCUR "< 2 ABMs on screen" rule. Convergence is driven by repeated calls
//        (the ICBM is not stepped), so the tests do not hinge on the exact lead math.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-4 AC3 — the smart cursor fires from the nearest base', () => {
  /** Repeatedly drive over a FIXED single-ICBM field until the cursor converges and
   *  an ABM is launched (or the cap is hit). The sim is not stepped, so the target
   *  stays put and convergence is deterministic. */
  const driveToFire = (driver: AttractDriver, start: GameState, cap = 60): GameState => {
    let s = start
    for (let i = 0; i < cap && s.abms.length === start.abms.length; i++) s = driver(s)
    return s
  }

  it('launches an ABM from the RIGHT base for a right-side target (H >= 0xA0)', async () => {
    const attractDriver = await loadAttractDriver()
    const s = attract({ cursor: { h: 200, v: 130 }, icbms: [activeIcbm(240, 130)], abms: [] })
    const fired = driveToFire(attractDriver, s)
    expect(fired.abms.length).toBeGreaterThanOrEqual(1) // the field fires itself
    expect(fired.abms[0].origin).toEqual(BASES[2]) // nearest base to the right cursor
  })

  it('launches an ABM from the LEFT base for a left-side target (H < 0x60)', async () => {
    const attractDriver = await loadAttractDriver()
    const s = attract({ cursor: { h: 40, v: 130 }, icbms: [activeIcbm(20, 130)], abms: [] })
    const fired = driveToFire(attractDriver, s)
    expect(fired.abms.length).toBeGreaterThanOrEqual(1)
    expect(fired.abms[0].origin).toEqual(BASES[0]) // nearest base to the left cursor
  })

  it('does NOT fire a 3rd ABM while 2 are already on screen (the AUTCUR < 2 gate)', async () => {
    const attractDriver = await loadAttractDriver()
    // Same convergence that fires above, but two ABMs are already aloft: the gate
    // must hold the launch closed. Without the gate this loop would add a 3rd.
    const aloft: Abm[] = [
      { origin: BASES[0], target: { h: 240, v: 130 }, pos: { h: 100, v: 60 }, arrived: false },
      { origin: BASES[1], target: { h: 240, v: 130 }, pos: { h: 120, v: 70 }, arrived: false },
    ]
    const s = attract({ cursor: { h: 200, v: 130 }, icbms: [activeIcbm(240, 130)], abms: aloft })
    let d = s
    for (let i = 0; i < 60; i++) d = attractDriver(d)
    expect(d.abms.length).toBe(2) // no new launch — the fire gate failed CLOSED
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — INTEGRATION: with createGame booting to attract, stepGame plays the field
//        by itself — the cursor moves, ICBMs spawn, ABMs launch and detonate, the
//        phase never leaves attract, and the whole run is seed-deterministic.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-4 AC4 — the field plays itself in attract (no player input)', () => {
  it("keeps phase 'attract' for the whole demo — it never auto-flips to play/over", () => {
    const frames = run(createGame(7), DEMO_FRAMES)
    expect(frames.every((f) => f.phase === 'attract')).toBe(true)
  })

  it('moves the crosshair on its own — and a plain PLAY game does NOT (the control)', async () => {
    const createPlayGame = await loadCreatePlayGame()
    const attractFrames = run(createGame(7), DEMO_FRAMES)
    const cursorMoved = attractFrames.some((f) => f.cursor.h !== attractFrames[0].cursor.h || f.cursor.v !== attractFrames[0].cursor.v)
    expect(cursorMoved).toBe(true) // the smart cursor drives itself
    // CONTROL: the sim never moves the cursor on its own; only input/the driver does.
    const playFrames = run(createPlayGame(7), DEMO_FRAMES)
    const playCursorMoved = playFrames.some((f) => f.cursor.h !== playFrames[0].cursor.h || f.cursor.v !== playFrames[0].cursor.v)
    expect(playCursorMoved).toBe(false)
  })

  it('spawns ICBMs and launches + detonates ABMs — the demo actually plays', () => {
    const frames = run(createGame(7), DEMO_FRAMES)
    expect(frames.some((f) => f.icbms.length > 0)).toBe(true) // the sim runs in attract
    expect(frames.some((f) => f.abms.length > 0)).toBe(true) // the driver fires
    expect(frames.some((f) => f.explosions.length > 0)).toBe(true) // those ABMs detonate
  })

  it('emits sound moments during the demo (the attract branch does not swallow cues)', () => {
    // #14 (edges in one branch): a new phase branch that forgot to build soundEvents
    // would go silent. The demo detonates ABMs, so some frame must voice a moment.
    const frames = run(createGame(7), DEMO_FRAMES)
    expect(frames.some((f) => f.soundEvents.length > 0)).toBe(true)
  })

  it('is seed-deterministic: two runs from the same seed are byte-identical', () => {
    const a = run(createGame(7), DEMO_FRAMES)
    const b = run(createGame(7), DEMO_FRAMES)
    expect(a[a.length - 1]).toEqual(b[b.length - 1])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — ANY input leaves attract for 'setup'; 'setup' auto-advances to fresh play.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-4 AC5 — any input -> setup, and setup auto-advances to a fresh play game', () => {
  it("beginSetupOnInput turns 'attract' into 'setup'", async () => {
    const beginSetupOnInput = await loadBeginSetupOnInput()
    expect(beginSetupOnInput(attract()).phase).toBe('setup')
  })

  it.each(['play', 'pause', 'between', 'over', 'setup'] as const)(
    "beginSetupOnInput leaves a non-attract phase (%s) UNCHANGED",
    async (phase) => {
      const beginSetupOnInput = await loadBeginSetupOnInput()
      const s = { ...createGame(1), phase }
      expect(beginSetupOnInput(s)).toEqual(s)
    },
  )

  it.each(['z', 'x', 'c', 'a', ' ', 'Enter', 'q'])(
    "fireOrStart routes ANY key ('%s') in attract to setup (broadened from fire-only)",
    async (key) => {
      // mc6-2 fireOrStart in attract reseeded to PLAY on a fire key and no-op'd others;
      // the mc6-4 ruling is ANY input -> setup. RED until fireOrStart is broadened.
      expect(fireOrStart(key, attract()).phase).toBe('setup')
    },
  )

  it('still restarts from GAME OVER on a fire key (the mc6-2 over-restart survives)', () => {
    // over is not attract, so fireOrStart delegates to the start path: fresh play.
    expectFreshPlayGame(fireOrStart('z', dirty('over')))
    expect(fireOrStart('z', dirty('over'))).toEqual(startGame(dirty('over')))
  })

  it("stepGame advances 'setup' to a fresh, fully-defended 'play' game (auto-advance + reseed)", () => {
    // A dirty setup state (played-out fields) reseeds on the next frame.
    expectFreshPlayGame(stepGame(dirty('setup')))
  })

  it("the setup->play reseed clears the sound channel (no stale cue leaks — check #14)", () => {
    expect(stepGame(dirty('setup')).soundEvents).toEqual([])
  })

  it('end-to-end: createGame (attract) -> input -> setup -> step -> fresh play', () => {
    const boot = createGame(3)
    expect(boot.phase).toBe('attract')
    const afterInput = fireOrStart(' ', boot) // any key
    expect(afterInput.phase).toBe('setup')
    expectFreshPlayGame(stepGame(afterInput))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — CITATION: a committed claim pins the AUTCUR smart-cursor mover. This is
//        already GREEN — the rom-study dossier filed the .SBTTL anchor
//        MC-ANCH-W3MAIN-891 ("SMART CURSOR MOVER (ATTRACT)"), so mc6-4 need NOT
//        file a new claim; these tests GUARD that it stays present. The title's
//        other two cites (5277 REFRESH / 5331 SCROLL) are attract MESSAGE render =
//        mc6-5, so they are NOT required here.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-4 AC6 — the AUTCUR smart-cursor-mover claim is committed', () => {
  it('a committed claim pins the SMART CURSOR MOVER (ATTRACT) region W3MAIN.MAC:891..895', () => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, 'W3MAIN.MAC', 891, 895),
      'no committed claim pins the AUTCUR smart-cursor mover (W3MAIN.MAC:891 .SBTTL / :895 label)',
    ).toBe(true)
  })

  it('that claim is genuinely the smart-cursor anchor (keyed on MEANING, not a line coincidence)', () => {
    // #15/#25: a bare line-range cover passes on ANY claim in 891..895. Bind to the
    // AUTCUR content so removing the smart-cursor anchor reddens even if some other
    // claim later lands in the range.
    const claims = loadClaims()
    const c = claims.find(
      (x) =>
        x.source.file.includes('W3MAIN.MAC') &&
        x.source.line >= 891 &&
        x.source.line <= 895 &&
        /SMART CURSOR|ATTRACT/i.test(`${x.symbol} ${x.meaning} ${x.source.verbatim}`),
    )
    expect(c, 'no claim in W3MAIN.MAC:891..895 names the SMART CURSOR MOVER (ATTRACT)').toBeDefined()
    expect(c!.source.verbatim).toMatch(/SMART CURSOR MOVER \(ATTRACT\)/)
  })
})
