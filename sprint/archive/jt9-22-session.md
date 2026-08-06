---
story_id: "jt9-22"
jira_key: "jt9-22"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-22: Port BOLAVA (:3953+) — the lava-avoid episode the lava steer gates divert to; jt8-3 suppresses instead

## Story Details
- **ID:** jt9-22
- **Jira Key:** jt9-22
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none (trunk-based strategy — work on main)
- **PR:** none
- **Points:** 3
- **Type:** bug
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T10:18:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T09:32:22Z | 2026-08-06T09:34:14Z | 1m 52s |
| red | 2026-08-06T09:34:14Z | 2026-08-06T09:51:36Z | 17m 22s |
| green | 2026-08-06T09:51:36Z | 2026-08-06T10:05:38Z | 14m 2s |
| review | 2026-08-06T10:05:38Z | 2026-08-06T10:18:01Z | 12m 23s |
| finish | 2026-08-06T10:18:01Z | - | - |

## Story Context

### Problem Statement

BOLAVA (JOUSTRV4.SRC:3953+) is the lava-avoid episode that the steering gates DIVERT to in the ROM. jt8-3 shipped the gates exactly but SUPPRESSES rather than diverts—gated wakes fall through to the existing brain laws, with SHLEV's protective lava flap (uf1-8) as the stand-in. That was a Reviewer-ACCEPTED deviation in jt8-3 because modelling BOLAVA inside that 3-point story would have expanded it into the whole lava-avoid system. This story ports the BOLAVA episode itself and replaces the fall-through with the real divert.

### Technical Approach

**Gate routing (from jt8-3, do not re-derive):**
- **Hunter's B2DIRL gate** (JOUSTRV4.SRC:4097-4102): `CMPA #$D3 / BLO B2DIR / LDA PVELY / BMI B2DIR / JMP BOLAVA` — the decision gate that routes to BOLAVA when pixelY ≥ $D3 AND velY ≥ 0.
- **Shadow's SHDIR pre-check** (JOUSTRV4.SRC:4330-4334): uses threshold $D0 (NOT $D3) — two DIFFERENT lava thresholds. Do not conflate them.
- **Current jt8-3 implementation** (plugins/joust/src/core/enemy.ts): gates exist, but gated wakes fall through to existing brain laws instead of diverting.
- **Stand-in** (uf1-8): SHLEV's protective lava flap currently masks the suppression.

