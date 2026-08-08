---
story_id: "mc9-3"
jira_key: "mc9-3"
epic: "mc9"
workflow: "tdd"
---
# Story mc9-3: Exact OLDRAD blast curve + EXPFRA cadence and authentic missile trails (retire the triangle blast)

## Story Details
- **ID:** mc9-3
- **Jira Key:** mc9-3
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc9-3-exact-oldrad-blast-curve
- **Branch Strategy:** gitflow

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T10:18:54Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T07:12:43Z | 2026-08-08T07:15:27Z | 2m 44s |
| red | 2026-08-08T07:15:27Z | 2026-08-08T09:31:48Z | 2h 16m |
| green | 2026-08-08T09:31:48Z | 2026-08-08T09:42:38Z | 10m 50s |
| review | 2026-08-08T09:42:38Z | 2026-08-08T10:01:31Z | 18m 53s |
| red | 2026-08-08T10:01:31Z | 2026-08-08T10:07:22Z | 5m 51s |
| green | 2026-08-08T10:07:22Z | 2026-08-08T10:10:08Z | 2m 46s |
| review | 2026-08-08T10:10:08Z | 2026-08-08T10:18:54Z | 8m 46s |
| finish | 2026-08-08T10:18:54Z | - | - |

## Background

The story premise is CONFIRMED TRUE: `plugins/missile-command/src/core/explosion.ts` currently implements `blastRadius()` as a "symmetric triangle" placeholder (lines ~17-27 and function at line 60). The OLDRAD per-tick curve and EXPFRA cadence are cited in comments as future fidelity work deferred to mc9. The task is to retire the triangle approximation and port the exact OLDRAD radius curve + EXPFRA cadence from PROCESS EXPLOSIONS (W3MAIN.MAC:1811).

## Acceptance Criteria

> ⚠ The following AC is reproduced verbatim from epic-mc9.yaml and is unedited.

- blastRadius() follows the exact OLDRAD per-tick curve with the EXPFRA growth/collapse cadence (not the mc1 symmetric triangle); the curve constants carry a byte-exact claim and the AC3 no-uncited-literal guard passes.
- missile trails render from the authentic DRAW MISSILE (W3DSUP.MAC:1221) styling; explosion.ts cites PROCESS EXPLOSIONS (W3MAIN.MAC:1811).
- citations.test.ts and purity.test.ts stay green after the core explosion change; existing blast/damage tests are updated to the real curve and pass.

## Sm Assessment

Setup diligence for mc9-3 (5pt, p1, tdd — the one core touch of epic mc9).

**Availability / contention.** No sibling owns this story: `git fetch --prune` + `git branch -r | grep mc9-3` returned nothing before I cut the branch; the cross-checkout `.session/` sweep matched nothing. My claim is now pushed (feat/mc9-3-exact-oldrad-blast-curve, epic stamp on origin) so the story is visible to any sibling probe.

**Dependency mc3: satisfied.** Epic mc3 is fully archived — mc3-1..5 are in `sprint/archive/sprint-2632-completed.yaml` and `sprint/archive/epic-mc3.yaml`.

**mc4 coordination: no conflict.** The story warns "coordinate with mc4 only if both edit explosion.ts." A sibling is actively working mc4-2 (`feat/mc4-2-end-of-wave-transition`), but `git diff origin/develop...origin/feat/mc4-2-end-of-wave-transition` shows it does NOT touch `explosion.ts`. No overlap; no coordination needed.

**Premise CONFIRMED (not stale).** `plugins/missile-command/src/core/explosion.ts` currently implements `blastRadius()` as a symmetric-triangle placeholder (comment block ~L17-27, function at L60); OLDRAD/EXPFRA are cited there only as deferred fidelity work. So the story's task — retire the triangle, port the exact OLDRAD per-tick curve + EXPFRA cadence — is real, unstarted work. Copied into Background as current fact.

**Base branch.** Cut from the fresh `origin/develop` (641b1f4d), not my stale local develop (which was 7 behind); pushed empty first, then the claim commit.

**Session hygiene.** ACs copied verbatim from `epic-mc9.yaml` (diffed — exact match, ⚠ note states so). `**Repos:**` field was omitted by sm-setup (known gotcha) — I added it manually. Story stamped `in_progress`.

**Handoff to TEA (Han Solo), RED phase.** The byte-exact OLDRAD table / EXPFRA cadence derivation is TEA/Dev's job via the rom-fidelity-audit skill — the `.MAC` ROM sources are gitignored, so expect source-derivation guards (skipIf on source availability) and a new claim (byte-exact REV-01) backing the curve constants so `citations.test.ts` and the AC3 no-uncited-literal guard stay green.

## Delivery Findings

No upstream findings.

### Reviewer (code review)
- No upstream findings. All four review findings (F1–F4) are in-scope for mc9-3's own rework — see the Reviewer Assessment severity table. They are localized to `explosion.ts` + `explosion.test.ts`; nothing spills into another story or file.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (red) — the exact per-frame timing pins the NATURAL model index = floor(t / 5)

