---
story_id: "sw7-19"
jira_key: "sw7-19"
epic: null
workflow: "tdd"
---
# Story sw7-19: R6b Trench catwalk is a wall-mounted FORCE FIELD — side-gated .WP WFF panel, not a channel-spanning bar (B-012 + M-012)

## Story Details
- **ID:** sw7-19
- **Jira Key:** sw7-19
- **Workflow:** tdd
- **Stack Parent:** sw7-6 (feat/sw7-6-r6a-trench-structure-pacing)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T13:55:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T11:37:25Z | 2026-07-18T11:40:24Z | 2m 59s |
| red | 2026-07-18T11:40:24Z | 2026-07-18T12:22:40Z | 42m 16s |
| green | 2026-07-18T12:22:40Z | 2026-07-18T13:40:55Z | 1h 18m |
| review | 2026-07-18T13:40:55Z | 2026-07-18T13:55:26Z | 14m 31s |
| finish | 2026-07-18T13:55:26Z | - | - |

## Sm Assessment

**Routing:** setup → **red (TEA / Han Solo)**. Standard `tdd` phased workflow
(red → green → review → finish). No architecture/spike phase needed — the ROM
identification is already made in the story; the work is deriving the exact
behavior from primary source and codifying it as failing tests.

**Scope (as split from the 14-pt R6 flagship, 2026-07-16):**
- Reframe the trench catwalk from our channel-spanning bar to a **wall-mounted
  FORCE FIELD** — `.WP` WFF **panel content** within the existing B-010
  wall-panel grid, not a structure spanning the trench channel.
- **Side-gated collision:** the field blocks **only the wall side it is mounted
  on**, not the whole channel. The collision/side-gating logic is deterministic
  sim → belongs in `src/core`; any rendering belongs in `src/shell` (the single
  most important boundary rule in every game repo).
- Port the WFF model (finding **M-012**); the ROM's `.WGD` WFG comment
  *'CATWALK COLOR WHEN COLLIDED'* is the identifying evidence.

**Dependency verified:** `depends_on: sw7-6` (R6a — the B-010 wall-panel grid,
B-009 wedge-chain, B-011 waves, B-008 scroll) is **done and merged** (in
`sprint/archive/sprint-2628-completed.yaml`). The grid this story writes panel
content into exists on `develop`. Feature branch cut off `develop` in star-wars.

**Merge gate:** clear — no open star-wars PRs.

