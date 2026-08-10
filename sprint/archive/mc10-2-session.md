---
story_id: "mc10-2"
jira_key: "mc10-2"
epic: "mc10"
workflow: "tdd"
---
# Story mc10-2: Draw the GROUND terrain landmass

## Story Details
- **ID:** mc10-2
- **Jira Key:** mc10-2
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/mc10-2-draw-ground-terrain-landmass
- **PR:** https://github.com/slabgorb/arcade/pull/187

## Acceptance Criteria

Derived from story title (epic-mc10.yaml has null acceptance_criteria):

1. render.ts draws the GROUND landmass (yellow terrain band) at the field bottom where currently skipped
2. Colour used is wave-1 CYELLO value (WV1COL[1]) already present — NO palette or colour-table change
3. Cities and bases visually sit ON the ground (ground drawn behind/under them, not over)
4. Core-boundary preserved: change is shell/render.ts only — src/core/ untouched
5. GROUND slot (COL001) now populated in render output (no longer skipped per render.ts:21 comment)

## Background

The Missile Command cabinet's defining yellow terrain/landmass is currently not drawn in the clone. render.ts:21 explicitly skips the GROUND slot, yet the colour is already correct in wave-1. This is the biggest single look gap in mc10. The fix requires only shell-layer changes; the authentic colour is already present and requires no palette rewiring.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T06:47:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T06:23:30Z | 2026-08-10T06:25:49Z | 2m 19s |
| red | 2026-08-10T06:25:49Z | 2026-08-10T06:32:52Z | 7m 3s |
| green | 2026-08-10T06:32:52Z | 2026-08-10T06:35:57Z | 3m 5s |
| review | 2026-08-10T06:35:57Z | 2026-08-10T06:47:17Z | 11m 20s |
| finish | 2026-08-10T06:47:17Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA (red phase).** Board studied before any spawn:

- **Sibling probes clean.** `git fetch --prune` then `git branch -r | grep mc10-2` → no remote
  branch owned it. The only live sibling session across `~/Projects/a-*` was `a-2` on `pm4-1`
  (unrelated PM work), so no contention on mc10-2's files.
- **Premise re-verified against the current tree — it holds, not stale.** The story asserts
  "render.ts currently skips the GROUND slot." Confirmed: `render.ts:21` reads
  `// below). The legend's GROUND slot (COL001) has no on-screen element in this clone,`. So the
  GROUND landmass genuinely is not drawn today; the story is to START drawing it. The colour claim
  (wave-1 CYELLO already correct, no palette change) is the story's stated scope, to be proven in RED.
- **ACs are DERIVED, not verbatim.** The epic YAML record (`sprint/epic-mc10.yaml`) has an empty
  description and `acceptance_criteria: null` — the whole spec lives in the title. sm-setup derived the
  five ACs above (jt8-6 pattern). No either/or or ambiguity in the deliverable, so no user ruling was
  needed at setup.
- **Scope discipline for TEA/Dev:** the change surface is `plugins/missile-command/src/shell/render.ts`
  (shell only). `src/core/` must stay untouched — missile-command enforces a core-boundary/purity test.
  Run this app's suite with `npx vitest run --project missile-command`.
- **Claim pushed.** Story stamped `in_progress` (sm-setup left it `backlog`, sixth confirmation), and the
  empty `feat/mc10-2-draw-ground-terrain-landmass` branch (tip == develop) pushed to `origin` so the
  sibling branch-probe lights up.

**Handoff to TEA:** write the failing RED test(s) that prove render.ts does not draw the GROUND band today
and pin the wave-1 CYELLO colour + depth ordering (cities/bases over ground). Keep assertions checkable
and non-vacuous.

## Tea Assessment

**RED complete — handoff to Dev (Yoda) for GREEN.** New file:
`plugins/missile-command/tests/render-ground.test.ts` (9 tests: **7 fail on missing behaviour, 2
pass as palette sanity anchors**). Full missile-command project: **1080 passed / 7 failed**, the 7 all
in this file; **tsc `npm run lint` green**. No pre-existing red. Committed as `3cd2a471`.

