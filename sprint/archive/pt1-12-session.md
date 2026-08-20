---
story_id: "pt1-12"
jira_key: "pt1-12"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-12: missile-command: left/center/right mouse buttons should fire the corresponding missile base, like z/x/c

## Story Details
- **ID:** pt1-12
- **Jira Key:** pt1-12
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-12-mouse-buttons-fire-bases
- **PR:** (none yet)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T13:40:56Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T12:26:06Z | 2026-08-20T12:29:48Z | 3m 42s |
| red | 2026-08-20T12:29:48Z | 2026-08-20T12:38:50Z | 9m 2s |
| green | 2026-08-20T12:38:50Z | 2026-08-20T12:46:12Z | 7m 22s |
| review | 2026-08-20T12:46:12Z | 2026-08-20T12:59:19Z | 13m 7s |
| green | 2026-08-20T12:59:19Z | 2026-08-20T13:16:12Z | 16m 53s |
| review | 2026-08-20T13:16:12Z | 2026-08-20T13:25:08Z | 8m 56s |
| green | 2026-08-20T13:25:08Z | 2026-08-20T13:37:26Z | 12m 18s |
| review | 2026-08-20T13:37:26Z | 2026-08-20T13:40:56Z | 3m 30s |
| finish | 2026-08-20T13:40:56Z | - | - |

## Delivery Findings

**Forward (R2-N1, PROCESS — for a future tooling story, not pt1-12 scope):** the ROM-citation
guard (`plugins/missile-command/tests/citations.test.ts` / `check-citations.mjs`) sweeps only
`docs/rom-study/{brief,subsystems,glossary}.md` — never inline `.ts` comments. So an inline
`W3MAIN:NNN` cite is unchecked by CI, and (as pt1-12 rounds 2–3 showed) a reviewer grepping the
raw `.MAC` can false-flag a correct *logical-ordinal* cite. A future story could extend the sweep
to inline `.ts` citations (resolving the logical/physical convention) to catch both real errors and
spurious re-flags mechanically.

## Design Deviations

(none logged by TEA/Dev as formal deviations)

### Reviewer (audit)

- **Dev's post-GREEN test hardening (`1ac836ae`, disclosed in the Dev Assessment):** editing a
  TEA-authored RED test during the GREEN phase to strengthen the mousedown wiring guard →
  ✓ ACCEPTED by Reviewer: the change is strictly stronger (windowed slice + `mousedownReducer\(`
  call anchor), stays green, and was disclosed. **Residual, now F2:** the SAME hardening was NOT
  applied to the sibling `contextmenu` guard, which still uses a bare whole-file
  `indexOf('contextmenu')` — an asymmetry that is exactly rule #15 and is the second blocking
  finding. Fix both guards to the same declaration-anchored standard.
- **Dev's "delegation over a second reducer" design note:** ✓ ACCEPTED — routing
  `mousedownReducer` through the real `fireOrStart` (not a duplicated phase machine, and NOT
  `keydownReducer`) is the correct level; it is why the mouse path provably mirrors Z/X/C and
  cannot drift. No undocumented spec deviations found beyond the findings above.

## SM Assessment (setup)

**Premise verified against the current tree (not stale):**
- The z/x/c keyboard mapping to the three bases already exists at
  `plugins/missile-command/src/shell/input.ts:117-121` (`case 'z' / 'x' / 'c'`). This is
  the shape to mirror for the mouse buttons.
- No mouse-button (`mousedown`), button-index, or `contextmenu` handling exists anywhere
  in `plugins/missile-command/src/shell/`. Today's mouse handling is pointer-lock motion
  driving the crosshair only — so the mapping is a genuine addition, and TEA has a
  specifiable RED (assert a button-index → base firing that does not exist yet).

**Boundary reminder for TEA/Dev:** button→base mapping is shell (`shell/input.ts`), not
core. The pure sim in `plugins/missile-command/src/core/` stays untouched; the purity
guard scans `src/core/` source text and will redden if input plumbing leaks in.

**Scope (from the story):** left button (0) → alpha/left base, middle (1) → delta/center,
right (2) → omega/right — the same three bases z/x/c fire. Right-click must
`preventDefault()` the context menu so button 2 fires omega instead of opening the browser
menu.

**Claim pushed:** branch `feat/pt1-12-mouse-buttons-fire-bases` on origin (empty claim +
context/stamp commit), story stamped `in_progress`. Sibling probes clean at setup — no
other checkout owns pt1-12 (a-2 is on pt1-3).

## TEA Assessment (red)

**RED committed:** `3f26330c` — `tests/pt1-12-mouse-buttons-fire-bases.test.ts`, 30 failing
tests. Full missile-command project: 30 failed / 1452 passed. `npm run lint` (tsc --noEmit)
GREEN — the variable-specifier + `/* @vite-ignore */` RED-import idiom keeps the release
gate clean while the two new exports are absent.

**The contract Dev (Loki) implements — two new exports on `src/shell/input.ts`:**
1. `fireButtonToBase(button: number): number | null` — MouseEvent.button 0 (left)→0
   (alpha/left), 1 (middle)→1 (delta/centre), 2 (right)→2 (omega/right); null for any other
   button. The mouse mirror of `fireKeyToBase`; the tests pin `fireButtonToBase(b) ===
   fireKeyToBase(z/x/c)` so the two mappings can never drift.
