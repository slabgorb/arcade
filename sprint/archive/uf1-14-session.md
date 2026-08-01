---
story_id: "uf1-14"
jira_key: "uf1-14"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-14: star-wars C_PV's ±45° pyramid is not the rendered frustum — off-screen TIEs pass the §6 fire gate

## Story Details
- **ID:** uf1-14
- **Jira Key:** uf1-14
- **Workflow:** tdd
- **Priority:** p1
- **Points:** 3
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T10:11:58Z
**Branch Strategy:** trunk-based (no feature branches — work happens directly on main)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T09:21:34Z | 2026-08-01T09:24:32Z | 2m 58s |
| red | 2026-08-01T09:24:32Z | 2026-08-01T09:56:41Z | 32m 9s |
| green | 2026-08-01T09:56:41Z | 2026-08-01T10:04:18Z | 7m 37s |
| review | 2026-08-01T10:04:18Z | 2026-08-01T10:11:58Z | 7m 40s |
| finish | 2026-08-01T10:11:58Z | - | - |

## Story Context

### Problem Statement
The C_PV condition in computeStatus (src/core/tie-status.ts) sets a ±45° square pyramid to determine if a TIE is in the player's view. This pyramid is faithfully ported from the ROM's ratio law (WSMAIN.MAC:3834-3841), but it encodes the 1983 cabinet's screen shape, not the rendered frustum of the arcade clone.

### Root Cause
- **ROM's C_PV test:** A ratio law `lat*lat < depth*depth && vert*vert < depth*depth` — a ±45° square pyramid
- **Rendered frustum:** `perspective(FOV_Y, w/h, NEAR, FAR)` with FOV_Y = π/3 (vertical), so:
  - Vertical half-angle: 30° at EVERY aspect ratio
  - Horizontal half-angle: atan(aspect * tan(FOV_Y/2))
- **Impact:** C_PV over-reports by 15° on vertical, swings with canvas on horizontal (45.7° at 16:9, 37.6° at 4:3, 30.0° at 1:1, 53.4° at 21:9)

### Consequences
1. **Vertical:** 15° band of sky above/below screen is claimed as "in view" but player cannot see it
2. **Fire gate defect:** C_PV is the first condition of §6 fire gate (WSCPU.MAC:624-626), so off-screen TIEs can still shoot
3. **Horizontal:** Ultrawide canvases UNDER-report by 8.4°, starving fire

### Deliverable
Re-derive the pyramid from the REAL frustum half-angles while keeping the ROM's ratio law as the SHAPE (still a square pyramid in view space, just at the correct angle). Use the viewport aspect the core already carries (uf1-12 ships this into GameState).

### Dependencies
- **DEPENDS ON:** uf1-12 (must be done first — it adds viewport aspect to GameState at state.ts:993, referenced at tie-status.ts:157)
- **SEQUENCING:** uf1-15 (p2) and sw8-19 (p3) also rewrite computeStatus in the same file; this goes FIRST

### Side Effects
- Expect to re-anchor `npm test -- citations` if sim.ts moves — it carries 36 pinned lines across 9 docs/audit/findings files

## Acceptance Criteria
- C_PV's pyramid is derived from the real frustum half-angles (vertical 30°, horizontal atan(aspect * tan(FOV_Y/2)))
- The ROM's ratio law is preserved as the SHAPE (still a square pyramid in view space), not the angle
- The viewport aspect from GameState is used to compute the correct horizontal half-angle
- All existing tests pass or are deliberately re-baselined (with mutation proof that the change is non-vacuous)
- The defect that sw7-24 intended to kill (off-screen TIEs shooting) is actually resolved on the vertical axis
- The citation anchor at 'npm test -- citations' remains valid; if sim.ts moves, citations are re-anchored

## Delivery Findings

No upstream findings.

