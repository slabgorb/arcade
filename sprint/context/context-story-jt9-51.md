# Story jt9-51: joust climb-prep: pin the 21-wake B2UP3/SHUP3 decision-interval LENGTH behaviourally

> ⚠ **REPURPOSED** (2026-08-07 user ruling)
>
> The filed premise — "pin the 21-wake period once the port models the interval as a held state" — is **REFUTED by design**. The joust port deliberately models climb-prep (B2UP3/SHUP3) as **STATELESS**: it re-checks the cliff mask EVERY wake and re-derives the hold, with NO armed 21-wake `PJOYT` countdown and NO stored `PDIST` line. This is a Reviewer-accepted deviation from jt9-23. Direct code evidence:
>   - Hunter, `plugins/joust/src/core/enemy.ts:784-785`: "Re-derived per wake, so a cleared cliff falls straight back to the climb; the port's per-wake line ≡ live line collapses the ROM's `PDIST+1 CMPB PPOSY+1` gate (as SHLEP does, :4279)."
>   - Shadow, `plugins/joust/src/core/enemy.ts:965`: "Stateless like the rest of the shadow's up-seek — re-checked each wake, so a cleared cliff resumes the climb."
>
> **Repurposed scope:** Add a behavioural test that pins the port's ACTUAL per-wake semantics for the climb-prep hold, mirroring `cadence-wiring.test.ts`'s observational style. Test both hunter and shadow; verify the hold re-derives EACH wake (not latched for 21 wakes) and re-engages when a cleared cliff re-appears.

## Story Type
Refactor (test infrastructure/port deviation pin)

## Points
2

## Background

The joust port's climb-prep logic (`b2undr` brain B2UP3 path for hunters; SHUP3 for shadows) gates the upward flap with a cliff-proximity hold: if a background cliff sits one YLEN (14px) or closer above the enemy, the enemy holds level rather than flapping higher.

The ROM models this as a **held state**: once climb-prep engages (via `PDIST+1 CMPB PPOSY+1` gate), a 21-wake `#20+1` countdown (`PJOYT`) runs in isolation from the cliff mask; if the countdown expires before the bird flies above the cliff, the hold releases. This design defers the cliff re-check for 21 wakes, so temporary cliff clearances (lasting <21 wakes) do not prematurely release the hold.

**The port's design differs intentionally (jt9-23 Reviewer-approved deviation).** The port re-checks the cliff mask EVERY wake: `stepEnemyDetailed` calls `steerWake()` for the hunter or shadow's up-seek sub-state (`climbUpSeek`), and `climbUpSeek`'s internal re-derivation of the hold gates on the LIVE cliff state, not a 21-wake armed timer. As a result:
- The hold engages when a cliff appears one YLEN above.
- If the cliff is cleared (background tileset loses the cliff block), the climb resumes on the NEXT wake (no 21-wake deferral).
- If a cliff re-appears, the hold re-engages that same wake.

**Provenance exists but is ROM-only.** The ROM's 21-wake `#20+1` timer and per-brain `PDIST` width are pinned as provenance in `climb-prep-source.test.ts` and `cadence-source.test.ts` (the FROZEN group). This story pins the port's per-wake OBSERVABLE behaviour, not ROM assembler text.

**Reachability note (for TEA).** This state is unreachable by natural play (uf1-9 measured 0 frames over 3 seeds / 6000 frames). The test must be driven DIRECTLY via a staged fixture. Read `plugins/joust/tests/climb-prep-wiring.test.ts` (esp. its header + the background-oracle helper) — the new pin most likely EXTENDS that file rather than adding a new one.

**Test-file count census.** If a brand-new `plugins/joust/tests/*.test.ts` file is added (rather than extending `climb-prep-wiring.test.ts`), the `audio-seam-scope` derived README file/claim counts redden — flag this in Design Deviations or the phase exit so it's bumped at RED time. Extending the existing wiring file avoids it.

## Acceptance Criteria

1. **Hunter holds level with a cliff one YLEN above.** Stage an airborne hunter on the up-seek path (b2undr brain) with a real BCK-table cliff positioned one YLEN (14px) above. Assert the enemy does not flap upward; posY remains constant over multiple wakes.

2. **Shadow holds level with a cliff one YLEN above.** Repeat AC-1 for an airborne shadow on the shadow's up-seek path (shup3). Assert posY holds constant.

3. **Cliff cleared mid-hold → climb resumes the NEXT wake (no 21-wake latch), for both hunter and shadow.** Stage the setup from AC-1/AC-2 (enemy holding at a cliff), then remove the cliff on wake k. Assert that at wake k+1, the enemy resumes the climb (flaps upward, posY decreases). Repeat for shadow.

4. **Re-appearance of cliff re-engages the hold immediately, both brains.** Stage the setup from AC-3 (cliff cleared, enemy climbing); re-add the cliff on wake m. Assert that at wake m the hold re-engages and posY holds level.

5. **Open air above (no cliff) permits unobstructed climb, both brains.** Negative control: stage an airborne enemy on the up-seek path with no cliff above. Assert the climb proceeds normally (flaps, posY decreases) over multiple wakes.

## Scope Notes

- The test extends `plugins/joust/tests/climb-prep-wiring.test.ts` or adds a new test file (flag the audio-seam-scope census redline if new).
- Fixtures must set up a real background tileset (BCK table) with a cliff block one YLEN above the bird; use the existing background-oracle helper in `climb-prep-wiring.test.ts`.
- Freeze velY below the -$0040 ("falling fast enough") gate and set velXIndex=0 so `steerWake` cannot turn the enemy; this keeps the test focused on the upward flap gate, not steering.
- AC-3 and AC-4 require toggling the cliff block on/off mid-test; verify the background tileset API supports live updates or stage the toggle as a fixture boundary (e.g., separate fixtures for "cliff cleared" and "cliff re-added" scenarios).

---

**Generated for:** jt9-51 climb-prep per-wake hold pinning (Reviewer-accepted per-wake deviation from jt9-23)  
**Acceptance Criteria** derived from repurposed scope (user ruling 2026-08-07): pin the per-wake re-derivation, NOT the 21-wake ROM latch.
