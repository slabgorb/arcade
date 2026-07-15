---
story_id: "tp1-18"
jira_key: "tp1-18"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-18: SHAPES — the player-death splat, the burst effects, and the score pop-ups

## Story Details
- **ID:** tp1-18
- **Jira Key:** tp1-18
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T23:51:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T22:56:22Z | 2026-07-15T22:58:07Z | 1m 45s |
| red | 2026-07-15T22:58:07Z | 2026-07-15T23:29:50Z | 31m 43s |
| green | 2026-07-15T23:29:50Z | 2026-07-15T23:45:02Z | 15m 12s |
| review | 2026-07-15T23:45:02Z | 2026-07-15T23:51:56Z | 6m 54s |
| finish | 2026-07-15T23:51:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Conflict** (non-blocking): tp1-18's subsumes list "V-013, V-017, DA-007, DA-009, DA-018, DA-019" is imprecise, and the sm-setup "### Story Subsumes" labels below are wrong (they mislabel V-017 as "Burst effects", DA-007 as "Splat duration", DA-009 as "Score pop-up", DA-018 as "Splat radius curve", DA-019 as "Shattered-spike sparkle"). The verified mapping is: V-013+DA-009 = the SPLAT shape+colour; DA-010 = splat duration; DA-011 = splat radius (wont_fix); DA-007 = the invader-collision SPARK1 cross; DA-018 = enemy-bolt cadence; DA-019 = bolt-vs-bolt burst; V-017 = the TEMPEST-LOGO alphabet (tp1-19's subject). Affects `sprint/epic-tp1.yaml` (tp1-18 subsumes list) and this session's Story Subsumes block. *Found by TEA during test design.*
- **Conflict** (non-blocking): V-017 (logo alphabet) and the title's "score pop-ups" (= FUSEX digit glyphs = finding V-022) both belong to tp1-19 ("SHAPES — the TEMPEST logo's own stair-stepped alphabet and the 22-dot star pictures"), not tp1-18. They are carved out here. If tp1-19 does NOT already cover V-017, it must be re-filed there. Affects `sprint/epic-tp1.yaml` (tp1-19 subsumes V-014/V-015/V-022/DA-006 — V-017 is not listed). *Found by TEA during test design.*
- **Improvement** (non-blocking): DA-018 (enemy-bolt cadence) is already `remediated_by: tp1-35` and DA-019 (bolt-vs-bolt 16-spoke burst) is already live (sim emits `bolt-destroyed` at sim.ts:401 → fx spawns the enemy burst; covered by tests/shell/tp1-13.fx-bolt-explosion.test.ts). Neither needs new implementation; a light source-guard pins DA-018 here. Affects nothing to change — noted so Dev does not re-do them. *Found by TEA during test design.*
- **Improvement** (blocking for GREEN): the splat's SHAPE and COLOUR fix edits `src/shell/fx.ts` + `src/shell/render.ts` (both are cited `ours` files), so Dev MUST, before committing, run `node tools/audit/reanchor-citations.mjs --write` and mark any finding whose divergence is actually removed (V-013/DA-009/DA-010/DA-007) with `remediated_by: tp1-18` — or `npm test -- citations` goes red. DA-011 is wont_fix: do NOT remediate it, and do NOT touch the radius curve. Affects `tempest/docs/audit/findings/*.json`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the `const SPLAT_LIFE = 0.9` line is the `ours` citation of TWO findings, not one — DA-010 (pair-3) AND **FR-015** (pair-11-framerate-adjudication). TEA's remediation note named only the pair-3 set, so FR-015 was also stamped `remediated_by: tp1-18` (the "one `ours` line backs multiple findings across pair files" case). Reanchor reports 0 lost. Affects `tempest/docs/audit/findings/pair-11-framerate-adjudication.json`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the splat + spark render through the proven `strokeGlyph` path (same as every other glyph) and their geometry is structurally pinned (tp1-18.shapes.test.ts) AND byte-verified (citation gate), but on-screen SCALE/ORIENTATION/COLOUR was not eyeballed here — the pinned dev port (5273) risks serving a sibling checkout (see [[dev-port-owned-by-sibling-checkout]]). A visual confirmation of the death splat (tri-colour ragged ring, grow→shrink) and the grab spark (small yellow cross) is a Reviewer/eyeball concern. Affects nothing to change — noted for Reviewer. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): a stale comment survives at `src/shell/render.ts:529-531` — the Story-10-5 header still calls the player splat "a concentric jagged star that grows/shrinks while its colour cycles," which now contradicts the code (one ROM ring with SPATIAL tri-colour + ROTCOL, not concentric rings with a single cycling colour). LOW/doc-only; correct it on the next touch of that block. Affects `tempest/src/shell/render.ts` (update the comment). *Found by Reviewer during code review.*
- **Question** (non-blocking): the on-screen splat/spark were not visually verified (Dev flagged this). Recommend an eyeball at finish or in a follow-up — geometry is byte-verified + structurally pinned, so risk is scale/orientation cosmetic only. Affects nothing to change. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **V-017 (logo) and "score pop-ups" not tested — carved to tp1-19**
  - Spec source: sprint/epic-tp1.yaml, tp1-18 description + AC-4
  - Spec text: "Subsumes V-013, V-017, ..." / "The score pop-ups and shattered-spike sparkle match the ROM."
  - Implementation: No test written for the TEMPEST-logo alphabet (V-017) or a "score pop-up"; those are tp1-19's explicit subject (V-017 alphabet; V-022 FUSEX digit glyphs = the pop-up).
  - Rationale: tp1-19's title IS the logo alphabet + star pictures; testing them here duplicates/pre-empts it. AC-4's "score pop-ups / shattered-spike sparkle" match no finding in tp1-18's subsumes list.
  - Severity: minor
  - Forward impact: tp1-19 owns V-017 + V-022 (confirm V-017 is filed there).
