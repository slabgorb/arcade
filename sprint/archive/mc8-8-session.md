---
story_id: "mc8-8"
jira_key: "mc8-8"
epic: "mc8"
workflow: "tdd"
---
# Story mc8-8: just serve is silent: the POKEY worklet fails to load in Vite dev

## Story Details
- **ID:** mc8-8
- **Jira Key:** mc8-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc8-8-dev-serve-pokey-worklet
- **PR:** https://github.com/slabgorb/arcade/pull/183

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T23:58:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T23:32:06Z | 2026-08-09T23:33:30Z | 1m 24s |
| red | 2026-08-09T23:33:30Z | 2026-08-09T23:42:18Z | 8m 48s |
| green | 2026-08-09T23:42:18Z | 2026-08-09T23:48:00Z | 5m 42s |
| review | 2026-08-09T23:48:00Z | 2026-08-09T23:58:04Z | 10m 4s |
| finish | 2026-08-09T23:58:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking):** star-wars does NOT load a runtime POKEY worklet — it plays
  pre-baked SFX files. The `plugins/star-wars/tools/pokey-bake/vendor/pokey.js` it
  "shares" is consumed at BUILD time by `bake-sfx.mjs` (Node VM), not served. So
  missile-command is the *only* runtime `addModule` consumer. The "no star-wars
  regression" constraint therefore means: do not MOVE the vendored file (breaks the
  bake tool), and do not break star-wars dev-serve — NOT "keep a shared runtime worklet
  working". Guarded by AC2.
- **Improvement (non-blocking):** In `vite.config.ts`, the child server is created with
  `...defineAppConfig({ id }), server: { middlewareMode: true, hmr: {...} }` — the second
  `server` REPLACES the first. An `fs.allow` added to `defineAppConfig`'s server block
  would be silently dropped for the middlewareMode children. Dev: add it in the child
  spread (or restructure to merge). Flagging so the fix lands where it takes effect.

### Reviewer (code review)

