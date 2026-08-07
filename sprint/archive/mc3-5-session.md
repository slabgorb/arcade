---
story_id: "mc3-5"
jira_key: "mc3-5"
epic: "mc3"
workflow: "tdd"
---
# Story mc3-5: Shell: render ICBMs/dead structures/HUD, ammo-gated firing, and a seeded end-to-end playthrough

## Story Details
- **ID:** mc3-5
- **Jira Key:** mc3-5
- **Workflow:** tdd
- **Stack Parent:** mc3-4 (done)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-07T16:53:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T16:19:38Z | 2026-08-07T16:22:16Z | 2m 38s |
| red | 2026-08-07T16:22:16Z | 2026-08-07T16:34:58Z | 12m 42s |
| green | 2026-08-07T16:34:58Z | 2026-08-07T16:41:01Z | 6m 3s |
| review | 2026-08-07T16:41:01Z | 2026-08-07T16:53:17Z | 12m 16s |
| finish | 2026-08-07T16:53:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- Gap (non-blocking): AC3 as literally worded (enemies appear, budget draws down,
  ≤ MXICON, structures monotonic, phase in {play,over}, determinism) is ALREADY
  satisfied by mc3-4's composed loop — those assertions are GREEN on arrival. They
  are kept as a regression guard; the genuine RED for AC3 is the fire-integrated
  end-to-end block (magazine economy through `fireFromKey`). Dev: do not "fix" the
  green enemy-loop tests — they lock mc3-4's sim against the render/input changes.

