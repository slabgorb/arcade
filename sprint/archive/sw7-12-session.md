---
story_id: "sw7-12"
jira_key: "sw7-12"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-12: R9b TSPWAV wave composition — 6 wave sets + Darth ordering (A-017)

## Story Details
- **ID:** sw7-12
- **Jira Key:** sw7-12
- **Workflow:** tdd
- **Stack Parent:** sw7-11 (TIE choreography VM engine — done, merged)
- **Points:** 5
- **Priority:** p2

## Story Summary

Port TSPWAV wave composition (A-017): 6 wave-composition sets plus Darth ordering, driving the sw7-11 VM. Builds on sw7-11 (VM engine, done and merged at commit 073ce28).

### Critical Landmine (from refutation)
**DO NOT gate the +/-2048 corners to D-waves.** A-015 reasoning proposed that and it is WRONG; TWV2Z shows the +/-2048 corners EVERY wave. Do not "fix" toward that gate.

### Acceptance Criteria
- Port TSPWAV 6 wave-composition data sets
- Port Darth ordering logic
- Mark A-017 findings remediated_by in findings JSON
- Keep npm test citations green
- No +/-2048 corner gating to D-waves

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T00:04:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T23:23:20Z | 2026-07-15T23:24:44Z | 1m 24s |
| red | 2026-07-15T23:24:44Z | 2026-07-15T23:42:21Z | 17m 37s |
| green | 2026-07-15T23:42:21Z | 2026-07-15T23:54:33Z | 12m 12s |
| review | 2026-07-15T23:54:33Z | 2026-07-16T00:04:06Z | 9m 33s |
| finish | 2026-07-16T00:04:06Z | - | - |

## Sm Assessment

