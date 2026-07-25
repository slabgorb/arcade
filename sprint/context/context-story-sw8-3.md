# Context: sw8-3 — Enemy-fire readability

## Story Summary

Add the **lingering destroy-burst** when a fireball is shot down (today: silent-delete), and verify/rule the incoming-fire **colour** against authentic ROM references (`WSVROM`/`WSGUNS` — the red `GNB`/`GNT` sparkle fireballs). This is a "RULE → FIX" story per design §3: divergences are opened by RULING them (bug / tuning / accepted-deviation) against the ORIGINAL ROM source **before fixing**. Acceptance is ultimately VISUAL — "our frame beside the cabinet frame at the same phase"; part of the cabinet-feel/render-fidelity audit (epic sw8).

**Status:** TDD — write failing tests first, then implement.  
**Points:** 3  
**Workflow:** tdd  
**Repos:** star-wars  
**Priority:** p2  
**Depends on:** sw8-2 (fire fairness delivered dodgeable/shootable incoming shots; sw8-1 (moving eye) for proper camera reconciliation)

---

## Problem Statement

Epic **sw8** is a cabinet-feel/render-fidelity audit of the sim and camera/tuning layer. The longplay playtest report flagged observation #8: **"Fireball leaves no lingering image"** — a shot-down fireball is deleted with no burst drawn (`killedShot`). This story fixes the render-layer readability gap by adding a visible destroy-burst, and verifies the fireball color is authentic to the ROM source.

### Thread 1: THE DESTROY-BURST (visibility/polish)

**Current behaviour:** Player shoots down a fireball → fireball disappears silently (no visual feedback).

**Desired behaviour:** Player shoots down a fireball → a short LINGERING destroy-burst plays at the fireball's position, providing immediate visual confirmation that the shot landed.

**Cabinet reference:** The longplay shows a brief sparkle/flash where a fireball explodes.

**Code location (today):**
- **Core:** `src/core/sim.ts` ~line 720 — `killedShot.add(hitShot)` removes the shot from the array; there is no burst entity spawned.
- **Shell:** `src/shell/render.ts` ~line 340 — `drawFireball()` renders enemyShots; no destroy-burst drawn.

**Pattern to follow:** Story sw3-8 (TIE death) implemented `DyingTie` — a render-only cue that ages and expires. Follow the same pattern:
1. **Core state:** Add a `destroyedShots` array to `GameState`, each carrying `{ pos: Vec3, age: number }`.
2. **Core sim:** When a shot is hit, add it to `destroyedShots` with age 0 (in addition to `killedShot`).
3. **Core update:** Age `destroyedShots` by dt each frame; drop entries past `FIREBALL_DESTROY_BURST_SECONDS`.
4. **Shell render:** Loop `destroyedShots` and draw the burst at each position, fading out with age (same life-fade pattern as `DyingTie`).

**Acceptance:** A shot-down fireball leaves the cabinet afterimage (a brief sparkle/glow fade) before vanishing.

### Thread 2: COLOUR VERIFICATION (authenticity/RULE)

**Current behaviour:** Incoming fireballs render as red (`FIREBALL_GLOW = '#ff3b30'` — VGCRED).

**Open question:** Is the colour ROM-authentic, or a divergence (bug / tuning / accepted-deviation)?

**Cabinet reference:** The longplay fireball colour; the 1983 ROM `WSVROM.MAC` / `WSGUNS.MAC` vector picture definitions (`GNB`/`GNT` gunshot sparkle).

**Code location (today):**
- `src/shell/render.ts` ~line 25 — `FIREBALL_GLOW = '#ff3b30'` (VGCRED red, the cabinet vector red).
- `src/shell/render.ts` ~line 340 — `drawFireball()` uses this colour; the fireball is a small set of glowing lines.
- **Memory:** ROM reference is in `~/Projects/star-wars-1983-source-text/WSVROM.MAC` (pristine source, LF-normalized, greppable).

**Rule decision matrix:**
- **Already authentic?** If WSVROM shows the fireballs are red and the cabinet longplay shows red, document this as "ROM-authentic, no change needed."
- **Cabinet cycles colour by age/distance?** If the cabinet's fireballs shift hue as they approach, port that modulation.
- **Wrong constant?** If WSVROM shows a different hue, update FIREBALL_GLOW to match.

**Acceptance:** The incoming-fire colour matches the ROM source (`WSVROM`/`WSGUNS`), or is ruled an accepted-deviation with documented reasoning.

---

## Technical Approach

