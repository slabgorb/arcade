---
story_id: "sw11-2"
jira_key: "sw11-2"
epic: "sw11"
workflow: "tdd"
---
# Story sw11-2: Trench wall guns mirror orientation

## Story Details
- **ID:** sw11-2
- **Jira Key:** sw11-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/sw11-2-trench-wall-guns-mirror-orientation
- **PR:** https://github.com/slabgorb/arcade/pull/263

## Story Spec (Title-Only)

Trench wall guns render cantilevered off the wall instead of flush, facing the wrong way. TRENCH_TURRET is placed on BOTH side walls (trench-obstacles.ts streamPanelSlots: pos = [depth, wallX = +/-W, slotHeight]) but drawn with a single fixed orientation — render.ts:585 uses `modelMatrix(o.pos, TRENCH_ORIENT)` and TRENCH_ORIENT was retired to IDENTITY by sw10-1. The model's `.WP WGA` base is a plate in the horizontal (x-z) plane with a single barrel direction (models.ts:726; the doc comment says 'ORIENTATION is the shell's job (render.ts)'), so with no per-wall rotation it cannot sit flush on a vertical side wall and its barrel points the wrong way on at least one wall. The ROM proves the two walls are MIRROR images: BSGUN mounts the barrel at `M.Y0 = -380 ;GUN BARREL ON LEFT WALL` (FRPLGN) vs `M.Y0 = +380 ;GUN BARREL ON RIGHT WALL` (FRPRGN), WSBASE.MAC:1251/1295, and PANLIN gives the shell MOV$PL vs MOV$PR so left/right guns are handled as mirrors throughout. Fix in the render/placement layer (core is pure): seat the turret base against the vertical wall and mirror/rotate per wall from the sign of o.pos[1] (right axis) so the barrel points INTO the channel on both walls. Render-only orientation change — MUST be eyeballed on the dev server (port 5270, /star-wars/); structural tests can't catch orientation (render.ts:168). Apply the same audit to TRENCH_SQUARE/TRENCH_CATWALK while here — they share the IDENTITY-orient placement but read less obviously wrong.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T23:20:31Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T21:26:45+00:00 | 2026-08-11T21:29:15Z | 2m 30s |
| red | 2026-08-11T21:29:15Z | 2026-08-11T21:38:30Z | 9m 15s |
| green | 2026-08-11T21:38:30Z | 2026-08-11T23:03:29Z | 1h 24m |
| review | 2026-08-11T23:03:29Z | 2026-08-11T23:20:31Z | 17m 2s |
| finish | 2026-08-11T23:20:31Z | - | - |

## Sm Assessment

Setup complete for sw11-2 (star-wars trench wall-gun mirror orientation). This is a **title-only story — the title field IS the full spec**; TEA/Dev must read it in full, not summarize it.

Key routing notes for the RED phase:
- **Render/placement fix only** — `plugins/star-wars/src/shell/render.ts` (and the placement in `trench-obstacles.ts`). Core stays pure; do not touch it.
- The spec itself warns: **structural tests can't catch orientation** — this MUST be eyeballed on the dev server (`http://127.0.0.1:5270/star-wars/`). RED-phase tests can pin the *mechanism* (per-wall mirror derived from the sign of `o.pos[1]`), not the visual result.
- ROM ground truth is cited in the spec: FRPLGN `M.Y0 = -380` (left wall) vs FRPRGN `M.Y0 = +380` (right wall), WSBASE.MAC:1251/1295 — left/right guns are mirror images; PANLIN uses MOV$PL vs MOV$PR.
- Also audit TRENCH_SQUARE / TRENCH_CATWALK while in the file — they share the IDENTITY-orient placement.

Routing to TEA (Thought Police) for RED.

## Tea Assessment

**RED delivered.** New suite: `plugins/star-wars/tests/shell/render.trench-wall-gun-orient.test.ts` — 5 failing tests, all failing for the intended reason. `npm run lint` (tsc) is green, so the RED is behavioral, not a compile artifact. Committed as `efc3bf40`.

