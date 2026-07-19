---
story_id: "cp2-12"
jira_key: "cp2-12"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-12: HUD above the playfield — score/high-score in the reserved top rows, not inside the field

## Story Details
- **ID:** cp2-12
- **Jira Key:** cp2-12
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** centipede

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T21:02:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T18:36:36Z | 2026-07-19T18:37:15Z | 39s |
| red | 2026-07-19T18:37:15Z | 2026-07-19T18:56:49Z | 19m 34s |
| green | 2026-07-19T18:56:49Z | 2026-07-19T19:06:51Z | 10m 2s |
| review | 2026-07-19T19:06:51Z | 2026-07-19T21:02:44Z | 1h 55m |
| finish | 2026-07-19T21:02:44Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): AC-2's "mushroom-legal rows exclude v=0x1F (PM-27)" is ALREADY satisfied and tested in core — the runtime MUSHER guard `MUSHER_RESERVED_ROWS = {0,1,0x1f}` (centipede.ts:242, CT-46) refuses the top row, `tests/shoot-train.test.ts:308` pins that behaviorally, and `tests/playfield.test.ts:277` pins that seeding skips v=0x1F. So Dev needs NO new core work for AC-2's exclusion; I added only a render-side manifestation pin (no mushroom blits on the HUD row). *Found by TEA during test design.*
- **Improvement** (non-blocking): the story/context paraphrase of PM-27 quotes `CENTI4.MAC:1622 'CMP I,1F ;TOP ROW'`, but line 1622 is bare `\tCMP I,1F` — the `;DON'T PUT UP MUSHROOM IF ON TOP ROW` comment is on line 1623. The existing PM-27 claim already cites this correctly (source 1622, corroboration 1623), so no citation change was needed; noting so nobody "fixes" a claim that is already right. *Found by TEA during test design.*
- **Question** (non-blocking): DLIVES draws exactly six columns (TEMP1=6), a ship for each remaining life and a BLANK for each spent one; the clone's natural shape is to draw exactly `min(lives,6)` gun icons (no blank tiles). If a bonus life ever pushes `lives` past 6, DLIVES still shows only 6 — the tests pin the cap at 6. If Reviewer wants the blank-column fidelity too, that is a follow-up, not this story. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): `main.ts` only READS the persisted high-score table (`highScoreStorage.load()[0]?.score ?? 0`) to source `render()`'s 4th parameter — it never WRITES a new high score back on game-over, since no initials-entry flow exists yet in this clone (ROM's rev-4 MESS5 'ENTER YOUR INITIALS' is unimplemented). The HUD's high-score field is therefore frozen at whatever was already in the `centipede` localStorage table for the session — it can never grow via play yet. Affects `src/main.ts` (needs an `insertHighScore`+`save` call, gated on `qualifiesForHighScore`, on a game-over transition) — natural follow-up for whichever future story adds game-over/initials-entry UI. *Found by Dev during implementation.*
- **Improvement** (non-blocking): confirms TEA's DLIVES Question above by observation — the clone's `min(lives,6)` gun-icon HUD (no blank tiles for spent lives) visually clusters icons against the score-band edge (h6 upward) and leaves the columns nearer the high-score band empty when `lives<6` (visible at lives=3 in the AC-3 screenshot, a 3-column gap between the high-score digits and the icons). This is the intended consequence of the no-blank-tiles design, not a defect — flagging so Reviewer sees the visual shape before signing off. *Found by Dev during implementation.*

### Reviewer (code review)
- **Conflict** (blocking): the HUD renders as the **horizontal mirror** of the real cabinet. Derived from ROM+MAME: UPSCRE puts P1 score at 0x041F=h0-5 and the high score at 0x059F=h12-17 (CL-13/14, byte-verified); MAME `centiped` (rev-4) is `ROT270` with a `TILEMAP_SCAN_ROWS` 32×32 playfield whose row index = `(addr-0x400)>>5` = ROM h, and the rev-4 tilemap is drawn with **no** flip in upright mode (`centiped_get_tile_info`/`screen_update_centiped` never touch `m_flipscreen` for tile position). Under ROT270 that maps **ROM h=0 to the display LEFT edge, h rising to the RIGHT** — so the real cabinet shows P1 score at LEFT, high score CENTER, P2 score RIGHT. The clone's `cellScreenX(h)=LOGICAL_W-(h+1)*TILE_W` puts h=0 at the RIGHT, so it renders P1 score at RIGHT, high score at LEFT (confirmed by the committed screenshot). This mirror is a **global** property of `cellScreenX` inherited from cp1-6 (it also mirrors the mushroom field/gun, but that is invisible because the field is symmetric); cp2-12 is simply the first story to place an asymmetric, arcade-comparable element, which exposes it. AC-3's "arcade-matching layout" is therefore not met. Affects `src/shell/layout.ts` (`cellScreenX`) and the input sign-chain (a global flip would reopen `gunScreenX`/sign-chain.test/cp2-7 hitbox); resolution is a scope decision for SM — see Reviewer Assessment. *Found by Reviewer during code review.*
- **Gap** (non-blocking): the AC-3 screenshot is attract-mode with score=0 and highScore=0, so both digit bands render identical `000000` — the capture cannot demonstrate which band is score vs high, nor that digits read MSD→LSD. A capture with distinct non-zero score and high-score values would be materially stronger AC-3 evidence. Affects `docs/rom-study/screenshots/cp2-12-hud-top-row.png`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `makeHighScoreRowGuard('wave')` establishes centipede's high-score row contract — a persisted row is only counted if it carries a finite `wave` field (plus `name`/`score`). The future write-path story (Dev's logged Gap) must write rows that include `wave`, or `load()` will filter them out and the HUD high score will stay 0. Affects `src/main.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **'SCORE' text label removed:** the story spec left it open ("may need to be dropped"); the tests now PIN its removal. Quarry ruling: UPSCRE (CENTI4.MAC:2632-2645, CL-13) emits only DIGIT2 calls (six raw BCD digits) — there is NO CHAR call for any letter, and the rev-4 in-play HUD has no text label at all (CL-12). So the clone's `SCORE ${score}` prefix is uncited and goes; the HUD row is digits + gun icons only. Test `draws NO alphabetic label on the v=0x1F HUD row` pins zero CHAR_ glyphs on the row.
- **High score contract = 4th render() parameter, not a SimState field:** the story flagged this as an open design question. Decision: high score is a persisted SHELL-domain value (`@arcade/shared/highscore`), threaded into `render(ctx, atlas, state, highScore)` by the shell entry — the pure `SimState` is NOT widened (keeps core deterministic/persistence-free). Tests call the future 4-arg shape via a `render as unknown as RenderWithHigh` cast so tsc stays green in RED against the current 3-arg signature. Dev must make the param OPTIONAL (default) so the existing 3-arg call sites (cp1-6/cp2-11 tests, and any current shell caller) keep compiling.
- **cp2-11 SCORE guard re-pinned (conscious, documented):** the single `.toContain('SCORE')` at `tests/render.test.ts:193` (run across the 4-state `it.each`) asserted the literal 'SCORE' word draws — which the label removal breaks. Re-pinned to an order-agnostic per-digit `toContain(digit)` over `String(state.score)` (score DIGITS present). Same anti-vacuous purpose (keeps the `.not.toContain('LEVEL')` pin from passing on an empty string), stays GREEN before and after the label drop; the LEVEL-absence assertions themselves are untouched.
- **P2 / game-time fields consciously DEFERRED (1-player-demo scope):** the ROM's HUD row also carries P2 lives at 0x065F h18-23 (CENTI4.MAC:939-944) and game-time/P2-score at 0x071F h24-29 (:2649-2658, colon 0x2E at :2658, gated on OPTSW2&0x1C). The clone is a 1-player demo — these are quarried (see CL narratives) but NOT rendered or tested this story. Left as future scope; no tests pin them so Dev is free to add or omit.

### Dev (implementation)
- No deviations from spec.

### Reviewer / User Ruling (2026-07-19)
- **Global horizontal mirror ACCEPTED for cp2-12 (Option C, user-ruled via orchestrator).**
  Review found that the clone renders the HUD (and the whole field) as the horizontal
  mirror of the real cabinet — P1 score at screen-RIGHT where the arcade has it at
  screen-LEFT — because `cellScreenX(h)=LOGICAL_W-(h+1)*TILE_W` (layout.ts:49) puts ROM
  h=0 at the right, whereas MAME rev-4 ROT270 + `TILEMAP_SCAN_ROWS` puts ROM h=0 at the
  display left (full derivation in the Reviewer Assessment). This is a **global** property
  from cp1-6, not a cp2-12 defect; the HUD is consistent with the field. The user ruled
  **Option C**: accept the mirror for cp2-12 and re-scope AC-3's "arcade-matching layout"
  to **HUD-consistent-with-the-field on the reserved v=0x1F row** (satisfied by the diff).
  The global fix (`cellScreenX` + input sign-chain + orientation re-pins, incl. an absolute
  left/right test pin) is deferred to **follow-up story cp2-14** (`sprint/epic-cp2.yaml`),
  to land before cp3's asymmetric entrants. No code change to cp2-12; verdict amended
  REJECTED → APPROVED.

## Sm Assessment

**Setup complete, ready for RED.** cp2-12 (2pt bug, tdd, USER-REPORTED
2026-07-19 during live play + a reference screenshot of the real cabinet) —
the score belongs ABOVE the gamefield, not drawn inside it. ROM anchors
verified 2026-07-19: the entire HUD lives on the single top row `v=0x1F`
(`addr&0x1F==0x1F`, PM-1 geometry; the row MUSHER refuses per PM-27,
CENTI4.MAC:1622 `CMP I,1F ;TOP ROW`) — NOT rows {0,1}, which are the
bottom/player zone (PM-12/PM-28). Layout on `v=0x1F`, upright (all CK*
mirror vars zeroed, CENTI4.MAC:742-751): P1 score 6 digits at `0x041F` h0-5
(UPSCRE, CENTI4.MAC:2632-2645); P1 lives as ship/gun icons at `0x04DF` h6-11
(DLIVES, :920-932 — `LDA I,1F ;PICTURE OF SHIP`); high score at `0x059F`
h12-17 (:2663-2676); P2 lives at `0x065F` h18-23 (:939-944); game-time/P2
score at `0x071F` h24-29 (:2649-2658, colon `0x2E` at :2658). Digit/glyph
writers advance `+0x20`/char (CHAR, CENIR4.MAC:212).

**USER CONFIRMED 2026-07-19: lives-as-gun-icons is REQUIRED scope, not
optional** — and the ROM mandates it anyway (DLIVES draws ship pictures,
never digits). Playfield rendering is unchanged; this is a HUD-only move.
PM-1/PM-27 are existing cited claims (geometry/reservation only); the
UPSCRE/DLIVES routine addresses are **net-new claims** for RED to file
against the vendored `reference/atari-source/centipede/revision.v4/` tree.

Context file enriched beyond the `pf context create story` stub with a
Technical Approach section covering: the current HUD draw in
`centipede/src/shell/render.ts` (post-cp2-11) draws ONLY `SCORE
${state.score}` — its `y=0` already lands on `cellScreenY(31)` (`v=0x1F`) so
the row itself is already correct, but there is no high-score draw at all
(and no `highScore` field on `SimState` — a design question for TEA/Dev:
widen state vs. widen `render()`'s parameters) and no lives icons (the `GUN`
stamp is the natural reuse candidate); the "SCORE " text-label prefix is
uncited against UPSCRE (which draws raw digits, not a label) and may need to
be dropped. Also notes the `cp2-11` `render.test.ts` block
(`drawnHudText()` atlas-request-log reconstruction over an `it.each` state
matrix) as the idiom this story's RED tests should extend, and flags the
AC-3 screenshot risk: dev port 5278 is shared across sibling checkouts
(`a-1`/`a-2`/`a-3`), so whichever screenshot phase runs must verify via
`lsof` that the port is bound to THIS checkout's cwd (or serve this tree on
a spare port) before capturing — Playwright MCP preferred, the Chrome
DevTools extension is often disconnected here.

- **Branch:** `fix/cp2-12-hud-above-playfield` off `origin/develop` tip
  `f94d1c0` (cp2-11 merged, PR centipede#17); local `centipede` checkout was
  already fast-forwarded and clean before branching.
- **Race check:** `git log origin/develop --oneline -10` has no `cp2-12` —
  clear to proceed.
- **Jira:** skipped — none on this project (`jira_key` is just the story id
  per CLAUDE.md; no Jira integration configured for the arcade orchestrator).
- **Mode:** peloton subagent mode — tea/reviewer → opus, dev → sonnet; merges
  are user-authorized between stories for this session (user directive
  2026-07-19: work through remaining stories, merge between stories) but the
  merge itself is executed by the USER, not this agent — the auto-mode
  classifier blocks an AI from merging an AI-authored + AI-reviewed PR
  (self-approval guardrail). Stop at finish and get explicit user
  authorization before any merge.
- **Pairs with cp2-11** (already shipped, same HUD area/files —
  `src/shell/render.ts` / `tests/render.test.ts`). No other cp2-12 work is
  in flight on `origin/develop`.

**Handoff:** To TEA (O'Brien) for RED test design.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (9 new failures, ready for Dev). tsc `--noEmit` clean; 225 citations all-verified.

**Test Files:**
- `tests/render.test.ts` — new `cp2-12` describe block (name+position blit recorder) + a 1-line re-pin of the cp2-11 SCORE guard.
- `docs/rom-study/claims/08-render-color.json` — CL-13..CL-16 (net-new, byte-verified vs `revision.v4/`).

**RED proof (commit `fd31b28`):**
- Suite: **437 total = 425 baseline + 12 new**; **9 fail** (all cp2-12), **428 pass**.
- The 9 RED failures (right reasons): score-digits-in-h0-5-band (drawn at wrong x today), high-score-digits-in-h12-17-band (no high score drawn), no-letter-label (clone still draws 'SCORE'), lives-icon-count for lives∈{1,2,3,5,6} (0 icons drawn), and lives increase/decrease.
- GREEN across the transition: cp2-11 block (5/5, re-pin holds), the 3 cp2-12 invariants (lives=0 → 0 icons, no-mushroom-on-HUD-row, HUD-never-in-field), and the entire prior baseline.
- `node tools/audit/check-citations.mjs` → checked 225 claim(s), all verified.
- `npx tsc --noEmit` → clean.

---

### Dev contract (GREEN) — `src/shell/render.ts`

Move the HUD onto the ROM top row **v=0x1F** (screen `y = cellScreenY(PLYFLD_HEIGHT-1) = 0`). Place each field with `cellScreenX(h)` (same authority the field uses) so it lands on the reserved row and stays consistent with the proven orientation. Constants (all hex, upright — CK* zeroed, CENTI4.MAC:742-751):

| Field | ROM addr | h-columns | What draws | Claim |
|-------|----------|-----------|-----------|-------|
| P1 score | 0x041F | h0-5 (6 cols) | six raw BCD digits, **no text label** | CL-13 |
| P1 lives | 0x04DF | h6-11 (6 cols, cap) | `GUN` stamp × `min(lives,6)` — icons, never digits | CL-15 |
| high score | 0x059F | h12-17 (6 cols) | six raw BCD digits | CL-14 |

Each field is six **consecutive** columns because CHAR advances +0x20 (one column) per glyph (CL-16). `cellScreenX` reverses columns → the three x-bands are disjoint: score `[192,232]`, lives `[144,184]`, high `[96,136]`.

1. **Drop the `SCORE ` prefix.** Draw bare score digits at h0-5. No `CHAR_` letter glyph may land on the HUD row (tests assert zero). Watch the digit-order-vs-`cellScreenX`-reversal: the score must read correctly on screen (context lines 76-79) — the tests pin the digit *multiset* per band, so any correct ordering passes; the screenshot (AC-3) is the arbiter of which edge.
2. **High score = a 4th `render()` parameter**, OPTIONAL with a default (so the current 3-arg call sites keep compiling). Source it shell-side from `@arcade/shared/highscore` in the shell entry (`main.ts` / loop), NOT inside `render.ts` and NOT as a `SimState` field. Draw HSCORE's six digits at h12-17.
3. **Lives = gun icons.** Reuse the existing `GUN` stamp, one per remaining life, up to 6 columns, at h6-11 on the HUD row. Count must track `state.lives` (0 lives → 0 icons). The player's own gun still draws in the field (never y=0), so it is not counted.
4. **No new colour literals** — the colour-literal scan (cp1-6) still guards `render.ts`; digits/GUN come from existing atlas stamps and the palette module. Do not import `@arcade/shared/font` (cp1-6 pin).
5. **No core changes needed for the mushroom exclusion** — the MUSHER guard + seeding already reserve v=0x1F (CT-46; shoot-train/playfield tests). This is a shell-only HUD move; the playfield render is unchanged.

### AC-3 screenshot (Dev, after GREEN — do NOT do it in RED)
Serve THIS checkout on a spare port to avoid a sibling checkout owning 5278/5288:
```
cd /Users/slabgorb/Projects/a-1/centipede && npx vite --port 5288 --strictPort
```
Before capturing, VERIFY the server bound to 5288 is this tree:
```
PID=$(lsof -ti tcp:5288 | head -1); lsof -a -p "$PID" -d cwd -Fn | grep '^n'   # must be under /Users/slabgorb/Projects/a-1
```
Capture with Playwright MCP (the Chrome DevTools extension is often disconnected here). The reference is the real cabinet: score / lives-icons / high-score across the top row, above the field. Commit the PNG under an appropriate `docs/` path (e.g. `docs/rom-study/screenshots/`). Then `npm test`, `node tools/audit/check-citations.mjs`, and `npm run build` must all be green.

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/render.ts` — the HUD moved onto the ROM's reserved top row `v=0x1F` (`hudY = cellScreenY(PLYFLD_HEIGHT-1)`): dropped the `SCORE ` text prefix, drew six raw zero-padded score digits at h0-5 (`cellScreenX(5)` start, MSD-first, CL-13), drew `min(state.lives,6)` `GUN` icons at h6-11 (`cellScreenX(6+i)`, CL-15), and drew six raw zero-padded high-score digits at h12-17 (`cellScreenX(17)` start, CL-14). Added the `sixDigits()` zero-pad helper and a new optional 4th `render()` parameter `highScore = 0`. No new colour literals, no `@arcade/shared/font` import, no `SimState` widening.
- `src/main.ts` — imports `makeHighScoreStorage`/`makeHighScoreRowGuard` from `@arcade/shared/highscore`, loads the `centipede` table keyed on domain `'wave'`, reads the top score (`load()[0]?.score ?? 0`), and threads it into `render(logicalCtx, atlas, sim, highScore)` (was 3-arg). Read-only this story — no write-back yet (logged as a Delivery Finding).
- `docs/rom-study/screenshots/cp2-12-hud-top-row.png` — AC-3 screenshot: attract-mode state showing high-score digits, 3 lives icons, and score digits on the top row, above the mushroom field.

