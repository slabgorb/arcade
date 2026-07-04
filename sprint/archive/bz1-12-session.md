---
story_id: "bz1-12"
jira_key: "bz1-12"
epic: "bz1"
workflow: "tdd"
---
# Story bz1-12: HUD/framing fidelity + live playtest capstone

## Story Details
- **ID:** bz1-12
- **Jira Key:** bz1-12
- **Workflow:** tdd
- **Repos:** battlezone
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T09:39:34Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T08:33:53Z | 2026-07-04T08:35:32Z | 1m 39s |
| red | 2026-07-04T08:35:32Z | 2026-07-04T08:47:53Z | 12m 21s |
| green | 2026-07-04T08:47:53Z | 2026-07-04T09:06:03Z | 18m 10s |
| review | 2026-07-04T09:06:03Z | 2026-07-04T09:18:15Z | 12m 12s |
| red | 2026-07-04T09:18:15Z | 2026-07-04T09:25:11Z | 6m 56s |
| green | 2026-07-04T09:25:11Z | 2026-07-04T09:30:39Z | 5m 28s |
| review | 2026-07-04T09:30:39Z | 2026-07-04T09:39:34Z | 8m 55s |
| finish | 2026-07-04T09:39:34Z | - | - |

## Sm Assessment

**Setup verdict:** Ready for RED. Session + branch built, story context is fully curated.

- **Story:** bz1-12 — HUD/framing fidelity + live playtest capstone (3 pts, p2, `battlezone`).
- **Workflow:** `tdd` (phased) — source of truth is `sprint/epic-bz1.yaml`. The
  `context-story-bz1-12.md` header saying "superpowers" is STALE; TDD governs.
- **Branch:** `feat/bz1-12-hud-framing-fidelity-playtest-capstone` off `develop` in the battlezone subrepo.
- **Jira:** local-only (YAML tracking); Jira claim explicitly skipped per project convention.
- **Merge gate:** clean — no open Battlezone PRs.

