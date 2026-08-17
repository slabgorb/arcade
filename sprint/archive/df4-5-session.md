---
story_id: "df4-5"
jira_key: "df4-5"
epic: "df4"
workflow: "tdd"
---
# Story df4-5: Bombers, mines, pods & swarmers, probes

## Story Details
- **ID:** df4-5
- **Jira Key:** df4-5
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Type:** Feature
- **Points:** 3
- **Priority:** p2

## Acceptance Criteria

1. **Dossier Mapping (RED gate):** The enemy-identity dossier `plugins/defender/docs/rom-study/claims/15-enemies.json` is extended with entries mapping each ROM internal label to its arcade-marketing enemy name:
   - START BOMB (defender/DEFB6.SRC:1134) → BOMBER (arcade name)
   - TIE PROCESS (defender/DEFB6.SRC:1023-1024) → [arcade name to be sourced] (corroborate with TIE colour table :1206)
   - MSWM mini-swarmer / MINI SWARM PROCESS / SWARM BOMB (defender/DEFB6.SRC:141,151,195,251) → POD/SWARMER (arcade name)
   - PROBE START (defender/DEFB6.SRC:85,116) → PROBE (arcade name)
   Each entry includes all required fields (id, claim, source.file, source.line, source.verbatim) so the RED test's per-row `expectPopulated` check passes before any citation verification.

2. **Per-Enemy RED Populated Check:** The RED test phase includes a per-row `expectPopulated` assertion (prior defender df4 pattern) that verifies each new enemy dossier entry has all required fields BEFORE citation byte-checks, preventing vacuous-pass on coverage/byte sweeps (the identity glossary gate).

