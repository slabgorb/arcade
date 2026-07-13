---
story_id: "tp1-23"
jira_key: "tp1-23"
epic: "tp1"
workflow: "trivial"
---
# Story tp1-23: WD-010 — warpAccel is fed a 1-based level, not the ROM's 0-based CURWAV (the one character that fell between tp1-1 and tp1-3)

## Story Details
- **ID:** tp1-23
- **Jira Key:** tp1-23
- **Workflow:** trivial
- **Stack Parent:** none
- **Type:** bug
- **Points:** 1

## Acceptance Criteria

1. sim.ts:603 feeds warpAccel a 0-based wave index, not the 1-based s.level. The ROM's CURWAV is 0-based (WD-010) — cite the source line.
2. A test pins the level-1 warp acceleration to the ROM's value (perFrame8_8 = 0x20 = 32 at wave 0), and would FAIL against the 1-based reading (which gives 36). The test must be written so that reverting the one character turns it red.
3. The rebase from tp1-1 is NOT disturbed: warpAccel still carries ROM_FPS squared, and warp velocity is still pinned against the ROM rather than a hand-tuned number.
4. tp1-3's 'OUT OF SCOPE' note and tp1-1's now-orphaned AC-7 are both updated to point here, so the audit trail of where WD-010 actually landed is not left lying.
5. npm test -- citations stays green.

## Technical Context

**Defect Location:** tempest/src/core/sim.ts (~line 603) calls `warpAccel(s.level)` where `s.level` is 1-based (levels run 1..16). The ROM feeds this expression CURWAV, which is 0-based.

**Fix:** Pass a 0-based wave index to warpAccel() instead of the 1-based level.

**Current Behavior:** At level 1, warp dive accelerates with min(1*4, 0x30) + 0x20 = 36, but ROM gives 32 — the level-1 dive is ~12.5% too fast.

**ROM Verification:** Expected value at wave 0: perFrame8_8 = 0x20 = 32.