**Pointers for TEA (Han Solo):** B-012 / M-012 are audit-finding IDs — the
ruling evidence lives in `docs/audit/findings/*.json` (cited by-line; edits to
cited src reflow citations, so expect to run `tools/audit/reanchor-citations.mjs
--write` if you touch a cited file). For authentic vector/panel source, prefer
the gitignored `reference/disasm` (WSVROM.MAC picture ROM) per the star-wars
convention. Any src edit that reddens the citations gate is a legit line-number
reanchor, **not** red-baron-style laundering.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the exact ROM collision coordinates are un-pinned and must be derived from the sw7-6 wedge grid — field top `M.Z0 + $200` (512), vertical band `$400` (1024), depth window `$400` (1024), panels stacked `$400` apart from `M.Z0 = -$0E00` (WSPANL.MAC:186-215). Affects `src/core/sim.ts` (the force-field collision) plus the new grid→hazard derivation (a force-field panel in a wedge's left/right column at slot k → a wall hazard at `sign = ∓`, height slot k, wedge depth). *Found by TEA during test design.*
- **Improvement** (non-blocking): the graze's ship GLOW (`BG1GLW`) and ROLL (`S.ROL = ±78`) are the deferred **A-018** (visual), and the shield ACCOUNTING is deferred to **WSGLOW / S-016** (score-shields scope) — all intentionally OUT of sw7-19. The only in-scope graze cue is the crash sound (`AUDCR` → `terrain-crash`). Likewise the WFG collided-COLOUR twin (VJFLS "CATWALK COLOR WHEN COLLIDED", with its 1983 out-of-range `DRAWTO 6,3` ROM bug) is a render concern, not ported as a `Model3D`. Affects future stories, not this one. *Found by TEA during test design.*
- **Conflict** (non-blocking): `tests/core/trench-variation.test.ts:111-119` asserts `spawnTrenchObstacles().some((o) => o.kind === 'catwalk')`. This story's contract KEEPS `kind: 'catwalk'`, so it stays green IF the grid-derived spawning keeps that kind and `spawnTrenchObstacles` remains the source; if Dev renames the kind (e.g. `'forcefield'`) or replaces that spawn API, migrate this guard. Affects `tests/core/trench-variation.test.ts` (and the `trench-aim-wysiwyg.test.ts:112` catwalk filter). *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the dense ~80-panel grid content + the port un-clamp are SPLIT to **sw7-22 (R6d)**. The grid trench is `0x50000` = 327,680 units, but `spawnPort` clamps the port to `TRENCH_FAR` (28,672) as a stub, so every `PANEL_FORCEFIELD` slot lies BEYOND the visible slice (0 in wave 0, ~80 in later waves, all past the clamp) — they cannot be placed until the port sits at its real BS.PLC and the channel streams over ~21s (beam-reach stays `$7000`). Affects `src/core/sim.ts` (`spawnPort`) + `src/core/trench-obstacles.ts` (spawn). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the catwalk renders in `TURRET_GLOW` (red) and the WFF front fin (model −x) points into the channel for a RIGHT-wall field but pokes ~256u THROUGH the wall for a LEFT-wall field — per-wall mirroring + the ROM's force-field colour (WFG "CATWALK COLOR WHEN COLLIDED") are shell polish for R6d. `TRENCH_ORIENT` (rotationX(−90°)) already stands the barrier upright (verified via the scene render). Affects `src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): the force field currently costs NO shield and models no roll/glow (deferred — shield → WSGLOW/S-016, roll/glow → A-018), so it is a crash-sound-only hazard the pilot flies through without consequence. Faithful to B-012 (WSPANL is a graze) and documented, but the trench force field is temporarily non-damaging until those land. Affects `src/core/sim.ts` (no change now; the follow-up scope owns the damage). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `CATWALK_HIT_RADIUS` (state.ts:360) is now consumed ONLY to derive `CATWALK_Y`, and its doc comment still describes the deleted full-width sphere — a stale coupling + stale doc. `state.ts` is untouched by this diff (editing it would re-shift citations), so fold the cleanup into sw7-22 (R6d), which reworks the trench spawn. Affects `src/core/state.ts` + `src/core/trench-obstacles.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Deleted the story-14-7 suite (`trench-catwalk-hazard.test.ts`) — a contract inversion**
  - Spec source: B-012 (docs/audit/findings/pair-trench.json)
  - Spec text: "The immediate WSPANL hit is a graze (glow + roll), not a hard `lives-1` — the shield accounting rides WSGLOW (score-shields scope)."
  - Implementation: Removed the 14-7 file (it asserted "a catwalk pass costs exactly one shield"). Its "a pass registers a crash over a real crossing" coverage is re-seated to the graze contract in the new `trench-force-field-hazard.test.ts`.
  - Rationale: 14-7 ratified a fabricated channel-spanning-bar-costs-a-shield mechanic that B-012 refutes; a test asserting a refuted behaviour is broken, not preserved (tp1-27 pattern).
  - Severity: minor
  - Forward impact: none — the crossing/graze coverage is preserved in the new file.

- **Re-seated the `trench-voice-timer` crash fixture off a centred obstacle**
  - Spec source: B-012 (side gate — `LDD M$TY+M.U1 / IFLE ;?ON LEFT SIDE?`, WSPANL.MAC:199)
  - Spec text: the catwalk fires only when the pilot is on that wall's side.
  - Implementation: the synthetic catwalk at `[0, EYE_SEAT, -1]` (centred) moved to `[-300, EYE_SEAT, -1]` with the pilot co-located on the left (`trenchView [-300,…]`), so the crash still fires under BOTH the old radius sphere and the new side gate.
  - Rationale: a centred (x≈0) obstacle no longer collides under the side gate; co-location keeps the test's real intent (the voice cue rides the crash return path) decoupled from the collision-shape change, so it stays green through the transition.
  - Severity: minor
  - Forward impact: none.

- **Encoded the force field's mounted wall as `sign(pos[0])` (representation contract)**
  - Spec source: sw7-19 scope (user decision: grid-derived panels) + B-010 (left/right wall columns)
  - Spec text: "side-gate collision reads which wall column the panel is in."
  - Implementation: the RED represents a force-field hazard as the existing `{ kind: 'catwalk', pos }` obstacle whose mounted wall is the SIGN of `pos[0]` (neg = left, pos = right; magnitude ≈ TRENCH_HALF_W); the collision side-gates on `sign(trenchView[0])` matching. No schema change.
  - Rationale: reuses the existing obstacle shape with zero interface churn; TEA legitimately defines the observable representation contract, and Dev's grid-derived spawning must produce hazards in it.
  - Severity: minor
  - Forward impact: Dev's grid→hazard spawning must place force-field hazards at `pos[0] = ±wall` so the side-gated collision contract these tests define is satisfied.

- **Pinned side/height/depth OBSERVABLES via extremes, not the ROM band/depth literals**
  - Spec source: B-012 / WSPANL.MAC:196-210
  - Spec text: field top = `M.Z0 + $200` (512); hit within `$400` (1024) above → vertical band; pilot within the field's first `$400` (1024) of depth.
  - Implementation: the collision suite pins the OBSERVABLE (a same-side pilot grazes; opposite-wall, far-height, and far-downrange pilots clear) using unambiguous extremes, NOT the literal `$200/$400/$400` coordinates or the grid slot→world-height mapping.
  - Rationale: those coordinates depend on the grid→world-position mapping Dev builds; pinning fabricated literals in RED risks the "a decode of a true constant is still a decode" trap (tp1-27/rb4-4). The literals are routed to Dev as a cited Delivery Finding.
  - Severity: minor
  - Forward impact: Dev derives `$200/$400/$400` and the slot heights from WSPANL.MAC + the sw7-6 wedge grid.

### Dev (implementation)

- **Scope narrowed from the full grid-content rewrite to bounded B-012 + M-012; streaming split to sw7-22**
  - Spec source: sw7-19 scope (user decision at the RED→GREEN seam: "full grid-content rewrite")
  - Spec text: "replace the station spawn with the grid's ~80 force-field panels per trench"
  - Implementation: shipped B-012 (side-gated graze) + M-012 (WFF model) with the head-of-pie catwalk re-homed onto a wall; filed **sw7-22 (R6d)** for the streaming trench (un-clamp the port from its `TRENCH_FAR` stub to its real BS.PLC, then stream the grid's wall panels over the ~21s channel).
  - Rationale: implementation revealed a hard geometry blocker — the grid trench is 327,680 units but the port is a 28,672 stub, so all ~80 panels sit beyond the visible slice and cannot be placed without a trench-pacing rewrite. Surfaced to the user, who confirmed splitting it into its own story.
  - Severity: major
  - Forward impact: sw7-22 delivers the streaming trench + the dense panels; the two audit findings (B-012, M-012) are fully delivered here.

- **Re-homed the single catwalk to the LEFT wall (a station, not a grid-walked panel)**
  - Spec source: B-012 (side-gated wall force field)
  - Spec text: "the field blocks only the wall side it is mounted on."
  - Implementation: `TRENCH_OBSTACLE_STATIONS`' catwalk moved from centre `[0, …]` to `[-W, …]` (left wall). It stays a station; grid-walked panels are sw7-22.
  - Rationale: keeps sw3-7's station spawn + "catwalk every run" intact while making the one catwalk a coherent side-gated wall force field (a hands-off centred run rides the ROM's left side, so it still grazes).
  - Severity: minor
  - Forward impact: sw7-22 replaces this station catwalk with grid-derived panels on both walls.

- **Re-seated sibling suites the contract change refuted (TEA-owned maintenance, done in green)**
  - Spec source: B-012 (graze, not `lives-1`)
  - Spec text: "The immediate WSPANL hit is a graze … not a hard `lives-1`."
  - Implementation: inverted the two `trench-viewpoint` catwalk tests (dive-dodge → lateral-dodge; costs-a-shield → graze-no-shield) and the `trench-obstacles` catwalk test (costs-a-shield → graze-no-shield); bumped the `romCompare` pair count 8→9 for the added WFF pair.
  - Rationale: these siblings encoded the refuted "catwalk costs a shield" / vertical-dodge contract and were missed in RED; reaching green required re-seating them to the graze contract.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)

