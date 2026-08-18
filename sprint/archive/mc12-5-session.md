---
story_id: "mc12-5"
jira_key: "mc12-5"
epic: "mc12"
workflow: "tdd"
---
# Story mc12-5: Retire the last magic width/200 divisor in render.ts

## Story Details
- **ID:** mc12-5
- **Jira Key:** mc12-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc12-5-retire-width200-ready-missile-marker
- **PR:** https://github.com/slabgorb/arcade/pull/536 (merged into develop, 2d394cfb)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T11:03:17Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T09:14:35Z | 2026-08-18T09:15:59Z | 1m 24s |
| red | 2026-08-18T09:15:59Z | 2026-08-18T09:52:34Z | 36m 35s |
| green | 2026-08-18T09:52:34Z | 2026-08-18T10:28:23Z | 35m 49s |
| review | 2026-08-18T10:28:23Z | 2026-08-18T10:41:42Z | 13m 19s |
| green | 2026-08-18T10:41:42Z | 2026-08-18T10:43:36Z | 1m 54s |
| review | 2026-08-18T10:43:36Z | 2026-08-18T10:51:09Z | 7m 33s |
| green | 2026-08-18T10:51:09Z | 2026-08-18T10:55:50Z | 4m 41s |
| review | 2026-08-18T10:55:50Z | 2026-08-18T11:03:17Z | 7m 27s |
| finish | 2026-08-18T11:03:17Z | - | - |

## Sm Assessment

