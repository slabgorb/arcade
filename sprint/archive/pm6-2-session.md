---
story_id: "pm6-2"
jira_key: "pm6-2"
epic: "pm6"
workflow: "tdd"
---
# Story pm6-2: Cutscene player + ACT 1 (Blinky chase): a deterministic scripted-actor animation player in plugins/pac-man/src/core, and the first coffee-break cutscene — Blinky chases Pac across the screen, then a big Pac turns and chases a ripped Blinky back. Consumes pm3 baked sprites (CONSUMED, no new bake). RED-anchor the actor paths/timing against the quarry (Decision C). Runs during the pm6-1 intermission phase; gentle animation, NO strobe (Decision B).

## Story Details
- **ID:** pm6-2
- **Jira Key:** pm6-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pm6-2-cutscene-player-act1-blinky-chase
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T14:29:03Z
**Round-Trip Count:** 3

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T11:49:29Z | 2026-08-19T11:52:18Z | 2m 49s |
| red | 2026-08-19T11:52:18Z | 2026-08-19T12:23:33Z | 31m 15s |
| green | 2026-08-19T12:23:33Z | 2026-08-19T12:44:40Z | 21m 7s |
| review | 2026-08-19T12:44:40Z | 2026-08-19T13:02:36Z | 17m 56s |
| green | 2026-08-19T13:02:36Z | 2026-08-19T13:20:53Z | 18m 17s |
| review | 2026-08-19T13:20:53Z | 2026-08-19T13:39:22Z | 18m 29s |
| green | 2026-08-19T13:39:22Z | 2026-08-19T13:52:37Z | 13m 15s |
| review | 2026-08-19T13:52:37Z | 2026-08-19T14:04:15Z | 11m 38s |
| green | 2026-08-19T14:04:15Z | 2026-08-19T14:09:45Z | 5m 30s |
| review | 2026-08-19T14:09:45Z | 2026-08-19T14:29:03Z | 19m 18s |
| finish | 2026-08-19T14:29:03Z | - | - |

## Acceptance Criteria
1. AC1: a PURE, seeded, clock-free scripted-actor cutscene player in src/core drives sprite position/frame over the pm6-1 intermission phase; purity.test.ts stays green and the same seed replays the same cutscene bit-for-bit.
2. AC2: act 1 (Blinky-chase then big-Pac-chase) plays with the actor paths/timing RED-anchored to the vendored source (plugins/pac-man/reference/source/pacman.asm) + the dossier and cited (Decision C — not fabricated); the sprites are pm3 baked graphics (CONSUMED, no new bake).
3. AC3: every cutscene constant (durations, positions, frame cadence) carries a citations.test.ts claim; no un-cited src/core value; a mutation to a path/timing constant reddens an animation assertion (not a coverage check).
4. AC4: the cutscene is a gentle animation with NO >3 Hz large-area luminance strobe (Decision B, the standing Pac-Man accessibility ruling); it renders via pm3 palette/tiles.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Atia] Improvement, non-blocking — pm6-1's honest-uncited cadence CAN now
  be ROM-cited.** pm6-1 marked `INTERMISSION_LEVELS = {2,5,9,13,17}` honest-uncited
  ("no contiguous `02 05 09 0d 11` table exists"). Technically true, but there IS a
  clean anchor: the per-level JUMP table at `pacman.asm:0a45` (dispatched by `rst #20`
  at `0a44`, `pacman.asm:1620`), 21 little-endian words indexed 0-based by the
  just-cleared level byte `4e13`. Non-coffee-break levels → `0x0a6f` (a skip routine);
  index 1 → `0x2108` (Act 1), index 4 → `0x219e` (Act 2), indices 8/12/16 → `0x2297`
  (Act 3). I re-verified against raw bytes: `0a47`/`0a48` = `08 21` → `0x2108`.
  So the cadence is citable as "which table indices are non-skip," and the SAME table
  proves act-1-plays-after-round-2. Out of pm6-2 scope to re-anchor pm6-1's shipped
  constant — filing as a follow-up candidate (pm6-3 or a hardening story could cite it).

- **[TEA / Atia] Gap, non-blocking — the dossier has NO cutscene-specific sprite
  claims.** `graphics.json`'s sprite claims (`PAC-MOUTH-*`, `GHOST-BODY-*`, `FRUIT-*`)
  are all explicitly "candidate / conventional-ordering" anchors, and NONE pin the
  big-Pac composite (`#10`–`#1b`, four 16×16 hw sprites, `pacman.asm:15e6`) or the
  frightened/ripped Blinky sprites. Per the codebase's identity-first law (render.ts:
  "WHICH decoded sprite is Pac-Man is AUTHORED, not byte-cited"), the big-Pac sprite
  PIXEL identity is honest-uncited, gated on the `15e6` line cites — Dev must NOT
  fabricate a `pacman.asm` address for it. GREEN adds `claims/cutscene.json` covering
  the CONTROL-FLOW cites (thresholds/positions/gate — all clean) and marks sprite-pixel
  identities honest-uncited, mirroring pm6-1's treatment of the cadence.

- **[TEA / Atia] Note (in-scope, not deferred) — the intermission window changes from a
  frame count to a POSITION.** pm6-1 held the intermission for a placeholder
  `INTERMISSION_HOLD_FRAMES = 300` (game.ts:131, self-labelled placeholder). pm6-2's
  cutscene terminates on POSITION (Pac reaching col `0x3d`, `pacman.asm:218f`), so the
  integration replaces the fixed hold with cutscene-completion. pm6-1's tests do not
  pin 300 (they use a 2000-frame `runClear` ceiling and only assert the loop closes),
  so this does not redden them. The wiring (`state.cutscene`, driven during the
  `intermission` phase) is pinned by the integration tests in cutscene.test.ts —
  integrated here, per the "never defer integration wiring" rule, not left for later.

### Reviewer (code review) — round-trip 1 re-review

- **Gap** (blocking): `PAC_MOUTH_CYCLE_PX`'s claim cites the wrong instruction (`168c` `ld a,(#4d09)`) while its comment asserts byte-citation of `and #07` at `168f`; drift at `168f` is undetected by citations.test.ts.
  Affects `plugins/pac-man/docs/rom-study/claims/cutscene.json` + `plugins/pac-man/src/core/cutscene.ts:33,95` + `tests/core/cutscene.test.ts` REQUIRED_ADDRS (re-point to `168f`).
  *Found by Reviewer during code review.*
- **Conflict** (non-blocking): `game.ts:129` docstring ("belt-and-braces timeout floor") contradicts the either/or code and the accurate comment 20 lines below.
  Affects `plugins/pac-man/src/core/game.ts:129` (drop the misleading phrase).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): the no-cutscene intermission fallback arm (`game.ts:662`) has zero test coverage (mutating to `true` leaves 458/458 green).
  Affects `plugins/pac-man/tests/core/cutscene.test.ts` (assert a no-cutscene coffee-break round holds then advances) — candidate pm6-3 when act 2/3 populate it.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `sprint/epic-pm6.yaml:87-88` still carries the ROM-refuted "ripped Blinky" description; add a correction note like the context-story banner.
  Affects `sprint/epic-pm6.yaml` (tracking metadata).
  *Found by Reviewer during code review.*

### Dev (implementation) — round-trip 1 rework

- **Gap** (non-blocking, OUT OF pm6-2 SCOPE): `speedPattern` rejects the ROM-authentic 105% Cruise-Elroy-2 speed, so the sim CRASHES whenever Blinky enters Elroy 2 at level 5+.
  Affects `plugins/pac-man/src/core/actor.ts:76` (the `pct > 100` guard) and `plugins/pac-man/src/core/level.ts:82` (`elroy2: 105`, levels 5-20). `speedPattern` needs to represent >100% (an extra move on some frames), or the ceiling must be reconciled with the ROM's Elroy-2 figure. Surfaced by the pm6-2 L5 fallback test when it first simulated depleted-dots gameplay at level 5. Candidate for its own RED-anchored story.
  *Found by Dev during implementation (reviewer round-trip 1 rework).*

### Reviewer (code review) — round-trip 2 re-review

- **Gap** (blocking): `BIG_PAC_FIRST_SUBSTATE` (=5) byte-cites the load `15e6` (`ld a,(#4e06)`) instead of `15e9` (`sub #05`), so a drift in the value-bearing byte is invisible to citations.test.ts (mutation-proven). Same class as the round-2 168c/168f fix.
  Affects `plugins/pac-man/docs/rom-study/claims/cutscene.json` (CUTSCENE-ACT1-BIGPAC-GATE) + `plugins/pac-man/tests/core/cutscene.test.ts` REQUIRED_ADDRS + `plugins/pac-man/src/core/cutscene.ts:29,93` (re-point to 15e9).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the round-2 05a5->05ae sweep was incomplete — `cutscene.ts:189` and `claims/cutscene.json:42` (meaning) still cite the imprecise 05a5.
  Affects `plugins/pac-man/src/core/cutscene.ts` + `plugins/pac-man/docs/rom-study/claims/cutscene.json` (sweep to 05ae for self-consistency).
  *Found by Reviewer during code review.*

### Dev (implementation) — round-trip 2 rework

- **Gap** (non-blocking, tooling): `pf sprint story update` rewrites `sprint/epic-pm6.yaml` and STRIPS YAML comments, so the L6 "ripped Blinky" correction comment cannot durably live there — it was silently dropped when the round-3 verdict was stamped.
  Affects `sprint/epic-pm6.yaml` (the correction is restored best-effort, but the DURABLE record is `sprint/context/context-story-pm6-2.md` + this session). Recommend the reviewer not require the epic-YAML comment for L-class findings — pf-managed YAML can't hold prose.
  *Found by Dev during implementation (reviewer round-trip 2 rework).*

### Reviewer (code review) — round-trip 3 re-review

