---
story_id: "sw7-14"
jira_key: "sw7-14"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-14: R7b Ground debris — tower/bunker ballistic destruction explosion (X-005): 3 pieces, 0x20=32f=1.56s life, upward launch (728-1024 x4) + gravity 200/f, floor-freeze, scaled ground shadow (red bunker / white tower)

## Story Details
- **ID:** sw7-14
- **Jira Key:** sw7-14
- **Workflow:** tdd
- **Stack Parent:** sw7-1 (done)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T09:57:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T08:44:04Z | 2026-07-18T08:46:32Z | 2m 28s |
| red | 2026-07-18T08:46:32Z | 2026-07-18T09:13:23Z | 26m 51s |
| green | 2026-07-18T09:13:23Z | 2026-07-18T09:33:50Z | 20m 27s |
| review | 2026-07-18T09:33:50Z | 2026-07-18T09:57:44Z | 23m 54s |
| finish | 2026-07-18T09:57:44Z | - | - |

## Technical Approach

This story implements the ground-target destruction debris effect (X-005 explosion object) for towers and bunkers when hit by the player's fire during the surface level.

### Acceptance Criteria

From the ROM (WSOBJX.MAC X-005 explosion object):

1. **Debris Pieces:** Generate 3 debris pieces per destruction event
2. **Lifetime:** Each piece has a lifetime of 0x20 = 32 frames ≈ 1.56 seconds (at 20.508 Hz)
3. **Launch Velocity:** Upward launch with initial velocities in the range 728-1024 (×4 scaling applied)
4. **Gravity:** Subject to gravity of 200 units per frame, causing a parabolic trajectory
5. **Floor Freeze:** Debris pieces freeze (stop moving) when they hit the floor/ground
6. **Ground Shadow:** Each piece renders a scaled ground shadow, colored red for bunker destruction and white for tower destruction

### Implementation Notes

- Logic belongs in `src/core/` (deterministic simulation)
- Depends on sw7-1 (timebase) which establishes TICK_HZ = 20.508 Hz
- Rendering of shadows belongs in `src/shell/` (render/audio/io layer)
- Cite findings X-005 in the findings JSON when complete

## Sm Assessment

**Routing:** New work, phased `tdd` workflow → next owner is **TEA (red phase)**.

