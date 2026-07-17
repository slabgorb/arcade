---
story_id: "rb4-17"
jira_key: "rb4-17"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-17: THE PLANE IS DRAWN AT THE WRONG SCALE — model bytes are not world units, and the ROM sizes the picture with its own Z

## Story Details
- **ID:** rb4-17
- **Jira Key:** rb4-17
- **Workflow:** tdd
- **Type:** bug
- **Points:** 8
- **Priority:** p1
- **Repo:** red-baron
- **Stack Parent:** none (not stacked)

## Story Context

**CRITICAL CONTEXT — rb4-17 UNBLOCKS rb4-16:**

rb4-17 is the prerequisite for rb4-16 (PLONSN display-space servo). rb4-16 was parked to backlog on 2026-07-16 because it depends on:
1. rb4-17's AC-3: the `scene.ts` NDC-scale seam must be pinned against the ROM's own screen windows (RBGRND.MAC:326-334, RBGRND.MAC:345-355)
2. rb4-17's AC-2: dual-Z (PICTURE Z vs POSITION Z) must exist before rb4-16's servo can be driven

When rb4-17 completes, rb4-16 must be re-cut with the corrected scope documented at `sprint/context/context-story-rb4-16.md` (lines 3-50).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T16:50:45Z
**Branch:** fix/rb4-17-plane-picture-scale-dual-z
**Branch Strategy:** gitflow (feat/fix branches from develop)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T15:04:22Z | 2026-07-17T15:09:27Z | 5m 5s |
| red | 2026-07-17T15:09:27Z | 2026-07-17T16:00:58Z | 51m 31s |
| green | 2026-07-17T16:00:58Z | 2026-07-17T16:37:16Z | 36m 18s |
| review | 2026-07-17T16:37:16Z | 2026-07-17T16:50:45Z | 13m 29s |
| finish | 2026-07-17T16:50:45Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): the enemy plane is the one drawn object with NO core render function — main.ts builds its model matrix inline, in the file no test can import. The scale + dual-Z are untestable there. Affects `src/core/biplane.ts` + `src/main.ts` (extract `planeModel(enemy, eye): Mat4` beside `renderModel`, the guns.ts/shellSegments precedent, and have main.ts compose `renderModel(biplaneLOD(...), multiply(projView, planeModel(enemy, eye)))`; add it to screen-scale.test.ts MEASURED_SOURCES-adjacent draw path). *Found by TEA during test design.*
- **Improvement** (non-blocking): make `positionZ` OPTIONAL on Enemy (`readonly positionZ?: number`, read with `?? depth`), matching the existing `deltaY?`/`entryFrames?`/`parallel?` optionals. Verified via throwaway probe: REQUIRED → 6 tsc errors incl. `src/core/blimp.ts:331` + 4 sibling fixtures; OPTIONAL → 0 errors, 0 fixture re-seat, full suite still 1104 green. Affects `src/core/enemy.ts` (interface + spawn `positionZ: P_INDP` + step). *Found by TEA during test design.*
- **Conflict** (blocking): the gun window IS the picture scale (SM handoff pt 3). If Dev applies ×4 in `planeModel` alone, the DRAWN plane grows ×4 (wingtip → 160 world) but `guns.collides`'s hitbox stays ±32 world around the raw ±40 hull — the pilot shoots the visible wing and misses. Model + hitbox must stay on ONE scale (screen-scale.test.ts "aim tolerance identical near/far"). This re-baselines screen-scale.test.ts's aim-tolerance pin (currently `tolerance ≤ wingHalfSpan = 40`, computed off RAW PLANE_POINTS). Dev must derive COLSTP (RBARON.MAC:5789-5821, `DB.TRP` min/max — the projected picture bbox that grows as it closes) firsthand (standing-hazard: not yet verified by TEA) and re-baseline the aim-tolerance test. Affects `src/core/guns.ts` (WINDOW_X/Y / collides), `tests/core/screen-scale.test.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): blimp/wreck/shell picture scale is a DIFFERENT provenance — `BLIMP_POINTS`/`PIECE_POINTS` come from the PICTURE ROM (037007.XXX, `.RADIX 10`, drawn by the AVG at display scale), not the plane's PROGRAM-ROM POINTP tables (stored ×2/×4, lifted by ZAXIS). The plane's ×4 does NOT transfer by analogy. `wreckSegments` injects PIECE points raw like the plane did — verify against the picture-ROM decode path (likely no scale needed: display-list geometry is already at display scale) rather than ×4-ing it. Affects `src/core/wreck-render.ts`, `src/core/blimp.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-3's "chosen FOV documented against those anchors" is a prose deliverable (lb2-8 pattern — Reviewer-verified). The behavioural half is pinned (plane visible at P.INDP / dominates at P.MNDP); the current 60° `VERTICAL_FOV` can be RE-AFFIRMED (its calibration matches the story symptom exactly: raw wing 40 @ 4264 → ~0.009 NDC speck; ~0.11 @ 360 = the "~10% width" symptom) or re-derived, but the seam comment must name SETBM 0x300 / SETGRS 0x220/0x188. Affects `src/core/scene.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the PICTURE Z's own close rate is not transcribed. The ROM steps PICTURE Z by +10/+11 "Z DELTA" — PLNZD computes it as `N.PLNZ×(−8) − (0x20|0x40) − PRPDEL` (RBARON.MAC:2412-2442), ≈ −40−PRPDEL/frame for a lone plane — while PLPOSZ[GMLEVL] goes to +1B "PLANE MOTION DEPTH DELTA", the POSITION delta (:2409-2411). Our `depth` steps at the PLPOSZ position rate (≈10× slower at GMLEVL 0: ~94 s to the fly-by vs the ROM's ~10 s), kept per the RED contract's fly-by keep-behaviour pin. Transcribing it re-times the whole engagement and re-baselines the timing/engagement suites — its own story. Affects `red-baron/src/core/enemy.ts` (step's depth delta). *Found by Dev during implementation.*
- **Gap** (non-blocking): the blimp/wreck/propeller picture scale — TEA's hypothesis "likely no scale needed: display-list geometry is already at display scale" is REFUTED at the macro level: 037007.XXX defines the identical `POINTP → .BYTE .Z,.X*2,.Y*4` storage macro (:6-8), and BLIMP (:1013), PIECE0-3 (:613-773) and DBPROP (:426-470) are all POINTP point-sets fed through the PLNABZ/YAXIS 3-D paths (CDSSET builds the blimp's collision frame via `JSR PLNABZ`, RBARON.MAC:5502-5510) — so the same ×4 lift plausibly applies and our blimp/wreck/prop draw at ×1 (a quarter size). Needs its own story: rescaling re-baselines the blimp screen-scale/despawn and wreck suites. Affects `red-baron/src/core/blimp.ts`, `red-baron/src/core/wreck-render.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): the drone's POSITION-Z seed. The ROM's drone init overrides only the PICTURE MSB (`LDA I,DRINZ/100 / STA P.1ST+5`, RBARON.MAC:2369-2370) over a PLNXCG-initialized record; if PLNXCG copies the lead's record, a ROM drone spawns positionZ = P.INDP under a DRINZ picture — a picture-only depth stagger. Unverified (PLNXCG not read firsthand); waves.ts pins both Zs at DRINZ (today's coherent semantics) pending that read. Affects `red-baron/src/core/waves.ts` (drone literal). *Found by Dev during implementation.*
- **Improvement** (non-blocking): COLSTP's Z pre-gate (`JSR DPABS / CPY I,80 / SBC I,0 / BCS ;OUTSIDE PLANE (+/- 256.)`, RBARON.MAC:5774-5789) reads as |planeZ − shellZ| < 0x80 depth units — half a shell count, tighter than our WINDOW_Z = 1 — but DPABS's return convention needs ratification before changing it (the anti-tunnelling bound 2·WINDOW_Z ≥ SHELL_SPEED would sit exactly at equality). Affects `red-baron/src/core/guns.ts` (WINDOW_Z). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the derivation record could pin the gun-window bytes it now relies on: CDSSET is at :5495 with the O.DPTH ← PLSTAT+4/+5 PICTURE-Z load at :5529-5533 and `LDX I,2 / JSR PLTEST / JSR MINMAX` at :5535-5537; COLSTP's label is :5774 (TEA's blocking finding cited "COLSTP :5789-5821", which is the X/Y compare span, not the label — the mechanism was as described). Affects `red-baron/tests/core/plane-scale-source.test.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the lang-review #4 guard test ("no `positionZ || P_INDP` swallow") is NOT discriminating — its positionZ values 400/900 are both truthy, so `||` and `??` produce identical results and the test passes either way. The only discriminating value is positionZ: 0 (with `??` the centre sits at the eye — projectSegment returns null and the seam throws; with `||` it silently draws at P_INDP). The CODE is correct today (`??` verified at `biplane.ts:239` and `enemy.ts:550` by two specialists + rule-checker); the guard is scenery. Affects `red-baron/tests/core/plane-picture-scale.test.ts` (rewrite the rule test around positionZ: 0). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): no test exercises the NEW asymmetric Y band — a WINDOW_Y_MIN/WINDOW_Y_MAX swap, sign error, or mistranscribed COLLD y byte would pass all 1104 tests (topology.test.ts literal-pins only COLLD_POINTS[0]; the −16/+20 extremes live in points [1..3]). Reviewer verified the shipped behaviour empirically with a transient probe through the real `collides` (4/4: plane 70 ABOVE the boresight missed, belly bound −64; 70 BELOW hit, top-wing bound +80; 60 above hit; 85 below missed — probe deleted, tree clean), so the gap is guard coverage, not behaviour. Affects `red-baron/tests/core/guns.test.ts` (add the ±boundary pair), `red-baron/tests/core/topology.test.ts` (pin COLLD_POINTS[1..3] literals). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `type DualZEnemy = Enemy & { positionZ: number }` drops Enemy's `readonly` on positionZ (TS intersection semantics — confirmed by tsc probe), so the test-file type permits a mutation the production interface forbids; never actually mutated. One-word fix: `& { readonly positionZ: number }`. Affects `red-baron/tests/core/plane-picture-scale.test.ts:76`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the DRONE's collision frame in the ROM is not the plane's projected plate at all — CDSSET copies the constant DRNFRM table (`.WORD 0,-0C,-0C / .WORD 200,0C,0C`, RBARON.MAC:5710-5711, copied at :5544-5551): a fixed ±0x0C screen-unit box with a 0..0x200 Z band. Our clone applies the plane's COLLD plate to every target uniformly (pre-existing simplification — was the ±32 square — enlarged by this story). For the drone story, with the DRNFRM bytes now in hand. Affects `red-baron/src/core/guns.ts` (per-kind collision frames). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gun window not wired in RED (routed to a blocking Delivery Finding)**
  - Spec source: SM Assessment handoff, point 3 ("The gun window IS the picture scale")
  - Spec text: "Sizing the picture (this story) resizes the gun. Worth wiring in RED alongside the vertex scale, since AC-4's 'fly-by dominates the frame' and the gun window are the same measurement."
  - Implementation: pinned the vertex ×4 picture scale (AC-1/AC-4); flagged the gun-window↔picture coupling as a blocking Delivery Finding with the COLSTP citation instead of a RED test.
  - Rationale: COLSTP (RBARON.MAC:5789-5821, `DB.TRP` min/max) is unverified firsthand — the standing hazard forbids pinning an underived mechanism. A pinned window would also collide with screen-scale.test.ts's live aim-tolerance pin (`tolerance ≤ 40`), which must itself re-baseline. Deriving COLSTP + re-baselining is GREEN-phase work; a wrong RED window would misdirect Dev.
  - Severity: minor
  - Forward impact: Dev derives COLSTP and re-baselines `tests/core/screen-scale.test.ts` aim-tolerance; Reviewer diff-traces that model + hitbox share one scale (the pilot can hit the plane they see).
- **AC-6 blimp/wreck picture scale pinned as GUARDS, exact scale routed to a Delivery Finding**
  - Spec source: context-story-rb4-17.md, AC-6
  - Spec text: "Blimp/wreck/shell picture scale is verified against the same paths in RED; blimp gets NO position-Z (BLOBJ has no +19 field)."
  - Implementation: pinned the blimp single-Z guard (BLOBJ has no +19) and the plane-vs-blimp/wreck PROVENANCE distinction (POINTP program ROM vs 037007.XXX picture ROM); routed the exact blimp/wreck scale to a Delivery Finding.
  - Rationale: blimp/wreck vertices are picture-ROM (`.RADIX 10`, AVG display list) — the plane's ×4 POINTP factor does NOT transfer, and the picture-ROM decode path is unverified firsthand. Pinning a scale there would fabricate; the provenance guard prevents a blind ×4.
  - Severity: minor
  - Forward impact: Dev verifies blimp/wreck against the picture-ROM decode (likely no scale change — display-list geometry is already at display scale).
- **AC-3 FOV re-derivation is a Reviewer-verified DOC deliverable; the behavioural half is pinned**
  - Spec source: context-story-rb4-17.md, AC-3
  - Spec text: "the chosen FOV documented against those anchors."
  - Implementation: pinned the ROM windows in the source record (SETBM 0x300 / SETGRS 0x220/0x188) and a scene.ts citation-presence test; the FOV re-derivation PROSE is Reviewer-verified (lb2-8 pattern).
  - Rationale: "documented against those anchors" is prose, not a unit-testable behaviour. The behavioural half (visible at spawn / dominates at the pass) IS pinned in AC-4.
  - Severity: minor
  - Forward impact: Reviewer verifies scene.ts's seam comment cites the windows and justifies the FOV.

### Dev (implementation)
- **Aim-tolerance re-baseline plus THREE sibling re-seats RED never named**
  - Spec source: TEA blocking Delivery Finding (gun window IS the picture scale)
  - Spec text: "Dev must derive COLSTP … firsthand … and re-baseline the aim-tolerance test."
  - Implementation: re-baselined `tests/core/screen-scale.test.ts` (tolerance = 48, derived from COLLD_POINTS × PICTURE_SCALE, not re-typed) AND re-seated `tests/core/display-space.test.ts` (MAX_REACH 32√2 → hypot(48, 80), the new plate's circumscribed radius), `tests/core/guns.test.ts` (rotation-proof offset 40 → 60: outside ±48 axis-aligned, inside rotated 45°), `tests/shell/cockpit-draw-path.test.ts` (TOTAL_LIVE_SHELLS 53 → 52 — the wider X window connects one shell a sub-step earlier; cause documented at the pin, stability verified 2×).
  - Rationale: the three extra suites pinned the OLD ±32 window as fixture arithmetic, not as intent; every re-seat preserves its test's assertion subject.
  - Severity: minor
  - Forward impact: Reviewer verifies the four test edits are intent-preserving and the 52 is causal, not laundered.
- **WINDOW_Y split into asymmetric WINDOW_Y_MIN / WINDOW_Y_MAX**
  - Spec source: 037007.XXX:602-605 (COLLD bytes)
  - Spec text: `POINTP 12,20,-40 / 12,-16,-40 / -12,20,-40 / -12,-16,-40` — y spans −16..+20, not ±20
  - Implementation: transcribed the asymmetric band (−64..+80 at ×4); WINDOW_Y left as a screen-registry tombstone.
  - Rationale: the bytes are in hand; symmetrizing would be an invented constant in the epic that exists to kill invented constants.
  - Severity: minor
  - Forward impact: screen-scale registry carries both new names; a reintroduced symmetric WINDOW_Y lands back in the sweep.
- **collides() tests the true rotated plate; the ROM tests the rotated plate's AABB**
  - Spec source: RBARON.MAC:5537/:5718 (MINMAX after PLTEST)
  - Spec text: `JSR MINMAX ;SET MIN,MAX OF X,Y` — an axis-aligned box around the ROTATED COLLD corners
  - Implementation: kept our rotate-the-offset-into-the-banked-frame test against the unrotated plate (documented at collides()).
  - Rationale: identical at bank 0, strictly tighter mid-bank; adopting the AABB form is a LOOSER hit test that would re-seat more fixtures for no RED-driven gain.
  - Severity: minor
  - Forward impact: a byte-exact mid-bank story implements MINMAX's AABB if ever wanted.
- **Drone spawns BOTH Zs at DRINZ — not the ROM's picture-only override**
  - Spec source: RBARON.MAC:2363-2375 (drone init)
  - Spec text: `LDA I,DRINZ/100 / STA P.1ST+5` — only the PICTURE MSB is overridden over a PLNXCG-initialized record
  - Implementation: waves.ts drone literal pins `positionZ: DRINZ` beside `depth: DRINZ`.
  - Rationale: the +19/+1A seed under PLNXCG is unverified firsthand; guessing the split would invent. Coherent single-depth is today's exact semantics.
  - Severity: minor
  - Forward impact: the Question Delivery Finding; the drone story reads PLNXCG and decides.
- **`depth` keeps the PLPOSZ close rate — the ROM's PICTURE delta is not transcribed**
  - Spec source: RBARON.MAC:2409-2442 (PLNZD)
  - Spec text: PLPOSZ → +1B (POSITION delta); +10/+11 Z DELTA = `N.PLNZ×(−8) − (0x20|0x40) − PRPDEL` (PICTURE delta)
  - Implementation: positionZ steps by closeSpeed (byte-true +1B); depth also keeps closeSpeed (its existing behaviour) rather than gaining the +10/+11 formula.
  - Rationale: the RED keep-behaviour pin fixes the existing fly-by timing; the picture delta re-times the whole engagement (≈10× faster at GMLEVL 0) and is its own story.
  - Severity: minor (behaviour unchanged; the fidelity gap is the Delivery Finding)
  - Forward impact: until that story lands, picture and position Z never diverge for spawned planes — dual-Z is exercised by fixtures and by rb4-16's servo.
- **AC-5's MAME visual cross-check not performed in-sandbox**
  - Spec source: context-story-rb4-17.md, AC-5
  - Spec text: "cross-checked visually against MAME footage before the constants land"
  - Implementation: constants landed on the byte derivation alone; the anisotropy question is SETTLED in the Dev Assessment notes (plane path isotropic ×4; ground path ×16/×4 composing with PFPNTS `.BYTE .X/2,.Y*2` storage, 037007.XXX:10-12 → isotropic ×8) with citations.
  - Rationale: no MAME in the sandbox; the user's symptom video (the story's own evidence) anchors the visual, and AC-4's behavioural pins encode it.
  - Severity: minor
  - Forward impact: Reviewer/user playtest confirms the on-screen look against the cabinet.

### Reviewer (audit)
- **TEA: gun window routed to a blocking Delivery Finding, not RED** → ✓ ACCEPTED by Reviewer: the COLSTP citation was off-label (:5789-5821 is the compare span; the label is :5774) but the mechanism was exactly as described, and pinning an underived window would have misdirected Dev. Dev derived it firsthand; Reviewer re-verified every byte independently.
- **TEA: AC-6 blimp/wreck pinned as guards, exact scale routed to a Delivery Finding** → ✓ ACCEPTED by Reviewer: the ROUTING was correct; the embedded hypothesis ("likely no scale needed — display-list geometry") was REFUTED by Dev's verification (037007.XXX:6-8 defines the same POINTP storage macro) and the refutation is properly filed as a Gap finding, not silently acted on.
- **TEA: AC-3 FOV re-derivation as Reviewer-verified prose** → ✓ ACCEPTED by Reviewer: verified — scene.ts now names SETBM (0x300 cull), SETGRS (±0x220/±0x188), states the bracketing constraint (0x188 < HALF ≤ 0x220 < 0x300) any re-derivation must keep, and anchors the 60° FOV on the AC-4 behavioural pins. The seam is no longer a bare "not byte-pinned" shrug.
- **Dev: aim-tolerance re-baseline + three sibling re-seats** → ✓ ACCEPTED by Reviewer: all four verified intent-preserving (test-analyzer concurs; the screen-scale re-baseline is STRONGER than what it replaced — exact plate equality vs a (20,40] range; the guns 60u geometry re-checked by hand: 60 > 48 axis-aligned, 42.4 in-band rotated; the 53→52 pin carries a causal mechanism and survived a re-run).
- **Dev: WINDOW_Y asymmetric split** → ✓ ACCEPTED by Reviewer: byte-true to COLLD; signs verified empirically via a transient probe through the real collides() (4/4). Coverage gap for the band routed as a Reviewer finding.
- **Dev: rotated-plate vs ROM's rotated-AABB (MINMAX)** → ✓ ACCEPTED by Reviewer: identical at bank 0, strictly TIGHTER mid-bank — the conservative direction (no phantom hits); documented at collides(). A byte-exact AABB is available to a future story.
- **Dev: drone spawns BOTH Zs at DRINZ** → ✓ ACCEPTED by Reviewer: the PLNXCG record seed is genuinely unverified; pinning the coherent single-depth pose preserves today's semantics and the Question finding routes the read.
- **Dev: `depth` keeps the PLPOSZ rate (picture delta not transcribed)** → ✓ ACCEPTED by Reviewer: correctly contained by the RED keep-behaviour pin and correctly surfaced as the epic's next big fidelity Gap — re-timing the engagement belongs to its own story, not a review-round bolt-on.
- **Dev: AC-5 MAME cross-check not performed** → ✓ ACCEPTED by Reviewer: no MAME in the sandbox; the derivation is byte-anchored, AC-4 pins the two visual outcomes, and the Reviewer closed the residual model-path risk by reading DRNPIC firsthand (see assessment: both plane models draw through the POINTP path).
- **UNDOCUMENTED (Reviewer audit) — drones take the plane's COLLD plate:** Spec (ROM) gives drones the constant DRNFRM frame (RBARON.MAC:5710-5711, ±0x0C screen units + 0..0x200 Z); code applies the plane's projected plate to every Enemy uniformly. Pre-existing simplification (the old ±32 square was uniform too) ENLARGED by this story and not logged by Dev. Severity: L. Routed as a Reviewer Delivery Finding for the drone story.

## Sm Assessment

**Setup verified on disk, not trusted.** Session file present; the workflow line reads exactly `tdd`
(not the `tdd (phased)` spelling that breaks resolve-gate); phase read `setup` at setup time (not
pre-advanced to red). Status `in_progress` set via CLI. Branch `fix/rb4-17-plane-picture-scale-dual-z`
cut from red-baron `develop` @ `2798713` (v0.0.18 — the LATEST develop; a sibling checkout has shipped
releases since rb4-16 branched at 6d5fa37, so this is correctly ahead). `context-epic-rb4.md` diffed
against a pre-setup backup — **INTACT**, no clobber. Context `context-story-rb4-17.md` carries the YAML
`description` + all 7 ACs **verbatim** — spot-checked, not paraphrased into new line numbers.

**⚠ SEQUENCING INVERTED — rb4-17 now PRECEDES rb4-16 (SM ruling, user-confirmed 2026-07-17).** The
copied YAML description still ends "SEQUENCE AFTER rb4-16" — that line is now STALE; ignore it. The
2026-07-16 ruling had rb4-16 (PLONSN servo) first; rb4-16's green-phase Dev archaeology proved that
backwards and rb4-17's own citations corroborate it. rb4-16 is parked to backlog; its corrected scope
is the banner at the top of `sprint/context/context-story-rb4-16.md`, full evidence in
`sprint/archive/rb4-16-session.md`. **rb4-17 is the unblock**, on three counts Dev surfaced:

1. **Dual-Z (this story's AC-2) is rb4-16's prerequisite.** PLONSN loads `PLSTAT+19` = POSITION Z
   (:295) as its depth input — a DIFFERENT field from `+4/+5` PICTURE SIZE Z (:272), stepped by a
   separate delta (:297). Our `enemy.ts` has ONE `depth` doing both jobs, so rb4-16's servo was fed
   the wrong Z. Verified against the quarry firsthand: the PLSTAT block at RBARON.MAC:266-297 lists
   `+4 Z LSB PICTURE SIZE`, `+19 POSITION Z LSB`, `+1B DELTA POS Z` as distinct fields.

2. **The screen-scale seam (this story's AC-3) is rb4-16's other prerequisite.** rb4-16 could not
   express PLONSN's window because `scene.ts`'s `ROM_SCREEN_HALF=512` is an invented rb4-5 seam. The
   ROM's servo works in POST-DIVIDE screen units (`P_OLIM`/`P_ILIM` are screen units; `;X SCREEN
   POSITION` :3157). AC-3's anchors — `SETBM |screen| < 0x300` (RBGRND.MAC:326-334), `SETGRS ±0x220 X
   / ±0x188 Y` (:345-355) — are the numbers that give `0x200` a unit. Dev independently hit `:353 CPY
   I,88` (the ±0x188 Y window) while tracing POSITH; that citation is real. Pinning this scale
   unblocks rb4-5's seam for the whole epic.

3. **The gun window IS the picture scale.** rb4-16 measured that no PLONSN window clears AC-R3 partly
   because our gun is a fixed ±32 WORLD tube (`guns.ts` `WINDOW_X/Y`, playtest) while the ROM's gun is
   the plane's PROJECTED PICTURE bbox that GROWS as it closes (COLSTP RBARON.MAC:5789-5821, `DB.TRP`
   min/max). Sizing the picture (this story) resizes the gun. Worth wiring in RED alongside the vertex
   scale, since AC-4's "fly-by dominates the frame" and the gun window are the same measurement.

**Standing hazard (unchanged):** haiku subagents in this repo fabricate ROM citations that match a
TOKEN rather than the CLAIM. The generated context copied the YAML verbatim (low risk), but every ROM
line TEA pins in RED must be opened in the citable quarry `~/Projects/red-baron-source-text` (RBGRND.MAC
`.RADIX 16` from :6; RBARON.MAC from :74) — NOT the CRLF sibling `reference/red-baron/` — before a
constant lands. AC-1 says it outright: derive each vertex→screen factor, cite it, and DO NOT bake ×16
as gospel.

**Handoff to Imperator Furiosa (TEA):** red phase. The deliverable is the ROM's picture scale + dual-Z
under test, with the NDC seam pinned against SETBM/SETGRS. Getting AC-2 and AC-3 right is what lets
rb4-16 be re-cut — this story is load-bearing for the whole display pipeline, not just its own symptom.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity bug — two missing mechanisms (vertex ×4 pre-scale, dual-Z) drive the plane's
wrong scale. Every constant derived FIRST-HAND in the citable quarry, decoy rejected.

**Test Files:**
- `tests/core/plane-scale-source.test.ts` — the byte-pinned ROM DERIVATION RECORD (13 tests, **GREEN**).
  Fingerprints the citable quarry and rejects the R2GRND/R2BRON decoy (`FRMECNT=4` vs `=5`) before
  trusting a byte; derives every line from where the symbol is DEFINED (never a typed line number, so
  the staircase-offset sibling can't slip in). Pins: POINTP `.BYTE .Z,.X*2,.Y*4` (RBARON.MAC:30) +
  ZAXIS's extra ASL on X / unshifted Y (RBGRND.MAC:469-495) = isotropic ×4; PROJECT's ×16/×4 is a
  DIFFERENT (ground) path (AC-5); the dual-Z field layout (+4/+5 picture, +19/+1A position, separate
  deltas), O.DPTH "SCALE FACTOR", spawn-both-at-P.INDP, separate stepping, PLNLBS centre/vertex split,
  the P.MNDP fly-by on picture Z, BLOBJ's missing +19; SETBM 0x300 cull / SETGRS ±0x220/±0x188 window.
- `tests/core/plane-picture-scale.test.ts` — the CLONE behaviour those bytes demand (16 tests: **13 RED**,
  3 green keep-behaviour/guards). Requires a testable core `planeModel(enemy, eye)` seam + a `positionZ`
  field on Enemy. Wingspan is RECOVERED back to world units through screen.ts (FOV-free where it can be),
  exactly as the tracer seam recovers depth.

**Tests Written:** 29 across 2 files — 13 RED (drive the fix), 16 green (13 ROM derivation + 3 keep-behaviour).
**Status:** RED (13 failing — ready for Dev). Verified by DIRECT `vitest run` (not the haiku testing-runner,
which confabulates names/misattributes — memory). Full suite: only the 13 intended failures; 1104 others green;
AC-7 `citations` suite green (13/13). Probed the fix (throwaway `planeModel` + optional `positionZ`, reverted)
→ all 16 go green with **zero** sibling re-seat, confirming the RED is achievable and the handoff clean.

### Rule Coverage

| Rule (TS lang-review) | Test | Status |
|------|------|--------|
| #4 `x \|\| default` where x can be 0/small | `a plane hand-set to a small POSITION Z is drawn there — no \`positionZ \|\| P_INDP\` swallow` | failing (RED) |
| #8 test quality / meaningful assertions | wingspan RECOVERED to world units (not a bare NDC threshold); dual-Z split asserted as isolated cause→effect | passing (self-check) |
| #1 no `as any`/`as unknown as` | `planeModel` resolved via spread→`Record<string, unknown>`; `dualZ` via `Partial<DualZEnemy>` | passing (self-check) |

**Rules checked:** 3 of the applicable TS checks have coverage (the rest — React/async/enum — are N/A to pure sim geometry).
**Self-check:** 0 vacuous tests. Every planeModel-dependent RED throws a clear "add planeModel" message; every
dual-Z RED asserts `undefined`-vs-value (not a vacuous `not.toBe`); the fly-by pin was rewritten from a fragile
400-frame weave (which never reaches the ~976-frame floor at closeSpeed −4) to a deterministic floor-vs-spawn pair.

**Handoff:** To Julia (Dev) for GREEN. The two mechanisms are independent: (1) a core `planeModel` with an
isotropic scale(×4,×4,×1) on the wingspan (POINTP+ZAXIS), and (2) an optional `positionZ` on Enemy for the
centre while `depth` stays the picture Z. Read the 5 Delivery Findings first — the gun-window↔picture coupling
(blocking) and the blimp/wreck picture-ROM provenance are the two that will bite if skipped.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `red-baron/src/core/biplane.ts` - `PICTURE_SCALE = 4` (POINTP ×2/×4 storage + ZAXIS's one ASL, cited) and the `planeModel(enemy, eye): Mat4` seam: translation at −positionZ (centre by POSITION Z, PLNLBS:4817-4822) · rotationZ(bank) · scaling(4·positionZ/depth, ·, 1) (vertices at PICTURE-Z size, :4848-4850). Pan enters via the shared `displayPos` (deliberate function-only import cycle with enemy.ts, documented — no top-level cross-calls).
- `red-baron/src/core/enemy.ts` - optional `positionZ` on Enemy (`??`-read, never `||`); spawn seeds it with `depth` at P_INDP (STPLNE:2319-2324); step() steps it by its own +1B delta = closeSpeed (PLNZD:2409-2411, UPDPLN:2704-2709), unfloored.
- `red-baron/src/core/guns.ts` - the gun window IS the picture: WINDOW_X/WINDOW_Y_MIN/WINDOW_Y_MAX derived from `COLLD_POINTS × PICTURE_SCALE` (±48 / −64..+80 — the COLLD fuselage plate, 037007.XXX:602-605, riding CDSSET's PICTURE-Z O.DPTH load :5529-5533); collides() bounds the asymmetric band.
- `red-baron/src/core/scene.ts` - AC-3: ROM_SCREEN_HALF re-affirmed against SETBM 0x300 cull / SETGRS ±0x220/±0x188 (ordering 0x188 < 512 ≤ 0x220 < 0x300 stated as the re-derivation constraint); 60° FOV re-affirmed via the AC-4 pins.
- `red-baron/src/core/waves.ts` - drone literal pins `positionZ: DRINZ` (coherent single-depth; PLNXCG seed routed to a Question finding).
- `red-baron/src/main.ts` - composes `renderModel(biplaneLOD(enemy.facingAway), multiply(projView, planeModel(enemy, eye)))`; inline matrix + unused math3d imports removed.
- Tests (all re-seats logged as deviations): `screen-scale.test.ts` (aim box = the COLLD plate, derived; registry entries for the window names), `display-space.test.ts` (MAX_REACH → hypot(48, 80)), `guns.test.ts` (rotation offset 40 → 60), `cockpit-draw-path.test.ts` (TOTAL_LIVE_SHELLS 53 → 52, cause at the pin), `depth-scale.test.ts` (PICTURE_SCALE classified in the known registry).

**AC-5 settlement (story notes):** the X-vs-Y anisotropy is a TWO-PATH story, both isotropic once storage
composes with shifts. Full-plane path: POINTP stores `.Z,.X*2,.Y*4` and ZAXIS lifts X once (RBGRND.MAC:469-495)
→ X×4, Y×4, Z×1. Ground path: PROJECT pre-shifts X×16/Y×4 (:374-381) but its tables store PFPNTS
`.BYTE .X/2,.Y*2` (037007.XXX:10-12) → X: 16/2 = ×8, Y: 4×2 = ×8 — also isotropic, at ×8. The ×16/×4 was
never an anisotropy; it was storage compensation. PROJECT is not the plane's path and PICTURE_SCALE = 4 is
the plane's number.

**Tests:** 1104/1104 passing (GREEN) — verified by direct `vitest run` (testing-runner not used for the
verdict). `npm run build` (tsc + vite) clean. `npm test -- citations` green (41). Cockpit determinism pin
stable across 2 runs. Mutation check: `PICTURE_SCALE → 1` reddens exactly 5 tests (the wingspan/AC-4 pins);
the plate test tracks the mutation by design — it pins hitbox ≡ model scale, not the absolute (the absolute
is plane-picture-scale.test.ts's job). Restored from a cp backup with a full 1104/1104 control run.
**Branch:** fix/rb4-17-plane-picture-scale-dual-z (pushed, commit 644ad58). No PR opened (SM's finish).

**For SM (rb4-16 unblock):** both prerequisites landed — AC-2's dual-Z exists (`positionZ`, with the ROM's
+19 readers :2776/:2882 waiting for PLONSN) and AC-3's screen-scale seam is anchored on SETBM/SETGRS.
rb4-16 can be re-cut per the banner in `sprint/context/context-story-rb4-16.md`.

**Handoff:** To the Thought Police (Reviewer) — review phase. The five Dev Delivery Findings are the
follow-up map; the picture-Z close-rate Gap and the blimp/wreck ×4 Gap are the two that change what the
player sees next.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1104/1104, build clean, tree clean, zero smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; Reviewer enumerated boundaries directly (Y-band probe, depth-0 trace, fly-past frame) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; no catch/fallback sites in the diff (Reviewer read every hunk) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 3 (vacuous ∥-guard HIGH; missing Y-band coverage HIGH; plate-test self-consistency MEDIUM — mitigated), noted 1 (doc-presence regexes LOW — established convention, no action) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; Reviewer verified the load-bearing comments against the quarry byte-by-byte instead |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; rule-checker's type pass covered the diff (its DualZEnemy readonly find is confirmed) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity/citation/secret rules all compliant; cycle + division hazards traced and cleared |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; the diff's one structural addition (planeModel) follows the shellSegments precedent, no over-engineering observed |
| 9 | reviewer-rule-checker | Yes | findings | 1 (2 rule views) | confirmed 1 (DualZEnemy drops readonly — LOW, test-scoped); 17 rules × 39 instances otherwise compliant |

**All received:** Yes (4 enabled returned: 2 clean, 2 with findings; 5 disabled via settings)
**Total findings:** 4 confirmed, 0 dismissed, 1 noted-no-action (doc-presence regex convention)

## Reviewer Assessment

**Verdict:** APPROVED

**Independent ROM verification (the transcription rule):** every load-bearing byte was re-read from the
quarry by the Reviewer with fresh commands, not trusted from Dev's comments — the POINTP storage macro
in BOTH ROMs (`.BYTE .Z,.X*2,.Y*4`; 037007.XXX:6-8), ZAXIS's single ASL on X / unshifted Y / raw Z
(RBGRND.MAC:474-495), COLLD's four decimal points under the :80 `.RADIX 10` (037007.XXX:602-605),
CDSSET's O.DPTH ← PLSTAT+4/+5 PICTURE-Z load (:5529-5534) + PLTEST X=2 + MINMAX (:5535-5537), COLSTP
at :5774, STPLNE's dual seed (:2319-2324), UPDPLN's +1B position step (:2704-2709), the +4 fly-by read
(:2722-2726), and PLNZD's two distinct delta stores (:2410-2411 vs :2441-2442). All match the shipped
constants and citations.

**Data flow traced:** yoke input → flight → toEye → eye → displayPos, which is called by BOTH
guns.collides (the kill, guns.ts:434) and planeModel (the draw, biplane.ts:238) — one pan seam, so the
plane the pilot sees and the plane the gun judges cannot disagree by construction. The stick moves both
identically.

**Pattern observed:** planeModel extracted beside renderModel in core (biplane.ts:237) exactly on the
guns.ts shellSegments precedent — the model matrix moved from the untestable main.ts into the module
that owns the model, and main.ts:213 composes it. Good pattern, correctly repeated.

**Error handling:** degenerate depth (0/NaN) in planeModel yields an Infinity scale — traced as
unreachable in live flow (depth floors at P_MNDP=320 while active; the fly-past frame deactivates and
stepWave filters inactive planes before draw() receives the array — waves.ts:144), consistent with the
codebase's invariant-documenting posture. collides' dz gate is total (NaN fails the bound). No new
catch sites.

**Observations (tags):**
- [VERIFIED] the ×4 vertex lift derivation — evidence: 037007.XXX:6-8 + RBGRND.MAC:484-495 re-read
  independently; complies with the citation rule (biplane.ts:106-124 carries the full chain).
- [VERIFIED] the gun window IS the picture — evidence: CDSSET :5529-5537 loads O.DPTH from PICTURE Z
  and projects COLLD (POINTP format) through the plane's own path; guns.ts derives the window from the
  COLLD_POINTS transcription, one source.
- [VERIFIED] the asymmetric Y band behaves correctly — evidence: transient Reviewer probe through the
  real collides(), 4/4 (70-above missed at the −64 belly bound; 70-below hit under the +80 top-wing
  bound; 60-above hit; 85-below missed); probe deleted, tree clean after.
- [VERIFIED] BOTH plane models ride the POINTP ×4 path — evidence: DRNPIC's facing-away branch draws
  via PLNABZ "2-D DRONE POINTS" (:4972-4974) and the full model via PLTEST X=0 (:4919-4920); the story
  context's "PROJECT … + drones" refers to ground drones. The uniform PICTURE_SCALE is justified for
  the settled (facingAway) flight state, which is the common one.
- [VERIFIED] dual-Z reads use ?? at both sites — evidence: biplane.ts:239, enemy.ts:550; complies with
  lang-review #4 and the repo's optional-field rule.
- [TEST] the ∥-guard test is not discriminating (values 400/900 are truthy) — confirmed HIGH from
  test-analyzer; code correct, guard scenery; routed as a Delivery Finding with the positionZ:0 recipe.
- [TEST] no coverage of the new asymmetric band or the COLLD_POINTS[1..3] literals — confirmed HIGH
  from test-analyzer; behaviour verified by the Reviewer probe; routed as a Delivery Finding.
- [RULE] DualZEnemy intersection drops readonly (plane-picture-scale.test.ts:76) — confirmed LOW from
  rule-checker; one-word fix, routed as a Delivery Finding.
- [SEC] clean — the enemy⇄biplane cycle is hoisted-function-safe (both cross-calls inside function
  bodies: enemy.ts:563, biplane.ts:238), no ambient reads, no secrets, no new hardcoded-path pattern.
- [EDGE] disabled via settings — Reviewer enumerated the boundaries directly: the fly-past frame
  (positionZ steps harmlessly on the destruction frame), the depth floor's one-frame window, and the
  probe above; nothing unhandled found.
- [SILENT] disabled via settings — the diff introduces no catch/fallback/default-swallow sites (every
  hunk read); the one default (?? depth) is the documented coherent pose, not an error swallow.
- [DOC] disabled via settings — the Reviewer instead re-verified the load-bearing comments against the
  quarry byte-by-byte (see Independent ROM verification); the one stale-claim risk found was TEA's
  off-label COLSTP citation, already corrected in Dev's finding.
- [SIMPLE] disabled via settings — the one structural addition follows an existing precedent; no
  over-engineering observed in the diff.

### Rule Compliance

Mapped to .pennyfarthing/gates/lang-review/typescript.md (rule-checker ran all 13 + 4 repo rules over
39 instances; Reviewer spot-verified):
- #1 type escapes: compliant (the two test casts are unknown-narrowing with runtime gates, not as-any).
- #2 generics/interfaces: 1 violation — DualZEnemy drops readonly (LOW, test-scoped, routed).
- #3 enums / #6 JSX / #7 async / #9 config / #10 input validation / #13 fix-regressions: N/A to diff.
- #4 null/undefined: compliant — both new optional reads use ??; the one || in the derivation record
  operates on a 0-sentinel where || is correct.
- #5 modules: compliant — inline type modifiers correct; extensionless imports are the repo's bundler
  convention.
- #8 test quality: no as-any/mock/dist violations; the two HIGH coverage findings are recorded above.
- #11 error handling: compliant (no catch sites).
- #12 performance: compliant (three extra 4×4 multiplies per enemy per frame is negligible).
- Repo purity rule: compliant across all 5 touched core files (security specialist enumerated).
- Repo citation rule: compliant across all 7 new/changed constants (rule-checker enumerated).

### Devil's Advocate

If this code is broken, it is broken in one of five ways. One: the ×4 applies to the WRONG MODEL —
the plane spends nearly its whole life facing away (D4=0, the drone model), and the story context
lists PROJECT as the "ground objects + drones" path with a DIFFERENT ×16/×4 composite; if the settled
plane drew through PROJECT, the shipped scale would be wrong in the most common state and every test
would still pass, because the tests pose facingAway:false. I read DRNPIC to kill this: the D4=0 branch
draws the .DRPNT set through PLNABZ, the POINTP-format 3-D path (:4972-4974), not PROJECT — the ×4 is
uniform across both models. Two: the asymmetric Y band could be flipped — nothing in the suite would
notice, and a plane above the boresight would become hittable through its own absence. I probed the
real collides() and the band is oriented correctly (belly blocks above, top wing reaches below). Three:
the 53→52 shell-count re-pin could be laundering a genuine regression behind a plausible sentence —
but the wreck guards still demand a landed kill, the run is stable across repeated executions, and the
mechanism (a wider X window connects a sub-step earlier) moves the number in the observed direction.
Four: the plate test derives its expectation from the same expression as the implementation and can
never fail alone — true, and mitigated only because plane-picture-scale pins the absolute ×4 through
real projection math; the residual (COLLD_POINTS[1..3] literals unpinned) is filed. Five: a future
editor swaps ?? for || — today's guard would not catch it; filed with the discriminating recipe. None
of these is live today; two produced findings.

**Handoff:** To SM for finish-story.
## Impact Summary

**Compiled by SM at finish (the auto-writer emitted no section; built from the Delivery Findings above — see each agent's entries for full detail).**

**Upstream effect — rb4-16 UNBLOCKED.** This story delivered both of rb4-16's prerequisites: AC-2's dual-Z
(`positionZ` on Enemy, spawned with `depth` at P.INDP per STPLNE:2319-2324, stepped by its own +1B delta —
the POSITION Z the PLONSN servo reads at :2776/:2882) and AC-3's screen-scale seam (ROM_SCREEN_HALF/60° FOV
anchored on SETBM 0x300 / SETGRS ±0x220/±0x188 with the bracketing constraint stated). rb4-16 can be re-cut
per the banner at `sprint/context/context-story-rb4-16.md`.

**Both TEA blocking findings were delivered in-story:** the `planeModel` core seam (biplane.ts, composed by
main.ts) and the gun-window↔picture coupling (window re-derived from COLLD — the ROM's fuselage plate,
037007.XXX:602-605, riding CDSSET's PICTURE-Z scale — with the aim-tolerance pin re-baselined). Reviewer
verdict: APPROVED, one round.

**Non-blocking follow-up inventory (12; all filed as Delivery Findings above):**
1. PICTURE Z's own close rate untranscribed — ROM's +10/+11 delta is the PLNZD N.PLNZ/PRPDEL formula
   (~10× faster at GMLEVL 0 than the PLPOSZ rate `depth` keeps); re-timing the engagement is its own story. (Dev)
2. Blimp/wreck/propeller picture scale — TEA's "display-list geometry, likely no scale needed" hypothesis
   was REFUTED by Dev: 037007.XXX defines the same POINTP ×2/×4 storage macro and BLIMP/PIECE0-3/DBPROP ride
   the PLNABZ/YAXIS paths, so the ×4 lift plausibly applies and they draw quarter-size today. Own story
   (re-baselines blimp/wreck suites). (TEA routed; Dev refuted the embedded hypothesis)
3. Drone POSITION-Z seed under PLNXCG unverified — both Zs pinned at DRINZ pending the read. (Dev)
4. Drone collision frame — the ROM uses the constant DRNFRM box (RBARON.MAC:5710-5711, ±0x0C screen units),
   not the plane's projected plate; clone applies the plate uniformly (pre-existing, enlarged). (Reviewer)
5. COLSTP Z pre-gate reads as ±0x80 depth (half a shell count) vs our WINDOW_Z = 1 — DPABS convention needs
   ratification first. (Dev)
6. The `positionZ || P_INDP` guard test is not discriminating (truthy fixtures); rewrite around positionZ: 0. (Reviewer)
7. No boundary coverage of the asymmetric Y band; COLLD_POINTS[1..3] literals unpinned — behaviour verified
   by Reviewer probe (4/4), coverage still owed. (Reviewer)
8. `DualZEnemy` intersection drops `readonly` — one-word test-file fix. (Reviewer)
9. Derivation record could pin CDSSET:5529-5537 + COLSTP:5774 (TEA's original citation was off-label). (Dev)
10. AC-3 FOV prose — DELIVERED and Reviewer-verified (scene.ts); no residue. (TEA)
11. `positionZ` optionality — DELIVERED as specified (0 fixture re-seats). (TEA)
12. AC-5 anisotropy — SETTLED in the Dev Assessment (plane ×4 isotropic; ground path composes to ×8
    isotropic); MAME visual cross-check delegated to user playtest. (Dev)
