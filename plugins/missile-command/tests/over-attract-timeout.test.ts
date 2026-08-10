// plugins/missile-command/tests/over-attract-timeout.test.ts
//
// Story mc6-6 — RED phase (Tyr One-Handed / TEA). CLOSE THE MAINLINE LOOP: after
// phase 'over', a cited-ROM cadence auto-returns the cabinet to 'attract'. Today the
// loop is OPEN — `advancePhase` makes 'over' terminal (state.ts:27) and `stepGame`'s
// 'over' branch only ticks the frame counter forever (game.ts:256). mc6-1 explicitly
// deferred this edge: "over->attract timeout ... is mc6-6" (state-mainline.test.ts:42).
//
// ─── GROUND TRUTH (REV-01, W3MAIN.MAC) ───────────────────────────────────────
// Game-over is the two-phase SETUP jump-table entry ENDGM1/ENDGM2
// (.WORD ENDGM1-1 / ENDGM2-1, W3MAIN.MAC:589/:601):
//   • ENDGM1 (:4617) flips ATRACT back to attract mode immediately (STY ATRACT, Y=0;
//     ATRACT is ";ATTRACT (0)/GAME (-1) FLAG", :135) and hands to ENDGM2.
//   • ENDGM2 (:4683) runs the "final bang": it grows the death explosion from ENDUPD
//     up to ENDMAX and shrinks it back to 0 at ENDUPD dots/frame, THEN sets
//     SETUPC=CDLADR (the attract / DISPLAY-5-HI screen). That grow+shrink span IS the
//     post-game-over hold before the machine is visibly in the attract demo.
//   • Equates (W3MAIN.MAC:4675/:4677), under .RADIX 16 inherited from W3COMN.MAC —
//     the hex reading is FORCED because "THE END" displays at `CMP I,62` (:4713),
//     which must be < ENDMAX for that branch to ever fire: 0x62=98 < 0x6D=109. A
//     decimal ENDMAX=6 would make "THE END" unreachable, self-refuting the decode.
//         ENDMAX =6D   -> 0x6D = 109   ";MAXIMUM EXPLOSION RADIUS"
//         ENDUPD =1    -> 0x01 =   1   ";X DOTS CHANGE IN RADIUS EACH UPDATE"
//
// ─── DESIGN DECISION resolved at RED (see the session's Design Deviations) ────
// The context flagged an open question: model the return faithfully (tie it to the
// growing "THE END" sprite) OR pin one representative fixed-frame constant derived
// from ENDGM2's cadence. TEA chose the FIXED-FRAME model: the sprite-driven animation
// is a render concern (mc6-5's territory) and would drag rendering state into the pure
// core; a 2-point core reducer should stay a pure frame threshold. The hold length is
// the final-bang span = grow (ENDUPD..ENDMAX) + shrink (ENDMAX..0) at ENDUPD/frame =
// 2*ENDMAX/ENDUPD = 218 frames (~3.6s at 60fps). The constant carries the ENDGM1/ENDGM2
// citations; Dev pins it in // comments (not JSDoc — the un-cited-literal scanner strips
// // but not /** */) and, if it lands as a bare literal, files its claim JSON.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/state.ts` exports NEITHER `OVER_TIMEOUT_FRAMES` nor a pure over-timeout
// reducer, so loadTimeout() throws self-describingly (the fleet loader idiom, so
// `tsc --noEmit` stays green while the surface is absent). And `stepGame`'s 'over'
// branch never leaves 'over', so the integration tests that expect 'attract' fail
// today. Dev makes them GREEN.
//
// PARANOIA COVERAGE: the value pin (AC2) is the WRONG-value mutation guard — change the
// constant and the `.toBe` reddens; the boundary tests (AC1/AC4) read the constant, so
// they catch a wrong COMPARISON (off-by-one, > vs >=, timing out a non-over phase)
// independently of the value. The "hold is real" tests forbid an instant/early return.

import { describe, it, expect } from 'vitest'
import { createPlayGame, stepGame, type GameState } from '../src/core/game.js'
import { createCities } from '../src/core/field.js'

