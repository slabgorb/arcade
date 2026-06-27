---
story_id: "7-8"
jira_key: "7-8"
epic: "7"
workflow: "trivial"
---
# Story 7-8: Complete & harden canonical arcade serving (7-7 follow-up)

## Story Details
- **ID:** 7-8
- **Jira Key:** 7-8
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-27T22:30:02Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T21:30:44Z | 2026-06-27T21:32:17Z | 1m 33s |
| implement | 2026-06-27T21:32:17Z | 2026-06-27T22:21:18Z | 49m 1s |
| review | 2026-06-27T22:21:18Z | 2026-06-27T22:30:02Z | 8m 44s |
| finish | 2026-06-27T22:30:02Z | - | - |

## Sm Assessment

**Routing:** Dev (Walter) for the in-repo work. Trivial/phased workflow → implement phase.

**Technical approach:** Three of the five ACs are in-repo polish that Dev can land directly on `main`:
- **AC3 — engines pin:** Add an `engines` field (`node >=20`) to the orchestrator `package.json` (the one that backs `npm test`) so an unsupported Node version fails loudly instead of cryptically.
- **AC4 — stale test comment:** In `tests/canonical-serve.test.mjs` (~line 10) fix the header comment from `node --test tests/` to `node --test "tests/**/*.test.mjs"`.
- **AC5 — test-quality polish:** In the same test file — (a) the `recipeBody` parser must not false-match a `serve :=` variable line; (b) the pinned-port checks must assert both `CLAUDE.md` AND `README.md` *per-file* (not the concatenation); (c) add a test that the canonical serve set (subrepos / install-all) includes `lobby`. Suite stays green.

**OPERATOR actions (AC1 + AC2) — NOT Dev code work, flagged for the user/operator:**
- **AC1:** Repoint the Cloudflare tunnel (arcade.slabgorb.com → :5273 tempest, :5270 lobby) at the single canonical orchestrator checkout, verify live.
- **AC2:** Remove or mark-non-authoritative the stale clones (`~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest`).

These two need filesystem/infra access outside this repo and operator judgment about which checkout is canonical. Dev should land the in-repo ACs; the OPERATOR ACs get coordinated with the user before the story is finished. Until AC1 lands, the original 6-2/6-4 drift bug is documented but not actually enforced.

**Scope note:** No app/game code here — orchestrator tooling + tests only. Base branch `main` (trunk-based, no feature branch).

## Dev Assessment

**Implementation Complete:** Yes (in-repo scope)

**Files Changed:**
- `package.json` — added `engines: { node: ">=20" }` (AC3)
- `tests/canonical-serve.test.mjs` — fixed stale header comment to the real `npm test` invocation (AC4); `recipeBody` no longer false-matches a `serve :=` line (AC5a); pinned-port checks now assert per-file across CLAUDE.md AND README.md (AC5b); added a test that `subrepos` includes `lobby` (AC5c); reframed the two doctrine tests to the corrected repo-not-directory model
- `CLAUDE.md` — rewrote the "canonical checkout" doctrine: "canonical" is the repo `arcade`; the live arcade is whatever checkout is bound to the tunnel ports, not a folder
- `README.md` — corrected the matching "never serve from a duplicate clone" line

**Tests:** 8/8 passing (GREEN)

**Branch:** `main` (trunk-based). Committed and pushed: `7f763cc` on `origin/main` (github.com/slabgorb/arcade), rebased over a-1's `9b66804`.

**Scope change:** AC1 + AC2 (operator drift actions) dropped per user direction — see Design Deviations. Doctrine corrected in docs + tests instead.

