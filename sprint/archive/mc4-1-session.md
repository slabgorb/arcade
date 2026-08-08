---
story_id: "mc4-1"
jira_key: "mc4-1"
epic: "mc4"
workflow: "tdd"
---
# Story mc4-1: Wave model + per-wave ICBM velocity & count ramp (retire the SPEED=1 placeholder — the speed fix)

## Story Details
- **ID:** mc4-1
- **Jira Key:** mc4-1
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 5
- **Priority:** p1
- **Stack Parent:** none
- **Branch:** none
- **PR:** 85

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T22:45:43Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T21:16:54Z | 2026-08-07T21:19:47Z | 2m 53s |
| red | 2026-08-07T21:19:47Z | 2026-08-07T21:37:38Z | 17m 51s |
| green | 2026-08-07T21:37:38Z | 2026-08-07T22:09:04Z | 31m 26s |
| review | 2026-08-07T22:09:04Z | 2026-08-07T22:29:50Z | 20m 46s |
| green | 2026-08-07T22:29:50Z | 2026-08-07T22:34:57Z | 5m 7s |
| review | 2026-08-07T22:34:57Z | 2026-08-07T22:45:43Z | 10m 46s |
| finish | 2026-08-07T22:45:43Z | - | - |

## Sm Assessment

Setup for mc4-1 (5pt, p1, tdd/phased) is complete and independently verified.

**Board state at claim (all clean):**
- Contention: none. `git branch -r | grep -i mc4` empty before push; no sibling `.session/mc4-1` anywhere (a-1 holds only jt10-8). Merge gate clean — no open PRs.
- Dependency `mc3` is DONE and archived (`sprint/archive/epic-mc3.yaml`). mc3 shipped the enemy loop this story builds on: unit-speed ICBMs in `src/core/icbm.ts`, seeded spawn, damage/score/state. So the premise ("retire the SPEED=1 placeholder", ramp velocity per wave) is current, not stale — no falsifiable state-claim needed refuting.
- Shard `mc4` is indexed in `current-sprint.yaml` (not orphaned).

**Setup verification:**
- Session file carries `Workflow`, `Repos`, and a single phase pointer (grep count = 1).
- ACs copied VERBATIM from `sprint/epic-mc4.yaml` (context lines 27-30 match word-for-word — no edit this round).
- Branch `feat/mc4-1-wave-model-icbm-velocity-count-ramp` cut from `develop` (gitflow confirmed on origin repos.yaml), tip == develop, claim commit `fc6b5fd4` pushed. Status stamped `in_progress` and re-read.

**Handoff notes for TEA (Han Solo) — RED phase:**
- Four ACs: (1) new pure `src/core/wave.ts` — wave number + `{count, velocity}` schedule from cited REV-01 constants, purity green; (2) `stepIcbm` uses wave-scheduled velocity not hard-coded 1, wave-1 measurably slower, monotonic ramp to a cited ceiling; (3) ABM velocity corrected so ABMs outrun ICBMs at every wave, cited; (4) new `claims/wave.json` with byte-exact REV-01 verbatim + a REV-01-vs-REV-03 delta note (O-3), citations + AC3 no-uncited-literal guard + purity all green.
- Cite targets: `1ST PHASE OF NEW WAVE SETUP` (W3MAIN.MAC:3901 logical) for the count schedule; `CALCULATE MISSILE VELOCITY & DISPLAY INCREMENT` (W3MAIN.MAC:3279 logical) for the velocity ramp.
- ROM traps to honor when citing: W3MAIN.MAC is DOUBLE-SPACED — cited lines are LOGICAL (non-blank) ≈ physical/2; `.RADIX 16` at W3COMN:1 (bare number = hex, trailing `.` = decimal); `.MAC` files are CR-terminated non-UTF8 — use `grep -a`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5pt tdd story adding a new pure core module (`wave.ts`) + behavioural changes to `icbm.ts`/`abm.ts` + a new cited claim.

**Test Files (4 new, all RED):**
- `tests/wave.test.ts` — AC1 + AC2(schedule): `INITIAL_WAVE`/`waveSchedule` contract, velocity monotonic-ramp-to-ceiling, count positive-int + bounded, purity via the auto-sweep.
- `tests/icbm-velocity.test.ts` — AC2: `stepIcbm` advances by the per-ICBM velocity (behavioural: ~velocity units/tick, faster=more ground, slower=more ticks, still snaps) + wave-1 slower than wave-N integration.
- `tests/abm-outruns-icbm.test.ts` — AC3: `ABM_SPEED` > ICBM velocity at every wave incl. ceiling + an ABM beats a same-wave ICBM over an equal flight (strictly fewer ticks).
- `tests/wave-claims.test.ts` — AC4: a committed claim records the REV-01-vs-REV-03 delta note (O-3) + a synthetic mutation-proof that the detector has teeth.

**Tests Written:** 20 across 4 files covering 4 ACs. **Status:** RED (16 failing, ready for Dev) — 4 of the wave-claims tests are standing/teeth tests that pass by design (non-empty floor + 2 synthetic mutation-proofs + the O-3 guard is the 1 that reddens).

