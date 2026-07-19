---
story_id: sw7-15
jira_key: sw7-15
epic: sw7
workflow: tdd
---
# Story sw7-15: R7c Death Star finale + authentic picture

## Story Details
- **ID:** sw7-15
- **Jira Key:** sw7-15
- **Workflow:** tdd
- **Stack Parent:** none (depends_on sw7-1, which is DONE)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T09:39:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T08:12:01Z | 2026-07-19T08:13:47Z | 1m 46s |
| red | 2026-07-19T08:13:47Z | 2026-07-19T08:55:21Z | 41m 34s |
| green | 2026-07-19T08:55:21Z | 2026-07-19T09:22:13Z | 26m 52s |
| review | 2026-07-19T09:22:13Z | 2026-07-19T09:39:26Z | 17m 13s |
| finish | 2026-07-19T09:39:26Z | - | - |

## Sm Assessment

**Routing:** New-work setup for sw7-15 (8pt, TDD/phased, star-wars). Board clear — no
blocking PRs, no stale session. Dependency **sw7-1 (timebase) is DONE**, so the finale's
frame-count and cadence constants bake on the authentic 20.508 Hz game frame rather than the
retired TICK_HZ=30. Handing the RED phase to Han Solo (TEA).

**Story shape — three reference clusters, one epic (R7c Death Star finale + authentic picture):**
- **X-006 — 4-phase ring finale:** RED → blue → white ring sequence via ROM routines
  `DCIRCL` + `DRING`, **no rays**, duration **~89 frames / 4.3 s** (at the 20.508 Hz base).
- **X-007 — looming-station prelim:** station enlarges toward the viewer + end music cue.
- **M-010 — authentic 2D vector Death Star:** hand-authored picture `BSHEM`/`BSCIR`/`BSTRN`/
  `BSDSH` at scale **M.=32**, **replacing the procedural 3D sphere** currently drawn.

**Fidelity-story handling (TEA/Dev must honor):** this is an audit-remediation story. Evidence
lives in `star-wars/docs/audit/findings/`; the RED tests should pin the ROM constants (frame
counts, phase order, no-rays, M.=32) against those findings. Fixing a finding = mark it
`remediated_by` and keep `npm test -- citations` green. ROM routine names (DCIRCL, DRING, BSHEM,
BSCIR, BSTRN, BSDSH) are primary-source references, not our identifiers — TEA should locate the
authentic vector data via the gitignored `reference/disasm` AVG picture ROM / historicalsource
`star-wars` WSVROM.MAC, not invent shapes.

**Watch-outs for downstream:** M-010 swaps a whole render model (procedural sphere → authentic
2D vector picture) — expect a fixture blast radius across the Death Star render/approach suites,
same as prior model-swap stories. Any src edit to files cited by `docs/audit/findings/*.json`
will drift the citation line numbers; re-anchor with `tools/audit/reanchor-citations.mjs --write`
(legitimate line-number-only reanchor).

**Gate status:** session + context + feature branch `feat/sw7-15-death-star-finale` all created
and verified. Ready to hand off.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** four CONFIRMED/open findings (M-010, X-006, X-007, X-008) — a real behaviour + render-architecture change, not a chore.

