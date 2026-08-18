# jt13-3

## Problem

**Problem:** The arcade's Joust attract screen — the animated demo that plays when no one is at the machine — showed a broken promotional message. Instead of the full line "EXTRA MOUNT EVERY 20,000 POINTS," which tells players when they'll earn a bonus life, the screen displayed only the dangling fragment "EXTRA MOUNT EVERY" with nothing after it. **Why it matters:** This line exists to hook players standing at the cabinet — it's a small but real incentive that tells them a reward is coming if they keep playing. A message that trails off mid-sentence looks unfinished and undermines the authenticity of the recreation, which is measured against how the original 1982 arcade cabinet actually behaved.

## What Changed

Think of the attract screen text as three puzzle pieces that need to sit next to each other: "EXTRA MOUNT EVERY," a number, and ",000 POINTS." The game already had the first and third pieces built and stored correctly — it just never actually placed the middle piece (the number) onto the screen, and even the third piece wasn't being drawn. It's like ordering a sign that says "SALE ENDS ___ DAYS" and the sign shop only mounted the first three words.

The fix does two things: first, it calculates the correct number to show (20, representing 20,000 points) directly from the game's existing bonus-life setting — so it's never a made-up or hardcoded value, it's read live from the same setting that actually controls when players get their bonus life. Second, it makes sure all three pieces — the label, the number, and the suffix — are drawn together, centered as one clean line, so players see the complete, correct message.

## Why This Approach

The team had two options on the table: either fix the message to display correctly, or remove it entirely since it wasn't working. The original arcade machine's source code was checked, and it confirmed the message is supposed to always be there and always show a real number — it's a standard, expected part of the attract screen, not an optional flourish. Given that this is a faithful recreation of a classic arcade cabinet, the rule the team follows is straightforward: when in doubt, match what the original machine actually did. Removing the line would have been the easier fix, but it would have made the recreation less authentic. Fixing it properly — and making sure the number always comes from the real game setting rather than being typed in as a fixed value — means the message will automatically stay correct even if that setting is ever changed down the line.
