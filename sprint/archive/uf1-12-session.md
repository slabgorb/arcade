---
story_id: "uf1-12"
jira_key: "uf1-12"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-12: star-wars C_PS is never derived — TCH1DZ's loiter branch is unreachable dead code

## Story Details
- **ID:** uf1-12
- **Jira Key:** uf1-12
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars
- **Branch:** feat/uf1-12-c-ps-loiter-branch

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-29T22:54:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-29T13:11:15Z | 2026-07-29T13:13:57Z | 2m 42s |
| red | 2026-07-29T13:13:57Z | 2026-07-29T13:41:14Z | 27m 17s |
| red | 2026-07-29T13:41:14Z | 2026-07-29T17:53:50Z | 4h 12m |
| green | 2026-07-29T17:53:50Z | 2026-07-29T22:21:56Z | 4h 28m |
| review | 2026-07-29T22:21:56Z | 2026-07-29T22:37:21Z | 15m 25s |
| green | 2026-07-29T22:37:21Z | 2026-07-29T22:47:13Z | 9m 52s |
| review | 2026-07-29T22:47:13Z | 2026-07-29T22:50:01Z | 2m 48s |
| green | 2026-07-29T22:50:01Z | 2026-07-29T22:53:35Z | 3m 34s |
| review | 2026-07-29T22:53:35Z | 2026-07-29T22:54:59Z | 1m 24s |
| finish | 2026-07-29T22:54:59Z | - | - |

> **Phase returned `review` → `green` on a REJECTED verdict (2026-07-29T22:37Z).** The
> Reviewer found two must-fix items (F1: a false ROM claim in the AC-5 header; F2: C_PS
> measures the previous frame's yoke, so it is not the gun's ray as AC-6 requires). This is
> the framework's own documented recovery — `resolve-gate` exposes
> `recovery_config.reviewer-verdict: {action: rework, target_phase: green}` — driven with
> `pf handoff complete-phase uf1-12 tdd review green reviewer_verdict`. No hand-editing was
> needed; note that plain `resolve-gate` still reports `next_phase: finish` after a
> rejection, so the explicit form is what keeps a rejection from walking forward.

> **Phase walked back from `green` to `red` by user decision.** TEA's own post-handoff
> measurement showed the aspect deviation was major, not minor, so uf1-14's C_PS half was
> folded into this story's scope (new AC-6) and the RED contract tightened before Dev
> started. `pf handoff` is forward-only, so the Phase field was hand-edited. No
> implementation existed at the time of the walk-back.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking, ANSWERED): AC-1's own open question — "check whether
  WSMAIN.MAC:3930's gate gives a portable threshold that could retire the inferred 12°
  `FIRE_CONE_COS` on C_AS too" — resolves to **NO**. The two bits are set by different
  machines on opposite sides of the fight: C$PS is set in the PLAYER's draw pass from the
  crosshair against the alien's projected centre (WSMAIN.MAC:3919-3932), expressed as a
  multiple of the player's own laser-hit size; C$AS is set on the ALIEN side from its
  math-box view of the player (WSCPU.MAC:607-621). Nothing at :3930 constrains C_AS, so
  `FIRE_CONE_COS`'s `TODO(playtest)` stands and this story leaves it alone.
  Affects `src/core/tie-status.ts` (no change — the TODO stays).
  *Found by TEA during test design.*

