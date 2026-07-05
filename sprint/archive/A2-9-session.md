---
story_id: "A2-9"
jira_key: ""
epic: "A2"
workflow: "tdd"
---
# Story A2-9: Bullet range too short — retune bullet lifetime/travel distance against ROM reference

## Story Details
- **ID:** A2-9
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** asteroids

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T13:57:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-05T12:55:51Z | 2026-07-05T13:00:19Z | 4m 28s |
| red | 2026-07-05T13:00:19Z | 2026-07-05T13:39:17Z | 38m 58s |
| green | 2026-07-05T13:39:17Z | 2026-07-05T13:45:51Z | 6m 34s |
| review | 2026-07-05T13:45:51Z | 2026-07-05T13:57:08Z | 11m 17s |
| finish | 2026-07-05T13:57:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): Saucer fires and turns ~4x too fast — CONFIRMED in live playtest ("saucers spam bullets and turn quickly") — now FOLDED INTO A2-9 scope per user direction ("fix the bug, not halfway"). Same ÷4 root cause: the ROM gates the WHOLE saucer update to every 4th frame (UpdateScr L6B93 `and #$03`), but the port runs it every frame. Covered by the new `saucer ÷4 update cadence (A2-9)` tests: SAUCER_FIRE_INTERVAL 10/60→40/60 (ScrTimer $0A=10 × 4-frame gate) and SAUCER_SPEED 16→4 (per-4-frame drift ÷ 4). SAUCER_COURSE_CHANGE_INTERVAL (128 frames) already correct. Affects `asteroids/src/core/saucer.ts`. *Found by TEA during test design; confirmed by user playtest.*
- **Question** (non-blocking): The saucer base magnitudes — SAUCER_SPEED (pre-fix 16) and SAUCER_BULLET_LIFETIME (18) — remain ROM-unverified (code: "verify vs quarry (A-17)"). This story fixes the ÷4 CADENCE (ROM-confirmed) applied to those provisional bases; the base values themselves should still be quarry-confirmed in A-17, and the resulting saucer crossing "feel" (a 4x slower crossing) eyeballed in the epic playtest. Affects `asteroids/src/core/saucer.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The saucer's crossing/weave is now 4x slower (SAUCER_SPEED 16→4) — a large, visible feel change on top of the fire-cadence slowdown. Numerically ROM-derived (the ÷4 gate is confirmed) but the *base* 16 drift is still provisional, so the absolute crossing speed wants an epic-playtest eyeball alongside A-17's quarry confirmation. Affects `asteroids/src/core/saucer.ts` (no code change needed unless the base magnitude is re-quarried). *Found by Dev during implementation — echoes TEA's open Question, flagged for the playtest pass.*

### Reviewer (code review)
- **Improvement** (non-blocking): The saucer movement ÷4 fix is pinned only as a constant assertion (`expect(SAUCER_SPEED).toBe(4)`, tests/saucer.test.ts:644) — no test measures the saucer's actual per-frame displacement, unlike the analogous bullet-range test which quantifies real travel. The *gross* integration-class bug (`velocity.x * dt` vs `* frames`, off-by-60) IS caught by the pre-existing crossing test (Reviewer verified: a `*dt` bug needs 122,880 ticks to cross vs the 2,248-tick window → `despawnTick` stays -1 → test fails), so this is a coverage-precision nicety, not a hole. When A-17 de-provisionalizes the base magnitude, add a behavioral per-frame-displacement assertion mirroring the bullet travel test. Affects `asteroids/tests/saucer.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Cosmetic test-comment cleanup in `tests/saucer.test.ts`: line 439 comment still reads "fire cadence (~10 frames)" but this very change sets the cadence to 40 frames (the reasoning stays valid, only the magnitude is stale); and two A2-9 test titles phrase ROM-constant guards as behavior ("crosses and weaves at 1/4 the pre-fix speed" @644 asserts only the constant; the fire-cadence check @620 reduces algebraically to 40). LOW — behavioral backups exist in adjacent tests. Affects `asteroids/tests/saucer.test.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** The saucer's crossing/weave is now 4x slower (SAUCER_SPEED 16→4) — a large, visible feel change on top of the fire-cadence slowdown. Numerically ROM-derived (the ÷4 gate is confirmed) but the *base* 16 drift is still provisional, so the absolute crossing speed wants an epic-playtest eyeball alongside A-17's quarry confirmation. Affects `asteroids/src/core/saucer.ts`.

### Downstream Effects

- **`asteroids/src/core`** — 1 finding

### Deviation Justifications

2 deviations

- **Fix is the missing every-4th-frame shot-timer cadence, not a lifetime/velocity constant retune**
  - Rationale: The disassembly shows the seed byte ($12=18, L6CFF) and the ±111 clamp ($6d1a/$91) are already correct. The ROM decrements the per-object life timer every 4th frame while integrating position every frame; the port aged `life` every frame → 4x-short range. The authentic fix is the decrement cadence, not the constant values.
  - Severity: minor
  - Forward impact: Also corrects saucer-shot range via the shared owner-agnostic advance() — explicitly required by the AC ("player-fired and saucer-fired bullets have correct respective ranges").
- **Scope expanded to the saucer's fire + movement cadence (beyond "bullet range")**
  - Rationale: User directed it ("fix the bug, not halfway"; "put it in the scope") after confirming in playtest that saucers "spam bullets and turn quickly" — the identical ÷4 every-4th-frame root cause (UpdateScr L6B93 `and #$03`). One coherent fix, not a split.
  - Severity: minor
  - Forward impact: Story now also touches `saucer.ts`; the 2-point estimate may under-represent the expanded work (re-point at SM discretion). Saucer base magnitudes stay provisional (A-17).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Fix is the missing every-4th-frame shot-timer cadence, not a lifetime/velocity constant retune**
  - Spec source: context-story-A2-9.md, Technical Approach §3 ("Retune bullet parameters")
  - Spec text: "Update the bullet lifetime and velocity in the core sim to match the ROM reference values."
  - Implementation: Tests KEEP BULLET_LIFETIME_FRAMES=18 and the ±111 muzzle clamp (both verified authentic vs the rev-4 disassembly) and instead require a new SHOT_TIMER_PERIOD_FRAMES=4 so the shared advance() ages the shot timer once per 4 frames (ROM L738F `and #$03`), giving an effective 72-frame life (~7992 lo-units ≈ full screen).
  - Rationale: The disassembly shows the seed byte ($12=18, L6CFF) and the ±111 clamp ($6d1a/$91) are already correct. The ROM decrements the per-object life timer every 4th frame while integrating position every frame; the port aged `life` every frame → 4x-short range. The authentic fix is the decrement cadence, not the constant values.
  - Severity: minor
  - Forward impact: Also corrects saucer-shot range via the shared owner-agnostic advance() — explicitly required by the AC ("player-fired and saucer-fired bullets have correct respective ranges").
