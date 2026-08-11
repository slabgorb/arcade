---
story_id: "SH3-2"
jira_key: "SH3-2"
epic: "SH3"
workflow: "tdd"
---
# Story SH3-2: joust — host-helpers adoption

## Story Details
- **ID:** SH3-2
- **Jira Key:** SH3-2
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/SH3-2-joust-host-helpers
- **Branch Strategy:** gitflow (feat/SH3-2-joust-host-helpers)
- **Stack Parent:** none

## Summary

joust must route its bespoke canvas-mount + audio-unlock lifecycle in `plugins/joust/src/main.ts` through `@shared/host-helpers` (specifically `mountCanvas` and `installAudioUnlock`), retiring the hand-rolled shell wiring. The story keeps joust's own ROM timebase but documents whether `@shared/loop`'s 60Hz accumulator is adoptable.

**Precedent:** SH3-4 (pac-man) is done — study how it wired `@shared/host-helpers` into `main.ts`.

## Acceptance Criteria

1. joust's `src/main.ts` imports and uses `mountCanvas` from `@shared/host-helpers` for the `#game` canvas acquisition (replacing the hand-rolled `querySelector+throw` at lines 66-68), preserving the existing error message contract or an equivalent.
2. joust's `src/main.ts` routes its audio-unlock (the `jt5-1` keydown `audio.resume()` seam at lines 419-434) through `installAudioUnlock`.
3. A source-wiring test asserts the adoption (joust's `main.ts` references the shared helpers; the hand-rolled equivalents are gone).
4. The loop-timebase question is answered in a code comment / doc: state explicitly whether `@shared/loop`'s 60Hz accumulator is adoptable for joust given its ROM timebase, and why not (if not). (The ROM timebase stays in joust; this is documentation-only.)
5. joust's full vitest project stays green; the game still mounts and plays.

## Epic Guiding Rule (SH3 Description)

"Share the VERB (the identical mechanism), not the NUMBERS (per-cabinet constants + exotic ROM timebases stay in the games)." joust KEEPS its ROM timebase; the loop-accumulator adoption question is DOCUMENTATION-only for this story, not a required swap. This is a shell-only change (`src/main.ts` is joust's shell, not core), so the core-purity boundary is not touched.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T14:33:50Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T13:41:59Z | 2026-08-11T13:44:42Z | 2m 43s |
| red | 2026-08-11T13:44:42Z | 2026-08-11T14:14:07Z | 29m 25s |
| green | 2026-08-11T14:14:07Z | 2026-08-11T14:19:26Z | 5m 19s |
| review | 2026-08-11T14:19:26Z | 2026-08-11T14:33:50Z | 14m 24s |
| finish | 2026-08-11T14:33:50Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### Reviewer (code review)
- **Improvement** (non-blocking): joust's `pumpFrames` re-implements @shared/loop's `advanceFixedSteps` (same 0.25 catch-up clamp, same whole-step accumulator loop); centipede and pac-man already wrap the shared helper at their own `FRAME_DT`. Affects `plugins/joust/src/shell/timebase.ts` (retire `pumpFrames` onto `advanceFixedSteps(acc, elapsed, SECONDS_PER_FRAME, step)` — a determinism-neutral swap, and exactly the duplication SH3 exists to retire; out of SH3-2's mount-only scope). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): pre-existing mis-citation at `docs/ops/shell-adoption-matrix.md:52` — "joust on its own `FRAME_DURATIONS` timebase" names the audio-manifest sound-duration table, not joust's video timebase (`FRAME_HZ` in core/frame). Predates SH3-2, out of this diff's scope. Affects `docs/ops/shell-adoption-matrix.md:52` (FRAME_DURATIONS → FRAME_HZ). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### SH3-2 scope narrowed to mountCanvas-only (user ruling, 2026-08-11) — the title over-asserts

**What changed:** The sprint TITLE asks joust to route BOTH its canvas mount AND its
audio-unlock through `@shared/host-helpers` (`mountCanvas` + `installAudioUnlock`). TEA's
first act (open the cited seams) found the premise refuted by a deliberate, test-enforced
prior decision: `docs/ops/shell-adoption-matrix.md` (landed by sc1-1) records
`joust | rom-cadence | rom-cadence | behaviour-absent` and argues that joust's audio-unlock
is FUSED into the input-sampling keydown handler (`main.ts:433-440`), so adopting
`installAudioUnlock` "necessarily edits the input path — precisely the hazard the epic
names" ("a helper that changes when a frame starts or how input is sampled is a regression
even if every test stays green"). `mountCanvas`, by contrast, is a boot-time one-shot with
zero cadence/input risk and byte-identical duplication (`querySelector('#game')`+throw at
`main.ts:66-69`), already retired for pac-man in the DONE SH3-4.

**What the spec said:** adopt both helpers.

**Why (the ruling):** the user chose **mountCanvas-only** on 2026-08-11. Adopt `mountCanvas`;
KEEP the audio-unlock hand-rolled as `rom-cadence`; document why `@shared/loop`'s 60Hz
accumulator is not adoptable given joust's ROM timebase (`pumpFrames`). This honours BOTH
the epic (retire safe, identical duplication) and sc1-1 (do not touch the cadence/input
seam). Verified the growth-guard permits the mount adoption: joust performed `querySelector('#game')`
at the sc1-1 baseline 088bc3d, so `tests/shell-convergence.test.mjs` will not redden on the flip.

**Forward impact:** the story TITLE still names `installAudioUnlock` — it was NOT retitled
(annotate, not rewrite). A later reader must read this deviation, not the title, for scope.
The matrix flip (joust `mountCanvas` cell `rom-cadence → adopted`) is part of GREEN; leaving
it stale would make the matrix silently lie, since `rom-cadence` cells carry no enforcement.
`installAudioUnlock` stays out of joust — the AC-2 test group is the ruling's lock.

### Reviewer (audit)
- **Scope narrowed to mountCanvas-only (TEA/user ruling)** → ✓ ACCEPTED by Reviewer: independently re-verified. mountCanvas is a boot-time one-shot with no cadence/input risk; installAudioUnlock is genuinely fused into the input-sampling keydown (main.ts:432-440); the growth-guard permits the flip (baseline 088bc3d had `querySelector('#game')`). The AC-2 group correctly locks the deferral. Sound.
- **@shared/loop AC-4 verdict was factually wrong (Reviewer finding → FIXED inline)** → Dev's timebase.ts comment claimed @shared/loop is "hard-coded 60 Hz" and adoption would "round to 60". Refuted by `src/shared/loop.ts` (`advanceFixedSteps` takes `dt`; `createLoop` takes `hz`) and by centipede + pac-man already wrapping `advanceFixedSteps` at their own non-60 `FRAME_DT`. Confirmed independently by comment-analyzer (HIGH) and rule-checker (#17). Per user instruction, fixed inline this round (commit `fix(SH3-2): correct the @shared/loop AC-4 verdict`): the verdict now reads "adoptable at joust's own rate, deferred as out-of-scope" and the AC-4 doc test was strengthened to require `advanceFixedSteps` be named (closes rule-checker #15/#25). Re-verified GREEN (17/17, lint clean).

## Sm Assessment

**Premise measured against HEAD before setup — CURRENT, not stale.** The story's claims were verified against the working tree, not copied on faith:

- `src/shared/host-helpers.ts` exports `mountCanvas(root, selector='#game'): CanvasMount` (:51), `installAudioUnlock(resume, target): () => void` (:102) and `installPauseToggle` (:143). All real, all current.
- `plugins/joust/src/main.ts` (583 lines) does NOT import `@shared/host-helpers`. It hand-rolls the canvas mount at :66-68 (`querySelector<HTMLCanvasElement>('#game')` + `if (!canvas) throw new Error('index.html must host a <canvas id="game">')` + `getContext('2d')`) and the audio-unlock seam at :419-434 (the jt5-1 comment block, `audio.resume()` on keydown). Both are exactly the wiring `mountCanvas` / `installAudioUnlock` provide.
- joust already imports other shared modules (`@shared/highscore` :40, `@shared/held-keys` :41), so the alias/import path is proven.

**Precedent to copy, not re-derive:** SH3-4 (pac-man) is DONE — same `@shared/host-helpers` mount adoption in a plugin's `main.ts`. TEA/Dev should study its wiring and its source-wiring test style (and read SH3-6, filed to harden SH3-4's source-wiring assertions, for the assertion bar to aim for). SH3-1 (joust rng, #236) just merged in the same file neighbourhood.

**Scope guard:** shell-only change (`src/main.ts` is joust's shell). Core-purity boundary untouched. RNG/determinism primitives are already SH3-1's scope — NOT this story. The `@shared/loop` 60Hz-accumulator question is **documentation-only**: joust keeps its ROM timebase; AC4 asks only for a written verdict on adoptability, not a swap.

**Sibling probes clean at setup:** no `origin` branch for SH3-2 before I cut mine; the only cross-checkout session was a-1's SH4-5 (unrelated). Claim pushed immediately — `feat/SH3-2-joust-host-helpers` on origin + story stamped `in_progress`.

**Handoff:** tdd → red phase. TEA (Han Solo) writes the failing source-wiring + behaviour gates. ACs are derived from the title (epic YAML carried no `description`/`acceptance_criteria`); they are TEA's primary input and are sound.

## Tea Assessment

**Premise refuted before RED → user ruling → RED written for the narrowed scope.** My first
act (open the cited seams) found the title over-asserts: `docs/ops/shell-adoption-matrix.md`
(sc1-1) deliberately defers joust's `installAudioUnlock` as `rom-cadence` — the audio unlock
is fused into the input-sampling keydown handler, so adopting it edits the input path (the
epic's named hazard). `mountCanvas` is a boot-time one-shot with zero cadence risk. **User
ruled mountCanvas-only** (see Design Deviations). RED is written for that scope, not the title.

**Test file:** `plugins/joust/tests/main-host-adoption.test.ts` (joust vitest). Verified RED
via testing-runner: **8 fail / 9 pass** — the correct partial-adoption mix.

- **AC-1 (RED, 6):** import + call + destructure of the checked `{ canvas, ctx }` from
  `mountCanvas`; retire `querySelector('#game')` + the two bespoke `#game` throws. Retirement
  guards are SCOPED — the backbuffer/atlas `getContext`/throws (which say "2d context
  unavailable for the {backbuffer,atlas}", no "canvas") legitimately stay; the guard targets
  only the main-canvas `2d canvas context unavailable` string. Confirmed each fails for the
  right reason (missing import/call, live old code), not a compile error.
- **AC-2 (GREEN lock, 3):** `audio.resume()` survives; `installAudioUnlock` is NOT
  imported/called (the ruling's teeth against a silent later trade); `installHeldKeys(window,`
  + `preventDefaultFor: new Set(['Space'])` intact (mount refactor is boot-only). These pass
  now and MUST stay passing through GREEN.
- **AC-3 (mixed):** matrix flip `joust mountCanvas rom-cadence→adopted` (RED — forces the
  matrix update, since a `rom-cadence` cell has no enforcement and would silently lie);
  `installAudioUnlock` stays `rom-cadence` + `installPauseToggle` `behaviour-absent` + `pumpFrames`
  survives (GREEN); `@shared/loop` verdict documented in main.ts or shell/timebase.ts (RED —
  no `@shared/loop` mention exists in joust today).

**Collateral fixed by TEA:** adding a test file bumped joust's derived file count 170→171,
reddening `audio-seam-scope.test.ts`'s count guard (the count-anchor pattern). Bumped
`README.md` (170→171); confirmed that file green (30/30). Not a story RED — infra hygiene.

**Cross-suite check:** orchestrator suite green (463/463) — I read the adoption matrix but did
not change it (that's GREEN's job). Rest of joust green except my intended REDs.

### GREEN scope for Dev (Yoda)

1. `plugins/joust/src/main.ts`: `import { mountCanvas } from '@shared/host-helpers'`; replace
   the `:66-69` block with `const { canvas, ctx: context } = mountCanvas(document)` (default
   selector is `#game`), then `configureContext(context)` as today. Leave the backbuffer/atlas
   `createElement`/`getContext` blocks and the ENTIRE keydown/audio path UNTOUCHED.
2. `docs/ops/shell-adoption-matrix.md`: flip joust's `mountCanvas` cell to `adopted`; update the
   "Why centipede and joust defer the canvas mount and audio unlock" prose so it covers ONLY
   audio-unlock for joust now (joust adopted the mount). Do NOT touch centipede's row.
3. Document the `@shared/loop` verdict — natural home is a comment in `src/shell/timebase.ts`
   (its `pumpFrames`/`FRAME_HZ` rationale) OR main.ts: state that joust keeps its ROM `pumpFrames`
   timebase and `@shared/loop`'s 60Hz accumulator is not adoptable (share the VERB, not the NUMBERS).
4. AC-3 one-game-per-commit (shell-convergence AC-3): the main.ts change lands in its own commit
   touching only joust's main.ts. The matrix/README/timebase edits are not `main.ts` so they don't
   trip that guard, but keep the main.ts adoption isolated to be safe.

### Rule Coverage (TS lang-review)

- **#15 (assert the collected count / non-vacuity FIRST):** the destructure check asserts the
  regex match is non-null before probing its group; the matrix parser throws on a missing
  block/row rather than returning a silent empty; guard-integrity teeth prove the scans read
  code not comments (a commented-out `installAudioUnlock` / `querySelector('#game')` cannot fake
  a pass, and live code is not over-stripped).
- **Meaningful assertions:** every `it` carries a message and a concrete matcher; no
  `let _ =`, no `assert(true)`, no always-true `.toBeDefined()` proxies.
- **Comment-defeat immunity:** all adoption/retirement scans run on comment-stripped source
  (the sc1-1 / SH3-1 idiom); only the documentation AC reads raw source, deliberately.

## Dev Assessment

**GREEN by minimal, scope-faithful implementation of the mountCanvas-only ruling.** Three
files changed; no further deviations beyond the one TEA already logged (the user's scope
narrowing). Verified GREEN via testing-runner: story file **17/17**, full joust **3379/3379**
(171 files), orchestrator **463/463** (shell-convergence consistent with the flipped cell),
`tsc --noEmit` clean.

**What changed:**
1. `plugins/joust/src/main.ts` — `import { mountCanvas } from '@shared/host-helpers'`; the
   `:66-69` hand-rolled block became `const { canvas, ctx: context } = mountCanvas(document)`
   + the existing `configureContext(context)`. Default selector `#game`. The backbuffer/atlas
   `createElement`/`getContext` blocks and the ENTIRE keydown/audio path are untouched.
2. `docs/ops/shell-adoption-matrix.md` — joust's `mountCanvas` cell flipped `rom-cadence →
   adopted`. The "why defer" prose was SPLIT to stay honest: an audio-unlock note (joust +
   centipede still defer — the input-fused hazard, code block refreshed to the current SH4-2
   keydown shape) and a new canvas-mount note (joust adopted in SH3-2; centipede's mount stays
   deferred as a judgement call, not the cadence hazard). centipede's row untouched.
3. `plugins/joust/src/shell/timebase.ts` — a comment documenting AC-4: `@shared/loop`'s 60 Hz
   accumulator is NOT adoptable because joust drains wall time at the ROM's own `FRAME_HZ`;
   swapping in 60 Hz would trade the NUMBER the epic says stays in the game. The pump stays.

**Commit discipline:** the main.ts adoption landed with only joust's main.ts in it
(shell-convergence AC-3, one game per commit); the matrix/timebase edits are not `main.ts`
so they don't affect that pathspec.

**Regression posture:** the AC-2 GREEN locks (audio.resume survives, installAudioUnlock absent,
installHeldKeys+Space preventDefault intact) still pass — the mount refactor was boot-only, as
designed. Nothing in the audio/input/cadence path moved.

### Notes for the Reviewer (Obi-Wan)
- The **scope is deliberately narrower than the title** — read Design Deviations first. The
  title still names `installAudioUnlock`; that half was ruled OUT by the user (fused into the
  input path; sc1-1's rom-cadence deferral upheld). AC-2 is the lock proving it stayed out.
- The matrix prose is the highest-scrutiny artifact (it exists precisely because "prose reasons
  rot"). I refreshed the joust keydown code block to the current SH4-2 shape and split the
  deferral argument so no sentence claims joust still defers the mount. Please diff it against
  the tree.
- No PR created (SM owns that in finish).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 1 (fixed), dismissed 0, deferred 1 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (both fixed), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 2 with findings; 5 disabled via settings)
**Total findings:** 2 distinct confirmed + fixed inline, 1 deferred (pre-existing, out-of-scope), 0 dismissed

Cross-reference: comment-analyzer finding #1 and rule-checker #17 are the SAME defect (timebase.ts @shared/loop claim) — counted once. rule-checker #15/#25 (weak AC-4 test) is the second confirmed defect. comment-analyzer #2 (matrix:52 FRAME_DURATIONS) is the deferred pre-existing item, filed as a Delivery Finding.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** joust adopts `@shared/host-helpers.mountCanvas` for its `#game` mount and correctly, deliberately keeps its audio-unlock hand-rolled (the user-ruled mountCanvas-only scope). The mount swap is behaviourally equivalent to the retired hand-rolled code with a *stronger* runtime type guard (mountCanvas rejects a non-canvas `#game`, which the old cast did not). Two documentation/test-quality defects were found, both on the AC-4 `@shared/loop` verdict; both were **fixed inline this round** per user instruction and re-verified GREEN. No Critical/High. No blocking issues remain.

**Data flow traced:** `mountCanvas(document)` → `{ canvas, ctx: context }` → `configureContext(context)` and the render loop (safe: default selector `#game` is a static literal, not derived from any URL/query/hash; no injection surface; security subagent clean).

**Pattern observed:** shared-helper adoption via import-anchored source-wiring test (`plugins/joust/tests/main-host-adoption.test.ts`), mirroring the DONE SH3-4 (pac-man) and hardened per SH3-6's bar (import + call + destructure + scoped retirement guards + comment-defeat teeth).

**Error handling:** mountCanvas throws named errors for missing element / not-a-canvas / no-2d-context (`src/shared/host-helpers.ts:53-63`); the backbuffer/atlas `getContext` throws in main.ts are correctly preserved (retirement guard scoped to the `#game` line only).

### Rule Compliance (TS lang-review — via reviewer-rule-checker, 29 rules / 61 instances)
- **#1 type-safety escapes:** compliant — `const { canvas, ctx: context } = mountCanvas(document)` needs no cast or `!` (helper throws internally). No `as any`/`@ts-ignore` in the diff.
- **#8 / #18 / #A3 test quality:** compliant — reads `src/` not `dist/`; `stripComments` apparatus is mutation-tested by the guard-integrity block; assertions anchored to the real retirement contract, not incidental formatting.
- **#15 / #25 source-text-assertion strength:** VIOLATION at the AC-4 doc test (bare `@shared/loop` token, message over-claimed "state why") → **FIXED** inline (now requires `advanceFixedSteps` be named; message corrected).
- **#17 comment-asserts-a-mechanism:** VIOLATION at timebase.ts (the false "hard-coded 60 Hz" claim) → **FIXED** inline (verdict rewritten truthfully).
- **#20 count-from-same-diff:** compliant — README 170→171 matches the derived count.
- **#24 retirement scoped to the AC:** compliant — retired literals survive only in out-of-scope games (centipede/missile-command) and history.
- **#A1 core/shell boundary:** compliant — main.ts is shell; `@shared` import is legal.
- **#A2 share-the-VERB-not-NUMBERS:** compliant OUTCOME; the stated reasoning defect was #17, now fixed.

### Subagent Findings Incorporated

- **[SEC]** (reviewer-security): clean. The `mountCanvas(document)` swap introduces no injection/DOM-XSS/info-leak surface — the selector `#game` is a static literal (not from URL/query/hash), and the change moves from an unchecked cast to a *stronger* runtime type guard. No credentials, no network, no storage touched. No findings.
- **[DOC]** (reviewer-comment-analyzer): 2 findings. (1) HIGH `lying-docstring` — timebase.ts claimed @shared/loop is "hard-coded 60 Hz"; false (`advanceFixedSteps` takes `dt`, `createLoop` takes `hz`) → **confirmed + FIXED inline**. (2) LOW `stale-comment` — pre-existing `FRAME_DURATIONS` mis-citation at matrix.md:52, untouched by this diff → **deferred** as an out-of-scope Delivery Finding. Verified clean: the split matrix prose (no surviving "joust defers the mount" claim), the keydown code block vs main.ts, and the `installHeldKeys`-pins claim.
- **[RULE]** (reviewer-rule-checker): 29 rules / 61 instances, 2 violations — #17 (timebase comment, the same defect as [DOC]#1) and #15/#25 (the AC-4 doc test was a bare `@shared/loop` token match whose message over-claimed) → **both confirmed + FIXED inline**. All other TS-checklist and ADDITIONAL rules compliant (type-safety, test quality, retirement scoping, count-from-diff, core/shell boundary, share-the-VERB outcome).
- **[PRE]** (reviewer-preflight): green — 3845 tests pass across suites, 0 code smells, `tsc --noEmit` clean, orchestrator 463/463 (shell-convergence consistent with the flipped matrix cell).

### Devil's Advocate
Could the mount swap break the game? The strongest attack: `mountCanvas(document)` uses the default selector `#game`, but joust's original passed no selector to a typed `querySelector<HTMLCanvasElement>('#game')` — if joust's `index.html` hosted the canvas under a different id, the default would silently miss. Checked: joust's `index.html` hosts `<canvas id="game">`, and mountCanvas's default IS `#game`, so the selector is identical; a mismatch would throw a *named* error at boot, louder than the old code, not fail silently. Second attack: the error-message contract changed (`'index.html must host a <canvas id="game">'` → `'host: no element matches #game …'`) — AC-1 allows "an equivalent", and the new message is strictly more informative (adds the not-a-canvas case), so no regression; no test or user-facing surface asserts the old string (grep confirms only history/out-of-scope games retain it). Third: does the mount refactor perturb the audio/input/cadence path? No — the diff touches only the boot mount lines; the keydown handler, `installHeldKeys`, Space preventDefault, `pumpFrames`, and `SEED` are byte-unchanged, and the AC-2 lock + full 3379-test joust suite + orchestrator 463 confirm it. Fourth: the AC-4 documentation — the original defect (a false "not adoptable" reason) would have misled a future maintainer into thinking the shared loop couldn't take joust's rate; this was the one real bite and it is now corrected to the truthful "adoptable, deferred for scope", with the pumpFrames-duplication filed as a follow-up. Nothing else in the diff carries logic a confused user or stressed environment could turn into a fault: it is a boot-time helper swap plus docs.

**Handoff:** To SM for finish-story.