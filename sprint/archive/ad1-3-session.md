---
story_id: "ad1-3"
jira_key: "ad1-3"
epic: "ad1"
workflow: "tdd"
---
# Story ad1-3: asteroids self-play attract demo — put a ship in the drifting rock field, then opt in

## Story Details
- **ID:** ad1-3
- **Jira Key:** ad1-3
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** none
- **PR:** none
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T16:15:00Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T15:21:09Z | 2026-08-06T15:24:28Z | 3m 19s |
| red | 2026-08-06T15:24:28Z | 2026-08-06T15:35:55Z | 11m 27s |
| green | 2026-08-06T15:35:55Z | 2026-08-06T15:58:06Z | 22m 11s |
| review | 2026-08-06T15:58:06Z | 2026-08-06T16:10:06Z | 12m |
| green | 2026-08-06T16:10:06Z | 2026-08-06T16:11:56Z | 1m 50s |
| review | 2026-08-06T16:11:56Z | 2026-08-06T16:15:00Z | 3m 4s |
| finish | 2026-08-06T16:15:00Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking): the attract render is not covered by an automated test.** The self-play
  is proven at the CORE level (attract-demo.test.ts), but drawing the demo ship in attract
  (shell/render.ts) is verified only by the house convention (eyeball / dev server — see
  render-wiring.test.ts's own note). The `just check-showcase-alive` liveness recipe now includes
  asteroids (roster derived from showcase:true), but it needs Playwright + a running server
  (manual, non-CI per uf1-20). The claude-in-chrome extension was unavailable this session, so I
  could not screenshot. Recommend the Reviewer/owner eyeball `/asteroids/` in the dev server or run
  the liveness recipe.
- **Improvement (non-blocking): the demo scores and advances waves in attract.** Because the demo
  reuses the full play step, `state.score`/`state.wave` grow while demoing. Harmless — the attract
  overlay shows the high-score board + PUSH START, and a start press deals a fresh game (score 0,
  wave 0) — but a Reviewer may want to confirm the attract HUD reads acceptably.

### Reviewer (code review)
- **Improvement** (non-blocking): the attract-demo render is proven only at the core level; the visible
  self-play in the carousel is eyeball/liveness territory. Affects `plugins/asteroids/src/shell/render.ts`
  (run `just check-showcase-alive` or eyeball `/asteroids/` before the owner cuts over). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Attract reuses the full play pipeline with an immortal demo ship**
  - Spec source: .session/ad1-3-session.md, AC1 (SM-derived)
  - Spec text: "In attract mode, the asteroids sim simulates a ship in the drifting rock field that self-plays deterministically (a demo controller, mirroring tempest's demoActive)"
  - Implementation: Extracted `stepPlay` from `stepGame` and ran it for the attract demo on `demoInput`, with `shipSpawnTimer` re-armed each frame (invulnerable) and mode coerced back to 'attract'; the demo therefore also scores, drives the wave director, and faces saucers — the real game on autopilot.
  - Rationale: Reusing the whole pipeline honors the repo's no-forked-mover rule and matches tempest's demoActive (which runs full stepPlaying); immortality keeps the showcase loop from stalling on a demo death.
  - Severity: minor
  - Forward impact: none
- **Rendered the attract ship (shell change beyond the core-only ACs)**
  - Spec source: .session/ad1-3-session.md, AC1 + epic ad1 (the showcase carousel frames each game's LIVE attract)
  - Spec text: "put a ship in the drifting rock field, then opt in"
  - Implementation: Dropped the `state.mode !== 'attract'` guard on the ship draw in `shell/render.ts` so the self-play ship is visible; the thrust flame stays keyed on player input (no flame for the demo's own thrust, since the showcase feeds NO_INPUT).
  - Rationale: A ship the renderer hides would make the carousel show shots from an invisible ship — the epic's whole point is a VISIBLE self-playing attract.
  - Severity: minor
  - Forward impact: none
- **Updated pre-existing A-16 "attract is inert" tests to the self-play contract**
  - Spec source: tests/collision.test.ts, tests/score.test.ts, tests/waves.test.ts, tests/showcase-liveness.test.mjs (A-16 / uf1-20 contract)
  - Spec text: "no bullet-vs-rock destruction outside playing mode" / "scores NOTHING in attract mode" / "does NOT spawn waves in attract mode" / "asteroids is showcase:false and must NOT be probed"
  - Implementation: Rewrote these to assert the new self-play contract (attract destroys+scores rocks, drives the wave director, and asteroids IS probed), keeping the still-valid gameover-inert and direct-`updateWaveDirector`-gated guards intact.
  - Rationale: They pin the A-16 "attract is an inert backdrop" contract that ad1-3 deliberately overturns — the same category TEA removed from modes.test.ts; leaving them would make GREEN impossible.
  - Severity: major
  - Forward impact: none

---

## Story Context (SM-Derived)

**Epic Intent:** Each ad1 story gives one game a real self-play attract demo, then flips `showcase: true` in that game's `plugins/<id>/plugin.ts` manifest. Reference implementation is tempest's `demoActive` self-play (story 10-3).

**Current State (Verified 2026-08-06):**
- `plugins/asteroids/plugin.ts:12` currently sets `showcase: false` — this story flips it to `true`
- Asteroids attract mode TODAY drifts rocks with NO ship
- Confirmed at `plugins/asteroids/src/shell/render.ts:420` ("In attract the ship is absent")
- Confirmed at `plugins/asteroids/src/core/sim.ts:142-179` (`stepAttract` — rocks drift through A-6 mover; no ship simulated)
- Asteroids core lifecycle: `attract | playing | gameover` (state.ts:113-114)
- Sim routes `attract` → `stepAttract` (sim.ts:271)

**Design Note:** The self-play demo lives in the CORE sim (deterministic), consistent with src/core vs src/shell purity boundary. Reference: tempest's `demoActive` in story 10-3.

**Showcase Liveness Gate Context:** The showcase liveness gate (uf1-20) is an ON-DEMAND `just check-showcase-alive` recipe (manual, NOT CI). Its target roster is derived from `showcase:true` manifests, so flipping asteroids auto-enrolls it. This is context only — not a CI blocker.

## Acceptance Criteria (SM-Derived from Measured Facts)

1. **Self-play demo in core:** In attract mode, the asteroids sim simulates a ship in the drifting rock field that self-plays deterministically (a demo controller, mirroring tempest's `demoActive`) — observable in the core sim state, not just the shell render.

2. **Seeded-demo testability:** The self-play demo is seeded-demo + control testable. A seeded attract run produces ship activity distinguishable from a nonsense control (per the "feature must be observed in play" rule) — not merely a synthetic transcription fixture.

3. **Opt-in preserved:** A real player start press still transitions attract → playing. The opt-in path at `input.ts`/`sim.ts` is preserved; the demo does not swallow the start button.

4. **Manifest opt-in:** `plugins/asteroids/plugin.ts` sets `showcase: true` (the only field changed; the setting is generated into the committed `src/host/registry.ts` via `npm run gen:registry` in the same commit).

---

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch; arcade repo has no feature-branch workflow)

---

## Sm Assessment

Setup complete for ad1-3 (3pt, tdd, epic ad1). The pointer read `setup` on arrival; NEW_WORK_STATE, board clear (no `feat/ad1-*` branch, a-3 was on mc2-2).

**Premise verified against the current tree — all epic claims TRUE, no stale facts to correct:**
- `plugins/asteroids/plugin.ts:12` = `showcase: false` (story flips to `true`).
- Asteroids attract drifts rocks with NO ship (`render.ts:420`, `sim.ts:142-179 stepAttract`).
- Core lifecycle `attract|playing|gameover` (`state.ts:113-114`); attract routes to `stepAttract` at `sim.ts:271`.
- Showcase liveness gate (uf1-20) is the MANUAL `just check-showcase-alive` recipe, roster derived from `showcase:true` manifests — auto-enrolls asteroids but is NOT a CI blocker. Do not scope around it.

**ACs are SM-DERIVED** — the story YAML carried no description and no acceptance_criteria (jt8-6 shape). Four ACs derived from epic intent + measured facts, marked as derived in the context. No ROM citations invented: the attract demo is a design choice referencing tempest's `demoActive` (10-3), not a pinned ROM constant. TEA should treat AC2 (seeded-demo + control observability) as the non-vacuity anchor per the "feature must be observed in play" rule.

**Claim pushed:** stamp+context on `origin main` (e3f96fd), empty `feat/ad1-3-asteroids-attract-self-play` branch pushed for sibling visibility. Local `main` upstream re-pinned to `origin/main` after the `-u` drift.

**Session hygiene:** added the `**Repos:** arcade` / `**Branch:** none` / `**PR:** none` fields sm-setup omitted — the trunk-based finish needs the literal Branch/PR lines.

Handing to TEA for the RED phase.
---

## Tea Assessment

RED established. 4 failing tests, all failing for the right reason (the attract ship is frozen at
center today: trace `64,4096,3072,0,0,0` — dir 64, dead-center, zero velocity, 0 bullets). Suite
on the rebased/merged tree: **4 failed | 884 passed**.

### The contract these tests pin
The story overturns the A-16 "attract is an inert backdrop" contract. ACs were SM-DERIVED (null in
the YAML), so I grounded the contract in the tempest `demoActive` reference (tempest 10-3) and the
epic intent, pinning it at the OBSERVABLE core-state level (through `stepGame`) — NOT a specific
controller module or heuristic, so Dev keeps design freedom:

- **AC1 self-play** — `tests/attract-demo.test.ts` "fires AND maneuvers …": over a 10s attract
  window with NO player input, the ship shoots ≥1 player bullet AND steers. (RED)
- **AC1 never auto-starts** — mode never enters `playing` across a NO_INPUT window (only `start`
  transitions). Passes now (frozen), guards Dev.
- **AC2 board-reactivity (non-vacuity control)** — a rock on the right vs the left yields DIFFERENT
  play (per the "feature must be observed in play" rule: a canned/constant demo would be byte-
  identical). (RED)
- **AC3 autonomy** — MASHED (all gameplay buttons held, start off) plays IDENTICALLY to NO_INPUT:
  held player buttons must not hijack the demo. Guard (passes now).
- **AC3 opt-in preserved** — run the demo 90 frames, THEN press `start` → a clean fresh `playing`
  game (score 0, lives≥1, empty field/bullets). Catches a naive impl that routes `start` through
  the demo controller and swallows it. Guard (passes now).
- **Determinism** — same seed+dt reproduces the run byte-for-byte, and it genuinely played
  (non-vacuous). (RED — currently vacuous because nothing happens.)
- **AC4 manifest opt-in** — `src/host/registry.test.ts` showcase roster now expects
  `[tempest, asteroids, battlezone, centipede]` (order follows the GAMES roster). (RED)

### Blast radius handled (not new behavior — the A-16 contract this story replaces)
`tests/modes.test.ts`: **removed** the two A-16 tests that asserted an inert attract ship ("ignores
every held gameplay input … inert" and "never collides or splits"), and **softened** the drift-
determinism test to keep determinism while dropping the "attract rocks == pure `updateRocks`"
equality (the demo now shoots rocks, so attract is no longer pure drift). Removed the now-unused
`MASHED` const. `npm run lint` (repo-wide `tsc --noEmit`) is clean.

### For Dev (GREEN) — guidance, not a spec
- Mirror tempest `demoActive`: add a pure, **RNG-free / clock-free** controller in `src/core/`
  (a `demoInput(state): Input`-shaped brain) and route the attract branch through the SAME play
  pipeline on that synthetic input while `mode` stays `attract` (`sim.ts:271 stepAttract`).
  Keep `core-boundary` purity — the scan will catch a `Date`/`Math.random` leak.
- The tests do NOT pin demo **mortality** — handle a demo ship death gracefully (respawn/reseed)
  so it never freezes and never gets stuck in `playing`/`gameover`. Your call how.
- AC4: flip `plugins/asteroids/plugin.ts` `showcase: true` **and run `npm run gen:registry` in the
  SAME commit** — `registry.test.ts` reads `GAMES` from the committed/generated `src/host/registry.ts`.
- Preserve the existing `start` opt-in and the same-rng-stream-across-transition behavior
  (`modes.test.ts` start-press block stays green).

### Rule Coverage (TS lang-review checklist + project rules)
- **Purity / determinism** (core-boundary rule; the single biggest risk for a demo controller):
  covered by the determinism test + the existing `core-boundary.test.ts` source scan.
- **Type-safety escapes** (`as any`, non-null `!`): none introduced by these tests; the checklist
  applies to Dev's diff and is the Reviewer's backstop.
- **Test quality (no vacuous assertions)**: self-checked — every test asserts concrete state; the
  two guards that pass now (autonomy, start-opt-in) assert real values, not `true`/`is_none`.
- No `.claude/rules/` or `SOUL.md` in this repo — the TS checklist is the applicable rubric.

Handing to Dev for GREEN.
---

## Dev Assessment

GREEN. All 4 RED targets pass; the demo genuinely self-plays.

**Verification:**
- `asteroids` + `host` projects: **888 passed (0 failed)**.
- `npm run lint` (repo-wide `tsc --noEmit`): clean.
- `npm run test:orchestrator`: **409 passed, 0 failed** (after adding asteroids to the
  showcase-liveness census).
- Full `npx vitest run`: only 3 pre-existing, UNRELATED failures — `missile-command` citation
  tests failing on a missing vendored ROM source (`reference/source/W3COMN.MAC`, ENOENT). That
  `reference/` tree is untracked (git ls-tree empty) and absent in this a-2 checkout; my diff never
  touches missile-command, so they fail identically on origin/main here. Not ad1-3 blast radius.

**What I built:**
- Extracted `stepPlay` from `stepGame` (a pure cut — the dispatcher now routes attract→stepAttract,
  gameover→stepGameOver, playing→stepPlay). No forked mover: the demo IS the real play step.
- Added a pure, RNG-free, clock-free `demoInput(state): Input` brain — aims the ship at the nearest
  rock (seam-aware, shortest turn), fires on a 12-frame cadence (never on tick 0, so the opening
  attract frame stays pure A-6 drift), thrusts in gentle bursts.
- `stepAttract` non-start branch runs `stepPlay(demoState, demoInput(state), dt, turnRate)` with the
  ship held invulnerable, then coerces back to attract (mode, gameOver:null, re-armed
  shipSpawnTimer, events:[] for a silent attract).
- `shell/render.ts`: the attract ship is now drawn (guard change).
- `plugins/asteroids/plugin.ts` → `showcase: true`; `npm run gen:registry` in the same commit
  regenerated `src/host/registry.ts` (4 showcase games now).

**Blast radius handled (A-16 → self-play contract flip):** updated `collision.test.ts`,
`score.test.ts`, `waves.test.ts`, and `showcase-liveness.test.mjs` to the new contract — see the
three Dev deviations above. Kept every still-valid guard (gameover stays inert; `updateWaveDirector`
called directly is still mode-gated).

**For the Reviewer (Zorg):** the one uncovered surface is the SHELL render of the attract ship —
core is fully tested, but "is the ship visibly self-playing in the carousel?" is eyeball/liveness
territory (house convention). See Delivery Findings for the manual liveness recipe. Also worth a
glance: the demo scoring/advancing waves in attract (harmless, documented).

Handing to the Reviewer.
---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | success/green | 0 (lint clean; asteroids+host 888/0; orchestrator 409/0; 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #15, score.test.ts:151) | confirmed 1 |

**All received:** Yes (3 enabled returned: preflight, security, rule_checker; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed (1 [RULE] + 2 [DOC], all Low), 0 dismissed, 0 deferred

### Rule Compliance (TS lang-review checklist — the applicable rubric; no .claude/rules or SOUL.md exist)
- **#1 type-safety escapes:** [VERIFIED] no `as any`/`as unknown`/`@ts-ignore`/non-null `!` added — sim.ts `demoInput`/`stepAttract`/`stepPlay`, render.ts, plugin.ts all clean (preflight smell scan = 0; rule_checker confirmed).
- **#4 null/undefined (`??` vs `||`):** [VERIFIED] no default-fallback `||`/`??` introduced; `turnRate` stays a plain optional never `||`-defaulted (rule_checker, 3 instances checked).
- **#14 derived edges in one branch:** [VERIFIED] `withSirenEdge`/`withHeartbeat` are computed at `stepPlay`'s SINGLE exit, and `stepPlay` is now the one pipeline both the playing dispatch and the attract demo call — the extraction REMOVED fork risk. The attract `events: []` is a uniform documented suppression (A-18 "attract stays silent"), not a selective per-branch omission; edge-bearing STATE (`saucer`, `heartbeatTimer`) rides through `...played`, only the announcement event is dropped. Compliant.
- **#15 loose/token-matching test assertions:** ONE VIOLATION — `score.test.ts:151` (see findings). Other test assertions checked compliant: attract-demo booleans derive from real ship/bullet state; board-reactivity asserts inequality of independently-computed traces + both-maneuvered guard; waves `>0` is a defensible existence check (exact count needs re-deriving the RNG-threaded spawn stream).
- **#17 comment asserts unverified mechanism:** render.ts "feeds NO_INPUT" is imprecise (see finding [DOC-2]); sim.ts stepAttract doc verified against code (only `mode:'playing'` write is behind `if(startPressed)`).
- **#21 degenerate numeric input:** [VERIFIED] `Math.atan2(0,0)=0` (rock exactly on ship) → defined `turn`, no NaN. The immortality re-arm leans on the fixed 1/60 timestep (a single-tick dt > ~2.15s would momentarily un-shield then self-heal) — not reachable through the shell's fixed-step loop.
- **Core purity (CLAUDE.md):** [VERIFIED] `demoInput`+`stepPlay` read only state/input/dt/turnRate, Math-only; existing `core-boundary.test.ts` source scan auto-covers them (security + rule_checker both confirmed).

### Devil's Advocate
Argue the code is broken. First attack: the demo reuses the full play step, so it SCORES and advances WAVES in attract — could `score`/`wave` overflow or the wave director escalate difficulty until the demo ship (immortal but not omniscient) is buried and the carousel shows a frozen scrum? Traced: the ship is invulnerable every frame (`shipSpawnTimer` re-armed to RESPAWN_INVULNERABILITY_S, decayed only by one `dt` inside stepPlay, so never ≤0), so it never dies and the field never stalls on a corpse; waves refill but the demo keeps shooting, and `score` is a JS number that won't overflow in any realistic carousel dwell. Second attack: a masher at the attract screen — every gameplay button held — could hijack the ship or fire the real gun. Traced: `stepPlay` is fed `demoInput(state)`, NOT the player `input`; the only `input` reads in `stepAttract` are `input.start` (startPrev/startPressed), so held fire/thrust/rotate are inert. The autonomy test (MASHED ≅ NO_INPUT) pins exactly this. Third attack: the start press is swallowed because the demo controller sets `start:false` every frame. Traced: `startPressed` is computed in the DISPATCHER (`stepGame`) from the real `input.start`, before `stepAttract` runs demoInput — so demoInput's `start:false` never touches the transition; the "start mid-demo" test proves a fresh game begins. Fourth attack: a saucer siren loop leaks — the demo spawns a saucer (siren-start) but strips events, so the shell never starts the loop; then on the START transition the fresh game has no saucer, and gameover→attract is handled by the unchanged `stepGameOver`. Both edges are stripped uniformly, so no half-edge orphan. Fifth attack: an invisible ship (visible=false from a prior hyperspace) persists into the demo because reveal never fires (timer never hits 0). Traced: hyperspace only happens in `playing`, and by the time gameover→attract elapses (3s) the playing loop has revealed the ship (timer decayed to 0 there); demoInput never requests hyperspace. Cosmetic-only even in the impossible case. Nothing here rises to a correctness break; the residue is one loose test bound and two imprecise comments.

### Reviewer (audit)
Deviation audit of `### Dev (implementation)`:
- **Attract reuses the full play pipeline with an immortal demo ship** → ✓ ACCEPTED by Reviewer: honors the no-forked-mover rule (rule #14 confirms the extraction reduced fork risk); immortality is bounded by the fixed timestep and self-heals otherwise.
- **Rendered the attract ship (shell change beyond core-only ACs)** → ✓ ACCEPTED by Reviewer: necessary for the epic's visible-showcase intent; render.ts change is a pure state read (security confirmed). Comment precision flagged separately as [DOC-2].
- **Updated pre-existing A-16 "attract is inert" tests to the self-play contract** → ✓ ACCEPTED by Reviewer: the A-16 inert contract is genuinely superseded; the still-valid guards (gameover-inert, direct `updateWaveDirector` mode-gate) were correctly preserved. The score.test.ts rewrite carries the [RULE] loose-bound finding below.

---

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

Round 1 REJECTED on 3 Low findings (no Critical/High) — one named checklist-rule violation I could
not dismiss plus two factual comment fixes. Dev applied all three in commit 0b1ba0bf; I re-verified
the round-2 diff (`git diff 0580a109 0b1ba0bf`) is EXACTLY those three fixes and nothing more, and
re-ran every gate. No production logic changed (only two comments + one test assertion), so the
security and rule-checker domains are unaffected and did not need re-spawning.

Round-2 verification of the round-1 findings:
- **[RULE]** score.test.ts:151 `toBeGreaterThan(500)` → `toBe(520)` — RESOLVED. Re-ran: the exact
  value is 520 (large tier 20, deterministic frame-1 hit), test green. The guard now catches a
  scoring-tier regression that the loose bound would have passed.
- **[DOC]** sim.ts:7 header — RESOLVED. No longer calls attract a "rocks-drift backdrop"; states it
  self-plays via stepAttract → demoInput → stepPlay.
- **[DOC]** render.ts flame comment — RESOLVED. No longer names `NO_INPUT`; says the carousel's
  sampled input is all-false so the demo draws no flame — matches the real `main.ts` render path.

**Specialist coverage** (plain-text tags; the 6 disabled specialists were hand-covered by the Reviewer):
- [PRE] preflight — clean: lint clean, asteroids+host 888/888, orchestrator 409/0, 0 smells (round 2 re-run confirms).
- [SEC] security — clean: core purity + determinism confirmed; no DOM/eval/entropy; render change is a pure state read.
- [RULE] rule-checker — its one finding (score.test.ts #15) is now RESOLVED; all other rules compliant.
- [EDGE] edge cases (hand-covered) — immortal ship ⇒ no death/gameover leak; `atan2(0,0)=0` no NaN; empty-field demo populated by the wave director; immortality bounded by the fixed 1/60 timestep.
- [SILENT] silent failures (hand-covered) — none: no swallowed errors; the `events: []` attract suppression is a uniform, documented design choice (both siren edges dropped, no half-edge orphan).
- [TEST] test quality (hand-covered) — new attract-demo tests are non-vacuous and mutation-reachable (verified RED before GREEN); board-reactivity has a both-maneuvered anti-degeneracy guard; the one loose bound is now tightened.
- [DOC] comments (hand-covered) — the two stale/imprecise comments are fixed; remaining comments verified against code.
- [TYPE] type design (hand-covered) — no new types; `demoInput` returns the existing `Input`; no stringly-typed APIs or unsafe casts.
- [SIMPLE] simplification (hand-covered) — the `stepPlay` extraction removes fork risk rather than adding complexity; `lives: Math.max(state.lives, 1)` is minor defensive code (ship is always invulnerable) — noted, not blocking.

**Data flow traced:** attract frame → `stepAttract` computes `demoInput(state)` (pure: nearest-rock aim + tick-cadence fire/thrust) → `stepPlay(demoState, demoInput, dt)` (real play step, immortal ship) → coerced back to attract. Player `input` reaches only the `start` edge — no gameplay hijack path.

**Handoff:** To SM for finish-story.
---

## Dev Rework (round 1)

Applied all 3 Reviewer findings (all Low):
- **[RULE #15] score.test.ts:151** → `expect(s1.score).toBe(520)` (verified exact: rock+bullet at
  CENTER hit on frame 1, large tier = 20, no tick-0 demo shot → 500+20=520; test re-run green).
- **[DOC] sim.ts:7** → header no longer calls attract a "rocks-drift backdrop"; now states attract
  self-plays via stepAttract → demoInput → stepPlay (ad1-3).
- **[DOC] render.ts** → the flame comment no longer names `NO_INPUT`; now: "in the lobby carousel
  nobody presses keys, so the sampled input is all-false and the demo draws no flame."

Verification: score.test.ts 26/26, `npm run lint` clean, asteroids+host **888/888**. Pushed to main
(0b1ba0bf). Back to Reviewer for round 2.
---

## Impact Summary

**ad1-3 — asteroids self-play attract demo + showcase opt-in.** APPROVED round 2 (round 1 rejected on 3 Low findings, all fixed in 0b1ba0bf). Commits on main: e3f96fdd (claim) → f449d039 (RED) → 0580a109 (GREEN) → 0b1ba0bf (rework r1).

Asteroids attract now runs a deterministic self-play demo: a pure, RNG-free `demoInput` controller aims the ship at the nearest rock, fires on a 12-frame cadence, thrusts in bursts. It reuses the real play step (`stepPlay`, extracted from `stepGame` — no forked mover) on synthetic input while mode stays `attract`, with the ship held invulnerable so the showcase loop never stalls. The attract ship is now drawn; `plugin.ts` flips `showcase: true` (registry regenerated) so asteroids joins the lobby carousel.

**Verification:** lint clean; asteroids+host 888/888; orchestrator 409/0. The 3 full-suite failures are pre-existing, unrelated missile-command citation tests (missing untracked vendored ROM source). **blocking_count: 0.**

**Non-blocking follow-ups (see Delivery Findings):** the attract render is proven only at the core level — eyeball `/asteroids/` or run `just check-showcase-alive` (manual, non-CI) before the owner cuts the carousel over; the demo scores/advances waves in attract (harmless, reset on start press).
