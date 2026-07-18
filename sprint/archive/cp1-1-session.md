---
story_id: "cp1-1"
jira_key: "cp1-1"
epic: "cp1"
workflow: "tdd"
---
# Story cp1-1: Scaffold — Vite/TS/Vitest on port 5278 + core/shell purity guard + CI caller + orchestrator registration

## Story Details
- **ID:** cp1-1
- **Jira Key:** cp1-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T18:59:45Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T18:33:38.885664Z | 2026-07-18T18:36:37Z | 2m 58s |
| red | 2026-07-18T18:36:37Z | 2026-07-18T18:48:42Z | 12m 5s |
| green | 2026-07-18T18:48:42Z | 2026-07-18T18:54:54Z | 6m 12s |
| review | 2026-07-18T18:54:54Z | 2026-07-18T18:59:45Z | 4m 51s |
| finish | 2026-07-18T18:59:45Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The justfile `serve` recipe's announcement lines still print path-suffixed URLs (`http://localhost:5277/red-baron/`, `/tempest/`, …) although every subrepo now has `base: '/'` and serves at the root of its port (the CLAUDE.md port table already says so). Affects `justfile` (serve echo lines — cosmetic; GREEN's centipede echo should use the root form `http://localhost:5278/`, and the five stale sibling lines deserve a sweep). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): The full orchestrator suite carries 2 PRE-EXISTING failures in `tests/extract-audio.test.mjs` (lines 203 and 301 — the tempest `enemy_explosion` POKEY-bake register-stream mismatch), verified unrelated to cp1-1 by stash/re-run without this story's changes. Affects `tests/extract-audio.test.mjs` (needs its own story; do not mistake it for cp1-1 fallout when reviewing the orchestrator commit). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The purity scanner has three deliberate-evasion holes a determined (not accidental) author could use: `globalThis['document']`-style bracket-string access (strings are stripped before the global scan), dynamic `import('../shell/…')` (the shell-import rule is anchored on `from`), and `eval`/`new Function` indirection. Accidental violations — the actual threat model — are all caught (fixture-proven). Affects `centipede/tests/purity.test.ts` (cheap hardening for cp1-2, which already touches test infrastructure: ban `\bglobalThis\b`, `\bimport\s*\(`, and `\beval\s*\(`/`new Function` in core — a pure sim has no legitimate use for any of them). *Found by Reviewer during code review.*
- **Question** (non-blocking): `secrets: inherit` in the deploy caller only works if `slabgorb/centipede` actually inherits `CLOUDFLARE_API_TOKEN` (org-level secret for the six live repos, or it must be added per-repo). Affects `centipede/.github/workflows/deploy.yml` (no change to the file — cp6's release story must confirm the secret + create the `arcade-centipede` bucket before the first release). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): CLAUDE.md still describes centipede as "pre-implementation" in two places (the intro game list and the repo-structure tree) — half-stale once this story merges (scaffold exists; the game itself is still unimplemented). Affects `CLAUDE.md` (one-word touch-ups when a later cp story lands gameplay; the AC only governed the port row, which is now correct). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Purity guard strips comments and string literals instead of raw-text matching**
  - Spec source: context-story-cp1-1.md, Problem ("a source-text scan test forbidding shell globals and wall-clock … word test prose to avoid the comment-scanner trap (tempest purity scanner matches forbidden names INSIDE COMMENTS)")
  - Spec text: "word test prose to avoid the comment-scanner trap"
  - Implementation: `tests/purity.test.ts` scans comment-stripped, string-stripped source (shell-import rule keeps strings intact — import specifiers ARE strings), with fixture self-tests pinning both flag and no-flag behaviour; core prose may therefore mention any banned name freely.
  - Rationale: The story asks to dodge the trap by careful wording; stripping comments/strings removes the trap CLASS structurally (rb4-3's newest idiom) instead of relying on every future author's discipline. The fixture tests make the scanner's semantics themselves regression-guarded — my first cut flagged a URL inside a string literal and the lookalike fixture caught it, which is exactly the defect class raw-text matching ships.
  - Severity: minor
  - Forward impact: positive — cp2+ core stories can document shell interactions in comments without tripping the guard; AC-2's "demonstrably fails" stays provable via a live-code introduction (fixture-proven forever, plus the one-off red run Dev records in story notes).
- **allowedHosts not required in vite.config.ts (departure from the red-baron mirror)**
  - Spec source: context-story-cp1-1.md, Problem ("Mirror red-baron's config (the newest scaffold): Vite 8, TypeScript, Vitest 4, strictPort 5278, base '/'")
  - Spec text: "Mirror red-baron's config"
  - Implementation: `tests/scaffold.test.ts` pins the named invariants (port ×2, strictPort ×2, base '/', scripts, strict TS) but does NOT demand red-baron's `allowedHosts: ['arcade.slabgorb.com']` blocks.
  - Rationale: those allow-lists exist for the retired Cloudflare tunnel (CLAUDE.md: "the Cloudflare-tunnel routing that used to serve the arcade is retired"); production is R2 static hosting and dev is localhost. Pinning retired infrastructure into a brand-new scaffold would bake in dead config. Dev MAY still copy them harmlessly; the contract just doesn't require it.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Swept the five stale sibling serve-echo URLs while adding centipede's**
  - Spec source: context-story-cp1-1.md, AC-4 + session Delivery Finding (TEA, test design)
  - Spec text: "just serve launches centipede alongside the fleet" (the story letter touches only centipede's lines)
  - Implementation: The serve recipe's six existing echo lines changed from path-suffixed (`http://localhost:5273/tempest/`) to root-form (`http://localhost:5273/`) alongside the new centipede line; launch lines untouched except the centipede addition.
  - Rationale: Implements TEA's logged non-blocking finding in the same recipe block the story already edits — every subrepo has `base: '/'`, so the suffixed URLs 404-shaped lies the CLAUDE.md port table already corrects. No test pins the sibling echo text (verified: canonical-serve.test.mjs asserts launch mechanics, not echo URLs).
  - Severity: trivial
  - Forward impact: none

### Reviewer (audit)
- TEA "Purity guard strips comments and string literals instead of raw-text matching" → ✓ ACCEPTED by Reviewer: the structural fix removes the recurring tempest trap class instead of relying on prose discipline; the fixture self-tests make the scanner's semantics regression-guarded, and the RED-time catch of the URL-in-string false positive proves the fixtures earn their keep. The residual deliberate-evasion holes are logged as a non-blocking Improvement finding — they do not weaken the accidental-violation guarantee the AC demands.
- TEA "allowedHosts not required in vite.config.ts" → ✓ ACCEPTED by Reviewer: CLAUDE.md states the Cloudflare-tunnel routing is retired; requiring `allowedHosts: ['arcade.slabgorb.com']` in a brand-new scaffold would pin dead infrastructure. The story's named invariants (Vite 8, Vitest 4, strictPort 5278, base '/') are all pinned. Dev's config consistently omits it — no drift between test contract and implementation.
- Dev "Swept the five stale sibling serve-echo URLs while adding centipede's" → ✓ ACCEPTED by Reviewer: implements TEA's logged finding in the same recipe block the story edits; verified no test pins the sibling echo text (canonical-serve.test.mjs asserts launch mechanics only, confirmed by reading its assertions), and the root-form URLs now match both `base: '/'` reality and the CLAUDE.md port table.

## Sm Assessment

**Setup verified:** session file created, feature branch `chore/cp1-1-scaffold-vite-purity-ci` checked out in centipede off develop, story/epic context files generated, sprint YAML flipped to in_progress. Merge gate clear (no open centipede PRs); no sibling-checkout race — origin logs for both orchestrator and centipede show no cp1-1 activity.

**Story shape:** 2pt chore, but the epic YAML explicitly tags `workflow: tdd`, so the tdd fallback default does not apply — phased tdd it is. Repo field is `centipede`, but note AC-4 touches the ORCHESTRATOR repo too (justfile serve/install lists, CLAUDE.md port table row 5278 reserved→live); orchestrator is trunk-based, commits go straight to its `main`.

**Hazards routed to TEA (O'Brien):**
- Centipede has NO scaffold — no package.json, no src/. RED phase tests must be authored against the to-be-created structure; mirror red-baron's config (newest scaffold: Vite 8, Vitest 4, strictPort 5278, base '/').
- Purity guard is a SOURCE-TEXT scan (tempest precedent): it matches forbidden names inside comments too. Test prose and core skeleton comments must not spell out the forbidden globals, or the guard eats its own tail.
- AC-2 requires a demonstrated red run (temporary forbidden global in src/core/) recorded in story notes.
- CI caller: ten-line reusable-workflow caller of slabgorb/arcade/.github/workflows/deploy-r2.yml@main, bucket arcade-centipede; lint-clean only, no release this story.

**Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Every scaffold + wiring invariant is directly assertable against file contents (rb1-1/bz1-1 precedent: `tdd` bootstrap caught real drift). The story's headline AC IS a test (the purity guard). Chore bypass declined.

**Test Files:**
- `centipede/tests/scaffold.test.ts` — subrepo-internal scaffold contract (vitest, 25 tests): vite.config port 5278 assignments ×2 + `strictPort: true` ×2 + base `/` + no-sibling-port guard (5270/5273/5274/5275/5276/5277); package.json scripts verbatim from the sibling games; Vite 8 / Vitest 4 resolved in node_modules (honest check, SH2-18 lesson); tsconfig `"strict": true`; index.html `<canvas>` booting `/src/main.ts`; src/main.ts + src/core/ + src/shell/ skeletons non-empty; CI caller `.github/workflows/deploy.yml` → `uses: slabgorb/arcade/.github/workflows/deploy-r2.yml@main`, `bucket: arcade-centipede`, `secrets: inherit`, on push to main only, never a sibling bucket.
- `centipede/tests/purity.test.ts` — the core/shell boundary guard (7 tests): a comment- and string-stripping scanner banning wall-clock/entropy (`Date.now`/`new Date`/`performance.now`/`Math.random`), scheduling (`setTimeout`/`setInterval`/`requestAnimationFrame`), browser globals (`window`/`document`/`navigator`/storage/`fetch`/`addEventListener`), render/audio types (canvas/context/AudioContext incl. vendor variants), and any `from '../shell` import in src/core/**; 6 fixture self-tests pin scanner semantics (flags live code, ignores comments/strings/lookalikes); a teeth test fails while src/core/ is empty; an `it.each` sweep binds every core module the moment it lands.
- `tests/centipede-bootstrap.test.mjs` (ORCHESTRATOR repo, node:test, 5 tests, **deliberately uncommitted** — see notes): justfile `games` + `subrepos` include centipede without regressing the five existing games; `serve` recipe launches `{{root}}/centipede && npm run dev` and announces `localhost:5278`; CLAUDE.md port row 5278 is live (`http://localhost:5278/`), not "reserved".

**Tests Written:** 37 tests covering 4 ACs (two suites, the rb1-1 split: subrepo tests never reach up into the orchestrator — a standalone clone must pass)
**Status:** RED — centipede 18 failed | 14 passed (32); orchestrator file 4 failed | 1 passed (5).

**RED verification:** testing-runner (RUN_ID cp1-1-tea-red) confirms centipede RED: all 18 failures are the missing scaffold (vite.config.ts, tsconfig.json, index.html, src/main.ts, src/core/, src/shell/, deploy.yml) + the purity teeth test. The 14 greens are legitimate: 8 package.json harness invariants (TEA-authored so the suite can run at all on the pre-scaffold tree — rb1-1 precedent) + 6 scanner fixture self-tests. Orchestrator file run directly (`node --test tests/centipede-bootstrap.test.mjs`): 4 fail (justfile games/subrepos/serve, CLAUDE.md row), 1 legitimate green (existing-games regression guard — true today, must stay true).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #8 test quality | self-check: every test asserts meaningfully; no `let _ =`, no vacuous truths; scanner semantics fixture-pinned (a real scanner defect — URL-in-string false positive — was caught by the lookalike fixture during RED authoring and fixed) | pass |
| #9 build config (strict) | scaffold.test.ts "enables strict mode" asserts tsconfig `"strict": true` | failing (RED) |

**Rules checked:** #8 (test quality, self-enforced) and #9 (strict build config, asserted). Rules #1–7 and #10+ target feature runtime code that does not exist until cp1-3+ — out of scope for this scaffold story.
**Self-check:** 0 vacuous tests found (the one scanner defect found was in the scanner, not the assertions, and is now fixture-pinned).

**Notes for Dev (Julia) — GREEN:**
- Work on `chore/cp1-1-scaffold-vite-purity-ci` (centipede, off develop; RED committed as `6663759`). PR targets `develop`.
- Green the subrepo: vite.config.ts (port 5278 + strictPort on BOTH server and preview, base '/', vitest `test` block — mirror red-baron/vite.config.ts minus the retired-tunnel `allowedHosts`, see deviation), tsconfig.json (copy red-baron's), index.html (black canvas + `/src/main.ts`), src/main.ts + src/core/ + src/shell/ skeletons (≥1 .ts each; do NOT put banned names in core code — comments are safe, the scanner strips them), `.github/workflows/deploy.yml` (copy red-baron's, bucket arcade-centipede).
- AC-2's proof: after green, temporarily introduce a forbidden global in a src/core module, run the purity suite, record the red output in the story notes, revert. The fixture self-tests already prove the mechanism permanently.
- Orchestrator side (trunk-based, commits to its `main`): justfile `games` + `subrepos` + serve recipe (echo line: use root URL `http://localhost:5278/`, see Delivery Finding on the stale sibling echoes), CLAUDE.md port row 5278 → live. **`tests/centipede-bootstrap.test.mjs` is in the working tree but UNCOMMITTED** — commit it TOGETHER with the justfile/CLAUDE.md flips (committing it alone would put a red test on orchestrator main and break sibling checkouts' `npm test`).
- AC-3 is config-only: workflow-lint clean, NO release cut (the arcade-centipede bucket is cp6's problem; `just release-all`/`deploy` will now include centipede via `subrepos` — that is the story's declared intent, and the deploy of an unreleased repo is user-initiated, not CI-triggered).

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `centipede/vite.config.ts` — port 5278 + strictPort on server AND preview, base '/', vitest node env; comments deliberately name no sibling pin (the scaffold suite forbids their numbers anywhere in the file)
- `centipede/tsconfig.json` — red-baron's strict config verbatim
- `centipede/index.html` — black full-viewport `<canvas id="game">` booting `/src/main.ts`
- `centipede/src/core/sim.ts` — pure step-contract skeleton (`SimState`/`createSim`/`stepSim`), deliberately constant-free per the epic's radix discipline (cp1-2's citation gate precedes any transcribed ROM value)
- `centipede/src/shell/render.ts` — canvas painter consuming core state (one-way boundary)
- `centipede/src/main.ts` — boot loop wiring core → shell → screen (typed `querySelector<HTMLCanvasElement>`, no unchecked cast — the rb1-1 reviewer note)
- `centipede/.github/workflows/deploy.yml` — ten-line caller of `slabgorb/arcade/.github/workflows/deploy-r2.yml@main`, bucket `arcade-centipede`, `secrets: inherit`, push-to-main only
- `justfile` (orchestrator) — `games`/`subrepos` gain centipede; serve recipe launches it; echo lines swept to root-form URLs (see deviation)
- `CLAUDE.md` (orchestrator) — port row 5278 flipped reserved → live
- `tests/centipede-bootstrap.test.mjs` (orchestrator) — TEA's wiring suite, committed together with the flips so orchestrator main never carried a red test

**Tests:** centipede 33/33 GREEN (testing-runner RUN_ID cp1-1-dev-green; build `tsc --noEmit && vite build` clean). Orchestrator: centipede-bootstrap 5/5; full suite 226/228 — the 2 fails are PRE-EXISTING `extract-audio` tempest reds, proven unrelated by stash/re-run (see Delivery Finding).
**Branch:** `chore/cp1-1-scaffold-vite-purity-ci` (pushed, `d32897f`); orchestrator commit `af14285` on local main, **deliberately NOT pushed** — the justfile now tells `install-all` to enter `centipede/`, which only has a package.json on this feature branch, so pushing before the PR merges would break sibling checkouts' `just install-all`. SM should push orchestrator main at finish, AFTER the merge.

**AC walkthrough:**
- AC-1: `npm install && npm run build && npm test` green from the fresh tree; dev server answered HTTP 200 on 5278 and a second `npm run dev` failed loudly (strictPort) instead of drifting ports — both spot-checked live, port confirmed unclaimed by sibling checkouts first (lsof).
- AC-2: purity guard passes green (33/33) and demonstrably fails on introduction — temporary `Date.now() + Math.random()` in src/core/sim.ts produced `core/sim.ts crosses the core/shell boundary via: Date.now(), Math.random()`, then reverted (red run recorded in the RED→GREEN commit message and here).
- AC-3: deploy.yml committed, mirrors red-baron's shipped caller byte-for-shape (only name/bucket differ — that caller is already lint-proven in CI); no release cut, bucket creation stays cp6's.
- AC-4: justfile lists + serve + install-all (via `subrepos`) cover centipede; CLAUDE.md row live; all five wiring tests green.

**Handoff:** To the Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (33/33 tests, build+lint clean, 0 smells, orchestrator wiring 5/5, 3 expected local commits) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned clean; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed (all mine, all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** browser resize event → `resize()` sets `canvas.width/height` from client dims → next rAF tick: `stepSim` advances the frame counter (pure, input-free for now) → `render(ctx, sim)` clears the full canvas. Safe because the only external inputs (canvas element, 2d context) are null-checked with loud throws at boot (`src/main.ts:11-14`), and core receives nothing from the browser at all.

**Pattern observed:** the one-way core/shell boundary is real, not aspirational — `src/shell/render.ts:7` imports `type { SimState }` from core; nothing under `src/core/` imports anything (verified: `sim.ts` has zero imports), and the sweep in `tests/purity.test.ts` binds every future core module via `it.each` the moment it lands.

**Error handling:** boot failures throw with actionable messages (`src/main.ts:12` "index.html must host a <canvas id=\"game\">"); `strictPort: true` on both server and preview (`vite.config.ts:13-21`) makes port collisions fail loudly — behaviorally spot-checked by Dev (second `npm run dev` errored instead of drifting).

### Observations (≥5, tagged)

1. `[VERIFIED]` CI caller matches the reusable-workflow contract — `deploy-r2.yml` declares exactly one required input `bucket` (string) and one required secret `CLOUDFLARE_API_TOKEN`; the caller passes `bucket: arcade-centipede` and `secrets: inherit` (`centipede/.github/workflows/deploy.yml:12-13`). Node 22 in CI (`deploy-r2.yml` setup-node) covers the purity test's node-20+ `readdirSync recursive`. Complies with the CLAUDE.md release/deploy convention (push-to-main-only trigger, develop never deploys — asserted by `tests/scaffold.test.ts`).
2. `[VERIFIED]` Purity guard catches the AC's threat model with evidence — the temporary-corruption run produced `core/sim.ts crosses the core/shell boundary via: Date.now(), Math.random()` (recorded in Dev Assessment + GREEN commit message), and six fixture self-tests pin flag/no-flag semantics permanently (`tests/purity.test.ts:84-120`).
3. `[MEDIUM]` Purity scanner deliberate-evasion holes (`globalThis['…']` bracket access, dynamic `import('../shell/…')`, `eval`/`new Function`) at `tests/purity.test.ts:44-76` — non-blocking: accidents are covered, deliberate evasion is outside the AC's threat model, and the rb4-3 precedent explicitly frames these scanners as tripwires, not proofs. Hardening routed to cp1-2 via Delivery Finding.
4. `[VERIFIED]` No sibling port pin can leak into the config — `tests/scaffold.test.ts` forbids all six sibling numbers anywhere in `vite.config.ts`, and Dev's config comments deliberately name none (checked: the file contains only 5278).
5. `[VERIFIED]` Type discipline holds under `strict` — no `as any`, no `@ts-ignore`, no non-null `!`; the only casts are the sibling-idiom `as Record<…>` on `JSON.parse` results in tests; `SimState.frame` is `readonly`; `import type` used for the type-only import (`render.ts:7`). `npm run lint` (tsc --noEmit over src+tests) clean.
6. `[LOW]` CLAUDE.md's two "pre-implementation" mentions go half-stale on merge — logged as non-blocking Delivery Finding; the AC governed only the port row, which is correct.
7. `[LOW]` AC-3's "workflow-lints clean": actionlint is not installed locally; evidence is byte-shape identity with the six production-proven sibling callers plus the verified reusable-workflow input/secret contract. GitHub's parser re-validates at first push; the CI run itself is gated on tests+build before any upload.

### Rule Compliance (lang-review/typescript.md vs the diff)

| Rule | Instances checked | Judgment |
|------|-------------------|----------|
| #1 type-safety escapes | every `.ts` in diff: no `as any`/`@ts-ignore`/`!`; test-file `as Record<…>` casts on parsed JSON (sibling idiom, typed narrowly) | compliant |
| #2 generics/interfaces | `Record<string, unknown>` (not `any`) in tests; `readonly frame` on the one new interface | compliant |
| #3 enums | none in diff | N/A |
| #4 null/undefined | `?? []` on regex match results (nullable, correct operator); querySelector + getContext null-checked; no `\|\|`-on-falsy-valid bugs | compliant |
| #5 module/declaration | `import type` for type-only import; bundler resolution (no `.js` suffix requirement); no ambient declarations | compliant |
| #6 React/JSX | no .tsx | N/A |
| #7 async/promises | no async code in src; no floating promises | compliant |
| #8 test quality | all assertions meaningful; fixture self-tests assert both directions; teeth test prevents vacuous-empty-sweep | compliant |
| #9 build config | `"strict": true` + noUnusedLocals; lint = tsc over src AND tests | compliant |

### Devil's Advocate

Suppose this scaffold is subtly broken. The nastiest candidate: the purity guard is the story's entire security posture for the epic, and I helped design it — reviewer capture. So attack it. Could a future core module read the wall clock without tripping the sweep? Writing `Date.now()` trips. Aliasing — `const d = Date; d.now()` — the regex wants `Date.now(`; `d.now()` evades! But `Date` itself appears… `const d = Date` has no dot-call; `\bnew\s+Date\s*\(` misses it too. So aliasing IS a fourth evasion. Does it break the AC? No — the AC demands "demonstrably fails when a forbidden global is introduced", proven for the direct forms an author writes by accident; aliasing a global to dodge a linter is deliberate sabotage, and the PR reviewer sees `= Date` in a pure sim. Still, I fold it into the cp1-2 hardening finding (ban bare `\bDate\b` in core? No — that would false-positive type annotations… ban `=\s*Date\b` assignment? cp1-2 can weigh it). What else? The rAF loop steps the sim once per DISPLAY frame — on a 120Hz monitor the skeleton sim runs 2× the 60Hz intent. True, and disclosed in main.ts's header: the authentic timebase is deliberately deferred behind cp1-2's citation gate; nothing observable depends on frame counts yet (render ignores state). Deploy risk: a push to centipede main today would run CI — build passes, tests pass, upload to a NONEXISTENT bucket fails, CI red, nothing served, nothing corrupted; and pushes to main only happen via release, which this story doesn't cut. Orchestrator risk: `af14285` sits unpushed on local main; if a sibling checkout lands orchestrator commits first, SM's finish push may need a rebase — mechanical, and the sprint-YAML union-conflict rule is known. The `just serve` recipe now cds into centipede in checkouts that haven't pulled the feature branch — but the recipe only reaches sibling checkouts via the SAME push that carries the justfile, whose install prerequisite (`just install-all`) is documented. I find no Critical or High.

**Rule Compliance summary:** 9/9 applicable rules checked across every file in the diff — no violations.
**Deviation audit:** 3 entries (2 TEA, 1 Dev), all stamped ✓ ACCEPTED with rationale; no undocumented deviations found (the "ten-line caller" is ten config lines + three comment lines — spirit met).
**Merge safety:** branch is 2 commits ahead of `origin/develop` with no divergence (fresh repo, no concurrent stories); trial-merge unnecessary — develop HEAD equals the branch's fork point (verified via fetch + `git log origin/develop..` shape).

**Handoff:** To Winston Smith (SM) for finish-story. SM must: create the PR (base develop), obtain the user's merge authorization (finish-merge human-approval gate), merge, THEN push orchestrator main (`af14285` + siblings) — pushing the orchestrator before the centipede merge breaks sibling `just install-all` (see Dev Assessment).