**Tests:** 437/437 passing (GREEN — the 9 RED cp2-12 tests now pass; full baseline including the cp2-11 re-pin holds)
**Gates:** `npx tsc --noEmit` clean; `node tools/audit/check-citations.mjs` → 225/225 verified; `npm run build` clean; purity suite 17/17 green
**Branch:** `fix/cp2-12-hud-above-playfield` (commit `fcf3917`, not pushed per instructions)

**Handoff:** To Reviewer (The Thought Police) for review.

## Subagent Results

> **Ordering note (2026-07-19):** this `reviewer-preflight` was dispatched **late** —
> AFTER the original review + gate runs and AFTER the Option-C amendment, BEFORE finish —
> to repair a genuine process gap (the specialist was never dispatched during the original
> cp2-12 review; the Reviewer ran the mechanical gates by hand instead). The row below is
> the GENUINE return of that late run, not a backfill. Its numbers match the Reviewer's own
> hand-run gates exactly, so it does not disturb the amended APPROVED verdict.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | Diff = 5 files (main.ts / render.ts / render.test.ts / 08-render-color.json / cp2-12-hud-top-row.png), **no `src/core` touched**; vitest 437/437 (33 files), tsc exit 0 (`noUnusedLocals` on → no orphaned imports), citations 225/225 verified, build PASS, purity 17/17; no TODO/FIXME/console.log/debugger/`.only`/`.skip` in the diff; all new imports used; working tree clean | N/A — all mechanical gates pass with exact expected counts; corroborates the Reviewer's own independent gate runs and does not change the amended APPROVED verdict (the horizontal-mirror finding is a fidelity/orientation matter no mechanical gate can see — accepted under Option C, routed to cp2-14) |