Every logged deviation reviewed; all ACCEPTED (none flagged):

- **TEA — Deleted the 14-7 suite (contract inversion)** → ✓ ACCEPTED: 14-7's "catwalk costs a shield" is refuted by B-012; the crossing/graze coverage carries forward to `trench-force-field-hazard.test.ts` (preflight independently confirmed no silent coverage drop).
- **TEA — Re-seated the `trench-voice-timer` crash fixture** → ✓ ACCEPTED: co-locating the field with a same-side pilot keeps the crash firing under both the old sphere and the new side-gate, preserving the voice-cue intent; stays green on both.
- **TEA — Encoded the mounted wall as `sign(pos[0])`** → ✓ ACCEPTED: reuses the existing `{kind,pos}` shape with zero schema churn and maps cleanly onto WSPANL's `IFLE`; the left/right mirror is non-vacuous (`sim.ts:1020`).
- **TEA — Pinned observables via extremes, not the ROM band/depth literals** → ✓ ACCEPTED: avoids fabricating the `$200/$400` coordinates (tp1-27/rb4-4 rule); the literals are now concrete constants in `trench-channel.ts` with ROM citations.
- **Dev — Scope narrowed to bounded B-012+M-012; streaming split to sw7-22** → ✓ ACCEPTED: the geometry blocker is real (grid trench 327,680 vs a 28,672 port-clamp stub — verified in `state.ts:576-593` and by driving the sim) and was surfaced to and confirmed by the user. Both audit findings are fully delivered here; sw7-22 (R6d) is filed `depends_on: sw7-19`.
- **Dev — Re-homed the catwalk to the left wall (a station)** → ✓ ACCEPTED: makes the one catwalk a coherent side-gated wall force field while keeping sw3-7's station spawn + "catwalk every run" intact (station index 3, fixed head; a hands-off centred run still grazes via `IFLE`).
- **Dev — Re-seated `trench-viewpoint`/`trench-obstacles` in green** → ✓ ACCEPTED: both encoded the refuted contract; the re-seats (lateral-dodge + graze-no-shield) are correct and stay behaviourally meaningful (neutral-grazes-no-shield is RED-on-old).

