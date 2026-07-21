# Story cp4-3 Context

## Title
Per-wave colour walk — LCOLOR advance on the all-dead re-lay

## Metadata
- **Story ID:** cp4-3
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** centipede
- **Epic:** Centipede — game structure (wave progression, bonus lives, the outer loop, high scores, attract)

## Problem

The third CENTPC per-wave effect: LCOLOR (a per-player colour selector) advances via `ORA 0x80` inside the all-dead guard that gates the speed and fragmentation walks — so it fires on the WAVE-CLEAR re-lay ONLY, never on the death re-lay. The centipede's colour changes wave to wave in the ROM; today the web clone does not.

Key distinction: this is NOT the IRQ colour cycling (that shifts through a palette every frame), but a PER-WAVE colour SELECT that feeds CLRCH's initialisation — the centipede enters each wave in a different hue. The story spans core (LCOLOR flag on SimState, advanced on wave-clear) and shell (render.ts / palette.ts reading it), with the two changes required in SEPARATE commits per the epic boundary ruling.

**DEPENDENCIES:** cp4-1 (speed goes live) and cp4-2 (fragmented train) are already DONE and have built the re-lay path this story extends. The all-dead re-lay is the wave-clear branch in CENTPC (:459-463) that both cp4-1 and cp4-2 touched.

## Technical Approach

_Approach hints to be refined by TEA/Dev. The story title and acceptance criteria above define the intended behavior — the notes below are discovery already done during setup so TEA doesn't have to re-derive the ASM._

**Sources (read these first):**
- **Design spec (authoritative rationale):** `centipede/docs/superpowers/specs/2026-07-20-centipede-cp4-game-structure-design.md` — the "Constant-source findings" section, COLOUR half.
- **ROM ground truth:** `reference/atari-source/centipede/revision.v4/CENTI4.MAC` (repo root, VENDORED tree only; the `~/Projects/centipede-source` copy is off-by-one from line 44). Routine `CENTPC` `:456-554`, specifically `:459-463` for the colour walk guard and the walk itself.
- **Colour mapping (critical):** `centipede/docs/rom-study/subsystems.md` — section on `CLRCH` (`:879` in the ROM). This routine initializes a motion object's colour from LCOLOR and other factors. READ IT FIRST — the mapping from LCOLOR value to rendered RGB is the single most important piece of external knowledge for this story.
- **Code under change:**
  - `centipede/src/core/sim.ts` — SimState definition; add `lcolor: number` field initialized at STARTING_LCOLOR (TBD, read ROM).
  - `centipede/src/core/centipede.ts` — the wave-clear re-lay site where LCOLOR is advanced (`:439` in cp4-1/cp4-2 context, exact line TBD).
  - `centipede/src/shell/render.ts` — segment rendering, where the centipede's colour is selected (TBD location, likely in the segment render call).
  - `centipede/src/shell/palette.ts` — the colour lookup table and mapping logic from LCOLOR → RGB (TBD, may need creation or enrichment).
- **Existing claims:** `centipede/docs/rom-study/claims/09-centipede-train.json` — 101 entries (CT-98..CT-101 from cp4-2); cp4-3's new claims start at **CT-102**. Schema: `{id, claim, source:{file, line, verbatim}, corroboration?}`.

**The ROM shape to pin — LCOLOR advance (CENTPC `:459-463`):**

The ALL-DEAD guard at `:459-460` reads:
```
;NO CHANGE IN COLOR OR SPEED UNTIL ALL DEAD
```

The speed walk is `:479-482` (cp4-1, already implemented). The colour walk is `:461-463`:
```
LDA X,LCOLOR-1
ORA I,80  ;(0x80 in hex)
STA X,LCOLOR-1 ;TIME TO CHANGE COLORS
```

This:
1. Loads the current LCOLOR value from memory (player-indexed: `LCOLOR-1` for player 0, `LCOLOR` for player 1 if 2-player — but today the clone is single-player, so LCOLOR_PLAYER_0).
2. ORs it with 0x80 (the high bit).
3. Stores the result back to LCOLOR.

