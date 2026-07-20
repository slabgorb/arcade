---
story_id: "jt2-1"
jira_key: "jt2-1"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-1: Process scheduler core — the tagged-union process list, frame naps, two classes, kill by id+mask, per-frame RNG stir

## Story Details
- **ID:** jt2-1
- **Jira Key:** jt2-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T11:25:41Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T10:22:53Z | 2026-07-20T10:26:15Z | 3m 22s |
| red | 2026-07-20T10:26:15Z | 2026-07-20T10:54:41Z | 28m 26s |
| green | 2026-07-20T10:54:41Z | 2026-07-20T11:02:32Z | 7m 51s |
| review | 2026-07-20T11:02:32Z | 2026-07-20T11:25:41Z | 23m 9s |
| finish | 2026-07-20T11:25:41Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): RESOLVED TEA's `@arcade/shared` Gap by INLINING mulberry32 (byte-for-byte from `arcade-shared/src/rng.ts`, SH-3) rather than adding the git-URL dep — joust pins no `@arcade/shared`, the generator is three pure lines, and the contract tests semantics only. If a later story needs the shared `Rng`/`nextFloat` API, swap the inline `rngNext` for the pinned dep; the durable-word state shape already matches. Affects `src/core/frame.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): reaffirming TEA's finding — `src/main.ts` still runs its OWN `stepPlayer` loop; it is NOT yet driven by the new core scheduler. The migration guard proves the `player` kind reproduces `stepPlayer` bit-for-bit, so wiring `main.ts` onto `stepFrame` is a safe follow-up (later story) with no behaviour change. Affects `src/main.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): `PBLKM` (40-slot cap) is deliberately NOT exported/enforced — the contract marks it OPTIONAL and no behavioral test demands a cap (semantics-only ruling). Add it anchored on RAMDEF.SRC:166 only if/when a slot cap is actually enforced. Affects `src/core/frame.ts`. *Found by Dev during implementation.*

### TEA (test design)
- **Question** (non-blocking): KLPROC's header says "KILL ANY PROCESSES (NOT INCLUDING ITSELF)" (SYSTEM.SRC:337, CMPU PEXEC at :349). jt2-1's `kill(state, id, mask)` is a free function with no "currently-executing process", so it kills every match INCLUDING a self-match. Self-exclusion is deferred until the scheduler models a caller (a process killing from its own body — jt2-3/jt2-6 territory). The RED suite deliberately does NOT pin self-exclusion. Affects `src/core/frame.ts` (kill semantics — add a caller/self param when that need lands). *Found by TEA during test design.*
- **Gap** (non-blocking): AC names `@arcade/shared/rng` but joust's `package.json` has NO `@arcade/shared` dependency yet (devDependencies only). GREEN must either add the git-URL pin (`npm install @arcade/shared@#<tag>`) or inline the mulberry32 word (the shared module is 3 tiny pure functions). The RED contract tests only the SEMANTICS (seeded, deterministic, one stir/frame), so either satisfies it — but the AC's letter wants the shared package. Affects `joust/package.json` + `src/core/frame.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): `src/main.ts` `stepPlayer` (jt1-6) is the shell-side per-frame flight pipeline the migration must preserve. jt2-1 need not refactor `main.ts`, but once the scheduler steps players, `main.ts` should eventually drive the core scheduler so the demo and the sim cannot diverge. The migration guard replicates `stepPlayer`'s airborne branch as the golden reference. Affects `src/main.ts` (later wiring). *Found by TEA during test design.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 1 Question, 1 Improvement)
**Blocking:** None

- **Question:** KLPROC's header says "KILL ANY PROCESSES (NOT INCLUDING ITSELF)" (SYSTEM.SRC:337, CMPU PEXEC at :349). jt2-1's `kill(state, id, mask)` is a free function with no "currently-executing process", so it kills every match INCLUDING a self-match. Self-exclusion is deferred until the scheduler models a caller (a process killing from its own body — jt2-3/jt2-6 territory). The RED suite deliberately does NOT pin self-exclusion. Affects `src/core/frame.ts`.
- **Gap (RESOLVED in green):** AC names `@arcade/shared/rng` but joust pins no `@arcade/shared` dependency. Dev resolved by inlining mulberry32 byte-for-byte from `arcade-shared/src/rng.ts` (Reviewer verified byte-equivalence; TEA blessed either path). If a later story adds the git-URL pin, the inline copy in `src/core/frame.ts` can be swapped for the subpath import.
- **Improvement:** `src/main.ts` `stepPlayer` (jt1-6) is the shell-side per-frame flight pipeline the migration must preserve. jt2-1 need not refactor `main.ts`, but once the scheduler steps players, `main.ts` should eventually drive the core scheduler so the demo and the sim cannot diverge. The migration guard replicates `stepPlayer`'s airborne branch as the golden reference. Affects `src/main.ts`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`src`** — 1 finding
- **`src/core`** — 1 finding

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
No deviations logged.

