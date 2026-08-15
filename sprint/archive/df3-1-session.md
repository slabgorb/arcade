---
story_id: "df3-1"
jira_key: "df3-1"
epic: "df3"
workflow: "tdd"
---
# Story df3-1: Cooperative process scheduler core (RED first)

## Story Details
- **ID:** df3-1
- **Jira Key:** df3-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Repos:** arcade
- **Branch:** feat/df3-1-cooperative-process-scheduler-core
- **PR:** https://github.com/slabgorb/arcade/pull/422

## Deliverable
`plugins/defender/src/core/scheduler.ts` — a process run-list with makeProcess (MKPROC), kill (KILL/SUCIDE), sleep/nap (SLEEP), and stepTick() (the once-per-frame dispatch). Pure and clock-free; the shell calls stepTick() off @shared/loop.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T15:31:08Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T14:32:36+00:00 | 2026-08-15T14:36:00Z | 3m 24s |
| red | 2026-08-15T14:36:00Z | 2026-08-15T14:46:02Z | 10m 2s |
| green | 2026-08-15T14:46:02Z | 2026-08-15T14:53:30Z | 7m 28s |
| review | 2026-08-15T14:53:30Z | 2026-08-15T15:06:18Z | 12m 48s |
| green | 2026-08-15T15:06:18Z | 2026-08-15T15:10:28Z | 4m 10s |
| review | 2026-08-15T15:10:28Z | 2026-08-15T15:21:41Z | 11m 13s |
| green | 2026-08-15T15:21:41Z | 2026-08-15T15:23:37Z | 1m 56s |
| review | 2026-08-15T15:23:37Z | 2026-08-15T15:31:08Z | 7m 31s |
| finish | 2026-08-15T15:31:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Dev] Improvement, non-blocking:** the setup-time `pf sprint story update df3-1
  --status in_progress` re-serialized `sprint/epic-df3.yaml` flush-left (`- id:` at
  column 0) and line-folded the long titles. The YAML parses identically, but the
  orchestrator text guard `tests/sprint-repo-routing.test.mjs:271` matches `^  - id:`
  and reported "epic shard declares no stories" (lang-review #30 — a semantics-preserving
  re-serialization breaking a text-level guard). Fixed in GREEN by restoring develop's
  canonical 2-space format (diff vs develop is now the single line df3-1
  backlog→in_progress). Watch item: the same churn will recur on every `pf sprint story
  update` against this shard — the finish/next-story flows should re-restore format if
  they touch it.

### Reviewer (code review)

- **Gap** (blocking): `sleep(ticks, wake)` does not validate `ticks`; `sleep(0/-N/NaN/fractional)`
  strands the process forever (never freed, never woken). Affects
  `plugins/defender/src/core/scheduler.ts:101-107` (validate/clamp at the boundary + add a
  regression test). *Found by Reviewer during code review (security + rule-checker #21, both
  reproduced).*
