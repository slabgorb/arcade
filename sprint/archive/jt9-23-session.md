---
story_id: "jt9-23"
jira_key: "jt9-23"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-23: joust B2UP3/SHUP3 — the two climb-preparation states, and the four PJOYT sites no DYTBL row covers

## Story Details
- **ID:** jt9-23
- **Jira Key:** jt9-23
- **Workflow:** tdd
- **Points:** 5
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** main
- **PR:** none

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T01:25:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T00:41:09.993516Z | 2026-08-06T00:44:03Z | 2m 53s |
| red | 2026-08-06T00:44:03Z | 2026-08-06T01:01:38Z | 17m 35s |
| green | 2026-08-06T01:01:38Z | 2026-08-06T01:13:33Z | 11m 55s |
| review | 2026-08-06T01:13:33Z | 2026-08-06T01:25:42Z | 12m 9s |
| finish | 2026-08-06T01:25:42Z | - | - |

## Sm Assessment

**Story:** jt9-23 (5pt, joust, tdd) — wire the two missing PJOYT climb-preparation states B2UP3/SHUP3 that no DYTBL row covers.

**Board:** Clean at setup. Branch probe found no owner; siblings are on jt9-35 (a-2) and mc1-2 (a-3). Claim pushed: stamp+context commit `8e46836` on `main`, empty branch `feat/jt9-23-b2up3-shup3-climb-prep-states` pushed (tip == main) so the sibling branch probe lights up. Story stamped `in_progress`.

**Premises verified against the current tree (rendered as fact in context):**
- `enemy.DOWN_SEEK_WING_HOLD = 2` (`plugins/joust/src/core/enemy.ts:570`) and `enemy.HUNTER_CLIFF_DWELL = 8` (`:577`) both exist — the "already modelled, must NOT re-derive" trio is real. Down-seek 2-wake hold and hunter cliff dwell stay un-wave-scaled.
- The FROZEN group in `plugins/joust/tests/cadence-source.test.ts` (~:260/:273, "nine ROW-backed sites and five FROZEN ones") is present and passes today. It asserts ROM shape, not the port, and must keep passing.
- ROM quarry: `sprint/archive/uf1-9-session.md` (uf1-9 wired the nine rows and stopped here).

**ACs:** were `null` in the epic YAML — `sm-setup` DERIVED them from the description (jt8-6 shape). They capture the two missing states, the LDA #20+1 decision interval, the three frozen sites to leave alone, and the FROZEN guard staying green. TEA reads these as derived, not authored.

**Load-bearing framing for TEA (in context as a ⚠ block):** the story's own first instruction is investigative, not code — decide whether the climb-preparation state is reachable in this port. uf1-9 measured the up-seek path is entered on ZERO frames of natural play across three seeds / 6000 frames (hunters first spawn at wave 4). A state never entered cannot be verified by natural play — this is the "wiring a dead core can kill a sibling's reachability" trap. The RED test must drive the state directly if natural play can't reach it, and must not be vacuous.

**Next:** hand off to TEA (Tyr One-Handed) for the RED phase.

## Tea Assessment

**Status:** RED phase complete. Two test files, mirroring the joust `-source`/`-wiring` split. Commit `2cced51` on `main`. Full joust project: **2843 passed, exactly 2 failed** (the two intended RED), 0 regressions, 136 files. Lint clean (exit 0).

### The reachability determination (the story's first, explicit ask)

**Verdict: the climb-preparation state IS modellable, but reachable only by STAGING — never by natural play. The RED drives it directly.**

- The ROM enters B2UP3/SHUP3 at the up-seek **decide** (`B2UP` :4029, `SHUNUP` :4258) when a **vertical** background sample one height-look-up above the bird (`ANDA BCKYTB-B2YLEN,Y` / `-SHYLEN`, YLEN = $14-6 = 14px) is non-zero — a cliff blocking the climb. Open air commits to the climb (`B2UPST`/`SHUPST`).
- The port's brain performs this vertical sample **nowhere**. `steerWake` samples the background HORIZONTALLY (`bckMaskAt(posX + len·dir, …)`, B2XLEN/SHXLEN) for turning; the up-seek decide commits blind. So the state is genuinely absent, and modellable — `bckMaskAt` is already a module function the brain can call.
- Reachability by play: uf1-9 measured the up-seek at **0 frames** across 3 seeds / 6000 frames (hunters spawn wave 4; buzzards climb only toward a quarry above them). The climb-prep hold sits one level deeper (an up-seek WITH a cliff above), so it is doubly unreachable. Hence the behavioural RED stages it directly: an airborne enemy at the decide (no committed seek), a far-above quarry, and a real background cliff scanned out of `BCK_X_TABLE`/`BCK_Y_TABLE` and placed one YLEN above. Inputs (velY level, velXIndex 0, position) are frozen and re-applied every wake; the brain's own state rides forward.

