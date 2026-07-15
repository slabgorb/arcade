---
story_id: "tp1-35"
jira_key: "tp1-35"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-35: SHAPES — the pulsar bar, tanker cargo emblems and enemy shot, from the ROM

## Story Details
- **ID:** tp1-35
- **Jira Key:** tp1-35
- **Workflow:** tdd
- **Stack Parent:** none

## Story Context
**Type:** ROM transcription · ROM-faithful shape recreation
**Points:** 4
**Priority:** p1
**Repo:** tempest

### Technical Approach
Transcribe three deferred SHAPES from tp1-17's backlog (Cluster C13 part 1b):

1. **PULSAR BAR (V-005)** — ALDISP.MAC:2001-2035 contains FIVE distinct hand-authored pulse chains (PULS0-4), not our single amplitude-scaled table. PULTAB clamps the flat variant; our selector currently inverts to sharpest — audit and correct the chain selection.

2. **TANKER CARGO EMBLEMS (V-007)** — ALVROM.MAC:624-647: TANKP has a TURQOI chevron; TANKF has FOUR-colour bar (blue/red/green/yellow), NOT our cyan zigzag / single yellow cross. Re-seat test to ROM's 4-colour mark and restore accurate colours.

3. **ENEMY SHOT (V-009)** — ALVROM.MAC:700-721: ESHOT1-4 are four outward DIAGONAL ticks + red dots, frame-driven from QFRAME, NOT our cardinal pinwheel off bullet depth. Audit frame sequencing and dot placement.

### Acceptance Criteria
- [ ] PULSAR BAR shape authored with all five ROM chains; selector inverted/clamped correctly
- [ ] TANKER CARGO EMBLEMS transcribed: TANKP chevron + TANKF 4-colour bar (blue/red/green/yellow)
- [ ] ENEMY SHOT shape is four diagonal ticks + red dots, frame-sequenced from QFRAME
- [ ] Colour test for fuse-cargo emblem re-seated to ROM's 4-colour mark (re-anchor from tp1-30)
- [ ] Citations for V-005/V-007/V-009 anchored and marked `remediated_by: tp1-35`
- [ ] Tests pass; citation gate passes; no render drift vs. ROM

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T11:46:23Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T10:43:47Z | 2026-07-15T10:46:05Z | 2m 18s |
| red | 2026-07-15T10:46:05Z | 2026-07-15T11:14:41Z | 28m 36s |
| green | 2026-07-15T11:14:41Z | 2026-07-15T11:31:30Z | 16m 49s |
| review | 2026-07-15T11:31:30Z | 2026-07-15T11:46:23Z | 14m 53s |
| finish | 2026-07-15T11:46:23Z | - | - |

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (blocking): the audit's `claim` decoded ONLY ESHOT1 (MESHO1); ESHOT2/3/4 are
  DISTINCT hand-authored tables (verified at ALVROM.MAC:725-790 — like FUSE0-3, NOT
  rotations of ESHOT1). Affects `src/shell/glyphs.ts` (`enemyBoltGlyph`'s 4 frames must
  each transcribe its own ESHOT table and cite the line; the RED suite pins frame 0
  exactly + the 4-frame composition, and routes 2/3/4 here). ESHOT2 = ALVROM.MAC:726-745,
  ESHOT3 = 747-766, ESHOT4 = 768-787 (each: 4 WHITE diagonal-ish ticks + 4 RED dots).
  *Found by TEA during test design.*
- **Gap** (blocking): the enemy-shot FRAME SOURCE must be wired to a global frame counter,
  not the bullet depth. ROM: `LDA QFRAME / ASL / AND I,6 / ADC I,PTESHO` (ALDISP.MAC:910-914)
  → index = (QFRAME AND 3) selects one of ESHOT1-4. Affects `src/shell/render.ts:356`
  (`enemyBoltGlyph(Math.floor(b.depth * 8))` → drive off a frame/QFRAME counter; and DROP
  the depth-driven `b.depth * Math.PI * 4` spin — ESHOT animation is table-SWAP, not
  continuous rotation). *Found by TEA during test design.*
