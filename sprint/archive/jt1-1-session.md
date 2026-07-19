---
story_id: "jt1-1"
jira_key: "jt1-1"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-1: Scaffold — Vite/TS/Vitest on port 5279 + core/shell purity guard + CI caller + orchestrator registration

## Story Details
- **ID:** jt1-1
- **Jira Key:** jt1-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T22:30:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T21:56:28Z | 2026-07-19T21:59:02Z | 2m 34s |
| red | 2026-07-19T21:59:02Z | 2026-07-19T22:10:53Z | 11m 51s |
| green | 2026-07-19T22:10:53Z | 2026-07-19T22:17:40Z | 6m 47s |
| review | 2026-07-19T22:17:40Z | 2026-07-19T22:30:12Z | 12m 32s |
| finish | 2026-07-19T22:30:12Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the orchestrator suite is **already red on two tests before jt1-1 touched anything** — `audit: tempest sfx — link 5 …` and `audit: red-baron — link 5 …` in `tests/extract-audio.test.mjs`. Proven pre-existing by re-running `npm test` with `tests/joust-bootstrap.test.mjs` moved aside: both still fail. They depend on the gitignored vendored Atari source/audio assets, so this is most likely an environment gap in this checkout rather than a code defect. Affects `tests/extract-audio.test.mjs` (needs triage under its own story, not jt1-1). *Recorded so Dev/Reviewer do not misattribute them to this story — the develop-red misattribution trap.* *Found by TEA during test design.*
- **Improvement** (non-blocking): the `Date aliasing (= Date)` rule inherited from `centipede/tests/purity.test.ts` **double-reports** — `= Date` is a textual prefix of `= Date.now()`, so `const t = Date.now()` names two bans for one defect and sends the author hunting a second, non-existent problem. Found by the AC-2 probe run against the real tree. Fixed in joust's copy with a `(?!\s*[.(])` lookahead plus a regression test. Affects `centipede/tests/purity.test.ts` (and any repo that copies it next) — cosmetic only, since both rules are bans, so it is not worth a story of its own; fold it into the next centipede test-touching change. *Found by TEA during test design.*
- **Question** (non-blocking): the design spec pins core RNG to `@arcade/shared/rng` ("RNG is `@arcade/shared/rng`, seeded by the shell"), first consumed by jt1-5. Centipede pins the library as a git-URL dependency (`github:slabgorb/arcade-shared#v0.15.0`); joust's TEA-authored `package.json` deliberately **omits** it, because jt1-1's ACs never mention it and an unused git-URL dep adds fresh-checkout install fragility to a 2pt scaffold story. Affects `joust/package.json` (Dev/SM to decide: add the pin now while the scaffold is open, or let jt1-5 add it with its first real consumer). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-1 says `npm run build` must be green from a fresh checkout, but nothing in the joust suite executes a build — a test that shells out to `tsc && vite build` inside `npm test` would be circular and slow. Coverage is therefore indirect (tsconfig strict + `include` covers `src` and `tests`; index.html boots `src/main.ts`). Affects the jt1-1 verify/review step, which should run `npm run build` **once, by hand** and record the result. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): AC-1's literal command sequence (`npm install && npm run build && npm test`) was **self-contradicting** as TEA shipped it. `scaffold.test.ts`'s *does not commit build output* asserted `existsSync('dist') === false` — a **filesystem** check — so running the AC's own build immediately before the AC's own test turned a correct tree red (51 → 50 pass, 1 fail). Reproduced deterministically. Fixed in place (see Design Deviations); flagged because the same assertion exists verbatim in the sibling scaffolds and will bite anyone who runs build-then-test there. Affects `centipede/tests/scaffold.test.ts` and any repo that copied it (change the presence check to `git ls-files -- dist`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `scripts/deps-doctor.mjs` — which `just serve` and `just install-all` run as a preflight over `{{subrepos}}` — was verified against joust before wiring it in (`node scripts/deps-doctor.mjs lobby centipede joust` → all OK, exit 0). It tolerates a subrepo with **no** `@arcade/shared` pin, so the SM's jt1-5 deferral of the `/rng` pin costs nothing operationally. Recording the check so jt1-5 does not re-derive it. Affects nothing today. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-3 says "workflow-lints clean", but the orchestrator has no `actionlint` (or equivalent) in the toolchain, so the deploy caller was validated only by YAML parse + the suite's structural assertions (thin caller, correct `uses:`, bucket `arcade-joust`, no sibling bucket, no hand-rolled steps). The first *real* proof is the first release, which jt1-1 explicitly does not cut. Affects the jt6 ship epic (bucket provisioning + first deploy) — worth an actionlint step there if workflow drift is a concern. *Found by Dev during implementation.*

### SM (finish verification)
- **Correction to Dev's first finding above:** the claim that the `existsSync('dist')` assertion "exists verbatim in the sibling scaffolds" is **false** — verified at finish by grep. `centipede/tests/scaffold.test.ts` exists (contra the Reviewer's re-statement, which said the file itself was missing) but contains **no dist-presence assertion** (only an AC-3 comment mentioning `dist/`), and no other sibling has one (`existsSync.*dist` matches zero sibling test files). The unsatisfiable build-then-test interaction was real **in joust only** — TEA authored that assertion fresh; it was not copied from a sibling. The finding's action item (fix centipede + copies) is **void**; no follow-up story needed. *Recorded by SM so the archive does not send a future agent hunting a phantom.*

