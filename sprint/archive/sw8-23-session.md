---
story_id: "sw8-23"
jira_key: "sw8-23"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-23: Harden the comment-citation guard: it cannot see its own directory, its opt-out fires on a MENTION, and its stated limits omit the two biggest ones (sw8-18 review findings 3, 4, 5, 7)

## Story Details
- **ID:** sw8-23
- **Jira Key:** sw8-23
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

> The branch field above is the documented escape hatch for a trunk-based story whose work lands
> on `main`. It is set proactively at setup because `pf sprint story finish` scrapes that labelled
> token by pattern from anywhere in the file and refuses when it cannot verify the value (jt8-3).
> `feat/sw8-23-harden-comment-citation-guard` exists as a CLAIM marker at zero commits ahead of
> `main`, so a sibling checkout's `git branch -r | grep sw8-23` probe sees this story is owned.
> Nothing merges it; delete it at finish once the count is 0.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T14:13:19Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T13:13:36Z | 2026-08-02T13:15:42Z | 2m 6s |
| red | 2026-08-02T13:15:42Z | 2026-08-02T13:33:49Z | 18m 7s |
| green | 2026-08-02T13:33:49Z | 2026-08-02T13:49:46Z | 15m 57s |
| review | 2026-08-02T13:49:46Z | 2026-08-02T14:01:16Z | 11m 30s |
| green | 2026-08-02T14:01:16Z | 2026-08-02T14:07:40Z | 6m 24s |
| review | 2026-08-02T14:07:40Z | 2026-08-02T14:13:19Z | 5m 39s |
| finish | 2026-08-02T14:13:19Z | - | - |

## Context

Story context: [`sprint/context/context-story-sw8-23.md`](../sprint/context/context-story-sw8-23.md)
— **hand-authored by SM, not generated. Do not regenerate it.**

The story arrived with `acceptance_criteria: null`. Seven were derived from the four filed
findings plus two user rulings, written into `sprint/epic-sw8.yaml` as the source of truth, and
mirrored into the context file byte-exact (verified by a `python3` `in` test against
`yaml.safe_load`, not by grep).

## Sm Assessment

### Board probes — clean, and both halves of the probe were read

- `git fetch --prune origin` then `git branch -r | grep -Ei "sw8-2[34]"` → **no match** (exit 1).
  No sibling owns this story. The fetch itself pruned two dead branches
  (`feat/uf1-9-…`, `fix/jt8-7-…`), so the remote was genuinely refreshed.
