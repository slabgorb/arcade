---
story_id: "jt13-8"
jira_key: "jt13-8"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-8: Retire joust's dead twins (per-symbol: delete behavioral-only, keep claim-pinned)

## Story Details
- **ID:** jt13-8
- **Jira Key:** jt13-8
- **Type:** refactor
- **Points:** 5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-8-retire-joust-dead-twins
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T20:48:49Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T14:57:17Z | 2026-08-18T14:58:57Z | 1m 40s |
| red | 2026-08-18T14:58:57Z | 2026-08-18T17:26:14Z | 2h 27m |
| green | 2026-08-18T17:26:14Z | 2026-08-18T19:21:48Z | 1h 55m |
| review | 2026-08-18T19:21:48Z | 2026-08-18T19:59:05Z | 37m 17s |
| green | 2026-08-18T19:59:05Z | 2026-08-18T20:37:52Z | 38m 47s |
| review | 2026-08-18T20:37:52Z | 2026-08-18T20:48:49Z | 10m 57s |
| finish | 2026-08-18T20:48:49Z | - | - |

## Technical Approach

This is a per-symbol dead-code retirement following the mc11-4 precedent. The task is NOT a uniform delete-all but requires individual judgment for each dead twin:

### Classification Strategy
1. **CLAIM-PINNED symbols** (referenced by ROM-citation tests): KEEP the export/type but DELETE its dead runtime implementation
2. **BEHAVIORAL-ONLY symbols** (only referenced by feature tests): DELETE the export and RE-POINT its tests to the live inline implementation

### Candidate Dead Twins
The following functions have zero production callers outside tests/ (per jt13 unhooked-seam audit):
- `stepPlaying` (cabinet.ts:109; live path = stepGame at main.ts:637)
- `hatchEgg` (sim.ts:1581; live = inline hatchRow/remountEntryEdge sim.ts:2480-2497)
- `waveEnemyComplement` (transporter.ts:301; live = wenemyFor/waveRowAt)
- `toTitle` (cabinet.ts:84; live = inline {mode:'title'} main.ts:383)
- `playerTurn` (transporter.ts:222)
- `groundStep` (joust.ts:417; live = inline frame.ts walk)
- `wrapEggX` (egg.ts:270)
- `bridgeDestroyedOnWave` (arena.ts:350)

### Constants Classification (TBD)
A longer list of tests-only constants (cliffBits, EGG_VALUE_CAP, PTERO_FLYX_MAX, GRIP_ROUTINE, waveTypeBehaviour, etc.) are likely CLAIM-PINS that must STAY — classify these during setup verification but do not delete.

## Acceptance Criteria

### RED Phase (TEA)
- [ ] Test suite identifies all dead-twin production callers (should be zero outside tests/)
- [ ] Tests prove each candidate twin has NO production path coverage (RED = no production caller)
- [ ] Classify each twin per CLAIM-PIN vs BEHAVIORAL-ONLY rule
- [ ] Identify which test assertions pin each twin to ROM citations

### GREEN Phase (Dev)
- [ ] DELETE all BEHAVIORAL-ONLY twin functions and their tests
- [ ] RE-POINT tests from deleted twins onto their live inline equivalents to preserve coverage
- [ ] KEEP all CLAIM-PINNED twins in their type/export form with deletion of dead runtime code
- [ ] Document each decision in code comments (why kept/deleted)
- [ ] Full-cabinet test suite passes: vitest suite + orchestrator tests + lint

### Review Phase (Reviewer)
- [ ] Code review verifies: deletions preserve test coverage, CLAIM-PINS justified
- [ ] Coverage comparison: test count unchanged or explained (re-pointed vs deleted)
- [ ] No coverage loss: every behavioral assertion still runs against the live path
- [ ] Full-cabinet green: joust suite, orchestrator, lint all pass

## Sm Assessment

Setup complete. Story is well-scoped: an established pattern (retire-dead-twin, run twice already on mc11-4 and pm5) applied to joust's core for the first time. The candidate list of 8 dead twins comes from the jt13 unhooked-seam audit but is explicitly flagged **verify, don't trust blind** — TEA's first RED-phase job is to confirm each symbol against its current referencing tests before anything is classified.

The load-bearing distinction is per-symbol, not per-file: CLAIM-PINNED (asserted by a ROM-citation test) → KEEP the symbol, drop only the dead runtime role; BEHAVIORAL-ONLY (referenced only by feature tests) → DELETE and RE-POINT its tests onto the live inline symbol so coverage is preserved, never dropped. The constants list (cliffBits, EGG_VALUE_CAP, PTERO_FLYX_MAX, GRIP_ROUTINE, waveTypeBehaviour, ...) is classify-don't-delete — presumed claim-pins.

Non-negotiable done bar: full-cabinet green (vitest + orchestrator + lint), and no net loss of behavioral coverage. Routing to TEA for the RED phase.

## Tea Assessment

**RED committed:** `b1faa599` — `plugins/joust/tests/jt13-8-retire-dead-twins.test.ts`.
Baseline: **14 failed, 6 passed** (only the new file is red). Lint (`tsc --noEmit`) clean.

**Premise VERIFIED against the current tree — the audit's list holds, but the classification is mine, not the audit's.** Each of the 8 candidates has exactly ONE code reference under `src/` (its own declaration) and zero production callers — measured, not trusted. The story omitted a live-path for three of them (`playerTurn`, `wrapEggX`, `bridgeDestroyedOnWave`) — the "verify, don't trust blind" tell — and verification split them: two have live twins (DELETE), one does not (KEEP).

