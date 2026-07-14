---
story_id: "tp1-6"
jira_key: "tp1-6"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-6: NYMPHS + THE 7-INVADER CAP — the arcade holds surplus enemies dormant; we have neither the cap nor the queue

## Story Details
- **ID:** tp1-6
- **Jira Key:** tp1-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 10
- **Type:** feature

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T15:28:36Z
**Round-Trip Count:** 1
**Repos:** tempest
**Branch:** feat/tp1-6-nymph-queue-invader-cap
**Context:** sprint/context/context-story-tp1-6.md

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T13:54:35Z | 2026-07-14T13:58:17Z | 3m 42s |
| red | 2026-07-14T13:58:17Z | 2026-07-14T14:41:57Z | 43m 40s |
| green | 2026-07-14T14:41:57Z | 2026-07-14T15:06:21Z | 24m 24s |
| review | 2026-07-14T15:06:21Z | 2026-07-14T15:18:05Z | 11m 44s |
| red | 2026-07-14T15:18:05Z | 2026-07-14T15:20:26Z | 2m 21s |
| green | 2026-07-14T15:20:26Z | 2026-07-14T15:26:54Z | 6m 28s |
| review | 2026-07-14T15:26:54Z | 2026-07-14T15:28:36Z | 1m 42s |
| finish | 2026-07-14T15:28:36Z | - | - |

## Sm Assessment

Setup complete for tp1-6 (10 pts, p1, feature, tempest, tdd). Session, story
context, and epic context are in place; branch
`feat/tp1-6-nymph-queue-invader-cap` created in tempest from origin/develop
(97ec9ce, post v1.0.11 release — prerequisites tp1-4/tp1-5 are merged). Story
status set to in_progress. Jira: N/A for this project (local YAML tracking).

Handoff to O'Brien (TEA) for RED. Key coordination notes recorded in
`sprint/context/context-story-tp1-6.md` Technical Approach:

- Read tp1-4/tp1-5 archives (Delivery Findings) first — this story's W-024/W-029
  hooks land in the CAM subsystem those stories just rewrote.
- ROM quarry is ALWELG.MAC (NYMCOU, NINVAD=7, WINVMX=6, slot back-pressure).
- Citation-gate trap: the nymph queue is a NO_COUNTERPART addition — never mark
  those findings `remediated_by` (hard-errors in check-citations.mjs).
- W-024 fuseball tests need a liveness guard (tp1-5 review found W-023's test
  passes vacuously on a frozen fuseball).

## TEA Assessment

**Tests Required:** Yes
**Reason:** 10-point feature adding a whole missing system (the nymph queue) plus a
population cap that rewrites the spawn model and rekeys three CAM behaviors.

**Test Files:**
- `tempest/tests/core/tp1-6.nymph-queue.test.ts` — the queue object: ININYM stagger
  bands, exact-frame hatches, the far-end crawl + committed lanes, the alone zone,
  level-clear/respawn integration, purity, determinism, and AC-3's conservation proof
- `tempest/tests/core/tp1-6.invader-cap.test.ts` — the 7-slot cap: the strictly-greater
  freeze boundary (6 hatches / 7 freezes / kill thaws, mirrored in one test), chasers
  counted (INMCOU+INCCOU), cap constancy across waves 1-99 AND past the table (100,
  150), frozen-queue rotation, tanker splits through the same gate (arrival + bullet),
  and the Superzapper freeze ("AVOID KAMIKAZE")
- `tempest/tests/core/tp1-6.fuseball-turnback.test.ts` — W-024: the $20 patrol envelope
  vs the empty-queue arrival (mirrored), the wave-17/18 boundary (0-based CURWAV), and
  the JFUSKI exact-rim kill gate the patrol makes load-bearing
- `tempest/tests/core/tp1-6.pulsar-yoyo.test.ts` — W-029 + JSTRAI rekeyed on NYMCOU:
  rim bounce vs conversion (mirrored), mid-descent "SEND PULSAR UP" on queue-empty,
  PULPOT reversal, spiker→tanker conversion gate
- `tempest/tests/core/tp1-6.source-rules.test.ts` — quarry fingerprint (3569/1131
  lines), byte pins for every cited line (including the two decodes a port gets wrong:
  the IFCS+IFNE strictly-greater gate, and WINVMX = "MAX # OF INVADERS-1"), and AC-1's
  citation scan over src/core

**Tests Written:** 40 tests covering all 6 ACs
**Status:** RED (31 failing, 9 passing as pre-GREEN guards/source pins — verified by
testing-runner, run tp1-6-tea-red; commit e2b23c1 on feat/tp1-6-nymph-queue-invader-cap)
**Existing suite:** 1022/1022 green, citation gate green — no regressions from the RED commit.

### The contract Dev implements

- `SpawnState` becomes `{ nymphs: Nymph[] }` with `Nymph = { lane: number, py: number }`
  exported from `src/core/state.ts`. `py` is the ROM's NYMPY: integer FRAMES until
  hatch, minus 1 per step while movement is allowed. NYMCOU == `nymphs.length`.
- The freeze gate is STRICTLY GREATER: nymphs advance while live invaders
  (`s.enemies.length`, chasers included) ≤ WINVMX (6); they freeze at 7. A running zap
  window (`player.zapTimer > 0`) also freezes. Rotation (far-end crawl) continues
  while frozen — it sits outside the ROM's TEMPY guard.
- Seeding (INIENE/ININYM): whole budget at wave start AND on respawn; nymph i at
  py = (i<<4)|lane with the all-zero seed bumped to $0F; lanes from the state rng.
- Every activation — hatch AND split child — routes through one 7-slot gate (ACTINV).
  A failed hatch is restored to the queue; a failed split child is dropped (ROM).
- `CamContext.spawnRemaining`'s three consumers (chaser, jpulmo, jstrai) rekey onto
  the live nymph count; jfuseup gains the W-024 turn-back (cap $20, floor $80,
  landing reverses direction, all only while NYMCOU>0 and displayed wave ≤ 17).
- `resolvePlayerHits`: the FUSE kill gates at exact rim (depth ≥ 1), not
  PLAYER_RIM_DEPTH — JFUSKI. Other grabbers unchanged.
- Cite as you build: the source-rules scan requires NYMCOU/MOVNYM/ININYM/CONYMP/
  NINVAD/WINVMX and the ALCOMN.MAC:916/:809 definition lines to appear in src/core.

### Sibling translation (mechanical, Dev applies at GREEN)

The old `{ remaining, timer }` shape appears in ~74 fixture sites across 32 test
files (grep `spawn.remaining|spawn.timer|spawn = {`). These are FIXTURE-ONLY
translations — assertions' intents are unchanged except where noted:

| Old fixture | Meaning | New fixture |
|---|---|---|
| `spawn.remaining = 0` / `{remaining: 0, …}` | nothing left to spawn | `s.spawn = { nymphs: [] }` |
| `{remaining: N>0, timer: 999}` | budget pending, quiet in-window | `{ nymphs: dormant(N) }` — py ≥ 30000, 16 apart |
| `{remaining: N, timer: 0}` | spawn eagerly | `{ nymphs: [{lane: i%laneCount, py: 1+16*i}] }` |
| reads of `spawn.remaining` | budget left | `spawn.nymphs.length` |

