---
story_id: "7-1"
jira_key: ""
epic: "7"
workflow: "trivial"
---
# Story 7-1: Lobby project scaffold (Vite + TS + Canvas 2D)

## Story Details
- **ID:** 7-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repos:** lobby
- **Points:** 2
- **Priority:** p1
- **Type:** chore

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-27T18:35:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T18:19:26.678151+00:00 | 2026-06-27T18:20:55Z | 1m 28s |
| implement | 2026-06-27T18:20:55Z | 2026-06-27T18:27:21Z | 6m 26s |
| review | 2026-06-27T18:27:21Z | 2026-06-27T18:35:53Z | 8m 32s |
| finish | 2026-06-27T18:35:53Z | - | - |

## Technical Approach

Initialize the `lobby` subrepo with a Vite + TypeScript project scaffold, using Canvas 2D as the rendering target (matching tempest). Configure linting, testing, and build tooling.

**Acceptance Criteria:**
- Vite project initializes with TypeScript
- Canvas 2D configured as the render target
- npm scripts present: `dev` (vite dev), `build` (tsc --noEmit && vite build), `test` (vitest)
- .gitignore and tsconfig properly configured
- ESM module format throughout (matches tempest)

**Branch Strategy:** trunk-based (no feature branch — work on default branch)

## Sm Assessment

Story 7-1 scaffolds the `lobby` subrepo — the second game in the arcade, the
front-end shell that lists games as glowing vector tiles. This is pure greenfield
tooling setup, no game logic. It mirrors what already exists and works in
`tempest/`, so the path is well-trodden.

**Routing rationale:** Trivial workflow (2pt chore), phased → handing straight to
Dev (Walter Sobchak) for the `implement` phase. No design phase needed; the
target stack (Vite + TS + Vitest + Canvas 2D, ESM) is already proven in tempest
and the ACs are concrete.

**Guidance for Dev:**
- Match the tempest toolchain so the two games stay consistent: Vite 8, Vitest 4,
  `tsc --noEmit && vite build` for the build script, ESM throughout.
- The `lobby` directory is a gitignored subrepo with its own git history — scaffold
  lives inside `lobby/`, not the orchestrator.
- Keep render target Canvas 2D (no engine, no backend) per the arcade visual language.
- No shared library yet — duplication with tempest is expected and fine at this stage.

**Jira:** Skipped — project uses local sprint YAML tracking, no Jira.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed (all new — `lobby/` subrepo):**
- `lobby/package.json` — name `lobby`, ESM, scripts dev/build/preview/test/test:watch; devDeps typescript ^5.4, vite ^8.1, vitest ^4.1 (matches tempest exactly)
- `lobby/tsconfig.json` — strict, ES2020/ESNext/bundler, DOM libs, vitest globals (mirrors tempest)
- `lobby/vite.config.ts` — base `/lobby/`, dev+preview port 5270 strictPort, `arcade.slabgorb.com` allowed host, node test env
- `lobby/index.html` — Vite entry, `<canvas id="lobby">`, Orbitron font, black full-bleed
- `lobby/src/main.ts` — Canvas 2D bootstrap: DPR-aware resize + glowing "ARCADE" placeholder
- `lobby/src/core/layout.ts` — pure DOM-free `canvasSize()` helper (core/shell split)
- `lobby/tests/layout.test.ts` — 3 Vitest cases for `canvasSize`
- `lobby/README.md` — stack, commands, structure
- `lobby/.gitignore` — node_modules/dist/runtime (tempest pattern, minus tempest-only `sfx/`)

**Acceptance Criteria:** all met
- ✅ Vite project initializes with TypeScript
- ✅ Canvas 2D configured as render target (`main.ts` acquires `getContext('2d')`, paints)
- ✅ npm scripts present: `dev`, `build` (`tsc --noEmit && vite build`), `test` (vitest)
- ✅ `.gitignore` and `tsconfig` properly configured
- ✅ ESM throughout (`"type": "module"`, ESNext)

**Verification (all GREEN):**
- `npm install` — 45 packages, 0 vulnerabilities
- `npm run build` — tsc strict ✓, vite build ✓ (6 modules, dist emitted)
- `npm test` — 3/3 passing (via testing-runner)

