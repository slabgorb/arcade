---
story_id: "td1-9"
jira_key: "td1-9"
epic: "td1"
workflow: "tdd"
---
# Story td1-9: Four repos carry no scaffold suite at all

## Story Details
- **ID:** td1-9
- **Jira Key:** td1-9
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T17:53:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T17:21:31Z | 2026-07-27T17:23:56Z | 2m 25s |
| red | 2026-07-27T17:23:56Z | 2026-07-27T17:41:09Z | 17m 13s |
| green | 2026-07-27T17:41:09Z | 2026-07-27T17:45:02Z | 3m 53s |
| review | 2026-07-27T17:45:02Z | 2026-07-27T17:53:27Z | 8m 25s |
| finish | 2026-07-27T17:53:27Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): This is a guard-BACKFILL, not red→green TDD — td1-1 already
  made all four `vite.config.ts` correct (host on BOTH blocks, port, strictPort, base '/'), so
  the new suites are GREEN against the existing configs and there is **no implementation for the
  GREEN phase to write**. RED was demonstrated per-assertion via MUTATION (AC-2), documented in
  the TEA Assessment. Dev's GREEN phase is verification-only: confirm all four builds
  (`npm run build`) and standalone test runs stay green (AC-3). *Found by TEA during test design.*
- **Gap** (non-blocking): The `vite.config.ts` COMMENTS in lobby, star-wars and asteroids
  reference sibling ports by number (lobby: "tempest owns 5273"; star-wars: "next to tempest's
  5273"; asteroids: "next to tempest's 5273 and star-wars' 5274"). Any future guard using a
  file-wide `not.toContain('<siblingPort>')` collision check would go spuriously RED against the
  correct config. Affects the four `vite.config.ts` files (comment prose is a decoy for
  occurrence-based tests — anchor to blocks). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. Confirmed TEA's characterization: guard-backfill,
  verification-only — 4/4 `npm run build` green, standalone suites green, zero code changes.

### Reviewer (code review)
- **Improvement** (non-blocking): the host assertion matches the literal single-quoted
  `"host: '127.0.0.1'"`, whereas the base assertion is quote-agnostic (`/base:\s*['"]\/['"]/`).
  A future sweep could make host quote-agnostic for robustness. Affects the four
  `tests/scaffold.test.ts` (harmless today — all four configs use single quotes, enforced by
  formatting). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): tempest's `package.json` `lint` script is a stub
  (`echo "no linting configured…"`) while star-wars/asteroids use `tsc --noEmit` — pre-existing
  fleet lint-consistency tech debt, NOT introduced by this branch and out of scope for td1-9.
  Affects `tempest/package.json` (candidate for a future td-series lint-parity story).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Omitted the reference implementation's file-wide sibling-port collision guard**
  - Spec source: context-story-td1-9.md, "REFERENCE IMPLEMENTATION" ("Port that shape")
  - Spec text: battlezone/red-baron/centipede/joust each carry `not.toContain('<siblingPort>')` over the whole config file.
  - Implementation: did NOT port that assertion; the port is guarded positively and block-anchored instead (`block(cfg,'server')`/`block(cfg,'preview')` must contain `port: <N>`).
  - Rationale: lobby/star-wars/asteroids configs mention sibling ports in their COMMENTS, so a file-wide `not.toContain('5273')` goes spuriously RED against the correct config (comment-decoy trap — same failure shape td1-7 warned about). A copy-pasted wrong config is already caught: the positive block assertion fails when the server/preview block carries the wrong port.
  - Severity: minor
  - Forward impact: none — port collisions remain guarded, positively rather than by exclusion.
- **Block-anchored port and strictPort too, not just host**
  - Spec source: context-story-td1-9.md, "REFERENCE IMPLEMENTATION" + AC-1
  - Spec text: reference uses `count(cfg, ...) >= 2` for port/strictPort and block-anchors only host; AC-1 says "strictPort on both blocks".
  - Implementation: every server/preview assertion (port, strictPort, host) uses the `block()` helper, not a bare count.
  - Rationale: strictly stronger and immune to the exact both-in-server/preview-bare trap for all three fields, not only host; "on both blocks" is proven directly rather than inferred from a total count. Mutation-checked (server-only and preview-only cases both observed RED).
  - Severity: minor (improvement over reference)
  - Forward impact: none.
