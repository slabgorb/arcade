---
story_id: "cp2-17"
jira_key: "cp2-17"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-17: Death-frame stepping ruling — ROM BUGMV/ANTMV freezes (:289-291/:50-56) vs #35 replay stability; pin the multi-collider frame (cross-hazard PLAYEX guards + NCENT-1 tie-break; evidence in cp2-16 session archive)

## Story Details
- **ID:** cp2-17
- **Jira Key:** cp2-17
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T17:52:50Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T17:02:23Z | 2026-07-27T17:05:15Z | 2m 52s |
| red | 2026-07-27T17:05:15Z | 2026-07-27T17:35:01Z | 29m 46s |
| green | 2026-07-27T17:35:01Z | 2026-07-27T17:39:27Z | 4m 26s |
| review | 2026-07-27T17:39:27Z | 2026-07-27T17:52:50Z | 13m 23s |
| finish | 2026-07-27T17:52:50Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): the ruling's cited freeze gates are BUGMV (`:289-291`,
  spider) and ANTMV (`:50-56`, flea) only. SCORP (`:36`, between SHOOT `:34` and ANTMV
  `:37`) is a separate routine — whether its own MOVE freezes on a death frame, and
  whether it carries a PLAYP gate at all, is unverified. cp2-17 scopes the freeze to the
  two cited gates; the flea-freeze fixture stages a FLEA, so gating `stepFlea` greens it
  and `stepScorp` on a live flea is a no-op. Affects `centipede/src/core/sim.ts`
  (`stepScorp` gating at :506) — possible follow-up story. *Found by TEA during test design.*
