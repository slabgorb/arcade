---
story_id: "df3-6"
jira_key: "df3-6"
epic: "df3"
workflow: "tdd"
---
# Story df3-6: VISUAL playtest — the ship flying a scrolling, wrapping world

## Story Details
- **ID:** df3-6
- **Jira Key:** df3-6
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/df3-6-wire-df3-core-into-shell-and-playtest
- **PR:** 453

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T11:49:13Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T10:37:52Z | 2026-08-16T10:42:18Z | 4m 26s |
| red | 2026-08-16T10:42:18Z | 2026-08-16T11:03:39Z | 21m 21s |
| green | 2026-08-16T11:03:39Z | 2026-08-16T11:20:29Z | 16m 50s |
| review | 2026-08-16T11:20:29Z | 2026-08-16T11:32:13Z | 11m 44s |
| red | 2026-08-16T11:32:13Z | 2026-08-16T11:43:36Z | 11m 23s |
| green | 2026-08-16T11:43:36Z | 2026-08-16T11:44:23Z | 47s |
| review | 2026-08-16T11:44:23Z | 2026-08-16T11:49:13Z | 4m 50s |
| finish | 2026-08-16T11:49:13Z | - | - |

## Delivery Findings

No upstream findings.

### Dev (implementation)
- **Improvement** (non-blocking): laser streaks are drawn at the ship's CURRENT row, not the row the shot was fired from. `laser.ts` (df3-5) tracks only the leading-edge X (no Y), so `composeFrame` streaks each live laser at `state.ship.y`. Faithful per-shot Y would need df3-5's `Laser` to carry a fire-time Y (or the sim to track it). Affects `plugins/defender/src/core/scene.ts` (drawLaserStreak) — cosmetic for df3; candidate follow-up. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the planet TERRAIN does not scroll with the camera — only the parallax STARFIELD (df3-4) does, so the "scrolling world" is conveyed by the stars + the ship-leads offset, with a static terrain profile beneath. df3 built star parallax but no terrain scroll; a camera-scrolled terrain would be a later story. Affects `plugins/defender/src/core/scene.ts` (composeFrame lays a static `blitTerrain`). *Found by Dev during implementation.*

## Design Deviations

