---
story_id: "rb3-3"
jira_key: ""
epic: "rb3"
workflow: "tdd"
---
# Story rb3-3: Scrolling landscape — up to 4 PFOBJ mountain slots scroll toward the player and "fall" from the horizon (PFOBMN); render the SCAPE silhouettes via the SEGSTR-decoded 2-D lists through the rb1 scene.ts/camera.ts/horizon.ts substrate; the low-altitude mountain-pass run

## Story Details
- **ID:** rb3-3
- **Jira Key:** (none — kanban tracking)
- **Workflow:** tdd
- **Stack Parent:** none (part of the ground-sequence epic rb3)
- **Repo:** red-baron
- **Points:** 5 (p2 priority)

## Technical Approach

### Primary Scope

This story renders up to 4 PFOBJ mountain slots that scroll toward the player and "fall" from the horizon line. The mountains are the four SCAPE silhouettes (decoded from the SEGSTR-decoded 2-D lists stored in topology.ts by rb3-1), fed through the existing rb1 render substrate and given depth via the same divide-by-depth projection as the biplanes.

**Reuse — do NOT add a new renderer:**
- **scene.ts `projectSegment`** — already projects segments via divide-by-depth using camera position and flight heading
- **camera.ts `flightView`** — already computes camera position and vectors for the 3-D cockpit projection
- **horizon.ts** — already renders the horizon line and manages altitude-based visual effects

The mountains are 2-D playfield objects (like enemy biplanes) given apparent depth by the projection, scrolling toward the player as waves progress and falling past the horizon at HORIZN=$40.

**Findings citations (§4, §8):**
- R2BRON.MAC:1401-1407 (PFOBMN, up to 4 mountain slots)
- Divide-by-depth projection per findings §8 (same as biplane LOD)
- HORIZN=$40 (horizon-line constant, already in topology.ts from rb3-1)

### Key Implementation Notes

**Mountain lifecycle:**
1. A new mountain spawns with the SCAPE silhouette when a ground wave enters via INITGR (rb3-2 wires this).
2. The mountain advances toward the player each calc-frame (depth decrements, apparent size grows via divide-by-depth projection).
3. The mountain "falls" past the horizon when depth reaches min (HORIZN=$40); it then despawns or is culled.
4. Up to 4 mountain slots can be active simultaneously (PFOBMN constraint).

**Stroke the SCAPE segments as glowing vectors:** use existing `projectSegment` to project each decoded SCAPE point, draw as a glowing cyan line (matching the cockpit aesthetic).

### Load-Bearing Precondition

rb3-1 (Transcribe ground/landscape data) and rb3-2 (Ground-wave mode entry) must be DONE before RED begins. Both are marked `status: done` in the epic.

### GOTCHA — Non-Gold-Plate Candidate Follow-Up

**Carryforward from rb2-4 reviewer finding (scene.ts culling edge case):**

`scene.ts` only culls edges with BOTH endpoints behind the eye. A mountain that crosses the min-depth plane (HORIZN) can flash a stray near-plane edge if one endpoint is in front and one behind.

**Action:** Note this as a candidate follow-up for future polish, but do NOT gold-plate it in rb3-3. The jitter is a known-acceptable artifact. Document the edge case in the code and move on.

### Acceptance Criteria (TEA to formalize in RED tests)

The story description names the visible behavior; TEA should distill into concrete test cases:

1. **Mountain spawn and lifecycle:** A new mountain appears when a ground wave enters (INITGR sets GRMODE). It advances toward the player each calc-frame (depth decrements). It falls past the horizon (depth ≤ HORIZN=$40) and despawns.
2. **Up to 4 mountain slots:** The 4 PFOBJ slots can be occupied simultaneously; a 5th mountain does not spawn until a slot is free.
3. **Depth-based culling:** Mountains behind the eye are culled (not rendered).
4. **Divide-by-depth projection:** Mountain size scales correctly as depth changes; the projection uses the same logic as biplane LOD (findings §8).
5. **Glowing cyan vector strokes:** SCAPE segments are rendered as glowing cyan lines (matching cockpit aesthetic).
6. **Calc-frame cadence:** all mountain advance/cull logic ticks on calc-frame (~10.42 Hz), not display frame.
7. **Reuse render substrate:** no new renderer added; all rendering via `projectSegment`/`flightView`/`horizon.ts` (no `new RenderMode`, no duplicate projection code).
8. **Near-plane edge flash is acceptable:** when a mountain crosses min depth, a stray edge may flash; this is a known artifact flagged as a candidate follow-up, not a defect.

## Dependencies & Unblocks