**All received: Yes** (1/1 enabled subagents returned).

## Reviewer Assessment

**Verdict:** APPROVED *(amended 2026-07-19 per USER RULING, Option C — see banner below)*

> **AMENDMENT — 2026-07-19 (USER RULING via orchestrator).** The original verdict below
> was **REJECTED** on the horizontal-mirror finding. The user has ruled **Option C**: the
> global horizontal mirror is **ACCEPTED for cp2-12** and AC-3's "arcade-matching layout"
> is re-scoped to mean **HUD-consistent-with-the-field on the reserved v=0x1F row** (which
> the diff satisfies). A follow-up story **cp2-14** is filed in `sprint/epic-cp2.yaml` for
> the global orientation flip (`cellScreenX` + input sign-chain + re-pins), to land before
> cp3's asymmetric entrants. Per my own written ruling ("Option C → then the diff is
> already correct and this flips to APPROVED with no code change"), the verdict is now
> **APPROVED with no code change**. The full ROM+MAME derivation below is **preserved
> verbatim** as the technical basis for cp2-14 — the record intentionally shows both states.
>
> - The former **[HIGH]** mirror finding → **ACCEPTED pre-existing deviation, routed to cp2-14** (not a cp2-12 defect; the HUD is consistent with the field).
> - **[LOW]** orientation-blind tests → to be addressed by **cp2-14's AC-3** (an absolute left/right pin), so a regression is caught by CI once orientation is corrected.
> - **[LOW]** weak (all-zero) AC-3 screenshot → **acceptable under Option C** (the layout it needs to demonstrate — HUD on the top row above the field — is visible; distinct values become useful when cp2-14 re-captures).
>
> **Process-honesty note (2026-07-19):** the `reviewer-preflight` specialist was NOT
> dispatched during the original review — I ran the mechanical gates by hand instead. It
> was dispatched **late** (post-amendment, pre-finish) to repair that gap; its genuine
> return is recorded in `## Subagent Results` above and matches the hand-run gates exactly
> (437/437, tsc 0, 225/225, build green, 17/17 purity, no `src/core` changes), so it does
> not change this verdict.

