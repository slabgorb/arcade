---
story_id: "uf1-20"
jira_key: ""
epic: "uf1"
workflow: "tdd"
---
# Story uf1-20: the showcase carousel proves a game is FRAMED, never that it is ALIVE — a black or frozen pane ships green

## Story Details
- **ID:** uf1-20
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Branch:** none (trunk-based repo — work happens on main)
- **PR:** none (trunk-based repo — commit directly to main)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T15:07:48Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T12:58:34Z | 2026-08-06T13:01:03Z | 2m 29s |
| red | 2026-08-06T13:01:03Z | 2026-08-06T13:22:06Z | 21m 3s |
| green | 2026-08-06T13:22:06Z | 2026-08-06T13:35:24Z | 13m 18s |
| review | 2026-08-06T13:35:24Z | 2026-08-06T14:27:10Z | 51m 46s |
| red | 2026-08-06T14:27:10Z | 2026-08-06T14:53:08Z | 25m 58s |
| green | 2026-08-06T14:53:08Z | 2026-08-06T14:58:40Z | 5m 32s |
| review | 2026-08-06T14:58:40Z | 2026-08-06T15:07:48Z | 9m 8s |
| finish | 2026-08-06T15:07:48Z | - | - |

## Story Context

**Epic:** uf1 (Unwired features — ported-but-unconsumed mechanics found by the 2026-07-28 fleet sweep)

**Type:** chore
**Points:** 3
**Priority:** p2

**Summary:**
The showcase carousel's testing suite asserts MEMBERSHIP (who is in the carousel), WIRING (that launch links route correctly), and HTTP STATUS (that a game's URL responds 200). None of these assertions detect whether the framed game is actually rendering and alive. A black, frozen, or exception-throwing pane ships green because showcase.ts failure handling keys only on LOAD_TIMEOUT_MS (8 seconds of pre-load silence) and docs/ops/hosting.md#check-showcase measures only HTTP status, never frame contents.

ad1-2 (2026-08-01) proved liveness by hand: sample the same-origin iframe's canvas lit-pixel counts over ~10 samples at 250ms intervals. Distinct counts = alive; static = dead. Task: automate that liveness check and decide explicitly whether it belongs in CI (requires a real browser harness — cost TBD) or as a documented manual gate in hosting.md.

**Key files for context:**
- `lobby/src/shell/showcase.ts` — carousel frame management + timeout logic
- `lobby/tests/main.test.ts` — existing carousel tests (membership/wiring only)
- `src/host/registry.test.ts` — registry membership tests
- `docs/ops/hosting.md` — hosting runbook + `check-showcase` recipe

**Scope note — epic-wide and rising:**
ad1-1, ad1-3, ad1-4, ad1-5 each add another game to the carousel. The unguarded rendering surface grows with every story. This finding spans the entire ad1 epic and is upstream to all siblings.

## Acceptance Criteria

1. A check exists that observes the FRAMED GAME's rendered output (not its membership, not its href, not an HTTP status) and fails when a showcase game draws nothing or draws a frozen frame.

2. The check covers every game with `showcase: true` rather than one exemplar, so it keeps working as ad1-1/ad1-3/ad1-4/ad1-5 add members.

3. Proven non-vacuous by mutation: break one game's render (or point its frame at a blank document) and require the check to go red.

4. Whether the check runs in CI or is a documented manual gate is decided EXPLICITLY and recorded, with the browser-harness cost stated either way.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (red) — 2026-08-06

**AC-4 ruling (recorded):** the liveness check is a **documented manual gate**, NOT a
CI gate. Facts that drove it: the repo has no browser harness (every vitest project is
`environment: 'node'`); CI is `npm ci → lint → orchestrator → vitest → build`; observing
real canvas pixels *requires* a real browser. A Playwright gate in every deploy
contradicts the repo's fast/deterministic/no-backend CI identity and adds
browser-install + dev-server + flakiness cost per release. Dev must honor this — do NOT
wire it into CI.

**What Dev builds for GREEN (`scripts/check-showcase-alive.mjs`):**
- `showcaseLivenessTargets(games = GAMES)` — filter `showcase === true`, map to
  `{ id, path: gamePath(id) }`, in registry order. Must DERIVE from the passed roster
  (defaults to registry `GAMES`), never a hardcoded list — the synthetic-input test
  enforces this.
