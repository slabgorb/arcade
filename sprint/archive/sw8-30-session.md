---
story_id: "sw8-30"
jira_key: "sw8-30"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-30: Mid-game plays far softer than the cabinet — port the GM.DIF difficulty accumulator (WV.HRD index) and the ADCGAS Death-Star-kill shield refill

## Story Details
- **ID:** sw8-30
- **Jira Key:** sw8-30
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T20:40:50Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T18:01:13Z | 2026-08-05T18:03:13Z | 2m |
| red | 2026-08-05T18:03:13Z | 2026-08-05T19:45:14Z | 1h 42m |
| green | 2026-08-05T19:45:14Z | 2026-08-05T20:33:02Z | 47m 48s |
| review | 2026-08-05T20:33:02Z | 2026-08-05T20:40:50Z | 7m 48s |
| finish | 2026-08-05T20:40:50Z | - | - |

## Story Context

### Three Related Divergences

**1) THE RAMP (major).** Our waveParams indexes the TGPROB fire-aggression table with `min(wave-1, 15)` and declares "no DIP switches -> DIP = 0" (gameRules.ts:290-302). The ROM index is `WV.HRD = min(min(GM.WAV,31) + GM.DIF, 15)`, computed identically at all three phase entries:
- Space: WSMAIN.MAC:1353-1364
- Ground: WSMAIN.MAC:1603-1615
- Trench: WSMAIN.MAC:1702-1713

GM.DIF is NOT a static DIP value. It initializes to the difficulty-DIP ordinal 0-3 (WSMAIN.MAC:1300-1304, "STARTS AT 0(EASY)") and then GROWS at every Death-Star transition: `GM.DIF += GM.BMP` clamped 15, where GM.BMP itself increments 1..4 capped at 4 — the "USED TO KILL OFF RINGERS WHO START TOO EASY" mechanic (WSMAIN.MAC:2003-2021; the GM.BMP increment is gated "IGNORE BUMP WHEN ABOVE SELECTALEVEL", read as starting-wave < 6). Net: the cabinet's index saturates at 15 within ~4-5 Death Stars EVEN ON EASY; our clone does not reach 15 until wave 16. Right table (all three TGPROB columns are ported and drive the sec.6 fire gate), wrong index. Note: state.ts:448's base-gun tables already cite WV.HRD — reconcile that path with the same accumulator, do not grow a second one.

**2) THE BASELINE (minor, compounds 1).** MAME's manual-verified factory default for the difficulty DIP is Hard = ordinal 2 (starwars.cpp:199-203, "Dips Manual Verified... 06/2009"); our DIP=0 models the Easy setting. Needs a RULING (epic convention), not silent adoption: factory-default cabinet (start GM.DIF at 2) vs Easy cabinet (keep 0). Either way the DIP becomes one named constant, no longer an implicit zero folded into the index formula.

**3) THE REFILL (NO_COUNTERPART).** The "Bonus Shields" DIP (factory default 1) is consumed by ADCGAS (WSGAS.MAC:42-58): when the player kills the Death Star (PT.LIV != 0 at the endgame phase, WSMAIN.MAC:1970-1977), 0-3 shield units are ADDED BACK, capped at the starting amount (6-9 from the shields DIP). Our sim.ts only ever decrements lives (loseShield, sim.ts:1798) — a cabinet run heals one shield per Death Star destroyed; ours never heals. This materially lengthens real-cabinet runs and interacts with the SCRSHL per-surviving-shield bonus we already model (SHIELD_BONUS_PER_UNIT, state.ts:893): refill happens AFTER SCRSHL in the phase sequence (PH.TIM 2 -> 1, WSMAIN.MAC:1964-1977), so the bonus is scored on pre-refill shields.

### Six Acceptance Criteria (Verbatim)