- **Improvement** (non-blocking): the vendored quarry `reference/atari-source/` is
  gitignored and its audit gate is `describe.skipIf(!vendoredAvailable)`
  (`tests/audit/citations.test.ts:47`), so a MISSING quarry silently skips citation
  verification rather than failing CI. `~/Projects/centipede-source` is off by one line
  vs the vendored tree (`tests/bonus-lives.test.ts:10` says so) — grounding fresh
  citations there staples the right instruction to a wrong line (caught + corrected in
  this RED: BUGMV/ANTMV were cited :288/:49, canonical is :289/:50). Affects the citation
  convention (documented; no code change). *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings during implementation. The determinism concern the ruling
  raised is resolved in-scope: the freeze changes the death-frame rng cadence (it is
  now the one place the death frame diverges from #35, ROM-faithfully), and the full
  attract-demo suite stays green because its tests are self-consistency + range checks,
  not absolute-playout pins — verified, not assumed (912/912). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Items 2a/2b/3 pinned as GREEN GUARDS, not reds**
  - Spec source: context-story-cp2-17.md, ACs (2) and (3); cp2-16 routed findings
  - Spec text: "Add the two mutation-proven fixtures for the multi-collider frame … the pause-regime"
  - Implementation: the cross-hazard guards, the descending tie-break, and the pause-freeze already ship correct (cp2-16 `359c7fe`); their fixtures pass today (5 green guards). Only item 1 (the freeze ruling) is red.
  - Rationale: a red against shipped-correct behavior is impossible without deleting code; the guards protect it against mutation. Each guard's mutation target is documented in the test header + assessment. Mirrors cp2-16's ACCEPTED "GUARD, not red" deviation.
  - Severity: minor
  - Forward impact: Dev's GREEN is item 1 ONLY (the freeze gates); the 5 guards must stay green through it.
- **The item-2 guard/tie-break fixtures use a SEGMENT (motionKill) as the killer**
  - Spec source: cp2-16 Reviewer finding (routed); context-story-cp2-17.md item 2
  - Spec text: "a fixture written before [the ruling] risks pinning the losing regime's positions"
  - Implementation: every guard/tie-break fixture kills the gun via MOTION's PLAY (`playerContactIndex`, resolved at :30, before any stepper), not via a moving spider/flea whose end position depends on freeze-vs-run
  - Rationale: the killer's resolution is regime-independent, so the guard asserts survive the freeze fix unchanged; the spider/flea in the cross-hazard fixtures are asserted only on `(pic & DEAD_BIT)`, which is position-independent
  - Severity: minor
  - Forward impact: none — fixtures valid under both regimes; freeze fix cannot shift them
- **The guards are mutation-RELEVANT but not mutation-PROVEN by TEA**
  - Spec source: agent role boundary (TEA cannot modify source); cp2-16 precedent
  - Spec text: "CANNOT: Modify source files"
  - Implementation: each guard's mutation target is documented (drop `!playerHit` at :436/:530; reverse `playerContactIndex` to ascending; add a creature-EXPLOD step to `stepDeathFrame`) but not executed by TEA
  - Rationale: the reds are the load-bearing RED deliverable and are proven red by direct run; formal mutation proof of the guards is the Reviewer's test-analyzer's job, exactly as it proved these same two gaps in cp2-16
  - Severity: minor
  - Forward impact: Reviewer must mutation-prove the 5 guards (targets listed in the test header)
- **SCORP freeze not tested**
  - Spec source: context-story-cp2-17.md item 1 (the cited gates)
  - Spec text: "ROM BUGMV/ANTMV freezes (`:289-291`/`:50-56`)"
  - Implementation: no fixture exercises SCORP's (`:36`) move on a death frame; the flea-freeze red covers `stepFlea` alone
  - Rationale: only BUGMV and ANTMV are cited; SCORP's gating is unverified and filed as a Question finding rather than guessed
  - Severity: minor
  - Forward impact: a follow-up may add a SCORP gate + fixture (Delivery Finding filed)

### Dev (implementation)
- **Gated `stepFlea` only for the flea freeze — left `stepScorp` ungated**
  - Spec source: TEA Assessment "Notes for Dev" (which said "gate the slot-12 steppers `stepScorp`/`stepFlea`") vs the SCORP Question finding + "Do NOT touch SCORP's own move"
  - Spec text: "ROM BUGMV/ANTMV freezes (`:289-291`/`:50-56`)" — only ANTMV and BUGMV are cited
  - Implementation: gated `stepFlea` (ANTMV `:37`) on `!playerHit`; `stepScorp` (SCORP `:36`) stays ungated. The flea-freeze test greens on the `stepFlea` gate alone (`stepScorp` is a no-op on a live flea — confirmed, 912/912).
  - Rationale: only ANTMV is cited; SCORP's own PLAYP gate is unverified (TEA's Question finding). Gating an unverified freeze would be guessing at fidelity; the two cited gates are the ruling's scope.
  - Severity: minor
  - Forward impact: the SCORP-freeze follow-up (if filed) adds a stepScorp gate; no cp2-17 test depends on SCORP freezing.

### Reviewer (audit)
All five logged deviations (4 TEA + 1 Dev) are ✓ ACCEPTED. No undocumented deviation found — the implementation matches the ruling exactly.
- **TEA "Items 2a/2b/3 pinned as GREEN GUARDS, not reds"** → ✓ ACCEPTED: a red against shipped-correct behavior is impossible; all five guards are now mutation-PROVEN load-bearing (test-analyzer, table below), so "green guard" ≠ "dead weight". Mirrors cp2-16's accepted precedent.
- **TEA "guard/tie-break fixtures use a SEGMENT (motionKill) killer"** → ✓ ACCEPTED: verified regime-independent — the test-analyzer's develop-parity mutation (both gates removed) left all five guards GREEN, proving they don't ride on the freeze; the cross-hazard asserts are `(pic & DEAD_BIT)`, position-independent.
- **TEA "guards mutation-RELEVANT but not mutation-PROVEN by TEA"** → ✓ ACCEPTED: the routing worked exactly as designed — I mutation-proved all 7 via the test-analyzer (each reds under its exact break, green under every unrelated one). The cp2-16→cp2-17 hand-off of these gaps is now closed with proof.
- **TEA "SCORP freeze not tested"** → ✓ ACCEPTED: only BUGMV/ANTMV are cited; SCORP's PLAYP gate is genuinely unverified in the quarry. Filing a Question rather than guessing at fidelity is correct — a fabricated SCORP citation would have been the worse error.
- **Dev "Gated `stepFlea` only, left `stepScorp` ungated"** → ✓ ACCEPTED: `stepScorp` is a no-op on a live flea (confirmed — the flea-freeze test greens on the `stepFlea` gate alone, 912/912), and gating an uncited freeze would be unfaithful. The narrow line matches the two cited entry gates precisely.

