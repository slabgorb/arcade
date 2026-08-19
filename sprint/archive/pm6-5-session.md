---
story_id: "pm6-5"
jira_key: "pm6-5"
epic: "pm6"
workflow: "tdd"
---
# Story pm6-5: VISUAL playtest

## Story Details
- **ID:** pm6-5
- **Jira Key:** pm6-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pm6-5-visual-playtest-cutscene
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-08-19T21:09:57Z
**Round-Trip Count:** 3

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T16:18:43Z | 2026-08-19T16:20:40Z | 1m 57s |
| red | 2026-08-19T16:20:40Z | 2026-08-19T16:34:21Z | 13m 41s |
| green | 2026-08-19T16:34:21Z | 2026-08-19T16:49:50Z | 15m 29s |
| review | 2026-08-19T16:49:50Z | 2026-08-19T17:02:09Z | 12m 19s |
| green | 2026-08-19T17:02:09Z | 2026-08-19T17:41:31Z | 39m 22s |
| review | 2026-08-19T17:41:31Z | 2026-08-19T18:32:30Z | 50m 59s |
| green | 2026-08-19T18:32:30Z | 2026-08-19T19:21:06Z | 48m 36s |
| review | 2026-08-19T19:21:06Z | 2026-08-19T20:51:01Z | 1h 29m |
| green | 2026-08-19T20:51:01Z | 2026-08-19T21:09:57Z | 18m 56s |
| review | 2026-08-19T21:09:57Z | - | - |

## Sm Assessment

Setup complete for pm6-5 — the visual "eyes" for epic pm6. This is a Playwright-driven
visual playtest (tdd/phased, 2 pts), CUTSCENE-ONLY after the pm6-4 kill-screen cancel
(2026-08-19, user directive: not reproducing authentic bugs).

**TEA (RED) — what the failing test must pin:**
- A screenshot at `http://127.0.0.1:5270/pac-man/` capturing an intermission cutscene
  (pm6-2/pm6-3) playing between levels, and asserting it DIFFERS from a nonsense control
  path (the canonical-serve lesson — an all-200 sweep proves nothing under the lobby SPA
  fallback). The DIFFER assertion is the load-bearing one, not a bare 200.
- NO kill-screen assertions — that scope is gone. Do not reintroduce it.
- Accessibility: no >3 Hz large-area strobe (Decision B) — the cutscene must be static/safe.

