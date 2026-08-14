# df1-5

## Problem

Problem: Defender, a newly-added arcade game, had never been confirmed to actually display on screen — only that its web address returned a generic "OK" response — and the project's documentation still credited a different, later game (Joust, 1982) as Williams' first arcade title, when that honor actually belongs to Defender (1980).

Why it matters: A server saying "OK" (HTTP 200) doesn't mean a game is visible — a blank or broken screen can return the exact same "OK." Without a human actually looking at the pixels, a completely broken game could ship undetected. Separately, publishing an incorrect historical fact in project documentation undermines the reference material every future contributor and stakeholder relies on.

## What Changed

Think of it like this: your website can say "the store is open" (200 OK) even if the shelves are actually empty. This story made two fixes:

1. **Proved the game actually shows something, not just that the server responded.** A person opened Defender's page in a real browser, took a screenshot, and confirmed a properly painted black game screen was there — pixel by pixel — rather than trusting an automated check that can't tell the difference between "working" and "blank."
2. **Corrected a documentation mistake.** The project's game roster wrongly called Joust (1982) "the first Williams title." Defender came out two years earlier, in 1980, so it's actually the first. The roster line was corrected to give Defender that credit and list it properly among the other games.

## Why This Approach

Automated tests are great at catching "the server crashed" but blind to "the server responded fine and showed a black nothing." So this story didn't try to write more automated tests for the visual check — it had a human do a one-time, deliberate look at real rendered pixels (checking the canvas was actually painted black, not just present-but-empty), which is the only way to truly confirm "yes, this looks right."

For the documentation fix, a small automated guard was added that permanently locks in the correct fact — it will fail loudly in the future if anyone accidentally reverts the roster back to crediting the wrong game. That guard was deliberately scoped narrowly (just this one fact) rather than trying to fix every related documentation number in the same pass, because bundling unrelated cleanup into a factual correction risks introducing new mistakes under time pressure. A related, known documentation-count issue was instead written up as its own follow-up item for later.
