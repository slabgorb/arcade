# ml9-1

## Problem

**Problem:** When the Millipede cabinet sits idle, it never shows players the screen that introduces the game's cast of bugs, the top scores, and the "how to play" pricing — the classic 1982 "cast of characters" attract screen was simply missing from this build. **Why it matters:** That screen is what pulls a passerby into dropping a coin — it's the game's own pitch, showing off every enemy by name next to the high-score table and the price. Without it, the cabinet's idle loop only shows the self-playing demo, which is engaging but never tells a new player what they're looking at or what it costs to play.

## What Changed

Think of the original 1982 arcade cabinet as having two "screensaver" modes it alternates between when nobody's playing: a silent demo of the game playing itself, and a static "poster" screen that names every bug in the game, shows the top 8 high scores, and prints "1 COIN 1 PLAY." This story built that second screen from scratch — it did not exist in any form before.

We now render, in order, all 10 enemy names exactly as the original game's memory listed them (DDT BOMB, INCHWORM, EARWIG, DRAGONFLY, MILLIPEDE, SPIDER, BEETLE, BEE, MOSQUITO, GROWTH), the 8-row high-score table, and the footer text "1 COIN 1 PLAY / BONUS EVERY 15000 / COPYRIGHT ATARI 1982" — all on the correct solid-blue background. The idle-cabinet loop now cycles the self-playing demo first, then shows this new showcase screen for its portion of the cycle, matching the original cabinet's behavior, and it does so without disturbing the demo or the in-game score display, which were both verified untouched.

## Why This Approach

Every word, letter, and color byte drawn on this screen was pulled directly from the original 1982 game's source code and cross-checked against a real reference screenshot from an emulator running the original ROM — nothing was typed in by eye. This matters because a subtle mistake was actually caught this way: a comment left behind in the original 1982 source code misspelled one enemy's name as "GROWTHS," but the actual game data byte-for-byte spelled it "GROWTH" — matching the screenshot. Trusting the real data over the comment avoided shipping a screen with a typo baked in from a 44-year-old source file.

The team also caught and fixed a sequencing bug mid-build: an early version showed the new showcase screen at the very start of the idle cycle, which accidentally hid part of the existing demo screen's imagery. Reordering so the demo plays first (which also matches how the original cabinet behaved) fixed it with no loss of coverage elsewhere. One known refinement was deliberately deferred rather than rolled into this story: the text currently renders in green, while the original cabinet shows white scores and red enemy names. That's a color-system change that affects other screens too, so it was logged and folded into the existing sibling color-fidelity story rather than scope-creeping this one.
