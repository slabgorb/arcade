---
story_id: "df5-2"
jira_key: "df5-2"
epic: "df5"
workflow: "tdd"
---
# Story df5-2: Wave director + escalation

## Story Details
- **ID:** df5-2
- **Jira Key:** df5-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T11:45:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T11:13:49Z | 2026-08-18T11:17:03Z | 3m 14s |
| red | 2026-08-18T11:17:03Z | 2026-08-18T11:29:07Z | 12m 4s |
| green | 2026-08-18T11:29:07Z | 2026-08-18T11:35:44Z | 6m 37s |
| review | 2026-08-18T11:35:44Z | 2026-08-18T11:45:32Z | 9m 48s |
| finish | 2026-08-18T11:45:32Z | - | - |

## Background

The wave director is a core game-structure element for Defender, porting the ROM's WVTAB wave-data table and the "new guys every Nth wave" escalation cadence. This story creates plugins/defender/src/core/waves.ts, which models:

- **WVTAB wave table** (defender/BLK71.SRC:673, :676–689): per-wave attacker count (WAVE SIZE :689) and duration (WAVE TIME :687), with pointer FDB at :89
- **Escalation cadence** (GTWV00, defender/DEFA7.SRC:1859): attacker count increases at a ROM-specified wave interval by a ROM-specified delta

