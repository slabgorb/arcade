---
story_id: "jt9-45"
jira_key: "jt9-45"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-45: Port the full PTERST/PTERWV ptero entry: random side + time-stagger, not just the jt9-44 Y-lane spread

## Story Details
- **ID:** jt9-45
- **Jira Key:** jt9-45
- **Title:** Port the full PTERST/PTERWV ptero entry: random side + time-stagger, not just the jt9-44 Y-lane spread
- **Points:** 3
- **Priority:** p3
- **Type:** refactor
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (not stacked)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T21:16:50Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T20:37:44Z | 2026-08-06T20:40:48Z | 3m 4s |
| red | 2026-08-06T20:40:48Z | 2026-08-06T20:56:20Z | 15m 32s |
| green | 2026-08-06T20:56:20Z | 2026-08-06T21:10:59Z | 14m 39s |
| review | 2026-08-06T21:10:59Z | 2026-08-06T21:16:50Z | 5m 51s |
| finish | 2026-08-06T21:16:50Z | - | - |

## Background

jt9-44 ported ONE of three ROM entry behaviours for the ptero wave spawn mechanism (`spawnWavePteros` in `plugins/joust/src/core/demo.ts`):
1. **Y-lane spatial spread (DONE by jt9-44):** Each ptero enters on a distinct cliff-appear lane — CLIF5 (Y=209), CLIF3 (Y=128), CLIF1 (Y=61) — cycled by index `i % 3` (JOUSTRV4.SRC:1457-1463). This eliminated the entry-frame overlap and the burst of duplicate cues.

jt9-45 owns the remaining TWO behaviours that the ROM implements:

2. **Random entry SIDE per bird:** PTERST does `JSR VRAND / BCC` (JOUSTRV4.SRC:1421-1489) to branch each ptero to ELEFT or ERIGHT. Today all wave pteros enter at `posX 8` in horizontal lockstep — this is the port artifact this story fixes.

3. **TIME-stagger the complement:** PTERWV creates the wave's pteros ONE AT A TIME with `PCNAP 65` between each create (JOUSTRV4.SRC:2618). Today all pteros are spawned on the same frame. This story brings that temporal spread into the port.

**RNG implementation:** The joust core uses `@shared/rng` or joust's deterministic RNG. VRAND ports to a deterministic draw; keep RNG in `src/core/` (pure). The core-boundary/purity test scans `plugins/joust/src/core/` source text for `window.`/`document.`/wall-clock calls.

**Rebase footprint:** jt9-44's note said "jt9-45 will supersede the modulo" — the per-bird entry derivation (random side + stagger) likely revisits the spawn loop structure. Budget for jt2 seeded-replay fingerprint moves per the jt9 standing rule (sprint/archive/jt5-8-session.md); re-find every moved pin by sweeping for its own precondition.

## Acceptance Criteria

1. **Random entry side is seeded-deterministic:** Each ptero in a multi-ptero wave enters from a randomly-selected screen edge (left or right), NOT all at posX 8. PTERST draws a random branch outcome via `JSR VRAND / BCC → ELEFT/ERIGHT` (JOUSTRV4.SRC:1421-1489); the port uses the deterministic RNG to assign each ptero a distinct entry-side offset in the same way. A seeded replay with the same seed produces the same entry-side sequence.

2. **Time-stagger is seeded-deterministic:** Pteros are created incrementally with ≥65-frame intervals between creations, NOT all on the same frame. PTERWV creates each ptero and parks `PCNAP 65` frames before the next (JOUSTRV4.SRC:2618). A test fixture seeded with a known seed measures frame deltas between `spawnWavePteros` calls and asserts each interval ≥65 frames (or equivalent: creation frame N, N+65, N+130 for a 3-ptero wave).

3. **Test non-vacuity control:** A test that seeds both old (all-same-frame, all-posX-8) and new (staggered, varied-posX) behaviours shows the old produces identical entity digests/coordinates on spawn, while the new produces distinct coordinates and creation frames. The control confirms the test can see the difference.

4. **Determinism is preserved:** The jt2 seeded-replay fingerprints (demo-replay audio, entity state anchors, frame digests) are re-baselined. Every moved pin is re-found by sweeping for its own precondition (not by nudging a number toward the new output). Use the method from sprint/archive/jt5-8-session.md. Any pin that changed seed or anchor is called out and justified.

5. **Core purity is maintained:** The RNG logic lives in `src/core/` (pure). No `window.`/`document.`/`Date.now()`/`Math.random()` calls. The purity/core-boundary guard (`npx vitest run --project joust`) is green.

