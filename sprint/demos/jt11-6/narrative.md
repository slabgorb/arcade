# jt11-6

## Problem

Problem: In Joust, a player who earns a high score but walks away from the "enter your initials" screen — instead of typing three letters and pressing the action button — gets nothing saved. The score simply vanishes. Why it matters: Players expect that reaching a leaderboard-worthy score is enough to be remembered. Losing an earned high score because of an unclear or interrupted entry screen erodes trust in the game and undercuts one of the most motivating features of an arcade cabinet — seeing your name on the board.

## What Changed

Think of the high-score board like a hotel guest book at checkout. Investigation confirmed the guest book itself works perfectly — when someone actually signs it, their name reliably ends up in the register, and the front desk (the lobby leaderboard) reads the exact same register the game writes to. That part was never broken.

The real problem was at the pen: nothing gets written to the book unless the guest writes exactly three letters and then explicitly hands the pen back by pressing a specific button. If they set the pen down and walk off — even after writing all three letters — the entry is thrown away.

Two changes fix this:
1. **A visible instruction on the entry screen** — like a sign next to the guest book saying "use these keys to pick your letters, press this button to confirm" — so players understand what's expected instead of guessing.
2. **An auto-save timeout** — modeled on how the original 1982 arcade cabinet behaved — so if a player walks away after entering qualifying initials, the game automatically finishes signing the book on their behalf after a pause, instead of discarding their score.

## Why This Approach

Rather than guessing at a reasonable timeout value, the team went back to the original Joust game's source code (the actual program that ran on 1980s arcade hardware) to find out exactly how the real machine handled someone walking away from the initials screen, and matched that behavior. This keeps the fix "authentic" — it's not inventing new game behavior, it's restoring behavior that was already part of the original design but got lost in translation. It also means the fix is minimal and low-risk: it doesn't touch how scores are calculated or stored (which was already proven correct), it only closes the specific gap where a player's intent to be recorded wasn't being honored.
