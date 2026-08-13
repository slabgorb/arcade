# jt11-10

## Problem

Problem: A cleanup pass on the Joust arcade game surfaced eight small but real accuracy problems left behind by earlier work — three of them in code comments and test descriptions that still called a display panel by its old, retired name, and two in the automated tests that check whether the on-screen game loop is drawing correctly. The remaining findings were a stray leftover file, two source citations pointing at the wrong line of the original 1982 game code, and a debug helper reading a slightly wrong variable name.

Why it matters: The test that checks the game's HUD (score, lives, wave counter) had a hidden weak spot — it was built in a way that only worked correctly by coincidence. As soon as a developer added one more line of code to the game's main loop, that test would have silently stopped actually checking anything, while still reporting "all green." A test that can't tell the difference between "working" and "broken" is worse than no test at all, because it gives false confidence. Fixing this now, while the blast radius is small, is far cheaper than discovering it later after more code has been layered on top.

## What Changed

Think of the automated tests as a security guard checking IDs at a door. One of the guards had been told "check everyone who walks through this hallway" — but the hallway had no far wall marked, so the guard was effectively checking the entire building, including rooms that have nothing to do with the door they're supposed to watch. That "guard" is now told exactly where the room ends, using a precise floor plan (a proper code parser, not a rough guess), so it only ever checks what it's actually supposed to check.

Separately, three places in the test files were still calling a display element by its old nickname ("dev bar" / "dev overlay") years after the team renamed it to "HUD" (heads-up display) in an earlier project. That's like a training manual still referring to a department by a name it hasn't used in a year — confusing to anyone reading it fresh, even though the actual behavior being tested never changed.

The remaining five items were small hygiene fixes: renaming an internal-only test label so it can't accidentally collide with a real game file name, correcting a documentation checklist's numbering, fixing two source-code comments that pointed to the wrong historical reference line, deleting an orphaned screenshot file sitting in the wrong folder, and renaming an internal variable so its name matches what it actually holds everywhere it's used.

## Why This Approach

The team weighed writing a new automated check for every single item against fixing some by hand. Writing a "guard" test only makes sense when it's cheap, reliable, and can be proven to catch the problem before the fix — like a smoke detector you can test by holding a match near it. Two of the eight items met that bar clearly: the naming sweep and the test-boundary hardening. For those, new guards were written first (and confirmed they actually failed before the fix, so we know they're not blind), then made to pass.

The other five items didn't meet that bar — either the fix was so mechanical and self-evident (a rename that the type-checker itself confirms is complete) that a bespoke test would be redundant scaffolding, or the "guard" would require a reference archive of 1980s assembly code that isn't reliably available in every developer's checkout, so a test built around it could never run consistently. In those cases the team verified the fix by hand — diffing the before/after, confirming exact line/byte matches — rather than manufacturing a fragile automated check that looks rigorous but isn't.