- **DA-018 / DA-019 pinned by guard/reference only, not re-implemented**
  - Spec source: sprint/epic-tp1.yaml, tp1-18 subsumes list
  - Spec text: "Subsumes ... DA-018, DA-019"
  - Implementation: DA-018 gets a light source-guard (renderTime·ROM_FPS, not b.depth); DA-019 is left to its existing coverage (tp1-13.fx-bolt-explosion.test.ts).
  - Rationale: Both were already fixed (DA-018 remediated_by tp1-35; DA-019 live via bolt-destroyed). New impl would be a no-op.
  - Severity: minor
  - Forward impact: none.
- **fx.explosions.test.ts re-seated: single-colour-per-frame test removed, death driven by cause event**
  - Spec source: docs/audit/findings DA-009 (`ours`) + Story 10-5 tests/shell/fx.explosions.test.ts
  - Spec text (DA-009 ours): "ex.color = SPLAT_CYCLE[...]" — one whole-object colour advanced per frame.
  - Implementation: Deleted the "color-cycles every frame" test (it asserted the exact defect DA-009 refutes); re-seated the splat spawn/radius/integration tests to trigger via a `player-death` cause event and dropped the `.spokes`/single-`.color` shape assertions (now owned by tp1-18.shapes.test.ts).
  - Rationale: A test that pins the per-frame single-colour strobe would block Dev and enshrine the bug; TEA owns test maintenance, so re-seat preserving each test's still-true intent (per the "silence the legacy mechanism in fixtures" rule).
  - Severity: minor
  - Forward impact: Dev's `PlayerSplat` interface likely changes (single `color` → a ROTCOL rotation phase); no externally-exposed interface.
