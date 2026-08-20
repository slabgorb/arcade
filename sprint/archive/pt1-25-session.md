---
story_id: pt1-25
jira_key: pt1-25
epic: pt1
workflow: tdd
---
# Story pt1-25: defender: player-death, smart-bomb and hyperspace have no on-screen effect

## Story Details
- **ID:** pt1-25
- **Jira Key:** pt1-25
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-25-defender-death-smartbomb-hyperspace-effects
- **PR:** (none yet — created when the PR is pushed)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T22:55:43Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T22:21:34Z | 2026-08-20T22:23:46Z | 2m 12s |
| red | 2026-08-20T22:23:46Z | 2026-08-20T22:33:27Z | 9m 41s |
| green | 2026-08-20T22:33:27Z | 2026-08-20T22:40:46Z | 7m 19s |
| review | 2026-08-20T22:40:46Z | 2026-08-20T22:50:47Z | 10m 1s |
| green | 2026-08-20T22:50:47Z | 2026-08-20T22:54:41Z | 3m 54s |
| review | 2026-08-20T22:54:41Z | 2026-08-20T22:55:43Z | 1m 2s |
| finish | 2026-08-20T22:55:43Z | - | - |

## Story Context

### Root Cause Analysis
From the 2026-08-20 gameplay render audit (plugins/defender/docs/2026-08-20-defender-gameplay-render-audit.md), ruled by ADR-0005. The ADR-0005 effect-presentation policy layer has been built in `core/effects.ts` (story df4-2 GREEN) but has ZERO call sites in the live game loop. This means three critical player interactions render with no on-screen feedback:

1. **Player death (killPlayer):** Currently only plays a sound cue and decrements the men count. No explosion or respawn blink.
2. **Smart-bomb fire:** Clears the field with per-enemy explosions generated but never spawned or rendered, no screen-level flash.
3. **Hyperspace teleport:** Instantly warps the ship with no vanish/reappear effect.

### Built Infrastructure (Ready to Wire)

#### Effect Policy & Lifecycle (core/effects.ts)
- **classify(event)** — Classifies effects as 'localized' (normal raster) or 'full-frame-strobe' (safe variant per ADR-0005)
  - `'player-death'` → `{ class: 'full-frame-strobe', presentation: 'fade' }`
  - `'smart-bomb'` → `{ class: 'full-frame-strobe', presentation: 'fade' }` (DEFA7.SRC:3199 COM PCRAM → bounded fade)
  - `'hyperspace'` → `{ class: 'full-frame-strobe', presentation: 'freeze' }` (DEFA7.SRC:3218 screen-clear → held freeze)
  - `'enemy-explode'` → `{ class: 'localized', presentation: 'raster' }` (normal)
  - `'terrain-blow'` → `{ class: 'full-frame-strobe', presentation: 'particle' }` (TERBLO)
- **startAppear(picture), startExplode(picture), advance(effect)** — ROM-cited lifecycle (SAMEXAP7.SRC:58,91,136,163)
- **assertNoFullFrameStrobe(before, after)** — ADR-0005 render guard; fails closed on whole-framebuffer inversion/white-fill

#### Effect Bank (core/effects.ts, sim.ts integration)
- **EffectBank interface:** `effects`, `spawnAppear(x, y, picture)`, `spawnExplode(x, y, picture)`, `step()`
- **Current usage in sim.ts:**
  - Line 453: `state._effectBank.spawnAppear(lander.x, lander.y, LANDER_PICTURE)` on enemy spawn
  - Lines 465, 796, 806, 815, 824, 833, 842: `spawnExplode` on enemy deaths (landers, mutants, baiters, bombers, pods, swarmers, bombs)
  - Line 582: `state._effectBank.step()` every tick (after dispatch, before collision)
- **SimState fields:** `readonly effects: readonly PlacedEffect[]`, `readonly _effectBank: EffectBank`

#### Effect Rendering (core/scene.ts)
- **composeFrame()** already renders effects (lines 531-533):
  ```
  for (const effect of state.effects ?? []) {
    drawEffect(fb, effect, camera)
  }
  ```