**Deliverables:**
1. Read BOLAVA routine (JOUSTRV4.SRC:3953+) and understand the lava-avoid episode's structure and state transitions.
2. Port BOLAVA episode as a new brain state/route in enemy.ts (bounder-family mechanism, per jt8-3's deviation record).
3. Wire the divert: replace the fall-through at both gate sites (hunter B2DIRL and shadow SHDIR pre-check) with the real BOLAVA divert.
4. Preserve jt8-3's boundary test (both brains at their exact gate scanline) and build on it—do not weaken it.
5. Ground-truth citations: reference/williams-source/joust/JOUSTRV4.SRC (red-label RV4) and plugins/joust/docs/rom-study/.

### Key Files & Code Locations
- **Reference source:** reference/williams-source/joust/JOUSTRV4.SRC (BOLAVA :3953+, B2DIRL gate :4097-4102, SHDIR pre-check :4330-4334)
- **Enemy core:** plugins/joust/src/core/enemy.ts
  - SHDIR_LAVA_Y constant at :370 (currently 0xd0 for shadow)
  - SHLEV BOLAVA stand-in comments around :865-897
  - jt9-20 SHDIRB work around :908-937
- **Tests to build on:** plugins/joust/tests/steering*.test.ts — jt8-3's boundary test pins the gate lines themselves
- **Radix discipline:** Motorola radix (bare decimal, $ hex) — every transcribed constant needs a radix-cited claim

### Acceptance Criteria

1. BOLAVA episode is ported from JOUSTRV4.SRC:3953+ with all state transitions and gate logic modelled; every transcribed constant carries a radix-cited claim.

2. The steering gates (hunter B2DIRL at :4097-4102 and shadow SHDIR pre-check at :4330-4334) DIVERT to BOLAVA instead of falling through to existing brain laws; both thresholds ($D3 for hunter, $D0 for shadow) are preserved exactly and not conflated.

3. jt8-3's boundary test (both brains at their exact gate scanline) remains green and is not weakened—the gate lines are pinned and observable in the new implementation.

4. Determinism: replacing suppression with a real divert may move jt2 seeded-replay fingerprints. If pins move, re-baseline by sweeping for each pin's own precondition per sprint/archive/jt5-8-session.md and sprint/archive/uf1-9-session.md — never nudge a number toward the new output, one fingerprint-mover per commit.

5. Core purity maintained: BOLAVA is a pure-core mechanism with no sim/shell boundary violations.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Improvement / non-blocking]** The suppression's exact seam is `steerWake` returning `held` at `enemy.ts:1133` (hunter, `pixelY >= LAVA_ESCAPE_Y && velY >= 0`) and `:1138` (shadow no-target, `pixelY >= SHDIR_LAVA_Y && velY >= 0`). Those two conditions ARE the divert-arm conditions — Dev arms the BOLAVA episode at exactly that point. The comment at `enemy.ts:1084` ("BOLAVA itself is unmodelled — a gated wake falls through") is the line this story deletes.
- **[TEA / Gap / non-blocking]** AC4 determinism: the four behavioural REDs change enemy flap TIMING (shadow flaps in the [$D0,$D3) band where it did not; hunter re-flaps out of the lava). This WILL likely move jt2 seeded-replay pins (audio-events / audio-thud / audio-flap / audio-transporter-split). Re-baseline per `sprint/archive/jt5-8-session.md` + `uf1-9-session.md` — sweep each pin's OWN precondition, never nudge toward the new output; one fingerprint-mover per commit. Not yet measured at RED (no BOLAVA yet to perturb them).
- **[TEA / Gap / non-blocking]** AC1 citations: the `JT922-*` claims are RED and unwritten. Adding them bumps the README claim count (currently `checked 965 claim(s)` at README:52 and :156) and `check-citations.mjs` — bump both README sites at the SAME commit or `audio-seam-scope`'s derived claim-count guard reddens. (I already bumped the derived FILE count 136→138 at README:48 for the two new test files.)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Rewrote jt9-18's SHLEV forced-glide sub-test to measure through the real pipeline**
  - Spec source: `plugins/joust/tests/joust-jt9-18-forced-glide.test.ts`, AC-3 SHLEV case; jt9-22 AC2/AC3
  - Spec text: jt9-18 asserted a null-target shadow deep below the lava flaps (`enemyY > $D3`) then forces a glide (SHLEV2), measured via `shadow()` directly (`flapOf`).
  - What I did: replaced the `flapOf`/`shadow()`-direct measurement with `stepEnemyDetailed`, asserting the divert flap then a non-flap coast.
  - Why: the `enemyY > $D3` flap jt9-18 tested WAS the uf1-8 BOLAVA stand-in (comment `enemy.ts:865`). This story replaces it: `SHLEV JMP SHDIR` and its `$D0` pre-check (:4330-4334) DIVERT that exact bird to BOLAVA (`LBPL BOLAVA`), so the ROM never reaches SHLEV2 for a falling deep-lava shadow. `shadow()` alone cannot see the divert (it lives in `stepEnemyDetailed`), so the old measurement went stale — it read the leftover SHLEV flap off a bird now carrying a `lava` pjoy.
  - Impact/risk: LOW. The invariant jt9-18 protects — a shadow never flaps two wakes running — is preserved and strengthened: BOLAVA's `BOLAV2` coast (`CLRB`, :3960) is the glide, verified FLAP/coast/FLAP/coast through the pipeline. No assertion was deleted; the SHLEP sub-case (target present, no divert) is untouched and still green.
- **AC4 determinism: measured, ZERO fingerprints moved — no re-baseline performed.** The full joust suite (all jt2 seeded-replay pins: audio-events / audio-thud / audio-flap / audio-transporter-split) is green unchanged. BOLAVA only fires for a smart enemy deep in the lava AND falling, a state the natural-play demo seeds do not reach across the pinned replays — the same over-cautious-warning outcome jt9-1 recorded. If a later story's timing pushes an enemy into the lava on a pinned seed, THAT story re-baselines.

## Tea Assessment

**RED complete — 10 failing tests across two new files, all pins grounded in a live probe of the current suppressed behaviour.**