- **Scope expanded to the saucer's fire + movement cadence (beyond "bullet range")**
  - Spec source: context-story-A2-9.md, Title / Scope ("bullet lifetime/travel distance")
  - Spec text: "Bullet range too short — retune bullet lifetime/travel distance against ROM reference."
  - Implementation: Added saucer fire-cadence (SAUCER_FIRE_INTERVAL 10/60→40/60) and saucer movement-speed (SAUCER_SPEED 16→4) tests + Dev-contract items to this story, alongside the bullet-range fix.
  - Rationale: User directed it ("fix the bug, not halfway"; "put it in the scope") after confirming in playtest that saucers "spam bullets and turn quickly" — the identical ÷4 every-4th-frame root cause (UpdateScr L6B93 `and #$03`). One coherent fix, not a split.
  - Severity: minor
  - Forward impact: Story now also touches `saucer.ts`; the 2-point estimate may under-represent the expanded work (re-point at SM discretion). Saucer base magnitudes stay provisional (A-17).

### Dev (implementation)
- No deviations from spec. Implemented the TEA Dev contract verbatim: exported `SHOT_TIMER_PERIOD_FRAMES = 4` (ROM L738F), aged the shot timer once per that many frames in the shared owner-agnostic `advance()` (`life = b.life - frames / SHOT_TIMER_PERIOD_FRAMES`), kept `BULLET_LIFETIME_FRAMES = 18` and the ±111 clamp untouched, and set `SAUCER_FIRE_INTERVAL` 10/60→40/60 and `SAUCER_SPEED` 16→4 with ROM citations. No structures simplified, no abstractions added, no owner special-casing.