## Sm Assessment

Setup complete and verified on disk: session file present with bare workflow field, story context written at sprint/context/context-story-jt2-1.md with citations quoted verbatim from epic-jt2.yaml, branch feat/jt2-1-process-scheduler-core cut off develop in the joust subrepo, story status in_progress in sprint tracking. Merge gate was clear (no open joust PRs). Running in peloton-subagent mode per the bz4 precedent: SM drives TEA/Dev/Reviewer as foreground subagents; user pre-authorized automatic merges between stories. Next owner is TEA for the red phase — write failing tests for the process scheduler laws (frame naps, two-class ordering, kill by id+mask, per-frame RNG stir) plus the jt1-5 determinism replay migration guard.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing for the right reason — ready for Dev/GREEN)
**Branch:** `feat/jt2-1-process-scheduler-core` · **Commit:** `f0d0f1c`

**Test files (absolute):**
- `/Users/slabgorb/Projects/a-2/joust/tests/helpers/scheduler-contract.ts` — the module CONTRACT (TEA-authored, loadFlight/loadChecker pattern): `GameState { frame, processes, woke }`, `ProcessSpec { id, cls, nap, period, kind, entity? }`, and `SchedulerModule { FRAME_HZ, PBLKM?, createState(seed), spawn, kill(target,mask), stepFrame(state, inputs?), draw }`. `loadScheduler()` dynamic-imports `src/core/frame.js` and throws a self-describing "scheduler not built yet" until `spawn`/`kill`/`draw` exist.
- `/Users/slabgorb/Projects/a-2/joust/tests/scheduler.test.ts` — 26 behavioral tests (25 RED, 1 green fixture-sanity).
- `/Users/slabgorb/Projects/a-2/joust/tests/scheduler-source.test.ts` — 30 provenance tests, all GREEN: each law re-derived from the vendored ROM (byte-gated) + pinned by a committed claim (dossier ranges) + the JT10-010 layout hazard (PBLKM anchor, 40×56=2240, no 2040).

**What is pinned (the ACs):**
- **AC-1 frame naps** — a process napping N wakes on exactly the Nth pass (proven via the nap decrement counts), nap=1 wakes on pass 1, re-naps to `period` (period-P wakes every P; player = period 1).
- **AC-1 two classes** — every primary steps before any secondary each frame, proven by spawning interleaved (secondary FIRST) and demanding class order out; secondaries get their own decrementing pass; a sleeping primary does not block a due secondary.
- **AC-1 kill by id+mask** — `kill(target,mask)` removes exactly `(id & mask)===target` in one call (class kill), mask 0xFF = exact-one, no-match = no-op, full masking-law table, and kill touches neither the frame counter nor the RNG stream.
- **AC-2 per-frame RNG stir** — the stream moves on a frame that consumes nothing; one frame == exactly one draw; K frames == K draws; deterministic under seed; different seeds diverge.
- **AC-3 migration guard** — a `player` process stepped from the list reproduces `main.ts stepPlayer`'s airborne pipeline BIT-FOR-BIT over a 90-frame scripted flight (verified it stays aloft: maxY=32px, moves, wraps); the RNG stir does not perturb the deterministic physics.
- **AC-4/AC-5 purity** — two fresh states from one seed evolve identically (behavioural no-Math.random guard); `createState`/`spawn`/`kill`/`stepFrame`/`draw` never mutate their argument.

**Red run (real output):** full suite `454 tests | 25 failed | 429 passed`. Every one of the 25 failures is the clean `loadScheduler` throw "scheduler not built yet — … has no `spawn` export" (verified: no TypeError/SyntaxError/import errors mask any assertion). Pre-existing 398 tests + 30 new provenance + 1 fixture-sanity all green. `tsc --noEmit` exits 0 (build/lint gate intact). Representative failing tests: `AC-1 … a process napping N wakes on exactly the Nth pass`; `AC-1 … orders every primary ahead of every secondary — regardless of insertion order`; `AC-1 … removes every id in the class (id&mask===target) in ONE call`; `AC-2 … advances by EXACTLY one step per frame`; `AC-3 … reproduces the reference trajectory bit-for-bit`; `AC-4/AC-5 … two fresh states from the same seed evolve identically`.