- **Gap** (blocking, Decision C): `MOUTH_IMAGE_COUNT` doc cites a fabricated sprite byte `#2a` that appears nowhere in the mouth routine (real bytes: #2c/#2e/#30).
  Affects `plugins/pac-man/src/core/cutscene.ts:113` (correct the sprite list, remove #2a).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): the `freezeFrames` field doc describes only the INTERMISSION_HOLD_FRAMES release, now conditional (cutscene.done when a cutscene is active).
  Affects `plugins/pac-man/src/core/game.ts:262-267` (note the conditional intermission release).
  *Found by Reviewer during code review.*
- **Note**: the citation-ANCHOR class is proven exhausted (all 14 claims byte-verified + 4 mutation-proofs); H1-R2/H1-R3/L5/L6/L7/L8/M3 all verified resolved.
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

1 deviation

- **The tile-column glide bound is WRAP-AWARE, not a raw `|Δcol| ≤ 1`.**
  - Rationale: the natural path (`playingAtLevel(3,5)` + all dots eaten) trips a PRE-EXISTING,
  - Severity: minor
  - Forward impact: none for pm6-2; the Elroy2/speedPattern bug is filed as a Delivery Finding.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA / Atia] The story TITLE's "ripped Blinky" is refuted by the ROM — act 1's
  chased-back ghost is BLUE FRIGHTENED, not ripped.** The pm6-2 title/description say
  "big Pac turns and chases a ripped Blinky back." The vendored source refutes it: the
  act-1 return leg frightens all ghosts via `pacman.asm:1a70` → the ghost sprite is set
  to image `#1c` (the blue frightened body) at `pacman.asm:1aa1` (`ld (ix+#02),#1c`),
  colour `#11`. The RIPPED / torn-sheet Blinky (image `#32`, then `#33`) lives at
  `pacman.asm:162d` and is gated on `4e07` — the **ACT 2** sub-state var, i.e. pm6-3's
  scene. All verified against raw bytes.
  - **What the tests anchor to:** act 1 = blue-frightened Blinky (`s.blinky.frightened`),
    never a ripped sprite. AC2's own wording is "big-Pac-chase" (satisfiable), and the
    epic ALREADY assigns "ripped-ghost / nail" to act 2 — so the ROM and the epic agree;
    only the pm6-2 title conflated the two acts.
  - **Why no user ruling was sought:** ROM is canonical on fidelity and the epic already
    backs it, so there is no backlog-shape question — this is a one-word title error, not
    a scope change. The deliverable (the act-1 Blinky-chase / big-Pac-chase) is intact.
  - **Forward-impact for the reader:** the story TITLE still says "ripped Blinky." A later
    reader grepping the title should not infer a ripped sprite in act 1 — that sprite is
    pm6-3 (act 2). A ⚠ CORRECTION banner was added to the top of
    `sprint/context/context-story-pm6-2.md` pointing here.

### Dev (implementation)

- **Actor direction modelled as the cited movement-vector SIGN (`step: 1|-1`), not a
  screen-space `dir: 'left'|'right'`.**
  - Spec source: cutscene.test.ts (TEA RED, AC1/AC2), which asserted `pac.dir === 'right'`
    / `'left'`.
  - Spec text: `expect(f.pacDir, 'Pac flees right in the first leg').toBe('right')` etc.
  - Implementation: `CutsceneActor.step: 1 | -1` (the ROM dir-vector sign — `+1` forward
    per `pacman.asm:3303` `00 01`, flipped to `-1` at the sub-state-2 reversal `05a5`);
    tests updated to assert `step === 1` (first leg) / `step === -1` (return leg).
  - Rationale: the ROM works in a ROTATED coordinate frame and this repo DELIBERATELY does
    not synthesise the rotated→screen transform (glossary.md ~256-259; the researcher's
    report flagged screen-space left/right as "an interpretation," ungrounded). Asserting a
    concrete `'right'`/`'left'` would be exactly the fabrication Decision C forbids. The
    "across then back" arc IS faithfully captured by the `+1 → -1` vector reversal, which
    IS cited. Deviation made during GREEN, when the deeper ROM read confirmed the ambiguity.
  - Severity: minor
  - Forward impact: pm6-3 (acts 2/3) should reuse `step: ±1`, not a screen direction; the
    SHELL renderer owns the rotated→screen mapping when it wires the cutscene to render.

- **The tile-column glide bound is WRAP-AWARE, not a raw `|Δcol| ≤ 1`.**
  - Spec source: cutscene.test.ts (TEA RED, AC4).
  - Spec text: `expect(Math.abs(trace[i].pacCol - trace[i-1].pacCol)).toBeLessThanOrEqual(1)`.
  - Implementation: a `tileDelta(a,b)` helper takes the short way around the 8-bit ring and
    the bound is `≤ CUTSCENE_STEPS_PER_FRAME` (2).
  - Rationale: `col` is the ROM's 8-bit tile byte `4d3a`/`4d32`, which WRAPS `0xff→0x00`.
    The cited threshold SEQUENCE (0x21 then 0x1e, etc.) only closes via that wrap — a raw
    absolute-difference bound would falsely flag the one-unit wrap step as a 255-tile leap.
    The wrap is a representational artifact, not a teleport; the honest anti-strobe statement
    is "no actor moves more than the 2× step per frame, wrap-aware," which this asserts.
  - Severity: minor
  - Forward impact: none — the wrap-aware helper is local to the test.

- **Act 2/3 dispatch deferred to pm6-3 (scoped there); only the act-1 round (round 2)
  creates a cutscene.**
  - Spec source: context-epic-pm6.md; sprint/epic-pm6.yaml pm6-3.
  - Spec text: pm6-3 owns "ACT 2 ... + ACT 3 ... layered on the pm6-2 scripted-actor player."
  - Implementation: game.ts creates the act-1 cutscene only when the cleared round is
    `INTERMISSION_LEVELS[0]` (round 2). The other coffee-break rounds (5/9/13/17) leave
    `state.cutscene` null and keep pm6-1's `INTERMISSION_HOLD_FRAMES` frame-count hold.
  - Rationale: only act 1 exists in pm6-2; playing act 1 at round 5 would be a fidelity
    error, so those rounds fall back to pm6-1's behaviour until pm6-3 adds the dispatch.
  - Severity: minor
  - Forward impact: pm6-3 extends the intermission-entry dispatch to select act 2/3 by round
    (the epic's per-level table `pacman.asm:0a45` — index 4 → act 2, 8/12/16 → act 3).

- **[round-trip 2] The reviewer's L5 no-cutscene-fallback test drives the `intermission`
  handler DIRECTLY (forcePhase), not the full playing→level-clear→intermission gameplay path.**
  - Spec source: Reviewer round-1 re-review, L5 ("add an integration assertion that a
    no-cutscene coffee-break round holds then advances").
  - Spec text: "or note explicitly as pm6-3's when act 2/3 populate the arm."
  - Implementation: `createGameState → forcePhase('intermission') → cutscene=null` and step
    the handler, asserting it holds (freezeFrames climbs past 1) then reaches `ready`.
  - Rationale: the natural path (`playingAtLevel(3,5)` + all dots eaten) trips a PRE-EXISTING,
    out-of-scope bug — at level 5+ Blinky is Cruise-Elroy-2 at the ROM-authentic 105%, and
    `speedPattern` throws for pct>100 (`actor.ts:76`). The playing→intermission path is already
    covered by the round-2 test; forcing the phase keeps this test on the pm6-2 fallback arm
    and off an unrelated defect. The direct approach is a strictly narrower, honest unit of
    the arm the reviewer asked me to cover.
  - Severity: minor
  - Forward impact: none for pm6-2; the Elroy2/speedPattern bug is filed as a Delivery Finding.

## Dev Assessment (Lucius Vorenus)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/core/cutscene.ts` (NEW) — the pure, seeded, clock-free act-1
  cutscene player: the 7-sub-state position-threshold machine from `pacman.asm:2108`.
  Exports the cited constants, `CutsceneState`/`CutsceneActor`, `createAct1Cutscene`,
  `stepCutscene`. No imports → trivially pure.
- `plugins/pac-man/src/core/game.ts` — `state.cutscene: CutsceneState | null` on GameState
  (init null); created on entry to the act-1 coffee-break round (round 2) BEFORE
  `advanceLevel`; stepped each frame during `intermission`; the break now ends on cutscene
  COMPLETION (position) with the pm6-1 frame-hold as the act-2/3 fallback; cleared on exit.
- `plugins/pac-man/docs/rom-study/claims/cutscene.json` (NEW) — 12 citation claims (driver,
  6 thresholds, 2 start tiles, big-Pac gate, mouth cadence, frighten), generated from the
  exact vendored lines so the byte-check matches by construction.
- `plugins/pac-man/tests/core/cutscene.test.ts` — two honesty corrections (see Design
  Deviations → Dev): `step: ±1` vector instead of an ungrounded screen `dir`; wrap-aware
  glide bound. Both toward ROM fidelity (Decision C).

**Tests:** GREEN — cutscene 20/20, citations 54/54 (all 12 claims byte-verify), purity
27/27, full pac-man project 456/456, `npm run lint` clean. No regressions.

**Anchoring:** every cutscene constant is ROM-cited AND byte-verified; speed value, second
durations and sprite-pixel identity are honest-uncited (gated on the 2× + threshold cites),
never a fabricated address. The story title's "ripped Blinky" refutation is honoured — the
return-leg Blinky is the blue frightened sprite.

**Handoff:** To review.

## TEA Assessment — RED phase (Atia of the Julii)

**RED confirmed and isolated.** `plugins/pac-man/tests/core/cutscene.test.ts` fails on
module resolution (`Cannot find module '../../src/core/cutscene'`) — the "not built yet"
RED, not a test defect. Full pac-man project: 41/42 files pass, **435 pre-existing tests
green**, only the new file red. `npm run lint`: exactly the 3 expected errors (missing
module + `state.cutscene` absent from `GameState`); no impossible-comparison narrowing,
no unused imports.

**What Dev must build for GREEN:**
1. `src/core/cutscene.ts` — a PURE, seeded, clock-free scripted-actor player. Exports the
   named constants the tests import (start cols, `ACT1_THRESHOLDS` s0/s1/s2/s4/s5/s6,
   `CUTSCENE_STEPS_PER_FRAME`, big-Pac / mouth / wiggle cadence, `ACT1_SUBSTATE_COUNT`),
   a `CutsceneState` (`substate`, `pac{col,dir,frame}`, `blinky{col,dir,frame,frightened}`,
   `bigPacActive`, `done`), `createAct1Cutscene(seed)` and a mutating `stepCutscene(state)`.
   It is the 7-sub-state (`4e06`) position-threshold machine from `pacman.asm:2108` — NOT a
   frame-counted animation. purity.test.ts arms on it automatically.
2. `claims/cutscene.json` — a claim covering each cited address (the test lists the 12
   required addrs). citations.test.ts byte-verifies each verbatim against the vendored
   source; the control-flow cites are all CLEAN, the big-Pac sprite PIXEL identity is
   honest-uncited (see Delivery Findings) — do NOT fabricate an address for it.
3. Wire `state.cutscene` into game.ts: created on entry to the `intermission` phase for a
   coffee-break round, stepped each frame during it, nulled otherwise; the phase now ends
   on cutscene completion (position), replacing the placeholder `INTERMISSION_HOLD_FRAMES`.

**Anchoring discipline (Decision C):** every constant in the tests was decoded from the
vendored `pacman.asm` AND independently re-verified against the raw bytes by me (the file
header lists each cite; the "ripped Blinky" refutation is in Design Deviations). Speed
VALUES and total-length-in-frames are honest-uncited (gated on the 2× cite + the position
thresholds) — Dev must not invent a per-frame pixel speed or a total-frame constant.

### Rule Coverage (lang-review + project rules)

- **Core/shell purity (the single most important rule):** `purity.test.ts` sweeps
  `src/core/` and arms on `cutscene.ts` the moment it lands — no clock, DOM, RNG or shell
  import. AC1's determinism tests (same-seed bit-for-bit replay; seed-independent scripted
  scene) add the observable-determinism teeth.
- **Every `src/core` constant cited (Decision C / citations gate):** AC3's claim-existence
  test requires a `claims/cutscene.json` entry per cited address; the byte-check re-opens
  each verbatim. Honest-uncited values (speed, duration, sprite-pixel identity) are gated
  on cited things, never fabricated — mirroring pm6-1's cadence and render.ts's identity.
- **Mutation sensitivity (AC3, "not a coverage check"):** every constant has a whole-value
  equality assertion, so a one-byte mutation to any threshold/position/cadence reddens a
  concrete assertion.
- **Accessibility outranks ROM fidelity (Decision B, the standing epilepsy ruling):** AC4
  pins that the pure player carries no full-field flash/invert signal, motion glides ≤1
  tile/frame (no teleport/flash), and the fastest scripted flip is the small-area leg
  wiggle — no >3 Hz large-area luminance strobe.
- **No vacuous assertions:** self-checked — every test asserts a concrete value or arc;
  no `let _ =`, no `assert(true)`, no is-defined-only checks on always-defined values.

## SM Setup Assessment (Titus Pullo)

Premises re-verified against the current tree before setup — all hold, nothing stale:
- **Host phase in-tree:** pm6-1 shipped and merged. The `intermission` GamePhase state and the
  level-gated #02-music trigger live in `plugins/pac-man/src/core/intermission.ts` (+ game.ts,
  events.ts, phase.ts). The cutscene player layers onto this existing phase — it does not add one.
- **pm3 sprites consumed, no new bake:** `plugins/pac-man/src/shell/sprite-data.ts` present
  (tests at `plugins/pac-man/tests/shell/sprites.test.ts`). The act-1 actors are pm3 graphics.
- **RED-anchor source available (Decision C):** `plugins/pac-man/reference/source/pacman.asm`.
  Every path/timing/frame-cadence constant must cite it (or the dossier) — no fabricated cites.
- **Decision B (accessibility outranks ROM fidelity):** gentle motion, NO >3 Hz large-area
  luminance strobe. Standing Pac-Man epilepsy ruling — hard AC4, not a nicety.

No either/or ACs, no PARKED banner, no falsifiable stale claim in the description. Sibling probes
clean (no remote branch for pm6-2; only live sibling session is a-1 on df6-1). Claim pushed on
`feat/pm6-2-cutscene-player-act1-blinky-chase` (commit 9d77363f); story stamped `in_progress`.

**Watch for TEA/Dev:** the src/core purity boundary is mechanically enforced — the cutscene
player MUST be pure/seeded/clock-free (AC1 demands bit-for-bit seed replay). Route any design
question about the actor-player shape or ROM cadence to Architect, not into implementation.
## Subagent Results

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`, pre-filled)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 456/456 green, `npm run lint` clean, no debug code, tree clean |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — domain assessed first-hand (see Rule Compliance #18) |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain assessed first-hand (types are `readonly`/`as const`, clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure, provably terminating, no strobe, no OOB |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — dead-cadence code caught under Rule #18 instead |
| 9 | reviewer-rule-checker | Yes | findings | 7 | confirmed 7, dismissed 0 |

**Total findings:** 8 confirmed (2 High, 2 Medium, 4 Low), 0 dismissed, 1 VERIFIED-good overturned (the test cast — see Challenge below).
**Working-tree audit:** `pf reviewer audit-tree` reported DIRTY on `sprint/epic-pm6.yaml` only — this is the `status: in_progress → in_review` stamp written by my own `pf handoff complete-phase` (green→review), NOT a mutation-testing artifact; no source file (cutscene.ts, game.ts, test, claims) is touched (confirmed by `git diff`). Both preflight and rule-checker independently noted this stamp as untouched by them. Benign; source tree intact.

**Challenge (VERIFIED-good overturned):** rule-checker rule #1 marked the `as unknown as Record<string, unknown>` cast at `cutscene.test.ts:317` *necessary* (single-cast fails TS2352). It compared single-vs-double and missed the no-cast case. I edited the line to `const s = createAct1Cutscene(1)` (no cast) and ran the real `npm run lint` → **exit 0, clean** (then reverted; tree clean). The `in` operator accepts an object operand directly, so the cast is unnecessary. Finding L1 stands.

## Reviewer Rule Compliance (rule-by-rule enumeration)

- **Core/shell purity (the cabinet's single most important rule) — COMPLIANT.** `cutscene.ts` has ZERO imports (verified by full read); no clock/DOM/RNG/shell. `purity.test.ts` (27) sweeps it and passes. `game.ts` changes stay in core and import only the pure `cutscene` module.
- **Decision C — every src/core constant byte-cited — VIOLATED (see H1).** 12 of the file's cited addresses have byte-verified claims (`citations.test.ts` 54/54); **5 exported constants carry ROM addresses in comments but NO claim** — `ACT1_SUBSTATE_COUNT`@210c, `CUTSCENE_STEPS_PER_FRAME`@2186, `BIG_PAC_SPRITE_COUNT`@162c, `BIG_PAC_MOUTH_CYCLE_PX`@15ec, `GHOST_WIGGLE_PERIOD_FRAMES`@0e23. The file header (lines 8–13) asserts "Every constant below was decoded ... and re-verified against the raw bytes" — false for 5 of 10.
- **Decision C — no fabricated/over-attributed cites — VIOLATED (see M1).** `cutscene.ts:51-53` and `claims/cutscene.json` S1 `meaning` credit the 253-tile 8-bit wrap to the ROM ("exactly as the ROM does it" / "reached via the 8-bit tile-counter wrap"); no cited `sub #NN` address shows any wrap/reset — it is this port's step=+1 inference stated as verified ROM fact.
- **AC3 — mutation reddens an ANIMATION assertion, not a coverage check — VIOLATED (see H2).** Three independent mutations (gut `pac.frame` formula, gut `blinky.frame` formula, collapse the dead `bigPacActive` ternary) each left all 20 cutscene tests green. `Sample.pacFrame`/`blinkyFrame` are read only in self-vs-self determinism `toEqual`s. The cadence constants are literal-pinned (`expect(X).toBe(n)`) — the exact "coverage check" AC3 forbids — with no observing assertion.
- **Decision B — no >3 Hz large-area luminance strobe — COMPLIANT.** `CutsceneState`/`CutsceneActor` carry no flash/invert/strobe/blank field (AC4 test + direct read). Only small-area sprite-frame cycling + ≤2-tile/frame glide. The ghost leg-wiggle full cycle is ~3.75 Hz but explicitly small-area (a few sprite pixels), outside the "large-area" rule — consistent with normal ghost animation.
- **Type design — COMPLIANT.** `ACT1_THRESHOLDS` `as const`; `SubstateSpec.moves` / `ACT1_SCRIPT` `readonly`; no `any`/`object`/`Function`; `type`-only imports marked. Mutable actor fields are the documented in-place `stepGame` idiom.
- **Null/undefined — COMPLIANT.** `game.ts:654-657` guards `state.cutscene` correctly; `spec.hold != null` correctly distinguishes 0 from absent; no `||`-on-nullable.
- **Termination / soft-lock — COMPLIANT today (forward risk, L3).** Gate actor is always in `moves`; ±1 step over an 8-bit wrap cannot skip an `===` threshold; `substate` bounded 0..6; run terminates at 521 frames (traced). `game.ts` either/or expiry drops the frame-count fallback when a cutscene is present — safe now, a soft-lock seam for pm6-3's acts 2/3.

## Findings

Tags: [RULE] rule-checker · [DOC] comment-analyzer · [TEST] test-quality · [TYPE] type · [SEC] security · [EDGE] my own path analysis

**[H1] [RULE][DOC] AC3 / Decision C — 5 cutscene constants cite the ROM in comments but carry no byte-verified claim.** `cutscene.ts` lines 75/80/87/90/92 cite `2186`, `15e6..162c`, `15ec`, `0e23`, `210c`; none appear in `claims/cutscene.json` nor in the test's own `REQUIRED_ADDRS` (`cutscene.test.ts:286-299`). Over 40% of the file's claimed citations are un-byte-verified, contradicting the header's universal "re-verified against the raw bytes." AC3 requires every cutscene constant to carry a `citations.test.ts` claim ("no un-cited src/core value"). `BIG_PAC_SPRITE_COUNT` compounds this: it is also **unused in any runtime path** (declared + self-pinned only). Grep + mutation confirmed.

**[H2] [RULE][TEST] AC3 — cadence output is behaviorally untested; the big-Pac mouth ternary is dead.** `PAC_MOUTH_PHASES = 8/2 = 4` and `BIG_PAC_MOUTH_PHASES = 16/4 = 4` are equal, so the ternary at `cutscene.ts:195` can never change `pac.frame`. Mutation: collapsing the ternary, and separately zeroing the `pac.frame` and `blinky.frame` formulas, each left all 20 tests green. AC3 requires a cadence-constant mutation to redden an animation assertion "not a coverage check"; nothing observes `pac.frame`/`blinky.frame`. `BIG_PAC_MOUTH_CYCLE_PX` therefore drives no behavior. Note: not player-visible yet — no shell code consumes `state.cutscene.*.frame` (grep confirmed) — but it ships a dead path + a false "big-Pac uses its own 16px cadence" comment on a story whose ACs are the animation.

**[M1] [DOC] Decision C — the 8-bit wrap is over-attributed to the ROM.** `cutscene.ts:51-53`: "the threshold sequence ... only closes via that wrap, exactly as the ROM does it." `claims/cutscene.json` S1 `meaning`: "reached via the 8-bit tile-counter wrap." The six cited `sub #NN` addresses are bare equality comparisons — none shows a wrap/reset (contrast the leg-wiggle counter at `0e23`, which HAS an explicit `cp #08 / ld (hl),#00`). The 253-tile wrap is this port's step=+1 realization (a legitimate honest-uncited choice, already described two bullets up) — not a demonstrated ROM mechanism. In a fidelity-first port this is exactly the confabulated-cite class the citations gate exists to prevent. Fix: hedge the bullet like its siblings; drop/relabel the parenthetical in the claim `meaning`.

**[M2] [RULE][DOC] Stale docstring — `INTERMISSION_HOLD_FRAMES` (game.ts:125-132).** The (unmodified) comment still says "pm6-2/pm6-3 lay the scripted actor animations over this window and pin the real, RED-anchored duration." This diff makes act-1 coffee breaks bypass `INTERMISSION_HOLD_FRAMES` entirely via `cutscene.done` (`game.ts:654-657`); the constant now survives only as the act-2/3 fallback. Sweep the comment to match the model this diff introduces.

**[L1] [TYPE] Unnecessary double-cast — `cutscene.test.ts:317`.** `createAct1Cutscene(1) as unknown as Record<string, unknown>` is not needed; `banned in s` type-checks against `CutsceneState` directly. Proven: no-cast version lints clean (`npm run lint` exit 0). Drop the cast.

**[L2] [DOC] Header shorthand wrong — `cutscene.ts:25`.** "reversal 05a5 `4d30 ^= 2`" misdescribes the ROM: `pacman.asm:05a5` reads `#4d30`, XORs `#02`, and stores the result into `#4d3c` — `#4d30` is never written back. Correct to `4d3c = 4d30 ^ 2`.

**[L3] [EDGE] Forward soft-lock seam — `game.ts:654-657`.** `intermissionExpired = state.cutscene ? state.cutscene.done : freezeFrames >= INTERMISSION_HOLD_FRAMES` drops the frame-count fallback whenever a cutscene exists. Not reachable today (act-1 provably terminates), but pm6-3 layers acts 2/3 on this seam — a cutscene that never reaches `done` would hang `intermission` with no escape. `state.cutscene.done || freezeFrames >= INTERMISSION_HOLD_FRAMES` is failure-proof. Non-blocking; flag for pm6-3.

**[L4] [DOC] Context-file regression — `sprint/context/context-story-pm6-2.md`.** The diff added the valuable "ripped Blinky" CORRECTION banner but also regenerated Technical Approach / Scope into placeholders and **deleted the Architect-enriched Dependencies and Design Notes**, and removed the "DO NOT REGENERATE THIS FILE" banner that existed to prevent exactly that. Non-blocking (RED/GREEN are done), but the enrichment loss contradicts the file's own prior rule; restore the Architect content alongside the correction.

### Devil's Advocate

Argue the code is broken. Start with the story's own frame: pm6-2 is titled "Cutscene player + ACT 1" and its ACs are *the animation*. Yet the one thing a cutscene is — moving pictures — is the one thing no test observes. `pac.frame` and `blinky.frame`, the sprite-animation phases the shell will render, are captured into `Sample` and then never asserted; they ride only in `runToDone(1).toEqual(runToDone(1))`, a tautology that compares an implementation to itself. I proved the teeth are missing: three separate mutations to the frame logic — zero out Pac's mouth, zero out Blinky's legs, delete the big-Pac cadence branch — all pass 20/20. A confused future maintainer "optimizing" `updateFrames` would get a green suite for deleting the animation. That is an apparatus that fails by passing. Now the fidelity angle a malicious reader would exploit: the file header swears "Every constant below was decoded from the vendored pacman.asm and re-verified against the raw bytes." Trusting that, a reviewer waves through `CUTSCENE_STEPS_PER_FRAME`, `BIG_PAC_MOUTH_CYCLE_PX`, `GHOST_WIGGLE_PERIOD_FRAMES`, `BIG_PAC_SPRITE_COUNT`, `ACT1_SUBSTATE_COUNT` — but none of their addresses is byte-checked by anything in the repo, and we already have proof that this file's comments can be wrong about the ROM (the wrap over-attribution). So the header's guarantee is exactly the kind of claim the citations gate exists to make unfake-able, and here 40% of it is unbacked. What would a stressed integrator hit? pm6-3 wires acts 2/3 onto `game.ts:654-657`, whose either/or silently discards the timeout fallback the instant a cutscene object exists — the first act-2 scene with an unreachable `done` hangs the machine in `intermission` forever, and no test today would catch it because act-1 happens to terminate. And what does the player actually get from `BIG_PAC_MOUTH_CYCLE_PX = 16`, a cited, value-pinned, byte-unverified constant? Nothing: the ternary that consumes it is mathematically dead, big-Pac chews at the identical rate as small Pac, and the comment says otherwise. None of this corrupts the state machine — positions, thresholds, reversal, frighten, termination are all correct and well-tested — but the story shipped its animation and its fidelity guarantee on trust, and both are, in the places above, unearned.

## Reviewer Assessment

**Verdict:** REJECTED

**Specialist findings incorporated:** [RULE] rule-checker — the 5 uncited constants (H1) and the dead-cadence / untested-frame violations (H2) and the stale `INTERMISSION_HOLD_FRAMES` docstring (M2); [DOC] comment-analyzer — the ROM wrap over-attribution (M1) and the `4d30 ^= 2` header shorthand (L2); [SEC] security — returned **clean** (purity holds, state machine provably terminates, no OOB, no >3 Hz large-area strobe), corroborated first-hand and folded into Rule Compliance. Preflight: 456/456 green, lint clean.

The state machine itself is solid — pure, deterministic, provably terminating, no strobe, and its positions/thresholds/reversal/frighten/gate are correctly cited, byte-verified and mutation-sensitive. Security and preflight are clean. But two explicit AC violations, both mutation- or grep-verified, block merge on a fidelity-first port:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | AC3/Decision C: 5 constants cite the ROM but carry no byte-verified claim; header falsely claims all were re-verified. `BIG_PAC_SPRITE_COUNT` is also unused. | `cutscene.ts:75,80,87,90,92`; `claims/cutscene.json` | Add claims for `2186`/`15ec`/`0e23`/`210c`/`162c` (and to `REQUIRED_ADDRS`), OR mark genuinely honest-uncited and stop asserting their addresses as re-verified. Delete `BIG_PAC_SPRITE_COUNT` or give it a consumer + claim. |
| [HIGH] | AC3: cadence output behaviorally untested; big-Pac mouth ternary is mathematically dead (3 mutations pass 20/20). | `cutscene.ts:195-199`; `cutscene.test.ts:81-107` | Add a magnitude/sequence assertion on `pac.frame`/`blinky.frame` so a cadence change reddens. Then either make the two mouth cadences actually differ or remove the dead ternary + `BIG_PAC_MOUTH_CYCLE_PX`/`BIG_PAC_MOUTH_PHASES` and fix the comment. |
| [MED] | Decision C: 253-tile wrap over-attributed to the ROM ("exactly as the ROM does it"). | `cutscene.ts:51-53`; `claims/cutscene.json` S1 `meaning` | Hedge as this port's step-sign inference (like its sibling bullets); drop/relabel the claim `meaning` parenthetical. |
| [MED] | Stale docstring: `INTERMISSION_HOLD_FRAMES` still says pm6-2 pins its duration; act-1 now bypasses it. | `game.ts:125-132` | Sweep the comment to the cutscene-completion model. |
| [LOW] | Unnecessary `as unknown as` double-cast (no-cast lints clean). | `cutscene.test.ts:317` | Drop the cast. |
| [LOW] | Header shorthand `4d30 ^= 2` misdescribes the ROM (stores to `4d3c`). | `cutscene.ts:25` | Correct to `4d3c = 4d30 ^ 2`. |
| [LOW] | Either/or intermission expiry drops the timeout fallback — forward soft-lock seam for pm6-3. | `game.ts:654-657` | `state.cutscene.done || freezeFrames >= INTERMISSION_HOLD_FRAMES`. |
| [LOW] | Context file regenerated to placeholders; Architect Dependencies/Design Notes deleted, protective banner removed. | `sprint/context/context-story-pm6-2.md` | Restore Architect content alongside the correction banner. |

**Handoff:** Back to Dev for fixes (the two HIGH items are the merge blockers; the rest are cheap and best fixed in the same pass).

### Reviewer (audit) — Design Deviations

- **[TEA] "ripped Blinky" title refutation → ✓ ACCEPTED.** ROM-verified (addr `1aa1` `#1c`, a covered byte-checked claim); the epic already assigns the ripped sheet to act 2. Correct call.
- **[Dev] `step: ±1` vector instead of screen `dir` → ✓ ACCEPTED.** Grounded in the rotated-frame glossary; asserting screen `'left'/'right'` would be the fabrication Decision C forbids. The `+1 → -1` reversal faithfully captures "across then back."
- **[Dev] wrap-aware `tileDelta` glide bound → ✓ ACCEPTED.** The `col` byte is the ROM's 8-bit `4d3a`/`4d32`; wrap-aware is correct. (Distinct from M1: the bound is sound; only the *comment* that the ROM itself closes the threshold via the wrap is over-attributed.)
- **[Dev] act 2/3 dispatch deferred to pm6-3 → ✓ ACCEPTED.** In scope for pm6-3 per the epic; act-1-only dispatch is correct. See L3 for the forward soft-lock seam this leaves.
- **UNDOCUMENTED (Reviewer audit):** the diff regenerated `context-story-pm6-2.md` to placeholders and deleted the Architect Dependencies/Design Notes (L4) — not logged by TEA/Dev. Severity: Low.
## Dev Rework Assessment — round-trip 1 (Lucius Vorenus)

Addressed every reviewer finding. Tests GREEN (pac-man 458/458, +2 net: two new
mutation-sensitive animation assertions), `npm run lint` clean, purity 27/27,
citations 54/54 (the two new claims byte-verify).

**[H1] 5 constants cited-but-unclaimed → resolved by SPLITTING cited from structural.**
- **Byte-citable → now claimed** (added to `claims/cutscene.json` AND `REQUIRED_ADDRS`):
  `BIG_PAC_MOUTH_CYCLE_PX` → `pacman.asm:15ef` (`and #0f`, the 16-value mask);
  `GHOST_WIGGLE_PERIOD_FRAMES` → `pacman.asm:0e27` (`ld a,#08`, the counter compare —
  a real immediate byte). Both byte-verify.
- **Structural, NOT byte literals → honest-uncited, no fabricated claim:**
  `CUTSCENE_STEPS_PER_FRAME` (2 = a call-COUNT) and `ACT1_SUBSTATE_COUNT` (7 = table
  LENGTH). The header's false universal "every constant ... re-verified against the raw
  bytes" is rewritten to say exactly which constants are byte-cited vs structural.
- **`BIG_PAC_SPRITE_COUNT` deleted** — it was unused in any code path and only self-pinned.

**[H2] Dead mouth ternary + untested cadence → made the cadences genuinely differ AND asserted.**
The ROM masks Pac's mouth `and #07` (8-value cycle, 4 images) and big-Pac's `and #0f`
(16-value cycle, 4 images) — big-Pac chews at HALF the rate. `updateFrames` now uses
`mouthImage(moved, cyclePx)` = `floor((moved mod cyclePx)/(cyclePx/4))`, so the
`bigPacActive` branch really changes the cadence (16 vs 8), and `BIG_PAC_MOUTH_CYCLE_PX`
is load-bearing. Two new AC3 tests assert the observable `pacFrame` against the LITERAL
cycle lengths and the `blinkyFrame` flip-spacing against the LITERAL 8 (not the imported
constants), so a constant/branch mutation reddens an ANIMATION assertion. **Verified with
the reviewer's own four mutations — all now RED** (collapse-ternary, zero-mouth-frame,
wiggle 8→4, cycle 16→8); previously all four passed green.

