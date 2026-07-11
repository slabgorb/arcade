---
story_id: "sw3-3"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-3: Surface phase: wave-scaled towers-remaining (byte_98CB 22/22/32..) + 50,000 cleared-all-towers bonus, replacing the flat 4-kill quota

## Story Details
- **ID:** sw3-3
- **Jira Key:** (none — local sprint story)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T16:47:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T16:14:43+00:00 | 2026-07-11T16:16:34Z | 1m 51s |
| red | 2026-07-11T16:16:34Z | 2026-07-11T16:33:48Z | 17m 14s |
| green | 2026-07-11T16:33:48Z | 2026-07-11T16:41:57Z | 8m 9s |
| review | 2026-07-11T16:41:57Z | 2026-07-11T16:47:26Z | 5m 29s |
| finish | 2026-07-11T16:47:26Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): the ROM displays a live "TOWERS LEFT TO SHOOT" HUD count (ROM `sub_76D3`, backed by `byte_4B1A`); sw3-3 pins the quota + bonus but not the on-screen remaining count. Affects `star-wars/src/core/hud.ts` / `src/shell/render.ts` (a future story could surface `towersForWave(wave) - phaseKills` on the HUD). *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM also scales the PER-TOWER hit score by mission (`byte_4B13` feeds "Display tower hit score" at ROM `768D`), separate from this story's flat completion bonus; the clone keeps `TURRET_SCORE = 200` (= ROM `byte_9859` BCD 00,02,00, already correct for early waves). Affects `star-wars/src/core/state.ts` (a later fidelity story could wave-scale per-tower score). *Found by TEA during test design.*
- **Question** (non-blocking): deep-wave tower counts — the ROM re-rolls the mission index via PRNG for missions ≥19 (ROM `A1DD`-`A1EC`); the pure core cannot carry that randomness, so RED pins a deterministic clamp to the table tail (50). If a future story wants cabinet-accurate deep-wave variance it must thread the seeded RNG. Affects `star-wars/src/core/state.ts` (`towersForWave`). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the union-census suite `tests/core/events.test.ts` carries a compile-time exhaustiveness guard (`never`) + a "covers N distinct types" count/set assertion that RED did not extend for the new `tower-bonus` event, so `tsc` failed on GREEN until Dev added the variant to the census (ALL_EVENTS entry, `discriminant` arm, count 14→15). Affects `star-wars/tests/core/events.test.ts` (any future new-GameEvent story must grow this census too — worth a note for TEA). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the `tower-bonus` cue reuses the `levelClear` SFX, so the fanfare plays twice on the surface→trench frame (once for `level-clear`, once for `tower-bonus`) — deliberate and consistent with the shipped `force-bonus` precedent, but an audio-polish story could give the cleared-all-towers bonus its own sample. Affects `star-wars/src/main.ts` (event pump). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Deterministic clamp instead of the ROM's PRNG index re-roll for deep missions**
  - Spec source: story title (byte_98CB) + reference/disasm/StarWars_annotated.lst ROM:A1DD-A1EC
  - Spec text: cabinet re-rolls `byte_4B13` to 13-18 via `lda PRNG; mul; adda #$D` once the mission index reaches $13 (19)
  - Implementation: `towersForWave(wave)` clamps to the table tail `byte_98DD` (50) for wave ≥ 18; no RNG
  - Rationale: the pure core forbids randomness in progression (CLAUDE.md hard boundary); a seeded re-roll would still diverge from the cabinet and complicate determinism. The "22-50 towers" range (epic context) is preserved.
  - Severity: minor
  - Forward impact: deep-wave (≥19) surface quotas are always 50 in the clone vs a cabinet-random 36-50; captured as a non-blocking Question above.
