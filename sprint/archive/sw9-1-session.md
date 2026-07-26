---
story_id: "sw9-1"
jira_key: "sw9-1"
epic: "sw9"
workflow: "tdd"
---
# Story sw9-1: X-wing cockpit canopy frame — the persistent red-strut/blue-bar overlay framing every gameplay view; OPEN FIRST: determine provenance (authentic WSVROM color-vector picture vs cabinet artwork) then draw as static screen-space overlay

## Story Details
- **ID:** sw9-1
- **Jira Key:** sw9-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Epic:** sw9
- **Branch:** feat/sw9-1-cockpit-canopy-frame
- **Branch Strategy:** gitflow (feat/sw9-1-cockpit-canopy-frame)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T15:22:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T14:09:48Z | 2026-07-26T14:12:24Z | 2m 36s |
| red | 2026-07-26T14:12:24Z | 2026-07-26T14:32:52Z | 20m 28s |
| green | 2026-07-26T14:32:52Z | 2026-07-26T15:08:46Z | 35m 54s |
| review | 2026-07-26T15:08:46Z | 2026-07-26T15:22:55Z | 14m 9s |
| finish | 2026-07-26T15:22:55Z | - | - |

## Sm Assessment

**Setup complete — sw9-1 cleared for RED.**

- **Merge gate:** PASS — zero open PRs fleet-wide (verified 2026-07-26, all five dependabot PRs merged this morning).
- **Race check:** PASS — `git -C star-wars log --all --grep sw9` and remote branch list show no sw9 work upstream; epic unclaimed. Origin was active this morning (sibling released v0.0.30) — re-check at review per the parallel-checkout race protocol.
- **Branch:** `feat/sw9-1-cockpit-canopy-frame` cut from origin/develop at ddf72c5 (v0.0.30, level with origin).
- **Context:** `sprint/context/context-story-sw9-1.md` is a fresh stub from sprint YAML — no ACs in YAML; **TEA defines ACs during RED** (stub says so explicitly). Design source: `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`.
- **Story-ordered open question routed to RED:** title mandates "OPEN FIRST: determine provenance (authentic WSVROM color-vector picture vs cabinet artwork) then draw as static screen-space overlay." Provenance ruling belongs to TEA's RED research; primary source at `/Users/slabgorb/Projects/star-wars-1983-source-text` (WSVROM.MAC et al.).
- **Execution mode:** peloton (team peloton-sw9-1, tea/dev/reviewer) — per user order, riders run as UNNAMED INLINE subagents, not tmux teammates (swarm dies at ~5 panes; recorded in SM gotchas). SM stays orchestrator; no TeamCreate executed. Model tiers: tea/reviewer=opus, dev=sonnet.
- **Prior-archive sweep:** sw8-6 session's sw9 pointer is a flight follow-up (play-cube clamp/loiter) — out of sw9-1 scope, and **FILED as sw8-9** (2026-07-26) so it stays on the books: "TIE in-front loiter — port the deferred §5 play-cube clamp (sub_8DE3) + loiter/no-ram (§9-3)". Nothing dropped.

## Tea Assessment

**Phase:** finish
**Tests Required:** Yes
**Status:** RED (12 failing feature tests + 5 regression guards — ready for Dev/Julia)

### Provenance ruling (the story's mandated "open first")

**RULING: (a) AUTHENTIC WSVROM color-vector picture — port as a static screen-space
overlay. NOT cabinet artwork.** The 1983 source draws the persistent cockpit frame under
`WSVROM.MAC` `.SBTTL PLAYER'S GUN SITE` (WSVROM.MAC:1413-1885) as FIVE AVG screen-space
pictures, each self-labelled "SITE / PLAYER'S ... GUN / SHIP": `VGSTTR` (right side rail),
`VGSTTL` (left side rail), `VGSTBR` (bottom-right), `VGSTBL` (bottom-left), `VGSTBM`
(bottom-middle "FRONT SHIP"). Each is `VOFF` to a fixed screen limit (VGLIMR/VGLIML/VGLIMB/
VGOFFY) then `AON`/`AOFF` line runs — never through the 3D Math Box — drawn `COLOR VGCBLU`
(deep blue, ==1) for the shaft/tip and `COLOR VGCRED` (red, ==4) for the collar/dish. The
title's "blue-bar / red-strut" overlay is literally these blue bars (shafts) + red struts
(collars). Same picture family as the already-ported aim reticle (`VGSITE` → `drawCrosshair`).
Full ruling + transcription caveat in `sprint/context/context-story-sw9-1.md`.

