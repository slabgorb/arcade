---
story_id: "ml11-3"
jira_key: ""
epic: "ml11"
workflow: "tdd"
---
# Story ml11-3: Test-hardening tail (2 commits, 2 test files — TEA/Architect may split): (a) ml7-11 r2 — add an ALPHANUMERIC_COLOUR provenance guard at a NON-colliding level (today $1F collides with wave-1 inside-mushroom, so a mis-wire would pass) + assert $00 never appears in FIELD_REGION_COLOURS; (b) ml10-6 — widen the file-scoped pointer-lock relocation-mutant regex guard so a relocation mutant cannot evade it.

## Story Details
- **ID:** ml11-3
- **Jira Key:** (no Jira integration)
- **Branch:** feat/ml11-3-harden-alphanumeric-and-pointerlock-guards
- **PR:** 494 (MERGED into develop, merge commit 95d522d9)
**Branch:** feat/ml11-3-harden-alphanumeric-and-pointerlock-guards
**PR:** 494
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 2
- **Priority:** p3
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T00:01:11Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T23:16:10Z | 2026-08-16T23:19:28Z | 3m 18s |
| red | 2026-08-16T23:19:28Z | 2026-08-16T23:34:04Z | 14m 36s |
| green | 2026-08-16T23:34:04Z | 2026-08-16T23:35:49Z | 1m 45s |
| review | 2026-08-16T23:35:49Z | 2026-08-16T23:50:26Z | 14m 37s |
| green | 2026-08-16T23:50:26Z | 2026-08-16T23:53:02Z | 2m 36s |
| review | 2026-08-16T23:53:02Z | 2026-08-17T00:01:11Z | 8m 9s |
| finish | 2026-08-17T00:01:11Z | - | - |

## Background & Technical Approach

### Measured Premises (verified against live tree 2026-08-16)

**(a) ALPHANUMERIC_COLOUR collision is real:**
- `ALPHANUMERIC_COLOUR = 0x1f` defined at `plugins/millipede/src/core/playfield-colour.ts:83`
- `waveColours(1).insideMushroom = 0x1f` pinned in `plugins/millipede/tests/playfield-colour.test.ts:157`
- A mutant rewiring `ALPHANUMERIC_COLOUR = waveColours(1).insideMushroom` would pass every current test
- Current test at lines ~214-224 guards only `PLAYER_COLOUR ($00)` absence from inside-mushroom set, NOT ALPHANUMERIC provenance
- Source cite: ANCOL+2, MLIRQ.MAC:294-296 (ROM colour-palette initialization)
- `PLAYER_COLOUR = 0x00` at playfield-colour.ts:70
- `FIELD_REGION_COLOURS` at playfield-colour.ts:51 (`COLOUR_LEVELS = FIELD_REGION_COLOURS.length`, playfield-colour.ts:67)

**(b) Pointer-lock guard is file-scoped:**
- Guard code in `plugins/millipede/tests/pointer-lock.test.ts` scans `main.ts` for `.reset(` via source-regex
- Documented in `plugins/millipede/tests/pointer-lock-reset-on-exit.test.ts:7`
- A contrived relocation mutant can evade the file-scoped regex today (but the named mutant IS killed by current tests)
- Relevant guard files: both `pointer-lock.test.ts` and `pointer-lock-reset-on-exit.test.ts`

### Decision Deferred to TEA/Architect

This story FOLDS two logically separate guard improvements (by strict file-surface grouping rule, these would be two stories):
- **(a)** edits `plugins/millipede/tests/playfield-colour.test.ts`
- **(b)** edits pointer-lock guard test file(s)

TEA/Architect may split these into two commits/branches if the workflow proves awkward. This is a **materialization decision** (user chose to fold them) and is recorded here for visibility but is NOT a blocking decision.

## Acceptance Criteria

> COPIED VERBATIM FROM sprint/epic-ml11.yaml