---

_Original assessment (verdict REJECTED), preserved as the basis for cp2-14:_

**Verdict (original, superseded):** REJECTED

The implementation is clean, well-cited, and internally consistent — but it renders
the HUD as the **horizontal mirror** of the real cabinet, so AC-3's "arcade-matching
layout" is not satisfied. This is the headline finding; everything else is green.

### Orientation ruling (the headline)

**Derived mapping (code + ROM + MAME, not assumed from the screenshot):**

- **ROM (byte-verified):** UPSCRE writes P1 score to playfield addr `0x041F` and the
  high score to `0x059F` (CENTI4.MAC:2632/2663). Decoded with `h=(addr-0x400)>>5`,
  `v=addr&0x1F`: score = h0-5, lives (DLIVES 0x04DF) = h6-11, high = h12-17, all on
  v=0x1F. Upright, the CK* EOR masks are zero, so addresses are literal.
- **MAME ground truth:** `centiped` (rev-4) = `ROT270`, background `TILEMAP_SCAN_ROWS`
  8×8, 32×32 (`centiped_v.cpp:93`). With videoram base 0x400, tilemap **col** =
  `addr&0x1F` = ROM v, tilemap **row** = `(addr-0x400)>>5` = ROM h. The rev-4 tile-info
  (`centiped_get_tile_info`, :20-23) and `screen_update_centiped` (:414) **never flip
  the tilemap** — upright cocktail-mirroring is done in ROM software (CK*), which is
  zero upright. So the native raster has X∝v, Y∝h; ROT270 (rotate native 90° CCW)
  sends native-top (h=0) → **display LEFT** and native-right (v=31) → **display TOP**.
