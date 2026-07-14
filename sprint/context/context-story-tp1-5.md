# Story tp1-5 Context

## Title
THE CAM, part 2 — the CHASER rim state with its pincer rule, rule-driven flip direction, and the pulsar's program

## Metadata
- **Story ID:** tp1-5
- **Type:** refactor
- **Points:** 6
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Tempest — ROM fidelity against Theurer's original 1981 source

## Problem
Cluster C2, second half. Subsumes W-009 (the CHASER, moved here from tp1-4), W-023, W-026, W-027, W-032. NOTE: W-025 (the pulsar flips TOWARD the player) and W-007 (rule-driven flip direction) were CLOSED BY tp1-4 — the CAM it landed has no random-direction opcode, so there is no coin flip left to remove. What remains here is the CHASER: the rim state with its own counter and pincer rule (TOPPER is already transcribed and byte-verified in the CAM, so the interpreter is done — only the rim STATE is missing). PREREQUISITES LEFT BY tp1-4's REVIEW, all of which this story touches directly: (1) jchpla has no zero-delta branch, but the ROM's JCHPLA does — ASL/IFCC treats a delta of ZERO as positive and sets INVROT to CCW unconditionally, and CHASER CALLS JCHPLA to pick its pincer direction, so a chaser on the player's own lane currently gets a history-dependent direction; (2) fastestFlipperRimSpeed() in src/shell/input.ts still returns the pre-CAM 4 frames/lane — TOPPER's real cadence is a VSLOOP 4 crouch plus JUMP_ANGLE_STEPS/WTTFRA frames (~6.7), so the keyboard escape margin must be re-derived against it; (3) speedFor's default throws at runtime but gives no compile-time exhaustiveness — this story adds a sixth EnemyKind, so use assertNever; (4) the pulse kill (sim.ts) was not widened alongside the mid-jump grab gate.

## Primary source (cite this, not the book)

- **ROM source:** `~/Projects/tempest-source-text/ALWELG.MAC` — Theurer's original 1981
  assembler. The CRLF sibling `~/Projects/tempest-source` is **NOT citable**.
- **Audit doc:** `tempest/docs/2026-07-12-tempest-primary-source-audit.md`.
- The "Tempest vs Tempest" book and `docs/ux/2026-06-27-enemy-roster-rom-extract.md`
  are SECONDARY and were caught wrong repeatedly. Do not cite them.

### The ROM labels this story lands

| Label | ALWELG.MAC | What it does |
|-------|-----------|--------------|
| `ATOP` | 1747 | `JSR CHASER` — an invader reaching the rim converts to a chaser |
| `CHASER` | 1824–1874 | pins invader at `CURSY`; `INMCOU--` / `INCCOU++`; sets `CAMPC` to `TOPPER`; picks chase direction |
| the pincer rule | 1845–1869 | shortest way to player via `JCHPLA`, **unless exactly one other chaser already exists** → send this one the OPPOSITE way |
| `JCHPLA` | 1876–1889 | aim rotation the shortest way to the player |
| `TOPPER` | 2447–2460 | crouch 4 frames (`VSLOOP`), test cursor kill each frame (`VKITST`), jump `WTTFRA` angle-steps/frame around the rim |

### Findings this story closes

W-009 (audit:498, the CHASER), W-023 (:554), W-026 (:575), W-027 (:583), W-032 (:701).
W-025 and W-007 were already closed by tp1-4 — the CAM that landed has no
random-direction opcode, so there is no coin flip left to remove.

## Technical Approach

**Read tp1-4 first — it changed the ground under this story.** `src/core/enemies/`
is now only `cam.ts` (the byte tables) and `interpreter.ts` (the VM). The five
hand-written state machines — `flipper.ts`, `fuseball.ts`, `pulsar.ts`, `spiker.ts`,
`tanker.ts` — **were deleted**. The audit doc predates that: its `Ours:` lines still
cite `src/core/enemies/flipper.ts:16`, a file that no longer exists. Map those onto
`cam.ts` / `interpreter.ts` / `sim.ts` before writing a test against them.

The interpreter and TOPPER's bytes are already transcribed and byte-verified. What is
missing is the rim **STATE** — the CHASER conversion, its counters, and the pincer rule.

Touch points: `src/core/enemies/interpreter.ts` (`jchpla`, line ~214; the opcode
dispatch, ~369), `src/core/enemies/cam.ts` (`VCHPLA` = 0x24, line ~56), `src/core/sim.ts`
(the pulse kill and the mid-jump grab gate), `src/core/rules.ts`, `src/shell/input.ts`.

### The four prerequisites tp1-4's review left — all land here

1. **`jchpla` has no zero-delta branch; the ROM's does.** `ASL`/`IFCC` treats a delta of
   ZERO as positive and sets `INVROT` to CCW *unconditionally*. CHASER calls JCHPLA to
   pick its pincer direction, so a chaser sitting on the player's own lane currently gets
   a **history-dependent** direction. This is a real bug today, not a nicety.
2. **`fastestFlipperRimSpeed()` (`src/shell/input.ts`) still returns the pre-CAM 4
   frames/lane.** TOPPER's real cadence is a VSLOOP-4 crouch plus `JUMP_ANGLE_STEPS`/`WTTFRA`
   frames (≈6.7). The keyboard escape margin must be **re-derived** against that, not
   left at the stale 4.
3. **`speedFor`'s `default` throws at runtime but gives no compile-time exhaustiveness.**
   This story adds a sixth `EnemyKind` — use `assertNever` so the compiler catches the
   next one.
4. **The pulse kill (`sim.ts`) was not widened alongside the mid-jump grab gate.**

## Scope

- **In scope:** the CHASER rim state (conversion, `INMCOU`/`INCCOU` counters, pincer rule),
  the pulsar's CAM program replacing its bespoke stepper, and the four prerequisites above.
- **Out of scope:** re-implementing the CAM interpreter — tp1-4 did that and this story
  depends on it. Do not re-litigate the opcode table.
- **Trap (see the wave/tube fixture note):** a fixture that sets `s.level` without
  `s.tube = tubeForLevel(level)` silently tests level 1's closed circle. Waves 8/9/10/11/14/15
  are OPEN sheets where the tube does not wrap, and the ROM's `;PREVENT WRAP` comment
  (WELTYP/POLDEL) means any modular "shortest way to the player" — which is exactly what
  JCHPLA and the pincer rule compute — is **backwards** past half a board on an open sheet.
  This already hid an inverted-AVOIDR bug through a full review cycle. Test the CHASER
  direction on an OPEN wave, not just wave 1.

## Acceptance Criteria
- Flip direction is derived from the ROM's rule, not from the RNG. A test proves that two enemies in identical positions flip the same way.
- The CHASER rim state exists with the ROM's pincer rule — enemies at the rim converge on the player from both sides rather than milling.
- The pulsar runs a CAM program like every other enemy; its bespoke stepper is gone.
- Depends on tp1-4 (the interpreter). This story does not re-implement it.
- npm test -- citations stays green.

---
_Generated by `pf context create story tp1-5` from the sprint YAML._
