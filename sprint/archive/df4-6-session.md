---
story_id: "df4-6"
jira_key: "df4-6"
epic: "df4"
workflow: "tdd"
---
# Story df4-6: VISUAL playtest — enemies alive, colliding, dying safely

## Story Details
- **ID:** df4-6
- **Jira Key:** df4-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T23:25:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T21:54:58+00:00 | 2026-08-17T21:56:31Z | 1m 33s |
| red | 2026-08-17T21:56:31Z | 2026-08-17T22:11:15Z | 14m 44s |
| green | 2026-08-17T22:11:15Z | 2026-08-17T22:37:29Z | 26m 14s |
| review | 2026-08-17T22:37:29Z | 2026-08-17T23:25:37Z | 48m 8s |
| finish | 2026-08-17T23:25:37Z | - | - |

## Sm Assessment

Setup complete for df4-6 (2pt, tdd/phased). This is a **VISUAL playtest** story: prove
at `/defender/` that df4-2 enemies materialize, a laser kills one via the
ACCESSIBILITY-SAFE explosion (ADR-0005 — no full-screen strobe), and a df4-3 lander
abducts a humanoid — screenshot evidence compared against a nonsense control path that
must DIFFER (the canonical-serve lesson; mechanical DIFFER already covered by
`tests/canonical-serve.test.mjs`). Carry forward as a note the df5 accessibility ruling
that smart-bomb (SBOMB) / hyperspace (HYPER) must also freeze/fade, before df5 wires
them.

Branch `feat/df4-6-visual-playtest-enemies-alive` cut from develop; session + story
context (`sprint/context/context-story-df4-6.md`) + epic context written. Merge gate
clear (no open PRs). Routing to **TEA** for the RED phase.

Note for TEA/Dev: this is a playtest — the RED seam is a rendering/wiring probe at the
served page (per the in-page module render probe pattern), not a new sim law. Assert the
game path DIFFERS from a control, and that no death path flashes the full screen.

## TEA Assessment