- **New `tower-bonus` GameEvent for the 50,000 banner (beyond the literal AC)**
  - Spec source: story title + reference/disasm ROM:E039 (`"50,000 FOR SHOOTING ALL TOWERS"`), ROM:9862
  - Spec text: award a 50,000 "cleared all towers" bonus
  - Implementation: RED pins BOTH `score += SURFACE_CLEAR_BONUS` (the hard AC) AND a `{ type: 'tower-bonus', amount }` event mirroring the established `force-bonus` scoring-event idiom, so the shell can raise the ROM's on-screen banner
  - Rationale: every other scoring moment in this core emits a payload-carrying event (force-bonus, death-star-destroyed); a silent score bump would break that convention and leave the authentic banner unwireable
  - Severity: minor
  - Forward impact: Dev adds one interface + union member to events.ts. If Reviewer prefers reusing `level-clear`, the score AC still stands; only the banner-cue test would relax.
- **Wave→table index reads the ROM sentinel as an unused slot (interpretation, not a change)**
  - Spec source: story title ("22/22/32..") + ROM:98CB / ROM:A1EF
  - Spec text: `byte_98CB[byte_4B13]` where `byte_4B13 = min(byte_4B15-1, 31)`; `byte_98CB[0] = 0`
  - Implementation: the clone's 1-based `wave` indexes the table directly (wave 1 → `byte_98CB[1]` = 22); index 0's `0` is treated as the ROM's unused sentinel, matching the title's stated sequence
  - Rationale: a literal `wave-1` index would yield 0 towers on wave 1 (an instant surface clear); the title/epic fix the first playable wave at 22
  - Severity: minor
  - Forward impact: none — this IS the intended faithful behavior; pinned as observable per-wave counts.

### Dev (implementation)
- No deviations from spec. The implementation follows the TEA contract exactly:
  `towersForWave` transcribes the byte_98CB table with the deterministic clamp,
  `SURFACE_CLEAR_BONUS = 50000`, and the surface→trench clear banks the bonus +
  emits `tower-bonus`. The three design decisions above (clamp vs PRNG re-roll,
  the dedicated `tower-bonus` event, the 1-based wave→table index) were logged by
  TEA and implemented as specified — not re-decided here. Internal structure note
  (not a spec deviation): the static `PHASE_QUOTA` map became a `phaseQuota(s)`
  function so the surface quota can read `towersForWave(s.wave)`; it stays
  exhaustive over `Phase`. The shell cue for `tower-bonus` reuses the `levelClear`
  fanfare (same no-new-asset pattern as `force-bonus`, with which it co-fires).

### Reviewer (audit)
- **Deterministic clamp instead of the ROM's PRNG index re-roll** → ✓ ACCEPTED by Reviewer: the pure-core boundary (CLAUDE.md: no `Math.random`, randomness only via the seeded RNG in state) makes a faithful re-roll impossible without threading the RNG through progression; the deterministic clamp preserves the epic's "22-50 towers" range and is the correct call for the clone. Deep-wave variance is captured as a non-blocking follow-on.
- **New `tower-bonus` GameEvent for the 50,000 banner** → ✓ ACCEPTED by Reviewer: consistent with the codebase convention that every scoring moment emits a payload-carrying event (`force-bonus`, `death-star-destroyed`); the union + both exhaustive consumers (pump `default: never`, census `default: never`) were correctly updated. `level-clear` alone could not carry the 50,000 amount for the HUD/audio layer.
- **Wave→table index reads the ROM sentinel (0) as an unused slot** → ✓ ACCEPTED by Reviewer: a literal `wave-1` index would return `byte_98CB[0] = 0` on wave 1 (an instant surface clear); indexing 1-based `wave` directly matches the title's "22/22/32" sequence and the `Math.max(1, …)` floor guarantees the sentinel is never observable.
- **Dev "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the implementation transcribes the TEA contract faithfully; the `PHASE_QUOTA` record → `phaseQuota(s)` function is a sound structural change (stays exhaustive over `Phase`, compile-guards a future phase).

## Sm Assessment