### 1. Add the destroy-burst entity type

Follow the `DyingTie` pattern from story sw3-8:

**File: `src/core/state.ts`**
- Add `DestroyedShot` interface (analogous to `DyingTie`):
  ```typescript
  export interface DestroyedShot {
    pos: Vec3
    age: number
  }
  ```
- Add `destroyedShots: DestroyedShot[]` field to `GameState`.
- Initialize as `destroyedShots: []` in `newGameState()`.

**Lifetime constant: `FIREBALL_DESTROY_BURST_SECONDS`**
- Research the ROM: how long does a fireball-destruction sparkle persist? (Candidate: ~0.1-0.2s for a brief flash, similar to muzzle-flash `ENEMY_MUZZLE_FLASH_SECONDS = 0.1`.)
- Define the constant in `src/core/state.ts` or `src/core/gameRules.ts` with a source citation.

### 2. Spawn the burst in the core sim

**File: `src/core/sim.ts`**
- When `killedShot.has(i)` is true, capture the shot's position before filtering it out.
- Add `{ pos: [...enemyShots[hitShot].pos] as Vec3, age: 0 }` to a temporary `spawnedBursts` array (like `spawnedDying` for TIEs).
- Age existing bursts and filter expired ones (same pattern as `dyingTies`):
  ```typescript
  const destroyedShots: DestroyedShot[] = [
    ...state.destroyedShots
      .map((d) => ({ pos: d.pos, age: d.age + dt }))
      .filter((d) => d.age <= FIREBALL_DESTROY_BURST_SECONDS),
    ...spawnedBursts,
  ]
  ```

### 3. Render the burst in the shell

**File: `src/shell/render.ts`**
- Add a render function `drawFireballBurst()` (or reuse/adapt `drawMuzzleFlash` if the visual is identical).
- Loop `state.destroyedShots` and render each with a life-fade:
  ```typescript
  for (const b of state.destroyedShots) {
    const life = 1 - b.age / FIREBALL_DESTROY_BURST_SECONDS
    drawFireballBurst(ctx, transform(view, b.pos), life, proj, w, h)
  }
  ```
- **Visual:** A brief sparkle/glow fade at the destruction point. Can reuse the muzzle-flash geometry or a simplified burst (e.g. concentric rings, radial spikes). Cabinet reference: the longplay shows a brief flash; exact shape TBD by looking at the video.

### 4. RULE: Verify fireball colour

**File: `src/shell/render.ts` (with commit commentary)**
- Read `~/Projects/star-wars-1983-source-text/WSVROM.MAC` for the `GNB`/`GNT` gunshot sparkle picture definitions.
- Cross-check against the longplay video (wave 1–4 enemy fireballs).
- **Ruling in the commit/context:**
  - If red is confirmed: `FIREBALL_GLOW = '#ff3b30'` is ROM-authentic; cite the finding.
  - If a different hue: update FIREBALL_GLOW and cite the ROM location (e.g., "WSVROM.MAC:line X").
  - If colour is dynamic (cycles by age/distance): document the modulation law and implement it.

### 5. Wire up the state transitions

**File: `src/core/sim.ts` (phase entry)**
- On phase entry (same as `dyingTies`): `destroyedShots: []` — wipe leftover bursts so they don't rain into the next phase.

---

## Acceptance Criteria

### Destroy-Burst (Thread 1)

- [ ] **AC1 — DestroyedShot entity added to GameState:**  
  `src/core/state.ts` defines `DestroyedShot` interface and `GameState.destroyedShots` array.

- [ ] **AC2 — Burst spawned on fireball kill:**  
  `src/core/sim.ts`: when a fireball is shot down (`killedShot.has(i)`), add `{ pos, age: 0 }` to `destroyedShots`.

- [ ] **AC3 — Burst lifetime managed:**  
  `src/core/sim.ts`: `destroyedShots` aged by dt each frame, entries past `FIREBALL_DESTROY_BURST_SECONDS` dropped.

- [ ] **AC4 — Burst rendered in shell:**  
  `src/shell/render.ts`: loop `state.destroyedShots` and draw each burst with life-fade (1 → 0 over lifetime).

- [ ] **AC5 — Visual QA (destroy-burst):**  
  Serve on a spare port and shoot down incoming fireballs; each one leaves a brief sparkle/glow that fades out. No silent-delete.

- [ ] **AC6 — Burst wiped on phase transition:**  
  `destroyedShots: []` on `enterPhase()` (same as `dyingTies`); no residual burst rains into the next phase.