### Reviewer (audit)
- **TEA #1 (fix is the every-4th-frame shot-timer cadence, not a constant retune)** → ✓ ACCEPTED by Reviewer: the disassembly citations (seed $12=18 @L6CFF authentic; DEC gated by `and #$03` @L738F) are sound, and the shared owner-agnostic `advance()` fix is the correct locus for the AC's "respective ranges" requirement. Rule-checker confirmed no owner special-casing; the `ages player and saucer shots alike` test proves it at runtime.
- **TEA #2 (scope expanded to saucer fire + movement cadence)** → ✓ ACCEPTED by Reviewer: same ÷4 root cause (UpdateScr L6B93 `and #$03`), user-directed ("fix the bug, not halfway"), folded into one coherent fix. The continuous-dt constant equivalents (fire 10/60→40/60, speed 16→4) are the right modeling of a per-4-frame gate. The re-point note is an SM concern, not a review blocker.
- **Dev (no deviations)** → ✓ ACCEPTED by Reviewer: verified against the diff — the implementation matches the TEA contract line-for-line, values and clamp preserved, no scope creep.
- No UNDOCUMENTED deviations found. The diff does exactly what TEA/Dev logged; nothing diverged silently.

## Sm Assessment

**Verdict:** Setup complete — routing to TEA (Imperator Furiosa) for the RED phase.

**Diagnosis:** A2-9 is a p2 bug from epic A2 (Asteroids playtest followup): bullets die too early / travel too short vs the ROM reference. 2 points, explicit tdd (phased) workflow. Repo is asteroids; the bullet lifetime/travel tunable is deterministic-sim logic and belongs in src/core, so this is unit-testable against a ROM-reference numeric target — a clean fit for TDD rather than the trivial workflow.

**Setup artifacts:**
- Session: .session/A2-9-session.md
- Context: sprint/context/context-story-A2-9.md (technical approach + ACs pinning corrected bullet lifetime/range with a testable numeric target)
- Branch: fix/A2-9-bullet-range-retune off develop in the asteroids subrepo (bug → fix/ prefix per repos.yaml)

**Jira:** Skipped — no Jira on this project (local YAML tracking only).

