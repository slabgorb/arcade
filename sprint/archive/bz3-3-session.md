---
story_id: "bz3-3"
jira_key: "bz3-3"
epic: "bz3"
workflow: "trivial"
---
# Story bz3-3: SPAWN PROBABILITY & ROSTER — missile odds are a 50/50 coin, and the super tank arrives one missile late

## Story Details
- **ID:** bz3-3
- **Jira Key:** bz3-3
- **Workflow:** trivial
- **Stack Parent:** none
- **Type:** bug
- **Points:** 1
- **Priority:** p2

## Workflow Tracking
**Workflow:** trivial
**Phase:** setup
**Phase Started:** 2026-07-18T01:59:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T01:59:44Z | - | - |

## Story Context

**Cluster:** C3. Subsumes audit findings R-008 and E-010.

**Description:** Two small, independent fixes:

1. **R-008 (Missile Spawn Chance):** The missile-vs-tank spawn is a fair 50/50 coin flip in the ROM (LSR / BCC at BZONE.MAC:3737-3741), but the clone uses a provisional MISSILE_SPAWN_CHANCE=0.4 (enemies.ts:297) self-flagged 'undecoded'. Correct to 0.5 and replace the 'undecoded' comment with the ROM decode citation.

2. **E-010 (Super Tank Roster):** The super ('high-powered') tank appears one missile early in the clone. NOR2D3 is '#missiles - 1' (LDA I,-1 init at BZONE.MAC:1175, 'SET TO 0 FOR FIRST' at :3773), so the ROM's CMP I,5 means the 6th missile. The clone's from-0 `missilesLaunched >= 5` fires on the 5th — a clean +1 off-by-one. Fix so the super tank appears on the 6th missile.

**Acceptance Criteria:**
- MISSILE_SPAWN_CHANCE is corrected 0.4 -> 0.5 (fair coin, BZONE.MAC:3737-3741), and its 'undecoded' comment is replaced with the decode.
- Super-tank gating is fixed by one: it appears on the 6th missile (NOR2D3 = missiles - 1, CMP I,5), not the 5th.

## Primary Source References
- **Citable Source:** ~/Projects/battlezone-source-text (CRLF sibling ~/Projects/battlezone-source is NOT citable)
- **ROM Citations:**
  - BZONE.MAC:3737-3741 (missile spawn 50/50 coin, LSR / BCC)
  - BZONE.MAC:1175 (NOR2D3 init, LDA I,-1)
  - BZONE.MAC:3773 (SET TO 0 FOR FIRST comment)
  - BZONE.MAC:5 (CMP I,5 for 6th missile)
- **Audit Findings:** battlezone/docs/audit/findings/pair-missile-saucer.json (R-008), battlezone/docs/audit/findings/pair-enemy-ai.json (E-010)

## Implementation Notes
- Both fixes are small constants + comment updates; no structural changes
- Citation gate (`npm test -- citations`) must pass when complete
- bz3-1 (timebase), bz3-2 (enemy AI), and bz3-7 (radar) are dependencies that are already DONE and merged on origin/develop

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Verified citations** (all confirmed byte-exact against `~/Projects/battlezone-source-text/BZONE.MAC` before pinning):
  - R-008: `LDY PRAND / TYA / EOR OLDRND / STY OLDRND / LSR / BCC TANKCK` at BZONE.MAC:3733-3738 (coin flip), fall-through to `LDA I,2 / STA TIMOUT / BNE R2D3CK` at :3739-3741 (missile branch).
  - E-010: `TR7CHK: CLC / LDA NOR2D3 / BMI 10$ / CMP I,5` at BZONE.MAC:3704-3707; NOR2D3 init `LDA I,-1 / STA NOR2D3` at :1175-1176; `R2D3CK: INC NOR2D3 ;C THIS WILL SET NOR2D3 TO 0 FOR FIRST` at :3773.
