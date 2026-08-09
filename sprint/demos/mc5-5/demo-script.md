# Demo Script — mc5-5

**Total run time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today's update fixes a bug where two of Missile Command's signature threats — the satellite and the cruise missile — could never appear on screen."

**Slide 2: Problem (0:15–0:50)**
Say: "The regular missile swarm was greedy — it filled every open slot the instant one appeared. That meant the satellite and cruise missile, which need their own slot to launch, never got a turn." Show a static before-shot: a wave screen packed with 7-8 regular missile trails, no satellite visible, timestamped from a wave where the satellite should have appeared (wave 8+).

**Slide 3: What We Built (0:50–1:30)**
Say: "We ported the original arcade machine's own traffic-control rule, called ICNORM in the 1980 source. It caps the swarm at 4 new launches per cycle and automatically reserves room for the satellite and cruise missiles."

**Live demo (1:30–2:45):**
1. Start the dev server: `just serve`
2. Open `http://127.0.0.1:5270/missile-command/` in the browser.
3. Play or fast-forward to wave 8 or later (use the in-game level-select/debug skip if available; otherwise let the demo auto-play if the build has a self-play mode).
4. Point out on screen: the missile swarm visibly thins out (fewer than 8 simultaneous trails) at the exact moment the satellite's escort plane crosses the top of the screen, and the satellite itself fires 1-3 shots downward — narrate "watch the swarm count drop right as the satellite starts firing."

**Fallback if live demo fails:** Show Slide "Before/After" with two side-by-side screenshots — Before: wave 8, 8 regular missile trails, no satellite fire. After: wave 8, 5 regular missile trails + 2 satellite shots visible simultaneously.

**Slide 4: Why This Approach (2:45–3:15)**
Say: "We used the original machine's exact math rather than a patched-on workaround, because that's the version that was actually balanced and shipped — and it guarantees the fix works in every wave, not just the ones we tested."

**Slide 5 (Before/After, 3:15–3:35):**
Show the same two screenshots from the fallback above, side by side, captioned "Before: swarm saturates all 8 slots" / "After: swarm caps at 4/cycle, satellite gets its slot."

**Slide 6 (Roadmap, 3:35–3:50):**
Say: "Next up: the cruise missile's own firing priority and a related off-by-one fix in how many missiles can appear on screen at once."

**Slide 7 (Questions, 3:50–4:00):**
Open floor.
