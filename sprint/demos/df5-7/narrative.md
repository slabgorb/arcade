# df5-7

## Problem

Problem: The individual building blocks of the Defender game clone — the radar-style "scanner" that shows enemies approaching from off-screen, the score and lives display, the escalating difficulty between waves, the smart-bomb special move, and the hall-of-fame high-score list — had each been built and tested one at a time, but nobody had confirmed they actually worked *together*, live, on screen, the way a real player would see them.

Why it matters: A collection of parts that each pass their own test can still fail when combined — and for this particular game, there's an extra stake: one of the special effects (the smart bomb) has to be built in a way that's safe for players with photosensitive epilepsy. Verifying the whole game loop on screen, and confirming that safety guardrail held, is the last checkpoint before this can be called a real, playable game rather than a set of disconnected pieces.

## What Changed

Nothing about the game's underlying logic changed in this story — this was a verification pass, not new functionality. The team took a real screenshot of the game running in a browser and walked through it like a player would, confirming five things were all visible and correct at once:

1. **The scanner** (the strip at the top of the screen that shows a wide view of the battlefield) correctly lit up with markers for enemies that are off-camera, in the right positions and colors.
2. **Difficulty escalation** — later waves visibly throw more or tougher enemies at the player than earlier ones.
3. **The scoreboard and "lives remaining" display** were both present and readable during play.
4. **The smart bomb** — a special move that clears the screen of enemies — was captured firing using the safe version of its effect: a brief freeze-and-fade, never a full-screen flash. This matters because a hard strobe effect can trigger seizures in photosensitive players, so the team designed this in from the start rather than bolting on a warning label later.
5. **The hall-of-fame list** (the high-score board) correctly displayed an entry.

They also double-checked that the game screen was genuinely different from a "broken page" control screen — not just returning a generic "it loaded" response — so the verification actually proves the game renders, not just that the server responds.

## Why This Approach

Two lessons from earlier work shaped how this check was done:

- **"Loads" isn't the same as "works."** A web page can technically load successfully while showing nothing useful — like a phone that rings but has no one on the other end. So instead of just confirming the game's web address responds, the team compared it against a nonsense address to prove the game page is meaningfully different — actual content, not a placeholder.
- **Safety outranks authenticity.** The original 1980s arcade cabinet this game is modeled after may have used a harsher flash effect for its smart bomb. This team made a deliberate, documented decision (recorded as ADR-0005) to use a softer freeze-and-fade version instead, specifically to protect players with photosensitive epilepsy — even though it diverges slightly from the original machine. That trade-off was checked and confirmed to hold in this pass.

Any visual mismatches found against the original design were logged individually, tied to the specific part of the screen they affect, rather than being bundled together — so each one can be fixed and verified independently instead of getting lost in a vague "some things look off" note.
