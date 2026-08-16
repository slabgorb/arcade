---
story_id: "ml10-4"
jira_key: "ml10-4"
epic: "ml10"
workflow: "tdd"
---
# Story ml10-4: Capture the mouse via pointer lock in millipede

## Story Details
- **ID:** ml10-4
- **Jira Key:** ml10-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml10-4-capture-mouse-pointer-lock
- **PR:** https://github.com/slabgorb/arcade/pull/438

## Story Context

**Objective:** Implement pointer-lock mouse capture in millipede, mirroring centipede's `createPointerLock` pattern from `plugins/centipede/src/shell/input.ts`.

**Technical Approach:**
1. Click-to-lock the canvas via `requestPointerLock` API
2. Hide the cursor during lock for unbounded `movementX/Y` trackball deltas
3. Attach a `pointerlockchange` listener to reset input accumulators on lock exit (Escape/blur) to prevent runaway travel
4. Preserve millipede's existing negated-horizontal mouse mapping (`main.ts:94-99`)
5. Implement shell-only (core stays DOM/clock-free)
6. Create a duck-typed adapter unit-tested like centipede's implementation
7. Add a HUMAN pointer-lock smoke test annotation (note: cannot be verified headless)

**Reference Pattern:** `plugins/centipede/src/shell/input.ts` — reuse its adapter design for a duck-typed implementation.