**Handoff:** To review (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 8/8 tests green, exit 0, valid JSON, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter` — domain assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (both non-blocking: 1 Medium, 1 Low), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain assessed by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — N/A (no TS types; .mjs/json only) |
| 7 | reviewer-security | Yes | clean | none | N/A — no runtime/auth/secret surface; regexes & paths are literals |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 13 rules / 31 instances / 0 violations (javascript.md) |

**All received:** Yes (4 enabled returned; 5 disabled via settings, pre-filled)
**Total findings:** 2 confirmed (non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

This is a docs-doctrine + test-polish + `engines`-pin change in the orchestrator. No application/runtime code, no security surface. All ACs in scope are met; the descoped operator ACs (AC1/AC2) are audited below. Two non-blocking test-quality findings and one advisory note on AC3, none rising to High.

**Data flow traced:** The only "input" is file content. `read(relPath)` → `readFileSync(join(root, relPath))` with `relPath` always a hardcoded literal (`'justfile'`, `'CLAUDE.md'`, `'README.md'`); `root` derived from `import.meta.url`. No external/user input reaches any regex or path — safe (corroborated by [SEC] and [RULE]).

**Observations (≥5):**
1. `[VERIFIED]` AC3 engines pin — `package.json:5-7` adds `{ "node": ">=20" }`; valid JSON (preflight parsed it); satisfies Rule 12 of javascript.md which was previously unmet.
2. `[VERIFIED]` AC4 comment fix — `tests/canonical-serve.test.mjs:14` now reads `node --test 'tests/**/*.test.mjs'`, matching the actual `npm test` script (was the broken `node --test tests/`).
3. `[VERIFIED]` AC5b per-file port assertion — the test now iterates `['CLAUDE.md','README.md']` and asserts each file independently; this genuinely closes the old concatenation false-pass. Confirmed both files contain `5273` and `5270`.
4. `[TEST]` `[MEDIUM]` AC5a `isAssignment` guard is correct but **untested** — no `serve :=` line exists in the justfile, so the new `&& !isAssignment.test(line)` branch is never exercised; removing the guard would break no test. `tests/canonical-serve.test.mjs:37-38`. Non-blocking: AC5a's literal text ("no longer false-matches") is satisfied by the implementation, and the logic is sound (`:=` never appears in a `just` recipe header).
5. `[TEST]` `[LOW]` doctrine regex `/bound to the[\s\S]*?ports/i` is broader than needed — an unbounded lazy span matches any later `ports` (even `transports`); works correctly on the current docs but doesn't enforce phrase proximity. `tests/canonical-serve.test.mjs:112`.
6. `[SIMPLE]` `[LOW]` AC3 advisory gap (my devil's-advocate catch) — `engines` is **advisory**; `npm` does not gate `npm test` on it (only `npm install`, and only with `engine-strict=true`). So AC3's stated rationale ("`npm test` fails with a clear version error") is not actually enforced by the field alone. The AC's deliverable (declare the field) is met; full enforcement was never in the AC's literal ask. Non-blocking.
7. `[VERIFIED]` AC5c new lobby-in-`subrepos` test — `subrepos[1]` is the capture from `^subrepos\s*:=\s*"([^"]*)"`; asserts `/\blobby\b/`. Correct, though coupled to double-quoted single-line justfile formatting (acceptable for an in-repo contract guard).

**Dispatch tags (all 8 domains addressed):**
- `[EDGE]` (disabled subagent; assessed directly): the `recipeBody` boundary case (`serve :=` vs `serve:`) is handled correctly by logic; the only edge gap is that the branch is untested — see Observation 4.
- `[SILENT]` (disabled; assessed directly): no swallowed errors. `readFileSync` has no try/catch by design — fs errors propagate to the test runner as failures. `recipeBody` returns a `null` sentinel on miss, not a swallowed throw. Clean.
- `[TEST]`: two findings — Observations 4 (Medium) and 5 (Low). Both non-blocking.
- `[DOC]` (disabled; assessed directly): doc comments were updated in lockstep with the doctrine (test-file header at lines 1-12, `recipeBody` comment at 28-32, section comments). No stale comment left behind; the AC4 fix is itself a stale-comment correction. Clean.
- `[TYPE]` (disabled; assessed directly): N/A — no TypeScript; `.mjs` + JSON only. No type contracts to break.
- `[SEC]`: clean — no secrets, no injection, no traversal, no ReDoS (literals only). The only new external strings are a public GitHub URL and the already-public tunnel hostname.
- `[SIMPLE]` (disabled; assessed directly): no over-engineering. The single complexity nit is the loose regex in Observation 5.
- `[RULE]`: clean — rule-checker verified all 13 javascript.md rules across 31 instances, 0 violations; confirms the `engines` field resolves the prior Rule 12 gap.

### Rule Compliance

No `.claude/rules/*.md` or `SOUL.md` exist. Applicable rule sources: `CLAUDE.md` conventions and `.pennyfarthing/gates/lang-review/javascript.md`.
- **ES modules** (CLAUDE.md): COMPLIANT — `tests/canonical-serve.test.mjs` uses `import`/`node:` specifiers; `package.json` has `"type": "module"`.
- **Tests live in `tests/**/*.test.mjs`, run via `npm test`** (CLAUDE.md): COMPLIANT — file location and runner unchanged.
- **No application code in orchestrator** (CLAUDE.md): COMPLIANT — diff is docs, JSON metadata, one Node test, and sprint bookkeeping.
- **javascript.md (13 numbered rules)**: COMPLIANT across all 31 instances per `[RULE]` (silent-error, async, prototype, equality, DOM, node, regex-safety, test-quality, scope, error-handling, input-validation, dependency-hygiene, regression). Rule 12 (dependency/config hygiene) is now satisfied by the `engines` field.

### Devil's Advocate

Argue this is broken. The doctrine tests are keyword-matchers over markdown — they assert that words like `strictPort`, `directory name`, and `fails loudly` *appear*, not that the docs are coherent or correct. A careless editor could satisfy every regex with gibberish that happens to contain the keywords, and the suite would stay green while the docs rot. That is the central weakness of a "docs contract" test: it guards presence, not meaning. Observation 5's unbounded `[\s\S]*?` makes one of these matchers especially permissive — delete the intended clause and the test can still pass on stray words elsewhere. The `subrepos` test is brittle in the opposite direction: it hard-codes double-quoted, single-line `subrepos := "..."`; reformat the justfile (single quotes, a line continuation) and the test errors even though the contract holds — a false negative that punishes formatting, not substance. The `isAssignment` guard (Observation 4) is dead from the suite's view: nothing exercises it, so a future refactor that breaks it (e.g. typo `/:==/`) ships green. Operationally, the new CLAUDE.md is correct but sharp — it tells a reader they can "make any checkout live by running `just serve` from it," which, while true, invites someone to kill the live a-1 process and bind `:5273` from a half-finished checkout; `strictPort` prevents a *silent* double-bind but not a deliberate takeover. And AC3's rationale is simply not delivered: `engines` is advisory, so an operator on Node 18 still gets a cryptic `node --test` failure, not the promised clear version error (Observation 6). None of these are correctness bugs in the change itself — the code does exactly what it claims, the tests pass, and the doctrine is a genuine improvement over the directory-as-identity framing it replaces. They are the reasons this is "APPROVED with documented follow-ups," not "APPROVED, flawless." None reaches High: no data loss, no security hole, no broken runtime path.