## Dev Assessment

**Implementation Complete:** Yes (bounded B-012 + M-012; the dense grid content is split to sw7-22 / R6d)

**Files Changed:**
- `src/core/models.ts` — `TRENCH_CATWALK` → authentic `.WP WFF` geometry (M-012)
- `src/tools/romCompare.ts` — `ROM_TO_PORT` gains `WFF: 'Trench Catwalk'` (M-012)
- `src/core/sim.ts` — catwalk collision → side-gated GRAZE (no `loseShield`); dropped `CATWALK_HIT_RADIUS` sphere + fatal-catwalk death path (B-012)
- `src/core/trench-channel.ts` — `FORCE_FIELD_BAND_HALF` / `FORCE_FIELD_DEPTH` constants (WSPANL `$200`/`$400`); corrected the "catwalk can block him" comment
- `src/core/trench-obstacles.ts` — re-homed the catwalk onto the left wall; updated its doc comments
- `tests/core/trench-viewpoint.test.ts`, `tests/core/trench-obstacles.test.ts`, `tests/tools/romCompare.test.ts` — re-seated to the graze contract / +WFF pair
- `docs/audit/findings/pair-trench.json`, `pair-models.json` — `remediated_by: sw7-19` on B-012 / M-012; all 10 findings files reanchored (line-drift only)

