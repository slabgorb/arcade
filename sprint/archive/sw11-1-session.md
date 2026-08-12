---
story_id: "sw11-1"
jira_key: "sw11-1"
epic: "sw11"
workflow: "tdd"
---
# Story sw11-1: Trench return-fire is grossly too lethal — port the ROM's THREE base-gun mechanisms the sw10 basis unification newly exposed.

## Story Details
- **ID:** sw11-1
- **Jira Key:** sw11-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T23:19:52Z

> REWORK: Reviewer verdict REJECTED (1 blocker + 5 findings). `pf handoff complete-phase`
> forward-only'd to `finish` and `pf workflow fix-phase` refuses to reverse, so the Phase
> field is manually repaired to `green` for the Dev rework (recovery_config target_phase:
> green, attempt 1/3). After the fixes land + re-verify, it progresses forward review→finish.

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T21:27:19Z | 2026-08-11T21:28:49Z | 1m 30s |
| red | 2026-08-11T21:28:49Z | 2026-08-11T22:18:36Z | 49m 47s |
| green | 2026-08-11T22:18:36Z | 2026-08-11T22:48:16Z | 29m 40s |
| review | 2026-08-11T22:48:16Z | 2026-08-11T23:04:40Z | 16m 24s |
| green (rework) | 2026-08-11T23:04:40Z | - | - |
| finish | 2026-08-11T23:04:40Z | - | - |

## Sm Assessment

Setup complete; story routed into the `tdd` workflow. This is a p1, 8-pt star-wars
fidelity story in epic sw11 — three independent ROM base-gun MECHANISM omissions in
`stepTrench` (constants are already faithful). The story text carries explicit
citations for each lever, so RED should pin each as its own deterministic test:
1. **AIM** — random-angle spawn + damped/directional heat-seek (PANLIN + MOVPL/MOVPR),
   assert a spawned shell's angle is the random/level value, NOT a closed-form lead.
2. **CONCURRENCY** — cap airborne base shots at `TGNBS[gunDiff]` ([1,1,2,2,3,3,3,4]),
   not `MAX_FIREBALL_SLOTS`; wave-1 (WV.HRD 0) allows exactly ONE.
3. **ELIGIBILITY** — vertical-alignment gate (above bunker + near band full prob,
   one lower band squared prob) + too-close exclusion; assert point-blank never fires.

Context file: `sprint/context/context-story-sw11-1.md`. Cabinet-fidelity rule applies —
the on-screen behavior on the dev server is ground truth, not just green citations.
Handing off to TEA (Han Solo) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 8-pt behavioural sim story — three ROM mechanism omissions in `stepTrench`.

**Test Files:**
- `plugins/star-wars/tests/core/trench-basegun-fidelity.test.ts` — 5 deterministic
  core tests (fixed seeds `[1,3,5,7,9,11,13,17]` + fixed pilot), reusing the isolated
  `trench()`/`gun()`/fly-driver idiom from `trench-wall-gun-fire.test.ts`.

**Tests Written:** 5 tests covering 3 ROM mechanisms (AC-CONC, AC-AIM, AC-ELIG):
- **CONCURRENCY** (WSGUNS.MAC GNBSAVAIL:210-244) — airborne base shots capped at
  `TGNBS[gunDiff]=[1,1,2,2,3,3,3,4]`, not the flat `MAX_FIREBALL_SLOTS`(6); wave-1
  (gunDiff 0) allows exactly ONE; the cap tracks the table across waves 1/3/5/8.
- **AIM** (WSGUNS.MAC PANLIN:409-432 / MOVPL:788-846) — the launch velocity is
  INDEPENDENT of the ship point (same gun+seed, only the pilot's lateral seat moves →
  identical launch), i.e. the gun's own random/level spawn angle, not the closed-form
  `trenchGunFireVelocity` lead.