**Tests Required:** Yes
**Reason:** the df4 VISUAL PLAYTEST, mechanised (the dynamic counterpart of df2-6's still-frame suite).

**Test Files:**
- `plugins/defender/tests/df4-6-visual-playtest.test.ts` — 10 tests (9 RED, 1 green regression-lock).

**What the RED proves the live game must do** (screenshotted at `/defender/`):
1. **Materialize** — `spawnLander` enqueues a df4-2 APPEAR effect; `composeFrame` renders it.
2. **Safe kill** — `spawnExplosion` starts a df4-2 EXPLODE effect that renders LOCALIZED,
   and the death frame passes `assertNoFullFrameStrobe` **and** repaints < 10% of cells —
   the ADR-0005 accessibility proof (the owner has photosensitive epilepsy; no full-screen
   strobe). `classify('enemy-explode') === 'localized'` is locked green so a regression
   can't reclassify enemy death as a strobe.
3. **Colliding / dying** — `stepSim` runs the df4-1 COLIDE seam (`laserVsObject`) against the
   landers; a laser overlapping a lander kills it (`killLander`) and spawns the explosion.
4. **Abduction** — the df4-3 loop, driven through the LIVE `stepSim` (not just the bank),
   reaches the composed frame.
5. DIFFER vs the empty frame and the static still (render-layer analogue of
   `tests/canonical-serve.test.mjs`); every composed cell stays a valid 4-bit palette index.

**Why RED:** `grep -c 'effects|collide|laserVsObject|spawnExplosion' src/core/sim.ts
src/core/scene.ts` == 0 — collision.ts (df4-1) and effects.ts (df4-2) are built, pure and
gated in isolation, but NOTHING wires them into the live sim. SimState carries no `effects`
view; composeFrame blits no explosion/materialize; stepSim runs no hit test.

**The contract GREEN (Dev) builds:** `SimState.effects` view (refreshed each stepSim like
`lasers`/`landers`, empty on a fresh sim); `spawnLander` enqueues an APPEAR effect;
`spawnExplosion(state, x, y)` starts an EXST effect; `composeFrame` renders `effects` by
palette INDEX only; `stepSim` runs `laserVsObject` → `killLander` + explosion. Self-describing
loader throws spell this out. The kill-wiring test uses the df4-3 "generous eventually" idiom
(20k-tick budget; GREEN owns authentic geometry but may NOT satisfy it by leaving collision
unwired). Per-enemy lang-review coverage already lives in the df4-1..df4-5 suites; df4-6 adds
the integration + accessibility layer, and its safety test guards against the vacuous-pass
trap (asserts the explosion actually rendered before certifying it strobe-free).

**Status:** RED (9 failing) — ready for Dev.
**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/effects.ts` — `createEffectBank`/`PlacedEffect`: the df4-2
  APST/EXST lifecycle given a screen position, spawned/advanced/retired like the laser bank.
- `plugins/defender/src/core/sim.ts` — `SimState.effects` view + `_effectBank`; `spawnLander`
  enqueues an APPEAR (materialize); new `spawnExplosion(state, x, y)` starts an EXST burst;
  `stepSim` runs the df4-1 `laserVsObject` COLIDE seam vs the landers (`hitTestLasers`),
  killing a hit lander (`killLander`) and spawning a LOCALIZED explosion.
- `plugins/defender/src/core/scene.ts` — `composeFrame` renders `state.effects`: the object's
  picture plus a bounded expanding spark ring (colour taken from the sprite).
- `plugins/defender/tests/df4-6-visual-playtest.test.ts` — kill-scenario staging (see deviation).

**Tests:** 602/602 defender GREEN; full fleet 17202 + lint + orchestrator 505 all green.
**Visual playtest:** rendered a showcase frame via the real `composeFrame` + palette decode —
confirmed by eye: a lander materializing (appear ring), two LOCALIZED explosion bursts (a small
diamond + the sprite, **no full-screen flash**), ship/lander/humanoid/upright terrain.
**Branch:** feat/df4-6-visual-playtest-enemies-alive

**Handoff:** To Reviewer.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement** (non-blocking): the df5 accessibility ruling is carried forward per the
  story — the smart bomb (SBOMB, `COM PCRAM`, defender/DEFA7.SRC:3199) and hyperspace
  (HYPER, defender/DEFA7.SRC:3211) are ROM full-screen strobes and ADR-0005 binds them too:
  df5 must render them freeze/fade/particle and log a Design Deviation citing ADR-0005,
  reusing the `classify` policy + `assertNoFullFrameStrobe` guard df4-6 exercises here.
  Affects `plugins/defender/src/core/effects.ts` (df5 extends `EffectEvent`) and df5's death
  path. *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings during implementation. The wiring consumed df4-1 (collision) and df4-2
  (effects) exactly as built; both had the right seams (`laserVsObject`, `startExplode`,
  `killLander`) with no gaps.

### Reviewer (code review)

- **Gap** (non-blocking): the new effect bank drops the module family's lang-review #21
  non-finite boundary guard. `createEffectBank.spawnAppear/spawnExplode` and the public
  `spawnExplosion(state, x, y)` accept x/y with no `Number.isFinite` check, unlike the sibling
  `laser.ts` `fire()` and `landers.ts` `spawnHumanoid/spawnLander`, which both guard and cite
  #21. Failure mode is latent (no current caller passes NaN): a NaN-x renders silently at
  column 0 (`e.x >> 8` coerces before `blitObject`'s finite-check), a NaN-y throws in
  `composeFrame`. Dated trigger — df5 drives `spawnExplosion` directly (see TEA's df5 finding).
  Affects `plugins/defender/src/core/effects.ts` (add the guard to `spawnAppear/spawnExplode`)
  and `plugins/defender/src/core/sim.ts:301` (`spawnExplosion`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `LASER_BOX` (sim.ts:47) comments "Width in PIXELS" but 8 is
  LASP1's raw byte-column width, while the sibling `landerBox` (sim.ts:213) doubles LNDP1's
  width via `PIXELS_PER_BYTE` to reach screen pixels (10) — the two collision boxes in the same
  `laserVsObject` comparison use mismatched units and only one is converted. Correct the comment
  and reconcile the units (errs conservative today — a narrower laser box, no false hits).
  Affects `plugins/defender/src/core/sim.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `scene.ts:108` comment says the spark ring approximates
  SAMEXAP7's "grow/shrink", but `effectPhase`/`drawRing` only ever GROW the radius (phase 0→1
  monotonic for both `appear` and `explode`). Reword to a monotonic-grow approximation.
  Affects `plugins/defender/src/core/scene.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `scene.ts` `EFFECT_*` phase constants (APPEAR_HI/LO,
  EXPLODE_LO/HI) re-type effects.ts's exported `APPEAR_INIT_SIZE`/`EXPLODE_DONE_HI` values as
  render-side literals — correct today, but a future edit to the effects.ts constants would
  desync the phase math with no compiler/test signal. Import the exported constants instead.
  Affects `plugins/defender/src/core/scene.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Effect render = sprite + bounded spark ring.** SAMEXAP7 animates the object's picture by
  *scaling* it (grow/shrink RSIZE); `blitObject` has no scale primitive, and the isolation
  test requires the materialize effect to add pixels *distinct from the very enemy it sits
  atop*. Chosen presentation: raster the object's picture normally (ADR-0005 "localized rasters
  normally") **plus** a small expanding diamond ring, radius `6 + phase·4` (min > any enemy
  sprite's half-extent so it always shows, capped so the burst stays a tiny region). Colour is
  the sprite's own first non-transparent nibble — reached BY INDEX, never invented. ADR-0005's
  actual gate (no whole-framebuffer strobe) is honoured and pinned; the ring is a bounded
  flourish, not a strobe. Reviewer may prefer a sprite-scale animation later; that needs a
  scaling blit and is out of this 2-pt story's scope.

