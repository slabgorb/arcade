---
story_id: "ml4-1"
jira_key: "ml4-1"
epic: "ml4"
workflow: "tdd"
---
# Story ml4-1: Beetle + spider reducers (cited): BEETL move/start beetle (MILLI.MAC:243), SPDMV move spider (MILLI.MAC:2295). Difficulty from DIP equates (MLDEF.MAC:88 D1=beetle, :91 D6=spider); PTS scoring (MLDEF.MAC:398).

## Story Details
- **ID:** ml4-1
- **Jira Key:** ml4-1
- **Epic:** ml4
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p3
- **Branch:** feat/ml4-1-beetle-spider-reducers
- **PR:** https://github.com/slabgorb/arcade/pull/305
- **Branch Strategy:** gitflow (feat/ml4-1-beetle-spider-reducers)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T07:53:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T07:08:50Z | 2026-08-13T07:10:06Z | 1m 16s |
| red | 2026-08-13T07:10:06Z | 2026-08-13T07:34:01Z | 23m 55s |
| green | 2026-08-13T07:34:01Z | 2026-08-13T07:41:02Z | 7m 1s |
| review | 2026-08-13T07:41:02Z | 2026-08-13T07:53:59Z | 12m 57s |
| finish | 2026-08-13T07:53:59Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking, TEA):** ml4 nominally depends on ml3 (field/player/collision), but ml3-1/2/3/5 are still backlog — only ml3-4 (Conway) is done. The RED contracts therefore keep the cross-subsystem seams OUT of the reducers: the OBSTAC cell lookup (ml3-3), OVRLAP (ml3-1), PLAY player collision (ml3-2), scroll (ml3-5) and the mushroom-count decrement (ml3-3) are caller-side; beetle/spider expose pure obstacle-REACTION functions instead. Wiring order lands with ml3/ml7.
- **Gap (non-blocking, TEA):** the FIRST-WAVE EXTRA-SPIDER feature (MILLI.MAC:2318-2345 — slots 6..11 open above 100,000 on a full first wave, up to 8 concurrent spiders) is DESCOPED from ml4-1; the suite pins that slots 6..11 never start a spider here. Owner: SM — file a follow-up story under ml4 at finish.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations

## Sm Assessment

Setup complete for ml4-1 (Beetle + spider reducers, 5 pts, tdd). Session file, story context (`sprint/context/context-story-ml4-1.md`) and feature branch `feat/ml4-1-beetle-spider-reducers` (from up-to-date `develop`) are in place. Millipede plugin verified at `plugins/millipede/` with core/shell boundary intact. No Jira (local tracking). Ready to hand off to TEA for the RED phase.

## TEA Assessment

**RED delivered** (commit 5d4061d5): `tests/beetle.test.ts` (29 tests) + `tests/spider.test.ts` (34 tests) + `docs/rom-study/claims/09-beetle-spider.json` (97 byte-anchored claims, BT-1..46 / SD-1..51) under `plugins/millipede/`. All five title citations verified against the vendored tree before writing: MILLI.MAC:243 (BEETL), :2295 (SPDMV), MLDEF.MAC:88 (D1), :91 (D6), :398 (PTS — a 16-entry RAM stamp array; the per-critter VALUES live in SHOOT2/the 98$/99$ tables at MILLI.MAC:2089-2210, which is what the suites pin: beetle 300/900, spider 300/600/900/1200/1800 by proximity).

