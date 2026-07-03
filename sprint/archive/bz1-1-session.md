---
story_id: "bz1-1"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-1: Subrepo bootstrap: Vite/TS/Vitest scaffold, pinned port 5276, math3d port, repos.yaml + lobby tile

## Story Details
- **ID:** bz1-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Story Type:** chore
- **Points:** 2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T11:23:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T10:15:27Z | 2026-07-03T10:18:04Z | 2m 37s |
| red | 2026-07-03T10:18:04Z | 2026-07-03T10:35:27Z | 17m 23s |
| green | 2026-07-03T10:35:27Z | 2026-07-03T10:58:33Z | 23m 6s |
| review | 2026-07-03T10:58:33Z | 2026-07-03T11:23:38Z | 25m 5s |
| finish | 2026-07-03T11:23:38Z | - | - |

## Branch Strategy
**Branch Strategy:** Feature branch created on-demand after subrepo scaffold — this story initializes the `battlezone/` subrepo from scratch, so branching happens as part of the scaffold work (after repo initialization). Once battlezone/ exists and is registered in repos.yaml, subsequent stories will follow standard `feat/{story}-{description}` naming on the `develop` branch per game subrepo convention.

## Sm Assessment

**Story:** bz1-1 — Subrepo bootstrap for the Battlezone (1980) clone. First story of epic bz1; creates the `battlezone/` gitignored subrepo (Vite/TS/Vitest, pinned port 5276, `/battlezone/` base), ports math3d from star-wars, registers the repo in `.pennyfarthing/repos.yaml`, and adds the lobby tile.

**Workflow decision:** Epic was tagged `superpowers`, which is not an installed workflow. Per user direction, all 12 bz1 stories were retagged to `tdd` via `pf sprint story update`. TDD fits: the math3d port and scaffold config (strictPort 5276, base path) are directly testable.

**Setup notes:**
- Session created by sm-setup; story context pre-exists at `sprint/context/context-story-bz1-1.md` and `sprint/context/context-epic-bz1.md` — agents should read both.
- **Branch wrinkle:** `battlezone/` does not exist yet — this story creates it. No feature branch could be created at setup; the scaffold work initializes the repo (default branch `develop`), then work proceeds on `chore/bz1-1-subrepo-bootstrap`.
- No Jira — local YAML tracking only; claim/transition steps skipped intentionally.

**Execution mode:** Peloton (team `peloton-bz1-1`). SM is team lead and controls sequencing via SendMessage; teammates (tea, dev, reviewer) are persistent, gate themselves with resolve-gate/complete-phase, and report back to SM instead of relaying.

**Route:** → tea (RED phase). TEA should derive failing tests from the story context ACs — math3d module behavior and scaffold invariants (port pinning, base path, vitest wiring).

**SM decisions (peloton Q&A, answered for Dev pre-GREEN):**
1. **Justfile star-wars drift:** YES — reconcile, don't copy forward. Add `battlezone` to the `games`/`subrepos` vars AND the serve trap, and backfill `star-wars` into the vars so `install-all`/`build-all`/`test-all` stop silently skipping it. Log the star-wars backfill as a Delivery Finding (Improvement, non-blocking) — it's an upstream gap this story fixes in passing, not silent scope creep. No broader justfile refactoring.
2. **Test locations:** defined by TEA's RED phase — the GREEN dispatch will include TEA's actual test paths and failing output. Do not guess ahead. Dev's heads-up noted: the orchestrator `just test-orchestrator` canonical-serve contract guard may trip on serve-recipe edits; TEA/Dev should account for it.
3. **GitHub remote for battlezone:** NO remote, NO push in this story. `git init` local only, default branch `develop`, work on `chore/bz1-1-subrepo-bootstrap`. Remote creation is user-owned and explicitly not gated on this story (per epic context). Finish flow will handle merge locally.
4. **repos.yaml port field (TEA Question, answered):** CONFIRMED — TEA's reading is correct. Register battlezone in the exact star-wars entry shape with NO port key; repos.yaml is not the port authority. The 5276 pin is enforced by `battlezone/vite.config.ts` (strictPort) and `cloudflared/config.yml`. Matching sibling shape beats inventing a new field.
5. **cloudflared/README.md routing row (TEA Improvement, accepted):** Dev adds the `/battlezone/*` → `:5276` row to the README routing table while touching config.yml — cheap, prevents known doc drift, already logged as a Delivery Finding. Not test-gated; keep it loud, not silent.
6. **Git hygiene for GREEN:** battlezone → commit on `chore/bz1-1-subrepo-bootstrap`. Orchestrator + lobby edits → leave UNCOMMITTED in the working tree for review; commits happen at finish with user visibility (orchestrator policy is "commit only when asked"; TEA's test commit `5a05091` on main is already in — noted, don't extend the pattern). If pinned ports (5270/5273/…) are already bound by another live checkout, do NOT kill any process — skip the serve smoke, report it, and defer runtime verification to TEA's verify phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Not a chore bypass — the math3d port is directly testable (star-wars's two suites ARE the port spec) and every scaffold invariant (port 5276, `/battlezone/` base, strictPort, repos.yaml/justfile/lobby/cloudflared wiring) is assertable against file contents. Only the pure gameplay code is out of scope (bz1-3+).