**Test Files:**
- `tests/support/canvas-recorder.ts` — NEW reusable recording canvas: captures per-stroke colour + geometry (segments, arcs), a colour-family classifier, radial-ray / max-radius helpers. The seam-agnostic instrument for the whole story.
- `tests/shell/render.death-star-picture.test.ts` — NEW (M-010, 4 tests): the space-phase Death Star paints the authentic green+white+red palette (not one steel hull), a white equatorial trench chord (BSTRN), a red offset dish (BSDSH); the old `#8a93a8` hull is gone. Isolated to the central disc region (calibrated against the current frame — all current green/red is top-strip HUD).
- `tests/shell/render.death-star-finale.test.ts` — NEW (X-006/X-008/X-007, 6 tests): the finale cycles red→blue→white concentric rings in ROM order, draws NO radial-ray starburst, never rings in amber; still animates past 2.5 s and runs to ~4.3 s then clears; and looms the station large before the rings (driven through the REAL winning port kill). Rings/rays isolated from the "DEATH STAR DESTROYED" banner text by "surrounds the blast centre" (banner text is a one-band strip).
- `tests/core/death-star-body.test.ts` — RE-SEATED: sphere-geometry block retired (superseded by M-010's render contract); the surviving `deathStarPlacement` block kept as a keep-behaviour guard.
- `tests/core/death-star-dish-orientation.test.ts` — DELETED: the 3D +Z recessed-dish suite is wholly obsolete under the flat 2D picture.

**Tests Written:** 10 failing tests covering 4 findings (M-010, X-006, X-007, X-008).
**Status:** RED (failing — ready for Dev). Full suite: **10 failed / 1682 passed / 1692 total across 150 files**; `tsc --noEmit` CLEAN (independently confirmed by testing-runner — grand total cross-checked, no collateral).

### Rule Coverage

| Rule (applicable to a shell/render fidelity story) | Test(s) | Status |
|---|---|---|
| Every test asserts something meaningful (no vacuous) | all 10 — colour families, chord/dish geometry, ring order, ray count, duration band, loom margin | failing (RED) |
| Non-vacuity guards on driven tests | X-007 asserts `deathStarDestroyedAt` not null (the kill landed) + `farSeed > 0` (body renders) before the loom claim; X-006 no-rays asserts rings exist before asserting 0 rays | failing (RED) |
| Core/shell boundary (CLAUDE.md rule #1) | every test drives only the public `render()` / `stepGame()` — no core→shell import, no internal-shape pins | failing (RED) |
| Colour-family + topology, not pixels (sw3-9 repo convention) | palette/ring tests classify by family, geometry by span/offset — never exact hex/vertex | failing (RED) |
| GREEN-ability verified (no false positives that survive the fix) | probed the "no rays" count down from a polluted 52 to a clean 16 (banner excluded); amber-ring count = 3 → both go 0 under arcs/phased colours | verified |

**Rules checked:** the TS lang-review checklist is oriented to backend type-safety (validated constructors, Deserialize bypass, tenant context) — N/A to a Canvas render story; the load-bearing rules here are the test-quality + core/shell-boundary + colour-convention rules above, all covered.
**Self-check:** 0 vacuous tests found. Every `it` has a meaningful assertion; the two "absence" assertions (no rays, no amber) are each paired with a positive existence guard so they cannot pass vacuously.

**Handoff:** To Dev (Yoda) for GREEN implementation. Read the Delivery Findings first — the M-010 draw architecture and the X-007 finale beat are open design choices, the exact ROM literals are cited there, and editing models.ts/render.ts requires a citation reanchor.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/models.ts` — replaced the story-11-7 procedural UV sphere `buildDeathStar` with the authentic 2D vector picture (M-010): three flat `Model3D` exports — `DEATH_STAR` (green BSCIR disc, radius 50), `DEATH_STAR_TRENCH` (white BSTRN chords), `DEATH_STAR_DISH` (red BSDSH loop) — plus `picture()`/`pictureSegments()` builders. `DEATH_STAR` stays in the `MODELS` registry.
- `src/shell/render.ts` — (M-010) `drawDeathStar()` strokes the three parts in green/white/red at `deathStarSeat()`, replacing the single steel `drawWireframe(DEATH_STAR,…)`; (X-007) `deathStarSeat()` looms the station large + enlarging while the finale plays; (X-006) rewrote `drawDeathStarBoom` to the 4-phase red→blue→white concentric-ring animation with NO rays; (X-008) `DEATH_STAR_BOOM_SECONDS = 89 / TICK_HZ` (~4.34 s).
- `docs/audit/findings/pair-models.json`, `pair-explosions.json` — marked M-010/X-006/X-008 `remediated_by: sw7-15`; reanchored 14 drifted citations (`tools/audit/reanchor-citations.mjs --write`, line-number only).

**Tests:** 1692/1692 passing (GREEN) across 150 files — the 10 sw7-15 reds now pass, the re-seated `death-star-body` placement block + the citation gate green, no collateral. `tsc --noEmit` clean.
**Branch:** feat/sw7-15-death-star-finale (star-wars)

**Handoff:** To Reviewer (Obi-Wan). See the Dev Delivery Findings — the picture scale / loom tuning / blue hex are render eyeball concerns (confirmed sane via a headless layout probe, not viewed in a browser), and BSNSD/BSFRM are an out-of-scope fidelity follow-up.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): M-010's DRAW ARCHITECTURE is an open design decision — a `Model3D` carries no colour, so the authentic green-body / white-trench / red-dish picture cannot be one single-glow model. Affects `src/core/models.ts` + `src/shell/render.ts` (Dev picks: a colour field on the model, three sub-models each with its own glow, or a dedicated 2D picture draw — the render tests accept any; consider an Architect consult, this is a genuine draw-path change). *Found by TEA during test design.*
- **Gap** (non-blocking): X-007's finale-BEAT architecture is open (a core `finale` phase/timer vs a shell pre-warp dwell). NOTE the finale MUSIC is ALREADY wired — `sim.ts:1256` emits `{type:'tune', tune:'finale'}` (PMEND) at the detonation (sw7-8); X-007's MISSING part is the VISUAL loom, not the music. Affects `src/shell/render.ts` (and possibly `src/core/state.ts`/`sim.ts` if a hold-beat is added — today `clearRun` warps STRAIGHT to the next far space seed, which is exactly why the loom is absent). *Found by TEA during test design.*
- **Improvement** (non-blocking): exact ROM literals routed to Dev-with-citation (a decode of a true constant is still a decode — pin from the source, don't invent). Death Star picture: BSHEM/BSCIR green circle radius 50 @ `M.=32`, BSTRN white trench chord `AOFF 49,10 / AON -49,-9` + `AOFF -49,-10 / AON 49,9`, BSDSH red offset dish (~18-pt loop centred ~(22,27) picture units), plus BSNSD inside-dish + BSFRM farmland (WSVROM.MAC:2449, `.RADIX 10` in this region — verify per file). Finale colours VGCRED/VGCBLU/VGCWHT (WSXPLD.MAC:817/839/898/970); finale length PH1+PH2+PH3 = 31+27+31 = 89 frames @ 20.508 Hz. Source: `~/Projects/star-wars-1983-source-text`. *Found by TEA during test design.*
- **Conflict** (non-blocking, IMPORTANT): editing `src/core/models.ts` (buildDeathStar, cited by M-010 at :781) and `src/shell/render.ts` (cited by X-006 at :601, X-008 at :887) will drift the citation line numbers and redden `npm test -- citations`. Affects `docs/audit/findings/`: run `node tools/audit/reanchor-citations.mjs --write` (legit line-number reanchor, NOT laundering) and mark M-010/X-006/X-008 `remediated_by: sw7-15`. *Found by TEA during test design.*
- **Question** (non-blocking): X-007's "star-streak fly-away escape" (SMVDX1/2/3) is explicitly OUT of scope — the finding notes it lives in a `.REPT 0` block and never assembled, so do NOT model it. The DX1 prelim is enlarge-toward-viewer only. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the authentic Death Star picture's BSNSD (red inside-dish detail) and BSFRM (green farmland surface hatching) sub-pictures are NOT ported — only the green disc (BSCIR), white trench (BSTRN) and red dish outline (BSDSH). Affects `src/core/models.ts` (add two more flat picture models + draw them in render's `drawDeathStar`) — a follow-up fidelity story, low-risk polish. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the Death Star picture SCALE (`DEATH_STAR_PIC_SCALE`=10.4), the finale LOOM tuning (`DEATH_STAR_LOOM_SECONDS`=1.2 s, `DEATH_STAR_LOOM_MAX_SCALE`=4.0×) and the boom BLUE hex (`#3355ff`) are tuned display values, not ROM-derived. Affects `src/shell/render.ts` — recommend an eyeball in the dev server (space approach + a won trench run's finale) to confirm the picture reads at a good size, the trench is horizontal, the dish sits in the upper quadrant, and the loom "very large" enlarge + red→blue→white rings feel right (repo convention: scale/orientation/colour are render eyeball concerns). Confirmed sane via a headless layout probe (green disc r≈185px centred; white trench 364×74 horizontal; red dish offset upper-right), but not viewed in a browser. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking, FIXED in review): a transcription swap in `DEATH_STAR_BODY_PTS` (BSCIR indices 26/27 were `(-50,0),(-49,10)` but the ROM order is `(-49,10),(-50,0)`) crossed one rim edge — a kink on the disc's left edge invisible to the seam-agnostic span/colour tests. Corrected in `src/core/models.ts` + added a mutation-proven monotonic-winding guard (`render.death-star-picture.test.ts`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, FIXED in review): `GLOW_FOR['Death Star']` (`wireframe.ts`) was left as the old steel `#8a93a8` — stale for M-010; the dev contact sheet (`contactSheet.ts` reads it dynamically) would draw the body steel. Updated to the VGCGRN green `#22e600`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the DX1 loom OVERLAPS the ring explosion (both driven from `deathStarDestroyedAt`) rather than strictly preceding it as the ROM sequences DX1→DX2/DX3. A strict prelim would push the finale past the X-008 89-frame-from-stamp duration; the ROM also draws a Death Star during the rings (VEWDX2 miniature), so the overlap reads correctly. Affects `src/shell/render.ts` — a fidelity nuance for a future story, not a defect. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Pinned the whole story seam-agnostically through the PUBLIC render()/stepGame() path, not models.ts internals**
  - Spec source: context-story-sw7-15.md (title), pair-models.json M-010, pair-explosions.json X-006/X-007/X-008
  - Spec text: "authentic 2D vector Death Star BSHEM/BSCIR/BSTRN/BSDSH at M.=32 (M-010, replaces the procedural 3D sphere)"
  - Implementation: a recording canvas (tests/support/canvas-recorder.ts) reads strokes from render(); tests assert colour FAMILY (green/white/red, red→blue→white) + topology (a wide white chord, an offset red loop, concentric rings vs radial rays), never exact hex or vertex indices
  - Rationale: M-010 is a draw-ARCHITECTURE change and the FORM is Dev's open decision (a colour on the model, three sub-models, or a picture draw). Pinning models.ts internals would force one architecture; the repo convention is "colour-family + topology, not pixels" (sw3-9, and death-star-body 11-7's own seam-agnostic probe)
  - Severity: minor
  - Forward impact: exact vertex/scale literals are routed to a cited Delivery Finding + the citation gate, not unit-pinned

- **Retired death-star-body.test.ts's sphere-geometry block and DELETED death-star-dish-orientation.test.ts (model-swap re-seat)**
  - Spec source: pair-models.json M-010; tests/core/death-star-body.test.ts (story 11-7); tests/core/death-star-dish-orientation.test.ts (sw3-10)
  - Spec text: M-010 — "Ours is a procedurally-generated 3D UV sphere … the authentic look is a green disc + white trench line + red dish + green farmland — architecturally different from a lat/long sphere"
  - Implementation: removed the "is a sphere / on-shell 0.9 / lat-long rings / single-connected / bilateral-symmetry" assertions and the whole recessed-+Z-dish suite; kept the surviving deathStarPlacement (space-approach) block as a keep-behaviour guard
  - Rationale: a faithful flat 2D picture CANNOT satisfy the sphere assertions (flat, several disconnected sub-pictures, offset dish); leaving them would strand Dev between M-010 and a suite demanding a sphere (the "silence the legacy mechanism" rule). The geometry contract now lives in render.death-star-picture.test.ts
  - Severity: moderate
  - Forward impact: Dev must NOT try to keep the sphere geometry green; the model FORM is free to change (see Delivery Findings)

- **X-007 (looming prelim) pinned as a WEAK FLOOR, not the exact enlarge scale / frame timing / phase**
  - Spec source: pair-explosions.json X-007 (NO_COUNTERPART, verdict null); WSMAIN.MAC:3386
  - Spec text: "the Death Star is seeded 'AT VERY LARGE' … VWDTHB draws it ENLARGING toward the viewer … only then does PH$DX2 call BGXPLN"
  - Implementation: one test drives the REAL winning port kill, steps the finale window, and asserts the Death Star body footprint peaks at > 1.5× the far-seed footprint (it looms markedly larger than a fresh far Death Star) — nothing about exact scale, frame count, or whether the beat is a core phase or a shell dwell
  - Rationale: the finale beat does not exist yet and its architecture is open (the "AC on a phase that doesn't exist → pin a weak floor, route the duration" rule). The exact enlarge law + the DX1/DX2 ordering go to a Delivery Finding
  - Severity: moderate
  - Forward impact: the loom's exact scale/timing is Dev-with-Architect's to resolve; the test only requires an observable loom before the rings

- **X-008 (duration) pinned as an observable band, not the exact 89-frame count**
  - Spec source: pair-explosions.json X-008 refutation ("PH1/PH2/PH3 = 31/27/31 = 89 frames ≈ 4.3 s at 20.508 Hz")
  - Spec text: "the ring animation is ~89-90 frames ~= 4.3 s at 20.508 Hz … reinforcing '> 2.5 s'"
  - Implementation: assert the finale still animates at 2.6 s and 3.5 s and ~4.0 s (dead today at the 2.5 s cap) and has cleared by ~5.3 s; the exact 89 frames is a comment + routed to the citation gate
  - Rationale: a hard "exactly 89 frames" pin would reject faithful ports off by a frame and couples to Dev's frame→seconds mapping; the band bites on today's 2.5 s cap and on any gross retune miss
  - Severity: minor
  - Forward impact: Dev derives the exact 89-frame length from WSXPLD.MAC and keeps the citation gate green

### Dev (implementation)

- **M-010 draw architecture: three separate flat picture models, each stroked in its own colour (resolves TEA's open seam)**
  - Spec source: session TEA Delivery Finding ("M-010's DRAW ARCHITECTURE is an open design decision — a Model3D carries no colour")
  - Spec text: "Dev picks: a colour field on the model, three sub-models each with its own glow, or a dedicated 2D picture draw"
  - Implementation: `models.ts` exports three flat (z=0) `Model3D` pictures — `DEATH_STAR` (green BSCIR circle), `DEATH_STAR_TRENCH` (white BSTRN chords), `DEATH_STAR_DISH` (red BSDSH loop); `render.ts drawDeathStar()` strokes each with its own glow (green/white/red). Chose sub-models over a colour field so `Model3D`/`drawWireframe`/the registry stay unchanged (least churn).
  - Rationale: `drawWireframe` strokes one colour per call; three models is the minimal change that yields the three-colour picture without touching the model type or the glow pipeline.
  - Severity: minor
  - Forward impact: only `DEATH_STAR` (the green body) is in the `MODELS` registry; the trench/dish are drawn directly by render (not registry entries).

- **Partial picture port — BSHEM / BSNSD / BSFRM omitted; body+trench+dish only**
  - Spec source: pair-models.json M-010 ("BSHEM/BSCIR … BSTRN … BSDSH+BSNSD … and BSFRM green 'farmland'")
  - Spec text: the authentic picture also has BSHEM (upper hemisphere — subsumed by the full BSCIR circle for a billboard), BSNSD (inside-dish red detail) and BSFRM (green farmland surface hatching)
  - Implementation: ported the three parts the tests + the headline look require — green disc (BSCIR), white trench (BSTRN), red dish outline (BSDSH). Left BSNSD (dish interior) and BSFRM (farmland) unported.
  - Rationale: minimalist — those two add detail inside/around the existing parts and no test requires them; adding them is low-risk fidelity polish, not core to M-010's "green disc + white trench + red dish, not a sphere" claim.
  - Severity: minor
  - Forward impact: a follow-up fidelity story can add BSNSD + BSFRM (Delivery Finding filed).

- **X-007 loom implemented as a SHELL seat override, not a core finale phase (resolves TEA's open seam)**
  - Spec source: session TEA Delivery Finding ("X-007's finale-BEAT architecture is open — a core finale phase/timer vs a shell pre-warp dwell")
  - Spec text: "the MISSING part is the VISUAL loom, not the music … `clearRun` warps STRAIGHT to the next far space seed"
  - Implementation: `render.ts deathStarSeat()` overrides `deathStarPlacement` while `deathStarDestroyedAt` is recent — seats the Death Star NEAR and ramps its scale up over `DEATH_STAR_LOOM_SECONDS`=1.2 s to `DEATH_STAR_LOOM_MAX_SCALE`=4.0 (enlarging toward the viewer). No core change: purely a render-derived seat, honouring the core/shell boundary. The finale music (PMEND) is already core-cued (sim.ts, sw7-8).
  - Rationale: the loom is a display concern (the sim already warps to the next wave and rides `deathStarDestroyedAt` across it); a shell seat keeps the core untouched and deterministic.
  - Severity: moderate
  - Forward impact: the loom's exact enlarge law / scale (1.2 s, 4.0×) is a tuned display value, not a ROM byte — an eyeball/Reviewer concern (Delivery Finding filed).

- **Display scale + boom colours are shell display values, not ROM units**
  - Spec source: repo convention (CLAUDE.md — "models.ts vertices are raw ROM units 1:1"; colours are eyeballed to cabinet screenshots)
  - Spec text: M.=32 picture multiplier; VGCGRN/VGCWHT/VGCRED/VGCBLU
  - Implementation: `models.ts` keeps the raw ROM picture (radius 50); `render.ts DEATH_STAR_PIC_SCALE`=10.4 scales it to the on-screen body size (~the retired sphere's R=520). Boom blue is `#3355ff` (a true blue — an earlier teal `#3aa0ff` read as cyan); green/white/red reuse the picture glows.
  - Rationale: keeps models.ts faithful (raw units) and puts display scale/colour in the shell where the boundary places it.
  - Severity: minor
  - Forward impact: exact VGCBLU hex is an eyeball/Reviewer concern.

### Reviewer (audit)

TEA deviations:
- **Seam-agnostic pinning through render()/stepGame(), not models.ts internals** → ✓ ACCEPTED: correct for an open draw-architecture; matches repo convention (sw3-9, 11-7).
- **Retired sphere geometry + deleted dish-orientation suite (model-swap re-seat)** → ✓ ACCEPTED: a faithful flat picture cannot satisfy the sphere assertions; the placement block was correctly kept as a keep-behaviour guard; coverage moved to the render + geometry-guard tests (verified coverage did not silently drop).
- **X-007 loom pinned as a weak floor** → ✓ ACCEPTED: the finale beat's architecture was genuinely open; a weak floor + routed literals is the right call.
- **X-008 duration pinned as an observable band** → ✓ ACCEPTED: a hard 89-frame pin would couple to the frame→seconds mapping; the band bites correctly.

Dev deviations:
- **M-010 as three sub-models, one glow each** → ✓ ACCEPTED: least-churn resolution of the open seam; `drawWireframe` is one-colour-per-call, so three models is minimal and correct. Registry invariants verified to still hold.
- **Partial picture port (BSNSD/BSFRM omitted)** → ✓ ACCEPTED: no test requires them, low-risk fidelity polish; correctly filed as a follow-up.
- **X-007 loom as a shell seat override, no core change** → ✓ ACCEPTED: the loom is a display concern; the core/shell boundary is honoured (verified: `deathStarSeat` is a pure read of state).
- **Display scale + boom colours in the shell** → ✓ ACCEPTED: raw ROM units stay in models.ts; scale/colour live in the shell per the boundary. (Note: the initial teal blue was corrected during GREEN; the stale contact-sheet steel colour corrected during review.)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests 1692→1693 green, tsc clean, tree clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary/edge cases covered by my own review (age<0 guard, progress boundaries, loom clamp) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error paths in a pure render change; verified no swallowed errors |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by rule-checker (rule 8, clean) + my own read (no vacuous; the two "absence" pins have existence guards; the new geometry guard is mutation-proven) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments verified accurate (ROM citations, the "overlap" comment); the stale steel comment was corrected |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — rule-checker rules 1/2/5 (types) clean; no unsafe casts introduced in src |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no external input / no secrets / local canvas game (rule-checker rule 10 N/A) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — removed dead code (buildDeathStar/DEATH_STAR_GLOW/BOOM_RINGS/RAYS); the one dead-ish item (GLOW_FOR entry) was found by rule-checker + corrected |
| 9 | reviewer-rule-checker | Yes | findings | 1 (GLOW_FOR['Death Star'] stale/dead — wireframe.ts:31) | confirmed 1, fixed (updated steel→green); all 16 rules / 32 instances otherwise compliant |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and pre-filled)
**Total findings:** 3 confirmed (1 from rule-checker + 2 from my own adversarial read: the BSCIR kink and the loom/rings overlap nuance), 0 dismissed, 0 deferred blocking. The 2 code defects (kink, stale colour) were FIXED during review; the overlap is a non-blocking fidelity nuance.

## Reviewer Assessment

**Verdict:** APPROVED

Two real defects were found by adversarial review beyond the green tests and FIXED (then re-verified: 1693/1693 green, tsc clean, citation gate green); no Critical or High remains.

**Dispatch tags:**
- `[RULE]` (rule-checker, ran): `wireframe.ts:31` stale `GLOW_FOR['Death Star']` steel colour — CONFIRMED, fixed → green. All other rules compliant (core/shell purity, raw-ROM units, colour-in-shell, no unsafe casts, no vacuous tests, TICK_HZ TDZ-safe).
- `[EDGE]` (disabled — self-covered): the `age >= 0 && age <= DEATH_STAR_BOOM_SECONDS` loom guard, the `bump()` window boundaries (no div-by-zero for the three literal windows), and the `loomT` clamp at 1 all handle their boundaries. VERIFIED.
- `[SIMPLE]` (disabled — self-covered): the diff removes more than it adds where it can (sphere builder + 3 dead constants gone); `drawDeathStarBoom`'s `bump`/`phase` closures are proportionate. No over-engineering.
- `[TEST]` (disabled — self-covered + rule-checker rule 8): the sw7-15 tests are substantive; the new no-kink guard is mutation-proven (fails on the swap, passes on the fix).
- `[DOC]` (disabled — self-covered): comments cite ROM sources accurately; the one stale steel comment was corrected.
- `[TYPE]` (disabled — self-covered + rule-checker rules 1/2/5): `Model3D` readonly honoured; no `as any`; the two `as unknown as` are documented test idioms.
- `[SILENT]` / `[SEC]` (disabled — N/A): a pure deterministic render change with no error paths, no external input, no secrets.

**Data flow traced:** `state.deathStarDestroyedAt` (stamped in `sim.ts` on the port kill, core) → `render()` reads it → `deathStarSeat()` (loom) + `drawDeathStarBoom()` (rings). The core owns the stamp and the `finale` tune event; the shell only derives the seat/effect. The core/shell boundary holds — `deathStarSeat`/`drawDeathStar` are pure reads of state; models.ts is literal tables. Safe.

**Pattern observed:** three flat picture `Model3D`s stroked in their own glow (`drawDeathStar`, render.ts:313) — the right resolution of "a Model3D has no colour"; least churn, boundary-clean.

**Error handling:** no error paths (pure render). Boundary inputs handled: negative/zero age (guard falls through to `deathStarPlacement`), `phaseKills` past quota (clamped in `deathStarPlacement`), progress past 1 (boom gated off).

### Rule Compliance

Project rules (star-wars/CLAUDE.md) enumerated over the changed code:
- **Rule 1 — core/shell boundary (PURE core):** `models.ts` additions (`picture`, `pictureSegments`, the three `_PTS` tables, `DEATH_STAR`/`DEATH_STAR_TRENCH`/`DEATH_STAR_DISH`) are literal arrays + pure `.map` — no DOM/`Date.now`/`Math.random`/`requestAnimationFrame`/shell import. `render.ts` (`deathStarSeat`, `drawDeathStar`, boom) is shell, reads state, mutates nothing. COMPLIANT (every added core symbol checked).
- **Rule 2 — models.ts vertices are raw ROM units:** the three `_PTS` tables are raw picture units (radius 50, `30²+40²=50²`); the display scale (`DEATH_STAR_PIC_SCALE`=10.4) lives in render.ts, not baked into geometry. COMPLIANT.
- **Rule 3 — colours are a shell concern:** all four glows (`DEATH_STAR_BODY/TRENCH/DISH_GLOW`, `BOOM_BLUE_GLOW`) declared in render.ts; `Model3D` carries no colour; the contact-sheet colour is in wireframe.ts (shell). COMPLIANT.
- **TypeScript lang-review (13 checks):** rule-checker ran exhaustively — all pass; no `as any`, `??` used correctly for the optional `scale`, no `.js`-extension issue (bundler resolution), no vacuous tests.

### Devil's Advocate

Suppose this code is broken. Where would it bite? First, the finale is driven off `state.deathStarDestroyedAt` and `state.t`; if a future story stamps `deathStarDestroyedAt` in a phase other than the space warp, the loom would seat a giant Death Star in that phase — but `deathStarSeat` only fires the loom on the space-phase draw path and `state.mode === 'playing'`, so a stray stamp in, say, the surface phase does nothing (the surface branch never calls `drawDeathStar`). Second, the loom scales the body to 4.0× at z=-3500; at that size a chunk of the green circle projects off-screen — a confused player might read the finale as "a green arc filling the view" rather than a station. That is a deliberate "very large" (X-007's "AT VERY LARGE"), and the rings bloom on top, so it reads as the station blowing up; but it is exactly the kind of scale/orientation call the repo defers to an eyeball, and it has NOT been viewed in a browser — only a headless layout probe (green disc r≈185 at approach; looming to ~270–310px in the finale). A stressed reviewer should insist on the dev-server eyeball before shipping to R2. Third, `bump()` divides by `(peak-start)` and `(end-peak)`; the three current windows have non-zero denominators, but a careless future edit that sets `peak==start` yields `NaN` alpha, and `NaN <= 0.02` is false, so a phase would draw with `globalAlpha = NaN` (silently nothing painted). That is a latent foot-gun, not a current bug — noted, not blocking. Fourth, the seam-agnostic tests proved unable to see the BSCIR point-order swap (span/colour are order-blind) — a real transcription defect slipped the whole TEA/Dev pipeline and was caught only here; the new monotonic-winding guard closes that specific gap, but the dish (BSDSH) and trench (BSTRN) orders are pinned only by their palette/geometry tests, not a winding guard, so a future edit could reintroduce a kink there. I verified both against the ROM by hand (dish and trench orders are correct), but the guard covers only the body circle. Fifth, a malicious/edge input: `w` or `h` of 0 would make `maxR=0` and every ring `r<=8` skip — no crash, just nothing drawn, acceptable. On balance the code is correct and the two found defects are fixed; the residual risks are the un-eyeballed visual scale and the latent `bump` denominator, both non-blocking.

**Handoff:** To SM for finish-story.