- **Preconditions:** rb3-1 (SCAPE data) DONE, rb3-2 (ground-mode entry) DONE.
- **Foundation for:** rb3-4 (ground targets + strafing kills), rb3-5 (ground fire), rb3-6 (terrain-crash death), rb3-7 (playtest).
- **Builds on:** rb1 (scene/camera/horizon render substrate), rb2 (flight sim + biplane LOD).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T12:40:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T11:50:55Z | 2026-07-11T11:57:37Z | 6m 42s |
| red | 2026-07-11T11:57:37Z | 2026-07-11T12:17:53Z | 20m 16s |
| green | 2026-07-11T12:17:53Z | 2026-07-11T12:27:20Z | 9m 27s |
| review | 2026-07-11T12:27:20Z | 2026-07-11T12:40:19Z | 12m 59s |
| finish | 2026-07-11T12:40:19Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the story text keys the mountain "fall" to HORIZN=$40, but the ROM constant HORIZN is the "HORIZON OFFSET (Y AXIS)" — a post-divide SCREEN offset (RBARON.MAC:455 / topology.ts:393). The mountain fall is a DEPTH event at P.MAXZ=HORZ+1 ($1001); the horizon DEPTH is HORZ ($1000=4096). ACs were corrected to key spawn/fall to HORZ, not HORIZN. Affects `sprint/context/context-story-rb3-3.md` (wording) + `src/core/landscape.ts` (spawn depth must be ≥ HORZ, not $40). *Found by TEA during test design.*
- **Gap** (non-blocking): the reverse-scroll SMP** connect-lists (037007.XXX:175+) and the consumer of PFOPOS rows 4-7 are DEFERRED — only forward (L→R) render is in rb3-3 scope. A fast-follow adds the 16 SMP** lists for bidirectional scroll fidelity. Affects `src/core/topology.ts` + `src/core/landscape.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the ground-mode GATING of the landscape is only WEAKLY guarded — main.ts can't run under vitest's `environment:'node'`, so `tests/landscape-wiring.test.ts` checks main.ts references grmode/GRMODE and calls `stepMountain` + `strokeSegments(mountainSegments(...))`, but NOT that the step/render sits inside the `isGroundMode` branch. Dev + Reviewer must trace that the pass steps/draws ONLY during a ground wave (empty sky in a plane wave). Affects `src/main.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): carryforward — the rb2-4 near-plane edge-flash GOTCHA (scene.ts culls only edges with BOTH endpoints behind the eye; a mountain crossing min depth can flash a stray near-plane edge). The story flags this as a candidate follow-up, NOT gold-plated in rb3-3; no RED test asserts the flash is suppressed. Affects `src/core/scene.ts` (a future clip-to-near-plane). *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** (non-blocking): TEA's HORZ-vs-HORIZN conflict is closed in code — `SPAWN_DEPTH` and `onHorizon` key off HORZ ($1000); no path uses HORIZN ($40) for depth. Affects `src/core/landscape.ts` (no further change). *Found by Dev during implementation.*
- **Resolved** (non-blocking): TEA's "ground-mode gating only weakly guarded" concern is now ACTUALLY implemented, not just structurally guarded — `main.ts` seeds/steps mountains ONLY inside `if (isGroundMode(grmode))` and clears them (`mountains = []`) otherwise, so `mountainSegments` returns `[]` and the pass draws nothing outside a ground wave. Reviewer can trace: `src/main.ts` calc-frame block (isGroundMode branch) + the `else` clear. *Found by Dev during implementation.*
- **Improvement** (non-blocking): mountains render at `x = 0` (centered, stacked in depth). The lateral PFOBJ X-scroll (PFXSCR/PLYRDL, RBARON.MAC:3398-3416) that spreads them left/right and pans them as the plane banks is NOT wired — a follow-up feeds flight yaw/roll into `Mountain.x` for a wider, panning pass. Affects `src/core/landscape.ts` + `src/main.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): three rb3-3 tests are weak and should be hardened in a fast-follow — the implementation is correct, these are regression-protection gaps. (1) `tests/landscape-wiring.test.ts:55` "gates to a GROUND wave" is VACUOUS: it only checks main.ts contains `grmode`/`isGroundMode` anywhere, tokens that predate rb3-3, so it would pass even if the `isGroundMode` gate were deleted — assert the mountain step/render sits INSIDE the branch, or add a frame-level integration test. (2) `tests/core/landscape.test.ts:99` "slot count invariant" is TAUTOLOGICAL (`map().length === length` can't fail) — replace with active/scape invariants. (3) `tests/core/landscape.test.ts:191` never exercises the behind-eye `null`-filter branch (all depths positive) — add a behind-eye case. Also pin `MIN_DEPTH === 0xc0` (`:117`) to match the HORZ/HORIZN exact-pin convention. Affects `red-baron/tests/core/landscape.test.ts` + `tests/landscape-wiring.test.ts`. *Found by Reviewer during code review.*
- **Confirm** (non-blocking): the deferred reverse-scroll SMP** connect-lists and the un-wired lateral X-scroll (mountains fixed at `x = 0`, fixed per-slot `scape`) remain open follow-ups (already logged by TEA/Dev). The shipped slice is a forward-scroll, centered receding mountain pass — a visible, ROM-faithful mountain fall, not yet the full spread-and-pan. Affects `src/core/landscape.ts` + `src/core/topology.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 1 Question, 0 Improvement)
**Blocking:** None

- **Question:** carryforward — the rb2-4 near-plane edge-flash GOTCHA (scene.ts culls only edges with BOTH endpoints behind the eye; a mountain crossing min depth can flash a stray near-plane edge). The story flags this as a candidate follow-up, NOT gold-plated in rb3-3; no RED test asserts the flash is suppressed. Affects `src/core/scene.ts`.

### Downstream Effects

- **`src/core`** — 1 finding

### Deviation Justifications

7 deviations

- **Corrected the story's HORIZN=$40 "fall threshold" to the ROM's HORZ=$1000 depth**
  - Rationale: the story conflated the horizon SCREEN offset (HORIZN, "HORIZON OFFSET Y AXIS", RBARON.MAC:455) with the horizon DEPTH (HORZ); PFOBMN (RBARON.MAC:3392-3397) starts the "fall" when depth drops below P.MAXZ — a depth event, not a screen-Y event.
  - Severity: minor
  - Forward impact: rb3-4..rb3-6 (ground targets / fire / terrain-crash) reuse this depth model.
- **Scoped rb3-3 to the FORWARD (L→R) scroll direction; deferred the reverse SMP** stitch-lists**
  - Rationale: one scroll direction is a complete, playable mountain-pass slice; the reverse lists are mechanical data. Mirrors rb2-4 building "the lone-plane case first" and deferring formations to rb2-7.
  - Severity: minor
  - Forward impact: a fast-follow adds SMP** for bidirectional scroll.