**RED verified (Chewbacca / testing-runner, RUN_ID mc4-1-tea-red):**
- `npm run lint` (tsc --noEmit) → **exit 0, GREEN** (dynamic-import idiom keeps the release gate green while `wave.ts` is absent).
- `npx vitest run --project missile-command` → **exit 1, 16 failed / 516 passed**. Every pre-existing test (icbm/abm/mc3-playthrough/spawn-claims/citations/purity + 21 others) still passes — **no regressions**.
- Failure reasons confirmed per-file: wave.test + abm-outruns = "module not built yet" (wave.ts absent); icbm-velocity = 3 behavioural (velocity ignored: `expected 1 to be close to 0.5`, `200==200` ticks) + 1 module-absent; wave-claims = the O-3 delta-note assertion. All red for the FEATURE's absence, not typos/collection errors.

### Rule Coverage (lang-review/typescript.md — applicable checks for a pure numeric sim + cited claims)

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 source-guard matches CLAIM not token; mutation-tested | wave-claims.test.ts delta-note detector keyed on BOTH revisions + synthetic accept/reject proof | covered |
| #18 fixture-value ≠ expectation (guard can distinguish artifact from absence) | wave-claims synthetic mutation-proof (accepts both-revs note, rejects one/none) | covered |
| #21 degenerate/NaN numeric input | wave.test velocity>0 + finite + saturates at extreme wave (no NaN/Infinity); icbm still snaps at fractional velocity | covered |
| #26 assertion terms all test-local | abm-outruns imports ABM_SPEED (abm.ts) and velocity (wave.ts) — no term is test-local, drift in either reddens | covered |
| #2 missing readonly on shared shapes | WaveParams `{readonly count, readonly velocity}` encoded in the module contract | covered (contract) |
| #5 `.js` extension on relative imports | all test imports use `../src/core/*.js`; wave.ts internal imports enforced by tsc/purity at GREEN | deferred to Dev/tsc |

