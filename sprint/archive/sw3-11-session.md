---
story_id: "sw3-11"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story sw3-11: Surface phase geometry fidelity

## Story Details
- **ID:** sw3-11
- **Jira Key:** (no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T18:04:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T17:17:51Z | 2026-07-11T17:20:09Z | 2m 18s |
| red | 2026-07-11T17:20:09Z | 2026-07-11T17:49:16Z | 29m 7s |
| green | 2026-07-11T17:49:16Z | 2026-07-11T17:59:12Z | 9m 56s |
| review | 2026-07-11T17:59:12Z | 2026-07-11T18:04:51Z | 5m 39s |
| finish | 2026-07-11T18:04:51Z | - | - |

## Sm Assessment

**Story:** sw3-11 — 5pt `bug`, p2, star-wars, `tdd` (phased) workflow. Branch
`feat/sw3-11-surface-tower-geometry-fidelity` cut off `develop` (gitflow).

**Scope (from title — no AC in sprint YAML; TEA authors AC in RED):**
Re-author `SURFACE_TOWER` as the authentic *tall waisted yellow column with a
white cap* (+ red ground bunkers) from the surface ROM. Current model is a
squat wide 512×96 box that reads as a red ship-hull — wrong silhouette entirely.

**Quarry pointers for O'Brien (TEA):**
- **Current geometry to replace:** `star-wars/src/core/models.ts:295` —
  `export const SURFACE_TOWER: Model3D` (see the RE-AUTHORED note at models.ts:16
  and the white-cap comment at models.ts:334, TOWER_HEIGHT=96).
- **Consumers that draw it** (expect these to need re-tuning, not rewiring):
  `star-wars/src/shell/render.ts:264` (drawWireframe … TURRET_GLOW) and
  `star-wars/src/shell/debug-overlay.ts:176`.
- **Tower *counts* per wave are already ROM-faithful** from sw3-3
  (`state.ts` `SURFACE_TOWERS_BY_WAVE` / `towersForWave`) — this story is *shape*,
  not count. Don't disturb that.
- **ROM quarry:** `star-wars/reference/disasm/Object_3D_Data.asm` and
  `StarWars_annotated.lst` (the local disasm; the title's "WSVROM.MAC" is the
  historical source name). Watch the AVG-vectors gotcha seeded in the sidecars.

**Gotchas to carry in (from prior sw3 work):**
- Stroke-/edge-counting render tests will likely break when the model changes —
  re-measure, don't paper over.
- Re-measure any pixel/height-tuned gaps against the new model's actual extents;
  don't reuse the old box's dimensions.
- Read `sprint/archive/sw3-3-session.md` (and sw3-9) Delivery Findings before RED.

**Routing:** phased tdd → hand off to **tea** for RED. No blockers.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5pt geometry-fidelity bug in the deterministic core + render palette — squarely TDD.

**Ground truth recovered (the RED spec):** original Atari source
`historicalsource/star-wars` @ `5355b76` — NOT the local disasm:
- `WSOBJ.MAC` `.WP GND` ("GROUND LASAR TOWER", `.S=30.*4`): profile (h,r) =
  (0,8) (6,6) (14,5) (52,4) (58,4) — a 58×16 (~3.6:1) tapering column with
  3-point (front/left/right) cross-sections.
- `WSOBJ.MAC` `.WGD TWR/BNK/STB`: executable draw routines. TWR = 3 vertical
  profile polylines + the 52→58 cannon/hat section; BNK = base+near-bottom
  rings only ("SHORTY", 6 high × 16 wide); STB = column, no hat.
- `WSGRND.MAC` `GDVIEW`: body `VGCYLW` (yellow), hat `VGCWHT` ("DRAW IT
  SPECIAL WHITE"), lone undamaged bunker `VGCRED`.
- `WSGRND.MAC` maze macros: BUNKER entries never increment `.TWRS` — bunkers
  are **tower-quota-neutral** (critical for sw3-3's byte_98CB fidelity).
- The current model's claimed source, local-disasm `Object_10`, is trench
  furniture (base rect identical to `Obj_Trench_Squares`) — a misidentification.

**Test Files:**
- `star-wars/tests/core/surface-tower-geometry.test.ts` — NEW. Silhouette
  contract (scale-invariant ratios): ≥2.5:1 composite aspect, ≥4 three-point
  ring levels, 8→6→5→4 non-increasing taper (base ≥1.5× top), grounded,
  connected; white cap exists / short (≤20% H) / narrow (≤60% base r) /
  seated at the summit; bunker in MODELS registry, shorty (h ≤ w/2, ≤ H/4),
  ≥2 three-point rings narrowing up; TOWER_HEIGHT === drawn composite peak
  (WYSIWYG muzzle — also catches today's 96-vs-120 cube drift).
- `star-wars/tests/core/surface-bunkers.test.ts` — NEW. Sim contract:
  deterministic surface runs spawn both kinds (`kind?: 'tower' | 'bunker'`
  on Turret, absent = tower for sw2-3 back-compat); bunker kills do NOT
  advance `phaseKills` and can never clear the phase; bunkers stay shootable;
  kindless/tower kills still count.
- `star-wars/tests/shell/render.surface-tower-fidelity.test.ts` — NEW.
  GDVIEW palette via the sw2-3 mocked-drawWireframe idiom: column yellow
  (not the red ship-hull), a white cap element on towers, bunker-kind sites
  draw a /bunker/i model in red and wear no white cap.
- `star-wars/tests/core/models.test.ts` — REVISED. The 8-4 tower
  ring-closure guard → connectivity (8-10 precedent): the cabinet never
  closes the 3-point cross-sections into triangles; forcing closure would
  fabricate horizontal bands. Death Star surface / trench / port guards
  untouched.

**Tests Written:** 27 in the three new files (19 RED drivers + 8 passing
guards/self-checks) + the revised guard. **Status: RED verified** by
testing-runner (run `sw3-11-tea-red`): 19 failing as designed, typecheck
clean, **zero regressions** (692 pre-existing tests pass; models.test.ts
35/35). Committed `9b0ee2f` on `feat/sw3-11-surface-tower-geometry-fidelity`.

### Rule Coverage

No `.pennyfarthing/gates/lang-review/`, `.claude/rules/`, or `SOUL.md` exist
in this project — the binding rules are star-wars/CLAUDE.md's core contract:

| Rule | Test(s) | Status |
|------|---------|--------|
| Core determinism (seeded RNG only) | `spawning is deterministic: same seed, same kinds sequence` | guard (drives GREEN mechanism) |
| Core purity (no DOM/time in core) | geometry suite imports core modules in node env — any DOM touch throws | enforced structurally |
| Back-compat fixtures (sw2-3 bare `{pos}`) | `destroying a kindless (legacy) entry still advances phaseKills` | passing guard |
| WYSIWYG render/sim coupling | `TOWER_HEIGHT equals the tallest drawn point` | failing (driver) |
| Test-quality (no vacuous asserts) | self-check pass: every test asserts values/ratios; helper self-checks guard the guards (`ringLevels`, color classifiers) | done |

**Self-check:** 0 vacuous tests found; 2 helper self-check suites added
(profile detector, color classifiers) per the models.test.ts idiom.

**Handoff:** To Julia (Dev) for GREEN. Key implementation notes: port the
`.WP GND` points verbatim (drop the (0,0,0) anchor per convention, pick world
scale by eyeball — ROM `GD$MDT` puts the ship's skim height ≈ mid-tower, so
H≈2×SKIM_ALTITUDE≈240 is the authentic feel); author edges from the `.WGD`
draw routines (3 profile polylines + cap outline + partial cannon-bottom
ring — do NOT close cross-section triangles); cap must be a separate model
(one stroke color per drawWireframe); update `TOWER_HEIGHT` to the new peak;
`kind` decision must come from the state RNG. Expect `render.surface-tower-cube.test.ts`
(sw2-3) to stay green — its yellow assertion is satisfied by the new yellow
column; if Dev retires TOWER_CUBE, that file's intent transfers to the new
cap tests and it can be updated with Reviewer's blessing.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (star-wars):**
- `src/core/models.ts` — SURFACE_TOWER re-authored from WSOBJ.MAC `.WP GND`
  (12 verts: four 3-point rings at y 0/24/56/208, r 32/24/20/16; 13 edges =
  the `.WGD STB` three profile polylines). NEW `TOWER_CAP` (the VGCWHT
  cannon/hat, 208→232, `.WGD TWR` white strokes) and NEW `SURFACE_BUNKER`
  (the `.WGD BNK` shorty, 24×64). TOWER_CUBE retired. Cap + bunker join the
  MODELS registry; header + provenance comments corrected (Object_10 is
  trench furniture, per the TEA Conflict finding).
- `src/core/state.ts` — `Turret.kind?: 'tower' | 'bunker'` (absent = tower,
  ROM TGD$PC mirror); `TOWER_HEIGHT` 96 → 232 (the drawn composite peak —
  WYSIWYG muzzle; SKIM_ALTITUDE ≈ mid-tower per GD$MDT);
  `BUNKER_SPAWN_CHANCE = 0.3` (≈ the ROM maze mix).
- `src/core/sim.ts` — spawn draws kind from the seeded RNG; the scroll map
  spreads the source object so `kind` survives frames; bunkers excluded from
  the armed pool; kill loop counts `towerKills` separately —
  `phaseKills += towerKills` only (bunkers shootable but quota-neutral).
- `src/shell/render.ts` — GDVIEW palette: `TOWER_GLOW` yellow column,
  `CAP_GLOW` white cap, bunker-kind sites draw SURFACE_BUNKER in the shared
  vector red (TURRET_GLOW). Per-kind draw branch.

**Tests:** 711/711 passing (GREEN — run `sw3-11-dev-green`), `tsc --noEmit`
clean. All 19 RED drivers now pass; zero regressions (the sw2-3
`render.surface-tower-cube.test.ts` stays green — its yellow assertion is
satisfied by the yellow column, its tall-structure assertion by the 232 peak).
No GameEvent census changes (bunker deaths reuse `enemy-death`/'turret').

**Branch:** `feat/sw3-11-surface-tower-geometry-fidelity` (pushed; commits
`9b0ee2f` RED, `9bf09df` GREEN)

**Eyeball note for the Reviewer:** per the epic's geometry convention, the new
tower/cap/bunker want a first-render look in the dev server (`npm run dev` →
surface phase) — structural tests can't judge orientation/scale feel. The
column is now 64 wide × 232 tall (was 512 × 96), so the surface reads very
differently — that is the point of the story.

**Handoff:** To The Thought Police (Reviewer) via TEA verify.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (711/711 GREEN, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([EDGE] observations) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([SILENT] observation) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([TEST] observation) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([DOC] observations) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([TYPE] observation) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([SEC] observation) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([SIMPLE] observation) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — no lang-review checklist exists; CLAUDE.md conventions checked by Reviewer ([RULE] observation) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via settings)
**Total findings:** 0 confirmed from subagents; Reviewer's own analysis below yields 2 Medium + 4 Low observations, none blocking

## Reviewer Assessment

**Verdict:** APPROVED

**Independent transcription audit (the heart of this review):** I re-derived all
three edge lists by hand from the ROM draw code quoted in the session (WSOBJ.MAC
`.WGD STB/TWR/BNK` stroke sequences, ROM 1-based point indices → model 0-based):
SURFACE_TOWER's 13 edges are exactly the STB three-profile-polyline walk
(`models.ts:322-329`), TOWER_CAP's 7 edges exactly the TWR white section incl.
the partial cannon-bottom ring (`models.ts:377-384`), SURFACE_BUNKER's 8 edges
exactly the BNK walk incl. the BDRAWTO 14,15 cross-stroke (`models.ts:407-415`).
Vertices are the `.PGND` profile ×4 with the anchor dropped — (0,32)(24,24)
(56,20)(208,16)(232,16) matches (0,8)(6,6)(14,5)(52,4)(58,4) exactly. This is a
faithful port, not an approximation.

**Data flow traced:** seeded `rng` → `spawnTurret` draws x then kind
(`sim.ts:820-825`, both from the state RNG — core purity holds) → `kind` rides
the scroll map via spread (`sim.ts:381-385`, the field-stripping trap was
avoided) → render branches per kind (`render.ts:268-273`) → kill loop gates
`towerKills` on `kind !== 'bunker'` (`sim.ts:434`) → `phaseKills` advances by
towers only (`sim.ts:469`). Polarity is consistent everywhere: absent kind ==
tower in the armed filter, the kill counter, AND the render branch — legacy
`{pos}` fixtures behave identically in all three.

**Observations (all 8 specialist domains assessed):**
- `[EDGE]` [MEDIUM, non-blocking] Bunkers occupy MAX_TURRETS (4) slots but are
  quota-neutral, so clearing wave 1's 22 towers now needs ~31 spawns on average
  — the surface phase runs ~40% longer wall-clock. Authentic direction, but
  pacing wants a playtest look (`sim.ts:388`, `state.ts:283`).
- `[EDGE]` [LOW] With p=0.3 per spawn, a transient all-bunker board (4/4) fires
  nothing until a tower rotates in (~0.8% of windows). ROM wave 2 is all-bunker
  and MAY fire — already logged as the bunker-fire open Question.
- `[EDGE]` [MEDIUM, non-blocking] TURRET_HIT_RADIUS stays 200 around a column
  now only 32 units in radius (was ±256×±192 slab) — bolts passing ~150 units
  wide of the drawn tower still kill it. Unchanged constant, but the visual
  generosity gap is new. Logged as a Delivery Finding for a tuning follow-up.
- `[SILENT]` [VERIFIED] No swallowed errors introduced: the diff adds no
  try/catch, no fallbacks; all new branches are total (`kind !== 'bunker'` is
  exhaustive over the optional union) — `sim.ts:401-404,434`, `render.ts:268`.
- `[TEST]` [LOW] `surface-tower-geometry.test.ts:149` keeps a
  `findAnywhere(/tower\s*cube/i)` composite fallback that is now permanently
  dead (TOWER_CUBE retired) — harmless, self-documents the transition; the
  determinism pin fingerprints kinds per frame (identity churn makes it O(n)
  large but valid). No vacuous assertions found.
- `[DOC]` [LOW] `models.ts:25` — the sw3-11 header sentence got glued onto the
  pre-existing "TRENCH's floor squares..." line, reading awkwardly; and the
  sw2-3 `render.surface-tower-cube.test.ts` header still narrates the retired
  yellow-cube intent though its assertions remain valid (yellow element = the
  column now). Cosmetic cleanups for any next touch.
- `[TYPE]` [VERIFIED] `kind?: 'tower' | 'bunker'` is a closed union with
  documented absent-default (`state.ts:80-86`) — no stringly-typed leak; all
  three consumers compare against the literal, none against free strings.
  Complies with the strict-TS convention; tsc clean.
- `[SEC]` [VERIFIED] No security surface: pure deterministic sim + canvas
  render, no input parsing, no storage, no network in the diff. Core purity
  audit: no DOM/Date/Math.random/performance references in the changed core
  files — randomness enters only via the seeded `rng` parameter (`sim.ts:820`).
- `[SIMPLE]` [VERIFIED] No over-engineering: one constant, one optional field,
  two filter conditions, one render branch — the minimal shape of the feature.
  The three models are data, not abstraction.
- `[RULE]` [VERIFIED] No `.pennyfarthing/gates/lang-review/typescript.md`,
  `.claude/rules/`, or `SOUL.md` exist. star-wars/CLAUDE.md rules checked
  item-by-item in Rule Compliance below.

### Rule Compliance

Binding sources: star-wars/CLAUDE.md ("hard architectural boundary") and repo
conventions. Every changed item enumerated:

| Rule | Instances in diff | Verdict |
|------|-------------------|---------|
| core/ never touches DOM/window/document/canvas | models.ts, state.ts, sim.ts (all core) | COMPLIANT — data + pure functions only |
| No Date.now/performance.now/Math.random in core | sim.ts spawn + fire paths | COMPLIANT — `nextFloat(rng)`/`nextInt(rng)` only (sim.ts:821-823, 407) |
| All randomness via seeded RNG in GameState | `spawnTurret` kind draw | COMPLIANT — same-seed determinism pinned by test |
| stepGame purity (identical input → identical output) | stepSurface changes | COMPLIANT — no hidden state; suite's determinism pins green |
| Shell consumes projected coords, no game math | render.ts branch | COMPLIANT — branch reads `tu.kind`, transforms via existing matrices |
| TDD on the pure core | 19 RED drivers preceded impl | COMPLIANT — RED commit 9b0ee2f before GREEN 9bf09df |
| Gitflow: feat branch off develop, no main push | branch feat/sw3-11-… | COMPLIANT |

### Devil's Advocate

Assume this is broken. The strongest attack: the hit-test lie. The player sees
a slender 64-unit-wide column and a bolt that misses it by a full column-width
still detonates it — TURRET_HIT_RADIUS 200 was tuned for a 512-wide slab that
no longer exists. In playtest that reads as phantom kills, and phantom kills on
a FIDELITY story are an irony worth naming. I flag it Medium, non-blocking,
because the constant is untouched by this diff and gameplay-tuning it here
would be scope creep — but it must not be forgotten, so it goes to Delivery
Findings. Second attack: pacing. Bunkers eat spawn slots and give nothing back
toward the quota; wave 1's surface stretches ~40% longer, and a title whose
surface phase drags invites the player to fly into the ground out of boredom.
Third: the all-bunker lull — four shorties, nothing firing, the phase goes
quiet; rare (<1%) but a dead-air window the ROM (whose bunkers may fire) might
never show. Fourth: orientation — TOWER_ORIENT is IDENTITY and the ROM "front"
points down -x, so the profile's flat face aims screen-left, not at the camera;
with near-symmetric 3-point sections this is likely invisible, but only the
eyeball pass can say. Fifth: the muzzle now sits at 232 while the ship skims at
120 — fireballs dive more steeply; time-to-impact grows ~6%; existing cadence
tests stay green so I judge it feel-tuning, not defect. None of these attacks
lands on correctness of the sim contract, the port fidelity, or the quota
logic; they are tuning debts, and each is now recorded. The code as committed
does what the story, the ROM evidence, and the tests say it must.

**Pattern observed:** spread-through-rebuild for optional entity fields
(`sim.ts:384`) — the right idiom, now also captured in the dev sidecar.
**Error handling:** N/A surface — pure data transforms; absent-kind default is
total and consistent (verified above).
**Wiring:** state → sim → render fully wired; debug-overlay intentionally left
kind-blind (logged Improvement finding).
**Eyeball pass:** REQUIRED at finish per epic convention — new silhouette is a
64×232 column + white cap + red shorties (was a 512×96 red slab); Comrade
should `just serve` → star-wars → surface phase before release.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): `models.ts` documents SURFACE_TOWER as "Authentic
  `Object_10`", but `Object_10` is trench furniture — its base rectangle is
  identical to `Obj_Trench_Squares`' outer square, and models.ts's own
  EXHAUST_PORT comment calls it a "catwalk brace". Affects
  `star-wars/src/core/models.ts` (correct the provenance comment during GREEN;
  `Object_10` may deserve a future trench-dressing story). *Found by TEA during
  test design.*
- **Gap** (non-blocking): the bunker's score value (`SCRBNK`) was not recovered;
  tests leave bunker scoring unpinned. Affects `star-wars/src/core/sim.ts`
  (award any interim value; follow-up story to recover SCRBNK from the disasm).
  *Found by TEA during test design.*
- **Question** (non-blocking): do bunkers fire? ROM `GDGUN` + the wave-2
  all-bunker maze suggest yes; if they do, the muzzle must be the bunker's low
  profile, not TOWER_HEIGHT (WYSIWYG). Left unpinned. Affects
  `star-wars/src/core/sim.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM's fixed per-wave mazes
  (`TDIFF`/`TCLUSTR`/`TBUNK` — incl. wave 2 as an ALL-bunker wave, 0 towers)
  are a future fidelity story; the clone keeps random spawn for now. Affects
  `star-wars/src/core/sim.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): ship-vs-tower crash (ROM `AUDCR` "CRASH INTO
  TOWER") is not modeled; a 2.5:1+ tower makes flying through one visible.
  Future story candidate. Affects `star-wars/src/core/sim.ts`. *Found by TEA
  during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the debug overlay draws SURFACE_TOWER for
  every ground object regardless of `kind` — bunker sites show a tower ghost in
  debug view. Affects `star-wars/src/shell/debug-overlay.ts` (branch on
  `tu.kind` like render.ts). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the trench obstacles and bunkers now share
  `TURRET_GLOW` (the shared 'Surface Tower' red) whose GLOW_FOR key name is
  stale — the surface tower itself is no longer red. Cosmetic naming debt in
  `@arcade/shared`'s GLOW_FOR table. Affects `star-wars/src/shell/render.ts`
  (rename the key or alias when next touching arcade-shared). *Found by Dev
  during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): TURRET_HIT_RADIUS (200) was tuned for the
  retired 512-wide slab; against the new 64-wide column, bolts missing by ~150
  units still kill — visually phantom hits on a fidelity title. Affects
  `star-wars/src/core/state.ts` (retune the radius, or recover the ROM LAZAR
  COLLISIONS box, in a tuning follow-up). *Found by Reviewer during code review.*
- **Question** (non-blocking): surface pacing — quota-neutral bunkers consume
  MAX_TURRETS slots, stretching wave 1's 22-tower clear by ~40% wall-clock;
  playtest should judge whether BUNKER_SPAWN_CHANCE (0.3) or MAX_TURRETS wants
  adjustment. Affects `star-wars/src/core/state.ts` (tuning constants). *Found
  by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **8-4 tower ring-closure guard revised to connectivity**
  - Spec source: tests/core/models.test.ts, story 8-4 contract ("every coplanar ring closes into a single loop")
  - Spec text: "every coplanar ring closes into a single loop (base + stacked rings)"
  - Implementation: the tower's guard is now isSingleComponent; ring closure no longer required for SURFACE_TOWER (Death Star surface / trench / port guards unchanged)
  - Rationale: WSOBJ.MAC `.WGD TWR` strokes vertical profile polylines and never closes the 3-point cross-sections; forcing closure would fabricate horizontal bands the cabinet never draws. Exact 8-10 precedent (TIE ring guard → connectivity).
  - Severity: minor
  - Forward impact: Dev must NOT close cross-section triangles to satisfy a ring guard; the sw3-11 silhouette suite pins the profile instead.
- **"Waisted" pinned as monotonic taper, not a concave waist**
  - Spec source: story title (sprint/epic-sw3.yaml sw3-11)
  - Spec text: "tall waisted yellow column"
  - Implementation: tests pin non-increasing ring radii with height + base ≥1.5× top (the ROM's 8→6→5→4), not a mid-column pinch
  - Rationale: the recovered `.WP GND` profile is a monotonic taper with a flaring foot — the ROM data outranks the title's adjective; a concave-waist pin would fail a verbatim port.
  - Severity: minor
  - Forward impact: none — a verbatim port passes.
- **Bunker sim contract pinned minimally (spawn mix + quota neutrality + shootability)**
  - Spec source: story title (sprint/epic-sw3.yaml sw3-11)
  - Spec text: "(+ red ground bunkers)"
  - Implementation: pinned deterministic mixed spawning, phaseKills neutrality, destructibility, and red rendering; left unpinned: bunker score value, bunker firing, ROM per-wave maze layouts
  - Rationale: the title's parenthetical asks bunkers to exist and read red; score/firing/mazes are unrecovered or clearly separate stories (logged as Delivery Findings) — pinning them would fabricate spec.
  - Severity: minor
  - Forward impact: follow-up stories for SCRBNK score, bunker fire behavior, and authentic mazes.
- **Colors pinned as hue classes, not exact hex**
  - Spec source: story title + WSGRND GDVIEW color contract
  - Spec text: "yellow column with white cap (+ red ground bunkers)"
  - Implementation: render tests classify strokes as yellow/white/red (channel thresholds), not exact `#ffd60a`/`#ffffff`/`#ff3b30`
  - Rationale: sw2-3 / render.enemy-fireball.test.ts convention — exact hue is an eyeball concern; VGC palette hex equivalents are not canonically fixed in the clone.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Bunkers excluded from the firing pool**
  - Spec source: session TEA Assessment + Delivery Findings ("do bunkers fire?" logged as an open Question)
  - Spec text: "Left unpinned" (no test pins bunker firing either way)
  - Implementation: `stepSurface`'s `armed` filter skips `kind === 'bunker'`; only towers (and legacy kindless entries) shoot
  - Rationale: the shared muzzle is `TOWER_HEIGHT` (232) — a 24-high shorty firing from there erupts from empty air, a WYSIWYG violation; a per-kind muzzle is unpinned design better left to the bunker-fire follow-up
  - Severity: minor
  - Forward impact: the future bunker-fire story adds a low muzzle and re-admits bunkers to the pool; sw2-3's first-fireball-at-TOWER_HEIGHT pin stays valid meanwhile.
- **Bunker kills award TURRET_SCORE (200) as an interim value**
  - Spec source: session Delivery Findings (TEA Gap: SCRBNK unrecovered)
  - Spec text: "award any interim value; follow-up story to recover SCRBNK"
  - Implementation: the kill loop scores every ground-object kill with TURRET_SCORE; only phaseKills is kind-gated
  - Rationale: minimal diff; no test pins the bunker score and the authentic SCRBNK amount is not yet recovered
  - Severity: minor
  - Forward impact: the SCRBNK follow-up replaces the score line; quota logic is already kind-correct.
- **World scale fixed at ×4 (composite peak 232), not the suggested ≈240**
  - Spec source: session TEA Assessment handoff notes
  - Spec text: "pick world scale by eyeball … H≈2×SKIM_ALTITUDE≈240 is the authentic feel"
  - Implementation: verbatim integer port at ×4 per .S unit → H = 232, SKIM_ALTITUDE 120 ≈ mid-tower (116)
  - Rationale: keeps every vertex an exact integer multiple of the ROM values (the tempest/star-wars verbatim-port convention) while landing within 4% of the suggested feel
  - Severity: minor
  - Forward impact: none — tests are scale-invariant; eyeball pass may retune the scale wholesale.
### Reviewer (audit)
Every logged deviation reviewed; verdicts:
- **8-4 tower ring-closure guard revised to connectivity** (TEA) → ✓ ACCEPTED by Reviewer: ROM stroke code is decisive — closing 3-point sections would fabricate horizontal bands the cabinet never draws; exact 8-10 precedent; DEATH_STAR_SURFACE/trench/port guards verified untouched (models.test.ts diff).
- **"Waisted" pinned as monotonic taper, not a concave waist** (TEA) → ✓ ACCEPTED by Reviewer: the recovered `.PGND` profile (8→6→5→4) outranks the story title's adjective; a concave-waist pin would have failed the verbatim port.
- **Bunker sim contract pinned minimally** (TEA) → ✓ ACCEPTED by Reviewer: score/firing/mazes are unrecovered or separate stories, all captured as Delivery Findings — pinning them would fabricate spec.
- **Colors pinned as hue classes, not exact hex** (TEA) → ✓ ACCEPTED by Reviewer: established sw2-3 / enemy-fireball convention; exact hue is an eyeball concern.
- **Bunkers excluded from the firing pool** (Dev) → ✓ ACCEPTED by Reviewer: WYSIWYG argument is sound (muzzle at 232 over a 24-high shorty); the open Question finding routes the real decision to a bunker-fire follow-up. Noted [EDGE] all-bunker lull (<1% windows) in the assessment.
- **Bunker kills award TURRET_SCORE (200) as interim** (Dev) → ✓ ACCEPTED by Reviewer: SCRBNK unrecovered; TEA's Gap finding already tracks the follow-up; no test pins the value.
- **World scale ×4 (peak 232) vs suggested ≈240** (Dev) → ✓ ACCEPTED by Reviewer: integer verbatim port beats a 4% feel delta; scale is wholesale-retunable after the eyeball pass.
- No undocumented deviations found: I compared the diff against the story title, TEA's pinned contract, and sibling-story constraints (sw3-3 quota, sw2-3 fire grace) — every divergence is logged above.