- **Cross-check (validates the rotation direction):** the same transform sends v=31 →
  top and v=0 → bottom, i.e. HUD at top / gun zone at bottom — which is the clone's
  known-correct, shipped vertical axis. The horizontal result therefore rides on a
  rotation the vertical axis independently confirms.

**Conclusion:** on the real upright cabinet **ROM h=0 is at the LEFT** → P1 score LEFT,
high score CENTER, P2 score RIGHT (the classic Atari layout, and what the user's
reference screenshot shows). The clone's `cellScreenX(h)=LOGICAL_W-(h+1)*TILE_W`
(layout.ts:49) maps **h=0 to the RIGHT**, so it renders **P1 score RIGHT, high score
LEFT** — the mirror image. The committed screenshot confirms it (high-score digits far
left, gun icons centre, score digits far right).

**Scope / blame (important):** the mirror is a **global** property of `cellScreenX`
from cp1-6 — it also reflects the mushroom field, gun and centipede, but that is
invisible because the field is symmetric and the input sign-chain was tuned so
device-right → screen-right regardless. cp2-12 is the first story to place an
asymmetric, arcade-comparable element, which is why the pre-existing mirror only now
becomes a visible fidelity defect. cp2-12's HUD is **consistent with the field** and
did the locally-correct thing (reuse `cellScreenX`, correct ROM h-columns). So this is
**not a coding error in the diff** — it is a foundational-orientation question the diff
surfaced. The fix is a scope/architecture decision, which is why this routes to SM, not
straight back to Dev:

