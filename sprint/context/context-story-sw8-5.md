# Context: sw8-5 — Surface HUD + tower render

## Story Summary

Draw the **TOWERS-remaining counter** and **POINTS-NEXT-TOWER readout** on the surface-phase HUD (the `towerCount` helper exists but is never drawn), and verify the tower field rendering against the wave 2/3 longplay reference. This story completes the surface-phase visual feedback loop by adding the missing counter display. Acceptance is ultimately VISUAL — "our frame beside the cabinet frame at the same phase"; part of the cabinet-feel/render-fidelity audit (epic sw8).

**Status:** TDD — write failing tests first, then implement.  
**Points:** 3  
**Workflow:** tdd  
**Repos:** star-wars  
**Priority:** p2  
**Depends on:** None explicitly; follows sw8-4 (trench reads deep)

---

## Problem Statement

Epic **sw8** is a cabinet-feel/render-fidelity audit of the sim and camera/tuning layer. The surface phase (after the trench run) puts the player on the Death Star surface; a tower field defends it. The player must destroy all towers to win. The `towerCount` helper tracks remaining towers in the core sim but is never rendered to the HUD. This story adds the missing counter display and verifies the tower field rendering against authentic cabinet reference.

### Current Behaviour

- **Core state:** `towerCount` field exists in `GameState`; correctly tracks tower destructions.
- **Render layer:** The towers themselves render correctly (per sw8-4 verification).
- **HUD:** No counter is drawn. Player cannot see "towers remaining" or "points until next tower."

### Desired Behaviour

- **TOWERS counter:** Drawn on the surface-phase HUD, updating as towers are destroyed (e.g., "5" → "4" → "3").
- **POINTS-NEXT-TOWER readout:** Drawn alongside, showing points earned toward the next tower bonus (e.g., "2000/5000").
- **Cabinet match:** Rendering position, font size, and update cadence match the longplay reference (waves 2/3).

### Cabinet Reference

The longplay video shows the surface phase HUD with:
- A tower counter in the bottom-left area (or top-right, depending on cabinet board).
- A points-to-next-tower bar or readout.
- Both update on each tower destroyed and points scored.

---

## Technical Approach

### 1. Understand the current tower state

**File: `src/core/state.ts`**
- Read the `towerCount` field (tracks remaining towers).
- Identify the points-toward-next-tower tracking (may be in `score`, `scoreThisPhase`, or a dedicated field).

**File: `src/core/gameRules.ts`**
- Verify tower destruction rewards points and decrement `towerCount`.
- Confirm the bonus structure (e.g., 5000 points per tower).

### 2. Locate the surface-phase HUD render hook

**File: `src/shell/render.ts`**
- Find the surface-phase rendering logic (likely in a `drawSurfaceHUD()` or similar function).
- Identify where wave-end / phase-end readouts are drawn (points, waves survived, etc.).
- Note the HUD layout coordinates and font sizing for consistency.

### 3. Draw the TOWERS counter

**File: `src/shell/render.ts`**
- Add `drawTowerCounter()` function (or extend existing HUD).
- Position and size to match the longplay (use contact-sheet or longplay frames as reference).
- Render `towerCount` as a numeric display (e.g., "5 TOWERS", "TOWERS: 5", or cabinet-style sprite digits).
- Update every frame (no delay; counter is live).

**Acceptance:** "5" displays at the start of the surface phase; decrements as towers are destroyed; disappears when towerCount reaches 0.

### 4. Draw the POINTS-NEXT-TOWER readout

**File: `src/shell/render.ts`**
- Add `drawPointsNextTower()` function.
- Calculate `pointsThisPhase % POINTS_PER_TOWER` to show progress toward next bonus.
- Render as a bar, text readout (e.g., "2000/5000"), or cabinet-style meter.
- Update every frame.

**Acceptance:** Readout shows current phase points modulo bonus threshold; resets on tower destruction (or shows cumulative, depending on cabinet rule).

### 5. RULE: Verify tower field rendering vs longplay

**Manual step (no code change):**
- Serve on a spare port; play wave 2–3 until the surface phase.
- Compare frame-by-frame:
  - Tower count matches (`n` towers visible on screen and in counter).
  - Tower destruction flow: watch a tower explode, see counter decrement and points-next-tower reset/advance.
  - Render position, color, lighting match the longplay.
- If divergences found: log as "Question" or "Conflict" in the Delivery Findings section of the session file.

---

## Acceptance Criteria