- **Kill-scenario staging (edited a TEA-authored test).** The RED's own comment licensed GREEN
  to "adjust the scenario … it may NOT satisfy this by leaving collision unwired." Authentic
  laser/lander geometry means a *climbing-ship crossing* is a single brief event the sparse
  4-laser stream usually misses. Restaged (assertion UNCHANGED — still a real kill + explosion):
  the ship dwells at its row and holds fire (steady beam); a humanoid sits at the beam row but
  far in X, so the lander descends to that altitude yet can never close the X-gap to grab — it
  lingers in the beam and is reliably killed (deterministic under the seed, ~t=133 ≪ 20k budget).
  No production code was loosened to make this pass.
### Reviewer (audit)

- **Effect render = sprite + bounded spark ring** → ✓ ACCEPTED by Reviewer: ADR-0005's actual
  gate (no whole-framebuffer strobe) is honoured and now render-tested (`assertNoFullFrameStrobe`
  + `changed/total < 0.1`); the ring colour is a real sprite nibble reached by index
  (`spriteColour` scans `pic.bytes`), never invented. Sprite-scale animation is a fair df-later
  follow-up, out of a 2-pt story's scope.
- **Kill-scenario staging (edited a TEA-authored test)** → ✓ ACCEPTED by Reviewer: the RED's own
  comment licensed GREEN to restage; the assertion is unchanged and non-vacuous (landers.length
  only shrinks via `killLander`, reached solely from `hitTestLasers` alongside the explosion —
  abduction-to-top does NOT remove the lander), no production code was loosened, and the kill is
  deterministic under the seed. Sound.
- No undocumented spec deviations found — the two new public seams (`spawnExplosion`, `SimState.effects`)
  match the RED contract exactly.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 602/602 defender GREEN, lint clean, purity intact, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test quality assessed by Reviewer + rule-checker #8/#15/#18/#26/#29) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (type design assessed by Reviewer + rule-checker #1/#2/#5) |