6. **jt9-44's Y-lane spread is preserved:** The spatial spread porting CLIF5/CLIF3/CLIF1 remains; this story adds side + time. Mutation: revert the stagger or side-randomization → test RED. Control: both stagger and side must co-exist to green.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): porting VRAND into `spawnWavePteros` will CONSUME the RNG stream, which it does not today (probe confirmed identical output across all seeds — zero draws). Every downstream seeded-replay fingerprint shifts once the draw lands. Affects `plugins/joust/tests/demo-jt2-9-anchor.test.ts` (and any other frame-digest/replay-anchor suite) — Dev must re-baseline per the jt5-8 method (re-find each moved pin by its own precondition, never nudge a number toward the new output). This is AC4 and the largest blast radius of the story. *Found by TEA during test design.*
- **Improvement** (non-blocking): `spawnWavePteros(waveNumber)` currently takes no RNG and returns `DemoProcess[]` with no way to draw. Dev must thread the sim RNG in (the `draw({...stepped, rng})` / `vrandFrom(...)` pattern already used at `plugins/joust/src/core/demo.ts:1996-2001`) and return the advanced rng so the stream stays single-source. The RED suite goes through `stepDemo`, so it is immune to whatever signature Dev picks. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC6's guard pins the cliff-lane SET `{61,128,209}`, NOT the id→lane mapping. jt9-44's Reviewer flagged its `i % 3` modulo would be "superseded" by per-bird entry derivation — Dev is free to reassign which ptero gets which lane; only losing a lane reddens `demo-jt9-45.test.ts`. Affects `plugins/joust/src/core/demo.ts` (`spawnWavePteros`). *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the PTERWV time-stagger is modeled by nap-delaying each ptero's activation, so all wave pteros are created at the advance and sit rendered + collision-eligible at their entry edges (`ELEFT+1`/`ERIGHT-1`) until they wake — the ROM instead CREATES them one at a time (`SECCR PTERST` per `PCNAP 65`), so a not-yet-created ptero is neither on screen nor collidable. Affects `plugins/joust/src/core/demo.ts` (`spawnWavePteros`, plus `stepDemo`/`DemoState` for a pending-arrivals schedule); a faithful follow-up would defer creation and supersede jt9-44's entry-frame `length===3` guard. See the Dev Design Deviation for the full rationale. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the anticipated AC4 fingerprint re-baseline was NOT needed — deriving sides from the positional wave-entry seed (not `sim.rng`) left every jt2 seeded-replay fingerprint unmoved (full joust suite 2968/2968 green, zero re-baselines). Affects nothing to change; recorded so the Reviewer does not expect re-baselined anchors. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): CONFIRMED and elevated for routing — the PTERWV stagger is a nap-delay, so a wave's pteros sit rendered + collision-eligible at their entry edges (`ELEFT+1`/`ERIGHT-1`) for up to ~195 frames before waking, whereas the ROM creates them one at a time (`SECCR PTERST` per `PCNAP 65`) so a not-yet-created ptero is neither drawn nor collidable. A faithful port defers creation via a `DemoState` pending-arrivals schedule ticked in `stepDemo`, superseding jt9-44's entry-frame `length===3` guard. Affects `plugins/joust/src/core/demo.ts` (`spawnWavePteros`, `stepDemo`, `DemoState`). **SM: please file this as a follow-up story at finish** (the fidelity residue is out of jt9-45's 3-pt scope but must not be forgotten). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

No deviations from spec.

(The README file-count bump 145→146 is not a spec deviation — it is the mechanical
consequence of adding one `plugins/joust/tests/*.test.ts` file, which the derived-census
guard `audio-seam-scope.test.ts` reddens on. Bumped at RED time per the standing jt9 gotcha;
see TEA Assessment.)

### Dev (implementation)

- **Time-stagger modeled as nap-delayed activation, not one-at-a-time creation**
  - Spec source: context-story-jt9-45.md, AC2 (and jt9-44 Reviewer's filing note)
  - Spec text: "Pteros are created incrementally with ≥65-frame intervals between creations… PTERWV creates each ptero and parks `PCNAP 65` frames before the next"
  - Implementation: all `count` pteros are created at the wave advance and placed at their PTERST entry edges, each with an initial `nap = 65*(i+1)`. A napped process does not execute (frame.ts:464-483), so each ptero begins to fly ≥65 frames apart (measured activation frames 64/129/194). But all are PRESENT — rendered (drawList:37) and collision-eligible (collisionCandidates:1422) — from the advance frame, parked at `ELEFT+1`/`ERIGHT-1`, rather than created one at a time as PTERWV does.
  - Rationale: nap-delay is the minimal change that satisfies AC2's interval and keeps jt9-44's "3 present, no burst" guard green. Genuine one-at-a-time creation needs a per-frame pending-arrivals schedule on `DemoState` (ticked in stepDemo) and would supersede jt9-44's entry-frame `length===3` guard — a larger blast radius than a 3-pt story budgets. The dormant pteros park at the extreme screen edges (−9 / 291), not mid-field.
  - Severity: minor
  - Forward impact: minor — a dormant ptero is visible/collidable at its entry edge during its ≤195-frame wait (the ROM's is not yet created). Filed as a Delivery Finding below for a faithful deferred-creation follow-up.

- **Entry side seeded from the positional wave-entry word, not by consuming the frame RNG stream**
  - Spec source: context-story-jt9-45.md, AC1
  - Spec text: "PTERST draws a random branch outcome via `JSR VRAND / BCC → ELEFT/ERIGHT`… the port uses the deterministic RNG to assign each ptero a distinct entry-side offset"
  - Implementation: `enterPteroSides` (transporter.ts) derives each side from a local mulberry32 seeded by the same positional wave-entry `seed` word `enterViaPads` already takes (the running `rng` value at the advance), forked by `^0x50544552`. It does NOT advance `sim.rng`.
  - Rationale: this matches the port's existing wave-entry seeding model — the port has never consumed the frame stream at wave entry, and its mulberry is not the ROM's LFSR, so bit-exact stream alignment with the ROM is not a property maintained anywhere. Consuming `sim.rng` here would fork every downstream draw and move the jt2 replay fingerprints for no fidelity gain. Same demo seed → same side sequence (AC1 determinism holds).
  - Severity: minor
  - Forward impact: none — no downstream consumer depends on ptero entry advancing the stream; TEA's anticipated AC4 re-baseline proved unnecessary (full joust suite green, zero fingerprints moved).

### Reviewer (audit)

- **Time-stagger via nap-delay, not one-at-a-time creation** → ✓ **ACCEPTED by Reviewer.** Sound and honestly disclosed. Nap-delay is the minimal change that hits AC2's ≥65-frame interval while keeping jt9-44's "3 present, no burst" guard green; genuine deferred creation needs a `DemoState` pending-arrivals schedule and supersedes jt9-44's entry-frame guard — legitimately its own story, exactly as jt9-44 itself deferred this to jt9-45. The residue (a napping ptero is rendered + collision-eligible at its entry edge `−9`/`291` for its ≤195-frame wait, where the ROM's is not yet created) is a MEDIUM fidelity gap, not Critical/High, and is filed as a Delivery Finding for a faithful follow-up. Does not block.
- **Entry side seeded from the positional wave word, not by consuming `sim.rng`** → ✓ **ACCEPTED by Reviewer.** Correct call. It mirrors the port's existing wave-entry model (`enterViaPads`), keeps AC1 determinism (same seed → same sides — verified), and avoids forking the frame stream for zero fidelity gain (the port's mulberry is not the ROM LFSR, so bit-exact alignment is maintained nowhere). Confirmed the payoff: preflight reports 2968/2968 with no fingerprint re-baseline.

## Sm Assessment

**State on arrival:** `NEW_WORK_STATE`, user selected jt9-45. The phase pointer read `setup`.

**Sibling probes (both run before setup, per SM sidecar):** `git fetch --prune` + `git branch -r | grep jt9-45` → no remote branch (uncontested). `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → only a-2 on sw8-25 (star-wars, no file overlap). jt9-45 is uncontested.

**Premise check:** epic YAML carried `description: null` and `acceptance_criteria: null`, so there was no stale falsifiable claim to re-measure — but there was also no primary input for setup. The authoritative quarry came from the jt9-44 Reviewer, who *filed* this story: `sprint/archive/jt9-44-session.md` (finding 8, MEDIUM→non-blocking→FILED jt9-45) with verified JOUSTRV4.SRC citations. The 6 ACs were derived from that, not invented.

**Scope handed to TEA:** port the two ROM entry behaviours jt9-44 left out — (a) random entry SIDE per bird (PTERST `JSR VRAND / BCC → ELEFT/ERIGHT`, JOUSTRV4.SRC:1421-1489), and (b) TIME-stagger the complement (PTERWV `PCNAP 65`, JOUSTRV4.SRC:2618). Mechanism site: `plugins/joust/src/core/demo.ts` (`spawnWavePteros`/`pteroProcess`). jt9-44's Y-lane spread (209/128/61 by `i%3`) is the BASELINE — preserve it, do not re-port. Expect the `i%3` modulo to be superseded by per-bird entry derivation, and expect jt2 seeded-replay fingerprints to move (re-find each pin by its own precondition, jt5-8 method).

**Routing:** phased tdd → TEA (RED). Claim pushed: branch `feat/jt9-45-ptero-entry-random-side-time-stagger` + epic in_progress stamp + context (commit `ea311eda`).

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/demo-jt9-45.test.ts` — 6 tests; ROM entry port (PTERST random side + PTERWV time-stagger).

**Tests Written:** 6 tests covering ACs 1, 2, 3, 6 (AC4/AC5 handled as non-test — see below).
**Status:** RED — 4 failing (ready for Dev), 2 green by design (control + preservation guard).

**Method (before writing a line):** read the ROM ground truth in `reference/williams-source/joust/JOUSTRV4.SRC` — PTERST `:1421-1489` (`LDA #2/STA PVELX`, `LDX #ELEFT+1`, `JSR VRAND/BCC`, else `COM PFACE/NEG PVELX/LDX #ERIGHT-1`; `ELEFT=-10`, `ERIGHT=292` → edges −9 / 291) and PTERWV `:2618` (`PCNAP 65` loop, one create per 65-frame nap). Then a **throwaway probe** measured the current tree: every seed yields `x=8,8,8`, `vX=8,8,8`, all three pteros present and moving from the entry frame, birth Y = `209/128/61`. That fixed vector is the non-vacuity baseline the suite is built against.

**The suite is fix-agnostic** — it never calls `spawnWavePteros` directly (so Dev's RNG-threading signature is free) and never pins the exact edge coordinates. It observes only `stepDemo` output: each ptero's birth X (first posX before it flies), birth Y lane, activation frame (first frame posX leaves birth X), and flight direction, accumulated per process id across ~260 frames so a despawned early ptero and a time-staggered late one are both captured.

| Test | AC | Fails now because |
|------|----|-------------------|
| both edges + binary entry X | 1 | every birthX is 8 (one edge, one value) |
| RNG-driven (repro per seed, varies across seeds) | 1 | all 16 seeds give identical `8,8,8` |
| side sets flight direction (into arena) | 1 | zero right-edge pteros exist to check `NEG PVELX` |
| pteros enter ≥65 frames apart | 2 | all three activate on frame 1 (gaps 0) |
| CONTROL — detectors reject old lockstep vector | 3 | (green — proves `entersBothEdges`/`isStaggered` are not vacuous) |
| cliff Y-lanes `{61,128,209}` preserved | 6 | (green — regression guard for jt9-44's spread) |

**AC4 (determinism re-baseline)** is not a new pinning test — it is a *ripple* filed as the first Delivery Finding: adding the VRAND draw consumes the RNG stream and moves downstream seeded-replay fingerprints. Pinning old fingerprints would be actively wrong; Dev re-baselines by the jt5-8 method. Same-seed reproducibility (the testable half of AC4) is covered by the "RNG-driven" test.
**AC5 (core purity)** is enforced by the existing `src/core/` boundary guard in the joust project — no new test needed; noted for Dev that the RNG draw stays in core (pure `draw`/`vrandFrom`).

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #8 Test quality (meaningful assertions, no `as any`) | all 6 have value assertions; self-checked, 0 vacuous | passing |
| #18 Apparatus fails-by-passing | `CONTROL — detectors reject the pre-jt9-45 lockstep vector` | passing (guards the other 5) |
| #20 Quantity from an artifact the same diff changes | README file-count 145→146; `audio-seam-scope` census green | passing |

**Rules checked:** 3 of the applicable lang-review rules have explicit coverage; the rest (#1 type-safety escapes, #3 enum, #7 async) are N/A to this behavioral demo suite.
**Self-check:** 0 vacuous tests. The two green tests are a non-vacuity CONTROL and a preservation GUARD, both intentional and load-bearing, not filler.

**README census note:** adding one test file reddened `audio-seam-scope.test.ts`'s derived `--project joust # N files` count; bumped `plugins/joust/README.md` 145→146 at RED time (standing jt9 gotcha — the census is derived, not transcribed). Full joust project: 4 failing (all mine), 2964 passing.

**Handoff:** To Dev for GREEN. Start at `plugins/joust/src/core/demo.ts` `spawnWavePteros` — thread the sim RNG, roll a per-ptero side (edge X + negated velocity), stagger creation ≥65 frames, keep the three cliff lanes, and re-baseline the jt2 replay fingerprints the draw shifts.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/transporter.ts` — added `enterPteroSides(count, seed)`, a pure mulberry32 (reuses `rngNext`) that rolls each ptero's PTERST entry edge deterministically off the wave-entry seed, forked `^'PTER'` from the pad draws.
- `plugins/joust/src/core/demo.ts` — imported `ELEFT`/`ERIGHT` and `enterPteroSides`; reshaped `pteroProcess(id, entry: PteroEntry)` to take a full entry (posX/posY/velXIndex/facing/nap); rewrote `spawnWavePteros(waveNumber, seed)` to roll a side per ptero (left `ELEFT+1`, velXIndex +8, face right; right `ERIGHT-1`, velXIndex −8, face left — the `NEG PVELX`/`COM PFACE` branch), stagger arrivals `nap = 65*(i+1)` (`PTERWV PCNAP 65`), and keep jt9-44's cliff lanes; threaded `seed` into both `spawnWaveEnemies` callsites.

**Tests:** 2968/2968 passing (GREEN) — the 6 jt9-45 tests plus the whole joust project; `npm run lint` (tsc) clean.
**Branch:** `feat/jt9-45-ptero-entry-random-side-time-stagger` (pushed)

**How each AC landed:**
- **AC1** (random side) — `enterPteroSides` gives each ptero a seed-deterministic left/right edge; verified two-edge/binary/RNG-driven/into-arena-direction all green.
- **AC2** (time-stagger) — `nap = 65*(i+1)` → activation frames 64/129/194 (gaps 65). Modeled as nap-delay, not one-at-a-time creation — see Design Deviation + Delivery Finding.
- **AC3** (control) — TEA's CONTROL test stays green (detectors non-vacuous).
- **AC4** (determinism) — **no re-baseline needed**: sides come off the positional wave-entry seed, not `sim.rng`, so no fingerprint moved. Same seed → same sides.
- **AC5** (purity) — new RNG lives in `src/core/` (transporter.ts), pure, no `window`/`Date`/`Math.random`; core-boundary guard green.
- **AC6** (Y-lanes) — cliff lanes `{61,128,209}` preserved; guard green.

**Two deviations logged** (both minor): time-stagger via nap-delay rather than deferred creation (all pteros present at edges from the advance), and entry side seeded from the positional word rather than by consuming the frame RNG stream. Full rationale under Design Deviations → Dev.

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 2968/0, no code smells (0 console.log/TODO/FIXME/skips), lint clean, working tree clean (only pf's in_review epic stamp unstaged) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by my own edge analysis + mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error paths in this pure-core change |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by the mutation battery (6/6 caught) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments audited by me against ROM cites |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — `PteroEntry`/`Facing` typing checked by me + tsc |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no security surface (pure deterministic core) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — change is minimal, no dead code |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — Rule Compliance done exhaustively by me below |

**All received:** Yes (1 enabled returned GREEN; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (non-blocking Gap, routed to SM for a follow-up story), 0 dismissed, 0 deferred

### Rule Compliance

Rules: `CLAUDE.md` (core/shell boundary; extract-to-shared only on a second consumer), `plugins/joust/CLAUDE.md` (none extra), `.pennyfarthing/gates/lang-review/typescript.md`.

| Rule | Instances in diff | Verdict |
|------|-------------------|---------|
| Core purity — no `window`/`document`/`Date.now()`/`Math.random()` in `src/core/` | `enterPteroSides` (transporter.ts), `spawnWavePteros`/`pteroProcess` (demo.ts) | ✓ COMPLIANT — pure mulberry (`rngNext`), no ambient entropy, no DOM/clock; core-boundary guard green |
| Determinism (same seed → same output) | `enterPteroSides` threads a seeded mulberry word | ✓ COMPLIANT — verified by AC1 repro test + mutation M4 |
| TS #1 type-safety escapes (`any`/`!`) | `PteroEntry` interface; `facing: right ? -1 : 1` | ✓ COMPLIANT — no `any`; `Facing` (-1\|1) contextually typed; tsc clean |
| TS #8 test quality (meaningful assertions) | `demo-jt9-45.test.ts` | ✓ COMPLIANT — mutation battery proves non-vacuity |
| TS #15 source-text token vs claim | comments cite JOUSTRV4 lines | ✓ COMPLIANT — cites verified against ROM (ELEFT/ERIGHT, PTERST/PTERWV lines) |
| CLAUDE.md extract-to-shared bar | `enterPteroSides` kept in joust `transporter.ts`, not `src/shared` | ✓ COMPLIANT — single consumer; correctly NOT extracted |

### Devil's Advocate

Suppose this is broken. **RNG collapse?** If `sim.rng` were a `[0,1)` float, `(seed ^ 0x50544552) >>> 0` would truncate toward a constant and every wave would enter the same sides — I checked: `frame.ts` types `rng: number`, seeds it `seed >>> 0`, threads it through `rngNext` as a uint32 word, and AC1's cross-seed variance test is green, so the stream genuinely varies. **`< 0.5` bias?** mulberry's output is uniform, so ~50/50 left/right — matches VRAND's coin; not a fidelity concern. **count > 3?** `i % 3` reuses a lane and `nap = 65*(i+1)` keeps growing; two pteros could then share a lane, but they arrive ≥65 frames apart so they never co-enter — no burst, and jt9-44's guard is about the entry frame. **count = 0?** empty loop, `[]` — safe. **Wrap glitch?** left `−9` and right `291` both sit inside `[ELEFT,ERIGHT]`; first flight step moves them 3px inward, no `wrapX` correction fires. **The real divergence** is the one Dev logged and I confirmed: a napped ptero is drawn and collidable at its edge before the ROM would have created it — a MEDIUM fidelity gap (a player could contact a frozen edge bird), bounded to the extreme screen margins and filed for follow-up. Nothing here reaches Critical/High.

### Mutation Battery (the review's teeth — 8 specialists disabled)

Ran 6 mutations against `demo-jt9-45.test.ts`; every one reddened, clean restore to 6/6:

| Mutation | Result |
|----------|--------|
| `velXIndex: right ? -8 : 8` → `? 8 : 8` (kill NEG PVELX) | 1 failed (flight-direction test) ✓ |
| `nap: 65*(i+1)` → `nap: 1` (kill stagger) | 1 failed (stagger test) ✓ |
| `posX: right ? ERIGHT-1 : …` → both `ELEFT+1` (kill right edge) | 3 failed (both-edges, binary, direction) ✓ |
| `drawn.value < 0.5` → `< 2` (always left) | 3 failed (both-edges, RNG-driven, direction) ✓ |
| `PTERO_APPEAR_Y[i%3]` → `[0]` (kill Y-lanes) | 3 failed (Y-lane + collateral) ✓ |
| `PTERO_STAGGER_FRAMES` 65 → 30 (gap < 60) | 1 failed (stagger threshold bites, not just >0) ✓ |

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** demo seed → `sim.rng` word at the wave advance → `spawnWaveEnemies(wave, rng)` → `spawnWavePteros(wave, seed)` → `enterPteroSides(count, seed)` (positional mulberry, stream untouched) → per-ptero entry edge (`ELEFT+1`/`ERIGHT-1`), negated velocity + flipped face on the right, cliff-lane Y, and `nap=65*(i+1)`. Safe: pure, deterministic, no `sim.rng` fork (preflight confirms zero fingerprint drift).

**Pattern observed:** `enterPteroSides` mirrors `enterViaPads` (transporter.ts) — same seeded-mulberry wave-entry idiom, forked `^'PTER'` to decorrelate from pad draws. ROM fidelity verified: `ELEFT+1=-9`/`ERIGHT-1=291`, `NEG PVELX`→`velXIndex -8`, `COM PFACE`→`facing -1` (renders `PT_L` via `pteroFrame`), `PCNAP 65`→`nap 65*(i+1)`; jt9-44's lanes `{61,128,209}` preserved (AC6).

**Error handling:** none required — pure core, no I/O, no throwing paths introduced.

**ACs:** 1 (side, binary + RNG-driven + into-arena), 2 (≥65 stagger), 3 (control), 5 (purity), 6 (lanes) all met and mutation-verified; 4 (determinism) met with NO re-baseline needed. Two deviations audited and ACCEPTED. One non-blocking MEDIUM fidelity Gap (nap-present vs one-at-a-time creation) confirmed and routed to SM for a follow-up story.

**Handoff:** To SM for finish-story.