- ALPHANUMERIC_COLOUR provenance is guarded at a NON-colliding level in plugins/millipede/tests/playfield-colour.test.ts: a mutant that wires ALPHANUMERIC_COLOUR to a waveColours(level).insideMushroom that equals $1F only at the colliding level now REDDENS the suite (mutation-verified); optionally, $00 is asserted never to appear in FIELD_REGION_COLOURS.
- The ml10-6 pointer-lock guard no longer depends on the mutant staying in its original file location: a relocation mutant that today evades the file-scoped regex now REDDENS the guard (mutation-verified with the relocation mutant that ml10-5's Reviewer described).
- No production source changes (this is test-only hardening); the full millipede + orchestrator suites stay green, and each strengthened guard is shown to kill the specific mutant it targets (not a vacuous pass).

> **NOTE:** This is test-only hardening — no production source code changes. Each strengthened guard must be mutation-verified to confirm it reddens the specific mutant it targets (not a vacuous pass that already passes).

> **NOTE:** File-surface split recorded above (a/b may be split by TEA/Architect if needed).

## SM Assessment

**Setup complete — ready for TEA (RED phase).**

**Premise verification (the reflex that governs this story).** Both falsifiable premises this
hardening tail rests on were measured live against the working tree and found TRUE, not stale — so
the description was safe to carry forward verbatim:
- **(a)** `ALPHANUMERIC_COLOUR = 0x1f` (playfield-colour.ts:83) is byte-identical to
  `waveColours(1).insideMushroom = 0x1f` (pinned at playfield-colour.test.ts:157). The collision is
  real: the current test only guards `PLAYER_COLOUR` ($00) absence, so a mutant wiring
  `ALPHANUMERIC_COLOUR = waveColours(1).insideMushroom` passes today. Gap confirmed.
- **(b)** the pointer-lock guard IS file-scoped — it scans `main.ts` for `.reset(` by source-regex
  (documented at pointer-lock-reset-on-exit.test.ts:7). A relocation mutant can evade it. Gap confirmed.

**ACs preserved verbatim.** Diffed the three ACs in the context against `sprint/epic-ml11.yaml`
word-for-word — no silent edit occurred this time.

**Sibling/merge probes clean.** No branch or session anywhere owns ml11-3 (a-2 runs mc12-1, a-3 runs
df4-2; the only `ml11` branches belong to the completed ml11-1). Zero open PRs. Claim committed and
branch pushed to `origin` so the story is now visible to sibling probes.

**One trap avoided at claim time.** `pf sprint story update` round-tripped `sprint/epic-mc12.yaml`
(a spurious `type: bug` key-reorder on mc12-1, which a-2 is actively editing). Reverted it — only the
ml11-3 stamp was committed.

**Note for TEA / Architect — a real split decision, delegated, not resolved.** This tail folds two
guard improvements over DIFFERENT files ((a) playfield-colour.test.ts, (b) the pointer-lock guard
test). By the strict file-surface grouping rule they are two stories; they are folded here per the
materialization decision. You MAY split them into two commits if it proves cleaner — that is your call.
Both are **test-only hardening: no production source change**, and each guard must be
**mutation-verified** to redden the exact mutant it targets, not pass vacuously.

## TEA Assessment

**RED landed and is clean.** Full millipede project: **1444 passed / 1 failed** — the single
failure is the one intended differential (AC2), and it names exactly what GREEN must fix.
`git commit 671eaa72` (a) + `2f5e4fea` (b), on `feat/ml11-3-harden-alphanumeric-and-pointerlock-guards`.

### Split decision (the one delegated to me): FOLD, two commits
Kept as ONE story, two commits (one per file). Both changes are ~40 lines of test code; splitting
into two stories would be pure overhead. (a) → `tests/playfield-colour.test.ts`; (b) →
`tests/pointer-lock.test.ts`.

### ⚠ CORRECTION to the story text — the (b) target is the onReject guard, NOT the reset guard
The story/description paraphrases (b) as "the pointer-lock guard's regex is FILE-SCOPED." The epic's
AC2 pins it to "the relocation mutant that ml10-5's Reviewer described." I read that primary source
(`sprint/archive/ml10-5-session.md:62-66`): the finding is against **`pointer-lock.test.ts:443`, the
onReject pin `/createPointerLock\([\s\S]*?console\.warn\(/`** — NOT the `.reset(` guard at line 433.
The Reviewer's reproduced mutant is **compound**: *delete the createPointerLock 4th arg (onReject)
AND add any unrelated `console.warn` elsewhere in main.ts* — the lazy `[\s\S]*?` then reaches the
stray warn and false-passes. I targeted the real guard. **Reviewer/Dev: do not "fix" line 433 — it
is out of scope and correct.** (This is the "measure the premise, the paraphrase can be wrong" rule.)

### AC-by-AC
- **AC1 (a) — DONE, green-on-write (a TEA scope call, ml7-6 precedent).** There was no ALPHANUMERIC
  provenance guard to fail, and the real code is already correct, so this is a new non-vacuous guard,
  not a red-on-pristine. A **value** check cannot cover ALPHANUMERIC_COLOUR: $1F is *both* the
  constant *and* `waveColours(1).insideMushroom`, so the r2 mutant `ALPHANUMERIC_COLOUR =
  waveColours(1).insideMushroom` shares the value. The guard reads the module **source** and requires
  the definition to be a bare numeric immediate. Non-vacuity is proven by an **in-test differential**:
  the same `isImmediate` predicate accepts the real `0x1f` RHS and rejects the exact mutant RHS.
  The optional "$00 never in FIELD_REGION_COLOURS" is **already** covered by the AC3 guard
  (`playfield-colour.test.ts:212`, across all three channels × 12 levels) — not duplicated (DRY).
  **No Dev work for (a).**
- **AC2 (b) — RED, one crisp GREEN edit for Dev.** Widen the shared constant in
  `plugins/millipede/tests/pointer-lock.test.ts` from the file-scoped form to the call-scoped form:
  ```
  const ONREJECT_WIRING_RE = /createPointerLock\((?:(?!\n\))[\s\S])*?console\.warn\(/
  ```
  (currently `/createPointerLock\([\s\S]*?console\.warn\(/`). That single change greens the failing
  `... REJECTS the relocation mutant` test AND keeps the real-source guard at line ~444 green — I
  verified both behaviours out-of-band before writing (real accepted, compound mutant rejected). No
  other line changes; the `.reset(` guard and every existing pin are untouched.
- **AC3 — held by construction.** Both changes are **test-only** — zero `src/` edits, so the ml1-1
  purity sweep and every citation gate are untouched. GREEN must keep it that way (no production code).

### Rule Coverage (typescript lang-review + project idioms)
- **Non-vacuous assertions / test quality:** every new test asserts a concrete value; both differentials
  exercise their predicate/regex in BOTH directions (accept real, reject mutant) — no `assert(true)`,
  no `is_some()`-style vacuity. The mutant is exercised against the SAME matcher the real guard uses.
- **Source-scan comment-stripping (raw-wiring-grep-satisfied-by-comment-prose):** the (a) provenance
  reader and the (b) mutant both run through comment-stripping, so a doc-comment mention of
  `waveColours`/`console.warn` cannot fool a scan.
- **Mutation direction is restrictive:** each new guard is proven to REDDEN on its named mutant, not
  merely to pass — the `.toBe(false)` on the mutant is the restrictive assertion.
- **Test-only (purity):** no `src/core` or `src/shell` change; the core-boundary scanner is not engaged.

### Mutation verification (the ACs' core demand) — baked in, not a one-off
Both differentials live in the committed suite and re-run every CI, which is stronger than a manual
mutate-revert: (a) `isImmediate('waveColours(1).insideMushroom') === false` while the real RHS passes;
(b) `ONREJECT_WIRING_RE` (once call-scoped) rejects the compound relocation mutant while accepting the
real main.ts, and the retained `FILE_SCOPED_RE` test documents that the OLD guard was fooled.

**Handoff to Loki (Dev):** one-line widen in `pointer-lock.test.ts` (the `ONREJECT_WIRING_RE` value,
given verbatim above), then the whole millipede project + orchestrator suites go green. Nothing to
build for (a). Do NOT touch line 433 or any `src/` file.

## Dev Assessment

**GREEN — minimal, one line, exactly as TEA specified.** `git commit 0a2adb8b`.

- **AC2 (b):** widened `ONREJECT_WIRING_RE` in `plugins/millipede/tests/pointer-lock.test.ts` from
  the file-scoped `/createPointerLock\([\s\S]*?console\.warn\(/` to the call-scoped
  `/createPointerLock\((?:(?!\n\))[\s\S])*?console\.warn\(/`. The failing differential
  (`... REJECTS the relocation mutant`) is now green; the real-source pin at line ~444 stays green.
  Diff is 2 lines (the constant + its trailing comment) — no other change.
- **AC1 (a):** nothing to implement — TEA's source-provenance guard was green-on-write. Left untouched.
- **AC3:** honored — **test-only, zero `src/` edits** (`git diff --stat HEAD -- plugins/millipede/src src/`
  is empty). The `.reset(` guard at line 433 was NOT touched, per TEA's out-of-scope warning.
- **No scope creep:** did not "improve" the reset guard, did not refactor adjacent pins, did not add
  a behavioural onReject test (TEA's regex-widen was the sanctioned minimal fix).

**Tests:** millipede **1445/1445** GREEN · orchestrator **505/505** · `tsc --noEmit` clean.
Working tree clean, branch pushed.

**Handoff:** to review (Heimdall). The whole deliverable is test-guard hardening — the Reviewer's
mutation battery is the natural next check; TEA's baked-in differentials already pin each mutant.

### Dev round-2 rework (all four reviewer findings addressed) — `git commit 16b4245a`
- **R1/R2 [playfield-colour.test.ts:271]:** the "mutation-verified" provenance test now runs the full
  `alnumRhs` extraction + `isImmediate` pipeline against a mutant **derived from the real source**
  (`readFileSync` → replace `0x1f`→`waveColours(1).insideMushroom` → `alnumRhs` → `isImmediate`), so it
  verifies the file-read guard end-to-end, not just the predicate. Both extractions are `.not.toBeNull()`
  guarded before the cast — closes the rule-#1 unguarded-cast finding at the old :274.
- **R3 [pointer-lock.test.ts:473]:** citation `main.ts:76` → `main.ts:75` (the closing-paren line).
- **R4 [playfield-colour.test.ts:254]:** removed the dead second clause of `isImmediate` — the anchored
  `^(0x…|\d+)$` already excludes any expression; comment updated to say so.
- **F5 (structural onReject residual):** NOT touched — out of scope by the Reviewer's own routing (SM to
  file as an ml11 follow-up). No `.reset(` guard or `src/` file touched.
- **Verified:** millipede 1445/1445, orchestrator 505/505, `tsc` clean, `git diff -- src` empty (test-only).

## Subagent Results

_(Round 2 — fresh pass on the rework commit `16b4245a`. Round-1 results, which produced the 4 findings now fixed, are summarised in the assessment below.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — millipede 1445/1445, orchestrator 505/0, tsc clean, test-only (R2) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A — independently broke `isImmediate` AND `alnumRhs`; the rewritten test reddened for each (end-to-end pipeline proven); all casts guarded |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — R3 citation `:75` correct, R4 no dead-clause residue, mutation-test comment matches code |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations across 30 rules; round-1 rule-#1 cast finding CLOSED (both casts null-guarded, hand-typed path deleted) |

**All received:** Yes (4 enabled returned clean, 5 disabled skipped)
**Total findings:** 0 new in round 2. Round 1's 4 fix-required findings (R1–R4) all FIXED and independently re-verified; 1 structural follow-up (F5) remains filed non-blocking.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — all four round-1 findings remediated; ACs met and mutation-verified)

**Round history:** Round 1 was REJECTED on four LOW findings in the guards' own implementation (R1–R4 below). Dev's round-2 rework (`git commit 16b4245a`) fixed all four; a **fresh 4-subagent pass on the rework returned all-clean**, and I re-ran my own mutation battery (breaking `isImmediate` reddens exactly the rewritten pipeline test). No new issues. Approving.

The ACs are demonstrably satisfied — I independently ran the mutation battery against the **real tracked source files** (not just the synthetic fixtures), and both guards redden on the exact mutants their ACs name:
- **AC1:** mutating `playfield-colour.ts:83` to `= waveColours(1).insideMushroom` reddens the real `readFileSync`-based provenance guard. Restored → green. Non-vacuous. The round-2 rewrite makes the "mutation-verified" test run the full `alnumRhs`+`isImmediate` pipeline on a real-source-derived mutant (breaking either reddens it — I and two specialists confirmed).
- **AC2:** applying the compound relocation mutant (delete onReject 4th arg + add an unrelated `console.warn`) to the real `main.ts` reddens the real onReject pin (`pointer-lock.test.ts:453`). Restored → green. Non-vacuous *for the mutant ml10-5's Reviewer named*.
- **AC3:** test-only — `git diff develop...HEAD -- plugins/millipede/src src` is empty; millipede 1445/1445, orchestrator 505/505 (verified myself, both rounds), `tsc` clean.

**Residual (non-blocking, filed):** F5 — the onReject regex has residual evasions beyond its named mutant (arg-position scoping + `\n)` format-coupling). The real fix is an AST/balanced-paren rewrite, larger than this 2-point tail; filed as an ml11 follow-up (see Delivery Findings). This is the expected next link in the ml10-5→ml10-6→ml11-3 recursion, not an AC2 failure.

### Round-1 Fix-Required — ALL FIXED in round 2 (`16b4245a`), re-verified clean
| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [TEST] LOW | The test titled "mutation-verified: the waveColours-wire mutant … is REJECTED" hardcodes the mutant STRING and calls `isImmediate()` directly — it never runs `alnumRhs()` on a mutated source, so it verifies the PREDICATE, not the file-read PIPELINE. In a hardening story, a test that overclaims "mutation-verified" is the exact anti-pattern the epic exists to kill. | `playfield-colour.test.ts:271` | Derive a mutated source string from the real module text (`readFileSync` then replace `0x1f`→`waveColours(1).insideMushroom`), run `alnumRhs()`+`isImmediate()` on it, assert rejected — bake in the pipeline-level mutation I ran by hand. |
| [RULE] LOW | Unguarded `as string` cast (lang-review rule #1): `alnumRhs(readFileSync(...)) as string` with no null check, unlike the sibling test at :267 which guards `.not.toBeNull()` first. A removed export would surface as a confusing `isImmediate(null)` mismatch, not a clear "not exported" failure. | `playfield-colour.test.ts:274` | Add the `expect(...).not.toBeNull()` guard (mirror :267), or share one null-checking helper. |
| [DOC] LOW | Off-by-one citation: comment says the `createPointerLock` call "closes with `)` at column 0, as at main.ts:76" — the closing `)` is at **main.ts:75** (line 76 is blank). Verified by direct read. Misleads a reader of a guard whose correctness depends on that exact paren. | `pointer-lock.test.ts:473` | `:76` → `:75`. |
| [TEST]/[SIMPLE] LOW | Dead code: `isImmediate`'s 2nd clause `!/waveColours|insideMushroom/` is unreachable — the anchored 1st clause `^(0x…|\d+)$` already excludes any non-literal (verified: `isImmediate('waveColours(1).insideMushroom')` is already false via the anchor alone). Misleads a reader into thinking the blocklist is load-bearing. | `playfield-colour.test.ts:254` | Remove it, or comment it as non-functional defense-in-depth. |

### Observations (5+ required)
- [VERIFIED] AC1 provenance guard is non-vacuous — real-source mutation of `playfield-colour.ts:83` reddens `playfield-colour.test.ts:264` (ran it, restored, green). Complies with the source-scan/comment-strip rule (strips comments before matching).
- [VERIFIED] AC2 onReject guard is non-vacuous for its named mutant — real-source compound relocation of `main.ts` reddens `pointer-lock.test.ts:453` (ran it, restored, green).
- [VERIFIED] test-only invariant — `git diff develop...HEAD -- plugins/millipede/src src` empty; src/core purity scanner not engaged (rule-checker #31 concurs).
- [TEST] The onReject guard has residual evasions OUTSIDE the AC's named mutant (see Delivery Findings F5) — a `console.warn` in a sibling arg, or a reformat that removes the `\n)` boundary, both defeat it (I reproduced all three by node). Real, but next-link follow-up, not an AC2 failure.
- [DOC]/[RULE] Confirmed off-by-one citation and unguarded cast (above).
- [SIMPLE] Dead predicate clause (above).
- [SEC] N/A — no auth/input/secret surface (test-only, no runtime path). Subagent disabled; self-assessed clean.
- [TYPE] The only type concern is the unguarded cast, tagged [RULE] above. type-design subagent disabled; self-assessed.
- [EDGE]/[SILENT] N/A — subagents disabled; test-only diff has no error-handling or boundary branches (self-assessed clean).

### Rule Compliance (lang-review + CLAUDE.md)
- **#1 type-safety escapes:** ONE violation — the `as string` cast at `playfield-colour.test.ts:274` (fix-required above). The sibling cast at :268 is compliant (guarded by :267).
- **#15 source-text guard matches TOKEN not CLAIM:** compliant — both guards anchor to a specific declaration/call, and both are mutation-verified against their named mutant.
- **#17 comments asserting a mechanism nobody re-ran:** ONE violation — the :473 citation (fix-required). All other new comments independently verified true (I re-ran the regexes/predicate against the real files).
- **#25 whole-file source-guard scope:** the `alnumRhs` scope is safe (unique declaration anchor, occurs once). `ONREJECT_WIRING_RE`'s `\n)` bound is a FORMATTING assumption, not structural → follow-up F5.
- **Comment-stripping (#32) / identity-not-regenerated (#33) / core-boundary (#31):** all compliant.
- **lexer-leak caveat:** `alnumRhs` strips comments but not string/template literals; acceptable today (identifier occurs once in the module) — noted for the AST follow-up.

### Devil's Advocate
Argue this is broken. The loudest case: **the AC2 guard is a paper tiger that only looks hardened.** Its call-scoping rests entirely on `main.ts`'s `createPointerLock(...)` closing paren living alone on its own line (`\n)`). That is an incidental prettier layout, enforced by nothing. The day someone bumps printWidth or hand-collapses the four-arg call onto fewer lines, the `\n)` boundary vanishes, the lazy match runs to end-of-file, and the guard silently reverts to the exact file-scoped behaviour ml10-6 was filed to kill — green the whole time. So the story could "close" ml10-6 today and quietly re-open it on the next unrelated formatting pass, with no test noticing. Worse, the guard never actually pins the *onReject* slot: a `console.warn` sitting in the 3rd-arg onExit callback satisfies it just as well as the real 4th-arg sink, so "a rejected request is routed to console.warn" is not truly guaranteed — only "some console.warn exists somewhere in this call." A confused maintainer who deletes the onReject sink but happens to log inside onExit ships dead diagnostic wiring under a green guard. On the AC1 side, a stressed reader trusts a test that announces "mutation-verified" and never re-checks it — yet that test only exercises a predicate over a string constant; the genuine file-reading guard is a *different* test two blocks up, and nothing labels which is which. And the `as string` cast means the failure mode when the export is renamed is not "ALPHANUMERIC_COLOUR must be exported" but an opaque `expected false to be true`. None of these are today-broken (I verified the real guards redden on the real mutants), but three of them are latent green-while-wrong traps — precisely the class this epic exists to eliminate. That is why the residual F5 gets filed and the cheap honesty fixes get a round rather than a wave-through.

**Handoff (round 1, historical):** Back to Dev (green rework) — all four fixes are mechanical edits to the two already-touched test files. **DONE in round 2.**

**Handoff (round 2, final):** APPROVED → SM for finish-story.

## Delivery Findings

### Reviewer (code review)
- **Improvement** (non-blocking): **F5 — the onReject guard has residual evasions beyond its named mutant.** `ONREJECT_WIRING_RE`'s `\n)` bound is formatting-dependent (a single-line or indented reformat of `main.ts`'s `createPointerLock` call silently reverts it to the pre-fix file-scoped false-pass), and it does not scope to the 4th (onReject) argument (a `console.warn` in the 3rd-arg onExit satisfies it). Reproduced all three by direct node execution. The real fix is a balanced-paren/AST-aware check, which is larger than this 2-point tail. Affects `plugins/millipede/tests/pointer-lock.test.ts` (rewrite the onReject guard to be argument-position and format independent; add a same-line-close regression pin). **Owner: the next millipede epic's Architect materialization sweep** — ml11 is now archived (ml11-3 completed it), so this follow-up lives here in the archived session's Delivery Findings, exactly as ml10-5's ml10-6 finding did until the ml11 sweep harvested it. This IS the filing mechanism the epic anticipates ("source findings, not a fresh spec doc"); the next `/pf-architect materialize` over the ml*-session.md files should pick it up as the next link in the ml10-5→ml10-6→ml11-3 recursion. *Found by Reviewer during code review.*

## Impact Summary

**ml11-3 — SHIPPED (test-only hardening), 2 review rounds, merged PR #494 → develop (merge commit `95d522d9`).**

- **What shipped:** two strengthened, mutation-verified test guards — (a) a source-provenance guard for `ALPHANUMERIC_COLOUR` that a value check could not provide (the $1F collision), and (b) a call-scoped onReject-wiring regex that kills the compound relocation mutant ml10-5's Reviewer named. No production source changed (AC3); millipede 1445/1445, orchestrator 505/505, full merged-tree suite 17043/17043, tsc clean.
- **Blocking items: 0.** Round 1 was REJECTED on four LOW guard-rigor findings (R1 pipeline-level mutation test, R2 null-guard a cast, R3 an off-by-one citation, R4 a dead predicate clause); all four were FIXED in commit `16b4245a` and independently re-verified clean by a fresh 4-subagent pass plus a re-run mutation battery. The round-1 rejection is history, not an open item.
- **Open (non-blocking):** F5 above — the onReject regex's structural residual (format-coupling + arg-position). Owner recorded; awaits the next millipede-epic sweep. Not a defect in what shipped: AC2's named mutant is caught, verified against real `main.ts`.
- **One recurring mechanical wart:** every `pf sprint story update` on this story round-tripped `sprint/epic-mc12.yaml` (a spurious `type: bug` key-reorder on mc12-1, actively worked in a sibling checkout); reverted each time so only ml11-3's stamp committed.
- **Improvement** (non-blocking): `isImmediate` false-rejects an otherwise-immediate RHS carrying a type suffix (e.g. `0x1f as const`); no `as const` in the file today, so low risk. Affects `plugins/millipede/tests/playfield-colour.test.ts` (strip a trailing type-assertion before the immediate check, if ever needed). *Found by Reviewer during code review.*

## Design Deviations

None yet.

### Reviewer (audit)
- No undocumented spec deviations. The one intentional divergence — TEA targeting the **onReject** guard (line 443) rather than the story-text's paraphrased "`.reset(` guard" (line 433) — is correct: it matches the primary source (ml10-5 session:62-66) that AC2 actually cites. ✓ ACCEPTED.