### Reviewer (code review)
- **Gap** (non-blocking for jt1-1, **hard gate on jt1-5**): the AC-2 purity scanner has **five reproducible false negatives**, every one confirmed by executing a probe against the real tree (control `Math.random()` → CAUGHT in each run, so the harness was live):

  | Probe | Result |
  |---|---|
  | `'contains /* marker'` in a string, then `Date.now()` on a **later line** | **MISSED** |
  | `export const c = 'a//b' + performance.now()` | **MISSED** |
  | ``export const e = `t${Math.random()}` `` | **MISSED** |
  | `const { random } = Math; random()` | **MISSED** |
  | `const readClock = Date.now; readClock()` | **MISSED** |

  Three distinct root causes, all exact: (1) **the worst** — `stripComments`'s block-comment regex (`tests/purity.test.ts:50`) scans the file as flat text with no tokenizer, so a `/*`-looking substring inside an ordinary string consumes everything up to the next real `*/` **anywhere later in the file**, silently disabling the guard over an arbitrary span of unrelated code; (2) `stripComments` (`:51`) runs before `stripStrings` and its only in-string `//` protection is the `(^|[^:])` URL heuristic, so any `//` in a string not preceded by `:` eats the rest of that line; `stripStrings` (`:63`) separately blanks the **entire** template literal including the live code inside `${…}`; (3) every call-anchored ban requires a literal immediate `(`, so aliasing evades all of them — only `Date` has a (narrower) aliasing guard at `:138`.

  Cause (1) and (2) are the dangerous ones because they are **accidental** — an innocent string silently switches the guard off, which is the guard's actual threat model. Cause (3) requires deliberate evasion and matters less. The comment/string ordering is a documented tradeoff (`:57`), but both orderings leak; the durable fix is a single-pass character scanner, plus fixture tests for a string containing `//` and an unmatched `/*`. Affects `joust/tests/purity.test.ts` **and every sibling that copies this scanner** (centipede, tempest) — this is a fleet-wide pattern, not a jt1-1 regression, and current core is 28 lines of trivially pure code so live risk today is nil. **Recommend SM file this as a tracked story rather than leave it as an archived session finding**, gated to land before jt1-5 — the first story to write real core logic with strings. A rushed regex patch is how new holes get added; this deserves its own scoped change. *Found by Reviewer during code review, corroborated and extended by reviewer-test-analyzer.*
