---
story_id: "tp1-26"
jira_key: "tp1-26"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-26: The pulse and the potency zone are WAVE-PARAMETERISED in the ROM; we freeze both at their wave-1 value

## Story Details
- **ID:** tp1-26
- **Jira Key:** tp1-26
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Repos:** tempest
- **Branch:** fix/tp1-26-pulse-potency-wave-param

## Workflow Tracking
**Workflow:** tdd
**Phase:** approved
**Phase Started:** 2026-07-18T00:00:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T00:00:00Z | - | - |

## Acceptance Criteria

1. **PULTIM per-wave lookup:** PULTIM is read per wave from WPULTIM (4 / 6 / 8 at waves 1-48 / 49-64 / 65-99), cited. The wave-1 behaviour tp1-5 pinned (period 40, lit for 7, seeded at -1 by INEWLI) must NOT regress.

2. **PULPOT per-wave lookup & decoupling:** PULPOT is read per wave from WPULPOT ($A0 for 1-64, $C0 for 65-99), cited, and is given its OWN name — it must stop sharing an identifier with JPULMO's climb-speed threshold, which is a different ROM constant that merely happens to equal it below wave 65.

3. **Pulse period/duty test:** A test derives the pulse period and duty cycle OUT OF THE RUNNING SIM (never by re-deriving the arithmetic in the test — that is how the audit and its own refuter both got 9 instead of 7) at a wave in each PULTIM band, and asserts they differ across the bands.

4. **Kill gate band test:** A test pins the kill gate at a wave on each side of 65, so the $A0 -> $C0 step is real and not decorative.

5. **Citation gate stability:** npm test -- citations stays green.

6. **CRITICAL: Wave folding via CONTOUR:** Both WPULTIM (ALWELG.MAC:610-613) and WPULPOT (606-609) END AT WAVE 99, and s.level is NOT capped. A naive table walk returns end-of-table 0 at wave 100 — and 0 is catastrophic here: PULTIM is the counter's STEP so step 0 FREEZES THE PULSE FOREVER; PULPOT 0 puts the kill zone at depth 0. The ROM never reaches end-of-table because CONTOUR (ALWELG.MAC:415-423) folds it first: for CURWAV >= 98 it substitutes a RANDOM wave, `LDA RANDO2 / AND I,1F / ORA I,40` then INC, giving 65..96 — a band inside each table's last record, so the draw is UNOBSERVABLE and deterministic. Every table lookup MUST go through that fold.

7. **Extract contourWave helper:** Do NOT re-derive the fold per table. tp1-25 shipped it inline in wfuschForLevel (src/core/rules.ts) because it was the only bounded table then; this story makes it three. EXTRACT it once — a `contourWave(level)` helper carrying the ALWELG.MAC:415-423 citation — and route wfuschForLevel, WPULTIM and WPULPOT through it. The bug is in the SHAPE of the port, not any one table.

8. **Deep-wave lookups remain valid:** A test drives each of the three lookups at a wave ABOVE the last record (100, 150) and asserts the ROM's answer, not 0. wfuschForLevel's existing deep-wave tests (tests/core/tp1-25.fuseball-chase.test.ts) must still pass UNCHANGED after the extraction.

## Delivery Findings

No upstream findings from SM.

### TEA (test design)
- **Conflict** (non-blocking): The story's claim that PULPOT and "JPULMO's climb-speed threshold" are *two different ROM constants that only coincide below wave 65* is **refuted by the primary source**. `JPULMO` reads the SAME `PULPOT` byte at all three sites — climb-speed near/far switch (ALWELG.MAC:1783-1786), descend reverse (1795), and the kill (1804-1806) — and all three widen to $C0 at wave 65. They are one byte, coincident at *every* wave. Affects `src/core/rules.ts` (`PULSAR_NEAR_FAR_DEPTH` is read at three behavioural sites: `sim.ts:624` kill, `interpreter.ts:183` climb speed, `interpreter.ts:321` reverse). *Found by TEA during test design.* Resolution below (Design Deviations); the fix is still a name-split, just for a different stated reason.
- **Gap** (non-blocking): The story lists `PULSAR_NEAR_FAR_DEPTH`/`PULSE_STEP`/`sim.ts` pulse-step as the wrong-code sites but does not name the pulse **seed** site. PULTIM only reaches `s.pulse.tim` via `INEWLI → startLevel` (`src/core/sim.ts:567`, `s.pulse = { son: PULSE_SON_INIT, tim: PULSE_STEP }`) and the boot default (`state.ts:260`). That is the seam Dev must wave-parameterise; `stepPulseClock` (sim.ts:290-297) merely steps whatever tim was seeded. *Found by TEA during test design.*

### Dev (implementation)
- **Confirmation, no new finding:** `contourWave(level)` already existed at `src/core/rules.ts:563-565` (level >= 99 ? 99 : level) exactly as TEA's handoff described, so no extraction was needed — both new lookups route through the existing `contourValue(records, level)` generic (rules.ts:581-593, which itself calls `contourWave`), the same machinery `wfuschForLevel` already uses. AC-7 is satisfied by reuse, not extraction.

