# Story jt13-1: Landed ostrich with centered joystick should zero stored velocity

> ## ⚠ REFINED SPEC — owner rulings (2026-08-17), supersede the ACs below where they differ
>
> TEA verified the bug live (`arcade.slabgorb.com/joust/`, from the owner's screen recording):
> a landed mount cycles a **run-in-place** animation and, per code, keeps its stored
> `velXIndex`, which `stepFlight` then launches at full speed. The mechanism is the ROM
> ground table's **`onZero` self-loop** for the running rungs (`GROUND_STATES`,
> `JOUSTRV4.SRC:7165-7168`) — so the current port is arguably ROM-faithful, and this story
> **deliberately overrides it** on the owner's ruling (they own the design and have played
> the cabinet). NOTE: input is **buttons**, not a joystick — "centered/neutral" = no
> left/right button held (`input.dir === 0`).
>
> **The spec the RED tests encode (`plugins/joust/tests/ground-release-decel-jt13-1.test.ts`):**
> 1. **Release skids to 0** — sustained neutral (`dir 0`) on a running mount coasts
>    `velXIndex` to 0 within a few frames, magnitude never increasing; then stays 0. No
>    infinite run-in-place. (This is the RED core; today it stays pinned at ±8 forever.)
> 2. **1-frame GRACE, then decay** — the FIRST neutral frame HOLDS the rung, so
>    touch-and-go / flap-hopping still launches at the landed speed; only *sustained*
>    neutral decays. This is why **jt11-3's `ground-momentum.test.ts` stays green** (its
>    tests only ever take a single neutral step) — its touch-and-go test is now the guard
>    that FORCES the grace. If your implementation lacks the grace, that jt11-3 test goes
>    red: that is the signal, not a regression to "fix" by deleting momentum.
> 3. **No launch fling from rest** — a mount that skidded to rest launches with ~0
>    horizontal drift; a mount launched while HOLDING a direction still travels (control).
> 4. **Instant flip (IN SCOPE)** — pressing the OPPOSITE button turns the bird and runs the
>    other way within a frame or two, velocity re-signed. Already works via the onMinus skid
>    chain; the guard locks it so the fix does not regress it.
>
> **Momentum model:** velocity lives only while a direction is actively held; neutral =
> coast to a stop (after the 1-frame grace). The decel PATH (through the skid states vs
> stepping down the run rungs) is Dev's choice — the tests pin the observable, not the path.
> **Placement:** the grace/coast memory must live on the **process** (like `facing`/
> `prevFlapHeld`), not the shared generated `EntityState` — mirror how `facing` is threaded.
> Full-cabinet green required (vitest + orchestrator + lint).

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