- **Improvement** (non-blocking): `scaffold.test.ts:273` duplicates the "core holds at least one `.ts` module" check that `purity.test.ts:293-300` already makes, but walks the directory **non-recursively** while purity uses `recursive: true`. The moment core gains a subdirectory (entities/, physics/ — plausible by jt1-4), the scaffold copy goes red while the purity sweep keeps working correctly. Delete the duplicate or align the walk semantics. Separately, `scaffold.test.ts:71,97` assert `port: 5279` and `strictPort: true` by counting matches **file-wide** (`>= 2`) rather than per-block, so two `port: 5279` lines inside `server` with `preview` missing its port entirely would still pass — contradicting the assertion's own stated intent. Affects `joust/tests/scaffold.test.ts`. *Found by reviewer-test-analyzer, confirmed by Reviewer.*
- **Gap** (blocking for jt6, not for jt1-1): `slabgorb/joust` has **no `CLOUDFLARE_API_TOKEN` repo secret**, and there is no org-level secret store (`gh secret list --org slabgorb` → HTTP 404). The reusable workflow declares `CLOUDFLARE_API_TOKEN: required: true` (`.github/workflows/deploy-r2.yml:16`), so the first `just release joust` will fail at the deploy step despite a green build. Verified the check itself works: `gh secret list -R slabgorb/tempest` returns the token. centipede is in the same unprovisioned state, so this is a known fleet shape, not a joust regression — and AC-3 explicitly cuts no release here. Affects the jt6 ship epic (provision the bucket **and** the repo secret before the first release). *Found by Reviewer during code review.*
- **Conflict** (non-blocking): Dev's Gap finding above states the `existsSync('dist')` assertion "exists verbatim in the sibling scaffolds" and names `centipede/tests/scaffold.test.ts` as needing the same change. **That file does not exist** — centipede has no `scaffold.test.ts`, and no centipede test asserts on `dist` presence (`grep -rn "dist" centipede/tests/scaffold.test.ts` → no such file; the only `dist` mention in centipede's tests is a comment in the deploy-caller describe). The finding as written sends a future agent to fix a non-existent defect and should be corrected or dropped before the session is archived. Affects `.session/jt1-1-session.md` (Dev's Delivery Findings entry). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `pumpFrames` (`src/shell/timebase.ts:15-26`) carries no internal guard — the 0.25 s clamp lives only at the single call site (`src/main.ts:37`). A NaN `elapsedSeconds` makes `acc` NaN, every `acc >= SECONDS_PER_FRAME` comparison then evaluates false, and the returned NaN **permanently poisons** `main.ts`'s module-level accumulator: the sim freezes silently while rendering continues. A negative `elapsedSeconds` stalls stepping until later positive dt cancels the deficit; an unbounded one loops proportionally. None of these is reachable today (rAF supplies a monotonic `DOMHighResTimeStamp`, and `Math.min` clamps the upper side), so this is a latent trap for the next caller rather than a live defect. Affects `joust/src/shell/timebase.ts` — fold a `Number.isFinite` + `Math.max(0, …)` clamp into the function when jt1-5 makes timing load-bearing. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Edited one TEA-authored test rather than implementing to it:** `scaffold.test.ts`'s *does not commit build output* asserted `dist/` is absent from the **working tree**. No implementation can satisfy that *and* AC-1, because AC-1 requires `npm run build` to run before `npm test` — the build legitimately creates `dist/`. Rewrote the assertion to `git ls-files -- dist` (empty), which is what "not committed" actually means and what `.gitignore` already guarantees. Verified it still has teeth: `git add -f dist` makes it fail; `git reset` makes it pass. Dev does not normally edit the RED suite — raised here explicitly for the Reviewer to accept or reject.
- **No `@arcade/shared/rng` pin added:** the design spec routes core randomness through `@arcade/shared/rng`, but per the SM's ruling this is deferred to jt1-5 (its first real consumer). `src/core/frame.ts` needs no entropy, so the scaffold stays install-fragility-free.
- **Kept TEA's two beyond-AC-4 assertions** (CLAUDE.md roster label, repos.yaml commands) rather than dropping them. Both are one-line doc edits and TEA's rationale holds: a stale "pre-implementation" label in the file every agent primes from is how a later story re-derives a wrong assumption. Also updated the adjacent "All seven browser subrepos … `joust` joins when its scaffold story lands" sentence to eight — untested, but it is the same staleness the tested assertions exist to prevent.

### TEA (test design)
- **Wrote the AC-4 orchestrator wiring test in RED instead of leaving it to Dev:** the SM assessment scoped the orchestrator-side changes (justfile / CLAUDE.md / repos.yaml) as "Dev-phase work committed to orchestrator main at finish — not part of the joust test suite", and the routing note said to cover AC-4 only where testable from within joust. A joust-internal test cannot reach orchestrator docs (the tp1 lesson), so following that literally would have left AC-4 with **no gate at all** — and the cp1-1 precedent shows why that matters: `tests/centipede-bootstrap.test.mjs` was added in the *same commit* as the wiring it checks, i.e. the AC gated itself. Landed as `tests/joust-bootstrap.test.mjs` (orchestrator, still outside the joust suite, so the standalone-clone rule holds). Committed locally on orchestrator `main` and **deliberately not pushed**, so no sibling checkout ever sees the red; Dev's wiring turns it green before SM pushes at finish. Revert the file if SM prefers the original split.
- **Bootstrapped `package.json` + `package-lock.json` in the joust repo:** TEA normally writes no non-test files, but joust was pre-implementation with no package.json, so there was no way to *run* a failing test. Scoped to the harness only — scripts and the Vite 8 / Vitest 4 / TypeScript toolchain — per the rb1-1 / cp1-1 precedent. Consequence: the `package.json` assertions in `scaffold.test.ts` are green from day one rather than red; they stand as regression guards. Everything the ACs actually name (vite.config.ts, tsconfig.json, index.html, `src/`, the CI caller) is untouched and red.
- **Added two assertions slightly beyond the literal AC-4 text:** CLAUDE.md's games-roster line must drop the `(1982, pre-implementation)` label, and repos.yaml's joust block must carry `dev_command` / `build_command` / `test_command` like its scaffolded siblings. AC-4 names only the port-table row. Both are one-line doc edits, and a stale "pre-implementation" label in the file every agent primes from is exactly how a later story re-derives a wrong assumption. Drop them if Dev judges them out of scope.

## Sm Assessment

**Story:** jt1-1 (2pt, p1, tdd) — first joust story: Vite/TS/Vitest scaffold on port 5279, core/shell purity guard, CI deploy caller (arcade-joust bucket), orchestrator registration (justfile, CLAUDE.md port row, repos.yaml).

**Setup verified:** session file present, story context written to `sprint/context/context-story-jt1-1.md` (cites design spec `joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md` and the four ACs from epic-jt1.yaml; centipede is the config donor — newest raster scaffold). Feature branch `chore/jt1-1-scaffold` created in joust off develop. No Jira; jira_key = story id.

**Execution mode:** peloton (team peloton-jt1-1: tea, dev, reviewer), one story at a time, merge between stories per the user's directive. No tmux socket in this session — teammates run as named agents driven via SendMessage rather than panes.

**Scope notes for TEA:** joust is pre-implementation (no package.json). RED phase must bootstrap enough scaffold to host failing tests, or write tests that fail for the right reason. Purity-guard AC requires a demonstrated red run (temporary forbidden global in src/core/) recorded in story notes. Orchestrator-side changes (justfile/CLAUDE.md/repos.yaml) are Dev-phase work committed to orchestrator main at finish — not part of the joust test suite.

**Routing:** setup → red, owner tea.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — jt1-1 is a scaffold story, but three of its four ACs are directly assertable (config contract, purity guard, CI caller) and the fourth (orchestrator wiring) is assertable from the orchestrator suite. No chore bypass.

**Test Files:**
- `joust/tests/scaffold.test.ts` — AC-1 + AC-3. Joust-internal config contract: port 5279 + strictPort on server AND preview, base `/`, no sibling port anywhere in the config, sibling-verbatim npm scripts, resolved (not declared) Vite 8 / Vitest 4 majors, tsconfig strict covering `src` and `tests`, index.html booting `src/main.ts` into a `<canvas>`, `src/core` + `src/shell` skeletons, fresh-checkout hygiene, and the ten-line deploy-r2 caller targeting bucket `arcade-joust`. Includes a **behavioural** strictPort test: occupy 5279, spawn the dev server, require a non-zero exit that names the port.
- `joust/tests/purity.test.ts` — AC-2. The core/shell boundary guard: 27 banned patterns over comment-stripped and string-stripped source, plus the one-way shell-import rule, swept over every `src/core/**/*.ts`. Backed by a fixture self-test matrix so the scanner cannot silently rot.
- `tests/joust-bootstrap.test.mjs` (orchestrator) — AC-4. justfile `games`/`subrepos`/`serve`, CLAUDE.md port row live not reserved, repos.yaml past pre-implementation. See Design Deviations.

**Tests Written:** 56 tests covering 4 ACs (50 in joust, 6 in the orchestrator)
**Status:** RED

- joust `npm test`: **22 failed / 28 passed (50)**. Every failure is missing implementation. The 28 passes are the purity scanner's own fixture self-tests plus the TEA-authored harness assertions.
- orchestrator `node --test tests/joust-bootstrap.test.mjs`: **6 failed / 1 passed**. The pass is the do-not-regress-the-existing-games guard, which is green now by design and must stay green.

**AC-2 proof of teeth (the temporary red run the AC asks for), run against the real tree and then removed:**

| Probe | `src/core/__probe.ts` content | Result |
|---|---|---|
| A | live `export const t = Date.now()` | **FAIL** — `core/__probe.ts crosses the core/shell boundary via: Date.now()` |
| B | the same tokens (`Date.now()`, `Math.random()`, `window.document`, `localStorage`) in **comments only**, plus a real `FRAME_HZ` constant | **PASS** — 18/18. The tempest comment-scanner trap is fixed on the real tree, not just in fixtures. |

Probe A also caught a defect in the ban list inherited from centipede — it reported *both* `Date.now()` and `Date aliasing (= Date)` for one line, because `= Date` is a textual prefix of `= Date.now()`. Tightened with a `(?!\s*[.(])` lookahead and regression-guarded; logged as a finding against centipede.

The probe directory was deleted; `src/` does not exist and the working tree is clean.

**Commits:**
- joust `chore/jt1-1-scaffold` — `3f7d528` *test: add failing tests for jt1-1 scaffold (RED)*
- orchestrator `main` (local, **not pushed**) — `8b4a815` *test(jt1-1): add failing orchestrator wiring tests for joust (RED)*

**Handoff:** To Dev for implementation (GREEN).
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (joust — committed to `chore/jt1-1-scaffold`):**
- `vite.config.ts` — base `/`, `port: 5279` + `strictPort: true` on **both** server and preview. No sibling port appears anywhere in the file (the donor comment naming centipede's pin was rewritten, not copied).
- `tsconfig.json` — centipede-verbatim: `strict`, `noUnusedLocals`, `include: ["src", "tests"]` so `tsc --noEmit` covers the suite.
- `index.html` — `<canvas id="game">` + `<script type="module" src="/src/main.ts">`.
- `src/core/frame.ts` — the pure skeleton: `FRAME_HZ = 8_000_000 / (512 * 260)` (the ROM's nap unit, per the design spec), `createState()`, `stepFrame()`. No clock, no entropy, no browser surface, no shell import.
- `src/shell/timebase.ts` — `pumpFrames()`: the shell accumulates wall seconds and drains them into whole core steps.
- `src/main.ts` — shell entry: canvas + rAF loop, wall-clock baseline on first frame, 0.25 s catch-up clamp so a tab-away cannot replay minutes of frames.
- `.github/workflows/deploy.yml` — ten-line caller of `slabgorb/arcade/.github/workflows/deploy-r2.yml@main`, `bucket: arcade-joust`, `secrets: inherit`, push-to-`main` only.
- `tests/scaffold.test.ts` — **one TEA assertion rewritten** (see Design Deviations).

**Files Changed (orchestrator — EDITED, DELIBERATELY UNCOMMITTED for SM at finish):**
- `justfile` — joust added to `games` and `subrepos`; `serve` announces and launches it on 5279.
- `CLAUDE.md` — port table row 5279 now `http://localhost:5279/` (was "reserved — no scaffold yet"); roster drops the "pre-implementation" label; the seven-subrepos sentence updated to eight.
- `.pennyfarthing/repos.yaml` — joust gains `dev_command` / `build_command` / `test_command`; notes moved from "Pre-implementation … port 5279 reserved" to "Implementation underway — epic jt1 active … Served on port 5279".

**Tests:** GREEN.
- joust `npm test`: **51/51 passing** (2 files) — up from TEA's RED 22 failed / 28 passed. The 51st test is the `it.each` sweep instantiating over the one core module that now exists.
- orchestrator `node --test tests/joust-bootstrap.test.mjs`: **7/7 passing** — up from RED 6 failed / 1 passed.
- The behavioural strictPort test genuinely executes: it occupies 5279, spawns vite, and vite exits non-zero naming the port (170 ms).
- The two pre-existing reds in `tests/extract-audio.test.mjs` are untouched and not mine — TEA proved them pre-existing (develop-red misattribution trap).

**Build (AC-1, run by hand per TEA's finding that nothing in the suite runs one):**
`npm run build` → **exit 0**. `tsc --noEmit` clean, `vite build` transformed 7 modules → `dist/index.html` (0.48 kB) + `dist/assets/index-*.js` (1.42 kB) in 22 ms. Re-run after the final tree state; still green.

**AC-2 proof of teeth — the demanded red run against the real tree:**

Poisoned `src/core/frame.ts` with `export const poison = Math.random() + Date.now()`, ran `npm test`:

```
 ❯ tests/purity.test.ts (18 tests | 1 failed) 8ms
     × src/core/frame.ts stays inside the boundary 4ms

 FAIL  tests/purity.test.ts > src/core/ purity sweep (jt1-1 AC-2 — the boundary guard)
       > src/core/frame.ts stays inside the boundary
AssertionError: core/frame.ts crosses the core/shell boundary via: Date.now(), Math.random()
  — the deterministic sim owns no browser surface, clock, entropy, or shell import:
  expected [ 'Date.now()', 'Math.random()' ] to deeply equal []

 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 50 passed (51)
```

Note the failure names each ban **exactly once** — TEA's `(?!\s*[.(])` tightening works against the real tree, not just fixtures. Poison reverted; `npm test` back to 51/51; working tree clean of it.

**Branch:** `chore/jt1-1-scaffold` (joust) — pushed to origin.
**Commit:** `78d235b` *feat(jt1-1): joust scaffold — vite/ts/vitest on 5279, core/shell skeleton, CI deploy caller (GREEN)*

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 1 | reviewer-preflight | Yes | clean | joust 51/51, build exit 0, lint exit 0, tree clean, `git ls-files -- dist` empty; orchestrator 7/7; joust vs centipede resolved versions identical (ts 5.9.3 / vite 8.1.5 / vitest 4.1.10); scripts blocks identical key-for-key; `.gitignore` covers `dist/` + `node_modules/` | Accepted — independently re-run by Reviewer from a **fresh clone**, which is stronger evidence than an in-place run. No issues. |
| 2 | reviewer-rule-checker | Yes | clean | No config drift vs centipede (only port 5279, bucket `arcade-joust`, title/comment renames differ). **Zero sibling leakage** in any config file — every port/bucket/name hit is a test fixture or docs prose. `package.json` name = joust; `<title>` = Joust; repos.yaml joust block has every field centipede's has; `branch_strategy: gitflow` correct; orchestrator still literal `trunk-based`. `src/main.ts` at `src/` root matches centipede's convention. Missing `@arcade/shared` is the documented jt1-5 deferral, not an oversight. | Accepted in full. Spot-checked the two load-bearing claims myself (main.ts placement across four siblings; deploy.yml vs centipede line-by-line) — both confirmed. |
| 3 | reviewer-edge-hunter | Yes | findings | `pumpFrames` unguarded for NaN (poisons accumulator permanently, sim freezes silently), negative dt (stall), and unbounded dt (clamp lives only at the call site); `main.ts:37` `Math.min` bounds only the upper side; `stepFrame` returns a fresh literal instead of spreading state; float drift in the accumulator; `@main` mutable workflow ref | Partially accepted. **Confirmed + filed (LOW):** the NaN/negative/unbounded `pumpFrames` cluster — real, but unreachable today (rAF supplies a monotonic `DOMHighResTimeStamp`), so it is a latent trap for the next caller, not a live defect. **Dismissed:** `stepFrame` non-spread — the design spec replaces this skeleton wholesale with a ROM-shaped tagged-union process list at jt1-4/jt1-5, and spreading would be wrong for that model; 3-line placeholder. **Dismissed:** float drift — standard fixed-timestep accumulator, and the ROM's own timebase is the authority. **Note only:** `@main` is identical in all seven siblings; fleet convention, out of scope for a 2pt scaffold. |
| 4 | reviewer-test-analyzer | Yes (late — 472 s) | findings | Independently reproduced the Reviewer's two stripper false negatives **and found a worse third**: the block-comment regex (`purity.test.ts:50`) scans the file as flat text, so a `/*` inside an ordinary string swallows everything up to the next real `*/` **anywhere later in the file**, deleting unrelated legitimate violations. Also: every call-anchored ban is evadable by aliasing (`const { random } = Math`, `const readClock = Date.now`); `scaffold.test.ts:273` duplicates purity's core-file check but non-recursively (will go red when core gains subdirectories, while the purity sweep keeps working); the port/strictPort assertions count matches file-wide rather than per-block; the strictPort test has a TOCTOU race when an external checkout holds 5279. | Accepted — and **the three load-bearing claims were re-verified by the Reviewer through execution**, not taken on report: cross-line `/*` swallow → **MISSED** (confirmed), `const { random } = Math; random()` → **MISSED** (confirmed), `const readClock = Date.now; readClock()` → **MISSED** (confirmed), plain `Math.random()` control → CAUGHT. Folded into the top MEDIUM finding, which was upgraded in scope as a result. The `scaffold.test.ts:273` recursion divergence and the file-wide counting are filed as LOW. The TOCTOU race is accepted as **by design** — `occupy()`'s fallback is a deliberate accommodation of this repo's documented multi-checkout port trap; making it hard-fail would red the suite for anyone running a sibling checkout, which is the worse trade. |

**All received: Yes** — 4 of 4 specialists returned results (reviewer-test-analyzer arrived late, at 472 s, after an earlier file-size check wrongly suggested it had stalled; its findings are incorporated above and its three load-bearing claims were re-verified by execution).

## Reviewer Assessment

**Verdict:** APPROVED

**Verification is first-hand.** Every claim below was re-run by the Reviewer, not read off the Dev/TEA reports.

**AC-1 — proven from a genuine fresh checkout, which nobody had done.** Cloned `chore/jt1-1-scaffold` to a clean temp dir and ran the AC's literal sequence: `npm install` (48 packages, exit 0) → `npm run build` (`tsc --noEmit` clean, 7 modules → `dist/` 1.42 kB, exit 0) → `npm test` (**51/51 passed**, exit 0). Tree clean afterwards; `git ls-files -- dist` empty. The 18 committed files are exactly what the scaffold needs — no gitignored file is load-bearing. `npm run lint` exit 0.

**AC-2 — teeth re-proven independently and pushed past what the AC asked.** Poisoning `src/core/frame.ts` reproduces Dev's recorded red exactly (`Date.now()`, `Math.random()`, each named once — TEA's `(?!\s*[.(])` tightening confirmed against the real tree). I then probed six globals nobody had tested: `performance.now()`, `new Date()`, `globalThis`, `setTimeout`, `crypto.getRandomValues`, `process.env` — **all six CAUGHT**. The one-way shell-import rule fires on `import { pumpFrames } from '../shell/timebase'`. Critically, the sweep is **not vacuous**: removing the only core module fails the suite rather than passing silently, via an explicit guard (`tests/purity.test.ts:296-299`, "emptiness itself is a failure"). Two narrow false negatives found and filed as a non-blocking Gap — see Delivery Findings.

**AC-3 — the caller is thin and correctly wired.** `deploy.yml` is byte-identical to centipede's but for the two lines that must differ (`bucket: arcade-joust`, the `just release joust` comment). Verified against the *callee's* contract: `deploy-r2.yml` declares exactly one input, `bucket` (required, string) — joust supplies it and nothing else, so there is no missing-required-input failure waiting at first release. Local `deploy-r2.yml` matches `origin/main`, so `@main` resolves to what I read. The one real gap is the unprovisioned repo secret, filed for jt6.

**AC-4 — wiring verified green, with one sequencing hazard for SM.** `node --test tests/joust-bootstrap.test.mjs` → **7/7**. `node scripts/deps-doctor.mjs lobby centipede joust` → all OK, exit 0, so joust's deliberate lack of an `@arcade/shared` pin costs `just serve`/`install-all` nothing. CLAUDE.md's count arithmetic holds (five vector + two raster = the stated seven; the browser-subrepo sentence correctly moved seven → eight).

**Data flow traced end-to-end:** rAF `now` (the only external value in the whole scaffold) → `(now - last)/1000` clamped by `Math.min` to `MAX_CATCHUP_SECONDS` 0.25 (`main.ts:37`) → `pumpFrames` accumulator → at most **15** `stepFrame` calls per rAF tick (0.25 / 0.01664 = 15.02, computed) → `state.frame` → `ctx.fillText`. Bounded and safe: the loop cannot run away, the core never sees the clock, and the null-canvas and null-2d-context paths both throw explicitly (`main.ts:12,14`) rather than failing silently.

**Pattern observed (good):** `src/main.ts` sits at `src/` root rather than inside `src/shell/`. I checked this against centipede, tempest, lobby and asteroids — **all four do the same**. Sibling convention followed correctly, not drift.

**Error handling:** explicit throws on both boot-time null paths (`main.ts:12,14`); no swallowed errors anywhere in the diff; the strictPort test's `occupy()` helper handles the multi-checkout trap deliberately (`scaffold.test.ts:111-115` — if another checkout already holds 5279 it proceeds rather than failing, since the collision it needs exists either way) and carries an explicit `25_000` ms timeout, so the GitHub-slow-runner trap that bit tempest's first release is already pre-empted.

**Sibling leakage — [RULE]:** none. No sibling port, bucket, or game name appears in any joust config file. Every hit is in test fixtures (the forbidden-value lists the guard asserts against) or docs prose.

**Project-rule compliance — [RULE]:** every applicable rule checked and clean. The `src/core` vs `src/shell` split ("the single most important rule in every game repo") is present **and actively enforced**, not directory theater — I probed the enforcement rather than reading it. `base: '/'` + `strictPort` on both server and preview per the port rule. `repos.yaml` carries `branch_strategy: gitflow` for joust (correct for a game subrepo) while the orchestrator's own block still reads the literal string `trunk-based` — the exact spelling the pf branch-protection hook compares against, so direct sprint commits to orchestrator `main` keep working. joust's `repos.yaml` block has every field centipede's has, none missing. The CI caller matches the reusable-workflow rule byte-for-byte but for the bucket. The one deliberate rule departure — no `@arcade/shared` git-URL pin — is the SM-ruled jt1-5 deferral, corroborated in the design spec, and `deps-doctor` tolerates it (verified, exit 0). No rule-matching finding was dismissed.

**Baseline reds correctly attributed:** the two `tests/extract-audio.test.mjs` failures are not this story's. jt1-1 touches only a new test file plus `justfile`/`CLAUDE.md`/`repos.yaml` — none of which that suite reads — so it cannot have caused them. TEA's non-attribution stands.

### Deviation rulings

| Deviation | Ruling | Rationale |
|---|---|---|
| Dev edited TEA's `does not commit build output` (filesystem-absence → `git ls-files -- dist`) | **ACCEPTED** | Not merely acceptable — **necessary**. TEA's assertion was unsatisfiable against AC-1's own build-then-test order, and the reusable CI workflow runs `npm ci → npm run build → npm test` in exactly that order, so the original form would have turned **the first real deploy red**. Teeth verified first-hand: `git add -f dist` fails the test, `git reset` restores it. The rewrite asserts what "not committed" actually means. |
| TEA bootstrapped `package.json` + lockfile in RED | **ACCEPTED** | Unavoidable in a pre-implementation repo — there was no way to *run* a failing test. Correctly scoped to harness only; rb1-1/cp1-1 precedent. Resolved versions match centipede exactly (typescript 5.9.3, vite 8.1.5, vitest 4.1.10) and the scripts block is identical key-for-key. |
| TEA wrote the AC-4 orchestrator test in RED despite SM scoping it to Dev | **ACCEPTED** | The alternative was AC-4 shipping with **no gate at all**, or self-gated in one commit as cp1-1 did. Writing the gate before the wiring is the point of the phase. Keeping it local-and-unpushed was the right call — no sibling checkout ever sees the red. |
| TEA's two beyond-AC-4 assertions (CLAUDE.md roster label, repos.yaml commands); Dev kept them | **ACCEPTED** | Both are one-line doc edits in the file every agent primes from, and a stale "pre-implementation" label is precisely how a later story re-derives a wrong assumption. Cheap, correct, and they close a real staleness vector. |

### Findings by severity

| Severity | Issue | Location | Disposition |
|---|---|---|---|
| MEDIUM | Purity scanner has **five** confirmed false negatives — worst is a `/*` inside a string silently disabling the guard for everything up to the next real `*/` later in the file; plus `//`-in-string, `${…}` interpolation, and aliasing evasion of every call-anchored ban | `joust/tests/purity.test.ts:50,51,63,76` | Non-blocking (core is 28 trivially-pure lines; fleet-wide pattern, not a jt1-1 regression). **Hard gate before jt1-5.** Recommend SM file as a tracked story. |
| LOW | `scaffold.test.ts:273` duplicates purity's core-file check non-recursively — goes red when core gains a subdirectory; port/strictPort assertions count file-wide, not per-block | `joust/tests/scaffold.test.ts:71,97,273` | Non-blocking. Fold into the same cleanup. |
| MEDIUM | No `CLOUDFLARE_API_TOKEN` on `slabgorb/joust`; reusable workflow requires it | `slabgorb/joust` repo secrets | Non-blocking here (AC-3 cuts no release). jt6 prerequisite. |
| LOW | Dev's Delivery Finding cites `centipede/tests/scaffold.test.ts`, which does not exist | session Delivery Findings | SM to correct or drop before archiving. |
| LOW | `pumpFrames` unguarded for NaN / negative / unbounded dt; clamp lives only at the call site | `joust/src/shell/timebase.ts:15-26` | Non-blocking. Unreachable today; fold a clamp in at jt1-5. |
| LOW | `uses: …@main` is a mutable ref | `joust/.github/workflows/deploy.yml:10` | Note only — fleet-wide convention, identical in all siblings. |

No Critical and no High. AC-1 through AC-4 all satisfied and independently verified.

**Handoff:** To SM for finish-story.