- `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → **one** live session, `a-3`'s
  `uf1-15`. Output read, not merely checked for exit status (the mg1-2 no-matches trap).
- `gh pr list -R slabgorb/arcade` → `[]`. Merge gate clean.
- Story `status: backlog`, `repos: arcade`, `workflow: tdd`, `type: chore`, 3pt, p2.

### The description survived measurement — all four findings verified, no corrections

Per the standing rule, every falsifiable claim was re-run before setup. This story's deliverable
*is* citation accuracy, so its own claims got the sw8-18 treatment. **All four findings are true
as filed**, including the two that quote numbers:

- 744 of 1000 line-span citations are range-checked only — **exact**, 74.4%.
- `fromFile` is declared, passed by `checkTree` and by **six** test call sites, and never read —
  **exact**, all six located.
- The pragma-on-a-mention behaviour **reproduced**: the review fixture reports 1 error; the same
  fixture preceded by a prose mention reports 0.
- `checkTree`'s roots exclude `tools/` (`check-comment-citations.mjs:344`), and the header's
  `design.md` citation was indeed corrected by sw8-18's chore.

Recording the null result deliberately (jt5-10 rule): the next reader should not re-run this
sweep. **No ROM claim was involved** — this story is entirely in-repo tooling, which is the
inverse of sw8-18's asymmetry and is why the whole measurement budget went to running the tool.

### Three findings the description does not carry

Measuring a *true* description still sharpened the story — the mg1-5 pattern. All three are in
the context under M1/M2/M3 with evidence; the load-bearing summary:

1. **Findings (1) and (2) interact, and the order matters.** `IGNORE_PRAGMA` is *defined* as a
   string literal at `:38`, so the guard's own source contains the pragma text and the unanchored
   `raw.includes` at `:252` matches it. Measured: `checkCitations(<guard's own source>) → 0`.
   Adding `tools/` to the roots therefore scans the guard and it **immediately opts itself out** —
   item (1)'s defect surviving item (1)'s own fix. AC3 is a prerequisite for AC1 meaning anything,
   and a test asserting "the guard checks its own file" passes **vacuously** without it.

2. **Item (3) presents one population as two.** The 744 and the single-token class are not
   disjoint — the second is a **subset**. `isFragment` nulls a single-token adjacent span, making
   it indistinguishable downstream from no span at all. Measured partition: 698 have nothing
   adjacent, **46** have an adjacent token that is silently dropped (`TGPROB`, `FIRE_MASK`,
   `SCRSHLD`, `CPHTSA`, `#0F000`). An UNCATCHABLE paragraph listing them as two limitations would
   over-claim the guard's blindness — the same over-claiming defect the guard exists to prevent.
   AC6 requires the subset relationship be stated.

3. **The errors that surface inside `tools/audit/` are EXAMPLES, not defects.** All three are
   correct as written: an elided `…design.md:47-48`, a deliberately-historical `:2273-2290` (the
   live `gameRules.ts:244` citation is the corrected `WSMAIN.MAC:2271-2290`), and the `.d.mts`
   line documenting bare-span inheritance. The audit tooling documents the citation format by
   exhibiting it, so **rewriting these into true citations destroys what they document**. The
   module already ships the mechanism — `RETIRED_MARK` at `:42`, for prose that quotes a citation
   in order to disown it. AC5 mandates the marker plus a test proving its removal reddens.

I ruled this one myself rather than asking: the story is emphatic that the guard must see its own
directory, so excluding `tools/audit/` to dodge the three would defeat the finding outright.

### The fresh count the story asked for — measured, and owed a re-measurement

The description says "Adding tools/ will surface a fresh count — measure it before promising
green." Measured against `c1fcb83`: baseline **35**, with `tools/` **45**, so **10 fresh**, all in
the bake tools and none in `tools/audit/`. Plus **1** from `.mts` and **2** from anchoring the
pragma. Every one is itemised in the context.

**One caveat I could not settle, handed over as a question rather than a guess** (jt5-10 rule):
two of the ten are bare `.test.mjs` "cited file does not exist" entries with no filename stem, and
the same shape appears **five times in the current baseline**. `FILE_RE` at `:85` accepts a leading
`.`, so this may be an extractor defect rather than a citation to re-anchor. I did not determine
which. TEA should classify it before treating those as remediation work — if it is an extractor
defect it is arguably out of scope and should be filed.

### User rulings obtained before setup, with the census attached

Both are the mg1-2 either/or shape — TEA writes a different RED per branch, so RED is
unspecifiable until they are settled. Both were put to the user with the measurement already done.

- **R1 — `fromFile`: DROP, do not wire.** Census: **zero** relative-path citations exist in the
  scanned tree, and the 8 real basename collisions are already covered by the path-qualified rule
  the guard's own header documents at `:200-208`. AC7.
- **R2 — the `.mts` gap is IN SCOPE.** `SCAN_EXT` omits `.mts`, so both `.d.mts` files are
  invisible even after `tools/` is added — and `fromFile` is *declared in one of them*. Same
  finding class as item (1). Folded in rather than filed as a follow-up about a one-token edit.

### Contention — a sibling is editing the tree this guard scans

`a-3` holds a live `uf1-15` session (`in_progress`, star-wars `tie-status.ts` / `sim.ts`).
`tie-status.ts` carries **46** spanned citations, third-highest in the plugin, and
`tests/core/tie-aim-axis.test.ts` already contributes **2** of the 35 baseline errors — that file
is uf1-15's own. So the baseline and the 1000/744 census **will move**. Both are claims with a
timestamp; AC2 requires re-measurement at RED and again before GREEN is called. Do not "fix" a
citation in `tie-status.ts` or `sim.ts` while uf1-15 is in flight.

I deliberately did **not** hand over a suite baseline number. Per the sw8-18 precedent, the count
changed twice in both directions during that setup; inheriting a stale one starts TEA reproducing
a red suite that no longer exists. Dev port 5270 was not probed — no AC here needs a served page.

### Estimate

3 points is **tight but not re-pointed**. The measured remediation (10–13 citations) plus seven
ACs is more than the filing implied, though the description did always imply remediation
("measure it before promising green"). Flagging rather than unilaterally re-pointing mid-sprint;
the call is the user's if TEA finds the RED larger than it looks.

### Setup path

`sm-setup` was not spawned — session instructions bar the Agent tool unless the user asks. Session,
context and the seven ACs were hand-authored. Stated as what happened on this run, not as project
policy. The verification that matters is unchanged and was run: the ACs are byte-exact in both the
epic YAML and the context (a `python3` `in` test against `yaml.safe_load`, 7/7, immune to the
`grep -Eci` alternation trap), and the labelled-token census was re-run **after** this assessment
was written, not only after the files were created.

## TEA Assessment

**Tests Required:** Yes
**Test Files:** `plugins/star-wars/tests/audit/sw8-23-guard-hardening.test.ts` (new, 43 tests)
**Tests Written:** 43 covering 7 ACs — **32 failing**, 11 passing
**Status:** RED (ready for Dev)

### Why 11 pass at RED, and why none is vacuous

Every green was audited individually; three were rewritten because they passed for the
wrong reason. The survivors are deliberate:

| Passing test | Why it is green now |
|---|---|
| the probe leaves no trace | cleanup oracle — reds if a planted file leaks |
| a LEADING comment still opts out | regression guard: the legitimate use must survive AC3 |
| the canary is a real error | fixture-liveness oracle for the whole AC3 group |
| both deliberate opt-outs still skip | regression guard on the two real users |
| the guard scans clean over its own implementation | **green for the WRONG reason** (finding M1) — said so in place; its non-vacuity comes entirely from the mutation test beside it |
| the examples are still EXAMPLES | anti-deletion guard: reds if the header is "corrected" |
| gameRules.ts carries the corrected span | proves the header's example is genuinely historical |
| UNCATCHABLE still carries sw8-18's text | anti-replacement: AC6 appends, never overwrites |
| swRoot IS read and varying it moves the result | the replacement for the dead `fromFile` variation |
| a REAL dotted filename is still extracted | anti-overcorrection pair for the glob fix |
| the DEFAULT scan stays under the ratchet | guards the AC1/AC2 seam once the default widens |

**Three rewritten during the audit** — worth recording because each was a real trap:
the two AC5 mutation tests asserted only a floor on the mutated count (`>= 1`), which
passes on a file that was never clean; they now assert the **delta** (clean before,
red after). And the AC2 ratchet called the *default* roots, so it measured the
**un-widened** tree and reported `35 <= 35` — a green that would have survived a story
that never widened anything. It now names the roots explicitly and reds at RED.

### Satisfiability — proven, not assumed

A throwaway implementation of all seven ACs was built, measured, and deleted.

- **Full project against it: 198/200 files, 2221/2232 tests. No sibling breakage.**
  The only reds were this suite's remaining items and sw8-18's ratchet (the forcing
  function doing its job).
- **Count arithmetic closes.** Widened scan today **45**. Under the throwaway **39**
  (glob fix −6, example-disowning −5, +1 from `.mts`, +1 from the guard no longer
  skipping itself). Remediating the eight real `tools/` citations lands it at **~30** —
  *below* sw8-18's delivered 35, so widening the scope costs the tree nothing.
- **Mutation battery: 8 mutants, 8 caught, zero survivors.** Deltas above the
  10-failure throwaway baseline: `FILE_RE` lookbehind +3, `onSkip` +3, unanchored
  pragma +2, mention-anywhere pragma +2, `.mts` +2, `tools/` root +2, `droppedQuote`
  +2, UNCATCHABLE subset sentence +1. No equivalent mutants to reason about.
- Source restored from a `cp` backup taken **before** the first mutation and verified
  by md5 against all three touched files — never `git checkout`, which cannot tell an
  experiment from work in progress.

### The throwaway's failures were the more valuable output

Four requirements the obvious implementation does not meet, all recorded in the suite
header so Dev does not rediscover them:

1. **The glob fix needs a lookbehind.** Re-anchoring `FILE_RE` with a leading character
   class moves the match one char right — ``**/*.test.mjs`` stops yielding `.test.mjs`
   and starts yielding `test.mjs`, still extracted, still dangling. `(?<![.*\w])` works
   and keeps `foo.test.ts`.
2. **"A leading comment" is not a tight enough pragma anchor** — the prose mention that
   must not silence *is* a leading comment. The pragma must OPEN the comment body once
   the leader is stripped. Verified against both legitimate users.
3. **`RETIRED:` does not reach an elided citation.** `CITE_RE` permits only
   `` RETIRED:\s*`? `` before the filename, and the header writes `…design.md:47-48`.
4. **Expect ~5 disown sites in `tools/audit/`, not 3.** SM measured 2 in the `.mjs` by
   masking the pragma literal; the real widened scan reports 4 there plus 1 in the
   `.d.mts`. The mutation assertions use `>=`, so they hold at either count.

### The question SM handed over — classified

SM could not settle whether the bare `.test.mjs` entries were stale citations or an
extractor defect, and named the check. **They are an extractor defect.** The sources are
`` `**/*.test.mjs` discovery `` (a glob) and a comment-wrapped sentence remnant — nothing
was ever cited, so nothing can be re-anchored. `FILE_RE` accepts a leading `.`. Six of
the 45 widened errors are this artifact: 2 in `tools/`, **4 already sitting in the
baseline**. Fixed here rather than filed, because AC2's count cannot close otherwise
and the change is one lookbehind; logged as a deviation below.

### Rule Coverage

`.pennyfarthing/gates/lang-review/` carries no TypeScript checklist for this project, so
the rubric used was this file's own TEA sidecar plus `plugins/star-wars/CLAUDE.md`.

| Rule / lesson | Test(s) | Status |
|---|---|---|
| a citation suite must never pin line numbers (sw8-18) | whole suite — resolution, live census, mutation only | failing |
| an opt-out needs a leak test, not just a silence test | `the hook reports ONLY files that actually declare the pragma` | failing |
| a ratchet must bite, not carry slack | `the widened scan does not RISE…` + the default-roots pair | failing |
| a guard must be mutation-proven | AC5's two delta tests + the 8-mutant battery | failing |
| core/shell boundary (`CLAUDE.md`) | N/A — pure text analysis, no DOM/sim/time | n/a |
| no vacuous assertions | 11-row pass audit above; 3 rewritten | done |

**Self-check:** 0 skips, 0 `todo`, 0 `only`, 0 `let _ =`. Three non-vacuous rewrites.

### Post-rebase re-measurement — the numbers moved, and that is the point

The RED push was rejected by a sibling landing `uf1-15`'s finish. Re-measured on the
**merged** tree rather than trusting the pre-rebase run:

- Suite unchanged: **32 failed / 11 passed**, same tests, same reasons.
- Counts moved: baseline **35 → 34**, widened **45 → 44**. `uf1-15` closed one stale
  citation on its way through `tie-status.ts`.

Nothing in the suite quotes either number, so nothing broke — which is the whole reason
the census is recomputed rather than frozen. The measured figures in the comments are
labelled as what was true at RED, not as invariants.

**The contention SM flagged has cleared:** `uf1-15` is now `status: done`, so
`tie-status.ts` and `sim.ts` are no longer being edited underneath this story. Dev should
still re-run the count immediately before calling GREEN — the reason has changed from "a
sibling is mid-flight" to "the tree moves", but the instruction is the same.

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 170/170 in `--project star-wars audit` (GREEN). Full repo **11328 vitest +
372 orchestrator**, `npm run lint` clean.
**Landed on:** trunk-based — `main`, commit `aeb013d`. No PR (see the branch field in
Story Details).

**Files Changed:**
- `tools/audit/check-comment-citations.mjs` — `hasPragma()`, `defaultRoots()`, exported
  `SCAN_EXT` (+`.mts`), `FILE_RE` anchoring, `droppedQuote`, `onSkip`, `UNCATCHABLE`,
  `fromFile` removed, header examples disowned
- `tools/audit/check-comment-citations.d.mts` — `fromFile` dropped, `droppedQuote` and
  the four new exports declared
- `tests/audit/comment-citations.test.ts` — six dead `fromFile` sites removed, the inert
  item-7 mutation replaced with one that varies the roots, ratchet 35 → 29
- `tests/audit/sw8-23-guard-hardening.test.ts` — probe rewritten race-free, one test
  added for a surviving mutant, ratchets → 29
- five `tools/{music,pokey,speech}-bake/` files — eight citations re-anchored or disowned

### The headline: the scanned surface GREW and the count FELL

35 → **29**, while adding `tools/` and `.mts` to the scan. Widening the scope cost the
tree nothing and left it six better off, because six of what the guard was reporting were
never citations at all.

| step | Δ | running |
|---|---|---|
| baseline (src, tests, specs) | | 35 |
| + `tools/` and `.mts` | +11 | 46 |
| − phantom "citations" (globs, wrapped-sentence remnants) | −6 | 40 |
| − the guard's own format examples, disowned | −3 | 37 |
| − eight real stale citations, re-anchored or disowned | −8 | **29** |

Four of the six phantoms were **already in the baseline**, so that fix pays the plugin
back beyond this story's scope.

### Every ROM anchor was verified against the source, not taken from the tool

The tool names where a verbatim moved to, which is what makes re-anchoring mechanical —
but it is the thing under test here, so each was opened first: `SNDPM.MAC:605` is
`CLR 3(X) ;AMPLITUDE GOES IN SECOND CHANNEL FOR 16 BIT`; `:553` is `STA VAC(U)`; `:564`
is `STA VSF(U)`; `SNDAUD.MAC:323` is `DF1C:` and `:347` is `.SZ`. The one the tool could
**not** locate (`SNDPM.MAC:737`) was read by hand and is `:738-739` — and that failure is
exactly the relocator gap TEA predicted, now filed with its reproduction.

### Mutation-proven at the delivered threshold

13 mutants, **13 caught, 0 survivors** — including two that anchor-missed on the first
pass and were re-run rather than counted as caught. One survived initially (removing
`hasPragma`'s head-line cap); it was **not** an equivalent mutant, so a test was added
rather than the survivor being explained away.

The tightened ratchet was proven to bite before being trusted: prepending one stale
citation to `src/core/starfield.ts` reddens **4** tests at 29, where at 35 it would have
reddened none. That is the difference between a ratchet and a decoration.

### Where the AC menu was wrong, and I followed TEA rather than the AC

AC3 offered "leading comment only, or first N lines, or an exact-line match". The first
two are both satisfied by the very sentence that must NOT silence a file, because that
sentence *is* a leading comment. Implemented the narrower rule TEA's throwaway
established — the pragma must OPEN the comment body — which is how both pre-existing
opt-out files already write it, so nothing legitimate was disturbed.

### Round 1 rework — all six findings fixed (`ac7eb34`)

**Tests:** 170/170 audit, **11328 vitest + 372 orchestrator**, lint clean, CLI exits 1
with three named skip lines. **13 mutants, 13 caught, 0 survivors.**

I re-verified the Reviewer's replacement numbers before writing them into the permanent
record rather than taking them on trust — a correction that is itself wrong is worse than
the original defect. From a worktree at `aeb013d~1`: old scope **34**, same tree with
`tools/` added **44**, delivered **29**. The Reviewer's decomposition held exactly.

| # | Finding | Fix |
|---|---|---|
| F1 HIGH | ratchet decomposition false (35+11−6−8=32≠29) and measured against a moved tree | replaced with the three reproducible endpoints and an explicit **"do not decompose this further"** — the scope change, extractor fix and remediation all move the same number and are not independently attributable after the fact |
| F2 MED | census used `raw.includes(IGNORE_PRAGMA)`, the predicate AC3 deletes | now `hasPragma(raw)` |
| F3 MED | header said the lookbehind alone fixed `FILE_RE`; the implementation says both halves are required | header corrected, and item 4's wrong `math3d.ts`/`input.ts` prediction with it |
| F4 LOW | `PRAGMA_HEAD_LINES` edges undisclosed | both documented — blanks consume the window, and a markdown blockquote inside it opts a spec out |
| F5 LOW | unnecessary `as string[]` | removed |

**F2 is proven load-bearing, not cosmetic.** The "opt-out: back to unanchored includes"
mutant reddened **4** tests before this fix and reddens **5** after — the census now
detects a regression it was previously blind to, which is exactly the divergence the
Reviewer predicted. Confirmed the two predicates genuinely differ on the case that
matters: a file reading `// The guard honours a <pragma> pragma.` returns `true` from
`raw.includes` and `false` from `hasPragma`, so the tool scans it while the old census
silently dropped it.

**Every claim in the F4 comment was re-run before it was written.** Five blank lines do
exhaust the window (cannot opt out); a markdown blockquote in the window does opt out; a
fenced code block does not, because the fence line carries no comment leader; an indented
example does not. Four for four — stated in the comment as measured, because the class of
defect this whole round was about is exactly the claim nobody re-ran.

**One residual I did NOT fix, deliberately:** the blockquote edge (F4) is disclosed rather
than closed. Requiring a code-comment leader would exclude markdown entirely, and
`docs/**/specs` is in scope and may legitimately need to opt out. Disclosure plus the
"indent or fence it" instruction is the smaller change; if a spec ever trips it the fix is
one character. Raised as a Delivery Finding rather than silently narrowed.

**Handoff:** To Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | not spawned — session constraint | N/A | domain hand-assessed (see below) |
| 2 | reviewer-edge-hunter | N/A | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | not spawned — session constraint | N/A | domain hand-assessed → **F2, F5 confirmed** |
| 5 | reviewer-comment-analyzer | N/A | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | N/A | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | not spawned — session constraint | N/A | domain hand-assessed → clean, 1 VERIFIED |
| 8 | reviewer-simplifier | N/A | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | No | not spawned — session constraint | N/A | domain hand-assessed against all 18 TS checks |

**All received:** Yes (accounting — 5 disabled via `workflow.reviewer_subagents`; the 4
enabled ones were **not spawned** because this session's instructions bar the Agent tool
unless the user asks for it. Their domains were assessed by hand with evidence rather
than claimed as covered. `comment_analyzer` being disabled is worth naming: it is the
specialist whose domain holds **four of this review's six findings**, and it was also
disabled during sw8-18, whose three rejections were all claim prose.)

**Total findings:** 6 confirmed, 0 dismissed, 0 deferred — 1 High, 2 Medium, 3 Low.

## Reviewer Assessment

**Verdict:** REJECTED

The mechanism is correct, mutation-proven and does not regress the guard — I verified
that independently and it is the hard part of this story. What fails is the same class
the story exists to eliminate: **claims about measurements, shipped without re-running
them.** sw8-18 was rejected three times for exactly this, and its follow-up reproduces
it in its own ratchet comment.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The ratchet's decomposition is arithmetically false AND every term is measured against a stale tree | `plugins/star-wars/tests/audit/comment-citations.test.ts:389-393` | Replace with the verified endpoints below |
| [MEDIUM] | The census helper reimplements the opt-out with the exact unanchored predicate AC3 removed | `plugins/star-wars/tests/audit/sw8-23-guard-hardening.test.ts:368` | Call `hasPragma(raw)` |
| [MEDIUM] | Two comments in the same commit contradict each other about what fixed `FILE_RE` | `…/sw8-23-guard-hardening.test.ts:39-43` vs `…/check-comment-citations.mjs:129-130` | Correct the RED-phase note |
| [LOW] | A markdown blockquote in the first 5 lines opts a spec out — AC3's hazard, narrowed but undisclosed | `…/check-comment-citations.mjs:78` (`PRAGMA_HEAD_LINES`) | Disclose, or require a code-comment leader |
| [LOW] | The head window counts LINES, not comment lines — 5 blank lines exhaust it | `…/check-comment-citations.mjs:78` | State it in the constant's comment |
| [LOW] | Unnecessary cast to strip `readonly`; `tsc` passes without it (verified) | `…/sw8-23-guard-hardening.test.ts:358` | Delete `as string[]` |

### Findings by domain

No specialist was spawned (see the Subagent Results note), so every tag below marks a
domain **I assessed by hand**, with the evidence cited in the section that follows. They
are not subagent attributions.

- [DOC] F1 — the ratchet's decomposition is false and does not close. HIGH.
  `plugins/star-wars/tests/audit/comment-citations.test.ts:389-393`
- [TEST] F2 — the census helper reimplements the opt-out with the predicate AC3 deleted,
  so it measures a different population from the tool. MEDIUM.
  `plugins/star-wars/tests/audit/sw8-23-guard-hardening.test.ts:368`
- [DOC] F3 — two comments in the same commit contradict each other about what fixed
  `FILE_RE`. MEDIUM. `…/sw8-23-guard-hardening.test.ts:39-43` vs
  `…/check-comment-citations.mjs:129-130`
- [EDGE] F4 — a markdown blockquote in the first five lines opts a spec out; and the head
  window counts lines, not comment lines, so five blank lines exhaust it. LOW.
  `…/check-comment-citations.mjs:78`
- [TYPE] F5 — `as string[]` strips `readonly` unnecessarily; `tsc --noEmit` passes without
  it (run and confirmed). LOW. `…/sw8-23-guard-hardening.test.ts:358`
- [RULE] Lang-review checks 1, 8, 13, 17 and 18 are violated by the above; the remaining
  13 pass. Full enumeration in the Rule Compliance table.
- [SEC] Clean, and improved: the new `FILE_RE` requires a match to begin with a word
  character, so a leading `../` can no longer be extracted at all — path traversal via a
  cited name is narrower than before. No untrusted input, no network, no secrets.
- [SILENT] Clean in the diff — no `catch`, no fallback and no swallowed error was added.
  The one pre-existing swallow-adjacent risk (unguarded `readFileSync`) is filed as a
  non-blocking Delivery Finding because the scope growth widened its blast radius.
- [SIMPLE] Clean — the only redundancy is `hasPragma` being evaluated twice on the
  `checkTree` path (once as the skip gate, once inside `checkCitations`). Harmless, and
  the inner call is load-bearing for direct callers of `checkCitations`. Not filed.

### [HIGH] F1 — the ratchet comment does not survive its own arithmetic

The committed comment reads: *"`tools/` and `.mts` joined the scan (+11 raw), six phantom
… (-6), and the eight real stale citations … (-8)"* against a stated 35 → 29.

- **It does not close.** 35 + 11 − 6 − 8 = **32**, not 29. Anyone who checks the sentence
  the ratchet invites them to check finds it false, and the number they are being asked
  to trust is in the same sentence.
- **Every term is measured against a tree that had already moved.** Re-measured from a
  worktree at `aeb013d~1` (the commit the change was made on): the pre-story default scan
  was **34**, not 35, and the pre-story scan with `tools/` added was **44**, not 45/46.
  35 and 45 were true during RED, before `uf1-15` landed — and TEA's own assessment in
  this very session says these counts are "claims with a timestamp" and told Dev to
  re-measure before calling GREEN. The count *was* re-measured; the **prose around it was
  not.**
- **The phantom count is wrong in the other direction too:** the measured error-set diff
  removes **5** phantoms from the baseline scope (four `.test.ts` plus `Sheet.ts`, which
  the leading-dot filter never described — it was killed by the lookbehind), plus 2 under
  `tools/`. Not six.

**Verified replacement** — two endpoints, both reproducible in one command each, and no
decomposition of changes that interact:

> TIGHTENED AGAIN, 34 → 29 by sw8-23, while the scanned surface GREW: `tools/` and
> `.mts` joined the scan. Measured at `aeb013d~1`: the old scope reported 34 and the same
> tree with `tools/` added reported 44. The delivered scan covers `tools/` and still
> reports 29 — five BELOW the pre-story baseline — because six reported "dangling
> citations" turned out to be globs and comment-wrapped sentence remnants rather than
> citations, and the eight real stale ones the widened scan found were re-anchored or
> disowned. Do not decompose this further; the changes interact and a step-by-step
> attribution was wrong the first time it was written.

### [MEDIUM] F2 — the census skips files by the rule this story deleted

`sw8-23-guard-hardening.test.ts:368` filters the census with
`if (raw.includes(IGNORE_PRAGMA)) continue` — the unanchored substring test that AC3
exists to remove, sitting inside the suite that removes it. So the AC6 percentage
assertion compares `UNCATCHABLE`'s claim against a **different population** from the one
`checkTree` actually scans.

It is green today only by coincidence: the three opt-out files both *declare* and
*mention* the pragma, so the two predicates agree. The first scanned file that mentions
it without declaring it — which is precisely the case AC3 was written for, and
`docs/**/specs` is in scope — is scanned by the guard and silently dropped by the census.
This is lang-review **#18** verbatim ("a test helper that REIMPLEMENTS a platform
algorithm is untested code"), with the aggravation that the reimplemented algorithm is
the one this story rewrote. `hasPragma` is exported; call it.

### [MEDIUM] F3 — two claims in one commit that cannot both be true

- `sw8-23-guard-hardening.test.ts:39-43` (RED note): *"`(?<![.*\w])` in front of the
  existing pattern **is what actually works**"*, explicitly rejecting the leading
  character class.
- `check-comment-citations.mjs:129-130` (the delivered fix): *"Both halves are required
  and **neither works alone**"* — and the shipped `FILE_RE` carries both.

Dev found during GREEN that the lookbehind alone leaves a space-preceded bare extension
(`// .test.ts for the rest`) and added the stem class. The RED note was never updated, so
the suite header now instructs the next reader to remove half of a two-part fix. Same
file, same commit, flatly contradictory — lang-review **#17**'s headline case.

Secondary, same block: item 4 (`:57-61`) predicts `math3d.ts:171-186` and
`src/shell/input.ts:45` will need disowning. They did not — the `FILE_RE` change made
them resolve correctly. The delivered disowning is 5 markers in the `.mjs` and 2 in the
`.d.mts`.

### Rule Compliance — all 18 TypeScript checks, enumerated

| # | Check | Verdict |
|---|---|---|
| 1 | Type-safety escapes | **VIOLATION (F5)** — `sw8-23-…test.ts:358` `as string[]`; unnecessary, `tsc --noEmit` passes without it (run and confirmed). No `as any`, no `as unknown as`, no `@ts-ignore`, no non-null assertions anywhere in the diff. |
| 2 | Generic/interface pitfalls | PASS — `SCAN_EXT: readonly string[]`, `onSkip?: (file: string) => void` (a specific signature, not `Function`). No `Record<string, any>`. |
| 3 | Enum anti-patterns | N/A — no enums added. |
| 4 | Null/undefined | PASS — `onSkip ?? (default)` at `:456` correctly uses `??` and the value is a function (never falsy-but-valid); `?.text` in `quoteFor` guarded by `typeof === 'string'`, not by truthiness. |
| 5 | Module/declarations | PASS — `.d.mts` declares all four new exports; `.mjs` extensions present on every relative import. |
| 6 | React/JSX | N/A. |
| 7 | Async/Promise | N/A — the module is fully synchronous. |
| 8 | Test quality | **VIOLATION (F2, F5)** — see above. |
| 9 | Build/config | PASS — no tsconfig change; `npm run lint` clean. |
| 10 | Type-level input validation | PASS with note — see the security trace. |
| 11 | Error handling | PASS — no `catch` added; `readFileSync` failures propagate rather than being swallowed. |
| 12 | Performance/bundle | PASS — dev-only tool, not bundled; `treeIndex` still memoises the walk. |
| 13 | Fix-introduced regressions | **VIOLATION (F3)** — the GREEN fix invalidated a RED-phase claim and the claim was left standing. |
| 14 | Derived EDGES in one branch | N/A — no state machine. |
| 15 | Source-text assertions matching a TOKEN | PASS with note — AC7's guards use `/\bfromFile\s*[?:]/` (anchored to the declaration form, correct). AC5's `toMatch(/2273-2290/)` and `/design\.md/` are bare-token matches, but their job is anti-DELETION, which a token match expresses correctly. Every guard in the diff is mutation-tested — 13/13. |
| 16 | Accessible names | N/A. |
| 17 | Comments asserting an un-re-run mechanism | **VIOLATION (F1, F3, F4)** — three instances. |
| 18 | Defect in the test apparatus | **VIOLATION (F2)**. |

### What I verified, with evidence

- **[VERIFIED] The `FILE_RE` tightening did not blind the guard.** This was my chief
  suspicion — a guard that stops REPORTING is the worst outcome here. Diffed the full
  error set between `aeb013d~1` and `HEAD`: exactly 5 errors disappeared (four
  `.test.ts` phantoms plus `Sheet.ts`, a comment-wrapped `contactSheet.ts`), and the one
  real error that changed shape — `WSXPLD.MAC:355-357` — is **still reported**, under
  `Projects/…` instead of `/Projects/…`. Zero real errors lost. Separately compared the
  extracted-name sets: 43 names changed and **0 names were seen fewer times**, i.e. every
  loss is a renaming that collapsed into a name already present.
- **[VERIFIED] The rename is an improvement, not just neutral** — `check-comment-citations.mjs:200-208`
  documents that `src/shell/input.ts` must resolve by path or a basename lookup finds the
  wrong shorter `input.ts`. Pre-story, `../../src/shell/input.ts` failed the path branch
  (it resolves outside the plugin) and fell through to exactly that wrong basename;
  post-story it extracts as `src/shell/input.ts` and hits the correct file first.
- **[VERIFIED] The ratchet bites at 29.** Prepended one stale citation to
  `src/core/starfield.ts`: 4 tests red (`expected 30 to be less than or equal to 29`),
  restored, 170 green. At the old 35 the same mutation reddened nothing.
- **[VERIFIED] 13 mutants, 13 caught, 0 survivors** — re-run against the delivered code,
  including two that anchor-missed on the first pass and were re-run rather than counted.
- **[VERIFIED] No blast radius from the `fromFile` signature change.** `grep` across
  `plugins/ scripts/ tests/ .github/ package.json justfile`: the module has exactly two
  importers, both updated. It is wired to no npm script, justfile recipe or workflow — it
  runs only through the vitest suite.
- **[VERIFIED] AC4 is honoured by the CLI, not just the hook.** `node …/check-comment-citations.mjs`
  exits **1** and writes three named skip lines to stderr. Checked the exit code
  separately from the pipe, because `| tail` had masked it as 0 on the first attempt.
- **[VERIFIED] Security — path traversal is narrowed by this change.** `resolve()` joins
  comment-derived text onto a root, so a comment could previously name
  `../../../…​.md`. The new `FILE_RE` requires a match to BEGIN with `[A-Za-z0-9_-]`, so a
  leading `../` can no longer be extracted at all — confirmed by the name diff, where every
  `../`-prefixed entry lost its prefix. An embedded `..` is still expressible, but this is
  a local dev tool reading its own repo's comments and reporting line counts; no
  untrusted input, no network, no secrets. Nothing to fix.
- **[VERIFIED] Data flow traced end-to-end:** source text → `readFileSync` (`checkTree:462`)
  → `hasPragma` gate → `checkCitations` → `unwrap` → `delimitedSpans` → `CITE_RE.matchAll`
  → `quoteFor` → `resolve` → `readFileSync(target)` → `norm`/`tokensOf` → `holds` →
  error string → `relative(swRoot, f)` prefix → CLI `console.error` + `process.exit(1)`.
  The only new gate in that chain is `hasPragma`, and it fails CLOSED (an unrecognised
  header scans the file) — the correct direction for a completeness tool.
- **[VERIFIED] `droppedQuote` does not change quote selection.** `quoteFor` still prefers a
  fragment `after` over a non-fragment `before`; `dropped` is populated only when neither
  is usable, so the `quote` field's behaviour is bit-identical to pre-story. That is what
  makes the AC6 census additive rather than a silent re-interpretation of the old numbers.

### Devil's Advocate

Argue this is broken. The strongest case is that **the story widened a guard's scope and
then tuned the guard until the number came out below the line** — and that is exactly
what the diff looks like from a distance: scope grows by 10, extractor gets more
permissive about what it ignores, count lands at 29, ratchet moves to 29. Every step has
a rationale, and rationales are cheap. If the `FILE_RE` change had eaten one real
citation along with the phantoms, the story would still be green, the ratchet would still
be "tightened", and the guard would be quietly weaker while advertising the opposite.
That is why I did not accept the phantom classification on argument and diffed the error
sets instead; it holds, and it is the single most important fact in this review. But note
how close it ran: the leading-dot description in the session covers four of the five
removed baseline errors — `Sheet.ts` was removed by a mechanism nobody wrote down, and it
was found only because I compared sets rather than reading the explanation.

Second angle: a confused user. `hasPragma` is now the sole authority on whether a file is
checked at all, and its rule ("must open a leading comment, within 5 lines") is written
nowhere a user will look — not in `CLAUDE.md`, not in a README, only in the function's own
docstring inside the tool. The two existing opt-out files happen to comply. The third
person to add one will write `// this file opts out — citation-guard: ignore-file`, get no
error, no warning, and no skip line, and will conclude the file is clean when it was never
skipped. The `onSkip` notice makes a *successful* skip visible; nothing makes a *failed*
one visible. That is a real usability trap created by this change, and it is the mirror
of the defect the change fixes.

Third: a stressed filesystem. `checkTree` reads every scanned file and `resolve` reads
every cited target with no `try`. A permission error or a dangling symlink under `tools/`
— a directory that now contains generated output and symlinks in some checkouts — throws
out of the whole scan rather than reporting one bad file. Pre-existing, but the blast
radius grew with the scope. Not filed as blocking; noted below.

Fourth: config with unexpected fields. `CheckOptions` lost `fromFile`, and TypeScript's
excess-property checking only fires on object literals — a caller passing a variable with
`fromFile` still compiles and is silently ignored. Both call sites were updated, so this
is theoretical here.

None of these overturns the mechanism. They sharpen why the prose findings are not
cosmetic: this tool's product IS its statements about what it checked.

**Handoff:** Back to Dev for fixes.

---

## Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | not spawned — session constraint | N/A | hand-assessed: 170/170 audit, 11328 vitest, 372 orchestrator, lint clean |
| 2 | reviewer-edge-hunter | N/A | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | not spawned — session constraint | N/A | hand-assessed: round-1 fixes re-mutated, 13/13 caught |
| 5 | reviewer-comment-analyzer | N/A | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | N/A | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | not spawned — session constraint | N/A | hand-assessed: no new surface in the round-1 diff |
| 8 | reviewer-simplifier | N/A | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | No | not spawned — session constraint | N/A | hand-assessed → **R2 confirmed** (check 13) |

**All received:** Yes (accounting — same constraint as round 1; domains hand-assessed with
evidence rather than claimed as covered.)

**Total findings:** 2 confirmed, 0 dismissed, 0 deferred — 0 Critical, 0 High, 1 Medium, 1 Low.

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

All six round-1 findings are fixed and each was verified by re-running its **exact** claim,
not a paraphrase of it — that distinction is what three of the four rounds on mg1-5 died on.
Two new findings, both small, neither blocking; corrections specified below with verified
replacement text and routed to SM as a chore rather than a third round.

### Round-1 fixes — verified individually

- **F1 → fixed and independently re-measured.** All three endpoints in the new comment
  reproduce exactly: worktree at `aeb013d~1` gives **34** (old scope) and **44** (same tree,
  `tools/` added); this tree gives **29**. "FIVE FEWER problems" is right (34 − 29). "The
  eight real stale ones" is right — measured, not inferred: of the 10 `tools/` errors that
  vanished, exactly 2 are phantoms, leaving 8. The refusal to decompose further is the
  correct call and is now stated in the comment.
- **F2 → fixed, and proven load-bearing.** The census calls `hasPragma`. I re-ran the exact
  mutant Dev cites: reverting the opt-out to `raw.includes(IGNORE_PRAGMA)` now reddens **5**
  tests where it reddened **4** before the fix. Confirmed the predicates genuinely diverge
  on the case that matters — a file reading `// The guard honours a <pragma> pragma.` is
  `true` under `includes` and `false` under `hasPragma`.
- **F3 → fixed.** The suite header and `check-comment-citations.mjs:149-152` now say the
  same thing (both halves of the `FILE_RE` fix are required). No contradiction remains.
- **F4 → fixed, and all four claims re-run.** Blank lines exhaust the window; a markdown
  blockquote inside it opts out; a fenced code block does not; an indented example does not.
  Four for four.
- **F5 → fixed.** No `as string[]` remains; `tsc --noEmit` clean.
- **Ratchet still bites after the rework:** prepending one stale citation reddens three
  assertions (`expected 30 to be less than or equal to 29`); restored, 170/170.
- **Full accounting closes:** 44 pre-story-widened − 16 vanished + 1 appeared = **29**. The
  single "appeared" is the `WSXPLD.MAC:355-357` error re-reported under its renamed path —
  still caught, which was round 1's central concern.

### New findings

[DOC] **R1 (Low) — the corrected comment carried forward the number it was correcting.**
`plugins/star-wars/tests/audit/comment-citations.test.ts:397` says *"six reported 'dangling
citations' were globs and comment-wrapped sentence remnants"*. Measured: **seven**. The
seventh is `Sheet.ts` in `tests/shell/font-migration.test.ts` — a comment-wrapped
**identifier** (`contactSheet.ts` split across lines), killed by the lookbehind rather than
by the stem class, so it fits neither category the sentence names.

This is the mg1-5 pattern exactly, and I contributed to it: my round-1 finding text
explicitly identified `Sheet.ts` as *"a wrapped identifier the leading-dot filter never
described"*, and then the replacement text I supplied still said six. The number was
carried over instead of re-derived. **Verified replacement:**

> …Two things account for the drop: **seven** reported "dangling citations" were globs,
> comment-wrapped sentence remnants **or a comment-wrapped identifier** — none of them a
> citation anybody wrote — and the eight real stale ones the widened scan surfaced were
> re-anchored or disowned.

[RULE] **R2 (Medium, lang-review #13 fix-introduced regression) — a load-bearing INVISIBLE
character.** `check-comment-citations.mjs:87` contains a **U+200B ZERO WIDTH SPACE** inside
`` `docs/**​/specs` ``, added by the round-1 F4 fix so that `*/` does not terminate the JSDoc
block. Two problems:

1. **Removing it breaks the parse.** Verified: strip U+200B and the module throws
   `Unexpected identifier 'extname'` — an error pointing 100+ lines from the cause. Deleting
   an invisible character is exactly what a whitespace cleanup or an editor's
   trim-on-save does.
2. **The same file already solves this differently, 33 lines up.** `:54` writes
   `` `docs/**\/specs` `` — a visible backslash escape. Two workarounds for one problem in one
   file is the "one concept, two helpers" smell from check #18, and the next reader will
   copy the wrong one.

**Verified replacement:** use the escape form already in the file — change `:87` to
`` `docs/**\/specs` ``. I confirmed `:54`'s form parses (the module loads today with it).

### Rule Compliance (round 2 — deltas only)

Re-scanned the round-1 diff against all 18 checks, per check #13's meta-requirement.
Checks 1, 8, 17 and 18 — the four violated in round 1 — now **pass**: the cast is gone,
the census uses the real predicate, the contradicting comments agree, and the apparatus no
longer reimplements what it tests. Check **13 now fails** on R2 above: the fix for F4
introduced a new defect of a different class. Checks 2–7, 9–12, 14–16 unchanged (N/A or
pass, as enumerated in round 1).

### Devil's Advocate (round 2)

The case against approving: I am approving a diff I wrote, reviewed, rejected, fixed and am
now reviewing again, and the two findings I just raised are both *mine* — one from my own
round-1 replacement text, one from my own round-1 fix. A reviewer who keeps finding new
defects in his own corrections is describing a process that has not converged, and the
honest reading of "round 1 fixed six claim defects and introduced two more" is that the
next round would find one or two as well. That is a real argument for rejecting.

Against it: the two remaining findings are of visibly smaller order than round 1's. Round 1
had a false arithmetic in the record and a test apparatus measuring the wrong population —
defects about what the code *does*. These are a word ("six" for "seven") and a character
that should be a backslash. Neither changes behaviour, neither is unfalsifiable, both have
replacement text I have run. The mechanism itself has now been checked three independent
ways — error-set diff pre/post, 13-mutant battery, and a live ratchet mutation — and has not
moved in any of them.

The genuine risk I am accepting is the ZWSP: it is inert until someone edits that comment,
and then it fails loudly with a misleading message. I am trading that against a full round
whose only content would be one word and one character. If the chore does not land, R2 must
be re-raised rather than quietly dropped — it is the one finding here that can bite a
stranger.

**Data flow traced:** unchanged from round 1; the round-1 diff touched only comments, one
test predicate and one cast.
**Pattern observed:** `check-comment-citations.mjs:149-152` now records the three-case
reasoning for `FILE_RE` as a table — the right shape for a rule that took two attempts.
**Error handling:** unchanged; no `catch` added, no new failure path.

**Handoff:** To SM for finish-story, carrying the two chore corrections above.

## Delivery Findings

### TEA (test design)

- **Conflict** (non-blocking): AC2's phrase "the tree-wide gate exits 0 at the end" is
  unsatisfiable as literally written — the CLI exits 0 only at **zero** errors, and the
  plugin carries ~30 out-of-scope legacy stale citations that sw8-18 deliberately
  declined to sweep. Interpreted as **"sw8-18's ratchet test passes with `tools/` in
  scope"**, which is achievable (~30 ≤ 35, proven) and matches the shipped design.
  Affects `sprint/epic-sw8.yaml` (AC2 wording) and
  `plugins/star-wars/tests/audit/comment-citations.test.ts` (the ratchet to re-tighten).
  *Found by TEA during test design.*
- **Gap** (non-blocking): the re-location search cannot relocate a single-line citation
  of a multi-instruction run. `holds()` widens a single-line citation by `runLen` (the
  `/`-joined instruction count) but the relocate loop caps its window at
  `c.end - c.start + 1` = 1, so `gen-music-data.mjs`'s `SNDPM.MAC:737` reports "nowhere
  in the file" although `LDA -1(X)` is one line away at `:738`. Affects
  `plugins/star-wars/tools/audit/check-comment-citations.mjs` (the relocate loop's width
  seed). Not blocking — Dev hand-corrects that one citation — but it is the single place
  in this story where the tool's own suggestion cannot be trusted, and it makes the
  guard's most useful output silently unavailable for a whole citation shape.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `tools/speech-bake/speech-data.mjs` names
  `gen-speech-data.mjs` as its generator; that file does not exist and the real generator
  is `bake-speech.mjs`. A genuine stale citation in a file no AC names — the guard found
  it, which is the proof it bites on arrival. Affects
  `plugins/star-wars/tools/speech-bake/speech-data.mjs`. *Found by TEA during test design.*
- **Question** (non-blocking): `a-3` is running `uf1-15` against `tie-status.ts` /
  `sim.ts`, both inside the scan tree. The census the AC6 tests recompute and the ratchet
  count will both move when it lands. The suite recomputes rather than quoting, so it
  should absorb the change — but Dev should re-run the count immediately before calling
  GREEN rather than trusting this session's numbers. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the immediate-adjacency association rule can bind a quote to
  the WRONG citation in a columnar table. When a comment lists `<cite>` / `"<quote>"`
  pairs on alternating lines, `unwrap` joins them and the previous entry's trailing quote
  falls inside the next citation's adjacency window — reporting a correct citation as
  stale and naming the previous entry's line as "where it moved to", which is the most
  misleading output this tool can produce. Reproduced in
  `plugins/star-wars/tools/music-bake/music-data.test.mjs` (worked around by reordering
  the line, not by changing the citation). A fix would bound the "before" search to the
  same logical entry — e.g. refuse a quote that already has a citation between it and
  this one. Affects `plugins/star-wars/tools/audit/check-comment-citations.mjs`
  (`quoteFor`). *Found by Dev during implementation.*
- **Gap** (non-blocking): confirms TEA's relocator finding with the exact case. A
  single-line citation of a `/`-joined instruction run cannot be relocated: `holds()`
  widens the initial check by `runLen`, but the relocation loop seeds its window from
  `c.end - c.start + 1` = 1, so it searches only 1-line windows for a 2-line quote and
  reports "nowhere in the file". `gen-music-data.mjs`'s `SNDPM.MAC:737` was corrected by
  hand to `:738-739` after reading the ROM (`LDA -1(X)` at :738, `BNE 30$` at :739).
  Seeding the relocation width with the same `runLen` expansion would close it. Affects
  `plugins/star-wars/tools/audit/check-comment-citations.mjs` (the relocate loop).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): writing this story's own code produced three fresh
  phantom citations inside the guard's header — new prose about the citation format that
  the guard then extracted as citations. Each was caught only by re-running the tool
  after editing. It is the AC5 problem in its live form: the file that teaches the format
  cannot discuss the format without emitting it. Worth considering a block-level "this
  section is documentation" marker rather than per-citation `RETIRED:`, since every
  future edit to this header will hit the same wall. Affects
  `plugins/star-wars/tools/audit/check-comment-citations.mjs` (header). *Found by Dev
  during implementation.*
- **Gap** (non-blocking, review round 1): a markdown spec that exhibits the opt-out pragma
  un-indented and un-fenced within its first five lines opts itself out — the AC3 hazard
  surviving in a much narrower form, because `>` is an accepted comment leader. Disclosed
  on `PRAGMA_HEAD_LINES` with the workaround rather than closed, since requiring a
  code-comment leader would stop markdown opting out at all. Affects
  `plugins/star-wars/tools/audit/check-comment-citations.mjs`. Pairs with the Reviewer's
  finding that a FAILED opt-out is invisible: both are cases where the file's scan status
  differs from what its author intended and nothing says so. *Found by Dev during
  implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): the opt-out rule is now the sole authority on whether a file is
  scanned at all, and it is documented only inside the function's own docstring. A
  contributor who writes the pragma later in a line (`// this file opts out —
  citation-guard: ignore-file`) gets no error, no warning and no skip notice, and will
  reasonably conclude the file was skipped when it was scanned. `onSkip` makes a
  successful skip visible; nothing makes a FAILED opt-out visible. Consider warning when
  a file contains the pragma text but `hasPragma` returns false — that is the whole
  ambiguous set, it is cheap, and it is the mirror of the defect this story fixed.
  Affects `plugins/star-wars/tools/audit/check-comment-citations.mjs`. *Found by Reviewer
  during code review.*
