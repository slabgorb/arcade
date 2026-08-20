// tests/wave-progression.test.ts
//
// Story pt1-2 — RED phase (TEA). The between-wave DIFFICULTY WALK is built but
// NEVER WIRED: `stepWaveCadence` (millipede.ts, MT-14/15/16), `bombModeStart` /
// `bombs` (ddt.ts, DD-75..101) and `initConway` all exist and are unit-tested in
// isolation, but nothing in the sim drives them across waves. Playtest 2026-08-19:
// "everything escalates quickly from the first wave; the ramp exists in the ROM but
// isn't wired." The ROM (MILLI.MAC) drives the whole progression off one register,
// CENTIS, incremented every wave clear ("FASTER", :1906):
//
//   INIT       CENTIS := 2                       ; "FAST TO START WITH"      (:1171, WP-1)
//   wave clear CENTIS := CENTIS + 1              ; "FASTER"                  (:1906, WP-2)
//              if CENTIS == 3 (:1908, WP-3):     ; only then do the gates fire
//                 if CENTIN == 9  -> INICON      ; start CONWAY, not always  (:1911-1914, WP-4/5/6)
//                 elif CENTIN in {1,3,5,7,0B}    ; arm BOMBS dive-bomb wave   (BOMBSL, DD-95..101)
//   wave start CENTPC walk (:504-519):           ; when CENTIS >= 3
//                 DEC CENTIN (reload 0x0C at 0)  ; the millipede SHORTENS
//                 CENTIS := SCORE2 < 2 ? 1 : 2   ; SLOW below 20,000 else FAST (MT-16)
//   each frame JSR BOMBS (:28, WP-7)             ; no-op unless NOCENT > 0
//
// These are INTEGRATION assertions: they drive `stepGame` and read the observable
// millipede (segment speed, CONWAY activity, the NOCENT/CENTIS registers). Every
// constant they lean on is already a byte-verified claim (MT-*/DD-*/WV-*); the new
// WP-* dossier (claims/17-wave-progression.json) pins the five wiring anchors this
// story adds. The pure functions have their own unit tests (millipede.test.ts,
// ddt.test.ts) — this file proves they are WIRED.

import { describe, it, expect } from 'vitest'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'
import { CENTIS_FAST, CENTIS_SLOW, NCENT, BODY_COLOR, type Segment } from '../src/core/millipede'
import { BOMBSL, bombModeStart } from '../src/core/ddt'
import { PLYFLD_SIZE } from '../src/core/conway'

const SEED = 0x1982
const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }

// The sim spreads `...state`, so extra/new fields set on an override survive a step
// until code explicitly writes them — which is exactly what makes these RED today
// (nothing reads/writes centis/nocent/bombv) and GREEN once Dev wires the walk. The
// cast keeps `tsc --noEmit` clean while the fields do not yet exist on GameState.
type Over = Partial<GameState> & Record<string, unknown>
const play = (over: Over = {}): GameState =>
  ({ ...createGame(SEED, { phase: 'play' }), ...over }) as GameState

// New registers the walk introduces — read structurally so the file type-checks
// before the fields exist. Once GameState carries them these narrow to `number`.
const centisOf = (g: GameState): number | undefined => (g as { centis?: number }).centis
const nocentOf = (g: GameState): number | undefined => (g as { nocent?: number }).nocent
const bombvOf = (g: GameState): number | undefined => (g as { bombv?: number }).bombv

/** The head is segments[0]; its `dv` IS the laid CENTIS (createMillipede: dv = centis).
 *  A freshly re-laid train is returned un-moved, so this reads the wave's speed. */
const headSpeed = (g: GameState): number => {
  expect(g.segments.length, 'the wave must have laid a train (non-vacuity)').toBeGreaterThan(0)
  return g.segments[0].dv
}