### Reviewer (code review)
- **Improvement** (non-blocking): The now-visible kill-vs-climb asymmetry at wave 65+ (kill gate = $C0 via `pulpotKillDepthForLevel`, climb/reverse frozen at $A0 via `PULSAR_NEAR_FAR_DEPTH`, `interpreter.ts:183`/`:321`) is a genuine ROM-fidelity gap: the ROM's single `PULPOT` byte widens all three readers at once, so the ROM at wave 65+ climbs a $A0..$C0-band pulsar at *pulsar* (slow) speed while our port climbs it at *flipper* (fast) speed. This gap is PRE-EXISTING (deferred since 6-15, `rules.ts:452-453` "intentionally not modelled") and unchanged by this story, but it is now half-closed and worth an explicit follow-up so the climb-tier $C0 is not lost. *Found by Reviewer during code review.*
- **Verified good** (non-blocking): The end-of-table `return 0` in `contourValue` (frozen pulse / degenerate kill zone) is unreachable — every `s.level` write site (`state.ts:247`=1, `sim.ts:671` clamped to `[1, MAX_SELECT_LEVEL]` or demo `1..8`, `sim.ts:825` `+= 1`) keeps `s.level` a positive integer; and were it ever to regress, the deep-wave liveness guard (`expectLivePulse` requiring `sawPulse`) would catch it, since `stepPulseClock` freezes the pulse when `tim=0`. *Found by Reviewer during code review.*

## Design Deviations

None at setup.

### TEA (test design)
- **PULPOT stays ONE wave-parameterised byte, used by kill + climb; only the KILL tier is fixed:** Story AC-2 says PULPOT is "a different ROM constant" from the climb threshold and asks to decouple them. The ROM (ALWELG.MAC:1783-1786 / 1795 / 1804-1806) shows they are the *same* `PULPOT`. So the tests pin ONLY the KILL gate's per-wave behaviour ($A0 waves 1-64 → $C0 waves 65-99) and do NOT demand the climb-speed boundary move. Reason: our port already DEFERS the climb-tier $C0 as accepted gold-plating (see `PULSAR_NEAR_FAR_DEPTH`'s comment, rules.ts). Faithful, in-scope fix: give the kill gate its own wave-parameterised PULPOT (routed through `contourWave`), leave the climb boundary frozen at $A0. This keeps the wave-1 pulsar-motion tests (tp1-5, tp1-6, sim.enemy-motion-fidelity) green — the name-split the story asked for, justified by the deferral rather than by a nonexistent second ROM constant.

## Technical Approach

**Key Challenge:** Both PULTIM and PULPOT are wave-parameterised in the ROM but hardcoded at wave-1 in the current port. The story requires reading both per-wave from their respective WTABLE lookups. Critical: waves beyond 99 fold through CONTOUR (ALWELG.MAC:415-423), not table-walk directly. The fold was extracted once in tp1-25's wfuschForLevel; this story must generalize it as a reusable `contourWave(level)` helper.

**Files to touch:**
- `src/core/rules.ts` — PULSE_STEP → read from WPULTIM per wave; PULSAR_NEAR_FAR_DEPTH → split to new PULPOT constant; extract contourWave() helper
- `src/core/sim.ts` — route pulse stepping through new wave-parameterised PULTIM
- `tests/core/tp1-26*.test.ts` — period/duty tests (each PULTIM band), kill-gate tests (around wave-65 step), deep-wave fold tests

**Reference:**
- ROM: ~/Projects/tempest-source-text (LF copy; NEVER CRLF sibling)
  - ALWELG.MAC:610-613 (WPULTIM)
  - ALWELG.MAC:606-609 (WPULPOT)
  - ALWELG.MAC:415-423 (CONTOUR fold)
- Current code: src/core/rules.ts (PULSE_STEP, PULSAR_NEAR_FAR_DEPTH, wfuschForLevel)
- Prior extraction: tests/core/tp1-25.fuseball-chase.test.ts (wfuschForLevel deep-wave tests)

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity behaviour change (two per-wave tables + the deep-wave fold).

**Test Files:**
- `tempest/tests/core/tp1-26.pulse-potency-wave.test.ts` — 9 tests (5 RED, 4 guard/control) pinning PULTIM per-wave period/duty, the PULPOT kill-zone widening at wave 65, and the CONTOUR deep-wave fold for all three lookups.

**Tests Written:** 9 tests covering ACs 1-8 (AC-5 is the citation gate, verified green).
**Status:** RED — 5 failing for the right reason, 4 passing (wave-1 non-regression guard, the two kill-gate controls, and the already-green wfuschForLevel fold anchor).

