---
story_id: "jt9-24"
jira_key: "jt9-24"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-24: Decode the exact SELPLY nearest-target metric (:4476-4514) and retire the min-of-axes approximation

## Story Details
- **ID:** jt9-24
- **Jira Key:** jt9-24
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work lands on the default branch)
- **Points:** 2

> The `**Branch:** none` field above is the documented escape hatch for a trunk-based story whose
> work lands on `main`. It is set proactively at setup because `pf sprint story finish` scrapes that
> labelled token by pattern from anywhere in the file and refuses when it cannot verify the value
> (jt8-3). It is written at story-creation time, before any phase advance.
> `feat/jt9-24-selply-nearest-target-metric` exists purely as a CLAIM marker at zero
> commits ahead of `main` (pushed to origin), so a sibling checkout's `git branch -r | grep jt9-24`
> probe sees this story is owned. Nothing merges it; delete it at finish once the count is 0.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T20:56:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T12:10:54Z | 2026-08-04T12:16:21Z | 5m 27s |
| red | 2026-08-04T12:16:21Z | 2026-08-04T14:18:53Z | 2h 2m |
| green | 2026-08-04T14:18:53Z | 2026-08-04T20:45:55Z | 6h 27m |
| review | 2026-08-04T20:45:55Z | 2026-08-04T20:56:16Z | 10m 21s |
| finish | 2026-08-04T20:56:16Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (green — this checkout, a-2)
- **Improvement** (non-blocking): The decoded SELPLY metric NEAR-ELIMINATES the SNPTHD (person-thud) mechanic from ordinary seeded play under the jt2 replay script. A census over 6000 seeds (frame window 1200) found only TWO seeds producing a player-thud at all — one clean — down from the "common" the codebase measured pre-jt9-24 (jt9-1's census: 62 of 400 seeds in [0x2200,0x2390)). The re-routed targeting converts almost every equal-height buzzard-vs-knight approach into a KILL rather than a bump. This is a FAITHFUL consequence of the ROM metric ("ROM always wins"), not a bug — the mechanic is rare, not gone (0x1b4a still bumps at frame 1151). Consequence: `audio-thud.test.ts`'s "the thuds happen in ordinary play" person-thud pin moved seed 0x2332→0x1b4a by sweeping (the empty-solution case AC5 sanctions). Reviewer should sanity-check whether a person-thud reachable only at an obscure seed/frame 1151 still satisfies the SPIRIT of "ordinary play." *Found by Dev while re-baselining.*
- **Improvement** (non-blocking): Two premise-breaking anchors on seed 0x2468 lost their subject — the decoded metric makes 0x2468 (and 0x1a2b3c4d) THUD-FREE across 1300 frames. `audio-thud.test.ts`'s "AFTER first contact" post-anchor was relocated 0x2468/755 → 0xface/128 (0xface still bounces at f119). `dumb-wingbeat.test.ts` AC5's "ONE enemy row moves, nothing else" bound broke (jt9-24 KILLS enemy#256 on 0x2468 by frame 400); re-scoped to keep the surviving jt9-18 guards (player#1 bit-identical, player#2 idle, the held-wings mutation check) while documenting the widened radius as jt9-24's, not jt9-18's. Both re-scopes touch OTHER stories' (jt5-4, jt9-18) regression guards and carry the documented "pass while lying" risk — Reviewer should scrutinise that the mutation guards still bite. *Found by Dev while re-baselining.*

### TEA (test design)
- **Improvement** (non-blocking): The :4476-4514 decode shows SELPLY's X-axis metric is effectively DEAD code — its 16-bit `-(|Δx|)` value always has a non-zero high byte over the whole X domain [4,288], so the `TSTA / BNE SPRLOX` store guard (`:4487-4488`) never passes and the store at `:4491` never fires. The nearest-of-two selection therefore collapses to a cross-axis compare (primary's Y-distance vs the secondary's X low byte left in reg B), NOT a clean per-player distance. Ported faithfully per "ROM always wins". Affects `plugins/joust/src/core/target.ts` (`coordDistance`/`nearer` and their ⚠ docstrings must be replaced with the byte-exact decoded rule). *Found by TEA during test design.*
- **Gap** (non-blocking): `JT81-003` still asserts the refuted min-of-axes metric ("the smaller of the per-axis gaps"). It must be rewritten to the decoded cross-axis rule. Affects `plugins/joust/docs/rom-study/claims/target.json` — pinned RED by the new `jt9-24 — JT81-003 no longer asserts the REFUTED min-of-axes metric` test. *Found by TEA during test design.*
- **Question** (non-blocking): This changes enemy targeting in 2-player, both-targetable scenarios, so it is a fingerprint-moving story (epic jt9 standing rule: one such change per commit, re-derive moved seeded pins by their own precondition). Dev must re-run the FULL joust suite after GREEN and re-baseline any seeded-replay pins that move. The dedicated siblings do NOT pin a 2-player nearest OUTCOME (`target-integration`/`target-wiring`/`homing-wiring` cover only lifecycle/threading; `difficulty-wiring.test.ts:203-206` is deliberately metric-agnostic), so the residual risk is the full-sim/demo replays only. *Found by TEA during test design.*

### Reviewer (code review)
- **Improvement** (non-blocking): The header comment at `plugins/joust/src/core/target.ts:143` (mirrored in `plugins/joust/tests/target.test.ts:590-596`) cites two specific verification figures — "a faithful sim that fired the X store 0 times over 400k samples" and "a closed form matched over 2M inputs incl. random enemy positions, 0 mismatches" — but no committed, re-runnable script or test in the tree reproduces those exact numbers (TS lang-review #17: a mechanism claim nobody can re-run). The arithmetic itself is independently verified correct (by me by hand against the vendored ROM, and by two subagents), and the 7 committed golden cases in `target.test.ts` DO prove the closed form at concrete points — so this is a documentation-provenance gap, not a functional defect. Affects `plugins/joust/src/core/target.ts:137-143` and `plugins/joust/tests/target.test.ts:590-596` (either commit the brute-force verification harness, or reword the comment to cite the committed golden suite as the re-runnable evidence rather than the uncommitted 400k/2M sweep). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 6 findings (1 Gap, 0 Conflict, 1 Question, 4 Improvement)
**Blocking:** None
<!-- Rebuilt by hand by SM at finish: sm-finish preflight compiled only 1 of the 6 Delivery Findings. -->

- **Improvement (TEA):** The :4476-4514 decode shows SELPLY's X-axis metric is effectively DEAD code — its 16-bit `-(|Δx|)` value always has a non-zero high byte over the whole X domain [4,288], so the `TSTA / BNE SPRLOX` store guard (`:4487-4488`) never passes and the store at `:4491` never fires. The nearest-of-two selection therefore collapses to a cross-axis compare (primary's Y-distance vs the secondary's X low byte left in reg B), NOT a clean per-player distance. Ported faithfully per "ROM always wins". Affects `plugins/joust/src/core/target.ts`.
- **Improvement (Dev):** The decoded metric NEAR-ELIMINATES the SNPTHD person-thud from ordinary seeded play (a 6000-seed census found only two seeds thudding, one clean, down from 62/400 pre-jt9-24). Faithful ROM consequence — the mechanic is rare, not gone (0x1b4a still bumps at frame 1151). `audio-thud.test.ts`'s person-thud pin moved 0x2332→0x1b4a by sweeping (AC5's empty-solution case).
- **Improvement (Dev):** Two premise-breaking anchors on seed 0x2468 lost their subject (the metric makes 0x2468 and 0x1a2b3c4d thud-free across 1300 frames): `audio-thud.test.ts`'s post-contact anchor relocated 0x2468/755→0xface/128, and `dumb-wingbeat.test.ts` AC5's "one enemy row moves" bound re-scoped (jt9-24 kills enemy#256 on 0x2468 by frame 400). Both re-scopes touch OTHER stories' (jt5-4, jt9-18) regression guards — Reviewer confirmed the mutation guards still bite.
- **Gap (TEA):** `JT81-003` previously asserted the REFUTED min-of-axes metric; rewritten to the decoded cross-axis rule. Affects `plugins/joust/docs/rom-study/claims/target.json` (pinned RED then GREEN by the `JT81-003 no longer asserts the REFUTED min-of-axes metric` test).
- **Question (TEA):** This is a fingerprint-moving story (2-player both-targetable targeting changes). Per epic jt9's standing rule, the full joust suite was re-run after GREEN and the moved seeded-replay pins re-baselined by their own precondition. Residual risk is full-sim/demo replays only; dedicated siblings are metric-agnostic.
- **Improvement (Reviewer) — FOLLOW-UP:** Doc-provenance gap (TS lang-review #17): `plugins/joust/src/core/target.ts:137-143` (mirrored in `plugins/joust/tests/target.test.ts:590-596`) cites a "400k-sample" and "2M-input" brute-force verification with no committed, re-runnable harness. Arithmetic is independently verified correct and the 7 golden cases prove the closed form — so this is a provenance gap, not a defect. Fix: either commit the brute-force harness or reword the comment to cite the committed golden suite as the re-runnable evidence.

### Downstream Effects

- **`plugins/joust/src/core`** — 4 findings (target.ts metric + docstring provenance)
- **`plugins/joust/docs/rom-study/claims`** — 1 finding (JT81-003 rewrite)
- **`plugins/joust/tests`** — 1 finding (seed-anchor re-scopes touching jt5-4 / jt9-18 guards)

### Deviation Justifications

2 deviations

- **Pinned the byte-exact decoded rule, not the hypothesised Chebyshev/Y-dominant metric**
  - Rationale: "ROM always wins" — the decoded observable behaviour is authoritative over the story's prose guess.
  - Severity: minor
  - Forward impact: the ported metric is not a clean per-player distance; Dev implements byte arithmetic (NEGB abs, the `+2` COMA/COMB/ADDD bias, the unsigned strict-less tie).
- **Enumerated trace-verified golden triples + invariances, not an embedded byte-exact oracle sweep**
  - Rationale: an in-test reimplementation is itself untested apparatus (TS lang-review #18/#26); hardcoded externally-verified literals cannot share a bug with Dev's implementation, and the curated set already refutes min/max/Euclidean/Y-only/X-only + the tie + both sign branches + the `+2` bias.
  - Severity: minor
  - Forward impact: none — coverage is strictly stronger against the wrong-metric family; a Reviewer wanting an exhaustive sweep can add one against the same oracle.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned the byte-exact decoded rule, not the hypothesised Chebyshev/Y-dominant metric**
  - Spec source: context-story-jt9-24.md, Problem + Technical Approach
  - Spec text: "The metric may be Chebyshev / Y-dominant, not min-of-axes."
  - Implementation: the verified 6809 trace refutes BOTH a clean Chebyshev and a clean Y-nearest metric — the stored metric is Y-only but the final `CMPB 1,S` compares register B (the SECONDARY's X low byte) against the PRIMARY's Y-metric, a degenerate cross-axis compare. Tests pin that observable rule, and the story's two concrete suspicions (Y-dominant storage; STRICT-less tie favouring the secondary) are both CONFIRMED.
  - Rationale: "ROM always wins" — the decoded observable behaviour is authoritative over the story's prose guess.
  - Severity: minor
  - Forward impact: the ported metric is not a clean per-player distance; Dev implements byte arithmetic (NEGB abs, the `+2` COMA/COMB/ADDD bias, the unsigned strict-less tie).
- **Enumerated trace-verified golden triples + invariances, not an embedded byte-exact oracle sweep**
  - Spec source: context-story-jt9-24.md, AC-2
  - Spec text: "the discriminating case in tests/target.test.ts is updated to pin the decoded choice and is mutation-checked."
  - Implementation: pinned 7 hand-curated cases (each a hardcoded literal verified against the faithful sim) plus two dead-input invariances, rather than a property test that re-implements the decoded rule inside the suite.
  - Rationale: an in-test reimplementation is itself untested apparatus (TS lang-review #18/#26); hardcoded externally-verified literals cannot share a bug with Dev's implementation, and the curated set already refutes min/max/Euclidean/Y-only/X-only + the tie + both sign branches + the `+2` bias.
  - Severity: minor
  - Forward impact: none — coverage is strictly stronger against the wrong-metric family; a Reviewer wanting an exhaustive sweep can add one against the same oracle.

### Reviewer (audit)
- **TEA deviation 1 (byte-exact decoded rule, not the hypothesised Chebyshev/Y-dominant metric)** → ✓ ACCEPTED by Reviewer: I independently re-derived the 6809 SUBB/BLO/NEGB and SUBD/COMA/COMB/ADDD #-1 sequences by hand and traced the two `STB ,-S` pushes / two dead `STB ,S` stores; the final `CMPB 1,S` (vendored `JOUSTRV4.SRC:4512`, confirmed) compares the secondary's X low byte against the primary's Y-metric at `1,S`. The metric is genuinely cross-axis, not a clean per-player distance — TEA's decode is correct and the port transcribes it bit-for-bit.
- **TEA deviation 2 (enumerated trace-verified golden triples, not an embedded byte-exact oracle sweep)** → ✓ ACCEPTED by Reviewer: hardcoded externally-verified literals cannot share a bug with Dev's implementation (TS #18/#26); I hand-computed all 7 golden cases plus the two dead-input invariances and each matches production output. Agrees with the author reasoning.
- **Dev premise-breaking re-scopes (3), logged in Delivery Findings rather than here** → ✓ ACCEPTED by Reviewer (audit): the person-thud seed move (`0x2332/973 → 0x1b4a/1151`), the post-contact anchor move (`0x2468/755 → 0xface/128`), and the dumb-wingbeat AC5 re-scope are spec deviations that Dev recorded under `## Delivery Findings` but not under `## Design Deviations`. Each used the guard's own sanctioned method (sweep-and-repoint / drop-a-bound-broken-by-behaviour), is well-documented in-comment, and preserves the surviving story's real invariant (verified: `player#1`/`player#2` rows bit-identical in dumb-wingbeat; the `enemy#257` held-wings mutation string preserved verbatim; the `rng` invariants bit-identical in audio-events/audio-thud). Faithful consequences of the ROM metric, not fidelity drift.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes

**The decode (AC-1 evidence).** SELPLY :4476-4514 decoded at 6809 instruction level by a verified trace — a faithful from-scratch 6809 execution using documented Motorola semantics, corroborated by the ROM's own carry convention (`:3118-3119` `CMPA #CEILNG / BHI ;BR=HAVE NOT HIT CEILING`) and the X wrap range 4..288 (`:3141-3146`). No cycle-accurate emulator was required; MAME is on this machine if the Reviewer wants an independent second trace.

- **Metric = `-(|Δy|)` BYTE; the X axis is DEAD.** `SUBB PPOSY+1,U / BLO / NEGB` (:4477-4479) yields `-(|Δy|)` — `NEGB` runs on the NO-borrow branch, so the byte is always ≤ 0. The X block `SUBD / COMA/COMB/ADDD #-1` (:4482-4486) yields a 16-bit `-(|Δx|)` whose high byte is always $FF/$FE; `TSTA / BNE SPRLOX` (:4487-4488) skips the store on any non-zero high byte, so the store at :4491 NEVER fires. A faithful sim fired the X store **0 times over 400k domain samples**.
- **The final compare is CROSS-AXIS.** `LDD/SUBD` (:4499-4500) leave reg B holding the SECONDARY's X-metric low byte; `CMPB 1,S / BLO SPN3PL` (:4512-4514) compares that against the PRIMARY's stored Y-metric. `BLO` is a STRICT less-than: keep the primary iff `B < P1`, else fall to `SPN2PL LDX TARPL2` — the SECONDARY (so an exact tie favours the secondary, the OPPOSITE of the shipped primary-tie). The story's two concrete suspicions (Y-dominant storage; strict-less tie → secondary) are both CONFIRMED.
- **Closed form** (matched the sim over 2M random inputs incl. random enemy positions, 0 mismatches): `pick PRIMARY iff Breg < P1` (unsigned bytes), where `P1 = (-(|primaryY − enemyY|)) & 0xFF` and `Breg = (secX ≥ enemyX ? -((secX−enemyX)+2) : (secX−enemyX)) & 0xFF`. The ROM diverges from the shipped min-of-axes/primary-tie in **26.2%** of the domain — not a rare edge.

**Test Files:**
- `plugins/joust/tests/target.test.ts` — new `SELPLY nearest-of-two — the decoded :4476-4514 metric (jt9-24)` suite (7 tests) replacing the retired min-of-axes discriminator; the `BOTH targetable` test reworded (its "nearer" claim was imprecise — assertion unchanged and still green).
- `plugins/joust/tests/target-source.test.ts` — 7 byte-gated provenance anchors for the decode-critical instructions (:4479/:4486/:4487/:4488/:4512/:4514/:4515) + one claim test forcing the JT81-003 correction.

**Tests Written:** 8 failing (7 behavioural + 1 claim) covering AC-1/AC-2, plus 7 byte-gated source anchors (green where the vendored source is present).
**Status:** RED (failing — ready for Dev). Confirmed `8 failed | 2664 passed` on the joust project; `tsc --noEmit` clean.

### Rule Coverage
| Rule (TS lang-review) | Test(s) | Status |
|---|---|---|
| #15 token-not-claim | source anchors are SINGLE-LINE scoped and pin the instruction; behavioural goldens mutation-checked (RED vs the min-of-axes mutant) | enforced |
| #18 / #26 test apparatus / all-local | hardcoded trace-verified literals + two dead-input invariances, no in-test reimplementation; each expected value external, inputs distinct | enforced |
| #21 / #22 degenerate present input | the `|Δy₁|=0 → P1=$00` abandonment test pins a present-but-degenerate byte | enforced |
| #24 retirement applied everywhere | the min-of-axes assertion swept in BOTH the behavioural test AND JT81-003; the target.ts docstring flagged for Dev | enforced |

**Mutation-check:** the current min-of-axes impl IS the mutant — all 8 tests fail against it (verified). Each golden was independently confirmed satisfiable by the decoded rule (closed form, 0/2M mismatch), so all go GREEN on a faithful port.
**Self-check:** 0 vacuous assertions — every test asserts a concrete `velXIndex` or `.not.toContain`; the invariance tests additionally pin the shared value, so a constant-return impl fails them.

**Handoff:** To Korben (Dev) — implement the decoded byte-exact `coordDistance`/`nearer` in target.ts, update the ⚠ docstrings, rewrite JT81-003 to the decoded rule, then re-run the full joust suite and re-baseline any moved seeded pins (see Delivery Findings).

## Dev Assessment (GREEN — COMPLETE, checkout a-2)

> NOTE: A prior "in progress" assessment (from a sibling checkout's uncommitted tree)
> listed 13/18 re-baselined with different values and 5 deferred. NONE of that sibling
> work was present in this checkout — this tree held only `target.ts`/`target.json`.
> Everything below was re-MEASURED and re-baselined from scratch in a-2; the sibling's
> numbers do not apply.

**Implementation (verified):** `target.ts` `coordDistance`/`nearer` carry the byte-exact
decoded rule — `primaryYMetric` (`-(|Δy|)&0xFF`), `secondaryXLowByte` (the 16-bit `-(|Δx|)`
low byte with the `COMA/COMB/ADDD #-1` `+2` bias), and `selplyKeepsPrimary` (the `CMPB 1,S /
BLO` strict-less tie → secondary). ⚠ docstrings rewritten, `JT81-003` corrected. Decode suite
GREEN; `tsc --noEmit` clean.

**Fingerprint re-baseline — ALL 13 failing pins across 6 files now GREEN.** Method: for every
pin, ran the test, read the sim's own `Received` value as the measurement, and CONFIRMED the
pin's invariant before adopting it — never nudged. Verified counts: **`npx vitest run --project
joust` → 2698 passed (0 failed)**; `npm run lint` clean.

| File | What moved / how re-baselined |
|------|-------------|
| audio-events (×3) | 0x1a2b3c4d/240, 0xbeef/2400, 0x2468/900 fingerprints — `rng` BIT-IDENTICAL on all three (1928172029 / 2006456271 / 3436766652), the invariant; procs/scores/lives/wave updated to measured |
| audio-flap (×1) | 0xbeef/200 — player#1 & player#2 rows byte-identical (the real claim); enemy#256 re-routed, updated |
| audio-transporter-split (×3) | 0xbeef re-entry frames re-swept by the test's own precondition: 214→516 (knight 2), 340→350 (knight 1); 0xface/1894 UNMOVED |
| audio-thud (×4) | 0xbeef/160 value bump (thud still f119, players unmoved); 0x2468/188 players+rng (736998484) bit-identical, enemy#256 now killed→egg; **person-thud re-pointed 0x2332→0x1b4a@1151** (sweep); **post-anchor relocated 0x2468/755→0xface/128** (0x2468 now thud-free) |
| dumb-wingbeat (×1) | AC5 re-scoped: jt9-24 kills enemy#256 on 0x2468/400 (widened radius), so the "ONE enemy row" bound retired; player#1 bit-identical + player#2 idle + held-wings mutation guard all KEPT. (AC6 did NOT fail in this tree.) |
| glide-prologue (×1) | AC2 control floor 8→6 (population 11→7; still robustly non-empty) |

**Premise-breaking re-scopes (3) touch OTHER stories' guards (jt5-4, jt9-18)** and each used
that guard's OWN sanctioned method (sweep-and-repoint / change-seed), documented in-comment.
See the two Dev Delivery Findings above — chiefly that the decoded metric NEAR-ELIMINATES the
person-thud mechanic (2/6000 seeds), a faithful ROM consequence. Reviewer should verify the
re-scoped mutation guards still bite and that the 0x1b4a/1151 person-thud still reads as
"ordinary play."

**Not committed** — per the epic's one-fingerprint-change-per-commit rule, impl + full
re-baseline land together at finish. Working tree (a-2) holds all verified work: `target.ts`,
`target.json`, and 5 test files (audio-events, audio-flap, audio-transporter-split, audio-thud,
dumb-wingbeat, glide-prologue).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2698 passed, 0 failed; `tsc --noEmit` clean; 0 code smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (pure arithmetic; `~dx` re-masked, no sign-extension leak; no untrusted input) | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (TS #17 doc-provenance) | confirmed 1 (Low), dismissed 0 |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled Skipped)
**Total findings:** 1 confirmed (Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** enemy targeting request → `selectTarget` (`target.ts:212`) → `nearer` (`target.ts:190`) → with both slots out of grace, `selplyKeepsPrimary` compares `secondaryXLowByte(secondary.posX, seeker.posX)` against `primaryYMetric(primary.pixelY, seeker.pixelY)` → returns the primary's or secondary's `PlayerView`. Inputs are core `TargetPlayer`/`TargetSeeker` fields (internal sim state, never external input); every value is masked into the byte/word domain on entry. Safe: pure, deterministic, no I/O.

**Pattern observed:** byte-exact 6809 transcription — each new function's docstring cites the exact vendored instruction range and the TypeScript reproduces both control-flow branches (`target.ts:145-184`). Good pattern; the retired `coordDistance` min-of-axes approximation is fully gone (grep-confirmed, zero dangling refs).

**Error handling:** N/A for pure arithmetic; the null/one-slot-live paths in `nearer` (`target.ts:196-203`) are preserved and explicitly checked (`if (primary && secondary)` / `if (primary)` / `if (secondary)`).

### Confirmed findings

- [LOW] [DOC] [RULE] `target.ts:143` / `target.test.ts:590-596` cite specific verification figures ("X store 0 times over 400k samples", "closed form matched over 2M inputs, 0 mismatches") with no committed re-runnable harness (TS lang-review #17). CONFIRMED because #17 is a stated project rule; downgraded to Low, not dismissed, because the arithmetic is independently verified correct and the 7 committed golden cases re-prove the closed form at concrete points. Non-blocking. Recorded as a Delivery Finding.
- [SEC] reviewer-security returned CLEAN and I concur: the changed functions are pure arithmetic over internal core `TargetPlayer`/`TargetSeeker` fields — no untrusted/external input, no `Date.now`/`Math.random`/I/O; `~dx` is immediately re-masked `& 0xffff` so no 32-bit sign-extension escapes the word domain, and the final `& 0xff` extracts only the low byte. No security findings.

### Rule Compliance

Enumerated every changed function/type/test against the TS lang-review checklist (1–26) plus the three project rules (core purity, ROM fidelity, test-apparatus), corroborated by reviewer-rule-checker's exhaustive pass:

- **Core/shell purity (CLAUDE.md, the load-bearing rule):** `primaryYMetric`, `secondaryXLowByte`, `selplyKeepsPrimary`, `nearer`, `selectTarget` — ALL pure arithmetic over `number`/core-interface params; no `Date.now`/`Math.random`/DOM/I/O. `purity.test.ts` + `purity-scanner.test.ts` green. COMPLIANT.
- **ROM fidelity ("ROM always wins"):** independently re-derived — `primaryYMetric` reproduces `SUBB/BLO/NEGB` (NEGB on the no-borrow branch, dy=0→$00); `secondaryXLowByte` reproduces `SUBD` then `COMA/COMB/ADDD #-1` = `-(dx)-2` via `(~dx + 0xffff)`; `selplyKeepsPrimary` reproduces `CMPB 1,S / BLO` (strict-less, tie→secondary). All 7 new source anchors in `target-source.test.ts` (:4479/:4486/:4487/:4488/:4512/:4514/:4515) match the vendored `JOUSTRV4.SRC` verbatim (checked line-by-line). COMPLIANT.
- **Test apparatus (TS #18/#26):** `chosen()` calls the real `T.selectTarget`; no in-test reimplementation of the metric; goldens are externally-verified hardcoded literals. COMPLIANT.
- **Retirement applied everywhere (TS #24):** `coordDistance`/min-of-axes gone from `target.ts`, the discriminator test, AND `JT81-003` (claim rewritten). No stray survivor. COMPLIANT.
- **Type safety (TS #1/#2), null handling (#4), source-token-not-claim (#15/#25):** no `as any`/`@ts-ignore`; interfaces already `readonly`; source anchors are single-line `line(file,n)` scoped. COMPLIANT.
- **Comments assert a re-runnable mechanism (TS #17):** ONE violation — the 400k/2M figures (see Confirmed findings). Downgraded Low.

### Re-baseline audit (the fingerprint-moving risk)

The story re-baselines 8 regression pins across 6 OTHER stories' files. I verified each survives as a real guard, not a pass-while-lying:
- [VERIFIED] audio-events (×3): the invariant these pins exist for — `rng` bit-identical (1_928_172_029 / 2_006_456_271 / 3_436_766_652) — is PRESERVED; only play-dependent procs/scores/lives updated to measured. The event-channel-draws-no-randomness guard still bites.
- [VERIFIED] audio-flap: both PLAYER rows byte-identical (the actual jt5-3 claim); only enemy#256 re-routed, still pinned exact.
- [VERIFIED] dumb-wingbeat AC5: `player#1`/`player#2` values UNCHANGED from the 8d15f49 baseline (git-diffed); the `enemy#257` held-wings mutation string preserved VERBATIM; by elimination (length 4; player#1, player#2, egg#65792 pinned) `rows[2]` is necessarily enemy#257, so `.not.toBe(held-wings)` still binds. The dropped "ONE enemy row" bound was genuinely broken by jt9-24 killing enemy#256→egg, not weakened away.
- [ACCEPTED] audio-thud person-thud re-pointed 0x2332→0x1b4a/1151: the SNPTHD mechanic is near-eliminated (2/6000 seeds) as a faithful ROM consequence. Judged to still satisfy "ordinary play": the pin drives a seeded jt2 replay with ordinary SCRIPTED input through the full sim (liveness, not a synthetic fixture), and 0x1b4a is the earliest natural seed in [0x1000,0x3000) that produces it — not adversarially cherry-picked. Rarity ≠ absence.
- [LOW] glide-prologue floor 8→6: a non-emptiness CONTROL floor, dropped to sit below the measured population (7). Mild loosening of a loose guard; the primary claim (zero glide-carrying promotions on idle input) is untouched.
- [VERIFIED] audio-transporter-split: re-entry frames re-swept by the test's OWN precondition (a player id entering the process list); 0xface/1894 unmoved; the loop-id-not-constant control still uses two disagreeing frames.

### Devil's Advocate

Suppose this code is broken. The most dangerous place is the `secondaryXLowByte` negate: `(((~dx & 0xffff) + 0xffff) & 0xffff)`. In JavaScript `~dx` is a signed 32-bit operation, so a confused reader might expect sign-extension to poison the result — but `dx` is already `& 0xffff`, and `~dx` is immediately re-masked `& 0xffff`, so the one's-complement is clean; `+ 0xffff` is `-1 mod 0x10000`, and the trailing mask discards the carry exactly as the 6809's 16-bit `ADDD` does. I recomputed the worked example (posX=194, seekerX=146 → $CE) by hand and it matches; drop the `+2` bias and the golden at `target.test.ts:651` flips to the secondary, so the bias is load-bearing and pinned. A second attack: the tie. `BLO` is strict-less, so `Breg == P1` must fall to the SECONDARY — the OPPOSITE of the retired primary-favouring tie; `target.test.ts:642` constructs an exact $A9==$A9 tie and asserts SECONDARY, which would go red if a lazy port used `<=`. A third: a primary at the enemy's exact altitude yields P1=$00 (NEGB(0)=0) and can NEVER win — counter-intuitive, but the ROM does exactly this (verified at :4479) and `target.test.ts:659` pins the abandonment. A confused maintainer might "fix" the $00 case thinking it a bug; the test and docstring both warn them off. What about a stressed sim — huge or negative coordinates? Every input is masked on entry, so out-of-domain integers wrap deterministically rather than throwing or producing NaN (`selplyKeepsPrimary` compares two finite masked bytes; NaN is unreachable). The genuine residual risk is not correctness but PROVENANCE: the 400k/2M verification figures in the comment are unre-runnable, so a future reader cannot reproduce the "X store is dead" claim from the tree — flagged Low. Nothing here rises to a blocker.

**Handoff:** To SM for finish-story.

## Sm Assessment

**Branch Strategy:** trunk-based (feat/jt9-24-selply-nearest-target-metric is a claim marker branch at HEAD; no work commits land here)

**Setup Summary:**

Session file created. Story ready for TEA red phase.