### Premise verification (title-only story — measured, not trusted)
Every claim in the spec checks out against the tree:
- `render.ts:585` draws every trench obstacle with the single fixed `modelMatrix(o.pos, TRENCH_ORIENT)`; `TRENCH_ORIENT = IDENTITY` (`render.ts:171`, retired sw10-1).
- `TRENCH_TURRET` (`.WP WGA`, `models.ts:726`) WALL BASE bakes (via `bakeTrench = ([x,y,z])=>[-z,x,y]`) to a **horizontal plate** (native up=0, spanning lateral ±256 & depth ±192); barrel rises out of it. Doc comment: "ORIENTATION is the shell's job (render.ts)".
- Placement: `trench-obstacles.ts` `streamPanelSlots` mounts on both walls, `pos = [depth, wallX = ±W, slotHeight]`; `pos[1]` is the native RIGHT axis (the wall sign).
- Eye basis (`core/basis.ts` `CAMERA_ORIENT`): `eye = [right, up, −depth]`. Hand-traced: under IDENTITY the barrel's lateral component is a single fixed sign, so it points inboard on the **right** wall and **into the wall** on the **left** — the reported "wrong way on at least one wall". Confirmed by the RED output: the barrel test PASSES on the right wall (−96 < 0) and FAILS on the left.

### What the tests pin (mechanism) vs what they can't (the look)
The tests drive the real `render()`, mock `drawWireframe`, and measure the geometry the shell handed the rasteriser. The lateral ("wall") axis is derived **empirically** from the two stations (the only coordinate that differs between +W/−W), so the assertions don't depend on hand-decoding the native→eye basis. Three facts:
1. **Flush** — base plate has ~0 extent along the wall-normal (today: 512, cantilevered). Extended to `TRENCH_SQUARE` (also a horizontal `.WP WPN` plate).
2. **Barrel into the channel on BOTH walls** — the headline defect (fails today on the left wall only).
3. **Left/right walls are lateral mirrors** — FRPLGN vs FRPRGN (today: identical). Extended to `TRENCH_CATWALK`'s laterally-projecting fin.

⚠ **These are NECESSARY, not SUFFICIENT.** Per `render.ts:168` and the spec, final visual fidelity (barrel angle, how the gun reads head-on, whether it "looks right") **must still be eyeballed on the dev server** (`just serve` → `http://127.0.0.1:5270/star-wars/`, trench phase). Dev must not treat green as done — the human eyeball is the acceptance gate.

