// plugins/missile-command/tests/mc5-8-sputnik-fire-arbitration.test.ts
//
// Story mc5-8 — RED phase (Leeloo / TEA). Sputnik fire ARBITRATION + authentic
// (distance-coupled) firing. Deferred from mc5-2 review F3. Three ROM-faithful
// behaviours the mc5-2 code does NOT yet have:
//
//   AC-1  EITHER/OR — within a launch cycle the plane firing REPLACES the normal
//         swarm launch; it is not additive. The ROM's launch arbiter picks exactly
//         one of {SPUTFIR, MIRVER, FROMTOP} per opportunity (JMP SPUTFIR skips the
//         fall-through). Today game.ts folds the salvo into the roster AND still
//         runs the top-spawner the same frame (they merely share the NICBMS ceiling).
//   AC-2  ±48 IN-BOUNDS GATE — the plane fires only when its horizontal position is
//         in the INTERIOR band; it holds fire within 0x30 (48) of either edge.
//         Today readyToFire() checks the timer only, with no positional gate.
//   AC-3  DISTANCE-based fire timer — the timer counts DISTANCE TRAVELLED (dots),
//         not frames, so the fire spacing is velocity-agnostic. Today stepSputnik()
//         decrements the timer by a fixed 1/tick, which only HAPPENS to equal
//         distance at the functional speed=1 (game.ts:238); the discriminator is speed>1.
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC, .RADIX 16 — bare bytes HEX, a trailing '.'
//     DECIMAL. Numbers here are audited decodes; the launch-arbiter block is
//     physically at W3MAIN.MAC:2507-2571). ──────────────────────────────────────
//   Launch arbiter (one path per cycle):
//     2517  CMP I,SPUTWV / IFCS      wave ≥ SPUTWV
//     2519  LDA A,PLCPV / IFNE       plane aloft (PLCPV ≠ 0)
//     2523  LDA HORFIR / CMP SPUTDS / IFCS   HORFIR ≥ SPUTDS  (distance reached, AC-3)
//     2529  LDA A,PLCPH / CMP I,30 / IFCS    PLCPH ≥ 0x30 (48)          ┐ in-bounds
//     2535  CMP I,-30 / IFCC                 PLCPH < 0xD0 (208)         ┘ gate (AC-2)
//     2541  STA HORFIR (=0) ; 2543  JMP SPUTFIR      plane fires — normal launch SKIPPED (AC-1)
//     2555  else CMP I,MIRVWV / IFCS … JMP MIRVER    else a MIRV launch
//     2571  else JMP FROMTOP                          else a normal top-of-screen ICBM
//   So the fire zone is PLCPH ∈ [0x30, 0xD0) = [48, 207] — the INTERIOR of a 0..255
//   byte frame (the plane spawns at PLCPH 0 or 0xFF, W3MAIN.MAC:5803), i.e. AT LEAST
//   48 dots from EACH edge, symmetric about centre. NOT "near the edges".
//   HORFIR — "HORIZ LOC AT WHICH PLANE WILL FIRE" (decl :237); `INC HORFIR ;INC DIST
//     MOVED` once per plane POSITION UPDATE = one dot moved (:5883); reset to 0 on fire
//     (:2541), on activation (:5791) and on deactivation (:5903).
//   SPUTDS — "DISTANCE SPUTNIK MUST GO BETWEEN FIRES" (decl :285); loaded per-wave
//     from WSPFIR (`LDA AY,WSPFIR-SPUTWV ;DISTANCE BETWEEN SPUTNIK FIRES`, :4133) —
//     so SPUTDS == sputnikFireCadence(wave) (mc5-2), reinterpreted from frames to dots.
//   TOPSCR = 222 (spawn.ts) — a NORMAL ICBM launches from origin.v = 222; a plane
//     salvo launches from origin.v = SPUTNIK_V_MIN (100); a MIRV child splits in
//     v ∈ [128,160]. So origin.v is an unambiguous "who launched this" discriminator.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
//   AC-1/AC-2 game tests reflect faithful behaviour the current wiring lacks, so
//   they redden against src/core/game.ts as shipped. AC-2's pure predicate
//   `sputnikInFireBounds` does not exist on sputnik.ts yet — a typed dynamic import
//   keeps `tsc --noEmit` (the release gate) green while it is absent and the test
//   fails at runtime. AC-3 reddens because stepSputnik decrements by 1, not by the
//   distance moved. (The mc5-2 per-tick-decrement unit test is retired to the
//   distance model in sputnik.test.ts by this same story.)

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import {
  spawnSputnik,
  stepSputnik,
  readyToFire,
  reload,
  sputnikFireCadence,
  SPUTNIK_V_MIN,
  type Sputnik,
} from '../src/core/sputnik.js'
import { createRng } from '@shared/rng'

