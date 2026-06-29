# Story 10-1 — Superzapper first-press correctness: spare tankers, clear in-flight enemy bolts

**Epic:** 10 · **Points:** 2 · **Priority:** p1 · **Type:** bug · **Repo:** tempest · **Workflow:** tdd

## Summary

Fix two critical bugs in Superzapper behavior:

1. **Tanker survival:** The first Superzapper press currently kills tankers (carriers). Authentic behavior spares them and clears all other enemies.
2. **Enemy bolt clearance:** In-flight enemy bolts (`s.enemyBullets`) survive the zap and can still kill the player. The first press should empty this array.

The second press (one-kill) and declaw mechanism (tanker cargo not released on zap kill) are already correct and must not regress.

## Technical Approach

**Current behavior (bug):**
- `stepZap()` at `sim.ts:455–460` kills all enemies including tankers
- `stepZap()` at `sim.ts:453–462` never clears `s.enemyBullets`
- In-flight bolts persist and threaten the player

**Desired behavior (authentic ROM):**
- First press: destroy all enemies *except* tankers; tankers remain alive on the board
- First press: clear *all* in-flight enemy bolts (empty `s.enemyBullets`)
- Second press: kill exactly one enemy (existing logic)
- Zap-kill never releases tanker cargo (existing `declaw` logic preserved)

**Implementation location:** `tempest/src/core/sim.ts` in the `stepZap` method.

**Key distinction:** This story models the *timing* of which enemies survive the first press.
The multi-frame *duration* and per-frame *cadence* of the window are handled separately in story 10-2.

## Acceptance Criteria

- [ ] First Superzapper press destroys all non-tanker enemies but leaves tankers alive
- [ ] First press clears all in-flight enemy bolts (`s.enemyBullets` emptied)
- [ ] Second press still kills exactly one enemy (no regression)
- [ ] Tanker cargo is never released by a zap kill (existing declaw preserved)
- [ ] Deterministic; covered in tests/core/sim.superzapper.test.ts

## Test Coverage

The `tests/core/sim.superzapper.test.ts` suite must cover:
1. Initial zap on a mixed board (tankers + flippers + pulsars + bullets in flight)
2. Assert tankers survive; other enemies die
3. Assert `s.enemyBullets` is emptied
4. Second zap on the same board kills exactly one remaining enemy
5. Verify declaw is still applied (tanker cargo not released)

## References

- **Spec:** `tempest/docs/tempest-1981-source-findings.md` § Superzapper
- **Book:** *Tempest vs Tempest: Notes on the Source Code of Two Video Games*, chapter "superzap"
- **Context:** `sprint/context/context-epic-10.md` § Superzapper (lines 86–96)
- **Code:** `tempest/src/core/sim.ts:444–475` (stepZap method)
