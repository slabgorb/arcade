---
story_id: "jt13-9"
jira_key: "jt13-9"
epic: ""
workflow: "tdd"
---
# Story jt13-9: Joust transporter wait-for-first-move idle colour-cycle (ROM TREFF phase 2, JOUSTRV4.SRC:5805-5890): after the 30-frame warp-in grow, the full-size bird colour-cycles owner/white/grey (TREPL1/2/3) at an accelerating rate (16-8-4-2-1 naps) until the player flaps or it times out; descoped from jt13-2

## Story Details
- **ID:** jt13-9
- **Jira Key:** jt13-9
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-9-transporter-idle-colour-cycle
- **PR:** 542

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-18T12:39:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T12:02:34Z | 2026-08-18T12:04:58Z | 2m 24s |
| red | 2026-08-18T12:04:58Z | 2026-08-18T12:20:37Z | 15m 39s |
| green | 2026-08-18T12:20:37Z | 2026-08-18T12:27:59Z | 7m 22s |
| review | 2026-08-18T12:27:59Z | 2026-08-18T12:39:47Z | 11m 48s |
| finish | 2026-08-18T12:39:47Z | - | - |

## Sm Assessment

**Story:** jt13-9 — Joust transporter TREFF **phase 2**: the wait-for-first-move idle
colour-cycle. 3pt, p3, tdd (phased). Descoped from jt13-2. Repo: arcade (joust plugin).

**Premise verified against the live tree (not taken on faith from the backlog title):**
- jt13-2 (5pt, DONE 2026-08-17) shipped **phase 1** — the 30-frame TREFF grow-in — as the
  pure core state machine `plugins/joust/src/core/warpin.ts` (`WarpInState = {frame, nap,
  done}`; `startWarpIn`/`stepWarpIn`; `WARPIN_FRAME_COUNT=30`, `WARPIN_FRAME_NAPS=1`,
  `WARPIN_BIRD_VISIBLE_PFRAME=20`).
- That module's own header (warpin.ts:31-32) explicitly names THIS story as its filed
  follow-up: *"This story builds PHASE 1 (the grow-in). The wait-for-first-move idle
  colour-cycle (:5805-5890) is a filed follow-up, not this module."*
- Confirmed absent today: `stepWarpIn` terminates at `done: true` after the 30 frames;
  there is NO idle / wait-for-first-move / colour-cycle phase anywhere in
  `plugins/joust/src/`. So this is genuinely new behaviour building on landed code — the
  premise is CURRENT, not a stale/refuted banner. No correction block was needed for setup.

**Scope for TEA (RED):** cover the ROM phase-2 spec, JOUSTRV4.SRC:5805-5890 (TREFF phase 2 /
TREPL1-3). Behaviour: after the grow-in completes, the full-size bird holds and colour-cycles
through owner / white / grey (TREPL1/2/3) at an **accelerating** cadence — 16, 8, 4, 2, 1
naps per colour step — until the player flaps (first-move input) OR the phase times out, at
which point PLYINT hands the bird to the brain. Re-derive every constant (the 16-8-4-2-1
cadence, the colour order, the timeout) byte-for-byte from the source — do not take my
paraphrase as canonical.

**Boundary:** same core/shell split as phase 1. The phase-2 state machine + cadence belong in
core (extend warpin.ts or a sibling module — the jt1-7 purity scanner sweeps core). The actual
colour RENDER of the silhouette belongs in the shell (render.paintWarpIn). Watch the `done`
terminal: phase 2 begins where phase 1 currently ends.

**Contention:** clean. No remote branch or live sibling session owned jt13-9 at setup; claim
(context + in_progress stamp) committed and branch `feat/jt13-9-transporter-idle-colour-cycle`
pushed to make the ownership visible.

## Tea Assessment

**RED delivered (Han Solo).** 4 artifacts, committed on the feature branch. Full joust
suite: **36 new failures (mine) / 3786 pass**, no collateral; `npm run lint` (tsc) clean.

