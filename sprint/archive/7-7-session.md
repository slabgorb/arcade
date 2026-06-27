---
story_id: "7-7"
jira_key: ""
epic: "7"
workflow: "tdd"
---
# Story 7-7: Canonical arcade server: one authoritative way to serve the games (dev + production)

## Story Details
- **ID:** 7-7
- **Jira Key:** (none — local YAML tracking only)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-27T19:54:52Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T19:28:08Z | 2026-06-27T19:29:33Z | 1m 25s |
| red | 2026-06-27T19:29:33Z | 2026-06-27T19:35:47Z | 6m 14s |
| green | 2026-06-27T19:35:47Z | 2026-06-27T19:44:35Z | 8m 48s |
| review | 2026-06-27T19:44:35Z | 2026-06-27T19:54:52Z | 10m 17s |
| finish | 2026-06-27T19:54:52Z | - | - |

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — orchestrator repo works on main branch only)

## Sm Assessment

**Setup complete.** Session + context written, branch strategy is trunk-based (orchestrator works on `main`). Routing to TEA for the RED phase per the `tdd` workflow.

**Coordination note for TEA — scope the "tests" honestly.** This is mostly an ops/environment story (canonical checkout, Cloudflare tunnel wiring, pinned ports, removing stale clones under `~/Projects`). Several ACs are not naturally unit-testable inside the repo. Focus failing tests on what *is* automatable and lives in-repo:
- AC2: assert a single launch command/recipe exists at the orchestrator (justfile recipe or script) and references pinned ports (5273 tempest, 5270 lobby).
- AC1 + AC5: assert docs (CLAUDE.md / README) name the one canonical serve workflow + checkout.
- AC2: a smoke/structure test that the launch command targets lobby + game subrepos from the canonical checkout.

The non-codeable ACs (AC3 tunnel wiring, AC4 enumerate/remove duplicate clones) are operator actions verified manually in review/finish — record them as Delivery Findings / manual verification steps rather than forcing a unit test. Don't manufacture vacuous tests to "cover" them.

**Next:** TEA (RED) → Dev (GREEN) → Reviewer → SM (finish).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Story has an automatable in-repo contract (canonical `serve` recipe + canonical-serve docs) worth a regression guard, even though it is tagged a chore. The operator-only ACs are handled via deviations + manual verification rather than vacuous tests.

**Test Files:**
- `tests/canonical-serve.test.mjs` — guards the in-repo canonical-serve contract (recipe + docs + pinned ports)
- `package.json` — new orchestrator-root test harness (`npm test` → `node --test tests/`, zero deps, Node built-in runner)

**Tests Written:** 7 tests covering 4 of 5 ACs (AC1, AC2, AC5 fully; AC4 in-repo doc footprint; AC3 + AC4-filesystem deferred to manual verification)
**Status:** RED (7/7 failing, verified by testing-runner — clean run, no harness/syntax errors)

### AC Coverage

| AC | What it requires | Coverage |
|----|------------------|----------|
| AC1 | Single canonical checkout documented as source of truth | `CLAUDE.md` source-of-truth/authoritative test (failing) |
| AC2 | One launch command serving lobby + games on pinned ports | `serve` recipe exists + launches lobby & games + docs cite ports 5273/5270 (3 failing tests) |
| AC3 | Cloudflare tunnel wired to canonical checkout only | **Not automatable** — manual verification (deviation logged) |
| AC4 | Duplicate clones removed / marked non-authoritative | In-repo doc warning test (failing) + **filesystem action manual** (deviation logged) |
| AC5 | Docs document the canonical serve workflow | `CLAUDE.md` + `README.md` `just serve` tests (failing) |

**Rule Coverage:** Orchestrator repo has no `.pennyfarthing/gates/lang-review/` checklist for the shell/just/markdown surface here and no `.claude/rules/*.md`, so there are no language-rule tests to add — coverage is AC-driven. Self-check: every test makes a meaningful `assert.match` / `assert.notEqual` against real file content; no `let _ =`, no `assert(true)`, no always-true assertions.
**Self-check:** 0 vacuous tests found.

