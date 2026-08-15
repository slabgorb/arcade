# jt11-17

## Problem

**Problem:** On the Joust attract screen, the game displays "PRESS 1 OR 2 TO START" — but pressing 1 or 2 didn't start a game. Instead, it dropped the player into a second screen that asked the exact same question again. **Why it matters:** This is the classic "the button doesn't do what it says" bug. A player who presses "1" expecting a one-player game to begin instead sees another prompt, has to press the button a second time, and may reasonably assume the game is broken or unresponsive — exactly the kind of friction that makes a new player walk away from an arcade cabinet in the first five seconds.

## What Changed

Think of it like a vending machine where you press "B4" for chips, and instead of dropping your chips, the machine lights up and asks "Which item would you like? Press B4." You'd press B4 again, get your chips, but wonder why you had to ask twice.

That's what was happening here. When a player pressed 1 or 2 on the attract screen, the game correctly *understood* which button was pressed — it just threw that information away and sent the player to a second "how many players?" screen instead of using the answer it already had.

The fix carries the player's original choice all the way through: press 1 → one-player game starts immediately; press 2 → two-player game starts immediately. No redundant re-ask. The engineering team reused a proven pattern that already existed elsewhere in the game (the same "count → start game" logic used at the second screen), so no new game logic had to be invented — it was a matter of wiring the existing pieces together correctly at the first point of contact.

## Why This Approach

The team deliberately chose the smallest, safest fix rather than a bigger rework. Rather than inventing new logic to handle "start game with this many players," they pointed the attract screen's button-press directly at logic that was already tested and working (it already ran the second, redundant screen). This is like re-routing a hallway to connect directly to a room, instead of building an entirely new room — lower risk, faster to verify, and nothing new to break.

They also preserved a related, intentional pathway: if a player starts from the *title* screen (a different entry point than attract), it still goes through the secondary player-count screen. That's a deliberate design decision left in place for a future story to revisit, not an oversight — the two "start" entry points remain in a purposeful, verified state after this fix.

Before shipping, the team caught and fixed a subtle issue: a couple of internal notes-to-self (code comments, invisible to players) still described the old, since-removed behavior. Those were corrected so future engineers working on this screen aren't misled by outdated notes — a small but important housekeeping step that came out of the review process.