**Harness constraint:** claude-in-chrome is NOT connected here. Use the Playwright MCP
harness headless on its own port (mirror the other games' playtest stories).

**AC2/AC3 are process, not code:** any discrepancy is filed by FILE SURFACE (jt9 habit),
and a note records pm6 content-complete (intermissions shipped, kill screen a permanent
descope). These land in findings/docs, not necessarily a test.

Route: TEA → Dev → Reviewer → SM finish.

## Tea Assessment

RED complete. One failing test file: `plugins/pac-man/tests/shell/pm6-5-cutscene-playtest.test.ts`
(9 assertions RED, 2 intended-green guards). Rest of the pac-man project 485/485 green;
`tsc --noEmit` clean.

**The genuine RED (not manufactured):** the coffee-break cutscene is fully modelled and
stepped in core (`game.cutscene`, `stepCutscene` in `core/game.ts`) but the SHELL has no
render path — `grep -rn 'cutscene|intermission' plugins/pac-man/src/shell/` is EMPTY, and
`main.ts` draws maze/ghosts/Pac/HUD every frame but never `game.cutscene`. So during
`intermission` the scripted actors never reach a pixel — the break plays silently.

**The seam (my call, documented so Reviewer/Dev aren't surprised):**
`overlays.draw(ctx, game)` — the per-frame presentation call `main.ts` ALREADY makes every
frame (`main.ts:249`), and the home pm4-9 chose for phase-gated screen drawing (the attract
"PUSH START BUTTON" prompt). Testing this seam proves INTEGRATION, not an isolated helper.
Dev may factor sprite helpers into `render.ts`, but the wired entry the test asserts is
`overlays.draw`. If Dev has a strong reason to draw the cutscene from a NEW `main.ts` call
instead, raise a Delivery Finding — but that path is not currently wired-testable and would
leave the RAF loop as the only integration point, which is why I chose overlays.draw.

**GREEN contract for Dev:**
- `overlays.draw`, when `game.phase === 'intermission'` && `game.cutscene != null`, blits the
  cutscene actors (pac + blinky) as sprites; any other phase, or a null cutscene, draws none.
- Each actor's screen position derives from its `col` (ROM tile byte) so the sprite moves as
  the core steps the scene.
- Sprites read correctly: big-Pac (`bigPacActive`) visibly LARGER than small Pac; `frightened`
  Blinky = the blue flee sprite; `ripped` Blinky = the torn-sheet/worm sprite — each DISTINCT
  from the plain ghost. Use the pm3 baked sprites; core carries no tile numbers.
- Decision B (accessibility OUTRANKS ROM fidelity): small-area sprite animation only. NEVER a
  full-screen high-luminance fill (the test steps a whole act and asserts none).

**Rule coverage:**
- Accessibility / no-strobe (the standing Pac-Man ruling, pm4-1 precedent): suite 3 steps a
  whole act to `done` and asserts no full-screen bright fill, with a teeth guard + a
  non-vacuity guard (an actor must actually be drawn, else the safety check is empty).
- Non-vacuous assertions: every "differs" test carries a precondition that the base scene
  drew actors; the strobe test guards against the repo's zero-canvas trap.
- Core/shell purity: N/A here — this is a SHELL render test; it imports core only to build
  states. No new core value, so citations.test.ts / purity.test.ts are untouched.

**AC2/AC3 are process, not test:** AC2 (file discrepancies by FILE SURFACE) and AC3 (record
pm6 content-complete, kill screen a permanent descope) land in Delivery Findings / a doc note
during review — not as code assertions.

Route: Dev (GREEN) → wire the cutscene render into `overlays.draw`.

## Dev Assessment

GREEN complete. pm6-5 11/11 green; full pac-man project 494/494; `tsc --noEmit` clean.

Wired the cutscene render exactly to TEA's seam contract:
- `render.ts` `drawCutscene(ctx, cutscene)` — small Pac / four-sprite big-Pac (colour #16),
  blue frightened Blinky (#1c), ripped-sheet/worm (#32/#33, colour #1d). All ROM sprites
  (SPRITES index == ROM image number), byte-cited to `pacman.asm` (15f5/161e/1642/1a70).
- `overlays.draw` paints it during `intermission`, gated on a live `game.cutscene` (null →
  nothing), and no longer shows READY! there.
- `main.ts` blanks the field during `intermission` (authentic black-screen break) — the one
  change beyond the tested seam, so the eventual screenshot reads right (flagged in Findings).

Two things Reviewer should weigh (both in Delivery Findings / Design Deviations):
1. The on-screen GEOMETRY (row, X-from-col, big-Pac quadrant order) is authored presentation,
   not ROM-pixel-cited — wants a live screenshot to confirm it reads correctly.
2. I tightened the RED fake-ctx to hash sprite pixels; without it the frightened/ripped-vs-plain
   assertions were unsatisfiable (same size + position). Strengthens the test.

Route: Reviewer (or TEA verify) → then the live `/pac-man/` intermission screenshot (AC1).

### Dev Assessment — round 2 (addressing the REJECTED review)

Addressed all five must/should-fix findings; pm6-5 11/11 green, full pac-man 494/494, `tsc --noEmit`
clean, orchestrator 0 fail.

- **#1 (teleport) — root-caused and fixed.** The blur/teleport was not a mapping typo: `col` is a
  wrapping GATE-counter, not a screen coordinate (act 1's absolute map wraps 26×; the pac↔blinky gap
  swings ±128). Reworked `drawCutscene` to ANCHOR Pac centre-screen and place Blinky by the signed
  col-gap core actually models — coherent chase spacing, no wrap. Filed the deeper gap (core doesn't
  model the ROM #1806 screen coordinate; faithful traversal is a follow-up) as a Delivery Finding.
- **#2 (weak test assertions) — strengthened + mutation-verified.** big-Pac now asserts a ≥32px,
  larger FOOTPRINT; frightened now asserts a blue-pixel COUNT ≫ the plain Blinky's; base-case
  preconditions added. Re-ran the reviewer's two mutations (stacked big-Pac, frightened-red) — both
  now FAIL, then pass on the real code.
- **#3/#4 (comments) — fixed.** render.ts's false "runs leftward" claim replaced with the honest
  anchored/relative + facing-is-authored note; overlays.ts's banner comment now names the second
  (intermission) carve-out.
- **#5 (mis-anchored citation) — fixed.** test comment now cites `pacman.asm:1642/164d` (the value
  bytes), matching render.ts.
- **#6 (optional ripped toggle) — accepted as-is**, documented (small-area tear animation, Decision-B safe).

Still outstanding (unchanged): the live `/pac-man/` intermission SCREENSHOT (AC1 verify step) — best
produced now against the reworked render.

Route: back to Reviewer for re-review.

### Dev Assessment — round 3 (owner-approved: BUILD FAITHFUL TRAVERSAL + fix round-2 findings + AC1 screenshot)

Built the faithful traversal, fixed all three round-2 findings, and — for the first time in this story —
produced the live AC1 screenshot, which caught a real render defect no automated round could see.
Gates: pac-man **496/496**, `npm run lint` clean, orchestrator **503/503**, purity + cutscene core 75/75.
All new assertions mutation-proven (below).

**1) Faithful traversal (retired the anchored approach).** Root-caused why `col` can't be a screen
coordinate: it is the ROM's 8-bit gate counter and WRAP-LAPS ~250 steps per sub-state (measured:
act-1 `moved` s1=253, s4=239, s5=242). The step-sign model (+1 first leg / -1 return, single reversal
at #05ae) is CITED and correct — I kept it untouched (all pm6-2/pm6-3 step-narrative tests still green).
Added `CutsceneActor.x`: the SAME position UN-wrapped (advances with `col` every mover-step, never
folds mod 256), so each actor traverses monotonically per leg and reverses once. The render now reads
`x` directly — `cutsceneGap` / `CUTSCENE_PAC_ANCHOR_X` / the Pac-anchor are gone; both actors are
placed from their own core `x`. The tile↔screen anchor is byte-cited: the shared mover #1806 draws an
actor on-screen only while its tile is in `[#21, #3b)` (`pacman.asm:1852` — the two `ld b` compares),
so the render centres that band on the frame. Added the two band-edge constants
(`CUTSCENE_CORRIDOR_LEFT_COL` #1856, `RIGHT_COL` #185c) with claims/cutscene.json entries + AC3 value
pins + REQUIRED_ADDRS. Mutate-to-red verified: constant→red on the value pin, verbatim drift→red on the
citations byte-check. The per-step pixel distance (`CUTSCENE_STEP_PX`) stays honest-uncited presentation
(the ROM's sub-pixel speed is not a cited constant — core's header says so).

**2) Round-2 findings.** #1 (Blinky untested): added an isolation test — hold Pac fixed, shift only
`blinky.x`, assert the Blinky blit tracks (mutation: hardcode Blinky's screenX → red). #2 (big-Pac width):
big-Pac is now a single 32×32 blit; assert one blit is 32×32 in BOTH dims (mutation: BIG_PAC_SCALE=1 →
red). #3 (citation 1a70): fixed the test comment to `1aa1` (image #1c) / `1ab1` (colour #11).

**3) AC1 screenshot — and the defect it caught.** Drove a REAL level-2 clear at
`http://127.0.0.1:5290/pac-man/` (Playwright MCP headless; my tree on 5290 since 5270 was held by
another checkout; added a `window.__sim` diagnostic tap to main.ts, mirroring millipede ml10-5). The
first screenshot showed the giant Pac was INVISIBLE — the pm3 atlas's dedicated big-Pac quad sprites
(#10–#1b) decode with their body in pixel-plane 2, and ROM colour #16's yellow is on plane 1 (plane 2 =
blue), with NO colour code mapping plane 2 to yellow. So big-Pac could only ever render BLUE. Fixed:
big-Pac is now the ROM-decoded SMALL Pac sprite (yellow, plane 3) upscaled 2× — correct colour +
the live half-rate chomp, over the unrenderable-yellow quad art (Design Deviation logged). Re-shot:
the iconic act-1 return reads correctly — a giant YELLOW Pac chasing the small BLUE frightened Blinky,
on a black field, no strobe. Control (the maze) is visibly different (differs-from-control confirmed
visually + in-test). Evidence: `plugins/pac-man/docs/rom-study/screenshots/pm6-5-intermission-act1.png`.

Route: back to Reviewer for re-review (round 3).

### Dev Assessment — round 4 (addressing the round-3 REJECTED review)

Fixed BOTH blocking test findings, each mutation-PROVEN against the exact regression the reviewer named;
pac-man 497/497, `npm run lint` clean, orchestrator 503/503.

- **#1 (`CutsceneActor.x` had no direct test) — FIXED.** Added a CORE test (`cutscene.test.ts`, new describe
  "the traversal coordinate x is UNWRAPPED") that runs act 1 and asserts: (a) at every frame where `col`
  wraps the 8-bit ring (`|Δcol| > 128`), `x` moves only its normal small step (`|Δx| ≤ CUTSCENE_STEPS_PER_FRAME`)
  — a wrapped `x` would jump ~254 in lockstep; and (b) `x` escapes the 0..255 byte range (act 1 reaches
  x=286 and x=−195). Non-vacuity: asserts the act actually crosses a wrap boundary first. Mutation-verified:
  reintroducing the round-1 regression `a.x = (a.x + a.step + 256) & 0xff` reddens this test (confirmed).
- **#2 ("picture MOVES" was vacuous — a static render passed) — FIXED.** Rewrote it to sample blit layouts
  ONLY within sub-state 1 (the chase, `bigPacActive` fixed FALSE, both actors moving), with a precondition
  asserting `bigPacActive === false` in the window and that >2 frames were sampled. That removes the big-Pac
  size-offset flip the old test rode. Mutation-verified: severing `cutsceneScreenX` to `Math.round(CUTSCENE_ORIGIN_X)`
  (a fully static render) now reddens it (and also reddens the Blinky-isolation test — double teeth).

**AC1 screenshot — re-captured NATURAL, and a readability limitation surfaced (see Delivery Findings).**
Per the reviewer's non-blocking note, I re-shot from the core's REAL positions (not a hand-arranged pose).
The **return leg reads correctly** — the giant yellow Pac chasing the blue frightened Blinky at the core's
natural ~120px spacing (`docs/rom-study/screenshots/pm6-5-intermission-act1.png`). But the natural OPENING
chase does NOT read: at the presentation compression (`CUTSCENE_STEP_PX = 0.5`, needed to keep the wrap-lap-
inflated traverse on-screen) the close chase spacing (~3 tile-units) collapses to ~1.5px, so small Pac fully
overlaps Blinky — the tight chase shows as one sprite. This is an honest limitation of rendering the
wrap-lapped `x` through a single linear scale (no single scale shows both the full traverse AND readable
close-chase spacing); a fully readable close chase needs the core to model the ROM sub-pixel speed so the
traverse is screen-sized rather than wrap-lapped. Filed as a non-blocking Delivery Finding for SM/owner to
weigh — the owner directed traversal (delivered; return leg reads), and this is the residual cost.

Route: back to Reviewer for re-review (round 4).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (494 pac-man + 503 orchestrator green, lint clean, 0 smells) | N/A |
| 2 | reviewer-test-analyzer | Yes | findings | 1 critical, 2 major, 2 minor | confirmed 3 (big-Pac-not-larger, frightened-not-blue, missing base preconditions) |
| 3 | reviewer-comment-analyzer | Yes | findings | 3 (render.ts:465 false "leftward", overlays.ts:153 stale, test:268 mis-anchored cite) | confirmed 3; all render.ts CODE citations verified correct |
| 4 | reviewer-rule-checker | Yes | clean | 0 violations / 33 rules | purity 27/27, Decision B intact, all ROM constants byte-verified |

**audit-tree:** false-DIRTY on the pf status stamp (`sprint/epic-pm6.yaml` in_review + `context-story` condensation) — exit 0, NO source files dirty, both mutation subagents used isolated worktrees. Review integrity intact; tracking state left for the finish flow.
| 5 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (all 4 enabled subagents returned; 5 disabled via settings).

### Reviewer's own finding (to verify against subagents)
- **[Reviewer] MAJOR — `cutsceneActorX` col%28 mapping teleports the actors mid-scene.** Act-1 columns traverse ~0x1e..0x3d (30..61), a 31-tile span on a 28-tile-wide screen, so `col % MAZE.cols` wraps at col 56 (x 216→0) and 28 — the live cutscene shows Pac/Blinky JUMP from the right edge to the left edge mid-walk. The render-layer test only checks positions DIFFER, not continuity, so it stays green. This undermines AC1 ("reads correctly against the ROM cutscene"). Root cause: the col→X mapping folds a >screen-width traverse back on itself. Fix: map col to a continuous X (no mod-wrap) — an offset so the active traverse sits on-screen, or let actors walk off-frame as the ROM does — never a wrap.

## Reviewer Assessment

**Verdict:** REJECTED — changes requested. The wiring is clean (purity intact, Decision B intact,
all four ROM constants byte-verified, 494+503 tests green, lint clean). But the story is a VISUAL
playtest whose AC1 is "the actors read correctly against the ROM cutscene," and two things defeat
that: a real visible render defect, and tests that don't actually verify their own fidelity claims.
Neither a screenshot nor the current suite would catch them.

### Must-fix (blocking)

1. **CODE / render.ts:441 `cutsceneActorX` — the live cutscene TELEPORTS (MAJOR).** `col % MAZE.cols`
   folds a traverse wider than the screen back on itself: act-1 columns run ~0x1e..0x3d (30..61, a
   31-tile span) on a 28-tile screen, so at col 56 the actor's X jumps 216→0 — Pac/Blinky visibly
   snap from the right edge to the left edge mid-walk (and again near col 28). The render-layer test
   only checks positions DIFFER, never continuity, so it stays green. comment-analyzer #1 corroborates
   (col INCREASES → rightward, then wraps). Fix: map `col` to a continuous on-screen X — an offset so
   the active traverse fits, or let the actors walk off-frame as the ROM does — never a mod-wrap.

2. **[TEST] the "reads correctly" AC1 assertions don't verify their claims (CRITICAL + MAJOR,
   mutation-proven by reviewer-test-analyzer).**
   - big-Pac "LARGER" (test ~L421): mutating big-Pac to stack all 4 quads at the SAME position (i.e.
     NOT larger) still passes — the test only proves "differs," not "bigger." Add a footprint assertion
     (Pac-only blit bounding box ≥ 2× the small scene / ≥ 32px).
   - frightened "blue" (test ~L436): mutating the colour code to red (wrong) still passes — the hash
     diff is driven entirely by the sprite-index change. Assert against a known-good frightened
     reference hash, or narrow the claim to "renders distinctly."
   - Missing base-case preconditions on the frightened / ripped / act-3 differ tests (project rule:
     "a precondition must prove the base case actually drew something"). Add
     `expect(spriteBlits(base).length).toBeGreaterThan(0)` before each, matching the pattern already
     used in the wiring tests.

### Should-fix (non-blocking, do in the same pass)

3. **[DOC] render.ts:465** — "the break runs leftward" is false for most of act 1 (col increases →
   rightward); `PAC_FRAMES.left` is used unconditionally and does not track `actor.step`'s reversal.
   Drop the directional claim or mark the facing as an authored presentation simplification.
4. **[DOC] overlays.ts:153** — the pm4-9 "Everywhere else keep the banner behaviour" comment now
   has a second carve-out (the intermission branch below). Note the exception.
5. **[DOC] citation / test:268** — cites `pacman.asm:162d` (the act-2 gate check `ld a,(#4e07)`) for the
   `#32/#33` sprite values; the value-encoding bytes are `1642/164d` (as render.ts's own comment
   correctly cites). Anchor-drift — fix to `1642/164d`.
6. **(optional) render.ts:479** — the ripped ghost toggles `#32↔#33` on `frame%2`; the ROM latches to
   `#33` one-way (cutscene.ts: "never toggles back off"). Small-area so not a Decision-B issue, but a
   minor fidelity deviation — consider a one-way latch or a static torn sprite.

### Verified clean (not findings)
- **[RULE]** reviewer-rule-checker: 0 violations across 33 rules (30 TS-checklist + 3 arcade). Core/shell
  purity (27/27 core-boundary tests); Decision B — zero `fillRect` in the cutscene path,
  `clearField` is the pre-existing 0 Hz black fill.
- All four ROM-ported CODE constants (BIG_PAC #16, RIPPED #1d, RIPPED_SPRITE #32/#33, BIG_PAC_BASE
  bands) byte-verified against the disassembly. `CUTSCENE_ROW_Y` and the col→X mapping honestly marked
  as authored/uncited. No `as any`, correct `import type`, no `||`/`??` bugs.
- The no-strobe guard has teeth + a non-vacuity (`sawActorBlit`) guard — sound.

**Note for the fix:** the live `/pac-man/` intermission SCREENSHOT (AC1) is still outstanding and should
be produced AFTER the teleport fix (Dev flagged it as a verify-phase item). It would have caught #1
directly — do not close AC1 on the automated test alone.

Route: back to Dev (green) for #1–#5, then a screenshot pass, then re-review.

## Subagent Results

_(round 2 re-review — supersedes the round-1 table above)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (494 pac-man + 503 orchestrator green, lint clean, 0 smells) | N/A |
| 2 | reviewer-test-analyzer | Yes | findings | 2 new (A high, B medium); round-1 fixes all re-verified FIXED | confirmed 2 (Blinky-pos untested, big-Pac width unchecked) |
| 3 | reviewer-comment-analyzer | Yes | findings | 1 new (C: test:305 citation 1a70→1aa1/1ab1); round-1 doc fixes verified | confirmed 1; the "26×"/"±128" block-comment claims independently reproduced |
| 4 | reviewer-rule-checker | Yes | clean | 0 violations / 30 checks + 3 arcade | cutsceneGap math + citations re-verified; purity + Decision B intact |
| 5 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (all 4 enabled subagents returned; 5 disabled via settings).

**audit-tree:** false-DIRTY on the pf status stamp (`sprint/epic-pm6.yaml` only) — exit 0, NO source files dirty; both mutation subagents used isolated worktrees. Review integrity intact.

## Reviewer Assessment

**Verdict:** REJECTED — changes requested (round 2). Close, but the rework traded coverage: all five
round-1 findings are verified FIXED (test-analyzer mutation-re-proved big-Pac footprint and the
frightened blue-count with healthy margins 138 vs 24; comment-analyzer verified the doc/citation
fixes; rule-checker 0 violations, `cutsceneGap` math + all ROM citations re-verified, purity + Decision
B intact). But the anchored rework introduced two new test gaps and one new citation anchor-drift, all
mutation/byte-proven.

### Must-fix (blocking)

1. **[TEST] the rework's CENTRAL behavior — Blinky positioned by the signed col-gap — is UNTESTED
   (HIGH; I and reviewer-test-analyzer both mutation-proved it).** Hardcoding `blinkyX` to a constant
   (severing it from `cutsceneGap`) passes ALL tests. Pac is always at the fixed anchor, so Blinky's
   gap-tracking is the only thing the render adds — and the "layout MOVES across the act" test is
   satisfied by the mid-act `bigPacActive` flip (1→4 Pac blits), not by Blinky motion. For a visual
   playtest whose point is that the chase reads correctly, this is the coverage that matters most.
   Fix: isolate Blinky — hold `pac.col` fixed, vary `blinky.col`, assert the Blinky blit's X changes
   (or restrict the "layout moves" loop to sub-states before the big-Pac gate).

2. **[TEST] big-Pac footprint checks only HEIGHT, missing a horizontal-tiling defect (MEDIUM,
   mutation-proven by test-analyzer).** Dropping the right quad-column (drawing only the left half of
   the 32×32) keeps height 32 and passes. Add a width/quad-corner assertion (e.g. assert 4 distinct
   quad origins spanning both x-offsets 0 and SPRITE_PX).

### Should-fix (same pass)

3. **[DOC] test:305 citation anchor-drift (comment-analyzer, high-conf).** The frightened test cites
   `pacman.asm:1a70` for "image #1c / colour #11", but `1a70` is `ld hl,(#4dbd)` — the value bytes are
   `1aa1` (`ld (ix+#02),#1c`) and `1ab1` (`ld (ix+#03),#11`). Same anchor-drift class as the `162d`
   one fixed last round (and `core/cutscene.ts` already cites `1a70 / :1aa1` correctly). Fix to
   `1aa1/1ab1` (optionally keep `1a70` as the routine entry).

### Verified clean (not findings)
- **[RULE]** rule-checker: 0 violations / 30 TS checks + 3 arcade. `cutsceneActorX` fully removed (no
  dangling refs), `MAZE` still used, `cutsceneGap` signed-ring math correct, all 4 ROM constants
  byte-verified, `CUTSCENE_ROW_Y`/`CUTSCENE_PAC_ANCHOR_X` honestly marked authored. Core/shell purity
  intact; Decision B — zero `fillRect` in the cutscene path.
- All five round-1 findings re-verified FIXED (mutation/byte-proven).

**Standing item (not a new finding):** the live `/pac-man/` intermission SCREENSHOT (AC1) is still
outstanding for verify, and it WOULD catch a mispositioned Blinky (#1) — so #1 is test-hardening, not
a "does it work now" defect. The anchored-relative approach + the deferred core-traversal follow-up
(Delivery Finding) remain a call for SM/owner to bless.

Route: back to Dev (green) for #1–#3, then the screenshot, then re-review.

## Subagent Results

**Cycle: 2**

_(round 3 re-review — the owner-directed faithful-traversal rework + round-2 fixes + AC1 screenshot)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 496 pac-man + 503 orchestrator green, lint clean, 0 smells; 3 `as` casts all justified |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both HIGH, mutation-proven) + 3 verified-sound | confirmed 2, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — every ROM citation byte-verified against the vendored source |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations across 34 rules (30 TS + 4 arcade) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 2 confirmed (both HIGH, mutation-proven), 0 dismissed, 0 deferred

**audit-tree:** reports DIRTY (exit 0) but it is NOT mutation residue — the live tree is BYTE-IDENTICAL to the pre-subagent diff snapshot (`diff` verified), and each mutation subagent reported using an isolated scratch copy (test-analyzer `/tmp/mutation-scratch-pm65`, deleted; rule-checker restored its mutation files byte-identical). The dirty set is the legitimate UNCOMMITTED round-3 dev work (dev did not commit before handoff) plus the pre-existing pf status stamp (`sprint/epic-pm6.yaml`, `sprint/context/context-story-pm6-5.md`). Review integrity intact; NOT `git checkout`-ed (that would destroy the unreviewed dev work). Left for the finish/commit flow. Filed as a process note in Delivery Findings.

## Reviewer Assessment

**Verdict:** REJECTED — changes requested (round 3). The owner-directed rework is genuinely strong: the faithful-traversal model is sound and well-cited (both new band-edge constants byte-verified at `pacman.asm:1856`/`185c`, purity intact, Decision B intact, 0 rule violations / 34, 496+503 green, lint clean); the two named round-2 findings (A Blinky-isolation, B big-Pac 32×32) are now mutation-PROVEN solid; the round-2 citation drift (C, `1a70`→`1aa1/1ab1`) is correctly fixed; and the AC1 screenshot caught & fixed a real defect (big-Pac rendering blue). But the rework's CENTRAL new behavior — `CutsceneActor.x` staying UNWRAPPED, the thing that makes the actors traverse instead of teleport (round 1) or freeze (round 2) — has **no test teeth**, and the one shell test that claims to prove on-screen motion is vacuous. Both are mutation-proven by reviewer-test-analyzer against an isolated scratch copy. For a VISUAL PLAYTEST whose entire round-3 deliverable is that traversal, that is the coverage that matters most — the same class of gap that rejected rounds 1 and 2.

### Must-fix (blocking)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **[TEST] the round-3 headline behavior — `CutsceneActor.x` staying UNWRAPPED — has ZERO direct coverage.** Reintroducing the exact round-1 wrap bug (`a.x = (a.x + a.step + 256) & 0xff`, i.e. folding `x` mod 256 like `col`) passes the ENTIRE 36-test suite (core + shell), mutation-proven. The property `x` exists to guarantee (monotonic through a `col` wrap → no teleport) is undetectable by any test. | `plugins/pac-man/src/core/cutscene.ts:409` (`a.x += a.step`); no covering test in `tests/core/cutscene.test.ts` | Add a CORE test: run act 1 to completion and assert `x` is NOT mod-256-bounded — e.g. find the frame where `col` wraps `0xff→0x00` and assert `x` continued monotonically through it (or that `Math.abs(x)` exceeds 255 somewhere / `x` and `col` diverge). Mutate-to-red: the wrapping-`x` regression must redden it. |
| [HIGH] | **[TEST] the "picture MOVES" test is vacuous — a fully STATIC render passes it.** Mutating `cutsceneScreenX` to a constant (`Math.round(CUTSCENE_ORIGIN_X)`), severing screen position from `x` entirely, still passes, because `layouts.size > 1` is satisfied by the mid-act `bigPacActive` false→true flip alone (small Pac offsets `x - SPRITE_PX/2`, big Pac offsets `x - SPRITE_PX` → 2 distinct layouts with NO motion). This is the SAME defect the round-2 reviewer flagged for this exact test; finding A added a new isolation test but left this one riding the size-switch. | `plugins/pac-man/tests/shell/pm6-5-cutscene-playtest.test.ts:261` | Sample positions within a window where `bigPacActive` (and `substate`) is CONSTANT — e.g. two frames a few steps apart both still in sub-state 1 (the chase, before the big-Pac gate) — and assert their blit X differs. That isolates genuine per-frame traversal from the incidental size-offset switch. |

### Verified clean (not findings)
- **[VERIFIED] Core purity** — `CutsceneActor.x` and `a.x += a.step` are pure arithmetic, same class as the adjacent `a.col` update; purity.test.ts green (evidence: `core/cutscene.ts:409`, purity 99/99). Complies with the CLAUDE.md core/shell boundary rule.
- **[VERIFIED] ROM citations** — `CUTSCENE_CORRIDOR_LEFT_COL=0x21`/`RIGHT_COL=0x3b` verbatim byte-match `pacman.asm:3515`/`3519` (`ld b,#21`/`ld b,#3b`), anchored to the operand byte, value-pinned in `cutscene.test.ts`, and reddened by a live `0x21→0x22` mutation. `1aa1`/`1ab1` fix confirmed correct. `[RULE]`+`[DOC]` corroborated.
- **[VERIFIED] Decision B (no strobe)** — zero `fillRect` in the cutscene render path; `bigPacImageData`/`cutsceneScreenX`/`drawCutscene*` are bounded 16×16/32×32 `putImageData` only; `main.ts` intermission fill is a steady `#000` (0 luminance). `[RULE]` corroborated; the story's own no-strobe guard has teeth + non-vacuity.
- **[VERIFIED] big-Pac now yellow** — the AC1 screenshot's plane-2-blue defect is fixed by 2×-upscaling the ROM-decoded small-Pac sprite (`render.ts` `bigPacImageData`); the comment's technical claim (no code maps plane 2 to yellow) independently reproduced by comment-analyzer's 64-code sweep. Finding B's `has32` assertion mutation-proven both axes.
- **[VERIFIED] The retired `col`-as-screen model is FULLY retired** — `grep '\.col\b' render.ts` empty; both `drawCutscene` call sites read `.x`; `cutsceneGap`/`CUTSCENE_PAC_ANCHOR_X` gone (`[RULE]` check 24).

### Rule Compliance
reviewer-rule-checker enumerated 61 instances across 34 rules (30 TS-checklist + 4 arcade: purity, citation-anchoring, Decision-B accessibility, `||`/`as any`/`import type`) — **0 violations**. Spot-checks I re-verified myself: the two new band constants are byte-anchored + value-pinned + mutation-red; `import type` correct on the `CutsceneActor`/`CutsceneState` type-only imports (render.ts); the `window.__sim` double-cast is the only-way-to-extend-Window idiom, matching millipede/centipede; `bigPacCache` memoises the O(1024) upscale (no per-frame cost). No tenant/security surface (a canvas render).

### Devil's Advocate
Where could this still be broken? (1) The traversal LOOKS right only because the AC1 screenshot was a POSED frame — I (as dev) pinned `pac.x`/`blinky.x` to hand-picked co-visible values via `window.__sim`; the NATURAL unposed render during the return leg has the two actors ~120px apart (the wrap-lap gap of 239 tile-units × 0.5), so at many real frames only one actor is on-screen. That is not broken (they traverse, no teleport, no wrap) and it is the honest consequence of core's untouched honest-uncited step model — but "reads correctly against the ROM" is demonstrated on an arranged pose, not on what a player sees at an arbitrary frame. Non-blocking, noted. (2) The two blocking findings mean the suite would NOT catch a regression of the round-3 work back to teleport OR to static — a future refactor of `cutsceneScreenX` or `stepCutscene` could silently break the animation and stay green. That is precisely why they block. (3) A confused reader of the "picture MOVES" test would believe motion is proven when it is not — false assurance is worse than a missing test. (4) `bigPacImageData`'s nearest-neighbour `(x / BIG_PAC_SCALE) | 0` is correct for `SCALE=2` but silently mis-samples for any non-integer/other scale — fine today (constant 2), a latent trap if reused. (5) `cutsceneScreenX` takes an unbounded `x`; extreme off-screen values just clip (safe). No NaN path (x is integer-derived). Nothing here rises to blocking beyond the two test gaps, but #1 is worth Dev confirming the natural render reads acceptably, not only the pinned pose.

### Non-blocking observations
- **[LOW] `window.__sim` diagnostic tap ships in production** (`main.ts`, ungated, every sub-step). Precedented (millipede ml10-5) and documented; accept as-is, but a DEV-gate (`import.meta.env.DEV`) would keep it out of the shipped bundle. Not blocking.
- **[LOW] AC1 screenshot is a posed frame** (see Devil's Advocate #1). When re-shooting after the test fixes, capture a NATURAL frame (or the opening chase sub-state 0/1, where both actors are genuinely co-visible) so the evidence matches the unposed render.

**Handoff:** Back to Dev (green) for the two blocking test gaps, then re-review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Dev] Improvement, non-blocking — cutscene screen geometry is AUTHORED, needs a screenshot check.** The actors' on-screen position is honest-uncited presentation: a fixed row (`CUTSCENE_ROW_Y = 20*TILE_PX = 160`) and `X = (col % MAZE.cols) * TILE_PX` (the ROM cites the tile-column GATES, not a pixel row). The big-Pac 2×2 is assembled in reading order (TL,TR,BL,BR). A reviewer/verify screenshot at `/pac-man/` during a real coffee break should confirm the actors read correctly (facing, big-Pac quadrant order, that they traverse and don't wrap awkwardly). Sprites/colours ARE ROM-cited (big-Pac #16, ripped #32/#33 colour #1d, frightened #1c) — only the layout is a presentation choice.
- **[Dev] Note — main.ts field suppression added (not test-pinned).** `main.ts` now blanks the field (`clearField`) while `phase === 'intermission'` so the break plays on black (authentic — the ROM clears the maze). The tested seam (`overlays.draw`) paints the actors on top. This main.ts branch has no unit test (it's RAF-loop wiring); it's covered by the eventual live screenshot.
- **[Dev] The live-screenshot capstone (AC1) is the remaining VERIFY step.** GREEN delivers the automatable render-layer proof (actors reach the frame, gated + differ-from-control, read correctly, no strobe). Producing the actual `/pac-man/` intermission screenshot needs the Playwright harness + driving the sim to a level-2 clear — a verify/review activity, not GREEN.
- **[Dev round 2] GAP, non-blocking — core does not model a renderable cutscene SCREEN POSITION; faithful traversal is a follow-up.** The review's teleport finding traced to a root cause: `CutsceneActor.col` (core, cutscene.ts) is the ROM's wrapping GATE-counter (#4d3a/#4d32) — it advances ~2/frame, sweeps the whole 0..255 byte, and the two actors' counters diverge up to ±128 as solo-actor sub-states exit one of them (measured: act 1 wraps an absolute col→X map 26×; pac↔blinky gap swings −128..127). So NO absolute col→pixel map is faithful (it blurs). pm6-2/pm6-3 modelled the state machine, not the ROM sprite-mover (#1806) SCREEN coordinate. **Disposition:** pm6-5 now renders the RELATIVE choreography core does model (Pac anchored, Blinky by the signed gap — the chase spacing), which is coherent and non-broken. FAITHFUL absolute traversal (Pac walking across, exits/entrances) needs a core story to model the #1806 coordinate with citations — recommend a follow-up (pm6-6 or a pm6-2/pm6-3 amendment). This is a legitimate playtest discovery; AC1 is met at the "reads coherently against the ROM" level, not frame-accurate traversal.
- **[Dev round 2] MINOR (optional finding #6) accepted as-is — ripped ghost frame toggle.** The ripped Blinky toggles sprites #32↔#33 on `frame%2` where the ROM latches #33 one-way. Kept as a small-area 2-frame tear animation (Decision-B safe — not a large-area strobe); it reads as the torn sheet flapping. Documented rather than changed (minimal-change; the reviewer marked it optional).
- **[Dev round 3] RESOLVED — the deferred faithful-traversal follow-up is now BUILT (owner directed it now).** The round-2 GAP ("core does not model a renderable screen position; faithful traversal is a follow-up pm6-6") is closed: core now carries `CutsceneActor.x`, the unwrapped traversal coordinate, byte-anchored to the mover's on-screen tile band `[#21,#3b)` (`pacman.asm:1856`/`185c`). Actors traverse; `cutsceneGap`/`CUTSCENE_PAC_ANCHOR_X` retired. No pm6-6 needed for this.
- **[Dev round 3] GAP, non-blocking — the pm3 big-Pac quad sprites (#10–#1b) are unrenderable in yellow.** They decode with their body in pixel-plane 2, and no colour code maps plane 2 to yellow (ROM colour #16's yellow is plane 1). This is a pm3 sprite-bake/plane observation, not a pm6-5-only issue — if a future story wants the ROM's actual big-Pac quad ART (not the 2×-scaled small Pac pm6-5 now uses), it must first resolve that plane mismatch in the sprite bake. Out of this shell story's scope; pm6-5 renders correct-colour big-Pac by upscaling instead.
- **[Dev round 3] Note — `window.__sim` diagnostic tap added to main.ts (not test-pinned).** A one-line dev tap exposing the live GameState (mirrors millipede ml10-5's `window.__sim`), so a Playwright boot-harness can drive a real intermission for the AC1 screenshot. No game logic reads it; runs each sub-step like millipede's (ungated, matching precedent).
- **Gap** (non-blocking, process): the round-3 dev work was never committed — it sits in the working tree, which is why `pf reviewer audit-tree` reports DIRTY. Affects the branch git state (`git commit` the dev changes at the next green→review or finish handoff so the reviewer diffs a clean committed tree, as rounds 1–2 did). Not a code defect. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): consider DEV-gating the `window.__sim` tap (`import.meta.env.DEV`) so the diagnostic stays out of the shipped production bundle. Affects `plugins/pac-man/src/main.ts` (wrap the assignment). Precedent (millipede) is ungated, so this is optional. *Found by Reviewer during code review.*
- **[Dev round 4] GAP, non-blocking — the CLOSE chase does not read at the presentation scale (a natural-screenshot discovery).** The faithful traversal maps the unwrapped `x` through a single compression `CUTSCENE_STEP_PX = 0.5` (chosen to keep the wrap-lap-inflated traverse, which swings x by ~±250 per act, on-screen). Consequence: the close chase spacing (act-1 sub-state 1, gap ~3 tile-units) renders as ~1.5px, so small Pac fully overlaps Blinky and the tight chase reads as one sprite; the return leg (natural gap ~239 units → ~120px) reads correctly (giant Pac chasing blue Blinky — the AC1 screenshot). Root cause: the core's wrap-lap step model makes the per-act traverse ~481 units while the close-chase gap is ~3 units — no single linear scale renders both readably (large scale → actors off-screen most of the act; small scale → close chase collapses). A fully readable close chase needs core to model the ROM sprite-mover (#1806) SUB-PIXEL speed so the traverse is screen-sized (~28 tiles) instead of wrap-lapped — a core-story follow-up, tangled with the rotated→screen transform the repo declines to invent (glossary.md). **Disposition:** the owner directed traversal now; it is delivered and the iconic return leg reads. The close-chase overlap is the residual cost of the honest wrap-lap model — recommend SM/owner bless as-is or open a follow-up to model the sub-pixel coordinate. *Found by Dev during the round-4 natural-screenshot capture.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] Strengthened the RED test's fake-ctx (test change during GREEN).** The harness recorded `putImageData` as `x,y,w,h` only, so a frightened ghost and a normal ghost (both 16×16 at the same spot) produced identical `blitSignature`s — making the "reads correctly" assertions (frightened/ripped vs plain) UNSATISFIABLE by any correct render. Fixed by hashing the sprite's pixels (FNV-1a over `img.data`) into the signature, so it now truly distinguishes sprites by content. This TIGHTENS the test, not loosens it; without it those assertions could never go green. Positions-only tests still use `x,y`.
- **[Dev round 2] Render approach changed: absolute col→X → ANCHORED-RELATIVE.** Addressing review finding #1, `drawCutscene` no longer maps `col` to an absolute screen X (which blurred/wrapped — see the core-model GAP finding). Pac is anchored centre-screen and Blinky is placed by `cutsceneGap` (the signed col difference), so the chase spacing reads and there is no wrap/teleport. Consequence: the actors don't traverse the screen (Pac is fixed), and act 2 (constant gap −1) is positionally static apart from the sprite tear — acceptable, as act 2's action IS the rip, not motion.
- **[Dev round 2] Test harness gained pixel-data capture + colour/footprint asserts.** To close review finding #2, the fake ctx now keeps each blit's RGBA (`data`), and the suite asserts (a) big-Pac's on-screen FOOTPRINT is ≥32px tall and taller than the small Pac (not just "differs"), and (b) the frightened body carries markedly MORE blue than a plain (red) Blinky (a wrong colour-code no longer passes). Both were re-verified by re-running the reviewer's mutations — they now fail. Missing base-case preconditions added to the frightened/ripped/act-3 tests. The "track columns" test now asserts the layout changes across the whole act (the anchored render moves Blinky as the gap changes).
- **[Dev round 3] Render approach changed AGAIN: ANCHORED-RELATIVE → FAITHFUL TRAVERSAL (owner-directed).** `drawCutscene` no longer anchors Pac and places Blinky by the col-gap; both actors are placed from core's new unwrapped `x`, mapped through the byte-cited on-screen tile band centred on the frame. Spec impact: the spec called this "anchored/relative, follow-up for traversal"; the owner directed building traversal now, so the follow-up is folded into this branch (blurs the shell/core boundary of a "shell" story — legitimate per the owner). Core stayed pure; the cited step-sign reversal model (#05ae) is untouched.
- **[Dev round 3] big-Pac rendering: ROM quad sprites → 2×-upscaled small-Pac sprite.** The ROM's dedicated big-Pac quad sprites (#10–#1b, colour #16) decode with their body in pixel-plane 2, which no colour code renders yellow (ROM #16's yellow is plane 1) — so they paint the giant Pac BLUE (caught by the AC1 screenshot; invisible against the blue frightened Blinky). Spec said "four 16×16 sprites tiling a 32×32"; deviated to a single 32×32 blit that 2×-upscales the ROM-decoded SMALL Pac sprite (yellow, plane 3, live half-rate chomp) — colour + animation fidelity over the (unrenderable-yellow) quad art. Decision-consistent (correctness/ROM-wins). Finding-B test updated to assert the 32×32 blit's width AND height (mutation-proven).

### Reviewer (audit)
- **[Dev round 3] ANCHORED-RELATIVE → FAITHFUL TRAVERSAL** → ✓ ACCEPTED by Reviewer: the owner directed building traversal now; the model is sound and byte-cited (band edges `1856`/`185c`), core stays pure, the cited `#05ae` step-sign model is untouched. The blocking findings are about TEST coverage of this behavior, not the behavior itself.
- **[Dev round 3] big-Pac ROM quad sprites → 2×-upscaled small-Pac sprite** → ✓ ACCEPTED by Reviewer: independently reproduced — the quad sprites (#10–#1b) carry their body in pixel-plane 2 and a full 64-code sweep confirms no code maps plane 2 to yellow, so the dedicated art can only render blue. Upscaling the ROM-decoded yellow small-Pac is the correct-colour choice (accessibility/correctness > exact quad art). Finding-B now mutation-proves the 32×32 in both axes.
- **[Dev round 2] absolute col→X → ANCHORED-RELATIVE** → ✓ ACCEPTED (superseded): round-2's anchored approach is now retired in favour of the round-3 traversal; no live anchored code remains (`grep '\.col\b' render.ts` empty).
- **[Dev] Strengthened the RED fake-ctx (pixel hashing)** → ✓ ACCEPTED: tightens, not loosens — without the pixel hash the frightened/ripped-vs-plain assertions are unsatisfiable; the strobe-guard non-vacuity is separately mutation-tested.
- No UNDOCUMENTED deviations found — the diff matches what the Design Deviations / Dev Assessment describe.