**Test Files:**
- `battlezone/tests/core/math3d.test.ts` — ported verbatim from star-wars; the Math Box unit spec (7 tests)
- `battlezone/tests/core/math3d.camera-mvp.test.ts` — ported verbatim; scaling/viewMatrix/MVP pipeline spec (16 tests)
- `battlezone/tests/scaffold.test.ts` — battlezone-internal scaffold contract: port 5276 (NOT 5270/5273/5274/5275), base `/battlezone/`, strictPort + allowedHosts on server AND preview, verbatim package.json scripts, TS strict, black-canvas index.html booting `src/main.ts`, math3d.ts provenance header (21 tests)
- `tests/battlezone-bootstrap.test.mjs` — orchestrator/lobby wiring contract (node:test): `.gitignore`, repos.yaml (star-wars entry shape), justfile `games`/`subrepos`/`serve` incl. the star-wars backfill (SM decision #1), green lobby tile → `/battlezone/`, cloudflared `/battlezone/*` → `:5276` ahead of the lobby catch-all (never 5275), develop branch (10 tests)

**Tests Written:** 54 tests (44 battlezone vitest + 10 orchestrator node:test) covering all 7 ACs.
> Note: 23 of the 44 battlezone tests (the two math3d suites) currently fail at *collection* (`Cannot find module '../../src/core/math3d'`) — they register as individual passing tests only once Dev ports `math3d.ts` in GREEN. The battlezone `npm test` count therefore jumps 21 → 44 at GREEN.

**Status:** RED (failing — ready for Dev)

**RED evidence (actual output):**
- `cd battlezone && npm test` → `Test Files 3 failed (3)`, `Tests 19 failed | 2 passed` (exit 1). math3d suites: `Cannot find module '../../src/core/math3d'`. scaffold: 19 red on absent vite.config/tsconfig/index.html/math3d.ts + missing scripts; 2 green are the skeleton invariants I legitimately satisfied (`test` script + devDeps).
- (orchestrator root) `npm test` → `tests 17 | pass 9 | fail 8` (exit 1). All 8 battlezone-bootstrap ACs red; the 1 green is the `develop`-branch guard (satisfied by `git init -b develop`); the pre-existing 7 canonical-serve tests remain green (unaffected). Running `battlezone-bootstrap.test.mjs` alone: `tests 10 | pass 1 | fail 9`.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #9 build-config (strict not disabled) | scaffold.test `enables strict mode` | failing (RED) |
| #8 test quality (meaningful assertions) | all suites — self-checked | pass (self-check) |
| #1/#8 no `as any` in tests | tests cast only parsed config to typed shapes | pass (self-check) |

**Rules checked:** 3 of 3 applicable. The rest of the TS checklist (enum patterns, null/undefined, async/promises, React/JSX, error handling, input validation) is N/A — bz1-1 is a config-scaffold + pure-math *port* chore with no runtime branching, enums, async, or JSX.
**Self-check:** 0 vacuous tests found (every test asserts a specific value; no `let _ =`, no `assert(true)`, no always-null checks).

**Handoff:** To Dev (Walter) for implementation (GREEN).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): star-wars is silently skipped by the justfile game recipes — `games := "tempest"` and `subrepos := "lobby tempest"` both omit it; it's wired only in the hardcoded `serve` trap, so `install-all`/`build-all`/`test-all` never touch star-wars. Affects `justfile` (backfill star-wars into both vars, per SM decision #1; enforced by the `reconcile` test in `tests/battlezone-bootstrap.test.mjs`). *Found by TEA during test design.*
- **Question** (non-blocking): `.pennyfarthing/repos.yaml` carries no port field in the star-wars entry shape, yet AC #5 says register battlezone "with port 5276." I register battlezone WITHOUT a port key (to match the shape) and enforce the 5276 pin against `battlezone/vite.config.ts` + `cloudflared/config.yml` instead. Affects `.pennyfarthing/repos.yaml` (confirm no port key is expected in the entry). *Found by TEA during test design.*
- **Improvement** (non-blocking): `cloudflared/README.md`'s routing table lists tempest/star-wars/lobby and will drift — AC #7 names only `config.yml`, so my tests don't gate the README. Suggest Dev add the `/battlezone/* → :5276` row to keep the doc in sync. Affects `cloudflared/README.md`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the justfile silently skipped `star-wars` in its game recipes — `games := "tempest"` and `subrepos := "lobby tempest"` both omitted it, so `install-all`/`build-all`/`test-all` never touched star-wars (it ran only in the hardcoded `serve` trap). Fixed in passing per SM decision #1: backfilled `star-wars` into BOTH vars alongside `battlezone`. Affects `justfile` (`games`/`subrepos` now `"tempest star-wars battlezone"` / `"lobby tempest star-wars battlezone"`). Enforced by the `reconcile` test in `tests/battlezone-bootstrap.test.mjs`. *Found by TEA, fixed by Dev during implementation.*
- **Improvement** (non-blocking): `cloudflared/README.md` routing-table drift closed — added the `/battlezone/* → :5276` row (SM decision #5). Affects `cloudflared/README.md`. *Resolved by Dev during implementation.*
- **Gap** (non-blocking): battlezone's own scaffold test (`tests/scaffold.test.ts`) imports `node:fs`/`node:url`/`node:path`, but the star-wars-shape toolchain ships no node typings, so `tsc --noEmit` (the `build`/`lint` steps, which typecheck `tests/`) can't resolve them. Resolved here by adding `@types/node` + `"node"` to the tsconfig `types` array — a necessary divergence from the star-wars scaffold (logged as a deviation). Affects `battlezone/package.json`, `battlezone/tsconfig.json`. Sibling games with file-reading tests will hit the same. *Found by Dev during implementation.*

### TEA (test verification)
- **Gap** (non-blocking, AC-relevant): AC #1 requires "a black canvas with **no console errors**", but a live browser load of `http://localhost:5276/battlezone/` emits one console error — `Failed to load resource: the server responded with a status of 404 (Not Found) @ /favicon.ico`. `index.html` ships no `<link rel="icon">`, so Chrome auto-requests `/favicon.ico` → 404. The sibling games avoid this: star-wars links `/favicon.png` and ships the file, which also suppresses the auto `.ico` request. Dev's server-log smoke was clean because this is a *browser* request, not a server error. One-line fix: add a favicon link — ship a green favicon, or suppress the request with `<link rel="icon" href="data:,">`. Affects `battlezone/index.html`. Recommend fixing before finish (or an explicit accept of the nit). *Found by TEA during test verification (live browser on :5276).*
- **Note** (non-blocking): the lobby-tile edit (`lobby/src/core/registry.ts`, tile `#00ff41`) is UNCOMMITTED in the **lobby subrepo** (its own git history) — it will NOT ride along on the battlezone feature branch or an orchestrator commit. Whoever finishes must commit it inside the lobby repo. Affects `lobby/src/core/registry.ts`. *Found by TEA during test verification.*

### Reviewer (code review)
- **Improvement** (non-blocking): `src/main.ts:9` uses `canvas.getContext('2d')!` — a non-null assertion on a value typed `CanvasRenderingContext2D | null` (lang-review TS check #1). Confirmed by rule-checker. LOW severity: it is the fleet-wide sibling boot idiom (byte-identical in `star-wars/src/main.ts` and `tempest/src/main.ts`), the canvas is guaranteed present (`index.html` ships `<canvas id="game">`), and if it were ever null the next line throws immediately (loud fail-fast at boot, not silent corruption). Affects `battlezone/src/main.ts` (and, if ever hardened, the star-wars/tempest siblings too — do it fleet-wide, not just battlezone). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the scaffold config assertions in `battlezone/tests/scaffold.test.ts` (port `>=2`, `strictPort: true` `>=2`, `allowedHosts` `>=2` at lines 39/55/60) are whole-file substring tallies, not scoped to the `server{}`/`preview{}` blocks — they'd pass a config with one correct field + a stray match, and would break under a legitimate DRY refactor that spreads shared settings into both blocks. The invariants are currently satisfied correctly (verified directly against `vite.config.ts`), so no bug is masked. Affects `battlezone/tests/scaffold.test.ts` (harden to scoped/structural matches in a future test pass). *Found by Reviewer (via test-analyzer) during code review.*
- **Improvement** (non-blocking): the cloudflared ordering assertion in `tests/battlezone-bootstrap.test.mjs:184-199` compares raw `String.indexOf` offsets over the YAML text rather than parsing the `ingress:` list, and the green-family colour check (`g>r && g>b`, line 179) has no brightness floor (`#010200` would pass). Both verdicts are correct for the actual inputs (`#00ff41` is genuinely green; the rule is genuinely ahead of the catch-all), so nothing is masked. Affects `tests/battlezone-bootstrap.test.mjs`. *Found by Reviewer (via test-analyzer) during code review.*
- **Improvement** (non-blocking): AC #1 (serve → black canvas, no console errors) and AC #3 (`npm run build` clean) have no *encoded* automated assertion — they are verified by execution (build re-run clean in preflight/green/verify) and by live-browser check on :5276 (verify phase), and already logged as TEA structural-vs-live deviations. Consider noting these ACs explicitly as execution-verified/out-of-unit-scope. Affects test-suite documentation. *Found by Reviewer (via test-analyzer) during code review.*
- **Improvement** (non-blocking, security-LOW): the new `cloudflared/config.yml` rule `path: ^/battlezone` is an unanchored prefix regex (`/battlezonefoo` would also match). Negligible impact (unauthenticated static dev server) and it mirrors the pre-existing `^/tempest`/`^/star-wars` rules — if ever tightened to `^/battlezone(/|$)`, do all three game rules together. Affects `cloudflared/config.yml`. *Found by Reviewer (via security) during code review.*
- **Improvement** (non-blocking, housekeeping): two untracked artifacts sit at the orchestrator root — `bz1-1-blackcanvas-5276.png` (a verify-phase Playwright screenshot; the `.playwright-mcp/` twin is gitignored, this root copy is not) and `.pennyfarthing/peloton-state.json` (peloton runtime state). Neither is story code. Scope the finish-time orchestrator commit to the wiring files (`.gitignore`, `.pennyfarthing/repos.yaml`, `justfile`, `cloudflared/config.yml`, `cloudflared/README.md`) so these — and the unrelated `sprint/epic-bz1.yaml` / `.pennyfarthing/.runtime/current-model` working-tree changes — don't ride along. Affects orchestrator working tree. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **develop asserted as an existing branch, not as the checked-out HEAD**
  - Spec source: context-story-bz1-1.md, AC #5
  - Spec text: "battlezone/.git exists with develop as the current branch"
  - Implementation: the orchestrator test asserts a `develop` branch EXISTS (`git branch --list develop`), not that HEAD currently points at it
  - Rationale: during the story HEAD sits on the feature branch `chore/bz1-1-subrepo-bootstrap`; "current branch develop" describes the post-merge end state. Existence is the correct checkout-independent invariant for a mid-story RED
  - Severity: minor
  - Forward impact: none — after the PR merges, develop is the working branch anyway
- **Runtime/visual ACs pinned by structural preconditions, not live execution**
  - Spec source: context-story-bz1-1.md, AC #1, #3, #4
  - Spec text: "serves a black canvas with no console errors"; "npm run build completes clean"; "The Battlezone tile renders … and launching it navigates to /battlezone/"
  - Implementation: tests assert the preconditions (vite.config base/port, index.html boots `src/main.ts` + `<canvas>`, package.json `build` = `tsc --noEmit && vite build`, tsconfig strict, lobby registry battlezone tile → `/battlezone/`); the live serve/build/navigate behaviors are Dev/verify-phase checks
  - Rationale: repo convention — "the shell is verified by running the game" (star-wars CLAUDE.md; the camera-mvp header leaves visual/orientation to eyeball). A headless RED can't assert a rendered canvas or a live HTTP 200
  - Severity: minor
  - Forward impact: Dev/verify MUST run `just serve` (→ :5276 black canvas, no console errors), `cd battlezone && npm run build`, and click the lobby tile to close ACs #1/#3/#4
- **Story tests split across two repos (battlezone vitest + orchestrator node:test)**
  - Spec source: context-story-bz1-1.md, AC #2 ("cd battlezone && npm test")
  - Spec text: AC #2 implies battlezone's own suite; the wiring ACs (#1/#5/#6/#7) name no runner
  - Implementation: battlezone-internal invariants live in `battlezone/tests/`; cross-repo wiring lives in the orchestrator's `tests/battlezone-bootstrap.test.mjs` (node --test), mirroring the existing `canonical-serve.test.mjs`
  - Rationale: a subrepo test that read `../../justfile` would break a standalone `git clone battlezone`; orchestrator invariants must be tested at the orchestrator
  - Severity: minor
  - Forward impact: RED (and later GREEN) lives in TWO commands — `cd battlezone && npm test` AND (orchestrator root) `npm test` / `just test-orchestrator`. Dev + reviewer must run both

### Dev (implementation)
- **Added `@types/node` devDep and `"node"` to the tsconfig `types` array (not present in the star-wars scaffold)**
  - Spec source: context-story-bz1-1.md, AC #2/#3 ("package.json scripts copied verbatim"; "tsconfig mirroring star-wars's strict settings"); handoff-red.md GREEN step 2
  - Spec text: "`package.json` — the full verbatim star-wars scripts"; "`tsconfig.json` — mirror star-wars strict settings"
  - Implementation: package.json `scripts` ARE verbatim star-wars; tsconfig strict settings ARE star-wars's. But I added `"@types/node": "^20.11.0"` to devDependencies and appended `"node"` to `compilerOptions.types` (star-wars has only `["vitest/globals", "vite/client"]`).
  - Rationale: TEA's own `tests/scaffold.test.ts` imports `node:fs`/`node:url`/`node:path` to read battlezone's config files; star-wars's tests never touch node builtins, so its scaffold needs no node typings. `tsconfig.include` covers `tests/`, so `build`/`lint` (`tsc --noEmit`) typecheck that suite — without node types, `tsc` errors TS2307 and AC #3 (`npm run build` clean) fails. `node:`-prefixed modules resolve only when `@types/node` is in the `types` array (ambient `declare module` blocks), so the array entry is required, not just the devDep.
  - Severity: minor
  - Forward impact: minor — future battlezone stories inherit `@types/node` + node ambient globals in scope (harmless; the core stays DOM/node-free by the architecture rule, this only affects test/config-reading code). If a shared-toolchain extraction ever happens, this is one concrete star-wars↔battlezone divergence to fold in.

- **No per-game `dev-battlezone`/`build-battlezone`/`test-battlezone` justfile recipes added**
  - Spec source: context-story-bz1-1.md, technical approach step 8 (justfile wiring)
  - Spec text: "Wire `just serve` + `just install-all`: add `battlezone` to the `games`/`subrepos` lists and the `serve` recipe's parallel dev-server block"
  - Implementation: wired `battlezone` into `games`, `subrepos`, and `serve` only — did NOT add convenience `dev-battlezone`/`build-battlezone`/`test-battlezone` recipes.
  - Rationale: the story names only serve/install/vars; no test gates per-game recipes; and star-wars (the blueprint) has none either (only tempest/lobby carry them, as legacy). Adding them would be scope creep beyond the ACs. `test-all`/`build-all`/`install-all` cover battlezone via the vars.
  - Severity: trivial
  - Forward impact: none — a later story can add per-game recipes if wanted; nothing depends on them.

### TEA (test verification)
- **AC #4 live tile-click navigation deferred to the live cabinet**
  - Spec source: context-story-bz1-1.md, AC #4
  - Spec text: "The Battlezone tile renders on the lobby (http://localhost:5270/lobby/) and launching it navigates to /battlezone/"
  - Implementation: verified the registry DATA that drives the tile + navigation (`{ id: 'battlezone', title: 'BATTLEZONE', launchUrl: '/battlezone/', color: '#00ff41' }`) and confirmed battlezone serves 200 at `/battlezone/` on :5276. The live tile render + click-navigation on :5270 was NOT exercised.
  - Rationale: the lobby's pinned port (:5270, strictPort) is held by another live checkout; per SM decision #6 I did not disturb it, and I can't stand up a rival lobby on the same pin. Faking the click would be dishonest.
  - Severity: minor
  - Forward impact: AC #4's live behavior must be eyeballed on the user's live cabinet (click BATTLEZONE → /battlezone/). Data + battlezone endpoint are verified, so the residual risk is low.

### Reviewer (audit)

All six logged deviations reviewed. Every one is **ACCEPTED** — each is a sound, well-reasoned response to the bootstrap's cross-repo/mid-story realities, and none diverges from the epic's rulings.

- **TEA #1 — `develop` asserted as existing, not checked-out HEAD** → ✓ ACCEPTED: correct checkout-independent invariant for a mid-story RED (HEAD legitimately sits on the feature branch). `git branch --list develop` is the right test; confirmed `develop` exists.
- **TEA #2 — runtime/visual ACs (#1/#3/#4) pinned structurally, not by live execution** → ✓ ACCEPTED: matches the repo convention "the shell is verified by running the game." The live checks were then actually performed (build re-run clean; black canvas + 0 console errors browser-verified on :5276 in verify).
- **TEA #3 — story tests split across two repos (battlezone vitest + orchestrator node:test)** → ✓ ACCEPTED: a subrepo test reaching `../../` would break a standalone `git clone battlezone`; orchestrator-scope invariants belong in the orchestrator suite. Correct separation.
- **Dev #1 — `@types/node` + `"node"` in tsconfig `types`** → ✓ ACCEPTED: a genuine necessity, not gold-plating. `scaffold.test.ts` imports `node:fs/url/path`; `tsconfig.include` covers `tests/`, so `tsc --noEmit` (build/lint) typechecks it — without node types, TS2307 fails AC #3. Minimal, transitively gated by the AC #3 build. package-lock confirms it pulled only `@types/node` + `undici-types`, nothing else.
- **Dev #2 — no per-game `dev/build/test-battlezone` recipes** → ✓ ACCEPTED: matches the star-wars blueprint (none there either); no AC/test gates them; `install-all`/`build-all`/`test-all` cover battlezone via the vars. Adding them would be scope creep.
- **TEA verify — AC #4 live tile-click deferred to the live cabinet** → ✓ ACCEPTED: the lobby's pinned :5270 is held by another live checkout (SM decision #6 — do not disturb); faking a click would be dishonest. Registry data verified, and I independently confirmed the tile addition compiles (lobby `tsc --noEmit` clean + lobby suite 21/21). Residual risk is low; the live click should be eyeballed on the cabinet at finish.

**Favicon block (post-verify, `b336fe0`):** not an open deviation — it was an AC #1 gap (`/favicon.ico` 404 console error) found in verify, fixed by shipping the shared arcade favicon (byte-identical to tempest/star-wars per `cmp`) + a real `<link rel="icon">`, and re-verified 0 console errors in a live browser. Correctly resolved, matches the sibling pattern.

**Undocumented divergence noted (nil severity):** `index.html` drops `cursor: crosshair` from the sibling `html,body` style. Within the "minimal black-canvas boot" latitude of the spec (which did not require verbatim index.html mirroring), and arguably more correct — the crosshair was a star-wars cockpit affordance battlezone has no gunsight for yet (that arrives in bz1-12). Accepted, no action.

## TEA Verify Assessment

**Phase:** finish
**Status:** GREEN confirmed (both surfaces re-run independently). One minor AC #1 gap flagged for SM routing (favicon console error — see Delivery Findings).

### Independent verification (did NOT take Dev's word)
| Check | Result |
|-------|--------|
| `cd battlezone && npm test` (re-run) | **44/44 passed**, exit 0 |
| (orchestrator root) `npm test` (re-run) | **18/18 passed**, exit 0 — 10 bootstrap + 8 canonical-serve (intact) |
| `cd battlezone && npm run build` (re-run) | clean, exit 0 (`tsc --noEmit && vite build`, 17ms) |
| Tests not weakened | `git -C battlezone diff 84dc6c7 -- tests/` → EMPTY; orchestrator test byte-identical since `5a05091`. Dev earned GREEN by implementing, not loosening. |
| math3d fidelity | body **byte-for-byte identical** to `star-wars/src/core/math3d.ts`; only the 11-line provenance header added (single `0a1,11` diff hunk). |
| AC #1 black canvas (live browser :5276) | canvas present, viewport-sized (1200×1149), centre pixel `(0,0,0,255)` pure black, body bg black. Screenshot: `.playwright-mcp/bz1-1-blackcanvas-5276.png`. HTTP: `/battlezone/` 200, `src/main.ts` 200, `/` 302. |
| AC #1 "no console errors" (live browser) | **1 console error: `/favicon.ico` 404** — minor AC gap, see finding. |
| AC #4 tile-click navigation | DEFERRED (live lobby owned by another checkout) — registry data verified; see deviation. |

Live ports :5270/:5273/:5274 were left untouched (held by the live checkout); battlezone was served standalone on the free :5276 and torn down after.

### Dev deviations — stamped
1. **`@types/node` + `"node"` in tsconfig `types`** — ✅ LEGITIMATE NECESSITY. My `scaffold.test.ts` imports `node:fs/url/path`; `tsconfig.include` covers `tests/`, so `tsc --noEmit` (build/lint) typechecks it → without node types, TS2307 → AC #3 (`npm run build`) fails. Minimal, correct; transitively enforced by the AC #3 build gate (no new test needed). Minor forward note: node globals now sit in `src/` scope too — but DOM already does, and core purity is a review-enforced convention, not a tsconfig guarantee. Consistent with the existing posture.
2. **No per-game `dev/build/test-battlezone` recipes** — ✅ LEGITIMATE. Matches the star-wars blueprint (none there either); no AC/test gates them; `test-all`/`build-all`/`install-all` cover battlezone via the vars. Adding them = scope creep. Trivial.

### Simplify Report
**Teammates:** none spawned — judgment call. The verify change surface is scaffolding config (vite.config/tsconfig/package.json/repos.yaml/justfile/cloudflared/.gitignore), a **byte-verbatim** math3d port, a 22-line black-canvas boot (`main.ts`), and a one-line lobby-tile addition. No duplicated logic, dead code, or over-engineering for the reuse/quality/efficiency lenses to find — a manual read is the right tool, and I did it.
**Manual review:** clean. `main.ts` mirrors the sibling boot pattern; `getContext('2d')!` matches the star-wars convention (acceptable for a Wave-0 bootstrap). Dev correctly OMITTED star-wars's `/favicon.png` link — though that swap surfaced the `/favicon.ico` auto-request instead (the finding). No simplify fixes applied.
**Overall:** simplify: clean (manual).

**Quality checks:** lint + typecheck + tests all green (`npm run build` + both suites). No regressions.
**Handoff:** To Reviewer (The Big Lebowski) — SM routes. The one AC #1 favicon gap is flagged for the SM's routing decision (Dev one-liner vs. reviewer note vs. accept).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**

_battlezone subrepo (committed `07ab31c` scaffold + `b336fe0` favicon fix on `chore/bz1-1-subrepo-bootstrap`):_
- `battlezone/src/core/math3d.ts` — the Math Box, ported VERBATIM from `star-wars/src/core/math3d.ts` with a provenance header (epic "port, don't share").
- `battlezone/vite.config.ts` — base `/battlezone/`, port 5276 on server AND preview, `strictPort: true` + `allowedHosts: ['arcade.slabgorb.com']` on both; no `models.html` multi-page input.
- `battlezone/package.json` — verbatim star-wars scripts (`dev`/`build`/`preview`/`test`/`test:watch`/`lint`) + `@types/node` devDep (deviation logged).
- `battlezone/tsconfig.json` — mirrors star-wars strict; `"node"` added to `types` (deviation logged).
- `battlezone/index.html` + `battlezone/src/main.ts` — minimal black-canvas boot (Wave 0 skeleton); index.html carries a `<link rel="icon" href="/favicon.png">` (post-verify fix).
- `battlezone/public/favicon.png` — the shared arcade cabinet icon (byte-identical to tempest/star-wars), added in the favicon fix so the browser stops auto-requesting `/favicon.ico`.

_orchestrator + lobby (UNCOMMITTED for review, per SM decision #6):_
- `.gitignore` — `battlezone` added.
- `.pennyfarthing/repos.yaml` — battlezone registered in star-wars entry shape, no port key (SM decision #4).
- `justfile` — battlezone into `games`/`subrepos`/`serve`; star-wars backfilled into the vars (SM decision #1).
- `lobby/src/core/registry.ts` — green `BATTLEZONE` tile (`#00ff41`) → `/battlezone/`.
- `cloudflared/config.yml` — `^/battlezone` → `:5276` ahead of the lobby catch-all (+ comment block).
- `cloudflared/README.md` — routing-table row added (SM decision #5).

**Tests:** GREEN on both surfaces.
- `cd battlezone && npm test` → **44/44 passed** (3 files; the two math3d suites 21→44 after the port, as TEA predicted).
- (orchestrator root) `npm test` → **18/18 passed** (10 battlezone-bootstrap incl. the star-wars `reconcile` test + 8 canonical-serve, all green — canonical-serve unaffected).

**Build:** `cd battlezone && npm run build` (`tsc --noEmit && vite build`) → clean, built in 21ms.

**Runtime smoke (AC #1, isolated):** :5270/:5273/:5274 were held by another live checkout (not disturbed, per SM decision #6). :5276 was free, so battlezone was served standalone: `GET /battlezone/` → 200 (black-canvas HTML with `<canvas id="game">` + `/battlezone/src/main.ts`), module → 200, `/` → 302, dev log clean (Vite ready 112ms, no errors).

**Post-verify fix — favicon `/favicon.ico` 404 (TEA verify finding, AC #1 "no console errors"):**
- Root cause: index.html shipped no `<link rel="icon">`, so the live browser auto-requested `/favicon.ico` → 404 in the console. The server-log smoke couldn't see it (browser-side request). The sibling games dodge this by declaring an icon.
- Fix (`b336fe0`): match the sibling pattern — added `battlezone/public/favicon.png` (shared arcade icon, byte-identical to tempest/star-wars per `cmp`) + `<link rel="icon" type="image/png" href="/favicon.png" />`. A declared icon stops the `/favicon.ico` auto-fetch entirely (not a `data:,` suppression hack — a real icon, as SM directed).
- **Live-browser re-verification (Playwright on :5276):** console = **0 errors, 0 warnings** (the 2 remaining messages are Vite debug HMR pings); network `GET /battlezone/favicon.png` → **200** (Vite rewrites the root-absolute `/favicon.png` to the base path). Tests held **44/44**; `npm run build` clean. :5270/:5273/:5274 untouched; :5276 torn down after.

**Branch:** battlezone `chore/bz1-1-subrepo-bootstrap` (committed `07ab31c` + `b336fe0`, tree clean, NOT pushed — SM decision #3).

**Handoff:** To Reviewer (The Big Lebowski) — SM routes. AC #1 favicon gap now CLOSED and re-verified in a live browser. Peloton mode — reporting to SM, holding for routing (no marker/relay).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 44/44 + 18/18, build clean, tree clean, no smells/skips |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 9 | confirmed 9 (all non-blocking test-robustness/coverage improvements), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (LOW, non-blocking — unanchored `^/battlezone` regex, mirrors siblings), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (LOW, non-blocking — `getContext('2d')!` non-null assertion), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled subagents returned; 5 pre-filled Skipped/disabled per `workflow.reviewer_subagents`)
**Total findings:** 11 confirmed as observations, 0 dismissed, 0 deferred — **0 Critical, 0 High**, all Low/Medium non-blocking.

## Reviewer Assessment

**Verdict:** APPROVED

Battlezone subrepo bootstrap (bz1-1) is a clean, faithful keystone. Both test surfaces are green (battlezone 44/44, orchestrator 18/18 — the 8 canonical-serve contract tests intact), `npm run build` is clean, the Math Box is a byte-verbatim port, the scaffold mirrors the star-wars blueprint with exactly the three intended substitutions, and every orchestrator/lobby wiring point is correct and consistent. No Critical or High findings surfaced across my own pass or the four specialist Brandts; the eleven observations are all Low/Medium non-blocking hardening/documentation notes.

**Data flow traced:** lobby BATTLEZONE tile (`registry.ts`: `{ id:'battlezone', launchUrl:'/battlezone/', color:'#00ff41' }`) → click navigates to root-relative `/battlezone/` → on the live cabinet the Cloudflare tunnel's `^/battlezone` rule (ordered ahead of the `:5270` lobby catch-all) forwards to `http://localhost:5276` → Vite (base `/battlezone/`, strictPort 5276, `allowedHosts:['arcade.slabgorb.com']`) serves `index.html` → boots `src/main.ts` → paints the canvas black. Safe: no user input reaches any sink; the only cross-port hop (lobby :5270 → game :5276) is the same tunnel-routed pattern tempest/star-wars use, which is exactly why AC #4's live click is verification-deferred to the cabinet.

**Pattern observed:** faithful sibling-blueprint reuse — `vite.config.ts`, `tsconfig.json`, `package.json`, `index.html`, and `src/main.ts` all track `star-wars/` with only the deliberate battlezone deltas (base/port/name, the necessary `@types/node`, the correct `models.html` omission). `battlezone/src/core/math3d.ts:1-11` is the only substantive addition to the ported file — a provenance header, per the epic's "port, don't share" ruling.

**Error handling:** minimal by design (Wave-0 black-canvas boot; no branching/async/catch anywhere). The one flagged spot — `src/main.ts:9` `getContext('2d')!` — is fail-fast: if it ever returned null the next line throws loudly at boot. No swallowed errors, no silent fallbacks.

**Tenant isolation / auth:** N/A — no backend, no auth, no tenant data, no storage writes, no network I/O anywhere in this slice.

### Rule Compliance (lang-review `typescript.md`, 13 checks)

Enumerated every applicable check across the 6 in-scope TS files (`math3d.ts` + its two test ports excluded as byte-verbatim per the port ruling; `index.html` markup and the `.mjs` orchestrator test outside the TS-checklist's formal scope but read anyway):
- **#1 type-safety escapes** — 1 finding: `src/main.ts:9 getContext('2d')!` (non-null on `... | null`) → confirmed, LOW, non-blocking (below). `getElementById(...) as HTMLCanvasElement` (main.ts:8) is compliant (single cast, element guaranteed present). No `as any`/`as unknown as T`/`@ts-ignore` anywhere.
- **#2 generics/interfaces** — PASS: `Record<string,unknown>`/`Record<string,string>` in tests (not `any`); no `object`/`Function` types.
- **#3 enums** — N/A (no enums).
- **#4 null/undefined** — PASS: `?? {}` used correctly in tests; `devicePixelRatio || 1` is safe (typed `number`, sibling idiom).
- **#5 modules** — PASS: no relative imports needing `.js`, no ambient `declare`, no `/// <reference>`.
- **#6 React/JSX** — N/A (no `.tsx`).
- **#7 async** — N/A (no async/Promise).
- **#8 test quality** — PASS on the rule (no `as any` in assertions, no dist imports, `@types/node` correctly added); the 9 test-analyzer notes are robustness/coverage improvements, not vacuous assertions.
- **#9 build/config** — PASS: `strict:true`; `skipLibCheck:true` and `noUnusedParameters:false` are byte-identical to the star-wars blueprint / standard Vite-TS defaults, not story-introduced regressions.
- **#10 input validation** — PASS: `JSON.parse(...) as Record<string,unknown>` reads the subrepo's own trusted config in test code, not untrusted input.
- **#11 error handling** — N/A (no catch blocks).
- **#12 perf/bundle** — PASS: specific imports; sync `fs` is test-time only.
- **#13 fix regressions** — PASS: the favicon fix (`b336fe0`) changed zero TS lines.

### Devil's Advocate

Let me argue this is broken. **Port collision:** what if 5276 is already taken? `strictPort:true` fails loudly rather than wandering — but the full-cabinet `just serve` was never actually run here (the live ports are owned by another checkout), so the only evidence 5276 is collision-free is a standalone serve plus static config. Counter: strictPort guarantees a loud failure, not silent breakage, and 5276 is verified unused by the pin ledger (5270/73/74/75 all accounted for). **The lobby click:** AC #4's live navigation was never exercised — a confused user who clicks BATTLEZONE could hit a dead route if `launchUrl` were wrong. Counter: I read the registry data (`/battlezone/`), confirmed it compiles, and it is the identical pattern to two shipping tiles; the tunnel rule is present and correctly ordered. Residual risk is a live-cabinet eyeball, explicitly deferred. **The stressed browser:** `main.ts` assumes `getElementById('game')` and `getContext('2d')` both succeed — on an exotic browser with 2d disabled, boot throws. Counter: acceptable fail-fast for a bootstrap; every sibling does the same. **Malicious input:** there is none — no network, no user input, no auth, no storage in this slice; the cloudflared regex over-match (`/battlezonefoo`) lands on a static dev server with nothing to exfiltrate. **Test theater:** could the whole suite be green while the config is wrong? The test-analyzer proved the substring-count assertions are foolable *in principle* — but I independently diffed the real `vite.config.ts` and confirmed 5276/strictPort/allowedHosts are correctly on both blocks, so the green is honest, not coincidental. **Config drift:** could the uncommitted orchestrator/lobby edits be lost or over-committed at finish? Yes if the commit is mis-scoped — hence the housekeeping finding. Nothing here rises to Critical/High; the devil goes hungry.

### Observations (≥5)

1. `[VERIFIED]` math3d port is byte-verbatim — `diff star-wars/src/core/math3d.ts battlezone/src/core/math3d.ts` = only an 11-line provenance header (`math3d.ts:1-11`); both test suites likewise byte-identical (provenance headers only). Complies with the epic "port, don't share" ruling.
2. `[VERIFIED]` vite.config is exactly the three intended substitutions — `base:'/battlezone/'`, `server.port`/`preview.port`=5276, `strictPort:true` + `allowedHosts:['arcade.slabgorb.com']` on BOTH blocks, `models.html` multi-page block correctly omitted (`vite.config.ts:1-26`).
3. `[VERIFIED]` orchestrator wiring correct & consistent — `justfile` `games`/`subrepos` = `"tempest star-wars battlezone"`/`"lobby tempest star-wars battlezone"` with star-wars backfilled (SM decision #1), serve launches battlezone; `.gitignore` +battlezone; `repos.yaml` faithful star-wars shape, no port key; cloudflared `^/battlezone`→:5276 ahead of the `:5270` catch-all, terminal 404 preserved.
4. `[VERIFIED]` lobby tile compiles and is on-palette — `registry.ts` tile `#00ff41` (g=255 dominant, distinct from cyan/yellow); lobby `tsc --noEmit` clean + lobby suite 21/21 (a compile check the orchestrator's text-only assertion never made).
5. `[RULE]` `[TYPE]` `src/main.ts:9 getContext('2d')!` — non-null assertion on `... | null` (lang-review #1). Confirmed, LOW, non-blocking: fleet-wide sibling idiom, canvas guaranteed present, fail-fast if ever null. Not dismissed; recorded for a future fleet-wide hardening.
6. `[TEST]` scaffold/bootstrap config assertions are substring-count/index-offset based (foolable in principle) but verified correct against the real files — non-blocking robustness improvements.
7. `[SEC]` cloudflared `^/battlezone` unanchored regex — mirrors pre-existing sibling rules, negligible on an unauthenticated static origin — non-blocking.
8. `[PREFLIGHT]` both surfaces green (44/44 + 18/18), build clean, canonical-serve contract intact, no smells/skips.

### Subagent dispatch tags
`[EDGE]` skipped (disabled) · `[SILENT]` skipped (disabled) · `[TEST]` 9 confirmed non-blocking · `[DOC]` skipped (disabled) · `[TYPE]` covered via rule-checker (`getContext!` — 1, LOW) · `[SEC]` 1 confirmed non-blocking · `[SIMPLE]` skipped (disabled) · `[RULE]` 1 confirmed non-blocking (`getContext!`).

**Blocking findings:** none (0 Critical, 0 High).
**Handoff:** Peloton mode — reporting **APPROVED** to SM (The Dude) for the finish flow. Holding — no marker, no relay.