**Acceptance Criteria:**
- Canvas responds to click-to-lock via `requestPointerLock`, hiding the cursor
- Unbounded `movementX/Y` deltas are captured during lock for trackball-style control
- `pointerlockchange` listener correctly resets input accumulators when lock exits (Escape or blur)
- Millipede's existing negated-horizontal mouse mapping is preserved after pointer lock
- Shell-only implementation with no changes to core simulation code
- Unit tests mirror centipede's adapter pattern with duck-typed contract
- HUMAN smoke test documented (note: headless verification not possible)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T00:02:07Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T23:22:02Z | 2026-08-15T23:23:34Z | 1m 32s |
| red | 2026-08-15T23:23:34Z | 2026-08-15T23:31:16Z | 7m 42s |
| green | 2026-08-15T23:31:16Z | 2026-08-15T23:35:51Z | 4m 35s |
| review | 2026-08-15T23:35:51Z | 2026-08-15T23:45:29Z | 9m 38s |
| red | 2026-08-15T23:45:29Z | 2026-08-15T23:51:51Z | 6m 22s |
| green | 2026-08-15T23:51:51Z | 2026-08-15T23:53:26Z | 1m 35s |
| review | 2026-08-15T23:53:26Z | 2026-08-16T00:02:07Z | 8m 41s |
| finish | 2026-08-16T00:02:07Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (blocking): `createPointerLock().request()` can REJECT on a synchronous throw from
  `canvas.requestPointerLock()` (async-fn semantics wrap it), contradicting its documented "never
  rejects (R4)" contract — this is the root cause of 11 `TypeError: canvas.requestPointerLock is
  not a function` unhandled rejections in the millipede suite, which vitest flags as "might cause
  false positive tests." Affects `plugins/millipede/src/shell/input.ts` (wrap the call so a sync
  throw also routes to `onReject`, making the R4 guarantee hold universally). *Found by Reviewer.*
- **Gap** (blocking): the 5 `main.ts` wiring tests are source-text presence checks, not behavioural
  — deleting `void pointerLock.request()` (dead wiring, the exact bug class this "wire the
  built-but-dead seams" epic targets) leaves all 20 tests green. Affects
  `plugins/millipede/tests/pointer-lock.test.ts` + `tests/helpers/boot-shell.ts` (assert
  `requestPointerLock` is actually invoked after a `pointerdown` via the boot harness).
  *Found by Reviewer (test-analyzer).*
- **Improvement** (non-blocking): cursor-hide is only string-matched; `boot-shell.ts` gained
  `style: {}` but no test asserts `canvas.style.cursor === 'none'` after boot. *Found by Reviewer.*
- **Improvement** (non-blocking): stale comment citations — `shell/input.ts:31` ("Signs follow
  main.ts:94-99 exactly") and `pointer-lock.test.ts:146,159` ("main.ts:99/100 accDh/accDv") point
  at code THIS diff retired; the imprecise R5 comment at `main.ts:57` bundles Escape/blur and
  claims "no blur fires." *Found by Reviewer (comment-analyzer + rule-checker #24/#17).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA] Extract, don't wire-inline.** The spec's "duck-typed adapter unit-tested like
  centipede's" + "reset the accumulators on lock exit" is only node-testable if millipede's
  mouse handling leaves `main.ts` module scope. RED therefore pins a NEW
  `plugins/millipede/src/shell/input.ts` (millipede has none — its `core/input.ts` is the pure
  TBLMT model, not shell) exporting `createMouseAdapter` + `createPointerLock`, mirroring
  centipede's `shell/input.ts`. `main.ts`'s inline `pointermove`+accumulators (main.ts:74-101)
  move behind that module. This is the intended shape of the story, not a scope change, but it is
  a larger edit than "add a listener" — logged so Dev/Reviewer see it was deliberate.
- **[TEA] Runtime-built dynamic-import specifier.** `loadInput()` builds the module path at
  runtime (`['..','src','shell','input'].join('/')`) so `tsc` cannot statically resolve a
  module GREEN has not created yet — otherwise the repo-wide `npm run lint` (the only type check
  in the CI/release path) goes TS2307-red at RED. The test still REDs at runtime ("Cannot find
  module"); vite resolves the same specifier once `shell/input.ts` lands.

- **[Dev] Corrected one over-specified RED assertion.** The main.ts wiring test
  `requests pointer lock through the createPointerLock controller` originally required BOTH
  `createPointerLock` AND the literal `requestPointerLock` in main.ts. The story mandates driving
  the lock THROUGH the controller (mirroring centipede), which ENCAPSULATES `requestPointerLock` in
  shell/input.ts — so the raw call only appears in main.ts if the controller is bypassed (less
  faithful). Dropped the `requestPointerLock` clause; `createPointerLock` remains the seam, and the
  raw call is proven by the `request() calls canvas.requestPointerLock()` unit test. Matches
  centipede's own main-loop.test.ts (cp2-2), which pins createPointerLock, not the raw call. Not
  test-gaming: behaviour coverage is unchanged.
- **[Dev] boot-shell mock canvas gained `style: {}`.** main.ts now hides the cursor
  (`canvas.style.cursor = 'none'`); the shell-boot mock canvas had no `style`, so
  audio-gesture-gate + player-sprite (which boot the real main.ts) threw. A real canvas element
  always carries a style object — added it to the stub rather than guarding production code against
  a test-only shape.

### Reviewer (audit)
- **[TEA] Extract, don't wire-inline** → ✓ ACCEPTED by Reviewer: correct — the story's "duck-typed
  adapter unit-tested like centipede's" is only node-testable extracted; mirrors centipede's
  shell/input.ts; core untouched (rule-checker #31/#32 confirm boundary + purity guard intact).
- **[TEA] Runtime-built dynamic-import specifier** → ✓ ACCEPTED by Reviewer: verified — tsc stays
  green and the specifier genuinely REDs at runtime when the module is absent (test-analyzer
  reproduced 15/20 RED on module deletion). Sound.
- **[Dev] Corrected one over-specified RED assertion** → ✓ ACCEPTED by Reviewer: dropping the raw
  `requestPointerLock` clause from the main.ts pin is correct (the controller encapsulates it;
  matches centipede's cp2-2 main-loop idiom). NOTE: the REPLACEMENT pin is still weak — see the
  blocking test-analyzer finding (presence, not behaviour). Accepted as far as it goes.
- **[Dev] boot-shell mock canvas gained `style: {}`** → ✓ ACCEPTED by Reviewer: a real canvas has
  `style`; honest fix. But the mock is now INCOMPLETE — it lacks `requestPointerLock`, which is
  what surfaces the 11 unhandled rejections (blocking finding above). Accept the `style` addition;
  the same mock needs `requestPointerLock` too.

## Dev Assessment (rework r1)

GREEN rework for the review REJECT. Commits `0377c5da` (TEA rework tests) + `a9aa9a6c` (this fix),
pushed. Both blocking findings resolved:

- **R4 universal (blocking):** `plugins/millipede/src/shell/input.ts` `request()` now wraps the
  `canvas.requestPointerLock()` call in try/catch — a synchronous throw routes to `onReject` and
  resolves, so "never rejects (R4)" holds for BOTH the returned-promise-rejection and the
  synchronous-throw paths. The two RED contract tests are now green.
- **Dead-wiring guard (blocking):** closed on the TEA side by the behavioural boot test
  (mutation-proven). The mock canvas now has `requestPointerLock`, which also eliminated the 11
  boot-time unhandled rejections (now 0).
- **Comment fixes (non-blocking):** `shell/input.ts:31` MouseDelta doc no longer cites the retired
  `main.ts:94-99`; `main.ts` R5 comment rephrased (Escape keeps focus; the listener clears
  regardless of cause).

**Verification:** full millipede suite green (82 files, **1360 tests**); **0 unhandled rejections**;
repo-wide `npm run lint` (tsc) clean. Ready for re-review (Heimdall).

## Dev Assessment

GREEN complete for ml10-4. Commit `8474ca6e` on `feat/ml10-4-capture-mouse-pointer-lock` (pushed).

**Implementation (shell-only; core untouched):**
- New `plugins/millipede/src/shell/input.ts` mirroring centipede's `shell/input.ts`:
  - `createMouseAdapter(target)` — aggregates `mousemove` movementX/Y into a drained-per-sample
    `{dh, dv}` with millipede's mapping: `dh -= movementX` (negated horizontal), `dv += movementY`
    (NOT negated — core COMP-reverses V). `?? 0` guards a missing axis. `reset()` + `dispose()`.
  - `createPointerLock(canvas, doc, onExit, onReject?)` — R4: `request()` swallows the
    requestPointerLock() rejection to the optional `onReject` sink and never rejects. R5: a
    `pointerlockchange` listener invokes `onExit` when `pointerLockElement` leaves the canvas.
    `dispose()` detaches it.
- `main.ts` rewired: imports both seams; `createMouseAdapter(document)` (pointer-lock movement
  events dispatch to the document); `canvas.style.cursor = 'none'`; a canvas `pointerdown` calls
  `pointerLock.request()` (click-to-lock); `onExit → mouse.reset()` (no runaway travel);
  `console.warn` on rejection. The frame loop drains `mouse.sample()` once per rAF into the first
  sub-step (replaces the old `accDh/accDv` module state).

**Verification:** all 82 millipede test files green (1353 tests, incl. the 20 new pointer-lock
tests); repo-wide `npm run lint` (tsc) clean. The live pointer-lock acquire remains a HUMAN smoke
test — headless browsers reject requestPointerLock, so it cannot be verified here.

Two test-side changes logged as Design Deviations above (over-specified-assertion correction +
mock-canvas `style`). Ready for the Reviewer (Heimdall).

## Tea Assessment (rework r1)

Red rework for the review REJECT. Commit `0377c5da`. Two blocking findings addressed from the
RED side + follow-ups:

- **[HIGH → closed] Dead-wiring gap.** Added a behavioural boot guard: `ShellHarness` now exposes
  `pointerLockRequests()` and `cursorStyle()`, and the mock canvas has a `requestPointerLock`
  (returns a resolved promise + records calls). New tests assert a canvas `pointerdown` ACTUALLY
  invokes `requestPointerLock` — **mutation-proven**: deleting `void pointerLock.request()` from
  main.ts now fails the test (it did not before). Cursor-hide is asserted behaviourally
  (`cursorStyle() === 'none'`). Side effect: the 11 boot-time `requestPointerLock is not a function`
  unhandled rejections are eliminated (the mock is now complete).
- **[HIGH → RED for Dev] R4 not universal.** Two unit tests are RED and drive the GREEN fix:
  `request()` must not reject on a SYNCHRONOUS throw from `canvas.requestPointerLock()`, and must
  route that throw to `onReject`. Today `request()` only guards the returned-promise rejection.
- **[follow-ups done in test]** negative-delta + mixed-sign mapping cases added; stale `accDh/accDv`
  citations repointed to `shell/input.ts` onMouseMove; RED-era header tagged.

**Remaining GREEN work for Dev (Loki):**
1. `plugins/millipede/src/shell/input.ts` `request()` — wrap the `canvas.requestPointerLock()` CALL
   so a synchronous throw is also caught and routed to `onReject`, making "never rejects (R4)" hold
   universally. This turns the 2 RED tests green.
2. Comment fixes: `shell/input.ts:31` — drop the stale "Signs follow main.ts:94-99 exactly"
   citation; `main.ts:57` — the R5 comment bundles Escape/blur and claims "no blur fires"; match
   shell/input.ts's phrasing (Escape keeps focus; the pointerlockchange listener clears regardless
   of cause).

State: 2 tests RED, 25 pass; repo `npm run lint` clean. Ready for Dev (GREEN).

## Tea Assessment

RED complete for ml10-4. New file `plugins/millipede/tests/pointer-lock.test.ts` (20 tests, all
failing) committed on `feat/ml10-4-capture-mouse-pointer-lock` (04069ddb). Verified: 15 unit tests
RED on runtime "Cannot find module '../src/shell/input'"; 5 `?raw` main.ts wiring pins RED on
assertions (no `createPointerLock`/`createMouseAdapter`/cursor-hide/`.reset(` in main.ts today).
Repo-wide `npm run lint` (tsc) stays GREEN.

**Coverage vs the story's clauses:**
- *Click-to-lock via requestPointerLock* → `createPointerLock.request()` calls
  `canvas.requestPointerLock()` exactly once; plus main.ts `?raw` pin for `createPointerLock`.
- *Hide the cursor* → main.ts `?raw` pin `cursor: 'none'` (HUMAN-only in the live browser).
- *Unbounded movementX/Y deltas* → adapter aggregates two +40 pushes to -80 (no screen-edge clamp).
- *pointerlockchange resets accumulators on lock exit (no runaway travel)* → `onExit` fires on EXIT
  only (not acquire, not still-locked); integration test wires `onExit → mouse.reset()` and asserts
  the accumulated delta clears WITH NO BLUR.
- *Preserve millipede's negated-horizontal mapping (main.ts:94-99)* → the discriminating pins:
  +movementX → NEGATIVE `dh` (== -movementX), and +movementY → POSITIVE `dv` (== +movementY). The
  second is the ONE axis that differs from centipede (which negates both) — a copy-paste of
  centipede's `dv -= movementY` fails it.
- *R4 rejection swallow + cp2-8 diagnostic sink* → `request()` never rejects; the reason reaches
  the optional `onReject` sink.
- *Duck-typed + dispose lifecycle* → duck-typed bus/doc/canvas; `dispose()` detaches all listeners.
- *HUMAN smoke test* → noted in the test-file header; headless rejects requestPointerLock, so the
  live acquire is the user's re-test, not asserted here.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`):**