**What Dev (GREEN) must implement — grow `joust/src/core/frame.ts`:**
1. `GameState` gains `processes: readonly Process[]` (tagged union by `kind`, plain data) and `woke: readonly number[]`, keeps `frame` + `FRAME_HZ`. A durable seeded RNG word carried in state.
2. `createState(seed)` (seed is the shell's), `spawn(state, spec)`, `kill(state, target, mask)`, `stepFrame(state, inputs?)`, `draw(state)` — all pure (return new state; never mutate).
3. `stepFrame`: TWO full passes — all primaries (nap−1; wake at 0 → record in `woke` in class-then-list order, run kind behaviour, re-nap to `period`), then all secondaries; a `player` kind runs the `main.ts stepPlayer` flight pipeline via its `inputs[id]`; then ONE RNG stir (once/frame, independent of consumption); `frame+1`.
4. RNG via `@arcade/shared/rng` (mulberry32) seeded by the shell — add the dep or inline it (see Delivery Findings). No `Math.random`/clock (purity sweep already covers `src/core`).
5. Optional `PBLKM = 40` (RAMDEF.SRC:166) if a slot cap is enforced — anchored on PBLKM, never a searched `ORG $0`.
6. Semantics only: NO 56-byte block, NO PPC resume address, NO RAM pool.

**Delivery Findings:** 3 logged above (KLPROC self-exclusion deferred; `@arcade/shared` dep not yet present; `main.ts` scheduler wiring is later work). None blocking.

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes — GREEN.
**Branch:** `feat/jt2-1-process-scheduler-core` (pushed) · **Commit:** `fc64fef`

**Files Changed:**
- `src/core/frame.ts` — grew the jt1-1 bare frame counter into the ruled scheduler core (+211/−7, src-only diff). Added: `ProcessClass`/`ProcessSpec`/`Process`/`Draw` types; `GameState` gains `processes` (tagged union by `kind`), `woke` (ordered wake ids), and a durable `rng` seed word; `createState(seed)`, `spawn`, `kill(target, mask)`, `stepFrame(state, inputs?)`, `draw`. `FRAME_HZ` unchanged.

**Key Design Decisions:**
- **RNG — INLINED mulberry32, not the shared dep.** Copied byte-for-byte from `arcade-shared/src/rng.ts` (SH-3 canonical `nextFloat`) as a pure `rngNext(word) → {value, next}`. joust pins no `@arcade/shared`; the generator is three pure lines; the contract tests semantics only (seeded, deterministic, one stir/frame). TEA blessed either path (Delivery Finding Gap). Chose inlining to avoid a git-URL dep + lockfile churn (and the known stale-lockfile trap) for three functions. The durable word `rng` is carried in `GameState` (battlezone's "durable seed word" pattern), so the reducer stays pure and produces the identical float sequence to the shared module for any seed.
- **`stepFrame` = two full passes** (all primaries, then all secondaries), each pass: `nap−1`; wake when it reaches 0 → push id to `woke`, run the kind's behaviour, re-nap to `period`. The result array preserves original list order (kills/find stay stable) while `woke` is class-then-list order. RNG stirs exactly once per frame at the end, independent of consumption.
- **`player` kind runs `main.ts stepPlayer`'s pipeline verbatim** (`stepPlayerEntity` — airborne + ground branches, same flight/arena calls in the same order), so the jt1-5 seeded replay reproduces bit-for-bit. A player waking with no input for its id glides on a `NEUTRAL_INPUT` default (defensive; every test supplies input).
- **`PBLKM` cap deliberately omitted** — optional in the contract, no test enforces it, semantics-only ruling. Anchor on RAMDEF.SRC:166 if a cap ever lands.
- **Purity:** no `Math.random`/clock; `Math.imul` + bit ops only (the src/core purity sweep targets `Math.random()`, not `Math.*`). All functions non-mutating (pinned by the mutation tests).

**Tests:** `Test Files 16 passed (16)` · `Tests 454 passed (454)` (0 failed) — GREEN. Scheduler suite: 26/26. `npx tsc --noEmit` exits 0.
> Note for Reviewer: the "3 citation error(s)" line in full-suite stdout is the jt1-9 citation-checker exercising a deliberately-malformed empty fixture INSIDE a passing test — not a suite failure (454 passed / 0 failed).

**Delivery Findings:** 3 logged under `## Delivery Findings > ### Dev (implementation)` (RNG inline choice resolving TEA's Gap; main.ts scheduler-wiring still open; PBLKM cap not enforced). None blocking.

**Handoff:** To Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | Clean | Suite 454/454, tsc exit 0, zero TODO/FIXME/console/debugger in diff, conventional commits, branch synced. Note: origin/develop is +1 past base (`b36a985` v0.0.2 release — not a rival feature). | Accepted — informational; merge-hygiene note for SM finish, not a review defect. |
| 2 | reviewer-test-analyzer | Yes | 6 findings | Tautological test L420 (mutation-confirmed redundant); kill mask=0 untested; nap=0 unpinned; NEUTRAL_INPUT unexercised; within-class woke order + duplicate ids unpinned. CONFIRMED GOOD: L362 migration guard genuine (red under mutation) + class-boundary catches single-pass interleave. | Accepted as LOW/MED non-blocking test-hardening (see reconciliation); one MED (mask=0) touches my earlier [EDGE] claim — challenged below. Confirmations corroborate my migration-guard ruling. |
| 3 | reviewer-security | Yes | Clean | Two informational: spread-based ProcessSpec could carry `__proto__` IF ever fed from JSON (not reachable today — literals only); process list / woke unbounded (no external driver today). | Accepted — not reachable today; validate + bound when `main.ts` wires in. Corroborates [SEC] clean. |
| 4 | reviewer-rule-checker | Yes | Clean | 5/5 rules, 19 instances, 0 violations (purity, semantics-only, fully-qualified citations + PBLKM anchor + 2240 guard, src-only Dev commit, repo conventions). | Accepted — corroborates my [RULE] pass. |

All received: Yes

## Reviewer Assessment

**Verdict:** APPROVED

**Specialist tags:** [SEC] clean, [RULE] pass, [PREFLIGHT] clean, [TEST] pass with 5 non-blocking hardening gaps accepted below, [EDGE] pass with gap mask=0 untested, [SILENT-FAILURE] clean, [TYPE] pass, [COMMENT] pass, [SIMPLIFY] pass

**Reconciled with 4 specialist subagents (see Subagent Results table above). Verdict unchanged: APPROVED — no specialist raised a Critical or High CODE defect; all six new findings are non-blocking test-hardening on verified-correct code.**

**Scope reviewed:** commits `f0d0f1c` (TEA red) + `fc64fef` (Dev green) off `686a799`; exactly 4 files (`src/core/frame.ts` +211/−7, three test files). No `package.json`/lockfile churn (inline-RNG decision), `src/main.ts` untouched (wiring correctly deferred).

**Verification I ran myself (real output):**
- `npx tsc --noEmit` → exit 0.
- `npx vitest run` → **16 test files passed, 454 tests passed, 0 failed** (515ms). Scheduler suite 56/56. The "3 citation error(s)" line is the jt1-9 checker exercising its deliberately-malformed empty fixture (`jt1-9-empty-*` temp dir) INSIDE a passing test — not a suite failure, as Dev flagged.
- `vendoredAvailable` resolves to `reference/williams-source/joust` (present locally), so the byte-gated `describe.skipIf` provenance block **actually ran** (not skipped) — a stronger gate than CI.

**Citation spot-check (independent read of the vendored 1982 source, CRLF-normalized) — ALL 14 load-bearing FILE:LINE claims verified byte-exact:**
- `RAMDEF.SRC:171` = `PNAP RMB 1 … SLEEP TIME IF<>0` ✓ (PNAP)
- `SYSTEM.SRC:233`/`250` = `DEC PNAP,U … 1 LESS NAP TIME UNIT` ✓ (primary + secondary pass decrement)
- `SYSTEM.SRC:217` = `CLR PRISEC PRIMARY PROCESSES ARE FIRST`; `:231`/`:248` = `LDA PPRI,U … PRIMARY/SECONDARY??` ✓ (two-pass PRISEC confirmed in context 215-252)
- `RAMDEF.SRC:10`/`:16` = `LDD #(ID)*256` / `#(ID)*256+255` ✓ (PROCCR primary=0, SECCR secondary=255)
- `SYSTEM.SRC:341` = `KLPROC PSHS D,U`; `:346` = `ANDB PID,U`; `:347` = `CMPB ,S … PROCESS I.D. TO MATCH` ✓ (id+mask kill)
- `SYSTEM.SRC:581`/`:582` = `INC RANDOM` / `DEC RANDOM+1` ✓ (IRQ timer stir)
- `RAMDEF.SRC:166` = `PBLKM EQU 40 NUMBER OF MAXIMUM PROCESSES` ✓ (matches the `^PBLKM\s+EQU\s+40\b` anchor; never a searched ORG $0)

**Adversarial checks that held:**
- **Migration guard is genuine, not a tautology.** `stepPlayerEntity` (frame.ts) is character-identical to `main.ts`'s real `stepPlayer` physics pipeline in BOTH the airborne and ground branches (verified by direct read); the only delta is main.ts's `{...player, state, prevFlap}` shell envelope, correctly the shell's concern. The AC-3 test drives the real flight/arena modules over 90 frames and asserts fixture honesty (stays aloft) + non-triviality (moves + wraps).
- **Inline `rngNext` is byte-equivalent to `arcade-shared/src/rng.ts::nextFloat`** (line-by-line: same `0x6d2b79f5`, same imul/xor/shift chain, same `/4294967296`, same durable-word threading). Produces the identical float sequence for any seed. Inline choice acceptable — TEA blessed either path; no dep/lockfile churn.
- **Test suite pins against plausible wrong implementations:** off-by-one nap (proven via decrement counts 3→2→1 + wake on exactly Nth pass), single-pass interleave (spawns secondary-first, demands class order out), multi-stir RNG (K frames == exactly K draws — catches the ÷4-cadence trap), stir-only-on-consumption (empty-frame stir test), and mutation (JSON freeze/compare on every reducer).
- **Purity intact:** inline uses only `Math.imul` + bit ops; the jt1-7 TS-AST purity scanner sweeps every `src/core` file (frame.ts included) and would flag `Math.random`/clock/browser globals — clean. Core imports only core (`./flight.js`, `./arena.js`).
- **Semantics-only ruling honored:** no 56-byte block, no PPC resume address, no RAM pool in frame.ts; `40×56=2240` guarded, `2040` offender-scan green, dossier keeps the 56-byte block.

**Findings (severity-ordered — none blocking):**

| Severity | Finding | Location | Note |
|----------|---------|----------|------|
| [LOW] | Migration guard exercises only the AIRBORNE branch (script asserts `airborne===true` throughout); the ground branch's equivalence to `main.ts` rests on the code being verbatim (confirmed here by inspection), not on a test. A future ground-branch refactor would not be caught by AC-3. | `tests/scheduler.test.ts:322-401`, `src/core/frame.ts:stepPlayerEntity` | Non-blocking; ground branch is currently verbatim. Downstream story that wires `main.ts` onto `stepFrame` should add a ground/landing replay case. |
| [LOW] | `stepFrame` computes its single RNG stir from the start-of-frame `state.rng` and does not thread rng through `runBehaviour`; any future in-frame consumption would be discarded by the durable stream. Also `draw` advances on read, whereas the ROM's `RANDOM` read does NOT advance (only the IRQ stirs). Both are semantics-only-legal and satisfy AC-2 now (nothing consumes), but they are a design seam for jt2-5+ enemy AI that needs deterministic in-frame randomness. | `src/core/frame.ts:stepFrame`, `:draw` | Non-blocking; correct for jt2-1. Flagged for downstream design (see Delivery Findings). |
| [LOW] | `stepFrame` builds `next` via `new Array(len)` + two class passes; an out-of-union `cls` at runtime would leave a hole (undefined) in `processes`. Prevented by the `ProcessClass` type + tsc; only reachable via untyped ingress. | `src/core/frame.ts:stepFrame` | Informational; no fix required. |
| [MED] | **(test-analyzer)** `kill` with `mask=0` never tested: `kill(s,0,0)` removes EVERY process, `kill(s,5,0)` removes NONE — a refactor could silently flip kill-all vs kill-none with zero red. I independently re-verified the IMPLEMENTATION is correct (`filter(p => (p.id & 0) !== target)` so target 0 matches/removes all, any nonzero removes none — the correct masking law); this is a missing test, not a code defect. | `tests/scheduler.test.ts` (kill suite), `src/core/frame.ts:kill` | Accepted, non-blocking. Challenges my earlier `[EDGE] pass` — see reconciliation. Recommend TEA pin both directions. |
| [LOW] | **(test-analyzer)** Tautological test: `scheduler.test.ts:420` "RNG stir does not perturb physics" asserts `run()===run()` (same seed+script) — holds for ANY pure function; a `state.rng` into `posX` mutation kept it GREEN while the genuine bit-for-bit L362 test correctly went RED. Redundant scenery. | `tests/scheduler.test.ts:420` | Accepted, non-blocking. The real proof is L362 (mutation-confirmed genuine). Recommend dropping/repurposing L420. |
| [LOW] | **(test-analyzer)** `nap=0` unguarded/unpinned (wakes immediately, identical to `nap=1`); `NEUTRAL_INPUT` fallback (missing `inputs[id]`) never exercised; within-class `woke` order unpinned (a reverse-order scheduler would pass); duplicate spawn ids unpinned. | `src/core/frame.ts`, `tests/scheduler.test.ts` | Accepted, non-blocking test-hardening; code is correct, and the load-bearing laws (class boundary, masking table, nap-N wake) are already pinned + mutation-checked. |
| [LOW/informational] | **(security, clean)** Spread-based `ProcessSpec` could carry `__proto__` IF ever fed from untrusted JSON (not reachable today — object literals only); `processes`/`woke` unbounded (no external driver today). | `src/core/frame.ts` | Accepted, not reachable today; validate ingress + bound the list when `main.ts` wires the scheduler in. |
| [LOW/informational] | **(preflight, clean)** `origin/develop` is +1 past the review base (`b36a985` v0.0.2 release — not a rival feature). | — | Merge-hygiene note for SM finish; not a review defect. |

**Reconciliation with specialist subagents:**
- **Challenged — my `[EDGE] pass` claim** (that "mask 0xFF exact-one / no-match no-op" covered the kill edges): the test-analyzer correctly found the `mask=0` boundary untested. **Ruling:** I accept the test gap and downgrade the tag to `[EDGE] pass with gap`. I independently re-verified the implementation itself is CORRECT for `mask=0` (target 0 removes all, any nonzero removes none — the mathematically correct masking law), so this is a missing test on correct code, not a code defect — MEDIUM, non-blocking.
- **Confirmed, not challenged — migration guard genuine:** the test-analyzer's mutation run independently corroborates my finding — `scheduler.test.ts:362` went RED under a `state.rng` into `posX` mutation (the real bit-for-bit proof) while the redundant L420 stayed green. My "migration guard is genuine, not a tautology" ruling stands; L420 is the single redundant line, now flagged for removal.
- **Confirmed — [RULE] / [SEC] / [PREFLIGHT]:** rule-checker 5/5 (0 violations) corroborates my semantics-only / citations / PBLKM-anchor / 2240 / purity ruling; security-clean corroborates the pure-reducer, no-I/O reading; preflight-clean corroborates suite + tsc + commit hygiene.
- **No specialist finding is a Critical or High CODE defect.** The test-analyzer's "HIGH-confidence" tags denote confidence in the finding's existence, not severity; mapped to this repo's scale the strongest (mask=0) is a MEDIUM test gap on verified-correct code. The blocking rule (Critical/High code defect ⇒ REJECT) is not triggered.
- **Recommendation (non-gating, SM/TEA discretion):** a short hardening commit before or just after finish that pins `mask=0` (both directions), `nap=0`, the `NEUTRAL_INPUT` fallback, and within-class `woke` order, and drops/repurposes the tautological L420 test. None of these gate the merge.

**Deviation audit:** `## Design Deviations` says "No deviations logged." The inline-mulberry32-vs-`@arcade/shared`-dep choice is within TEA's explicitly-blessed envelope (Delivery Finding Gap; contract tests semantics only) and byte-equivalent — **ACCEPTED**, not an undocumented deviation. KLPROC self-exclusion (`CMPU PEXEC`, SYSTEM.SRC:349 — the ROM does exclude the killer) is honestly **deferred** (free-function kill has no caller concept yet); logged non-blocking, correct — the id+mask masking law itself is faithfully implemented.

**AC coverage:** AC-1 ✓ (naps, two classes, kill by id+mask; all 14 laws cited + claims-covered; citations suite green). AC-2 ✓ (once-per-frame stir independent of consumption; deterministic under seed). AC-3 ✓ (airborne replay bit-for-bit; pipeline verbatim both branches). AC-4/AC-5 ✓ (no wall-clock/Math.random; purity green; full `npm test` green).

**Handoff:** To SM for finish-story.