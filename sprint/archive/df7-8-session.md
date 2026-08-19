---
story_id: "df7-8"
jira_key: "df7-8"
epic: "df7"
workflow: "tdd"
---
# Story df7-8: Scanner player-blip render

## Story Details
- **ID:** df7-8
- **Jira Key:** df7-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df7-8-scanner-player-blip-render
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T19:11:49Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T18:26:53Z | 2026-08-19T18:30:16Z | 3m 23s |
| red | 2026-08-19T18:30:16Z | 2026-08-19T18:42:15Z | 11m 59s |
| green | 2026-08-19T18:42:15Z | 2026-08-19T18:47:36Z | 5m 21s |
| review | 2026-08-19T18:47:36Z | 2026-08-19T19:04:30Z | 16m 54s |
| green | 2026-08-19T19:04:30Z | 2026-08-19T19:06:18Z | 1m 48s |
| review | 2026-08-19T19:06:18Z | 2026-08-19T19:11:49Z | 5m 31s |
| finish | 2026-08-19T19:11:49Z | - | - |

## Story Acceptance Criteria

- **AC1:** the player blip is drawn using PLAXC>>4 (column) and Y>>3 (row) with palette index 9 (WHITE) at PLAYER BASE $4B00+SCANH; a test confirms the blip appears at the correct radar position from the player's screen coordinate
- **AC2:** the blip is rendered in pure core composeFrame inside the df7-5 bezel bounds; purity.test.ts stays green (no clock/DOM references); colour by palette INDEX only, never a hex literal
- **AC3:** all values (PLAXC>>4 column, Y>>3 row, $9099 palette index, PLAYER BASE $4B00+SCANH) are cited to defender/AMODE1.SRC:1242-1257 under the df1-1 gate with claims/*.json entries; each citation anchors on the operand byte that ENCODES the value (not adjacent loads)
- **AC4:** no full-frame strobe (ADR-0005 photosensitivity gate); no new DOM/clock references in core; the render reads the player's simulated screen position and draws deterministically by palette index alone

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (setup) — premise verified current, two notes for TEA/Dev
- **Premise confirmed against the current tree.** The player blip is genuinely still un-drawn — the code's own comments say so: `plugins/defender/src/core/scene.ts:193` ("STILL df7's beyond this story: the scanner SCREEN-ADDRESS/player-blip (:1242-1257)") and `plugins/defender/src/core/scanner.ts:28`. df5-7's attacker blips + score/men HUD and df7-5's bezel already compose in the **pure core** `composeFrame` in `core/scene.ts` (see `SCANNER_ORIGIN_Y` at scene.ts:194). The player blip goes in the SAME place — pure core, palette-INDEX only.
- **Stale-wording note (not a blocker):** `core/scanner.ts:28` loosely calls the player blip "the SHELL's df7/HUD" concern. That wording is misleading — the epic and the df5-7/df7-5 precedent put ALL scanner+HUD raster composition in pure `core/scene.ts` `composeFrame`. Draw the blip in **core**, not shell. Worth correcting that comment while here.
- **Base branch:** feature branch was cut from `develop` (gitflow), PR targets `develop`. Claim pushed (`feat/df7-8-scanner-player-blip-render`, commit stamping `in_progress` + story context) so the story is sibling-visible.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## SM Assessment

**Setup verified, premise confirmed current, ready for TEA (RED).**

- **Premise holds against the current tree.** The scanner player blip is genuinely still un-drawn — the code's own comments confirm it: `plugins/defender/src/core/scene.ts:193` ("STILL df7's beyond this story: the scanner SCREEN-ADDRESS/player-blip (:1242-1257)") and `plugins/defender/src/core/scanner.ts:28`. No stale premise, no PARKED banner, no either/or AC.
- **Location is settled.** df5-7's attacker blips + score/men HUD and df7-5's bezel already compose in the **pure core** `composeFrame` in `core/scene.ts` (`SCANNER_ORIGIN_Y` at scene.ts:194). The player blip draws in the SAME place — pure core, palette-INDEX only, inside the df7-5 bezel.
- **Note for TEA/Dev (not a blocker):** `core/scanner.ts:28` loosely calls the player blip "the SHELL's df7/HUD" concern. Misleading — the epic + df5-7/df7-5 precedent put ALL scanner/HUD raster composition in pure `core/scene.ts`. Draw it in core; worth fixing that comment while here.
- **Gates carried into the ACs:** df1-1 citation gate (cite AMODE1.SRC:1242-1257, anchor each claim on the operand byte that ENCODES the value — read the whole *PLAYER BLIP OUTPUT routine to its RTS), purity (core stays clock/DOM-free, palette-index only), ADR-0005 (no full-frame strobe — a single small white blip is safe).
- **Claim pushed:** branch `feat/df7-8-scanner-player-blip-render` (cut from `develop`, PR targets `develop`), commit stamps `in_progress` + story context — story is sibling-visible.

## Design Deviations

No deviations logged at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## TEA Assessment (RED)

**RED verified clean: 7 df7-8 failures, 1038 other defender tests green (no collateral damage).**

Two new test files, both BLACK-BOX (pin behaviour/citations, never an internal constant, export name, or the exact column formula — GREEN re-derives the layout to our centred strip, the df5-7/df7-5 precedent):

- **`tests/df7-8-identity.test.ts`** (AC3, citation gate) — reads ONLY the claims, independently RED. Asserts `claims/15-scanner.json` pins the two operative bytes df7-8 draws by: `LDD PLAXC` (AMODE1.SRC:1242 — the player-position source) and `LDD #$9099` (:1253 — the WHITE index-9 marker value). `:1223` is the green anchor (proves the file reads the gate, not a tautology). 2 fail / 1 pass.
- **`tests/df7-8-player-blip.test.ts`** (AC1/AC2/AC4, black-box over `composeFrame`) — isolation: with no live attacker the strip band holds only the df7-5 bezel (index-9 rails at the two END columns) + the future marker (index-9 INTERIOR); stars walk indices 1..7 only (never 9) and the HUD is off-strip, so an interior index-9 cell can ONLY be the player marker. Tests:
  - a WHITE (index 9) marker exists between the bezel rails (existence also pins the WHITE colour — a wrong-index marker stays RED);
  - the marker sits STRICTLY inside the df7-5 bezel (both rails still frame it);
  - the marker ROW tracks ship Y as `Y>>3` (SCANNER_Y_SHIFT), pinned by a RELATIVE row delta (no hardcoded strip origin);
  - the marker COLUMN is **camera-INVARIANT** — the ROM's PLAYER path (`LDD PLAXC`, :1242) never subtracts the camera/XTEMP, unlike an attacker blip (`SUBD XTEMP`, :1261), so it holds its column as the world scrolls. **This is the decisive faithfulness pin: it proves GREEN drew the PLAYER marker, not a second attacker blip.**
  - ADR-0005: the marker is a SMALL bounded overlay (≤8 interior cells), deterministic (same state → identical digest), and never leaks onto the GAME OVER screen (must be drawn with the scanner strip, after the `gameOver` early-return).

### Rule Coverage

| Project rule / gate | How df7-8 tests enforce it |
|---|---|
| **df1-1 citation gate** (every drawn constant cited, anchored on the value byte) | `df7-8-identity.test.ts` requires claims covering :1242 (PLAXC) and :1253 ($9099 = index 9). Dev must add both to `claims/15-scanner.json`; `tests/audit/citations.test.ts` then byte-checks the verbatim. |
| **Palette INDEX only, never a resolved/hex colour** | Marker asserted as palette index 9 (WHITE) via the interior index-9 existence pin; a hex/RGBA or out-of-range index leaves the interior empty → RED. |
| **ADR-0005 / Decision B — no full-frame strobe** | Small-overlay bound (≤8 cells) + determinism digest + no-marker-on-GAME-OVER guard. |
| **src/core purity (clock/DOM-free)** | Auto-covered by existing `tests/purity.test.ts` (scans `core/scene.ts`); the determinism test also reddens if the marker read a clock/entropy. No new purity test needed. |

### Notes for Dev (Korben)
- Draw the marker in **pure `core/scene.ts` `composeFrame`** (a `drawPlayerBlip` alongside `drawScannerBezel`/`drawScanner`), AFTER the `state.gameOver` early-return, by palette **index 9**. Derive the radar column from the player's **screen** position (`state.ship.x` — the PLAXC analog, camera-invariant), the row from `state.ship.y >> SCANNER_Y_SHIFT`, placed inside the centred 64-col strip. Do NOT route it through `projectScanner` (that's the camera-relative attacker path).
- **Stale-comment cleanup (SM note):** `core/scanner.ts:28` loosely calls the player blip "the SHELL's df7/HUD" concern — misleading; it's drawn in pure core here. Correct that wording while implementing. Also update the `scene.ts:192-193` header ("STILL df7's beyond this story: ... player-blip (:1242-1257)") once drawn.
- Add the two `claims/15-scanner.json` entries (:1242 `LDD\tPLAXC`, :1253 `LDD\t#$9099`) with EXACT verbatim from the vendored source; the tab characters matter for the citations byte-check.
## Dev Assessment (GREEN)

**GREEN: 1045/1045 defender tests pass; citations + purity audits green; `tsc --noEmit` clean.**

Implemented `drawPlayerBlip` in pure `core/scene.ts` (`composeFrame`), drawn after the `gameOver` early-return, alongside `drawScannerBezel`/`drawScanner`:
- **Column** derives from the player's own world position `wrap16(camera + ship.x<<8)` projected through the df5-1 `projectScanner`. Because both the player's world-x and the scanner-left carry the camera, it cancels in `worldX - scannerLeft` → the marker is **camera-INVARIANT** (holds its column as the world scrolls), matching the ROM's PLAXC path that never subtracts XTEMP. Default ship.x=32 → radar column 35 of 64 (interior).
- **Row** = `ship.y >> SCANNER_Y_SHIFT` (via projectScanner), placed at `SCANNER_ORIGIN_Y + blip.y`, inside the df7-5 bezel band.
- **Marker**: a short 3-row WHITE (palette index 9, `$9099` :1253) vertical tick — small overlay, no strobe (ADR-0005). Guarded so it clips to the frame.
- **Citations**: added `SCAN-PLAYER-POS` (:1242 `LDD PLAXC`) and `SCAN-PLAYER-MARK` (:1253 `LDD #$9099`) to `claims/15-scanner.json`; byte-checked green by `citations.test.ts`.
- **Comment fixes**: corrected `scanner.ts:28` (dropped the misleading "SHELL's concern" wording — the blip is drawn in pure core) and the `scene.ts` scanner header (player-blip no longer "STILL df7's beyond this story").

### Design Deviation (for Reviewer)
TEA's Dev note said "do NOT route it through `projectScanner` (that's the camera-relative attacker path)." I **did** reuse `projectScanner`, but fed it the player's **own** world position rather than an attacker's — so the camera cancels and the result is camera-invariant, satisfying the camera-invariance test. Rationale: this honours **Decision A** (one radar geometry, not a second re-derivation), keeps the player marker's column/row consistent with the attacker blips it sits beside, and is DRY. The behaviour TEA specified (camera-invariant, row=Y>>3, inside the bezel) is unchanged — only the mechanism differs. All 10 df7-8 tests pass, including the camera-invariance pin.
## Subagent Results

**Cycle: 1**

**All received:** Yes (all 3 enabled subagents — preflight, security, rule-checker — returned; the other 6 are disabled via `workflow.reviewer_subagents` and were assessed first-hand)

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1045/1045 defender tests green, tsc clean, citations audit 28 pass, zero smells (console.log/debugger/.only/as any/@ts-ignore = 0) |
| 2 | reviewer-security | Yes | clean | none | Concurred — purity holds; all fb writes bounds-guarded on a Uint8Array; PLAYER_BLIP_COLOUR=9 in-range; no strobe; no injection in claims JSON |
| 3 | reviewer-rule-checker | Yes | findings | 2 (F1 Med, F2 Low — documentation) | Both CONFIRMED & adopted after first-hand re-verify — live-mutation-tested drawPlayerBlip deletion (5 reds), row-shift (1 red), camera term (1 red), citation byte (7 reds via full suite): tests non-vacuous, citations byte-checked |
| 4 | reviewer-edge-hunter | No | disabled | none | Skipped / disabled (workflow.reviewer_subagents) — edge cases assessed first-hand (bounds/wrap-seam/degenerate inputs in Devil's Advocate) |
| 5 | reviewer-silent-failure-hunter | No | disabled | none | Skipped / disabled — no swallowed errors/silent fallbacks in the diff (no try/catch, no `??`/`||` defaulting introduced) |
| 6 | reviewer-test-analyzer | No | disabled | none | Skipped / disabled — test quality assessed first-hand + via [RULE]'s live mutation of every df7-8 test |
| 7 | reviewer-comment-analyzer | No | disabled | 2 (via first-hand) | Skipped / disabled — **this is the citation/comment specialist; I assessed its lane first-hand, which is how F1/F2 were caught** |
| 8 | reviewer-type-design | No | disabled | none | Skipped / disabled — no new types/interfaces introduced (reuses `ScannerObject`, `Framebuffer`, `SimState`) |
| 9 | reviewer-simplifier | No | disabled | none | Skipped / disabled — assessed first-hand: `drawPlayerBlip` reuses `projectScanner` (Decision A), no duplication/over-engineering |

**Working-tree audit:** `pf reviewer audit-tree` initially flagged `epic-df6.yaml`/`epic-df7.yaml` (exit 0, tracking-only — the pf status stamp + a harmless df6 key reorder, NOT source mutations; the rule-checker's live mutations were reverted cleanly). Reverted both tracking writes; re-ran audit → **CLEAN**. Confirmed the source/test diff (`git diff develop...HEAD`) is byte-identical to the committed HEAD.

## Reviewer Assessment

REJECTED — 2 confirmed documentation findings (1 Medium, 1 Low). The IMPLEMENTATION is correct, faithful, and verified; the rejection is solely to correct a false mechanism claim I introduced in a core-source comment (the class the disabled `comment_analyzer` exists to catch) plus its companion stale cross-reference. Both are one-line fixes.

### Specialist subagent coverage
- **[SEC]** (reviewer-security): CLEAN, zero findings — purity holds, all framebuffer writes bounds-guarded on a `Uint8Array`, `PLAYER_BLIP_COLOUR=9` in-range, no strobe, no injection surface in the claims JSON. I concur (verified the bounds/palette claims against the diff myself).
- **[RULE]** (reviewer-rule-checker): FINDINGS — checked all 30 TS checks + 3 additional (citation-gate/purity/ADR-0005); 2 confirmed comment defects (F1, F2 below). It live-mutation-tested `drawPlayerBlip` deletion, the row-shift, the camera term, and the citation byte (all reddened as expected), confirming the tests are non-vacuous and the citations are byte-checked. I independently re-verified both findings (grepped MTERR consumers, read the df7-5 header lines) before adopting them.
- reviewer-preflight (mechanical): all green — 1045/1045 tests, tsc clean, citations audit 28 pass, zero smells.

### What is CORRECT (verified, not assumed)
- **Behaviour:** `drawPlayerBlip` draws a WHITE (index 9) tick at the player's own radar column. Camera-invariance is **provably true** — worked the modular arithmetic myself (`playerWorldX − scannerLeft = wrap16(camera+shipX·256) − wrap16(camera−OFFSET) = shipX·256 + OFFSET (mod 216)`; the camera cancels exactly) and the rule-checker independently confirmed it against the real ROM (AMODE1.SRC:1242-1258 has no `SUBD XTEMP`; PLAXC/PLAYC are adjacent 1-byte fields, so `LDD PLAXC` loads A=screen-X / B=screen-Y).
- **Bounds/safety:** `blip.x ∈ 0..63` (wrap16 then >>10), every fb write gated by an explicit x/y bounds check on a `Uint8Array` — no OOB. Palette-index-only. No strobe (3-row static tick). Pure (no clock/DOM/entropy). Not drawn on the GAME OVER screen (after the early-return).
- **Citations (df1-1):** `SCAN-PLAYER-POS` (:1242 `LDD PLAXC`) and `SCAN-PLAYER-MARK` (:1253 `LDD #$9099`) are byte-verified by the full-suite claims audit (mutation-tested: corrupting the verbatim byte reddens 7 audit files). Correctly anchored on the operative instruction encoding each value.
- **Tests:** non-vacuous — mutation-tested live by the rule-checker. Row-delta test derives its expectation from the imported `SCANNER_Y_SHIFT` (not test-local). Stars are algebraically index 1-7 only, so the index-9 interior scan cleanly isolates the player marker.

### Findings

**[MEDIUM][RULE] F1 — `plugins/defender/src/core/scanner.ts:27` — false compound comment claim (rule #17)**
The comment this diff edited now reads: *"The screen-address base (SCANER-1, column-major addressing) **and the mini-terrain line (MTERR)** are re-derived to our centred strip elsewhere."* The screen-address-base half is true (the `originX` centring). The MTERR half is **false**: MTERR appears only as transcribed byte data in `plugins/defender/src/core/terrain-data.ts` (`encoding: 'stream'`); a repo-wide grep finds **no `drawMiniTerrain`, no rendering consumer** of it anywhere in `src/core` or `src/shell`. Nothing re-derives MTERR. The pre-df7-8 wording ("the SHELL's df7/HUD concern") was weaker but not false; this edit introduced a false present-tense mechanism claim.
*Failure scenario:* a future reader implementing the mini-terrain radar line trusts the comment, greps for the "elsewhere" that re-derives MTERR, finds nothing, and loses time — or worse, assumes it is already drawn.
*Fix:* drop MTERR from the "re-derived elsewhere" clause and state it is transcribed as data but **not yet drawn** (still deferred), e.g. "The screen-address base (SCANER-1) is re-derived to our centred strip; the mini-terrain line (MTERR) is transcribed as data (terrain-data.ts) but not yet drawn."

**[LOW][RULE] F2 — `plugins/defender/tests/df7-5-hud-scanner.test.ts:13` (and :22) — stale cross-reference after this diff's retirement (rule #24)**
The df7-5 test's header says *"scene.ts's header records the player-blip (:1242-1257) as still df7's"* and (:22) *"The player-blip (:1242-1257) is in the ROM and named as df7's, but is NOT in df7-5's ACs."* This diff changed scene.ts's header to attribute the player blip to **df7-8** (now drawn), so the present-tense claim about scene.ts's current header is stale. The df7-5 narrative "df5-7 left the player-blip to df7" remains accurate — only the reference to scene.ts's *current* header is now wrong.
*Failure scenario:* a reader of the df7-5 test believes scene.ts still defers the player blip, contradicting the shipped code.
*Fix:* update the two lines to past tense / note df7-8 now ships it (a light touch — this is historical narrative in another story's test).

### Devil's Advocate
Assume this code is broken and hunt. **Could the marker land out of bounds and corrupt the frame?** No: `blip.x` is `wrap16(...)>>10` ∈ 0..63, so `x ∈ 114..177 < width`, and every write is gated on x/y bounds against a `Uint8Array` (an OOB index would no-op anyway). **Could a degenerate `ship.x`/`ship.y`/`camera` (0, negative, huge) break it?** `ship.x<<8 + camera` is `wrap16`'d to 16 bits before the shift; `ship.y>>3` is bounded by the ship's freeze logic to the playfield; the bounds guard covers the rest. `0` is a legitimate value, not a nullish-defaulted degenerate (#21 checked). **Could the camera-invariance be a coincidence that breaks at the wrap seam?** The subtraction is modular in the same $10000 cylinder the whole scanner uses; an object at the seam plots on the correct side (the df5-1 property this reuses), so the seam is handled by construction, not luck. **Could the tests be measuring themselves?** The rule-checker live-mutated three mechanisms and the citation byte and got targeted reds each time; the row test imports the real shift constant; stars are provably never index 9, so the interior scan isn't a token match on unrelated pixels. **Could the marker strobe for a photosensitive player?** It's a 3-row static single-colour tick, deterministic frame-to-frame (determinism test green) — no per-frame toggle, far under any large-area threshold. **What would a confused reader misunderstand?** Exactly the two comment findings above — the MTERR "re-derived elsewhere" claim and the df7-5 stale header reference. Those are the only real defects, and both are documentation, not behaviour. Nothing in the runtime path, the citations, the purity boundary, or the safety envelope is broken. The rejection is a comment-accuracy pass, not a correctness one.

**Verdict:** REJECTED
## Dev Assessment (GREEN — rework round 1)

**Both round-1 review findings fixed (comment-only); 1045/1045 defender tests green, tsc clean.**

- **F1 [MED] scanner.ts:27** — split the false compound claim. The screen-address base IS re-derived to our centred strip (the shared `originX` centring); MTERR is now correctly described as **transcribed as data (terrain-data.ts) but not yet drawn anywhere — still deferred df7 work**. No more false "re-derived elsewhere" claim for MTERR.
- **F2 [LOW] df7-5-hud-scanner.test.ts:13,22** — reworded the two stale present-tense references to past tense, noting df7-8 later shipped the player blip in core/scene.ts. The df7-5 historical narrative ("df5-7 left the player-blip to df7") is preserved and now accurate.

No behaviour changed — comment/documentation only. Commit `a598fb86` pushed (also carried two tracking-YAML lines from the review-machinery re-stamp: epic-df7 verdict stamp + a harmless epic-df6 key reorder — no-op, left as-is). Ready for Reviewer round 2.
## Subagent Results

**Cycle: 1**

**All received:** Yes (re-review after rework — all 3 enabled subagents re-run against the rework diff `a598fb86`; method: fresh re-run PLUS targeted re-verification of both round-1 findings)

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1045/1045 defender tests green, tsc clean, citations audit 28/28, zero smells; both round-1 findings confirmed FIXED |
| 2 | reviewer-security | Yes | clean | none | Concurred — rework is comment/doc-only, no runtime change, no new surface; purity/palette-index/ADR-0005 all still hold |
| 3 | reviewer-rule-checker | Yes | clean | none | Both round-1 findings verified FIXED by repo-wide grep + code reads (MTERR never blitted — TERRAIN_BLOCK hard-coded to 'TDATA'; F2 rewording matches scene.ts's current header). Fix introduced no new issues (#13/#17/#24 clean) |
| 4 | reviewer-edge-hunter | No | disabled | none | Skipped / disabled — no new logic in the rework diff |
| 5 | reviewer-silent-failure-hunter | No | disabled | none | Skipped / disabled — no error-handling code touched |
| 6 | reviewer-test-analyzer | No | disabled | none | Skipped / disabled — comment-only test edit; test behaviour unchanged (1045/1045 green) |
| 7 | reviewer-comment-analyzer | No | disabled | none | Skipped / disabled — the comment lane assessed first-hand + by [RULE]; both edited comments verified true |
| 8 | reviewer-type-design | No | disabled | none | Skipped / disabled — no types touched |
| 9 | reviewer-simplifier | No | disabled | none | Skipped / disabled — no logic touched |

**Working-tree audit:** `pf reviewer audit-tree` flagged only `epic-df7.yaml` (the pf status-stamp re-write, tracking-only, exit 0). Reverted; re-ran → **CLEAN**. Confirmed the source/test tree is byte-identical to committed HEAD `a598fb86`.

## Reviewer Assessment

APPROVED (re-review; supersedes the round-1 REJECTED verdict) — both round-1 findings are genuinely fixed, no new issues, all cycle-2 subagents clean.

### Round-1 findings — disposition
- **F1 [MED] scanner.ts:27 — FIXED.** The comment no longer claims MTERR is "re-derived elsewhere." It now correctly reads: the screen-address base IS re-derived (the shared `originX` centring — verified at scene.ts:221/240/268), and MTERR "is transcribed as data (terrain-data.ts) but is not yet drawn anywhere — still deferred df7 work." Re-verified true by repo-wide grep: MTERR appears only in `terrain-data.ts` (data + doc), the transcription tool, byte-transcription tests, and this comment — and `TERRAIN_BLOCK` is hard-coded to `'TDATA'`, so MTERR is never blitted. No rendering consumer anywhere.
- **F2 [LOW] df7-5-hud-scanner.test.ts:13,22 — FIXED.** Both references reworded to past tense noting df7-8 shipped the player blip in core/scene.ts. Verified accurate against scene.ts's current header (df7-8 commit 7efc6ebd retired the "STILL df7's ... player-blip" line and added `drawPlayerBlip` attributed to df7-8).

### Specialist subagent coverage (cycle 2)
- **[SEC]** reviewer-security: CLEAN — rework is comment/doc-only, no new surface; core purity, palette-index, ADR-0005 all still hold.
- **[RULE]** reviewer-rule-checker: CLEAN — both findings verified fixed with grep + code reads; no fix-introduced regression (#13/#17/#24). I independently re-verified F1 (MTERR grep) and F2 (past-tense reword) before adopting.
- reviewer-preflight (mechanical): all green — 1045/1045 tests, tsc clean, citations 28/28, zero smells.

### Devil's Advocate (round 2)
Assume the fix broke something. **Could a comment edit change behaviour?** No — the diff is comment text plus tracking YAML; `tsc --noEmit` is clean and 1045/1045 tests pass, identical to pre-rework. **Did the new MTERR wording introduce a fresh false claim (#17)?** Checked both halves against code: the screen-address-base re-derivation is real (shared `originX`), and "MTERR not drawn anywhere" survives a repo-wide grep — no `drawMiniTerrain`, `TERRAIN_BLOCK === 'TDATA'` excludes it. True on both counts. **Did the F2 reword leave a NEW stale cross-reference, or contradict a sibling comment?** The rule-checker read the full `scanner.ts` and `df7-5-hud-scanner.test.ts` headers for a second conflicting claim — none. The df7-5 historical narrative ("df5-7 left the player-blip to df7") is preserved and accurate; only the now-false present-tense scene.ts-header reference was corrected. **Anything the round-1 approval envelope missed that this cycle should re-open?** The implementation, citations, purity, bounds-safety, and ADR-0005 envelope were all verified correct in round 1 and are untouched by the rework. Nothing is broken; the two documentation defects are closed with evidence.

**Verdict:** APPROVED
## Impact Summary (finish)

**FINAL STATE: APPROVED & MERGED (PR #610 → develop @ a76ac9fc). 0 blocking findings.**

Two-round story. Round 1 REJECTED on 2 documentation findings (both non-blocking severity), both FIXED in `a598fb86` and re-verified FIXED by all 3 enabled subagents in round 2:
- **F1 [MED] scanner.ts:27** — false "MTERR re-derived elsewhere" claim → corrected (MTERR is transcribed data, drawn nowhere; `TERRAIN_BLOCK` is hard-coded `'TDATA'`).
- **F2 [LOW] df7-5-hud-scanner.test.ts:13,22** — stale present-tense scene.ts-header reference → reworded past-tense.

Delivered: `drawPlayerBlip` (WHITE index-9 tick, camera-invariant, inside the df7-5 bezel, after the gameOver early-return) + two df1-1 citations (SCAN-PLAYER-POS :1242, SCAN-PLAYER-MARK :1253). Dev deviation (reused `projectScanner` with the player's own world position) reviewer-accepted — camera-cancellation verified, honours Decision A. All 4 ACs met.

Verification: defender 1045/1045; full monorepo 17911 passed / 0 failed; orchestrator 503/503; tsc clean; citations 28/28; purity green; trial-merge against current develop fully green. No deferred follow-ups.
