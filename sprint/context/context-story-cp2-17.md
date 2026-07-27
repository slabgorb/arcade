# Story cp2-17 Context: Death-frame stepping ruling

## Background

This is a ruling story on the multi-collider death frame. The three routed items below originated in the cp2-16 session archive (`sprint/archive/cp2-16-session.md`, Impact Summary lines 416-423) and define the scope of this ruling. The reference branch `fix/cp2-15-frame-order` (centipede origin, head `7babb64`) provides specification evidence and proof-of-green-under-both-regimes per that session's handoff note to TEA.

## Routed Items (Verbatim from cp2-16 Impact Summary)

### 1. TEA Conflict — death-frame stepping ruling
ROM BUGMV/ANTMV freezes (`:289-291`/`:50-56`) vs #35's every-stepper-runs replay stability (attract demo depends on draw cadence).

### 2. Reviewer Gap — multi-collider fixtures
Two mutation-proven Medium fixtures for the multi-collider frame:
- Cross-hazard `!playerHit` guards (sim.ts:436, :530) — removing both stays 905-green
- NCENT-1-descending tie-break (quarry evidence `:1284` + `:1450` recorded in the review)

### 3. Reviewer datum — pause-regime
The death PAUSE freezes a stamped 0xFE explosion (stepDeathFrame runs no EXPLOD); pause-regime belongs to the same ruling.

## The Ruling (Acceptance Criteria)

This story establishes the definitive frame-stepping order for death frames and resolves which regime (ROM freeze or every-stepper-runs) wins. The decision determines:

1. **Death-frame stepper gates:** whether BUGMV (:289-291) and ANTMV (:50-56) freeze spider/flea/SHOOT on the kill frame (ROM regime) or all steppers run every frame (every-stepper-runs regime per #35 and the attract-demo stability requirement). The ruling CHOOSES ONE and documents WHY in session notes.

2. **Multi-collider fixture coverage:** Add the two mutation-proven fixtures for the multi-collider frame to the suite:
   - A fixture staging a segment + spider both in contact with the gun on the same frame, asserting which one is stamped (the tie-break via `playerContactIndex`'s NCENT-1-descending walk per `:1284` + `:1450`)
   - A fixture staging the same cross-hazard scenario, asserting the `!playerHit` guards prevent double-stamping on a multi-hazard frame

3. **Pause-regime stepping:** Document and test whether the death PAUSE freezes all entity steppers (matching the ROM regime chosen) or preserves the every-frame-runs cadence; this regime must align with the ruling in (1).

4. **Frame order determinism:** Re-verify that seeded tests replay identically under the chosen regime; the attract demo (cp4-7) depends on deterministic playout under the rule.

5. **No silent regime:** the old cp2-16 deviation explicitly forbade silently keeping either side — the ruling surfaces the decision in session notes and accepts it with rationale.
