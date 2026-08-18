---
story_id: "df5-8"
jira_key: "df5-8"
epic: "df5"
workflow: "tdd"
---
# Story df5-8: Wire the df5-2 wave director into sim.ts

## Story Details
- **ID:** df5-8
- **Jira Key:** df5-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Repository:** arcade
- **Branch:** feat/df5-8-wire-wave-director-into-sim
- **Branch Strategy:** gitflow

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T12:34:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T17:30:00Z | 2026-08-18T12:08:22Z | -19298s |
| red | 2026-08-18T12:08:22Z | 2026-08-18T12:15:26Z | 7m 4s |
| green | 2026-08-18T12:15:26Z | 2026-08-18T12:24:44Z | 9m 18s |
| review | 2026-08-18T12:24:44Z | 2026-08-18T12:34:34Z | 9m 50s |
| finish | 2026-08-18T12:34:34Z | - | - |

## Acceptance Criteria

**AC1:** The wave director (`createWaveDirector`) is called during `createSim(rand)` with the scheduler, getPopulation callback, and spawnWave callback as arguments; the director is stored on state so its wave counter is accessible to tests.

**AC2:** `getPopulation` returns the live lander population count via `enemyBank.landers.length`, so the director correctly detects population changes without stale snapshots.

**AC3:** `spawnWave` spawns each wave's attacker counts from `waveParams(wave)` by calling `enemyBank.spawnLander(x)` once per lander in the current wave (iterating through landers from the landers count); rejected spawns (null returns) are counted/tested.

**AC4:** A test advances the sim through a full wave-clear and confirms the next wave is spawned (wave counter increments, lander population > 0 after the clear), proving the director wires correctly to the scheduler and population changes trigger spawn logic.

**AC5:** `purity.test.ts` remains green — the wiring introduces no clock reads, entropy, or shell calls into sim.ts; the director's only injected dependency is the callback pair and the scheduler (pure, seeded inputs).

## Delivery Findings

### GREEN (Korben / Dev) — commit `b7f19e9`

**Implementation:** `plugins/defender/src/core/sim.ts` — 4 surgical edits. `createSim` now mints
`createWaveDirector(sched, getPopulation, spawnWave)` over the already-existing `sched` +
`enemyBank` (no re-minting). `getPopulation = () => enemyBank.landers.filter(l => l.alive).length`;
`spawnWave = (_wave, params) => spawn params.counts.landers landers via enemyBank.spawnLander(x)`,
with x spread evenly across the 16-bit world cylinder (`Math.floor((i/n) * 0x10000)`) — deterministic,
pure (no `Math.random`, no clock). `wave` is a new public SimState view field (refreshed each tick
from `_waveDirector.wave`, like `landers`); `_waveDirector` is carried by reference like `_enemyBank`.

**Verification:** full vitest **17346 passed** (1157 files); orchestrator **505/505**; `npm run lint`
(tsc --noEmit) clean; `purity.test.ts` green (AC5).

**Finding 1 — RED test encoded a false premise about `killLander` (corrected, contract intact).**
The df5-8 RED suite (as written by TEA) asserted `killLander` "flags dead records in place; the array
is not spliced." It is the opposite: `landers.ts::killLander` calls `removeLander(rec)`, which SPLICES
the record out (landers.ts:281-300), so `_enemyBank.landers.length` drops to 0 on a kill. I corrected
the one incidental assertion (`landers.length` after clearing is now `0`, not the pre-kill count) and
the header/guard prose. **The real contract is unchanged and still enforced:** getPopulation reads the
live count, a populated field does not advance (test 2), and a cleared field advances to wave 2 with
the 15→20 WVTAB escalation (test 3). Because killLander splices, `landers.length` and the `.alive`
filter are equivalent here — so **derived AC2's "via `enemyBank.landers.length`" is actually correct**;
my earlier SM/TEA "correction" to alive-count was over-cautious (both are right). getPopulation keeps
the `.alive` filter as the most faithful reading of the story's "alive count" wording.

**Finding 2 — `df3-6-boot-shell.test.ts` "rest holds" was obsoleted by the feature (reconciled).**
That test asserted a resting sim draws a byte-identical frame across ticks. df5-8's whole point is that
**waves drive play** — the live sim now evolves at rest (wave 1 spawns and the field is live), so the
frozen "rest holds" assertion is false BY DESIGN. This is a "guard whose correct fate is to change."
I flipped it to `rest2 !== rest1` (a live loop advances the sim even without input; a frozen one-shot
would hold the frame — a *stronger* frozen-sim guard) and kept the thrust check. The wall-clock-drift
property "rest holds" also guarded is now covered by `purity.test.ts` (text-scan clock ban) + the
df5-8 same-seed determinism test. **Reviewer: please confirm this reframing is acceptable** — it is the
only pre-existing test the feature legitimately changes.