### Notes for Dev (Walter — GREEN)

To turn this green:
1. Add a `serve` recipe to `justfile` that launches the lobby (port 5270) and the game subrepos (tempest, port 5273) from this canonical checkout — the single launch command. Likely also add `lobby` to the `games` list / a `dev-lobby` recipe.
2. Document the canonical serve workflow in `CLAUDE.md` and `README.md`: the `just serve` command, which checkout is the authoritative source of truth, the pinned ports 5273 + 5270, and a warning not to start ad-hoc servers from a duplicate/non-authoritative clone.
3. Operator actions (NOT tested — verify manually, see Delivery Findings): point the live Cloudflare tunnel + 5273/5270 at the canonical checkout; remove or mark non-authoritative the stale clones `~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest`.
4. Consider wiring `npm test` (orchestrator) into `just ci` so the regression guard runs.
5. If you name the recipe anything other than `serve`, update the three `serve`-naming assertions and note the deviation.

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes (in-repo scope) — operator actions deferred (see Delivery Findings)
**Files Changed:**
- `justfile` — added canonical `serve` recipe (lobby :5270 + tempest :5273 from this checkout, Ctrl-C stops all); new `subrepos` list; `install-all` now installs lobby too; added `dev-lobby`, `build-lobby`, and `test-orchestrator` (wired into `ci`)
- `CLAUDE.md` — new "Serving the arcade (canonical)" section (just serve, single authoritative tunnel-wired checkout, pinned ports, no-ad-hoc-clone warning) + lobby command block; fixed stale "scaffold pending" note
- `README.md` — new "Running the arcade" section featuring `just serve`; added lobby to layout + dev commands
- `package.json` — fixed `node --test` glob so `npm test` runs on Node v25

**Tests:** 7/7 passing (GREEN) — verified via both `npm test` and `just test-orchestrator`
**Branch:** main (trunk-based, orchestrator) — committed `37abb82`, NOT pushed (left for SM/finish or explicit push)

**AC status:**
- AC1 ✅ canonical checkout documented as source of truth (CLAUDE.md)
- AC2 ✅ one launch command (`just serve`) serves lobby + games on pinned ports
- AC3 ⚠️ tunnel wiring — **manual operator action pending** (deviation + Delivery Finding)
- AC4 ⚠️ docs warn against duplicate clones ✅, but **enumerating/removing the on-disk clones is a manual operator action pending**
- AC5 ✅ CLAUDE.md + README document the canonical serve workflow

**Note for Reviewer (The Big Lebowski):** The diff is justfile + docs + a runner fix. The two ⚠️ ACs cannot be satisfied by code in this repo — they need the user to repoint the live tunnel and remove/mark the sibling clones. I deliberately did NOT delete other checkouts or touch the live tunnel (destructive, outside the repo). Please confirm those manual steps with the user before SM marks the story done.

**Handoff:** To Reviewer for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1 minor note) | confirmed 0, dismissed 0 — GREEN 7/7 via npm + just, justfile parses, all recipes present |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — manually considered, see [EDGE] |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — manually considered, see [SILENT] |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 — all Low/Medium, non-blocking |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — manually found 1, see [DOC] |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — N/A (no typed code), see [TYPE] |
| 7 | reviewer-security | Yes | findings | 2 | confirmed 2, dismissed 0 — both LOW, non-blocking |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — manually considered, see [SIMPLE] |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 — LOW, rule-matched (not dismissed), non-blocking |

**All received:** Yes (4 enabled returned; 5 disabled via settings, pre-filled)
**Total findings:** 8 confirmed (7 from subagents + 1 reviewer-found DOC), 0 dismissed, 0 deferred — **0 blocking; all Low/Medium severity**

## Reviewer Assessment

