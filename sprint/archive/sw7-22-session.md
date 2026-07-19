---
story_id: "sw7-22"
jira_key: "sw7-22"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-22: R6d Streaming wedge-panel trench — seat the exhaust port at its real BS.PLC distance (0x50000 = 327,680) so the pilot flies the full ~21s channel, and STREAM the grid's per-wedge wall-panel content (B-012 force fields now, B-017 guns next) in over it; replaces the TRENCH_FAR (28,672) port-clamp stub. Beam-reach stays $7000 so the port only becomes shootable in the final ~1.8s (WSLAZR CLBLZ). Unblocks the ~80 authentic force-field panels sw7-19 could not place into the 1.8s stub.

## Story Details
- **ID:** sw7-22
- **Jira Key:** sw7-22
- **Workflow:** tdd
- **Stack Parent:** sw7-19

**Repos:** star-wars
**Branch:** feat/sw7-22-streaming-wedge-panel-trench
**Base:** develop (star-wars gitflow; PR targets develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T13:53:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T11:24:59Z | 2026-07-19T11:27:56Z | 2m 57s |
| red | 2026-07-19T11:27:56Z | 2026-07-19T11:58:24Z | 30m 28s |
| green | 2026-07-19T11:58:24Z | 2026-07-19T12:21:07Z | 22m 43s |
| review | 2026-07-19T12:21:07Z | 2026-07-19T13:53:58Z | 1h 32m |
| finish | 2026-07-19T13:53:58Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (blocking): the data-driven RED test "PIE1 streams zero force fields"
  forces Dev to REMOVE the placeholder stub catwalk from `spawnTrenchObstacles` (the grid,
  not a fixed injection, is the source of force fields). That will redden two GREEN-now
  siblings that depend on the stub catwalk. Affects `tests/core/trench-variation.test.ts`
  (":111-119 'every run keeps at least one CATWALK'" — obsolete; the grid says PIE1 has none)
  and `tests/core/trench-viewpoint.test.ts` (":68-72 getCatwalk() pulls the stub catwalk
  from `spawnTrenchObstacles()`"). Dev migrates both during GREEN — re-seat them to construct
  their OWN force field (like `trench-force-field-hazard.test.ts`'s `forceField(wall,y,z)`
  helper), not the default trench's catwalk. *Found by TEA during test design.*
- **Gap** (non-blocking): the per-slot wall HEIGHT map (which y the 4 vertical panel slots
  occupy — ROM `M.Z0 ± $200` top / `$400` band, WSPANL.MAC:186-215) is NOT pinned; the tests
  pin wall-sign + grid-derived −Z + a count floor, per the sw7-19 "observable via extremes"
  rule. Affects `src/core/trench-obstacles.ts` (Dev derives each slot's height from the grid).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `EXHAUST_PORT_DISTANCE` (state.ts:689 = `min(BS.PLC,
  TRENCH_FAR)` = 28,672) is now a misnomer — with the port un-clamped it is the SHOOTABLE
  WINDOW (= `TRENCH_FAR`), not the port's distance (`TRENCH_PORT_OFFSET` = 327,680). Left
  as-is to avoid re-seating ~8 hit-staging suites that fire at −EXHAUST_PORT_DISTANCE (all
  within reach); consider renaming to a `PORT_SHOOTABLE_DISTANCE`. Affects `src/core/state.ts`.
  *Found by TEA during test design.*
- **Question** (non-blocking): the streaming seam is pinned as ALL-AT-ENTRY — fields placed in
  `trenchObstacles` at `enterPhase` and scrolled with the channel (matches the existing obstacle
  architecture and the ROM's up-front `GNBASE` pie build). If Dev instead spawns fields lazily as
  they approach, `enterPhase(...).trenchObstacles` must still expose the full set or the streaming
  tests need a traversal driver. Affects `src/core/sim.ts` (`enterPhase`) / `trench-obstacles.ts`.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the wedge grid also carries `PANEL_GUN` slots (PIE1 has 80!) —
  B-017 wall guns, the NEXT story (`pair-guns.json`), explicitly out of scope here. This story
  streams force fields only. Affects `src/core/trench-obstacles.ts` (guns stay unwired).
  *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): editing `sim.ts`/`trench-obstacles.ts` shifted 25 audit
  citations and changed the line B-014's `ours` quoted (the old clamped `spawnPort`). Reanchored
  with `node tools/audit/reanchor-citations.mjs --write` (25 moved, B-014 verbatim updated to the
  un-clamped line, `0 lost`, `tests/audit/citations.test.ts` green). Affects
  `docs/audit/findings/pair-trench.json` (expected diff — reanchored, not laundered).
  *Found by Dev during implementation.*
- No further upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): redundant `as readonly Wedge[]` casts at
  `src/core/trench-obstacles.ts:210` and `tests/core/trench-forcefield-streaming.test.ts:72` —
  `buildTrench` already returns `readonly Wedge[]`, so the cast narrows nothing (rule-checker
  [RULE], high confidence; verified removable with zero tsc diagnostics beyond the then-unused
  `Wedge` import). LOW — cosmetic, not an unsafe escape. Fold into a follow-up/simplify pass or
  the B-017 story that next touches this file. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the trench now carries TWO overlapping wall-content systems —
  the provisional `spawnTrenchObstacles` turret/square furniture AND the grid-streamed force
  fields — both seeded from `createRng(s.rng.seed)` (same seed, independent cursors). Deterministic
  and correct, but the furniture is destined to be replaced by the grid's `PANEL_GUN` slots (B-017).
  Affects `src/core/trench-obstacles.ts` / `sim.ts enterPhase` (unify onto the grid in B-017).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): no PERMANENT full-traversal integration test exists (the port
  arriving + a streamed field grazing over a real ~21s run). The mechanisms are covered by
  composition (spawn distance, beam-reach gate, FF placement, sw7-19 collision) and I verified the
  end-to-end run via a throwaway probe (82 FF, port arrives frame 1248, 22 grazes) — but a standing
  integration test would guard the seam. Affects `tests/core/` (add a traversal test).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Port "seated at BS.PLC" pinned via the spawn, not the EXHAUST_PORT_DISTANCE constant**
  - Spec source: story title (sw7-22) — "seat the exhaust port at its real BS.PLC distance (0x50000 = 327,680)"
  - Spec text: "replaces the TRENCH_FAR (28,672) port-clamp stub"
  - Implementation: pinned the SPAWN observable (`enterPhase(...).exhaustPort.pos[2] === -TRENCH_PORT_OFFSET`, `spawnPort` un-clamped) and `TRENCH_PORT_OFFSET === 0x50000`; left `EXHAUST_PORT_DISTANCE` as the shootable-window staging distance rather than forcing it to 327,680
  - Rationale: the `min(...)` clamp lives in BOTH `spawnPort` and `EXHAUST_PORT_DISTANCE`; the PORT POSITION comes from `spawnPort`, so un-clamping the spawn is the faithful "replace the stub" change. Changing the constant's value would silently push ~8 hit-staging suites (which fire at −EXHAUST_PORT_DISTANCE) beyond the beam and make every port-hit test un-hittable — a mass false-red for no fidelity gain
  - Severity: minor
  - Forward impact: `EXHAUST_PORT_DISTANCE` naming smell logged as a Delivery Finding for Dev
- **Force-field placement pinned by OBSERVABLE extremes, not exact count/heights**
  - Spec source: story title — "STREAM the grid's per-wedge wall-panel content (B-012 force fields)"; sibling contract `trench-force-field-hazard.test.ts`
  - Spec text: "the ~80 authentic force-field panels sw7-19 could not place"
  - Implementation: pinned count ≥ 40, distances ⊆ the `buildTrench` FF-slot distances, span past `TRENCH_FAR`, both walls, kind 'catwalk'; did NOT pin the exact 82 count nor the per-slot y-height (M.Z0 ± $200/$400)
  - Rationale: the sw7-19 rule ("pin the OBSERVABLE via extremes, route the ROM band/depth literals to a Delivery Finding") — the grid→world height map and any slot-collapse are Dev's to build, and an exact-count/height pin would reject a faithful port over a mapping choice
  - Severity: minor
  - Forward impact: exact height literals routed to a Delivery Finding
- **Streaming seam observed at trench entry (all-at-once), not lazily**
  - Spec source: story title — "STREAM ... in over it"
  - Spec text: "STREAM the grid's per-wedge wall-panel content ... in over it"
  - Implementation: the streaming tests read `enterPhase(...).trenchObstacles` at entry (fields present at their −Z, scrolled by the existing channel scroll)
  - Rationale: matches the existing obstacle architecture (obstacles placed at entry, scrolled) and the ROM's up-front `GNBASE` base-pie build; "stream" = fields come into view as the channel scrolls a full-channel set toward the cockpit
  - Severity: minor
  - Forward impact: if Dev spawns lazily, the observation seam must still expose the full set — logged as a Delivery Finding

### Dev (implementation)
- **Force-field per-slot HEIGHTS are provisional wall fractions, not the ROM band**
  - Spec source: TEA Delivery Finding (Gap) — the per-slot wall height map (`M.Z0 ± $200` top / `$400` band, WSPANL.MAC:186-215) is not pinned
  - Spec text: "the per-slot wall HEIGHT map ... is NOT pinned; the tests pin wall-sign + grid-derived −Z + a count floor"
  - Implementation: `FORCE_FIELD_SLOT_Y` in `trench-obstacles.ts` maps the 4 vertical slots (top→bottom) to `TRENCH_WALL_H × [4/5, 3/5, 2/5, 1/5]` = 3277/2458/1638/819 — evenly spread across the wall so every slot lands inside the pilot's reachable band (512..3840, verified by trench-furniture-anchoring.test.ts)
  - Rationale: no test pins the heights; minimal + faithful choice that keeps every field a real hazard the diving/climbing pilot can meet. Exact ROM `$200/$400` derivation deferred (still the TEA Gap finding)
  - Severity: minor
  - Forward impact: a later fidelity story may re-pin the slot heights to the ROM band; no sibling depends on the exact values
- **Placeholder catwalk station removed; two siblings migrated (per TEA's blocking Conflict finding)**
  - Spec source: TEA Delivery Finding (Conflict, blocking) — "PIE1 streams zero force fields forces Dev to REMOVE the placeholder stub catwalk"
  - Spec text: "Dev migrates both during GREEN — re-seat them to construct their OWN force field"
  - Implementation: dropped the `catwalk` row from `TRENCH_OBSTACLE_STATIONS` (8→7) and `TRENCH_HEAD_COUNT` (4→3); migrated `trench-variation.test.ts` ("every run keeps a catwalk" → carries none, streamed now), `trench-viewpoint.test.ts` (`spawnedCatwalk()` builds its own field), and the collateral surfaced at GREEN: `trench-furniture-anchoring.test.ts` (catwalk-height → streamed-field-height), `trench-obstacles.test.ts` (`shotThroughTo` re-seated to a within-reach port; station-count 8→7), `render.exhaust-port-orient.test.ts` (spawn assertion → BS.PLC)
  - Rationale: the grid is the authentic source of force fields; the stub catwalk was a placeholder the grid data refutes for PIE1
  - Severity: minor
  - Forward impact: none — all migrations preserve each suite's original intent; full suite 1707/1707

### Reviewer (audit)
- **TEA: port pinned via the spawn, not EXHAUST_PORT_DISTANCE** → ✓ ACCEPTED: the port POSITION
  comes from `spawnPort` (sim.ts:1625), which now returns the full `trenchPortDistance`; keeping
  `EXHAUST_PORT_DISTANCE` as the shootable window (= TRENCH_FAR) is faithful and avoided an ~8-file
  false-red. The new suite pins `EXHAUST_PORT_DISTANCE ≤ TRENCH_FAR`, guarding the choice.
- **TEA: force-field placement pinned by observable extremes, not exact count/heights** → ✓ ACCEPTED:
  matches the sw7-19 rule; the derivation pin (streamed −Z ⊆ grid distances) is clone-safe and the
  PIE1=0 discriminator is a real anti-fixed-injection guard. Exact ROM band correctly routed to a Finding.
- **TEA: streaming seam observed at trench entry (all-at-once)** → ✓ ACCEPTED: matches the existing
  obstacle architecture and the ROM's up-front GNBASE build; my e2e probe confirms the entry-placed
  set scrolls in and grazes correctly (22 grazes, port arrives frame 1248).
- **Dev: provisional force-field slot heights** → ✓ ACCEPTED: all four (819–3277) sit inside the
  pilot band (512–3840) with overlapping coverage; `trench-furniture-anchoring.test.ts` guards it.
  ROM `$200/$400` band deferral is honest and Finding-tracked.
- **Dev: placeholder catwalk removed + siblings migrated** → ✓ ACCEPTED: the grid is the authentic
  source; every migrated sibling preserves its original intent (verified: shotThroughTo→within-reach,
  variation→no-furniture-catwalk, viewpoint→own field, furniture→streamed-heights). No intent lost.

## Sm Assessment

**Routing to TEA (RED phase).** 8pt p1 TDD story, star-wars, on branch
`feat/sw7-22-streaming-wedge-panel-trench` off `develop` (v0.0.26). Dependency
sw7-19 is DONE; merge gate clear.

**What this story does (from the title — no separate ACs in YAML):** Replace the
current TRENCH_FAR port-clamp stub (exhaust port pinned at 28,672) by seating the
exhaust port at its real BS.PLC distance — 0x50000 = 327,680 — so the pilot flies
the full ~21s channel instead of the ~1.8s stub. Over that longer channel, STREAM
the grid's per-wedge wall-panel content (B-012 force fields for this story; B-017
guns are the next story, out of scope). Beam-reach stays $7000, so the port only
becomes shootable in the final ~1.8s (WSLAZR CLBLZ) — that behavior must not
regress. The payoff: it unblocks the ~80 authentic force-field panels sw7-19 could
not place into the old 1.8s stub.

**TEA — before writing failing tests:**
- Derive ACs from the title text ONLY. Do not invent byte addresses, line numbers,
  or ROM citations. Where the title gives a constant (0x50000/327,680; 28,672;
  $7000), pin it; where it names a ROM symbol (BS.PLC, TRENCH_FAR, WSLAZR CLBLZ),
  verify against the gitignored star-wars ROM/assembler source before citing a
  location — this epic has a documented history of stapled/fabricated citations.
- Read sw7-19's shipped work on develop to understand the exact stub being replaced
  (the port-clamp) and where the ~80 force-field panels currently have nowhere to go.
- The port-distance and per-wedge streaming logic is deterministic sim → belongs in
  `src/core`; keep render/geometry in `src/shell`. That core/shell seam is the
  house rule.
- Guard the invariant that survives from the old behavior: the port stays
  non-shootable until the final ~1.8s (beam-reach $7000). Pin an actual coordinate/
  distance, not just a routing call.

**Context file** `sprint/context/context-story-sw7-22.md` is an honest skeleton
(Problem/Approach/ACs deferred to you) — the title above is the spec; the epic
context file has the broader R6 trench arc.

**Setup note:** sm-setup left the story in `backlog` and omitted the Repos/Branch
fields — both corrected here before handoff.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `tests/core/trench-port-bs-plc.test.ts` (NEW) — AC-1 (port seated at its real BS.PLC
  distance / full ~21s channel) + AC-2 (beam reach stays $7000; port shootable only in the
  final ~1.8s).
- `tests/core/trench-forcefield-streaming.test.ts` (NEW) — AC-3 (stream the wedge grid's
  force-field content over the full channel; data-driven from `buildTrench`).
- `tests/core/trench.test.ts` (RE-SEAT, 1 assertion) — the spawned port now sits at
  −TRENCH_PORT_OFFSET (was −EXHAUST_PORT_DISTANCE).
- `tests/core/phase-jump.test.ts` (RE-SEAT, 1 assertion) — same spawn-distance re-point.

**Tests Written:** 12 new (6 + 6) covering 3 ACs + 2 sibling re-seats. Verified RED against
the FULL suite: **10 failed | 1697 passed (1707 tests, 152 files)** — the 10 failures are
exactly the intended RED (4 port, 4 streaming, 2 re-seats), each failing for the right
reason (−28,672→−327,680; arm true→false; 1.82s→>18; stub's 1 catwalk → grid's ~82;
PIE1 wrongly has 1 → must be 0; stub catwalk not a grid slot; one wall → both). **Zero
collateral** — cross-checked against the true full-suite size, not a scoped subset (the
rb4-15 lesson). `tsc --noEmit` is clean (assertion-RED, not import-RED: every import is an
existing export). 2 tests in the streaming file are intentional GREEN guards: the measured
ground-truth anchor and the keep-property that streamed fields are kind 'catwalk' (the kind
the sw7-19 collision at `sim.ts:1080` reads).

### ACs (derived from the title — no separate ACs in YAML)

| AC | Behaviour | RED signal now |
|----|-----------|----------------|
| AC-1 | Port spawns at the real BS.PLC = 0x50000 = 327,680 (un-clamp `spawnPort`/`EXHAUST_PORT_DISTANCE`'s `min(…,TRENCH_FAR)`); pilot flies the full ~21s channel | port spawns at −28,672 (~1.8s) |
| AC-2 | Beam reach stays $7000 = TRENCH_FAR — the port is shootable only once scrolled within it (final ~1.8s); must not regress | a dead-centre shot at the freshly-spawned port arms (it's on the beam edge) |
| AC-3 | Stream the grid's force-field content (B-012, `PANEL_FORCEFIELD` slots of `buildTrench`) over the full channel; data-driven (PIE1 → 0, BS.WAV 1 → ~82), correct wall, kind 'catwalk' | the stub injects ONE placeholder catwalk on every wave, ≤ ~4,448 down |

### Rule Coverage

| Rule | Test / status |
|------|---------------|
| Core/shell purity (project rule — no DOM/time/random in `core`) | All new tests are pure `src/core` tests; no `Date.now`/`Math.random`/DOM. The existing purity guard covers Dev's implementation. |
| Every test asserts something meaningful (no vacuous) | Self-checked: each test asserts on a real value; the two GREEN tests are a data anchor and a kind-regression guard, not `assert(true)`. |
| lang-review/typescript.md (`as any`, `!` on nullable, `||` vs `??`, enum exhaustiveness) | Not applicable to the RED tests (implementation-pattern rules the Reviewer checks on Dev's GREEN diff); no new types/constructors/parsing/security surface in this story. |

**Rules checked:** the applicable project rule (core purity) has coverage; the lang-review
checklist is GREEN-diff surface. **Self-check:** 0 vacuous tests.

### Dev — what GREEN needs (the seam I pinned; details in Delivery Findings)

1. **Un-clamp the port** — drop `Math.min(…, TRENCH_FAR)` in `spawnPort` (sim.ts:1613) so it
   returns `-trenchPortDistance(baseWave, rng)`. The beam-reach gate (`beamHit(…,TRENCH_FAR)`,
   sim.ts:1032) already exists and keeps the port un-shootable until it scrolls in — do NOT
   touch it. Leave `EXHAUST_PORT_DISTANCE` as the shootable-window staging distance (naming
   smell flagged, not required to change).
2. **Stream force fields from the grid** — make `enterPhase`'s trench build derive force-field
   obstacles (kind 'catwalk') from `buildTrench(romWave0(wave), rng)` — one per `PANEL_FORCEFIELD`
   slot, at the slot's wedge −Z (accumulated `wedgeLength`), on the slot column's wall (left → x<0,
   right → x>0). This REPLACES the placeholder stub catwalk (so PIE1 correctly has zero). The
   per-slot HEIGHT map (WSPANL M.Z0 ± $200/$400) is yours to derive — the tests pin wall + −Z, not y.
3. **Migrate the two catwalk-dependency siblings** (blocking Conflict finding): `trench-variation`
   and `trench-viewpoint` depend on the stub catwalk that step 2 removes — re-seat them to build
   their own force field.

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Dev Assessment

**Status:** GREEN — full suite **1707 passed / 1707 (152 files)**, `tsc --noEmit` clean,
`npm run build` (tsc + vite) clean.

**Implementation (minimal, per the ACs):**
1. **Port un-clamped (AC-1/AC-2)** — `spawnPort` (sim.ts) now returns
   `-trenchPortDistance(baseWave, rng)` (the real BS.PLC ≈327,680), dropping the
   `Math.min(…, TRENCH_FAR)` port-clamp stub. Left `EXHAUST_PORT_DISTANCE` as the
   shootable-window staging constant (per TEA's deviation). The pre-existing
   `beamHit(…, TRENCH_FAR)` clip (untouched) keeps the port un-shootable until it scrolls
   within $7000 — the beam reach is the clip, not the spawn.
2. **Force-field streaming (AC-3)** — new `streamForceFields(baseWave, rng)` in
   `trench-obstacles.ts` walks `buildTrench` and emits one 'catwalk' obstacle per
   `PANEL_FORCEFIELD` slot, on its column's wall (left → −x, right → +x), at the wedge's −Z,
   at a provisional per-slot height (`FORCE_FIELD_SLOT_Y`, see deviation). `enterPhase` now
   concatenates it with the turret/square furniture, seeded from a local RNG cursor (purity).
   The placeholder catwalk station was removed (grid is the source; PIE1 correctly streams 0).
   Rendered for free — `render.ts:447` already draws kind 'catwalk' via `TRENCH_CATWALK` (the
   sw7-19 WFF model), so the streamed fields are visible, not invisible hazards.

**Sibling migrations (TEA's blocking Conflict finding + GREEN-surfaced collateral):**
`trench-variation`, `trench-viewpoint`, `trench-furniture-anchoring`, `trench-obstacles`
(`shotThroughTo` re-seated to a within-reach port; station count 8→7), and the shell
`render.exhaust-port-orient` spawn assertion — all re-seated to preserve original intent.
Audit citations reanchored (25 moved, B-014 verbatim updated, 0 lost).

**Deviations:** provisional force-field slot heights (ROM `$200/$400` band deferred, still an
open Delivery Finding); placeholder catwalk removed + siblings migrated. Both logged above.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | success | 0 smells; 1707/1707 pass; tsc+build clean | N/A (clean) |
| 2 | reviewer-edge-hunter | No | Skipped | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | No | error (killed at ~80min, no result) | none returned | Domain self-assessed by Reviewer via e2e traversal probe |
| 5 | reviewer-comment-analyzer | No | Skipped | N/A | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (clean) |
| 8 | reviewer-simplifier | No | Skipped | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (redundant casts, LOW) | confirmed 2 (LOW, non-blocking) |

**All received:** Yes (3 enabled subagents returned; reviewer-test-analyzer killed at ~80min per user request → test domain self-assessed via an end-to-end traversal probe; 5 subagents disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `s.wave` → `enterPhase` → `spawnPort(romWave0(wave), createRng(seed))` seats the
port at `-trenchPortDistance` (−327,680, sim.ts:1625) → each frame `stepTrench` scrolls it toward the
cockpit; the beam can only reach it once its −z ≤ `TRENCH_FAR` (`beamHit(...,TRENCH_FAR)`, sim.ts:1033),
and `reachedCockpit` (sim.ts:1291, keyed on `pos[2] >= 0`) fires the miss on arrival. Verified
END-TO-END with a throwaway probe on a real wave-2 traversal: 82 fields streamed at entry, port arrives
at frame 1248 (~20.8s = the full ~21s channel), 22 grazes fire, all fields despawn. Safe: no external
input feeds `baseWave`/`rng`; the value is a bounded scalar, never an array size.

**Pattern observed:** `streamForceFields` (trench-obstacles.ts:207) mirrors the existing pure
`spawnTrenchObstacles` shape (walk deterministic data, thread a local RNG cursor, return fresh
`TrenchObstacle[]`), and `enterPhase` composes them by concatenation — a clean, minimal extension of
the established obstacle-seeding seam.

**Error handling:** No new error surface (pure numeric sim). Out-of-range `baseWave` degrades safely —
`buildTrench`/`selectPie` fall back to the random-pie template rather than throwing (rule-checker,
rule 10); `FORCE_FIELD_SLOT_Y[i]` is index-safe (`i ∈ 0..3` over a fixed 4-tuple `PanelColumn`).

### Observations (dispatch tags — all 8 domains covered)

- [SEC] VERIFIED clean — reviewer-security confirmed no purity breach, no unbounded growth (~82 max,
  constant per pie, runs once per phase-entry not per frame), no OOB. Corroborates my own read.
- [RULE] LOW (confirmed, non-blocking) — redundant `as readonly Wedge[]` cast at trench-obstacles.ts:210
  and trench-forcefield-streaming.test.ts:72; `buildTrench` already returns `readonly Wedge[]`. Cosmetic,
  not an unsafe escape; recorded as a Delivery Finding for a follow-up cleanup.
- [TEST] VERIFIED (self-assessed — subagent killed) — the RED suite pins observables via extremes
  (count ≥ 40, distances ⊆ grid), a clone-safe derivation pin, and a real anti-fixed-injection
  discriminator (PIE1 streams 0). No vacuous assertion changes the verdict; the two green guards
  (ground-truth anchor, kind='catwalk') have teeth — my e2e probe confirms streamed fields actually
  graze. LOW gap: no PERMANENT full-traversal test (Delivery Finding).
- [SIMPLE] VERIFIED (self-assessed — disabled) — the diff is minimal for the ACs: one clamp removed,
  one small pure function added, one placeholder removed. The redundant cast ([RULE] above) is the
  only simplification worth noting. The two overlapping obstacle systems (furniture + grid) are a real
  smell but destined to unify under B-017 (Delivery Finding), not scope for this story.
- [TYPE] VERIFIED (self-assessed — disabled) — evidence trench-obstacles.ts:189 `FORCE_FIELD_SLOT_Y:
  readonly number[]` and the `PanelColumn` 4-tuple make the index sound; `Rng` intentionally mutable
  (local cursor); no `as any`/`Record<string,any>`. Complies with lang-review rules 1-2.
- [SILENT] VERIFIED (self-assessed — disabled) — no swallowed errors: no try/catch, no `||`-fallback,
  no empty catch introduced (rule-checker rules 4/11 found none). A force-field slot that is BLANK is
  simply not pushed — an explicit, visible filter, not a silent drop.
- [DOC] VERIFIED (self-assessed — disabled) — comments updated in lockstep with the code: the spawnPort
  doc now explains the beam-clip-is-the-reach logic; FORCE_FIELD_SLOT_Y is honestly marked PROVISIONAL;
  the TRENCH_HEAD_COUNT comment records the catwalk's move to the grid. No stale comment survives.
- [EDGE] VERIFIED (self-assessed — disabled) — boundary cases checked: PIE1 (0 fields, the empty edge),
  the port past the beam line (unhittable, pinned), the port within it (hittable, pinned), a same-side
  vs opposite-wall pilot, and the port ARRIVAL after the full scroll (e2e probe, frame 1248). The
  after-the-last-row case (port beyond $7000) is explicitly pinned in trench-port-bs-plc.test.ts.

### Rule Compliance

| Rule (lang-review TS + star-wars core-purity) | Instances in diff | Verdict |
|---|---|---|
| 1 — type-safety escapes (`as any`/`!`/casts) | streamForceFields cast; `s.exhaustPort!` in tests | 2 LOW redundant casts (non-blocking); every `!` guarded by `.not.toBeNull()` or spawn-by-construction — compliant |
| 2 — generics/readonly | FORCE_FIELD_SLOT_Y `readonly number[]`; Rng param | compliant (Rng intentionally mutable cursor) |
| 3 — enum exhaustiveness | none (kind via if/ternary, unchanged) | N/A |
| 4 — null/undefined (`||` vs `??`) | none introduced | N/A |
| 5 — module/`import type` | 4 imports split correctly | compliant |
| 8 — test quality | 2 new + 7 migrated suites | compliant (no `as any`, no mock drift) |
| 10/11/12/13 — validation/errors/perf/regression | streamForceFields once-per-entry; loop ~89 bounded | compliant (perf NOTED, within 60fps budget) |
| CORE PURITY (star-wars) — no DOM/time/random; seeded RNG only | 3 local `createRng` cursors | compliant — no non-deterministic call, `s.rng` unmutated (verified) |

### Devil's Advocate

Assume this is broken. The loudest risk: un-clamping the port turns a ~1.8s stub into a ~21s flight, and
a distance that was 28,672 is now 327,680 — a 11.4× jump that could silently break anything that assumed
the port was near. What if a sibling test fired at the freshly-spawned port and now silently misses? That
is exactly the trap; the answer is that the beam-reach GATE (`beamHit(...,TRENCH_FAR)`) is unchanged, so a
too-far shot was ALWAYS clipped — and every port suite that stages a hit does so at −EXHAUST_PORT_DISTANCE,
which was deliberately kept at 28,672 (within reach). The one shell test and the `shotThroughTo` helper
that DID read the real spawn were re-seated (I traced both). What about a confused player who never sees the
fields because they render invisibly? Checked: render.ts:447 draws kind 'catwalk' via TRENCH_CATWALK, so
the streamed fields are visible. What about resource exhaustion — 82 to 228 objects scrolling for 21s at
60fps? The per-frame loop is simple arithmetic with no per-iteration allocation; the rule-checker and
security agent both bounded it as constant-per-pie, and my probe ran a full traversal without hang. What
about a malformed wave — a negative or huge `s.wave`? `romWave0` shifts it, `buildTrench`/`selectPie`
clamp out-of-range to the template rather than throwing, so it degrades, never crashes. What about
determinism — three RNG cursors from one seed? All non-mutating; same seed → same run (pinned by
trench-variation's determinism test). The subtlest doubt: does a streamed field ACTUALLY collide, or is
"kind 'catwalk'" a paper contract? The e2e probe answers it empirically — 22 grazes fired on a real run.
The residual real weaknesses are both LOW and Finding-tracked: two redundant casts, and two overlapping
obstacle systems awaiting the B-017 unification. Nothing rises to Critical or High.

**Deviations:** all 5 (3 TEA + 2 Dev) audited and ACCEPTED — see `### Reviewer (audit)`.
**Handoff:** To SM for finish-story.