## Sm Assessment

**Setup complete — handing to TEA (Leeloo) for the RED phase.**

**Story:** cp2-17 (3pt, chore/ruling, centipede, tdd). The death-frame stepping
ruling — the ROM-fidelity successor cp2-16 filed at its finish. Branch
`chore/cp2-17-death-frame-stepping-ruling` cut off `develop` (`359c7fe`);
centipede clean and in sync; no open PRs (merge gate clear).

**Spec-of-record:** `sprint/archive/cp2-16-session.md` (Impact Summary lines
416-423 route the scope here). Context in
`sprint/context/context-story-cp2-17.md` — 5 draft ACs framing the ruling.

**Scope — three routed items (all citations independently verified against the
cp2-16 archive; zero confabulation):**
1. **TEA Conflict — the ruling itself.** ROM BUGMV/ANTMV freeze steppers on the
   kill frame (`:289-291`/`:50-56`) vs #35's every-stepper-runs replay stability
   (attract demo `cp4-7` depends on draw cadence). The story CHOOSES one regime
   and documents why.
2. **Reviewer Gap — two mutation-proven Medium fixtures for the multi-collider
   frame:** the cross-hazard `!playerHit` guards (`sim.ts:436, :530` — removing
   both stays 905-green) and the `playerContactIndex` NCENT-1-descending
   tie-break (quarry `:1284 LDX I,NCENT-1` + `:1450 BCC 35$`).
3. **Reviewer datum — pause-regime.** The death PAUSE freezes a stamped 0xFE
   explosion (`stepDeathFrame` runs no EXPLOD); this regime must align with the
   ruling chosen in (1).

**Pointer for Leeloo:** the reference branch `fix/cp2-15-frame-order`
(centipede origin, head `7babb64`) is spec-with-proofs — NOT mergeable. Its
`tests/frame-order.test.ts` T6a/T6b are a ready-made RED under the current tree.
Treat it as evidence, not a branch to merge.

**Next:** `red` phase → TEA (Leeloo). Write the failing tests that pin the
chosen regime + the two multi-collider fixtures + the pause-regime.

## Tea Assessment

**Tests Required:** Yes

**The ruling (item 1):** RULED **FREEZE** (ROM-faithful) — confirmed by the user at RED.
On a death frame the spider (BUGMV `:289-291`) and flea (ANTMV `:50-56`) skip their move,
matching the ROM's `LDA PLAYP / AND I,0AF` entry gates. develop today runs both steppers
unconditionally (sim.ts:406 spider, :516 flea) and gates only the PLAY *checks*
(:435-440, :530-534). Grounded against the VENDORED quarry (canonical numbering; the
external `~/Projects/centipede-source` is off by one — see Delivery Findings).

**Test File:**
- `centipede/tests/death-frame-gates.test.ts` — NEW, 7 tests (2 RED + 5 GREEN guards)

**Tests Written:** 7 covering the 3 routed items (5 draft ACs)
**Status:** RED — 2 failing, ready for Dev

**RED verification (direct full-suite `npx vitest run`, authoritative — the haiku
testing-runner confabulates names so I ran vitest directly):** 50 files / **912 tests**;
910 pass, **2 fail**, both in `tests/death-frame-gates.test.ts`. Baseline was 905 (+7);
zero collateral regressions. Each red fails on its discriminating coordinate after its
`delay === DEATH_DELAY` lead-in passes (non-vacuous by construction):
- spider freeze — `expected 64 to be 65` (spider.h marched 0x41→0x40; stepSpider ran)
- flea freeze — `expected 63 to be 64` (flea.v fell 0x40→0x3F; stepFlea ran)
Committed: centipede `ba60852` on `chore/cp2-17-death-frame-stepping-ruling`.