- **Option A — global flip:** make `cellScreenX` put col 0 at the LEFT and flip the
  input sign so device-right still moves the gun right. Fixes everything to match the
  cabinet absolutely, but reopens `gunScreenX`/`sign-chain.test.ts`/cp2-7 hitbox — far
  bigger than a 2pt HUD story.
- **Option B — HUD-only:** place the HUD to match the arcade (P1 score LEFT) while the
  field stays mirrored. Satisfies the visible user complaint but makes the HUD use a
  different h→screen convention than the mushrooms (internal inconsistency; not
  player-visible).
- **Option C — re-scope AC-3:** explicitly accept that the clone is a horizontal
  reflection and define "arcade-matching" as HUD-consistent-with-field on the reserved
  row. Then the diff is already correct and this becomes an APPROVE.

A naïve "just move the HUD to the other side" is **Option B** and would introduce the
HUD/field inconsistency — do not let it be applied as a reflex fix without the decision.

### Mandatory review — the rest is sound

- **Data flow traced:** `state.score` → `sixDigits()` (clamps <0 to 0, trunc, pad/slice
  to 6) → `drawText` at `cellScreenX(5)`, MSD-first left-to-right (digits read
  correctly). `highScore` ← `main.ts` `makeHighScoreStorage('centipede', guard('wave')).load()[0]?.score ?? 0`
  → render 4th arg. `load()` returns `[]` on node/private-mode/corrupt-JSON (never
  throws); `[0]?.score ?? 0` is null-safe. Read-only (no write-back — Dev Gap logged).