**No signature or palette change is needed, so the RED compiles cleanly against real symbols.**
`drawFrame` is already 5-arg / wave-aware (mc9-2) and `SLOT.GROUND` (=1) already resolves in
`palette.ts`. The tests import `drawFrame`, `paletteForWave`, `rgbCss`, `SLOT` directly — they fail on
*behaviour* (`expected 0 to be greater than 0`), never on types. No `as unknown as` seam was required
(unlike mc9-2), except the standard house canvas-mock cast that every render test uses.

**What the tests pin (the GREEN contract):**
1. **Drawn at all** — ≥1 `fillRect` in the GROUND-slot colour at wave 1 (currently zero).
2. **A landmass at the field bottom** — the GROUND marks reach ≥ half the field width and at least one
   sits in the bottom half. Deliberately geometry-agnostic: one wide rect OR many tiled rects both pass;
   pixel-exact terrain shape is the Reviewer's screenshot, not a node test.
3. **Per-wave palette-sourced, NOT a hardcoded yellow (AC2)** — waves 1/5/13 each draw the band in
   *their own* COL001 colour (`rgb(255,255,0)` / `rgb(0,0,255)` / `rgb(0,255,0)`). A literal `#ff0`
   passes wave 1 but reddens 5 and 13. The intended GREEN is `hue(SLOT.GROUND)`.
4. **Occlusion (AC3)** — every GROUND mark is painted *after* the background clear and *before* the
   first city/base mark, so structures read as sitting ON the ground. **Dev must insert the GROUND draw
   right after `clearField`, before the cities loop.**
5. **Wiring guard (AC1/AC5)** — comment-stripped `render.ts` must reference `SLOT.GROUND`. Guards the
   mc9-2-precedent "commented-about but never wired" failure.

**Guidance for Yoda (GREEN):**
- Change surface is **`plugins/missile-command/src/shell/render.ts` only**. Do NOT touch `src/core/`
  (purity.test.ts guards it — AC4 needs no new test). Do NOT touch `palette.ts` (AC2: "no palette change").
- Draw the band with `hue(SLOT.GROUND)` immediately after `clearField(...)`, before the cities loop.
- **Update the now-false module-header comment** (render.ts:19-23): it currently states the GROUND slot
  "has no on-screen element in this clone, so it is not drawn." After GREEN that is a lie in the
  permanent record — rewrite it to describe the GROUND band you added (golden-rebaseline / stale-prose
  lesson). The wiring test only checks `SLOT.GROUND` appears in code; the comment truth is on you + Reviewer.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **§1 Type-safety escapes** — the GREEN change needs no `as any` / `as unknown as` / `@ts-ignore`; it
  reads an existing typed slot. The only cast in the new test is the canonical canvas-mock
  `as unknown as CanvasRenderingContext2D` (house pattern, shared by every render test). Flag if Dev's
  GREEN introduces any new cast.
- **§4 Null/undefined** — no new nullable inputs; the band colour comes from `paletteForWave(wave)[SLOT.GROUND]`,
  a total function over the clamped wave. No `||`-vs-`??` hazard introduced.
- **AC-derived fidelity rule (per-wave palette, not literals)** — enforced by test #3 above, the project's
  own mc9-2 "sources from the palette, not inline hexes" law extended to the GROUND slot.

## Dev Assessment

**GREEN complete — handoff to Reviewer (Obi-Wan).** Full missile-command project **1087/1087**
(the 7 mc10-2 tests now pass), **tsc `npm run lint` green**, no regression. Implementation committed
`6fb65514`, pushed to `feat/mc10-2-draw-ground-terrain-landmass`.

