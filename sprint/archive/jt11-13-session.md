---
story_id: "jt11-13"
jira_key: "jt11-13"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-13: High-score entry echo: paint the in-flight initials (and a cursor) on the entry screen

## Story Details
- **ID:** jt11-13
- **Jira Key:** jt11-13
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T14:12:30Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T13:44:57Z | 2026-08-13T13:47:37Z | 2m 40s |
| red | 2026-08-13T13:47:37Z | 2026-08-13T13:56:37Z | 9m |
| green | 2026-08-13T13:56:37Z | 2026-08-13T14:02:26Z | 5m 49s |
| review | 2026-08-13T14:02:26Z | 2026-08-13T14:12:30Z | 10m 4s |
| finish | 2026-08-13T14:12:30Z | - | - |

## Sm Assessment

**Story:** jt11-13 — High-score entry echo: paint the in-flight initials (and a cursor) on the entry screen (2pt, p1, joust, tdd).

**Board check (clean):** No remote branch owned jt11-13 before setup; only live sibling session was `a-2` on `ml3-3` (different file neighbourhood, no contention). Claim branch `feat/jt11-13-highscore-entry-echo` pushed at setup; story stamped `in_progress`.

**Premise verified against the current tree — description is CURRENT fact, no correction block needed:**
- `plugins/joust/src/main.ts:237` calls `layoutHighscoreScreen(colours[SELECT_COLOUR_INDEX], highScoreTable, entryPrompt)` — three args, `entry.initials` is NOT threaded in. The "zero feedback for a keystroke" bug holds.
- `entryPrompt` is set once at `main.ts:444` via `promptForRank(...)` — static during entry, confirmed.
- `renderHighscoreScreen` lives in `plugins/joust/src/main.ts`; `layoutHighscoreScreen` is defined at `plugins/joust/src/shell/highscoreScreen.ts:61`.

**Gift already in the tree (surfaced to TEA/Dev in context):** `padInitials` at `core/highscore.ts:141` pads `entry.initials` to `MAX_INITIALS` (=3, `highscore.ts:52`) with spaces — the ROM CSPC pre-fill convention — but is unused by the render path today. It is the intended helper for laying out visible slots.

**Render-seam warning threaded into context (memory `joust-drawlist-render-seam`):** any new DrawOp kind needs the DrawOp union AND `main.ts` paintSim dispatch AND a `render.ts` paint fn; core drawList tests alone leave it invisible. Wire end-to-end.

**Done-when:** "only really done when a human sees a letter appear." Verify at http://127.0.0.1:5270/joust/ (refresh — joust doesn't HMR).

**ROM citations for TEA/Dev to cite:** TB12REV1.SRC:1267 (ENTRET BSR OUTHSC), :1271-1276 (OUTHSC/OUTCHR), :1287-1295 (WRCUR/ERCUR cursor), :1901-1905 (CSPC pre-fill); MESSAGE.SRC:343 (FONT35 'ARRW'/SARRW cursor glyph).

**Note:** The epic YAML carries no `acceptance_criteria` — TEA derives ACs in RED from the description + ROM cites.

**Routing:** phased/tdd → next agent **tea** (RED).

## TEA Assessment

**Tests Required:** Yes
**Reason:** felt bug + faithful behavior — the story is explicit that node tests are necessary but not sufficient (a human must see the letter).