**Verdict:** APPROVED (code quality) — **CONDITIONAL: two operator-only ACs (AC3 tunnel, AC4 clone removal) are NOT done and must be completed by the user before SM marks the story complete. See blocking Delivery Finding.**

The in-repo diff (canonical `just serve` recipe + canonical-serve docs + test harness + runner fix) is correct, minimal, and well-documented. Tests are GREEN and meaningful. No Critical or High issues. The findings below are all Low/Medium and non-blocking. **However**, the diff alone does NOT fix the live-site-drift problem the story exists to solve — that requires the manual tunnel/clone steps, which are intentionally outside this repo.

**Data flow traced:** There is no untrusted runtime input in this change. (a) Test path: static relative paths (`'justfile'`, `'CLAUDE.md'`, `'README.md'`) → `readFileSync(join(root, ...), 'utf8')` where `root` derives from `import.meta.url` → regex assertions. No user input, no traversal. (b) Serve path: `{{root}}` = just's compile-time `justfile_directory()` builtin → `cd {{root}}/lobby` / `cd {{root}}/tempest` → `npm run dev`. No attacker-controllable data reaches any command. Safe.

**Pattern observed:** The `serve` recipe (justfile, "SERVE THE ARCADE" section) mirrors the existing `dev-tempest`/`build-tempest` recipe convention and the `for g in {{...}}` loop pattern already in `install-all`/`status`. Good consistency — the new `subrepos := "lobby tempest"` var matches the existing `games := "tempest"` idiom. Docs follow the existing CLAUDE.md/README section style.

**Error handling:** `serve` uses `set -euo pipefail` + `trap 'kill 0' EXIT`; vite `strictPort: true` makes a port collision fail loudly (printed to the terminal), so failures are visible in the documented interactive use. Test failures throw via `node:assert/strict` (correct fail behaviour); `readFileSync` throws on a missing file (correct — a deleted doc fails the suite). One soft spot: `wait` (no args) returns 0 even if a backgrounded server died, so the recipe can keep serving one game while the other has crashed — but vite's loud strictPort error makes that non-silent for an interactive command (see [SILENT]).

**Security analysis:** No auth/tenant model (arcade is no-backend, client-side per CLAUDE.md). No injection vector (no user input into shell or RegExp at runtime — `name` is the static literal `'serve'`). No secrets introduced. `arcade.slabgorb.com` in `allowedHosts` (pre-existing) is a correct explicit allowlist, not a wildcard. Security subagent confirmed clean on secrets, `{{root}}`/`{{subrepos}}` injection, glob, and path traversal.

### Rule Compliance (JS lang-review checklist — 13 checks, exhaustively verified by reviewer-rule-checker over 59 instances)

- Checks #1–#11, #13: **compliant** across `tests/canonical-serve.test.mjs` and `package.json`. Notable confirmations: #4 strict equality throughout (`start === -1`, `line.trim() === ''`); #6 `readFileSync(..., 'utf8')` encoding present; #7 every RegExp is a literal or built from the static `'serve'`/port constants — no ReDoS, no user input; #8 all 7 assertions are specific (`assert.match`/`assert.notEqual(..., null)`), no `.only`/`.skip`, no vacuous truthy checks; #9 `const`/`let` only, no `var`, no circular deps.
- Check #12 (dependency/config hygiene): **1 VIOLATION** — `package.json` has no `engines` field though `node --test` requires Node 18+/20+. Rule-matched, NOT dismissed. Severity downgraded to **Low/non-blocking** (Node 18 is EOL; realistic devs run 20+, and the failure mode is a one-time cryptic error, not a runtime/security bug). Recommended follow-up: `"engines": { "node": ">=20" }`.

### Observations (tagged by source)

