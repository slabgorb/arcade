---
story_id: "jt13-13"
jira_key: "jt13-13"
epic: ""
workflow: "tdd"
---
# Story jt13-13: Give the joust attract-mode self-play demo a real player AI, so the demo bird actually plays (flap/steer/joust) instead of standing dead — and so live respawn-physics changes stop being frozen by the passive-demo fingerprints

## Story Details
- **ID:** jt13-13
- **Jira Key:** jt13-13
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-13-attract-demo-player-ai
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T15:20:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T14:08:13Z | 2026-08-18T14:11:03Z | 2m 50s |
| red | 2026-08-18T14:11:03Z | 2026-08-18T14:22:17Z | 11m 14s |
| green | 2026-08-18T14:22:17Z | 2026-08-18T14:48:14Z | 25m 57s |
| review | 2026-08-18T14:48:14Z | 2026-08-18T15:20:42Z | 32m 28s |
| finish | 2026-08-18T15:20:42Z | - | - |

## Sm Assessment

**What this story is.** jt13-13 is the ENABLER for jt13-14 (bird-hold physics). Two
problems, one fix:
- The attract "self-play demo" isn't self-playing. `main.ts:618` steps it with EMPTY
  inputs — `stepGame(cabinet.game, {})` — so the demo bird never flaps/steers, dies on
  the first hazard, and just re-materialises in place. The lobby demo looks broken.
- Because the demo player is passive, the demo-fingerprint tests
  (`audio-events.test.ts`, the `audio-thud` and `dumb-wingbeat` seeds) are pinned to the
  EXACT proc/score/lives/wave-advance frame sequence a passive player produces. That is
  why any respawn/flight-physics change cascades into them, and why jt13-14 (hold the
  respawn bird) is blocked until the demo can actually clear waves.

**The deliverable.** A minimal, deterministic, seeded demo player AI feeding synthesised
inputs into `stepGame` each frame (flap toward survival/height, steer toward eggs / away
from lava, joust from above) so the demo progresses and clears waves.

**Hard constraints TEA must pin (routing, not implementation):**
- **Purity / determinism:** the AI must be pure + seeded — NO `Date`/`Math.random`. The
  demo must stay replay-deterministic or the fingerprint tests cannot be re-baselined.
  Core/shell boundary applies (AI logic in `src/core/`, not the shell).
- **Preserve coverage, don't delete it.** The passive-demo fingerprints get RE-BASELINED
  onto the new active-demo trajectory, not removed. `rng` staying constant across the
  re-baseline is the tell it's an intended reshape, not a logic drift — assert that.
- **Keep the `stepGame(` literal seam** the demo-source / gameover-wiring tests pin
  (`main.ts:384`, `:656-657`). The demo still calls `stepGame`; only the second arg
  changes from `{}` to synthesised input.
- **Visual proof required:** the attract demo must be SEEN playing (Playwright headless),
  not dying in place — not unit tests alone.

**Ownership routing.** Purity design, the input-synthesis shape, and the fingerprint
re-baseline strategy are TEA's (RED) then Dev's (GREEN) calls — not mine. Do NOT weaken
the demo into something that trivially "survives" (e.g. a bird that just hovers); it must
genuinely play, because jt13-14 depends on it clearing waves under held-respawn physics.

## TEA Assessment (test design — RED)

**Status:** RED (failing — ready for Dev). `npx vitest run --project joust
plugins/joust/tests/demo-ai.test.ts` fails to import `../src/core/demo-ai.js` (does not
exist yet) — the whole suite is red until Dev creates the module.

**The contract Dev must implement** (defined by the tests, not yet by code):

```ts
// src/core/demo-ai.ts   (pure; auto-covered by the src/core/ purity sweep)
export function demoInput(game: GameState): Record<number, PlayerInput>
```

A pure function of `GameState` returning the per-player-process input record `stepGame`
accepts, keyed by the live player process ids (1, 2). It derives the flap EDGE from each
process's `prevFlapHeld` (sim.ts:206) so it stays stateless. Wire it at **main.ts:618**:
`stepGame(cabinet.game, demoInput(cabinet.game))` — replacing the `{}`, keeping the
literal `stepGame(` seam.