**Nature of the story (Thrawn's read):** A self-contained ROM-fidelity port of the X-005 ground-debris explosion object. The acceptance criteria are fully enumerated from primary source (WSOBJX.MAC) and encoded above — there is no open design question here, only faithful reproduction of six measurable behaviours (piece count, lifetime, launch velocity, gravity, floor-freeze, scaled shadow colour). This makes it ideal for a tight red→green cycle: TEA can write assertions directly against the six numeric ACs.

**Boundary guidance for the pipeline:**
- Debris ballistics (piece count, per-frame launch velocity + gravity integration, 32-frame lifetime, floor-freeze) are **deterministic sim → `src/core/`**. Assert these in core tests.
- The scaled ground shadow and its red-bunker / white-tower colour are a **render concern → `src/shell/`** — keep colour out of core.
- Dependency **sw7-1 (timebase, TICK_HZ = 20.508 Hz)** is done; the 0x20=32f ≈ 1.56s figure derives from it.
- When green, cite finding **X-005** in the findings JSON (`docs/audit/findings/`); a code edit to a cited src file will drift line citations — reanchor with `tools/audit/reanchor-citations.mjs --write`.

**Merge gate:** clear (no open star-wars PRs). Branch `feat/sw7-14-r7b-ground-debris` cut from a current `develop` (fast-forwarded 5 commits at setup).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** X-005 is a NO_COUNTERPART finding — a whole missing subsystem (ground-object destruction debris). New behaviour, so RED tests define the contract.

**Test Files:**
- `tests/core/ground-debris.test.ts` — the ballistics (ACs 1–5 + lifetime + phase-reset + kind back-compat + determinism), 14 tests.
- `tests/shell/render.ground-debris.test.ts` — the scaled ground shadow, red-bunker / white-tower colour family (AC-6), 5 tests.

**Tests Written:** 19 tests covering all 6 ACs. **Status:** RED — 16 clean assertion failures (expected-vs-actual), 3 legitimately-green guards. tsc exit 0.

**ROM verification (primary source):** every constant was re-derived from `~/Projects/star-wars-1983-source-text/WSXPLD.MAC` (`.RADIX 16`), NOT taken on faith from the finding:
- BGBKXP :305, BGTWXP :317; three `NXTFRE`/`LDA #20` pieces (:325/:360/:395) → **3 pieces**, life **0x20 = 32 frames** (hex; `/TICK_HZ` = 1.560 s).
- launch `LDA TMPVZ / JSR LSLD2 ;*4 / STD XP$MZ` (:355-357) → **upward 728–1024 ×4 u/frame** (decimal; `×TICK_HZ`).
- gravity `SUBD #50.*4` (:559) → **200 u/frame²** (`50.` decimal ×4; `×TICK_HZ²`).
- floor-freeze `IFLT / LDD #0 ;FREEZE AT GROUND LEVEL` (:551-554) → **clamp pos.y ≥ 0**.
- shadow `VWTWN` white (:691) / `VWBKN` red (:695), `M.Z0=0` on-ground, `#72` scale → **AC-6, shell**.
The ROM up-axis is Z; ours is Y — XP$MZ→`vel[1]`, XP$CZ→`pos[1]`, floor = `pos[1]=0` (the "third coordinate is HEIGHT" rule).

**TEA contract handed to Dev** (documented in both file headers): a new `GameState.groundDebris: GroundDebris[]`, each piece `{ pos: Vec3; vel: Vec3; age: number; kind: 'tower' | 'bunker' }` — `pos`/`vel`/`age` echo `dyingTies`/`Enemy`; `kind` picks the shadow colour; reset on phase entry like `dyingTies`. Reads go through single forward-compat casts (`debrisOf`/`withDebris`/`stripDebris`) so tsc stays green until Dev adds the field. This mirrors `dyingTies` but as a real ballistic entity (adopts finding X-004: pieces carry velocity, integrated in the sim, not faked in render).

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 nullish `?? 'tower'` (absent `kind` == tower, not `\|\|`) | `a KINDLESS (legacy) turret explodes as a TOWER` | failing (RED) |
| #3 exhaustive kind→colour (both kinds draw a shadow) | bunker→red + tower→white shell tests | failing (RED) |
| #8 meaningful assertions / no `as any` | all — single `as T` casts only, difference-method colour, classifier self-checks | green guards + failing feature |
| core purity (no `Math.random`) | `the spawn is deterministic — identical kills give identical debris` | failing (RED) |
| transient cue cleared on phase entry (dyingTies precedent) | `a leftover debris cloud does not cross into the next phase` | failing (RED) |

**Rules checked:** 5 of the applicable checks have coverage (the rest of typescript.md — React/async/security-input/build-config — are N/A to a pure-sim debris feature).
**Self-check:** 0 vacuous tests. The 3 green tests are intentional guards — the colour classifier self-check (guard-the-guard, sw3-9/sw3-11 convention) and the "tower burst is not RED" negative assertion (passes now with no debris, bites in GREEN if a tower shadow is drawn red). Verified by reading each, not by trusting the haiku runner's "vacuous placeholder" claim.

**Handoff:** To Dev (Yoda) for implementation (green phase).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — `GroundDebris` entity `{ pos, vel, age, kind }`; `GameState.groundDebris` field (+ `initialState`); the ROM constants through the sw7-1 timebase (`GROUND_DEBRIS_LIFE_SECONDS = 0x20/TICK_HZ`, `GROUND_DEBRIS_GRAVITY = 200*TICK_HZ²`, `GROUND_DEBRIS_LAUNCH_TOWER/BUNKER = 0x800/0xC00 * TICK_HZ`, `GROUND_DEBRIS_SPREAD`, `GROUND_DEBRIS_PIECES`).
- `src/core/sim.ts` — `spawnGroundDebris` (3 pieces, left/centre/right fan, deterministic) on a surface kill; `advanceGroundDebris` (integrate pos, gravity on `vel[1]`, floor-freeze `max(0, …)`, drop past life, ride the surface scroll) each frame; wired the field through `stepSurface`'s return and `enterPhase`'s per-phase reset (next to `dyingTies`).
- `src/core/models.ts` — `GROUND_DEBRIS_CHUNK` (tumbling octahedron) + `GROUND_DEBRIS_SHADOW` (flat floor diamond).
- `src/shell/render.ts` — surface branch draws each piece's chunk at `pos` + a shadow at its `x/z` on the floor, red (bunker, VWBKN) / white (tower, VWTWN).
- `docs/audit/findings/pair-explosions.json` — **X-005 `remediated_by: sw7-14`**; reanchored 63 drifted line citations across the findings set (0 lost, line-number only).

**Tests:** 1660/1660 passing (GREEN) — the 19 new debris tests + citations green + no regression in the pre-existing 1641. `tsc --noEmit` clean; `vite build` clean.
**Branch:** `feat/sw7-14-r7b-ground-debris` (pushed to origin).

**Key implementation choices (per TEA's contract + gotchas):**
- Debris is a REAL sim entity (X-004): the ballistics live in `src/core`; `render.ts` is a pure function of `state.groundDebris` (no shell effect-state, no wall-clock) — the "animate off the sim stamp" rule.
- `advanceGroundDebris` rebuilds each piece with **spread-plus-override** (`{ ...p, pos, vel, age }`) so no field is silently dropped by the `.map`-style rebuild (the `Turret.kind` gotcha).
- Integration order matches the ROM (WSXPLD.MAC :550-560): position moves by the CURRENT velocity and freezes at the floor, THEN gravity cuts the velocity — so the gravity/freeze tests read the ROM's own per-frame deltas.
- Spawn appends AFTER the advance, so a just-born piece keeps its pristine launch velocity on frame 0 (the launch-band test).
- Per-type launch bases implemented (tower `0x800`, bunker `0xC00`) — the more faithful of TEA's two options.

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

Only `preflight` and `rule_checker` are enabled in `workflow.reviewer_subagents`; the seven thematic specialists are disabled via settings. Their domains were assessed by the Reviewer directly (mutation-proofs + rule-checker cross-coverage), since coverage cannot be claimed from a skipped subagent.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 1660/1660 tests, tsc + build green, tree clean | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Assessed by Reviewer — boundary paths (two-kills/frame, y=0 clamp, empty list, NaN) traced clean |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Assessed by Reviewer — no try/catch, no swallowed errors, no falsy-coercion fallbacks in the pure math |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Assessed by Reviewer — 6 mutation-proofs (core 4 + shell 2) all flip the right tests RED; 0 vacuous |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Assessed by Reviewer — ROM citations in comments verified; 1 stale test-helper comment noted (LOW) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Covered by rule-checker Rules 1-5 — `readonly` gap FIXED; kind-union fold exhaustive |
| 7 | reviewer-security | Skipped | disabled | N/A | Assessed by Reviewer — N/A (client-side game sim, no input/auth/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Assessed by Reviewer — unused `GROUND_DEBRIS_PIECES` FIXED (removed); dead single-casts noted |
| 9 | reviewer-rule-checker | Yes | findings | 6 (all LOW): 1×readonly [Rule 2], 5×dead-cast [Rule 1] | confirmed 2 (readonly + unused-const, FIXED), deferred 5 (dead casts, precedented) |

**All received:** Yes (2 enabled returned; 7 disabled assessed by Reviewer)
**Total findings:** 2 confirmed-and-fixed, 0 dismissed, 5 deferred (non-blocking, precedented dead casts)

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** player laser (`fireAt` → `beamHit`, sim.ts) → surface kill → `spawnGroundDebris(turrets[hit].pos, kind)` → `state.groundDebris` (integrated each frame by `advanceGroundDebris`) → `render.ts` draws chunk + shadow. End-to-end, on the REAL kill path — the shell tests drive it through `render()` and the ballistics through `stepGame()`. Safe: pure functions of `(state, input, dt)`, no external inputs.

**Pattern observed:** debris mirrors `dyingTies` but as a real ballistic entity (finding X-004) — the sim owns pos/vel/age (`src/core/sim.ts:597,616`), the shell is a pure function of it (`render.ts:380`). Correct core/shell split; colour lives only in the shell.

**Error handling:** N/A by design — pure deterministic math, no failure modes, no external inputs. Null/empty debris list → `advanceGroundDebris([]) → []`. No NaN path (pos from finite turret positions, vel from constants).

**Findings by source tag** (all LOW / non-blocking; correctness mutation-proven sound):
- `[RULE]` `advanceGroundDebris` param was `GroundDebris[]`, not `readonly` like its siblings `advance`/`homeShots` (sim.ts:1566/1587). **FIXED** this review (`118c078`) — pure-contract type gap, zero behaviour change.
- `[SIMPLE]` `GROUND_DEBRIS_PIECES = 3` was an unused export (0 references). **FIXED** — removed (the count is documented in `spawnGroundDebris` and pinned by the tests).
- `[TYPE]` 5 now-redundant single forward-compat casts in the test files (`debrisOf`/`withDebris`/`groundObject`×2/`stripDebris`) — necessary at RED (fields unborn), redundant now. Single casts (NOT the `as any`/`as unknown as` double-cast Rule #1 targets), and precedented — `surface-bunkers.test.ts:76` carries the same accepted dead `as Turret`. **Deferred** (non-blocking cleanup); dismissal-safe because they are single casts, not the forbidden double-cast.
- `[DOC]` the `groundObject` helper's `as Turret` comment ("keeps this file compiling against today's kindless Turret") is stale — `Turret.kind` predates this story (sw3-11). **Deferred** with the cast above.
- `[EDGE]` boundary paths traced clean: one kill/frame (CLGLZ single winner), floor clamp at exactly y=0, empty list, no NaN reachable. VERIFIED.
- `[SILENT]` no swallowed errors, empty catches, or falsy-coercion fallbacks — pure math. VERIFIED.
- `[TEST]` all 6 ACs' assertions mutation-proven to bite (gravity, floor-freeze ×2, launch band, life, colour-swap, no-draw). 0 vacuous. VERIFIED.
- `[SEC]` N/A — client-side game sim, no auth/input/secrets/tenancy.

**Verified good (challenged against subagent findings):**
- Core purity: grepped `src/core/{sim,state,models}.ts` — no `Math.random`/`Date`/`performance.now`/`requestAnimationFrame`/DOM/shell-import; `spawnGroundDebris` is RNG-free and deterministic (rule-checker Rule 14 concurs).
- Integration order matches the ROM (WSXPLD.MAC:550-560): position integrates on the current velocity, freezes at the floor, THEN gravity cuts velocity for next frame — mutation-proven by the gravity + freeze tests.
- Optional-field survival: `advanceGroundDebris` rebuilds each piece with `{ ...p, pos, vel, age }` (sim.ts:627), so `kind` is never dropped (the `Turret.kind` `.map`-drop gotcha) — rule-checker Rule 2 concurs.
- Spawn-after-advance keeps a newborn piece's launch velocity pristine on frame 0 (the additive-spawn + launch-band tests).
- `enterPhase` wipes `groundDebris: []` next to `dyingTies` (no cross-phase leak) — dedicated test + rule-checker confirm.

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` + the CLAUDE.md core rules. Rule-checker enumerated 49 instances across 16 rules; my independent spot-checks agree.

| Rule | Governed instances in diff | Verdict |
|------|----------------------------|---------|
| #1 type-safety escapes | 6 test casts + 1 mock double-cast | 5 redundant single-casts (LOW, deferred); mock `as unknown as` is the established canvas-stub idiom (compliant) |
| #2 readonly / generics | `advanceGroundDebris` param, `GroundDebris`, `GameState.groundDebris` | readonly gap **FIXED**; interface + field follow codebase convention (compliant) |
| #3 exhaustiveness | `Turret['kind']`→`GroundDebris['kind']` fold | compliant — `=== 'bunker' ? 'bunker' : 'tower'` matches the file's own non-bunker idiom (sim.ts:723/748/787) |
| #4 `??` vs `\|\|` | kind fold, floor clamp, `?? []`, `?.…?? 0` | compliant — no `\|\|`-on-nullable; `??`/`Math.max` used correctly |
| #5 module/imports | `import type`, extensionless relative imports | compliant — `moduleResolution: bundler` makes extensionless imports the required convention here |
| #6 React/JSX | 0 (.tsx) | N/A |
| #7 async | 0 (both fns sync — core purity) | N/A |
| #8 test quality | 19 tests, canvas mock | compliant — 0 `as any`, 0 vacuous, mock covers every called ctx method, 6 mutation-proofs bite |
| #9 build/config | 0 | N/A |
| #10 input validation | 0 | N/A (no input boundary) |
| #11 error handling | 0 try/catch | N/A |
| #12 perf/bundle | named imports only | compliant |
| #13 fix regressions | fresh feature | re-scanned #1-#12; no `as any`-to-silence, no `\|\|`-for-`??` |
| core purity (CLAUDE.md) | sim/state/models core additions | compliant — no forbidden calls, no shell import, colour stays in shell |
| determinism | spawn + advance | compliant — pure fns; determinism test passes |

**Handoff:** To SM (Thrawn) for finish-story.

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the ROM launches tower and bunker pieces at DIFFERENT base vertical velocities — bunker `0x0C00` = 4×`0x300` (WSXPLD.MAC:311), tower `0x800` = 4×`0x200` (:319), each ±the `P.RND1` low-byte spread. The story's single "728–1024 ×4" describes the bunker/centre case. The RED band `[2712, 4096]` u/frame is pinned on a BUNKER kill; the tower is pinned direction-only (`vel[1] > 0`). Affects `src/core/sim.ts` / `src/core/state.ts` (Dev may implement one shared band or the two per-type bases — either satisfies the tests; the per-type split is the more faithful choice). *Found by TEA during test design.*
- **Question** (non-blocking): finding **X-009** (explosion pieces live in a fixed 8-slot circular queue, `XP$EQ=8`, WSXPLD.MAC:59) is NOT remediated by this story — like `dyingTies`, `groundDebris` is an unbounded list aged out by life, not a slot-recycling queue. Accepted structural gap (the cap rarely bites), recorded so the audit trail is honest. Affects `src/core/state.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM move routine also applies X/Y **friction** (`ASRD5` decay, WSXPLD.MAC:533-547) and the shadow **fades** when the life timer ≤ 7 (:699-708). Neither is in the six ACs, so neither is pinned — the story is the vertical launch/gravity/freeze + shadow colour. Affects `src/core/sim.ts` / `src/shell/render.ts` if a later story wants full fidelity. *Found by TEA during test design.*
- **Note** (non-blocking): when GREEN, mark **X-005** `remediated_by: sw7-14` in `docs/audit/findings/pair-explosions.json` and keep `npm test -- citations` green. Editing `sim.ts`/`state.ts`/`render.ts` (all cited by other findings) will drift line citations — reanchor with `tools/audit/reanchor-citations.mjs --write` (line-number only, legit). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the near test fixture kills a turret at `z = -800`, where the ROM-faithful launch (`~3072 u/frame × TICK_HZ`) shoots the chunks nearly straight off the top of the frame in one frame — visually the SHADOW is the persistent on-ground element and the chunks blip up and out. This is correct for a nearby object; real surface turrets spawn far downrange (`SPAWN_DISTANCE`, deep −z) where the same arc reads proportionately. Flagged so the Reviewer's eyeball pass judges it at PLAY distance, not at the fixture's `-800`. Affects `src/shell/render.ts` (chunk scale/visibility is an eyeball tunable, not test-pinned). *Found by Dev during implementation.*
- **Note** (non-blocking): implemented TEA's two-base option (tower `0x800`, bunker `0xC00`) rather than one shared band — the more faithful reading. The `P.RND1` low-byte launch spread and the ROM's X/Y friction / shadow-fade (TEA findings above) remain unported by design (outside the six ACs). No new upstream issues surfaced. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): the test files carry 5 now-redundant single forward-compat casts (`as Turret` / `as GameState` in `debrisOf`/`withDebris`/`groundObject`×2/`stripDebris`) that were required at RED (fields unborn) and are dead now; one (`groundObject`) has a stale comment ("today's kindless Turret"). Precedented — `surface-bunkers.test.ts:76` carries the same accepted dead cast — and they are single casts, not the `as any`/double-cast the rule forbids, so left as a follow-up cleanup. Affects `tests/core/ground-debris.test.ts`, `tests/shell/render.ground-debris.test.ts`. *Found by Reviewer during code review.*
- **Note** (non-blocking): two rule-checker findings were FIXED in-review (`118c078`) rather than bounced — `advanceGroundDebris` param typed `readonly` (matches `advance`/`homeShots`), and the unused `GROUND_DEBRIS_PIECES` export removed. Editing `state.ts` re-drifted 6 audit citations; reanchored (0 lost). No upstream issues for downstream stories. *Found by Reviewer during code review.*

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Tower launch velocity pinned direction-only, not to a tight band**
  - Spec source: story title AC-3, finding X-005 (WSXPLD.MAC:355-357/:311/:319)
  - Spec text: "upward launch (728-1024 x4)"
  - Implementation: the tight magnitude band `[2712, 4096]` u/frame is asserted on a BUNKER kill (whose ROM base 0x0C00 = 4×0x300 sits in it); the tower (base 0x800 = 4×0x200 = 2048, a lower band) is pinned only as `vel[1] > 0` (upward).
  - Rationale: towers and bunkers launch at different bases; a single tight band would either false-fail a faithful tower or over-widen and stop biting the missing-×4 / missing-timebase bugs. Direction is pinned for both; the bunker band is the story's documented figure. See the Delivery Finding.
  - Severity: minor
  - Forward impact: Dev may implement one shared band or two per-type bases — both pass.

- **AC-6 pins the shadow COLOUR family + presence, not the exact scale factor or shadow-vs-body isolation**
  - Spec source: story title AC-6, finding X-005 (WSXPLD.MAC VWTWN/VWBKN, `#72` scale :739)
  - Spec text: "scaled ground shadow (red bunker / white tower)"
  - Implementation: red-family (bunker) / white-family (tower) ink surplus proven by DIFFERENCE (post-kill frame with debris vs the same frame with debris stripped). The exact `#72` scale, the ground-level position, and isolating the flat shadow from the flying piece bodies are NOT asserted.
  - Rationale: repo convention (sw3-9/sw3-11) pins colour family + topology, not pixels; "scaled shadow geometry" is an eyeball/Reviewer concern. The finding's testable claim is red-reads-bunker / white-reads-tower, which the family surplus captures.
  - Severity: minor
  - Forward impact: the shadow's exact scale/position is a render detail for the Reviewer's eyeball pass, not a unit test.

### Dev (implementation)

- **Debris launched at a fixed per-type base velocity, not the ROM's `P.RND1` random spread**
  - Spec source: finding X-005 (WSXPLD.MAC:355-357), TEA `ground-debris.test.ts` launch band
  - Spec text: "upward launch (728-1024 x4)" — the ROM adds a `P.RND1` low byte before the `×4`
  - Implementation: each piece launches at the fixed kind base (tower `0x800×TICK_HZ`, bunker `0xC00×TICK_HZ`); no per-piece randomisation.
  - Rationale: the six ACs pin direction + the bunker band + determinism, none of which needs the spread; a fixed base keeps the burst deterministic from the seed (the purity/determinism test) with minimal code. The spread is a logged non-blocking fidelity nicety (TEA + Dev findings).
  - Severity: minor
  - Forward impact: a later full-fidelity story can add a seeded spread; the band test already tolerates it.

- **Lateral fan (left/centre/right) is a fixed spread, not the ROM's "speed to destination" vector**
  - Spec source: finding X-005 (WSXPLD.MAC:346-354 XP$MX/XP$MY, `ADDA #-3F/#3F`)
  - Spec text: the ROM aims each piece's lateral velocity at the blast destination ± a left/right offset
  - Implementation: a fixed `±GROUND_DEBRIS_SPREAD` on the X axis (left/centre/right); no destination term, no Z (fore/aft) component.
  - Rationale: the three pieces must visibly separate (the "3 pieces" AC reads as one blob otherwise), and the ROM's destination math is untested and out of the six ACs. Fixed fan is the minimal honest split.
  - Severity: minor
  - Forward impact: none for the pinned ACs; a fidelity follow-up could add the destination-aimed lateral.

### Reviewer (audit)

All four deviations reviewed against the six ACs, the X-005 finding, and the primary source. Every one stays inside the story's pinned scope and is ROM-justified; none introduces a correctness risk (the ballistics are mutation-proven).

- **TEA #1 — tower launch pinned direction-only, bunker band tight:** ACCEPTED. The two ROM bases genuinely differ (`0x800` vs `0xC00`); Dev implemented both per-type, so both are direction-correct and the bunker sits in the pinned band. A single tight band would have false-failed the tower.
- **TEA #2 — AC-6 pins colour family + presence, not the `#72` scale / shadow-vs-body isolation:** ACCEPTED. Matches the repo's sw3-9/sw3-11 colour-family convention; exact scale is an eyeball concern. Family surplus is mutation-proven (colour-swap + no-draw both bite).
- **Dev #1 — fixed per-type launch, no `P.RND1` spread:** ACCEPTED. The six ACs need direction + the bunker band + determinism; a fixed base satisfies all three with less code and keeps the burst seed-deterministic (the purity/determinism test). Spread is a logged fidelity nicety.
- **Dev #2 — fixed left/centre/right lateral fan, not the destination-aimed vector:** ACCEPTED. The three pieces must visibly separate; the ROM's destination math is untested and outside the ACs. Fixed fan is the minimal honest split.