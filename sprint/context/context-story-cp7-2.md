# Story cp7-2 Context

## Title
The train enters on the score line — the render paints where the ROM says off-screen

## Metadata
- **Story ID:** cp7-2
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Centipede playtest followups — four shell defects on a byte-correct core, one unwired DIP, and the pause the cabinet never had

## Problem
THE PLAYTEST REPORT WAS "the centipede starts on the same row as the player score, it should start down one". THE SIM VALUE IS CORRECT AND MUST NOT BE TOUCHED. CENT_ENTER_V = 0xF8 (src/core/centipede.ts:64) is byte-cited to CENTI4.MAC:489 "LDA I,0F8" and the ROM lays the whole train there — head at :489-491 (LDA I,0F8 / EOR CKF8 / STA MOBJV ;VPOS), bodies at :501-503, loose heads at :527-528 ("60$: LDA I,0F8 ;VPOS=F8"). Our core places head, bodies and loose heads at that same v (centipede.ts:230, :237, :258). All of it agrees with the machine. THE DEFECT IS IN THE RENDER.

THE OVERLAP IS TOTAL, NOT MARGINAL. gunScreenY reduces algebraically to y = 247 - v (src/shell/layout.ts:111-116, the identity spelled out and pinned at tests/gun-vertical.test.ts:42-45), so a segment at v = 0xF8 (248) draws at y = -1 spanning y -1..7. The HUD draws at hudY = cellScreenY(PLYFLD_HEIGHT-1) = 0 (src/shell/render.ts:262) with 8-pixel glyphs, so the P1 score (:271), the lives icons (:279) and the high score (:287) occupy y 0..7. The train enters exactly on top of all three.

WHAT THE ROM SAYS, AND IT SAYS IT THREE TIMES IN ITS OWN COMMENTS: V >= 0xF8 IS OFF THE VISIBLE FIELD. (1) SHOOT at CENTI4.MAC:2177-2182 — "LDA X,MOBJV / EOR CKF8 / CMP I,0F8 / BCS 132$ ;IF OFF TOP OF SCREEN" makes a segment there unshootable. (2) ANTMV at :59-62 — "CMP I,0F8 / BCC 5$ ;IF ON SCREEN, KEEP MOVING". (3) ANTPC parks the flea at exactly V=0F8 under the comment "JSR ANTPC ;REMOVE ANT FROM SCREEN" (:135-137 with :125) — parking a creature at 0xF8 is the machine's IDIOM FOR HIDING IT. Independently, the score itself lives on playfield row 0x1F: UPSCRE writes TEMP4 = 0x1F / TEMP4+1 = 0x04 for address 0x041F (:2632-2637), lives at 0x04DF and high score at 0x059F are the same row, and OBSTAC maps V to row as (V+4)>>3 (:1701-1704) so V=0xF8 lands on row 0x1F. Cocktail symmetry corroborates it: CKF8 swaps V=0xF8 with V=0x00 (CENDE4.MAC:242-244), so the field has a score line at EACH end and the playable rows are v = 1..0x1E.

SO THE RULING THIS STORY IMPLEMENTS: the sim may hold a segment at 0xF8 — that is where the ROM holds it — but the RENDER must not paint a motion object in the V >= 0xF8 band, exactly as it already declines to paint the flea. THE PRECEDENT IS FOUR LINES AWAY AND SHOULD BE COPIED RATHER THAN INVENTED: src/shell/render.ts:250 already gates the flea with "if (flea.v < FLEA_PARK_V)" where FLEA_PARK_V = 0xf8 (src/core/flea.ts:67). The train is the one motion object that draws in that band ungated. The core already knows the rule too — SHOT_TOP_SKIP = 0xf8 (src/core/centipede.ts:360) documents "a segment at/above the entry row is not shootable — it hasn't descended onto the playfield yet".

A SECOND, SMALLER OFF-BY-ONE RIDES ALONG AND MUST BE RULED ON EXPLICITLY RATHER THAN LEFT AMBIGUOUS: y = 247 - v puts a v=0xF8 sprite at y = -1, one pixel ABOVE the top edge, where a bottom-edge mapping would be y = 248 - v. Decide whether the entry band is hidden by a draw gate (the flea's shape, and the conservative choice) or by a vertical offset applied to motion objects, and write down which and why. A gate and an offset are not the same fix and they do not have the same blast radius — gunScreenY is heavily pinned and shared with the gun.

DO NOT CHANGE: src/core/centipede.ts:64 CENT_ENTER_V, and do not "solve" this by lowering the spawn row. A Dev who edits that constant has laundered a cited byte to move a sprite and will be rejected.

TESTS THAT WILL REACT, KNOWN AT FILING: tests/segment-render.test.ts:97-98 builds its fixture from segments at v=0xf8 and asserts drawImageCount() >= mushrooms + 1 + 3 with HEAD3/HEAD2 among the requested stamps — IT GOES RED THE MOMENT SEGMENTS AT 0xF8 STOP DRAWING, and rewriting it to a visible row is part of this story, not collateral damage. tests/gun-vertical.test.ts:42-45 pins y = 247 - v only over PLAYV_MIN..PLAYV_MAX, so a segment-only fix is safe from it but an offset fix is not. tests/render.test.ts:260 and :379-386 require every HUD glyph at y = cellScreenY(31). Also aware: tests/centipede.test.ts:152/:164/:170-174, tests/sim-assembly.test.ts:158 and tests/fragmented-train.test.ts:121/:264 all pin the 0xF8 entry in the SIM and must all still pass untouched — if any of them goes red you have changed the wrong layer.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- No motion object is painted in the V >= 0xF8 band, and the guard is expressed the way the flea's already is at src/shell/render.ts:250 rather than as a new idiom.
- CENT_ENTER_V (src/core/centipede.ts:64) is UNCHANGED, and tests/centipede.test.ts:152/:164/:170-174, tests/sim-assembly.test.ts:158 and tests/fragmented-train.test.ts:121/:264 all stay green untouched — a red one of those means the wrong layer was changed.
- The story rules explicitly between a draw gate and a vertical offset, writes down which and why, and names the blast radius of the rejected option — they are not the same fix and gunScreenY is shared with the gun.
- tests/segment-render.test.ts:97-98 is rewritten to a visible row rather than deleted or weakened; the story states that its 0xF8 fixture was testing the defect.
- Every HUD glyph still sits at y = cellScreenY(31) (tests/render.test.ts:260, :379-386) and the score, lives and high-score row is unobstructed at wave start, asserted rather than eyeballed.
- The off-by-one in the entry band (y = 247 - v puts a v=0xF8 sprite at y = -1) is resolved or explicitly recorded as out of scope with a reason — not left unmentioned.

---
_Generated by `pf context create story cp7-2` from the sprint YAML._