**Rules checked:** 6 of the applicable lang-review checks have test coverage or are enforced by the existing auto-machinery (purity sweep, no-uncited-literal §4). React/async/security/enum checks (#3/#6/#7/#10/#11) are N/A to a pure synchronous numeric module.
**Self-check:** 0 vacuous tests. Every assertion pins observed behaviour or a cross-module relationship; the 3 "always-pass" wave-claims tests are deliberate teeth (non-empty floor + mutation-proofs), not vacuous coverage.

**Handoff:** To Dev (Yoda) for GREEN. Key constraints: keep `stepIcbm` arity-1 and `launchIcbm`'s 3rd arg default-1 so mc3-1's icbm.test.ts stays green; derive schedule constants byte-exact under the checker into `claims/wave.json`; heed the two Delivery Findings (physical-vs-logical cite lines; the "cited ABM change" direction).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/wave.ts` (new) — `INITIAL_WAVE=1` + pure `waveSchedule(wave)⇒{count,velocity}` from the REV-01 tables `ICBWAV` (count), `WICSPH`/`WICSPL` (8.8 frame-update period). velocity = min(1, 1/period).
- `plugins/missile-command/src/core/icbm.ts` — `Icbm.velocity?` (optional, default 1); `stepIcbm` advances by `icbm.velocity ?? 1`; `launchIcbm(o,t,velocity=1)`.
- `plugins/missile-command/src/core/abm.ts` — `ABM_SPEED` 1→2 (FASABM default "MOVE 2 DOTS", W3MAIN.MAC:1661), cited by comment.
- `plugins/missile-command/docs/rom-study/claims/wave.json` (new) — 21 byte-exact claims: `ICBWAV`(10), `WICSPL`(9), `WICSPH`(1, carries the REV-01↔REV-03 O-3 delta note), `ICSPDL`(1, the 256 fixed-point scale).
- `plugins/missile-command/tests/citations-source.test.ts` — added the 4 table symbols to the `DERIVED` exemption (STCITY-style `.BYTE` numeric claims) + an mc4-1 consistency block that pins each table value to a real decoded entry of its cited line.

**Derived REV-01 schedule (the "too fast" fix):** wave 1 velocity 0.208 units/frame (slowest) → 0.348 → 0.571 → 0.970 → saturates at the 1.0 ceiling from wave 5; counts follow ICBWAV (12,15,18,…,20). mc3 ran every wave at the 1.0 ceiling — that was the "too fast". ABM_SPEED 2 > the ceiling, so ABMs outrun ICBMs at every wave.

**ACs met:** AC1 (pure wave.ts schedule + INITIAL_WAVE) ✅ · AC2 (stepIcbm honors per-ICBM velocity; wave-1 slower, monotonic ramp to ceiling) ✅ · AC3 (ABM 2 dots/frame outruns ICBM ≤1/frame every wave; cited) ✅ · AC4 (byte-exact claims/wave.json incl. REV-01↔REV-03 delta note; citations + purity green) ✅.

**Tests:** missile-command **536/536** (`npx vitest run --project missile-command`, exit 0); `npm run lint` (tsc --noEmit) exit 0, 0 errors; `npm run test:orchestrator` **408/408** exit 0. Byte-checker over the full committed set (115 claims) exit 0. No regressions (mc3 icbm/abm/game/playthrough all green).

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the story's cite targets "W3MAIN.MAC:3279 logical" and "W3MAIN.MAC:3901 logical" are mislabeled — those numbers are the PHYSICAL `.SBTTL` header lines (`grep -an` finds `.SBTTL CALCULATE MISSILE VELOCITY & DISPLAY INCREMENT` at physical 3279 and `.SBTTL 1ST PHASE OF NEW WAVE SETUP` at physical 3901), and W3MAIN is double-spaced (~2014 blank of the first 4000 physical lines), so the LOGICAL ordinal for those labels is ~half. They are also just the routine HEADERS, not where the numeric constants live.
  Affects `docs/rom-study/claims/wave.json` (Dev must grep FORWARD from each `.SBTTL` to the actual EQU/table lines and claim each at its PHYSICAL line — the byte-checker keys on the physical line, per citations-source/spawn-claims convention). *Found by TEA during test design.*

- **Question** (non-blocking): AC3 says "the change is cited" for the ABM velocity, but abm.ts's `ABM_SPEED` is currently the trivial-exempt value 1 (cited only in a source comment to ABMVEL/W3MAIN, no committed claim). If Dev sets a non-trivial corrected ABM speed, citations.test.ts §4 auto-forces a committed claim for it; if the fix instead SLOWS ICBMs below the existing ABM_SPEED=1 and leaves ABM_SPEED at 1, no new ABM claim is forced. The behavioural guard (ABM strictly outruns ICBM every wave) carries AC3 either way; the "cited" clause is satisfied automatically only in the first case.
  Affects `src/core/abm.ts` (Dev/Reviewer should confirm which direction the REV-01 values take and that the ABM velocity's authenticity is cited). *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the centre-base player ABM moves 6 dots/frame (`LDY I,6 ;YES. MOVE FAST`, W3MAIN.MAC around :1667), vs the 2-dot default modelled here. mc4-1 models only the default ABM speed. Affects `src/core/abm.ts` (a future per-base speed model could give the centre base its 6-dot boost). *Found by Dev during implementation.*
- **Gap** (non-blocking): the REV-01↔REV-03 delta note (O-3) is catalogued qualitatively — REV-03 (`missile` 035820-02) retunes these ICBWAV/WICSP*/difficulty tables, but the *exact* REV-03 numbers are not derivable here: only the REV-01 tree is vendored (`reference/source/`). Affects `docs/rom-study/claims/wave.json` (MC-WICSPH-4 note) — quantifying the delta needs the REV-03 source. *Found by Dev during implementation.*
- **Improvement** (non-blocking): confirmed TEA's finding — the schedule constants live at PHYSICAL W3MAIN.MAC lines (ICBWAV:5713, WICSPL:5717, WICSPH:5719), not the "3279/3901 logical" `.SBTTL` header lines in the story text; all 21 claims cite physical lines and byte-verify. Affects the story/epic description wording. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Per-ICBM velocity carried on the Icbm, not passed to stepIcbm**
  - Spec source: context-story-mc4-1.md, AC2
  - Spec text: "stepIcbm advances by the wave-scheduled velocity, not a hard-coded 1"
  - Implementation: tests encode `launchIcbm(origin, target, velocity=1)` + `stepIcbm(icbm)` reading `icbm.velocity`, rather than a `stepIcbm(icbm, velocity)` signature.
  - Rationale: only this shape keeps `stepIcbm` arity-1, so game.ts's `spawned.icbms.map(stepIcbm)` and spawn.ts's `launchIcbm(o,t)` stay green without the game/spawn WIRING that belongs to mc4-4 (a 2-arg stepIcbm would feed the `.map` index in as velocity and corrupt mc3-playthrough). It is also the faithful model — the ROM advances each ICBM by its own velocity vector (UPDATE ICBM POSITIONS). Dev may pick different names but must preserve arity-1 stepIcbm and a default-1 launch so mc3-1's icbm.test.ts stays green.
  - Severity: minor
  - Forward impact: mc4-4 wires the spawner to launch each wave's ICBMs at `waveSchedule(wave).velocity`; until then ICBMs default to unit speed and no in-game slowdown is visible (correct for mc4-1's scope).

- **The per-wave COUNT is not asserted monotonic (only positive-integer + bounded)**
  - Spec source: context-story-mc4-1.md, AC1/AC2
  - Spec text: AC2 says the VELOCITY "ramp is monotonic up to the cited ceiling"; AC1 calls count a "schedule", not a ramp.
  - Implementation: wave.test.ts asserts velocity is monotonic non-decreasing with a saturating ceiling, but for count asserts only positive-integer, finite, and saturating — NOT per-step monotonicity.
  - Rationale: the REV-01 count schedule's exact monotonicity is unverified (it is Dev's derivation from 1ST PHASE OF NEW WAVE SETUP); asserting strict count monotonicity risked a false-RED that contradicts the ROM. The ACs only require velocity to ramp monotonically.
  - Severity: minor
  - Forward impact: if the derived count turns out clearly monotonic, a follow-up guard could tighten this; not required by the ACs.

- **AC4 guard pins only the REV-01-vs-REV-03 delta note, not the schedule VALUES/ids/filename**
  - Spec source: context-story-mc4-1.md, AC4
  - Spec text: "claims/wave.json carries every new schedule constant ... byte-exact REV-01 verbatim and a REV-01-vs-REV-03 delta note"
  - Implementation: wave-claims.test.ts is file-agnostic (via loadClaims()) and asserts ONLY that a committed claim records the REV-01/REV-03 delta. Byte-exactness + value-backing are left to the EXISTING machinery (citations.test.ts §4 auto-scans wave.ts; spawn-claims.test.ts §3 byte-verifies the whole committed set).
  - Rationale: deriving the full per-wave schedule (symbols/values/physical lines) from 6809 assembler is this story's 5-point Dev work, written UNDER the checker by the epic's design; pinning wrong values in TEA would be worse than the auto-machinery (the mc3-1 spawn.json "don't force the filename / duplicate-id" lesson). The delta note is the ONE AC4 clause nothing else enforces.
  - Severity: minor
  - Forward impact: none — the citation checker enforces the byte-exact values regardless of where Dev files them.
### Dev (implementation)

- **Descent velocity modelled as 1/period capped at 1, not the raw 16-bit period**
  - Spec source: context-story-mc4-1.md, AC2; REV-01 W3MAIN SETICS/UPICBM
  - Spec text: "stepIcbm advances by the wave-scheduled velocity ... ramp is monotonic up to the cited ceiling"
  - Implementation: `waveSchedule().velocity = min(1, 1/period)` where `period = WICSPH + WICSPL/256`. The ROM stores a per-wave "FRAMES BEFORE UPDATE" period (WICSPH.WICSPL, 8.8 fixed point); UPICBM moves each ICBM ONE step only when the countdown fires, at most once/frame. So on-screen speed = moves/frame = 1/period, capped at the 1-step/frame hardware max.
  - Rationale: modelling the raw period would make velocity=∞ at wave 15 (period 0) and 256 at wave 14 — nonsensical as a step size. The effective steps/frame (≤1) is the faithful on-screen speed and yields the required monotonic ramp (0.21→1.0) with a finite saturating ceiling.
  - Severity: minor
  - Forward impact: the ceiling equals mc3's old flat SPEED=1 — mc3 ran every wave at that ceiling, which is exactly the "too fast" the epic describes; mc4-4 will show waves 1-4 measurably slower once the spawner is wired.

- **Icbm.velocity is OPTIONAL (default 1), not required**
  - Spec source: the RED tests + mc3 icbm/game/render fixtures
  - Spec text: AC2 (stepIcbm advances by the scheduled velocity)
  - Implementation: `readonly velocity?: number`; `stepIcbm` uses `icbm.velocity ?? 1`; `launchIcbm(o,t,velocity=1)` always sets it.
  - Rationale: a required field would force edits to mc3's game.test.ts/render-battle.test.ts Icbm literals (7 sites). Optional-with-unit-default keeps those untouched and is backward-compatible (an un-velocitied literal descends at mc3 unit speed). `?? 1` (not `|| 1`) so a deliberate 0 is preserved.
  - Severity: minor
  - Forward impact: none — every ICBM built via launchIcbm carries a velocity; only raw test literals rely on the default.

- **ABM_SPEED corrected to 2 and cited by comment, not a claim; centre-base 6-dot speed deferred**
  - Spec source: context-story-mc4-1.md, AC3; REV-01 W3MAIN:1661 (FASABM)
  - Spec text: "ABM velocity is corrected so ABMs OUTRUN ICBMs at every wave ... the change is cited"
  - Implementation: `ABM_SPEED = 2` (FASABM default "MOVE 2 DOTS"), cited in abm.ts's `//` comment (W3MAIN.MAC:1661) — no committed claim, because 2 is trivial-exempt from the un-cited-literal guard (mirrors mc3 citing the ICBM unit speed 1 by comment; a numeric non-EQU FASABM claim would also trip the mc2-6 M6 rule). The centre-base 6-dot "MOVE FAST" per-base speed is left to a later story.
  - Severity: minor
  - Forward impact: 2 > the ICBM ceiling of 1, so ABMs outrun ICBMs at every wave; a future per-base speed model could add the centre-base 6.

- **Extended citations-source.test.ts DERIVED set (+4 symbols) and added a consistency block**
  - Spec source: mc2-6 M6 rule in citations-source.test.ts; the AC3 no-uncited-literal guard
  - Spec text: "every non-EQU claim carries a kind-tag string value, never a number"
  - Implementation: added ICBWAV/WICSPL/WICSPH/ICSPDL to the `DERIVED` exemption (they are `.BYTE`/`.BLKB` tables carrying real numeric entries, exactly the STCITY case) and added an mc4-1 block asserting every table claim value is a genuine radix-decoded entry of its cited line, and ICSPDL's scale is 256.
  - Rationale: wave.ts embeds the real ROM schedule bytes as literals, so the AC3 guard needs their numeric values in claimedValues; M6 forbids numeric values on non-EQU claims UNLESS the symbol is DERIVED. This is the sanctioned extension point (STCITY precedent), and the new consistency block keeps the exemption from being a hole.
  - Severity: minor
  - Forward impact: mc4-2/3 will add more `.BYTE` bonus/regen tables; they follow the same DERIVED + consistency pattern.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (536/536 mc, lint 0, 408/408 orch, claims byte-verified, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge domain self-covered ([EDGE]: rowFor(NaN)/velocity degenerate) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — self-covered ([SILENT]: velocity 0/NaN silent non-arrival) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — self-covered ([TEST]: no exact-value guard on the ramp/count) |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 3 (2 HIGH fidelity + 1 stale line#), 1 downgraded LOW, 1 dismissed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — self-covered ([TYPE]: optional velocity field) |
| 7 | reviewer-security | Yes | findings | 2 | 0 blocking (offline game); both latent, folded into [EDGE]/[SEC] #21 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — self-covered ([SIMPLE]: none; wave.ts is minimal) |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 4; 1 CORRECTED (its abm #17 "VERIFIED TRUE" mis-counted the MIEND loop) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 6 confirmed (2 High, 1 Medium, 3 Low), 2 dismissed/downgraded, 2 latent-deferred

## Reviewer Assessment

**Verdict:** REJECTED

Two HIGH ROM-fidelity defects: the shipped code passes every test and cites byte-accurate source, but the **derivations built on those citations are wrong** — the classic "green citation next to wrong on-screen behaviour" failure this epic exists to prevent. I resolved a direct contradiction between comment-analyzer and rule-checker by reading `COND65.MAC` / `UPICBM` myself (see below); comment-analyzer was right.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [DOC] | **Descent-velocity formula wrong.** `UPICBM` moves an ICBM on the frame `ICBFRH` reaches 0, and that frame is itself consumed — real velocity = `1/(period+1)`, not `1/period` capped at 1. The current model flattens waves 5–14 to the 1.0 ceiling (making them *too fast* — re-introducing the very defect the story fixes); the ROM ramps them 0.615→1.0. Verified: `ICSPDH=4` ⇒ 5 frames/move; wave-5 closed cycle = 0.615 = 1/(0.625+1). | `src/core/wave.ts:75` (`period <= 1 ? 1 : 1 / period`) + header lines 51-54, 73-74 | Use `velocity = 1 / (period + 1)` (naturally caps at 1.0 as period→0, no explicit cap); correct the "moves/frame = 1/period, ceiling 1 step/frame" prose. |
| [HIGH] [DOC] | **ABM speed wrong + false mechanism comment.** `COND65.MAC` `MIEND`=`BPL <begin>`, so `BEGIN…DEC FASABM…MIEND` loops while FASABM ≥ 0 — with `FASABM=2` the body runs **3** times (2→1→0→−1). The ROM's default ABM moves **3 dots/frame** (7 centre), and `W3COMN` `IBLOOP=<NICBMS-1>` proves the −1 idiom is deliberately absent here. `ABM_SPEED=2` and the "runs FASABM times / 2 units/tick" comments (abm.ts:14-20, 50-53) are false. | `src/core/abm.ts:55` + comments | Correct to the real 3 dots/frame (FASABM+1); represent/cite honestly (FASABM=2 is the source literal, the +1 is the MIEND off-by-one); fix the comments. |
| [MEDIUM] [RULE] | **Stale module summary (#24).** icbm.ts header still says the warhead "flies a STRAIGHT line at constant unit speed" — true only for the velocity=1 fallback; the SOURCE-OF-TRUTH block 11 lines below was updated but this summary was not reconciled. | `src/core/icbm.ts:4` | Reword the summary to note per-ICBM/per-wave velocity. |
| [LOW] [RULE] | **False comment about the guard (#17).** abm-outruns-icbm.test.ts:10-11 says citations.test.ts §4 auto-enforces the ABM_SPEED citation "the moment it stops being the trivial-exempt 1" — but `TRIVIAL={0,1,2,-1}` already exempts 2, so nothing is enforced. | `tests/abm-outruns-icbm.test.ts:10-11` | Delete/correct the claim (fold into the ABM rework). |
| [LOW] [EDGE][SEC] | **Degenerate velocity unguarded (#21).** `icbm.velocity ?? 1` does not catch 0/negative/NaN; velocity 0 or NaN ⇒ silent permanent non-arrival (a future per-frame caller would hang). Not reachable in mc4-1 (schedule > 0, default 1), latent for mc4-4. | `src/core/icbm.ts:49` | Optional now: validate at the `launchIcbm` boundary (`Number.isFinite && > 0`) or track for mc4-4. |
| [LOW] [TYPE] | **Unneeded double-cast.** `}) as unknown as Claim` on a literal that already satisfies `Claim`. | `tests/wave-claims.test.ts:65` | Remove the cast. |

### Rule Compliance (lang-review/typescript.md)
- **#17 (comments assert a mechanism nobody re-ran):** VIOLATED — the velocity `1/period` derivation and the ABM "2 dots" derivation are both refuted by a literal macro/timing trace. This is the core of the rejection.
- **#24 (retirement applied only where named):** VIOLATED — icbm.ts summary line.
- **#21 (degenerate-but-not-nullish numeric):** VIOLATED (latent) — velocity `?? 1`.
- **#1 (type escape):** minor — one unneeded double-cast.
- **#28 (every core literal claim-backed):** COMPLIANT — all wave.ts literals byte-verified; DERIVED extension + consistency block sound. *Note (latent, not this diff's fault):* the guard is a GLOBAL value-set (wave.ts's 16/10 are covered via CITY1V/MAXMIS), not per-symbol — a pre-existing guard-scope weakness.
- **#15/#25/#26/#18 (guard quality):** COMPLIANT — the new citations-source consistency block and wave-claims mutation-proof are properly anchored and non-vacuous.
- **#27 (core purity):** COMPLIANT — wave.ts/icbm.ts/abm.ts have no clock/entropy/DOM/shell import.
- **#5 (.js imports), #4 (?? not ||), #22 (NaN accept-predicate):** COMPLIANT.

### Devil's Advocate
Is this code broken? Yes, in the one way that matters for a fidelity epic. Every test is green and every citation byte-verifies, which is exactly the trap: the tests assert only *relative* properties (monotonic, wave-1 < wave-64, ceiling saturates) and the citation guard checks only that the raw table *bytes* are real — neither can see that the *formula consuming those bytes* is wrong. A player on wave 8 would watch ICBMs fall at full ceiling speed when the real cabinet ramps them in gently; the shipped curve flattens 10 of 15 waves to the maximum, so the "too fast" complaint the story set out to fix is only half-fixed (waves 1–4) and re-created for 5–14. The ABM at 2 dots/frame instead of 3 is subtler but same class — a confident comment ("runs FASABM times") that a literal macro expansion refutes. What would a maintainer misunderstand? The comments actively teach the wrong mechanism (that `UPICBM`'s period is frames-per-move with no move-frame surcharge, that MIEND loops N times). A future story (mc4-4 wiring, or a REV-03 delta) would build on those false premises. The saving grace: the *structure* (tables, citations, DERIVED model, purity) is all correct and reusable — the fixes are two formula corrections plus comment truth-ups, not a redesign. And credit where due: TEA's decision NOT to pin exact values kept the RED honest, but it's also why these slipped — the rework must add at least one exact-value guard (e.g. wave-5 velocity ≈ 0.615, ABM = 3) so the formula can't silently drift again.

### Self-covered domains (disabled specialists)
The 5 disabled subagents' domains were reviewed by me directly: **[SILENT]** — the only swallowed-failure risk is the degenerate-velocity silent non-arrival, already raised as the [EDGE]/#21 finding; no empty catches or dropped errors in the diff. **[TEST]** — the suite asserts only relative ramp properties and the citation guard only raw bytes, so neither catches the two formula errors; the rework must add exact-value guards (this gap enabled both High findings). **[SIMPLE]** — wave.ts/icbm.ts/abm.ts are minimal, no over-engineering or dead code. **[TYPE]** — the optional `velocity` field is the only notable choice, accepted.

**Handoff:** Back to Dev (Yoda) for a rework round (rework → green per the gate's recovery_config) — correct the two formulas (`velocity = 1/(period+1)`; `ABM_SPEED = 3` = FASABM+1) and the false comments, and ADD an exact-value regression guard (e.g. wave-5 velocity ≈ 0.615, ABM = 3) so the formulas cannot silently drift again.

## Delivery Findings — Reviewer

### Reviewer (code review)

- **Conflict** (blocking): the descent-velocity formula ignores `UPICBM`'s consumed move-frame — should be `1/(period+1)`, not `1/period` capped at 1; flattens waves 5-14 to the ceiling. Affects `src/core/wave.ts:75` (fix formula + comments; add an exact-value guard). *Found by Reviewer during code review.*
- **Conflict** (blocking): ABM speed is 2 but the ROM's `BEGIN…DEC FASABM…MIEND` (COND65 `MIEND`=BPL) moves FASABM+1 = 3 dots/frame; comments assert a false "runs FASABM times" mechanism. Affects `src/core/abm.ts:55` and its comments. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `citations.test.ts` §4 is a GLOBAL claimed-value set, not per-symbol — wave.ts's 16/10 are "covered" via CITY1V/MAXMIS, so the guard would greenlight a wrong 16/10 in wave.ts. Pre-existing guard-scope weakness (not introduced here). Affects `tests/citations.test.ts` (a future per-symbol tightening). *Found by Reviewer during code review.*

## Design Deviations — Reviewer Audit

### Reviewer (audit)

TEA deviations:
- **Per-ICBM velocity carried on the Icbm** → ✓ ACCEPTED: sound API choice, keeps stepIcbm arity-1 and defers wiring to mc4-4; matches the ROM's per-ICBM velocity vector.
- **Per-wave COUNT not asserted monotonic** → ✓ ACCEPTED: correct — ICBWAV (12,15,18,12,…) is genuinely non-monotonic, so asserting it would be a false-RED.
- **AC4 guard pins only the REV-01/REV-03 delta note** → ✓ ACCEPTED: the value-backing/byte-exactness is enforced by the existing machinery; delta note is the only uncovered clause.

Dev deviations:
- **velocity = 1/period capped at 1** → ✗ FLAGGED: the ROM consumes the move-frame, so the faithful formula is `1/(period+1)`; the cap wrongly flattens waves 5-14. See the HIGH finding. (This deviation was logged honestly but the derivation is incorrect.)
- **Icbm.velocity OPTIONAL (default 1)** → ✓ ACCEPTED (with note): reasonable blast-radius choice; but pair it with a boundary finiteness/positivity guard (see the #21 LOW finding) before mc4-4 wires a per-frame caller.
- **ABM_SPEED=2 cited by comment, no claim; centre-base deferred** → ✗ FLAGGED: the value should be 3 (FASABM+1); the "trivial-exempt" reasoning is also factually wrong (2 IS in TRIVIAL, so no auto-enforcement exists — see the #17 LOW finding).
- **Extended citations-source DERIVED set + consistency block** → ✓ ACCEPTED: the STCITY-precedent extension is the sanctioned mechanism, and the added consistency block closes the exemption hole. Well done.
## Dev Assessment — Rework Round 1

Addressed all six round-1 review findings.

**HIGH (both fixed):**
- **Velocity formula** — `src/core/wave.ts:76`: `velocity = 1 / (period + 1)` (was `period <= 1 ? 1 : 1/period`). UPICBM's countdown-zero frame is itself the move frame, so an ICBM moves every (period+1) frames. Caps naturally at 1.0 as period→0 (no explicit clamp). Curve now ramps smoothly 0.172→1.0 instead of flattening waves 5-14 to the ceiling. Header prose (lines 22-27) corrected.
- **ABM speed** — `src/core/abm.ts:60-61`: `const FASABM = 2; export const ABM_SPEED = FASABM + 1` (= 3). COND65 `MIEND`=`BPL <begin>` loops while ≥0, so `BEGIN…DEC FASABM…MIEND` runs FASABM+1=3 iterations. Expressed as FASABM+1 (both literals trivial-exempt → no claim needed, source literal 2 stays cited by comment). Header (lines 22-31) rewritten with the real MIEND semantics.

**MEDIUM/LOW (all fixed):**
- icbm.ts module header (#24): "constant unit speed" → "per-ICBM descent speed (default unit)".
- abm-outruns-icbm.test.ts (#17): removed the false "citations.test.ts §4 enforces it the moment it stops being trivial-exempt 1" comment; now states the value is FASABM+1, cited by comment, NOT guard-enforced.
- wave-claims.test.ts:61 (#1): removed the unneeded `as unknown as Claim` double-cast.
- #21 degenerate velocity (LOW/latent): left as-is per the review ("optional now"); tracked as a forward finding for mc4-4's spawner wiring.

**Regression guards ADDED (the review's key ask — the gap that let both bugs pass):**
- `tests/wave.test.ts`: new "exact REV-01 descent curve" block pins wave-1 ≈ 0.17204, wave-5 ≈ 0.61538, wave-15/∞ = 1.0 exactly, and the ICBWAV count mapping (12/16/18/20 at waves 1/5/15/∞) — independent literals, so the formula and wave→row index can't silently drift.
- `tests/abm-outruns-icbm.test.ts`: `expect(ABM_SPEED).toBe(3)`.

**Verified:** missile-command **541/541** (536 + 5 new guards); `npm run lint` exit 0; `npm run test:orchestrator` **408/408**; byte-checker **114/114** verified. No regressions.

**Handoff:** Back to Reviewer (Obi-Wan) for round 2.
## Subagent Results — Round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (541/541 mc, lint 0, 408/408 orch, 114 claims verified, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled — [EDGE] self-covered (velocity `?? 1` latent, unchanged) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled — [SILENT] self-covered (none new) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled — [TEST] self-covered (new exact-value guards verified mutation-sensitive) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | round-1 fixes all confirmed; 1 new LOW (wave.ts:44 NEWWV1→NEGAM), 1 informational |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled — [TYPE] self-covered (FASABM+1 derivation clean) |
| 7 | reviewer-security | Yes | clean | none | 1/(period+1) proven terminating; latent velocity gap unchanged/deferred |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled — [SIMPLE] self-covered (none) |
| 9 | reviewer-rule-checker | Yes | findings | 1 new + all round-1 resolved | 1 new MED (wave.ts:41/55 stale `1/period` comments); #24/#1/#17×3/#28 all RESOLVED |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 0 blocking; 3 non-blocking comment defects (all #17, code/claims/tests correct)

## Reviewer Assessment — Round 2

**Verdict:** APPROVED

Round-1's two HIGH fidelity defects are **fixed and independently re-verified at the source**:
- **[DOC]** `wave.ts` velocity = `1/(period+1)` — re-traced `UPICBM` (W3MAIN.MAC:1445-1465): the `ICBFRH==0` frame both reloads and moves, so frames-per-move = period+1. Curve ramps 0.172→1.0 smoothly (no ceiling-flatten). Confirmed by both comment-analyzer and rule-checker + my own arithmetic (wave-1 0.17204, wave-5 0.61538, wave-15 1.0).
- **[DOC]** `abm.ts` `ABM_SPEED = FASABM+1 = 3` — re-traced `COND65.MAC` `MIEND`=`BPL` and the ABM loop: `FASABM=2` runs the body 3 times (7 for centre `LDY I,6`). Expressed as `FASABM + 1` (trivial-exempt literals → no claim needed).
- **[RULE]** `icbm.ts` #24 stale "constant unit speed" header — RESOLVED (grep: zero remaining hits).
- **[SEC]/[EDGE]** #21 degenerate velocity — latent, unchanged, correctly deferred to mc4-4 (schedule proven to yield (0,1]; `launchIcbm` default 1).
- **[TYPE]** #1 double-cast in wave-claims.test.ts — RESOLVED.
- **[TEST]** new exact-value regression guards (wave-5 ≈ 0.615, ABM=3) verified mutation-sensitive (reinstating `1/period`-capped yields 1.0 at wave 5, which the pinned 0.61538 assertion catches) and non-test-local (#26) — the coverage gap that let round 1 slip is closed.
- **[SILENT]/[SIMPLE]** nothing.

**Data flow traced:** `waveSchedule(wave)` → `{count, velocity}` → (mc4-4 will feed velocity into `launchIcbm`); safe because velocity ∈ (0,1], count a bounded positive int, both pure/deterministic.
**Pattern observed:** faithful REV-01 table model with a byte-exact citation guard — sound and reusable for mc4-2/3/4.
**Error handling:** degenerate velocity is the one latent gap, deferred by design.

### Non-blocking findings (comment defects — #17; code/claims/tests all correct)
| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] [RULE] | The public `WaveParams.velocity` JSDoc still says "moves/frame = 1/period, ≤ 1" — the OLD formula, contradicting the corrected code (lines 26, 81). A consumer would derive 0.208 not 0.172. | `src/core/wave.ts:41` | Change to `1/(period+1)`. |
| [MEDIUM] [RULE] | Sibling comment "The period shrinks each wave, so 1/period ramps up" — same stale formula. | `src/core/wave.ts:55` | Reword to `1/(period+1)`. |
| [LOW] [DOC] | `INITIAL_WAVE` docstring cites `NEWWV1` for the wave-1 init, but `NEWWV1`'s `WAVENO=1` is `ATRACT`-gated (attract mode); the real game-start assignment is `NEGAM` (W3MAIN.MAC:3863). Value (wave 1) is correct. | `src/core/wave.ts:44` | Cite `NEGAM` / W3MAIN.MAC:3863. |

**Why non-blocking:** per the severity framework only Critical/High block (High = behavioral defects); these are stale/miscited comments beside verified-correct code, claims, and tests. Recorded as tracked follow-ups — recommend folding into **mc4-2** (which the epic scopes to touch `wave.ts`/`state.ts`) or a quick chore. They are the one class worth fixing promptly in a citation-graded dossier, but do not warrant a third full rework cycle.

### Rule Compliance (round 2)
- **#17:** the two round-1 code+comment violations RESOLVED; three NEW comment-only #17s found (wave.ts:41/44/55) — non-blocking (code correct). 
- **#24, #1:** RESOLVED. **#28:** COMPLIANT (FASABM+1 trivial-exempt; wave.ts literals all claim-backed). **#15/#18/#26:** the new guards are anchored, mutation-sensitive, non-test-local. **#21:** latent, deferred. **#27 purity:** compliant.

### Devil's Advocate
Could I be approving a still-broken curve? I re-derived it independently: `UPICBM` moves on the zero-frame (consumed), so 1/(period+1) is right, and the new test pins wave-5 at 0.615 — the exact value the round-1 model got wrong (1.0) — so a regression re-flattening the ramp now reddens. Could the ABM be wrong again? `COND65 MIEND=BPL` loops while ≥0; FASABM=2 → 3 iterations, pinned by `ABM_SPEED===3`. The one thing a hostile reader catches: the file literally disagrees with itself — line 26 says 1/(period+1), line 41 says 1/period. That's the strongest argument for a third round, and I weighed it: it is a documentation-consistency defect, not a behavior defect, and the severity framework reserves blocking for Critical/High behavioral issues. Shipping it costs a misleading JSDoc until the follow-up; re-bouncing costs a full cycle for three comment lines on a story whose behavior, claims, and tests are all verified correct. Proportionality (and my standing rule that a prose/comment cluster beside correct code is a follow-up) favors approve-with-tracked-fix. If the follow-up is not absorbed by mc4-2, it should be a one-commit chore — but it does not hold the gameplay fix hostage.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings — Reviewer Round 2

### Reviewer (code review, round 2)
- **Improvement** (non-blocking): three stale/miscited comments in `src/core/wave.ts` (lines 41, 55 restate the retired `1/period` formula; line 44 cites `NEWWV1` instead of `NEGAM` for wave-1 init). Code/claims/tests are correct; fix the comments to match. Recommend folding into mc4-2. *Found by Reviewer during code review (round 2).*

## Design Deviations — Reviewer Audit Round 2

### Reviewer (audit, round 2)
- The two round-1 FLAGGED Dev deviations are now RESOLVED: `velocity = 1/period capped` → corrected to `1/(period+1)` (verified against UPICBM); `ABM_SPEED=2` → corrected to `FASABM+1 = 3` (verified against COND65 MIEND=BPL). Re-verified at source; both accepted as fixed.
- No new spec deviations introduced by the rework. The three residual comment defects are logged as non-blocking Delivery Findings (round 2), not deviations.