- **Gap** (non-blocking): `checkTree` reads every scanned file and `resolve` reads every
  cited target with no error handling, so one unreadable file or dangling symlink aborts
  the entire scan instead of reporting that file. Pre-existing, but the blast radius grew
  with the scope — `tools/` holds generated output and symlinks in some checkouts.
  Affects `plugins/star-wars/tools/audit/check-comment-citations.mjs` (`checkTree`,
  `resolve`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `comment_analyzer` is disabled in
  `workflow.reviewer_subagents`, and it is the specialist whose domain held **four of
  this review's six findings**. The same specialist was disabled through sw8-18, whose
  three rejections were *all* claim prose. Two consecutive stories in this epic have had
  their only real defects in the one unmonitored domain. Affects
  `.pennyfarthing/settings` (the toggle). *Found by Reviewer during code review.*

### Design Deviations

### TEA (test design)

- **Scope addition — the extractor's leading-dot defect.** Not one of the seven ACs. SM
  raised it as an open question and asked TEA to classify before treating those entries
  as remediation work; the classification is that they are not citations at all, so AC2
  cannot close without either this fix or six dishonest `RETIRED:` markers. One
  lookbehind, +3 mutation-caught tests, and it clears 4 pre-existing baseline errors as
  a side effect. Ruled in rather than filed.
- **Mechanism choice for AC4.** The AC says the skip is reported "on stdout/stderr". The
  suite pins `checkTree({ onSkip })` as an injectable hook **and** a default that writes
  to `console.error`, so the behaviour is testable without capturing process output and
  the CLI stays honest. Dev may not satisfy AC4 with the hook alone — the no-hook test
  requires the default to speak.
- **New exports required.** `SCAN_EXT`, `defaultRoots()`, `hasPragma()` and a
  `Citation.droppedQuote` field. The first two are scope claims a test could not
  otherwise read (the `UNCATCHABLE` precedent); `droppedQuote` is load-bearing for AC6,
  because today the single-token case and "no adjacent quote" are indistinguishable
  downstream — which is precisely why the story stated them as two populations.
- **No test asserts the exact fresh count.** AC2 names 10/+1/+2. Those are timestamps,
  not invariants, and a sibling is editing the tree. The suite pins the per-file
  cleanliness and the ratchet instead; the measured numbers live in comments as the
  record of what was true at RED.

### Dev (implementation)

- **Rewrote TEA's two scope-probe tests: they were flaky by construction**
  - Spec source: `tests/audit/sw8-23-guard-hardening.test.ts`, AC1 group (RED)
  - Spec text: plant a probe file into `<swRoot>/tools` and assert `checkTree({swRoot,
    romDir})` reports it, proving the DEFAULT walk reaches the directory
  - Implementation: plant into a `mkdtempSync` directory passed via `roots`, plus a new
    third test asserting `checkTree()` with `roots` omitted returns exactly what
    `checkTree({roots: defaultRoots(swRoot)})` returns
  - Rationale: vitest runs test FILES in parallel and they share one filesystem. The
    probe sat in the live tree while sw8-18's tree-wide ratchet was scanning it, so the
    two suites passed apart and failed together — and the failure surfaced on the OTHER
    suite, where nothing explains it. The replacement proves the same three things (the
    walk descends, `.mts` is read, the default list is the one actually used) with no
    shared-state race.
  - Severity: minor
  - Forward impact: none — no test may write into the scanned tree; anything that needs
    to should take the `roots` option, which exists for exactly this.

- **Added one test TEA did not write, for a mutant that survived**
  - Spec source: TEA's own rubric — "a guard must be mutation-tested"
  - Spec text: 8 mutants, all caught, no survivors (RED-phase battery)
  - Implementation: re-ran the battery against the delivered code with 13 mutants;
    removing `hasPragma`'s head-line cap survived. Added *"the pragma DEEP inside a long
    opening comment block does not opt out"*, after which all 13 are caught.
  - Rationale: not an equivalent mutant. The loop only stops early at the first
    NON-comment line, so any file opening with a long prose block — every design spec in
    `docs/**/specs`, and this guard's own 90-line header — would grant opt-out authority
    anywhere inside that block. That is the AC3 hazard in a second costume.
  - Severity: minor
  - Forward impact: none — `PRAGMA_HEAD_LINES` is now load-bearing and pinned.

- **Reformatted one correct comment to disambiguate its citation**
  - Spec source: AC2 ("every one is either re-anchored or dispositioned")
  - Spec text: implies each reported citation is stale and needs correcting
  - Implementation: `music-data.test.mjs`'s `WSMAIN.MAC:1673` is CORRECT (`JSR PMREB` is
    at :1673). The report was a false positive: the citation/quote table lists entries in
    a column, and after `unwrap` the PREVIOUS entry's trailing quote
    (`";BATTLE MUSIC IN FOURTHS"`, which belongs to :1636) sits within the adjacency
    window of the NEXT citation. Led the line with the routine name so a non-punctuation
    token separates them; the citation itself is untouched.
  - Rationale: correcting a correct citation to silence a guard would have written a
    false record into the tree this story exists to make truthful.
  - Severity: minor
  - Forward impact: the association rule can bind a trailing quote to the following
    citation in a columnar table — filed as a Delivery Finding.