describe('pt1-2 — the CENTIS/CENTIN per-wave walk is wired into the sim', () => {
  it('a fresh game carries CENTIS = FAST TO START WITH (WP-1, MILLI.MAC:1171)', () => {
    // INIT boots CENTIS to 2; the port must persist it as a register, not a default
    // buried in createMillipede. RED today: GameState has no `centis` field.
    expect(centisOf(createGame(SEED))).toBe(CENTIS_FAST)
  })

  it('the first wave marches in FAST — the port default already matches the ROM', () => {
    // Guards against an over-correction: the ROM's slow reset is NOT wave 1. This is
    // the base case that proves the SLOW assertions below are a real change, not noise.
    expect(headSpeed(createGame(SEED, { phase: 'play' }))).toBe(CENTIS_FAST)
  })

  it('clearing a wave increments CENTIS — "FASTER" (WP-2, MILLI.MAC:1906)', () => {
    // A cleared millipede with DELAY idle arms the next wave AND speeds the register.
    const after = stepGame(play({ segments: [], delay: 0, centis: 2 }), idle)
    expect(centisOf(after)).toBe(3)
  })

  it('below 20,000 the re-laid wave is SLOW + one segment SHORTER (walk, MT-16)', () => {
    // DELAY elapses (1 -> 0) with CENTIS already at 3: the CENTPC walk must DEC CENTIN
    // (12 -> 11) and, because SCORE2 < 2, reset CENTIS to 1. RED today: the sim re-lays
    // a constant full-length (12) FAST (2) train and never calls stepWaveCadence.
    const after = stepGame(play({ delay: 1, centin: NCENT, centis: 3, score: 0 }), idle)
    expect(headSpeed(after)).toBe(CENTIS_SLOW) // speed 1, not 2
    expect(after.centin).toBe(NCENT - 1) // 11 segments, not a fresh 12
  })

  it('the SLOW reset is gated at exactly SCORE2 >= 2 (20,000) — MT-16 boundary', () => {
    // 19,999 -> SCORE2 = 1 -> SLOW; 20,000 -> SCORE2 = 2 -> FAST. The pair pins the
    // threshold, not just "sometimes slow". Low side is the discriminator (RED today).
    const below = stepGame(play({ delay: 1, centin: NCENT, centis: 3, score: 19_999 }), idle)
    const at = stepGame(play({ delay: 1, centin: NCENT, centis: 3, score: 20_000 }), idle)
    expect(headSpeed(below)).toBe(CENTIS_SLOW)
    expect(headSpeed(at)).toBe(CENTIS_FAST)
  })

  it('a wave start with CENTIS < 3 does NOT shorten or re-speed (walk no-op, :506)', () => {
    // CENTIS 2 (< 3) leaves CENTIN and CENTIS untouched: the re-laid train keeps its
    // length and speed. Proves the walk is GATED, not applied every wave.
    const after = stepGame(play({ delay: 1, centin: NCENT, centis: 2, score: 0 }), idle)
    expect(headSpeed(after)).toBe(CENTIS_FAST) // unchanged 2
    expect(after.centin).toBe(NCENT) // unchanged 12
  })
})

describe('pt1-2 — CONWAY starts ONLY when the walk brings CENTIN to 9 (WP-4/5/6)', () => {
  // The current sim seeds CONWAY on EVERY wave clear (a documented deviation,
  // sim.ts:340-343). The ROM gates it: at the clear where CENTIS reaches 3, only
  // CENTIN == 9 jumps to INICON (MILLI.MAC:1911-1914).
  it('CENTIN == 9 with CENTIS reaching 3 starts CONWAY (positive case)', () => {
    const after = stepGame(play({ segments: [], delay: 0, centin: 9, centis: 2 }), idle)
    expect(after.conway.active).toBe(true)
  })

  it('CENTIN != 9 does NOT start CONWAY (control — RED: every clear seeds it today)', () => {
    // centin 8, CENTIS still reaches 3, but 8 != 9 -> plain wave, no growth.
    const after = stepGame(play({ segments: [], delay: 0, centin: 8, centis: 2 }), idle)
    expect(after.conway.active).toBe(false)
  })

  it('CENTIN == 9 but CENTIS only reaching 2 does NOT start CONWAY (:1908 gate)', () => {
    // The gate is CENTIS == 3 after the INC; a 1 -> 2 clear skips it even at CENTIN 9.
    const after = stepGame(play({ segments: [], delay: 0, centin: 9, centis: 1 }), idle)
    expect(after.conway.active).toBe(false)
  })
})