**Routing to TEA (RED):** This capstone is two-natured — a render/HUD-fidelity pass
(cracked-glass overlay, gunsight reticle, vector-font score/lives, radar placement,
bichromatic green-world/red-text pass, ROM message-string wiring from bz1-2's dump)
plus a live-playtest checklist that is manual/observational, not unit-testable. TEA
should target the testable surface first: the `core/text.ts` message-string module
(exact ROM strings, cited to bz1-2) and any pure HUD-layout/derivation helpers. The
playtest checklist, deviation logging, and defect-filing are verification-phase
concerns the capstone absorbs — flag anything untestable as such rather than forcing
a vacuous test.

**Watch-outs for downstream:**
- Message strings must match bz1-2's ROM text dump string-for-string — do not paraphrase.
- Feel-tuning during playtest is authority level 3; it must never override a
  bz1-2-sourced ROM constant. Log any applied tuning as a Design Deviation.
- Bugs found in playtest are filed as NEW stories, not fixed inline. Zero unfiled
  defects at close.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes (for the two unit-testable surfaces) — the rest of the capstone
is playtest-verified per the epic ("the shell is verified by running the game").

**Test Files:**
- `battlezone/tests/core/text.test.ts` — pins a new pure `core/text.ts` message-string
  module carrying the ROM roster string-for-string from the gitignored disassembly
  (`reference/rom-quarry/Battlezone.dis65`, English string table @ $7571+), enforcing:
  exact ROM strings (13 roster entries), upper-case-only (the ROM vector font has no
  lowercase glyph), a coin-op ban local to the module (the `screens.test.ts` sweep does
  not cover `core/text.ts`), and no drift between `core/screens.ts` and the canonical roster.
- `battlezone/tests/shell/hud-palette.test.ts` — pins the bichromatic split behaviourally
  via a recording mock 2D context: `drawScore` paints red-dominant; the wireframe world
  (`drawSegments`) and radar chrome (`drawRadar`) stay green-dominant.

**Tests Written:** 20 tests (13 roster + 3 font/descope + 3 anti-drift in text.test.ts;
4 in hud-palette.test.ts) covering AC-2 (message strings) and AC-3 (bichromatic).
**Status:** RED — verified by `testing-runner` (run `bz1-12-tea-red`): 2 files fail /
625 pre-existing tests still green. `text.test.ts` fails at module-load (core/text.ts
absent — the intended house RED signal); `hud-palette.test.ts` fails 2 (score still
green #33ff66) / passes 2 (world-green guards). No collateral damage.

### Rule Coverage

The TypeScript lang-review checklist is largely a **Dev GREEN-phase** self-review
(implementation type-safety). The RED-phase-applicable checks and how they are covered:

| Rule (typescript.md) | Coverage | Status |
|----------------------|----------|--------|
| #8 test-quality — no vacuous assertions | Self-checked every test; all assert real values (no `let _ =`, no `assert(true)`, no always-None). Guard assertions gate on non-empty paint arrays. | pass |
| #8 test-quality — no `as any` in tests | Zero `as any`. One `as unknown as CanvasRenderingContext2D` mock cast — logged as a deviation (accepted canvas-mock pattern). | pass (noted) |
| #2 missing `readonly` on immutable data | `core/text.ts` MESSAGES is ROM-fixed data → Dev must make it `readonly`/`as const` (GREEN-phase design note; not runtime-testable). | deferred to Dev |
| #5 `.js` extension in relative imports | N/A — this project uses bundler resolution and omits `.js` everywhere (`screens.test.ts` et al.); my imports match the house convention. | n/a |
| #10 input-validation / #6 React / #7 async / #11 error-handling / #12 perf | Not applicable — `core/text.ts` is pure string constants; the render contract is synchronous canvas painting. No user input, no async, no JSX. | n/a |

**Domain rules enforced beyond the generic checklist:** ROM-font charset (upper-case
only), coin-op descope (module-local ban), and the "string-for-string, not paraphrased"
AC (exact-value membership). These matter more than generic TS checks for a string-data
surface.

**Rules checked:** 5 of 13 lang-review checks are applicable at RED; the rest are
GREEN-phase Dev implementation concerns.
**Self-check:** 0 vacuous tests written; 0 pre-existing vacuous tests found in the two
files' neighbourhood.

**Handoff:** To Dev (The Word Burgers) for GREEN — create `core/text.ts` from the
disassembly roster, apply the bichromatic red-score pass, and wire the message display
(see the Delivery Findings gap: triggers exist as state but no message-emit path does).

### Round-Trip 1 (RED rework — after Immortan Joe's REJECTED review)

**New/changed tests (verified RED — run `bz1-12-tea-red-rework`: only `alerts.test.ts`
fails on module-load; 651 other tests green):**
- `tests/core/alerts.test.ts` (NEW) — pins the fix for the blocking review finding: the
  alert DECISION must move out of `main.ts` (untestable — its import runs DOM/rAF bootstrap)
  into a side-effect-free `core/alerts.ts` exporting `inGameAlert(input, prevPose, game)` +
  `ENEMY_ALERT_RANGE`. 11 tests cover every branch: motion-blocked (fires / moved-so-no /
  rotate-only-no), enemy-in-range (dead-ahead / off-cone / behind / beyond-range / range
  boundary strict-`<` / not-alive), the tie-break (block wins), and the null default.
- `tests/core/text.test.ts` — the two vacuous tests are fixed (board-header now drives
  `attractLines(populatedTable)`; game-over drops the self-referential assertion for a
  hard-coded ROM literal); the roster is relabelled a verbatim-transcription contract with an
  honest WIRED-vs-RESERVED note (no more implied completeness); truncated description fixed.
- `tests/shell/hud-palette.test.ts` — added the missing `drawMessage` red-HUD guard;
  repurposed the redundant test into a colour-override check.

**GREEN contract for Dev this round:**
1. Create `core/alerts.ts` with `inGameAlert` + `ENEMY_ALERT_RANGE` (move the logic +
   `ENEMY_RANGE`/`AIM_COS` out of `main.ts`); `main.ts` imports and calls it (delete the
   inline copy). Pure core, no DOM — mirrors `core/screens.ts`.
2. Roster (Reviewer finding #2, non-blocking): the 7 RESERVED strings (HIGH_SCORE,
   GREAT_SCORE, BONUS_TANK_AT, ENEMY_TO/LEFT/RIGHT/REAR) stay as verbatim ROM data —
   the test no longer claims they render. Wiring them is a follow-up story, not this round.
3. Cosmetic: fix the `main.ts` comment "AIM_CONE" → `AIM_COS`.

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes (all code ACs); the full live playtest (AC-4/AC-6)
remains a manual step — see the blocking delivery finding.

**Files Changed:**
- `battlezone/src/core/text.ts` (new) — `MESSAGES`, the ROM message roster transcribed
  verbatim from the disassembly ($7571+) into committed pure core, `as const` (readonly),
  upper-case, coin-op-free. Cited to the quarry.
- `battlezone/src/core/screens.ts` — attract board header / prompt / game-over verdict now
  draw from `MESSAGES` (single source of truth; no drift).
- `battlezone/src/shell/render.ts` — `HUD_RED` constant; `drawScore` defaults to it
  (bichromatic red score); new `drawHorizonBand` (green-tinted horizon gel), `drawCrackedGlass`
  (shattered-windshield overlay), `drawMessage` (red in-game alert).
- `battlezone/src/main.ts` — wires the horizon band + cracked glass every frame, and, in
  playing mode, the ROM alerts via `inGameMessage()` (MOTION BLOCKED / ENEMY IN RANGE
  derived from existing state — the movement hard-stop and hostile gunsight alignment; no
  new core/sim logic). `ENEMY_RANGE`/`AIM_COS` are feel constants (authority 3).

**AC status:**
- AC-1 (cracked-glass/reticle/HUD render): cracked-glass overlay ADDED; reticle (bz1-5) &
  radar/score/lives HUD present. The documented reference-footage COMPARISON is part of the
  live playtest (deferred, see finding).
- AC-2 (ROM message strings): DONE — `core/text.ts` verbatim, tested string-for-string;
  in-game alerts wired.
- AC-3 (bichromatic): DONE — green world/radar + green horizon band + red score.
- AC-4 (full playtest, both surfaces): dev-server SMOKE test only (attract validated); full
  playthrough + live-tunnel run remain manual (deviation + blocking finding logged).
- AC-5 (feel-tuning logged): DONE — all feel constants/geometry logged as deviations.
- AC-6 (zero unfiled defects): pending the full playtest.
- AC-7 (build clean + tests green): DONE — `tsc && vite build` clean; 650/650 tests green.

**Tests:** 650/650 passing (GREEN) — verified by `testing-runner` (run `bz1-12-dev-green`);
the two previously-RED files pass, no regressions, `core/text.ts` clears the purity sweeps.
**Build:** `npm run build` (`tsc --noEmit && vite build`) clean.
**Smoke test:** dev-server :5276 (this checkout is live), attract mode — red score, green
horizon band, cracked-glass overlay, radar, green world all render; ZERO console errors.
Screenshots in the session scratchpad.
**Branch:** `feat/bz1-12-hud-framing-fidelity-playtest-capstone` (pushed to origin).

**Handoff:** To Reviewer (Immortan Joe) for code review. Flag for review/finish: the full
two-surface live playtest (AC-4/AC-6) is the remaining manual capstone verification.

### Round-Trip 1 (GREEN rework — addressing the REJECTED review)

**Files changed this round:**
- `battlezone/src/core/alerts.ts` (new) — pure `inGameAlert(input, prevPose, game)` +
  exported `ENEMY_ALERT_RANGE`. The alert decision moved out of `main.ts`'s DOM/rAF bootstrap
  into side-effect-free core (mirrors `core/screens.ts`) — now unit-testable, 11 branch tests.
- `battlezone/src/main.ts` — imports + calls `inGameAlert`; the inline `inGameMessage` and its
  `ENEMY_RANGE`/`AIM_COS` constants deleted; the now-unused `camera`/`state`/`input`/`text`
  imports pruned; the "AIM_CONE" comment nit removed with the block.

**Review findings resolved:**
- [MEDIUM][TEST] `inGameMessage` untested + unimportable → **FIXED**: extracted to
  `core/alerts.ts`, 11 branch tests green (motion-blocked, cone, range boundary, not-alive,
  tie-break, null).
- [MEDIUM][TEST] roster overstates completeness → **ADDRESSED**: `text.test.ts` relabelled a
  verbatim-transcription contract (WIRED vs RESERVED); the 7 RESERVED strings' wiring is a
  filed follow-up gap (non-blocking), not this capstone.
- [LOW][TEST] two vacuous tests → **FIXED** (board-header drives the producer; game-over uses
  a hard literal). [LOW][TEST] `drawMessage` red-HUD → **FIXED** (guard added). [LOW][DOC]
  truncated description + "AIM_CONE" comment → **FIXED**.
- [RULE] `as unknown as` mock cast → ACCEPTED as disclosed by Reviewer; unchanged.

**Behaviour:** unchanged — `inGameAlert` is a byte-for-byte move of the prior decision, so the
earlier attract smoke test (red score, green horizon band, cracked glass, radar) still holds.
**Tests:** 666/666 green (run `bz1-12-dev-green-rework`); purity sweeps confirm `alerts.ts` pure.
**Build:** `tsc --noEmit && vite build` clean (30 modules).
**Branch:** `feat/bz1-12-hud-framing-fidelity-playtest-capstone` (pushed, `432d3db`).

**Handoff:** To Reviewer for re-review. The BLOCKING manual item is unchanged: the full
two-surface live playtest (AC-4/AC-6) + reference-footage comparison (AC-1) must run before finish.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The story assumes the in-game message triggers "earlier
  stories already implemented," but `core/events.ts` emits no `enemy-in-range` or
  `motion-blocked` event kind, and there is no in-game transient-message renderer —
  only the attract/game-over overlays in `core/screens.ts`. The trigger CONDITIONS
  do exist (`core/movement.ts` `isBlocked()` + `stepTank`'s hard-stop; enemy range is
  derivable from `core/radar.ts` / `deriveRadar`), but nothing surfaces them as a
  displayable message. Affects `battlezone/src/core/events.ts` (add the message kinds
  or a derivation) + a new shell message-render path (Dev must wire "ENEMY IN RANGE" /
  "MOTION BLOCKED BY OBJECT" to actually appear during play). My `text.ts` tests pin
  the STRINGS; the DISPLAY wiring is only playtest-verifiable — covered by the
  live-playtest AC, not a unit test. *Found by TEA during test design.*
- **Question** (non-blocking): The bichromatic "red score/HUD text" contract is pinned
  behaviourally as `drawScore`'s default painting red-dominant. If Dev prefers to keep
  `drawScore` colour-agnostic and apply red at the call site (`src/main.ts`),
  `tests/shell/hud-palette.test.ts` needs a matching adjustment + a logged deviation.
  Affects `battlezone/src/shell/render.ts` (`drawScore` colour home). *Found by TEA during test design.*
- **Improvement** (non-blocking): The coin-op source-literal sweep in
  `tests/core/screens.test.ts` (`auditFiles()`) covers `shell/*`, `main.ts`, and
  `core/screens.ts` but NOT the new `core/text.ts`. I added a coin-op ban directly in
  `tests/core/text.test.ts`, but the swept-directory audit would be more future-proof if
  extended to include `core/text.ts`. Affects `battlezone/tests/core/screens.test.ts`
  (`auditFiles`). *Found by TEA during test design.*
- Round-trip 1: No new upstream findings — this pass addresses Immortan Joe's review
  findings (extract `inGameAlert` to testable core; fix the two vacuous tests; add the
  `drawMessage` guard). *Found by TEA during test design (rework).*

### Dev (implementation)
- **Gap** (blocking): The full live playtest is NOT done — only a dev-server attract-mode
  smoke test ran. The attract→slow-tank→missile→super-tank→saucer→game-over→high-score
  playthrough on BOTH :5276 and the live tunnel (AC-4), the reference-footage comparison
  (AC-1 doc), and defect-filing (AC-6) remain the capstone's manual verification. Affects
  the story close — a human/SM must run it before finish and file any surfaced bug as a
  NEW story, cross-referenced here (`sprint/`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): The dev smoke screenshot showed the cracked-glass cracks
  read as fairly busy/prominent over the demo battlefield. Density/opacity is a feel call
  (authority 3) best tuned during the live playtest. Affects
  `battlezone/src/shell/render.ts` (`CRACK_PATHS`, `drawCrackedGlass` shadowBlur/lineWidth).
  *Found by Dev during implementation.*
- **Question** (non-blocking): TEA's Question (should the bichromatic red live in
  `drawScore`'s default vs the call site) was resolved by making `HUD_RED` the `drawScore`
  default — `main.ts` calls `drawScore` with no colour override, so the score is red in all
  modes with no call-site change. `tests/shell/hud-palette.test.ts` passes unchanged.
  Affects `battlezone/src/shell/render.ts`. *Found by Dev during implementation.*
- Round-trip 1 — **Gap** (non-blocking): 7 RESERVED ROM strings (HIGH_SCORE, GREAT_SCORE,
  BONUS_TANK_AT, ENEMY_TO/LEFT/RIGHT/REAR) sit in `core/text.ts` verbatim but have no display
  surface yet; wiring them (extra-tank banner, high-score achievement, in-game HIGH SCORE label,
  direction callout) is deferred to a follow-up story. Affects `battlezone/src/core/text.ts`.
  *Found by Dev during implementation (rework).*

### Reviewer (code review)
- **Gap** (blocking-for-rework): `inGameMessage` in `main.ts` is pure branching logic
  (motion-blocked tie-break, `AIM_COS` cone edge, `ENEMY_RANGE` edge, null/not-alive paths)
  with ZERO test coverage, and it is not exported so it cannot be unit-tested as-is. Affects
  `battlezone/src/main.ts` (export it, or move the pure decision to `core/`) + a new test.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): 7 of 13 `MESSAGES` (HIGH_SCORE, GREAT_SCORE, BONUS_TANK_AT,
  ENEMY_TO, LEFT, RIGHT, REAR) are declared and asserted-present by `text.test.ts` but no
  render path uses them — the roster test implies a completeness the game lacks. Affects
  `battlezone/src/core/text.ts` (wire the strings to real display surfaces, or descope them
  with a comment + a follow-up story). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): two weak tests in `tests/core/text.test.ts` — line ~117
  ("board header canonical") never calls `attractLines(tableWithEntries)`, just re-checks
  membership; line ~107's first assertion is self-referential (screens imports the same
  MESSAGES). Affects `battlezone/tests/core/text.test.ts`. *Found by Reviewer during code review.*