**The change — `plugins/missile-command/src/shell/render.ts` only (23 insertions, 3 deletions):**
- Added a module-level `GROUND_V = Math.max(...CITIES.map(v), ...BASES.map(v))` — the topmost structure
  baseline (bases at `MISBnV=0x16`). Data-driven, no magic number; cabinet V grows upward so `max` is the
  highest baseline and every city/base rests on the land.
- In `drawFrame`, right after `clearField(...)` and **before** the cities loop, paint the band:
  `ctx.fillStyle = hue(SLOT.GROUND); ctx.fillRect(0, project({h:0,v:GROUND_V}).y, width, height - top)`.
  One full-width rect from the ground surface to the field bottom.
- Rewrote the now-false mc9-2 header sentence ("GROUND slot … has no on-screen element … not drawn") and
  added an mc10-2 header note describing the band (truthful permanent record — stale-prose lesson).

**AC coverage:** AC1/AC5 drawn + wired via `SLOT.GROUND` (the header comment `GROUND slot` is prose; the
live expression `hue(SLOT.GROUND)` is what the source-scan asserts). AC2 per-wave palette-sourced, no
literal, no `palette.ts` change. AC3 painted before structures → they sit on it. AC4 `src/core/` untouched
(purity.test.ts green).

**For the Reviewer — the one thing tests can't judge is the screenshot.** The AC is fundamentally visual
("cities/bases sit on it instead of floating on black"). A node test pins colour, extent, order; the
pixel read is yours: `just serve` → `http://127.0.0.1:5270/missile-command/` should show a yellow
landmass along the bottom with the cities and bases standing on it. Note the ground band is ~10% of the
field height (from the topmost structure baseline to the bottom) — deliberately anchored to the structure
data, not a guessed height; flag if you judge the landmass should rise higher.

## Delivery Findings

**mc10-2 (GREEN):** GROUND (COL001) landmass now drawn in `render.ts` from `hue(SLOT.GROUND)`, before the
structures, top edge at `GROUND_V` (topmost structure baseline). No signature/palette/core change. Full MC
project + tsc green. No upstream findings inherited.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | smells: none; suite green | N/A — re-confirmed independently (see note) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 1 cluster (Medium), 3 folded into it; 0 dismissed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 real + 2 non-blocking | confirmed 2 (Medium/Low), dismissed 2 (rationale below) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 2 confirmed (1 Medium, 1 Low), 2 dismissed (with rationale), 0 deferred

**Preflight note:** reviewer-preflight reported 1087/1087 + tsc clean, but it ran during the window in which
reviewer-rule-checker was mutation-probing the shared working tree. I re-ran the full missile-command
project **myself on the restored clean tree** (`git diff` empty vs HEAD) → **1087/1087**, tsc clean. The
green is real; the preflight snapshot is superseded by my own.

**The "moving tree" during review, explained (not tampering):** reviewer-rule-checker legitimately
mutation-tested the guards in the live working tree — (a) deleted the GROUND block → 7/9 red; (b) swapped
`hue(SLOT.GROUND)`→`hue(SLOT.SKY)` and added `const _decoy = SLOT.GROUND` → the wiring guard ALONE stayed
green while 6 behavioural siblings reddened — then restored the tree. My interleaved test runs saw those
transient states. Confirmed final: `git show HEAD:…render.ts` line 91 is `ctx.fillStyle = hue(SLOT.GROUND)`,
working tree clean. (Hazard for the record: a subagent mutating the uncommitted tree while the lead also
runs tests — the shared-worktree / mutation-probe-hygiene gotcha. It restored correctly here.)

## Reviewer Assessment

**VERDICT: [APPROVED]** — production code correct and behaviourally guarded; two confirmed test-hygiene
findings routed to a **filed follow-up** (proportionality: prose/comment + redundant-guard cluster on a
2pt story with correct, mutation-sound coverage is a follow-up, not a rework round). No Critical/High.