The wave director is a df3 scheduler process (no independent tick/rAF); it advances when the enemy population reaches zero and spawns new attackers via the df3 scheduler (NEWP, STYPE). Every constant is gated by a claims/*.json entry under the df1-1 gate.

## Acceptance Criteria
1. **AC1:** plugins/defender/src/core/waves.ts exists (PURE) modelling the WVTAB wave table (defender/BLK71.SRC:676–689 — attackers, WAVE SIZE :689, WAVE TIME :687); each wave constant gated by a claims/*.json entry verified byte-for-byte under the df1-1 gate.
2. **AC2:** The "new guys every Nth wave" escalation (GTWV00, defender/DEFA7.SRC:1859) is ported and cited — a test pins that attacker count increases at the ROM-specified wave cadence, by the ROM value, not an invented ramp.
3. **AC3:** Wave-clear → advance is driven by the ENEMY POPULATION reaching empty (not a wall-clock timer); attackers are spawned via the df3 scheduler (NEWP, STYPE), the wave director owning no rAF/tick of its own.
4. **AC4:** citations.test.ts covers every wave constant; a mutation to a WVTAB size/time or the escalation cadence reddens a value assertion (not merely a coverage/presence check — the vacuous-guard trap).

## Dependencies
- df3 scheduler (`plugins/defender/src/core/scheduler.ts`)
- df4 enemy reducers (`landers.ts`, `mutants.ts`, `swarmers.ts`, `ties.ts`, `probes.ts`, `ufo.ts`)
- df4 collision & effects (`collision.ts`, `effects.ts`)
- Predecessor df5-1 (scanner core) — approved

## Design Notes
**Repos:** arcade
**Branch:** feat/df5-2-wave-director-escalation
**Branch Strategy:** gitflow (feat/df5-2-wave-director-escalation)

## Sm Assessment

Setup for df5-2 (5pt, defender, TDD). The phase pointer read `setup` on arrival; state was `NEW_WORK_STATE`.

**Sibling probes (both run before setup, both clean):** `git fetch --prune` + `git branch -r | grep -Ei df5-2` returned no branch; the cross-checkout session sweep showed only ml13-3 (a-1) and mc12-5 (a-3) — neither ours. df5-2 was unclaimed.

**Dependency verification (the story's own claim, "Consumes df3 scheduler + df4 enemy reducers"):** confirmed present in the tree — `scheduler.ts` (df3), plus enemy reducers `landers/mutants/swarmers/ties/probes/ufo.ts` and `collision.ts`/`effects.ts` (df4). Predecessor df5-1 (scanner) is done+approved. Target `plugins/defender/src/core/waves.ts` does NOT exist — this story creates it.

**Falsifiable-claim check:** the description's ROM references (WVTAB defender/BLK71.SRC:673,676–689,687,689; FDB WVTAB :89; GTWV00 defender/DEFA7.SRC:1859) are stable source line-cites, not stale-state measurements — carried forward as-is. No parked banner, no either/or AC, no user ruling required (ROM-always-wins governs; ACs are unambiguous).

**Setup artifacts (verified mechanically):** session file carries all three fields (Workflow/Phase/Repos); phase pointer count == 1; branch `feat/df5-2-wave-director-escalation` descends from `develop` (gitflow); four ACs copied verbatim from epic-df5.yaml; story stamped `in_progress` (sm-setup left it at `backlog`, stamped by SM); claim commit `1bf6b33d` pushed on the feature branch.

**Handoff:** TEA (Leeloo) owns the RED phase — write failing tests pinning the WVTAB table values, the GTWV00 escalation cadence, and population-driven wave-clear, with citations under the df1-1 gate.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New pure core reducer (`waves.ts`) with ROM-pinned constants and behavioral wave-advance logic — the archetypal TDD story.

**Test Files:**
- `plugins/defender/tests/df5-2-waves.test.ts` — the failing RED suite (18 tests across the 4 ACs).
- `plugins/defender/src/core/waves.ts` — an EMPTY seam stub (`export {}`) authored so the namespace import resolves and cases fail on assertions, not a collect crash (the df5-1 scanner precedent). GREEN fills it.

**Tests Written:** 18 tests covering 4 ACs.
**Status:** RED (verified by testing-runner: 18 failed, all assertion-level `undefined is not a function`, all inside `df5-2-waves.test.ts`; the file COLLECTED cleanly; 620 pre-existing defender tests stay green; `tsc --noEmit` clean).

**ROM ground truth pinned (hand-transcribed from tool output, independent of any exported constant):**
- WVTAB `BLK71.SRC:676-689` — 8-byte blocks `[MAX,MIN,INTRADELT,INTERDELT, W1,W2,W3,W4]`. Per-wave counts LANDERS 15/20/20/20, TIES 0/3/4/5, PROBES 0/1/3/4, SCHITZOS 0/0/0/0, SWARMERS 0/0/0/0; WAVE TIME 30/25/20/16; WAVE SIZE 5/5/5/5; MAX row 20/3/6/10/10. Column clamp to 4 (`GETWV1 CMPA #4 / ADDA #3`, `DEFA7.SRC:1867-1877`).
- GTWV00 escalation `DEFA7.SRC:1859` — cadence N from GA4 "RESTORE WAVE #", factory default `$05`=5 (`ROMC8.SRC:814`); increment `LDA #10` (`DEFA7.SRC:1862`); fires when `wave % 5 == 0` (traced with N=5 → waves 5,10,15…). A step function, not a per-wave ramp.

### Rule Coverage

| Rule / AC | Test(s) | Status |
|-----------|---------|--------|
| AC1 WVTAB table values | per-wave counts / LANDERS ramp / TIES+PROBES / SCHITZOS+SWARMERS zero / WAVE TIME / WAVE SIZE / MAX row / clamp-to-4 | failing (RED) |
| AC2 GTWV00 escalation | cadence N=5 + #10 / multiples-of-5 only / step-not-ramp | failing (RED) |
| AC3 population-driven advance via scheduler | scheduler-process + no eager spawn / wave-1 on first tick / holds while enemies remain / advances on empty / no progress without tick | failing (RED) |
| AC4 vacuous-guard | WVTAB byte mutation reddens value assertion / cadence+increment mutation reddens | failing (RED) |
| lang-review: no vacuous assertions | every case uses exact `.toBe`/`.toEqual` on ROM values (no `toBeDefined`/`.length` stand-ins) | self-checked ✓ |
| purity (core clock-free) | auto-arms over `waves.ts` via `tests/purity.test.ts` — no separate test authored (df5-1 precedent) | deferred to GREEN |

**Rules checked:** vacuous-assertion self-check passed; purity delegated to the existing auto-arming sweep.
**Self-check:** 0 vacuous tests (all assertions are exact ROM-value equalities; ground truth is a hand-transcribed table, not a mirror of the implementation's own constants).

**Handoff:** To Dev (Korben) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/waves.ts` — the pure wave director: `waveParams(wave)` (WVTAB lookup, column clamped to 4 per GETWV1), `ENEMY_MAX` (the MAX row), `newGuys(wave)`/`NEW_GUYS_EVERY_NTH_WAVE=5`/`NEW_GUYS_COUNT=10` (GTWV00 escalation), and `createWaveDirector(sched, getPopulation, spawnWave)` — a df3 scheduler process, population-driven, no own tick, no eager spawn.
- `plugins/defender/docs/rom-study/claims/16-waves.json` — 20 byte-verified claims covering every WVTAB constant (BLK71.SRC:676-689), the escalation (DEFA7.SRC:1859,1862), the wave clamp/offset (DEFA7.SRC:1867,1871) and the GA4 cadence default (ROMC8.SRC:814). Verbatims generated programmatically from the source lines, so the byte-for-byte gate is exact.

**Tests:** 18/18 df5-2 tests passing; full defender project 638/638 GREEN (verified by testing-runner). `brief-dossier.test.ts` byte-verifies the new claims against the vendored ROM; `purity.test.ts` confirms `waves.ts` is clock-free. `tsc --noEmit` clean.
**Branch:** feat/df5-2-wave-director-escalation (pushed — `ef15fb3d`).

**Scope note (intentional, matches the df5-1 scanner precedent):** `waves.ts` is a PURE core module. `createWaveDirector` takes injected `getPopulation`/`spawnWave` and is not yet wired into `sim.ts` — the live enemy-bank population + `spawnLander` wiring and the HUD are df7 (epic OUT OF SCOPE). Every df5-2 AC (WVTAB table, escalation, population-driven advance via the scheduler, citation gate) is satisfied by the pure module + claims.

**Handoff:** To Reviewer (Zorg) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 638/638, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings; edge cases assessed by Reviewer (NaN/non-integer — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; no error-handling paths exist in a total pure module ([SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings; test quality assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings; comment cites verified by Reviewer + rule-checker ([DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; type design assessed by Reviewer + rule-checker ([TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure, input-bounded, no I/O; traced scheduler loop, no within-tick hazard |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; minimality assessed by Reviewer + rule #34 ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (low + medium) | confirmed 2, both non-blocking (see [RULE]) |

**All received:** Yes (3 enabled subagents returned; 6 disabled pre-filled as Skipped)
**Total findings:** 2 confirmed (both non-blocking), 0 dismissed, 0 deferred-unaddressed (both recorded as non-blocking Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

df5-2 ports Defender's WVTAB wave table + GTWV00 escalation as a pure core reducer with a scheduler-driven wave director, byte-gated by 20 ROM citations. Three enabled specialists (preflight, security, rule-checker) plus my own adversarial pass found no Critical/High. The two findings are low/medium and unreachable/idiomatic; both recorded as non-blocking Delivery Findings.

**Observations (11):**
- [VERIFIED] Purity — `waves.ts` has no Date/Math.random/fetch/canvas/DOM; type-only `import type` from scheduler.js (waves.ts:15). `purity.test.ts` 39/39 green with waves.ts armed. Complies with the CLAUDE.md src/core purity rule. (Corroborated by [SEC] + [RULE #31].)
- [VERIFIED] ROM fidelity — every WVTAB constant (waves.ts:42-50) and the escalation values (84,86) match `BLK71.SRC:676-689`, `DEFA7.SRC:1862`, `ROMC8.SRC:814`; I confirmed rule-checker re-read the source directly (not just the gate). 20/20 claims byte-verified by `brief-dossier.test.ts`.
- [VERIFIED] Wave clamp — `columnIndex` (waves.ts:62-65) clamps to [1,4] matching GETWV1 (`CMPA #4`, DEFA7.SRC:1867-1871); `waveParams(5|12|99)` returns the W4 column (tested test.ts clamp case).
- [VERIFIED] Escalation is a ROM step function, not a ramp — `newGuys` (waves.ts:89-91) fires only on positive multiples of 5, value 10; guarded `wave > 0` avoids a spurious wave-0 award (matches PWAV≥1). Tested as `[0,0,0,0,10,0,0,0,0]`.
- [VERIFIED] Scheduler-process wave director — `createWaveDirector` (waves.ts:103-122) registers via `makeProcess` (no rAF/tick), advances only when `getPopulation()===0`, re-sleeps every tick; no eager spawn (first wave on first tick). Tested across 5 AC3 cases incl. a 30-tick population-hold and a no-tick-no-progress case.
- [SEC] Security specialist: **clean** — no I/O/eval/dynamic-import; traced `scheduler.stepTick` — a process body runs at most once per tick, `sleep` mutates only the current record, no within-tick loop/recursion even with a hostile injected callback. Worst case is `wave` incrementing 1/tick if population is permanently 0 (a caller-contract concern, driven by the shell frame loop, not attacker input).
- [RULE] (low) `df5-2-waves.test.ts:101` `wavesNS as unknown as WavesModule` — the `unknown` hop is inert now that GREEN landed (a single `as WavesModule` compiles). CONFIRMED but non-blocking: it is the repo's documented RED/GREEN seam idiom, identical to the approved df5-1 `scannerNS as unknown as ScannerModule`. Recorded as a non-blocking Improvement (possible fleet-wide cleanup), not churned here for consistency with precedent.
- [RULE][EDGE] (medium) `waves.ts:62` `columnIndex` does not guard `NaN`/non-integer `wave`; `waveParams(NaN)` yields `undefined` counts (out-of-bounds index). CONFIRMED but non-blocking: **unreachable** via the sole caller `createWaveDirector` (monotonic integer from 0), no AC/test requires a non-integer domain, and the ROM wave is a byte integer. Recorded as a non-blocking Improvement for a future caller (save-resume / debug jump-to-wave). Not fixed here — a speculative guard is beyond the ROM/spec and the minimalist bar.
- [TEST] Test quality (specialist disabled — assessed by Reviewer): non-vacuous. Ground truth (`ROM_COUNTS`/`ROM_WAVE_TIME`/`ROM_MAX`, test.ts:104-115) is independently hand-transcribed, not mirrored from the module; assertions are exact `.toEqual`/`.toBe`; AC3 drives a real `createScheduler()`; the 30-tick and no-tick cases distinguish population-driven from timer-driven. Rule-checker rules #15/#18/#26/#29 independently confirm no source-text/self-referential/ordering-stand-in vacuity.
- [DOC] Comment accuracy (specialist disabled — assessed by Reviewer): the design-rationale cite `DEFA7.SRC:1842-1843` ("BC2 JSR GETWV runs on a cleared field") is accurate — I read 1786-1845: `BC2`/`GETWV` is the end of the BONUS COLLECT PROCESS ("ATTACK WAVE N COMPLETED", :1793), reached when the field is cleared. Not a gated numeric claim, and it checked out (rule #17 concurs).
- [TYPE][SIMPLE] Type design & minimality (specialists disabled — assessed by Reviewer + rule-checker): all interfaces deeply `readonly`, `WVTAB`/`WAVE_TIME`/`WAVE_SIZE` are `as const`, no `any`, `.js` import extensions correct, `WaveDirector.wave` a read-only getter over a closure. Every export is consumed by the tests; no speculative surface (rule #34). `WAVE_DIRECTOR_PTYPE=0` correctly uncited (opaque scheduler tag, not ROM data).

**Data flow traced:** a wave number → `createWaveDirector.run` (population check) → `waveParams(wave)` (WVTAB lookup, clamped) → injected `spawnWave`. Safe: `wave` is a monotonic integer from 0, so the clamp always lands on a valid column; the director never advances while `getPopulation() > 0`.
**Pattern observed:** injected-dependency factory (`createWaveDirector(sched, getPopulation, spawnWave)`) mirroring `createScheduler`/`createEnemyBank` — keeps waves.ts pure and decoupled from landers.ts (waves.ts:103-107).
**Error handling:** total functions over their declared domains; no fallible ops, no swallowed errors ([SILENT] N/A). The one latent gap (non-integer `waveParams`) is unreachable and recorded.

### Devil's Advocate

Where could this be broken? First, the exported `waveParams`/`newGuys` accept any `number`, and `columnIndex` fails OPEN on `NaN`/fractions — a confused future caller resuming a save with a corrupted wave byte, or a debug "jump to wave 2.5", gets `undefined` counts that propagate to `NaN` downstream with no throw. Today unreachable (the director owns wave and increments integers from 0), but it is a real latent trap on a public surface — hence the recorded finding rather than silence. Second, the director will "run away" — advancing a wave every single tick — if a caller wires a `spawnWave` that fails to actually populate the field, because the advance gate is purely `getPopulation()===0`; the real wiring (`spawnLander`) populates, and this is documented as the injected-dependency contract, but a careless integration could loop escalation. Third, a malicious `getPopulation`/`spawnWave` could throw; the throw propagates synchronously out of `stepTick` (security traced this) — no state corruption, but a shell that ignores it would drop a frame. Fourth, escalation (`newGuys`) is a standalone pure function the director does NOT yet apply — AC2 only requires the ported+cited value, which is met, but a reader could assume the director already escalates spawn counts; the Dev Delivery-Finding flags this wiring decision. Fifth, `SCHITZOS`/`SWARMERS` are all-zero across waves 1-4 — a future reader could "fix" these to non-zero thinking they're a bug; the claims + tests pin them as ROM truth. None of these are reachable defects in this diff; all are either recorded findings or documented contracts. The code is correct for its stated scope.

### Rule Compliance

Full rule-by-rule against `.pennyfarthing/gates/lang-review/typescript.md` (checks 1-30) + 4 project rules (purity, ROM-citation, palette-index N/A, minimal) was run exhaustively by reviewer-rule-checker over 61 instances: **2 violations, both low/medium and non-blocking** (rule #1 double-cast; rule #21 columnIndex NaN gap — both detailed above). All other 32 rules compliant or N/A (no enums, async, error-handling, DOM, JSX, user-input, colour in this diff). I concur with the enumeration.

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): GREEN must add the `docs/rom-study/claims/*.json` entries the AC1/AC4 citation gate requires — each WVTAB constant against `BLK71.SRC:676-689`, the escalation against `DEFA7.SRC:1859,1862` and the cadence default against `ROMC8.SRC:814`. Affects `plugins/defender/docs/rom-study/claims/` + `plugins/defender/tests/audit/citations.test.ts` coverage. The RED suite pins the VALUES; the byte-offset citations are Dev's to author.
- **Gap** (non-blocking): the pure `createWaveDirector` contract takes injected `getPopulation: () => number` and `spawnWave` — GREEN wires it into `sim.ts` (which today "carries no enemies … the df5 wave logic drives it", `sim.ts:114`), sourcing population from the live enemy bank (`state._enemyBank.landers`, `.alive`) and spawning through `enemyBank.spawnLander(x)` (which itself `makeProcess`es — the NEWP/STYPE fidelity). Affects `plugins/defender/src/core/sim.ts` + `waves.ts`.
- **Question** (non-blocking): SCHITZOS and SWARMERS carry ZERO WVTAB spawns across waves 1-4 by design — they arrive via pods/mutant-transform (other df4/df5 mechanics), NOT the WVTAB count. The RED pins those 0s as ROM truth so a reader does not "fix" them; confirm no cross-wiring is expected here. Affects `plugins/defender/src/core/waves.ts`.

### Dev (implementation)
- **Gap** (non-blocking): `waves.ts` ships as a pure module; `createWaveDirector` is not yet wired into `sim.ts`'s tick loop with a real population source (`state._enemyBank.landers.filter(l => l.alive).length`) and a `spawnWave` that calls `enemyBank.spawnLander(x)`. Affects `plugins/defender/src/core/sim.ts` (a later integration/df7 story adds the call site). This is intentional scoping (the df5-1 scanner shipped pure the same way) — confirms TEA's Gap finding above.
- **Question** (non-blocking): the WVTAB per-wave counts are the STARTING attacker allotment per wave; whether `newGuys` (the +10 escalation) is added to that allotment or tracked separately as PTARG is a wiring decision left to the integration story. Affects `plugins/defender/src/core/waves.ts` + `sim.ts`. `waves.ts` exposes both pieces (`waveParams` and `newGuys`) so either wiring is possible without changing this module.
- No further upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): `columnIndex` (waves.ts:62) fails open on NaN/non-integer `wave` — `waveParams(NaN)` returns `undefined` counts. Affects `plugins/defender/src/core/waves.ts` (add an integer/NaN guard IF a caller that can produce a non-integer wave is added — save-resume, debug jump-to-wave). Unreachable via the current `createWaveDirector` integer counter; no fix required for df5-2. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the RED/GREEN seam cast `wavesNS as unknown as WavesModule` (df5-2-waves.test.ts:101) — the `unknown` hop is inert post-GREEN and could simplify to `as WavesModule`. Affects the df5-1/df5-2 test-seam idiom fleet-wide (df5-1 scanner uses the identical double-cast); a cleanup would be a cross-file chore, not a df5-2 change. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **`waves.ts` TypeScript contract shape is TEA-chosen**
  - Spec source: context-story-df5-2.md ("Technical Approach: _to be refined by TEA/Dev_"); design spec 2026-08-17-defender-df5-...-design.md (rules the ROM cites + "everything is a scheduler process", but rules NO TS signature).
  - Spec text: no interface is prescribed for `waves.ts`.
  - Implementation: RED pins `waveParams(wave) → {counts, waveTime, waveSize}`, `ENEMY_MAX`, `NEW_GUYS_EVERY_NTH_WAVE`/`NEW_GUYS_COUNT`/`newGuys(wave)`, and `createWaveDirector(sched, getPopulation, spawnWave)` with injected dependencies.
  - Rationale: keeps `waves.ts` PURE and decoupled from `landers.ts` (population + spawn injected, not imported), mirroring the codebase factory idiom (`createScheduler`, `createEnemyBank(sched, rand)`); lets the director be scheduler-driven and clock-free.
  - Severity: minor
  - Forward impact: the ROM VALUES are fixed and non-negotiable; the API SHAPE is. If GREEN adopts a cleaner signature, update `df5-2-waves.test.ts` in the same commit — do not weaken a value assertion to fit an API change.

- **AC3 tested through injected `getPopulation`/`spawnWave` rather than a live `sim.ts` integration**
  - Spec source: context-story-df5-2.md, AC3 ("wave-clear → advance driven by ENEMY POPULATION reaching empty; attackers spawned via the df3 scheduler").
  - Spec text: advance is population-driven, spawn via scheduler, director owns no rAF/tick.
  - Implementation: the RED drives a real `createScheduler()` and a test-controlled population/spawn pair — it pins the BEHAVIOR (no eager spawn, holds while enemies remain across 30 ticks, advances the instant population hits 0, no progress without `stepTick`) without coupling to the concrete `sim.ts`/enemy-bank wiring.
  - Rationale: a pure unit contract fails deterministically in RED and is not entangled with df3-6's live-sim suite; the integration into `sim.ts` is logged as a Delivery Finding for GREEN.
  - Severity: minor
  - Forward impact: GREEN owns the `sim.ts` wiring; a later integration/visual-playtest story (df5-6/df7) should confirm the director actually reads the live enemy bank.

### Dev (implementation)

- **WVTAB stored as MAX + the four W columns, dropping MIN/INTRADELT/INTERDELT**
  - Spec source: context-story-df5-2.md, AC1; WVTAB block layout BLK71.SRC:676-689 (each 8-byte block is `[MAX,MIN,INTRADELT,INTERDELT, W1,W2,W3,W4]`).
  - Spec text: "modelling the WVTAB wave table (attackers, WAVE SIZE :689, WAVE TIME :687)".
  - Implementation: `waves.ts` keeps each block's MAX ceiling and its four per-wave W columns; it does NOT store bytes 1-3 (MIN and the intra/inter-wall deltas).
  - Rationale: MIN and the wall deltas are df4 enemy-MOTION parameters (LANDER XV/YV, LDSTIM, etc. continue past :689 to WVTEND :722), not the df5-2 wave-structure scope; no AC or test references them. Keeping `waves.ts` to the size/time/count columns is the minimal implementation that passes the suite.
  - Severity: minor
  - Forward impact: a later story needing MIN or the intra/inter-wall deltas must extend the WVTAB model here (or read them where the enemy reducers already do); the citation file 16-waves.json cites only the rows this module owns.

- **`newGuys(wave<=0)` returns 0 (guarded), beyond what the tests assert**
  - Spec source: df5-2-waves.test.ts AC2/AC4 (tests exercise waves >= 1 only); GTWV00 DEFA7.SRC:1855-1861.
  - Spec text: escalation fires on multiples of the cadence.
  - Implementation: `newGuys` guards `wave > 0` so wave 0/negative return 0 rather than treating 0 as a multiple of 5.
  - Rationale: matches the ROM (PWAV is INC'd to >= 1 before GETWV; the SUBA loop borrows out to GTWV01 for wave 0) and avoids a spurious +10 at wave 0; no test covers it but the correct ROM behaviour is 0.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)

- **`waves.ts` TypeScript contract shape is TEA-chosen** → ✓ ACCEPTED by Reviewer: the injected-dependency factory mirrors the codebase idiom (`createScheduler`/`createEnemyBank`), keeps waves.ts pure and decoupled, and the ROM values are fixed regardless of API shape. Sound.
- **AC3 tested through injected `getPopulation`/`spawnWave` rather than a live `sim.ts` integration** → ✓ ACCEPTED by Reviewer: the pure unit contract pins the ROM behaviour (population-driven, no eager spawn, no own tick) deterministically; the `sim.ts` wiring is correctly deferred and recorded as a Delivery Finding. Consistent with the df5-1 pure-module precedent.
- **WVTAB stored as MAX + the four W columns, dropping MIN/INTRADELT/INTERDELT** → ✓ ACCEPTED by Reviewer: MIN and the intra/inter-wall deltas are df4 enemy-MOTION parameters (the table continues past :689 to WVTEND :722); none are in df5-2 scope and no AC references them. Minimal and correct; 16-waves.json cites only the owned rows.
- **`newGuys(wave<=0)` returns 0 (guarded)** → ✓ ACCEPTED by Reviewer: matches the ROM (PWAV is INC'd to ≥1 before GETWV; the SUBA loop borrows out for wave 0), avoids a spurious wave-0 award. Correct fail-closed behaviour.
- No undocumented deviations found. The exported-function NaN gap (columnIndex) is a latent robustness observation, not a spec deviation — recorded as a Delivery Finding.

## Impact Summary

**Story:** df5-2 (Wave director + escalation) — APPROVED, single-round review, **0 blocking findings**.
**Code:** merged to `develop` via PR #539 (merge commit `e888a101`). Defender suite 638/638 green; full merged-tree suite 17342 vitest + 505 orchestrator, 0 failures. Purity 39/39 green over `waves.ts`; 20/20 ROM claims byte-verified.

**7 non-blocking findings recorded (no rework):**
- *Integration pending (df7/later):* `createWaveDirector` ships pure with injected `getPopulation`/`spawnWave`; a follow-on wires the live enemy bank (`_enemyBank.landers` alive count) + `spawnLander`. Intentional scoping (df5-1 scanner precedent).
- *Wiring decision (later):* whether the +10 `newGuys` escalation increments the per-wave allotment or is tracked as PTARG is left to the integration story; `waves.ts` exposes both `waveParams` and `newGuys`.
- *Latent robustness (unreachable now):* `columnIndex` (waves.ts:62) fails open on NaN/non-integer `wave`; unreachable via the integer-only `createWaveDirector`. Guard only if a non-integer caller (save-resume/debug jump) is added.
- *Documentation:* SCHITZOS/SWARMERS zero WVTAB spawns in waves 1-4 are ROM truth (they arrive via pods/mutant-transform), pinned so no one "fixes" them.
- *Style (fleet-wide, no churn):* the `as unknown as WavesModule` RED/GREEN seam cast is the repo idiom (identical to approved df5-1); any simplification is a separate cross-file chore.

**ROM fidelity:** WVTAB (BLK71.SRC:676-689) counts/time/size/MAX byte-verified; GTWV00 (DEFA7.SRC:1859) step cadence 5 (GA4 default ROMC8.SRC:814) + increment 10 (DEFA7.SRC:1862); wave clamp to 4 (GETWV1 DEFA7.SRC:1867-1871). **Forward dependencies:** none — all ACs met.