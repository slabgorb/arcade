---
story_id: "sw5-5"
jira_key: "sw5-5"
epic: "sw5"
workflow: "tdd"
---
# Story sw5-5: Re-port SURFACE_TOWER and SURFACE_BUNKER from the ROM — the tower is missing its cannon-top ring

## Story Details
- **ID:** sw5-5
- **Jira Key:** sw5-5
- **Workflow:** tdd
- **Stack Parent:** sw5-1 (blocker merged)
- **Branch Strategy:** gitflow (feat/sw5-5-rom-port-surface-tower-bunker)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-13T11:10:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T22:07:59Z | 2026-07-12T22:10:10Z | 2m 11s |
| red | 2026-07-12T22:10:10Z | 2026-07-13T10:47:49Z | 12h 37m |
| green | 2026-07-13T10:47:49Z | 2026-07-13T11:01:44Z | 13m 55s |
| review | 2026-07-13T11:01:44Z | 2026-07-13T11:10:22Z | 8m 38s |
| finish | 2026-07-13T11:10:22Z | - | - |

## Delivery Findings

### From Prior Story sw5-1 (Blocker — Merged)

The prior blocker sw5-1 (Recover `.WGD` ground-object edges — parser extension) unblocks sw5-5 by enabling the parser to read the `.WGD` draw routines for SURFACE_TOWER (STB) and SURFACE_BUNKER (BNK) from WSOBJ.MAC. Key findings that directly affect this story:

**AC-9's three new punch-list pairs (sw5-1 Delivery Findings):**
- The contact sheet now pins three new compared pairs for PORT, STB, and BNK
- Each asserts the verdict `'vertices differ — edge diff not meaningful'` because the ROM and port have different vertex counts
- sw5-5 (STB/BNK) must update these pins to real edge drift counts once the vertices are corrected
- Until vertices match, edge indices into different vertex arrays are not comparable — this is the honest default

**Parser coverage:**
- `.WGD STB` and `.WGD BNK` routines are now parsed and emitted in `romModels.generated.ts`
- STB has 13 edges; BNK has 8 edges (per the dev-assessment bake result)
- Both objects now have `hasDrawList: true`

**Design spec:**
- Read `docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md` for the technical approach to ROM edge recovery
- AC-6 has one enumerated exception (WFG's out-of-bounds read); all other objects validate strictly

**Contact sheet filtering:**
- Consumers that index `vertices[i]` from ROM edges must filter out-of-range edges
- `romCompare.ts` has the filter in place; any new consumer must apply it

Agents: append additional findings below this line.

### TEA (test design)

- **Gap** (non-blocking): `TURRET_HIT_RADIUS` (200) no longer reaches the tower's cannon. The
  corrected tower peaks at 352 with the cannon seated at 328, so 152 world units of DRAWN tower
  are unshootable (it was 32 before). The hit VOLUME is unchanged — this story does not touch it,
  and AC-5 is satisfied — but the tower grew around it. Growing the radius is a play-balance
  decision, not a fidelity one, and the ROM's own turret hit test is not yet recovered. Affects
  `src/core/state.ts` (`TURRET_HIT_RADIUS`). Pinned by a named test so the gap cannot go quiet.
  *Found by TEA during test design.*

- **Improvement** (non-blocking): three artifacts record the DECIMAL misreading of `.PGND` as
  ground truth and are actively misleading: `src/core/models.ts`'s SURFACE_TOWER doc comment
  ("(h,r) = (0,8) (6,6) (14,5) (52,4) (58,4)... 58 high... ~3.6:1"), the same numbers in
  `state.ts`'s TOWER_HEIGHT comment, and the TEA sidecar's sw3-11 entry. The test headers and the
  sidecar are corrected; **Dev must correct the two doc comments in the same change**, or the
  fixed code will ship next to a comment asserting the bug. Affects `src/core/models.ts`,
  `src/core/state.ts`. *Found by TEA during test design.*

- **Improvement** (non-blocking): sw5-4 (PORT / exhaust port) hits the IDENTICAL frame problem —
  ROM PORT is 12 verts in concentric squares, the port model an 8-point octagon, and its contact
  sheet pin is blocked for exactly the same reason STB/BNK were. It will also need raw ROM units
  to reach 0/0, and the `GROUND_MODEL_SCALE` / `TOWER_ORIENT` machinery this story builds is what
  it needs. Note PORT is `.PH` (hex, already known) at `.S=8`, and is a TRENCH object — so it needs
  its own scale, not the ground family's 1/30. *Found by TEA during test design.*

- **Question** (non-blocking): `TOWER_CAP` is left unmapped in `ROM_TO_PORT`, correctly — no ROM
  object is a 1:1 cap. But now that the tower and cap share the ROM's table and between them
  reproduce `.WGD TWR` exactly, the contact sheet could legitimately gain a TWR row comparing the
  tower COMPOSITE (STB ∪ CAP) against TWR's 18 edges — closing the last honest gap in the
  ground-object audit, since TWR/GND is currently the one ROM tower object nothing compares against.
  Out of scope here; a candidate follow-up. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the surface ground GRID stops short of the turret band, so a tower's base
  visibly floats above the grid's far edge in play. This is NOT a placement bug — the base ring is
  pinned to world y=0 (`render.ground-object-placement.test.ts`) and the grid is drawn at y=0 too —
  it is the grid's finite draw distance versus where turrets spawn. Pre-existing (bunkers show it
  equally), and made no worse by this story, but the taller tower draws the eye to it. Affects
  `src/core/surface-grid.ts` (extent) or `state.ts` (`SPAWN_DISTANCE`). *Found by Dev during
  implementation.*

