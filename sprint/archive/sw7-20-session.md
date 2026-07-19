---
story_id: "sw7-20"
jira_key: "sw7-20"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-20: R6c Trench wall GUNS fire back — .WP WGA panel model + BSGUN/DOBASE fire behavior (B-017 + M-011)

## Story Details
- **ID:** sw7-20
- **Jira Key:** sw7-20
- **Workflow:** tdd
- **Stack Parent:** sw7-6 (feat/sw7-6-r6a-trench-structure-pacing)
- **Epic:** sw7

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T05:25:52Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T04:17:40Z | 2026-07-19T04:19:47Z | 2m 7s |
| red | 2026-07-19T04:19:47Z | 2026-07-19T04:47:43Z | 27m 56s |
| green | 2026-07-19T04:47:43Z | 2026-07-19T05:11:51Z | 24m 8s |
| review | 2026-07-19T05:11:51Z | 2026-07-19T05:25:52Z | 14m 1s |
| finish | 2026-07-19T05:25:52Z | - | - |

## Sm Assessment

Setup complete for sw7-20 — R6c Trench wall GUNS fire back, the GUNS half of the
old 14-pt R6 flagship (split 2026-07-16; structure → R6a, catwalk → R6b, wall guns → R6c). 3 pts, star-wars, `tdd` workflow → routes to TEA for the RED phase.

**Pre-dispatch gate checks (all clear):**
- Merge gate: no open PRs in star-wars.
- Dependency: sw7-6 (R6a trench structure & pacing) is **done** and merged. The wall-panel grid (B-010) this story writes gun content into exists on `develop`.

**Acceptance surface (ROM findings — the story has no separate AC list):**
- B-017 (NO_COUNTERPART): ROM trench wall GUNS fire back at the player (BSGUN/DOBASE); ours never return fire in the trench.
- M-011: the .WP WGA wall-gun model port.
- Guns are wall-panel content in the B-010 grid (depends_on sw7-6).
- Gun fire benefits from sw7-16's ship-point unification (fire targets the flying ship, not a detached origin) and sw7-17's laser model for the player's counter-fire.