- **Wiring:** `render()` gained an OPTIONAL 4th param (`highScore = 0`) so the 3-arg
  cp1-6/cp2-11 call sites still compile; `main.ts` is the sole 4-arg caller. Minimal,
  well-commented, not speculative. Core (`SimState`) not widened — persistence stays a
  shell concern. **No `src/core` changes** (diff confirms).
- **Error handling / edges:** `sixDigits` handles negative, fractional, and >6-digit
  values; lives capped at `min(lives,6)`, lives=0 → 0 icons (tested); highscore storage
  degrades to 0 on every failure mode.
- **Citations:** CL-13/14/15/16 checked against the vendored `revision.v4/` tree
  (UPSCRE/DLIVES/CHAR) — addresses, h-decoding, +0x20 advance, "no text label", and the
  CK*-zero-upright reasoning are all accurate. `check-citations.mjs` → 225/225.
- **Tests:** non-vacuous, with explicit anti-vacuous guards. But **edge-agnostic by
  design** (sorted digit multisets; `Math.min/max` bands from `cellScreenX`; digit
  READING ORDER unpinned) — TEA's comment defers left/right to "the AC-3 screenshot as
  the arbiter." So the suite is structurally incapable of catching the mirror or a
  reversed digit order; the screenshot was the only orientation gate, and it shows the
  mirror. Not a test-quality defect, but it explains why every gate is green on a
  mirrored layout.