// ─── the contract GREEN (Loki / Dev) grows in src/core/state.ts ──────────────
type Phase = 'attract' | 'setup' | 'play' | 'pause' | 'between' | 'over'
interface TimeoutModule {
  // The post-game-over hold, in video frames (2*ENDMAX/ENDUPD; W3MAIN.MAC:4675/:4677).
  OVER_TIMEOUT_FRAMES: number
  // Pure phase reducer: when phase is 'over' AND the game has spent at least
  // OVER_TIMEOUT_FRAMES frames there, return 'attract' (the loop closes); every other
  // phase, and any smaller over-frame count, is returned UNCHANGED. No clock, no entropy.
  advanceOverTimeout: (phase: Phase, framesInOver: number) => Phase
}

// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while the
// over-timeout surface is still absent — the fleet idiom (state-mainline.test.ts).
const STATE_SPECIFIER = '../src/core/state.js'

async function loadTimeout(): Promise<TimeoutModule> {
  const surface = ['OVER_TIMEOUT_FRAMES', 'advanceOverTimeout']
  try {
    const mod = (await import(/* @vite-ignore */ STATE_SPECIFIER)) as Record<string, unknown>
    const missing = surface.filter((k) => mod[k] === undefined)
    if (missing.length > 0) throw new Error(`state.ts lacks over-timeout exports: ${missing.join(', ')}`)
    return mod as unknown as TimeoutModule
  } catch (e) {
    throw new Error(
      'over->attract timeout not built yet — GREEN (Loki) grows src/core/state.ts, PURE: ' +
        'export OVER_TIMEOUT_FRAMES = 2*ENDMAX/ENDUPD = 218 (ENDMAX=0x6D=109, ENDUPD=1; ' +
        'W3MAIN.MAC:4675/:4677 under .RADIX 16, cited // not JSDoc, claim JSON if a bare ' +
        'literal); advanceOverTimeout(phase, framesInOver) -> "attract" iff phase==="over" ' +
        '&& framesInOver >= OVER_TIMEOUT_FRAMES, else the phase unchanged. Then wire game.ts: ' +
        "track frames spent in 'over' and call advanceOverTimeout so the assembled loop closes. " +
        `No clock, no entropy, no shell import. (${(e as Error).message})`,
    )
  }
}