- `[SEC][LOW]` `trap 'kill 0' EXIT` in the `serve` recipe (justfile) sends SIGTERM to the whole process group. **Verified safe** for the documented interactive use (zsh job control gives `just` its own PGID → only just+bash+npm children die). Only broad if mis-invoked from a non-interactive CI/wrapper shell — which one would never do for two blocking dev servers. I evaluated the subagent's suggested `trap 'kill -- -$$'` and **reject it**: `$$` is the bash PID, which is NOT the process-group leader in the interactive case, so `kill -- -$$` would fail to clean up. Current `kill 0` is the right pragmatic choice for an interactive dev recipe. Non-blocking, no change required.
- `[SEC][LOW]` `recipeBody` interpolates `name` into `new RegExp()` without escaping (test file). Only ever called with the static literal `'serve'` → not exploitable. Latent defensive-coding nit. Non-blocking.
- `[TEST][MEDIUM]` `recipeBody`'s `^${name}(\s|:)` also matches a hypothetical `serve := ...` **variable** line (the space before `:=` satisfies `\s`), so test 1 (`assert.notEqual(body, null)`) could false-pass with `body === ''`. Verified by subagent with a synthetic justfile. **Test 2 (`/lobby/i`) still catches the real regression**, so the suite as a whole is sound — this only degrades failure diagnostics. Non-blocking; recommend tightening to `^${name}(\s+[^:=\n]+)?:` or guarding against `:=`.
- `[TEST][MEDIUM]` The pinned-port test concatenates CLAUDE.md + README.md before matching, so it asserts "at least one file mentions each port", not "both files do" (the label overstates). Non-blocking; recommend per-file assertions.
- `[TEST][LOW]` The `serve` body content check is also satisfied by the recipe's `echo` display lines, not only the executable `npm run dev` lines — a hollowed-out recipe could stay green. Accepted docs-contract tradeoff (runtime behaviour is the out-of-scope operator AC); recommend a `/cd\s+.*lobby/` pattern if tightened later.
- `[TEST][LOW]` No test verifies `install-all`/`subrepos` covers lobby (the `subrepos := "lobby tempest"` declaration is an in-repo testable contract). Non-blocking gap.
- `[DOC][LOW]` (reviewer-found; comment_analyzer disabled) `tests/canonical-serve.test.mjs:10` header comment says `npm test (→ node --test tests/)` — the exact bare-directory form that **fails on Node 25** and that Walter had to replace in `package.json`. Stale/misleading. Recommend updating the comment to `node --test 'tests/**/*.test.mjs'`.
- `[SILENT][LOW]` (reviewer-manual; subagent disabled) `wait` with no args returns 0 even if a backgrounded `npm run dev` crashed — partial-failure where one game serves and the other is dead. Mitigated by vite's loud `strictPort` error to the terminal; acceptable for an interactive recipe. Non-blocking.
- `[EDGE][LOW]` (reviewer-manual; subagent disabled) `cd {{root}}/lobby` is unquoted — a `~/Projects` path containing spaces would break it. Pre-existing pattern (`dev-tempest` has the same), not introduced by this story. Non-blocking.
- `[RULE][LOW]` `package.json` missing `engines` field — see Rule Compliance #12 above.
- `[TYPE]` N/A — the diff contains no typed code (markdown, justfile, JSON, and plain `.mjs` with no type annotations). reviewer-type-design disabled; nothing to check.
- `[SIMPLE][VERIFIED]` The diff is proportionate, not over-engineered — evidence: the added `dev-lobby`/`build-lobby`/`test-orchestrator` recipes and the `subrepos` var are each justified (serve must actually run → lobby must install; the regression guard must run in CI). No dead code, no speculative abstraction. reviewer-simplifier disabled; verified manually.
- `[VERIFIED]` `serve` actually launches both servers, not just prints strings — justfile serve body has `(cd {{root}}/lobby && npm run dev) &` and `(cd {{root}}/tempest && npm run dev) &` then `wait` (diff lines 163–165), complying with AC2's "serves the lobby + all game subrepos".
- `[VERIFIED]` Tests are GREEN and non-vacuous — preflight ran `npm test` and `just test-orchestrator`, both 7/7; rule-checker confirmed all assertions are specific (rule #8). Complies with the no-vacuous-assertion rule.

### Devil's Advocate

Argue this is broken. First and most important: **this diff does not fix the bug the story was written to fix.** The story exists because shipped work (6-2, 6-4) never reached the live site, since the Cloudflare tunnel pointed at a stale standalone clone. Nothing in this diff repoints that tunnel or removes those clones — those are AC3/AC4, explicitly deferred. So a reader who sees "story 7-7 done" in the merged sprint could reasonably believe the drift problem is solved when it is not. Worse, the committed `CLAUDE.md`/`README.md` now appear *identically in every clone* (`a-1`, `arcade`, `a-2`, standalone `tempest`) — each copy's docs proclaim the "one canonical checkout" rule, yet nothing in the repo marks which clone is actually canonical or enforces it. A confused maintainer could still `cd ~/Projects/a-1 && vite` and serve stale code; the docs are a convention with zero enforcement. Second, the tests are partly documentation-theater: they assert that certain *words* exist in the docs and that a `serve:` recipe *mentions* lobby/tempest — a malicious or careless edit could replace `npm run dev` with `echo broken`, or point `serve` at a non-existent directory, and all 7 tests stay green (the echo lines alone satisfy the body regex). Third, a stressed environment breaks it: on Node < 18 `npm test` dies cryptically (no `engines` guard); on a `~/Projects` path with spaces the unquoted `cd` in `serve` fails; if lobby's vite crashes, `wait` still returns 0 and the user is left with half an arcade. Fourth, `kill 0` invoked from an unusual non-interactive parent could nuke an outer process group. **What this surfaces:** none of these are code-correctness blockers, but the first point is the decisive one — it confirms that the **BLOCKING Delivery Finding (operator must complete AC3 + AC4) is the gate on real story completion**, and SM must put it in front of the user rather than silently archiving. The code is approvable; the *story* is not "done" on merge alone.

**Handoff:** To SM for finish-story — **with the blocking operator-action finding surfaced to the user.**

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): AC3 + AC4 are operator actions with no in-repo test surface — they need explicit manual verification before finish. Affects the live host: (1) the Cloudflare tunnel + ports 5273/5270 must point at the canonical checkout; (2) the duplicate clones `~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest` must be removed or marked non-authoritative. *Found by TEA during test design.*
- **Gap** (non-blocking): The orchestrator's new `npm test` suite is not wired into any CI sweep — `just ci` runs `test-all build-all` (games only) and never runs the canonical-serve regression guard. Affects `justfile` (`ci` / a new `test-orchestrator` recipe should run `npm test` at root so the guard can't silently rot). *Found by TEA during test design.*
- **Improvement** (non-blocking): `lobby` is not in the justfile `games := "tempest"` list, so `install-all`/`test-all`/`build-all` skip it entirely. Affects `justfile` (Dev should decide whether the canonical `serve` recipe + the `*-all` recipes should include lobby). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (blocking): The two operator-only ACs remain UNDONE and need manual completion before the story is truly finished — code/docs cannot do them. (1) Repoint the live Cloudflare tunnel (`arcade.slabgorb.com`) + ports 5273/5270 at the single canonical orchestrator checkout that runs `just serve`. (2) Remove or mark non-authoritative the stale sibling clones `~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest`. Affects the host environment, not the repo tree. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `tempest/` had no `node_modules` at implementation time (lobby did). `just install-all` now installs both, so the canonical-serve workflow is `just install-all` then `just serve` on a fresh checkout. Affects no file — just the run order. *Found by Dev during implementation.*
- **Improvement** (non-blocking): I addressed TEA's two `justfile` findings (CI wiring + lobby coverage) by adding `test-orchestrator` to `ci` and routing `install-all` through a new `subrepos` list. `test-all`/`build-all` still cover games only (tempest); folding lobby into the full CI build/test sweep is a reasonable follow-up but was out of this story's scope. Affects `justfile`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): The story's core value — the live arcade no longer drifting — is NOT delivered by this diff. The two operator-only ACs must be completed by the user before SM marks 7-7 complete: (1) repoint the Cloudflare tunnel (`arcade.slabgorb.com`, ports 5273/5270) at the single canonical orchestrator checkout that runs `just serve`; (2) remove or mark non-authoritative the stale clones `~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest`. Affects the host environment (tunnel config + `~/Projects` filesystem), not the repo. SM must surface this to the user, not silently archive. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `package.json` has no `engines` field though `node --test` requires Node 18+/20+. Affects `package.json` (add `"engines": { "node": ">=20" }`). Rule-matched (JS lang-review #12). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/canonical-serve.test.mjs:10` header comment still cites `node --test tests/` — the bare-directory form that fails on Node 25 and was replaced in `package.json`. Affects the test file comment (update to `node --test 'tests/**/*.test.mjs'`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Test-quality polish — `recipeBody`'s `^serve(\s|:)` regex can match a `serve :=` variable line (false-pass on the existence test; test 2 still catches the real regression), and the pinned-port test concatenates both docs so it checks "at least one file" not "both". Affects `tests/canonical-serve.test.mjs` (tighten the recipe-header regex; split port asserts per-file). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** None

