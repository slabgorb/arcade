---
story_id: "cp6-5"
jira_key: "cp6-5"
epic: "cp6"
workflow: "tdd"
---
# Story cp6-5: centipede's claim ledger cannot re-run a COUNT — SND-114 shipped 'five other routines' when it is four, and the corrected number is just as unguarded

## Story Details
- **ID:** cp6-5
- **Jira Key:** cp6-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none
- **Repos:** arcade

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T13:53:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T13:23:24Z | 2026-08-05T13:26:48Z | 3m 24s |
| red | 2026-08-05T13:26:48Z | 2026-08-05T13:39:49Z | 13m 1s |
| green | 2026-08-05T13:39:49Z | 2026-08-05T13:46:25Z | 6m 36s |
| review | 2026-08-05T13:46:25Z | 2026-08-05T13:53:51Z | 7m 26s |
| finish | 2026-08-05T13:53:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Count #2 ("four more times in this revision") is guarded as `revision.v4 = 5`, NOT `= 4`.**
  - **What the spec said:** context AC-3 (SM correction, Thrawn) asks for two count guards — whole-tree `= 20` and "the four `52$` defs in revision.v4 that lie OUTSIDE the SOUNDS routine".
  - **What I did:** the RED test (`count-assertions.test.ts`) drives and requires SND-114 to carry a whole-tree count `= 20` and a `scope: 'revision.v4'` count `= 5`, with a mandatory `note` recording that "four more" = 5 − the SOUNDS-owned def at `CENTI4.MAC:2418`.
  - **Why:** "four more" is NOT a clean recipe-count. revision.v4 holds **five** `52$` defs (`CENTI4.MAC:622,:1076,:2065,:2418` + `CENIR4.MAC:388`); the "four" excludes only the SOUNDS-owned `:2418`. Encoding it as a pattern-over-scope of `= 4` is impossible without an exclusion, and `CENTI4.MAC` alone `= 4` is a **right-number-WRONG-SET** trap (that 4 is `622/1076/2065/2418` — it drops `CENIR4.MAC:388` and keeps the SOUNDS one). `revision.v4 = 5` is the faithful drift-catching substrate; any `52$` added/removed in the revision reddens it, which is exactly the protection the story wants. The `CT-SCOPE-BAD` test pins that `scope: revision.v4, expected: 4` MUST redden, making the wrong-set trap a guarded failure.
  - **Forward impact:** SND-114's PROSE still reads "four more" (correct, and unchanged — this is not a text story). A reader comparing the prose "four" to the guard's `5` needs the `note`; Dev must carry it. If Reviewer prefers a different faithful encoding (e.g. enumerated-citation coverage of the four `:622/:1076/:2065/:388` lines instead of a scoped tally), that is a legitimate alternative — the contract is "the four's drift is guarded", not "the literal number 4 appears".

- **`CountAssertion` type authored on `check-citations.d.mts` (TEA territory).** The `.d.mts` is the TEA-authored contract per its own header; I added `counts?: CountAssertion[]` + the `CountAssertion` interface there so the RED test typechecks. The runtime (`check-citations.mjs`) and the SND-114 data change remain Dev's (GREEN). No runtime behaviour was authored by TEA.

### Dev (implementation)

- **Count recipe is a REGEX `pattern`, not "any shell command".**
  - Spec source: `context-story-cp6-5.md` → Notes for Development
  - Spec text: "the schema should accept any shell command that returns a count, not just grep"
  - Implementation: the `CountAssertion` recipe is a regex `pattern` (fed to `new RegExp`) counted line-by-line by an in-process file walk (`countMatchingLines`) — no shell is spawned.
  - Rationale: (1) TEA's committed contract (`check-citations.d.mts`) and RED suite already fixed the shape as `{pattern, scope?, expected}`, and TEA's contract outranks a low-authority Notes bullet; (2) executing a shell string out of a JSON data file is a command-injection surface the citation gate should not open (the claims are trusted today, but the gate runs in CI and locally) — a line-regex is deterministic, sandbox-safe, and exactly reproduces the prose's `grep -rn '^52[$]:'` recipe. `scope` reuses `source.file`'s containment rule so a subpath cannot escape the tree.
  - Severity: minor
  - Forward impact: minor — a future claim needing a genuinely non-regex tally (e.g. a numeric sum) would need a schema extension; none exists today. The mechanism already generalizes across claims and scopes (AC-5).

## SM Assessment