3. **Bomber Reducer (Core):** A PURE `plugins/defender/src/core/bombers.ts` reducer implements the START BOMB process (defender/DEFB6.SRC:1134), modeling the bomber lifecycle; all constants cited in claims/*.json; purity.test.ts green (no fetch/canvas/Date/Math.random); tested against SYNTHETIC process snapshots.

4. **TIE Reducer (Core):** A PURE `plugins/defender/src/core/ties.ts` reducer implements the TIE process (defender/DEFB6.SRC:1023-1024) including its own colour table (defender/DEFB6.SRC:1206); each constant gated by a claims/*.json entry; consumes df4-1's COLIDE box pre-test for collision queries; purity.test.ts green; tested against SYNTHETIC processes.

5. **Pod/Swarmer Reducers (Core):** PURE `plugins/defender/src/core/pods.ts` and `plugins/defender/src/core/swarmers.ts` reducers implement the MSWM mini-swarmer process (defender/DEFB6.SRC:141,151), the MINI SWARM PROCESS (defender/DEFB6.SRC:195), and the SWARM BOMB/shoot-releases-swarmers mechanic (defender/DEFB6.SRC:251); each constant cited; purity.test.ts green; tested against SYNTHETIC process state with careful attention to the parent→child spawn pattern (the pod-to-swarmers materialization).

6. **Probe Reducer (Core):** A PURE `plugins/defender/src/core/probes.ts` reducer implements the PROBE START process (defender/DEFB6.SRC:85,116); all constants cited; purity.test.ts green; tested against SYNTHETIC snapshots.

7. **Synthetic Test Coverage:** All four enemy types are exercised against SYNTHETIC process state (no live enemy scheduler integration this story); critical behavior mutation-proven; the parent→child spawn pattern (pod materializing swarmers) tested without bloating this story — if complexity requires, file a follow-up rather than bloat the 3-pt scope.

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-17T19:27:44Z
**Round-Trip Count:** 1
**Branch:** feat/df4-5-bombers-mines-pods-swarmers-probes
**Branch Strategy:** gitflow (standard feature branch from develop)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T14:24:03Z | 2026-08-17T14:25:31Z | 1m 28s |
| red | 2026-08-17T14:25:31Z | 2026-08-17T16:26:05Z | 2h |
| green | 2026-08-17T16:26:05Z | 2026-08-17T19:00:55Z | 2h 34m |
| review | 2026-08-17T19:00:55Z | 2026-08-17T19:15:29Z | 14m 34s |
| green | 2026-08-17T19:15:29Z | 2026-08-17T19:19:58Z | 4m 29s |
| review | 2026-08-17T19:19:58Z | 2026-08-17T19:27:44Z | 7m 46s |
| finish | 2026-08-17T19:27:44Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Gap** (non-blocking): the pod→swarmer spawn is wired only through the injected `releaseSwarmer` sink — no live bank-to-bank materialization this story (synthetic-only per AC7). Affects `plugins/defender/src/core/probes.ts` + `swarmers.ts` (df5 must connect `killPod`'s release sink to `createSwarmerBank.spawnSwarmer` on the shared scheduler). *Found by Dev during implementation.*
- **Gap** (non-blocking): bomb expiry, bomber/swarmer flight paths, pod drift, and the SWCNT (SWARMER_MAX) spawn-cap refusal are all disclosed df5 placeholders (see Design Deviations). Affects `plugins/defender/src/core/{ties,swarmers,probes}.ts` (df5 replaces the placeholder magnitudes with wave-table RAM and adds the live enforcement). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the three df4-5 banks are near-identical to landers/mutants in shape (record array + spawn-guard + kill-remove + scheduler process). A shared `createEnemyBank` factory could unify them, but the extraction bar (lang-review #18) is not yet met for the spawn/kill skeleton — revisit if a df5 enemy adds a fourth copy. Affects `plugins/defender/src/core/` (potential future refactor, not this story). *Found by Dev during implementation.*
- **[Rework r1] Improvement** (non-blocking, deferred): the Reviewer's two non-blocking items are left as filed follow-ups, NOT fixed this pass (they are not required and adding untested guards is scope creep): (a) the degenerate-`rand()` boundary guard in `probes.ts`/`ties.ts` (contract-bounded 0..255, matches approved `mutants.ts` precedent); (b) the banner-vs-label citation nudges (consistent with the accepted landers/mutants banner-cite precedent). A fleet-wide `rand` contract-guard is the right home for (a). Affects `plugins/defender/src/core/{probes,ties,swarmers}.ts`. *Found by Dev during rework.*

- **[TEA/RED] Identity trap — story AC1's ROM→arcade mapping was a wrong guess; corrected from source (user-ruled 2026-08-17).** The ROM enemy codenames do NOT match the arcade-marketing names as AC1 assumed. Sourced from DEFB6.SRC + the MESS0.SRC attract-mode name table (MESS0 SWRMP→POD :270, BOMBR→BOMBER :273, SWARMR→SWARMER :276) and the WVTAB wave roster (BLK71.SRC:675+ LANDERS/TIES/PROBES/SCHITZOS/SWARMERS):
  - **TIE (DEFB6.SRC:1023) = the arcade BOMBER**, not "to be sourced". Proof: the TIE process drops bombs — `:1112 TIE31 LDA LSEED BOMB? / :1113 ANDA #$7 / :1114 BNE TIEX / :1115 BSR BOMBST` (1/8 per dispatch). MESS0:341 `BOMBER FCC "BOMBER/"`.
  - **BOMBST (START BOMB, :1136) = the bomber's BOMB/mine (ammo), NOT an enemy.** AC1 said "START BOMB → BOMBER" — wrong; the bomb is what the Bomber(TIE) lays. BMBCNT cap 10 (:1137), lifetime SEED&$1F+1 (:1146-1148).
  - **PROBE (PRBST, :85) = the arcade POD**, not "PROBE" (which is not even a marketing name). Proof: `:118 PRBKIL / :119 LDA #6 / :122 JSR MMSW` releases up to 6 mini-swarmers on death; POD is 1000pts (MESS0:270/399).
  - **MSWM (:141) = the arcade SWARMER** (MESS0:418 `SWARMR FCC "SWARMER/"`), not "POD/SWARMER".
  - The 6 arcade enemies map 1:1 onto 6 ROM processes; BOMBST is ammo. **Structure ruled: modules ties.ts (bomber+bomb), probes.ts (pod), swarmers.ts (swarmer); the AC5 pods.ts is spurious and DROPPED.** See memory `defender-tie-is-bomber-probe-is-pod`.

### Reviewer (code review)

- **Gap** (blocking): the identity glossary gate's ARCADE-NAME tooth is vacuous — a wrong identity in a row's bold label ships green. Affects `plugins/defender/tests/df4-5-enemy-identity.test.ts` (anchor `id.arcade` to the row's bold `**Name**` declaration, not the whole row, and mutation-prove all three rows). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the injected `rand()` seam is used unguarded for numeric math in `probes.ts` (`(rand()%6)+1`) and `ties.ts` (`rand()&mask`); a degenerate rand breaks the "always ≥1 swarmer" invariant / opens the drop gate. Not production-reachable (rand contract is a 0..255 byte) and matches the shipped `mutants.ts`/`landers.ts` precedent — a cheap boundary guard (or an explicit contract assertion at injection) would harden it fleet-wide. Affects `plugins/defender/src/core/{probes,ties}.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): several source-comment ROM citations anchor to the banner line rather than the labeled instruction (TIEKIL :1118→1120, MSWMF :245→246, TCTAB :1206→1207, the seek range :196-200 vs the compare/negate at 201-203, and `LEAY ,X` attributed to MMSW when it is `PRBKIL` :121). Consistent with the landers/mutants precedent (banner cites), so non-blocking, but nudging each to the instruction line would raise fidelity. Affects `plugins/defender/src/core/{ties,swarmers,probes}.ts`. *Found by Reviewer during code review.*
- **[Re-review r1] Improvement** (non-blocking): the hardened identity anchor `/the \*\*([^*]+)\*\*/.exec(r)` takes the FIRST `the **…**` span in the row. Unambiguous for all current rows (each has exactly one bold `the **Name**`), and mutation-proven for the 3 df4-5 rows — but if a future df4-6+ row adds an earlier `the **…**` aside before its primary declaration, `.exec` would anchor to the wrong span. A latent generality gap, not a defect in current content. Affects `plugins/defender/tests/df4-5-enemy-identity.test.ts` (whoever adds the next identity row should keep the bold primary label first, or tighten the regex to the arcade set). *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Bomb lifetime is stored but not counted down / expired.**
  - Spec source: context-story df4-5 AC3 + df4-5-bombers.test.ts SCOPE FENCE
  - Spec text: "a laid bomb's lifetime (≥1)" is IN; "the bomb-vs-player collision (df4-1's COLIDE consumes it later)" is OUT
  - Implementation: `ties.ts` computes `lifetime = (SEED & $1F)+1` on each laid bomb (≥1, cited), but does not tick it down or remove expired bombs — bombs persist and the bank fills to the BMBCNT cap (BOMB_MAX=10), which is exactly what the cap test exercises.
  - Rationale: no test drives bomb expiry, and a bomb's death/expiry is bound up with its collision behavior (df4-1/df5). Ticking a value nothing reads would be untested scope creep (minimalist discipline).
  - Severity: minor
  - Forward impact: df5 (the live bomb entity / bomb-vs-player) must add the per-tick lifetime countdown + removal; the `lifetime` field is already populated for it to consume.

- **Bomber cruise-altitude tracking implemented as a minimal disclosed placeholder (CRUISE_STEP).**
  - Spec source: df4-5-bombers.test.ts SCOPE FENCE + BomberDeps contract + the per-tick #21 guard test
  - Spec text: SCOPE FENCE marks "the TIE's squad/cruise-alt flight path (wave-table RAM, df5)" OUT; yet BomberDeps injects `player` "its cruise altitude tracks the player" and the #21 test asserts a NaN player never corrupts the bomber's Y.
  - Implementation: the bomber reads `player()` and approaches the player's Y by `CRUISE_STEP` (a disclosed df4-5 placeholder, not a ported ROM byte) under a finite-guard. This keeps the #21 guard NON-vacuous (the guard is meaningful only if the bomber actually consumes the pose) while leaving the full squad/flight path to df5.
  - Rationale: implementing the guarded altitude read is what makes TEA's #21 fire on a real code path; the exact flight speed is wave RAM (no fixed byte), so it is disclosed as a placeholder exactly as landers.ts/mutants.ts do.
  - Severity: minor
  - Forward impact: df5 replaces CRUISE_STEP (and the X flight path) with the wave-table SWXV-style logic; the seam (deps.player + the finite guard) is in place.

- **Swarmer/pod flight + SWARMER_MAX cap enforcement deferred; speeds are disclosed placeholders.**
  - Spec source: df4-5-swarmers.test.ts / df4-5-pods.test.ts SCOPE FENCE + TEA handoff
  - Spec text: "the Y damping/random/clamp flight detail (SWXV/SWSTIM are wave RAM, placeholders — df5)"; "the pod's random drift path (wave RAM, df5)"; TEA: "the wave-table speeds … are df5 placeholders (disclose them as landers.ts/mutants.ts do)."
  - Implementation: `swarmers.ts` seeks the player in X only (Y held constant), with `SEEK_X_STEP`/`SHOT_TIMER` disclosed placeholders; `probes.ts` keeps the pod a live process with a disclosed `POD_NAP`, no drift path. `SWARMER_MAX=20` is exported and claim-pinned (cited) but NOT enforced in `spawnSwarmer` — unlike `BOMB_MAX`, no test caps the swarmer count, and the mutants.ts precedent exports its cap without a spawn guard.
  - Rationale: reproduce DIRECTION/STRUCTURE now (the identities the story is about), leave exact magnitudes and the count-cap enforcement to df5 where the wave logic and a scheduler-integrated spawn path exist. Enforcing an untested cap would be speculative.
  - Severity: minor
  - Forward impact: df5 adds the Y flight, the pod drift, and the SWCNT-cap refusal in the live spawn path; the constants are already cited for it.

- **[TEA/RED] Module list corrected vs AC3-6 (user-ruled 2026-08-17).** Spec (AC1/AC3-6) listed bombers.ts (START BOMB→Bomber), ties.ts (TIE→?), pods.ts + swarmers.ts (MSWM), probes.ts (PROBE). Source proves that mapping wrong (see Delivery Findings). Corrected deliverable: **ties.ts** (the TIE = Bomber flyer, which lays BOMBST bombs), **probes.ts** (the PROBE = Pod, which releases swarmers on kill), **swarmers.ts** (MSWM = Swarmer). `pods.ts` is DROPPED (no separate pod process exists — PROBE is the pod). Why: the epic's core rule is "enemy identity is a cited mapping, not a guess — a wrong identity stated in prose ships GREEN"; following AC1 literally would ship exactly that.

- **[Rework r1] Dev tightened a TEA-authored test to close the Reviewer HIGH finding.**
  - Spec source: Reviewer Assessment (HIGH, blocking) + AC1/AC2 (the anti-guess identity tooth)
  - Spec text: "a per-row expectPopulated assertion ... preventing vacuous-pass ... the arcade-name-in-prose tooth (catches the AC1 guess)"
  - Implementation: rewrote `df4-5-enemy-identity.test.ts:95-104`'s arcade-name check from `rows.some(r => id.arcade.test(r))` (matched the name ANYWHERE in the verbose row → vacuous) to `rows.every(r => bold=/the \*\*([^*]+)\*\*/.exec(r); id.arcade.test(bold[1]))` — anchored to the row's BOLD primary declaration.
  - Rationale: Reviewer proved (and I re-proved) a wrong bold label shipped 8/8 green. Anchoring to the bold `**Name**` makes the AC2 tooth non-vacuous. Dev editing a TEA test is at the Reviewer's explicit direction (green-rework routing).
  - Severity: minor (test-hardening; restores spec intent, no production behavior change)
  - Forward impact: any future df4 identity row (df4-6+) is now guarded — a wrong bold identity reddens. Mutation-proven: flipping each of the 3 rows' bold label → exactly 1 RED.

### Reviewer (audit)

- **Bomb lifetime stored not ticked (Dev deviation 1)** → ✓ ACCEPTED by Reviewer: bomb expiry is bound up with the df4-1/df5 collision entity and no test drives it; storing a ≥1 `lifetime` and capping via BOMB_MAX is faithful and the cap test exercises it. Sound.
- **Bomber cruise-altitude placeholder CRUISE_STEP (Dev deviation 2)** → ✓ ACCEPTED by Reviewer: reading `player().y` under a finite-guard is what makes TEA's per-tick #21 guard non-vacuous; the magnitude is a disclosed wave-RAM placeholder, matching landers/mutants. Correct call.
- **Swarmer/pod flight + SWARMER_MAX enforcement deferred (Dev deviation 3)** → ✓ ACCEPTED (deferral) / ✗ FLAGGED (the comment): deferring the Y-flight/pod-drift and the live SWCNT refusal to df5 is fine for a synthetic story, BUT the `swarmers.ts:27` comment "at most 20 swarmers alive at once" asserts a cap the code never enforces (rule #17 — a false mechanism claim). Fix in rework: enforce SWARMER_MAX in `spawnSwarmer` (BOMB_MAX precedent) OR reword the comment to disclose the cap is df5's to enforce. See Reviewer finding [DOC/#17].
- **[TEA/RED] Module-list correction (ties/probes/swarmers, pods.ts dropped)** → ✓ ACCEPTED by Reviewer: the source-true identities are byte-verified correct (all 15 claims re-open; TIE=Bomber via BSR BOMBST :1115, PROBE=Pod via JSR MMSW :122, MSWM=Swarmer); dropping `pods.ts` is clean (no stray reference in the diff). Sound and correctly executed.
- **[Rework r1] Dev tightened the TEA identity test to the bold `**Name**` anchor** → ✓ ACCEPTED by Reviewer (re-review): the fix is correct and mutation-proven — I re-ran it via rule-checker: flipping each of the 3 rows' bold label to a wrong enemy now reddens exactly 1 test (was 8/8 green). Dev editing a TEA test was at the Reviewer's explicit green-rework direction, restores AC2's anti-guess intent, and changes no production behavior. Sound.

---

## TEA Assessment

**RED by:** O'Brien (TEA), 2026-08-17. Commit `fc0ffc16`. 29 new tests RED with
self-describing "not built yet" errors; 563 defender tests green; `npm run lint` clean.

**Source research (the story's real first deliverable).** The story's AC1 ROM→arcade
mapping was a wrong guess; I sourced the truth from the ROM before writing a line of test
(user ruled "source-true structure", 2026-08-17). See Delivery Findings + memory
`defender-tie-is-bomber-probe-is-pod`:
- **TIE (:1023) = Bomber** — it drops bombs (:1112-1115 `BSR BOMBST`). MESS0:341.
- **BOMBST (:1136) = the bomber's bomb/mine** (ammo, not an enemy).
- **PROBE (:85) = Pod** — PRBKIL releases 1..6 swarmers (:118-122 `LDA #6 / JSR MMSW`). MESS0:399.
- **MSWM (:141) = Swarmer.** MESS0:418.
- Modules corrected to **ties.ts / probes.ts / swarmers.ts**; the AC5 `pods.ts` is DROPPED.