- **cp2-11 re-pin:** the `'SCORE'` literal guard → order-agnostic per-digit
  `toContain(digit)` is legitimate (same anti-vacuous purpose; the `.not.toContain('LEVEL')`
  pins are untouched — verified in the diff).
- **Gates:** `npx vitest run` → 437/437 (33 files, incl. purity). `npx tsc --noEmit` →
  clean. `check-citations.mjs` → 225/225. `npm run build` → clean.
- **Race check:** `git fetch` clean; origin/develop at `d2d74c4` (v0.0.3 release chore
  = package.json/lock only, no source); no sibling cp2-12 in flight.

### Deviation audit

- TEA — 'SCORE' label removed → **ACCEPTED** (CL-13: UPSCRE emits only DIGIT2, no CHAR;
  ROM-faithful).
- TEA — high score as 4th render() param, not a SimState field → **ACCEPTED** (keeps
  core pure; `@arcade/shared/highscore` used correctly).
- TEA — cp2-11 SCORE-guard re-pin → **ACCEPTED** (legitimate; LEVEL-absence pins intact).
- TEA — P2/game-time fields deferred → **ACCEPTED** (1-player-demo scope; quarried, not
  rendered).
- Dev — "No deviations" → **FLAGGED (undocumented):** placing the HUD via `cellScreenX(h)`
  renders it as the mirror of the arcade (P1 score on the RIGHT). TEA punted the left/right
  edge to the screenshot and Dev accepted a mirrored capture; neither logged that the
  result does not match the real cabinet. This is the blocking Conflict above.

### What must change — RESOLVED by user ruling (Option C, 2026-07-19)

The user chose **Option C** (re-scope AC-3), so — per the resolution rule stated above
("If Option C is chosen, flip this verdict to APPROVED with no code change") — the phase
**advances review → finish** with no cp2-12 code change. Original disposition retained
below with the amended status appended.

| Severity | Issue | Location | Amended disposition (2026-07-19) |
|----------|-------|----------|----------------------------------|
| ~~[HIGH]~~ → **ACCEPTED deviation** | HUD renders as horizontal mirror of the real cabinet (P1 score RIGHT; arcade has it LEFT) | `src/shell/layout.ts:49` (`cellScreenX`), surfaced by `src/shell/render.ts:127-139` | **Not a cp2-12 defect** — global cp1-6 orientation, HUD consistent with field. AC-3 re-scoped to HUD-consistent-with-field. **Routed to follow-up cp2-14** for the global flip. |
| [LOW] | AC-3 screenshot is attract-mode (score=high=0 → both `000000`) | `docs/rom-study/screenshots/cp2-12-hud-top-row.png` | **Acceptable under Option C** (it shows the HUD on the top row above the field, which is what AC-3 now needs). Distinct-value re-capture belongs to cp2-14. |
| [LOW] | Tests edge/order-agnostic → cannot catch the mirror or reversed digit order | `tests/render.test.ts` (cp2-12 block) | **Addressed by cp2-14's AC-3** (an absolute left/right pin), so a future regression is caught by CI, not the eye. |

**Handoff (amended):** To SM (Winston Smith) for `finish-story` — verdict APPROVED under
Option C, phase advanced review → finish. cp2-14 carries the global-orientation follow-up.