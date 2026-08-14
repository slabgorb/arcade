# jt11-16

## Problem

**Problem:** When the Joust cabinet powers on, it skips straight to the self-play attract demo and never shows the JOUST title/logo screen. **Why it matters:** Every real Joust machine opens with its title card — the game's "cover" — before it shows off gameplay. Skipping it means players (and anyone glancing at the lobby) never see the game's branding first; it's the equivalent of a movie trailer that opens mid-scene instead of with the studio logo.

## What Changed

Think of the cabinet like a vending machine with two "screens" it can show: a title card and a demo reel. The code to draw the title card already existed — it was built in an earlier update — but nothing ever told the machine to *use* it. It was like having a welcome sign built and painted, but never hung up. This update flips one setting so the cabinet boots up showing the title card first, lets it sit on screen for about 18.5 seconds (the same timing the original 1982 arcade hardware used), and then automatically hands off to the self-play demo — exactly like the original machine did. Pressing "Start" during the title screen still skips straight into the game, just like before.

## Why This Approach

The team found that the "hang the sign" work was the *only* work needed — the title screen's artwork and logic were already fully built from a previous project, just never connected to anything. Rather than writing new visual code (which would have expanded this into a much bigger, riskier change), the fix was scoped tightly to the "wiring": which screen the machine shows first, and when it switches to the next one. This is a low-risk, surgical change — no new visuals, no new art, just correcting the sequence. The team also verified this matches the *original 1982 arcade hardware's* documented behavior, so this isn't a stylistic guess — it's a correction back to how the real machine worked. One cosmetic issue was spotted along the way (a line of text on the title screen is missing a number) but was intentionally left out of this fix and logged separately, since fixing it would require new visual work outside this change's scope.
