---
story_id: "jt4-1"
jira_key: "jt4-1"
epic: "jt4"
workflow: "tdd"
---
# Story jt4-1: BCD scoring core — the game.ts session layer, per-player SCRHUN/SCRTEN registers, drain the kill/egg/ptero event stream

## Story Details
- **ID:** jt4-1
- **Jira Key:** jt4-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p1

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-25T21:53:22Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-25T20:49:45+00:00 | 2026-07-25T20:51:58Z | 2m 13s |
| red | 2026-07-25T20:51:58Z | 2026-07-25T21:08:45Z | 16m 47s |
| green | 2026-07-25T21:08:45Z | 2026-07-25T21:26:52Z | 18m 7s |
| review | 2026-07-25T21:26:52Z | 2026-07-25T21:40:12Z | 13m 20s |
| green | 2026-07-25T21:40:12Z | 2026-07-25T21:47:32Z | 7m 20s |
| review | 2026-07-25T21:47:32Z | 2026-07-25T21:53:22Z | 5m 50s |
| finish | 2026-07-25T21:53:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (blocking): the sim's `DemoEvent` score `{kind:'score',value,reason}` carries NO scoring-player attribution, but AC-3 requires "a P1 kill never moves P2's score". Affects `src/core/demo.ts` + `src/core/game.ts` (`stepGame` must attribute each kill to the winning player — thread the joust winner's player id through `collisionPass` onto the score event, then map it to a `GameScoreEvent.player` for `creditScoreEvents`). The pure drain `creditScoreEvents` is pinned in `tests/game.test.ts`; the attribution wiring is Dev's to build. *Found by TEA during test design.*
- **Gap** (blocking): the drain must consume each score event EXACTLY ONCE. `stepDemo` appends to a 32-capped rolling `sim.events` log (demo.ts `EVENT_LOG_CAP`), so draining `game.sim.events` every frame would re-count old kills and massively over-score. Affects `src/core/demo.ts` + `src/core/game.ts` (`stepGame` must drain the FRAME DELTA — expose the frame's fresh `collided.events` on the stepped state, or diff — not the rolling log). Pinned indirectly by the "no phantom score" + determinism tests; the once-only wiring needs Dev + Reviewer eyes. *Found by TEA during test design.*
- **Improvement** (non-blocking): several comments read "scoring DISPLAY is jt4" (`demo.ts:210-211`, `egg.ts:262`, `dissolve.ts:24`). Per the jt4 scope-split ruling these should read "accumulation jt4 / display jt5". Affects those files (prose only — no behaviour). The story context lists this as an in-scope sweep for jt4-1. *Found by TEA during test design.*

### Dev (implementation)

- **Resolved** both TEA blocking Gaps: (1) attribution — added an optional `player` on the sim's score event + `collisionPass` sets it (winner for enemy kills, killing player for ptero); (2) once-only — `stepGame` drains the frame delta via a reference-set difference of the capped log. Prose sweep applied.
- **Improvement** (non-blocking): the once-only drain assumes `stepDemo` spreads its RETAINED events by reference and appends new objects (so `sim.events.filter(e => !prior.has(e))` recovers exactly this frame's fresh events). Correct today; if `stepDemo`'s event log is ever refactored to deep-copy/rebuild entries, the drain would over-count. Affects `src/core/game.ts` (`stepGame`) coupled to `src/core/demo.ts` (`stepDemo`). Pinned indirectly by the determinism + no-phantom-score tests; worth a Reviewer eyeball. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): no test drives a REAL kill through `stepGame` — the story's core behaviour (AC-1 drain, AC-3 two-ledger attribution, AC-4 honest drain) is unguarded end-to-end. Mutation-proven: three separate mutations of `src/core/game.ts` each leave the full 1406-test suite green — (1) hardcoding `player: PLAYER1_ID` at the drain (misattributes every P2 kill to P1), (2) dropping the `!prior.has(e)` dedupe (unbounded re-credit), (3) replacing `creditScoreEvents(...)` with `game.players` (the real drain fully disconnected). Affects `tests/game.test.ts` (TEA to add a stepGame integration test — a kill fires at frame ~252 with active flap input at SEED 0x1234; assert the scoring player's ledger += the exact value, the other stays 0, then step further and assert NO re-credit). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `scoreToBcd(NaN)` silently returns `[0,0,0]` (the `Math.max/min` clamp doesn't neutralise NaN) and `decodeDvalue` doesn't validate `digit` is a byte — both non-reachable today (all callers pass finite ROM/sim integers). Optional hardening: `Number.isFinite` guard + `digit & 0xff`. Affects `src/core/game.ts`. *Found by Reviewer during code review (via reviewer-security).*
- **Improvement** (non-blocking): a type-predicate filter `(e): e is Extract<DemoEvent,{kind:'score'}> => ...` in `stepGame` would drop the `as` cast and make future `DemoEvent`-shape drift a compile error. Style only. Affects `src/core/game.ts`. *Found by Reviewer during code review.* — **APPLIED in rework.**
- **Improvement** (non-blocking, re-review): the AC-3 integration tests are timing-coupled to the deterministic sim (a fixed 60-frame "no re-credit" window, kill at ~frame 145/253 @ SEED 0x1234). This is a false-FAILURE-only risk (a future sim change landing a second legitimate kill inside the window), never a false pass — acceptable brittleness for an end-to-end sim test. Affects `tests/game.test.ts` (a successor could widen the assertion or bound the window dynamically). *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Additive `player` attribution on the sim's score event (demo.ts)**
  - Spec source: context-epic-jt4.md, Architect ruling (1)
  - Spec text: "the pure sim (frame.ts/demo.ts) is NOT rewritten; no second stepping path (the jt2-1 one-sim seam)"
  - Implementation: added an OPTIONAL `player?: number` to the `DemoEvent` score union and populated it in `collisionPass` (the winning player for an enemy kill — enemies bounce so the winner is always a player; the killing player `pl` for a ptero kill). `game.ts` drains it into the right ledger. No second stepping path was added; `stepGame` delegates all stepping to `stepDemo`.
  - Rationale: AC-3 ("a P1 kill never moves P2's score") cannot be satisfied without attributing each kill to the scoring player — the seam TEA flagged as a blocking Gap. The change is purely ADDITIVE (an optional field + populating it), not a rewrite: no existing sim behaviour changed and all 1406 pre-existing tests stay green.
  - Severity: minor
  - Forward impact: jt4-2 (extra men) and jt4-3 (co-op/gladiator bounties) build on this per-player attribution; the sim's score event now carries the scoring player's id.
  - **Reviewer audit: ACCEPTED** — the additive `player` field is sound; the winner/loser attribution in `collisionPass` is correct by inspection (winner = the surviving player for a scoring kill) and the analyzer confirmed a real kill (frame 252, SEED 0x1234) is attributed and credited once. The deviation is not the problem; the missing END-TO-END TEST of this wiring is (see the REJECT).

## Sm Assessment

**Setup complete — routing to Leeloo (TEA) for RED.** Branch `feat/jt4-1-bcd-scoring-core` off joust `develop` (now at v0.0.3; jt3 shipped). Story `in_progress`. Jira is local-only (jira_key = story id). No blocking PRs; joust tree clean.

**What jt4-1 is.** The first story of epic jt4 (game-loop mechanics). It introduces ONE new module — `joust/src/core/game.ts` — a *session layer above the sim*: `GameState { players: [{score, lives, out}], gover, wave, sim }` plus `stepGame`, which WRAPS the existing `stepDemo` (`joust/src/core/demo.ts`) and DRAINS its already-emitted score events (`joust.killScore`, `egg.eggScoreEvents`, `ptero.pteroScoreEvent`) into per-player 6-digit BCD registers. Today those events are emitted and thrown away — this closes that drain.

**RED targets (the 4 ACs — pin each red first):**
1. `game.ts` + `stepGame` wraps `stepDemo`, drains kill/egg/ptero events into per-player registers with **NO second stepping path** (the jt2-1 one-sim seam); purity guard sweeps `game.ts`.
2. `SCRHUN`/`SCRTEN` tens/hundreds-**BACKWARDS** layout pinned by test (a value crossing the tens/hundreds boundary lands in the ROM's byte order); `DVALUE` ladder (Bounder 500 / Hunter 750 / Shadow Lord 1500 / Ptero 1000 *derived*) drives kill values; **claims entries** for both.
3. **Two independent ledgers** — a P1 kill never moves P2's score; the derived ptero-1000 and the SCRTEN quirk pinned with provenance flagged (pass-through, NOT re-derived).
4. Determinism — a seeded run's per-player total replays bit-for-bit; no wall-clock/Math.random in core.

**Cite, don't re-derive.** Ground truth is the machine-gated dossier: `SCRHUN/SCRTEN` layout `JOUSTRV4.SRC:7340-7366`; `DVALUE` bytes `JOUSTRV4.SRC:5563-5577`. Both are already in the story context + epic YAML — quote them fully-qualified (the jt1-8 rule: never bare `:N`). Add new claims to `joust/docs/rom-study/claims/` and keep the citations suite green.

**Watch-outs for the phase:** the SCRTEN-backwards byte order and the ptero-1000 are the two caveated values — accumulate them faithfully, flag provenance, don't "correct" them. `game.ts` is core → the purity scanner sweeps it the moment it lands (no shell import, no clock, no ambient entropy). Context of record: `sprint/context/context-story-jt4-1.md` + the epic design `docs/superpowers/specs/2026-07-22-joust-jt4-epic-design.md`.

**Phase:** finish → red. **Next:** Leeloo (TEA).

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `tests/helpers/game-contract.ts` — the `GameModule` seam TEA states + Dev builds: `decodeDvalue` (SCRHUN/SCRTEN), `scoreToBcd` (DSCORE byte order), `creditScoreEvents` (the per-player drain), `createGame`/`stepGame` (wraps `stepDemo`). `loadGame()` gives a clean per-test "feature absent" RED.
- `tests/game.test.ts` — the behaviour suite (AC-1..4), 14 tests, each naming the mutant it kills.
- `tests/game-source.test.ts` — the provenance suite: re-derives SCRHUN/SCRTEN (`JOUSTRV4.SRC:7340-7366`) + the DVALUE ladder (`:5563-5577`) via the independent reader; JT41 claim coverage. `skipIf(!vendoredAvailable)` for CI.

**Tests Written:** 22 tests covering 4 ACs.
**RED evidence (direct `npx vitest run`, authoritative — not via the confabulating haiku runner):** `17 failed | 5 passed`. Every failure is "game module not built yet" or "no JT41 claim"; the 5 passes are the pure-source ROM assertions (the vendored source is present). No compile/typo reds — clean RED for the right reason. Committed `89dfd05` on `feat/jt4-1-bcd-scoring-core`.

**The ROM law Dev must honour (the one genuinely new transcription):**
- **SCRHUN** (`:7346`) = thousands|hundreds forwards: `$15`->1500, `$10`->1000.
- **SCRTEN** (`:7357`) = tens|hundreds **BACKWARDS** (`:7353` "TENS & HUNDREDS BCD DIGIT (BACKWARDS)"): high nibble is tens (`ANDA #$F0` "SCORE TENS", `:7360`), low nibble is hundreds (`ANDB #$0F`, `:7361`). `$57`->**750** (NOT 570), `$05`->500.
- Ladder (`:5563-5577`): bounder SCRTEN `$05`->500, hunter SCRTEN `$57`->750, shadow lord SCRHUN `$15`->1500, ptero SCRHUN `$10`->1000 (DERIVED). Pin these **pass-through** — `decodeDvalue` must equal the already-gated `killScore`/`PTERO_SCORE`, not a fresh literal.
- Register = normal BCD (the DAA add, `:7362-7366`); only the SCRTEN *input digit* is backwards. `scoreToBcd(1250)` = `[$00,$12,$50]` (ROM byte order).
- New claims: `docs/rom-study/claims/game.json`, ids `JT41-NNN` (NOT `JT4-*` — jt1-4/arena owns those; `"JT41".startsWith("JT4")` is the collision trap).

**Two blocking seams surfaced (see Delivery Findings):** (1) score events lack player attribution — `stepGame` must attribute the kill to the joust winner; (2) the drain must consume the per-frame delta, not the 32-capped rolling `sim.events` log (once-only).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 falsy-valid `0` (`\|\|` vs `??`) | AC-1 zeroed ledgers + AC-4 "no phantom score" (score `0` must survive) | failing |
| #3 exhaustive union (`SCRHUN`/`SCRTEN`) | AC-2 both routines exercised | failing |
| #2 `readonly` params (no mutation) | AC-1 "does not mutate its argument" | failing |
| #8 test quality (no vacuous asserts) | Phase-C self-check below | n/a |

**Rules checked:** the 3 of 8 lang-review rules unit-testable in a pure sync core module before code exists have AC coverage; the rest (#1 type escapes, #5 module, #6 React, #7 async) are Dev static-review concerns or N/A to this module.
**Self-check:** reviewed all 22 tests for vacuous assertions. The two JT41 guard tests (id well-formedness, verbatim byte-gate) are vacuous-in-RED by design (no JT41 claims exist yet) but activate meaningfully on GREEN; the load-bearing JT41 *coverage* test is properly RED. No other vacuous assertions.

**Handoff:** To Korben (Dev) for GREEN.

## Dev Assessment

**Implementation complete.**
**Tests:** 1406/1406 passing (GREEN) — 22 new jt4-1 tests; `tsc --noEmit && vite build` clean; the citation checker verifies 797 claims (JT41-001..004 included). Committed `feat/jt4-1-bcd-scoring-core`, pushed to origin.

**Files changed (joust):**
- `src/core/game.ts` (new) — the session layer: `GameState`, `PlayerLedger`, `GameScoreEvent`, `decodeDvalue`, `scoreToBcd`, `creditScoreEvents`, `createGame`, `stepGame`.
- `src/core/demo.ts` — additive `player?` on the score `DemoEvent`; `collisionPass` attributes each kill to the scoring player (see Design Deviation).
- `src/core/egg.ts`, `src/core/dissolve.ts` — the "accumulation jt4 / display jt5" prose sweep.
- `docs/rom-study/claims/game.json` (new) — JT41-001..004, byte-verified against `JOUSTRV4.SRC:7346/7357/7360/7361`.

**AC accountability:**

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 — `game.ts` + `stepGame` wraps `stepDemo` (one sim), drains registers, purity sweeps `game.ts` | DONE | `stepGame(createGame(SEED)).sim` deep-equals `stepDemo(createWaveDemo(SEED))`; `game.ts` in `src/core/` so the one purity scanner covers it (suite green). |
| AC-2 — SCRHUN/SCRTEN backwards + DSCORE byte order + DVALUE ladder | DONE | `decodeDvalue` (SCRHUN fwd, SCRTEN tens\|hundreds backwards), `scoreToBcd(1250)=[$00,$12,$50]`; ladder re-derived from `JOUSTRV4.SRC:5563-5577`; JT41 claims byte-verified. |
| AC-3 — two independent ledgers; derived values pass-through | DONE | `creditScoreEvents` credits only the scoring player's ledger; `decodeDvalue` equals `killScore`/`PTERO_SCORE` (not fresh literals). |
| AC-4 — determinism + no wall-clock/Math.random | DONE | Two 200-frame seeded runs deep-equal; purity scanner green; no phantom score in a kill-less opening. |

**Design notes for the Reviewer (Zorg):**
- The one sim change is ADDITIVE attribution (`player?` on the score event) — logged as a minor Design Deviation. No second stepping path; `stepGame` delegates all stepping to `stepDemo`.
- The once-only drain uses a reference-set diff of the capped event log (see the non-blocking Delivery Finding — worth an eyeball).
- `lives`/`out`/`gover` are jt4-2 / jt4-4 placeholders (lives 0, out false, gover -1 = "running") — the co-op shape is born here but those semantics are later stories.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer) for code review.

## Subagent Results

| # | Subagent | Received | Status | Findings | Decision |
|---|----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | GREEN 1406/1406, tsc+vite clean, 797 citations verified; 1 smell (`fcb!` non-null, game-source.test.ts:132) | CONFIRMED — folded into the TEST finding |
| 2 | reviewer-edge-hunter | Skipped | disabled | self-assessed: scoreToBcd saturation/clamp + empty-events + nibble edges covered | N/A |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | self-assessed: `?? PLAYER1_ID` fallback never fires in jt4-1 (all kills carry player); NaN→[0,0,0] silent (see SEC note) | N/A |
| 4 | reviewer-test-analyzer | Yes | findings | **BLOCKING** mutation-proven gap: 3 mutations (misattribution / dedupe-drop / drain-disconnect) all leave the suite green — no real-kill test through stepGame | CONFIRMED [TEST] — the REJECT |
| 5 | reviewer-comment-analyzer | Skipped | disabled | self-assessed: the "accumulation jt4 / display jt5" prose sweep is accurate; game.ts header cites correct ROM lines | N/A |
| 6 | reviewer-type-design | Skipped | disabled | self-assessed: the `as Extract` cast is sound (filter-guarded); `readonly` matches demo.ts precedent; type-predicate a nice-to-have | N/A |
| 7 | reviewer-security | Yes | findings | 2 LOW, non-reachable: scoreToBcd(NaN) silent [0,0,0]; decodeDvalue digit not byte-validated. No vulnerabilities. | CONFIRMED [SEC] — non-blocking hardening |
| 8 | reviewer-simplifier | Skipped | disabled | self-assessed: game.ts is tight — no dead code, no over-engineering | N/A |
| 9 | reviewer-rule-checker | Yes | findings | 17 rules / 61 instances / 2 violations — both test-code nits (`fcb!` :132; `catch(e)` cast = pre-existing 13-file convention). Code rule-compliant; purity 73/73; ROM math verified. | CONFIRMED [RULE] — fcb! folded in; catch(e) noted as pre-existing |

**All received:** Yes (4 enabled returned; 5 disabled self-assessed).

## Reviewer Assessment (round 1 — REJECTED, superseded by round 2 below)

**Verdict:** REJECTED (superseded — the rework closed this; see round 2)

**Independently verified (VERIFIED, with evidence):**
- ROM transcription is faithful — re-derived `decodeDvalue` against `JOUSTRV4.SRC:7340-7366` myself: SCRTEN `$57`→750 (`ANDA #$F0` high nibble = tens ×10, `ANDB #$0F` low = hundreds ×100), SCRHUN `$15`→1500. Ladder ($05/$57/$15/$10 → 500/750/1500/1000) matches `killScore`/`PTERO_SCORE` pass-through. Claims byte-verified (797 checked).
- The attribution WIRING is correct by inspection — `collisionPass` winner = the surviving player for a scoring kill (`demo.ts:669`), credited once; the code works. The defect is that **no test proves it.**
- Purity clean (game.ts swept, 73/73); `??` not `||`; `.js` extensions; sound cast.

**Blocking finding:**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [TEST] HIGH | Story's core behaviour is mutation-provably unguarded: 3 mutations of `game.ts` (hardcode `player:PLAYER1_ID`; drop `!prior.has(e)` dedupe; replace `creditScoreEvents(...)` with `game.players`) each leave the full 1406-suite GREEN. AC-1/AC-3/AC-4 are pinned only via `creditScoreEvents` with hand-built events, never through `stepGame` + a real kill. | `tests/game.test.ts` (AC-3 ~lines 130-149, AC-4 ~174-193) | TEA: add a `stepGame` integration test — step `createGame(0x1234)` with active flap input until `game.sim.events` has a `'score'` event (kill fires ~frame 252), assert the scoring player's ledger increased by the exact value and the other stayed 0, then step further and assert NO re-credit (guards the dedupe). This mutation-kills all three. |
| [RULE]/[TEST] LOW | Non-null assertion `fcb!.operands[1]` on a nullable `parseStatement` result — source drift throws an opaque TypeError instead of a clean assertion failure. | `tests/game-source.test.ts:132` | Guard it: `expect(fcb).not.toBeNull()` before, or `fcb?.operands`. Fix in the same rework. |

**Non-blocking (may fold into the rework, not required):**
- [SEC] `scoreToBcd(NaN)`→silent `[0,0,0]`; `decodeDvalue` unvalidated digit — non-reachable today (finite ROM/sim integers only). Optional `Number.isFinite` guard + `digit & 0xff`.
- Style: a type-predicate filter in `stepGame` would drop the `as Extract` cast.
- Noted, not actioned: the `catch(e){(e as Error).message}` in `game-contract.ts:166` is the repo-wide `loadX` convention (13 files) — pre-existing, out of scope for this story.

**Design deviations:** 1 audited — the additive `player` attribution on `demo.ts`'s score event → ACCEPTED (sound; correct by inspection).

**Rationale for REJECT:** the code is correct, but this project's discipline is explicit — a green that survives a plausible wrong fix is not a guard, and here three plausible wrong fixes (including deleting the drain entirely) survive the whole suite. The story's headline feature ships unguarded. One integration test closes it.

**Handoff:** Back to Leeloo (TEA) for the RED-rework — add the `stepGame` real-kill integration test (+ the `fcb!` guard), then re-flow TEA → Dev → Reviewer.

## Dev Assessment (rework round 1)

**Response to the REJECT — all findings addressed. Commit `d87dcae`, pushed.**

- **[TEST] BLOCKING (the coverage gap) — RESOLVED.** Added AC-3 **integration** tests in `tests/game.test.ts` that drive a REAL kill through the full wiring (`collisionPass` winner attribution → `stepGame` event-diff → `creditScoreEvents`): a **P2 kill** (input `{2: flap(-1)}`, fires ~frame 145 at SEED 0x1234) must credit ONLY ledger 1, exactly once (60 frames later still 500); a **P1 kill** (`{1: flap(1), 2: flap(-1)}`) mirrors to ledger 0. **Mutation-verified with a `cp`-backup harness** (not `git checkout`): the exact three mutations the Reviewer named now each redden the suite — hardcode `player:PLAYER1_ID` → 1 fail, drop `!prior.has(e)` → 1 fail, disconnect `creditScoreEvents` → 3 fail; CONTROL restored → 16/16 green. Also strengthened the AC-4 determinism run to use the kill-producing input so its per-player comparison is non-vacuous (was `[0,0]==[0,0]`), with an explicit `some(p.score>0)` non-vacuity guard.
- **[RULE]/[TEST] LOW (`fcb!` non-null) — RESOLVED.** `tests/game-source.test.ts:132` now `expect(fcb).not.toBeNull()` before the derivation — source drift fails as a clean assertion.
- **Style (drop the cast) — APPLIED.** `stepGame` uses a type-predicate filter `isFreshScore` instead of `as Extract<...>`; a future `DemoEvent`-shape drift is now a compile error.
- **[SEC] non-blocking (scoreToBcd NaN / decodeDvalue digit range) — DEFERRED with rationale.** Both are non-reachable today (every caller passes finite ROM literals / sim-computed integer sums); adding `Number.isFinite`/`& 0xff` guards would introduce unreachable branches. Left as the documented non-blocking Delivery Findings rather than gold-plating jt4-1.
- **Noted, not actioned:** the `catch(e){(e as Error).message}` convention (`game-contract.ts:166`) is the repo-wide `loadX` pattern across 13 files — out of scope for this story (the Reviewer concurred, "low unique actionability").

**Tests:** full suite **1408/1408** (was 1406; +2 integration tests); `tsc --noEmit && vite build` clean; 797 citations verified.

**Handoff:** Back to Jean-Baptiste Emanuel Zorg (Reviewer) for re-review.

## Subagent Results (re-review, round-trip 1)

| # | Subagent | Received | Status | Findings | Decision |
|---|----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (carried) | clean | full suite 1408/1408, tsc+vite clean, 797 citations — re-confirmed by test-analyzer's full-repo run + my own diff read | CONFIRMED clean |
| 4 | reviewer-test-analyzer | Yes (re-run) | **VERIFIED CLOSED** | independently re-applied all 3 mutations (cp-backup): A hardcode-P1 → RED, B dedupe-drop → RED (30500≠500), C drain-disconnect → 3 RED; control 24/24 green; tree clean. New tests non-vacuous + correctly discriminating. | BLOCKING finding RESOLVED |
| 7 | reviewer-security | Carried | resolved/deferred | the `as` cast note is now moot (rework replaced it with a type-predicate); the 2 NaN/digit notes remain non-reachable → deferred non-blocking (accepted) | No blocker |
| 9 | reviewer-rule-checker | Carried | resolved | rule #1 `fcb!` finding → FIXED (guarded with `expect(fcb).not.toBeNull()`); the cast is gone; `catch(e)` is the pre-existing 13-file convention (out of scope) | No blocker |
| 2,3,5,6,8 | edge/silent/comment/type/simplify | Skipped | disabled | self-assessed unchanged; the type-predicate is a net simplification | N/A |

**All received:** Yes.

## Reviewer Assessment

**Verdict:** APPROVED

**Round 2 (post-rework re-review).** The round-1 REJECT — a mutation-proven coverage gap where the scoring drain could be deleted with the suite staying green — is CLOSED and independently verified.

**Data flow traced:** a real kill in the sim → `collisionPass` attributes it to the winning player (`demo.ts:669` enemy / `:702` ptero) → `stepGame`'s reference-diff picks the fresh score event once → `creditScoreEvents` credits that player's ledger (safe because the winner of a scoring kill is always a player, and the frame-delta diff drains each event exactly once).

**Independently verified (evidence):**
- The three mutations that survived round 1 now each redden the suite — re-run by test-analyzer with a cp-backup harness: hardcode-`PLAYER1_ID` → RED, drop-dedupe → RED (30500≠500), disconnect-`creditScoreEvents` → 3 RED; control 24/24 green; `git diff src/core/game.ts` clean after.
- A P2 kill (input `{2: flap(-1)}`, ~frame 145 @ SEED 0x1234) credits only ledger 1 by the exact value, ledger 0 stays 0, and 60 further frames don't re-credit — the co-op independence and once-only drain proven end-to-end. P1 mirror confirms attribution isn't stuck on one ledger.
- Full suite 1408/1408; tsc+vite clean; 797 claims byte-verified; purity 73/73. ROM transcription (SCRHUN/SCRTEN backwards, the DVALUE ladder) independently re-derived against `JOUSTRV4.SRC:7340-7366` / `:5563-5577` in round 1.

**Findings disposition:** [TEST] blocking → RESOLVED (mutation-verified). [RULE] `fcb!` → RESOLVED (guarded). Cast/style → RESOLVED (type-predicate). [SEC] NaN/digit-range → non-reachable, deferred non-blocking (accepted). `catch(e)` convention → pre-existing, out of scope. One new non-blocking note from test-analyzer: the integration tests are timing-coupled to the deterministic sim (fixed 60-frame window) — a false-FAILURE-only risk, acceptable brittleness for an end-to-end sim test; recorded, not actioned.

**Design deviations:** 1 — the additive `player` attribution on the sim's score event → ACCEPTED (sound; now guarded by the integration test).

**Handoff:** To Ruby Rhod (SM) for finish-story.