# Story sw8-10 Context

## Title
Past-plan TIE supply loops the set's LAST group (TWV2Z), not a bare 1A1 mook — ADASHP clamps WV.LVL to the last group and RESTARTS its loop pointer (WSCPU.MAC:1058-1090), so the endless tail is the 18-entry TWV2Z mix incl. the ±2048 corners; our waveSpawnPlan fallback (sim.ts spawnTie 'past the plan's end') invents a single '1A1' entry. Latent today (wave-1 plan 27 entries vs ≤9 spawns under the 6-kill quota) — bites if quota rises or the phase becomes time-boxed

## Metadata
- **Story ID:** sw8-10
- **Type:** bug
- **Points:** 2
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay

## Background — measured facts (verified by SM against the current tree, 2026-08-01)

Every falsifiable claim in the story description was re-measured at setup and **all
of them hold**. Citations below are current as of `main` @ 447ef2f:

1. **Our fallback invents a mook.** `plugins/star-wars/src/core/sim.ts:2129-2145`
   (`spawnTie`): `const entry = waveSpawnPlan(spaceWave)[spawnIndex]`, then
   `entry?.shape ?? 'TIE'` and `initVm(choreoPc(entry?.choreography ?? '1A1'))` —
   past the plan's end every spawn becomes an invented `'1A1'` TIE. Note the spawn
   *position* comes from `SPAWN_LATERALS[spawnIndex % SPAWN_LATERALS.length]`
   (sim.ts:2130) independent of the entry's `beginLoc` — that pre-existing wiring
   choice is not this story's target, but TEA should be aware of it when asserting
   what "the entry's fields" means (choreography + shape are the fields the fallback
   corrupts).
2. **The plan is finite and does not loop.** `plugins/star-wars/src/core/tie-waves.ts`:
   `waveSpawnPlan` (line 118) flattens the selected set with NO looping. SET A1
   (`TSPWAV[0]`, line 83) = TWV1A(3) + TWV2B(3) + TWV2C(3) + TWV2Z(18) = **27 entries**.
   TWV2Z (lines 65-73) is **18 entries, 9 of them the ±2048 D-corner beginLocs**
   (1D1/1D2/1D3). Every one of the 6 sets ends with TWV2Z, and the past-table
   recycle (`selectWaveSet`, line 112) only ever recycles SETA5/SETA6 — which also
   end with TWV2Z.
3. **The ROM loops the last group.** `reference/atari-source/star-wars-1983/WSCPU.MAC`
   (~:1058-1090), `ADASHP::` — when `WV.LP` is invalid or at end-of-group:
   `INC WV.LVL`, select the wave's set, then
   `LDB WV.LVL / CMPB 0(X)+ / IFHI / LDB -1(X) / ENDIF / STB WV.LVL`
   (**clamps WV.LVL to the set's LAST group index**) and
   `LDD B(X) / STD WV.LP` (**restarts that group's loop pointer at its first entry**).
   So the cabinet's endless tail is the full 18-entry TWV2Z mix, looped in order —
   never a single repeated mook.
4. **The divergence is latent today.** The description claims ≤9 spawns occur under
   the wave-1 six-kill quota vs the 27-entry plan. This is *plausible but was not
   measured at setup* — TEA should measure it in RED (it determines whether the RED
   test must force `spawnIndex` past 27 directly, which it almost certainly should
   regardless).

## Technical Approach (hints — TEA/Dev own the design)

The rule to port is ADASHP's, stated set-relative, not TWV2Z-by-name: **past the
plan's end, supply continues by looping the *selected set's last group*,
entry-by-entry in order, restarting at the group's start on each wrap.** For every
authored and recycled set that last group happens to be TWV2Z — pin that as a fact
of the data, but implement the *rule*. The natural seam is `tie-waves.ts` (extend
`waveSpawnPlan` or add a past-plan resolver) consumed by `spawnTie` (sim.ts:2135),
replacing both `?? 'TIE'` and `?? '1A1'`. Keep it pure-core and deterministic.

⚠ `sim.ts` is cited by the audit gate: `tests/audit/citations.test.ts` re-anchors
against the working tree, so if cited lines shift, run
`plugins/star-wars/tools/audit/reanchor-citations.mjs` (line-number-only drift is
legitimate to re-anchor; see repo memory).

Test surface: `npx vitest run --project star-wars` (from repo root); wave
composition/spawn suites live in `plugins/star-wars/tests/` (tie-waves / spawn
related files).

## Scope
- In scope: past-plan spawn supply behaviour (choreography + shape sourcing) in
  `tie-waves.ts` / `spawnTie`, matching ADASHP's clamp-and-restart loop.
- Out of scope: the `SPAWN_LATERALS` position wiring (pre-existing, noted above);
  kill-quota/wave-length rules; Darth behaviour; anything trench/surface.

## Acceptance Criteria

> ⚠ The sprint YAML has `acceptance_criteria: null`. The four ACs below were
> DERIVED by sm-setup from the story description + the SM's measured facts, and are
> mirrored verbatim from `.session/sw8-10-session.md`, which is the authoritative
> copy. (jt8-6 precedent for derived ACs.)

- **AC1:** When `spawnIndex` exceeds the length of `waveSpawnPlan(spaceWave)`, the code selects the set's LAST group (TWV2Z for SET A1) and loops through its entries in order, restarting at the group's beginning on each wrap, instead of inventing a '1A1' fallback entry.

- **AC2:** The looping respects the group's full entry list (18 entries for TWV2Z, including all ±2048 D-corner beginLocs 1D1/1D2/1D3) and cycles deterministically through them without truncation or modification.

- **AC3:** Test coverage verifies that spawns beyond the plan's end sample the group's entries in cyclic order (e.g., spawnIndex 27, 28, 29... for SET A1 fetch TWV2Z[0], TWV2Z[1], TWV2Z[2]...) and that the choreography and shape reflect the entry's fields, not a synthetic '1A1'.

- **AC4:** The implementation aligns with the ROM's ADASHP behaviour (WSCPU.MAC:1058-1090): when the plan ends, the code clamps to the set's LAST group and restarts that group's loop pointer, ensuring the endless tail recycles the full group mix.

> Note on AC1's parenthetical: "(TWV2Z for SET A1)" is an *example*, not a
> restriction — ADASHP's clamp applies to whichever set is selected, including the
> SETA5/SETA6 recycle past wave 6, and every set's last group is TWV2Z. Tests
> should not hard-code SET A1 as the only case.

---
_Context authored by SM at setup (replacing the generated stub) from measured
evidence; do not regenerate via `pf context create`._