### Test Files
- `star-wars/tests/shell/render.cockpit-frame.test.ts` — 17 tests via a transform-tracking
  recording ctx that captures every stroked polyline (color + absolute canvas points) and
  classifies VGCBLU (deep blue, excludes the cyan reticle) vs VGCRED at the five ROM anchors.

**Tests Written:** 17 tests covering 8 ACs (12 RED feature tests, 5 regression guards).
Full suite after adding the file: **12 failed | 1842 passed (1854)** — only the new file is
red; `tsc --noEmit` clean; no collateral breakage.

### AC / RED coverage

| AC | Behavior | Test(s) | State |
|----|----------|---------|-------|
| AC-1 | Persistent screen-space frame during play | blue near L edge / R edge / bottom band | RED |
| AC-2 | Five ROM gun pictures at their anchors (five-not-three) | blue in 5 anchor regions; side rails above bottom | RED |
| AC-3 | Authentic VGCBLU + VGCRED, not the cyan reticle | deep-blue strokes ≠ #00e5ff; red in bottom band | RED |
| AC-4 | Static screen-space (no yoke/camera tracking) | blue geometry identical centred vs hard-over aim | RED |
| AC-5 | Frames every gameplay view | blue frame in space / surface / trench | RED (×3) |
| AC-6 | Live-run gated | drawn playing (RED); absent on attract & gameover (GUARD, green) |
| AC-7 | Purity boundary (shell-only) | core state/sim/input clean (GUARD ×3, green); draws from vanilla state (RED) |
| AC-8 | Provenance grounded in the ROM | render.ts cites a VGSTxx symbol / "PLAYER'S GUN SITE" | RED |

**Guards currently green (must stay green):** AC-6 absent-on-attract, AC-6 absent-on-gameover,
AC-7 core-purity ×3 (state.ts / sim.ts / input.ts). Documented inline in the test file.

### Notes for Dev (Julia)
- Shell-only. Draw in `render()`'s gameplay overlay branch (the `mode !== attract && != gameover`
  path that already draws `drawCrosshair`). Stroke via the existing glow primitive
  (`glowPolyline` / `glowLine`) in absolute screen coords, like `drawCrosshair`.
- **.RADIX 16 caveat (WSVROM.MAC:1246):** in the gun-site data, un-dotted `AON`/`AOFF`/`CXY`
  coords are HEX; `M.=10.` (per-picture scale) and the screen-limit equates are dotted decimals.
  Map AVG screen-space (X ±480, Y ±552, +Y up) to canvas pixels; author polylines from the
  `AON`/`AOFF` runs. Do NOT reuse the cyan reticle glow (`#00e5ff`) — use a true VGCBLU deep blue.
- The recording-ctx tests give latitude on exact pixel placement (generous anchor margins);
  the real acceptance is visual (design spec §6) — our frame beside the cabinet longplay.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/shell/render.ts` — new `drawCockpitFrame` overlay (five WSVROM
  `PLAYER'S GUN SITE` pictures, `VGSTTR`/`VGSTBR`/`VGSTBM`/`VGSTTL`/`VGSTBL`), called
  from `render()`'s gameplay branch alongside `drawCrosshair`.
- `star-wars/docs/audit/findings/pair-hud.json`, `pair-models.json` — 9 citation line
  numbers re-anchored (`tools/audit/reanchor-citations.mjs --write`); verbatim text
  unchanged, only line numbers shifted by the new code.