| 7 | reviewer-security | Yes | clean | 1 low (info) | confirmed 1 (folds into RULE #21 finding), dismissed 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (+1 drift note) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 5 confirmed (1 rule/#21 + 1 units-comment + 3 comment/drift), 0 dismissed, 0 deferred — all non-blocking

### Rule Compliance

Checked the changed `.ts` against the TypeScript lang-review checklist and the repo's core rules
(src/core purity; colour-by-index-only; ADR-0005; lang-review #21 boundary guards):

- **src/core purity** — COMPLIANT. `effects.ts`/`scene.ts`/`sim.ts` add no clock, no entropy, no
  DOM/shell import (only type + sibling-core imports); purity sweep GREEN (preflight).
- **Colour never invented** — COMPLIANT. `spriteColour` returns a masked nibble (0..15) or the
  in-range `LASER_COLOUR`; `drawRing`/`blitObject` write only those; test pins `worst <= 15`.
- **ADR-0005 (no full-frame strobe)** — COMPLIANT & TESTED. enemy-explode stays `localized`;
  bounded ring (radius ≤ 10px); `assertNoFullFrameStrobe` + `< 0.1` fraction, both non-vacuous.
- **#1 type-safety escapes** — COMPLIANT (no `as any`/`!`/`@ts-ignore`).
- **#2 readonly** — COMPLIANT (`PlacedEffect`/`EffectBank.effects`/`objects` all readonly;
  `EffectRecord` intentionally-mutable internal, mirrors `LaserRecord`/`LanderRecord`).
- **#3/#4 exhaustiveness / `??`** — COMPLIANT (2-member `EffectKind` ternary; `state.effects ?? []`
  correctly guards a hand-built pre-df4-6 state, not a falsy-but-valid array).
- **#5 module** — COMPLIANT (`.js` extensions; value/type imports split correctly).
- **#14 derived edges** — COMPLIANT (effects/landers views recomputed at stepSim's single exit;
  `step()` runs unconditionally, not inside a branch; the kill edge is centralized in hitTestLasers).
- **#15/#18/#26/#29 test integrity** — COMPLIANT (kill predicate is non-vacuous and mutation-
  sensitive; palette bound is the exact `INDEX_MAX`; localization is a real magnitude; effect-
  render tests isolate the single variable and guard the zero-canvas vacuity trap).