(Agents: append deviations below this line. Do not edit other agents' entries.)

### Dev — vertical-clamp bound corrected to the faithful ROM strip (2026-08-16)
The RED `df3-6-live-sim.test.ts` vertical-clamp group asserted the epic's simplified
player strip `[YMIN+1, 238] = [43, 238]`. The faithful ship code (`ship.stepVerticalY`,
df3-3) freezes upward at 43 and downward at 238 but INTEGRATES with NO post-add clamp
(DEFA7.SRC:2472-2474), so a max ±$200 step overshoots exactly one row past the freeze
line — reaching row 42 (=YMIN) going up or 239 going down — before it re-freezes. The
reachable strip is therefore `[YMIN, 239] = [42, 239]`. **ROM-always-wins**, so I
corrected the test bounds to `y >= YMIN` (up) and `y <= 239` (down) rather than make the
ship unfaithful to pass the epic's rounding. This is a TEST correction only — no ship
code changed. **Forward impact:** the story title and `context-story-df3-6.md` AC5 still
read "[YMIN+1,238]"/"[43,238]" (the epic's simplification); the faithful reachable strip
is [YMIN,239]. A later reader pinning the vertical clamp should cite the ROM strip, not
the epic prose.

> **Reviewer audit (Heimdall, 2026-08-16): ACCEPTED.** The correction is faithful
> (ROM-always-wins) and cited (DEFA7.SRC:2472-2474). Independently confirmed by the
> test-analyzer mutation: removing both freeze checks in `stepVerticalY` overshoots to
> y=-664 / y=903, which the corrected `[42,239]` bounds catch — the corrected bound is a
> meaningful clamp pin, not a loosening to force green. No ship code changed. The
> forward-impact note (title/context still say [43,238]) is correctly recorded.

---

## Session Notes

**Rescope (owner ruling 2026-08-16):** df3-6 was originally scoped as a visual playtest only (3 pts). The owner measured that the df3 core modules (scheduler/ship/world/stars/laser, df3-1..5) were never wired into the running shell — `plugins/defender/src/main.ts` is the df2 STATIC still. The story is now re-pointed 3→8 and includes the shell-integration BUILD as well as the playtest.

**BUILD scope added:**
- Drive scheduler `stepTick()` off `@shared/loop` (fixed 60 Hz)
- Wire a shell input adapter (pure snapshot)
- Compose the dynamic framebuffer from sim state by INDEX
- Verify purity.test.ts stays green

**PLAYTEST scope (original, now on live animation):**
- Visual proof of ship + scroll + wrap + laser + vertical clamp
- DIFFER vs nonsense control path
- Confirm scroll direction, ship-leads offset, vertical clamp, colour
- Accessibility forward-note (freeze/fade downstream, no strobe)

## SM Assessment

**Premise measured before setup (the story was stale).** df3-6 read as a pure
visual playtest, but SM verified against the tree that the df3 core
(scheduler/ship/world/stars/laser, df3-1..5) shipped only as pure sim modules and
was **never wired into the running shell**: `plugins/defender/src/main.ts` is the
df2-era static still (calls `composeStaticFrame()` once, blits the same framebuffer
every rAF; no `stepTick()`, no input, no dynamic scene composer), and
`src/core/scene.ts` exports only `composeStaticFrame`. So nothing could be
playtested — there is no animation to screenshot. The title's other claim (the
mechanical DIFFER check "already runs in tests/canonical-serve.test.mjs") is TRUE —
that suite enumerates games from `plugins/` so defender is covered — but it proves
*serving*, not *animation*.

**Owner ruling (2026-08-16):** expand df3-6 to fold in the missing shell-integration
BUILD alongside the playtest. Re-pointed 3 -> 8, status in_progress. Epic YAML
description + context rewritten to the true scope; a dated RESCOPE banner heads the
context so the change is auditable, not disguised as always-having-said-so.

**Trap encountered + fixed:** the epic-YAML rescope was made while on `develop`
(uncommitted); sm-setup's branch creation reverted it (branch showed points 3, old
title). Re-applied on the feat branch and COMMITTED (`4deec348`) so it cannot be lost
again. Claim branch pushed to origin.

**Verified at handoff:** session fields present (Repos/Workflow/Branch, one phase
pointer); context carries the RESCOPE banner, 8pt, and ACs split across BUILD + PLAYTEST
halves (all falsifiable, no self-refuting notes); epic shard parses, one df3-6 entry,
no conflict markers; branch `feat/df3-6-wire-df3-core-into-shell-and-playtest` created,
committed, pushed.

**Handoff to TEA (Tyr One-Handed), RED phase.** Write failing tests covering BOTH
halves. Key seams and traps: the scheduler must be stepped at a fixed 60 Hz off
`@shared/loop` (not a sub-rate); the input snapshot must be pure (core reads no
DOM/clock — `purity.test.ts` stays green); the dynamic scene composer belongs in
`src/core` and composes by palette INDEX only (df2 palette, no hex); pin the camera
slide by COORDINATES not just direction (routing != geometry); the vertical axis has
TWO rules (player CLAMP `[YMIN+1,238]` vs object WRAP). The playtest ACs are
human-smoke by nature (a screenshot of the running game at 127.0.0.1:5270/defender/
vs a nonsense control) — the port may be held by a sibling checkout, so prove whose
server answers 5270 before trusting a screenshot (CLAUDE.md dev-serve caveat). Full
technical approach, reuse pointers and reference docs are in
`sprint/context/context-story-df3-6.md`.

## Dev Assessment (GREEN)