Special cases: `sim.difficulty.test.ts:75,88,91` pin `spawnInterval` values — delete
those three assertions WITH the field (see Delivery Findings). `sim.spawn.test.ts`'s
`spawnedKinds()` driver seeds an eager queue; its distribution assertions hold
unchanged because kinds roll at hatch.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Core purity (CLAUDE.md hard boundary) | `nymph-queue`: aliased-queue + no-input-mutation test | failing |
| Determinism from seed (house rule) | `nymph-queue`: seed-agreement + 100-frame lifecycle | failing / guard |
| lang-review #1/#8 (no `as any`, honest types) | all suites use type-guard finds, zero casts; contract errors surface as tsc RED | self-checked |
| lang-review #2 (readonly params) | contract keeps `CamContext` readonly; compile-level | n/a (no new test) |
| lang-review #3 (exhaustiveness) | no new unions introduced by the contract; existing assertNever pins stand | n/a |
| lang-review #4 (`||` vs `??` on 0-valid) | WINVMX is a constant, not a lookup; the table-shaped failure is covered by L100/150 walk-off probes | covered |
| Table walk-off (sidecar rule) | `invader-cap`: levels 100 and 150 probes | failing |
| Seeded-RNG vacuousness (sidecar rule) | every negative half paired with its mirror in ONE test; liveness guards on fuse/pulsar/spiker/crawl | self-checked |
| Citation gate (`npm test -- citations`) | green pre-commit; `source-rules` adds the tp1-6 pins | green |

**Rules checked:** 6 of 13 lang-review checks applicable; all applicable ones have
coverage or a compile-level enforcement path. **Self-check:** 0 vacuous tests found
(every freeze/negative assertion carries a mirror half or liveness guard).

**Handoff:** To Julia (Dev) for GREEN. Read the ROM decodes in the test headers before
implementing — the two traps (strictly-greater gate; exact-rim fuse kill) are both
places where the obvious reading ships the wrong cabinet.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (core):**
- `src/core/state.ts` — `Nymph` type; `SpawnState` becomes `{ nymphs }`; `qframe`
  (the QFRAME parity the crawl needs); `initialState` seeds the queue from the rng
