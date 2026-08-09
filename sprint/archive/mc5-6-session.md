---
story_id: "mc5-6"
jira_key: "mc5-6"
epic: "mc5"
workflow: "tdd"
---
# Story mc5-6: ICBM on-screen ceiling — reconcile MXICON(7) vs NICBMS(8) count-1 convention

## Story Details
- **ID:** mc5-6
- **Branch:** feat/mc5-6-nicbms-ceiling  (from origin/develop @ a3d6edd8)
- **PR:** none
- **Workflow:** tdd

## Workflow Tracking
**Workflow:** tdd
**Phase:** red

## Origin
Reviewer F1 on mc5-5 (deferred, ROM-verified): the ICNORM/POTENT launch arithmetic uses a
count−1 storage convention, so the true on-screen ICBM ceiling is NICBMS(8), and MXICON(7)
is the count−1 operand — NOT a hard on-screen cap. mc5-5 kept MXICON to avoid regressing
mc3/mc4; this story does the reconciliation. It is a PREREQUISITE for mc5-2's in-play
bomber firing: the reserved 8th (NICBMS) slot is what the plane fires into.

## ROM GROUND TRUTH (REV-01, vendored reference/source/W3MAIN.MAC + W3COMN.MAC)
- `NICBMS = 8` (W3COMN.MAC:35, "MAX # OF ICBMS") — the ICBM TABLE SIZE. Every ICBM state
  array is `.BLKB NICBMS` (8 slots); `IBLOOP = NICBMS-1` (:43); `ICOPEN` scans idx 7..0.
  So the true max concurrent ICBMs = 8.
- `MXICON = 7` (W3COMN.MAC:193, "MAX # OF ICBMS ON SCREEN") — appears ONLY in the launch
  arithmetic (W3MAIN.MAC:2307, :2335, :2457); there is NO separate hard 7-cap.
- ICNORM (W3MAIN.MAC:2457-2510): `LDA I,MXICON` → subtract 2·CRMONS, ICBONS, plane(PLCPV
  via initial carry) → `TAX / INX` (lift MXICON+1 = 8 into count-space) → caps `CPX I,4`
  (MAX AT 4), `CPX ICBTOL`, `CPX POTENT` → `DEX` → `STX POTENT` where POTENT = "# −1 OF
  POTENTIAL LAUNCHES" (:2437). Net launch count = min(NICBMS − 2·cruise − icbm − plane, 4,
  ICBTOL, POTENT+1), floored 0. **The INX turns MXICON(7) into the NICBMS(8) headroom.**
- The plane term (PLCPV, "PLANE COUNTS AS A POTENTIAL BANG", :2313) reserves the 8th slot
  when a plane is active: headroom 8 − icbm − 1 = 7 − icbm ⇒ normal swarm caps at 7,
  leaving the 8th for the bomber (which fires it via SPUTFIR/POTENT priority — mc5-2).

## Technical scope (design)
1. **spawn.ts headroom: MXICON → NICBMS.** Change `spawn.ts:90`
   `const headroom = MXICON - 2*cruiseOnScreen - current.length - planeSlot`
   to use `NICBMS` (8). Result: no plane ⇒ swarm fills to 8; planeActive ⇒ caps at 7
   (reserves the 8th). `ICNORM_CAP`(4) and the LAUHGT gate unchanged. Update the honesty
   comment (the mc5-6 caveat block at spawn.ts:79-85 now becomes the resolution).
2. **game.ts MIRV open-slots (line ~194):** `MXICON - flownIcbms.length` → `NICBMS - …`.
   MIRVER (W3MAIN.MAC:2705) uses the same POTENT/ICOPEN(8-slot) loop, so MIRV children
   also fill up to the NICBMS ceiling. Enumerate mc5-1 MIRV test impact; update as ROM-ruled.
3. **Claim prose reconciliation (no value/citation changes):**
   - MC-MXICON (=7): add that it is the count−1 operand of the ICNORM launch arithmetic
     (the INX recovers the true ceiling), NOT a standalone on-screen hard cap.
   - MC-NICBMS (=8): its meaning is the ICBM TABLE SIZE = max concurrent on-screen (8),
     used here as the launch headroom ceiling. (It is ALSO the mc3 initial per-wave budget
     at game.ts:110 — a separate use; keep both, note the dual role.)
   - Keep values/citations/verbatims byte-identical; byte-checker must stay exit 0.
4. **Test reconciliation (blast radius — TEA enumerate exactly):**
   - mc3 `spawn.test.ts`: the "never exceeds MXICON on screen" describe + the empty/cleared
     fill assertions (mc5-5 set them to the ICNORM_CAP=4 per-cycle cap — those STAY 4; the
     cap is per-cycle, not the ceiling). The CEILING assertions (max concurrent) move 7→8.
   - mc4 playthrough tests: `<= MXICON` on-screen bounds → `<= NICBMS`.
   - `spawn-clamp.test.ts` (mc5-5): the plane-reservation + cruise tests shift by the
     ceiling change (control 7→8, planeActive→7, cruise steps). Update expected values.
   - game.test.ts mc3-4 first-salvo stays 4 (per-cycle cap unchanged).

## Gates
purity, citations byte-checker (exit 0), `npx vitest run --project missile-command` green,
`npm run lint`. Do NOT change ICNORM_CAP(4) or the LAUHGT gate. This story does NOT touch
sputnik.ts (that is mc5-2).

