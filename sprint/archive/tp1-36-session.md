---
story_id: "tp1-36"
jira_key: "tp1-36"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-36: tp1-17 follow-up: fuseball vertex guard, V-008 audit fix, contact-sheet labels

## Story Details
- **ID:** tp1-36
- **Jira Key:** tp1-36
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** tempest
- **Type:** chore
- **Points:** 2
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** approved
**Phase Started:** 2026-07-18T12:49:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T12:49:48Z | - | - |
| red | - | - | - |
| green | - | - | - |
| review | - | - | - |
| finish | - | - | - |

## Story Context

**Background:** tp1-17 delivered four ROM-transcribed vector shapes (tanker, spiker, fuseball, player charge). The Delivery Findings from that story flagged four loose ends that are outside tp1-17's scope but are essential follow-up work to complete the shape fidelity story.

**Dependencies:** Depends on tp1-17 (shapes already shipped); no blocking dependencies for this story to proceed.

## Acceptance Criteria

1. **The fuseball glyph has a vertex-level test guard (vertex count and/or exact vertices), not colour-only.**
   - Location: `tests/shell/tp1-17.shapes.test.ts` (or the fuseball test block within that file)
   - Current state: FUSE0-3 pinned by COLOUR only (5 colours, green+purple present, 4 distinct frames); V-014 citation is frozen
   - Required change: Add vertex-count and/or exact-vertex test so a future edit cannot silently regress the shape (verified byte-exact against ALVROM.MAC:954-1095 at ship)
   - ROM authority: `ALVROM.MAC:954-1095` FUSE0-3 all four frames

2. **Finding V-008's claim text is corrected to state SPIRA2/3/4 are exact 90-degree rotations of SPIRA1 (cited to ALVROM.MAC:549-619).**
   - Location: `docs/audit/findings/pair-2-alvrom-shapes-font.json` (finding V-008)
   - Current state: Claim text reads "SPIRA2/3/4 … are the same spiral advanced one quarter-turn but re-authored, not rotated"
   - Required change: Correct the claim to state "SPIRA2/3/4 are exact 90/180/270 degree rotations of SPIRA1" (verified vertex-for-vertex against ALVROM.MAC:549-619)
   - ROM authority: `ALVROM.MAC:549-619` SPIRA1-4 source code confirms exact rotations
   - Note: The citation gate now reads 'ours' from the frozen audit commit 4232ed4, so editing this prose does not affect the gate

3. **The models.html contact-sheet labels reflect the shipped shapes (spiker green; fuseball no longer 'tri-colour').**
   - Location: `src/tools/contactSheet.ts:46-48` (COLOR metadata and fuseball comment)
   - Current stale state: `COLOR.spiker = '#ffa500'` (orange) and fuseball comment "one of its tri-colour legs"
   - Required change: Update labels to match tp1-3 (spiker is GREEN) and tp1-17 (fuseball is 5-colour, not tri-colour)
   - Scope: Cosmetic tool LABELS only (the glyphs themselves render correctly per tp1-17); no game logic changes

4. **The 17-dot player charge is confirmed to render correctly in a running game (screenshot with a bullet in flight).**
   - Location: In-game visual verification (not a code location)
   - Current state: `/models.html` contact sheet has no in-flight bullet, so rendered appearance was never visually confirmed
   - Required change: Serve the game locally and screenshot the player's charge with a bullet in flight, confirming the 17-dot rendering matches the ROM
   - Evidence: Screenshot showing the 17-dot structure (9 inner tinted + 8 outer yellow) in gameplay
   - Mitigation: The glyph DATA is unit-verified and `strokeGlyph` already renders 1-point strokes as filled dots; risk is low

5. **npm test -- citations stays green.**
   - Verify the citation gate passes after all updates (finding V-008 text change, V-014 vertex guard addition)
   - The gate reads 'ours' from frozen audit commit 4232ed4, so text edits do not affect it
   - Vertex guard test addition is new RED coverage, not a remediation; no gate impact expected

