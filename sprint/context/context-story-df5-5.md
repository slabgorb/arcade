# Story df5-5 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df5 design spec. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Smart-bomb + hyperspace (the two emergency powers, both CITING ADR-0005): plugins/defender/src/core/powers.ts — smart-bomb (*SMART BOMB SBOMB defender/DEFA7.SRC:3173,3175; clears on-screen enemies) and hyperspace (*HYPERSPACE HYPER :3211,3213; *RANDOM HYPER DIRECTION :3228; teleport with re-entry risk). Port the ROM trigger + timing and route the PRESENTATION through the existing df4-2 effect-policy — freeze/fade/particle, NOT the ROM's SBMBX0 COM PCRAM whole-page invert (:3199). The df4-2 guard stays GREEN. Consumes df4-1 collision (smart-bomb clear) + df4-2 effects/policy.

## Metadata
- **Story ID:** df5-5
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Problem
Decision B: df5 CITES ADR-0005, it does not re-decide it. df4-2 already built the effect-policy classifier and the no-full-frame-strobe render guard and named these two as its future consumers. Port SBOMB/HYPER trigger+timing, cited; substitute only the strobe PRESENTATION; log a Design Deviation citing ADR-0005; the df4-2 guard must stay green with both powers live. Smart-bomb clears via df4-1 collision; powers are df3 scheduler-driven player actions.

## Technical Approach
Build `plugins/defender/src/core/powers.ts` (pure) — the two emergency powers, **citing**
ADR-0005 (Decision B):

- **Smart-bomb + hyperspace.** Smart-bomb (`*SMART BOMB SBOMB, DEFA7.SRC:3173,3175`) clears
  on-screen enemies via `df4-1` collision; hyperspace (`*HYPERSPACE HYPER, :3211,3213`)
  teleports to a random position (`*RANDOM HYPER DIRECTION :3228`) with re-entry risk. Port
  the ROM trigger + timing, cited (`citations.test.ts` covers the timing constants).
- **ADR-0005 (cited, not re-decided).** The ROM smart-bomb is `SBMBX0 COM PCRAM` (`:3199`) —
  a whole-page invert — and hyperspace flashes on re-entry. Route **both** presentations
  through the `df4-2` effect-policy as freeze/fade/particle. Neither writes a
  whole-framebuffer inversion; the `df4-2` render guard stays GREEN (a planted full-frame
  invert on either path reddens it). Log a 6-field Design Deviation **per power** citing
  `docs/adr/0005-photosensitivity-accessibility-exception.md`.
- **RNG seam.** Hyperspace draws its random destination from the `df3`/seeded rng seam —
  **not** `Math.random` (`purity.test.ts` green). The teleport is bounded to the world and
  never leaves the ship in an invalid state.
- **Processes.** Powers are `df3` scheduler-driven player actions; no per-power `rAF`/tick.

Consumes `df4-1` collision + `df4-2` effects/policy + `df3` scheduler/rng.

## Scope
- **In scope:** `powers.ts` (smart-bomb clear via collision; hyperspace random-teleport with
  risk); ROM trigger+timing cited; both presentations via the `df4-2` safe policy; the guard
  stays green; seeded-rng destination; deviations logged; `claims/*.json`; `purity.test.ts`
  green.
- **Out of scope:** the input binding that fires the powers (shell/input — df7 wiring);
  scoring; the HUD; any **new** accessibility decision (cited, not re-decided).

## Acceptance Criteria
- AC1: plugins/defender/src/core/powers.ts exists (PURE) modelling smart-bomb (SBOMB, defender/DEFA7.SRC:3175 — clears on-screen enemies via df4-1 collision) and hyperspace (HYPER, defender/DEFA7.SRC:3213; random direction defender/DEFA7.SRC:3228 — teleport with re-entry risk); the ROM trigger + timing of each are ported and cited (citations.test.ts covers the timing constants).
- AC2: the smart-bomb and hyperspace PRESENTATION routes through the df4-2 effect-policy as freeze/fade/particle; NEITHER writes a whole-framebuffer inversion — the df4-2 render guard stays GREEN with both effects live (a planted full-frame invert on either path reddens it), and the substitution of the ROM SBMBX0 COM PCRAM strobe (defender/DEFA7.SRC:3199) is logged as a 6-field Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md.
- AC3: hyperspace teleports to a RANDOM position (per *RANDOM HYPER DIRECTION defender/DEFA7.SRC:3228) drawn from the df3/seeded rng seam (not Math.random — purity.test.ts green), with the re-entry risk modelled and cited; a test pins the teleport is bounded to the world and does not leave the ship in an invalid state.
- AC4: powers are df3 scheduler-driven player actions (no per-power rAF/tick); every new constant has a claims/*.json entry verified byte-for-byte under the df1-1 gate; no un-cited src/core value.

## Dependencies
- **df1** — citation gate (df1-1) + purity test.
- **df3** — scheduler + seeded rng (the hyperspace destination).
- **df4-1** — collision (the smart-bomb clear).
- **df4-2** — effects + the ADR-0005 policy/guard (the presentation seam).
- **Blocks:** `df5-7` (the playtest captures the accessibility-safe smart-bomb).

## Design Notes
- **Decision B (RULED):** design spec §4 — **cite** ADR-0005, do not re-decide it; the
  `df4-2` guard must stay green with both effects live.
- **No `Math.random`** — seeded rng only (purity); bound the teleport to the world.
- Line numbers from tool output only; RASM radix (`$hex` vs bare decimal).

---
_Generated by `pf context create story df5-5` from the sprint YAML._