// TOPSCR (spawn.ts) is module-private; a normal top-of-screen launch carries this
// origin.v. Restated here as the ROM's cited TOPSCR = 222 (W3COMN.MAC:107).
const TOPSCR_V = 222

/** New ICBMs launched from the plane this frame (origin.v = SPUTNIK_V_MIN = 100). */
const planeShots = (s: GameState) => s.icbms.filter((m) => m.origin.v === SPUTNIK_V_MIN)
/** New ICBMs launched from the normal top-of-screen spawner (origin.v = TOPSCR = 222). */
const topShots = (s: GameState) => s.icbms.filter((m) => m.origin.v === TOPSCR_V)

/** A game on the play path with an injected plane and an EMPTY, clear-to-launch field
 *  and budget to spare, so any new ICBM after one step is unambiguously this frame's
 *  (plane salvo vs top-spawner), told apart by origin.v. wave 3: cruiseBudget=0 (no
 *  cruise pollution) and no in-band ballistic (icbms empty → no MIRV). */
function armedGame(plane: Sputnik): GameState {
  return {
    ...createGame(2),
    wave: 3,
    remaining: 20, // budget for BOTH a plane salvo and a full swarm cycle — so suppression is visible
    icbms: [], // empty ⇒ clear-to-launch (spawn.ts) AND every resulting ICBM is new this frame
    sputniks: [plane],
  }
}

