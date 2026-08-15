---
story_id: "ml9-1"
jira_key: "ml9-1"
epic: "ml9"
workflow: "tdd"
---
# Story ml9-1: Attract-mode enemy-showcase screen is missing (the 'cast of characters' + high-scores + 1 COIN 1 PLAY screen)

## Story Details
- **ID:** ml9-1
- **Jira Key:** ml9-1
- **Repos:** arcade
- **Branch:** feat/ml9-1-attract-showcase-screen
- **PR:** 415
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T13:24:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T12:23:32.840696Z | 2026-08-15T12:26:43Z | 3m 10s |
| red | 2026-08-15T12:26:43Z | 2026-08-15T12:53:33Z | 26m 50s |
| green | 2026-08-15T12:53:33Z | 2026-08-15T13:08:52Z | 15m 19s |
| review | 2026-08-15T13:08:52Z | 2026-08-15T13:24:13Z | 15m 21s |
| finish | 2026-08-15T13:24:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Gap (non-blocking, for Dev):** the footer strings ("1 COIN 1 PLAY" / "BONUS EVERY 15000" / "COPYRIGHT ATARI 1982") are NOT a plain `.ASCII` table in the vendored `.MAC` files — they are emitted by the message/coin routines (MESS/MESSAG; COIN65.MAC is the coin routine). The RED test pins their TEXT via the ROM charset (space=00, A-Z=01-1A, digits=20-29) with the reference screenshot as ground truth, but NOT the exact ROM screen positions. Dev derives positions to match `attract-mame-reference.png`; if a byte-exact ROM footer source is wanted, locate the message table before pinning coords.
- **Gap (non-blocking, for Dev):** the exact ROM blue BKGND byte for the showcase was not located; the RED test asserts `SHOWCASE_BACKGROUND` decodes blue-dominant. Pin the ROM value if found (attract sets BKGND before drawing; MLATR uses `GREYSC`/`BKGND` writes).
- **Improvement (non-blocking):** MLATR.MAC:601's `.ASCII /  GROWTHS  /` COMMENT disagrees with its BYTES (which decode to GROWTH, matching the screenshot). A dedicated RED test bans the "GROWTHS" spelling so a Dev copying the comment reddens. Trust the bytes fleet-wide.
- **Gap (non-blocking, FOLLOW-UP for SM to file):** the showcase text renders GREEN, where MAME shows WHITE scores / RED creature labels (`attract-mame-reference.png`). This is the SAME palette issue as ml9-2 (in-game score/text is green too — image #12): millipede's alphanumeric glyph ink maps to palette index 2 = green via `drawGridStamps`' default `flatPalette`. Recolouring needs per-section palettes (white vs red) and a decision on cell backgrounds (black boxes vs blue show-through), which is exactly the cross-cutting colour-fidelity work of ml9-2. Recommend folding "attract-showcase text colours" into the ml9-2 colour story (or a new ml9-3) rather than this screen. ml9-1 ships the screen PRESENT with correct structure/content/blue-bg (the actual "missing screen" bug); colour is the refinement.
- **Resolved (was TEA Gap):** the blue background byte IS in ROM — BKGND #0F8 (MLATR.MAC:604-605, GREYSC); `decodeColourByte(0xF8)` = pure blue. `SHOWCASE_BACKGROUND` cites it.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations.

## SM Assessment

**Setup complete — routing to TEA (red phase).**

Story ml9-1 is the first seed of new epic ml9 (millipede playthrough visual-fidelity findings, owner-observed). Setup artifacts verified on disk: session file present with Repos/Workflow set, context at `sprint/context/context-story-ml9-1.md` (description + all 3 ACs copied verbatim from the epic YAML), branch `feat/ml9-1-attract-showcase-screen` created and pushed, story stamped `in_progress`.

**Pre-setup measurement (2026-08-15, SM).** The story premise was verified against the current tree before setup, and my original filing framing was corrected as a result:
- The ROM attract-mode **enemy-showcase screen** (reference `sprint/planning/ml9-playthrough-refs/attract-mame-reference.png`) has **no render path** — grep found no creature-name panels, no COIN/COPYRIGHT text anywhere in `plugins/millipede/src`. This is a **new screen build, not a wiring fix**.
- It must not be conflated with two surfaces that already exist: `core/attract.ts` (self-playing silent demo / lobby carousel) and `hud.ts` (in-game HUD). My initial "likely just a wiring gap" wording was wrong and has been rewritten in the story description.
- Build can reuse `shell/gfx-rom.ts` decoders, font/charTile stamps in `shell/render.ts`, and the highscore table data.

**Sibling probes clean:** no `ml9` branch on origin; siblings a-2 (ml8-4) and a-3 (df2-4) touch different files (`conway.ts`, defender). No contention.

**For TEA (Tyr One-Handed):** open the ROM/MAME source for the showcase layout, colours and label text before pinning (rom-source-study / rom-fidelity-audit apply) — AC2 requires citations, not eyeballing. The reference PNG is ground truth for the visual outcome. Seams: `shell/render.ts` (new draw path) and possibly a new attract-showcase phase in core if the screen must cycle with the demo.
## TEA Assessment

**RED complete — 9 failing tests, routing to Dev (green phase).**

Test file: `plugins/millipede/tests/attract-showcase.test.ts`. Verified RED:
`npx vitest run --project millipede` → **9 failed | 1268 passed** (the 9 are all
mine; no collateral reddening, no census/file-count guard tripped).

**What the RED pins (grounded in the real implementation, not theory):**
- The current `main.ts` `render()` draws ONE screen for every phase — it never
  reads `state.phase`. The showcase screen has no code. `core/attract.ts` (the
  self-playing silent demo) and `core/hud.ts` (in-game HUD) are DIFFERENT surfaces
  and must not be confused with this.
- Cast labels: the ROM `80$` table (MLATR.MAC:580-601), decoded from BYTES — DDT
  BOMB, INCHWORM, EARWIG, DRAGONFLY, MILLIPEDE, SPIDER, BEETLE, BEE, MOSQUITO,
  GROWTH (comment typo "GROWTHS" explicitly banned).
- HIGH SCORES table: `DEFAULT_HIGH_SCORES` (top row {BBM, 89175} == screenshot).
- Footer: the three screenshot lines via the ROM charset.
- Blue background (`SHOWCASE_BACKGROUND`, blue-dominant).
- Wiring floor: comment-stripped `main.ts` must branch `phase === 'attract'` and
  route `showcasePlacements(...)` through `drawGridStamps`.

**Test altitude (deliberate):** tests pin ROM CONTENT (which labels/text appear,
read left-to-right per row) via a coordinate-agnostic row-decoder — NOT the pixel
layout. Exact positions are Dev's to derive and are proven at the VISUAL playtest
(playbook §4) against `sprint/planning/ml9-playthrough-refs/attract-mame-reference.png`.
A green vitest is NOT acceptance here — the screenshot is.

**For Dev (Loki Silvertongue) — the seam (mirror `core/hud.ts`):**
- New pure `src/core/attract-showcase.ts`: `showcasePlacements(highScores)` →
  `{col,row,stamp}[]` (stamp = ROM char code, routed by `charTile`) + a
  `SHOWCASE_BACKGROUND` colour byte. Purity sweep covers new `core/` files.
- `src/main.ts` `render()`: branch on `state.phase === 'attract'` → paint
  `SHOWCASE_BACKGROUND`, draw `showcasePlacements(DEFAULT_HIGH_SCORES)` via the
  existing `drawGridStamps`. Leave the play/death/etc. path untouched (AC3: no HUD
  or demo regression).
- Char code == existing vocabulary: `charTile(0x01)=0x41` ('A'), digits base 0x20.
  No new decoder needed — reuse `drawGridStamps`.
- See the three Delivery Findings above (footer positions, blue byte, GROWTH).

**Rule Coverage:** no `.pennyfarthing/gates/lang-review/typescript.md` rule adds
constructor/newtype/tenant obligations to this pure-data + render-wiring change;
the project's operative rule is core/shell purity (enforced by the existing
`tests/purity.test.ts` sweep, which will cover the new `core/attract-showcase.ts`
automatically) and ROM-citation fidelity (covered: cast pinned to MLATR.MAC:580-601;
comment-vs-byte trap guarded). Every test asserts a concrete computed value — no
vacuous assertions (self-checked: no `let _ =`, no `assert(true)`, no always-None).
## Dev Assessment