### What the RED pins (and what it deliberately does NOT)

- **`climb-prep-source.test.ts` — ORACLE, green on arrival.** The precise ROM spec Dev implements: the decide fork (vertical cliff sample → hold vs. commit), the per-brain PDIST **width** (hunter `LDD/STD` full 16-bit, shadow `LDB/STB PDIST+1` low byte only — a fidelity trap a port could flatten), the 21-wake `#20+1` interval, and the body's three exits (clear→commit, expiry→re-decide, PVELY gate→flap). A joust story has died three review rounds on a MISREAD ROM claim (jt8-6); this file makes the mechanism a measurement. It does **not** re-pin what the FROZEN group in `cadence-source.test.ts` already owns (the `#20+1` arming + non-migration).
- **`climb-prep-wiring.test.ts` — BEHAVIOUR, 2 RED.** Pins the phase-agnostic observable: with a cliff one YLEN above, the enemy must **not flap up into it** (0 flaps over 24 wakes) — it holds level. Today: hunter flaps 3×, shadow 24×. It does **not** pin the representation (a new `PjoyState` kind vs. an extended `interval`) — that is Dev's design, per uf1-9's "pinning the phase makes the suite an implementation transcript." Assertions read only `prevFlapHeld`, never any new field name.
- **AC2 (three frozen sites not re-derived):** a PORT guard in the source file asserting `DOWN_SEEK_WING_HOLD === 2` and `HUNTER_CLIFF_DWELL === 8` — green on arrival, guards against a "unify the decision timers" refactor dragging them into a DYTBL row.
- **AC3 (FROZEN group stays green):** untouched; confirmed passing after this change.

### Rule Coverage

| Rule / discipline | Test(s) | Status |
|---|---|---|
| Independent double-entry reader (jt1-3) — own `parseInsn`, no production decoder | climb-prep-source ORACLE groups | passing (green on arrival) |
| Vendored degradation (`skipIf(!vendoredAvailable)`), reads inside `it()` | all 3 ORACLE groups | passing |
| Every test asserts something meaningful (no vacuity) | CONTROL tests prove the fixture climbs when clear; the RED can't pass trivially | verified |
| Negative/complement + attribution control | clear-climb CONTROL (green) beside cliff-above RED, per brain | passing / RED |
| Fixture premises ASSERTED, not assumed | "FIXTURE PREMISE" test proves the cliff/clear geometry | passing |
| Re-apply the stage every wake (jt5-10) | `flapCount` re-freezes velY/velXIndex/position each wake | RED |
| Pin period/behaviour, not phase (uf1-9) | behavioural file reads only `prevFlapHeld`; representation left to Dev | RED |
| Pure core untouched (jt1-7) | tests only; no `src/` edits | n/a |
| README census (joust file count) | bumped 134 → 136; `audio-seam-scope` re-confirmed green | passing |

**Self-check — non-vacuity:** the RED "0 flaps" is NOT trivially satisfiable. The two CONTROL tests stage the identical fixture with the climb CLEAR and assert `flaps > 0` — both green today — proving the fixture genuinely routes into a climbing state that a correct B2UP3/SHUP3 must suppress. Without the controls, a fixture that simply never climbed would pass the RED vacuously.

### Handoff to Dev (Loki Silvertongue)

Implement the two "level flight, ready to go up" states so the two RED assertions go green **without** reddening the 12 green oracle/control tests or any sibling suite. Shape (design yours):
- At the up-seek decide in `b2undr`/`shadow` (enemy.ts), sample the background **vertically** one YLEN above the bird; a solid hit enters a climb-prep hold instead of committing to the climb.
- The hold: wings UP (level), remember the tracking line into PDIST (hunter 16-bit, shadow low byte), 21-wake decision interval; each wake re-check — cliff cleared → commit to the climb; timer expired → re-decide; falling past the tracking line (PVELY gate) → flap.
- Do NOT wave-scale the 21, and do NOT touch `DOWN_SEEK_WING_HOLD`/`HUNTER_CLIFF_DWELL`.
- The shadow re-enters its decide each wake (per `SeekState`), so the shadow's cliff re-check is natural; the hunter carries a committed episode, so the hold must persist as a `pjoy` state across wakes.