- **Improvement** (non-blocking): `fs.allow: [root]` is broader than the narrowest fix
  (the one vendored dir). It is well-justified (restores the monorepo default; also un-breaks
  latent `@shared` dev-serving — the pre-change per-plugin default 403'd those too) and
  dev-only/loopback, so it is APPROVED as-is. Affects `vite.config.ts` (no change required).
  If a secret file is ever added under repo root, add it to `server.fs.deny` explicitly —
  the widened allow would otherwise expose it on the loopback dev server. *Found by Reviewer.*
- **Improvement** (non-blocking): the AC1 failure-hint string in
  `tests/mc8-8-dev-serve-worklet.test.mjs` says "extend the **missile-command** child server's
  fs.allow"; the fix is per-app (every game's child). Cosmetic — it is a diagnostic message,
  not an assertion, and still points at the right file. Optional reword to "per-app child
  server's fs.allow". *Found by Reviewer.*
- **Process note** (non-blocking): the `reviewer-comment-analyzer` subagent ran a stray
  `git stash pop` during investigation and self-repaired it; the working tree is verified
  clean, but a DUPLICATE stash now exists (`stash@{0}` == `stash@{1}`, both the unrelated
  `feat/mc4-1` WIP). Not my data to drop unprompted — flagging so it can be cleaned with
  `git stash drop stash@{0}` if desired. *Found by Reviewer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Dev (green):** No deviation from TEA's plan. Fixed exactly at the layer TEA named —
  the middlewareMode child server block in `vite.config.ts` — by adding
  `fs: { allow: [root] }`. Chose the repo root (not just the one vendored file) because
  each child is artificially rooted at `plugins/<id>/`, and that repo-root allow-list
  restores the monorepo default a single-root Vite would have had: any in-tree shared
  asset (this worklet, `@shared`, …) becomes serveable, so the next cross-app asset does
  not re-open this bug. Dev-only (`apply: 'serve'`, 127.0.0.1); no build/preview/prod
  effect. `audio.ts` NOT touched (mc8-3 BLOCK 1 honored).

### Reviewer (audit)

- **Dev (green) — chose repo root over the single vendored dir** → ✓ ACCEPTED by Reviewer:
  the broader allow is the correct monorepo default (Vite's `searchForWorkspaceRoot` found no
  workspace markers, so the pre-change default really was plugin-scoped — confirmed by
  reviewer-security and mutation-verified by reviewer-rule-checker), it is dev-only
  (`apply: 'serve'`, 127.0.0.1), `fs.deny` still blocks `.env`/`.git`/credentials on top, and
  no secrets exist in-tree. `audio.ts` untouched, so mc8-3 BLOCK 1 holds. No undocumented
  deviations found: `git diff develop...HEAD` is exactly `vite.config.ts` + the new test +
  the context stub.

## Dev Delivery Findings

- **Scope note (non-blocking):** mc8-8's AC is that the worklet *loads* under `just serve`
  (killing the `AbortError`). Proven: the resolved URL now returns 200 `text/javascript`
  carrying `registerProcessor('POKEY', …)`. Full end-to-end *audibility* (the human offline
  smoke test → hosting.md) is mc8-3's BLOCK 2 record, not mc8-8's — and the worklet module
  is byte-identical to the one mc8-3 verified audible in the build (peak 0.157), now served
  same-origin in dev. So the dev-vs-build divergence this story existed to close is closed.

## Tea Assessment

**Phase:** finish complete. One new orchestrator test file, `tests/mc8-8-dev-serve-worklet.test.mjs`.

### Acceptance Criteria (defined this phase — the story YAML carried none)

- **AC1 (the RED work):** Under `just serve` (the one cabinet vite dev server), the POKEY
  worklet URL that missile-command's audio module resolves must load **same-origin as
  JavaScript** — `200`, a JS content-type, and the real vendored worklet body
  (`registerProcessor('POKEY', …)` over an `AudioWorkletProcessor`). It must NOT be Vite's
  `403 "outside of Vite serving allow list"` page, which is what `audioWorklet.addModule()`
  currently chokes on (`AbortError`), leaving MC silent in dev.
- **AC2 (no star-wars regression — regression LOCK, green on arrival):** The shared
  `plugins/star-wars/tools/pokey-bake/vendor/pokey.js` stays in-tree (the fix must not MOVE
  it — star-wars' bake tool reads it there), and `/star-wars/` still serves `200` after the
  vite.config change.

### RED evidence (measured 2026-08-09, cabinet vite on a spare 54xx port)

- AC1 **FAILS** (clean assertion, not a crash): the resolved worklet URL
  `/missile-command/@fs/…/star-wars/tools/pokey-bake/vendor/pokey.js` → **403** "outside of
  Vite serving allow list" (allow list = the child's own root only). Exit 1.
- AC2 **PASSES** on arrival — it is the guard that must stay green through the fix.

### Why an orchestrator (dev-server) test, not a vitest project test

The defect is in how the ONE cabinet dev server serves a cross-app `@fs` asset, not in any
app's source (audio.ts is correct and mc8-3 pins its shape). Per-app vitest projects are
rooted at `plugins/<id>/` and never spin the cabinet server, so they can't see this. This
suite spawns the real `node_modules/.bin/vite` at root — the same harness as
`tests/canonical-serve.test.mjs` — and tests the ACTUAL browser load path (the exact URL
handed to `addModule`), because a green test next to a silent worklet proves nothing.

### The fix is constrained (Dev, read before touching audio.ts)

- **mc8-3 BLOCK 1 forbids** rewriting audio.ts to `?worker`/`?url` imports, or introducing
  any `http(s)://` / `fetch()` / baked-media (`.wav/.mp3/.ogg`) detour. audio.ts must keep
  `new URL('…pokey.js', import.meta.url)`. My non-vacuity guard reddens if that shape is
  removed, so the two tests agree.
- The layer to touch is the **child server config in `vite.config.ts`** — extend
  `server.fs.allow` so the shared vendored worklet is reachable. See my Delivery Finding
  about the child `server:` spread overriding `defineAppConfig`'s server block.
- Do **not** MOVE `pokey.js` into missile-command (breaks star-wars' bake tool; AC2 stats it).

### Rule Coverage (`.pennyfarthing/gates/lang-review` + project rules)

- **CLAUDE.md — dev must not drift from build:** AC1 pins the dev-serve behaviour against the
  build behaviour mc8-3 already verified (worklet resolves same-origin, peak 0.157).
- **Project memory "the video IS the game" / "assets verified live, not assumed":** the test
  fetches the real URL and asserts real worklet bytes, not a source-string or a mock —
  @shared/audio degrades silently, so a status-only or mock test would false-green.
- **Anti-vacuity (test-quality rule):** the worklet URL is extracted from the served module
  (guards against the reference being removed); the `403` page is explicitly excluded; AC2's
  file-existence check has a concrete on-disk target. No `let _ =`, no `assert(true)`.
- **arcade is desktop-only:** no viewport/phone assertions; the concern is keyboard/mouse
  dev-serve audio.
- **Port pin discipline:** the test uses a spare 54xx port, never 5270, so a sibling checkout
  holding the pin cannot flake it.

### Handoff → Dev (Yoda)

RED is real and minimal. Implement the smallest `vite.config.ts` change that makes AC1 go
green while keeping AC2 (and mc8-3, and the full orchestrator + missile-command/star-wars
vitest suites) green. Do not edit audio.ts.

## Sm Assessment

**Story:** mc8-8 (3pt, bug, tdd) — POKEY worklet fails to load under `just serve` in Vite
dev, so missile-command audio is silent at `/missile-command/`. The production build is
fully audible (mc8-3: worklet resolves same-origin, POKEY output peak 0.157); the failure
is dev-only — the worklet is fetched via an `@fs`-style URL and Vite throws
`AbortError: Unable to load a worklet's module`.

**Scope for TEA (RED phase):**
- The fix must make the vendored POKEY worklet load under the dev server (candidate
  approaches: Vite `?worker` / `?url` import, or `public/` placement) so MC audio is
  audible under `just serve`.
- **Hard constraint — no star-wars regression.** star-wars shares the same vendored
  worklet at `plugins/star-wars/tools/pokey-bake/vendor/pokey.js`. Any change to the
  worklet's resolution/placement must keep star-wars audio working in both dev and build.
- The bug is a dev-server-vs-build divergence (see CLAUDE.md: one `defineAppConfig(<id>)`
  feeds both serve and build). A test seam should exist that a human invokes — verify the
  actual load path, not just a unit; a green test next to a silent worklet is worthless.

**Verification note:** arcade is desktop-only; audio verification is keyboard/mouse-driven,
not a phone concern. `just serve` pins 127.0.0.1:5270 — confirm whose tree answers before
trusting any dev-server screenshot.

**Routing:** phased tdd → hand off to TEA (Han Solo) for the RED phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (lint exit 0, story test 2/2, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (low) | confirmed 1 (non-blocking, cosmetic), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 (low) | confirmed 1 (non-blocking, defense-in-depth), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 39 rules | N/A (2 non-blocking notes) |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A 3-point dev-server bug fix: one property (`fs: { allow: [root] }`) added to the
middlewareMode child-server block in `vite.config.ts`, plus a non-vacuous behavioural
orchestrator test. The fix resolves the measured `403 "outside of Vite serving allow list"`
that made `audioWorklet.addModule()` throw `AbortError` and left missile-command silent
under `just serve`. No Critical/High findings; the two confirmed findings are LOW and
non-blocking. Proportional to a bug fix of this size — approving.

**Data flow traced:** the browser resolves the worklet URL from the Vite-transformed
`/missile-command/src/shell/audio.ts` (`new URL('…pokey.js', import.meta.url)` → an `/@fs/`
path) → the missile-command child dev server → `server.fs.allow`. Pre-fix the allow-list was
the plugin's own root only, so the `/@fs/` escape → 403 HTML → `addModule` `AbortError` →
silence. Post-fix the allow-list is the repo root → 200 `text/javascript` carrying
`registerProcessor('POKEY', …)` → `addModule` registers the processor. Build path untouched
(`apply: 'serve'`), so no dev/build drift.

### Observations (dispatch tags for the gate)

- `[SEC]` **LOW / non-blocking** — widening `fs.allow` to the repo root broadens the
  loopback dev server's readable set from one plugin to the whole tracked tree. NOT
  exploitable: `fs.deny` (untouched — `.env*`, `*.{crt,pem,key,…}`, `.npmrc`, `**/.git/**`)
  takes precedence over `allow` (verified in Vite internals by the subagent), no secrets
  exist in-repo, and it is dev-only + `127.0.0.1`. Suggestion captured: if a secret is ever
  added under root, add it to `fs.deny`. `vite.config.ts:165`.
- `[DOC]` **LOW / non-blocking** — the AC1 failure-hint string says "missile-command child
  server" though the fix is per-app; a diagnostic message, not an assertion, still true and
  points at the right file. Cosmetic. `tests/mc8-8-dev-serve-worklet.test.mjs:145`.
- `[RULE]` **VERIFIED clean** — reviewer-rule-checker found 0 violations across 39 TS+JS
  checklist rules and 4 project ADDITIONAL_RULES (27 instances), and MUTATION-VERIFIED the
  test (spawned Vite against the pre-fix config → 403; current → 200). The guard is not
  vacuous.
- `[EDGE]` disabled this run — I checked boundaries myself: the readiness poll is bounded
  (100×100ms) and fails loudly with server output on timeout; the worklet-URL extraction has
  an explicit non-vacuity assertion if the `new URL(…pokey.js…)` reference is ever absent.
- `[SILENT]` disabled this run — I checked myself: the only swallow is the pre-existing,
  documented teardown `child.close().catch(() => {})` OUTSIDE this diff; the test's
  `catch { setTimeout }` is an intentional retry, not an error swallow, backed by a loud
  `assert.notEqual(ready, null, …)`.
- `[TEST]` disabled this run — I checked myself: AC1 asserts exact status, JS content-type,
  two positive body markers AND an explicit anti-false-green `doesNotMatch` on the 403 page,
  against the REAL served module (not a mock, not `dist/`). AC2 uses a real `existsSync` +
  real `/star-wars/` fetch. RED→GREEN transition was witnessed (403→200).
- `[TYPE]` disabled this run — I checked myself: no `as any`/`as unknown`, no non-null
  assertion; `fs.allow` is `string[]` via Vite's `ServerOptions`, `root` is a typed string.
- `[SIMPLE]` disabled this run — I checked myself: the change is the minimal one property;
  the comment is long but load-bearing (each claim was independently verified by
  comment-analyzer). No dead code, no over-engineering.
- `[VERIFIED]` audio.ts untouched — `git diff develop...HEAD -- plugins/missile-command/src/shell/audio.ts`
  is empty, so mc8-3 BLOCK 1's `new URL(…, import.meta.url)` / no-`fetch`/no-`http(s)` guard
  is preserved. Complies with the "dev must not drift from build" convention (CLAUDE.md).
- `[VERIFIED]` fix is dev-only — `serveTheCabinet()` is `apply: 'serve'` (`vite.config.ts:117`),
  and `configureServer` is a serve-only hook; production (R2 static) never runs this path.
- `[VERIFIED]` change scoped to children only — exactly one `fs: { allow` added, inside the
  child block; the lobby/parent config is untouched.

### Rule Compliance (lang-review typescript.md + javascript.md + project rules)

- **TS #1 type-safety escapes:** compliant — no `as any`/`as unknown`/`@ts-ignore`/`!`.
- **TS #9 build/config concerns (fs.allow):** compliant — dev-only, loopback, `fs.deny`
  intact; no `strict`/`skipLibCheck`/`sourceMap`/`outDir` touched.
- **JS #6 Node spawn:** compliant — `spawn()` with an args array (no shell string), port is
  internal.
- **JS #7 regex safety:** compliant — all four regexes are linear, no ReDoS, no stateful `g`.
- **JS #8 / TS #8 test quality:** compliant — non-vacuous, real behaviour, no mocks, no
  `.only/.skip`, not importing `dist/`.
- **JS #4 equality:** compliant — `node:assert/strict` remaps `.equal` to `===`.
- **Project: dev-not-drift-from-build:** compliant — fs.allow is serve-only, not in
  `defineAppConfig` (shared by build).
- **Project: no-vacuous behavioural guard:** compliant — mutation-verified 403→200.
- **Project: port-pin discipline:** compliant — spare 54xx port, never 5270.
- **Project: mc8-3 BLOCK 1:** compliant — audio.ts untouched.

### Devil's Advocate

Let me argue this is broken. First, the security angle: `fs.allow: [root]` opens the entire
repo to the dev server's `/@fs/` route — a malicious page open in the developer's browser
during `just serve` could, via a DNS-rebinding-style probe against `127.0.0.1:5270`, read any
tracked source file. Could it read a secret? Only if a secret lived under root AND escaped
`fs.deny`. Today there are none (grep + filesystem scan both empty), and `fs.deny` blocks
`.env*`, credential extensions, `.npmrc`, and `.git` regardless of `allow` — verified in
Vite's own `isFileLoadingAllowed`, which checks deny BEFORE allow. So the worst case is
disclosure of already-local, non-secret source over loopback in dev. Real, but low, and I've
recorded the mitigation (add future secrets to `fs.deny`). Second, correctness: does allowing
root mask a deeper problem — should the worklet instead be same-tree? mc8-3 BLOCK 1 forbids
the `?worker`/`?url` rewrite that would make it same-tree, and moving `pokey.js` would break
star-wars' bake tool (AC2 stats it). So the dev-server layer IS the correct seam. Third, the
test: could it false-green? A status-only check would (the 403 page is also served at 200 in
some fallbacks), but AC1 pins content-type, two positive worklet markers, AND excludes the
403 page text — and rule-checker mutation-verified 403→200, so the guard genuinely catches
the regression. Could the readiness poll flake and pass vacuously? No — on timeout it
`assert.notEqual(ready, null, …)` fails loudly with server output. Fourth, breadth: allowing
root is broader than strictly needed; a confused future dev might think it's a security hole.
The load-bearing comment and this record explain why it is safe and correct. Fifth, what a
stressed filesystem/port collision does: `strictPort` makes a 54xx collision fail loudly, not
silently serve the wrong tree. Nothing here rises to blocking. The change is small, correct,
well-tested, and well-documented.

**Handoff:** To SM for finish-story.