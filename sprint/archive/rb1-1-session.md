---
story_id: "rb1-1"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story rb1-1: Subrepo bootstrap — Vite/TS/Vitest scaffold, pinned port 5277, base /red-baron/, wire @arcade/shared@v0.5.0 (math3d/rng/loop), register (repos.yaml + justfile serve + cloudflared ^/red-baron→:5277 + lobby tile)

## Story Details
- **ID:** rb1-1
- **Jira Key:** (none — Jira-less project, local sprint tracking only)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-08T23:50:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-08T22:49:14Z | 2026-07-08T22:51:31Z | 2m 17s |
| red | 2026-07-08T22:51:31Z | 2026-07-08T23:03:03Z | 11m 32s |
| green | 2026-07-08T23:03:03Z | 2026-07-08T23:14:53Z | 11m 50s |
| review | 2026-07-08T23:14:53Z | 2026-07-08T23:50:21Z | 35m 28s |
| finish | 2026-07-08T23:50:21Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The rb1-1 AC reads "green lobby tile" — copy-paste residue from the bz1-1 AC (battlezone's tile IS green). Red Baron's tile should be red-family; green is battlezone's identity colour. Affects `sprint/epic-rb1.yaml` (rb1-1 AC wording — reword to "red/distinct lobby tile"). Tests already enforce red-dominant + distinct-from-siblings. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The `@arcade/shared@v0.5.0` consumer pipe resolved cleanly under both vitest and `vite build` (6 modules bundled), confirming the reuse path for rb2–rb5.

### Reviewer (code review)
- **Improvement** (non-blocking): `red-baron/src/main.ts:8` uses the arcade-wide unchecked `as HTMLCanvasElement` cast. Affects every game's `src/main.ts` (codebase-wide convention) — if ever hardened, a guarded canvas-acquisition helper in `@arcade/shared` would fix all games at once; superseded here by rb1-3's real main.ts. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Lobby tile asserted red-dominant, not the AC's literal word "green"**
  - Spec source: context-story-rb1-1.md, AC "green lobby tile → /red-baron/"
  - Spec text: "justfile: red-baron added to games/subrepos vars AND the serve trap (→ http://localhost:5277/red-baron/); green lobby tile → /red-baron/"
  - Implementation: `tests/red-baron-bootstrap.test.mjs` asserts the red-baron tile colour is red-dominant (R > G and R > B) and distinct from all four sibling tile colours — not green.
  - Rationale: "green" is copy-paste residue from the bz1-1 AC (battlezone's tile IS green, `#00ff41`); reusing green would collide with battlezone's identity. "Red Baron" → a red-family tile is the faithful, non-colliding choice. The AC's intent is "a working, distinct lobby tile," which the test enforces.
  - Severity: minor
  - Forward impact: none (rb2–rb5 do not touch the lobby tile)

### Dev (implementation)
- **Corrected TEA test: signed-zero in the Math Box identity assertion**
  - Spec source: red-baron/tests/scaffold.test.ts (TEA red phase) — "resolves @arcade/shared/math3d to the real Math Box"
  - Spec text: "expect(m3d.rotationY(0)).toEqual([...m3d.IDENTITY])"
  - Implementation: wrapped both mat4 comparisons in a signed-zero normaliser (`v => v + 0`), so `rotationY(0)` (which yields `-0` at the `-sin(0)` slot) compares equal to IDENTITY.
  - Rationale: `-0` and `+0` are equal reals; the shared Math Box is correct — the assertion was bitwise-strict (Vitest `toEqual` distinguishes `-0`). Implementation code cannot fix a correct external dependency; the test was the defect.
  - Severity: trivial
  - Forward impact: none
- **Corrected TEA test: cloudflared sibling-port window bled into the next rule**
  - Spec source: tests/red-baron-bootstrap.test.mjs (TEA red phase) — "cloudflared routes /red-baron/* to :5277, ahead of the lobby catch-all"
  - Spec text: "const ruleWindow = cf.slice(rbIdx, rbIdx + 200); … assert.doesNotMatch(ruleWindow, /5270/ …)"
  - Implementation: narrowed the window to red-baron's OWN rule block (sliced up to the next `- hostname:`) before running the sibling-port guard.
  - Rationale: the 200-char window overran into the adjacent lobby catch-all rule (`:5270`), so the "no sibling port" guard tripped on a correctly-placed neighbour. The cloudflared rule itself is correct (`^/red-baron → :5277`, ahead of the catch-all). bz1-1's version never hit this because it only forbade one specific port (5275), not all siblings.
  - Severity: trivial
  - Forward impact: none — but the same window-bleed latency exists in `tests/battlezone-bootstrap.test.mjs`; harmless there (single-port check) but worth noting if that suite is ever broadened.

### Reviewer (audit)
- TEA "Lobby tile red-dominant, not green" → ✓ ACCEPTED: green (`#00ff41`) is battlezone's identity colour; a red-family, sibling-distinct tile is the faithful, non-colliding choice for "Red Baron". Sound.
- Dev "signed-zero in Math Box identity assertion" → ✓ ACCEPTED: `-0` and `+0` are equal reals; the shared module is correct; normaliser applied only to the actual value (verified sound by test-analyzer).
- Dev "cloudflared sibling-port window bled into next rule" → ✓ ACCEPTED: window narrowed to red-baron's own rule block; the ingress rule itself is correctly placed (`^/red-baron`→`:5277` ahead of the catch-all). Verified sound.
- Reviewer (this phase): tightened 3 vacuous contract assertions inline (port / allowedHosts / serve-launch) + strengthened the Math Box pipe check with a non-trivial operand (I·T(1,2,3)=T), per user direction to fix inline. Committed to red-baron `666a563`; the `tests/red-baron-bootstrap.test.mjs` change stays uncommitted with the other orchestrator edits. Green re-verified (20/20 + 27/27, build clean).

## Branch Strategy
**Branch Strategy:** Feature branch created on-demand after subrepo scaffold — this story initializes the `red-baron/` subrepo from scratch (local `git init -b develop`, NO GitHub remote), so branching happens as part of the scaffold work. No feature branch could be created at setup; work proceeds on `chore/rb1-1-subrepo-bootstrap` after repo initialization. Subsequent Red Baron stories follow standard `feat/{story}-{description}` on `develop` per subrepo convention. (Mirrors the bz1-1 bootstrap precedent.)

## Sm Assessment

**Story:** rb1-1 — subrepo bootstrap for the Red Baron (1980) clone. First story of epic `rb1`; creates the `red-baron/` gitignored subrepo (Vite/TS/Vitest, pinned port **5277**, base `/red-baron/`), wires `@arcade/shared` as the first native shared-lib consumer, registers the repo in `.pennyfarthing/repos.yaml`, and adds the lobby tile + cloudflared route. Design brief: `docs/superpowers/specs/2026-07-08-red-baron-design.md`.

**Workflow decision:** `tdd` (switched from the initial `trivial` estimate). Every scaffold + wiring invariant is directly assertable against file contents — port 5277 (strictPort), base `/red-baron/`, the `@arcade/shared` pin + import resolution, the repos.yaml entry shape, the justfile serve wiring, the lobby tile, and the cloudflared `^/red-baron`→`:5277` route. This mirrors bz1-1, which used `tdd` and caught real drift.

**Reuse posture (KEY — the departure from older games):** Red Baron **CONSUMES** `@arcade/shared`; it does NOT port `math3d` the way battlezone/star-wars did. Pin `github:slabgorb/arcade-shared#v0.5.0` (latest remote tag; carries math3d/rng/highscore/loop). The shared `/math3d` already provides the full 3D kit (`rotationX/Y/Z`, `viewMatrix`, `lookRotation`) that `rb1-3`'s flight camera will use — **this story only proves the dependency pipe**: a shared import resolves under `vite build` + `vitest`. (Note: this local `arcade-shared/` checkout is stale at v0.2.0; the pin resolves against the remote, not the local tree.)

**Bootstrap constraints (from bz1-1 precedent):**
- `red-baron/` does not exist yet — TEA/Dev create it via local `git init -b develop`. **NO GitHub remote, NO push** in this story (remote is user-owned, not gated here).
- Subrepo work → `chore/rb1-1-subrepo-bootstrap`. Orchestrator + lobby edits (repos.yaml, justfile, lobby tile, cloudflared) → **leave UNCOMMITTED for review**; commits happen at finish (orchestrator "commit only when asked").
- repos.yaml: register in the **star-wars entry shape, NO port key** (port authority = vite.config `strictPort` + cloudflared).
- Justfile star-wars-drift watch: add `red-baron` to the `games`/`subrepos` vars AND the serve trap; if sibling subrepos are missing from the vars, backfill and log a Delivery Finding (Improvement, non-blocking) — don't silently expand scope.
- Pinned ports 5270/5273/5274/5275/5276 may be bound by another live checkout — do NOT kill processes; skip the serve smoke, report it, defer runtime verification.

**Route:** → **TEA** (Imperator Furiosa), RED phase. Derive failing tests from the story-context ACs along two contracts: (1) a `red-baron`-internal scaffold contract (port 5277 not 5270/5273/5274/5275/5276, base `/red-baron/`, strictPort + allowedHosts on server AND preview, package.json scripts, TS strict, black-canvas index.html booting `src/main.ts`, a `@arcade/shared` import resolving); and (2) an orchestrator/lobby wiring contract (`.gitignore`, repos.yaml star-wars shape, justfile `games`/`subrepos`/`serve`, green lobby tile → `/red-baron/`, cloudflared `/red-baron/*` → `:5277` ahead of the lobby catch-all, `develop` default branch). Establish exact test paths in RED — don't guess ahead.

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** Bootstrap scaffold + orchestrator wiring are fully assertable against file contents (mirrors bz1-1's `tdd` bootstrap). Chore bypass declined.

**Test Files:**
- `red-baron/tests/scaffold.test.ts` — subrepo-internal scaffold contract (vitest, 20 tests): vite.config port 5277 + base `/red-baron/` + `strictPort`×2 + `allowedHosts` (arcade.slabgorb.com)×2 + no-sibling-port guard (5270/5273/5274/5275/5276); package.json scripts verbatim; tsconfig `strict`; index.html `<canvas>` booting `/src/main.ts`; and the **shared-consumer pipe** — `@arcade/shared` pinned at `#v0.5.0` + a live `import('@arcade/shared/math3d')` resolving to the real Math Box (`IDENTITY` len 16, `multiply`/`rotationY` identities).
- `tests/red-baron-bootstrap.test.mjs` — orchestrator/lobby wiring contract (node:test, 9 tests): `.gitignore /red-baron/`, repos.yaml star-wars shape (no port key), justfile `games`/`subrepos`/`serve` + existing-games regression guard, lobby `RED BARON` tile (red-dominant, distinct, `/red-baron/`), cloudflared `^/red-baron`→`:5277` ahead of the lobby catch-all, `red-baron/.git` develop branch.

**Tests Written:** 29 tests covering 7 ACs (two suites)
**Status:** RED — 26 failing, 3 legitimately green.

**RED verification (ran directly — `testing-runner` can't see the unregistered subrepo):**
- Subrepo (vitest): `Tests 18 failed | 2 passed (20)`. The 2 green are harness invariants TEA legitimately satisfied: the `test` script, and the absence of a local `src/core/math3d.ts` (Red Baron ports nothing).
- Orchestrator (node --test, red-baron file): `tests 9 | pass 1 | fail 8`. The 1 green is `red-baron/.git` + develop — satisfied by TEA's `git init -b develop` + skeleton commit (bootstrap reality, same as bz1-1).
- Full orchestrator suite: `tests 27 | pass 19 | fail 8` — the 8 fails are exactly the red-baron wiring tests; battlezone-bootstrap + canonical-serve stay green (no sibling regressions).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #8 test quality | self-check: every test has a meaningful assertion; no `let _ =`, no `assert(true)`, no vacuous `is*` | pass |
| #9 build-config (strict) | scaffold.test.ts "enables strict mode" asserts tsconfig `"strict": true` | failing (RED) |

**Rules checked:** #8 (test-quality, self-enforced) and #9 (strict build config, asserted). Rules #1–7, #10–12 target feature runtime code (flight sim/camera) that does not exist until `rb1-3` — out of scope for this scaffold story.
**Self-check:** 0 vacuous tests found.

**Bootstrap notes for Dev (GREEN):**
- Work on `chore/rb1-1-subrepo-bootstrap` (red-baron subrepo); orchestrator + lobby edits stay UNCOMMITTED for review (orchestrator "commit only when asked"). No GitHub remote / no push.
- Green the pipe: pin `"@arcade/shared": "github:slabgorb/arcade-shared#v0.5.0"` + `npm install`; add vite.config.ts (port 5277, base `/red-baron/`, `strictPort` + `allowedHosts` on server AND preview), tsconfig (strict), index.html (canvas + `/src/main.ts`), `src/main.ts`, full package.json scripts + vite/typescript devDeps.
- Wire the orchestrator: `.gitignore /red-baron/`, repos.yaml (star-wars shape, no port key), justfile `games`/`subrepos`/`serve` (+ echo line), lobby tile (`RED BARON`, red-dominant colour, `/red-baron/`), cloudflared `^/red-baron`→`:5277` ahead of the lobby catch-all.

**Handoff:** To Dev (The Word Burgers) for GREEN.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**

_red-baron subrepo — committed on `chore/rb1-1-subrepo-bootstrap` (local, NO remote):_
- `vite.config.ts` — port 5277, base `/red-baron/`, `strictPort` + `allowedHosts` on server + preview
- `tsconfig.json` — TS strict (mirrors siblings)
- `package.json` — full scripts + devDeps (vite/vitest/typescript/@types/node) + `@arcade/shared: github:slabgorb/arcade-shared#v0.5.0`
- `index.html` — black canvas booting `/src/main.ts`
- `src/main.ts` — scaffold entry: paints the canvas and imports `@arcade/shared/math3d` so the pipe bundles under `vite build`
- `tests/scaffold.test.ts` — two trivial test-assertion corrections (see Design Deviations → Dev)

_orchestrator — UNCOMMITTED, left for review (orchestrator "commit only when asked"):_
- `.gitignore` (`/red-baron/`), `.pennyfarthing/repos.yaml` (red-baron entry, star-wars shape, no port key), `justfile` (`games`/`subrepos` + serve echo/launch), `cloudflared/config.yml` (`^/red-baron → :5277` ahead of the lobby catch-all), `tests/red-baron-bootstrap.test.mjs` (TEA's wiring suite, uncommitted from red phase)

_lobby subrepo — UNCOMMITTED, left for review:_
- `src/core/registry.ts` — `RED BARON` tile (`#ff2b2b`, `/red-baron/`)

**Tests:** GREEN — red-baron scaffold **20/20**; orchestrator full suite **27/27** (red-baron-bootstrap **9/9**; battlezone + canonical-serve unaffected). `npm run build` clean (`tsc --noEmit` + `vite build`, 6 modules bundled incl. the shared Math Box).

**Branch:** `chore/rb1-1-subrepo-bootstrap` (red-baron, local — NOT pushed; no GitHub remote per bootstrap policy).

**AC coverage:** all 7 ACs green. The `@arcade/shared` consumer pipe is proven under both vitest and `vite build`. Orchestrator + lobby wiring is intentionally uncommitted — the finish flow commits it with user visibility.

**Handoff:** To next phase (verify/review) per the tdd workflow.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 47 tests green, build clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 high, 4 low/med | 3 confirmed + fixed inline; 3 noted; 1 dismissed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 2 low | 1 confirmed LOW (non-blocking); 1 informational |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations / 14 checks / 24 instances |

**All received:** Yes (4 enabled returned; 5 disabled via workflow.reviewer_subagents settings)
**Total findings:** 3 confirmed + resolved inline (test-quality), 1 confirmed LOW (non-blocking), 1 informational, 3 noted/dismissed

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `just serve` launches red-baron on :5277 → cloudflared `^/red-baron` routes to :5277 (ordered ahead of the lobby catch-all) → Vite base `/red-baron/` serves index.html → boots src/main.ts → `import { IDENTITY } from '@arcade/shared/math3d'` resolves via the pinned git-URL dep's exports map. Safe: no backend, no untrusted input, canvas-only render, allowedHosts scoped to arcade.slabgorb.com on both server + preview.

**Findings by specialist:**
- [TEST] test-analyzer flagged 3 high-confidence vacuous contract assertions (port count inflated by the config comment; allowedHosts count inflated by the comment; serve-recipe match satisfied by the echo line alone). CONFIRMED and FIXED INLINE this phase per user direction — anchored to `port:\s*5277`, the `allowedHosts: ['arcade.slabgorb.com']` entry shape, and the `(cd .../red-baron && npm run dev)` launch invocation; also strengthened the Math Box pipe check with a non-trivial operand (I·T(1,2,3)=T). Re-verified green (20/20 + 27/27, build clean). Low notes: hardcoded sibling tile colours (acceptable snapshot) and the I×I=I tautology (addressed) NOTED; the "assert HEAD==develop" suggestion DISMISSED — the story is intentionally on `chore/rb1-1-subrepo-bootstrap`, so HEAD is not develop; the AC only requires the develop branch to exist.
- [SEC] security flagged main.ts:8 `getElementById('game') as HTMLCanvasElement` (rule #1 nullable cast). CONFIRMED LOW (non-blocking), NOT dismissed: arcade-wide convention — byte-identical in tempest/star-wars/asteroids/battlezone src/main.ts, and red-baron's `if (ctx)` guard is stricter than siblings' `ctx!`; controlled HTML (#game always present); rb1-3 replaces this placeholder. Supply-chain note on the @arcade/shared git-tag dep: INFORMATIONAL — package-lock.json pins the commit SHA, `npm ci` installs by SHA, matches sibling convention.
- [RULE] rule-checker: CLEAN — 0 violations across all 14 checks / 24 instances, cross-checked against all 4 sibling games.
- [EDGE] [SILENT] [DOC] [TYPE] [SIMPLE] — disabled via workflow.reviewer_subagents settings; not spawned (rows pre-filled as Skipped).

**Pattern observed:** Faithful bz1-1 bootstrap mirror + the deliberate shared-consumer departure (consumes @arcade/shared@v0.5.0 rather than porting math3d) — red-baron/package.json:7, src/main.ts:6. Correct per design brief §3.

**Error handling:** src/main.ts guards the 2D context (`if (ctx)`) — stricter than the siblings' non-null assertion. No other failure surface in a scaffold.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

### Rule Compliance (typescript.md — 13 checks + 1 CLAUDE.md/design-brief rule)

Verified exhaustively by reviewer-rule-checker, cross-checked by me:
- #1 type-safety escapes: compliant — one single cast (main.ts:8), no `as any`/double-cast/`!`/ts-ignore (see [SEC] LOW note).
- #2 generics/interfaces: compliant — `Record<string, unknown>`/`Record<string,string>`, `readonly Game[]`, `readonly number[]`; no `any`/`object`/`Function`.
- #3 enums / #6 React-JSX: N/A (no enums, no .tsx).
- #4 null/undefined: compliant — `if (ctx)` guard; `?? {}` (not `||`) in tests.
- #5 modules: compliant — runtime-value imports only; no relative imports (bundler resolution); no ambient/reference directives.
- #7 async: compliant — `await import(...)` properly awaited.
- #8 test quality: compliant after inline hardening — meaningful, now non-vacuous assertions; no `as any`; external dep consumed via exports map (not own dist).
- #9 build/config: compliant — `strict: true`; skipLibCheck/sourcemap match sibling convention verbatim.
- #10 input validation: N/A — no untrusted input (tests read the repo's own package.json).
- #11 error handling: compliant — no try/catch to mis-handle.
- #12 perf/bundle: compliant — deep subpath import of `/math3d` (tree-shakeable), not a barrel import.
- #13 fix-regressions: N/A (first implementation of the story).
- +CLAUDE.md / design-brief §3 (consume @arcade/shared, don't port): compliant — no local math3d.ts; pinned dep + subpath import.

### Devil's Advocate

Assume this scaffold is broken — where does it fall over? (1) main.ts casts `getElementById('game')` to HTMLCanvasElement with no null check — if index.html ever drops or renames `#game`, the module throws a TypeError at import time and the game is a black void. Mitigation: index.html ships alongside and always carries `<canvas id="game">`; the pattern is arcade-wide; rb1-3 rewrites it. (2) The `@arcade/shared` dependency is a git tag, and GitHub tags are movable — a force-moved `v0.5.0` could swap the Math Box out from under every consumer. Mitigation: package-lock.json pins the resolved commit SHA; `npm ci` installs by SHA, so a moved tag can't silently change installed code without a deliberate lockfile regeneration. (3) The whole point of a bootstrap is regression-proofing the wiring — yet three assertions were vacuous, able to pass while `preview.port`, `allowedHosts`, or the serve-launch went missing. That was the real risk; it is now closed (assertions anchored to the actual config shapes, re-verified green). (4) Cross-checkout port collisions: if another `arcade` checkout already binds :5270-5276, `just serve` would fail — but strictPort makes that a loud, intentional failure, not silent port-wandering, which is the desired behaviour. (5) A developer editing the justfile could drop red-baron (or a sibling) from `games`/`subrepos` while leaving the serve trap — now caught by the regression-guard assertions requiring every existing game to remain in the vars. (6) Malicious input: there is no attack surface — no backend, no auth, no user input, no innerHTML/eval; canvas-only rendering not yet implemented. (7) A future arcade-shared tag could change the `/math3d` export map — the live import-resolution test catches that on the next install. Conclusion: the one material risk (vacuous contract tests) is eliminated; residual items are LOW/controlled. Nothing rises to Critical/High. Verdict stands: APPROVED.