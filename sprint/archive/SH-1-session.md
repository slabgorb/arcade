---
story_id: "SH-1"
jira_key: ""
epic: "SH"
workflow: "trivial"
---
# Story SH-1: Scaffold arcade-shared repo + @arcade/shared package (subpath exports, prepare->ESM+d.ts build) and prove the git-URL dependency pipe end-to-end

## Story Details
- **ID:** SH-1
- **Jira Key:** (none — local sprint only)
- **Workflow:** trivial
- **Stack Parent:** none
- **Type:** chore
- **Points:** 3
- **Epic:** SH — Shared arcade library — extract cross-repo duplication into @arcade/shared

## Story Summary

Stand up the shared-code home decided in ADR-0001. New independent repo `arcade-shared` (origin github.com/slabgorb/arcade-shared), package `@arcade/shared` with an `exports` subpath map and a `prepare` step that builds ESM + .d.ts via tsc. Register it in .pennyfarthing/repos.yaml as a sibling subrepo. Prove consumption: one game (battlezone) declares a pinned git-URL dep and imports a trivial shared export, with `vite build` + vitest green — validating that Vite consumes the dep before any real extraction lands.

## Acceptance Criteria

1. arcade-shared repo exists with package @arcade/shared, an exports subpath map, and a prepare build producing ESM + .d.ts.
2. Registered in .pennyfarthing/repos.yaml (default_branch develop, gitflow) as a gitignored sibling subrepo.
3. One consumer game installs the package via a pinned git-URL ref (github:slabgorb/arcade-shared#vX.Y.Z) and imports a real export; its vite build and vitest both pass.
4. The dev inner-loop path (npm link or a #branch ref) is documented in the shared repo README.

## Sm Assessment

**Verdict:** Ready for implement. Merge gate clear (no open PRs in any subrepo). Fresh story — no prior Architect-enriched context to preserve.

**State of play (not a greenfield repo):** `arcade-shared/` already exists, checked out on `develop` (gitflow, origin github.com/slabgorb/arcade-shared), holding only `.gitignore` + `README.md` (commit 572b09a "chore: initialize arcade-shared"). It's already registered in `.pennyfarthing/repos.yaml` (type library, default_branch develop, gitflow) — AC-2 is largely *verify*, not *create*. Work happens on branch `chore/SH-1-scaffold-arcade-shared-package` (already created off develop, inside `arcade-shared/`).

**What this story is — and isn't:** SH-1 lands the *pipe*, not any real shared code. Scope is: `package.json` (name `@arcade/shared`, `type: module`, an `exports` subpath map, a `prepare` script that runs `tsc` to emit ESM + `.d.ts`), a tsconfig, and ONE trivial real export to prove consumption. Real extractions (math3d, rng) are SH-2/SH-3 and gated by the eligibility bar — do not extract anything here. Keep the trivial export genuinely trivial (e.g. a version constant / noop) so the vector under test is the dependency plumbing, not the payload.

**Highest-risk AC (AC-3, the proof):** battlezone must consume the package via a *pinned git-URL ref* (`github:slabgorb/arcade-shared#vX.Y.Z`) and pass both `vite build` and `vitest`. Watch for:
- The ref must resolve on origin — arcade-shared needs to be pushed and (for `#vX.Y.Z`) tagged before battlezone can install it. The dev inner-loop (`npm link` or a `#branch` ref) is the documented escape hatch (AC-4) — that README note is not optional.
- Installing a git dep runs its `prepare` build on the consumer's `npm install`, so the package's build devDeps (typescript) must be declared as devDependencies, not just present locally.
- battlezone's own `develop` gets a new dependency line — that's an expected, in-scope change to a second repo, but keep it to the dependency + a single real import.

**Routing:** trivial workflow (phased: setup → implement → review → finish). Next owner: **dev (Julia)** for implement. Reviewer (Thought Police) after. Two repos in play at review time — arcade-shared (the package) and battlezone (the consumer proof).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**

_arcade-shared_ (branch `chore/SH-1-scaffold-arcade-shared-package`, commit `e61244f`, pushed; tag `v0.1.0` pushed):
- `package.json` — new: name `@arcade/shared`, `type: module`, `exports` subpath map (`.` → types+import, `./package.json`), `prepare`/`build` = `tsc -p tsconfig.build.json`, `files: ["dist"]`, `typescript` devDep.
- `tsconfig.build.json` — new: declaration + declarationMap + sourceMap, `outDir dist`, `rootDir src`, strict, ESNext/bundler.
- `src/index.ts` — new: single trivial `SHARED_VERSION = '0.1.0'` export (the consumer proof's payload).
- `package-lock.json` — new (typescript devDep only).
- `README.md` — status updated: scaffold landed, pipe proven, sample import.

_battlezone_ (branch `chore/SH-1-consume-arcade-shared`, commit `cfd9d8e`, pushed):
- `package.json` — added `dependencies: { "@arcade/shared": "github:slabgorb/arcade-shared#v0.1.0" }`.
- `package-lock.json` — resolved git dep (locked to tag commit `e61244f`).
- `src/main.ts` — one import + one retained use (`document.documentElement.dataset.arcadeShared = SHARED_VERSION`), so `vite build` resolves the dep in the app graph (verified present in the built bundle).
- `tests/arcade-shared-pipe.test.ts` — new: 2 cases asserting the dep resolves and the export imports at runtime.

**Acceptance Criteria:** 4/4 met
- AC-1 ✓ `@arcade/shared` package + `exports` subpath map + `prepare` build emitting ESM (`dist/index.js`) + `.d.ts` (`dist/index.d.ts`) — verified by local build.
- AC-2 ✓ Registered in `.pennyfarthing/repos.yaml` (default_branch develop, gitflow) and a gitignored sibling (`git check-ignore arcade-shared`).
- AC-3 ✓ battlezone installs the pinned git-URL ref, imports the real export; `tsc --noEmit && vite build` green (marker bundled) and full vitest suite green.
- AC-4 ✓ README "Dev inner loop" documents `#branch` ref / `npm link` → tag.

**Tests:** battlezone 731/731 passing (46 files, GREEN) incl. the new pipe test. arcade-shared has no suite yet (placeholder `test` script; harness lands SH-2 — logged as a Delivery Finding).
**Build:** battlezone `tsc --noEmit && vite build` clean (34 modules; `@arcade/shared` export confirmed in the production bundle).

**Branches (pushed, no PRs — SM opens PRs at finish):**
- arcade-shared → `chore/SH-1-scaffold-arcade-shared-package` (+ tag `v0.1.0`)
- battlezone → `chore/SH-1-consume-arcade-shared`

**Handoff:** To **review** (The Thought Police). Note for review: two repos + a pushed release tag; see the Design Deviation on the pre-merge `v0.1.0` tag and the reconcile-at-release Delivery Finding.

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-06T12:45:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-06T12:23:30Z | 2026-07-06T12:26:16Z | 2m 46s |
| implement | 2026-07-06T12:26:16Z | 2026-07-06T12:36:50Z | 10m 34s |
| review | 2026-07-06T12:36:50Z | 2026-07-06T12:45:12Z | 8m 22s |
| finish | 2026-07-06T12:45:12Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### Dev (implementation)
- **Improvement** (non-blocking): The `v0.1.0` release tag was cut on the arcade-shared feature-branch commit (`e61244f`) so battlezone could prove the git-URL pipe during this phase — before merge. npm resolves the tag regardless of branch membership, so the pin keeps working, but if arcade-shared **squash-merges**, `v0.1.0` will point at an orphaned commit. Affects `arcade-shared` tag `v0.1.0` (reconcile/re-cut onto the merged commit on `main` at release, per the README's "main holds tagged releases" convention) and `battlezone/package.json` (the pin can stay `#v0.1.0`). *Found by Dev during implementation.*
- **Question** (non-blocking): `arcade-shared` ships no test harness yet — `npm test` is a placeholder `echo`. This is intentional and already sequenced: the first real vitest suite lands with the math3d extraction in **SH-2**. Affects `arcade-shared/package.json` (swap the placeholder for `vitest run --passWithNoTests` when the harness is added). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `battlezone/package-lock.json` pins `@arcade/shared` via `git+ssh://git@github.com/slabgorb/arcade-shared.git#<sha>`, not HTTPS. arcade-shared is public, so HTTPS would install keyless; the SSH pin means any environment without a github SSH key (a future CI runner, a fresh keyless clone) fails `npm ci`. Works everywhere the arcade is actually used today (all game remotes are SSH on Keith's box). Affects `battlezone/package-lock.json` (if/when CI is added, either provision SSH or re-resolve the lock over HTTPS, e.g. `npm config set … url.https://github.com/.insteadOf` or pin the `git+https` form). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The prepared source maps ship a dangling `sources` reference. `dist/index.js.map` and `dist/index.d.ts.map` both point to `"../src/index.ts"`, but `files: ["dist"]` excludes `src/` from the packed git-dep (confirmed: consumer `node_modules/@arcade/shared` has no `src/`). Debuggers in a consumer can't resolve the original source. Affects `arcade-shared/tsconfig.build.json` / `package.json` (either add `src` to `files` to ship sources, or drop `declarationMap`/`sourceMap` for the published artifact). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `SHARED_VERSION = '0.1.0'` in `arcade-shared/src/index.ts` duplicates `package.json`'s `version` with no test binding them; a version bump can silently desync the runtime marker from the package/tag. Affects `arcade-shared` (when the SH-2 test harness lands, add a test asserting `SHARED_VERSION === pkg.version`, or derive the constant from the manifest). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (0 Gap, 0 Conflict, 1 Question, 2 Improvement)
**Blocking:** None

- **Question:** `arcade-shared` ships no test harness yet — `npm test` is a placeholder `echo`. This is intentional and already sequenced: the first real vitest suite lands with the math3d extraction in **SH-2**. Affects `arcade-shared/package.json`.
- **Improvement:** `battlezone/package-lock.json` pins `@arcade/shared` via `git+ssh://git@github.com/slabgorb/arcade-shared.git#<sha>`, not HTTPS. arcade-shared is public, so HTTPS would install keyless; the SSH pin means any environment without a github SSH key (a future CI runner, a fresh keyless clone) fails `npm ci`. Works everywhere the arcade is actually used today (all game remotes are SSH on Keith's box). Affects `battlezone/package-lock.json`.
- **Improvement:** `SHARED_VERSION = '0.1.0'` in `arcade-shared/src/index.ts` duplicates `package.json`'s `version` with no test binding them; a version bump can silently desync the runtime marker from the package/tag. Affects `arcade-shared`.

### Downstream Effects

Cross-module impact: 3 findings across 3 modules

- **`.`** — 1 finding
- **`arcade-shared`** — 1 finding
- **`battlezone`** — 1 finding

### Deviation Justifications

2 deviations

- **Release tag cut pre-merge on the feature branch**
  - Rationale: AC-3 requires proving a *pinned git-URL* install (`#vX.Y.Z`) with `vite build` + vitest green *during* the implement/review phase — but the merge to `main` only happens later in finish. A tag is durable across the feature branch's post-merge deletion (a `#branch` ref is not), so it is the honest pinned ref for this phase. AC-4's dev inner-loop covers the transition.
  - Severity: minor
  - Forward impact: minor — at release, reconcile `v0.1.0` onto the merged `main` commit (or re-cut) so the tag isn't orphaned by a squash-merge; see Delivery Findings.
- **`arcade-shared` `test` script is a placeholder, not the sibling `vitest` convention**
  - Rationale: SH-1 lands only the pipe; adding a vitest harness with zero source tests is scope the SM assessment explicitly warned off. SH-2 (math3d + ported tests) is the natural home for the harness.
  - Severity: trivial
  - Forward impact: trivial — SH-2 swaps in the real test command.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **Release tag cut pre-merge on the feature branch**
  - Spec source: arcade-shared/README.md, "Provenance"
  - Spec text: "main holds tagged releases that consumers pin to."
  - Implementation: Tagged `v0.1.0` at the feature-branch commit (`e61244f`) and pushed it, then pinned battlezone to `github:slabgorb/arcade-shared#v0.1.0`.
  - Rationale: AC-3 requires proving a *pinned git-URL* install (`#vX.Y.Z`) with `vite build` + vitest green *during* the implement/review phase — but the merge to `main` only happens later in finish. A tag is durable across the feature branch's post-merge deletion (a `#branch` ref is not), so it is the honest pinned ref for this phase. AC-4's dev inner-loop covers the transition.
  - Severity: minor
  - Forward impact: minor — at release, reconcile `v0.1.0` onto the merged `main` commit (or re-cut) so the tag isn't orphaned by a squash-merge; see Delivery Findings.
- **`arcade-shared` `test` script is a placeholder, not the sibling `vitest` convention**
  - Spec source: SM Assessment (this session), "keep it minimal"
  - Spec text: sibling games use `"test": "vitest run --passWithNoTests"`.
  - Implementation: `"test": "echo '(no tests yet — first suite lands in SH-2)' && exit 0"` — no vitest devDep added.
  - Rationale: SH-1 lands only the pipe; adding a vitest harness with zero source tests is scope the SM assessment explicitly warned off. SH-2 (math3d + ported tests) is the natural home for the harness.
  - Severity: trivial
  - Forward impact: trivial — SH-2 swaps in the real test command.

### Reviewer (audit)
- **Release tag cut pre-merge on the feature branch** → ✓ ACCEPTED by Reviewer: this is the honest, durable way to satisfy AC-3's *pinned* `#vX.Y.Z` install during the implement/review phase (a `#branch` ref would dangle when the feature branch is deleted at merge; a tag resolves by SHA regardless of branch membership). The squash-orphan risk is real but already captured as a non-blocking Delivery Finding for reconciliation at true release. Independently confirmed by preflight.
- **`arcade-shared` `test` script is a placeholder, not the sibling `vitest` convention** → ✓ ACCEPTED by Reviewer: SH-1 has zero source tests to run; a placeholder `exit 0` keeps any test-all loop green without adding a harness this story explicitly deferred to SH-2. `npm test` verified exit 0 by preflight.
- No undocumented deviations found. The two changes to a second repo (battlezone's dependency + single real import) are in-scope per the story ACs, not deviations.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings (2 non-blocking risks) | 2 | confirmed 2, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 3 | reviewer-silent-failure-hunter | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 4 | reviewer-test-analyzer | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 5 | reviewer-comment-analyzer | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 6 | reviewer-type-design | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 7 | reviewer-security | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 8 | reviewer-simplifier | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 9 | reviewer-rule-checker | No | Skipped — disabled | N/A | Disabled via settings (domain assessed by Reviewer) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents` — each domain assessed by the Reviewer directly below)
**Total findings:** 3 confirmed (all non-blocking, LOW/MED), 0 dismissed, 0 deferred. Preflight's 2 risks map onto findings already captured; the 3rd (version drift) is the Reviewer's own.

## Reviewer Assessment

**Verdict:** APPROVED

Scope is a two-repo scaffold: `@arcade/shared` gains a package (exports subpath map + `prepare`→ESM/`.d.ts` build) and a single trivial `SHARED_VERSION` export; `battlezone` consumes it at a pinned git-URL tag to prove the pipe. All 4 ACs are met and independently verified (build artifacts, production bundle, installed git-dep contents, full test suite). No Critical/High issues. Three non-blocking LOW/MED findings recorded for follow-up.

**Acceptance criteria (independently verified):**
- AC-1 ✓ `prepare` (tsc) emits `dist/index.js` (ESM) + `dist/index.d.ts`; `exports` is a real subpath map (`.` + `./package.json`). Preflight rebuilt clean.
- AC-2 ✓ `.pennyfarthing/repos.yaml` registers arcade-shared (default_branch develop, gitflow); `git check-ignore arcade-shared` confirms gitignored sibling.
- AC-3 ✓ battlezone pins `github:slabgorb/arcade-shared#v0.1.0`; `tsc --noEmit && vite build` green with the `@arcade/shared` marker **present in the production bundle** (`grep arcadeShared dist/assets/*.js`); vitest 731/731 green incl. the 2 new pipe cases. The installed dep is the real git clone (`node_modules/@arcade/shared` = post-`prepare` dist only).
- AC-4 ✓ README "Dev inner loop" documents `#branch` ref / `npm link` → tag.

**Data flow traced:** `SHARED_VERSION` (arcade-shared `src/index.ts`) → `prepare` tsc → `dist/index.js` → git-pack (`files: ["dist"]`) → battlezone `node_modules/@arcade/shared` → `import` in `src/main.ts` → `document.documentElement.dataset.arcadeShared` (retained side-effect, bundled by Vite) and → `tests/arcade-shared-pipe.test.ts` (runtime resolution under vitest). Safe: value is a hardcoded constant, no user input, no injection surface.

**Observations (tagged; disabled-subagent domains assessed directly):**
- `[VERIFIED]` Build/pipe integrity — evidence: `arcade-shared/package.json` uses `prepare` (correct hook for git-dep install, runs after devDep install so `tsc` is available) and `files: ["dist"]`; consumer `node_modules/@arcade/shared` contains exactly `dist/ + package.json + README` — the whitelist works.
- `[EDGE]` (Reviewer, edge-hunter disabled) Boundary paths are near-nil: one const, one import, one DOM side-effect. `document.documentElement` is always non-null in a browser; `main.ts` is never imported into the node/vitest env (suite is 731 green, so no import-time `document` crash). No unhandled path.
- `[SILENT]` (Reviewer, silent-failure disabled) No swallowed errors — no `try/catch`, no fallbacks; a broken dep would throw at import/collection and fail the suite loudly (this is exactly what makes the pipe test non-vacuous).
- `[TEST]` (Reviewer, test-analyzer disabled) The 2 pipe tests are non-vacuous: an unresolved dep throws at collection → red. `expect(SHARED_VERSION).toBe('0.1.0')` hard-couples to the pinned version (brittle on bump) — LOW, acceptable as an intentional pin; the second case covers shape. Deliberately importing the *packaged* export (not `src/`) is the point of a consumer pipe test, not a `dist/`-import smell.
- `[DOC]` (Reviewer, comment-analyzer disabled) Comments are accurate and match behavior; README status/import example updated correctly. No stale docs.
- `[TYPE]` (Reviewer, type-design disabled) No `as any`, no non-null assertions, no `Record<string,any>`, no stringly-typed API added. `SHARED_VERSION: string` assigned to `dataset` (string) — type-clean. ESM-only `exports` (no `require`/`default`) is intentional; every arcade consumer is `type: module`.
- `[SEC]` (Reviewer, security disabled) No secrets, no injection, no auth surface, no user input. The new dependency is a first-party public repo pinned to an immutable tag SHA — supply-chain surface is a self-owned pin, not a floating range.
- `[SIMPLE]` (Reviewer, simplifier disabled) Minimal and on-scope; no dead code or over-engineering. `SHARED_VERSION` duplicates `package.json` version (LOW drift risk, finding filed) — the only simplification worth noting, deferred to the SH-2 harness.
- `[RULE]` (Reviewer, rule-checker disabled) TypeScript lang-review checklist walked rule-by-rule below — no violations.

### Rule Compliance (TypeScript lang-review, all 13 checks vs the diff)
1. Type-safety escapes — PASS (no `as any` / `ts-ignore` / new `!`).
2. Generic/interface — PASS (no `Record<string,any>` / `object` / `Function`).
3. Enums — N/A (none).
4. Null/undefined — PASS (no `||`-vs-`??` hazard; `document.documentElement` non-null).
5. Module/declaration — PASS (`import { SHARED_VERSION }` is a runtime value, correctly not `import type`; bare package specifier needs no `.js`; `export const` value, no missing `export type`).
6. React/JSX — N/A.
7. Async/Promise — N/A (none).
8. Test quality — PASS (no `as any`; importing the packaged export is intentional for a consumer pipe test).
9. Build/config — PASS with note: `strict: true` ✓; `skipLibCheck: true` matches sibling convention (battlezone tsconfig) — acceptable; `sourceMap`/`declarationMap` enabled but `src` unshipped → dangling maps (LOW finding).
10. Input validation — N/A (no external input).
11. Error handling — N/A (no catch).
12. Performance/bundle — PASS (single-const barrel import tree-shakes cleanly; confirmed only the marker is in the bundle).
13. Fix regressions — N/A (no fixes applied this phase).

### Devil's Advocate
Assume this is broken. First attack: the pipe test is theater — it would pass even if `@arcade/shared` were vendored or stubbed. Refuted: the lockfile resolves the dep to `git+ssh://…#e61244f` and the installed tree is the post-`prepare` `dist/` from that clone; a missing/broken dep throws at import collection and reds the suite. Second: `vite build` "passes" without truly consuming the dep because an unused import gets tree-shaken before resolution. Refuted: the import feeds a retained DOM side-effect and `grep` finds `arcadeShared` + `0.1.0` in `dist/assets/*.js` — it is genuinely bundled. Third: the top-level `document.documentElement.dataset…` crashes headless/SSR/test contexts. Checked: `main.ts` is a browser entry never imported by the node-env suite (731 green), and `documentElement` is always present in a real DOM — no crash path. Fourth, the strongest: a stressed/foreign environment breaks the install. This is the one with teeth — `npm ci` against the committed lockfile needs github **SSH** access; a keyless CI runner or a collaborator without a github SSH key fails to install, even though the repo is public and HTTPS would work. Filed as a MEDIUM non-blocking finding; it doesn't block today because every place the arcade is actually built (Keith's workstation, all-SSH remotes) has the key, and severity rules put Medium below the blocking line. Fifth: a squash-merge orphans `v0.1.0`, silently breaking battlezone later. Checked: npm fetches tags by SHA irrespective of branch reachability, so the pin keeps resolving even if `e61244f` leaves the mainline; the reconcile-at-release step is documented. Sixth: version drift — someone bumps `package.json` to 0.2.0, forgets `index.ts`, and consumers read a stale marker. True but inert: the export is a diagnostic breadcrumb with no behavioral consumer yet; filed LOW with a concrete SH-2 test to bind them. Nothing here rises to Critical/High; the scaffold does exactly what AC-1..4 demand and the failure modes are either refuted or captured as non-blocking follow-ups.

**Handoff:** To SM (Winston Smith) for finish-story. Two repos to PR/merge (arcade-shared → develop; battlezone → develop) plus the `v0.1.0` tag reconcile noted in Delivery Findings.