**Radix correction (supersedes TEA's Delivery Finding below).** Re-derived the
gun-site picture transcription directly from `WSVROM.MAC`'s own `AON`/`AOFF`/`CXY`
macro bodies (WSVROM.MAC:112-149), not just the `.RADIX 16` directive at line 1246.
Each macro splices a literal `.` onto its substituted argument before evaluation
(`'.1'.*M./D.`) — in MACRO-11 a trailing `.` forces DECIMAL regardless of the
ambient radix, and the macros' own preceding comments read "ABSOLUTE DECIMAL
COORDS, ON" / "..., OFF" (WSVROM.MAC:113, 126). So the un-dotted `AON`/`AOFF`/`CXY`
coordinates in the gun-site data are DECIMAL, same as `M.`/`D.` and the
screen-limit equates — NOT hex. Transcribed all five pictures on that basis (doc
comment above `GUN_SITE_BLUE` in render.ts cites the mechanism). This is the kind
of radix trap the project has been burned by twice before (context file's own
warning) — worth a close look from Reviewer given the story's fidelity stakes.

**Canvas placement.** The tests give generous region latitude, but two OTHER
already-green test files impose hard geometric constraints I had to solve for:
`render.player-laser.test.ts` (CORNER_TOL=120px around each canvas corner — its
own cannon-tip-corner heuristic) and `render.death-star-picture.test.ts` (a
radius-300 "Death Star body" isolation circle around screen centre, for y in
[110,500]). A single global AVG→canvas affine transform could not satisfy both
simultaneously with the ROM's own absolute coordinates (proved by exhaustive grid
search — see deviation below), so each picture keeps its authentic LOCAL shape
(relative to its own VOFF anchor) but is placed via its own canvas-fraction
anchor point + one shared px-per-unit scale (0.65), verified by direct
calculation against both other test files' exact thresholds, not eyeballed.

**Laser-origin decision:** declined (see Design Deviations below).

**Tests:** 1854/1854 passing (GREEN) — full suite, zero regressions. `tsc --noEmit`
clean, `npm run build` clean.
**Branch:** `feat/sw9-1-cockpit-canopy-frame` (pushed, commit `00a4567`)

**Handoff:** To Reviewer

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the gun-site picture data lives after `.RADIX 16`
  (WSVROM.MAC:1246), so un-dotted `AON`/`AOFF`/`CXY` coords are HEX while `M.=10.` and the
  screen-limit equates are dotted decimals. Affects `star-wars/src/shell/render.ts`
  (transcribe the five pictures radix-correctly at the ROM `M.`/`D.` scale). *Found by TEA
  during test design.*
- **Improvement** (non-blocking): `drawPlayerLaserToSite` (render.ts) already calls the four
  screen corners "the cockpit guns" but draws no geometry — the laser beams fire from bare
  corners. Affects `star-wars/src/shell/render.ts` (seat the new gun pictures so the beams
  originate from the drawn VGCBLU gun tips, reconciling the two). *Found by TEA during test
  design.*
- **Question** (non-blocking): the ruling gates the frame to a live run (consistent with
  `drawCrosshair`), so it does not show on attract — but the cabinet's attract demo shows
  gameplay (and thus the frame). Affects `star-wars/src/shell/render.ts` / epic sw9-3
  (attract parity) — decide there whether the frame should also draw over the attract demo.
  *Found by TEA during test design.*

### Dev (implementation)
- **Correction** (non-blocking, read this one): TEA's first Improvement finding above
  ("un-dotted AON/AOFF/CXY coords are HEX") is WRONG — re-checked against the `AON`/
  `AOFF`/`CXY` macro *definitions* themselves (WSVROM.MAC:112-149), not just the
  `.RADIX 16` directive. Each macro forces its substituted argument to DECIMAL via a
  spliced trailing `.` (`'.1'.*M./D.`), and is commented "ABSOLUTE DECIMAL COORDS,
  ON"/"OFF" right above the macro body — so the coordinates are decimal, matching
  `M.`/`D.` and the screen-limit equates, not hex. Affects `star-wars/src/shell/
  render.ts` (transcribed decimal — see the doc comment there) and
  `sprint/context/context-story-sw9-1.md`'s "Transcription caveat" section, which
  repeats the hex claim and should be corrected for any story that cites it next.
  *Found by Dev during GREEN implementation, cross-checked against the primary
  source macro bodies directly.*