- **Conflict** (blocking): fixing `pulsarVariant` so idx>=5 → FLAT (correct per PULTAB,
  ALDISP.MAC:868-893) will make the RENDERED pulsar read flat for most of its cycle unless
  render's pulsing DOMAIN is also corrected. `render.ts:426` feeds `pulsarVariant` a
  full-byte sine (`... * 0xff`, pulsing ∈ [0,255]) so idx spans 0..15 and lands on the
  flat clamp most frames. The ROM's PULSON bounces in ~[-63,15] (ALWELG.MAC:1557-1570), so
  idx stays 0..4 with only a TRANSIENT overshoot to 5. Affects `src/shell/render.ts`
  (rescale the pulsing driver to the ROM PULSON domain so the flat-snap is transient).
  This is the "compensating constant" trap — MEASURE the rendered pulsar; do not ship it
  flat. *Found by TEA during test design.*
- **Improvement** (non-blocking): when Dev edits `src/shell/glyphs.ts`, mark V-005/V-007/V-009
  `remediated_by: tp1-35` AND run `node tools/audit/reanchor-citations.mjs --write` — the
  edit shifts the line numbers of the OTHER (unfixed) citations in glyphs.ts. Affects
  `docs/audit/findings/pair-2-alvrom-shapes-font.json`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the RENDER wiring is not unit-tested at the render level
  (glyphs are geometry-tested, render is DOM-bound). Reviewer/verify should EYEBALL on the dev
  server: the pulsar breathing flat→sharp→flat over the PULSON sweep (not stuck flat), the
  enemy-shot ~7.1 Hz shared shimmer (all bolts in phase, no per-bolt spin), the tanker
  4-colour fuse emblem + turquoise pulsar chevron, and the shot's diagonal ticks. Affects
  `src/shell/render.ts` + `src/shell/glyphs.ts`. MIND THE PORT TRAP: a pinned dev port
  (5273) may be served by a SIBLING checkout — serve your own tree on a spare port and verify
  the cwd. *Found by Dev during implementation.*
- **Improvement** (non-blocking): all four TEA blocking Delivery Findings were resolved in this
  change — ESHOT2/3/4 transcribed (ALVROM.MAC:726-787, careful radix), frame source wired to
  `renderTime * ROM_FPS` (QFRAME analog, drops the depth spin), pulsar pulsing domain rescaled
  to the ROM PULSON range [-63,15], and V-005/V-007/V-009 + DA-018 marked `remediated_by` with
  `reanchor-citations.mjs --write` (0 LOST). No new upstream findings. *Found by Dev during
  implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): AC-6's "no render drift vs ROM" half is unverified visually —
  render is DOM-bound and un-unit-testable, so the shapes are geometry-verified but their on-screen
  appearance is not. A visual eyeball is recommended before/at release (QA): the pulsar breathing
  flat→sharp→flat (not stuck flat), the enemy-shot shared ~7.1 Hz shimmer with no per-bolt spin,
  the tanker turquoise chevron + 4-colour fuse plus, and the shot's diagonal ticks. Affects
  `src/shell/render.ts` + `src/shell/glyphs.ts`. Not blocking — geometry is independently verified
  faithful and the wiring is correct by construction. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the render frame-source guard (`tp1-35.shapes.test.ts` — the
  `not.toMatch(/enemyBoltGlyph\(\s*Math\.floor\(\s*b\.depth/)` source scan) is pinned to the EXACT
  old expression. It is mutation-proven to catch a straight revert, but a future regression that
  re-derived the frame from depth via a differently-spelled expression (`Math.round(b.depth*…)`, an
  intermediary `const`) would slip past it. Consider extracting the frame source into a named,
  unit-testable value if this area is revisited. Affects `tests/shell/tp1-35.shapes.test.ts`.
  *Found by Reviewer during code review.*

## Design Deviations

No deviations logged yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Enemy-shot geometry pinned per-frame ONLY for frame 0 (ESHOT1)**
  - Spec source: context-story-tp1-35.md, AC-3 ("the enemy shot is the ROM's ESHOT1-4")
  - Spec text: "The enemy shot is the ROM's ESHOT1-4 outward diagonal ticks + red dots."
  - Implementation: frame 0 (ESHOT1) is pinned exactly (diagonal-centred ticks, red dots at
    ±6, ESHOT1 radius signature); frames 1-3 are pinned STRUCTURALLY only (4 ticks + 4 red
    dots, {white,red}, 4 distinct, wrap on &3), not geometrically.
  - Rationale: the machine-checked audit `claim` decoded only ESHOT1; ESHOT2/3/4 are distinct
    hand-authored tables the finding did not decode. Per the tp1-13 precedent, un-decoded ROM
    data is routed to Dev via a cited Delivery Finding (ALVROM.MAC:726-787) rather than
    over-transcribed in RED, keeping the RED oracle to what the audit verified.
  - Severity: minor
  - Forward impact: Reviewer must diff-trace `enemyBoltGlyph` frames 1-3 against
    ALVROM.MAC:726-787 (a frame-0-only fix would pass the suite but violate AC-3).