- **Did not assert allowedHosts / tunnel config**
  - Spec source: context-story-td1-9.md, AC-1 ("at minimum ... port, base, strictPort, host") + SCOPE NOTE
  - Spec text: "allowedHosts/tunnel config is not uniform across them, so expect per-repo variation."
  - Implementation: asserted only the AC-1 minimum (port, base, strictPort, host); left allowedHosts unguarded. (Observed: all four actually DO carry `allowedHosts: ['arcade.slabgorb.com']` on both blocks today, but that is outside the stated minimum and the scope note flags it as variable.)
  - Rationale: stay within the AC-stated minimum and avoid coupling the guard to tunnel config the story itself calls non-uniform/variable.
  - Severity: minor
  - Forward impact: none — allowedHosts remains untested; a future story may add it if the tunnel contract is made uniform.

### Dev (implementation)
- No deviations from spec. No implementation was required — this is a guard-backfill over
  already-correct configs (td1-1). The GREEN phase was verification-only; no code was written,
  so there was nothing to deviate.

### Reviewer (audit)
- **TEA — Omitted the reference's file-wide sibling-port collision guard** → ✓ ACCEPTED by
  Reviewer: verified the decoy is real — lobby/star-wars/asteroids configs name sibling ports in
  their comments, so a file-wide `not.toContain('5273')` would falsely redden the correct config;
  the positive block-anchored port assertion (mutation-proven, both blocks) already catches a
  copy-pasted wrong port. Sound call.
- **TEA — Block-anchored port and strictPort too, not just host** → ✓ ACCEPTED by Reviewer:
  strictly stronger than the reference `count>=2`; rule-checker independently reproduced the
  td1-7 trap and confirmed the block anchoring catches it. Directly satisfies AC-1 "on both blocks."
- **TEA — Did not assert allowedHosts / tunnel config** → ✓ ACCEPTED by Reviewer: AC-1 says "at
  minimum" and the SCOPE NOTE flags allowedHosts as non-uniform/variable; staying within the
  stated minimum is correct. Recorded as a non-blocking future option in Delivery Findings.
- **Dev — No deviations (verification-only)** → ✓ ACCEPTED by Reviewer: confirmed zero source
  changes (`git diff develop...HEAD` is the four new test files only); nothing to deviate.
- No UNDOCUMENTED deviations found: the diff is test-only and matches the AC scope exactly.

## Sm Assessment

**Setup complete.** 3pt phased TDD story spanning FOUR subrepos: `lobby`, `tempest`,
`star-wars`, `asteroids`. Feature branch `feat/td1-9-scaffold-suite-four-repos` cut off
`develop` in each; session + context files created; epic-td1 → in_progress.

**What this story delivers:** a `tests/scaffold.test.ts` in each of the four repos — none
currently has one. All four carry the `host: '127.0.0.1'` pin in vite.config.ts (td1-1) but
nothing tests it, so a future edit could delete the pin and stay green (the exact td1-1
regression: strictPort alone lets vite fall through to the IPv6 twin `[::1]` and serve the
wrong checkout silently).

**Handoff to TEA (RED phase) — the load-bearing test-design lesson:**
- Port the idiom from an existing td1-7 suite (battlezone / red-baron / centipede / joust each
  has `tests/scaffold.test.ts`). Read one first.
- **Anchor on BLOCK MEMBERSHIP, not occurrence count.** td1-7 proved by execution that a bare
  `count(cfg, "host: '127.0.0.1'") >= 2` is defeated by moving BOTH pins into the `server`
  block and leaving `preview` bare — count stays 2, suite stays green, under a test literally
  named "on both server and preview". Assert host is inside the `server` block AND inside the
  `preview` block. Mutation-check every assertion, including that both-in-server case.
- Per-repo pinned ports to assert: lobby 5270, tempest 5273, star-wars 5274, asteroids 5275.
  Also assert `base: '/'` and `strictPort`.
- **Expect per-repo variation, not a four-way copy** — the lobby has NO lint script, and
  allowedHosts/tunnel config is not uniform across the four. This differs more than the td1-7
  three did.
- Each repo has its own remote/history; branches target `develop`; one PR per repo at finish.

**Next:** Han Solo (TEA) writes the four failing scaffold suites.

## TEA Assessment

**Tests Required:** Yes
**Phase:** finish (test design)

**Test Files:** (one new file per repo, 5 tests each)
- `lobby/tests/scaffold.test.ts` — vite.config.ts dev/preview contract, port 5270
- `tempest/tests/scaffold.test.ts` — same contract, port 5273
- `star-wars/tests/scaffold.test.ts` — same contract, port 5274
- `asteroids/tests/scaffold.test.ts` — same contract, port 5275