**Pre-work state note:** Started clean. The prime script initially reported a phantom FINISH_STATE for bz2-1, but bz2-1 was already archived + merged (battlezone PR #14, commit 42f66f5); the lingering .session/bz2-1-session.md was stale local cruft from a parallel checkout's finish syncing via git and was removed. Merge gate clear — zero open PRs in asteroids/battlezone. bz2-9 remains legitimately held pending playtest (no open PR, non-blocking).

**Handoff:** To TEA for RED — write the failing test(s) pinning correct bullet lifetime/travel distance against the ROM reference, then hand to Dev (The Word Burgers) for GREEN.

## TEA Assessment

**Tests Required:** Yes

**Scope (expanded per user direction — "fix the bug, not halfway"):** A2-9 is the full ROM ÷4-cadence bug fix, not just player-bullet range. It covers (a) player shot range, (b) saucer shot range, and (c) the saucer's fire + movement cadence ("spam bullets and turn quickly", user-confirmed in playtest) — all the same root cause: the port ignores the ROM's every-4th-frame update cadence.

**Test Files:**
- `asteroids/tests/bullet.test.ts` — new `describe('shot range: ROM timer cadence (A2-9)')` block (5 tests) + 2 existing lifetime tests retargeted from the raw 18-frame counter to the effective 72-frame life.
- `asteroids/tests/saucer.test.ts` — new `describe('saucer ÷4 update cadence (A2-9)')` block (3 tests: fire cadence constant, observable no-spam gap, ÷4 crossing speed) + removal-window widened to the effective saucer-shot life; stale "natural concurrency" comment corrected.

**Tests Written:** 8 new + 3 updated. Coverage: shot lifetime (72 frames), max travel (~full screen / "reaches distant targets"), player+saucer respective ranges (shared owner-agnostic aging), authentic-seed/velocity guards, saucer fire cadence (40 frames / no spam), saucer crossing+weave speed (÷4).
**Status:** RED — 10 failing, 330 passing. All 10 are A2-9-attributable (the runner labelled the 3 retargeted tests "collateral", but they are the tests intentionally updated to the corrected behavior and fail correctly on the buggy code). No genuinely unrelated test broke.

**The bug (one root cause, three sites, ROM-cited):** The Atari ROM decrements per-object timers and updates the saucer only on every 4th frame (`FrameTimerLo AND #$03`) while integrating positions every frame. The port does everything every frame — so anything gated by that cadence runs ~4× too fast:
1. **Player shot range** — timer seed `$12 = 18` (L6CFF) is authentic, but decrement is every-4th-frame (L738F) → effective 72 frames (~7992 lo-units, near-full-screen). Port (`advance()`, `bullet.ts:64` `life = b.life - frames`) ages every frame → dies at 18 frames (¼ screen): 4× too short.
2. **Saucer shot range** — same shared `advance()`, seed `SAUCER_BULLET_LIFETIME = 18` → also 4× too short.
3. **Saucer fire + movement** — the whole saucer update is gated to every 4th frame (UpdateScr L6B93). Fire timer `ScrTimer = $0A = 10` (L6C54) decrements inside that gate → fires every 40 frames; the port's `SAUCER_FIRE_INTERVAL = 10/60` fires every 10 (spam). Movement integrates inside the gate → effective speed is ¼ the drift; the port's `SAUCER_SPEED = 16`/frame crosses/weaves 4× too fast ("turns quickly").

**Dev contract (GREEN):**
1. Export `SHOT_TIMER_PERIOD_FRAMES = 4` from `src/core/bullet.ts` (ROM `and #$03`, L738F), ROM-cited.
2. In the shared, owner-agnostic `advance()`, age the shot timer once per `SHOT_TIMER_PERIOD_FRAMES` frames (e.g. `life = b.life - frames / SHOT_TIMER_PERIOD_FRAMES`) so a seed of 18 yields 72 effective frames. Do NOT inflate the seed; do NOT special-case owner — player and saucer shots share the cadence.
3. Keep `BULLET_LIFETIME_FRAMES = 18` and the ±111 clamp unchanged (authentic).
4. In `src/core/saucer.ts`: `SAUCER_FIRE_INTERVAL: 10/60 → 40/60` (ROM 10 ticks × 4-frame gate) and `SAUCER_SPEED: 16 → 4` (the per-4-frame drift ÷ 4). `SAUCER_VERTICAL_SPEEDS` follows `SAUCER_SPEED` automatically; `SAUCER_COURSE_CHANGE_INTERVAL` (128 frames) is already correct — leave it. Cite the ROM addresses; keep the `verify vs quarry (A-17)` notes on the still-provisional base magnitudes.
5. Run `npm test` — all 340 green — plus `npm run build`.

### Rule Coverage (typescript.md)

| Rule | Applies to | Test / Note | Status |
|------|-----------|-------------|--------|
| #1 type-safety escapes | test design | No `as any`/`!`/`@ts-ignore` in new tests; `mk()` returns a typed `Bullet` | clean |
| #2 generic/readonly | test design | `step` helper takes `readonly Bullet[]`; no `Record<string,any>`/`Function` | clean |
| #4 null/undefined (`??` vs `||`) | Dev | `SHOT_TIMER_PERIOD_FRAMES === 4` pins the constant so Dev can't slip a `|| 4` fallback; arithmetic has no nullable | RED (const absent) |
| #5 module/declaration | Dev | new named export required; tests import from `src/`; `.js` omitted per bundler resolution (repo convention) | RED (export absent) |
| #8 test quality | test design | every new test asserts a concrete value/length/bound; no vacuous checks, no `as any`, `src/`-imports | clean |
| #13 fix-introduced regressions | Dev | re-scan the fix diff at GREEN | deferred |
| #3,#6,#7,#9–#12 | — | n/a to a pure numeric core-sim change (no enums/JSX/async/IO/external input) | — |

**Rules checked:** 13 of 13 reviewed; 4 applicable to test design (all clean), the rest pinned by the RED tests or n/a.
**Self-check:** 0 vacuous tests — the travel test pins both the relative (constant-velocity) and absolute (>0.8×world-width) distance; lifetime tests check both alive-before and gone-after boundaries.

**Delivery Findings:** Logged (see above) — the saucer fire/turn "spam" is now IN A2-9 scope (folded in per user direction). Remaining open item: the still-provisional saucer base magnitudes (SAUCER_SPEED base 16, SAUCER_BULLET_LIFETIME 18) and the resulting 4× slower crossing "feel" want quarry confirmation (A-17) + an epic-playtest eyeball — captured as a non-blocking Question, not blocking this fix.

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/bullet.ts` — Added `SHOT_TIMER_PERIOD_FRAMES = 4` (ROM L738F `and #$03`, cited). Shared owner-agnostic `advance()` now ages the shot timer once per that many frames (`life = b.life - frames / SHOT_TIMER_PERIOD_FRAMES`), so the authentic seed of 18 yields a true 72-frame life. `BULLET_LIFETIME_FRAMES = 18` and the ±111 muzzle clamp untouched.
- `asteroids/src/core/saucer.ts` — `SAUCER_FIRE_INTERVAL` 10/60→40/60 (ScrTimer $0A=10 × the every-4th-frame gate, UpdateScr L6B93) and `SAUCER_SPEED` 16→4 (per-4-frame drift ÷ 4), both re-commented with ROM citations. `SAUCER_VERTICAL_SPEEDS` follows `SAUCER_SPEED` automatically; `SAUCER_COURSE_CHANGE_INTERVAL` left at 128 frames (already correct). `verify vs quarry (A-17)` notes on the provisional base magnitudes preserved.

**Tests:** 340/340 passing (GREEN) — full asteroids Vitest suite. `npm run build` clean (tsc --noEmit + vite build).

**Branch:** fix/A2-9-bullet-range-retune (pushed to origin; no PR — SM opens it at finish)

**Self-review (judgment checks):**
- Code wired: the constant flows through the shared `advance()` → `stepBullets` → `stepGame`, exercising both player and saucer shots; saucer constants consumed by `stepSaucer`. No dead exports.
- Follows project patterns: ROM-cited constant style, comment density, and the isolate-the-magnitude convention match the surrounding core-sim code.
- All ACs met: player shot range, saucer shot range, saucer fire cadence, and saucer crossing/weave speed all corrected by one root-cause fix (the ÷4 cadence).
- Error handling: n/a — pure numeric core-sim change, no IO/nullable/external input.

**Handoff:** To verify/review phase.

## Subagent Results

Toggles (`workflow.reviewer_subagents`): preflight, test_analyzer, security, rule_checker = **enabled**; edge_hunter, silent_failure_hunter, comment_analyzer, type_design, simplifier = **disabled** (pre-filled Skipped; their domains assessed by Reviewer directly — see dispatch tags).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 340/340 green; build+lint clean; tree clean | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary analysis done by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — swallow/fallback scan done by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 medium, 2 low | confirmed 0 blocking, dismissed 2 (F3,F4), deferred 2 as non-blocking (F1,F2) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer found 1 stale comment ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type rules covered by rule-checker ([TYPE]) |
| 7 | reviewer-security | Yes | clean | 0 | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — minimal diff, no over-engineering ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 (16 rules / 29 instances) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled Skipped)
**Total findings:** 0 confirmed blocking, 2 dismissed (with rationale), 2 deferred (non-blocking, captured as Delivery Findings)

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + 3 epic rules. Exhaustive enumeration over the diff (2 source items: the `advance()` life-decrement + 3 new/changed constants; 3 changed import statements; 12 new/changed tests):