describe('pt1-2 — BOMBS dive-bomb mode arms and dispatches (DD-95..101, WP-7)', () => {
  it('a wave clear at a BOMBSL CENTIN arms bomb mode: NOCENT + BOMBV (DD-97..100)', () => {
    // centin 7 is in BOMBSL; CENTIS reaches 3. NOCENT := (SCORE2>>1)+20+(SCORE2&1);
    // SCORE2 = 0 -> 20. BOMBV increments from 0 to 1. RED: no nocent/bombv registers.
    expect(BOMBSL).toContain(7) // guard: the setup CENTIN really is an arming level
    const after = stepGame(play({ segments: [], delay: 0, centin: 7, centis: 2, score: 0 }), idle)
    expect(nocentOf(after)).toBe(bombModeStart(7, 0)) // 20
    expect(bombvOf(after)).toBe(1)
  })

  it('the NOCENT budget scales with SCORE2 including the LSR carry (DD-98/99)', () => {
    // SCORE = 50,000 -> SCORE2 = 0x05 -> (5>>1)+20+(5&1) = 2+20+1 = 23. Mutation-worthy:
    // dropping the +carry or the >>1 changes this number.
    const after = stepGame(play({ segments: [], delay: 0, centin: 7, centis: 2, score: 50_000 }), idle)
    expect(nocentOf(after)).toBe(bombModeStart(7, 0x05)) // 23
  })

  it('a non-BOMBSL, non-9 clear arms NOTHING (control)', () => {
    // centin 10: not 9, not in BOMBSL -> a plain wave. No bomb budget, no growth.
    const after = stepGame(play({ segments: [], delay: 0, centin: 10, centis: 2 }), idle)
    expect(nocentOf(after) ?? 0).toBe(0)
    expect(after.conway.active).toBe(false)
  })

  it('the per-frame BOMBS dispatcher drains NOCENT during a bomb wave (WP-7, :28)', () => {
    // BOMBS is JSR-ed every frame and, while NOCENT > 0, enters the register's critter
    // and DECs NOCENT (DD-84/85/91/92). Over many frames the budget must drain. RED
    // when the dispatcher was orphaned: a forced NOCENT never moved.
    //
    // CENTIN 1 picks via BOMBS_CREATURES[0]=$83 (bee/mosquito/dragonfly by RND0), whose
    // slots normal play keeps free enough for the dispatcher to enter — the honest claim
    // is a DRAIN, not a full purge. (A register whose picked critter a normal spawn holds
    // permanently — e.g. CENTIN 7 → dragonfly — cannot drain in this port's 3-typed-slot
    // model; that slot-contention + bomb-train-suppression gap is a documented follow-up.)
    let g = play({ nocent: 20, bombv: 1, centin: 1 })
    for (let i = 0; i < 300 && g.phase === 'play'; i++) g = stepGame(g, idle)
    expect(nocentOf(g), 'the dispatcher must consume the bomb budget').toBeLessThan(20)
  })
})

describe('pt1-2 — the creature-introduction ramp reads the WALKED register, not the live count', () => {
  // The ROM creature gates read `X,CENTIN` — the preserved wave-length register the
  // CENTPC walk steps down each wave — with DEAD (the live segment count) a SEPARATE
  // gate. The sharpest discriminator is the beetle's "NO BEETLES WHEN CENTIPEDE IS
  // FULL" gate (BT-12, CENTIN>=12, `CMP I,12.`/`BCS` MILLI.MAC:265-266): hold the LIVE count fixed at 1
  // (a single keeper segment, DEAD!=0) and vary only the register. If the gate read
  // the live count the beetle would spawn in BOTH cases; because it reads the walked
  // register, CENTIN==12 blocks it and CENTIN==11 admits it. Re-pointing EnemyView.centin
  // back to the live count (the pre-pt1-2 bug) reddens the FULL case.

  /** A lone live body segment far from the gun — keeps DEAD!=0 (so the BEETL gate can
   *  open) without threatening the player or catching a stray shot. */
  const keeper = (): Segment => ({ h: 0xc0, v: 0xd0, dh: 0, dv: 0, pic: 0, color: BODY_COLOR })

  /** The BEETL spawn frame (0x37) with a clear field, a lone keeper segment and the gun
   *  parked away — everything the beetle needs EXCEPT the register verdict. */
  const beetleArmed = (centin: number): GameState => {
    const base = createGame(SEED, { phase: 'play' })
    return {
      ...base,
      frame: 0x37,
      field: new Uint8Array(PLYFLD_SIZE),
      segments: [keeper()],
      player: { ...base.player, h: 0x40, v: 0x30, alive: true },
      shot: { active: false, h: 0, v: 0 },
      centin,
    }
  }
  const beetleLive = (g: GameState): boolean => g.roster.beetles.some((b) => b.color !== 0)

  it('CENTIN register 11 (< 12) admits a beetle — the live count is only 1 either way', () => {
    expect(beetleLive(stepGame(beetleArmed(11), idle))).toBe(true)
  })

  it('CENTIN register 12 (FULL) blocks the beetle though only ONE segment is live (BT-12)', () => {
    // The discriminator: DEAD == 1 here too, so a live-count gate would still spawn it.
    // The register reads FULL, so BEETL is suppressed — the ramp gate is the register.
    expect(beetleLive(stepGame(beetleArmed(12), idle))).toBe(false)
  })
})