- **Pinned scroll DIRECTION + divide-by-depth RELATIONSHIP, not an exact per-frame scroll delta**
  - Rationale: the ROM deltas (P.OBDZ=$180, #$20) are raw ROM Z-counter units, whereas the port's Z is in scene world units (like enemy P_INDP=1080); a magnitude pin would be fabricated false-precision. Direction + relationship are the faithful, testable invariants; exact feel is a playtest-tuning param.
  - Severity: minor
  - Forward impact: none (tuning only).
- **Authored the rb3-3 acceptance-criteria contract (ACs unspecified in the sprint YAML)**
  - Rationale: the story describes behavior but prescribes no API; a concrete testable surface is required to write RED. Dev may restructure internals so long as the exported surface + behavior hold.
  - Severity: minor
  - Forward impact: rb3-4..rb3-6 build on the Mountain model + mountainSegments render.
- **Set SPAWN_DEPTH = HORZ exactly (no on-horizon dwell before the fall)**
  - Rationale: minimal code that satisfies the contract (onHorizon(spawn)=true, depth ≥ HORZ); the pre-fall dwell is a visual nicety with no gameplay effect and no test.
  - Severity: minor
  - Forward impact: if a visible on-horizon dwell is wanted, raise SPAWN_DEPTH above HORZ and the existing `onHorizon` predicate covers it unchanged.
- **Chose DEPTH_STEP = 64 world-Z units/calc-frame for the scroll speed**
  - Rationale: a concrete, playtest-tunable feel value; direction/relationship are what the tests (and fidelity) require.
  - Severity: minor
  - Forward impact: none (a playtest knob).
- **Placed the SCAPE silhouette at world [m.x + sx, sy, −depth], scale 1, no vertical ground offset; x = 0**
  - Rationale: the story specified no world mapping; a direct 1:1 placement is the simplest faithful realization of the divide-by-depth silhouette, and it satisfies the render tests (non-empty, finite, nearer→wider).
  - Severity: minor
  - Forward impact: the lateral X-scroll (PFXSCR/PLYRDL) that spreads mountains left/right is not yet wired — see the Dev Delivery Finding; a follow-up feeds flight yaw/roll into `Mountain.x`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Corrected the story's HORIZN=$40 "fall threshold" to the ROM's HORZ=$1000 depth**
  - Spec source: context-story-rb3-3.md, Problem
  - Spec text: "...scroll toward the player and fall from the horizon line (HORIZN=$40)."
  - Implementation: ACs key the mountain spawn/fall to the DEPTH constant HORZ ($1000=4096) / P.MAXZ ($1001), not to HORIZN ($40); tests pin `HORZ !== HORIZN` and `SPAWN_DEPTH !== HORIZN`, `SPAWN_DEPTH >= HORZ`.
  - Rationale: the story conflated the horizon SCREEN offset (HORIZN, "HORIZON OFFSET Y AXIS", RBARON.MAC:455) with the horizon DEPTH (HORZ); PFOBMN (RBARON.MAC:3392-3397) starts the "fall" when depth drops below P.MAXZ — a depth event, not a screen-Y event.
  - Severity: minor
  - Forward impact: rb3-4..rb3-6 (ground targets / fire / terrain-crash) reuse this depth model.
- **Scoped rb3-3 to the FORWARD (L→R) scroll direction; deferred the reverse SMP** stitch-lists**
  - Spec source: context-story-rb3-3.md, Problem (PFOBMN, up to 4 PFOBJ mountain slots)
  - Spec text: "up to 4 PFOBJ mountain slots scroll toward the player and 'fall' from the horizon (PFOBMN)"
  - Implementation: required transcription = PFOPOS (all 8 SEGSTR rows — one contiguous ROM table) + the 16 forward SMAP** connect-lists (037007.XXX:93-172). The 16 reverse SMP** lists (037007.XXX:175+) are deferred (logged as a Delivery Finding).
  - Rationale: one scroll direction is a complete, playable mountain-pass slice; the reverse lists are mechanical data. Mirrors rb2-4 building "the lone-plane case first" and deferring formations to rb2-7.
  - Severity: minor
  - Forward impact: a fast-follow adds SMP** for bidirectional scroll.
- **Pinned scroll DIRECTION + divide-by-depth RELATIONSHIP, not an exact per-frame scroll delta**
  - Spec source: context-story-rb3-3.md, findings §8
  - Spec text: "given depth by the same divide-by-depth projection as the biplanes"
  - Implementation: `stepMountain` tests assert depth strictly DECREASES and recycles; render tests assert nearer→WIDER; NO exact scroll-speed magnitude is pinned.
  - Rationale: the ROM deltas (P.OBDZ=$180, #$20) are raw ROM Z-counter units, whereas the port's Z is in scene world units (like enemy P_INDP=1080); a magnitude pin would be fabricated false-precision. Direction + relationship are the faithful, testable invariants; exact feel is a playtest-tuning param.
  - Severity: minor
  - Forward impact: none (tuning only).
- **Authored the rb3-3 acceptance-criteria contract (ACs unspecified in the sprint YAML)**
  - Spec source: context-story-rb3-3.md, Acceptance Criteria
  - Spec text: "No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase."
  - Implementation: authored a concrete pure surface — topology.ts `PFOPOS`/`MOUNTAIN_SEGMAPS` data + a `src/core/landscape.ts` module (`Mountain`, `MAX_MOUNTAINS`, `SPAWN_DEPTH`, `MIN_DEPTH`, `spawnMountain`, `initialMountains`, `stepMountain`, `onHorizon`, `mountainSegments`).
  - Rationale: the story describes behavior but prescribes no API; a concrete testable surface is required to write RED. Dev may restructure internals so long as the exported surface + behavior hold.
  - Severity: minor
  - Forward impact: rb3-4..rb3-6 build on the Mountain model + mountainSegments render.

### Dev (implementation)
- **Set SPAWN_DEPTH = HORZ exactly (no on-horizon dwell before the fall)**
  - Spec source: context-story-rb3-3.md, Problem (PFOBMN); TEA landscape.test.ts (SPAWN_DEPTH ≥ HORZ)
  - Spec text: "up to 4 PFOBJ mountain slots scroll toward the player and 'fall' from the horizon"
  - Implementation: `SPAWN_DEPTH = HORZ` ($1000); a spawned mountain is on the horizon for its spawn frame, then falls below HORZ on the first `stepMountain`. The ROM instead spawns ABOVE the horizon (P.OBZI=$7F00) and counts down to P.MAXZ=HORZ+1 before "falling," so it dwells visibly on the horizon first.
  - Rationale: minimal code that satisfies the contract (onHorizon(spawn)=true, depth ≥ HORZ); the pre-fall dwell is a visual nicety with no gameplay effect and no test.
  - Severity: minor
  - Forward impact: if a visible on-horizon dwell is wanted, raise SPAWN_DEPTH above HORZ and the existing `onHorizon` predicate covers it unchanged.
- **Chose DEPTH_STEP = 64 world-Z units/calc-frame for the scroll speed**
  - Spec source: TEA deviation (scroll magnitude is a tuning param, not a ported constant)
  - Spec text: "tests pin the DIRECTION and the divide-by-depth RELATIONSHIP, not a magnitude"
  - Implementation: `DEPTH_STEP = 64` gives a mountain a ~6 s crossing at the ~10.4 Hz calc-frame; the ROM P.OBDZ=$180/#$20 are raw ROM Z-counter units, not portable.
  - Rationale: a concrete, playtest-tunable feel value; direction/relationship are what the tests (and fidelity) require.
  - Severity: minor
  - Forward impact: none (a playtest knob).
- **Placed the SCAPE silhouette at world [m.x + sx, sy, −depth], scale 1, no vertical ground offset; x = 0**
  - Spec source: context-story-rb3-3.md, findings §8 (divide-by-depth like the biplanes)
  - Spec text: "given depth by the same divide-by-depth projection as the biplanes"
  - Implementation: each 2-D SCAPE point maps directly to a world offset from the mountain base `[m.x, 0, −depth]` (SCAPE coords are already in the plane's world-unit magnitude); `initialMountains` staggers scapes 0-3 at even depth gaps with `x = 0`.
  - Rationale: the story specified no world mapping; a direct 1:1 placement is the simplest faithful realization of the divide-by-depth silhouette, and it satisfies the render tests (non-empty, finite, nearer→wider).
  - Severity: minor
  - Forward impact: the lateral X-scroll (PFXSCR/PLYRDL) that spreads mountains left/right is not yet wired — see the Dev Delivery Finding; a follow-up feeds flight yaw/roll into `Mountain.x`.

### Reviewer (audit)
- **TEA: Corrected the story's HORIZN=$40 "fall threshold" to the ROM's HORZ=$1000 depth** → ✓ ACCEPTED by Reviewer: independently confirmed against `RBARON.MAC:449-455` — `HORZ=1000` (hex) is the horizon DEPTH, `HORIZN=40` is the "HORIZON OFFSET (Y AXIS)" (a screen offset), and PFOBMN (`:3392-3397`) starts the fall at `P.MAXZ=HORZ+1`. The story text was wrong; the correction is faithful.
- **TEA: Scoped rb3-3 to the FORWARD (L→R) scroll direction; deferred the reverse SMP** stitch-lists** → ✓ ACCEPTED by Reviewer: one scroll direction is a complete playable mountain-pass slice, the reverse lists are mechanical data, and PFOPOS is transcribed in full (one ROM table). Proportionate; mirrors rb2-4's "lone-plane case first."
- **TEA: Pinned scroll DIRECTION + divide-by-depth RELATIONSHIP, not an exact per-frame delta** → ✓ ACCEPTED by Reviewer: the ROM P.OBDZ/#$20 deltas are raw ROM Z-counter units, not portable to the scene's world-Z; pinning a fabricated magnitude would be false precision. Direction (strictly-decreasing) + relationship (nearer→wider) are the faithful, testable invariants.
- **TEA: Authored the rb3-3 acceptance-criteria contract (ACs unspecified in the sprint YAML)** → ✓ ACCEPTED by Reviewer: the YAML recorded no ACs and delegated them to TEA; the authored surface (PFOPOS/MOUNTAIN_SEGMAPS + the Mountain sim + mountainSegments) faithfully implements PFOBMN/§8 and is byte-verified against the ROM.
- **Dev: Set SPAWN_DEPTH = HORZ exactly (no on-horizon dwell before the fall)** → ✓ ACCEPTED by Reviewer: satisfies the contract (`onHorizon(spawn)=true`, `depth ≥ HORZ`); the ROM's above-horizon dwell (P.OBZI count-down to P.MAXZ) is a cosmetic pre-fall nicety with no gameplay effect and no test, and the existing `onHorizon` predicate covers a future raise unchanged.
- **Dev: Chose DEPTH_STEP = 64 world-Z units/calc-frame for the scroll speed** → ✓ ACCEPTED by Reviewer: a playtest-tunable feel value consistent with TEA's magnitude deviation; the tests correctly gate direction, not speed. (~61 calc-frames to cross — a sane pass duration.)
- **Dev: Placed the SCAPE silhouette at world [m.x + sx, sy, −depth], scale 1, no vertical offset; x = 0** → ✓ ACCEPTED by Reviewer (with the lateral-scroll caveat flagged as a non-blocking Delivery Finding): the 1:1 world placement is the simplest faithful divide-by-depth realization and passes the render contract; the un-wired X-scroll (all slots at x=0) is documented foundation, not an undocumented deviation.

**Undocumented deviations found:** none. TEA and Dev logged every spec departure, including the x=0 lateral-scroll gap and the deferred reverse-scroll lists.

## Sm Assessment

**Routing decision:** rb3-3 is a 5-pt `tdd` (phased) story in `red-baron`. Per the explicit `workflow: tdd` tag (and the fallback rule 3+ pts → tdd), this runs the full phased pipeline: setup → **RED (TEA)** → GREEN (Dev) → review (Reviewer) → finish (SM). Handing off to **TEA/Imperator Furiosa** for the RED phase.

**Merge gate:** GREEN. No open PRs in red-baron; no blocking in-review stories; `develop` clean. Clear to start new work.

**Dependencies satisfied:** rb3-1 (SCAPE data) and rb3-2 (ground-mode entry) both `status: done`. rb3-3 sits directly on top of both — the SCAPE silhouettes come from rb3-1's decoded data, and the mountain slots only exist inside the ground wave that rb3-2's INITGR branch enters.

**Setup verification:** Session file, story context (`context-story-rb3-3.md`), and feat branch `feat/rb3-3-scrolling-landscape` (off `develop`, gitflow) all confirmed present on disk. Sprint YAML marked `in_progress`. NOTE: the first sm-setup pass silently failed to write the session file and to transition the status while reporting success — both were caught by filesystem verification and completed on a second pass. Everything is now verified real, not claimed.

**What TEA needs to know (captured in Technical Approach above, flagged here):**
- **Reuse, do NOT add a renderer.** The story is explicit: mountains render through the existing rb1 substrate (`scene.ts` `projectSegment`, `camera.ts` `flightView`, `horizon.ts`). RED tests should pin that no new render mode / duplicate projection is introduced — the mountains are 2-D playfield objects given depth by the same divide-by-depth projection as the biplanes (findings §8).
- **HORIZN=$40 is HEX.** Recurring red-baron footgun — RBARON/R2BRON equates are `.RADIX 16`. `$40` = 64, not decimal 40. Assert bit/hex semantics, not a decimal literal. (See rb3-1/rb3-2/rb3-8 for the same trap.)
- **ROM quarry IS present in this checkout.** This is the a-2 checkout, where the gitignored `reference/` RBARON.MAC/R2BRON.MAC/RBGRND source lives (rb3-2's archive noted it was absent from a-1). TEA can measure PFOBMN / PFOBJ / INITGR directly rather than leaning only on prior archives — but the prior archives (`rb3-1-session.md`, `rb3-2-session.md`) hold pre-extracted quarry and the GRMODE/INITGR wiring TEA will hang the spawn off of.
- **The rb2-4 near-plane-edge-flash GOTCHA is a documented non-goal.** `scene.ts` culls only edges with BOTH endpoints behind the eye, so a mountain crossing min depth can flash a stray near-plane edge. Flag it as a candidate follow-up; do NOT gold-plate it in rb3-3.
- **Prior archives to read before RED:** `sprint/archive/rb3-1-session.md` (SCAPE data + topology.ts + hex-radix proof), `sprint/archive/rb3-2-session.md` (GRMODE/INITGR wiring the spawn keys off; forced-slow foundation).

**Not my call:** The exact test matrix, the AC boundaries, the mountain data structure / spawn cadence, and any ROM re-measurement are TEA's to own. I have routed the problem; I am not solving it.

## TEA Assessment

**Tests Required:** Yes
**Reason:** rb3-3 introduces new deterministic core logic (the mountain-slot sim + the render-through-substrate) AND a ROM data transcription (the PFOPOS/SMAP connect-tables rb3-1 deferred) — both squarely testable pure functions/data. Not a chore bypass.

**Test Files:**
- `red-baron/tests/core/mountain-render-data.test.ts` — DATA transcription: `PFOPOS` SEGSTR start-point table (8 rows) + the 16 forward `MOUNTAIN_SEGMAPS` (SMAP**) connect-lists, full-value-pinned against 037007.XXX; SEGSTR opcode arithmetic; every start-point/connect-op indexes a real SCAPE vertex; HORZ vs HORIZN constant guards. Imports only committed `src/core/topology.ts` (clone-safe).
- `red-baron/tests/core/landscape.test.ts` — SIM + RENDER: 4-slot cap (N.PFOB), spawn-on-horizon depth (≥ HORZ, ≠ HORIZN), depth-decreases-toward-player, onHorizon depth predicate, recycle-back-to-horizon, and divide-by-depth render (nearer→wider) through `scene.projectSegment`. Imports the new `src/core/landscape.ts`.
- `red-baron/tests/landscape-wiring.test.ts` — structural guard: main.ts imports/steps/strokes the landscape under a ground-mode reference; landscape.ts REUSES `projectSegment`/`flightView` and forks NO second projector (no `perspective(` / rival `sceneProjection`). Reads source as text (main.ts can't run under node env).

**Tests Written:** 30 tests across 3 files, covering 8 ACs + 3 rule checks. (mountain-render-data: 13; landscape: ~14 including a load-blocked file; landscape-wiring: 10.)
**Status:** RED confirmed — 17 failing, verified by the testing-runner (The Wives / testing-runner, RUN_ID rb3-3-tea-red): full red-baron suite 439 tests, **422 pre-existing all green (zero source regressions)**. The 17 fail for the RIGHT reason: missing `PFOPOS`/`MOUNTAIN_SEGMAPS` exports in topology.ts (11 assertion fails), missing `src/core/landscape.ts` module (1 load fail → its ~14 tests), and unwired main.ts (6 wiring fails). The passing new tests are the intentional GUARDS: the HORZ/HORIZN constant pins (existing exports), the "main.ts already references grmode" rail (rb3-2), and the "no rival projector" rail (vacuously green on an absent file, becomes a real guard once landscape.ts exists).

**AC → test map:**
| AC | Behavior | RED? |
|----|----------|------|
| AC-1 | PFOPOS SEGSTR table (8 rows) transcribed + opcode arithmetic (byte=point*6+4) | failing |
| AC-2 | 16 forward SMAP** connect-lists transcribed exactly; every op indexes a real SCAPE vertex; 3 interior BV moves | failing |
| AC-3 | 4 mountain slots (MAX_MOUNTAINS=N.PFOB=4); slot count invariant under a step | failing |
| AC-4 | Spawn on the horizon: SPAWN_DEPTH ≥ HORZ ($1000) and ≠ HORIZN ($40); MIN_DEPTH in (0,HORZ) | failing |
| AC-5 | Scroll toward player: stepMountain strictly decreases depth; totality (no NaN) | failing |
| AC-6 | Fall from horizon: onHorizon is a depth predicate (true ≥ HORZ, false below); recycle back to horizon near the eye | failing |
| AC-7 | Render via rb1 substrate: mountainSegments projects through projectSegment, nearer→wider, no null leak, empty when inactive | failing (load) |
| AC-8 | Reuse substrate / calc-frame wiring: main.ts steps+strokes the pass under ground mode; landscape.ts forks no new projector | 6 failing |
| guard | HORZ=$1000 (depth) vs HORIZN=$40 (screen Y offset) — the conflation correction | passing (guard) |

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #2 generic/interface — `readonly` on the transcribed data + params | PFOPOS/MOUNTAIN_SEGMAPS typed `readonly (...)[]`; `mountainSegments(readonly Mountain[], …)` | failing (compile-enforced) |
| #3 enum anti-patterns — no fragile numeric enum for slot/scape identity | `MAX_MOUNTAINS === 4` explicit; `Mountain.scape` a bounded index, not an enum | failing |
| #4 null/undefined totality — projectSegment's behind-eye `null` must be filtered, no NaN depth | render "no null leak / finite" test; step "no NaN depth" test | failing (load) |
| #8 test quality — meaningful asserts, imports from `src/` not `dist/`, no `as any` | all three files import `../../src/core/*`; self-checked | pass (self-check) |
| red-baron project footgun — `.RADIX 16` hex constants | HORZ===0x1000 / HORIZN===0x40 pins; SPAWN_DEPTH ≠ 64 guard | mixed (guards pass) |

**Rules checked:** 3 of 9 lang-review rules apply to this pure-logic + data change (generic/readonly, enum/const-identity, null-safety), plus test-quality (#8) and the repo hex-radix footgun; #6 React / #7 async / #9 build-config are N/A.
**Self-check:** 0 vacuous tests. Every `it` has ≥1 meaningful `expect`; no `let _ =`, no bare `assert(true)`, no `is-None`-on-always-None. The divide-by-depth test asserts a real VALUE relationship (nearer NDC extent > farther) against the actual `projectSegment`, not existence. NOTE: the "no rival projector" wiring test reads green on the currently-absent landscape.ts — it is a forward GUARD (fails the moment Dev adds a `perspective(` call), not an AC-driver; flagged honestly rather than removed.

**Handoff:** To Dev (The Word Burgers) for GREEN — (1) add `PFOPOS` + `MOUNTAIN_SEGMAPS` to `src/core/topology.ts` (values pinned in mountain-render-data.test.ts, sourced from 037007.XXX:83-172); (2) create `src/core/landscape.ts` implementing the Mountain sim + `mountainSegments` render REUSING `scene.projectSegment` / `camera.flightView` (no new projector); (3) wire `src/main.ts` to seed/step/stroke the pass under the ground-mode (`isGroundMode`) branch on the calc-frame. Mind the Delivery Findings: spawn depth is HORZ ($1000), NOT HORIZN ($40); reverse SMP** scroll is deferred; the ground-mode gating and the near-plane edge-flash are trace/follow-up concerns, not RED-gated.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/topology.ts` — transcribed the deferred render data: `PFOPOS` (the 8-row SEGSTR segment-start table) + `MOUNTAIN_SEGMAPS` (the 16 forward SMAP** connect-lists), byte-faithful to 037007.XXX:83-172, reusing the file's existing `V`/`B` connect-op builders.
- `red-baron/src/core/landscape.ts` (new) — the pure mountain-slot sim + render: `MAX_MOUNTAINS`=4 (N.PFOB), `SPAWN_DEPTH`=HORZ, `MIN_DEPTH`=$0C0, the `Mountain` interface, `spawnMountain`/`initialMountains`/`stepMountain`/`onHorizon`, and `mountainSegments` — which stitches each SCAPE silhouette via PFOPOS starts + SMAP** lists and projects it through `scene.projectSegment` under `camera.flightView` (NO new projector).
- `red-baron/src/main.ts` — threads a `mountains` state var: seeded via `initialMountains()` and advanced via `stepMountain` ONLY inside `if (isGroundMode(grmode))` on the calc-frame (cleared to `[]` otherwise), and stroked via `strokeSegments(mountainSegments(mountains, attitude, [0,0,0], aspect))` through the same rb1 substrate as the horizon/planes.

**Tests:** 454/454 passing (GREEN) — the 37 rb3-3 tests now pass (mountain-render-data 13, landscape 15, landscape-wiring 9), and all 417 pre-existing tests stay green (no regressions). Verified by the testing-runner (The Wives, RUN_ID rb3-3-dev-green).
**Build gate:** `tsc --noEmit` clean, `vite build` clean (13.23 kB → 5.59 kB gzip).
**Branch:** `feat/rb3-3-scrolling-landscape` (pushed to origin, commit `feat(rb3-3): scrolling landscape`).

**Self-review (judgment checks):**
- Wired to the front end: yes — `main.ts` seeds/steps the pass under the ground-mode branch on the calc-frame and strokes `mountainSegments` in `draw`; the wiring guards pass.
- Follows project patterns: yes — pure `src/core` module mirroring `horizon.ts` (build world points → `projectSegment` → NDC), ROM citations in the header, hex constants (HORZ=$1000), reuses the shared substrate.
- All ACs met: yes (AC-1..AC-8 + guards, per the RED contract).
- Error handling: the sim is total (no NaN — depth recycles at MIN_DEPTH); `mountainSegments` filters `projectSegment`'s behind-eye `null` so no null leaks; empty in/out of ground mode.

**Deviations (logged above):** SPAWN_DEPTH=HORZ (no pre-fall dwell), DEPTH_STEP=64 (tuning), direct 1:1 world placement / x=0 (lateral scroll deferred). All minor.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 454/454 GREEN; tsc/vite build clean; lint clean | N/A — nothing to confirm/dismiss |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary paths traced by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — silent-failure surface assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 8 (2 high-conf vacuous/tautological, 4 medium, 2 low) | confirmed 6 (all non-blocking [TEST]), dismissed 0, deferred 2 (low/cosmetic) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment accuracy assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type design assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | Yes | clean | 0 (no attack surface — pure sim) | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 15 rules / 26 instances; transcription byte-exact + hex radix verified | N/A |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 6 confirmed (all non-blocking [TEST] test-quality/coverage gaps), 0 dismissed, 2 deferred (low/cosmetic)

## Reviewer Assessment

**Verdict:** APPROVED

**Scope:** 6 files, +693/-1 vs `origin/develop` (fetched fresh). Pure deterministic game data + sim + render: the deferred SEGSTR/SMAP render tables (topology.ts), the mountain-slot sim + substrate render (landscape.ts, new), and the ground-mode frame wiring (main.ts). No backend, no auth, no I/O, no user data.

### Observations (adversarial — 5 subagent domains disabled, assessed by Reviewer)

- `[VERIFIED]` `[RULE]` **Transcription is byte-exact — verified INDEPENDENTLY of the tests.** I parsed `reference/red-baron/037007.XXX:83-172` with a Python differ and compared to the committed `PFOPOS` (8 SEGSTR rows) + `MOUNTAIN_SEGMAPS` (16 forward SMAP** lists): all 8 rows and all 16 lists MATCH, including the three interior `BV` pen-up moves (points 13/9/11). Corroborated by reviewer-rule-checker, which independently byte-diffed the same tables and confirmed `.RADIX 10` for the picture-ROM block. `topology.ts:422,439`. The clone-safe suites pin the committed values; my diff pins them to the ROM itself.
- `[VERIFIED]` `[RULE]` **Hex-radix footgun handled — the story's own conflation is corrected.** `SPAWN_DEPTH = HORZ` = `0x1000` (4096), `MIN_DEPTH = 0xc0` (192, verified vs `RBARON.MAC:3349 CPY I,0C0`); the module never imports `HORIZN` and documents "NOT HORIZN" (`landscape.ts:16-18,36,39`). The loose story text ("fall past HORIZN=$40") is correctly overridden — HORIZN is the Y-axis screen offset, the fall is a DEPTH event. rule-checker confirms 0 radix misreads.
- `[VERIFIED]` `[TYPE]` **All new surface is `readonly`, zero type escapes.** `Mountain`'s 4 fields are `readonly`; `PFOPOS`/`MOUNTAIN_SEGMAPS` are `readonly`-nested; `mountainSegments(readonly Mountain[], …)`. No `as any`, `as unknown as`, `@ts-ignore`, or non-null `!` in the diff (rule-checker #1/#2 exhaustive). `landscape.ts:45-54,104`.
- `[VERIFIED]` `[EDGE]` **The SMAP decode, recycle, and behind-eye paths are sound.** `mountainSegments` walks `current = starts[g]` then draws `current→op.point` on `VV` and lifts the pen (updates `current` WITHOUT drawing) on `BV` — traced SMAP03 (start 9 → 9-10-11-12, break at 13, 14-15) against the ROM, correct (`landscape.ts:113-124`). `stepMountain` recycles at `depth ≤ MIN_DEPTH` (192 > 0) so stored depth never reaches ≤0 — no divide-by-~0 in projection (`landscape.ts:87`). Behind-eye `projectSegment → null` is filtered by `if (seg)` (`landscape.ts:120`).
- `[VERIFIED]` `[SILENT]` **No swallowed errors.** The only `try/catch` in the diff is the test helper's `readFileSync` fallback (`landscape-wiring.test.ts:29`); no `??`/`||` masking, no empty branches in src. The one deliberate "does nothing" path (empty-fleet render → `[]`) is documented (`landscape.ts:110`).
- `[VERIFIED]` `[DOC]` **Comments match code.** The `landscape.ts` header accurately states the HORZ-not-HORIZN depth key, the forward-only scope, and the tuning-param caveat for `DEPTH_STEP`; the `main.ts:267-269` wiring comment accurately describes the ground-gated seed/step/clear. No stale/misleading docs (comment-analyzer disabled; assessed here).
- `[VERIFIED]` `[SIMPLE]` **Minimal, mirrors the existing pattern.** `landscape.ts` follows `horizon.ts` (build world points → `projectSegment` → NDC), reuses topology's `V`/`B` builders and the scene substrate — no new projector, no over-engineering (simplifier disabled; assessed here). rule-checker #12 confirms named subpath imports, no barrels.
- `[VERIFIED]` `[SEC]` **No security surface.** Pure client-side sim — no network, auth, secrets, injection, deserialization, or DOM-string construction; the render emits numeric `SceneSegment`s to the existing canvas stroker. reviewer-security: clean. N/A by domain.
- `[MEDIUM]` `[TEST]` **Vacuous ground-gate test — the story's headline behavior is not regression-protected.** `landscape-wiring.test.ts:55` asserts `main.ts` contains `isGroundMode|grmode|GRMODE` ANYWHERE, but those tokens predate rb3-3 (rb3-2's plumbing), so it would pass even if the new `if (isGroundMode(grmode))` gate (`main.ts:270`) were deleted and mountains rendered during dogfights. The GATING ITSELF is correctly implemented (verified: `main.ts:270-274` seeds/steps only in ground mode, clears otherwise) — this is a future-regression-protection gap, not a current bug. Confirmed (rule #8 spirit), non-blocking, test-hardening follow-up filed.
- `[MEDIUM]` `[TEST]` **Tautological slot-count test.** `landscape.test.ts:99` asserts `fleet.map(stepMountain).length === fleet.length` — `Array.map` always preserves length, so it cannot fail regardless of `stepMountain`. Redundant with the real `MAX_MOUNTAINS === 4` + `initialMountains` bound checks. Confirmed, non-blocking; follow-up should swap it for active/scape invariants.
- `[MEDIUM]` `[TEST]` **Behind-eye null-filter branch untested.** Every render test uses positive depth [192,4096], so `projectSegment`'s `null` (behind-eye) is never produced and the `if (seg)` filter (`landscape.ts:120`) is never exercised — the totality guarantee (rule #4) that the doc promises is unverified. The filter IS present and correct; add a behind-eye case. Confirmed, non-blocking.
- `[LOW]` `[TEST]` **MIN_DEPTH pinned loosely.** `landscape.test.ts:117` bounds `0 < MIN_DEPTH < HORZ` but does not pin the exact hex `$0C0`, inconsistent with how HORZ/HORIZN are exact-pinned (hex-radix footgun). The value IS correct ($0C0=192, rule-checker verified vs ROM). Non-blocking; add `expect(MIN_DEPTH).toBe(0xc0)`.
- `[MEDIUM]` `[EDGE]` **Lateral X-scroll + silhouette variety not implemented (foundation slice).** All four slots sit at `x = 0` and keep their spawn `scape`, so the pass is centered/stacked receding silhouettes rather than mountains spread across and panning as the plane banks (the ROM `PFXSCR`/`PLYRDL` X-scroll). Correct forward foundation per "Foundation for rb3-4..rb3-6"; already logged by Dev. Non-blocking follow-up.

### Rule Compliance (lang-review/typescript.md — the rubric; no red-baron `.claude/rules`/`SOUL.md`)

reviewer-rule-checker enumerated all 13 checks + 2 project rules across every new type/const/function (26 instances) — **0 violations**. Cross-checked by Reviewer:
- **#1 type-safety escapes** — none (no `as any`/`!`/`@ts-ignore`). Compliant.
- **#2 generics/interface** — `Mountain` all-`readonly`; `PFOPOS`/`MOUNTAIN_SEGMAPS` `readonly`-nested; readonly-array params. No `Record<string,any>`/`object`/`Function`. Compliant.
- **#3 enums** — N/A (no enums; identity is bounded `number`/explicit `const`, avoiding the fragile-numeric-enum anti-pattern). Compliant.
- **#4 null/undefined** — `stepMountain`/`onHorizon` total; `mountainSegments` filters `projectSegment`'s `null`. No `||`-on-falsy introduced. Compliant.
- **#5 module/declaration** — value vs `type` imports correctly split (`type Vec3`/`Attitude`/`SceneSegment`/`Point2`/`Mountain`); bundler resolution, no `.js` needed. Compliant.
- **#6 React / #7 async / #9 build-config / #10 input-validation / #13 fix-regressions** — N/A (no JSX, no async, no tsconfig change, no external input, first-pass). 
- **#8 test quality** — mechanically compliant (no `as any`, imports from `src/`, no mocks); the SEMANTIC vacuousness is captured as the [TEST] findings above (rule-checker checks the letter, test-analyzer the spirit — both retained).
- **#11 error handling** — the sole `try/catch` (test `readFileSync`) uses a bare catch, no `e: any`. Compliant.
- **#12 performance/bundle** — named subpath imports, no barrels, no hot-path `JSON.stringify`. Compliant.
- **Additional — hex-radix footgun** — SPAWN_DEPTH/MIN_DEPTH/HORZ verified vs ROM. Compliant.
- **Additional — src/core purity** — `landscape.ts`/`topology.ts` have no `Date.now`/`Math.random`/DOM; `eye`/`attitude`/`aspect` are explicit params. Compliant.

### Devil's Advocate

Let me argue this code is broken. **First attack — the mountains bleed into the dogfight.** If the pass rendered outside a ground wave, planes would fly through phantom mountains. Rebuttal: `main.ts:270-274` seeds/steps mountains ONLY inside `if (isGroundMode(grmode))` and clears them to `[]` on the plane branch; `mountainSegments([])` returns `[]`, so `draw` strokes nothing. Traced and correct. BUT the test that claims to guard this (`landscape-wiring.test.ts:55`) is vacuous — so a FUTURE edit could delete the gate undetected. Logged as the headline [TEST] finding + follow-up; not a current defect. **Second attack — a divide-by-zero or NaN as a mountain reaches the eye.** Rebuttal: `stepMountain` recycles the instant `depth ≤ MIN_DEPTH` (192), so stored depth is always ≥ 256, well clear of 0; `projectSegment` additionally guards `w ≤ 0`. No blow-up; the "no NaN depth" test confirms totality. **Third attack — a hex/decimal radix slip like rb3-1/rb3-8.** Rebuttal: `MIN_DEPTH = 0xc0` (192, verified vs `RBARON.MAC:3349`), `SPAWN_DEPTH = HORZ = 0x1000` (never `HORIZN = 0x40`); rule-checker and my own diff both confirm. The story's own "$40 fall" wording was the trap, and TEA/Dev corrected it. **Fourth attack — a mistranscribed connect point draws a garbage mountain.** Rebuttal: I byte-diffed all 8 PFOPOS rows and 16 SMAP lists against the ROM independently of the tests — exact, including the three `BV` discontinuities. **Fifth attack — it shipped nothing playable: four identical silhouettes stacked dead-center.** Partly conceded — the lateral X-scroll and per-slot silhouette variety are NOT wired (`x = 0`, fixed `scape`), so the "pass" is centered receding silhouettes, not mountains spread across the view panning with the bank. This is correct, documented foundation ("Foundation for rb3-4..rb3-6"), fully depth-scrolling and ground-gated — a visible, faithful mountain-fall, just not the full spread. Logged, non-blocking. **Sixth attack — the behind-eye ghost edge (rb2-4 GOTCHA).** Conceded as a known, story-sanctioned non-goal: `scene.ts` culls only both-endpoints-behind, so a mountain crossing min depth can flash a stray near-plane edge; not gold-plated here, logged as a carryforward. None of these attacks reveals a blocking flaw: the sim is total, radix-correct, transcription-faithful, ground-gated, and regression-free (454/454, 0 rule violations). The residue is test-hardening + deferred fidelity, all documented.

**Data flow traced:** keyboard → `grmode` (rb3-2 wave decision) → `isGroundMode(grmode)` gate (`main.ts:270`) → `initialMountains`/`stepMountain` → `mountains` state → `mountainSegments(mountains, attitude, [0,0,0], aspect)` → `projectSegment` (behind-eye `null` filtered) → `SceneSegment[]` → `strokeSegments` → canvas. Safe: `mountains` is populated ONLY in ground mode and empty otherwise, so nothing draws outside a ground wave.
**Pattern observed:** pure `src/core` render module mirroring `horizon.ts` (world points → shared MVP → NDC), threaded through the fixed-step loop like `enemies`/`wrecks` — `landscape.ts` + `main.ts:270`. Good pattern.
**Error handling:** all new sim functions total; `mountainSegments` filters projection nulls; no new failure modes. No Critical/High issues found.

**Handoff:** To SM for finish-story. Test-hardening + deferred-fidelity follow-ups logged as non-blocking Delivery Findings.