- `src/core/rules.ts` — `NINVAD`/`WINVMX` (cited); the three FUSE_* patrol constants;
  `spawnForLevel` is the ININYM port ((i<<4)|lane stagger, all-zero bump, rng lanes);
  `spawnInterval` DELETED from LevelParams (W-003's metronome)
- `src/core/sim.ts` — `stepNymphs` (the MOVNYM/CONYMP port: strictly-greater freeze
  gate incl. chasers, superzap freeze, march/hatch/restore, frozen crawl, alone
  zone); `activateInvaders` (the ACTINV slot gate, applied to both split paths);
  level-clear and startLevel on the queue; the fuse kill gated at the exact rim
  (JFUSKI); nymphs deep-cloned in cloneState
- `src/core/enemies/interpreter.ts` — `CamContext.spawnRemaining` → `nymphCount`
  (NYMCOU) across chaser/jpulmo/jstrai; `jfuseup` gains the W-024 turn-back
  ($20 cap with re-seat, $80 floor, queue-empty override, rim frame stays lethal)

**Files Changed (tests):** ~50 fixture sites across 34 sibling files translated per
the TEA table (`remaining/timer` → queues); two TEA fixture arithmetic repairs in
`tp1-6.nymph-queue.test.ts`; two sibling assertion-subject changes
(`sim.framing.test.ts` RNG-untouched → wave-seeded, `sim.difficulty.test.ts`
spawnInterval assertions retired with the field) — all six logged as deviations.

**Files Changed (audit):** W-002/W-003/W-004/W-024/W-029/DA-017 stamped
`remediated_by: tp1-6` (W-002 is NO_COUNTERPART with `ours: null` — legal since
tp1-5's gate rework); DA-012 left OPEN (display half unbuilt — see findings);
W-010/WD-016 re-quoted onto their moved lines, NOT stamped (still-open divergences);
39 citations re-anchored via `reanchor-citations.mjs --write`.

**Tests:** 1051/1051 passing (GREEN), citations gate green, `npm run build` clean.
**Branch:** feat/tp1-6-nymph-queue-invader-cap (pushed; commits e2b23c1 RED, e3f9b76 GREEN)

**Handoff:** To the Thought Police (Reviewer) for code review. The six ACs:
queue exists with cited NYMCOU (AC-1 ✓, incl. the source scan), cap 7 constant
across waves with the strictly-greater gate (AC-2 ✓), back-pressure with no spawn
ever dropped (AC-3 ✓, conservation proof), W-024 (AC-4 ✓), W-029 (AC-5 ✓),
citations green (AC-6 ✓).

## TEA Assessment (red rework, round-trip 1)

**Tests Required:** Yes (Reviewer finding #2 — testable logic bug)
**Test Files:**
- `tempest/tests/core/tp1-6.nymph-queue.test.ts` — two new pins under "tp1-6 rework":
  (1) budgets past 16 seed into REPEATING mod-16 bands, all pys ≤ $FF (the ROM's
  TXA/ASL×4 byte wrap); (2) the $0F zero-bump applies POST-wrap (index 16 lane 0
  rescued like index 0; laneCount 1 forces the case deterministically). The original
  level-1 band test's comment corrected — it holds only because budget 6 never wraps.

**Tests Written:** 2 new (RED: both failing against the unbounded shift; the other 10
in the file stay green). Commit bce3a59.
**Status:** RED — ready for Dev, whose rework also carries the Reviewer's HIGH
(rebase onto origin/develop + rim-constant consolidation) and the two LOWs (TEMPY
latch: document or port; NNYMPH note for tp1-7).

### Design Deviations (rework)
No new deviations from spec: the pins transcribe ALWELG.MAC:328-332 arithmetic
directly; the earlier "bands strictly increasing" wording in this file was MY
unwrapped misreading and is corrected in place, not a spec change.

**Handoff:** To Julia (Dev) for the wrap fix + rebase/consolidation per the
Reviewer Assessment.

## Dev Assessment (green rework, round-trip 1)

**Implementation Complete:** Yes — all four Reviewer findings resolved (commit 9998ff0, pushed).

- **[HIGH] merge/consolidation:** origin/develop (tp1-27) merged in. Findings JSONs
  resolved as develop's base + the six tp1-6 stamps re-applied + full re-anchor (0
  lost; WD-016 re-quoted onto the nymph spelling, still open — no phantom stamp).
  interpreter.ts conflict resolved keeping tp1-27's `RIM_DEPTH = PLAYER_RIM_DEPTH`
  derivation. `RIM_DEPTH_EXACT` and the fuse `grabDepth` split are DELETED — one
  CURSY-derived spelling gates every kill, with both citations (CHASER seating;
  JFUSKI equality) on the unified predicate. tp1-27's stale-prose retractions taken.
  tp1-27's new suite (tp1-27.player-rim-depth.test.ts) translated to the queue shape.
- **[MEDIUM] ININYM wrap:** `((i & 0x0f) << 4) | lane`, $0F bump post-wrap; doc
  comment corrected and carries the round-trip note. TEA's two rework pins green.
- **[LOW] TEMPY latch:** PORTED (not just documented) — a no-slot hatch now freezes
  the rest of that frame's queue (`latched`), matching ALWELG.MAC:1197-1198.
- **[LOW] NNYMPH>budget:** left as the standing finding for tp1-7 (no code change).

**One further fixture repair (logged):** the determinism test's liveness guard now
counts CUMULATIVE hatches — tp1-27's bolt-line change deterministically shifted a
death/respawn cycle under the final-frame count it used to read.

**Tests:** 1067/1067 passing (92 files, incl. tp1-27's suite), citations 0 lost /
gate green, build clean.
**Branch:** feat/tp1-6-nymph-queue-invader-cap (pushed; merge commit 9998ff0)

**Handoff:** To the Thought Police (Reviewer) for re-review.

### Dev deviation (rework)
- **Determinism liveness guard re-scoped to cumulative hatches**
  - Spec source: tests/core/tp1-6.nymph-queue.test.ts (TEA RED, determinism test)
  - Spec text: "guard: the run must actually hatch something" via final-frame `enemies.length > 0`
  - Implementation: the guard now sums positive enemy-count deltas across the run.
  - Rationale: the run deterministically passes through a death/respawn after tp1-27
    moved the bolt kill line; a respawn clears the board, so the final frame can be
    legitimately empty while hatching demonstrably occurred. Intent (non-vacuous
    determinism) unchanged; determinism assertions untouched.
  - Severity: minor
  - Forward impact: none.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | error | none returned | spawned but returned no result in-window; domain covered by Reviewer directly: build clean, 1051/1051 tests, citations 12/12, tree clean, smell scan zero hits, merge-check run inline (7 conflicts found) |
| 2 | reviewer-edge-hunter | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (boundary analysis: gate at 6/7, ININYM index 16 wrap — finding #2, zap-window last frame, py 0x3f/0x40 edges) |
| 3 | reviewer-silent-failure-hunter | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (both silent paths — dropped split child, restored hatch — are ROM-cited, commented, and test-pinned) |
| 4 | reviewer-test-analyzer | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (mirror-halves + liveness guards verified present in all four behavior suites; two GREEN fixture repairs audited intent-preserving) |
| 5 | reviewer-comment-analyzer | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (found: JFUSKI comment cites the 0.92 constant tp1-27 retired, and splitTanker prose upstream-retracted — folded into finding #1) |
| 6 | reviewer-type-design | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (found: THREE spellings of the CURSY rim constant post-merge — RIM_DEPTH, RIM_DEPTH_EXACT, PLAYER_RIM_DEPTH@1.0 — folded into finding #1) |
| 7 | reviewer-security | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (no external input, no storage, no injection surface in a pure-sim diff; N/A) |
| 8 | reviewer-simplifier | Yes | skipped | disabled | Disabled via settings; domain covered by Reviewer (stepNymphs is a direct MOVNYM transcription; no dead code — spawnInterval deleted rather than orphaned) |
| 9 | reviewer-rule-checker | Yes | skipped | disabled | Disabled via settings; rule-by-rule enumeration done by Reviewer in Rule Compliance below |

**All received:** Yes (1 spawned+errored with domain covered inline, 8 disabled via settings)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred

## Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` + tempest CLAUDE.md (no
`.claude/rules/` or SOUL.md exist in tempest). Every changed type/function judged:

- **#1 type-safety escapes** — diff-wide grep: zero `as any`, `@ts-ignore`,
  `as unknown as`, non-null assertions in src changes. Tests use one type-guard
  find pattern (`(e): e is Tanker`) with runtime discriminant checks inside. COMPLIANT.
- **#2 generics/readonly** — `CamContext.nymphCount` is `readonly` (interpreter.ts:97
  block); `Nymph` fields are plain (mutated by design inside the owning step, cloned
  at the boundary — cloneState sim.ts:33). `activateInvaders(enemies: Enemy[], …)`
  takes mutable arrays it does not mutate (concat/slice only) — acceptable, matches
  file idiom. COMPLIANT.
- **#3 enums/exhaustiveness** — no new unions; `EnemyKind` switches untouched except
  hatch-branch reuse of `rollSpawnKind` (assertNever inside, rules.ts). COMPLIANT.
- **#4 null/undefined, `||` vs `??`** — no nullable lookups added; WINVMX is a
  constant; `e.jitterTimer`/`fireCooldown` paths untouched. `p!.` non-null in tests
  follows an explicit `expect(p).toBeDefined()` guard each time. COMPLIANT.
- **#5 modules** — no type-only re-export changes; relative imports match repo
  style (no .js extensions used anywhere in this repo's ESM/Vite setup). COMPLIANT.
- **#6 React** — N/A (no .tsx).
- **#7 async** — N/A (no async in diff).
- **#8 test quality** — every negative assertion carries a mirror half or liveness
  guard (verified per suite); no `.only`/`.skip`; fixtures type-check without casts
  post-implementation. COMPLIANT.
- **#9 build config** — untouched; strict on. COMPLIANT.
- **#10 input validation** — N/A (no external input).
- **#11 error handling** — no catches added; the two intentional silent paths are
  cited to their ROM lines and pinned by tests (cap suite). COMPLIANT.
- **#12 perf/bundle** — stepNymphs is O(queue) per frame with a Set; queue ≤ budget
  (≤ ~70 worst case at L33); no allocation churn beyond one Set + one filter per
  hatch frame. COMPLIANT.
- **CLAUDE.md purity boundary** — zero `Date.now`/`Math.random`/`performance.now`/DOM
  in the src diff (grep clean); all randomness through `s.rng`; determinism and
  no-input-mutation pinned by tests. COMPLIANT.
- **CLAUDE.md citation gate** — both rules followed: 6 findings stamped
  `remediated_by`, 39 citations re-anchored, 2 LOST hand-re-quoted WITHOUT phantom
  stamps (W-010, WD-016 — both still-open divergences, correctly left open). Gate
  green (12/12). COMPLIANT — with finding #2's caveat that spawnForLevel's DOC
  COMMENT overclaims ININYM fidelity (the 8-bit wrap is not ported).

## Reviewer Observations

1. `[VERIFIED]` The freeze gate is STRICTLY-GREATER and counts chasers — evidence:
   sim.ts:180 `s.enemies.length > WINVMX` blocks at 7, not 6 (matches
   `IFCS`+`IFNE` nesting, ALWELG.MAC:1113-1115; enemies[] holds movers AND
   chasers = INMCOU+INCCOU); pinned both sides by the cap suite's 6-hatches/7-freezes
   mirror. Complies with the citation convention (constants cited at rules.ts:414/422).
2. `[VERIFIED]` Every activation routes through one slot gate — evidence: sim.ts:469
   `activateInvaders` (NINVAD bound) applied at both split sites (:458, :501) and the
   hatch branch guards `enemies.length + hatchedThisFrame <= WINVMX` (:190); the
   restored-not-dropped path (`n.py += 1`, :197) matches CONYMP:1199.
3. `[VERIFIED]` The three NYMCOU rekeys read the queue, not a timer — evidence:
   interpreter.ts:263 (CHASER bounce), :316 (JPULMO "SEND PULSAR UP"), :361 (JSTRAI
   conversion) all read `ctx.nymphCount`, fed from `s.spawn.nymphs.length`
   (sim.ts:235); the packed-board mirror tests distinguish this from the old
   countdown semantics.
4. `[EDGE]` `[RULE]` **ININYM's 8-bit index wrap is not ported** — rules.ts:510
   `(i << 4) | lane` unbounded vs the ROM's `TXA / ASL×4` (ALWELG.MAC:328-332),
   which wraps at index 16 so the cabinet seeds nymphs 16+ into the SAME 256-frame
   window as 0-15. Reachable at level 7 today (budget 18); waves with budget > 16
   deliver materially slower than the arcade's, and the function's own doc comment
   claims the ROM formula. MEDIUM. Fix: `((i & 0x0f) << 4) | lane`, zero-bump
   post-wrap, plus a RED pin for an index ≥ 16.
5. `[SIMPLE]` `[DOC]` `[TYPE]` **The branch is unmergeable with origin/develop and
   its rim-constant spelling collides with tp1-27** — tp1-27 (45dcb1e, landed
   mid-flight) derives PLAYER_RIM_DEPTH from CURSY = 1.0 for ALL grabbers and
   retires 0.92. Verified conflicts (`git merge-tree`): 6 findings JSONs +
   interpreter.ts. Verified auto-merge HAZARDS: sim.ts:549's `grabDepth` fuse
   special-case becomes a dead distinction (both arms 1.0) yet survives the merge;
   its comment cites "PLAYER_RIM_DEPTH (0.92)"; the splitTanker/tp1-24 prose
   upstream-retracted by tp1-27 survives on our side; and post-merge the repo would
   carry THREE spellings of one ROM byte (RIM_DEPTH, RIM_DEPTH_EXACT,
   PLAYER_RIM_DEPTH) — the exact defect class tp1-27 exists to end. HIGH
   (integration-blocking: the PR cannot merge; the reviewed spelling must not
   survive the rebase).
6. `[SILENT]` `[VERIFIED]` Both silent paths are deliberate, cited, and pinned —
   evidence: the dropped split child (sim.ts:469 comment citing ACTINV:1262 "SLOT
   NOT FOUND FLAG", pinned by both split-cap tests) and the restored hatch
   (CONYMP:1199, pinned by the freeze mirror). Sub-finding: the ROM's TEMPY latch
   after a failed hatch (rest-of-frame freeze) is NOT ported — sub-frame skew,
   logged as an undocumented deviation (LOW; document or port during rework).
7. `[TEST]` `[VERIFIED]` The two GREEN fixture repairs preserve TEA's intent —
   evidence: the conservation fixture now seeds the level it tests
   (spawnForLevel(4,…), commented in place); the hatch-depth capture measures at
   the hatch frame, which is what "starts at the bottom" asserts. Both were
   unverifiable pre-implementation.
8. `[DOC]` `[VERIFIED]` The citation work avoids the phantom-fix trap — evidence:
   W-010 and WD-016 (still-open divergences whose anchor lines moved) were
   re-quoted, not stamped; DA-012 (compound, display half unbuilt) left open per
   the W-030 lesson. Audit trail is honest.

**Data flow traced:** seed → initialState (rng created first, state.ts) →
spawnForLevel draws per-nymph lanes (rules.ts:510) → stepNymphs decrements/rotates
(sim.ts:177) → CONYMP hatch → makeEnemy at depth 0 → CAM per frame →
resolvePlayerHits/resolveBulletHits. Determinism and non-aliasing pinned by tests;
no unseeded randomness anywhere on the path.

**Wiring:** core-only story by AC design; the shell renders live enemies as before.
The queue is NOT yet drawn (DA-012's display half — open finding, follow-up).

**Error handling:** the sim has no failure modes to swallow here — the two "failure"
paths (no slot at hatch, no slot at split) are game rules, both cited and pinned.

### Devil's Advocate

Suppose this code is broken and I am rubber-stamping my own pipeline's work. Where
would it bite first? The player who starts at level 7 tonight: their wave carries 18
enemies, and nymphs 16 and 17 hatch a full nine seconds later than the cabinet
would deliver them — the wave DRAGS at its tail, on a fidelity story that names
"changes the difficulty of every wave" in its own description. That is finding #4,
and it is real, found only because I re-derived the shift arithmetic instead of
trusting the doc comment — my own doc comment. What else could the comment-trust
failure mode be hiding? The alone-zone set marks lanes below $20 that the ROM
releases; I called that "equal or better spacing," but a fixture with 15 committed
nymphs on a 15-lane open well would deadlock the 16th at py 0x40 forever — can that
state arise? Budget 18 at level 7, all committed simultaneously requires 15 pys
inside one 0x40-window; ININYM's stagger spaces them 16 apart, so at most 4 sit in
any 64-frame window naturally — unreachable outside fixtures, and a backed-off
nymph keeps rotating, so even the fixture case starves rather than corrupts. The
zap edge: zapTimer decrements in stepZap before stepNymphs reads it, so the thaw
lands one frame inside the window's tail — sub-frame, matches the tests, but a
future reorder of stepPlaying would silently shift it; the ordering is
comment-anchored in stepPlaying. The merge hazard is the one that would actually
ship broken product: an auto-merge "succeeds," 1051 tests still pass on OUR side,
CI goes green after a naive conflict resolution that keeps our 0.92-citing comment
and dead grabDepth branch — and the repo re-grows the two-spellings disease tp1-27
just cured, in the same week. That is why finding #5 is HIGH and why the rework
must consolidate to ONE derived constant, not merely make the conflicts compile.

## Reviewer Assessment (re-review, round-trip 1)

**Verdict:** APPROVED

All four findings from the first pass verified resolved on the merged tree
(commits bce3a59 + 9998ff0; independent re-verification: build clean, 1067/1067
across 92 files including tp1-27's suite, citation gate green with 0 lost, tree
clean, no conflict markers):

- **[HIGH → resolved]** origin/develop (tp1-27) merged. The rim has ONE spelling:
  `PLAYER_RIM_DEPTH = (0xf0 - 0x10)/WARP_ALONG_SPAN` (rules.ts:112) with
  interpreter.ts:59 deriving `RIM_DEPTH` from it; `RIM_DEPTH_EXACT` and the fuse
  `grabDepth` split are gone (grep: zero hits in src/). The unified kill predicate
  carries both ROM citations. Remaining "0.92" strings in src are tp1-27's own
  retrospective retraction prose, not live claims. Findings JSONs coherent: W-049
  (tp1-27) and the six tp1-6 stamps coexist; W-010 correctly unstamped; WD-016
  re-quoted onto the merged spelling and still open.
- **[MEDIUM → resolved]** ININYM byte wrap ported (rules.ts:556 `((i & 0x0f) << 4)
  | lane`, $0F bump post-wrap); TEA's two rework pins green; doc comment corrected
  and carries the round-trip provenance.
- **[LOW → resolved]** CONYMP's TEMPY failure latch ported (sim.ts:192-207) — a
  no-slot hatch freezes the remainder of that frame's queue, as ALWELG.MAC:1197-1198.
- **[LOW → standing]** NNYMPH>budget beyond L30 remains a filed finding for tp1-7,
  as agreed.

**Deviation audit (rework):** Dev's "determinism liveness guard re-scoped to
cumulative hatches" → ✓ ACCEPTED by Reviewer: the final-frame count was falsified
by a deterministic respawn cycle tp1-27's bolt-line change relocated; cumulative
hatches is the non-vacuous form of the same guard, and the determinism assertions
themselves are untouched.

**Data flow traced:** seed → rng → ININYM (wrapped bands) → stepNymphs
(gate/latch/crawl/alone-zone) → CONYMP hatch → CAM → unified rim-kill predicate.
**Pattern observed:** one-ROM-byte-one-spelling now holds across the whole kill
path (rules.ts:112 → interpreter.ts:59 → sim.ts resolvePlayerHits/resolveEnemyBoltHits).
**Error handling:** both silent game-rule paths cited and pinned (unchanged).

**Handoff:** To Winston Smith (SM) for finish-story (PR creation + merge gate).

---

### First-pass record (superseded)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Unmergeable with origin/develop: tp1-27 (45dcb1e) landed mid-flight; 7 verified conflicts (6 findings JSONs + interpreter.ts) plus three auto-merge hazards (dead `grabDepth` distinction, stale 0.92-citing JFUSKI comment, upstream-retracted tp1-24 prose) | src/core/sim.ts:549, src/core/enemies/interpreter.ts, docs/audit/findings/* | Rebase/merge onto origin/develop. Consolidate the rim to tp1-27's single CURSY-derived constant: fold `RIM_DEPTH_EXACT` and the `grabDepth` special-case into `PLAYER_RIM_DEPTH` (now 1.0), keep the JFUSKI citation as a comment on the unified gate. Findings JSONs: take develop's version as base, re-apply the six tp1-6 stamps, re-run `reanchor-citations.mjs --write`, re-verify W-010/WD-016 quotes against the merged tree. Full suite + citations green after. |
| [MEDIUM] | ININYM's 8-bit index wrap not ported: `(i << 4)` unbounded vs the ROM's four ASLs on a byte — waves with budget > 16 (level 7+) pace slower than the cabinet; doc comment overclaims fidelity | src/core/rules.ts:510-518 | `((i & 0x0f) << 4) | lane` with the zero-bump post-wrap; TEA adds a RED pin for an index ≥ 16 (bands repeat, seed window ≤ 256 frames); correct the doc comment. |
| [LOW] | TEMPY latch after a failed hatch not ported (rest-of-frame freeze); undocumented | src/core/sim.ts:190-198 | Port the one boolean or log the deviation with the 6 fields — either resolves it. |
| [LOW] | Budgets can exceed NNYMPH=64 from level 30 (hand-tuned curve outlives the pool bound) | src/core/rules.ts (levelParams/spawnForLevel) | Note for tp1-7 (TNYMMX keeps ROM budgets ≤ 30); optional clamp now. |

The substance is sound: every AC is delivered and honestly tested (the freeze
boundary, conservation, both rekeys, the patrol envelope, the exact-rim fuse kill),
the audit trail avoids both phantom-fix traps, and the mechanical verification is
clean (build, 1051/1051, citations 12/12, zero smells). The rejection is the
integration state plus one real fidelity bug — both fixable in a short rework loop.

**Handoff:** Back through O'Brien (TEA) for the red rework (one RED pin for the
ININYM wrap), then Julia (Dev) for the wrap fix + the rebase/consolidation above.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): **The SM setup note "never mark NO_COUNTERPART findings
  `remediated_by` (hard-errors)" is STALE — tp1-5's rework legalized the combination.**
  `tools/audit/check-citations.mjs:130-148` now accepts `remediated_by` on a
  `NO_COUNTERPART` finding provided `ours` is null OR a whole well-formed citation; the
  hard-error was the tp1-1-era behavior. So Dev SHOULD stamp W-002 and DA-012 (both
  NO_COUNTERPART, `ours: null`) with `remediated_by: tp1-6` alongside the five
  DIVERGENCEs (W-003, W-004, W-024, W-029, DA-017), and the gate will hold. Affects
  `sprint/context/context-story-tp1-6.md` (the Technical Approach bullet overstates the
  trap). *Found by TEA during test design.*

- **Gap** (non-blocking): **DA-012's DISPLAY half is not covered by this RED suite, so
  tp1-6 cannot honestly stamp DA-012 unless the shell renders nymphs.** The finding is
  explicitly about DSPNYM (ALDISP.MAC:458-598): up to 24 of the 64 nymphs drawn per
  frame as a dot-plus-line-to-the-vanishing-point in NYMCOL. The story's ACs are all
  sim-side, and I tested the sim side only. Either Dev adds a minimal nymph render pass
  in `src/shell/render.ts` (the queue now carries `lane`+`py`, which is everything
  DSPNYM's fake perspective needs) and stamps DA-012, or DA-012 stays open/half-open
  and SM files the display as follow-up work — the W-030 lesson says do not stamp a
  compound finding a story only half-closes. Affects `src/shell/render.ts`,
  `docs/audit/findings/pair-3-aldisp-a-objects.json`. *Found by TEA during test design.*

- **Gap** (non-blocking): **`resolvePlayerHits` must split the fuse kill off the shared
  grab gate, and the tp1-5 Reviewer already predicted why.** The ROM's fuse kill
  (JFUSKI, ALWELG.MAC:1994-2002) is `CMP CURSY / IFEQ` — EXACT rim only — while ours
  kills any GRABBER_KIND at `depth >= PLAYER_RIM_DEPTH` (0.92). W-024 parks fuseballs
  at $20 = depth 0.9286 for whole waves, INSIDE that band, so without the exact-rim
  gate the early-wave patrol becomes randomly lethal (my
  `tp1-6.fuseball-turnback.test.ts` pins this). Flippers/pulsars transiting the band
  are the pre-existing looseness the tp1-5 Reviewer flagged on `PLAYER_RIM_DEPTH` —
  out of tp1-6's scope, but the fuse can no longer share their gate. Affects
  `src/core/sim.ts` (`resolvePlayerHits`). *Found by TEA during test design.*

- **Improvement** (non-blocking): **The ROM DROPS a split child when the board is full,
  and tp1-8 exists partly to make that rare.** KILINV frees the parent's slot first,
  then each child runs ACTINV ("ANY SLOTS?") — on a 7-live board only the CW child
  (INVAL1-1, seated first) survives; the second is silently unmade (ALWELG.MAC:
  2337-2354, 1262). My cap tests pin the COUNT (≤7, exactly one child) but not which
  lane survives. tp1-8's NYMCHA slot reservations are the mechanism that keeps
  tanker-heavy boards from hitting this; until it lands, expect the drop to be
  reachable in play. *Found by TEA during test design.*

- **Improvement** (non-blocking): **`LevelParams.spawnInterval` should be DELETED with
  the metronome, and three sibling assertions go with it.** AC-3 abolishes the rate
  limiter; the ROM's pacing is ININYM's 16-frame stagger plus back-pressure. If the
  field survives unused it trips the verify-phase dead-code pass, and
  `tests/core/sim.difficulty.test.ts:75,88,91` pin its values directly — those three
  assertions lose their subject and should be removed as part of the mechanical
  translation (intent preserved: the mechanism they pinned is abolished by the story;
  per-wave pacing fidelity arrives with tp1-7's TNYMMX transcription). Affects
  `src/core/rules.ts`, `tests/core/sim.difficulty.test.ts`. *Found by TEA during test
  design.*

- **Question** (non-blocking): **Where does the hatch's KIND come from until tp1-8?**
  The ROM decides an invader's type at CONYMP time via NYMCHA — the per-type
  population solver that is exactly tp1-8's story. tp1-6 should keep `rollSpawnKind`
  but move its call to HATCH time (my conservation/cap tests only pin counts, and the
  existing `sim.spawn.test.ts` distribution tests keep pinning the level gates — they
  observe kinds through the sim, so they hold under either call site). Dev should not
  attempt NYMCHA here; it is sized at 8 points on its own. *Found by TEA during test
  design.*

### Dev (implementation)

- **Gap** (non-blocking): **DA-012 is deliberately NOT stamped — its display half is
  unbuilt, and SM should file the follow-up.** The queue (its core half) now exists,
  but DSPNYM's render pass (up to 24 nymphs drawn as dot-plus-line-to-the-vanishing-
  point, NYMCOL, ALDISP.MAC:458-598) does not: the far end of the well still does not
  visibly crawl. Per the W-030 lesson a compound finding is not stamped half-closed.
  The queue's `lane`+`py` carry everything the renderer needs. Affects
  `src/shell/render.ts` (a nymph pass), `docs/audit/findings/pair-3-aldisp-a-objects.json`
  (DA-012 stays open until it lands). *Found by Dev during implementation.*

- **Improvement** (non-blocking): **WD-016 has HALF-converged and its prose is now
  stale.** Its claim contrasts the ROM's drop gate ("all nymphs converted… `LDA NYMCOU
  / ORA EXPCOU / IFEQ`") with our old `spawn.remaining === 0`; the NYMCOU half of that
  contrast is now literally modeled (`spawn.nymphs.length === 0` IS NYMCOU == 0). The
  still-open divergence is the other half: the ROM warps out from under invaders
  parked AT the rim (INVAY <= $11 does not abort, ALWELG.MAC:3108-3111) while our gate
  demands a fully empty board. I re-quoted `ours` onto the respelled line (NOT
  stamped — the sidecar's phantom-fix trap); the claim prose still quotes the deleted
  spelling. Candidate for tp1-22's audit curation alongside the W-030-style split.
  Affects `docs/audit/findings/pair-9-warp-drop-mode.json`. *Found by Dev during
  implementation.*

- **Question** (non-blocking): **The attract demo's opening pace changed — is that a
  playtest concern?** The demo runs the real pipeline, so its board now fills by
  ININYM stagger (first hatch within ~15 frames, one every ~16) instead of one enemy
  per 1.2 s timer tick — the demo gets busier faster, and with the 7-cap it saturates
  at seven where it used to swarm. This is the authentic pacing, but nobody has
  eyeballed the attract loop since. Affects `src/core/sim.ts` (demo path — no code
  change proposed, just an eyeball on the shipped attract screen). *Found by Dev
  during implementation.*

- **Improvement** (non-blocking): **`levelParams.enemyCount` is now the single budget
  source feeding ININYM — tp1-7's TNYMMX transcription has one seam to replace.** The
  hand-tuned `6 + (level-1)*2` curve flows only through `spawnForLevel`; TNYMMX
  (ALWELG.MAC:697) drops in there. The per-wave counts differ noticeably (wave 1: ROM
  10 vs ours 6), so expect the difficulty feel to move again at tp1-7. Affects
  `src/core/rules.ts` (`levelParams`/`spawnForLevel`). *Found by Dev during
  implementation.*

### Reviewer (code review)

- **Conflict** (blocking): **tp1-27 landed on develop mid-flight and the branch no
  longer merges.** Seven verified conflicts (`git merge-tree`): six findings JSONs
  plus `src/core/enemies/interpreter.ts` — both stories rewrote pair-1 wholesale
  (their W-049/W-030 correction vs our six stamps + re-anchors). Worse are the
  auto-merge hazards: tp1-27 retires PLAYER_RIM_DEPTH=0.92 for a CURSY-derived 1.0,
  which makes our fuse-specific `grabDepth` split a dead distinction that would
  survive a naive merge alongside its now-false "(0.92)" comment and the tp1-24
  burst-lethality prose tp1-27 explicitly retracted. Post-merge the rim must have
  ONE spelling. Affects `src/core/sim.ts`, `src/core/enemies/interpreter.ts`,
  `docs/audit/findings/*` (resolution recipe in the Reviewer Assessment). *Found by
  Reviewer during code review.*

- **Gap** (blocking, testable): **ININYM's index arithmetic is 8-BIT and the port's
  is not.** `TXA / ASL ASL ASL ASL` (ALWELG.MAC:328-332) wraps at index 16: the
  cabinet seeds nymphs 16+ into the SAME 256-frame window as 0-15, so its big waves
  open with interleaved double-density hatching, while our unbounded `(i << 4)`
  stretches any budget > 16 (level 7 today; every TNYMMX wave ≥ 4 after tp1-7)
  materially slower than the arcade. TEA's band test only probes level 1 (budget 6)
  and would actually REJECT the correct wrap for budgets > 16 — the pin must change
  with the fix. Affects `src/core/rules.ts:510` (`((i & 0x0f) << 4) | lane`,
  zero-bump post-wrap) and `tests/core/tp1-6.nymph-queue.test.ts` (band assertion +
  a ≥ 16 pin). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): **The tp1-6/tp1-27 near-miss is a process signal:
  two checkouts rewrote the same findings file and the same predicate in one day.**
  Both stories were honest and CONVERGED semantically (both moved kills to the rim),
  but only by luck of reading the same source well. Parallel checkouts working the
  same epic should check `git fetch && git log origin/develop` before RED locks a
  contract onto lines a sibling story is moving. Worth a line in the epic context.
  Affects `sprint/context/context-epic-tp1.md`. *Found by Reviewer during code
  review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The fuseball yo-yo is pinned as an ENVELOPE, not a trace**
  - Spec source: sprint/epic-tp1.yaml tp1-6 AC-4; W-024 (pair-1), JJUMPM ALWELG.MAC:1929-1943
  - Spec text: "The fuseball turn-back (W-024) works, keyed on NYMCOU."
  - Implementation: Tests assert the $20 ceiling (never past 0.94), a real post-peak
    reversal (≥0.15 back down), the $80 floor (never below 0.45 after the first peak),
    and per-frame liveness — not the exact patrol path.
  - Rationale: In the ROM EVERY completed roll reverses INVDIR (JJUMPM:1930), including
    MAYBLR's random mid-band rolls, and the roll itself is the multi-frame FUSELR
    program; our port models rolls as instant jitter hops (tp1-25's standing model).
    Pinning one trace would reject faithful variants of either seam. The envelope fails
    a monotone arrival, a clamp-and-park, a sink-away, and a freeze.
  - Severity: minor
  - Forward impact: if a later story ports FUSELR's multi-frame roll (vulnerability
    window timing), these tests stay green — they pin depth, not roll duration.

- **DA-012's display half is deliberately untested here**
  - Spec source: sprint/epic-tp1.yaml tp1-6 description ("Subsumes … DA-012"); DSPNYM ALDISP.MAC:458-598
  - Spec text: DA-012 names both the missing queue AND the missing nymph RENDERING.
  - Implementation: No render/stroke test for nymph dots; all coverage is sim-side.
  - Rationale: Every AC in the story is sim-side; the ACs are the higher authority.
    Logged as a Delivery Finding so the stamp-or-split decision is made on purpose.
  - Severity: minor
  - Forward impact: DA-012 cannot be fully stamped `remediated_by: tp1-6` unless Dev
    adds the render pass; otherwise SM should file the display as follow-up.

- **NNYMPH=64 (the pool bound) and ININYM's exact lane roll are not pinned**
  - Spec source: W-002 (pair-1); ALCOMN.MAC:811, ALWELG.MAC:315-340, 3082-3085
  - Spec text: "NNYMPH=64 nymph slots"; lanes drawn as `RANDOM AND I,0F`.
  - Implementation: Tests pin the py STAGGER (bands [16i, 16i+15], strictly increasing,
    never 0) and lane VALIDITY (0 ≤ lane < laneCount), not the 64-slot array shape or
    the AND-mask lane roll.
  - Rationale: 64 is a hardware array bound; our budgets top out near 30 (TNYMMX) and a
    dynamic array is the idiomatic port. The ROM's `AND I,0F` assumes 16 lines always;
    our open tubes have 15 lanes, so the exact roll cannot be both faithful and legal —
    lane mapping is Dev's choice, validity is the contract. The late-wave NYMCOU top-up
    clamp (ALWELG:3082) belongs to whichever story ports that mechanism.
  - Severity: minor
  - Forward impact: none for waves 1-16; tp1-7's TNYMMX transcription should re-check
    the clamp if deep-wave budgets ever approach 64.

- **Nymph rotation is pinned by cadence, not handedness**
  - Spec source: MOVNYM ALWELG.MAC:1148-1158 (`ADC I,1 / AND I,0F`)
  - Spec text: the ROM rotates a far nymph +1 line (one fixed direction) every other frame.
  - Implementation: Tests assert one lane per two frames in ONE CONSISTENT direction
    (|net displacement| with a single step sign), not which direction.
  - Rationale: our lane indexing's handedness vs the ROM's is a render-mirror question
    no sim observable settles; pinning a sign would encode a guess as a spec.
  - Severity: minor
  - Forward impact: if the shell ever renders the crawl against reference footage, the
    handedness becomes decidable — revisit then.

- **The alone zone is pinned by its observable, not its mask mechanics**
  - Spec source: MOVNYM ALWELG.MAC:1136-1143, 1160-1165 (NEOFLI/OLOFLI, D70MSK)
  - Spec text: a nymph entering the alone zone on an occupied line backs off.
  - Implementation: One test — two nymphs converging on one lane hatch on different
    lanes. The NEOFLI/OLOFLI double-buffer and D70MSK bit table are not modeled.
  - Rationale: the flags are a 6502 bit-budget artifact; the behavior they buy is the
    distinct-hatch-lanes guarantee, which is what gameplay can see.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)

- **The fuse turn-back reverses AT the trigger (with a $20 re-seat), not on a roll's landing**
  - Spec source: W-024; JJUMPM ALWELG.MAC:1929-1931, FUSELR 2484-2491
  - Spec text: the $20/$80 triggers start a lateral roll (FUCHPL/LEFRIT → FUSELR) and the
    roll's LANDING flips INVDIR; INVAY overshoots the trigger by ≤ one WFUSIL frame.
  - Implementation: `jfuseup` flips `direction` at the trigger and re-seats depth to
    FUSE_TURNBACK_DEPTH; the lateral roll stays the existing jitter-hop model. A fuse
    already AT the rim reverses without the re-seat, so the rim frame stays lethal
    (FUSELR's own VFUSKI keeps checking from CURSY until the landing).
  - Rationale: TEA pinned the envelope, not the trace, and ratified the jitter-hop roll
    model; our dt step (~0.0185 depth at L12) is coarser than the ROM's per-frame byte,
    so an unclamped overshoot would poke visibly above the line the arcade patrols under.
  - Severity: minor
  - Forward impact: a future story porting FUSELR's multi-frame roll must move the
    reversal to the landing and can then drop the re-seat; the envelope tests stay green.

- **The alone-zone reservation covers ALL committed nymphs (py < $40), not only $20-$3F**
  - Spec source: MOVNYM ALWELG.MAC:1160-1165 (`CMP I,20 / IFCS ;IN ALONE ZONE?`)
  - Spec text: only nymphs with py in [$20, $40) mark their line off limits; below $20
    the mark lapses (a third nymph may commit onto a nearly-hatched nymph's line).
  - Implementation: `stepNymphs` builds the committed-lane set from every nymph with
    py < $40, so the reservation persists down to the hatch.
  - Rationale: the ROM's lapse re-permits stacking ~0.7 s before a hatch — an artifact of
    the two-band flag encoding, not a design goal; holding the reservation is the same
    rule without the hole, and no pinned observable distinguishes them.
  - Severity: minor
  - Forward impact: none — hatch-lane spacing is equal or better than the cabinet's.

- **QFRAME is scoped to its one consumer, not free-running**
  - Spec source: MOVNYM ALWELG.MAC:1149-1151 (`LDA QFRAME / AND I,1`)
  - Spec text: QFRAME is the ROM's global frame counter, incremented every frame
    whatever the game mode.
  - Implementation: `GameState.qframe` increments once per playing/demo frame at the top
    of `stepNymphs` — the crawl's parity source — and nowhere else (warp/dying/menu
    frames do not tick it).
  - Rationale: the crawl needs GLOBAL parity (a frozen py would freeze a py-derived
    parity — TEA's frozen-crawl test forces this) but nothing else reads QFRAME yet;
    ticking it in dead modes would be state churn with no consumer.
  - Severity: minor
  - Forward impact: a future consumer wanting ROM-exact QFRAME phase across mode
    changes must move the increment to stepGame's top.

- **The hatch's kind still rolls from rollSpawnKind; NYMCHA is not ported**
  - Spec source: CONYMP ALWELG.MAC:1184 (`JSR NYMCHA ;NYMPH CHARACTERISTICS`)
  - Spec text: the ROM decides the hatchling's type via NYMCHA, the per-type min/max
    population solver.
  - Implementation: kind and tanker cargo roll at hatch time via the existing
    rollSpawnKind/rollTankerCargo gates.
  - Rationale: NYMCHA is story tp1-8 (sized 8 points on its own); TEA's Question
    ratified the stand-in, and moving the roll to hatch time keeps the seam NYMCHA
    will slot into.
  - Severity: minor
  - Forward impact: tp1-8 replaces the two roll calls inside stepNymphs' hatch branch.

- **Two sibling suites' assertions changed subject, not just shape**
  - Spec source: tests/core/sim.framing.test.ts (story 4-2 AC), tests/core/sim.difficulty.test.ts (AC#1/AC#2)
  - Spec text: "the framing commit must NOT consume the RNG"; "shorter intervals =
    faster spawning at higher levels" / spawnInterval floor at 0.3.
  - Implementation: the select→start commit now consumes exactly the wave's ININYM
    draws (asserted via the seeded queue instead of rng equality); the two
    spawnInterval assertions were removed with the field, replaced by a speed-floor
    check, with a comment trail alongside tp1-4's flipInterval and tp1-5's
    pulseInterval removals.
  - Rationale: ININYM legitimately draws a random lane per nymph (ALWELG.MAC:324-327) —
    "RNG untouched at wave start" now pins the divergence W-003 removed; and a deleted
    metronome has no interval to assert. Menu-navigation RNG-freedom stays pinned by
    the surrounding framing tests.
  - Severity: minor
  - Forward impact: tp1-7's TNYMMX transcription owns authentic per-wave budget ramps.

- **Two TEA fixture arithmetic repairs during GREEN (intent unchanged)**
  - Spec source: tests/core/tp1-6.nymph-queue.test.ts (conservation + exact-frame hatch tests)
  - Spec text: "precondition: the level-4 budget must exceed the cap"; "a hatchling
    starts at the bottom".
  - Implementation: the conservation fixture re-seeds `spawnForLevel(4, …)` after
    setting the level (playingState carries the LEVEL-1 queue; mutating s.level does
    not re-run INIENE); the hatch test captures depth AT the hatch frame (the original
    measured at frame 13, after the frame-3 hatchling had climbed ten frames).
  - Rationale: both were unverifiable pre-implementation (RED failed earlier in each
    test); both repairs preserve the pinned intent and are commented in place.
  - Severity: minor
  - Forward impact: none — flagged for TEA's verify pass to confirm the intents held.

### Reviewer (audit)

Stamps on the entries above:

- **TEA: "yo-yo pinned as ENVELOPE, not a trace"** → ✓ ACCEPTED by Reviewer: the ROM's
  landing-reversal makes any exact trace seed- and model-coupled; the four envelope
  assertions reject every failure mode the finding names (arrival, park, sink, freeze).
- **TEA: "DA-012's display half deliberately untested"** → ✓ ACCEPTED by Reviewer: the
  ACs are sim-side; the stamp-or-split decision is correctly forced into the open
  (Dev left DA-012 unstamped — consistent).
- **TEA: "NNYMPH=64 pool bound and exact lane roll not pinned"** → ✓ ACCEPTED by
  Reviewer: dynamic array is the idiomatic port and open wells cannot honor AND $0F —
  but note the ADJACENT gap this concealed: the ININYM INDEX arithmetic is 8-bit and
  wraps at 16, which neither the tests nor the port carry (my finding #2).
- **TEA: "rotation pinned by cadence, not handedness"** → ✓ ACCEPTED by Reviewer:
  handedness is a render-mirror question; no sim observable arbitrates it.
- **TEA: "alone zone pinned by observable"** → ✓ ACCEPTED by Reviewer: the D70MSK
  double-buffer is a bit-budget artifact; distinct hatch lanes is the behavior.
- **Dev: "turn-back reverses AT the trigger with $20 re-seat"** → ✓ ACCEPTED by
  Reviewer: within TEA's ratified envelope; the rim-lethality carve-out correctly
  preserves FUSELR's VFUSKI window. Post-rebase the JFUSKI gate merges into tp1-27's
  unified rim constant (finding #1) — the behavior stands, the spelling must not.
- **Dev: "alone-zone reservation covers all py < $40"** → ✓ ACCEPTED by Reviewer:
  strictly tighter spacing than the cabinet, invisible to every pinned observable.
- **Dev: "QFRAME scoped to its one consumer"** → ✓ ACCEPTED by Reviewer: parity is
  unobservable across modes with a single consumer; the forward note is recorded.
- **Dev: "kind rolls at hatch; NYMCHA deferred to tp1-8"** → ✓ ACCEPTED by Reviewer:
  matches the epic's story split; the hatch-time seam is where NYMCHA slots in.
- **Dev: "framing + difficulty assertions changed subject"** → ✓ ACCEPTED by Reviewer:
  ININYM's draw is citable (ALWELG.MAC:324-327) and the metronome's numbers were
  never the ROM's; menu-navigation RNG-freedom remains pinned by adjacent tests.
- **Dev: "two TEA fixture arithmetic repairs"** → ✓ ACCEPTED by Reviewer: verified
  both preserve the pinned intent (re-seed targets the level under test; depth is
  now measured at the hatch frame, which is what "starts at the bottom" means).

Undocumented deviations found by Reviewer:

- **The failed-hatch TEMPY latch is not ported:** Spec (CONYMP, ALWELG.MAC:1196-1199)
  says a no-slot hatch sets TEMPY=-1, freezing every nymph processed LATER that same
  frame; our stepNymphs restores the failed nymph but lets subsequent nymphs
  decrement. Sub-frame skew, reachable only on the exact frame a mid-frame fill
  collides with a second zero-py. Not documented by TEA/Dev. Severity: L — document
  it (or port the one boolean) during rework.
- **ININYM's index shift is 8-BIT and the port's is not:** Spec (ALWELG.MAC:328-332,
  `TXA / ASL ASL ASL ASL`) wraps the band for nymph index >= 16, so the cabinet
  seeds nymphs 16+ INTO THE SAME 256-frame window as 0-15; our unbounded `(i << 4)`
  stretches waves with budget > 16 (reachable at level 7 today) materially slower
  than the arcade's. The spawnForLevel doc comment claims the ININYM formula while
  silently diverging from it. Not documented by TEA/Dev. Severity: M — my finding
  #2; fix is `((i & 0x0f) << 4) | lane` with the zero-bump applied post-wrap, plus
  a RED pin for an index >= 16.