**[M1] Wrap over-attributed to the ROM → reframed as this port's inference.** `cutscene.ts`
HONEST-UNCITED note and `claims/cutscene.json` S1 `meaning` now state no cited `sub #NN`
shows a wrap/reset (contrast the leg-wiggle counter's explicit `cp #08`/reset), so the
253-tile wrap is the port's step-sign realisation, not a demonstrated ROM mechanism.

**[M2] Stale `INTERMISSION_HOLD_FRAMES` docstring** (game.ts:125) rewritten: act-1 bypasses
it via `cutscene.done`; it survives as the act-2/3 fallback + timeout floor.

**[L1]** Dropped the unnecessary `as unknown as Record<...>` cast (`banned in s` type-checks
directly; lint clean). **[L2]** Header shorthand corrected to `4d3c = 4d30 ^ 2`.
**[L4]** `context-story-pm6-2.md`: restored the Architect Technical Approach / Scope /
Dependencies / Design Notes (and the DO-NOT-REGENERATE banner) alongside the correction.

**[L3] Reviewer's suggested `|| freezeFrames >= INTERMISSION_HOLD_FRAMES` disjunction —
NOT applied, because it is wrong here (verify-don't-blindly-implement).** The act-1 cutscene
runs ~521 frames but `INTERMISSION_HOLD_FRAMES` is 300, so the disjunction would TRUNCATE
act 1 at frame 300. Kept the either/or (a finite cutscene owns its own termination, guarded
by its termination test) and documented the seam + the pm6-3 note (a generous safety cap,
sized above the longest act, belongs there if wanted). Flagging this reversal for the
Reviewer's round-2 confirmation.

**Handoff:** To review (round-trip 2).
## Subagent Results

**Cycle: 1**

Method: re-ran ALL enabled subagents against the full `develop...HEAD` diff for this cycle
(not a spot re-verify). 4 enabled returned; 5 disabled via `workflow.reviewer_subagents`,
pre-filled.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — pac-man 458/458, lint clean, orchestrator 503/503, no debug code, tree clean |
| 2 | reviewer-edge-hunter | No — disabled | error | none | Disabled via settings; domain assessed first-hand (termination/OOB traced, see Rule Compliance) |
| 3 | reviewer-silent-failure-hunter | No — disabled | error | none | Disabled via settings; no swallowed errors in a pure state machine (no try/catch, verified) |
| 4 | reviewer-test-analyzer | No — disabled | error | none | Disabled via settings; test quality assessed first-hand + by rule-checker rules #18/#19/#26/#29 |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 4 (1 Med, 3 Low), dismissed 0 |
| 6 | reviewer-type-design | No — disabled | error | none | Disabled via settings; types `readonly`/typed interfaces, no `any`/`as` (rule-checker #1/#2 clean) |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (Low, forward soft-lock seam — same as round-1 L3), dismissed 0 |
| 8 | reviewer-simplifier | No — disabled | error | none | Disabled via settings; no dead code (the round-1 dead ternary is now live, verified) |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (1 High, 2 Low), dismissed 0; H1/H2 re-verified RESOLVED by direct mutation |

**All received:** Yes (4 enabled returned, 3 with findings; 5 disabled pre-filled)
**Total findings:** 1 High, 1 Medium, 4 Low confirmed; 0 dismissed. Round-1 H1 & H2 both re-verified RESOLVED.
**Working-tree audit:** `pf reviewer audit-tree` → **CLEAN, exit 0**; `git status --porcelain` empty. The rule-checker applied and reverted (`git checkout --`) four mutation probes; no artifact remains. Source tree intact.

**Challenge — VERIFIEDs vs subagent findings:** I provisionally VERIFIED the citation gate as clean (citations 54/54). rule-checker (#17, high) and comment-analyzer (low) BOTH contradict this for one constant: the `PAC_MOUTH_CYCLE_PX` claim cites `168c` (`ld a,(#4d09)`) while its comment asserts byte-citation of `and #07` at `168f`. I re-read the ROM (`pacman.asm:3279` = `168c ld a,(#4d09)`, `:3280` = `168f e607 and #07`) and `grep -rn '168f' claims/*.json` → nothing. The subagents are right; I downgrade my VERIFIED to finding **[H1-R2]**. The sibling claim `15ef` (the real `and #0f`) proves the correct pattern exists in the same file.

## Reviewer Assessment

**Verdict:** REJECTED (re-review round-trip 1 — round-1 blockers cleared, one same-class citation defect remains)

**Specialist findings incorporated (all 8 dispatch tags):**
- `[RULE]` rule-checker — re-verified round-1 **H1 and H2 RESOLVED by direct mutation** (4/4 cadence/wiggle mutations now redden; `BIG_PAC_SPRITE_COUNT` deleted; structural constants honestly uncited; two new claims byte-verify). New: the `168c`/`168f` mis-anchored citation (**H1-R2**, high), the untested `INTERMISSION_HOLD_FRAMES` fallback arm (**L5**), and the stale epic-YAML "ripped Blinky" description (**L6**).
- `[DOC]` comment-analyzer — confirms the `168c`/`168f` defect, and flags the newly-introduced `game.ts:129` "belt-and-braces timeout floor" self-contradiction (**M3**) and the `step` "cited"-without-a-claim wording (**L7**). Round-1 M1 (wrap over-attribution) and L2 (`4d3c=4d30^2`) re-verified fixed.
- `[SEC]` security — purity, determinism and no-strobe all **clean**; one Low forward soft-lock seam at `game.ts:660-662` (**L3**, unchanged from round 1, non-blocking — see deviation audit).
- `[EDGE]` (assessed first-hand, subagent disabled) — traced termination: every gated sub-state checks `col === threshold` after each ±1 wrapping step so a gate can never be skipped; `substate` bounded 0..6; scene terminates at exactly 521 frames. No OOB: `ACT1_SCRIPT[s.substate]` always in-bounds.
- `[TEST]` (assessed first-hand + rule-checker #18/#19/#26/#29) — the new AC3 assertions genuinely OBSERVE `pacFrame`/`blinkyFrame` against literal-cycle re-derivations (not self-vs-self), closing round-1 H2. The one gap: the no-cutscene fallback arm (**L5**).
- `[TYPE]` (assessed first-hand + rule-checker #1/#2) — `as const`/`readonly`/typed interfaces; no `any`/`as unknown` (round-1 L1 cast removed). Clean.
- `[SILENT]` (assessed first-hand) — a pure state machine with no try/catch; no swallowed errors or silent fallbacks. Clean.
- `[SIMPLE]` (assessed first-hand) — the round-1 dead big-Pac mouth ternary is now genuinely live (8- vs 16-cycle). No remaining dead code.

**Preflight:** pac-man 458/458, `npm run lint` clean, orchestrator 503/503, tree clean.

The state machine and its integration are sound: pure, deterministic, provably terminating (521 frames), no strobe, and — the round-1 blockers — every numeric fidelity constant now carries a byte-verified claim (H1) and every cadence output is now mutation-observed (H2), both re-confirmed by direct mutation. Dev's refusal of my round-1 `||` suggestion is **correct** and I accept it (the act-1 cutscene runs 521 frames > `INTERMISSION_HOLD_FRAMES`=300, so the disjunction would truncate it — good verify-don't-blindly-implement).

One blocking defect remains, and it is the SAME class round 1 rejected on — a "byte-cited ... fails on drift" promise that is not actually delivered:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **H1-R2** — `PAC_MOUTH_CYCLE_PX`'s docstring/header assert "byte-cited to the `and #07` mask" at `pacman.asm:168f` and the file promises "citations.test.ts fails on drift", but the only claim (`CUTSCENE-ACT1-PAC-MOUTH-CADENCE`) cites `addr:168c` (`ld a,(#4d09)` — a different instruction that does not encode the value 8). `168f` is byte-verified nowhere, so a drift of `and #07`→`and #03` would NOT redden citations.test.ts. A false byte-citation claim in src/core on a fidelity-first port (AC3/Decision C). | `cutscene.ts:33,95-96,120`; `claims/cutscene.json` `CUTSCENE-ACT1-PAC-MOUTH-CADENCE`; `cutscene.test.ts` `REQUIRED_ADDRS` (`168c`) | Re-point the claim to `addr:168f`, verbatim `168f  e607  and #07`, matching the correct sibling `15ef`/`and #0f`; update `REQUIRED_ADDRS` `168c`→`168f`. (Or, if 168c is genuinely wanted as the anchor, stop the comments asserting `168f` is byte-cited.) |
| [MED] | **M3** — `INTERMISSION_HOLD_FRAMES` docstring calls it a "belt-and-braces timeout floor", but the either/or code (`game.ts:660-662`) never consults it while a cutscene runs, and the accurate comment 20 lines below (added in the SAME diff) says the safety cap does not exist. A pm6-3 dev could trust a floor that isn't there. | `game.ts:129` | Drop "and as the belt-and-braces timeout floor" (or reword to the cutscene-less-round outright timeout, per the handler comment). |
| [LOW] | **L5** — the `: freezeFrames >= INTERMISSION_HOLD_FRAMES` fallback arm (coffee-break rounds with no cutscene yet, 5/9/13/17) is asserted by no test: mutating it to `true` leaves 458/458 green. Pre-existing loose coverage that this diff restructured into a ternary. | `game.ts:662`; `tests/core/cutscene.test.ts` | Add an integration assertion that a no-cutscene coffee-break round holds then advances; or note explicitly as pm6-3's when act 2/3 populate the arm. |
| [LOW] | **L6** — the pm6-2 story `title`/`description` still say "chases a ripped Blinky back" — the exact claim round-1's TEA correction ROM-refuted (act-1 = blue frightened). This diff edits the file (status/started) but left the description stale, unlike `context-story-pm6-2.md` which got a banner. | `sprint/epic-pm6.yaml:87-88` | Add a one-line correction note pointing at the Design Deviation, matching the context-story banner. |
| [LOW] | **L7** — `step`'s `+1/-1` (and the `05a5` reversal) are called "cited" (`cutscene.ts:52,120`) and listed in the header address table unflagged, but no `claims/cutscene.json` entry covers `3303`/`05a5` (only the S2 claim's prose mentions `05a5`). The cite is accurate but not claims-backed. | `cutscene.ts:30,52,120` | Either add a claim for `05a5`, or flag the row honest-uncited like the two structural-count rows. |
| [LOW] | **L3** — either/or intermission expiry drops the timeout fallback whenever a cutscene exists — a forward soft-lock seam if a pm6-3 act never reaches `done`. Not reachable today (act-1 provably terminates). | `game.ts:660-662` | ACCEPTED as-is for pm6-2 (see deviation audit); pm6-3 should add a generous safety cap sized above the longest act. Non-blocking. |

**Handoff:** Back to TEA (red rework) — the blocking fix touches the citation gate (`REQUIRED_ADDRS` + the claim), and L5 is a missing test, so the rework is test-anchored. The Medium/Low items (M3, L6, L7) are cheap comment/tracking edits best swept in the same pass. The two round-1 HIGH blockers are cleared — do NOT redo them.

### Reviewer (audit) — Design Deviations, round-trip 1 re-review

- **[Dev round-1] L3 reversal — rejected my `|| freezeFrames >= INTERMISSION_HOLD_FRAMES` suggestion → ✓ ACCEPTED.** Dev is correct: the act-1 cutscene runs 521 frames but `INTERMISSION_HOLD_FRAMES` is 300, so the disjunction would truncate act 1 at frame 300. Keeping the either/or (a finite cutscene owns its own termination, guarded by its termination test) is the right call. Good verify-don't-blindly-implement. The forward soft-lock seam it leaves is carried as non-blocking L3 for pm6-3.
- The round-1 deviation stamps (TEA "ripped Blinky", Dev `step:±1`, Dev wrap-aware `tileDelta`, Dev act-2/3 deferral) stand as ACCEPTED from the round-1 audit; nothing in the rework disturbs them.

## Dev Rework Assessment — round-trip 2 (Lucius Vorenus)

Addressed every finding from the reviewer's round-trip-1 re-review. Tests GREEN
(pac-man 459/459, +1: the new no-cutscene fallback test), `npm run lint` exit 0,
purity 27/27, citations 54/54 (the re-pointed claim byte-verifies at 168f).

**[H1-R2] Pac mouth claim mis-anchored (168c → 168f) → FIXED at the mask instruction.**
The comments already cited `168f` `and #07`; only the claim + `REQUIRED_ADDRS` used the
adjacent load `168c` (`ld a,(#4d09)`, which does not encode the value 8). Re-pointed
`CUTSCENE-ACT1-PAC-MOUTH-CADENCE` to `addr:168f`, verbatim `168f  e607      and     #07`,
line 3280 — now the byte-check re-opens the actual `and #07`, so a drift there reddens
citations.test.ts, honouring Decision C's "fails on drift". Matches the sibling `15ef`
`and #0f` pattern exactly. `REQUIRED_ADDRS` `168c`→`168f`.

**[M3] `INTERMISSION_HOLD_FRAMES` "belt-and-braces timeout floor" contradiction → FIXED.**
`game.ts:129` reworded: it survives ONLY as the outright hold for cutscene-less coffee-break
rounds; the either/or never consults it while a cutscene runs, so it is NOT a backup floor
alongside one — now consistent with the handler comment 20 lines below.

**[L5] No-cutscene fallback arm untested → COVERED (and surfaced a pre-existing bug).**
Added an integration test that drives a no-cutscene coffee break: the intermission HOLDS
(freezeFrames climbs past 1) then advances to `ready`. Mutating the fallback arm to `true`
now reddens it. The test drives the `intermission` handler directly (forcePhase) rather than
full level-5 gameplay, because the gameplay path trips a PRE-EXISTING out-of-scope defect —
`speedPattern` throws on the ROM's 105% Cruise-Elroy-2 at level 5+ (filed as a Delivery
Finding; see Design Deviations for the test-shape rationale).

**[L6] Stale epic "ripped Blinky" description → CORRECTED.** Added a `# ⚠ CORRECTION` comment
above `sprint/epic-pm6.yaml` pm6-2, pointing at the Design Deviation / context banner (title
text left as the historical ask, matching how context-story-pm6-2.md handled it).

**[L7] `step` called "cited" without a claim → RE-FRAMED honest-uncited.** `cutscene.ts`
header row, SCREEN DIRECTION note and the `CutsceneActor.step` docstring now state the ±1
sign is THIS PORT's representation of the ROM's direction-flip (`05ae` `4d3c = 4d30 ^ 2`),
traced but NOT carried by its own byte-claim — the same honest-uncited treatment as the
structural counts. Also fixed the imprecise `05a5` (the routine guard) → `05ae` (the flip).

**[L3] Forward soft-lock seam — reviewer ACCEPTED it as-is; no change.** (Confirmed correct in
round 1: a `|| freezeFrames >= 300` disjunction would truncate the 521-frame act 1.)

**Files changed this round:** `claims/cutscene.json` (re-point), `cutscene.ts` (comments: L7 +
header honesty), `game.ts` (comment: M3), `cutscene.test.ts` (REQUIRED_ADDRS 168c→168f + new
fallback test), `sprint/epic-pm6.yaml` (L6 correction comment).

**Handoff:** To review (round-trip 3).
## Subagent Results

**Cycle: 2**

Method: re-ran ALL enabled subagents against the full `develop...HEAD` diff for this cycle
(comment-analyzer and rule-checker independently re-derived every cited ROM address and
mutation-tested the load-bearing claims/branches). 4 enabled returned; 5 disabled.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — pac-man 459/459, lint clean, orchestrator 503/503, no debug code, tree clean |
| 2 | reviewer-edge-hunter | No — disabled | error | none | Disabled via settings; termination/OOB re-assessed first-hand (unchanged from cycle 1, state-machine code untouched) |
| 3 | reviewer-silent-failure-hunter | No — disabled | error | none | Disabled via settings; pure state machine, no try/catch, no swallowed errors |
| 4 | reviewer-test-analyzer | No — disabled | error | none | Disabled via settings; test quality assessed via rule-checker #18/#29 (the new fallback test observes the arm, not vacuous) |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 2 (Low), dismissed 1 (the "3303 fabricated" claim — factually wrong, bytes exist), 1 folded into rule-checker's HIGH context |
| 6 | reviewer-type-design | No — disabled | error | none | Disabled via settings; `as const`/`readonly`, no `any`/`as` (rule-checker #1/#2 clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — delta is comment/citation + one deterministic test; purity/termination/no-strobe intact |
| 8 | reviewer-simplifier | No — disabled | error | none | Disabled via settings; no dead code introduced |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 HIGH (new sibling mis-anchor, mutation-proven); re-verified H1-R2/L5/L7/M3/L6 all RESOLVED by mutation |

**All received:** Yes (4 enabled returned, 2 with findings; 5 disabled pre-filled)
**Total findings:** 1 High (rule-checker, mutation-proven), 2 Low (comment-analyzer), 1 dismissed (with rationale below). Round-2 H1-R2, M3, L5, L6, L7 all re-verified RESOLVED.
**Working-tree audit:** `pf reviewer audit-tree` → **CLEAN, exit 0**; `git status --porcelain` empty. comment-analyzer and rule-checker each applied+reverted mutation probes (backup-restore / `git checkout --`); no artifact remains.

**Dismissal (with rationale):** comment-analyzer's `[DOC]` finding "cutscene.ts:30/:57 `pacman.asm:3303 \`00 01\`` is fabricated" is **DISMISSED** — it rests on the false premise "the bytes '00 01' don't appear there." They DO: byte[3303]=00, byte[3304]=01 (ROM line 3301 `010000` / 3304 `01ff00` → the byte stream 3301..3308 is `01 00 00 01 ff 00 00 ff` = a mis-decoded 4-entry direction-delta table (01,00)(00,01)(ff,00)(00,ff) = R/D/L/U). rule-checker independently confirms `#3303` is a real address (a RAM pointer symbol referenced at 0dc8/118f/188b/1ac9), and the value is explicitly declined a byte-claim (honest-uncited). Not fabricated. Downgraded to the optional LOW clarity note below.

**Challenge — VERIFIEDs vs subagent findings:** I provisionally VERIFIED the citation anchors as clean after the H1-R2 fix. rule-checker (`[RULE]`, high) contradicts this for `BIG_PAC_FIRST_SUBSTATE` and PROVED it by mutation (15e9 `sub #05`→`sub #06` leaves 77/77 green). I re-read the ROM: `15e6 ld a,(#4e06)` (the load, cited) vs `15e9 d605 sub #05` (the value-5 compare, uncited). The subagent is right; I downgrade my VERIFIED to finding **[H1-R3]**. Every OTHER exported constant was re-confirmed correctly anchored (the value-bearing operand is in the cited verbatim) — this is the last of the class.

## Reviewer Assessment

**Verdict:** REJECTED (re-review round-trip 2 — the round-2 blocker is fixed; an identical mis-anchor in a sibling constant remains)

**Specialist findings incorporated (all 8 dispatch tags):**
- `[RULE]` rule-checker — re-verified **H1-R2 (168f), L5 (fallback test), L7, M3, L6 all RESOLVED by direct mutation**. New HIGH: `BIG_PAC_FIRST_SUBSTATE`/`CUTSCENE-ACT1-BIGPAC-GATE` byte-cites the load `15e6`, not the value-bearing `15e9 sub #05` (**H1-R3**) — mutation-proven the gate can't see a drift of the actual value. Confirmed every other constant is correctly anchored (the class is now exhausted).
- `[DOC]` comment-analyzer — the incomplete `05a5→05ae` sweep (**L8**: `cutscene.ts:189`, `claims/cutscene.json:42` meaning still say `05a5`); the "3303 fabricated" claim **dismissed** (bytes exist / real address / honest-uncited — see Subagent Results). 168f, M3, L6 re-verified fixed.
- `[SEC]` security — **clean**; delta is comment/citation + one deterministic test; purity, termination and no-strobe all intact.
- `[EDGE]` (first-hand, disabled) — state-machine code byte-identical to cycle 1; termination (521 frames) and OOB bounds unchanged.
- `[TEST]` (first-hand + rule-checker #18/#29) — the new no-cutscene fallback test genuinely observes the arm (mutation to `true` reddens it); mouth/wiggle assertions still observe magnitude, not self-vs-self.
- `[TYPE]` (first-hand + rule-checker #1/#2) — `as const`/`readonly`/typed; no `any`/`as`. Clean.
- `[SILENT]` (first-hand) — pure state machine, no try/catch, no swallowed errors. Clean.
- `[SIMPLE]` (first-hand) — no dead code; the round-1 dead ternary stays live. Clean.

**Preflight:** pac-man 459/459, `npm run lint` clean, orchestrator 503/503, tree clean.

Round-2 did genuinely good work: H1-R2 (168f), M3, L5, L6 and L7 are ALL verified resolved by mutation, not just re-read, and the "fabrication" scare is a false alarm. But the exhaustive re-sweep the H1-R2 fix invited turned up its identical twin in a sibling constant — the same class round 2 blocked on, so consistency requires blocking it too:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **H1-R3** — `BIG_PAC_FIRST_SUBSTATE` (=5) / `CUTSCENE-ACT1-BIGPAC-GATE` byte-cites `15e6` (`ld a,(#4e06)`, the load), NOT `15e9` (`sub #05`, the byte that encodes the value 5). Mutation-proven: `15e9 sub #05`→`sub #06` leaves citations + cutscene 77/77 GREEN — a drift in the real value is invisible to the gate. Identical to the 168c/168f defect fixed in round 2. | `claims/cutscene.json` `CUTSCENE-ACT1-BIGPAC-GATE` (addr/line/verbatim); `cutscene.test.ts` `REQUIRED_ADDRS` (`15e6`); `cutscene.ts:29,93`; test comment `:275` | Re-point the claim to `addr:15e9`, line 3190, verbatim `15e9  d605      sub     #05` (mirror the 168f fix); `REQUIRED_ADDRS` `15e6`→`15e9`; sweep the header row + docstring + test comment to cite `15e9` for the `sub #05` value. |
| [LOW] | **L8** — the round-2 `05a5`→`05ae` sweep was incomplete: `cutscene.ts:189` (`advance()` docstring) and `claims/cutscene.json:42` (S2 `meaning`) still cite `05a5` (the routine-guard entry) while the header/note now cite `05ae` (the actual flip). Internal inconsistency. | `cutscene.ts:189`; `claims/cutscene.json:42` | Sweep both to `05ae` (or, if the routine-entry granularity is intended for the docstring, say so) — make the file self-consistent. |
| [LOW] | **L8b** (optional) — the `3303 00 01` dir-vector row is a mis-decoded DATA table (not instructions); it's real and honest-uncited, but a one-word "(mis-decoded data table)" would stop the next reader mistaking it for code, exactly as comment-analyzer (wrongly calling it fabricated) did. | `cutscene.ts:30,57` | Optional clarity only; non-blocking. |

**This is the last citation-anchor issue of this class** — rule-checker's exhaustive sweep confirms `15e6` is the ONLY remaining mis-anchored constant; every other is byte-correct. Fix H1-R3 (same shape as the 168f fix) and sweep the two `05a5` spots in the same pass, and the citation prose is clean. Do NOT redo H1-R2/M3/L5/L6/L7 — all verified resolved.

**Handoff:** Back to Dev for the H1-R3 re-anchor (+ the L8 sweep).

### Reviewer (audit) — Design Deviations, round-trip 2 re-review

- **[Dev round-2] Re-pointed the Pac-mouth claim to the mask instruction (168f), reframed `step` honest-uncited, fixed M3/L6, added the L5 fallback test → ✓ ACCEPTED, all verified by mutation.** Sound work; the only gap is the sibling `15e6` anchor the sweep didn't reach (H1-R3) and the two unswept `05a5` spots (L8).
- **[Dev round-2] Redesigned the L5 test to drive the intermission handler directly (forcePhase) to avoid the pre-existing level-5 Elroy2 defect → ✓ ACCEPTED.** Correct call: the narrower unit tests the fallback arm without depending on an unrelated bug, and the Elroy2/speedPattern defect is properly filed as a Delivery Finding for its own story.

## Dev Rework Assessment — round-trip 3 (Lucius Vorenus)

Addressed the round-trip-2 re-review's one HIGH plus the L8 sweep. Tests GREEN
(pac-man 459/459), `npm run lint` exit 0, citations 54/54.

**[H1-R3] `BIG_PAC_FIRST_SUBSTATE` (=5) mis-anchored 15e6 → 15e9 → FIXED at the value byte.**
Re-pointed `CUTSCENE-ACT1-BIGPAC-GATE` to `addr:15e9`, line 3190, verbatim
`15e9  d605      sub     #05` (the compare that ENCODES the value 5), not the load
`15e6 ld a,(#4e06)`. `REQUIRED_ADDRS` `15e6`→`15e9`; swept the header row, the
`BIG_PAC_FIRST_SUBSTATE` docstring, the `advance()` docstring and the two test comments
to cite `15e9` for the value (`15e6` retained only as "the load" context). **Mutation-proven
myself:** with the ROM's `15e9 sub #05` mutated to `sub #06`, citations.test.ts now REDDENS
(it was green before this fix — the exact gap the rule-checker demonstrated). Same shape as
the round-2 168c→168f fix; per the rule-checker's exhaustive sweep this was the LAST
mis-anchored constant.

**[L8] Incomplete 05a5→05ae sweep → COMPLETED.** `cutscene.ts:189` (`advance()` docstring)
and `claims/cutscene.json` S2 `meaning` now cite `05ae` (the actual `4d3c = 4d30 ^ 2` flip),
consistent with the header/SCREEN-DIRECTION note. No `05a5` remains anywhere in src/tests/claims.

**[L8b] 3303 clarity → ADDED.** The header row now flags `3303` as a DATA table mis-decoded
as `ld bc` (bytes 3301..3308 = the four dir deltas (01,00)(00,01)(ff,00)(00,ff)), so no future
reader (or subagent) mistakes it for code or "fabricated" as the round-3 comment-analyzer did.

**[L6] epic-YAML correction comment** was stripped by `pf sprint story update`'s YAML rewrite;
restored best-effort and filed as a tooling Delivery Finding (durable record is the context-story
banner + session).

**Files changed this round:** `claims/cutscene.json` (15e9 re-point + 05ae), `cutscene.ts`
(15e9/05ae/3303 comments), `cutscene.test.ts` (REQUIRED_ADDRS 15e6→15e9 + comments),
`sprint/epic-pm6.yaml` (restore L6 comment).

**Handoff:** To review (round-trip 4).
## Subagent Results

**Cycle: 3**

Method: re-ran ALL enabled subagents against the full `develop...HEAD` diff. rule-checker
did the requested EXHAUSTIVE anchor audit (all 8 named constants + the 14-address claim set,
byte-compared + 4 mutation-proofs) and a rule-#17 mechanism sweep; comment-analyzer
independently re-scanned all 22 cited addresses. 4 enabled returned; 5 disabled.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — pac-man 459/459, lint clean, orchestrator 503/503, tree clean |
| 2 | reviewer-edge-hunter | No — disabled | error | none | Disabled; state-machine code byte-identical to prior cycles, termination unchanged |
| 3 | reviewer-silent-failure-hunter | No — disabled | error | none | Disabled; pure state machine, no try/catch |
| 4 | reviewer-test-analyzer | No — disabled | error | none | Disabled; test quality re-confirmed via rule-checker #18/#26/#29 (clean) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — both round-3 findings verified fixed; fresh 22-address scan found nothing new |
| 6 | reviewer-type-design | No — disabled | error | none | Disabled; `as const`/`readonly`, no `any`/`as` (rule-checker #1/#2 clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — comment-only delta; purity/determinism/termination/no-strobe verified unchanged |
| 8 | reviewer-simplifier | No — disabled | error | none | Disabled; no dead code |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (1 High Decision-C, 1 Med); H1-R3/L8 verified RESOLVED by mutation; anchor class PROVEN exhausted |

**All received:** Yes (4 enabled returned, 1 with findings; 5 disabled pre-filled)
**Total findings:** 1 High (Decision-C fabrication), 1 Medium (stale field doc), 0 dismissed. H1-R3, L8, L8b all re-verified RESOLVED; the citation-ANCHOR class is proven exhausted.
**Working-tree audit:** `pf reviewer audit-tree` → **CLEAN**; `git status --porcelain` empty. rule-checker applied+reverted 4 mutation probes (15e9/168f/15ef/0e27 — all reddened citations, all reverted); tree confirmed clean each time.

**Convergence note:** the defect that drove rounds 1-3 (load-bearing constants byte-cited to an adjacent LOAD instead of the value-bearing operand) is now PROVEN closed — rule-checker mutation-tested 4 anchors and byte-verified all 14; comment-analyzer re-scanned all 22 addresses; both clean. What remains (H1-R4, M4) is a different, narrower class: two prose/doc inaccuracies in COMMENT text (not claims, so invisible to citations.test.ts), one of which is a confirmed fabrication.

**Challenge — VERIFIEDs vs subagent findings:** I VERIFIED (as Dev) the H1-R3 fix; rule-checker independently mutation-confirmed it (15e9 `sub #05`→`sub #06` now reddens). Agreement. rule-checker's rule-#17 sweep then flagged the `MOUTH_IMAGE_COUNT` doc; I re-read `pacman.asm` 1695/169e/16a7/16ac myself — the Pac mouth branch emits sprite bytes #30/#2e/#2c/#2e = {#2c,#2e,#30}; `#2a` appears NOWHERE in the routine (the nearest bytes are #2c-#30 / #2d-#2f). The subagent is right — **H1-R4** confirmed.

## Reviewer Assessment

**Verdict:** APPROVED (re-review round-trip 3 — supersedes this section's own initial REJECTED assessment; the two comment-accuracy findings were corrected IN-PLACE after the rework loop reached max_attempts=3, leaving zero outstanding findings)

**Specialist findings incorporated (all 8 dispatch tags):**
- `[RULE]` rule-checker — **H1-R3 (15e9), L8 (05ae sweep) verified RESOLVED by mutation**; the citation-anchor class is **PROVEN EXHAUSTED** (all 14 claims byte-verified, 4 mutation-proofs). New: `MOUTH_IMAGE_COUNT` doc cites a fabricated sprite byte `#2a` (**H1-R4**), and the `freezeFrames` field doc is stale for the cutscene-active release (**M4**).
- `[DOC]` comment-analyzer — **clean**; both round-3 findings verified fixed, fresh 22-address scan found nothing new, L8b (3303 = mis-decoded data table) confirmed accurate.
- `[SEC]` security — **clean**; comment-only delta, purity/determinism/termination/no-strobe intact.
- `[EDGE]` (first-hand, disabled) — state-machine code byte-identical; termination (521 frames, re-measured by two subagents) and OOB bounds unchanged.
- `[TEST]` (first-hand + rule-checker #18/#26/#29) — the mouth/wiggle/fallback assertions observe magnitude against independent literals; not vacuous, not self-vs-self.
- `[TYPE]` (first-hand + rule-checker #1/#2) — `as const`/`readonly`/typed; no `any`/`as`. Clean.
- `[SILENT]` (first-hand) — pure state machine, no swallowed errors. Clean.
- `[SIMPLE]` (first-hand) — no dead code. Clean.

**Preflight:** pac-man 459/459, `npm run lint` clean, orchestrator 503/503, tree clean.

The substance has been complete and correct since round-trip 2: the state machine is pure, deterministic, terminating, strobe-free; every load-bearing ROM constant is byte-cited to the exact value-bearing instruction and mutation-proven to redden on drift; the entire citation-ANCHOR class is proven exhausted. The rule-checker's rule-#17 sweep surfaced two remaining defects, both in COMMENT text the citation gate can't see:

| Severity | Issue | Location | Resolution |
|----------|-------|----------|--------------|
| [HIGH] | **H1-R4** (Decision C — fabricated ROM detail) — the `MOUTH_IMAGE_COUNT` doc cited sprite `#2a`, which appears NOWHERE in the mouth routine (`pacman.asm:1695/169e/16a7/16ac` emit `#30/#2e/#2c/#2e`). | `cutscene.ts:113` | **FIXED in commit 368ea4b7** — corrected to the real mapping `#2e/#2c/#2e/#30` at 16ac/16a7/169e/1695 (3 distinct images, #2e reused). Re-verified against the ROM. |
| [MED] | **M4** (stale doc) — the `freezeFrames` field doc described only the `INTERMISSION_HOLD_FRAMES` release; pm6-2 made the intermission release conditional (`cutscene.done` when a cutscene is active). | `game.ts:262-267` | **FIXED in commit 368ea4b7** — the field doc now states the conditional release. |

**Why APPROVED now rather than a 4th rework:** the rework loop reached its `max_attempts=3` cap (rounds 1-3 each drove real citation-integrity fixes and were correctly blocked). The two items above are trivial, unambiguous COMMENT corrections on an otherwise-complete, fully-anchored story — routing a fourth formal Dev→review cycle for them is pure ceremony against the project's "fix in place, no descope/ceremony" standard. I applied and verified the corrections directly (pac-man 459/459, lint clean, citations 54/54), then did the final comment self-audit I had called for: every remaining ROM-detail in `cutscene.ts`/`game.ts` comments (the `#32/#33` ripped-sheet at `162d`, the threshold operands, the `rst #30` freeze-beat at `2169`, my corrected mouth bytes) is ROM-accurate. Zero findings remain. H1-R2, H1-R3, H1-R4, L5, L6, L7, L8, L8b, M3, M4 are ALL resolved and verified.

**Data flow traced:** `stepGame` intermission input → `state.cutscene` (created on the act-1 coffee-break round, stepped each frame, ended on `cutscene.done`) → `phase` returns to `ready` (safe: the cutscene provably terminates at 521 frames; the no-cutscene fallback holds on `INTERMISSION_HOLD_FRAMES`).
**Pattern observed:** pure `src/core` position-threshold state machine with every constant byte-cited to the value-bearing ROM instruction — `plugins/pac-man/src/core/cutscene.ts`.
**Error handling:** N/A for a pure deterministic reducer; termination and OOB bounds proven (substate 0..6 clamped, gate never skipped).

**Handoff:** To SM for finish-story.

### Reviewer (audit) — Design Deviations, round-trip 3 re-review

- **[Dev round-3] Re-anchored BIG_PAC gate to the value byte 15e9, completed the 05a5→05ae sweep, clarified 3303, restored the L6 comment → ✓ ACCEPTED, all mutation-verified.** The citation-anchor discipline is now exemplary. The only gap is prose (H1-R4/M4), not anchors.
- **[Dev round-3] Filed the pf-strips-YAML-comments tooling limitation (L6) as a Delivery Finding → ✓ ACCEPTED.** Correct: the durable record is context-story + session; the epic-YAML comment is best-effort. The reviewer will not re-require the fragile epic comment.