- §4 Null/undefined — "missing movementX/Y as 0" pins `?? 0` (0 is a valid delta, so `|| 0` would
  be the bug); no NaN leaks into the trackball byte.
- Silent-failure (JS checklist) — the rejection is caught but ROUTED to `onReject`, not a black-hole
  `.catch(() => {})`; a test asserts the reason is delivered.
- §1 Type-safety — duck-typed interfaces throughout, no `as any`.
- Test quality — every test asserts a discriminating value (exact signs/magnitudes, exactly-once,
  drain-to-zero); no vacuous `is*`/`true` assertions; self-checked in Phase C.

Ready to hand off to Dev (Loki Silvertongue) for GREEN.

## Sm Assessment

Setup complete for ml10-4 (millipede pointer-lock capture, 3pts, tdd). Story context and ACs written; branch `feat/ml10-4-capture-mouse-pointer-lock` cut from develop. The spec is unusually detailed — the reference pattern (`plugins/centipede/src/shell/input.ts::createPointerLock`) and the mapping to preserve (`plugins/millipede/.../main.ts:94-99`) are named explicitly, so TEA should verify both against the current tree before writing RED. Ready to hand off to TEA (Tyr One-Handed) for the RED phase.

## Subagent Results — Round 1 (REJECTED, superseded by the re-review below)

