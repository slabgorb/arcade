---
story_id: "rb2-9"
jira_key: ""
epic: "rb2"
workflow: "tdd"
---
# Story rb2-9: Lives + death sequence + respawn grace

## Story Details
- **ID:** rb2-9
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T09:57:41Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T09:33:24Z | 2026-07-11T09:35:08Z | 1m 44s |
| red | 2026-07-11T09:35:08Z | 2026-07-11T09:45:21Z | 10m 13s |
| green | 2026-07-11T09:45:21Z | 2026-07-11T09:49:18Z | 3m 57s |
| review | 2026-07-11T09:49:18Z | 2026-07-11T09:57:41Z | 8m 23s |
| finish | 2026-07-11T09:57:41Z | - | - |

## Sm Assessment

**Routing:** Setup complete → hand off to TEA (Han Solo) for the RED phase.

**Story nature (rb2-9):** Lives + death sequence + respawn grace. The sprint YAML
carries no description or ACs, so the behavior is defined entirely by the ROM-token
title. TEA should derive acceptance criteria from these tokens:

- **ENDLFE / DEC LIVES → INITIAL respawn:** on player death, decrement lives and
  respawn from the initial state; game-over when lives hit zero.
- **INITLF:** initial lives count (seed the starting lives from this constant).
- **Death sequence visuals:** bullet-hole windshield overlay + spiral horizon-scroll
  + starfield during the death animation.
- **WO.CNT 5-frame spawn grace:** enemies are disabled for ~5 frames after respawn
  (respawn invulnerability / enemy-disable window).

**Where it lives:** deterministic behavior belongs in `red-baron/src/core` (flight/
game-state sim, lives + respawn timing); the death-sequence visuals belong in
`src/shell` (render). TEA to confirm the exact module boundaries during RED.

**Scope discipline:** lives/death/respawn/spawn-grace only. No unrelated flight-model
or scoring changes.

## TEA Assessment

**Tests Required:** Yes
**Reason:** N/A — new deterministic core behavior (lives/death/respawn); tests-first.

**Test Files:**
- `red-baron/tests/core/lives.test.ts` — 26 failing tests for the new `src/core/lives.ts`
  pure module (lives count, the death sequence, WO.CNT spawn grace).

**Tests Written:** 26 tests across 8 AC groups
**Status:** RED (failing — ready for Dev). Verified by Chewbacca (testing-runner): 26/26 new
tests fail with clean `must export … (rb2-9 RED contract)` assertions; 367 pre-existing tests
still pass; no parse/compile crash, no collateral breakage.

### GREEN contract (for Yoda / Dev)
Create `src/core/lives.ts` — PURE (no DOM / time / ambient randomness). Exports:
- **Constants:** `INITLF = [2,3,4,5]`, `WO_CNT = 5`, `RESPAWN_ALTITUDE = 0x0210`
  (== `flight.ts` `INITIAL_FLIGHT.altitude`), `DEATH_SEQUENCE = ['bullethole','spiral','starfield']`,
  `DeathPhase` union.
- **Death sequence:** `DeathSequence { side: -1|1; phase: number }`, `beginDeath`, `advanceDeath`,
  `currentPhase` (→ `DeathPhase | 'done'`), `deathComplete`.
- **Lives / grace:** `Lives { count; grace }`, `initialLives(option?)`, `loseLife`
  (→ `{ lives; gameOver }`), `tickGrace`, `enemiesDisabled`.
Full signatures + ROM citations are in the test-file header. No `main.ts` wiring (a later render story).

### Rule Coverage (TypeScript lang-review checklist)

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 enum → string union (no numeric enums) | `DEATH_SEQUENCE ordered stages`; `currentPhase` returns `DeathPhase \| 'done'` | failing |
| #4 `\|\|` vs `??` on falsy-valid 0 | `option 0 is a REAL option`; `grace 0 → enemiesDisabled false`; `count 0 → game over, never negative` | failing |
| #2 `readonly` / no input mutation | JSON-snapshot purity tests on `advanceDeath`, `loseLife`, `tickGrace` | failing |
| #4 totality | `bad option clamps`; `advancing past end clamps to done`; `tickGrace floors at 0`; totality sweep (no NaN/undefined) | failing |
| #8 test quality | every test asserts a concrete value; defensive `need()` import; no `as any` | self-checked |
| #5 `.js` import ext | N/A — red-baron internals use Vite bundler resolution (no `.js`), consistent with `flight.ts`/`returning-ace.ts` | n/a |