- **Improvement** (non-blocking): `modelMatrix(pos, orient, s = 1)`'s default parameter is a live
  trapdoor and it caught a second victim this story — `debug-overlay.ts` was placing the tower with
  no scale argument, which silently became 1 rather than failing. TEA flagged the same default under
  Rule #4 for the missing `GROUND_MODEL_SCALE` export. Any model in raw ROM units is 30× wrong if a
  caller forgets the scale, and nothing errors. Worth considering making `s` required, or splitting a
  `groundObjectMatrix(pos)` helper that cannot be called without it. Affects `src/shell/render.ts`.
  *Found by Dev during implementation.*

- **Question** (non-blocking): with the tower now 352 tall and `TURRET_HIT_RADIUS` still 200, the
  cannon section above y=328 is drawn but unshootable — TEA already logged this as a Gap and pinned
  it. Flagging only that the fix is now *cheaply* available: since the ROM's ground objects are
  height-recentred by GD$MDT, the ROM's own hit test (not yet recovered) plausibly works in that
  recentred frame. Whoever recovers WSGRND's turret hit test should check whether the 200 sphere is
  meant to be centred at the tower's MIDDLE rather than its base. Affects `src/core/state.ts`,
  `src/core/sim.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): `src/core/models.ts:9`'s file header still asserts "every exported vertex
  is a render vertex" — FALSE as of this story for the three ground objects, which carry the shared
  15-point `.WP GND` table while each strokes only a subset. It is the exact invariant
  `models.test.ts` had to add a named carve-out for. TEA's finding told Dev to fix the misleading doc
  comments; Dev fixed the two TEA *named* but not the file header, which is the most authoritative
  statement in the file. Recommend folding the amendment into this PR — a false header is precisely
  how sw3-11's decimal misreading survived review in the first place. Affects `src/core/models.ts`
  (header, and the stale sw3-11 attribution at lines 22-24). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): the taller tower has a SECOND knock-on nobody costed — tower fire
  loses ~8% of its threat envelope. A fireball's range budget is fixed (`ENEMY_SHOT_SPEED` 300 ×
  `ENEMY_SHOT_TTL` 2.133s = 640 units) and it now spends more of it descending from a 352-high muzzle,
  so the furthest a turret can be and still land a hit drops from ~682 to ~628 units. Towers do still
  reach the player — I suspected they might not and refuted it by arithmetic — but the margin is
  thinner and undocumented. Worth recording beside the `TURRET_HIT_RADIUS` gap so the surface phase's
  difficulty is understood as *two* deltas, not one. Affects `src/core/sim.ts` (`stepSurface` muzzle),
  `src/core/state.ts` (`ENEMY_SHOT_TTL`). *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `src/tools/contactSheet.ts`'s `[G]` gameplay-scale mode has no
  knowledge of `GROUND_MODEL_SCALE`, so the three ground objects now draw 30× oversized in that mode
  versus how they actually appear in play. The default fit-to-cell mode is unaffected. This is the
  first model family in the registry whose authored units differ from its gameplay units, and the
  audit tool does not model that yet — sw5-4 (PORT) will add a second such family with a *different*
  scale, so the tool likely needs a per-model presentation scale rather than a special case. Affects
  `src/tools/contactSheet.ts`. *Found by Reviewer during code review.*

## Sm Assessment

**Routing:** tdd (phased) → O'Brien (TEA) owns the `red` phase. 3 points, `type: bug`, single repo (star-wars). Blocker sw5-1 is merged, so the `.WGD` edge parser this story depends on is already on `develop`.

**Why tdd and not trivial:** this is not a constant tweak. The tower gains a whole ring (12 → 15 vertices), which changes the model's height and therefore the collidable volume — AC-4 makes that consequence explicit. Behaviour changes, so it gets a failing test first.

**Gate cleared:** session file exists, story context written (`sprint/context/context-story-sw5-5.md`), branch `feat/sw5-5-rom-port-surface-tower-bunker` cut from `origin/develop`, epic YAML diff verified clean (status → in_progress only; no round-trip truncation). No open PRs in star-wars, no other in-progress stories — merge gate clear.

**Quarry verified reachable from this checkout** (a prior story lost time to a quarry that only existed in a sibling checkout — this one does not):
- `/Users/slabgorb/Projects/star-wars-1983-source-text/WSOBJ.MAC` — the `.WGD STB`, `.WGD BNK`, `.WGD TWR` / `.WGD2 GND` routines and the `.PH` vertex tables. This is the authority for both vertices and edges.
- `star-wars/src/tools/romModels.generated.ts` — sw5-1's bake output. STB already parses to 13 edges, BNK to 8, both `hasDrawList: true`.
- `star-wars/reference/disasm/` — secondary; WSOBJ.MAC's human-named symbols beat the disassembly for this work.

**Two traps worth naming before RED, both of which have bitten this repo before:**
1. **WSOBJ.MAC is `.RADIX 16`.** The `.PH` vertex literals are HEX, not decimal. A story in another game misread an equate as decimal and shipped a model at the wrong scale. Every vertex transcribed here must be read as hex.
2. **Vertex scale.** `models.ts` stores verts at the ROM `.S=N.` scale (the anchor is dropped). New transcriptions must be scaled to match the existing convention, not dropped in raw.

**Where the ACs bite:**
- AC-6 (contact sheet 0/0 drift for STB and BNK) is the real acceptance signal. sw5-1 left three pins in the sheet asserting `'vertices differ — edge diff not meaningful'` for PORT/STB/BNK. This story must flip STB and BNK from that placeholder to a real 0/0 edge-drift count. PORT is *not* in scope — leave its pin alone.
- AC-3 (TOWER_CAP) is a documentation/design call, not a port: in the ROM, `TWR` **is** `GND` — one object, one draw routine — and our split into two models exists only because Canvas strokes one colour per `drawWireframe` call. Either merge them or write that reason into the doc comment. Leaving the split unexplained is itself the failure, since it reads as a fidelity error to the next person.

**Handoff to O'Brien:** read `sprint/archive/sw5-1-session.md` (Delivery Findings) and `docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md` before writing the first failing test. Write RED against the ROM, not against the current model — the current model is the bug.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 35 failing, 929 passing. Exactly 5 files fail, and they are exactly the 5 I
touched. Zero collateral damage.

**Test Files**
- `tests/core/ground-objects-rom.test.ts` — NEW. The ROM oracle + AC-1/2/3/4.
- `tests/shell/render.ground-object-placement.test.ts` — NEW. The ROM→world bridge + AC-5.
- `tests/tools/romCompare.test.ts` — the punch-list pin: STB/BNK flip to a real 0/0 (AC-6).
- `tests/core/surface-tower-geometry.test.ts` — REWRITTEN into the ROM axis (sw3-11's suite).
- `tests/core/models.test.ts` — the orphan-vertex carve-out.

### What this story actually is

The title says a ring is missing. That is true, and it is the smallest of three defects. The tower
was ported in a **private coordinate frame** (×4, y-up, base-at-zero) while every ship model in
models.ts holds **raw ROM units** — which is why TIE/RTH compare on the contact sheet and the
ground objects cannot. And its heights were read in **decimal from a hex file**, so the three upper
rings are all at the wrong height. Restoring the ring alone would have satisfied AC-2's wording and
still shipped a wrong tower.

I put the frame question to the user before writing a line of test, with both options costed. They
chose raw ROM units (the only option that can satisfy AC-6) and chose to adopt GD$MDT as the skim
altitude. Five deviations logged.

### The proof the transcription is right — checked BEFORE trusting it

I hand-transcribed `.WP GND` and the three `.WGD` routines from WSOBJ.MAC and pinned them as an
**independent oracle**, rather than reading the baked artifact (a test asserting `MODELS ===
ROM_MODELS` proves only that two artifacts agree; if the bake regressed it would drag the port down
with it and stay green). Those 3 oracle tests **pass today** — my transcription and sw5-1's parser
agree exactly, from opposite directions.

The hex reading is proven twice over, and I did not rely on the arithmetic alone:
1. **Structurally.** `.PGND`'s macro body is `.WORD .A'*.S,...` — byte-for-byte the `'*` form of
   `.PH`, the established hex macro, with none of `.P`'s `'.` decimal-forcing. `.PGND` is `.PH`
   plus a height offset.