- **Gap:** The orchestrator's new `npm test` suite is not wired into any CI sweep — `just ci` runs `test-all build-all` (games only) and never runs the canonical-serve regression guard. Affects `justfile`.
- **Improvement:** `lobby` is not in the justfile `games := "tempest"` list, so `install-all`/`test-all`/`build-all` skip it entirely. Affects `justfile`.
- **Improvement:** Test-quality polish — `recipeBody`'s `^serve(\s|:)` regex can match a `serve :=` variable line (false-pass on the existence test; test 2 still catches the real regression), and the pinned-port test concatenates both docs so it checks "at least one file" not "both". Affects `tests/canonical-serve.test.mjs`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`.`** — 2 findings
- **`tests`** — 1 finding

### Deviation Justifications

6 deviations

- **AC3 (Cloudflare tunnel wiring) not covered by an automated test**
  - Rationale: A test that shells out to the live tunnel/host would be non-deterministic and machine-specific; it would test the operator's box, not the code. Honest coverage beats a vacuous or flaky test.
  - Severity: minor
  - Forward impact: Reviewer/SM must manually confirm the tunnel + 5273/5270 point at the canonical checkout before finish.
- **AC4 (enumerate / remove stale clones under ~/Projects) not covered by an automated test**
  - Rationale: Asserting on sibling directories outside the repo would couple the suite to one developer's machine layout and fail in CI / on any other checkout.
  - Severity: minor
  - Forward impact: Reviewer/SM must manually confirm the duplicate clones are removed or marked non-authoritative.