- **ELIGIBILITY** (WSBASE.MAC BSGUN:1236-1341) — a gun the player sits a full
  wall-height BELOW never fires (a level/below gun does — positive control); a
  point-blank gun never fires (min fire depth ≥ a conservative 0x400 floor).

**Status:** RED — 5 failing against current `stepTrench` (verified `--project star-wars
trench-basegun-fidelity`: 5/5 fail; full `--project star-wars`: only these 5 are
attributable to sw11-1 — see Delivery Findings for the 4 pre-existing reds). Lint clean
(`npm run lint` exit 0). Committed `74a2ddb0`.

### Rule Coverage

| Rule (typescript.md) | How covered | Status |
|------|---------|--------|
| #18 apparatus fails-by-passing | player-independence uses TWO fixtures (centred vs +512 offset), not one whose value is the expectation | failing (RED) |
| #24 retirement / pin the NUMBER | `TGNBS` pinned as an INDEPENDENT literal `[1,1,2,2,3,3,3,4]`; expected gunDiff via real `wvHrd`, not hardcoded | failing (RED) |
| #26 terms not all test-local | every assertion's subject (peak concurrent, fire count, launch vel, min fire depth) is read from production `stepGame` output | failing (RED) |
| #15 non-vacuous floors | each bound is preceded by a `fires>0`/`compared>0` floor so a silent-no-fire impl cannot pass it green | failing (RED) |
| #25 no whole-file source greps | behavioural tests only — no source-text matching, so no whole-file-scope trap | n/a |