**Test surface (what GREEN must make pass):**
- `df4-5-enemy-identity.test.ts` (AC1/AC2) — the identity glossary gate: per-row
  `expectPopulated` BEFORE the `rowCites` byte-check (anti-vacuous, lang-review #15), the
  arcade-name-in-prose tooth (catches the AC1 guess), whole-file coverage sweep, byte-verified
  claim pins for the identity PROOFS (:1115, :122), the fixed constants (:1116,:1113,:1137,:1146,:119,:148,:249),
  and the MESS0 arcade names (:341,:399,:418), and the byte-for-byte re-open of every claim.
- `df4-5-bombers.test.ts` (ties.ts = Bomber) — TIE_NAP=1/BOMB_MAX=10/BOMB_DROP_MASK=7/BOMB_LIFETIME_MASK=0x1F
  constants; spawn + #21 reject; the 1/8 bomb-drop gate is REAL (drops when open, none when shut);
  the BMBCNT≤10 cap checked every tick (non-vacuous — proven bombs were actually laid); bomb
  lifetime ≥1; kill; per-tick NaN-player guard.
- `df4-5-pods.test.ts` (probes.ts = Pod) — POD_SWARMER_MAX=6; spawn + #21 reject; the burst
  identity proof (killPod releases 1..6 swarmers at the pod position); kill removes; the burst is
  idempotent (no double-burst on a second kill).
- `df4-5-swarmers.test.ts` (swarmers.ts = Swarmer) — SWARMER_NAP=3/SWARMER_MAX=20; spawn + #21
  reject; SEEK-X both directions; SHOOT-on-timer + re-arm aimed at the player; kill; per-tick
  NaN-player guard (position finite AND no shot fired — both halves).

**Rule Coverage (lang-review + project rules):**
- **#15 (vacuous sweep):** every data-driven loop states its population first — identity
  `expectPopulated`, the bomb-cap/NaN loops assert `ticksChecked` ran fully, the pod idempotency
  asserts the first burst was non-empty before checking the second is a no-op.
- **#21 (non-finite boundary):** every reducer rejects a non-finite spawn coord (no leaked
  process) AND guards the per-tick injected `player()` pose (bomber/swarmer stay finite; the
  swarmer additionally fires no shot at a NaN player — the fire half, the df4-4 F9 lesson).