**Story:** cp6-5 (2pt, centipede, chore, tdd) — guard SND-114's unguarded `52$` COUNT.

**Board:** clean. Sibling branch probe (`git fetch --prune && git branch -r | grep -Ei cp6-5`) found no owner; no `cp6-5` session in any `a-*` checkout; merge gate empty. Claimed on `main` (commit `ffb0e29`) with empty branch `feat/cp6-5-guard-claim-ledger-count` pushed; story stamped `in_progress`.

**Grounding (measured this session — the epic YAML had NO description and NO acceptance_criteria, so ACs were DERIVED and must rest on these):**
- SND-114 (`plugins/centipede/docs/rom-study/claims/16-sound.json`) has `source` = `CENTI4.MAC:2322` (the `.SBTTL SOUNDS` line). The citation gate (`plugins/centipede/tests/audit/citations.test.ts`) verifies that verbatim/line PAIR + a coverage sweep (cp6-1's `dossier-sweep`), but NOT the COUNT embedded in the claim body.
- The claim body asserts a reproducible count: "52$ is DEFINED four more times in this revision (CENTI4.MAC:622, :1076, :2065 and CENIR4.MAC:388), and 20 times across the whole vendored tree." **Both numbers are CORRECT on the current tree** — measured: whole-tree `grep -rn '^52[$]:' reference/atari-source/centipede` = 20; revision.v4 = 5 defs, one SOUNDS-owned (line 2418), four others.
- The "five other routines" error named in the title was ALREADY corrected to "four" in the current text — this is NOT a text-correction story (the only literal "five" in the file is an unrelated channels claim at line 760). The story is purely: add a guard that RE-DERIVES the count so it reddens on source drift.

**Scope for TEA/Dev:** extend the claims schema so a claim can carry a machine-checkable COUNT assertion (recipe + expected number), and re-run it in `citations.test.ts` so "four"/"20" are re-derived and redden on drift. Mechanism should generalize (title: "the corrected number is just as unguarded"). Related prior work: cp6-1 (mutation-testable `dossier-sweep`); count-guard precedent in tempest/red-baron audit gates.

**Correction I made to the derived ACs:** the first-pass AC-3 mis-specified the "four" as a grep over the SOUNDS span `CENTI4.MAC:2322-2465` (which holds ONE `52$`, not four). Corrected in `sprint/context/context-story-cp6-5.md` with a dated ⚠ note — the four are the defs OUTSIDE SOUNDS in revision.v4. The NUMBERS (20 tree-wide, 4 others in revision.v4) are the contract; the exact recipe encoding is Dev's.

**Handoff:** TEA (Han Solo) owns RED. Write the failing count-guard test against `citations.test.ts`; it must SKIP cleanly on CI where `reference/` is absent (AC-3 of the existing gate). Do not touch SND-114's prose.
## TEA Assessment

**RED phase — complete. Verdict:** clean RED, ready for GREEN (Yoda / Dev).

**What I wrote (tests only + the TEA-owned type contract):**
- `plugins/centipede/tests/audit/count-assertions.test.ts` — the count-guard suite (new sibling to `citations.test.ts`, isolated for mutation-testability per AC-4/AC-5).
- `plugins/centipede/tools/audit/check-citations.d.mts` — added the `CountAssertion` interface + optional `counts?: CountAssertion[]` on `Claim`. This is the TEA-authored contract (the `.d.mts` header states TEA owns it); no runtime was authored.

**RED proof (testing-runner, RUN_ID cp6-5-tea-red):** `Test Files 1 failed | 69 passed (70)` · `Tests 9 failed | 1261 passed (1270)`. All 9 failures are in `count-assertions.test.ts` and are **feature-absence** (`checkClaims` ignores `counts`; SND-114 carries no `counts`). Every other centipede file — including `citations.test.ts` and `sound-dossier.test.ts` — stayed green: the `.d.mts` change is additive and optional. Locally `npm run lint` (tsc --noEmit) is clean.

**Non-vacuity:** the drift tests do not trust a hand-typed number — an independent `countMatchingLines()` walk (which does NOT use the checker) proves the machine truly has **20** whole-tree and **5** revision.v4 `52$` defs before any `expected` is asserted. A wrong ground-truth would fail that guard first.

**What GREEN (Dev) must do to turn this suite:**
1. In `tools/audit/check-citations.mjs`, teach `checkClaims` to validate + re-derive `claim.counts[]`:
   - **Schema (always, even `vendoredRoot: null`):** reject a count whose `expected` is not a non-negative integer (0 is VALID — use `??`, never `||`), or whose `pattern` is missing/empty. One error per bad count, naming the claim id and the word "count".
   - **Re-derivation (only when `vendoredRoot` present):** for each count, walk the in-scope files (whole tree, or the `scope` subpath — a dir walked recursively or a single file), count LINES matching `new RegExp(pattern)`, compare to `expected`; a mismatch is one error naming the claim id. A `scope` that escapes the tree after normalisation is an error (reuse `source.file`'s containment rule), NOT a silent 0.
2. In `docs/rom-study/claims/16-sound.json`, add `counts` to **SND-114**: one whole-tree count `{pattern:"^52[$]:", expected:20}` and one `{pattern:"^52[$]:", scope:"revision.v4", expected:5, note:"…four more = 5 − SOUNDS-owned CENTI4.MAC:2418"}`. Do NOT touch SND-114's prose — it already correctly says "four"/"20".
   - **Read the TEA deviation above** on why count #2 is `revision.v4 = 5`, not `4` (right-number-wrong-set trap). If you pick a different faithful encoding of "four", update the AC-3 coverage test's `.toContain(5)` accordingly and note it.
3. Confirm the CI path stays green: with the tree absent, all re-derivation blocks `skipIf(!vendoredAvailable)` and only schema checks run.

**Rule Coverage (lang-review/typescript.md):**
| Check | Coverage |
|-------|----------|
| Meaningful assertions / no vacuous tests | Every test asserts a concrete error id or `[]`; ground-truth walk proves the fixture numbers. |
| `x \|\| default` where `0` is valid (falsy-zero) | `CT-6` (schema accepts `expected: 0`) + `CT-ZERO` (a real 0 re-derives and matches; `expected: 1` reddens). |
| Input validation on parsed/external data | Schema block rejects non-integer/negative `expected`, missing/empty `pattern`. |
| Path traversal / containment | `CT-ESCAPE` — a `scope` escaping the vendored tree must error, not silently return 0. |
| `as unknown as T` double-cast | Used only in the schema `base()` helper to feed intentionally-malformed input — the same pattern `citations.test.ts` uses; test-only, not production. |

**Handoff to Dev (Yoda):** implement the runtime + the SND-114 data per the three steps above. The suite is the spec; make the 9 reds green without weakening the ground-truth or containment assertions.
## Dev Assessment

**Implementation Complete:** Yes — all 9 RED tests turned GREEN with minimal code.

**Files Changed:**
- `plugins/centipede/tools/audit/check-citations.mjs` — taught `checkClaims` to validate + re-derive `claim.counts[]`. Added `resolveScope` (containment-checked scope → absolute path; absent ⇒ whole tree), `countMatchingLines` (recursive line-regex tally, flag-free `RegExp` so `.test` stays stateless), `countSchemaError` (non-empty pattern; `expected` a non-negative integer so `0` is valid — no `||` coercion; optional string scope/note). Re-derivation runs only when `vendoredRoot` is present; schema-only otherwise (CI stays green).
- `plugins/centipede/tools/audit/check-citations.d.mts` — (TEA-authored contract; unchanged by Dev).
- `plugins/centipede/docs/rom-study/claims/16-sound.json` — added `counts` to SND-114: whole-tree `^52[$]:` = 20, and `scope: revision.v4` `^52[$]:` = 5, each with a `note`. SND-114's PROSE is untouched (it already reads "four"/"20").

**Tests:** 1270/1270 centipede passing (GREEN) — count-assertions 14/14, zero regressions. Verified by testing-runner (RUN_ID cp6-5-dev-green): `Test Files 70 passed (70)` · `Tests 1270 passed (1270)`. `npm run lint` (tsc --noEmit) clean.

**Note on the existing gate:** `citations.test.ts`'s "every committed claim passes the checker against the vendored tree" now ALSO re-derives SND-114's counts each run — so the 20/5 tallies are guarded by both the new suite and the existing whole-ledger check.

**Deviation:** one (minor) — count recipe is a regex `pattern`, not "any shell command" (security + TEA contract; see `### Dev (implementation)`).

**Handoff:** To Reviewer (Obi-Wan) for the review phase.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests GREEN, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (independently re-verified the numbers + 2418-in-SOUNDS) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 2 (both low) | confirmed 2 (non-blocking), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (27 rules, 41 instances, 0 violations) | N/A |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 2 confirmed (both low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Story cp6-5 gives centipede's citation gate the ability to RE-DERIVE a numeric tally embedded in claim prose, closing the exact hole named in the title: SND-114's "four"/"20" were correct but unguarded, and a source edit would have rotted them behind a green suite. The implementation is minimal, honest, and — the crux for a fidelity story — genuinely re-runs the count against the vendored filesystem rather than reading the number back out of the prose.

I did not rubber-stamp the green suite. I re-ran the ground truth myself, independently of the code under review.

### What I verified independently (not taken from subagents)
- **The numbers are real and re-derived.** `grep -rn '^52[$]:' reference/atari-source/centipede` = **20**; over `revision.v4` = **5**. The runtime `countMatchingLines` walks the filesystem at check-time (`check-citations.mjs:401-434`) and compares to `expected` — it never reads a figure out of `claim.claim` or `ct.note`. `[RULE]` confirmed by rule-checker's ADDITIONAL contract check and by my own read.
- **`CENTI4.MAC:2418` really is inside SOUNDS.** The `.SBTTL SOUNDS` subtitle is at 2322 and the next subtitle (`SWAP`) is at 2467, so 2418 (the `52$: LDY CHAN0` the note calls SOUNDS-owned) lies within the routine. The note's "four more = 5 − the SOUNDS-owned def at 2418" is arithmetically and positionally correct.
- **No binary files in the vendored tree** (`file` sweep) — so the recursive utf8 walk cannot diverge from `grep`; walk, grep, and the test's independent ground-truth walk all agree at 20/5.
- **The falsy-zero trap is closed.** Schema admits `expected: 0` via `Number.isInteger(ct.expected) && ct.expected >= 0` — no `|| default`. Pinned by CT-6 + CT-ZERO.
- **Casts are test-only.** The single `as unknown as Claim` sits in the test's `base()` malformed-input helper, byte-identical in purpose to `citations.test.ts`'s existing 3 uses.

### Rule Compliance (lang-review/typescript.md)
`[RULE]` reviewer-rule-checker checked 27 applicable items across the .mjs runtime, .d.mts contract, .ts test and .json data — **0 violations**. Key checks: `||`-vs-`??` on a valid `0` (compliant), `.js`/extensionless imports under `moduleResolution: bundler` (compliant, matches sibling), regex-from-external-string wrapped in try/catch (compliant), test non-vacuity via an independent ground-truth walk (compliant), and the project's citation-gate contract "checker is code, claims are data, counts must be re-derived" (compliant).

### Dispatch coverage
`[DOC]` comment-analyzer: clean — every factual note re-verified against the source. `[SEC]` security: 2 low, below. `[RULE]` rule-checker: clean. Disabled this project: `[EDGE]` edge-hunter, `[SILENT]` silent-failure-hunter, `[TEST]` test-analyzer, `[TYPE]` type-design, `[SIMPLE]` simplifier — I assessed each domain myself:
- `[EDGE]` boundaries are well-covered by tests: `expected:0`, empty pattern, non-integer/negative expected, scope-escape, invalid regex (try/catch), single-file vs directory scope, wrong scoped count.
- `[SILENT]` no swallowed errors: an invalid regex, an escaping scope, and a malformed count each produce a distinct error string naming the claim id — none silently returns 0 or `[]`.
- `[TEST]` the suite is non-vacuous: an independent `countMatchingLines` proves 20/5 before the checker is trusted, and drift teeth mutate `expected` and require red.
- `[TYPE]` `CountAssertion` is a narrow interface (no `any`; optional fields typed), and the runtime `countSchemaError` matches it field-for-field.
- `[SIMPLE]` three single-purpose helpers, no over-engineering; the `scope` generality is used (SND-114's second count + AC-5), not speculative.

### Confirmed findings (both LOW — non-blocking)
1. `[SEC]` **ReDoS (`check-citations.mjs` ~463):** `new RegExp(ct.pattern)` from claim JSON has no complexity guard; a catastrophic pattern could hang the tool. Mitigated: claims/*.json is trusted, reviewed, in-repo data, and the whole re-derivation path is skipped on CI. Defense-in-depth follow-up only.
2. `[SEC]` **Symlink-follow in the walk (`check-citations.mjs` ~401):** `countMatchingLines` reads files via `readFileSync` which follows symlinks, and only the top-level `scope` is containment-checked; a symlink inside the tree pointing outside would be read. Mitigated: the vendored tree is a fixed local 1981 source dump (no symlinks), and CI skips the path. Same class as the existing `resolveInTree` behavior; optional `lstat`/skip-symlink hardening.

Per Reviewer proportionality, two low-severity, trust-model-mitigated, defense-in-depth notes on a 2-point audit-tooling chore are a follow-up, not a block.

### Deviation Audit
Two deviations logged, both sound and both with all 6 fields:
- **TEA — "four more" guarded as `revision.v4 = 5`, not `4`.** Correct engineering: `4` is not a clean recipe-count (rev.v4 holds 5; `CENTI4.MAC` alone is a different set of 4). `5` is the faithful drift substrate, carried with an explanatory `note`, and CT-SCOPE-BAD pins that `expected:4` MUST redden. Accepted.
- **Dev — recipe is a regex `pattern`, not "any shell command".** Correct and security-positive: honours TEA's committed contract and refuses a shell-injection surface in a CI-run tool. Accepted.

### Devil's Advocate
Assume this is broken. The most credible attack on its value is not a crash but a *silent scope gap*: the counts re-derive the number from the SOURCE and compare to `expected`, but nothing links `expected` back to the PROSE text. If a future editor fat-fingers the prose "20" into "21" while the source still holds 20, the guard (expected 20, source 20) stays green and the prose is wrong — the very rot the story set out to kill, arriving from the prose side instead of the source side. I weighed this hard and it does NOT block: the story's stated defect is source-drift (now guarded), AC-3 asks for count assertions that re-derive the numbers (delivered), and cross-checking free-form prose against a structured tally is brittle (which token? the claim carries "four", "20", and four line numbers). It is a legitimate follow-up, not a defect in what was built. Second angle: the `revision.v4 = 5` guard over-reddens if a `52$` is ever added *inside* SOUNDS (rev.v4→6 while "four more" stays 4) — but an over-redden forces a human to re-read the prose, which is the guard's whole purpose, so this is a feature, not a bug, and TEA documented it. Third: a confused user could write a count with a `/g`-flagged intent, but `new RegExp(pattern)` takes source only (no flags), so `.test` stays stateless across the walk — no lastIndex corruption. Fourth: a stressed filesystem — a file deleted mid-walk — would throw from `readFileSync` and surface as a test error, not a false green; acceptable for a local audit tool. Fifth: performance — `checkClaims(loadClaims())` re-walks the tree per no-scope count every full-suite run, but only SND-114 carries counts today (two walks of a tiny source dump); it scales O(claims-with-counts × tree) and is worth watching if counts proliferate, but is a non-issue now. None of these rise to Critical or High.

### Verdict rationale
All mechanical gates green (centipede 1270/1270, orchestrator 390/390, lint clean). Zero rule violations. Zero comment/doc defects. Two low, trust-model-mitigated security notes. The feature does exactly what the AC demands and re-derives honestly from source. No Critical or High → **APPROVED**.

**Handoff:** To SM (Thrawn) for the finish ceremony.
## Impact Summary

**Status:** READY TO FINISH (blocking_count: 0)

**Story Delivery:** cp6-5 adds machine-checked COUNT assertions to centipede's citation gate, guarding SND-114's embedded tallies ("four"/"20") against source drift. The runtime re-derives counts from the vendored filesystem at gate-run time (never reads them from prose). Code landed on `main` via 7b68024 (RED) + 9e24b92 (GREEN); trunk-based, no PR.

**Metrics:** centipede 1270/1270, orchestrator 390/390, lint clean; 0 rule violations (27 checked); AC-1..AC-5 met.

**Design deviations (both accepted at review):**
1. TEA — count #2 encoded as `revision.v4 = 5`, not `4` (a `4` recipe-count is a right-number-wrong-set trap; `5` is the faithful drift substrate, documented in the `note`).
2. Dev — recipe is a regex `pattern`, not "any shell command" (honours TEA's contract; no shell-injection surface in a CI-run tool).

**Non-blocking follow-ups (both LOW security, trust-model-mitigated):**
1. ReDoS — `new RegExp(ct.pattern)` from trusted in-repo claim data, no complexity guard; re-derivation is CI-skipped.
2. Symlink-follow in `countMatchingLines` — only the top-level scope is containment-checked; vendored tree is a fixed local dump (no symlinks), CI-skipped, same class as existing `resolveInTree`.

**Verdict:** APPROVED (Reviewer, first pass — no rejected rounds, no resurrected findings).