- **Two citations qualified rather than re-anchored**
  - Spec source: AC2
  - Spec text: "re-anchored or dispositioned under AC5"
  - Implementation: `dedicated-sfx.test.mjs`'s bare `:323-347` inherited `sfx-data.mjs`
    (the nearest preceding filename, two words earlier) when it means `SNDAUD.MAC` —
    verified: `DF1C:` is at `SNDAUD.MAC:323` and `.SZ` at `:347`, exactly the volume
    chain the sentence describes. Qualified it explicitly. `speech-data.mjs` named
    `gen-speech-data.mjs` as its generator; no such file has ever existed here and the
    real generator is `bake-speech.mjs` — corrected.
  - Rationale: the first is a bare-span inheritance failure, not a stale span; the second
    is a genuine stale citation in a file no AC named, found by the guard itself.
  - Severity: minor
  - Forward impact: none.

- **Disclosed the markdown-blockquote opt-out edge rather than closing it (review round 1)**
  - Spec source: Reviewer round-1 finding F4; AC3
  - Spec text: "Anchor it — leading comment only, or first N lines, or an exact-line match"
  - Implementation: `>` remains an accepted comment leader, so a markdown blockquote
    inside the five-line head window still opts a file out. Documented on
    `PRAGMA_HEAD_LINES` with the workaround (indent or fence the example) instead.
  - Rationale: requiring a code-comment leader would exclude markdown from opting out
    entirely, and `docs/**/specs` is in scope and may legitimately need it. The residual
    requires a spec to exhibit the pragma, un-indented and un-fenced, at the very top of
    its first five lines. Disclosure is the smaller change and the fix is one character
    if it ever bites.
  - Severity: minor
  - Forward impact: a spec documenting this guard must indent or fence the pragma near
    its top — stated in the constant's own comment, and filed as a Delivery Finding.
