# Demo Script — pt1-18

**Total run time: ~6 minutes**

**Slide 1: Title (0:00–0:20)**
Say: "Today I'm walking through a fix to our Defender clone that restores one of the core mechanics of the original 1980 arcade game — the scrolling visible window and the radar scanner."

**Slide 2: Problem (0:20–1:00)**
Say: "Before this fix, our Defender showed the entire game world — all 6.8 screens of it — squeezed onto one screen at once. Every enemy was visible immediately. Worse, because the shooting logic hadn't caught up with the display logic, players could sometimes shoot directly at an enemy they could see and have it not register as a hit."
Show: a static screenshot (captured ahead of time, or pulled from the PR) of the old behavior if available; otherwise describe it verbally and move to the live Before/After.

**Slide 3: What We Built (1:00–2:00)**
Say: "We restored the original game's 'visible window' — the game world is about 6.8 screens wide, and the player now only sees roughly one-seventh of it at a time, exactly matching the original arcade hardware's math. The radar scanner at the top now does real work, showing enemies that are off-screen but still in the world."

**Slide 4: Why This Approach (2:00–2:45)**
Say: "We didn't guess at the numbers — we pulled the exact visible-window formula out of the original 1980 arcade machine's source code, so this matches the authentic game rather than an approximation. We also made sure rendering, collisions, and shooting all use that same rule, which is what fixes the 'shots don't land' bug."

**Before/After — Live Demo (2:45–5:00)**

Terminal commands (run from repo root):
```
npm install
just serve
```
Then open a browser to:
```
http://127.0.0.1:5270/defender/
```

Live demo steps:
1. Launch the ship and let it fly forward under thrust for a few seconds. Narrate: "Watch the camera scroll — new terrain and enemies slide in from the right edge as we move. In the old version, everything was visible from the start; nothing new would appear."
2. Point at the radar scanner strip at the top of the screen. Narrate: "That's showing enemies that are NOT currently drawn in the main view — off-window, but still tracked. That's the mechanic this fix restores."
3. Maneuver the ship to line up a shot on an enemy that's clearly on screen, and fire. Narrate: "The shot lands exactly on what's visible — rendering, collision, and shooting are now all reading from the same window, so there's no more 'phantom miss.'"
4. If time allows, fly toward the edge of the visible window and show an enemy sliding out of view on the main screen while still tracked on the scanner.

**Fallback if the live demo fails (server won't start, browser issue, etc.):** Skip to the **Before/After slide** (static screenshots of the old "everything visible at once" screen versus the new "narrow scrolling window with scanner" screen, both included in the PR). Narrate the same points verbally using the numbers from the "What Changed" section: "In a live playtest, only 5 of 25 enemies were visible on screen at once, with the other 20 correctly tracked on the radar."

**Roadmap (5:00–5:30)**
Say: "This fix is part of an ongoing effort to bring our arcade clones closer to their original hardware behavior, story by story. It unblocks upcoming Defender work on HUD and scanner polish, since those stories can now assume the visible window behaves correctly."

**Questions (5:30–6:00)**