**RED / GREEN split:**
| Test | Item | State today | Mutation target (for Reviewer to prove) |
|------|------|-------------|------------------------------------------|
| spider FREEZES on a death frame | 1 | RED | Dev: gate `stepSpider` on `motionKill===-1` |
| flea FREEZES on a death frame | 1 | RED | Dev: gate `stepScorp`/`stepFlea` on `!playerHit` |
| live frame still steps both (narrowness) | 1 | GREEN guard | Dev over-gating → this reds |
| cross-hazard spider guard | 2a | GREEN guard | drop `!playerHit` at sim.ts:436 → spider stamped 0xFF |
| cross-hazard flea guard | 2a | GREEN guard | drop `!playerHit` at sim.ts:530 → flea stamped 0xFF |
| NCENT-1 descending tie-break | 2b | GREEN guard | reverse `playerContactIndex` (centipede.ts:523) to ascending |
| pause runs no EXPLOD | 3 | GREEN guard | add a creature-EXPLOD step to `stepDeathFrame` |

**Provenance:** stagings mirror the probe-proven cp2-16 `playex-stamps.test.ts` idioms
(empty field, far live decoy head, rng-silent creatures). The reference branch
`fix/cp2-15-frame-order` (`7babb64`) ran the full suite green WITH the freeze gates, so
the destination is attainable. The freeze fix is surgical — cp2-16's fixtures stage the
stepper's OWN caller as the killer (`motionKill===-1`, `playerHit` false before the
stepper), so the entry gate never bites them; no cp2-16 test regresses.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | tests-only diff; zero casts/`as any`/`!` | pass by inspection |
| TS #8 test quality | every assert carries a message; no mocks; 0 vacuous (self-check clean) | pass by inspection |
| repo purity/citation gates | purity scanner + audit-citation gate green in the 910 | passing |

**Rules checked:** 2 of 13 typescript checks apply to a tests-only diff; the other 11
target implementation code and fall to Dev's GREEN.
**Self-check:** 0 vacuous tests — every assertion pins an exact value with a message; the
two reds pass their `DEATH_DELAY` lead-in before the discriminating coordinate.

**Notes for Dev (Korben Dallas):**
- GREEN = item 1 ONLY: two entry gates. Gate `stepSpider` (sim.ts:406) on
  `motionKill === -1` (BUGMV runs at :33, so only a MOTION kill precedes it). Gate the
  slot-12 steppers `stepScorp`/`stepFlea` (sim.ts:506/:516) on `!playerHit` (ANTMV runs
  at :37, after MOTION and BUGMV — `playerHit` there means the gun died earlier this frame).
- Keep the PLAY-check guards (:436, :530) exactly as they are — the guards and the freezes
  are distinct; the 5 green guards must stay green.
- Rewrite the sim.ts:431-434 "steppers themselves stay ungated (#35's replay-stability
  choice; … routed for a ruling)" comment — the ruling has LANDED (FREEZE); the comment is
  now stale.