### Reviewer (audit)

Every logged deviation was read against the diff and stamped.

**TEA (test design) — 4 entries:**
- *Scope addition, the extractor's leading-dot defect* → ✓ **ACCEPTED**. Verified it was
  necessary, not convenient: without it AC2 could only close by marking six non-citations
  `RETIRED:`, which writes a false record into the tree. One caveat for the record — the
  deviation describes the fix as a leading-dot filter, and the delivered fix also kills
  `Sheet.ts`, a wrapped-identifier remnant with no leading dot. The scope is slightly
  wider than the deviation states; folded into F1's replacement text.
- *Mechanism choice for AC4 (`onSkip` + a speaking default)* → ✓ **ACCEPTED**. Confirmed
  the default really speaks: the CLI writes three named skip lines to stderr and exits 1.
  The insistence that the hook alone is insufficient is correct and is pinned by a test.
- *New exports required* → ✓ **ACCEPTED**. `droppedQuote` is genuinely load-bearing —
  without it the two populations are indistinguishable downstream, so AC6's subset claim
  would be unfalsifiable. `SCAN_EXT`/`defaultRoots` follow the existing `UNCATCHABLE`
  precedent of exporting a claim so a test can read it.
- *No test asserts the exact fresh count* → ✓ **ACCEPTED**, and this review is the
  evidence for it: the counts moved twice during the story. The deviation says "the
  measured numbers live in comments as the record of what was true at RED" — that is the
  right policy, and F1 is exactly the case where it was not followed.