**Rules checked:** 4 of the applicable TS lang-review rules (#2, #3, #4, #8) have direct test
coverage; #5 documented N/A for this bundled repo.
**Self-check:** 0 vacuous tests found (no `let _ =`, no `assert(true)`, no always-None checks) —
every assertion checks a concrete value.

**Handoff:** To Dev (Yoda) for the GREEN phase — implement `src/core/lives.ts` to turn the 26 tests green.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `red-baron/src/core/lives.ts` (new, 133 lines) — pure deterministic module:
  constants `INITLF=[2,3,4,5]`, `WO_CNT=5`, `RESPAWN_ALTITUDE=0x0210`,
  `DEATH_SEQUENCE=['bullethole','spiral','starfield']` (+ `DeathPhase` union);
  the death-sequence progression (`beginDeath`/`advanceDeath`/`currentPhase`/`deathComplete`);
  lives + WO.CNT grace (`initialLives`/`loseLife`/`tickGrace`/`enemiesDisabled`).

**Tests:** 393/393 passing (GREEN) — the 26 new rb2-9 tests + 367 pre-existing, zero
regressions. Verified by Chewbacca (testing-runner). `npm run build` (`tsc --noEmit` +
`vite build`) passes clean — the new module typechecks.

**Branch:** `feat/rb2-9-lives-death-respawn` (pushed to origin). No PR (SM creates it at finish).

**Self-review:** minimal implementation, no scope creep; string-union `DeathPhase` (no enum);
`??`/default-param not `||` on the falsy-valid 0s (option/grace/count); all inputs `readonly`,
every function returns a fresh value. Not wired into `main.ts` — the deterministic spine only
(render/wiring is a later story; see Delivery Findings).

**Handoff:** To the next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN 393/393, tsc+vite pass, 0 code smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations across 17 checks: 13 TS base + 4 project) | N/A |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, domains assessed by Reviewer directly)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 non-blocking Improvement deferred (hand-forged degenerate-input guard — see Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

`src/core/lives.ts` is a small, pure, ROM-grounded module implemented exactly to the RED
contract. Two enabled specialists (preflight, rule-checker) came back clean; I assessed the
seven disabled domains myself. No Critical or High issues.

### Rule Compliance (TypeScript lang-review checklist + arcade conventions)

Enumerated every export against every applicable rule (rule-checker corroborated, 17/17 pass):

- **#1 type-safety escapes** — no `as any` / `as unknown as T` / `@ts-ignore` / non-null `!` in either file. `lives.test.ts:102`'s `as LivesModule` is a single-level scoped assertion to a local mirror type, not a bypass. ✓
- **#2 generic/interface** — `Lives` (lives.ts:99) and `DeathSequence` (lives.ts:69) have all-`readonly` fields; no `Record<string,any>` / `object` / `Function`. ✓
- **#3 enums** — `DeathPhase` (lives.ts:50) is a string-literal union, not a TS `enum`; no `switch` needing exhaustiveness. ✓
- **#4 null/undefined (`||` vs `??`)** — `livesIndex` (lives.ts:64) uses `Math.floor(option) || 0` deliberately: `??` cannot fold `NaN` (`NaN ?? 0 === NaN` would poison `clamp`), and for the valid-0 case the fallback is also 0, so no divergence. `grace`/`count` are never defaulted; `initialLives(option = 0)` uses a default param, not `||`. ✓ (not the rule-#4 bug)
- **#5 module/imports** — relative imports carry no `.js` extension, which is CORRECT for red-baron's Vite bundler resolution (the `.js` rule targets the published `@arcade/shared`, not this repo). ✓
- **#8 test quality** — 26 tests, meaningful assertions throughout, defensive `need()` import, no `as any`, imports from `src` not `dist`. ✓
- **#11 error handling** — the test's `catch { m = {} }` binds no variable and is documented RED scaffolding (the returning-ace house pattern); no swallowed errors in the module. ✓
- **arcade purity / ROM-canonical / no-goldplate** — no DOM/`Date.now`/`Math.random`; constants match `docs/…§5` `[ROM-verified]` citations; 15 exports map 1:1 to the RED contract, helpers kept private. ✓
- **#6/#9/#10/#13** — N/A (no `.tsx`, no config changes, no external input, no prior fix diff).

### Observations (≥5, tagged by domain)

- `[VERIFIED]` **Purity** — every function (beginDeath/advanceDeath/currentPhase/deathComplete/initialLives/loseLife/tickGrace/enemiesDisabled) returns a fresh object from inputs only; no ambient state. Evidence: lives.ts:77-133; grep for Date.now/performance.now/Math.random = 0. Complies with CLAUDE.md src/core purity rule.
- `[VERIFIED]` **ROM fidelity** — INITLF=[2,3,4,5], WO_CNT=5, RESPAWN_ALTITUDE=0x0210, DEATH_SEQUENCE order all match findings §5 `[ROM-verified]` (lines 248-254); RESPAWN_ALTITUDE === INITIAL_FLIGHT.altitude (flight.ts:111, asserted lives.test.ts:380-383).
- `[RULE]` **Rule-checker: 0 violations / 17 checks** — corroborates my own enumeration above; the `||` in `livesIndex` explicitly cleared as correct NaN-handling.
- `[TEST]` (test-analyzer disabled; assessed by Reviewer + rule-checker #8) — no vacuous assertions; the local `LivesModule` mirror matches every real export signature; totality sweep + purity snapshots are real checks, not decoration.
- `[TYPE]` (type-design disabled; assessed by Reviewer + rule-checker #2) — `readonly` invariants hold; `side: -1 | 1` and `DeathPhase` union are tight literal types; `currentPhase` returns `DeathPhase | 'done'` (no stringly-typed leak).
- `[SIMPLE]` (simplifier disabled; assessed by Reviewer) — `RESPAWN_ALTITUDE` is exported-but-unused *within* the module; intentional public API for the render story (asserted by test), not dead code. Cursor-based death sequence is the minimal model — no over-engineering.
- `[DOC]` (comment-analyzer disabled; assessed by Reviewer) — module header + JSDoc cite ROM sources and explicitly label INFERRED choices; no stale or misleading comments.
- `[SEC]` (security disabled; assessed by Reviewer + rule-checker #10) — pure module, no DOM/network/`JSON.parse`/secrets; `option` is an internal DIP-style selector, not user input. No attack surface.
- `[SILENT]` (silent-failure-hunter disabled; assessed by Reviewer + rule-checker #11) — no swallowed errors or silent fallbacks in `lives.ts`; the only `catch` is documented test scaffolding.
- `[EDGE]` (edge-hunter disabled; assessed by Reviewer) — `LOW`: `currentPhase` on a hand-forged negative `phase` returns `DEATH_SEQUENCE[-n] = undefined`, and `loseLife` on a hand-forged `NaN` count propagates `NaN`. Both are **unreachable** via the module's constructors (`beginDeath` starts at 0 and only increments; `initialLives` always yields a valid integer), matching the codebase's pure-module trust model. Deferred as a non-blocking Improvement, not a blocker.

### Devil's Advocate

Suppose this code is broken. The most suspicious spot is `currentPhase`: `seq.phase < DEATH_SEQUENCE.length ? DEATH_SEQUENCE[seq.phase] : 'done'`. If a caller ever hands it a `DeathSequence` with `phase = -1`, the ternary is true and it returns `DEATH_SEQUENCE[-1] === undefined` — an `undefined` masquerading as a `DeathPhase`, which a downstream exhaustive `switch` would silently fall through. Similarly `loseLife` trusts `lives.count`: a hand-built `{count: NaN}` yields `Math.max(0, NaN - 1) = NaN`, `gameOver = (NaN === 0) = false`, so a "dead" game limps on forever with a `NaN` counter. A malicious or confused caller could also pass `initialLives(1e9)` — but `livesIndex` clamps it to index 3, so that's contained. Next: the count-boundary semantics. "2 lives" is modelled as 2 planes with game-over on the 2nd death; if the arcade original actually granted 2 *extra* planes (3 total), every playthrough would end one death too early — but the finding text ("respawn if any remain") and the deaths-to-game-over test lock the chosen reading, and it is logged as an accepted inference, so it is a documented decision, not a latent bug. The spawn-grace window is another off-by-one candidate: is "5 frames disabled" `grace ∈ {5..1}` or `{5..0}`? The test counts frames-until-`enemiesDisabled`-flips and pins it to exactly `WO_CNT`, so the boundary is nailed. Finally, the death sequence has no per-stage durations, so a careless shell could render all three stages in a single frame — but that is explicitly the shell's responsibility (logged), and `RESPAWN_ALTITUDE` is a documented constant the wiring story must apply, flagged in Delivery Findings so it cannot be silently forgotten. Every "broken" path is either unreachable through the module's own constructors, pinned by a test, or a documented downstream responsibility. None rises to Critical or High. The verdict holds.

### Wiring & data flow

**Data flow traced:** a returning-ace `'hit'` (rb2-8) → `beginDeath(ENSIDE)` → `advanceDeath`×3 → `deathComplete` → `loseLife` → respawn (`grace = WO_CNT`, `enemiesDisabled` true) or `gameOver`. Safe because the whole chain is pure and value-returning; the integration test (lives.test.ts:AC-7) drives the *real* rb2-8 verdict through it. **Not yet wired into `main.ts`** — this is the deterministic spine only; the render/wiring gap is documented by TEA, Dev, and Reviewer in Delivery Findings so the next story picks it up.

**Pattern observed:** mirrors the established `explosion.ts` core-owns-animation convention (`WreckPhase` string union + frame-driven progression) and `returning-ace.ts` purity — good, consistent pattern (lives.ts:50, 69-94).

**Error handling:** no throwing paths; all helpers are total over their tested input domains (out-of-range option clamps, grace/count floor at 0, advance clamps at end). The only unguarded surface is hand-forged degenerate state — unreachable via constructors, deferred non-blocking.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): rb2-8's `returning-ace.ts` already documents rb2-9 as its 'hit' damage channel (bullet-hole side = ENSIDE, respawn). The `beginDeath(side)` seam consumes that ENSIDE directly. Affects `src/core/lives.ts` (Dev should keep `side: -1 | 1` shape-compatible with `ReturningAce.side` so main.ts can wire evade-'hit' → `beginDeath`). *Found by TEA during test design.*
- **Gap** (non-blocking): the death sequence's on-screen rendering (drawing the bullet-hole windshield, the spiral horizon-scroll, the starfield) and the HUD lives counter are NOT covered here — `src/core/lives.ts` is the deterministic spine only. Affects the shell (`src/main.ts`) — a later render story drives `DEATH_SEQUENCE`/`currentPhase` and shows `Lives.count`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the `src/core/lives.ts` seam is implemented and unit-green but NOT yet wired into the sim — nothing calls `beginDeath`/`loseLife`/`enemiesDisabled`. Affects `src/main.ts` and `src/core/enemy.ts` (a render/wiring story must: feed a returning-ace `'hit'` into `beginDeath(ENSIDE)`, run the sequence, call `loseLife`, gate enemy spawns on `enemiesDisabled`, and re-seed `INITIAL_FLIGHT` on respawn). Reinforces TEA's Gap. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the public functions carry no defensive guard against hand-forged degenerate state (a `DeathSequence` with a negative `phase` → `currentPhase` returns `DEATH_SEQUENCE[-n] = undefined`; a hand-built `Lives` with `NaN` count → `loseLife` propagates `NaN`). Unreachable via the module's own constructors (`beginDeath` starts at 0 and only increments; `initialLives` always yields a valid integer), and consistent with the codebase's pure-module trust model (returning-ace.ts trusts its `ace` shape the same way), so NOT blocking. Affects `src/core/lives.ts` — a wiring story that ever deserializes/persists lives state should validate at that boundary. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **LIVES boundary encoding — game over when the post-DEC count hits 0**
  - Spec source: context-epic-rb2.md §5; red-baron/docs/red-baron-1980-source-findings.md §5 (ENDLFE, R2BRON.MAC:1055-1210)
  - Spec text: "ENDLFE does DEC LIVES → INITIAL respawn if any remain, else high-score entry."
  - Implementation: `count` = planes remaining including the one being flown; `loseLife` sets `gameOver` true exactly when the decremented count reaches 0 (so INITLF[opt] deaths reach game over on the opt-th). The finding pins "respawn if any remain" but not whether 0 or -1 is the boundary; tested behaviourally (deaths-to-game-over === INITLF[option]).
  - Rationale: Most literal reading of `LIVES := INITLF; DEC on death; respawn while LIVES > 0`. Avoids fabricating an off-by-one.
  - Severity: minor
  - Forward impact: HUD reserve display (count vs count-1) is a shell/render decision, not fixed here.
- **DEATH_SEQUENCE modelled as an ordered cursor, no per-stage frame durations**
  - Spec source: red-baron/docs/red-baron-1980-source-findings.md §5 (EOLSEQ→ENDLFE)
  - Spec text: "the windshield bullet-hole graphics step in ... the horizon scrolls down and the playfield spins ... then a starfield + plane-explosion."
  - Implementation: `DEATH_SEQUENCE = ['bullethole','spiral','starfield']` advanced one stage per `advanceDeath`; the shell owns how many frames each stage renders. The source gives WO.CNT=5 for the spawn grace but NO durations for the three death sub-stages, so none are fabricated (same discipline as rb2-8's PLPOSZ).
  - Rationale: Pins the ROM-documented ORDER + the ENSIDE bullet-hole side without inventing magic frame counts.
  - Severity: minor
  - Forward impact: stage durations + the actual canvas drawing land in a shell/render story.
- **INITLF default option is index 0 (→ 2 lives)**
  - Spec source: red-baron/docs/red-baron-1980-source-findings.md §5
  - Spec text: "Initial lives from options INITLF: .BYTE 2,3,4,5."
  - Implementation: `initialLives()` with no argument defaults to option 0; the operator DIP selects the real one. Out-of-range/NaN options clamp to a valid table entry (total).
  - Rationale: The finding does not pin the default DIP index; 0 is the natural default and is tested only for explicit options + totality, not asserted as "the" arcade default.
  - Severity: minor
  - Forward impact: none — options wiring is out of scope for rb2-9.

### Dev (implementation)
- **Game-over `Lives` carries `grace: 0` (no respawn → no spawn grace)**
  - Spec source: tests/core/lives.test.ts AC-5 (loseLife / ENDLFE); findings §5
  - Spec text: "ENDLFE does DEC LIVES → INITIAL respawn if any remain, else high-score entry." (no grace value is specified for the game-over branch)
  - Implementation: on a surviving death `loseLife` re-arms `grace: WO_CNT`; on the game-over branch it returns `grace: 0`. No test constrains the game-over grace beyond "finite integer ≥ 0" (the totality sweep).
  - Rationale: game over means there is no respawn, so there is no spawn grace to arm — 0 is the only sensible value and keeps the totality invariant satisfied. Not adding state beyond what the tests demand.
  - Severity: trivial
  - Forward impact: none — the value is unobservable once the game is over.
- **Otherwise no deviations:** implemented exactly to the RED contract. The three inferences (LIVES boundary, DEATH_SEQUENCE ordered cursor, INITLF default 0) are TEA's, logged above under `### TEA (test design)`, and were materialized as tested.

### Reviewer (audit)
- **TEA — LIVES boundary (game over when post-DEC count hits 0)** → ✓ ACCEPTED: the most literal reading of `LIVES:=INITLF; DEC on death; respawn while >0`; pinned behaviourally by the deaths-to-game-over===INITLF[option] test. Sound.
- **TEA — DEATH_SEQUENCE as an ordered cursor, no per-stage durations** → ✓ ACCEPTED: correct discipline — the source gives WO.CNT=5 but no death sub-stage durations, so fabricating them would violate "ROM is canonical / don't gold-plate". Modelling only the ROM-documented ORDER + ENSIDE side is right; the shell owns frame timing.
- **TEA — INITLF default option 0 (→ 2 lives)** → ✓ ACCEPTED: the finding does not pin the DIP default; 0 is natural, only explicit options + totality are asserted, so nothing is over-claimed.
- **Dev — game-over `Lives` carries `grace: 0`** → ✓ ACCEPTED: game over means no respawn, so no grace to arm; 0 is the only sensible value and keeps the totality invariant (integer ≥ 0). Unobservable once the game ends. No scope creep.
- **No undocumented deviations found.** The implementation is a 1:1 match to the RED contract (rule-checker rule #16); every ROM constant is cited and every non-ROM choice is explicitly labelled INFERRED in the module header.