**Git:** committed to local `develop` (`243d426`), working tree clean. No remote configured for lobby yet → not pushed (see Delivery Findings; no PR per Dev rules — SM handles in finish).

**Handoff:** To review phase → The Big Lebowski (Reviewer).

## Delivery Findings

No upstream findings.

### Dev (implementation)
- **Gap** (non-blocking): The lobby subrepo has no git remote configured, so the scaffold was committed to local `develop` but not pushed. Affects `lobby/` (a remote must be created and `git remote add origin` + push performed before PR-based review can run; review is local until then). *Found by Dev during implementation.*
- **Improvement** (non-blocking): Orchestrator tooling only documents the tempest dev server (port 5273). Affects `justfile`, `CLAUDE.md` (add a lobby dev recipe and command-table entry for `npm run dev` on port 5270 now that the lobby is runnable). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The `canvasSize` test named "clamps the ratio to a minimum of 1 and floors fractional pixels" exercises neither claim — `(101,101,0)` short-circuits through the `||1` guard (never reaching `Math.max`) and `101×1` is integer (nothing to floor). Affects `lobby/tests/layout.test.ts` (add a fractional-dpr case, e.g. `canvasSize(101,101,1.5) → {151,151}`, and a truthy sub-1 case `canvasSize(100,100,0.5) → {100,100}`, so the floor and min-clamp paths fail if regressed). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The shell canvas bootstrap uses `as HTMLCanvasElement` + `getContext('2d')!` with no guard — identical to the shipping `tempest/src/main.ts:10-11`. Affects both `lobby/src/main.ts` and `tempest/src/main.ts` (a shared `getCanvas2D(id)` helper with an `instanceof` guard + descriptive throw would harden both; defer until a second consumer justifies extraction, per the no-premature-shared-lib rule). *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- **Added a pure `core/layout.ts` module + unit test beyond the bare scaffold**
  - Spec source: .session/7-1-session.md, AC "npm scripts present: test (vitest)"
  - Spec text: "test (vitest)" — the AC only requires the test script to exist
  - Implementation: Added `src/core/layout.ts` (DOM-free `canvasSize` helper) consumed by `main.ts`, plus `tests/layout.test.ts` (3 cases), so the harness runs a real test instead of passing with none
  - Rationale: A scaffold that only ships `--passWithNoTests` proves nothing; one real pure module + test verifies TS-strict + Vitest + module resolution end to end and establishes tempest's core/shell split from day one
  - Severity: minor
  - Forward impact: minor — later epic-7 stories inherit a `src/core/` convention and a working harness; nothing is locked in
- **Added README.md (not named in the ACs)**
  - Spec source: .session/7-1-session.md, Acceptance Criteria list
  - Spec text: ACs name package.json, tsconfig, .gitignore, vite config, and scripts — not a README
  - Implementation: Added a concise `README.md` documenting stack, commands, and structure
  - Rationale: A brand-new repo with no README is poor form; standard scaffolding hygiene, mirrors tempest which ships one
  - Severity: minor
  - Forward impact: none — documentation only

### Reviewer (audit)
- **Added a pure `core/layout.ts` module + unit test** → ✓ ACCEPTED by Reviewer: Sound. Establishing tempest's core/shell split on day one is the right precedent, and a real pure test proves the harness end-to-end (the stated story goal). The test's thoroughness gap is logged separately as a non-blocking Improvement — the deviation itself is correct.
- **Added README.md (not named in the ACs)** → ✓ ACCEPTED by Reviewer: Standard hygiene for a brand-new repo; mirrors tempest. Documentation only, zero risk.
- No undocumented spec deviations found. The scaffold matches the ACs and the tempest reference toolchain faithfully (port 5270 vs tempest 5273 and base `/lobby/` are the only intentional per-repo differences, both correct).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 5 observations (none blocking) | noted 5, 0 confirmed-blocking |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 1 (Medium), deferred 5 (edge-case suggestions) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (downgraded to Low — mirror shipping tempest) |