// An all-cities-dead PLAY state: one stepGame resolves it to 'over' (nextPhase sees
// every city dead). We enter 'over' THROUGH stepGame so Dev's wiring records the entry
// itself — never hand-construct a mid-hold 'over' state with a fabricated frame count.
const allDeadPlay = (seed = 1): GameState => {
  const g = createPlayGame(seed)
  return { ...g, cities: createCities().map((c) => ({ ...c, alive: false })) }
}
const OTHER_PHASES: readonly Phase[] = ['attract', 'setup', 'play', 'pause', 'between']

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the timeout constant: value pinned to the ROM derivation (mutation guard)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-6 AC2 — OVER_TIMEOUT_FRAMES is the cited ENDGM2 final-bang span', () => {
  it('equals 2*ENDMAX/ENDUPD = 218 frames (ENDMAX=0x6D, ENDUPD=1; W3MAIN.MAC:4675/:4677)', async () => {
    const { OVER_TIMEOUT_FRAMES } = await loadTimeout()
    const ENDMAX = 0x6d // 109 — W3MAIN.MAC:4675 "ENDMAX =6D" (.RADIX 16)
    const ENDUPD = 0x01 // 1   — W3MAIN.MAC:4677 "ENDUPD =1"
    // grow (ENDUPD..ENDMAX) + shrink (ENDMAX..0) at ENDUPD dots/frame. Derived here from
    // the equates, NOT transcribed from Dev's constant — a wrong constant reddens this.
    expect(OVER_TIMEOUT_FRAMES).toBe((2 * ENDMAX) / ENDUPD) // 218
  })

  it('is a positive whole number of frames (a real hold, not 0 or a fraction)', async () => {
    const { OVER_TIMEOUT_FRAMES } = await loadTimeout()
    expect(Number.isInteger(OVER_TIMEOUT_FRAMES)).toBe(true)
    expect(OVER_TIMEOUT_FRAMES).toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the pure reducer closes the loop: over + full hold -> attract
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-6 AC1 — advanceOverTimeout returns to attract once the hold elapses', () => {
  it("flips 'over' -> 'attract' at exactly OVER_TIMEOUT_FRAMES frames-in-over", async () => {
    const { advanceOverTimeout, OVER_TIMEOUT_FRAMES } = await loadTimeout()
    expect(advanceOverTimeout('over', OVER_TIMEOUT_FRAMES)).toBe('attract')
  })

  it('stays in attract for any count beyond the threshold (does not overshoot back)', async () => {
    const { advanceOverTimeout, OVER_TIMEOUT_FRAMES } = await loadTimeout()
    expect(advanceOverTimeout('over', OVER_TIMEOUT_FRAMES + 1)).toBe('attract')
    expect(advanceOverTimeout('over', OVER_TIMEOUT_FRAMES * 5)).toBe('attract')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the hold is REAL: over holds until the threshold; other phases untouched
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-6 AC4 — before the threshold, over holds; the reducer is scoped to over', () => {
  it("keeps 'over' at frame 0 in over (no instant return)", async () => {
    const { advanceOverTimeout } = await loadTimeout()
    expect(advanceOverTimeout('over', 0)).toBe('over')
  })

  it("keeps 'over' at one frame BELOW the threshold (no early return / off-by-one)", async () => {
    const { advanceOverTimeout, OVER_TIMEOUT_FRAMES } = await loadTimeout()
    expect(advanceOverTimeout('over', OVER_TIMEOUT_FRAMES - 1)).toBe('over')
  })

  it('never times out a non-over phase, even past the threshold (scoped to over only)', async () => {
    const { advanceOverTimeout, OVER_TIMEOUT_FRAMES } = await loadTimeout()
    for (const p of OTHER_PHASES) {
      expect(advanceOverTimeout(p, OVER_TIMEOUT_FRAMES * 2), `${p} must pass through unchanged`).toBe(p)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — purity / clock-freedom: same args -> same result, no wall clock
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-6 AC3 — the reducer is referentially transparent (no clock, no entropy)', () => {
  it('is a pure function of (phase, framesInOver) — repeated calls agree', async () => {
    const { advanceOverTimeout, OVER_TIMEOUT_FRAMES } = await loadTimeout()
    const a = advanceOverTimeout('over', OVER_TIMEOUT_FRAMES)
    // Interpose real elapsed wall time; a clock-driven timeout would drift, a pure one won't.
    for (let spin = 0; spin < 100000; spin++) void spin
    const b = advanceOverTimeout('over', OVER_TIMEOUT_FRAMES)
    expect(a).toBe(b)
    expect(a).toBe('attract')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — WIRED end-to-end: stepGame drives over -> (hold) -> attract in the real loop
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-6 AC5 — the assembled stepGame loop closes over -> attract', () => {
  it("entering 'over' still works (regression: all cities dead resolves to over)", () => {
    const over = stepGame(allDeadPlay(1))
    expect(over.phase).toBe('over')
  })

  it("holds in 'over' for a handful of frames after entry (the hold reaches the shell)", () => {
    let s = stepGame(allDeadPlay(1)) // -> 'over'
    for (let i = 0; i < 10; i++) {
      s = stepGame(s)
      expect(s.phase, `frame ${i + 1} in over must still be 'over'`).toBe('over')
    }
  })

  it("auto-returns to 'attract' once the game-over hold elapses (loop closed)", async () => {
    const { OVER_TIMEOUT_FRAMES } = await loadTimeout()
    let s = stepGame(allDeadPlay(1)) // frame that enters 'over'
    expect(s.phase).toBe('over')
    // Step generously past the hold; the exact flip frame (off-by-one at entry) is pinned
    // by the pure-reducer tests — here we only require the loop DOES close.
    for (let i = 0; i < OVER_TIMEOUT_FRAMES + 2; i++) s = stepGame(s)
    expect(s.phase, 'game-over must time out back to the attract demo').toBe('attract')
  })

  it("the returned 'attract' state is a live demo again (frame advances, phase holds attract)", async () => {
    const { OVER_TIMEOUT_FRAMES } = await loadTimeout()
    let s = stepGame(allDeadPlay(1))
    for (let i = 0; i < OVER_TIMEOUT_FRAMES + 2; i++) s = stepGame(s)
    expect(s.phase).toBe('attract')
    // The attract demo does not fall straight back out of attract on the next tick.
    const next = stepGame(s)
    expect(next.phase).toBe('attract')
    expect(next.frame).toBeGreaterThan(s.frame)
  })
})