- **Existing test re-baseline (not just new tests):** `tests/core/enemies-roster.test.ts`'s bz1-8-era assertions hard-coded the old (buggy) `SUPER_TANK_AFTER_MISSILES = 5` boundary (direct value check + two boundary-sweep tests + a "deep in the game" test seeded at `launched = 5`). These were updated to the corrected boundary of 6, since they'd otherwise re-lock in the off-by-one E-010 just fixed. Reviewer: please confirm the updated boundary tests (`[0,1,4,5]` stay tank, `[6,7,20]` become super-tank, explicit 5th-vs-6th test) actually exercise `chooseKind`/`respawn` and not just the constant.
- **MISSILE_SPAWN_CHANCE was promoted from a private `const` to `export const`** (previously undecoded/private; now ROM-EXACT, matching the existing precedent of `SUPER_TANK_AFTER_MISSILES`/`MISSILE_CLOSE_RANGE` — decoded ROM-exact constants are exported and directly asserted, provisional tuning constants like `CHARGE_CHANCE`/`FIRE_CONE` stay private and are tested only behaviorally). Judgment call, not requested explicitly — flagging in case the Reviewer prefers it stay private with only the statistical test.
- **Citation re-anchoring:** the two doc-comment rewrites shifted line numbers for 11 *other* findings' `ours` citations across 4 findings files (R-006/007/009/010/011 in pair-missile-saucer.json; C-007 in pair-cadence.json; F-005 in pair-combat.json; E-001/003/005/012 in pair-enemy-ai.json) — all re-pointed to their new (unchanged-content) lines. `remediated_by: bz3-3` set on R-008 and E-010 only, per instructions; their `ours` citations were left untouched as historical record (per `check-citations.mjs`, a `remediated_by` finding's `ours` is no longer checked against the working tree).
- **JSON re-serialization gotcha:** `pair-cadence.json` is indented 2-space, the other three findings files are 4-space; a naive `json.dump` at a single indent width, and Python's default `ensure_ascii=True`, would have reformatted whole files and escaped every em-dash/degree-sign to `\uXXXX`. Redone with per-file indent width and `ensure_ascii=False` — final diffs are single-line `ours.line` bumps only. Worth a memory note for future re-anchor work in this repo.

## Design Deviations

None yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **MISSILE_SPAWN_CHANCE exported:** spec/AC only asked for the value fix (0.4 -> 0.5); exporting it (previously module-private) was needed to test-pin the exact value per the story's explicit ask ("assert MISSILE_SPAWN_CHANCE === 0.5"). Reason: matches the codebase's own precedent that decoded ROM-EXACT constants get exported + directly asserted.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/enemies.ts` — R-008: `MISSILE_SPAWN_CHANCE` 0.4 -> 0.5 (exported), 'undecoded' comment replaced with the BZONE.MAC:3733-3741 decode. E-010: `SUPER_TANK_AFTER_MISSILES` 5 -> 6, comment replaced with the TR7CHK/NOR2D3 decode (BZONE.MAC:3704-3707, :1175, :3773).
- `tests/core/enemies-roster.test.ts` — re-baselined the bz1-8 boundary tests to the corrected threshold (6, not 5); added a direct-value assertion for `MISSILE_SPAWN_CHANCE`, a 2000-draw statistical fairness test (~50%) driving the real spawn decision, and a dedicated 5th-vs-6th-missile roster test driving `chooseKind`/`respawn` directly.
- `docs/audit/findings/pair-missile-saucer.json` — `remediated_by: bz3-3` on R-008; re-anchored `ours.line` for R-006/007/009/010/011 (content unchanged, lines shifted).
- `docs/audit/findings/pair-enemy-ai.json` — `remediated_by: bz3-3` on E-010; re-anchored `ours.line` for E-001/003/005/012.
- `docs/audit/findings/pair-cadence.json` — re-anchored `ours.line` for C-007.
- `docs/audit/findings/pair-combat.json` — re-anchored `ours.line` for F-005.

**Tests:** 860/860 passing (GREEN). Citation gate (`npm test -- citations`): 12/12. `tsc --noEmit` / `npm run lint`: clean. `npm run build`: clean.
**Branch:** feat/bz3-3-spawn-probability-roster (pushed, commit `b948a9f`)

**Handoff:** To review phase

## Reviewer Assessment

**Verdict:** APPROVED
**Reviewer:** Thought Police (trivial workflow, review phase)
**Reviewed:** commit `b948a9f` diffed against `origin/develop` (fetched); clean working tree; 6 files, exactly as claimed.

### Independent verification (ran myself, my own output)
- `npx vitest run` → **860/860 passing** (62 files).
- `npm test -- citations` → **12/12 passing**.
- `npx tsc --noEmit` → exit 0 (clean).

### ROM-value conclusions (verified against the citable `~/Projects/battlezone-source-text/BZONE.MAC`, not the handoff)
1. **R-008 — missile spawn is a fair 1-bit coin → 0.5 is right.** BZONE.MAC:3733-3738: `LDY PRAND / TYA / EOR OLDRND / STY OLDRND / LSR / BCC TANKCK`. The EOR OLDRND only *decorrelates* consecutive POKEY draws (fudge); it does not bias bit 0. `LSR` puts bit 0 into carry; `BCC TANKCK` sends carry-clear (bit0=0) to the tank branch, carry-set (bit0=1) falls through to R2D3CK (the missile spawn). Marginal P(bit0=1)=0.5 for a uniform byte → **50/50, not 0.4, not any other split.** The score/DIP gate (:3730-3732 `LDA HITS / CMP AX,MISLVL / BCC TANKCK`) is the separate `MISSILE_INTRO_THRESHOLD`, correctly modeled apart from the coin.
2. **E-010 — NOR2D3 = missiles−1, so `CMP I,5` first fires on the 6th missile → 6 is right; sign confirmed.** BZONE.MAC:1175 `LDA I,-1 / STA NOR2D3` (starts at −1/$FF). :3773 `R2D3CK: INC NOR2D3 ;C THIS WILL SET NOR2D3 TO 0 FOR FIRST` (incremented per missile spawn) ⇒ NOR2D3 = missilesLaunched − 1. TR7CHK (:3704-3708): `CLC / LDA NOR2D3 / BMI 10$ / CMP I,5` — carry set (=TR7/super, per the routine's `OUTPUT: CARRY SET=TR7`) iff unsigned NOR2D3 ≥ 5 (the BMI catches the $FF sentinel as regular tank). NOR2D3 ≥ 5 ⇔ missilesLaunched ≥ 6. The clone's 0-based `missilesLaunched >= SUPER_TANK_AFTER_MISSILES` with the constant bumped 5→6 lands the same event. **Direction is correct:** old `>= 5` fired one *early* (5th missile); fix delays it by one to the 6th. Not 5, not 7.

### Re-baseline assessment (the three stale bz1-8 pins)
All three pre-existing assertions genuinely hard-coded the OLD buggy threshold of 5 as correct behavior; re-baselining is mandatory, and none are neutered:
- Direct constant pin `SUPER_TANK_AFTER_MISSILES).toBe(5)` → `.toBe(6)` — still a direct value pin, now the correct one.
- Below-threshold boundary sweep `[0,1,4]` → `[0,1,4,5]` — *adds* 5, which under the old code would have been super-tank; strengthens the guard.
- After-threshold sweep `[5,6,20]` → `[6,7,20]` — 5 correctly moves to the tank side; low boundary (6) preserved.
- "Deep in the game" test seeded `launched=5` → `6` — mandatory: at 5 the new correct code yields a tank, so the "no slow tanks" assertion would have false-failed if left at 5.
Plus a new dedicated 5th-vs-6th test (`respawn(...,5,0)`→'tank', `respawn(...,6,0)`→'super-tank', 16 seeds) that crisply pins the corrected boundary. All roster tests drive the real path: `respawn` → `stepEnemies` → `chooseKind` (enemies.ts:551), not the constant. The 2000-draw fairness test drives the actual spawn decision and its band (0.45–0.55, ~4.5σ from both 0.5 and the old 0.4) genuinely discriminates the fix from a regression without flaking.

### Citation honesty
- `remediated_by: bz3-3` sits ONLY on R-008 (pair-missile-saucer.json) and E-010 (pair-enemy-ai.json). No phantom fixes — the other bz3-* stamps in those files are pre-existing bz3-1/bz3-2. pair-cadence/pair-combat got no new remediation stamp, only line bumps.
- R-008/E-010 own `ours` verbatims left as historical record (gate stops checking a remediated finding's `ours`) — correct per project convention.
- All 11 re-anchors are line-only; spot-checked surviving verbatims resolve byte-exact at their new lines (E-005 FLANK_ARC→237, C-007→392, F-005→564, all match); citation gate 12/12 confirms every checked finding. The 2-space/4-space JSON indent and `ensure_ascii=False` handling produced single-line `ours.line` diffs only — no content churn.

### Minor (item 4 — export of MISSILE_SPAWN_CHANCE)
Acceptable, not an invariant leak. It's a read-only `const number`; exporting it follows the codebase's own precedent (decoded ROM-EXACT constants — `SUPER_TANK_AFTER_MISSILES`, `MISSILE_CLOSE_RANGE` — are exported and directly asserted; provisional tuning constants stay private). No mutable state exposed, no purity impact.

### Data flow traced
Spawn RNG → `stepEnemies` → `chooseKind(rng, missilesLaunched, score)` (enemies.ts:409): missile iff `score >= MISSILE_INTRO_THRESHOLD && nextFloat(rng) < 0.5`; else `missilesLaunched >= 6 ? 'super-tank' : 'tank'`. Both branches match the ROM routines above. No error-handling/security/null surface in this diff (pure numeric core constants + JSON line bumps).

**Findings:** 0 Critical, 0 High, 0 Medium, 0 Low (1 flagged judgment call — export — reviewed and accepted).

**Handoff:** To SM for finish-story.
