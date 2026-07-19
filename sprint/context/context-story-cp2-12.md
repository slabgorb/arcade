# Story cp2-12 Context

## Title
HUD above the playfield — score/high-score in the reserved top rows, not inside the field

## Metadata
- **Story ID:** cp2-12
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** centipede
- **Epic:** Centipede — the train (MOTION/OBSTAC/NEWHD/EXPLOD, poisoned dives, death + RESTOR) + cp1 escape fixes

## Problem
USER-REPORTED (2026-07-19, live play + reference screenshot of the real cabinet): the score belongs ABOVE the gamefield, not within it. ROM ANCHORS (verified 2026-07-19): the ENTIRE HUD lives on the single top row v=0x1F (addr&0x1F==0x1F, PM-1 geometry; the row MUSHER refuses per PM-27, CENTI4.MAC:1622 'CMP I,1F ;TOP ROW') — NOT rows {0,1}, which are the bottom/player zone (PM-12/PM-28). Layout on v=0x1F, upright (all CK* mirror vars zeroed, CENTI4.MAC:742-751): P1 score 6 digits at 0x041F h0-5 (UPSCRE, CENTI4.MAC:2632-2645); P1 LIVES AS SHIP/GUN ICONS at 0x04DF h6-11 (DLIVES, :920-932 — 'LDA I,1F ;PICTURE OF SHIP'); high score at 0x059F h12-17 (:2663-2676); P2 lives at 0x065F h18-23 (:939-944); game-time/P2-score at 0x071F h24-29 (:2649-2658, colon 0x2E at :2658). Digit/glyph writers advance +0x20/char (CHAR, CENIR4.MAC:212). USER CONFIRMED 2026-07-19: lives-as-gun-icons is REQUIRED scope, not optional — and the ROM mandates it anyway (DLIVES draws ship pictures, never digits). Move the shell HUD to v=0x1F per these addresses; playfield rendering unchanged. New claims for the routine addresses (net-new — PM-1/PM-27 cover only geometry/reservation). Pairs with cp2-11 (same files).

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

**Current HUD drawing code** (`centipede/src/shell/render.ts`, post-cp2-11 —
the LEVEL-label deletion, `f94d1c0`): the ONLY HUD draw left is the last line
of `render()` (currently line 99):
```
drawText(ctx, atlas, `SCORE ${state.score}`, TILE_W, 0)
```
- Score IS already the only HUD element drawn, and its `y=0` already lands on
  screen row v=0x1F in our coordinate system (`cellScreenY(31) === LOGICAL_H -
  32*TILE_H === 0`, since `PLYFLD_HEIGHT=32` — the ROM's `v=0x1F` top row is
  the last row of our existing 32-row `cells` grid, not a row ABOVE it. There
  is no extra "reserved band" outside `LOGICAL_H` today — the story's "above
  the playfield" is about the ROM's v=0x1F row within the existing grid, not a
  literal new canvas region). So AC-1's "no HUD glyph overlaps the playable
  field" is really about PM-27 (MUSHER already refuses mushrooms on v=0x1F,
  cited in `09-centipede-train.json:634-643`) — worth a scan of
  `src/core/playfield.ts` (the mushroom-placement/reservation guards) to
  confirm the row-31 exclusion holds at RUNTIME (every place a mushroom can
  be placed, not just initial seeding).
- **Gaps to close (nothing else currently draws):**
  - **No "high score" at all.** `SimState` (`src/core/sim.ts`) has no
    `highScore` field — only `score`. `render(ctx, atlas, state)`'s signature
    only takes `SimState`, so a high-score value has nowhere to come from
    unless (a) a `highScore` field is added to `SimState` (deterministic,
    testable in core, but persistence-across-sessions would then need a shell
    concern to seed it), or (b) it's threaded in as a separate render
    parameter from shell-level storage (mirrors DLIVES's per-player HUD but
    keeps score-tracking pure). Flag this as the one open design question for
    TEA/Dev to resolve — it's not just a draw-position fix, it may need a new
    state field or a widened `render()` signature.
  - **No lives icons.** DLIVES draws SHIP/GUN pictures, never digits — the
    story is explicit this is required scope. The `GUN` stamp already exists
    (`src/core/pictures.ts:317`, used for the player sprite) and is a natural
    candidate to reuse for the life-count icons (same "picture of ship" the
    ROM cites), N times for `state.lives`, at h6-11 (6 columns — matches up
    to ~6 lives before DLIVES's own column budget runs out; ROM behavior at
    higher counts would need a citation check, e.g. digit fallback).
  - **The "SCORE " text-label prefix is un-cited.** `` `SCORE ${state.score}` ``
    draws the literal word "SCORE" before the digits. UPSCRE
    (CENTI4.MAC:2632-2645) draws 6 raw score DIGITS at h0-5 — no ROM anchor
    quarried yet for a text label at that position, and the MESG message
    table (quarried under cp2-11, CENIR4.MAC:67-110) has no plain "SCORE"
    entry. TEA should check the UPSCRE routine itself for a label call before
    assuming the current "SCORE " prefix survives — it may need to be dropped
    to bare digits (h0-5, 6 digits, zero-padded?) to match the story's
    "per UPSCRE address" requirement.