**GREEN complete — all 9 tests pass, visual playtest confirms the screen. Routing to verify (TEA).**

**Shipped:**
- `src/core/attract-showcase.ts` (new, pure): `showcasePlacements(highScores)` → grid
  placements for the cast labels (MLATR.MAC:580-601, byte-decoded → GROWTH not the
  comment's GROWTHS), the HIGH SCORES table, and the coin/bonus/copyright footer, all
  as ROM char-code stamps. `SHOWCASE_BACKGROUND = 0xF8` (MLATR.MAC:604-605, GREYSC →
  pure blue through the active-low palette).
- `src/main.ts` `render()`: branches on `state.phase === 'attract'` and cycles the
  demo (shown first — keeps the lobby pane alive, and satisfies the ml7-6 player-sprite
  test which renders attract frame 0) with the showcase (last 300 of each 720-frame
  cycle), routing placements through the existing `drawGridStamps`.

**Verification:**
- `npx vitest run --project millipede` → **1278 passed** (was 9-failing RED; the new 9 green,
  no collateral).
- `npm run test:orchestrator` → **498 passed**.
- `npm run lint` (tsc --noEmit repo-wide) → clean.
- **VISUAL PLAYTEST (playbook §4, mandatory):** served this checkout at 127.0.0.1:5270
  (confirmed own-checkout ownership), drove attract past the cycle with Playwright, and
  captured the showcase — recorded at `sprint/planning/ml9-playthrough-refs/ml9-1-ours-showcase.png`.
  Layout + content match the reference: blue bg, HIGH SCORES + all 8 rows (89175 BBM …
  41916 DFW), all 10 creature labels positioned like MAME, and the full footer.

**Regression caught + fixed mid-GREEN:** the first draft showed the showcase at attract
frame 0, which hid the player gun and reddened `tests/player-sprite.test.ts` (it renders
attract frame 0). Flipping the cycle to demo-first (the correct ROM order anyway) restored
it — the demo shows on boot, the showcase later.

**Known gap routed (see Delivery Findings):** text renders green vs MAME's white/red — the
same cross-cutting palette issue as ml9-2. The screen is now PRESENT with correct
structure/content/bg (the "missing screen" bug is fixed); colour fidelity is folded into
the ml9-2/colour follow-up, NOT this story.

**Minimalist note:** reused `drawGridStamps` + `charTile` wholesale (no new decoder); the
only new geometry is the hand-laid label layout, which is a visual-playtest artifact by
design (tests pin ROM CONTENT, not pixels).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — vitest 1278, orchestrator 498, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer own pass |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer own pass |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 3 (BEE/ED/rowTexts root cause) + 2 medium (all-scores, co-location) → FIXED; 2 low noted |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed low (charset citation scope) → FIXED |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by Reviewer own pass |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — n/a (pure render, no I/O/auth) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer own pass |
| 9 | reviewer-rule-checker | Yes | findings | 2 (+1 info) | confirmed 2 medium (#15/#25 wiring bind, #18 arg-threading) → FIXED; 1 info (encodeChar rAF) → routed |

**All received:** Yes (4 enabled returned, 3 with findings; 5 disabled via settings, non-blocking)
**Total findings:** 8 confirmed → 6 FIXED this round (mutation-re-verified), 2 routed non-blocking; 2 low noted

## Reviewer Assessment

**Verdict:** APPROVED

**Round 1 found real test-quality defects; round 2 fixed and re-verified them.** The production
code (`attract-showcase.ts`, `main.ts`) was clean from the first pass — purity holds, ROM
citations are accurate, no type/security issues — but the RED test suite carried
mutation-proven vacuous assertions. Those are now closed:

- `[TEST]` BEE⊂BEETLE and ED⊂MILLIPEDE substring bleed (unfailable) → switched to WHOLE-FIELD
  (contiguous-run) token matching. Re-verified: deleting the BEE cast entry now reddens
  (M1 → 1 failed).
- `[RULE]` (#18) `showcasePlacements` argument never threaded (all tests used DEFAULT) → added a
  disjoint-fixture test asserting the arg renders and defaults don't leak. Re-verified: a mutant
  that hardcodes DEFAULT now reddens (M2 → 1 failed).
- `[RULE]` (#15/#25) wiring grep unbound (showcase could be computed then discarded) → bound
  regex requires `showcasePlacements(` as an argument to `drawGridStamps(`. Re-verified: a
  discard-then-HUD-draw mutant now reddens (M3 → 1 failed).
- `[TEST]` only top score pinned; no co-location → all 8 scores asserted + score/initials must
  share a row. `[TEST]` weak background → pinned `0xF8` and exact `{0,0,255}`. `[DOC]` charset
  citation split (hud.ts documents only digits).

**Observations (≥5):**
- `[VERIFIED]` core/shell purity — `core/attract-showcase.ts` imports are `import type` only
  (`./hud`, `./highscore`); no clock/DOM/Math.random. Confirmed by rule-checker's live
  purity-suite run and my read. Complies with the CLAUDE.md core-boundary rule.
- `[VERIFIED]` ROM citations — MLATR.MAC:580-601 (cast), 604-605 (`0xF8` GREYSC → pure blue),
  and the GROWTH byte-decode were independently re-verified by comment-analyzer AND rule-checker.
- `[VERIFIED]` no-regression (AC3) — the render cycle is demo-FIRST, so attract frame 0 renders
  the self-playing demo; `tests/player-sprite.test.ts` stays green and the lobby pane stays alive.
- `[VERIFIED]` visual playtest (playbook §4) — served this checkout, drove attract into the
  showcase window, captured `sprint/planning/ml9-playthrough-refs/ml9-1-ours-showcase.png`:
  blue bg, HIGH SCORES + all 8 rows, all 10 labels, full footer — matches the reference LAYOUT.
- `[MEDIUM → routed, non-blocking]` text renders green where MAME shows white scores / red
  labels — the SAME palette issue as ml9-2 (in-game text is green too). Cross-cutting; routed.
- `[INFO → routed]` `encodeChar` throws inside the rAF callback; unreachable today (all inputs
  ROM-safe / A-Z from name-entry), fail-loud is intentional. Routed for if the blast radius grows.

### Rule Compliance
- **Core/shell purity (CLAUDE.md):** COMPLIANT — new core file is pure (verified, live purity run).
- **ROM-citation fidelity:** COMPLIANT — cast/background cited + byte-re-verified; footer honestly
  labelled "screenshot" (no false ROM address). Charset citation corrected to scope.
- **TypeScript lang-review checks 1-30:** rule-checker found only #15/#18/#25 (all in the test
  file, all MEDIUM) — all FIXED and re-verified. Production code clean on all 30.

### Devil's Advocate
Argue it's broken: (1) The showcase only renders for 300 of every 720 frames — a timing window a
player or a liveness probe could miss entirely, and NO automated test proves the render branch is
ever actually entered (the wiring test only greps source). If the condition were inverted, vitest
would stay green. (2) `encodeChar` throws synchronously inside `requestAnimationFrame`; a future
caller feeding a persisted score table with a stray lowercase or symbol would throw, the
`requestAnimationFrame(frame)` reschedule would never run, and the whole game would silently
freeze — a hard hang, not a visible error. (3) `showcasePlacements` assumes ≤8 high-score
entries; a 9th/10th would land on rows 21/20 and collide with EARWIG/BEETLE, garbling the screen.
(4) The colour is wrong — green, not MAME's white/red — so on a fidelity-audit playthrough this
"fixes" the missing screen while still looking wrong. (5) The cycle magic numbers (720/300) are
invented, not ROM-derived, so the attract cadence is not faithful. (6) The "visual playtest" was
Playwright, not the owner's eyes on the real cabinet.

Resolution: (1) is the documented routing≠geometry boundary — I mitigated it by actually driving
the render into the showcase window and capturing pixels, and demo-first ordering is pinned by the
player-sprite test. (2)/(3) are real but UNREACHABLE with the sole caller (`DEFAULT_HIGH_SCORES`,
8 uppercase entries); both are routed as non-blocking findings. (4) is the routed ml9-2-class
colour follow-up — out of scope for "the screen is missing." (5) matches the existing
attract.ts precedent (demo cadence is dressing, not a ROM constant) and is commented as such.
(6) the owner's visual confirmation is the finish-time acceptance; the Playwright capture is
evidence, not a substitute. None rises to Critical/High.

**Data flow traced:** `DEFAULT_HIGH_SCORES` + ROM cast table → `showcasePlacements()` (pure grid
placements, char codes) → `drawGridStamps` + `charTile` → logical canvas, gated by
`state.phase === 'attract'` and the cycle window. Safe: pure function, no I/O, no untrusted input.

**Handoff:** To SM for finish-story.

### Reviewer (audit) — Design Deviations
The session logged "No design deviations," but three effective deviations were recorded in
Delivery Findings / the Dev Assessment instead. Documenting them here so none slips:
- **Text colour green vs ROM white/red** → ✓ ACCEPTED (routed to the ml9-2/colour follow-up;
  cross-cutting, out of scope for the missing-screen bug).
- **Hand-laid coordinates vs ROM 80$ header positions** → ✓ ACCEPTED (TEA sanctioned: tests pin
  ROM CONTENT, layout is the visual-playtest boundary; the capture matches the reference).
- **Attract cycles demo↔showcase (invented 720/300 cadence)** → ✓ ACCEPTED (AC3 explicitly
  permits "cycles with … the existing silent demo"; cadence is dressing per the attract.ts precedent).

### Reviewer (code review)
- **Improvement** (non-blocking): attract-showcase text renders GREEN vs MAME's WHITE scores / RED creature labels. Affects the ml9-2/colour-fidelity story (same palette issue as in-game green text). *Found by Reviewer during code review — file as/into ml9-2 or ml9-3.*
- **Gap** (non-blocking): `showcasePlacements` throws (`encodeChar` RangeError) inside the rAF render loop for any non-`[A-Z0-9 ]` input, which would freeze the game; unreachable today (sole caller passes `DEFAULT_HIGH_SCORES`). Affects `plugins/millipede/src/core/attract-showcase.ts` (guard or skip unknown chars if the caller ever becomes a live/persisted score table). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the showcase layout assumes ≤8 high-score entries; a 9th+ collides with creature rows. Affects `plugins/millipede/src/core/attract-showcase.ts`. *Found by Reviewer during code review.*