- **drawEffect(fb, effect, camera)** — blits the effect sprite by projection (line ~532)
- Effects are rendered AFTER lasers, BEFORE scanner/HUD overlay

### Call Sites to Wire

#### 1. killPlayer (sim.ts:505-520)
**Current:** Only `rt.cues.push({ type: 'player-death' })` and `rt.respawnGrace = RESPAWN_GRACE`

**Needs:** Spawn a player-death effect at the ship's world position before respawn grace activates. Per ADR-0005, the ROM's full-frame strobe is substituted by a fade of the existing frame.

**Code path:**
- killPlayer called at sim.ts:494, 544 (hyperspace may kill), 594 (collision vs enemy)
- Ship world position available: `rt.player.x` (sim.ts:562, world-space), `shipRow` (local var)
- Effect picture: the ship sprite or a dedicated death sprite (SHIP_PICTURE or DEATH_PICTURE from objects.ts)

#### 2. Hyperspace (sim.ts:542-552)
**Current:** Direct teleport `plax16 = t.x16; shipFacing = t.facing; shipRow = t.y; vy = ...; plaxv24 = ...` with no visual effect

**Needs:** Spawn a hyperspace effect (freeze presentation) BEFORE teleporting, or AFTER to mark re-entry. The ROM's screen-clear (DEFA7.SRC:3218) is replaced by a held freeze across the jump per ADR-0005.

**Code path:**
- Line 542-552: before teleport (line 547-551), spawn effect at old position OR after teleport at new position
- World positions: `rt.player.x` for old, `t.x16 >> 8` (approx) for new
- Effect picture: could reuse ship or a dedicated hyperspace sprite

#### 3. Smart-bomb (sim.ts:570-579)
**Current:** `smartBomb(...)` returns fired state, then `clearAllEnemies(state, award)` clears field with per-enemy explosions queued via `award()` cues. No screen-level effect.