**Contract for Dev (GREEN):** `src/core/beetle.ts` and `src/core/spider.ts`, pure cited reducers in the conway.ts house style — in-place mutation, byte semantics (0..255, -1 is 0xFF), upright cabinet (CKF8/CKIND clear, the ml3-4 precedent; cocktail is ml8-3). Full export contracts are at the top of each test file. Load-bearing traps the suites pin: the spider SUBTRACTS its direction bytes (inverted vs the beetle's ADC); BEETL1's double-decrement can sail PAST zero (timer 1 on a fast beetle wraps to FF with no turn); a failed spider spawn gate re-arms a 256-frame countdown wrap; the beetle converts mushrooms ≥ 0x75 to ROCK keeping bit 7, while the spider eats everything ≥ ROCK down to bit 7.

**RED verification (testing-runner, ml4-1-tea-red):** 63 failed / 264 passed, failures confined to the two new files, every failure the self-describing module-absent loader error (no collect crashes). `npm run lint` clean. The byte gate (`brief-dossier.test.ts` checkClaims over loadClaims) already passes over the 97 new claims.

**Rule Coverage (lang-review typescript.md):**
- #1 type-safety escapes: no `as any`/double-casts in the suites; module shims are typed interfaces with runtime-guarded loaders (the ml1-1 self-describing pattern).
- #2 interfaces: `Readonly<>` on every non-mutated parameter in the contracts; explicit union returns (`'offscreen' | null`, discriminated obstacle reactions) instead of stringly booleans.
- #4 null handling: loaders throw self-describing errors rather than optional-chaining past absent exports.
- Test quality (#18-adjacent): every test asserts exact byte values with a cited justification string; negative cases pinned throughout (off-tick frames, closed gates, band edges 0x33/0x38 and 0x13/0x1C, the not-eaten DDT bomb, edge-kept dh). No vacuous assertions — self-checked.
- Purity: the ml1-1 scanner sweep auto-enrolls the two new core modules the moment Dev lands them (readdirSync over src/core).

**Scope notes:** attract MODE gating and the CHAN0/CHAN3 sound cues are ml7/ml6 seams (per the epic split); the two Delivery Findings above route the ml3 seam inversion and the descoped first-wave extra-spider feature.

## Dev Assessment

**GREEN delivered** (commit 0b658a6d, pushed to `origin/feat/ml4-1-beetle-spider-reducers`): `src/core/beetle.ts` (BEETL — spawn cadence/gates, BEETL1 patrol timer, mushroom→ROCK conversion, D1 difficulty, 300/900 kill + scroll-down) and `src/core/spider.ts` (SPDMV — slot 12/13 spawn gates with wrapping countdown, zig-zag, SUBTRACT steps, score-driven ceiling, eat/die obstacle reaction, D6 difficulty, PTS proximity scoring with the 98$/99$ stamp/value tables). Both pure, in-place, byte semantics, conway.ts house style, every constant cited to a BT-*/SD-* claim.

**Implementation notes:** the stamp-band equates (CLOUD/DDT/ROCK) are module-local consts in each file rather than a shared import — one standalone subsystem per file, mirroring the ROM's shared includes; extraction waits for a third consumer per the repo rule. `beetleObstacle`/`spiderObstacle` take the RAW cell byte and mask internally (OBSTAC's `AND 7F`, MLSUB.MAC:888) so the background bit survives conversions. No test was modified; minimal code beyond the contract.

**Verification (testing-runner, ml4-1-dev-green):** millipede 16/16 files, 329/329 tests; full cabinet 996 files, 15,147 tests, 0 failures (no cross-app regression); `npm run lint` clean. The ml1-1 purity sweep auto-enrolled both new core modules and stays green.

**Design deviations:** none — the reducers implement exactly the RED contracts; scope cuts were TEA's, logged as Delivery Findings.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by the reviewer's 8-mutant battery (MB-1..8, all killed) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — discriminated-union returns leave no swallowable path; MB-8 (dropped BEETLA decrement) killed |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 6, deferred 1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker's #1/#2 pass covered the surface (0 violations) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure byte math, no I/O or input boundary (rule-checker #10 n/a) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — reviewer verified the one duplication (CLOUD/DDT/ROCK consts) is a documented per-subsystem choice under the repo's extraction rule |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 10 confirmed, 0 dismissed, 1 deferred

Deferred: [TEST] runtime freeze-check that reducers never write into `Readonly<Env>` — compile-time contract only today, no such runtime check exists anywhere in the repo's suites; noted for a future convention story rather than this diff.

### Rule Compliance

Per `.pennyfarthing/gates/lang-review/typescript.md`, checked exhaustively by reviewer-rule-checker (33 rules × 96 instances) and spot-verified by the reviewer:
- **#1 type-safety escapes** — all 4 files compliant; the loaders' `as Partial<Module>` is runtime-guarded (house ml1-1 pattern).
- **#2 interfaces** — every read-only param `Readonly<>`; mutated slot/counts deliberately unmarked (documented in-place house style); score tables `readonly number[]`; fixture `Partial<>` idiomatic.
- **#3 enums / #6 JSX / #9 config / #10 input validation / #13 fix-regression / #15-16 / #19-30** — not applicable to this diff (verified, not assumed; see rule-checker output).
- **#4 null handling** — all `||` are boolean-logic; no `??`/`?.`/Map.get in the diff.
- **#5 modules** — src modules import nothing; test dynamic-import is the documented computed-specifier pattern under `moduleResolution: bundler`.
- **#7 async** — loaders genuinely async; the one needless `async` helper (beetle.test.ts `at`) fixed this round.
- **#8/#18/#26 test quality** — module shims match exports 1:1; assertions compare imported values to independent literals; no self-referential fixtures.
- **#11 error handling** — 2 violations found (unnarrowed `catch (e)` casts in both loaders, a repo-wide legacy shape): FIXED in-diff with `instanceof Error` narrowing rather than downgraded.
- **#14 derived edges** — offscreen/SPDOFF/turn transitions each fire on their single ROM control-flow path.
- **#17/#20 (claims)** — all 97 BT-*/SD-* ids referenced in code resolve in claims/09-beetle-spider.json, and the byte gate re-opens each verbatim against the vendored tree on every run.
- **Repo rules (purity / shared-extraction / one-subsystem-per-file)** — compliant; purity sweep auto-enrolled both modules and is green.

## Reviewer Assessment

**APPROVED** — after one fix round, applied and re-verified (commit 6ae69ce7; 332/332 millipede tests, 478/478 orchestrator, lint clean).

**Verification performed beyond the specialists:** the reviewer independently re-derived the ported semantics against `MILLI.MAC`/`MLDEF.MAC`/`MLSUB.MAC` (BEETL spawn gates and BEETL1 timer arithmetic, SPDMV zig-zag/bounce/ceiling BCD formula, SHOOT2 scoring bands, OBSTAC's `AND 7F` return) and ran an 8-mutant battery covering the disabled specialists' domains — every mutant killed: [EDGE] cadence mask 0x7F→0xFF, obstacle band 0x75→0x71, fast double-decrement removed, ceiling clamp removed, kill ABS removed; [SILENT] BEETLA decrement dropped; [EDGE] spider subtract→add step; [EDGE] COUNT2 reset EOR dropped. Each mutant's site was confirmed by `git diff` before the run and restored by `git checkout` after.

**Confirmed findings and dispositions (all resolved this round):**
1. [TEST] CPX/BEQ over-allowance quirk untestable as written (could not distinguish `===` from `>=`) — now pinned: beetles=2 over an allowance of 1 still spawns.
2. [TEST] moveBeetle player-dead gate untested (asymmetric with spider) — added.
3. [TEST] BEETL1 cocktail-top-row branch (v ≥ 0xF0) unreached — both turn paths added.
4. [TEST] offscreen clear didn't prove BEETL1 skipped — timer-untouched assertion added.
5. [TEST] trySpawnSpider occupied-slot guard untested — added.
6. [TEST] spider bomb-band 0x6F point missing — added.
7. [DOC] beetle.ts header cited :373-377, store is :378 — corrected to :373-378.
8. [DOC] spider.ts v-step cited :2447 (a TEMP1 store) — narrowed to :2448-2451.
9. [RULE] unnarrowed `catch (e)` cast in beetle.test.ts loader — fixed with `instanceof` narrowing.
10. [RULE] same in spider.test.ts loader — fixed.

**Verified good (observations 1-5):** (1) the spider's inverted SBC step convention is correctly kept module-local and is mutation-proven; (2) the BCD `SED SBC` nibble arithmetic in `spiderTopLimit` reproduces all nine golden values including the 860k wraparound quirk; (3) the claims file is byte-gated on every run — a drifted verbatim or line reddens the build with the vendored tree present; (4) the cross-subsystem seams (OBSTAC/OVRLAP/PLAY/scroll/mush-count) are cleanly caller-side with pure reaction functions, matching the Delivery-Findings routing; (5) both new modules entered the ml1-1 purity sweep automatically and pass.

**Residual risk (non-blocking):** the ROM's spawn-falls-into-movement sequencing (BEETL 50$ fallthrough) is a wiring-order concern deliberately deferred to ml7; the descoped first-wave extra-spider feature is routed to SM for filing at finish.