**Scope note:** `spawnWave` spawns LANDERS only — the enemy bank exposes no ties/probes/schitzos/
swarmers spawn entry yet, and the story title routes all counts through `spawnLander`. Lander x-placement
(even spread across the cylinder) is a wiring choice, not a cited ROM algorithm; if ROM-exact spawn
distribution is wanted, that is a follow-up beyond this seam.

## Design Deviations

None recorded.

## Reviewer Assessment

**Verdict:** APPROVED

No Critical, no High. Two minor findings, both fixed in-review and
re-verified (commit `6ac79f6`). Enabled subagents: preflight, security, rule-checker; the
other six are disabled in `workflow.reviewer_subagents`, so those dimensions were covered by
hand and tagged as explicit dismissals below.

**Reviewed:** the df5-8 branch diff (develop...HEAD) — `sim.ts` wave-director wiring, the new
`df5-8-sim-wave-wiring.test.ts` (4 tests), and the `df3-6-boot-shell.test.ts` reframe.
**Independent verification:** defender project **642/642** green; `purity.test.ts` **39/39**
(AC5); `tsc --noEmit` clean; determinism test green.

### Findings & specialist tags

**Finding 1 [Medium → FIXED] — epic context clobbered.** The SM claim commit `2fa6e680`
regenerated `context-epic-df5.md` through `sm-setup`, replacing 32 lines of curated epic
guidance (build order df5-1..df5-7, rulings A–D, the cross-story guardrails "every df5 story
carries", the jt9 shared-surface note) with a placeholder stub — the documented `sm-setup`
regeneration hazard. **Restored from `develop`; net branch diff for that file is now zero.**

**Finding 2 [Low → FIXED] — `[RULE]` non-null assertion (lang-review #1).** The `loadSim`
loader used `mod.createSim!(makeRand(0))` — a non-null assertion on a `Partial<SimModule>`
field whose runtime safety TS cannot connect to the `missing.length` guard above it, deviating
from the df4-3 pattern the suite claims to mirror. **Fixed:** single whole-module cast after
the guard (`const mod = partial as SimModule`); redundant trailing `as SimModule` dropped.
Confirmed by the rule-checker (high confidence); I concur — it matches a stated rule, so not
dismissed.

- `[SEC]` — reviewer-security returned CLEAN. Confirmed by hand: the spawn `for` loop is
  bounded by the fixed WVTAB counts (15/20) and fails closed (loop never runs) even on a
  hypothetical NaN/Infinity count; no `eval`/`Function`/dynamic-key writes; no ambient entropy.
- `[RULE]` — reviewer-rule-checker: 1 finding (Finding 2 above), FIXED. All other 14 rules
  clean (see Rule Compliance).
- `[EDGE]` — disabled in config; covered by hand. Path enumeration: fresh sim (wave 0, 0
  landers) → tick 1 (director ptime 1→0 dispatches, pop 0 → wave 1, 15 spawned) → populated
  ticks (no advance) → cleared field (wave 2, 20). `n=0` division-by-zero is unreachable (loop
  guard). No boundary defect.
- `[SILENT]` — disabled; covered by hand. `spawnLander`'s `Lander | null` return is
  intentionally unused (the wiring spawns; it need not track the handle); no swallowed error,
  no empty catch, no silent fallback introduced.
- `[TEST]` — disabled; covered by hand. All 4 new tests carry meaningful, non-vacuous
  assertions; expected counts come from `waveParams` (not magic numbers); the flipped
  boot-shell assertion has an accurate message and still catches a frozen loop.
- `[DOC]` — disabled; covered by hand (this project keeps comment_analyzer off, per jt8-6). The
  RED-test header and boot-shell comment were corrected to match reality (killLander splices;
  waves evolve the sim at rest); no stale/misleading comment remains in the diff.
- `[TYPE]` — disabled; covered by hand. New fields `wave: number` and `_waveDirector:
  WaveDirector` are `readonly`, specifically typed; the `spawnWave`/`getPopulation` callbacks
  carry concrete signatures (no `Function`/`object`); `.js` + `import type` discipline intact.
- `[SIMPLE]` — disabled; covered by hand. Wiring is 4 minimal edits; no dead code, no
  over-engineering; `withBanks` spread already carries the two new fields (no extra plumbing).

**Adversarial checks (no regression hiding behind the flagged findings):**
- *Design:* auto-spawning in `createSim` disturbs no title/attract screen — `main.ts` boots
  straight into a live `createSim`+`stepSim` loop; there is no attract state.
- *killLander:* genuinely SPLICES (`removeLander`, landers.ts:300) — the RED test's "flags in
  place" premise was factually wrong; the correction preserved the real contract.
- *boot-shell reframe:* deterministic and robust — targetless landers descend every tick
  (`approach(rec.y, YMAX)`, landers.ts:242), so the resting frame genuinely evolves; a frozen
  one-shot still fails the flipped assertion.
- *Scope forward-note (non-blocking):* `getPopulation` counts alive landers ≡ `landers.length`
  today (killLander splices). Once humanoids/df4-4 mutants land, a "reached-top" lander stays
  alive in the array — a later story must revisit "population empty." Out of df5-8's scope.
- *Not from this branch:* the orchestrator's 1 failure (`typescript-gate-range-consistency`)
  is from the user's `pf init` refreshing `.pennyfarthing/gates/lang-review/typescript.md` in
  the working tree — NOT in the df5-8 diff, invisible to CI's clean `npm ci` checkout.

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (14 checks) + CLAUDE.md purity
(#core) & determinism (#det). Rule-checker enumerated 29 instances across the diff; my
per-rule verdict:

- **#1 Type-safety escapes** — 3 instances. 1 violation (`mod.createSim!`, Finding 2) → FIXED.
  Remaining casts (`as Partial<SimModule>`, whole-module `as SimModule` after guard) compatible
  with #1 (single guarded casts, df4-3 precedent).
- **#2 Generic/interface pitfalls** — 6 instances, 0 violations. New fields `readonly`;
  callbacks specifically typed; `params: WaveParams` all-readonly, not mutated. Compatible.
- **#4 Null/undefined handling** — 3 instances, 0 violations. No `||`-vs-`??` trap; `n===0`
  division unreachable. Compatible.
- **#5 Module/declaration** — 4 instances, 0 violations. `.js` extensions present; `type
  WaveDirector` marked type-only, `createWaveDirector` value-imported. Compatible.
- **#7 Async/Promise** — 3 instances, 0 violations. `loadSim` returns real data, awaited.
- **#8 Test quality** — 4 instances, 0 violations. No `as any`; structural-subset interfaces
  per df4-3; deterministic LCG; flipped assertion non-tautological. Compatible.
- **#11 Error handling** — 1 instance, 0 violations. Descriptive throw, no discard.
- **#3/#6/#9/#10/#12/#13** — 0 applicable instances (no enums, JSX, config, input boundary,
  perf hot-path, or prior-fix meta in this diff).
- **#core Purity** — 3 instances, 0 violations. No `Date`/`performance.now`/`Math.random` in
  `src/core`; x-placement is a pure function of loop index; `purity.test.ts` green.
- **#det Determinism** — 2 instances, 0 violations. Same-seed determinism test green; no
  ambient entropy leaked into the wiring.

## Subagent Results

| Specialist | Received | Status | Findings | Decision |
|------------|----------|--------|----------|----------|
| reviewer-preflight | Yes | complete | 0 blocking (1 pre-existing orch fail from `pf init`, not this branch) | N/A |
| reviewer-edge-hunter | Disabled | config-off (`workflow.reviewer_subagents`) | covered by hand — no defect | N/A |
| reviewer-silent-failure-hunter | Disabled | config-off | covered by hand — no defect | N/A |
| reviewer-test-analyzer | Disabled | config-off | covered by hand — no defect | N/A |
| reviewer-comment-analyzer | Disabled | config-off | covered by hand — no defect | N/A |
| reviewer-type-design | Disabled | config-off | covered by hand — no defect | N/A |
| reviewer-security | Yes | clean | 0 | N/A |
| reviewer-simplifier | Disabled | config-off | covered by hand — no defect | N/A |
| reviewer-rule-checker | Yes | findings | 1 (Low, #1 non-null assertion) | confirmed 1, FIXED |

All received: Yes (3 enabled subagents returned; 6 disabled by project config, covered by hand).

## Tea Assessment

**RED landed: 4/4 failing for the right reason** — every test throws the ABSENT-FEATURE
`wave` guard (`sim.ts` exposes no numeric `wave` on SimState; the df5-2 director is unwired).
`npx vitest run --project defender` on the new file → 4 failed / 4. `npm run lint` (tsc
--noEmit) green — the test typechecks via the df4-3 variable-specifier loader pattern.

**Test file:** `plugins/defender/tests/df5-8-sim-wave-wiring.test.ts` (commit `6cab93a`).
Loads `sim.ts` through a variable module specifier + observable-subset interface (so tsc
never binds it to the concrete SimState), and statically imports `waveParams` from
`waves.js` so the expected counts come from the real WVTAB, not hardcoded magic numbers.

**The observable contract GREEN must satisfy (all derived from the verified tree):**
1. `createSim` calls `createWaveDirector(sched, getPopulation, spawnWave)` over the
   already-minted `sched` + `enemyBank`, and surfaces the director's `wave` counter on
   SimState as `wave` (0 on a fresh sim, refreshed each tick like `landers`).
2. First `stepSim` tick → `wave === 1` and `landers` alive-count `=== waveParams(1).counts.landers`
   (15). The scheduler dispatches a fresh process on its first `stepTick` (ptime 1→0), so
   the first cleared-field tick spawns wave 1 — matches the ROM's "GETWV on a cleared field."
3. `getPopulation` reads the **LIVE** count — `_enemyBank.landers.filter(l => l.alive).length`,
   NOT `landers.length`. Proven two ways: (test 2) a populated field must not advance the
   wave; (test 3) `killLander` flags dead-in-place without splicing, so array length stays
   15 while the alive count drops to 0 and the director advances to wave 2 (20 landers).
4. Determinism: two same-seed sims must spawn identical wave/count/x-columns — the x-selection
   is pure (no clock, no `Math.random`).

**Scope note for Dev:** the enemy bank's only attacker-spawn entry is `spawnLander(x)`, so
`spawnWave` spawns LANDERS only (ties/probes/schitzos/swarmers have no spawn API yet). The
title's `(NEWP,STYPE)` is a ROM gesture. WVTAB lander escalation is 15→20→20→20 (clamped
at W4). Keep it PURE — `purity.test.ts` (text-scan) is the AC5 guard and must stay green.

## Rule Coverage

- **core-boundary / purity (the project's #1 rule):** test 4 (determinism) is the behavioral
  complement to `purity.test.ts` — it catches ambient entropy in the wave director's
  x-selection that a text-scan could miss. AC5 also guarded by the existing `purity.test.ts`.
- **TS lang-review #4 (null/live-count):** the getPopulation-reads-`.alive` contract (tests
  2 & 3) enforces that the wiring counts live records, not raw array length — the exact
  `0`-is-a-real-value trap the checklist flags. `spawnLander` returns `Lander | null`; the
  wiring must tolerate a null (non-finite x) return — noted for Dev, no null is forced through
  the public sim since Dev owns the x-selection.
- **TS lang-review #5 (.js ESM specifiers) & #8 (test quality):** all relative imports carry
  `.js`; every test has a meaningful, non-vacuous assertion (no `let _ =`, no `assert(true)`,
  no `as any`); expected counts sourced from `waveParams`, not magic numbers.

## Sm Assessment

**Premise verified against the current tree before setup — the description is accurate, no stale claims.**

- `plugins/defender/src/core/waves.ts` (df5-2) exists and is CONFIRMED pure and unwired: no reference to `waves` in `sim.ts`. Exported director signature is `createWaveDirector(sched, getPopulation: () => number, spawnWave: (wave, params: WaveParams) => void)`.
- `sim.ts` ALREADY mints `createScheduler()` (`sched`) and `createEnemyBank(sched, rand)` (`enemyBank`, stored as `_enemyBank`). df5-8 adds the `createWaveDirector` call OVER these — it must not re-mint them.
- Live population source is the `enemyBank.landers` getter (`readonly Lander[]`, landers.ts). Spawn API is `enemyBank.spawnLander(x: number): Lander | null` (returns null when the bank is full). The description's `(NEWP,STYPE)` is a ROM-source gesture, not the TS signature — ACs are written against `spawnLander(x)`.
- Per-wave WVTAB counts come from the already-exported `waveParams(wave)`.

**Sibling probe: clean.** No `df5-8` branch existed before this claim; the only live sessions across checkouts are joust stories (a-1 jt13-7, a-3 jt13-9). `develop` in sync with `origin/develop` at setup.

**ACs derived** (story `acceptance_criteria` was null) and grounded in the facts above; five ACs cover wiring, live getPopulation, per-wave spawnLander iteration, wave-clear→next-wave integration, and purity. Claim committed + branch pushed.

**Routing:** phased tdd → RED (tea). Purity boundary is enforced by a src/core/ text-scan test; the wiring must stay clock-free and entropy-free.