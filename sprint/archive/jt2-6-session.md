---
story_id: "jt2-6"
jira_key: "jt2-6"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-6: Transporters + the spawn service — pads by tier, the empty-third rule, ticket queue, timed materialisation safety

## Story Details
- **ID:** jt2-6
- **Jira Key:** jt2-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T17:10:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T16:16:59Z | 2026-07-20T16:18:58Z | 1m 59s |
| red | 2026-07-20T16:18:58Z | 2026-07-20T16:41:50Z | 22m 52s |
| green | 2026-07-20T16:41:50Z | 2026-07-20T16:52:01Z | 10m 11s |
| review | 2026-07-20T16:52:01Z | 2026-07-20T17:02:38Z | 10m 37s |
| green | 2026-07-20T17:02:38Z | 2026-07-20T17:09:59Z | 7m 21s |
| review | 2026-07-20T17:09:59Z | 2026-07-20T17:10:00Z | 1s |
| finish | 2026-07-20T17:10:00Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the abort-on-control law reads the WHOLE `CURJOY` word, not just the flap switch. The story/context cite the abort at `JOUSTRV4.SRC:5841` (`BNE 51$  ...WANTS TO FLAP`), but the condition codes come from `LDD CURJOY` at :5831 — the movement-check lines between (:5832-5840) are all commented out (`********` in col 1). So ANY nonzero input (direction OR flap) aborts; the ":5841 comment ...WANTS TO FLAP" is misleading. Modeled as `isControlInput = dir!==0 || flap || flapHeld`. Affects `src/core/transporter.ts` (do not narrow the abort to flap only). *Found by TEA during test design.*
- **Question** (non-blocking): "4 pads tied to platform tiers" is 4 pads across THREE screen thirds — TR2 and TR3 are BOTH the middle tier (right/left middle, AREA2), per the routing at `JOUSTRV4.SRC:5645-5650`. `PADS[].tier` is therefore `['top','middle','middle','bottom']`, not four distinct tiers. Affects `sprint/epic-jt2.yaml` (prose only, if a Reviewer wants the wording tightened). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-4's "full wave-1 complement" excludes the pursuit nibble. WAVE_TABLE row 1 is `$30,$01,0,2` = 3 bounders, 1 PURSUER — but pursuers seed the intelligence budget (jt2-5's `seedBudget`), they are not a spawn count. So the enemy complement is 3, and `waveEnemyComplement` sums bounders+hunters+lords+pterodactyls only. Affects `src/core/transporter.ts` (do NOT add pursuers to the entering count). *Found by TEA during test design.*

### Reviewer (code review)
- **Gap** (blocking): `enterViaPads(count, seed)` — AC-4's spawn-count seam ("this is what jt2-5's spawn counts flow through") — is exercised at `count === 3` and nowhere else (all four call sites; line 365's `count` resolves to wave-1's 3). A body hardcoded to `PADS[…]` × 3 ships green, yet jt2-7 sends later-wave complements through this same service. Affects `joust/tests/transporter.test.ts` (add `entries.length` + `index` assertions at count 0/1/5). *Found by Reviewer during code review.*
- **Gap** (blocking): the materialisation inert law — "an ended window is inert, no resurrecting the safety" (module doc: "an already-ended materialisation is returned unchanged"; Dev note: "both exits") — is proven only from the `aborted` state (line 281). A timed-out window is never re-stepped, so narrowing the guard to `end === 'aborted'` survives; that mutant would resurrect a timed-out window to `aborted` on a late control input. Affects `joust/tests/transporter.test.ts` (mirror the inert test from a timed-out window with BOTH control and neutral input). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): carries TEA's finding forward — epic prose "4 pads tied to platform tiers" reads as four distinct tiers, but they are four pads across THREE thirds (TR2/TR3 both middle). Affects `sprint/epic-jt2.yaml` (tighten wording only). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 6 findings (2 Gap, 0 Conflict, 1 Question, 3 Improvement)
**Blocking:** 2 BLOCKING items — see below