**Error handling:** No error-handling code introduced; `readFileSync` failures surface as test failures (correct for a contract guard) — `tests/canonical-serve.test.mjs:21`.

**Pattern observed:** Documentation-contract regression guard (assert on file contents) — `tests/canonical-serve.test.mjs` throughout; reasonable for an orchestrator with no runtime, with the keyword-matching caveat noted above.

**Handoff:** To SM (the Dude) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): The 7-7 docs and 7-8 ACs identify the canonical arcade by checkout *directory name* (`a-1`, `arcade`, `tempest`), conflating directory with repo identity. The orchestrator repo is `arcade`; the directory a clone lives in carries no authority. Affects `CLAUDE.md`, `README.md`, `tests/canonical-serve.test.mjs` (corrected here) and possibly the drift framing in `sprint/epic-6.yaml` / `sprint/epic-7.yaml` (not changed). *Found by Dev during implementation.*
- **Improvement** (non-blocking): Prod (the a-1 checkout) currently serves tempest on `:5273` via vite directly, with nothing on `:5270`, so the live cabinet has no lobby. Operator runtime only — `just serve` brings up both. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): The AC5a `isAssignment` guard in `recipeBody` is correct but untested — no `serve :=` line exists in the justfile to exercise it. Affects `tests/canonical-serve.test.mjs` (add a unit test calling `recipeBody()` on a synthetic justfile string with both `serve := "x"` and a `serve:` recipe). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Doctrine regex `/bound to the[\s\S]*?ports/i` is broader than needed; tighten to enforce phrase proximity (e.g. split into `/bound to the/i` + `/pinned ports/i`). Affects `tests/canonical-serve.test.mjs:112`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): AC3's `engines` field is advisory — `npm test` is not gated on it, so an unsupported Node still fails cryptically rather than with a clear version error as the AC's rationale intended. Affects `package.json` / `.npmrc` (true enforcement would need `engine-strict=true`, and even then only on `npm install`). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

1 deviation

- **AC1 + AC2 (operator drift actions) descoped; doctrine corrected instead**
  - Rationale: Directed by the user (highest spec authority). AC1/AC2 rest on a directory-name-as-identity premise that does not match how the arcade is actually run.
  - Severity: major
  - Forward impact: Any future story or epic doc referencing a "canonical checkout" should use the repo + tunnel-binding model, not a folder name.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **AC1 + AC2 (operator drift actions) descoped; doctrine corrected instead**
  - Spec source: Story 7-8 AC1 & AC2 (sprint YAML)
  - Spec text: "OPERATOR: the Cloudflare tunnel ... is repointed at the single canonical orchestrator checkout ..." / "OPERATOR: the stale/duplicate clones under ~/Projects ... are removed, or clearly marked non-authoritative ..."
  - Implementation: Did not touch the tunnel or any clone. Per the repo owner, the orchestrator repo is `arcade`; the directory a checkout lives in (a-1/a-2/…) is just a location with no identity, and working across multiple checkouts is intentional (a-1 currently drives prod). Instead corrected the doctrine: rewrote the CLAUDE.md "One canonical checkout" section → ‘"Canonical" is the repo, not the directory’ (live = whatever checkout is bound to the tunnel ports; `strictPort` gives one owner per port), fixed the matching README line, and reframed the two tests that encoded the old doctrine.
  - Rationale: Directed by the user (highest spec authority). AC1/AC2 rest on a directory-name-as-identity premise that does not match how the arcade is actually run.
  - Severity: major
  - Forward impact: Any future story or epic doc referencing a "canonical checkout" should use the repo + tunnel-binding model, not a folder name.

### Reviewer (audit)
- **AC1 + AC2 descoped; doctrine corrected instead** → ✓ ACCEPTED by Reviewer: The descope was directed by the repo owner (highest spec authority) and the reasoning is sound — AC1/AC2 rested on a directory-name-as-identity premise that does not match how the arcade is run (the repo `arcade` is cloned to multiple working directories; "live" is whichever checkout is bound to the tunnel ports). The substitute work (CLAUDE.md/README doctrine rewrite + reframed tests) correctly captures the intended contract, and the suite stays green. No undocumented deviations found: the diff matches the logged scope (engines pin, AC4 comment, AC5 test polish, doctrine rewrite, and the stale "no remote yet" note corrected to `origin → github.com/slabgorb/arcade`).