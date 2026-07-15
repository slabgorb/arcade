---
story_id: "rb4-13"
jira_key: "rb4-13"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-13: THE LOD IS AN ORIENTATION BIT, NOT A DISTANCE — biplane.ts invented LOD_DISTANCE

## Story Details
- **ID:** rb4-13
- **Jira Key:** rb4-13
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T23:20:30Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T22:12:13Z | 2026-07-15T22:14:56Z | 2m 43s |
| red | 2026-07-15T22:14:56Z | 2026-07-15T22:40:28Z | 25m 32s |
| green | 2026-07-15T22:40:28Z | 2026-07-15T22:49:39Z | 9m 11s |
| review | 2026-07-15T22:49:39Z | 2026-07-15T23:09:18Z | 19m 39s |
| red | 2026-07-15T23:09:18Z | 2026-07-15T23:16:41Z | 7m 23s |
| green | 2026-07-15T23:16:41Z | 2026-07-15T23:18:32Z | 1m 51s |
| review | 2026-07-15T23:18:32Z | 2026-07-15T23:20:30Z | 1m 58s |
| finish | 2026-07-15T23:20:30Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

### TEA (test design)

- **Question** (non-blocking): wreck-render.ts:86 currently feeds `wreck.depth` into `biplaneLOD`; with the depth parameter gone Dev must feed SOME orientation for a falling wreck, but the ROM's UPPLEX picture path is untranscribed, so which model a wreck draws is unpinned.
  Affects `red-baron/src/core/wreck-render.ts` (Dev picks — capturing the downed enemy's `facingAway` at kill time is the least-invention option; the wiring guard only forbids feeding a depth).
  *Found by TEA during test design.*
- **Gap** (non-blocking): the D4 bit's RE-SET (a plane turning back toward the viewer — the returning-ace attack) is not modeled by this story; only entry→settle is pinned. In the ROM the bit governs the whole rotation lifecycle, so the ace-pass stories may need a follow-up to flip it during the returning attack.
  Affects `red-baron/src/core/returning-ace.ts` / a future rb4 story (orientation flip during the ace pass).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): once the switch is orientation-keyed, `apparentSpan`, `LOD_APPARENT_SPAN`, and possibly `PLANE_SPAN` in biplane.ts are dead plumbing (they existed only to derive `LOD_DISTANCE`). screen-scale's guard already mandates `LOD_APPARENT_SPAN` gone; Dev should sweep the rest rather than leave dead exports.
  Affects `red-baron/src/core/biplane.ts` (delete the retired apparatus, not just the constant).
  *Found by TEA during test design.*

### Dev (implementation)

