---
story_id: "sc1-1"
jira_key: "sc1-1"
epic: "sc1"
workflow: "tdd"
---
# Story sc1-1: Shell convergence: compositional host helpers across the seven games

## Story Details
- **ID:** sc1-1
- **Jira Key:** sc1-1
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T22:49:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T21:19:17Z | 2026-08-02T21:22:49Z | 3m 32s |
| red | 2026-08-02T21:22:49Z | 2026-08-02T21:43:30Z | 20m 41s |
| green | 2026-08-02T21:43:30Z | 2026-08-02T22:09:52Z | 26m 22s |
| review | 2026-08-02T22:09:52Z | 2026-08-02T22:49:43Z | 39m 51s |
| finish | 2026-08-02T22:49:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (blocking): the design spec's adoption matrix — this story's declared input — is STALE in two rows and must not be re-read as current.
  Affects `docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md` (lines 176-184; the `audio unlock` column records centipede and joust as `none`; both have one — joust `plugins/joust/src/main.ts:174` from jt5-1/`2cafac2` on 2026-07-31, centipede `plugins/centipede/src/main.ts:114-117` from cp5-2/`6c2bf1a` on 2026-08-01, one and two days AFTER the table was measured). Section 4.3 needs a pointer to the live matrix; pinned by the RED test `AC-1: the stale spec matrix is corrected, not silently superseded`.
  *Found by TEA during test design.*

- **Gap** (blocking): AC-2's named instrument cannot observe the change it is meant to police.
  Affects `plugins/joust/tests/arena-destruction.test.ts` (:235 replays `applyWaveDestruction` over `ArenaState` — pure geometry) and `plugins/centipede/tests/attract-demo.test.ts` (:119 replays a seeded sim through `core/sim` + `shell/render`). Neither imports `main.ts`, mounts a canvas, unlocks audio or installs a pause toggle, so both reproduce bit-for-bit whether adoption is correct or catastrophic. AC-2's evidence is replaced by the two guards named in the Design Deviations above.
  *Found by TEA during test design.*

- **Gap** (non-blocking): a new DOM-touching module under `src/shared/` fails the purity guard until it is classified.
  Affects `src/shared/tests/purity.test.ts` (`BROWSER_SUBPATHS`, line 40 — Dev must add `host-helpers`). `FORBIDDEN_GLOBALS` is `['document','window','canvas','FontFace']`, scanned whole-word and COMMENT-INCLUSIVE, so even a comment saying "canvas" trips it. Measured, not predicted: the satisfiability throwaway reddened `every source file outside the declared browser subpaths is DOM-free` on its first full-suite run. A sibling guard (`every declared subpath is a real source file`) means the classification cannot be added before the module exists.
  *Found by TEA during test design.*

- **Question** (non-blocking): joust's audio unlock is FUSED into its input-sampling handler, so adopting `installAudioUnlock` there necessarily edits the input path.
  Affects `plugins/joust/src/main.ts` (:173-177 — one `keydown` listener does `audio.resume()`, `held.add(e.code)` and `e.preventDefault()`). This is the exact hazard the epic names. The helper must be installed ALONGSIDE that listener, never by replacing it; pinned by the AC-2 input-seam guard.
  *Found by TEA during test design.*

- **Conflict** (non-blocking): a pre-existing orchestrator failure, NOT caused by this story.
  Affects `tests/sprint-repo-routing.test.mjs` (:534, `context scope follows the archive rule` — asserts `context-epic-jt8.md` is in scope because "jt8 has 4 open stories at the time of writing"; the jt9 re-cut in `ff92b3b` closed them). Proven by running that file in a detached worktree at `ff92b3b`, the upstream commit BEFORE this story's claim commit `e89083c`: it fails there too. The hardcoded jt8 example needs re-pointing at a currently-open epic.
  *Found by TEA during test design.*

### Reviewer (review)

- **Improvement** (non-blocking): a reviewer subagent ran `git stash` against the shared checkout and trapped this story's own tracking state.
  Affects the review process, not the code. `reviewer-rule-checker` attempted `git stash && git checkout e89083c^ -- .` to reproduce a baseline. The classifier blocked the `checkout` half, but **`git stash` had already executed**, silently removing the `status: in_progress → in_review` stamp from `sprint/epic-sc1.yaml` into `stash@{0}`. The subagent then reported that modification as "presumably from your own concurrent activity" — it was its own. Recovered with `git stash pop`; verified `sprint/epic-sc1.yaml:14` reads `status: in_review`. Two older `autostash` entries in the stash list pre-date this session and were left alone. **Reviewer briefs must forbid working-tree mutation outright and name the non-destructive alternatives (`git show <sha>:<path>`, `git worktree add --detach` under `mktemp -d`)** — the same hazard class as the recorded `git checkout -- <file>` probe that wipes uncommitted story work.
  *Found by Reviewer during review.*

- **Improvement** (non-blocking): with seven of nine reviewer specialists disabled on this project, `rule_checker` is the only independent check — and it earned its place.
  Affects `workflow.reviewer_subagents` (edge_hunter, silent_failure_hunter, test_analyzer, comment_analyzer, type_design, security, simplifier all `false`). It independently confirmed my two findings AND found a third (the comment-defeatable joust guard) that I missed. Note `test_analyzer` — the specialist whose whole domain is vacuous assertions — is disabled, and every defect in this review was a vacuous assertion. Worth reconsidering for test-heavy stories.
  *Found by Reviewer during review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The recorded adoption matrix carries the DECISION only; the behaviour census is derived**
  - Spec source: context-story-sc1-1.md, AC-1
  - Spec text: "with the adoption matrix recorded so a later reader can see which omissions are deliberate rather than missed"
  - Implementation: `docs/ops/shell-adoption-matrix.md` records one cell per game/helper drawn from a CLOSED vocabulary (`adopted` | `behaviour-absent` | `rom-cadence` | `own-implementation`). It records no behaviour census; `tests/shell-convergence.test.mjs` derives that from the seven `main.ts` files on every run.
  - Rationale: the matrix this story was handed was measured, correct on 2026-07-30, and wrong in two rows by 2026-08-01. A recorded census is a claim about seven files that nothing re-runs. Recording only the decision leaves nothing that can rot, and `behaviour-absent` — the one code that asserts something about the tree — is refuted against the tree.
  - Severity: minor
  - Forward impact: Dev authors the matrix file; its parse contract (a markdown table plus a `Baseline: <sha>` line) is pinned by the tests.