| Rule | Governed items in diff | Verdict |
|------|------------------------|---------|
| #1 type-safety escapes | 0 (`as any`/`as unknown`/`@ts-ignore`/`!` — none added) | ✅ compliant |
| #2 generic/readonly | `advance(bullets: readonly Bullet[])` unchanged readonly; test helper `step = (bs: readonly Bullet[])` | ✅ compliant |
| #3 enum | none (owner stays the pre-existing `'player'\|'saucer'` union) | ✅ n/a |
| #4 null/undefined | `if (s.saucer === null) break` (saucer.test.ts:634) — strict `===`, no `\|\|`-default bug | ✅ compliant |
| #5 module/declaration | 3 imports; `type`-modifier correctly on `GameState/Ship/Bullet` only; runtime consts imported plainly; missing-`.js` waived by repo convention | ✅ compliant |
| #6 react/jsx | none (no .tsx) | ✅ n/a |
| #7 async | none (no async/Promise) | ✅ n/a |
| #8 test quality | 12 tests — all import from `src/`, no `as any`, no `!`; 3 are constant-guards backed by adjacent behavioral tests (see F1/F2/F3 below) | ✅ compliant (2 LOW style notes) |
| #9 build/config | none (tsconfig untouched) | ✅ n/a |
| #10 input validation | none (no external input) | ✅ n/a |
| #11 error handling | none (no try/catch) | ✅ n/a |
| #12 perf/bundle | 3 imports target concrete modules, not barrels; no stringify/dynamic-import added | ✅ compliant |
| #13 fix-introduced regressions | fix diff re-scanned vs #1–12 | ✅ compliant |
| Epic: core-sim purity/determinism | `advance()` + saucer consts add no Math.random/Date.now/performance.now; Rng-driven fns untouched | ✅ compliant |
| Epic: ROM-cited named constants | `SHOT_TIMER_PERIOD_FRAMES` (L738F), `SAUCER_SPEED` (L6B93 + verify-A-17), `SAUCER_FIRE_INTERVAL` (L6C54+L6B93) all cited; provisional base keeps the A-17 note | ✅ compliant |
| Epic: owner-agnostic bullet aging | `advance()` life-decrement applies to every bullet; `owner` only passed through — no `if (b.owner…)` branch | ✅ compliant |

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `dt` (game loop) → `frames = dt*60` → shared `advance(bullets, frames)` → `life = b.life - frames / SHOT_TIMER_PERIOD_FRAMES` → prune at `life <= 0`. Safe because: `SHOT_TIMER_PERIOD_FRAMES` is a hardcoded literal `4` (never 0, never external-sourced), so no divide-by-zero/NaN path is introduced; the prune condition and the player (`MAX_PLAYER_SHOTS=4`) and saucer (`SAUCER_MAX_BULLETS=2`) caps are untouched, so longer-lived bullets cannot grow the array unbounded. Verified `frames = (1/60)*60 === 1` exactly and `0.25`/step is exactly IEEE-754 representable → no accumulation drift; a shot seeded 18 expires at frame 72 (fixed dt) and at 72 frames under dt=1/30 too (correct continuous-dt scaling).