**Dev (implementation) — 4 entries:**
- *Rewrote TEA's two scope-probe tests (filesystem race)* → ✓ **ACCEPTED**. Reproduced the
  reasoning: the probe sat in a tree a sibling suite measures, so the flake landed on the
  innocent suite. The replacement keeps all three claims and adds the
  `checkTree({}) === checkTree({roots: defaultRoots()})` equivalence that closes the gap
  the temp-dir move opened.
- *Added one test for a surviving mutant* → ✓ **ACCEPTED**. The judgement that it is not
  an equivalent mutant is correct and I re-derived it: the scan loop only stops early at
  the first NON-comment line, so a long opening prose block would carry opt-out authority
  throughout. See F3/F4 — the same constant has two further undisclosed edges.
- *Reformatted one correct comment to disambiguate its citation* → ✓ **ACCEPTED**, and it
  is the best judgement call in the story. The guard reported a CORRECT citation;
  "fixing" it would have written a false record into the tree this story exists to make
  truthful. Reordering the line and filing the association bug is right.
- *Two citations qualified rather than re-anchored* → ✓ **ACCEPTED**. Spot-checked both
  against the source: `SNDAUD.MAC:323` is `DF1C:` and `:347` is `.SZ`, exactly the volume
  chain the sentence describes; and `tools/speech-bake/` contains `bake-speech.mjs` with
  no `gen-speech-data.mjs`, so the correction is right.