2. `mousedownReducer(button: number, state: GameState): GameState` — behaves **exactly like
   the Z/X/C key path** (`fireOrStart`) for the mapped base. The strongest anchor is Group 3:
   `mousedownReducer(button, s)` must deep-equal `fireOrStart(key, s)` in **every** phase
   (play/pause/entry/attract/over). The DRY green: map button→base (or button→key char) and
   delegate to the existing `fireOrStart`. Do **not** route through `keydownReducer` — a mouse
   button must not toggle pause or type an initial (Group 3's entry/pause case pins this).
   Non-fire button → state unchanged. Pure, no mutation.

**Plus main.ts wiring (Group 5, source-text — main.ts runs top-level DOM side effects so
node can't import it, hence the fleet text-assertion idiom):**
- A `mousedown` listener that drives `mousedownReducer(event.button, game)` — and, like the
  keydown handler, drains sound + persists a changed high-score ladder.
- A `contextmenu` listener calling `preventDefault()` so right-click fires omega instead of
  opening the browser menu.
- Real acceptance is the owner/reviewer **screenshot** at `/missile-command/`: right-click
  fires the right base with no menu. The node tests pin the deterministic seam beneath it.

**Boundary:** all shell (`src/shell/input.ts`, `src/main.ts`). `src/core/` stays untouched —
the purity gate scans core source text and would redden if any input plumbing leaks in.

### Rule Coverage (lang-review/typescript.md)
- **#15 / #25 (source-text guards anchor the claim, scoped):** Group 5's `mousedown` test
  anchors to `addEventListener('mousedown'` + `mousedownReducer` + `.button` (not a bare
  token). The `contextmenu` test asserts both markers are found, then requires
  `preventDefault(` **within a 200-char window** of the handler — not merely somewhere in the
  file — so an unrelated preventDefault could not satisfy it.
- **#18 / #26 (no self-referential / vacuous assertions):** every equivalence in Group 3
  compares against `fireOrStart` — real, built code — over a real `createPlayGame(1)`
  GameState; no assertion's terms are all test-local.
- **#15 CONTROL (mutation-real gates):** Group 4 proves the same board in `play` genuinely
  fires from every button, so Group 2/3's ammo-0 / dead-base / entry / pause "inert" cases
  are testing a real suppression, not a board that never fires.
- **#8 test quality:** no vacuous assertions — every test checks a value (ABM count, ammo,
  soundEvent kind, phase, or a deep-equal), no `let _ =`, no `assert(true)`.
- N/A: React/JSX (#6), async/Promise (#7), input-validation (#10), enum (#3) — none in scope
  for a pure mapping + reducer + DOM-wiring story.

## Dev Assessment (green)

**GREEN committed:** `fb1adeb3`. pt1-12 file 30/30; full missile-command project 1482/1482
(82 files, incl. the core `purity` gate — the change is shell-only); `npm run lint`
(tsc --noEmit) GREEN. No shared code or other game touched.

**What shipped (both files under `plugins/missile-command/src/shell/`):**
- `input.ts` — `fireButtonToBase(button)`: `switch` 0→0, 1→1, 2→2, else null (the mouse
  mirror of `fireKeyToBase`, same `FIREMA` switches). `mousedownReducer(button, state)`:
  resolves the base via `fireButtonToBase`, returns state unchanged for a non-fire button,
  otherwise **delegates to the existing `fireOrStart`** under that base's key
  (`BUTTON_FIRE_KEYS = ['z','x','c']`). One delegation, zero duplicated phase logic — which
  is exactly why Group 3's deep-equal-to-`fireOrStart` holds in every phase.
- `main.ts` — imported `mousedownReducer`; added a canvas `mousedown` listener driving it
  with `event.button` (same sound-drain + high-score-persist envelope as the keydown
  handler); added a canvas `contextmenu` listener calling `event.preventDefault()`.

**Design note — chose delegation over a second reducer.** TEA offered "map button→base OR
button→key char and delegate." I took button→base (so `fireButtonToBase` can be asserted
against `fireKeyToBase` directly) then keyed a 3-element `['z','x','c']` table for the
delegation. `keydownReducer` was deliberately NOT reused — it would let a mouse button
toggle pause / type an initial; `fireOrStart` is the correct level (fire semantics only).

**Post-GREEN test hardening (`1ac836ae`).** The dev-exit lang-review pass flagged the Group-5
`mousedown` wiring guard's two corroborators (`/mousedownReducer/`, `/\.button/`) as bare
whole-file matches — `mousedownReducer` was satisfied by the import line alone, so a broken
handler could theoretically pass on the scoped `addEventListener('mousedown')` anchor.
Hardened in place (rather than bounce it to review): windowed the corroborators to the
handler's 300-char slice and required an actual CALL (`mousedownReducer\(`) fed `.button`,
mirroring the contextmenu guard's own pattern. Strictly stronger; 30/30 still green.

## Dev Rework (round 1) — response to Reviewer findings

Commit `eec26500`. pt1-12 file 30→36 tests (+6), full missile-command 1488/1488, tsc clean.

- **F1 [rule #17] — FIXED.** Group 3's `PHASES` now enumerates all 7 `Phase` values
  (added `'setup'`, `'between'`), so the "EVERY phase" claim is literal. Both new phases fire
  (`fireOrStart → fireFromKey`), and `mousedownReducer` deep-equals `fireOrStart` in each — the
  +6 tests are green. The header comment now states all seven and their expected behaviour.
- **F2 [rule #15] — FIXED.** The contextmenu guard now anchors to
  `src.search(/addEventListener\(\s*['"]contextmenu['"]/)` + a 200-char handler slice requiring
  `preventDefault\s*\(`, structurally identical to the (test-analyzer-mutation-proven) mousedown
  sibling. The bare whole-file `indexOf('contextmenu')` is gone.
- **F3 [DOC] — FIXED.** `input.ts` and `main.ts` comments now keep the ROM symbol as
  `MFIREL/MFIREC/MFIRER — Left/Centre/Right` and state the ALPHA/DELTA/OMEGA battery names as a
  separate, clearly-labelled fact ("the story's terminology; the ROM's own symbols above are
  L/C/R"). No Greek label now sits inside the FIREMA-citation clause.
- **F4 [TEST] — FIXED.** Group 2 now asserts the launched ABM's `.target` equals `AIM` (the
  crosshair) and its `.origin` equals the firing base's `.pos` — fulfilling the `AIM` fixture's
  "checkable target" purpose directly, not just transitively.
- **F5 [rule #11] — NOT CHANGED (agreed with Reviewer).** `(e as Error).message` is a fleet-wide
  RED-loader idiom (~20+ identical instances). Changing this one file alone creates a lone
  inconsistency for no behavioural gain; the caught value in a dynamic-import loader is always
  Error-shaped. A repo-wide sweep is the right vehicle, out of this story's scope.
- **F6 [MAIN] — NOT CHANGED (verified structurally moot).** Middle-button autoscroll cannot fire:
  `index.html` sets `html,body{overflow:hidden}` (nothing scrollable) and pointer lock suppresses
  native mouse UI regardless. Adding `preventDefault()` for button 1 plus a test for a case that
  cannot occur is over-engineering. Left for the owner playtest to confirm middle-click fires
  delta cleanly; the one-line defensive guard remains cheap if a future layout makes the page
  scrollable.

## Review Correlation

All findings are INTERNAL (the Reviewer + the dev-exit lang-review gate). None external, none
CI. Every one maps to an EXISTING lang-review check or is project-specific — no NEW_CHECK, so
`.pennyfarthing/gates/lang-review/typescript.md` needs no new entry.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|----------------|-----------------|--------|
| F1 | reviewer | Group 3 claimed "EVERY phase" but `PHASES` covered 5/7 | EXISTING_CHECK | #17 (overreaching claim) | Dev missed it; fixed — all 7 phases now listed |
| F2 | reviewer | contextmenu guard used bare whole-file `indexOf('contextmenu')` | EXISTING_CHECK | #15/#25 (source-text guard not declaration-anchored) | Dev missed it; fixed — anchored to `addEventListener('contextmenu'` + slice |
| F3 | reviewer | `alpha/delta/omega` labels beside a citation encoding L/C/R | EXISTING_CHECK | #17 (comment provenance) | Fixed — ROM symbol (L/C/R) separated from the story's names |
| F4 | reviewer | `AIM` "checkable target" comment never fulfilled | EXISTING_CHECK | #18/#26 (fixture purpose unused) | Fixed — direct `.target`/`.origin` assertion added |
| F5 | reviewer | `(e as Error).message` casts instead of `instanceof` narrow | EXISTING_CHECK | #11 (error narrowing) | Deferred — fleet-wide RED-loader idiom (~20+ files); fix repo-wide, out of scope |
| F6 | reviewer | middle-button (1) autoscroll not `preventDefault`'d | NOT_APPLICABLE | — | Browser/layout-specific; structurally moot (`overflow:hidden`); owner playtest |
| G1 | gate (dev-exit lang-review) | the F3 fix introduced a NEW false "on-screen" provenance claim | EXISTING_CHECK | #17 (replacing a false claim with a second confident one) | Fixed same cycle — verified ALPHA/OMEGA = 0 in `reference/source/`; attributed to the story only, "the ROM draws no such text" |
| R2-F1 | reviewer (round 2) | `ABMLAU, W3MAIN:606` cited as a wrong line number (should be :1213/:1325) | NOT_APPLICABLE | — (rule #17/#33 do not apply) | **REFUTED** — `:606` is the correct LOGICAL ordinal (W3MAIN.MAC double-spaced; ABMLAU phys 1213; mc2-1 convention, `abm.test.ts:10-12`, `dossier-docs.test.ts:162-170`). Cite unchanged; added `(phys 1213)` clarifier to stop re-flagging |
| R2-N1 | reviewer (round 2) | citation guard (`citations.test.ts`) doesn't sweep inline `.ts` cites | PROCESS | — | Real but out-of-scope; a future tooling story could extend the sweep to inline `.ts` |

### Signal Summary
- **External findings: 0** (no PR reviewers / AI bots on this branch — no pipeline blind spots)
- **CI findings: 0**
- **Internal findings: 9** (6 Reviewer round-1 + 1 dev-exit gate + 2 Reviewer round-2)
- **New checks added: 0** — every finding maps to an existing check (#11, #15/#25, #17, #18/#26)
  or is NOT_APPLICABLE (F6, R2-F1) / PROCESS (R2-N1). The recurring class through round 1 was
  **#17** (F1, F3, G1). Round 2's R2-F1 was a **false positive** — a #17-style claim the reviewers
  themselves got wrong by grepping the raw physical `.MAC` line instead of honouring the
  double-spaced logical-ordinal convention; the standing lesson is to verify `W3MAIN:NNN` cites by
  the `.SBTTL`/label, not the raw line.

## Subagent Results

**Cycle: 1**

Method: re-ran ALL enabled subagents against the full diff for cycle 1 (not targeted
re-verification). Each was additionally told the round-1 findings and asked to confirm
resolution + hunt for anything the rework introduced.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1488/1488, lint clean, no smells |
| 2 | reviewer-edge-hunter | No | Skipped — disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped — disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A — F1/F2/F4 mutation-proven resolved, no new issues |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (R2-F1 citation); F3+G1 verified RESOLVED |
| 6 | reviewer-type-design | No | Skipped — disabled | N/A | Disabled via settings |
| 7 | reviewer-security | No | Skipped — disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped — disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (R2-F1, corroborates #5); #15 FIXED, #11 unchanged (fleet idiom) |

**All received:** Yes (4 enabled returned, 2 with findings; 5 disabled via settings)
**Total findings:** 1 MEDIUM confirmed (independently by two specialists + my own grep), 0 dismissed.
**Working-tree audit:** `pf reviewer audit-tree` exited 1 on the SAME pre-existing untracked
`sprint/archive/pt1-1-session.md` (present at session start; NOT deleted) plus the reverted
`epic-pt1.yaml` stamp. No `src/`/`.ts` dirty — test-analyzer cleaned its worktree
(`/tmp/mutation-scratch-pt112-*`). The documented false-DIRTY, not a left-behind mutation.

## Reviewer Assessment

**Verdict:** REJECTED (round 2 — rework)
**Round-Trip:** 2
**Blocking rule:** No Critical/High. Rejected on ONE confirmed finding matching two stated
project rules (lang-review #17 and the ROM-citation rule #33) — verified three ways
(comment-analyzer, rule-checker, and my own grep of `reference/source/W3MAIN.MAC`). Per
"PROJECT RULES ARE NOT SUGGESTIONS" this cannot be dismissed, and this repo's citation-accuracy
culture treats a citation that lands on unrelated code as fix-required. The fix is trivial.

**Round-1 findings — all VERIFIED RESOLVED this cycle:**
- F1 (rule #17 "EVERY phase") — FIXED; `PHASES` now all 7 values; mutation-proven the +6 tests
  are load-bearing (test-analyzer: guarding setup/between → exactly 6 red).
- F2 (rule #15 contextmenu guard) — FIXED; anchored to `addEventListener('contextmenu'` + slice;
  mutation-proven (drop `preventDefault` → the guard reddens). Rule-checker concurs.
- F3 (alpha/delta/omega vocabulary) — FIXED; ROM symbol (L/C/R) separated from the story's names.
- F4 (AIM checkable target) — FIXED; `.target`/`.origin` assertions mutation-proven load-bearing.
- G1 (my own F3-fix overreach: false "on-screen") — FIXED; verified ALPHA/OMEGA = 0 in
  `reference/source/`; comment now says "the ROM draws no such text".
- F5 (#11 catch-cast) — unchanged, correctly deferred (fleet idiom, ~20+ files).
- F6 (middle-button autoscroll) — unchanged, structurally moot (`overflow:hidden`).

### Findings (rework list)

**MUST FIX**

- **R2-F1 [DOC][rule #17 + #33][MEDIUM]** Wrong ROM citation `ABMLAU, W3MAIN:606`. Verified
  against `reference/source/W3MAIN.MAC`: `ABMLAU:` is at **:1213**, `FIREMA: .BYTE MFIREL,MFIREC,
  MFIRER` at **:1325**; **:606** is a blank line inside an unrelated `.WORD` dispatch table
  (PREGM2-1 / NUHICK-1), ~600–1300 lines off. The *symbols and behaviour are correct* — only the
  line-locator is wrong. `:606` pre-exists on `fireKeyToBase`'s docstring (mc1-4, outside this
  diff), but the pt1-12 diff **copy-pastes it into three NEW sites** without re-verifying — the
  #17 "a mechanical re-anchor is not a re-read" pattern, propagated rather than corrected:
  - `src/shell/input.ts` — the new `fireButtonToBase` docstring (`...ABMLAU, W3MAIN:606`)
  - `tests/pt1-12-...test.ts` — the GROUND TRUTH block (~L11) and the RED-catch error message (~L83)
  **Fix:** correct to `W3MAIN.MAC:1213` (ABMLAU) / `:1325` (FIREMA byte table) — or cite the
  section header `.SBTTL LAUNCH ABMS` without a brittle line number — at all three NEW sites.
  **Same-pass (strongly recommended, per "audit every constant in one pass"):** grep the whole
  missile-command tree for `W3MAIN:606` / the bare `:606` citation and fix the pre-existing
  `fireKeyToBase` instances too, so the wrong locator stops propagating and the same routine is
  not cited two different ways in one file. `[DOC][RULE]`

**NOTED (not blocking)**

- **R2-N1 [PROCESS]** The citation guard (`tests/citations.test.ts` / `check-citations.mjs`)
  sweeps only `docs/rom-study/{brief,subsystems,glossary}.md` — never inline `.ts` comments — so
  this wrong locator is invisible to CI and stayed green. Extending the sweep to inline `.ts`
  citations would have caught R2-F1 (and the pre-existing mc1-4 error) mechanically. Larger infra
  change, out of pt1-12's scope — filed as an observation for a future tooling story.

### Rule Compliance (delta from round 1)

reviewer-rule-checker re-ran all 33 rules / 21 instances on the current diff:
- **#15 (source-text guards):** now COMPLIANT (round-1 F2 fixed; contextmenu guard anchored).
- **#17 / #33 (comment mechanism / ROM citation):** VIOLATION → **R2-F1** (the `:606` locator).
- **#11 (error narrowing):** unchanged fleet idiom (F5, deferred).
- **#31 core/shell boundary:** COMPLIANT — no `src/core/` edits, `-t purity` green (29/29).
- All other rules COMPLIANT (type-safety, `.js` extensions, #18/#26 non-vacuous, #21/#22 NaN, etc.).

### Observations (≥5)

- `[VERIFIED]` R2-F1 confirmed by direct grep: `grep -nE "ABMLAU|FIREMA" W3MAIN.MAC` → ABMLAU :1213,
  FIREMA :1325; `sed -n '604,608p'` → unrelated `.WORD` entries. The `:606` cite lands on nothing related.
- `[VERIFIED]` Round-1 F1/F2/F4 mutation-proven resolved by test-analyzer in an isolated worktree.
- `[VERIFIED]` G1/F3 comment fixes verified against primary source (ALPHA/OMEGA = 0 in `reference/source/`).
- `[VERIFIED]` Core/shell boundary intact; `-t purity` 29/29; 1488/1488; lint clean.
- `[MEDIUM]` R2-F1 wrong `W3MAIN:606` citation at three new sites. `[PROCESS]` R2-N1 citation guard
  doesn't sweep `.ts`.

### Devil's Advocate

The product behaviour was already vetted and mutation-proven across two cycles; round 2's only
live question is whether R2-F1 is worth a rework or a note. Argue it's over-strict: the symbols
(MFIREL/MFIREC/MFIRER) and the L/C/R order are correct, the number is inherited from mc1-4, and no
player or test is affected — it's a comment. But the counter is decisive for THIS repo: a citation
is a promise that a reader can open `W3MAIN.MAC:606` and find the fire-switch table; they find a
blank line in a hi-score jump table instead, and every ROM claim in the file loses credibility by
association. The project's own culture ("citation claim must anchor", "audit every constant in one
pass") exists precisely because these errors compound — mc1-4 wrote `:606` once, pt1-12 copied it
to three more places, and the next mouse/fire story will copy it again. The cost of stopping it now
is one `sed`; the cost of shipping it is a permanent, propagating falsehood in the record that CI
cannot see. That asymmetry is why this blocks. No other round-2 concern survives: the wiring, the
phase gates, the ammo economy, and the NaN/degenerate-button handling are all mutation-proven.

### Reviewer (audit) — round 2

- R2-F1 is an UNDOCUMENTED deviation from the repo's citation-accuracy standard, introduced by
  copy-paste. Flagged, severity Medium, in the rework list above.
- All round-1 accepted deviations (delegation-over-second-reducer; post-GREEN test hardening) remain
  sound and are unchanged by the rework.

## Dev Rework (round 2) — R2-F1 is REFUTED (false positive), disambiguation added

Commit `849245fe`. 36/36, tsc clean. **R2-F1 ("`ABMLAU, W3MAIN:606` is a wrong line number,
correct to :1213/:1325") is a FALSE POSITIVE — the citation is correct as written.**

**Evidence (receiving-review verification, three independent sources + a direct measurement):**
- `W3MAIN.MAC` is **DOUBLE-SPACED** — a blank line between every code line. Verified:
  `sed -n '1209,1217p'` shows `.SBTTL LAUNCH ABMS` at physical 1211 and `ABMLAU:` at physical
  1213, blanks interspersed. `awk` counts **601 non-blank lines** through physical 1213.
- The **mc2-1 citation convention**: a bare `W3MAIN:NNN` (3-digit, no `.MAC` suffix) is a
  **LOGICAL non-blank ordinal**; the physical line sits ~2× lower. `606` is the logical ordinal
  for ABMLAU (physical 1213). A `W3MAIN.MAC:NNNN` cite (with `.MAC`, 4-digit) is physical.
- `tests/abm.test.ts:10-12` documents this verbatim: "W3MAIN is DOUBLE-SPACED, cites are logical
  non-blank lines ≈ physical/2 — grep the `.SBTTL`/label, not the raw line … **W3MAIN:606
  (ABMLAU, phys 1213)**". `tests/dossier-docs.test.ts:162-170` is a LIVE test asserting the
  distinction ("brief.md's :238/:606 are LOGICAL ordinals, the physical .SBTTL sits ~2× lower").
- The sibling inline cites all use `:606` too: `abm.ts:13`, `fire.test.ts:11`, `input.ts:17`,
  `input.ts:112` (the pre-existing `fireKeyToBase`). Changing pt1-12's to `:1213` would DESYNC
  it from the whole family and break the convention — the opposite of a fix.

**Why three reviewers flagged it:** the Reviewer + comment-analyzer + rule-checker each `grep`'d
`ABMLAU` in the raw `.MAC`, found physical 1213, and compared it to the cited `606` — the exact
"grep the raw line" trap `abm.test.ts:10-12` warns against. The root cause is that pt1-12's NEW
cites used a **bare** `W3MAIN:606` without the `(phys 1213)` clarifier the sibling GROUND TRUTH
blocks carry.

**What I did (NOT the suggested change):** kept `:606` everywhere; added the
`(logical ordinal; phys 1213)` clarifier at the three pt1-12 sites (the test GROUND TRUTH block,
the `fireButtonToBase` docstring, the RED-catch message) so the correct cite is self-documenting
and stops being re-flagged. Did **not** touch the pre-existing `fireKeyToBase`/`abm.ts` cites
(they are correct and out of scope; the R2-F1 "same-pass fixup" recommendation rested on the same
false premise).

**For the round-3 Reviewer:** please verify the convention (`abm.test.ts:10-12`,
`dossier-docs.test.ts:162-170`, and `awk 'NR<=1213 && NF>0' W3MAIN.MAC` → 601) rather than
re-grepping the raw physical line. R2-N1 (the citation guard doesn't sweep inline `.ts`) still
stands as a real but out-of-scope PROCESS observation — noted, not actioned here.

**For the Reviewer / owner — the one thing node can't prove.** The unit tests pin the
deterministic seam (button→base, ammo gate, phase gates, wiring-as-text). The on-screen
acceptance — at `/missile-command/`, right-clicking fires the omega base and **no** browser
context menu appears, and left/middle fire alpha/delta — is a live-input + pointer-lock
behaviour with no node surface, so it remains an owner/reviewer **screenshot** check (the
same boundary `input.test.ts`/`fire.test.ts` draw for the shell's DOM seam). Note the
existing `click`→pointer-lock handler still runs alongside the new `mousedown` fire: mousedown
fires, click locks — verify they coexist cleanly in the playtest.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped — disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped — disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (2 MED, 2 LOW), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed as ONE finding (LOW, downgraded), dismissed 0 |
| 6 | reviewer-type-design | No | Skipped — disabled | N/A | Disabled via settings |
| 7 | reviewer-security | No | Skipped — disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped — disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 1 (MED, #15), 1 downgraded LOW (#11 fleet idiom) |

**All received:** Yes (4 enabled returned, 3 with findings; 5 disabled via settings)
**Total findings:** 2 MEDIUM + 4 LOW confirmed, 0 dismissed, 0 deferred. No Critical/High.
**Working-tree audit:** `pf reviewer audit-tree` exited 1, but the ONLY dirty paths were
(a) `sprint/epic-pt1.yaml`'s pf tracking stamp `in_progress→in_review` (reverted with
`git checkout --`; HEAD is `in_progress`, the machinery re-manages it) and (b) the pre-existing
untracked `sprint/archive/pt1-1-session.md` (present at session start, another story's archive
— NOT deleted). **No `src/` or `.ts` file is dirty**, so no mutation-testing subagent left a
source change — the documented false-DIRTY on the status stamp. Test-analyzer ran its mutation
battery in a `git worktree` (`/tmp/mutation-scratch-mc-pt112`) and confirmed the live tree
untouched.

## Reviewer Assessment

**Verdict:** REJECTED (round 1 — rework)
**Round-Trip:** 1
**Blocking rule:** No Critical/High. Rejected on two confirmed findings matching STATED project
rules (lang-review #17 and #15) — per "PROJECT RULES ARE NOT SUGGESTIONS" these cannot be
dismissed, and the repo's documented bar treats an overreaching exhaustiveness claim and a
non-anchored source-text guard as fix-required. Both fixes are surgical and confined to the
test file; the shipped `src/` code is correct and needs no change.

**Data flow traced:** a mouse-button press on the canvas → `main.ts` `mousedown` listener →
`mousedownReducer(event.button, game)` → `fireButtonToBase(button)` (0/1/2→base, else null) →
`fireOrStart(BUTTON_FIRE_KEYS[idx], game)` → ammo-gated `fireFromKey` / phase transition →
`game` reassigned, `drain()` voices the launch/klaxon, high-score persisted on a changed
ladder. Right-click additionally hits the `contextmenu` listener → `preventDefault()` (menu
suppressed). Safe: `event.button` (not `.buttons`), strict `=== null` gate distinguishes base
`0` from no-base, delegation to the real `fireOrStart` inherits every phase gate.

### Findings (rework list)

**MUST FIX**

- **F1 [TEST][rule #17][MEDIUM]** `tests/pt1-12-...test.ts` Group 3 (`~L318–326`): the group
  header and every per-test title claim the equivalence runs "in EVERY phase", but `PHASES`
  lists only 5 of the 7 `Phase` values (`src/core/state.ts:17` —
  `attract|setup|play|pause|between|over|entry`). `'setup'` and `'between'` are never
  exercised. Behaviour there is actually correct (verified: `mousedownReducer` fires, mirroring
  `fireOrStart`), so this is a FALSE exhaustiveness claim + a narrow blind spot: a future
  mouse-path-only regression in exactly those two phases would pass undetected. **Fix:** add
  `'setup'` and `'between'` to `PHASES` so the "EVERY phase" claim is true. `[TEST]`

- **F2 [TEST][rule #15/#25][MEDIUM]** `tests/pt1-12-...test.ts` contextmenu guard (`~L283–291`):
  locates the listener with `src.indexOf('contextmenu')` — a bare-keyword scan of the WHOLE
  file — unlike its `mousedown` sibling three lines above, which anchors to the actual
  `addEventListener('mousedown'` registration via regex. It passes today only because the token
  `contextmenu` occurs once in `main.ts`; a future comment/string with that single word earlier
  in the file would silently redirect the 200-char window. **Fix:** anchor to
  `/addEventListener\(\s*['"]contextmenu['"]/` (regex + windowed slice), matching the hardened
  mousedown guard. `[TEST][RULE]`

**SHOULD FIX**

- **F3 [DOC][LOW]** `src/shell/input.ts:~129` and `src/main.ts:~159`: the base labels
  "alpha/delta/omega". Flagged by comment-analyzer, **downgraded** — they are NOT invented:
  they come verbatim from the user's story spec (`sprint/epic-pt1.yaml:127` — "left (alpha)
  base, center (delta), right (omega)"). Residual issue: (a) they sit in the same sentence as
  the `MFIREL/MFIREC/MFIRER` citation, which encodes Left/Centre/Right, not the Greek names,
  and (b) they diverge from the codebase's own vocabulary (`field.ts` uses `MISB1/2/3`;
  `fireKeyToBase` says left/centre/right). **Fix:** align to left/centre/right, or mark the
  Greek names as the game's/story's base names so they don't read as sourced from the FIREMA
  line. `[DOC]`

**NOTED (not blocking; Dev's discretion)**

- **F4 [TEST][LOW]** `tests/pt1-12-...test.ts:~210`: the `AIM` fixture's comment ("so a launched
  ABM has a checkable target") is never fulfilled — no test reads `.target` (covered
  transitively by Group 3's `toEqual`). Add a direct `out.abms[...].target` assertion in Group 2,
  or drop the comment. `[TEST]`
- **F5 [RULE #11][LOW]** `tests/pt1-12-...test.ts:76`: `catch (e) { ...(e as Error).message... }`
  casts instead of narrowing with `instanceof Error`. Fleet-wide RED-loader idiom (~20+
  identical instances). **Downgraded** — fixing here alone creates a lone inconsistency; better
  addressed repo-wide, out of scope. `[RULE]`
- **F6 [MAIN][LOW]** `src/main.ts:151`: the `mousedown` handler doesn't `preventDefault()` the
  middle button (button 1), whose browser default is autoscroll. **Downgraded** — `index.html`
  is `html,body{overflow:hidden}` (non-scrollable), so autoscroll structurally cannot fire, and
  it is suppressed under pointer lock regardless. Owner playtest should confirm middle-click
  fires delta cleanly; a defensive `preventDefault()` for button 1 is cheap if desired.

### Rule Compliance (lang-review/typescript.md + CLAUDE.md conventions)

Enumerated exhaustively by reviewer-rule-checker across 33 rules / 61 instances (spot-checked):
- **#1 type-safety, #4/#21 null/degenerate, #5/#32 `.js` extensions, #10 input-validation,
  #17 comment-mechanism (production comments), #22 NaN-safety, #26 non-local assertions,
  #31 core/shell boundary, #33 ROM-citation:** COMPLIANT. `fireButtonToBase` uses strict-
  equality `switch`/`default` (NaN/negative/non-integer → `null`); `mousedownReducer` gates on
  `=== null` (distinguishes base `0` from no-base); zero `src/core/` edits, `-t purity` green.
- **#15 source-text guards:** VIOLATION at the contextmenu guard → **F2**. The mousedown guard
  is compliant (declaration-anchored, hardened at `1ac836ae`).
- **#11 error narrowing:** VIOLATION at the loader `catch` → **F5** (fleet idiom, downgraded).
- **#17 exhaustiveness (test claim):** the "EVERY phase" title/comment overreaches → **F1**.

### Observations (≥5)

- `[VERIFIED]` Core/shell boundary intact — no `src/core/` change; `-t purity` green (29/29).
  Evidence: `git diff --name-only` = main.ts + shell/input.ts + test only.
- `[VERIFIED]` `mousedownReducer` inherits every phase gate by delegating to the real
  `fireOrStart` — entry/pause inert, attract→setup, over→restart traced against `input.ts:183–198`.
- `[VERIFIED]` `event.button` (not `.buttons`) is correct on `mousedown`; the `.button`→`.buttons`
  mutation reddened the guard.
- `[VERIFIED]` Wiring coexistence — `mousedown` (fire) and the untouched `click` (pointer-lock)
  are distinct DOM events; nothing `preventDefault`s `click`.
- `[MEDIUM]` F1 false "EVERY phase" claim (5/7). `[MEDIUM]` F2 contextmenu guard not anchored.
- `[LOW]` F3 alpha/delta/omega vocabulary; F4 AIM dead comment; F5 catch-cast; F6 middle-button.

### Devil's Advocate

Assume this is broken. Start with the gesture collision: a single left-click on the field now
does three things at once — `pointerdown` (audio unlock + `beginSetupOnInput`), `mousedown`
(fires the alpha base, spends a round, launches an ABM toward the *current* crosshair), and on
release `click` (requests pointer lock). So the very first click a player makes to engage
trackball aim ALSO fires a missile from the left base toward wherever the crosshair happens to
sit — plausibly a wasted round toward centre-field before they've aimed. Is that a bug? No —
the story says the left button fires the left base, so firing on left-press is specified; the
lock acquisition riding the same gesture is pre-existing and independent. But it is worth the
owner seeing once, because "click to start aiming" and "click to fire" are now the same
gesture. Next, the confused user: someone right-clicks expecting a menu (browser habit) and
instead fires omega and sees no menu — intended, but the screenshot check must confirm the menu
truly does not flash. The middle button: on a mouse without one, delta is unreachable by mouse
— acceptable, the X key remains. Could rapid input break state? `mousedownReducer` is pure and
ammo-gated, so button-mashing only empties magazines exactly as key-mashing does — no negative
ammo (fire-ammo economy tests hold), no unbounded ABM growth. Buttons 3/4 (back/forward) or a
synthetic `button: -1`/`NaN` all fall to `default → null → state unchanged` (Group 1 exercises
`NaN`/`-1`). The one genuine residue the DA surfaces that the tests do NOT cover is middle-click
autoscroll (F6) — but `overflow:hidden` structurally forecloses it. Nothing rises to
Critical/High; the DA reinforces that the two blocking items are test-integrity (F1 false
claim, F2 weak guard), not product defects.

## Subagent Results

**Cycle: 2**

Method: **targeted re-verification** of the sole open finding (R2-F1) — the gate-sanctioned
"stronger evidence" route, not a fresh generalist sweep. The round-2 rework was
comment/string-only (three disambiguation clarifiers; zero test-logic or production-logic
change), so re-running the full battery would only re-measure unchanged code. Each specialist's
cycle-1 result was re-verified against the current tree, corroborated by an INDEPENDENT
adversarial gate-verification pass (which re-ran the whole suite AND re-confirmed R2-F1 refuted
via `brief.md:79` + the `mc2-1` precedent) and my own direct source measurement
(`awk 'NR<=1213 && NF>0'` → 601; `sed -n '1209,1217p'` → double-spaced).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes — re-verified | clean | none | N/A — 1488/1488, lint clean, no smells |
| 2 | reviewer-edge-hunter | No | Skipped — disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped — disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes — re-verified | clean | none | N/A — no test-logic change; cycle-1 mutation proofs still hold; the RED-catch edit is a string |
| 5 | reviewer-comment-analyzer | Yes — re-verified | clean | none | its finding R2-F1 REFUTED (see below) & disambiguated; new `(phys 1213)` clarifier verified accurate |
| 6 | reviewer-type-design | No | Skipped — disabled | N/A | Disabled via settings |
| 7 | reviewer-security | No | Skipped — disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped — disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes — re-verified | clean | none | its finding R2-F1 REFUTED; #15 fixed & #11 unchanged (fleet idiom) both still hold |

**All received:** Yes (targeted re-verification, cycle 2 — 4 enabled re-verified, 5 disabled)
**Total findings:** 0 open. R2-F1 refuted; all prior findings resolved.
**Working-tree audit:** `pf reviewer audit-tree` exited 1 on the SAME pre-existing untracked
`sprint/archive/pt1-1-session.md` only (no worktree ran this cycle — targeted re-verify). No
`src/`/`.ts` dirty. Documented false-DIRTY.

## Reviewer Assessment

**Verdict:** APPROVED
**Round-Trip:** 2 (third review pass — REJECT r1, REJECT r2, APPROVE r3)
**Blocking rule:** No Critical/High, and no open Medium. Every prior finding is resolved or
refuted with evidence.

**Data flow (unchanged since round 1, re-confirmed):** mouse-button press → `main.ts` `mousedown`
listener → `mousedownReducer(event.button, game)` → `fireButtonToBase` → `fireOrStart(BUTTON_FIRE_KEYS[idx])`
→ ammo-gated fire / phase transition; right-click also hits the `contextmenu` listener →
`preventDefault()`. Mutation-proven across cycles 0–1.

### Findings — all closed

- `[TEST]` F1 (#17 EVERY-phase) & F2 (#15 contextmenu guard) & F4 (AIM target) — all FIXED and
  mutation-verified by reviewer-test-analyzer in cycle 1 (guarding setup/between → exactly 6 red;
  drop `preventDefault` → contextmenu guard red; swapped `launchAbm` args → target/origin red).
- `[DOC]` F3 (alpha/delta/omega vocab) & G1 (false "on-screen") — FIXED and source-verified by
  reviewer-comment-analyzer (ALPHA/OMEGA = 0 in `reference/source/`; ROM symbol L/C/R separated).
- `[RULE]` F5 (#11 catch-cast) — reviewer-rule-checker confirms unchanged fleet idiom, deferred.
- F6 (middle-button autoscroll) — structurally moot (`overflow:hidden`), owner playtest.
- `[DOC]` `[RULE]` R2-F1 (`W3MAIN:606`) — raised by both reviewer-comment-analyzer and
  reviewer-rule-checker; **REFUTED** (see below), cite kept + `(phys 1213)` clarifier added.
- **R2-F1 (`W3MAIN:606` "wrong line") — REFUTED as a false positive.** `:606` is the correct
  LOGICAL ordinal for ABMLAU (W3MAIN.MAC is double-spaced; physical label at 1213; `brief.md:79`
  literally anchors `` `:606 LAUNCH ABMS` ``; the mc2-1 convention, `abm.test.ts:10-12` +
  `dossier-docs.test.ts:162-170` (live test) + `mc2-1-session.md:67-70`). Three cycle-1
  specialists (incl. me) grepped the raw `.MAC` and fell into the exact trap `abm.test.ts:10-12`
  warns against. Dev correctly did NOT change the cite and added the `(phys 1213)` clarifier —
  the same remedy mc2-1 used for its own F2. **I re-verified this independently and adversarially
  and concur: the citation is correct.** My round-2 rejection on R2-F1 was itself the error;
  recorded honestly here so the archive is truthful.
- R2-N1 (citation guard doesn't sweep inline `.ts`) — real PROCESS gap, out of scope, forwarded
  to Delivery Findings for a future tooling story.

### Rule Compliance (final)

All lang-review checks and CLAUDE.md conventions satisfied: #15 (both source-text guards
declaration-anchored), #17 (every comment claim verified true — the `:606` cite is a correct
logical ordinal, the `phys 1213` clarifier is measured fact), #18/#26 (non-vacuous assertions),
#11 (deferred fleet idiom), core/shell boundary (no `src/core/`, `-t purity` green), `.js`
imports, ROM citations anchor real source (logical-ordinal convention honoured). *(Correction to
my round-2 wording: I labelled the ROM-citation concern "#33"; the lang-review checklist has 30
rules — ROM-citation is a CLAUDE.md convention I passed as an ADDITIONAL rule, not a numbered
lang-review check. No material effect.)*

### Observations (≥5)

- `[VERIFIED]` R2-F1 refuted 4 ways: my analysis, the adversarial gate-verifier (`brief.md:79`),
  the mc2-1 precedent, and `awk`/`sed` measurement of the double-spacing.
- `[VERIFIED]` Product behaviour (button→base, ammo gate, all 7 phase gates, NaN/degenerate
  buttons, wiring) mutation-proven across cycles.
- `[VERIFIED]` 1488/1488, lint clean, `-t purity` green, core untouched.
- `[VERIFIED]` The `(phys 1213)` clarifier is accurate and matches the sibling `abm.test.ts` style.
- `[PROCESS]` R2-N1 forwarded. `[LOW]` F6 owner-playtest item (structurally mitigated).

### Devil's Advocate

The only round-3 question is whether the approval is premature — could R2-F1 still be a real error
I'm now rationalizing away? Argue yes: three independent specialists flagged `:606`, and "the
convention says it's fine" is exactly what a confabulator would say. The refutation must be
falsifiable, not just confident. It is: `sed -n '1209,1217p' W3MAIN.MAC` shows blank lines between
every code line (double-spacing is a fact, not a claim); `brief.md:79` contains the literal string
`` `:606 LAUNCH ABMS` `` (the anchor exists in primary source, not just in inference); and a LIVE,
green test (`dossier-docs.test.ts:162-170`) asserts the logical-vs-physical distinction — if the
convention were fiction, that test would be red or absent. The suggested "fix" (`:606`→`:1213`)
would have DESYNCED pt1-12 from four sibling cites and inverted a documented, tested convention —
the opposite of correctness. So the approval is not rationalization; it's the evidence overturning
a mistaken finding (mine included). Everything else was already mutation-proven. Nothing blocks.

### Reviewer (audit) — round 3

- R2-F1 was a Reviewer error (mine), now corrected in the record. No open deviations.
- All accepted deviations from prior rounds stand. The story is faithful, correct, and complete;
  the sole remaining acceptance is the owner's `/missile-command/` screenshot (right-click fires
  the right base, no menu; left/middle fire alpha/delta) — the boundary node tests cannot cross.