**All received:** Yes (4 enabled returned, 2 with findings; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (1 Medium, 3 Low), 0 dismissed, 5 deferred (follow-up edge-case tests)

### Rule Compliance

Enumerated against the 13-point `lang-review/typescript.md` checklist (the only rules source — no SOUL.md or `.claude/rules/`). Every `.ts` file in the diff (`src/core/layout.ts`, `src/main.ts`, `tests/layout.test.ts`, `vite.config.ts`) checked:

1. **Type-safety escapes** — VIOLATION (Low, confirmed): `main.ts:7` `as HTMLCanvasElement` discards `| null`; `main.ts:8` `getContext('2d')!` asserts over a nullable. Real per the rule, but verbatim mirrors of the shipping `tempest/src/main.ts:10-11`; canvas is statically guaranteed by `index.html`. Downgraded to Low (fail-fast at boot, dev-time error), not dismissed. `[RULE]`/`[TYPE]`.
2. **Generic/interface pitfalls** — COMPLIANT: `CanvasSize` has concrete numeric fields; `canvasSize` params are primitives; no `Record<string,any>`, `object`, or `Function`.
3. **Enum anti-patterns** — N/A: no enums.
4. **Null/undefined** — COMPLIANT: `devicePixelRatio || 1` (`layout.ts:24`) is intentional and correct — `??` would let `0`/`NaN` through; `0 ?? 1 = 0` then `Math.max(1,0)=1` is fine, but `NaN ?? 1 = NaN → Math.min(2,NaN)=NaN` would be a BUG, so `||` is the *safer* choice here. VERIFIED — evidence: `layout.ts:24`, `||` guards NaN; rule #4 targets `||` that drops valid `0`/`""`, which this does not (0 is invalid here). No Map.get, no unguarded `?.`.
5. **Module/declaration** — COMPLIANT: extensionless relative imports are correct under `moduleResolution: "bundler"` (not Node16); no type-only re-exports, no ambient declares, no `///` directives.
6. **React/JSX** — N/A: no `.tsx`.
7. **Async/Promise** — N/A: no async code.
8. **Test quality** — FINDING (Medium, confirmed): `tests/layout.test.ts:13-14` vacuous on its own name (see `[TEST]`). No `as any`, no mocks, imports from `src/` not `dist/`. Other two cases genuinely exercise scaling and max-clamp.
9. **Build/config** — VIOLATION (Low, confirmed): `tsconfig.json:10` `skipLibCheck:true` — real per rule, but industry-standard for app (non-library) code and a verbatim mirror of tempest's tsconfig. Downgraded to Low. `strict:true` ✓.
10. **Security input validation** — COMPLIANT: no user input; `window.innerWidth/Height/devicePixelRatio` are native numerics; no `JSON.parse as T`, no URL casts. `[SEC]`.
11. **Error handling** — N/A: no try/catch, no Result types.
12. **Performance/bundle** — COMPLIANT: direct named imports (no barrels); `draw()` fires on resize only, not in a RAF hot path.
13. **Fix regressions** — N/A: no prior fixes.

### Devil's Advocate

Let me argue this scaffold is broken. First, the bootstrap is a house of cards: `document.getElementById('lobby') as HTMLCanvasElement` is a lie to the compiler. If a future story renames the canvas id, moves the `<script>` above the `<canvas>`, or injects the lobby into a host page where that id collides, `canvas` is `null`, and the failure surfaces one line later at `getContext` as an opaque `Cannot read properties of null` — not at the actual fault. A confused contributor will stare at `draw()`. Second, `getContext('2d')!` assumes a 2D context always exists; on a canvas that some other code already bound to WebGL, or under a hardened browser/extension that blocks canvas, `getContext` returns `null` and every `ctx.fillRect`/`fillText` throws — again with no diagnostic. Third, the test suite actively misleads: a maintainer who later "optimizes" `canvasSize` by deleting `Math.floor` or the `Math.max(1, …)` clamp will see all three tests stay green, because the one test that names those behaviors feeds `(101,101,0)` — an input that reaches neither code path. Green tests will certify a regression. Fourth, fractional device pixel ratios (1.5, 1.75 — common on real laptops and phones) are the *only* case where `Math.floor` does real work, and they are completely untested; a half-pixel backing-store error would ship unnoticed. Fifth, `skipLibCheck:true` means a genuine type incompatibility between the pre-release `vite@^8` and `vitest@^4` declarations could be silently swallowed, so "tsc passes" is weaker than it looks. 

Rebuttal: every one of these is real but bounded. The null-cast and `getContext!` are the conventional Canvas bootstrap idiom and are byte-for-byte identical to the shipping tempest game (Waves 0–5, in production) — holding lobby to a stricter bar would create exactly the cross-game inconsistency the project guidance forbids. The element is statically present in the same `index.html`; this fails loudly at boot, in dev, on the first load. The test gap is a thoroughness issue, not a correctness one — the function is provably correct by inspection, and the harness's actual job (run a real, type-checked, resolving test) is met by the other two genuine cases. None of this rises to Critical or High. The devil gets follow-up findings, not a rejection.

## Reviewer Assessment

**Verdict:** APPROVED

**Findings (all non-blocking — no Critical/High):**

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] `[TEST]` | Test "floors fractional pixels" exercises neither flooring nor min-clamp (`(101,101,0)` → `||1` short-circuit, integer product) — would pass if `Math.floor`/`Math.max` were deleted | `tests/layout.test.ts:13-14` | Confirmed → tracked as non-blocking Delivery Finding (add fractional + sub-1 dpr cases) |
| [LOW] `[RULE]`/`[TYPE]` | `as HTMLCanvasElement` drops `\| null` with no guard | `src/main.ts:7` | Confirmed, downgraded — mirrors shipping `tempest/src/main.ts:10`, canvas statically guaranteed, fail-fast at boot |
| [LOW] `[RULE]`/`[TYPE]` | `getContext('2d')!` asserts over nullable | `src/main.ts:8` | Confirmed, downgraded — mirrors `tempest/src/main.ts:11`; 2D context effectively always available |
| [LOW] `[RULE]` | `skipLibCheck:true` can hide `.d.ts` incompatibilities | `tsconfig.json:10` | Confirmed, downgraded — standard for app code, mirrors tempest tsconfig |
| [LOW] `[SEC]` | Google Fonts `<link>` has no SRI integrity hash | `index.html:9-12` | Noted (preflight) — non-blocking for an internal project; mirrors tempest |
| 5+ deferred `[TEST]` | Missing edge cases: fractional/negative/NaN dpr, zero dimensions | `tests/layout.test.ts` | Deferred to the same follow-up |

