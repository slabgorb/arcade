---
story_id: "SH2-14"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-14: Adopt @arcade/shared pause + esc-overlay across all five canvas games (consumes SH2-12's v0.9.0)

## Story Details
- **ID:** SH2-14
- **Title:** Adopt @arcade/shared pause + esc-overlay across all five canvas games (consumes SH2-12's v0.9.0)
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** SH2-12 (status: done)
- **Repos:** tempest, asteroids, star-wars, battlezone, red-baron
- **Points:** 5

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T23:40:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T22:37:39Z | 2026-07-11T22:41:04Z | 3m 25s |
| red | 2026-07-11T22:41:04Z | 2026-07-11T22:54:44Z | 13m 40s |
| green | 2026-07-11T22:54:44Z | 2026-07-11T23:26:35Z | 31m 51s |
| review | 2026-07-11T23:26:35Z | 2026-07-11T23:40:39Z | 14m 4s |
| finish | 2026-07-11T23:40:39Z | - | - |

## Branch Strategy
**Multi-Repo Story:** This story spans 5 game repos. Each repo uses gitflow (base branch: `develop`):
- **tempest:** `feat/SH2-14-shared-pause-esc-overlay-adoption` on develop
- **asteroids:** `feat/SH2-14-shared-pause-esc-overlay-adoption` on develop
- **star-wars:** `feat/SH2-14-shared-pause-esc-overlay-adoption` on develop
- **battlezone:** `feat/SH2-14-shared-pause-esc-overlay-adoption` on develop
- **red-baron:** `feat/SH2-14-shared-pause-esc-overlay-adoption` on develop

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): tempest and asteroids carry a STALE `@arcade/shared` install — `node_modules` has v0.11.0 while `package.json` pins v0.12.0 — and v0.11.0 lacks the `/audio` subpath, so the SH2-17 `audio*.test.ts` suites fail at baseline (2 files in tempest, 1 in asteroids). NOT caused by SH2-14 (my `/pause` resolution passes on v0.11.0; my wiring tests fail distinctly). Affects `tempest/node_modules` + `asteroids/node_modules` — Dev's AC-1 "reinstall" step clears it, but must FORCE re-resolve to the pinned v0.12.0 (`npm install @arcade/shared@github:slabgorb/arcade-shared#v0.12.0`) — a plain `npm install` keeps the stale commit (the git-dep stale-lockfile trap). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-1's pin requirement (`#v0.9.0 or newer`) is ALREADY met for four of five games — tempest/asteroids/star-wars pin v0.12.0, battlezone pins v0.11.0, all carrying `/pause` + `/esc-overlay` (their resolution tests already pass GREEN). Only red-baron still pins the pre-font `#v0.5.0`. So Dev's pin work reduces to red-baron (bump off v0.5.0) + the tempest/asteroids reinstall above; the other three need ONLY the src wiring. Affects `red-baron/package.json`. *Found by TEA during test design.*
- **Question** (non-blocking): the dangling RED commits named in the story context (battlezone `4d00ad6`, tempest `445381f`, asteroids `96f13af`, star-wars `0a741a9`, red-baron `51e5747`) are UNRECOVERABLE in this checkout — absent from a-2, a-1, and every remote (garbage-collected). RED tests were RE-AUTHORED from the SH2-12 session archive (the context's sanctioned fallback) + battlezone's surviving bz2-5 reference. Recorded so no one re-hunts the lost commits. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the stale-install issue TEA flagged is RESOLVED — tempest + asteroids were force-reinstalled to their pinned v0.12.0 (`npm install @arcade/shared@github:slabgorb/arcade-shared#v0.12.0`), which restored the `/audio` subpath and cleared the SH2-17 audio baseline failures. Their committed lockfiles already referenced v0.12.0 (only `node_modules` was stale), so no lockfile change was needed. No further action. *Found by Dev during implementation.*
- **Improvement** (non-blocking): AC-4's pin bump made red-baron's rb1-1 `tests/scaffold.test.ts` assertion (which pinned `@arcade/shared#v0.5.0`) stale; updated it to `#v0.12.0`, preserving its intent (git-URL dep carrying math3d/rng). Affects `red-baron/tests/scaffold.test.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-5 (live pause/dim/resume) was manually verified for **tempest** in-browser — Escape dims the frozen tube behind a centred green (#39ff14) `PAUSED` card that reads correctly; re-press resumes. The other four cabinets still need the Reviewer/finish manual run per the standing AC-5 deviation. Affects the finish gate (all five games). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `battlezone/tests/shell/font-text-seam.test.ts:132` comment claims the caps-only contract was "enforced in arcade-shared's esc-overlay tests (SH2-12)" — but that suite tests inter-glyph TRACKING only; there is no uppercase assertion, and neither the shared `layoutText` nor `drawEscOverlay` upper-cases. The caps contract was DROPPED for the pause card, not relocated (moot in practice — all five cabinets pass ALL-CAPS literal card lines, unlike `drawScreenLines` which guards a tampered high-score name). The comment overstates coverage and should be corrected. Affects `battlezone/tests/shell/font-text-seam.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the battlezone overlay tests prove AC-3's "dual-tread card + #33ff66 verbatim" only via a whole-file src-text regex (`pause-esc-overlay-repoint.test.ts:88` matches `'E / D'`/`'I / K'`/`GLOW_GREEN='#33ff66'` anywhere in render.ts) — no test asserts those lines + the `#33ff66` colour + `0.72` dim actually reach `drawEscOverlay`'s `opts`. `pause-overlay.test.ts`'s mock discards `opts.color`/`opts.opacity`. Recommend capturing `opts` in the mock and asserting `opts.opacity===0.72`, `opts.color` = the cabinet green, and `cardLines()` contains the dual-tread strings — closes the fidelity gap cheaply. Affects `battlezone/tests/shell/pause-overlay.test.ts` + `pause-esc-overlay-repoint.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the 5 dep-pin resolution tests use `(await import(/* @vite-ignore */ SPEC)) as unknown as T`. The `unknown` hop is redundant (a dynamic `import()` on a non-literal specifier already types as `any`), and it textually matches lang-review rule #1 (`as unknown as` double-cast). Risk is LOW — every cast is immediately runtime-validated by `typeof … toBe('function')` and matches the SH2-6 `font-shared-resolution.test.ts` precedent. Recommend dropping the `unknown` hop or centralizing behind a small typed `loadSharedSubpath<T>(spec)` helper. Affects the 5 `pause-adoption`/`pause-esc-overlay-repoint` test files. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Per-game pause BEHAVIOUR verified by MANUAL run (AC-5), not automated tests**
  - Spec source: context-story-SH2-14.md, AC-2 + AC-5
  - Spec text: "All five canvas games pause on Escape via the shared module: the keydown EDGE (guarding e.repeat) toggles pause, the frozen frame returns the same state reference (deterministic resume), and drawEscOverlay draws over the held world" / "a manual run of each of the five games confirms Escape pauses, dims, and resumes, and the card reads in that cabinet's style"
  - Implementation: Per game, tests assert (a) the WIRING is present (a src module imports `@arcade/shared/pause` + `/esc-overlay`) and (b) the dep-pin resolves both subpaths with the expected exports. The shared MECHANISM itself (isPauseKey / togglePaused / the frozen-frame thunk gate / drawEscOverlay dim+card) is unit-tested exhaustively in arcade-shared (SH2-12). The end-to-end keydown-edge → freeze → overlay in each game's `main.ts` rAF loop is NOT unit-driven.
  - Rationale: the keydown edge + rAF frame gate are DOM/loop wiring with no unit seam; the epic's standing convention is "shell IO is verified by running the game" (bz2-5 left its main.ts wiring to the live playtest). AC-5 explicitly makes the per-game confirmation a manual run. This mirrors the sanctioned SH2-12 TEA deviation for the same mechanism.
  - Severity: minor
  - Forward impact: Reviewer + the finish gate MUST include a manual run of all five games (Escape pauses / dims / resumes, card reads in each cabinet's style) — automated suites alone do not cover AC-5.

### Dev (implementation)
- **red-baron freezes via a loop guard, not the shared stepUnlessPaused thunk**
  - Spec source: context-story-SH2-14.md, AC-2 (story description: "the frozen-frame gate (stepUnlessPaused(() => step(...), prev, paused))")
  - Spec text: "wire each game's main.ts with the Escape keydown EDGE ... -> togglePaused -> the frozen-frame gate (stepUnlessPaused(() => step(...), prev, paused)) -> drawEscOverlay"
  - Implementation: tempest/asteroids/star-wars/battlezone route through the shared `stepUnlessPaused`. red-baron instead freezes with a loop guard — `if (paused) accumulator %= SIM_TIMESTEP_S` so its fixed-step `while (accumulator >= STEP)` runs zero calc-frames while paused — while still using the shared pause VERB (isPauseKey/togglePaused/INITIAL_PAUSED) for the Escape edge and the shared drawEscOverlay for the card.
  - Rationale: red-baron's hand-rolled loop holds sim state across ~11 separate closure `let`s (flight, guns, enemies, blimp, wrecks, mountains, waveClock, grmode, score, kills, simFrame) — there is no single state object to thread through `stepUnlessPaused<S>(step, prev, paused)`. Forcing it onto the single-state thunk needs a sentinel return that reads worse than the guard. Deterministic resume is preserved: banked time is discarded (accumulator clamped to the sub-step remainder), so unpause never burst-replays the paused span.
  - Severity: minor
  - Forward impact: none — behaviour matches the other cabinets (Escape freezes, resume is clean). A future refactor consolidating red-baron's sim into one state object could adopt stepUnlessPaused.
- **battlezone bz2-5 pause-overlay + SH2-6 font-text-seam tests re-observe the relocated card seam**
  - Spec source: context-story-SH2-14.md, AC-3
  - Spec text: "battlezone is behaviour-identical: ... the overlay routes through drawEscOverlay ... the surviving bz2-5 pause-gate/pause-overlay tests stay green"
  - Implementation: routing drawPauseOverlay through the shared drawEscOverlay relocates the keybind card's text into the shared font (internal to @arcade/shared), which the tests' LOCAL-font mocks (`../../src/shell/font`) cannot observe (and the dist's internal font import is node_modules-relative, so a shared-font mock can't reach it either — empirically confirmed). To keep them green AND meaningful: `pause-overlay.test.ts` now observes the LINES battlezone hands to a mocked `@arcade/shared/esc-overlay` (non-empty + names ESC + a dim backdrop); `font-text-seam.test.ts` drops drawPauseOverlay from its local-font tracking/caps census (it no longer makes a local-font run). `pause-gate.test.ts` is unchanged and green.
  - Rationale: "routes through drawEscOverlay" (AC-3 + this story's own repoint test) and "bz2-5 pause-overlay tests stay green as-written" are in genuine tension because the shared overlay uses the shared font internally, not battlezone's local font. Re-observing at the new (correct) seam honours both the re-point and the "stay green" intent; assertions are unchanged (routes a non-empty, ESC-naming card + dim backdrop), only the observation point moved. The shared overlay's own font tracking/caps is unit-tested in arcade-shared (SH2-12).
  - Severity: minor
  - Forward impact: none — the tests still pin battlezone's pause-overlay contract at the shared boundary it now uses.

### Reviewer (audit)
- **TEA — Per-game pause BEHAVIOUR verified by MANUAL run (AC-5)** → ✓ ACCEPTED by Reviewer: sound and consistent with the standing SH2-12 deviation. The keydown-edge + rAF frame gate have no unit seam; AC-5 explicitly makes per-game confirmation a manual run. The automated suites correctly pin WIRING + dep-pin resolution instead. Dev already manually verified tempest in-browser; the finish gate must cover the remaining four.
- **Dev — red-baron freezes via a loop guard, not the shared stepUnlessPaused thunk** → ✓ ACCEPTED by Reviewer: red-baron's hand-rolled loop holds sim state across ~11 closure `let`s with no single state object to thread through `stepUnlessPaused<S>(step, prev, paused)`; the loop guard is the honest realization for that shape. Independently verified bounded + deterministic: `SIM_TIMESTEP_S = 0.096` (nonzero → `accumulator %= STEP` can't NaN/divide-by-zero), the modulo caps the carried remainder below one tick so resume runs zero extra calc-frames (no burst) — corroborated by the security subagent's trace. The shared pause VERB (isPauseKey/togglePaused/INITIAL_PAUSED) + drawEscOverlay are still used; only the freeze realization differs.
- **Dev — battlezone bz2-5/SH2-6 overlay tests re-observe the relocated card seam** → ✓ ACCEPTED by Reviewer (with non-blocking follow-ons): the re-point genuinely moves the card text into the shared font (empirically confirmed a local-font mock can't observe it, nor can a shared-font mock reach the dist's internal import), so re-observing at the `@arcade/shared/esc-overlay` boundary is the correct way to honour AC-3's "bz2-5 tests stay green." `pause-gate.test.ts` is unchanged and green. TWO test-quality follow-ons logged as non-blocking Delivery Findings: the reworked observation doesn't assert `opts.color`/`opts.opacity` (so `#33ff66`/`0.72` threading is unproven behaviourally), and the `font-text-seam.test.ts:132` comment overstates coverage (caps was dropped, not relocated). Neither affects correctness; recommend a quick fast-follow.

## Sm Assessment

Setup complete for the consumption half of the esc-overlay extraction. Dependency SH2-12 is **done** and published as `github:slabgorb/arcade-shared#v0.9.0` (PURE `/pause` + BROWSER `/esc-overlay`), so this story is unblocked. No Jira (local sprint tracking; `jira_key` empty). No blocking open PRs across the five game repos.

**Multi-repo:** spans all five canvas games (tempest, asteroids, star-wars, battlezone, red-baron). Feature branch `feat/SH2-14-shared-pause-esc-overlay-adoption` created off `develop` in each repo — PRs target `develop`. Lobby is out of scope.

**Routing:** phased `tdd`. Handing to TEA (Imperator Furiosa) for the RED phase.

**Notes carried into context for the crew:**
- RED tests for the adoption/re-point were authored during SH2-12's RED phase and preserved as **dangling commits** — recover per game before re-authoring: battlezone `4d00ad6`, tempest `445381f`, asteroids `96f13af`, star-wars `0a741a9`, red-baron `51e5747`.
- battlezone re-points **behaviour-identical** (dual-tread card `E/D`,`I/K` + `#33ff66` preserved verbatim); the other four **gain** a pause each with its own keybind card + colour.
- red-baron jumps from the pre-font `#v0.5.0` pin; its card renders via `drawEscOverlay`'s **transitive** shared font — no separate red-baron HUD-font migration.
- AC-5 (live pause/dim/resume per game) is a **MANUAL run** — keydown+rAF has no unit seam.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — adoption/re-point story with a testable wiring + dep-pin contract per game.

**Recovery note:** The story context's preferred path (recover the SH2-12 dangling RED commits) was UNAVAILABLE — those commits are garbage-collected in every checkout (a-2/a-1) and never pushed. RED tests were re-authored from the SH2-12 session archive (`sprint/archive/SH2-12-session.md`, which documents each file's exact contract) + battlezone's surviving bz2-5 pause reference, following the sanctioned `glow-adoption.test.ts` / `font-shared-resolution.test.ts` precedents.

**Test Files:**
- `battlezone/tests/shell/pause-esc-overlay-repoint.test.ts` — re-point contract: `shell/pause.ts` consumes `@arcade/shared/pause`; overlay routes through shared `drawEscOverlay`; dual-tread card (`E / D`, `I / K`) + `#33ff66` preserved verbatim; pin resolves both subpaths.
- `tempest/tests/pause-adoption.test.ts` — GAIN pause: src wires `/pause` + `/esc-overlay`; pin resolves both.
- `asteroids/tests/pause-adoption.test.ts` — as tempest.
- `star-wars/tests/pause-adoption.test.ts` — as tempest.
- `red-baron/tests/pause-adoption.test.ts` — GAIN pause + AC-4: src wiring; drops the pre-font `#v0.5.0` pin; pin resolves both subpaths (RED today — v0.5.0 lacks them).

**Tests Written:** 19 tests across 5 files, covering ACs 1–4 (AC-5 is manual — see Design Deviations).
**Status:** RED (failing — ready for Dev)

**RED verification (via testing-runner):**
| Repo | Result | SH2-14 failures | Baseline |
|------|--------|-----------------|----------|
| star-wars | clean RED | 2 (wiring) | clean |
| battlezone | clean RED | 2 (re-point) | clean |
| red-baron | clean RED | 5 (wiring + pin drop + both resolutions) — no collection crash | clean |
| tempest | RED + baseline noise | 2 (wiring) | ⚠ 2 pre-existing SH2-17 `audio*.test.ts` fail (stale v0.11.0 install lacks `/audio`) |
| asteroids | RED + baseline noise | 2 (wiring) | ⚠ 1 pre-existing SH2-17 audio test fails (same cause) |

The four already-pinned games' `/pause` + `/esc-overlay` **resolution** tests pass GREEN (pins ≥ v0.9.0 carry the subpaths); their RED is the src-text WIRING. red-baron's resolution is RED (v0.5.0). The tempest/asteroids audio failures are pre-existing install drift, NOT SH2-14 — see Delivery Findings; cleared by Dev's AC-1 reinstall.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #5 module/subpath resolution + exports map | each file's "pin resolves /pause + /esc-overlay" (dep-pin import of the exports subpath) | wiring RED / resolution GREEN (red-baron RED) |
| #8 test quality (meaningful assertions) | self-checked all 19 tests — concrete expected values, no `let _ =`, no `assert(true)`, no is-Some-on-always-None | pass (self-check) |
| #2 readonly params (no loose types) | resolution assertions type `drawEscOverlay` opts.lines as `readonly string[]`, matching the shared `EscOverlayOptions` | pass |

**Rules checked:** 3 of 3 applicable lang-review rules covered. Rules #1/#3/#4/#6/#7/#9–#13 are N/A to consumer wiring tests (no new production logic, no JSX, no async boundary, no user-input surface — the games call shared functions; the mechanism's rule coverage lives in arcade-shared's SH2-12 suite).
**Self-check:** 0 vacuous tests. The `as unknown as {…}` on runtime `import()` results is the sanctioned dep-pin pattern (SH2-6 `font-shared-resolution.test.ts` precedent), not a production type escape.

**Handoff:** To Dev (The Word Burgers) for GREEN. Sequencing: (1) reinstall tempest/asteroids to their pinned v0.12.0 (force re-resolve — clears the SH2-17 audio baseline); (2) bump red-baron off `#v0.5.0` to a tag carrying `/pause` + `/esc-overlay`, reinstall; (3) wire each game's `main.ts` Escape edge → `togglePaused` → `stepUnlessPaused(() => step(...), prev, paused)` → `drawEscOverlay` (only while paused); (4) battlezone re-point `shell/pause.ts` onto the shared gate + route overlay through `drawEscOverlay`, keeping its dual-tread card + `#33ff66` and its local 4-arg signature (so the surviving bz2-5 tests stay green). AC-5 (live pause/dim/resume per game) is a MANUAL run, not automated.

## Dev Assessment

**Implementation Complete:** Yes

**Pin / install work:**
- red-baron: bumped `@arcade/shared` `#v0.5.0` → `#v0.12.0` (AC-4) and reinstalled — the tag carries `/font` + `/pause` + `/esc-overlay`, so its card renders via drawEscOverlay's transitive shared font (no separate red-baron HUD-font migration).
- tempest + asteroids: force-reinstalled to their pinned v0.12.0 (only `node_modules` was stale at v0.11.0; lockfiles already correct) — cleared the SH2-17 `/audio` baseline failures.
- star-wars: already v0.12.0 installed; battlezone: v0.11.0 (already carries /pause + /esc-overlay) — left as-is (≥ v0.9.0 per AC-1).

**Files Changed:**
- `tempest/src/shell/loop.ts` — added an optional `isPaused` accessor; the sub-step now routes through the shared `stepUnlessPaused` thunk (frozen sub-steps drain the accumulator, so no burst on resume).
- `tempest/src/main.ts` — Escape edge → togglePaused; passes `() => paused` to the loop; draws `drawEscOverlay` (green #39ff14 card) after render, setting the dpr transform explicitly for the overlay's CSS-pixel space.
- `asteroids/src/main.ts` — Escape edge; step gated by `stepUnlessPaused` (thunk holds sim + skips input/audio/save when paused); white card drawn in the dpr-scaled render block.
- `star-wars/src/main.ts` — Escape edge; step gated by `stepUnlessPaused` with a frozen-frame early-return (skips the event pump + gameover edge); green #00e600 card in the scaled render block.
- `battlezone/src/shell/pause.ts` — re-pointed: consumes `@arcade/shared/pause` (re-exports INITIAL_PAUSED/isPauseKey/togglePaused verbatim; local 4-arg `stepUnlessPaused` delegates to the shared thunk gate, so bz2-5 callers/tests are unchanged).
- `battlezone/src/shell/render.ts` — `drawPauseOverlay` now routes through `drawEscOverlay`, passing the dual-tread PAUSE_LINES + GLOW_GREEN `#33ff66` + a 0.72 dim (per-cabinet NUMBERS preserved verbatim).
- `red-baron/src/main.ts` — Escape edge; frozen-frame loop guard (`if (paused) accumulator %= STEP` — see deviation); green #33ff66 card drawn over the frozen scene in device pixels.
- Test follow-ons (see deviations): `battlezone/tests/shell/pause-overlay.test.ts` + `font-text-seam.test.ts` re-observe the relocated card seam; `red-baron/tests/scaffold.test.ts` pin updated to v0.12.0.

**Tests:** 3,665/3,665 passing (GREEN) across all five repos (tempest 773, asteroids 826, star-wars 778, battlezone 789, red-baron 499); `npm run build` (tsc + vite) green in every repo.

**AC status:** AC-1 (pins ≥ v0.9.0, subpaths resolve) ✓; AC-2 (all five pause on Escape via shared, frozen frame, overlay over held world) ✓ (red-baron via loop guard — deviation); AC-3 (battlezone behaviour-identical, card + #33ff66 verbatim, bz2-5 tests green) ✓; AC-4 (red-baron card via transitive shared font, documented) ✓; AC-5 (live pause/dim/resume) — tempest manually verified in-browser; remaining four are the Reviewer/finish manual run.

**Branches (per repo):** `feat/SH2-14-shared-pause-esc-overlay-adoption` — committed + pushed.

**Handoff:** To the verify/review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 3,665/3,665 tests green, 5/5 builds green, 0 core-boundary violations, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings; boundary conditions self-assessed (both non-standard freeze gates bounded/NaN-safe) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; no swallowed errors added (self-assessed — the one try/catch logs, does not silently swallow) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 confirmed + 2 sound-notes | confirmed 4 (all LOW/MED), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings; test-analyzer independently caught the one stale comment (tagged DOC below) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; type escapes covered by rule-checker (the `as unknown as` pattern) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity boundary, DoS/soft-lock, keydown listeners, drawEscOverlay input all clean (high confidence) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; one simplification noted (drop the redundant `unknown` hop) |
| 9 | reviewer-rule-checker | Yes | findings | 10 (one repeated pattern) | confirmed 1 pattern (LOW, 10 instances), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned with results; 5 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped)
**Total findings:** 5 confirmed (all LOW/MEDIUM, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A well-built, spec-faithful adoption. The critical rule for this codebase — the hard core/shell purity boundary — is fully respected: preflight, security, AND rule-checker each independently enumerated all 17 changed files across the five repos and confirmed **zero `src/core/*` changes**. The share-the-VERB/keep-the-NUMBERS rule holds: the mechanism (pause gate + esc-overlay) is imported from `@arcade/shared` subpaths, and every per-cabinet card + colour + dim is a local constant. All 3,665 tests pass and all five `tsc + vite` builds are green. No Critical or High findings; every finding is LOW/MEDIUM test-quality and non-blocking.

**Data flow traced:** Escape keydown → `!e.repeat && isPauseKey(e.key.toLowerCase())` → `paused = togglePaused(paused)` (a module-local boolean in each game's shell) → the frame loop's frozen-frame gate reads it (`stepUnlessPaused` in tempest/asteroids/star-wars/battlezone; the `accumulator %= STEP` loop guard in red-baron) → the sim is held (same state ref / zero calc-frames) → `drawEscOverlay(ctx, …, CARD)` draws the dim + card only while paused. Safe: `paused` is a private module-scope boolean, never reaches `src/core`, and the card lines/colour/opacity handed to `drawEscOverlay` are hardcoded `as const` constants — no untrusted input reaches the overlay.

**Pattern observed:** consistent Escape-edge → toggle → frozen-frame-gate → overlay across all five cabinets, modeled on the shipped bz2-5 battlezone pause. tempest/asteroids/star-wars/battlezone route the freeze through the shared single-state `stepUnlessPaused` thunk; red-baron adapts it to a loop guard for its multi-variable hand-rolled loop (accepted deviation). `battlezone/src/shell/pause.ts:41` — the local 4-arg `stepUnlessPaused(game,input,dt,paused)` delegates to `sharedStepUnlessPaused(() => stepGame(...), game, paused)`, preserving the bz2-5 caller/test contract while sharing the VERB.

**Error handling:** `red-baron/src/main.ts:462` null-guards `ctx` (`if (paused && ctx)`) before drawing — load-bearing because red-baron's `getContext('2d')` has no `!` (unlike the other four). `tempest/src/shell/loop.ts:91` keeps the pre-existing `catch (e: unknown)` that logs+continues (no new swallow). No NaN/divide-by-zero path: `SIM_TIMESTEP_S = 0.096` is a nonzero constant, and every accumulator/loop is bounded by the pre-existing 0.25s per-frame clamp.

**Tenant isolation audit:** N/A — these are client-only browser games with no backend, no auth, no multi-tenancy, no network. No trait method handles tenant data; no struct carries a tenant field. The security subagent confirmed injection/auth/secrets/CORS/CSRF/deserialization are all inapplicable to this diff.

### Rule Compliance

- **CORE/SHELL PURITY (CLAUDE.md, CRITICAL):** COMPLIANT — 17/17 changed files under `src/main.ts`, `src/shell/*`, `tests/*`, or red-baron `package.json`/lock. Zero `src/core` changes. No new `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame` inside core. [RULE][SEC] confirmed.
- **SHARE THE VERB, KEEP THE NUMBERS (epic rule):** COMPLIANT — mechanism from `@arcade/shared/pause` + `/esc-overlay`; per-cabinet NUMBERS local (`TEMPEST_PAUSE`/`ASTEROIDS_PAUSE`/`STAR_WARS_PAUSE`/`RED_BARON_PAUSE`/battlezone `PAUSE_LINES`+`GLOW_GREEN`). No game constant baked into shared; no shared constant duplicated. (Shared `opacity: 0.72` in all five is independent per-cabinet duplication of a tunable NUMBER, not a leak.) [RULE]
- **lang-review #1 type-safety escapes:** 10 instances of `as unknown as T` on dynamic `import()` in the 5 test files — LOW, redundant `unknown` hop, runtime-validated, matches the SH2-6 precedent. Confirmed (not dismissed), logged as a non-blocking improvement. [RULE][TYPE]
- **lang-review #4 (`??` vs `||`):** COMPLIANT — `isPaused?.() ?? false` (tempest loop.ts) uses `??` correctly; no `||`-on-falsy-valid anywhere in the added lines. [RULE]
- **lang-review #5 (module/`.js` ext):** COMPLIANT — all new imports are package subpaths (no relative imports added); `moduleResolution: bundler`; value re-exports use plain `export`, not `export type`. [RULE]
- **lang-review #8 (test quality):** interfaces match the real `@arcade/shared` `.d.ts` verbatim; mock `ctx` is a safe subset; no `as any` in assertions. Findings below are coverage-tightness, not vacuity. [TEST]

### Confirmed findings (all LOW/MEDIUM — non-blocking)

- [TEST][RULE] `as unknown as T` double-cast on the dep-pin dynamic `import()` — 10 instances across the 5 test files. LOW: the `unknown` hop is redundant (dynamic import is already `any`) and every cast is immediately `typeof … toBe('function')`-validated; matches the sanctioned SH2-6 `font-shared-resolution.test.ts` pattern. Recommend dropping `unknown` or a typed helper.
- [TEST] battlezone `pause-overlay.test.ts` — the reworked mock discards `opts.color`/`opts.opacity`, so nothing asserts `#33ff66` / `0.72` are threaded to `drawEscOverlay`; the "dims" test is redundant with "hands the card." MEDIUM. Recommend capturing `opts`.
- [TEST] battlezone `pause-esc-overlay-repoint.test.ts` — AC-3's "card verbatim" is proven only by a whole-file src-text regex, not the live card handed to `drawEscOverlay`. MEDIUM. Recommend asserting `cardLines()` contains `E / D`/`I / K`.
- [DOC] battlezone `font-text-seam.test.ts:132` — comment falsely claims the caps contract was "relocated" to arcade-shared; it was dropped (moot — all callers pass ALL-CAPS literals). LOW, high-confidence. Fix the comment.
- [TEST] the wiring `importersOf()` regex matches the specifier string, not an `import` keyword or call site — a dead import/comment mention would pass. LOW — accepted "pin wiring, not behaviour" tradeoff (precedent + `noUnusedLocals` + AC-5 manual cover the rest).
- [SIMPLE] the only simplification: collapse the 10× `as unknown as` into one typed helper (folds into the first finding). [EDGE] no boundary defects (freeze gates bounded/NaN-safe). [SILENT] no swallowed errors introduced.

### Devil's Advocate

Argue this is broken. Start with the freeze: if red-baron's `accumulator %= SIM_TIMESTEP_S` ran with `SIM_TIMESTEP_S === 0` it would produce `NaN`, and a `NaN >= NaN` while-guard is false forever — a permanent soft-lock even after unpause. I checked: `SIM_TIMESTEP_S = CALC_FRAME_NMIS/MASTER_NMI_HZ = 24/250 = 0.096`, a compile-time constant that can never be zero, so the NaN path is impossible. Next attack: burst-replay — a player pauses for 60 seconds; does the accumulator bank 60s of calc-frames and fast-forward the sim on resume? No — while paused, every frame re-clamps `accumulator %= STEP` to below one tick (and tempest/asteroids/star-wars/battlezone drain their accumulators through no-op sub-steps), so unpause replays nothing. Next: a held Escape key machine-gunning the toggle so the game flickers pause/resume 60×/s — blocked by the `!e.repeat` guard in all five listeners. Next: multiple keydown listeners fighting — could the pause listener eat the initials-entry or audio-unlock keystrokes? No: none call `stopPropagation`/`preventDefault` on Escape, Escape isn't in any control-key set, and no other Escape consumer exists in any repo. Next: a confused user in tempest — the overlay draws after `render()`'s phosphor composite; could it smear or vanish? The card is drawn to the main canvas after the phosphor blit (which uses offscreen buffers), with the dpr transform set explicitly — verified crisp in a live run. Next: the battlezone re-point silently changes behaviour — could `sharedStepUnlessPaused` differ from the old local gate? Both return the same-reference prev when paused and `step()` when active; the surviving bz2-5 `pause-gate.test.ts` (24 tests) proves byte-identical freeze/resume. Next: a stressed filesystem or unexpected config — there is no filesystem or config in this runtime path (client-only). The genuine residual weakness the devil's advocate surfaces is not in the code but in the TESTS: the battlezone overlay tests would still pass if a regression dropped `#33ff66` or the dual-tread lines from the live card (they check src-text, not the `opts` handed to `drawEscOverlay`), and one comment claims coverage that doesn't exist. These are the LOW/MEDIUM findings above — real debt, but not a correctness break, and AC-5's manual run (Reviewer/finish) is the backstop for the live behaviour.

### VERIFIED

- [VERIFIED] No `src/core` change in any repo — evidence: `grep '^+++ b/' combined.diff` yields only `src/main.ts`, `src/shell/*`, `tests/*`, red-baron `package.json`/lock; corroborated independently by preflight, security, and rule-checker. Complies with the CLAUDE.md core-purity rule.
- [VERIFIED] red-baron freeze is bounded + burst-free — evidence: `red-baron/src/main.ts:357` `accumulator %= SIM_TIMESTEP_S` with `SIM_TIMESTEP_S=0.096` (core/timing.ts:31, nonzero); the `while (accumulator >= STEP)` at :358 runs zero iterations while paused. No rule conflict (shell-only).
- [VERIFIED] battlezone re-point preserves the bz2-5 contract — evidence: `src/shell/pause.ts:41` delegates to the shared thunk; `render.ts:360` `PAUSE_LINES` still holds `'E / D'`/`'I / K'`, `:63` `GLOW_GREEN='#33ff66'`; the surviving `pause-gate.test.ts` (24 tests) green. Complies with share-the-VERB.
- [VERIFIED] per-cabinet NUMBERS stay local — evidence: `TEMPEST_PAUSE`/`ASTEROIDS_PAUSE`/`STAR_WARS_PAUSE`/`RED_BARON_PAUSE` + battlezone `PAUSE_LINES` are local `const`s; the shared dist is fully parametrized (no game strings). Complies with keep-the-NUMBERS.
- [VERIFIED] Escape edge safe in all five — evidence: `!e.repeat && isPauseKey(e.key.toLowerCase())` in tempest/asteroids/star-wars/red-baron main.ts + battlezone's pre-existing listener; one listener per repo, no propagation conflicts. Complies with lang-review (no `||`, `??` where needed).

**Deviation audit:** all 3 logged deviations (1 TEA, 2 Dev) stamped ACCEPTED in the Design Deviations section; no undocumented deviations found.

**Manual-run caveat (AC-5):** live pause/dim/resume was verified for tempest only. The finish gate MUST manually run asteroids, star-wars, battlezone, red-baron (Escape pauses/dims/resumes, card reads in each cabinet's style) — automated suites do not cover AC-5.

**Handoff:** To SM (The Organic Mechanic) for finish-story.