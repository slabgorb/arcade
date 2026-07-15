---
story_id: "tp1-17"
jira_key: "tp1-17"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-17: SHAPES — the tanker, spiker, fuseball and player charge, drawn from the ROM's vertex data

## Story Details
- **ID:** tp1-17
- **Jira Key:** tp1-17
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T09:45:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T08:40:45Z | 2026-07-15T08:43:22Z | 2m 37s |
| red | 2026-07-15T08:43:22Z | 2026-07-15T09:14:04Z | 30m 42s |
| green | 2026-07-15T09:14:04Z | 2026-07-15T09:35:54Z | 21m 50s |
| review | 2026-07-15T09:35:54Z | 2026-07-15T09:45:59Z | 10m 5s |
| finish | 2026-07-15T09:45:59Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the story description's finding range "V-005..V-010, DA-004" mis-scopes the work. The four ACs map to V-006 (tanker body, `ALVROM.MAC:651` GENTNK), V-008 (spiker, `:522` SPIRA1-4), **V-014** (fuseball, `:975` FUSE0-3 — OUTSIDE the stated range), and V-010+DA-004 (player charge, `:384` DIARA2). V-005 (pulsar bar), V-007 (tanker CARGO emblems) and V-009 (enemy shot) are INSIDE the range but named by NO AC. Affects `sprint/epic-tp1.yaml` (tp1-17 description should read V-006, V-008, V-010, V-014, DA-004). *Found by TEA during test design.*
- **Gap** (blocking): AC-7 (`npm test -- citations` green) requires Dev to (a) mark V-006, V-010, V-014, DA-004 `"remediated_by": "tp1-17"` — rewriting glyphs.ts falsifies each one's `ours` quote — and (b) run `node tools/audit/reanchor-citations.mjs --write` because editing glyphs.ts shifts the line numbers of the OTHER citations into it (V-007 tanker-cargo `:123`, V-016 LIFE1, pulsar V-005 if present). Affects `docs/audit/findings/pair-2-alvrom-shapes-font.json` + `pair-3-aldisp-a-objects.json`. *Found by TEA during test design.*
- **Gap** (blocking): DA-004 ("only the INNER ring ammo-tinted") is not glyph-only — the RED drives `playerBulletGlyph(tint: GlyphColor)` (inner dots = tint, outer = fixed yellow), so `drawBullets` must pass the tint INTO the glyph, NOT as `strokeGlyph`'s blanket `override` (which recolours both rings). Affects `src/shell/render.ts:343` + `src/shell/glyphs.ts:313`. *Found by TEA during test design.*
- **Improvement** (non-blocking): V-008 (spiker) is `remediated_by: tp1-3`, but tp1-3 only fixed the COLOUR (orange→green); the 12-point-procedural→21-point-authored GEOMETRY is still divergent and is what tp1-17 fixes. The finding's `ours` quote is already frozen, so no citation action is needed — but the audit record conflates two fixes. Affects `docs/audit/findings/pair-2` V-008. *Found by TEA during test design.*
- **Improvement** (non-blocking): V-005 (pulsar bar), V-007 (tanker cargo emblems), V-009 (enemy shot) remain OPEN shape divergences not covered by tp1-17's ACs — candidates for a follow-up SHAPES story. Note V-007's cargo-emblem colours are already pinned by tp1-30 (pulsar=cyan is ROM-correct; fuseball=yellow contradicts the ROM's 4-colour TANKF mark). *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): finding V-008's claim "SPIRA2/3/4 … are the same spiral advanced one quarter-turn but re-authored, not rotated" is FACTUALLY WRONG. Verified vertex-for-vertex against `ALVROM.MAC:549-619`: SPIRA2 === rot90(SPIRA1), SPIRA3 === rot180, SPIRA4 === rot270. The ROM's four spiral tables ARE exact 90° rotations of one 21-point spiral; the real divergence was "12-point procedural → 21-point authored", not the rotation mechanism (both old and ROM rotate 90°/frame). Affects `docs/audit/findings/pair-2-alvrom-shapes-font.json` V-008 (claim text). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the `models.html` contact sheet's label metadata is stale — `COLOR.spiker = '#ffa500'` (orange) and the fuseball comment "one of its tri-colour legs" predate tp1-3/tp1-17 (the spiker is now green, the fuseball 5-colour). Cosmetic tool LABELS only (the glyphs themselves render correctly — verified by screenshot), not a game divergence. Affects `src/tools/contactSheet.ts:46-48`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the fuseball geometry has NO automated guard — `tp1-17.shapes.test.ts` pins FUSE0-3 by COLOUR only (5 colours, green+purple present, 4 distinct frames), not by vertex data, and the V-014 citation is frozen (remediated). I independently re-parsed `ALVROM.MAC:954-1095` and confirmed all four frames are byte-exact this review, but a future edit could silently regress the vertices. Consider a vertex-count/exact-vertex fuseball test in a follow-up. Affects `tests/shell/tp1-17.shapes.test.ts` (fuseball describe). *Found by Reviewer during code review.*
- **Question** (non-blocking): the player charge's in-GAME appearance (17 rendered dots vs the old two octagon outlines) was not visually confirmed — the `/models.html` contact sheet has no in-flight bullet, so only the enemy shapes were screenshotted. The glyph DATA is verified (17 dots, 9+8, colours, irregularity) and `strokeGlyph`'s 1-point dot-rendering is already exercised by `spikeGlyph`'s tip, so risk is low; an in-game spot-check is recommended before release. Affects `src/shell/render.ts drawBullets`. *Found by Reviewer during code review.*
- **Resolved during review**: the stale `drawBullets` comment (`render.ts:328`, "two concentric dotted octagon rings") that this PR orphaned was found and corrected to the DIARA2 shape (commit 58a92fa, comment-only). *Found + fixed by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 2 findings (0 Gap, 1 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Conflict:** the story description's finding range "V-005..V-010, DA-004" mis-scopes the work. The four ACs map to V-006 (tanker body, `ALVROM.MAC:651` GENTNK), V-008 (spiker, `:522` SPIRA1-4), **V-014** (fuseball, `:975` FUSE0-3 — OUTSIDE the stated range), and V-010+DA-004 (player charge, `:384` DIARA2). V-005 (pulsar bar), V-007 (tanker CARGO emblems) and V-009 (enemy shot) are INSIDE the range but named by NO AC. Affects `sprint/epic-tp1.yaml`.
- **Improvement:** the fuseball geometry has NO automated guard — `tp1-17.shapes.test.ts` pins FUSE0-3 by COLOUR only (5 colours, green+purple present, 4 distinct frames), not by vertex data, and the V-014 citation is frozen (remediated). I independently re-parsed `ALVROM.MAC:954-1095` and confirmed all four frames are byte-exact this review, but a future edit could silently regress the vertices. Consider a vertex-count/exact-vertex fuseball test in a follow-up. Affects `tests/shell/tp1-17.shapes.test.ts`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`sprint`** — 1 finding
- **`tests/shell`** — 1 finding

### Deviation Justifications

8 deviations

- **Scope narrowed to the four AC shapes**
  - Rationale: spec-authority — the ACs (which name exactly these four shapes) outrank the description's loose finding-range, which over-claims (adds pulsar/cargo/shot) and mis-cites (omits the fuseball's V-014).
  - Severity: minor
  - Forward impact: V-005/V-007/V-009 stay OPEN for a follow-up story (logged as a Delivery Finding).
- **Structural/radius pins instead of byte-exact per-vertex delta matching**
  - Rationale: the repo Y-flips some shapes and not others (CLAW_DELTAS "no y-flip" vs LIFE1 "Y is NEGATED"), so byte-exact per-vertex matching would reject a faithful port over a Y-sign choice. Radius/count/ratio signatures are sign/order-invariant yet uniquely identify each ROM shape; the byte-exact data still lands via the citation gate (Dev remediates each finding with the ROM `source`).
  - Severity: minor
  - Forward impact: none — the ROM shape is still forced; Dev picks the Y-convention.
- **RED drives a `playerBulletGlyph` signature change**
  - Rationale: makes "only the inner ring tinted" a pure, unit-testable property instead of a render-side behaviour; the blanket override cannot express it.
  - Severity: minor
  - Forward impact: render.ts:343 must pass the tint into the glyph, not as `strokeGlyph`'s override (Delivery Finding).
- **Re-seated sibling tests that encoded the eyeballed shapes**
  - Rationale: those siblings asserted the shapes tp1-17 replaces (elongated≠square, octagons≠dots) and would block Dev; and the ROM body may be an open polyline, so `find(s.closed)` would miss it. The positional detector passes on BOTH shapes — verified: tp1-30 stays 35/35 green.
  - Severity: minor
  - Forward impact: none.
- **Removed the RED "not a rigid rotation" spiker test — its premise is refuted by the ROM**
  - Rationale: the primary source refutes the test's premise; the frames ARE exact rotations. "Passing" the test would require an unfaithful perturbation of the frames. The real divergence (12→21 points + the authored curve) is still pinned by the surviving tests (21-count, radii-match-SPIRA1, green, 4-distinct).
  - Severity: minor
  - Forward impact: V-008's audit note is factually wrong (Delivery Finding); no code impact.
- **`playerBulletGlyph` gained a `tint` parameter**
  - Rationale: exactly as TEA specified — makes "only the inner ring tinted" a pure, unit-testable property.
  - Severity: minor
  - Forward impact: none.
- **Extended citation remediation to V-011 (beyond TEA's four)**
  - Rationale: V-011 is the ALDISP/ALVROM twin of DA-004; my fix fully resolves it (blue tint by tp1-12, inner-only by tp1-17). Not scope creep — it is the same one-line fix.
  - Severity: minor
  - Forward impact: none — V-011 fully resolved.
- **ROM vertices normalised into the module's glyph-local scale (`scaleVerts`)**
  - Rationale: the ROM units are ~3.5× the old glyph-local extents; without normalising, enemies would render 3–4× too large. Scale is shape-invariant, the tests are scale-invariant, and the visual screenshot confirms consistent sizing.
  - Severity: minor
  - Forward impact: none.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Scope narrowed to the four AC shapes**
  - Spec source: session ACs (tp1-17); context-story-tp1-17.md
  - Spec text: story description "Cluster C13, part 1. Subsumes V-005..V-010, DA-004."
  - Implementation: RED covers only V-006 (tanker body), V-008 (spiker), V-014 (fuseball), V-010/DA-004 (player charge). V-005 (pulsar bar), V-007 (tanker cargo emblems), V-009 (enemy shot) are NOT tested.
  - Rationale: spec-authority — the ACs (which name exactly these four shapes) outrank the description's loose finding-range, which over-claims (adds pulsar/cargo/shot) and mis-cites (omits the fuseball's V-014).
  - Severity: minor
  - Forward impact: V-005/V-007/V-009 stay OPEN for a follow-up story (logged as a Delivery Finding).
- **Structural/radius pins instead of byte-exact per-vertex delta matching**
  - Spec source: AC-5; repo convention (glyphs.test.ts pins exact ROM deltas via matchUpToScale for flipper/pulsar/claw)
  - Spec text: "Vertex data is TRANSCRIBED from the ROM and cited, never eyeballed."
  - Implementation: tanker/spiker pinned by count (17/21), two-ring 12:32 ratio, monotonic SPIRA1 radius SET, and "not a rigid 90°/frame rotation"; player charge by dot-count/ring-split/colour/outer-irregularity — not by per-vertex delta equality.
  - Rationale: the repo Y-flips some shapes and not others (CLAW_DELTAS "no y-flip" vs LIFE1 "Y is NEGATED"), so byte-exact per-vertex matching would reject a faithful port over a Y-sign choice. Radius/count/ratio signatures are sign/order-invariant yet uniquely identify each ROM shape; the byte-exact data still lands via the citation gate (Dev remediates each finding with the ROM `source`).
  - Severity: minor
  - Forward impact: none — the ROM shape is still forced; Dev picks the Y-convention.
- **RED drives a `playerBulletGlyph` signature change**
  - Spec source: DA-004 (subsumed); AC-4
  - Spec text: "ROM draws loose dots with only the inner ring ammo-tinted"
  - Implementation: tests call `playerBulletGlyph(tint: GlyphColor)` (inner = tint, outer = yellow) — the current `playerBulletGlyph()` takes no arg and is recoloured wholesale by render's `override`.
  - Rationale: makes "only the inner ring tinted" a pure, unit-testable property instead of a render-side behaviour; the blanket override cannot express it.
  - Severity: minor
  - Forward impact: render.ts:343 must pass the tint into the glyph, not as `strokeGlyph`'s override (Delivery Finding).
- **Re-seated sibling tests that encoded the eyeballed shapes**
  - Spec source: existing glyphs.test.ts (Story 6-8), tp1-30 (V-019/DB-017)
  - Spec text: glyphs.test.ts "elongated ... body" + "two ... octagon rings"; tp1-30 `bodyOf = find(s.closed)`
  - Implementation: glyphs.test.ts tanker "elongated" test re-seated to the orthogonal "there is a purple body" invariant; its octagon block replaced with a "17 dots" RE-SEAT; tp1-30 `bodyOf`/`emblemOf` moved from `closed`-based to positional (body=last stroke, emblem=first).
  - Rationale: those siblings asserted the shapes tp1-17 replaces (elongated≠square, octagons≠dots) and would block Dev; and the ROM body may be an open polyline, so `find(s.closed)` would miss it. The positional detector passes on BOTH shapes — verified: tp1-30 stays 35/35 green.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Removed the RED "not a rigid rotation" spiker test — its premise is refuted by the ROM**
  - Spec source: tp1-17.shapes.test.ts (TEA RED); finding V-008
  - Spec text: RED test "the 4 frames are separately AUTHORED, not one curve rigidly rotated 90°/frame"; V-008 "re-authored, not rotated"
  - Implementation: verified SPIRA2/3/4 === rot90/180/270(SPIRA1) vertex-for-vertex (ALVROM.MAC:549-619), implemented `spikerGlyph` as SPIRA1 rotated (frame&3)·90°, and REMOVED the false test (replaced with a citation-bearing NOTE).
  - Rationale: the primary source refutes the test's premise; the frames ARE exact rotations. "Passing" the test would require an unfaithful perturbation of the frames. The real divergence (12→21 points + the authored curve) is still pinned by the surviving tests (21-count, radii-match-SPIRA1, green, 4-distinct).
  - Severity: minor
  - Forward impact: V-008's audit note is factually wrong (Delivery Finding); no code impact.
- **`playerBulletGlyph` gained a `tint` parameter**
  - Spec source: DA-004 / V-011; AC-4; TEA deviation "RED drives a playerBulletGlyph signature change"
  - Spec text: "only the inner ring ammo-tinted"
  - Implementation: `playerBulletGlyph(tint: GlyphColor)` colours the 9 inner dots = tint and the 8 outer dots = fixed yellow; `render.ts drawBullets` passes the tint INTO the glyph instead of as `strokeGlyph`'s blanket override.
  - Rationale: exactly as TEA specified — makes "only the inner ring tinted" a pure, unit-testable property.
  - Severity: minor
  - Forward impact: none.
- **Extended citation remediation to V-011 (beyond TEA's four)**
  - Spec source: TEA Delivery Finding (remediate V-006/V-010/V-014/DA-004); the audit citation gate
  - Spec text: TEA listed four findings to mark `remediated_by`
  - Implementation: also marked V-011 `remediated_by: tp1-17`. My render.ts change (tint into glyph, not override) resolves V-011's exact divergence — "the CHACOU ammo tint recolours the whole bullet; the ROM recolours only the charge's CENTRE dots" — and changed the very line V-011 cited (reanchor reported it LOST otherwise).
  - Rationale: V-011 is the ALDISP/ALVROM twin of DA-004; my fix fully resolves it (blue tint by tp1-12, inner-only by tp1-17). Not scope creep — it is the same one-line fix.
  - Severity: minor
  - Forward impact: none — V-011 fully resolved.
- **ROM vertices normalised into the module's glyph-local scale (`scaleVerts`)**
  - Spec source: AC-5 (transcribed); glyphs.ts module contract ("glyph-local space; render.ts scales")
  - Spec text: transcribe the ROM vertex data
  - Implementation: raw ROM object-unit vertices (±0x20, ±0x0f, …) are uniformly scaled to the module's established ~±9 (enemies) / ±6 (bullet) via `scaleVerts`, so render.ts sizing is unchanged; shape preserved exactly.
  - Rationale: the ROM units are ~3.5× the old glyph-local extents; without normalising, enemies would render 3–4× too large. Scale is shape-invariant, the tests are scale-invariant, and the visual screenshot confirms consistent sizing.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
Every logged deviation reviewed and stamped:
- **TEA — Scope narrowed to the four AC shapes** → ✓ ACCEPTED: spec-authority is correct (ACs > description's loose finding-range); the out-of-scope V-005/V-007/V-009 are logged as Delivery Findings, nothing slips.
- **TEA — Structural/radius pins instead of byte-exact deltas** → ✓ ACCEPTED with note: the pins (count 17/21, 12:32 ratio, SPIRA1 radius set, dot irregularity) uniquely identify each ROM shape and are Y-sign-agnostic — sound. The sub-claim "not a rigid 90°/frame rotation" in this deviation was later REFUTED by the ROM and its test removed (see Dev deviation below); the surviving pins remain sufficient. I independently re-parsed ALVROM.MAC and confirmed all four shapes are byte-exact, so the "data lands via the citation gate" rationale holds.
- **TEA — playerBulletGlyph signature change** → ✓ ACCEPTED: a clean pure seam that makes "only the inner ring tinted" unit-testable; render.ts consumes it correctly.
- **TEA — Re-seated sibling tests** → ✓ ACCEPTED: the glyphs.test.ts re-seats and the tp1-30 positional body/emblem detector pass on both old and new shapes (verified: tp1-30 35/35 green, full suite green).
- **Dev — Removed the "not a rigid rotation" spiker test** → ✓ ACCEPTED: independently verified SPIRA2/3/4 === rot90/180/270(SPIRA1) vertex-for-vertex (ALVROM.MAC:549-619); the premise was genuinely false, removal (not unfaithful perturbation) was correct, and the surviving 21-count + radii-match + green + distinctness pins still force the ROM spiral.
- **Dev — playerBulletGlyph gained a `tint` parameter** → ✓ ACCEPTED: matches TEA's intent; inner=tint / outer=yellow verified.
- **Dev — Extended citation remediation to V-011** → ✓ ACCEPTED: V-011 is DA-004's ALDISP/ALVROM twin, my read of its claim confirms the fix resolves it; reanchor reports 0 lost and citations are green.
- **Dev — ROM vertices normalised via scaleVerts** → ✓ ACCEPTED: uniform, shape-preserving; sizes confirmed consistent in the /models.html screenshot.

No undocumented deviations found — every spec divergence is logged and accounted for.

## Sm Assessment

**Story:** tp1-17 — SHAPES: the tanker, spiker, fuseball and player charge, drawn from the ROM's vertex data. Cluster C13 part 1 (subsumes V-005..V-010, DA-004). 5pts, p1, tdd, repo: tempest.

**Setup complete:**
- Session + context (`sprint/context/context-story-tp1-17.md`) created.
- Branch `feat/tp1-17-tp1-17-shapes` cut off origin/develop (tempest is gitflow → PRs target develop, squash merge).
- No Jira (local tracking; jira_key = story id).

**Pre-handoff verification:**
- Merge gate clear — zero open PRs fleet-wide.
- No parallel-checkout race: `git fetch` + grep of origin logs found no tp1-17 work; no open tempest PR.
- Dependencies satisfied — tp1-12 (palette slots) and tp1-3 (spiker is GREEN) both archived.

**Routing:** phased tdd → TEA owns RED. Four independently-landable shapes, each with a hard ROM-transcription bar.

**For TEA (O'Brien):**
- Every vertex set must be TRANSCRIBED from the ROM and CITED, never eyeballed (AC-5). `npm test -- citations` must stay green (AC-7).
- Targets: tanker = 17-vertex laced double diamond; spiker = 21-point spiral, colour GREEN (see tp1-3); fuseball = 5-colour scribble; player charge = 17 dots in two rings.
- Recommend reading prior archives `sprint/archive/tp1-12-session.md` (palette slots this depends on) and `tp1-3-session.md` (spiker green) for the ROM quarry the prior TEA may have pre-extracted.
- Each item is independently landable and blocks nothing — RED can grow incrementally per shape.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5-pt ROM-fidelity story; four shapes each need failing tests that pin the authentic ROM geometry against the current eyeballed glyphs.

**Test Files:**
- `tests/shell/tp1-17.shapes.test.ts` — NEW. The authoritative RED pins for all four shapes + AC-5 oracle self-check + rule coverage.
- `tests/shell/glyphs.test.ts` — RE-SEAT. Tanker "elongated body" test → orthogonal "purple body" invariant; the two-octagon player-bullet block → a "17 dots" RE-SEAT.
- `tests/shell/tp1-30.palette-enemies-starfield.test.ts` — RE-SEAT. `bodyOf`/`emblemOf` moved from `closed`-based to positional (survives the ROM body being an open polyline).

**Tests Written:** 21 tests across 4 ACs (13 new failing + 1 re-seated failing + guards). **Status: RED confirmed** — full tempest suite 14 failed / 1262 passed; the 14 failures are exactly the tp1-17 shape pins, each failing for its ROM-specific reason (tanker 4→17 vtx & 1.5→2.67 ratio & elongated→square; spiker 12→21 & rotation→re-authored; fuseball missing green/purple; charge 0→17 dots, inner-tint, outer 15/11 irregularity). No collateral: all 110 other files green; tp1-30 stays 35/35; `citations` green.

**ROM source of truth (all transcribed direct from primary source, cited in the test):**
- Tanker body — `ALVROM.MAC:651-668` GENTNK: 17 SCVEC absolute vertices, PURPLE, outer diamond ±0x20 / inner ±0x0c (V-006).
- Spiker — `ALVROM.MAC:521-620` SPIRA1-4: four GREEN 21-vertex authored spirals, radii wind strictly outward (V-008).
- Fuseball — `ALVROM.MAC:954-1095` FUSE0-3: four frames, five CSTAT groups red/yellow/green/purple/turqoi(cyan) (V-014).
- Player charge — `ALVROM.MAC:383-403` DIARA2: 17 SCDOT dots, 9 inner (PSHCTR/ammo-tint) + 8 outer (YELLOW, irregular +cardinals 0x0f vs −cardinals 0x0b) (V-010/DA-004).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Hard Architectural Boundary (glyphs = shell, no core import) | `glyphs.ts stays SHELL-only` | passing (guard) |
| Purity (no Math.random/Date/performance — frame-exact, no flicker) | `glyph geometry is pure` | passing (guard) |
| TS lang-review #1 (no `as any` / `@ts-ignore`) | `uses no as any / @ts-ignore` | passing (guard) |
| TS lang-review #2 (`readonly` on vertex tables) | `keeps the transcribed vertex tables readonly` | passing (guard) |
| TS lang-review #8 (deterministic, meaningful assertions) | `every animated glyph is deterministic` + AC-5 oracle self-check | passing (guard) |

**Rules checked:** boundary + purity + TS #1/#2/#8 — the applicable subset for a pure vector-data module (no async/JSON/React/network surface).
**Self-check:** 0 vacuous assertions — every RED test's failure reason is a concrete ROM value (verified by the testing-runner per-test failure lines); guards assert real invariants (green/determinism/readonly), not `assert(true)`.

**Handoff:** To Dev (Julia) for GREEN. Transcribe the four ROM shapes into `src/shell/glyphs.ts`; add the `playerBulletGlyph(tint)` parameter and update `render.ts drawBullets` to pass the tint IN (not as a blanket override); then satisfy AC-7 — mark V-006/V-010/V-014/DA-004 `remediated_by: tp1-17` and re-anchor the other glyphs.ts citations (see Delivery Findings). Do NOT touch V-005/V-007/V-009 (out of scope).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/glyphs.ts` — replaced the four eyeballed glyphs with ROM-transcribed data (all hex literals matching `ALVROM.MAC`): tanker body = GENTNK 17-vertex laced double diamond (open, purple); spiker = SPIRA1 21-vertex spiral rotated (frame&3)·90° (green); fuseball = FUSE0-3 four authored frames × 5 colour groups (red/yellow/green/purple/cyan); player charge = DIARA2 17 dots via `playerBulletGlyph(tint)` (9 inner=tint + 8 outer=yellow). Added `scaleVerts`/`maxExtent` helpers to normalise ROM object units into the module's glyph-local scale; removed the dead `octagon` helper.
- `src/shell/render.ts` — `drawBullets` passes the ammo tint INTO `playerBulletGlyph(tint)` instead of as `strokeGlyph`'s blanket override (DA-004/V-011: only the inner ring is tinted).
- `tests/shell/tp1-17.shapes.test.ts` — removed the RED "not a rigid rotation" test (its premise is refuted by the ROM; see Deviations) and its now-dead `rot` helper.
- `docs/audit/findings/pair-2-alvrom-shapes-font.json`, `pair-3-aldisp-a-objects.json` — marked V-006, V-010, V-011, V-014, DA-004 `remediated_by: tp1-17`.
- `docs/audit/findings/pair-2/3/6/8*.json` — re-anchored 25 citations whose glyphs.ts/render.ts line numbers shifted (`tools/audit/reanchor-citations.mjs --write`; 0 lost).

**Tests:** 1275/1275 passing (GREEN) — full tempest suite, `TEMPEST_SOURCE_DIR` set. `npm test -- citations` green (12/12). `npm run build` (tsc --noEmit && vite build) clean.

**Visual verification:** served this checkout on :5283 (ownership confirmed via lsof), screenshotted `/models.html` (real render pipeline). Confirmed: tanker = purple SQUARE laced double diamond; spiker = green outward spiral; fuseball = 5-colour scribble (red/yellow/green/purple/cyan all visible); all at sizes consistent with the other actors.

**Branch:** feat/tp1-17-tp1-17-shapes (pushed)

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (stale comment) | confirmed 1, fixed during review |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — assessed by Reviewer |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — the one stale comment was caught by preflight + fixed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — assessed by Reviewer |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (pure client render, no auth/input/secrets) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by Reviewer |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — Rule Compliance done by Reviewer below |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped)
**Total findings:** 1 confirmed (stale comment, fixed), 0 dismissed, 2 deferred (Delivery Findings: fuseball vertex-coverage gap; in-game bullet spot-check)

## Reviewer Assessment

**Verdict:** APPROVED

Only `reviewer-preflight` was enabled (the other 8 are disabled via project settings), so I performed the type/edge/silent-failure/simplifier/rule analysis myself — plus an independent ROM re-transcription, the highest-value check for a fidelity story.

**Observations:**
1. `[VERIFIED]` **ROM transcription is byte-exact.** I re-parsed `ALVROM.MAC` independently and compared every value: GENTNK = 18 pts (entry + 17), outer 0x20 / inner 0x0c; DIARA2 = 9 inner + 8 outer with the +cardinal 0x0f / −cardinal 0x0b irregularity; SPIRA1 = 21 verts; all four FUSE frames = five colour groups (red/yellow/green/purple/turqoi) in order. **Every value matches.** Evidence: parse-compare + the audit's own V-006 `reasoning` ("Hand-traced all 18 points… outer diamond (±0x20)/inner diamond (±0xC)"). Complies with AC-5 (transcribed, not eyeballed) and the citation gate.
2. `[VERIFIED]` **The removed spiker test was correctly removed.** SPIRA2/3/4 === rot90/180/270(SPIRA1) vertex-for-vertex (`ALVROM.MAC:549-619`, confirmed by script). `spikerGlyph` rotates SPIRA1 by (frame&3)·90° — the ROM's own relationship. Surviving pins (21-count all 4 frames, radii-match-SPIRA1, green, 4-distinct, wrap) still force the exact ROM spiral. glyphs.ts:130-145.
3. `[VERIFIED]` **DA-004/V-011 render fix is correct.** `render.ts drawBullets` passes the tint INTO `playerBulletGlyph(tint)` with NO `strokeGlyph` override; the glyph colours 9 inner dots = tint, 8 outer = fixed yellow. Only the inner ring recolours. render.ts:343, glyphs.ts playerBulletGlyph. Complies with the "only inner ring ammo-tinted" rule.
4. `[VERIFIED]` **Purity + Hard Architectural Boundary hold.** glyphs.ts imports nothing from `core/(sim|state|rules|rng|enemies)`; no `Math.random`/`Date`/`performance`; no `as any`/`@ts-ignore`; the transcribed tables are `readonly`. Enforced by tests + `tsc --noEmit` (noUnusedLocals) clean.
5. `[VERIFIED]` **Citation gate green.** V-006/V-010/V-011/V-014/DA-004 `remediated_by: tp1-17`; 25 shifted citations re-anchored; 0 lost; `citations` 12/12. Findings-file diffs are line-number + remediated_by only (no reformat).
6. `[VERIFIED]` **Sizes preserved + shapes render right.** `scaleVerts` normalises ROM object units (~3.5× the old glyph space) to the module's ~±9 (enemies) / ±6 (bullet); /models.html screenshot confirms tanker = purple SQUARE laced double diamond, spiker = green outward spiral, fuseball = 5-colour scribble, all at sizes consistent with the other actors.
7. `[LOW][DOC]` Stale `drawBullets` comment (render.ts:328) contradicted the new shape → **found by preflight, fixed** (commit 58a92fa, comment-only).
8. `[LOW][TEST]` The fuseball is pinned by colour only, not vertices (Delivery Finding) — no blocker (verified byte-exact this review) but no automated regression guard.

**Data flow traced:** `s.bullets.length` → `playerBulletColor(count)` → `tint` → `playerBulletGlyph(tint)` (inner dots) → `strokeGlyph` (no override) → canvas. The outer ring is fixed yellow regardless of tint — the DA-004 requirement — safe because the tint is now glyph data, not a wholesale recolour.

**Pattern observed:** transcribe-raw-ROM-then-normalise-scale (glyphs.ts `scaleVerts` + hex literals matching the source) — consistent with the existing FLIPPER_DELTAS/CLAW_DELTAS idiom and auditable against `ALVROM.MAC`.

**Error handling:** frame selection is `frame & 3` (wraps, and negative frames wrap correctly in JS); `paletteColor`/`paletteBank` already guard non-finite level (tp1-30); `scaleVerts` only ever receives non-empty tables. No throwing paths; a pure value producer.

### Rule Compliance

Applicable rules for this pure vector-data module: tempest's Hard Architectural Boundary (CLAUDE.md) + the TypeScript lang-review checklist. No `.claude/rules/` or `SOUL.md` exist.

| Rule | Scope checked | Verdict |
|------|---------------|---------|
| Boundary: glyphs = shell, no core import | glyphs.ts import list | ✓ compliant (no core/(sim\|state\|rules\|rng\|enemies) import) |
| Purity: no time/randomness | every new fn (tanker/spiker/fuseball/bullet/scaleVerts) | ✓ compliant (explicit args only) |
| TS #1: no `as any`/`@ts-ignore`/unsafe `!` | full diff | ✓ compliant (0 hits; the only `as`-cast is the pre-existing `'yellow' as GlyphColor`) |
| TS #2: `readonly` on data not mutated | GENTNK_VERTS, SPIRA1, FUSE_FRAMES, DIARA2_INNER/OUTER, GlyphStroke.points | ✓ compliant (all `readonly`) |
| TS #4: `??` vs `||` on falsy-valid | `scaleVerts` `k ?? …` | ✓ compliant (uses `??`; k is never a valid 0 here, but `??` is correct anyway) |
| TS #8: meaningful assertions, no vacuous | tp1-17.shapes.test.ts (21 tests) + re-seats | ✓ compliant (every failing RED test had a concrete ROM value; guards assert real invariants) |
| Enum/generic/async/security/React rules | — | N/A (no enums, generics, async, network, JSX, or auth surface) |

### Devil's Advocate

Arguing this code is broken. **The fuseball is only colour-tested — a transcription typo would ship silently.** True in principle, so I did not trust the tests: I re-parsed `ALVROM.MAC:954-1095` mechanically and diffed all 116 fuseball vertices against the hex literals in `FUSE_FRAMES`; every one matches, including the awkward two-digit hex (`0x1a`, `0x1c`, `0x13`) that a decimal misreading would corrupt. Refuted, but logged as a coverage gap. **The tanker body is now `closed:false` — won't it render with a visible gap?** The ROM draws GENTNK as an open chain (RTSL, no closing vector); its final vertex (0x0c,0) and entry (0x20,0) both lie on the +x axis where drawn segments already run, so the "missing" close overlaps existing geometry — and the screenshot shows a complete-looking laced diamond. Refuted. **Sizes ballooned — ROM units are 3.5× the old glyph space.** `scaleVerts` normalises each shape to the module's established extent; the screenshot shows all five actors at consistent sizes. Refuted. **The 17-dot bullet may be invisible or unrecognisable in-game.** This is the one thing I could NOT directly confirm — the contact sheet has no in-flight bullet. Mitigations: the DATA is unit-verified and `strokeGlyph` already renders 1-point strokes as filled dots (proven by `spikeGlyph`'s tip). Residual risk is low; I logged a Delivery Finding recommending an in-game spot-check before release rather than block on it. **The removed test weakens the spiker — could a wrong spiral pass?** No: `radiiMatch` demands SPIRA1's exact 21-radius set, which a 12-point or mis-scaled spiral cannot satisfy. **V-011 remediation is scope creep.** No — V-011 cites the exact render line I changed and describes the exact divergence I fixed (whole-bullet recolour → inner-only); reanchor confirmed it was the only LOST citation and marking it resolved it. Nothing broken survives.

**Verdict:** APPROVED — no Critical or High issues. Two Low observations (one fixed in review, one deferred as a Delivery Finding). The change is a byte-exact, independently-verified ROM transcription with full test + build + citation + visual coverage.

**Handoff:** To SM (Winston Smith) for finish-story. NOTE: this PR was AI-authored and AI-reviewed within one session — the finish/merge step requires human authorization (self-approval guardrail); SM must not self-merge.