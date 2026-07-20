---
story_id: "cp3-2"
jira_key: "cp3-2"
epic: "cp3"
workflow: "tdd"
---
# Story cp3-2: The flea (ANT, slot 12) — ANTPC/ANTMV drop, mushroom seeding, multi-hit kill

## Story Details
- **ID:** cp3-2
- **Jira Key:** cp3-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T11:02:18Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T09:59:59Z | 2026-07-20T10:02:48Z | 2m 49s |
| red | 2026-07-20T10:02:48Z | 2026-07-20T10:26:08Z | 23m 20s |
| green | 2026-07-20T10:26:08Z | 2026-07-20T10:41:09Z | 15m 1s |
| review | 2026-07-20T10:41:09Z | 2026-07-20T10:49:38Z | 8m 29s |
| red | 2026-07-20T10:49:38Z | 2026-07-20T10:57:24Z | 7m 46s |
| green | 2026-07-20T10:57:24Z | 2026-07-20T10:58:23Z | 59s |
| review | 2026-07-20T10:58:23Z | 2026-07-20T11:02:18Z | 3m 55s |
| finish | 2026-07-20T11:02:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (setup)

**CARRY-FORWARD FROM cp3-1 (spider):**

- **Gap** (non-blocking, **SCOPED TO cp3-2**): `OVRLAP` scans `LDY I,12.` — slots 12 **and** below, i.e. it includes the FLEA slot (`ANTP =MOBJP+12.`). cp3-1 scoped the scan to the 12 centipede segments because the flea did not exist yet. **cp3-2 must extend the spider's OVRLAP input to include the flea when the flea lands.** Affects `src/core/spider.ts` (the segs argument). *Logged in cp3-1 Delivery Findings; forward impact applies here.*

### TEA (test design)

- **Gap** (blocking **for cp3-2 itself**, and scoped into it): a killed flea's ONLY path back to life is `SCORP`'s `55$`/`58$` branch (`:2072-2075` — `CMP I,0FA / BCS 90$ / JMP ANTPC ;RESET ENTRY TO ALLOW ANTS`), which belongs to cp3-3's routine. `EXPLOD` counts the explosion 0xFF→0xF9 and stops (its points-sprite tail is guarded by `:972 CPX I,13.`, spider-only), and `ANTMV` returns immediately on any picture ≥ 0x20 (`:53-56`). Ported without that branch, **the first flea killed is the last flea of the game.** Affects `src/core/flea.ts` (`stepFleaExplosion` must own the revival). *Found by TEA during test design; pinned by the "a killed flea COMES BACK" test.*
- **Gap** (non-blocking, **cp4-scoped**): `CENTIN` (the wave's centipede length) is not modelled, so the spawn gate is PARAMETERIZED per the epic's wave-gating ruling. INIT seeds it to DECIMAL 12 (`:1167-1169`) and the gate closes at ≥ 12 (`:65`) — so **with the boot value the flea can never spawn in real play.** The ROM decrements it per wave only when `CENTIS >= 3` (`:464-467`) and resets it to 12 at zero (`:469-470`). cp4 must wire that decrement or the flea stays dead code outside tests. Affects `src/core/sim.ts` (`centin` field) and cp4's wave progression. *Found by TEA during test design.*
- **Conflict** (non-blocking): ANTMV's picture cycle advances by **TWO**, not one — `:84 INC ANTP` increments the byte in memory and `:85-87 LDA ANTP / CLC / ADC I,01` adds one again to the value read back. From the 0x1C that ANTPC installs, the cycle is 0x1C → 0x1E → 0x1C: **pictures 0x1D and 0x1F are never shown**, despite the ROM's own `:89 ORA I,1C ;FROM 1C TO 1F` comment. The comment describes the mask's range, not the reachable set. Code wins (open question 4's discipline); the divergence belongs in `docs/rom-study/open-questions.md`. Affects `src/core/flea.ts` and the shell atlas if it assumes four flea frames. *Found by TEA during test design.*
- **Question** (non-blocking, **cp3-3-scoped**): **slot 12 is SHARED between the flea and the scorpion** (`SCORP: LDA ANTP`, `:2001`) — they are one motion-object slot distinguished only by picture band (flea 0x1C-0x1F, scorpion 0x30-0x33), and every routine touching it gates on that band. cp3-3 must therefore CLAIM this slot rather than add a second object, which may mean generalizing cp3-2's `Flea` type or having both creatures share one slot-12 state. Flagging now so cp3-3 does not design a parallel object and silently break `ANTMV`'s `:53-56` gate. *Found by TEA during test design.*
- **Improvement** (non-blocking): **open question 4 is RESOLVED for the flea** — `CENTIP.DOC:115`'s rev-1 prose "flea 200" is CONFIRMED by rev-4 code (`:2219 LDY I,2 ;200 POINTS FOR ANT` → `SCORN1` with MSB 2, BCD 0200). No divergence to record for this creature; the scorpion's 1000 (`:2228 LDY I,10`) and the spider's bands remain as their own stories left them. *Found by TEA during test design.*

**Pre-extracted quarry for cp3-3 (the scorpion), per this project's TEA convention:**