**Setup routing:** tdd (phased) → next phase `red`, owner **TEA (O'Brien)**. No
separate design phase in tdd, so TEA owns the ROM quarry + failing tests.

**Story intent (derived from title — the YAML has no explicit AC):** Replace the
current flat "4-kill quota" that ends the Surface phase with the authentic
ROM-faithful mechanic:

1. **Wave-scaled towers-remaining** — the number of towers to clear in the
   Surface phase scales by wave, driven by ROM `byte_98CB` (title cites the
   sequence `22/22/32..`). TEA to dig `byte_98CB` in the star-wars ROM
   reference to recover the exact per-wave table and its indexing.
2. **50,000-point cleared-all-towers bonus** — award 50,000 when the player
   destroys every tower in the Surface phase (a completion bonus, distinct from
   per-tower score).
3. **Remove/replace the flat 4-kill quota** — the old fixed count is superseded
   by the wave-scaled table.

**Quarry pointers for TEA:**
- ROM reference lives only in another checkout for some games — confirm the
  star-wars `reference/` is present here before relying on it; the sw3 epic is a
  ROM-fidelity pass so the disassembly should be available.
- Surface-phase / tower logic lives in `star-wars/src/core`; the flat 4-kill
  quota is the thing being replaced — locate it first, then re-point it at the
  `byte_98CB` table.

**Open questions for TEA to resolve during RED:**
- Exact length/values of the `byte_98CB` table and how wave index maps into it
  (title shows `22/22/32..` — first two waves 22, third 32, then continue).
- Whether the 50k bonus fires once per Surface phase or per wave.

**Context file** (`sprint/context/context-story-sw3-3.md`) is the generated
stub — TEA to enrich with the recovered ROM table and concrete ACs.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Core sim behavior change (surface-phase quota + scoring) — pure,
deterministic, TDD-covered.

**Status:** RED (failing — ready for Dev). Verified via testing-runner:
**5 files / 44 tests fail** (exactly the touched files), **637 other tests pass,
zero collateral**. All failures trace to three symbols GREEN must add.

### ROM quarry (the contract, from `star-wars/reference/disasm/StarWars_annotated.lst`)

- **Towers-per-wave table** `byte_98CB` (ROM:98CB) indexed by the mission counter
  `byte_4B13` (= clone 1-based `wave`; ROM index 0 is an unused `0` sentinel):
  `[_,22,22,32,32,32,33,33,39,40,32,32,36,36,36,37,37,49,50]` — clamped at the
  tail (index 18 = `byte_98DD` = 50) for deep waves. Set into `byte_4B1A`
  ("towers left to shoot") at surface init (ROM:A1EF `sub_A1CE`).
- **50,000 completion bonus** (ROM:973A `sub_973A`): each tower hit decrements
  `byte_4B1A` (BCD); the step driving it to 0 adds `byte_9862` (BCD 05,00,00 =
  50,000, "Cleared all towers score value") and sets the surface-cleared flag.
  Banner text: `"50,000 FOR SHOOTING ALL TOWERS"` (ROM:E039). → fires ONCE, on
  the surface→trench clear.

### What GREEN must implement

| Symbol | Location | Contract |
|--------|----------|----------|
| `towersForWave(wave: number): number` | `src/core/state.ts` | the byte_98CB table, 1-based wave, clamp-to-50 |
| `SURFACE_CLEAR_BONUS = 50000` | `src/core/state.ts` | ROM byte_9862 |
| `TowerBonusEvent { type: 'tower-bonus', amount: number }` | `src/core/events.ts` | add to `GameEvent` union (exhaustive) |
| surface quota → `towersForWave(s.wave)` | `src/core/sim.ts` (`progress` / `PHASE_QUOTA`) | replaces the flat `SURFACE_WAVE_QUOTA` |
| award bonus on surface→trench clear | `src/core/sim.ts` | `score += SURFACE_CLEAR_BONUS`, emit `tower-bonus` |
| **remove** `export const SURFACE_WAVE_QUOTA = 4` | `src/core/state.ts` | superseded (also drop its `sim.ts` import/use) |

### Test Files

- **NEW** `tests/core/surface-tower-quota.test.ts` — the sw3-3 contract: the full
  per-wave table (`it.each` over waves 1-18), clamp, "never 0 for a playable
  wave", `SURFACE_CLEAR_BONUS === 50000`, surface clears at `towersForWave(wave)`
  not the flat 4 (regression pin), the +50,000 on clear (isolated, plus the
  "kill + bonus" case), the `tower-bonus` event, one-shot (not re-banked), NOT on
  space→surface, and fixed-seed determinism.
- **UPDATED** `tests/core/phase-progression.test.ts` — surface→trench block now
  crosses at `towersForWave(1)` and expects the +50,000 bonus; the "positive
  quotas" test now checks `towersForWave(1)`.
- **UPDATED** `tests/core/{speech-cues,exhaust-port-outcome,trench}.test.ts` —
  their surface-crossing setup swapped `SURFACE_WAVE_QUOTA` → `towersForWave(1)`
  (the removed constant); each file's own intent (speech edges, port stamps,
  port spawn) is unchanged and their subset assertions tolerate the new bonus.