**BLOCKING:**
- **Gap:** `enterViaPads(count, seed)` — AC-4's spawn-count seam ("this is what jt2-5's spawn counts flow through") — is exercised at `count === 3` and nowhere else (all four call sites; line 365's `count` resolves to wave-1's 3). A body hardcoded to `PADS[…]` × 3 ships green, yet jt2-7 sends later-wave complements through this same service. Affects `joust/tests/transporter.test.ts`.
- **Gap:** the materialisation inert law — "an ended window is inert, no resurrecting the safety" (module doc: "an already-ended materialisation is returned unchanged"; Dev note: "both exits") — is proven only from the `aborted` state (line 281). A timed-out window is never re-stepped, so narrowing the guard to `end === 'aborted'` survives; that mutant would resurrect a timed-out window to `aborted` on a late control input. Affects `joust/tests/transporter.test.ts`.

- **Improvement:** the abort-on-control law reads the WHOLE `CURJOY` word, not just the flap switch. The story/context cite the abort at `JOUSTRV4.SRC:5841` (`BNE 51$  ...WANTS TO FLAP`), but the condition codes come from `LDD CURJOY` at :5831 — the movement-check lines between (:5832-5840) are all commented out (`********` in col 1). So ANY nonzero input (direction OR flap) aborts; the ":5841 comment ...WANTS TO FLAP" is misleading. Modeled as `isControlInput = dir!==0 || flap || flapHeld`. Affects `src/core/transporter.ts`.
- **Question:** "4 pads tied to platform tiers" is 4 pads across THREE screen thirds — TR2 and TR3 are BOTH the middle tier (right/left middle, AREA2), per the routing at `JOUSTRV4.SRC:5645-5650`. `PADS[].tier` is therefore `['top','middle','middle','bottom']`, not four distinct tiers. Affects `sprint/epic-jt2.yaml`.
- **Improvement:** AC-4's "full wave-1 complement" excludes the pursuit nibble. WAVE_TABLE row 1 is `$30,$01,0,2` = 3 bounders, 1 PURSUER — but pursuers seed the intelligence budget (jt2-5's `seedBudget`), they are not a spawn count. So the enemy complement is 3, and `waveEnemyComplement` sums bounders+hunters+lords+pterodactyls only. Affects `src/core/transporter.ts`.
- **Improvement:** carries TEA's finding forward — epic prose "4 pads tied to platform tiers" reads as four distinct tiers, but they are four pads across THREE thirds (TR2/TR3 both middle). Affects `sprint/epic-jt2.yaml`.

### Downstream Effects

Cross-module impact: 6 findings across 3 modules

- **`joust/tests`** — 2 findings
- **`sprint`** — 2 findings
- **`src/core`** — 2 findings

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Materialisation window modeled as a caller-supplied nap, not a fixed ROM duration:** Spec cites `JOUSTRV4.SRC:5841-5892,5923-5925` for the abort + collision re-enable but pins NO duration; the ROM's actual window is a PFEET/PTIMUP blink cadence (:5810-5871) that is effect/shell timing (epic ruling: shell owns timing, cf. the jt2-5 WAVDEL "no exact-duration pins"). Tests pin the countdown BOUNDARY (last safe frame vs one past) + the abort law + the collision-disable/re-enable, with the window length a `beginMaterialise(windowFrames)` parameter. Reason: the cited lines pin the abort and the `PID |$80` re-enable, not a frame count; over-pinning a fabricated blink duration would be scenery the Reviewer's mutation pass could not honestly target.

## Sm Assessment

