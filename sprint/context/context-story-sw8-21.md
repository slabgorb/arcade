# Story sw8-21 Context

## Title
surface finishGround death gate: port the PHEGD death exit so a last-shield fall on the crossing frame silences PMREB, as sw8-13 did for the space walk

## Metadata
- **Story ID:** sw8-21
- **Type:** bug
- **Points:** 1
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay

## Problem

> ⚠ **CORRECTION (SM, 2026-08-01, measured at `d5e0754`).** The paragraph below is the epic
> description reproduced **verbatim and unedited**. Every ROM citation in it verified exactly:
> `PHEGD:` opens at `WSMAIN.MAC:1642`, the death gate `LDA S.GAS` / `LBMI PHIG0D ;J EXIT WHEN
> DEAD` is at **:1645-1646**, and `JSR PMREB ;FINISH GROUND WITH REBEL` is at **:1673**, below
> that gate inside the `LDA PH.TIM / CMPA #14. / IFEQ` chain — exactly as described.
>
> Two of its `sim.ts` line cites have drifted by one. Use the **measured** values:
> - Cue push: description says `:995-997`; measured **:996-998** (`if` at :996, `events.push`
>   at :997, closing brace at :998). :995 is the last line of the comment above the block.
> - `loseShield`: description says `:1126`; measured **:1127**. :1126 is a blank line.
>
> Both are one-line drifts, not substantive errors — the mechanism described is exactly right.

Found by sw8-13's review (rule-checker #14 family sweep, ROM-verified by Reviewer). The ROM's ground-flying routine PHEGD carries the IDENTICAL death guard sw8-13 ported for space: 'LDA S.GAS / LBMI PHIG0D ;J EXIT WHEN DEAD' (WSMAIN.MAC:1645-1646) sits BEFORE the PH.TIM walk that fires 'JSR PMREB ;FINISH GROUND WITH REBEL' (:1673), so a last-shield fall on the crossing frame silences the finishGround cue on the cabinet. Our surface stepper pushes {type:'tune',tune:'finishGround'} at the speed-crossing (sim.ts:995-997, sw7-18's rider) BEFORE the frame's loseShield resolves (sim.ts:1126), with no lives gate — the cue starts over the death. Same class, same fix shape as sw8-13's 'if (lives > 0)' gate + death-frame describe (tests/core/space-music-milestones.test.ts sw8-13 block is the test template; note the surface crossing is SPEED-driven, not phaseTime, so the fixture differs). Reachable only when the crossing and the last shield share one 0.05s frame.

## Technical Approach

**Location:** `plugins/star-wars/src/core/sim.ts` — the `stepSurface` function contains the cue push at lines :996-998.

**Mechanism:** The finishGround cue is currently pushed unconditionally during the surface speed
crossing, matching neither the ROM's PHEGD death guard nor sw8-13's space port.

> ⚠ **This is NOT a one-line `if` at the cue site, and the description's "same fix shape" phrasing
> hides that.** SM measured the scope: `const lives = surfaceHit.lives` is created at
> **`sim.ts:1128`**, from `loseShield` at :1127 — **131 lines BELOW the cue push at :997**. A
> literal `if (lives > 0)` wrapped around :996 will not compile, because `lives` does not exist
> there yet. The only binding in scope at :996 is `state.lives`, and gating on *that* would be
> **wrong**: it describes a frame *entered* dead, which the dispatcher makes unreachable (see
> Reachability below). The bug is specifically about a shield lost on THIS frame.
>
> Compare sw8-13, which had the ordering for free: in the space stepper `loseShield` is at :633
> and the `if (lives > 0)` gate at :662 — the gate is already downstream of the resolution.
> The surface stepper has the two in the opposite order, so this port must **re-order**, not
> merely wrap. Dev owns the shape; SM measured only that it is feasible — `events` is the same
> array and is still pushed to at :1141, and `scrollSpeed` / `state.surfaceScrollSpeed` are both
> still in scope as far down as :1158, so the crossing test and the push can both move below the
> shield resolution.

**Reachability (measured):** `if (state.mode === 'gameover' || state.gameOver)` at `sim.ts:185`
returns before the phase dispatch at :345/:350, so a frame ENTERED dead never reaches
`stepSurface` at all. The single reachable case is a fatal hit resolving on the very frame the
speed threshold is crossed — the description's "one 0.05s frame" window, confirmed.

**Test template:** The sw8-13 block in `plugins/star-wars/tests/core/space-music-milestones.test.ts` (:348-358) demonstrates the pattern: describe the death-frame milestone crossing, assert the cue is suppressed when death and crossing share the same frame. Surface test will follow the same shape but with speed-driven fixture (not phaseTime).

**Test home:** TEA's call — `plugins/star-wars/tests/core/surface-traversal-end.test.ts` (:226 existing finishGround test, :251-258 space-negative) is the natural location, or surface-specific file if preferred. Existing ownership suggests the traversal-end.test.ts file.

**Key references:**
- Constants: `SURFACE_FINISH_GROUND_SPEED = 0x1e0 * TICK_HZ` (state.ts:723)
- Constants: `SURFACE_ACCEL = TICK_HZ * TICK_HZ` (state.ts:709), `SURFACE_MAX_SPEED = 0x400 * TICK_HZ` (state.ts:705)
- ROM death gate: WSMAIN.MAC:1645-1646 (checked at line :1645, exits at :1646)
- ROM PMREB fire: WSMAIN.MAC:1673 (JSR PMREB ;FINISH GROUND WITH REBEL)

## Scope
- In scope: Gate the finishGround cue push on `lives > 0` to silence PMREB when a last-shield fall coincides with the surface speed crossing.
- In scope: Test coverage for death-frame surface finishGround silence.
- Out of scope: Changes to other ground-phase behavior or other music cues.

## Acceptance Criteria

> These ACs are **SM-derived** — `sprint/epic-sw8.yaml` carries `acceptance_criteria: null` for
> this story, so there is no epic list they must match. AC3 and AC4 were authored by SM after the
> scope measurement above; TEA should challenge them if the RED phase shows they are wrong.

- AC1 — The finishGround cue is not played when a player loses their last shield during the surface speed crossing, matching the ROM's PHEGD death gate (WSMAIN.MAC:1645-1646)
- AC2 — A test case documents the death-frame surface finishGround silence, following the sw8-13 template from space-music-milestones.test.ts (:348-358)
- AC3 — The finishGround cue push is decided against the lives remaining AFTER the frame's shield resolution (`sim.ts:1127-1128`), not before it, so that no `tune`/`finishGround` event is emitted on a frame whose last shield falls
- AC4 — A hit that leaves shields standing still cues finishGround: the gate keys on death, not on damage. The existing `it('cues exactly one finishGround tune during the surface traversal')` (`surface-traversal-end.test.ts:226`) must stay green

---
_Generated by `pf context create story sw8-21` from the sprint YAML._