## TEA Assessment

**Tests Required:** Yes
**Reason:** behavioral change (concurrent ICBM ceiling 7→8) with a wide assertion blast radius.

**Test Files:**
- `plugins/missile-command/tests/spawn-clamp.test.ts` — new `mc5-6` describe (4 tests: per-cycle-cap preservation, 7-swarm headroom→8, multi-cycle saturation to 8 + full-table hold, plane reserves the 8th at the ceiling); mc5-5 cruise/plane expected values recomputed on the NICBMS(8) basis; header + loader message now state the INX/count-space arithmetic.
- `plugins/missile-command/tests/spawn.test.ts` — mc3-1 AC4 ceiling describe re-based to NICBMS (bound assertion + comments + loader message); per-cycle 4 and cleared-refill 1+4=5 pins unchanged.
- `plugins/missile-command/tests/game.test.ts` — long-run on-screen bound MXICON→NICBMS; mc3-4 first-salvo stays 4 (confirmed, untouched). MXICON import dropped (unused).
- `plugins/missile-command/tests/mc3-playthrough.test.ts` / `mc4-playthrough.test.ts` — `<= MXICON` on-screen bounds → `<= NICBMS`; imports adjusted.
- `plugins/missile-command/tests/mirv-integration.test.ts` — MIRV truncation moves to the 8-slot ceiling: six band ICBMs ⇒ openSlots 8−6=2 ⇒ roster lands on NICBMS(8) (RED); one-per-frame and suppression tests unchanged (values re-derived, identical).
- `plugins/missile-command/tests/sound-events.test.ts` — one stale comment ("pins MXICON" → "pins the ICNORM cycle of 4").

**Tests Written:** 4 new + 4 re-based (values), 7 files touched, covering all four RED deliverable bullets.
**Status:** RED — 5 tests fail (4 in spawn-clamp.test.ts, 1 in mirv-integration.test.ts), every failure `expected 8, received 7` (or its total-count equivalent) against the shipped MXICON(7) basis. Suite otherwise 896 passed; `npm run lint` green (no signature change — the loader casts already carry `NICBMS`).

**MXICON grep decisions (test files):** spawn-clamp/spawn/game/mc3-playthrough/mc4-playthrough/mirv-integration ceiling occurrences changed to NICBMS (above); LEFT unchanged: `dossier-docs.test.ts` (symbol/line pins, constants untouched), `spawn-claims.test.ts` (MC-MXICON value 7 @ W3COMN.MAC:193 — claim VALUE stays; prose reconciliation is Dev's, in claims config), `wave-claims.test.ts:14` + `wave.test.ts:37` (comments about the NICBMS budget, still true), loader export-presence checks (`typeof mod.MXICON` — export stays).

**Handoff:** To Dev for implementation (`.session/mc5-6-handoff-red.md`).

## SM Assessment
mc5-6 (3pt, refactor, tdd). The foundational count−1 reconciliation; unblocks mc5-2's
robust bomber firing (the reserved 8th slot). Branched from develop. Handoff: TEA (RED)
pinning the NICBMS(8) ceiling + enumerating/upating the mc3/mc4/mc5-5 ceiling assertions,
then Dev (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/spawn.ts` - headroom ceiling `MXICON` → `NICBMS` (spawn.ts:90); mc5-5 honesty-caveat comment block rewritten as the RESOLUTION (INX at W3MAIN.MAC:2473 lifts MXICON+1=8 into count-space; MXICON(7) is the count−1 operand, not a hard cap). ICNORM_CAP(4), the min/floor shape, and the LAUHGT gate untouched.
- `plugins/missile-command/src/core/game.ts` - MIRV open-slots `MXICON` → `NICBMS` (game.ts:194); adjacent MIRV comment now cites the NICBMS(8) ceiling (W3COMN.MAC:35, MIRVER's shared 8-slot POTENT/ICOPEN loop W3MAIN.MAC:2705); unused `MXICON` dropped from the spawn.js import (game.ts:35) and from the header comment's example list. game.ts:110 still uses NICBMS as the mc3 per-wave budget — intended dual role, untouched.
- `plugins/missile-command/docs/rom-study/claims/config.json` - MC-MXICON and MC-NICBMS `meaning` prose reconciled (count−1 operand / table-size ceiling + dual role); all values, source files/lines, and verbatims byte-identical.

**Tests:** 901/901 passing (GREEN; was 896 passed / 5 failed at RED). `npm run lint` clean. Citations byte-checker: exit 0, 189 claims. No test files modified.
**Branch:** feat/mc5-6-nicbms-ceiling (pushed, commit 498e3467)

**Handoff:** To review (`.session/mc5-6-handoff-implement.md`)

**Rework (review APPROVED, 2 non-blocking MEDIUM prose findings, commit 239972dc):**
- `spawn.ts:11-15` constants-index header re-worded to the count−1 reading (NICBMS = table size / headroom ceiling; MXICON = count−1 operand, NOT a hard cap) — retires the header/body contradiction.
- MC-NICBMS meaning tail softened: no longer blesses the wave-1 budget reuse as a "dual role"; now flags game.ts:110's `remaining: NICBMS` as a known pre-mc4 approximation (ROM wave-1 = ICBWAV[0]=12, W3MAIN.MAC:5713), tracked in follow-up mc5-7. Values/citations byte-identical.
- Re-verified: 901/901 passed, lint clean, byte-checker exit 0 (189 claims).