Story mc12-5 is a 2-pt tdd refactor filed by the mc12-4 review (rule-checker #24/#33). It
is the last instance of the non-physical `width/200` divisor in missile-command's
`render.ts` — the ready-missile stack **base marker** (the dot at `render.ts:142`), the
sibling of the tip marker mc12-4 already retired. The divisor looks correct at the 256px
unit-test canvas but renders an oversized ~10px square at 955px display: the same
green-vitest / wrong-pixels blind spot recorded in memory
[[render-tests-at-256-hide-display-scaled-sizing-bugs]].

**Approach (for TEA/Dev, not prescriptive):** replace `/200` by tying the marker to the
cabinet-pixel unit `uH` at the DRAW MISSILE marker size, after confirming ROM ground truth
for the marker dimensions (`W3DSUP.MAC:1221`; offsets `:1329-1331`). Mirror mc12-4's fix
and its display-resolution size guard — the RED test must assert at a **display** width
(e.g. 955px), not only the 256px mock, or it reproduces the blind spot instead of catching
it. No invented magic constants (rule-checker #33).

**Precedent:** mc12-4 (the tip-marker fix) is the committed template for both the code
change and the guard shape. Pre-existing, not a regression; out of mc12-4's four-finding
scope.

**Ready for TEA (RED).** ACs to be defined by TEA against ROM ground truth.

## Tea Assessment

**RED delivered.** Added `describe('mc12-5 — the ready-missile stack marker is
cabinet-pixel scaled at display resolution …')` to
`plugins/missile-command/tests/render-battle.test.ts` (commit 866a6af7), directly
below and mirroring the mc12-4 tip guard.

**The behaviour under test.** A live base draws its 1-2-3-4 ready-missile stack as one
small square per ready missile — `render.ts:142` `dot = Math.max(1, Math.round(width /
200))`, painted `fillRect(cx - dot, cy - dot, dot*2, dot*2)`. `round(width/200)` is the
same non-physical divisor mc12-4 removed from the shared tip: `round(256/200)=1` → a
legit 2px square at the 256px unit canvas (so every prior vitest passed), but
`round(955/200)=5` → a **10px square** at the owner's ~955px display, 20px at 2048. A
256-only test is structurally blind — 256 is the one width where `round(w/200)` and a
cabinet-pixel size coincide.

**Test design (mirrors mc12-4).** Renders at four DISPLAY widths `[512, 955, 1024,
2048]` (not 256) through the recording-canvas harness and, for the right-edge base
(h=0xf0, isolated from the centred HUD glyphs that sit on the middle base and the
top-left AWAY cursor near the left base):
- **Presence (non-vacuity control):** a live base draws ≥1 stack marker; a dead base
  draws none — so the size bound can never be satisfied by an empty set.
- **Size:** every marker's width ≤ `2*cabPx + 1` (cabPx = width/256 = uH). This rejects
  the shipped `2*round(w/200)` square (≥ 2.5×cabPx at every tested width: 6/10/10/20px)
  yet is rounding-safe for a uH-tied marker.

**Mutation-verified (not a paper claim).** Temporarily set `dot = round(uH/2)` → 8/8
green; `dot = round(uH)` → 8/8 green; reverted to the shipped `round(width/200)` → 4/4
size tests red again (render.ts diff vs HEAD is empty). The bound accepts the ~1–2×uH
range without over-fitting a single multiplier, so Dev's exact ROM-derived size is free
within that band.

**Full-project run:** `npx vitest run --project missile-command` → 4 failed (only the
mc12-5 size assertions) / 1448 passed. No citation, source-scan, or test-count
durability guard tripped. `npm run lint` clean.

### Rule Coverage (lang-review/typescript.md)
- **#8 Test quality:** no `as any`; imports from `src/` (`../src/shell/render.js`,
  `../src/core/field.js`), never `dist/`; presence controls prevent vacuous size checks.
- **#15 Source-text token match — AVOIDED BY DESIGN:** the guard is *behavioural*
  (measures painted `fillRect` widths), not a grep for `uH`/absence-of-`/200` — which
  would pass on the token appearing in the render.ts comment block. Every assertion is
  mutation-tested (delete/mutate the mechanism → red), and the bound is pinned tight to
  the measured bug value, not "far looser" (#15's loose-bound trap).
- **HUD-figure rule / cabinet-fidelity:** the marker size is derived from the cabinet
  pixel `uH`, no invented magic constant (rule-checker #24/#33, the filing finding).

**For Dev (GREEN):** replace `round(width/200)` at `render.ts:142` with a `uH`-tied size
(uH is already in scope at render.ts:109). Confirm the intended DRAW MISSILE marker size
against ROM ground truth — note the ONEMIS glyph is a "3 DOT HIGH MISSILE"
(W3DSUP.MAC:1245-1325), but the render draws each ready missile as a single stylized
square (as the tip is a single dot), so the mc12-4 sibling treatment (~1 cabinet pixel)
is the natural mirror. Add nothing beyond the marker resize; the test guards the size,
not a specific formula.

## Dev Assessment

**GREEN delivered** (commit d5f180d5). One-line change at `render.ts:142`:
`dot = Math.max(1, Math.round(width / 200))` → `Math.max(1, Math.round(uH / 2))`, plus a
rationale comment mirroring the mc12-4 tip block.

**Why this size.** `dot` is the square marker's half-side (`fillRect(cx-dot, cy-dot,
dot*2, dot*2)`), the direct analogue of mc12-4's `tipR` arc radius. mc12-4 pinned the tip
to `round(uH/2)` so the tip is ~one cabinet pixel across; the ready-missile marker is its
sibling (the same review filed both), so `round(uH/2)` gives a ~one-cabinet-pixel square
at every display scale. `uH = width/LOGICAL_WIDTH` is already in scope (render.ts:109) —
no new constant, no invented magic number (rule-checker #24/#33). At the owner's ~955px
canvas the marker is now a 4px square (was the 10px lollipop); ~1px at the 256px canvas,
unchanged there.

**Scope held.** Resize only — I did NOT re-draw the ROM's multi-pixel "3 DOT HIGH
MISSILE" glyph (TEA's non-blocking Question). The story is *retire the /200 divisor,
mirror mc12-4*; redrawing the full glyph is a different, larger change. No Design
Deviation: the single-square representation predates this story and is untouched.

**Verification:**
- `npx vitest run --project missile-command -t mc12-5` → 8/8 pass (4 size + 4 presence).
- `npx vitest run --project missile-command` → **1452/1452 pass** (no regression).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.

Pixels/hue are the reviewer's screenshot job (per the render-battle.test.ts header); the
node guard pins the display-resolution SIZE, which is what the story is about.

### Dev rework (round-trip 1, commit 4c67b1b2)
All three REJECTED findings were valid; I verified each against the ROM source and fixed
the comments (no logic/test change — still 1452/1452 green, lint clean):
1. **render.ts:146** — replaced the fabricated `OUTPUT DOT`/ONEMIS:1245-1325 citation
   with the verified facts: ONEMIS is at **W3DSUP.MAC:1293** (eight indexed `STA NX,OLDPOS`
   writes); the `OUTPUT DOT` annotation is at **W3DSUP.MAC:969** in the tip routine. Kept
   the DRAW MISSILE:1221 anchor (correct).
2. **render-battle.test.ts:555** — dropped the drifting `render.ts:142` line ref (the GREEN
   comment insertion had moved `dot` to :150); now cites the symbol `dot` with no line #,
   per the project's comment-line-ref drift lesson.
3. **render-battle.test.ts:592/597** — "middle base's column / nearest 25 units" →
   "right base's column / nearest 32 units", matching the probed `BASES[2]` column and the
   block header at :581.
Re-verified: ONEMIS@1293, OUTPUT DOT@969, DRAW MISSILE@1221 all confirmed via the source.

### Dev rework (round-trip 2, commit ba78039b)
Fixed the one remaining sibling the re-review found: render-battle.test.ts:571
"the middle base" → "the right base" (the block measures `BASES[2]`). It wrapped across
571→572, which is why round-trip 1's grep sweep missed it — I read-verified this time:
the only "middle" left in the block is line 582 ("pollutes the middle base"), which is
correct and untouched. Comment-only; tests 1452/1452 green, lint clean.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement (non-blocking):** the story context (`context-story-mc12-5.md`) is the
  generated stub — no ACs recorded. The behaviour was derived from the (very detailed)
  story title + the mc12-4 precedent + ROM (`W3DSUP.MAC` DRAW MISSILE). Fine for a
  2-pt sibling refactor, but the AC is effectively "the guard test".
- **Question (non-blocking, for Dev):** ROM's DRAW MISSILE glyph (ONEMIS,
  W3DSUP.MAC:1245-1325) is a multi-pixel "3 DOT HIGH MISSILE", whereas `render.ts`
  draws each ready missile as ONE square marker. Story scope is *resize the existing
  square to a uH-tied size* (mirror mc12-4), NOT re-draw the full glyph. The size guard
  accepts ~1–2×uH; if Dev's ROM reading argues for a larger authentic marker, log a
  Design Deviation and flag it — the bound would need revisiting.

### Reviewer (code review)
- **Gap** (blocking): fabricated ROM citation — `OUTPUT DOT` attributed to ONEMIS
  W3DSUP.MAC:1245-1325 but the phrase exists only at W3DSUP.MAC:969 (a different routine).
  Affects `plugins/missile-command/src/shell/render.ts` (line 146 comment — drop/re-cite).
  *Found by Reviewer during code review.*
- **Gap** (blocking): self-invalidated line citation — test cites `render.ts:142 dot` but
  this diff shifted the `dot` declaration to line 150.
  Affects `plugins/missile-command/tests/render-battle.test.ts` (line 555 — cite symbol, not line).
  *Found by Reviewer during code review.*
- **Improvement** (blocking): stale helper comment — "middle base's column / nearest 25 units"
  but the code probes the RIGHT base (BASES[2], nearest city 32 units).
  Affects `plugins/missile-command/tests/render-battle.test.ts` (lines 592/597).
  *Found by Reviewer during code review.* → FIXED round-trip 1 (commit 4c67b1b2).
- **Improvement** (blocking, re-review round-trip 1): a sibling of the above survived at
  render-battle.test.ts:571 — "so the middle base draws its full ready-missile stack" (wrapped
  across 571→572, so a single-line grep misses it) — but the block measures the RIGHT base.
  Affects `plugins/missile-command/tests/render-battle.test.ts` (line 571; leave line 582,
  "pollutes the middle base", which is correct). *Found by comment-analyzer re-run + Reviewer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations

### Reviewer (audit)
No `## Design Deviations` were logged by TEA/Dev, and I found none: the implementation
stayed within scope (resize the marker to a uH-tied size, mirror mc12-4) — no undocumented
spec divergence. Nothing to stamp.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1452/1452 tests GREEN, lint clean, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled — assessed test quality myself (behavioural, mutation-tested, non-vacuous) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (r0) + re-run | r0: confirmed 1 (fabricated OUTPUT DOT). Re-run (round-trip 1): 3 originals verified FIXED vs source; found 1 NEW sibling (line 571 "middle base") |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 7 | reviewer-security | Yes | clean | none | N/A — canvas size formula, no security surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (TS-17 fabricated citation; TS-20 self-invalidated line ref) — both verified FIXED on re-review |

**All received:** Yes (4 enabled returned round 0; comment-analyzer re-run on the rework; 5 disabled pre-filled)
**Total findings:** round 0 = 3 confirmed (all verified fixed on re-review); re-review = 1 new sibling of the same class (line 571), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (after 2 comment-only rework round-trips)

**Final state (round-trip 2, Dev commit ba78039b):** the code (`dot = round(uH/2)`, tied to
the cited cabinet unit `uH`, mirroring mc12-4) and the display-resolution guard were sound
from the first GREEN; all citation/comment findings are now resolved and verified against
the ROM source. Suite 1452/1452 green, lint clean, no `/200` divisor survives in `src/`.
Story goal met.

> **Process note (my error, not the code's):** I rejected this 2-pt story twice over
> comment-only nits (a mis-attributed `OUTPUT DOT` citation; "middle base" → "right base").
> That was disproportionate — the right call was to approve with the comment cleanups noted,
> not to loop through Dev twice. Recorded so I don't repeat it.

Full round-by-round history retained below.

---

**Round 0 verdict was REJECTED** — three comment-only citation inaccuracies (one a
*fabricated* ROM citation), all LOW severity. The code and guard were APPROVED as-is even
then; only comment text needed correcting.

### Re-review (round-trip 1, Dev commit 4c67b1b2) — still REJECTED
I verified the rework against the ROM source and the comment-analyzer re-confirmed it:
- **All three round-0 findings are FIXED.** render.ts now cites ONEMIS (W3DSUP.MAC:1293,
  eight `STA NX,OLDPOS` writes) and `OUTPUT DOT` at W3DSUP.MAC:969 — both verified against
  source; the test's `render.ts:142` drift ref is now a symbol ref; test:592/597 now say
  "right base / 32 units". Tests 1452/1452 green, lint clean. Code + guard unchanged, sound.
- **One NEW sibling of the same class survives (blocks approval).** render-battle.test.ts:571
  still reads "so the middle base draws its full ready-missile stack" — the identical
  "middle base" mislabel I flagged at 592/597, two lines above the corrected text, missed by
  the partial fix (and by my own round-0 review — I flagged 592/597 but not 571). It's
  wrapped across the 571→572 line break ("the middle\n base"), so a single-line `grep
  "middle base"` does NOT catch it (the wrapped-comment false-green trap) — it must be read.
  The block measures `BASES[2]` (the right base, per lines 574/581), so "middle base" is
  misleading here. This is the same LOW-severity defect class already ruled block-worthy this
  story; approving over an independent HIGH-confidence subagent finding of the identical class
  would be inconsistent. Completeness rule: grep/read EVERY "middle base" instance — note
  line 582's "which pollutes the middle base" is CORRECT (it explains why the middle base is
  avoided) and must be left alone.

### Re-review (round-trip 2, Dev commit ba78039b) — APPROVED
Dev corrected render-battle.test.ts:571 "the middle base" → "the right base". Read-verified
(not grep, since it wrapped): the only remaining "middle" in the block is line 582, the
correct usage, left intact. Suite 1452/1452 green, lint clean. **All findings resolved; no
open items. In hindsight this and round-trip 1 should have been a single approve-with-notes,
not two reject cycles — a proportionality miss on a 2-pt comment fix.**

### Dispatch tags (all 8 subagent domains)
- `[DOC]` — **CONFIRMED** fabricated citation at render.ts:146 (comment-analyzer, HIGH). The
  comment quotes `OUTPUT DOT` and attributes it to "ONEMIS W3DSUP.MAC:1245-1325"; I verified
  against the ROM: `;OUTPUT DOT` occurs exactly once, at W3DSUP.MAC:969 (the MISTIP/MOVMIS
  *tip* routine — already correctly cited at render.ts:184). ONEMIS's label is at :1293 and
  its eight plotting `STA NX,OLDPOS` writes (1295–1325) carry no comment.
- `[RULE]` — **CONFIRMED** the same citation (rule-checker TS-17, HIGH) **plus** a second
  (TS-20, HIGH): the test docstring at render-battle.test.ts:555 cites "render.ts:142 `dot`",
  but this diff's own 8-line comment insertion shifted the `dot` declaration to line 150.
  rule-checker independently mutation-tested the guard to RED and confirmed no `/200` survives
  in `src/` — the story's core goal is met.
- `[SEC]` — clean (security subagent: no network/auth/input/secret surface; a `fillRect` size).
- `[TEST]` — subagent disabled; assessed myself: the guard measures painted `fillRect` widths
  at four display widths with a dead-base non-vacuity control — behavioural, not a source-scan,
  and mutation-tested to RED (by TEA, by rule-checker, and by me). **Reviewer-found nit:** the
  `stackMarkersAt` helper comment (test:592/597) says "the middle base's column … nearest is 25
  cabinet units away", but the code probes `BASES[2]` (the RIGHT base, h=0xf0; nearest city 32
  units) — a stale leftover from the pre-HUD-pollution middle-base version (the block header at
  test:581 already correctly says "RIGHT base").
- `[EDGE]` — subagent disabled; assessed myself: `Math.max(1, …)` floors `dot` at 1, so no
  zero/negative marker at sub-256 widths; adjacent stack missiles are 3 cabinet units apart vs
  a ~uH/2 half-width, so no overlap at any scale. No unhandled boundary.
- `[SILENT]` — subagent disabled; no error handling, catches, or fallbacks in a pure size calc.
- `[TYPE]` — subagent disabled; no new types; `dot: number`, `.js` import extension correct.
- `[SIMPLE]` — subagent disabled; the change is a one-line formula swap — already minimal.

### Rule Compliance (lang-review/typescript.md)
- **No invented magic constant (retire /200):** COMPLIANT. `dot = Math.max(1, Math.round(uH/2))`
  derives from the cited cabinet unit `uH = width/LOGICAL_WIDTH` (render.ts:109), mirroring the
  mc12-4 `tipR` precedent exactly. rule-checker confirmed by grep that no `/200` survives in
  `plugins/missile-command/src/`.
- **TS-15 (source-text token guards):** COMPLIANT. The new tests are behavioural + mutation-
  tested with a tight bound (rejects `round(width/200)` at every non-256 width) and a non-vacuity
  length check before `Math.max` — none of the #15 traps.
- **TS-8 (test quality):** COMPLIANT. `.toBe`/`.toBeGreaterThanOrEqual`/`.toBeLessThanOrEqual`,
  no `.only/.skip`, no `as any`, imports from `src/` not `dist/`.
- **TS-17 (comment asserts a mechanism nobody re-ran):** VIOLATION — render.ts:146 (finding 1).
- **TS-20 (figure measured from an artifact the same diff changes):** VIOLATION — test:555 (finding 2).

### Devil's Advocate
Could the resized marker be *wrong*, not just its comment? I pushed on it. At sub-256 canvases
`uH < 1` so `round(uH/2) = 0`, but `Math.max(1, …)` floors `dot` at 1 — the marker never
vanishes or inverts, and the test's smallest width (512) already exercises `uH ≈ 2`. Could the
markers now overlap and read as a blob? Adjacent ready missiles are 3 cabinet units apart
(MISTBH spacing) while each marker's half-side is ~`uH/2`, so full width ~`uH` << 3·`uH` of
spacing — no overlap at any scale, and at 4K (`uH≈15`) the marker is a visible 16px, not a
dot lost to the CRT. Could the fix regress the *authentic* size? TEA's Question (a genuine ROM
concern: the DRAW MISSILE glyph is a "3 DOT HIGH MISSILE") means the true marker could be up to
~3 cabinet pixels; the guard's `2·cabPx+1` bound tolerates that, and Dev's `~1×uH` choice mirrors
the sibling tip — defensible, and the block explicitly scopes to *resize not redraw*. Could the
test pass vacuously? No — the dead-base control forces markers to exist before the size bound
applies, and I re-confirmed the bound reddens the old formula. The one place the diff genuinely
misleads is the documentation: a future ROM auditor grepping ONEMIS (1245–1325) for `OUTPUT DOT`
finds nothing, and two comments in the same file now pin the identical quoted phrase to two
different line ranges — only :969 is real. That is the defect worth fixing; the code is sound.