**Tests Written:** 20 tests (4 repos × 5) covering AC-1 (port, base '/', strictPort on both
blocks, host 127.0.0.1 on both blocks).

**Status:** GREEN against the existing (already-correct) configs — this story is a guard
**backfill**, not red→green TDD. td1-1 already made all four configs correct, so there is
nothing for the GREEN phase to implement. RED was proven per-assertion by MUTATION (AC-2).

### The nature of this story (read before GREEN phase)
All four `vite.config.ts` already pin host/port/strictPort on both blocks and base '/'. A guard
test over correct code passes immediately; that is expected and correct. The meaningful proof
that these guards are not vacuous is the mutation evidence below. **Dev's GREEN phase is
verification-only** (AC-3): run `npm run build` and the standalone test suite in each of the four
repos; expect no code changes.

### Mutation-check evidence (AC-2) — 4 repos × 8 cases = 32 REDs, every config restored clean
Each case broke one invariant, ran `npx vitest run scaffold`, observed RED, then restored via
`git checkout -- vite.config.ts` (verified `git diff` empty after every case, in all four repos):

| Case | Mutation | Result (all 4 repos) |
|------|----------|----------------------|
| base != / | `base: '/'` → `'/x/'` | RED ✓ |
| server port wrong | first `port: N` → 9999 | RED ✓ |
| preview port wrong | last `port: N` → 9999 | RED ✓ |
| server strictPort gone | remove first `strictPort: true` | RED ✓ |
| preview strictPort gone | remove last `strictPort: true` | RED ✓ |
| server host gone | remove first `host: '127.0.0.1'` | RED ✓ |
| preview host gone | remove last `host: '127.0.0.1'` | RED ✓ |
| **TRAP** (the case a bare count misses) | both host pins into `server`, `preview` bare — file-wide count stays **2** | RED ✓ |

TRAP failure message (lobby, representative): `preview block must pin host 127.0.0.1: expected
'preview: {\n    port: 5270,\n    stri…' to contain 'host: '127.0.0.1''` — the `block(cfg,'preview')`
assertion firing while `grep -c "host: '127.0.0.1'"` = 2. This is exactly the both-in-server /
preview-bare case td1-7 proved a `count(...) >= 2` check passes; block-anchoring catches it.

### Rule Coverage (lang-review/typescript.md)
| Rule | Coverage | Status |
|------|----------|--------|
| #8 test quality (meaningful assertions, no `as any`) | every test uses `toContain`/`toMatch`/`toBe` on real config text; no `as any`, no vacuous assertions | pass |
| #5 module (`.js` extension on relative imports) | N/A — only `node:*` + `vitest` imports, no relative imports | pass |
| #1 type-safety escapes | `block()` returns `?.[0] ?? ''` (no `!` non-null assertion) | pass |

**Self-check:** 0 vacuous tests — all 20 assertions mutation-proven to fail when their invariant breaks.

**Baseline (full suite, all green with the new file — for the Reviewer):**
- lobby: 9 files / 80 tests · tempest: 150 files / 1747 tests · star-wars: 184 files / 1926 tests · asteroids: 45 files / 831 tests. No pre-existing failures.

**Committed (NOT pushed — SM owns push/PR):** `feat/td1-9-scaffold-suite-four-repos` in each repo —
lobby 3e0eeaf, tempest 29f3efe, star-wars 7e329fc, asteroids 0dbdaad.

**Handoff:** To Dev (Yoda) for GREEN — build + standalone verification across the four repos; no
implementation expected.

## Dev Assessment

**Implementation Complete:** Yes — verification-only. As TEA flagged, this is a guard-BACKFILL:
td1-1 already made all four `vite.config.ts` correct, so the scaffold suites are green against the
existing configs and **no code was written**. My GREEN work was to verify AC-3 (builds + standalone
stay green).

**Files Changed (by Dev):** none. The four `tests/scaffold.test.ts` files were authored and
committed by TEA in the RED phase.

**Verification (AC-3):**
- `npm run build` (`tsc --noEmit && vite build`) — GREEN in all four repos (exit 0). This is the
  real check here: it confirms the new test files typecheck under `tsc` (vitest's esbuild does not
  full-typecheck). lobby ✓ · tempest ✓ · star-wars ✓ · asteroids ✓.
- scaffold suite — 5/5 GREEN in each repo (fresh run).
- Standalone — satisfied by construction: each suite reads only its OWN repo's `vite.config.ts`
  via a path relative to the test file; builds/tests ran from inside each repo, no orchestrator reach.