- `SCORP` is `CENTI4.MAC:2001-2097`, mainloop slot `:36` (BEFORE `ANTMV` at `:37`). Picture band 0x30-0x33 (`:2026-2028`), cycling **+1** every 4 frames (`:2077-2086 ADC I,01 / AND I,03 / ORA I,30`) — note this is a genuine `+1`, UNLIKE the flea's `+2` above.
- Spawn conditions (all): the flea slot is PARKED (`ANTV >= 0xF8`, `:2009-2012`), `FRAME == 0` (`:2013-2014`), `CENTIN < 11.` DECIMAL (`:2017-2020 CMP I,11.` — note **11**, one lower than the flea's 12), and `RNGEN & 3 == 0` (`:2021-2023`). Sound `CHAN6 = 20.` decimal (`:2024-2025`).
- Entry: `ANTH = 0` (edge, `:2046-2047`), `ANTDV = 0` (`:2048`), `ANTV = (RNGEN & 0x78) + 0x70` — upper half of the screen (`:2049-2054`). Speed ±1 below 20,000 (`SCORE2 < 2`), else a 1-in-4 re-roll for slow over ±2 (`:2029-2044`); direction off `RNGEN` bit 7.
- Poisoning (the epic's "poison goes LIVE"): `OBSTAC` at `ANTV`, and a cell in `[0x3C, 0x40)` is poisoned by `AND I,0FB` (`:2087-2096`) — clearing bit 2 maps 0x3C-0x3F onto the 0x38-0x3B poison band, corroborating cp1-4's PM-19.
- Kill: **one hit, 1000 points** (`:2226-2228` — H window `CPY I,10.` DECIMAL, `LDY I,10` → `SCORN1`). It goes straight to `18$`; there is no two-hit path like the flea's.
- Off-screen (`ANTH` wraps to 0) → `58$ JMP ANTPC` (`:2069-2075`), the same re-park cp3-2 builds.

### TEA (rework, round 2)

- **Improvement** (non-blocking): a ROM fact this rework surfaced that no round-1 test expressed — **the first-hit speed-up applies on the SAME frame as the hit.** SHOOT stores `ANTDV=4` at `:2223`; ANTMV subtracts `ANTDV` at `:102`, three mainloop calls later (`:34` → `:37`). So a flea hit at speed 2 descends **4** that very frame. Discovered because the new behavioural ordering test asserted 2 and failed reporting 4 — the assertion was wrong, not the code, confirmed at the source before the expectation was changed. Now pinned. Affects `centipede/tests/flea.test.ts` (the ordering test) — and worth knowing for cp3-3, since SCORP writes the same `ANTDV` byte from the same shared slot. *Found by TEA during rework.*
- **Improvement** (non-blocking, process): the Reviewer's three findings were all found by a **mutation battery**, not by reading. Two of the three tests re-derived their expectation from the same constant the production code used, which makes a guard structurally incapable of detecting a change to that constant. Recommend the epic adopt the cheap version of this as convention for the remaining creature stories: pin fidelity constants to hand-written literals, stage at boundaries where the constant changes the observable outcome, and mutation-prove any test whose name asserts a guarantee. The battery script is small and reusable. Affects the cp3/cp4 test conventions. *Found by TEA during rework.*

### Dev (implementation)

- **Gap** (non-blocking, but a real gameplay defect until closed): **nothing DRAWS the flea.** `src/shell/render.ts` blits the spider (cp3-1 added `spiderStamp` + the slot-13 blit) but has no flea branch, so as of this story the flea descends, seeds mushrooms and **kills the player while invisible**. No AC in cp3-2 covers render and no test demands it, so implementing it here would have been untested scope creep — flagging instead. The work is small and already unblocked: the atlas ALREADY carries `ANT0`-`ANT3` from cp1-3's picture ROM, so it is a near-mirror of `spiderStamp` (`ANT${pic - 0x1C}`) plus one blit guarded on the live band (`pic < 0x20`), with the explosion pool falling through to `segmentStamp` exactly as the spider's does. Affects `centipede/src/shell/render.ts`. **cp3-3 carries the "complete ecosystem" demo and cannot capture it with an invisible creature on screen**, so it needs to land at or before that story. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the picture-cycle divergence has a visible consequence worth stating concretely — because ANTMV advances the picture by TWO, the flea only ever shows `ANT0` and `ANT2`. `ANT1` and `ANT3` are in the atlas but unreachable in play. Whoever writes the render branch above should expect a two-frame animation and not "fix" the cycle to reach all four. Affects `centipede/src/shell/render.ts` and `docs/rom-study/open-questions.md` (item 9, already recorded). *Found by Dev during implementation.*
- **Improvement** (non-blocking, informational): the new module is auto-covered by two existing guards with no wiring — `tests/purity.test.ts` generates one boundary test per `src/core/*.ts` via `readdirSync`, so `src/core/flea.ts stays inside the boundary` appeared and passes (this is the whole of the +1 in the 643 total: 574 baseline + 68 TEA + 1 generated). AC-2's purity requirement is therefore satisfied structurally rather than by a bespoke test. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the mainloop-ORDER guard in `tests/flea.test.ts` is VACUOUS — `src.indexOf('resolveFleaShotHit')` matches the **import statement at sim.ts:55**, not the call site at :258, so the test compares "import 55 < call 267" and can never fail. Mutation-proven: inverting the frame order (stepping the flea BEFORE resolving the shot) leaves the suite **643/643 green**. Affects `centipede/tests/flea.test.ts` (anchor the search to the call, e.g. `resolveFleaShotHit(` with the paren, exactly as the neighbouring `stepFlea(` already does). *Found by Reviewer during code review.*
- **Gap** (blocking): `FLEA_SEED_V_LEAD` is unpinned. The seeding-position test computes its expected cell from the TEST file's own copy of the constant AND stages at a post-move `v=0x7E`, where lead 4 and lead 0 both map to cell row 16 — so the assertion is doubly blind. Mutation-proven: setting the production lead to 0 leaves the suite green. Affects `centipede/tests/flea.test.ts` (stage at a post-move `v` of `0x7A` or `0x78`, where the two leads land in cells 16 vs 15, and assert the cell as a literal rather than via the shared constant). *Found by Reviewer during code review.*
- **Gap** (blocking): rejection sampling is unpinned. A CLAMP port yields `h = 0x0C`, which is a legal column — it passes both the test's `forbidden` set (`{0xFC, 0x04}`) and its `>= 0x0C` floor. Mutation-proven: replacing the `do/while` with a clamp leaves the suite green. The discriminating signature is DISTRIBUTION, not membership: over 20,000 seeds the floor column is **3.28%** when rejection-sampled and **9.09%** when clamped (~3x), because a clamp piles both rejected draws onto it. Affects `centipede/tests/flea.test.ts` (assert the floor column is not over-represented relative to the mean column frequency). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, round 2, COSMETIC): the reworked rejection-sampling test's comments say "the **31** legal columns" and "31 columns are reachable" (`tests/flea.test.ts:372/374/406`). The true count is **30** — the masked candidates are 32 values (`0x00..0xF8` step 8), of which two (`0x00`, `0x08`) are rejected. The mean share is therefore 1/30 = 3.33%, which is what the measured 3.28% actually corroborates. **No behavioural impact:** the test computes `mean = N / hist.size` dynamically, so the assertion is correct regardless and the mutation still dies. Purely a false number in prose — flagged because this repo's whole discipline is that a comment is a claim. Affects `centipede/tests/flea.test.ts` (three comment lines). *Found by Reviewer during round-2 code review.*

- **Improvement** (non-blocking): the three gaps above are one recurring shape — **a guard that re-derives its expectation from the same constant the production code uses cannot detect a change to that constant**. Two of the three did exactly that. Worth carrying into the epic's test conventions: pin fidelity constants to hand-written LITERALS, and stage boundary cases where the constant actually changes the observable outcome. *Found by Reviewer during code review.*

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (round 1) | clean | 0 blocking (1 judgment item) | confirmed 0, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** round 1 — 3 confirmed, 1 dismissed (with rationale), 0 deferred.
**Round 2** — 1 confirmed (cosmetic), 0 dismissed, 0 deferred. Toggles unchanged,
so round 2's verification was again performed directly rather than delegated:
the full suite, `npm run build`, the citation gate, a re-run of all three
previously-surviving mutations (checking WHICH test kills each, not merely that
something reddens), and independent re-derivation of every numeric claim in the
reworked test comments. Preflight was not re-spawned for round 2 — its
mechanical checks (suite, build, diff scope, smells) were run inline against a
one-file diff.

**Coverage note — this is not a claim of specialist coverage.** Eight of nine
specialists were disabled by settings, and per the reviewer charter ("you cannot
claim coverage from a subagent that failed") their domains were assessed
directly instead. This matters more than usual here: pf relayed review to the
SAME session that wrote the tests and the implementation, so the specialists
would have been the only independent readers. In their absence the substitute
was **mechanical rather than interpretive** — a 21-mutation battery against the
production modules (each mutation being the plausible wrong port), plus
independent re-derivation of every branch sense from `CENTI4.MAC` and an
independent re-implementation of the column draw. All three confirmed findings
came from the mutation battery; re-reading my own diff produced nothing, exactly
as the sidecar predicts.

**Dismissed:** preflight's `seedMushroom`/`dropMushroom` duplication item —
dismissed because `dropMushroom` derives its cell from `Math.sign(seg.dh)` and
the flea's `ANTDH` is hard 0 (FL-22, `:153-154`), so the two cannot share a cell
derivation; the genuinely shared part (`obstacleCellFor`) already is shared.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Scope widened beyond ANTPC/ANTMV to include SCORP's revival branch**
  - Spec source: context-story-cp3-2.md, the Problem statement
  - Spec text: "The flea, transcribed from rev-4. ANTPC (CENTI4.MAC:128) initializes
    the flea into slot 12 …; ANTMV (CENTI4.MAC:46) drops it down the screen"
  - Implementation: the suite additionally requires `stepFleaExplosion` to
    re-park the slot through ANTPC once the explosion is spent — logic that
    lives in `SCORP` (`:2072-2075`), a routine the story does not name and
    which cp3-3 otherwise owns.
  - Rationale: without it a killed flea is permanently gone (EXPLOD stops at
    0xF9; ANTMV refuses any picture ≥ 0x20). Shipping the kill without the
    revival would make the flea a once-per-life creature — a gameplay defect,
    not a deferral. This is the same call cp3-1 made when it pulled SHOOT's
    tail (`stepSpiderKillTimer`) into the spider story for identical reasons.
  - Severity: minor
  - Forward impact: cp3-3 adds SCORP's *scorpion-start* half on top of the
    revival branch rather than writing the routine from scratch.

- **CENTIN parameterized rather than modelled**
  - Spec source: context-epic-cp3.md, the wave-gating ruling
  - Spec text: "spawn/behaviour conditions that read wave or score state not yet
    modelled … are transcribed with that input PARAMETERIZED and test-pinned;
    the demo forces spawns via debug seeding"
  - Implementation: `FleaStepCtx.centin` is a required caller-supplied input;
    the tests force it below the gate to release the flea and hold it at the
    boot value of 12 to prove the gate closes.
  - Rationale: wave progression is cp4. Deriving CENTIN from `SimState.wave`
    here would invent the per-wave decrement rule (`:464-470`, itself gated on
    `CENTIS >= 3`) a full epic early.
  - Severity: minor
  - Forward impact: recorded as a cp4 Delivery Finding — with the boot value the
    flea cannot spawn in real play, so cp4 must wire the decrement.

### Dev (implementation)

- **EXPLOD and SCORP's revival collapsed into ONE per-frame call, which costs one frame**
  - Spec source: `CENTI4.MAC` mainloop `:30-39`, via the contract in `tests/flea.test.ts`
  - Spec text: the ROM runs `EXPLOD` at `:31` and `SCORP` at `:36` — so on the frame
    EXPLOD decrements the picture to `0xF9`, SCORP sees `0xF9` later in that SAME
    frame and re-parks the slot through `ANTPC`.
  - Implementation: one `stepFleaExplosion(flea, rng, score)` doing a single step
    per frame — `>= 0xFA` decrements, `== 0xF9` revives — so a flea reaching
    `0xF9` is re-parked on the FOLLOWING frame, one frame later than hardware.
  - Rationale: TEA's contract specifies the single combined function and pins
    this exact behaviour ("keeps the explosion going while the picture is still
    at or above 0xFA" asserts `0xFA → 0xF9` and explicitly NOT revived), and the
    tests TEA wrote are a spec source. Splitting into two call sites would have
    reddened that test. The lag is unobservable in play: during that extra frame
    the slot holds `0xF9`, which `SHOOT` rejects as unshootable and `ANTMV`
    refuses to move — identical to how it treats the parked flea it becomes.
  - Severity: minor
  - Forward impact: cp3-3 owns the rest of SCORP and may split the two halves
    when it adds the scorpion-start branch; if it does, this test moves with it.

- **`seedMushroom` is a second local transcription of MUSHER, not a shared call**
  - Spec source: `centipede/src/core/centipede.ts`, `dropMushroom` (CT-45/46/47)
  - Spec text: centipede.ts already transcribes MUSHER (`:1616-1641`) for the
    segment-kill drop.
  - Implementation: `flea.ts` carries its own `seedMushroom` with the same
    reserved-row, occupied-cell and lower-screen-court rules.
  - Rationale: the existing helper derives its target cell from a SEGMENT's
    heading (`Math.sign(seg.dh)`), which is meaningless for a flea whose `ANTDH`
    is hard 0 and whose row offset comes from `:116 LDA I,4` instead. Sharing
    would mean passing the already-computed cell, which is all the reuse would
    amount to — while coupling two ROM call sites that the original keeps apart.
  - Severity: minor
  - Forward impact: if cp3-3's scorpion needs a third variant, the three should
    be reconsidered together rather than pairwise.

### Reviewer (audit)

Each TEA and Dev deviation above, verified against the ROM and the code rather
than against its own rationale:

- **TEA — "Scope widened beyond ANTPC/ANTMV to include SCORP's revival branch"**
  → ✓ ACCEPTED. Verified independently: `EXPLOD` (`:963-970`) stops at `0xF9`
  and its revival tail at `:972` is guarded by `CPX I,13.` (spider-only), while
  `ANTMV` returns on any picture ≥ 0x20 (`:53-56`). No other routine writes
  `ANTP`. So `SCORP:2072-2075` really is the sole path back and omitting it
  would have stranded slot 12 permanently. Widening scope was correct, not
  gold-plating. Mutation M14 confirms the behaviour is now guarded.
- **TEA — "CENTIN parameterized rather than modelled"**
  → ✓ ACCEPTED. Matches the epic's wave-gating ruling verbatim, and the
  alternative (deriving from `SimState.wave`) would have invented `:464-470`'s
  decrement rule — itself gated on `CENTIS >= 3` — an epic early. The
  consequence (no fleas in ordinary play until cp4) is correctly logged as a
  cp4-scoped Delivery Finding rather than hidden.
- **Dev — "EXPLOD and SCORP's revival collapsed into ONE per-frame call"**
  → ✓ ACCEPTED. The "unobservable" claim is the load-bearing part, so I traced
  it rather than taking it: during the extra frame the slot holds `0xF9`, and
  every consumer of that byte rejects it identically to the parked flea it
  becomes — `resolveFleaShotHit` and `checkPlayerContact` and `stepFlea` all
  gate on `pic < 0x20`, and `overlapsSlot` skips `pic >= 0xF4`. Nothing renders
  it (see the Dev Delivery Finding). One frame, no observer. Accepted.
- **Dev — "`seedMushroom` is a second local transcription of MUSHER"**
  → ✓ ACCEPTED. `centipede.ts`'s `dropMushroom` derives its cell from
  `Math.sign(seg.dh)`, which is undefined behaviour for a flea whose `ANTDH` is
  hard 0 (FL-22); the flea's row comes from `:116 LDA I,4` instead. The shared
  part (`obstacleCellFor`) IS already shared. Reuse here would couple two ROM
  call sites the original keeps apart. Preflight independently reached the same
  read.

## Sm Assessment

**Setup complete. Routing to O'Brien (TEA) for the RED phase.**

### What was set up
- Session file, story context (`sprint/context/context-story-cp3-2.md`), and the
  branch `feat/cp3-2-flea` cut from `centipede/develop` at `d94bf4e` (the cp2-14
  orientation flip) — the correct, current base.
- Merge gate verified clear before setup: `gh pr list -R slabgorb/centipede`
  returned no open PRs, so no prior story is blocking new work.
- No pre-existing cp3-2 context to protect, so sm-setup's regeneration was safe
  here (the clobber risk applies to hand-authored contexts only).

### Decisions made during setup
- **Promoted the cp3-1 carry-forward into the context file as AC-5.** sm-setup
  logged it only in Delivery Findings. The context file is what drives test
  design, so the `OVRLAP` widening (`:1749 LDY I,12.` currently excludes the flea
  slot) is now an explicit, testable acceptance criterion rather than a note TEA
  might read as background. It also carries cp3-1's implemented divergence —
  vacant slots skipped in addition to the ROM's `>= 0xF4` — because a live flea
  must not be read as vacant.
- **Replaced the stubbed Technical Approach** with the non-negotiable constraints
  the epic already ruled on: rom-study ground truth + live citation gate, the
  `.RADIX 16` hex-unless-trailing-period trap, the core/shell boundary with
  rng-sourced seeding, the wave-gating parameterization ruling, and the rev-1
  scoring prose being diffed against rev-4 code before baking.

### Flagged for TEA (not resolved by me — they are TEA's to settle)
- **The "two hits with a speed-up" folklore is unverified.** The story states it
  as folklore; the epic requires transcribing what rev-4 `ANTMV` actually does
  and recording divergence. Treat it as a hypothesis to confirm, not a spec.
- **Flea 200 points is rev-1 prose** (`CENTIP.DOC:115`), open question 4. Diff
  against rev-4 code; code wins; divergence goes to `open-questions.md`.
- **The spawn trigger reads mushroom population in the player zone** — transcribe
  the actual count/rows from code. If it also reads wave state, parameterize it
  per the epic ruling and force spawns via debug seeding in tests.
- Per this project's convention, TEA pre-extracts the NEXT story's ROM quarry
  (cp3-3, the scorpion) into Delivery Findings.

**Handoff:** To O'Brien (TEA), RED phase.

## TEA Assessment (round 1 — SUPERSEDED, retained for history)

**Tests Required:** Yes
**Reason:** n/a — a 3-point ROM-fidelity transcription with four behavioural ACs
plus a carried-forward collision widening. No chore bypass applies.

**Test Files:**
- `centipede/tests/flea.test.ts` — 68 tests over ANTPC (`:132`), ANTMV (`:50`),
  SHOOT's ant branch (`:2188`), PLAY (`:1775`), EXPLOD + SCORP's revival
  (`:963`/`:2072`), the OVRLAP widening, and the sim wiring/mainloop order.

**Tests Written:** 68 tests covering 5 ACs
**Status:** RED (failing — ready for Dev)

**Verified RED, not assumed:** full-suite run, 37 files / **642 tests — 574
passing (exactly the pre-change baseline), 68 failing, all of them in
`flea.test.ts`**. No previously-passing test regressed. `npm run lint`
(`tsc --noEmit`) PASSES — the new module specifier is computed, not literal, so
the absent feature reddens the tests without breaking the build. Every
loader-gated failure carries the self-describing "cp3-2 flea surface not built
yet …" message rather than a module-resolution stack trace.

### The contract Julia builds

`src/core/flea.ts` — `createFlea` (ANTPC), `stepFlea` (ANTMV),
`fleaSpawnThreshold` (`:67-78`), `resolveFleaShotHit` (SHOOT's ant branch),
`stepFleaExplosion` (EXPLOD + SCORP's revival). Plus: `checkPlayerContact` gains
an OPTIONAL **4th** parameter after the spider; `spider.ts`'s OVRLAP scan widens
to the flea slot; `SimState` gains `flea` and `centin`, and `cloneState` deep-
copies the flea.

### AC coverage

| AC | Covered by | Status |
|----|-----------|--------|
| AC-1 trigger / speeds / seeding / hit semantics transcribed | ANTPC + spawn-gate + descent + picture-cycle blocks | failing |
| AC-2 seeded-rng seeding, determinism, purity | cadence + placement + MUSHER-guard + determinism blocks | failing |
| AC-3 hit behaviour + rev-4 score, folklore divergence recorded | two-hit + V-window-widening + H-window blocks | failing |
| AC-4 contact death through the shared PLAY/EXPLOD/RESTOR chain | PLAY-windows + sim death-transition tests | failing |
| AC-5 OVRLAP widened to the flea slot (cp3-1 carry-forward) | OVRLAP block incl. a source-text check on cp3-1's own note | failing |

### Rule Coverage

The project's rule surface here is the repo's own guards rather than a
lang-review checklist; each is exercised:

| Rule | Test(s) | Status |
|------|---------|--------|
| RADIX — hex unless trailing period | `reads the gate as DECIMAL 12, not HEX 0x12` (sweeps the whole 12–18 band closed) | failing |
| core/shell purity — seeded rng is the only entropy | `draws its column through the shared seeded rng`; `tests/purity.test.ts` sweeps the new module automatically | failing |
| Determinism / replay | `replays an identical fall` **plus** liveness and cross-seed divergence guards | failing |
| Backward compatibility of shared routines | `leaves the earlier arities EXACTLY as cp2-5 and cp3-1 pinned them` | failing |
| Citation gate | Dev authors `docs/rom-study/claims/11-flea.json` (FL-*); every constant in the suite carries its `:line "verbatim"` | n/a (Dev) |

**Self-check:** 0 vacuous tests remain. Three were repaired during Phase C —
abandoned rng-stub scaffolding in the rejection-sampling test (replaced with an
all-seeds property plus a `seen.size` guard), a `void mod` no-op, and four
declared-but-unasserted ROM constants, each now wired into a real premise
assertion rather than deleted (`noUnusedLocals` is on and tests are typechecked).

### Traps deliberately pinned (each one a plausible-but-wrong port)

1. **The two `12`s.** `:65 "CMP I,12."` is DECIMAL 12 (the CENTIN gate);
   `:72 "CMP I,12"` eleven lines later is HEX 0x12 = 18 (the 120,000-point
   band). The suite closes the entire 12–18 band to prove the gate is decimal.
2. **The dual-rate hitbox.** The V window widens 5 → 7 (`:2198`) keyed on
   `ANTDV >= 4` — i.e. on *having been hit*, NOT on the score. ANTPC's 60K
   speed is **3**, which is still narrow. The probe sits at dV = 5, inside the
   wide window and outside the narrow one, and asserts the slow flea is
   genuinely missed there so the discriminator cannot degenerate.
3. **The mainloop order is the OPPOSITE of the spider's.** SHOOT (`:34`)
   precedes ANTMV (`:37`), so a shot meets the flea where it moved *from*;
   BUGMV (`:33`) precedes SHOOT, so a shot meets the spider where it moved *to*.
   One descent step is 2–4 px against a 5–7 px window — enough to flip edge hits.
4. **The BCD byte halved in BINARY** (`:74-77 LSR / ADC I,6`). At 190,000 a
   decimal halving gives 15 and the ROM gives 18; the suite asserts they differ.
5. **The SCORE2 wrap at 1,000,000** — the two-digit byte rolls to 00 and the
   flea reverts to its slow speed. The table-END case every in-range sample hides.
6. **Rejection sampling, not clamping** (`:138-142`) — the two rejected columns
   must never appear for any seed.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment (round 1 — SUPERSEDED, retained for history)

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/flea.ts` — NEW. ANTPC (`:132`), ANTMV (`:50`), the MUSH
  threshold (`:67-78`), SHOOT's two-hit ant branch (`:2188-2224`), and
  EXPLOD + SCORP's revival (`:963`/`:2072`).
- `centipede/src/core/centipede.ts` — `checkPlayerContact` takes the flea as an
  OPTIONAL 4th parameter on the SEGMENT windows. Each hazard is now tested
  independently instead of the spider branch `return`ing, which would have let a
  present-but-missing spider mask a flea sitting on the gun.
- `centipede/src/core/spider.ts` — OVRLAP widened to slot 12 (cp3-1's
  carry-forward), factored into `overlapsSlot` and scanning the flea FIRST as
  the ROM's descending index does.
- `centipede/src/core/sim.ts` — `SimState.flea` + `.centin`, INIT's ANTPC at
  boot (`:1200`, after BUGOFF), the death re-park (`:733`), `cloneState`, and
  the frame wiring.
- `centipede/docs/rom-study/claims/11-flea.json` — NEW. 22 claims, FL-1..FL-22.
- `centipede/docs/rom-study/open-questions.md` — item 9, the rev-1/rev-4 diff.

**Tests:** 643/643 passing (GREEN). `npm run build` (tsc --noEmit && vite build)
passes.
**Branch:** `feat/cp3-2-flea` (pushed to origin)

### Verified, not assumed

- **The 643 is fully accounted for**, not hand-waved: 574 baseline + 68 TEA
  + 1 auto-generated. The subagent's first report called the extra test "likely
  a dev refinement"; I chased it instead and it is
  `src/core/flea.ts stays inside the boundary`, emitted by `purity.test.ts`'s
  `readdirSync` sweep over `src/core/`. It passes — that IS AC-2's purity half.
- **No seeded-fixture drift.** Adding `createFlea` at `createSim` consumes rng
  draws at boot and shifts the cursor for every later draw, which has reddened
  distant fixtures on this project before. Full-suite run confirms nothing
  outside `flea.test.ts` moved.
- **All 22 claims byte-verify against the vendored ROM**, checked by running
  `checkClaims` directly against `11-flea.json` with `vendoredRoot` set — 0
  errors — rather than inferring it from the citation suite going green. The
  verbatims were GENERATED by reading the ROM lines, not hand-typed, so the
  tab-exactness the gate demands is true by construction.

### The traps TEA pinned, and how the code answers them

| Trap | Resolution |
|------|-----------|
| `:65 CMP I,12.` DECIMAL vs `:72 CMP I,12` HEX 18 | two separate constants, `FLEA_CENTIN_GATE = 12` and `FLEA_SCORE2_HIGH = 0x12`, each radix-commented |
| V window widens 5 → 7 on `ANTDV >= 4` | keyed on `flea.dv >= FLEA_FAST_DV`, never on score — a fresh 60K flea's dv is 3 and keeps the narrow window |
| SHOOT (`:34`) before ANTMV (`:37`) | `resolveFleaShotHit` runs before `stepFlea` in the frame; the spider keeps its opposite order |
| A killed flea must come back | `stepFleaExplosion` carries SCORP's `:2072-2075` revival; without it the slot strands at 0xF9 forever |
| Binary LSR of a BCD byte | `(score2 >> 1) + 6` on the packed byte, not a decimal halving |
| Rejection sampling, not clamping | `do/while` re-draws on the two rejected candidates |

**Two deviations logged** (see Design Deviations): the EXPLOD/SCORP collapse
costing one unobservable frame, and `seedMushroom` as a second local MUSHER
transcription rather than sharing the segment-heading-derived helper.

**One gap flagged for the epic** (see Delivery Findings): **nothing renders the
flea yet** — it kills the player invisibly. Out of scope here (no render AC, no
test), but cp3-3's ecosystem demo cannot ship around it. The atlas already has
`ANT0`-`ANT3`, so it is a near-mirror of `spiderStamp`.

**Handoff:** To the Thought Police (Reviewer) — this workflow's `green` phase
exits straight to `review`, not to a TEA verify pass.

## Reviewer Assessment (round 1 — SUPERSEDED by round 2 below; retained for history)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The mainloop-ORDER guard cannot fail. `indexOf('resolveFleaShotHit')` matches the IMPORT at `sim.ts:55`, not the call at `:258`, so it compares "55 < 267" — true regardless of the real order. Mutation-proven: inverting the frame order leaves the suite **643/643 GREEN**. This is the story's own headline trap (TEA listed it as trap #3; Dev implemented it deliberately) and it has zero coverage. | `tests/flea.test.ts`, the "SHOOT runs BEFORE ANTMV" test | Anchor the search to the CALL, not the symbol — `resolveFleaShotHit(` with the paren, exactly as the neighbouring `stepFlea(` already does. Then mutation-prove it: swap the two calls and require RED. |
| [MEDIUM] | `FLEA_SEED_V_LEAD` is unpinned — doubly. The test derives its expected cell from the TEST's own copy of the constant, AND stages at post-move `v=0x7E` where lead 4 and lead 0 both map to cell row 16. Mutation-proven: setting the production lead to 0 leaves the suite green, so ";MAKE MUSHROOM APPEAR AFTER ANT" — the whole point of the offset — is unverified. | `tests/flea.test.ts`, "stamps a FULL mushroom 4 pixels BEHIND the flea" | Stage at a post-move `v` of `0x7A` or `0x78` (lead 4 → cell 16, lead 0 → cell 15) and assert the expected cell as a hand-written LITERAL, not via the shared constant. |
| [MEDIUM] | Rejection sampling is unpinned. A clamp yields `h = 0x0C`, a legal column that passes both the `forbidden` set `{0xFC, 0x04}` and the `>= 0x0C` floor — the test's premise about what a wrong port looks like is simply incorrect. Mutation-proven: replacing the `do/while` with a clamp leaves the suite green. | `tests/flea.test.ts`, "REJECTS a draw below 0x10 and rolls again rather than clamping it in" | Assert the DISTRIBUTION, not membership. Over 20,000 seeds the floor column is **3.28%** rejection-sampled vs **9.09%** clamped (~3x, since a clamp piles both rejected draws onto it). Assert the floor column is not over-represented against the mean column frequency. |

### What is NOT wrong

The **production code is correct in all three cases** — it does rejection-sample,
it does use lead 4, and it does resolve the shot before stepping the flea. Every
one of the 21 mutations that targeted a *behaviour* was killed, including the
radix trap (M1), the BCD/binary halving (M2), the equality boundary on the spawn
release (M3), the two-hit machine (M5), the `+2` picture step (M6), the OVRLAP
widening (M12) and the SCORP revival (M14). The 22 FL claims byte-verify against
the vendored ROM, checked by running `checkClaims` directly rather than inferring
it from a green suite. Build and full suite are green.

This rejection is therefore **not "the code is broken"** — it is "three of the
story's fidelity claims are asserted by tests that cannot fail." That distinction
matters for the rework: the fix is in `tests/flea.test.ts` only. No production
change is expected, and if one turns out to be needed, that is itself the finding.

### Why this is a REJECT and not an APPROVE-with-notes

The project's TEA charter bans exactly this: *"Could the assertion pass even if
the behavior is wrong?"* All three tests are named as though they prove the
property — one of them literally says "rather than clamping it in" — while
proving nothing. A test that claims a guarantee it does not provide is worse than
an absent one, because the next story reads the name and trusts it. The
`FLEA_SEED_V_LEAD` and column-draw constants are precisely the kind a future
"tidy-up" would change, and today nothing would stop it.

**Rework routing:** these are missing-coverage findings, so the phase returns to
**O'Brien (TEA)**, who owns the tests, not to Dev.

### Data flow traced

`RNGEN` draws → `createFlea`'s rejection loop → `Flea.h`; `state.rng` →
`stepFlea`'s seeding gate → `field.cells` mutation + `field.mush`. Safe: the
seeded cursor is the only entropy (purity sweep covers `flea.ts` automatically),
and the off-cadence early return provably consumes no draw — verified by
comparing cursor positions, not by inspection.

**Error handling:** no swallowed failures in the diff; the module has no throw
sites and no fallbacks. `seedMushroom`'s three early returns are ROM-transcribed
guards (`:1617-1633`), each mutation-proven live (M16/M17/M18).

**Handoff:** Back to O'Brien (TEA) for rework — tests only.
## TEA Assessment

**Round:** 2 (rework after Reviewer REJECTED — round-trip 1)
**Tests Required:** Yes
**Scope of this round:** `centipede/tests/flea.test.ts` ONLY. No production change
was needed and none was made — `git diff` for this round touches one test file.

**Tests:** 644/644 passing. `npm run build` (tsc --noEmit && vite build) passes.
**Branch:** `feat/cp3-2-flea` (pushed, `a1fa427`)

### The three findings, and what actually closes each

All three were the same failure mode in different clothes: **a test that named a
guarantee it did not provide.** The production code was correct in every case, so
none of these were bugs — they were three properties that a future edit could
have silently regressed.

| # | Finding | Fix | Proof |
|---|---------|-----|-------|
| 1 [HIGH] | The frame-order guard compared `indexOf('resolveFleaShotHit')` (which matched the IMPORT at `sim.ts:55`) against `indexOf('stepFlea(')` (the call at `:267`) — "import < call", never false. | Replaced with a **behavioural** test driving `stepSim`. Added a companion pinning the spider's opposite order, anchored to CALL sites (trailing paren). | Inverting the frame order in `sim.ts` now reddens **2 tests**; before the rework it left the suite fully green. |
| 2 [MED] | `FLEA_SEED_V_LEAD` unpinned — the test derived its expected cell from the test file's own copy of the constant AND staged where lead 4 and lead 0 both map to cell row 16. | Re-staged at post-move `v=0x7A`, where the leads separate (row 16 vs 15), expected cell written as a hand-computed **literal**, plus a negative assertion on the cell a zero lead would stamp. | Setting the production lead to 0 now reddens 1 test. |
| 3 [MED] | Rejection sampling unpinned — a clamp yields `h=0x0C`, a legal column passing both the forbidden set and the floor. Membership cannot separate the two ports. | Assert the **distribution**: a clamp folds both rejected draws onto the floor column (~3x the mean). Plus a liveness guard that the floor column occurs at all. | Replacing the `do/while` with a clamp now reddens 1 test. |

### Why the frame-order fix is behavioural rather than a corrected anchor

The Reviewer's prescribed fix was to anchor the search to `resolveFleaShotHit(`.
That works, but a source-text guard is defeated by anything that moves text — a
comment mentioning the symbol near the call site would resurrect the same bug.
The behavioural staging is derived from the sim's real arithmetic: `stepShot`
advances the shot **+7** (`:2137-2142`) before the flea branch runs, so a shot
placed 3 BELOW the flea arrives 4 ABOVE it — distance 4, inside the slow flea's
V window of 5. Stepping the flea first moves it 2 further away, to 6, outside.
The staging was found by sweeping the real sim and then **re-probed under the
inverted order** to confirm it discriminates, before a line of it was written.
The corrected source anchor is kept too, as the cheap companion test.

### A real ROM fact this rework surfaced

The behavioural test initially asserted the flea descends 2 on the hit frame and
FAILED, reporting 4. That is correct and I confirmed it at the source before
touching the expectation: SHOOT stores `ANTDV=4` at `:2223`, and ANTMV subtracts
`ANTDV` at `:102` three mainloop calls later, so **the speed-up applies on the
same frame as the hit**. The assertion was wrong, not the code. It now pins that
behaviour explicitly — a property the round-1 suite never expressed at all.

### Mutation battery — the standard this round is held to

The whole 21-mutation battery was re-run after the rework: **every mutation is
killed, zero survivors** (round 1: 3 survivors). Each mutation is the plausible
wrong port, not a random edit — the radix trap, the BCD/binary halving, the
equality boundary on the spawn release, the two-hit machine, the `+2` picture
step, the OVRLAP widening, the SCORP revival, and the three above.

**A note on RED-ness:** this round's tests are GREEN on arrival, which is correct
and not a skipped RED. The rework was to the guards, not the behaviour — the
implementation was already right, and the Reviewer's finding was precisely that
nothing proved it. The RED evidence for these three lives in the mutation
battery, which is a stronger signal than a temporarily-failing assertion: it
shows each test fails for the *specific* wrong implementation it exists to catch.

**Handoff:** To the Thought Police (Reviewer) for re-review of round 2.
## Dev Assessment

**Round:** 2 (after the Reviewer's REJECT and O'Brien's test rework)
**Implementation Complete:** Yes — **no production change was required or made.**

**Files Changed this round:** none in `src/`. `git diff 087d835..HEAD --name-only`
returns `tests/flea.test.ts` alone.

**Tests:** 644/644 passing. `tsc --noEmit` clean. Working tree clean.
**Branch:** `feat/cp3-2-flea` (pushed, `a1fa427`)

### Why this phase is a no-op, verified rather than asserted

All three of the Reviewer's findings were guards that could not fail, not
defects in behaviour — the round-1 verdict says so explicitly ("the production
code is correct in all three cases"), and the mutation battery is the evidence:
every mutation that targeted a *behaviour* was already killed in round 1. The
rework changed what the tests can detect, not what the code does. I confirmed
that independently here rather than taking it from the assessment: the round-2
diff touches no file under `src/`, and the suite and typecheck are green against
the unchanged implementation.

Inventing a production change to justify a Dev phase would have been the wrong
move. The workflow routes red → green → review, so this phase exists; it just
has nothing to do.

### Standing Delivery Findings (unchanged, still open)

Nothing in round 2 alters them. The one that most needs a home is the Dev finding
from round 1: **nothing renders the flea** — it descends, seeds mushrooms and
kills the player invisibly. Still out of scope here (no render AC, no test), and
still needs to land at or before cp3-3's ecosystem demo. The atlas already
carries `ANT0`-`ANT3`.

**Handoff:** To the Thought Police (Reviewer) for re-review of round 2.
## Reviewer Assessment

**Verdict:** APPROVED (round 2)

### Every round-1 finding re-verified, not taken on report

I re-ran the rework's own verification table rather than trusting O'Brien's
summary of it, and checked **which** test kills each mutation — "something
reddened" is not the same as "the guard that names this property works":

| Round-1 finding | Mutation re-applied | Result |
|---|---|---|
| [HIGH] frame-order guard matched the IMPORT, not the call | invert SHOOT/ANTMV in `sim.ts` | **2 red** — "SHOOT runs BEFORE ANTMV…" and the new companion "the spider keeps the OPPOSITE order". Round 1: 0 red. |
| [MED] `FLEA_SEED_V_LEAD` unpinned | lead 4 → 0 | **1 red** — "stamps a FULL mushroom 4 pixels BEHIND the flea". Round 1: 0 red. |
| [MED] rejection sampling unpinned | `do/while` → clamp | **1 red** — "REJECTS a draw below 0x10 and rolls again rather than clamping it in". Round 1: 0 red. |

The full 21-mutation battery also still shows **zero survivors**, so the rework
closed three holes without opening any.

### The fixes' own claims, checked

Comments are claims in this repo, and a fix round is exactly where new false ones
get introduced. Each numeric assertion in the reworked tests was re-derived
independently:

- "the shot advances +7 in `stepShot` (:2137-2142)" — **true**. `SHOT_SPEED = 7`
  (`player.ts:49`), and driving one sim frame moves a live shot `0x40 → 0x47`.
- the staged cells `{h:14, v:16}` (lead 4) and `{h:14, v:15}` (lead 0) at
  post-move `v=0x7A` — **both correct**, recomputed from OBSTAC's mapping.
- "9.09% vs 3.28% over 20,000 seeds" — **matches** my own independent
  re-implementation of the two candidate ports.
- the same-frame speed-up (`:2223` writes `ANTDV`, `:102` reads it, `:34` before
  `:37`) — **confirmed at the ROM**. This one is a genuine gain: round 1 had no
  test expressing it at all, and it surfaced only because the new behavioural
  test failed honestly and the ROM was consulted before the expectation moved.

### One cosmetic defect found, and it is partly mine

The reworked comments say "the **31** legal columns"; the real count is **30**
(32 masked candidates less the two rejected). Logged as a non-blocking Delivery
Finding. It has **no behavioural impact** — the test derives `mean` from
`hist.size` at runtime, so the assertion is right regardless and the mutation
still dies — and rejecting a second round over three comment words would be
disproportionate to the risk. Noting for the record that the same off-by-one
sits in my round-1 finding's framing ("~1/31"); the measured 3.28% actually
corroborates 30, not 31.

### Why this is an APPROVE

The production code was never in question — round 1 said so explicitly and the
behaviour-targeting mutations were already all killed then. What was missing was
proof, and that is now present in the strongest form available here: each of the
three properties has a test that demonstrably fails for the specific wrong
implementation it exists to catch. The frame-order fix is better than what I
prescribed — I asked for a corrected source anchor, and O'Brien supplied a
behavioural test derived from the sim's real arithmetic and re-probed under the
inverted order before being written, keeping the corrected anchor as a companion.

**Data flow traced:** `RNGEN` draws → `createFlea`'s rejection loop → `Flea.h`
(distribution now pinned); `state.rng` → `stepFlea`'s seeding gate →
`field.cells` + `field.mush` (cell position now pinned to a literal at a
discriminating row).
**Pattern observed:** guards that re-derive their expectation from the constant
under test, at `tests/flea.test.ts` — the shared root of all three findings, now
removed and captured as a Delivery Finding for the epic's conventions.
**Error handling:** unchanged from round 1; no throw sites, and `seedMushroom`'s
three ROM-transcribed early returns remain individually mutation-proven
(M16/M17/M18).

**Standing non-blocking findings carried to SM:** the flea is still **not
rendered** (it kills the player invisibly — must land at or before cp3-3's
ecosystem demo), `CENTIN` is still pinned at its boot value so no flea spawns in
ordinary play until cp4 wires the decrement, and the "31" comment above.

**Handoff:** To Winston Smith (SM) for finish-story.