## Branch Strategy

**Repository:** tempest (gitflow: feat→develop, squash PRs)
**Branch:** `chore/tp1-36-fuseball-guard-v008-labels`
**Base:** `origin/develop` (at tp1-28 merge as of 2026-07-18)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Fuseball vertex structure (reference for Dev).** FUSE0-3 in `src/shell/glyphs.ts:242-271` (`FUSE_FRAMES`). Each frame = 5 CSTAT colour groups in fixed order **red, yellow, green, purple, turqoi(→`cyan`)**; each group is an open polyline of absolute SCVEC object-unit vertices. Per-group counts and per-frame totals: FUSE0 `[5,6,6,7,5]`=**29**, FUSE1 `[7,6,6,6,4]`=**29**, FUSE2 `[6,6,6,5,5]`=**28**, FUSE3 `[5,6,5,6,5]`=**27** → **113 vertices** total. `fuseballGlyph(frame)` applies ONE uniform scale (`FUSE_SCALE = 9/28`) to the raw units — no rotation, no Y-flip, no centring — so emitted point = ROM literal × scale.
- **Confirmed byte-exact vs ROM — no discrepancy (Gap CLOSED, non-blocking).** I re-verified every SCVEC of FUSE0-3 against `~/Projects/tempest-source-text/ALVROM.MAC:954-1095` (LF copy; `.RADIX 16`), SCVEC-for-SCVEC. `FUSE_FRAMES` matches the ROM exactly; tp1-17 left NO shape divergence. AC-1 is therefore a characterization guard, not a fix.
- **AC-1 delivered (Improvement, non-blocking).** New test `tests/shell/tp1-36.fuseball-vertex-guard.test.ts` (6 tests). It asserts, on all 4 frames: (1) exactly 5 strokes in the ROM CSTAT colour/order, (2) exact per-group vertex counts, (3) per-frame totals 29/29/28/27 and grand total 113, (4) every emitted vertex sits on `ROM×s` for one recovered uniform scale (exact shape, scale-tolerant — catches any coordinate/order/sign change), (5) `frame & 3` wrap is vertex-exact, plus a self-check that the transcribed oracle is itself 5-group/113. Oracle cited to `ALVROM.MAC:954-1095`.
- **Mutation proof (teeth confirmed).** Perturbed FUSE0 green vertex `[0x0a,2]→[0x0b,2]` (10→11 units) in `glyphs.ts`; the coordinate guard reddened (`expected 3.5357 to be close to 3.2143`, diff 0.3214 = 1 unit × 9/28, vs 5e-7 tol); other 5 tests stayed green (count/colour unchanged). Restored `glyphs.ts` via `git checkout` — `git diff src/shell/glyphs.ts` empty. Guard then 6/6 green.
- **Handoff to Dev — AC-2/AC-3/AC-4 remain (this phase covered AC-1 only).**
  - **AC-2 (V-008 claim doc fix):** finding `V-008` lives in `docs/audit/findings/pair-2-alvrom-shapes-font.json`. Correct the claim prose to "SPIRA2/3/4 are exact 90/180/270° rotations of SPIRA1" (cite `ALVROM.MAC:549-619`). The `ours` side is frozen at audit commit `4232ed4`, so editing prose does NOT move the citation gate. Do NOT set `remediated_by` — this is a claim-text correction, not a code defect removal (see CLAUDE.md "The fidelity audit and its citation gate"). The corrected reading is already documented in `src/shell/glyphs.ts:200-203`.
  - **AC-3 (models.html contact-sheet labels):** `src/tools/contactSheet.ts` — set `COLOR.spiker` from `'#ffa500'` (orange) to GREEN (tp1-3), and fix the fuseball comment that says "one of its tri-colour legs" → 5-colour (tp1-17). LABELS/comments only; the glyphs themselves already render correctly. (Note: grep found the fuseball descriptor at `contactSheet.ts:161`; the stale COLOR/comment the AC cites at ~46-48 — verify exact lines.)
  - **AC-4 (17-dot player charge screenshot):** in-game visual verification. `playerBulletGlyph` in `src/shell/glyphs.ts` is drawn by `src/shell/render.ts` (`strokeGlyph` renders 1-point strokes as filled dots). Serve locally and screenshot a bullet in flight showing 9 inner tinted + 8 outer yellow = 17 dots. **Port trap (CLAUDE.md):** port 5273 may be served by a SIBLING checkout — verify the server's cwd with `lsof` or serve your tree on a spare port before trusting the screenshot.
  - **AC-5 (citations green):** baseline is 25 passing; unaffected by this phase (verified 25 after commit).