**Nature of the story:** A pure ROM-fidelity port. sw7-11 already delivered the TIE choreography VM engine (A-009, merged as star-wars#96); this story feeds it the *data* — the TSPWAV wave-composition tables (A-017): 6 wave-composition sets plus the Darth-ordering logic. No new engine surface; the work is deterministic core data in `src/core`, driven through the existing VM.

**Technical approach for the pipeline:** TDD. TEA (Han Solo) writes RED tests asserting the ported TSPWAV table values and Darth ordering against the A-017 findings JSON citations, then Dev (Yoda) makes them green with minimal data + wiring into the sw7-11 VM. Keep the `src/core` / `src/shell` boundary — this is core simulation data only.

**The landmine is the whole risk here.** DO NOT gate the +/-2048 corners to D-waves. A-015 reasoning proposed that gate and it was refuted — TWV2Z shows the +/-2048 corners on EVERY wave. Any test or implementation that special-cases the corners to D-waves is fixing toward the wrong model. TEA must write a test that pins the corners as present on non-D waves so this can never regress silently.

**Fidelity bookkeeping:** citations must stay green (`npm test`); mark A-017 `remediated_by` in the findings JSON as part of the work. Base branch is `develop` (gitflow); branch `feat/sw7-12-tspwav-wave-composition` is cut.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-data port with an exact primary-source oracle — pure `src/core` data + selector, ideal for TDD.

**Test Files:**
- `tests/core/tie-waves-rom.test.ts` — 36 tests (26 static + 10 generated per TWV group) over 7 AC groups, hand-transcribed from WSCPU.MAC and cited line-by-line. Pins a NEW module `src/core/tie-waves.ts`.

**Tests Written:** 36 tests covering 7 ACs. **Status:** RED — 1 file failed (module `src/core/tie-waves.ts` not found), the other 107 files / 1284 tests stay GREEN (verified by testing-runner, RUN_ID sw7-12-tea-red). Import-RED is expected for a brand-new-module unit suite.

**AC coverage (all from WSCPU.MAC, 1983 Atari source):**
- **AC-1** — `TSPWAV` is exactly the 6 ROM sets in order (:1230–1235); every set ends with `TWV2Z`.
- **AC-2** — the 10 `TWV_GROUPS` are the ROM `.WV shape,choreography,beginLoc` triples (:1252–1320); `TWV2Z` has 18 entries, 9 of them D-corners.
- **AC-3** — `TBG` begin-locs equal the `.WB` decode (:1186–1200); depth `$7C00 == TIE_SPAWN_DISTANCE`; A/B/C displace ±1024, the D-corners are ±2048.
- **AC-4** — `selectWaveSet` is the NWNSHP selector (:969–984): waves 0–5 → SETA1–6; past end, EVEN→SETA5 (Darth 2nd), ODD→SETA6 (Darth 1st); never a middle set.
- **AC-5 — THE LANDMINE** — the ±2048 D-corners appear in EVERY wave incl. SET A1 (via `TWV2Z`), directly refuting A-015's "D-waves only" gate. A refutation guard asserts no wave is ±2048-free.
- **AC-6** — Darth (RTH) is scheduled only via `TRTH1D`'s 3rd entry; TRTH1D in sets A2–A6 not A1; SETA6 Darth-first / SETA5 Darth-second; shape table gives RTH 4 lives / TIE 1.
- **AC-7** — the composition DRIVES the sw7-11 VM: `choreoPc` resolves each entry to a real `TCH1`/`TCH2` `program` index; TWV1x→TCH1, TWV2x→TCH2; every composed entry ticks without error.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 generic/interface — `readonly` on tables, no `Record<string,any>` | `WaveEntry`/table types imported `readonly`; structural equality via copies | tsc-enforced |
| #3 exhaustiveness/totality | AC-2 "defines exactly the 10 named groups" + "every set references only defined groups" | failing (RED) |
| #4 null/undefined — Record lookup used without undefined check | AC-2 "every set references only defined groups"; AC-7 "resolves to a runnable program index" | failing (RED) |
| #8 test quality — meaningful assertions, no `as any` | self-check below | pass |

**Rules checked:** 4 of 13 lang-review rules apply to a pure ROM-data module (no enums added, no async, no React/JSX, no user-input/network, no error-handling surface — those checks N/A). The dominant "rule" for this module is ROM fidelity, enforced exhaustively by AC-1..AC-7 against hand-cited WSCPU.MAC.
**Self-check:** every test carries a concrete `toEqual`/`toBe`/`toHaveLength` on a decoded ROM value or a sw7-11 program index; no `let _ =`, no `assert(true)`, no `is*()`-on-always-null. 0 vacuous tests.

**Handoff:** To Dev (Yoda) for GREEN — create `src/core/tie-waves.ts` with the composition data + selector, mark A-017 `remediated_by`. See Design Deviations (scope) and Delivery Findings (deferred sim wiring, sw7-13 Darth behaviour, remediated_by citation shape).

**Routing:** phased tdd → hand off to TEA for the RED phase.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/tie-waves.ts` (NEW) — the ported TSPWAV composition: `SHAPE_LIVES`, `TWV_GROUPS` (10 groups), `TSPWAV` (6 sets), `TBG` begin-locations, and the `selectWaveSet` / `waveSpawnPlan` / `choreoPc` selectors. Pure `src/core` data + functions cited line-by-line to WSCPU.MAC; resolves each entry's choreography to a runnable sw7-11 VM program index. The ±2048 D-corners ride TWV2Z into every wave (landmine guarded, NOT gated to D-waves).
- `star-wars/docs/audit/findings/pair-tie-ai.json` — A-017 marked `"remediated_by": "sw7-12"`, `ours` kept `null` (NO_COUNTERPART).
- `star-wars/tests/core/tie-waves-rom.test.ts` — removed one unused type import (`ChoreoInstr`) so `tsc --noEmit` passes; assertions unchanged.

**Tests:** 1320/1320 passing (GREEN) — the 36 new `tie-waves-rom` tests + citations suite green; `npm run build` (tsc + vite) exit 0.
**Branch:** feat/sw7-12-tspwav-wave-composition (to be pushed)

**Handoff:** To next phase (verify/review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 genuine smells; 2 grep hits are a comment + a JSON string) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths assessed directly (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error-handling surface; assessed directly (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed directly (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments/citations assessed directly (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design assessed directly (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — no external input; assessed directly (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed directly (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 8 (6× Rule 4 null/undefined, 2× Rule 2 readonly-in-test) — 0 critical/high | confirmed 8 (all non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`, pre-filled as Skipped)
**Total findings:** 8 confirmed (all Low/Medium, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A faithful, minimal, pure-`src/core` ROM-data port. I independently verified the ROM oracle against the actual 1983 Atari source (`~/Projects/star-wars-1983-source-text/WSCPU.MAC`) — every ported value is exact — and both enabled specialists returned no Critical/High findings.

**Data flow traced:** `selectWaveSet(spaceWave)` → picks a TSPWAV set → `waveSpawnPlan` flattens its groups' `.WV` entries → each entry's `choreography` → `choreoPc` → a real sw7-11 `program` index that `tickChoreo` advances without throwing (AC-7). Pure function of the integer `spaceWave`; no I/O, no clock, no RNG. Safe because the only inputs are the module's own ROM-transcribed tables.

**ROM fidelity (the core of this story) — [VERIFIED] against WSCPU.MAC:**
- `[VERIFIED]` TSPWAV 6 sets exact — WSCPU.MAC:1229–1235, incl. the source invariant "LAST ENTRY MUST HAVE DARTH FIRST / NEXT TO LAST HAS DARTH SECOND" (SETA6 first, SETA5 second).
- `[VERIFIED]` TWV2Z = 18 `.WV` entries, 9 D-corners — WSCPU.MAC:1299–1320. **The landmine:** the ±2048 corners ride TWV2Z (present in every set) into every wave; NOT gated to D-waves. AC-5's refutation guard passes. This is the whole risk of the story and it is handled correctly.
- `[VERIFIED]` TBG D-corners — WSCPU.MAC:1198–1200: `.WB 1D1,0,-2,0`→[7C00,−2048,0], `1D2`→[+2048], `1D3`→[0,0,+2048]; A/B/C are ±1024. `tie-waves.ts:99–105`.
- `[VERIFIED]` NWNSHP selector — WSCPU.MAC:975–983: even SP.WAV→ZSPWAV-4=SETA5 (Darth 2nd), odd→ZSPWAV-2=SETA6 (Darth 1st). `selectWaveSet` matches. `tie-waves.ts:112–115`.
- `[VERIFIED]` shape lives — WSCPU.MAC:1165–1166 `.WS TIE,1` / `.WS RTH,4`. `SHAPE_LIVES`, `tie-waves.ts:38`.

**Observations (tagged by domain; 7 specialists disabled → assessed directly):**
- `[RULE]` `choreoPc` (`tie-waves.ts:135–139`) returns `undefined` typed as `number` on a malformed suffix (Record miss → NaN index). **Medium, non-blocking** — unreachable today (all callers pass ROM literals; AC-7 covers every one). Routed to sw7-13 as a Delivery Finding, where wiring makes it runtime-reachable. Confirmed by rule-checker Rule 4.
- `[RULE]` test oracles `ROM_GROUPS`/`ROM_TBG` miss the outer `Readonly<>` (rule-checker Rule 2). **Low, non-blocking**, test-file style only. Recorded as a Delivery Finding.
- `[EDGE]` (assessed directly) `selectWaveSet` negative/`waveSpawnPlan` with `group` not in `TWV_GROUPS`: both unreachable — `spaceWave` is a 0-based counter, `group` is always one of the 10 hardcoded keys (AC-2 "every set references only defined groups" pins this). No boundary defect in the reachable surface.
- `[SILENT]` (assessed directly) no `try/catch`, no swallowed errors, no silent fallbacks — the only silent-degradation path is the `choreoPc` undefined-return above, already recorded.
- `[TEST]` (assessed directly) test quality is high — an independent hand-transcribed oracle (`ROM_SETS`/`ROM_GROUPS`/`ROM_TBG`), concrete `toEqual`/`toBe`/`toHaveLength` assertions, the AC-5 refutation guard, and AC-7 genuinely drives the VM (`initVm`+`tickChoreo`). No `as any`, no vacuous assertions, no mocks. 36/36 green.
- `[DOC]` (assessed directly) comments are accurate and cite WSCPU.MAC line-by-line; I verified the citations resolve to the real source lines. A-017 `remediated_by: sw7-12` keeps `citations.test.ts` green.
- `[TYPE]` (assessed directly) all tables are `readonly`/`Readonly<Record<…>>` (Rule 2 compliant in the shipped module); `shape: 'TIE' | 'RTH'` is a string-literal union, not an enum. The one type-honesty gap is the `choreoPc` return above.
- `[SEC]` (assessed directly) no external/user input reaches this module — `spaceWave` is an internal integer, string keys come from its own ROM tables; no `JSON.parse as T`, no injection surface.
- `[SIMPLE]` (assessed directly) no dead code, no over-engineering; the module is data + three small pure selectors. Nothing to simplify.

**Pattern observed:** faithful ROM-hex port mirroring `tie-vm.ts` (sw7-11) — data cited line-by-line, unwired, driven through the existing VM. `tie-waves.ts:1–139`.
**Error handling:** N/A for pure data + total functions over their own tables; the one non-total path (`choreoPc` malformed suffix) is unreachable today and routed forward.
**Purity:** `[VERIFIED]` imports only `./state` + `./tie-vm` (both core); zero DOM/`window`/`Date.now`/`Math.random`/`requestAnimationFrame`. Complies with the CLAUDE.md sacred boundary.

### Devil's Advocate

Argue the code is broken. The strongest case: `choreoPc` is a partial function wearing a total function's type. Its signature promises `number` for any `string`, but feed it `"9Z9"`, `""`, or `"1A"` and it returns `undefined` — no throw, no `NaN` you can test for, just a value that lies about its type and will detonate one frame later when `program[undefined]` reaches `tickChoreo` ("program counter out of range"). A future sw7-13 author wiring the space wave, mapping the clone's phase counter onto SP.WAV, could easily produce an off-by-one suffix or an untrimmed string and get a silent wrong-script or a delayed crash far from the cause. That is a genuine latent trap. But is it broken *now*? No: every one of the module's own suffixes is a well-formed ROM literal (`'1A1'`…`'2D3'`), AC-7 resolves and ticks all of them, and nothing external calls the function — the module is deliberately unwired. So the defect is real but currently unreachable, correctly Medium and correctly deferred to the story that makes it reachable. Next, could the landmine have regressed silently? A malicious or careless edit gating the corners to D-waves is exactly what AC-5's refutation guard forbids ("no wave is ±2048-free"), and I confirmed the corners live in TWV2Z in the real source — so no. Could a confused user misread the dead-looking `SLOT_INDEX` `Z: 3` slot (never used by any current suffix)? It's harmless and forward-compatible with a `xZ` loiter script. Could `selectWaveSet(4)`/`(5)` hardcoding (SETA5/SETA6) drift from `TSPWAV.length`? Only if someone adds a 7th set without updating the recycle — but that would contradict the ROM's fixed 6-set ZSPWAV table, and AC-4's "never recycles a middle set" (w=6..39) would catch a mis-index. Nothing here rises to blocking.

### Rule Compliance

Checked against `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + the star-wars CLAUDE.md `src/core` purity boundary. Enumerated every type/const/function/import in `tie-waves.ts`:
- **#1 type-safety escapes** — CLEAN. No `as any`/`as unknown as T`/`@ts-ignore`/non-null `!`. (The two `as const`/`as readonly string[]` in the *test* are legit refinements, not bypasses.)
- **#2 generic/interface** — shipped module CLEAN (every table `readonly`/`Readonly<Record>`; no `Record<string,any>`/`object`/`Function`). 2× LOW in the test file (`ROM_GROUPS`/`ROM_TBG` miss outer `Readonly<>`) — non-blocking, recorded.
- **#3 enums** — CLEAN (none; string-literal union used).
- **#4 null/undefined** — the `choreoPc`/`TWV_GROUPS[group]`/`selectWaveSet` Record-and-array lookups have no runtime guard (6 instances). All unreachable with real data; Medium/Low, non-blocking, routed to sw7-13. Cannot dismiss (matches a stated rule) → CONFIRMED as non-blocking, downgraded with rationale.
- **#5 module/declaration** — CLEAN. `.js` extension correctly OMITTED — matches every sibling `src/core/*.ts` under `moduleResolution: "bundler"`; the ESM-`.js` rule applies to the raw-ESM arcade-shared library, not this Vite-bundled game.
- **#6 React/JSX** — N/A. **#7 async** — N/A. 
- **#8 test quality** — CLEAN (no `as any`, no dist import, meaningful assertions).
- **#9 build/config** — CLEAN (`strict`/`noUnusedLocals` on; tsc clean; no config change).
- **#10 input validation** — N/A (no external input). **#11 error handling** — N/A (no try/catch).
- **#12 performance/bundle** — CLEAN (named imports, no sync fs). 
- **#13 fix-regressions** — CLEAN (Dev's import removal introduces nothing; grep confirms zero `ChoreoInstr` refs).
- **CLAUDE.md purity** — CLEAN (verified: no shell import, no DOM/clock/random).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the composition is not yet consumed by the sim — the space-wave spawn still walks the flat `SPAWN_LATERALS` table and never runs the VM.
  Affects `src/core/sim.ts` (replace the flat spawn with a `waveSpawnPlan(spaceWave)`-driven sequence; assign each fighter its `choreoPc` and tick `tickChoreo` in `moveEnemy`; map clone state → 0-based SP.WAV; convert ROM→sim frame). This is the "driving the VM" integration deferred per the scope deviation.
  *Found by TEA during test design.*
- **Gap** (non-blocking): sw7-12 SCHEDULES Darth (RTH on the right waves/order) but does NOT give it enemy behaviour — 4-hits-to-kill, immortal-in-space, retreat, 2,000 pts (A-016 / S-002).
  Affects sw7-13 (`docs/audit/findings/pair-tie-ai.json` A-016 + the score finding S-002). The `SHAPE_LIVES.RTH === 4` datum this story pins is the ROM shape-table value sw7-13 will enforce.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): on GREEN, mark A-017 `remediated_by: sw7-12` to keep citations green — A-017 is NO_COUNTERPART, so `ours` must be EITHER `null` OR a whole `{file,line,verbatim}` citation into `src/core/tie-waves.ts` (check-citations.mjs:139–149); a partial/shapeless `ours` is rejected.
  Affects `docs/audit/findings/pair-tie-ai.json`.
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the RED test file imported an unused type — `import { …, type ChoreoInstr } from '../../src/core/tie-vm'` (line 63) — which `tsc --noEmit` (noUnusedLocals) rejects, so the suite was vitest-green but build-RED. Removed the dead import; every assertion is unchanged.
  Affects `tests/core/tie-waves-rom.test.ts` (import line only — no assertion touched).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): confirms TEA's finding #1 — `tie-waves.ts` ships unwired. The space-wave spawn still walks the flat `SPAWN_LATERALS` table (`sim.ts`) and never calls `waveSpawnPlan`/`choreoPc`/`tickChoreo`. Wiring is the next integration slice, and it must map the clone's phase/wave state → the ROM 0-based `SP.WAV` and the ROM frame → the sim's y-up frame (per the two TEA scope deviations).
  Affects `src/core/sim.ts` (spawn + `moveEnemy`).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `choreoPc(choreography: string): number` has no runtime guard on a malformed suffix. `LETTER_INDEX[choreography[1]]` / `SLOT_INDEX[choreography[2]]` are Record lookups that yield `undefined` for any non-`A/B/C/D` letter or non-`1/2/3/Z` slot → `NaN` index → `TCH1[NaN]`/`TCH2[NaN]` is `undefined`, so the declared `number` return type silently lies. HARMLESS TODAY (every caller in this diff passes a fixed ROM-transcribed suffix from the module's own `TWV_GROUPS`; AC-7 exercises all of them). It becomes load-bearing when sw7-13 wires `choreoPc` into runtime spawn — a state→SP.WAV/suffix mapping bug would then feed a bad `pc` into `program[pc]`.
  Affects `src/core/tie-waves.ts:135–139` (when sw7-13 wires the plan in: either tighten the param type to a `` `${1|2}${'A'|'B'|'C'|'D'}${1|2|3}` `` template-literal union, or throw on an out-of-range resolution — do NOT return `undefined` typed as `number`). Confirmed by `[RULE]` reviewer-rule-checker (Rule 4, medium).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the test-file oracles `ROM_GROUPS` (`:95`) and `ROM_TBG` (`:123`) are typed `Record<string, …>` without the outer `Readonly<>` the shipped module uses for the equivalent tables. Purely stylistic (the test never mutates them); inner arrays/tuples are already `readonly`.
  Affects `tests/core/tie-waves-rom.test.ts` (wrap in `Readonly<>` if a future test-cleanup pass touches the file). Confirmed by `[RULE]` reviewer-rule-checker (Rule 2, low).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Composition lands as a pure UNWIRED module, not a stepGame rewire**
  - Spec source: context-story-sw7-12.md / story title "…driving the sw7-11 VM"
  - Spec text: "Port TSPWAV wave composition (A-017): 6 wave-composition sets plus Darth ordering, driving the sw7-11 VM."
  - Implementation: sw7-12 pins the composition DATA + selector as a standalone `src/core/tie-waves.ts` (mirroring how sw7-11 landed the VM engine unwired). "Drives the VM" is pinned at the module level (AC-7: `choreoPc` → a runnable sw7-11 `program` entry). Consuming the plan in stepGame's spawn and ticking `tickChoreo` per-frame in `moveEnemy` is routed to a Delivery Finding.
  - Rationale: A-017 is class NO_COUNTERPART (`ours: null`) — the DATA is what's absent; a faithful, cited data+selector module remediates it exactly as sw7-11 remediated A-009 without wiring. Rewiring the space-wave spawn is a spawn-contract + flight-integration change that overlaps sw7-13 (Darth behaviour) and A-011..A-014, and would redden flight suites — out of a clean 5-pt slice.
  - Severity: major
  - Forward impact: until the wiring lands, waves still spawn via the flat `SPAWN_LATERALS` walk (sim.ts:1239) and never run the VM. Named in Delivery Finding #1.

- **TBG begin-locations pinned in the ROM frame, not the sim's y-up frame**
  - Spec source: WSCPU.MAC:1179–1200 (the `.WB` macro)
  - Spec text: "TBG'.1': .WORD 7C00 / .WORD '.3'*400 / .WORD '.4'*400"
  - Implementation: TBG values are ROM-frame triples `[depth=$7C00, lateral(Y)=arg3×$400, up(Z)=arg4×$400]`; the sim's y-up projection (existing `SPAWN_LATERALS`) is NOT reproduced in this module.
  - Rationale: keeps the module a faithful ROM port (mirrors tie-vm.ts keeping ROM hex); frame conversion belongs to the wiring.
  - Severity: minor
  - Forward impact: the wiring finding must map ROM (x=fore, y=lat, z=up) → sim (x=lat, y=up, z=−fore) — the same mapping `SPAWN_LATERALS` already encodes.

- **selectWaveSet takes the ROM's 0-based SP.WAV, not the clone's wave counter**
  - Spec source: WSCPU.MAC:969–984 (NWNSHP)
  - Spec text: "LDB SP.WAV … LDX #TSPWAV … CMPX #ZSPWAV … LDX #ZSPWAV-4 ;DARTH SECOND / LDX #ZSPWAV-2 ;DARTH FIRST"
  - Implementation: the selector's argument is the ROM 0-based space-wave index (0 ⇒ SETA1). Mapping the clone's (surface/trench-inclusive) phase/wave state onto SP.WAV is left to the caller.
  - Rationale: pins the ROM arithmetic exactly without entangling the clone's wave numbering, which is a wiring concern.
  - Severity: minor
  - Forward impact: the wiring finding owns the state→SP.WAV mapping.

### Dev (implementation)

- **Removed an unused import from TEA's RED test file to reach build-green**
  - Spec source: `tests/core/tie-waves-rom.test.ts`:63 (TEA-authored RED)
  - Spec text: `import { program, TCH1, TCH2, initVm, tickChoreo, type ChoreoInstr } from '../../src/core/tie-vm'`
  - Implementation: dropped `type ChoreoInstr` (never referenced in the suite). vitest was green but `npm run build` (`tsc --noEmit`, noUnusedLocals) was RED on TS6133 — the Dev exit gate runs the typecheck, so build-green is required.
  - Rationale: the import is dead; removing it changes no assertion and is the minimal fix. The alternative (inventing a use) would be scope creep in a test I don't own.
  - Severity: minor
  - Forward impact: none — assertion-preserving cleanup of a test import. Logged as Delivery Finding (Gap) so Reviewer/TEA see the edit to a TEA file.

- **A-017 marked remediated with `ours: null` (not an `ours` citation into tie-waves.ts)**
  - Spec source: `docs/audit/findings/pair-tie-ai.json` A-017 (NO_COUNTERPART) + TEA Delivery Finding #3
  - Spec text: "`ours` must be EITHER `null` OR a whole `{file,line,verbatim}` citation into `src/core/tie-waves.ts`"
  - Implementation: added `"remediated_by": "sw7-12"` and kept `"ours": null`. The citations gate (`check-citations.mjs`) explicitly accepts a remediated NO_COUNTERPART with a null `ours` (`citations.test.ts` X-030); null is the truthful record for an ADD.
  - Rationale: an `ours` citation into a fresh data module would pin a line number that shifts when the module is later wired, needlessly re-fragilising the citation gate. Null is gate-accepted, truthful, and robust.
  - Severity: minor
  - Forward impact: none — sw7-13/wiring may later attach an `ours` citation if a stable anchor is wanted; both shapes stay accepted.

### Reviewer (audit)

- **Composition lands as a pure UNWIRED module** → ✓ ACCEPTED by Reviewer: mirrors exactly how sw7-11 landed the VM engine (A-009) unwired; A-017 is class NO_COUNTERPART so the DATA is the whole remediation. AC-7 pins "drives the VM" at the module level (`choreoPc` → runnable `program` index, `tickChoreo` ticks without throwing), which I verified. Wiring is correctly deferred to a Delivery Finding.
- **TBG begin-locations pinned in the ROM frame, not the sim's y-up frame** → ✓ ACCEPTED by Reviewer: keeps the module a faithful 1:1 ROM port (verified against WSCPU.MAC:1198–1200 — `.WB 1D1,0,-2,0`→[7C00,−2048,0] etc.). Frame conversion is genuinely a wiring concern; SPAWN_LATERALS already owns the y-up projection.
- **selectWaveSet takes the ROM's 0-based SP.WAV** → ✓ ACCEPTED by Reviewer: pins the NWNSHP arithmetic exactly (verified WSCPU.MAC:975–983: ZSPWAV-4=SETA5 even/Darth-second, ZSPWAV-2=SETA6 odd/Darth-first). The clone-state→SP.WAV mapping is legitimately the caller's job.
- **Removed an unused import from TEA's RED test file to reach build-green** → ✓ ACCEPTED by Reviewer: `type ChoreoInstr` was genuinely dead (grep confirms zero references); removal is assertion-preserving and required by `noUnusedLocals`. The minimal correct fix; logged as a Delivery Finding so the test edit is visible.
- **A-017 marked remediated with `ours: null`** → ✓ ACCEPTED by Reviewer: `citations.test.ts` (X-030) and the "every committed findings file passes" test both go green on this exact shape (verified: full suite 1320/1320). Null is the truthful record for an ADD and avoids re-fragilising the citation gate with a shifting line anchor.