- `isAlive(counts)` — verdict over lit-pixel counts. Spec: alive **iff** ≥2 distinct
  values AND at least one non-zero. Frozen frame (all identical) → false; black/nothing
  (all zero) → false; varying → true. (This is ad1-2's "ten distinct counts" method,
  reduced to its pure heart.)
- `main()` — the on-demand gate: Playwright drives each target's same-origin iframe,
  reaches `contentDocument` → `<canvas>`, samples `getImageData` lit-pixel counts over
  ~10 ticks at 250 ms, and exits non-zero if any target's counts fail `isAlive`. Not
  unit-testable here (needs a browser) — that is the whole reason for the manual gate.
- `just check-showcase-alive` recipe wrapping the script.
- `docs/ops/hosting.md`: record the explicit **manual-not-CI** decision, state the
  **browser-harness cost** (a `playwright` devDependency + a browser install, run
  locally/on-demand), and record the **AC-3 mutation proof done by hand** — e.g. blank
  one showcase frame (point it at a static page), run the gate, show it goes red.

**AC-3 note:** the orchestrator suite cannot run the browser, so the mutation proof is
Dev's to perform once by hand and record in hosting.md. The `isAlive` unit tests already
pin the black/frozen dead cases at the logic level; the by-hand proof closes the loop
that the browser wiring actually reddens on a real dead frame.

### Reviewer (code review)
- **Gap** (blocking): `isAlive()` reports a frozen frame as ALIVE when the canvas is absent on the first sample(s) — the `-1` "no canvas" sentinel counts as a distinct value, so `[-1, k, k, …]` (late-mounting frozen game) yields ≥2 distinct + a positive value → `true`. Verified: `isAlive([-1,100,100,100,100,100,100,100,100,100]) === true`. Fail-OPEN in the guard's core verdict. Masked today only because every showcase game hosts a static `<canvas id="game">` in `index.html`; a future showcase game (the gate must survive ad1-1/3/4/5) that JS-mounts its canvas silently defeats the frozen check. Affects `scripts/check-showcase-alive.mjs` `isAlive()` (filter `-1`/negatives out of `counts` before the variation check; add a RED test `isAlive([-1, k×9]) === false`). *Found by Reviewer during code review.*
- **Gap** (non-blocking) [RULE]: the per-game `catch (err) { console.error(...) }` at `scripts/check-showcase-alive.mjs:104` falls through to `isAlive(counts)` on a partial/empty array; since `isAlive([]) === false`, a probe/navigation failure prints the identical `DEAD` verdict and exit code as a genuinely broken game — an operator can't distinguish "probe crashed" from "game is dead." Fails safe (logs `err.message`, verdict DEAD), but conflates two failure modes (rule #1 intent / rule #13). Affects `scripts/check-showcase-alive.mjs` (report a distinct `ERROR` state / exit code). *Found by Reviewer during code review.*
- **Improvement** (non-blocking) [DOC]: the `sampleLitPixels` doc-comment claims `-1` "resolves to 'not alive'" — inaccurate given the blocking finding above; fix the comment alongside the `isAlive` fix. Affects `scripts/check-showcase-alive.mjs`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking) [DOC]: `docs/ops/hosting.md` says the default origin is `5290/5270`, but the script default and `just serve` are `5270` (`5290` was an ad-hoc test port). Drop `5290/`. Affects `docs/ops/hosting.md`. *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Probe each showcase game's own page directly, not via the driven carousel iframe**
  - Spec source: context-story-uf1-20.md, Problem paragraph ("WHAT ad1-2 DID BY HAND")
  - Spec text: "serve the tree, let the carousel reach the game, then reach into the same-origin iframe's canvas and sample lit-pixel counts over time"
  - Implementation: `check-showcase-alive.mjs main()` navigates directly to each target's own page (`origin + /<id>/`) and samples that page's canvas, rather than loading the lobby and driving the carousel to rotate an iframe onto each game.
  - Rationale: `/<id>/` is exactly what the carousel frames (`iframe.src = gamePath(id)` in showcase.ts), so it observes the identical rendered output, while direct navigation is deterministic — driving the carousel (8 s per-slide timeout, one game framed at a time) would make a pass/fail gate flaky, and the carousel's own wiring is already covered by the existing membership/href tests.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **Probe each game's own page directly, not via the driven carousel iframe** → ✓ ACCEPTED by Reviewer: sound — `/<id>/` is exactly what the carousel frames (`iframe.src = gamePath(id)`), so it observes identical rendered output; direct navigation removes the 8 s-per-slide rotation flakiness a pass/fail gate can't tolerate, and the carousel's own wiring is already pinned by the existing membership/href tests. No spec value lost.