- **Splat shape pinned as a ~24-vertex radius-COVER + tri-colour SET, not an exact 26-point byte match**
  - Spec source: AC-1
  - Spec text: "the ROM's 26-vertex tricolour outline"
  - Implementation: The behavioural test pins the 24 LIT ring vertices via a scale-invariant radius-cover + colour set + ROTCOL 3-cycle, not an exact 26-point equality (the 2 beam-off SCVEC entries — the pen-position start and origin reset — are bookkeeping).
  - Rationale: Byte-exactness lands via the citation gate; the behavioural test must not reject a faithful port over the start/close/origin representation or a Y-flip (the tp1-17 convention).
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Reshaped `PlayerSplat` and added a `PlayerSpark` Explosion kind**
  - Spec source: tests/shell/tp1-18.fx-splat.test.ts + tp1-18.shapes.test.ts; TEA assessment "PlayerSplat's single color/cycle becomes a ROTCOL rot phase"
  - Spec text: DA-009 (spatial tri-colour + ROTCOL), DA-007 (distinct grab cue)
  - Implementation: `PlayerSplat` dropped `spokes`/`color`/`cycle`, gained `rot` (ROTCOL phase); the death splat now renders `splatGlyph(rot)`. Added `PlayerSpark { kind:'spark' }` rendered from `sparkGlyph()`, spawned when the `player-death` cause is `'grab'`. `Explosion` union widened to 3 kinds; `drawExplosions` made an explicit 3-way dispatch.
  - Rationale: The single-`color` strobe was the DA-009 defect; the tri-colour ring + rotation and the distinct spark cue need these shapes. TEA anticipated the interface change (no external interface exposed).
  - Severity: minor
  - Forward impact: none (only fx.ts↔render.ts; the two consumer tests were authored/re-seated for it).
- **Remediated FR-015 in addition to the story's named findings**
  - Spec source: TEA Delivery Finding (blocking-for-GREEN) naming V-013/DA-009/DA-010/DA-007 for `remediated_by`
  - Spec text: "mark any finding whose divergence is actually removed with remediated_by: tp1-18"
  - Implementation: Also stamped FR-015 (pair-11), whose `ours` is the same `SPLAT_LIFE = 0.9` line DA-010 cites. Removed the enemy `jaggedStarPath` helper (V-013's cited line) and re-anchored the 28 drifted citations (DA-011's kept radius line among them). 0 lost.
  - Rationale: The "one `ours` line backs multiple findings across pair files" rule — leaving FR-015 unmarked would red the citation gate on the next story.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **TEA — V-017 + "score pop-ups" carved to tp1-19** → ✓ ACCEPTED: verified against epic-tp1.yaml — tp1-19's title IS the logo alphabet + star pictures, and V-022 (FUSEX digits = the pop-ups) is in tp1-19's subsumes. Correct carve-out; the cross-story Conflict is filed as a Delivery Finding.
- **TEA — DA-018/DA-019 guard-only, not re-implemented** → ✓ ACCEPTED: confirmed DA-018 is `remediated_by: tp1-35` (render.ts uses `renderTime*ROM_FPS`) and DA-019 is live (`bolt-destroyed` at sim.ts:401 + tp1-13 test). Re-implementing would be a no-op; the source guard is sound.
- **TEA — fx.explosions.test.ts re-seat (removed the single-colour-per-frame test)** → ✓ ACCEPTED: the deleted test asserted the exact DA-009 defect; the re-seated spawn/radius/integration tests still assert meaningful behaviour driven by the realistic `player-death` cause event — a legitimate re-seat, not a loosening-to-pass.
- **TEA — splat pinned as radius-COVER + tri-colour SET, not exact 26-point byte match** → ✓ ACCEPTED: byte-exactness is enforced by the citation gate; the behavioural test correctly stays sign/scale/Y-flip tolerant (the tp1-17 convention). The oracle-well-formedness block keeps the transcription honest.
- **Dev — reshaped PlayerSplat + added PlayerSpark kind** → ✓ ACCEPTED: TEA anticipated the interface change; the union is exhaustively dispatched (`drawExplosions` if/else-if), no `never`-guard needed, no external consumers beyond the two authored/re-seated test files.
- **Dev — remediated FR-015 beyond the named set** → ✓ ACCEPTED: independently verified — `SPLAT_LIFE = 0.9` is the `ours` of both DA-010 (pair-3) and FR-015 (pair-11); the extra stamp is correct and reanchor reports 0 lost. The ledger diff is line-numbers + 5 remediations only, no verbatim/source weakening.
- No UNDOCUMENTED deviations found — the diff matches the logged scope.