**Needs:** Spawn a smart-bomb effect (fade presentation per ADR-0005, NOT the ROM's COM PCRAM inversion) AFTER the bomb fires and before clearAllEnemies, or as a separate overlay. The fade is a bounded wash of the screen, not a full inversion.

**Code path:**
- Line 571-579: after `res.fired` check, spawn effect at screen center or ship position
- Effect picture: a dedicated bomb-burst sprite (BOMB_PICTURE from objects.ts, or a dedicated effect sprite)
- Per ADR-0005, this substitutes DEFA7.SRC:3199 (COM PCRAM whole-page invert)

### ADR-0005 Design Deviation
The ROM's three full-frame strobe effects (player death, smart-bomb, hyperspace) are replaced by seizure-safe variants:
- **Player death:** ROM's full-frame inversion → ADR-0005 fade of existing frame
- **Smart-bomb:** ROM's COM PCRAM whole-page invert (DEFA7.SRC:3199) → ADR-0005 bounded fade wash
- **Hyperspace:** ROM's screen-clear flash (DEFA7.SRC:3218) → ADR-0005 held freeze across jump

Each effect's **trigger, timing, and ROM constants** are cited and ported as usual; only the **strobe presentation** is substituted. The assertNoFullFrameStrobe guard (effects.ts:216-257) enforces that no refactor can silently reintroduce the ROM strobe.

## Sm Assessment

**Ready for RED (TEA).** This is a wiring story: the ADR-0005 effect-policy layer in
`plugins/defender/src/core/effects.ts` is built and unit-covered (df4-2) but has zero
call sites in the live loop. The whole story lives in `core/` — `classify`, the effect
bank, and `composeFrame`/`drawEffect` are all pure-core, so purity is not at risk and no
`shell/` change is expected. (Per the arcade render-audit convention, verify premises
against `core/scene.ts`, not `shell/render.ts`.)

**Scope for TEA:** write failing tests, at the sim/core level, that assert an effect is
actually spawned into `state.effects` (and thus reaches `composeFrame`) on each of the
three triggers:
1. `killPlayer` spawns a `player-death` effect (fade class).
2. Hyperspace spawns a `hyperspace` effect (freeze class).
3. Smart-bomb fire spawns a `smart-bomb` effect (fade class), separate from the per-enemy
   `enemy-explode` bursts `clearAllEnemies` already queues.

Tests must anchor on the ADR-0005 presentation `classify()` returns for each event
(fade/freeze), and the `assertNoFullFrameStrobe` guard must stay green — the safe-variant
substitution is the point, not a real strobe. Prefer core-state assertions (effect
present, correct classification, correct world position) over pixel-diffing.

**Traps to flag to TEA/Dev:**
- The sim.ts line numbers in this session are from setup research and may have drifted;
  locate the call sites by symbol (`killPlayer`, the hyperspace block, `smartBomb`/
  `clearAllEnemies`), not by line.
- The df6-1 placeholder comment in `killPlayer` should be retired once wired.
- Log the ADR-0005 strobe→safe-variant substitution as a Design Deviation in the story
  (already drafted below), as ADR-0005 requires.
- pt1-22 (live palette) is DONE, so the A-F cyclers the smart-bomb effect needs are live.

## TEA Assessment (RED)

**RED confirmed.** New suite `plugins/defender/tests/pt1-25-death-power-effects.test.ts`
(commit 82935217): **4 wiring tests fail, 4 policy/baseline guards pass** on the current
tree. The failing tests each fail ONLY on the missing effect — their harness assertions
(men−1 on the strand, the surviving cue, the spent bomb) pass first, proving the drives
are deterministic and the defect is exactly "zero call sites", nothing else.

### The contract Dev must make GREEN
Each of the three triggers spawns ONE effect through the existing `_effectBank`, and the
read-side `PlacedEffect` (the `state.effects` view) gains a **discriminator `event`** set on
the three screen effects so the composer can `classify()` them into the ADR-0005 safe
presentation:
- **`killPlayer` → event `'player-death'`.** Spawn it **inside `killPlayer()` itself**, not
  at one call site — the suite drives the death via the hyperspace-strand path, so a fix
  wired only at the collision site would stay RED. Wiring at the choke point covers every
  death cause (collision, strand) for free.
- **hyperspace (teleport branch) → event `'hyperspace'`.**
- **smart bomb fire → event `'smart-bomb'`**, DISTINCT from the localized `enemy-explode`
  bursts `clearAllEnemies` already queues, and it must actually reach the framebuffer
  (`composeFrame`/`drawEffect` must render the screen effect — today `drawEffect` only
  knows the sprite+ring path).
- The existing `'player-death'` / `'smart-bomb'` **cues must survive** (regression-guarded).

### Design freedom / non-coupling
The suite asserts on the `event` tag and observable state, never on the exact fade/freeze
pixels — Dev owns how the safe variant renders. The one render assertion is presentation-
agnostic: the smart-bomb frame must (a) differ from the same frame with the screen effect
stripped (it is drawn) and (b) pass `assertNoFullFrameStrobe` (it is bounded, not a strobe).

### Rule Coverage (lang-review/typescript.md + ADR-0005)
- **Every guard mutation-tested (§ "delete the mechanism and require red").** The wiring
  assertions ARE the mutation: with the mechanism absent (today) they are red; they go green
  only when the spawn is added. The `men−1` / `smartBombs−1` / cue assertions independently
  pin that the trigger branch was actually taken (non-vacuous — a no-op sim would fail them).
- **Fixture whose value IS the expectation.** Baseline test asserts a fresh sim's
  `screenTags` is `[]`, so each trigger test proves the effect appears *because of* the
  trigger, not incidentally.
- **ADR-0005 seizure-safe substitution** (project safety rule; outranks ROM fidelity): the
  three `classify()` guards pin full-frame-strobe→non-raster, and the render guard pins the
  wash inside `assertNoFullFrameStrobe`. `classify('smart-bomb')` and `classify('hyperspace')`
  had NO test anywhere (effects.test.ts's local enum omits them) — now covered.

### Traps for Dev
- Spawn the player-death effect in `killPlayer`, per above.
- The effect must live the tick it is spawned — `_effectBank.step()` retires effects whose
  `done` was set on a prior frame, so a screen effect flagged `done:true` on spawn would be
  culled the same tick and stay RED. Use the appear/explode lifecycle (not-done-initially),
  as the enemy effects do.
- `event` is a NEW field; `npm run lint` (tsc) is not in the RED/GREEN loop but IS in
  CI/review — add `event` to the `PlacedEffect` type, don't just set it at runtime.

## Delivery Findings

**Upstream findings from render audit (2026-08-20):**
- **Conflict:** Effects.ts classify() is built and correct per ADR-0005, but zero call sites exist in the game loop. Player death, smart-bomb, and hyperspace all trigger their ROM actions (sound, field clear, teleport) but no effect renders.
- **Question:** Should hyperspace spawn an effect BEFORE teleport (freeze on old position, then jump) or AFTER (freeze on new position after jump)? ROM timing (DEFA7.SRC:3211 flash on re-entry) suggests AFTER. Design choice for implementation.
- **Question:** What sprite picture should death/hyperspace effects use? Can reuse SHIP_PICTURE or need dedicated sprites (DEATH_PICTURE, HYPERSPACE_PICTURE). Current objects.ts has SHIP_OBJECT; landers have LANDER_PICTURE; check what's available or design new.
- **Prerequisite:** pt1-22 (live palette) is required — smart-bomb effect relies on the A-F palette cyclers to render. Confirmed DONE 2026-08-20.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Dev Delivery Findings (GREEN)

**Implementation (commit 0fa84149).** Three files, all in `core/`:
- `effects.ts`: `EffectState`/`PlacedEffect` gain `event: EffectEvent`; `picture` is now
  optional (a screen effect animates no sprite). `startAppear`/`startExplode` default the tag
  to `'enemy-explode'` (existing enemy effects unchanged); new `startScreen(event)` + bank
  `spawnScreen(event)` for the three screen events (EXPLODE decay so they self-retire).
- `sim.ts`: `spawnScreen('player-death')` **inside `killPlayer`** (one choke point → every
  death cause), `spawnScreen('hyperspace')` on the successful-teleport branch only, and
  `spawnScreen('smart-bomb')` on a fired bomb (distinct from the per-enemy bursts).
- `scene.ts`: `drawEffect` branches on `classify(e.event).presentation`; non-raster →
  `drawScreenWash`, a bounded/sparse/low-contrast/decaying wash.

**Results:** pt1-25 suite 8/8 green; full defender project **1156/1156**; `npm run lint`
clean; purity guard green (no clock/entropy/shell reached from `core/`).

**Two decisions the reviewer should weigh:**
1. **Wash boundedness is load-bearing for safety.** My first cut lifted *all* background cells
   (~99%) and correctly tripped the fleet's medical guards (`df3-6-live-sim` = no single colour
   ≥ 60%; `df5-7-visual-playtest` = a safe clear repaints < 90%). The fix is a sparse 1/9
   lattice (`SCREEN_WASH_STEP=3`), dim (peak index 3), single-shot, decaying — clear of both
   guards and `assertNoFullFrameStrobe`. This is the ADR-0005 line; those guards, not just my
   own tests, now protect it.
2. **fade vs freeze render the same.** `classify()` keeps the policy distinct (smart-bomb/
   player-death = fade, hyperspace = freeze), but the MVP renders every non-raster presentation
   as the one safe wash — a literal "freeze" (holding a prior frame) is not expressible in this
   stateless per-tick composer. Documented in the scene.ts comment and the Design Deviation.

## Design Deviations

- **ADR-0005 substitution (player-death, smart-bomb, hyperspace):** The ROM's full-frame white-invert strobes are replaced by seizure-safe variants (freeze, fade, freeze) to accommodate the owner's photosensitive epilepsy, per ADR-0005 standing exception. All timing/trigger constants are ROM-cited; only the pixel presentation is exempted.
## Reviewer Notes (interim — Thought Police)

Independent read + verification (before all subagents returned):
- **Purity holds.** effects.ts/scene.ts are `core/`; drawScreenWash is pure framebuffer math,
  `classify` is core→core. purity.test.ts 49/49 green.
- **No unguarded `picture` access.** tsc clean confirms every `effect.picture` consumer is
  guarded; drawEffect is the only consumer and screen effects never reach its raster branch.
- **terrain-blow is NOT a regression.** `landers.ts:523` returns `effectEvent:'terrain-blow'`
  but that field has NO consumer anywhere in src — it never reaches `_effectBank`, so the new
  `drawEffect` non-raster branch never sees it. (Latent note: if a future story wires
  terrain-blow into the bank, it would render as the sparse wash, not a true 'particle' burst.)
- **Wash boundedness re-confirmed** against the two fleet medical guards (df3-6 <60% single
  colour, df5-7 <90% repaint): 1/9 lattice, peak index 3, decaying, self-retiring.
- **Preflight GREEN:** full suite passes, lint clean, 0 smells.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 2 with findings; 5 disabled via settings)
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred
**Working-tree audit:** CLEAN (initial DIRTY was the pf status stamp on sprint/epic-pt1.yaml — tracking-only, `in_progress`→`in_review`; restored, re-audit CLEAN)