**Critical Constraint:** warpAccel() was rebased onto ROM_FPS by story tp1-1 (merged, tempest#97, d75a4a2). This rebase MUST NOT be disturbed. The function still carries ROM_FPS squared, and warp velocity is still pinned against the ROM rather than a hand-tuned number.

**Additional Notes on AC-4:** The acceptance criteria references updating tp1-3's 'OUT OF SCOPE' note and tp1-1's now-orphaned AC-7 to point here. This is ORCHESTRATOR work (editing sprint/epic-tp1.yaml), not tempest work — note it in findings so Dev does not miss it.

**Citation Tests:** AC-5 requires `npm test -- citations` to stay green.

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-13T21:43:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-13T21:00:03Z | 2026-07-13T21:03:12Z | 3m 9s |
| implement | 2026-07-13T21:03:12Z | 2026-07-13T21:15:02Z | 11m 50s |
| review | 2026-07-13T21:15:02Z | 2026-07-13T21:43:39Z | 28m 37s |
| finish | 2026-07-13T21:43:39Z | - | - |

## SM Assessment

**Routing:** `trivial` (phased): setup → **implement (Dev)** → review (Reviewer) → finish. One point, one character, but the story carries a documentation obligation that is bigger than the fix. Handing to Dev.

**Why this story exists at all.** WD-010 was owned by tp1-3, moved to tp1-1 at 17:01 UTC — 26 minutes *after* tp1-1's session file had already snapshotted seven ACs and gone into green. tp1-1 shipped those seven; tp1-3 had by then been rewritten to say "OUT OF SCOPE, do not touch warpAccel." The finding was disclaimed by both stories and implemented by neither. Setup snapshots ACs; editing an epic under a story in flight does not reach it. That is why I snapshotted all five ACs verbatim above rather than pointing at the epic — and why AC-4 (fix the audit trail) is not optional bookkeeping. It is the actual point of the story.

**The blocking constraint is now clear.** WD-010 could not land before tp1-1 because touching `rules.ts:51` while the `60` was still baked into `warpAccel` would have re-baked it. tp1-1 has merged (tempest#97, d75a4a2) and rebased `warpAccel` onto `ROM_FPS`. The one character can land on its own now. Dev must not disturb that rebase (AC-3) — the fix belongs at the *call site* (`sim.ts:603`), not in `warpAccel` itself.

**Cross-repo — Dev, read this twice.** This story touches TWO repos with different branches and different git rules:
- **tempest** (AC-1, AC-2, AC-3, AC-5) → branch `fix/tp1-23-warpaccel-0based-curwav`, PR targets `develop`.
- **orchestrator / this repo** (AC-4 only) → `sprint/epic-tp1.yaml`, committed straight to `main`. The tp1-3 "OUT OF SCOPE" note is at line 64; tp1-1's orphaned AC-7 also needs a pointer here. Two commits, two repos. Do not try to land AC-4 on the tempest branch, and do not let the tempest PR be the reason AC-4 is forgotten.
- Editing epic YAML by hand: keep any line containing `#` single-quoted. An unquoted `#` truncates the value when the pf toolchain round-trips the file.

**AC-2 is the one that can be faked.** A test that merely asserts 32 will pass whether or not the fix is real if it is written against `warpAccel(0)` directly. The AC demands the test go red when the one character is reverted — so it must exercise the *call path* through `sim.ts:603` (start a game at level 1, enter warp, read `perFrame8_8`), not call `warpAccel` in isolation. Reviewer: verify this by actually reverting the character and watching it fail.

**Jira:** none — this project tracks locally in `sprint/` YAML. `jira_key` is the story id. Explicitly skipped, not missed.

**Session-file trap, logged for the record.** My first draft of this assessment sat *above* `## Workflow Tracking` and broke `pf handoff resolve-gate`: `parse_session_header` (pf/prime/workflow.py:90) `break`s at the first `## …Assessment` heading, so it never reached `**Workflow:**`/`**Phase:**` and reported them missing. Every assessment section must go BELOW Workflow Tracking. Filed as a Delivery Finding.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (tempest — branch `fix/tp1-23-warpaccel-0based-curwav`, pushed, commit `149d542`):**
- `src/core/sim.ts` — the fix. `warpAccel(s.level)` → `warpAccel(s.level - 1)`, with the ROM citation.
- `src/core/rules.ts` — renamed `warpAccel`'s parameter `level` → `wave`; documented CURWAV's 0-basedness against ALWELG/ALSCOR. **The expression is untouched** — tp1-1's `ROM_FPS * ROM_FPS` stands exactly as it left it (AC-3).
- `tests/core/tp1-23.warp-curwav.test.ts` — NEW. Six tests: four pin the wave index, two guard tp1-1's rebase.
- `tests/core/rom-clock-timing.test.ts` — comment only. Its "~1.55 s" was computed from `a = 32/63`, i.e. from the bug itself; the ROM's level-1 dive is 1.62 s. Band left alone deliberately (see below).
- `tests/core/tp1-3.cheap-wins.test.ts` — comment only. Its scope-guard note said WD-010 "moved to tp1-1"; now records that it landed here.
- `docs/audit/findings/*.json` — WD-010 marked `remediated_by: tp1-23`; WD-003/WD-011 re-quoted; 28 other citations re-anchored.

**Files Changed (orchestrator — `main`, pushed, commit `6f4c777`):** `sprint/epic-tp1.yaml` (AC-4).

**Tests:** 881/881 passing, 82 files (GREEN). `npm run build` clean. `npm test -- citations` 10/10.

**AC-2 — the mutation proof.** The AC demanded a test that goes red when the one character is reverted, so I ran exactly that experiment rather than asserting it. With `s.level - 1` reverted to `s.level`, four tests fail:

| assertion | ROM (fixed) | reverted |
|---|---|---|
| level-1 accel byte | `0x20` = 32 | **36** — 12.5% hot |
| level-12 accel byte | `0x4c` = 76 (still climbing) | **80** — saturated a level early |
| level-1 dive length | **46 frames** | **44 frames** |

The 46 is not a number I tuned to make a test pass: the audit derives it independently in pair-11 ("224 = 2t + 0.0625t² gives t = 46.0 frames → 1.62 s"). The two AC-3 rebase guards stay green under the revert, which is correct — they pin `ROM_FPS²`, not the index.

The tests deliberately recover the ROM's raw 8.8 byte from the velocity the sim *actually gains in one step of a real dive*. Winston flagged the trap and he was right: `expect(warpAccel(0)).toBe(0x20)` passes just as happily against the unfixed code, because the defect was never in `warpAccel` — nobody had ever passed it a 0.

**Why I renamed the parameter (and why that is the actual fix).** The story bills this as one character, and the behavioural change is one character. But the reason a 12.5% error survived eight months, two stories, and a suite that *literally times the level-1 dive* is that `warpAccel(level: number)` asked for a level and got one. It was never misread — it was correctly read and wrongly specified. Renaming it to `wave` makes `warpAccel(s.level)` read wrong at the call site, which is the only durable guard here. Logged as a deviation.

**Why I did NOT touch `rom-clock-timing.test.ts`'s assertion band.** It accepts 1.30–1.90 s, which swallows both the 0-based (1.62 s) and 1-based (1.55 s) dives — that band is *how WD-010 walked past a timing test of the very dive it broke*. Tightening it would be re-litigating tp1-1's rebase guard, which AC-3 forbids. The tight pin lives in the new suite instead, and I left a note in the old one saying so.

**The audit fork in the road.** Re-anchoring reported two LOST citations — WD-003 and WD-011 — both quoting the same `rules.ts` line my rename reworded. CLAUDE.md offers two exits, "fix the quote, or mark the finding `remediated_by`", and picking the wrong one silently corrupts the audit. Neither is remediated by me: **WD-003** is class `CONFIRMED` (it asserts our expression already matches the ROM — there is no defect to remediate), and **WD-011** is a live `DIVERGENCE` I did not fix (the ROM's `ASL` pair wraps at wave 64; our `Math.min` never does). Marking either `remediated_by` would have recorded a fix that did not happen. Both were re-quoted instead; only WD-010 is remediated, and its own citation is now frozen at the old line 130 as history.

**Handoff:** To review (The Thought Police).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 881/881 tests, build clean, citations 10/10, reanchor dry-run 184 correct / **0 lost**, tree clean, 0 code smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see F-3, negative-wave analysis) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (no error paths in diff; pure arithmetic) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (mutation-verified; see Verdict) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (**found F-1 and F-2 — both confirmed and fixed**) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see F-4) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (N/A: pure deterministic core, no I/O, no auth, no untrusted input) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (no dead code; comment density matches rules.ts house style) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — `.pennyfarthing/gates/lang-review/` is empty; rules taken from CLAUDE.md and audited by hand (see Rule Compliance) |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents`, each domain assessed directly by the Reviewer)
**Total findings:** 4 confirmed (2 fixed on-branch, 2 accepted as out-of-scope/observation), 0 dismissed, 0 deferred

### Rule Compliance

Rules enumerated from `tempest/CLAUDE.md` (no `.claude/rules/`, no `SOUL.md`, empty lang-review dir). Every rule checked against every changed symbol.

| Rule (CLAUDE.md) | Governed symbols in diff | Verdict |
|---|---|---|
| **core/ is pure — no DOM, `Date.now`, `Math.random`, `performance.now`, `rAF`** | `warpAccel`, `stepWarp`, all 6 new tests | **COMPLIANT.** `grep -nE "Date\|Math.random\|performance\|window\|document"` across the diff returns nothing. `warpAccel` is a pure function of one number; `stepWarp` mutates only `s.warp`. New tests seed via `playingState(level)` and drive `SIM_STEP` — no wall-clock. |
| **All time enters core as `dt`** | `stepWarp` (sim.ts:620) | **COMPLIANT.** `s.warp.velocity += warpAccel(s.level - 1) * dt` — the acceleration is per-second and scaled by `dt`. The story changes the *index*, not the integration. |
| **Take arcade constants from the audit, not the book** | `0x20`, `0x30`, `*4`, wave index | **COMPLIANT — and independently re-verified by me against the 1981 source**, not merely against the audit's summary of it. See Verdict. |
| **Fixed a finding? Mark `remediated_by: <story-id>`** | WD-010 | **COMPLIANT.** `pair-9-warp-drop-mode.json` WD-010 gains `"remediated_by": "tp1-23"`, placed after `verdict`, matching tp1-1's convention exactly. Its `ours` citation is correctly left frozen at the old line 130 as history. |
| **Do NOT mark `remediated_by` on findings you did not fix** (corollary; the gate cannot detect a false one) | WD-003, WD-011 | **COMPLIANT — and this was the trap of the story.** Both quote the same reworded line. WD-003 is class `CONFIRMED` (a non-defect: it asserts our expression matches the ROM) and WD-011 is a **live** `DIVERGENCE` (the ROM's `ASL` pair wraps at wave 64; our `Math.min` never does). Dev re-quoted both instead of remediating them. Marking either would have written a fix into the audit that never happened, and the gate would have gone green on it. Correct call. |
| **Touched a cited file? Run `reanchor-citations.mjs --write`, commit the JSON** | `rules.ts`, `sim.ts` | **COMPLIANT.** 28 citations re-anchored and committed; my independent dry-run reports **0 lost**. I also re-verified every non-remediated `rules.ts` citation byte-for-byte with my own checker rather than trusting the tool. |
| **`ours` must name a tracked file in this repo, never `node_modules/`** | all touched citations | **COMPLIANT.** Every re-quoted/re-anchored `ours` points at `src/core/*.ts`. |
| **Branch `fix/{description}`, PRs target `develop`** | `fix/tp1-23-warpaccel-0based-curwav` | **COMPLIANT.** Base is `origin/develop`; nothing was pushed to `main`. |

## Reviewer Assessment

**Verdict:** APPROVED

**The one thing that mattered, and I did not take it on trust.** This story's entire correctness rests on a single claim — *CURWAV is 0-based* — and the diff sources that claim from the audit's own prose. If CURWAV were 1-based, this "fix" would have *introduced* a 12.5% error into a previously correct game and pinned it with tests. So I re-opened Theurer's 1981 source directly (`~/Projects/tempest-source-text`) rather than the audit's summary of it. All three citations verify byte-for-byte:

- `ALWELG.MAC:192-193` — `LDA I,0` / `STA CURWAV ;TO GET 1ST COLORS` → **seeded to zero.**
- `ALWELG.MAC:1064-1072` — `LDA CURWAV ;WAVE ACCELERATION +` / `ASL` / `ASL` / `CMP I,30` / `IFCS` / `LDA I,30` / `ENDIF` / `CLC` / `ADC I,20 ;BASE ACCELERATION` → `min(CURWAV*4, 0x30) + 0x20`, applied to **CURWAV itself**. There is no `+1` anywhere in the block.
- `ALSCOR.MAC:296-298` — `LDA CURWAV` / `CLC` / `ADC I,1` → the **display** adds the one.

I also checked the radix trap, because `I,30`/`I,20` are only `0x30`/`0x20` if the file is hex: `.RADIX 16` is declared in `ALCOMN.MAC:17`, which ALWELG includes. Had it been decimal, `warpAccel`'s constants would be wrong by a factor unrelated to this story. They aren't. And Theurer's own comment on line 1064 calls it a **WAVE** — the rename matches the ROM's vocabulary, not just Dev's taste.

**The pins bite, and I proved the headline number independently.** I re-derived the dive from scratch under `stepWarp`'s own semi-implicit Euler integration: wave 0 (byte `0x20`) → **46 frames / 1.617 s**; wave 1 (byte `0x24`, the bug) → **44 frames / 1.547 s**. That reproduces both Dev's mutation run and — crucially — pair-11's *independent* derivation (`46 frames → 1.62 s`), which was written before this story existed. The `46` in the test is a ROM number, not a number reverse-engineered from the implementation. This is the difference between a test that pins behaviour and a test that pins a bug.

**Data flow traced:** player clears a level → `stepPlaying` sets `s.mode = 'warp'` (sim.ts:553) and seeds `s.warp.velocity = WARP_INITIAL_SPEED` (sim.ts:555) → each subsequent step, `stepWarp` (sim.ts:620) does `velocity += warpAccel(s.level - 1) * dt` → `progress += velocity * dt` → at `progress >= 1`, `advanceLevel` (`s.level += 1`, sim.ts:569). The index is consumed at exactly one site and nowhere else.

**Observations:**

- `[VERIFIED]` **`warpAccel` has exactly one caller, so no 1-based feeder survives** — `grep -rn "warpAccel" src/` returns only the import (sim.ts:10) and the call (sim.ts:620). The fix cannot be half-applied.
- `[VERIFIED]` **`s.level - 1` can never go negative**, which would hand `warpAccel` a negative wave and yield `min(-4, 0x30) + 0x20 = 0x1c` — *below* the ROM's floor, a silent under-acceleration. Every assignment to `s.level` was enumerated: `state.ts:140` seeds `1`; `sim.ts:569` only increments; `sim.ts:708` gives `1..8` (demo); and the only user-controllable path, the level-select screen, is clamped at `sim.ts:760` — `Math.max(1, Math.min(MAX_SELECT_LEVEL, next))`. `wave >= 0` holds on every path. This was the sharpest edge in the diff and it is closed by a pre-existing clamp.
- `[VERIFIED]` **AC-3 — tp1-1's rebase is untouched.** `warpAccel`'s body is byte-identical (`git diff` shows only the identifier and comments changed); `ROM_FPS * ROM_FPS` still stands. Dev deliberately did NOT narrow `rom-clock-timing.test.ts`'s 1.30–1.90 s band, which would have been re-litigating tp1-1's guard. Correct restraint.
- `[VERIFIED]` **AC-4 landed and is on `origin/main`** — `sprint/epic-tp1.yaml` carries both annotations. Dev *annotated* rather than rewrote the two completed stories' ACs: tp1-1's AC-7 keeps its original text, including the line "It lands here so it cannot be lost," now followed by the record that it was. Preserving the failed prediction is worth more than a tidy record.
- `[DOC]` **F-1 (MEDIUM) — CONFIRMED, FIXED.** `rules.ts` asserted the parameter was misnamed *"for eight months"*. The repo's first commit is 2026-06-24 and `warpAccel` dates to 2026-06-27 (`de189d3`, story 6-1) — roughly **two weeks**. A fabricated duration in the source of a codebase whose discipline is byte-exact, re-openable citation is not a stylistic quibble. Now reads "introduced in story 6-1, fixed in tp1-23" — both verified true in git.
- `[DOC]` **F-2 (MEDIUM) — CONFIRMED, FIXED.** `rom-clock.test.ts` still fed a variable named `level` into a parameter named `wave`, and called `32/63` "the exact rational" without saying whose — after WD-010 that reads as *level 1's* acceleration, which is precisely the misconception this story exists to kill, in the file most likely to be read beside `warpAccel`. The rename's entire stated rationale ("passing a level reads wrong at the call site") was being contradicted three files away. Loop variable renamed to `wave`, ownership of `32/63` stated. **No assertion value or precision changed** — I verified this by diff, because those assertions are tp1-1's rebase guard.
- `[EDGE]` **F-3 (LOW, out of scope, correctly left live) — WD-011 is now the last defect on this line, and it is *reachable*.** The ROM's `LDA CURWAV / ASL / ASL` is an 8-bit shift pair with no carry capture, so at CURWAV ≥ `0x40` the product **wraps** and the dive accel collapses to `0x20`. Our `Math.min(wave * 4, 0x30)` never wraps. `advanceLevel` increments `s.level` without bound, so displayed level 65 is genuinely attainable. Dev did not fix it, did not mark it remediated, and flagged it as a Delivery Finding — exactly right. Now that the index is truly CURWAV, it is a small isolated story.
- `[TYPE]` **F-4 (LOW, accepted) — the rename is a convention, not an invariant.** TypeScript cannot stop `warpAccel(s.level)`: a `number` is a `number`. A branded `type Wave = number & { readonly __wave: unique symbol }` would make WD-010 *unrepresentable* rather than merely *conspicuous*. I am not requiring it — the codebase brands nothing today, and inventing a nominal-type pattern for a 1-point bugfix is over-engineering. But the honest statement of what shipped is "the next caller is warned," not "the next caller is prevented." Worth grooming if a second wave-indexed ramp ever appears.
- `[VERIFIED]` **Citation gate integrity re-checked without the tool.** I re-resolved every non-remediated `rules.ts` citation byte-for-byte with my own script: all OK. The tool's dry run agrees (`184 correct, 0 lost`), but the tool is the thing under test here, so I did not let it grade its own homework.
- `[SEC]` **N/A — no attack surface.** `src/core` is a pure deterministic simulation: no I/O, no network, no auth, no tenancy, no untrusted input, no secrets. The only external input is a `number` spin value, and `Number.isFinite` already rejects NaN/±Infinity at `sim.ts:757` (Story 5-9, pre-existing).

### Devil's Advocate

*Argue that this is broken.*

The most dangerous thing about this change is that **it makes the game 12.5% slower on level 1 and calls that a bugfix.** If the audit is wrong about CURWAV, this diff ships a regression wrapped in ROM citations and defended by four tests — the worst possible failure mode, because the tests would now *enforce* the bug and the next reviewer would trust them. That is why I refused to accept the audit's word and went to `ALWELG.MAC` myself. It holds. But note how close this came: every artefact in the diff (the comment, the test names, the commit message) cites the audit, and the audit cites the ROM. Only one person in that chain actually opened the ROM.

Second attack: **the tests could be circular.** `romAccelByteAtLevel` recovers the byte by *inverting the very conversion `warpAccel` applies* — it multiplies back by `256 * WARP_ALONG_SPAN / ROM_FPS²`. If `warpAccel`'s conversion were wrong, these tests would cheerfully recover `0x20` from a wrong acceleration and pass. So they do **not** independently validate the ROM_FPS² rebase — they validate the *index only*, conditional on the conversion. That is a genuine limitation. It is also fine, because AC-3 explicitly assigns the conversion to tp1-1's `rom-clock.test.ts`, which pins it against the exact rationals `16/63` and `32/63` from the other direction; and the 46-frame test *does* close the loop, because it measures wall-clock frames and matches a figure the audit derived from ROM arithmetic alone. Two independent chains agree. If only the byte-recovery tests existed, I would have rejected.

Third: **a confused user.** `warpAccel(1)` now means wave 1 = displayed level 2. Anyone reading `rom-clock.test.ts` in isolation could still misread the ramp — which is exactly F-2, and why I made it fix that rather than logging it. Fourth: **the `s.level - 1` could underflow** if any future code sets `level = 0` (e.g. a "wave 0" attract demo). Nothing does today, and the select clamp holds, but the invariant "`s.level` is 1-based and ≥ 1" is now load-bearing for *correctness of the ROM ramp* and is enforced nowhere except by convention and one `Math.max`. That is F-4's real bite, and the reason I recorded it rather than waving it through.

Fifth: **the fixup commit itself was a hazard.** Adding two lines of comment to `rules.ts` shifted every line below it and broke WD-003/WD-011's pinned citations — the gate went red in Julia's working tree. She kept the comment line-count-neutral to dodge it. That works and the gate is green, but it means **a pure comment edit in a cited file is a citation-breaking change**, which is deeply counter-intuitive. CLAUDE.md's rule 2 does cover it; the trap is that "I only touched a comment" feels exempt. Recorded as a Delivery Finding.

**Data flow traced:** level-clear → `mode='warp'` → `stepWarp` → `warpAccel(s.level - 1)` → `velocity` → `progress` → `advanceLevel`. Safe because the only index consumer is guarded by a clamp that makes `wave >= 0` unconditional.
**Pattern observed:** annotate-don't-rewrite on completed stories' ACs — `sprint/epic-tp1.yaml` (tp1-1's AC-7 keeps its failed prediction verbatim, with the outcome appended). Good pattern; it preserves the evidence of the process failure instead of laundering it.
**Error handling:** no error paths in this diff — pure arithmetic on a clamped integer. The relevant "error handling" is the boundary analysis in F-3/F-4 above.
**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[SM] Improvement / non-blocking — an assessment section placed above `## Workflow Tracking` silently breaks handoff.** `parse_session_header` (`pf/prime/workflow.py:90`) `break`s out of its scan at the first `## …assessment…` heading, on the assumption that assessments always sit *below* the workflow fields. Put one above them and `pf handoff resolve-gate` fails with "Active session is missing story/workflow/phase fields" — which points at the frontmatter, not at the real cause (section order). The fields were present and correct the whole time. Cost me one confused debug cycle at setup. Either the error should name section order as a possible cause, or the parser should scan the whole file for the workflow/phase fields before bailing at the assessment boundary.

### Dev (implementation)

- **Gap** (non-blocking): A timing test whose band is wider than the gap between adjacent waves cannot catch a wave-index bug — and one didn't. `rom-clock-timing.test.ts`'s level-1 dive test accepts 1.30–1.90 s, so it passed with equal enthusiasm at the ROM's 1.62 s and at the buggy 1.55 s. WD-010 walked straight through a test that times the exact dive it broke. Affects `tempest/tests/core/rom-clock-timing.test.ts` (nothing to change *now* — the band correctly guards tp1-1's 4.45× rebase, and AC-3 forbids me narrowing it — but the lesson generalises: a "ROM wall-clock band" test proves the clock, never the index. Every ramp indexed by wave needs a pin that resolves single waves). *Found by Dev during implementation.*
- **Improvement** (non-blocking): WD-011 is still live and is the last thing standing on the line this story fixed. The ROM's `LDA CURWAV / ASL / ASL` is an 8-bit shift pair with no carry capture, so at CURWAV ≥ 0x40 (displayed level 65) the product **wraps** and the dive accel collapses back to 0x20 — the level-1 value — then climbs again. Our `Math.min(wave * 4, 0x30)` is arbitrary-precision and never wraps, so from level 65 up our dive is permanently faster than the arcade's. Now that the index is genuinely CURWAV, this is a small, well-isolated story (mask the product to 8 bits). Affects `tempest/src/core/rules.ts` (`warpAccel`) — worth grooming into the tp1 epic. *Found by Dev during implementation.*
- **Gap** (non-blocking): `tempest/CLAUDE.md`'s citation rules cover "fixed a finding" and "touched a cited file", but not the case Dev actually hit — **reworded a line that a finding they did NOT fix quotes verbatim**. The re-anchor tool reports it as `LOST` and says "fix the quote, or mark the finding `remediated_by`", and those two exits are not interchangeable: `remediated_by` on a finding you didn't fix (WD-011, a live divergence) or on a `CONFIRMED` non-defect (WD-003) writes a fix into the audit that never happened, and the gate goes green on the lie. The tool cannot tell them apart — it's a judgement call with no guidance attached. Affects `tempest/CLAUDE.md` (add a third rule: re-quote when the finding still stands; `remediated_by` ONLY when the defect it describes is gone). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): A **comment-only edit inside a cited file is a citation-breaking change**, and it does not feel like one. Adding two lines of prose above `warpAccel` shifted every line beneath it and instantly broke WD-003's and WD-011's pinned `ours` line numbers — the gate went red on a change that touched no code at all. CLAUDE.md's rule 2 ("Touched a cited file? Run `reanchor-citations.mjs --write`") technically covers this, but "touched" reads as "changed the code", so the natural instinct is to assume a comment is exempt. It is the opposite: comments are the *most* likely thing to shift a citation, because they are what people add casually. Affects `tempest/CLAUDE.md` (say explicitly that comment/whitespace edits above a cited line count as touching it, and that the re-anchor is not optional for them). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The audit's authority is one-directional and nothing enforces it. Every artefact in this story — source comment, test names, commit message, epic annotation — cites the ROM *via the audit's prose*, and the audit cites `ALWELG.MAC`. I re-opened the 1981 source myself and it held (including the `.RADIX 16` trap, without which `I,30`/`I,20` would not be `0x30`/`0x20`). But nothing in the pipeline *required* anyone to. A fidelity story whose claim is false in the ROM would sail through every gate we have — tests, build, and the citation checker would all be green, because the checker verifies that the quote is *reproduced faithfully*, not that the *inference drawn from it* is sound. Affects `tempest/docs/audit/` workflow (consider requiring the implementing story to re-open the primary source for the specific finding it fixes, and to say so in the session record — the citation gate proves the quote, never the reading). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `workflow.reviewer_subagents` has 8 of 9 specialists disabled (`edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `comment_analyzer`, `type_design`, `security`, `simplifier`, `rule_checker` — only `preflight` is on). The two real findings in this review (F-1's fabricated duration, F-2's stale level/wave naming) both sit squarely in `comment_analyzer`'s domain, and I found them only because the agent definition requires me to cover a disabled specialist's ground myself. That worked here on a 1-point diff; it will not scale, and a reviewer under context pressure on a large diff would plausibly skip it. Affects the pf settings for this project (either re-enable `comment_analyzer` at minimum, or record *why* they are off so the next Reviewer knows the coverage they are personally carrying). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Renamed `warpAccel`'s parameter `level` → `wave`, beyond the specified one-character change**
  - Spec source: sprint/epic-tp1.yaml, tp1-23 description ("The fix is one character"); AC-1, which scopes the change to the call site
  - Spec text: "sim.ts:603 feeds warpAccel a 0-based wave index, not the 1-based s.level" — and the finding's own reasoning: "One-character fix: pass level - 1."
  - Implementation: Made the one-character fix at the call site as specified, AND renamed the callee's parameter from `level` to `wave` (plus a comment citing ALWELG.MAC:1064-1078 / :192-193 and ALSCOR.MAC:296-298). The arithmetic inside `warpAccel` is byte-identical; only the identifier changed.
  - Rationale: The parameter name IS the root cause. `warpAccel(level)` asked for a level and was correctly given one — the bug was in the contract, not in anyone's reading of it. Fixing only the call site leaves a function that still advertises the wrong unit, so the next caller re-introduces WD-010 for free. With the rename, `warpAccel(s.level)` reads wrong on sight. This is the one change that makes the fix durable rather than merely correct.
  - Severity: minor
  - Forward impact: minor — the reworded line is quoted verbatim by two findings that are NOT fixed by this story, so both were re-quoted (not remediated): WD-003 (class CONFIRMED, asserts our expression matches the ROM) and WD-011 (a live DIVERGENCE — the ROM's ASL pair wraps at wave 64, ours doesn't). A future WD-011 story edits this same line and must re-quote them again. `warpAccel` remains exported and its signature is unchanged, so no caller outside `sim.ts` is affected; `rom-clock.test.ts` calls it positionally and stays green untouched.

### Reviewer (audit)

- **Renamed `warpAccel`'s parameter `level` → `wave`** → ✓ **ACCEPTED by Reviewer.** The deviation is sound and I would have flagged its absence. The ROM itself calls this a wave (`ALWELG.MAC:1064`, `;WAVE ACCELERATION +`), so the rename moves our vocabulary *toward* the primary source rather than away from it — this is not a stylistic preference, it is fidelity. The AC-1 requirement (fix the call site) is satisfied independently of it, and the expression inside `warpAccel` is byte-identical, so AC-3 is untouched. Two caveats, both recorded as findings rather than objections: (a) Dev's stated rationale — "the next caller re-introduces WD-010 for free" if the name lies — was, at the moment of writing, *still false in the test suite*: `rom-clock.test.ts` was passing a variable named `level` into it (F-2, now fixed on-branch, commit `59fa5f2`); and (b) a rename is a convention, not an invariant — TypeScript will still accept `warpAccel(s.level)` (F-4). Accepted as the best available fix at this story's size, with the honest caveat that it warns the next caller rather than preventing them.
- **Reviewer-directed follow-up (commit `59fa5f2`), for the record:** I sent two comment-only fixes back to Dev before approving rather than logging them as follow-ups. Both were MEDIUM and therefore non-blocking by the severity rubric, and under normal circumstances I would have deferred them. I did not, for one reason: **this story exists because a finding was logged as someone else's problem and then evaporated.** Deferring two documentation defects out of a story about deferred documentation defects would have been the same mistake wearing a costume. User authorised the on-branch fix.
- **UNDOCUMENTED deviation spotted — none.** I checked the diff against all five ACs and the story description. Everything Dev changed beyond the literal one character is either an AC requirement (the tests, the epic annotations, the `remediated_by`), a CLAUDE.md-mandated consequence (re-anchoring the 28 citations), or the logged rename. Nothing slipped through unlogged.