**Tests:** 1674/1674 passing (GREEN); `tsc --noEmit` clean; citations gate green (0 lost after reanchor).
**Render:** verified via the scene contact sheet — the WFF barrier stands upright on the wall (`TRENCH_ORIENT`).
**Branch:** feat/sw7-19-trench-catwalk-force-field (pushed).

**Handoff:** To Reviewer (Obi-Wan) for code review.

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** two CONFIRMED audit findings — B-012 (collision behaviour) + M-012 (model port).

**Test Files:**
- `tests/core/trench-force-field-rom.test.ts` (NEW) — M-012: `TRENCH_CATWALK` becomes the authentic `.WP WFF` wall force field. Hand-transcribed ROM oracle (WSOBJ.MAC `.WP WFF` / `.WGD WFF`, independent of the bake, sw5-4 pattern); pins the port's vertices + edges, the romCompare wiring (`ROM_TO_PORT.WFF`, `verdictFor` → "✓ edges match"), the .RADIX-16 hex refutation, the vertical-barrier shape (rises 512, not a flat girder), and documents the WFG collided-twin's 1983 out-of-range `DRAWTO 6,3` ROM bug so no port re-introduces it.
- `tests/core/trench-force-field-hazard.test.ts` (NEW) — B-012: the contact is a SIDE-GATED GRAZE, not a shield-costing bar. Pins same-side graze (fires `terrain-crash`, costs NO shield), the `IFLE ;?ON LEFT SIDE?` side gate (mirrored on both walls), the vertical dodge, the depth window, and the "channel-spanning bar is gone" dodge-by-opposite-wall. SUPERSEDES + inverts the deleted 14-7 suite.
- `tests/core/trench-voice-timer.test.ts` (RE-SEAT) — the centred crash fixture moved to a wall-side co-located field so the voice-cue-rides-the-crash test survives the contract change.
- `tests/core/trench-catwalk-hazard.test.ts` (DELETED) — 14-7's "costs a shield" contract is refuted by B-012.

**Tests Written:** 17 tests across 2 new files covering 2 ACs/findings (B-012, M-012); 1 sibling re-seated, 1 deleted.
**Status:** RED (8 tests failing — ready for Dev). Verified by Chewbacca: tsc clean; the 8 failures are all in the two new files and fail for the RIGHT reason (old girder + WFF unmapped; the `CATWALK_HIT_RADIUS` sphere can't reach a wall-mounted field). The 6 in-file passes are the oracle-vs-bake checks and the green-on-both guard tests. Full suite: 1666 pass, no regressions, no green-now-doomed siblings.

### Rule Coverage

| Rule (gates/lang-review/typescript.md) | Test(s) / handling | Status |
|------|---------|--------|
| No `as any` / `@ts-ignore` in test assertions | none used; `Vec3` casts are structural, not `any` | clean |
| No `!` non-null on runtime-nullable values | `!` only on `ROM_MODELS.find(...)` for KNOWN-present ROM models (WFF/WFG confirmed in the bake) — the repo's established pattern (exhaust-port-rom.test.ts) | warranted |
| Every test asserts something meaningful (no vacuous) | every `it` asserts concrete values (counts, coordinates, event presence, shield delta); mirror tests assert BOTH halves so neither passes alone | clean |
| Edge index in range (`WFG` out-of-range trap) | `rom.test.ts` pins the bake carries the ROM bug AND the port keeps every edge index `< vertices.length` | failing (port) |

**Rules checked:** 4 of the applicable typescript.md checks have coverage or explicit handling.
**Self-check:** 0 vacuous tests (every assertion checks a concrete value; RED failures confirmed to fail on the assertion, not on import/collection).

**Handoff:** To Dev (Yoda) for GREEN — swap `TRENCH_CATWALK` to the WFF geometry + register `ROM_TO_PORT.WFF`, and replace the `CATWALK_HIT_RADIUS` sphere collision with the side-gated graze (no `loseShield`), sourcing force-field hazards from the sw7-6 wedge grid per the cited Delivery Finding.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells | N/A — tests 1674/1674 green, tsc clean, citations 0-lost |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both LOW) | confirmed 2 (LOW, non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, domains self-assessed)
**Total findings:** 2 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Two audit findings, cleanly delivered: **M-012** (the model is re-ported to the authentic `.WP WFF` geometry, romCompare-verified 0/0 drift) and **B-012** (the catwalk collision is a side-gated GRAZE, no shield loss). The dense grid content was correctly split to sw7-22 (R6d) after a real, user-confirmed geometry blocker. No Critical or High issues; the two LOW findings are non-blocking.