The behavioural tests (`every frame matches authenticRadius`, `radius at each cadence step
equals OLDRAD[step]`, `finishes ... = 135 frames`) commit to ONE faithful reading of the
OLDRAD/EXPFRA port: `t` = video frames, `index = floor(t / EXPFRA_FRAMES)`, `radius =
OLDRAD[index]` until `index ≥ EXDONE`, lifetime `EXDONE·5 = 135` frames.

**Why this reading, and the alternative Dev/Reviewer should know about.** The ROM's PREXPL
*increments* EXTIME and *then* looks up `OLDRAD[EXTIME]`, so the first radius it displays is
`OLDRAD[1]`, and it finishes when EXTIME reaches EXDONE — i.e. an `index = floor(t/5) + 1`
reading with a 130-frame life. Because `OLDRAD[0] == OLDRAD[1] == 0`, the two readings are
**observationally identical at detonation** (radius 0 either way) and differ only by shifting
the whole curve one cadence step (peak/tail arrive 5 frames earlier, lifetime 130 vs 135).
TEA chose `floor(t/5)` because it matches the existing API contract (`startExplosion` → t=0 →
radius 0 = `OLDRAD[0]`) and needs no off-by-one bookkeeping. Dev implements to match the
tests; if Dev/Reviewer judges the EXTIME pre-increment the more faithful port, that is a
legitimate re-pin of these specific frame/lifetime expectations — flag it, don't silently
diverge. The byte-exact OLDRAD table, the asymmetry/plateau, and the 5-frame cadence itself
are NOT in question under either reading.

### Dev (implementation)

- **OLDRAD table stored as its source `.BYTE` text, parsed at load — not 29 inline literals**
  - Spec source: context-story-mc9-3.md AC1; tests/citations.test.ts §4 (AC3 no-uncited-literal guard)
  - Spec text: "the curve constants carry a byte-exact claim and the AC3 no-uncited-literal guard passes"
  - Implementation: `const OLDRAD = '0,0,2,…,0,0'.split(',').map(Number)` — the table is a single string literal (the guard strips string contents), backed by byte-exact `cite` claims MC-OLDRAD-RISE/-FALL whose verbatim re-opens at W3MAIN.MAC:1917/1919. The decoded table is pinned by explosion.test.ts's source-ground-truth decode and the behavioural curve tests.
  - Rationale: 29 inline literals (values 2..13) would each need a claimed numeric value; the `.BYTE`-table-as-string is the idiomatic representation (SYN-STCITY precedent) and keeps the byte-exactness in the checker-verified verbatim, not in a hand-typed value.
  - Severity: minor
  - Forward impact: none — the public API (blastRadius/isExplosionDone) is unchanged in shape; editing the table means editing one string plus its two claim verbatims.

- **EXPFRA_FRAMES (=5) registered in citations-source DERIVED with a consistency check**
  - Spec source: tests/citations-source.test.ts (mc2-6 M6 kind-tag rule); tests/citations.test.ts §4
  - Spec text: "every non-EQU claim carries a kind-tag string value, never a number" (DERIVED symbols exempt)
  - Implementation: MC-EXPFRA carries numeric value 5 (needed so the un-cited-literal guard covers `EXPFRA_FRAMES = 5`), so EXPFRA_FRAMES is added to the DERIVED set and given a consistency check that re-derives 5 = (EXPFIX byte count − 2) + 1 from the cited EXPFIX table — the DERIVED-extension pattern mc4-2/mc8-2 established.
  - Rationale: the cadence is a real game constant with a STRUCTURAL derivation (not a byte of its cited line), exactly the DERIVED case; the consistency check keeps the exemption honest (a fabricated cadence cannot ride into claimedValues).
  - Severity: minor
  - Forward impact: none — additive DERIVED entry plus a self-contained check.

### Reviewer (audit)