### What Dev must build (GREEN)
BOLAVA (JOUSTRV4.SRC:3948-3964) is a `PJOY,U` entry-address ping-pong, the smart-brain twin of LINET's glide (`dumbWingbeat`, `enemy.ts:1427`). Model it as a new `PjoyState` that OVERRIDES the flap decision when active, armed in `stepEnemyDetailed` at the gate seam:
- **Arm** on the SAME conditions `steerWake` already tests to return `held`: hunter (`b2undr`) airborne `pixelY >= 0xD3 && velY >= 0`; shadow (no target) airborne `pixelY >= 0xD0 && velY >= 0`.
- **Cycle:** enter ⇒ FLAP (`LDB #1`), arm BOLAV2 → BOLAV2 ⇒ COAST (`CLRB`), arm BOLAV1 → BOLAV1 ⇒ re-check `pixelY < 0xD3 OR velY < 0` ⇒ EXIT (clear pjoy, brain resumes); else FLAP.
- **Re-check threshold is `$D3` for BOTH brains** — the shadow ENTERS at `$D0` but re-checks at `$D3`. Do NOT reuse `SHDIR_LAVA_Y` for the exit (the `-source` suite has a claim guard demanding a JT922 claim that says so).
- **Target-blind:** the flap comes from the oscillator, not the brain; facing stays on BODIR (`homingWake` already runs, `steerWake` already returns `held` — keep both). This is what makes the hunter escape identical above/below its quarry.
- **Cite it:** add `JT922-*` claims covering 3946/3948-3964, radix-noted, incl. one on BOLAV1 (:3948-3952) stating the `$D3` re-check.

### Test map (per AC)
| File | Group | ACs |
|------|-------|-----|
| `bolava.test.ts` | shadow $D0 divert (exact + band) + 2 controls (above-gate, rising) | AC2 |
| `bolava.test.ts` | hunter target-blind escape (above≡below, re-flaps≥2) + gated premise | AC2 |
| `bolava-source.test.ts` | vendored ROM-law oracle (15 pins, skips on CI) | AC1 |
| `bolava-source.test.ts` | JT922-* claims coverage (RED, runs everywhere) | AC1 |
| _(unchanged)_ `steering.test.ts` | jt8-3 gate boundary — left intact, still green | AC3 |

### Rule coverage / self-check
- Every test asserts a concrete value; controls (207 above-gate, rising, gated-premise) prove non-vacuity — they stay green in BOTH the suppressed and ported worlds while the four RED behaviourals flip.
- The hunter discriminator is representation-independent (flap counts only), so a mere threshold tweak of the SHLEV stand-in cannot satisfy it — it forces a target-blind episode.
- AC5 (core purity) is covered by joust's existing pure-core scanner; no new guard needed (BOLAVA lands in `src/core/enemy.ts`, already pure).
- No vacuous assertions (`let _ =`, `assert(true)`, always-None) introduced or found.

### Verification
`npx vitest run --project joust` → 2 files / 10 tests fail (the intended RED), 136 files / 2868 tests pass. `npm run lint` → exit 0.

## Dev Assessment

**GREEN — all 10 RED tests pass; full joust suite 2878/2878, lint exit 0, `check-citations` all verified (978 claims).**