- **Undocumented divergence — `-1` "no canvas" sentinel is not filtered before the liveness verdict.** Spec (AC-1/AC-3) says the gate must fail on a frozen frame; `isAlive` treats the `-1` sentinel as an ordinary value, so a `-1` first sample followed by a repeated frozen count reads as "varying" → ALIVE. Not logged by Dev. Severity: HIGH (see Reviewer Assessment).
- **→ RESOLVED (round-trip #2 audit, 2026-08-06):** the `-1` divergence is closed at the spec level — `isAlive` now takes its verdict over `counts.filter((c) => c >= 0)`, dropping the sentinel before the distinct/variation check. TEA pinned it RED (`isAlive([-1, 812×9]) === false`) plus two guard rails, and Dev's filter turns all three green while leaving the black/frozen/varying cases unchanged. Verified by hand-trace and the 11/11 suite. No residual undocumented divergence in the round-2 diff. ✓ ACCEPTED as resolved.

## Sm Assessment

Setup complete. Session file created, story moved backlog → in_progress, context written to sprint/context/context-story-uf1-20.md. Trunk-based: no branch/PR (Branch: none, PR: none). No Jira. Merge gate clear (no open PRs). No sibling-epic YAML churn.

Routing to TEA (Leeloo) for the RED phase. The observable gap is concrete: existing guards assert membership/wiring/HTTP-200, never that a framed showcase game actually renders. TEA should design the failing test around ad1-2's proven method — sample the same-origin iframe canvas's lit-pixel counts over ~10 samples and require distinct counts (alive) — covering every `showcase: true` game, and prove it non-vacuous by mutation. AC-4 (CI real-browser harness vs. documented manual gate, with the harness cost priced) is an explicit decision to surface, not assume — flag it early so it doesn't get silently defaulted into a CI harness the repo doesn't have today.

## Tea Assessment

**Phase:** finish → complete. **RED verified directly** with `node --test
tests/showcase-liveness.test.mjs`: **8 tests, 0 pass, 8 fail**, each failing for the
correct "feature missing" reason (module `scripts/check-showcase-alive.mjs` absent,
`check-showcase-alive` recipe absent, hosting.md marker absent) — no typos, nothing
passing by accident. Verified by hand rather than via the testing-runner helper (which
confabulates test names); the tally above is from the real run.

**AC-4 decision surfaced to the user and ruled: documented MANUAL gate, not CI.** The
repo has no browser harness today and its CI identity is fast/deterministic/node; a
per-deploy Playwright gate was priced and rejected. Deliverable is an on-demand
`just check-showcase-alive` (Playwright) + a hosting.md record of the decision and cost.

**Test → AC map (`tests/showcase-liveness.test.mjs`):**
- AC-2 (covers every showcase game, survives ad1-1/3/4/5): `showcaseLivenessTargets`
  derives from `showcase:true` — pinned by a **synthetic-input** test a hardcoded roster
  cannot pass, plus a live-registry test asserting the current roster AND the
  showcase:false exclusions.
- AC-1 + AC-3 (fails on nothing/frozen): `isAlive` false for all-zero (black) and
  constant (frozen), true for varying — the pure heart of the method.
- AC-1 wiring: the probe reaches the framed canvas via a real browser (structural guard;
  reddens if swapped for a DOM-only/HTTP check like `check-showcase`).
- AC-4: recipe reachable + hosting.md records the manual-not-CI decision and the
  browser cost.

**Rule Coverage** (orchestrator `node:test`, JS — no lang-review checklist for `.mjs`;
applied the project's live conventions):
- *Meaningful assertions / no vacuous tests:* every test asserts a concrete value; the
  AC-2 test uses synthetic input specifically so it cannot pass vacuously against
  today's roster (self-checked — no `let _ =`, no `assert(true)`, no always-None).
- *Derive from the source of truth, don't hand-keep* (the anti-rot rule `registry.test.mjs`
  encodes): the gate roster must come from the registry `showcase` field, enforced above.
- *No browser in CI / deterministic orchestrator suite:* honored — the browser piece is
  the manual gate; the suite pins only pure functions + file/recipe/doc contracts.

**Handing to Dev (Korben) for GREEN.** The build spec + the `isAlive` formula + the
AC-3 by-hand mutation-proof requirement are in the Delivery Findings above.

### TEA (red) — round-trip #2, 2026-08-06

**Rework RED for the Reviewer's HIGH.** The gate's own verdict fails OPEN on the exact
regression it exists to catch. `sampleLitPixels` returns `-1` when no sized canvas is
present; a game that JS-mounts its canvas one tick late and then freezes yields
`[-1, k, k, …]`, and `isAlive` reads the `-1`→`k` step as motion — two distinct values,
one positive → **ALIVE**. Confirmed by direct run before writing:
`isAlive([-1, 812×9]) === true` (should be `false`).

**Added to `tests/showcase-liveness.test.mjs` (3 tests, in the AC-1+AC-3 verdict block):**
- **RED (the defect):** `isAlive([-1, 812×9]) === false` — late-mounting frozen frame is
  DEAD. This is the only currently-failing assertion.
- **Guard rail (stays green):** `isAlive([-1 ×10]) === false` — canvas never present, dead.
- **Guard rail (stays green):** `isAlive([-1, 804,831,…]) === true` — a genuinely live
  game whose canvas mounts one tick late must NOT be killed. This pins the fix's SHAPE:
  filter the `-1` sentinel out of `counts` *before* the variation check — a blunt
  "any `-1` ⇒ dead" fix would redden this true case, so it's wrong.

**RED verified directly** (`node --test tests/showcase-liveness.test.mjs`): **11 tests,
10 pass, 1 fail** — the one failure is the frozen-sentinel case (`true !== false`, the
fail-open bug), failing for the right reason. No accidental passes, no collateral. Ran by
hand, not via the confabulating testing-runner.

**Fix for Dev (Korben):** filter negatives out of `counts` before the distinct/variation
check in `isAlive` — e.g. verdict over `counts.filter((c) => c >= 0)`. After that, all
three above go green and the two Reviewer LOW/MEDIUM items remain: the `sampleLitPixels`
doc-comment claiming `-1` "resolves to not alive" becomes TRUE (fix the wording either
way), the `:104` error/DEAD conflation (MEDIUM — distinct ERROR state/exit code), and the
hosting.md `5290/` drop (LOW). Those are in the Reviewer Assessment table below.

**Handing to Dev (Korben) for GREEN.**

## Dev Assessment

**Phase:** finish → complete. All 8 tests pass; nothing else regressed.

**Verification (run directly, not via the confabulating testing-runner):**
- `node --test tests/showcase-liveness.test.mjs` → **8 tests, 8 pass, 0 fail**
- `npm run test:orchestrator` → **406 tests, 406 pass, 0 fail** (no collateral)
- `npm run lint` (`tsc --noEmit`, the repo-wide type check) → clean

**Built (minimal, per the manual-gate decision):**
- `scripts/check-showcase-alive.mjs` — `showcaseLivenessTargets(games = GAMES)` (derives
  from `showcase: true` + `gamePath`), `isAlive(counts)` (varying + some non-zero), and
  `main()`: a **dynamically-imported** Playwright probe that samples each showcase game's
  canvas lit-pixel count over 10 × 250 ms and exits non-zero on any dead frame. Playwright
  is NOT a committed dependency — that keeps `npm ci` (and therefore CI) free of the
  browser harness, which is the whole point of the AC-4 ruling.
- `justfile` — `check-showcase-alive` recipe (on-demand; comment states it is not a CI gate).
- `docs/ops/hosting.md` — new "Is the framed game actually *alive*?" subsection recording
  the manual-not-CI decision, the browser-harness cost, and the AC-3 mutation proof.

**AC-3 mutation proof — REAL, measured 2026-08-06** against `centipede` on a local
`just serve` (port 5290) via a real browser, then run through the actual `isAlive`:
- live centipede: counts [26964, 27090, 27099, 27054, 27252, 27459, 27342, 27405, 27378, 27387] (10 distinct) → `isAlive` **true**
- frozen pane (drawn once): [120191 ×10] (1 distinct) → `isAlive` **false**
- black pane: [0 ×10] → `isAlive` **false**

The frozen case is the sharp one: it has MORE lit pixels than the live game, so only the
variation-over-time test catches it — a brightness threshold would pass a frozen frame.
Numbers recorded in hosting.md's table.

**AC coverage:** AC-1 (observes rendered output, fails on nothing/frozen) ✓ · AC-2
(covers every `showcase: true`, roster-derived) ✓ · AC-3 (mutation-proven, real numbers) ✓
· AC-4 (manual-vs-CI decided explicitly + cost recorded) ✓.

**Deviation logged:** probe each game's own `/<id>/` page directly rather than driving the
carousel iframe (deterministic; same framed output; carousel wiring already covered).
Minor, no forward impact — see Design Deviations.

**Handing to Reviewer (Zorg).**

### Dev (green) — round-trip #2, 2026-08-06

**Phase:** finish → complete. All Reviewer findings addressed; the RED case is now green and
nothing regressed.

**Verification (run directly, not via the confabulating testing-runner):**
- `node --test tests/showcase-liveness.test.mjs` → **11 tests, 11 pass, 0 fail** (was 10/1
  fail on the new `-1` case).
- `npm run test:orchestrator` → **409 tests, 409 pass, 0 fail** (406 + TEA's 3 new; no collateral).
- `npm run lint` (`tsc --noEmit`) → clean (exit 0).
- Sentinel truth-table re-run through the real `isAlive`: `[-1,812×9]`→false, `[-1×10]`→false,
  `[-1,804,831,…]`→**true**, `[0×10]`→false, varying→true. Matches TEA's RED spec exactly.

**Fixes:**
- **[HIGH] fail-open closed** — `isAlive` now takes its verdict over `counts.filter(c => c >= 0)`,
  so the `-1` "no canvas" sentinel is dropped BEFORE the distinct/variation check. A
  late-mounting frozen frame `[-1, k×9]` collapses to `[k×9]` → one distinct → DEAD; a
  never-present canvas collapses to `[]` → DEAD; a genuinely varying late-mounter stays ALIVE
  (TEA's guard-rail test pins that the fix is a *filter*, not a blunt "any `-1` ⇒ dead").
- **[MEDIUM] ERROR ≠ DEAD** — `main()` now tracks a per-target probe error separately: a
  `page.goto`/eval failure prints `ERROR  could not probe: …` and the run exits **3**
  (harness/infra), distinct from **1** (a game observed dead) and **2** (Playwright missing).
  An operator can now tell "couldn't look" from "game is broken." (Browser leg — not
  orchestrator-testable; control flow verified by reading, module imports clean.)
- **[LOW] doc-comment** — `sampleLitPixels` no longer claims the `-1` case "resolves to not
  alive" on its own; it now states `isAlive` filters the sentinel. `isAlive`'s own comment
  records the fail-open history.
- **[LOW] hosting.md** — default origin `5290/5270` → `5270`.

**Commits (RED then GREEN, this round):** `3e97b79c` (TEA RED), `f2440a70` (this fix).

**NOT pushed — deliberate, for SM at finish.** This checkout is **17 commits behind
origin/main** (a concurrent sibling shipped jt9-28/29/30 + missile-command mc2). A `git push
origin main` would be a non-fast-forward reject; the divergence must be reconciled at finish
(rebase my 4 uf1-20 commits onto origin/main, re-run the suite, then ff-push — verify
HEAD==main==tip first, per the drift-log). I confirmed the incoming jt9-30 comment-line-refs
guard is scoped **joust-tests-only** (`plugins/joust/tests/comment-line-refs.test.ts`), so it
cannot flag this story's top-level `tests/showcase-liveness.test.mjs`; my 4 commits touch only
`scripts/`, top-level `tests/`, `justfile`, `docs/ops/hosting.md` — no overlap with the 17
incoming (joust/, missile-command/, sprint/), so the finish rebase is expected clean.

**Handing to Reviewer (Zorg)** for a re-review of the `-1` filter, the ERROR/exit-code split,
and the two doc fixes.

## Reviewer Assessment

**Verdict:** APPROVED  *(round-trip #2 re-review; round 1 was REJECTED — that assessment is preserved below as superseded)*

The one hole that made round 1 a reject — the gate's own verdict failing OPEN on the
exact regression it exists to catch — is closed, cheaply and exactly as prescribed, and
proven closed by a RED-first test. `isAlive` now takes its verdict over
`counts.filter((c) => c >= 0)`, so the `-1` "no canvas" sentinel can no longer masquerade
as motion. I re-ran the full enabled specialist panel against the round-2 diff and traced
the fix by hand; nothing new surfaced.

**Data flow traced:** `process.env.ARCADE_ORIGIN` (operator-set) → `page.goto(origin + gamePath(id))`;
`gamePath(id)` derives from the committed registry, not from any caller argument — no untrusted
input reaches `goto`, and `page.evaluate` is a static closure (unchanged this round). [SEC] clean,
SSRF N/A — confirmed by reviewer-security.

**The fix, verified (AC-1/AC-3, the HIGH):** `isAlive` filters negatives before the
distinct/variation check. Hand-traced against every reachable class, all matching TEA's RED spec:
- `[-1, 812×9]` → observed `[812×9]` → 1 distinct → **DEAD** (the round-1 fail-open case, now closed)
- `[-1×10]` → observed `[]` → 0 distinct → **DEAD** (canvas never present)
- `[-1, 804, 831, …]` → observed varies → **ALIVE** (a genuinely live late-mounter is NOT over-killed —
  TEA's guard-rail proves the fix is a *filter*, not a blunt "any `-1` ⇒ dead")
- pre-existing black `[0×10]` / frozen `[k×10]` / varying cases unchanged (a no-op when no `-1` is present).

**Error handling (the MEDIUM), verified:** `main()` now captures the per-target probe error into
`probeError`, prints a distinct `ERROR could not probe: …` line (not `DEAD`), `continue`s past the
liveness accounting, and exits **3** if any probe errored — distinct from **1** (a game observed dead)
and **2** (Playwright missing). `dead` and `errored` are independent counters and the exit-3 message
reports both if they co-occur. This *improves* silent-failure rule #1 rather than regressing it — the
error is no longer swallowed into a false DEAD verdict. [RULE] confirmed by reviewer-rule-checker
(13/13 rules PASS, both prior findings genuinely resolved, not relabeled).

**The two LOW doc items, verified fixed:** the `sampleLitPixels` doc-comment no longer claims the
`-1` case "resolves to not alive" on its own (it now points to `isAlive`'s filter, and `isAlive`'s
own comment records the fail-open history); `docs/ops/hosting.md` default origin `5290/5270` → `5270`.

**Preflight [PRE], verified:** 11/11 target (was 10/1 fail on the new `-1` case), 409/409 orchestrator
(406 + TEA's 3), lint exit 0, tracked tree clean, no debug/TODO/`.skip` smells.

**Known method limitations (NOT regressions, unchanged from the accepted round-1 design):** a
pixel-count-variation liveness heuristic equates "alive" with "the drawn pixel count changed," so a
spinner / loading shimmer / CSS animation would also read as ALIVE, and the `>24` brightness floor is
a fixed constant. These are inherent to the ad1-2 method the story explicitly chose to automate as a
*manual* gate, were raised and accepted in round 1, and are not touched by this diff — out of scope for
this rework, appropriate to revisit only if a future story tightens the heuristic.

**Deviation audit (round 2):** the round-1 UNDOCUMENTED `-1` divergence is stamped RESOLVED in Design
Deviations → Reviewer (audit); Dev's one logged deviation (probe the page directly vs. driving the
carousel) remains ACCEPTED. No new undocumented divergence in the round-2 diff.

**Specialist accounting (plain-text tags for the gate) — round 2, all 3 enabled subagents re-run:**
[PRE] preflight — clean: 11/11 target, 409/409 orchestrator, lint exit 0, tree clean, no smells.
[SEC] security — clean: 0 findings; no untrusted input to `goto`, `evaluate` static, `probeError.message`
a local operator diagnostic (not a leak); SSRF N/A.
[RULE] rule-checker — clean: 13/13 JS rules PASS; prior HIGH (#13 fail-open) and MEDIUM (#1 silent
error) both confirmed genuinely resolved; the 3 new tests non-vacuous (#8).

**Handoff:** To SM (Winston) for finish-story. NOTE for finish: this checkout is behind origin/main
(a concurrent sibling shipped jt9-28/29/30 + missile-command mc2); reconcile before the ff-push per the
drift-log (rebase the 4 uf1-20 commits, re-run the suite, verify HEAD==main==tip). The incoming jt9-30
comment-line-refs guard is joust-tests-scoped and cannot touch this story's top-level test.

---

### Reviewer Assessment — Round 1 (REJECTED, SUPERSEDED by the round-2 re-review above; findings all resolved)

**Verdict:** REJECTED

The gate is well-shaped and the pure-function contract is genuinely mutation-proof (the
synthetic-input roster test cannot be satisfied by a hardcoded list — good). Preflight is
green (8/8 target, 406/406 orchestrator, lint clean) and security is clean. But an
adversarial pass on the one thing this gate exists to do — *catch a frozen frame* — finds
a fail-open hole in the verdict itself. A guard that can silently certify a dead frame as
alive is worse than no guard, so this goes back for a cheap, testable fix.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `isAlive()` returns `true` for a frozen frame when the canvas is absent on early samples: the `-1` sentinel counts as a distinct value, so `[-1, k×9]` reads as "varying" → ALIVE. Verified `isAlive([-1,100×9])===true`. Fail-OPEN. Masked today only by every showcase game hosting a static `<canvas>` in `index.html`; the gate is required to keep working as ad1-1/3/4/5 add games, and a future JS-mounted canvas silently defeats it. | `scripts/check-showcase-alive.mjs` `isAlive()` | Filter `-1`/negatives out of `counts` before the variation check; add a RED test `isAlive([-1, k×9]) === false`. Then the doc-comment claiming `-1` "resolves to not alive" becomes true. |
| [MEDIUM] | Caught `page.goto`/eval error falls through to `isAlive([])===false`, so a probe/infra failure is reported with the identical `DEAD` verdict + exit code as a genuinely broken game. Fails safe + logs, but conflates two failure modes. | `scripts/check-showcase-alive.mjs:104` | Report a distinct `ERROR` state / exit code so "probe broke" ≠ "game is dead". |
| [LOW] | `sampleLitPixels` comment asserts `-1` "resolves to 'not alive'" — false given the HIGH finding. | `scripts/check-showcase-alive.mjs` | Fix comment with the `isAlive` fix. |
| [LOW] | hosting.md states default origin `5290/5270`; script + `just serve` default is `5270`. | `docs/ops/hosting.md` | Drop `5290/`. |

**Observations (no rubber-stamp):**
- [HIGH] frozen-frame false-ALIVE via `-1` sentinel — `scripts/check-showcase-alive.mjs:47`, verified by execution.
- [MEDIUM] [RULE] error/DEAD verdict conflation — `scripts/check-showcase-alive.mjs:104` (corroborates rule-checker rule #1/#13).
- [VERIFIED] Roster derivation is mutation-proof — `check-showcase-alive.mjs:126` filters `g.showcase` from the passed roster (defaults to registry `GAMES`); `tests/showcase-liveness.test.mjs:26` proves a hardcoded list fails. Complies with JS-checklist #8 (concrete `assert.deepEqual`, non-vacuous).
- [VERIFIED] `isAlive` rejects the two *reachable* dead cases — black `[0×10]` → `false` (no value `>0`) and same-from-first-sample frozen `[k×10]` → `false` (one distinct); `check-showcase-alive.mjs:135`. The gap is only the `-1`-prefixed case above.
- [VERIFIED] Data flow: `process.env.ARCADE_ORIGIN` → `page.goto(origin + path)`; `path` from `gamePath(id)` (registry, trusted). Operator-set env, no untrusted caller — [SEC] clean, SSRF correctly N/A (JS-checklist #11).
- [VERIFIED] Async hygiene — `for…of` (not async `forEach`), every `page.*` awaited, dynamic `import('playwright')` awaited, top-level `await main()` entry-guarded; `browser.close()` in `finally` (JS-checklist #2, resource cleanup). No `var`, all strict `===` (#4, #9).
- [VERIFIED] Playwright kept out of committed deps (dynamic import, fails closed with an install hint) — honors the AC-4 manual-not-CI decision; CI stays browser-free (#12).

### Rule Compliance (JS lang-review checklist, both `.mjs` files)
- #1 Silent errors — **VIOLATION** at `:104` (MEDIUM above); import-failure catch at `:82` is compliant (logs + distinct exit 2).
- #2 async, #3 proto-pollution, #4 equality, #5 DOM/eval, #6 Node, #7 regex, #9 var/const, #10 error objects, #11 input/SSRF, #12 deps — **PASS** (see observations; concurs with rule-checker + security).
- #8 Test quality — **PASS**; note the grep-based source/doc tests (`:126`, AC-4 doc test) are static-inspection guards that cannot detect a silently no-op Playwright integration — acceptable for a manual-gate contract, but they are why the browser leg needs the by-hand mutation proof (recorded).
- #13 Fix-introduced regression / meta — **VIOLATION**: the HIGH finding reintroduces, inside the guard, the same false-green class the story exists to eliminate.

### Devil's Advocate
Assume this gate is broken and lulls us into false confidence. The strongest case: it is a
*liveness* detector that equates "alive" with "the lit-pixel count changed," and it never
proves the change is the *game* rendering. A showcase game that crashes to a spinner, a
loading shimmer, a CSS animation, or a single blinking cursor produces varying counts and
is stamped ALIVE — the gate would bless a game that never actually starts. Worse, the
`-1` sentinel (returned when no canvas is present) is fed straight into the same variation
test as real counts, so the transition *from missing canvas to a single frozen frame* is
itself read as "motion." That is not hypothetical arithmetic: it is exactly the shape of a
game that mounts its canvas asynchronously and then dies on the first frame — the precise
regression this story was written to catch — and the gate says ALIVE. Today it is masked
only because every game happens to ship a static `<canvas>` in HTML; the gate's whole
selling point is that it survives new games being added, and that guarantee rests on an
implementation detail no test pins. Second front: the per-game `catch` swallows navigation
and evaluation failures into an empty `counts`, and because `isAlive([]) === false`, an
operator who sees `DEAD` cannot know whether the game is broken or the probe never reached
it — a red herring during a 2am incident. Third: the brightness floor `>24` is an
unjustified magic constant; a game rendering in deep-blue-on-black or with heavy bloom
could fall on either side of it, and nothing tests the threshold. The comment even
*asserts* the `-1` case is safe, so a future reader trusts a property the code does not
have. None of these are style nits — the first defeats the guard's core purpose, and it is
one `counts.filter(c => c >= 0)` away from fixed. Reject and fix now, while it is cheap.

**Deviation audit:** Dev's one logged deviation (probe path directly vs. carousel iframe)
→ ACCEPTED. One UNDOCUMENTED divergence found (the `-1` sentinel is not filtered) → logged
under Design Deviations → Reviewer (audit), HIGH.

Specialist accounting (plain-text tags for the gate):
[PRE] preflight — clean: 8/8 target, 406/406 orchestrator, lint clean, no smells.
[SEC] security — clean: no findings; SSRF N/A (operator-controlled env, one trust principal).
[RULE] rule-checker — 2 findings at `:104` (error/DEAD conflation, rule #1/#13); CONFIRMED as the MEDIUM above.

**Handoff:** Back to TEA (Leeloo) for a RED test on the `-1` case, then Dev (Korben) to
filter the sentinel and address the MEDIUM/LOW items. Findings are testable → rework via red.

## Subagent Results

*(Round-trip #2 re-review — all 3 enabled specialists re-run against the round-2 diff
`git diff ce9c0091..HEAD`. The round-1 table is preserved below.)*

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 (11/11 target, 409/409 orchestrator, lint exit 0, tree clean) |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings (hand-covered — sentinel classes enumerated in the assessment) |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings (hand-covered + rule-checker — the ERROR/DEAD split closes the prior MEDIUM) |
| 4 | reviewer-test-analyzer | No | disabled | N/A | Disabled via settings (hand-covered + rule-checker #8 — 3 new tests non-vacuous) |
| 5 | reviewer-comment-analyzer | No | disabled | N/A | Disabled via settings (hand-covered — the two LOW doc fixes verified) |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings (N/A — plain JS) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 (no untrusted input to goto; evaluate static; probeError.message local) |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings (hand-covered — the fix is minimal, a one-line filter + a clean error branch) |
| 9 | reviewer-rule-checker | Yes | clean | 0 | confirmed 0, dismissed 0, deferred 0 (13/13 JS rules PASS; prior HIGH #13 + MEDIUM #1 both genuinely resolved) |

**All received:** Yes (3 enabled re-run; 6 disabled via settings and hand-covered)
**Total findings:** 0 — the round-1 HIGH + MEDIUM + 2 LOW are all resolved and re-verified; no new findings in the round-2 diff.

---

### Subagent Results — Round 1 (SUPERSEDED)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | disabled | N/A | Disabled via settings (hand-covered by Reviewer — found the HIGH) |
| 3 | reviewer-silent-failure-hunter | No | disabled | N/A | Disabled via settings (hand-covered — the MEDIUM, corroborated by rule-checker) |
| 4 | reviewer-test-analyzer | No | disabled | N/A | Disabled via settings (hand-covered — tests non-vacuous; grep-guard caveat noted) |
| 5 | reviewer-comment-analyzer | No | disabled | N/A | Disabled via settings (hand-covered — the two LOW doc items) |
| 6 | reviewer-type-design | No | disabled | N/A | Disabled via settings (N/A — plain JS) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | disabled | N/A | Disabled via settings (hand-covered — code is minimal, no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 1 (the MEDIUM; both findings are one issue at :104), dismissed 0, deferred 0 |

**All received:** Yes
**Total findings (round 1):** 1 HIGH + 1 MEDIUM + 2 LOW confirmed, 0 dismissed, 0 deferred.