---
story_id: "12-1"
jira_key: ""
epic: "12"
workflow: "tdd"
---
# Story 12-1: Rim-anchored ROM CURSOR claw (replace depth-projected walker)

## Story Details
- **ID:** 12-1
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Sm Assessment

**Setup:** Complete. Story 12-1 scaffolded and ready for RED.

- **Session:** `.session/12-1-session.md` (this file), phase `setup`.
- **Context:** `sprint/context/context-story-12-1.md` — carries Emmanuel Goldstein's (Architect) full design PLUS the expanded byte-exact scope chosen by the boss: problem/root-cause (10-12 perspective divide stretched the depth-anchored claw ~2.5×), the rim-anchored fixed-size fix (pure `core/geometry` transform), AND transcription of the authentic ROM CURSOR shapes NCRS1–8 with per-lane re-roll. 8 acceptance criteria.
- **Branch:** `feat/12-1-rim-anchored-claw` off `develop@c3d9ee4` (tempest, gitflow).
- **Sizing:** 5 pts (raised from 3 when scope expanded to byte-exact NCRS1–8).
- **Jira:** integration disabled → claim skipped (no key).

**Coordination notes for downstream (TEA/Dev):**
- Authoritative shape data is NOT checked in — it must be fetched from the public disassembly `charlesUnixPro/Tempest-Source-Code` `tempest.a65`: `_pv_t3` graphics 1–8 (l.14368–14463) and selection logic `draw_player` (l.12954–12972). Graphic 0 of that table is the flipper bowtie, already transcribed in `docs/ux/2026-06-27-enemy-roster-rom-extract.md` §A as a `pv_draw dx,dy` template. Cross-check against book §8 (NCRS1/4/8) in `docs/tempest-1981-source-findings.md`.
- **Do NOT touch `drawWarp`** (render.ts ~846) — the dive claw is intentionally depth-projected.
- `render.ts` was just modified by 10-15 (PR #77, Superzapper well-flash) — keep an eye on that region when rewriting `drawPlayer`.

**Housekeeping:** the earlier `FINISH_STATE` for 10-3 was a stale false alarm — 10-3 is already `done`/archived (PR #75 merged); its vestigial local session was moved to scratchpad so this checkout's active session is unambiguously 12-1. The empty `sprint/archive/10-3-session.md` can be backfilled from scratchpad later (needs a `main` commit — deferred until asked).

**Route:** → TEA (O'Brien) for RED phase (write failing tests).

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-01T11:12:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-01T10:14:40+00:00 | 2026-07-01T10:31:00Z | 16m 20s |
| red | 2026-07-01T10:31:00Z | 2026-07-01T10:52:49Z | 21m 49s |
| green | 2026-07-01T10:52:49Z | 2026-07-01T11:12:35Z | 19m 46s |
| review | 2026-07-01T11:12:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Question** (non-blocking): The authoritative claw shape table (`_pv_t3` graphics 1–8) and the roll→graphic selection (`draw_player`, tempest.a65 l.12954–12972) are NOT checked in — Dev must fetch them from `charlesUnixPro/Tempest-Source-Code`. The byte-exact test oracle uses the OCR-prone book §8 NCRS1/4/8. Affects `tests/shell/glyphs.test.ts` (oracle constants `NCRS1/4/8_ROM_DELTAS`) and `src/shell/glyphs.ts` (the 8-shape table) — if the disassembly disagrees with the book, the disassembly is authoritative and the oracle constants must be updated. *Found by TEA during test design.*
- **Gap** (non-blocking): AC-8's exact per-lane roll indices are unspecified in the story (deferred to `draw_player`, not checked in), so the mapping is tested by invariant (bounded integer [0,8), pure, ≥4 distinct rolls per revolution, closed-tube wrap, open-sheet clamp) rather than enumerated indices. Affects `src/core/geometry.ts` (`clawTransform` roll mapping — Dev derives the exact indices from the disassembly; Reviewer verifies). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-5's "the game runs / visual check" is inherently a shell-render check, not unit-testable; I guard `drawWarp` as unchanged (presence + its far→near depth-dive) but the muzzle-inward orientation and on-screen look need `npm run dev` + `src/tools/contactSheet.ts`. Affects `src/shell/render.ts` (`drawPlayer`) — Dev/Reviewer must run the visual check before merge. *Found by TEA during test design.*

### Dev (implementation)
- **Resolved (was TEA's Question)** (non-blocking): fetched the authoritative `tempest.a65` (`charlesUnixPro/Tempest-Source-Code`) and transcribed all 8 `_pv_t3` claw graphics byte-exact into `src/shell/glyphs.ts`. Graphics **1/4/8 match the book §8 NCRS1/4/8 exactly**, so TEA's oracle constants need NO update — the OCR-caveat risk did not materialise. Graphic 8's leading `pv_move 3,1` confirms TEA's "MOVE + 8-vector loop" reading. *Found by Dev during implementation.*
- **Question** (non-blocking): the AC-5 visual check did NOT run locally — port 5273 is held by another checkout (the live arcade) and `strictPort` blocks a second bind; disrupting the running arcade was inappropriate. `tsc --noEmit`, `vite build`, and 802/802 tests all pass. Affects `src/shell/render.ts` (`drawPlayer` claw orientation/size) — Reviewer should serve THIS checkout (`just serve` from the orchestrator, or stop the other server) and eyeball the claw's inward orientation + ~18% footprint on `models.html`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **AC-1 "muzzle points inward" is not unit-asserted**
  - Spec source: context-story-12-1.md, AC-1 / Technical Approach
  - Spec text: "rotation = so the glyph muzzle points INWARD (−radial toward the tube center), matching the NCRS per-lane roll."
  - Implementation: `clawTransform.rotation` is asserted finite only; muzzle-inward orientation is left to shape-selection (`roll`) plus the AC-5 visual check.
  - Rationale: "muzzle points inward" is a rendered-composite property (glyph × rotation × roll on canvas), not cleanly unit-testable; the story itself says rotation "may reduce to fine-alignment or zero," so hard-asserting a specific rotation would contradict the spec.
  - Severity: minor
  - Forward impact: Reviewer + AC-5 visual check (`npm run dev` / contactSheet) confirm the muzzle points inward.
- **AC-8 per-lane roll indices tested by invariant, not enumeration**
  - Spec source: context-story-12-1.md, AC-8
  - Spec text: "playerClawGlyph(roll) selects the correct authentic shape per lane (roll→graphic mapping derived from draw_player l.12954–12972) ... pure and unit-tested (correct index per lane, closed-tube wrap and open-sheet clamp)."
  - Implementation: mapping tested via invariants (bounded [0,8), pure, ≥4 distinct rolls per revolution, closed wrap, open clamp) rather than asserting the exact graphic index for each lane.
  - Rationale: the authoritative `draw_player` selection table is not checked in; enumerating expected indices would require guessing the ROM quantization — fabricating the oracle. Invariants enforce the observable spec without inventing data.
  - Severity: minor
  - Forward impact: Dev transcribes the exact mapping from the disassembly; Reviewer verifies enumerated indices against `draw_player`.
- **AC-7 NCRS8 oracle read as MOVE + 8-vector drawn loop**
  - Spec source: context-story-12-1.md, AC-7; docs/tempest-1981-source-findings.md §8
  - Spec text: "assert the transcribed deltas for graphics 1/4/8 match the book §8 samples (NCRS1/NCRS4/NCRS8) ... each chain closes (deltas sum to 0,0)."
  - Implementation: NCRS8's book listing opens with a 3-component `3,1,0`; read as a beam-off MOVE to (3,1) preceding the 8-vector DRAWN loop, which is asserted (and closes). NCRS1/NCRS4 are asserted as their literal 8-vector book chains.
  - Rationale: a 3-component entry is not one drawable polyline vector; the move-then-loop reading yields a closed 8-segment silhouette consistent with graphics 1–7. The book carries OCR caveats.
  - Severity: minor
  - Forward impact: Dev confirms graphic-8's true vector count against `_pv_t3` graphic 8 in the disassembly; if it is a genuine 9-vector drawn shape, `NCRS8_ROM_DRAWN_DELTAS` and its test update.

### Dev (implementation)
- **Corrected TEA's two re-roll tests to sweep sub-lane MOTION (authentic draw_player mapping)**
  - Spec source: tests/core/geometry.claw-transform.test.ts (TEA's two re-roll tests); context-story-12-1.md AC-8
  - Spec text: TEA sampled integer lanes 0..15 expecting "≥4 distinct rolls per revolution"; AC-8: "roll→graphic mapping derived from `draw_player` l.12954–12972 ... visibly re-rolls as the player rotates."
  - Implementation: fetched the authoritative `tempest.a65` `draw_player` — `graphic = ((player_position >> 1) & 7) + 1`. player_position's TOP nibble is the segment (movement code masks it off with 4× `lsr`), so `& 7` cancels it: the roll depends ONLY on the sub-segment "fine" position — the claw tumbles through all 8 shapes as it crosses ONE segment, independent of which segment. At integer lanes fine=0 → roll 0, so TEA's integer-lane sampling saw a single shape. Changed both tests to sweep `lane += 1/16` (the continuous sub-lane axis where `s.player.lane` actually lives), which exercises all 8 authentic rolls.
  - Rationale: encoding the lane index into the roll (as the tests assumed, and as the haiku test-runner suggested) would fabricate non-authentic behavior — the exact "guessing" the story's "fetch, don't guess" forbids. The disassembly proves the roll is per-sub-lane. The corrected tests preserve TEA's intent ("visibly re-rolls, ≥4 distinct as it moves") on the correct axis; all of TEA's other invariants (bounded, wrap, clamp, pure) are unchanged and green.
  - Severity: minor
  - Forward impact: none — the transform's roll matches the ROM exactly.
- **Claw rotation uses the lane's radial angle (flipper convention); muzzle-tip spark at the anchor**
  - Spec source: context-story-12-1.md AC-1
  - Spec text: "rotation = so the glyph muzzle points INWARD ... the transform's rotation may reduce to fine-alignment or zero — TEA/Dev to determine from draw_player."
  - Implementation: `clawTransform.rotation = atan2(anchor − farCentre) + π/2` (the same lane-radial convention `drawEnemy` uses for the flipper), so the claw lies along its lane. The white muzzle spark is drawn at the claw anchor (centre) rather than a specific muzzle vertex.
  - Rationale: `draw_player` applies no explicit rotation (orientation comes from the tube's per-segment geometry); the radial convention matches the sibling glyphs and points the claw down its lane. The exact inward offset and spark position are a rendered-composite detail.
  - Severity: minor
  - Forward impact: the precise muzzle-inward offset is confirmed by the AC-5 visual check (`npm run dev` / contactSheet), already flagged by TEA.
- **AC-2 sizing SUPERSEDED by boss review — claw fills its lane (footprint 1.0, not ~18%)**
  - Spec source: context-story-12-1.md AC-2; TEA interface contract item 1
  - Spec text: "scale … tuned so `glyphExtent × scale ≈ 18%` of the rim lane-width (~20px on level 1)"
  - Implementation: `CLAW_FOOTPRINT_FRACTION = 1.0` — the widest graphic spans the full rim lane-width (prongs at the lane edges). The proportional-across-16-geometries sizing law is unchanged; only the fraction constant moved 0.18 → 1.0.
  - Rationale: boss review round 1 ("too small") — the ~18% cursor read as a speck on the rim; the arcade CURSOR sits large, filling its lane. Direct-authority story-scope feedback supersedes the written AC-2 figure.
  - Severity: minor
  - Forward impact: the ROM shapes span 5–8 units, so the footprint pulses ~62% (narrowest pose at a lane centre) → 100% (widest, mid-step). Normalising the 8 poses to a constant lane-filling width is an OPEN follow-up the boss deferred.
- **AC-4 motion SUPERSEDED by boss review — the claw STEPS (discrete), it does not slide**
  - Spec source: context-story-12-1.md AC-4; TEA interface contract ("interpolate for fractional lanes")
  - Spec text: AC-4 / contract: the anchor interpolates between lane centres for fractional lanes (a smooth continuous slide around the rim).
  - Implementation: the anchor SNAPS to the discrete segment `seg = round(lane)` (== `currentLane`, so the drawn claw matches the shooting lane); the claw steps lane-to-lane. Tests reworked to assert stepping (`SNAPS … it WALKS, it does not slide`; one discrete stop per lane).
  - Rationale: boss review round 2 ("should walk, not slide"). The ROM draws the cursor at the whole segment `player_seg`, so discrete stepping is the authentic motion, not a slide.
  - Severity: moderate — changes the claw's motion model from the AC's continuous interpolation to discrete steps.
  - Forward impact: a future "ease the anchor between centres" would soften the step but decouple the drawn claw from the `round(lane)` shooting lane — a bigger call the boss and I flagged for a later iteration.
- **AC-8 roll axis refined — the walk is SYNCED to the step & leans into travel**
  - Spec source: context-story-12-1.md AC-8; boss review round 3
  - Spec text: AC-8 "roll→graphic mapping … visibly re-rolls as the player rotates." The prior Dev mapping used `fine = ⌊(lane − ⌊lane⌋)·16⌋`, `roll = (fine >> 1) & 7`, which resets at INTEGER lanes.
  - Implementation: `roll = ⌊((lane − round(lane)) + 0.5)·8⌋` — monotonic 0→7 across each step window `[seg−0.5, seg+0.5)`, wrapping at the SAME half-lane where the anchor steps (`seg` and the roll now share `Math.round`). The apex (graphics 1→7 apex-x `0,1,2,3,5,6,7`) therefore leans into the direction of travel.
  - Rationale: boss review round 3 — the animation must synchronise with movement (lean into travel, step one segment at a time), not run as a detached loop. The old integer-boundary reset was half a segment out of phase with the round-based anchor step, so the lean snapped back mid-stride. Still authentic to `draw_player` (roll from the fine sub-position), now phase-locked to the step.
  - Severity: minor — refines the roll axis; still per-sub-lane, bounded [0,8), wraps closed / clamps open (all prior invariants green).
  - Forward impact: none for the sim; a future anchor-easing change would revisit this phase relationship.

## TEA Assessment

**Phase:** review
**Tests Required:** Yes
**Status:** RED confirmed — 27 new-feature tests failing for the right reasons; 775 pre-existing tests green; **no regressions**.

**Test Files:**
- `tests/core/geometry.claw-transform.test.ts` (NEW) — the pure `clawTransform` (AC-1, 2, 4, 6, 8-mapping). 19 tests, 16 RED (`clawTransform` not yet exported), 3 boundary guards green.
- `tests/shell/glyphs.test.ts` (EDITED — replaced the stale Story 6-8 stylized-claw block) — byte-exact NCRS1–8 (AC-3, 7). 5 RED in the new block; rest of the file untouched & green.
- `tests/shell/render.claw.test.ts` (NEW) — `drawPlayer` wiring + `drawWarp` don't-touch tripwire (AC-3, 5, 6). 12 tests, 6 RED (imports/wiring/walker-removal), 6 guards green.

**Tests Written:** 40 tests across 8 acceptance criteria (27 currently RED, 13 are regression/boundary guards that must stay green).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Tempest Hard Boundary — `core/` pure (no DOM/canvas/Date/perf/random/rAF) | `geometry.ts stays pure … (AC-6)` → "never touches DOM/canvas/time/randomness" | green guard |
| Tempest Hard Boundary — `core/` must not import `shell/` | "does not import from the shell" | green guard |
| TS lang-review #1 — no `as any` / `@ts-ignore` | geometry + render "no type-safety escapes" | green guard |
| TS lang-review #8 — test quality (meaningful, non-vacuous asserts) | self-check pass (see below) | done |

**Rules checked:** the applicable ones for a pure-math + vector-data + render-wiring change. Not applicable (no code of that kind touched): React/JSX (#6), async/Promise (#7), enums (#3), null/undefined (#4), module/declaration (#5), input-validation (#10), error-handling (#11), bundle (#12).

**Self-check (TS #8 / vacuous-assertion sweep):** every test carries a meaningful assertion (value/shape/count checks, not `is_some()`/`assert(true)`; no `let _ =`). **1 broken test found and fixed during RED verification:** the geometry purity guard originally matched the bare word `canvas`, which appears in a `core/geometry.ts` coordinate-convention *comment* ("ROM +y up -> canvas +y down") — a false positive that could never pass. Rewrote it to match DOM *access* patterns (`document.`/`window.`/`.getContext(`/`requestAnimationFrame(`), verified green.

### Interface contract handed to Dev (make the RED go green)

1. **`src/core/geometry.ts`** — add:
   ```ts
   export interface ClawTransform {
     readonly anchor: Point   // rim lane-centre at the CONTINUOUS (fractional) lane
     readonly scale: number   // fixed screen footprint ∝ rim lane-width
     readonly rotation: number// fine muzzle-inward alignment (may be 0)
     readonly roll: number    // integer graphic index 0..7 → NCRS(roll+1)
   }
   export function clawTransform(tube: Tube, lane: number): ClawTransform
   ```
   - `anchor`: integer lane → `laneCenterNear(tube, lane)` (== `project(tube, lane, 1.0)`); interpolate for fractional lanes; **closed tubes wrap, open sheets clamp**; NEVER an interior depth (0.74/0.90 are gone).
   - `scale`: proportional to `laneWidth(tube, lane, 1.0)`, tuned so `glyphExtent × scale ≈ 18%` of the rim lane-width (~20px on level 1); **same law across all 16 geometries**; independent of the far ring / `FAR_RATIO` (tests prove this via identical-`near`/different-`far` tubes).
   - `roll`: integer in `[0,8)` from the lane per `draw_player` (fetch from the disassembly); wraps closed / clamps open; **re-rolls** (≥4 distinct per revolution).
2. **`src/shell/glyphs.ts`** — rewrite `playerClawGlyph(roll: number): Glyph` to return a **single closed yellow stroke** = authentic `NCRS(roll+1)` from a transcribed 8-shape table (byte-exact `_pv_t3` graphics 1–8; store **raw ROM deltas, no y-flip**, like `flipperGlyph`). `roll` wraps mod 8; `0→NCRS1, 3→NCRS4, 7→NCRS8`. Discard the stylized `clawBase` chevron.
3. **`src/shell/render.ts`** — rewrite `drawPlayer` to `const { anchor, scale, rotation, roll } = clawTransform(tube, s.player.lane)` then `strokeGlyph(ctx, playerClawGlyph(roll), anchor.x, anchor.y, scale, rotation, blur)`. Keep `CLAW_COLOR`, the `s.mode === 'dying'` alpha fade, and the white muzzle-tip dot. **Remove** `walkPhase`, `clawPrevLane`, `liftL/liftR`, `kneeA/kneeB`, `apex/apexIn`, the 0.74/0.90 projections, and the module-level walk state. **Do NOT touch `drawWarp`.**

**Route:** → Dev (Julia) for GREEN (implement to satisfy the failing tests).

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 802/802 passing (GREEN) · `tsc --noEmit` clean · `vite build` OK
**Branch:** `feat/12-1-rim-anchored-claw` (pushed to origin)

**Files Changed:**
- `src/core/geometry.ts` — new pure `clawTransform(tube, lane) → { anchor, scale, rotation, roll }`. Anchor = rim (near) lane-centre, interpolated for continuous lanes, wrap (closed) / clamp (open); == `project(...,1.0)`, so it never depends on the far ring or perspective divide. Scale = fixed ~18% of the rim lane-width. Rotation = the lane's radial angle. Roll = authentic per-sub-lane graphic index.
- `src/shell/glyphs.ts` — `playerClawGlyph(roll)` rewritten to return the **byte-exact NCRS1–8** shapes (transcribed from `tempest.a65` `_pv_t3` graphics 1–8), one centred closed yellow stroke each. The stylized `clawBase` chevron is deleted.
- `src/shell/render.ts` — `drawPlayer` reduced to `clawTransform → playerClawGlyph → strokeGlyph`; removed `walkPhase`/`clawPrevLane`/legs/knees/`apex`/`apexIn` and the orphaned `radialUnit`. `drawWarp` untouched.
- `src/tools/contactSheet.ts` — refreshed the stale walker comment/descriptor ("walks" → "rolls the rim").
- `tests/core/geometry.claw-transform.test.ts` — corrected the two re-roll tests to sweep sub-lane motion (the authentic axis; see Design Deviations). All other TEA invariants unchanged.

**Authenticity:** the roll mapping and all 8 shapes come straight from the fetched disassembly (`draw_player`: `graphic = ((player_position>>1)&7)+1`; `_pv_t3` graphics 1–8). Graphics 1/4/8 match the book §8 oracle exactly — no guessing.

**AC coverage:** AC-1/2/4/6/7/8 covered by green tests. **AC-3** (renders authentic claw) wired + unit-guarded; **AC-5** (visual "game runs") — `tsc`/`build`/tests pass but the live on-screen check is deferred to the Reviewer because port 5273 is held by another checkout (see Delivery Findings).

**Self-review:** wired into `drawPlayer` (the live render path) and `contactSheet`; follows the sibling-glyph patterns (`fromDeltas`/`center`/`strokeGlyph`, flipper's raw-delta convention); no debug code; working tree clean; on the correct gitflow branch.

**Handoff:** → Reviewer (The Thought Police) for code review.

---

### Rework addendum (boss review, 3 rounds)

Boss reviewed the claw live and drove three changes (all relogged under Design Deviations → Dev):
1. **Fill** — `CLAW_FOOTPRINT_FRACTION = 1.0`; the cursor fills its rim lane (was ~18%). *(supersedes AC-2 sizing)*
2. **Step, don't slide** — anchor SNAPS to `seg = round(lane)`; the claw steps lane-to-lane. *(supersedes AC-4 slide)*
3. **Walk synced to movement** — `roll = ⌊((lane − round(lane)) + 0.5)·8⌋`: monotonic 0→7 across each step, wrapping exactly where the anchor plants, so the apex leans into the direction of travel (fixes the old integer-boundary reset that snapped the lean back mid-stride and read as a detached loop). Preview `playerCell` now walks-and-holds instead of an endless sine sweep.

**State after rework:** **808/808 tests pass** (added 3 TDD tests: roll continuous through the lane centre, wraps at the anchor step, monotonic 0→7 across a step), `tsc --noEmit` clean, `vite build` OK. Boss approved the walk feel ("ok for now, we can iterate"). Files changed this session: `src/core/geometry.ts`, `src/tools/contactSheet.ts`, `tests/core/geometry.claw-transform.test.ts`. Verified live via `npx vite preview --port 4321` → `models.html` (montage `claw-walk-sync.png`), closing the AC-5 visual check.

**Open follow-ups (deferred, non-blocking):** normalise the 8 poses to a constant lane-filling width to kill the ~62%→100% size-pulse; optionally ease the anchor between lane centres (would decouple drawn claw from the `round(lane)` shooting lane).