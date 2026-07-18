# Narrative

## Problem Statement
**Problem:** Battlezone's initials-entry screen — the "type your name in, high scorer" moment every arcade player remembers — was showing the wrong congratulation message, and a separate reference document had a factual error in it about a hardware settings table. **Why it matters:** The initials-entry screen is one of the most visible, most-replayed moments in the game (it's the payoff screen after a great run), and it was displaying text lifted from the wrong screen entirely. Separately, our internal "source of truth" documentation — which every future Battlezone fidelity check leans on — had two settings values swapped, which could mislead anyone using that doc later, including future AI agents doing fidelity audits.

## What Changed
Think of it like this: imagine a store had two different "congratulations" signs — one that says "GREAT SCORE" meant for the winner's podium, and one that says "HIGH SCORE" meant for the leaderboard wall — and someone accidentally hung the leaderboard sign on the podium. This story just swaps the sign back to the correct one. The code already had the correct "GREAT SCORE" text sitting ready and unused; we simply wired it up to the right screen.

Second, the team keeps a detailed reference notebook comparing our game to the original 1980 arcade machine's source code. One page of that notebook had a small table of language-selector codes written backwards (it said setting "01" was French and "10" was German, when it's actually the reverse). We traced this back to the original 1980 disassembly notes themselves containing the same error — so rather than silently rewriting a quote of the original historical document (which would hide that the old records were wrong), we left the original quote untouched and added a clearly-labeled correction note right next to it, so anyone reading it later sees both the historical record and the accurate answer.

## Why This Approach
Two guiding principles here, both simple:

1. **Use what already exists.** The correct "GREAT SCORE" text was already sitting in the codebase, unused — a constant defined but never called. Rather than writing new text (which risks typos or a mismatch with the original 1980 game), we just pointed the screen at the text that was already verified correct. Zero new content invented.
2. **Never quietly edit a quote.** When we found the language-code documentation was backwards, we could have just fixed the numbers in place. But that block of text was explicitly a word-for-word quote from the original 1980 disassembly notes — and it turns out *those original notes* also had the error. Editing it in place would erase the evidence that this mistake goes all the way back to 1980. Instead, we kept the quote exactly as historically written and added a clearly-labeled correction directly beneath it. This is the same "show your work, don't paper over history" pattern already used elsewhere in this documentation.

Both changes are pure text/data swaps — no logic, no new risk surface. The full automated test suite (1,025 tests) ran clean, and a new test was added specifically to guarantee the wrong "HIGH SCORE" text can never silently creep back onto that screen.
