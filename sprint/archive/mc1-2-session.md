---
story_id: "mc1-2"
jira_key: "mc1-2"
epic: "mc1"
workflow: "tdd"
---
# Story mc1-2: Draw the fixed field: 6 cities + 3 missile bases at cited coords

## Story Details
- **ID:** mc1-2
- **Jira Key:** mc1-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-06T00:37:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T00:15:59Z | 2026-08-06T00:18:46Z | 2m 47s |
| red | 2026-08-06T00:18:46Z | 2026-08-06T00:28:01Z | 9m 15s |
| green | 2026-08-06T00:28:01Z | 2026-08-06T00:32:03Z | 4m 2s |
| review | 2026-08-06T00:32:03Z | 2026-08-06T00:37:53Z | 5m 50s |
| finish | 2026-08-06T00:37:53Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

**Story:** mc1-2 (3pt, tdd) — draw the fixed field: 6 cities + 3 missile bases at cited coords. The eighth cabinet's second story, following mc1-1's scaffold.

**Board check (clean start).** No `mc1` branch existed on any remote and the only live sibling session was `bz5-4` in a-2 (battlezone, unrelated) — no contention. `origin/main` had moved (`e5d7838..6651f5d`, jt9-18 archive); fast-forwarded before setup.

**Premise verified against the tree (not solved — measured).** The story's citation chain is sound against `plugins/missile-command/reference/source/W3COMN.MAC`:
- `NCITY=6` at `:39`, `NMISBA=3` at `:41`.
- City coords at `:123-145` (HEX, `.RADIX 16` at :1). Confirmed samples: `CITY1H=5F`/`CITY1V=10` (:123-125), `CITY2H=0B4` (:127), `CITY6H=0D0` (:143).
- The brief's constant table lists NCITY/NMISBA but shows the CITY-coords row as a label RANGE (`—`); the actual per-city numbers live in W3COMN.MAC, not the brief. Citation chain intact — recorded in context so TEA reads the numbers from source.

**Hazard flagged to the pipeline.** `W3COMN.MAC` registers as binary (`file` → "data") from a stray byte, so a plain `grep "CITY"` returns a false-empty. Context tells TEA/Dev to use `grep -a`. A zero-hit grep here is a claim about the missing flag, not the file.

**No user ruling needed.** Clean 3pt TDD story, no either/or AC, no stale premise, no PARKED banner.

**ACs copied verbatim** from `sprint/epic-mc1.yaml` (two: field.ts pure-data positions with citations; render.ts paints them, purity stays green). Not edited.

**Claim pushed.** Stamped `in_progress` (sm-setup left it `backlog` as always). Claim commit on `main` (`0cd8cfc`) + empty `feat/mc1-2-draw-fixed-field` branch so a sibling probe lights up. Added the missing `**Repos:** arcade` field to this session.

**Handoff → TEA (Han Solo) for RED.**
## Tea Assessment