2. **Arithmetically.** `0x58*120 − 0xF00 = 6720`, exactly the baked z. The decimal reading yields
   3120 — a number that appears nowhere in the ROM. The test asserts the refutation
   (`expect(z).not.toBe(58 * S - GD$MDT)`) so a regression to decimal fails by name.

**Note `.RADIX` does not appear in WSOBJ.MAC at all** (it is set in the included WSCOMN.MAC), so the
file gives no warning. Single-digit literals (4/6/8) read identically in both bases — only the
two-digit heights diverge, which is exactly why sw3-11's misreading survived review.

### The strongest test in the suite

`SURFACE_TOWER.edges ∪ TOWER_CAP.edges === TWR.edges` (13 + 7 − 2 shared = 18). In the ROM there is
no cap object: `.WGD TWR`/`.WGD2 GND` is ONE routine that strokes column and hat together, switching
pen colour mid-draw. AC-4 asks for the port's two-model split to be reconciled and documented; this
**proves** it is a pure colour split that loses nothing, rather than asserting it in a comment. It
also explains the orphans: STB leaves the cannon-top ring bare precisely because the cap strokes it.

### Rule Coverage (lang-review typescript)

| Rule | Test | Status |
|------|------|--------|
| #4 falsy zero | `index 0 is a REAL vertex — both routines stroke it, so no truthiness guard may skip it` | passing (standing guard) |
| #4 null/undefined default-param trapdoor | `the shell exports the ROM -> world presentation scale` | failing |
| #8 test quality (no vacuous assertions) | self-check below | — |

**Rule #4 is the live trap here, twice.** (a) Index 0 is a real vertex (the base FRONT point) and
one of the busiest in both routines, while x=0 for ten of the fifteen points — any `if (!i)` or
`v[0] || d` deletes geometry silently. This is the same falsy-zero trap that bit sw5-1 on these very
objects. (b) **`modelMatrix(pos, orient, s = 1)` has a DEFAULT PARAMETER.** My first run exposed
this: a missing `GROUND_MODEL_SCALE` export arrives as `undefined`, the default silently takes over,
and the placement tests quietly measured an unscaled model *instead of failing*. I added a named
test that pins the export itself, so the trapdoor is nailed shut and fails first, loudly. Rules
#3/#6/#7/#10/#11/#12 have no surface in a pure geometry/data change.

**Self-check:** every test carries a meaningful assertion; no `let _ =`, no `assert(true)`, no
`as any`. I found and fixed one **real bug in my own tests** on the first run: the ROM skim fraction
was computed as `GD$MDT / (0x58*120 − GD$MDT)` — the recentred z of the peak, which is a
*coordinate*, not a *height*. Corrected to `GD$MDT / (0x58*120)` = 0.3636, which now agrees with
SKIM_ALTITUDE/TOWER_HEIGHT = 128/352. Left as-is deliberately: `as unknown as` in the registry
discovery helper, which is the pre-existing idiom in models.test.ts and not mine to churn.

Of the tests that pass today, none is vacuous — they are the *don't-break-what-works* half of the
contract (base lands on the floor, footprint stays r=32, hit volume stays 200) and Dev must keep
them green through the change.