- **Canonical launch command fixed to the recipe name `serve`**
  - Rationale: A test needs a concrete contract to assert against; `serve` is the obvious canonical name and matches the existing `dev-tempest`/`build-all` recipe convention. If Dev picks a different name or a standalone script, update the tests to match and note it.
  - Severity: minor
  - Forward impact: Dev must name the recipe `serve` or update the three `serve`-naming assertions.
- **Operator-only ACs (AC3 tunnel wiring, AC4 clone removal) not performed in-repo — deferred to manual operator action**
  - Rationale: A Dev agent editing files in one checkout must not delete a developer's other checkouts or reconfigure their live tunnel without explicit confirmation; these are operator decisions. Honest hand-off beats silently doing something irreversible.
  - Severity: significant
  - Forward impact: Story is NOT fully "done" until the operator completes these two steps. Flagged as a blocking Delivery Finding for Reviewer/SM/user.
- **Added scope beyond the minimum needed to pass the tests (serve correctness + regression-guard wiring)**
  - Rationale: A `serve` recipe that pattern-matches but can't run is worthless — lobby must be installable, and an untested regression guard rots. Minimal-to-pass would have been dishonest.
  - Severity: minor
  - Forward impact: `just ci` now also runs `test-orchestrator` (orchestrator tests). `subrepos` is the new servable-list var.
