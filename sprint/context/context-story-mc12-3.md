# Story mc12-3 Context

## Title
Pointer-lock TRACKBALL aim, made the DEFAULT (matching centipede/millipede). Missile Command is a trackball cabinet; mc10-1 chose ABSOLUTE aim to kill the twitch of relative-WITHOUT-lock (1px=1unit over a ~2000px canvas) and explicitly deferred 'trackball (relative+pointer-lock, scaled) as an optional later mode'. Build it and default to it: reuse centipede/millipede's createPointerLock + movementX/Y mouse adapter and the EXISTING pure core moveCursor (relative applier + clamp), scaled so it is not twitchy. Completes mc10-1 (not a reversal of its twitch fix) — logged as an ADR-delta. Shell input + reuse of existing core; purity stays green.

## Metadata
- **Story ID:** mc12-3
- **Type:** enhancement
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Missile Command — authentic play & feel, round 3 (owner playtest 2026-08-16)

## Problem
mc10-1 made aim ABSOLUTE to kill the twitch of relative motion without pointer lock (1px=1unit over a ~2000px canvas), explicitly deferring trackball (relative+pointer-lock, scaled) as an optional later mode. This story builds that deferred mode and makes it the default, completing the design without reversing the twitch fix.

## Technical Approach

> ⚠ **CORRECTION: The epic description's file:line anchors are stale (measured 2026-08-16, develop @ ad5c601d). The acceptance criteria below are reproduced verbatim and unedited from the sprint YAML, but the file paths require clarification:**

**Core Architecture (unchanged from mc10):**
- The pure relative cursor applier + clamp is `moveCursor` at `plugins/missile-command/src/core/cursor.ts:71` — **NOT** `game.ts:319/335` (that function contains `attractDriver`, which merely CALLS `moveCursor`).
- The shell entry file is `plugins/missile-command/src/main.ts` — **NOT** `src/shell/main.ts` (that path does not exist).
- The absolute `placeCursor` live-aim call is at `plugins/missile-command/src/main.ts:89` inside the pointermove handler (~lines 74-89).

**Existing Seams (reuse, no new construction):**
- A relative pointer-motion adapter already exists and is currently UNWIRED: `applyPointerMotion(cursor, movementX, movementY)` at `plugins/missile-command/src/shell/input.ts:43`, mapping `dh=movementX, dv=-movementY` (the V-flip) through core `moveCursor`. Main.ts does not currently import it.
- Centipede's reusable pointer-lock controller is `createPointerLock` at `plugins/centipede/src/shell/input.ts:180`; its `movementX/Y` mouse-delta adapter is at `input.ts:55-57`.

**Scope (shell-only + reuse of existing core):**
The real work is:
1. Reuse centipede's `createPointerLock` (no new bespoke lock controller).
2. Rewire `src/main.ts` so clicking the canvas requests pointer lock.
3. While locked, route locked mouse `movementX/Y` to the existing `applyPointerMotion` (via core `moveCursor`) instead of `placeCursor` for live aim.
4. Make this the DEFAULT aim path (kept for all players, not optional).
5. Reset input on lock-exit (centipede parity).
6. Log the switch as a Design Deviation / ADR-delta referencing mc10-1's "trackball as a later mode" deferral — never a silent reversal.

**Purity contract:** This is shell-only + reuse of existing core. `src/core/cursor.ts` is unchanged. `purity.test.ts` must stay green.

## Scope
- In scope: pointer-lock trackball aim as the default, reusing centipede/millipede's lock controller and existing core moveCursor, logged as a Design Deviation (ADR-delta).
- Out of scope: inventing new difficulty parameters, changing the clamp or coordinate handling, modifying src/core.

## Acceptance Criteria
- AC1: clicking the canvas requests pointer lock via the REUSED createPointerLock (from centipede/millipede — no new bespoke lock controller); while locked, mouse movementX/Y drives the crosshair through the existing pure core moveCursor, scaled to a non-twitchy trackball feel; a lock-exit resets input state (centipede parity).
- AC2: the absolute placeCursor path (main.ts:85-89) is no longer the live-aim path (kept only as an explicitly-noted unlocked fallback if retained at all); the switch is logged as a Design Deviation / ADR-delta referencing mc10-1's 'trackball as a later mode' deferral — never a silent reversal.
- AC3: the crosshair still clamps to the play area and preserves the V-flip/coordinate handling (moveCursor unchanged); no clock or entropy enters core; purity.test.ts stays green.

---
_Context created for story setup (mc12-3). ACs reproduced verbatim from sprint YAML. Measured facts as of 2026-08-16._