### What I built (all in `plugins/joust/src/core/enemy.ts`, pure core)
- **`PjoyState` gains `{ kind: 'lava'; entry: 'BOLAV2' | 'BOLAV1' }`** — the BOLAVA entry-address ping-pong (mirrored in `tests/helpers/enemy-contract.ts` per jt9-1's R-6 rule).
- **`lavaGateFires(enemy, target)`** — the single home for the two divert thresholds (`$D3` hunter / `$D0` no-target shadow, both falling). `steerWake` now calls it for its gate checks, so the thresholds live in one place and cannot drift.
- **`lavaRecheckExits(enemy)`** — BOLAV1's exit test: above `$D3` OR rising. The re-check threshold is `$D3` for BOTH brains (a shadow enters at `$D0`, leaves at `$D3`).
- **The episode in `stepEnemyDetailed`** — a `lava` pjoy enters at its stored address and BYPASSES the brain/seek/wing pipeline (BOLAV2 coasts, BOLAV1 flaps-or-exits); a fresh gate fire on a normal wake DIVERTS — overwrites `PJOY,U` with BOLAV2 and forces the flap. Target-blind: `dir` rides `homed.facing` (BODIR), no player read. A BOLAV4 exit clears the pjoy and falls through to the brains the same wake.
- Retired the stale "BOLAVA is unmodelled" comment (`enemy.ts` steering block).

### Citations (AC1)
`docs/rom-study/claims/bolava.json` — 13 `JT922-*` claims covering :3948-3964, radix-noted, incl. `JT922-002` stating the `$D3` re-check is the hunter's gate not the shadow's `$D0`. README claim count bumped 965→978 (both sites); file count 136→138 was TEA's.

### Verification
- `npx vitest run --project joust` → 2878 pass (0 fail).
- `npm run lint` → exit 0.
- `node plugins/joust/tools/audit/check-citations.mjs` → checked 978 claim(s), all verified.
- One sibling test (jt9-18 SHLEV) updated — see Design Deviations for the ROM justification. `steering.test.ts` (jt8-3, AC3) untouched and green.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (all story gates green: joust 2878, lint 0, citations 978; 2 orchestrator reds are pre-existing star-wars audit, untouched by this diff) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by my own mutation battery (7 mutants found + closed) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — pure sim, no error paths; nothing swallowed |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — replaced by the mutation battery, which is the sharper tool here |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — verified the stale "BOLAVA unmodelled" comment was retired |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — reviewed the `lava` PjoyState variant myself (see Rule Compliance) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A for a pure deterministic game core |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — reviewed complexity myself (single home for thresholds, no dead code) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — enumerated the project rules myself (see Rule Compliance) |

**All received:** Yes (1 enabled returned clean; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed-and-fixed ([TEST] mutation gaps), 2 low observations (1 filed as jt9-54, 1 folded into it), 0 dismissed

## Rule Compliance

Project rules read: `CLAUDE.md` (monorepo conventions), `plugins/joust/CLAUDE.md` (none joust-specific beyond the fleet), the pure-core boundary rule, and the joust radix/citation discipline. No `.claude/rules/*.md` or `SOUL.md` present. Language: TypeScript.

- **core/shell purity (every sibling's #1 rule):** BOLAVA lands entirely in `src/core/enemy.ts` — `lavaGateFires`, `lavaRecheckExits`, the `stepEnemyDetailed` branch — all pure, no DOM/Canvas/time/Math.random. `tests/purity.test.ts` green. ✅ COMPLIANT.
- **PjoyState exhaustiveness (jt9-1 R-6: contract must mirror production):** the new `{ kind:'lava'; entry }` variant was added to BOTH `src/core/enemy.ts` and the `tests/helpers/enemy-contract.ts` mirror. Every `pjoy.kind` reader checked: `shadow()` (specific-kind checks — unaffected), `dumbWingbeat` (glide-only — unaffected), `shadowDwellWake` (widened its narrow to exclude `lava` — correct, a lava wake never reaches it), the `phased` interval block (interval-only — unaffected), `stepEnemyDetailed` lava branch (new owner). No exhaustive `switch` left missing the case. ✅ COMPLIANT.
- **Radix-cited claims for every transcribed constant (AC1 / joust discipline):** `$D3`, `$D0`, `LDB #1`, `CLRB`, `BOLAV1/2/4`, `BODIR3` each carry a `JT922-*` claim with a byte-exact verbatim; `check-citations` verifies all 978. The `$D3`-vs-`$D0` distinction is explicitly owned by JT922-002. ✅ COMPLIANT.
- **Motorola radix in comments (bare decimal, $ hex):** every new comment uses `$D3`/`$D0`/`#1`; no bare-decimal hex. ✅ COMPLIANT.
- **Newtype/no-stringly-typed (TS type design):** `entry: 'BOLAV2' | 'BOLAV1'` is a closed union, not `string`; `Decision` reused, not re-shaped. ✅ COMPLIANT.
- **Don't-weaken-jt8-3 (AC3):** `steering.test.ts` untouched; `steerWake` refactor to call `lavaGateFires` is behaviour-preserving (verified: M1/M2 boundary mutants still redden steering.test). ✅ COMPLIANT.

## Reviewer Assessment

**VERDICT: APPROVED.** The port is ROM-faithful and now fully pinned. The one substantive finding was a TEST-coverage gap, which I closed in-place; the code itself needed no change.

### The review method (specialists disabled → mutation battery)
8 of 9 reviewer specialists are disabled via settings, so self-re-reading would find nothing. I ran a **mutation battery** on the production BOLAVA logic — every mutation should redden a test; a survivor is a coverage hole.

### Findings

1. **[TEST] CONFIRMED, FIXED (commit 14e3c06) — the BOLAVA state machine was under-pinned.** Seven distinct mutants initially SURVIVED all 60 tests:
   - flap/coast phase invert (`entry==='BOLAV1'` → `'BOLAV2'`) and divert-stores-`BOLAV1` — both make the bird flap two wakes running, which the wing-edge tests cannot see (a held flap is no new rising edge);
   - the episode EXIT entirely unverified — making `BOLAV1` never exit (bird stuck flapping forever after climbing out) survived, as did dropping the rising-exit;
   - the `velY==0` divert boundary (`LBPL` is `>= 0`).
   Root cause: the RED suite measured only `wingEdge` (merges consecutive flaps) and never exercised the exit. I added an `AC-1 — the BOLAVA ping-pong` describe block (seed each entry address; assert coast/flap + armed next-state + exit via `prevFlapHeld`/`pjoy`), a divert-arms-`BOLAV2` assertion, and a `velY==0` boundary. **Re-ran the full battery: every mutant now dies.** joust 2884/2884.

2. **[VERIFIED GOOD] ROM mapping is exact.** Re-checked each against `JOUSTRV4.SRC`: hunter gate `$D3` (B2DIRL :4098), shadow gate `$D0` (SHDIR :4331), BOLAV1 re-check `$D3` (:3949, NOT the entry `$D0`), flap `LDB #1` (:3955) / coast `CLRB` (:3960), rising-ignore `BMI BOLAV4` (:3952), exit `[DSMART,X]` (:3964), target-blind `BRA BODIR3 / JMP BODIR` (:3946). All correct.

3. **[VERIFIED GOOD] AC4 determinism independently confirmed.** Full suite green including every jt2 seeded-replay pin ⇒ zero fingerprints moved. The Dev/TEA "will move pins" warning was over-cautious (BOLAVA doesn't fire in the demo seeds), matching jt9-1's outcome.

4. **[VERIFIED GOOD] AC3 preserved.** `steering.test.ts` untouched; the `steerWake`→`lavaGateFires` refactor keeps the thresholds in one place (good design, no drift). The jt9-18 SHLEV rewrite is justified (BOLAVA supersedes the uf1-8 stand-in) and the no-double-flap invariant it protects still holds through the real pipeline.

5. **[FIDELITY / LOW] FILED as jt9-54 — `homingWake` (BOLEVB) runs on lava wakes; the ROM skips it.** `stepEnemyDetailed` runs `homingWake` unconditionally, but BOLAVA `BRA BODIR3` (:3956) jumps PAST the BOLEVB complement block (:3939-3945), confirmed against source. Effect: the port can spuriously reverse facing mid-episode. Second-order (horizontal facing during a rare/short episode, not the flap this story pins) and out of scope — filed rather than fixed here, per the descoped-findings rule. jt9-54 also carries the related low note that the lava-hold branch doesn't re-guard `airborne` (verified not reachable in play).

### Verification run
- `npx vitest run --project joust` → **2884 pass / 0 fail** (138 files).
- `npm run lint` → **exit 0**.
- `check-citations` → **978 claims, all verified**.
- Mutation battery → **0 survivors** after the fix (M1/M2/M3/M5/M6/M7a/M7b/M8 all redden ≥1 test).

## Sm Assessment

**Setup complete.** Session file created for story jt9-22 — Port BOLAVA lava-avoid episode, replacing jt8-3's suppression with the real divert. Trunk-based repo: work lands on main, no feature branch. No Jira in this project — jira_key is the story id.

Story moves to in_progress in sprint/epic-jt9.yaml; started timestamp recorded. Ready for handoff to TEA (red phase).

Story moves to in_progress in sprint/epic-jt9.yaml; started timestamp recorded. Ready for handoff to TEA (red phase).