- **Sibling test glyphs.test.ts monotonic-amplitude weakened from strict to non-strict**
  - Spec source: tests/shell/glyphs.test.ts (Story 6-8), "amplitude shrinks monotonically"
  - Spec text: "for (i) expect(amps[i]).toBeLessThan(amps[i-1])"
  - Implementation: re-seated `toBeLessThan` → `toBeLessThanOrEqual`.
  - Rationale: the strict form encoded the "one table amplitude-scaled five ways" bug this
    story removes. The ROM's PULS1 (3-seg) and PULS2 (6-seg) share a peak-to-peak amplitude
    of 2, so strict `<` is false there; the real per-topology contract is pinned in
    tp1-35.shapes.test.ts. The re-seat stays green under BOTH current and fixed code.
  - Severity: minor
  - Forward impact: none
- **Sibling test tp1-30 fuseball-cargo emblem colour re-seated (AC-5 mandated)**
  - Spec source: context-story-tp1-35.md, AC-5
  - Spec text: "tp1-30's fuse-cargo-emblem colour test is re-seated to the ROM's 4-colour
    mark (Dev cannot move goalposts; TEA owns the re-seat)."
  - Implementation: `toBe('yellow')` → the emblem colour SET {blue,red,green,yellow},
    asserted level-invariant across all six banks; stale comment corrected.
  - Rationale: TEA owns test maintenance; the re-seat preserves the original "emblem is NOT
    recoloured per bank" intent while moving it onto V-007's true 4-colour mark.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **The frame-source fix also remediates DA-018 (a finding outside the named ACs)**
  - Spec source: context-story-tp1-35.md, AC-3 / story description ("frame-driven off QFRAME,
    NOT our cardinal pinwheel off bullet depth")
  - Spec text: "The enemy shot is the ROM's ESHOT1-4 … frame-driven from QFRAME."
  - Implementation: rewired `drawEnemyBullets` off `renderTime * ROM_FPS` (a shared global
    QFRAME analog) instead of `Math.floor(b.depth * 8)`. This removes the exact divergence
    DA-018 (pair-3) describes — "ROM ties the frame to QFRAME (~7.1 Hz shared); ours to the
    bolt's own depth (desynced)" — so DA-018 is marked `remediated_by: tp1-35` too, alongside
    the named V-005/V-007/V-009.
  - Rationale: the divergence is one line and one behaviour; fixing V-009's frame source IS
    fixing DA-018. Cadence set to ROM_FPS/4 ≈ 7.1 Hz (QFRAME cycles every 4 game frames) to
    match DA-018's corrected target, so the remediation is honest, not a re-spelling.
  - Severity: minor
  - Forward impact: none — DA-018's `ours` quote is frozen as history like the others.
- **Enemy-shot on-screen size and shimmer rate are eyeball tunables, not test-pinned**
  - Spec source: tp1-35.shapes.test.ts (AC-3 tests are scale-invariant)
  - Spec text: the shot tests pin topology/diagonals/radius-ratios, not absolute size or Hz.
  - Implementation: ESHOT tables share ONE scale (`ESHOT_SCALE`, global half-extent → ~12, so
    frames don't pulse in size) chosen to match the prior bolt's on-screen size; the shimmer
    steps at `ROM_FPS` (7.1 Hz per the ROM).
  - Rationale: the ROM draws ESHOT at CM=1 object units; our render applies its own object
    scale, so absolute glyph units are a display choice. Kept ~12 to avoid a jarring size jump.
  - Severity: minor
  - Forward impact: none (Reviewer eyeball item — see Delivery Findings)

### Reviewer (audit)
- **TEA: enemy-shot geometry pinned frame-0-only** → ✓ ACCEPTED. The forward-impact concern
  ("Reviewer must diff-trace frames 1-3 against ALVROM.MAC:726-787") is DISCHARGED: an
  independent auditor re-decoded all four ESHOT tables coordinate-by-coordinate (all 16 ticks +
  16 dots byte-for-byte, including the mixed-radix cases ESHOT2 `-18.,12`=(-18,18) and ESHOT3
  `-3,17`=(-3,23)) and confirmed glyphs.ts matches. Frames 1-3 are the real ROM data, not a
  frame-0-only fix. Routing the un-decoded tables to Dev was sound (tp1-13 precedent).
- **TEA: glyphs.test.ts monotonic-amplitude weakened to non-strict** → ✓ ACCEPTED. Correct — the
  ROM chains differ in topology, not just amplitude (PULS1/PULS2 share peak-to-peak 2); the
  strict form encoded the removed bug. The per-topology contract is pinned (and mutation-proven)
  in tp1-35.shapes.test.ts.
- **TEA: tp1-30 fuseball-cargo emblem re-seated to the 4-colour set** → ✓ ACCEPTED. AC-5-mandated;
  preserves the "not recoloured per bank" intent (asserted level-invariant across all six banks)
  while moving it onto V-007's true mark. Mutation-proven (recolour one arm → RED).
- **Dev: the frame-source fix also remediates DA-018** → ✓ ACCEPTED. Verified the findings diff is
  ONLY line-number reanchors + four `remediated_by: tp1-35` additions — NO `verbatim`/`claim`/
  `reasoning` prose was edited, so nothing was laundered. The fix genuinely removes DA-018's
  divergence (depth-per-bolt → shared `renderTime * ROM_FPS`, cadence ROM_FPS/4 ≈ 7.1 Hz),
  making the remediation honest, not a re-spelling.
- **Dev: enemy-shot size/rate are eyeball tunables** → ✓ ACCEPTED. One shared `ESHOT_SCALE`
  (no size pulse) at ~12 to match the prior bolt; shimmer at `ROM_FPS` matches DA-018's target.
  Absolute on-screen size is not test-pinned (inherent — render is DOM-bound); flagged for a
  visual eyeball (non-blocking, see Delivery Findings).
- No UNDOCUMENTED deviations found: the diff's every behavioural change maps to a logged TEA/Dev
  deviation or a story AC.

## Sm Assessment

**Setup complete — routing RED phase to O'Brien (TEA).**

Story tp1-35 is Cluster C13 part 1b: the three enemy SHAPES that tp1-17 named in
its finding-range but never covered with an AC (tanker/spiker/fuseball/charge were
done; pulsar bar, tanker cargo emblems, enemy shot were deferred). This is a
ROM-transcription story — the win condition is fidelity to the cited ROM ranges,
not new gameplay.

**Three shapes to transcribe and cite:**
1. PULSAR BAR (V-005) — ALDISP.MAC:2001-2035: FIVE hand-authored chains PULS0-4,
   not one amplitude-scaled table. PULTAB clamps the flat variant; our selector
   currently inverts to sharpest — that inversion is the bug to correct.
2. TANKER CARGO EMBLEMS (V-007) — ALVROM.MAC:624-647: TANKP TURQOI chevron +
   TANKF four-colour blue/red/green/yellow bar, replacing our cyan zigzag / single
   yellow cross.
3. ENEMY SHOT (V-009) — ALVROM.MAC:700-721: ESHOT1-4 four outward DIAGONAL ticks +
   red dots, frame-driven off QFRAME, replacing our cardinal pinwheel off bullet depth.

**Notes carried forward for TEA/Dev:**
- Read the archived sessions for **tp1-17** (parent shapes story) and **tp1-30**
  (which pinned the fuse-cargo emblem colour 'yellow' this story re-seats to the
  ROM 4-colour mark) — prior TEA typically pre-extracts ROM quarry into Delivery
  Findings there.
- CITATION GATE TRAP: `npm test -- citations` anchors on pinned line numbers.
  Comment-only edits to a cited ROM/source file shift those lines and break the
  gate — re-anchor after ANY edit. `remediated_by` is ONLY for defects actually
  removed, not for CONFIRMED non-defects; V-005/V-007/V-009 must be marked
  `remediated_by: tp1-35` and their shifted citations re-anchored.

**Branch/topology:**
- tempest is GITFLOW: feat → develop, squash-merged; PRs target `develop`, never
  `main`. Branch `feat/tp1-35-rom-shapes-pulsar-tanker-eshot` was cut fresh off
  `origin/develop` (tip: tp1-17 #122).
- Race check clean: origin fetched, no commits/remote branch/open PR mention
  tp1-35 — no sibling checkout is working it. Re-check at review per the
  parallel-checkout race guard.

Confidence: high. Scope is well-bounded by the three cited ROM ranges and the
tp1-30 re-seat. No open questions blocking the RED phase.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** ROM-transcription fidelity story — the three deferred shapes (V-005 pulsar
bar, V-007 tanker cargo emblems, V-009 enemy shot) must be pinned against Theurer's
primary source before Dev touches `glyphs.ts`.

**Test Files:**
- `tests/shell/tp1-35.shapes.test.ts` (NEW) — 30 tests: AC-1 pulsar (5 distinct chains,
  segment multiset {1,3,6,6,6}, flat=2-pt PULS0, PULTAB idx≥5→flat selection), AC-2
  tanker cargo (TANKP 5-pt turquoise chevron / TANKF 4-colour plus {blue,red,green,
  yellow}), AC-3 enemy shot (ESHOT1 diagonal-centred ticks + red dots at ±6, frame
  source ≠ depth), AC-4 remediated_by V-005/V-007/V-009, AC-5 oracle well-formedness,
  rule coverage. All ROM oracles transcribed verbatim from ALVROM.MAC / ALDISP.MAC and
  cited in comments.
- `tests/shell/tp1-30.palette-enemies-starfield.test.ts` (RE-SEAT, AC-5) — fuseball
  emblem `toBe('yellow')` → colour SET {blue,red,green,yellow}, level-invariant; stale
  comment corrected.
- `tests/shell/glyphs.test.ts` (RE-SEAT) — pulsar monotonic-amplitude `<` → `<=`.

**Tests Written / RED state:** **18 failing, ready for Dev** — 17 new-contract assertions
in tp1-35.shapes.test.ts + 1 re-seated tp1-30 emblem test. Verified via testing-runner:
- Every failing test is an INTENDED new-contract assertion (audited one by one).
- Every passing tp1-35 test is a keep-guard (composition / render-contract / oracle) that
  is unchanged by the fix — none passes vacuously.
- Siblings unaffected: `glyphs.test.ts` 64/64, `tp1-17.shapes.test.ts` 26/26 green.
- **Citation gate `tests/audit/citations.test.ts` 12/12 GREEN** (no source/findings edited).
- **`tsc --noEmit` 0 errors** (test files compile against current `glyphs.ts` APIs).

**What Dev (Julia) must implement for GREEN** (see Delivery Findings for the ROM quarry):
1. `pulsarBar`: author the five DISTINCT chains PULS0-4 (topologies, not one scaled table),
   keeping variant 0 = PULS4 (sharpest) … variant 4 = PULS0 (flat) so render.ts stays wired.
2. `pulsarVariant`: idx≥5 must fall to FLAT (variant 4), not invert to sharpest — AND fix
   render's pulsing domain (blocking Conflict finding) or the pulsar renders flat.
3. `tankerGlyph`: TANKP turquoise chevron (5 pts) + TANKF 4-colour plus (blue/red/green/
   yellow arms of length 0x0C).
4. `enemyBoltGlyph`: transcribe ESHOT1-4 (diagonal ticks + red dots); frame 0 pinned here,
   2/3/4 per the cited Delivery Finding; wire the frame off a global counter, not depth.
5. Mark V-005/V-007/V-009 `remediated_by: tp1-35` and run `reanchor-citations.mjs --write`.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Hard Architectural Boundary (glyphs = shell-only) | `glyphs.ts stays SHELL-only: never imports the sim/state/rules/rng/enemies core` | passing (guard) |
| core purity (no wall-clock / RNG) | `glyph geometry is pure: no Math.random / Date / performance time` | passing (guard) |
| TS lang-review #1 (type-safety escapes) | `uses no as any / @ts-ignore type-safety escapes` | passing (guard) |
| TS lang-review #2 (readonly data) | `keeps the transcribed vertex tables readonly` | passing (guard) |
| TS lang-review #8 (test quality) | self-checked every `it` for a meaningful assertion; determinism pin `every frame-parameterised shape is deterministic across repeated calls` | passing |
| Determinism (frame-exact, no flicker) | `every frame-parameterised shape is deterministic across repeated calls` | passing |

**Rules checked:** 6 of 6 applicable (the TS checklist's React/async/error/build rules do
not apply to a pure geometry module).
**Self-check:** 0 vacuous tests — no `let _ =`, `assert(true)`, or is-none-on-always-none;
every new assertion checks a concrete value/topology/colour set.

**Handoff:** To Julia (Dev) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/glyphs.ts` — the three ROM shapes:
  - `pulsarBar` now returns the five DISTINCT PULS0-4 chains (topologies {1,3,6,6,6} segments,
    not one amplitude-scaled table); `pulsarVariant` clamps idx≥5 to FLAT per PULTAB. Removed
    the dead `PULSAR_XD/YD/AMP/DP_T1`.
  - `tankerGlyph` prepends the TANKP turquoise chevron (5-pt) / TANKF 4-colour plus (blue/red/
    green/yellow arms of 0x0C), sharing the body's scale (`GENTNK_SCALE`).
  - `enemyBoltGlyph` returns the four ESHOT1-4 tables (white diagonal ticks + red dots), one
    shared scale (no size pulse). Removed the dead `BOLT_SIZE`/`enemyBoltBase`/`rotStroke`.
- `src/shell/render.ts` — enemy-bolt frame off `renderTime * ROM_FPS` (QFRAME analog, ~7.1 Hz,
  no per-bolt spin); pulsar pulsing driver rescaled to the ROM PULSON domain [-63,15].
- `docs/audit/findings/pair-2-*.json`, `pair-3-*.json` — V-005/V-007/V-009 + DA-018 marked
  `remediated_by: tp1-35`; all cited files re-anchored (`reanchor-citations.mjs --write`, 0 LOST).
- Test re-seats (were TEA's, committed in RED): tp1-30 fuseball emblem, glyphs.test.ts monotonic.

**Tests:** **1308/1308 passing (GREEN)** — full suite, no sibling regressions. `npm run build`
(tsc --noEmit && vite build) clean. Citation gate 12/12 green.
**Branch:** feat/tp1-35-rom-shapes-pulsar-tanker-eshot (pushed)

**AC status:** AC-1 (pulsar 5 chains + PULTAB selection) ✓; AC-2 (TANKP/TANKF emblems) ✓;
AC-3 (ESHOT1-4 diagonal ticks + red dots, QFRAME frame source) ✓; AC-4 (transcribed + cited,
remediated_by) ✓; AC-5 (tp1-30 re-seat) ✓ (TEA, RED); AC-6 (tests + citations green) ✓ — the
"no render drift vs ROM" half is flagged for a Reviewer eyeball (Delivery Findings).

**Handoff:** To next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1308/1308, build+citations(19) green, 0 smells, tree clean |
| 2 | reviewer-edge-hunter | No | Skipped (disabled) | N/A | Covered by Reviewer + independent auditor (edge cases below) |
| 3 | reviewer-silent-failure-hunter | No | Skipped (disabled) | N/A | N/A domain — pure geometry, no error paths (verified absent) |
| 4 | reviewer-test-analyzer | No | Skipped (disabled) | N/A | Covered by independent auditor (5 mutation proofs) + Reviewer's own idx≥5 mutation |
| 5 | reviewer-comment-analyzer | No | Skipped (disabled) | N/A | Covered by Reviewer (comments accurate; guard not defeated by prose) |
| 6 | reviewer-type-design | No | Skipped (disabled) | N/A | Covered by Reviewer (readonly tuples, no as any) |
| 7 | reviewer-security | No | Skipped (disabled) | N/A | N/A domain — client geometry, no I/O/input/secrets |
| 8 | reviewer-simplifier | No | Skipped (disabled) | N/A | Covered by Reviewer (dead code removed, no over-engineering) |
| 9 | reviewer-rule-checker | No | Skipped (disabled) | N/A | Covered by Reviewer (Rule Compliance section) |

**Independence note:** the 8 analytical pf subagents are disabled via `workflow.reviewer_subagents`.
Because Dev+Reviewer are the same session (self-authored code — the highest-risk review), I supplied
the missing independence with (a) an independent general-purpose auditor that re-decoded every ROM
coordinate and mutation-tested all 5 load-bearing guards, and (b) my own serial mutation check of the
subtlest guard. Their mutation-proven results are weighted over "it looks right."

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via settings; independence via an independent auditor + Reviewer's own mutation test)
**Total findings:** 0 confirmed blocking; 2 LOW non-blocking (robustness note + visual-eyeball follow-up); 0 dismissed.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** the `pulsing`/frame inputs → the glyphs → the canvas. `e.pulsing` (sim) →
`render.ts` maps it into the ROM PULSON domain [-63,15] → `pulsarVariant` → `pulsarBar` (one of 5
distinct chains) → `strokeGlyph`. `renderTime` (shell clock) → `Math.floor(·*ROM_FPS)` (shared across
all bolts) → `enemyBoltGlyph(frame&3)` → ESHOT table → `strokeGlyph`. Safe: every index is clamped
(`clampVariant` [0,4]; `frame & 3` [0,3]); no NaN reachable (sine01∈[0,1], renderTime≥0).

### Rule Compliance

**Hard Architectural Boundary (tempest CLAUDE.md — the load-bearing rule):**
- `glyphs.ts` (shell): enumerated EVERY new/changed declaration — `PulseChain`, `PULSAR_CHAINS`,
  `pulsarBar`, `pulsarVariant`, `GENTNK_SCALE`, `TANKP_EMBLEM`, `EmblemArm`, `TANKF_ARMS`,
  `tankerGlyph`, `BoltFrame`, `ESHOT_FRAMES`, `ESHOT_SCALE`, `ESHOT_GLYPHS`, `enemyBoltGlyph`. NONE
  imports `core/{sim,state,rules,rng,enemies}`; NONE touches DOM/window/Date/Math.random/performance/
  rAF. All are pure value producers. COMPLIANT — mutation-proven by the boundary + purity guards in
  `tp1-35.shapes.test.ts` (still green).
- `render.ts` (shell): added `import { ROM_FPS } from '../core/rules'`. Shell→core is a PERMITTED
  direction (the boundary forbids core→shell only; render already imports GameState/project/rules).
  `renderTime` is shell module state, allowed (render is the impure shell). COMPLIANT.

**TypeScript lang-review checklist:**
- #1 (type-safety escapes): 0 `as any`/`@ts-ignore` in changed source (preflight-confirmed; the sole
  `as any` string is the test's guard AGAINST the smell). COMPLIANT across every changed type.
- #2 (readonly/generics): `PULSAR_CHAINS`/`TANKF_ARMS`/`ESHOT_FRAMES` are `readonly` with readonly
  tuple element types; no `Record<string,any>`/`Function`/`object`. COMPLIANT.
- #8 (test quality): the 5 load-bearing guards are mutation-proven non-vacuous. COMPLIANT.
- #3–7, #9–13 (enum/null/module/react/async/error/build/perf): N/A — pure synchronous geometry, no
  growing enums, no null-returning APIs, no async, no JSX, no I/O boundary.

**ROM fidelity + citation gate (tempest CLAUDE.md):** citation gate 19/19 green; V-005/V-007/V-009/
DA-018 `remediated_by: tp1-35`; reanchor run (0 LOST); findings diff is reanchors + remediated_by
ONLY — I audited every +/- line, no `verbatim`/`claim`/`reasoning` was edited. COMPLIANT.

### Observations (dispatch tags)

- **[VERIFIED]** ROM transcription faithful coordinate-by-coordinate — an independent auditor
  re-decoded PULS0-4, PULPIC/PULTAB, TANKP/TANKF and all 16 ESHOT ticks + 16 dots from
  `~/Projects/tempest-source-text` and matched `glyphs.ts` byte-for-byte, incl. mixed-radix ESHOT2
  `-18.,12`=(-18,18) and ESHOT3 `-3,17`=(-3,23). Complies with the ROM-fidelity rule.
- **[TEST]** All 5 load-bearing guards mutation-proven (auditor: segment-multiset, idx≥5 clamp,
  ESHOT diagonal-midpoint, render frame-source, TANKF 4-colour → each RED under mutation) + I
  independently reverted the idx≥5 clamp and confirmed its test goes RED, tree restored. Non-vacuous.
- **[VERIFIED]** No citation laundering — `git diff docs/audit/findings/` shows only line reanchors +
  4 `remediated_by` additions; a grep for verbatim/claim/reasoning edits returned empty.
- **[SIMPLE]** Dead code removed cleanly — `PULSAR_XD/YD/AMP/DP_T1`, `BOLT_SIZE`, `enemyBoltBase`,
  `rotStroke` deleted; `tsc` (noUnusedLocals) green confirms no dangling refs. No over-engineering.
- **[TYPE]** Type design sound — `PulseChain`/`EmblemArm`/`BoltFrame` readonly-tuple interfaces,
  explicit `(t): GlyphStroke =>` return types, no casts. (lang-review #1/#2)
- **[RULE]** Hard Architectural Boundary intact — glyphs shell-only + pure; render's core import is a
  permitted shell→core direction. (see Rule Compliance)
- **[DOC]** Comments accurate — ROM citations spot-checked correct; the tp1-30 stale "yellow
  fuseball" comment was corrected; the auditor confirmed no comment near render.ts:356 defeats the
  frame-source `?raw` guard (prose reads "NOT the bullet depth", not the literal token).
- **[EDGE]** Edge cases covered — `pulsarVariant` returns [0,4] across the full byte range incl.
  idx≥5 and negative pulsing; `clampVariant` bounds `pulsarBar`; `frame & 3` wraps; `renderTime≥0`.
  No NaN path (sine01∈[0,1]).
- **[SILENT]** No swallowed errors — pure geometry has no try/catch, no silent fallbacks, no
  `Map.get()` misuse; nothing to swallow (domain verified absent).
- **[SEC]** No security surface — client-only vector geometry, no user input, no I/O, no secrets,
  no injection vector (domain N/A).
- **[LOW]** The render frame-source guard is a narrow `not.toMatch` (robustness follow-up, non-blocking).
- **[LOW]** AC-6 visual "no render drift" is DOM-bound and unverified (eyeball follow-up, non-blocking).

### Devil's Advocate

Suppose this code is broken. The most likely place is the ROM transcription: a single hex-vs-decimal
misread in ESHOT2/3/4 would ship a subtly-wrong shape that the scale/rotation-invariant tests (which
pin frame-0 geometry + composition only) could not catch on frames 1-3 — this is a real gap the RED
suite acknowledged (frames 1-3 pinned structurally, not geometrically). A malicious-radix trap:
ESHOT2 `-18.,12` mixes a decimal `-18.` with a hex `12` on ONE line; read `12` as decimal and the tick
lands at y=12 instead of 18. If Dev (me) made that slip, the shot would look plausible and pass every
test. Second suspect: `pulsarVariant`'s idx≥5 clamp — the whole story hinges on it, yet render never
drives pulsing above idx 4 (it caps at [-63,15]), so the clamp is exercised ONLY by a unit test; if
that test were vacuous the fix would be invisible in play. Third: the render frame-source guard is an
absence check on an exact string — a confused future dev could reintroduce depth-coupling via a
renamed intermediary and the guard would stay green. Fourth: `ESHOT_SCALE`/`GENTNK_SCALE` — a wrong
denominator would render the shot or emblem grotesquely sized, and NO test pins absolute size (all are
ratio-invariant), so a stressed reviewer could ship a giant or invisible shot. Fifth: a confused user
at a high wave (bank 5) — do the emblems/pulsar recolour correctly? The tanker body recolours per bank
but the emblem must not; a blanket override would erase the cargo signal.

Refutations: the first three are DISCHARGED by the independent auditor, which re-decoded every literal
(catching exactly the mixed-radix case) and mutation-proved the idx≥5 clamp and the frame-source guard
bite. I independently re-ran the idx≥5 mutation. The fourth (absolute size) is real but non-blocking —
it is a display tunable, geometry is faithful, and it is flagged for a visual eyeball. The fifth is
covered by tp1-30's still-green suite (pulsar emblem stays cyan, fuse emblem stays its 4-colour set,
level-invariant across all six banks) — the re-seat preserved that intent and is mutation-proven. No
new defect survives.

**Pattern observed:** faithful ROM-data-as-readonly-tables + one shared scale per multi-frame shape
(the established `FUSE_FRAMES`/`DIARA2` idiom) at `glyphs.ts` — consistent with the module's conventions.
**Error handling:** N/A domain (pure geometry); inputs are clamped/masked, no failure path exists.
**[EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]** — all domains assessed (see Observations).

**Handoff:** To Winston Smith (SM) for finish-story. DO NOT merge from review. NOTE: this PR is
AI-authored + AI-reviewed — the SM finish flow's human-approval gate applies; a human must authorise
the merge.