- **Fixed the test-runner invocation in the TEA-authored package.json**
  - Rationale: The harness as written did not run via `npm test` on this Node; a non-runnable suite is not a real GREEN.
  - Severity: minor
  - Forward impact: none — same tests, correct invocation.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC3 (Cloudflare tunnel wiring) not covered by an automated test**
  - Spec source: context-story-7-7.md, AC-3
  - Spec text: "The production server (arcade.slabgorb.com / Cloudflare tunnel, ports 5273 tempest + 5270 lobby) is wired to the canonical checkout only"
  - Implementation: No unit test written. Wiring a live Cloudflare tunnel to a specific checkout is host/operator configuration outside the repo tree; there is nothing in-repo to assert against. Covered instead by an in-repo doc test (docs reference both pinned ports) plus a manual verification step recorded in Delivery Findings.
  - Rationale: A test that shells out to the live tunnel/host would be non-deterministic and machine-specific; it would test the operator's box, not the code. Honest coverage beats a vacuous or flaky test.
  - Severity: minor
  - Forward impact: Reviewer/SM must manually confirm the tunnel + 5273/5270 point at the canonical checkout before finish.
- **AC4 (enumerate / remove stale clones under ~/Projects) not covered by an automated test**
  - Spec source: context-story-7-7.md, AC-4
  - Spec text: "Duplicate/stale clones under ~/Projects are enumerated and either removed or clearly marked non-authoritative"
  - Implementation: No unit test written for the filesystem state of ~/Projects. Instead asserted the in-repo footprint: docs must warn against serving from a random/non-authoritative clone (test 7). The actual enumeration/removal of `~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest` is an operator action verified manually.
  - Rationale: Asserting on sibling directories outside the repo would couple the suite to one developer's machine layout and fail in CI / on any other checkout.
  - Severity: minor
  - Forward impact: Reviewer/SM must manually confirm the duplicate clones are removed or marked non-authoritative.
- **Canonical launch command fixed to the recipe name `serve`**
  - Spec source: context-story-7-7.md, AC-2
  - Spec text: "One launch command at the orchestrator (justfile recipe or script) ..."
  - Implementation: Tests assert specifically a `just serve` recipe (and `just serve` in the docs), narrowing the spec's "recipe or script" to a named justfile recipe.
  - Rationale: A test needs a concrete contract to assert against; `serve` is the obvious canonical name and matches the existing `dev-tempest`/`build-all` recipe convention. If Dev picks a different name or a standalone script, update the tests to match and note it.
  - Severity: minor
  - Forward impact: Dev must name the recipe `serve` or update the three `serve`-naming assertions.

### Dev (implementation)
- **Operator-only ACs (AC3 tunnel wiring, AC4 clone removal) not performed in-repo — deferred to manual operator action**
  - Spec source: context-story-7-7.md, AC-3 and AC-4
  - Spec text: "The production server (... Cloudflare tunnel ...) is wired to the canonical checkout only" / "Duplicate/stale clones under ~/Projects are enumerated and either removed or clearly marked non-authoritative"
  - Implementation: Code/docs establish the canonical serve path (`just serve`) and document the rule. The actual host actions — repointing the live Cloudflare tunnel and deleting/marking the sibling clones `~/Projects/tempest`, `~/Projects/arcade/tempest`, `~/Projects/a-1/tempest` — were NOT executed. They mutate state outside this git repo and are destructive/irreversible.
  - Rationale: A Dev agent editing files in one checkout must not delete a developer's other checkouts or reconfigure their live tunnel without explicit confirmation; these are operator decisions. Honest hand-off beats silently doing something irreversible.
  - Severity: significant
  - Forward impact: Story is NOT fully "done" until the operator completes these two steps. Flagged as a blocking Delivery Finding for Reviewer/SM/user.