- **The three helpers are pinned to ONE module, `src/shared/host-helpers.ts`**
  - Spec source: context-epic-sc1.md ("small independent helpers")
  - Spec text: "compositional rather than monolithic — small independent helpers"
  - Implementation: the RED imports all three from a single `@shared/host-helpers` module rather than three sibling modules.
  - Rationale: a failing test must name a concrete import path. One module is also one entry in `purity.test.ts`'s `BROWSER_SUBPATHS` classification rather than three. Compositionality here is about each game adopting helpers INDEPENDENTLY — which the adoption matrix enforces per cell — not about file count.
  - Severity: minor
  - Forward impact: Dev may split into three modules provided the test imports and the purity classification move together; the behaviour contracts are unaffected.

- **AC-2 is guarded by the frame clock and the input seam, NOT by the determinism replays it names**
  - Spec source: context-story-sc1-1.md, AC-2
  - Spec text: "proven by their existing determinism replays reproducing bit-for-bit rather than by the suite being green"
  - Implementation: two source-anchored guards — centipede's `export const FRAME_HZ = 15750 / 263`, and joust's `held.add(e.code)` / `held.delete(e.code)` / `e.preventDefault()` input sampling. The replays are left untouched and must stay green, but are not cited as the proof.
  - Rationale: both named replays are CORE replays and cannot observe a shell helper — see the Delivery Finding below. Citing an instrument that is blind to the change would manufacture corroboration.
  - Severity: **major** — this changes what AC-2's evidence is
  - Forward impact: the Reviewer should judge AC-2 on the two guards plus green cadence suites, and should NOT accept "the determinism replays still pass" as evidence on its own.

### Dev (implementation)

- **battlezone counts as `adopted` for pause, not `own-implementation`**
  - Spec source: design spec §4.3 adoption matrix, line 181
  - Spec text: "battlezone | **own** `applyLetterbox` | ✅ | **own** `shell/pause`, no overlay"
  - Implementation: battlezone adopts `installPauseToggle`, fed the `isPauseKey` its own `shell/pause` exports.
  - Rationale: reading `plugins/battlezone/src/shell/pause.ts` settles it — the module **re-exports `INITIAL_PAUSED`, `isPauseKey` and `togglePaused` verbatim from `@shared/pause`**, and only `stepUnlessPaused` is a local 4-arg delegate. Its keydown listener was byte-identical to the other four. The spec's "own" is true of the OVERLAY (a local `drawPauseOverlay`) and of the gate, neither of which this story touches. The helper takes the predicate as a parameter precisely so a game can adopt the wiring without adopting a policy.
  - Severity: minor
  - Forward impact: `own-implementation` is consequently unused in the shipped matrix. It is kept in the vocabulary as the code for a genuine divergence; the matrix documents that it is currently unused so a reader does not think a row is missing.

