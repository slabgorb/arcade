# Story mc5-2 Context

## Title
Sputnik/bomber fly-across launcher (sputnik.ts): plane activates from wave 2 (SPUTWV), flies across firing ICBMs on WSPFIR/WSPLAU cadence, killed x4. REV-01 W3MAIN.MAC:2069/2433

## Metadata
- **Story ID:** mc5-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Missile Command — full enemy roster (REV-01): MIRV, Sputnik/bomber, cruise

## Problem
Missile Command's REV-01 enemy roster includes a fly-across **Sputnik/bomber** —
a plane that crosses the field from wave 2 onward, periodically launching ICBMs
downward, and is worth 4× an ICBM when destroyed. The port currently has no such
entity. mc5-2 adds it as a pure `src/core` reducer and wires it into `stepGame`,
including a new `GameState.sputniks` array whose `length > 0` becomes the
`sputnikActive` signal that mc5-3's `droneRequest` selector (and ultimately mc8-5's
drone) consumes.

## Authoritative references
- **Plan (the spec to execute):** `docs/superpowers/plans/2026-08-08-missile-command-mc5-enemy-roster.md`
  — mc5-2 = **Tasks 3, 4, 5** (full test code is inline there; TEA transcribes it).
- **Design:** `docs/superpowers/specs/2026-08-08-missile-command-mc5-enemy-roster-design.md` §mc5-2.
- **Predecessor pattern:** mc5-1 (MIRV) is DONE/merged/archived — see
  `sprint/archive/mc5-1-session.md` and `plugins/missile-command/src/core/mirv.ts`
  for the established claim + purity idioms.

## Technical Approach
Sputnik is a **distinct fly-across entity** (NOT ICBM-family — that boundary is the
epic's core modeling rule; cruise/MIRV are ICBM-family, Sputnik is its own type with
its own `GameState` array). Three plan tasks, each its own RED→GREEN commit:

- **Task 3 — entity (`src/core/sputnik.ts` + `tests/sputnik.test.ts` + `docs/rom-study/claims/sputnik.json`):**
  `Sputnik { pos, dir: 1|-1, variant: 'bomber'|'satellite', fireTimer }`.
  `spawnSputnik(rng, activationSep)` (random edge/direction, variant from `rand AND 1`,
  vertical band from `SPUTNIK_V_MIN`), `stepSputnik(s, speed)` (advance `pos.h` by
  `dir*speed`), `offscreen(s)`. Constants: `SPUTNIK_WAVE=2`, `SPUTNIK_V_MIN=100`,
  `SPUTNIK_SCORE_MULT=4` — each carries a claim in `sputnik.json`.
- **Task 4 — fire cadence & launch clamp (extends `sputnik.ts`):** per-wave tables
  `WSPFIR`=[128,96,64,48,32,32,16], `WSPLAU`=[240,160,128,128,96,64,32], indexed
  `table-SPUTWV` and clamped to the last row for waves ≥8. `sputnikFireCadence(wave)`,
  `sputnikActivationSep(wave)`, `sputnikFireCount(cruiseOnScreen, icbmsOnScreen,
  budgetRemaining) = max(0, min(MXICON−2·cruise−icbm−1, 4, budget))` (MXICON=7),
  plus `readyToFire(s)`/`reload(s, wave)`.
- **Task 5 — wire into `stepGame` (`game.ts`, `score.ts`, `shell/render.ts`, new
  `tests/sputnik-integration.test.ts`):** add `GameState.sputniks` (seeded `[]`);
  per frame activate (wave≥2 + timer), fly, fire ICBMs into the ICBM array on
  `readyToFire`, drop offscreen planes, kill blast-overlapping planes at ×4 score.
  Functional shell render of the plane (pixel-authentic render is mc9).

## Scope
- **In scope:** the Sputnik entity, its wave-timed fire cadence + launch-count clamp,
  and wiring into `stepGame` incl. `GameState.sputniks` and the `sputnikActive` signal;
  functional (not pixel-authentic) render.
- **Out of scope:** cruise missiles + `droneRequest` selector (mc5-3); smart bombs
  (mc5-4); attract/pause (mc6); high scores (mc7); authentic audio wiring (mc8);
  palette/stamps/pixel render (mc9).

## Acceptance Criteria
- [ ] **AC1 — constants (claimed):** `SPUTNIK_WAVE=2`, `SPUTNIK_V_MIN=100`,
  `SPUTNIK_SCORE_MULT=4` exported, each backed by a claim in
  `docs/rom-study/claims/sputnik.json` and passing `citations.test.ts`.
- [ ] **AC2 — spawn:** `spawnSputnik` yields a plane at a screen edge with a valid
  `dir` (±1), a variant from `rand AND 1`, `pos.v >= SPUTNIK_V_MIN`, and
  `fireTimer = activationSep`; deterministic per seed.
- [ ] **AC3 — flight:** `stepSputnik` advances `pos.h` by `dir*speed` (altitude
  unchanged); a plane eventually reports `offscreen(s) === true`.
- [ ] **AC4 — wave timing:** `sputnikFireCadence`/`sputnikActivationSep` return the
  WSPFIR/WSPLAU rows indexed from wave 2 and clamp to the last row past wave 8.
- [ ] **AC5 — launch clamp:** `sputnikFireCount` caps at 4, shrinks with on-screen
  cruise/ICBM pressure, is never negative, and is clamped by remaining budget.
- [ ] **AC6 — integration:** `createGame` starts with `sputniks: []`; no plane ever
  spawns at wave 1 (SPUTWV gate); a plane activates from wave 2 onward; a blast
  overlapping a plane raises score by 4× the ICBM value and removes the plane; a plane
  reaching the far edge is removed with no penalty.
- [ ] **AC7 — purity + suites green:** `purity.test.ts` stays green (pure, seeded RNG,
  no clock); `npx vitest run --project missile-command` and `npm run lint` pass.

---
_Filled by SM (Ruby Rhod) from plan Tasks 3–5 for the RED handoff; regenerated stub
overwritten. TEA transcribes the inline test code from the plan._
