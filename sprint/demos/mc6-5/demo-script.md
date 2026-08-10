# Demo Script — mc6-5

**Total time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Say: "Today I'm walking through the new attract screen for our Missile Command clone — the idle screen that greets players before a game starts."

**Slide 2: Problem (0:15–0:45)**
Say: "Before this work, our idle screen was blank — no title, no invitation to play, no leaderboard. The 1980 original used that idle time to hook players walking by an arcade cabinet. We were missing that entirely."
Show: a quick before screenshot if available (blank/minimal idle screen), otherwise describe verbally.

**Slide 3: What We Built (0:45–2:15)**
Say: "We rebuilt three things: the title screen, a scrolling 'Press Start' banner, and a reserved area for the high-score leaderboard. We also added a proper 'The End' screen when a game finishes."

Live demo steps:
1. In terminal, run: `just serve`
2. Open a browser to: `http://127.0.0.1:5270/missile-command/`
3. Let the game sit idle — narrate: "Here's the MISSILE / COMMAND title at the top, and watch the bottom of the screen — 'PRESS START' scrolls smoothly across, just like the original cabinet."
4. Point out the empty framed box mid-screen: "This is the HIGH SCORES display area — the frame is built, and a companion project is wiring in the actual score numbers into this exact spot."
5. Start a game (press the Start key), play briefly, then let the player lose (or trigger a game over).
6. Narrate: "And there it is — 'THE END' displays during the explosion, giving players a clean close to the round, exactly as the original did."

**Fallback:** If the live demo doesn't come up (server issue, port conflict), skip straight to Slide 3's static screenshots of the idle screen with the title/scrolling banner and the game-over "THE END" screen, and narrate the same points from the images.

**Slide 4: Why This Approach (2:15–3:00)**
Say: "Every word on this screen — the title, the scrolling message, even the exact speed it scrolls at — was pulled directly from the original 1980 arcade machine's source code, not reinvented. That's how we guarantee it feels authentic rather than 'inspired by.' The one change: since our version is free-to-play, we dropped the old 'insert coins' messaging, since there's no coin slot here."

**Roadmap (3:00–3:30)**
Say: "This building block — the display frame — sets up the next piece of work, which drops the actual live leaderboard numbers into the space we just showed you. That's already underway and should land soon."

**Questions (3:30–4:00)**
