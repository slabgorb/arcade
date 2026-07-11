**Total run time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide ("Fix: Flight Altitude Limit Was Set to Less Than Half Its Correct Value"). One sentence framing: "A small reading error in 45-year-old arcade code was about to get built on top of — here's how we caught and fixed it before that happened."

**Scene 2 — Slide 2: Problem (0:20–1:00)**
State the core numbers out loud: "The game's altitude ceiling should be 1,536 units. Our code had it at 720 — less than half." Explain in one sentence why this file format trips people up: the original code uses hexadecimal numbering, and a number like "180" means something very different in hex than it does in plain decimal. Land the stakes line: two upcoming features — ground-level flying and the scrolling horizon — were queued to build directly on this number.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Switch to the terminal for a live look at the corrected code.
```
cd red-baron
git show 7f6b6b6 -- src/core/flight.ts
```
This shows the actual one-line-of-logic fix: `ALT_MAX` changing from a plain `180 * 4` (=720) to the hex-correct `0x180 * 4` (=1536), with the updated comment showing the source citation. Call out on screen: "One symbol — `0x` — is the entire difference between 720 and 1,536."

*Fallback: if the terminal isn't cooperating, skip to the Before/After slide and narrate the same diff from there — the numbers are the whole story.*

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Run the test suite live to show the fix is verified, not just asserted:
```
npm test -- flight
```
Point out the specific line in the output: `the clamp bounds are PLYMIN = 0x8*4 = 32 and PLYMAX = 0x180*4 = 1536`. Say: "That's not just a code fix — that's an automated check that will fail forever after if anyone tries to reintroduce the wrong number."

*Fallback: if the live run fails or is slow, show the pre-captured result instead: 335/335 tests passing, called out on the Before/After slide.*

**Scene 5 — Before/After (3:00–3:30)**
Walk the table on this slide directly (see Before/After section below). Emphasize the two "proof" values that made the team confident this was hex, not decimal: `.STAR0 = 1B` (the letter B can't exist in a decimal number) and `1001 = HORZ + 1` (only true if HORZ = 4096 in hex).

**Scene 6 — Roadmap (3:30–3:50)**
One line: "This unblocks the next two features in the flight sequence — ground-level flying and the scrolling horizon — both of which needed this number to be right before they could start."

**Scene 7 — Questions (3:50–4:00)**
Open the floor.