**Rules checked:** 5 of the applicable lang-review checks (the rest — React/JSX,
async, security-input, enums — do not apply to a pure deterministic sim test).
**Self-check:** 1 vacuous test found and REMOVED — an early "not the analytic lead from
the spawn point" assertion passed vacuously because the shot is integrated (`pos+=vel·dt`)
once before it is read, so recomputing the lead from the moved position no longer matched
(checklist #18). The player-independence test covers the same contract robustly.

**Handoff:** To Dev (Yoda) for implementation.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Conflict** (blocking for GREEN): sw11-1's "the ROM never leads; shells scatter and
  usually miss" overturns the sw7-16 perfect-lead guarantee that
  `trench-wall-gun-fire.test.ts:147-162` pins ("an off-centre pilot is ALSO hit — fire
  tracks the ship point"), and possibly the shield-cost headline at `:131`.
  Affects `plugins/star-wars/tests/core/trench-wall-gun-fire.test.ts` (Dev must reconcile
  in GREEN: the damped heat-seek still leaves SOME hits, but the "both pilots reliably
  hit" property is exactly what this story retires — update/retire those assertions to the
  scatter behaviour and flag for Reviewer so it is not read as a sw7-16 regression).
  *Found by TEA during red.*
- **Question** (non-blocking): the EXACT vertical band (ROM `#400` → `WALL_SLOT_Y`) and
  the EXACT too-close depth (`#20+4` + one `#800` panel skip) are Dev-derived from BSGUN;
  my tests pin them only with conservative margins (a full wall-height for "player below";
  a half-panel `0x400` floor for point-blank). Affects
  `plugins/star-wars/src/core/sim.ts` (Dev should add a GREEN test pinning the exact band
  and too-close boundary read from the source, so the precise numbers are guarded, not just
  the qualitative gate). *Found by TEA during red.*
- **Improvement** (non-blocking): the AIM port (random-angle spawn + per-frame damped
  `>>4` directional heat-seek, MOVPL/MOVPR) is a per-frame motion model, unlike today's
  fixed-`vel` lead. Affects `plugins/star-wars/src/core/state.ts` /
  `plugins/star-wars/src/core/sim.ts` (whether `Projectile` gains an angle field or the
  trench advances shots per-frame is the Dev's design call; my tests key on observable
  launch/behaviour and do not dictate representation). *Found by TEA during red.*
- **Gap** (non-blocking, informational): the full `--project star-wars` run carries 4
  PRE-EXISTING reds unrelated to sw11-1 — `tests/audit/sw8-23-guard-hardening.test.ts` (1,
  fails with my file unloaded) and 3 environment/asset-dependent audio-bake tools tests
  (`tools/music-bake/bake-music.test.mjs` ×2, `tools/pokey-bake/dedicated-sfx.test.mjs`
  ×1; the count varied 1→4 across runs). Affects the star-wars suite baseline (do NOT
  attribute these to this story; verify against `origin/develop`). *Found by TEA during red.*

### Dev (implementation)

- **RESOLVED** (TEA's blocking conflict did NOT materialise): the sw7-16 hit tests in
  `trench-wall-gun-fire.test.ts` (:131, :147) stayed GREEN — the damped heat-seek still
  lands enough hits that "a shot reaches the cockpit" and "an off-centre pilot is hit"
  both hold. No existing behavioural test needed modification. The one test the no-lead
  change reddened was `trench-gun-streaming.test.ts:218` ("the threat is real"), which
  drove the magnitude-band gate decision (see Design Deviations #1) and is now green.
- **Question** (non-blocking, PLAYABILITY — story requires manual verify): the vertical
  gate ships as a MAGNITUDE band, not the ROM's signed "player above bunker" (deviation
  #1). Affects `plugins/star-wars/src/core/sim.ts` (someone must jump to the trench on the
  dev server — `just serve`, `/star-wars/`, dev key `9` — and confirm the return fire
  feels right: present at the default seat, not silenced, and no longer "grossly too
  lethal"). I could not run this headless. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the PANLIN random spawn-spread angle is omitted — shells
  launch straight down the scroll and all steering is the damped heat-seek. Affects
  `plugins/star-wars/src/core/sim.ts` (a follow-up could add the `P.RND1>>1` initial Z
  spread for finer scatter fidelity). *Found by Dev during implementation.*
- **Gap** (informational, reanchor tax): editing `sim.ts`/`state.ts` shifted line numbers
  and reddened 10 comment-citations (`comment-citations`/`sw8-23` checker) plus 8
  hardcoded line-number fixtures in `sw8-27-remediation.test.ts` and a `coaching.ts`
  citation. Affects future `sim.ts` edits (all reanchored here — verified checkTree=0,
  line-numbers-only, quoted text untouched). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

1. **Vertical gate measures the band as a GAP MAGNITUDE, not the ROM's signed "player
   above bunker."** Spec (story + BSGUN) says "never below." Implemented
   `Math.abs(trenchView[2] - o.pos[2]) < band` because our pilot seat (768) sits BELOW
   every wall-gun slot (WALL_SLOT_Y = 819..3277), so a signed "player above" test silences
   every streamed gun at the default seat and reddens `trench-gun-streaming.test.ts:218`
   ("the threat is real"). Magnitude matches the existing force-field vertical band
   (`sim.ts:1447`) and keeps the threat at all pilot heights. The true vertical polarity vs
   the cabinet is unresolved — flagged for the manual playability check.
2. **Vertical band literal = raw ROM `#400` (0x400=1024); too-close = raw `#800`
   (0x800=2048).** The story hinted "map `#400` to WALL_SLOT_Y spacing" (~819). Used the
   raw ROM unit directly since the world metric is 1:1 with ROM units (CLAUDE.md), which is
   simpler and citable; the ~819 slot spacing is the same order.
3. **AIM ported as a zero-launch shell + per-frame damped heat-seek (`seekShots`), not a
   stored random spawn ANGLE.** PANLIN sets a semi-random Z angle (`P.RND1>>1`); I launch
   the shell riding the scroll (`vel=[-scroll,0,0]`) with no lateral/vertical component and
   let the damped `>>4` MOVPL/MOVPR heat-seek do all steering. Behaviourally faithful (no
   lead, scatters, damped tracking) and makes the launch player-independent (the pinned
   contract), but omits the initial random spread — a possible fidelity follow-up.
4. **Added an optional `seek?: number` field to `Projectile`** (state.ts) to carry each
   trench shell's allowed lateral direction (left-wall→right / right-wall→left). Absent on
   space/surface shots, which are unaffected.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/star-wars/src/core/sim.ts` — trench shot-advance dispatch adds a `seekShots`
  branch (new DAMPED, DIRECTIONALLY-LIMITED heat-seek, MOVPL/MOVPR); the base-gun fire
  block rewritten with the `TGNBS[gunDiff]` concurrency cap, the BSGUN eligibility gate
  (too-close `#800` skip + magnitude vertical band with the squared far-prob), and a
  no-lead player-independent launch (`vel=[-scroll,0,0]` + `seek`); two stale comments
  corrected.
- `plugins/star-wars/src/core/state.ts` — `Projectile.seek?`; `TGNBS`,
  `TRENCH_GUN_FIRE_BAND`, `TRENCH_GUN_MIN_FIRE_DEPTH`.
- `plugins/star-wars/src/core/coaching.ts` — reanchored its `sim.ts:` citations (drift).
- Reanchor tax (line-number-only, quoted text untouched): `tests/audit/sw8-27-remediation.test.ts`
  (6 fixtures), 6 `tests/core/*.test.ts` citations, 2 design-doc citations.

**Tests:** 5/5 sw11-1 GREEN; all 265 trench tests GREEN; the citation-audit suites
(`comment-citations`, `sw8-27`, `sw8-23 AC2`) reanchored GREEN. The only remaining full-suite
reds are PRE-EXISTING and unrelated (`sw8-23 AC6` — red on the RED commit before any src
edit — and the flaky/environment-dependent audio-bake tools tests). Lint (`npm run lint`)
exit 0.

**Branch:** feat/sw11-1-trench-basegun-fidelity

**Handoff:** To verify (TEA simplify + quality-pass). Please run the manual dev-server
playability check (Design Deviation #1 / Dev finding) — the one thing I could not verify
headless.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (AC6 regression) | confirmed 1 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 (2 dup w/ comment-analyzer) | confirmed 4 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 6 confirmed (after dedup), 0 dismissed, 3 noted as non-blocking follow-ups

## Reviewer Assessment

**Verdict: REJECTED** (rework → Dev/green)

The three mechanisms are implemented correctly and the core math is sound (security: clean;
rule-checker cleared #1–#14, #16–#18, #20–#23, #25–#26 with no logic defects; determinism/
purity intact; NaN fails closed in the fire gate). But there is a **red test I introduced**
and a cluster of **honesty defects** where comments/tests claim the ROM's signed rule while
the code ships a magnitude approximation. In a repo whose whole culture is citation honesty,
those must be fixed before merge.

**CORRECTION to my earlier attribution:** I previously told TEA/Dev that `sw8-23 AC6` was a
PRE-EXISTING red. That was WRONG — proven by census on both trees (below). It is MY
regression. The RED-phase run I cited never proved pre-existence because the RED commit had
already added my citation-heavy test file.

### Confirmed findings

**Specialist coverage:** `[SEC]` reviewer-security returned CLEAN — no exploitable or
degenerate-input defect (NaN fails closed in the fire gate; `>>8` no overflow; RNG pure;
`TGNBS` index in-bounds). `[DOC]` reviewer-comment-analyzer and `[RULE]` reviewer-rule-checker
findings are incorporated below (F1–F5), with `[DOC]`/`[RULE]` tags on each.

**B1 [BLOCKER · preflight] — `sw8-23 AC6` census regression (my change).**
`plugins/star-wars/tools/audit/check-comment-citations.mjs:509`. My 16 net-new **range-only**
citations pushed the tree's range-only ratio 74.724% → **75.039%**, past the ±1.5 tolerance
around the documented `UNCATCHABLE` "73.4%" (clean develop = 74.724%, within tolerance;
my branch = 75.039%, gap 1.639). Fix: re-baseline "73.4%" → "75.0%" (matches the current
tree; "three quarters" prose stays accurate). Verified by running `census()` on develop vs branch.

**F1 [HIGH · [DOC] #17] — BSGUN summary comment contradicts the code and its own neighbour.**
`plugins/star-wars/src/core/sim.ts` (fire-block header): asserts "never a player BELOW the
gun (`IFGE ?PLAYER ABOVE BUNKER?`)" and "one panel-height band above", but the gate 11 lines
below is `dz = Math.abs(trenchView[2] - o.pos[2])` — SYMMETRIC. The adjacent `dz` comment and
`state.ts`'s `TRENCH_GUN_FIRE_BAND` doc already disclose this honestly; the summary does not.
Fix: reword the ELIGIBILITY bullet to say a symmetric vertical-GAP magnitude test.

**F2 [HIGH · [RULE][DOC] #19/#17] — the eligibility test overclaims and never exercises the directional rule.**
`trench-basegun-fidelity.test.ts` (~vertical-gate test): title/comment cite the signed "player
ABOVE the bunker" rule, but the fixtures (`SEAT` vs `SEAT+0x1000`) collapse above/below into
the same `|dz|`, so nothing pins "player below the gun, within one band" — where the shipped
magnitude gate FIRES and BSGUN is SILENT. Fix: reword to describe the distance band honestly
AND add a case with a gun one band BELOW the pilot to pin the shipped behaviour (documenting
the deviation), not the ROM rule the code does not implement.

**F3 [HIGH · [RULE] #15] — the point-blank test bound is half the shipped constant.**
`trench-basegun-fidelity.test.ts` (~point-blank test): `TOO_CLOSE = 0x400`, but production ships
`TRENCH_GUN_MIN_FIRE_DEPTH = 0x800`. The test would stay green if the real gate regressed to
0x400 — TEA's RED placeholder was never tightened in GREEN. Fix: import
`TRENCH_GUN_MIN_FIRE_DEPTH` and assert against it (exact-adjacent), per TEA finding
"Dev should pin the exact too-close boundary".

**F4 [HIGH · [RULE] #24] — retirement survivor in an untouched sibling file.**
`plugins/star-wars/tests/core/trench-fire-scroll-carry.test.ts:13-14,23-25`: header + `shotAt`
helper still assert trench wall guns spawn via `gameRules.trenchGunFireVelocity` (the lead model
this story RETIRED for trench base guns). Stays green only because its dead-centre gun/ship
fixture makes the lead terms evaluate to 0. Fix: update the comments and the `shotAt` fixture to
the new spawn model (`vel=[-scroll,0,0]` + `seek`, then damped heat-seek) so the "rides the
scroll" subject is tested against what production actually does.

**F5 [MEDIUM · [DOC] #17] — `seekShots` docstring's fallback claim is false.**
`plugins/star-wars/src/core/sim.ts` (`seekShots` doc): "A shell with no `seek` … is carried
straight, so the law degrades to `advance`." The VERTICAL closing is unconditional (only lateral
is gated on `seek`), so a seek-less shell would still vertically heat-seek. Dead code today, but
the claim is wrong. Fix: correct the docstring (or gate the vertical closing on `seek` too).

### Noted (non-blocking follow-ups, not required for approval)
- **N1 [#2]** `Projectile.seek?: number` is looser than its documented `+1`/`-1` contract; a
  `1 | -1` union would let the compiler enforce the JSDoc. Optional tighten.
- **N2 [#24, LOW]** `docs/2026-08-08-star-wars-projection-audit.md:150` records the retired lead
  model as "RESOLVED" for trench wall guns — a DATED point-in-time audit snapshot; per repo
  convention these are historical records, not living specs. Leave.
- **N3 [#26 info]** the test's `gunDiffFor` clamps against `TGNBS.length-1` while production
  clamps against `TRENCH_GUN_FIRE_MASK.length-1`; both are 8 today but nothing pins them equal.
- **N4 [DEVIATION, carried]** the magnitude-vs-signed vertical gate (Design Deviation #1) is
  ACCEPTED for now — the signed rule silenced every streamed gun at the default seat, and the
  coordinate polarity is unresolved. The **manual dev-server playability check remains required**
  before release; the directional-fidelity port is a follow-up once the geometry is settled.

### Rule Compliance summary
Clean: #1–#14, #16–#18, #20–#23, #25 (no violations). #26 clean (TGNBS literal compared against
behaviour, not itself). Violations: #15 (F3), #19 (F2), #24 (F4 + N2), #17 (F1, F5). Security: clean.

**Handoff:** REJECTED → Dev (Yoda) for rework. Fix B1, F1–F5; N1–N4 are optional/carried.
## Dev Rework (attempt 1/3) — addresses REJECTED verdict

Commit `c022bb77`. All six confirmed findings fixed; N1 applied. Full `--project star-wars`
= **2399/2399 green** (incl. the AC6 census, now correct); lint exit 0.

- **B1** — `check-comment-citations.mjs` `UNCATCHABLE` re-baselined 73.4% → 75.0% (matches the
  live tree; sw8-23 AC6 green).
- **F1** — `sim.ts` BSGUN summary comment reworded: discloses the symmetric `Math.abs` vertical
  gap gate and the unresolved signed-polarity, no longer claims "never below".
- **F2** — eligibility test rewritten (`fires within one vertical band, silent beyond two — the
  symmetric magnitude gate`): pins the SHIPPED behaviour incl. the divergence case (a gun one
  band ABOVE the pilot fires; a signed-gate mutant reddens it, a dropped-band mutant reddens the
  far case). Section header discloses the polarity deviation.
- **F3** — point-blank test imports `TRENCH_GUN_MIN_FIRE_DEPTH` and asserts against it (exact
  0x800), not the 0x400 placeholder.
- **F4** — `trench-fire-scroll-carry.test.ts` rewritten: `shotAt` now builds the NEW spawn model
  (`vel=[-scroll,0,0]`+`seek`), test 1 asserts NO lateral/vertical lead; scroll-riding + no-tunnel
  subjects preserved against what production actually spawns.
- **F5** — `seekShots` docstring corrected (only the lateral close is gated on `seek`).
- **N1** — `Projectile.seek` tightened `number` → `1 | -1` (needed a `Projectile` return annotation
  on the test's `shotAt`).
- Re-reanchored the 3 comment-citations + `sw8-27` line fixtures + `coaching.ts` citation that the
  fix's own line shifts drifted (line-numbers only).

## Reviewer Re-Review (rework verification)

**Verdict: APPROVED**

Targeted re-verification of the rework against the round-1 findings (the round-1 Subagent Results
table stands — all specialists received; no new code paths were added, only comment/test accuracy
fixes + a type tightening, so a fresh full subagent sweep is not warranted). Each finding confirmed
resolved by reading the diff and running the suite:

- **B1** RESOLVED — census re-baselined; `sw8-23 AC6` green (verified full suite).
- **F1** RESOLVED — comment now matches the code (magnitude gate + polarity disclosure); no
  surviving contradiction with its neighbour.
- **F2** RESOLVED — test pins shipped magnitude behaviour incl. the divergence case; title/comment
  honest; mutation-sensitive to both a signed-gate mutant and a dropped-band mutant.
- **F3** RESOLVED — bound is now the exact production constant, imported.
- **F4** RESOLVED — fixture + claims match the new spawn model; retirement survivor cleared.
- **F5** RESOLVED — docstring accurate.
- **N1** applied. **N2** (dated audit doc) left per repo convention. **N4** (magnitude-vs-signed
  DEVIATION + manual dev-server playability check) CARRIED — required before release, tracked as a
  follow-up.

Full `--project star-wars` 2399/2399 green; lint clean. No regressions; the three ROM mechanisms
land with honest docs/tests.

**Handoff:** APPROVED → SM to finish.
