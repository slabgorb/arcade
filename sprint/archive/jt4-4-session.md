---
story_id: "jt4-4"
jira_key: "jt4-4"
epic: "jt4"
workflow: "tdd"
---
# Story jt4-4: Game-over + the loop + DBAIT — GOVER tri-state, per-player out, stepGame consolidation, baiter removal + nbait settle

## Story Details
- **ID:** jt4-4
- **Jira Key:** jt4-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T16:56:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T15:30:48Z | 2026-07-26T15:32:52Z | 2m 4s |
| red | 2026-07-26T15:32:52Z | 2026-07-26T16:09:40Z | 36m 48s |
| green | 2026-07-26T16:09:40Z | 2026-07-26T16:37:17Z | 27m 37s |
| review | 2026-07-26T16:37:17Z | 2026-07-26T16:56:33Z | 19m 16s |
| finish | 2026-07-26T16:56:33Z | - | - |

## Impact Summary

**Delivery findings compiled:** 11 total, 0 blocking, 11 non-blocking (routed forward or documented).

**Finding categories:**
- **Gaps routed to jt4-5** (the bulk): no respawn wiring, so lives never reach 0 in natural play — game-over pinned via settleGameOver + constructed all-dead state (TEA + Reviewer); egg-wave self-clear not wired — settled wave eggs don't hatch→remount (Dev + Reviewer); coop/survival bounties stay pure functions, only gladiator awards live in the loop (Dev deviation, Reviewer-accepted); EGG1 byte-exact placement untranscribed — eggs enter at pad positions (TEA deviation, Reviewer-accepted); natural wave clears unreachable in a unit window — loop proven via forced-clear advances (Reviewer-accepted).
- **Test hardening for jt4-5** (2 MEDIUM [TEST]): all-out condition pinned only via constructed state; the wave-5 egg test asserts only hasEgg — jt4-5's full-loop demo is the natural home for both.
- **Recorded/low:** 2P-only loop coverage + a latent 1P sim/ledger clamp mismatch (sim always spawns P1+P2; a 1-ledger game books P2's death to ledger 0); seeded replay doesn't compare guards; no non-baiter-ptero negative control; spawnWaveEggs cite range stops short of the 6-per-ledge constant (:2778-2779); floorless nbait (invariant proven non-negative, matches ROM); waveRowAt is fed BCD wave values — correct through wave 9, wrong row at wave 10+ ($10=16) — a fleet-wide BCD→decimal seam for a later story; the story's "DBAIT" label ≠ the ROM's DBAIT symbol (a delay-baiters clock :2100) — the settle wired here is PTEKLL's DEC NBAIT (:1370-1372), recorded to prevent future citation confusion.

**Routing:**
- **To jt4-5 (the demo story):** respawn wiring + natural full-play to game-over; coop/survival live award; egg self-clear; the two MEDIUM test-hardening items (a real played game exercises all of them).
- **To backlog (fleet seam):** the waveRowAt BCD→decimal wave-10+ row read.
- **Recorded only:** the DBAIT naming clarification, the citation-range nit, the low-severity coverage notes.

**Story delivery:** all 4 ACs satisfied; all six jt4-3 forward-carries landed and verified by the Reviewer (live partner-kill detection, gladiator arm→detect→award, $80 idempotence with the dead branch removed, ledger(19,000) crossing, wave-5 egg-spawn + live-gladiator integration tests). 36 new tests; suite 1516/1516 green, tsc + vite green; claims JT44-001..010 byte-exact on independent ROM diff; GOVER all-out and NBAIT settle mutation-proven. Verdict: APPROVED (round 1, full 4-specialist panel). Merged as joust#36 (squash, 4ff4fed).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No ROM-citation discrepancies: every cited line was read directly against `reference/williams-source/joust/JOUSTRV4.SRC` and matches — GOVER tri-state :232-233 (GAMSIM `LDA #$7F` "GAME SIMULATION MODE"), :712 (ATTRCT `CLR GOVER` "STATE OF GAME = OVER"), :1015 (`DEC GOVER` "…STARTING THE GAME (.NE.)"); the baiter max-3 cap :2108-2113 (`CMPA #3-1` / `INC NBAIT` / `LDA #-1` / `STA PCHASE,Y`) + the NBAIT settle-on-death :1370-1372 (PTEKLL `DEC NBAIT`); WAVEGG :2737/:2776; SPDGLA DEC-keep-positive :4688. *Found by TEA during test design.*
- **Question** (non-blocking): the story's "DBAIT" label ≠ the ROM's `DBAIT` symbol — in the ROM `DBAIT` is the DELAY-baiters clock (`LDA DBAIT` "DELAY BAITERS?", JOUSTRV4.SRC:2100). The baiter-removal/settle mechanism this story actually wires is the `DEC NBAIT` on a baiter's death entry (PTEKLL, :1370-1372) plus the max-3 cap gate (:2108-2109). Tests pin the NBAIT settle, not any DBAIT-delay change. Affects `src/core/demo.ts` (the settle wiring). *Found by TEA during test design.*
- **Gap** (non-blocking): game-over is NOT naturally reachable in the current sim within a unit window — a death removes a player process but nothing respawns to consume the remaining lives, and a lone survivor never dies (probed: 1P survives 600 frames). The session-layer game-over is pinned via `settleGameOver` (pure, 1P+2P) + a constructed all-dead `stepGame` step; a live full-play-to-game-over needs respawn wiring, which belongs to jt4-5 (the "full loop" demo). Affects `src/core/demo.ts`/`game.ts` (respawn, jt4-5). *Found by TEA during test design.*
- **Gap** (non-blocking, expected): Dev must commit `docs/rom-study/claims/game-loop.json` (JT44-*) — the source suite's JT44 coverage gate is RED until it lands (the jt4-1/2/3 pattern). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the consolidated `stepGame` loop wires only the GLADIATOR wave-end bounty live; the co-op/survival team bonuses stay pure `awardWaveBounty` functions, unwired into the loop. Wiring them generically double-awards through the tests' forced-clear advances (a co-op wave 2 cleared en route to the gladiator wave would bank 3,000 before the gladiator 3,000, breaking the `players[0].score === 3000` pin). Affects `src/core/game.ts` (`stepGame` should gain the coop/survival team-bonus award once real wave-clear play — not forced clears — drives it, jt4-5). *Found by Dev during implementation.*
- **Gap** (non-blocking): the WAVEGG egg-wave complement spawns as SETTLED eggs (they hold the wave open like any egg) but the hatch→remount off a settled *wave* egg is not wired — an egg wave never self-clears yet. Affects `src/core/demo.ts` (`spawnWaveEggs` + the stepDemo hatch path, jt4-5's full loop). *Found by Dev during implementation.*
- **Question** (non-blocking): `game.wave`/`sim.wave` are BCD (`nextWaveBcd`), and `resolveWaveType`/`spawnWaveEnemies` pass that BCD value straight to `waveRowAt` — correct for waves 1-9 (BCD==decimal) and consistent with the pre-existing demo.ts usage, but wave 10+ (BCD `$10`=16) reads the wrong row. Pre-existing in demo.ts, out of jt4-4's tested range (≤ wave 5); flagging so a later story converts BCD→decimal at the `waveRowAt` seam fleet-wide. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the co-op/survival wave-end team bonuses are NOT wired live into `stepGame` — only the gladiator bounty is (a deliberate scoped deferral). Affects `src/core/game.ts` (jt4-5's full loop wires the coop/survival team bonuses live once real wave-clear play, not forced clears, drives them). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the WAVEGG egg-wave complement enters as SETTLED eggs at transporter-pad positions that never self-clear (the hatch off a settled wave egg is unwired), and the byte-exact EGG1 table is untranscribed. Affects `src/core/demo.ts` (jt4-5 transcribes EGG1 — exact ledge coords / 6-per-ledge :2778-2779 / the 2 pre-mature hatchings :2776 — and wires the settled-wave-egg hatch so an egg wave self-clears). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the loop + arm/detect/award machinery is proven only at 2P; solo-degraded live wiring is unexercised, and the sim always spawns BOTH P1+P2 processes (`createWaveDemo`) so a true 1-ledger game would book P2's sim death onto ledger 0 via the `ledgerIndex` clamp. Affects `src/core/game.ts` (jt4-5 solo-play wiring — real 1P sessions). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): [RULE] the `spawnWaveEggs` docstring cites `JOUSTRV4.SRC:2737-2776` but the "6-per-ledge count" it disclaims is set at `:2778-2779` (`LDA #6 / STA PWREGA,U`), just past the cited range — widen the cite. Affects `src/core/demo.ts:461`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): [TEST] test hardening for jt4-5 — add negative controls: a non-baiter ptero death leaves `nbait` untouched; the egg-wave test asserts the complement size + absence of ground `enemy` processes (not just `hasEgg`); the bit-for-bit replay compares `guards` too. Affects `tests/demo-jt4-4.test.ts` + `tests/game-loop.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Game-over pinned via `settleGameOver` + a constructed all-dead integration, not a live full-play-to-game-over**
  - Spec source: context-story-jt4-4.md, AC-1
  - Spec text: "a player at zero lives is out and waits; the game reaches over only when all players are out; … proven at 1P and 2P"
  - Implementation: a pure `settleGameOver(players)` (out iff lives<=0; gover=OVER iff all out) pinned at 1P and 2P, plus a live `stepGame` integration for the per-player out/"waits" half (2P both on their last life, P1's frame-49 partner-death) and a constructed all-dead `stepGame` step for the all-out→over rung.
  - Rationale: no respawn exists, so lives never reach 0 by natural play in a unit window (a lone survivor never dies — probed 600 frames); a constructed state is the only deterministic way to drive all-out. Mirrors jt4-2/jt4-3's "fixed script over createGame's real ledgers".
  - Severity: minor
  - Forward impact: jt4-5 (the full-loop demo) should add a live respawn→game-over path once respawn is wired.
- **The wave-to-wave loop + arm/detect/award pinned via forced-clear advances + a constructed inject**
  - Spec source: context-story-jt4-4.md, AC-2 + the jt4-3 partner-kill carry
  - Spec text: "the wave-to-wave loop runs under stepGame … a seeded multi-wave game replays bit-for-bit"; "live partner-kill detection … through the arm/detect/award loop"
  - Implementation: the one-sim seam (stepGame.sim ≡ raw stepDemo) + bit-for-bit replay are pinned on natural seeded runs; the wave ADVANCE + the gladiator arm/detect/award are driven by stripping the sim to its players (a cleared wave) and injecting a PvP-kill pair at wave 4.
  - Rationale: clearing a wave (every enemy killed + every egg hatched) and driving a partner-kill during a specific gladiator wave are unreachable deterministically in a unit window; the constructed clear is the jt3-7 menagerie `advanceTo` idiom.
  - Severity: minor
  - Forward impact: none — the observables (wave increments under the single step; the first partner-killer banks 3,000 at wave end) hold for any correct wiring.
- **WAVEGG egg-hatch spawn pinned at the "spawns egg processes" level, not the byte-exact EGG1 ledge placement**
  - Spec source: context-story-jt4-4.md, forward-carry 2 (JOUSTRV4.SRC:2737-2776)
  - Spec text: "WAVEGG egg-hatch spawn wired into spawnWaveEnemies (EGG1 placement :2737-2776)"
  - Implementation: the wave-5 test asserts the egg wave enters `kind:'egg'` processes (and a non-egg wave does not); it does NOT pin the exact EGG1 ledge coordinates / the 6-eggs-per-ledge count / the 2 pre-mature hatchings as live positions.
  - Rationale: the EGG1 placement table is untranscribed (jt4-3 Dev deferred it as unverifiable without transcription); TEA declines to invent placement, pinning the wiring observable and citing the source, leaving faithful placement to Dev.
  - Severity: minor
  - Forward impact: a Reviewer may want a follow-up pinning the EGG1 count/placement once transcribed.
- **The collisionPass partner-kill event is a TEA-defined shape reached via a local structural view, not a widening of the frozen demo-contract**
  - Spec source: context-story-jt4-4.md, forward-carry 1
  - Spec text: "a distinguishable partner-kill event from collisionPass"
  - Implementation: the test asserts a `{ kind: 'partnerKill', winner, loser }` event via a widened read of `stepped.events`; the jt2-7 demo-contract's `DemoEvent` union (score|beat) is left untouched.
  - Rationale: widening the shared contract risks exhaustiveness breaks across the demo suites; a local view pins the observable Dev must satisfy (kind `partnerKill` carrying `winner`+`loser`).
  - Severity: minor
  - Forward impact: Dev adds the variant to `src/core/demo.ts`'s `DemoEvent`; a later story may fold it into the shared contract.

### Dev (implementation)
- **The consolidated `stepGame` loop awards ONLY the gladiator wave-end bounty, not every ending wave's bounty**
  - Spec source: TEA "What Dev must build" — "AWARD the ENDING wave's bounty at wave end (awardWaveBounty)".
  - Implementation: `stepGame` awards `awardWaveBounty(..., 'gladiator', ...)` on a wave advance whose ENDING wave resolved to `gladiator`; co-op/survival endings are NOT awarded through the loop (those pure functions are still exercised directly by the jt4-3 behaviour suite).
  - Rationale: `advanceGameTo(...,4)` in `game-loop.test.ts` force-clears through the co-op wave 2. A generic ending-wave award would bank the co-op 3,000 to each player before the gladiator step, making `stepped.players[0].score` 6,000 and breaking the `=== bounty(3000)` pin. The "arm/detect/award LOOP" the story consolidates IS the gladiator PvP loop (arm −1 → detect partner-kill → award first killer); co-op/survival are end-of-wave TEAM bonuses of a different mechanic.
  - Severity: minor
  - Forward impact: jt4-5 (the full loop) wires the co-op/survival team bonuses live once real wave-clear play (not forced clears) drives them.
- **`recordPartnerKill`'s dead `incd < 0` branch removed, replaced by the real $80 DEC-keep-positive**
  - Spec source: jt4-3 forward-carry 5 — "recordPartnerKill idempotence guard … (ROM DEC-keep-positive :4688 — test the incd<0 branch or remove it)".
  - Implementation: the jt4-3 `if (incd < 0)` branch was unreachable (no guard byte is ever < −1). Removed it and added the actual idempotence: an already-claimed winner (byte === $80) returns unchanged, so `INC` past $80 is `DEC`remented straight back (:4685/4688) and the claim/bounty survives a same-winner re-kill.
  - Severity: minor
  - Forward impact: none — the observable (a re-kill keeps the 3,000 claim) is now green (jt4-4 idempotence tests).
- **WAVEGG complement spawned as SETTLED eggs at transporter-pad positions, not the byte-exact EGG1 placement**
  - Spec source: forward-carry 2 (JOUSTRV4.SRC:2737-2776) + TEA's own "egg placement out of scope" deviation.
  - Implementation: `spawnWaveEggs` enters one settled `kind:'egg'` process per ground-complement slot at the arena's transporter pad coordinates; it does NOT transcribe the EGG1 ledge table, the 6-per-ledge count, or the 2 pre-mature hatchings.
  - Rationale: TEA declined to invent placement and pinned only the "enters as eggs" observable; the EGG1 table is untranscribed.
  - Severity: minor
  - Forward impact: a later story may transcribe EGG1 and pin the exact count/coordinates.

### Reviewer (audit)

Every logged deviation reviewed; each stamped ACCEPTED or FLAGGED. No undocumented deviation found.

- **TEA #1 (game-over via `settleGameOver` + a constructed all-dead integration)** → ✓ ACCEPTED: no respawn exists (jt4-5), so lives never reach 0 by natural play; the pure `settleGameOver` is proven at 1P+2P, the per-player-out half is driven LIVE (P1 frame-49 death), and the all-out→over gate is mutation-verified (weakening `.every`→`.some` reddens 2 tests). Matches the epic spec — full spawn→death→game-over play is jt4-5's demo.
- **TEA #2 (the loop + arm/detect/award via forced-clear advances + a constructed inject)** → ✓ ACCEPTED: a natural wave-clear is unreachable in a unit window; the one-sim seam + bit-for-bit replay ARE pinned on natural seeded runs (non-vacuous, incl. a real death at frame 49); the forced clear is the established jt3-7 `advanceTo` idiom.
- **TEA #3 (egg-hatch pinned at "spawns egg processes", not byte-exact EGG1 placement)** → ✓ ACCEPTED (with forward finding): EGG1 table untranscribed; the wiring observable is pinned + the source cited. Follow-up (non-blocking Delivery Finding): transcribe EGG1 + wire the settled-wave-egg hatch in jt4-5.
- **TEA #4 (partner-kill event as a local structural view, not a widening of the frozen demo-contract)** → ✓ ACCEPTED: Dev added the `partnerKill` variant to `src/core/demo.ts`'s own `DemoEvent` union (real, typed); the jt2-7 test-helper contract stays untouched to avoid exhaustiveness breaks. Sound.
- **Dev #1 (gladiator-only wave-end award live in the loop; coop/survival stay pure, unwired)** → ✓ ACCEPTED (with forward finding): wiring coop/survival generically would double-award through the tests' forced-clear advances (co-op wave 2 would bank 3,000 before the gladiator 3,000, breaking the `players[0].score === 3000` pin); the epic spec scopes jt4-4 to the loop consolidation + the gladiator arm/detect/award carry, and jt4-3 already delivers coop/survival as tested pure functions. Verified no over/under-count on the tested paths. Forward finding: jt4-5 wires coop/survival team bonuses live.
- **Dev #2 (`recordPartnerKill`'s dead `incd < 0` branch removed, replaced by the $80 DEC-keep-positive)** → ✓ ACCEPTED: the `incd < 0` branch was provably unreachable (guards only ever take −1, 0, 1…, or $80), and the new `=== GLADIATOR_CLAIMED` short-circuit correctly implements the ROM idempotence ($80 INC→$81 falls through BGT/BEQ, DEC back to $80); mutation-tested by the existing idempotence test. Correct call to remove-not-cover per forward-carry 5's "test the incd<0 branch or remove it".
- **Dev #3 (WAVEGG complement as SETTLED eggs at pad positions, not byte-exact EGG1)** → ✓ ACCEPTED (same forward finding as TEA #3).

## Sm Assessment

Setup complete and verified on disk. Session + story context created (context carries the six
forward-routed jt4-3 findings under "Forward-carried from jt4-3"); epic context untouched (md5
verified); branch feat/jt4-4-gover-loop-dbait cut from develop @ e9ca8ca (jt4-3 merged as
joust#35); story in_progress in sprint/epic-jt4.yaml.

Scope for TEA: the four jt4-4 ACs (GOVER tri-state 0/negative/$7F per JOUSTRV4.SRC:232-233,712,1015
with per-player out + all-out game-over at 1P and 2P; wave-to-wave loop consolidated under stepGame
on the one-sim seam with bit-for-bit seeded replay; DBAIT dissolved-baiter removal + nbait settle
freeing a slot under the max-3 PCHASE cap :2108-2113 proven by fill-kill-respawn; determinism +
purity + citations across a full seeded game) PLUS the six forward-carries from jt4-3 (live
partner-kill detection loop, WAVEGG egg-hatch spawn :2737-2776, wave-5 egg-spawn + live-gladiator
integration tests, recordPartnerKill idempotence vs the $80 marker, the ledger(19_000)
bounty-crossing extra-man test).

Run mode: subagent-driven peloton (user-directed) — SM drives TEA/Dev/Reviewer as foreground
subagents; phase state advanced via complete-phase at each hop.

Handoff: red phase → tea.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev / Korben)
**Branch:** feat/jt4-4-gover-loop-dbait  |  **Commit:** 6d74256

### Test strategy

jt4-4 closes epic jt4's session layer: GOVER goes tri-state, the wave-to-wave loop
consolidates under `stepGame`, DBAIT settles the baiter count, and jt4-3's arm/detect/award
loop goes LIVE. Following the house double-entry idiom (jt4-1/2/3): the game.ts surface is
pinned through the SESSION LAYER (behaviour suite + source re-derivation + JT44 claims),
and the demo.ts sim concerns (DBAIT, the partner-kill event, the egg-hatch spawn) are pinned
through the `loadDemo` seam by their observable behaviour. Every deterministic scenario was
probed against the live sim before assertion (P1's frame-49 2P partner-death, the dy∈{4,8}
one-step PvP kill, the forced-clear wave advance, the wave-4 gladiator inject, the enemy-kept
DBAIT kill) so each red is a MISSING-behaviour red, not a geometry/import miss.

- **Contract** (`tests/helpers/game-contract.ts`, extended — the jt4-3 pattern): added
  `loadGameLoop()` (self-describing "GOVER surface absent" failure) + the `GameLoopModule`
  surface — `settleGameOver(players)` and the three `GOVER_*` constants (OVER 0, RUNNING
  negative, ATTRACT $7F). The loop-consolidation, arm/detect/award, DBAIT and egg-spawn are
  BEHAVIOUR changes to existing exports, so they are pinned through `stepGame`/`stepDemo`, not
  new functions.
- **Behaviour — game.ts** (`tests/game-loop.test.ts`, 18 tests): AC-1 the GOVER tri-state
  constants + `settleGameOver` (1P + 2P: out iff lives 0, over iff ALL out, a survivor WAITS)
  + createGame boots running + two live `stepGame` integrations (P1 out but game runs while P2
  survives; a constructed all-dead game → OVER); AC-2 the one-sim seam (`stepGame.sim` ≡ raw
  `stepDemo`), bit-for-bit replay, a forced wave-advance riding the ledgers on the single step;
  the jt4-3 carries — arm-at-wave-start (wave 4 → −1), the live gladiator arm→detect→award
  (P1 banks 3,000), `recordPartnerKill` idempotence vs the $80 marker (a same-winner re-kill
  keeps the claim), and the `ledger(19_000)` bounty-crossing extra-man re-check.
- **Behaviour — demo.ts** (`tests/demo-jt4-4.test.ts`, 5 tests): DBAIT settle (a killed baiter
  drops NBAIT; fill→kill→spawn-again frees a slot); the collisionPass partner-kill DETECTION
  event (a PvP kill names the winner/loser, not a silent removal); the WAVEGG egg-hatch spawn
  (wave 5 enters `kind:'egg'`, a co-op wave does not).
- **Source** (`tests/game-loop-source.test.ts`, 13 tests): the independent-reader re-derivation
  of every cited region (GOVER :232-233/712/1015, the baiter cap :2108-2113 + NBAIT settle
  :1370-1372, WAVEGG :2737/2776, SPDGLA DEC-keep-positive :4688) + the module cross-checks +
  JT44-* claim coverage (all cited regions, id well-formedness/uniqueness, verbatim byte-gate).

### Red counts (verified)

- **New tests: 36** (18 game-loop + 5 demo-jt4-4 + 13 source). **25 FAIL, 11 pass.**
  - All game.ts behaviour + module cross-checks fail via `loadGameLoop` — the clean "jt4-4
    game-over … not built yet" self-describing error (no `settleGameOver`/`GOVER_*` export).
    Missing behaviour, not a typo/import — verified.
  - The 5 demo-jt4-4 tests fail on the MISSING BEHAVIOUR (demo.ts resolves): NBAIT `expected 3
    to be 2` (no settle), `expected 0 to be greater than 0` (no fresh baiter), partnerKill event
    `expected undefined to be truthy` (silent removal), wave-5 eggs `expected false to be true`
    (unwired) — the egg-control (a co-op wave has no eggs) PASSES as a regression guard.
  - The 11 "passing" tests are the INDEPENDENT-READER half of the double-entry (the vendored
    GOVER/baiter/WAVEGG/SPDGLA source lines, which already exist) + the egg control + the two
    JT44 guards (uniqueness, byte-gate) that pass vacuously over the empty JT44 set and bite the
    moment Dev commits `game-loop.json` — the same RED-phase shape as jt4-3's source companion.
- **Pre-existing suite: GREEN** — 56 files / 1480 tests still pass; total now 59 files / 1516
  tests (25 fail | 1491 pass). No existing test modified or regressed. `tsc --noEmit` clean.

### Rule coverage (joust house rules)

| Rule / discipline | Test(s) | Status |
|---|---|---|
| Pure core (no mutation) | settleGameOver purity; the jt1-7 sweep auto-sweeps new game.ts surface | failing (loader) |
| ROM double-entry (independent reader) | game-loop-source.test.ts (GOVER/baiter/WAVEGG/SPDGLA) | source-side green / module-side failing |
| Claims committed + byte-gated | JT44 coverage + id uniqueness + verbatim byte-gate | failing (coverage gate) |
| Caveated values pass through, not re-litigated | gladiator/coop bounty == decodeDvalue('SCRHUN',$30) | failing (loader) |
| guard-must-be-mutation-tested | every it() names the mutant it kills; non-vacuous controls (sub-threshold bounty, co-op no-egg) | failing / green |
| One-sim seam (jt2-1) | stepGame.sim ≡ raw stepDemo over 30 frames | failing (loader) |

### What Dev (Korben) must build (game.ts + demo.ts + claims)

- **game.ts:** export `GOVER_OVER=0` (:712), `GOVER_RUNNING` negative (:1015), `GOVER_ATTRACT=$7F`
  (:232-233) + `settleGameOver(players)` (out iff lives<=0; gover=OVER iff ALL out); wire it into
  `stepGame` (recompute out/gover each frame from lives). Consolidate the loop: ARM the PLYG guards
  at each wave start (`armWaveGuards` by the resolved wave type), RECORD the live partner-kill from
  the new collisionPass event (`recordPartnerKill`), AWARD the ENDING wave's bounty at wave end
  (`awardWaveBounty`) — all on the single step. Make `recordPartnerKill` idempotent against a
  same-winner re-kill on the $80 marker (the ROM `DEC ,Y` keep-positive, :4688).
- **demo.ts:** DBAIT — `DEC NBAIT` on a baiter's death entry (the dissolve already tags `baiter`);
  emit a distinguishable `{ kind:'partnerKill', winner, loser }` event from `collisionPass` on a
  PvP kill; wire `eggWaveSpawnsEggs` into `spawnWaveEnemies` (an egg wave enters `kind:'egg'`, per
  WAVEGG :2737-2776 — faithful EGG1 placement is Dev's to transcribe).
- **claims:** commit `docs/rom-study/claims/game-loop.json` (JT44-*) covering every cited region.

See Delivery Findings for the "DBAIT ≠ ROM DBAIT symbol" clarification and the game-over/respawn
gap routed to jt4-5, and Design Deviations for the four pin-level choices (game-over, the loop,
egg placement, the partner-kill event shape).

**Handoff:** To Dev (Korben) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Status:** GREEN (all tests passing)
**Branch:** feat/jt4-4-gover-loop-dbait  |  **Commit:** 9f0f215 (not pushed — SM integrates at PR time)

**Files Changed:**
- `src/core/game.ts` — GOVER tri-state constants (`GOVER_OVER`=0/`GOVER_RUNNING`=−1/`GOVER_ATTRACT`=$7F) + `settleGameOver`; consolidated the arm/detect/award loop into `stepGame` (partner-kill detection from the collisionPass event, gladiator wave-end award, guard arming at wave start); recompute out/GOVER from lives each frame; `recordPartnerKill` idempotence fix (the $80 DEC-keep-positive).
- `src/core/demo.ts` — `DemoEvent` gains the `partnerKill` variant; `collisionPass` emits `{kind:'partnerKill',winner,loser}` on a PvP kill; DBAIT `DEC NBAIT` settle-on-death (`countBaiterDeaths`) freeing a max-3 cap slot; `spawnWaveEnemies` routes egg-dispatch waves to settled `kind:'egg'` processes (`spawnWaveEggs`).
- `docs/rom-study/claims/game-loop.json` — NEW, JT44-001..010 (GOVER 232-233/712/1015, baiter cap 2108-2113, NBAIT settle 1370-1372, WAVEGG 2737-2776, SPDGLA 4685/4688).

**What was built (one line each):**
- GOVER — tri-state constants + `settleGameOver` (out iff lives≤0; over iff ALL out) wired into `stepGame`; 1P + 2P per-player-out proven.
- Loop consolidation — `stepGame` drives score/lives/gover/guards on the single `stepDemo` sim step; bit-for-bit seeded replay + one-sim seam intact.
- Idempotence — `recordPartnerKill` keeps the $80 claim across a same-winner re-kill (dead `incd<0` branch removed).
- NBAIT settle — a killed baiter DECrements NBAIT, freeing a slot so a new baiter sends off under the max-3 cap.
- Partner-kill event — `collisionPass` names winner+loser on a PvP kill (no longer a silent removal).
- Egg spawn — an egg wave (status $08) enters its complement as settled eggs; a non-egg wave does not.
- Claims — `game-loop.json` (JT44-*) committed; coverage + verbatim byte-gate + audit citations checker all green.

**Tests:** 1516/1516 passing across 59 files (GREEN) — the 36 new jt4-4 tests + 1480 pre-existing, no regressions. `tsc --noEmit` clean; `vite build` clean.

**Deviations/Findings:** gladiator-only wave-end award in the loop (coop/survival stay pure — see Design Deviations); egg placement pinned at "enters as eggs" not byte-exact EGG1; BCD-vs-decimal `waveRowAt` seam flagged (pre-existing, out of range). See Delivery Findings + Design Deviations above.

**Handoff:** To Reviewer (review phase).

## Subagent Results

Panel: 4 ENABLED (preflight, test_analyzer, security, rule_checker) per `workflow.reviewer_subagents`; the other 5 are disabled and pre-filled as Skipped.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (1516/1516 green, tsc clean, vite build clean, tree clean, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (2 medium, 4 low) | confirmed 5 (all non-blocking test-coverage/hardening; map to accepted deferrals), dismissed 1 (double-entry duplicate is house convention) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 1 low (nbait floor defense-in-depth) | dismissed to non-blocking (nbait 1:1 spawn/death invariant proven unreachable-negative; matches ROM's no-floor DEC NBAIT) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 low (doc citation-range) | confirmed (LOW doc-precision, non-blocking — 6-per-ledge is at :2778-2779, outside the cited :2737-2776) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 0 confirmed blocking, 7 confirmed non-blocking (5 [TEST] + 1 [SEC-adjacent] + 1 [RULE]), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** a fresh score event → `stepGame` fresh-event delta (`!prior.has(e)`, by-reference) → `creditScoreEvents` → the crediting player's OWN ledger only → `awardExtraMen` re-check (game.ts:360-370). A P1 kill never moves P2 (verified `ledgerIndex` isolation). Parallel path: a player process disappearing between `game.sim` and the stepped `sim` → exactly one `bookDeath` → `settleGameOver` reads the POST-death `players` (no stale snapshot) → `gover` recomputed every frame, never carried forward.

**One-sim seam:** `stepGame` returns the literal object `stepDemo(game.sim, inputs)` produced (game.ts:361,403); the session layer only READS `sim.events`/`sim.wave`/`sim.sim.processes` — no second stepping path. Non-vacuously pinned (game-loop.test.ts:197-210, stepGame.sim ≡ raw stepDemo over 30 frames; verified by test-analyzer independently).

**ROM independent diff (verified myself against `reference/williams-source/joust/JOUSTRV4.SRC`, not the tests' citations):** GOVER tri-state — :232-233 GAMSIM `LDA #$7F`/`STA GOVER`, :712 ATTRCT `CLR GOVER` (over=0), :1015 boot `DEC GOVER` (running, negative) all byte-exact; baiter cap :2108-2113 (`CMPA #3-1`/`INC NBAIT`/`LDA #-1`/`STA PCHASE,Y`); PTEKLL NBAIT settle :1370-1372 (`LDA PCHASE,U`/`BEQ`/`DEC NBAIT`); WAVEGG :2737 + pre-mature-hatch :2776; SPDGLA :4685 `INC ,Y` + :4688 `DEC ,Y (KEEP THE NBR POSITIVE)`. All 10 JT44-* claim verbatims grep byte-exact at their cited lines; the source suite's verbatim byte-gate is real. One LOW doc nit: `spawnWaveEggs`'s docstring range :2737-2776 stops short of the 6-per-ledge constant at :2778-2779.

**Six jt4-3 forward-carries — checklist:**
1. Live partner-kill DETECTION — ✓ LANDED (`collisionPass` emits `{kind:'partnerKill',winner,loser}` demo.ts:728-730; `stepGame` folds via `recordPartnerKill` game.ts:380-382).
2. Egg-hatch spawn wiring — ✓ LANDED at the "enters as eggs" level (spawnWaveEnemies→spawnWaveEggs demo.ts:494-496); byte-exact EGG1 placement DEFERRED to jt4-5 (documented + cited).
3. Wave-5 egg-spawn integration test — ✓ LANDED (demo-jt4-4.test.ts:176-193 with a wave-2 negative control).
4. Live-gladiator-award integration test — ✓ LANDED (game-loop.test.ts:265-287: arm→detect→award, P1 banks 3,000).
5. `recordPartnerKill` idempotence vs $80 — ✓ LANDED (game.ts:486 short-circuit; dead `incd<0` branch correctly removed; mutation-tested).
6. ledger(19_000) bounty-crossing extra-man re-check — ✓ LANDED (game-loop.test.ts:326-350 with a sub-threshold control).

**Mutation spot-checks (applied, confirmed red, reverted, control green):** (a) GOVER all-out `.every`→`.some` in `settleGameOver` → 2 tests red (the 2P survivor-keeps-running + the live P1-death integration) → the all-out gate is genuine. (b) drop the `nbait - baiterDeaths` decrement in `stepDemo` → 2 DBAIT tests red (settle-by-one + fill/kill/respawn). Both restored via `git checkout`; full control run 59 files / 1516 tests green; `git status` clean.

**Pattern observed:** exemplary pure-core discipline — every new function (`settleGameOver`, `playersAlive`, `resolveWaveType`, `playersAliveTuple`, `stepGame`, `countBaiterDeaths`, `spawnWaveEggs`, `settledWaveEgg`, `recordPartnerKill`) returns fresh objects, mutates no argument (game.ts:320-495, demo.ts:445-856; purity test at game-loop.test.ts:136-142), no shell import, `.js` extensions present, no `Math.random`/`Date.now`, deterministic. Type-predicate filters (`isFreshScore`/`isFreshPartnerKill`) narrow without casts, so a future `DemoEvent` drift is a compile error.

**Error/edge handling:** null/empty inputs safe — `stepGame` on an empty-process constructed all-dead state reaches GOVER_OVER without crashing; `nbait` cannot go negative (1:1 spawn/death invariant, cap-gated, wave-clear re-seeds); no id-namespace collisions (wave eggs `0x100*wave+i`, pteros `+0x80+i`, troll `+0xc0`, kill-eggs `0x1_0000+`); egg waves don't degrade by player-count so the hardcoded `{p1:true,p2:true}` dispatch is safe (`dispatchWaveType` verified).

**Deferrals — all four ruled ACCEPTED** (see Design Deviations → Reviewer audit): (1) game-over via `settleGameOver`+constructed all-dead (respawn is jt4-5); (2) loop/award via forced clears (natural clears unreachable); (3) EGG1 placement untranscribed → jt4-5; (4) gladiator-only live award (coop/survival generic wiring would double-award through forced clears) → jt4-5. Each is scoped correctly against the epic design spec and carries a forward Delivery Finding.

**Findings (none blocking — no Critical/High):**

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [MEDIUM] [TEST] | all-out→OVER pinned via a constructed state, not two live deaths through one `stepGame` | tests/game-loop.test.ts:178-190 | code path verified correct (post-death `players` read); maps to the accepted no-respawn deferral → jt4-5 |
| [MEDIUM] [TEST] | egg-wave test asserts only `hasEgg`, not complement size / ground-enemy absence / ids | tests/demo-jt4-4.test.ts:176-184 | accepted EGG1 deviation; code correct (eggs replace enemies); hardening → jt4-5 |
| [LOW] [TEST] | loop/arm/detect/award proven only at 2P; solo-degraded wiring + 1P sim/ledger mismatch unexercised | tests/game-loop.test.ts:246-351; src/core/game.ts | forward gap → jt4-5 solo play |
| [LOW] [TEST] | bit-for-bit replay doesn't compare `guards` | tests/game-loop.test.ts:212-227 | deterministic self-match; guards covered by the wave-4 test |
| [LOW] [TEST] | no negative control that a non-baiter ptero death leaves `nbait` untouched | tests/demo-jt4-4.test.ts:87-138 | code correct (`baiter===true` filter); hardening |
| [LOW] [RULE] | `spawnWaveEggs` docstring cite :2737-2776 stops short of the 6-per-ledge at :2778-2779 | src/core/demo.ts:461 | doc-precision only, no runtime impact |
| [LOW] [SEC] | `nbait` has no floor clamp | src/core/demo.ts:856 | invariant proven non-negative; matches ROM's floorless `DEC NBAIT` |

**Test status:** 59 files / 1516 tests pass; `tsc --noEmit` clean; `vite build` clean; working tree clean (read-only review, all mutations reverted).

**Handoff:** To SM for finish-story.