### Rule Compliance (lang-review typescript.md + CLAUDE.md)
- **Fidelity / palette-literal law (mc9-2)** — [VERIFIED] `render.ts:91 ctx.fillStyle = hue(SLOT.GROUND)`
  sources the colour via `paletteForWave(wave)[SLOT.GROUND]`→`rgbCss` (`palette.ts:131`, the one literal
  site). No inline hex, no palette-table edit. Rule-checker independently CONFIRMED.
- **Core boundary (CLAUDE.md)** — [VERIFIED] `render.ts:50 GROUND_V` is a pure read of already-imported
  `CITIES`/`BASES` (imported since mc1-2/mc9-1). No new core import, no mutation, no shell→core coupling.
- **#21 degenerate numeric input** — [VERIFIED] `GROUND_V = Math.max` over 6+3 non-empty compile-time
  constants (never empty/NaN/±∞); `project()` divides by module constants, not by `width/height`; a 0/NaN
  canvas is a spec-safe no-op, identical exposure to every existing element. No new surface.
- **#26/#18 test self-reference** — [VERIFIED] `groundCss` composes the real exported symbols; the
  `'rgb(255, 255, 0)'` anchor is an independent literal, not derived from the same expression. Mutation-
  sound (reddens when the mechanism breaks).
- **#15/#25 source-text guard** — [FINDING, see below] the wiring guard is a whole-file positive anchor.
- **#17/#24 stale/retired-claim comments** — [FINDING, see below].
- **#1 double-cast, #5 missing `.js`** — [DISMISSED] pre-existing repo idioms (the canvas-mock cast is
  byte-identical across 6 sibling render tests; the extensionless import matches `palette.test.ts` /
  `render-palette.test.ts` under `moduleResolution: bundler`, tsc clean). Not introduced or worsened here.
- #2,3,4,6,7,8,9,10,11,12,13,14,16,19,20,22,23 — 0 applicable instances (no enums/JSX/async/error-handling/
  build-config/aria; population filter checked non-excluding). Compliant.