- **#18 (one concept, one helper):** the three suites share ONE contract helper
  (`df4-5-enemies-contract.ts`) and reuse the existing `EnemyDeps`/`stepUntil`/`dossier-audit`
  seams rather than growing copies.
- **Purity (core/shell boundary):** the three new `src/core/*.ts` stubs are auto-swept by the
  armed `purity.test.ts` (no new purity test needed); GREEN's reducers must stay clock/entropy/
  browser/shell-free.
- **Identity glossary gate (project rule):** the anti-guess tooth + byte-verified claim pins are
  the df4 recurring pattern — the whole point of this story.

**Handoff:** → Dev (GREEN) to implement ties.ts / probes.ts / swarmers.ts and the dossier
(glossary.md rows + claims/*.json for the identity proofs, constants, and MESS0 names). All
constants and identities are byte-cited above; do NOT invent magnitudes — the wave-table speeds
(SWXV/SZ*/TIE flight) are df5 placeholders (disclose them as landers.ts/mutants.ts do).

## SM Assessment

**Setup by:** Keith Avery (SM), 2026-08-17. Story df4-5 (3pt, p2, defender, tdd).

**Premise verified before setup (falsifiable-claim rule):** every ROM cite in the story title was confirmed against the Defender DEFB6.SRC source locations:
- START BOMB `:1134`
- TIE PROCESS `:1023-1024` with colour table `:1206`
- MSWM mini-swarmer + MINI SWARM PROCESS + SWARM BOMB `:141,151,195,251`
- PROBE START `:85,116`