**UNDOCUMENTED — spec deviations neither TEA nor Dev logged:**
- **The ratchet's stated decomposition was never re-measured after the tree moved.** TEA's
  own assessment instructs Dev to re-measure the count before GREEN; the count was
  re-measured and the prose around it was not. Severity: **High** — F1.
- **A RED-phase design note was invalidated by the GREEN fix and left standing.** The
  `FILE_RE` remedy changed from "lookbehind alone" to "lookbehind AND stem class"; the
  suite header still asserts the first and explicitly rejects the second. Severity:
  **Medium** — F3.
### Reviewer (audit, round 2)

One new deviation was logged during round-1 rework. Stamped:

- *Disclosed the markdown-blockquote opt-out edge rather than closing it* → ✓ **ACCEPTED**.
  I raised the edge as F4 and asked for disclosure or closure; disclosure is the right
  half. Verified the reasoning holds: requiring a code-comment leader would stop markdown
  opting out at all, and `docs/**/specs` is in scope. Verified the stated workaround
  actually works — an indented pragma and a fenced one both return `false` from
  `hasPragma`, so "indent or fence it" is executable advice rather than a guess. The
  residual requires a spec to exhibit the pragma un-indented and un-fenced in its first
  five lines, which is narrow and now documented where the next person will look.