**RED verified.** `npx vitest run --project missile-command` → 39 tests, 26 pass, 13 fail. All 13 failures are FEATURE-ABSENCE (loader's self-describing "field core module not built yet" + render marks/wiring assertions) — no harness/collection error. `npm run lint` (tsc --noEmit) green: the not-yet-built core import uses the fleet `/* @vite-ignore */` variable-specifier idiom so the release gate stays green through RED.

**Tests written (2 files):**
- `tests/field.test.ts` — AC1. Pins the core contract Dev implements: `NCITY=6` (W3COMN:39), `NMISBA=3` (:41), `CITIES` (six FieldPos in source order, :123-145), `BASES` (three, :147-157). Exact decimal coords asserted via `toEqual`. Plus a **citation scan** (raw source text — a citation in a comment counts) requiring field.ts to name W3COMN and every CITY1H..6H / MISB1H..3H symbol.
- `tests/render-field.test.ts` — AC2. A transform-agnostic recording-ctx test: `drawFrame` must emit ≥9 marks in the bottom half across ≥9 distinct H columns (all nine source H values are distinct), plus a wiring scan that render.ts imports `core/field` and references `CITIES`/`BASES`. Exact glyph/sub-pixel placement is left to the `/missile-command/` screenshot (AC2's stated artifact) — pixels are the reviewer's job.

**The anti-drift anchor (GREEN from day one).** `field.test.ts` → "source ground truth" reads `reference/source/W3COMN.MAC` directly and proves the expected decimals really decode from the hex the ROM ships (CITY1H=5F→95, CITY2H=B4→180, … MISB3H=F0→240; NCITY=6, NMISBA=3). This ties the test's numbers to the source, so a later "fix" cannot silently drift the layout — the test, not a human, objects. It is data, so it passes now.

**Ground truth (all hex, `.RADIX 16` at W3COMN.MAC:1; decimal in parens):**
Cities C1 5F,10 (95,16) · C2 B4,15 (180,21) · C3 94,12 (148,18) · C4 2C,12 (44,18) · C5 47,11 (71,17) · C6 D0,11 (208,17). Bases B1 14,16 (20,22) · B2 7B,16 (123,22) · B3 F0,16 (240,22). Axis: V grows UPWARD from the bottom (TOPSCR=222. at top, :107) — cities/bases at V 16-22 sit in the bottom band.

**Source-file hazard (carried from SM).** `W3COMN.MAC` has a stray non-text byte → `file` reports "data" and a bare `grep CITY` is a FALSE-EMPTY. `readFileSync(..,'utf8')` reads it fine; by hand use `grep -a`.

### Rule Coverage
Project rules driving test design (arcade / TypeScript):
- **Core/shell purity** (the one load-bearing rule): field.ts lands in `src/core/`, so the existing `tests/purity.test.ts` src/core sweep auto-scans it the moment it exists — no duplication needed. AC2's "core stays pure" is covered there. render.ts (shell) is free to touch the canvas.
- **No magic number faithful to nothing** (epic rule under skeleton-first): every coordinate has a source citation — enforced by the citation scan AND anchored to the real source by the ground-truth test. The mc2 citation gate / claims/*.json are DEFERRED (epic decision), so the enforceable form is the raw-text scan + ground-truth anchor, not a claims file.
- **RADIX discipline**: the ground-truth test decodes hex correctly (parseInt base 16), guarding against a decimal/hex mix-up (the epic's named trap).
- **Meaningful assertions (test-quality rule)**: every test asserts a concrete value (toBe/toEqual/toHaveLength/≥9); no `let _ =`, no `assert(true)`, no always-None checks.

**Handoff → Dev (Yoda) for GREEN.** Build `src/core/field.ts` (pure data: NCITY, NMISBA, CITIES, BASES with per-coordinate W3COMN citations) and wire `render.ts` to paint the nine structures in the bottom band. The `/missile-command/` screenshot is AC2's acceptance artifact for the reviewer.
## Dev Assessment

**GREEN.** `npx vitest run --project missile-command` → 40/40 pass; `npm run lint` (tsc --noEmit) → exit 0. Re-verified on the rebased tree after a sibling landed `80c35d9` (clean rebase, no conflict).

**What I built (minimal, two files):**
- `src/core/field.ts` — PURE data. `NCITY=6` (W3COMN:39), `NMISBA=3` (:41), and `CITIES`/`BASES` as `readonly FieldPos[]` in source order, each coordinate a hex literal (`0x5f`…) with its source symbol cited in a trailing comment (`CITY1H/CITY1V :123/:125` …). No clock, entropy, browser surface, or shell import — the src/core purity sweep scans it and stays green.
- `src/shell/render.ts` — imports `CITIES`/`BASES` from core and paints each structure: cities as blocks (`fillRect`), bases as upward launch triangles (`moveTo`/`lineTo`). A `project()` helper scales H/V into the passed canvas and FLIPS V (`y = height - v/LOGICAL_HEIGHT*height`) so the bottom-origin cabinet coords land in the canvas bottom band.

**Settled mc1-1's deferred geometry, WITH citations** (mc1-1 deleted uncited 256/231): `LOGICAL_WIDTH = 0x100` (H is 8-bit; structures span MISB1H=0x14..MISB3H=0xF0, all ≤0xFF) and `LOGICAL_HEIGHT = 222` (TOPSCR=222., W3COMN.MAC:107). No magic number faithful to nothing.

**main.ts unchanged** — it already calls `drawFrame(ctx, game, canvas.width, canvas.height)` each frame, so the field renders live at `/missile-command/` with no shell rewiring.

**Two RED→GREEN follow-ups from TEA's citation scan:** field.ts initially cited the combined `CITYnH/V` shorthand; the scan requires the literal vertical symbols (`CITY1V`, `MISB1V`), so I spelled each as `CITYnH/CITYnV`. Pure comment change, no data moved.

**Note for the Reviewer — AC2's screenshot.** The behavioural test proves ≥9 marks across ≥9 distinct columns in the bottom band, but AC2's stated acceptance artifact is a live screenshot at `http://127.0.0.1:5270/missile-command/` showing the six cities + three bases along the bottom. I did not capture it (5270 coexistence hazards per CLAUDE.md); it's the reviewer/owner's verification. The glyph shapes (blocky cities / triangle bases) are a skeleton stand-in, not cited silhouettes — faithful shapes are a later gameplay-epic concern.

**Handoff → Reviewer (Obi-Wan Kenobi).**
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (40/40 tests, lint 0, orchestrator 398/398, 0 smells) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (every citation cross-checked vs W3COMN.MAC with grep -a) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (surface nil: pure data + Canvas 2D, no I/O) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 20 rules / 47 instances | N/A (2 rule-25 "tighten-if-grows" notes on whole-file scans — dismissed, see below) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 0 confirmed, 1 dismissed (rule-25 whole-file-scope note), 0 deferred

### Rule Compliance (lang-review/typescript.md + arcade conventions)
Enumerated every applicable rule against all four changed files:
- **Core/shell purity** (the load-bearing rule): `src/core/field.ts` is pure data — no clock, entropy, browser global, scheduling, or shell import (only a local `FieldPos` type). The existing `tests/purity.test.ts` src/core sweep now scans it and is green. `render.ts` is shell and correctly imports core + touches canvas (allowed direction). **COMPLIANT.**
- **No magic number faithful to nothing**: every coordinate in field.ts carries its `CITYnH/CITYnV` / `MISBnH/MISBnV` symbol + line; render.ts's `LOGICAL_WIDTH=0x100` and `LOGICAL_HEIGHT=222` are both cited (8-bit H extent; TOPSCR=222. W3COMN.MAC:107). mc1-1's deleted uncited 256/231 are reintroduced WITH citations — exactly the deferral this story was chartered to close. **COMPLIANT.**
- **RADIX discipline**: hex literals `0x5f`… decode to the decimal figures asserted; `TOPSCR=222.` (trailing period) correctly treated as decimal. Independently reconfirmed. **COMPLIANT.**
- **ESM `.js` extension** (TS rule 5): `from '../core/game.js'`, `from '../core/field.js'`, `from '../src/shell/render.js'` — all present. `type FieldPos` inline-marked; `GameState` uses `import type`. **COMPLIANT.**
- **`readonly` on exported data** (TS rule 2): `FieldPos.{h,v}` and `CITIES`/`BASES: readonly FieldPos[]`. **COMPLIANT.**
- **Type-safety escapes** (TS rule 1): the sole `as unknown as CanvasRenderingContext2D` is the recording-mock in render-field.test.ts — the legitimate test-mock idiom for an unconstructable DOM interface in a non-jsdom env (rule-checker concurs). No production double-cast, no `as any`, no `@ts-ignore`. **COMPLIANT.**

### Observations (≥5)
- [VERIFIED] All nine coordinates match the ROM — evidence: `grep -a` of `reference/source/W3COMN.MAC` gives CITY1H=5F…CITY6H=0D0 (:123-145), MISB1H=14…MISB3H=0F0 (:147-157), NCITY=6 (:39), NMISBA=3 (:41); field.ts hex literals decode identically. Complies with the citation rule.
- [VERIFIED] The V-flip lands the field in the bottom band — evidence: `render.ts:97-99` `y = height - (v/LOGICAL_HEIGHT)*height`; for v∈{0x10..0x16} at H=231 → y≈208-214 (> H/2). Faithful to AC2 "along the bottom band."
- [VERIFIED] `project()` has no divide-by-zero — evidence: `render.ts:96-100` divides only by the non-zero module constants `LOGICAL_WIDTH`/`LOGICAL_HEIGHT`; caller `width`/`height` are multiplied. A 0-size canvas yields 0 output (harmless), not NaN.
- [VERIFIED] The RED tests are non-vacuous and independently anchored — evidence: `field.test.ts` "source ground truth" describe re-derives the expected decimals from W3COMN.MAC via hex decode, so a shared typo between `EXPECT_*` and field.ts is caught by that third code path (rule-checker #18 concurs).
- [VERIFIED] render wiring can't be faked by a ground line — evidence: `render-field.test.ts` asserts ≥9 marks across ≥9 DISTINCT bottom-band columns (all 9 source H values are distinct) plus a source scan requiring `CITIES`/`BASES` references.
- [LOW→dismissed] [RULE] rule-25: `field.test.ts`/`render-field.test.ts` source scans use whole-file scope for `/W3COMN/`, `/CITIES/` etc. Dismissed: field.ts is 47 lines and render.ts 63 with exactly one legitimate occurrence each and no decoy location — the rule-checker itself rated it a non-violation "worth tightening only if the file grows." Not blocking; noted for the mc2 citation-gate work that will supersede these raw scans anyway.
- [OBSERVATION] Glyph shapes (blocky cities / triangle bases) are a skeleton stand-in, not cited silhouettes — consistent with the epic's skeleton-first charter; faithful shapes belong to a later gameplay epic. AC2's acceptance is the bottom-band screenshot, not silhouette fidelity.

### Devil's Advocate
Let me argue this is broken. First, the geometry: `LOGICAL_WIDTH=0x100` (256) but the rightmost structure MISB3H=0xF0=240 leaves only 16 columns of right margin, and if a later story adds a structure at H>0xFF it would silently clip — but no such structure exists in the cited set, and H is definitionally 8-bit, so 256 is the correct extent, not an accident. Second, the V axis: I claimed cities sit in the bottom band, but what if the cabinet's origin is actually top-left and my flip is inverted? I checked TOPSCR=222. is labelled "TOP OF SCREEN VERTICAL COORD" (:107) and cities are at V=16-22 — far from the top value — so V grows upward from the bottom and the flip `height - v/222*height` is correct; an un-flipped render would put cities at the TOP, contradicting AC2, and the mock-ctx test's `y > H/2` assertion would catch exactly that inversion. Third, a confused user resizing the window: `main.ts` sets `canvas.width = clientWidth` each frame, so `project` rescales every frame — no stale geometry, and at clientWidth=0 (pre-layout) marks collapse to x=0 harmlessly for one frame. Fourth, the tests: could they pass on wrong code? The coordinate `toEqual` is exact; the citation scan needs literal symbols; the render test needs 9 distinct columns — a Dev who hardcoded 9 identical coords would fail the distinct-columns assertion, and one who drew a decorative ground line without the field would fail the `CITIES`/`BASES` source scan. Fifth, purity erosion: could field.ts drift impure later? The src/core sweep scans it forever. Sixth, the mock ctx: does casting through `unknown` hide a real signature bug? The mocked methods use the real positional-arg shapes (`fillRect(x,y,w,h)`, `moveTo(x,y)`), so a drawFrame calling them wrongly would still be observed. I can find no correctness defect — only the pre-noted cosmetic glyph choice and the small-file source-scan scope, neither blocking.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** cited hex constants in `core/field.ts` → `render.ts project()` (V-flipped, scaled into the live canvas) → nine Canvas 2D marks in the bottom band → `main.ts` repaints each frame at `clientWidth×clientHeight`. Safe: all inputs are compile-time constants; no external/untrusted data reaches the canvas API.
**Pattern observed:** faithful-clone citation discipline — every game constant cites the vendored ROM, with a source-ground-truth test anchoring the decimals against W3COMN.MAC so they cannot silently drift (`plugins/missile-command/tests/field.test.ts` "source ground truth").
**Error handling:** no failure paths introduced; `project()` cannot divide by zero (`render.ts:96-100`); the RED loader throws a self-describing message, not a bare stack trace.
**Rule compliance:** all applicable purity / citation / RADIX / ESM-extension / readonly / type-safety rules COMPLIANT (see Rule Compliance). Zero Critical/High/Medium across four clean subagents + independent review.
**Subagent findings incorporated (all enabled specialists returned clean):**
- [DOC] comment-analyzer — clean: every source citation in field.ts/render.ts/tests cross-checked against `W3COMN.MAC` with `grep -a`; no stale mc1-1 prose. Nothing to confirm.
- [RULE] rule-checker — 20 rules / 47 instances, 0 violations; the one `as unknown as CanvasRenderingContext2D` is the legitimate test-mock exception. Its two rule-25 whole-file-scope notes are dismissed (47/63-line files, no decoy match) — non-blocking.
- [SEC] security — clean: surface is nil (pure data + Canvas 2D, no I/O, no untrusted input, bounded loops over fixed 6/3 arrays). Nothing to confirm.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

<!-- Delivery findings below this marker. Append-only. -->
### Reviewer (code review)
- No upstream findings.

### Reviewer (audit)
- No logged Design Deviations to stamp. Independent audit found no UNDOCUMENTED spec deviation: the geometry constants mc1-1 deferred (O-5) were settled WITH citations exactly as this story was chartered to do, and the skeleton glyph shapes are within the epic's skeleton-first scope (AC2 requires bottom-band placement, not cited silhouettes). Nothing slips through undocumented.
## Impact Summary

**Delivery Findings (single approved review round)** — 0 confirmed, 1 dismissed, 0 deferred; **blocking count: 0**.

Specialist results (4 enabled, all clean):
- reviewer-preflight: 0 findings (40/40 tests, lint 0, orchestrator 398/398, 0 smells)
- reviewer-comment-analyzer: 0 findings (all nine W3COMN.MAC citations verified with `grep -a`)
- reviewer-security: 0 findings (surface nil: pure data + Canvas 2D, no I/O, no untrusted input)
- reviewer-rule-checker: 0 violations / 20 rules / 47 instances; one rule-25 whole-file-scope note dismissed (47/63-line files, no decoy)

Key verification: cited hex constants (field.ts) → project() V-flip+scale → nine Canvas 2D marks in the bottom band → live repaint each frame; all nine coords anchored against the vendored ROM by a ground-truth test; core stays pure; core/shell, citation, RADIX, ESM-extension, readonly, type-safety rules all COMPLIANT; no Critical/High/Medium. Geometry constants mc1-1 deferred (O-5) settled WITH citations as chartered; skeleton glyph shapes within epic scope. No logged Design Deviations; audit found none undocumented.
