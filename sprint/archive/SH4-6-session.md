---
story_id: SH4-6
jira_key: SH4-6
epic: SH4
workflow: trivial
---
# Story SH4-6: Harden the audio-dispatch-convention guard

## Story Details
- **ID:** SH4-6
- **Jira Key:** SH4-6
- **Workflow:** trivial
- **Type:** chore
- **Points:** 2
- **Stack Parent:** none
- **Branch:** chore/SH4-6-harden-audio-dispatch-convention-guard
- **PR:** https://github.com/slabgorb/arcade/pull/254

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-11T19:10:25Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T18:40:45Z | 2026-08-11T18:42:06Z | 1m 21s |
| implement | 2026-08-11T18:42:06Z | 2026-08-11T18:52:24Z | 10m 18s |
| review | 2026-08-11T18:52:24Z | 2026-08-11T19:02:00Z | 9m 36s |
| implement | 2026-08-11T19:02:00Z | 2026-08-11T19:05:48Z | 3m 48s |
| review | 2026-08-11T19:05:48Z | 2026-08-11T19:10:25Z | 4m 37s |
| finish | 2026-08-11T19:10:25Z | - | - |

## Story Context

**Guard File:** `tests/audio-dispatch-convention.test.mjs` (created by SH4-5)

The audio-dispatch-convention guard pins the convention across 7 games (asteroids, battlezone, centipede, joust, missile-command, red-baron, tempest). SH4-5 shipped a TS-AST orchestrator guard + comment-only convention paragraph. This story hardens that guard:

**AC-2 Hardening:** Resolve local aliases / renamed AudioEngine imports. The current syntactic AST walk in `hasBareAudioEngineParam()` (line 67-84) only checks for direct `AudioEngine` identifier matches. It misses cases where `AudioEngine` is imported under an alias (e.g., `import { AudioEngine as AE }` or `const AudioEngine = SomeAlias`).

**AC-3 Hardening:** Require the `never` exhaustiveness anchor sit in a switch/exhaustiveness position. The current check in `hasNeverAnchorInFunction()` (line 99-116) finds any `never`-typed variable binding anywhere in a function body. It should be stricter: the `never` binding must be specifically in a switch statement's default case or another exhaustiveness-checking position, not just present anywhere in a function.

**Non-blocking note:** These are non-blocking follow-ups from the SH4-5 review (test-analyzer Findings 1-3). The current syntactic form is already backstopped by tsc + the convention prose, so the predicates work correctly on real code today. This hardens the guards to be more resistant to future edge cases.

**Branch Strategy:** gitflow (feat/chore/SH4-6-harden-audio-dispatch-convention-guard)

## Sm Assessment

Setup complete and clean. NEW_WORK entry with an empty PR queue, clean tree on `develop`, gate green.

**Scope is well-bounded** — a 2-pt `trivial`/chore that hardens two predicates in a single existing orchestrator guard (`tests/audio-dispatch-convention.test.mjs`), created by SH4-5. No `plugins/` or `src/shared/` changes expected; this is orchestrator-suite work (`npm run test:orchestrator`), not vitest.

**Key context for Dev:**
- AC-2: `hasBareAudioEngineParam()` must resolve local aliases / renamed `AudioEngine` imports — the current syntactic AST walk misses them. This needs a type-resolving tsc program rather than the bare AST walk.
- AC-3: `hasNeverAnchorInFunction()` must require the `never` anchor sit in a switch/exhaustiveness position, not merely be present somewhere in the function body.
- Non-blocking hardening: the current form is already backstopped by tsc + the convention prose, so real code passes today. Do not weaken coverage of the 7 games (asteroids, battlezone, centipede, joust, missile-command, red-baron, tempest); each game's dispatch stays green.

**Routing:** trivial → phased. Next phase `implement`, owner Dev (Yoda). No design gate outstanding (SH4-5 already resolved the convention as a pin).

## Dev Assessment

Hardened both predicates in `tests/audio-dispatch-convention.test.mjs`; zero `plugins/`/`src/shared/` changes (guard-only chore, as scoped).