### Rule Compliance

reviewer-rule-checker enumerated 34 rules over 47 instances in the diff, 0 violations — I
spot-verified the load-bearing ones myself:
- **src/core purity (ADR/CLAUDE):** `drawScreenWash`, `startScreen`, `spawnScreen` and the
  three sim.ts call sites read no clock/entropy and reach no shell — VERIFIED (purity.test.ts
  49/49 green). Compliant.
- **Exhaustive union handling:** `classify()` still covers all 5 `EffectEvent` members with
  `default: assertNever` — VERIFIED effects.ts:183-200. `drawEffect`'s non-raster collapse is an
  `if`, deliberately documented, not a dropped switch case. Compliant.
- **ADR-0005 (no >3 Hz large-area strobe; accessibility outranks ROM):** the wash touches ≤1/9
  of cells at index ≤3, single decaying pulse, never a non-background cell — VERIFIED against the
  df3-6 (<60% single colour) and df5-7 (<90% repaint) fleet guards, both green. Compliant.
- **Inline ROM citations:** DEFA7.SRC:3199 (SBMBX0 COM PCRAM) and :3218 (HYPER JSR SCLR1) both
  byte-accurate — VERIFIED independently by rule-checker + comment-analyzer against the vendored
  source. Compliant.
- **No type-safety escapes:** the test's `e as TaggedEffect` / `as ScreenEvent` casts are a
  structural shim with a real runtime `isScreenEvent` guard, not `any`/`ts-ignore`. Compliant.

