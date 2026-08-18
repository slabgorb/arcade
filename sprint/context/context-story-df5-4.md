# Story df5-4 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df5 design spec. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Humanoid rescue + the planet-explodes-to-mutant-space panic: plugins/defender/src/core/ — close the df4-3 abduction loop. The RESCUE: catch a falling humanoid (AFALL *ASTRONAUT FALL defender/DEFB6.SRC:925,927; ground test GETALT :933; ASTKIL :399) and return it to the ground. The PANIC (Defender's signature terror): all humanoids lost -> the planet explodes -> every remaining lander becomes a df4-4 mutant (SCZ) en masse. Consumes df4-3 (abduction/AFALL) + df4-4 (the SCZ transform).

## Metadata
- **Story ID:** df5-4
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — game structure & the scanner (phase 4c): waves, scoring + extra men, the humanoid rescue loop and the planet-explodes-to-mutant-space panic, the two emergency powers (smart-bomb + hyperspace, citing ADR-0005), and the pure end-of-game core

## Problem
df4-3 delivered grab -> carry-to-top -> transform-trigger and the AFALL fall-on-carrier-death; df5-4 closes the loop with the CATCH (rescue) and the all-humanoids-lost PANIC that mass-transforms landers to mutants (the df4-4 SCZ). Enemies are df3 scheduler processes; the transform reuses the df4-4 mutant, it does not re-model it. Scoring for the rescue is df5-3 (this story delivers the MECHANIC, points come from score.ts). Colour by df2 palette index only.

## Technical Approach
Close the `df4-3` abduction loop in `plugins/defender/src/core/` — the RESCUE and the PANIC:

- **Rescue (catch).** A falling humanoid (`AFALL *ASTRONAUT FALL, DEFB6.SRC:925,927`; ground
  test `GETALT :933`; `ASTKIL :399`) caught by the ship before it reaches the ground is
  returned to the surface. The catch uses `df4-1` collision — **not** a re-derived overlap
  test. Pure reducer.
- **Panic (planet → mutant-space).** When humanoid count reaches zero → the planet explodes →
  every remaining lander transforms into a `df4-4` mutant (`SCZ`), en masse. The transform
  **reuses** the `df4-4` `SCZ` reducer (no re-model). It fires **exactly once** on the
  zero-humanoid transition — guard against per-frame re-fire.
- **ADR-0005 for the explosion.** If the planet explosion is a full-screen effect, render it
  via the `df4-2` policy as freeze/fade/particle; the `df4-2` no-full-frame-strobe guard
  stays GREEN; log a 6-field Design Deviation citing
  `docs/adr/0005-photosensitivity-accessibility-exception.md`.
- **Processes.** Humanoids and the falling/caught states are `df3` scheduler processes
  (`NEWP,STYPE`) killed via the `df3` kill path — no per-humanoid `rAF`/tick.

Consumes `df4-3` (abduction/`AFALL`) + `df4-4` (`SCZ`) + `df4-1` (collision) + `df4-2` (effect
policy). Rescue/kill **scoring** is `df5-3` — this story delivers the mechanic, not the points.

## Scope
- **In scope:** the catch/rescue mechanic (collision-driven, pure); the zero-humanoid →
  planet-explodes → mass lander→`SCZ` transform, fired once; the explosion routed through
  ADR-0005; humanoids as scheduler processes; `claims/*.json`; `purity.test.ts` green.
- **Out of scope:** rescue/kill SCORING (df5-3); the mutant behaviour itself (df4-4, reused);
  waves (df5-2); the HUD (df7). This story delivers the MECHANIC + the panic, not the points.

## Acceptance Criteria
- AC1: the RESCUE mechanic — a falling humanoid (AFALL, defender/DEFB6.SRC:927) caught by the ship before it hits the ground (GETALT ground test :933) is returned to the surface — is a PURE reducer; the catch uses df4-1 collision, not a re-derived overlap test; every constant gated by a claims/*.json entry.
- AC2: the PANIC trigger — humanoid count reaching zero -> planet explodes -> every remaining lander transforms into a df4-4 mutant (SCZ) — is modelled and cited to the ROM trigger; the transform REUSES the df4-4 SCZ reducer (no re-model), and a test pins that the mass-transform fires exactly once on the zero-humanoid transition, not per frame.
- AC3: the planet-explosion presentation obeys ADR-0005 (no full-framebuffer inversion in a single frame) — the df4-2 render guard stays GREEN with the panic live; if the explosion is a full-screen effect it renders as the safe freeze/fade/particle variant and the substitution is logged as a 6-field Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md.
- AC4: humanoids and the falling/caught states are df3 scheduler processes (NEWP,STYPE) killed via the df3 kill path — no per-humanoid rAF/tick; purity.test.ts stays green; every new constant cited under the df1-1 gate.

## Dependencies
- **df1** — citation gate (df1-1) + purity test.
- **df3** — scheduler + `world.ts`.
- **df4-1** — collision (the catch test).
- **df4-2** — effects + the ADR-0005 policy/guard (the explosion presentation).
- **df4-3** — abduction / `AFALL` chain (the loop this closes).
- **df4-4** — the `SCZ` mutant (the panic mass-spawns these).
- Reads `df5-2` wave/humanoid state for the zero-count trigger. **Blocks:** `df5-7` (the
  playtest can show a rescue).

## Design Notes
- **Fire-once trap:** the mass transform must fire **exactly once** on the humanoid-count→0
  transition, not every frame — assign-then-compare / edge-debounce discipline; anchor the
  test to the transition + mutation-prove.
- **Empty-list trap:** "all humanoids lost" via `humanoids.length===0` must not read true
  before any humanoid spawned (the centipede `segs:[]` lesson).
- ADR-0005 is **cited, not re-decided**; reuse the `df4-4` `SCZ` (do not re-model); line
  numbers from tool output only; RASM radix (`$hex` vs bare decimal).

---
_Generated by `pf context create story df5-4` from the sprint YAML._