**Test Files:**
- `plugins/joust/tests/highscore-entry-jt11-13-wiring.test.ts` — 13 tests across five ACs, both seams (shell layout + main.ts render wiring). Loader is a runtime-assembled specifier so `tsc --noEmit` stays green while the `entry` field does not exist (tp1-8 trap); source guards strip comments and slice to the `renderHighscoreScreen` body (TS checklist #15/#25).

**Tests Written:** 13 tests covering 5 ACs.
**Status:** RED (12 failing — ready for Dev). The 1 green test is a deliberate fixture-guard anchor (`FONT35.glyphFor('ARRW')` is defined) that makes the cursor assertions non-vacuous; the CURSOR BEHAVIOR (painting it) is what's unbuilt.

**ACs (derived — none in the epic YAML):**
| AC | Behavior | Where |
|----|----------|-------|
| AC-1 | the entry line echoes every typed A–Z letter (FONT35, screen colour) | shell layout |
| AC-2 | all MAX_INITIALS slots visible even for a partial/empty buffer (`width >= MAX_INITIALS*cellWidth`) | shell layout |
| AC-3 | the SARRW cursor glyph marks the active slot while incomplete, without shadowing a typed letter | shell layout |
| AC-4 | the entry line is present only while entering, null on the plain board | shell layout |
| AC-5 | `renderHighscoreScreen` threads `entry.initials` into `layoutHighscoreScreen` AND paints `screen.entry` | main.ts source |

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #15 mutation-tested guard | AC-5 body-sliced positive anchors reinstated-claim-reddens; AC-3 "cursor doesn't shadow letter" kills the overwrite mutant | failing (as intended) |
| #25 search scope bounded by code, not whole-file | `renderHighscoreBody()` slices the function; both markers asserted found before slice | passing (guard mechanism) |
| source-guards-must-strip-comments | `stripComments()` applied before every main.ts positive anchor | passing (guard mechanism) |
| #18/#26 non-vacuous assertions | fixture-guard anchors CURSOR before the paintsCursor tests; loader throws self-describing | n/a |

**Rules checked:** the applicable source-guard + test-quality rules (validated-constructor / Deserialize / tenant rules are not applicable — this is a shell layout + render-wiring story with no new constructors or serialized types).
**Self-check:** 0 vacuous tests. Every test asserts a glyph, a width, a null/non-null pole, or a sliced source match; the one always-green test is an explicit non-vacuity fixture anchor, not an AC.

**Render-seam guard (memory `joust-drawlist-render-seam`):** the two halves of AC-5 (thread + paint) are pinned separately against the `renderHighscoreScreen` body, so "laid out but never threaded" and "threaded but never painted" both redden — a shell-only test would leave the line invisible.

**Full-project RED:** `npx vitest run --project joust` → 188 files, 3611 tests, only the 12 jt11-13 behavior tests fail. The count-guard collateral (audio-seam-scope 187→188) was resolved in the RED commit.

**Handoff:** To Dev (Yoda) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes (node-GREEN; visual smoke test outstanding — see Delivery Findings)
**Files Changed:**
- `plugins/joust/src/shell/highscoreScreen.ts` — added `entry: LaidOutText | null` to `HighscoreScreenLayout`, a 4th `initials` param to `layoutHighscoreScreen`, and `layoutEntryInitials` (hand-assembled ops: MAX_INITIALS slots of padded initials, SARRW cursor overlaid on the active slot).
- `plugins/joust/src/main.ts` — `renderHighscoreScreen` threads `entry.initials` into the layout call and paints `screen.entry` at y 222 (initials under the prompt; instructions moved 222→234).

**Tests:** 3611/3611 passing (full joust project GREEN); 13/13 on the story file. `npm run lint` (tsc --noEmit, repo-wide) clean.
**Branch:** feat/jt11-13-highscore-entry-echo (pushed — commit 6fd94965)

**AC status:** AC-1..AC-5 all green (see TEA Assessment table). AC-5 render seam pinned end-to-end (thread + paint, both sliced to the render body).

**Self-review:**
- Wired to the front end: yes — main.ts render path threads and paints; not a core-only change (the joust-drawlist-render-seam trap is closed).
- Follows project patterns: yes — layout returns DATA, positions are the shell's human-smoke-test concern; cursor assembled by hand because 'ARRW' is unreachable by layoutText (documented).
- Error handling: n/a — pure layout of a bounded 3-char buffer; `padEnd` + `glyphFor` are total.
- **Outstanding:** the "a human sees the letter appear" visual check — logged as a BLOCKING-for-done Delivery Finding for the Reviewer.

**Handoff:** To Reviewer (Obi-Wan) for review — and to perform/route the visual smoke test.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): This story is "only really done when a human sees a letter appear" — node tests pin the layout seam and the render-wiring source, but the final proof is a smoke test. Affects nothing in code; Dev/Reviewer must load http://127.0.0.1:5270/joust/, reach the initials screen, type, and SEE the letters + cursor (refresh — joust does not HMR). *Found by TEA during test design.*
- **Gap** (non-blocking): the SM handoff named the pad helper `padInitials`; the actual export is `timeoutInitials` (`core/highscore.ts`) — `entry.initials.padEnd(MAX_INITIALS, ' ')`. Its NAME carries timeout semantics, so reusing it for display reads oddly. Affects `plugins/joust/src/shell/highscoreScreen.ts` (Dev's call: reuse `timeoutInitials`, extract a neutral `padInitials`, or pad inline — the tests pin the BEHAVIOR, `width >= MAX_INITIALS*cellWidth`, not the helper). *Found by TEA during test design.*
- **Gap** (non-blocking): FONT35's cursor glyph `SARRW` is keyed `'ARRW'` — a multi-char key `layoutText` cannot reach by char-iteration (it looks up `'A'`,`'R'`,`'R'`,`'W'`). So the `entry` line cannot be a bare `layoutText(...)` of the padded string; Dev must ASSEMBLE the ops, appending `{ glyph: FONT35.glyphFor('ARRW'), x: initials.length*cellWidth, y: 0 }` at the active slot. Affects `plugins/joust/src/shell/highscoreScreen.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (BLOCKING for "done", non-blocking for merge): the visual smoke test is OUTSTANDING — I did NOT see a letter appear on screen. There is no debug hook to reach the initials-entry screen; it requires playing joust to a qualifying game-over, a browser-automation rabbit hole for a 2pt story. GREEN rests on 13 node tests (layout ops + main.ts thread/paint source) + a clean repo-wide `tsc`. Reviewer/user MUST load http://127.0.0.1:5270/joust/, reach the initials screen, type, and confirm the letters + cursor render legibly and unclipped at y 222 (refresh — joust does not HMR; verify the dev server serves THIS checkout's tree, not a sibling's). Affects nothing in code; this is a verification step. *Found by Dev during implementation.*
- On the `timeoutInitials`/`padInitials` naming finding above: I did NOT reuse `timeoutInitials` (its name is wrong for display) nor extract a new helper — `layoutEntryInitials` pads inline (`initials.padEnd(MAX_INITIALS, ' ')`) while assembling the cursor overlay, since the padding is one call inside op-assembly that also injects the cursor. No duplication worth extracting. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): [DOC/LOW] `renderHighscoreScreen`'s JSDoc (pre-existing, unchanged by this diff) enumerates only "heading / rows / prompt" and now undersells the function — it omits both the jt11-6 instructions line and the jt11-13 entry-echo line it paints. Not inaccurate, just incomplete. Affects `plugins/joust/src/main.ts` (add a clause to the JSDoc noting the conditional entry-echo + instructions lines). *Found by Reviewer during code review.*
- **Improvement** (BLOCKING for "done", non-blocking for merge): the visual smoke test remains OUTSTANDING and I did NOT perform it (reaching the initials screen needs a qualifying game-over — a genuine rabbit hole; the module treats every screen position as a human-smoke-test concern). Code correctness is APPROVED on the node suite + line-for-line ROM-cite verification, but the story's own "only really done when a human sees a letter appear" is a human step. Affects nothing in code. Recommend the user load http://127.0.0.1:5270/joust/, reach the entry screen, type, and confirm the letters + cursor render legibly at y 222 (verify the dev server serves THIS checkout). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Derived ACs (no ACs in the epic YAML)**
  - Spec source: context-story-jt11-13.md, Acceptance Criteria ("No acceptance criteria recorded — TEA to define during the RED phase")
  - Spec text: the story description (the felt bug + the ROM echo/cursor/CSPC-pre-fill facts)
  - Implementation: derived five ACs from the description and pinned them as tests (AC-1 echo typed letters, AC-2 all MAX_INITIALS slots visible, AC-3 cursor at active slot without shadowing, AC-4 present only while entering, AC-5 main.ts threads entry.initials + paints screen.entry)
  - Rationale: no ACs existed; the description + ROM cites are unambiguous about the behavior
  - Severity: minor
  - Forward impact: Dev/Reviewer should read the five AC describe blocks as the contract; the epic YAML still has no `acceptance_criteria`