**Net effect:** each time the wave clears (all enemies dead), LCOLOR's bit 7 toggles. On wave 1, it starts at some value (TBD from INIT); on wave 2+ it has bit 7 set, changing the colour palette the train draws from.

**LCOLOR → colour mapping (from CLRCH at `:879`):**

The CLRCH routine reads LCOLOR and computes the motion object's colour register. Read `centipede/docs/rom-study/subsystems.md` in full for this mapping. The mapping is deterministic: given an LCOLOR value, CLRCH produces a specific colour reg value. Transcribe this mapping into `palette.ts` as a lookup table or computation — do NOT invent it.

**Scope ruling (core/shell boundary):**

- **src/core changes (COMMIT 1):** SimState gets `lcolor: number` field; the wave-clear re-lay advances it via the `ORA 0x80` transcription with a radix-cited comment and a claims entry (CT-102). A test clears a wave and asserts `lcolor` changed; a second test dies a player and asserts it did NOT.
- **src/shell changes (COMMIT 2, separate):** render.ts and/or palette.ts consume `lcolor` to select the centipede segment's colour. A render test asserts the segment colour tracks `lcolor`.

**Boot and initialization:**

Read INIT at CENTI4.MAC `:1162` onward for the LCOLOR initialization. Transcribe the starting value with a radix-cited comment + claims entry.

**Player indexing (single-player note):**

The ROM uses `LCOLOR-1` (0-indexed) and `LCOLOR` (1-indexed) for two-player mode. The web clone is single-player — hardcode to player 0 (`LCOLOR_PLAYER_0` or similar) and note the branch in a comment. Do NOT invent two-player support or conditional logic.

**CRITICAL: which re-lay fires this?**

The all-dead guard (`:459-460`) gates BOTH the speed walk and the colour walk. They fire on the WAVE-CLEAR re-lay (`:439` context from cp4-1/cp4-2), NOT the death re-lay. If you see LCOLOR advanced on death, something is wrong — the ROM does not do that. A test must pin this precisely: wave clear → `lcolor` changed; player death (last life) → `lcolor` did NOT change.

**Radix and citations:**

CENTI4.MAC inherits `.RADIX 16` via CENDE4 — bare literals like `80` are hex (`0x80`). Every transcribed constant (LCOLOR starting value, the `0x80` mask, the palette indices) needs a radix-cited comment + a claims entry. `npm test -- citations` must stay green.

## Acceptance Criteria (from epic-cp4.yaml, verbatim)

1. SimState carries the LCOLOR selector; it advances via 'ORA 0x80' on the wave-clear re-lay ONLY (not the death re-lay), transcribed with a radix-cited comment + claims entry; pinned by a test that clears a wave and asserts LCOLOR changed, and dies a player and asserts it did NOT; citations green.
2. render.ts/palette.ts draws the centipede's colour from LCOLOR through the ROM's CLRCH mapping (subsystems.md :879), transcribed not invented; a render test asserts the segment colour tracks LCOLOR.
3. Human smoke test on a server proven THIS checkout: the train is a visibly different colour on wave 2 than wave 1.
4. Sim change and render change in separate commits; full suite green from baseline; build + lint clean.

## Prior Story Context

**cp4-1 (speed goes live):** Built the wiring of SimState.centis into the march step + entry direction at all three lay sites (boot, death respawn, wave-clear). The wave-clear re-lay is at sim.ts :439 (`createCentipede(cadence.centis, frame)`). This story hooks LCOLOR advance at the same re-lay.

**cp4-2 (fragmented train):** Built the loose-head placement drawing from seeded RNG at the wave-clear re-lay. Reordered the death-respawn lay sites (spider→flea→segs) to respect ROM draw order. The colour walk fires in the same all-dead guard, so cp4-1 and cp4-2's test suite context (determinism, RNG ordering, the re-lay path) is directly relevant.

Read the Delivery Findings and Design Deviations in `sprint/archive/cp4-2-session.md` and `sprint/archive/cp4-1-session.md` for context on the ordering hazards, radix discipline, and test design patterns already established.