**AC1 (REFUTE FIRST, gates the rest)** — An adversarial re-derivation of the GM.DIF/GM.BMP schedule from WSMAIN.MAC:1300-1304 and 2003-2021 (decode the IFLO/IFHI macro nesting; do NOT trust this story's prose) produces a wave-by-wave table of WV.HRD for a wave-1 start at DIP=0 and DIP=2, through at least the first 8 Death Stars, with every claim cited to file:line. Two specific claims to attack: (a) the GM.BMP increment gate 'CMPA #6-1 / IFLO' keys on the NEW wave number vs the SELECT-A-LEVEL starting wave; (b) GM.DIF += GM.BMP runs unconditionally at every transition. The surviving table is recorded in the story context and is the oracle for AC2's tests.

**AC2** — The clone's fire index becomes the ROM's: `min(min(wave-derived GM.WAV, 31) + gmDif, 15)` with gmDif evolving per the AC1 table, carried in GameState (pure, deterministic, reducer-threaded), consumed by waveParams AND reconciled with the base-gun WV.HRD path (state.ts:448) so exactly ONE accumulator exists. The stale 'DIP = 0' prose at gameRules.ts:290-302 is rewritten to name the accumulator.

**AC3 (RULING)** — Whether the clone models the factory-default cabinet (gmDif starts at 2, Hard) or the Easy cabinet (starts at 0) is put to the user as an explicit ruling with the AC1 table showing both columns, and the outcome lands as ONE named constant (e.g. DIFFICULTY_DIP) with the MAME cite (starwars.cpp:199-203) and the ruling date in its comment.

**AC4** — ADCGAS ported: on a Death-Star kill, `BONUS_SHIELDS_DIP` (one named constant, factory 1, MAME starwars.cpp:204-208) shield units are added, capped at STARTING_LIVES, sequenced AFTER the SCRSHL surviving-shield score bonus (cite WSGAS.MAC:42-58 and WSMAIN.MAC:1964-1977 at the site). The shield HUD gauge reflects the refill. A run that dies before any Death-Star kill is unchanged.

**AC5 (MUTATION-PROVEN, epic convention)** — Both behaviors redden with the mutated string recorded VERBATIM: (a) deleting the accumulator (index falls back to `min(wave-1,15)`) reddens a seat that pins the AC1 oracle at a mid-run wave where the two indexes differ; (b) deleting the ADCGAS step reddens a seat asserting post-kill shields = pre-kill + 1 (capped). Record which tests redden.

**AC6 (CONFIRMED ledger)** — The two MAME corroborations (timebase, starting shields) are appended to the star-wars audit doc's confirmed findings with the starwars.cpp cites, so the cross-check leaves a trace and is not re-run from scratch.

### Key File Anchors (Reference for Development)

**Difficulty Accumulator & Index:**
- gameRules.ts:290-302 — Current fire-aggression index (stale DIP=0 prose)
- state.ts:448 — Base-gun WV.HRD path (to be reconciled with accumulator)
- state.ts:893 — SHIELD_BONUS_PER_UNIT constant

**ROM Difficulty Initialization & Growth:**
- WSMAIN.MAC:1300-1304 — GM.DIF initialization ("STARTS AT 0(EASY)")
- WSMAIN.MAC:2003-2021 — GM.DIF increment gate ("IGNORE BUMP WHEN ABOVE SELECTALEVEL")

**ROM Fire Index Computation (all three phases):**
- WSMAIN.MAC:1353-1364 — Space phase index
- WSMAIN.MAC:1603-1615 — Ground phase index
- WSMAIN.MAC:1702-1713 — Trench phase index

**Shield Refill (ADCGAS):**
- sim.ts:1798 — Current loseShield (only decrements)
- WSGAS.MAC:42-58 — ROM ADCGAS refill implementation
- WSMAIN.MAC:1964-1977 — Phase sequence: SCRSHL → refill
- WSMAIN.MAC:1970-1977 — Death-Star kill detection (PT.LIV != 0)

**MAME Cross-Check References:**
- starwars.cpp:199-208 — Factory-default difficulty (Hard=2) and Bonus Shields DIP

**Contingent (AC1 measurement artifact):**
- WSMAIN.MAC:1353-1364, :1603-1615, :1702-1713 — IFLO/IFHI macro nesting (decode for AC1 table)
- MAME starwars.cpp:199-208 — Factory defaults corroboration

### AC1 Refute-First Gate Note

This story's scope guard states: "My GM.BMP schedule reading is a single-session derivation — AC1 refutes it before it becomes code." The prose at the end of the story description (lines describing the RAMP divergence) contains derived claims about the GM.DIF accumulator and GM.BMP increment gate that must be **adversarially re-derived** from the ROM source before any code implementation in AC2. Do NOT trust the prose as authoritative — verify the wave-by-wave schedule independently by decoding WSMAIN.MAC:1300-1304 and 2003-2021 (IFLO/IFHI macro nesting), then use the surviving table as the oracle for all AC2 tests.

## Delivery Findings

No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): the four new sw8-30 test files reach their subjects through
  `as unknown as {...}` casts left over from the RED phase; those members now exist as real
  exports, so the casts are dead ceremony that also slightly weaken type coverage (the local
  `WaveParams` interface duplicates the real one). Affects `plugins/star-wars/tests/core/
  difficulty-accumulator.test.ts`, `difficulty-index-consumption.test.ts`,
  `death-star-shield-refill.test.ts` (swap casts for direct imports on a future touch — this
  is the codebase's own established idiom, so not story-blocking). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `advanceDifficulty(prev: {gmDif, gmBmp}, …)` could type `prev`
  as `readonly` fields — it never mutates the argument. Affects `plugins/star-wars/src/core/
  gameRules.ts`. *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- No deviations from spec. The TEA contract below was implemented as written; the AC3
  ruling (DIP=0) landed as `DIFFICULTY_DIP = 0`. The only unspecified work was the
  mandatory blast-radius maintenance: my inserts into `state.ts`/`sim.ts` drifted 13
  pre-existing comment citations and 3 exact-line audit fixtures (`sw8-27-remediation`),
  all re-anchored to their true new lines (no citation laundering — the two multi-match
  cases, `sim.ts:1200-1201` and `:2268`, were re-anchored to where the ORIGINALLY-cited
  code actually moved, 1204-1205 / 2290, not the checker's wrong nearest-match).
  → ✓ ACCEPTED by Reviewer: the re-anchors are correct — reviewer-comment-analyzer
  independently re-read all 13 target lines against the current source and confirmed each
  points at the described code; the two multi-match re-anchors (1204-1205, 2290) were
  verified to hit the real `loseShield`/`surfaceShip` sites, not the checker's nearest-match.
  This is unavoidable, correctly-executed line-drift maintenance, not laundering.

### Reviewer (audit)
- No undocumented spec deviations found. The implementation matches all six ACs; the one
  scope call (per-phase index micro-differences left out) is explicitly AC-sanctioned (AC2
  codifies the space formula) and recorded in the Dev contract note. Nothing slipped through.

TEA contract (RED phase) — the testable seam Dev must implement to GREEN:

1. **`state.DIFFICULTY_DIP` = 0** — the AC3 ruling (user, 2026-08-05: model the EASY
   cabinet), one named constant, with the ROM init cite (WSMAIN.MAC:1300-1307) and MAME
   cite (starwars.cpp) in its comment.
2. **`state.BONUS_SHIELDS_DIP` = 1** — factory default, one named constant (WSGAS.MAC:42-58,
   MAME starwars.cpp).
3. **GameState carries `gmDif` and `gmBmp`** — true reducer-threaded state, `initialState`
   sets them to `(DIFFICULTY_DIP, 0) = (0, 0)`. Both are needed: gmBmp is history-dependent
   (the bump gate reads the current wave), so neither is a closed form of the wave — this
   matters for the clone's MEDIUM/HARD (wave 3/5) starts.
4. **`gameRules.wvHrd(wave1Based, gmDif)`** = `min(min(wave-1, 31) + gmDif, 15)` — the SINGLE
   fire-index helper. Consumed by BOTH `waveParams` AND the base-gun path (sim.ts:1462,
   currently `min(romWave0(wave), 7)`) so exactly ONE accumulator exists (AC2).
5. **`gameRules.advanceDifficulty({gmDif, gmBmp}, newWave1Based)`** — the pure recurrence:
   `if newWave-1 < 5: gmBmp = min(gmBmp+1, 4)`; then unconditionally `gmDif = min(gmDif+gmBmp, 15)`.
   Threaded by the reducer at the Death-Star kill (sim.ts win block ~1585-1640).
6. **`waveParams(wave, gmDif = 0)`** — gmDif is OPTIONAL, default 0, so every existing
   `waveParams(wave)` call keeps its exact wave-1-baseline meaning (difficulty.test.ts /
   tie-wave-ramp.test.ts stay green). fireIndex = `wvHrd(wave, gmDif)`.
7. **ADCGAS refill** at the port-kill win (sim.ts ~1594): AFTER the SCRSHL shield-score
   bonus is computed on pre-refill `lives`, add `BONUS_SHIELDS_DIP` to `lives`, clamp to
   `STARTING_LIVES`, thread the refilled `lives` through `clearRun`.
8. **AC6 (Dev/tech-writer)**: append the two MAME corroborations (timebase CLOCK_3KHZ/12 =
   246.094 Hz; starting shields ANDA #03 / ADDA #06 = 6) to
   `docs/2026-07-15-star-wars-primary-source-audit.md` confirmed findings, with starwars.cpp cites.

Note: the per-phase index micro-differences (ground DECA = GM.WAV−1; trench-repeat +GM.BMP,
WSMAIN.MAC:1810-1823) are recorded in the story context but OUT OF SCOPE — AC2 codifies the
space formula only. Do not port them here.

## Tea Assessment

**RED phase complete. 27 failing tests across 4 files pin all six ACs; lint clean; the
full star-wars suite is otherwise green (2314 pass), citation gates included.**

**AC1 (refute-first gate) — DISCHARGED.** I re-derived the GM.DIF/GM.BMP schedule from
WSMAIN.MAC:1995-2021 read directly, not from the story prose. Both flagged claims survive:
(a) the bump gate `CMPA #6-1 / IFLO` reads the JUST-INCREMENTED GM.WAV (the `STA GM.WAV`
precedes it) — it keys on the current/new wave, not a stored starting wave, so gmBmp is true
history-dependent state; (b) `GM.DIF += GM.BMP` sits OUTSIDE the bump gate — it runs every
transition, confirmed. The surviving DIP=0 oracle (gmDif 0,1,3,6,10,14,15,15; WV.HRD
0,2,5,9,14,15,15,15 — saturates wave 6 vs the clone's wave 16) is recorded in
`sprint/context/context-story-sw8-30.md` and is AC2's test oracle.

**AC3 (ruling) — RESOLVED by the user:** DIP=0 (Easy), `DIFFICULTY_DIP = 0`. Both columns
were shown; the DIP=2 column is recorded for the ledger.

**Files & coverage:**
- `tests/core/difficulty-accumulator.test.ts` (16 RED) — DIFFICULTY_DIP=0; accumulator init;
  wvHrd formula + wave/gmDif clamps; the full oracle table via the pure recurrence; claim (a)/(b)
  regression seats; **AC5(a) mutation seat** (wave 5 index 14 ≠ the deleted-accumulator fallback 4).
- `tests/core/difficulty-index-consumption.test.ts` (3 RED + 2 green baseline guards) — waveParams
  consumes gmDif (index 4→14 at wave 5); base guns read the same accumulator (statistical, wave-3
  gmDif-3 fires more than gmDif-0, reusing the trench/flyGuns harness); wave-1 baseline preserved.
- `tests/core/death-star-shield-refill.test.ts` (4 RED + 2 green guards) — BONUS_SHIELDS_DIP=1;
  refill +1 capped at STARTING_LIVES; SCRSHL scored on pre-refill shields (order); no-kill = no heal
  (guard); **AC5(b) mutation seat** (post-kill = pre-kill+1, ≠ pre-kill).
- `tests/audit/sw8-30-mame-corroboration.test.ts` (3 RED) — AC6 audit-ledger guard (starwars.cpp
  cite, CLOCK_3KHZ timebase, starting-shields corroboration).

**Rule Coverage (lang-review / project rules):**
- **Sacred core boundary** — every accumulator test is pure (no DOM/time/randomness beyond the
  seeded RNG); wvHrd/advanceDifficulty are pure functions asserted deep-equal-per-input.
- **Named constants, not magic numbers** — DIFFICULTY_DIP and BONUS_SHIELDS_DIP are each pinned as
  ONE named constant with a mandated ROM/MAME cite (AC3/AC4), not folded into a formula.
- **Mutation-proven (epic convention)** — both behaviors carry a seat that reddens under the
  verbatim-recorded mutation (delete accumulator → min(wave-1,15); delete ADCGAS → no refill).
- **Citation fidelity** — all new comment citations pass `check-comment-citations` (0 stale); one
  init verbatim was re-anchored to WSMAIN.MAC:1304 to satisfy the adjacency resolver.
- **Backward compatibility** — waveParams gains an OPTIONAL gmDif so no existing call site changes
  meaning; guarded by `waveParams(w) === waveParams(w, 0)`.

**Two green guards per file are intentional** (refill cap, no-heal-off-kill-path, waveParams
default-arg, wave-1 baseline) — correctness guards that must stay green through GREEN, not
RED-drivers. Handing off to Dev for the green phase.

## Dev Assessment

**GREEN. All 2341 star-wars tests pass (209 files), 392 orchestrator tests pass, lint
clean, 0 stale citations. Committed straight to `main` (trunk-based).**

**Implementation (minimal, matches the TEA contract exactly):**
- `state.ts` — added `DIFFICULTY_DIP = 0` and `BONUS_SHIELDS_DIP = 1` (each one named
  constant with ROM + MAME cites); added `gmDif`/`gmBmp` to GameState; `initialState`
  seeds them `(0, 0)`.
- `gameRules.ts` — added pure `wvHrd(wave, gmDif)` (the single WV.HRD index) and
  `advanceDifficulty({gmDif, gmBmp}, newWave)` (the WSMAIN.MAC:1995-2021 recurrence:
  bump gate on the post-increment GM.WAV, then unconditional `gmDif += gmBmp`);
  `waveParams(wave, gmDif = 0)` now indexes through `wvHrd`; the stale "DIP = 0" prose is
  rewritten to name the accumulator.
- `sim.ts` — space fire path reads `state.gmDif`; the trench base guns index through the
  SAME `wvHrd` (one accumulator, AC2); at the port-kill win, `advanceDifficulty` steps the
  accumulator for the next wave and ADCGAS refills `min(lives + BONUS_SHIELDS_DIP,
  STARTING_LIVES)` — placed AFTER the SCRSHL shield-score bonus (scored on pre-refill
  shields) and threaded through `clearRun`.
- audit doc — appended the two MAME corroborations (timebase CLOCK_3KHZ/12 = 246.094 Hz;
  starting shields ANDA #03 / ADDA #06 = 6) with starwars.cpp cites (AC6).

**Behavior delivered:** a wave-1 Easy run now ramps WV.HRD 0→2→5→9→14→15 across the first
six Death Stars (was 0→1→2→3→4→5), and each Death-Star kill heals one shield (capped at 6).
The clone no longer plays soft through the mid-game.

**Blast radius handled (see Dev deviation):** my inserts shifted line numbers, drifting 13
comment citations + 3 exact-line audit fixtures + coaching.ts's death-guard cite — all
re-anchored to true new lines and re-verified (checker: 0 stale; sw8-27 green). Handing off
to the Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates green) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer) |
| 5 | reviewer-comment-analyzer | Yes | clean | none (all citations verified vs ROM) | confirmed 0, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (domain assessed by Reviewer) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 7 (Rule#1 casts) + 1 (Rule#2 readonly) | confirmed 8 as LOW/non-blocking, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 8 confirmed (all LOW/non-blocking), 0 dismissed, 0 deferred

### Rule Compliance (TypeScript lang-review + CLAUDE.md)

Enumerated every changed symbol against every applicable rule:
- **Purity boundary (CLAUDE.md hard rule)** — `gameRules.wvHrd`, `gameRules.advanceDifficulty`,
  the `sim.ts` refill, and the `state.ts` fields: NO DOM/window/Date.now/Math.random/rAF; both
  new functions are pure functions of their args. COMPLIANT (verified by [SEC] + [RULE] + my grep).
- **Rule #4 `|| vs ??` on zero-able values** — the crux of this story (gmDif=0/gmBmp=0 are VALID).
  `sim.ts:408/1469` read `state.gmDif` DIRECTLY (not `state.gmDif || 0`); `waveParams(wave, gmDif = 0)`
  uses a PARAMETER DEFAULT (fires only on omission, not on explicit 0). COMPLIANT — the one place a
  bug could hide is clean. [RULE] confirmed, I re-verified `gameRules.ts:327` + `sim.ts:408`.
- **Rule #1 `as unknown as`** — 7 instances in the new test files. VIOLATION per the mechanical rule,
  but they are the codebase's ESTABLISHED idiom for tests derived from a RED phase (`difficulty.test.ts`,
  `tie-wave-ramp.test.ts` carry the identical cast post-feature; 55 test files use it). Downgraded to
  LOW/non-blocking follow-up (see Delivery Findings), not dismissed.
- **Named constants + ROM cites** — `DIFFICULTY_DIP`/`BONUS_SHIELDS_DIP`/`wvHrd`/`advanceDifficulty`
  each carry a WSMAIN.MAC/WSGAS.MAC file:line cite. COMPLIANT. [DOC] verified every cite vs the ROM.
- **Rule #2 readonly** — `advanceDifficulty`'s `prev` param is mutable-typed but never mutated. LOW.

### Devil's Advocate

Assume this is broken. First attack: the accumulator is `0` at game start, and `0` is exactly the
value a `||`-default or a falsy-guard would silently clobber — one `state.gmDif || 0` or
`gmDif ?? DIFFICULTY_DIP` written carelessly would make wave 1 identical to a fresh accumulator and
mask any bug. I checked the two consumer sites and the default-arg: all read `0` faithfully, and the
`waveParams` default only applies on argument omission — so a caller passing an explicit `0` and one
omitting it agree, which is correct. Second attack: the win block refills a shield with NO `lives > 0`
or `mode` guard, so a player killed by a trench wall gun on the SAME frame the torpedo detonates would
be "revived" to 1 shield. I traced it: `afterObstacles` sets `mode: 'gameover'` when the gun zeroes
lives, and `enterPhase`/`clearRun` preserve `mode`, so the returned state is game-over regardless — the
refill to 1 is inert (the game is over; the HUD-shield delta is cosmetic on a game-over screen). This
path pre-existed sw8-30 (the shield-bonus already scored on `afterObstacles.lives`); my change did not
introduce it and does not make it observable. Third attack: unbounded growth — `gmDif` past 15, `gmBmp`
past 4, `wvHrd` indexing past array length 16. All three clamp (`Math.min(..,15)`, `Math.min(..,4)`,
`min(gmWav+gmDif,15)`), verified by [SEC]. Fourth: does a SELECT-A-LEVEL start (MEDIUM=wave 3) wrongly
inherit a climbed gmDif? `beginRun` rebuilds from `initialState` (gmDif=0) then overrides only `wave`,
so a wave-3 start plays index 2 and climbs from there — matching the ROM's boot-once init, and a
fidelity WIN over a wave-derived index. Fifth: the ROM clamps GM.WAV at 98; the port doesn't. Immaterial
— `wvHrd` clamps the wave contribution at 31 and the index at 15, so the missing 98-clamp changes no
observable output. Nothing in these attacks rises above LOW.

## Reviewer Assessment

**Verdict:** APPROVED

**Findings (all LOW / non-blocking — no Critical/High, no blockers):**
| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] [RULE] | 7 `as unknown as` casts now-unnecessary post-GREEN | 4 sw8-30 test files | Established codebase idiom; swap for direct imports on a future touch |
| [LOW] [RULE] | `advanceDifficulty` `prev` not `readonly`-typed | gameRules.ts:311 | Never mutated; defensive-typing nit |
| [LOW] [EDGE] | Refill has no `lives>0` guard | sim.ts:1642 | Inert — `mode:'gameover'` is preserved through `clearRun`; pre-existing path |
| [LOW] [DOC] | "climbs it differently" clause could momentarily misread | state.ts:1005 | Technically correct; the seed is identical, the trajectory differs |

**Data flow traced:** difficulty DIP → `initialState` seeds `gmDif=0`/`gmBmp=0` → each port-kill win
calls `advanceDifficulty` → `state.gmDif` → `wvHrd(wave, gmDif)` → the fire index that BOTH the space
TIEs (`waveParams`, sim.ts:408) and the trench base guns (sim.ts:1469) read. Exactly one accumulator,
as AC2 demands. Verified end-to-end.

**Pattern observed:** the `|| vs ??` zero-hazard was correctly avoided (`state.gmDif` read directly, and
`waveParams`'s parameter default fires only on omission) — the single place a subtle bug could hide is
clean (gameRules.ts:327, sim.ts:408).

**Error handling / edge cases:** accumulator clamps (15/4/15) verified; win-on-death refill is inert
under the preserved game-over mode; SELECT-A-LEVEL start keeps a fresh gmDif (ROM-faithful).

**Verified good:**
- [VERIFIED] AC1 refutation is sound — reviewer-comment-analyzer independently re-derived the WSMAIN.MAC
  cites; the oracle (WV.HRD 0,2,5,9,14,15…) matches the ROM growth block.
- [VERIFIED] All six ACs covered by green tests incl. AC5 mutation seats; full suite 2341/2341, lint
  clean, orchestrator 392/392, citation gates green (preflight).
- [VERIFIED] All 13 re-anchored citations + coaching.ts death-guard cite point at the correct current
  lines (comment-analyzer, independent of the by-text matcher).
- [VERIFIED] [SEC] Security domain clean — the pure-core purity boundary is intact (no DOM/time/randomness
  in the changed core files) and the accumulator/refill arithmetic clamps at 15/4/`STARTING_LIVES` with no
  overflow or unbounded growth; no external input, secrets, or injection surface (reviewer-security).

**Handoff:** To SM for finish-story.

## Sm Assessment

Setup complete. Story sw8-30 (5pt, tdd) claimed: tree clean, local == origin/main, no competing branch or session found. Session file created, story marked in_progress, Branch = none (trunk-based). Routing to TEA for the red phase. TEA must honor the AC1 refute-first gate: adversarially re-derive the GM.DIF/GM.BMP schedule from WSMAIN.MAC before writing oracle-pinned tests, and surface the AC3 difficulty-DIP ruling to the user rather than deciding it.