### TOWERS Counter (Thread 1)

- [ ] **AC1 — drawTowerCounter() added:**  
  `src/shell/render.ts` defines a function to render the tower count.

- [ ] **AC2 — Counter positioned correctly:**  
  HUD position (coordinates, font size) matches the longplay reference (waves 2–3).

- [ ] **AC3 — Counter updates live:**  
  Each frame, the counter reflects the current `state.towerCount`.

- [ ] **AC4 — Counter decrements on tower kill:**  
  Shoot a tower; watch `towerCount` decrement and the HUD counter update.

- [ ] **AC5 — Counter clears on phase end:**  
  When all towers are destroyed (`towerCount === 0`), the counter vanishes or shows "0".

### POINTS-NEXT-TOWER Readout (Thread 2)

- [ ] **AC6 — drawPointsNextTower() added:**  
  `src/shell/render.ts` defines a function to render points progress toward next tower bonus.

- [ ] **AC7 — Readout positioned correctly:**  
  HUD position and font match the longplay reference.

- [ ] **AC8 — Readout reflects phase points:**  
  Shows current phase points `% POINTS_PER_TOWER`, or cumulative points, depending on cabinet rule.

- [ ] **AC9 — Readout updates on tower destruction:**  
  When a tower is killed and bonus points awarded, the readout resets or advances appropriately.

### Visual QA (Tower Field)

- [ ] **AC10 — Tower count vs visuals:**  
  Play waves 2–3; count towers on screen and in HUD counter — they match.

- [ ] **AC11 — Tower destruction flow:**  
  Tower explodes → counter decrements → points readout updates → visual matches longplay.

- [ ] **AC12 — Longplay frame comparison:**  
  Serve on spare port; capture a surface-phase frame at identical game state as longplay; HUD readouts and tower positions match.

### Core/Shell Purity

- [ ] **AC13 — No core state changes:**  
  `towerCount` and points tracking remain in core; HUD rendering lives in shell. No new state added to GameState.

- [ ] **AC14 — No regressions:**  
  Full suite green (vitest baseline from sw8-4); no pre-existing tests broken.

---

## Reference Material

- **Cabinet reference:** `star-wars-longplay.mov` (waves 2–3, surface phase with tower destruction and HUD updates)
- **Design spec:** `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md` (§8.5 — sw8-5 requirements)
- **Contact sheet (model reference):** `/models.html` in dev server (renders all vector models; use 'G' to scale, Space to pause)
- **Current implementation:**
  - Core: `src/core/state.ts` (`towerCount` field, points tracking)
  - Core sim: `src/core/sim.ts` (tower destruction, point awards)
  - Shell: `src/shell/render.ts` (tower rendering, HUD layout)
- **HUD pattern (to follow):** Look at wave-end readout rendering in `src/shell/render.ts` (e.g., points display, wave counter) for font/positioning consistency.

---

## Scope & Constraints

- **In-scope:** TOWERS counter HUD, POINTS-NEXT-TOWER readout, tower field visual verification vs longplay.
- **Out-of-scope:** Tower destruction physics (owned by sw8-4); tower spawn cadence; score/bonus point allocation rules.
- **Core/shell purity:** `towerCount` and points in core; HUD render in shell.
- **Testing:** TDD — write failing tests for HUD rendering. Acceptance is ultimately VISUAL (serve YOUR checkout, compare longplay).

---

## Story Dependencies

- **Depends on:** sw8-4 (trench reads deep — surface-phase rendering foundation; tower field already verified)
- **Blocked by:** None
- **Blocks:** sw9-? (front-of-house HUD refinements may reference tower/bonus display)

---

## Definition of Done

When all acceptance criteria are met:

1. **TOWERS counter implemented:** `drawTowerCounter()` renders `towerCount` on the HUD; updates live.
2. **POINTS-NEXT-TOWER readout implemented:** `drawPointsNextTower()` renders phase points progress.
3. **HUD positioning matches longplay:** Coordinates, font, and layout align with cabinet reference.
4. **Tests pass:** `npm test` (vitest).
5. **Build succeeds:** `npm run build` (tsc + vite).
6. **Manual verification:** Serve on spare port; play waves 2–3 surface phase; verify:
   - Tower count and points readout display and update correctly.
   - Rendering matches longplay frame-by-frame.
7. **No debug code:** All console logs, temporary fixtures removed.
8. **Code review approved.**
9. **Merged to develop** via PR.