- **Gap** (blocking): `kill()`'s comment claims a type-system guarantee that structural typing
  does not provide, and the cast silently no-ops (while mutating the caller's object) on a
  foreign handle. Affects `plugins/defender/src/core/scheduler.ts:95-98` (correct the comment;
  scope `removeProc` to only mark a record dead if it is in THIS run-list). *Found by Reviewer
  during code review (rule-checker #1/#17, security low).*
- **Improvement** (non-blocking): a continuation can call `sched.stepTick()` reentrantly and
  clobber the `current`/`currentRescheduled` dispatch bookkeeping. Affects
  `plugins/defender/src/core/scheduler.ts:109-124` (guard against reentrancy, or thread dispatch
  state locally). *Found by Reviewer during code review (security, medium).*
- **Improvement** (non-blocking): the test redeclares `Continuation`/`Process`/`Scheduler`
  locally instead of importing them, and casts `catch (e)` to `Error` without an `instanceof`
  narrow — both SYSTEMIC (framebuffer.test.ts/purity.test.ts share them, and RED-first needs the
  local types). A fleet-wide follow-up, not this story's bug. Affects
  `plugins/defender/tests/scheduler.test.ts:64-97`. *Found by Reviewer during code review
  (rule-checker #8/#11).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **makeProcess(start, type) takes NO duration parameter — duration lives in sleep(N, wake)**
  - Spec source: context-story-df3-1.md, AC-1 (Test note)
  - Spec text: "createProcess() accepts duration + callback, enqueues to run-list, state is verifiable."
  - Implementation: The RED suite pins `makeProcess(start: Continuation, type: number)`; MKPROC (DEFA7.SRC:72-84) takes a start continuation + a user type and inits `PTIME=1` internally ("INIT TIME", :82). The *delay* is `SLEEP`'s parameter (`sleep(N, wake)`, DEFA7.SRC:12-13), tested separately in AC-4.
  - Rationale: ROM-always-wins — MKPROC has no duration operand; a made process runs next tick and sets its own cadence via SLEEP, so folding a duration into makeProcess would misdescribe the kernel.
  - Severity: minor
  - Forward impact: none — df3-3 (ship), df3-5 (laser) create processes as MKPROC(start,type) and self-schedule via sleep; this matches their ROM shape.

- **stepTick() dispatches a start-of-tick SNAPSHOT; a child spawned mid-tick runs on the NEXT tick; inter-process order WITHIN a tick is not pinned**
  - Spec source: context-story-df3-1.md, AC-5
  - Spec text: "stepTick() decrements PTIME, dispatches ready processes, maintains run-list consistency."
  - Implementation: The suite pins (a) all ready processes run once per tick as a SET (not an order), and (b) a process created during a dispatch is enqueued but first eligible on the following tick. Within-tick ordering is deliberately left free.
  - Rationale: The ROM inserts new processes at the run-list HEAD (MKPROC `STU [CRPROC]`), behind the live DISP cursor, so a mid-tick child is not revisited that pass — the snapshot model reproduces that observably while keeping dispatch deterministic without over-constraining an order no story yet observes.
  - Severity: minor
  - Forward impact: minor — df3-2/df3-3 assume a made/spawned process is first stepped on the tick after creation; if any later story needs a defined within-tick order (e.g. priority), it must add that contract explicitly.

### Reviewer (audit)

- **makeProcess has no duration param; duration lives in sleep()** → ✓ ACCEPTED by Reviewer:
  verified against DEFA7.SRC — MKPROC (:72-84) takes start+type and inits PTIME=1 (:82); SLEEP
  (:12-15) carries the duration. ROM-faithful; the derived AC-1 "duration + callback" wording
  was the imprecise side. Agrees with author reasoning.
- **stepTick dispatches a start-of-tick snapshot; within-tick order unpinned** → ✓ ACCEPTED by
  Reviewer: the snapshot (`runList.slice()`, scheduler.ts:112) both realizes ROM head-insertion
  semantics (a mid-tick child lands behind the live cursor) AND bounds the dispatch loop against
  self-spawning — a correctness benefit, not just a determinism choice. rule-checker #14 confirms
  the SUCIDE/reschedule edge is taken at the single common exit. Sound.
- No UNDOCUMENTED spec deviations found: every behavior traces to a cited ROM routine (#32 clean).

## Sm Assessment

**Setup verified on disk, not just reported.** Session, context, branch and the
`in_progress` stamp all confirmed; the phase pointer resolves to exactly one hit
(safe against `complete-phase` rewrites).

**Premise measured before setup (falsifiable-claim rule).** Every ROM citation in the
title was checked against `reference/original-source/defender/DEFA7.SRC`:
- `MKPROC` @ line 72 ✓ · `SLEEP` @ line 12 ✓ · dispatch/TIMER gate @ 3048-3050 (EXEC0 / LDA TIMER / BEQ EXEC0 / CLR TIMER) ✓
- **KILL/SUCIDE order was reversed in the title.** The title reads "KILL/SUCIDE, :19,31",
  but line **19 = SUCIDE** and line **31 = KILL**. The derived ACs cite each symbol to
  its ACTUAL line (AC-2 `KILL → :31`, AC-3 `SUCIDE → :19`). TEA: cite the corrected
  lines, not the title's order. This story is NOT stale — the ROM and symbols are real.

**ACs were `null` in the epic YAML** → `sm-setup` DERIVED 6 ACs from the title, faithful
to the ROM citations. TEA should treat these as the spec but is free to reshape the RED
tests around the four behaviours (makeProcess / kill+suicide / sleep-nap / stepTick).

**Scope guardrails:**
- Pure + clock-free core: `stepTick()` takes no internal clock; the shell drives it off
  `@shared/loop`. `plugins/defender/src/core/purity.test.ts` MUST stay green.
- `jt2` (joust scheduler) is a **prose pattern reference only** — do NOT import from
  `plugins/joust`. Re-derive from THIS tree.
- `scheduler.ts` does not exist yet — correct for RED-first.

**Sibling probes clean:** no `feat/df3-1` branch existed; a-3 holds df2-5 (terrain,
disjoint). Claim committed and branch **pushed** (`feat/df3-1-cooperative-process-scheduler-core`)
so the story is now visible to every checkout.

**Handoff:** phased (tdd) → Leeloo (TEA) for RED.
## Tea Assessment

**RED confirmed, clean.** All 11 tests in `plugins/defender/tests/scheduler.test.ts`
fail via a self-describing "src/core/scheduler.ts not built yet" loader (the
framebuffer.test.ts precedent), so RED proves the FEATURE is absent, not a broken
test. The other **263** defender tests stay green (`vitest run --project defender` →
11 failed | 263 passed). `npm run lint` shows exactly ONE error — `TS2307 Cannot find
module '../src/core/scheduler.js'` at scheduler.test.ts:86 — the expected RED signal
Dev's GREEN resolves; no logic/type error anywhere. (Verified by running vitest + tsc
directly, not via testing-runner, per the "testing-runner confabulates test names"
gotcha.)

**The contract handed to Dev** (Korben Dallas), re-derived from `DEFA7.SRC:12-130`:
```ts
type Continuation = (self: Process, sched: Scheduler) => void
interface Process   { readonly ptime: number; readonly ptype: number; readonly alive: boolean }
interface Scheduler {
  makeProcess(start, type): Process   // MKPROC :72-84 — ptime=1 INIT (:82)
  kill(proc): void                    // KILL :31-49 — unlink + free
  sleep(ticks, wake): void            // SLEEP :12-15 — current proc, wake at NEW paddr
  stepTick(): void                    // DISP :3119-3129 — DEC PTIME, dispatch on 0
  readonly processes: readonly Process[]
}
function createScheduler(): Scheduler
```
Behaviour pinned: (1) make records TYPE + enqueues, does NOT run on creation, first
runs next tick; (2) stepTick dispatches every ready proc once (set+count, order free);
(3) sleep wakes after EXACTLY N ticks (durations 3 & 5) at the GIVEN continuation, not
the original start; (4) SUCIDE (return) frees after one run; (5) KILL removes a proc,
siblings untouched; (6) mid-tick child runs next tick, once; (7) stepTick arity 0.

**Notes for Dev (GREEN):**
- **Purity is auto-enforced.** The armed src/core sweep in `purity.test.ts` scans
  scheduler.ts the moment it lands — no Date/timers/entropy/shell import. AC-6 is NOT
  duplicated in my suite (only stepTick's zero-arity is pinned as the API-level face).
- **Citations:** the df1 gate is dossier-driven (claims verified vs source); there is
  no per-literal scan of src/core, so a bare `ptime=1` won't mechanically redden GREEN.
  Still cite ROM constants/routines in code comments per df1/df2 house convention
  (MKPROC:82 for the PTIME=1 init, SLEEP:12-15, KILL:31-49, DISP:3119-3129).
- **Do NOT import from `plugins/joust`** — jt2 is a prose pattern reference only.
- Two **Design Deviations** logged above (makeProcess has no duration param; snapshot
  dispatch / within-tick order free) — both minor, read them before implementing.

### Rule Coverage (lang-review/typescript.md)

Rules exercised by the RED suite (behavioural tests only — no source-text greps, so the
whole #15/#25/#28/#30 source-scan-guard family is not applicable here):

| Check | How covered |
|-------|-------------|
| #18 / #26 fixture value ≠ expectation | Distinct TYPE values (7,3), distinct sleep durations (3,5), distinct continuations — a stub that echoes one arg or hardcodes a value fails |
| #21 degenerate numeric (PTIME) | `ptime=1` init pinned as "next tick, not immediate, not tick 2"; sleep pins the exact decrement count (off-by-one on N caught) |
| #14 / #27 edge/gate in one branch | Multi-process one-tick dispatch (set+count), mid-tick child deferral, kill-then-no-run — the "did/didn't fire" edge is asserted at the tick boundary, both directions |
| #29 ordering ≠ magnitude | sleep asserts `toEqual` on the exact wake tick (magnitude), not merely "eventually" — a wake-next-tick-regardless-of-N mutant reddens |
| test-quality (#8) | Every test carries a meaningful assertion; no `let _ =`, no `assert(true)`, no always-None; SUCIDE/kill assert both `alive` AND absence from `processes` AND non-re-run |

Not applicable: #6 (no JSX), #7/#11 (no async/errors in the pure kernel), #10/#82 (no
external input), #16 (no ARIA), #22 (no comparison-predicate rewrite). Clock-free (#9-ish
/ AC-6) is enforced by the existing purity sweep, not this suite.
## Dev Assessment

**GREEN, clean, no scope creep.** `plugins/defender/src/core/scheduler.ts` implements
TEA's contract verbatim — `createScheduler()` with makeProcess/kill/sleep/stepTick +
`processes` snapshot. All 11 df3-1 tests pass. Full verification (run directly, not via
testing-runner):
- `vitest run --project defender` → **275 passed** (274 + the newly-armed src/core purity
  sweep entry for scheduler.ts, which is green — the module is pure).
- `vitest run` (whole cabinet) → **16541 passed | 1 todo | 0 failed** (1089 files).
- `npm run test:orchestrator` → **498 pass / 0 fail** (after the epic-YAML format fix below).
- `npm run lint` (repo-wide tsc) → **clean**.

**Implementation notes:**
- Pure & clock-free: no Date/timers/entropy/globals. `stepTick()` is one DISP pass
  (DEC PTIME, dispatch on 0); the shell owns the once-per-frame TIMER gate. The armed
  purity sweep scans scheduler.ts and passes.
- SUCIDE-vs-SLEEP discriminated by an explicit `currentRescheduled` flag set inside
  `sleep()` (not a `ptime===0` heuristic) so it stays correct even for a degenerate
  `sleep(0)` — matches the ROM's explicit SLEEP/SUCIDE control flow (DEFA7.SRC:12-22).
- Snapshot dispatch (`runList.slice()` per tick) realizes TEA's determinism deviation:
  a child spawned mid-tick lands behind the live cursor and first runs next tick.
- ROM routines cited in comments per df1/df2 convention (MKPROC:72-84/PTIME=1@:82,
  SLEEP:12-15, SUCIDE:19-22, KILL:31-49, DISP:3119-3129).
- **No import from `plugins/joust`** (jt2 is prose reference only) — verified.

**One infra fix (Delivery Finding above):** restored `sprint/epic-df3.yaml` to develop's
2-space story-block format — the setup-time ruamel re-serialization had flush-lefted it
and reddened the orchestrator guard (lang-review #30). Content delta vs develop is the
single df3-1 status line.

**Design deviations (Dev):** none from spec — implemented exactly to TEA's pinned contract.

**Branch pushed:** `feat/df3-1-cooperative-process-scheduler-core` (RED test + GREEN impl
+ YAML fix). Ready for review (Zorg).
## Subagent Results

**(Round 3 — test-only delta since R2. Prior rounds preserved in git history / review_findings.)**

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (all green: defender 282 / cabinet 16548 / orchestrator 498 / lint clean; 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (both new tests exercise the degenerate-input edges; delta is test-only) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no production change since R2; no new silent path) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (rule-checker #15/#18/#26 audited the 2 new tests: non-vacuous, mutation-verified) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (the 2 new test comments' mutant claims were RE-RUN and confirmed true — rule-checker #17) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (no type/production change since R2) |
| 7 | reviewer-security | Yes (accounting) | clean | 0 | Not re-spawned: `git diff e3fd8e2c...HEAD -- scheduler.ts` is EMPTY — production code byte-identical to R2's CLEAN security review; a re-run would review zero changed code |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (2 tests, no complexity) |
| 9 | reviewer-rule-checker | Yes | clean | 0 — gap CLOSED | Independently applied BOTH mutants by hand: drop `Number.isFinite`→only the Infinity test reddens; weaken `>=1`→`>0`→only the 0.4 test reddens; restored byte-identical. #15/#18 CLOSED, no new issues |

**All received:** Yes (2 enabled re-run + security accounted no-delta; 6 disabled Skipped)
**Total findings:** 0 — the round-2 MEDIUM mutation-gap is CLOSED and independently mutation-verified; both R1 blocking findings remain RESOLVED

## Reviewer Assessment

**Verdict:** APPROVED (round 3)

Dispatch tags covered this review: [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]

Three rounds, every finding closed and independently verified — nothing waved through. The
cooperative scheduler is correct, pure, ROM-faithful, and its two hard-won fixes are now locked by
mutation-proven regression tests. The round-3 delta is test-only (production `scheduler.ts` is
byte-identical to round 2's CLEAN security review), and the one open item — the sleep-clamp
mutation-coverage gap — is CLOSED.

**Round history (all resolved):**
- R1 [HIGH] `[SEC]``[RULE]``[EDGE]` `sleep(ticks<=0)` orphaned a process forever → fixed by the
  boundary clamp; R1 [MEDIUM] `[DOC]``[TYPE]``[SILENT]` `kill()` false type-guarantee comment +
  silent foreign-handle mutation → fixed by the `removeProc` membership check + a truthful comment.
- R2 [MEDIUM] `[TEST]``[RULE]` the clamp's `Number.isFinite` and `>= 1` clauses were not
  mutation-pinned (#15/#18) → fixed by two regression cases, each proven to redden on exactly its
  mutant.

**Round-3 verification (independent):** rule-checker applied BOTH mutants by hand — drop
`Number.isFinite` reddens *only* the Infinity test; weaken `>= 1`→`> 0` reddens *only* the 0.4 test;
each restored byte-identical, no other test moved — and re-measured 282/498/lint-clean against the
commit's own figures (#20). Gap CLOSED. Preflight all green.

**Observations (≥5):**
1. `[VERIFIED]` `[TEST]` `[RULE]` The two new tests are non-vacuous, mutation-verified TWICE (Dev then rule-checker, by hand): `sleep(Infinity)` pins `Number.isFinite`, `sleep(0.4)` pins the `>= 1` boundary (scheduler.test.ts:391-427). #15/#18 satisfied.
2. `[VERIFIED]` `[EDGE]` `sleep()` clamp is total over its input domain — hand truth-table `3→3, 0→1, -5→1, NaN→1, ±Infinity→1, 0.5→1, 2.9→2`; `ptime` is always a positive integer, so DISP always reaches exactly 0 and dispatches. No strand path remains.
3. `[VERIFIED]` `[TYPE]` `[SILENT]` `kill()`/`removeProc` is scoped to this run-list (membership check before mutation) — a foreign/stale handle is a true no-op; `[DOC]` the comment now states the cast is a within-module convention, not a type guarantee. #1/#17 resolved.
4. `[VERIFIED]` `[SEC]` No fix-introduced regression (#13) — SUCIDE, self-kill, sibling-kill-mid-tick, exact-N sleep, empty-scheduler all traced identical pre/post fix; snapshot-vs-live-list separation prevents splice-during-iteration; security returned CLEAN on the R2 code (unchanged since).
5. `[VERIFIED]` Purity holds — the armed `it.each(coreFiles)` sweep scans `scheduler.ts` and passes; `[SIMPLE]` the module is minimal (removeProc reused by kill+SUCIDE, one guarded clamp expression, no dead code).
6. `[VERIFIED]` `[DOC]` All 6 ROM citations exact vs `DEFA7.SRC` (#32); no joust import (#33) — only `vitest` is imported.

**Data flow traced:** `makeProcess(start,type)` → `runList` (ptime=1) → `stepTick` DEC→0 → dispatch → continuation `sleep(ticks,wake)` [clamped to a positive integer] re-arms, or returns → SUCIDE `removeProc`; `kill(proc)` frees only run-list members. Every path terminates in dispatch or free — no limbo.

**Pattern observed:** ROM-faithful cooperative kernel with a deterministic start-of-tick snapshot dispatch (`plugins/defender/src/core/scheduler.ts:126-138`) — bounds the loop against self-spawning and realizes head-insertion semantics. Good pattern; df3-3/df3-5 build on it safely.

**Error handling:** the degenerate-input boundary is guarded at entry (`sleep`, scheduler.ts:116) and misuse (foreign kill, sleep-outside-dispatch) degrades to a safe no-op; no throw in the hot dispatch path.

### Rule Compliance (lang-review/typescript.md) — Round 3 (final)

All previously-flagged rules now RESOLVED: #1 type-safety (cast safe + comment truthful), #17 false comment, #21 degenerate numeric (clamp), #15/#18 guard-mutation-testing (two new tests, mutation-verified). Compliant throughout: #13 no fix-introduced regression, #14 derived edges (single exit), #26/#29 magnitude assertions, #20 figures re-measured, #31 purity, #32 citations, #33 no-joust. Non-blocking/systemic (carried as Delivery Findings): `[SEC]` reentrant stepTick (misuse, no caller), `[RULE]` #8/#11 local test types + `catch as Error` (framebuffer/purity precedent, RED-first requires local types). Remaining rules N/A to this diff.

### Devil's Advocate

Try to break the approval. The strongest attack is that I am approving a story whose non-blocking
findings I chose not to fix: a continuation can still re-enter `stepTick()` and scramble dispatch
bookkeeping, and the test file still hand-copies the production types instead of importing them, so a
future required field on `Scheduler` would not fail this suite. Both are real. But the reentrancy has
no caller and no ROM analog — the shell calls `stepTick` once per frame, and a continuation calling
it is a misuse a guard would paper over rather than a bug a user hits; it is recorded, not ignored,
for a follow-up. The local-types pattern is forced by RED-first (the module is absent when the test
is authored) and is the established fleet convention (framebuffer, purity) — changing it here alone
would fork the pattern for one game, a net loss. A second attack: am I trusting the subagents? No —
rule-checker re-derived the mutation result by hand this round, preflight re-ran the full cabinet,
and I traced the clamp and the kill scope myself; the security row is an honest accounting (zero
production delta since its CLEAN run), not a skipped check. A third: is the clamp's silent
coercion-to-1 hiding caller bugs? It could — a `sleep(0)` that should have been `sleep(60)` now runs
next tick instead of stranding, which is a louder, more debuggable failure than a vanished process,
and matches the ROM's own PTIME=1 floor; a throw was the alternative, rejected to keep the hot path
total. Nothing here rises to Critical or High, the two blocking defects are gone and locked, and the
suite proves its guards bite. Approval stands.

**Handoff:** To SM (Ruby Rhod) for the finish ceremony. No PR merge by Reviewer.
## Dev Assessment — Rework Round 1 (review R1 fixes)

Both blocking findings fixed; both non-blocking findings addressed by decision below.

**[FIXED] sleep() boundary (HIGH, #21):** `sleep(ticks)` now clamps any non-positive,
non-finite, or fractional duration to a whole tick ≥ 1 — `current.ptime =
Number.isFinite(ticks) && ticks >= 1 ? Math.floor(ticks) : 1` (scheduler.ts:105). ROM-
consistent with MKPROC's PTIME=1 INIT (:82). A process can no longer be stranded by
`sleep(0/-N/NaN/Infinity)`; a positive fraction floors to whole frames.

**[FIXED] kill() scope + comment (MEDIUM, #1/#17):** `removeProc` now checks run-list
membership FIRST and only marks a record dead if it is actually on THIS scheduler's
`runList` (scheduler.ts:85-90) — killing a foreign/already-removed handle is a true
no-op, no silent mutation. The `kill()` comment now states the downcast is a within-
module convention (makeProcess is the only minter), NOT a type guarantee, and that the
membership check is what makes it safe (scheduler.ts:94-98).

**Regression tests (5, all proven to FAIL on pre-fix code):** sleep(0) wakes next tick;
negative + NaN wake next tick; a re-sleep(0)-forever process runs every tick (never dead
weight); a positive fraction floors to whole ticks; foreign kill() is a true no-op.
Verified non-vacuity by reverting the fix and running only these — 5 failed — then
restoring. defender **280 passed**, orchestrator **498**, `npm run lint` clean, full
cabinet unaffected.

**[Non-blocking, deferred] reentrant stepTick():** left as-is with the finding recorded.
A continuation calling `sched.stepTick()` on itself is a misuse with no ROM analog and
no caller; guarding it is optional hardening for a follow-up, not a df3-1 correctness
requirement (minimalist scope).

**[Non-blocking, deferred] systemic test local-types / catch(e) cast:** unchanged —
these are the established fleet pattern (framebuffer.test.ts / purity.test.ts) and the
RED-first loader REQUIRES local types (the module is absent at RED time). A fleet-wide
follow-up, not this story's regression.

**Branch:** pushed. Ready for Reviewer round 2 (Zorg).
## Dev Assessment — Rework Round 2 (review R2 test-gap)

**[FIXED] sleep-clamp mutation gap (MEDIUM, #15/#18):** added two regression cases to
`plugins/defender/tests/scheduler.test.ts` — `sleep(Infinity)` and `sleep(0.4)`, each
asserting the process wakes on the next tick (clamped to 1). Both proven non-vacuous by
mutation:
- Dropping `Number.isFinite(ticks)` from the clamp → the Infinity test fails
  (`floor(Infinity)=Infinity` strands), the 0.4 test still passes.
- Weakening `>= 1` to `> 0` → the 0.4 test fails (`floor(0.4)=0` strands), the Infinity
  test still passes.
Each test pins exactly its own guard clause. Verified by applying each mutant and running
the pair (1 failed / 1 passed each way), then restoring.

**Production code unchanged** — the clamp was already correct; this round only hardens the
regression lock, exactly as the reviewer scoped it. defender **282 passed**, orchestrator
**498**, lint clean. Non-blocking items (reentrancy, systemic test-types/catch-cast) remain
deferred as recorded Delivery Findings.

**Branch:** pushed. Ready for Reviewer round 3 (Zorg).