- **The RED's matrix parse contract was widened to a delimited block**
  - Spec source: `tests/shell-convergence.test.mjs` (TEA's RED), `readMatrix()`
  - Spec text: parsed every markdown row in the file whose first cell was a game name
  - Implementation: the parser now reads only between `<!-- adoption-matrix:start -->` and `<!-- adoption-matrix:end -->`, and asserts the markers exist.
  - Rationale: a defect, not a preference. The first document to satisfy the contract immediately broke it — the section explaining how the OLD matrix rotted carries a second table keyed by game (`| centipede | 2026-08-01 | cp5-2 | ...`), which parsed as a matrix row and silently overwrote the real centipede row. A file about seven games will keep growing tables about those seven games. No assertion changed; only the region they read. Proven non-vacuous: stripping a marker reddens all six matrix-reading tests with a named message rather than scanning empty.
  - Severity: minor
  - Forward impact: the matrix table must stay between the markers; every other table in that file is free prose.

- **Nine red-baron test doubles gained `querySelector`**
  - Spec source: AC-1 (adoption), and the tests' own DOM stubs
  - Spec text: n/a — the stubs are test apparatus, not spec
  - Implementation: `{ getElementById: () => canvas }` became `{ getElementById: ..., querySelector: ... }` in `tests/helpers/boot-cockpit.ts`, `determinism.test.ts`, `cockpit-loop.test.ts` and six wiring suites.
  - Rationale: red-baron is the one game whose suites IMPORT `main.ts` under a hand-rolled `document`. `mountCanvas` takes a selector, so the doubles had to model the method the production code now calls. Not one assertion was changed or relaxed — without this the files failed at import with `TypeError: root.querySelector is not a function`.
  - Severity: minor
  - Forward impact: a future helper that reaches for another `document` method will need the same nine doubles updated; they are a known cluster, listed here.

### Reviewer (audit)

All six logged deviations audited. Five ACCEPTED, one ACCEPTED-with-caveat, one UNDOCUMENTED added.

- **TEA: the recorded matrix carries the DECISION only** → ✓ **ACCEPTED**. This is the best idea in the story and it is sound: a census nothing re-runs rots, as the 2026-07-30 table proved in 48 hours. Caveat that does not change the verdict on the deviation itself: the *derivation* it relies on is broken (finding A) — the design is right, the implementation of it is not.
- **TEA: the three helpers pinned to ONE module** → ✓ **ACCEPTED**. A failing test needs a concrete import path, and one module is one `BROWSER_SUBPATHS` entry rather than three. The compositionality the epic asked for is per-adoption, and the matrix enforces it per cell.
- **TEA: AC-2 guarded by the frame clock and input seam, not the replays it names** → ✓ **ACCEPTED**, and the reasoning is correct: I confirmed `arena-destruction.test.ts:235` replays `applyWaveDestruction` over `ArenaState` and `attract-demo.test.ts:119` imports `core/sim` + `shell/render`; neither touches `main.ts`. Citing them would have been citing an instrument blind to the change. Note the substituted guard is itself defective (finding C) — but the *decision* to substitute was right, and AC-2 is independently satisfied by the zero-byte diff to both games.
- **Dev: battlezone counts as `adopted` for pause** → ✓ **ACCEPTED**. Verified at `plugins/battlezone/src/shell/pause.ts:33`: the module re-exports the three shared primitives verbatim. The spec's "own `shell/pause`" is true of the gate and the overlay, both untouched.
- **Dev: the matrix parse contract widened to a delimited block** → ✓ **ACCEPTED**. A real defect found by the first document to satisfy the contract, not a preference. The marker is proven non-vacuous (stripping it reddens all six matrix-reading tests with a named message).
- **Dev: nine red-baron test doubles gained `querySelector`** → ✓ **ACCEPTED**. Necessary, mechanical, and no assertion was changed or relaxed — the doubles model the method the production code now calls. I confirmed none of the nine ever returns `null` from `getContext`, so they cannot be hiding a context-failure path.

- **UNDOCUMENTED — the audio-unlock TARGET widened from the canvas to the window in four games.** Spec/prior code bound the gesture to the canvas (tempest and asteroids `click`, star-wars and battlezone `pointerdown`); all four now listen on `window`. Dev documented the *event type* change at `src/shared/host-helpers.ts:74-77` and in each game's comment, but not the target-scope change. Verified behaviourally inert — the `<canvas id="game">` is the only element in each game's `<body>`, so there is nothing else to click that should not unlock audio. Severity: **Low**. Recorded here so it is not rediscovered as a mystery later; it needs a comment, not a revert.

## Sm Assessment

Setup complete. The phase pointer read `setup` on arrival and the story is stamped
`in_progress` in `sprint/epic-sc1.yaml`. Claim pushed to `origin main` (e89083c) and
an empty claim branch `feat/sc1-1-shell-convergence-host-helpers` pushed so a sibling
checkout's `git branch -r | grep sc1-1` probe resolves. Work itself is trunk-based on
`main`.

**Pre-setup probes (both run, both clean for this story):** no remote branch matched
`sc1-1`; the only live sibling session across `/Users/slabgorb/Projects/a-*` is a-2 on
`cp6-1`. No open PRs on `slabgorb/arcade`, so the merge gate is clear.

**Why this story is workable.** Its declared input — the measured seven-game adoption
matrix at `docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md:176-184` —
is present and intact. That matters because the matrix exists precisely to refute an
earlier false premise (that all seven `main.ts` files repeat the same boot sequence);
a story built on the refuted premise would have been unworkable. It is not.

**The reframing TEA gets for free, measured at setup.** `src/shared/` already exports
the pure primitives (`resizeToDisplay`, `letterbox`; `INITIAL_PAUSED`, `isPauseKey`,
`togglePaused`, `stepUnlessPaused`; `drawEscOverlay`; `createAudioEngine`). What no
game shares is the *imperative wiring* — the listeners, the first-gesture unlock hook.
So the three named helpers are an **install layer over existing primitives**, not new
primitives. The strongest evidence of genuine duplication is `installPauseToggle`:
four games (tempest, star-wars, asteroids, red-baron) import an identical symbol set
and each hand-wires its own keydown listener.

**The one thing TEA must open with, not discover late.** Section 4.3 names `mountCanvas`
as a likely helper at :207 while the same section judges the only universally-common
seam — `querySelector('#game')` + `getContext('2d')` — "not an abstraction worth a
helper" at :186-188. Both statements are in the cited source. This is a design ruling
I am deliberately NOT making: whether `mountCanvas` survives, and whether it carries a
resize strategy, belongs to TEA/Dev. Naming three helpers is not a mandate to ship three.

**Sequencing constraint handed forward.** centipede and joust are the ROM-cadence games
and also the two that adopt least from `@shared` today (centipede: `highscore` only;
joust: nothing). AC-2 demands bit-for-bit determinism replays, explicitly not a green
suite. a-2 is concurrently in RED on `cp6-1` inside `plugins/centipede/`. All three
facts point the same way: adopt centipede and joust LAST, or not at all, and re-probe
the sibling before touching `plugins/centipede/src/shell/`.

**Size note, non-blocking.** Epic `sc1` holds this single 8-point story — the whole
epic. AC-3 already forces one-game-per-commit, so the internal seams are per-game and
a split remains available to PM later if the review rounds get unwieldy. Not splitting
it here: the user named `sc1-1` and the ACs are coherent as written.

Handing off to Han Solo for RED.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `src/shared/tests/host-helpers.test.ts` — 15 behaviour tests for the three helpers (jsdom). RED: the module `src/shared/host-helpers.ts` does not exist.
- `tests/shell-convergence.test.mjs` — 8 cabinet-wide tests. 6 RED (AC-1 ×5, AC-3 ×1), 2 GREEN-on-arrival regression guards (AC-2), both mutation-proven below.

**Tests Written:** 23 tests covering 4 ACs. Commit `088bc3d`.

### The two findings that changed the story

**1. The matrix this story was handed had already rotted.** Its declared input is
the "MEASURED adoption matrix" at the design spec's §4.3. It was measured, and it
was correct on 2026-07-30 — and it is wrong in two rows now. It records centipede
and joust as having no audio unlock; both have one, added one and two days after
the table was written (joust `main.ts:174`, jt5-1/`2cafac2`, 2026-07-31; centipede
`main.ts:114-117`, cp5-2/`6c2bf1a`, 2026-08-01). Dated from `git log -S`, not
inferred.

So the matrix AC-1 asks this story to record is the same artifact that just failed.
The design answer is that the new matrix records **only the decision** — one cell
per game/helper from a closed vocabulary — and the behaviour census is **derived
from the seven `main.ts` files on every run**. Nothing is left that can rot, and
`behaviour-absent`, the single code that asserts anything about the tree, is
refuted against the tree by a named test. That test is the one the spec's own
matrix would have failed.

**2. AC-2 names an instrument that is blind to the change.** It asks for the
cadence to be proven "by their existing determinism replays reproducing
bit-for-bit". Both replays are CORE replays: joust's
(`arena-destruction.test.ts:235`) runs `applyWaveDestruction` over `ArenaState`,
and centipede's (`attract-demo.test.ts:119`) runs a seeded sim through `core/sim`
and `shell/render`. Neither imports `main.ts`; neither mounts a canvas, unlocks
audio or installs a pause toggle. They will reproduce bit-for-bit whether adoption
is correct or catastrophic. Citing them would have manufactured corroboration, so
AC-2's evidence is replaced by two guards that CAN see a regression — centipede's
frame clock and joust's input-sampling seam — with the replays kept green as a
necessary-but-insufficient condition. Recorded as a major Design Deviation because
it changes what AC-2's evidence is.

### The `mountCanvas` question SM declined to settle

Settled by census, and it survives. The spec calls the universal seam
(`querySelector('#game')` + `getContext('2d')`) "not an abstraction worth a
helper" and that judgement is right about those two calls — but it was made
without looking at the error handling around them, which is where the duplication
actually is:

- **centipede and joust already hand-wrote the checked mount, with a BYTE-IDENTICAL
  error string** — `'index.html must host a <canvas id="game">'` appears verbatim in
  both (`centipede/src/main.ts:24`, `joust/src/main.ts:33`). That is copy-paste
  across two games, which is exactly the repo's stated eligibility bar for
  `src/shared` ("only code byte/algorithm-identical across >=2 games").
- **The other five mount with two unchecked assertions** — `getElementById('game')
  as HTMLCanvasElement` then `getContext('2d')!` — so a missing element is a bare
  `TypeError: Cannot read properties of null`, naming neither the selector nor the
  fix. red-baron does not even assert: its `ctx` is nullable and used anyway.
- Both existing idioms share a hole the helper closes: `querySelector<HTMLCanvasElement>`
  is a CAST, not a check, so a `<div id="game">` passes the `if (!canvas)` guard and
  dies later on `.getContext is not a function`.

`installPauseToggle` needed no argument: five games carry the toggle line
`if (!e.repeat && isPauseKey(e.key.toLowerCase())) paused = togglePaused(paused)`
with **one unique spelling across all five**.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes (`!` on runtime-nullable) | `throws a NAMED error when nothing matches`, `throws when the selector matches a NON-canvas element` | failing |
| TS #15 source assertion matches a TOKEN not the CLAIM | `AC-2: centipede keeps the ROM frame clock` (anchored to the declaration) | passing (mutation-proven) |
| TS #15 universally-quantified loop that can skip every iteration | count guards in `adopted means the game actually imports that helper` + `no game GROWS a behaviour` | failing |
| TS #17 claim asserting a mechanism nobody re-ran | `AC-1: the stale spec matrix is corrected` | failing |
| TS #18 fixture whose value IS the expectation | `honours a NON-DEFAULT selector — the parameter is read, not decorative` | failing |
| TS #18 helper keyed on a runtime global (`instanceof` across environments) | non-canvas case keys on `typeof getContext`, not `instanceof` | failing |
| mg1-5 seam injected but never read (fails OPEN to production) | every helper takes its seam as a REQUIRED positional parameter, not an options bag | failing |

**Rules checked:** 7 applicable lang-review rules have test coverage.
**Self-check:** 2 vacuous tests found and fixed — both caught by mutation, neither by reading.

### Mutation battery (AC-4)

AC-4 requires each helper be proven non-vacuous by disabling it. Eleven mutants
against the throwaway implementation, **11/11 caught**:

| # | Mutation | Tests reddened |
|---|---|---|
| M1 | `mountCanvas`: drop the null-element check | 1 |
| M2 | `mountCanvas`: drop the non-canvas check | **0 → 1 after fix** |
| M3 | `mountCanvas`: drop the ctx-null check | 1 |
| M4 | `mountCanvas`: ignore the `selector` parameter | 1 |
| M5 | `installAudioUnlock`: keydown only, drop pointerdown | 2 |
| M6 | `installAudioUnlock`: fire once then self-remove | 1 |
| M7 | `installAudioUnlock`: disposer drops keydown only | 1 |
| M8 | `installPauseToggle`: drop the `!e.repeat` edge | 1 |
| M9 | `installPauseToggle`: drop the `toLowerCase` fold | 3 |
| M10 | `installPauseToggle`: ignore the `initial` seam | 1 |
| M11 | `installPauseToggle`: disposer is a no-op | 1 |
| A | centipede `FRAME_HZ` → `60` | **0 → 1 after fix** |
| B | joust: drop `held.add(e.code)` | 1 |

Nine of eleven redden exactly ONE test — precise, uncoupled guards. The two broad
ones (M5, M9) are structural, which is the expected signature.

**The battery earned its keep twice, and both defects were mine:**

- **M2 reddened nothing.** My non-canvas test asserted only
  `.toThrow(/canvas|getContext/i)`. With the guard deleted the code reaches
  `div.getContext('2d')` and throws `TypeError: canvas.getContext is not a
  function` — a message matching my own regex. The test passed with or without the
  mechanism. Fixed by rejecting the raw `TypeError`, the discipline that made M1
  bite.
- **Mutant A reddened nothing.** My cadence guard grepped for `15750/263`;
  `timebase.ts:5` explains the clock in a COMMENT, so rewriting the real constant
  on `:20` to `60` left the guard green. Fixed by anchoring to
  `export const FRAME_HZ = ...`. This is TS #15 exactly — a guard that greps
  source text reads your prose about the thing as the thing.

Both mutations were applied and reverted from scratchpad copies by absolute path,
never `git checkout --`; `git status` verified clean after each.

### Suite state

- **Full vitest:** 745 files / 11411 tests pass; 1 file fails — `host-helpers.test.ts`, unresolved import, the intended RED.
- **Orchestrator:** 390 tests, 382 pass, 8 fail — 6 mine, plus `tsc --noEmit exits 0 with the shared tests in the program` (correct collateral of the missing module) and one PRE-EXISTING failure proven not mine (see Delivery Findings: it fails at `ff92b3b`, the upstream commit before this story's claim).
- **`npm run lint`:** exactly one error, `Cannot find module '../host-helpers'` — the RED itself. No suppressions were added; `src/shared/tests` is typechecked with nothing excluded and `shared-tests-typechecked.test.mjs` guards that, so Dev's first act clears both.

### What Dev needs, in order

1. Create `src/shared/host-helpers.ts` exporting `mountCanvas`, `installAudioUnlock`, `installPauseToggle`. Every seam is a REQUIRED positional parameter — no options bag (mg1-5: an optional injection point that does not exist yet fails OPEN).
2. **Add `host-helpers` to `BROWSER_SUBPATHS` in `src/shared/tests/purity.test.ts`.** This will fail on your first save otherwise, and the word `canvas` in a comment is enough to trip it.
3. Author `docs/ops/shell-adoption-matrix.md` with a `Baseline: <sha>` line taken BEFORE adoption starts, and a row per game.
4. Point the spec's §4.3 at that matrix.
5. Adopt one game per commit. centipede and joust LAST — and re-probe the sibling checkout first: a-2 was in `red` on cp6-1 inside `plugins/centipede/` at setup.

**Handoff:** To Yoda for implementation.

## Dev Assessment

**Status:** GREEN
**Commits:** `acf096a` (helpers) → `7840ea4` tempest → `cbd15e2` star-wars → `a47f64b` asteroids → `724f1ad` red-baron → `18217c3` battlezone → `d2e4de2` (matrix + spec correction)

### Suite state

| check | result |
|---|---|
| `npx vitest run` (every app) | **746 files / 11426 tests pass**, 0 fail |
| `npm run lint` (tsc, repo-wide) | clean |
| `npm run test:orchestrator` | 390 tests, 389 pass, **1 fail — pre-existing, proven not mine** |
| `node scripts/build-app.mjs <id>` × 5 adopters | all build |

The single orchestrator failure is `context scope follows the archive rule`
(`tests/sprint-repo-routing.test.mjs:534`), which TEA proved fails at `ff92b3b` —
the upstream commit before this story's claim. It is the jt9 re-cut leaving the
test's hardcoded jt8 example with no open stories. Recorded as a Delivery Finding;
untouched here because fixing an unrelated sprint-tooling assertion inside a shell
story is how a story stops being bisectable.

### What shipped

`src/shared/host-helpers.ts` — `mountCanvas`, `installAudioUnlock`,
`installPauseToggle`. Adopted by **five** games, one per commit (AC-3, verified by
`git show --name-only` per commit: each adoption commit touches exactly one
`plugins/*/src/main.ts`). centipede and joust adopt nothing, argued in the matrix.

`docs/ops/shell-adoption-matrix.md` — the live decision table. Records only the
DECISION, from a closed vocabulary; the behaviour census is derived from the tree
on every run, so there is nothing left that can rot. The design spec's §4.3 table
now carries a banner naming its two stale cells and pointing here.

### Two things reading settled that the spec asserted

- **battlezone's pause is not its own.** `shell/pause.ts` re-exports
  `INITIAL_PAUSED`/`isPauseKey`/`togglePaused` **verbatim** from `@shared/pause`;
  only `stepUnlessPaused` is a local 4-arg delegate. So it adopts the helper while
  keeping its own gate and overlay — logged as a deviation from the spec's "own
  `shell/pause`" row.
- **red-baron's `ctx` was genuinely nullable.** It cast the element and then
  carried `CanvasRenderingContext2D | null` through every draw site behind an
  `&& ctx` guard — including the pause overlay, which therefore silently did not
  draw if the context were ever missing. The checked mount proves it at boot.

### Mutation battery re-run against the DELIVERED code

The RED battery scored TEA's throwaway; this is a different program, so it got its
own. Eleven mutants, **11/11 caught** — and the interesting result was a false
survivor:

- **D9 (drop the `toLowerCase` fold) first reported 0 reddened.** The tempting read
  is a coverage hole. It was an **anchor miss wearing a survivor's clothes**: my doc
  comment quotes the original line verbatim (`host-helpers.ts:122`), the quote sits
  *above* the real code (`:141`), and a first-occurrence replace mutated the
  **comment**. No `ANCHOR MISS` printed, because the mutation did apply — just not
  to code. Re-run anchored on the code-unique tail (`)) paused = !paused`) it
  reddens 3 tests, matching the throwaway.
- Same family as the two defects the RED battery caught (a guard grepping
  `15750/263` that the file's own comment kept green). **Third time this story that
  prose about the code was mistaken for the code** — worth generalising: when a
  module documents its own mechanism verbatim, every source-anchored operation on it
  needs a code-unique anchor, mutations included.
- Nine of eleven redden exactly one test; D5 and D9 are structural and redden 2 and 3.

### Verified by running it, not only by the suite

The house convention is explicit that the shell is verified by loading the game.
This story rewires five games' boot paths, so I did — on **port 5290, not 5270**:
`lsof` showed 5270 held by `/Users/slabgorb/Projects/a-2`, the sibling checkout, so
a screenshot there would have been someone else's tree.

- tempest, star-wars, asteroids, battlezone, red-baron all boot with **zero console
  errors** (the one error seen anywhere was a `favicon.ico` 404, unrelated).
- tempest renders its attract screen; **Escape draws the PAUSED card** over the
  dimmed tube — the helper's toggle driving the real overlay.
- **The `!e.repeat` edge guard holds in a real browser:** nine auto-repeat Escapes
  left it PAUSED. Nine is odd, so a broken guard would have landed unpaused.
- red-baron — the nullable-`ctx` case — renders HUD, horizon and enemy plane.

**Handoff:** To Obi-Wan Kenobi for review.

## Dev Assessment — rework round 1

**Status:** GREEN
**Commit:** `98e9bc1` — one file of guards, two comments. No product code changed.

All six findings fixed, and each of the four test defects **re-proven with the
Reviewer's own reproduction** rather than by reasoning:

| # | Fix | Re-proof |
|---|---|---|
| A | `PERFORMS` now reads the `Baseline:` commit via `git show`, not the working tree | joust given a real `installPauseToggle` import + call, cell flipped to `adopted` → **REDDENS** `no game GROWS a behaviour` |
| B | anchored to `import {…} from '@shared/host-helpers'` **and** a call site | tempest's import replaced by a local shadow of the pre-story anti-pattern → **REDDENS** with a named message |
| C | every source assertion routed through a new `stripComments()` | commenting out `held.add` / `held.delete` / `preventDefault` each **REDDENS exactly one test** |
| D | `checked > 0` guard added | flipping both `behaviour-absent` cells to another valid code → **REDDENS** "compared nothing" |

**C was wider than reported.** The centipede frame-clock guard had the same latent
hole: it was anchored to `export const FRAME_HZ` (which survived the earlier
rewrite-the-value mutation) but would have survived COMMENTING THE DECLARATION OUT.
Fixed in the same pass; the comment-out mutant now reddens it.

**On A, one design note.** The call-site alternations in `PERFORMS` are kept rather
than deleted. At the baseline no game had adopted, so they match nothing and cost
nothing — and if a later story moves the baseline forward past some adoptions, they
keep the predicate answering the same question. The bug was never the alternation;
it was asking a question about the past while looking at the present.

### Suite state

- **My scope — every project this story touches (shared, tempest, star-wars, asteroids, battlezone, red-baron, centipede): 632 files / 8768 tests, 0 failures.**
- `npm run lint`: clean. `node --test tests/shell-convergence.test.mjs`: 8/8.
- Orchestrator: 390 tests, 389 pass — the same single pre-existing `sprint-repo-routing` failure.
- **Full `npx vitest run` shows 9 failures, none of them mine.** They are all in
  `plugins/joust/tests/glide-prologue.test.ts` and `glide-prologue-source.test.ts`,
  added by commit `4e3f61f` ("test: add failing tests for jt9-1"), a SIBLING
  checkout's story which is `in_progress` — its RED phase, working as intended. The
  rebase interleaved its four commits into my range, so a range-based diff looks
  like they are mine; the commit that introduced them is not one of my seven. This
  story has a **zero-byte diff to `plugins/joust/`**, and joust's other 102 files /
  2484 tests pass.

**Handoff:** Back to Obi-Wan Kenobi for re-review.

## Reviewer Assessment — round 2

**Verdict:** APPROVED — conditional on one two-word comment edit named below, which
needs no re-review.

All three HIGH findings and the MEDIUM are fixed. I did not take the rework report's
word for any of them: I re-ran each original exploit myself against the delivered
guards, plus a fifth I invented, and each now reddens **exactly one** test.

| exploit | before | now |
|---|---|---|
| A — joust (no pause) grows one, cell flipped to `adopted` | green | ✖ `no game GROWS a behaviour` |
| B — tempest keeps cell `adopted`, uses a local shadow of the pre-story unchecked-cast anti-pattern | green | ✖ `adopted means the game actually imports that helper` |
| C — comment out joust's `held.add(e.code)` | green | ✖ `joust keeps its per-frame input sampling` |
| D — matrix left with no `behaviour-absent` cell | green (compared nothing) | ✖ `a behaviour-absent cell is refuted by the tree` |
| **E — comment out tempest's `@shared/host-helpers` import entirely** (mine, new) | — | ✖ `adopted means the game actually imports that helper` |

**The fix is confined to the guards.** `git show 98e9bc1` touches three files, and
filtering its diff to non-comment lines in the two product files returns **empty** —
the only product-code change in the whole rework is comment text. Every behaviour the
first review verified still stands unaltered.

**`stripComments` is the right shape and I probed it rather than reading it** (TS #18:
a helper that reimplements a platform algorithm is untested code). Seven cases: line,
trailing and block comments strip; multi-line blocks strip; real code survives; and the
`(^|\s)` anchor genuinely protects `https://` from being eaten, which was the claim its
comment makes. Over-stripping would fail toward RED, which is the safe direction.

**Dev widened C beyond what I reported, correctly.** The centipede frame-clock guard had
the same latent hole — anchored to `export const FRAME_HZ`, it survived rewriting the
value but would have survived commenting the declaration out. Fixed in the same pass and
mutation-proven. Finding a defect's siblings rather than only its instance is the right
instinct.

### The one finding

| # | Severity | Location | Finding |
|---|---|---|---|
| G | **LOW** `[RULE]` | `plugins/red-baron/src/main.ts:71` | The comment written to FIX finding E cites the surviving `ctx` guards at `:149, :203 and :890`. They are at **153, 207 and 894** — the comment's own four added lines shifted its referents. TS #13 (fix-introduced regression) via TS #17. |

This is the story's own recurring defect in miniature, and the fifth time prose about
code has been wrong here. The durable fix is **not** to correct the three numbers — a
same-file line citation drifts every time the file is edited, which is exactly how it
broke. Name the guards instead: *"two `if (!ctx) return` early exits in the draw
helpers, and a `gameOver && ctx` in `frame()`"* — one grep to check, and stable under
any edit. That is the same lesson this project already recorded as "state the complete
write set rather than line extents."

Verified NOT drifted: the three cross-file citations in `tests/shell-convergence.test.mjs`
(`timebase.ts:20`, `arena-destruction.test.ts:235`, `attract-demo.test.ts:119`) all
resolve to exactly what they claim. Citations to *other* files are stable; only
same-file ones move under you.

### Suite state, re-run by me

- `npm run lint`: clean.
- **Every project this story touches — shared, tempest, star-wars, asteroids, battlezone, red-baron, centipede: 632 files / 8768 tests, 0 failures.**
- `node --test tests/shell-convergence.test.mjs`: 8/8.
- Orchestrator: 390 tests, 389 pass — the same single pre-existing `sprint-repo-routing.test.mjs:534` failure, reproduced at `f45005c`, before any sc1-1 commit.
- Builds: all five adopters OK.
- **The 9 `joust` failures in a full `vitest run` are not this story's.** Confirmed independently: both files were added by `4e3f61f` ("test: add failing tests for jt9-1"), a sibling checkout's story that is `in_progress` — its RED phase. This story has a zero-byte diff to `plugins/joust/`. joust's other 102 files / 2484 tests pass. The rebase interleaved four jt9-1 commits into this story's commit range, so a range diff misattributes them; the introducing commit does not.

### Why this is APPROVED and not a third round

No Critical or High survives. The product code was correct from round 1 and is
unchanged; the guards now catch five distinct exploits including one I invented after
the fix; and the only outstanding item is three stale digits in a comment. Bouncing an
8-point story for that would be the disproportionate call this project has already
recorded as a mistake. Land the comment edit, then finish.

**Handoff:** To Yoda for the one-line comment correction, then straight to Grand Admiral
Thrawn for finish — no third review round.

## Dev Assessment — finding G correction

**Status:** GREEN. Commit `56218ee`.

The comment no longer cites line numbers at all. It names the guards — *two
`if (!ctx) return` early exits in the draw helpers, one `gameOver && ctx` in
`frame()`* — which is checkable by grep and stable under any edit, rather than
three digits that drift whenever the file above them changes.

**Verified with comments stripped: 2 and 1, exactly as claimed.** That method
matters: a raw `grep -c` reports **3 and 2**, because the comment now quotes the
code it describes. That is the sixth time in this story that prose about code was
counted as the code — the `15750/263` guard, the D9 mutation anchor, the second
matrix table, the joust input seam, the centipede declaration, and now this. The
`stripComments()` helper this story introduced is what made checking it a one-liner.

`npm run lint` clean; red-baron 81 files / 1346 tests green.

**One blemish, left deliberately.** The commit message for `56218ee` lost two
backticked code snippets to shell command substitution — it reads "two  early
exits" where it should name them. The message is otherwise accurate and the code is
correct. Fixing it means `--amend` plus a force-push of shared `main` while a
sibling checkout is mid-story on jt9-1, which trades a cosmetic gain for a real risk
to someone else's history. Not worth it. (The habit worth keeping: pass a commit
message via `-F <file>` when it contains backticks.)

**Handoff:** To Grand Admiral Thrawn for finish.

## Subagent Results

| Subagent | Received | Decision |
|---|---|---|
| reviewer-preflight | Yes | N/A — mechanical run, no findings to judge. Numbers reproduced independently; the one orchestrator failure correctly attributed as pre-existing. |
| reviewer-rule-checker | Yes | confirmed 6, dismissed 0, deferred 1 — A, B, C, D, E, G confirmed (all re-reproduced by me); F (a pre-existing stale `togglePaused` comment at `red-baron/src/main.ts:638`, outside this diff) deferred as out of blast radius. |
| reviewer-edge-hunter | Skipped — disabled via `workflow.reviewer_subagents.edge_hunter: false` | N/A |
| reviewer-silent-failure-hunter | Skipped — disabled via `workflow.reviewer_subagents.silent_failure_hunter: false` | N/A |
| reviewer-test-analyzer | Skipped — disabled via `workflow.reviewer_subagents.test_analyzer: false` | N/A |
| reviewer-comment-analyzer | Skipped — disabled via `workflow.reviewer_subagents.comment_analyzer: false` | N/A |
| reviewer-type-design | Skipped — disabled via `workflow.reviewer_subagents.type_design: false` | N/A |
| reviewer-security | Skipped — disabled via `workflow.reviewer_subagents.security: false` | N/A |
| reviewer-simplifier | Skipped — disabled via `workflow.reviewer_subagents.simplifier: false` | N/A |

**All received: Yes** — both enabled specialists returned and were fully incorporated; the seven disabled ones are skipped by project settings, not by impatience.

## Reviewer Assessment

**Verdict:** REJECTED

Three HIGH findings, all the same class, all mutation-proven. **The product code is
correct — every defect is in the new guards.** That makes this a tightly scoped
rework: `tests/shell-convergence.test.mjs` is the only file that must change.

### The theme

This story's thesis is that a guard must not be able to rot or go vacuous. It
argued that thesis well — the RED battery caught two of its own defects, and Dev's
delivered battery caught a third. Then it shipped three guards that fail the thesis.
All three are TS lang-review **#15** ("Source-text assertions that match a TOKEN,
not the CLAIM… **Every guard must be mutation-tested: delete the mechanism and
require red**"). Per this project's rule that a finding matching a stated project
rule may be downgraded but not dismissed, these stand.

### Findings

| # | Severity | Location | Finding |
|---|---|---|---|
| A | **HIGH** `[RULE]` | `tests/shell-convergence.test.mjs:64-68`, `:158-174` | `AC-1: no game GROWS a behaviour` is **tautological**. Each `PERFORMS` predicate matches the helper's own call site (`\binstallPauseToggle\s*\(` etc.), so for any `adopted` cell it is true *because* the game adopted. It can never fail, for any of the three helpers. |
| B | **HIGH** `[RULE]` | `tests/shell-convergence.test.mjs:128-156` | `AC-1: adopted means the game actually imports that helper` verifies neither. It matches a bare `\bhelper\b` (a **comment** satisfies it) and, separately, *any* `@shared/` import — and all five adopters already import `@shared/highscore`/`view`/`loop`, so that half is unconditionally true and discriminates nothing. |
| C | **HIGH** `[RULE]` | `tests/shell-convergence.test.mjs:292-313` | The joust AC-2 input-seam guard is **comment-defeatable**. All three regexes match raw source with no comment stripping, so commenting out `held.add(e.code)` leaves the suite green. This is the guard the file's own header calls the load-bearing proof for the riskiest cadence-sensitive game. |
| D | MEDIUM `[RULE]` | `tests/shell-convergence.test.mjs:176-193` | The `behaviour-absent` refutation loop has no `checked > 0` guard, unlike both its siblings. Non-vacuous today (2 live cells) but vacuous the moment a matrix carries none. |
| E | LOW `[RULE]` | `plugins/red-baron/src/main.ts:69` vs `:149,:203,:890` | The new comment says the mount replaces the per-call-site `&& ctx` guards. Three of the four remain (now unreachable). The comment implies a cleanup that was not done. TS #17. |
| F | LOW `[RULE]` | `src/shared/host-helpers.ts:74-77` | The unlock's event type is documented; the **target** widening (canvas→window, four games) is not. Verified behaviourally inert — the `<canvas id="game">` is the only element in each `<body>` — but undocumented. |

**Mutation-proof for A, independently reproduced:** joust — a game with no pause —
was given a real `installPauseToggle` import and call, and its matrix cell flipped
`behaviour-absent`→`adopted`. That is verbatim the thing the epic forbids ("a game
that has no pause today must not grow one here"). All 8 tests stayed green.

**Mutation-proof for B:** tempest's `mountCanvas` import was replaced by a local
shadow reimplementing the exact pre-story anti-pattern (`as HTMLCanvasElement` +
`getContext('2d')!`). `tsc` does not catch it (the local is used) and the test still
passes as "adopted".

**The fix for A is already in the file.** The matrix carries `Baseline: 088bc3d`, and
AC-3 already reads it. Evaluating `PERFORMS` against `git show <baseline>:plugins/<g>/src/main.ts`
gives the pre-adoption answer. I verified it discriminates correctly: at the baseline,
tempest/battlezone pause = true, centipede/joust pause = **false** — so the joust
scenario above would be caught. For B and C, anchor to the import statement and a call
site, and strip `//` and `/* */` before matching (this repo already has that idiom in
`plugins/centipede/tests/audio-citations.test.ts`, which byte-pins a whole line with `^…$`).

### Verified good

- `[VERIFIED]` **`togglePaused` is exactly `!paused`** — `src/shared/pause.ts:29-31` returns `!paused`. The helper's `paused = !paused` is semantically identical, so no adopter's pause behaviour changed. This was the highest-risk silent substitution in the diff.
- `[VERIFIED]` **AC-2 is satisfied more strongly than by its guards:** `git diff e89083c^..HEAD -- plugins/centipede plugins/joust` is **empty**. The two ROM-cadence games were not touched at all, and their suites are green (160 files / 3496 tests). A cadence cannot change in files with no diff. Finding C weakens the *future* guard, not this story's cadence claim.
- `[VERIFIED]` **AC-3 holds:** five adoption commits, each touching exactly one `plugins/*/src/main.ts` (`git show --name-only` per commit).
- `[VERIFIED]` **The `src/shared` eligibility bar is cleared** (CLAUDE.md: "only code byte/algorithm-identical across >=2 games"). At baseline: the pause line is byte-identical in five `main.ts` (tempest:64, star-wars:121, asteroids:79, battlezone:131, red-baron:368 — one unique spelling); the mount error string is byte-identical in centipede:24 and joust:33.
- `[VERIFIED]` **`mountCanvas` cannot throw in production** — all seven `index.html` host `id="game"`, and tempest's second entry `models.html` loads `/src/tools/contactSheet.ts`, not `main.ts`.
- `[VERIFIED]` **battlezone's pause really was shared** — `plugins/battlezone/src/shell/pause.ts:33` re-exports `INITIAL_PAUSED, isPauseKey, togglePaused` verbatim from `@shared/pause`. Dev's deviation from the spec's "own `shell/pause`" row is correct.
- `[VERIFIED]` **No type-safety escapes introduced** — 0 `as any`, 0 `@ts-ignore`, 0 `as unknown as`, 0 non-null assertions in the new code; `tsc --noEmit` clean. The one cast, `(el as Partial<HTMLCanvasElement>)` at `host-helpers.ts:56`, narrows *before* the duck-type check rather than asserting past it.
- `[VERIFIED]` **Suite health** — 746 files / 11426 tests green; builds pass for all five adopters; the single orchestrator failure (`sprint-repo-routing.test.mjs:534`) reproduces at `f45005c`, before any sc1-1 feature commit.

### Rule Compliance

| Rule | Instances checked | Result |
|---|---|---|
| TS #1 type-safety escapes | all 8 exports + 5 adopting `main.ts` | compliant — the story *removes* 9 unchecked casts/assertions |
| TS #15 source-text guards | all 11 source-anchored assertions across the two new test files | **4 violations — A, B, C, D** |
| TS #17 comments asserting a mechanism | new comments in `host-helpers.ts` + 5 `main.ts` | 2 imprecise — E, F |
| TS #18 fixture could not distinguish a broken impl | 15 helper tests | compliant — `honours a NON-DEFAULT selector` uses `#screen` ≠ its own expectation; the non-`instanceof` duck-type keys on data |
| CLAUDE.md `src/shared` eligibility bar | 3 helpers | compliant — cited above |
| CLAUDE.md core/shell boundary | no `src/core/` file touched | compliant |
| Purity classification | `BROWSER_SUBPATHS` + its pinned list | compliant — both updated in one commit, which is what the pin exists to force |

### Devil's Advocate

Argue this is broken. The strongest case is that the story is a *guard* story that
shipped guards which do not guard, and that I am being too kind by calling the product
code correct. Consider what a future story sees: a green suite, a matrix with a
confident vocabulary, and a document asserting that nothing here can rot. That is a
more dangerous artifact than no guard at all, because it *manufactures corroboration*
— the same failure the story itself diagnosed in the 2026-07-30 spec table. A
maintainer adding a pause to joust would consult the matrix, flip a cell, watch eight
green tests, and ship the exact regression the epic's hard constraint exists to
prevent. Finding A is not hypothetical; it was reproduced end-to-end.

Second: the three defects were all found by *someone else's* probe or by adversarial
mutation, never by reading. The story's own narrative says prose-vs-code confusion bit
it three times (the `15750/263` comment, the D9 anchor miss, the second matrix table).
It bit a fourth and fifth time in the shipped guards, and nobody noticed because the
suite was green. That is a pattern, not bad luck: this file's assertions read source
text with no comment stripping anywhere, and the codebase already has the right idiom
(`audio-citations.test.ts` pins whole lines with `^…$`) that was not reused.

Third, what would a confused user misunderstand? `own-implementation` is now dead
vocabulary — a reason code no cell uses. A later author will reach for it for
battlezone, since the spec's table still calls battlezone's pause "own", and nothing
in the test would object. The matrix documents this, which is the right mitigation, but
it is documentation guarding against a footgun rather than removal of it.

Where I could be wrong: none of this affects a player. The five adopters are verified
correct against the baseline, the two ROM games have a zero-byte diff, and the helper
behaviour has an 11/11 mutation battery. A reasonable reviewer could call all three
HIGHs "test-quality MEDIUMs, fix in a follow-up" and ship. I am not doing that, for one
reason: the fix is small, it is confined to a single file, and the machinery it needs
(`Baseline:`) is already sitting in the matrix being used by the test two functions
down. A guard story should not ship vacuous guards when correcting them is an hour.

### What Dev must change

Only `tests/shell-convergence.test.mjs`, plus one comment in `plugins/red-baron/src/main.ts`.

1. **A:** evaluate `PERFORMS` against the `Baseline:` commit, not the working tree.
2. **B:** anchor to `import { … <helper> … } from '@shared/host-helpers'` **and** a call site `\b<helper>\s*\(`.
3. **C:** strip comments before matching joust's input seam (or pin whole lines with `^…$`, the `audio-citations.test.ts` idiom).
4. **D:** add the `checked > 0` guard its two siblings already have.
5. **E:** correct the `red-baron/src/main.ts:69` comment — three of the four `&& ctx` guards remain at `:149`, `:203`, `:890`.
6. **F:** one line noting the unlock target widened canvas→window.
7. **Re-run the mutation battery on the corrected guards** — and mutate by *commenting out*, not deleting, since that is the case all three missed.

**Handoff:** Back to Yoda for rework.