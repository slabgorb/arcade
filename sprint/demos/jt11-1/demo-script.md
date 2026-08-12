# Demo Script — jt11-1

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm walking through a fix to the Joust cabinet's start experience — what happens in the first few seconds before a game begins."

**Slide 2: Problem (0:15–0:45)**
Say: "Two issues: first, a one-player game was secretly being set up as a two-player game under the hood, leaving a broken 'ghost' knight on the field. Second, the attract screen never told players which key starts a game." No live demo yet — just narrate the problem.

**Slide 3: What We Built (0:45–2:30)** — this is the live demo portion.

Terminal command to start the dev server:
```
just serve
```
Wait for it to report the server is listening on `http://127.0.0.1:5270/`.

Open a browser to:
```
http://127.0.0.1:5270/joust/
```

- **Scene A (0:45–1:15):** Point out the attract screen looping in the browser. Call out the new **"PRESS 1 OR 2 TO START"** text rendered near the bottom of the screen (around the same area the score readout sits). Say: "This wasn't there before — it's new, and it's the answer to 'how do I start playing?'"
- **Scene B (1:15–2:00):** Press **1** then **1** again (coin-up, then select one-player). Show the resulting game screen: only **one knight** on the field, and the HUD showing **P1 only** with **"MEN 5"** (five lives) — no second player's ghost knight, no second score readout.
- **Scene C (2:00–2:30):** Reset (refresh or return to attract), press **2** then **2** to start a two-player game. Show **both knights** spawn and **both HUD panels** (P1 and P2) appear, confirming two-player mode is unchanged.

**Fallback:** If the local dev server or live browser demo isn't available, switch to **Slide "Before/After"** and show the two static screenshots described in the Slide Outline below (one-knight HUD vs. two-knight HUD) instead of the live walkthrough.

**Slide 4: Why This Approach (2:30–3:15)**
Say: "We didn't rewrite the lives, death, or respawn logic — it was already correct and self-adjusting. We fixed the one place where the player count wasn't being passed along. Small, contained fix, low risk."

**Roadmap slide (3:15–3:45)**
Say: "This is the first of seven fixes coming out of a root-cause review of player-reported cabinet issues — HUD clarity, landing feel, transporter timing, lava shore effects, and high-score entry are next."

**Questions (3:45–4:00)**
