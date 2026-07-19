---
story_id: "bz4-1"
jira_key: "bz4-1"
epic: "bz4"
workflow: "tdd"
---
# Story bz4-1: BOUNCE completion — the 0xFF death/mutual-kill jolt (M-009 sibling) and the horizon-line bob (H-007 residual)

## Story Details
- **ID:** bz4-1
- **Jira Key:** bz4-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-19T15:41:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T15:41:06Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### RED phase (TEA) — bz4-1

**Test file touched:** `battlezone/tests/core/bounce.test.ts` (all core; +188/-9). Baseline 1025/70 → now 1031 tests, 7 RED / 1024 GREEN, 69/70 files green. `tsc --noEmit` clean. Commit `1b45c9b`.

**ROM citations verified byte-exact in `/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC`:**
- `:2337-2338` `LDA I,-1 / STA BOUNCE` — 0xFF, in the player-death/windshield-crack path; `:2335-2336` `LDA I,2 / STA CRACK` (windshield) precedes it; `:2339 DEC LIVES` follows (so it fires on EVERY life lost, incl. game-over).
- `:3363-3364` `LDA I,-1 / STA BOUNCE` — 0xFF, in `60$` (`:3358 LDA I,20 ;C BLOW'M BOTH UP` → COLFLG/COLFLG+2); `:3365 LDA I,1 ;C ONLY POINTS FOR ENEMY` follows (player banks the kill).
- `:1279-1282` `JSR VGVTR2 ;POSITION BEAM` (at the bounced `XCOMP+2`, `:1273-1275 SBC BOUNCE>>4`) → `LAH/LXL HORIZN / JSR VGJSRL ;ADD HORIZON LINE` — horizon line drawn from the SAME bounced origin as the ridge. `:1266-1270` four `LSR` + `BEQ 20$` = the shared BOUNCE>>4 floor-to-0 threshold.

**RED tests (7) — assertion / ROM pin / red-proof:**
1. `bz4-1 (AC-1a): a lethal hit SETS bounce to the FULL BYTE 0xFF (respawn path)` — enemy shell kills a mid-bounce tank (lives 3→2, respawn), `died.bounce === 0xFF`. Pins `:2337-2338`. RED: `expected 63 to be 255` (rewrite of the bz3-9 free-running test).
2. `player death by enemy shell fires the full-byte 0xFF, not the obstacle 0x3F` — respawn death, `bounce === 0xFF && !== 0x3F`. Pins `:2337-2338`. RED: `expected +0 to be 255`.
3. `game-over death ALSO fires 0xFF — BOUNCE written BEFORE DEC LIVES` — last life → `mode === 'gameover'`, `bounce === 0xFF`. Pins `:2337-2339`. RED: `expected +0 to be 255`.
4. `mutual player-enemy kill fires 0xFF and still scores the enemy` — player shell kills hostile + enemy shell kills player same step; events contain `enemy-destroyed` + `player-hit`, `score > 0`, `bounce === 0xFF`. Pins `:3358-3365`. RED: `expected +0 to be 255`.
5. `the register is NOT clamped to 0x3F ... settles 255→127→63→31→15→7→3→1→0` — death sets 0xFF, then the distinct-value decay walk equals the full 9-step sequence and settles at 0. Pins `:2337-2338` (set) + BOUND `:2132-2134` (decay). RED: `the death sets the full byte: expected +0 to be 255`.
6. `the horizon line rides the SAME bounced beam origin as the ridge` (AC-2, the coordinate-pin) — for bounce ∈ {16,32,63,255}, `skylineSegments(...)[0]` (full-width horizon line) has `y1 === y2 === panoramaToNdc(heading,0,heading,aspect,bounce)[1]`, which is `< 0` (down) and `≠ 0`. NOT a "was called" routing check — pins the exact shared offset so a mis-scaled/inverted/halved bob fails. Pins `:1279-1282`. RED: `expected +0 to be close to -0.005555…`.
7. `skylineSegments carries bounce into every mountain/moon point` (bz3-9 test, flipped) — `bobbed[0] !== flat[0]` (was `toEqual`). Pins `:1279-1282`. RED: `expected {y1:0…} to not deeply equal {y1:0…}`.

**Green guard (not RED, pins the shared threshold):** `below bounce 16 the horizon line does NOT bob` — for bounce ∈ {0,1,15}, `[0].y1 === [0].y2 === 0`; matches the ridge's `BOUNCE>>4 == 0` floor (`:1266-1270`). Guards against a naive "always shift horizon by f(bounce)" GREEN impl.

