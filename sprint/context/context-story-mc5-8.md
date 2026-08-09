# Context: Story mc5-8

## Background

**Measured Current State (SM verified 2026-08-09):**

- `plugins/missile-command/src/core/sputnik.ts` already exists (mc5-2 GREEN). It models `fireTimer` as a PER-TICK FRAME COUNTDOWN: `stepSputnik(s, speed)` does `fireTimer: s.fireTimer - 1`; `readyToFire(s)` is `fireTimer <= 0`; `reload(s, wave)` re-arms to `sputnikFireCadence(wave)` (the WSPFIR table). There is **NO horizontal-distance accumulator**.

- `plugins/missile-command/src/core/game.ts:238` sets `const SPUTNIK_SPEED = 1 // cabinet units/tick — functional cross speed (mc9 pins the ROM velocity)`. Planes step at speed 1. game.ts:234-237 documents that at speed=1 a per-tick decrement HAPPENS to equal distance travelled — an accidental equivalence mc5-8 must make explicit/real.

- **game.ts currently lets the plane fire AND the normal ICBM swarm launch in the same cycle**, merely sharing the NICBMS(8) on-screen ceiling via the salvo-headroom coupling (sputnikFireCount). The ROM's TRUE either/or (JMP SPUTFIR REPLACES the ICNORM swarm launch that cycle, W3MAIN.MAC:2543) is **NOT implemented**.

- The **±48 in-bounds fire gate** (PLCPH within +/-48 of the field edges, W3MAIN.MAC:2529-2537) does **NOT exist** anywhere in src/ or tests/.

- The tokens HORFIR / SPUTDS / PLCPH appear only in COMMENTS today, never as code — confirmed by grep across plugins/missile-command/src/.

**Deferred Scope Note:** This story was deferred from mc5-2 review F3 due to complexity. It couples functionally to mc9 (authentic plane velocity), but the velocity constant remains 1 for now — the deliverables here are the **motion MODEL** (distance-based firing), not the velocity value.

## Acceptance Criteria

### AC-1: EITHER/OR Fire Arbitration
The plane firing (SPUTFIR path) must **replace**, not augment, the normal swarm launch (ICNORM) within a single launch cycle. 

**Measurement:**
- When the sputnik is ready to fire and conditions permit (see AC-2), the sputnik fires an ICBM.
- In that same cycle, the normal swarm launch (ICNORM) does not happen.
- The salvo headroom (NICBMS count ceiling = 8) is still respected — both sputnik and swarm are capped together, but never both in the same tick.
- **ROM Citation:** W3MAIN.MAC:2543 — `JMP SPUTFIR` replaces the ICNORM swarm launch path.

### AC-2: Horizontal Position In-Bounds Gate
The plane only fires when its horizontal position (PLCPH) is within ±48 of the **field edges**.

> ⚠ **SM CORRECTION (2026-08-09) — the exact firing-zone numbers below were FABRICATED by setup; DERIVE them from the ROM, do not trust or copy them.**
> The original draft asserted "Field width is 256 pixels (0–255)" and "Firing zone is [0, 48] ∪ [207, 255]". Both are wrong: this clone's horizontal max is **`HMAX = 247`** (`plugins/missile-command/src/core/cursor.ts:41`, from ROM `IHMAX = 247.`, `cursor.ts:19`), not 255/256. The SM has **not** read W3MAIN.MAC:2529–2537 and will not invent a replacement zone.
> **TEA/Architect: derive the exact gate from the ROM at W3MAIN.MAC:2529–2537.** Establish (a) PLCPH's coordinate frame and range (is it the same 0..HMAX frame the clone's Sputnik uses, or a different ROM plane-coordinate?), (b) the two edge reference values, and (c) whether the ±48 is a magnitude compare (`|PLCPH − edge| ≤ 48`) or a pair of `CMP` bounds. Back the ±48 margin (and any derived edge constant) with a `claims/sputnik.json` entry cited to the ROM line, per `citations.test.ts`.

**Intent (behaviour to pin, once the numbers are ROM-derived):**
- The plane fires only when within ±48 of an edge; in the interior it does NOT fire even when the distance timer (AC-3) is ready.
- Being out of the gate must not consume/reset the fire opportunity in a way that diverges from the ROM — confirm the ROM's exact behaviour (skip vs. defer) at :2529–2537.
- **ROM Citation:** W3MAIN.MAC:2529–2537 — PLCPH boundary gate + in-bounds check.

### AC-3: Distance-Based Fire Timer (Velocity-Agnostic)
Replace the frame-countdown fire timer with a **horizontal-distance accumulator** (HORFIR) compared against a velocity-agnostic fire interval (SPUTDS).

**Measurement:**
- The sputnik's fire timer is now tracked as accumulated **horizontal distance**, not frame count.
- Each tick, HORFIR increments by the plane's **velocity** (not a fixed 1).
- When HORFIR >= SPUTDS, the plane is ready to fire; reload sets HORFIR back to 0.
- When velocity later changes (in mc9), SPUTDS remains constant and the fire cadence automatically adjusts — no hardcoded frame count survives.
- Fire interval in frames at speed=1 must match the ROM's WSPFIR/WSPLAU table (so the game plays identically with the current speed=1, but the timing is now **truly velocity-agnostic**).
- **ROM Citation:** W3MAIN.MAC:2523–2527 — HORFIR vs SPUTDS distance-based fire control.

## Scope Ruling (Binding — ROM-Derived)

**Authentic Plane Velocity is OUT OF SCOPE for mc5-8 and stays deferred to mc9.**

- `SPUTNIK_SPEED` in game.ts:238 **remains 1** (functional).
- The title phrase "+ authentic motion" refers to the **DISTANCE-COUPLED FIRING model** (AC-3), NOT to velocity changes.
- No `mc9` epic/story exists yet (`pf sprint story show mc9` = not found); velocity is unhomed future work.
- MC5-8's velocity-agnostic firing formula is exactly what makes whatever velocity lands in mc9 correct **without further changes to sputnik.ts**.

**Implication for Review:** A Reviewer must NOT interpret "+ authentic motion" as a demand to raise SPUTNIK_SPEED. The firing model is what becomes authentic here; the speed pin remains deferred.

## Fidelity Guardrails (Project Rules)

1. **Pure Core:** `src/core/` is deterministic — no clock, no ambient RNG, no shell import. `tests/purity.test.ts` scans `sputnik.ts`. Maintain the seeded-RNG idiom for any randomness.

2. **Citation Gates:** Every new or changed non-trivial numeric literal in `src/core` must:
   - Carry a citation in a `//` comment (not `/** */`), per AC-3 literal scanner (see sputnik.ts header).
   - Be backed by a claim entry in `claims/sputnik.json` if applicable.
   - Pass `citations.test.ts` gate.

3. **New Constants Required:**
   - The **±48 gate margin** (AC-2) — claim entry needed.
   - **SPUTDS** (distance between sputnik fires, AC-3) — claim entry needed.

## Neighbouring-Checkout Collision Warning

**Checkout a-1 is concurrently running mc8-3** (missile-command AUDIO: feat/mc8-3-verify-audio-live-close-asset-loop, phase red). It should not touch `sputnik.ts` or the launch cycle, but there is a collision risk on `game.ts` (both game.ts and launch-cycle changes).

**Action:** Re-run the **FULL missile-command vitest project** before finish to catch any wiring regressions:
```bash
npx vitest run --project missile-command
```

Verify no test flakes or new failures from parallel development on launch logic.