Setup verified: session file with bare workflow field at setup phase, context generated, branch feat/jt2-6-transporters-spawn-service off develop at 0945d27 (jt2-5's merge), story in_progress (setup subagent committed and pushed the tracking itself — contents verified benign: context file + status flip only). Peloton mode continues; merges pre-authorized. Next owner is TEA for red: pin the pad/tier constants, the SELARE empty-third rule both directions, the NPSERV/LPSERV ticket queue with players served ahead of enemies, the timed-materialisation safety with abort-on-ANY-control (both directions — untouched window holds, input ends it early; it is an abort law, not invulnerability), P1/P2 spawn constants with facing and mounts, and AC-4's full wave-1 complement entering via pads deterministically under seed using jt2-5's WAVE_TABLE row 1 counts.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev) · committed `0b0e1e5` on `feat/jt2-6-transporters-spawn-service` · tsc clean.

**Test Files (all TEA-authored, test-side only — no src/, no claims):**
- `joust/tests/helpers/transporter-contract.ts` — the module seam Dev implements (`src/core/transporter.ts`) + `loadTransporter()` self-describing loader.
- `joust/tests/transporter.test.ts` — 36 behaviour tests (the laws, both directions, boundary-exact).
- `joust/tests/transporter-source.test.ts` — 77 tests: source provenance LAWS (verify each citation is real), an INDEPENDENT byte-gate re-derivation (pad X/Y, SELARE boundaries, spawn X), and the JT26 claim gate.

**Real vitest counts (verified, not estimated):**
- Full suite: `967 tests` — `51 failed | 916 passed`, `2 failed | 24 passed` files.
- New behaviour file: 36 tests, ALL red (clean `loadTransporter` throw).
- New source file: 77 tests → 15 red (3 byte-gate throws + 12 JT26-claim gaps), 62 green (source provenance guards — every citation confirmed present in JOUSTRV4.SRC/RAMDEF.SRC).
- Pre-existing 854 all green (916 − 62 new provenance = 854); the original 24 test files untouched.

**Laws pinned (every citation re-verified against the vendored tree by TEA):**
1. **4 pads by tier** — `JOUSTRV4.SRC:5587-5590` (record layout `:96-99`). TR1 (x113,y80,top), TR2 (x231,y128,middle), TR3 (x23,y137,middle), TR4 (x127,y210,bottom). `$6A+7`/`$51-1` etc. evaluated; each pad's tier == `selectArea(y)`.
2. **SELARE empty-third** — `JOUSTRV4.SRC:6413-6424`. Boundaries `$51` (top/middle) and `$A3+6`=`$A9` (middle/bottom) — the `$8A+6` on :6414 is a DEAD comment column (COLOR1 trap; pinned by a dedicated test). Boundary-exact: `$50`→top/`$51`→middle, `$A8`→middle/`$A9`→bottom. Empty proceeds / crowded defers — both directions.
3. **Ticket queue** — `JOUSTRV4.SRC:5615-5676` (`NPSERV/LPSERV/NESERV/LESERV`, RAMDEF `:248-251`; serve inc `:5722-5724`). Players served AHEAD of enemies (enemy holding `leserv` still waits while any player holds an unserved number — both directions). Player FIFO, enemy FIFO among enemies — both directions.
4. **Timed materialisation safety = ABORT law** — `JOUSTRV4.SRC:5828,5831,5841,5848,5892,5923-5925`. Safe = collisions disabled (`PID $80` clear); untouched → times out at the window boundary (last safe frame vs one past); ANY control input aborts EARLY (first frame, last frame, dir/flap-edge/flap-held each), re-enabling collisions; ended window is inert. Nap-pattern (jt2-1's PNAP).
5. **P1/P2 spawn** — `JOUSTRV4.SRC:1020-1039`. P1 `{x:100,facing:1,mount:'ostrich'}`, P2 `{x:200,facing:-1,mount:'stork'}`; PFACE 0=right/<>0=left (RAMDEF `:186`). Both directions (distinct X, P1 not-left, P2 not-right, distinct mounts).
6. **AC-4** — wave-1 complement = 3 (from jt2-5 `WAVE_TABLE` row 1 `$30,$01,0,2`); pursuit nibble EXCLUDED; `enterViaPads(count,seed)` deterministic + valid pads + seed-sensitive (anti-vacuity rail) + end-to-end via `waveRowAt(1)`.

**Claims (Dev deliverable):** `docs/rom-study/claims/transporter.json` with `JT26-*` entries covering all 11 cited ranges. Verbatims byte-match the vendored lines (the existing `tests/audit/citations.test.ts` re-opens every committed claim). The JT26 gate requires the JT26 PREFIX per range — the pre-existing JT8/JT23 claims on some of these lines do NOT satisfy it (README: two claims per anchor by design). PFACE (`:186`, already JT23-015) is a provenance guard only, no new claim required.

**Handoff:** To Dev (Julia) for GREEN — see the Dev briefing in the peloton handoff.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `joust/src/core/transporter.ts` (new) — the pure transporter + spawn-service core satisfying `tests/helpers/transporter-contract.ts`: `PADS` (TR1..TR4, tier derived via `selectArea` from each pad's own Y — no hand-typed tier), `THIRD_MIDDLE_MIN=0x51` / `THIRD_BOTTOM_MIN=0xA3+6=0xA9`, `selectArea`/`scanAreas`/`spawnProceeds` (empty-third rule), the NPSERV/LPSERV/NESERV/LESERV ticket queue (`nextServed`/`playerTurn`/`enemyTurn` with the `npserv===lpserv` players-first guard), `isControlInput`/`beginMaterialise`/`stepMaterialise` (abort-on-ANY-control regardless of napLeft; timed-out at 0; ended-stays-ended), `PLAYER1/2_SPAWN`, `waveEnemyComplement` (bounders+hunters+lords+pterodactyls, pursuers EXCLUDED), `enterViaPads` (pure mulberry32 inlined from frame.ts).
- `joust/docs/rom-study/claims/transporter.json` (new) — 55 `JT26-*` claims covering all 11 cited ranges; verbatims generated directly from the vendored 1982 source (byte-exact), each claim names its own FILE:LINE.

**Tests:** 968/968 passing (GREEN) — was 967 (51 failed | 916 passed) at RED. Full suite `26 files passed`. Purity sweep grew by one: `src/core/transporter.ts stays inside the boundary` ✓ (the it.each(coreFiles) new-file test). tsc `--noEmit` exit 0. Citations checker byte-opened all 624 committed claims against the vendored tree → "all claims verified", exit 0.

**Branch:** `feat/jt2-6-transporters-spawn-service` (pushed, `1c080d9`). Diff is src + claims only — no test/contract edits. Working tree clean.

**Notes for Reviewer:**
- **Independent byte-gate agrees:** the source suite re-derives pad X/Y ($6A+7=113/$51-1=80 …), the SELARE operands ($51, $A3+6=$A9 — NOT the dead $8A+6=$90 column), and P1/P2 X (#100/#200) with its own evaluator; all match the module constants.
- **Materialisation is an ABORT law, not invulnerability:** abort precedes the timeout check, so a control input on the last safe frame (napLeft=1) aborts rather than times out; both exits set `collisionsEnabled=true`; an ended window is returned unchanged.
- **enterViaPads seed-sensitivity:** seeds 1..8 (count 3) yield 7 distinct pad sequences (rail wants >1); deterministic per seed; every pad a real PadId. mulberry32 is the inlined pure generator, no ambient entropy.
- **No src→test coupling:** the module imports only sibling-core TYPES (`PlayerInput` from flight, `Facing` from joust, `WaveRow` from wave) — type-only, erased at build; it never touches `tests/helpers/joust-source.ts` (the double-entry independence rule).

## Subagent Results

**All received: Yes**

| Specialist | Result | Findings |
|-----------|--------|----------|
| reviewer-preflight | Clean | 5 files +1736/−0; suite 968/968; tsc clean; zero leftovers; clean TDD split (src+claims only); branch synced; origin/develop NOT moved. |
| reviewer-test-analyzer | 2 findings (HIGH) | 16 mutations, 14 killed, 2 survived (cp-backup discipline, control 113/113): (a) `enterViaPads` count never exercised off 3; (b) "ended stays ended" proven only for `aborted`, not `timed-out`. KILLED: both third boundaries both directions, npserv===lpserv guard, abort-precedes-timeout, timeout off-by-one, pursuer exclusion, tier-from-Y, seed-ignore, cross-contamination. |
| reviewer-security | Clean | 0 findings. Unbounded `count` noted informationally (internal wave-data caller only — no external input reaches it). |
| reviewer-rule-checker | Pass | Item-0 CONFIRMED with quoted source ($A3+6=$A9 operand, $8A+6 dead comment column; pads eval exactly to (113,80)/(231,128)/(23,137)/(127,210); P1/P2 spawn constants incl. PFACE 0=RIGHT). All 55 JT26 claims byte-exact (0 mismatches). All 5 rules PASS; byte-gate independence verified live (77/77 executed). |

## Reviewer Assessment

[PREFLIGHT] clean · [SEC] clean · [RULE] pass · [TEST] pass — round-1's 2 HIGH both killed in round 2

**Verdict:** APPROVED (round 2). Round 1 was REJECTED for two in-contract mutation survivors; both are now closed by commit bd660a0 (tests-only, src sha unchanged 52ae2102…). See the full round-2 verdict in "Reviewer Assessment (round 2)" at the end of this file. The round-1 detail below is retained as the review record.

---
**Round 1 verdict (historical):** REJECTED

**Data flow traced:** a materialising player's `PlayerInput` → `isControlInput` (`dir!==0 || flap || flapHeld`, the whole CURJOY word, TEA finding #1 honoured) → `stepMaterialise` where the abort check precedes the nap decrement, so a control input on the last safe frame (napLeft=1) aborts rather than times out (test:255, mutation KILLED). The real code's inert guard `m.end !== 'active'` is correct — it is the *test* that under-defends it (finding below).

**Pattern observed:** tier is never hand-typed — `padOf` derives each pad's tier from its own Y via `selectArea` (`transporter.ts:118-119`, pinned test:52), so the four pads route top/middle/middle/bottom off the same SELARE boundaries as live occupants. Good pattern; TEA finding #2 (TR2/TR3 both middle) is honoured.

**Error handling / bounds:** `enterViaPads` pad index `Math.floor(value * PADS.length)` cannot go out of range — mulberry32 `value < 1.0` (max 4294967295/4294967296), so floor ∈ 0..3; `seed >>> 0` coerces any seed to uint32 without breaking determinism (`transporter.ts:255-277`). Safe.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `enterViaPads` count seam unproven — every call uses count 3, so replacing the loop bound with literal `3` passes 113/113. A spawn service hardcoded to 3 ships green; jt2-7 sends larger complements through it. In-contract: AC-4's own "jt2-5's counts flow through" seam. | `joust/tests/transporter.test.ts:335-366` | Add assertions on `entries.length` + `index` sequence at count 0, 1, and 5 (not only 3). |
| [HIGH] | Materialisation inert law proven only for `aborted`; a timed-out window is never re-stepped, so narrowing the guard to `end === 'aborted'` survives — and would resurrect a timed-out window to `aborted` on a late control input. In-contract: the materialisation law's own text ("both exits", "returned unchanged"). | `joust/tests/transporter.test.ts:277-284` | Mirror the inert test from a `timed-out` window with BOTH a control input and a neutral input; assert `end` stays `timed-out` and `collisionsEnabled` stays true. |

**Ruling on the two survivors (epic bar — jt2-3/4/5 precedent: in-contract mutation survivors on story-named laws are BLOCKING):**
- Survivor (a) — count seam: **BLOCKING**. `enterViaPads(count, seed)` is AC-4's contract ("this is what jt2-5's spawn counts flow through"); the parameter is the story-named law, and `count===3` happens to be the exact literal a hardcode mutant uses. Not scenery — jt2-7 depends on it. The code is correct; the rail is missing.
- Survivor (b) — inert both-exits: **BLOCKING**. "An ended window is inert" spans both `aborted` and `timed-out`; the module doc, the test section header, and the Dev note all say "both exits". Only one exit is pinned. The mutant it lets through is not benign — it resurrects a timed-out safety on a control input.

Both are test-coverage gaps (the shipped `transporter.ts` is correct in both spots), so no `src/` change is needed — the two rails go into the behaviour suite and pass immediately against the current code.

**Deviation audit:** one deviation — "materialisation window as a caller-supplied `windowFrames` nap, not a fixed ROM duration." **ACCEPTED.** The cited lines pin the abort law and the `PID |$80` collision re-enable, not a frame count; the ROM window is a PFEET/PTIMUP blink cadence that is shell/effect timing, matching the epic's shell-owns-timing ruling (cf. jt2-5 WAVDEL "no exact-duration pins") and reusing jt2-1's PNAP idiom (rule-checker confirmed). Over-pinning a fabricated duration would have been un-mutatable scenery.

**TEA's three delivery findings — all correctly implemented, no action:** CURJOY whole-word abort → `isControlInput` (transporter.ts:210-212); TR2/TR3 both middle → tiers top/middle/middle/bottom; pursuers excluded → `waveEnemyComplement` sums bounders+hunters+lords+pterodactyls (transporter.ts:249-251, test:321-333). The prose-tightening half of finding #2 is carried forward as a non-blocking Delivery Finding.

**Verdict rationale:** Preflight, security, and every ROM-fidelity gate (55/55 claims byte-exact, item-0 confirmed against source, 5/5 rules pass) are clean, and the implementation is correct. But two in-contract mutation survivors sit on the story's core laws — the spawn-service count seam (AC-4) and the materialisation inert law (AC-3) — and this epic's bar makes those blocking. The suite's own preamble ("lost a review round to a one-sided pin three times; refuses to be the fourth") is exactly what these two gaps are.

**Handoff:** back to TEA (O'Brien) to add the two rails (test-side only; code is already GREEN against them). No `src/` change required.
## Tea Assessment (round 2 — hardening)

Reviewer round 2 REJECTED jt2-6 with two test-side required items (code correct in both spots — coverage rails). Both addressed. Tests-only.

**Commit:** `bd660a0` (pushed) on `feat/jt2-6-transporters-spawn-service` (was `1c080d9`). tsc clean. Full suite **970 passed (970)**, 26 files (+2 tests from the 968 baseline). Working tree clean; `src/core/transporter.ts` untouched (sha `52ae2102…` restored after each mutant).

**Tests added (both in `joust/tests/transporter.test.ts`):**
1. AC-4 › "threads the count parameter — length and index run track count, not a literal": pins `enterViaPads` at counts **0, 1, 5** (empty → `[]`; 1 → indices `[0]`; 5 → length 5, indices `[0..4]`).
2. AC-3 › "a TIMED-OUT window is inert too — a late control input cannot resurrect the safety": runs a 2-frame window to `timed-out`, then re-steps with **a control input** (asserts `end` stays `'timed-out'`, `collisionsEnabled` stays `true`) and **a neutral input** (asserts the object is returned unchanged).

**Mutant-kill evidence (cp backup → mutate → run → restore+sha-verify → control):**

| # | Mutant | File:site | Result | Blast radius |
|---|--------|-----------|--------|--------------|
| 1 | loop bound `count` → literal `3` | transporter.ts `enterViaPads` (`index < 3`) | **1 failed \| 37 passed** — only the new count test red | targeted only |
| 2 | inert guard `end !== 'active'` → `end === 'aborted'` | transporter.ts `stepMaterialise` | **1 failed \| 37 passed** — only the new timed-out test red | targeted only |

- Before/after each mutant, `src/core/transporter.ts` sha256 = `52ae2102ce0cb8df787004084f5cbe7d59d646e8993b06ef456ab92bc5f7626a` (restored from `scratchpad/transporter.ts.bak`, verified equal).
- Control run after restore: `tsc` clean, full suite **970 passed (970)**, `git status` clean (module unmodified — only the test file committed).

Mutant 1's kill: under `index < 3`, `enterViaPads(0,·)` returns 3 entries not `[]`, and `(1,·)`/`(5,·)` return 3 not 1/5 — all three counts catch it. Mutant 2's kill: under `end === 'aborted'`, a control re-step of a timed-out window falls through the guard and flips `end` to `'aborted'` (the resurrection) — the control-input assertion catches it; the neutral `toEqual` also catches the `napLeft` drift to −1.

**Handoff:** back to Reviewer for re-review (both required rails landed, mutation-proven).

## Reviewer Assessment (round 2)

[PREFLIGHT] pass · [SEC] clean · [RULE] pass · [TEST] pass — both round-1 blockers killed

**Verdict:** APPROVED

**What I verified independently (not just relayed):**
- **Scope is tests-only.** `git show bd660a0 --stat` = `tests/transporter.test.ts | 33 ++`, one file. `git diff 1c080d9 bd660a0 -- src/ docs/rom-study/claims/` is EMPTY — `src/core/transporter.ts` and all 55 JT26 claims are byte-identical to round 1, sha256 still `52ae2102ce0cb8df787004084f5cbe7d59d646e8993b06ef456ab92bc5f7626a` on disk. So every round-1 ROM-fidelity gate (item-0 confirmed, 55/55 byte-exact, 5/5 rules) still holds unchanged, and no new src attack surface was introduced.
- **Green control.** `tsc --noEmit` exit 0; `transporter.test.ts` 38 passed (36 + 2 new rails); full suite **970 passed (970)**, 26 files, tree clean. (The `jt1-9-empty` "no claims found / refusing to report success" lines on stderr are a deliberate negative-path test asserting the empty-dir guard fires — not a failure; the run is 970/970.)

**Both required rails close their round-1 gap — mutant-kill traced by hand:**

| Round-1 blocker | Rail (transporter.test.ts) | Mutant | Why it now reds |
|-----------------|----------------------------|--------|-----------------|
| enterViaPads count seam unproven off 3 | "threads the count parameter …" — counts 0/1/5 | loop bound `count`→`3` | `enterViaPads(0,99)` returns 3 entries, test asserts `[]`; count 1 asserts index `[0]`, count 5 asserts length 5 + `[0..4]` — all three reject the literal-3 body. |
| ended-inert proven only for `aborted` | "a TIMED-OUT window is inert too …" — control + neutral re-step | guard `end!=='active'`→`end==='aborted'` | timed-out re-stepped with `{dir:-1}` falls through the narrowed guard into the control branch and flips `end` to `'aborted'` (the resurrection); test asserts `end` stays `'timed-out'`, collisions stay true. Neutral re-step's `toEqual(timedOut)` also catches the `napLeft`→−1 drift. |

TEA's cp-backup mutation evidence (each mutant `1 failed | 37 passed`, module sha-restored to `52ae2102…`, control 970 green) is consistent with the sha I observe live and with my static trace. Both survivors are dead.

**Deviation audit:** unchanged from round 1 — the caller-supplied `windowFrames` nap deviation stays ACCEPTED (shell-owns-timing, jt2-1 PNAP idiom).

**Verdict rationale:** the two in-contract survivors that made round 1 blocking are now killed by targeted rails that red only on their mutant; the shipped code was already correct and is untouched (sha-verified), so nothing else in the review moved. All gates green.

**Remaining items:** none blocking. One non-blocking Delivery Finding carries forward for a later story — tighten `sprint/epic-jt2.yaml`'s "4 pads tied to platform tiers" prose (four pads across THREE thirds; TR2/TR3 both middle).

**Handoff:** to SM for finish-story.