- **Improvement** (non-blocking): sw8-19's planned fix ("gate C_PS on C_PV") can now
  build on a frustum-true C_PV; its author should read the new `TAN_HALF_FOV` doc
  block rather than the pre-uf1-14 ±45° description that may survive in older notes.
  Affects `plugins/star-wars/src/core/tie-status.ts` (no change needed — context for
  the next story in this file). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): stale rationale in an untouched test — the comment
  calls 6,000 lateral at depth 6,000 "45 deg off at this depth, the edge of the C_PV
  pyramid", which described the retired law; under the frustum law the edge at that
  depth is ≈3,464, so the fixture is now well BEYOND the edge (the test's conclusion
  "it stays wide" still holds, and the test passes).
  Affects `plugins/star-wars/tests/core/tie-loiter-sights.test.ts` (line 179 comment
  should say the fixture sits far outside the frustum-law pyramid, not on its edge).
  *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- No deviations from spec. → ✓ ACCEPTED by Reviewer: implementation matches the
  story's stated formulas exactly (vertical `depth · tan(FOV_Y/2)`, horizontal
  scaled by `state.aspect`, ratio-law shape and VIEW_NEAR/VIEW_FAR preserved);
  diff inspected line-by-line against ACs 1-3, no undocumented divergence found.

### Reviewer (audit)
- No undocumented deviations found. The one judgment call TEA made — re-seating
  the frame-drift fixtures in `tie-fire-visibility.test.ts` (5000→3000, 3976→2400)
  — is documented in the Tea Assessment with its rationale (keeping the moving-eye
  discriminator sharp) and is a strengthening, not a weakening, of the original pin.

## Sm Assessment

Setup complete. Story claimed in checkout `a-3`, trunk-based on `main`.

**Routed here from a different ask.** The user requested `sw8-19`. That story is
unclaimed and passes every mechanical check, but its own description carries an
architect-sweep dependency — *"DO uf1-14 FIRST"* — because sw8-19's likely fix is
"gate C_PS on C_PV", and uf1-14 exists precisely because that C_PV pyramid is the
wrong shape. Building sw8-19 first guarantees rework. User confirmed the reorder.

**Dependency cleared before claiming, not assumed.** uf1-14's description says
"DEPENDS ON uf1-12". uf1-12 is `done` *and* its deliverable is verifiably in the
tree: the viewport aspect field at `plugins/star-wars/src/core/state.ts:993`, with
`plugins/star-wars/src/core/tie-status.ts:157` already referring to it. So the
input this story needs to re-derive the half-angles is present. No blocker.

**Contention check (the board is not proof).** Probed before setup and found clear:
no remote branch matching `uf1-14`/`uf1-15`/`sw8-19`, no `*-session.md` for any of
them in `a-1`, `a-2` or `a-3`, and the merge gate is clean (zero open PRs).
Concurrent work elsewhere: `a-1` owns **jt5-3**, `a-2` owns **cp5-1**. Neither
touches star-wars, so there is no overlap with this story.

**Sequencing warning for whoever picks up next.** `uf1-15` (p2) and `sw8-19` (p3)
both rewrite `computeStatus` in the same file and are both still `backlog`. Three
open stories in one function. uf1-14 lands first; do not race them.

**Setup correction worth noting.** `sm-setup` reported success but left the story
at `backlog` — the claim had not landed. Corrected via
`pf sprint story update uf1-14 --status in_progress` (not by editing YAML), and the
epic diff was checked to be status+`started` only before committing. Claim pushed
as `6852c71` so the sibling checkouts see it.

**For TEA (red phase).** The deliverable keeps the ROM's ratio law as the *shape* —
still a square pyramid in view space — and changes only the *angle*. The hard part
is that the horizontal half-angle is aspect-dependent, so a test pinned at one
canvas shape proves little: 45.7° at 16:9 is nearly the ported 45°, which is exactly
why this survived a year unnoticed. Pin the aspects where the error is large (1:1
over-reports by 15°, 21:9 under-reports by 8.4°) and prove the guard is non-vacuous
by mutation. Expect `npm test -- citations` to need re-anchoring if `sim.ts` moves —
36 pinned lines across 9 `docs/audit/findings` files.

## Tea Assessment

**RED delivered and verified: 11 failing tests, committed as `5a717d1`.**
testing-runner confirms an EXACT match — 2 files failing with the designed 11,
the other 188 files / 2035 tests green, so there is no collateral damage and no
pre-existing red being blamed on this story.

**Where the tests live.**
- `tests/core/tie-view-frustum.test.ts` (NEW) — uf1-14's law suite. All expected
  bounds are computed from the SAME `FOV_Y` that `render.ts:451` projects with
  (imported from `gameRules.ts`), so the suite follows the glass if the camera is
  ever retuned rather than freezing today's numbers.