**Notes/risks for Dev (GREEN):**
- One core value, two triggers, one branch: both death paths reach `sim.ts`'s single `if (!demo && enemyStep.playerHit)` block. Set `bounce = 0xff` in BOTH returns (game-over AND respawn) — the ROM writes it BEFORE `DEC LIVES`. The mutual kill is just that same branch on a step where `scoreAward > 0`; no separate code path needed. Do NOT gate the write on `scoreAward`.
- The current `sim.ts:192` line computes `bounce` for the NON-death returns (obstacle 0x3F edge). The death jolt (0xFF) OVERRIDES that on the playerHit returns — currently they carry the pre-computed value forward; change those two `bounce,` fields to `0xff`.
- No clamp exists today; keep it that way. The register must hold 255 (test 5 walks 255→…→0). `state.ts`'s `bounce` JSDoc still says "0-63" — widen the doc to a full byte (0-255) and correct the stale "no ROM evidence BOUNCE resets on death" rationale (bz3-9 Reviewer's LOW finding; the death path SETS it).
- Horizon bob (AC-2): draw the `skylineSegments` horizon segment from the SAME bounced origin as the ridge — its endpoints' y must be the elevation-0 bob = `panoramaToNdc(anyInView, 0, heading, aspect, bounce)[1]`. Reuse `panoramaToNdc(_, 0, …, bounce)` for the endpoints (or set y to that offset) rather than inventing a fresh scale; the test pins the OUTPUT relationship, robust to either. Keep segment 0 the full-width horizon line (x ±1).
- `horizon.test.ts:287/299` (all-y≥0, horizon-at-0) call `skylineSegments` with default bounce=0 → stay GREEN (bob gated at ≥16). The bob deliberately draws below y=0 during a jolt; that's expected, not a regression.
- Camera Z-jolt at 255 needs no clamp: `255 < NEAR_CULL (1023)`, so no near-plane surprise (bz3-9 Reviewer confirmed the mechanism; only the magnitude grows).

### GREEN phase (Dev) — bz4-1