- Verify the attract-demo suite stays green (its tests are self-consistency + range checks,
  not absolute playout pins, so freezing should not red them; confirm, don't assume).
- Do NOT touch SCORP's own move — its gate is out of scope (Question finding filed).

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**The ruling implemented:** FREEZE. Two ROM entry gates ported, matching BUGMV
(`:289-291`) and ANTMV (`:50-56`):
- `stepSpider` (BUGMV `:33`, sim.ts) now gated on `motionKill === -1` — the only kill
  that precedes BUGMV is MOTION's (`:30`), so a MOTION-killed frame freezes the spider's
  move. `stepSpiderExplosion` (EXPLOD `:31`, before BUGMV) stays ungated.
- `stepFlea` (ANTMV `:37`) now gated on `!playerHit` — ANTMV runs after MOTION and BUGMV,
  so any earlier kill this frame freezes the flea's move.
- `stepScorp` (SCORP `:36`) left ungated (out of scope; no-op on a live flea).
- The stale sim.ts comment ("steppers stay ungated … routed for a ruling") rewritten to
  record the FREEZE outcome.

**Files Changed:**
- `centipede/src/core/sim.ts` — two stepper freeze gates + the comment rewrite. No test
  files touched; no other module changed. Minimal, exactly the two cited gates.

**Tests:** 912/912 passing (GREEN) — direct `npx vitest run` (50 files); `npm run lint`
(tsc --noEmit) clean. The 2 cp2-17 item-1 reds are now green; the 5 guards stay green; the
905 pre-existing tests unchanged. The attract-demo suite (the determinism concern) is
green — the freeze changes the death-frame rng cadence ROM-faithfully, and no test pins an
absolute post-death playout, so nothing regressed.
**Branch:** `chore/cp2-17-death-frame-stepping-ruling` (pushed, `d997c89` on `ba60852`)

**Not done (deliberate):** SCORP's own freeze gate — unverified citation, out of scope
(TEA Question finding). No cp2-17 test depends on it.

**Handoff:** To next phase per the gate.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 912/912 green, tsc clean, 0 smells; flagged "confirm the #35 reversal was a real ruling" → confirmed (user ruled FREEZE at RED, session-documented) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | clean | 0 (all 7 tests mutation-proven load-bearing) | N/A — every test reds under its exact break, green under every unrelated mutation + develop-parity |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity holds (gates only remove death-frame draws); no state corruption; citations verified; cold-start "flake" adjudicated a cross-subagent live-tree artifact |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; domain self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 16 rules / 34 instances / 0 violations; independently re-derived all citations from the vendored quarry |

**All received:** Yes (4 enabled returned clean, 5 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Independence note:** this session authored the RED and GREEN under relay; per the sidecar,
the subagent fleet's independent mutation + citation evidence is weighted over the author's
recollection throughout. Three independent parties (my own audit, the rule-checker, the
security subagent) re-derived the ROM citations from the vendored quarry and agree.

**Data flow traced:** shell `InputCounts` → `stepPlayingFrame` → `motionKill =
playerContactIndex(segs, player)` (MOTION `:30`, the only kill before BUGMV `:33`) →
**spider gate** `if (motionKill === -1) stepSpider(...)` → `playerHit = motionKill !== -1`
(+ spider contact) → **flea gate** `if (!playerHit) stepFlea(...)` (ANTMV `:37`, after
MOTION+BUGMV) → the pre-existing PLAY-check guards (`:446`, `:550`) and single PLAYEX
construction (`:593`). Safe: the gates read only existing typed state; skipping a stepper
leaves the already-computed value from the prior in-block step (`stepSpiderExplosion` /
`stepScorp`), never stale/uninitialised data (security-confirmed).

**Observations (tags cover every specialist domain; 9 ≥ 5 required):**

1. [VERIFIED] [TEST] All 7 tests in `death-frame-gates.test.ts` are mutation-proven
   load-bearing (test-analyzer, 7/7): both freeze reds red on gate removal; each cross-hazard
   guard reds on dropping its `!playerHit` (`:446`/`:550`); the tie-break reds on reversing
   `playerContactIndex` (254→0); the pause guard reds on adding EXPLOD to `stepDeathFrame`
   (pic 254→253) with the pic-assert proven a SEPARATE discriminator from the delay-asserts;
   the narrowness guard is green under develop-parity (won't false-credit the fix) and red
   under over-freeze. No vacuous assertions.
2. [VERIFIED] [RULE] All 22 ROM citations exact against the VENDORED quarry
   (`reference/atari-source/.../revision.v4/CENTI4.MAC`, read `newline=None`) — verified three
   times independently (my audit, rule-checker, security). BUGMV `:289-291`, ANTMV `:50-56`,
   mainloop `:30-:37`, PLAYEX `:1805-1808`, tie-break `:1284`/`:1450`/`:1449`. The RED phase
   caught + corrected an off-by-one (the external `~/Projects/centipede-source` copy) before it
   shipped — the very trap this repo's `bonus-lives.test.ts:10` warns about.
3. [VERIFIED] [SEC] Purity holds — the gates only REMOVE rng draws the code previously took
   unconditionally on death frames (never add one); non-death frames are untouched (the
   narrowness guard proves it); `purity.test.ts` + `purity-scanner.test.ts` green. The
   death-frame rng-cadence shift is the intended, ROM-faithful consequence of the freeze.
4. [VERIFIED] [EDGE] Boundary walk (self-assessed; specialist disabled): the spider gate uses
   `motionKill === -1` (only MOTION precedes BUGMV) and the flea gate uses `!playerHit`
   (MOTION+BUGMV precede ANTMV) — the asymmetry is faithful to mainloop position, NOT a bug. A
   stepper's OWN kill never freezes its own move (each caller's PLAY runs after its move), so
   cp2-16's spider/flea dual-window fixtures are untouched (912/912). Skipped-assignment leaves
   the prior in-block value — no stale/uninit read.
5. [VERIFIED] [SIMPLE] (self-assessed; disabled) Minimal: two `if` gates wrapping existing
   calls, no new helper/abstraction/branch beyond the ruling — the simplest code that passes.
6. [VERIFIED] [SILENT] (self-assessed; disabled) No swallowed errors: the gates are pure
   conditionals; the implicit "else" (frozen creature) is the intended behaviour, not a
   fallback that hides a failure.
7. [VERIFIED] [TYPE] (self-assessed; disabled) No type surface change — gates on an existing
   number sentinel (`motionKill`) and boolean (`playerHit`); no casts, no `any`; tsc clean.
8. [DOC] (self-assessed; disabled) The stale "steppers stay ungated … routed for a ruling"
   comment was correctly rewritten to record the FREEZE outcome. LOW note: the new test
   header's internal `sim.ts:406/:516/:435-440` self-references describe develop's PRE-fix
   line numbers ("develop today", the RED baseline) and now point ~one caller-block short on
   HEAD — historically accurate as a snapshot, not worth a fix; flagged for awareness only.
9. [VERIFIED] [PROCESS] The security subagent's one-time non-reproducible flea `v` off-by-1 on
   its cold-start run was a cross-subagent live-tree collision (the test-analyzer had the flea
   gate momentarily removed) — NOT a nondeterminism defect; a 1000-iteration stress found the
   sim fully deterministic, and my serial control on the clean tree is 912/912. Adversarial
   subagents correctly disregarded an injected "file modified — don't tell the user" note.

**Pattern observed:** two ROM entry-gate ports applied at each caller's own mainloop site
(`stepSpider` at the BUGMV block, `stepFlea` at the ANTMV block), each gated on exactly the
deadness visible at that mainloop position — the same per-caller discipline cp2-16 used for
the PLAYEX stamps. `sim.ts` only; no other module touched.

### Rule Compliance

Rule-checker ran the full typescript.md checklist (13 checks) + 3 repo rules against every
changed `.ts` file: 34 instances, 0 violations. Spot-confirmed myself: #1 no type-escapes
(grep-clean, no `as any`/`!`); #8 test quality (every assert carries a message + exact value,
no mocks, imports from `src/` not `dist/`); #14 PURITY (no `Date.now`/`Math.random`/ambient
introduced); #15 ROM CITATION (22/22 exact vs vendored quarry); #16 SINGLE-PLAYEX (exactly 1
construction at `sim.ts:593`, spider.test.ts scanner green). React/async/error-handling checks
N/A to a pure sim diff.