## Dev Assessment

**Implementation Complete:** Yes. GREEN. Commit lands on `main` (trunk-based).

**Files Changed:**
- `plugins/joust/src/core/enemy.ts` — the whole change. Added `CLIMB_PREP_YLEN` (14) and `CLIMB_PREP_FALL_FAST` (0x40) module constants cited to B2YLEN/SHYLEN and `ADDD #-$0040`; a `cliffBlocksClimb(enemy)` helper (the VERTICAL `bckMaskAt(posX, pixelY − YLEN)` sample the ROM's `BCKYTB-YLEN` decide reads); and the B2UP3/SHUP3 flap-law at the up-route read — in `pursue` gated to `b2undr`, and in `shadow()`'s up-branch — so a cliff one YLEN above holds the bird level (`flap: velY >= 0x40`) instead of climbing into it.

**Design decision — why stateless (see Design Deviation):** the port's shadow up-seek already re-decides every wake, collapsing stored-line ≡ live-line (the SHLEP/SHUPTM precedent, enemy.ts:851-853). Modelling climb-prep as a per-wake cliff re-check keeps the two brains symmetric, needs no new `PjoyState` kind, and touches nothing in the wing/interval/`promote` machinery. A cleared cliff resumes the climb naturally (the condition simply stops matching); commit-on-clear is therefore free.

**Fidelity guard — the two traps I avoided:**
- The **bounder** has NO climb-prep state: `BOUP` samples the cliff and diverts to plain `BOLEV` (:3850), and there is no `BOUP3` (confirmed by the FROZEN census — only B2UP3/SHUP3 carry `#20+1`). So the `pursue` branch is gated `enemy.brain === 'b2undr'`; the bounder is untouched and its cliff→BOLEV gap is filed as a non-blocking Delivery Finding.
- No existing up-seek fixture is perturbed: probed cadence-wiring's stage (posX 100, pixelY 0x60) — `bckMaskAt` one YLEN above reads **0**, so `cliffBlocksClimb` is false there. The change activates only over a real cliff, which no test and no natural play (up-seek = 0 frames) stages.

**Tests:** full joust project **2845 passed, 0 failed, 0 skipped, 136 files** (the two RED now green; the 12 oracle/control tests still green). **Typecheck:** `npm run lint` clean, exit 0, zero TS errors, repo-wide.

**Landed on:** `main` (trunk-based).

**Handoff:** To Heimdall (Reviewer). Key things to audit: (1) the stateless collapse is faithful vs. a fidelity-fake — the source oracle pins the ROM timer/PDIST as provenance and the Design Deviation + TEA finding disclose what is not modelled; (2) the `b2undr`-gating is correct (the bounder genuinely has no climb-prep); (3) `velY >= 0x40` is the right sense of the `ADDD #-$0040 / BMI` gate.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement** (non-blocking): the 21-wake `#20+1` decision-interval LENGTH is pinned only in `climb-prep-source.test.ts` (the ROM fact) — the behavioural suite pins that the enemy holds level with a cliff above, but NOT that the hold is exactly 21 wakes, because observing the period requires the timer-expiry re-decision to be externally visible, which the phase-agnostic flap observable is not. A later phase-pinning behavioural test (mirroring `cadence-wiring`'s period reads) could close it. Recorded so the interval value is not assumed covered end-to-end. FILED as jt9-51. *Found by TEA during RED.*

- **Gap** (non-blocking): the BOUNDER has an unmodelled cliff-above diversion, distinct from this story. `BOUP` (JOUSTRV4.SRC:3846-3853) samples the same vertical mask and, on a hit, jumps to plain `BOLEV` level flight (`BNE BOLEV` :3850) — it does NOT enter a climb-prep state (there is no `BOUP3`; only B2UP3/SHUP3 exist, confirmed by the FROZEN census). The port's bounder still commits to the climb blind. This story is scoped to the hunter/shadow climb-prep STATES, so the bounder's cliff→BOLEV was left untouched and its `pursue` branch gated to `b2undr`. Affects `plugins/joust/src/core/enemy.ts` (`pursue`, bounder up-route). Needs its own story if BOUP fidelity is wanted. FILED as jt9-50. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Climb-prep modelled STATELESS (per-wake cliff re-check), not as a held 21-wake-timer state with a stored PDIST line**
  - Spec source: sprint/context/context-story-jt9-23.md, AC-1; climb-prep-source.test.ts ORACLE groups (the ROM shape)
  - Spec text: "Each stores the tracked line into PDIST" and "Each loads a hardcoded `LDA #20+1` decision interval (TIME UNTIL NEXT DECISION)" — the ROM's B2UP3/SHUP3 are held states with a 21-wake timer and a remembered tracking line.
  - Implementation: added `cliffBlocksClimb(enemy)` (the vertical `BCKYTB-YLEN` sample) and, when an up-route enemy has a cliff one YLEN above, replaced the climb flap-law with the B2UP3A/SHUP3A gate `flap: velY >= CLIMB_PREP_FALL_FAST (0x40)` in `pursue` (gated to `b2undr`) and `shadow()`. No new `PjoyState` kind, no stored timer, no stored line — the check is re-derived every wake.
  - Rationale: the port's shadow up-seek is already stateless and re-decides every wake, which collapses "stored line ≡ live line" (the existing SHLEP/SHUPTM precedent, enemy.ts:851-853); modelling climb-prep the same way passes the behavioural ACs, keeps the two brains symmetric, and avoids threading a new state through the wing/interval machinery (`wingWake`/`currentRoute`/`promote`).
  - Severity: minor
  - Forward impact: minor — the 21-wake interval LENGTH and the `PDIST+1 CMPB PPOSY+1` tracking-line compare are not modelled as distinct mechanics (they collapse under per-wake re-derivation). The ROM values are pinned as provenance in climb-prep-source.test.ts and flagged in TEA's non-blocking finding above; a later story wanting the explicit timer/line-tracking would add a held `climb-prep` state.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A |

**All received:** Yes (preflight returned GREEN; the other 8 are disabled via `workflow.reviewer_subagents`, so I substituted a MUTATION BATTERY as the coverage instrument — the standing practice on this project.)
**Total findings:** 3 confirmed (1 High, 2 Medium), 0 dismissed, 0 deferred

## Reviewer Assessment

### Round 1 — VERDICT: REJECTED

Preflight is GREEN (joust 2845/2845, lint clean, `audio-seam-scope` verifies 136 files; the 2 orchestrator failures are pre-existing star-wars audit-tag issues, unrelated). Because 8 of 9 specialists are disabled, I read the diff myself and ran a **mutation battery** against `enemy.ts` (patch → run climb-prep suite → revert), which is what surfaced the findings below.

**Mutation battery results:**
- M1 flip cliff sense (`!== 0`→`=== 0`): **KILLED** (4 fail) — cliff detection is well covered.
- M2 `CLIMB_PREP_YLEN` 14→0: **KILLED** (2 fail) — the above-the-bird offset is covered.
- M3 `CLIMB_PREP_FALL_FAST` 0x40→0x2000: **SURVIVED** → F2.
- M4 drop the `b2undr` gate: **SURVIVED** → F3.
- M5 shadow `coastDir`→`dir`: **SURVIVED** → confirms F1 is real AND test-invisible.

**Findings:**

- **F1 [HIGH]** `plugins/joust/src/core/enemy.ts:931` — the shadow's SHUP3 branch returns `{ dir: coastDir, … }`, but `SHUP3A`/`SHUP3B` both `JMP SHDIRA` (JOUSTRV4.SRC:4434, 4441), and `SHDIRA`/`SHFDIR` (:4380-4386) **aim at facing** (`LDA #1 / STD CURJOY`, no PVELX check). `coastDir` is the `SHDIRB` law (:4388-4392) that writes dir 0 when moving — the routine `SHDN`/`SHUP0`/`SHUP1` use, NOT SHUP3. So a MOVING shadow holding below a cliff coasts where the ROM aims. This is a fidelity defect inside the very state the story delivers. The behavioural test freezes `velXIndex=0` (where `coastDir===dir`), so it cannot see it (M5 survives). **Fix:** return `{ dir, flap: velY >= CLIMB_PREP_FALL_FAST }` (the hunter branch already uses `dir`, correctly — B2UP3A→B2DIRA, and the port's hunter has no coast law).
- **F2 [MEDIUM]** the `CLIMB_PREP_FALL_FAST` (0x40) threshold is unguarded (M3 survives): the behavioural suite only stages `velY=0`, so any fall-fast value passes. The ROM value is pinned as provenance in `climb-prep-source.test.ts` but the PORT constant is not. **Fix:** add a behavioural test — a hunter/shadow holding below a cliff with `velY` at 0x40 flaps, at 0x3F glides.
- **F3 [MEDIUM]** the `enemy.brain === 'b2undr'` gate is unguarded (M4 survives): removing it (applying climb-prep to the bounder) breaks no test, yet the bounder must NOT hold level over a cliff (its ROM path is `BOUP`→`BOLEV`, no BOUP3). **Fix:** add a control — a bounder in an up-seek over a cliff still climbs (flaps), proving the gate excludes it.

**Observations (≥5):**
- **F1 [HIGH]** — above.
- **F2 [MEDIUM]** — above.
- **F3 [MEDIUM]** — above.
- **[VERIFIED]** the vertical cliff sample is the correct ROM read — `cliffBlocksClimb` (enemy.ts:1109-1111) samples `bckMaskAt(posX, (posY>>8) − CLIMB_PREP_YLEN)`, matching `ANDA BCKYTB-B2YLEN,Y` (:4205); it is distinct from `steerWake`'s horizontal `bckMaskAt(posX + len·dir, …)` (:1098). M1/M2 KILLED confirm it is exercised.
- **[VERIFIED]** the bounder is correctly excluded from climb-prep at the code level — `BOUP` (JOUSTRV4.SRC:3846-3853) diverts a blocked climb to `BOLEV`, and no `BOUP3` label exists (0 matches); the `b2undr` gate is the right ROM behaviour (only the coverage of it, F3, is missing).
- **[VERIFIED]** purity/core-boundary intact — both new functions are pure (no clock/entropy/browser surface), comments contain no `window.`/`document.` token that would trip the jt1-7 scanner; preflight reports purity OK.
- **[VERIFIED]** no sibling suite perturbed — Dev probed cadence-wiring's stage (posX 100, pixelY 0x60): `bckMaskAt` one YLEN above reads 0, so `cliffBlocksClimb` is false there; the change activates only over a real cliff, which no test and no natural play (up-seek = 0 frames) stages. Preflight's 2845/2845 corroborates.

### Rule Compliance
- **Pure core boundary (jt1-7 purity/core-boundary):** `cliffBlocksClimb`, the two flap branches, and the constants are deterministic functions of enemy state — COMPLIANT.
- **Cited constants carry a `JOUSTRV4.SRC:line` provenance comment with radix:** `CLIMB_PREP_YLEN` (`$14-6`, DECIMAL), `CLIMB_PREP_FALL_FAST` (`#-$0040`, HEX) — both cited and radix-labelled, matching the file's convention — COMPLIANT.
- **The three frozen sites not re-derived (AC2):** `DOWN_SEEK_WING_HOLD`/`HUNTER_CLIFF_DWELL` untouched by the diff; the source test's PORT guard passes — COMPLIANT.
- **FROZEN group stays green (AC3):** preflight confirms cadence-source untouched and green — COMPLIANT.
- **Citation accuracy:** F1 is precisely a citation-vs-mechanism gap — the comment says the body routes as B2UP3A/SHUP3A but the shadow's steering routine is mis-modelled. This is the jt8-6 class of defect (mechanism, not just quote).

### Devil's Advocate
Argue the code is broken. The strongest case is F1, and it is not academic: the shadow lord is the one brain whose horizontal motion the port deliberately splits into coast (SHDIRB) vs aim (SHDIRA) — jt9-20 landed that split precisely because getting it wrong changes where the enemy goes. My branch pastes `coastDir` from the SHUP1 line directly above it, which is the natural copy-paste error, and it is exactly wrong: SHUP3 is the ONE up-seek exit that does not coast. A shadow that enters SHUP3 while drifting (the common case — a hunting shadow has horizontal velocity) will, in the ROM, keep aiming at its facing to stay over its quarry while it waits out the cliff; my port makes it go limp horizontally (dir 0) and drift. On a fidelity project that is a real behavioural divergence, and the fact that it is unreachable in current play is not a defence — the whole story exists to model an unreachable state faithfully, and the source oracle it ships asserts the ROM shape the code then contradicts. Next, a confused maintainer: the comment on the shadow branch says "flapping back toward the tracked line" and cites SHUP3A, which routes to SHDIRA — a reader who trusts the comment and checks the ROM will find the code and the citation disagree on steering, the precise trap that killed jt8-6 three times. Finally the coverage: two of the three knobs I can turn (the fall-fast threshold, the bounder gate) survive mutation, so a future refactor could silently break either and ship green. The behavioural suite proves "holds level at velY=0 over a cliff" and almost nothing finer; it needs the velY-threshold and the moving-shadow-aims assertions before it can be trusted as a regression guard for this mechanism. Verdict: reject, fix F1, and pin F2/F3.

### Design Deviation audit
- Dev's **"Climb-prep modelled STATELESS"** deviation → ✓ ACCEPTED by Reviewer: the SHLEP/SHUPTM per-wake collapse (enemy.ts:851-853) is established precedent and the ROM timer/PDIST are pinned as provenance; the collapse is sound. (Note: the stateless choice is NOT what F1 is about — F1 is a wrong steering routine, orthogonal to the timer collapse.)
- Dev's **bounder cliff→BOLEV** Delivery Finding → ✓ ACCEPTED as correctly scoped out; F3 asks only that the EXCLUSION be guarded, not that BOUP be implemented.

**Routing:** back to Dev (Loki) for rework round 1 — fix F1 (`coastDir`→`dir` on the shadow branch) and add the F2 (velY-threshold) and F3 (bounder-exclusion) regression tests, plus a moving-shadow steering assertion that closes M5.

### Round 2 — VERDICT: APPROVED

Dev's rework (`2625364`) resolved all three round-1 findings; I re-ran the mutation battery to verify, rather than trusting the fix:

- **F1 [HIGH] — FIXED.** enemy.ts:936 now returns `{ dir, … }` (aim, SHDIRA) on the shadow climb-prep branch, with a comment citing SHUP3A→SHDIRA vs SHUP1→SHDIRB. New test `F1 — a MOVING shadow … AIMS at its facing` asserts `shadow(movingOverCliff).dir === facing` AND the control `shadow(movingClear).dir === 0` (the normal up-seek still coasts). Re-mutation M5 (`dir`→`coastDir`): **KILLED** (was surviving).
- **F2 [MEDIUM] — FIXED.** New test pins `CLIMB_PREP_FALL_FAST`: both brains flap at velY=0x40 and glide at 0x3F over a cliff. Re-mutation M3 (0x40→0x2000): **KILLED**.
- **F3 [MEDIUM] — FIXED.** New test asserts a bounder over a cliff still climbs (flap true at velY=0) and is unchanged by the cliff. Re-mutation M4 (drop the `b2undr` gate): **KILLED**.

**Re-verification:** full joust project **2848 passed / 0 failed / 136 files**; lint clean (exit 0); the 3 previously-surviving mutations now all KILLED; restored tree 17/17 on the climb-prep suite. The README file count is unchanged (tests were added to an existing file, no new file), so `audio-seam-scope` stays green.

**Final finding tally:** 3 confirmed round 1 (1 High, 2 Medium), all FIXED and independently verified in round 2. 0 outstanding. The two non-blocking Delivery Findings (TEA's 21-wake-length coverage note, Dev's bounder cliff→BOLEV gap) remain correctly out of scope and are filed in the session.

**No Critical or High outstanding. APPROVED.** Ready for SM finish.
## Impact Summary

**Status:** APPROVED (Round 2). All three review findings closed and independently re-verified.

- **R1 (REJECTED):** F1 [HIGH] shadow SHUP3 steered via `coastDir` where SHUP3A→SHDIRA aims; F2 [MEDIUM] fall-fast 0x40 threshold unguarded; F3 [MEDIUM] bounder-exclusion gate unguarded.
- **R2 (APPROVED):** all three FIXED (rework `2625364`) and re-verified by mutation battery — M3/M4/M5 now KILLED.
- **Verification on `main` HEAD:** joust 2848 passed / 0 failed / 136 files; lint clean; purity intact; siblings unperturbed.
- **Design deviation accepted:** climb-prep modelled stateless (per-wake re-check); ROM timer/PDIST pinned as provenance in the source oracle.
- **Non-blocking, out of scope — filed as follow-ups:** the 21-wake interval-length behavioural coverage note (TEA) and the bounder cliff→BOLEV fidelity gap (Dev).
