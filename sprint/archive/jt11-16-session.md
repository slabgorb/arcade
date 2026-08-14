---
story_id: jt11-16
jira_key: jt11-16
epic: jt11
workflow: tdd
---
# Story jt11-16: Boot drops into the attract self-play demo and never shows the MARQUE/logo title screen -- wire the present-but-unreachable title cabinet mode

## Story Details
- **ID:** jt11-16
- **Jira Key:** jt11-16
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Repos:** arcade
- **Branch:** feat/jt11-16-wire-title-cabinet-mode

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T19:58:36Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T18:57:50Z | 2026-08-14T19:00:48Z | 2m 58s |
| red | 2026-08-14T19:00:48Z | 2026-08-14T19:15:02Z | 14m 14s |
| green | 2026-08-14T19:15:02Z | 2026-08-14T19:21:26Z | 6m 24s |
| review | 2026-08-14T19:21:26Z | 2026-08-14T19:42:29Z | 21m 3s |
| green | 2026-08-14T19:42:29Z | 2026-08-14T19:45:58Z | 3m 29s |
| review | 2026-08-14T19:45:58Z | 2026-08-14T19:58:36Z | 12m 38s |
| finish | 2026-08-14T19:58:36Z | - | - |

## Delivery Findings

### RED (TEA / Han Solo) — ROM research resolves the A1 fork, and corrects a hallucinated dwell

**A1 ROM verification (the blocking research task).** Joust's attract mode has TWO presentations
(rom-study/subsystems.md §6): the `MARQUE` logo page (the title — Ken Lantz's line-drawing engine,
ATT.SRC) and the 14-entry `ATMST` instructional demo sequence (live self-play behind captions). The
frozen dossier claim `JT104-002` (docs/rom-study/claims/attract.json, ATT.SRC:121:
`LDA #111  111 * 10 = 1,110 = 18.5 SEC`) pins the MARQUE dwell at **1110 video frames (18.5 s)**,
after which it `JMP VSIM` into the demo. So the authentic sequence is **MARQUE (title) shown first →
demo**, and MARQUE recurs in the endless attract loop.

