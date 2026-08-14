# Demo Script — jt11-18

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm showing a fix to one of Joust's signature hazards — the lava troll's burned bridge trap."

**Slide 2: Problem (0:15–1:00)**
Say: "When the wooden bridge burns away during a wave, players are supposed to see glowing lava and risk getting grabbed by a lava troll if they land there. Instead, two things were broken: landing on the burned section made you vanish off the bottom of the screen with no visual explanation, and the lava itself was invisible — just a black gap." If available, show a short before-clip or screenshot of the black gap where lava should be.

**Slide 3: What We Built (1:00–1:45)**
Say: "We reconnected the grab logic so touching the burned shore now correctly triggers the lava troll grab, and we painted in the missing lava so the hazard is visible before you ever touch it."

**Live demo (1:45–3:15):**
1. From the repo root, start the dev server:
   ```
   just serve
   ```
2. Open a browser to `http://127.0.0.1:5270/joust/`
3. Play until a wave where the bridge burns away (or use the game's built-in wave-skip/debug key if the team has one configured — check with Dev beforehand).
4. Walk/fly onto the burned shore section (roughly the far left or far right edge of the bridge, where it's burned away).
5. Point out on screen: "Notice the glowing orange-red lava pool is now visible under the burned section — that wasn't there before." Then: "Now watch what happens when I land on it." Land there and show the lava troll grab animation triggering instead of falling off-screen.

**Fallback:** If the live demo doesn't cooperate (dev server issue, timing issue getting to a burned-bridge wave), switch to the **Before/After slide** with side-by-side screenshots: left = black gap + player vanishing, right = visible lava + troll grab.

**Slide 4: Why This Approach (3:15–3:40)**
Say: "We didn't invent new behavior — we found where the original arcade game's design already specified this grab and this visual, and reconnected the modern version to match it faithfully, without disturbing anything else that was already working correctly."

**Before/After Slide (if not already shown as fallback) (3:40–3:50)**
Side-by-side screenshots as described above.

**Roadmap Slide (3:50–4:00)**
Say: "This closes out a known follow-on from an earlier bridge-destruction fix, and clears the way for a couple of related sequencing items on the board."

**Questions (4:00+)**