**Subagent tag coverage:** `[TEST]` confirmed×1 (Medium) + 5 deferred · `[RULE]` confirmed×3 (Low) · `[TYPE]` cross-tagged with the two cast findings · `[SEC]` clean (no input/injection/secrets) · `[EDGE]` disabled, not run · `[SILENT]` disabled, not run · `[DOC]` disabled, not run · `[SIMPLE]` disabled, not run.

**Data flow traced:** `window.innerWidth/innerHeight/devicePixelRatio` → `canvasSize()` (pure clamp+floor) → `canvas.width/height` → `draw()` paints literal `'ARCADE'`. No external/user input enters the path; `fillText` uses a hardcoded string literal, so no injection surface. Safe.

**Pattern observed:** Pure `core/` (DOM-free, tested) vs IO `shell` (`main.ts`) split established at `src/core/layout.ts:1` and consumed at `src/main.ts:5` — correctly mirrors tempest's architecture, the right precedent for epic 7.

**Error handling:** Minimal by design (scaffold, no I/O). The two unguarded canvas casts (`main.ts:7-8`) are the only failure points; both fail fast at boot and match the shipping reference game. Acceptable; hardening logged for both repos.

**Why APPROVE:** All ACs met; `npm run build` + `npm test` green; working tree clean; security clean; zero Critical/High findings. The confirmed items are a Medium test-thoroughness gap (function is correct; harness goal met) and three Low rule-flags that are deliberate, documented mirrors of the production tempest sibling per the Dude's setup guidance. Rejecting a correct 2-pt scaffold over non-blocking findings would be disproportionate and would hold lobby to a stricter bar than shipping tempest.

**Handoff:** To SM (The Dude) for finish-story.