## Technical Approach

### Story Subsumes
- V-013: Player-death splat visual
- V-017: Burst effects visual
- DA-007: Splat duration adjustment
- DA-009: Score pop-up visuals
- DA-018: Splat radius curve (DO NOT FIX — DA-011 was refuted)
- DA-019: Shattered-spike sparkle

### Dependencies
- **tp1-1 (DONE):** THE REBASE — provides ROM_FPS for rebasing the splat's duration (DA-010)
- **tp1-12 (DONE):** THE PALETTE — provides colour cycle mechanism for the splat's spatial colour cycle

### Acceptance Criteria Summary
1. The player-death splat is the ROM's 26-vertex tricolour outline with its spatial colour cycle.
2. The splat's duration is rebased through ROM_FPS (it is a quarter of the naively-filed size — see DA-010).
3. The splat's RADIUS CURVE is UNCHANGED — DA-011 was refuted. Touching it is a regression against the audit.
4. The score pop-ups and shattered-spike sparkle match the ROM.
5. npm test -- citations stays green.

### Key Technical Notes
- **Spatial Colour Cycle:** The splat's colours cycle through the palette during the animation, driven by position (spatial), not just time.
- **Duration Rebase:** DA-010 filed a much larger duration; once rebased to ROM_FPS, it becomes ~1/4 of that naive size.
- **Radius Curve Refutation:** DA-011 initially claimed a radius curve defect, but the audit's own correction refutes it — do NOT implement a radius curve 'fix'.
- **Score Pop-ups:** Brief visual feedback when scoring; must match ROM's visual and timing.
- **Shattered-spike Sparkle:** Visual effect when a charge burrows into and breaks a spike.

### Testing Strategy
- Transcribe vertex data from ROM source (citations.test.ts validation required)
- Test splat duration against ROM_FPS-rebased value
- Test colour cycle matches palette advancement
- Verify pop-up timing and visual appearance
- Ensure citation gate stays green (audit integrity)

## Sm Assessment

**Setup decision:** Story tp1-18 selected by Comrade directly. Confirmed ready to start:
- Both dependencies satisfied — **tp1-1** (THE REBASE / ROM_FPS) and **tp1-12** (THE PALETTE / colour cycle) are both DONE and archived. This story consumes their outputs.
- Merge gate clear — no open PRs on tempest.
- Repo `tempest` is gitflow; feature branch `feat/tp1-18-shapes-splat-burst-score-popups` cut from `develop`.