**Files changed (all core + one audit artifact):**
- `battlezone/src/core/sim.ts` — AC-1. In the single `if (!demo && enemyStep.playerHit)` block, computed `const deathBounce = 0xff` once and returned `bounce: deathBounce` from BOTH the game-over and the respawn return paths, overriding the obstacle-edge `0x3F`/`s.bounce` value that was carried forward. Not gated on `scoreAward`, so the mutual-kill branch (same block, on a step that also scored the enemy) writes `0xFF` too.
- `battlezone/src/core/horizon.ts` — AC-2. In `skylineSegments`, replaced the fixed `{ x1:-1, y1:0, x2:1, y2:0 }` horizon segment with one whose `y1 === y2 === panoramaToNdc(heading, 0, heading, aspect, bounce)![1]` — the elevation-0 bobbed NDC y off the SAME bounced beam origin as the ridge (reuses `panoramaToNdc`'s `BOUNCE>>4` scale, so line + ridge move in lockstep and both floor to y=0 below `BOUNCE>>4 == 0`). Kept it a level, full-width line (x = ±1).
- `battlezone/src/core/state.ts` — widened the `bounce` JSDoc from "0-63 (0x3F)" to the full byte 0-255 (0x00-0xFF), documented the two death writes (BZONE.MAC:2337-2339 / 3363-3364), corrected the stale bz3-9 "never reset on death" rationale (the death path DOES overwrite a decaying jolt), and noted it drives the horizon-line bob too.
- `battlezone/docs/audit/findings/pair-horizon.json` — marked finding **H-004** (`"Horizon line is a flat, full-width line at eye level in both"`) `"remediated_by": "bz4-1"`. The AC-2 edit changed the exact line H-004's `ours.verbatim` quotes, so the citation audit went RED; per `tools/audit/reanchor-citations.mjs`'s case-#2 rule (line changed on purpose, quote is gone — reanchor reports LOST, cannot fix), the sanctioned resolution is to freeze the citation as historical record via `remediated_by`. Consistent with bz3-9's H-007 remediation in the same file.

**AC-1 satisfied:** lethal hits set `bounce = 0xFF` on every life-lost path — respawn, game-over (written before `DEC LIVES`), and mutual player-enemy kill (still banking the enemy's points). No clamp: the register holds 255 and decays 255→127→…→0 via the existing `advanceRadar` `>> 1` game-frame loop.

**AC-2 satisfied:** the horizon LINE now rides the shared bounced beam origin — its endpoints' y equals a zero-elevation mountain point's bobbed y — and stays pinned at y=0 below the shared `BOUNCE>>4 == 0` threshold, in lockstep with the ridge.

**Build:** `npm run build` (tsc --noEmit + vite build) — clean.
**Full suite:** 1031/1031 passing, 70/70 files (the 7 bz4-1 REDs now green + zero regressions in the prior 1024). `reanchor-citations.mjs` dry-run: 115 correct, 0 lost.

**No deviations from TEA's GREEN notes.** TEA's implementation guidance matched the tests exactly; the only item not called out in the notes was the downstream citation-audit breakage (H-004), handled above with the audit rig's own sanctioned mechanism.

**Reviewer LOW-1 follow-up (comment-only):** widened the stale `bounce` JSDoc in `src/core/camera.ts:74-75` from "0-63" to "0-255" to match the canonical widened doc in `state.ts` (`tankView` now receives the full byte). No behavior change; build clean, 1031/1031 green. Commit `f8692b7`.

**For the Reviewer to scrutinise:** (1) the `remediated_by: "bz4-1"` on H-004 — confirm freezing (vs. re-pointing the quote) is right given the finding's claim text still describes the at-rest y=0 line; (2) that not gating the `0xFF` write on `scoreAward` is intended (mutual-kill parity, BZONE.MAC:3363-3365); (3) `horizonY` uses `panoramaToNdc(heading, 0, heading, ...)` — azimuth is heading purely to guarantee an in-view (non-null) return; y is azimuth-independent.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Flipped two shipped bz3-9 assertions from GREEN to RED (intentional, not new-only):** bz3-9 pinned the OLD scope where the horizon line stayed exempt and a respawn "carried the live bounce forward". bz4-1's ACs reverse both, so rather than leave contradictory GREEN tests I updated them in place: (1) `skylineSegments carries bounce…` now asserts `bobbed[0] !== flat[0]` (was `toEqual`); (2) the free-running test now asserts the death SETS `0xFF` (was `> 0`). Both changes are the bz4-1 spec, not a divergence from it — flagged so Dev knows the two RED flips are expected, not accidental breakage.

## Reviewer Assessment

**Verdict: APPROVED**

Adversarial review by Reviewer (Opus). Both ACs are genuinely met; ROM citations independently verified byte-exact against the primary source; tests are coordinate-pinning (not routing/vacuous); GREEN touched no test file. Two LOW, non-blocking notes only. No Critical/High/Medium.

**Data flow traced:** enemy shell → `stepBattle`'s single `if (!demo && enemyStep.playerHit)` block → both the game-over and respawn returns write `bounce: deathBounce (0xFF)` → carried in `GameState.bounce` → `advanceRadar`'s `>> 1` game-frame decay → consumed by `tankView` (Z-jolt) and `skylineSegments`/`panoramaToNdc` (backdrop bob) in `main.ts`. Safe end-to-end: `0xFF (255) < NEAR_CULL (1023)`, so the widened eye-forward push cannot flip an object behind the eye or hit a near-plane divide.

### ROM fidelity — HELD UP (verified against `/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC`, line numbers match citations exactly)
- **Death/windshield (`:2337-2339`):** `LDA I,-1 / STA BOUNCE / DEC LIVES` confirmed verbatim. `LDA I,-1` = 0xFF (255) is correct. Guarded by `:2333-2334 TYA / BNE 18$` ("IF NOT PLAYER") so it is the player-death path; written BEFORE `DEC LIVES` → fires on every life lost incl. game-over. Port sets `0xFF` in BOTH returns — matches.
- **Mutual kill (`:3358-3365`):** `60$: LDA I,20 ;BLOW'M BOTH UP … LDA I,-1 / STA BOUNCE / LDA I,1 ;ONLY POINTS FOR ENEMY` confirmed verbatim. Ungated on scoring is authentic — the ROM writes 0xFF then banks the enemy's points. Port's single block (not gated on `scoreAward`, `score` already includes `enemyStep.scoreAward`) matches. Dev flagged item #2: CORRECT.
- **Horizon line off bounced beam (`:1265-1282`):** `LDA BOUNCE / LSR×4 / BEQ 20$` (floor at `BOUNCE>>4==0`) then `SBC` the beam origin `XCOMP+2` DOWN, then `JSR VGVTR2 ;POSITION BEAM → LAH/LXL HORIZN / JSR VGJSRL ;ADD HORIZON LINE` — the horizon line IS drawn from the same bounced origin as the ridge. Port draws segment 0 at `panoramaToNdc(heading, 0, …, bounce)[1]` (the elevation-0 bob), reusing the ridge's exact `BOUNCE>>4` scale → lockstep, same floor. Matches. AC-2 genuinely met.
- **Decay (`:2132-2134`):** `BOUND: LDA BOUNCE / BEQ 20$ / LSR BOUNCE` = one logical shift right per game frame → `255→127→63→31→15→7→3→1→0`, exactly test 5's pinned sequence. Port `bounce >> 1` in `advanceRadar` matches; unclamped register holds 255. AC-1 (widen 0–63 → full byte, post-death reconciled) genuinely met.

### Test quality — GENUINE (verify gate PASSED)
- **GREEN (`5c0edd9`) touched NO test file** (confirmed via `git show --name-only`); RED (`1b45c9b`) touched only `tests/core/bounce.test.ts`. Clean TDD separation — Dev did not edit tests to pass.
- **AC-2 coordinate pin is real, not routing:** test 6 asserts `horizon.y1 === horizon.y2 === panoramaToNdc(heading,0,heading,aspect,bounce)[1]` across bounce ∈ {16,32,63,255}, plus independent cross-checks `sharedBobY < 0` (down), `|y| > 1e-6` (moved off baseline), `|x1|=|x2|=1` (still full-width & level). A mis-scaled/inverted/halved bob fails. Test 7 pins the absolute `y===0` floor for bounce ∈ {0,1,15} (`BOUNCE>>4==0`). Together they pin the exact coordinate across the threshold — no "function was called" check anywhere.
- **AC-1 pins are strong:** full-byte `0xFF && !== 0x3F` (respawn), game-over branch (`mode==='gameover' && 0xFF`, covering the second return), mutual-kill (`enemy-destroyed` + `player-hit` + `score>0` + `0xFF`), and the unclamped 9-step decay walk. Staging guards (`.toBe(2)`, `.toContain(...)`) make each test self-validating. `radarClock:0` + `dt=1/60 (0.0167s) < RADAR_FRAME_SECONDS (0.064s)` correctly prevents a decay tick on the observed step — sound, not a coincidence.

### The three points Dev flagged
1. **H-004 `remediated_by: "bz4-1"` freeze — CORRECT.** `reanchor-citations.mjs` dry-run: 115 correct, 0 lost (independently re-run). The AC-2 edit changed the exact line H-004's `ours.verbatim` quotes; per the tool's case-#2 rule and bz3-9's H-007 precedent (same file, same mechanism, `remediated_by: "bz3-9"` on a likewise-frozen stale verbatim), freezing preserves the audit trail rather than re-pointing/rewriting a historical match. Re-pointing would destroy the record of what the line said when the finding was filed. Blessed. See LOW-2 for the one caveat.
2. **Ungated 0xFF on mutual-kill — CORRECT** (see ROM `:3363-3365` above). Not gating on `scoreAward` is authentic; the score still banks via the pre-computed `score`.
3. **`horizonY`'s `!` non-null assertion — PROVABLY SAFE.** `panoramaToNdc(heading, 0, heading, …)` calls `offsetSteps(heading, heading)` → `turns=0, frac=0, steps=0`; `Math.abs(0) > HALF_VIEW_STEPS` is always false, so the function never returns null on this call. The `!` cannot throw.

### Findings (both LOW, non-blocking)
| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| LOW | Stale range in JSDoc: `bounce` documented as "0-63" but this story widened the register to 0-255, and `tankView` now receives the full byte (up to 255). `state.ts`'s canonical JSDoc WAS correctly widened; this secondary consumer's comment was missed. | `src/core/camera.ts:74-75` | Doc drift only — no behavioral effect. Recommend widening to "0-255" to match `state.ts`. |
| LOW | H-004's claim prose still asserts the clone "emits `{ x1:-1, y1:0, x2:1, y2:0 }` … a full-width line at NDC y=0" — true only at rest now. The `remediated_by` tag is the sole supersession signal; a reader not versed in the audit convention could take the frozen claim at face value. | `docs/audit/findings/pair-horizon.json` (H-004) | Consistent with the H-007 precedent — accepted. Flagged for the record; no change required. |

### Deviation audit
- **TEA — flipped two bz3-9 assertions GREEN→RED:** ACCEPTED. The ACs explicitly reverse bz3-9's scope (horizon-line exempt; respawn carries decaying value); updating in place is correct, not divergence.
- **Dev — H-004 `remediated_by` (only item beyond TEA's GREEN notes):** ACCEPTED. Verified via reanchor 0-lost + H-007 precedent (see point 1).

### Verification performed (independent)
- Full suite: **1031/1031, 70/70 files** green. `tests/core/bounce.test.ts`: 20/20.
- `tsc --noEmit`: clean. `reanchor-citations.mjs`: 115 correct, 0 lost.
- Core purity: no RNG / `Date.now` / `performance.now` / shell / DOM imports in `sim.ts`, `horizon.ts`, `state.ts`.
- All four ROM citations read directly from the primary source and confirmed verbatim.

**Handoff:** To SM for finish-story.