**All four seams built; every gate green.**
- `plugins/defender/src/core/sim.ts` — the pure aggregate. `Input`, `createSim(rand)`,
  `stepSim(state,input)`. One tick, in ROM order: `stepReverse` → `stepVelocityX`
  (24-bit) → `stepVerticalY` → `slide` (fed `plaxv24 >> 8`, the top-16-bit seam) →
  `stepStars` (by the camera delta) → `laserBank.fire` (BEFORE dispatch, so a fresh
  laser first travels next tick per df3-5) → `sched.stepTick`. The scheduler + laser bank
  are minted per `createSim` and carried by reference, so two same-seed sims never share a
  run-list — determinism holds.
- `plugins/defender/src/core/scene.ts` — `composeFrame(state,w,h)` beside
  `composeStaticFrame`: clear → `drawStars` → `blitTerrain` → `blitObject(PLAPIC)` at the
  ship's display column/row → laser streaks. Palette INDEX only; board dims as arguments
  (no shell import).
- `plugins/defender/src/shell/input.ts` — pure `mapInput(KeyMembership): Input`
  (WASD + arrows + Space/Enter), the `Input` type imported from core (shell → core).
- `plugins/defender/src/main.ts` — `createLoop` off `@shared/loop` (60 Hz): `stepSim` in
  the step callback with `mapInput(held)`, `composeFrame` + `render` in the render
  callback; `installHeldKeys` for the PIA read; the bare `requestAnimationFrame` retired
  (createLoop owns the pump). `mountCanvas` kept.

**Verification (evidence, not assertion):**
- `npx vitest run --project defender` → **450/450** (the 26 df3-6 tests now green; the 423
  pre-existing kept green, incl. `purity.test.ts` AST-sweeping the new `src/core` files).
- `npm run test:orchestrator` → **505/505** (canonical-serve still serves `/defender/`).
- `npm run lint` (tsc --noEmit) → clean. `node scripts/build-app.mjs defender` → built (27
  modules, main 23.92 kB).
- **Browser playtest** (Playwright, my tree served on `:5299`, `/defender/`): with a
  position-sensitive frame hash — rest HOLDS, thrust SCROLLS the world, sustained thrust
  keeps scrolling, firing ADDS a laser; control `/defender-xyzzy/` served the lobby
  (`Slabcade`) while `/defender/` served `Defender` (they DIFFER). Screenshot (in the
  session scratchpad, not committed): the ship over the coloured starfield, facing right
  with a white laser streak, green planet terrain along the BOTTOM (upright), no
  full-screen strobe. (First probe gave a false negative from a position-INDEPENDENT
  checksum — a moving-stars frame has the same value-sum; switched to an index-weighted
  hash. Worth remembering for anyone re-checking animation from pixels.)