**Handoff:** To Julia (Dev) for GREEN. Read the Delivery Findings first — in particular, **two doc
comments in `models.ts` and `state.ts` still assert the decimal profile and the 3.6:1 aspect.** Fix
them in the same change, or the corrected code ships next to a comment stating the bug.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 964/964 tests, tsc+vite clean, 0 smells, tree clean, no PR yet |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see Findings 4, VERIFIED 7/8) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (no error paths in a pure-data change) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see Finding 3) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see Findings 1, 2) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see Rule Compliance #1/#2/#4, VERIFIED 10) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no attack surface: pure constant geometry, no input/IO/network |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (VERIFIED 10: the shared array is a simplification, not duplication) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — Reviewer performed the exhaustive 13-rule enumeration by hand (see Rule Compliance) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`, each domain assessed directly by the Reviewer)
**Total findings:** 5 confirmed (0 Critical, 0 High, 2 Medium, 3 Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. The ROM data is correct — I verified it independently rather than
trusting the tests — and the two constants that leave the models and enter the *simulation*
(`TOWER_HEIGHT`, `SKIM_ALTITUDE`) were traced end-to-end through `sim.ts`. Five findings, all
Medium/Low, none blocking per the severity table. One of them (Finding 1) is a false comment of
exactly the class this epic exists to eliminate and should be folded in before merge.

**Data flow traced:** the player's yoke → `aimDirection` → bolt spawned at `COCKPIT` (`sim.ts:153`)
→ `collides(turret.pos, projectile.pos, TURRET_HIT_RADIUS)` (`sim.ts:502`). The decisive fact is
`const COCKPIT: Vec3 = [0, 0, 0]` (`sim.ts:89`): the sim's cockpit is the **origin**, and
`state.altitude` feeds only the camera (`render.ts` `cameraView`) and the `MIN_SKIM_ALTITUDE`
terrain-scrape check (`sim.ts:440`). So `SKIM_ALTITUDE` 120→128 **cannot** move the turret hit
window — bolts and turret bases both sit at y=0 and the test is effectively planar. Safe.

The other direction is not inert: `TOWER_HEIGHT` **does** enter the sim, at `sim.ts:480`
(`muzzle = [x, pos[1] + TOWER_HEIGHT, z]`, turret `pos[1] = 0` per `sim.ts:993`). See Finding 4.

**Pattern observed:** `models.ts:446` / `models.ts:460` — `vertices: SURFACE_TOWER.vertices` makes
TOWER_CAP and SURFACE_BUNKER *alias* the tower's array, mirroring the ROM's own `.WPZ2` aliasing.
Good pattern: it makes the "one table, four objects" fact structural rather than a comment, and it
cannot drift. Safe because `Model3D.vertices` is `readonly Vec3[]` and nothing in `src/` mutates
`.vertices`/`.edges` (grep: zero hits).

**Error handling:** N/A by construction — this change introduces no error paths (pure constant
geometry, no IO, no parsing, no async, no throw sites). Null/undefined risk is confined to
`modelMatrix`'s `s = 1` default parameter, which is the one live trapdoor; closed (VERIFIED 9).

### Findings

| Severity | Tag | Issue | Location |
|----------|-----|-------|----------|
| [MEDIUM] | [DOC] | File header asserts *"every exported vertex is a render vertex"* — this change makes it FALSE for the three ground objects, which carry the shared 15-point table while each strokes a subset. This is precisely the invariant `models.test.ts` had to add a named carve-out for. TEA warned Dev to fix the doc comments "or the fixed code will ship next to a comment stating the bug"; Dev fixed the two comments TEA *named* (SURFACE_TOWER, TOWER_HEIGHT) but not the file header, which is the most authoritative statement in the file. | `src/core/models.ts:9` |
| [MEDIUM] | [EDGE] | Un-called-out gameplay knock-on of `TOWER_HEIGHT` 232→352: the tower's **fire threat envelope shrinks ~8%**. A fireball has a fixed range budget (`ENEMY_SHOT_SPEED` 300 × `ENEMY_SHOT_TTL` 2.133s = 640 units) and now spends more of it descending from a 352-high muzzle. Max horizontal turret distance that can still land a hit falls ~682 → ~628. I initially suspected towers could no longer reach the player *at all* and **refuted it by arithmetic** (`TICK_HZ` is 30, not 60 — the budget is 640, not 320). Towers still hit; the envelope is just tighter. Belongs beside the `TURRET_HIT_RADIUS` note as the *second* knock-on of the taller tower. | `src/core/sim.ts:480` |
| [LOW] | [TEST] | The "exempt ground objects are exactly the ones sharing the ROM point table" guard is now **tautological**: because the cap and bunker alias the tower's array *by reference*, `expect(m.vertices).toEqual(first.vertices)` cannot fail. TEA wrote it to stop the exemption list becoming a dumping ground. Coverage is NOT lost — the real, non-tautological guard is `ground-objects-rom.test.ts`, which compares all three against the hand-transcribed `GND_TABLE` literal — but nobody should later trust this test to catch a broken exempt model. | `tests/core/models.test.ts` (exempt-guard test) |
| [LOW] | [DOC] | Header still credits story sw3-11 with *"its vertices AND stroke order are the real WSOBJ.MAC ground-tower data"*. Under sw3-11 that was false (private ×4 frame, decimal heights); it became true only with sw5-5. Stale attribution on the exact claim this story had to correct. | `src/core/models.ts:22-24` |
| [LOW] | [SIMPLE] | `contactSheet.ts`'s `[G]` **gameplay-scale** mode has no knowledge of `GROUND_MODEL_SCALE`, so the three ground models now render **30× oversized** in that mode relative to how they actually appear in play. The default FIT mode is unaffected (auto-fits via `fitDistance(radius)`). Minor, but it is a misleading mode in the very tool this epic uses to audit fidelity. | `src/tools/contactSheet.ts:170,200` |

### Verified

- **[VERIFIED] The ROM data is correct — checked against the bake, not the tests.** `models.ts`'s 15 vertices are byte-identical to ROM `GND`/`TWR`/`BNK`/`STB` in `romModels.generated.ts:99,106,113,120`. STB's 13 edges match in order; BNK's 8 match in order. I recomputed the reconciliation as *undirected* edge sets by hand: STB(13) ∪ CAP(7) = 18 = TWR, with the overlap being exactly {6-8, 6-7}. The cap's 7 edges are precisely TWR minus STB plus those 2. Evidence: `models.ts:446-476` vs `romModels.generated.ts:99-121`.
- **[VERIFIED] `SKIM_ALTITUDE` 120→128 does not touch collision.** Evidence: `sim.ts:89` `COCKPIT: Vec3 = [0,0,0]`; `sim.ts:153` bolts spawn at `COCKPIT`; `sim.ts:993` turrets spawn at `[e.x, 0, …]`. Both ends of the turret hit test sit at y=0, so `TURRET_HIT_RADIUS` (200) is a planar window unaffected by altitude. The only behavioural delta is a slightly *larger* crash margin (128−40=88 vs 120−40=80, `sim.ts:440`). Complies with lang-review #4 (no falsy-zero/`||` default introduced on this path).
- **[VERIFIED] The WYSIWYG muzzle contract holds in the new frame.** `sim.ts:480` launches from `pos[1] + TOWER_HEIGHT` = y=352; the shell places the cap's top ring at exactly y=352 (model z 6720 → 6720/30 = 224, plus the GD$MDT lift 3840/30 = 128). I verified the matrix by hand against `@arcade/shared/math3d`'s `rotationX` (row-major, y′ = c·y − s·z, so θ = −π/2 maps (x,y,z) → (x, z, −y)) rather than trusting the comment. Pinned at `render.ground-object-placement.test.ts:120-128`.
- **[VERIFIED] No unscaled ground-model draw survives — the `s = 1` trapdoor is closed.** I enumerated **every** `modelMatrix` caller in `src/` (11 sites). The only two that place ground models — `render.ts:308` and `debug-overlay.ts:181` — both pass `GROUND_MODEL_SCALE`. The other nine draw TRENCH/TIE/DEATH_STAR/DEATH_STAR_SURFACE models, whose units did not change. This is the exact Rule #4 default-parameter trapdoor TEA flagged, and Dev caught the second victim (`debug-overlay.ts`) himself.
- **[VERIFIED] The shared vertex array cannot be corrupted.** `Model3D.vertices` is `readonly Vec3[]` (`models.ts:38`) and grep finds **zero** mutations of `.vertices`/`.edges` anywhere in `src/`. Aliasing is safe and faithfully models `.WPZ2`. Complies with lang-review #2 (readonly on shared array data).

### Rule Compliance (lang-review/typescript — all 13 rules enumerated)

| # | Rule | Applies? | Verdict |
|---|------|----------|---------|
| 1 | Type-safety escapes (`as any`, `as unknown as`, `@ts-ignore`, `!`) | Yes | **PASS** — zero in the src diff (preflight confirms 0 of each). The one pre-existing `as unknown as` in `models.test.ts`'s registry-discovery helper is untouched prior idiom. |
| 2 | Generics/interfaces (`Record<string,any>`, missing `readonly`) | Yes | **PASS** — `Model3D.vertices`/`.edges` are `readonly`; new `GD_HEIGHT_OFFSET`/`GROUND_MODEL_SCALE` are numbers; `TOWER_ORIENT: Mat4` (readonly number[]). No broad types introduced. |
| 3 | Enum anti-patterns | No | N/A — no enums in the diff. |
| 4 | Null/undefined + **falsy zero** | Yes — THE live rule | **PASS** — (a) no `||` defaults introduced; (b) `modelMatrix`'s `s = 1` default is now explicitly supplied at both ground call sites (VERIFIED above); (c) vertex index 0 is stroked by STB (`[0,2] [0,1] [12,0]`) and BNK (`[0,1] [0,2] [12,0]`), and x === 0 for ten of fifteen vertices — no truthiness guard or `\|\| fallback` exists on any transform/draw path (`transform()` maps all three components unconditionally). |
| 5 | Module/declaration issues | Yes | **PASS** — `GD_HEIGHT_OFFSET` is a runtime value imported as a value (`render.ts:35`), not `import type`. Import style matches the file's existing bundler-resolved convention. |
| 6 | React/JSX | No | N/A — no `.tsx`. |
| 7 | Async/Promise | No | N/A — pure synchronous geometry. |
| 8 | Test quality (vacuous assertions) | Yes | **PASS with note** — no `as any` in the changed tests; assertions are meaningful. One tautological assertion found → Finding 3. |
| 9 | Build/config | Yes | **PASS** — `strict: true`, `noUnusedLocals: true`, and `npm run build` is clean, which also proves the retained `IDENTITY` import is still genuinely used (`TRENCH_ORIENT`, `cameraView`, `modelMatrix` default). |
| 10 | Type-level input validation | No | N/A — no user input, no `JSON.parse`, no API boundary. Constant data only. |
| 11 | Error handling | No | N/A — no `try/catch`, no throw sites introduced. |
| 12 | Performance/bundle | Yes | **PASS** — sharing one vertex array across three models *reduces* bundle; `rotationX` added to an existing named import from `@arcade/shared/math3d`, not a barrel over-import. |
| 13 | Fix-introduced regressions | No | N/A — no fix commits yet. |

### Post-review amendment (Finding 1 — RESOLVED)

At the user's direction, Finding 1 was folded into the branch rather than deferred, as commit
`76a51a7` (`docs(sw5-5): correct the models.ts header`). Comment-only; 964/964 tests and the build
re-verified green afterwards. The header now states the ground-object exception to "every exported
vertex is a render vertex" and explains why it is load-bearing, and the stale sw3-11 attribution is
corrected to say what sw3-11 actually got wrong (decimal heights, private ×4 frame) and that the
claim holds only as of sw5-5.

Finding 2 (stale attribution, [LOW][DOC]) was fixed in the same commit. Findings 2 (envelope), 3
(tautological guard) and 5 (contact sheet gameplay scale) remain open as non-blocking Delivery
Findings — none is a defect in this change's behaviour.

### Devil's Advocate

Let me argue this code is broken. The most dangerous thing here is that a **fidelity** story quietly
became a **gameplay** story, and the tests were written by the same mind that wrote the port, so they
agree with each other about a world that may not be the game's.

Start with the frame. `models.ts` now stores towers in raw ROM units and the *shell* scales them by
1/30. But collision lives in the **core**, which never sees that scale. So the core believes a tower
is a 200-radius sphere at the origin of a turret, while the shell draws a 352-tall column. These two
descriptions of "a tower" are now maintained in different files, in different units, with no shared
constant tying them — nothing but `TOWER_HEIGHT = 352` sitting in `state.ts` as a hand-copied
number that *happens* to equal `(6720 + 3840)/30`. If someone later retunes `GROUND_MODEL_SCALE`,
the drawn tower moves and `TOWER_HEIGHT` silently does not, and the tower's fireball starts erupting
out of thin air — the exact WYSIWYG bug this story claims to have fixed. The placement test would
catch it, which is the saving grace, but the *coupling itself* is unenforced in the source.

Second: the change makes `TOWER_HEIGHT` a load-bearing input to a **range-limited projectile**.
I chased this hard, because if the fireball's TTL budget were under 352 the towers would have become
decorative and every "tower kills the player" test would still pass (none of them assert a *hit* from
a real muzzle). The budget is 640, so they still reach — but only just, and the safety margin fell by
8%. Nobody wrote that number down before I computed it. A slightly different `TICK_HZ` and this
"pure geometry" story would have silently disarmed the enemy.

Third, the confused user: they see a tall tower, put the crosshair on the bright white cannon, fire,
and miss — because the hit sphere is 200 units around the *base*. That is now the most visually
salient part of the object and it is unshootable. Three agents have called this "not a fidelity
concern," which is true and also not what the player experiences.

None of these are Critical or High: the coupling is test-pinned, the fireballs do reach, and the
hit-volume gap is documented three times over. But "the tests pass" is doing more work in this story
than anyone has admitted, and Findings 1–5 are where I refuse to sign off silently.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 964/964 passing (GREEN — TEA's 35 RED all flipped, 929 pre-existing held). `npm run build`
(`tsc --noEmit` + vite) clean.
**Branch:** `feat/sw5-5-rom-port-surface-tower-bunker` (pushed)

**Files Changed**
- `src/core/models.ts` — the three ground objects re-ported into RAW ROM UNITS. All three now carry
  `.WP GND`'s fifteen-point table (the cap and bunker *alias* the tower's array, as `.WPZ2` does in
  the ROM), each stroking its own `.WGD` routine's subset: STB 13 edges, BNK 8, the white cap 7.
  New export `GD_HEIGHT_OFFSET` (GD$MDT = 0xF00). Doc comments rewritten — they had recorded the
  decimal misreading and the ×4 private frame as ground truth.
- `src/core/state.ts` — `TOWER_HEIGHT` 232 → **352**, `SKIM_ALTITUDE` 120 → **128**. Both doc
  comments rewritten (they asserted the 3.6:1 aspect and the "≈ mid-tower" skim, which were
  artifacts of the bug).
- `src/shell/render.ts` — the ROM→world bridge: new `GROUND_MODEL_SCALE` (1/30) and a real
  `TOWER_ORIENT` (was `IDENTITY`) = `translation(0, GD$MDT × scale, 0) ∘ rotationX(-90°)`. The
  turret draw call now passes the scale.
- `src/shell/debug-overlay.ts` — same scale applied to its mirrored tower placement.

**What the change actually is.** The title says a ring is missing; TEA established that was the
smallest of three defects, and the port needed the ROM's *frame*, not a patch. So: the models moved
into raw ROM units (which is what finally lets the contact sheet compare them — AC-6), their heights
were re-read in hex (0x14/0x52/0x58, not 14/52/58), and the y-up/floor presentation moved to the
shell where it belongs. `TOWER_ORIENT` stops being a lie: it now carries the two facts that bridge
the frames — the ROM is z-up, and it height-recentres by GD$MDT so that model z=0 is the height the
player flies at. That second fact is why GD$MDT *is* the skim altitude.

**Verification beyond the suite.** `render.ts`'s own comment warns that orientation and scale escape
structural tests and must be eyeballed — and this change turns `TOWER_ORIENT` from `IDENTITY` into a
real matrix, exactly that class of risk. I ran the game (dev-only phase-jump key `8` → surface) and
looked: tall tapered yellow column, white cannon cap at the summit, standing on the floor, footprint
unchanged, bunkers still squat red shorties. **Note for whoever verifies next:** port 5274 was being
served by a *different checkout* (`a-2`) — screenshotting it would have verified someone else's code.
I served this tree on 5284 instead and left theirs alone. Written up in the Dev sidecar.

**Handoff:** To The Thought Police (Reviewer). Three Dev deviations and three Delivery Findings
logged. The headline acceptance signal is AC-6: STB and BNK now report `✓ edges match` / 0-0 drift on
the contact sheet, compared for real (the vertex guard is open) rather than pinned as
"not meaningful". PORT stays blocked — that is sw5-4.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The ROM heights are HEX — the tower is not merely missing a ring, its three upper rings are all at the wrong height**
  - Spec source: `sprint/epic-sw5.yaml`, sw5-5 AC-2
  - Spec text: "The ROM tower has 5 rings / 15 vertices; ours has 4 rings / 12. The missing ring is the cannon top. Restore it."
  - Implementation: the tests additionally pin the ring HEIGHTS. `.PGND`'s body is `.WORD .A'*.S,...` — the same `'*` form as `.PH`, with no `'.` decimal-forcing — so under `.RADIX 16` its literals are hex. The midline and cannon rings move from h=14/52/58 to h=0x14/0x52/0x58 (20/82/88).
  - Rationale: proven two independent ways — structurally (the macro body is byte-for-byte `.PH`'s, and `.PH` is the established hex macro) and arithmetically against the independently-baked artifact (`0x58*120 − 0xF00 = 6720`, exactly the baked z; the decimal reading gives 3120, which appears nowhere in the ROM). Restoring the ring WITHOUT fixing the heights would satisfy AC-2's literal wording while still shipping a wrong tower — the precise failure this epic exists to end.
  - Severity: major
  - Forward impact: TOWER_HEIGHT 232 → 352; the tower's true aspect is 5.5:1, not the 3.6:1 recorded in models.ts's doc comment, this suite's old header, and the TEA sidecar (all three corrected).

- **models.ts adopts RAW ROM UNITS for the ground objects; the shell gains the presentation transform**
  - Spec source: `sprint/epic-sw5.yaml`, sw5-5 AC-1 and AC-6
  - Spec text: "SURFACE_TOWER vertices and edges come from ROM `STB`" / "The contact sheet reports 0/0 drift for STB to Surface Tower and BNK to Surface Bunker."
  - Implementation: the three ground models are re-authored into raw ROM coordinates (`.S`=120, z-up, GD$MDT recentring) — the convention every ship model already uses. `render.ts` gains `GROUND_MODEL_SCALE` (1/30) and a real `TOWER_ORIENT` (it is IDENTITY today).
  - Rationale: `romCompare.verticesEqual` is a DEEP equality on raw triples, so 0/0 drift is unreachable while the port keeps the private ×4 y-up frame sw3-11 invented. The narrower alternative (restore the ring, stay in port units) cannot satisfy AC-6 at all. Put to the user with both options costed; they chose raw ROM units.
  - Severity: major
  - Forward impact: sw5-4 (PORT) faces the identical frame problem and can reuse this machinery. The 1/30 scale is chosen so the tower's FOOTPRINT is unchanged (960 raw → r=32, exactly today's) — only its height moves.

- **SKIM_ALTITUDE 120 → 128, beyond AC-5's letter**
  - Spec source: `sprint/epic-sw5.yaml`, sw5-5 AC-5
  - Spec text: "Surface-phase collision still works with the corrected (taller) tower; any change in the collidable volume is called out."
  - Implementation: SKIM_ALTITUDE is additionally re-derived from GD$MDT (0xF00 at the 1/30 presentation scale = 128), replacing the hand-picked 120. AC-5 asks only that collision keep working.
  - Rationale: GD$MDT's own comment is "OFFSET HITE TO MID OF PLAYERS HITE" — it IS the ROM's skim altitude, expressed as the recentring that puts the player at model z=0. state.ts's comment already flagged 120 as a placeholder "chosen to play right... named for easy correction once deeper reverse-engineering recovers the real numbers". This is that correction. Put to the user, who chose to adopt it. Safe to land here: every existing test references the constant symbolically (`toBe(SKIM_ALTITUDE)`) — none hardcodes 120 — so no flight suite is disturbed.
  - Severity: minor
  - Forward impact: play feel shifts. The ship now flies at the ROM's true 36.4% of tower height rather than an approximated 52%; towers loom.

- **The registry's "no orphan vertices" invariant gains an enumerated three-model exception**
  - Spec source: `tests/core/models.test.ts` (pre-existing registry invariant), against sw5-5 AC-1/AC-3
  - Spec text: "has no orphan vertices (every vertex is referenced by an edge)"
  - Implementation: SURFACE_TOWER / TOWER_CAP / SURFACE_BUNKER are exempted BY NAME, and the invariant's intent is re-asserted over their drawn subgraph (each must still stroke ONE connected shape). A guard test proves the exempt three genuinely share the ROM's 15-point table, so the list cannot become a dumping ground for broken models.
  - Rationale: `.WPZ2 TWR/BNK/STB` alias `.WP GND` — four objects, ONE fifteen-point table, each `.WGD` routine stroking a subset (BNK strokes 6, STB 12, leaving the cannon-top ring for the cap to draw in white). A faithful port therefore carries points its own edges never touch. Trimming them would break the deep vertex equality AC-6 requires, forfeiting the comparison this story exists to win. The orphans are ROM structure, not port dead weight.
  - Severity: major
  - Forward impact: any future ground object ported from the GND family must join the exempt list deliberately. The union test (SURFACE_TOWER ∪ TOWER_CAP == TWR's 18 edges) proves nothing is lost by the split.

- **The WYSIWYG TOWER_HEIGHT coupling moves from the core suite to the shell suite**
  - Spec source: `tests/core/surface-tower-geometry.test.ts` (sw3-11's pin), against sw5-5 AC-5
  - Spec text: "TOWER_HEIGHT equals the tallest drawn point of the tower composite"
  - Implementation: asserted in `tests/shell/render.ground-object-placement.test.ts` against the PLACED cannon top. The core suite keeps the frame-independent half — the composite peaks at the cannon-top ring, which only the cap strokes.
  - Rationale: TOWER_HEIGHT is a world constant but the model is now in raw ROM units; bridging them needs the shell's presentation scale, which core must not import (the hard core/shell boundary in CLAUDE.md). The shell-side assertion is strictly STRONGER than the one it replaces — it checks the placed ring against the constant, not a bare vertex maximum.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)

- **The GD$MDT lift is derived from the ROM constant, not from SKIM_ALTITUDE, even though the two are equal**
  - Spec source: `tests/shell/render.ground-object-placement.test.ts` (TEA's RED), AC-5
  - Spec text: "SKIM_ALTITUDE is derived from the ROM, not guessed" — `expect(SKIM_ALTITUDE).toBe(GD$MDT * GROUND_MODEL_SCALE)`
  - Implementation: `models.ts` exports `GD_HEIGHT_OFFSET` (0xF00) as ROM data, and `render.ts` builds TOWER_ORIENT's lift as `GD_HEIGHT_OFFSET * GROUND_MODEL_SCALE`. It does NOT import SKIM_ALTITUDE, though that is the same 128 and the test pins the equality.
  - Rationale: the two constants are numerically equal *in the ROM's design* but not *in intent* — SKIM_ALTITUDE is a play-balance knob (a future story may retune how high the ship flies), while the lift is a fixed property of the ground-object vertex data. Wiring the lift to SKIM_ALTITUDE would mean a flight-feel tweak silently sinks every tower into the floor or floats it. Each side now derives from its own truth and the test guards the fact that they currently agree.
  - Severity: minor
  - Forward impact: none — a new export (`GD_HEIGHT_OFFSET`) that sw5-4 (PORT) can ignore; the trench objects have their own recentring, if any.

- **TOWER_CAP and SURFACE_BUNKER share SURFACE_TOWER's vertex array by reference, not by copy**
  - Spec source: `sprint/context/context-story-sw5-5.md`, AC-1/AC-3/AC-4; TEA's oracle tests
  - Spec text: the three models must each "carry the ROM point table verbatim" (`expect(X.vertices).toEqual(GND_TABLE)`)
  - Implementation: `vertices: SURFACE_TOWER.vertices` on the cap and the bunker, rather than re-typing the fifteen triples three times.
  - Rationale: this IS the ROM's own structure — `.WPZ2 TWR/BNK/STB` *alias* `.WP GND`; one table, four objects. Duplicating the literals would let the three drift apart in a future edit, which is exactly the failure the `.WPZ2` aliasing prevents in the ROM. Everything is `readonly` (Model3D's `vertices` is `readonly Vec3[]`), so the shared reference cannot be mutated. TEA's guard test ("the exempt ground objects are exactly the ones sharing the ROM point table") passes by construction rather than by coincidence.
  - Severity: minor
  - Forward impact: any future edit to the shared table must be made once, on SURFACE_TOWER, and lands on all three — which is the intent.

- **The debug overlay's tower placement was corrected too, though no test covers it**
  - Spec source: AC-5 / the shell's placement contract
  - Spec text: (none — the overlay is dev-only and untested)
  - Implementation: `debug-overlay.ts`'s `sceneModels` gained the `GROUND_MODEL_SCALE` argument its `modelMatrix(tu.pos, TOWER_ORIENT)` call was missing.
  - Rationale: NOT scope creep — it is the same defect the change introduces. The overlay's own doc comment promises it "mirrors render.ts's per-phase draw calls exactly ... so the overlay's bounds rings land where the models actually draw". Once the models hold raw ROM units, an unscaled call there draws the tower 30× oversized. `modelMatrix`'s `s = 1` DEFAULT PARAMETER means this would not have failed loudly — the same falsy/default trapdoor TEA flagged in Rule #4. Left uncorrected, pressing the backtick key on the surface would paint a garbage overlay.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)

**TEA deviations (5) — all ACCEPTED:**

- **The ROM heights are HEX** → ✓ ACCEPTED by Reviewer: independently confirmed against the sw5-1 bake (`romModels.generated.ts:120` gives z=6720 for the cannon top; the decimal reading yields 3120, which appears nowhere in the artifact). The structural argument (`.PGND`'s body is the `'*` form, byte-for-byte `.PH`'s) and the arithmetic agree. This is the correct reading.
- **models.ts adopts RAW ROM UNITS; the shell gains the presentation transform** → ✓ ACCEPTED by Reviewer: this is the only route to AC-6, since `romCompare.verticesEqual` is a deep equality on raw triples. The user was consulted with both options costed. Boundary respected — core holds ROM data, the shell owns presentation.
- **SKIM_ALTITUDE 120 → 128, beyond AC-5's letter** → ✓ ACCEPTED by Reviewer, and I verified the blast radius the deviation claims is safe: `SKIM_ALTITUDE` never enters collision (the sim's cockpit is the origin, `sim.ts:89`), so this cannot disturb any hit test. The only delta is a marginally larger crash margin. The ROM justification (GD$MDT's own comment) is sound.
- **The registry's "no orphan vertices" invariant gains an enumerated three-model exception** → ✓ ACCEPTED by Reviewer: the carve-out is named, guarded, and re-asserts the intent over the drawn subgraph. Trimming the unstroked points would forfeit AC-6, so the exception is forced by the ROM's own `.WPZ2` design. **Caveat, not a reversal:** the accompanying guard test is now tautological — see Finding 3. The exemption is still safe because `ground-objects-rom.test.ts` carries the real (literal-based) check.
- **The WYSIWYG TOWER_HEIGHT coupling moves from the core suite to the shell suite** → ✓ ACCEPTED by Reviewer: correct — core cannot import the shell's scale without breaking the CLAUDE.md boundary, and the shell-side assertion (placed cannon-top ring vs the constant) is strictly stronger than the bare vertex maximum it replaces.

**Dev deviations (3) — all ACCEPTED:**

- **The GD$MDT lift is derived from the ROM constant, not from SKIM_ALTITUDE** → ✓ ACCEPTED by Reviewer: the right call, and for the stated reason. Wiring the lift to a play-balance knob would let a flight-feel tweak sink every tower into the floor. Decoupling them while pinning their current equality in a test is the correct shape.
- **TOWER_CAP and SURFACE_BUNKER share SURFACE_TOWER's vertex array by reference** → ✓ ACCEPTED by Reviewer: safe (verified — `readonly Vec3[]`, zero mutation sites in `src/`) and it makes the ROM's `.WPZ2` aliasing structural rather than a comment. Note the side effect logged as Finding 3.
- **The debug overlay's tower placement was corrected too** → ✓ ACCEPTED by Reviewer: correctly identified as the *same* defect rather than scope creep. Leaving it would have shipped a 30×-oversized overlay behind the backtick key, invisible to CI.

**UNDOCUMENTED deviations found by Reviewer:** none. Every divergence from spec in this change was logged by TEA or Dev before I looked. The five findings I raise are new defects and consequences, not undisclosed deviations.