# Narrative

## Problem Statement
**Problem:** Centipede's Spider enemy — one of the game's three signature threats — was behaving like an approximation of the original 1981 arcade machine rather than a faithful copy of it. Its movement pattern, the way it eats through the mushroom field, how it kills the player on contact, and how many points a player earns for shooting it were not verified against the actual arcade source code (the `BUGOFF`/`BUGMV` routines and the official `CENTIP.DOC` scoring rules).

**Why it matters:** This project's entire value proposition is "byte-exact" arcade recreation — players and reviewers expect the Spider to look, move, and score exactly like the coin-op original, not a close guess. An off-pattern Spider changes how skilled players read danger and plan shots, an incorrect scoring formula changes competitive leaderboard results, and a death sequence that doesn't reuse the game's existing "how the player dies" machinery risks the player-death animation glitching or behaving inconsistently between enemies. Left unfixed, this undermines trust in every future release that claims fidelity to the original hardware.

## What Changed
Think of the original 1981 arcade cabinet's programming as a recipe book that nobody had fully copied out yet for the Spider enemy specifically. This story is the work of pulling out that recipe book, reading the exact steps the original machine follows, and rewriting our Spider to follow those same steps — instead of steps we'd guessed at.

Concretely, four things were rebuilt to match the original recipe:

1. **How the Spider enters and moves.** The original game has two routines, nicknamed `BUGOFF` and `BUGMV`, that control exactly when the Spider appears, the wandering path it takes across the bottom of the screen, when it retreats, and how its speed changes. We transcribed those routines directly, with notes explaining our translation choices, and locked the resulting motion down with repeatable tests so it can never silently drift again.
2. **What happens to mushrooms the Spider touches.** In the original game, a Spider crossing a mushroom doesn't just remove it outright — there's a specific set of "how damaged is this mushroom" rules. We matched that behavior cell-by-cell and pinned it with tests.
3. **What happens when the Spider touches the player.** Rather than inventing a new "you died" sequence just for the Spider, we plugged it into the exact same death chain (the player animation → explosion → respawn machinery) that was already built and tested for the Centipede segments in an earlier story. One reliable death sequence, reused everywhere, instead of two slightly different ones that could drift apart over time.
4. **How many points a kill is worth.** The original game pays out more points for a closer, riskier Spider kill and fewer for a distant, safer one. We diffed the official scoring documentation against our code line by line, matched the reward bands, and made sure the on-screen score popup matches what the arcade showed.

## Why This Approach
We chose "go read the original machine's instructions and copy them exactly" over "make something that feels about right," for a simple reason: with an arcade recreation, "feels about right" is invisible until a longtime player or a fidelity reviewer notices the Spider moves a little differently than they remember — and by then it's a trust problem, not just a code problem.

We also chose to **reuse** the existing player-death sequence rather than build a second one specifically for the Spider. Two independent implementations of "the player just died" would inevitably diverge over time as each got tweaked in isolation — one enemy's death might get a bug fix the other never receives. One shared, well-tested death path means a fix or improvement there benefits every enemy in the game automatically, now and in future stories.

Finally, every behavior we transcribed was locked in with automated tests and citations back to the original source material. That means this fidelity isn't just true today — it's protected. If someone changes the Spider's code next month, the tests will catch it immediately if the behavior drifts from the original arcade machine again.

## Before/After
| Aspect | Before | After |
|---|---|---|
| Movement | Approximate/undocumented Spider path and speed | Transcribed directly from the original `BUGOFF`/`BUGMV` routines, pinned by deterministic seeded tests |
| Mushroom interaction | Unverified clearing behavior | Matches the original's exact damage-state rules, pinned by test |
| Player death on contact | Risked a separate, unproven death path | Reuses the same explosion/respawn chain already proven for segment kills |
| Kill scoring | Unconfirmed against official scoring rules | Matches the original's distance-based bands (300 far / 600 mid / 900 close), diffed against official documentation, with divergences recorded |