- **Gap** (non-blocking): a single global AVG→canvas linear transform cannot place
  all five gun-site pictures without either (a) crowding the four canvas corners
  (colliding with `render.player-laser.test.ts`'s CORNER_TOL=120 heuristic) or (b)
  pulling the side-rail guns' collar/dish into `render.death-star-picture.test.ts`'s
  300px body-isolation circle around screen centre — proved by exhaustive grid
  search over the transform's parameters (zero solutions found). Affects
  `star-wars/src/shell/render.ts` (worked around via per-picture canvas-fraction
  anchors instead of one shared formula) and is a reusable trap for any future
  static screen-space overlay story that shares the same 800×600 test canvas as
  the death-star/laser isolation heuristics. *Found by Dev during GREEN
  implementation.*

### Reviewer (code review)
- **Conflict** (blocking-for-finish, doc-only): the permanent context record
  `sprint/context/context-story-sw9-1.md` (lines 48-55, "Transcription caveat for
  Dev") still asserts the gun-site `AON`/`AOFF`/`CXY` coords are **HEX** — which the
  radix adjudication below proves WRONG. The shipped code is decimal-correct; only
  the context prose is stale. Affects `sprint/context/context-story-sw9-1.md`
  (correct the caveat to DECIMAL, citing the `AON`/`AOFF`/`CXY` macro bodies
  WSVROM.MAC:117-150 that splice a trailing `.` to force decimal) so the next story
  citing this caveat inherits the correct reading, not TEA's error. SM to fix during
  finish. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the two BOTTOM guns (VGSTBL/VGSTBR) are anchored
  inboard at `xFrac` 0.3/0.7 rather than at the ROM's bottom **corners**
  (`VOFF VGLIML/VGLIMR, VGLIMB` — the horizontal extremes, vertically aligned with
  the side rails). This is forced by `render.player-laser.test.ts`'s beam detector
  (any non-cyan stroke straddling 120px of a canvas corner is misclassified as a
  laser beam and fails the cyan-only assertion), not by any game requirement.
  Independently confirmed real. Acceptable for a decorative overlay, but a future
  story owning the beam geometry could restore corner-faithful anchoring by teaching
  the detector to ignore the frame colours (`#3355ff`/`#ff3b30`). Affects
  `star-wars/src/shell/render.ts` (`GUN_SITE_PICTURES` anchors) and
  `render.player-laser.test.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): the story's stated real acceptance is VISUAL (design
  spec §6 — frame beside the cabinet longplay), which was NOT performed in this
  review (multi-checkout port trap; decorative overlay). The recording-ctx tests
  give generous region latitude, so exact on-screen placement/scale is unverified
  against the cabinet. Affects a future visual-parity pass (epic sw9). *Found by
  Reviewer during code review.*

## Impact Summary

**Shipped:** star-wars PR #125 (squash 60b876c on develop) — `drawCockpitFrame()` in `src/shell/render.ts`: the five WSVROM `PLAYER'S GUN SITE` pictures (VGSTTR/VGSTTL/VGSTBR/VGSTBL/VGSTBM) as a static screen-space overlay, VGCBLU `#3355ff` + VGCRED `#ff3b30`, drawn in all three live gameplay views, absent on attract/game-over. 17 new tests; suite 1854/1854; tsc/build clean; citation gate 12/12 (9 re-anchors, verbatim unchanged). Reviewer verdict: **APPROVED**, no Critical/High.

**Blocking:** none. The Reviewer's one blocking-for-finish item (context file carried TEA's refuted HEX radix claim) was **corrected before this finish** — `sprint/context/context-story-sw9-1.md` now records the DECIMAL ruling (macro-spliced `.` forces decimal; WSVROM.MAC:120, :116/:125).

**Carried forward (non-blocking):**
- [LOW] Bottom gun pictures anchored inboard (0.3/0.7 canvas-fraction) vs the ROM's true bottom corners — forced by `render.player-laser.test.ts`'s 120px corner beam-detector; revisit only if that detector is ever reworked.
- [INFO] Visual acceptance vs the cabinet longplay (design spec §6) not performed in-pipeline — offer a side-by-side screenshot QA to the boss.
- [Question → sw9-3] Frame is live-run gated, but the cabinet's attract demo shows gameplay (and thus the frame) — decide in the attract-parity story whether the demo draws it.
- [Improvement → future] `drawPlayerLaserToSite` still fires beams from bare corners; seating origins at the drawn gun tips was declined this story (12 pinned tests) — candidate follow-up if the laser tests are ever revised.
- **sw8-9 filed this session** (TIE in-front loiter — play-cube clamp sub_8DE3 + no-ram §9-3) from the sw8-6 archive finding; not part of sw9-1 but recorded here so the finish archive carries the cross-reference.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. There are no ACs in the sprint YAML — TEA authored the ACs
  during RED (per the SM handoff), so there is no prior spec to deviate from. The ACs are
  derived directly from the WSVROM `PLAYER'S GUN SITE` primary source and the sw8/sw9
  cabinet-feel design spec.

### Dev (implementation)
- **Radix basis for the transcription:**
  - Spec source: context-story-sw9-1.md, "Transcription caveat for Dev (GREEN)"
  - Spec text: "the gun-site picture data lives after `.RADIX 16`... so `AON`/`AOFF`/
    `CXY` coordinates without a trailing dot are HEX"
  - Implementation: transcribed all five pictures' `AON`/`AOFF`/`CXY` coordinates as
    DECIMAL, not hex.
  - Rationale: the `AON`/`AOFF`/`CXY` macro bodies (WSVROM.MAC:112-149) splice a
    literal `.` onto every substituted argument before evaluation
    (`VCTR '.1'.*M./D.-CX,...`), which MACRO-11 always reads as forced decimal
    regardless of the ambient `.RADIX` setting — and the macros are commented
    "ABSOLUTE DECIMAL COORDS, ON"/"OFF" immediately above their bodies. The `.RADIX
    16` directive governs bare literals elsewhere in the section, not arguments
    routed through these three macros.
  - Severity: major (a hex reading would have produced numerically wrong, though
    still plausible-looking, geometry — exactly the kind of radix trap flagged
    twice before in this project).
  - Forward impact: major — any later story citing this story's "transcription
    caveat" should use the corrected decimal reading, not the original hex claim
    (see the Delivery Finding above; context-story-sw9-1.md itself is unedited by
    Dev, since story context is outside this phase's file-ownership).

- **Laser-origin reconciliation declined:**
  - Spec source: this story's Dev brief, "Non-blocking improvement you MAY take if
    cheap" (also TEA's Delivery Finding, `drawPlayerLaserToSite` improvement)
    - Spec text: "seating the beam origins at your drawn gun tips reconciles the
      prose with geometry. Skip if it grows the diff; note the decision either way."
  - Implementation: `drawPlayerLaserToSite`'s four cannon origins are UNCHANGED —
    still the literal screen corners `(0,0)/(w,0)/(0,h)/(w,h)`.
  - Rationale: `render.player-laser.test.ts` (already green, 12 tests) pins the
    beam origins to within `CORNER_TOL=120px` of the exact four canvas corners;
    reseating them at the new gun-tip positions would rewrite that fixture's
    geometry assumptions and risk a regression the GREEN-phase contract rules
    out ("keep ALL other tests green"). Explicitly permitted to skip per the brief.
  - Severity: minor (cosmetic prose/geometry mismatch, pre-existing, not
    introduced by this story).
  - Forward impact: minor — left as an open Delivery Finding for whichever future
    story owns `drawPlayerLaserToSite`'s beam geometry.

## Reviewer Assessment

**Verdict: APPROVED** (no Critical/High findings). One doc-only correction to the
context file is required *at finish* (SM), not a code rework — the shipped code is
correct; only the permanent context prose is stale.

### THE RADIX DISPUTE — RULING: **Dev is CORRECT. TEA was WRONG. The coords are DECIMAL.**

Adjudicated against the primary source `/Users/slabgorb/Projects/star-wars-1983-source-text/WSVROM.MAC`:

- **Decisive line — WSVROM.MAC:120** (the `AON` macro body):
  `VCTR '.1'.*M./D.-CX, '.2'.*M.*MASP/DASP/D.-CY, .4`. The construct `'.1'.` splices a
  **literal `.` immediately after the substituted argument text**. In MACRO-11 a numeric
  literal with a trailing `.` is **DECIMAL regardless of the ambient `.RADIX`**. `AOFF`
  (line 128) and `CXY` (line 148) do the same.
- **Corroboration:** the macros are commented **"ABSOLUTE DECIMAL COORDS, ON"** (WSVROM.MAC:116)
  and **"…, OFF"** (:125); `M.=10.` / `D.=1` are dotted decimals.
- **Why TEA's reading fails:** TEA rested solely on `.RADIX 16` at WSVROM.MAC:1246. That
  directive governs **bare, macro-free literals**. Every coordinate in the five gun-site
  pictures is expressed **exclusively** through `AON`/`AOFF`/`CXY` (verified: VGSTTR:1545-1611
  uses only `M.=`/`D.=`/`VOFF`/`CXY`/`COLOR`/`AON`/`AOFF`/`CNTR`/`RTSL` — **no bare hex
  coordinate literals**), so the `.RADIX 16` never reaches them. A hex reading would have
  scaled every coord ≈1.6× and produced wrong-but-plausible geometry — exactly the radix
  trap this project has been burned by twice.
- **Transcription faithfulness (independently traced):** VGSTTR ports **exactly** under the
  decimal reading — blue shaft, red collar, red dish (14-pt loop), and blue tip all match the
  ROM `AON`/`AOFF` runs at raw×`M.`(=10), with one uniform +100 local-X translation that
  preserves shape (anchor placement is Dev's to choose). VGCBLU/VGCRED partitioning matches
  the ROM `COLOR` directives (shaft/tip blue, collar/dish red).
- **Required correction:** `sprint/context/context-story-sw9-1.md` (lines 48-55) still carries
  TEA's HEX claim. It is the permanent record future stories cite → **SM to correct to DECIMAL
  at finish** (logged as a blocking-for-finish Delivery Finding above). The code and its doc
  comment (render.ts:884-899) are already decimal-correct.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] | Bottom guns anchored inboard (0.3/0.7) not at ROM bottom corners; forced by the player-laser corner detector, not a game requirement. Decorative overlay, documented deviation. | `render.ts` `GUN_SITE_PICTURES` | None to ship. Future story may restore corner-faithful anchoring + teach the beam detector to ignore frame colours. |
| [LOW] | Context file carries the refuted HEX radix claim (permanent record). | `sprint/context/context-story-sw9-1.md:48-55` | SM: correct to DECIMAL at finish (doc-only). |
| [INFO] | Visual acceptance (design spec §6, frame beside cabinet longplay) not performed — decorative overlay, multi-checkout port trap. | epic sw9 | Defer to a visual-parity pass. |

### Charge adjudications

1. **Radix:** ruled above — Dev right, DECIMAL, transcription faithful.
2. **Placement compromise:** the "single global AVG→canvas transform → zero solutions" claim
   is **plausible and confirmed**. I independently verified both isolation constraints are real
   and mutually opposing for a global transform: (a) mapping the ROM bottom corners to canvas
   corners **straddles** `render.player-laser.test.ts`'s 120px corner detector → a non-cyan
   frame stroke is misclassified as a beam and fails the cyan-only assertion; (b) pulling the
   side rails inward toward centre enters `render.death-star-picture.test.ts`'s radius-300
   central circle and pollutes the red-dish centroid/span. The two constraints pull in opposite
   directions for one global affine, so per-picture anchors are a reasonable resolution. The
   side-rail red points clear the 300px circle by ~1-4px — tight, but Dev's "by calculation,
   not eyeballed" holds and the suite is green. Acceptable port; the inboard bottom guns are
   the only visible fidelity give, logged LOW.
3. **Colours:** VGCBLU==1 "DEEP BLUE" / VGCRED==4 "RED" (WSGLOB.MAC:56,59). `GUN_SITE_BLUE`
   `#3355ff` **reuses the repo's already-pinned VGCBLU** (render.ts:745 BOOM_BLUE_GLOW) and
   `GUN_SITE_RED` `#ff3b30` the pinned VGCRED (FIREBALL/DISH glow) — not invented, and distinct
   from the cyan reticle `#00e5ff` (g=85 vs 229). Test `isBlue`/`isRed` classifiers both pass.
4. **Static + gating + purity:** `drawCockpitFrame(ctx, w, h)` takes **no `state`** → geometry
   is fixed constants (AC-4 static, AC-7 no core field — both structural). Called only in the
   `else` (mode ≠ attract ≠ gameover) branch alongside `drawCrosshair` (render.ts:603-605) →
   AC-6 gating. `git diff` touches **0 `src/core/` files** → purity boundary intact.
5. **Citations:** gate green (12/12). Re-anchor shift math is internally consistent — a +1 for
   the added call, +201 for citations below the ~200-line `drawCockpitFrame` block; **only
   `"line":` values changed, every `verbatim` string byte-identical** (verified in the diff).

### Data flow traced
User aim (`aimX`/`aimY`) → `drawCrosshair` (tracks yoke) but **NOT** `drawCockpitFrame`
(ignores state entirely). AC-4 test proves it: blue geometry byte-identical at centred vs
hard-over aim. The frame is pure screen-space decoration — no input reaches it, no hit-test
leaves it. Safe.

### Independent verification (all re-run by Reviewer, not trusted from the report)
- **Full suite:** 177 files, **1854 passed (1854)** — matches Dev's claim.
- **`tsc --noEmit`:** exit 0, clean. **`npm run build`:** clean.
- **Citation gate** (`vitest run citations`): 12 passed (12).
- **Mutation battery** (tree committed at 00a4567, each restored via `git checkout`):
  - blue→cyan `#00e5ff`: **10 tests fail** (colour guard live, not vacuous).
  - drop VGSTTL left-rail picture: **2 tests fail** (AC-2 five-not-three guard live).
  - draw frame on attract branch: **1 test fails** (AC-6 gating guard live).
- **Race check:** clean — `git log --all --grep sw9` shows only our 642c98c/00a4567;
  origin/develop unchanged at ddf72c5 (v0.0.30); no sibling landed sw9 work. Local HEAD ==
  origin/feat/sw9-1-cockpit-canopy-frame (00a4567).

### Deviation audit
- Dev "Radix basis" deviation → **ACCEPTED** (correct; TEA's spec was the error). Carries the
  doc-correction obligation above.
- Dev "Laser-origin reconciliation declined" → **ACCEPTED** (explicitly permitted by the brief;
  reseating origins would rewrite a green fixture — correct call).
- Dev "per-picture anchors vs global transform" (Delivery Gap) → **ACCEPTED**, logged LOW.

### Observations (≥5)
1. Radix ruling: Dev correct, decimal, transcription faithful (VGSTTR traced exact). *(verified good)*
2. Colours reuse the repo's pinned VGCBLU/VGCRED registers, distinct from cyan reticle. *(verified good)*
3. Gating correct — frame in the `else` branch with `drawCrosshair`; mutation proves the guard. *(verified good)*
4. Purity intact — 0 core files; `drawCockpitFrame` takes no state; core-scan guards green. *(verified good)*
5. Citation re-anchor is verbatim-preserving, line-only, shift math consistent; gate green. *(verified good)*
6. Bottom-gun inboard anchoring — LOW fidelity give, test-forced, documented. *(finding)*
7. Context file carries the refuted hex claim — doc correction owed at finish. *(finding)*

### Specialist domain findings (dispatch tags)

Reviewer specialist subagents are disabled in settings (only `preflight` is enabled); per the
environment brief I assessed each domain directly.

- **[EDGE]** Isolation-circle margins are tight (side-rail red ~1-4px outside the radius-300
  central circle; bottom guns >120px off every corner) but clear; no unhandled boundary. Frame
  is size-invariant via canvas fractions; no divide-by-zero / empty-array path.
- **[SILENT]** No swallowed errors — `drawCockpitFrame` is a pure nested draw loop, no
  try/catch, no silent fallback, no error path to swallow.
- **[TEST]** Guards proven live by mutation (blue→cyan = 10 fails; drop left rail = 2 fails;
  attract gate = 1 fail). Not vacuous. Coverage maps 8 ACs.
- **[DOC]** render.ts:872-899 doc comment is radix-correct and cites the ROM symbols; the
  context file `sprint/context/context-story-sw9-1.md` is STALE (hex claim) — logged as a
  blocking-for-finish doc finding.
- **[TYPE]** `GunSiteRun`/`GunSitePicture` are `readonly` throughout; run tables typed
  `ReadonlyArray<readonly [number, number]>`; `GlowStyle` options type-check (tsc 0).
- **[SEC]** N/A — client-side static vector draw; no input, auth, secrets, network, or injection surface.
- **[SIMPLE]** Per-picture anchors (vs one global transform) are justified — the global
  transform is provably infeasible against the two isolation heuristics. No dead code; the
  five run tables are irreducible ROM data.
- **[RULE]** See Rule Compliance below.

### Rule Compliance

Rules source: `star-wars/CLAUDE.md` (the hard core/shell boundary) + `arcade/CLAUDE.md`.

- **Core/shell purity (the single most important rule):** the change is entirely in
  `src/shell/render.ts`; `git diff origin/develop...HEAD` touches **0 `src/core/` files**.
  `drawCockpitFrame(ctx, w, h)` takes no `GameState`, imports nothing from core, touches no DOM
  globals beyond the passed ctx. AC-7 core-scan guards (state.ts/sim.ts/input.ts) stay green.
  **COMPLIANT.**
- **Deterministic core untouched:** no new state, no RNG, no time, no `Math.random`. **COMPLIANT.**
- **Faithful ROM port:** geometry transcribed from WSVROM.MAC `PLAYER'S GUN SITE` at the ROM
  `M.`/`D.` scale, decimal-correct; colours from the pinned VGCBLU/VGCRED registers. **COMPLIANT.**
- **gitflow / branch:** work on `feat/sw9-1-cockpit-canopy-frame`, not `develop`/`main`. **COMPLIANT.**

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1854/1854, tsc 0, build clean, citations 12/12 | N/A |
| 2 | reviewer-edge-hunter | Yes | clean | none (self-assessed: margins tight but clear) | confirmed 0, dismissed 0 |
| 3 | reviewer-silent-failure-hunter | Yes | clean | none (self-assessed: no error path) | confirmed 0, dismissed 0 |
| 4 | reviewer-test-analyzer | Yes | clean | none (self-assessed + mutation: guards live) | confirmed 0, dismissed 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (context file radix claim stale) | confirmed 1, dismissed 0 |
| 6 | reviewer-type-design | Yes | clean | none (self-assessed: readonly, well-typed) | confirmed 0, dismissed 0 |
| 7 | reviewer-security | Yes | clean | none (self-assessed: no attack surface) | confirmed 0, dismissed 0 |
| 8 | reviewer-simplifier | Yes | clean | none (self-assessed: per-picture anchors justified) | confirmed 0, dismissed 0 |
| 9 | reviewer-rule-checker | Yes | clean | none (self-assessed: core/shell purity intact) | confirmed 0, dismissed 0 |

**All received:** Yes

**Handoff:** To SM (Winston Smith) for finish-story. One finish-time action owed: correct the
HEX→DECIMAL radix caveat in `sprint/context/context-story-sw9-1.md` (doc-only; code already correct).