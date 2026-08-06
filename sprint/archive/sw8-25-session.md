---
story_id: "sw8-25"
jira_key: "sw8-25"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-25: The guard's association rule binds a quote to the WRONG citation in a columnar table

## Story Details
- **ID:** sw8-25
- **Jira Key:** sw8-25
- **Epic:** sw8 — Cabinet feel: the flight and combat loop — render/experiential fidelity vs the cabinet longplay
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Priority:** p3
- **Stack Parent:** none
- **Branch:** fix/sw8-25-guard-columnar-citation-mispair
- **PR:** https://github.com/slabgorb/arcade/pull/27

## Technical Background

The citation guard (`check-comment-citations.mjs`) re-opens citations embedded in source comments and validates that the quoted text appears at the cited line. The defect is in the association rule that binds a delimited quote span to a citation.

**Guard source files (plugins/star-wars/tools/audit/):**
- `check-comment-citations.mjs` — main guard implementation
  - `extractCitations(raw)` — line 171, extracts citations from wrapped text
  - `quoteFor(index, len)` — line 207, finds quote adjacent to citation
  - `checkCitations(raw, opts)` — line 330, validates all citations in a block
  - `unwrap(s)` — line 107, rejoins comment continuation lines into one string
  - `gapOk(t)` — line 192, tests if text between quote and citation is acceptable gap
  - `delimitedSpans(text)` — line 125, finds backtick/quote-delimited spans

**The defect:** `quoteFor()` searches for a quote that appears IMMEDIATELY adjacent to a citation (within 4 characters of punctuation, accepting only whitespace/punctuation in the gap via `gapOk`). When citations and quotes are laid out in a columnar table (very common in this codebase), the closing quote of one entry sits 1-2 characters from the NEXT entry's citation after `unwrap` rejoins lines. The rule then mis-pairs the quote to the wrong citation.

**Exact reproduction:** commit ac7eb34~1, file `plugins/star-wars/tools/music-bake/music-data.test.mjs`:
```
//   WSMAIN.MAC:1636  PHIGD (ground INIT, PH.TIM just zeroed):
//                      JSR PM4TH   ";BATTLE MUSIC IN FOURTHS"
//   WSMAIN.MAC:1673  PHEGD (the PER-FRAME ground handler), guarded by
```
Running the guard reports: `WSMAIN.MAC:1673: quoted verbatim is not in the cited span — it is now at WSMAIN.MAC:1636`

The citation `:1673` is CORRECT (JSR PMREB really is at that line). The quote `";BATTLE MUSIC IN FOURTHS"` belongs to `:1636`. The guard manufactures a false defect with a plausible wrong line number, which a reader following the hint would "fix" by corrupting a correct citation. This is worse than missing a defect — it actively manufactures corruption.

**Workaround (sw8-23):** leading the line with a routine name separates entries with a non-punctuation token, breaking the mis-pairing. The citation was not touched because changing it would record a false repair in the tree.

**Scope note — OPEN QUESTION FOR STORY OWNER TO RULE:**
- **This story (columnar-table mis-pairing):** bare spans near a DIFFERENT filename are bound to the wrong file and reported LOUD AND WRONG
- **sw8-26's domain (guard gaps):** bare spans near NO filename evade the gate ENTIRELY (silent)