### Reviewer (review)
- **Improvement** (non-blocking): file/function header docstrings are stale — they stop at
  mc1-4 and omit mc3-5's ICBM/rubble/HUD. Affects `plugins/missile-command/src/shell/render.ts`
  (line 3 header, line 35 drawFrame JSDoc), `src/shell/input.ts` (line 16 fire block),
  `src/main.ts` (line 3 header) — refresh the mechanism comments (TS rule #17). *Found by Reviewer.*
- **Improvement** (non-blocking): the AC1/AC2 source-scan tests use whole-file bare-token
  `toMatch` (TS #15/#25); they pass on the token in a comment. Affects
  `plugins/missile-command/tests/render-battle.test.ts` (:251,255,259,260) and `tests/fire-ammo.test.ts`
  (:177,178,183,184) — anchor to the declaration or drop them (behavioural tests already cover the ACs). *Found by Reviewer.*
- **Gap** (non-blocking): pre-existing NaN passthrough in `clamp()` — a synthetic NaN
  `PointerEvent` permanently corrupts the cursor. Affects `plugins/missile-command/src/core/cursor.ts`
  (:51 — add a finiteness guard, or guard at the `applyPointerMotion` shell boundary). Out of scope
  for mc3-5 (unchanged code); file as its own robustness story. *Found by Reviewer.*

### Dev (implementation)
- **Improvement** (non-blocking): the `main.ts` keydown/pointer wiring and the on-screen
  look of ICBM trails, rubble and the HUD are only verifiable by a screenshot at
  `/missile-command/` — no node test covers `main.ts`. Affects `plugins/missile-command/src/main.ts`
  (an owner/reviewer screenshot check, per the standing mc1 render convention). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Structures drawn by pairing the CITIES/BASES layout constants with the live state flag**
  - Spec source: context-story-mc3-5.md, AC1 ("only live structures draw intact")
  - Spec text: "dead cities/bases as rubble (only live structures draw intact)"
  - Implementation: `drawFrame` iterates the `CITIES`/`BASES` layout constants for
    POSITION and reads `state.cities[i]?.alive` / `state.bases[i]?.alive` for liveness,
    rather than iterating `state.cities`/`state.bases` directly.
  - Rationale: the pre-existing `render-field.test.ts` requires `render.ts` to import
    and reference `CITIES`/`BASES` (the layout is core data, not a shell literal);
    iterating the state arrays alone would regress that source-scan. The index pairing
    keeps both green and preserves the "layout lives in field.ts" invariant.
  - Severity: minor
  - Forward impact: minor — assumes `createCities`/`createBases` keep `state.*[i]`
    aligned with `CITIES[i]`/`BASES[i]` (they do: both are `CONST.map(...)`). A future
    story that reorders or filters the live arrays would need to switch to drawing from
    `state.*[i].pos` instead of the constant.

### Reviewer (audit)
- **Dev's CITIES/BASES-paired-with-state-flag deviation** → ✓ ACCEPTED by Reviewer:
  sound. The alignment assumption is real and holds today (`createCities`/`createBases`
  are `CONST.map(...)`, and `resolveGroundImpacts` in damage.ts preserves array length —
  confirmed by rule-checker). It resolves a genuine constraint: `render-field.test.ts`
  requires `render.ts` to keep consuming `CITIES`/`BASES`, so iterating the state arrays
  alone would have regressed that guard. The forward-impact note (reorder/filter → switch
  to `state.*[i].pos`) is the correct caveat. No undocumented deviations found: the ICBM
  colour choice, rubble representation, and HUD text format are all within AC1's
  "functional colours only" latitude and need no separate log.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/shell/render.ts` — `drawFrame` now draws each
  `state.icbms` head (dot) + `origin→head` trail; gates cities/bases on `.alive`
  (live → intact block/triangle, dead → grey rubble line); and draws a top-band HUD
  with `SCORE ${state.score}` (verbatim, never re-derived) and each base's ammo.
  `CITIES`/`BASES` remain the layout source (paired by index with the live flags).
- `plugins/missile-command/src/shell/input.ts` — new `fireFromKey(key, state):
  GameState` reducer: a live base with ammo > 0 appends `launchAbm(base.pos,
  state.cursor)` and spends one round; a non-fire key / destroyed base / empty base
  returns the state unchanged; pure (no mutation). Z/X/C→0/1/2 mapping unchanged.
- `plugins/missile-command/src/main.ts` — keydown handler now calls
  `fireFromKey(event.key, game)`, replacing the mc1-4 unconditional launch; dropped
  the now-unused `BASES` / `launchFromKey` imports.

**Tests:** missile-command 503/503 GREEN (all 33 mc3-5 tests + every pre-existing
test, incl. `render-field`/`fire`/`input`); orchestrator 408/408; `npm run lint`
(tsc --noEmit) clean. Verified by `testing-runner` (RUN_ID mc3-5-dev-green). AC4's
three gates are all green.

**AC coverage:** AC1 (render ICBMs/rubble/HUD, score verbatim) ✓; AC2 (ammo-gated
firing, mapping preserved) ✓; AC3 (seeded playthrough incl. magazine economy +
determinism) ✓; AC4 (full gate green) ✓.

**Branch:** feat/mc3-5-shell-render-hud-ammo-firing-playthrough (pushed, `ba50b972`)

**Handoff:** To review (Reviewer / Obi-Wan Kenobi).

## TEA Assessment

RED phase complete. Three new failing test files, verified by `testing-runner`:
24 failing / 9 passing across the missile-command project; `npm run lint` GREEN
(the `@vite-ignore` dynamic-import idiom keeps `tsc --noEmit` green while the new
`fireFromKey` export is absent). No pre-existing test regressed. Commit on branch:
`test(mc3-5): failing tests — battle render, ammo-gated fire, seeded playthrough`.

**The contract Dev (Yoda) implements for GREEN:**

- **AC1 — `src/shell/render.ts` `drawFrame(ctx, state, w, h)`** (extend; no new export):
  after the existing field draw, (a) draw each `state.icbms` head + `origin→pos`
  trail in the enemy colour; (b) branch on `.alive` so a dead city/base draws as
  rubble and only LIVE structures draw intact (today it loops the `CITIES`/`BASES`
  constants and ignores `state.cities`/`.bases`); (c) draw a HUD emitting
  `String(state.score)` (the core value — never re-derived) and each base's `ammo`
  via `fillText`/`strokeText`. Functional colours only; palette/stamps are mc9.
- **AC2 — `src/shell/input.ts` new `fireFromKey(key, state): GameState`** (pure
  reducer): `base = state.bases[fireKeyToBase(key)]`; for a non-fire key, a
  destroyed base, or `ammo === 0`, return state UNCHANGED; else return
  `{ ...state, abms: [...state.abms, launchAbm(base.pos, state.cursor)], bases: <that
  base's ammo − 1> }`. Preserve the Z/X/C→0/1/2 mapping (`fireKeyToBase` stays).
  Never mutate the input. `main.ts` should then call `fireFromKey` on keydown.
- **AC3** is exercised by the seeded playthrough; the fire block goes green once AC2
  lands. Then run the full gate: `npx vitest run --project missile-command`,
  `npm run lint`, `npm run test:orchestrator`.

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md`):
- *No vacuous assertions / fixture-value-is-expectation.* Every test asserts a
  concrete value or a behavioural delta; MXICON/NICBMS and the magazine size are
  IMPORTED from core, not hardcoded, so no fixture doubles as its own oracle. A
  stray `expect(end, undefined)` was written and removed during self-check.
- *Guards are mutation-testable.* Dead-vs-live is a column-signature INEQUALITY
  (deleting the rubble branch → identical signatures → red); HUD "not re-derived"
  uses an unreachable score (90210 with 0 kills) so a recomputed copy reads "0" and
  fails; ammo gate is checked in both directions (spend on success, no-op on
  empty/destroyed) plus a past-empty loop that pins ammo at 0, not negative.
- *No new citations introduced.* Tests live outside `src/core`; the AC3 citation
  guard is untouched (no new claimed constants).
- *Purity.* `fireFromKey` is asserted non-mutating; the sim's determinism is pinned
  same-seed-equal AND different-seed-divergent (guards the seed being ignored).

**Handoff:** phased/tdd, RED → GREEN. Next agent: Dev (Yoda).

## SM Assessment

Setup complete for mc3-5 (5pt, p1, tdd/phased). Story is the missile-command shell +
integration layer that makes mc3 visibly playable, extending an existing base.

**Board & contention (probed before setup):**
- No remote branch claimed mc3-5 prior to setup; no live sessions in other checkouts.
- `origin/develop` had advanced to `9a134381` (siblings landed jt10-1); fast-forwarded
  local develop before cutting the branch, so `feat/mc3-5-…` is based on current develop.
- Claim pushed: branch `feat/mc3-5-shell-render-hud-ammo-firing-playthrough` + commit
  `586fde81` (epic-YAML stamp `in_progress` + context file). Sibling probes now light up.
- One unrelated open PR (#67 `chore/pm3-plan`, author's own planning chore, non-draft) —
  not a tracked story, does not bind mc3-5; flagged to user.

**Premises verified against the current tree (this is a build/extend story, not stale):**
- Dependency mc3-4 (combat loop: GameState + stepGame) is `done`.
- `plugins/missile-command/src/shell/render.ts` and `shell/input.ts` ALREADY EXIST — this
  story extends them, it does not create them.
- Harness `tests/render-field.test.ts` and `tests/fire.test.ts` exist; the new
  `tests/mc3-playthrough.test.ts` must match that harness (canvas-mock style, seeded).
- ACs copied VERBATIM from `sprint/epic-mc3.yaml` (spot-checked "re-derived copy" and
  "MXICON" present in context); no derivation or correction block needed.

**Scope reminders for downstream agents (from the ACs):**
- HUD score must be the core's `state.score`, never a re-derived copy.
- input.ts: destroyed OR ammo=0 base cannot fire (no-op); a good shot appends one ABM and
  decrements that base's ammo by 1; preserve the per-key→base mapping.
- Functional colours only — per-wave palette / authentic stamps are mc9, out of scope here.
- Final gate: `npx vitest run --project missile-command`, `npm run lint`, and
  `npm run test:orchestrator` must all be green.

**Handoff:** phased/tdd → next agent TEA (Han Solo) for the RED phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (937 tests green, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — Reviewer assessed test quality directly |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 (stale docstrings) | confirmed 4, dismissed 0, deferred 0 (all Medium/Low, non-blocking) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — Reviewer assessed types directly |
| 7 | reviewer-security | Yes | findings | 1 (pre-existing cursor.ts NaN) | confirmed 1, deferred 1 (out-of-diff, Low) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 13 (all Low/cosmetic) | confirmed 13, dismissed 0, deferred 0 (none blocking) |

**All received:** Yes (4 enabled returned; 5 disabled via settings pre-filled as Skipped)
**Total findings:** 18 confirmed, 0 dismissed, 1 of them deferred (pre-existing/out-of-diff). Zero Critical, zero High — none blocking.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

Exhaustive enumeration (rule-checker cross-checked, Reviewer verified the substantive ones by reading the code):
- **#1 type-safety escapes** — production src: 0 `as any`/`as unknown as`/unguarded `!`. Tests: one `as unknown as CanvasRenderingContext2D` (render-battle.test.ts:91), identical to the accepted sibling `render-field.test.ts:91` fake-canvas convention. **Compliant (prod) / Low (test convention).**
- **#4 `??` vs `||`** — `state.cities[i]?.alive ?? true` (render.ts:47), `state.bases[i]?.alive ?? true` (render.ts:62): **`??` is CORRECT** — `alive:false` is falsy-but-valid; `||` would redraw every dead structure as alive. `!base.alive || base.ammo === 0` (input.ts:79) is a boolean gate, not a default. **Compliant.**
- **#5 module/`.js` extensions** — all 9 prod + 8 test relative imports/specifiers carry `.js`; `import type { GameState }` is type-only. **Compliant.**
- **#11 error handling** — `catch (e) { (e as Error).message }` (fire-ammo.test.ts:51, mc3-playthrough.test.ts:36) lacks `instanceof` narrowing. Matches the pre-existing fleet `fire.test.ts:97` idiom; test-only RED loader message. **Low, non-blocking.**
- **#15 / #25 source-text guards** — 8 whole-file bare-token `toMatch` scans over render.ts/input.ts. Each would pass on the token appearing in a comment, so as guards they are weak. **All Low** — every one is redundant with a same-file *behavioural* test that reddens on mechanism deletion (verified). Not the sole guard for any AC.
- **#17 comments asserting a mechanism** — the *new* function-level docs (fireFromKey JSDoc, HUD comment, rubble/intact comments) are accurate; the *file/function header* docstrings are stale (see [DOC] findings). **Mixed — Medium/Low.**
- **#18 / #26 fixture-is-expectation / self-referential assertions** — none. The score=90210 and ammo=[8,6,3] fixtures are deliberately un-recomputable/non-colliding; numeric assertions trace to imported `NICBMS`/`MXICON` or live state. **Compliant (well-designed).**
- **#21 degenerate numeric input** — the `?? true` fallback fires only on nullish out-of-range reads, not on a present `0`; `ammo`/`blastRadius` values reaching arithmetic are read directly and gated. **Compliant.**
- **#27 core/shell boundary (project rule)** — render.ts/input.ts import only from core/*; no core file imports shell (grep confirmed). Type-only `GameState` import is fine. **Compliant.**
- **#28 HUD-figure verbatim (project rule)** — render.ts:138 draws `String(state.score)` directly, render.ts:139 each `b.ammo` directly; no re-derivation. **Compliant**, pinned by render-battle.test.ts:212-244.
- Rules #3/#6/#9/#10/#12/#13/#14/#16/#20/#22/#23/#24 — not applicable (no enums, JSX, config, API input, perf hot-paths, state-machine edges, aria, measured figures, NaN-inverting rewrites, mutant tables, or retirements in this diff).

## Reviewer Assessment

**Verdict:** APPROVED

**Observations** (≥5; confirmed subagent findings tagged by source):

- [VERIFIED] Alive-gate uses `??`, not `||` — render.ts:47,62. `false ?? true → false`, so a dead structure stays rubble; `||` would be the classic "dead-drawn-alive" bug. Complies with TS rule #4. Pinned by render-battle.test.ts dead-vs-live column-signature inequality.
- [VERIFIED] HUD score is `state.score` verbatim — render.ts:138 interpolates `String(state.score)` with no recomputation; complies with the HUD-figure project rule (#28). The score=90210/0-kills test (render-battle.test.ts:212-244) would fail a re-derived copy.
- [VERIFIED] `fireFromKey` is a pure, correctly-gated reducer — input.ts:75-83 returns state unchanged for non-fire/dead/empty-base, else appends `launchAbm(base.pos, state.cursor)` and decrements that base's ammo via `map`+spread (no mutation). Gate `!base.alive || base.ammo === 0` covers both no-op paths. Pinned across fire-ammo.test.ts (spend, no-op, past-empty floor, purity).
- [VERIFIED] core/shell boundary intact — render.ts/input.ts import only from core/*; no core→shell import exists (grep). Type-only `GameState` import respects the rule (#27).
- [VERIFIED] Full gate green — preflight: missile-command 503/503, orchestrator 408/408, `tsc --noEmit` clean, no smells (AC4).
- [DOC] Stale header/function docstrings — render.ts:35 (drawFrame JSDoc describes only mc1-3 crosshair; the strongest, high-confidence), render.ts:3 (file header), input.ts:16 (mc1-4 fire block doesn't mention `fireFromKey`), main.ts:3 (header omits the mc3-5 gate). Confirmed against TS rule #17. **Medium/Low, non-blocking** — recommend a doc refresh (see Delivery Findings); the new function-level docs are accurate.
- [RULE] Whole-file bare-token source-scan tests (8 sites) — render-battle.test.ts:251,255,259,260 and fire-ammo.test.ts:177,178,183,184 (TS #15/#25). **Low** — redundant with behavioural coverage in the same file; not the sole guard for any AC.
- [RULE] `catch (e as Error)` without `instanceof` narrowing — fire-ammo.test.ts:51, mc3-playthrough.test.ts:36 (TS #11). **Low** — fleet convention (matches fire.test.ts:97), test-only.
- [RULE] Missing `readonly` on two test helper params (render-battle.test.ts:109,115) and one `as unknown as` ctx (render-battle.test.ts:91). **Low/cosmetic**, sibling-file convention.
- [SEC] Pre-existing NaN passthrough in `clamp()` — core/cursor.ts:51 (NOT in this diff). A synthetic `PointerEvent` with NaN `movementX/Y` permanently corrupts the cursor. **Low, deferred** — out of scope for mc3-5 (unchanged code; mc3-5 does not widen its blast radius — the cursor was already the ABM target in mc1-4). Filed as a follow-up.

**Data flow traced:** keydown → `event.key` → `fireFromKey` (input.ts) → `fireKeyToBase` maps to base idx (exhaustive switch, `default: null`) → gate on `state.bases[idx].alive`/`.ammo` → `launchAbm(base.pos, state.cursor)` appended, ammo decremented → next `stepGame` flies it → `drawFrame` paints trail/blast/HUD. Safe: every non-fire key is a no-op; idx is always ∈{0,1,2}; no unbounded index, no mutation of input.

**Pattern observed:** clean shell/core separation — the shell consumes core reducers (`launchAbm`, `stepGame`) and never re-implements geometry; the alive-gate and HUD read core state verbatim (render.ts:47,138).

**Error handling:** the gate is total (non-fire/dead/empty all return state unchanged); ammo bottoms at 0, never negative (fire-ammo.test.ts past-empty loop). No swallowed errors in production code.

### Devil's Advocate

Assume this is broken. First target: the cursor. `clamp()` (cursor.ts:51) returns NaN unchanged, and mc3-5 routes `state.cursor` into `fireFromKey` as the ABM target — so a NaN cursor spawns NaN-targeted missiles that never resolve. But that requires a synthetically-dispatched NaN `PointerEvent` (real `movementX/Y` is spec-finite), the code is pre-existing and unchanged here, and mc3-5 doesn't widen the exposure (mc1-4 already used the cursor as the target). Deferred, not introduced. Second: the HUD draws ammo for *every* base including destroyed ones (`state.bases.map(b => b.ammo)`), so a dead base still shows a stale count — but that is within AC1's "each base's ammo" and is cosmetic, not wrong. Third: the different-seed divergence test (`trajectory(7) !== trajectory(8)`) could in principle flake if two seeds produced identical 300-frame trajectories — astronomically unlikely with per-frame `nextInt` draws, and the same-seed-equal test is the real determinism guard; acceptable. Fourth: a confused reader trusts the stale drawFrame docstring and thinks the function only draws a crosshair — real, but a documentation cost, not a runtime one. Fifth: could the index-pairing (CITIES[i] ↔ state.cities[i]) desync? Only if a future story filters/reorders the live arrays; today both are `CONST.map(...)` and damage preserves length — the deviation log already flags the caveat. Sixth: `base = state.bases[idx]` would throw if `bases` were shorter than 3, but `createBases()` guarantees 3 and nothing shrinks it. None of these rises to Critical/High; the worst live issue is a misleading docstring. Verdict stands: APPROVED, with the doc/test-hardening items as tracked follow-ups.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.