- **Question** (non-blocking): under the ROM rule a settled plane killed CLOSE now falls as the 29-point drone wreck (the bit it died wearing), where the old depth rule drew the full model below ≈1732 — a visible change worth a playtest glance.
  Affects `red-baron/src/core/explosion.ts` / `wreck-render.ts` (no code change expected; ratify or file a follow-up if the close-kill wreck reads too sparse).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the ROM's entry rotation is a multi-frame ramp (±40/frame toward zero, RBARON.MAC:2620-2652); the clone's entry flourish settles in ONE calc-frame, so D4 clears on the first step and the full model is visible for a single frame at spawn. If a future story wants the visible entry-turn animation, the ramp is where D4's multi-frame life lives.
  Affects `red-baron/src/core/enemy.ts` (step's facingAway transition would follow the ramp).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): with the D4 re-set unmodeled (TEA's Gap), the FULL model is now a one-calc-frame flash at spawn and the player sees the 29-point drone for essentially the whole flight — the mirror image of the old dead-drone bug. Authentic per DRNPIC for a weave-only sim, but the arcade shows the full model during the ace's attack; the ace-pass orientation-flip follow-up should be sequenced soon, not someday.
  Affects `red-baron/src/core/returning-ace.ts` / the future ace-pass D4 story (PM prioritization).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): the DATA-half legacy citations in biplane.ts (`:6206-6259`, `:6212-6256`, `.DRPNT :6259`) sit in the CRLF staircase's +8 band — against the citable copy the equates are at :6267-6268. Untouched by this diff except the header line (flagged as a finding); the wholesale recalibration belongs with rb4-12's reference/ cleanup.
  Affects `red-baron/src/core/biplane.ts` (legacy citation recalibration, rb4-12's territory).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the in-repo `reference/red-baron/RBARON.MAC` (the CRLF sibling) burned this review pass — a rule-checker verified 24 citations against it and reported them all as violations; every one is correct against the citable copy. rb4-12 should land a breadcrumb (README or removal) so no tool reads that copy for line numbers again.
  Affects `red-baron/reference/red-baron/` (rb4-12).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **D4 lifecycle pinned beyond the literal ACs (spawn rotated-in → settles facing-away ≤ 8 steps → weave never re-rotates)**
  - Spec source: context-story-rb4-13.md, AC-1/AC-3 (+ RBARON.MAC:2620-2652, the bit's set/clear site)
  - Spec text: "The plane model is selected on a 'rotated / facing away' orientation state mirroring PLSTAT+6 bit 0x10" — the ACs pin the mapping, not the bit's evolution
  - Implementation: tests/core/enemy.test.ts additionally pins spawn `facingAway === false`, a flip within 8 calc-frames, and monotone hold for 300 steps
  - Rationale: an unpinned bit lets Dev ship a constant, making one model dead code — the drone model had literally never rendered in the shipped game (the exact historical failure this epic exists to kill); the pinned lifecycle is the ROM's own (D4=1 at entry, cleared only when the entry rotation completes, RBARON.MAC:2645-2652)
  - Severity: minor
  - Forward impact: the returning-ace stories inherit a bit they may need to re-set (logged as a Gap finding)
- **Retirement widened to the whole apparent-size apparatus, not only LOD_DISTANCE**
  - Spec source: context-story-rb4-13.md, AC-2
  - Spec text: "LOD_DISTANCE is gone from src/core/biplane.ts, and enemy.ts:83 no longer cites it as precedent"
  - Implementation: screen-scale.test.ts additionally requires `LOD_APPARENT_SPAN` gone from biplane.ts (tombstoned in both registries)
  - Rationale: the apparent-size threshold IS the depth rule denominated on the other axis — leaving it standing invites re-deriving the retired switch from it ("the old depth rule in screen clothing")
  - Severity: minor
  - Forward impact: none — the constants have no consumer once biplaneLOD keys on the bit

### Dev (implementation)
- **Entry rotation settles in one calc-frame (TEA's bound allowed up to 8)**
  - Spec source: context-story-rb4-13.md AC-1 + tests/core/enemy.test.ts (settle ≤ 8 steps); RBARON.MAC:2620-2652
  - Spec text: ROM ramps the entry Y-rotation ±40/frame to zero, THEN clears D4
  - Implementation: `step` sets `facingAway: true` unconditionally — the clone's ±90° entry flourish is already replaced by the weave bank on the first step, so the bit clears with it
  - Rationale: minimal code that matches the clone's existing one-frame flourish; a multi-frame ramp would be new animation this story's ACs don't ask for (logged as an Improvement finding)
  - Severity: minor
  - Forward impact: a future entry-animation story would move the transition onto the ramp; the ≤ 8 test bound leaves room
- **Wreck and blimp-target orientation values are choices, not ROM bytes**
  - Spec source: TEA Delivery Finding (Question) on wreck-render.ts:86; ROM UPPLEX picture path untranscribed
  - Spec text: "feed an orientation, never a depth — capturing the downed enemy's facingAway at kill time is the least-invention option"
  - Implementation: `Wreck.facingAway` captured in `explode()` (the wreck keeps the model it died wearing); `blimpTarget` supplies `facingAway: true` (a cruising airship is settled; only the wreck path reads it)
  - Rationale: least invention — no new rule, the bit just rides the existing kill pipeline
  - Severity: minor
  - Forward impact: a UPPLEX picture-path transcription story could overrule both values
- **Two test files touched — type-sync only, no assertion changed**
  - Spec source: TDD discipline (Dev does not edit tests to go green)
  - Spec text: tests are TEA's; Dev edits source
  - Implementation: `tests/core/explosion.test.ts` local Wreck mirror + `tests/core/blimp.test.ts` `asTarget` gained the `facingAway` field so the suite typechecks against the new required fields
  - Rationale: mechanical contract-mirror sync for fields TEA could not know Dev would add (Wreck) — the same class of literal patch TEA applied to the other five files; every assertion is untouched
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)

Stamps on the five logged deviations:

- **TEA: D4 lifecycle pinned beyond the literal ACs** → ✓ ACCEPTED by Reviewer: the dead-code hazard is real and historical; the lifecycle pinned is the ROM's own. (Note: the pin inverts the exposure — see Reviewer Gap finding on the full model becoming a one-frame flash; that is the ACs' documented scope boundary, not a defect of the deviation.)
- **TEA: retirement widened to the whole apparent-size apparatus** → ✓ ACCEPTED by Reviewer: the apparent-size threshold is the same rule on the other axis; leaving it standing invites re-derivation. Tombstones in both registries are the right mechanism (SHELL_DRAW_FAR precedent).
- **Dev: entry rotation settles in one calc-frame** → ✓ ACCEPTED by Reviewer: matches the clone's existing one-frame flourish; the ≤8 test bound leaves the multi-frame ramp open for the entry-animation follow-up. Agrees with author reasoning.
- **Dev: wreck and blimp-target orientation values are choices** → ✓ ACCEPTED by Reviewer: least-invention, follows TEA's finding verbatim; UPPLEX transcription can overrule later. HOWEVER the chosen semantics are currently UNTESTED — see [TEST] findings 2 and 3 in the assessment; acceptance of the choice is not acceptance of the missing coverage.
- **Dev: two test files touched — type-sync only** → ✓ ACCEPTED by Reviewer: verified against the diff — mirror interface + one literal gained the field; zero assertions changed (rule-checker instances 8.2/8.6 concur).

Undocumented deviations found: none — the diff does what the logged record says it does.

## Sm Assessment

**Decision:** Setup complete — story rb4-13 is viable and ready for TEA (red phase).

- **Session file:** created with `Workflow: tdd`, `Phase: setup`; verified on disk (no pre-advanced red row, no parenthetical workflow tag).
- **Branch:** `fix/rb4-13-lod-orientation-bit` created in red-baron off `develop`, recorded in epic-rb4.yaml.
- **Tracking:** story moved `backlog → in_progress` in `sprint/epic-rb4.yaml`; no epic-context clobbering (diff verified).
- **Jira:** none — local YAML tracking only (`jira_key` mirrors story id).
- **Context:** `sprint/context/context-story-rb4-13.md` carries the full ROM diagnosis (DRNPIC at RBARON.MAC:4961-4963 branches on PLSTAT+6 bit 0x10 — orientation, not depth) and four ACs, including the mutation-test requirement: same depth, two orientations, two models; the old depth rule must turn the suite red.
- **Routing:** tdd is phased → next agent is TEA for the red phase. TEA must pin the MODEL CHOICE against orientation state — a test staged at a convenient depth cannot see this defect (rb4-1's trap).

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a (behavioural rewrite of the model-switch rule — the story's entire point is a test the old suite could not express)

**ROM verification (independent, against the citable quarry ~/Projects/red-baron-source-text):**
- `RBARON.MAC:4961` `DRNPIC: LDA PLSTAT+6 ;PLANE ROTATED` / `:4962 AND I,10` / `:4963 BEQ 20$` — confirmed; `.RADIX 16` set at :74 holds, so `10` = 0x10 = bit D4.
- `:2652` `STA PLSTAT+6 ;D4=0 (PLANE FACING AWAY)` — confirmed; the surrounding :2620-2652 block ramps the entry Y-rotation to zero and only then clears D4. No depth compare anywhere in the picture path.
- Bit clear → `20$`: `.DRPNT` (29-pt) + `DB.MAR`; bit set → fall-through: DRNTST scale-down + `DB.MAP` back faces. The story's diagnosis is byte-accurate.

**Test Files:**
- `tests/core/biplane.test.ts` — distance-LOD suite REWRITTEN as the orientation switch: D4 mapping (points + connect lists per DRNPIC branch, AC-1/AC-4), drawn-budget 54/30, model-instance stability, and the AC-3 matrix (same depth two orientations two models, swept depth {320, 1000, 1732, 2500, 4224} one model — no depth threshold can pass it).
- `tests/core/enemy.test.ts` — `Enemy.facingAway` (the PLSTAT+6 D4 mirror) added to the RED contract mirror; spawns rotated-in (`false`), settles facing-away ≤ 8 steps, weave never re-rotates (300-step hold); the AC-3 matrix at the render seam via `withEnemy` at P_MNDP/1732/P_INDP — DEPTH-ANTICORRELATED, so a depth-derived bit dies too. AC-7 seam now feeds the bit.
- `tests/core/depth-scale.test.ts` — REGISTRY 6/7 rewritten as a RETIREMENT entry: `LOD_DISTANCE` gone from biplane.ts (AC-2a), `enemy.ts` no longer cites it (AC-2b), both models reachable at one depth; `LOD_DISTANCE` tombstoned in REGISTERED (the SHELL_DRAW_FAR precedent), `LOD_APPARENT_SPAN` tombstoned in NOT_A_DEPTH.
- `tests/core/screen-scale.test.ts` — apparent-size LOD describe rewritten as a tombstone: `LOD_APPARENT_SPAN` gone from biplane.ts, orientation swaps the model; both screen-registry entries reworded; the main.ts renderModel fence survives unchanged (still `biplaneLOD(...)`-only).
- `tests/lod-orientation-wiring.test.ts` — NEW wiring guard (multiplane-wiring house pattern): main.ts must feed `biplaneLOD(enemy.facingAway)`; NO call site (main.ts, wreck-render.ts) may feed a depth into `biplaneLOD` — the depth rule must die, not relocate.
- Literal patches so Dev never edits tests: `facingAway` added to Enemy literals in `engagement.test.ts`, `tracer-seam.test.ts`, `screen-scale.test.ts` (targetAt), `cockpit-draw-path.test.ts` (all orientation-blind assertions; value commented).

**Tests Written:** 16 new/rewritten tests covering all 4 ACs
**Status:** RED (verified twice — direct `npx vitest run`: full suite 1023 tests, 1008 pass, **15 fail, every failure an intended rb4-13 test**, all assertion failures; testing-runner corroborates the same per-file failure counts 2/5/3/3/2). Committed on `fix/rb4-13-lod-orientation-bit` as `e61913b` (tests only).

**Expected-red lint:** 27 tsc errors, ALL test-side, all die at GREEN: 22× TS2345 (`biplaneLOD(boolean)` vs the old `(depth: number)` signature — the wished-for API), 4× TS2353 (`facingAway` excess property until Enemy carries it), 1× TS2352 (enemy.test.ts module-cast overlap, same cause). No `as any` used anywhere — the red typecheck IS the spec pressure.

**GREEN contract (for The Word Burgers):**
1. `biplaneLOD(facingAway: boolean): BiplaneModel` — `true` ⇔ D4=0 → DRONE_POINTS + DB_MAR; `false` ⇔ D4=1 → PLANE_POINTS + [...DB_MAP, ...DB_MAR, ...DB_LNS]. Depth parameter GONE; stable instances.
2. `Enemy.facingAway: boolean` (readonly): `spawn` → `false`; `step` flips it once the entry flourish settles (≤ 8 steps) and never back.
3. Delete `LOD_DISTANCE`, `LOD_APPARENT_SPAN` (and their dead plumbing — `apparentSpan`, likely `PLANE_SPAN`) from biplane.ts; fix the `enemy.ts:83` comment citing LOD_DISTANCE as precedent.
4. main.ts: `biplaneLOD(enemy.facingAway)`; wreck-render.ts: feed an orientation, never a depth (see Delivery Finding — capturing the enemy's bit at kill is the least-invention option).
5. `waves.ts` spawnWave and any other Enemy constructors must set the field (compiler will point at them).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | no `as any`/`@ts-ignore` added; wished-for API typed as plain boolean | enforced by review of own diff |
| #2 readonly params/fields | `facingAway` declared readonly in the contract mirror; model-instance stability test (`toBe` identity) pins that biplaneLOD selects frozen constants | failing (stability: `not.toBe` leg) |
| #4 null/undefined handling | spawn test asserts `.toBe(false)` strictly — an omitted field (undefined) fails; no truthiness coercion anywhere | failing |
| #8 test quality | self-check done: no vacuous assertions, no `let _`, every `it` pins a concrete value; the one existence check (wiring file non-empty) guards the read-as-text pattern | 1 passing by design |
| #3, #5, #6, #7, #9 | no enums / module-shape changes / JSX / async / build-config surface in this story's test scope | n/a |

**Rules checked:** 4 of 4 applicable lang-review rules have test coverage (5 n/a)
**Self-check:** 0 vacuous tests found in new code; the retired depth-LOD tests (which could only ever bound, never measure — the rb4-1 trap) were deleted with the rule they pinned

**Handoff:** To The Word Burgers (Dev) for GREEN — implementation only; no test edits should be needed.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/biplane.ts` — `biplaneLOD(facingAway: boolean)` mirrors DRNPIC's D4 branch exactly; `FULL_MODEL`/`DRONE_MODEL` module constants (stable instances); the whole invented depth apparatus DELETED (`LOD_DISTANCE`, `LOD_APPARENT_SPAN`, `apparentSpan`, `PLANE_SPAN`, the `frustumHalfHeight` import); header + switch comments now cite the ROM rule.
- `src/core/enemy.ts` — `Enemy.facingAway` (readonly, doc'd against PLSTAT+6 D4); `spawn` → `false` (rotated-in at entry); `step` → `true` (entry flourish settles on the first calc-frame, per the :2620-2652 ramp's completion semantics); the `enemy.ts:83` LOD_DISTANCE precedent citation removed.
- `src/core/explosion.ts` — `Wreck.facingAway` captured at `explode()`: the wreck keeps the model the plane died wearing.
- `src/core/wreck-render.ts` — falling wreck drawn via `biplaneLOD(wreck.facingAway)`.
- `src/core/blimp.ts` — `blimpTarget` supplies `facingAway: true` (settled airship; wreck path only).
- `src/main.ts` — enemy render feeds `biplaneLOD(enemy.facingAway)`; comment updated.
- `src/core/returning-ace.ts` — stale "LOD switch" placement comment updated (history preserved, mechanism marked retired).
- `src/core/waves.ts` — no change needed: drones spread the lead (`{ ...lead, … }`), inheriting the bit.
- `tests/core/explosion.test.ts`, `tests/core/blimp.test.ts` — type-sync ONLY (mirror interface + asTarget literal gained the field); zero assertions changed. Logged as a deviation.

**Tests:** 1023/1023 passing (GREEN — was 15 red), 56 files; `tsc --noEmit` 0 errors; `vite build` clean. Verified by direct run and corroborated by testing-runner (RUN_ID rb4-13-dev-green).
**Branch:** `fix/rb4-13-lod-orientation-bit` (pushed; commits `e61913b` tests, `1806357` implementation — net −21 lines)

**AC check:** AC-1 model follows the bit at any depth ✓ (unit matrix + seam matrix green); AC-2 LOD_DISTANCE gone from biplane.ts and enemy.ts ✓ (registry guards green); AC-3 same-depth/two-orientations test in place and was RED against the depth rule ✓; AC-4 full model carries DB.MAP back faces, drone carries DB.MAR front list ✓.

**Handoff:** To next phase per workflow (verify/review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1023/1023 green, lint 0, build clean, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | Yes | skipped | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | skipped | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (all mutation-proven) | confirmed 4, deferred 1 |
| 5 | reviewer-comment-analyzer | Yes | skipped | N/A | Disabled via settings |
| 6 | reviewer-type-design | Yes | skipped | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — no type escapes, no DOM injection, wiring-test read paths verified safe |
| 8 | reviewer-simplifier | Yes | skipped | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 26 (24 rule-17 + 1 header cite + 1 stale comment) | confirmed 2, dismissed 24 (wrong quarry copy — evidence below) |

**All received:** Yes (4 ran, 5 disabled via settings; every runner returned a structured result)
**Total findings:** 6 confirmed, 24 dismissed (with rationale), 1 deferred

**Dismissal evidence (rule-checker rule 17, 24 citation "violations"):** the checker verified line numbers against `red-baron/reference/red-baron/RBARON.MAC` and corroborated with `R2BRON.MAC`. Per the epic context, the citable primary source is `~/Projects/red-baron-source-text` and the reference copy is the CRLF sibling whose line numbers run a STAIRCASE short (+8 in these bands); R2BRON is the decoy build whose self-agreement proves nothing. Reviewer re-verified every load-bearing citation against the citable copy directly: `:74` = `.RADIX 16` ✓, `:2652` = `STA PLSTAT+6 ;D4=0 (PLANE FACING AWAY)` ✓, `:4961-4963` = `DRNPIC: LDA PLSTAT+6 ;PLANE ROTATED` / `AND I,10` / `BEQ 20$` ✓. The code cites the citable copy correctly; the checker read the wrong quarry. (The two grains that survive: the touched header line's `(RBARON.MAC:6258)` — the equates are at `:6267-6268` in the citable copy — and the stale `LOD_DISTANCE` comment in radix-transcription.test.ts:117.)

### Rule Compliance

Rule-by-rule over the lang-review TypeScript checklist, per the rule-checker's 63-instance enumeration, cross-checked by me:

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 7 (all changed functions/calls) | compliant — no `as any`/`!`/casts anywhere in the diff |
| #2 generic/interface pitfalls | 4 (both new fields + both test mirrors) | compliant — `readonly facingAway: boolean` throughout |
| #3 enums | 0 | n/a — none touched |
| #4 null/undefined | 4 (all facingAway assignments) | compliant — boolean literals/copies, no `||`/`??` coercion |
| #5 module/declaration | 4 (import trims incl. removed `frustumHalfHeight`) | compliant — no dangling imports, tsc clean with noUnusedLocals |
| #6 React/JSX | 0 | n/a |
| #7 async | 0 | n/a — all touched code pure/sync |
| #8 test quality | 10 test files | compliant — no `as any`, no skip/only, mirrors field-exact |
| #9 build/config | 0 | n/a — no config touched |
| Repo: depth-axis registry | 1 | compliant — constant REMOVED and tombstoned, nothing new on the axis |
| Repo: screen-axis registry | 3 | compliant — LOD_APPARENT_SPAN/PLANE_SPAN removed + tombstoned |
| Repo: main.ts renderModel fence | 3 | compliant — the one main.ts renderModel call takes `biplaneLOD(enemy.facingAway)` (src/main.ts:197, code not comment — verified) |
| Repo: ROM citations cite the citable copy | 24 | compliant in 23 (dismissals above); 1 violation on the touched header line (biplane.ts:14, `:6258` → should be `:6267-6268`) |

### Devil's Advocate

Assume this diff is broken and argue it. First, the guard that is supposed to make the depth rule unrepresentable is a regex over raw file text, and the file's own documentation contains the exact string the regex hunts. A future Dev aliases the import — `import { biplaneLOD as pickModel }` — computes `pickModel(enemy.depth > 1732)`, and the wiring test stays green because a COMMENT satisfies it. That is not hypothetical: the test-analyzer ran precisely that mutation and the suite stayed green until the comment was also deleted. The story that exists to kill scenery guards shipped one. Second, what the player actually sees has quietly inverted: the epic's cautionary tale was a drone model that never rendered; under this diff the FULL model renders for one 96 ms calc-frame per plane and never again — dogfights are now conducted against 29-point silhouettes at point-blank range, where the 1980 cabinet showed a 42-vertex plane with back faces filling the screen during the ace's pass. Every line of that is authentic to DRNPIC given a weave-only sim, and every line of it is also a fidelity hole parked on a follow-up story that does not exist yet. Third, the wreck: `explode()` claims the wreck keeps the model it died wearing, and nothing in 1023 tests would notice if it hardcoded `true` — the analyzer proved that too. A confused future editor could break the capture, ship it, and the suite would smile. Fourth, the citations: this review nearly filed 24 false violations because a wrong-copy quarry sits INSIDE the repo looking authoritative; the next reviewer without this session's scar tissue may "fix" 24 correct citations into wrong ones — a laundering vector the repo should close (rb4-12). The first and third arguments are findings; the second and fourth are delivery findings. The devil earns his fee today.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — round 1 was REJECTED; the table below is round 1's work order, all rows now closed. Re-review evidence at the end of this section.)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST][RULE] | Wiring guard satisfiable by PROSE: the positive regex matches the doc comment at main.ts:185 (which contains the literal `biplaneLOD(enemy.facingAway)`), so an aliased depth-threshold call passes the guard — mutation-proven by the test-analyzer, comment/code duplication verified by me (main.ts:185 vs :197) | `tests/lod-orientation-wiring.test.ts:42-63` | Strip `//` and `/*…*/` spans from the read text before every regex (positive AND negative); add the symmetric positive assertion for wreck-render (`biplaneLOD(wreck.facingAway)`) |
| [MEDIUM] [TEST] | `wreckSegments` model choice untested — hardcoding `biplaneLOD(true)` in the falling branch survives all 1023 tests | `src/core/wreck-render.ts:87` | Behavioral test: same-pose Wrecks with `facingAway` true/false → 30 vs 54 segments (mirror the biplane matrix) |
| [MEDIUM] [TEST] | `explode()` bit propagation untested — hardcoding `facingAway: true` survives; the "keeps the model it died wearing" semantic is scenery | `src/core/explosion.ts:115` | `expect(explode({...e, facingAway: false}).facingAway).toBe(false)` + the true counterpart in explosion.test.ts |
| [MEDIUM] [TEST][DOC] | AC-3 seam test docstring overclaims: "A depth-derived bit ALSO dies here" is false for derivations inside enemy.ts (hand-set `withEnemy` bypasses spawn/step — mutation-proven) | `tests/core/enemy.test.ts:667-676` | Correct the docstring to what the test proves (the seam mapping bit→model at swept depths); the lifecycle tests carry the spawn/settle claims |
| [LOW] [RULE][DOC] | Touched header line carries a legacy citation wrong against the citable copy: `(RBARON.MAC:6258)` — the `.PLPNT`/`.DRPNT` equates are at `:6267-6268` (CRLF +8 band) | `src/core/biplane.ts:14` | Cite `:6267-6268`; leave untouched legacy DATA-half cites to rb4-12 (delivery finding filed) |
| [LOW] [DOC] | Stale comment references the retired `LOD_DISTANCE` as a live obligation | `tests/audit/radix-transcription.test.ts:117` | One-line comment fix |

**Deferred (1):** test-analyzer's settle-test finding (a near-spawn depth-derived `facingAway` transition survives) — the surviving mutant is OBSERVATIONALLY EQUIVALENT in every reachable state (`closeSpeed < 0` at every level ⇒ depth < P_INDP from step 1 ⇒ trajectories identical to entry-settle); killing it requires injectable close-speed, scope creep for zero behavioral coverage. Revisit when the ace-pass story gives the bit a mid-flight lifecycle.

**Dispatch tags:** [TEST] and [RULE] findings above; [SEC] clean (verified — no type escapes, no injection surface, wiring-test file reads safe with non-empty backstop); [EDGE], [SILENT], [DOC*], [TYPE], [SIMPLE] specialists disabled via settings — [DOC]-class issues surfaced via test-analyzer/rule-checker instead; edge/silent/type/simple domains covered by my own pass (boolean-total switch, no swallowed errors in the diff, `readonly boolean` fields, net −21 lines with dead apparatus deleted — nothing to simplify further).

**Verified good (evidence):**
- [VERIFIED] The D4 mapping matches the ROM, direction proven two ways: citable RBARON.MAC:4961-4963 (`BEQ 20$` on bit-clear → `.DRPNT` + DB.MAR) vs `facingAway ? DRONE_MODEL : FULL_MODEL` at biplane.ts:140-142; and structurally — DB.MAP indexes vertices 29-41, which only the 42-point set carries, so bit-set can only pair with the full model. Complies with the citable-copy rule.
- [VERIFIED] AC-3's own mutation demand executed by me, serially, on a clean tree: depth rule restored into biplaneLOD → 9 tests red across 4 suites; reverted → 1023/1023 green.
- [VERIFIED] The biplane unit matrix is airtight — the analyzer could not construct a surviving mutation against it; the boolean signature makes a depth rule unrepresentable at the function boundary.
- [VERIFIED] main.ts wiring is correct IN CODE: src/main.ts:197 feeds `enemy.facingAway` (distinguished from the :185 comment by direct grep).
- [VERIFIED] Registry tombstones armed: `LOD_DISTANCE` kept in REGISTERED with tombstone comment; `LOD_APPARENT_SPAN`/`PLANE_SPAN` tombstoned in both sweeps' allowlists — reintroducing any name re-arms its guard.
- [VERIFIED] Data flow: spawn(false)/step(true) → Enemy.facingAway → main.ts:197 → renderModel → strokeSegments; kill path: enemy.facingAway → explode() capture → wreckSegments:87. (The capture link is correct today and untested — hence [MEDIUM] finding 3.)

**Why REJECTED:** one [HIGH]. The blocking finding is exactly the story's own defect class — a guard that verifies a TOKEN (in prose!) rather than the CLAIM. rb4-1's history in this file shows what scenery guards cost here. The fixes are small, test-side, and precisely enumerated.

**Handoff:** Back through the red phase — findings are testable. Imperator Furiosa: four test-file fixes and two comment lines; the severity table is the work order. The implementation itself stands — no source logic change is required beyond Dev's two comment touches (biplane.ts:14 citation, and nothing else).

## TEA Rework Assessment (round 1)

**Tests Required:** Yes — the Reviewer's severity table, item for item.

**Rework delivered (commit `c3f7f2e`, tests only):**
- [HIGH] `tests/lod-orientation-wiring.test.ts` — all guards now match COMMENT-STRIPPED text (`stripComments` drops `/*…*/` and `//…` before every regex, positive and negative), and the symmetric positive wreck-render guard is added (`biplaneLOD(wreck.facingAway)` in CODE). Header documents why: the old guard was satisfied by main.ts:185's prose.
- [MEDIUM] `tests/core/wreck-render.test.ts` (NEW) — the falling wreck draws the model it died wearing: same pose, two bits → 30/54 segments at depths {320, 1732, 4224}; plus the burst is bit-blind (debris counts match across bits).
- [MEDIUM] `tests/core/explosion.test.ts` — `explode()` propagates BOTH bit values (`facingAway: false` and `true` ride through); neither hardcode can survive.
- [MEDIUM] `tests/core/enemy.test.ts` — AC-3 seam docstring corrected to what the test proves (seam mapping; the lifecycle tests carry the derivation claims; biplane matrix carries the function-level claim).
- [LOW] `tests/core/biplane.test.ts` — NEW FAILING citation guard: biplane.ts must cite the citable copy's `:6267-6268` and must not carry the CRLF-band `:6258`. RED until Dev fixes the touched header line.
- [LOW] `tests/audit/radix-transcription.test.ts:117` — stale `LOD_DISTANCE` comment reworded to history (retired by rb4-13).

**Kill-verification (serial, clean tree, each restored after):**
- Wreck hardcode `biplaneLOD(true)` → 2 red (wreck matrix + wiring positive) ✓
- Explode hardcode `facingAway: true` → 1 red (propagation) ✓
- The review's own evasion (aliased import + `pickModel(enemy.depth > 1732)` in main.ts) → wiring guard red ✓ — the exact mutation that PASSED the old guard now dies.

**Status:** RED — 1027/1028 green; the 1 red is the citation guard, failing for the right reason (source still cites `:6258`). Verified by direct run and corroborated by testing-runner (RUN_ID rb4-13-tea-red-2; counts and failing-test name match). ⚠ The runner's prose "next_steps" misidentifies the fix target as the `:6206-6259` range line — ignore it; the fix is the `(RBARON.MAC:6258)` header line per the Reviewer's severity table.

**Deferred item honored:** the settle-test equivalent-mutant finding stays deferred per the Reviewer's ruling (no test added — killing an observationally-equivalent mutant needs API scope creep).

**Handoff:** To The Word Burgers (Dev) for GREEN — one comment line in `src/core/biplane.ts:14` (`:6258` → `:6267-6268`, per the citable copy). Nothing else.

## Dev Rework Assessment (round 1)

**Implementation Complete:** Yes — exactly the one line the work order named.

**Files Changed:**
- `src/core/biplane.ts` (header, 1 line → 2) — the point-set citation now reads "the `.PLPNT`/`.DRPNT` equates, RBARON.MAC:6267-6268 in the citable copy"; the CRLF-band `:6258` is gone. Commit `022403c`.

**Tests:** 1028/1028 passing (GREEN), 57 files; lint 0 errors. Verified by direct run and corroborated by testing-runner (RUN_ID rb4-13-dev-green-2).
**Branch:** `fix/rb4-13-lod-orientation-bit` (pushed; e61913b → 1806357 → c3f7f2e → 022403c)

**Deviations:** none this round — the change is the Reviewer's fix column verbatim.
**Findings:** no new upstream findings during rework.

**Handoff:** To Immortan Joe for re-review.

## Reviewer Re-review (round 2)

**Scope:** the delta since rejection — `c3f7f2e` (TEA rework, 6 test files, +128/−13) and `022403c` (Dev, the one citation line). Subagent battery from round 1 stands (Subagent Results table above); the fixes are my own fix-columns, so the re-review is direct verification, all of it re-executed BY ME, serially, on a clean tree:

| Round-1 finding | Fix verified |
|---|---|
| [HIGH] guard satisfiable by prose | `stripComments` applied before every regex + positive wreck guard added. THE PROOF: I re-ran the exact evasion (aliased import + `pickModel(enemy.depth > 1732)` in main.ts) — wiring guard goes RED (1 failed). The mutation that passed the old guard dies against the new one. |
| [MEDIUM] wreckSegments untested | I re-ran the wreck hardcode (`biplaneLOD(true)`) — 2 RED (new wreck matrix + wiring positive). |
| [MEDIUM] explode() capture untested | I re-ran the explode hardcode (`facingAway: true`) — 1 RED (propagation test). |
| [MEDIUM] AC-3 docstring overclaim | Corrected in c3f7f2e — the comment now claims exactly what the test proves (seam mapping; derivation claims live in the lifecycle tests + biplane matrix). |
| [LOW] `:6258` citation | `022403c` cites "`.PLPNT`/`.DRPNT` equates, RBARON.MAC:6267-6268 in the citable copy" — I re-read the citable quarry lines 6267-6268 directly: `.PLPNT =.-DB.PLN` / `.DRPNT =P.BACK-DB.PLN`. Exact. The failing citation guard is now green. |
| [LOW] stale LOD_DISTANCE comment | Reworded to accurate history in c3f7f2e. |

**After all three mutants restored:** working tree clean, full suite 1028/1028 green, lint 0 (corroborated by testing-runner RUN_ID rb4-13-dev-green-2). The deferred settle-test item remains deferred per round 1's ruling; the three non-blocking delivery findings (ace-pass D4 re-set priority, legacy citation recalibration, reference/-copy breadcrumb — all rb4-12/PM territory) stand recorded above.

**Verdict:** APPROVED
**Handoff:** To The Organic Mechanic (SM) for finish — PR creation and merge ceremony are SM's.
## Impact Summary

**Delivery Findings:** 8 non-blocking observations across upstream systems

**Upstream Effects:**

| System | Finding | Type | Severity |
|--------|---------|------|----------|
| wreck-render.ts | Wreck orientation values (facingAway) are choices, not ROM bytes; UPPLEX picture path untranscribed | Question | non-blocking |
| D4 lifecycle | The D4 bit's re-set (plane turning back toward viewer during ace-pass) is not modeled; only entry→settle is pinned | Gap | non-blocking |
| biplane.ts dead code | `apparentSpan`, `LOD_APPARENT_SPAN`, `PLANE_SPAN` are now dead plumbing and should be swept alongside the retired depth apparatus | Improvement | non-blocking |
| explosion.ts wreck fall | Under ROM rule, a settled plane killed CLOSE now falls as 29-point drone (bit it died wearing); old depth rule drew full model below ~1732 — visible change worth a playtest glance | Question | non-blocking |
| enemy.ts entry animation | ROM's entry rotation is a multi-frame ramp (±40/frame); clone settles in one calc-frame, so D4 clears on first step and full model visible for one frame at spawn | Improvement | non-blocking |
| ace-pass rendering | With D4 re-set unmodeled (TEA Gap), the FULL model is now a one-calc-frame flash; player sees 29-point drone for the whole flight—mirror image of the old dead-drone bug | Gap | non-blocking |
| legacy citations | biplane.ts DATA-half citations sit in CRLF staircase's +8 band against citable copy; recalibration belongs with rb4-12 reference/ cleanup | Gap | non-blocking |
| reference/ quarry | In-repo `reference/red-baron/RBARON.MAC` is the CRLF sibling that poisoned rb4-2; rb4-12 should land a breadcrumb so no tool reads it for line numbers again | Improvement | non-blocking |

**Forward Impact:** rb4-12 (reference/ breadcrumb + legacy citation recalibration); ace-pass D4 re-set stories (rb4-6 follow-up for returning-ace orientation flip during weave); UPPLEX picture-path transcription can overrule wreck/blimp orientation values.

**Blocking Issues:** None. Story is ready to finish.

