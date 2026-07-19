---
story_id: "sw7-23"
jira_key: "sw7-23"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-23: Cleanup: retire vestigial TIE-flight fields + inert ENEMY_SPEED ramp left by VM-flight wiring (PR #110)

## Story Details
- **ID:** sw7-23
- **Jira Key:** sw7-23
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Priority:** p3

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T16:09:28Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T14:52:34Z | 2026-07-19T14:54:40Z | 2m 6s |
| red | 2026-07-19T14:54:40Z | 2026-07-19T15:26:38Z | 31m 58s |
| green | 2026-07-19T15:26:38Z | 2026-07-19T15:57:50Z | 31m 12s |
| review | 2026-07-19T15:57:50Z | 2026-07-19T16:09:28Z | 11m 38s |
| finish | 2026-07-19T16:09:28Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): a THIRD `toCockpit` copy exists beyond the two T4c names — `normalize(sub(COCKPIT, pos))` appears as a function in `tests/core/helpers/space.ts:31` AND inline at `:147`. Affects `tests/core/helpers/space.ts` (route it through the extracted shared helper too, or leave as test-side — not pinned by this story). *Found by TEA during test design.*
- **Improvement** (non-blocking): `TIE_EXIT_RANGE` (`src/core/state.ts:507`) is consumed ONLY by the peel-cull filter this story removes (`sim.ts:373`). Once the filter is gone it is dead. Affects `src/core/state.ts` (retire it too, or it becomes a new vestigial constant — ironic for a cleanup story; verify no other consumer first). *Found by TEA during test design.*
- **Improvement** (non-blocking): asymmetry to note for the Reviewer — `enemyFireInterval` is deliberately kept as an inert-but-pinned difficulty knob (`gameRules.ts:189-191`), while `enemySpeed` is being RETIRED. Defensible (enemySpeed only seeded the removed `vel`; enemyFireInterval is still a returned wave knob), but call it out so the divergence reads as intentional. Affects `src/core/gameRules.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): the story's "or re-derive an explicit approach-speed target" alternative was consciously DECLINED (see deviation). If later-wave TIEs should actually close faster, that is a separate ROM-authority + playtest story, not this cleanup. Affects `src/core/gameRules.ts` (future work only). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the test-side `toCockpit` copies in `tests/core/helpers/space.ts` (a function at :31 + an inline at :147) were left in place — they are test support, not pinned by T4c, and routing them through the extracted core helper is optional cleanup. Affects `tests/core/helpers/space.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): audit finding **A-014** (`class: DIVERGENCE`, `verdict: CONFIRMED`, `recommendation: accept`) — "Constant approach speed vs the ROM's per-axis thrust" — was an ACCEPTED divergence that sw7-23 has now fully closed (ENEMY_SPEED |vel| scalar → VM per-frame thrust at `TIE_THRUST_RATE = 0x200×tick`, i.e. the ROM's ÷32 C$MF2 basis thrust the finding cited). Marked `remediated_by: sw7-23`. Affects `docs/audit/findings/pair-tie-ai.json`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `WaveParams.enemyFireInterval` is now a symmetric vestigial to the retired `enemySpeed` — `waveParams` returns it but `sim.ts` never consumes it (PR #110's §6 fire gate replaced it); it survives only as a difficulty-knob pinned by `difficulty`/`tie-wave-ramp` tests. Out of sw7-23's scope (L2 named ENEMY_SPEED specifically) and documented as intentional in `gameRules.ts`, so it was correctly left — but it is a clean candidate for a future knob-cleanup story. Affects `src/core/gameRules.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **L2 resolved as RETIRE, not re-derive**
  - Spec source: story title (session scope — highest authority) + context-story-sw7-23.md, L2
  - Spec text: "either retire ENEMY_SPEED/vel or re-derive an explicit approach-speed target"
  - Implementation: tests pin the RETIRE path (enemySpeed / ENEMY_SPEED / Enemy.vel all gone); the re-derive alternative is not tested
  - Rationale: the story TITLE says "retire … inert ENEMY_SPEED ramp" (title = story scope, outranks the description's alternative). Re-deriving would re-introduce a live wave-scaled approach speed, conflicting with PR #110's just-shipped VM-driven-motion design, and needs ROM authority + playtest tuning — outside a 2pt cleanup.
  - Severity: minor
  - Forward impact: an explicit approach-speed, if wanted, is a new ROM-authority story
- **Removed/rewrote sibling tests that assert retired mechanics**
  - Spec source: sibling ACs — difficulty.test.ts / tie-wave-ramp.test.ts (8-6), framing.test.ts (8-6), space-world-metric.test.ts (sw4-1 §A AC#6), tie-strafe-fire.test.ts (9-4)
  - Spec text: those tests assert "later waves approach faster" / "ENEMY_SPEED > 5000, transit 1.5–5 s" / "a peeled-away fighter never fires"
  - Implementation: deleted the approach-speed / ENEMY_SPEED-value / peel-away-fire cases; kept the surviving axes (spawn + fire cadence, TGPROB concurrency cap) and the near-bound fire gate
  - Rationale: they pin behaviour sw7-23 retires; leaving them would break GREEN or enshrine a falsehood. The near-bound gate test (tie-strafe-fire, TIE at range < TIE_NEAR_BOUND doesn't strafe) already covers the peel-away test's real mechanism — the peel latch was decorative.
  - Severity: minor
  - Forward impact: none — surviving coverage is complete
- **Vestigial-fixture sweep (~20 files) deferred to Dev/GREEN**
  - Spec source: story L1
  - Spec text: "retire Enemy.bank / peeling / vel"
  - Implementation: TEA re-seated only the assertion-level tests; the mechanical `vel:[0,0,0]` / `bank` / `peeling:true` fixture drops are specified in the TEA Assessment GREEN manifest for Dev
  - Rationale: `Enemy.vel` is a REQUIRED field today, so a fixture literal cannot be dropped before the field is removed (breaks tsc now). The drops are the mechanical completion of Dev's type change, not goalpost moves — no assertion reads those fixtures' vel (verified; tie-flight.test.ts collects `vel` into a Sample but never asserts it).
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Extended the peel-cull removal to its orphaned threshold `TIE_EXIT_RANGE`**
  - Spec source: story L1 ("Enemy.peeling never set, so the peel-cull filter is permanently false")
  - Spec text: retire the dead peel-cull; L1 names bank/peeling/vel, not TIE_EXIT_RANGE
  - Implementation: after removing the `!(e.peeling && length(e.pos) > TIE_EXIT_RANGE)` filter, TIE_EXIT_RANGE (state.ts) had no remaining consumer, so I retired it too. This required cleaning `space-world-metric.test.ts` (dropped its exit-range value-check block + import) and de-staling the section header + TIE_NEAR_BOUND doc.
  - Rationale: leaving a constant whose only consumer was the removed filter would be a NEW vestigial constant — the exact anti-pattern this cleanup exists to remove. It is part of the peel-cull the story explicitly retires, not new scope.
  - Severity: minor
  - Forward impact: none — TIE_NEAR_BOUND (the fire floor) is untouched and still consumed
- **Re-seated `tie-flight` / `tie-perspective-scale` from `ENEMY_SPEED` onto `TIE_THRUST_RATE`**
  - Spec source: story L2 (retire ENEMY_SPEED); tests tie-flight.test.ts:131, tie-perspective-scale.test.ts:111
  - Spec text: those two used `ENEMY_SPEED` in LOGIC (a swap-detection threshold and an approach-time guard), not just as a fixture value
  - Implementation: swapped both to `TIE_THRUST_RATE` (= 0x200 × TICK_HZ, the real VM per-frame thrust). Values are ≈ the old ENEMY_SPEED (10240 vs 10000), so both stay green and now source from the LIVE speed constant.
  - Rationale: their intent (a TIE swap is a discontinuity; the approach stays playable) survives; the mechanism was stale (referenced the retired scalar since PR #110's VM wiring). More correct, not just compiling.
  - Severity: minor
  - Forward impact: none
- **`toCockpit` extracted into `gameRules.ts`, not a new module or state.ts**
  - Spec source: story T4c ("extract ONE shared core helper")
  - Spec text: does not name the destination module
  - Implementation: placed the shared `toCockpit` in gameRules.ts alongside the other pure spatial rule helpers (aimDirection/collides).
  - Rationale: sim.ts already imports `computeStatus` from tie-status.ts, so defining `toCockpit` in either would create a sim↔tie-status cycle. gameRules.ts is cycle-safe (imports neither), already imports normalize/sub/Vec3, and is the established home for pure rule helpers. state.ts self-disclaims math ("the 3D math lives in math3d.ts, rule functions in gameRules.ts").
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **TEA-1 (L2 = RETIRE, not re-derive)** → ✓ ACCEPTED: the story TITLE ("retire … inert ENEMY_SPEED ramp") is the highest spec authority and settles the fork; re-derive would re-introduce a live wave-speed conflicting with PR #110's VM-driven motion and needs ROM authority — correctly deferred.
- **TEA-2 (removed sibling tests asserting retired mechanics)** → ✓ ACCEPTED: those cases pinned exactly the behavior sw7-23 retires (approach-speed ramp, ENEMY_SPEED value, peel-away fire); the near-bound gate test already covers the surviving mechanism. Verified no coverage lost.
- **TEA-3 (fixture sweep deferred to Dev/GREEN)** → ✓ ACCEPTED: `Enemy.vel` was a REQUIRED field, so the literals genuinely cannot be dropped before the type shrinks; no assertion read those fixtures' vel (confirmed).
- **Dev-1 (extended removal to TIE_EXIT_RANGE)** → ✓ ACCEPTED: it was the peel-cull's own threshold with no other consumer — completing the peel-cull removal the story mandates, not new scope; leaving it would be a fresh vestigial. TIE_NEAR_BOUND (still consumed) correctly retained.
- **Dev-2 (ENEMY_SPEED→TIE_THRUST_RATE re-seat)** → ✓ ACCEPTED: those two used ENEMY_SPEED in LOGIC; TIE_THRUST_RATE is the real VM per-frame thrust (≈ the old value) — the re-seat is more correct, not merely compiling. Verified green.
- **Dev-3 (toCockpit home = gameRules.ts)** → ✓ ACCEPTED: the only cycle-safe home both consumers can import; independently confirmed a DAG (no cycle) by the rule-checker.

No undocumented deviations found — every spec divergence in the diff was logged by TEA or Dev.

## Sm Assessment

**Story:** sw7-23 — 2pt, p3, star-wars, TDD (phased). Follow-up cleanup from PR #110
(TIE choreography-VM + authentic §6 fire cadence, merged 2026-07-19, commit 49fff0e).

**Setup state:**
- Branch `feat/sw7-23-retire-vestigial-tie-flight-fields` cut from star-wars develop
  @ 7c8f528 (sw7-22 #114) — confirmed to include PR #110's `applyManeuver` VM wiring.
- Working tree clean; no open star-wars PRs → merge gate clear.
- Session + context (`sprint/context/context-story-sw7-23.md`) created.

**Scope handed to TEA (RED):** three pure-core cleanup items, no shell.
- **L1** — retire vestigial `Enemy` fields left dead after the VM took over flight:
  `Enemy.bank` (set/read nowhere), `Enemy.peeling` (never set → peel-cull filter
  permanently false), `Enemy.vel` (written by `spawnTie`, read by no space path).
- **L2** — the `RAMP_PER_WAVE`-scaled `ENEMY_SPEED` now only seeds the unread `vel`,
  so later-wave TIEs no longer approach faster. Difficulty already ramps via spawn
  cadence + TGPROB fire cadence — design-consistent but IMPLICIT. **Open design choice
  for Dev/TEA:** retire `ENEMY_SPEED`/`vel` outright, or re-derive an explicit
  approach-speed target. Do not pre-decide; the story leaves it to the pair.
- **T4c** — `toCockpit` duplicated inline in `tie-status.ts` vs the private copy in
  `sim.ts`; extract ONE shared core helper.

**Constraints TEA/Dev must honor:**
- Pure-core (`src/core`) only.
- Keep the full suite green AND `npm test -- citations` green. Several `src/core/sim.ts`
  lines are cited by `docs/audit/findings/*.json`; edits there may drift line numbers.
  Reanchor with `tools/audit/reanchor-citations.mjs --write` — this is legitimate
  line-number reanchoring (star-wars pattern), NOT red-baron citation laundering.

**Jira:** local tracking only (jira_key = story id); no external claim step.

**Routing:** phased/tdd → RED phase owner is TEA (Han Solo).

## TEA Assessment

**Tests Required:** Yes
**Reason:** pure-core cleanup, but the retirements + the toCockpit dedup each need a
pinned RED so GREEN is provable and can't silently un-retire.

**Test Files:**
- `tests/core/tie-flight-cleanup.test.ts` (NEW) — the RED drivers + preservation guards
- re-seated siblings (assertion-level, TEA-owned): `difficulty.test.ts`,
  `tie-wave-ramp.test.ts`, `framing.test.ts`, `space-world-metric.test.ts`,
  `tie-strafe-fire.test.ts`

**Tests Written:** 13 in the new file — 9 RED drivers (fail now, pass after cleanup) +
4 preservation/vacuity guards (green before AND after). Verified via testing-runner:
9 fail / 4 pass in the new file; full suite 1707 pass / 8→9 fail (all in the new file,
zero regressions); `npm run lint` (tsc) exits clean.
**Status:** RED (failing — ready for Dev)

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md` + repo rules)

| Rule / concern | Test(s) | Status |
|----------------|---------|--------|
| Dead code removed, not just orphaned | `no bank/peeling/vel field`, `sim.ts no longer references peeling`, `ENEMY_SPEED gone` | failing (RED) |
| No stringly/loose vestigial API surface (WaveParams) | `waveParams no longer returns enemySpeed` | failing (RED) |
| DRY — single source for shared logic | `tie-status no longer inlines …`, `imports the shared toCockpit` | failing (RED) |
| Behaviour preserved across a refactor | `distant TIE not culled`, `difficulty STILL escalates`, `C_AS space-origin geometry` | passing (guard) |
| No vacuous assertions (self-check) | interface-extraction `pos` guard; **fixed** a vacuous `import[^;]*toCockpit` regex that matched the inline const in this semicolon-free repo | passing |
| Pure core (no DOM / clock / Math.random) | source-reads + fixtures use seeded Rng / makeTie only | n/a (honoured) |

**Rules checked:** the applicable TS-review concerns for a removal/refactor (dead-code,
DRY, API shape, behaviour-preservation, test-quality) all have coverage.
**Self-check:** 1 vacuous assertion found and fixed (the toCockpit-import regex — see
sidecar). All source-read checks are comment-stripped so a docstring can't mask a decl.

---

### GREEN manifest for Dev (Yoda) — exactly what makes the 9 RED drivers pass

**A. src/core removals**
1. `state.ts` `Enemy` interface — delete `bank?`, `peeling?`, and `vel`.
2. `state.ts` — delete `export const ENEMY_SPEED = 10000` (+ its doc block). Only consumer is gameRules.
3. `state.ts` `TIE_EXIT_RANGE` (:507) — retire IF its only consumer was the peel-cull (verify), per the Delivery Finding.
4. `sim.ts:373` — delete the `.filter((e) => !(e.peeling && length(e.pos) > TIE_EXIT_RANGE))` line. Prune `length`/`TIE_EXIT_RANGE` if now unused.
5. `sim.ts` `spawnTie` (:1822 sig `speed` param; :1839 `vel: scale(dir, speed)`) — drop the `speed` param and the `vel` from the returned object (`dir` stays — it still feeds `orient: lookRotation(dir)`; prune `scale` if unused). Update caller `sim.ts:381` `spawnTie(rng, params.enemySpeed, spawnCount, state.wave-1)` → drop the `enemySpeed` arg.
6. `gameRules.ts` — remove the `ENEMY_SPEED` import (:11), the `enemySpeed` field from `WaveParams` (:150), and the `enemySpeed: ENEMY_SPEED * ramp` line (:209). Keep `RAMP_PER_WAVE`/`ramp` (still drives spawn+fire cadence).

**B. T4c — extract one shared `toCockpit`** (pins test #10/#11)
- Extract `toCockpit(pos: Vec3): Vec3 = normalize(sub(COCKPIT, pos))` to a location BOTH `sim.ts` and `tie-status.ts` import (export from sim.ts, or a small shared core module — your call). ⚠ Keep the SPACE-ONLY origin semantics (cockpit = world origin); the C_AS guard catches a retarget.
- `tie-status.ts:65` — replace the inline `const toCockpit = normalize(sub(COCKPIT, e.pos))` with `import { toCockpit } from '…'` + `toCockpit(e.pos)`. (Optional: route helpers/space.ts:31/147's third copy through it too — Delivery Finding.)

**C. Mechanical fixture sweep** (required-field removal → drop the now-excess props; `noUnusedLocals` is ON, so run `npm run lint`/tsc, not just vitest)
- `helpers/space.ts` — `makeTie` (:44) drop `vel:[0,0,0]`; drop redundant `vel:[0,0,0]` at :105/:132; `spawnTieForTest` (:73) drop `speed` handling → `spawnTie(rng, opts.slot, opts.wave)` and drop the `ENEMY_SPEED` import (:17) + `speed?` opt.
- Drop inline `vel: [0, 0, 0]` from these Enemy literals: `events.test.ts` (203/217/230), `shootable-fireballs.test.ts` (96), `extra-life.test.ts` (47), `darth-vader-enemy-rom.test.ts` (92/96), `tie-orientation.test.ts` (37), `tie-flight.test.ts` (211; and remove `vel: e.vel` from the Sample push :136 + `vel` from the `Sample` type — never asserted), `rom-score-values.test.ts` (59), `space-world-metric.test.ts` (173), `tie-fire-cadence.test.ts` (42), `combat-kill-loop.test.ts` (60), `surface-aim-wysiwyg.test.ts` (521), `render.death-star-body.test.ts` (94), `render.lock-on-removed.test.ts` (76), `debug-overlay.test.ts` (104), `render.tie-orient.test.ts` (62), `render.tie-death-fragments.test.ts` (91), `render.tie-explosion-fidelity.test.ts` (119).
- `bank` drops: `tie-wave-ramp.test.ts` (tieToward — drop `vel`/`bank` + the `speed`/ENEMY_SPEED default; also drop the stale local `WaveParams.enemySpeed` field), `tie-strafe-fire.test.ts` (tieToward — drop `vel`/`bank` + speed default; prune now-unused imports).
- `peeling` drop: `tie-inbound-hittable.test.ts:119` — `tieStill([0,0,-900], { peeling: true })` → `tieStill([0,0,-900])`.
- After the sweep prune any now-unused imports (`Vec3`, `scale`, `normalize`, `sub`, `COCKPIT`, `ENEMY_SPEED`) per file.

**Definition of GREEN:** `tie-flight-cleanup.test.ts` all-pass, the full suite green, `npm run lint` (tsc) clean, and `npm test -- citations` green (edits to `sim.ts`/`state.ts` may drift audit citations — reanchor with `tools/audit/reanchor-citations.mjs --write` if so; legitimate line-number reanchoring, NOT laundering).

**Handoff:** To Dev (Yoda) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (src/core — 4):**
- `state.ts` — removed `Enemy.bank/peeling/vel`, `ENEMY_SPEED`, `TIE_EXIT_RANGE`; de-staled the peel section (kept `TIE_NEAR_BOUND` as the fire floor); de-staled the `orient` doc (VM-driven).
- `gameRules.ts` — removed the `ENEMY_SPEED` import + `WaveParams.enemySpeed` + the `enemySpeed: ENEMY_SPEED * ramp` line; added the shared `toCockpit(pos)` helper (the T4c single source).
- `sim.ts` — removed the peel-cull filter, the `TIE_EXIT_RANGE` import, and its private `toCockpit` (now imported from gameRules); dropped `speed`/`vel` from `spawnTie`.
- `tie-status.ts` — replaced the inline `normalize(sub(COCKPIT, e.pos))` with the imported `toCockpit`; pruned `COCKPIT`/`normalize`/`sub`.

**Files Changed (tests — 20):** the vestigial-fixture sweep (dropped now-excess `vel`/`bank`/`peeling` across ~16 files via the shared `makeTie` factory + inline literals), plus assertion re-seats in `difficulty` / `tie-wave-ramp` / `framing` / `space-world-metric` / `tie-strafe-fire` / `tie-inbound-hittable`, and the `ENEMY_SPEED → TIE_THRUST_RATE` re-seats in `tie-flight` / `tie-perspective-scale`.

**Files Changed (audit — 9):** `docs/audit/findings/pair-*.json` — 40 citations reanchored (pure line-number shifts from the src edits; 8 files line-only), plus in `pair-tie-ai.json`: A-006/A-008 verbatims re-spelled (still CONFIRMED), A-014 marked `remediated_by: sw7-23`.

**Tests:** 1714/1714 passing (GREEN). `tie-flight-cleanup.test.ts` 13/13. `tests/audit/citations.test.ts` green. `npm run build` (tsc --noEmit && vite build) clean.
**Branch:** `feat/sw7-23-retire-vestigial-tie-flight-fields` (pushed).

**Handoff:** To next phase (verify).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1714/1714 pass, build clean, no smells, retired symbols only in comments |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer covered test-quality manually — see Rule Compliance #8) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer covered comment-staleness manually — Dev de-staled orient/peel/spawnTie docs) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (rule-checker covered type design) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (N/A — pure-core arcade sim, no auth/input/tenant surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (this story IS a simplification; Reviewer verified no new complexity) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 13/13 TS checks, 34 instances, 0 violations; cycle-free, no masked removals, core/ purity intact |

**All received:** Yes (2 enabled returned clean; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (non-blocking follow-up — enemyFireInterval)

## Reviewer Assessment

**Verdict:** APPROVED

A pure-core cleanup that removes what PR #110 made dead. Both enabled subagents returned clean and independently corroborated the Reviewer's own adversarial pass. Since the whole SM→TEA→Dev→Reviewer pipeline ran in one session, that independent corroboration (esp. the rule-checker's DAG/masked-removal analysis) is the load-bearing check.

### Observations

- **[VERIFIED]** The `toCockpit` extraction is import-cycle-free — `gameRules.ts` imports only `./state` + `@arcade/shared/math3d`; `sim.ts` and `tie-status.ts` import *from* it, never the reverse. Evidence: `gameRules.ts:8` imports, rule-checker DAG (`state → gameRules → {sim, tie-status}`). The obvious alternative (define in sim.ts, import into tie-status.ts) WOULD have cycled — the chosen home is correct.
- **[VERIFIED]** `Enemy.vel`/`bank`/`peeling`, `ENEMY_SPEED`, `TIE_EXIT_RANGE`, `WaveParams.enemySpeed` are removed OUTRIGHT, not masked with a `?? default` — `tsc --noEmit` clean, and a full grep confirms zero remaining Enemy-field reads in src/ or tests/. Evidence: preflight + rule-checker greps; `tie-flight-cleanup.test.ts` source-asserts their absence.
- **[VERIFIED]** Removing the peel-cull filter is behavior-neutral — `peeling` was never assigned, so `sim.ts`'s `!(e.peeling && …)` never fired. No leak: spawning is capped by `movedEnemies.length < WAVE_SIZE` (=3) at `sim.ts:374`, TIEs are removed via `killedTie`/collision. The preservation test (distant TIE survives, count 1) holds identically before and after.
- **[VERIFIED]** The shared `toCockpit` preserves the SPACE-ONLY origin semantics (the documented hazard). `tie-flight-cleanup.test.ts`'s C_AS guard asserts a TIE facing the cockpit sets C_AS and one facing away does not — pinning that the extraction did not retarget the cockpit. Evidence: `gameRules.ts:32` (`normalize(sub(COCKPIT, pos))`, COCKPIT=[0,0,0]), `tie-status.ts:64`.
- **[VERIFIED]** The `ENEMY_SPEED → TIE_THRUST_RATE` re-seat in `tie-flight`/`tie-perspective-scale` is sound and *more* correct: `TIE_THRUST_RATE = 0x200×TICK_HZ` is the live VM per-frame thrust (≈ the old 10000), so the swap-detection threshold and the approach-time guard stay green and now reference the actually-consumed speed. Evidence: `state.ts:451`, both re-seated tests green.
- **[VERIFIED]** Citation integrity maintained — 40 reanchors are pure line shifts (8 non-tie-ai files verified content-identical), A-006/A-008 re-spelled and still CONFIRMED, A-014 correctly `remediated_by: sw7-23` (the constant-vs-basis-thrust divergence it describes is genuinely closed by the VM per-frame thrust). `tests/audit/citations.test.ts` (byte-for-byte re-open) is green.
- **[MEDIUM → deferred]** `enemyFireInterval` is now a symmetric vestigial to the retired `enemySpeed` — `waveParams` returns it but `sim.ts` never consumes it (the §6 fire gate replaced it in PR #110). It survives only as a difficulty-knob pinned by `difficulty`/`tie-wave-ramp` tests. NOT a block: out of sw7-23's L2 scope (which named ENEMY_SPEED specifically), documented as intentional in `gameRules.ts`, and TEA pre-flagged it. Recorded as a non-blocking follow-up.
- **[RULE]** reviewer-rule-checker returned CLEAN — 13/13 TypeScript lang-review checks, 34 instances inventoried, **0 violations**. It independently confirmed the three highest-risk items: (a) `toCockpit`'s home is a proper DAG (`state → gameRules → {sim, tie-status}`), no cycle; (b) every retired field/const was removed OUTRIGHT, not masked with a `?? default`; (c) the `core/` pure-simulation boundary is intact (no DOM/`Math.random`/`Date.now`/`performance.now`/shell imports added). No `[RULE]` finding requires action.
- **[PREFLIGHT]** reviewer-preflight returned CLEAN — 1714/1714 tests pass, `tsc --noEmit && vite build` clean, no new `as any`/TODO/`console.log`/`.skip`, and the retired-symbol grep found matches only in tombstone comments (no live references).

### Rule Compliance (TypeScript lang-review, 13 checks)

Cross-checked against the rule-checker's exhaustive pass (34 instances, 0 violations). Relevant checks for a removal/refactor:
- **#1 type-safety escapes** — 0 new `as any`/`@ts-ignore`/non-null on nullable added.
- **#2 generics/interfaces** — `toCockpit(pos: Vec3)` param immutable by type; `Partial<Enemy>` uses in test factories are legitimate override bags.
- **#4 null/undefined** — the peel filter was DELETED, not converted to a masking `??`/`||`; no new coalescing added.
- **#5 modules** — both new `toCockpit` imports are value imports for value uses; no `.js` needed (bundler resolution, consistent with the file's other relative imports).
- **#8 test quality** — no `as any` in assertions; the local `WaveParams`/`Sample` structural casts access only real runtime fields; the new source-reading test follows the established `darth-tie-rom`/`name-entry` node-env pattern.
- **#13 fix-regressions** — re-scanned the whole diff (it IS the fix); no regression class introduced; `tsc` + full suite green.
- **core/ purity (CLAUDE.md)** — no DOM/`Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame`/shell imports added; `toCockpit` is pure.
- #3/#6/#7/#9/#10/#11/#12 — not applicable (no enums/JSX/async/config/input-boundary/catch/hot-path changes).

### Devil's Advocate

Trying to break it. *Serialization/replay:* `Enemy` is carried in `GameState` for determinism — does shrinking it break same-seed replay? No: nothing read `vel`, the determinism replay tests pass, and there is no cross-version Enemy persistence (localStorage holds high scores only). *Numeric drift:* could moving `toCockpit` change results? It is byte-identical math with the same `COCKPIT=[0,0,0]` at all three former sites, and the C_AS test pins equivalence. *Soft-lock:* could a TIE now never despawn and starve the 3-slot wave? The cull that "would" have removed it never ran (peeling unset), so this is unchanged from PR #110; TIEs reach cockpit-collision (~frame 93 per the aimOrient TODO) and are removed. *Citation poisoning:* could a reanchor have matched a coincidentally-identical line elsewhere and now cite the wrong symbol? The tool reported "0 lost" and the byte-for-byte `citations.test.ts` re-open passes, so every citation resolves to matching text; the 8 non-tie-ai files were verified as line-number-only. *A-014 laundering?* No — it is `remediated_by` (the honest "this was fixed" tag), not a silent `ours` re-point to a decoy; its frozen verbatim stays as historical evidence, exactly like A-009's gone-`moveEnemy` citation. *`_rng` unused in spawnTie:* not a determinism bug — spawnTie deliberately draws no RNG (unchanged from before); the param is retained for caller signature stability. *Confused future dev:* the one real trap is the `enemyFireInterval` asymmetry, which is documented and deferred. No blocker surfaced.

**Handoff:** To SM for finish-story.