- **Cursor pinned by GLYPH PRESENCE, not position/blink**
  - Spec source: story title ("…and a cursor") + description (WRCUR/ERCUR, TB12REV1.SRC:1287-1295)
  - Spec text: "with WRCUR/ERCUR drawing and erasing a cursor glyph"
  - Implementation: AC-3 asserts the SARRW cursor glyph is PRESENT in the entry line's ops while the buffer is incomplete, and does not shadow a typed letter — it does NOT pin the exact x, nor a blink cadence, nor cursor behavior once the buffer is full (all left to Dev; positions are a human smoke test per the module's own philosophy)
  - Rationale: exact glyph position and blink are presentation the shell module deliberately leaves to a smoke test; over-pinning would couple the RED to one layout impl
  - Severity: minor
  - Forward impact: Dev may blink the cursor or hide it when the buffer is full without reddening; the felt behavior (a cursor is visible while typing) is guarded
- **README test-file count bumped 187→188 in the RED commit**
  - Spec source: plugins/joust/tests/audio-seam-scope.test.ts ("the suite FILE count matches what vitest actually discovers")
  - Spec text: the derived count guard anchored to the `--project joust … N files` README line
  - Implementation: adding a test file tripped the count guard; bumped `plugins/joust/README.md` 187→188 in the same RED commit so the RED is isolated to the story's behavior tests
  - Rationale: mechanical consequence of adding a test file; test-suite metadata, not product code — keeping TEA's own RED clean
  - Severity: trivial
  - Forward impact: none