- `tests/core/tie-fire-visibility.test.ts` (RE-BASELINED) — sw7-24's ±45° edge
  pins moved to the frustum bound (aspect-1: `depth · tan(FOV_Y/2)` ≈ 2309.4 at
  depth 4000); the frame-drift fixtures re-seated (5000→3000 outside, 3976→2400
  inside at depth 4200) so the moving-eye discriminator stays sharp under the
  narrower bound — the old 5000 would have sat outside from BOTH eyes and let a
  moving-eye regression pass unnoticed.

**The RED is the mutation proof (AC-4).** The shipping implementation IS the ±45°
mutant this law must kill, so 11 designed failures against it are the non-vacuity
evidence; no separate mutation run is needed for the re-baselined pins. Seven
GUARD tests pass today and must stay green: depth clamps (both files), the
pyramid-not-cone corner test, behind-the-eye/far-outside silence, and
in-view-still-fires on the same fixture as the silence arms (which is what keeps
the `toBe(0)` arms honest rather than a dead fire path).

**Both halves of the defect reproduced live in the fire gate, not just in the
status word:** a TIE at 35° elevation (on screen per the old law, above the glass
in truth) fired 30 times in 160 frames at a player who cannot see it — the AC-5
defect; a TIE 50.2° off-axis on a 21:9 canvas fired 0 times despite being on the
glass — the starved-flank half. Cadence luck is excluded by wave 11's fire windows
(40 windows/run) mirrored from the existing sw7-24 fixture.

**What the tests demand of Dev (`computeStatus`, tie-status.ts:134-140):**
1. Vertical bound: `vert² < (depth · tan(FOV_Y/2))²` — 30° at EVERY aspect.
2. Horizontal bound: `lat² < (depth · state.aspect · tan(FOV_Y/2))²` — read from
   `state.aspect` (the uf1-12 field; stepGame already shadows `input.aspect`
   onto it at sim.ts:158, so the fire gate gets it for free).
3. Keep the ratio law's SHAPE: per-axis strict inequality (BHS — edge is out),
   and keep VIEW_NEAR/VIEW_FAR untouched (the story rewrites the slope, not the
   caps).
4. The tangent must come from the real `FOV_Y` (import from gameRules), not a
   rounded literal — the precision test kills 0.577/0.578 at depth 30000.

**Blast-radius sweep done, clean.** No audit citation pins `tie-status.ts`
(grepped `docs/audit/findings/*.json`), so editing it will NOT redden the
citation gate; re-anchoring is only needed if `sim.ts` moves, which this fix
should not require. Every other fire-dependent fixture in the suite stages TIEs
dead-ahead or ≤ 10° off-axis — inside the 30° frustum at every aspect — and the
surface/trench fire suites stage no `enemies` at all, so no further re-baselines
are hiding.

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md`; no
`.claude/rules/` or `SOUL.md` in this repo):
- #1/#8 (type escapes, test quality): no `as any`, no `@ts-ignore`; every
  assertion pins a concrete boolean/count with a diagnostic message; the only
  casts are the file-idiom `[...pos] as Vec3` tuple copies. `npm run lint`
  (tsc --noEmit, repo-wide) is green over the new tests.
- #4 (null/undefined): the suite exercises the `input.aspect`-absent path
  (NO_INPUT → state.aspect defaults to 1) alongside explicit aspects, so a
  wrong default would fail the square-canvas arms.
- Core purity: tests drive randomness only through the seeded Rng and time only
  through dt — the boundary the purity gate enforces on src/core is respected
  in the fixtures too.
- Remaining checklist items (enums, React, async, build config…) have no
  surface in this diff: it adds pure-function tests over existing types.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/star-wars/src/core/tie-status.ts` — C_PV's pyramid re-derived from the
  rendered frustum: new module const `TAN_HALF_FOV = Math.tan(FOV_Y / 2)` (FOV_Y
  imported from `gameRules.ts`, the same constant `render.ts:451` projects with);
  the C_PV test now bounds `vert²` by `(depth · TAN_HALF_FOV)²` and `lat²` by
  `(depth · TAN_HALF_FOV · state.aspect)²`. The ROM's ratio law survives as the
  shape (per-axis, strict `<`, edge out of view), `VIEW_NEAR`/`VIEW_FAR` untouched,
  and the doc comments now explain the angle re-derivation instead of describing
  the retired ±45°.