**Data flow traced:** the pilot yoke → `input.aimX/aimY` → `trenchView` (clamped ±511 lateral / [512,3840] height, `sim.ts:887-888`) → the force-field collision reads `trenchView[0]` (side), `trenchView[1]` (band) and the obstacle `pos[2]` (depth) → on a hit, pushes only `{type:'terrain-crash'}` and drops the obstacle; **no path decrements `lives`** (the three `loseShield` sites at `sim.ts:452/808/1177` are space/surface/port, never the catwalk). Safe: the graze is a pure event, no state corruption, no shield double-count.

**Pattern observed:** three O(1) scalar gates (`onFieldSide`/`inBand`/`inDepth`, `sim.ts:1020-1022`) replacing a `Math.hypot` sphere + a `loseShield`/`pushFarewell` branch — simpler and cheaper on the ~60fps hot path.

**Rule Compliance** (typescript.md #1-13 + CLAUDE.md core-purity):
- **#1 type-safety** `[TYPE]`: no `as any`/`@ts-ignore` in the diff. `[RULE]`-confirmed two `ROM_MODELS.find(...)!` non-null assertions in `trench-force-field-rom.test.ts:104-105` — LOW: matches the established `exhaust-port-rom.test.ts` / `romCompare.test.ts` idiom and is runtime-safe (the same file's oracle test pins WFF/WFG present in the generated bake). Confirmed, not dismissed; non-blocking.
- **#3 enums**: no enum declared/modified; the `o.kind` check is if/else-if, not a switch that could lose exhaustiveness. Compliant.
- **#4 null/undefined**: `Vec3` is a `number` 3-tuple — no nullable operands, no `||`-for-`??`. Compliant.
- **#5 modules**: value vs `import type` correct; `moduleResolution: bundler` so no `.js`-extension rule applies. Compliant.
- **#8 test quality** `[TEST]`: no `as any`, no `.only`/`.skip`; the ROM test uses the independent-oracle pattern (hand-transcription checked against the bake first). Compliant.
- **CLAUDE.md core purity** `[RULE]`: the changed core files (`sim`, `models`, `trench-channel`, `trench-obstacles`) have no shell import, no DOM, no `Date.now`/`Math.random`/`rAF`; the collision is pure scalar arithmetic on `dt`-derived values. Compliant. Models are raw ROM units 1:1 (orientation deferred to the shell). Compliant.

**Observations** (5+):
- `[VERIFIED]` No shield/roll/glow path survives for the catwalk — evidence: `sim.ts:1000-1042` pushes only `terrain-crash`; grep confirms the 3 `loseShield` sites are space/surface/port. Complies with B-012 (WSPANL is a graze; shield → WSGLOW scope).
- `[VERIFIED]` Core purity — evidence: grep over the 4 changed core files finds no shell/DOM/random/date. Complies with CLAUDE.md's hard boundary.
- `[VERIFIED]` The side-gate mirror is non-vacuous — evidence: `onFieldSide` (`sim.ts:1020`) distinguishes left vs right; the hazard suite asserts left-field↔left-pilot grazes and right-pilot clears, and the right-wall mirror. Not a coin-flip pass.
- `[VERIFIED]` No dangling refs to the removed collision — evidence: grep for `crashedCatwalk`/`catwalkHit`/`spanCrash`/`crossCrash` is empty; `CATWALK_HIT_RADIUS` import dropped from `sim.ts`.
- `[LOW]` `[RULE]`/`[DOC]` `CATWALK_HIT_RADIUS` (state.ts:360) now only derives `CATWALK_Y`, and its doc still describes the deleted sphere — stale coupling + doc. `state.ts` untouched by this diff; folded into sw7-22. Non-blocking Delivery Finding logged.
- `[LOW]` The depth window is symmetric `±FORCE_FIELD_DEPTH` (`sim.ts:1022`), so a field can graze up to 1024u BEHIND the cockpit — a deliberate leap-robustness margin (max leap is ~262u/frame at the fixed step), not a defect; removed on first graze anyway.
- `[LOW]` `onFieldSide` treats `pos[0]===0` as the right side — arbitrary but unreachable in production (fields are wall-mounted at ±1024; the re-homed catwalk is at −1024).
- `[Improvement, non-blocking]` The force field is temporarily non-damaging (crash sound only; shield → WSGLOW/S-016, roll/glow → A-018 both deferred) — faithful to B-012 and documented. Logged as a Delivery Finding.

**Domain tags** (7 subagents disabled via settings; self-assessed): `[EDGE]` boundary cases (pos[0]=0, dt leap, behind-cockpit window) enumerated above — all LOW. `[SILENT]` no swallowed errors — the graze is an explicit event, no empty catch, no silent fallback. `[SEC]` N/A — pure game physics, no user input / auth / secrets. `[SIMPLE]` the change is a net simplification (drops `hypot` + the death branch). `[DOC]`/`[TYPE]`/`[TEST]` covered under Rule Compliance.

### Devil's Advocate

Suppose this code is broken. The most dangerous claim is "no shield is lost" — if a `loseShield` were still wired to the catwalk, the graze would silently cost a life; I traced all three `loseShield` sites and none is the catwalk, and the hazard suite's `expect(shieldsLost).toBe(0)` would go red if one were re-added, so that hole is closed. Next: could the side-gate let a field hit the WRONG side? A confused transcription of `IFLE` could invert the sign; the mirror tests (left-field grazes left-pilot, clears right-pilot, and the right-wall reverse) would both fail on an inverted gate, and I re-derived `o.pos[0] < 0 ? trenchView[0] <= 0 : trenchView[0] >= 0` by hand — correct. Could a stressed frame (huge `dt`) leap a field clean over the ±1024 depth window and skip the graze? Yes, at `dt ≳ 0.13s` a field can jump the whole 2048-wide window — but the real loop is a fixed-step accumulator (~1/60s, ~262u/frame), so this is unreachable in production and no worse than the sphere it replaced. What would a confused player misread? The force field now costs nothing and doesn't visibly roll the ship, so it reads as harmless scenery — but that is the audit-mandated B-012 behaviour (the damage is WSGLOW's, deferred), and it is documented as a Delivery Finding, not a silent regression. What if `pos[0]` is exactly 0? It's treated as the right wall — arbitrary, but the production spawn never emits a centred field, and no test depends on the zero case. What about the `remediated_by` edit re-opening the citations gate later? The checker only requires `ours.file` for a remediated finding, and the frozen quote is the audit record — sound. Nothing here rises to High: the risky claim (no shield) is proven, the inversion risk is mirror-tested, and the residuals are LOW margins and a documented, spec-mandated deferral.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.