### Dev (implementation)
- **Instruction line moved 222→234; entry line placed at 222**
  - Spec source: context-story-jt11-13.md (the story description) + highscore-entry-jt11-6-wiring.test.ts (paints screen.instructions, no Y pinned)
  - Spec text: "paint it in renderHighscoreScreen" / jt11-6's instruction line sat at 222
  - Implementation: reading order is now prompt(210) → typed initials(222) → instructions(234), so the initials appear directly under the 'ENTER YOUR INITIALS' prompt that asks for them. No test pins the instruction Y; 234+5 rows = 239 < 240 logical height.
  - Rationale: the felt bug is "type and see nothing" — the typed initials should be the focus, right where the prompt points
  - Severity: minor
  - Forward impact: all three Y positions remain human-smoke-test placeholders (the module's convention); a reference capture may retune them
- **Cursor OVERLAYS the active slot's blank rather than adding a 4th cell**
  - Spec source: story title ("…and a cursor") + AC-2/AC-3
  - Spec text: cursor marks the active slot; all MAX_INITIALS slots visible
  - Implementation: `layoutEntryInitials` emits exactly MAX_INITIALS ops — the active slot renders the SARRW cursor INSTEAD of its CSPC blank, so width stays MAX_INITIALS*cellWidth and a typed letter is never overwritten (the cursor only ever sits on a blank slot). A completed buffer has no active slot → no cursor.
  - Rationale: the ROM's WRCUR draws the cursor over the CSPC space at the current position; overlaying matches that and keeps the field exactly 3 cells wide
  - Severity: minor
  - Forward impact: no cursor is shown once all three letters are typed (there is no next slot to point at) — a faithful reading of WRCUR; if a blink-at-end is later wanted it is additive

### Reviewer (audit)
Every logged deviation reviewed; all ACCEPTED (nothing FLAGGED, no undocumented deviation found).
- **TEA — Derived ACs (no ACs in the epic YAML)** → ✓ ACCEPTED: the description + ROM cites are unambiguous; the five derived ACs faithfully encode the felt bug and the ROM echo/cursor/CSPC facts. The epic YAML still has no `acceptance_criteria` — the session's AC table is the contract of record.
- **TEA — Cursor pinned by glyph presence, not position/blink** → ✓ ACCEPTED: proportionate for a 2pt shell story; exact cursor x and blink are presentation the module deliberately leaves to a human smoke test. Coverage boundary noted below (the cursor's SLOT is not test-pinned, only its presence) — acceptable, the smoke test is the backstop.
- **TEA — README count bumped 187→188 in the RED commit** → ✓ ACCEPTED: mechanical consequence of adding a test file; rule-checker independently re-derived 188 and confirmed the audio-seam-scope guard passes.
- **Dev — Instruction line moved 222→234; entry at 222** → ✓ ACCEPTED: reading order prompt(210)→initials(222)→instructions(234) is sensible; no test pins the instruction Y; 234+5=239 < 240 verified; rule-checker #24 confirmed no stale 222 reference survives.
- **Dev — Cursor overlays the active slot's blank rather than adding a 4th cell** → ✓ ACCEPTED: faithful to WRCUR (cursor over the CSPC space); comment-analyzer + rule-checker independently confirmed the cursor only ever lands on a blank slot, so a typed letter is never shadowed, and width stays exactly MAX_INITIALS*cell.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 3611/3611, lint clean, no debug/unsafe-cast/skip smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — I assessed edges myself (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — I assessed swallowed errors myself (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — I assessed test quality myself (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) | confirmed 1 (pre-existing incomplete JSDoc), 0 dismissed — all ROM cites verified line-for-line |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — I assessed type design myself (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection surface, bounded index, capped input |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — I assessed complexity myself (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 33 rules × 61 instances, 0 violations |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Story:** jt11-13 — high-score entry echo: paint the in-flight initials (and a cursor) on the entry screen (2pt, p1, joust, tdd). Two-file product change (`plugins/joust/src/shell/highscoreScreen.ts`, `plugins/joust/src/main.ts`) plus one RED test file and the mechanical README count bump.

**Data flow traced:** a keydown → `enterInitial(entry, e.key)` (core, capped at MAX_INITIALS `[A-Za-z]` via `stepNameEntry`) → module `entry.initials` → `renderHighscoreScreen` threads it into `layoutHighscoreScreen(…, entry.initials)` → `layoutEntryInitials` lays out MAX_INITIALS FONT35 slots (typed letters as glyphs, CSPC blanks for unfilled, SARRW cursor overlaid on the active/next-empty slot) → `paintText(screen.entry, …, 222)` paints it. Safe because the input is a bounded 3-char validated buffer and the render is fixed-glyph Canvas plotting (no string interpolation) — confirmed by [SEC].

**Pattern observed:** shell layout returns DATA (`LaidOutText` ops), pixels painted by main.ts — the module's established seam, correctly followed (`highscoreScreen.ts:75` returns `{ops,width,height,colour}`, no paint). Cursor assembled by hand because `layoutText`'s per-char walk cannot reach the multi-char `'ARRW'` key — a real, correctly-justified reason ([DOC] verified).

**Error handling:** no error paths to handle — `padEnd` + `Map.get`-based `glyphFor` are total; `padded[i]` is bounded by the loop (`i < MAX_INITIALS`), not the string length, so even an over-long buffer cannot read out of bounds ([SEC], [EDGE] concur). Render seam guarded with `if (screen.entry)`.

**Render-seam (the joust-drawlist-render trap):** closed end-to-end — the entry line is both threaded in AND painted, each pinned separately by AC-5's body-sliced source guards. A layout-only test would have left it invisible; it does not.

**Subagent findings, tagged by source:**
- `[DOC]` — comment-analyzer: 1 LOW — `renderHighscoreScreen`'s JSDoc (pre-existing, unchanged) omits the instructions + entry lines it now paints. CONFIRMED as LOW/non-blocking; logged as a Delivery Finding. All NEW comments (ROM cites incl. TB12REV1.SRC:1267-1276/1287-1295/1901-1905 and MESSAGE.SRC:343) verified true against the vendored source line-for-line — fidelity confirmed.
- `[RULE]` — rule-checker: CLEAN. 33 rules (30 TS lang-review + 3 CLAUDE.md) × 61 instances, 0 violations. Core/shell boundary intact (no core file edited; shell→core imports only), layout-returns-data upheld, source guards comment-stripped + declaration-anchored (#15/#25), README count re-derived to 188.
- `[SEC]` — security: CLEAN. No injection surface, no unbounded input, `padded[i]` safe.
- `[TEST]` — (specialist disabled) assessed by me: the 13 tests are non-vacuous — the loader throws a self-describing error; `paints`/`paintsCursor` compare against the REAL `FONT35.glyphFor`, not a re-implemented fixture; AC-5 guards slice the render body with comments stripped. The one always-green test is an explicit non-vacuity fixture anchor (CURSOR is defined). Coverage boundary: the cursor's SLOT is not test-pinned (only its presence + non-shadowing) — acceptable; slot position is the human smoke test's job.
- `[TYPE]` — (disabled) assessed by me: `entry: LaidOutText | null` typed, not `any`; the 4th `initials` param is optional/last-positional (non-breaking); no unsafe casts in product code.
- `[EDGE]` — (disabled) assessed by me: empty buffer → cursor at slot 0; full buffer → `cursorSlot = -1`, no cursor; over-long buffer (unreachable) → silent display truncation, no crash. All benign.
- `[SILENT]` — (disabled) assessed by me: no swallowed errors, no empty catches, no silent fallbacks introduced in product code (`if (glyph)` mirrors `layoutText`'s existing skip-and-advance idiom).
- `[SIMPLE]` — (disabled) assessed by me: minimal — one small pure helper, one param, one paint call, one reused import direction. No over-engineering, no dead code.

### Rule Compliance
Enumerated every changed type/function/field against every applicable rule:
- **Core/shell boundary (CLAUDE.md, the primary rule):** COMPLIANT — `highscoreScreen.ts` + `main.ts` are both shell; they import `FONT35`/`MAX_INITIALS` FROM core (allowed shell→core direction); no core file touched; no shell import leaked into core. The `src/core/` purity scanner (in the green 3611) confirms.
- **Shell layout returns data, does not paint:** COMPLIANT — `layoutEntryInitials` returns `LaidOutText`; painting is solely `paintText` in main.ts.
- **Source-text guards strip comments / anchor to declarations (#15/#25):** COMPLIANT — `stripComments` + `renderHighscoreBody` slice, both markers asserted before slice.
- **ROM-citation fidelity:** COMPLIANT — all 5 cites verified against `reference/williams-source/joust/{TB12REV1,MESSAGE}.SRC` by comment-analyzer.
- **Null handling / index safety / imports (.js ext, inline `type`):** COMPLIANT (rule-checker #1-#5).
- **Test quality (#18/#26 non-vacuity):** COMPLIANT.

### Devil's Advocate
Suppose this code is broken. Where would it hide? First, the cursor overlay: if `cursorSlot` ever equalled the index of a TYPED letter, the cursor would erase a character the player entered — silently corrupting their initials on screen. I checked: `cursorSlot = initials.length` is by construction the FIRST unfilled slot (a padded space), never an index `< initials.length`, so it can only ever sit on a blank. AC-3's "letter not shadowed" test pins this. Second, an over-long buffer: could `layoutEntryInitials('ABCD', …)` misbehave? `padEnd(3)` leaves 'ABCD' unchanged, `cursorSlot = -1` (length ≥ MAX), and the loop reads only `padded[0..2]` — display truncates to 'ABC', no crash, no OOB. It is unreachable anyway (`stepNameEntry` caps at 3), so this is defense in depth. Third, the position math: instructions moved to 234; does anything still expect 222? A stale-reference grep (rule-checker #24) found the only surviving 222 is the new entry paint — no ghost. 234+5 = 239 stays inside the 240-row screen. Fourth, the confused user: a player types and, per the OLD code, saw nothing — the whole bug. Now they see letters appear under the prompt with a cursor at the next slot; the instruction line still tells them SPACE confirms. Fifth — and this is the real residual risk — the ONE thing no automated check here can see: whether, on the actual canvas, the entry line is legible, correctly coloured, and not overlapping the prompt or clipping the screen edge. The tests prove the ops and the paint call; they cannot prove the pixels. That is the outstanding human smoke test, and it is why this verdict approves the CODE while flagging the visual confirmation as the user's step. Nothing I found rises to Critical or High; the single [DOC] finding is a pre-existing, incomplete JSDoc.

**Deviation audit:** all 5 logged deviations ACCEPTED; none flagged; no undocumented deviation found (see `### Reviewer (audit)`).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. Recommend the user perform the visual smoke test at /joust/ before/at merge — code is approved, but the story's "done" includes human eyes.