**ROM citations (byte-verified in ~/Projects/tempest-source-text/ALWELG.MAC):**
- WPULTIM 610-613: `T1,1,48.,4` / `T1,49.,64.,6` / `T1,65.,99.,8` (PULTIM step 4/6/8).
- WPULPOT 606-609: `T1,1,32.,0A0` / `T1,33.,64.,0A0` / `T1,65.,99.,0C0` (⇒ $A0 for 1-64, $C0 for 65-99).
- WTABLE 743-744: `.WORD WPULPOT,PULPOT` / `.WORD WPULTIM,PULTIM` — both are CONTOUR-walked, so the fold applies.
- CONTOUR fold 415-423: `LDA CURWAV / CMP I,98. / IFCS / LDA RANDO2 / AND I,1F / ORA I,40 / ENDIF / STA TEMP2 / INC TEMP2` (CURWAV≥98 → random 65..96).
- MOVINV pulse 1536-1570: `LDA PULSON / CLC / ADC PULTIM` + rails at 15 / -63 (unsigned).
- INEWLI seed 46-48: `LDA I,-1 / … / STA PULSON`.
- JPULMO kill 1802-1813: `LDA PULSON / IFPL / LDA INVAY / CMP PULPOT / IFCC / … ON CURSOR LINES? / JSR INPPSQ`.

**RED proof:** `npx vitest run tests/core/tp1-26.pulse-potency-wave.test.ts` → 5 failed / 4 passed. Failures: band 49-64 measures [40,7] not [28,5]; wave-49 period 40 not 28; pulsar at 0.28 does not kill at wave 65; wave-100 pulse period 40 not folded 20; pulsar at 0.28 does not kill at wave 100. All trace to the frozen wave-1 constants (PULSE_STEP=4, PULSAR_NEAR_FAR_DEPTH=$A0).

**Citation gate:** `npm test -- citations` → 25 passed (green). tsc --noEmit → clean.

**Commit:** `fa86288` on `fix/tp1-26-pulse-potency-wave-param` (tests only, no source touched).

**Handoff:** To Dev (green) — `.session/tp1-26-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/rules.ts` — Removed frozen `PULSE_STEP = 4` (old line 328). Added `WPULTIM`
  (T1 records: 1-48→4, 49-64→6, 65-99→8) and `pultimForLevel(level)` (new, ~line 615-625),
  and `WPULPOT` (T1 records: 1-64→$A0, 65-99→$C0) and `pulpotKillDepthForLevel(level)`
  (new, ~line 627-641) — both call the pre-existing `contourValue`/`contourWave` fold, no
  extraction needed. Updated the PULSE and `PULSAR_NEAR_FAR_DEPTH` comments to document the
  wave-parameterisation and the scope split.
- `src/core/sim.ts` — `startLevel` (line ~567) now seeds `s.pulse.tim` from
  `pultimForLevel(s.level)` instead of the frozen `PULSE_STEP`. The kill gate in
  `resolvePlayerHits` (line ~628) now reads `e.depth >= pulpotKillDepthForLevel(s.level)`
  instead of the frozen `PULSAR_NEAR_FAR_DEPTH`. Removed the now-unused `PULSAR_NEAR_FAR_DEPTH`
  and `PULSE_STEP` imports (noUnusedLocals is on).
- `src/core/state.ts` — boot default seeds `tim: pultimForLevel(1)` instead of `PULSE_STEP`.
- `src/core/enemies/interpreter.ts` — **untouched**, as required: `PULSAR_NEAR_FAR_DEPTH`
  still gates the climb-speed switch (line 183) and descend reverse (line 321), frozen at $A0.

**Fold decision:** `contourWave(level)` already existed (rules.ts:563-565); reused via
`contourValue`, not extracted. Both new lookups (`pultimForLevel`, `pulpotKillDepthForLevel`)
are plain `T1`-record tables through the same generic `contourValue` every other CONTOUR
table (TNYMMX, TINVIN, TCHAMX, …) already uses.

**Scope correction honored:** Only the kill gate (sim.ts) reads the new wave-parameterised
PULPOT. `PULSAR_NEAR_FAR_DEPTH` (=$A0) is untouched and still feeds `interpreter.ts:183`
(climb speed) and `:321` (descend reverse) — confirmed by re-reading both sites post-edit
(see grep in this session) and by the green tp1-5/tp1-6/sim.enemy-motion-fidelity suites.

**Tests:**
- `tp1-26.pulse-potency-wave.test.ts`: 9/9 passing (was 5 failed / 4 passed at RED).
- `tp1-25.fuseball-chase.test.ts` + all `tp1-5*`/`tp1-6*` + `sim.enemy-motion-fidelity.test.ts`:
  103/103 passing (no regression).
- Full suite (`npm test`): **1668/1668 passing**, 141 test files.
- `npm run build` (`tsc --noEmit && vite build`): clean.
- `npm test -- citations`: 25/25 passing.
- `node tools/audit/reanchor-citations.mjs`: 103 present, **0 lost**, 0 skipped.

**Branch:** `fix/tp1-26-pulse-potency-wave-param` (commit `3ff3439`, not pushed per instructions).

**Handoff:** To review phase.