Enabled via `workflow.reviewer_subagents`: preflight, test_analyzer, comment_analyzer, rule_checker.
Disabled (5): edge_hunter, silent_failure_hunter, type_design, security, simplifier — their domains
were covered by the Reviewer directly (a 6-mutation battery on shell/input.ts + a manual
edge/silent/type/security/simplify read of the diff).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (11 unhandled rejections; lint+tests green) | confirmed 1 (root-caused to rule #17), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (covered by Reviewer: NaN-poison traced → self-heals via `& 0xff`) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (covered by Reviewer: onReject sink is not silent; but sync-throw path escapes it — see rule #17) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 2 (wiring-presence-not-behaviour HIGH; cursor-hide unasserted MED), deferred 1 (negative-delta symmetry LOW) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 2 (stale `main.ts:94-99` citation; imprecise R5 comment), deferred 1 (RED-narrative header — repo convention) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (covered by rule-checker #1/#2/#5: no `as any`, `unknown` used well, no missing `export type`) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (covered by Reviewer: no auth/secrets/injection surface; console.warn reason is non-sensitive) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (covered by Reviewer: mirrors centipede, no dead code, accDh/accDv cleanly retired) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (32 rules / 47 instances) | confirmed 3 (#17 overstated R4 = blocking; #24 ×2 stale test citations) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 5 confirmed blocking/actionable, 3 confirmed non-blocking, 3 deferred (LOW/convention)

### Rule Compliance

Against `.pennyfarthing/gates/lang-review/typescript.md` (rule-checker, 32 rules, 47 instances) +
CLAUDE.md core/shell boundary:
- §1 type-safety: PASS — no `as any`/`!`; the single `(result as Promise<unknown>).then` cast is off
  a statically-`unknown` source guarded by a `typeof …then === 'function'` check (not a double-cast).
- §2 generics/interfaces: PASS — `Record<string, unknown>` (not `any`), specific fn signatures, no
  `object`/`Function`. `MouseDelta` has no `readonly` but is a return type, not a param — rule N/A.
- §4 null/undefined: PASS — `?? 0` on movementX/Y is the textbook-correct form (0 is a valid delta;
  `||` would be the bug and is not used).
- §5 module/declaration: PASS — `export interface` (no type-only re-export), value imports for the
  two functions, no `.js` extensions.
- §7 async: PARTIAL — `request(): Promise<void>` is correctly async, but the "never rejects"
  guarantee leaks on a synchronous throw (rule #17, blocking finding).
- §17 comment-mechanism / §24 stale-retirement: FAIL ×3 — overstated R4 JSDoc + two stale
  `accDh/accDv` test citations.
- CLAUDE.md core/shell boundary (#31) + millipede purity guard (#32): PASS — no `src/core/*` file
  touched; guard read-set unaffected; DOM lives only in shell/input.ts + main.ts.

### Devil's Advocate

Argue this is broken. First: the shipped code IS functionally correct in a real browser — click
locks, deltas map right (mutation battery: all 6 sign/exit/drain/reset mutants caught, including the
centipede `dv -= movementY` copy-paste → 3 fails), and core is untouched. So where's the rot? In
what the tests DON'T guarantee. A future refactor (or a careless merge) that drops the single
`void pointerLock.request()` line ships 20/20 green — the pointer lock silently never binds, the
trackball dies at the screen edge, and CI is happy. On an epic whose entire charter is "wire the
built-but-dead seams," a wiring test that cannot see dead wiring is the one test that had to work.
Second: the suite already emits 11 unhandled `requestPointerLock is not a function` rejections, and
vitest itself prints "This might cause false positive tests." That is not cosmetic — an unhandled
rejection landing during an unrelated test's async window can, under a stricter node/vitest config,
flip a green to red or mask a real failure; the R4 "never rejects" contract was supposed to prevent
exactly this and doesn't, because a synchronous throw from `canvas.requestPointerLock()` skips the
`.then(undefined, onReject)` guard. Third: a maintainer reading `shell/input.ts:31` ("Signs follow
main.ts:94-99 exactly") or the test's `main.ts:99 accDh -= e.movementX` citation will jump to lines
that now hold `fireHeld = true` — the map lies the moment this diff lands. Individually these are
MEDIUM; together — a test blind to the epic's target bug, a broken async contract with an observable
11-error symptom, and three provably-wrong citations — they clear the bar for a rework round.

## Reviewer Assessment — Round 1 (REJECTED, superseded by the re-review below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [RULE] | `request()` violates its "never rejects (R4)" contract on a synchronous throw from `canvas.requestPointerLock()` → 11 unhandled rejections vitest flags as false-positive risk | `plugins/millipede/src/shell/input.ts:90,109` | Catch the synchronous throw too (route to `onReject`), so `request()` truly never rejects; give the boot-shell mock canvas a `requestPointerLock` |
| [HIGH] [TEST] | The 5 `main.ts` wiring tests are string-presence, not behavioural — deleting `void pointerLock.request()` (dead wiring, the epic's target bug class) ships 20/20 green | `plugins/millipede/tests/pointer-lock.test.ts:350` | Add a behavioural pin: expose the canvas mock on `ShellHarness` and assert `requestPointerLock` was invoked after `emit('canvas','pointerdown')` |
| [MEDIUM] [TEST] | Cursor-hide only string-matched; `boot-shell` `style:{}` unasserted | `plugins/millipede/tests/pointer-lock.test.ts:360`, `boot-shell.ts:175` | Assert `harness.canvas.style.cursor === 'none'` after boot |
| [MEDIUM] [DOC] | Stale citation "Signs follow main.ts:94-99 exactly" (now unrelated code) | `plugins/millipede/src/shell/input.ts:31` | Drop the line-number citation; the mapping is documented in `onMouseMove` |
| [MEDIUM] [DOC] | Stale `accDh/accDv` citations "main.ts:99/100" retired by this diff | `plugins/millipede/tests/pointer-lock.test.ts:146,159` | Re-point to `onMouseMove` in shell/input.ts, or drop the `main.ts:NN` line refs |
| [LOW] [DOC] | Imprecise R5 comment bundles Escape/blur, claims "no blur fires" | `plugins/millipede/src/main.ts:57` | Match shell/input.ts phrasing (Escape-exit keeps focus; the listener clears regardless of cause) |
| [LOW] [TEST] | Mapping tests exercise positive deltas only | `plugins/millipede/tests/pointer-lock.test.ts:139` | Add one negative-delta case per axis (deferred — sign already mutation-caught) |

Dispatch coverage: [EDGE] none (disabled — NaN-poison self-heals via `& 0xff`, verified) · [SILENT]
none (disabled — onReject sink not silent, though the sync-throw path escapes it, folded into
[RULE]) · [TEST] 2 confirmed + 1 deferred · [DOC] 3 confirmed · [TYPE] none (disabled — covered by
[RULE] #1/#2/#5, clean) · [SEC] none (disabled — no security surface) · [SIMPLE] none (disabled — no
dead code; mirrors centipede) · [RULE] 1 blocking (#17) + 2 (#24) confirmed.

**Data flow traced:** device `mousemove` (movementX/Y) → `createMouseAdapter.onMouseMove`
(`dh -= movementX`, `dv += movementY`) → `sample()` drained once per rAF in `main.ts` frame loop →
`toByte()` → `stepGame` GameInput. Signs correct and mutation-verified; core contract unchanged.

**Handoff:** Back to TEA for red rework — the two blocking findings are testable (a behavioural
wiring/contract test) and drive the code + comment fixes that follow in GREEN.

## Subagent Results

Re-review (round-trip 1) of the rework diff (commits `0377c5da` TEA + `a9aa9a6c` Dev). Same toggles;
the 5 disabled domains were re-covered by the Reviewer directly (independent mutation checks: reverting
the try/catch re-reds the 2 sync-throw tests; deleting `request()` re-reds the behavioural wiring test).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1360 tests green; **0 unhandled rejections** (was 11); lint clean | confirmed the R4 fix mechanically |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled (re-covered: NaN-poison still self-heals via `& 0xff`) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled (re-covered: try/catch routes to `onReject`→console.warn, not swallowed) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both blocking CLOSED via mutation) + 2 new non-blocking | confirmed 0 blocking; routed 2 (onReject-sink MED, R5-reset LOW) → ml10-5 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 prior FIXED, 1 leftover (line 169) | routed 1 (LOW stale citation) → ml10-5 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled (re-covered by rule-checker #1/#2/#11: `catch(reason)` is `unknown`, clean) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled (re-covered: no security surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled (re-covered: try/catch is minimal, no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | #17 RESOLVED, #24 accDh/accDv RESOLVED; 1 new (line 169, same class) | confirmed both blocking resolved; routed 1 → ml10-5 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 0 blocking (both prior blockers CLOSED, mutation-verified); 3 non-blocking routed to **ml10-5**

### Rule Compliance

Re-check against `.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md core/shell boundary:
- §1/§2/§4/§5 type-safety/generics/null/module: PASS (unchanged; rule-checker re-confirmed).
- §7 async / §17 comment-mechanism: **now PASS** — `request()` try/catch wraps BOTH the synchronous
  `canvas.requestPointerLock()` call AND `await result`, so "never rejects (R4)" holds universally
  (pinned by 6 GREEN behavioural tests; reverting the try/catch re-reds the 2 sync-throw tests).
- §11 error handling: PASS — `catch (reason)` is `unknown` (strict mode) routed to a typed
  `onReject?: (reason: unknown) => void`, not swallowed (main.ts wires `console.warn`).
- §24 stale-retirement: mostly resolved — `accDh/accDv` gone repo-wide (0 hits); ONE residual line
  anchor `(main.ts:100)` at pointer-lock.test.ts:169 (claim correct, pointer stale) → routed to ml10-5.
- CLAUDE.md core/shell boundary + purity guard: PASS — no `src/core/*` touched; purity 53/53,
  orchestrator suite 498/498, full millipede suite 1360/1360, `npm run lint` all green.

### Devil's Advocate

Try again to break it. The two round-1 blockers are the obvious attack surface — are they *really*
closed or just papered over? Reverting the `try/catch` to the bare `.then(undefined, onReject)` re-reds
exactly the two sync-throw tests and nothing else (verified), so the fix is load-bearing, not cosmetic;
and the 11 unhandled rejections are genuinely 0 now because the mock canvas gained a real
`requestPointerLock`. Deleting `void pointerLock.request()` re-reds the new behavioural boot test (0≠1),
so the dead-wiring hole is actually plugged for the click-to-lock seam. Where's the residue? test-analyzer
found the *next* seam in the same class: main.ts's `onReject`/`console.warn` 4th-arg is untested —
delete it and the suite stays green. Real, but MEDIUM: it is the diagnostic sink (a lost warning), not a
gameplay path, and createPointerLock's internal onReject routing IS unit-tested; only main.ts's wiring of
the sink is unguarded. The R5 reset wiring is behaviourally unpinned too, but safe today (unique `reset(`
token). And line 169 still cites a moved line. None of these corrupts behaviour or a user-facing path;
each is test-hardening or a comment. On an anti-dead-wiring epic I do not love shipping a fresh (if minor)
dead-wiring gap — so it is filed as ml10-5, not waved away. Per the repo's "many rounds + dormant → approve
with routed findings" rule and both specialists' explicit recommendation to route over re-round, these do
not justify a third review cycle.

## Reviewer Assessment

**Verdict:** APPROVED

Round 1 REJECTED for two blocking findings; the rework (commits `0377c5da` + `a9aa9a6c`) closes both,
mutation-verified this round. Residual non-blocking findings are filed as **ml10-5** (not descoped).

**Blocking findings — resolution:**
- [RULE #17] `request()` "never rejects (R4)" now holds universally — try/catch wraps the synchronous
  call + the await; the 11 unhandled `requestPointerLock is not a function` rejections are now **0**.
  Verified: reverting the try/catch re-reds the 2 sync-throw tests. RESOLVED.
- [TEST] dead-wiring gap closed — a behavioural boot test asserts a canvas `pointerdown` invokes
  `requestPointerLock` (`pointerLockRequests()` 0→1) and `cursorStyle()==='none'`. Verified: deleting
  `void pointerLock.request()` now fails the test. RESOLVED.
- [DOC] the two stale round-1 citations (`shell/input.ts:31`, `main.ts:57` R5 comment) fixed.

**Routed to ml10-5 (non-blocking):**
- [TEST] main.ts's `onReject`/`console.warn` diagnostic-sink wiring is untested (same dead-wiring class,
  diagnostic seam) — MEDIUM.
- [TEST] the R5 `onExit → mouse.reset()` wiring is only source-regex pinned, not behavioural — LOW (safe
  today: unique `reset(` token).
- [DOC] `pointer-lock.test.ts:169` still cites `(main.ts:100)` (claim correct, line anchor stale) — LOW.

Dispatch coverage: [EDGE] none (disabled — NaN self-heals via `& 0xff`) · [SILENT] none (disabled — the
try/catch routes to `onReject`→console.warn, not swallowed) · [TEST] 2 blocking CLOSED + 2 routed ·
[DOC] 2 fixed + 1 routed · [TYPE] none (disabled — `catch(reason)` is `unknown`, clean) · [SEC] none
(disabled — no security surface) · [SIMPLE] none (disabled — minimal try/catch, no dead code) · [RULE]
#17 + #24 RESOLVED, 1 residual routed.

**Data flow traced:** device `mousemove` (movementX/Y) → `createMouseAdapter.onMouseMove`
(`dh -= movementX`, `dv += movementY`) → `sample()` drained once per rAF → `toByte()` → `stepGame`
GameInput. Signs mutation-verified; core untouched (boundary + purity guards green).
**Pattern observed:** faithful mirror of centipede's `shell/input.ts` (cp1-5/cp2-2/cp2-8) at
`plugins/millipede/src/shell/input.ts`, with millipede's distinct non-negated vertical.
**Error handling:** `request()` never rejects; failures route to `onReject`→`console.warn` (diagnostic,
not silent). The live pointer-lock acquire remains a HUMAN smoke test (headless rejects requestPointerLock).
**Handoff:** To SM for finish-story. Follow-up ml10-5 filed for the routed test-hardening + comment.