### Observations

- [VERIFIED] Production wiring is correct — `spawnScreen('player-death')` sits in the single
  `killPlayer` closure (sim.ts:512), reached by BOTH the hyperspace-strand (sim.ts:547) and
  collision (sim.ts:602) death branches; `'hyperspace'` (sim.ts:556) only on teleport-success;
  `'smart-bomb'` (sim.ts:584) only under `if (res.fired)`. Evidence traced; rule-checker #14 agrees.
- [VERIFIED] The wash self-retires (EXPLODE lifecycle → `done`, `step()` culls) so it is a
  single decaying pulse, not a per-frame repaint — effects.ts:139-141 + step() at effects.ts:326.
- [VERIFIED] No other consumer of `PlacedEffect.picture` breaks under the now-optional field —
  tsc (`npm run lint`) clean; drawEffect is the only consumer and guards `if (!e.picture)`.
- [TEST][HIGH] The render-safety assertion at pt1-25-death-power-effects.test.ts:172 is
  mutation-proven vacuous: filling `drawScreenWash` to all-$F (the exact ROM strobe) leaves the
  suite green, because composeFrame draws scanner/HUD after drawEffect so the frame is never
  byte-identical all-$F. Matches lang-review "every guard must be mutation-tested" — NOT dismissable.
- [TEST][HIGH] The "every death cause surfaces the effect" claim (sim.ts comment + test header)
  is unguarded: death is only driven via the hyperspace strand, so a mis-wire moving the spawn to
  only that branch passes (mutation-proven, test line 96). Matches the same rule — NOT dismissable.