**Routing:** Phased `tdd` workflow → next phase **red**, owned by **tea** (O'Brien). Standard TEA → Dev → Reviewer pipeline follows.

**Critical guardrails carried forward for TEA/Dev (from the audit's own corrections):**
- Splat is the ROM's **26-vertex tricolour outline** with a **spatial** colour cycle (position-driven, not purely time-driven).
- **DA-010 duration is real but ~1/4 of its filed size once rebased through ROM_FPS.** Do not use the naive filed duration.
- **DA-011 radius curve was REFUTED.** Do NOT implement a radius-curve "fix" — doing so is a regression against the audit. Leave the radius curve unchanged.
- Vertex data must be transcribed from ROM source and pass `npm test -- citations`. Watch the tempest citation-gate trap: a comment-only edit in a cited file shifts pinned lines — re-anchor after any edit.

**No upstream findings at setup.**

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** ROM-fidelity behavioural + shape changes (splat + spark); not a chore bypass.

**Test Files:**
- `tests/shell/tp1-18.shapes.test.ts` (NEW) — the ROM SPLAT one-ring 24-lit-vertex ragged tri-colour outline via `splatGlyph(rot)` (V-013/DA-009: spatial white/red/yellow simultaneously + ROTCOL as a consistent global 3-cycle, period 3), and the invader-collision `sparkGlyph()` (DA-007: SPARK1 4 YELLOW axis dots, static). Plus oracle well-formedness, a DA-018 already-remediated source-guard, and purity/boundary/type-safety rule coverage.
- `tests/shell/tp1-18.fx-splat.test.ts` (NEW) — DA-010 splat life = 20/ROM_FPS (≈0.703, off the old 0.9); DA-011 radius-curve REGRESSION GUARD (small→peak→small, do NOT invert — wont_fix); DA-007 cause routing (grab → NOT the splat; bolt/pulse → the splat).
- `tests/shell/fx.explosions.test.ts` (RE-SEATED) — removed the defect-asserting single-colour-per-frame test; drove the splat via the `player-death` cause event; dropped shape/`.spokes` specifics now owned above.

**Tests Written:** 26 (18 in shapes, 8 in fx-splat) covering ACs 1-4 + DA-007; plus re-seated 9 in fx.explosions.
**Status:** RED (13 failing for the right reasons: 10 = `splatGlyph`/`sparkGlyph` unbuilt; 1 = life still 0.9; 2 = grab still spawns the splat). Keep-behaviour guards GREEN (radius curve, 20-frame oracle, DA-018 guard, bolt/pulse → splat, re-seated fx.explosions all-green).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Hard Architectural Boundary — glyphs.ts is SHELL-only | `glyphs.ts stays SHELL-only` | passing (guard) |
| Determinism/purity — no Math.random/Date/perf time | `glyph geometry is pure` / `deterministic across repeated calls` | passing (guard) |
| TS lang-review #1 — no `as any` / `@ts-ignore` | `uses no as any / @ts-ignore` | passing (guard) |
| TS lang-review #2 — readonly const data | `the new splat/spark vertex tables are readonly` | passing (guard) |
| TS lang-review #8 — meaningful assertions / no vacuous tests | self-check (below) | passing |

**Rules checked:** 4 of the applicable TS lang-review rules have coverage; the boundary+purity rules are the load-bearing ones for glyphs.ts (a pure shell value producer).
**Self-check:** 0 vacuous tests. The DA-011 radius guard and 20-frame oracle pass on current code intentionally (keep-behaviour); each fails if the behaviour it guards is broken (verified: inverting the arc or changing the frame sum breaks them).

### Key implementation pointers for Dev (Julia)
- The splat is drawn PROCEDURALLY today (`render.ts` `drawPlayerSplat` → `jaggedStarPath`, two concentric radius bands). Replace with a real transcription: add `splatGlyph(rot)` + `sparkGlyph()` to `glyphs.ts` (the FUSE per-group-colour model fits — the splat is ~12 two-vertex coloured runs tracing one closed ring), and draw them from `render.ts`. `PlayerSplat`'s single `color`/`cycle` becomes a ROTCOL `rot` phase advanced over frames.
- SPLAT source: ALVROM.MAC:806-850 (`.RADIX 16`; SCVEC args ABSOLUTE; b=CB lit, b=0 beam-off). 26 SCVEC entries, 24 lit. SPARK1: ALVROM.MAC:672-684. Colours PDIWHI=9/PDIYEL=10/PDIRED=11 (ALCOMN.MAC:384-386). Duration TSPTIM 2,2,2,2,2,4,3,2,1 = 20 (ALDISP.MAC:1022-1030; the next `.BYTE 20` is the pulsar tail, NOT the splat).
- DA-007: `fx.detect` must read `player-death` cause (grab → spark, bolt/pulse → splat, spike already → cyan). Infra exists (events.ts:94-95; emitted sim.ts:418/597/872).
- **DA-011 is wont_fix — do NOT touch the radius curve.** **Citation gate:** after editing fx.ts/render.ts/glyphs.ts run `node tools/audit/reanchor-citations.mjs --write` and set `remediated_by: tp1-18` on V-013/DA-009/DA-010/DA-007 (NOT DA-011). See Delivery Findings.

**Handoff:** To Dev (Julia) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/glyphs.ts` — added `splatGlyph(rot)` (the ROM SPLAT: one closed ragged ring, 12 CSTAT runs of 2 lit vectors, tri-colour with `rot` rotating the 3 slots; ALVROM.MAC:806-850) and `sparkGlyph()` (SPARK1: 4 static yellow axis dots; ALVROM.MAC:672-684).
- `src/shell/fx.ts` — `SPLAT_LIFE = 20/ROM_FPS` (DA-010); `PlayerSplat` reshaped (`spokes`/`color`/`cycle` → `rot`); new `PlayerSpark` kind; `detect()` routes the death cue by `player-death` cause (grab → spark, bolt/pulse → splat); `update()` advances `rot` and keeps the DA-011 radius line verbatim (wont_fix).
- `src/shell/render.ts` — `drawPlayerSplat` now strokes `splatGlyph(ex.rot)` scaled by radius; new `drawPlayerSpark`; `drawExplosions` is an explicit 3-way dispatch; removed the now-unused `jaggedStarPath`.
- `docs/audit/findings/*.json` — `remediated_by: tp1-18` on V-013, DA-007, DA-009, DA-010, **FR-015** (the SPLAT_LIFE twin); 28 drifted citations re-anchored (0 lost). DA-011 left open (wont_fix).

**Tests:** 1468/1468 passing (full tempest suite, 126 files) — GREEN. Citation gate green. `tsc --noEmit` clean; `vite build` clean.
**Branch:** `feat/tp1-18-shapes-splat-burst-score-popups` (pushed)

**Self-review:**
- ✅ Wired to the front end (render draws both glyphs via the proven `strokeGlyph` path; fx spawns them off the sim's `player-death` cause).
- ✅ Follows project patterns (glyphs are pure shell value producers; the tp1-17 transcription+citation convention).
- ✅ ACs met: splat = ROM 26-vertex (24-lit) tri-colour ring + ROTCOL (AC-1); duration 20/ROM_FPS (AC-2); radius curve untouched (AC-3); the invader-collision cue matches the ROM SPARK1 (AC-4 / DA-007); citations green (AC-6). V-017/score-pop-ups carved to tp1-19 (see Deviations).
- ⚠️ On-screen splat/spark scale+colour not eyeballed (dev-port sibling-checkout hazard) — flagged for Reviewer (Delivery Findings).

**Handoff:** To the Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1468 tests, build, citations 25/25 green; tree clean; no debug markers) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer directly |

**All received:** Yes (preflight returned green; the 8 specialist subagents are disabled via `workflow.reviewer_subagents` and their domains were reviewed directly)
**Total findings:** 2 confirmed (both LOW/non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Only `reviewer-preflight` is enabled in this project; I reviewed the eight specialist domains myself (tagged below). The diff is `src/shell/{glyphs,fx,render}.ts` + two new test files + one re-seated test + citation-ledger line-reanchors/remediations. No user input, no async, no auth surface, no React — most of the TS lang-review checklist is N/A; the live sections are #1 (type-safety), #2 (readonly), #8 (test quality), and the tempest Hard Architectural Boundary + citation-gate rules.

**Observations:**
- [VERIFIED] [RULE] Architectural boundary + purity hold — `glyphs.ts` imports nothing from `core/` (only local helpers); the new `splatGlyph`/`sparkGlyph` are pure (no Math.random/Date/perf), guarded by tp1-18.shapes.test.ts. `fx.ts` adds `import { ROM_FPS } from '../core/rules'` — that is shell→core (allowed; the ban is core→shell), and ROM_FPS is a pure const. Evidence: glyphs.ts I2 block; fx.ts:4.
- [VERIFIED] [TYPE] No type-safety escapes — no `as any`, `@ts-ignore`, `as unknown as`, or non-null assertions. The `player-death` extraction uses a type predicate WITH runtime validation (`(e): e is Extract<GameEvent,{type:'player-death'}> => e.type === 'player-death'`, fx.ts:181), satisfying lang-review #1/#6. `readonly` is used on every new table (SPLAT_RUNS/SPLAT_SLOTS/SPARK1_DOTS), satisfying #2.
- [VERIFIED] [SIMPLE] Dead code removed — the procedural `jaggedStarPath` is gone (its only callers were the replaced `drawPlayerSplat`); `drawExplosions` is an exhaustive 3-way `if/else-if` over the `Explosion` union (no `never`-guard exists on that union, so none needed). Evidence: render.ts drawExplosions.
- [VERIFIED] [EDGE] `(slot + rot) % 3` is safe for the unbounded per-frame `rot` counter (non-negative integer); a bare alive-diff death with no `player-death` event defaults to the splat (`death?.cause === 'grab'` → false), preserving prior behaviour; a spike death still gets its pre-existing cyan override on top of the splat (unchanged). Evidence: glyphs.ts splatGlyph; fx.ts:181-188.
- [VERIFIED] [SILENT] No swallowed errors / silent fallbacks that hide a bug — the only fallback (no-event → splat) is intentional and documented; nothing is caught-and-dropped.
- [VERIFIED] [TEST] The `fx.explosions.test.ts` re-seat is a genuine intent-preserving re-seat, NOT a loosen-to-pass: the deleted test asserted the exact DA-009 defect (single colour per frame); the survivors (spawn-at-location, grow/shrink, red flash, two-kinds-distinct) still assert real behaviour, now driven by the realistic `player-death` cause event. The new suites pin invariant signatures (radius-cover, colour SET, ROTCOL 3-cycle, 20/ROM_FPS life) — no vacuous assertions.
- [VERIFIED] [SEC] No security surface — pure client-side vector rendering, no user input, no injection, no secrets, no network. N/A by construction.
- [VERIFIED] Citation-ledger integrity — the `docs/audit/findings/*.json` diff is ONLY `"line"` reanchors (56) + 5 `remediated_by: tp1-18` stamps; the 10 `"verdict"` lines are a trailing-comma reflow (value unchanged: `CONFIRMED`=`CONFIRMED`, 5↔5), no `verbatim`/`source`/`claim`/`reasoning` touched. `remediated_by` correctly covers the removed/changed divergences (V-013/DA-007/DA-009/DA-010/FR-015) and correctly EXCLUDES DA-011 (wont_fix — its radius line survives verbatim at fx.ts:265, reanchored not remediated). `reanchor` reports 0 lost. The FR-015 twin (same `SPLAT_LIFE=0.9` line, pair-11) was caught — the exact multi-finding trap.
- [LOW] [DOC] Stale comment at `render.ts:529-531` — the Story-10-5 header still describes the splat as "a concentric jagged star that grows/shrinks while its colour cycles," contradicting the new one-ring spatial-tri-colour + ROTCOL implementation. Non-blocking; filed as a Delivery Finding for the next touch.
- [LOW] [TYPE] `SPLAT_RUNS`' slot field is typed `number` rather than `0 | 1 | 2` — safe under `% 3`, but a narrower literal type would document the "three PDI slots" invariant. Nit; non-blocking.

### Rule Compliance
- **Hard Architectural Boundary (CLAUDE.md):** glyphs.ts (shell) — no core import ✓. fx.ts (shell) → core/rules ROM_FPS ✓ (shell→core allowed). render.ts (shell) ✓. No core file touched. COMPLIANT.
- **Determinism/purity (glyphs.ts is a pure value producer):** splatGlyph/sparkGlyph pure, deterministic; rot is an explicit arg, not ambient time. COMPLIANT (guarded by tests).
- **Citation gate (CLAUDE.md — remediated_by + reanchor):** both rules applied; 0 lost; DA-011 wont_fix left un-remediated. COMPLIANT.
- **TS lang-review #1 (type-safety escapes):** none. COMPLIANT. **#2 (readonly on immutable tables):** present. COMPLIANT. **#3 (enum/exhaustiveness):** Explosion union dispatched exhaustively; no enum added. COMPLIANT. **#4 (`??` vs `||` on falsy):** `death?.cause === 'grab'` — no falsy-coalescing hazard. COMPLIANT. **#8 (test quality):** no `as any` in tests, no vacuous assertions. COMPLIANT. #5-7,#9-13 (modules/React/async/perf/security): N/A to this diff.

### Devil's Advocate
Assume this is broken. First attack: the ROTCOL rotation. `ex.rot` increments every `update()` frame forever, and `splatGlyph` does `(slot + rot) % 3`. If `rot` were ever fed to an array index without the modulo, or if `rot` could go non-integer, colours would break — but it is a pure integer counter and the modulo is right at the index, so a hostile large `rot` (e.g. 10^6 after a stuck effect) still maps into `[0,2]`. The splat's `life` caps at ~0.7 s (20 frames), so `rot` never grows large anyway. Second attack: the cause router picks `events.find(...player-death)` — what if a frame carries TWO player-death events with different causes (grab + bolt)? `find` takes the first; but the sim only flips `alive` once and emits one death event per death path, so this is unreachable in practice, and even if reached the first-wins choice is deterministic, not a crash. Third: a death with NO event (some future caller flips `alive` directly) silently shows the splat instead of a spark — is that a hidden regression? No: it reproduces the pre-tp1-18 behaviour exactly (splat for every death), and the realistic path (sim always emits the event) is exercised by the tests. Fourth: could the spark be invisible? `sparkGlyph` returns 4 single-point strokes; `strokeGlyph` draws single-point strokes as filled arcs (dots) — verified that path exists (render.ts:115-117), and `SPARK_RADIUS=14` scales the unit cross to 14px, visible. Fifth: did removing `PlayerSplat.spokes`/`color`/`cycle` break a consumer? Grep proved only `fx.explosions.test.ts` (re-seated) and `render.ts` (rewritten) read them, and `tsc --noEmit` is clean under `noUnusedLocals`. Sixth, the sneakiest: could the citation remediation be hiding a live divergence (the tp1-25 "green on a lie" trap)? DA-011 is the risk — but its radius line is UNCHANGED and left un-remediated, so the gate still re-opens it; and the five remediated findings each had their divergence genuinely removed (verified line-by-line). The one real defect the devil finds is cosmetic: the stale render.ts comment — already filed. Nothing rises to Medium.

**Data flow traced:** sim emits `player-death{cause}` (sim.ts:418/597/872) → `fx.detect` reads the cause → spawns `PlayerSplat` (bolt/pulse) or `PlayerSpark` (grab) → `render.drawExplosions` dispatches to `strokeGlyph(splatGlyph(rot)|sparkGlyph())`. Safe: the cause is a closed union, the render path is exhaustive.
**Pattern observed:** ROM shapes transcribed as pure `glyphs.ts` value producers with cited hex vertices + citation-gate byte-check — the established tp1-17 pattern, followed correctly (`src/shell/glyphs.ts` I2 block).
**Error handling:** no throw paths; the no-event fallback is explicit and documented (fx.ts:181-188).
**Handoff:** To Winston Smith (SM) for finish-story.