No stale-description hazard. Dependencies df4-1 (COLIDE) and df4-2 (effects) are landed and approved (df4-1 merged, df4-2 merged). No park banner, no either/or AC — no user ruling needed.

**ACs derived:** 7 ACs above. Three load-bearing emphases from the story text and critical df4 patterns:
(1) FIRST deliverable is the CITED dossier mapping in `plugins/defender/docs/rom-study/claims/15-enemies.json`, with the identity glossary anti-vacuous gate (per-row expectPopulated before citation byte-checks, the df4-4 pattern).
(2) Four enemy reducer modules (Bomber, TIE, Pod/Swarmer, Probe), each PURE, each with synthetic test coverage.
(3) The pod→swarmers spawn mechanic (MSWM materialization off a parent) is in scope, but if it proves heavy during dev, file a follow-up rather than bloat — roadmap directive.

**Sibling probes clean:** no remote branch for df4-5 at setup except our new branch `feat/df4-5-bombers-mines-pods-swarmers-probes` (pushed). No conflicting concurrent session.

**Critical df4 Pattern Applied:** The RED phase MUST use the enemy-identity glossary gate (per-row expectPopulated assertion on each dossier entry in claims/15-enemies.json BEFORE citation byte-check). Coverage/byte sweeps pass vacuously without it — the recurring df4 teeth pattern from df4-3 and df4-4.