- **Layout constants** (`src/shell/layout.ts` + `src/core/pictures.ts`):
  `TILE_W=TILE_H=8` (`pictures.ts:45-46`); `LOGICAL_W = PLYFLD_WIDTH(30) *
  TILE_W`, `LOGICAL_H = PLYFLD_HEIGHT(32) * TILE_H = 256`. `cellScreenX(h)` /
  `cellScreenY(v)` already do the ROT270 mirror (`layout.ts:49-57`) — for the
  HUD row, `cellScreenY(31) === 0` and `cellScreenX(h)` gives the h-th
  column's screen-x with the same right-to-left reversal used for the
  playfield. The story's `h0-5` / `h6-11` / `h12-17` column ranges should
  very likely be placed via `cellScreenX(h)` (not a raw pixel offset like the
  current `TILE_W, 0`) so the reversed-h convention stays consistent with the
  rest of the renderer (sign-chain rule, `layout.ts:9-13`) — confirm which
  screen edge h=0 lands on before wiring digit order (UPSCRE's digit order
  vs. our h-reversal may need the digit array reversed to display correctly
  left-to-right on screen).
- **Existing tests that pin HUD text**
  (`centipede/tests/render.test.ts`): the `cp2-11` describe block
  (lines 154-205) established the idiom this story's tests should extend —
  `drawnHudText()` reconstructs blitted HUD text from the atlas request log
  (`CHAR_x` → `x`, `DIGIT_n` → `n`, sprite/mushroom stamps skipped), driven
  across an `it.each` state matrix (attract / mid-play / death / game-over).
  cp2-12's tests will need to (a) extend/parallel that reconstruction to also
  recognize lives-icon blits (currently filtered out as "sprite stamps
  skipped" — a `GUN`-stamp count assertion is a separate check from the text
  reconstruction), (b) add a row-position assertion (HUD blits happen at
  `cellScreenY(31)`/y=0, mushroom blits never do), and (c) a PM-27-style
  negative pin that mushroom-legal rows exclude v=0x1F at runtime.
- **ROM anchors — verbatim from the story description** (do not re-derive,
  quote as-is): v=0x1F is the single HUD row (`addr&0x1F==0x1F`, PM-1
  geometry; MUSHER refuses it per PM-27, CENTI4.MAC:1622 `CMP I,1F ;TOP ROW`)
  — NOT rows {0,1} (bottom/player zone, PM-12/PM-28). Upright layout (all CK*
  mirror vars zeroed, CENTI4.MAC:742-751): P1 score 6 digits at `0x041F`
  h0-5 (UPSCRE, CENTI4.MAC:2632-2645); P1 lives as ship/gun icons at `0x04DF`
  h6-11 (DLIVES, :920-932 — `LDA I,1F ;PICTURE OF SHIP`); high score at
  `0x059F` h12-17 (:2663-2676); P2 lives at `0x065F` h18-23 (:939-944);
  game-time/P2-score at `0x071F` h24-29 (:2649-2658, colon `0x2E` at :2658).
  Digit/glyph writers advance `+0x20`/char (CHAR, CENIR4.MAC:212). PM-1/PM-27
  are existing, already-cited claims (`docs/rom-study/claims/
  06-playfield-mushrooms.json`); the UPSCRE/DLIVES routine addresses are
  **net-new** claims — file them (likely in `08-render-color.json`, the
  render/HUD claims file cp2-11 also used for CL-12) against the vendored
  `reference/atari-source/centipede/revision.v4/` tree before RED, per the
  project's citation-gate convention.
- **AC-3 screenshot caveat:** the committed screenshot MUST come from THIS
  checkout (`/Users/slabgorb/Projects/a-1/centipede`) — port 5278 is a pinned
  dev port shared by every sibling checkout (`a-1`, `a-2`, `a-3`, …), so
  whichever process bound it first answers the request, and it may not be
  this tree. Before screenshotting: verify no rival server already owns 5278
  for a DIFFERENT checkout (`lsof -ti tcp:5278 | xargs -I{} lsof -a -p {} -d
  cwd -Fn | grep '^n'`, confirm the printed cwd is under
  `/Users/slabgorb/Projects/a-1`), and if it's already bound elsewhere, serve
  this tree on a spare port instead of killing the other checkout's server.
  Playwright MCP is available for the capture; the Chrome DevTools extension
  is often disconnected in this environment, so prefer Playwright.

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- P1 score (h0-5), high score (h12-17), and P1 lives as gun icons (h6-11, USER-REQUIRED) render on the v=0x1F HUD row per UPSCRE/DLIVES addresses, cited; no HUD glyph ever overlaps the playable field.
- The reserved-row invariant is pinned: a test asserts the HUD row is exactly v=0x1F and mushroom-legal rows exclude it (PM-27); lives icons decrease/increase with the life count.
- Screenshot from THIS checkout committed showing the arcade-matching layout; suite + citations + build green.

---
_Generated by `pf context create story cp2-12` from the sprint YAML._