**One deviation, one pair of non-blocking findings** — see the Design Deviations
(vertical-clamp bound → faithful ROM strip `[YMIN,239]`) and Delivery Findings (laser Y
drawn at the ship's current row; terrain not camera-scrolled) sections above.

**Handoff to Reviewer (Heimdall).** The mechanical half is fully pinned and green; the
visual half was confirmed live (above) but the eye-check of scroll direction / colour is
yours/owner's. Watch: the PLAXV 24→16 seam in `stepSim` (`plaxv24 >> 8` into `slide`); the
laser-fired-before-stepTick ordering; and the deviation's ROM-vs-epic clamp bound.

## Subagent Results — round 1

All received: Yes (4 enabled ran to completion; 5 disabled via `workflow.reviewer_subagents`,
compensated by the Reviewer's own adversarial read + a sequential mutation battery).

| # | Subagent | Status | Findings |
|---|----------|--------|----------|
| 1 | reviewer-preflight | Complete | 0 blocking — defender 450/450, orchestrator 505/505, lint clean, build OK, 0 code smells |
| 2 | reviewer-edge-hunter | Skipped | disabled via settings (compensated by Reviewer mutation battery) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled via settings (Reviewer verified: require_/blitters throw loud, no empty catches) |
| 4 | reviewer-test-analyzer | Complete | 2 HIGH (composeFrame ship/laser unguarded; shell-wiring can't detect a frozen sim) + 1 LOW (input distinct-key) — all mutation-confirmed |
| 5 | reviewer-comment-analyzer | Complete | 1 MEDIUM (still-frame.test.ts:245 misleading `mainSourcePath` comment) |
| 6 | reviewer-type-design | Skipped | disabled via settings (Reviewer verified: readonly fields, precise Record type, no `as any`/non-null) |
| 7 | reviewer-security | Skipped | disabled via settings (N/A — no input parsing/auth/secrets; pure sim + keyboard booleans) |
| 8 | reviewer-simplifier | Skipped | disabled via settings (rule_checker #26 covered the one dead-const case) |
| 9 | reviewer-rule-checker | Complete | #17 + #26 FAIL (still-frame.test.ts:245/247) + #1 minor (catch-cast, 2 sites); all other applicable rules PASS incl. purity, colours-by-index, .js, reuse |

Reviewer's own mutation battery (sequential, source committed, reverted + verified clean each
time): killed `accel:false` (thrust ignored), `composeStaticFrame` return (static composer),
`mapInput` all-false; **survivor:** `plaxv24 >> 8` → `plaxv24` in `stepSim` (Finding 3).

## Round-1 Review Record (REJECTED, superseded by round 2 — see the Reviewer Assessment below)

**Verdict: REJECTED** (round 1). Route: red rework → TEA.

The **production code is correct** — the browser playtest showed real ship-leads motion,
thrust-scrolling and a laser in flight, and the mutations that SHOULD redden do (accel-off,
base-swap, freeze-checks-removed, static-composer, mapInput-all-false). But this story's whole
purpose is to *prove the game animates*, and the tests do not actually guard its two central
claims: they pass on a **frozen sim** and on a **shipless, laserless composer**. That is the
"test apparatus fails by passing" (#18) shape, on the exact seams AC1/AC3 name. Strengthen the
tests; the implementation needs no change (except the tiny still-frame cleanup).

| # | Sev | Finding | Fix | Evidence |
|---|-----|---------|-----|----------|
| 1 | HIGH | `df3-6-shell-wiring.test.ts` can't tell a live loop from a frozen one: its positive `?raw` scans (`stepSim(`/`composeFrame(`/`mapInput(`) are whole-file token matches (#25). Rewriting `main.ts` to step ONCE at boot with a no-op tick callback (game freezes on frame 1) leaves all 9 tests green, and `df3-6-live-sim.test.ts` never imports `main.ts` — nothing catches the static-compose regression the story exists to prevent. | Add a behavioral boot-shell test (centipede `tests/helpers/boot-shell.ts` idiom: boot `src/main.ts` under node with a stubbed DOM + a `window.__sim` tap, drive rAF, assert the sim ADVANCES across frames) — OR anchor the positive guards to the `createLoop` callback bodies. Boot-shell is the robust fix. | test-analyzer, mutation-confirmed |
| 2 | HIGH | `composeFrame`'s ship blit AND laser-draw loop are unguarded: deleting `blitObject(...ship...)` (scene.ts:128) OR the laser loop (scene.ts:130-133) leaves all 14 `df3-6-live-sim.test.ts` tests green — "differs from rest/static" is satisfied by the starfield scroll alone. AC3 requires ship + starfield + lasers rendered. | Isolate the seams with hand-built SimStates: two identical except `ship.x/y` (stars/camera/lasers fixed) → composeFrame digests differ; `lasers:[]` vs one alive laser (else identical) → differ. | test-analyzer, mutation-confirmed |
| 3 | MED | The epic's named riskiest seam (`routing != geometry`) is unguarded: `plaxv24 >> 8` → `plaxv24` in `stepSim` survives — the ship still settles on the correct side of the coarse `0x50` midline (right 55→32, left 89→112). The ship-leads test pins the SIDE, not the COORDINATE. | Tighten to bands around the true settled columns: right ∈ [48,64] (true 55), left ∈ [80,96] (true 89); mutation-test that the width error reddens it. | Reviewer mutation battery + probe (settled x = 55/89 measured) |
| 4 | LOW | `still-frame.test.ts:245` comment claims `mainSourcePath` is "referenced only by df3-6-shell-wiring.test.ts" — false (it's a private const; the other file re-reads via its own `?raw` import). `:247` `void mainSourcePath` is a linter-quieting invented use (#17 + #26). | Delete the now-dead `mainSourcePath` const (line 53) and the comment/`void` block (245-247). | comment_analyzer + rule_checker |
| 5 | LOW (opt) | `catch (e) { (e as Error).message }` casts without narrowing (#1) at `df3-6-input-snapshot.test.ts:56`, `df3-6-live-sim.test.ts:90`; and the input membership fixture can't catch all-actions-bound-to-one-key. | Optional: narrow with `e instanceof Error`; add one distinct-key input case. Non-blocking (established sibling-test idiom / disclosed scope). | rule_checker + test-analyzer |

**Not defects (checked):** purity boundary holds (sim.ts + scene.ts AST-swept, no DOM/clock/
entropy — rule_checker + Reviewer grep); colours by palette index only; `.js` on every relative
import; reuse-first (df3-1..5 imported, not re-derived); the `0x50` band and `[YMIN,239]` clamp
are genuine pins (both mutation-verified by test-analyzer); the Dev vertical-clamp deviation is
ACCEPTED (audited above); `born!.x` is control-flow-safe.

Findings 1-4 are all TEST-domain (coverage/quality + a test-file cleanup) — production code is
sound — so this is a "strengthen the tests" rework for **TEA**, not a code fix for Dev.

## TEA Reassessment (rework, Reviewer round 1)

All five findings closed with test-only changes (no production code touched — it was already
correct). Each new/strengthened guard was mutation-verified: it reddens against the exact
mutant the Reviewer named, then the tree was restored clean.

| # | Sev | Resolution | Mutation proof (reverted after) |
|---|-----|-----------|----------------------------------|
| 1 | HIGH | NEW `df3-6-boot-shell.test.ts` + `tests/helpers/boot-shell.ts`: boots the REAL `main.ts` under node against a stub browser, drives rAF, reads `putImageData` (position-sensitive hash). Asserts thrust changes the drawn frame and rest holds. No `main.ts` change needed (observes the drawn RGBA, not a `window.__sim` tap). | Frozen-sim mutant (stepSim once at boot + no-op tick) → the "thrust changes the drawn frame" test FAILS. Killed. |
| 2 | HIGH | Two isolation tests in `df3-6-live-sim.test.ts`: move ONLY the ship (stars/camera/lasers fixed via a spread of a `createSim` base) → frame differs; `lasers:[]` vs one alive laser → frame differs. | Delete `blitObject(...ship...)` → ship test FAILS; delete the laser-draw loop → laser test FAILS. Both killed (previously all 14 survived). |
| 3 | MED | Tightened the ship-leads assertion from the coarse `0x50` midline to measured coordinate bands: right ∈ [48,64] (true 55), left ∈ [80,96] (true 89). | `plaxv24 >> 8` → `plaxv24` (settles 32/112) → FAILS. Killed (this mutant survived round 1). |
| 4 | LOW | Deleted the dead `mainSourcePath` const and its misleading "referenced only by" comment in `still-frame.test.ts`; the retirement note now correctly points to both the `?raw` and boot-shell coverage. | N/A (dead-code/comment removal; `tsc --noEmit` clean confirms no unused-local). |
| 5 | LOW | Narrowed both `catch (e)` casts to `e instanceof Error ? e.message : String(e)`; added a distinct-key input test (hold only `KeyD` → thrust true, others false). | Distinct-key test would catch all-actions-bound-to-one-key. |

**Verification:** defender 455/455 (was 450; +5), orchestrator 505/505, `npm run lint` clean.
The boot-shell test manipulates `globalThis` but does not leak (full 26-file run green, and the
orchestrator suite is a separate runner). The ROM-fidelity deviation (vertical clamp) stands,
Reviewer-ACCEPTED above.

**Handoff (rework → green).** No implementation work remains — the guards pass against the
correct code and each was proven to fail against its mutant. Dev confirms green; then re-review.

## Dev Reassessment (rework green, round 2)

Confirmed GREEN with **no production change**: `git diff e1fc596e..HEAD --name-only` (since the
round-1 GREEN commit) lists only the five test files TEA touched — the round-1 implementation
(`sim.ts`, `scene.ts`, `shell/input.ts`, `main.ts`) is unchanged and stands. defender 455/455,
`npm run lint` clean. No new design deviations, no new delivery findings. Handing to Reviewer.

## Subagent Results

All received: Yes. Round 2 is a TEST-ONLY rework (diff since the round-1 GREEN commit is five
test files, no production change), so the Reviewer verified it directly — independent preflight
+ an independent mutation battery over the exact mutants round 1 flagged — rather than re-spawning
the full fan-out for a test-only diff. The round-1 subagent run (preflight, test_analyzer,
comment_analyzer, rule_checker + 5 disabled) is recorded under "Subagent Results — round 1".

| # | Subagent | Status | Findings (round 2) |
|---|----------|--------|--------------------|
| 1 | reviewer-preflight (Reviewer, direct) | Complete | defender 455/455, orchestrator 505/505, lint clean, tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled via settings |
| 4 | reviewer-test-analyzer (Reviewer mutation battery) | Complete | all round-1 mutants now KILLED (see verification below) |
| 5 | reviewer-comment-analyzer (Reviewer, direct) | Complete | round-1 comment finding resolved (mainSourcePath const + comment deleted) |
| 6 | reviewer-type-design | Skipped | disabled via settings |
| 7 | reviewer-security | Skipped | disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled via settings (the dead-const #26 is now removed) |
| 9 | reviewer-rule-checker (Reviewer, direct) | Complete | #17/#26 resolved; the two #1 catch-casts narrowed in the df3-6 files |

## Reviewer Assessment

**Verdict: APPROVED** (round 2). Route: finish → SM.

Specialist findings incorporated (enabled subagents; round-1 findings, all now resolved & re-verified):
- **[TEST]** (reviewer-test-analyzer): the two round-1 HIGH vacuity findings — composeFrame's ship
  blit + laser loop unguarded, and the `?raw` wiring passing on a frozen sim — are CLOSED: ship/laser
  isolation tests + a behavioural boot-shell test now redden against those exact mutants. The
  tightened ship-leads bands close the MED plaxv seam. All mutation-verified below.
- **[DOC]** (reviewer-comment-analyzer): the round-1 MEDIUM (misleading `mainSourcePath` "referenced
  only by" comment in still-frame.test.ts) is CLOSED — the dead const and its comment were removed.
- **[RULE]** (reviewer-rule-checker): round-1 #17 + #26 (still-frame.test.ts:245/247) CLOSED with the
  const/comment removal; the two #1 catch-casts in the df3-6 files narrowed to `instanceof`. All other
  applicable rules were PASS in round 1 (purity, colours-by-index, `.js`, reuse) and unchanged.

The round-1 rejection was about TEST vacuity, not broken code, and the rework closed every finding
with test-only changes — independently re-verified by the Reviewer:

- **Preflight (direct):** defender 455/455 (+5 vs round 1), orchestrator 505/505, `npm run lint`
  clean, working tree clean after every probe.
- **Independent mutation battery (the crux — each round-1 mutant must now die):**
  - `blitObject(...ship...)` deleted → the new ship-isolation test FAILS. **Killed** (was surviving).
  - the laser-draw loop deleted → the new laser-isolation test FAILS. **Killed** (was surviving).
  - `plaxv24 >> 8` → `plaxv24` (the epic's named riskiest seam) → the tightened ship-leads bands
    FAIL. **Killed** (this is the mutant that survived round 1).
  - frozen-sim (stepSim once at boot + no-op tick) → `df3-6-boot-shell.test.ts` FAILS. **Killed**
    (the exact regression the `?raw` guards could not see; now caught behaviourally by booting the
    real main.ts and reading its `putImageData` output).
- **LOW findings:** `mainSourcePath` const + its misleading comment removed (lint-clean confirms no
  unused-local); the two df3-6 `catch (e)` casts narrowed to `instanceof`; a distinct-key input test
  added. (The remaining `(e as Error)` casts are in pre-existing sibling test files — a repo-wide
  idiom, out of df3-6 scope.)

**Design deviations:** one (Dev's vertical-clamp → faithful ROM strip `[YMIN,239]`), audited and
**ACCEPTED** in round 1 (stamp retained above). No new deviations in round 2.

**Delivery findings routed to SM (non-blocking, for filing at finish):** Dev's two Improvement
findings — (a) laser streaks drawn at the ship's current row rather than the fire-time row (df3-5's
`Laser` carries no Y), and (b) terrain not camera-scrolled (only the starfield parallax is) — are
legitimate df3-scope-acceptable simplifications, not defects. Recommend SM file a small follow-up
(df4 or a df3 tail story) for the laser-Y fidelity; the terrain scroll is arguably df4+ terrain work.
Neither blocks df3-6.

The story's central claims — the game animates (loop steps the sim), the composer draws the ship and
lasers, the ship-leads coordinate is correct, and no full-screen flash — are now each guarded by a
mutation-killing test, and the live behaviour was confirmed in the browser during GREEN. Approved.

## TEA Assessment (RED)

**RED verified:** `npx vitest run --project defender` → 26 failing (all in the three
new df3-6 files) | 423 passing (no regression) | `npm run lint` (tsc --noEmit) green.
Every failure is a self-describing "not built yet" loader message or a main.ts wiring
assertion — RED for the right reason (seams absent), not a compile/import slip.

**The GREEN contract — the four seams Dev must build (self-describing loaders name each):**
1. `plugins/defender/src/core/sim.ts` — the pure aggregate: `Input { thrust, reverse,
   up, down, fire }`; `createSim(rand: () => number): SimState` (entropy injected, like
   initStars); `stepSim(state, input): SimState` advancing ship (stepVelocityX /
   stepReverse / stepVerticalY), world (slide), stars (stepStars) and lasers
   (scheduler.stepTick) exactly once. Minimal observable SimState the tests read:
   `{ ship: { x, y, facing }, camera, stars, lasers }` — `x` is the on-screen lead
   column, `y` the player row.
2. `plugins/defender/src/core/scene.ts` — add `composeFrame(state, width, height):
   Framebuffer` BESIDE composeStaticFrame; blit starfield + ship + lasers over the
   scrolling world, by palette INDEX only, board dims as arguments (never import shell
   dims — that is a purity violation).
3. `plugins/defender/src/shell/input.ts` — the pure `mapInput(held: KeyMembership):
   Input` (joust idiom) plus the DOM adapter main.ts installs via `@shared/held-keys`.
4. `plugins/defender/src/main.ts` — drive `createLoop` off `@shared/loop` (fixed 60 Hz),
   `mapInput` + `stepSim` each tick, `composeFrame` + `render` each frame; retire the
   bare `requestAnimationFrame`; KEEP `mountCanvas`.

**Test-design notes for Dev/Reviewer:**
- The API NAMES above are TEA's proposed seam, mirroring millipede's `stepGame` aggregate,
  joust's pure `mapInput`, and the existing `composeStaticFrame(width,height)` precedent.
  Dev MAY rename, but a rename means updating these tests — the names are the cheap path,
  and the loaders point to exactly what to build.
- The behavioural tests are BLACK-BOX through `composeFrame` on purpose: the raw
  coordinate maths (slide, clampPlayerY, laser cap, star scroll) are already unit-pinned
  by df3-1..5. df3-6's risk is the WIRING — notably the 24-bit PLAXV vs 16-bit `slide`
  input seam (world.ts:155-156) — which the thrust-advance and ship-leads tests are built
  to catch. `stepSim` must feed `slide` the top 16 bits of the 24-bit accumulator.
- The load-bearing main.ts guard is the NEGATIVE `.not.toMatch(/requestAnimationFrame/)`
  (createLoop owns rAF); the positive scans are secondary on a tiny file (lang-review #25).
- **PLAYTEST half is human-smoke.** AC4/AC5 visual bullets (ship over the MOVING
  starfield, scroll direction, colour by eye) are confirmed at REVIEW with a screenshot
  of `/defender/` vs a nonsense control — mechanically I pinned the vitest analogues
  (dynamic≠static frame; deterministic evolution; no full-screen flash), but the eye
  check is the Reviewer's/owner's.

**Design deviation:** retired the `still-frame.test.ts` guard asserting `main.ts paints
composeStaticFrame(...)` — df3-6 makes main.ts drive the dynamic composer, so that df2-era
mount guard is superseded (mg1-9 "guard whose fate is update"). Its inverted successor
lives in `df3-6-shell-wiring.test.ts`. `composeStaticFrame`'s own correctness/orientation/
colour tests are untouched — the function survives as the transcribed still (a df7 attract
candidate).

## Rule Coverage (lang-review typescript.md)

- **#15 source-text token vs claim / #25 whole-file positive anchor:** the main.ts wiring
  guard's load-bearing assertion is the comment-stripped NEGATIVE (no
  `requestAnimationFrame`); positive scans (`createLoop(`, `stepSim(`, `composeFrame(`,
  `mapInput(`) are secondary on a small file and backed by the behavioural live-sim suite.
- **#18 apparatus fails-by-passing / #26 all-local assertion:** the determinism test
  compares two independent seeded runs (not a self-referential identity); coordinate pins
  read real post-step state; no fixture value doubles as its own expectation.
- **#21 degenerate-but-not-nullish numeric:** colour bound (`≤ 15`) sampled across 90
  ticks of motion; the vertical clamp asserts real row bounds `[43, 238]`.
- **#14 edges computed in one branch:** the reverse→facing flip is pinned at the
  integration level for BOTH facings (right and left), not one arm.
- **#17 comments asserting an un-run mechanism:** the loader messages are runnable
  build-instructions, not stale claims; the accessibility no-flash rule is enforced
  behaviourally (histogram over composed frames), not by a prose grep.
- **AC3 purity:** `plugins/defender/tests/purity.test.ts` AST-sweeps every new
  `src/core/*.ts` (sim.ts, the scene.ts additions) automatically — no DOM/clock/entropy
  import survives. The determinism test is the behavioural backstop.
- Not applicable: React/JSX (#6), async/Promise IO (#7), enums (#3), input-validation
  boundaries (#10) — none in scope for this pure-sim + shell-wiring story.

**Handoff to Dev (Loki Silvertongue), GREEN phase.** Build the four seams above until the
26 tests go green; keep `purity.test.ts` and the 423 existing defender tests green; then
serve locally and screenshot `/defender/` for the visual half (prove whose server answers
5270 first). Watch the PLAXV 24→16 seam.