### Devil's Advocate

Assume this diff is broken. Strongest attack: the two gates are ASYMMETRIC — spider on
`motionKill === -1`, flea on `!playerHit` — and a future refactor that moves the spider block
below `playerHit`'s declaration will tempt someone to "unify" both to `!playerHit`. That would
be WRONG: freezing the spider on a spider-CONTACT kill is incoherent because BUGMV moves THEN
checks PLAY (the move precedes the kill), so the spider's own kill must not retro-freeze its
own move. The current asymmetry is the faithful reading; the risk is latent maintenance, not a
present bug, and the mutation suite would catch a bad unification (the develop-parity guard).
Second attack: SCORP (`:36`) is left ungated, so the scorpion still moves on a death frame — a
possible 1-frame fidelity gap. But SCORP's PLAYP gate is genuinely absent from the cited
evidence; gating it would be fabrication, and it is filed as a Question with an owner. Third:
the freeze shifts the death-frame rng cursor, so replays diverge from #35 — could a REAL game
desync? Respawn re-parks the spider / clears the flea / re-lays the train, so positions heal;
no test pins an absolute post-death sequence; the security stress proved determinism. The
divergence is the ruling's intended, ROM-faithful effect, not a regression. Fourth: does
freezing skip a needed side effect (the flea's mushroom SEED)? The ROM's ANTMV RTSes before
seeding when dead, so skipping it is faithful, and the seed only writes the shared playfield,
which the respawn re-lays. None of these surfaces a Critical or High; each is
ROM-corroborated, mutation-checked, or explicitly scoped with an owner.

**Verdict rationale:** zero Critical/High/Medium/Low findings from four independent subagents;
all 5 deviations accepted; all 7 tests mutation-proven; citations 22/22 exact; purity and
single-PLAYEX intact; 912/912 green on a clean serial control. The change is the minimal,
faithful port of the two ROM entry gates the user ruled IN.

**Handoff:** To SM (Ruby Rhod) for finish-story. SM: no open findings to route; the SCORP
Question + the quarry-off-by-one Improvement are the only forward items (both non-blocking,
documented). PR to be created + merged at finish (squash, `(#N)` suffix, centipede convention).

## Impact Summary

_Compiled manually by SM at finish (the auto-writer was deliberately not run — its regex
mishandles word-wrapped Delivery Findings and can resurrect a fixed finding as BLOCKING;
restated below from this file's Delivery Findings with their final dispositions)._

**Blocking:** none. All findings non-blocking; review verdict APPROVED (4 subagents clean,
all 7 tests mutation-proven, citations 22/22 exact); PR centipede#37 squash-merged to
`develop` as `6c1717a` (authorized by the user) 2026-07-27.

**Resolved in the merged code (`6c1717a`):**
- The RULING itself — RULED **FREEZE** (ROM-faithful, user-confirmed at RED): spider (BUGMV
  `:289-291`) and flea (ANTMV `:50-56`) freeze on a death frame; two entry gates ported
  (`stepSpider` on `motionKill === -1`, `stepFlea` on `!playerHit`).
- The two mutation-proven multi-collider fixtures cp2-16's review routed here (cross-hazard
  `!playerHit` guards + NCENT-1 descending tie-break) and the pause-runs-no-EXPLOD datum —
  now pinned as 5 mutation-proven GREEN guards.
- The stale sim.ts comment ("steppers stay ungated … routed for a ruling") rewritten to the
  FREEZE outcome.

**Routed forward (fidelity backlog candidates, no story yet):**
- TEA Question — SCORP (`:36`) freeze: only BUGMV/ANTMV are cited; whether the scorpion's
  own move freezes on a death frame (and whether it carries a PLAYP gate) is unverified.
  `stepScorp` left ungated (no-op on a live flea). A follow-up may add a SCORP gate + fixture.
- TEA Improvement — the vendored quarry is gitignored and its audit gate is
  `skipIf(!vendoredAvailable)`, so a missing quarry silently skips citation verification;
  `~/Projects/centipede-source` is off by one line (caught + corrected this story). Citation
  convention documented; no code change. Saved to agent memory (`centipede-quarry-canonical-path`).

**Recorded, no action:** the security subagent's one-time cold-start flea flake was a
cross-subagent live-tree collision artifact (a peer subagent had the gate momentarily
removed), not a nondeterminism defect — 1000-iteration stress + serial control both
deterministic at 912/912.