- **Gap** (non-blocking): C_AS's threshold is nonetheless recoverable from the ROM, just
  not from this story's line. `WSCPU.MAC:615-618` is the whole gate — `LDD M.YPS / ADDD
  M.ZPS / CMPD #20 / BHI` — so C$AS is set when Y² + Z² ≤ 0x20. The `S` suffix is SQUARED,
  proven by the author's own annotation on the same operands in the view pass (`SUBD M.XPS
  ;X SQUARED`, WSMAIN.MAC:3835 and :3841). That makes the cabinet's aiming test a CIRCLE of
  radius √32 ≈ 5.66 in projected screen units — an angular cone that does convert to a
  cosine once the math box's screen-units-per-radian scale is pinned. So the invented 12°
  is replaceable, and `tie-status.ts`'s standing comment ("there is no direct unit
  conversion to a cosine threshold") is true only while that scale is unpinned, not in
  principle. Out of scope here — C_PS's port sidesteps projected units entirely by riding
  on the world-space kill radius, so it sets no precedent for C_AS.
  Affects `src/core/tie-status.ts` (`FIRE_CONE_COS` and its TODO).
  **Filed as uf1-13** (3pts, p2, bug, tdd, star-wars) with the full citation chain.
  [Dev, green phase: **that story is now `uf1-15`.** A sibling checkout had already
  pushed its own `uf1-13` (lobby showcase residuals) to `origin/main`, so the rebase
  conflicted and upstream kept the id. TEA's text left as written.]
  *Found by TEA during test design.*

- **Improvement** (non-blocking): the citation gate (`tests/audit/citations.test.ts`) pins
  exact line numbers in our own source, and `src/core/sim.ts` carries **36** such pins
  across 9 finding files — while `tie-status.ts` and `tie-vm.ts` carry **none**. Any edit
  to `sim.ts`, including a comment-only one, shifts those pins and reddens the gate.
  **UPDATED 2026-07-29 — the first version of this finding advised keeping the whole fix
  out of `sim.ts`, and AC-6 has overtaken that advice.** Carrying the viewport into the
  pure core requires one line in `stepGame`, so the gate WILL redden; the second probe
  measured it exactly: **22 of the 36 pins move** (those below the insertion point), and
  the only full-suite failures under the fix were those two citation tests. The advice is
  now: keep the `sim.ts` edit to the single shadow line (minimising the shift), then
  re-anchor the moved pins rather than backing the plumbing out.
  Affects `src/core/sim.ts` (one line), `docs/audit/findings/*.json` (re-anchor 22 pins),
  `src/core/tie-status.ts` + `src/core/state.ts` (the rest of the fix).
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the citation gate's re-anchor work is bigger and more
  dangerous than a line-shift chore looks. TEA measured the COUNT correctly (only the two
  citation tests fail), but the fix moved **23 live pins across 9 findings files**, not
  just `sim.ts`'s — `state.ts`'s T-010 moved too (+9, the `aspect` doc block sits above
  it). More importantly, **2 of the 23 could not be resolved by verbatim alone**:
  `      damage++` occurs at `sim.ts:616`, `1016` and `1101`, and
  `    if (collides(s.pos, ship, COCKPIT_HIT_RADIUS)) {` at `615` and `1100`. A hand fix
  that takes the nearest-looking match re-points finding S-016 at the SURFACE damage site
  instead of the space one — **and the gate goes green on it**, because the verbatim still
  matches. That is the citation-gate failure mode in its worst form: a green gate over an
  audit record describing the wrong code. Resolved here by the file's uniform shift (one
  insertion point ⇒ every pin below moves by the same delta), and by skipping the 34
  `remediated_by` findings the checker deliberately exempts (`check-citations.mjs:117`).

  **CORRECTED before handoff — two things I had wrong, both material:**
  (a) **The repo already has the tool.** `tools/audit/reanchor-citations.mjs` (dry-run,
  `--write`, skips `remediated_by`, nearest-match on duplicates) has been there all along; I
  hand-rolled a scratchpad script without looking. Run against my hand-anchored result it
  reports **"96 already correct, 0 re-anchored, 0 lost"** — so the sanctioned tool would have
  produced the identical pins, which is also the evidence that this story's re-anchoring is
  right. (b) **The loop is obsolete, and tempest already retired it.** tempest's tp1-22
  points its gate at the **audit COMMIT** (`git show 4232ed4:<file>`) instead of the working
  tree, so its pins can never go stale and its re-anchor tool is demoted to a LOST-only
  health check; star-wars's checker still reads the working tree
  (`check-citations.mjs:155`), which is why we pay this at all.
  Affects `tools/audit/check-citations.mjs`, `tests/audit/citations.test.ts`.
  **Filed as td1-13** — rewritten from "build a re-anchor tool" to "port tempest's freeze",
  3pts, p3, chore, tdd, star-wars. The duplicate-verbatim hazard is kept in it as the reason
  the freeze is worth more than the churn it saves.
  *Found by Dev while re-anchoring; premise corrected before handoff.*

- **Conflict** (non-blocking, RESOLVED): the story-ID filing race actually fired. While
  this story sat in RED, a sibling checkout filed and pushed its OWN `uf1-13` (lobby
  showcase residuals, from uf1-6's review) to `origin/main`. Both checkouts had read the
  same epic and both picked 13. `git pull --rebase` conflicted on `sprint/epic-uf1.yaml`
  exactly at that block; **upstream keeps the id** and TEA's C_AS story was re-filed as
  **uf1-15**. Nothing in the `star-wars` repo referenced the old number (checked
  `src`/`tests`/`docs` and both commits), so the renumber is orchestrator-only:
  `epic-uf1.yaml`, `context-story-uf1-12.md`, and three lines of this session file.
  Worth knowing for the next filer: `pf sprint story add` picks the next id from the LOCAL
  epic, so a checkout that has not fetched cannot see the collision it is about to create —
  fetch first, and expect the conflict at the tail of the stories list.
  Affects `sprint/epic-uf1.yaml`, `sprint/context/context-story-uf1-12.md`.
  *Found by Dev while pushing.*

- **Question** (non-blocking, ANSWERED): does C_PS need a per-kind hit radius? No.
  `Enemy.kind` is only `'tie' | 'darth'`, and the player's own kill test uses
  `TIE_HIT_RADIUS` for **every** enemy (`sim.ts`, the space beam sweep), so the single
  radius keeps the containment invariant true for Darth as well. No branch needed.
  *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No deviations at setup.

### TEA (test design)

- **The ROM's box∩octagon metric is pinned as a sphere**
  - Spec source: WSMAIN.MAC:3898-3932 (via context-story-uf1-12.md, AC-1)
  - Spec text: the hit needs `|dx| ≤ TMPSIZ`, `|dy| ≤ TMPSIZ` AND `|dx|+|dy| ≤ 1.5·TMPSIZ`;
    C$PS needs only `|dx|+|dy| ≤ 3·TMPSIZ` — an L1 diamond in projected screen space.
  - Implementation: the tests pin C_PS as a Euclidean ray-within-radius test (`beamHit`),
    the same shape the clone's kill test already uses.
  - Rationale: `gameRules.ts` already ported this exact ROM octagon that way, with a
    reviewed rationale ("an object is under the site exactly when the AIM RAY passes within
    its hit radius … reuses the hit radii the game already has instead of inventing a
    reticle size"). Re-deriving a screen-space diamond for C_PS alone would put the sights
    bit and the gun on two different geometries — the precise disagreement that doctrine
    exists to prevent. What ports is the ROM's ratio (3 ÷ 1.5 = 2), which is the only
    unit-free, radix-free, projection-free term in the expression.
  - Severity: minor
  - Forward impact: none — the containment the ROM guarantees (kill band ⊂ sights band) is
    pinned directly as a test, so the two machines cannot drift apart.

- ~~**C_PS's aim ray ignores viewport aspect**~~ — **WITHDRAWN 2026-07-29: this is no
  longer a deviation.** The user folded the fix into this story as **AC-6**, so C_PS is now
  required to use the gun's own aspect-aware ray and nothing is being accepted-as-divergent.
  The entry is kept below unedited, because the measurement in it is the evidence that
  justified the fold-in and because its first draft was wrong in a way worth recording.
  *(severity corrected after measurement — the first draft of this entry called it a
  "sub-degree edge case"; it is not, see below)*
  - Spec source: `src/core/sim.ts:298` / `gameRules.ts:49-51` (`aimDirection`)
  - Spec text: the gun beam is built as `aimDirection(aimX, aimY, input.aspect)`, and the
    shell supplies a REAL aspect (`canvas.clientWidth / canvas.clientHeight`,
    `src/shell/input.ts:45`), so in play it is ~1.78, not 1.
  - Implementation: the tests pin C_PS on `aimDirection(state.aimX, state.aimY)` at the
    default unit aspect, so the sights ray and the gun's ray are DIFFERENT rays whenever
    the yoke is off-centre on a non-square canvas.
  - Rationale: `aspect` is a shell/viewport value carried on `Input`, not on `GameState`,
    and `computeStatus(e, state, rng)` sees only `state`. Fixing it properly needs aspect
    (or the built ray) on `GameState`, which means editing `sim.ts` — 36 citation-gate line
    pins (see Delivery Findings) — so it is more than this story's derivation.
  - Severity: **major** — measured at 16:9 and depth 6000, the two rays separate by 269 u
    at yoke 0.1, **539 u at yoke 0.2**, 1347 u at 0.5 and 2694 u at full deflection; the
    entire sights band is only 500 u wide (2 × `TIE_HIT_RADIUS`). So from roughly a fifth
    of yoke travel onward the bands do not even overlap: C_PS fires for fighters the pilot
    is NOT aiming at and stays dark on the one they are. Angular divergence at full yoke is
    15.7°. This is not an edge case — it is the normal case in play, and it undercuts the
    very behaviour this story exists to make correct.
  - Forward impact: **RESOLVED — folded into this story as AC-6 by user decision.** The
    phase was walked back from `green` to `red`, the story re-pointed 3 → 5, and four tests
    added (two AC-6 geometry tests, a plumbing test, a default-aspect test). uf1-14 was
    re-scoped down to the *other* instance of the same root cause found while measuring
    this one — C_PV's ±45° pyramid is not the rendered frustum — which is independent,
    already shipping, and now depends on this story landing the viewport in `GameState`.

- **AC-3 is proven at the integration level, not the unit level**
  - Spec source: context-story-uf1-12.md, AC-3
  - Spec text: "The three C_PS-bearing CUNTIL gates in TCH1DZ release on C_PS alone, not
    only on their C_PN/C_AS/C_AG partners."
  - Implementation: the unit test asserting exactly that PASSES against unfixed code, so it
    is kept as a regression pin rather than presented as an AC proof; AC-3's real coverage
    is the in-play test, which fails today and passes under the fix.
  - Rationale: the VM was never the defect. `tickChoreo` fires any armed gate on
    `(status & untilMask) !== 0`, so all three already release on C_PS alone — the bit
    simply never arrives. Writing the unit test anyway was worth it precisely because its
    passing is the evidence that the gates need no change and Dev must not touch the VM.
  - Severity: minor
  - Forward impact: none — AC-3 is covered, just by the integration test rather than the
    unit test its wording implies.

### Dev (implementation)

- **The ROM ratio got a named constant instead of an inline `2 *`**
  - Spec source: TEA Assessment, "The probe: this contract is satisfiable, and cheap"
  - Spec text: `beamHit(spaceEye(state), aimDirection(…), e.pos, 2 * TIE_HIT_RADIUS)`
  - Implementation: `export const SIGHTS_BAND_FACTOR = 2`, carrying the
    `LSRD / ADDD TMPSIZ` vs `ADDD TMPSIZ / ADDD TMPSIZ` derivation in its doc comment,
    then `SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS` at the call site.
  - Rationale: no test asks for the constant, so by the minimal rule it is an addition.
    It earns its place on the file's own idiom — `FIRE_CONE_COS`, `PLAYER_NEAR_RANGE`,
    `VIEW_NEAR/FAR` are all exported ROM constants whose doc comment IS the citation, and
    a bare `2` in the middle of a `beamHit` call is the one number in this change a future
    reader would mistake for a tuning knob. It is exactly the shape the neighbours have.
  - Severity: minor
  - Forward impact: none — the tests pin the factor from an independent literal
    (`SIGHTS_FACTOR = 2` in the test file), so they cannot go vacuous if this is retuned.
    uf1-15 (the C_AS retune, filed as uf1-13) and uf1-14 touch different bits.

- **The `sim.ts` insertion is 5 lines, not 1**
  - Spec source: TEA Assessment, "Notes for Dev" #2
  - Spec text: "`sim.ts` needs exactly one line, and keep it to one: the shadow at the top
    of `stepGame`" — to minimise the citation-pin shift.
  - Implementation: the one code line plus a 4-line comment saying why the shadow exists
    (total +5), so the pins below moved by 5 rather than 1.
  - Rationale: the shift MAGNITUDE does not change the re-anchor cost — every pin below a
    single insertion point moves regardless, so the count is 22-23 either way (measured
    both times). What a bare `const state = { ...stateIn, aspect: input.aspect ?? 1 }`
    would not survive is the next reader: it looks like a pointless copy, and deleting it
    silently reintroduces the aspect-blind ray this story widened its scope to prevent.
    The comment is the guard on that.
  - Severity: minor
  - Forward impact: none — re-anchored and the gate is green (12/12). uf1-14 inherits the
    shadow with its rationale attached, which is the point.

- **C_PS reads the frame's OWN yoke, not `state`'s incoming aim — contradicts TEA's Notes #3**
  - Spec source: TEA Assessment, "Notes for Dev" #3
  - Spec text: "Derive from `state.aimX/aimY`, `state.aspect` and `spaceEye(state)` — one game
    frame behind `input`, which matches the beam-origin doctrine already in `sim.ts`."
  - Implementation: `stepGame`'s shadow now carries the frame's aim as well as its aspect
    (`{ ...stateIn, aimX: input.aimX, aimY: input.aimY, aspect: input.aspect ?? 1 }`), so
    `computeStatus` reads THIS frame's yoke. The derivation still reads `state`, exactly as
    instructed — what changed is that `state`'s aim is now the current sample.
  - Rationale: the doctrine is right about the ORIGIN and does not transfer to the DIRECTION.
    `beamOrigin` is a `state.frame` derivation (`spaceEye`), so origin agreement is automatic
    and was already correct. But the gun's DIRECTION is taken live from `input`
    (`beamDir = aimDirection(aimX, aimY, input.aspect)`, `aimX = input.aimX`), so following
    the origin's doctrine for the aim desynchronised the two rays by a frame. Measured at
    depth 6000 / 16:9: a one-frame yoke move of 0.1 separates them by 613 u against a 500 u
    band, and the laser then kills fighters C_PS reports as absent — the same failure AC-6
    was folded in to prevent. The cabinet cannot do this: the laser hit (1.5x TMPSIZ,
    WSMAIN.MAC:3906) and the sights bit (3x TMPSIZ, :3922) are computed from ONE `TMPOCT`
    off ONE `LZ.CX/LZ.CY` sample, twelve lines apart in the same pass. Primary source beats
    an internal doctrine.
  - Severity: minor (the deviation; the defect it fixes was moderate)
  - Forward impact: none outside this bit — `state.aimX/aimY` have exactly ONE mid-step
    reader core-wide (`tie-status.ts`, grepped) and every return already wrote these same
    values. uf1-14 inherits a shadow that now carries the whole crosshair, which is what its
    own frustum work will need.

## SM Assessment

**Verdict:** setup complete — handing to TEA (Mr. Praline) for the RED phase.

**What was set up**
- Branch `feat/uf1-12-c-ps-loiter-branch` cut from `origin/develop` in `star-wars`
  (gitflow: PR targets `develop`, never `main`).
- Story moved `backlog` → `in_progress` in `sprint/epic-uf1.yaml`; the epic YAML diff
  was inspected and is clean (status + started only, no round-trip damage).
- Story context at `sprint/context/context-story-uf1-12.md`, committed as `a113361`.

**Setup-phase corrections worth knowing**
1. `sm-setup` returned the **generic stub** for Technical Approach and Scope — none
   of the provenance/precedent/quarry pointers passed to it survived into the file.
   I rewrote both sections by hand. Anyone re-running `pf context create` for this
   story will clobber them; don't.
2. The story arrived `backlog` after setup — `sm-setup` did not move it. Set
   manually via `pf sprint story update`.

**Verified, not assumed**
- No sibling-checkout race: `git fetch` + `git log origin/develop --grep=uf1-12`
  returns nothing, and `gh pr list` shows **zero open PRs** on `slabgorb/star-wars`.
  Merge gate is clear.
- The ROM citation the whole story rests on is real. `WSMAIN.MAC:3930` in
  `/Users/slabgorb/Projects/star-wars-1983-source-text` reads
  `CHSET C$PS ;STATUS: ALIEN IN PLAYER SITES`, sitting inside an `?ALIVE?` guard
  (`BNE 86$` / `LDD A$CHST(X)` … `STD A$CHST(X)`). TEA has a real quarry to work
  from, not a phantom line number.
- uf1-3 (the `C_AH` precedent this story mirrors) is on `origin/develop` as
  `94905d7` / star-wars#137.

**Routing note for TEA**
Read `sprint/archive/uf1-3-session.md` first — this story was filed *from* that
story's RED phase and its Delivery Findings carry the original `C_PS` finding plus
pre-extracted quarry. AC-1 has a genuine open question inside it (whether the ROM
gate yields a portable threshold that could also retire the inferred 12°
`FIRE_CONE_COS` on `C_AS`); if it does not, the AC explicitly permits a logged
deviation. Widening into a real `C_AS` retune is a **separate story to file**, not
this one's scope.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (10 failing — ready for Dev)

**Test Files**
- `tests/core/tie-sights-status.test.ts` — the C_PS derivation: band geometry, the
  kill/sights containment invariant, the moving eye, the yoke, RNG neutrality (AC-1).
- `tests/core/tie-loiter-sights.test.ts` — TCH1DZ_20 reachability, the three CUNTIL
  gates, the in-play proof, and the AC-5 scope-note guard (AC-2, AC-3, AC-5).

**Tests Written:** 23 across 6 ACs. Full suite **2029 tests / 189 files: 14 red, 2015
green**. Baseline before this story was **2006 / 187**, so 2006 + 23 = 2029 exactly —
**zero collateral, and no sibling test needed re-seating.**

> **Scope changed mid-phase.** This story shipped its first RED at 19 tests / 5 ACs. After
> handoff, TEA measured the aspect deviation it had just logged, found it major rather than
> minor, and the user folded uf1-14's C_PS half in as **AC-6**. The phase was walked back
> to `red`, the story re-pointed 3 → 5, and four tests added. Everything below reflects the
> final state.

### AC-1 is answerable from the ROM — it is not a cone, and no deviation is needed

The story asked for "a rule cited to WSMAIN.MAC:3930, **or** a logged deviation if no
portable threshold exists." There is one, and it is exact. `WSMAIN.MAC:3880-3932` computes
two scratch values once per object per frame — `TMPSIZ` (projected size + cursor size) and
`TMPOCT` (`|dx| + |dy|` from the crosshair) — then uses **the same two** for both the
player's laser hit and the sights bit:

| | ROM arithmetic | test |
|---|---|---|
| kill | `LSRD / ADDD TMPSIZ ;MAKE 1.5 FOR OCTAGON` (:3904-3906) | `TMPOCT ≤ 1.5·TMPSIZ` |
| sights | `ADDD TMPSIZ / ADDD TMPSIZ ;ALLOW LARGER WARNING AREA` (:3920-3923) | `TMPOCT ≤ 3·TMPSIZ` |

So **C_PS is the kill band, doubled** — 3 ÷ 1.5 = exactly 2. That factor is the only term
in the whole expression that is unit-free, radix-free and projection-free, which is
precisely why it is the part that survives the port. The clone therefore needs no new
constant and no invented cone: `beamHit(…, 2 × TIE_HIT_RADIUS)`.

Two things fall out for free. The ROM's `?ALIVE?` guard (`A$TYP == 1`, :3926-3928) needs no
port — `state.enemies` holds only live fighters, killed ones move to `dyingTies`. And the
"must be drawn" gate the CHSET inherits from sitting inside the draw pass comes free from
`beamHit`, which refuses any target behind the gun.

### The probe: this contract is satisfiable, and cheap

Per the sidecar rule, I wrote a throwaway implementation against my own contract before
handing it over — twice, once per scope. **All 23 pass**, on:

- `state.ts` — `aspect: number` on `GameState`, `aspect: 1` in `initialState`;
- `sim.ts` — **one line**. Every return in `stepGame` funnels through `finalizeFrame` and
  spreads `...state`, so shadowing the parameter once at the top carries the viewport to
  every path: `stepGame(stateIn, …)` → `const state = { ...stateIn, aspect: input.aspect ?? 1 }`.
  No per-return-site plumbing, no `StepCommon` change;
- `tie-status.ts` — ~6 lines: `beamHit(spaceEye(state), aimDirection(state.aimX, state.aimY,
  state.aspect), e.pos, 2 * TIE_HIT_RADIUS)`.

`computeStatus`'s signature does not change. Full suite under the probe: **2029 tests, 2027
green — and the only two failures are the citation gate**, exactly as predicted.

**The citation cost is measured, not guessed: 22 of `sim.ts`'s 36 pinned lines shift** (the
ones below the insertion point), reddening `tests/audit/citations.test.ts`. That is now an
unavoidable, known chore rather than a surprise — re-anchor after implementing. It is also
why the one-line shadow is the right shape: it perturbs the fewest lines possible.

All three sources were restored from scratchpad copies (never `git checkout`) and proved
byte-identical by md5 (`dc7747d3…`, `5a636a7c…`, `e8677159…`), with a control run confirming
the red is back (14/23) and the citation gate green again (12/12).

### Mutation battery (AC-4)

| # | Mutation | Red | Killed by |
|---|----------|-----|-----------|
| M1 | pin C_PS false | **8** | incl. **the TCH1DZ_20 in-play reachability test** — AC-4 satisfied |
| M2 | factor 1 (reuse the kill radius unchanged) | 1 | the 2× boundary test |
| M3 | factor 3 (over-wide band) | 1 | the 2× boundary test |
| M4 | measure from the origin, not `spaceEye` | 2 | moving-eye test + in-play |
| M5 | ignore the yoke (`aimDirection(0,0)`) | 2 | yoke test + in-play |
| M6 | drop aspect — the original aspect-blind ray | 2 | both AC-6 geometry tests |
| M7 | `sim.ts` never plumbs the viewport | 1 | the AC-6 plumbing test |

Every guard has a killer. Note M2/M3 are caught by a single test — the ±1 boundary probe is
the sole guard on the factor, deliberately so: it pins the value from both sides rather than
re-deriving it from the constant under audit. M6 is the mutation that reproduces the exact
bug this story's scope was widened to prevent.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| core purity (no DOM/clock/`Math.random`) | existing `core-purity.test.ts`; new tests add no impure surface | passing |
| determinism — seeded RNG only | `costs no extra RNG …` (a conditional draw would desync the core) | failing |
| no vacuous assertions | self-check: dropped one `isFinite`-style test; every sweep carries a non-empty guard | n/a |
| `x ?? default` vs `\|\|` | n/a — no new optional-field reads | n/a |
| type-safety escapes (`as any`, `as unknown as`) | none introduced | n/a |
| citation-gate line pins | fix scoped to files with zero pins (verified: sim.ts 36, tie-status.ts 0) | n/a |

**Rules checked:** 6 of 6 applicable. **Self-check:** 1 vacuous test found and removed; 1
over-constraining assertion fixed (it required a scope-note phrase to survive a fix that may
legitimately delete it).

### Notes for Dev (Bicycle Repair Man)

1. **Do not touch `tie-vm.ts`.** The VM is already correct — all three CUNTIL gates release
   on C_PS alone today; the bit simply never arrives. Touch `state.ts`, `sim.ts` (one line)
   and `tie-status.ts`, nothing else.
2. **`sim.ts` needs exactly one line**, and keep it to one: the shadow at the top of
   `stepGame`. Then **re-anchor the citation gate** — 22 of its 36 `sim.ts` pins will move.
   Run `npx vitest run tests/audit/citations.test.ts` and fix the line numbers in
   `docs/audit/findings/*.json`; do not "fix" it by reverting the plumbing.
3. **Derive from `state.aimX/aimY`, `state.aspect` and `spaceEye(state)`** — one game frame
   behind `input`, which matches the beam-origin doctrine already in `sim.ts` ("the eye the
   pilot actually sighted down"). The aspect must be the gun's, not the default 1: that is
   AC-6, and M6 shows exactly which tests catch getting it wrong.
4. **AC-5 wants the header comment fixed**, and the guard is deliberately permissive: it
   does not require any particular wording, only that no surviving scope note describes
   C_PS as pending, that C_AD/C_AV/C_PM stay documented as correctly absent with the
   `/PLEASE DELETE/` reason, and that `WSMAIN.MAC:39xx` is cited.
5. **Leave `FIRE_CONE_COS` and its `TODO(playtest)` alone** — uf1-13 owns it [now
   **uf1-15**, see the renumber note in Delivery Findings]. Likewise
   leave `C_PV`'s ±45° pyramid alone — uf1-14 owns it, and it depends on the `GameState`
   viewport this story lands.

**Handoff:** To Dev for implementation.
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 2029/2029 passing (189 files) — GREEN, citation gate 12/12
**Branch:** `feat/uf1-12-c-ps-loiter-branch` (pushed; `cfcfe8e`, `27e1606`)

**Files Changed**
- `src/core/tie-status.ts` — the C_PS derivation (`beamHit` on the gun's own ray at
  `SIGHTS_BAND_FACTOR × TIE_HIT_RADIUS`), the new constant with its ROM derivation, and
  the AC-5 header rewrite.
- `src/core/state.ts` — `aspect: number` on `GameState`, `aspect: 1` in `initialState`.
- `src/core/sim.ts` — the `stepGame` viewport shadow (one code line + why).
- `docs/audit/findings/*.json` — 23 live `ours` pins re-anchored (9 files, line numbers
  only).
- `src/core/tie-vm.ts` — **untouched**, as instructed. The VM was never the defect.

**How each AC is met**
| AC | Evidence |
|----|----------|
| 1 — rule cited to WSMAIN.MAC:3930 | `SIGHTS_BAND_FACTOR = 2`: the kill band's `LSRD / ADDD TMPSIZ` (1.5×, :3904) vs the sights' `ADDD TMPSIZ / ADDD TMPSIZ` (3×, :3920). No deviation needed — TEA's derivation held. |
| 2 — TCH1DZ_20 reachable | 4 unit tests on the branch + the in-play run; **M1 reddens exactly the in-play reachability test** (verified against this implementation, not the probe). |
| 3 — the three CUNTIL gates release on C_PS alone | passing (they always did — the bit simply never arrived). |
| 4 — mutation-proven | re-run against the real code: M1 → 10 red incl. the named test; factor 1 → 1 red; factor 3 → 1 red; M6 aspect-blind → 2 red; M7 no plumbing → 1 red. Control: 23/23 green, tree clean. |
| 5 — header comment | C_PS now recorded as derived; C_AD/C_AV/C_PM kept as correctly-absent with the `/PLEASE DELETE/` annotation; AC-5 guard green. |
| 6 — the gun's ray, aspect included | `state.aspect` from the `stepGame` shadow; both AC-6 geometry tests + the plumbing test + the default-aspect test green. |

**Verified, not assumed**
- The mutation battery was **re-run against this implementation** rather than trusted from
  TEA's probe, and M1's killer is specifically
  `reaches TCH1DZ_20 while the player keeps it in the sights` — AC-4's literal wording.
- No sibling race: `git fetch` + `git log origin/develop --grep=uf1-12` is empty,
  `gh pr list` shows no open PRs, and the branch is 0 commits behind `origin/develop`.
  (The ORCHESTRATOR was 2 behind — a sibling landed uf1-6 — so `td1-13` was checked
  against `origin/main`'s td1 ids before filing, and 13 was free.)
- The findings re-anchor changed line numbers ONLY: 23 insertions, 23 deletions across 9
  files, no reformatting, `remediated_by` findings untouched.
- Self-caught during review: my own C_PS comment cited `sim.ts:298`, a line this story's
  shadow pushed to 303. Fixed in `27e1606` by naming `beamDir` instead — a comment pin is
  outside the citation gate, so a stale one just misleads quietly.

**Notes for the Reviewer (The Argument Professional)**
1. `SIGHTS_BAND_FACTOR` and the 5-line `sim.ts` insertion are both **logged deviations**
   from TEA's probe shape — the reasoning is in Design Deviations, argue with it there.
2. The riskiest thing in this diff is not the derivation, it is
   `docs/audit/findings/*.json`. Two pins had non-unique verbatims and were resolved by
   the uniform shift; if you check one thing, check that S-016 still points at the SPACE
   `damage++` (`sim.ts:616`) and not the surface one (1016/1101). Hazard filed as td1-13.
3. `state.aspect` and `input.aspect` are the same value by construction; `sim.ts`'s beam
   still reads `input.aspect` directly. Left alone deliberately — no test asks for it and
   the values cannot diverge within a step.

**Handoff:** To Reviewer (The Argument Professional) for the review phase.
## Subagent Results

| Subagent | Received | Findings |
|----------|----------|----------|
| reviewer-preflight | Yes | Enabled, but run DIRECTLY by the reviewer rather than spawned (session directive: do not call the Agent tool unless the user asks). Data: `npx vitest run` → 189 files / 2029 tests, all green; `npm run lint` (tsc --noEmit) clean; working tree clean; branch in sync with its remote; diff vs `origin/develop` = 14 files (3 src, 2 tests, 9 findings JSON); debug scan (`console.log`/`debugger`/`.only(`) → none. |
| reviewer-edge-hunter | Yes | Skipped / disabled (`workflow.reviewer_subagents.edge_hunter: false`) — domain assessed directly: **F2**, F4, plus VERIFIED phase-scoping and origin-agreement below. |
| reviewer-silent-failure-hunter | Yes | Skipped / disabled — assessed directly: no swallowed errors in the diff; the one silent fallback (`input.aspect ?? 1`) is a documented optional-field default and is pinned by a test. |
| reviewer-test-analyzer | Yes | Skipped / disabled — assessed directly via a re-run mutation battery (below); no vacuous assertions found, the AC-5 scan carries a load-bearing `status \|= Status.C_PS` guard, and the `?? 1` default is genuinely killed by the plumbing test. |
| reviewer-comment-analyzer | Yes | Skipped / disabled — assessed directly: **F1** (a FALSE primary-source claim) and **F2**'s two overclaims. Every other ROM line pin re-opened and matched. |
| reviewer-type-design | Yes | Skipped / disabled — assessed directly: `aspect: number` is required (not optional) so tsc forces every constructor to supply it; `initialState` is the only one. No casts, no `as any`, no stringly-typed surface. |
| reviewer-security | Yes | Skipped / disabled — assessed directly: no I/O, no secrets, no untrusted input in the diff. Nothing to report. |
| reviewer-simplifier | Yes | Skipped / disabled — assessed directly: **F5** (trivial, accepted). |
| reviewer-rule-checker | Yes | Skipped / disabled — assessed directly against `gates/lang-review/typescript` + CLAUDE.md's core-purity rule: no type-safety escapes, no `\|\|` defaulting on a 0-valid field, core stays pure (no DOM/clock/`Math.random`; the new code adds no impure surface and the purity suite passes). |

**All received:** Yes (1 run directly, 8 disabled by settings and assessed by the reviewer)

## Reviewer Assessment

**Verdict:** REJECTED — two must-fix findings, one of which is a false primary-source claim
in the very comment AC-5 makes load-bearing.

The derivation itself is right, cited correctly, and mutation-proven; I re-opened every ROM
line it pins and re-ran the battery against the real implementation rather than trusting the
Dev Assessment. What fails review is (F1) a ROM claim in the new header that the source
contradicts, and (F2) the ray C_PS actually measures against, which is not the gun's — the
one thing AC-6 exists to guarantee.

### F1 — MUST FIX (major). The new AC-5 header states something the ROM contradicts.

`src/core/tie-status.ts:10-18` now reads: *"neither C_AV nor C_PM has a setter, nor a gate
anywhere in the assembled program."* The first half is false. The cabinet sets **both**:

| bit | `CHSET` sites tree-wide | where |
|-----|------------------------|-------|
| `C$AD` | **0** | — (the `/PLEASE DELETE/` equate, WSCPU.MAC:28) |
| `C$AV` | **1** | `WSCPU.MAC:613` — "ALIEN HAS PLAYER IN FRONT VIEW", inside the same routine as the C$AS gate |
| `C$PM` | **1** | `WSMAIN.MAC:3780` — "THEN SET PLAYER MIDDLE DISTANCE", seven lines above the C$PN setter this file DOES port (:3787) |
| `C$PS` | **1** | `WSMAIN.MAC:3930` — the one this story wires |

The story's own wording was careful in exactly the place this rewrite is not: it attached
"never sets" to **C_AD alone** and used *"the program does not gate on any of the three"* as
the shared reason. That second clause is true and verified — `C_AV`/`C_PM` appear in
`tie-vm.ts` only at their equates (:41, :48), in no `CIF`/`CUNTIL` mask. Collapsing the two
into one sentence produced a claim the primary source refutes.

Why this is major rather than cosmetic: AC-5 requires these three stay documented *with the
ROM reason they are correctly absent*, and its guard (`tie-loiter-sights.test.ts:236-243`)
can only check that the names and `/PLEASE DELETE/` appear — **it cannot see that the reason
is wrong.** So this ships as green. The next fidelity sweep reads "C_AV has no setter",
concludes it is dead design language like C_AD, and permanently writes off two bits the
cabinet genuinely maintains — one of them (`C$AV`) sitting in the routine uf1-15 is about to
open. That is the opposite of what AC-5 was written to achieve.

**Fix:** restore the story's distinction — C_AD is dead (zero setters, `/PLEASE DELETE/`);
C_AV and C_PM *are* set by the cabinet but the assembled choreography gates on neither, so
deriving them would be dead computation. No story to file: they remain correctly absent,
just for a different and accurately-stated reason.

### F2 — MUST FIX (moderate). C_PS is not measured against the ray the gun fires.

AC-6's requirement is "the same ray the gun uses". The aspect now matches and the origins
match, but the AIM does not:

| | origin | aim | aspect |
|---|---|---|---|
| gun (`sim.ts:302-303`) | `spaceEye(state)` | `input.aimX/aimY` — **this** frame's yoke (`:148`) | `input.aspect` |
| C_PS (`tie-status.ts:147`) | `spaceEye(state)` — identical | `state.aimX/aimY` — the **previous** frame's yoke | `state.aspect` ✓ |

`state.aimX` is last frame's input because every active-play return writes the local `aimX`
(= `input.aimX`) into the state it returns (`sim.ts:316`, `:655`, `:1130`, `:1218`), so the
state *entering* a step still carries the prior sample. Verified the origins genuinely agree:
`frame++` at `:400` increments a **local**, not `state.frame`, so `spaceEye(state)` returns
the same point in both places.

Measured at depth 6000 on 16:9 — a **one-frame** yoke change is enough to break the
containment invariant this story pins as a test:

| one-frame yoke delta | ray separation | laser can kill? | C_PS reports in sights? |
|---|---|---|---|
| 0 → 0.05 | 308 u | yes | yes |
| 0 → 0.1 | **613 u** | yes | **no** |
| 0.1 → 0.2 | 601 u | yes | **no** |
| 0 → 0.3 | 1786 u | yes | **no** |
| 0 → 0.5 | 2818 u | yes | **no** |

The band is 500 u wide, so from a tenth of yoke travel in a single 30 Hz frame — an ordinary
mouse movement — the pilot's laser kills a fighter the sights bit says is not there. That is
the same failure mode, at the same magnitude, as the aspect bug the user folded in as AC-6
(539 u at yoke 0.2).

**The cabinet cannot do this**, and that is what settles it. Both predicates come from ONE
`TMPOCT` built from ONE `LZ.CX/LZ.CY` cursor sample in straight-line code: `TMPSIZ`/`TMPOCT`
at `WSMAIN.MAC:3881-3897`, the laser hit at `1.5 × TMPSIZ` (`:3906`), then twelve lines later
the sights bit at `3 × TMPSIZ` (`:3922`) reusing the same scratch pair. There is no frame in
which the ROM's gun and sights disagree about where the crosshair is.

**Fix** is on the line Dev already added, and only C_PS is affected by it:
```ts
const state: GameState = { ...stateIn, aimX: input.aimX, aimY: input.aimY, aspect: input.aspect ?? 1 }
```
`state.aimX`/`state.aimY` have exactly **one** mid-step reader core-wide (`tie-status.ts:147`
— grepped), and every return already overwrites them with these same values, so the change is
inert everywhere except the bit under review.

**This contradicts TEA's explicit instruction** (Notes for Dev #3: derive from
`state.aimX/aimY` … "one game frame behind `input`, which matches the beam-origin doctrine").
The doctrine is sound for the ORIGIN, which is a `state.frame` derivation; it does not
transfer to the DIRECTION, which the gun takes live from `input`. Following it for the
direction desynchronises the exact pair the ROM computes together. Dev must log this as a
deviation from the RED contract rather than silently diverging from it.

Two comments overclaim the same thing and must come down with the fix: *"hence `beamHit` and
the gun's own ray, aspect included"* and *"Read one game frame behind `input`, off `state`,
exactly like the beam origin"*.

### F3 — NOTE (accepted, inherited). The band drops the ROM's constant cursor term.

The cabinet's band is `3 × (projected size + #10. cursor size)` (`:3881`); the port is
`2 × TIE_HIT_RADIUS`, purely proportional. At long range, where the projected size vanishes,
the cabinet still grants a fixed ~30-unit screen tolerance and the clone grants ~0. This is
inherited from the pre-existing kill-test port (gameRules.ts's octagon doctrine drops the
same constant, which is *why* the 2× ratio is exact) and is covered in spirit by TEA's logged
"box∩octagon pinned as a sphere" deviation — though that entry describes the shape change
(L1 → Euclidean) and not the dropped constant. Behaviourally the load-bearing part survives:
the warning band is strictly wider than the kill band, by exactly the ROM's factor. No action
in this story; naming it so a future reader does not mistake it for an oversight.

### F4 — NOTE (no action). `aspect: 0` is passed through, not defaulted.

`input.aspect ?? 1` does not catch `0`, and the shell's guard covers only the denominator
(`clientHeight > 0`, `shell/input.ts:45`) — a zero-WIDTH canvas yields `aspect === 0`, which
zeroes the ray's horizontal term. The gun does exactly the same thing with the same value, so
the sights and the laser still agree, which is the invariant that matters here. Pre-existing
and consistent; `??` is also what the TS checklist prescribes.

### F5 — NOTE (accepted, trivial). `SIGHTS_BAND_FACTOR` has no consumer outside its own file.

The tests deliberately pin the factor with their own literal, so the export is unused. It
matches the file's idiom (every ROM constant here is exported and carries its derivation) and
Dev logged it as a deviation with that rationale. Accepted.

### VERIFIED (challenged, with line evidence)

- **Phase scoping is correct.** `computeStatus` has exactly one caller — `sim.ts:402`, inside
  the space-phase decision tick — so `spaceEye` is the right eye for it and the surface/trench
  steps (which use `shipPoint`) never reach it.
- **AC-4 holds against the real implementation, not the probe.** Re-ran: M1 (pin C_PS false)
  → 10 red including `reaches TCH1DZ_20 while the player keeps it in the sights`, which is
  AC-4's literal wording; factor 1 → 1 red; factor 3 → 1 red; M6 (aspect-blind ray) → 2 red;
  M7 (no plumbing) → 1 red; control restored → 23/23 green, tree clean.
- **Every ROM pin in the new comments re-opened and matched**: `:3881` cursor size, `:3906`
  the 1.5× octagon, `:3922` the doubling, `:3927-3928` the `?ALIVE?` guard, `:3930` the CHSET
  — and it IS the sole `CHSET C$PS` tree-wide (grepped all `*.MAC`).
- **The findings re-anchor is right.** The repo's own `tools/audit/reanchor-citations.mjs`,
  run against the result, independently reports "96 already correct, 0 re-anchored, 0 lost";
  `remediated_by` pins were left frozen.
- **Core purity intact**, tsc clean, 2029/2029 green, no debug code, no type-safety escapes.

### What Dev must do

1. Fix F1 — restore the C_AD-vs-(C_AV, C_PM) distinction with the accurate ROM reason.
2. Fix F2 — carry the aim in the existing shadow, correct the two overclaiming comments, and
   log the deviation from TEA's Notes-for-Dev #3.
3. Re-run the full suite. F2 touches `sim.ts` line content but adds no lines, so the citation
   pins should NOT move — confirm with `node tools/audit/reanchor-citations.mjs` (expect
   "0 re-anchored") rather than assuming it.
4. No new test is demanded for F1 (the claim is prose the guard cannot check), but F2 is
   testable and should not ship on prose alone: a test that drives `stepGame` with a yoke that
   JUMPS between frames and asserts the sights bit tracks the frame's own aim would have caught
   it. TEA's call whether that belongs here or in a follow-up.

**Handoff:** Back to Dev (Bicycle Repair Man) for the two fixes.
## Dev Assessment — round 2 (review fixes)

**Implementation Complete:** Yes
**Tests:** 2031/2031 passing (189 files) — GREEN. Story tests 25 (was 23 at first handoff:
+1 for F2's regression pin, +1 for F1's citation pin).
**Branch:** `feat/uf1-12-c-ps-loiter-branch` (pushed; `e2fe561`, `9035f90`)

**Both findings fixed, and both are now mutation-guarded.**

| # | Fix | Killer mutation |
|---|-----|-----------------|
| F1 | The header keeps the two reasons apart: C_AD is dead design language (zero setters, `/PLEASE DELETE/`); C_AV and C_PM ARE set by the cabinet (`WSCPU.MAC:613`, `WSMAIN.MAC:3780`) but the assembled choreography gates on neither, so deriving them would be dead computation. Points at the setters so the pair is findable if a revision ever gates on them. | **M10** — blanking `WSCPU.MAC:613` reddens the new pin. Before it, **M9 (reverting to the false claim) passed all 24 tests**, which is exactly why the pin was added rather than trusting prose. |
| F2 | `stepGame`'s shadow now carries the frame's aim as well as its aspect, so `computeStatus` rebuilds the gun's ray exactly — same eye, same aspect, same yoke. Both overclaiming comments rewritten to say what is actually true, and the ROM's one-cursor-sample argument recorded. | **M8** — the stale-aim version reddens the new single-frame-flick test, and **nothing else in the 2031-test suite catches it**, which confirms the reviewer's point that it shipped invisibly. |

**Verified, not assumed**
- Deviation from TEA's Notes-for-Dev #3 logged in Design Deviations with the ROM argument
  (the origin doctrine holds; it does not transfer to the direction).
- The F2 regression test is a genuine end-to-end discriminator, not a seam test: it seats a
  fighter's VM on the `.CIF C$PS` branch and steps ONE frame with the yoke flicking onto a
  target 2818 u off the at-rest ray, then asserts the VM entered 20$.
- Citation pins re-anchored with **the repo's own** `tools/audit/reanchor-citations.mjs` this
  time (74 correct, 22 moved, 0 lost); re-run confirms 96/0/0 and the diff is 22 insertions /
  22 deletions — line numbers only.
- Committed BEFORE mutating. The first battery this round was run on uncommitted source and
  `git checkout --` silently took the F2 fix with it; caught it because the control run failed,
  re-applied, and re-ran. The sidecar already carries this lesson — I re-learned it anyway.
- F3/F4/F5 (the reviewer's notes) were accepted as noted, with no code change: F3 is an
  inherited simplification covered by TEA's logged deviation, F4 is behaviour the gun shares
  identically, F5 is the file's documented-constant idiom.

**Handoff:** Back to Reviewer (The Argument Professional) for re-review of the two fixes.
## Reviewer Assessment — round 2

**Verdict:** CHANGES REQUESTED — one new finding (F6, minor). F1 and F2 are both properly
fixed and I verified them independently rather than reading Dev's table.

### F1 — VERIFIED FIXED, citations re-opened in the primary source

| claim in the header | source line, re-opened this round |
|---|---|
| `CHSET C$AV` at WSCPU.MAC:613 | `613: CHSET C$AV` ✓ |
| …"in the same routine as the C$AS gate" | `617: CMPD #20 ;?AIMING NEAR SHIP?`, `620: CHSET C$AS` — same block ✓ |
| `CHSET C$PM` at WSMAIN.MAC:3780 | `3780: CHSET C$PM ;THEN SET PLAYER MIDDLE DISTANCE` ✓ |
| …"seven lines above the C$PN setter at :3787" | `3787: CHSET C$PN ;THEN SET PLAYER NEAR` — exactly 7 ✓ |
| C_AD alone has zero setters | `CHSET` counts tree-wide: C$AD 0, C$AV 1, C$PM 1, C$PS 1 ✓ |

The two reasons are now kept apart, and the new pin (M10-proven) stops the false version
returning silently. Accepting the pin as the right shape: it constrains the FACTS, not the
prose, which is what TEA's permissive-guard doctrine asks for.

### F2 — VERIFIED FIXED, and it buys more than it was asked for

The shadow now carries the frame's yoke, so C_PS's three terms all match the gun's. I checked
the blast radius myself rather than taking "inert elsewhere" on trust: every other mid-step
aim reader in `sim.ts` uses the LOCAL `aimX`/`aimY` consts (`:311` beamDir, `:775` the select
cursor, `:941` altitude, `:937`/`:1179` via `StepCommon`), and `state.aimX` has no core reader
outside `tie-status.ts`. Nothing wanted the stale value.

Unasked-for bonus worth recording: `shell/render.ts:644` and `:1087` draw the crosshair from
`state.aimX/aimY`, which is the same value the shadow now feeds C_PS. So the sights bit agrees
with the reticle the pilot actually sees on the glass, not merely with the gun. That closes
the sw7-16 "aim == view" promise for this bit too.

### F6 — MUST FIX (minor). Half of F2's fix has no guard: nothing moves the yoke vertically.

`aimDirection` applies `aspect` only to the X term, so the aspect mutations are caught by
X-axis fixtures. **The aim staleness is not axis-specific, but the tests are.** Mutation
results against the fixed code:

| mutation | result |
|---|---|
| shadow drops **both** aim terms (F2's original bug) | 1 red ✓ |
| shadow drops `aimX` only | 1 red ✓ |
| shadow drops **`aimY`** only | **25 passed — invisible** |
| shadow drops `aspect` only | 1 red ✓ |
| origin instead of the moving eye | 2 red ✓ |
| aim axes transposed | 4 red ✓ |

Grepped every fixture in both story files: **not one sets a non-zero `aimY`.** With `aimY: 0`
on both sides of the seam, a stale vertical aim is indistinguishable from a fresh one, so a
future edit can drop `aimY` from the shadow and reintroduce exactly half of F2 with a green
suite. For a bit whose entire purpose is that two rays agree — and which already shipped once
with a ray bug that only measurement caught — leaving one axis unguarded is not good enough.

**Fix:** make the single-frame flick DIAGONAL (e.g. yoke 0 → (0.4, 0.3), fixture placed on
that ray). One test then kills both partial mutations, since dropping either component swings
the ray off the band. No new test needed.

### Everything else re-checked

- 2031/2031 green, tsc clean, tree clean, branch pushed, no debug code, no type escapes.
- Test count math holds: 2006 baseline + 25 story tests = 2031, so still zero collateral.
- Citation pins: `tools/audit/reanchor-citations.mjs` reports 96 correct / 0 moved / 0 lost;
  the findings diff is 22 insertions / 22 deletions, line numbers only; `remediated_by`
  findings untouched (the tool skips them by construction, `check-citations.mjs:117`).
- F3/F4/F5 remain notes; I re-read the aspect-0 path and stand by "consistent with the gun".

**Handoff:** Back to Dev for F6 — one fixture, then re-review.
## Dev Assessment — round 3 (F6)

**Implementation Complete:** Yes
**Tests:** 2031/2031 (189 files). Same count — F6 needed no new test, only a better fixture.
**Branch:** pushed (`97a8ebe`)

The single-frame flick is now diagonal (yoke 0 → 0.4, 0.3) with the fixture on that ray, and
the incoming-parked guard checks both axes. Committed BEFORE mutating this time, then re-ran
the partial-mutation set:

| mutation | before F6 | after F6 |
|---|---|---|
| shadow drops `aimY` only | **25 passed (invisible)** | **1 red** ✓ |
| shadow drops `aimX` only | 1 red | 1 red ✓ |
| shadow drops `aspect` only | 1 red | 1 red ✓ |
| shadow drops both aim terms (F2's bug) | 1 red | 1 red ✓ |

Control 25/25, tree clean, citation pins 96/0/0.

**Handoff:** Back to Reviewer for the final pass.
## Reviewer Assessment — round 3 (final)

**Verdict:** APPROVED

F6 is closed, and I verified it geometrically rather than by re-reading the mutation table.
The diagonal fixture is genuinely discriminating on each axis independently — probing the
band directly with the shared helpers:

| ray the sights bit would build | target at (0.4, 0.3) · 6000 |
|---|---|
| full diagonal (0.4, 0.3) | **IN band** |
| `aimY` lost → (0.4, 0) | out of band |
| `aimX` lost → (0, 0.3) | out of band |
| both lost → (0, 0) | out of band |

So each component is load-bearing in the fixture itself, which is what makes the four
partial mutations red. The vertical blind spot is gone.

### Final state, verified this round

- **2031/2031 green** (189 files), tsc clean, tree clean (no stray probe files — I wrote two
  throwaway measurement tests this review and both are removed), branch pushed and in sync.
- **Zero collateral:** 2006 baseline + 25 story tests = 2031 exactly.
- **Citation gate** 12/12; `reanchor-citations.mjs` reports 96 correct / 0 moved / 0 lost;
  `remediated_by` pins frozen.
- **Blast radius of the aim shadow re-confirmed:** `hoverFromAim` (`sim.ts:770`) takes plain
  parameters and is called with `input.aimX/aimY`, so select-mode hover is untouched; every
  other mid-step aim reader uses the local consts; `state.aimX` still has exactly one core
  reader. The shell's crosshair (`render.ts:644`, `:1087`) reads the returned state, which
  carried this frame's aim before and after — so the reticle, the gun and now the sights bit
  are all built from one sample.

### AC ledger

| AC | Status | Evidence |
|----|--------|----------|
| 1 — C_PS derived from a rule cited to WSMAIN.MAC:3930 | ✅ | `SIGHTS_BAND_FACTOR = 2` from `1.5×TMPSIZ` (:3906) vs `3×TMPSIZ` (:3922); the CHSET at :3930 re-opened and confirmed the sole one tree-wide. No deviation needed. |
| 2 — TCH1DZ_20 proven reachable | ✅ | 4 unit tests on the branch + the in-play run + the new single-frame flick. |
| 3 — the three CUNTIL gates release on C_PS alone | ✅ | passing; the VM needed no change, which the test proves rather than assumes. |
| 4 — mutation-proven | ✅ | M1 → 11 red including AC-4's named test; 10 further mutations run this review, every guard has a killer. |
| 5 — header corrected, C_AD/C_AV/C_PM kept | ✅ | after F1: two reasons kept apart, both setters cited and re-opened, and pinned by a test so the false version cannot return. |
| 6 — measured against the gun's own ray | ✅ | after F2: same eye, same aspect, same frame's yoke — all three verified against `beamOrigin`/`beamDir`. |

### Findings ledger

| # | Severity | Outcome |
|---|----------|---------|
| F1 — false ROM claim (C_AV/C_PM "no setter") | major | **fixed** + regression-pinned (M10) |
| F2 — C_PS not measured against the gun's ray | moderate | **fixed** + regression-pinned (M8) |
| F6 — vertical half of F2's guard blind | minor | **fixed** (diagonal flick; M12 now red) |
| F3 — ROM's constant cursor term dropped | note | accepted, inherited, named for the record |
| F4 — `aspect: 0` passed through | note | accepted; identical in the gun, so the rays still agree |
| F5 — `SIGHTS_BAND_FACTOR` exported unused | note | accepted; the file's documented-constant idiom |

Three rounds, three real defects — two of which the suite could not see when they were
written. Worth stating plainly for the retro: the derivation was right from the first commit;
everything I rejected was a claim ABOUT the derivation (a comment that contradicted the ROM,
a comment that overclaimed ray agreement) or a guard that could not fail. Prose and coverage
were the risk here, not arithmetic.

**Handoff:** To SM (The Announcer) for the finish phase.