### Rule Coverage

No formal `lang-review/typescript.md`, `.claude/rules/*`, or `SOUL.md` exists in
this repo — the rubric is the story ACs plus the CLAUDE.md hard boundary
(pure, deterministic core: no DOM/time/randomness except `dt` + seeded RNG;
exhaustive discriminated event unions; single-sourced constants).

| Implicit rule | Test | Status |
|---------------|------|--------|
| Pure/deterministic progression (no RNG) | `the wave-scaled clear is deterministic — crosses identically for a fixed seed` | failing |
| Table is a pure function of wave (no hidden state) | `is a pure function of the wave … (no RNG, no time)` | failing |
| Exhaustive `GameEvent` union (discriminant) | `emits a tower-bonus event carrying the 50,000 amount` (narrows on `e.type`) | failing |
| Single-sourced constant (byte_9862) | `SURFACE_CLEAR_BONUS is exactly 50,000` | failing |
| No insta-clear surface (sentinel hidden) | `never yields 0 towers for any playable wave` | failing |

**Self-check:** every test asserts a concrete value or emitted event — no
vacuous `assert(true)` / `let _ =` / always-null checks found or introduced.

**Handoff:** To Julia (Dev) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/state.ts` — `SURFACE_TOWERS_BY_WAVE` (private) + `towersForWave(wave)` (byte_98CB, clamped) and `SURFACE_CLEAR_BONUS = 50000`; removed the flat `SURFACE_WAVE_QUOTA`.
- `star-wars/src/core/sim.ts` — static `PHASE_QUOTA` map → exhaustive `phaseQuota(s)` (surface = `towersForWave(s.wave)`); `progress()` banks `SURFACE_CLEAR_BONUS` and emits `tower-bonus` on the surface→trench clear, once.
- `star-wars/src/core/events.ts` — `TowerBonusEvent { type:'tower-bonus'; amount }` added to the `GameEvent` union.
- `star-wars/src/main.ts` — event pump wires `tower-bonus` to the `levelClear` fanfare (mirrors `force-bonus`, with which it co-fires).
- `star-wars/tests/core/events.test.ts` — extended the union census for the new event (ALL_EVENTS + `discriminant` arm + count 14→15). See the Delivery Finding (RED left this census un-extended).

**Tests:** 681/681 passing (GREEN) across 62 files. `tsc --noEmit` + `vite build` clean.

**Verification:** the sw3-3 behaviors are driven end-to-end through the real
`stepGame` sim in the tests — the space→surface (no bonus) and surface→trench
(quota met, +50,000, `tower-bonus` emitted, one-shot) transitions, the per-wave
table, and fixed-seed determinism. The live "50,000 FOR SHOOTING ALL TOWERS"
banner is an eyeball item for the epic's playtest (a HUD follow-on is filed).

**Branch:** `feat/sw3-3-wave-scaled-towers` (pushed to origin).

**Handoff:** To the next phase (verify/review).

## Subagent Results

Only `preflight` is enabled (`workflow.reviewer_subagents`); the eight specialist
subagents are disabled via settings, so the Reviewer performed their analysis
directly against the diff (a small, pure-core scoring/progression change).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 681/681 GREEN; tsc+vite clean | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [RULE]) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings and self-assessed)
**Total findings:** 0 confirmed blocking; 3 LOW/non-blocking noted; 5 VERIFIED

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** sw3-3 faithfully replaces the flat 4-kill surface quota with the
ROM `byte_98CB` wave-scaled tower table and banks the 50,000 `byte_9862`
cleared-all-towers bonus once, on the surface→trench clear. The change is pure,
deterministic, exhaustively typed, correctly wired to the shell, and covered by
a 300-line RED suite plus updates to five sibling suites — 681/681 GREEN,
`tsc --noEmit` + `vite build` clean. No Critical/High issues.

**Data flow traced:** `state.wave` → `phaseQuota(s)` → `towersForWave(s.wave)`
(pure ROM-table lookup) → compared against `s.phaseKills` in `progress()`; on
clear, `score += SURFACE_CLEAR_BONUS` and a `tower-bonus` event flows out
`state.events` → `main.ts` pump → `audio.play('levelClear')`. Safe: the quota
guard runs every step and the phase flips to trench (phaseKills→0) on the
clearing step, so the bonus is single-shot.

**Observations (≥5):**
1. `[VERIFIED]` `towersForWave` transcribes ROM `byte_98CB` exactly — `state.ts` table `[0,22,22,32,32,32,33,33,39,40,32,32,36,36,36,37,37,49,50]` matches the disasm (`$16=22,$20=32,$21=33,$27=39,$28=40,$24=36,$25=37,$31=49`) + `byte_98DD=$32=50`; clamp `Math.max(1, Math.min(wave, 18))` floors at the first playable value (22, sentinel hidden) and caps at the tail (50). Pure — no RNG/time/DOM (complies with the CLAUDE.md core boundary).
2. `[VERIFIED]` The 50,000 bonus is single-shot — `sim.ts` `progress()` guards `phaseKills < phaseQuota(s)` then advances to trench (enterPhase resets phaseKills=0, quota Infinity), so it cannot re-fire; value `SURFACE_CLEAR_BONUS = 50000` matches ROM `byte_9862` (BCD 05,00,00). Corroborated by the "awards the bonus ONCE" test.
3. `[VERIFIED]` `phaseQuota` is exhaustive over `Phase` — all of `space|surface|trench` return; declared `: number` so a future 4th phase trips "not all code paths return" at compile. tsc clean.
4. `[VERIFIED]` `tower-bonus` is wired end-to-end — `events.ts` union member + `main.ts:161` pump arm (exhaustiveness `default: never` satisfied) + census grown to 15 in `events.test.ts`.
5. `[VERIFIED]` The four setup-only test swaps (`SURFACE_WAVE_QUOTA → towersForWave(1)`) preserve intent — all default to wave 1, use `toContainEqual`/stamp/position assertions that tolerate the added bonus event + score; no weakened assertions.
6. `[LOW]` Double fanfare on surface clear — `level-clear` (main.ts:134) and `tower-bonus` (main.ts:161) both `audio.play('levelClear')` on the same frame. Consistent with the shipped `force-bonus` precedent (main.ts:155); non-blocking ear-item for the epic playtest. Filed as a Delivery Finding.
7. `[LOW]` `towersForWave(2.5)`/`towersForWave(NaN)` returns `undefined` (typed `number`) — the clamp has no `Math.floor`. Unreachable: `wave` is integer-by-construction (`initialState` wave:1, `clearRun` `s.wave + 1`). Defensive-only; non-blocking.
8. `[LOW]` `surface-tower-quota.test.ts` "pure function" test opens with `towersForWave(9) === towersForWave(9)` (trivially true), but the paired `=== 40` carries it — not vacuous overall. Non-blocking.

**Subagent dispatch (all 8 specialists disabled via settings — self-assessed):**
- `[EDGE]` boundary paths: wave ≤ 1, wave = 18, wave ≥ 19, fractional/NaN wave all traced — clamp holds; only the (unreachable) fractional case yields `undefined` (obs. 7).
- `[SILENT]` no swallowed errors/silent fallbacks: `towersForWave`/`phaseQuota`/`progress` have no try/catch, no `?? fallback` masking, no empty branches; every return is explicit.
- `[TEST]` coverage is strong (full per-wave table, clamp, one-shot bonus, not-on-space→surface, determinism); one weak-but-non-vacuous assertion noted (obs. 8).
- `[DOC]` comments are accurate and ROM-cited (byte_98CB/9862/9DD, sub_A1CE/973A); the `SURFACE_WAVE_QUOTA` doc was removed with the constant — no stale references remain.
- `[TYPE]` `TowerBonusEvent` is a proper discriminated-union member; `phaseQuota` returns `number`; `SURFACE_TOWERS_BY_WAVE` is `readonly number[]` (no accidental mutation). No stringly-typed APIs, no unsafe casts.
- `[SEC]` N/A — client-only game logic, no auth/tenant/injection/secrets surface; no untrusted input (score is internal state).
- `[SIMPLE]` minimal and idiomatic — the `PHASE_QUOTA` record → `phaseQuota` function is the simplest shape once the surface quota depends on `wave`; no dead code, no over-engineering.
- `[RULE]` see Rule Compliance below — all applicable CLAUDE.md rules satisfied.

### Rule Compliance

No `lang-review/typescript.md`, `.claude/rules/*`, or `SOUL.md` exists — the rubric
is the CLAUDE.md hard boundary + repo conventions. Exhaustive check of the diff:

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| Pure core: no DOM/window/document/canvas | `towersForWave`, `phaseQuota`, `progress` (state.ts, sim.ts) — none touch DOM | ✓ compliant |
| Pure core: no `Date.now`/`Math.random`/`rAF`; time via `dt`, randomness via seeded RNG | `towersForWave` (Math.min/max only), `phaseQuota`, `progress` — no time/RNG | ✓ compliant |
| core must not import from shell/ | state.ts/sim.ts/events.ts import only core + `@arcade/shared`; the pump lives in main.ts (shell) | ✓ compliant |
| Exhaustive discriminated `GameEvent` union | `TowerBonusEvent` added to union; both `default: never` consumers (main.ts pump, events.test.ts discriminant) updated | ✓ compliant |
| Single-sourced constants | `SURFACE_CLEAR_BONUS` + table single-sourced in state.ts, imported by sim.ts; flat `SURFACE_WAVE_QUOTA` removed with no dangling refs | ✓ compliant |
| Collision/positions in 3D | N/A — this diff is scoring/progression, no geometry | N/A |

### Devil's Advocate

Argue the code is broken. First attack: the bonus double-banks. Could `progress`
run twice on a surface state at quota before the phase flips? No — `enterPhase`
sets `phase: 'trench'` and `phaseKills: 0` in the same return, and `progress` is
called once per `stepGame`; the very step that meets the quota flips the phase, so
the next call sees trench (quota `Infinity`) and bails. The "awards ONCE" test
pins exactly this. Second attack: a confused caller reaches the surface via the
dev phase-jump (story 11-4) with `phaseKills` pre-loaded ≥ quota — the next step
banks 50,000. But the phase-jump is a dev-build-only tool and the award is the
same one real play produces; not a production defect. Third attack: integer
assumptions. `towersForWave` indexes an array with `Math.min/max` but no
`Math.floor`; a fractional or NaN `wave` yields `undefined` typed as `number`,
which would poison `phaseQuota` (`phaseKills < undefined` is always false → the
surface never clears → soft-lock). Real? Only if `wave` can ever be non-integer.
It cannot: `initialState` seeds `wave: 1` and the only writer is `clearRun`'s
`s.wave + 1`; nothing multiplies/divides/`dt`-scales it. So the soft-lock is
unreachable today, but it is the one latent sharp edge — a `Math.floor` (or an
integer-`wave` invariant test) would harden it, hence obs. 7. Fourth attack: a
malicious/huge wave (e.g. 1e9) — clamps to 50, safe; negative wave — floors to 22,
safe. Fifth attack: the removed `SURFACE_WAVE_QUOTA` leaves a dangling import
somewhere — grep confirms zero references in `src/` and all four test consumers
were swapped to `towersForWave(1)`; the build is clean. Sixth attack: score
overflow — 50,000 added to a JS number; no realistic overflow. Conclusion: the one
genuine latent risk (non-integer `wave` → `undefined`) is unreachable by
construction; everything else holds. Nothing rises to Critical/High.

**Handoff:** To Winston Smith (SM) for finish-story.