**Guidance for TEA:** src/core (deterministic sim) vs src/shell (render/input) boundary is
the single most important rule. Watch the ROM-fidelity citations gate — editing a src file
cited by docs/audit/findings/*.json shifts line numbers; reanchor with
`tools/audit/reanchor-citations.mjs --write`. Primary geometry source is the historicalsource
AVG picture ROM (WSVROM.MAC) plus the rom-fidelity-audit skill.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A 3-pt fidelity story with a real model port (M-011) and a whole new
return-fire subsystem (B-017) — not a chore. Two RED suites written, mirroring the
sw7-19 R6b sibling pair.

**Test Files:**
- `tests/core/trench-wall-gun-rom.test.ts` — M-011. Hand-transcribes `.WP WGA` /
  `.WGD WGA` from WSOBJ.MAC as an INDEPENDENT oracle (decimal `.P` macro × `.S=8`;
  the `.P 0,0,0` origin dropped, 14 verts / 25 edges, reindexed −1 to match the
  bake), verifies the bake against it, then drives `TRENCH_TURRET` + `ROM_TO_PORT`
  + `romCompare` to the authentic wall gun.
- `tests/core/trench-wall-gun-fire.test.ts` — B-017. An isolated `trench(...)`
  harness (no exhaust port) places `kind:'turret'` wall guns and flies a hands-off
  pilot; asserts guns fire, harder waves fire more (WV.HRD/TGPROB), a shot costs a
  shield (a HIT, not the R6b graze), and fire tracks the ship point (sw7-16).

**Tests Written:** 15 tests across 2 files, covering 2 findings (M-011 model port,
B-017 return-fire behaviour). RED verified by `testing-runner` (RUN_ID
`sw7-20-tea-red`).

**Status:** RED — 9 of 15 assertions fail as designed; 6 are green guards.
- rom suite: 5 oracle guards GREEN (the bake is already faithful — they lock it),
  5 port/wiring assertions RED.
- fire suite: 4 behaviour assertions RED, 1 purity/determinism guard GREEN.
- No compile/import/type errors — a clean RED (not a collection failure).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Core purity / determinism (star-wars #1 rule: pure fn of seed, no rng mutation) | `is a pure function of the seed …` (fire suite) | GREEN guard |
| No fabricated / out-of-range edge indices (fidelity-port bug class) | `every port edge indexes a real vertex` (rom suite) | RED |
| Radix discipline — `.P` is DECIMAL, not the `.PH` hex trap | `refutes the HEX misreading …` (rom suite) | GREEN guard |
| Independent-oracle discipline (bake ≠ its own witness, sw5-4) | the 4 "ROM oracle" tests verify the bake vs a hand transcription | GREEN guard |
| Fire targets the ship point, not a detached origin (sw7-16 regression class) | `fire tracks the SHIP point …` (fire suite) | RED |
| Shield accounting — a real hit costs one shield (vs the R6b graze which costs none) | `a wall-gun shot … costs a shield — a HIT, not a graze` | RED |

**Rules checked:** the applicable star-wars project rule (core purity) has coverage;
the TypeScript lang-review checklist is largely Dev-side code hygiene (no `as any`,
`??` vs `||`, ESM `.js` extension) not amenable to unit tests — flagged for Dev
self-review at handoff.
**Self-check:** 0 vacuous tests. Every `it` carries ≥1 meaningful assertion; no
`let _ =`, no `assert(true)`, no always-`None`/always-`undefined` assertions. The
green guards are intentional (they lock the faithful bake and the purity rule), not
accidental passes.

**Handoff:** To Dev (Yoda) for GREEN — implement the WGA model port + the trench
return-fire subsystem to turn the 9 RED assertions green without breaking the 6
guards or the citations gate.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/models.ts` — `TRENCH_TURRET` re-ported to the authentic `.WP WGA` /
  `.WGD WGA` (14 vertices, 25 edges, decimal `.P` × `.S=8`, origin dropped); comment
  cites WSOBJ.MAC and the decimal-radix trap. (M-011)
- `src/tools/romCompare.ts` — `ROM_TO_PORT.WGA → 'Trench Turret'`. (M-011)
- `src/core/state.ts` — new `TRENCH_GUN_FIRE_MASK` / `TRENCH_GUN_FIRE_THRESHOLD`
  (the WSBASE.MAC:1224 base-gun TGPROB, distinct from the space table) +
  `TRENCH_GUN_FIRE_RANGE` (`0x6000`, BSGUN's furthest-firing bound). (B-017)
- `src/core/sim.ts` — `stepTrench` return fire: a per-difficulty timer-mask opening
  (keyed off `Math.floor(trenchTimer)`), each in-range wall gun rolls the TGPROB
  probability and fires a shot at `trenchView` (sw7-16); incoming shots that reach
  the cockpit cost a shield via the shared `loseShield` S-016 funnel + `player-death`
  (`cause: 'turret'`); folded into `afterObstacles` so every port path inherits it,
  with a game-over path on a fatal hit. (B-017)
- `tests/tools/romCompare.test.ts` — re-baselined the mapped/compared pair count
  9→10 (`+WGA`), the legitimate sibling ripple of the new mapping.
- `docs/audit/findings/*.json` — M-011 + B-017 marked `remediated_by: "sw7-20"`;
  35 citations reanchored (line-number only, 0 lost); anti-laundering verified.

**Shell:** no `src/shell` change needed — the render already draws `enemyShots`
(fireballs + muzzle flash) in every phase (render.ts:482 "seated in the scene when
the eye is lifted (surface/trench)"), and the turret model swap is auto-picked-up
by the existing `TRENCH_ORIENT` mapping (render.ts:404).

**Tests:** 1697/1697 passing (full suite GREEN). Target suites: 15/15
(`trench-wall-gun-rom` 10/10, `trench-wall-gun-fire` 5/5). `tsc --noEmit` clean;
`vite build` clean. Citations gate 12/12.

**Branch:** feat/sw7-20-r6c-trench-wall-guns-fire-back (pushed)

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the authentic gun PLACEMENT lives in the sw7-6 `PANEL_GUN = 3`
  wedge grid (`trench-wedges.ts`), but that grid is not consumed by gameplay at all — the
  live trench content is still the legacy `TrenchObstacle{turret|square|catwalk}` list
  (`trench-obstacles.ts`), wired in at `sim.ts:1489`. B-017's faithful "BSGUN scans the wall
  panels flagged as guns" therefore lands on the live `kind:'turret'` entities (see the TEA
  deviation below), NOT on the wedge grid. Wiring the wedge grid → live spawning (so gun
  positions/frequency come from the authored pies) is a **separate, larger** story. Affects
  `src/core/trench-wedges.ts` + `src/core/sim.ts` (grid→spawn plumbing) — file as follow-up.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the trench base-gun throttle is its OWN `TGPROB`
  (`WSBASE.MAC:1224`: `0F/80,0F/60,0F/40,0F/20,07/60,07/20,03/60,03/20`, diff 0–7),
  DISTINCT from the space TIE-fire TGPROB (`WSCPU.MAC`, already ported as
  `FIRE_MASK`/`FIRE_THRESHOLD` in `state.ts:359-368`). Dev should port the WSBASE values as a
  trench-specific table, not reuse the space one. Fire chance = `(256−prob)/256`; mask gates
  cadence via `FRAME+1 AND mask == 0`. Note `state.frame` is NOT advanced in `stepTrench`
  today — Dev must choose the cadence counter (advance `frame`, or key off `trenchTimer`).
  Affects `src/core/gameRules.ts` / `src/core/state.ts` (new trench TGPROB) + `src/core/sim.ts`
  (`stepTrench`). *Found by TEA during test design.*
- **Improvement** (non-blocking): M-011 edits `TRENCH_TURRET` (`src/core/models.ts:696`),
  which the citations gate cites verbatim for M-011. The bake already carries the faithful WGA
  (`romModels.generated.ts:131`); the port must match it. After the edit Dev must keep the
  citations gate green — reanchor with `node tools/audit/reanchor-citations.mjs --write` if the
  anchor line only MOVED, or set `remediated_by: "sw7-20"` on M-011 (and mark B-017 remediated)
  if the anchor text changes. *Found by TEA during test design.*
- **Question** (non-blocking): the ROM gates return fire on `PT.LIV == 0` ("no proton
  launched yet ⇒ allow shots") — guns stop firing once the player's proton torpedo is away. We
  do not model a launched-proton lifetime in the trench, so this gate is out of scope here;
  noted so it is not mistaken for a missing behaviour. Affects nothing today. *Found by TEA
  during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the WGA wall-gun RENDER appearance was not eyeballed in a live
  dev server (cross-checkout port-ownership fragility, sw5-5). The geometry is byte-verified vs the
  ROM + bake, and it reuses the SAME `.S=8` scale and shared `TRENCH_ORIENT` as the working WPN
  wall panel / WFF force field (its base sits in the same x-z plane; the gun body rises along the
  wall normal into the channel), so orientation is correct by construction — but a visual confirm
  of the on-screen wall gun (and any per-wall WGA/WGB nuance) is a Reviewer-eyeball item. Affects
  `src/shell/render.ts` (no change needed; visual confirm only). *Found by Dev during implementation.*
- **Improvement** (non-blocking): re-affirms TEA's Gap — the authentic gun PLACEMENT (`PANEL_GUN`
  wedge grid, `trench-wedges.ts`) is still not consumed by live spawning; B-017 fire lands on the
  live `kind:'turret'` entities. Wiring the grid → live trench content (gun positions/frequency
  from the authored pies) is a separate follow-up. Affects `src/core/trench-wedges.ts` +
  `src/core/sim.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): adding WGA to `ROM_TO_PORT` bumped the romCompare "mapped/compared
  pairs" count 9→10 — re-baselined in `tests/tools/romCompare.test.ts` with a cited `+WGA (sw7-20)`
  comment, exactly as sw7-19 did for `+WFF`. Editing `TRENCH_TURRET`/`sim.ts`/`state.ts` shifted 35
  audit citations (reanchored, line-number only, 0 lost) and M-011/B-017 are marked
  `remediated_by: "sw7-20"`; anti-laundering verified (no verbatim re-spells). *Found by Dev during
  implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): confirms the Dev/TEA follow-ups — the `PANEL_GUN` wedge grid is
  still unwired to live spawning, and the WGA wall-gun visual is unconfirmed in a live dev server
  (correct by construction; a screenshot would close it). Both are legitimately out of a 3-pt
  story's scope. Affects `src/core/trench-wedges.ts` / `src/shell/render.ts` (follow-up).
  *Found by Reviewer during code review.*
- **Question** (non-blocking): a wall gun killing the pilot on the exact frame an armed proton
  torpedo detonates the port would let `clearRun` advance the wave despite the death (the two death
  sites don't arbitrate). The ROM's `PT.LIV` gate (guns cease once the proton is away, TEA's noted
  scope gap) makes this unreachable on the cabinet; here it is astronomically rare and cosmetic.
  Affects `src/core/sim.ts` (`stepTrench` — only if PT.LIV gating is later modelled).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Guns modelled as the live `kind:'turret'` obstacle, not the `PANEL_GUN` wedge grid**
  - Spec source: context-story-sw7-20.md ("Guns are wall-panel content in the B-010 grid")
  - Spec text: "ROM trench wall GUNS fire back … BSGUN scans wall panels flagged as guns"
  - Implementation: the fire-behaviour tests place `kind:'turret'` obstacles (the WGA wall guns
    M-011 re-skins) and assert they fire; they do NOT exercise the sw7-6 `PANEL_GUN` wedge grid,
    which is not wired into live spawning (see Delivery Finding).
  - Rationale: the wedge grid carries no gameplay today; scoping B-017 onto the live turret
    entity is the tractable, faithful slice and matches the R6b sibling's pattern (the force
    field is a `kind:'catwalk'` obstacle, not a `PANEL_FORCEFIELD` grid slot). Grid→spawn
    wiring is filed as a separate follow-up.
  - Severity: minor
  - Forward impact: when the wedge grid is later wired to spawning, gun fire should read gun
    positions from it; the observable fire contract pinned here still holds.

- **WGA ported origin-dropped (14 vertices), matching the bake, not the 15-row ROM table**
  - Spec source: pair-models.json M-011 ("14 pts: a 4-corner wall base … 6-pt gun body … 4-pt nozzle")
  - Spec text: "transcribe the 14 `.P` rows and decode `.WGD WGA`'s DRAWTO/BDRAWTO runs"
  - Implementation: the oracle drops `.P 0,0,0` (ROM index 0, never referenced by the draw
    routine) and reindexes the 14 real points 0–13, matching `ROM_MODELS.WGA` and the WFF
    precedent (`TRENCH_CATWALK` = WFF table 1:1).
  - Rationale: the finding itself counts 14 points; the origin is a positioning point, not
    geometry, and the bake already omits it. Keeping it would desync the port from the bake and
    the `.WGD` indices.
  - Severity: minor
  - Forward impact: none — the draw-list indices are transcribed with the same −1 shift.

- **Behaviour pinned observationally (fires / harder-fires-more / hit-costs-shield / tracks-ship),
  not by the exact TGPROB literals or in-range window**
  - Spec source: pair-trench.json B-017 (TGPROB per-difficulty probability + timer-mask table)
  - Spec text: "throttled by TGPROB — a per-difficulty (WV.HRD) probability + timer-mask table"
  - Implementation: the suite asserts the OBSERVABLE (guns fire, a hard wave fires strictly more
    than an easy one over fixed seeds, a shot costs a shield, fire tracks `trenchView`) rather
    than pinning the `0F/80…03/20` literals or Dev's chosen depth/range window and cadence source.
  - Rationale: mirrors the R6b hazard test (which pinned side/height observably and left the
    `$200/$400` literals to Dev) and keeps a probabilistic subsystem from over-coupling to one
    RNG-draw order. Fixed seeds keep the difficulty aggregate deterministic, not statistical.
  - Severity: minor
  - Forward impact: none — the ROM literals are documented in the test header for Dev to port.

### Dev (implementation)

- **B-017 fire lands on the live `kind:'turret'` obstacles (TEA's representation contract)**
  - Spec source: context-story-sw7-20.md / pair-trench.json B-017
  - Spec text: "BSGUN scans wall panels flagged as guns and fires them"
  - Implementation: `stepTrench` fires from the surviving `kind:'turret'` obstacles (the WGA wall
    guns), NOT the sw7-6 `PANEL_GUN` wedge grid (which is not wired to live spawning). Matches
    TEA's deviation and the R6b force-field precedent (`kind:'catwalk'`).
  - Rationale: the wedge grid carries no gameplay; the live turret entity is the tractable,
    faithful carrier. Grid→spawn wiring is a separate follow-up (Delivery Finding).
  - Severity: minor
  - Forward impact: when the grid is wired, gun positions should come from it; the fire contract holds.

- **Trench-gun cadence keyed off `Math.floor(trenchTimer)`, not `state.frame`**
  - Spec source: pair-trench.json B-017 (DOBASE `LDA FRAME+1 / ANDA mask`)
  - Spec text: "throttled by TGPROB … timer-mask"
  - Implementation: `stepTrench` never advances `state.frame`, so the ROM's per-game-frame FRAME
    counter is `Math.floor(trenchTimer)` (accumulated game frames); an opening is
    `((gameFrame + 1) & mask) === 0` on the frame that counter ticks.
  - Rationale: reuses the existing `trenchTimer` (game-frame accumulator) rather than threading a
    new counter or repurposing the space-only `state.frame`.
  - Severity: minor
  - Forward impact: none — same cadence rate as the ROM's `FRAME+1 & mask`.

- **`TRENCH_GUN_FIRE_RANGE = 0x6000`, the ROM BSGUN scan bound, as the fire range**
  - Spec source: WSBASE.MAC:1330 (`SUBD #6000 ;FURTHEST AWAY FIRING BUNKER`)
  - Spec text: BSGUN's furthest-firing terminator
  - Implementation: a gun fires while within `0x6000` downrange. Because `ENEMY_SHOT_SPEED` (300)
    × `ENEMY_SHOT_TTL` (≈3.12 s) ≈ 936 units, a far-fired shot expires before reaching the pilot
    — only near-abreast fire connects. Faithful: distant guns fire (a visual threat), close guns hit.
  - Rationale: ROM-anchored bound rather than an invented window.
  - Severity: minor
  - Forward impact: none.

- **A trench gun kill ends the game (new trench game-over path)**
  - Spec source: derived — a fatal hit must end the run
  - Spec text: (no explicit AC; the ROM's shield accounting is a later story, S-016 window used here)
  - Implementation: `afterObstacles` sets `gameOver`/`mode: 'gameover'` + `pushFarewell` when a gun
    hit drops `lives` to 0, mirroring the port-crash death path already in `stepTrench`.
  - Rationale: without it a gun could kill the pilot with no game-over; reuses the same `loseShield`
    S-016 funnel and farewell as every other death site.
  - Severity: minor
  - Forward impact: none — full suite green (1697), no sibling relied on the trench being deathless.

- **New RNG draw site in the trench (`nextInt` per in-range gun on an opening)**
  - Spec source: pair-trench.json B-017 (BSGUN `LDA P.RND1 / CMPA BS.PRB`)
  - Spec text: the per-gun probability roll
  - Implementation: the fire roll draws from the threaded run RNG cursor in `stepTrench`; this
    advances `state.rng` during trench play where nothing drew before.
  - Rationale: the ROM's own per-gun roll (P.RND1); the draw is the arcade's cost, not leakage.
  - Severity: minor
  - Forward impact: none observed — full suite (incl. trench determinism fixtures) green; a future
    fixture pinning the post-trench RNG cursor would legitimately see this draw.

### Reviewer (audit)

All eight logged deviations are sound and consistent with the R6b sibling precedent, the ROM, and
the verified code:

- **TEA — Guns modelled as the live `kind:'turret'` obstacle** → ✓ ACCEPTED: mirrors R6b's
  `kind:'catwalk'` force field; the wedge grid genuinely carries no gameplay, so this is the only
  tractable carrier. Follow-up filed.
- **TEA — WGA ported origin-dropped (14 vertices)** → ✓ ACCEPTED: I independently re-derived
  `.WGD WGA` from WSOBJ.MAC and the −1 reindex reproduces the shipped edges (`[3,2]`…`[10,12]`); it
  byte-matches `ROM_MODELS.WGA`.
- **TEA — Behaviour pinned observationally, not by TGPROB literals** → ✓ ACCEPTED: mirrors the R6b
  hazard suite; I empirically confirmed the observables aren't flukes (fire margin 48 vs 27 over 8
  seeds; centred + offset pilots both take 7 shields).
- **Dev — B-017 fire on the live turret** → ✓ ACCEPTED: same rationale as the TEA entry.
- **Dev — cadence keyed off `Math.floor(trenchTimer)`** → ✓ ACCEPTED: `state.frame` is space-only;
  low-bit `(gameFrame+1) & mask` is byte-equivalent to the ROM's `FRAME+1 & mask` regardless of the
  256-wrap, since mask ≤ 0x0f.
- **Dev — `TRENCH_GUN_FIRE_RANGE = 0x6000`** → ✓ ACCEPTED: ROM-anchored (BSGUN's furthest-firing
  bound); the honest note that slow shots only connect near-abreast is faithful, not a shortcut.
- **Dev — game-over path on a fatal gun hit** → ✓ ACCEPTED: reuses the same `loseShield`/`pushFarewell`
  funnel as the port-crash death in the same function; full suite green proves no sibling relied on a
  deathless trench. (The rare simultaneous death+detonate edge is logged as a non-blocking Question.)
- **Dev — new RNG draw site in the trench** → ✓ ACCEPTED: the ROM's own per-gun roll; no determinism
  ripple observed (1697/1697), and the purity test proves `state.rng` is untouched.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2 grep false-positives noted, both non-issues) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered manually (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered manually (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered manually (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered manually (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered manually (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — covered manually (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered manually (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 1 (TS-1, informational LOW) | dismissed 1 (rationale below) |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and covered by manual analysis)
**Total findings:** 0 confirmed blocking, 1 dismissed (with rationale), 2 non-blocking observations (LOW)

## Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` + the CLAUDE.md core rules, corroborated by
the rule-checker (25 rules / 61 instances / 0 violations):

- **Core purity (CLAUDE.md #1 rule)** — the new `stepTrench` block mutates no input: `standingShots`
  (`.filter`), `firedShots`, `survivors` are fresh arrays; `[...o.pos]` re-spreads rather than aliases;
  `loseShield` returns a fresh object; `nextInt(rng,…)` writes only the per-step clone `rng`
  (`state.rng` untouched). No DOM/`Date`/`performance`/`Math.random`/`rAF` (grep-clean). VERIFIED, and
  proven by the passing purity test.
- **`??` vs `||` / equality (rule 4)** — 0 `||`/`??` introduced; every new conditional uses a strict
  numeric/`===` comparison (`<= 0`, `> threshold`, `!== 'turret'`, `& mask === 0`). Compliant.
- **`readonly` on shared arrays (rule 2)** — `TRENCH_GUN_FIRE_MASK`/`THRESHOLD` are `readonly number[]`,
  matching the sibling `FIRE_MASK`/`FIRE_THRESHOLD`. Compliant.
- **Type-only imports (rule 5)** — the new test files use inline `type` specifiers correctly; runtime
  values are plain imports. Compliant.
- **No new `GameEvent` variant** — reuses `'enemy-fire'` + `'player-death'` (`cause: 'turret'`, an
  existing union member) → no `tsc` exhaustiveness break (the sw3-3 trap avoided). Compliant.
- **Test quality (rule 8)** — no `as any`, `.only`/`.skip`, `toBeTruthy`, vacuous assertions, or dist/
  imports in either new suite. Compliant.
- **ROM-fidelity citations** — reanchor is line-number-only (byte-exact, 0 lost); M-011/B-017
  `remediated_by`; anti-laundering verified. Compliant.

### Devil's Advocate

Assume this is broken. **Attack 1 — a NaN shot.** `normalize(sub(trenchView, o.pos))` divides by the
vector length; if a gun sits exactly on the pilot the length is 0. But `normalize` (math3d.ts:179)
guards it: `len === 0 ? [0,0,0]`, so the shot spawns with zero velocity and hits the coincident pilot
next frame — no NaN propagates into `collides`. Defused. **Attack 2 — the difficulty ramp is a
single-seed fluke.** I refused to trust "the test passes" and ran an 8-seed probe: 48 hard-fires vs 27
easy — a 1.78× margin, structural (13 vs 3 mask openings + 87% vs 50% probability), not luck. **Attack
3 — guns fire but nothing ever hits** (the tests could be green while the feature is inert). Probed:
centred and off-centre pilots each lose 7 shields over 8 seeds at wave 8, with matching `player-death`
counts — real end-to-end hits, and the seat height (768) + off-centre position genuinely discriminate a
floor-/centre-aimed regression. **Attack 4 — the pool cap starves fire and flattens difficulty.**
`MAX_FIREBALL_SLOTS` (6) caps concurrency, but the observed margin survives it. **Attack 5 — a stressed
frame.** A huge `dt` advances `trenchTimer` past several game-frames but `((gameFrame+1)&mask)` only
tests the final frame, so it under-fires (deterministic, bounded) — never over-fires or crashes; `dt=0`
yields no opening. **Attack 6 — silent state corruption of siblings.** The new RNG draw and the
game-over transition could ripple; the full 1697-test suite (including trench determinism and the
port/exhaust fixtures) is green, and I confirmed no `src/shell` change. **Attack 7 — the audit was
laundered.** I diffed all 10 findings files: only `"line":` numbers + 2 `remediated_by` stamps changed,
no `verbatim` re-spells — an honest reanchor. The one residue a malicious/confused path could still
reach is the death-during-detonation frame (logged, ROM-unreachable via PT.LIV). Nothing here rises to
High.

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (≥5):**
- `[VERIFIED]` Core purity holds — `stepTrench` fire block mutates no input; `rng` is the per-step
  clone; no DOM/`Date`/`Math.random`. Evidence: `sim.ts` fire block uses `.filter`/fresh arrays +
  `[...o.pos]`; corroborated by `[RULE]` ADD-1 and the passing purity test (`trench-wall-gun-fire.test.ts`).
- `[VERIFIED]` WGA model is byte-faithful — I re-derived `.WGD WGA` from WSOBJ.MAC independently; the
  −1 reindex yields the shipped edges (`[3,2]`…`[10,12]`), and vertices/edges equal `ROM_MODELS.WGA`.
  Evidence: `models.ts:409-431`.
- `[VERIFIED]` TGPROB table is byte-exact to WSBASE.MAC:1224 (`0F/80…03/20`), distinct from the space
  table, `readonly`. Evidence: `state.ts` constants + comment.
- `[VERIFIED]` Citations honestly reanchored (line-number only, 0 lost; `remediated_by` on M-011/B-017;
  anti-laundering diff clean). Evidence: `citations.test.ts` 12/12; `git diff docs/audit/findings/`.
- `[TEST]` (manual — subagent disabled) The 8 new behaviour/model assertions are meaningful and
  discriminating (both-halves controls, floor/centre-aim discriminator, independent ROM oracle); I
  empirically confirmed non-vacuity via an 8-seed margin probe (fire 48>27; 7 shields hit). No vacuous
  assertions. Corroborated by `[RULE]` TS-8.
- `[EDGE]` (manual — subagent disabled) Boundary paths traced: `normalize` zero-guard (no NaN), pool
  cap, `dt=0`/huge-`dt` cadence, in-range window `[-0x6000,0]`. Only residue: the rare
  death-on-detonation frame — LOW, ROM-unreachable, logged.
- `[SILENT]` (manual — subagent disabled) No swallowed errors/empty catches/silent fallbacks — the diff
  introduces no `try`/`catch`/`.catch`/`??`/`||`. Multiple `player-death` events per frame with one
  `loseShield` charge is the existing space/surface pattern, not a swallowed failure.
- `[TYPE]` (manual — subagent disabled) `readonly number[]` tables; `cause: 'turret'` reuses the
  existing `player-death` union member (no widening); `Projectile[]` fired-shots typed. No stringly-typed
  or unsafe-cast additions. Corroborated by `[RULE]` TS-1/TS-2.
- `[SEC]` (manual — subagent disabled) N/A — pure deterministic core, no I/O, no user-input boundary, no
  secrets; client-only game.
- `[SIMPLE]` (manual — subagent disabled) The fire block is a single coherent addition; no dead code, no
  over-engineering; reuses `loseShield`/`enemyShots`/`shipPoint` rather than inventing parallel
  machinery. Corroborated by preflight (no dead code).
- `[DOC]` (manual — subagent disabled) Comments are accurate and cite the ROM (WSBASE.MAC/WSOBJ.MAC
  lines, the decimal-`.P` trap, the origin drop); no `window.` purity-guard trap in core comments
  (grep-clean).
- `[RULE]` Rule-checker: 25 rules / 61 instances / **0 violations**; 1 informational LOW dismissed:
  `ROM_MODELS.find(...)!` (`trench-wall-gun-rom.test.ts:127`) is a non-null assertion on `Array.find`,
  but it is the established idiom across 7+ existing `*-rom.test.ts` files — pre-existing convention,
  not a regression; fixing only this one would be inconsistent. **Dismissed** (matches project test
  convention; no behavioural risk — a missing WGA bake would throw a clear collection error).
- `[LOW]` Simultaneous gun-death + port-detonate lets a dead pilot win the wave — astronomically rare,
  ROM-unreachable (PT.LIV gate), documented as a non-blocking Question. Not a blocker.

**Data flow traced:** wall gun (`kind:'turret'`, in range on a TGPROB opening) → `nextInt(rng,256) >
threshold` → `enemyShots` shot aimed at `trenchView` (sw7-16) → advances straight → `collides` with the
cockpit → `loseShield` (S-016 cap) → `player-death`/shield loss/`gameover`. Safe: deterministic from the
seed, capped at `MAX_FIREBALL_SLOTS`, one shield per S-016 window.

**Wiring:** the return fire renders with no shell change — `render.ts:482` draws `enemyShots` fireballs +
muzzle flash in every phase, and the model swap rides the existing `TRENCH_ORIENT` mapping (`render.ts:404`).

**Pattern observed:** faithful reuse of the sibling R6b split (model-port rom test + observable-behaviour
test) and the existing enemy-fire funnel — `sim.ts` fire block mirrors the surface turret fire at
`sim.ts:804-816`.

**Error handling:** no new failure surface (pure core, no I/O); `normalize` zero-guard prevents the only
NaN path; `loseShield` no-ops on `rawDamage <= 0`.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.