- Round-trip 1 (re-review) — the 3 prior findings above are RESOLVED. Three NEW **non-blocking**
  test-strengthening opportunities (LOW severity; the impl is verified correct — these harden
  already-passing coverage, not fix bugs):
  - **Improvement** (non-blocking): `tests/core/alerts.test.ts:60` asserts `.not.toBe(MOTION_BLOCKED)`
    where the deterministic result is `null` — `.toBeNull()` would fully pin "movement succeeded →
    no alert". Affects `battlezone/tests/core/alerts.test.ts`. *Found by Reviewer during code review.*
  - **Gap** (non-blocking): `tests/core/alerts.test.ts` pins the RANGE boundary (strict `<`) but not
    the AIM-CONE edge (strict `>` on AIM_COS) — a just-inside/just-outside ~9° bearing case would
    mirror it. Feel-gated alert (authority 3), so LOW. Affects `battlezone/tests/core/alerts.test.ts`.
    *Found by Reviewer during code review.*
  - **Gap** (non-blocking): `text.test.ts` labels SCORE "WIRED … exercised elsewhere" but no test
    drives `gameOverLines(nonzeroScore)` to check the `${SCORE} n` line renders (GAME OVER/PRESS
    START/HIGH SCORES are producer-driven; SCORE isn't). Affects `battlezone/tests/core/text.test.ts`.
    *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

8 deviations

- **Canvas render geometry left to the live playtest, not unit-tested**
  - Rationale: The epic rules the shell is "verified by running the game"; canvas
  - Severity: minor
  - Forward impact: Dev/Reviewer verify placement via the live-playtest checklist and
- **Bichromatic coverage limited to score-red + world-green; horizon band not unit-tested**
  - Rationale: The horizon band is a shell/`horizon` render concern with no pure return
  - Severity: minor
  - Forward impact: Horizon-band tint verified in the live playtest (AC-4).
- **ROM roster scoped to in-play strings; coin-op and initials-entry instructions excluded**
  - Rationale: The epic's coin-op descope and controller abstraction mean those ROM
  - Severity: minor
  - Forward impact: If Dev finds a real surface for an excluded string (e.g. an
- **One `as unknown as CanvasRenderingContext2D` cast in the render mock**
  - Rationale: `CanvasRenderingContext2D` has 100+ members; a structural mock is
  - Severity: minor
  - Forward impact: none — test-only; no runtime type risk.
- **Cracked-glass overlay and horizon band are AUTHORED + feel-tuned, not quarried**
  - Rationale: The disassembly quarry holds no windshield/horizon PICTURE data (same
  - Severity: minor
  - Forward impact: Placement/density is playtest-tunable; a follow-up may refine it
- **In-game alert triggers derived in the SHELL, not via new core event kinds**
  - Rationale: TEA's finding confirmed the trigger CONDITIONS exist as state but are not
  - Severity: minor
  - Forward impact: If the playtest wants authentic left/right/rear direction callouts
- **Volcano eruption animation not implemented (deferred from bz1-3, remains deferred)**
  - Rationale: Eruption animation needs dt/RNG plumbing in the SIM (core), not a render-only
  - Severity: minor
  - Forward impact: Candidate follow-up story if the playtest deems the static volcano a
- **Live playtest done as a dev-server SMOKE test, not the full two-surface playthrough**
  - Rationale: The full playthrough on both surfaces + the reference-footage comparison
  - Severity: major
  - Forward impact: The human/SM must run the full two-surface playtest before the story

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Canvas render geometry left to the live playtest, not unit-tested**
  - Spec source: context-story-bz1-12.md, AC-1 ("Cracked-glass viewport overlay,
    gunsight reticle, and HUD ... render per the bz1-2 references/footage, with the
    comparison documented")
  - Spec text: "render per the bz1-2 findings/quarry's references/footage, with the
    comparison documented (what was compared, verdict) in the session file"
  - Implementation: No unit tests for the cracked-glass overlay, reticle geometry, or
    radar/score PIXEL placement. Only the message strings (`text.test.ts`) and the
    colour split (`hud-palette.test.ts`) are unit-tested.
  - Rationale: The epic rules the shell is "verified by running the game"; canvas
    geometry/placement is playtest + eyeball territory. A pixel-coordinate assertion
    would be implementation-coupled and vacuous. The AC's comparison is satisfied by the
    documented playtest, not a unit test.
  - Severity: minor
  - Forward impact: Dev/Reviewer verify placement via the live-playtest checklist and
    the recorded reference comparison (AC-1, AC-4), not the suite.
- **Bichromatic coverage limited to score-red + world-green; horizon band not unit-tested**
  - Spec source: context-story-bz1-12.md, AC-3 ("green wireframe world/HUD with a
    green-tinted horizon overlay band and red score/HUD text")
  - Spec text: "a green-tinted horizon overlay band and red score/HUD text"
  - Implementation: `hud-palette.test.ts` pins score→red and world/radar→green, but does
    NOT assert the green-tinted horizon overlay band.
  - Rationale: The horizon band is a shell/`horizon` render concern with no pure return
    value to assert against; its tint is a playtest/eyeball check like the rest of the
    canvas chrome. Pinning score-red vs world-green captures the load-bearing, testable
    half of the bichromatic split.
  - Severity: minor
  - Forward impact: Horizon-band tint verified in the live playtest (AC-4).
- **ROM roster scoped to in-play strings; coin-op and initials-entry instructions excluded**
  - Spec source: context-story-bz1-12.md, AC-2 ("In-game message strings ... and the
    rest ... match the ROM text-string dump ... spot-checked string-for-string")
  - Spec text: "In-game message strings (\"ENEMY IN RANGE,\" \"MOTION BLOCKED BY
    OBJECT,\" and the rest) match the ROM text-string dump ... rather than paraphrased"
  - Implementation: The required roster covers the AC-named + implemented-surface strings.
    Excluded: the coin-op roster ('INSERT COIN', '  COIN    PLAY' — descoped, banned by
    test) and the initials-entry instructions ('ENTER YOUR INITIALS', 'CHANGE LETTER
    WITH RIGHT HAND CONTROLLER', 'SELECT LETTER WITH FIRE BUTTON' — cabinet-hardware
    specific; controls are abstracted and bz1-10's attract auto-confirms initials) plus
    the attract copyright line.
  - Rationale: The epic's coin-op descope and controller abstraction mean those ROM
    strings have no faithful display surface here; requiring them would force unused,
    misleading constants. In-scope strings are pinned string-for-string.
  - Severity: minor
  - Forward impact: If Dev finds a real surface for an excluded string (e.g. an
    initials-entry screen), add it to `core/text.ts` verbatim + note it; do not paraphrase.
- **One `as unknown as CanvasRenderingContext2D` cast in the render mock**
  - Spec source: .pennyfarthing/gates/lang-review/typescript.md, check #1 (type-safety
    escapes) / #8 (test quality)
  - Spec text: "`as unknown as T` — double-cast bypass, almost always wrong"
  - Implementation: `hud-palette.test.ts`'s recording context stub is cast
    `as unknown as CanvasRenderingContext2D` to satisfy the render functions' parameter type.
  - Rationale: `CanvasRenderingContext2D` has 100+ members; a structural mock is
    impractical, and this is the standard, accepted canvas-mock pattern for tests (not a
    production type escape). The stub implements exactly the members the render functions
    touch. Documented so the Reviewer reads it as intentional.
  - Severity: minor
  - Forward impact: none — test-only; no runtime type risk.
- **Round-trip 1: no NEW spec deviations.** The `inGameMessage` → `core/alerts.ts`
  extraction is a review-driven DESIGN improvement (pure decision logic belongs in
  testable core, mirroring `core/screens.ts`), not a divergence from the story spec. The
  RESERVED roster strings remain verbatim ROM data (TEA #3 already covered the scoping);
  their wiring is a follow-up, not a spec change.

### Dev (implementation)
- **Cracked-glass overlay and horizon band are AUTHORED + feel-tuned, not quarried**
  - Spec source: context-story-bz1-12.md, AC-1 / AC-3
  - Spec text: "Cracked-glass viewport overlay ... render per the bz1-2
    findings/quarry's references/footage" / "a green-tinted horizon overlay band"
  - Implementation: `render.ts` `CRACK_PATHS` (two impact stars, 8 jagged crack
    polylines) and `drawHorizonBand` (a low-alpha green gel at NDC y=0) are hand-authored
    against footage/feel, scaled to the viewport.
  - Rationale: The disassembly quarry holds no windshield/horizon PICTURE data (same
    basis core/horizon.ts records for its authored PANORAMA — the ROM stored the
    shattered-windshield as VJSR vector ops, not a coordinate table we transcribe). Exact
    density/opacity/placement is feel (authority level 3), tuned in the live playtest.
  - Severity: minor
  - Forward impact: Placement/density is playtest-tunable; a follow-up may refine it
    against captured footage. The dev smoke screenshot showed the cracks read as busy over
    the demo world — a candidate tuning note for the playtest.
- **In-game alert triggers derived in the SHELL, not via new core event kinds**
  - Spec source: context-story-bz1-12.md, AC-2 (Technical Approach: "render them at the
    trigger conditions earlier stories already implemented ... not new trigger logic")
  - Spec text: "render them at the trigger conditions earlier stories already implemented"
  - Implementation: `main.ts` `inGameMessage()` derives MOTION BLOCKED (translation intent
    + zero displacement after the bz1-4 movement hard-stop) and ENEMY IN RANGE (hostile
    gunsight-aligned within AIM_COS and nearer than ENEMY_RANGE) from existing state — no
    new `core/events.ts` kind, no core change.
  - Rationale: TEA's finding confirmed the trigger CONDITIONS exist as state but are not
    emitted as signals. Deriving them shell-side honours the story's "no new sim/trigger
    logic" scope and the core/shell boundary (display is shell). ENEMY_RANGE (20000 world
    units) and AIM_COS (~9° cone) are FEEL constants (authority 3) — they gate an alert
    string, never a ROM-sourced sim value — so they are playtest-tunable, not quarry-pinned.
  - Severity: minor
  - Forward impact: If the playtest wants authentic left/right/rear direction callouts
    ('ENEMY TO ' + LEFT/RIGHT/REAR are already in core/text.ts), a follow-up wires them;
    the strings are ready.
- **Volcano eruption animation not implemented (deferred from bz1-3, remains deferred)**
  - Spec source: sprint/context/context-story-bz1-3.md / core/horizon.ts header ("eruption
    animation is deferred to bz1-12")
  - Spec text: "volcano eruption animation ... deferred to bz1-12"
  - Implementation: The volcano still ships as the bz1-3 static silhouette; no eruption
    animation was added.
  - Rationale: Eruption animation needs dt/RNG plumbing in the SIM (core), not a render-only
    change — it is out of scope for this HUD/framing render pass, and this capstone's charter
    is framing fidelity + playtest, not new sim mechanics (epic descope: no new gameplay
    mechanics). Gold-plating deep-background animation nobody's asked for is out of scope.
  - Severity: minor
  - Forward impact: Candidate follow-up story if the playtest deems the static volcano a
    fidelity gap; not a defect (the silhouette is present and correct).
- **Live playtest done as a dev-server SMOKE test, not the full two-surface playthrough**
  - Spec source: context-story-bz1-12.md, AC-4 / AC-1 (comparison documented) / AC-6
  - Spec text: "attract → slow tank → missile ... → super tank → saucer → game over → high
    score recorded — is executed ... for BOTH the dev server (:5276) and the live tunnel"
  - Implementation: I ran a read-only smoke test on the already-running :5276 dev server
    (this checkout is live) — attract mode validated the red score, green horizon band,
    cracked-glass overlay, radar, and green world with zero console errors (screenshots in
    the session scratchpad). I did NOT drive the full attract→roster→game-over→high-score
    playthrough, nor the live-tunnel run; synthetic Enter did not latch a run in headless
    Playwright (focus/trust), and driving the full roster + the prod tunnel is an
    interactive/human step I won't automate against the live cabinet.
  - Rationale: The full playthrough on both surfaces + the reference-footage comparison
    (AC-1 doc) + defect-filing (AC-6) are the capstone's MANUAL verification, best run by a
    human on the live cabinet (prod-safety: I won't hijack the pinned tunnel ports). The
    code side of every AC is complete and the framing is smoke-validated.
  - Severity: major
  - Forward impact: The human/SM must run the full two-surface playtest before the story
    truly closes (AC-4/AC-6); any bug it surfaces is filed as a NEW story per the capstone
    convention, cross-referenced here. Flagged as a blocking delivery finding below.
- **Round-trip 1: no NEW spec deviations.** Extracting `inGameMessage` →
  `core/alerts.ts::inGameAlert` (with `ENEMY_RANGE`/`AIM_COS` → `ENEMY_ALERT_RANGE`/`AIM_COS`)
  is a behaviour-preserving refactor addressing the review finding — the decision is byte-for-byte
  the same, only its home changed (untestable shell bootstrap → pure testable core). The 7
  RESERVED roster strings are intentionally left unwired this round (Reviewer #2 non-blocking →
  a follow-up story), not a spec divergence.

### Reviewer (audit)
- TEA #1 (canvas geometry left to playtest) → ✓ ACCEPTED: consistent with the epic's
  "shell verified by running the game" ruling; canvas placement is not unit-testable.
- TEA #2 (bichromatic limited to score-red + world-green; horizon band not unit-tested)
  → ✓ ACCEPTED: the testable colour split is pinned; the band is a render/feel concern.
- TEA #3 (ROM roster scoped; coin-op + initials-entry excluded) → ✓ ACCEPTED as to the
  DATA scoping — BUT see Reviewer finding: Dev included 7 roster strings in core/text.ts
  that no render path uses, so the roster tests imply a completeness the game lacks. The
  deviation is sound; the *unwired* strings are the problem, addressed as a finding.
- TEA #4 (`as unknown as CanvasRenderingContext2D` mock cast) → ✓ ACCEPTED: disclosed,
  pragmatic canvas-mock pattern; rule-checker confirms it's the only rule violation and a
  reasonable trade-off. The color-capture-at-call-time technique is faithful to Canvas2D.
- Dev #1 (cracked-glass/horizon authored + feel-tuned) → ✓ ACCEPTED: the quarry has no
  windshield picture data; authored-against-footage matches core/horizon.ts precedent.
- Dev #2 (in-game triggers derived in shell, not new core events) → ✓ ACCEPTED as an
  approach — but FLAGGED for coverage: `inGameMessage` is PURE branching logic (tie-break,
  aim-cone, range thresholds) left untested and unexported. See Reviewer finding [TEST-1].
- Dev #3 (volcano eruption not implemented) → ✓ ACCEPTED: it needs sim/RNG plumbing, out
  of scope for a render-only framing pass; correct descope.
- Dev #4 (live playtest = smoke test only) → ✓ ACCEPTED as accurately logged, and
  REINFORCED as BLOCKING for finish: the full two-surface playtest (AC-4/AC-6) + the
  reference-footage comparison (AC-1 doc) must run before the story can close.
- Round-trip 1 — TEA "no new spec deviations" + Dev "no new spec deviations" (the
  `inGameAlert` extraction is a behaviour-preserving refactor) → ✓ ACCEPTED: verified byte-for-byte
  equivalent logic, purity intact (security + rule-checker + core-purity-sweep all confirm). The
  reserved-roster note (7 strings deferred to a follow-up) is sound and consistent with TEA #3.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (build/lint/tests green, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 5, dismissed 0, deferred 2 (folded into 2 findings) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (I checked comments myself — see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (rule-checker #1/#2 covered type escapes) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (the mock cast, rules #1/#8) | confirmed 1 (accepted as disclosed deviation) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 4 confirmed for the verdict, 0 dismissed, plus 1 accepted-disclosed (mock cast)

## Reviewer Assessment

**Verdict:** REJECTED

The change is correct, secure, and green — but it erodes test quality in ways an adversarial
pass must not wave through: new decision logic ships untested and unimportable, two tests are
vacuous/self-referential, and the message-roster tests imply a completeness the game does not
have. None of this is a Critical/High *bug*, but the fixes are small and the story is already
blocked on the manual playtest, so there is zero schedule cost to trueing it up now. Do not
become addicted to passing tests.

**Data flow traced:** the one string sink is `drawMessage → ctx.fillText`; its only feed is
`inGameMessage()`, which returns `MESSAGES.MOTION_BLOCKED | MESSAGES.ENEMY_IN_RANGE | null` —
all frozen ROM constants. No user input reaches a sink. `entry.name` in `screens.ts` is
pre-existing and reaches Canvas `fillText` (a bitmap sink, not an HTML/DOM sink → no XSS).
**Pattern observed:** correct core/shell split preserved — `core/text.ts` is pure data
(`as const`, zero imports); render lives in shell; the one leak is *pure decision logic*
(`inGameMessage`) sitting in `main.ts` untested. **Error handling:** N/A (no async/IO/throw
paths added); numeric guards correct (`range > 0` before divide, strict `!== null`).

### Findings (blocking the approval, most-severe first)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[TEST]` | `inGameMessage` — new pure branching logic (motion-blocked tie-break, `AIM_COS` cone edge, `ENEMY_RANGE` edge, null / hostile-not-'alive') has ZERO tests and isn't exported, so it can't be unit-tested | `src/main.ts:57-81` | Export `inGameMessage` (or move the pure decision into `core/`); add a unit-test table: no-condition, motion-blocked only, enemy-in-range only, both (tie-break), just-inside/just-outside the range and cone boundaries, hostile not alive |
| [MEDIUM] `[TEST]` | 7 of 13 `MESSAGES` (HIGH_SCORE, GREAT_SCORE, BONUS_TANK_AT, ENEMY_TO, LEFT, RIGHT, REAR) are asserted-present but wired to NO render path — the roster test implies a completeness the game lacks | `src/core/text.ts` / `tests/core/text.test.ts` | Wire the strings to real display surfaces (extra-tank award banner, high-score achievement, in-game HIGH SCORE label, direction callout), OR descope the unwired keys with a comment + file a follow-up story so the roster test stops overstating coverage |
| [LOW] `[TEST]` | Two weak tests: `text.test.ts:~117` re-checks `values.toContain('HIGH SCORES')` (never calls `attractLines(tableWithEntries)`); `:~107` first assertion is self-referential (screens imports the same `MESSAGES`) | `tests/core/text.test.ts` | Make ~117 call `attractLines(SAMPLE_TABLE)` and assert the header renders; drop/replace ~107's tautological line |
| [LOW] `[TEST]` | `drawMessage`'s red-HUD default (`HUD_RED`) has no test — reverting it to green would pass unnoticed; consistent with the existing `drawScore` colour test | `tests/shell/hud-palette.test.ts` | Add a `drawMessage` case mirroring the `drawScore` red-dominant assertion |
| [LOW] `[DOC]` | `text.test.ts:~457` test description is truncated ("...enforced here — the"); `main.ts:137` comment says "AIM_CONE" but the constant is `AIM_COS` | `tests/core/text.test.ts`, `src/main.ts` | Finish the description; fix the comment name |

### Dispatch tags (all specialists accounted for)

- `[TEST]` (reviewer-test-analyzer) — CONFIRMED: findings above. The mock's colour-capture-at-paint-time is faithful to Canvas2D (not a false-positive source); gaps are coverage, not technique.
- `[RULE]` (reviewer-rule-checker) — 1 violation: the `as unknown as CanvasRenderingContext2D` mock cast (`hud-palette.test.ts:~90`, rules #1/#8). ACCEPTED as a disclosed TEA/Dev deviation — pragmatic canvas mock, no better option; NOT a blocker. 60/61 other instances compliant (purity, `as const`, `import type`, `.js`-omission-by-convention, coin-op ban all pass).
- `[SEC]` (reviewer-security) — CLEAN: core/shell purity intact, no secrets, no XSS (fillText fed only ROM constants), no eval/innerHTML/storage/network added.
- `[DOC]` (comment-analyzer DISABLED — I checked myself) — 2 minor doc nits (LOW finding above); the substantive comments (ROM citations, NDC-y note) are accurate.
- `[EDGE]` (reviewer-edge-hunter) — DISABLED. I traced the boundaries myself: `moved < 1e-3` correctly matches `stepTank`'s exact hard-stop; the enemy-in-range edge/range thresholds are the untested boundaries captured in `[TEST]` finding #1.
- `[SILENT]` (reviewer-silent-failure-hunter) — DISABLED. No new catch/fallback/error paths in the diff; `inGameMessage` returns `null` explicitly, handled with `!== null`. No swallowed errors.
- `[TYPE]` (reviewer-type-design DISABLED — rule-checker covered) — no type escapes in production code; `MESSAGES as const`, `CRACK_PATHS` fully-readonly, `import type` correct. Only the test mock cast (see `[RULE]`).
- `[SIMPLE]` (reviewer-simplifier) — DISABLED. No over-engineering spotted; one redundant test assertion noted under `[TEST]` (hud-palette `:~106`).

### Rule Compliance

TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) + epic invariants, enumerated by rule-checker across 61 instances:
- #1 type-safety escapes: 1 violation — test mock cast (accepted, disclosed). Production code clean.
- #2 generic/interface (readonly): PASS — `MESSAGES as const`, `CRACK_PATHS` explicit deep-readonly.
- #4 null/undefined: PASS — `!== null`, guarded divide, no `||`-on-falsy.
- #5 module/`import type`/`.js`: PASS — `export type MessageKey`, inline `type` modifiers; `.js` omission is correct under `moduleResolution: bundler` (NOT a violation — verified project-wide).
- #8 test quality: 1 violation (mock cast, accepted) + the coverage/vacuous gaps in the findings table.
- #10 input-validation, #6 JSX, #7 async, #11 error, #12 perf: N/A (no user input, JSX, async, or hot-path concerns introduced).
- Epic invariant — core/shell purity: PASS (`core/text.ts`, `core/screens.ts` clean).
- Epic invariant — coin-op ban: PASS (text module coin-op-free + covered by its own test).

### Devil's Advocate

Assume this is broken. A confused player drives straight into a pyramid: `inGameMessage`
returns MOTION_BLOCKED every frame — but is the `moved < 1e-3` threshold really only zero when
blocked? `stepTank` resets `x`/`z` to the *exact* prior values on collision, so `moved === 0`
there; a *moving* tank at 60Hz covers ≥1 world unit per frame at any real throttle, so no false
positive — VERIFIED by reading `movement.ts:stepTank`. But at a 240Hz refresh with tread sum
just above 0.1, displacement is ~1 unit, still ≫ 1e-3 — safe. What about the attract→playing
transition, where `prevPose` is last frame's attract pose and the run re-inits the tank to
spawn? `moved` is then large → no spurious MOTION_BLOCKED; and if the reset made it ~0 while the
player happened to press forward, a one-frame flicker is harmless. The genuinely unproven claim
is ENEMY_IN_RANGE at the cone/range *edges*: `(dx·fwd)/range > AIM_COS` — is the sign/axis
convention right? `forwardFromHeading = [sin,0,cos]`, dotted with `(dx,dz)`; I read it as correct
(cosine of bearing), but there is NO test, so a heading-convention regression in `camera.ts`
would silently break the alert with nothing to catch it. That is exactly why `[TEST]` finding #1
blocks: correct-looking untested boundary logic is the classic silent-regression trap. A
maintainer six months from now sees `text.test.ts` asserting all 13 ROM strings and reasonably
assumes BONUS TANK AT / GREAT SCORE / ENEMY TO-LEFT are on screen — they are not; the test lies
by implication. And the whole capstone's headline AC — the live two-surface playtest — has not
run, so any real gameplay defect (message flicker, crack density, red-score legibility over the
world) is still unobserved. None of this is a crash today; all of it is latent risk a capstone
should retire, not inherit.

**Handoff:** Back to TEA (Imperator Furiosa) for RED rework — the remedy is test coverage
(export + test `inGameMessage`; fix the two vacuous tests; add the `drawMessage` colour test)
and the wire-or-descope decision on the unwired roster strings. After green, the BLOCKING
manual item remains: the SM/human must run the full two-surface live playtest (AC-4/AC-6) +
record the reference-footage comparison (AC-1) before the story can finish, filing any surfaced
bug as a new story per the capstone convention.

## Subagent Results — Round-Trip 1 (re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (build clean, 666/666 green, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 new (LOW) + confirmed 3 prior RESOLVED | confirmed 3 (non-blocking), 0 dismissed |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (rule-checker covered) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (the pre-accepted mock cast) | confirmed 1 (accepted, unchanged) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 0 blocking; 3 non-blocking LOW test-strengthening; 1 accepted-disclosed (mock cast)

## Reviewer Assessment — Round-Trip 1

**Verdict:** APPROVED

The rework answers the rejection cleanly. Every blocking finding is resolved and independently
re-verified: the alert decision now lives in a pure, testable `core/alerts.ts` (`inGameAlert`,
11 branch tests — motion-blocked, aim-cone, range boundary, not-alive, tie-break, null); the two
vacuous tests are producer-driven against hard literals; `drawMessage`'s red default is guarded;
the roster is honestly tiered (WIRED vs RESERVED). Build clean, 666/666 green, purity sweeps
green, security clean. The three NEW findings are LOW-severity polish on already-solid coverage —
not code bugs, not quality erosion — so they ride as non-blocking follow-ups rather than a third
round-trip. Rejecting further on diminishing nits would be its own failure of judgment.

**Data flow traced:** `inGameAlert` → returns only `MESSAGES.MOTION_BLOCKED | MESSAGES.ENEMY_IN_RANGE
| null` (ROM constants) → `main.ts` strokes via `drawMessage` → `fillText` (bitmap sink, no XSS).
**Pattern observed:** the extraction restores the house core/shell split — pure decision in
`core/alerts.ts:42` mirroring `core/screens.ts`; `main.ts` is now a thin caller (`main.ts:183`).
**Error handling:** N/A (no async/IO/throw); guards correct (`range > 0` before divide `alerts.ts:53`,
strict `!== null` `main.ts:184`).

### Findings (all NON-BLOCKING — captured as follow-ups)

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] `[TEST]` | `.not.toBe(MOTION_BLOCKED)` where result is deterministically `null` — `.toBeNull()` is stronger | `tests/core/alerts.test.ts:60` | harden on next touch |
| [LOW] `[TEST]` | aim-cone edge (strict `>` AIM_COS) untested; range edge IS tested | `tests/core/alerts.test.ts` | feel-gated alert; add a near-cone bearing case |
| [LOW] `[TEST]` | SCORE labelled WIRED but no producer test drives `gameOverLines(nonzeroScore)` | `tests/core/text.test.ts` | add `gameOverLines(n)[1]` assertion |

### Dispatch tags (all specialists accounted for)

- `[TEST]` (reviewer-test-analyzer) — 3 prior findings CONFIRMED RESOLVED; 3 new LOW non-blocking (table above). The analyzer verified the mock is complete for the functions it exercises and the `stateWith` fixtures exercise the intended branch for the right reason.
- `[RULE]` (reviewer-rule-checker) — 47 instances, 1 violation: the pre-existing, already-accepted `as unknown as CanvasRenderingContext2D` mock cast (`hud-palette.test.ts:90`, #1/#8) — unchanged, still the sole one. `alerts.ts` purity, `import type`, `.js`-omission, `MESSAGES as const`, `ENEMY_ALERT_RANGE` export all PASS; `main.ts` has no unused imports (tsc `noUnusedLocals`).
- `[SEC]` (reviewer-security) — CLEAN: `core/alerts.ts` pure (core-only imports, no DOM/time/random), alert strings are ROM constants, no secrets, no new sinks; transitive purity confirmed.
- `[DOC]` (comment-analyzer DISABLED — I checked) — `alerts.ts`/`main.ts` comments accurate; the prior "AIM_CONE" nit is gone (removed with the extracted block).
- `[EDGE]` (edge-hunter DISABLED — I traced) — boundaries verified: `moved < 1e-3` matches `stepTank`'s exact hard-stop; range boundary tested; the one untested edge (aim-cone) is the LOW finding above.
- `[SILENT]` (silent-failure-hunter DISABLED) — no new catch/fallback; `inGameAlert` returns `null` explicitly, handled with `!== null`. No swallowed errors.
- `[TYPE]` (type-design DISABLED — rule-checker covered) — no type escapes in production code; params are readonly interfaces; `as const` correct.
- `[SIMPLE]` (simplifier DISABLED) — the rework REDUCED complexity (main.ts −50 lines, pure function extracted); nothing over-engineered.

### Rule Compliance

Re-verified across 47 instances (rule-checker) + my own read:
- #1 type-safety: 1 violation (accepted mock cast); production code clean. #2 readonly: PASS
  (`MESSAGES as const`, `CRACK_PATHS`, readonly param interfaces). #4 null: PASS (`!== null`, guarded
  divide). #5 module/`import type`/`.js`: PASS. #8 test-quality: the accepted mock cast; new LOW
  findings above. #10/#6/#7/#11/#12: N/A. Epic core/shell purity: PASS (`alerts.ts` pure — sweep
  confirms). Coin-op ban: PASS.

### Devil's Advocate

Assume the rework hides a regression. The extraction claims to be "byte-for-byte" — is it? I diffed
the logic: `translationIntent`, `moved < 1e-3`, the tie-break order, the `range > 0 && range <
THRESHOLD && dot/range > AIM_COS` gate — all identical to the rejected `inGameMessage`, only the home
and the constant name changed (`ENEMY_RANGE` → `ENEMY_ALERT_RANGE`, same value 20000). So behaviour is
preserved; the earlier attract smoke test (red score, green horizon band, cracked glass) still holds.
Could the move have broken a call site? `tsc --noEmit` with `noUnusedLocals` passes and `main.ts:183`
calls `inGameAlert(input, prevPose, game)` with the right shapes — no. Could a test pass for the wrong
reason? The analyzer specifically checked `stateWith` builds valid `GameState`s and each fixture hits
the intended branch — it does. The real residual risk is the one I'm NOT blocking on: the aim-cone
edge is unpinned, so a future `>`→`>=` slip or an AIM_COS retune would shift alert timing silently —
but that gates a playtest-tunable FEEL alert, not a sim value, so it's cosmetic, not a correctness
trap. The genuine remaining exposure is unchanged and lives OUTSIDE the code: the full two-surface
live playtest (AC-4/AC-6) has still not run, so real gameplay defects (message flicker, crack density,
red-score legibility) remain unobserved. That is a finish-gate for the human, not a code-review block.

**Handoff:** To SM (The Organic Mechanic) for finish. **BLOCKING for finish (not for this code
review):** the full attract→roster→game-over→high-score live playtest on BOTH :5276 and the live
tunnel (AC-4), the reference-footage comparison (AC-1 doc), and defect-filing (AC-6) are the
capstone's remaining MANUAL verification — a human must run them before the story closes, filing any
surfaced bug as a new story. The 3 LOW test findings above are optional follow-ups. DO NOT merge —
SM/human owns PR + merge.