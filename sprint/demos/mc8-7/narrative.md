# mc8-7

## Problem

Problem: In Missile Command, the sound cue announcing a new "bonus city" played too early — as soon as the player's score crossed the point threshold mid-game, rather than when the city actually appeared on the field. Why it matters: In the original 1980 arcade cabinet, that sound was tied to the moment the bonus city physically joins the defense line between waves, not to the scoring moment that earns it. Players familiar with the authentic arcade experience would hear the cue fire roughly one wave too soon, breaking the faithful feel the clone is built to deliver.

## What Changed

Think of it like a scoreboard versus a trophy ceremony: earning enough points to win a bonus city is like hitting the score that qualifies you for a prize, but the actual "prize" — the extra city showing up ready to defend — doesn't happen until the awards ceremony between rounds. The game was playing the "you won a prize!" sound the instant the score ticked over, instead of waiting for the ceremony.

The fix moves the sound trigger from "score crossed the line" to "city actually appeared on the field between waves." The code now watches for the number of standing cities to go up between one wave and the next — the only time that can happen is when the game hands out bonus cities during its between-wave regrouping. It also added a safety check so that starting a brand-new game (which resets everything back to the first wave) doesn't accidentally trigger the same sound by mistake.

## Why This Approach

The team keyed the sound to the same underlying event the original arcade hardware uses: the city count rising at the wave-to-wave transition. This is a more reliable signal than watching the score, because score crossings can happen at unpredictable times mid-battle, while the city grant only ever happens at one specific, well-defined moment — between waves. A prior review also caught a subtle risk: without an extra check, restarting the game after a "Game Over" could be mistaken for a bonus-city event, since both involve city counts changing. A guard was added so only genuine wave-to-wave progress counts, keeping new games silent as expected.