// A plane aloft (v=100) and mid-field (h=120, inside [48,207]); fireTimer set per case.
const planeAt = (h: number, fireTimer: number): Sputnik => ({
  pos: { h, v: SPUTNIK_V_MIN },
  dir: 1,
  variant: 'bomber',
  fireTimer,
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — EITHER/OR: a plane that fires SUPPRESSES the normal swarm that cycle
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-8 AC-1 — either/or fire arbitration (JMP SPUTFIR replaces the normal launch)', () => {
  it('when the ready, in-bounds plane fires, the top-of-screen spawner launches NOTHING that frame', () => {
    // Faithful: JMP SPUTFIR (W3MAIN.MAC:2543) skips the FROMTOP fall-through, so every
    // new ICBM is a plane shot (origin.v=100) and none is a top launch (origin.v=222).
    // Current game.ts folds the salvo in AND still runs spawnIcbms → top launches appear.
    const s = stepGame(armedGame(planeAt(120, 0)))
    expect(planeShots(s).length).toBeGreaterThanOrEqual(1) // the plane DID fire (the case is live)
    expect(topShots(s).length).toBe(0) // …and the normal swarm was suppressed this cycle — EITHER/OR
  })

  it('CONTROL — with the plane NOT ready, the SAME state DOES launch the top-of-screen swarm', () => {
    // Identical fixture, fireTimer far from ready: the plane fires nothing, the
    // arbiter falls through to the normal launch, and top-origin ICBMs appear. Green
    // on BOTH current and faithful code — it proves the spawner is ARMED in armedGame,
    // so topShots==0 in the test above is real suppression, not a dead spawner
    // (lang-review #18/#26: the suite must be able to distinguish a broken impl).
    const s = stepGame(armedGame(planeAt(120, 999)))
    expect(planeShots(s).length).toBe(0) // an un-ready plane fires nothing…
    expect(topShots(s).length).toBeGreaterThanOrEqual(1) // …so the normal swarm launches instead
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — ±48 in-bounds fire gate (PLCPH ∈ [0x30, 0xD0) = [48, 207])
// ─────────────────────────────────────────────────────────────────────────────

// sputnikInFireBounds is a NEW export GREEN adds to sputnik.ts. Typed dynamic import
// (the mc5-2 fleet idiom) so `tsc --noEmit` stays green while it is absent.
interface GateModule {
  sputnikInFireBounds: (h: number) => boolean
}
const SPUTNIK_SPECIFIER = '../src/core/sputnik.js'
async function loadGate(): Promise<GateModule> {
  const mod = (await import(/* @vite-ignore */ SPUTNIK_SPECIFIER)) as Partial<GateModule>
  if (typeof mod.sputnikInFireBounds !== 'function') {
    throw new Error(
      'sputnikInFireBounds not built yet — GREEN adds a PURE predicate to src/core/sputnik.ts: ' +
        'the plane may fire only when its horizontal position is inside the ROM ±0x30 band, ' +
        'h >= 48 (0x30, CMP I,30/IFCS) AND h < 208 (0xD0, CMP I,-30/IFCC), i.e. [48,207] — the ' +
        'INTERIOR of the field, ≥48 dots from each edge (W3MAIN.MAC:2529-2537). The 48/margin ' +
        'literal needs a // cite + a docs/rom-study/claims/sputnik.json entry (citations.test.ts). ' +
        `(${(mod as { sputnikInFireBounds?: unknown }).sputnikInFireBounds === undefined ? 'export absent' : 'export not a function'})`,
    )
  }
  return mod as GateModule
}

describe('mc5-8 AC-2 — the ±48 in-bounds fire gate (pure predicate)', () => {
  it('fires ONLY in the interior band [48, 207] — the ROM ±0x30 gate, W3MAIN.MAC:2529-2537', async () => {
    const { sputnikInFireBounds } = await loadGate()
    // Lower edge: CMP I,30 / IFCS is inclusive at 0x30 = 48.
    expect(sputnikInFireBounds(47)).toBe(false) // 47 < 0x30 → too close to the LEFT edge, holds fire
    expect(sputnikInFireBounds(48)).toBe(true) // exactly 0x30 (48) → in bounds
    expect(sputnikInFireBounds(120)).toBe(true) // mid-field → fires
    // Upper edge: CMP I,-30 (=0xD0=208) / IFCC fires only while h < 208, so 207 is the last.
    expect(sputnikInFireBounds(207)).toBe(true) // 0xCF (207) → last in-bounds column
    expect(sputnikInFireBounds(208)).toBe(false) // 0xD0 (208) → too close to the RIGHT edge, holds fire
    expect(sputnikInFireBounds(255)).toBe(false) // far right edge → silent
    // The band is the INTERIOR, not the edges: a "near the edges" mutant (the
    // inverted gate) fires at 30 and 240 and is silent at 120 — the reverse of this.
    expect(sputnikInFireBounds(30)).toBe(false)
    expect(sputnikInFireBounds(240)).toBe(false)
  })
})

describe('mc5-8 AC-2 — the gate is WIRED into stepGame', () => {
  it('a ready plane in the LEFT silent band (h=30) fires nothing; the swarm launches instead', () => {
    // h=30 < 48: faithful game.ts gates the plane out, so no plane shot — and because
    // the plane holds fire, the arbiter falls through to the normal swarm (top origin).
    // Current game.ts ignores position → the plane fires at h=30 → a v=100 shot → RED.
    const s = stepGame(armedGame(planeAt(30, 0)))
    expect(planeShots(s).length).toBe(0) // out of bounds ⇒ no fire, whatever the timer says
    expect(topShots(s).length).toBeGreaterThanOrEqual(1) // the swarm fires instead (either/or fall-through)
  })

  it('a ready plane in the RIGHT silent band (h=230) fires nothing', () => {
    // h=230 ≥ 208: same gate on the far side. Current code fires here too → RED.
    const s = stepGame(armedGame(planeAt(230, 0)))
    expect(planeShots(s).length).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — DISTANCE-based fire timer (velocity-agnostic): the discriminator is speed>1
// ─────────────────────────────────────────────────────────────────────────────
describe('mc5-8 AC-3 — the fire timer measures DISTANCE, not frames', () => {
  it('stepSputnik reduces the countdown by the DISTANCE MOVED (speed), not a fixed 1', () => {
    // ROM: INC HORFIR once per position update = one dot moved (W3MAIN.MAC:5883). The
    // plane covers `speed` dots/tick, so the countdown drops by `speed`.
    expect(stepSputnik(planeAt(120, 10), 4).fireTimer).toBe(6) // 10 − 4 dots (a −1 frame countdown gives 9)
    expect(stepSputnik(planeAt(120, 10), 1).fireTimer).toBe(9) // speed 1: unchanged from the functional model
  })

  it('empties in HALF the ticks at speed 2 vs speed 1 — the same DISTANCE, fewer frames', () => {
    // The whole point of the distance model: fire spacing is invariant to velocity.
    // A frame countdown would take the SAME number of ticks at both speeds (RED at speed 2).
    const ticksToReady = (speed: number): number => {
      let s = planeAt(120, 10)
      let n = 0
      while (!readyToFire(s) && n < 1000) {
        s = stepSputnik(s, speed)
        n++
      }
      return n
    }
    expect(ticksToReady(1)).toBe(10) // 10 dots at 1 dot/tick
    expect(ticksToReady(2)).toBe(5) // 10 dots at 2 dots/tick — HALF (a frame countdown stays at 10)
  })

  it('reload re-arms the countdown to THIS wave SPUTDS (= WSPFIR cadence, W3MAIN.MAC:4133)', () => {
    // SPUTDS is loaded per-wave from WSPFIR, so the reload target is the existing
    // sputnikFireCadence(wave) — now read as a DISTANCE (dots), not a frame count.
    const wave = 6
    expect(reload(planeAt(120, 0), wave).fireTimer).toBe(sputnikFireCadence(wave)) // 32 dots at wave 6
    // And a fresh spawn seeds the SAME distance (spawnSputnik takes the cadence).
    expect(spawnSputnik(createRng(3), sputnikFireCadence(wave)).fireTimer).toBe(sputnikFireCadence(wave))
  })
})