All eight earlier deviations remain ✓ ACCEPTED as stamped in round 1; none was
invalidated by the rework. No deviation is FLAGGED.

**Undocumented deviations found in round 2:** none. Both new findings (R1, R2) are defects
in the rework rather than unlogged departures from spec.
---

## Impact Summary

**Story:** sw8-23 — harden the comment-citation guard (sw8-18 review findings 3, 4, 5, 7).
**Outcome:** delivered on `main`, 2 review rounds (round 1 REJECTED / 6 findings, round 2
APPROVED / 2 findings, both corrected as chores before finish). 7 ACs, all met.

**Compiled by hand.** The `sm-finish` preflight subagent was not spawned — this session's
instructions bar the Agent tool unless the user asks. Every claim below was re-run at
finish rather than scraped from the phase assessments, which is the documented failure
mode of the automatic compiler (it has previously resurrected a closed round-1 finding as
BLOCKING). **Blocking items: 0.**

### What shipped

The guard now reads MORE of the plugin and reports FEWER problems: **34 → 29** while
`tools/` and `.mts` joined the scanned surface. Verified at finish from a worktree at
`aeb013d~1`: old scope 34, same tree with `tools/` added 44, delivered 29. Full accounting
closes — 44 − 16 vanished + 1 re-reported under a renamed path = 29.

| AC | Delivered |
|---|---|
| AC1 | `defaultRoots()` includes `tools`; `SCAN_EXT` includes `.mts`; both exported so the scope is assertable |
| AC2 | 7 phantoms retired (globs, wrapped sentence remnants, one wrapped identifier — none was ever a citation) and 8 real stale citations re-anchored or disowned; both ratchets tightened to 29 and mutation-proven |
| AC3 | `hasPragma()` — the pragma must OPEN a leading comment; a mention, a backticked example, a buried line and a deep-in-the-header line all no longer silence a file |
| AC4 | every skipped file announced by name; default writes to stderr, `onSkip` overrides. CLI verified: exits 1, three named skips |
| AC5 | the header's format examples DISOWNED with `RETIRED:`, not rewritten — proven load-bearing by a delta mutation (clean before, ≥2 errors after stripping the markers) |
| AC6 | `UNCATCHABLE` states the 73.4% range-only share and that the single-token class is a SUBSET of it; `droppedQuote` makes the partition observable, and a test re-derives the percentage from the live tree so the claim cannot drift |
| AC7 | `fromFile` removed from the interface, the caller and six test sites; the inert mutation that varied it now varies the roots and is proven to redden |

### Corrections made at finish (Reviewer round-2 chores, both re-verified before applying)

- **"six phantoms" → "seven."** The round-1 correction carried forward the number it was
  correcting. Re-derived **in situ** (not by subtraction, and not by the isolation probe
  that produced the six): 7 phantoms, 9 real. The seventh is `Sheet.ts`, a comment-wrapped
  identifier caught by the lookbehind rather than the stem class — invisible to a probe
  that re-creates the context, because the context *is* the defect.
- **A load-bearing U+200B ZERO WIDTH SPACE removed.** `check-comment-citations.mjs:87`
  used an invisible character so `*/` would not close the JSDoc block. Verified failure
  mode: removing it breaks the parse with an error pointing 100 lines away. Replaced with
  the visible backslash escape the same file already used 33 lines above; both sites now
  read identically and a byte scan confirms no invisible characters remain in any file the
  story touched.

### Prose fixed in place rather than filed, and why

Four claim defects were corrected during the story rather than parked (round 1: a false
ratchet decomposition, a census reimplementing the predicate the story deleted, two
comments contradicting each other, an unnecessary cast). None is asserted by any test —
which is exactly why they survive — and filing them would have parked known-false sentences
in the tree for a sprint. Recorded here so the archive shows a corrected claim as corrected,
not as one that was always right.

### Findings routed — every one has an owner, checked by MECHANISM not theme

| Finding | Disposition |
|---|---|
| Relocator cannot relocate a single-line citation of a multi-instruction run | **td1-14 EXTENDED** 3→5pt. Same relocation loop as its existing refuse-to-guess clause; six lines split across two stories invites one to drift |
| Association rule binds a quote to the wrong citation in a columnar table | **sw8-25 FILED** (3pt, bug). Upstream of td1-14 — the wrong quote is chosen before any search runs. Carries the exact repro and WHY-THIS-IS-NOT paragraphs for both sw8-26 and td1-14 |
| Failed opt-out invisible; markdown blockquote edge; unguarded `readFileSync` aborts the scan | **sw8-26 FILED** (3pt, bug). One mechanism — the scan is silent about its own coverage |
| The tree-wide sweep | **sw8-24 RE-SCOPED.** Its "~35" and its worked examples were stale; re-measured to 29 over a wider surface with the class breakdown, and the title rewritten so the board stops advertising the old number |
| `speech-data.mjs` named a generator that never existed | **FIXED in this story** (`bake-speech.mjs`) — a genuine stale citation in a file no AC named, found by the guard itself |
| AC2's "the tree-wide gate exits 0" wording | Interpreted as "the ratchet test passes with `tools/` in scope" and recorded. AC text left as filed — rewriting it now would disguise a decision as the story having always said so |
| `comment_analyzer` disabled while holding 4 of 6 round-1 findings | **NOT filed** — a configuration choice, not work. Raised to the user directly with the evidence |

### Verification, all re-run at finish

- star-wars audit suite **170/170**; `npm run lint` clean; CLI exits 1 with three named skips.
- **13 mutants, 13 caught, 0 survivors** against the delivered implementation.
- **Ratchet bites at 29:** one added stale citation reddens the assertions; at 35 it reddened none.
- **No blindness:** the error-set diff shows 7 phantoms retired, 8 real citations fixed, and the
  one renamed error still reported. Zero real errors lost — the central risk of this story.

### Suite attribution at finish — the red is a sibling's, in writing

Full monorepo run at finish: **11339 passed, 10 failed, 1 todo (742 files, 1 failed).**

**None of the 10 is this story's.** Every failure is in a single file —
`plugins/joust/tests/audio-decision-block-families.test.ts` — which is a sibling checkout's
**in-flight jt5-23 RED phase**, committed to `main` by design on a trunk-based repo
(`94635e1 test(jt5-23): RED`). star-wars failures: **zero**. This story's own surface is
170/170 with `npm run lint` clean.

Stated explicitly because an unattributed red at finish makes the archive imply the story
shipped broken, and because the automatic preflight compiler has previously reported a
sibling's failures as the finishing story's blocker.