**Approach ruling: (1), boot-into-title, NOT (2), title-as-attract-page.** The render switch already
dispatches `renderTitleScreen()` on `cabinet.mode === 'title'` (the title machinery is a cabinet
MODE). Showing MARQUE at boot with **no new render code** (A5, and the story's explicit constraint)
therefore requires boot `mode: 'title'`. Approach (2) would need a NEW `renderTitleScreen` call inside
`renderAttract` and would edit the CORE `attract-scheduler.ts` (purity guard) — it violates "no new
render code." Ruled out by the existing mode-keyed render seam.

**CORRECTION to the setup context (seeded by sm-setup/haiku, unverified).** The context's A2 asserts
the dwell is "AMODE's 256 × PCNAP 30, TB12REV1.SRC:77-78 = 7680 ticks." That is **wrong on value,
source, and units.** The ROM MARQUE dwell is **1110 FRAMES** (ATT.SRC:121, already transcribed as
`MARQUE_DWELL_FRAMES` in `core/attract-scheduler.ts`), counted in video frames by the shell pump —
not 7680, not "ticks," not TB12REV1. The RED tests pin `MARQUE_DWELL_FRAMES === 1110` and require the
title dwell to reuse that ROM-cited constant, so the hallucinated figure cannot survive GREEN.

**Scope note — recurrence is a deferred follow-up.** The ROM re-shows MARQUE every full attract cycle.
This story wires the player-reported minimum: boot shows title first, dwells, hands off to attract.
Making the title RECUR inside the attract loop (Approach-2-style, or a title page in PAGE_ORDER) is
out of scope here — filed for a follow-up. Do not expand this 3-pointer into a scheduler rework.

**Watch item for Dev/Reviewer — the lobby showcase.** main.ts booting into attract is what currently
puts joust's live demo in the lobby carousel (`showcase: true`). Booting into title means the carousel
now shows ~18.5 s of static title before the demo. That is the ROM-faithful behavior and the accepted
story scope, but confirm the carousel still looks right in a smoke test.

**No existing test conflicts.** `select-wiring.test.ts` deliberately does NOT pin the boot mode; 
`start-experience.test.ts` pins the default player COUNT (`createWaveSim`), not the mode. Neither
reddens on the boot→title change. Do NOT "fix" this by changing `createCabinet` (it must keep booting
`attract` — `cabinet.test.ts` and `attract-scheduler.test.ts` pin that); override the mode at the
main.ts boot line instead. A RED test guards that.

### Reviewer (code review)
- **Gap** (blocking): the AC-C "edge-debounced" assertion is mutation-survivable — its regex matches
  the branch's trailing `prevStartHeld = startHeld` bookkeeping line, so it does NOT verify the
  `toSelect` transition is gated by `!prevStartHeld`. Affects `plugins/joust/tests/title-boot-jt11-16-wiring.test.ts`
  (line 211; tighten to require the `!prevStartHeld` guard ON the `toSelect` statement, and mutation-verify
  by stripping `&& !prevStartHeld` from main.ts and requiring red). *Found by Reviewer (rule-checker probe) during code review.*
- **Improvement** (non-blocking): the render-switch title arm still reads "The hook is here now" — the
  vestigial "unreached hook" phrasing whose paired deferral comment this story retired. Affects
  `plugins/joust/src/main.ts` (~line 631; reword to say the title is the cabinet's boot screen). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `renderAttract`'s "attract is the public face of the cabinet" is now
  imprecise since the title is the boot face. Affects `plugins/joust/src/main.ts` (~line 624; optional clarify). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, round 2): the round-1 reword of the above comment ("attract, reached
  after the title dwell (jt11-16), …") overstates the title dwell as *the* route into attract — `toAttract()`
  actually fires from four sites (highscore commit/timeout, the demo-restart loop, the title dwell, the
  last being newest/least-common). Affects `plugins/joust/src/main.ts:624` (rephrase to "now also reached
  from the title dwell" or drop the causal clause). Non-blocking. *Found by Reviewer (rule-checker #17) round 2.*

## Design Deviations

None at setup.

### Dev (implementation) — Yoda / GREEN

**What landed (main.ts only, Approach 1 exactly as TEA specified):**
- Boot line: `mode: 'attract'` → `mode: 'title'`, `game: createGame(SEED)` unchanged. `createCabinet`
  untouched (its guarded `'attract'` default stands).
- New title frame-pump branch, placed BEFORE the generic `if (cabinet.mode !== 'playing')` coin-up
  door so it intercepts: `titleDwellFrames += 1`; rising-edge start press → `toSelect`; else
  `titleDwellFrames >= MARQUE_DWELL_FRAMES` → `toAttract(cabinet, SEED)`; records `prevStartHeld`.
  Modeled on the existing `gameoverHoldFrames`/`GAMEOVER_HOLD_FRAMES` hold precedent. No wall clock.
- `MARQUE_DWELL_FRAMES` imported from `./core/attract-scheduler.js`.
- Deferral comment retired; the surrounding jt10-3 title comment and the boot-cabinet comment updated
  to describe boot-into-title (stale "boots the attract cycle" prose removed so a comment-analyzer
  pass stays clean).

**Verification:** `npm run lint` (tsc --noEmit) clean; full `npx vitest run --project joust` =
192 files / 3655 tests green (11/11 new, zero regressions). **Visual smoke** (my tree on an alt port,
`/joust/`): the MARQUE renders at boot — vector JOUST wordmark + "(C) 1982 WILLIAMS ELECTRONICS INC."
+ colour-cycling palette. The player-reported bug (boots into demo, never shows title) is fixed.

**Delivery Finding (pre-existing, OUT of scope — file, do not fix here): the title's EXTRA-MOUNT line
is truncated.** `renderTitleScreen` paints `screen.copyright` and `screen.extraMount` ("EXTRA MOUNT
EVERY ") but NOT `screen.pointsSuffix` (`TITLE_POINTS_SUFFIX = ',000 POINTS'`, laid out by
`layoutTitleScreen`) nor the BCD extra-life threshold that prints between them. So the boot title reads
"EXTRA MOUNT EVERY" with no value. This is a latent gap in jt10-3's `renderTitleScreen`, exposed for
the first time now that the title mode is reachable — it is RENDER code, which this story's scope
("no new render code — transition/scheduler wiring only") explicitly excludes. Recommend a follow-up
story to paint the points-suffix / extra-life value on the title. Not a regression from jt11-16.

### Dev (rework round 1) — Yoda / GREEN

Addressed all three Reviewer findings; shell behavior unchanged.
- **[HIGH/test-integrity] AC-C-2 vacuous guard (FIXED):** replaced the bare `prevStartHeld`-presence
  regex with a check that finds the `toSelect(` statement in the sliced title branch and asserts it
  contains `!prevStartHeld` (the guard ON the transition). **Mutation-verified**: stripping
  `&& !prevStartHeld` from the title branch reddened the test ("the toSelect transition is gated by
  the rising edge" failed on `if (startHeld) cabinet = toSelect(cabinet)`); restored the guard →
  green. The shipped code was already correct (main.ts:579), so no shell change.
- **[LOW/DOC] main.ts render-switch comment (FIXED):** "The hook is here now" → "This is the cabinet's
  boot screen as of jt11-16 (the title pump branch dwells here, then hands to attract)."
- **[LOW/DOC] main.ts renderAttract comment (FIXED):** "attract is the public face" → "attract, reached
  after the title dwell (jt11-16), is the self-play public face of the cabinet."

**Verification:** `npm run lint` clean; full `npx vitest run --project joust` = 192 files / 3655 tests
green (11/11 in the wiring file). No regressions.

### Reviewer (audit)
- **Dev finding — the title's EXTRA-MOUNT line is truncated (`pointsSuffix`/threshold not painted by
  `renderTitleScreen`)** → ✓ ACCEPTED by Reviewer: correctly diagnosed as a PRE-EXISTING jt10-3 render
  gap, exposed (not caused) by making the title reachable; painting it is render code that this story's
  "no new render code" scope excludes. Recommend a follow-up story. Not a regression from jt11-16.
- **Boot-into-title changes the lobby showcase (carousel now opens on ~18.5 s of static title before
  the demo)** → ✓ ACCEPTED by Reviewer: this is the story's INTENT (the player report is "boot should
  show the title first"), so the showcase showing the title first is correct behavior, not a regression.
  Dev smoke-tested the title paints at boot. No action.
- No undocumented spec deviations found: the (1)-vs-(2) approach ruling and the 7680→1110 dwell
  correction were both logged by TEA and verified accurate here.

## Subagent Results

Round 1 (REJECTED) table retained under the assessment for the record. Round 2 re-review (rework delta = 1 test assertion + 2 comments) below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (self-verified) | clean | none (GREEN: 192 files/3655 tests, tsc clean — re-run on the reverted tree) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — no functional code changed in the rework (comment + test only) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — no error-handling surface in the rework |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — test quality covered by rule-checker (confirmed the round-1 gap CLOSED) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — both reworded comments confirmed accurate |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — the `toSelectStmt!` non-null is guarded by a preceding `toBeDefined()` (self-assessed clean) |
| 7 | reviewer-security | Yes (round-1 clean; carried) | clean | none | N/A — the rework changed no runtime/security surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — rework is a minimal, targeted fix |
| 9 | reviewer-rule-checker | Yes | findings | 1 | round-1 finding CLOSED (independently mutation-verified in a worktree); 1 NEW Low #17 confirmed (non-blocking) |

**All received:** Yes (round 2 — rule-checker + comment-analyzer re-spawned on the rework delta; preflight self-verified; security carried from round 1's clean, no surface changed)
**Total findings (round 2):** 1 confirmed Low (#17 comment precision, non-blocking); the round-1 blocking finding is closed and independently re-verified.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

**Data flow traced:** a Digit1/Digit2 keydown → `held` → title pump branch `readSelectInput(held)` → rising-edge (`startHeld && !prevStartHeld`) → `toSelect(cabinet)` → 'select' coin-up → `selectPlayerCount`/`enterPlaying`. Dwell path: `titleDwellFrames += 1` each pumped frame → at 1110 → `toAttract(cabinet, SEED)`. Single-origin, no external sink; frame-clocked (no wall timer).
**Pattern observed:** the title pump branch mirrors the existing attract branch and the `gameoverHoldFrames` hold precedent — `plugins/joust/src/main.ts:570-582`. Good pattern.
**Error handling:** no error surface; keyboard-only input; shell-only, `src/core` untouched.
**Handoff:** To SM for finish-story.

**Round history:** Round 1 REJECTED on the AC-C-2 vacuous edge-debounce guard (below). Dev's rework
tightened the assertion and fixed two comments; round 2 independently CONFIRMED the fix (mutation-verified
in a scratch tree AND by rule-checker in a separate worktree — stripping `&& !prevStartHeld` from the
title branch reddens exactly the AC-C test). One NEW Low finding surfaced from the rework's own comment
reword; it is non-blocking. No Critical/High remain → APPROVED.

**Round 2 findings:**
| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [LOW] `[DOC]` `[RULE]` | The reworded render comment "attract, reached after the title dwell (jt11-16), …" overstates the title dwell as *the* route into attract, when `toAttract()` fires from four sites (highscore commit/timeout, the demo-restart loop, and the title dwell — the newest/least-common). #17. | `plugins/joust/src/main.ts:624` | CONFIRMED, non-blocking. Filed as a Delivery Finding recommending a minimal rephrase ("now also reached from the title dwell" or drop the causal clause). Does not block a correct, green story; consistent with round 1, where Low comment nits did not drive the reject. |

**Round 1 findings (all now RESOLVED — retained for the record):**
| Severity | Issue | Location | Resolution |
|----------|-------|----------|------------|
| [HIGH] (test-integrity) | AC-C "edge-debounced" assertion was mutation-survivable — a bare `/prevStartHeld/` regex satisfied by the branch's trailing bookkeeping line. `[RULE]` `[TEST]` | test:211 | ✅ FIXED + mutation-verified twice (Dev + Reviewer worktree). The assertion now isolates the `toSelect(` statement and requires `!prevStartHeld` on it. |
| [LOW] | Stale "The hook is here now" render comment. `[DOC]` | main.ts:631 | ✅ FIXED — now "the cabinet's boot screen as of jt11-16". |
| [LOW] | "attract is the public face" imprecise. `[DOC]` | main.ts:624 | ✅ Reworded — but the reword introduced the round-2 #17 above. |

**Dispatch tags (all specialists accounted for):**
- `[EDGE]` (disabled) — self-assessed: `prevStartHeld` is written before `return` in every mode branch (attract, title, coin-up door); exactly one runs per pumped frame, so the rising edge carries correctly across title→attract/select. No edge leak introduced (#14). VERIFIED clean.
- `[SILENT]` (disabled) — self-assessed: the diff adds no `try/catch`, no swallowed errors, no silent fallbacks. Clean.
- `[TEST]` — round 1's AC-C-2 vacuous assertion is now FIXED and mutation-verified twice (Dev + Reviewer worktree); every assertion in the new file is now bounded and mutation-sound.
- `[DOC]` — round 1's two Low comments FIXED; round 2's reword introduced one NEW Low #17 (main.ts:624 overstates the attract-entry route), confirmed non-blocking.
- `[TYPE]` (disabled) — self-assessed: no new types; the `body!`/`switchBranch!`/`attractBody!` non-null assertions are each guarded by an immediately-preceding `toBeDefined()` (rule-checker #1 confirmed). `.js` import extensions present. Clean.
- `[SEC]` — reviewer-security: CLEAN. No network/injection/storage/tenant surface; keyboard input only; shell-only, `src/core` untouched.
- `[SIMPLE]` (disabled) — self-assessed: the title branch mirrors the existing attract branch and the `gameoverHoldFrames` hold precedent; no over-engineering, no dead code. Clean.
- `[RULE]` — reviewer-rule-checker round 2: the round-1 #15/#18 violation is CLOSED (independently mutation-verified in a worktree); one NEW Low #17 (main.ts:624, non-blocking). Core/shell purity + comment-line-refs upheld both rounds; README count re-derived to 192.

### Rule Compliance (lang-review/typescript.md, applied to this diff)
- **#14 (derived edges in a branch):** `prevStartHeld` edge computed + written in each mode branch; carries across transitions. COMPLIANT (the pre-existing playing/gameover staleness is out of scope, unchanged by this story).
- **#15 / #18 (source-text guard matches a token / test fails by passing):** round-1 VIOLATION at test:211 now RESOLVED — the assertion isolates the `toSelect(` statement and requires `!prevStartHeld` on it (mutation-verified twice). All source-scan assertions bounded and mutation-sound.
- **#16 (ARIA/WCAG):** N/A — Canvas 2D, no DOM/accessible-name code.
- **#17 (comments asserting an un-rerun mechanism):** round 1's stale sibling comments FIXED; round 2 flagged one NEW Low — the reworded main.ts:624 overstates the title dwell as *the* attract-entry route (four `toAttract()` sites exist). Non-blocking; filed for a minimal rephrase.
- **#20 (a quantity measured from an artifact the same diff changes):** README `192 files` re-derived after the final edit and guarded green by `audio-seam-scope`. COMPLIANT. `MARQUE_DWELL_FRAMES=1110` is a reused pre-existing constant, not re-measured.
- **#24 (retirement applied only where named):** the boot-mode retirement (attract→title) left no stale prose about main.ts's boot; sibling tests assert on `createCabinet` (genuinely still 'attract', correctly untouched). COMPLIANT.
- **#25 (source guard whose scope is the whole file):** the positive anchors are bounded to a branch/declaration slice; the negative deferral-comment guards over the whole file are acceptable (absence is absence). COMPLIANT.
- **#27 (a gate waiting for a thing never created):** `titleDwellFrames >= MARQUE_DWELL_FRAMES` — the counter increments unconditionally as the first line of the only branch reachable in title mode. COMPLIANT.
- **CLAUDE.md core/shell purity:** shell-only edit, `src/core` untouched. COMPLIANT.

### Observations (5+)
1. `[VERIFIED]` Boot enters title without touching the core constructor — evidence: main.ts:382 `{ mode: 'title', game: createGame(SEED) }`; cabinet.ts:66 `createCabinet` still returns `'attract'`. Complies with CLAUDE.md core/shell boundary and the AC-A-3 guard.
2. `[VERIFIED]` Dwell always advances — evidence: main.ts:576 `titleDwellFrames += 1` is the unconditional first statement of the title pump branch, inside `pumpFrames`. No starvation (#27).
3. `[VERIFIED]` No new render code (A5) — evidence: render switch title arm (main.ts:629-632) unchanged; `renderAttract` (main.ts:349-360) has no `renderTitleScreen` call. The title paints through the one pre-existing arm.
4. `[VERIFIED]` Edge discipline consistent (#14) — evidence: main.ts:581 sets `prevStartHeld = startHeld` before the branch returns, identical to the attract branch (563) and coin-up door (593).
5. `[HIGH/test-integrity]` The AC-C-2 assertion does not test what its name claims (see table). `[RULE][TEST]`
6. `[LOW]` Two comments left stale/imprecise by the boot-mode change (see table). `[DOC]`
7. `[VERIFIED]` Provenance of the corrected dwell — the setup context's "7680 ticks / TB12REV1" was the high-score-ENTRY leash comment (main.ts:537), a different mechanism; the MARQUE dwell is 1110 frames (ATT.SRC:121). TEA's correction and the `===1110` guard are right.

**Data flow traced:** a Digit1/Digit2 keydown → `held` set (existing keydown handler) → in the title pump branch, `readSelectInput(held)` → `want` → `startHeld = want !== null` → on the rising edge (`&& !prevStartHeld`) `toSelect(cabinet)` → mode 'select' → the coin-up door's `selectPlayerCount(want)` → `enterPlaying(count)` on the next rising edge. Safe: single-origin, no external sink; the only state written is the in-memory `cabinet`/`prevStartHeld`. The dwell path: each pumped frame `titleDwellFrames += 1`; at 1110 → `toAttract(cabinet, SEED)` (fresh seeded demo). Frame-clocked (no wall timer), so it pauses when the tab is backgrounded — consistent with jt11-6's deliberate frame-based budget.

### Devil's Advocate
Assume this is broken. First attack: the dwell never fires and the cabinet hangs on the logo forever. Refuted — `titleDwellFrames` increments unconditionally every pumped frame and `MARQUE_DWELL_FRAMES` is a positive constant pinned at 1110, so the `>=` gate is reached in bounded time; `pumpFrames` caps catch-up at 0.25 s so it cannot overshoot wildly, and a backgrounded tab merely pauses the count (no rAF), which is the intended frame-clock behavior, not a hang. Second attack: a player holding a start key as the page loads is silently robbed of the title — `prevStartHeld` inits false, so a held key on frame 1 satisfies `!prevStartHeld` and jumps straight to select. True, but that is the established convention of every other branch (attract, coin-up) and is arguably correct (holding start to skip the attract sequence is expected arcade behavior), so it is not a defect. Third attack: the title screen shows no "PRESS 1 OR 2" prompt, so a confused player does not know they can start — but that is ROM-faithful (MARQUE carries no prompt; the prompt lives on the demo/attract pages the dwell hands to after 18.5 s), and pressing 1/2 still works during the title, so nothing is unreachable. Fourth attack, the one that landed: the suite LIES about coverage. The AC-C-2 guard is named "edge-debounced" but a mutant that removes `&& !prevStartHeld` survives it — so a future editor who drops the guard (reintroducing a held-key-blows-through bug, a genuine #14 regression) gets a green suite. The shipped code is fine today; the DEFENSE against tomorrow's regression is the thing that is broken, and that is exactly the failure mode this project has been burned by repeatedly. That is why this rejects. Fifth attack: the boot `createGame(SEED)` is created then discarded at `toAttract` (which mints a fresh game) — wasteful? Negligible (one unstepped game object for the dwell), and it matches the existing toAttract-always-reseeds pattern. No correctness impact.

**Handoff:** Back to TEA (RED) to tighten and mutation-verify the AC-C-2 assertion; Dev fixes the two Low comments during the green re-pass. The shipped shell code needs no change.

## Tea Assessment

**Verdict:** RED landed and verified. 1 test file added, 7 genuinely-failing tests + 4 green guards.
Full `npx vitest run --project joust` = 1 file failed / 191 passed, 7 tests failed / 3648 passed —
every failure inside the new file, zero cross-file breakage. Handing off to Dev (Yoda).

**A1 resolved (the blocking research task).** ROM verified from the frozen dossier, not inferred:
attract has two presentations — the MARQUE logo (title) and the ATMST demo — and MARQUE dwells
**1110 video frames / 18.5 s** (dossier claim JT104-002, ATT.SRC:121) then `JMP VSIM` into the demo.
Authentic order = **title first → demo**. This selects **Approach (1), boot-into-title** (not the
attract-page Approach 2): the render switch already dispatches `renderTitleScreen()` on
`cabinet.mode === 'title'`, so boot `mode: 'title'` shows MARQUE with NO new render code; Approach (2)
would need a new title paint in `renderAttract` and a core-scheduler edit, which the "no new render
code" constraint rules out. The setup context's "7680 ticks / TB12REV1" dwell was a haiku
hallucination — corrected in the Delivery Findings and pinned dead by a test.

**Test inventory** (`plugins/joust/tests/title-boot-jt11-16-wiring.test.ts`):
- RED (fail until GREEN): boot mode is `'title'` not `'attract'` (A2); main.ts imports
  `MARQUE_DWELL_FRAMES` from core/attract-scheduler (A2); the title FRAME-PUMP branch spends
  `MARQUE_DWELL_FRAMES` then `toAttract` (A2); a start press on the title → `toSelect` (A3);
  the title start press is edge-debounced via `prevStartHeld` (A3); the "not yet reached" / "has no
  caller" deferral comment is gone (A4); the title mode is set in live code, not just a deleted
  comment (A4).
- GREEN GUARDS (pass on arrival, guard the seams NOT to touch): `MARQUE_DWELL_FRAMES === 1110`
  (A1/A2 — the ROM value); the boot still wraps a bare `createGame(SEED)` (protects the
  start-experience default-count contract); `createCabinet` still returns `'attract'` (steer Dev
  away from editing the core constructor — that would redden cabinet.test.ts / attract-scheduler.test.ts);
  the render switch still dispatches `renderTitleScreen()` and `renderAttract` grows no title paint (A5).

**Dev (Yoda) handoff — the wiring to add (Approach 1):**
1. Boot line: change the initial cabinet from `mode: 'attract'` to `mode: 'title'`; keep
   `game: createGame(SEED)` byte-for-byte. Do NOT edit `createCabinet` in core/cabinet.ts.
2. Add a title FRAME-PUMP branch `if (cabinet.mode === 'title') { … return }` BEFORE the generic
   `if (cabinet.mode !== 'playing')` coin-up door (else that door takes a title press straight into
   a game). In it: count pumped frames; on a rising-edge start press → `toSelect(cabinet)`; else when
   the frame count reaches `MARQUE_DWELL_FRAMES` → `toAttract(cabinet, SEED)`; record `prevStartHeld`.
   Import `MARQUE_DWELL_FRAMES` from `./core/attract-scheduler.js`. No wall-clock timer (jt11-6's
   frame-clock guard already forbids setTimeout/Date.now in this file).
3. Retire the deferral comment (the `toTitle`/"not yet reached" block above `strokeLogo`).
4. No render code — the title paints through the existing render-switch arm.

**Watch items carried into GREEN/review:** (a) the lobby showcase carousel now opens on ~18.5 s of
static title before the demo — ROM-faithful and in scope, but smoke-test the carousel; (b) title
RECURRENCE in the attract loop is a deferred follow-up, NOT this story; (c) sequencing — this touches
the `main.ts` start-input door shared with jt11-17; do not let jt11-17 run in parallel.

## Rule Coverage
Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (source-scan wiring story; no new runtime types).
- **#16 (source-grep keyword trap — a keyword in a COMMENT satisfies the test):** every code assertion
  runs against comment-stripped source (`mainCode()`), so prose cannot green a wiring test. The one
  test that INTENDS to read comments (A4, the deferral removal) scans RAW source on purpose and is
  labelled as such.
- **#14 (rising edges in a state machine):** AC-C pins `prevStartHeld` edge-debounce on the title
  start press — a held key must not blow through the title into select, mirroring the attract branch.
- **#15 (mutation-tested guards):** each RED test names the mutant it kills and fails today; the green
  guards (createCabinet-stays-attract, boot-seed-unchanged, no-second-render-path) each redden if the
  seam they fence is mutated.
- **Test-count baseline (checklist "a test-count baseline in the commit that adds tests"):** the new
  file bumps the joust `audio-seam-scope` derived count; README `--project joust # N files` bumped
  191→192 in the SAME RED commit, verified green in the full-project run.
- **#18 (test apparatus fails by passing) / non-vacuity:** the branch slicer THROWS a self-describing
  error in the RED state (no title pump branch), so tests 3–5 fail loudly rather than passing over an
  absent branch; the slicer disambiguates the pump branch from the render arm by a transition it owns.
- Not applicable: `catch (e: unknown)` narrowing (no new catch), newtype/validated-constructor rules
  (no new types — reuses existing `toSelect`/`toAttract`/`MARQUE_DWELL_FRAMES` symbols).

## Sm Assessment

**Verdict:** Setup complete, handing off to TEA for RED. Clean 3pt p1 bug, TDD/phased.

**Premise verified against HEAD (2026-08-14).** Every line-cite in the description checks out against the current tree — this is a textbook jt11 "present-but-unwired" defect, not a stale-description trap:
- Boot hardwires `mode: 'attract'` at `plugins/joust/src/main.ts:382`.
- `toTitle` (transition to title) is defined at `plugins/joust/src/core/cabinet.ts:84-86` with ZERO production callers; the only reference outside tests is the self-admitted deferral comment at `main.ts:277-280`.
- `'title'` is already in the `CabinetMode` union (`cabinet.ts:48`) and already dispatched by the render switch (`main.ts:609,612`). No new render code — this is transition/scheduler WIRING only.

**Path corrections seeded into context** (story used bare filenames): `main.ts` is `plugins/joust/src/main.ts` (directly under `src/`, NOT `src/shell/`); the scheduler is `plugins/joust/src/core/attract-scheduler.ts` — a **core** file, so fix approach (2) (title-as-attract-page) crosses the core/shell purity boundary, whereas approach (1) (boot-into-title with dwell→attract handoff) is shell-only.

**Design fork is a ROM-fidelity RESEARCH question, not a user menu.** Approach (1) vs (2) is decided by the original Joust cabinet's attract sequence (AMODE / MARQUE ordering). TEA verifies this from the ROM source FIRST and encodes the authentic sequence in the RED test. Not escalated to the user; not the pipeline's free choice.

**Sequencing (coordination hazard):** jt11-16 edits the shared `main.ts` start-input door (~`main.ts:564-575`) that jt11-17 also touches. jt11-17 is currently `backlog` with no branch — safe now — but it must NOT be started in a parallel checkout against this branch. Recorded prominently in the context.

**Board hygiene:** No sibling owns jt11-16 (branch probe empty pre-claim; only other live session is a-1's `ml8-2`, millipede/unrelated). Merge gate clean (no open PRs). Status stamped `in_progress`; claim branch `feat/jt11-16-wire-title-cabinet-mode` pushed to light the sibling probe. Epic-YAML stamp verified surgical (one `backlog`→`in_progress` flip, no sibling touched).