- **TEA — natural `index = floor(t/5)` model** → ✓ ACCEPTED by Reviewer: a faithful, API-consistent reading; the EXTIME pre-increment alternative is observationally identical at detonation (OLDRAD[0]=OLDRAD[1]=0) and the byte-exact table/cadence/asymmetry hold under either. Transparently flagged. Sound.
- **Dev — OLDRAD stored as parsed `.BYTE` string** → ✓ ACCEPTED by Reviewer: idiomatic table representation (SYN-STCITY precedent); byte-exactness lives in the checker-verified claim verbatims (MC-OLDRAD-RISE/-FALL, confirmed byte-exact at W3MAIN.MAC:1917/1919). I verified the AC3 guard's `gameLiterals()` regex actually strips the whole string, leaving zero numeric tokens. Sound.
- **Dev — EXPFRA_FRAMES in DERIVED + consistency check** → ✓ ACCEPTED by Reviewer: matches the mc4-2/mc8-2 DERIVED-extension pattern; the consistency check re-derives 5 from the EXPFIX byte count, giving the numeric exemption teeth. Sound.
- No UNDOCUMENTED deviations found: the retirement of the triangle was applied completely (rule_checker #24 grep for LIFETIME / `Math.min(t,LIFETIME-t)` / "symmetric triangle" found zero live survivors).

_(The four findings below are NOT deviation issues — they are quality defects in the delivered code/tests, addressed in the Reviewer Assessment.)_

## Tea Assessment

RED phase for mc9-3 — retire the triangle blast, port the byte-exact OLDRAD curve + EXPFRA
cadence, and give the in-flight ABM trail an authentic tip. Verified directly (full output),
not via the haiku runner: **714 passed | 10 failed**, only the two edited feature files fail;
`tsc --noEmit` clean repo-wide.

### What is RED and why (the feature tests, failing against the current triangle)

`plugins/missile-command/src/core/explosion.ts` is still the mc1-4 symmetric triangle
(`Math.min(t, LIFETIME-t)`, LIFETIME = EXDONE-1 = 26). The 10 failing tests:

- **AC1 exact curve** (`explosion.test.ts`): `blastRadius` must walk OLDRAD
  `[0,0,2,3,…,13,13,…,2,1,0,0]` sampled at `index = floor(t/5)` — asymmetric (skips 1 on the
  rise), plateaued (13 held two steps = 10 frames), carries a lone 1 on collapse, whole-curve
  pinned frame-by-frame. The triangle diverges at nearly every tick.
- **AC1 EXPFRA cadence**: radius changes ONLY on 5-frame boundaries and is flat within each
  window; lifetime = EXDONE·5 = **135 frames** (the triangle finishes in 26 — 5× too fast).
- **AC2 trail tip** (`render-battle.test.ts`): the in-flight ABM trail must draw a filled tip
  marker (`arc`) at its head per MISSILE TIPS & TRAIL (W3DSUP.MAC:925); today the ABM loop
  strokes a bare line. And `render.ts` must cite that routine.

### What is GREEN and load-bearing (do not let these regress)

- **Source-ground-truth witnesses** (`explosion.test.ts`, GREEN from day one): the expected
  OLDRAD array decodes **byte-exact** from `W3MAIN.MAC:1917-1919`, and the 5-frame cadence
  derives from the 6-byte `EXPFIX` table (`W3MAIN.MAC:1911`, EXPEND-EXPFIX-2 = 4 ⇒ 5). So the
  test's expectations are anchored to the ROM, not to a self-matching transcription.
- **Fixture robustness (AC3)**: `damage.ts` `peakBlast`, and the kill fixtures in
  `game.test.ts` / `sound-events.test.ts`, now build the blast at its PEAK (radius 13 on BOTH
  the triangle and the OLDRAD curve — a hardcoded `t` cannot, since the lifetimes differ).
  `render-palette.test.ts`'s stale `t in (0,26)` comment corrected. These are GREEN now and
  survive the curve change, so the ONLY reds Dev should chase are the feature tests above.

### Dev (GREEN, Yoda) — the contract

1. Replace `blastRadius` with the OLDRAD lookup at the 5-frame cadence (see the Design
   Deviation for the exact `floor(t/5)` timing model the tests pin). `isExplosionDone` at
   `index ≥ EXDONE`.
2. Back the new constants (OLDRAD table values 2..13, cadence 5) with a **byte-exact claim**
   in `docs/rom-study/claims/explosion.json` (extend, don't move — see the dup-id trap). The
   **AC3 no-uncited-literal guard** (`citations.test.ts` §4) requires every non-trivial literal
   in `src/core/*.ts` to be a claimed *value*, and it reads `Number(c.value)` — a claim whose
   `value` is a comma-string decodes to NaN and covers nothing, so each of 2..13 and 5 needs a
   claimed numeric value (or represent OLDRAD so the guard is satisfied). Keep `EXDONE`/`13`
   claims intact. Then cite PROCESS EXPLOSIONS (already present) and add an **EXPFRA** citation.
3. Render (AC2): add the tip marker to the ABM in-flight trail and cite MISSILE TIPS & TRAIL
   (W3DSUP.MAC:925). The DRAW MISSILE (W3DSUP.MAC:1221) base-ammo-stack citation STAYS — it is
   a different routine, already correct (user ruling recorded in the AskUser step).

### Rule Coverage (lang-review/typescript.md — the checks I designed against)

- **#15 source-text token-vs-claim**: the citation asserts (`toMatch(/PROCESS EXPLOSIONS/`,
  `/EXPFRA/`, `/MISSILE TIPS & TRAIL/`) follow the existing file convention (the citation lives
  in a comment). NOTE the explosion.ts one is GREEN now because the current header already
  mentions OLDRAD/EXPFRA as *deferred* work — it is a companion regression guard, not a feature
  RED; the behavioural tests carry the RED. The render.ts citation IS red now.
- **#18/#26 self-referential fixtures**: avoided — the OLDRAD oracle is source-verified, and
  direct-value tests (`[0,0,2]`, plateau count, last-radius-1) don't route through the helper.
- **#24 retirement blast radius**: swept for the OLD model's dependency — three hardcoded-`t`
  blast fixtures found beyond the story files (`game`, `sound-events`, `render-palette`);
  updated the two radius-dependent ones and the one stale comment.
- **Test quality (#8, Phase C)**: removed one weak cadence test that passed vacuously against
  the triangle (`changes < EXDONE` was true for the 26-frame triangle too).
- **Purity / no-uncited-literal**: enforced automatically by the existing `src/core` sweeps
  (`purity.test.ts`, `citations.test.ts`) the moment `explosion.ts` changes — not re-asserted.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/explosion.ts` — `blastRadius`/`isExplosionDone` now sample the byte-exact OLDRAD table at the EXPFRA 5-frame cadence (`index = floor(t / EXPFRA_FRAMES)`, done at `EXDONE`); the mc1-4 symmetric triangle is retired. OLDRAD stored as its source `.BYTE` text; `EXPFRA_FRAMES = 5` exported.
- `plugins/missile-command/src/shell/render.ts` — the in-flight ABM trail now draws an authentic flashing tip dot at the head (arc + fill), citing MISSILE TIPS & TRAIL (W3DSUP.MAC:925). The DRAW MISSILE (W3DSUP.MAC:1221) base-ammo-stack citation is untouched.
- `plugins/missile-command/docs/rom-study/claims/explosion.json` — +3 byte-exact claims: MC-OLDRAD-RISE / MC-OLDRAD-FALL (`cite` anchors at W3MAIN:1917/1919) and MC-EXPFRA (numeric 5, W3MAIN:1911).
- `plugins/missile-command/tests/citations-source.test.ts` — registered `EXPFRA_FRAMES` in DERIVED + a consistency check (see the Dev deviation).

**Tests:** missile-command 725/725 (GREEN); orchestrator 408/408; citation byte-checker 174/174 verified; `tsc --noEmit` clean repo-wide.

**Branch:** feat/mc9-3-exact-oldrad-blast-curve (pushed)

I implemented the exact model TEA pinned (natural `index = floor(t/5)`, lifetime `EXDONE·5 = 135` frames). No behavioural surprises: the shape/purity/kill-wiring suites stayed green with TEA's curve-robust fixtures. Visual acceptance of the trail tip and the now-longer blast at `/missile-command/` is the Reviewer/owner step — per render-battle.test.ts's own philosophy, node tests pin *what is drawn*; pixels are the Reviewer's job.

**Handoff:** To review (Obi-Wan Kenobi).
## Subagent Results (round 1 — superseded by round 2 below)

Enabled per `workflow.reviewer_subagents`: preflight, comment_analyzer, security, rule_checker. The other five are disabled via settings (pre-filled Skipped) — I assessed their domains (edge, test-quality, type) myself; the disabled edge/test specialists are the ones most relevant to this logic story, so I scrutinised boundary math and test teeth directly.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates GREEN) | N/A — but note its diff used a stale base (main), listing mc4-2 files not in origin/develop...HEAD; mechanical result still valid |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — I checked boundaries myself (F4 negative-t) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no swallowed errors in diff |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — I checked test quality myself; rule_checker also covered (F2, F3) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (F1 citation contradiction), dismissed 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — Explosion interface unchanged; no new type flaws |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (F4 negative-t; corroborated by rule_checker + my own analysis), dismissed 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — render strokeStyle-in-loop is a trivial nit, not raised |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (F2, F3 vacuous guards #15/#25; F4 #21/#22), dismissed 0 — all mutation/execution-verified |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled Skipped)
**Total findings:** 4 confirmed (F1 DOC, F2 RULE/TEST, F3 RULE/TEST, F4 SEC/RULE), 0 dismissed, 0 deferred

## Reviewer Assessment (round 1 — REJECTED, superseded by the round-2 APPROVED below)

**Verdict:** REJECTED

The port itself is excellent — the OLDRAD curve and EXPFRA cadence are byte-exact and faithful, the suite is 725/725, lint and the citation byte-checker are green, and the triangle retirement is complete (no survivors). But adversarial review surfaced **four confirmed project-rule violations** the green pipeline could not see, three of them mutation/execution-verified. None is Critical/High individually, but they are a cluster of non-dismissable violations of THIS project's two core disciplines — citation accuracy and mutation-tested guard teeth — and every fix is cheap. Per "cannot dismiss rule-matching findings" and "when in doubt, REJECT," this returns for a short rework rather than shipping four known defects into a fidelity codebase.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | `[DOC]` F1 — internally-contradictory citation: `MAX_BLAST_RADIUS` doc pins `906 (logical)` to phys 1917, but line 16 correctly pins the SAME `906 (logical)` to phys 1811 (PREXPL). The OLDRAD table's real logical line is ~953, not 906. Newly introduced by this diff. | `plugins/missile-command/src/core/explosion.ts:45` | Cite the table by its physical line to match line 18/49 and the MC-OLDRAD-PEAK claim: `the OLDRAD table maximum, \`W3MAIN.MAC:1917\` (physical).` Drop the false `906 (logical, phys 1917)` pairing. |
| [MEDIUM] | `[RULE]`/`[TEST]` F2 — tautological citation guards (lang-review #15/#25): `toMatch(/OLDRAD/)` and `toMatch(/EXPFRA/)` over the whole `explosion.ts` now match the CODE identifiers `const OLDRAD` (:53) / `export const EXPFRA_FRAMES` (:60), not the citations. Mutation-confirmed: strip every citation comment, tests stay green. | `plugins/missile-command/tests/explosion.test.ts` (the mc9-3 "cites PROCESS EXPLOSIONS…" test ~:423-432, and the pre-existing "cites EXDONE and the radius table…" ~:414-420) | Anchor to the CITATION, not the identifier: require the physical-line cites (e.g. `/W3MAIN\.MAC:1911/` for EXPFRA, `/W3MAIN\.MAC:1917/` for OLDRAD, or the `EXPFIX/EXPEND` comment text). `/PROCESS EXPLOSIONS/` is fine (no code identifier). |
| [MEDIUM] | `[RULE]`/`[TEST]` F3 — vacuous-under-mutation cadence test (lang-review #15): the `expect(t % EXPFRA_FRAMES).toBe(0)` sits inside `if (r !== prev)` with no collected-count assertion, so a frozen `blastRadius→0` mutant runs zero expects and stays green. | `plugins/missile-command/tests/explosion.test.ts` ("the radius changes ONLY at frame boundaries…" ~:350-365) | Collect the change-frames into an array; assert the count is > 0 (the curve DID change) FIRST, THEN that every change-frame is a multiple of `EXPFRA_FRAMES`. |
| [LOW] | `[SEC]`/`[RULE]` F4 — lost lower-bound guard (lang-review #21/#22): the rewrite kept only the upper guard (`idx >= EXDONE ? 0 : OLDRAD[idx]`); a negative/NaN `t` yields `OLDRAD[-1]/OLDRAD[NaN] = undefined` (old code returned 0 for `t <= 0`), and `isExplosionDone` reports `false` for the same input — an inconsistent pair. `render.ts:182-187` is a live second reader that would pass `NaN` into `ctx.arc(...)`. Not reachable via current `game.ts` (t only starts 0 and increments), but `Explosion` is an unvalidated interface and tests already build raw literals. | `plugins/missile-command/src/core/explosion.ts:82-90` | Restore the boundary: `const idx = oldradIndex(exp); return idx < 0 || idx >= EXDONE ? 0 : OLDRAD[idx]` (and `isExplosionDone` becomes consistent). Add a RED test pinning `blastRadius({t:-1}) === 0` and `blastRadius({t:NaN}) === 0`. |

### Subagent dispatch tags (all nine accounted for)
- `[DOC]` — F1 (comment-analyzer): CONFIRMED, verified against source (logical 953 ≠ 906).
- `[SEC]` — F4 (security, LOW): CONFIRMED, execution-verified; unreachable today, real regression + live second reader.
- `[RULE]` — F2, F3, F4 (rule-checker): CONFIRMED, all mutation/execution-verified against lang-review #15/#21/#22/#25.
- `[TEST]` — F2, F3 are the test-quality dimension (test_analyzer disabled; I + rule_checker covered it).
- `[EDGE]` — edge_hunter disabled; I checked boundaries myself → F4 is the boundary finding.
- `[SILENT]` — silent_failure_hunter disabled; no swallowed errors in the diff (no try/catch/empty-catch added).
- `[TYPE]` — type_design disabled; `Explosion` interface unchanged, no new stringly-typed/unsafe-cast APIs (F4 is arguably a missing runtime invariant on the existing interface, noted).
- `[SIMPLE]` — simplifier disabled; only nit is `ctx.strokeStyle = hue(SLOT.ABMS)` set inside the ABM loop (was once before) — harmless, not raised.

### Data flow traced
`state.abms[i].pos` (core, always constructed via game.ts spawn/step, t≥0) → `project()` → `ctx.arc(to.x, to.y, tipR)` tip dot (render, safe). And `state.explosions[i].t` → `blastRadius` → `render.ts:186 ctx.arc(radius)` / `damage.ts insideBlast`. The blast path is safe for the real t≥0 domain; the ONLY unsafe entry is a hand-built negative/NaN-`t` Explosion (F4), which no shipping code path produces.

### Rule Compliance (lang-review/typescript.md — applicable rules enumerated)
- **#15 / #25 source-text guards** — VIOLATION (F2): two positive `toMatch` anchors over the whole file match code identifiers. The render-battle `/MISSILE TIPS & TRAIL|W3DSUP\.MAC:925/` guard is COMPLIANT (neither token is a code identifier; verified no decoy — the sibling cite is :1221).
- **#15 loop-guard-with-no-count** — VIOLATION (F3): cadence test.
- **#17 comments asserting a mechanism** — COMPLIANT: the `(EXPEND-EXPFIX-2)+1=5` derivation and "game.ts wires stepExplosion" are independently re-derived/verified (rule_checker + my check); EXCEPT F1, which is the #17-class disprovable citation.
- **#18 / #26 self-referential fixtures** — COMPLIANT: OLDRAD oracle is witnessed by `oldradTable()` parsing the real source; `authenticRadius` is corroborated by direct-value tests.
- **#20 quantity measured from a same-diff artifact** — COMPLIANT: 135 = EXDONE·EXPFRA_FRAMES computed, not hardcoded; claims cite the vendored ROM, not explosion.ts's own lines.
- **#21 / #22 degenerate numeric input / inverted reject** — VIOLATION (F4): dropped `t<=0` guard.
- **#24 retirement applied everywhere** — COMPLIANT: zero triangle survivors (grep-verified).
- **CLAUDE.md purity** — COMPLIANT: explosion.ts stays pure (no clock/entropy/shell); purity.test.ts green.
- **CLAUDE.md un-cited-literal** — COMPLIANT: OLDRAD hidden in a string (guard strips it), EXPFRA_FRAMES=5 claimed + DERIVED-checked; AC3 guard green.

### Devil's Advocate
Argue this is broken. The headline risk is that the whole port is 5× slower and nobody looked at it on screen: the blast now lives 135 frames instead of 26, and NO test asserts what that FEELS like or that damage timing against ICBMs still works across the longer life — the kill-wiring tests use a peak blast at a single instant, not the full 135-frame sweep, so a bug where the blast kills for too long (135 frames of lethal radius vs 26) would sail through green. A confused player sees a blast that lingers ~2.25s at 60fps and thinks the game hung. Second: the negative-`t` hole (F4) is dismissed as "unreachable," but `Explosion` is a bare `{h,v,t}` interface with no constructor guard, and this very suite builds raw `{t:13}` literals — the moment a future story adds a "rewind" or "replay" feature, or a fixture with `t:-1`, `render.ts` throws `ctx.arc(NaN)` and the entire frame stops painting, silently, because the throw is uncaught in the RAF loop. Third: the citation guards (F2) are decorative — a future edit that strips explosion.ts's citation comments to "clean up" would leave the suite green while destroying the audit trail this ENTIRE project exists to protect; the guard that should scream is mute. Fourth: the OLDRAD table is a hand-typed 29-char string; a single transposed digit (say `...12,13,13,12...` → `...12,13,12,13...`) would be caught by the source-truth decode test, yes — but only because that test exists; the string itself carries no structural check. Fifth: F1's contradictory citation means a maintainer chasing the peak-radius source is sent to logical line 906, opens PREXPL, finds no `13`, and concludes the code is miscited — wasting exactly the time the citation was meant to save. None of these is catastrophic; several are unreachable today. But three are confirmed by mutation, and in a project whose reason to exist is byte-exact fidelity and auditable citations, "the code happens to be correct" is not the bar — "the guards prove it and the citations point true" is. They don't yet.

### Observations (VERIFIED items)
- `[VERIFIED]` OLDRAD upper-bound safety — `explosion.ts:82-84`: `idx >= EXDONE` returns 0 before indexing, so `OLDRAD[idx]` is only read for idx ∈ [0,26], all valid in the length-29 array. Complies with array-bounds safety.
- `[VERIFIED]` byte-exact table — `oldradTable()` (explosion.test.ts) parses W3MAIN.MAC and equals the expected 29-entry array; the byte-checker verifies MC-OLDRAD-RISE/-FALL/MC-EXPFRA against phys 1917/1919/1911. 174/174 claims verified.
- `[VERIFIED]` purity maintained — explosion.ts introduces only string/split/map/Math.floor/arithmetic; no clock/entropy/shell import; purity.test.ts green.
- `[VERIFIED]` retirement complete — no live triangle survivors (LIFETIME / Math.min / "symmetric triangle" grep clean).
- `[VERIFIED]` render tip citation — W3DSUP.MAC:925/931 byte-match render.ts's new comment; the base-stack :1221 cite is a distinct, correct routine.

**Handoff:** Back to TEA (red rework) — the fixes are test-guard corrections (F2, F3) plus a negative-`t` regression test for F4, then Dev for the F4 code guard and the F1 comment. All four are cheap and localized to explosion.ts + explosion.test.ts.
## TEA Rework (round 1)

Addressed the test-side of the Reviewer's four findings; the two code-side items (F1 comment, F4 guard) pass to Dev.

- **F2 (tautological citation guards)** — anchored both citation tests to the physical-line cites instead of the bare symbols: the mc9-3 test now requires `/W3MAIN\.MAC:1917/` (OLDRAD table) and `/W3MAIN\.MAC:1911/` (EXPFRA/EXPFIX); the pre-existing "radius source" test now requires `/PROCESS EXPLOSIONS/` (dropped the `/OLDRAD/` alternative that this diff turned into a code-identifier match). Both still green on current code — strengthened, not broken.
- **F3 (vacuous cadence test)** — collect the change-frames and assert the COUNT first (`> 20` and `<= EXDONE`) so a frozen `blastRadius→0` mutant fails instead of executing zero in-`if` assertions, THEN assert every change lands on a 5-frame boundary. Green on current code (~25 changes, all multiples of 5).
- **F4 (degenerate-t clamp)** — NEW RED test (`mc9-3 F4 …`): `blastRadius({t})` must be exactly 0 (finite, never undefined/NaN) and `isExplosionDone({t})` must be true, for t ∈ {-1,-5,-100,NaN}. Currently RED (returns undefined / false). **Handoff note to Dev (Yoda):** the reviewer's suggested `idx < 0 || idx >= EXDONE` guard does NOT catch NaN (all NaN comparisons are false → OLDRAD[NaN]=undefined); use `return idx >= 0 && idx < EXDONE ? OLDRAD[idx] : 0`, and mirror the range check in `isExplosionDone` so the pair stays consistent.
- **F1 (contradictory citation)** — NOT a test; Dev fixes explosion.ts:45 to cite `W3MAIN.MAC:1917` (physical), matching lines 18/49 and MC-OLDRAD-PEAK, dropping the false `906 (logical, phys 1917)` pairing.

State after rework: full mc suite 725/727 (only the 2 F4 tests RED), lint clean.
## Dev Rework (round 1)

Resolved the two code-side reviewer findings:

- **F4 (degenerate-t clamp)** — `blastRadius` now returns `idx >= 0 && idx < EXDONE ? OLDRAD[idx] : 0`, clamping both bounds (negative and NaN indices, which the reviewer's suggested `idx < 0` form would have missed since all NaN comparisons are false). `isExplosionDone` mirrors it: `!(idx >= 0 && idx < EXDONE)` — a degenerate or collapsed blast reads done, a live blast (idx in [0,EXDONE)) does not. Behaviour is unchanged for all real t ≥ 0. TEA's F4 RED tests (t ∈ {-1,-5,-100,NaN}) now pass.
- **F1 (contradictory citation)** — `explosion.ts:45` now cites `W3MAIN.MAC:1917` (physical), matching the table's own cite (lines 18/49) and the MC-OLDRAD-PEAK claim; the false `906 (logical, phys 1917)` pairing is gone. Kept it a SINGLE-LINE JSDoc so the AC3 un-cited-literal guard strips it (a multi-line block would have leaked 1917/906/1811 as uncited literals — verified the guard stays green).

State: full mc suite 727/727, citation byte-checker 174/174, orchestrator 408/408, tsc clean.
## Subagent Results

Round 2 (re-review of the rework delta `git diff 1e3cf142...HEAD`, 2 files). Same four enabled specialists re-dispatched on the delta; the five disabled remain Skipped. Every enabled specialist independently confirmed the four round-1 findings fixed, with mutation/execution verification, and found no fix-introduced regression (#13). I also verified all four myself first-hand (F1 grep, F4 execution, F2/F3 mutation, #13 uncited-literal check) before dispatching.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates GREEN: 727 mc / 408 orch / 174 claims / lint) | N/A — rework quality confirmed |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — F4 boundary verified by me + rule_checker |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no swallowed errors |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — F2/F3 test teeth mutation-verified by me + rule_checker |
| 5 | reviewer-comment-analyzer | Yes | clean | none | confirmed F1 resolved (cross-checked vs .MAC + claim); no new/stale comment issues |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — Explosion interface unchanged |
| 7 | reviewer-security | Yes | clean | none | confirmed F4 fixed (negative/NaN/±Inf → finite 0; render sink safe); no injection surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations) | confirmed F2/F3/F4 fixed (mutation-verified) + #13 clean (no leak, no self-ref, no bypass reader) |

**All received:** Yes (4 enabled returned clean; 5 disabled Skipped)
**Total findings:** 0 new. All four round-1 findings (F1–F4) confirmed RESOLVED and verified.

## Reviewer Assessment

**Verdict:** APPROVED

Round-2 re-review of the rework. All four round-1 findings are fixed and independently verified — by every enabled specialist AND by my own first-hand checks (grep, execution, mutation). No fix introduced a regression (#13 clean). The story ships a byte-exact, faithful OLDRAD/EXPFRA port with mutation-tested guard teeth, accurate citations, and a robust degenerate-input boundary.

**Round-1 findings — final disposition (all CONFIRMED FIXED):**
- `[DOC]` F1 — `explosion.ts:45` now cites `W3MAIN.MAC:1917` (physical), matching lines 18/49 and the MC-OLDRAD-PEAK claim; the false `906 (logical, phys 1917)` pairing is gone. Kept single-line so the AC3 guard strips it (no uncited-literal leak — mutation-checked). Verified: comment-analyzer + rule-checker (#13) + my grep.
- `[RULE]`/`[TEST]` F2 — citation guards now anchor to `/PROCESS EXPLOSIONS/`, `/W3MAIN\.MAC:1917/`, `/W3MAIN\.MAC:1911/` (comment-only tokens, not code identifiers). MUTATION-VERIFIED (rule-checker + me): redacting those comments reddens the guards. lang-review #15/#25 satisfied.
- `[RULE]`/`[TEST]` F3 — cadence test collects `changeFrames` and asserts count (`>20`, `<=EXDONE`) before the per-frame check. MUTATION-VERIFIED (rule-checker + me): a frozen `blastRadius→0` now reddens it. lang-review #15 satisfied.
- `[SEC]`/`[RULE]` F4 — `blastRadius` = `idx >= 0 && idx < EXDONE ? OLDRAD[idx] : 0`; `isExplosionDone` = `!(idx >= 0 && idx < EXDONE)`. Handles negative, NaN, and ±Infinity → finite 0 / done, consistent pair; normal t (0..135) unaffected. EXECUTION-VERIFIED (security + rule-checker + my own run). lang-review #21/#22 satisfied. `oldradIndex` is private and both callers are guarded — no bypassing reader.

### Subagent dispatch tags (round 2)
- `[DOC]` — comment-analyzer: CLEAN (F1 resolved).
- `[SEC]` — security: CLEAN (F4 fixed, no injection surface).
- `[RULE]` — rule-checker: CLEAN, 0 violations (F2/F3/F4 fixed, #13 clean).
- `[TEST]` — F2/F3 test teeth restored, mutation-verified (test_analyzer disabled; covered by rule-checker + me).
- `[EDGE]` — edge_hunter disabled; the boundary (F4) is fixed and execution-verified across {-1,-5,-100,NaN,0,10,134,135}.
- `[SILENT]` — silent_failure_hunter disabled; no swallowed errors introduced by the fixes.
- `[TYPE]` — type_design disabled; Explosion interface unchanged; F4 adds the missing runtime range invariant at the two consumers.
- `[SIMPLE]` — simplifier disabled; the fixes add no unnecessary complexity (a positive-range check + a negation).

### Data flow traced
`Explosion.t` (t ≥ 0 in all shipping paths; game.ts starts 0, steps +1) → `oldradIndex` (private) → guarded `blastRadius`/`isExplosionDone` → `render.ts:186 ctx.arc(finite radius)` / `damage.ts`. The one previously-unsafe entry — a hand-built negative/NaN-`t` Explosion — now clamps to 0/done, so `ctx.arc` always receives a finite value.

### Rule Compliance (round 2)
- **#15 / #25** — COMPLIANT (F2/F3 fixed, mutation-verified).
- **#21 / #22** — COMPLIANT (F4 fixed; NaN-safe positive-range test; consistent pair).
- **#13 fix-regressions** — COMPLIANT: no new uncited literal (F1 single-line comment stripped), no self-referential bound (F3), no unrun-mechanism claim (F4 comments mutation-verified).
- **#17 comments** — COMPLIANT (F1 resolved; new comments accurate).
- **CLAUDE.md purity / un-cited-literal** — COMPLIANT (unchanged; suite green).

### Devil's Advocate
Argue it is still broken. The blast now lives 135 frames and no test drives a full-life ICBM-kill sweep — but the damage/game tests exercise the peak-radius kill wiring, and the curve/lifetime are pinned frame-by-frame, so a "lethal too long" bug would show as a wrong OLDRAD value (caught) not a silent timing drift; the concern is a gameplay-FEEL question for the owner's screenshot, not a correctness hole. The degenerate-`t` clamp treats `t<0` as "done" rather than "not yet started" — semantically odd — but `t<0` is unreachable in the sim and the only requirement (never emit undefined/NaN into render) is met; picking "done" over "not started" for an impossible input is a safe, consistent choice. The F2 guards now demand specific physical line numbers (1917/1911) — a future ROM re-vendor that shifts those lines would redden them; that is the guard working (it should redden until the citation is re-verified), not a fragility bug. The isExplosionDone JSDoc is multi-line — could it leak a literal? It carries no digits, and the #13 check + the green AC3 guard confirm no leak. Nothing here rises to a defect: the four confirmed issues are fixed with teeth, and the remaining items are either owner-facing feel checks or safe choices for unreachable inputs.

### Observations (VERIFIED)
- `[VERIFIED]` F4 boundary — executed blastRadius/isExplosionDone across {-1,-5,NaN,0,10,134,135}: degenerate → 0/done, normal preserved (0→0/not-done, 10→2, 134→1, 135→0/done). explosion.ts:82-97.
- `[VERIFIED]` F2 teeth — the anchor tokens appear only on comment lines (16,18,45,48,49,59); no code line carries them.
- `[VERIFIED]` F3 teeth — frozen-radius mutant reddens the cadence test (1 fail), restored clean.
- `[VERIFIED]` F1 — explosion.ts:45 cites phys 1917, no 906/1917 contradiction; cross-checked vs W3MAIN.MAC.
- `[VERIFIED]` no #13 regression — new comments carry no non-trivial digit; AC3/citations 132/132 green; full suite 727/727, orchestrator 408/408, byte-checker 174/174, tsc clean.

**Data flow traced:** Explosion.t → guarded blastRadius/isExplosionDone → render ctx.arc (always finite) / damage — safe.
**Pattern observed:** positive-range clamp `idx >= 0 && idx < EXDONE` shared by both consumers — consistent, NaN-safe. explosion.ts:82-97.
**Error handling:** degenerate/out-of-range index → 0 / done, never undefined/NaN.
**Handoff:** To SM for finish-story.