**AC-2 (alias/rename resolution) — now type-resolving.** Replaced the syntactic `hasBareAudioEngineParam()` (matched only the literal `AudioEngine` type-identifier) with a real `ts.Program` + `TypeChecker`. The AC-2 sweep now builds a path-mapped Program over the 7 on-disk dispatch files (`buildProgram`, ~330ms over 272 files via the repo tsconfig) and asks the checker what each parameter's type RESOLVES to. Discriminator: `getTypeAtLocation(param).symbol?.name === 'AudioEngine'` — a `Pick<AudioEngine,…>` resolves to an anonymous object type (`symbol.name === '__type'`), the full engine (bare, aliased `type Engine = AudioEngine`, or renamed `import { AudioEngine as Engine }`) resolves to the `AudioEngine` interface symbol. Control fixtures run through an in-memory Program (`fixtureResolvesToFullEngineParam` + a stub `./audio`).

**AC-3 (switch position) — now position-checked.** `hasNeverAnchorInFunction` → `hasNeverAnchorInSwitch`: the `never`-typed binding must have BOTH a function ancestor AND a `SwitchStatement` ancestor (walks the parent chain). A stray `const _: never` at function top no longer satisfies it. All 7 real files anchor in a `default:` clause → still pass.

**Verification (evidence, not assertion):**
- `node --test tests/audio-dispatch-convention.test.mjs` → 10/10 green.
- **Mutation-verified non-vacuous:** reverting AC-2 to the syntactic form reds AC-5a (aliased) + AC-5b (renamed) only; reverting AC-3 to "anywhere in function" reds AC-6 only — 3 fails on exactly the 3 new hardening controls, AC-4a/AC-5c stay green.
- `npm run test:orchestrator` → 467/467 (SH4-5 baseline 463 + 4 new controls; delta exact).
- `npm run lint` (repo-wide `tsc --noEmit`) → clean.

**Note on the AC-4 disclaimer:** the old header (lines 165-168) explicitly documented "an aliased/renamed full engine still reads as compliant to AC-2, by design." SH4-6 CLOSES that gap, so I rewrote that comment rather than leave a now-false disclaimer beside the code — the header now states AC-2 is alias/rename-proof with AC-5 controls proving both directions.

### Dev Rework (Round 2) — addresses Reviewer's confirmed MEDIUM

**Root fix (blocking finding):** the in-memory fixture harness used an empty default lib, so `Pick<AudioEngine,…>` failed to resolve and the Pick fixtures degraded to `any`. Replaced the empty lib with a one-line global `Pick` declaration (`FIXTURE_LIB = type Pick<T, K extends keyof T> = { [P in K]: T[P] };`; `keyof` needs no lib). Now the fixture Pick resolves to the same anonymous `__type` the real on-disk sweep sees. Rewrote the false `STUB_AUDIO_MODULE`/lib comment ("empty default lib is enough") to explain why `Pick` must be declared. The header (L24-36) and `isFullEngineType` doc are now accurate on BOTH paths — no rewrite needed there once the fixture resolves `Pick` for real.

**Also addressed (non-blocking Improvement):** added **AC-7**, a positive control that builds the REAL program and asserts every dispatch file has an audio param resolving to a narrowed Pick (`__type`), never `any` — pins that AC-2's "no violators" is meaningful, not vacuously green from silently-degraded resolution.

**Verification (evidence):**
- `node --test tests/audio-dispatch-convention.test.mjs` → 11/11 green (AC-7 real-program control 222ms).
- **Coincidence removed (mutation-proven):** mutating `isFullEngineType` to also flag `symbol === undefined` (an `any`) leaves AC-4c/AC-5c GREEN — proving the Pick fixtures now resolve to `__type` (symbol defined), not `any`. Pre-fix that mutation would have reddened them.
- `npm run test:orchestrator` → 468/468 (467 + AC-7).
- `npm run lint` → clean.

## Subagent Results

_(Round 2 — re-run on the reworked diff. Round-1 results in italics per row.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (468/468, tsc clean, 11/11) | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer did test-quality analysis manually) |
| 5 | reviewer-comment-analyzer | Yes | clean (round-1 finding resolved) + 1 LOW nit | 1 LOW (AC-7 missing from header index) | confirmed 0, deferred 1 (non-blocking) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean (13/13, 33 instances) | none | N/A |