- Full-suite baseline (TEA, unchanged — Dev made zero source edits): lobby 80 · tempest 1747 ·
  star-wars 1926 · asteroids 831, all green, no pre-existing failures.

**Tests:** 20/20 scaffold tests passing (4 repos × 5). GREEN.

**Branch:** `feat/td1-9-scaffold-suite-four-repos` — committed by TEA, **pushed** by Dev in all four
repos (lobby 3e0eeaf, tempest 29f3efe, star-wars 7e329fc, asteroids 0dbdaad). No PR (SM creates +
merges one PR per repo at finish).

**Self-review:** trees clean · no debug code · correct branch · all ACs met (AC-1 assertions present
& block-anchored, AC-2 mutation-proven by TEA, AC-3 builds+standalone green).

**Handoff:** To Reviewer (Obi-Wan) for code review — four near-identical guard suites; the review
question is assertion correctness (block-anchoring vs occurrence-count) and standalone-safety, not
behavior.

## Subagent Results

Enabled subagents (via `workflow.reviewer_subagents`): `preflight`, `rule_checker`. The other
seven are disabled by settings and pre-filled Skipped; I covered their dimensions myself (see
Rule Compliance + Devil's Advocate).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all 4 repos: vitest 5/5, build PASS, no smells; assertions verified non-vacuous |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (test-quality covered by rule-checker #8 + my own read) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (no security surface — see [SEC] below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (duplication assessed below — justified by standalone AC) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 15 rules / 48 instances | N/A — clean; independently reproduced the td1-7 trap |

**All received:** Yes (2 enabled returned, both clean; 7 disabled)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 non-blocking LOW observations of my own (below)

## Reviewer Assessment

**Verdict:** APPROVED

Four near-identical, test-only `tests/scaffold.test.ts` guard suites (5 tests each) backfilling the
vite.config.ts dev/preview contract that td1-1 landed but nothing tested. Both enabled specialists
returned clean; my adversarial read concurs. No Critical/High. Proportionate for a 3pt guard-backfill.

**Observations (≥5):**
- `[VERIFIED]` **Block-membership anchoring** on all three server/preview assertions (port,
  strictPort, host) in all four files — evidence: `lobby/tests/scaffold.test.ts:59-72` (and the
  mirrored 136-149 / 213-226 / 288-301) call `block(cfg,'server')`/`block(cfg,'preview')`, not a
  file-wide count. Satisfies the project-specific block-anchoring rule (AC-1 "on both blocks").
- `[RULE]` rule-checker: **0 violations across 15 rules / 48 instances**, and it *empirically*
  reproduced the td1-7 trap on lobby (host moved out of `preview`, file-wide count kept ≥2) and
  confirmed the `block()` assertion goes RED — the assertions are not vacuous.
- `[VERIFIED]` **Standalone** (AC-3) — each suite reads only its own repo via
  `join(dirname(fileURLToPath(import.meta.url)), '..')` (`lobby:34-38`); no absolute or
  parent-escaping path, no orchestrator reach. rule-checker rule #15 confirmed all four.
- `[VERIFIED]` **Builds green** — `tsc --noEmit && vite build` PASS in all four (the real typecheck
  of the new `.ts`; vitest's esbuild does not full-typecheck); `strict: true` confirmed in all four
  `tsconfig.json`. Complies with lang-review #1/#9.
- `[VERIFIED]` **No smells** — grep across the four files: no `.only`/`.skip`/`console`/`as any`/
  `as unknown`/`@ts-ignore`/non-null `!`; `block()` uses `?.[0] ?? ''` (safe, lang-review #1/#4).
  Correct per-repo port (5270/5273/5274/5275) and repo-name in each `existsSync` message — no
  copy-paste error. Only the `block` helper is defined (no dead `count` helper).
- `[LOW]` **Substring port match** — `toContain('port: 527x')` (`lobby:60`) would falsely pass on a
  hypothetical `port: 52700`. Implausible (all fleet ports are 4-digit 527x) and mutation-proven
  against realistic wrong-port values. Non-blocking.
- `[LOW]` **`block()` regex assumes no nested braces** in server/preview (`${key}:\s*{[^}]*}`,
  `lobby:36`) — true today (allowedHosts uses `[]`), documented in-file, and rule-checker confirmed
  tempest/star-wars's `build.rollupOptions` nested braces don't interfere. Latent fragility only if
  a future config nests an object inside server/preview. Non-blocking.
- `[EDGE]` / `[SILENT]` / `[TEST]` / `[DOC]` / `[TYPE]` / `[SEC]` / `[SIMPLE]` — subagents disabled
  by settings; assessed by me: **[TEST]** assertions meaningful + mutation-proven (lang-review #8);
  **[SEC]** no security surface — pure synchronous fs reads of a repo-local file, no user input, no
  `JSON.parse`, no secrets, no network; **[SIMPLE]** the four-way duplication is intentional and
  correct — the standalone AC forbids sharing a helper across repos or via the orchestrator, so a
  per-repo copy is the only compliant shape; **[DOC]** headers accurately cite td1-1/td1-7 and the
  IPv6-twin rationale, and flag the nested-brace caveat; **[EDGE]/[SILENT]** a missing/unreadable
  config throws ENOENT → standard test failure, and the `exists` test fails first with a clear
  message; **[TYPE]** no types beyond `'server'|'preview'` literal union (correct).

### Rule Compliance (lang-review/typescript.md + project rules)
Enumerated every applicable rule against all four files (corroborated by rule-checker's exhaustive pass):
- **#1 type-safety escapes** — 4/4 compliant (`block()` uses `?.[0] ?? ''`; no `!`/`as any`/`@ts-ignore`).
- **#4 null/undefined** — 4/4 compliant (`?? ''`, not `||`, after optional-chained `.match()`).
- **#5 module** — 4/4 compliant (only `vitest` + `node:*` value imports; no relative imports, so `.js`-extension rule not triggered).
- **#8 test quality** — 20/20 tests compliant: real assertions with custom messages, no `as any`, no mocks, no `dist/` imports, no `.only`/`.skip`; mutation-proven non-vacuous.
- **#9 build/config** — no config files modified; `strict: true` present in all four; `tsc --noEmit` clean.
- **Project rule — block-anchoring (not file-wide count)** — 12/12 assertions (3 × 4 repos) compliant.
- **Project rule — standalone** — 4/4 compliant (own-repo-relative reads only).
- **#2, #3, #6, #7, #10, #11, #12, #13** — not applicable (no generics/enums/JSX/async/user-input/try-catch/hot-path/fix-diff in a test-only fs-read change).

### Devil's Advocate
Assume this is broken. The most damning line of attack: these tests are GREEN the moment they land,
because td1-1 already made every config correct — so are they theatre? No. TEA mutation-proved all
32 cases (4 repos × 8), and the rule-checker *independently* reproduced the exact td1-7 trap and
watched the block assertion go RED. A guard that has been shown to fail when its invariant breaks is
the opposite of vacuous. Second attack: a confused developer refactors a config and the guard misses
it. The block-anchored host/port/strictPort catch the load-bearing case (both pins in `server`,
`preview` bare) that a naive count misses — the whole reason this story exists. Third: brittleness.
The host assertion is coupled to single-quote style (`host: '127.0.0.1'`); a repo that switched to
double quotes would redden even with a correct pin. Real, but harmless — all four configs use single
quotes under enforced formatting, and a false-red is loud and trivially fixed (far safer than a
false-green). I logged it as a non-blocking Improvement. Fourth: the `block()` regex assumes
server/preview never nest `{}`; a future `server: { fs: { allow: [...] } }` would truncate the block
and could mask a missing pin. Today it's false (allowedHosts uses `[]`), it's documented in-file, and
tempest/star-wars's `build.rollupOptions` nested braces were shown not to interfere. Latent, LOW,
worth a comment — which it has. Fifth: the substring `toContain('port: 527x')` could false-pass on
`52700`; implausible in a 4-digit-port fleet and mutation-proven against realistic values. Sixth:
what breaks under a stressed filesystem? `readFileSync` throws ENOENT → a normal, loud test failure,
and the `exists` test fires first with a custom message. Nothing here fails silently, corrupts data,
or hides a regression. The attacks surface only LOW, non-blocking brittleness — no Critical/High.

**Data flow traced:** test reads its own repo's `vite.config.ts` (repo-relative path) → `block()`
isolates the server/preview block text → `toContain`/`toMatch` assert the pinned invariant. No
external input, no writes, no network — purely a static read of a committed, repo-local file.

**Pattern observed:** per-repo standalone guard suite mirroring the td1-7 idiom (`block()` helper),
correctly scoped to the vite contract — `lobby/tests/scaffold.test.ts:36`.

**Error handling:** N/A for assertions; a missing/unreadable config surfaces as a loud test
failure (ENOENT / `exists` assertion), never a silent pass.

**Deviations:** all TEA/Dev deviations audited and ACCEPTED (see `### Reviewer (audit)`); no
undocumented deviations.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.