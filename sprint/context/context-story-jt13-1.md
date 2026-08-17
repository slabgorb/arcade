# Story jt13-1: Landed ostrich with centered joystick should zero stored velocity

## Story Summary
**Type:** bug  
**Points:** 3  
**Priority:** p1  
**Workflow:** tdd  
**Repo:** arcade

## Description
When the ostrich is landed and the joystick is centered (no input), the stored horizontal velocity should be 0. Currently it retains velocity: the ostrich runs in place while landed, and on launch takes off at full horizontal speed. Expected: landing with no directional input zeroes stored horizontal velocity.

## Acceptance Criteria
1. When the ostrich lands with a centered joystick (no directional input), the stored horizontal velocity (PVELX) is set to 0
2. A landed ostrich with zeroed velocity does not run in place horizontally
3. On launch immediately after landing with centered joystick, the ostrich does not take off at full horizontal speed

## Implementation Scope
**Core/Shell Boundary:** The fix is in the core sim (pure, deterministic). The mechanism is in `plugins/joust/src/core/flight.ts` landing/FRCONV logic (:454-476) which currently seeds PVELX from incoming FLYVEL without clearing it when centered. Also relevant: `arena.ts land()` seam.

**Key Source Files:**
- `plugins/joust/src/core/flight.ts` — landing velocity seeds (FRCONV logic)
- `plugins/joust/src/core/arena.ts` — land() method entry point

**What's Broken:**
- `flight.ts:454-476` seeds PVELX from incoming FLYVEL on landing
- Nothing clears PVELX when the joystick is centered at landing time
- The stored velocity persists until the next directional input, causing the in-place run and launch-speed anomalies

## Related Code References
- `flight.ts`: landing frame computation, velocity seed on arrival
- `arena.ts`: land() entry/dispatch
- `input.ts` or similar: joystick center-detection (to decide whether to zero)

## Test Strategy
- **Core test:** Landing with centered joystick → PVELX should be 0
- **Regression:** Ensure landing with directional input preserves expected directional velocity
- **Behavior test:** Landed bird with zero velocity does not drift horizontally; launch velocity is proportional to flap input, not residual PVELX