- **Added scope beyond the minimum needed to pass the tests (serve correctness + regression-guard wiring)**
  - Spec source: TEA tests (tests/canonical-serve.test.mjs) + context-story-7-7.md AC-2
  - Spec text: tests only require a `serve` recipe mentioning lobby+tempest and the docs strings
  - Implementation: Also (a) changed `install-all` to iterate a new `subrepos := "lobby tempest"` so the lobby's deps install (otherwise `just serve` fails — lobby wasn't in the games loop), (b) added `dev-lobby`/`build-lobby` recipes for symmetry, (c) added a `test-orchestrator` recipe and wired it into `ci` so the canonical-serve guard actually runs in CI (TEA Finding).
  - Rationale: A `serve` recipe that pattern-matches but can't run is worthless — lobby must be installable, and an untested regression guard rots. Minimal-to-pass would have been dishonest.
  - Severity: minor
  - Forward impact: `just ci` now also runs `test-orchestrator` (orchestrator tests). `subrepos` is the new servable-list var.
- **Fixed the test-runner invocation in the TEA-authored package.json**
  - Spec source: tests/canonical-serve.test.mjs harness (package.json `test` script)
  - Spec text: TEA wrote `"test": "node --test tests/"`
  - Implementation: Changed to `"test": "node --test 'tests/**/*.test.mjs'"` (and the matching justfile recipe). Node v25.9.0 rejects the bare `tests/` directory form ("Cannot find module"); the glob form runs all 7 tests cleanly.
  - Rationale: The harness as written did not run via `npm test` on this Node; a non-runnable suite is not a real GREEN.
  - Severity: minor
  - Forward impact: none — same tests, correct invocation.

### Reviewer (audit)
Every TEA and Dev deviation is adjudicated below. All ACCEPTED.

- **TEA: AC3 tunnel wiring not auto-tested** → ✓ ACCEPTED by Reviewer: correct — a live-tunnel test would be machine-specific and flaky; the in-repo doc/port assertion plus a manual verification step is the honest split. The manual step is tracked as a blocking Delivery Finding.
- **TEA: AC4 clone removal not auto-tested** → ✓ ACCEPTED by Reviewer: correct — asserting on sibling `~/Projects` dirs would couple the suite to one machine's layout. The in-repo "no ad-hoc clone" doc test (test 7) is the right footprint; the filesystem action is a manual step (blocking Delivery Finding).
- **TEA: canonical command fixed to recipe name `serve`** → ✓ ACCEPTED by Reviewer: reasonable concrete contract matching the existing `dev-tempest`/`build-all` convention. Dev honoured it (recipe is named `serve`), so the narrowing introduced no drift.
- **Dev: operator-only ACs (AC3/AC4) deferred to manual action** → ✓ ACCEPTED by Reviewer: the right call. A Dev agent must NOT delete a developer's other checkouts or reconfigure their live tunnel unprompted — those are destructive, irreversible, out-of-repo operator decisions. Deferral with a loud blocking finding is correct; I reinforced it in my own findings and Devil's Advocate.
- **Dev: added scope (subrepos var, dev-lobby/build-lobby, test-orchestrator wired into ci)** → ✓ ACCEPTED by Reviewer: justified, not scope creep — a `serve` recipe that can't run (lobby uninstallable) would be worthless, and an unrun regression guard rots. [SIMPLE] check confirmed no over-engineering.
- **Dev: fixed test-runner glob in package.json (`node --test tests/` → `'tests/**/*.test.mjs'`)** → ✓ ACCEPTED by Reviewer: necessary — verified the bare-directory form fails on Node 25 while the glob runs all 7 cleanly. Note: the stale comment at test file line 10 still references the old form (logged as a non-blocking Improvement finding).

**No undocumented deviations found.** Every spec divergence in this diff was logged by TEA or Dev and is accounted for above.