**Pattern observed:** ROM-cited, isolated named constants with a per-4-frame gate modeled as continuous-dt magnitudes — `src/core/bullet.ts:38` (`SHOT_TIMER_PERIOD_FRAMES`) and `src/core/saucer.ts:32,57`. Matches the codebase's "isolate every tunable, cite the ROM, tag provisional values for A-17" convention exactly. Good pattern.

**Error handling:** N/A by design — pure numeric core-sim change, no IO/nullable/external input/try-catch. `[SILENT]` no swallowed errors or silent fallbacks (no catch blocks, no `||`-defaults); the only control flow is `if (life <= 0) continue`, an explicit prune, not a swallow.

**Observations & subagent dispatch (all 8 tags):**
- `[SEC]` VERIFIED clean — security specialist: no entropy/wall-clock globals, no casts, determinism preserved, no new NaN/divide-by-zero/immortal-bullet path. Evidence: `bullet.ts` division is by literal `4`; caps unchanged.
- `[RULE]` VERIFIED clean — rule-checker: 16 rules / 29 instances, 0 violations; explicitly confirmed owner-agnostic aging and ROM-cited constants.
- `[TEST]` F1 (saucer.test.ts:620, medium→**LOW, deferred non-blocking**): fire-cadence assertion reduces algebraically to 40. Not harmfully tautological — it's a ROM-constant regression-guard and the next test (:624) proves the cadence behaviorally through `stepGame`. Rule-checker independently judged it non-vacuous.
- `[TEST]` F2 (saucer.test.ts:644, medium→**LOW, deferred non-blocking**): `expect(SAUCER_SPEED).toBe(4)` under a "crosses and weaves" title — title overstates a constant check. Deferred: the base magnitude is deliberately provisional (this file's charter is "pin structure, never a raw byte"), and the gross `*dt`-vs-`*frames` integration bug is already caught by the crossing test (Reviewer-verified: 122,880 vs 2,248-tick window). Captured as a Delivery Finding for A-17.
- `[TEST]` F3 (bullet.test.ts:366, low→**dismissed**): bare `SHOT_TIMER_PERIOD_FRAMES===4` — analyzer itself says "no action needed"; three genuine behavioral tests (:376/:386/:414) back it and independently fail against the old cadence.
- `[EDGE]` F4 (bullet.test.ts:65, low→**dismissed as blocking**): no variable-dt test. Dismissed — Reviewer empirically verified variable-dt correctness (dt=1/30 → 72 frames) and exact float representability; the sim is fixed-timestep, so this is a hypothetical, not a gap. Noted as a caveat only.
- `[DOC]` **LOW (Reviewer-found, comment-analyzer disabled):** stale comment at `tests/saucer.test.ts:439` — "fire cadence (~10 frames)" but this change makes it 40 frames. Reasoning valid, magnitude stale. Captured as a Delivery Finding.
- `[TYPE]` VERIFIED clean — no new casts, `readonly` preserved on `advance()` and the test helper, owner discriminant reused unchanged (covered by rule-checker #1/#2).
- `[SIMPLE]` VERIFIED clean — the diff is minimal (one division + two constant values + comments); no dead code, no abstraction, no over-engineering. `[PREFLIGHT]` 0 code smells corroborates.

### Devil's Advocate

Let me argue this code is broken. First attack: **the division changes the type/precision of `life`.** Before, `life` decremented by an integer (`frames`, effectively 1) and stayed integer-valued; now it decrements by `frames/4 = 0.25`, so `life` is a non-integer float carried across up to 72 iterations. Could rounding make a bullet immortal or kill it early enough to shorten range and *re-introduce the very bug we fixed*? I checked: `0.25` is `2^-2`, exactly representable, and `frames` evaluates to exactly `1.0` at the canonical dt, so `18 - n*0.25` is exact for every integer n — no drift, expiry lands on frame 72 to the frame. Under a hypothetical variable dt the decrement is still finite and monotonic, and I confirmed dt=1/30 expires at the same 72-frame wall-clock. Attack fails.

Second attack: **double-application of the ÷4.** The saucer's fire timer and movement are fixed via constants (40/60, 4), while its *bullets* age via the shared `advance()` ÷4. Does any saucer shot get the ÷4 twice — once in the constant, once in aging? No: the constants govern *when the saucer fires* and *how fast the saucer moves*; the shared aging governs *how long each bullet lives*. Three orthogonal mechanisms, each ÷4'd exactly once. A saucer shot's life uses `SAUCER_BULLET_LIFETIME=18` (unchanged) aged ÷4 → 72 frames; correct.

Third attack: **a stressed/confused reader.** The stale "~10 frames" comment at saucer.test.ts:439 could mislead a maintainer into thinking the cadence is still 10 — I flagged it. The two overstated test titles could lull someone into believing the saucer's crossing *speed* is behaviorally pinned when only the constant is; I flagged and deferred that too, and verified the gross integration bug is still trapped by the crossing test. Fourth attack: **unbounded growth** from longer-lived bullets — refuted, the 4-shot and 2-shot caps are untouched and enforced upstream in `stepBullets`/`stepSaucer`. Fifth: **config with unexpected fields / malicious input** — there is no config and no input surface in this diff; it is pure arithmetic on existing deterministic state. The devil finds only cosmetic test-comment debt, all non-blocking. The fix is correct.

**Handoff:** To SM (The Organic Mechanic) for finish-story.