**Tests:** 2046/2046 passing (GREEN — verified by testing-runner `uf1-14-dev-green`;
the 11 RED tests across `tie-view-frustum.test.ts` and `tie-fire-visibility.test.ts`
all flipped, zero collateral failures, citation gate green as TEA predicted since
`tie-status.ts` carries no audit citations and `sim.ts` did not move).
**Branch:** main (trunk-based; pushed as `31b9c69` RED + `71c116f` GREEN after a
clean rebase over jt5-3's joust-only commits from a sibling checkout)

**AC trace:**
1. Pyramid derived from real frustum half-angles — `TAN_HALF_FOV` from `FOV_Y` ✓
2. ROM ratio law kept as the shape ✓ (pyramid-not-cone GUARD passes)
3. Horizontal half-angle from `state.aspect` ✓ (canvas-flip tests pass)
4. Existing tests pass or deliberately re-baselined ✓ (TEA re-baselined
   `tie-fire-visibility.test.ts` in RED; that RED run is the mutation proof)
5. Off-screen TIEs no longer shoot on the vertical axis ✓ (the 35°-elevation
   fire-gate test went 30 fires → 0)
6. Citation anchors valid ✓ (suite includes the citation gate, green)

**Handoff:** To review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (one status claim — modified `sprint/epic-uf1.yaml` — independently verified by Reviewer: it is pf's own in_progress→in_review transition, expected) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (13/13 typescript.md checks compliant or no-surface; 4/4 project rules compliant; numeric bounds independently recomputed and confirmed) |

**All received:** Yes (2 enabled returned, 7 disabled)
**Total findings:** 1 confirmed (Reviewer's own, LOW doc), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** canvas geometry → `shell/input.ts:45` (`clientWidth /
clientHeight`, zero-height guarded to 1) → `Input.aspect` → `stepGame` shadows it
onto the state at `sim.ts:158` (`input.aspect ?? 1`) → `state.aspect` →
`computeStatus`'s `hBound = vBound * state.aspect` → C_PV bit → §6 fire gate's
first condition at `sim.ts:413`. Safe end-to-end: the degenerate zero-WIDTH canvas
yields `hBound = 0` → nothing laterally "in view" → no enemy fire, which is the
truthful reading of an invisible viewport, and the zero-HEIGHT case is already
clamped at the shell seam before it can divide.

**Pattern observed:** the constant-derivation pattern at
`plugins/star-wars/src/core/tie-status.ts:91` — `TAN_HALF_FOV = Math.tan(FOV_Y/2)`
derived from the SAME `FOV_Y` the render projects with (`render.ts:451`), with a
doc block explaining the fidelity trade (ROM shape kept, cabinet angle replaced).
This matches the file's established documented-constant idiom (`FIRE_CONE_COS`,
`PLAYER_NEAR_RANGE`) and the codebase's existing frustum doctrine (the aim-cone
comment at `trench-obstacles.ts:112` already states the identical
`tan(FOV_Y/2)·aspect` law).

**Error handling:** pure arithmetic on required numeric fields — `GameState.aspect`
is non-optional with default 1 (`state.ts:1258`), negative depth is rejected by the
`depth > VIEW_NEAR` clamp before the bounds matter, and strict `<` preserves the
ROM's BHS edge-out semantics.

**Observations (adversarial pass):**
1. `[VERIFIED]` The law matches AC-1/AC-2/AC-3 exactly — `tie-status.ts:158-163`:
   `vBound = depth * TAN_HALF_FOV`, `hBound = vBound * state.aspect`, per-axis
   strict ratio comparison; VIEW_NEAR/VIEW_FAR untouched at lines 77-78. Complies
   with the core-purity rule (`Math.tan` of a module constant; no DOM, no clock,
   no unseeded randomness).
2. `[VERIFIED]` Scope containment — the fire gate consuming C_PV lives in the
   space-phase branch (`sim.ts:319`, gate at 374-445); surface/trench fire paths
   (turrets, wall guns) stage no `state.enemies` and are untouched.
3. `[VERIFIED]` Test independence — `tie-view-frustum.test.ts` derives its expected
   bounds from `FOV_Y` itself rather than importing the implementation's
   `TAN_HALF_FOV` (which is deliberately NOT exported), so the suite cannot be
   circular; it would catch a wrong tangent in the implementation.
4. `[VERIFIED]` No stale ±45° prose survives in `src/` — swept
   `±45|45°|45 deg|forty-five`; the only hit (`state.ts:676`) is the unrelated
   surface-contact cone. The C_PV and VIEW_NEAR/FAR doc blocks were rewritten with
   the diff.
5. `[DOC]` `[LOW]` Stale comment rationale at `tie-loiter-sights.test.ts:179`
   ("the edge of the C_PV pyramid" describes the retired law; the test still
   passes and its conclusion holds). Recorded as a non-blocking delivery finding —
   proportionate follow-up, not a block on a 3-point story.
6. `[VERIFIED]` Fire-silence assertions cannot pass vacuously — the GUARD test
   fires >0 on the identical wave-11 fixture (40 cadence windows/160 frames), so
   the two `toBe(0)` arms measure the gate, not a dead fire path.
7. `[VERIFIED]` Working tree state — the only modification beyond the story's two
   pushed commits is `sprint/epic-uf1.yaml`'s pf-written in_progress→in_review
   transition (verified by diff; committed by SM at finish per protocol).

**Rule Compliance** (rubric: `.pennyfarthing/gates/lang-review/typescript.md`; no
`.claude/rules/` or `SOUL.md` exist in this repo):
- Checks with surface, all compliant: #1 type-safety escapes (only the file-idiom
  `[...pos] as Vec3` tuple narrowing; zero `as any`/`@ts-ignore`/`!`), #2
  generics/interfaces (4 new test helpers, fully typed; `Vec3` is already a
  readonly tuple), #4 null/undefined (no new `??`/`||`; `aspect` non-optional),
  #5 modules (`import type` discipline kept; bundler resolution — the
  `.js`-extension rule targets shipped ESM in `src/shared`, not these files),
  #8 test quality (no mocks, no dist imports, assertions numerically
  self-consistent — rule-checker recomputed every bound), #12 perf/bundle (named
  imports only), #13 fix-regressions (fix hunk re-scanned: two arithmetic locals,
  no new escapes).
- Checks with no surface in this diff: #3 enums, #6 React/JSX, #7 async, #9 build
  config, #10 input validation (viewport geometry, not untrusted input), #11
  error handling.
- Project rules: core purity ✓, seeded-Rng/dt-only tests ✓, `@shared/*` alias ✓,
  ROM-citation comments not stale ✓ (all per rule-checker, spot-verified by me).

**Subagent dispatch tags:** `[RULE]` rule-checker: clean, 13/13 + 4/4 (enabled,
returned). Disabled via settings this session — their domains covered by the
Reviewer's own pass above: `[EDGE]` (boundary pins at 2299/2320, depth clamps,
degenerate-aspect trace), `[SILENT]` (no catch/fallback surface in a pure
predicate), `[TEST]` (vacuity check via GUARD-on-same-fixture, observation 6),
`[DOC]` (stale-prose sweep, observations 4-5), `[TYPE]` (tuple/readonly audit
under check #1/#2), `[SEC]` (no untrusted input; no auth/tenant surface in a
client-only game), `[SIMPLE]` (diff is two locals + one const — nothing to
remove).

### Devil's Advocate

Suppose this change is wrong. The sharpest attack: the pyramid now TRUSTS
`state.aspect`, so anything that feeds a stale or wrong aspect silently reshapes
the fire gate. Could an attract-mode demo, a paused tab, or a resize mid-wave
desynchronize the bit from the glass? Traced: the shell samples aspect on every
input frame from the live canvas (`input.ts:44-46`), `stepGame` re-shadows it
every step, and a resize therefore lags the render by at most one frame — the
same one-frame seam C_PS has carried since uf1-12, and the cabinet had no resizes
at all. Second attack: floating-point at the boundary. The ROM's integer law had
an exact equality case (BHS); ours compares squared doubles against an irrational
bound, so "equality" is unreachable — but that cannot flip a fire decision by
more than one world unit at the pyramid's skin, and both suites pin behavior
±0.4% around the skin, far coarser than double precision. Third: could the
narrower vertical band starve fire so badly the game feels dead? The band is
exactly what the player SEES; the guard test proves in-view cadence unchanged,
and the ultrawide arm proves flanks that were starved now fire — net fire
pressure moves toward the cabinet's intent, not away. Fourth: is `TAN_HALF_FOV`
double-maintained with the test file's copy? Yes, deliberately — the test's
independent derivation is what makes it a check rather than a mirror; if either
side drifts from `FOV_Y`, the suite reddens. Fifth: does measuring from COCKPIT
break if a later story re-introduces a moving eye? The re-seated frame-drift test
now catches exactly that regression (its old fixture would have missed it under
the narrower bound). No attack survived with evidence; the review missed nothing
it can name.

**Handoff:** To SM for finish-story