- [TEST][MEDIUM] The three `classify()` re-assertions (test lines 116/130/176) duplicate coverage
  already in effects.test.ts and df5-5-powers/df5-7 — they exercise the pure classifier, not the
  wiring this story adds. Remove.
- [TEST][LOW] The test's local `ScreenEvent`/`SCREEN_EVENTS` shadow re-implements the EffectEvent
  subset instead of importing `EffectEvent` (test line 39).
- [DOC][MEDIUM] effects.ts:47 header says player death is "FREEZE + FADE" but classify() returns
  `'fade'` only — provably wrong now that the path is wired.
- [DOC][MEDIUM] effects.ts:48 + the new scene.ts comment: `'particle'` (terrain-blow) collapses
  into the same wash as fade/freeze, but the comment discloses only the fade/freeze collapse —
  misleading by omission. (Latent: terrain-blow is not yet spawned into the bank, so no runtime effect.)

### Devil's Advocate

Assume this code is broken. The most dangerous claim it makes is a MEDICAL one: "this substitute
cannot strobe." A photosensitive player's safety rides on that. And the test-analyzer proved the
suite's own safety assertion is theatre — mutate the wash into a full-white flash and the tests
stay green. If a future refactor "optimised" drawScreenWash into a full-frame fill, THIS story's
tests would wave it through; only the neighbouring df5-7/df3-6 fleet guards would catch it, and a
careless dev deleting those alongside would ship a seizure trigger. That is precisely why the
vacuous assertion is not cosmetic: it is a false safety net over the one property that outranks ROM
fidelity. A confused maintainer reading the green "must not be a whole-frame white-fill" test would
trust a guard that does not guard. Next, a malicious/edge input: what if two triggers fire the same
tick (die while smart-bombing)? Two washes stack, but each only lifts background to ≤3, so no
compounding past peak — safe, and I verified it. What about the final death (men<0)? spawnScreen runs
before the gameOver return, but composeFrame short-circuits to the game-over screen, so the last
wash is never shown — harmless, not a defect. What would a confused reader misunderstand? The
comments: "FREEZE + FADE" and an undisclosed particle collapse both misdescribe what renders,
inviting a future dev to "fix" a fade to add a freeze that does not exist, or to assume particle is
distinct. What about the collision-death path — the far more COMMON death? It is correct in the
code but untested, so a regression there ships silently. None of these are production bugs today —
the implementation is genuinely correct and safe — but two of them are false guarantees in the test
and comment layers, and on a medical-safety story a false guarantee is a High.

### Reviewer (audit)

Design Deviations audit — the logged ADR-0005 substitutions (fade/freeze/wash) are sound and
ROM-cited; I stamp them accepted below. One undocumented divergence: the code collapses `'particle'`
into the generic wash but only fade/freeze was disclosed — captured as [DOC][MEDIUM] above.

## Reviewer Assessment

**Verdict:** REJECTED — 2 mutation-proven High test-quality findings on a medical-safety story; production code itself is correct.

**Findings by source:** [TEST] 4 confirmed (2 High vacuous/missing-guard, 1 Medium redundant, 1 Low shadow) · [DOC] 2 confirmed (stale "FREEZE+FADE"; undisclosed particle collapse) · [RULE] reviewer-rule-checker clean (34 rules / 47 instances, 0 violations — purity, ADR-0005, exhaustiveness and ROM citations all independently verified). [TEST] findings #1 and #2 match the non-dismissable lang-review rule "every guard must be mutation-tested".

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Render-safety assertion is mutation-proven vacuous (a full-$F strobe passes) | pt1-25-death-power-effects.test.ts:172 | Replace with a direct bound: assert changed-cell fraction ≤ ~1/9 and no changed cell exceeds SCREEN_WASH_PEAK, so a full-fill mutation reddens |
| [HIGH] | "Every death cause" is unguarded — only the hyperspace strand is exercised | pt1-25-death-power-effects.test.ts:96 | Add a collision-death test (enemy on the ship, NEUTRAL input) asserting screenTags contains 'player-death' |
| [MEDIUM] | Three classify() re-assertions duplicate existing coverage | test.ts:116,130,176 | Remove them (covered by effects.test.ts / df5-5 / df5-7) |
| [MEDIUM] | Stale comment: "FREEZE + FADE" vs classify()'s 'fade' | effects.ts:47 | Correct to "FADE" |
| [MEDIUM] | Comment omits that 'particle' also collapses into the wash | effects.ts:48 + scene.ts comment | Disclose that all three non-raster presentations share the MVP wash |
| [LOW] | Local EffectEvent-subset shadow | test.ts:39 | Import EffectEvent for the shim |

