# Story pm4-9 Context

## Title
Attract presentation + high-score ladder display + default table (shell+core): render the attract screen — title + the already-built high-score ladder + ROM attract text — over the pm4-8 demo, and SEED a default ladder (the mc7-4 tail). Pin the ROM strings/cadence at RED (pacman.asm:36a7 table).

## Metadata
- **Story ID:** pm4-9
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Pac-Man — cabinet lifecycle (attract + state machine + freeze pauses) + fidelity/accessibility fixes
- **Stack Parent:** pm4-8 (depends_on; merged as PR #224, 2026-08-11)

## Background

**Measured facts at setup (2026-08-11):**

The high-score LADDER LOGIC is already complete and in core (`plugins/pac-man/src/core/game.ts` — the mc7 half: qualifiesForHighScore/insertHighScore + name entry). pm4-9 delivers the **DISPLAY** of that ladder on the attract screen plus a SEEDED DEFAULT ladder (mirroring missile-command mc7-4's default-table seeding from the ROM defaults). Do NOT re-implement the ladder logic.

### PM4-8 Forward Impacts

pm4-8 (self-playing attract demo, PR #224, merged 2026-08-11) shipped these impacts that pm4-9 must honor:

1. **Maze reseed on demo death:** The attract demo maze RESEEDS to a full board every time the demo Pac is caught. The loop mechanism: `game.ts` attract branch uses `Object.assign(state, createGameState(state.seed, ...))`. The attract PRESENTATION layer must NOT assume one continuous demo run — the board visibly resets to full on each demo death.

2. **No reseed on board clear (deferred decision):** The demo loops on Pac's DEATH but NOT on a board CLEAR: level-clear is gated on `phase === 'playing'` (`game.ts:748`), which is `attract` during the demo. If the auto-player ate all 240 dots Pac would idle while ghosts roam. Reviewer logged this as a non-blocking rough edge DEFERRED TO pm4-9 — pm4-9 may reseed on board-clear too (a follow-up option, not a hard requirement; flag it for TEA/Dev to decide).

### Scope Ruling (User-Decided at Setup)

pm4-9 INCLUDES the `showcase: false -> true` flip:
- `plugins/pac-man/plugin.ts:12` (currently `showcase: false`)
- `src/host/registry.ts` pac-man entry

This makes pac-man's now-working attract demo join the lobby showcase rotation. EXPECT registry/census/topology tests to need updating (the "ad1 showcase blast radius": flipping showcase reddens registry + census/topology guards).

### Accessibility (Binding Rule, Overrides ROM)

The boss has photosensitive epilepsy (pm4-1). The attract presentation MUST NOT introduce any full-screen flash/strobe — no blinking title, no strobing text. This is the ONE exception to rom-always-wins.

### ROM Anchor for Verification

Attract strings/cadence at `pacman.asm:36a7` (the attract/PUSH-START table). Any NEW cited constant Dev adds must carry a citations.test.ts-gated claim; core purity (purity.test.ts) stays green.

## Problem

The attract screen (title, ROM text, high-score ladder) is not yet rendered. The high-score ladder logic exists in core but is not displayed. No default high-score table is seeded. Pac-Man's attract demo is complete (pm4-8) but lacks the visual presentation layer. The showcase mode is not enabled, preventing pac-man from appearing in the lobby rotation.

## Technical Approach

**Shell layer (render):**
1. Render attract overlay with title and ROM attract text (pacman.asm:36a7) over the pm4-8 self-playing demo.
2. Display the high-score ladder (reading from core game.ts) on the attract screen.
3. Respect the mesh reseed behavior from pm4-8 (board resets to full on demo-Pac death).

**Core layer (game.ts):**
1. Seed a default high-score table at game init (mirroring missile-command mc7-4 ROM defaults).
2. Any new constants must be citations.test.ts-gated (anchorhorn at pacman.asm:36a7).
3. Verify purity.test.ts remains green.

**Host/tooling:**
1. Flip `showcase: false -> true` in `plugins/pac-man/plugin.ts:12`.
2. Update `src/host/registry.ts` pac-man entry.
3. Update registry/census/topology tests to handle the showcase flip.

**Deferred decision (flag for TEA/Dev):**
- Board-clear reseed: decide whether the demo board should reseed when all 240 dots are cleared (non-blocking option left open by pm4-8).

## Acceptance Criteria

**DERIVED from measured facts (epic specification had no ACs):**

1. **AC-1: Render attract overlay** — Draw the attract screen overlay (title + ROM attract text from pacman.asm:36a7) over the pm4-8 self-playing demo. Shell render layer (shell/render.ts) only; do NOT modify core demo loop logic.

2. **AC-2: High-score ladder display** — Display the high-score ladder (logic already in core game.ts) on the attract screen. The ladder display must respect the maze reseed behavior from pm4-8 (board resets to full on demo-Pac death).

3. **AC-3: Default ladder seeding** — Seed a default high-score table (mirroring missile-command mc7-4 ROM defaults) at game init. This provides sensible defaults when no scores exist yet.

4. **AC-4: Board-clear reseed (deferred decision)** — Verify that the demo board reseed behavior from pm4-8 is honored. Document whether board-clear triggers a reseed (pm4-8 left this as a non-blocking deferred option for pm4-9 to decide). Flag the decision for TEA/Dev review.

5. **AC-5: Showcase flip + registry updates** — Enable showcase mode in `plugins/pac-man/plugin.ts:12` (flip `showcase: false` to `true`). Update `src/host/registry.ts` pac-man entry. Update registry/census/topology tests to handle the showcase flip (expect RED on these tests until updated).

6. **AC-6: Accessibility compliance (binding)** — Verify that the attract presentation introduces NO full-screen flash/strobe (no blinking title, no strobing text). This is a binding accessibility rule (boss has photosensitive epilepsy) and overrides any ROM fidelity preference.

7. **AC-7: Citations and purity** — All new core constants (if any) must carry citations.test.ts-gated claims anchored at pacman.asm:36a7. Run purity.test.ts and verify green (core functions remain clock-free, seeded-RNG only, frame-count timers).

## Scope

**In scope (shell + core):**
- Attract overlay render (title, ROM text, ladder display) — shell layer
- Default high-score table seeding — core layer
- Showcase flip + registry updates — tooling/host config
- Accessibility compliance — NO flash/strobe on attract
- Deferred-option flagging (board-clear reseed decision)

**Out of scope:**
- Pause phase
- Coin/credit economy UI
- Intermission cutscenes
- Maze row-table changes (deferred to pm4-10)
- Re-implementation of high-score ladder logic (already done in pm4-7/mc7 half)

---

**Generated from epic-pm4.yaml story pm4-9 and measured facts documented at setup (2026-08-11).**
