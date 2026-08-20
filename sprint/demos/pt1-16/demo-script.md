# Demo Script — pt1-16

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today: a Joust fix that stops players from cheesing a wave clear by watching enemies drown."

**Slide 2: Problem (0:15–0:45)**
Say: "In Joust, a shore troll grabs riders near the lava and drags them under. For the player, you flap to escape. For enemies — the game's own AI-controlled birds — that escape reflex was completely missing. An enemy grabbed by the troll drowned 100% of the time, every wave, no exceptions. That meant a patient player could just wait near the lava and let the troll clear the whole enemy wave with zero risk."

**Slide 3: What We Built (0:45–2:00)**
Say: "We gave the enemy's AI pilot the same 'keep trying' instinct a human player has. When gripped by the troll, it now flaps if it's sinking, and if it climbs high enough it breaks free entirely — matching the original 1982 arcade logic exactly."

Live demo (if environment available):
```
just serve
```
Then in the browser, navigate to `http://127.0.0.1:5270/joust/`, play or use the attract-mode demo to reach wave 4+ (where the shore troll appears), and let the troll grab an enemy rider near the lava. Point out the enemy bird's wing-flap animation firing as it struggles, and that it either climbs free or — if the troll holds it long enough — still drowns, just like a real risk-based outcome.

**Fallback if the live demo doesn't cooperate:** Show Slide "Before/After" instead — a two-panel comparison: "Before: gripped enemy → 100% drown, no animation of struggle" vs. "After: gripped enemy flaps and can escape, same as the arcade original."

**Slide 4: Why This Approach (2:00–2:45)**
Say: "This wasn't a guess — we read the original arcade game's source code line by line to confirm exactly how a grabbed bird was supposed to behave, then matched it precisely, including the two ways to escape and the point at which escape becomes impossible. We also had a second engineer independently re-check the fix against that same source before it shipped."

**Before/After (2:45–3:15)**
Show: "Before — every enemy caught by the troll: drowned (0% survival). After — an enemy caught early can flap free or climb clear; only enemies the troll holds too long still go under, matching the arcade's original difficulty curve."

**Roadmap (3:15–3:45)**
Say: "This closes one specific loophole. A related, separate gap — enemies not avoiding open lava while flying normally — was found during this work but deliberately kept out of scope, and is now queued as a follow-up story."

**Questions (3:45–4:00)**
