import type { GameState } from '../../src/core/state'

/**
 * End-of-space staging valid under BOTH phase-end mechanisms, so suites whose
 * intent is merely "at / across the space→next edge" survive sw8-11's port of
 * the ROM time-box without re-litigating their own subjects:
 *
 *  - under the retiring kill quota, `phaseKills: 6` (the old state.ts literal)
 *    trips `phaseCleared()` on the next step;
 *  - under the ported PH.TIM box, `phaseTime: 21` (= 420 ROM frames at the
 *    20 Hz game frame, WSMAIN.MAC:1441-1444) does.
 *
 * Literals on purpose — staging must never re-derive from the constant under
 * audit (sw8-11), or it stays green for ANY value of it. The `as Partial` cast
 * is RED-transitional: it becomes an exact type once `phaseTime` lands in
 * GameState; until then the extra key is inert at runtime.
 */
export const SPACE_PHASE_OVER = { phaseKills: 6, phaseTime: 21 } as Partial<GameState>

/** Mid-box staging: ends the space phase under NEITHER mechanism. */
export const SPACE_PHASE_NOT_OVER = { phaseKills: 0, phaseTime: 0 } as Partial<GameState>

/**
 * For KILL-FRAME carry tests — the next step that lands a kill ends the phase
 * under BOTH mechanisms (any dt): under the quota the kill is the 6th; under
 * the box the clock is already spent, so the killing step is also the warp
 * step. Only meaningful in fixtures that DO land the kill on the next step.
 */
export const SPACE_PHASE_CLOSING_KILL = { phaseKills: 5, phaseTime: 21 } as Partial<GameState>