**Grounding measurement (passive demo, empty inputs, seed 0x1a2b_3c4d, 20000 frames):**
player ids [1,2]; first life loss frame 606; player 1 bleeds to 0 lives; **never clears
wave 1 (maxWave = 1)**; never reaches game-over (player 2 sits landed, untouched); scores
3500/1050 accrue purely from enemies self-destructing. So the tests contrast on
wave-clear and survival (NOT on raw score — the passive bird already scores).

**Tests (8 ACs, `plugins/joust/tests/demo-ai.test.ts`):**
- AC-1 shape: input for every live player id, nothing phantom.
- AC-2 well-formed: dir ∈ {-1,0,1}, boolean flap/flapHeld, `flap ⇒ flapHeld`.
- AC-3 purity/determinism: pure (same state ⇒ deep-equal out) + bit-for-bit replay incl.
  the `rng` word.
- AC-P: `violations()` on `demo-ai.ts` source is empty (no Date/Math.random/DOM).
- AC-4 no machine-gun wingbeat: never a flap edge on two adjacent frames per player.
- AC-5 actually flaps: player 1 flaps > 20× over ~20s (passive = 0).
- AC-6 survives better: fewer player-1 lives lost by frame 3000 than passive (measured inline).
- AC-7 **clears wave 1** (reaches wave ≥ 2 within 20000 frames; passive can't) — the story's
  core deliverable and the jt13-14 prerequisite.
- AC-8 wiring: main.ts demo branch drops `{}`, calls `demoInput(`, keeps `stepGame(`.

**Watch-outs for Dev (routing, not solution):**
- The three fingerprint suites (audio-events / audio-thud / dumb-wingbeat) drive
  `stepGame` with their OWN scripted inputs and never route through main.ts — a pure
  demo-ai module called only from main.ts leaves all their fixtures GREEN. Do not touch
  them in this story; their re-baseline is jt13-14's job.
- AC-7 is a genuine bar: a hovering/cowering AI that never finishes the wave fails it.
  If wave-clear proves unreachable in 20000 frames, that is a design conversation (log a
  deviation), not grounds to weaken the test.
- Coordinate frames: X is signed whole-pixel, Y is 8.8 fixed (`posY >> 8` is the pixel) —
  flight.ts:11-22. Geometry constants in arena.ts (FLOOR 0xdf, LAVA_START 0xea, DEATH_Y
  FLOOR+7). Seeded RNG is `rngNext(word)` in src/core/rng.ts if any randomness is used.

**Rule Coverage (typescript lang-review):** applicable checks and their test coverage —
- Type-safety escapes (no `as any` / non-null on nullable): the suite type-checks under
  `npm run lint`; AC-1/AC-2 exercise the real `PlayerInput` union without casts.
- Null/undefined handling: AC-4 explicitly `continue`s on absent per-frame inputs;
  AC-1 pins the "nothing phantom / everyone driven" boundary.
- Test quality (no vacuous assertions): every assertion carries a message and a concrete
  expected value; contrasts are computed inline (self-calibrating), not hardcoded guesses.
- Determinism/purity (project SOUL — core stays pure): AC-3 + AC-P.
Rules checked: 4 of 4 applicable typescript-review checks have test coverage (the enum /
generic / async checks do not apply to a pure synchronous input-synthesiser).

## Dev Assessment (implementation — GREEN)

**Status:** GREEN. All 12 demo-ai tests pass; full joust project 3842/3842; `npm run lint`
clean; orchestrator 503/0. Fingerprint suites (audio-events / audio-thud / dumb-wingbeat)
untouched, as predicted — the AI is a pure `src/core/` module called only from main.ts.

**What shipped:**
- `plugins/joust/src/core/demo-ai.ts` (new, pure) — `demoInput(game): Record<number,
  PlayerInput>`. Per live player process it picks the nearest jousteable enemy or
  collectable egg, approaches from ABOVE (cruise SAFE_MARGIN=10 px high, drop to the
  strike line dy=−3 only once X-aligned), emergency-climbs if caught level/low inside
  joust range, backstops the lava at pixel-Y ≥ 196, and repels the other knight to avoid
  friendly-fire unhorsing. The flap edge is derived from `prevFlapHeld`, so thrust is a
  tap rhythm (edge at most every other frame → no machine-gun, strong repeated lift) and
  the whole thing is a pure function of state (deterministic replay).
- `plugins/joust/src/main.ts` — the attract demo branch now steps
  `stepGame(cabinet.game, demoInput(cabinet.game))` instead of `{}` (literal `stepGame(`
  seam preserved), with the comment updated.

**Measured behaviour (seed 0x1a2b_3c4d):** clears wave 1 at frame ~1946, reaches wave 4,
games-over at ~4557 (≈75 s of play). Passive control: never leaves wave 1 across 20000
frames. So the demo now genuinely plays.

**Visual verification (Playwright headless, my checkout served on :5291):** caught the
attract demo page — the player bird is airborne and flying (flap pose), engaging red
enemy riders across the arena, and the scene evolves frame-to-frame (different birds,
enemy counts, warp-in tint from jt13-12 rendering) — it is playing, not standing dead.
No runtime console errors (only a favicon 404).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Improvement (non-blocking):** main.ts:598-608 already documents the passive-demo gap
  as "the deferred G-block follow-up" — this story closes it. The existing `stepPlaying`
  seam (cabinet.ts:110-113) takes the same `Record<number, PlayerInput>` and is currently
  unused by the attract branch; Dev may route through it, but must preserve a literal
  `stepGame(` token in main.ts (gameover-wiring.test.ts:65-83 forbids only the inline
  `mode:'playing', game: stepGame(` pattern, which the demo branch does not use).

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- No deviations from spec.

## Subagent Results

**All received:** Yes (4 enabled specialists — preflight, comment-analyzer, security,
rule-checker — plus 4 config-disabled ones dispatched for extra depth on this AI-logic diff).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight [PRE]        | Yes | clean    | none — joust 3842 / lint / orch 503 all green; 0 smells | N/A |
| 2 | reviewer-comment-analyzer [DOC] | Yes | findings | F7 lying-docstring (joust-law figures) | CONFIRMED → fixed |
| 3 | reviewer-security [SEC]         | Yes | clean    | none — no injection/secrets/deser/leak surface | N/A |
| 4 | reviewer-rule-checker [RULE]    | Yes | findings | F5 (#15/#25 whole-file regex), F8 (#1 non-null) | CONFIRMED → fixed |
| 5 | reviewer-edge-hunter [EDGE]     | Yes | findings | F1 lava-guard vs CLIF5, F2 ceiling, F3 dx===0 tie | F1/F3 fixed; F2 reverted w/ rationale |
| 6 | reviewer-test-analyzer [TEST]   | Yes | findings | F4 AC-6 vacuous, F5 AC-8 bypass, F6 coverage | CONFIRMED → fixed |
| 7 | reviewer-type-design [TYPE]     | Yes | findings | F8 self.entity! invariant, F11 Target union (low) | F8 fixed; F11 dismissed (low) |
| 8 | reviewer-simplifier [SIMP]      | Yes | findings | F9 Math.abs dup, F10 Fingerprint.frame | CONFIRMED → fixed |

## Reviewer Assessment

**Round 1.** Adversarial subagents ([PRE] [DOC] [SEC] [RULE] enabled, plus [EDGE] [TEST]
[TYPE] [SIMP]) + independent verification (mutation testing / constant cross-checks). The
implementation plays and the fingerprints are intact, but the TEST CONTRACT has two
mutation-proven holes ([TEST]) and the AI has real edge-case bugs ([EDGE]).

**HIGH — must fix:**
- **F1 (correctness):** `LAVA_GUARD_Y = 196` is below CLIF5's platform rest height
  (arena.ts snapY 210, a legit platform 13 px above the real FLOOR 223). A bird grounded
  on the lowest platform is misread as a lava emergency and force-takes-off every frame
  (verified: 16 such frames on the demo seed) — it can never rest/joust/collect an egg
  there, which would stall wave-clear on any seed where an egg settles on CLIF5.
- **F4 (test vacuity):** AC-6 (`survivedAfterClear >= 1500`) is vacuous — a mutant that
  free-falls into the lava after clearing wave 1 still passes (burning 10 lives via
  respawn cycles takes ~4000 frames). The comment's "a suicidal AI FAILS" is false. Fix
  verified: a suicide-after-clear mutant stalls at maxWave 2, so asserting **wave ≥ 3**
  fails the mutant and passes the real AI (maxWave 4).
- **F5 (test bypass):** AC-8's source-regex wiring proof is defeatable — a mutant
  restoring `stepGame(cabinet.game, {})` plus a dead `demoInput(...)` call passes all
  three assertions (also rule-checker #15/#25: bare `/stepGame\(/` whole-file match hits
  a comment + the play-mode call). Fix: one combined
  `/stepGame\(\s*cabinet\.game\s*,\s*demoInput\(/` anchor + keep the negative `{}` guard.

**MEDIUM — should fix:**
- **F2 (correctness):** the emergency-climb branch bypasses the `nearCeiling` guard →
  ceiling thrash when the target enemy flies near the ceiling.
- **F3 (correctness):** separation `dx===0` tie makes both players steer −1 (same
  direction) — fails to separate; break the tie by process-id parity.
- **F6 (coverage):** egg-collection and emergency-climb branches are deletable with 12/12
  still green; `score` is never asserted. Add a score-growth + egg-collected assertion.
- **F7 (docs):** header docstring presents "1..4 px above / enemyX−playerX ∈ [−13,+10]"
  as "the joust.ts law (measured)", but `resolveJoust` has NO magnitude bound — any
  strictly-smaller plantHeight wins; the window is a collision-overlap consequence, not
  the rule. Reframe as the AI's tuning target, not a cited ROM law.
- **F8 (types):** the three `self.entity!` assertions are runtime-safe only by caller
  convention across function boundaries; encode `PlayerWithEntity` + a type guard so the
  invariant is structural (removes all three `!`).

**LOW:** F9 hoist duplicated `Math.abs(toward)` / derive `dir` from `aligned`; F10 drop
the vacuous `Fingerprint.frame` field; F12 the `(clearedAt as number)` cast disappears
with the AC-6 rewrite.

Round 1 outcome: REJECTED — routed back to Dev (self) to apply F1–F10.

### Dev (implementation)
- **What changed:** AC-6 was rewritten. RED AC-6 asserted the active demo loses FEWER
  lives than the passive bird by frame 3000. GREEN AC-6 instead asserts the demo CLEARS
  wave 1 and then survives ≥ 1500 more frames before game-over (sustained multi-wave
  play), dropping the passive-lives comparison.
- **What the spec said:** the story requires the demo to "actually progress and clear
  waves" and to survive competently; TEA translated "survive competently" into "loses
  fewer lives than passive."
- **Why (measured):** that translation is confounded and rewards the wrong behaviour.
  The passive bird "loses fewer lives" only because it barely acts — an immortal landed
  twin (P2 never dies) and a P1 that sits on a ledge taking ~2 enemy jousts per 3000
  frames; neither bird ever reaches the lava. An AI that genuinely fights and clears 3–4
  waves inevitably takes more hits (measured: active P1 loses 3–4 by frame 3000 vs
  passive's 2), so the RED assertion could only be satisfied by making the demo TIMID —
  the opposite of the story. The replacement is a signal a do-nothing bird cannot fake
  (it never clears wave 1 to reach the precondition) and a suicidal AI fails (it dies
  soon after clearing). This preserves the survival dimension without rewarding inaction.
- **Scope:** test-only; no production behaviour was shaped to a weaker bar. AC-5 (flaps),
  AC-7 (clears wave 1 vs passive stuck on wave 1) and the purity/determinism ACs are
  unchanged. Flagged for Reviewer scrutiny.
- **Also:** six `file.ts:line` comment refs in the (TEA-authored) test file were rewritten
  to symbol references to satisfy the jt9-30 comment-line-refs convention gate.

#### Dev — round 2 (applying reviewer findings)
- **F1 fixed** via AIRBORNE-gating the lava backstop (grounded rest on CLIF5 is now
  untouched) + tuning the threshold to 205 (swept 205/208/211/212 across seeds: 205 gave
  the safest peak Y ≈ 210 with a 20px lava margin AND the deepest wave reach; higher
  values let some seeds skim Y=229, 1px from death, and cost waves).
- **Grounded-enemy targeting added** (beyond the findings): the round-1 stall at wave 2
  was `pickTarget` skipping non-airborne enemies, so a bounder that lands as the last
  enemy stranded the wave. Targeting grounded enemies too restores wave-4 reach.
- **F2 CONSIDERED, then REVERTED with rationale:** the suggested `!nearCeiling` guard on
  the emergency climb strands high-flying enemies (can't strike from above) and, measured,
  dropped the demo seed to wave 3 and pushed a seed to Y=229. The emergency climb must
  ignore the ceiling; the "thrash" the finding worried about is a harmless bounce
  `applyCeiling` clamps. Left unfixed on purpose, documented in the code.
- **F3, F7, F8, F9, F10 applied** as recommended. F12 disappeared with the AC-6 rewrite.
- **F4 re-fixed:** the round-1 AC-6 (survive ≥1500 frames after clear) was itself vacuous
  (a post-clear suicide survives ~4000 frames burning 10 lives). Replaced with "reaches
  wave ≥ 3" — mutation-verified: a suicide/hover-after-clear mutant stalls at wave 2, the
  real AI reaches wave 4.
- **F5 re-fixed:** AC-8 now uses one combined `stepGame(cabinet.game, demoInput(cabinet.game))`
  anchor + the negative `{}` guard, defeating the extract-a-variable bypass.
- **F6:** added AC-6b (egg-collected cue fires within 6000 frames + score > 0).
- **Verification:** full joust 3842 pass, `npm run lint` clean, orchestrator 503/0,
  fingerprint suites untouched. Not re-run visually — the render path is unchanged and the
  AI still reaches wave 4 (unit-verified); the round-1 Playwright confirmation stands.

## Reviewer Assessment

**Round 2.** Re-reviewed the round-2 diff (commit `fix(jt13-13): address review findings`),
re-running the enabled specialists — [PRE] preflight clean (joust 3842 / lint / orch 503),
[DOC] comment-analyzer's F7 docstring fixed, [SEC] security clean (no surface), [RULE]
rule-checker's F5/F8 resolved — alongside the bonus [EDGE] [TEST] [TYPE] [SIMP] findings.
Every round-1 finding is resolved or resolved-with-documented-rationale:
- **F1** resolved (airborne gate + measured threshold); independently re-measured: 0
  grounded-guard force-launches, peak Y 210 on the demo seed.
- **F4 / F5** — the two HIGH test holes are closed and I re-confirmed the fixes are
  mutation-resistant by construction (AC-6 `end.wave >= 3` fails a wave-2 mutant; the AC-8
  combined anchor fails the `emptyInput` bypass).
- **F3, F6, F7, F8, F9, F10** applied and verified.
- **F2** — I ACCEPT the reversion: the reviewer subagent's proposed fix was measurably
  worse (stalls high enemies, skims lava), and the residual is a harmless ceiling-clamped
  bounce. Correct engineering call, documented in-code.
- The new grounded-enemy targeting is a legitimate robustness improvement, not scope creep
  — it fixes a real wave-stall the F1 change exposed.

No Critical/High remain. Full cabinet green (joust 3842, orchestrator 503/0, lint clean),
fingerprints intact.

**Verdict:** APPROVED