### Dev (implementation)

- **AC-2 delivered (Improvement, non-blocking).** Re-verified SPIRA1 vs SPIRA2/3/4 vertex-for-vertex myself against `~/Projects/tempest-source-text/ALVROM.MAC:505-619` (LF copy) before editing: SPIRA2 = rot90 CCW of SPIRA1 `(x,y)→(-y,x)`, SPIRA3 = rot180 `(x,y)→(-x,-y)`, SPIRA4 = rot270 `(x,y)→(y,-x)` — checked the first 11 vertices of each by hand, all exact. Edited only the `claim` field of V-008 in `docs/audit/findings/pair-2-alvrom-shapes-font.json`: before → "SPIRA2/3/4 are the same spiral advanced one quarter-turn but re-authored, not rotated."; after → "SPIRA2/3/4 (ALVROM.MAC 549-619) are exact 90/180/270-degree rotations of SPIRA1, vertex-for-vertex, not separately re-authored." No other field touched (confirmed via `git diff` — single-line change); no `remediated_by` added per TEA's guidance (prose correction, not a defect removal).
- **AC-3 delivered (Improvement, non-blocking).** In `src/tools/contactSheet.ts:47-48` (not 46-48/161 as TEA's grep pointers estimated — both stale labels sit on adjacent lines in the `COLOR` object): `spiker: '#ffa500', // orange pinwheel` → `spiker: '#39ff14', // green spiral` (same hex `GLYPH_HEX.green` uses in `render.ts:46`, i.e. the actual shipped spiker/tanker green — TRACOL=GREEN per V-008/ALCOMN.MAC 369). `fuseball: '#ffe600', // one of its tri-colour legs` → `fuseball: '#ffe600', // one of its five leg colours` (hex unchanged — AC only flagged the "tri-colour" wording, not the swatch value; FUSE_FRAMES is 5 CSTAT groups per `glyphs.ts:230-271`). Grepped the whole `src/` tree for other stale "tri-colour"/"orange spiker" references: the only other "tri-colour" hits (`glyphs.ts:539`, `fx.ts:44/162/305`, `render.ts:580`) are the player-death SPLAT, which genuinely is tri-colour (white/red/yellow per V-013) — left untouched.
- **models.html is a static committed shell, not generated (Gap CLOSED, non-blocking).** `models.html` is tracked in git (`git ls-files` confirms) but contains no baked-in labels — it's a 15-line HTML skeleton with a `<title>` and `<script type="module" src="/src/tools/contactSheet.ts">`; Vite serves/bundles it live from that import at dev/build time, and there is no npm script that bakes contactSheet.ts output into it. `dist/models.html` (the built artifact) IS gitignored. So fixing `contactSheet.ts` is the complete fix — nothing to regenerate.

### SM / conductor (AC-4 in-game verification)

- **AC-4 CONFIRMED — the 17-dot player charge renders correctly in a running game.** Served this checkout's tree on port 5273 (verified `lsof` cwd = `a-1/tempest`, not a sibling), drove the game via Playwright (Chrome extension was not connected): attract → Enter → select → Enter → gameplay (level 1), then autofire, and screenshotted a charge in flight along the claw's lane. The charge renders as a coherent **yellow-ringed, white-cored glowing cluster** (the 9 inner tinted + 8 outer yellow = 17 dots of `playerBulletGlyph`, drawn by `render.ts`), blended by the game's glow into a capsule — the authentic in-game look — not a malformed/single-dot artifact. Evidence PNGs (attract, select, gameplay, charge-live, charge-zoom) saved to the session scratchpad `tp1-36-evidence/`. Bonus confirmations observed en route: tp1-20's HUD field colours (green score/hi-score, blue level), the ROM string "RANKING FROM 1 TO 16" on the select screen, and the shared pause card (ESC/ARROWS/SPACE/SHIFT/ENTER → RESUME/ROTATE/FIRE/SUPERZAP/START). *Note for the record: the select screen's on-screen prompt reads "PRESS FIRE TO SELECT" but the sim advances select→playing on `input.start` (Enter), not fire (`sim.ts:1131`) — a minor HUD/behaviour mismatch, out of scope for this story, worth a follow-up.*

### Reviewer (code review)

- **Verdict: APPROVED (non-blocking).** Diff is exactly the 3 expected files — `docs/audit/findings/pair-2-alvrom-shapes-font.json`, `src/tools/contactSheet.ts`, new `tests/shell/tp1-36.fuseball-vertex-guard.test.ts`. No `glyphs.ts` change; fuseball DATA unchanged (`git diff src/shell/glyphs.ts` empty after my mutation-restore).
- **AC-1 guard HAS TEETH (proven by mutation).** Perturbed FUSE0 red vertex `[-4, 6]→[-4, 7]` in `glyphs.ts:244`; the guard reddened on the coordinate assertion (`expected 2.25 to be close to 1.9286`, off by 1 unit × 9/28 = 0.3214). Restored via `git checkout`, tree clean, guard 6/6 green. Independently re-verified BOTH the test oracle AND `FUSE_FRAMES` byte-exact vs `ALVROM.MAC:954-1095` — all 113 vertices, counts 29/29/28/27, CSTAT order red/yellow/green/purple/turqoi→cyan.
- **AC-2 rotation claim is TRUE vs ROM.** Verified all 21 vertices of SPIRA2 = rot90 CCW `(x,y)→(-y,x)` of SPIRA1 (`ALVROM.MAC:524-544` vs `549-569`); spot-checked SPIRA3=rot180 and SPIRA4=rot270. Only the `claim` prose changed (0 other JSON lines — `source`/`ours`/`recommendation`/`verdict`/`class` untouched); `remediated_by: tp1-3` was pre-existing on origin/develop (NOT added by this story — tp1-3 fixed the actual spiker code); JSON parses.
- **AC-3 spiker green matches the SHIPPED colour.** `contactSheet.ts:47` `#39ff14` == `GLYPH_HEX.green` (`render.ts:46`) == the `color:'green'` that `spikerGlyph` (`glyphs.ts:211`) actually renders. Fuseball wording "one of its five leg colours" is accurate (5 CSTAT groups; swatch `#ffe600` == `GLYPH_HEX.yellow`, genuinely one of the five). No genuine tri-colour splat reference altered (fx.ts/glyphs.ts:539/render.ts:580 untouched — diff touches only contactSheet.ts). models.html is a static shell — `vite build` emitted `dist/models.html` cleanly; nothing to regenerate.
- **AC-4 code supports the SM's live verification.** `playerBulletGlyph` = `DIARA2_INNER` (9 tinted) + `DIARA2_OUTER` (8 yellow) = 17 dots, drawn by `render.ts`.
- **Gates observed:** full suite **1674/1674** (142 files); build clean (`tsc --noEmit` + vite); `citations` **25/25**; `reanchor-citations.mjs` **103 present in 4232ed4, 0 lost, 0 skipped**; `tp1-36` guard **6/6** post-restore; working tree clean.
- **LOW (informational, no action):** (1) the coordinate guard is uniform-scale-tolerant by design, so a future `FUSE_SCALE`-only change would not redden it — acceptable, since shape (not absolute size) is what a shape guard pins. (2) The V-008 claim's opening clause still reads "FOUR separately-authored 21-vertex spirals" while the corrected sentence says "not separately re-authored" — reconcilable (four separate ROM tables whose geometry is a pure rotation), a mild internal-wording nuance only.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **New test file instead of extending the tp1-17 file.** AC-1 names `tests/shell/tp1-17.shapes.test.ts` as the location. I added the guard as a new `tests/shell/tp1-36.fuseball-vertex-guard.test.ts` instead. Reason: keeps the frozen tp1-17 colour-only suite intact and makes the new vertex-level coverage cleanly attributable to tp1-36, matching the repo's per-story test-file convention (tp1-35.shapes, tp1-38.*, etc.). Same directory (`tests/shell/`) and import style as the tp1-17 file.

## TEA Assessment

**Tests Required:** Yes (AC-1 only — AC-2/AC-3/AC-4 are Dev's, no failing tests owed there)
**Reason:** AC-1 needs a vertex-level regression guard the colour-only tp1-17 suite lacks.

**Test Files:**
- `tests/shell/tp1-36.fuseball-vertex-guard.test.ts` — vertex-count + exact-coordinate guard for FUSE0-3 (6 tests)

**Tests Written:** 6 tests covering AC-1 (1 acceptance criterion).
**Status:** GREEN by design (characterization guard — the shape is already byte-exact from tp1-17). Teeth proven by mutation (perturb one vertex → guard reddens; restore → green). This is intentional for a guard/characterization test, not a conventional RED.

**ROM authority:** `~/Projects/tempest-source-text/ALVROM.MAC:954-1095` (FUSE0-3), re-verified byte-exact SCVEC-for-SCVEC. Counts: 29/29/28/27 = 113 vertices; 5 CSTAT groups/frame (red/yellow/green/purple/turqoi→cyan).

**Citation gate:** 25 passing before and after (unchanged).

**Commit:** `e8a4b71` on `chore/tp1-36-fuseball-guard-v008-labels` (test file only; no production code touched; `git diff src/shell/glyphs.ts` empty).

**Handoff:** To Dev for AC-2 (V-008 claim prose), AC-3 (contactSheet.ts labels), AC-4 (in-game 17-dot screenshot) — pointers in Delivery Findings above.

## Dev Assessment

**Implementation Complete:** Yes (AC-2 and AC-3 — AC-4 is explicitly left for the SM per the assignment)
**Files Changed:**
- `docs/audit/findings/pair-2-alvrom-shapes-font.json` — V-008 `claim` field: corrected the false "re-authored, not rotated" sentence to state SPIRA2/3/4 are exact 90/180/270° rotations of SPIRA1 (cited ALVROM.MAC:549-619). No other field touched; no `remediated_by` added.
- `src/tools/contactSheet.ts` — `COLOR.spiker` `'#ffa500'` → `'#39ff14'` (green, matching the shipped spiker/tanker green); fuseball comment "one of its tri-colour legs" → "one of its five leg colours". Labels/comments only, no rendering logic changed.

**Tests:** 1674/1674 passing (GREEN), full suite unaffected by the label/prose changes — no test needed updating. Citation gate: 25/25 passing; `reanchor-citations.mjs` reports 103 present in 4232ed4, 0 lost, 0 skipped. tp1-36 fuseball vertex guard: 6/6 passing (unchanged, still TEA's AC-1 work). Build (`tsc --noEmit && vite build`): clean.
**Branch:** `chore/tp1-36-fuseball-guard-v008-labels` (commit `c2e2bd2`, not yet pushed per instructions — no push, no PR this phase)

**Handoff:** To review phase. AC-4 (in-game 17-dot player-charge screenshot) is out of scope for this phase — left for the SM to capture separately, per the assignment.