### Guidance for GREEN (Dev)
- Fix in the render/placement layer; **core stays pure** (do not edit `models.ts` vertex tables — orientation is the shell's job, and `romCompare`/citation gates pin those tables).
- Derive a per-wall orientation from `sign(o.pos[1])` at `render.ts:585` (replace the fixed `TRENCH_ORIENT`): seat the horizontal base plate against the vertical wall AND mirror per wall so the barrel points into the channel on both.
- The three furniture models (`turret`/`square`/`catwalk`) share the placement path, so one per-wall orient covers all three — but re-check each on the dev server; the catwalk "reads less obviously wrong".

### Rule Coverage
Project rule of record here is the **core/shell purity boundary** (star-wars CLAUDE.md). This story is shell-only by design; the RED suite lives in `tests/shell/` and touches no `core/` source. No core purity scanner is implicated (no core edits). No other lang-review rule applies to a render-orientation change.

Routing to Dev (Julia) for GREEN.

## Dev Assessment

**GREEN delivered.** All 5 orientation tests pass, `npm run lint` clean, and a **clean single-threaded full star-wars suite is green (217 files / 2399 tests)**. (An earlier "3 failed" run was spurious — resource contention from overlapping suite runs plus a sibling `a-2` checkout running the whole cabinet; the isolated re-run confirmed no regression.)

### The fix (render/placement layer; core stays pure)
`render.ts` `trenchWallOrient(o)` replaces the fixed `TRENCH_ORIENT` at the obstacle draw, keyed off `sign(o.pos[1])` and the model posture:
- **Gun (`.WP WGA`) & square (`.WP WPN`)** — authored as HORIZONTAL base plates → `rotationX(±π/2)`: a 90° roll about the depth axis stands the plate up flush against the vertical wall, mirrored per wall so the barrel points into the channel on both.
- **Catwalk (`.WP WFF`)** — authored ALREADY vertical → **mirror only** (`rotationZ(π)` on the left wall, identity on the right); a stand-up roll would lay it flat. Test strengthened to assert it stays vertical (height edge not flattened into the wall-normal).

`TRENCH_ORIENT` retained (debug-overlay still uses it). `commit e13d9655` (guns/squares) + `commit 49df3722` (catwalk per-kind + scene preset + test).

### Visual verification (the human gate, per the spec)
On the dev server (`/star-wars/scenes.html`, `TURRET-ALLEY` cell, which now injects all three furniture kinds): the user confirmed the **guns and squares look correct**. The catwalk now **stands vertical and mirrors**, but the user identified a deeper issue (see finding below) — the catwalk's *identity*, not its orientation.

### ⚠ Scope decision (user-directed)
The user observed the catwalk "is not crossing the trench." Investigation of the 1983 source confirms this is a **codebase mis-identification, not a bug in this fix**: the ROM's catwalks are horizontal channel-spanning **dividers** (`WSBASE.MAC` TWDG92-96 "8 PANEL DIVIDER WITH CATWALK AT TOP/BOTTOM"; coaching text "TRENCH CATWALK"/"AVOID CATWALKS", TCMES.MAC:560/620; vertical dodge in WSPANL.MAC:201-209), whereas finding **B-012 / sw7-19** modeled `.WP WFF` as a single-wall vertical fin dodged laterally. Correcting that reverses a documented finding and reworks model + placement + collision + docs + pinned tests — out of scope for an orientation fix. **Per the user's decision, sw11-2 lands as the orientation fix and the catwalk re-identification is filed as `sw11-3`** (see Delivery Findings).

Routing to Reviewer (Thought Police).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (GREEN) | none | N/A — full suite 217 files/2399 tests green, lint PASS, 0 code smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (assessed by Reviewer: pos[1]===0 unreachable, closed producer set) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (assessed by Reviewer: no catch/fallback code introduced) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low) | 1 confirmed & FIXED; mutation battery confirms suite discriminates |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (1 high, 2 med) | 3 confirmed & FIXED (1 softened — conflicts with rule-checker) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (rule-checker covered TS type checks — clean) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (assessed by Reviewer: pure geometry, no input/auth/secrets) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (assessed by Reviewer: minimal per-kind branch, no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (dup of #5's citation) | confirmed & FIXED; 42 rules/51 instances else clean; mutation-tested |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 unique confirmed (all FIXED this phase), 0 dismissed, 0 deferred. (rule-checker's citation finding overlaps comment-analyzer's #2.)

### Rule Compliance

Project rule of record: the **core/shell purity boundary** (star-wars CLAUDE.md) and the "don't edit `models.ts` vertex tables" / "scene presets stay pure" conventions. Enumerated against every changed symbol:
- `trenchWallOrient(o)` — lives in `src/shell/render.ts` (SHELL). **Compliant** — impurity is allowed in the shell; it is a pure function of its arg besides.
- `render.ts` obstacle-draw rewire — SHELL. **Compliant.**
- `scenePresets.ts` catwalk literals + `TRENCH_HALF_W` import — CORE, but only static literals from an imported core constant; no DOM/time/random. **Compliant** (covered by `core-purity` sweep, still green).
- `models.ts` vertex tables — **not touched** (confirmed by diff; rule-checker rule #29 clean).
- TypeScript checklist — rule-checker checked 42 rules / 51 instances: **all compliant** except the one citation-drift comment (fixed). No `as any`, no type escapes beyond the established canvas-stub double-cast idiom, no enum/null/async pitfalls.

### Devil's Advocate

Arguing the code is broken: The whole fix rests on `o.pos[1] < 0` meaning "left wall." If a future producer ever emits an obstacle at the centreline (`pos[1] === 0`) or with a NaN lateral, the branch silently treats it as the right wall and the furniture would seat wrong with no error — a latent trap. Mitigation checked: every current producer (`spawnTrenchObstacles`, `streamPanelSlots`) only ever emits `±TRENCH_HALF_W`; the exhaust port doesn't route through this path. So the degenerate input is unreachable today, but the function has no guard documenting that contract — a maintainability risk, not a live bug.

Second attack: the tests only pin *mechanism* (flush/vertical/mirror/inboard), and the spec itself says structural tests can't catch the final look. A malicious/careless future change could satisfy all five assertions while producing a visually wrong gun (e.g. barrel angled oddly) — the tests would stay green. This is real but *acknowledged*: the human eyeball is the stated acceptance gate, and it was exercised (user confirmed guns/squares; catwalk verified vertical, its identity issue routed to sw11-3). Mutation testing (three independent passes) proves the suite is not vacuous — it reddens under revert-to-IDENTITY, roll-everything, and drop-the-mirror mutants.

Third: does re-introducing a per-model display orient regress the sw10-1 "native basis, no per-model rotation" migration? No — sw10-1 explicitly *kept* `TOWER_ORIENT` as "real display geometry, not a basis conversion." `trenchWallOrient` is the same category (seating furniture on walls), so it's consistent with, not a regression of, that design. Nothing here erodes the core/shell boundary; the geometry stays in the shell and the model tables are untouched. Verdict stands.

### Observations (≥5)

- `[VERIFIED]` `trenchWallOrient` logic correct — `render.ts:200-203`: `rotationX(±π/2)` swaps native right↔up (stands the up=0 plate flush) and mirrors via `sign(pos[1])`; `rotationZ(π)` mirrors the already-vertical catwalk about up without flattening it. Hand-derived from `bakeTrench` and confirmed by three independent mutation passes (test-analyzer, rule-checker). Complies with the shell-owns-orientation rule.
- `[VERIFIED]` core/shell purity preserved — `scenePresets.ts` adds only static literals; `models.ts` untouched; `trenchWallOrient` is in the shell. Evidence: diff + rule-checker rules #28-30 clean.
- `[TEST]` (low, FIXED) tautological assertion `Math.abs(o.pos[1]) > 0` at `scene-presets.test.ts:47` checked the fixture's own literal → replaced with an opposite-walls mirror check (`catwalks[0].pos[1] === -catwalks[1].pos[1]`).
- `[DOC][RULE]` (high, FIXED) drifted self-citation `⚠ render.ts:168` (the NOTE is at ~170) → replaced with a stable textual reference to the SURFACE_ORIENT NOTE (line numbers are fragile in a citation-gated file).
- `[DOC]` (high, FIXED) comment claimed all three kinds ride via `streamPanelSlots` — false for squares (hand-authored `TRENCH_OBSTACLE_STATIONS`) → scoped the streaming claim to guns/catwalks.
- `[DOC]` (medium, FIXED, conflicted) `M.Y0`/FRPLGN/PANLIN attribution: comment-analyzer said the causality is backwards; rule-checker verified the line cites exact and called it "substantively true." Adjudication: re-attributed `M.Y0` to BSGUN (`WSBASE.MAC:1251/1295`) and softened the PANLIN/MOV$PL phrasing rather than assert a causality either subagent could dispute; the definitive ROM read belongs to `sw11-3`.
- `[VERIFIED]` no security/error-handling surface — pure geometry, no input, no catches, no secrets.

## Reviewer Assessment
**Verdict:** APPROVED
**Data flow traced:** `state.trenchObstacles[i]` (kind + native pos) → `trenchWallOrient(o)` → `modelMatrix(o.pos, orient)` → `drawWireframe` (render sink). Safe: pure matrix composition, no I/O, no mutation of `o`.
**Pattern observed:** per-wall display orient keyed off model posture + `sign(pos[1])` at `render.ts:200`; same category as the retained `TOWER_ORIENT` (legitimate display geometry, not a basis hack) — consistent with the sw10-1 native-basis design.
**Error handling:** none required (pure geometry); the one latent edge (`pos[1]===0`) is unreachable given the closed producer set — noted, non-blocking.
**Findings (all confirmed & FIXED, zero Critical/High):**
- `[DOC]` comment claimed all three furniture kinds ride via `streamPanelSlots` — false for squares (hand-authored `TRENCH_OBSTACLE_STATIONS`); scoped the claim to guns/catwalks. `render.ts:176`.
- `[DOC]` `M.Y0`/FRPLGN/PANLIN attribution imprecise (comment-analyzer vs rule-checker conflicted); re-attributed to BSGUN (`WSBASE.MAC:1251/1295`) and softened the PANLIN causality. `render.ts:180`.
- `[DOC]`/`[RULE]` drifted `⚠ render.ts:168` self-citation (NOTE is at ~170); replaced with a stable textual reference. `render.ts:196`. (Confirmed by both comment-analyzer and rule-checker — the sole rule-checker violation.)
- `[TEST]` tautological `Math.abs(o.pos[1]) > 0` checked the fixture's own literal; replaced with an opposite-walls mirror check. `scene-presets.test.ts:47`.
- preflight: `[VERIFIED]` GREEN (2399 tests, lint PASS, 0 smells). test-analyzer + rule-checker mutation-tested the fix — the suite discriminates.

All FIXED this phase (`commit e694f88a`); production logic verified correct by three independent mutation passes and left unchanged. The reviewer fixes are comment-only + one test assertion, re-verified green (lint + the 10 affected tests), so preflight's full-suite GREEN still holds.
**Scope note:** the catwalk's deeper mis-identification (it should be a channel-spanning divider, not a single-wall fin) is a real, ROM-backed finding but out of scope for this orientation story — user-approved descope, tracked by `sw11-3`.
**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict / non-blocking]** The trench CATWALK is mis-identified in the codebase. ROM ground truth (WSBASE.MAC TWDG92-96, TCMES.MAC:560/620, WSPANL.MAC:201-209) shows catwalks are horizontal channel-spanning dividers seated at a top/bottom band and dodged VERTICALLY; finding B-012 (sw7-19) modeled `.WP WFF` "WALL FORCE FIELD" as a single-wall vertical fin dodged LATERALLY. sw11-2 corrected the wall-gun/square orientation and left the catwalk standing+mirrored as an interim. **Filed as `sw11-3`** (bug, p1, tdd) to re-identify and rework it (model + placement + side-gated→vertical-band collision + B-012 docs + pinned tests), starting with the rom-fidelity-audit skill.

### Reviewer (code review)

- **Improvement** (non-blocking): 4 comment-accuracy / test-quality findings surfaced by the specialist subagents, all FIXED in-phase (`commit e694f88a`) — no logic change. Affects `plugins/star-wars/src/shell/render.ts` (streamPanelSlots-scope, `M.Y0`/PANLIN attribution, drifted line-citation) and `plugins/star-wars/tests/core/scene-presets.test.ts` (tautological assertion → opposite-walls mirror check). *Found by Reviewer during code review.*
- No blocking upstream findings during code review. Production logic verified correct by three independent mutation passes.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)

- TEA/Dev logged no deviations, and I found no *undocumented* spec deviation. The one scope divergence is explicit and user-approved: the spec said "apply the same audit to TRENCH_CATWALK," and Dev did apply the orientation audit (it now stands vertical and mirrors per wall) — but the catwalk's deeper mis-identification (it should be a channel-spanning divider) was **descoped by the user** to `sw11-3`, not silently dropped. Severity: L (tracked). ✓ ACCEPTED by Reviewer.