**Handoff:** Back to Dev for fixes
## Subagent Results

**Cycle: 1**

**Method:** targeted re-verification of each round-1 finding (mutation probes for the two High test findings; grep/read for the rest), plus re-ran the enabled mechanical checks (defender vitest 1154/1154, `npm run lint` clean). Not a fresh generalist sweep — the round-1 findings were characterized, so targeted probes are the stronger evidence.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | re-ran suite (1154 pass) + lint clean |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | prior 4 resolved (2 High mutation-proven fixed; 1 Medium removed; 1 Low fixed) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | prior 2 resolved (stale FREEZE+FADE→FADE; particle collapse disclosed) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | prior clean; re-confirmed exhaustive/purity/ADR-0005 unaffected by test+comment fixes |

**All received:** Yes (4 enabled re-verified, 0 with findings; 5 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred
**Working-tree audit:** CLEAN (pf status stamp restored before audit)

### Re-verification evidence (round-1 findings)

- **[TEST][HIGH] render-safety vacuity (was test:172):** FIXED. The assertion now bounds the wash
  directly (`changed/total < 0.2` and `brightest ≤ WASH_MAX_INDEX`). Mutation probe (commit
  06af4bc3, in a clean tree): filling `drawScreenWash` to index 15 now REDDENS
  (`expected 15 to be ≤ 4`). No longer vacuous.
- **[TEST][HIGH] missing collision death (was test:96):** FIXED. New test drives a baiter onto
  the ship (df6-1 rig) → collision death. Mutation probe: moving `spawnScreen('player-death')`
  out of `killPlayer` to only the hyperspace-strand site now REDDENS (`expected [] to include
  'player-death'`). The "every death cause" claim is guarded.
- **[TEST][MEDIUM] redundant classify tests:** FIXED — all three removed (grep count 0); coverage
  remains in effects.test.ts / df5-5 / df5-7.
- **[TEST][LOW] union shadow:** FIXED — `import type { EffectEvent }`, shim uses
  `Extract<EffectEvent, …>` instead of a re-declared copy.
- **[DOC][MEDIUM] stale "FREEZE + FADE":** FIXED — effects.ts:47 now "a brief FADE (classify → 'fade')".
- **[DOC][MEDIUM] particle collapse undisclosed:** FIXED — scene.ts comment now states all three
  non-raster presentations (fade/freeze/particle) share the MVP wash and that 'particle' is latent.

## Reviewer Assessment

**Verdict:** APPROVED (re-review; supersedes the round-1 REJECTED verdict)

**Findings by source:** [TEST] 4 round-1 findings all resolved and mutation-re-verified · [DOC] 2 round-1 findings all resolved · [RULE] reviewer-rule-checker was clean and the fixes (test-only + two comments) do not touch the production logic it validated (purity/ADR-0005/exhaustiveness/citations unchanged).

**Data flow traced:** trigger (killPlayer / hyperspace teleport / smart-bomb fire) → `_effectBank.spawnScreen(event)` → `state.effects` (event-tagged) → `composeFrame`→`drawEffect`→`drawScreenWash` (bounded ≤1/9, dim, decaying). Safe because the wash never writes a non-background cell and is a single decaying pulse — verified against the df3-6 (<60%) and df5-7 (<90%) fleet guards and now this suite's own direct bound.
**Pattern observed:** one-choke-point spawn in `killPlayer` covering both death branches — plugins/defender/src/core/sim.ts:512, now guarded by the collision-death test.
**Error handling:** optional `picture` guarded at scene.ts drawEffect (`if (!e.picture) return`); `advance` keeps its non-finite guard; tsc clean.
**Handoff:** To SM for finish-story