**Test design — both directions of the story rule ("keep any symbol a CLAIM test asserts / that has no live twin; only its dead runtime role goes"):**

- **DELETE direction (14 failing → Dev turns green):** for each of the 7 behavioural-only twins, two assertions — (a) it is no longer exported from its home module, (b) zero code references anywhere under `src/` (retired everywhere, not just at home). Each has a VERIFIED live inline twin to re-point onto:

  | Twin | Home | Live twin (re-point target) |
  |------|------|------------------------------|
  | `stepPlaying` | core/cabinet.ts | main.ts inline `stepGame` + `modeForGover` pump |
  | `toTitle` | core/cabinet.ts | main.ts inline `{ mode: 'title' }` boot |
  | `hatchEgg` | core/sim.ts | inline remount hatch in the sim frame step |
  | `waveEnemyComplement` | core/transporter.ts | `wenemyFor(waveRowAt(wave))` (wave.ts) |
  | `playerTurn` | core/transporter.ts | `nextServed(q) === 'player'` in the session serve loop |
  | `groundStep` | core/joust.ts | frame.ts inline walk-off + skid chain |
  | `bridgeDestroyedOnWave` | core/arena.ts | `applyWaveDestruction(...).bridgeBurned` (LATCHING) |

- **KEEP direction (6 green guards → redden on over-delete):**
  - `wrapEggX` (core/egg.ts) — the EGGWR narrow [4,288] egg wrap (JOUSTRV4.SRC:3141-3146). **This is the one genuine departure from a uniform delete.** Unlike the seven, it has **NO live twin**: the live sim never wraps an egg's X (settled eggs don't move in X; entity motion uses `arena.wrapX`, a wider band). Its ROM values are pinned by the egg behavioural suite, which has **nowhere to re-point** — deleting it would SHED ROM coverage, which the story forbids. KEPT; its only dead role is that nothing calls it.
  - The 5 flagged constants — `cliffBits`, `EGG_VALUE_CAP`, `PTERO_FLYX_MAX`, `GRIP_ROUTINE`, `waveTypeBehaviour` — all tests-only but pinned by ROM-citation / `*-source` claim tests, reimplementing no live path. KEPT (classify, don't delete). Guarded as a representative subset of the "...etc." class.

**Why an AST scan, not a raw-text grep (a deliberate improvement over mc11-4):** "no production caller" is about CODE, not prose. The suite counts `ts.Identifier` nodes, so comments and string/template literals never count — a comment naming a retired symbol (e.g. "retired `stepPlaying` at jt13-8") does NOT redden the gate. mc11-4's raw-text scan lacked this and burned **three** review rounds scrubbing historical comments; this design forecloses that. Reuses joust's own standing principle (`purity-scanner`: parse, don't regex) and the `typescript` devDep the purity gate already leans on.

**GREEN work for Dev (Julia) — where the judgment lives:**
1. Delete the 7 twin exports. That alone turns 7 of the 14 red assertions green (the "no longer exported" half).
2. For each, retire every residual `src/` reference (there are none beyond the declaration) AND prune the twin's name from its module's `tests/helpers/*-contract.ts` **surface array** (`for (const fn of [...])` export-existence loop) and the contract **type interface** — otherwise the contract loader throws on import and reddens that module's suite. This turns the second half green.
3. **Re-point the behavioural tests onto the live twin (do NOT delete the coverage).** Clean 1:1 re-points: `waveEnemyComplement`→`wenemyFor(waveRowAt())`, `bridgeDestroyedOnWave`→`applyWaveDestruction(...).bridgeBurned`. Judgment re-points (live twin is inline/shell, not a clean core symbol): `stepPlaying` / `toTitle` (cabinet wrapper coverage — the mode-machine substance is already covered by `modeForGover` tests + the jt11-16 title-boot wiring test; keep those, drop the wrapper-tautology), `hatchEgg` / `groundStep` (re-point onto `stepSim`/`stepFrame` at the seam), `playerTurn` (FIFO ordering is already exercised by the live queue's `nextServed`/`servePlayer` tests — re-point or drop as redundant, your call; log it if you drop).
4. Do **NOT** touch the 6 keep-symbols (green guards protect them). Full-cabinet green required: `npx vitest run` + orchestrator + lint.

**Rule coverage:** TS lang-review — this is a pure-deletion + test-re-point change; it adds no `src/core` constant, so the citation scanner (`//` vs `/** */`) and uncited-literal surface are untouched. The `.js` ESM-extension rule is N/A (the RED file imports only `node:*` and `typescript`, no local module). Purity is unaffected by deletion. Self-check (Phase C): every test asserts a meaningful value (`toBeNull` / `toBe(0)` / `toBe('<home>')`) — no `let _ =`, no `assert(true)`, no `is*` on an always-null value; the KEEP guards assert the concrete home path, not merely truthiness.

## Dev Assessment

### Round 2 — review rework (Reviewer REJECTED round 1: 1 MEDIUM blocker + 2 LOW)

**All three findings addressed. GREEN re-verified:** joust project **3870/3870**, orchestrator **503/503**, lint (`tsc --noEmit`) clean.

**Files changed (round 2):**
- `plugins/joust/src/core/sim.ts` — EXPORTED `enemyTypesForWave` (the sole production change; additive — exposes the live twin of the deleted `waveEnemyComplement` so its coverage can re-point).
- `plugins/joust/tests/helpers/sim-contract.ts` — added narrow `loadEnemyComplement` loader (the `loadWaveBcd` discipline; main `loadSim` surface untouched).
- `plugins/joust/tests/transporter.test.ts` — **MEDIUM blocker fixed:** re-pointed the dropped pursuit/pterodactyl-exclusion coverage onto live `enemyTypesForWave` over ROM rows 18 & 8, asserting the ground complement = `bounders+hunters+lords` (excludes the 15/2 and 1/1 pursuers/pterodactyls; `=== 6` witness vs the dead formula's 8).
- `plugins/joust/tests/cabinet.test.ts` — **LOW fixed:** dropped the tautological `expect(title.mode).toBe('title')` (the all-six-modes Set assertion already pins it).
- `plugins/joust/tests/joust.test.ts` — **LOW fixed:** reworded the skid comment (a plain `resolveJoust` unit test, not skid-chain integration) and dropped the decorative `groundState`.

See Design Deviations → Dev for the one production-change rationale (the reviewer's `enemyTypesForWave`-based fix implies exposing that private symbol).

---

### Round 1 (original)

**Implementation Complete:** Yes
**Tests:** full cabinet GREEN — `npx vitest run` **17446 passing** (1165 files), orchestrator **503/503**, lint (`tsc --noEmit`) clean. The jt13-8 RED file is now 20/20 green (7 twins retired × 2 assertions + 6 KEEP guards).
**Branch:** feat/jt13-8-retire-joust-dead-twins

**What shipped — 7 twins DELETED + re-pointed, 1 function + 5 constants KEPT (exactly the RED classification, refined by two GREEN-phase live-twin corrections logged below):**

| Twin | Deleted from | Coverage re-pointed onto (live) |
|------|--------------|----------------------------------|
| `bridgeDestroyedOnWave` | core/arena.ts (+ arena-contract iface) | `applyWaveDestruction(...).bridgeBurned` — arena.test.ts drives the live latch |
| `waveEnemyComplement` | core/transporter.ts (+ contract iface/surface) | live `waveComplement(demo/d)` count (demo/demo-round2); end-to-end via the live wave row |
| `playerTurn` | core/transporter.ts (+ contract iface/surface) | `nextServed` + `servePlayer` + the LPSERV field it compared — transporter.test.ts FIFO test |
| `groundStep` | core/joust.ts (+ collision-contract iface/surface) | `stepGround` (flight.ts) covers the transition live; the unique resolveJoust-plantZ integration kept, skidding entity built directly |
| `hatchEgg` | core/sim.ts (+ sim-contract iface/surface) | `willHatch` + `remountEntryEdge` (egg.ts, the live inline hatch) — demo.test.ts |
| `stepPlaying` | core/cabinet.ts (+ contract iface/surface) | `modeForGover(stepGame(game).gover)` (the pair main.ts runs inline) — cabinet.test.ts AC-6 + AC-3 |
| `toTitle` | core/cabinet.ts (+ contract iface/surface) | the inline `{ mode: 'title' }` boot literal (main.ts); cabinet.test.ts AC-3 builds it directly |

**KEPT (RED green-guards still green):** `wrapEggX` (no live twin — EGGWR unwired) + `cliffBits`, `EGG_VALUE_CAP`, `PTERO_FLYX_MAX`, `GRIP_ROUTINE`, `waveTypeBehaviour` (ROM claim-pins).

**Coverage preservation (the story's "do not delete the coverage" rule):** every re-point above preserves the ROM/behavioural assertion on the LIVE symbol. Where I DROPPED a test rather than re-pointed, it covered a dead twin's own micro-behaviour that is already covered on the live path — enumerated per-twin in Design Deviations so the Reviewer can verify each. Orphaned imports removed (transporter `WaveRow`, sim `RemountEntry`, cabinet `stepGame`/`PlayerInput`, joust `PlayerInput`); stale comments in six sibling files (demo-jt2-9, gameover-wiring, title-boot, arena-destruction, cabinet, sim-contract) updated to name the live path, not the retired twin.

**For the Reviewer (Thought Police) — where to look:** the two live-twin corrections (`waveEnemyComplement` → NOT `wenemyFor`; `groundStep` → NOT frame.ts) in Design Deviations, and the dropped-vs-redundant justification for each. The AST retirement gate (`jt13-8-retire-dead-twins.test.ts`) counts `ts.Identifier` nodes, so it independently proves each twin has zero code references remaining.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / O'Brien]** Gap (non-blocking): `wrapEggX` (EGGWR narrow egg wrap, JOUSTRV4.SRC:3141-3146) is exported and ROM-tested but has **zero live callers** — the live sim never wraps a settled egg's X. It is KEPT here (no re-point target), but the deeper question is whether EGGWR *should* be wired: if an egg can be knocked past the screen edge in play, the narrow wrap is a latent fidelity gap, not just dead code. Out of scope for a retirement story; flagging for a future jt audit.

- **[Dev / Julia]** Question (non-blocking): the retired `waveEnemyComplement` summed `bounders + hunters + lords + pterodactyls`, but the LIVE pad complement `enemyTypesForWave` (sim.ts) pushes only bounders + hunters + lords — pterodactyls are NOT pad-entering enemies. So the dead twin's formula was subtly WRONG (it would over-count a row carrying pterodactyls). No live row triggered the divergence, but it confirms the twin was a superseded early helper, not a faithful copy. *Found by Dev during implementation.*

- **[Dev / Julia]** Improvement (non-blocking): deleting `groundStep` leaves `groundTransition` (its sole caller was `groundStep`; still tested directly + in the collision surface) and joust.ts's `SKID_PLANT_Z` (a duplicate of flight.ts's, now referenced only by tests) as directly-orphaned exports. Both are outside jt13-8's named-twin scope (the audit listed neither), so they are left in place — flagging for a future unhooked-seam pass. *Found by Dev during implementation.*

- **[Dev / Julia — round 2]** No new upstream findings. The review rework exports `enemyTypesForWave` purely to re-point the dropped pursuit/pterodactyl-exclusion coverage onto the live symbol; it has no production caller change (still called only inside `spawnWaveEnemies`), so it does not alter behaviour — it is a test-coverage seam, documented as such at sim.ts:833. *Found by Dev during review rework.*

### Reviewer (code review)

- **Improvement** (non-blocking): the reworked skid-test block comment says `resolveJoust` "decides from plantZ alone", but it decides via `plantHeight = plantZ + (posY >> 8)` (both entities share posY here, so plantZ alone decides *in this test* — the very next inline comment states "posY + plantZ only" correctly). Affects `plugins/joust/tests/joust.test.ts` (~:144 — scope the block comment to this equal-posY setup, or match the inline comment's wording). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): "not the retired formula's eight (which double-counted its two pterodactyls)" — the dead formula summed the 2 pterodactyls in once too many (they should contribute 0), not twice; "double-counted" is imprecise. Affects `plugins/joust/tests/transporter.test.ts` (~:428 — reword to "wrongly summed in its two pterodactyls"). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): "wave-1 count is pinned against the LIVE `waveComplement` in demo.test.ts / demo-round2.test.ts" slightly overstates — demo-round2's `waveComplement` call pins wave 2, not wave 1. Affects `plugins/joust/tests/transporter.test.ts` (~:344 — drop the demo-round2 reference for wave 1, or note it pins wave 2). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **`waveEnemyComplement` live twin is `enemyTypesForWave`/`spawnWaveEnemies`, NOT `wenemyFor`.**
  - Spec source: story description + TEA Assessment re-point table ("waveEnemyComplement → wenemyFor(waveRowAt(wave)), clean 1:1").
  - Spec text: "waveEnemyComplement (transporter.ts:301; live = wenemyFor/waveRowAt)".
  - Implementation: verified `wenemyFor` computes a DIFFERENT quantity (the WENEMY hatch-at-a-time nibble select; returns 255 for non-egg rows) — it is not a re-point target. The live pad complement is `enemyTypesForWave(row).length` / the `spawnWaveEnemies` enumeration, exercised by the test helper `waveComplement(demo)`. Re-pointed demo.test.ts + demo-round2.test.ts onto `waveComplement(...)` against the ROM wave rows; dropped the two transporter.test.ts synthetic-row formula micro-tests (they pinned the dead twin's exact formula, including pterodactyls, which the live path excludes) and re-pointed the end-to-end test onto the live wave row's `.bounders`.
  - Rationale: the story's own "VERIFY each — do not trust this list blind" mandate; a re-point onto `wenemyFor` would have changed the asserted values (0/5 → 255), a false re-point. The complement's live behaviour is preserved on `waveComplement`; only the dead-and-slightly-wrong formula rails were dropped.
  - Severity: minor
  - Forward impact: none — coverage preserved on the live symbol; see the Delivery Finding on the pterodactyl over-count.

- **`groundStep` live twin is `stepGround` (flight.ts), NOT "frame.ts walk".**
  - Spec source: story description + TEA Assessment ("groundStep → frame.ts inline walk-off + skid chain").
  - Spec text: "groundStep (joust.ts:417; live = inline frame.ts walk)".
  - Implementation: verified the skid-chain transition (`groundTransition` + `plantZ = SKID_PLANT_Z`) is reimplemented live in `flight.ts` `stepGround` (frame.ts only calls `walkOff`). Dropped the 3 pure-transition groundStep tests in joust.test.ts (reversal→skid→plantZ2, forward→no-skid, airborne null-guard) — each is redundant with the LIVE `stepGround` coverage in demo-jt2-9.test.ts (the skid chain, per that file's own comment), ground-momentum.test.ts (airborne/null-groundState), and ground-release-decel-jt13-1.test.ts. Re-pointed the 2 tests UNIQUE to joust.ts — a skidding entity (plantZ 2) LOSING a joust via `resolveJoust` — by constructing the skidding entity directly (`ent({ groundState: 'PLYHR', plantZ: 2 })`).
  - Rationale: the transition twin lives across a type boundary (JoustEntity vs EntityState); re-pointing the transition tests would need a fragile cross-module adapter, and the coverage already exists on the live `stepGround`. The joust-outcome integration (unique to this file) is preserved.
  - Severity: minor
  - Forward impact: minor — see the Delivery Finding on `groundTransition` now being directly orphaned.

- **Wrapper-tautology tests DROPPED for `stepPlaying` (cabinet).**
  - Spec source: story rule "do not delete the coverage."
  - Spec text: "its tests RE-POINTED onto the live inline symbol to preserve coverage".
  - Implementation: dropped cabinet.test.ts's "stepPlaying delegates to stepGame bit-identical" test (it asserted the wrapper === raw stepGame; with the wrapper gone it is vacuous, and stepGame determinism is covered by the demo suite). Re-pointed the AC-6 mode-derivation tests + the AC-3 reachability walk onto the live pair `modeForGover(stepGame(game).gover)` and the inline `{ mode: 'title' }` boot literal.
  - Rationale: the dropped assertion covered only the wrapper's existence; the substance (stepGame determinism, modeForGover mapping, main.ts using literal stepGame) is covered by the demo suite, modeForGover's own tests, and gameover-wiring/demo-source respectively.
  - Severity: minor
  - Forward impact: none — the mode-machine substance is preserved on live core symbols.

- **Round-2 rework: EXPORTED `enemyTypesForWave` from sim.ts to re-point the dropped pursuit/pterodactyl-exclusion coverage (the reviewer's MEDIUM blocker).**
  - Spec source: Reviewer Assessment (round 1), MEDIUM `[TEST]` finding + Handoff ("No production code change").
  - Spec text: "Add a live `waveComplement`/`enemyTypesForWave`-based test on a pterodactyl+pursuer row ... asserting the live complement equals `bounders+hunters+lords` only" AND "No production code change; the 7 deletions and the other re-points are sound and stay."
  - Implementation: to pin the exclusion NON-VACUOUSLY on a live symbol I made the one production change the reviewer's own fix implies — added `export` to the previously file-private `enemyTypesForWave` (sim.ts:840), the exact named live twin of the deleted `waveEnemyComplement` (it is what `spawnWaveEnemies` calls). Added a narrow `loadEnemyComplement` loader to tests/helpers/sim-contract.ts (the `loadWaveBcd` second-entry discipline — main `loadSim` surface untouched, no sibling sim suite coupled). Added the exclusion test to transporter.test.ts's AC-4 block: over ROM rows 18 and 8 (both carry pursuers AND pterodactyls) it asserts `enemyTypesForWave(row).length === row.bounders+row.hunters+row.lords`, with `.not.toBe(...+pursuers)` / `.not.toBe(...+pterodactyls)` rails and the concrete `=== 6` witness (vs the dead formula's 8).
  - Rationale: the reviewer's primary directive — restore the dropped ROM coverage on the LIVE symbol — outranks the "no production code change" prediction. A faithful, non-vacuous pin of the exclusion is impossible through the existing exported surface (`enemyTypesForWave`/`spawnWaveEnemies` were both private; `createWaveSim` hardcodes wave 1; the end-to-end `waveComplement` route would need a sim stepped through 17 waves — fragile, and it would exercise arrival cadence, not the row→count law). Exporting the exact live twin IS the re-point the story rule asks for. The change is additive (a pure function gains an export), no constant/literal added (citation surface untouched), no purity impact.
  - Severity: minor
  - Forward impact: none — additive export; the pursuit/pterodactyl exclusion is now pinned on the live path, closing the fragile-fingerprint gap the reviewer flagged.

- **Round-2 rework: two LOW fixes (no production change).**
  - Spec source: Reviewer Assessment (round 1), two LOW `[TEST]` findings.
  - Spec text: cabinet:274 "Drop the tautological `expect(title.mode).toBe('title')`"; joust:143 "Reword the comment ... and drop the decorative `groundState`."
  - Implementation: cabinet.test.ts — dropped the self-referential `expect(title.mode).toBe('title')` (the final all-six-modes `toEqual(Set)` already pins that 'title' was reached). joust.test.ts — reworded the comment to state plainly it is a `resolveJoust` unit test over a pre-built plantZ-2 entity (skid-chain integration is covered on live `stepGround`), and dropped the decorative `groundState: 'PLYHR'` (verified `resolveJoust` reads only posY+plantZ via `plantHeight`, plus `enemyType` for score).
  - Rationale: exactly the reviewer's two green-lane fixes; no coverage lost (both were dead weight / decorative).
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)

Round-1 deviations (re-affirmed): the three original Dev deviations (`waveEnemyComplement` live twin = `enemyTypesForWave` not `wenemyFor`; `groundStep` live twin = `stepGround` not frame.ts; wrapper-tautology drops for `stepPlaying`) → ✓ **ACCEPTED** — verified live-twin correct by rule-checker (rule 24, zero live refs) and test-analyzer; the `wenemyFor`/`stepGround` corrections were sound calls that the round-1 review already validated.

Round-2 deviations:
- **EXPORTED `enemyTypesForWave` to re-point the dropped exclusion coverage** → ✓ **ACCEPTED** by Reviewer: this is the faithful re-point the round-1 MEDIUM finding's own suggested fix named. My round-1 "no production code change" was a prediction of scope, not a constraint; restoring the ROM coverage on the live symbol legitimately requires exposing it. The change is additive and pure — rule-checker A1 confirms no purity impact, A2 confirms no citation owed (no new constant), rule 1 confirms the loader cast is convention-compliant. test-analyzer mutation-tested the resulting pin (pushing pursuers→"21≠6", pterodactyls→"8≠6"): non-vacuous. The function retains its production caller (`spawnWaveEnemies`), so it is not a test-only export.
- **Two LOW fixes (cabinet tautology drop, joust comment/decorative-field)** → ✓ **ACCEPTED** by Reviewer: both are exactly the round-1 green-lane fixes; test-analyzer confirmed coverage intact (the all-six-modes Set still pins 'title') and the joust rewrite still asserts a real outcome.

No undocumented deviations found.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — vitest 17446 pass, orchestrator 503/503, lint clean, 0 smells, 0 orphaned imports |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — all re-point comments verified against live code (main.ts/sim.ts/arena-state.ts/wave.ts) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations / 33 rules / 71 instances; purity 64/64, citations 122/122 green |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED (round 1 — one coverage-rule violation + one diff-introduced vacuous assertion; both green-lane fixes)

**Diff-scope note (caught during review):** the local `develop` ref was **42 commits stale** (session-start `706df5bb`; the branch actually sits on `origin/develop` `212daeec`). A naive `git diff develop...HEAD` therefore spanned 61 files, pulling in unrelated merged work (jt13-13 `demo-ai.ts`, df5-9/10, jt13-14). I re-based the review diff on `origin/develop...HEAD` (22 files, jt13-8 only), fast-forwarded local `develop`, and confirmed all four subagents analysed the clean 22-file scope (each returned a file list restricted to `plugins/joust/**` jt13-8 files). This is the "stale checkout lies" hazard; flagging so the finish flow re-verifies against `origin/develop`.

**The refactor is mechanically sound.** rule-checker: 0/33 violations over 71 instances — no `as any`, no orphaned imports (tsc `strict`+`noUnusedLocals` clean over the whole repo), no enum/exhaustiveness gaps, purity boundary intact (deletions can't add impurity; purity 64/64 green), citation surface untouched (no new src/core constants), no new dependency (the AST gate reuses the existing `typescript` devDep). comment-analyzer: clean — every re-point comment independently verified against the live symbol it names. The AST retirement gate (`jt13-8-retire-dead-twins.test.ts`) is genuinely non-vacuous: it walks `ts.Identifier` nodes (so a comment naming a retired symbol cannot inflate the count), and its 6 KEEP guards double as a canary that the src-walk reaches real files. All 7 twins are provably retired (grep + AST: zero live refs).

**But two findings block round 1** (test-analyzer, both confirmed against live source by me):

| Severity | Issue | Location | Fix required |
|----------|-------|----------|--------------|
| [MEDIUM] `[TEST]` | **Dropped coverage not re-pointed — a story-rule violation.** The two `waveEnemyComplement` synthetic-row tests pinned the ROM law "the pursuit nibble never inflates the spawn complement." They were DROPPED, not re-pointed onto the live path. Verified real: the live `enemyTypesForWave` (sim.ts) yields `bounders+hunters+lords` — excluding **both** pursuers AND pterodactyls — while the dead formula counted pterodactyls. On WAVE_TABLE row 18 `{hunters:5, lords:1, pursuers:15, pterodactyls:2}` the live complement is **6**, the dead formula's was **8**, and NOTHING now pins that divergence (only wave-1's `{bounders:3, pursuers:1, ptero:0}` survives, which incidentally guards pursuers-not-added and not at all pterodactyls-not-double-counted). The story rule is explicit: "referenced only by BEHAVIORAL tests is deleted and its tests RE-POINTED onto the live inline symbol to preserve coverage (do not delete the coverage)." Dropping it and filing a Delivery-Finding comment is not a re-point. | `plugins/joust/tests/transporter.test.ts` (the retired AC-4 block, ~:334) | Add a live `waveComplement`/`enemyTypesForWave`-based test on a pterodactyl+pursuer row (wave 18, or wave 8 `{hunters:6, pursuers:1, ptero:1}`) asserting the live complement equals `bounders+hunters+lords` only — pinning the exact exclusion the removed formula guarded, on the live symbol. |
| [LOW] `[TEST]` | **Diff-introduced vacuous assertion.** In the AC-3 reachability walk, the retired `toTitle(attract)` step was replaced with a hand-built literal `const title = { ...attract, mode: 'title' }` followed by `expect(title.mode).toBe('title')`. That assertion checks a freshly-assigned value against itself — it invokes no production code and cannot fail. (The `reached.add(title.mode)` bookkeeping keeps the walk intact; the assertion is dead weight.) | `plugins/joust/tests/cabinet.test.ts:274-276` | Drop the tautological `expect(title.mode).toBe('title')` line, or re-tie it to main.ts's actual boot-literal source text (the title-boot-jt11-16-wiring idiom). |

**Plus one doc nit (non-blocking, fix while here):**

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [LOW] `[TEST]`/`[DOC]` | The re-pointed "skidding entity LOSES" test builds `ent({ groundState: 'PLYHR', plantZ: 2, ... })` and calls `resolveJoust`, but `resolveJoust` never reads `groundState` — so `'PLYHR'` is decorative and the comment's "PLYHR is the SKIDR state... a skid parks plantZ 2" overstates that it exercises skid-chain integration (it does not — that's covered on live `stepGround` in demo-jt2-9). It also largely duplicates the untouched test at joust.test.ts:110 (same plantZ-2-loses law, bounder/500 vs the new shadowLord/1500). | `plugins/joust/tests/joust.test.ts:136-150` | Reword the comment to state plainly it is a `resolveJoust` unit test over a pre-built plantZ-2 entity (not skid-chain integration), and drop the decorative `groundState`. |

**Data flow traced (wave complement):** `spawnWaveEnemies(wave, seed)` → `enemyTypesForWave(waveRowAt(wave))` (bounders→hunters→shadowLords, `for`-loops; pursuers/pterodactyls never pushed) → `enterViaPads(types.length, seed)` → the entering `SimProcess[]`. The demo's `waveComplement()` counts that live set. So the wave-1 (=3) and wave-2 (=4) re-points are correct AND the pursuit/ptero exclusion is a live, ROM-relevant property of `enemyTypesForWave` — exactly what the dropped tests should have re-pointed onto. Confirmed the retired `waveEnemyComplement` was a superseded, subtly-wrong twin (it over-counted pterodactyls), which strengthens the case for a live pin rather than silent removal.

**Rule Compliance (my own enumeration, cross-checked with rule-checker):**
- **core/shell purity (arcade rule):** the 5 touched core files (`arena/cabinet/joust/sim/transporter.ts`) changed by DELETION only — no `Date.now`/`Math.random`/DOM/timer/`shell` import added (grep-confirmed on added lines). purity suite green. COMPLIANT.
- **TS #1 type-safety escapes:** no `as any`/`as unknown as`/`@ts-ignore` added; no non-null assertion on any ADDED line (`entry!.posX` in demo.test.ts is pre-existing context, guarded). COMPLIANT.
- **TS #5 orphaned imports:** `stepGame`/`PlayerInput` (cabinet), `PlayerInput` (joust), `RemountEntry` (sim), `WaveRow` (transporter) all removed alongside their sole consumers; `tsc --noUnusedLocals` clean. COMPLIANT.
- **TS #24 retirement scoped to named symbols:** exactly the 7 named twins retired; `BRIDGE_WAVE`/`SKID_PLANT_Z`/`groundTransition`/`modeForGover` correctly KEPT (still live or claim-guarded). COMPLIANT — with the Dev-flagged note that `groundTransition`/`SKID_PLANT_Z` are now directly orphaned (out of scope; deferred to a future audit — acceptable).
- **Story rule "do not delete the coverage":** VIOLATED for the pursuit/ptero-exclusion property (the MEDIUM finding above). This is the round-1 blocker.

**Devil's Advocate.** Where could this ship broken? (1) A green-but-wrong re-point: I checked each — `applyWaveDestruction(...).bridgeBurned` computes `state.bridgeBurned || wave >= BRIDGE_WAVE` (arena-state.ts:158), so the arena re-point asserts the real latch; the `waveComplement`===3/4 re-points call the live count against untouched ROM rows; the FIFO re-point reads `b.queue.lpserv` live from the SUT. None vacuous except the cabinet:274 literal (flagged). (2) A silently-lost ROM law: found one — the pursuit/pterodactyl exclusion (flagged MEDIUM). A malicious/careless future edit that made `enemyTypesForWave` start pushing pursuers would now slip past the unit suite (it would only surface as a demo-fingerprint drift, which is fragile coverage for a precise ROM law). That is exactly the gap the re-point must close. (3) Over-deletion of a KEEP symbol: the 6 KEEP guards redden if `wrapEggX` or the 5 constants vanish — verified present and green. (4) The stale-develop trap could have hidden the real diff behind 42 unrelated commits — caught and corrected before the subagents concluded. Nothing else surfaced: no error handling exists to swallow (pure deletions), no new types, no attack surface, no concurrency.

**Handoff:** Back to Dev (Julia) for a focused green-rework — one live coverage re-point (transporter, the blocker), one vacuous-line fix (cabinet:274), one comment reword + decorative-field drop (joust:143). No production code change; the 7 deletions and the other re-points are sound and stay.

**Dispatch tags:** `[TEST]` — 3 confirmed (test-analyzer): the MEDIUM coverage re-point (blocker), the LOW vacuous cabinet:274 assertion, the LOW skid comment/duplicate. `[DOC]` — comment-analyzer CLEAN (0 findings; every re-point comment verified against the live symbol it names — no stale/misleading docs, the mc11-4 failure mode is absent here). `[RULE]` — rule-checker CLEAN (0 violations / 33 rules / 71 instances; purity + citations + noUnusedLocals all green). `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` — N/A (subagents disabled via settings); I checked each domain myself against a pure-deletion + test-repoint diff: no new branches/edges, no error handling to swallow, no new types, no attack surface, no added complexity.

## Subagent Results

**Cycle: 1**

Re-review of the round-2 rework. Method: re-ran ALL enabled subagents against the full `origin/develop...HEAD` diff (22 files) for this cycle. Working-tree audit (`pf reviewer audit-tree`) ran after all returned: **CLEAN, exit 0** (test-analyzer's isolated mutation worktree was removed; `git status` clean; no stray worktree).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — joust 3870/3870, orchestrator 503/503, lint clean, 0 smells, 0 debug code |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A — all 3 round-1 findings verified FIXED; mutation battery in an isolated worktree confirmed the re-point catches pursuers-pushed (21≠6) and pterodactyls-pushed (8≠6) mutants — non-vacuous |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3 (all LOW comment-precision), dismissed 0, deferred 0 — non-blocking, captured as Delivery Findings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations / 33 rules / 61 instances; purity (A1), citation surface (A2), retirement scope (A3), `.js` extensions, orphaned imports, cast-convention all verified |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed (all LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (re-review; supersedes the round-1 REJECTED verdict)

**All three round-1 findings are fixed, and the fixes are verified — not just green.**

| Round-1 finding | Status | Evidence |
|-----------------|--------|----------|
| [MEDIUM] `[TEST]` dropped pursuit/pterodactyl-exclusion coverage | **FIXED** | Re-pointed onto the live, now-exported `enemyTypesForWave` over ROM rows 18 & 8 (transporter.test.ts AC-4). test-analyzer's isolated **mutation battery** confirmed the pin catches both defect classes it claims to guard: pushing pursuers → `21≠6`, pushing pterodactyls → `8≠6`. Not circular — backed by the independent `=6` witness and `.not.toBe(...)` rails. |
| [LOW] `[TEST]` vacuous `title.mode` self-check | **FIXED** | Dropped; the terminal `expect(reached).toEqual(new Set([…'title'…]))` still pins that 'title' was reached — coverage intact. |
| [LOW] `[TEST]`/`[DOC]` misleading skid comment + decorative field | **FIXED** | Reworded to a plain `resolveJoust` unit test; `groundState` dropped. `resolveJoust` (joust.ts:230) decides via `plantHeight`+`enemyType`, never `groundState` — verified. |

**Data flow traced (the one production change):** `enemyTypesForWave(row)` gained an `export`. It is called by production `spawnWaveEnemies(wave, seed)` (sim.ts:1492) for every non-egg wave, and now also by the test via the narrow `loadEnemyComplement` loader (sim-contract.ts, the `loadWaveBcd` discipline). The export is additive and pure — rule-checker A1 (no impurity), A2 (no new constant → no citation owed), rule 1 (loader cast matches the file's existing `loadSim`/`loadTransporter` convention, not `as any`). Purity 216/216 green, `tsc --noEmit` clean. It retains a production caller, so it is not a test-only export.

**Pattern observed:** the re-point follows the story's own rule faithfully — the dead `waveEnemyComplement` (a superseded, subtly-wrong twin that over-summed pterodactyls) is retired and its ROM coverage moved onto the live symbol, not dropped. The narrow secondary loader (sim-contract.ts) correctly avoids widening the main `loadSim` surface.

**Error handling:** the loader's `catch` rethrows a self-describing error mirroring the file's established convention (rule-checker rule 11) — no swallow.

**Rule Compliance (cross-checked with rule-checker):**
- **core/shell purity:** export-only sim.ts change; no Date/Math.random/DOM/timer/shell import. COMPLIANT (A1, purity suite green).
- **ROM citations:** no new src/core constant/literal → nothing owed. COMPLIANT (A2).
- **Retirement scope (TS #24):** exactly 7 twins retired (zero live refs, grep+AST), `wrapEggX`+5 constants KEPT. COMPLIANT (A3).
- **Type-safety escapes (TS #1):** no `as any`/`as unknown as`/`@ts-ignore`; loader cast is convention-compliant. COMPLIANT.
- **Module/orphaned imports (TS #5):** `.js` extensions present on all new imports; no orphans. COMPLIANT.
- **Story rule "do not delete the coverage":** the round-1 VIOLATION is now RESOLVED — the exclusion law is pinned on the live symbol and mutation-verified. COMPLIANT.

**Devil's Advocate.** Where could this still ship broken? (1) A green-but-vacuous re-point — refuted by mutation testing: the pin fails on the exact defect class (pursuers/pterodactyls pushed into the complement). (2) The `.toBe(bounders+hunters+lords)` line circular against the live function — mitigated: the independent `=6` literal and the two `.not.toBe(...)` rails are non-circular oracles, and the `toBeGreaterThan(0)` guards prove the excluded fields are actually populated (non-vacuity). (3) The export widening the surface as a risk — additive/pure, real production caller retained, no purity/citation/type impact (rule-checker clean). (4) Egg-wave divert bypassing `enemyTypesForWave` — irrelevant: the test pins the pure helper directly, which is the ground-complement builder for every non-egg wave, exactly the dead twin's old scope. Nothing rises above LOW.

**Remaining (non-blocking):** 3 LOW `[DOC]` comment-precision nits (comment-analyzer, all confirmed) — recorded as Delivery Findings for a future comment tidy; none affects code, coverage, or any assertion value. They do not warrant a rework cycle (the mc11-4 comment-scrubbing round-burn is the anti-pattern to avoid).

**Handoff:** To SM (Baldur) for finish-story.

**Dispatch tags:** `[TEST]` — test-analyzer CLEAN (all 3 round-1 findings verified fixed; re-point mutation-verified non-vacuous). `[DOC]` — comment-analyzer: 3 confirmed LOW comment-precision nits, non-blocking (captured as Delivery Findings). `[RULE]` — rule-checker CLEAN (0 violations / 33 rules / 61 instances; purity A1 + citations A2 + retirement-scope A3 + cast-convention + `.js` extensions all verified). `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` — N/A (disabled via settings); I assessed each myself against an additive-export + test-repoint diff: no new branches/edges, the loader's only `catch` rethrows (nothing swallowed), no new nominal types (the structural `WaveRowShape` mirrors `WaveRow`), no attack surface, no added complexity (the loader mirrors the existing `loadWaveBcd`).