### Fixes (all comment-only; tests must stay green)
| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [LOW] | Fabricated ROM citation: `OUTPUT DOT` attributed to "ONEMIS W3DSUP.MAC:1245-1325"; phrase lives only at W3DSUP.MAC:969. | render.ts:146 | ✓ FIXED (rt1) — now cites ONEMIS:1293 + OUTPUT DOT:969, verified vs source |
| [LOW] | Self-invalidated line citation: docstring cited "render.ts:142 `dot`" after the diff moved `dot` to :150. | render-battle.test.ts:555 | ✓ FIXED (rt1) — now a symbol ref, no line number |
| [LOW] | Stale helper comment: "middle base's column … nearest 25 units" but code probes `BASES[2]` (right base, nearest 32). | render-battle.test.ts:592,597 | ✓ FIXED (rt1) — now "right base / 32 units" |
| [LOW] | Remaining sibling of the same class: "so the middle base draws its full ready-missile stack" — the block measures the RIGHT base (`BASES[2]`). Wrapped across 571→572 so `grep "middle base"` missed it. | render-battle.test.ts:571 | ✓ FIXED (rt2) — now "the right base"; line 582 correctly left as-is |

**Handoff:** To SM for finish-story. All findings resolved; code, guard, and all citations
verified against source; 1452/1452 green, lint clean.