**All received:** Yes (4 enabled returned round 2; 5 disabled via settings, pre-filled)
**Total findings:** round-1 MEDIUM resolved & re-verified; round-2 = 0 confirmed blocking, 1 LOW deferred (non-blocking)

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

**Round-1 verdict was REJECTED** on one confirmed MEDIUM (fixture harness resolved `Pick` to `any`, so the AC-4c/AC-5c "Pick passes" controls passed coincidentally and three mechanism-comments were false). The Round-1 assessment is preserved below for the record. **The rework resolved it**, and I re-verified independently (not on the subagents' word): under the committed `FIXTURE_LIB` (`type Pick<T, K extends keyof T> = { [P in K]: T[P] };`), `PICK_INLINE` now resolves to `symbol:'__type', isAny:false` with **no** "Cannot find name 'Pick'" diagnostic, while `BARE`/`ALIASED`/`RENAMED` resolve to `AudioEngine`. Mutation-proven decoupled: flagging `symbol === undefined` now leaves AC-4c/AC-5c GREEN (pre-fix it reddened them). The new AC-7 positive control (real program must resolve each audio param to a narrowed `__type`, never `any`) closes the vacuous-green gap the Round-1 devil's-advocate raised — comment-analyzer confirmed only the `Pick<AudioEngine,…>` audio param can satisfy it (GameState/Input/WorldSound are named interfaces, not `__type`).

**Round-2 subagent tags:** `[DOC]` comment-analyzer — all 4 round-1 findings resolved, verified by re-executing compiler logic (1 LOW nit below); `[TEST]`/`[RULE]` rule-checker + preflight — 13/13 clean, AC-7 non-vacuous, 468/468; `[SEC]` security — clean; `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SIMPLE]` disabled (covered manually: no new boundary/error-swallow/type/complexity regressions in a one-line-lib + one-test rework).

**Remaining (non-blocking, LOW):** the "Convention pinned" header index (session note: file L38-55) enumerates AC-1..AC-6 but not AC-7; AC-7 is fully documented at its own definition site. Incomplete index, not a false statement — captured as a fast-follow in Delivery Findings, does not block. Data flow, error handling, and security are unchanged from round 1 (all VERIFIED there and re-confirmed green).

**Handoff:** To SM for finish-story.

---

### Round 1 (REJECTED) — preserved for the record

**Verdict:** REJECTED

**Data flow traced:** dispatch source text → `buildProgram`/`TypeChecker` (real path) or in-memory `ts.Program` (fixture path) → `isFullEngineType` (`type.symbol.name === 'AudioEngine'`) → violators list. On the REAL path this is correct and mutation-proven (see below). On the FIXTURE path it works only by coincidence for the Pick direction — the confirmed finding.

### The confirmed finding (independently reproduced)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM][DOC][TEST] | The in-memory fixture harness `fixtureResolvesToFullEngineParam` uses an **empty default lib** (`libName → ''`). `Pick` is a lib-declared utility type, so under this harness `Pick<AudioEngine,…>` fails to resolve ("Cannot find name 'Pick'") and the param type is `any` (`TypeFlags.Any`, `symbol === undefined`). Result: (a) the header (L23-35), `isFullEngineType` doc (L86-92), and `STUB_AUDIO_MODULE` comment (L119) claim a `Pick → __type` mechanism that is FALSE on the fixture path; (b) the AC-5c and AC-4c "Pick passes" controls pass only because an `any`'s symbol is also `undefined` — a coincidence, not the mechanism they claim to prove. | `tests/audio-dispatch-convention.test.mjs` fixture lib (`fixtureResolvesToFullEngineParam`), L~118-119, and the three comment sites | Give the in-memory Program a lib that declares `Pick` globally (verified fix: `type Pick<T, K extends keyof T> = { [P in K]: T[P] };` as the lib-file content) so the Pick fixtures resolve to `__type` for real; then the controls exercise the true mechanism and the comments become accurate. Keep BARE/ALIASED/RENAMED → `AudioEngine` (still `flagged=true`). |

**Independent verification (not taken on the subagent's word):** reproduced with `ts.getPreEmitDiagnostics` + `getTypeAtLocation`. Empty lib: `PICK_INLINE → {isAny:true, symbol:undefined, flagged:false}`, diag "Cannot find name 'Pick'". With the one-line `Pick`-stub lib: `PICK_INLINE`/`PICK_ALIAS → {symbol:'__type', isAny:false, flagged:false}` (no Pick diag), `BARE`/`ALIASED → {symbol:'AudioEngine', flagged:true}`. Fix confirmed effective and side-effect-free.

**Why REJECTED and not deferred (proportionality):** by the generic rubric this is a MEDIUM, but the deliverable of THIS story IS guard/predicate rigor. A control that passes for the wrong reason + three false mechanism-comments introduced by this very change are the two things the cabinet's non-vacuous-guard and comment-truth disciplines exist to stop. The fix is one line + comment accuracy, so deferring it to backlog (a stale "file-not-fix" claim) is the wrong trade. Fix now, re-verify, re-review.

### Observations (≥5, no rubber-stamp)

- [VERIFIED] **Real-file AC-2 is correct AND non-vacuous** — mutation test (reverting to the syntactic form) reds only AC-5a/AC-5b; all 7 real params resolve to `__type` (symbol ≠ AudioEngine) via the real path (`buildProgram`, tsconfig-mapped). Evidence: prototype + preflight, AC-2 runs 354ms and passes meaningfully. This path is unaffected by the finding (real lib resolves `Pick`).
- [VERIFIED] **AC-3 switch-position check matches its prose** — `hasNeverAnchorInSwitch` requires `inFn && inSwitch` (L171-188); all 7 real anchors sit in a `default:` clause → SwitchStatement ancestor. A never at function-top is rejected (AC-6, mutation-confirmed). Evidence: source survey of all 7 files.
- [VERIFIED] **False AC-4 disclaimer fully removed** — grep confirms no residual "aliased/renamed … reads as compliant, by design"; the only "by design" left (L205) is AC-1's unrelated pac-man/star-wars exemption. Confirmed by me and comment-analyzer.
- [VERIFIED] **No dangling renamed symbols** — no `hasBareAudioEngineParam` / `hasNeverAnchorInFunction` / stale "67-84"/"99-116" citations remain.
- [RULE][VERIFIED] **JS checklist clean (13/13)** — `readFileSync(...,'utf8')` has encoding; all comparisons `===`/`!==`; no `var`/`.only`/`.skip`/`console.log`; `writeFile:()=>{}` is a legitimate no-emit host sink, not an error swallow.
- [SEC][VERIFIED] **Hermetic test, no untrusted input** — fixtures are hardcoded literals; `game` names come from `readdirSync` of the repo's own `plugins/`; no network/exec/secrets. Security clean.
- [MEDIUM] the confirmed finding above.

**Dispatch-tag coverage:** `[DOC]`, `[TEST]`, `[SEC]`, `[RULE]` sourced from the four enabled specialists above. `[EDGE]`, `[SILENT]`, `[TYPE]`, `[SIMPLE]` — the edge-hunter, silent-failure-hunter, type-design, and simplifier specialists are disabled via `workflow.reviewer_subagents`; I covered their domains myself on this small diff: `[EDGE]` no boundary paths beyond the parent-chain walk (bounded, no index math); `[SILENT]` no swallowed errors (`writeFile:()=>{}` is a legit no-emit sink, corroborated by rule-checker); `[TYPE]` the discriminator is name-coupled to `'AudioEngine'` by design (documented) — no stringly-typed regression; `[SIMPLE]` no dead code or over-engineering — the real Program + fixture Program split is the minimal way to type-resolve both real files and hermetic fixtures.

### Devil's Advocate

Argue the guard is broken. First: the real-file AC-2 could be vacuously green if `getTypeAtLocation` returned an error/`any` type for the audio params — then nothing is flagged and it passes checking nothing. I probed this: the discriminator depends only on each plugin's local `./audio` `AudioEngine` interface (self-contained, resolves without `@shared`), and the prototype shows all 7 resolve to a real `__type` Pick today; a missing source file would make `fileHasFullEngineParam(undefined,…)` throw loudly, not pass. And if `@shared`/tsconfig resolution broke wholesale, `npm run lint` (repo tsc) goes red and blocks CI. So the real path is not silently vacuous — but there is NO positive control pinning that the real Program resolves types (only the fixture controls do, and those are exactly what the finding shows are weak). Second, and this is the live hit: the fixture controls meant to prove "an inline Pick still passes" don't resolve `Pick` at all — they pass because the param degrades to `any`. A future refactor of `isFullEngineType` that (say) also flagged `symbol === undefined` would red AC-5c, but a refactor that mis-handled a genuinely-resolved Pick would NOT be caught by these fixtures (only by the real-file sweep). So the controls under-test the mechanism their own comments advertise. Third, the discriminator is name-coupled to the literal string `'AudioEngine'`; a game that named its engine interface differently would evade AC-2 — but that is inherent to the pinned convention and documented, and AC-1 forces a deliberate owner-set edit. Net: production behavior is sound; the fixture-control honesty and the comment truth are the real defects, and they are worth one rework pass.

### Rule Compliance

Applicable rules: `.pennyfarthing/gates/lang-review/javascript.md` (JS/mjs) — the only diff file governed is the `.mjs` test. Enumerated every added/changed function (`isFullEngineType`, `fileHasFullEngineParam`, `buildProgram`, `fixtureResolvesToFullEngineParam`, `hasNeverAnchorInSwitch`) and all 10 `test()` calls against all 13 checks (rule-checker corroborated, 24 instances, 0 violations). CLAUDE.md core/shell rule: N/A (no `plugins/*/src/core` change). Extract-into-shared bar: N/A (guard-only, no shared symbol added). No project rule is violated; the finding is a test-validity + comment-accuracy defect, not a rule breach.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement / non-blocking:** AC-2 now builds a full path-mapped `ts.Program` over the 7 dispatch files on every orchestrator run (~330ms). Cheap today; if the guard fleet grows, a shared/cached Program across audio-convention-style guards would amortize it. Not worth doing for one guard.

### Reviewer (code review)
- **Gap** (blocking): the in-memory fixture harness resolves `Pick` to `any` (empty default lib), so the AC-5c/AC-4c "Pick passes" controls and the `Pick → __type` mechanism comments are not actually exercised/true on the fixture path. Affects `tests/audio-dispatch-convention.test.mjs` (`fixtureResolvesToFullEngineParam` lib content + header/`isFullEngineType`/`STUB_AUDIO_MODULE` comments — add a global `Pick` stub to the fixture lib). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): consider a positive control asserting the REAL `buildProgram` path resolves at least one known Pick to `__type` (guards against the real-file AC-2 sweep going vacuously green if type resolution ever silently degrades). Affects `tests/audio-dispatch-convention.test.mjs`. *Found by Reviewer during code review.*

### Reviewer (code review — round 2)
- **RESOLVED** (was blocking): the round-1 `Pick → any` fixture-harness finding is fixed — `FIXTURE_LIB` declares `Pick` globally, so the fixture path resolves `Pick` to `__type` and the AC-4c/AC-5c controls + mechanism comments are now genuine/accurate. Re-verified by re-executing the compiler logic (comment-analyzer + Reviewer). *Confirmed by Reviewer, round 2.*
- **RESOLVED** (was non-blocking Improvement): the real-program positive control is now implemented as AC-7. *Confirmed by Reviewer, round 2.*
- **Improvement** (non-blocking, LOW): the "Convention pinned" header-comment index in `tests/audio-dispatch-convention.test.mjs` lists AC-1..AC-6 but not AC-7 (AC-7 is documented at its own definition site). One-line completeness polish for a future touch — not blocking. *Found by Reviewer during code review, round 2.*

## Impact Summary

**Upstream Effects:** 1 findings (1 Gap, 0 Conflict, 0 Question, 0 Improvement)
**Blocking:** 1 BLOCKING items — see below

**BLOCKING:**
- **Gap:** the in-memory fixture harness resolves `Pick` to `any` (empty default lib), so the AC-5c/AC-4c "Pick passes" controls and the `Pick → __type` mechanism comments are not actually exercised/true on the fixture path. Affects `tests/audio-dispatch-convention.test.mjs`.


### Downstream Effects

- **`tests`** — 1 finding

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- No spec deviations were logged by Dev, and I found none undocumented. The AC-2 (type-resolving) and AC-3 (switch-position) implementations match the story's stated intent. The one confirmed finding is a test-validity/comment-accuracy defect (fixture harness resolves `Pick` to `any`), captured in the Reviewer Assessment and Delivery Findings — it is not a spec deviation.