**Handoff:** → TEA (test design) for RED. Four new enemy reducers are PURE, in `plugins/defender/src/core/`; tested against synthetic process snapshots (no scheduler integration this story, no live wiring yet).
---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/defender/src/core/ties.ts` — the BOMBER (TIE) reducer: spawn/kill, the 1/8 LSEED bomb-drop gate, the BMBCNT≤10 cap, per-bomb lifetime (SEED&$1F)+1, guarded cruise-altitude tracking. Constants TIE_NAP/BOMB_MAX/BOMB_DROP_MASK/BOMB_LIFETIME_MASK, each claim-pinned.
- `plugins/defender/src/core/probes.ts` — the POD (PROBE) reducer: spawn/kill, killPod bursts 1..POD_SWARMER_MAX swarmers through the injected release sink at the pod position, idempotent (no double burst). POD_SWARMER_MAX claim-pinned.
- `plugins/defender/src/core/swarmers.ts` — the SWARMER (MSWM) reducer: spawn/kill, SEEK-X pursuit, SHOOT-on-timer aimed at the player + re-arm, NaN-player guard (position + fire halves). SWARMER_NAP/SWARMER_MAX claim-pinned.
- `plugins/defender/docs/rom-study/glossary.md` — three Enemies rows (TIE→Bomber, PRBST→Pod, MSWM→Swarmer), each stating the arcade name in prose and citing DEFB6.SRC + the MESS0 marketing string.
- `plugins/defender/docs/rom-study/claims/15-enemies.json` — 15 new claims (EN-27..EN-41): the two identity proofs (:1115 BSR BOMBST, :122 JSR MMSW), the fixed constants (:1116,:1113,:1137,:1146,:119,:148,:249), the three process-label banners (:1023,:85,:141), and the three MESS0 arcade names (:341,:399,:418) — every one re-opens byte-for-byte against the 1981 source.

**Tests:** 592/592 defender passing (GREEN) — the 29 df4-5 tests plus 563 prior, zero regressions. `npm run lint` (tsc --noEmit, repo-wide) clean. The `describe.skipIf(vendored)` byte-verify gate RAN (vendored source present) and passed. purity.test.ts auto-swept the three new core modules — no clock/entropy/browser/shell surface.

**Branch:** feat/df4-5-bombers-mines-pods-swarmers-probes (to be pushed)

**Scope note:** synthetic-only per AC7 — no live scheduler/sim wiring this story (so no main.ts front-end thread to verify; that is df5). Deferred magnitudes/behaviors (bomb expiry, flight paths, pod drift, SWCNT enforcement) are disclosed placeholders — see Design Deviations + Delivery Findings.

**Handoff:** To verify/review phase.
---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (592/592 green, tsc clean, purity green on all 3 core files, 0 code smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge/boundary assessed directly (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — silent-failure assessed directly (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed directly + via rule-checker #15/#18/#26 (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | findings | 7 | confirmed 3 (1 real error SWYV, 1 doc/#17, banner-cites as 1 grouped LOW), dismissed 0, downgraded 4 banner-cites to accepted-precedent |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type design assessed directly (see [TYPE]) |
| 7 | reviewer-security | Yes | findings | 3 | confirmed 2 (LOW, non-blocking rand-degenerate), 1 informational; corroborates rule-checker #21 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity assessed directly (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (1 HIGH/blocking #15 identity-gate mutation-defeat — independently reproduced; 2 LOW #21 rand — corroborate security) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled per workflow.reviewer_subagents settings)
**Total findings:** 4 confirmed material (1 HIGH, 3 LOW/doc), 2 LOW non-blocking (rand), 5 banner-cite nits accepted-as-precedent, 0 dismissed without rationale

## Rule Compliance (lang-review/typescript.md — exhaustive)

Enumerated every type/function/const/test in the diff against all 30 checks + purity/identity/byte-gate/placeholder rules. Full pass except:

- **#15 (source-text guard matches a TOKEN not the CLAIM) — VIOLATION [RULE]:** `tests/df4-5-enemy-identity.test.ts:99-104` — `rows.some(r => id.arcade.test(r))` matches the arcade name ANYWHERE in the verbose row. **I reproduced the mutation myself:** flipping the TIE row's bold label `the **Bomber**` → `the **Pod**` (a WRONG identity) left the identity suite **8/8 GREEN**. The story's headline anti-guess tooth (AC1/AC2) does not catch a wrong identity in prose — the exact "ships GREEN" trap the epic names. BLOCKING.
- **#17 (comment asserting a mechanism nobody re-ran) — VIOLATION [DOC]:** `src/core/swarmers.ts:27` — "at most 20 swarmers alive at once" describes an enforcement `spawnSwarmer` never performs (SWARMER_MAX is exported/cited but unused; contrast BOMB_MAX which IS enforced in ties.ts:116). LOW.
- **#21 (degenerate non-nullish input to numeric code) — 2 VIOLATIONS [SEC][RULE]:** `probes.ts:110` `(rand()%6)+1` → 0 on NaN/negative rand (breaks "always ≥1 swarmer"); `ties.ts:116/118` `rand()&mask` → NaN coerces to 0 (gate always open). Both require a contract-violating rand (documented as a 0..255 byte); not production-reachable; match the shipped/approved `mutants.ts`+`landers.ts` precedent. LOW, non-blocking.
- **Fabricated ROM symbol [DOC]:** `src/core/swarmers.ts:17` — `SWYV` does not exist in DEFB6.SRC (`grep` → 0 hits). The real Y-accel mask is `SWAC` (:162 `ANDB SWAC`). A wrong ROM symbol in a source comment ships green (prose citations aren't byte-gated). LOW but a genuine factual error.
- **Byte-gate (claims):** all 15 new claims EN-27..EN-41 re-open byte-for-byte (independently spot-checked + the skipIf gate ran green). COMPLIANT.
- **Purity / identity-content / disclosed-placeholders / #24 pods.ts retirement / #1-#14,#16,#18-#20,#22-#23,#25-#30:** COMPLIANT (see rule-checker inventory).

## Observations

- **[HIGH][RULE][TEST] Identity arcade-name gate is mutation-defeated** at `tests/df4-5-enemy-identity.test.ts:99-104` — reproduced: wrong bold identity ships 8/8 green. The one thing this story exists to guarantee is unguarded on its prose tooth.
- **[DOC] Fabricated ROM symbol `SWYV`** at `src/core/swarmers.ts:17` — evidence: `grep -n SWYV DEFB6.SRC` returns nothing; the real symbol is `SWAC` (DEFB6.SRC:162).
- **[DOC] False cap comment** at `src/core/swarmers.ts:27` — "at most 20 alive" is not enforced anywhere in `createSwarmerBank`.
- **[SEC] Degenerate `rand()` unguarded** at `probes.ts:110` / `ties.ts:116,118` — LOW, non-reachable under the 0..255 contract, matches accepted `mutants.ts:116` precedent.
- **[VERIFIED] Identity CONTENT is correct** — evidence: glossary rows 50/52 bold **Bomber**/**Swarmer**, row 51 **Pod**; all 15 claims byte-verify; TIE=Bomber (BSR BOMBST :1115), PROBE=Pod (JSR MMSW :122), MSWM=Swarmer (:141). Complies with the identity-glossary rule — the CONTENT is sourced; only the GATE that protects it is loose.
- **[VERIFIED][SIMPLE] Reducers are minimal and pattern-faithful** — evidence: `swarmers.ts`/`probes.ts`/`ties.ts` mirror the approved `mutants.ts` bank shape (record array + finite-guard spawn + kill-remove + scheduler process); no dead code, no over-engineering, `rand` unused in swarmers is a disclosed df5 placeholder.
- **[VERIFIED][EDGE] Spawn + per-tick boundaries hold** — evidence: all three `spawn()` reject non-finite coords (`!Number.isFinite`), and `ties.ts:112`/`swarmers.ts:96,101` guard the injected `player()` before `approach()`/`fire()`; the pod-burst is idempotent (`!rec.alive` guard). Tested by the #21 suites.
- **[VERIFIED][SILENT] No swallowed errors / silent fallbacks** — evidence: no try/catch, no empty catch, no `||` default masking 0; kill/idempotency paths return explicitly, not silently.
- **[TYPE] Types are sound** — evidence: all entity fields `readonly`, banks return `.slice()` copies, function-typed signatures (no `Function`/`Record<string,any>`), the RED-loader `as Partial<T>` casts are guarded by a runtime `typeof === 'function'` check. No stringly-typed API.

## Devil's Advocate

Argue this is broken. The most damning fact is that the story's ENTIRE reason to exist — "a wrong enemy identity stated in prose ships GREEN, so we gate it" — is not actually guarded. I did not take the rule-checker's word for it; I flipped the TIE row's bold label to the wrong enemy ("the **Pod**") and the identity suite stayed 8/8 green. So a future editor renaming an enemy, a df6 story adding a new one by copy-paste, or a bad merge that swaps two rows, all pass the gate the epic built specifically to stop them. "But the content is correct today" is precisely the false comfort the gate exists to remove; correctness-by-eyeball is what this pipeline is supposed to retire, and a reviewer who waves this through because it happens to be right today is the failure mode, not the safeguard. That alone is a reject.

What else could bite? A malicious or buggy `rand()` provider: `NaN` opens the bomb gate every tick and makes a killed pod release zero swarmers — a pod that bursts into nothing is, by the story's own words, "not the arcade Pod." It is not reachable in production (the seam is contracted to a 0..255 byte and every shipped caller honors it), and the identical pattern is already live in approved `mutants.ts`, so it is LOW — but the file makes an UNCONDITIONAL promise ("ALWAYS bursts into at least one") its code does not keep, and one honest guard at the injection boundary would make the promise true. A confused reader is endangered too: `swarmers.ts` cites `SWYV`, a symbol that is not in the ROM, and comments that a cap is enforced when it is not — a maintainer who trusts either will be wrong, and in an epic whose currency is citation fidelity that is not cosmetic. Stressed inputs (huge tick counts, zero-canvas) are not in this pure-sim slice, and the scheduler already floors bad nap durations. The banner-vs-label citation drift is real but consistent with precedent, so I will not reject on it. The verdict rests on the identity gate: the safeguard is asleep, and I proved it.

## Round-0 Review Record (REJECTED — superseded by the re-review; kept for history)

**Verdict (Round 0, superseded):** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Identity arcade-name gate is mutation-defeated — `rows.some(r => id.arcade.test(r))` matches the name anywhere in the row, so a WRONG bold identity ships green (reproduced: Bomber→Pod left 8/8 green) | `tests/df4-5-enemy-identity.test.ts:99-104` | Anchor the arcade-name assertion to the row's BOLD primary declaration (e.g. require `the \*\*${arcade}\*\*` on the symbol-matched row), and mutation-prove all three rows go RED when the bold label is flipped to the wrong enemy |
| [LOW] | Fabricated ROM symbol `SWYV` in a source comment (not in DEFB6.SRC; real symbol is `SWAC` :162) | `src/core/swarmers.ts:17` | Replace `SWYV` with `SWAC` (DEFB6.SRC:162) or drop the symbol from the comment |
| [LOW] | Comment "at most 20 swarmers alive at once" asserts a cap the code never enforces (#17) | `src/core/swarmers.ts:27` | Enforce `SWARMER_MAX` in `spawnSwarmer` (BOMB_MAX precedent) OR reword to "the ROM's SWCNT cap; df5's live spawn enforces it" |

**Non-blocking (fold in while reworking, not required to pass):**
- [LOW][SEC] Degenerate injected `rand()` unguarded — `probes.ts:110`, `ties.ts:116,118`. Non-reachable under the 0..255 contract; matches approved `mutants.ts` precedent. Optional boundary guard or explicit contract assertion.
- [LOW][DOC] Banner-vs-label citation drift — TIEKIL :1118→1120, MSWMF :245→246, TCTAB :1206→1207, seek range :196-200 (compare/negate at 201-203), `LEAY ,X` attributed to MMSW (actually PRBKIL :121). Consistent with landers/mutants precedent; nudge to the instruction line for fidelity.

**Data flow traced:** injected `rand()`/`player()` → reducer step → entity records (bombs/pods/swarmers) → read-only `.slice()` bank views. Boundaries guarded at spawn and per-tick for coords/pose; the `rand()` numeric seam is the one unguarded path (LOW, contract-bounded).

**Why REJECTED:** the shipped simulation and the identity CONTENT are correct and green, but the story's headline safeguard — the anti-guess identity gate (AC1/AC2) — is proven vacuous on its arcade-name tooth. That is a High, and it is the exact defect this epic's pattern exists to prevent, so it blocks. The two LOW doc fixes (SWYV, false cap comment) should ride the same rework.

**Handoff:** Back to Dev (green rework — the workflow's configured reviewer-rework target). The identity CONTENT is already correct and green, so the blocking fix is a test-assertion tightening that keeps green: anchor `id.arcade` to the row's bold `**Name**` declaration and mutation-prove all three rows go RED on a flipped bold label. Dev also closes the two LOW doc fixes (SWYV→SWAC, the false SWARMER_MAX cap comment) in the same pass, then re-hands to Reviewer.
---

## Dev Assessment (Rework r1)

**Implementation Complete:** Yes (rework round 1 — addressed the Reviewer REJECT)

**Findings addressed:**
- **[HIGH — FIXED]** Identity arcade-name gate vacuity — `df4-5-enemy-identity.test.ts` now anchors the arcade-name check to the row's BOLD `**Name**` declaration (`rows.every` over `/the \*\*([^*]+)\*\*/`), not a whole-row substring. **Mutation-proven:** flipping each of the 3 rows' bold label to a wrong enemy (Bomber→Pod, Pod→Swarmer, Swarmer→Bomber) now yields exactly 1 RED per row (was 8/8 green before).
- **[LOW — FIXED]** Fabricated ROM symbol `SWYV` in `swarmers.ts:17` → replaced with the real `SWAC` (DEFB6.SRC:162, the Y-accel mask); dropped the possibly-wrong `:208-231` range.
- **[LOW — FIXED]** False cap comment `swarmers.ts:27` "at most 20 swarmers alive at once" → reworded to disclose it is the ROM's ceiling, exposed cited but NOT enforced in `spawnSwarmer` this synthetic story (df5's live spawn enforces the SWCNT refusal).

**Non-blocking (deferred, not fixed — filed as follow-ups):** the degenerate-`rand()` guard (contract-bounded, precedent-matched) and the banner-vs-label citation nudges (accepted precedent). See Delivery Findings.

**Files Changed (this rework):**
- `plugins/defender/tests/df4-5-enemy-identity.test.ts` — bold-anchored arcade-name assertion (the blocking fix)
- `plugins/defender/src/core/swarmers.ts` — SWYV→SWAC comment fix + SWARMER_MAX cap comment reworded

**Tests:** 592/592 defender passing (GREEN); `npm run lint` (tsc --noEmit) clean. The tightened identity gate is mutation-proven (3/3 rows redden on a flipped bold label).

**Branch:** feat/df4-5-bombers-mines-pods-swarmers-probes (to be pushed)

**Handoff:** To review — Reviewer (Obi-Wan) re-checks the hardened gate and the two doc fixes.
---

## Subagent Results (Re-review r1)

Scoped to the rework diff `git diff 13c80aa9..HEAD` (2 files, 21 insertions — the identity-test anchor fix + two swarmers.ts comment fixes).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (592/592 green, purity 222 green, tsc clean, 0 smells; diff comments+assertion only) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — assessed directly [EDGE] |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed directly [SILENT] |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — the changed test was rule-checked (#15/#18/#25) [TEST] |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — both swarmers.ts comment fixes verified accurate against source (SWAC=PHR6.SRC:402 SWARM ACCEL MASK / DEFB6.SRC:162; SWARMER_MAX confirmed unenforced) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed directly [TYPE] |
| 7 | reviewer-security | Yes | clean | none | N/A — comment-stripped byte diff of swarmers.ts = 0 code delta; test change is pure assertion tightening; probes.ts/ties.ts untouched (prior non-blocking findings unregressed) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed directly [SIMPLE] |
| 9 | reviewer-rule-checker | Yes | findings | 1 non-blocking | confirmed the blocking fix (3/3 bold-label mutations → RED, independently re-run); 1 non-blocking latent-residual (first-bold-span `.exec`) recorded as a Delivery Finding |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled per settings)
**Total findings:** 0 blocking, 1 non-blocking (latent regex generality — Delivery Finding); the prior REJECT's HIGH is FIXED and mutation-proven

## Reviewer Assessment

**Verdict:** APPROVED (re-review of round-1 rework; supersedes the Round-0 REJECT above)

**Specialist coverage (all 8 categories represented):** [EDGE] no new boundary path — the rework adds no code branch (assessed directly; edge-hunter disabled). [SILENT] no swallowed errors — no try/catch or fallback added (assessed directly; disabled). [TEST] the changed assertion is the story's identity guard, mutation-proven 3/3 (rule-checker #15/#18/#25; test-analyzer disabled). [DOC] both swarmers.ts comment fixes verified accurate against source (SWAC=SWARM ACCEL MASK PHR6.SRC:402; SWARMER_MAX unenforced disclosure confirmed) — comment-analyzer clean. [TYPE] no type change — comment + assertion only (assessed directly; type-design disabled). [SEC] no new robustness surface — swarmers.ts byte-identical modulo comments, probes.ts/ties.ts untouched — security clean. [SIMPLE] strictly smaller/tighter — no complexity added (assessed directly; simplifier disabled). [RULE] the identity-gate #15 fix is confirmed by independent mutation re-run — rule-checker.

### Rule Compliance (Re-review)

Scoped to the rework diff (2 files). **#15 (source-text guard vacuity) — FIXED & VERIFIED:** the arcade-name assertion now anchors to the row's bold `**Name**` declaration and is mutation-proven (3/3 bold-label flips → RED, independently re-run by rule-checker); `expectPopulated`/`rowCites` unchanged. **#18 (`bold[1]` guarded):** `bold !== null` short-circuits before `id.arcade.test(bold[1])`; the single capture group necessarily participated — COMPLIANT. **#25 (search scope):** the regex runs against one `rowWindows` row, not the file — COMPLIANT. **#17 (comment mechanism):** the SWARMER_MAX cap comment reworded to stop asserting enforcement `spawnSwarmer` never performs — RESOLVED. **Fabricated citation:** `SWYV`→`SWAC` (real, DEFB6.SRC:162 / PHR6.SRC:402) — RESOLVED. **#21/#22 (numeric robustness):** no numeric code changed (byte-identical modulo comments) — the prior non-blocking rand findings stand untouched as follow-ups. All else COMPLIANT (carried from Round 0).

The round-1 rework closes the REJECT completely, and I did not take it on faith:

- **[HIGH → RESOLVED][RULE][TEST]** The identity arcade-name gate now anchors to the row's bold `**Name**` declaration (`rows.every` over `/the \*\*([^*]+)\*\*/`). Mutation re-run (rule-checker, independent of Dev's): flipping each of the 3 rows' bold label to a wrong enemy (Bomber→Pod, Pod→Swarmer, Swarmer→Bomber) reddens exactly 1 test per row — the vacuity I proved in round 0 is gone. `expectPopulated` and `rowCites` are byte-identical (not weakened), and correct content is 8/8 green. Satisfies lang-review #15 (mutation-tested), #18 (`bold[1]` guarded by `bold !== null`), #25 (scope is the single `rowWindows` row, not the file).
- **[LOW → RESOLVED][DOC]** `swarmers.ts:17` fabricated `SWYV` → real `SWAC` (verified: PHR6.SRC:402 `SWAC RMB 1 SWARM ACCEL MASK`, DEFB6.SRC:162 `ANDB SWAC`). Accurate.
- **[LOW → RESOLVED][DOC]** `swarmers.ts:27` cap comment reworded to disclose SWARMER_MAX is exposed/cited but not enforced by `spawnSwarmer` — confirmed the reducer has no cap check. No #17 violation remains.
- **[SEC]** No new robustness surface: swarmers.ts is byte-identical modulo comments; the test change touches only a static fixture assertion. The prior non-blocking degenerate-`rand` findings (probes.ts/ties.ts) are untouched and remain filed as follow-ups.
- **[SIMPLE][TYPE][EDGE][SILENT]** Rework introduces no complexity, no type change, no new code path, no error handling — it is a strictly smaller, tighter test plus two honest comments.

**Non-blocking (filed, not required):** the `.exec` first-bold-span generality gap (Delivery Finding, re-review) and the round-0 follow-ups (degenerate-`rand` guard, banner-cite nudges). None blocks.

**Data flow traced:** the tightened assertion reads `glossary.md` rows (static fixture) → extracts the bold `**Name**` → matches the source-true arcade regex. No runtime game-state path touched.

**Deviation audit:** all Dev/TEA deviations + the r1 test-tightening stamped ACCEPTED (see Design Deviations → Reviewer (audit)).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. DO NOT merge — SM owns PR creation/merge.