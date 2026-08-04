# Story cp7-3 Context

## Title
The score zero-PADS where the ROM zero-SUPPRESSES — and our own claim already says so

## Metadata
- **Story ID:** cp7-3
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Centipede playtest followups — four shell defects on a byte-correct core, one unwired DIP, and the pause the cabinet never had

## Problem
THE PLAYTEST REPORT WAS "player score should have two digits (00) at start". THE ROM AGREES, AND SO DOES OUR OWN CLAIM — ONLY THE CODE DISAGREES. This is the cheapest class of defect in this repo: a byte-verified claim that already states the correct rule, sitting beside a formatter that never implemented it.

WHAT WE DO TODAY. src/shell/render.ts:129-133 is the ONLY score formatter in the plugin (grep for padStart or sixDigits across src returns these lines and nothing else): sixDigits(value) returns String(...).padStart(6, '0').slice(-6). At score 0 it renders 000000 — six zeros filling columns h0-5. Its own docblock claims cp2-12 authority for "zero-padded, never truncated to fewer glyphs", which is where the mistake was made and written down as if it were the finding. Call sites are :271 (P1 score) and :287 (high score).

WHAT THE MACHINE DOES. UPSCRE at CENTI4.MAC:2638-2645 drives three BCD bytes through DIGIT2 with the carry as the suppression flag: "LDA SCORE2 / SEC ;ZERO SUPPRESSION / JSR DIGIT2 / LDA SCORE1 / JSR DIGIT2 ;2 MORE DIGITS / LDA SCORE0 / CLC ;NO ZERO SUPPRESSION / JSR DIGIT2 ;UPDATE PLAYER ONE'S SCORE". DIGIT2 and DIGITZ live at CENIR4.MAC:227-247: carry set means suppress; a suppressed digit falls THROUGH to JSR CHAR with A=0, and CHAR at CENIR4.MAC:204-206 does "TAY / BEQ 10$ ;LEAVE A BLANK AS 0" — it writes a BLANK TILE and still advances the cursor by one column. Carry stays set so suppression propagates SCORE2 to SCORE1, then the CLC at :2644 turns it OFF for the last BCD byte so ITS TWO DIGITS ALWAYS DRAW. At score 0 the cabinet therefore shows four blanks and 00, still occupying six column slots h0-5, with the 00 at h4-5. Not a narrower field — a padded one, padded with blanks instead of zeros.

THE HIGH SCORE USES THE IDENTICAL IDIOM and must be fixed in the same breath: CENTI4.MAC:1902-1910 runs the same SEC ... CLC pattern for the high-score field. Our claims already record both correctly — CL-13 at docs/rom-study/claims/08-render-color.json:137 ("the first pair with SEC = zero-suppression, the last with CLC = always drawn") and CL-14 at :151 for the high score. NO CLAIM REWRITE IS NEEDED. The claims are right; make the code match them, and fix the render.ts:129-133 docblock that currently asserts the opposite.

THE IMPLEMENTATION IS ALREADY UNBLOCKED, WHICH IS WHY THIS IS SMALL. layoutText (src/shell/layout.ts:136-148) ALREADY treats a space as "advance the cursor, emit no glyph" — which is exactly what CHAR does with a suppressed zero. So emitting a blank-padded six-character string renders correctly with no other change. Note the constraint that goes with it: layoutText THROWS on any character without a stamp, so inventing a placeholder glyph is not an option — it is a real space or nothing.

NO TEST PINS 000000, verified at filing, so nothing blocks this. What exists: tests/render.test.ts:321-326 (score 123456 renders exactly 123456 in the h0-5 band) and :329-334 (high score 987654) both stay green because six significant digits suppress nothing. tests/render.test.ts:182-204 is an it.each over states including createSim(1) at score 0, asserting every character of String(state.score) — that is "0" — appears in the drawn HUD text; it stays green with "    00" but it is NOT a pin on six zeros, and it is the only test that touches score 0 at all. tests/render.test.ts:337-343 ("no CHAR_ letter glyph on the HUD row") stays green because blanks emit no glyph whatsoever. The gap is the point: the reason this shipped is that nothing ever asserted what a ZERO score looks like, and the story's own test must close that specific hole rather than re-asserting the six-digit case that already passes.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- At score 0 the P1 score renders four blanks followed by 00 occupying the same six column slots h0-5, with the 00 at h4-5 — asserted against the drawn glyph positions, not against a formatted string.
- The high score uses the identical suppression (CENTI4.MAC:1902-1910, claim CL-14) and is fixed in the same change, not left inconsistent with the score beside it.
- Suppression propagates across the first two BCD bytes and stops at the last: a score of 5 shows blanks then 05, a score of 100 shows blanks then 0100 in its six slots — the boundary cases are tested, not just zero.
- The render.ts:129-133 docblock no longer asserts 'zero-padded, never truncated' — the comment that recorded the mistake as a finding is corrected and cites CENTI4.MAC:2638-2645 and CENIR4.MAC:227-247.
- No claim JSON is rewritten: CL-13 and CL-14 already state the ROM's rule correctly and the citation gate stays green — the story makes the code match the claim, and says so.
- tests/render.test.ts:321-326, :329-334, :182-204 and :337-343 all stay green, and the new test closes the specific hole that let this ship: nothing previously asserted what a ZERO score looks like.

---
_Generated by `pf context create story cp7-3` from the sprint YAML._