### Observations (tagged)
1. `[RULE][TEST] [MEDIUM]` **Wiring guard is decoy-defeatable (#15/#25)** at
   `tests/render-ground.test.ts` (`references SLOT.GROUND` block). A positive `/\bSLOT\.GROUND\b/` match over
   the *whole* comment-stripped file verifies "the module names the symbol," not "the paint path reads it."
   Mutation-proven exploitable: with the real draw broken and a `const _decoy = SLOT.GROUND` added, this test
   stayed green. **Net coverage is still sound** — the 6 behavioural siblings reddened on that same mutation —
   so this is a redundant/misleading guard, not a silent hole. Fix: anchor to the paint expression
   (`fillStyle = hue(SLOT.GROUND)`) or drop it as redundant.
2. `[DOC][RULE] [MEDIUM cluster] Stale RED-phase prose ships next to the GREEN it contradicts (#17/#24)`
   at `tests/render-ground.test.ts` — (a) header L8-10 quotes render.ts's now-DELETED "…has no on-screen
   element…so it is not drawn" as "verbatim"; (b) the `it()` title L116 "— today none does" is false and
   prints on every green run (self-contradictory in the report); (c) the wiring-rationale comment L~185 still
   says the header "explain[s] it is NOT drawn." All were RED-phase-true and never detensed after GREEN.
   Fix: past-tense the header quote, drop "— today none does", reword the rationale.
3. `[VERIFIED] Occlusion` — ground drawn at `render.ts:90-92`, immediately after `clearField` and before the
   cities loop; ICBMs/ABMs/blasts (drawn later) still paint over it. Guarded by the draw-order test.
4. `[VERIFIED] Ground always visible` — checked all 10 palettes: slot 1 (GROUND) ≠ slot 0 (SKY) in every
   wave, so the band never blends into the backdrop (a real risk given mc9-2's flash-slot==sky history).
5. `[VERIFIED] Wiring into the frame` — the draw sits on the existing `drawFrame` paint path called every
   frame; no new wiring needed. Suite green (1087) on the clean tree, tsc clean, orchestrator 457 green.
6. `[SEC] clean` — no external input reaches the render path; canvas dims are DOM-sourced; no XSS/DoS/eval.

### Devil's Advocate
Assume this ships broken. The loudest risk is a landmass nobody can see. The ground is one `fillRect`
in `hue(SLOT.GROUND)`; if any wave set GROUND == SKY the band would vanish into the backdrop and the AC
("cities/bases sit on it instead of floating on black") would silently fail on that wave while the wave-1
screenshot looked perfect — exactly the mc9-2 flash-slot-equals-sky trap. I discharged it by enumerating
all ten palettes: slot 1 ≠ slot 0 everywhere, so no wave hides the ground. Next: geometry. `GROUND_V` is
`Math.max` over structure baselines; if `CITIES`/`BASES` were ever empty, `Math.max()` is `-Infinity`,
`project` yields `y=+Infinity`, and the band silently disappears — but both arrays are `readonly`
non-empty constants, so unreachable. A degenerate canvas (`width`/`height` = 0/NaN) makes `fillRect` a
spec-safe no-op, no throw, same as every sibling element — no new hazard. Draw order: if the ground were
painted AFTER the structures it would bury the cities/bases; it is painted before them (line 90 < the
cities loop), and the draw-order test locks that — but note the test only proves ground precedes the FIRST
structure mark, so a future edit inserting another background layer between ground and cities wouldn't be
caught; acceptable for now. The nastiest thing the review surfaced is epistemic, not visual: the wiring
guard passed on a decoy while the feature was broken. A reader who trusts that one test's NAME
("actually wired to the GROUND slot") would be misled — the assurance is carried by the behavioural tests,
not the guard that advertises it. That is why the guard is a confirmed finding even though coverage holds.
Finally, a confused future maintainer greps `render.ts` for the "verbatim" sentence the test header
quotes, finds nothing, and distrusts the test — the stale quote is a small live landmine in the permanent
record. None of these rise to Critical/High: the shipped behaviour is correct and independently guarded.
But the test-file record is not clean, and that is the follow-up.

### Deviation Audit
`## Design Deviations` is `None yet` — nothing to stamp.

### Confirmed findings → FOLLOW-UP (filed, non-blocking)
Both findings are MEDIUM/LOW test-apparatus issues in `tests/render-ground.test.ts`; production code needs
NO change. Filed as **mc10-7** (1pt chore, trivial): test-comment detense + wiring-guard hardening in
`render-ground.test.ts`, rather than a rework round, per proportionality.

## Impact Summary

**Shipped:** the GROUND (COL001) yellow terrain landmass now renders along the missile-command field
bottom (`plugins/missile-command/src/shell/render.ts`), so cities/bases sit on land. Per-wave
palette-sourced (`hue(SLOT.GROUND)`), no palette/core/signature change. New test file
`tests/render-ground.test.ts` (9 tests).

**Review:** single round, **APPROVED**. 4 enabled subagents (preflight, comment-analyzer, security,
rule-checker); 2 disabled-N/A rows aside. **Zero blocking items.** Two MEDIUM/LOW test-apparatus findings
(stale RED-phase comments #17/#24; decoy-defeatable wiring guard #25) — production code correct and
mutation-sound — routed to filed follow-up **mc10-7** (1pt chore), not a rework round, per proportionality.

**Integration:** code PR **#187** MERGED into `develop` (merge commit `f25011c2`), branch deleted. Merged
`develop` tree verified green: missile-command **1087/1087**, orchestrator **457/457**, tsc clean. `develop`
did not drift during the story (no trial-merge conflict).

**Note for the record:** during review, reviewer-rule-checker mutation-tested the guards in the shared
uncommitted tree (and restored it); interleaved test runs by the lead saw transient states — the
shared-worktree/mutation-probe-hygiene hazard. Final committed code is correct; no residue.

## Design Deviations

None yet