### Colour Verification (Thread 2)

- [ ] **AC7 — RULE: Fireball colour verified:**  
  Dig `WSVROM.MAC` for the `GNB`/`GNT` gunshot sparkle picture; settle whether the cabinet's fireballs are red, or cycle hue, or are a different colour. Document the ruling in the commit/context.

- [ ] **AC8 — Colour ruling enforced in code:**  
  If ROM-authentic: cite the finding (e.g., "WSVROM.MAC:line X confirms red `GNB` sparkle").  
  If a different hue or dynamic: update `FIREBALL_GLOW` or `drawFireball()` and cite the ROM location.

- [ ] **AC9 — Visual QA (colour):**  
  Serve on a spare port; compare incoming fireball colour frame-by-frame against the longplay (waves 1–4). Colour matches or is ruled an accepted-deviation.

### Core/Shell Purity

- [ ] **AC10 — Core/shell boundary held:**  
  `DestroyedShot` state lives in core (`GameState`); burst geometry/colour lives in shell (`render.ts`).  
  No shell-side effect state; all burst data flows from core.

- [ ] **AC11 — No regressions:**  
  Full suite green (vitest baseline from sw8-4 = 1800+/1800+); no pre-existing tests broken.

- [ ] **AC12 — Citations green:**  
  Any touched cited constant (e.g., `FIREBALL_GLOW` if it references a ROM finding) re-stamps `remediated_by` line. `npm test -- citations` passes.

---

## Reference Material

- **Cabinet reference:** `star-wars-longplay.mov` (waves 1–4, focused on incoming enemy fireballs and destruction visuals)
- **Design spec:** `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md` (§3 — rule before you fix; §8.3 — sw8-3 requirements)
- **TIE death pattern (to follow):** Story sw3-8 `DyingTie` in `src/core/state.ts` and `src/shell/render.ts` (~line 250–280)
- **1983 ROM source (pristine):**  
  - `~/Projects/star-wars-1983-source-text/WSVROM.MAC` (fireball picture definitions)
  - `~/Projects/star-wars-1983-source-text/WSGUNS.MAC` (gunshot/fireball spawn and behaviour)
- **Current implementation:**
  - Core: `src/core/sim.ts` (~line 720 — shot kill logic), `src/core/state.ts` (GameState)
  - Shell: `src/shell/render.ts` (~line 25 — colours, line 340 — drawFireball)
- **Muzzle-flash pattern (for burst visuals):**  
  - `src/shell/render.ts` ~line 170 — `drawMuzzleFlash()` (a brief radial starburst; candidates for reuse or adaptation)

---

## Scope & Constraints

- **In-scope:** Destroy-burst entity (state + sim + render), fireball colour verification + ruling, burst lifetime tuning.
- **Out-of-scope:** Core simulation rules (PRNG, TIE choreography); other fireball mechanics (homing, speed, fire cadence — owned by sw8-2).
- **Core/shell purity:** `DestroyedShot` state in core; burst render in shell. No shell-side effect state.
- **Testing:** TDD — write failing tests first. Acceptance is ultimately VISUAL (serve YOUR checkout, watch against longplay).
- **Citation hygiene:** If FIREBALL_GLOW references a ROM finding, keep `remediated_by` stamps green.

---

## Story Dependencies

- **Depends on:** sw8-1 (moving eye — camera reconciliation for proper burst positioning), sw8-2 (fire fairness — ensures incoming shots are dodgeable, so the player can shoot them down)
- **Blocked by:** None
- **Blocks:** sw8-5 (surface HUD), tw9-1 (front-of-house cockpit canopy — may reference fire colour)

---

## Definition of Done

When all acceptance criteria are met:

1. **Destroy-burst implemented:** `DestroyedShot` state lives in core; burst entity spawned on fireball kill; aged and rendered in shell.
2. **Colour verified:** WSVROM dug; fireball colour ruled (ROM-authentic / tuning / accepted-deviation) and documented in commit.
3. **Tests pass:** `npm test` (vitest) + `npm test -- citations` (audit findings).
4. **Build succeeds:** `npm run build` (tsc + vite).
5. **Manual verification:** Serve on spare port; shoot down fireballs and verify:
   - Each destroyed fireball leaves a brief sparkle/glow that fades (not a silent-delete).
   - Colour matches the longplay (waves 1–4).
6. **No debug code:** All console logs, breakpoints, temporary fixtures removed.
7. **Code review approved.**
8. **Merged to develop** via PR.