Both were measured in this repo within one development cycle. The story owner should determine whether the second case belongs here (as a variant of the same mis-pairing bug) or in sw8-26 (as a coverage gap).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T20:49:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T19:26:02Z | 2026-08-06T19:28:02Z | 2m |
| red | 2026-08-06T19:28:02Z | 2026-08-06T19:44:07Z | 16m 5s |
| green | 2026-08-06T19:44:07Z | 2026-08-06T20:16:18Z | 32m 11s |
| review | 2026-08-06T20:16:18Z | 2026-08-06T20:49:11Z | 32m 53s |
| finish | 2026-08-06T20:49:11Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Improvement][non-blocking]** The fix direction ("bound the `before` search so it cannot cross another citation") is not the geometry that actually reproduces here. Measured: in the columnar shape the stolen quote sits BETWEEN the two citations and is grabbed by the *following* citation's `before` search — no citation lies between the quote and its thief, so a literal "cross another citation" guard would not fire. The true invariant the RED pins is anti-theft: a delimited span that is the trailing/continuation quote of an EARLIER citation must not be re-bound to a LATER one. Dev should treat the story's fix hint as directional, not literal, and satisfy the behavior (`checkCitations` clean on the correct citation), not the phrasing.
- **[TEA][Question][non-blocking]** The RED deliberately does NOT assert where the orphaned quote goes (to `:2` via an after-search, or unowned). The story allows either. If Dev makes it reachable as `:2`'s after-quote, that's strictly better (the earlier citation regains its own check) but is not required to pass.
- **[Dev][Gap][non-blocking]** The story's premise that the fix belongs in `quoteFor`/`extractCitations` (choose the RIGHT quote before any search) is **not achievable**, and I have a concrete counter-example that proves it: `src/shell/render.ts:284-288` carries a LEGITIMATE before-quote that wraps across a comment row-break — `"FACE BACKWARDS"` ends one comment line and its citation `WSMAIN.MAC:1331` opens the next. That is byte-for-byte the same shape as a stolen columnar quote (quote at end of line N, citation at start of line N+1). No positional rule in `quoteFor` can separate "legit wrapped before-quote" from "stolen trailing quote" — I built a row-break-rejection version and it turned render.ts's correct `:1331` into a false stale error (and pushed the tree-wide count 0→2). The ONLY discriminator is resolution: does the quote appear at THIS line, or at a sibling's? So the fix HAD to move to `checkCitations` (which resolves), not `quoteFor` (which cannot). Measured, not argued.
- **[Dev][Gap][non-blocking]** Census before implementing: **all 247** legitimate before-quotes in the scanned tree have some preceding citation. So any "reject a before-quote that follows another citation" rule (a literal reading of the story's fix hint) silently disables all 247 real checks while passing the RED (whose controls have no preceding citation). This is why the naive rule was rejected.

### Reviewer (code review)
- **Improvement** (non-blocking): The suppression suppresses ANY quote (before- OR after-attached) that resolves into an earlier same-file citation's span — not only the columnar before-quote case. Measured (EDGE1): a genuinely-stale *after*-quote citation whose quote happens to coincide with an earlier same-file citation's line is silently suppressed. Affects `plugins/star-wars/tools/audit/check-comment-citations.mjs` (the suppression predicate). This is a narrow, deliberate trade consistent with the guard's prefer-silent-over-loud-wrong philosophy (a false-positive is worse than a missed one), so it is accepted, not required to change. Noted so a future story that wants to distinguish before/after attribution knows the seam. *Found by Reviewer during code review.*
- **Gap** (non-blocking, REMEDIATED in-review): The original "suppression is TARGETED" regression control was vacuous — its fixture quote `ABSENTXYZ NOWHERE` resolved to no line, so `at` stayed `null` and the `at !== null &&` short-circuit made the whole `cites.some(...)` predicate irrelevant; three predicate mutations (drop-ordering, drop-span, same-file-only) all stayed green. Independently reproduced by the rule-checker AND by my own mutation harness. Replaced with two controls that resolve `at` to a real line — one pinning span-containment, one pinning the earlier-only ordering — verified at the suite level to redden under the same-file-only mutant and restore to green. Affects `plugins/star-wars/tests/audit/sw8-25-columnar-citation-mispair.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] Revised three RED assertions that were coupled to a wrong mechanism.** The RED (written this session in the TEA phase) asserted `extractCitations(...).quote !== 'LDA PHTIM'` (i.e. the fix must re-attribute the quote inside `quoteFor`) and asserted a columnar row's OWN wrong quote is still caught. The render.ts counter-example (Delivery Finding above) proves `quoteFor` cannot disambiguate, so the correct fix leaves the internal attribution alone and suppresses the false REPORT in `checkCitations`. I rewrote those assertions to pin the story's actual, mechanism-agnostic requirement — "the correct citation is never reported stale" — plus a stronger sibling-disambiguation probe (the same `:4`+quote with the `:2` row removed IS reported, proving the fix keys on the resolving sibling, not on the columnar shape). **Verified RED integrity after the rewrite:** the three revised behavioral assertions fail against the original guard and pass against the fix; the three regression controls pass in both states. No assertion was weakened to vacuity — the suite is strictly behavioral now.
  → ✓ ACCEPTED by Reviewer: the render.ts counter-example is real (verified: `src/shell/render.ts:284-288` carries a wrapped before-quote structurally identical to a stolen columnar quote), so relocating the fix from `quoteFor` to `checkCitations` and de-coupling the tests from the abandoned mechanism is correct. RED integrity re-verified by me independently (stash-original → 3 behavioral assertions red, 3 controls green).

### Reviewer (audit)
- **One regression control was vacuous when handed to review** (not a spec deviation, a test-strength gap): remediated in-review with two mutation-killing controls (see Delivery Findings → Reviewer). Severity: Low (the feature itself was already mutation-covered — deleting the whole suppression block reddens 3 tests). No undocumented spec deviations found: the change is scoped to the columnar mis-pairing the story owns; the two open scoping items (bare-span-near-different-filename; the silent sw8-26 case) were correctly left out of scope.

---

## Test Strategy (Outline for TEA)

The RED must include a columnar fixture like the exact reproduction above. Two test shapes:

1. **Columnar citation/quote pairs:** the closing quote of entry N sits within 1-4 characters of the opening of entry N+1's citation after unwrap. Assert that both citations stay CLEAN (no errors reported).

2. **Guard-visible cross-citation boundaries:** any citation that sits between a candidate quote and the citation being processed must be treated as a boundary that the quote cannot cross. If a quote is nearer to the next citation than to the current one, it is not ours.

The fix is upstream of td1-14 (the relocation search defect) — the wrong quote is chosen before any search happens. Do not aim this at fixing relocation; aim it at choosing the RIGHT quote in the first place.

**Interaction with sw8-24:** The sweep of 29 stale citations will re-anchor only guard-visible ones. Bare spans that evade the gate entirely will remain silently stale by construction. That's a separate issue (possibly sw8-26's domain) and this story should not try to fix it.

---

## Context File
- **Location:** `sprint/context/context-story-sw8-25.md`
- **Generated:** automatically via `pf context create story sw8-25`

## Sm Assessment

Setup verified on disk: branch `fix/sw8-25-guard-columnar-citation-mispair` cut from develop, session + context files present, guard source located at `plugins/star-wars/tools/audit/check-comment-citations.mjs` with real line references (`quoteFor` :207, `extractCitations` :171, `gapOk` :192, `unwrap` :107). Merge gate clear (no open PRs).

This is a genuine TDD bug-fix, not a chore. The hard requirement for TEA's RED, straight from the story: the failing test MUST use the columnar fixture and MUST assert the CORRECT citation stays CLEAN — not merely that "some error changes." A test that only checks the error text differs would pass against a wrong fix. Line references above should be re-verified by TEA before citing them.

Scoping call left to this story's owner (not for TEA/Dev to silently absorb): whether "bare span near a DIFFERENT filename" belongs here and whether "bare span near NO filename" is sw8-26's. Default scope for this story is the columnar-table mis-pairing (loud-and-wrong); the silent-evasion case should be deferred to sw8-26 unless the owner rules otherwise.

Handoff: TEA (red phase).

## Tea Assessment

RED written and verified: `plugins/star-wars/tests/audit/sw8-25-columnar-citation-mispair.test.ts` — 7 tests, **4 fail (the defect), 3 pass (honest-fix regression controls)**.

**Design choices, and why:**
- **Hermetic fixture, not real WSMAIN line numbers.** The story's exact repro cites `WSMAIN.MAC:1636`/`:1673`, but pinning real ROM lines in a citation-suite is itself the defect class the guard exists to catch (sw8-23 header states this outright). The RED plants a temp `WSTEST.MAC` (line 2 = `LDA PHTIM`, line 4 = `JSR PMREB`) and asserts by RESOLUTION against it — immune to ROM drift.
- **Observable + mechanism, both.** Two `checkCitations(...) === []` assertions pin the story's hard requirement ("the CORRECT citation stays CLEAN, not merely that some error changes"). Two `extractCitations` assertions pin the anti-theft mechanism (`:4.quote !== 'LDA PHTIM'`).
- **Three regression controls stay green** so the cheapest wrong fix (disable `before`-resolution / blanket-suppress columnar checking) cannot pass: an ordinary stale before-quote is still caught, an ordinary correct before-quote stays clean, and a columnar row whose OWN quote is genuinely wrong is still reported.

**Verification:** full `tests/audit` suite = 205 pass / 4 fail (all 4 are the intended RED). The sw8-24 tree-wide zero-count ratchet stayed GREEN — the new file's `citation-guard: ignore-file` pragma protects it. `npm run lint` (tsc --noEmit, repo-wide) clean.

Two Delivery Findings logged above (the fix-hint geometry is directional not literal; the orphaned quote's destination is intentionally unconstrained).

Handoff: Dev (green phase) — make the 4 red assertions pass in `check-comment-citations.mjs` (`quoteFor`/`extractCitations`) without reddening the 3 controls or the tree-wide ratchet.

## Dev Assessment

GREEN. The fix is a single targeted guard in `checkCitations` (not `quoteFor`), because the defect is fundamentally un-disambiguable at the attribution layer (see Delivery Findings: `render.ts` has a legit cross-row before-quote structurally identical to a stolen one; only resolution tells them apart).

**The fix** (`plugins/star-wars/tools/audit/check-comment-citations.mjs`, +14/−2): after a citation fails to verify and the relocation loop finds where its quote actually sits (`at`), suppress the "stale" report iff that line falls inside an EARLIER citation's cited span **in the same file** — i.e. the quote was the previous columnar row's, mis-bound by `quoteFor`'s `before` search. A genuinely stale quote relocates to a line no sibling claims (or nowhere) and is still reported. Conservative by construction: it only ever suppresses a report, never invents one, and requires same-file + earlier-index + in-span, so it cannot mask an unrelated stale citation.

**Why not `quoteFor`:** measured. A row-break-rejection version broke `render.ts:1331` (a correct wrapped before-quote) and drove the tree count 0→2; a "reject before-quote after any citation" version would silently kill all 247 real before-quotes. Both recorded above.

**Verification (all green):**
- `sw8-25-columnar-citation-mispair.test.ts` — 6/6. RED-integrity re-checked: 3 behavioral defect-assertions fail against the stashed original guard, 3 controls pass in both states.
- full `star-wars` project — **2357/2357** (210 files); `tests/audit` clean, including sw8-24's tree-wide zero-count ratchet and the sw8-23/sw8-18 suites.
- `npm run lint` (tsc --noEmit, repo-wide) — clean.
- `npm run test:orchestrator` — 408/408.

Two RED assertions were revised (see Design Deviations) because they were coupled to the disproven `quoteFor` mechanism; the revision is behavioral and RED-integrity-verified, not a weakening.

Handoff: Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3191 tests green, lint clean) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered below (mutation) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered below |
| 9 | reviewer-rule-checker | Yes | findings | 1 (vacuous regression control) | confirmed 1 (remediated in-review), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled hand-covered)
**Total findings:** 1 confirmed (`[RULE][TEST]`, remediated in-review), 0 dismissed, 1 low observation (`[EDGE]`, accepted)

### Hand-coverage of disabled specialists
- `[EDGE]` **edge-hunter** — I enumerated the suppression predicate's paths against a planted ROM fixture: cross-file (suppression correctly does NOT fire — `o.file === c.file`), range-citation sibling owner (`at` within `[o.start,o.end]` — correctly suppressed), later-sibling (correctly NOT suppressed — `o.index < c.index`), and the after-quote-coincidence case (EDGE1, over-suppression — logged as a Low observation). `at === null` path short-circuits. Determinism confirmed across 5 repeated runs (no `treeIndex`-cache leakage; all fixtures cite `.MAC` which bypasses that cache).
- `[SILENT]` **silent-failure-hunter** — the change is itself a deliberate `continue` (a suppression). It is guarded (`at !== null` + same-file + earlier-index + in-span) and only ever removes a report, never swallows an exception. No empty catch, no `.catch(()=>{})`, no swallowed I/O. The `readFileSync` calls are pre-existing and unchanged.
- `[TEST]` **test-analyzer** — covered by mutation (below and via rule-checker). All assertions are meaningful (`toEqual([])`, `toHaveLength(1)`, `toMatch(/…/)`); no `toBeTruthy`, no `.only/.skip`, no vacuous `not.toThrow`. `afterAll` cleans the temp dir. The one vacuous control was found and replaced.
- `[DOC]` **comment-analyzer** — the new source comment (`.mjs:412-421`) accurately describes the predicate (verified term-by-term against `:424`); the test header's render.ts rationale is factually correct (verified against `src/shell/render.ts:284-288`). No stale/misleading comments introduced.
- `[TYPE]` **type-design** — plain `.mjs`/`.ts`; predicate uses reference identity (`o !== c`) and strict equality throughout; returns boolean; no stringly-typed API or unsafe cast added. The test's `opts` is explicitly typed.
- `[SIMPLE]` **simplifier** — the predicate is dense but every term is load-bearing (mutation-proven: dropping ordering or span-containment each leaves a real defect). The `const cites` hoist is necessary (the loop body now references sibling citations). No dead code.

### Rule Compliance
- **javascript.md #1 (silent error swallowing):** compliant — the new `continue` is a guarded suppression, not an error swallow. `:424`.
- **javascript.md #4 (equality/coercion):** compliant — `o !== c`, `o.file === c.file`, numeric `<`/`>=`/`<=`; no `==`; the `o.start !== null` guard avoids `null`-coercion in the range compare. `:424`.
- **javascript.md #6/#7 (Node/regex):** compliant — no new `RegExp`, `child_process`, `require(var)`, or unencoded reads introduced.
- **javascript.md #8 (test quality):** VIOLATION found (vacuous control) → REMEDIATED; now compliant, suite-level mutation-verified.
- **typescript.md (no `as any`/`ts-ignore`, explicit types, `.mjs` ext on relative import):** compliant.
- **CLAUDE.md core/ purity:** N/A — files are in `tools/` and `tests/`, not `src/core/`; confirmed no `Date.now`/`Math.random`/DOM/`performance.now` introduced.
- **citation-guard conventions (no hardcoded real ROM line; hermetic fixtures):** compliant — the test plants a temp `WSTEST.MAC` and asserts by resolution; carries `citation-guard: ignore-file` at line 1 (verified within `hasPragma`'s head window).

### Observations
- `[VERIFIED]` The suppression is conservative — it can only DELETE a manufactured report, never invent one. Evidence: `check-comment-citations.mjs:424` guards a `continue` before the sole `errs.push` in the block; the true-positive paths (`holds()` match, file-missing, span-out-of-range) are upstream and untouched.
- `[VERIFIED][RULE]` The predicate's two non-obvious terms are both load-bearing. Evidence: suite-level mutation to `o.file === c.file` only (dropping `o.index < c.index` and the `at >= o.start && at <= o.end` span check) reddens both new controls; restore → 7/7 green.
- `[VERIFIED][PRE]` Regression surface intact. Evidence: full `star-wars` project 2358/2358, `tests/audit` 209/209 incl. the sw8-24 tree-wide zero-count ratchet and sw8-23/sw8-18 suites; `tsc --noEmit` clean; orchestrator 408/408.
- `[VERIFIED][SEC]` No new attack surface (dev-only tool). Evidence: security specialist clean; the new branch adds no regex, dynamic property access, path resolution, or I/O; test temp-dir cleanup is scoped to the `mkdtempSync` return value.
- `[LOW][EDGE]` Over-suppression of a stale after-quote coinciding with an earlier same-file citation's span (EDGE1). Accepted as a deliberate prefer-silent trade; logged as a Delivery Finding for a future story. `check-comment-citations.mjs:424`.
- `[VERIFIED]` The render.ts justification for moving the fix out of `quoteFor` is real. Evidence: `src/shell/render.ts:284-288` — `"FACE BACKWARDS"` ends line 285, its citation `WSMAIN.MAC:1331` opens line 286; a `quoteFor` row-break rule (tried by Dev) turned this correct citation into a false error.

### Devil's Advocate
Suppose this fix is quietly wrong. The most dangerous failure mode for a *citation guard* is not a crash — it is going green over a corruption, because the whole point of these sw8-1x/2x stories is that a guard which does not bite is worse than no guard. So the adversarial question is: does this suppression ever hide a REAL stale citation? Yes, in one measured shape (EDGE1): a citation whose quoted verbatim genuinely does not live at its cited line, but coincidentally appears inside an *earlier* same-file citation's span, is silenced — and the predicate does not distinguish "this quote was the previous columnar row's" (the bug we fix) from "the author mis-typed the line and it happens to collide." A malicious or careless author could, in principle, hide a wrong citation by ensuring its quote text also appears at some earlier-cited line in the same file. How reachable is that? It requires the quote to (a) fail at its own line, (b) resolve to a line that (c) an earlier citation in the *same comment block* already spans, in (d) the same file. That is narrow, and it is the direction the guard's own philosophy already leans (it drops single-token quotes, range-only spans, and paraphrases rather than risk a false positive — see `UNCATCHABLE`). The story's mandate is explicitly "do not manufacture a defect a reader would 'fix' a correct citation onto," which values silence over loud-wrong. So the trade is aligned, not a regression against intent — but it IS a real reduction in detection power and I have logged it so it is not rediscovered. Second attack: could the suppression fire ACROSS files and hide an unrelated defect? No — verified by EDGE2: `o.file === c.file` blocks it, and `at` is a line index within `c`'s own resolved file so the comparison is well-typed. Third: non-determinism? A guard that flips answers between runs would be the worst outcome for a gate; I chased a suspected flip and proved it was a misread — 5 consecutive runs are identical, and every fixture cites `.MAC`, which resolves by `join(romDir, basename)` and never touches the module-level `treeIndex` cache that could otherwise leak across calls. Fourth: does the fix weaken the 247 real before-quotes? No — those verify at their own line and never reach the relocation/suppression branch. The residual risk is EDGE1 only, accepted and documented.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** a source comment string → `extractCitations` (quote/citation pairing, unchanged) → `checkCitations` relocation → the new suppression guard → `errs[]`. Safe because the guard only removes a manufactured report when the quote provably belongs to an earlier same-file sibling's span; all true-positive paths are upstream and untouched.
**Pattern observed:** resolution-based disambiguation (the only mechanism that separates a legit wrapped before-quote from a stolen columnar one) at `plugins/star-wars/tools/audit/check-comment-citations.mjs:424`.
**Error handling:** the change is a guarded `continue`; `o.start !== null` prevents null-coercion in the range compare; no exception path added. Verified 2358/2358 star-wars, 209/209 audit, lint + orchestrator green.
**Specialist incorporation:**
- [RULE] rule-checker confirmed one finding — a vacuous regression control — which I independently reproduced by mutation and remediated in-review with two mutation-killing controls (span-containment + earlier-only ordering); suite-level mutation confirms they bite. `.mjs` change compliant with javascript.md #1/#4/#6/#7 and typescript.md.
- [SEC] security specialist returned clean; I confirmed the new branch adds no regex/ReDoS, no dynamic property access, no path resolution, no I/O, and the test's temp-dir cleanup is scoped to the `mkdtempSync` return value (dev-only tool, no auth/tenancy/network).
- [PRE] preflight green (2358/2358 star-wars, 209/209 audit incl. the sw8-24 ratchet, lint clean, orchestrator 408/408).
One [LOW] [EDGE] over-suppression observation (stale after-quote coinciding with an earlier same-file citation) accepted as a deliberate prefer-silent trade and logged as a Delivery Finding.
**Handoff:** To SM for finish-story