**The ROM, re-derived from the vendored source (JOUSTRV4.SRC:5805-5871 + TREPL 5581-5583):**
the phase-2 "WAIT FOR 1ST MOVE, OR TIME OUT" loop. Two interacting counters —
- `PFEET` (speed) seeds to `16*2`=**32** (:5810), halves to 16 on the first wake (PTIMUP
  starts CLR at 0), then halves each 75-nap window: **16→8→4→2→1→0**. The sixth halving
  (`LSR PFEET / BEQ 50$`, :5847-48) is the **timeout**.
- `PACCX` (colour step) seeds to 16, reloads to `PFEET` and advances `PLANTZ` on expiry
  (:5862-66) → colour-change cadence **accelerates 16,8,4,2,1** — the title's claim, verified.
- `PTIMUP`=**75** per window (:5845); `PLANTZ`=**2** start (:5814); any `CURJOY`≠0 aborts
  early (`BNE 51$`, :5831/:5841). Palette = TREPL1/2/3 owner/white/grey (`GRY=$D` is literally
  "LITE GREY FOR TRANSPORTER EFFECT"). No-input run = `1 + 5×75` = **376 naps**.

**Files:**
- `tests/helpers/warpin-idle-contract.ts` — the contract + runtime loader (clean "not built
  yet" throw naming every constant; the loadWarpIn precedent).
- `tests/warpin-idle-jt13-9.test.ts` — behaviour: constants, accelerating cadence (gaps =
  {16,8,4,2,1}, non-increasing, min 1 max 16), 376-nap timeout, first-move abort, per-owner
  palette, purity/determinism/idempotence.
- `tests/warpin-idle-source-jt13-9.test.ts` — the jt1-3 double-entry: an independent parser
  re-derives every constant + the TREPL role tables from the vendored source, plus the
  `JT139-*` claims-coverage + verbatim gate (GREEN authors the claims). ROM-structural `it`s
  pass now (they prove the citations); the module-gate `it`s are RED.
- `tests/warpin-idle-wiring-jt13-9.test.ts` + `SimProcess.idleCycle` on sim-contract — the
  integration guard: a materialising arrival stepped past its grow-in must carry an ACTIVE
  idle cycle that stepSim drives to `timed-out`. Keeps GREEN from shipping a dead module.

**GREEN scope (Yoda), in order:** (1) extend `src/core/warpin.ts` with the pure idle-cycle
(`IdleCycleState`, `startIdleCycle`/`stepIdleCycle`/`idleColour`, the 8 constants) — do NOT
touch jt13-2's `WarpInState.done` semantics; (2) add `idleCycle?` to the PRODUCTION SimProcess
and open it at the `advanceWarpIn` seam when `warpIn.done` fires, advancing it each frame
(player flap → `moved`, else runs to `timed-out`); (3) render the colour-cycling silhouette in
the shell (resolve `'owner'` to DCONST, as paintWarpIn does); (4) author `JT139-*` claims in
`docs/rom-study/claims/warpin.json` for the cited ranges (:5810-11, :5812-13, :5814-15, :5828,
:5831-41, :5845-48, :5862-66, :5581-83) — verbatim must match the source line.

### Rule Coverage
- **Sim/core purity (jt1-7):** the contract prescribes the idle cycle as PURE core (no clock,
  no entropy, no shell import). Behaviour suite pins determinism (identical replays), no
  mutation of args, and terminal idempotence — the purity scanner will sweep the new export.
- **No stale line-refs in comments (jt9-30):** enforced by `comment-line-refs.test.ts`. My
  wiring header initially cited `sim.ts:NNNN`; converted to symbol refs (`advanceWarpIn`,
  `drawList`) — guard green.
- **Source-citation fidelity (audit/citations pattern):** every ROM claim is a
  cited+verbatim pair via the `JT139-*` claims gate + an INDEPENDENT parser double-entry, so a
  constant that re-bakes a misreading cannot pass.
- **TS review checklist:** string-union types over enums (`IdleColour`/`IdleEnd`/`IdleOwner`),
  `readonly` on the exported arrays, `import type`, `.js` ESM extensions, no `as any`, non-null
  assertions only behind `not.toBeNull()` guards.
- **Photosensitive-safety (cross-game rule):** the colour cycle reaches a 1-nap cadence (~58Hz
  colour swaps) near timeout — a **non-blocking flag for GREEN/shell**: the render must not turn
  this into a large-area high-luminance strobe (accessibility outranks ROM fidelity). The
  silhouette is a small on-pad sprite, so this is a caution, not a defect.
- **Gap / non-blocking (Dev, jt13-9):** the VISIBLE render of the idle colour-cycle is deferred to
  a follow-up. Root cause: the ROM gates control during phase 2 (the bird stands on its pad and
  cannot move until it flaps/times out), but the clone deliberately does NOT gate control after
  materialisation (collisions/`mat`), so both players and enemies are active/moving the instant the
  grow-in ends. Rendering a persistent owner/white/grey tint on a moving bird is less faithful than
  omitting it, and a faithful render needs EITHER (a) a control-gated pad-pause (a real gameplay
  change) OR (b) at minimum a player flap-abort threaded into `advanceWarpIn` (input plumbing) plus
  its own render test. All are beyond a 3-pt visual follow-up. The pure state machine + its sim
  presence (both tested) are delivered; the visible effect is a clean next story. Also of note: the
  photosensitive-safety caution above (1-nap final cadence) is a design input for whoever builds that
  render.

## Dev Assessment

**GREEN delivered (Yoda).** All **48 jt13-9 tests pass**; full joust suite **3822/3822**;
`npm run lint` (tsc) clean. Three files, one commit.

**What shipped:**
1. **Pure core** — `src/core/warpin.ts` gains the phase-2 idle cycle: `IdleCycleState`,
   `startIdleCycle`/`stepIdleCycle`/`idleColour`, and the eight constants (`IDLE_SPEED_INIT=32`,
   `IDLE_STEP_INIT=16`, `IDLE_COLOUR_INDEX_INIT=2`, `IDLE_SPEED_WINDOW_NAPS=75`,
   `IDLE_CADENCE=[16,8,4,2,1]`, `IDLE_SEQUENCE_LENGTH=8`, the TREPL player/enemy role tables).
   The step faithfully models the two counters: PTIMUP window → PFEET halving (timeout at 0),
   PACCX → PLANTZ colour advance reloading PACCX=PFEET. jt13-2's `WarpInState.done` semantics
   untouched. Pure/deterministic/idempotent (behaviour suite).
2. **Claims** — eight `JT139-*` entries in `docs/rom-study/claims/warpin.json`, verbatim pulled
   directly from the source (tabs preserved), covering every cited range.
3. **Sim wiring** — `SimProcess.idleCycle` (production) + `advanceWarpIn` opens the idle cycle
   the frame after `warpIn.done` and advances it (moved=false) to its PFEET→0 timeout. The
   integration guard (wiring test) drives a real materialising enemy to `timed-out`.

**Deliberately NOT done — the VISIBLE render — and why (see Delivery Finding below).** The ROM's
phase-2 bird is STATIONARY on its pad (control-gated) while it cycles. The clone does not gate
control after materialisation (collisions run off `mat`, per warpin.ts), so a bird is active and
moving the moment the grow-in ends. Painting a persistent owner/white/grey tint on a moving,
active bird would be LESS faithful than not showing it, and adding a control-gated pad-pause is a
gameplay change well beyond a 3-pt visual follow-up. The fidelity-critical core (cadence, palette,
timeout) is delivered and byte-pinned; the render is correctly a separate story. No render test
regressed (none existed — TEA scoped RED to core + state guard for exactly this reason).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (joust 3822/3822, orchestrator 505/505, lint 0, no smells) | N/A |
| 2 | reviewer-security | Yes | clean | none (termination + bounds proven; no attack surface) | N/A |
| 3 | reviewer-rule-checker | Yes | clean | none (34 rules / 71 instances / 0 violations) | N/A |
| 4 | reviewer-comment-analyzer | Yes | findings | 4 — 3 HIGH stale docstrings, 1 LOW citation-span | Confirmed + FIXED all 4 (`f0d4eb62`) |

**All received:** Yes (4 of 4 enabled specialists returned). Disabled specialists
(test_analyzer, edge_hunter, type_design, simplifier) were assessed first-hand — see the
"Disabled subagents I covered myself" note below.

## Reviewer Assessment

**Verdict:** APPROVED (Obi-Wan Kenobi) — round 1, after fixing 4 comment findings in place.

**Tagged subagent findings:**
- **[SEC]** reviewer-security — CLEAN, no findings. Termination and shift/modulo bounds proven;
  pure deterministic state machine, no network/auth/secrets/injection surface.
- **[RULE]** reviewer-rule-checker — CLEAN, 0 violations across 34 rules / 71 instances
  (purity, Object.freeze, closed unions, `.js` ESM extensions, guarded `!`, citation fidelity),
  corroborated by running purity 46/46, comment-line-refs 7/7, jt13-9 suites 76/76.
- **[DOC]** reviewer-comment-analyzer — 4 findings, ALL FIXED this round (`f0d4eb62`): three HIGH
  stale docstrings the GREEN diff turned false (jt13-2 module header, `WarpInState.done` doc,
  `advanceWarpIn` doc) + one LOW `:5871`/`:5890` citation-span inconsistency. All ROM citations
  and 8 `JT139-*` verbatims independently confirmed accurate.

**Subagents (4 enabled):** preflight GREEN (joust 3822/3822, orchestrator 505/505, lint 0);
security CLEAN (termination + shift/modulo bounds proven — pure state machine, no attack
surface); rule-checker CLEAN (34 rules / 71 instances / 0 violations, corroborated by running
purity 46/46, comment-line-refs 7/7, the jt13-9 suites 76/76); comment-analyzer 4 findings.

**Disabled subagents I covered myself** (test_analyzer, edge_hunter, type_design, simplifier):
- Independently re-derived the ROM from scratch (a second `romTrace()` implementation, not the
  test): **376-nap timeout** and colour-gaps **[16,8,4,2,1]** match the module exactly — the
  behaviour tests are not self-consistently-wrong.
- Independently verified all 8 `JT139-*` verbatims byte-for-byte against the source.
- Edge cases: `stepIdleCycle` always progresses to a terminal `end`; `speed>>1` only on
  powers-of-two-derived internals; `colourIndex % 8` never negative. Tests are non-vacuous and
  catch wrong implementations (constant cadence, missing first-halve, wrong reload all redden).
  Types are closed string-unions, `Object.freeze`d arrays, guarded `!` — consistent with the
  warpIn/dissolve/crumble precedent.

**Findings — all 4 FIXED this round (`f0d4eb62`):** three HIGH stale docstrings that the GREEN
diff itself turned false (the jt13-2 module header, `WarpInState.done` doc, and `advanceWarpIn`
doc all still said the wait phase was "unmodeled"/"not this module"/"passes through") + one LOW
citation-span inconsistency (`:5871` vs `:5890`). No correctness defects found.

**Accepted scope decision (not a defect):** the VISIBLE render is deferred (see Dev's Delivery
Finding). Verified the rationale: the bird spawns at rest with NO warp-in physics-freeze, so
over phase-2's 376 frames a faithful render genuinely needs the player flap-abort wiring (and
handling the 6.4s duration) that has product nuance. TEA scoped RED to the fidelity core + a
state guard, no render test. The hard, durable value (byte-pinned cadence/palette/timeout) is
delivered and correct. **Recommend SM file a follow-up story: the visible idle-cycle render +
player flap-abort input threading** (mind the photosensitive-safety finding — 1-nap final
cadence must not become a large-area luminance strobe).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement / non-blocking (TEA, jt13-9):** the ROM's idle colour-cycle reaches a 1-nap
  cadence near timeout (~58 Hz colour swaps on the standing silhouette). The cross-game
  photosensitive-safety rule forbids >3 Hz large-area high-luminance strobing (accessibility
  OUTRANKS ROM fidelity). The pure-core cadence is faithful and correct as tested; the CAUTION
  is for GREEN's SHELL render — the silhouette is a small on-pad sprite (owner/white/grey, not
  black↔white), so this is within bounds, but the render must not amplify it into a large-area
  luminance strobe. Flagged for Reviewer sign-off on the visual.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
None at setup.