- **#21 degenerate input** — **VIOLATION (1, non-blocking):** `createEffectBank.spawnAppear/
  spawnExplode` + `sim.spawnExplosion` lack the `Number.isFinite` boundary guard the sibling
  banks enforce and cite. See finding [RULE][SEC].
- **#17/#20 comment/number drift** — 1 stale comment (`scene.ts` "grow/shrink"), 1 misleading
  unit claim (`LASER_BOX` "Width in PIXELS"), 1 constant-duplication drift risk (`EFFECT_*`).

## Reviewer Assessment

**Verdict:** APPROVED

The df4-6 wiring is correct and faithful: it composes df4-1 collision + df4-2 effects into the
live sim exactly as the RED contract specified, the full defender suite is GREEN (602/602), lint
and purity are clean, and — the epic's headline risk — the enemy-death path is proven LOCALIZED
and seizure-safe (ADR-0005) by a non-vacuous render test. No Critical or High issue found. Five
confirmed findings are all non-blocking and captured as Delivery Findings for a near-term follow-up
(the #21 guard should close before df5 drives `spawnExplosion` with a computed coordinate).

**Data flow traced:** a held `fire` → `_laserBank.fire` spawns a laser (world-x) → `stepSim`
advances it → `hitTestLasers` builds screen-space boxes (`x >> 8`), runs `laserVsObject` (df4-1
COLIDE box test) vs the live landers → on overlap, `killLander` (LKIL1) removes the lander and
`_effectBank.spawnExplode` starts a localized EXST burst → `withBanks`/stepSim refresh
`SimState.effects` → `composeFrame` blits the picture + bounded spark ring by palette index.
Safe because every write is a masked 0..15 nibble, clipped to the framebuffer, and the death is
bounded (< 10% of cells, no whole-frame strobe).

**Pattern observed:** the effect bank mirrors `createLaserBank`/`createEnemyBank` (mutable record
+ read-only view + spawn/step), carried by reference across ticks — `plugins/defender/src/core/effects.ts:297`.
Good, consistent pattern. The ONE deviation from that family is the missing #21 boundary guard.

**Error handling:** `advance` throws on a non-finite size (fails closed); `blitObject` throws on a
non-finite position and masks nibbles; `drawRing` clips per-pixel; the double-kill guard
(`!lander.alive`) correctly prevents a second explosion when two lasers strike one lander in a tick
(`sim.ts:362`). The gap is at the effect-bank entry (finding below), not the interior.

**Findings (all non-blocking):**

| Severity | Issue | Location | Tag |
|----------|-------|----------|-----|
| [MEDIUM] | Missing lang-review #21 non-finite guard on the new effect-bank seam + public `spawnExplosion`; NaN-x masks to column 0, NaN-y throws in composeFrame. Unreachable today; df5 is the dated trigger. Add the sibling `Number.isFinite` guard. | effects.ts:71-76, sim.ts:301, scene.ts:161 | [RULE][SEC] |
| [MEDIUM] | `LASER_BOX` "Width in PIXELS" comment: 8 is LASP1's raw byte width, but `landerBox` doubles LNDP1 to pixels — mismatched units in the same comparison. Correct comment / reconcile. | sim.ts:47 | [DOC] |
| [LOW] | "grow/shrink" comment: the ring only ever grows (phase 0→1 monotonic for both kinds). | scene.ts:108 | [DOC] |
| [LOW] | `spawnLander` docstring unconditionally promises the appear effect, but a null lander (non-finite x) enqueues none. | sim.ts:148 | [DOC] |
| [LOW] | `EFFECT_*` phase constants re-type effects.ts exports — future drift risk; import instead. | scene.ts:119-124 | [SIMPLE] |

Subagent dispatch tags: [EDGE] skipped (disabled) · [SILENT] skipped (disabled) · [TEST] skipped
(disabled; assessed by Reviewer + rule-checker — no vacuous/coupled assertions found) · [DOC]
3 confirmed (comment-analyzer) · [TYPE] skipped (disabled; rule-checker #1/#2/#5 clean) · [SEC] 1
confirmed, folds into [RULE] · [SIMPLE] skipped (disabled; 1 drift note from rule-checker #20) ·
[RULE] 1 confirmed (#21).

### Devil's Advocate

Argue this is broken. A malicious/confused caller reaches `spawnExplosion` (a new PUBLIC export)
with a NaN or Infinity coordinate — from a df5 wave computation, a shell bug, or a hand-built
state. The module family's own convention (laser.ts/landers.ts, both citing #21) says reject it at
the boundary; this bank does not. Result: a NaN-y throws inside `composeFrame` (crashing the whole
render, since `blitObject` fails loud on non-finite y), or a NaN-x silently paints an explosion at
the screen's left edge — the exact "silent mis-render vs loud failure" #21 exists to prevent. The
story even advertises this seam as the one df5 drives directly, so the trigger is dated, not
hypothetical. Second angle: the collision geometry. `LASER_BOX` (8, raw bytes) and `landerBox` (10,
doubled to pixels) live in different unit systems inside one `laserVsObject` call; a future story
that tightens hit detection or trusts the "Width in PIXELS" comment inherits an undersized,
inconsistently-derived box. Third: the render duplicates effects.ts's lifecycle constants as
scene.ts literals — retune `EXPLODE_GROW`/`EXPLODE_DONE_HI` and the ring phase silently desyncs,
with no test to catch it. Fourth: the ship-row laser model — every live laser is hit-tested at the
CURRENT ship row, so a laser fired at row A then a vertical dodge to row B re-homes the shot to B.

Rebuttal / why none blocks: every one is latent, not live. No current caller passes a non-finite
coordinate (security-confirmed); the suite is green; the geometry is explicitly licensed to Dev by
the RED ("GEOMETRY IS GREEN'S") and errs conservative (a narrower laser box makes no false hits);
the constant duplication is correct today and self-labelled an approximation; and the ship-row
laser behaviour is inherent to df3-5's y-less laser model, not introduced here. All are filed as
Delivery Findings so the #21 guard lands before df5 makes it reachable. The story's actual mandate
— materialize, safe kill, live abduction — is met, faithful, and tested.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.